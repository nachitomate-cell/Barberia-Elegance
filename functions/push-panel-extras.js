'use strict';

// functions/push-panel-extras.js
// ─────────────────────────────────────────────────────────────────
//  PUSH EXTRAS DEL PANEL (gestion-interna) — todos los locales
//
//  1) RESEÑA NUEVA EN GOOGLE → push a admins/jefes.
//     Trigger sobre settings/googleReviews: cuando el sync diario (o el
//     manual) sube `totalReviews`, hay reseña nueva. Si la más reciente
//     es ≤3 estrellas el copy pide responderla pronto — contestar rápido
//     una mala reseña es lo que más pesa en Maps.
//     No toca google-reviews-sync.js: el trigger observa el doc que ese
//     sync ya escribe, así también cubre el sync manual del superadmin.
//
//  2) CAJA SIN CERRAR → cron 22:00 Santiago. Si quedó una sesión de
//     caja_sesiones con estado='abierta', push a admins/jefes para
//     hacer el arqueo antes de terminar el día.
//
//  Piloto delnero 2026-08-02 → rollout general 2026-08-03 (todos los
//  tenants vía listaTenants; elegance raíz con su trigger gemelo).
//
//  DEPLOY:
//    firebase deploy --only functions:pushResenaNueva,functions:pushResenaNuevaElegance,functions:pushCajaSinCerrar
// ─────────────────────────────────────────────────────────────────

const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { onSchedule }        = require('firebase-functions/v2/scheduler');
const { logger }            = require('firebase-functions');
const admin                 = require('firebase-admin');
const { writeNotifLog }     = require('./lib/notif-log');
const { TIMEZONE, listaTenants, rootDe, tokensAdmins, enviarPushStaff } = require('./lib/push-staff');

const db = admin.firestore();

const fmtCLP = v => '$' + Math.round(Number(v) || 0).toLocaleString('es-CL');

// ═══ 1) RESEÑA NUEVA EN GOOGLE ══════════════════════════════════════

async function avisarResenaNueva(tid, before, after) {
  if (typeof before?.totalReviews !== 'number' || typeof after?.totalReviews !== 'number') return;
  const delta = after.totalReviews - before.totalReviews;
  if (delta <= 0) return;

  // La más reciente queda primera (el sync ordena por fecha desc vía legacy).
  const nueva  = Array.isArray(after.reviews) && after.reviews[0] ? after.reviews[0] : null;
  const rating = typeof nueva?.rating === 'number' ? nueva.rating : null;
  const esMala = rating !== null && rating <= 3;

  const title = esMala
    ? `⭐ Reseña de ${rating} estrella${rating === 1 ? '' : 's'} — respóndela pronto`
    : (delta === 1 ? '⭐ ¡Nueva reseña en Google!' : `⭐ ${delta} reseñas nuevas en Google`);
  const texto = String(nueva?.text || '').trim();
  const body  = nueva
    ? `${nueva.author || 'Un cliente'}${texto ? `: “${texto.slice(0, 80)}${texto.length > 80 ? '…' : ''}”` : ' dejó una reseña.'}`
    : `Tu local llegó a ${after.totalReviews} opiniones (promedio ${after.rating ?? '—'}).`;

  const tokens = await tokensAdmins(rootDe(tid));
  if (!tokens.length) { logger.info(`[push-resena] ${tid}: sin tokens admin, sin aviso`); return; }

  const link = '/gestion-interna/resenas';
  const r = await enviarPushStaff({ tokens, title, body, link, tag: `resena-${tid}-${after.totalReviews}` });
  await writeNotifLog(db, {
    tenantId: tid, type: 'push_resena_nueva', channel: 'push',
    status: r.successCount ? 'sent' : 'failed',
    meta: { delta: String(delta), rating: String(rating ?? ''), total: String(after.totalReviews) },
  });
  logger.info(`[push-resena] ${tid}: +${delta} reseña(s), rating nueva=${rating ?? '?'} → ${r.successCount}/${tokens.length} push`);
}

exports.pushResenaNueva = onDocumentUpdated('tenants/{tenantId}/settings/{docId}', async (event) => {
  const { tenantId, docId } = event.params;
  if (docId !== 'googleReviews') return;
  try {
    await avisarResenaNueva(tenantId, event.data?.before?.data(), event.data?.after?.data());
  } catch (e) { logger.error('[push-resena]', e.message); }
});

// Gemelo para elegance (legacy): su settings/googleReviews vive en la raíz.
exports.pushResenaNuevaElegance = onDocumentUpdated('settings/{docId}', async (event) => {
  if (event.params.docId !== 'googleReviews') return;
  try {
    await avisarResenaNueva('elegance', event.data?.before?.data(), event.data?.after?.data());
  } catch (e) { logger.error('[push-resena]', e.message); }
});

// ═══ 2) CAJA SIN CERRAR (cron 22:00) ════════════════════════════════

function horaSantiago(ts) {
  const d = ts?.toDate ? ts.toDate() : null;
  if (!d) return '';
  return new Intl.DateTimeFormat('es-CL', {
    timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(d);
}

async function avisarCajasAbiertas({ dryRun = false } = {}) {
  const resumen = [];
  for (const { id: tid, root } of await listaTenants()) {
    // Un tenant con datos raros no puede frenar al resto.
    try {
      const snap = await db.collection(`${root}caja_sesiones`)
        .where('estado', '==', 'abierta').limit(5).get();
      if (snap.empty) continue;

      const s = snap.docs[0].data();
      const quien = s.nombreApertura || s.usuarioApertura || 'el equipo';
      const hora  = horaSantiago(s.fechaApertura);
      const title = '💰 La caja sigue abierta';
      const body  = snap.size === 1
        ? `La abrió ${quien}${hora ? ` a las ${hora}` : ''} con ${fmtCLP(s.montoApertura)}. Haz el arqueo y ciérrala antes de terminar el día.`
        : `Hay ${snap.size} sesiones de caja abiertas. Haz el arqueo y ciérralas antes de terminar el día.`;

      if (dryRun) { resumen.push({ tid, abiertas: snap.size, dryRun: true, title, body }); continue; }
      const tokens = await tokensAdmins(root);
      if (!tokens.length) { logger.info(`[push-caja] ${tid}: caja abierta pero sin tokens admin`); resumen.push({ tid, abiertas: snap.size, enviados: 0 }); continue; }

      const r = await enviarPushStaff({ tokens, title, body, link: '/gestion-interna/caja', tag: `caja-abierta-${tid}` });
      await writeNotifLog(db, {
        tenantId: tid, type: 'push_caja_abierta', channel: 'push',
        status: r.successCount ? 'sent' : 'failed',
        meta: { abiertas: String(snap.size) },
      });
      logger.info(`[push-caja] ${tid}: ${snap.size} abierta(s) → ${r.successCount}/${tokens.length} push`);
      resumen.push({ tid, abiertas: snap.size, enviados: r.successCount });
    } catch (e) {
      logger.error(`[push-caja] ${tid}:`, e.message);
      resumen.push({ tid, error: e.message });
    }
  }
  return resumen;
}

exports.pushCajaSinCerrar = onSchedule(
  { schedule: '0 22 * * *', timeZone: TIMEZONE, region: 'us-central1', timeoutSeconds: 300 },
  async () => {
    try { await avisarCajasAbiertas(); }
    catch (e) { logger.error('[push-caja]', e.message); throw e; }
  },
);

// Núcleos expuestos para pruebas locales (scripts one-off, no producción).
exports._test = { avisarResenaNueva, avisarCajasAbiertas };
