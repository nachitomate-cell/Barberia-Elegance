'use strict';

// functions/lib/metrics.js
// Instrumentación de barbería para el dashboard ops.synaptechspa.cl.
// Contadores diarios planos en _metrics/* (mismo esquema que conexion/SushiPro).

const admin = require('firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');

const db = admin.firestore();

// Precio aprox. por millón de tokens (USD) para estimar costo de Claude.
const PRICE = {
  'claude-haiku-4-5-20251001': { in: 1.0, out: 5.0 },
  'claude-sonnet-4-6':        { in: 3.0, out: 15.0 },
};

const hoy = () => new Date().toISOString().slice(0, 10);
const mes = () => new Date().toISOString().slice(0, 7);

/** Registra un envío de WhatsApp por Evolution (tipo: 'bot' | 'confirmacion'). */
async function logWaSend(tid, tipo, ok) {
  const key = `${tipo}_${ok ? 'ok' : 'fail'}`;
  await Promise.all([
    db.doc(`_metrics/wa_${hoy()}`).set({
      proyecto: 'barberia',
      total: FieldValue.increment(1),
      [key]: FieldValue.increment(1),
      actualizado: FieldValue.serverTimestamp(),
    }, { merge: true }),
    db.doc(`_metrics/wa_vendor_${tid}`).set({
      vendorId: tid,
      [tipo]: FieldValue.increment(1),
      ultimoEnvio: FieldValue.serverTimestamp(),
    }, { merge: true }),
  ]).catch(() => {});
}

/** Registra uso de Claude (tokens + costo estimado). */
// Prompt caching (2026-07): input_tokens ya NO incluye lo cacheado — la API
// reporta aparte cache_creation (se cobra 1.25× el precio de entrada) y
// cache_read (0.1×). Sin estos términos la métrica subcontaría el costo real.
async function logAiUsage(model, inputTokens, outputTokens, cacheWriteTokens = 0, cacheReadTokens = 0, tid = null) {
  const p = PRICE[model] || { in: 1, out: 5 };
  const costUsd =
    (inputTokens / 1e6) * p.in +
    (outputTokens / 1e6) * p.out +
    (cacheWriteTokens / 1e6) * p.in * 1.25 +
    (cacheReadTokens / 1e6) * p.in * 0.1;
  const writes = [
    db.doc(`_metrics/ai_${hoy()}`).set({
      proyecto: 'barberia',
      llamadas: FieldValue.increment(1),
      tokensIn: FieldValue.increment(inputTokens),
      tokensOut: FieldValue.increment(outputTokens),
      tokensCacheWrite: FieldValue.increment(cacheWriteTokens),
      tokensCacheRead: FieldValue.increment(cacheReadTokens),
      costUsd: FieldValue.increment(costUsd),
      actualizado: FieldValue.serverTimestamp(),
    }, { merge: true }),
  ];
  // Desglose MENSUAL por tenant (para ops: cuánto cuesta cada local — clave
  // en trials tipo Kronnos y para pricing del add-on).
  if (tid) {
    writes.push(db.doc(`_metrics/ai_vendor_${tid}_${mes()}`).set({
      vendorId: tid,
      mes: mes(),
      llamadas: FieldValue.increment(1),
      tokensIn: FieldValue.increment(inputTokens),
      tokensOut: FieldValue.increment(outputTokens),
      costUsd: FieldValue.increment(costUsd),
      actualizado: FieldValue.serverTimestamp(),
    }, { merge: true }));
  }
  await Promise.all(writes).catch(() => {});
}

/** Eventos de negocio del bot por tenant/mes (el ROI que ve ops):
 *  'agendada' (cita creada por el bot) · 'cancelada' (cancelada vía bot) ·
 *  'conf_si' / 'conf_no' (respuesta CONFIRMAR / CANCELAR a la confirmación). */
async function logBotNegocio(tid, evento) {
  if (!tid || !evento) return;
  await db.doc(`_metrics/bot_${tid}_${mes()}`).set({
    vendorId: tid,
    mes: mes(),
    [evento]: FieldValue.increment(1),
    actualizado: FieldValue.serverTimestamp(),
  }, { merge: true }).catch(() => {});
}

module.exports = { logWaSend, logAiUsage, logBotNegocio };
