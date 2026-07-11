'use strict';

// functions/admin-push.js
// ─────────────────────────────────────────────────────────────────
//  ENVIAR PUSH A TODOS LOS ADMINS DEL PORTAL /admin
//
//  Callable (solo bootstrap admins) que hace un dispatch FCM a todos
//  los tokens registrados en /admin_fcm_tokens (root Firestore).
//
//  El portal /admin, cuando se instala como PWA, registra su token
//  en esa colección al aceptar el permiso de notificaciones.
//
//  Uso desde la UI:
//    firebase.functions().httpsCallable('enviarPushAdmin')({
//      title: '...', body: '...', url: '/admin/', tag: 'admin-alerta'
//    });
//
//  Uso desde otras CF (event-driven, p.ej. soporte nuevo mensaje):
//    const { dispatchAdminPush } = require('./admin-push');
//    await dispatchAdminPush(admin.firestore(), admin.messaging(), {
//      title, body, url, tag, data
//    });
//
//  Deploy:
//    firebase deploy --only functions:enviarPushAdmin
// ─────────────────────────────────────────────────────────────────

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger }             = require('firebase-functions');
const admin                  = require('firebase-admin');

const BOOTSTRAP_ADMINS = ['ignaciiio.mate@gmail.com'];

/**
 * Envía una push a todos los tokens de /admin_fcm_tokens activos.
 * Marca los tokens inválidos (unregistered / invalid-argument) como
 * activo=false para no volver a intentar en el próximo dispatch.
 *
 * @returns {Promise<{tokens:number, enviados:number, invalidos:number}>}
 */
async function dispatchAdminPush(db, messaging, { title, body, url, tag, data }) {
  const snap = await db.collection('admin_fcm_tokens').where('activo', '==', true).get();
  const tokens = snap.docs
    .map(d => ({ id: d.id, token: d.data().token }))
    .filter(t => t.token);

  if (!tokens.length) return { tokens: 0, enviados: 0, invalidos: 0 };

  const notification = {
    title: (title || 'SynapTech Admin').toString().slice(0, 120),
    body:  (body  || 'Nueva notificación del panel').toString().slice(0, 240),
  };
  const dataPayload = Object.assign({}, data || {}, {
    url: url || '/admin/',
    tag: tag || 'admin-notif',
    origen: 'admin_push',
  });
  // Todos los valores en data deben ser strings (limitación FCM).
  Object.keys(dataPayload).forEach(k => {
    if (dataPayload[k] == null) delete dataPayload[k];
    else dataPayload[k] = String(dataPayload[k]);
  });

  const webpush = {
    notification: {
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      requireInteraction: false,
    },
    fcmOptions: { link: dataPayload.url },
  };

  const invalidos = [];
  let enviados = 0;

  await Promise.all(tokens.map(async (t) => {
    try {
      await messaging.send({
        token: t.token,
        notification,
        data: dataPayload,
        webpush,
      });
      enviados++;
      // toca ultimaVezVisto para saber qué dispositivos están vivos
      db.collection('admin_fcm_tokens').doc(t.id).set({
        ultimaVezPush: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true }).catch(() => {});
    } catch (e) {
      const code = e && e.errorInfo && e.errorInfo.code || e.code || '';
      if (code.includes('registration-token-not-registered') || code.includes('invalid-argument') || code.includes('invalid-registration-token')) {
        invalidos.push(t.id);
      } else {
        logger.warn('[admin-push] Falló el envío a', t.id, code || e.message);
      }
    }
  }));

  // Desactivar tokens muertos
  await Promise.all(invalidos.map(id =>
    db.collection('admin_fcm_tokens').doc(id).set({
      activo: false,
      desactivadoEn: admin.firestore.FieldValue.serverTimestamp(),
      motivoDesactivacion: 'token-invalido',
    }, { merge: true }).catch(() => {})
  ));

  return { tokens: tokens.length, enviados, invalidos: invalidos.length };
}

exports.enviarPushAdmin = onCall({ region: 'us-central1' }, async (request) => {
  const email = (request.auth?.token?.email || '').toLowerCase();
  if (!BOOTSTRAP_ADMINS.includes(email)) {
    throw new HttpsError('permission-denied', 'No autorizado.');
  }
  const db        = admin.firestore();
  const messaging = admin.messaging();

  const title = (request.data?.title || '🔔 Prueba admin').toString();
  const body  = (request.data?.body  || 'Notificaciones push del panel funcionando.').toString();
  const url   = (request.data?.url   || '/admin/').toString();
  const tag   = (request.data?.tag   || 'admin-test').toString();

  try {
    const res = await dispatchAdminPush(db, messaging, { title, body, url, tag });
    return { ok: true, ...res };
  } catch (e) {
    logger.error('[enviarPushAdmin] error:', e);
    throw new HttpsError('internal', e.message || 'Error interno');
  }
});

exports.dispatchAdminPush = dispatchAdminPush;
