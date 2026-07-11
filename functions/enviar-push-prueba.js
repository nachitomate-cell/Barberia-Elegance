'use strict';

// functions/enviar-push-prueba.js
// ─────────────────────────────────────────────────────────────────
//  ENVIAR PUSH DE PRUEBA A UN CLIENTE (callable, solo superadmin)
//
//  Desde /admin: elegir tenant + cliente y mandarle una push para
//  comprobar que las notificaciones funcionan end-to-end. Reusa la
//  confirmación de entrega/click (incrusta logId).
//
//  Deploy:
//    firebase deploy --only functions:enviarPushPrueba
// ─────────────────────────────────────────────────────────────────

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger }             = require('firebase-functions');
const admin                  = require('firebase-admin');
const { writeNotifLog }      = require('./lib/notif-log');

const BOOTSTRAP_ADMINS = ['ignaciiio.mate@gmail.com'];

function fcmTokensColPath(tenantId) {
  return tenantId === 'elegance' ? 'fcm_tokens' : `tenants/${tenantId}/fcm_tokens`;
}
function usersDocPath(tenantId, uid) {
  return tenantId === 'elegance' ? `users/${uid}` : `tenants/${tenantId}/users/${uid}`;
}

exports.enviarPushPrueba = onCall({ region: 'us-central1' }, async (request) => {
  const email = (request.auth?.token?.email || '').toLowerCase();
  if (!BOOTSTRAP_ADMINS.includes(email)) {
    throw new HttpsError('permission-denied', 'No autorizado.');
  }

  const db        = admin.firestore();
  const messaging = admin.messaging();

  const tenantId = (request.data?.tenantId || '').trim();
  const uid      = (request.data?.uid || '').trim();
  const title    = (request.data?.title || '🔔 Notificación de prueba').trim() || '🔔 Notificación de prueba';
  const body     = (request.data?.body  || '¡Hola! Esta es una prueba de notificaciones push.').trim()
                   || '¡Hola! Esta es una prueba de notificaciones push.';

  if (!tenantId || !uid) throw new HttpsError('invalid-argument', 'tenantId y uid son requeridos.');

  // Datos del cliente (para el log)
  let nombre = '', clienteEmail = '';
  try {
    const uSnap = await db.doc(usersDocPath(tenantId, uid)).get();
    if (uSnap.exists) { const u = uSnap.data(); nombre = u.nombre || ''; clienteEmail = u.email || ''; }
  } catch (_) {}

  // Tokens activos del cliente
  let tokens = [];
  try {
    const snap = await db.collection(fcmTokensColPath(tenantId))
      .where('userId', '==', uid)
      .where('activo', '==', true)
      .get();
    tokens = snap.docs.map(d => ({ id: d.id, token: d.data().token })).filter(t => t.token);
  } catch (e) {
    throw new HttpsError('internal', 'Error leyendo tokens: ' + e.message);
  }

  if (!tokens.length) {
    return {
      ok: false, error: 'sin-tokens', tokens: 0, enviados: 0,
      mensaje: 'El cliente no tiene notificaciones push activas (no abrió el Club o no dio permiso).',
    };
  }

  // Crear el log primero para incrustar el logId (confirmación de entrega/click).
  const logId = await writeNotifLog(db, {
    tenantId, type: 'push_prueba', channel: 'push', status: 'sent',
    to: { nombre, email: clienteEmail }, meta: { uid },
  });

  const invalidos = [];
  let enviados = 0;
  await Promise.all(tokens.map(async (t) => {
    try {
      await messaging.send({
        token: t.token,
        notification: { title, body },
        data: { tipo: 'prueba', tenantId, logId: logId || '' },
        webpush: {
          headers: { Urgency: 'high' },
          notification: {
            icon:     '/icons/icon-192.png',
            badge:    '/icons/icon-192.png',
            tag:      'prueba-' + (logId || 'x'),
            renotify: true,
            vibrate:  [200, 100, 200],
          },
          fcmOptions: { link: '/dashboard.html' },
        },
      });
      enviados++;
    } catch (err) {
      const code = err.errorInfo?.code || err.code || '';
      if (code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token' ||
          code === 'messaging/invalid-argument') {
        invalidos.push(t.id);
      }
      logger.warn(`[PushPrueba] ✗ ${tenantId}/${uid}: ${code || err.message}`);
    }
  }));

  // Desactivar tokens muertos.
  if (invalidos.length) {
    const batch = db.batch();
    invalidos.forEach((id) =>
      batch.update(db.collection(fcmTokensColPath(tenantId)).doc(id), { activo: false }));
    await batch.commit().catch(() => {});
  }

  if (enviados === 0 && logId) {
    await db.collection('notification_logs').doc(logId).update({ status: 'failed' }).catch(() => {});
  }

  logger.info(`[PushPrueba] ${tenantId}/${uid}: ${enviados}/${tokens.length} (log ${logId || '-'})`);
  return { ok: enviados > 0, tokens: tokens.length, enviados, desactivados: invalidos.length, logId: logId || null };
});
