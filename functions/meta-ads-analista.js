'use strict';

// functions/meta-ads-analista.js
// ─────────────────────────────────────────────────────────────────────────────
//  AGENTE ANALISTA DE META ADS — el vigilante de la campaña B2B de SynapTech.
//
//  Cada mañana lee la Marketing API de Meta (campañas → conjuntos → anuncios),
//  cruza el gasto con el FUNNEL REAL (chats activados por el bot de ventas y
//  reuniones capturadas en wa_ventas_leads — dato que el Ads Manager no tiene),
//  se lo pasa a Claude y le manda a Ignacio el análisis por WhatsApp (chat
//  consigo mismo, misma vía que los avisos de leads).
//
//    · metaAdsAnalisis        onSchedule 09:30 Chile, diario. Lunes = repaso
//                             semanal más profundo (lo decide el prompt).
//    · metaAdsAnalisisManual  onCall (operadores) — análisis a demanda desde
//                             ops o cuando Ignacio lo pida.
//
//  Config SIN deploy en _system/meta_ads:
//    { adAccountId: 'act_XXXX', activo: true, benchmarkConversacionClp: 1850,
//      presupuestoDiaClp: 5000 }
//  Token en secret META_ADS_TOKEN (user token con ads_read, ~60 días: si Meta
//  devuelve error de auth, el agente avisa por WhatsApp que hay que renovarlo).
// ─────────────────────────────────────────────────────────────────────────────

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onSchedule }         = require('firebase-functions/v2/scheduler');
const { defineSecret }       = require('firebase-functions/params');
const { logger }             = require('firebase-functions');
const admin                  = require('firebase-admin');
const { FieldValue }         = require('firebase-admin/firestore');
const Anthropic              = require('@anthropic-ai/sdk');

const { crearCliente }            = require('./evolution/client');
const { esOperador }              = require('./lib/operadores');
const { logAiUsage }              = require('./lib/metrics');
const { puedeGastar }             = require('./lib/ai-presupuesto');
const { _ahoraChile: ahoraChile } = require('./chat-horas-disponibles');

const db = admin.firestore();

const META_ADS_TOKEN          = defineSecret('META_ADS_TOKEN');
const EVOLUTION_API_URL       = defineSecret('EVOLUTION_API_URL');
const EVOLUTION_API_KEY       = defineSecret('EVOLUTION_API_KEY');
const ANTHROPIC_API_KEY       = defineSecret('ANTHROPIC_API_KEY');
const SECRETS = [META_ADS_TOKEN, EVOLUTION_API_URL, EVOLUTION_API_KEY, ANTHROPIC_API_KEY];

const GRAPH = 'https://graph.facebook.com/v21.0';
const MODEL = 'claude-sonnet-5';
const WHATSAPP_IGNACIO = '56983568212';
const INSTANCIA_AVISOS = 'instance_plat_ventas';   // el chip de ventas ya vinculado

/* ─────────────────────────── Meta Marketing API ─────────────────────────── */

async function graphGet(path, params, token) {
  const url = new URL(`${GRAPH}/${path}`);
  Object.entries(params || {}).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  url.searchParams.set('access_token', token);
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const e = data.error || {};
    const err = new Error(`Meta ${path}: ${e.message || res.status}`);
    err.esAuth = e.code === 190 || e.type === 'OAuthException';
    throw err;
  }
  return data;
}

// Extrae del array `actions` la métrica de conversaciones de mensajería.
// La cuenta de Ignacio reporta `total_messaging_connection` (verificado con
// data real 2026-08-02); `messaging_conversation_started_7d` queda primero
// por si Meta cambia el objetivo de la campaña.
function conversacionesDe(row) {
  const acts = row.actions || [];
  const find = (s) => acts.find(x => String(x.action_type || '').includes(s));
  const a = find('messaging_conversation_started') || find('total_messaging_connection');
  return a ? Number(a.value) || 0 : 0;
}

function resumenFila(row) {
  const spend = Number(row.spend) || 0;
  const convs = conversacionesDe(row);
  return {
    nombre:      row.ad_name || row.adset_name || row.campaign_name || '(sin nombre)',
    campana:     row.campaign_name || '',
    conjunto:    row.adset_name || '',
    gasto:       Math.round(spend),
    impresiones: Number(row.impressions) || 0,
    alcance:     Number(row.reach) || 0,
    clicks:      Number(row.clicks) || 0,
    ctr:         Number(row.ctr) || 0,
    cpm:         Math.round(Number(row.cpm) || 0),
    frecuencia:  Number(row.frequency) || 0,
    conversaciones: convs,
    costoPorConversacion: convs > 0 ? Math.round(spend / convs) : null,
    fecha: row.date_start || null,
  };
}

/** Lee insights en 3 niveles + serie diaria de los últimos 14 días. */
async function leerMeta(adAccountId, token) {
  const FIELDS = 'campaign_name,adset_name,ad_name,spend,impressions,reach,clicks,ctr,cpm,frequency,actions';
  const base = `${adAccountId}/insights`;

  const [c7, c7prev, anuncios7, conjuntos7, serie14, ayer] = await Promise.all([
    graphGet(base, { level: 'campaign', fields: FIELDS, date_preset: 'last_7d' }, token),
    // Semana anterior para la comparación (14→8 días atrás).
    graphGet(base, { level: 'campaign', fields: FIELDS, time_range: JSON.stringify(_rango(14, 8)) }, token),
    graphGet(base, { level: 'ad',      fields: FIELDS, date_preset: 'last_7d' }, token),
    graphGet(base, { level: 'adset',   fields: FIELDS, date_preset: 'last_7d' }, token),
    graphGet(base, { level: 'account', fields: 'spend,impressions,clicks,actions', date_preset: 'last_14d', time_increment: 1 }, token),
    graphGet(base, { level: 'campaign', fields: FIELDS, date_preset: 'yesterday' }, token),
  ]);

  return {
    campanas7:    (c7.data || []).map(resumenFila),
    campanasPrev: (c7prev.data || []).map(resumenFila),
    conjuntos7:   (conjuntos7.data || []).map(resumenFila),
    anuncios7:    (anuncios7.data || []).map(resumenFila),
    ayer:         (ayer.data || []).map(resumenFila),
    serieDiaria:  (serie14.data || []).map(r => ({
      fecha: r.date_start,
      gasto: Math.round(Number(r.spend) || 0),
      clicks: Number(r.clicks) || 0,
      conversaciones: conversacionesDe(r),
    })),
  };
}

function _rango(desdeDias, hastaDias) {
  const d = (n) => {
    const t = new Date(Date.now() - n * 86400e3);
    return t.toISOString().slice(0, 10);
  };
  return { since: d(desdeDias), until: d(hastaDias) };
}

/* ──────────────── Funnel real: lo que Meta no sabe ────────────────
   Chats del bot activados y reuniones capturadas en los últimos 7 días.
   Es la mitad del análisis: $X gastados → N conversaciones (Meta) →
   M chats reales con el bot → R reuniones pedidas. */
async function leerFunnelReal() {
  const hace7 = Date.now() - 7 * 86400e3;
  const [convsSnap, leadsSnap] = await Promise.all([
    db.collection('wa_ventas_conversaciones').where('activado', '==', true).get(),
    db.collection('wa_ventas_leads').get(),
  ]);
  const chats7 = convsSnap.docs.filter(d => (d.data().updatedAt?.toMillis?.() || 0) >= hace7).length;
  const leads = leadsSnap.docs.map(d => d.data());
  const leads7 = leads.filter(l => (l.updatedAt?.toMillis?.() || 0) >= hace7);
  return {
    chatsActivados7d: chats7,
    chatsActivadosTotal: convsSnap.size,
    reuniones7d: leads7.length,
    reunionesPorEstado: leads7.reduce((acc, l) => {
      acc[l.estado || 'reunion_solicitada'] = (acc[l.estado || 'reunion_solicitada'] || 0) + 1;
      return acc;
    }, {}),
  };
}

/* ─────────────────────────── El análisis (Claude) ─────────────────────────── */

const SYSTEM_ANALISTA = `Eres el analista de marketing de SynapTech (SaaS chileno de agenda online para barberías y salones). Analizas la campaña de Meta Ads B2B cuyo objetivo son conversaciones de WhatsApp con dueños de negocios.

Escribes UN reporte para Ignacio (el fundador) que se envía por WhatsApp. Formato:
· Máximo ~1800 caracteres. Español chileno cercano pero profesional.
· Parte con un veredicto en una línea (🟢 bien / 🟡 atención / 🔴 problema).
· Números clave con contexto ("$1.412/conversación, 24% bajo tu benchmark de $1.850").
· El FUNNEL COMPLETO cuando haya datos: gasto → conversaciones Meta → chats reales con el bot → reuniones pedidas, con costo por etapa. Si Meta reporta más conversaciones que chats reales del bot, dilo: es gente que escribió y no dijo el gatillo, o conversaciones fantasma.
· 2-3 recomendaciones CONCRETAS y accionables (pausar/escalar/renovar creativo/ajustar puja). Nada genérico.
· Señales de fatiga: frecuencia >2,5 con CTR cayendo = creativo gastado.
· Si es lunes, agrega mirada semanal: mejor/peor ángulo, tendencia, y qué probar esta semana.
· Sin saludos largos ni despedidas. Directo al grano. Formato WhatsApp: *negritas* con asteriscos, guiones para listas.`;

async function generarAnalisis({ metaData, funnel, cfg, anthropicKey, esLunes }) {
  const client = new Anthropic({ apiKey: anthropicKey });
  const contexto = {
    benchmarkCostoPorConversacionClp: Number(cfg.benchmarkConversacionClp) || 1850,
    presupuestoDiarioClp: Number(cfg.presupuestoDiaClp) || 5000,
    esLunes,
    meta: metaData,
    funnelRealBotVentas: funnel,
  };
  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 1200,
    system: SYSTEM_ANALISTA,
    messages: [{
      role: 'user',
      content: `Datos de la campaña (moneda CLP). Genera el reporte:\n\`\`\`json\n${JSON.stringify(contexto)}\n\`\`\``,
    }],
  });
  logAiUsage(MODEL, resp.usage || {}, 'meta_ads').catch(() => {});
  return resp.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
}

/* ─────────────────────────── Núcleo del agente ─────────────────────────── */

async function correrAnalisis({ manual = false } = {}) {
  const cfg = (await db.doc('_system/meta_ads').get()).data() || {};
  if (cfg.activo === false) { logger.info('[meta-ads] agente apagado (_system/meta_ads.activo=false)'); return { ok: false, motivo: 'apagado' }; }
  const adAccountId = String(cfg.adAccountId || '').trim();
  if (!adAccountId) throw new Error('Falta _system/meta_ads.adAccountId (formato act_XXXX)');

  const evo = crearCliente({ baseUrl: EVOLUTION_API_URL.value(), apiKey: EVOLUTION_API_KEY.value() });
  const avisar = (txt) => evo.enviarTexto(INSTANCIA_AVISOS, WHATSAPP_IGNACIO, txt)
    .catch(e => logger.error('[meta-ads] no pude avisar por WhatsApp:', e.message));

  let metaData;
  try {
    metaData = await leerMeta(adAccountId, META_ADS_TOKEN.value());
  } catch (e) {
    logger.error('[meta-ads] Meta API:', e.message);
    if (e.esAuth) {
      await avisar('⚠️ *Analista Meta Ads*: el token venció o perdió permisos. Genera uno nuevo (ads_read) y avísale a Claude para renovarlo.');
    } else if (manual) {
      throw new HttpsError('internal', `Meta API: ${e.message}`);
    }
    return { ok: false, motivo: e.message };
  }

  const gasto = await puedeGastar('meta_ads');
  if (!gasto.ok) { logger.warn('[meta-ads] presupuesto IA agotado:', gasto.motivo); return { ok: false, motivo: 'presupuesto-ia' }; }

  const funnel  = await leerFunnelReal().catch(e => { logger.warn('[meta-ads] funnel:', e.message); return null; });
  const now     = ahoraChile();
  const esLunes = new Date(now.fecha + 'T12:00:00').getDay() === 1;

  const reporte = await generarAnalisis({
    metaData, funnel, cfg, anthropicKey: ANTHROPIC_API_KEY.value(), esLunes,
  });

  await avisar(`📈 *Analista Meta Ads · ${now.fecha}*\n\n${reporte}`);
  // Histórico consultable (ops / futuras comparaciones del propio agente).
  await db.doc(`_metrics/meta_ads_reporte_${now.fecha}`).set({
    fecha: now.fecha, reporte, metaData, funnel,
    generadoEn: FieldValue.serverTimestamp(),
  }).catch(() => {});

  logger.info(`[meta-ads] reporte ${now.fecha} enviado (${reporte.length} chars)`);
  return { ok: true, fecha: now.fecha, reporte };
}

/* ─────────────────────────── Triggers ─────────────────────────── */

exports.metaAdsAnalisis = onSchedule({
  schedule: '30 9 * * *',
  timeZone: 'America/Santiago',
  region:   'us-central1',
  secrets:  SECRETS,
  timeoutSeconds: 180,
}, async () => {
  try { await correrAnalisis(); }
  catch (e) { logger.error('[meta-ads] cron:', e.message); }
});

exports.metaAdsAnalisisManual = onCall({
  region: 'us-central1', cors: true, secrets: SECRETS, timeoutSeconds: 180,
}, async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Inicia sesión.');
  if (!esOperador(String(req.auth.token?.email || '').toLowerCase())) {
    throw new HttpsError('permission-denied', 'Solo operadores.');
  }
  return await correrAnalisis({ manual: true });
});
