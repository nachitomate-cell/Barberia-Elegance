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
async function logAiUsage(model, inputTokens, outputTokens) {
  const p = PRICE[model] || { in: 1, out: 5 };
  const costUsd = (inputTokens / 1e6) * p.in + (outputTokens / 1e6) * p.out;
  await db.doc(`_metrics/ai_${hoy()}`).set({
    proyecto: 'barberia',
    llamadas: FieldValue.increment(1),
    tokensIn: FieldValue.increment(inputTokens),
    tokensOut: FieldValue.increment(outputTokens),
    costUsd: FieldValue.increment(costUsd),
    actualizado: FieldValue.serverTimestamp(),
  }, { merge: true }).catch(() => {});
}

module.exports = { logWaSend, logAiUsage };
