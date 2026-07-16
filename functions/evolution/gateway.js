'use strict';

// functions/evolution/gateway.js
// ─────────────────────────────────────────────────────────────────────────────
//  GATEWAY multi-tenant del add-on "Asistente IA 24/7 + Confirmaciones".
//  4 Cloud Functions que gobiernan la vinculación por QR sobre el número PROPIO
//  de cada local (Evolution API, ver /evolution + functions/evolution/client.js).
//
//    · evolutionVincular    (callable)  crea instance_{tid} + devuelve QR
//    · evolutionEstado      (callable)  polling del modal; detecta "connected"
//    · evolutionDesvincular (callable)  destruye la sesión (control 100% manual)
//    · evolutionWebhook     (onRequest) pararrayos del VPS → rutea al cerebro (S2)
//
//  Esquema:  tenants/{tid}/configuracion/whatsapp
//    { instanceName, numeroVinculado, estadoConexion:'disconnected'|'qr'|'connected',
//      botEnabled, tycAceptado, tycAceptadoEn, recordatorio:{ ventanaHoras } }
//
//  Config híbrida: este canal (Evolution) NO toca el número oficial de Meta
//  (whatsapp-notif.js), que queda para el aviso al dueño. Aislamiento de riesgo.
// ─────────────────────────────────────────────────────────────────────────────

const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret }                  = require('firebase-functions/params');
const { logger }                        = require('firebase-functions');
const admin                             = require('firebase-admin');
const { FieldValue }                    = require('firebase-admin/firestore');
const { crearCliente }                  = require('./client');

const db = admin.firestore();

const EVOLUTION_API_URL       = defineSecret('EVOLUTION_API_URL');
const EVOLUTION_API_KEY       = defineSecret('EVOLUTION_API_KEY');
const EVOLUTION_WEBHOOK_TOKEN = defineSecret('EVOLUTION_WEBHOOK_TOKEN');

const BOOTSTRAP_EMAILS = ['ignaciiio.mate@gmail.com'];
// URL pública de ESTA función (a la que apunta cada instancia del VPS).
const WEBHOOK_URL = 'https://us-central1-barberia-elegance.cloudfunctions.net/evolutionWebhook';

/* ─────────────────────────── Helpers ─────────────────────────── */

function cliente() {
  return crearCliente({ baseUrl: EVOLUTION_API_URL.value(), apiKey: EVOLUTION_API_KEY.value() });
}

function waCfgRef(tid) {
  return db.doc(`tenants/${tid}/configuracion/whatsapp`);
}

/** Resuelve el tenant del caller (claims) y exige rol admin/jefe. Bootstrap ve todo. */
function tenantDelCaller(req) {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Inicia sesión.');
  const claims = req.auth.token || {};
  const esBootstrap = BOOTSTRAP_EMAILS.includes(String(claims.email || '').toLowerCase());
  let tid = claims.tenantId || null;
  if (esBootstrap && req.data && req.data.tenantId) tid = String(req.data.tenantId);
  if (!tid) throw new HttpsError('permission-denied', 'Cuenta sin local asociado.');
  if (!esBootstrap && !['admin', 'jefe'].includes(claims.role || '')) {
    throw new HttpsError('permission-denied', 'Solo administradores del local.');
  }
  return tid;
}

const SECRETS = [EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_WEBHOOK_TOKEN];

/* ─────────────────── 1) Vincular — crea instancia + QR ─────────────────── */

exports.evolutionVincular = onCall({ region: 'us-central1', cors: true, secrets: SECRETS }, async (req) => {
  const tid = tenantDelCaller(req);
  // Barrera de Términos y Condiciones (obligatoria en el modal).
  if (req.data?.tycAceptado !== true) {
    throw new HttpsError('failed-precondition', 'Debes aceptar los términos de uso responsable de WhatsApp.');
  }
  const instanceName = `instance_${tid}`;
  const c = cliente();

  let r;
  try {
    r = await c.crearInstancia(instanceName, {
      webhookUrl: WEBHOOK_URL,
      webhookToken: EVOLUTION_WEBHOOK_TOKEN.value(),
    });
  } catch (e) {
    logger.error(`[evolution:vincular] tid=${tid}:`, e.message);
    throw new HttpsError('internal', 'No se pudo iniciar la vinculación. Reintenta en unos segundos.');
  }

  await waCfgRef(tid).set({
    instanceName,
    estadoConexion:  'qr',
    tycAceptado:     true,
    tycAceptadoEn:   FieldValue.serverTimestamp(),
    tycAceptadoPor:  String(req.auth.token.email || ''),
    creadoEn:        FieldValue.serverTimestamp(),
  }, { merge: true });

  logger.info(`[evolution:vincular] tid=${tid} instancia creada`);
  return { instanceName, qr: r.qr, pairingCode: r.pairingCode };
});

/* ─────────────────── 2) Estado — polling del modal ─────────────────── */

exports.evolutionEstado = onCall({ region: 'us-central1', cors: true, secrets: SECRETS }, async (req) => {
  const tid = tenantDelCaller(req);
  const instanceName = `instance_${tid}`;
  const c = cliente();

  const state = await c.estadoConexion(instanceName); // open | connecting | close | unknown

  if (state === 'open') {
    await waCfgRef(tid).set({
      estadoConexion: 'connected',
      conectadoEn:    FieldValue.serverTimestamp(),
    }, { merge: true });
    return { estado: 'connected' };
  }

  // Sigue emparejando → devolvemos un QR fresco para refrescar el modal.
  let qr = null, pairingCode = null;
  if (state === 'connecting' || state === 'close' || state === 'unknown') {
    try {
      const q = await c.obtenerQR(instanceName);
      qr = q.qr; pairingCode = q.pairingCode;
    } catch (_) { /* la instancia puede no existir aún */ }
  }
  return { estado: qr ? 'qr' : 'disconnected', qr, pairingCode };
});

/* ─────────────────── 3) Desvincular — control 100% manual ─────────────────── */

exports.evolutionDesvincular = onCall({ region: 'us-central1', cors: true, secrets: SECRETS }, async (req) => {
  const tid = tenantDelCaller(req);
  const instanceName = `instance_${tid}`;
  const c = cliente();

  try { await c.logout(instanceName); }           catch (e) { logger.warn(`[evolution:desvincular] logout tid=${tid}: ${e.message}`); }
  try { await c.eliminarInstancia(instanceName); } catch (e) { logger.warn(`[evolution:desvincular] delete tid=${tid}: ${e.message}`); }

  await waCfgRef(tid).set({
    estadoConexion:  'disconnected',
    botEnabled:      false,
    numeroVinculado: null,
    desvinculadoEn:  FieldValue.serverTimestamp(),
  }, { merge: true });

  logger.info(`[evolution:desvincular] tid=${tid} sesión destruida`);
  return { ok: true };
});

/* ─────────────────── 4) Webhook — pararrayos del VPS ─────────────────── */

exports.evolutionWebhook = onRequest({ region: 'us-central1', secrets: [EVOLUTION_WEBHOOK_TOKEN], cors: false }, async (req, res) => {
  // Validar que venga de NUESTRO VPS.
  if (req.get('x-webhook-token') !== EVOLUTION_WEBHOOK_TOKEN.value()) {
    res.status(403).send('forbidden');
    return;
  }
  // Responder 200 rápido pase lo que pase (si acumula errores, Evolution reintenta/pausa).
  try {
    const body         = req.body || {};
    const instanceName = body.instance || body.instanceName || '';
    const tid          = instanceName.replace(/^instance_/, '');
    const event        = String(body.event || '').toLowerCase();

    if (!tid) { res.status(200).send('ok'); return; }

    // ── connection.update → refleja el estado en Firestore (empuje, complementa el polling) ──
    if (event === 'connection.update') {
      const state = body.data?.state || body.data?.connection;
      if (state === 'open') {
        const numero = body.data?.wuid || body.data?.me?.id || body.sender || null;
        await waCfgRef(tid).set({
          estadoConexion:  'connected',
          numeroVinculado: numero ? String(numero).replace(/[:@].*$/, '') : null,
          conectadoEn:     FieldValue.serverTimestamp(),
        }, { merge: true }).catch(() => {});
      } else if (state === 'close') {
        await waCfgRef(tid).set({ estadoConexion: 'disconnected' }, { merge: true }).catch(() => {});
      }
    }

    // ── messages.upsert → SPRINT 2 (cerebro AI) + SPRINT 4 (anti-colisión fromMe) ──
    // Aquí solo dejamos el enganche listo; el ruteo real llega en el próximo sprint.
    // const fromMe = body.data?.key?.fromMe === true;   // humano escribió desde su celular
    // if (event === 'messages.upsert') { await rutearAlCerebro(tid, body, { fromMe }); }

    logger.info(`[evolution:webhook] tid=${tid} event=${event}`);
  } catch (e) {
    logger.error('[evolution:webhook]', e.message);
  }
  res.status(200).send('ok');
});
