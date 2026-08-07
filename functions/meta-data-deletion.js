'use strict';

// functions/meta-data-deletion.js
// ─────────────────────────────────────────────────────────────────────────────
//  BORRADO DE DATOS SOLICITADO POR META — requisito de App Review.
//
//  Cuando alguien quita la app desde su configuración de Facebook/Instagram,
//  Meta le pega a este endpoint con un `signed_request` y espera de vuelta un
//  código de confirmación y una URL donde el usuario pueda ver el estado.
//  Sin este endpoint (o una página equivalente), la App Review se rechaza.
//
//  No es solo un trámite: si alguien nos escribió por Instagram y después
//  revoca el acceso, sus mensajes siguen en nuestra base. Esto los borra de
//  verdad — es la misma obligación de la Ley 21.719 que ya cumple
//  eliminar-mis-datos.js para los clientes de los locales.
//
//  Qué se borra de esa persona:
//    · ig_conversaciones/{igsid}                 su hilo y el texto guardado
//    · wa_ventas_conversaciones/ig_{igsid}       la conversación con el bot
//    · wa_ventas_leads/ig_{igsid}                el lead, si llegó a haberlo
//    · ig_comentarios donde figure como autor    su @ y lo que comentó
//
//  Queda un asiento en `eliminaciones_log` con el id hasheado: hay que poder
//  demostrar que se borró sin volver a guardar el dato que se borró.
// ─────────────────────────────────────────────────────────────────────────────

const { onRequest }    = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { logger }       = require('firebase-functions');
const admin            = require('firebase-admin');
const crypto           = require('crypto');
const { FieldValue }   = require('firebase-admin/firestore');

// Perezoso a propósito: tomar Firestore al importar obliga a que la app esté
// inicializada solo para cargar el archivo, encarece el arranque en frío y hace
// imposible testear la verificación de firma sin credenciales.
const db = () => admin.firestore();
const INSTAGRAM_APP_SECRET = defineSecret('INSTAGRAM_APP_SECRET');

// La política del Studio, que es la que se le declara a Meta y la única que
// describe qué se guarda de Instagram. `privacidad.html` es la del club de cada
// local — otra cosa.
const PAGINA_ESTADO = 'https://empieza.synaptechspa.cl/studio-privacidad.html';

/**
 * Verifica y abre el `signed_request` de Meta.
 * Formato: `<firma base64url>.<payload base64url>`, firmado con HMAC-SHA256
 * usando el secreto de la app. Sin verificar, cualquiera podría pedir el
 * borrado de los datos de otra persona.
 */
function abrirSignedRequest(signed, appSecret) {
  const partes = String(signed || '').split('.');
  if (partes.length !== 2) throw new Error('signed_request mal formado');

  const b64url = (s) => Buffer.from(
    s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - s.length % 4) % 4),
    'base64',
  );
  const firma   = b64url(partes[0]);
  const cuerpo  = partes[1];
  const esperado = crypto.createHmac('sha256', appSecret).update(cuerpo).digest();

  if (firma.length !== esperado.length || !crypto.timingSafeEqual(firma, esperado)) {
    throw new Error('firma inválida');
  }
  const datos = JSON.parse(b64url(cuerpo).toString('utf-8'));
  if (datos.algorithm && String(datos.algorithm).toUpperCase() !== 'HMAC-SHA256') {
    throw new Error(`algoritmo no soportado: ${datos.algorithm}`);
  }
  return datos;
}

async function borrarDatosDe(userId) {
  const borrados = [];
  const intentar = async (etiqueta, fn) => {
    try { const n = await fn(); if (n) borrados.push(`${etiqueta}:${n}`); }
    catch (e) { logger.warn(`[data-deletion] ${etiqueta}: ${e.message}`); }
  };

  await intentar('conversacion', async () => {
    const r = db().doc(`ig_conversaciones/${userId}`);
    if (!(await r.get()).exists) return 0;
    await r.delete(); return 1;
  });

  await intentar('chat-bot', async () => {
    const r = db().doc(`wa_ventas_conversaciones/ig_${userId}`);
    if (!(await r.get()).exists) return 0;
    await r.delete(); return 1;
  });

  await intentar('lead', async () => {
    const r = db().doc(`wa_ventas_leads/ig_${userId}`);
    if (!(await r.get()).exists) return 0;
    await r.delete(); return 1;
  });

  await intentar('comentarios', async () => {
    const q = await db().collection('ig_comentarios').where('autorId', '==', String(userId)).get();
    if (q.empty) return 0;
    const lote = db().batch();
    q.docs.forEach((d) => lote.delete(d.ref));
    await lote.commit();
    return q.size;
  });

  return borrados;
}

exports.metaDataDeletion = onRequest({
  region: 'us-central1',
  secrets: [INSTAGRAM_APP_SECRET],
  timeoutSeconds: 60,
}, async (req, res) => {
  // GET: la página de estado que Meta y el usuario pueden abrir.
  if (req.method === 'GET') {
    const code = String(req.query.code || '');
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(`<!doctype html><meta charset="utf-8">
      <title>Eliminación de datos · SynapTech</title>
      <body style="font-family:system-ui;max-width:640px;margin:12vh auto;padding:24px;line-height:1.6;color:#0F1A2B">
      <h1 style="font-size:22px">Eliminación de datos</h1>
      ${code
        ? `<p>Tu solicitud <b>${code.replace(/[^a-zA-Z0-9_-]/g, '')}</b> fue recibida y tus datos se eliminaron de nuestros sistemas.</p>`
        : '<p>Esta página confirma las solicitudes de eliminación de datos.</p>'}
      <p>Si quieres eliminar tus datos, escríbenos a
        <a href="mailto:hola@synaptechspa.cl">hola@synaptechspa.cl</a> o por WhatsApp al +56 9 8356 8212.</p>
      <p><a href="${PAGINA_ESTADO}">Política de privacidad</a></p></body>`);
    return;
  }

  if (req.method !== 'POST') { res.status(405).send('method not allowed'); return; }

  try {
    const signed = req.body?.signed_request || req.query?.signed_request;
    const datos  = abrirSignedRequest(signed, INSTAGRAM_APP_SECRET.value());
    const userId = String(datos.user_id || '');
    if (!userId) throw new Error('el signed_request no trae user_id');

    const borrados = await borrarDatosDe(userId);

    // Código estable y no adivinable: deja rastro auditable sin volver a
    // guardar el id que se acaba de borrar.
    const code = 'del_' + crypto.createHash('sha256')
      .update(userId + INSTAGRAM_APP_SECRET.value()).digest('hex').slice(0, 16);

    await db().collection('eliminaciones_log').add({
      origen: 'meta-data-deletion',
      usuarioHash: crypto.createHash('sha256').update(userId).digest('hex'),
      confirmationCode: code,
      borrados,
      creadoEn: FieldValue.serverTimestamp(),
    }).catch((e) => logger.warn('[data-deletion] log:', e.message));

    logger.info(`[data-deletion] ${code} — ${borrados.join(', ') || 'no había datos'}`);
    res.status(200).json({
      url: `${req.protocol}://${req.get('host')}${req.path}?code=${code}`,
      confirmation_code: code,
    });
  } catch (e) {
    logger.error('[data-deletion]', e.message);
    res.status(400).json({ error: e.message });
  }
});

/* ──────────────────────── Cancelación de autorización ────────────────────────
 *  El otro callback que Meta pide en Configuración → Básica, y que faltaba.
 *
 *  Se dispara cuando el dueño quita la app desde Instagram. NO implica borrar
 *  sus datos (para eso está el de arriba): implica que el token murió. Sin
 *  esto la conexión seguía marcada `enabled: true` con un token revocado, así
 *  que el asistente se veía encendido en el panel y cada DM fallaba contra la
 *  API sin que nadie supiera por qué.
 *
 *  Un `instagramUserId` puede estar en varios docs —hoy cinco comparten el de
 *  @synaptechspa— y el token revocado los mata a todos: se apagan todos los
 *  que lo tengan, no el primero que aparezca.
 */
async function desautorizarCuenta(igUserId) {
  const id = String(igUserId || '');
  if (!id) return [];

  const s = await db().collection('_system').where('instagramUserId', '==', id).get();
  const apagados = [];

  for (const d of s.docs) {
    if (!d.id.startsWith('instagram_')) continue;
    const tid = d.id.slice('instagram_'.length);

    await d.ref.set({
      enabled:        false,
      errorMsg:       'El dueño quitó la app desde Instagram. Hay que volver a conectar la cuenta.',
      desautorizadaEn: FieldValue.serverTimestamp(),
    }, { merge: true });

    // El asistente de reservas se apaga también: dejarlo prendido le promete al
    // local una respuesta automática que ya no puede dar.
    await db().doc(`_system/${tid}`)
      .set({ igAsistente: false }, { merge: true })
      .catch((e) => logger.warn(`[deauth] no pude apagar igAsistente de ${tid}: ${e.message}`));

    apagados.push(tid);
  }

  return apagados;
}

exports.metaDeauthorize = onRequest({
  region: 'us-central1',
  secrets: [INSTAGRAM_APP_SECRET],
  timeoutSeconds: 60,
}, async (req, res) => {
  if (req.method === 'GET') { res.status(200).send('ok'); return; }
  if (req.method !== 'POST') { res.status(405).send('method not allowed'); return; }

  try {
    const signed = req.body?.signed_request || req.query?.signed_request;
    const datos  = abrirSignedRequest(signed, INSTAGRAM_APP_SECRET.value());
    const userId = String(datos.user_id || '');
    if (!userId) throw new Error('el signed_request no trae user_id');

    const apagados = await desautorizarCuenta(userId);
    logger.info(`[deauth] ${apagados.length ? apagados.join(', ') : 'ninguna cuenta calzó'}`);
    res.status(200).json({ ok: true });
  } catch (e) {
    logger.error('[deauth]', e.message);
    res.status(400).json({ error: e.message });
  }
});

exports._abrirSignedRequest = abrirSignedRequest;
exports._borrarDatosDe = borrarDatosDe;
exports._desautorizarCuenta = desautorizarCuenta;
