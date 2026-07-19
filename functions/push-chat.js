'use strict';

// functions/push-chat.js
// ─────────────────────────────────────────────────────────────────
//  NOTIFICACIONES PUSH DEL CHAT / MENSAJES DIRECTOS
//
//  Dispara en cada mensaje nuevo del chat en tiempo real:
//    chats/{userId}/messages/{msgId}                 (elegance)
//    tenants/{tid}/chats/{userId}/messages/{msgId}   (resto de tenants)
//
//  Dos direcciones según el campo `sender`:
//    - sender === 'admin'  → push AL CLIENTE (userId == uid del cliente).
//      Lo manda el panel /gestion-interna/mensajes al responder.
//    - sender === 'user'   → push A LOS ADMINS / JEFES.
//      Lo manda el cliente desde su dashboard.
//
//  Tokens:
//    - Cliente: fcm_tokens where userId == uid AND activo == true.
//    - Admins : barberos con rol jefe/admin → sus uids → fcm_tokens activos.
//      (misma lógica que getTokensActivos en index.js, sin filtro de barbero)
//
//  Tokens muertos se autodesactivan (activo:false) en cada envío.
//
//  DEPLOY:
//    firebase deploy --only \
//      functions:pushChatMsgElegance,functions:pushChatMsgTenant
// ─────────────────────────────────────────────────────────────────

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { logger }            = require('firebase-functions');
const admin                 = require('firebase-admin');

const db        = admin.firestore();
const messaging = admin.messaging();

function fcmTokensCol(tenantId) {
  return db.collection(tenantId === 'elegance' ? 'fcm_tokens' : `tenants/${tenantId}/fcm_tokens`);
}
function barberosCol(tenantId) {
  return db.collection(tenantId === 'elegance' ? 'barberos' : `tenants/${tenantId}/barberos`);
}
function chatDocRef(tenantId, userId) {
  return tenantId === 'elegance'
    ? db.collection('chats').doc(userId)
    : db.collection('tenants').doc(tenantId).collection('chats').doc(userId);
}

// ── Tokens del CLIENTE (por uid) ─────────────────────────────────
async function tokensCliente(tenantId, uid) {
  if (!uid) return [];
  try {
    const snap = await fcmTokensCol(tenantId)
      .where('userId', '==', uid)
      .where('activo', '==', true)
      .get();
    return snap.docs.map(d => ({ id: d.id, token: d.data().token })).filter(t => t.token);
  } catch (e) {
    logger.warn(`[ChatPush] tokensCliente ${tenantId}/${uid} error:`, e.message);
    return [];
  }
}

// ── Tokens de ADMINS / JEFES ─────────────────────────────────────
async function tokensAdmins(tenantId) {
  try {
    const [barberosSnap, tokensSnap] = await Promise.all([
      barberosCol(tenantId).get(),
      fcmTokensCol(tenantId).where('activo', '==', true).get(),
    ]);

    const validUids = new Set();
    barberosSnap.forEach(docSnap => {
      const b = docSnap.data();
      if (b.activo === false) return;
      if (b.rol === 'admin') {
        validUids.add(docSnap.id);
        if (b.uid) validUids.add(b.uid);
      }
    });

    const seen = new Set();
    const out  = [];
    tokensSnap.forEach(d => {
      const data = d.data();
      if (validUids.has(data.uid) && data.token && !seen.has(data.token)) {
        seen.add(data.token);
        out.push({ id: d.id, token: data.token });
      }
    });
    return out;
  } catch (e) {
    logger.warn(`[ChatPush] tokensAdmins ${tenantId} error:`, e.message);
    return [];
  }
}

// ── Envío genérico + limpieza de tokens muertos ──────────────────
async function enviar(tenantId, tokens, { title, body, data = {}, link, icon }) {
  if (!tokens.length) return 0;

  const base = {
    notification: { title, body },
    data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
    webpush: {
      headers: { Urgency: 'high' },
      notification: {
        title, body,
        icon:     icon || undefined,
        badge:    icon || undefined,
        vibrate:  [200, 100, 200],
        tag:      'chat-mensaje',
        renotify: true,
      },
      fcmOptions: link ? { link } : undefined,
    },
  };

  const responses = await Promise.allSettled(
    tokens.map(t => messaging.send({ ...base, token: t.token }))
  );

  const invalidos = [];
  responses.forEach((r, i) => {
    if (r.status === 'rejected') {
      const code = r.reason?.errorInfo?.code || '';
      if (code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token' ||
          code === 'messaging/invalid-argument') {
        invalidos.push(tokens[i].id);
      }
    }
  });
  if (invalidos.length) {
    const batch = db.batch();
    invalidos.forEach(id => batch.update(fcmTokensCol(tenantId).doc(id), { activo: false }));
    await batch.commit().catch(() => {});
  }

  const exitos = responses.filter(r => r.status === 'fulfilled').length;
  logger.info(`[ChatPush] ${tenantId}: ${exitos}/${tokens.length} enviados. ${invalidos.length} desactivados.`);
  return exitos;
}

// ── Lógica principal de un mensaje nuevo ─────────────────────────
async function notifMensaje(tenantId, userId, msg) {
  const sender = msg?.sender;
  const text   = (msg?.text || '').trim();
  // Mensajes de solo imagen (composer de fotos de /chat): notificar igual.
  if (!text && !msg?.imageUrl) return;
  const base = text || '📷 Foto';

  // Recorta el cuerpo de la notificación
  const preview = base.length > 120 ? base.slice(0, 117) + '…' : base;

  if (sender === 'admin') {
    // Admin respondió → avisar al cliente (userId == uid del cliente)
    const tokens = await tokensCliente(tenantId, userId);
    await enviar(tenantId, tokens, {
      title: '💬 Nuevo mensaje',
      body:  preview,
      data:  { type: 'chat', sender: 'admin' },
    });
    return;
  }

  if (sender === 'user') {
    // Cliente escribió → avisar a los admins/jefes
    let nombre = 'Cliente';
    try {
      const chatSnap = await chatDocRef(tenantId, userId).get();
      const c = chatSnap.data() || {};
      nombre = c.userName || c.userEmail || 'Cliente';
    } catch (_) { /* usa el genérico */ }

    const tokens = await tokensAdmins(tenantId);
    await enviar(tenantId, tokens, {
      title: `💬 ${nombre}`,
      body:  preview,
      data:  { type: 'chat', sender: 'user', userId },
      link:  '/gestion-interna/mensajes',
      icon:  '/gestion-interna/pwa-192.png',
    });
  }
}

// ── Triggers ─────────────────────────────────────────────────────
exports.pushChatMsgElegance = onDocumentCreated('chats/{userId}/messages/{msgId}', async (event) => {
  const msg = event.data?.data();
  if (!msg) return null;
  try { await notifMensaje('elegance', event.params.userId, msg); }
  catch (e) { logger.error(`[ChatPush] elegance/${event.params.userId}:`, e); }
  return null;
});

exports.pushChatMsgTenant = onDocumentCreated('tenants/{tid}/chats/{userId}/messages/{msgId}', async (event) => {
  const msg = event.data?.data();
  if (!msg) return null;
  try { await notifMensaje(event.params.tid, event.params.userId, msg); }
  catch (e) { logger.error(`[ChatPush] ${event.params.tid}/${event.params.userId}:`, e); }
  return null;
});
