'use strict';

// functions/instagram-programador.js
// ─────────────────────────────────────────────────────────────────────────────
//  CREATIVOS PROGRAMADOS — dejar la semana cargada y olvidarse.
//
//  Publicar a mano exige estar disponible a la hora buena. Esto separa las dos
//  cosas: el creativo se prepara cuando hay tiempo y sale cuando conviene.
//
//    · instagramProgramar        onCall  → deja un post en la cola
//    · instagramProgramadas      onCall  → lista lo pendiente y lo ya publicado
//    · instagramCancelarProgramada onCall → saca uno de la cola
//    · instagramProgramadasCron  cada 5 min → publica lo que venció
//
//  LA REGLA QUE MANDA: publicar en Instagram es IRREVERSIBLE y público. Un post
//  duplicado no se puede "deshacer" sin que la gente lo haya visto. Por eso
//  cada item se RECLAMA en una transacción antes de tocar la API: si dos
//  ejecuciones del cron se solapan (cosa que pasa cuando una tarda más que el
//  intervalo), la segunda encuentra el item ya reclamado y lo suelta.
//
//  Estados: pendiente → publicando → publicado | error | cancelado
// ─────────────────────────────────────────────────────────────────────────────

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onSchedule }         = require('firebase-functions/v2/scheduler');
const { defineSecret }       = require('firebase-functions/params');
const { logger }             = require('firebase-functions');
const admin                  = require('firebase-admin');
const { FieldValue, Timestamp } = require('firebase-admin/firestore');

const ig                = require('./lib/instagram-api');
const { esOperadorReq } = require('./lib/operadores');

const db = admin.firestore();

const EVOLUTION_API_URL = defineSecret('EVOLUTION_API_URL');
const EVOLUTION_API_KEY = defineSecret('EVOLUTION_API_KEY');

const COL = 'ig_programadas';
const TIPOS = ['IMAGE', 'CAROUSEL', 'REELS', 'STORIES'];
const MAX_INTENTOS = 3;
const WHATSAPP_IGNACIO = '56983568212';

/* ─────────────────────────────── Helpers ─────────────────────────────── */

async function conexion() {
  const s = await db.doc('_system/instagram_synaptech').get();
  const c = s.exists ? s.data() : null;
  if (!c || !c.accessToken) return null;
  return { token: c.accessToken, igUserId: String(c.instagramUserId), username: c.instagramUsername };
}

async function avisar(texto) {
  try {
    const { crearCliente } = require('./evolution/client');
    const evo = crearCliente({ baseUrl: EVOLUTION_API_URL.value(), apiKey: EVOLUTION_API_KEY.value() });
    await evo.enviarTexto('instance_plat_ventas', WHATSAPP_IGNACIO, texto);
  } catch (e) { logger.warn('[ig-prog] aviso falló:', e.message); }
}

function validarUrls(urls) {
  // Instagram descarga la media desde SUS servidores: un archivo local o un
  // enlace con sesión devuelve 403 y el contenedor muere sin explicación útil.
  if (!urls.length) throw new HttpsError('invalid-argument', 'Falta la URL de la media.');
  if (urls.some((u) => !/^https:\/\//i.test(u))) {
    throw new HttpsError('invalid-argument', 'Las URLs deben ser https públicas y accesibles por Meta.');
  }
  if (urls.length > 10) throw new HttpsError('invalid-argument', 'Un carrusel admite máximo 10 imágenes.');
}

/* ─────────────────────────────── Callables ─────────────────────────────── */

exports.instagramProgramar = onCall({ region: 'us-central1', cors: true }, async (req) => {
  if (!req.auth || !esOperadorReq(req)) {
    throw new HttpsError('permission-denied', 'Solo el operador de la plataforma.');
  }
  const d = req.data || {};
  const tipo = String(d.tipo || 'IMAGE').toUpperCase();
  if (!TIPOS.includes(tipo)) throw new HttpsError('invalid-argument', `tipo debe ser ${TIPOS.join(', ')}.`);

  const urls = (Array.isArray(d.urls) ? d.urls : [d.url]).filter(Boolean).map(String);
  validarUrls(urls);
  if (tipo !== 'CAROUSEL' && urls.length > 1) {
    throw new HttpsError('invalid-argument', 'Solo el carrusel admite varias imágenes.');
  }

  const cuando = new Date(String(d.publicarEn || ''));
  if (isNaN(cuando.getTime())) throw new HttpsError('invalid-argument', 'Fecha y hora inválidas.');
  // Un margen mínimo evita programar "para hace un rato" por error de zona
  // horaria y que salga disparado al instante sin que nadie lo revise.
  if (cuando.getTime() < Date.now() + 60_000) {
    throw new HttpsError('invalid-argument', 'La hora tiene que ser al menos 1 minuto en el futuro.');
  }
  if (cuando.getTime() > Date.now() + 180 * 86400e3) {
    throw new HttpsError('invalid-argument', 'No se puede programar a más de 6 meses.');
  }

  const doc = await db.collection(COL).add({
    tipo, urls,
    caption: String(d.caption || '').slice(0, 2200),
    publicarEn: Timestamp.fromDate(cuando),
    estado: 'pendiente',
    intentos: 0,
    creadoPor: String(req.auth.token?.email || ''),
    creadoEn: FieldValue.serverTimestamp(),
  });

  logger.info(`[ig-prog] programado ${tipo} para ${cuando.toISOString()} por ${req.auth.token?.email}`);
  return { ok: true, id: doc.id, publicarEn: cuando.toISOString() };
});

exports.instagramProgramadas = onCall({ region: 'us-central1', cors: true }, async (req) => {
  if (!req.auth || !esOperadorReq(req)) {
    throw new HttpsError('permission-denied', 'Solo el operador de la plataforma.');
  }
  const snap = await db.collection(COL).orderBy('publicarEn', 'desc').limit(40).get();
  const items = snap.docs.map((x) => {
    const v = x.data();
    return {
      id: x.id, tipo: v.tipo, urls: v.urls || [], caption: v.caption || '',
      estado: v.estado, intentos: v.intentos || 0, error: v.ultimoError || null,
      mediaId: v.mediaId || null,
      publicarEn: v.publicarEn?.toMillis?.() || null,
      publicadoEn: v.publicadoEn?.toMillis?.() || null,
    };
  });
  return { ok: true, items };
});

exports.instagramCancelarProgramada = onCall({ region: 'us-central1', cors: true }, async (req) => {
  if (!req.auth || !esOperadorReq(req)) {
    throw new HttpsError('permission-denied', 'Solo el operador de la plataforma.');
  }
  const id = String(req.data?.id || '');
  if (!id) throw new HttpsError('invalid-argument', 'Falta el id.');

  // Transacción: si el cron ya lo reclamó, cancelar sería mentirle al operador
  // (el post ya va camino a publicarse y no hay vuelta atrás).
  const ref = db.collection(COL).doc(id);
  const r = await db.runTransaction(async (tx) => {
    const s = await tx.get(ref);
    if (!s.exists) return { ok: false, motivo: 'No existe.' };
    const e = s.data().estado;
    if (e !== 'pendiente') return { ok: false, motivo: `Ya está en estado "${e}", no se puede cancelar.` };
    tx.update(ref, { estado: 'cancelado', canceladoEn: FieldValue.serverTimestamp() });
    return { ok: true };
  });
  if (!r.ok) throw new HttpsError('failed-precondition', r.motivo);
  return { ok: true };
});

/* ─────────────────────────────── El cron ─────────────────────────────── */

/**
 * Reclama un item de forma atómica. Devuelve true solo si ESTA ejecución se lo
 * quedó — la clave para que un post no salga dos veces cuando dos corridas del
 * cron se pisan.
 */
async function reclamar(ref) {
  return db.runTransaction(async (tx) => {
    const s = await tx.get(ref);
    if (!s.exists) return false;
    const v = s.data();
    if (v.estado !== 'pendiente') return false;
    tx.update(ref, { estado: 'publicando', reclamadoEn: FieldValue.serverTimestamp() });
    return true;
  });
}

async function publicarPendientes() {
  const con = await conexion();
  if (!con) { logger.info('[ig-prog] Instagram no conectado; no hay nada que publicar'); return; }

  const vencidos = await db.collection(COL)
    .where('estado', '==', 'pendiente')
    .where('publicarEn', '<=', Timestamp.now())
    .orderBy('publicarEn')
    .limit(10)
    .get();

  if (vencidos.empty) return;
  logger.info(`[ig-prog] ${vencidos.size} publicación(es) vencida(s)`);

  for (const doc of vencidos.docs) {
    const v = doc.data();
    if (!(await reclamar(doc.ref))) {
      logger.info(`[ig-prog] ${doc.id} ya lo tomó otra ejecución`);
      continue;
    }

    try {
      const out = await ig.publicar(con.token, con.igUserId, {
        tipo: v.tipo, urls: v.urls, caption: v.caption,
      });
      await doc.ref.update({
        estado: 'publicado', mediaId: out.id,
        publicadoEn: FieldValue.serverTimestamp(), ultimoError: FieldValue.delete(),
      });
      logger.info(`[ig-prog] ✓ ${doc.id} publicado como ${out.id}`);
      await avisar(`📸 *Instagram · publicado*\n\n${v.tipo} salió al aire en @${con.username}.\n${(v.caption || '').slice(0, 120)}`);
    } catch (e) {
      const intentos = (v.intentos || 0) + 1;
      const rendirse = intentos >= MAX_INTENTOS;
      // Al fallar vuelve a `pendiente` para reintentar en la próxima corrida,
      // salvo que ya se agotaron los intentos: reintentar para siempre un post
      // con una URL rota solo llena los logs.
      await doc.ref.update({
        estado: rendirse ? 'error' : 'pendiente',
        intentos, ultimoError: String(e.message).slice(0, 400),
      });
      logger.error(`[ig-prog] ✗ ${doc.id} intento ${intentos}/${MAX_INTENTOS}: ${e.message}`);
      if (rendirse) {
        await avisar(`⚠️ *Instagram · no se pudo publicar*\n\n${v.tipo} programado falló ${MAX_INTENTOS} veces y quedó detenido.\n\nMotivo: ${e.message}\n\nRevísalo en ops → Instagram.`);
      }
    }
  }
}

exports.instagramProgramadasCron = onSchedule({
  schedule: 'every 5 minutes',
  timeZone: 'America/Santiago',
  region: 'us-central1',
  secrets: [EVOLUTION_API_URL, EVOLUTION_API_KEY],
  timeoutSeconds: 540,   // publicar un reel puede tardar: el video se procesa
}, async () => {
  try { await publicarPendientes(); }
  catch (e) { logger.error('[ig-prog] cron:', e.message); }
});

/** Resumen para el panel: qué viene y qué falló. */
async function resumenProgramadas() {
  try {
    const [pend, err] = await Promise.all([
      db.collection(COL).where('estado', '==', 'pendiente').orderBy('publicarEn').limit(5).get(),
      db.collection(COL).where('estado', '==', 'error').limit(5).get(),
    ]);
    return {
      pendientes: pend.docs.map((d) => ({
        id: d.id, tipo: d.data().tipo,
        caption: String(d.data().caption || '').slice(0, 60),
        publicarEn: d.data().publicarEn?.toMillis?.() || null,
      })),
      conError: err.docs.map((d) => ({
        id: d.id, tipo: d.data().tipo, error: d.data().ultimoError || '',
      })),
    };
  } catch (e) {
    // Falta el índice compuesto la primera vez: no es motivo para tumbar el panel.
    logger.warn('[ig-prog] resumen:', e.message);
    return { pendientes: [], conError: [], error: e.message };
  }
}

exports._resumenProgramadas = resumenProgramadas;
exports._publicarPendientes = publicarPendientes;
