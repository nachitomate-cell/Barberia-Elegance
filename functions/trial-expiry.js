'use strict';

// functions/trial-expiry.js
// ─────────────────────────────────────────────────────────────────────────────
//  TRIAL SELF-SERVICE — vencimiento del período de prueba de 14 días.
//
//  Cron diario que busca tenants con status 'trial' cuyo trialFinaliza ya
//  pasó y los marca 'trial_expired'. Efectos aguas abajo (cada capa lee el
//  status, nada más que hacer aquí):
//    · edge middleware  → agenda pública en pausa suave (fetchSelfTenant
//      también computa el vencimiento por timestamp, así que la pausa rige
//      aunque el cron aún no haya corrido; este flip persiste el estado
//      para el panel y las métricas).
//    · gestion-interna  → TrialGate bloquea el panel y muestra los planes.
//
//  NO toca `estado` ('activo'/'suspendido' = kill switch manual del edge) ni
//  borra nada: activar un plan es volver status→'active' desde /admin.
//
//  La query where('status','==','trial') solo puede devolver tenants
//  self-service/express (los a-medida clásicos no tienen doc raíz), así que
//  no aplica la regla listDocuments() de enumeración global.
//
//  DEPLOY:
//    firebase deploy --only functions:trialExpiryCron
// ─────────────────────────────────────────────────────────────────────────────

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { logger }     = require('firebase-functions');
const admin          = require('firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');

const db = admin.firestore();

exports.trialExpiryCron = onSchedule(
  { schedule: 'every day 03:10', timeZone: 'America/Santiago', region: 'us-central1' },
  async () => {
    const ahora = Date.now();
    const snap = await db.collection('tenants').where('status', '==', 'trial').get();

    let vencidos = 0;
    for (const doc of snap.docs) {
      const fin = doc.data().trialFinaliza;
      const finMs = fin && typeof fin.toMillis === 'function' ? fin.toMillis() : Date.parse(String(fin || ''));
      if (!Number.isFinite(finMs) || finMs > ahora) continue;

      await doc.ref.update({
        status:    'trial_expired',
        updatedAt: FieldValue.serverTimestamp(),
      });
      await db.collection('_billing').doc(doc.id).set({
        estadoPago: 'trial_expirado',
      }, { merge: true });
      vencidos++;
      logger.info(`[trial] vencido: ${doc.id} (finalizaba ${new Date(finMs).toISOString().slice(0, 10)})`);
    }

    logger.info(`[trial] cron: ${snap.size} tenant(s) en trial, ${vencidos} marcado(s) trial_expired`);
  }
);
