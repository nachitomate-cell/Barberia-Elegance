'use strict';

// functions/push-liquidacion.js
// ─────────────────────────────────────────────────────────────────────────────
//  PUSH AL BARBERO CUANDO SE REGISTRA SU LIQUIDACIÓN
//
//  El pago queda "Por confirmar" hasta que el barbero lo acepta desde su
//  Inicio — pero nadie mira el panel esperando que le paguen: sin aviso, las
//  liquidaciones se quedaban pendientes días. Trigger sobre gastos con
//  tipo='liquidacion' + aceptacionBarbero='pendiente' (los escribe SOLO el
//  flujo unificado de Comisiones) → push a los dispositivos del barbero.
//
//  Falla-silencioso a propósito: un barbero sin tokens (nunca aceptó push)
//  simplemente no recibe aviso; el banner de su Inicio sigue siendo la red.
// ─────────────────────────────────────────────────────────────────────────────

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { logger }            = require('firebase-functions');
const admin                 = require('firebase-admin');

const db = admin.firestore();

async function avisarLiquidacion(tid, gasto) {
  if (gasto?.tipo !== 'liquidacion' || gasto?.aceptacionBarbero !== 'pendiente') return;
  const barberoId = String(gasto.barberoId || '');
  if (!barberoId) return;

  const root = tid === 'elegance' ? '' : `tenants/${tid}/`;
  const [barbSnap, tokSnap] = await Promise.all([
    db.doc(`${root}barberos/${barberoId}`).get(),
    db.collection(`${root}fcm_tokens`).where('activo', '==', true).get(),
  ]);
  const b = barbSnap.data() || {};
  // El doc del barbero puede ser espejo o canónico: se aceptan todos sus ids.
  const uids = new Set([barberoId, b.uid, b.authUid, b._mainDocId].filter(Boolean));
  const tokens = [];
  tokSnap.forEach((d) => { const t = d.data(); if (uids.has(t.uid) && t.token) tokens.push(t.token); });
  if (!tokens.length) { logger.info(`[push-liq] ${tid}/${barberoId}: sin tokens, sin aviso`); return; }

  const monto = Number(gasto.monto) || 0;
  const r = await admin.messaging().sendEachForMulticast({
    tokens,
    notification: {
      title: '💵 Tu liquidación está lista',
      body:  `$${monto.toLocaleString('es-CL')} del período ${gasto.periodoInicio || ''} al ${gasto.periodoFin || ''}. Entra a tu panel para revisarla y confirmarla.`,
    },
    webpush: { fcmOptions: { link: '/gestion-interna/' }, notification: { tag: `liq-${tid}-${barberoId}` } },
  });
  logger.info(`[push-liq] ${tid}/${gasto.barberoNombre || barberoId}: ${r.successCount}/${tokens.length} push enviados`);
}

exports.pushLiquidacionTenant = onDocumentCreated('tenants/{tenantId}/gastos/{gastoId}', async (event) => {
  try { await avisarLiquidacion(event.params.tenantId, event.data?.data()); }
  catch (e) { logger.error('[push-liq]', e.message); }
});

exports.pushLiquidacionElegance = onDocumentCreated('gastos/{gastoId}', async (event) => {
  try { await avisarLiquidacion('elegance', event.data?.data()); }
  catch (e) { logger.error('[push-liq]', e.message); }
});
