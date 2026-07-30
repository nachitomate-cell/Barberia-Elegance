'use strict';

// functions/evolution/plataforma.js
// ─────────────────────────────────────────────────────────────────────────────
//  CANAL PLATAFORMA — confirmaciones y recordatorios desde el número SynapTech
//
//  Tercer canal, y el punto medio entre los dos que ya existen:
//
//    · Canal propio (evolution/confirmaciones.js) → número del LOCAL.
//      Gratis, marca perfecta, pero el riesgo de bloqueo lo corre el local.
//    · Canal oficial (whatsapp-notif.js, Cloud API) → número de plataforma.
//      Cero riesgo para el local, pero ~US$0,02 por mensaje.
//    · ESTE → número de SynapTech por Evolution: gratis Y sin exponer el
//      número del local. Lo que se arriesga es un chip nuestro, desechable.
//
//  ⚠️ LA DIFERENCIA ESTRUCTURAL: la instancia es COMPARTIDA
//  ────────────────────────────────────────────────────────
//  Un chip = una sesión de WhatsApp, así que un solo número atiende a varios
//  locales. Eso rompe el supuesto del canal propio, donde el tenant se deduce
//  del nombre de la instancia (`instance_delnero`). Acá la instancia se llama
//  igual para todos, así que al llegar una respuesta lo único que tenemos es
//  el teléfono del cliente. De ahí la colección raíz `wa_plataforma_chats`:
//  es el índice teléfono → tenant, y sin él un "CONFIRMAR" no se puede aplicar
//  a ninguna cita. Mismo problema y misma solución que en el canal oficial
//  (`wa_cita_pendiente`), por la misma razón: número compartido.
//
//  ⚠️ EL TOPE ANTI-BLOQUEO ES DEL CHIP, NO DEL TENANT
//  ──────────────────────────────────────────────────
//  En el canal propio cada local arriesga su propio número, así que el tope
//  vive en `tenants/{tid}/wa_cuota`. Acá todos comparten UN número: si cada
//  tenant llevara su propio contador, diez locales a 20 mensajes serían 200
//  salientes del mismo chip en un día — exactamente el patrón que Meta
//  suspende. El contador es global: `wa_plataforma_cuota/{fecha}`.
//
//  ── Datos ───────────────────────────────────────────────────────────────────
//  _system/wa_plataforma          estado del chip (instancia, número, conexión,
//                                 vinculadoDesde) — lo escribe SynapTech.
//  _system/{tid}.waPlataforma     opt-in por local (solo bootstrap lo escribe).
//  wa_plataforma_chats/{telefono} índice teléfono → tenant + cita pendiente.
//  wa_plataforma_cuota/{fecha}    salientes del chip ese día (tope global).
// ─────────────────────────────────────────────────────────────────────────────

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { esOperador } = require("../lib/operadores");
const { onSchedule }         = require('firebase-functions/v2/scheduler');
const { defineSecret }       = require('firebase-functions/params');
const { logger }             = require('firebase-functions');
const admin                  = require('firebase-admin');
const { FieldValue, Timestamp } = require('firebase-admin/firestore');

const { crearCliente }            = require('./client');
const { _ahoraChile: ahoraChile } = require('../chat-horas-disponibles');
const { estaBloqueado, detectarStop, registrarOptOut } = require('../lib/wa-consent');
const { _normalizeCl: normalizeCl } = require('./confirmaciones');
const { _detectarDecision: detectarDecision,
        _aplicarDecision:  aplicarDecision } = require('./cerebro');
const { logWaSend } = require('../lib/metrics');

const db = admin.firestore();

const EVOLUTION_API_URL       = defineSecret('EVOLUTION_API_URL');
const EVOLUTION_API_KEY       = defineSecret('EVOLUTION_API_KEY');
const EVOLUTION_WEBHOOK_TOKEN = defineSecret('EVOLUTION_WEBHOOK_TOKEN');

const BOOTSTRAP_EMAILS = ['ignaciiio.mate@gmail.com'];
const WEBHOOK_URL = 'https://us-central1-barberia-elegance.cloudfunctions.net/evolutionWebhook';

/** Nombre fijo de la instancia compartida. El webhook lo usa para distinguir
 *  este canal del canal propio de cada local (`instance_{tid}`). */
const INSTANCIA = 'instance_synaptech';

const cfgRef   = () => db.doc('_system/wa_plataforma');
const chatRef  = (tel) => db.doc(`wa_plataforma_chats/${tel}`);
const cuotaRef = (fecha) => db.doc(`wa_plataforma_cuota/${fecha}`);
const citasCol = (tid) => (tid === 'elegance'
  ? db.collection('citas')
  : db.collection(`tenants/${tid}/citas`));

const SECRETS = [EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_WEBHOOK_TOKEN];
const cliente = () => crearCliente({
  baseUrl: EVOLUTION_API_URL.value(), apiKey: EVOLUTION_API_KEY.value(),
});

function exigirBootstrap(req) {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Inicia sesión.');
  const email = String(req.auth.token?.email || '').toLowerCase();
  if (!esOperador(email)) {
    throw new HttpsError('permission-denied', 'Solo SynapTech administra el número de plataforma.');
  }
}

/* ───────────────────────── Ritmo anti-bloqueo (del chip) ───────────────────── */

const HORA_INICIO   = 9;
const HORA_FIN      = 21;
const MAX_POR_CICLO = 8;

/** Tope diario del CHIP, escalonado por su antigüedad. Mismos números que
 *  evolution/cuota.js: un número recién vinculado despachando decenas de
 *  mensajes el día uno es el patrón que Meta suspende primero. */
function capDiario(cfg) {
  const desde = cfg && cfg.vinculadoDesde && cfg.vinculadoDesde.toMillis
    ? cfg.vinculadoDesde.toMillis() : 0;
  const dias = desde ? (Date.now() - desde) / 86400000 : 0;
  if (dias >= 30) return 300;
  if (dias >= 7)  return 120;
  return 40;
}

const fechaHoy = () => ahoraChile().fecha;

function dentroDeVentanaHoraria(now = ahoraChile()) {
  const h = Math.floor(now.mins / 60);
  return h >= HORA_INICIO && h < HORA_FIN;
}

async function salientesHoy() {
  try {
    const s = await cuotaRef(fechaHoy()).get();
    return s.exists ? (Number(s.data().n) || 0) : 0;
  } catch (_) { return 0; }
}

async function registrarSaliente(tid, ok = true) {
  const fecha = fechaHoy();
  await cuotaRef(fecha).set({
    fecha,
    ...(ok ? { n: FieldValue.increment(1) } : {}),
    [`t_${tid}`]: FieldValue.increment(1),   // desglose por local, para cobrar
    [ok ? 'ok' : 'fail']: FieldValue.increment(1),
    actualizado: FieldValue.serverTimestamp(),
  }, { merge: true }).catch(() => {});
}

/** Telemetría de SALUD del chip. Lo que de verdad anticipa un bloqueo no es el
 *  volumen: es que la gente deje de contestar (posible shadowban — el mensaje
 *  "sale" pero no llega) o que empiece a pedir la baja. Se cuenta acá para que
 *  ops pueda decidir el recambio ANTES de que Meta lo suspenda.
 *  Nunca lanza: es telemetría, no puede tumbar una respuesta al cliente. */
async function registrarEvento(tipo) {
  const fecha = fechaHoy();
  await cuotaRef(fecha).set({
    fecha,
    [tipo]: FieldValue.increment(1),
    actualizado: FieldValue.serverTimestamp(),
  }, { merge: true }).catch(() => {});
}
exports._registrarEvento = registrarEvento;

/* ─────────────────────────── Vinculación del chip ──────────────────────────── */

exports.plataformaVincular = onCall({ region: 'us-central1', cors: true, secrets: SECRETS }, async (req) => {
  exigirBootstrap(req);
  const c = cliente();
  const opts = { webhookUrl: WEBHOOK_URL, webhookToken: EVOLUTION_WEBHOOK_TOKEN.value() };

  let r;
  try {
    r = await c.crearInstancia(INSTANCIA, opts);
  } catch (e) {
    // Puede quedar colgada de un intento previo sin escanear. Se destruye y
    // se reintenta UNA vez para entregar un QR fresco (mismo auto-sanado que
    // el canal propio, que ya nos mordió una vez).
    logger.warn(`[plataforma] create falló (${e.message}); auto-sanando`);
    try { await c.logout(INSTANCIA); }           catch (_) {}
    try { await c.eliminarInstancia(INSTANCIA); } catch (_) {}
    try {
      r = await c.crearInstancia(INSTANCIA, opts);
    } catch (e2) {
      logger.error('[plataforma] vincular:', e2.message);
      throw new HttpsError('internal', 'No se pudo iniciar la vinculación. Reintenta en unos segundos.');
    }
  }

  await cfgRef().set({
    instanceName:   INSTANCIA,
    estadoConexion: 'qr',
    creadoEn:       FieldValue.serverTimestamp(),
  }, { merge: true });

  return { instanceName: INSTANCIA, qr: r.qr, pairingCode: r.pairingCode };
});

exports.plataformaEstado = onCall({ region: 'us-central1', cors: true, secrets: SECRETS }, async (req) => {
  exigirBootstrap(req);
  let estado = 'unknown';
  try { estado = await cliente().estadoConexion(INSTANCIA); } catch (_) {}
  const cfg = (await cfgRef().get()).data() || {};

  if (estado === 'open' && cfg.estadoConexion !== 'connected') {
    await cfgRef().set({
      estadoConexion: 'connected',
      conectadoEn:    FieldValue.serverTimestamp(),
      // vinculadoDesde: PRIMERA conexión. No se pisa al reconectar — es la
      // base del tope escalonado.
      ...(cfg.vinculadoDesde ? {} : { vinculadoDesde: FieldValue.serverTimestamp() }),
    }, { merge: true }).catch(() => {});
  }
  return { estado, cfg: { ...cfg, estadoConexion: estado === 'open' ? 'connected' : cfg.estadoConexion } };
});

exports.plataformaDesvincular = onCall({ region: 'us-central1', cors: true, secrets: SECRETS }, async (req) => {
  exigirBootstrap(req);
  const c = cliente();
  try { await c.logout(INSTANCIA); }           catch (_) {}
  try { await c.eliminarInstancia(INSTANCIA); } catch (_) {}
  await cfgRef().set({
    estadoConexion:  'disconnected',
    numeroVinculado: FieldValue.delete(),
    desvinculadoEn:  FieldValue.serverTimestamp(),
  }, { merge: true }).catch(() => {});
  return { ok: true };
});

/* ─────────────────────── Entrante: rutear al tenant correcto ───────────────── */

/** ¿Este webhook es de la instancia compartida? */
exports.esInstanciaPlataforma = (instanceName) => instanceName === INSTANCIA;

/**
 * Procesa una respuesta que llegó al número de plataforma.
 * No hay bot conversacional acá a propósito: un mismo número contestando como
 * varias barberías distintas es una mala idea de producto y una señal rara
 * para Meta. Solo se interpreta CONFIRMAR / CANCELAR sobre la cita pendiente.
 */
async function procesarEntrantePlataforma({ body, evoClient }) {
  const data = body.data || {};
  const key  = data.key || {};
  if (key.fromMe) return;                                   // eco nuestro
  const remoteJid = String(key.remoteJid || '');
  if (remoteJid.endsWith('@g.us')) return;                  // grupos, jamás

  const tel = normalizeCl(remoteJid.replace(/[:@].*$/, ''));
  if (!tel) return;

  const msg = data.message || {};
  const texto = String(
    msg.conversation ?? msg.extendedTextMessage?.text ?? '',
  ).trim();
  if (!texto) return;

  const snap = await chatRef(tel).get();
  const pend = snap.exists ? (snap.data() || {}) : null;
  const vigente = pend && pend.tenantId && pend.citaId
    && (!pend.expiraEn || pend.expiraEn.toMillis() > Date.now());

  const responder = async (t) => {
    try { await evoClient.enviarTexto(INSTANCIA, tel, t); }
    catch (e) { logger.warn(`[plataforma] no pude responder a ***${tel.slice(-4)}: ${e.message}`); }
  };

  // Toda respuesta cuenta para la tasa de respuesta del chip, que es la
  // señal más temprana de un shadowban: los envíos siguen saliendo "ok"
  // pero nadie contesta porque no están llegando.
  await registrarEvento('respuestas');

  // ── STOP: se honra ANTES que cualquier otra cosa ──
  // Obligatorio por política de Meta y por Ley 21.719, y además es el
  // indicador adelantado del bloqueo: lo que sube primero no es el error de
  // envío, es la gente pidiendo la baja. Se escribe en el libro GLOBAL
  // /wa_optout, así que frena también los otros dos canales.
  if (detectarStop(texto)) {
    await registrarOptOut(tel, 'stop-plataforma').catch(e =>
      logger.error(`[plataforma] optout ${tel}:`, e.message));
    await chatRef(tel).delete().catch(() => {});
    await registrarEvento('optout');
    await responder(
      '🔕 Listo, no volveremos a escribirte por este medio.\n\n' +
      'Tu cita sigue agendada; si necesitas cambiarla, contacta directamente a tu local.');
    logger.info(`[plataforma] opt-out ***${tel.slice(-4)}`);
    return;
  }

  if (!vigente) {
    // Sin cita pendiente no sabemos de qué local habla. Se responde una vez
    // para no dejarlo hablando solo, pero no se inventa nada.
    await responder(
      'Hola 👋 Este número solo envía confirmaciones de citas.\n\n' +
      'Si necesitas reagendar o cancelar, contacta directamente a tu local.');
    return;
  }

  const decision = detectarDecision(texto);
  if (!decision) {
    await responder(
      `Perdona, no te entendí 🙈\n\n` +
      `Sobre tu cita en ${pend.local || 'el local'} del ${pend.fecha} a las ${pend.hora} hrs: ` +
      'responde *CONFIRMAR* si vienes, o *CANCELAR* si no podrás.');
    return;
  }

  // Misma semántica que el canal propio: 'Cancelada' dispara
  // liberar-slot-on-cancel y libera el cupo.
  await aplicarDecision(pend.tenantId, tel, pend.citaId, decision);
  await chatRef(tel).delete().catch(() => {});
  await registrarEvento(decision === 'confirmar' ? 'conf_si' : 'conf_no');

  await responder(decision === 'confirmar'
    ? `✅ ¡Listo! Tu cita en ${pend.local || 'el local'} quedó confirmada.\n\nTe esperamos el ${pend.fecha} a las ${pend.hora} hrs.`
    : `🙏 Listo, cancelamos tu cita del ${pend.fecha} a las ${pend.hora} hrs.\n\nCuando quieras volver a agendar, escríbele a ${pend.local || 'tu local'}.`);

  logger.info(`[plataforma] ${decision} tenant=${pend.tenantId} cita=${pend.citaId}`);
}
exports.procesarEntrantePlataforma = procesarEntrantePlataforma;

/* ──────────────────── Cron: confirmaciones desde el número SynapTech ───────── */

const toMins = (t) => { const [h, m] = String(t || '').split(':').map(Number); return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0); };
const absMin = (fecha, mins) => { const [y, mo, d] = String(fecha).split('-').map(Number); return Math.floor(Date.UTC(y, mo - 1, d) / 86400000) * 1440 + mins; };
const sumarDias = (fecha, n) => {
  const [y, m, d] = String(fecha).split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`;
};

function armarMensaje({ nombre, local, fecha, hora, servicio }) {
  // El cliente NO conoce este número, así que el local va en la PRIMERA línea:
  // sin eso el mensaje parece spam y sube la tasa de bloqueo, que es
  // justamente lo que quema el chip.
  const quien = nombre ? ` ${nombre}` : '';
  return [
    `Hola${quien} 👋 Te escribimos de *${local}*.`,
    '',
    `Tienes tu cita agendada:`,
    `📅 ${fecha}`,
    `🕐 ${hora} hrs`,
    servicio ? `✂️ ${servicio}` : '',
    '',
    '¿La confirmas? Responde *CONFIRMAR* para asistir o *CANCELAR* si no podrás. 🙌',
  ].filter(Boolean).join('\n');
}

/** Recorre los tenants con el módulo activo y manda lo que toque.
 *  Devuelve cuántos mensajes salieron. */
async function procesarCiclo({ evoClient }) {
  const cfg = (await cfgRef().get()).data() || {};
  if (cfg.estadoConexion !== 'connected') {
    logger.info('[plataforma] chip no conectado; ciclo omitido');
    return 0;
  }

  const cap = capDiario(cfg);
  let enviadosHoy = await salientesHoy();
  if (enviadosHoy >= cap) {
    logger.warn(`[plataforma] tope diario del chip alcanzado (${enviadosHoy}/${cap})`);
    return 0;
  }

  // listDocuments, NO collection().get(): la mayoría de los docs padre
  // tenants/{id} no existen como documentos y get() los omite.
  const refs = await db.collection('tenants').listDocuments();
  const tids = new Set(refs.map(r => r.id));
  tids.add('elegance');

  const now    = ahoraChile();
  const nowAbs = absMin(now.fecha, now.mins);
  let enviados = 0;

  for (const tid of tids) {
    if (enviados >= MAX_POR_CICLO || enviadosHoy + enviados >= cap) break;

    const sys = (await db.doc(`_system/${tid}`).get()).data() || {};
    if (sys.waPlataforma !== true) continue;

    // Guard anti doble envío: si el local ya manda recordatorios por SU
    // número, este canal se calla. Los dos crons miran las mismas citas.
    const waCfg = (await db.doc(`tenants/${tid}/configuracion/whatsapp`).get()).data() || {};
    if (waCfg.confirmacionesEnabled === true && waCfg.estadoConexion === 'connected') {
      logger.warn(`[plataforma] ${tid}: ya manda por su propio número; omitido para no duplicar`);
      continue;
    }

    const td      = (await db.doc(`tenants/${tid}`).get()).data() || {};
    const local   = td.nombre || td.nombreCorto || tid;
    // La ventana sale del doc del LOCAL, no de _system: el local no puede
    // escribir _system, y esta sí es una preferencia suya (misma clave que
    // usa el canal propio, así que el selector del panel sirve para ambos).
    const ventana = Number(waCfg?.recordatorio?.ventanaHoras) || 24;
    const nDays   = Math.ceil(ventana / 24);

    for (let i = 0; i <= nDays && enviados < MAX_POR_CICLO; i++) {
      const fecha = sumarDias(now.fecha, i);
      const snap  = await citasCol(tid).where('fecha', '==', fecha).get();

      for (const doc of snap.docs) {
        if (enviados >= MAX_POR_CICLO || enviadosHoy + enviados >= cap) break;

        const cita = doc.data() || {};
        if ((cita.estado || '') !== 'Pendiente') continue;
        if (cita.waConfirmSolicitada === true)   continue;
        if (cita.waOptIn !== true)               continue;   // doble opt-in
        if (cita.waNumeroInvalido === true)      continue;
        if (cita.origenQA)                       continue;   // barbero fantasma
        if (typeof cita.hora !== 'string' || !cita.hora.includes(':')) continue;

        const tel = normalizeCl(cita.clienteTelefono);
        if (!tel) continue;

        const diffH = (absMin(cita.fecha, toMins(cita.hora)) - nowAbs) / 60;
        if (diffH <= 0 || diffH > ventana) continue;

        if (await estaBloqueado(tel)) {
          await doc.ref.update({ waConfirmSolicitada: true, waOmitidaMotivo: 'optout' }).catch(() => {});
          continue;
        }

        try {
          const existe = await evoClient.verificarNumeros(INSTANCIA, [tel]);
          if (existe.size && existe.get(tel) === false) {
            await doc.ref.update({ waNumeroInvalido: true, waOmitidaMotivo: 'sin-whatsapp' }).catch(() => {});
            continue;
          }
        } catch (e) {
          logger.warn(`[plataforma] verificarNumeros falló (${e.message}); se envía sin verificar`);
        }

        const texto = armarMensaje({
          nombre:   String(cita.clienteNombre || '').trim().split(/\s+/)[0] || '',
          local, fecha: cita.fecha, hora: cita.hora,
          servicio: cita.servicioNombre || '',
        });

        try {
          await evoClient.enviarTexto(INSTANCIA, tel, texto);
        } catch (e) {
          logger.error(`[plataforma] ${tid}/${doc.id} falló: ${e.message}`);
          await registrarSaliente(tid, false);
          continue;
        }

        await doc.ref.update({
          waConfirmSolicitada:   true,
          waConfirmSolicitadaEn: FieldValue.serverTimestamp(),
          waConfirmCanal:        'plataforma',
        }).catch(() => {});

        // Índice teléfono → tenant. Sin esto la respuesta no se puede aplicar.
        // Expira 6h DESPUÉS de la cita: un "sí" que llega tarde no revive una
        // hora que ya pasó.
        await chatRef(tel).set({
          tenantId: tid,
          citaId:   doc.id,
          fecha:    cita.fecha,
          hora:     cita.hora,
          local,
          creadoEn: FieldValue.serverTimestamp(),
          expiraEn: Timestamp.fromMillis(
            Date.now() + Math.max(1, diffH + 6) * 3600e3),
        }).catch(() => {});

        await registrarSaliente(tid, true);
        await logWaSend(tid, 'confirmacion', true).catch(() => {});
        enviados++;
        logger.info(`[plataforma] ${tid}/${doc.id} → confirmación enviada a ***${tel.slice(-4)}`);
      }
    }
  }

  return enviados;
}
exports._procesarCiclo = procesarCiclo;

exports.plataformaConfirmaciones = onSchedule({
  schedule:       'every 30 minutes',
  timeZone:       'America/Santiago',
  region:         'us-central1',
  secrets:        SECRETS,
  timeoutSeconds: 300,
}, async () => {
  if (!dentroDeVentanaHoraria()) {
    logger.info(`[plataforma] fuera de ventana (${HORA_INICIO}:00–${HORA_FIN}:00 Chile); ciclo omitido`);
    return;
  }
  const n = await procesarCiclo({ evoClient: cliente() });
  if (n > 0) logger.info(`[plataforma] ciclo completo: ${n} confirmación(es)`);
});
