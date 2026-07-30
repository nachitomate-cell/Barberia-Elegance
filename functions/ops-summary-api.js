'use strict';

// functions/ops-summary-api.js
// ─────────────────────────────────────────────────────────────────────────────
//  API pública (server-to-server) para el asistente financiero de SynapTech.
//  Resumen de costos operativos e infraestructura.
//
//  Contrato:
//    GET /api/v1/ops-summary
//    Header: Authorization: Bearer <SYNAPTECH_FINANCE_API_KEY>
//
//  Devuelve:
//    · active_locales_count → tenants operativos (_system/{tid})
//    · costs_30d_usd        → agrega _metrics/ai_YYYY-MM-DD + wa_YYYY-MM-DD
//                              de los últimos 30 días (hoy inclusive)
//    · active_trials        → _billing/{tid}.trialFinaliza > now
//
//  Comparte auth con finance-api.js (misma secret SYNAPTECH_FINANCE_API_KEY).
//
//  DEPLOY:
//    firebase deploy --only functions:opsSummaryApi
// ─────────────────────────────────────────────────────────────────────────────

const { onRequest }    = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { logger }       = require('firebase-functions');
const admin            = require('firebase-admin');

const db = admin.firestore();

const SYNAPTECH_FINANCE_API_KEY = defineSecret('SYNAPTECH_FINANCE_API_KEY');

const TIMEZONE = 'America/Santiago';
const WINDOW_DAYS = 30;

// ── Helpers ─────────────────────────────────────────────────────────────────

// YYYY-MM-DD en zona Santiago para una Date dada (evita off-by-one contra UTC).
function ymdSantiago(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const y = parts.find(p => p.type === 'year').value;
  const m = parts.find(p => p.type === 'month').value;
  const d = parts.find(p => p.type === 'day').value;
  return `${y}-${m}-${d}`;
}

// Últimos N días en Santiago (hoy inclusive), como array de 'YYYY-MM-DD'.
function ultimosNDiasSantiago(n) {
  const out = [];
  const now = Date.now();
  for (let i = 0; i < n; i++) {
    out.push(ymdSantiago(new Date(now - i * 86400000)));
  }
  return out;
}

// Días completos (redondeo arriba) entre now y una Date futura. 0 si ya venció.
function diasRestantes(finDate) {
  const diffMs = finDate.getTime() - Date.now();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / 86400000);
}

function eqConstante(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  try {
    return require('crypto').timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

function unauthorized(res, motivo) {
  logger.info(`[opsSummaryApi] 401: ${motivo}`);
  res.set('WWW-Authenticate', 'Bearer realm="synaptech-finance"');
  return res.status(401).json({
    status: 'error',
    error: 'unauthorized',
    message: 'Bearer token requerido o inválido.',
  });
}

// ── Handler ─────────────────────────────────────────────────────────────────

exports.opsSummaryApi = onRequest(
  {
    region: 'us-central1',
    secrets: [SYNAPTECH_FINANCE_API_KEY],
    cors: false,
  },
  async (req, res) => {
    if (req.method !== 'GET') {
      res.set('Allow', 'GET');
      return res.status(405).json({
        status: 'error',
        error: 'method_not_allowed',
        message: 'Solo GET.',
      });
    }

    const auth = String(req.get('Authorization') || req.get('authorization') || '').trim();
    if (!auth.toLowerCase().startsWith('bearer ')) {
      return unauthorized(res, 'sin header Bearer');
    }
    const enviada  = auth.slice(7).trim();
    const esperada = String(SYNAPTECH_FINANCE_API_KEY.value() || '').trim();
    if (!esperada) {
      logger.error('[opsSummaryApi] SYNAPTECH_FINANCE_API_KEY no está configurada');
      return unauthorized(res, 'secret no configurado');
    }
    if (!enviada || !eqConstante(enviada, esperada)) {
      return unauthorized(res, 'token no coincide');
    }

    try {
      const dias    = ultimosNDiasSantiago(WINDOW_DAYS);
      const aiRefs  = dias.map(d => db.doc(`_metrics/ai_${d}`));
      const waRefs  = dias.map(d => db.doc(`_metrics/wa_${d}`));

      // Un solo getAll para las 60 lecturas de métricas + los dos snapshots de
      // negocio → menos round-trips que 60 .get() en paralelo.
      const [metricsSnaps, sysSnap, billSnap] = await Promise.all([
        db.getAll(...aiRefs, ...waRefs),
        db.collection('_system').get(),
        db.collection('_billing').get(),
      ]);

      const aiSnaps = metricsSnaps.slice(0, WINDOW_DAYS);
      const waSnaps = metricsSnaps.slice(WINDOW_DAYS);

      let claudeCostUsd = 0;
      let aiCalls       = 0;
      aiSnaps.forEach(s => {
        if (!s.exists) return;
        const d = s.data() || {};
        claudeCostUsd += Number(d.costUsd)  || 0;
        aiCalls       += Number(d.llamadas) || 0;
      });

      let waMessages = 0;
      waSnaps.forEach(s => {
        if (!s.exists) return;
        const d = s.data() || {};
        waMessages += Number(d.total) || 0;
      });

      let activeLocales = 0;
      sysSnap.forEach(d => {
        const s = d.data() || {};
        const operativo = s.operativo !== false && s.status !== 'suspended';
        if (operativo) activeLocales++;
      });

      // Trials activos: trialFinaliza > ahora. Toleramos Timestamp, string ISO o
      // número (millis) — el admin ya venía convirtiendo con toMillis || parse.
      const now = Date.now();
      const trials = [];
      billSnap.forEach(d => {
        const b = d.data() || {};
        const raw = b.trialFinaliza;
        if (!raw) return;
        const finMs = raw && typeof raw.toMillis === 'function'
          ? raw.toMillis()
          : Date.parse(String(raw));
        if (!Number.isFinite(finMs) || finMs <= now) return;
        const finDate = new Date(finMs);
        trials.push({
          name:           d.id,
          days_remaining: diasRestantes(finDate),
          end_date:       ymdSantiago(finDate),
        });
      });
      trials.sort((a, b) => a.days_remaining - b.days_remaining || a.name.localeCompare(b.name));

      return res.status(200).json({
        status:    'success',
        project:   'synaptech-ops',
        timestamp: new Date().toISOString(),
        active_locales_count: activeLocales,
        costs_30d_usd: {
          claude_cost_usd:         Math.round(claudeCostUsd * 100) / 100,
          whatsapp_messages_count: waMessages,
          ai_calls_count:          aiCalls,
        },
        active_trials: trials,
      });
    } catch (err) {
      logger.error('[opsSummaryApi] error interno', {
        message: err && err.message,
        stack:   err && err.stack,
      });
      return res.status(500).json({
        status: 'error',
        error:  'internal_error',
        message: 'No se pudo consultar el resumen operativo. Intenta más tarde.',
      });
    }
  }
);
