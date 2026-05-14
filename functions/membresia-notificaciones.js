'use strict';

// functions/membresia-notificaciones.js
// ─────────────────────────────────────────────────────────────────
//  Notificaciones push para el sistema de membresía de Deluxe Perfumes
//
//  Exports:
//    avisarVencimientoMembresia — cron diario: push 3d antes y en el día
//    notificarNuevoDecant       — callable: admin avisa a miembros premium
//    notificarAnuncioChat       — trigger: nuevo anuncio → push a miembros
//
//  FCM tokens de clientes guardados en:
//    tenants/deluxeperfumes/fcm_clientes/{uid}
//      token: string, activo: boolean, updatedAt: Timestamp
//
//  DEPLOY:
//    firebase deploy --only functions:avisarVencimientoMembresia,functions:notificarNuevoDecant,functions:notificarAnuncioChat
// ─────────────────────────────────────────────────────────────────

const { onSchedule }           = require('firebase-functions/v2/scheduler');
const { onCall, HttpsError }   = require('firebase-functions/v2/https');
const { onDocumentCreated }    = require('firebase-functions/v2/firestore');
const { logger }               = require('firebase-functions');
const admin                    = require('firebase-admin');

const db        = admin.firestore();
const messaging = admin.messaging();

const TENANT_ID      = 'deluxeperfumes';
const BOOTSTRAP_ADMINS = ['ignaciiio.mate@gmail.com'];

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getTokensMiembros(soloPlanes = null) {
  const usersRef  = db.collection('tenants').doc(TENANT_ID).collection('users');
  const tokensRef = db.collection('tenants').doc(TENANT_ID).collection('fcm_clientes');

  let query = usersRef.where('esMiembro', '==', true);
  if (soloPlanes) query = query.where('planMembresia', 'in', soloPlanes);

  const [usersSnap, tokensSnap] = await Promise.all([query.get(), tokensRef.where('activo', '==', true).get()]);

  const ahora = new Date();
  const uidsActivos = new Set(
    usersSnap.docs
      .filter(d => {
        const vence = d.data().fechaVencimientoMembresia?.toDate();
        return vence && vence > ahora;
      })
      .map(d => d.id)
  );

  const tokens = [];
  tokensSnap.docs.forEach(d => {
    if (uidsActivos.has(d.id)) tokens.push(d.data().token);
  });

  return tokens;
}

async function enviarPushMulticast(tokens, title, body, data = {}) {
  if (!tokens.length) {
    logger.info('[FCM Deluxe] Sin tokens. Omitiendo envío.');
    return;
  }

  const TOKEN_ERRORS = new Set([
    'messaging/invalid-registration-token',
    'messaging/registration-token-not-registered',
    'messaging/invalid-argument',
  ]);

  // Firestore multicast máx 500 tokens por request
  for (let i = 0; i < tokens.length; i += 500) {
    const batch = tokens.slice(i, i + 500);
    const msg = {
      notification: { title, body },
      data: { ...data },
      webpush: {
        headers: { Urgency: 'normal' },
        notification: {
          title, body,
          icon:  '/deluxeperfumes.jpg',
          badge: '/icons/icon-192.png',
        },
        fcmOptions: { link: data.url || '/membresia' },
      },
      tokens: batch,
    };

    const response = await messaging.sendEachForMulticast(msg);
    logger.info(`[FCM Deluxe] ${response.successCount} OK, ${response.failureCount} errores`);

    // Desactivar tokens inválidos
    const invalidos = [];
    response.responses.forEach((res, idx) => {
      if (!res.success && TOKEN_ERRORS.has(res.error?.code || '')) invalidos.push(batch[idx]);
    });
    if (invalidos.length) {
      const writeBatch = db.batch();
      invalidos.forEach(t => {
        // Buscar doc por token (necesita índice compuesto o scan local)
        // Simplificación: marcar como inactivo usando el token como doc ID
        writeBatch.set(
          db.collection('tenants').doc(TENANT_ID).collection('fcm_clientes').doc(t),
          { activo: false },
          { merge: true }
        );
      });
      await writeBatch.commit();
    }
  }
}

// ── CRON: verificar vencimientos diariamente ──────────────────────────────────

exports.avisarVencimientoMembresia = onSchedule('0 10 * * *', async () => {
  const ahora  = new Date();
  const en3d   = new Date(ahora.getTime() + 3 * 24 * 60 * 60 * 1000);

  const usersRef = db.collection('tenants').doc(TENANT_ID).collection('users');
  const snap     = await usersRef.where('esMiembro', '==', true).get();

  const vencenHoy = [];
  const vencen3d  = [];

  snap.docs.forEach(d => {
    const vence = d.data().fechaVencimientoMembresia?.toDate();
    if (!vence) return;
    const diffMs  = vence.getTime() - ahora.getTime();
    const diffDias = diffMs / (24 * 60 * 60 * 1000);

    if (diffDias >= 0 && diffDias < 1)   vencenHoy.push(d.id);
    if (diffDias >= 2 && diffDias < 3)   vencen3d.push(d.id);
  });

  const tokensRef = db.collection('tenants').doc(TENANT_ID).collection('fcm_clientes');
  const tokensSnap = await tokensRef.where('activo', '==', true).get();
  const tokensPorUid = {};
  tokensSnap.docs.forEach(d => { tokensPorUid[d.id] = d.data().token; });

  // Push para los que vencen hoy
  const tokensHoy = vencenHoy.map(uid => tokensPorUid[uid]).filter(Boolean);
  if (tokensHoy.length) {
    await enviarPushMulticast(
      tokensHoy,
      '⏰ Tu membresía Club Deluxe venció hoy',
      'Renueva ahora para no perder tus descuentos y el acceso al chat exclusivo.',
      { url: '/membresia' }
    );
    logger.info(`[Cron] Push vencimiento hoy → ${tokensHoy.length} tokens`);
  }

  // Push para los que vencen en 3 días
  const tokens3d = vencen3d.map(uid => tokensPorUid[uid]).filter(Boolean);
  if (tokens3d.length) {
    await enviarPushMulticast(
      tokens3d,
      '🔔 Tu membresía vence en 3 días',
      'Renueva tu Club Deluxe para mantener tus beneficios exclusivos.',
      { url: '/membresia' }
    );
    logger.info(`[Cron] Push vencimiento 3d → ${tokens3d.length} tokens`);
  }
});

// ── CALLABLE: nuevo decant disponible (admin lo activa manualmente) ───────────

exports.notificarNuevoDecant = onCall({ region: 'us-central1' }, async (request) => {
  const email = request.auth?.token?.email || '';
  if (!BOOTSTRAP_ADMINS.includes(email.toLowerCase())) {
    throw new HttpsError('permission-denied', 'Solo administradores pueden enviar esta notificación.');
  }

  const tokens = await getTokensMiembros(['premium']);
  await enviarPushMulticast(
    tokens,
    '🎁 Tu decant del mes ya está listo',
    'Pasa por nuestra tienda a retirar tu decant sorpresa. ¡Te esperamos!',
    { url: '/membresia' }
  );

  logger.info(`[Callable] Notificación decant → ${tokens.length} miembros premium`);
  return { ok: true, enviados: tokens.length };
});

// ── TRIGGER: nuevo anuncio en el chat → push a todos los miembros ─────────────

exports.notificarAnuncioChat = onDocumentCreated(
  `chats/${TENANT_ID}/miembros/{mensajeId}`,
  async (event) => {
    const data = event.data?.data();
    if (!data || data.tipo !== 'anuncio') return null; // Solo anuncios

    const tokens = await getTokensMiembros();
    await enviarPushMulticast(
      tokens,
      '👑 Deluxe tiene novedades',
      data.texto?.slice(0, 100) || 'Hay un nuevo anuncio en el chat exclusivo.',
      { url: '/chat-miembros' }
    );

    logger.info(`[Trigger] Push anuncio chat → ${tokens.length} miembros`);
    return null;
  }
);
