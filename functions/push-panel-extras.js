'use strict';

// functions/push-panel-extras.js
// ─────────────────────────────────────────────────────────────────
//  PUSH EXTRAS DEL PANEL (gestion-interna) — PILOTO delnero
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
//  PILOTO: gateado a TENANTS_PILOTO (delnero, sandbox oficial). Para
//  abrirlo a todos: quitar el gate y agregar la variante elegance raíz.
//
//  DEPLOY:
//    firebase deploy --only functions:pushResenaNueva,functions:pushCajaSinCerrar
// ─────────────────────────────────────────────────────────────────

const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { onSchedule }        = require('firebase-functions/v2/scheduler');
const { logger }            = require('firebase-functions');
const admin                 = require('firebase-admin');
const { writeNotifLog }     = require('./lib/notif-log');
const { TIMEZONE, tokensAdmins, enviarPushStaff } = require('./lib/push-staff');

const db = admin.firestore();

const TENANTS_PILOTO = [{ id: 'delnero', root: 'tenants/delnero/' }];
const ES_PILOTO = new Set(TENANTS_PILOTO.map(t => t.id));

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

  const tokens = await tokensAdmins(`tenants/${tid}/`);
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
  if (docId !== 'googleReviews' || !ES_PILOTO.has(tenantId)) return;
  try {
    await avisarResenaNueva(tenantId, event.data?.before?.data(), event.data?.after?.data());
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
  for (const { id: tid, root } of TENANTS_PILOTO) {
    const snap = await db.collection(`${root}caja_sesiones`)
      .where('estado', '==', 'abierta').limit(5).get();
    if (snap.empty) { resumen.push({ tid, abiertas: 0 }); continue; }

    const s = snap.docs[0].data();
    const quien = s.nombreApertura || s.usuarioApertura || 'el equipo';
    const hora  = horaSantiago(s.fechaApertura);
    const title = '💰 La caja sigue abierta';
    const body  = snap.size === 1
      ? `La abrió ${quien}${hora ? ` a las ${hora}` : ''} con ${fmtCLP(s.montoApertura)}. Haz el arqueo y ciérrala antes de terminar el día.`
      : `Hay ${snap.size} sesiones de caja abiertas. Haz el arqueo y ciérralas antes de terminar el día.`;

    const tokens = dryRun ? [] : await tokensAdmins(root);
    if (dryRun) { resumen.push({ tid, abiertas: snap.size, dryRun: true, title, body }); continue; }
    if (!tokens.length) { logger.info(`[push-caja] ${tid}: caja abierta pero sin tokens admin`); resumen.push({ tid, abiertas: snap.size, enviados: 0 }); continue; }

    const r = await enviarPushStaff({ tokens, title, body, link: '/gestion-interna/caja', tag: `caja-abierta-${tid}` });
    await writeNotifLog(db, {
      tenantId: tid, type: 'push_caja_abierta', channel: 'push',
      status: r.successCount ? 'sent' : 'failed',
      meta: { abiertas: String(snap.size) },
    });
    logger.info(`[push-caja] ${tid}: ${snap.size} abierta(s) → ${r.successCount}/${tokens.length} push`);
    resumen.push({ tid, abiertas: snap.size, enviados: r.successCount });
  }
  return resumen;
}

exports.pushCajaSinCerrar = onSchedule(
  { schedule: '0 22 * * *', timeZone: TIMEZONE, region: 'us-central1' },
  async () => {
    try { await avisarCajasAbiertas(); }
    catch (e) { logger.error('[push-caja]', e.message); throw e; }
  },
);

// Núcleos expuestos para pruebas locales (scripts one-off, no producción).
exports._test = { avisarResenaNueva, avisarCajasAbiertas };
