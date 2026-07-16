'use strict';

// functions/ops-metrics.js
// Callable `opsMetrics` para el dashboard ops.synaptechspa.cl.
// Agrega las métricas de barbería (_metrics/*) + los locales activos, y consulta
// server-to-server el resumen de conexion/SushiPro con el OPS_TOKEN. Solo operador.

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret }       = require('firebase-functions/params');
const { logger }             = require('firebase-functions');
const admin                  = require('firebase-admin');

const db = admin.firestore();
const OPS_TOKEN = defineSecret('OPS_TOKEN');

const BOOTSTRAP = ['ignaciiio.mate@gmail.com'];
const CONEXION_URL = 'https://fideliza.synaptechspa.cl/api/metrics/summary';

function ultimosDias(n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(new Date(Date.now() - i * 86400000).toISOString().slice(0, 10));
  return out;
}

exports.opsMetrics = onCall({ region: 'us-central1', cors: true, secrets: [OPS_TOKEN] }, async (req) => {
  const email = String(req.auth?.token?.email || '').toLowerCase();
  if (!req.auth || !BOOTSTRAP.includes(email)) {
    throw new HttpsError('permission-denied', 'Solo el operador de la plataforma.');
  }

  const ds = ultimosDias(30);

  // ── Métricas de barbería ──
  const [waSnaps, aiSnaps] = await Promise.all([
    Promise.all(ds.map((d) => db.doc(`_metrics/wa_${d}`).get())),
    Promise.all(ds.map((d) => db.doc(`_metrics/ai_${d}`).get())),
  ]);
  let mensajes = 0, mensajesOk = 0;
  const porDia = {};
  waSnaps.forEach((s, i) => {
    const d = s.data(); if (!d) return;
    mensajes += Number(d.total) || 0;
    porDia[ds[i]] = Number(d.total) || 0;
    Object.keys(d).forEach((k) => { if (k.endsWith('_ok')) mensajesOk += Number(d[k]) || 0; });
  });
  let costoUsd = 0, tokensIn = 0, tokensOut = 0, llamadas = 0;
  aiSnaps.forEach((s) => {
    const d = s.data(); if (!d) return;
    costoUsd += Number(d.costUsd) || 0;
    tokensIn += Number(d.tokensIn) || 0;
    tokensOut += Number(d.tokensOut) || 0;
    llamadas += Number(d.llamadas) || 0;
  });

  // ── Locales de barbería con canal WhatsApp ──
  const tsnap = await db.collection('tenants').get();
  const tids = new Set(tsnap.docs.map((d) => d.id)); tids.add('elegance');
  const locales = [];
  for (const tid of tids) {
    const wa = (await db.doc(`tenants/${tid}/configuracion/whatsapp`).get()).data();
    if (wa && (wa.estadoConexion === 'connected' || wa.botEnabled === true || wa.confirmacionesEnabled === true)) {
      locales.push({
        id: tid,
        estado: wa.estadoConexion || 'disconnected',
        bot: wa.botEnabled === true,
        conf: wa.confirmacionesEnabled === true,
        numero: wa.numeroVinculado || null,
      });
    }
  }
  const localesActivos = locales.filter((l) => l.estado === 'connected').length;

  const barberia = {
    proyecto: 'barberia', localesActivos, locales,
    mensajes: { total: mensajes, ok: mensajesOk, porDia },
    claude: { costoUsd, tokensIn, tokensOut, llamadas },
    dias: 30,
  };

  // ── Resumen de conexion/SushiPro (server-to-server) ──
  let sushipro = null, sushiError = null;
  try {
    const r = await fetch(CONEXION_URL, { headers: { 'x-ops-token': OPS_TOKEN.value() } });
    if (r.ok) sushipro = await r.json();
    else sushiError = `HTTP ${r.status}`;
  } catch (e) {
    sushiError = e.message;
    logger.warn('[opsMetrics] conexion summary:', e.message);
  }

  const total = {
    localesActivos: barberia.localesActivos + (sushipro?.localesActivos || 0),
    mensajes:       barberia.mensajes.total + (sushipro?.mensajes?.total || 0),
    costoUsd:       barberia.claude.costoUsd + (sushipro?.claude?.costoUsd || 0),
    llamadasIA:     barberia.claude.llamadas + (sushipro?.claude?.llamadas || 0),
  };

  return { total, barberia, sushipro, sushiError, generadoEn: Date.now() };
});
