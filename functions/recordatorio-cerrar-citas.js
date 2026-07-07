'use strict';

// functions/recordatorio-cerrar-citas.js
// ─────────────────────────────────────────────────────────────────
//  RECORDATORIO PROGRAMADO — CERRAR CITAS DEL DÍA
//
//  Cada VIERNES a las 20:00 hora Chile manda un push a todos los
//  usuarios de gestion-interna (admins) y agenda.html (barberos)
//  recordando marcar sus citas del día como "Completada".
//
//  Cada cita cerrada dispara:
//    - sello automático al cliente (CF sellosTenant)
//    - registro de comisión (CF liquidaciones)
//    - habilitación de reseña Google (pendingGoogleReview)
//
//  Sigue el patrón de broadcast-anuncio.js:
//    - fuente: collectionGroup('fcm_tokens') donde activo == true
//    - audiencia: excluye 'web-cliente'
//    - log: broadcast_campaigns/{id} + recipients/{tokenId}
//
//  Deploy:
//    firebase deploy --only functions:recordatorioCerrarCitasSemanal
// ─────────────────────────────────────────────────────────────────

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { logger }     = require('firebase-functions');
const admin          = require('firebase-admin');

const db        = admin.firestore();
const messaging = admin.messaging();

const TIMEZONE  = 'America/Santiago';

const TITLE = '⏰ Cierra las citas del día';
const BODY  = 'Cada cita marcada como completada suma sello al cliente y comisión para ti. Revisa las pendientes antes de terminar la jornada.';
const LINK  = '/agenda.html';

/** Excluye clientes; incluye admin y agenda. */
function isStaffToken(plataforma) {
  return plataforma !== 'web-cliente';
}

async function enviarRecordatorio() {
  const campaignRef = db.collection('broadcast_campaigns').doc();
  await campaignRef.set({
    title:     TITLE,
    body:      BODY,
    link:      LINK,
    audience:  'all',
    createdBy: 'recordatorioCerrarCitasSemanal (CF)',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    totals:    { tokens: 0, enviados: 0, fallidos: 0 },
    status:    'running',
    scheduled: true,
  });
  logger.info(`[recordatorio-cierre] campaña creada: ${campaignRef.id}`);

  const snap = await db.collectionGroup('fcm_tokens').where('activo', '==', true).get();
  const candidates = snap.docs
    .map(d => ({ id: d.id, ref: d.ref, data: d.data() }))
    .filter(({ data }) => !!data.token && isStaffToken(data.plataforma));

  logger.info(`[recordatorio-cierre] tokens candidatos: ${candidates.length} (de ${snap.size} activos)`);
  await campaignRef.update({ 'totals.tokens': candidates.length });

  if (!candidates.length) {
    await campaignRef.update({
      status:     'done',
      finishedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { enviados: 0, fallidos: 0 };
  }

  const recipientsCol = campaignRef.collection('recipients');
  const invalidos = [];
  let enviados = 0, fallidos = 0;

  for (let i = 0; i < candidates.length; i += 50) {
    const chunk = candidates.slice(i, i + 50);
    await Promise.all(chunk.map(async ({ id, ref, data }) => {
      const tenantId = data.tenantId
        || (ref.path.startsWith('tenants/') ? ref.path.split('/')[1] : 'elegance');
      try {
        await messaging.send({
          token: data.token,
          notification: { title: TITLE, body: BODY },
          data: { tipo: 'broadcast_anuncio', campaignId: campaignRef.id, url: LINK },
          webpush: {
            headers: { Urgency: 'high' },
            notification: {
              icon:     '/icons/icon-192.png',
              badge:    '/icons/icon-192.png',
              tag:      'anuncio-' + campaignRef.id,
              renotify: true,
              vibrate:  [200, 100, 200],
            },
            fcmOptions: { link: LINK },
          },
        });
        enviados++;
        await recipientsCol.add({
          tokenId:    id,
          uid:        data.uid || data.userId || null,
          tenantId,
          plataforma: data.plataforma || null,
          status:     'sent',
          sentAt:     admin.firestore.FieldValue.serverTimestamp(),
        }).catch(() => {});
      } catch (err) {
        fallidos++;
        const code = err.errorInfo?.code || err.code || '';
        if (
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token' ||
          code === 'messaging/invalid-argument'
        ) {
          invalidos.push(ref);
        }
        await recipientsCol.add({
          tokenId:    id,
          uid:        data.uid || data.userId || null,
          tenantId,
          plataforma: data.plataforma || null,
          status:     'failed',
          error:      code || String(err.message || '').slice(0, 200),
          sentAt:     admin.firestore.FieldValue.serverTimestamp(),
        }).catch(() => {});
      }
    }));
  }

  // Desactivar tokens inválidos en batches de 400 (límite de writeBatch: 500).
  for (let i = 0; i < invalidos.length; i += 400) {
    const batch = db.batch();
    invalidos.slice(i, i + 400).forEach(r => batch.update(r, { activo: false }));
    await batch.commit().catch(() => {});
  }

  await campaignRef.update({
    'totals.enviados': enviados,
    'totals.fallidos': fallidos,
    status:     'done',
    finishedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  logger.info(`[recordatorio-cierre] enviados=${enviados}  fallidos=${fallidos}  desactivados=${invalidos.length}  campaign=${campaignRef.id}`);
  return { enviados, fallidos, campaignId: campaignRef.id };
}

// ═══════════════════════════════════════════════════════════════════
//  SCHEDULE: cada VIERNES a las 20:00 hora Chile.
//  Cron: '0 20 * * 5'  (minuto 0, hora 20, día-semana 5 = viernes).
// ═══════════════════════════════════════════════════════════════════
exports.recordatorioCerrarCitasSemanal = onSchedule(
  {
    schedule: '0 20 * * 5',
    timeZone: TIMEZONE,
    region:   'us-central1',
    timeoutSeconds: 300,
    memory:   '512MiB',
  },
  async () => {
    try {
      await enviarRecordatorio();
    } catch (err) {
      logger.error('[recordatorio-cierre] error fatal:', err);
      throw err; // que Cloud Scheduler lo reintenté
    }
  }
);
