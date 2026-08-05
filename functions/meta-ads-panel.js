'use strict';

// functions/meta-ads-panel.js
// ─────────────────────────────────────────────────────────────────────────────
//  EL EMBUDO DE META ADS, DE PUNTA A PUNTA — el dato que el Ads Manager no tiene.
//
//  Meta sabe lo que gastó y cuántas conversaciones abrió. No sabe si alguna de
//  esas conversaciones terminó en un local pagando. Este módulo junta las dos
//  mitades y las deja masticadas para el panel:
//
//     gasto → conversaciones (Meta) → chats del bot → leads → reuniones
//           → trials creados → clientes pagando
//
//  Por qué importa (auditoría 05-08-2026): la cuenta gastó $124.548 con un
//  costo por conversación SANO ($1.646, bajo el benchmark) y aun así 0 clientes.
//  Mirando solo el Ads Manager la campaña se veía bien. El embudo completo es
//  lo único que muestra dónde se pierde la plata.
//
//  La atribución por anuncio existe gracias al `sourceId` del referido CTWA que
//  guarda evolution/ventas.js (ver lib/ctwa.js): sin píxel, es el único puente
//  entre un anuncio concreto y un lead real.
//
//  El snapshot lo refresca un cron y lo sirve el panel — nadie espera nunca a
//  la Graph API con el navegador abierto.
// ─────────────────────────────────────────────────────────────────────────────

const { logger }     = require('firebase-functions');
const admin          = require('firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');

const db    = admin.firestore();
const GRAPH = 'https://graph.facebook.com/v21.0';

const SNAP_REF = () => db.doc('_metrics/meta_ads_snapshot');

/* ───────────────────────────── Marketing API ───────────────────────────── */

async function graphGet(path, params, token) {
  const url = new URL(`${GRAPH}/${path}`);
  Object.entries(params || {}).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  url.searchParams.set('access_token', token);
  const res  = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const e = data.error || {};
    const err = new Error(`Meta ${path}: ${e.message || res.status}`);
    err.esAuth = e.code === 190 || e.type === 'OAuthException';
    throw err;
  }
  return data;
}

/** Conversaciones de mensajería. Esta cuenta las reporta como
 *  `onsite_conversion.total_messaging_connection` (verificado con data real). */
function conversacionesDe(row) {
  const acts = row.actions || [];
  const exacto = acts.find((x) => x.action_type === 'onsite_conversion.total_messaging_connection');
  if (exacto) return Number(exacto.value) || 0;
  const parcial = acts.find((x) => String(x.action_type || '').includes('messaging_conversation_started'));
  return parcial ? Number(parcial.value) || 0 : 0;
}

function fila(row) {
  const gasto = Math.round(Number(row.spend) || 0);
  const convs = conversacionesDe(row);
  return {
    id:          row.ad_id || row.adset_id || row.campaign_id || null,
    nombre:      row.ad_name || row.adset_name || row.campaign_name || '(sin nombre)',
    campana:     row.campaign_name || '',
    gasto,
    impresiones: Number(row.impressions) || 0,
    alcance:     Number(row.reach) || 0,
    clicks:      Number(row.clicks) || 0,
    ctr:         Math.round((Number(row.ctr) || 0) * 100) / 100,
    cpm:         Math.round(Number(row.cpm) || 0),
    frecuencia:  Math.round((Number(row.frequency) || 0) * 100) / 100,
    conversaciones: convs,
    costoPorConversacion: convs > 0 ? Math.round(gasto / convs) : null,
  };
}

const FIELDS = 'campaign_id,campaign_name,adset_name,ad_id,ad_name,spend,impressions,reach,clicks,ctr,cpm,frequency,actions';

async function leerMeta(adAccountId, token) {
  const base = `${adAccountId}/insights`;
  const [c7, c7prev, anuncios7, serie30, estados] = await Promise.all([
    graphGet(base, { level: 'campaign', fields: FIELDS, date_preset: 'last_7d' }, token),
    graphGet(base, { level: 'campaign', fields: FIELDS, time_range: JSON.stringify(rango(14, 8)) }, token),
    graphGet(base, { level: 'ad',       fields: FIELDS, date_preset: 'last_7d' }, token),
    graphGet(base, { level: 'account',  fields: 'spend,impressions,clicks,actions', date_preset: 'last_30d', time_increment: 1 }, token),
    graphGet(`${adAccountId}/campaigns`, { fields: 'name,effective_status,daily_budget,objective', limit: 50 }, token),
  ]);

  const sum = (rows, campo) => rows.reduce((a, r) => a + (r[campo] || 0), 0);
  const c7f = (c7.data || []).map(fila);
  const prevf = (c7prev.data || []).map(fila);

  const gasto7 = sum(c7f, 'gasto');
  const conv7  = sum(c7f, 'conversaciones');
  const gastoPrev = sum(prevf, 'gasto');
  const convPrev  = sum(prevf, 'conversaciones');

  return {
    campanas7:  c7f,
    anuncios7:  (anuncios7.data || []).map(fila).sort((a, b) => b.gasto - a.gasto),
    estados:    (estados.data || []).map((c) => ({
      nombre: c.name, estado: c.effective_status, objetivo: c.objective,
      presupuestoDia: c.daily_budget ? Math.round(Number(c.daily_budget)) : null,
    })),
    serieDiaria: (serie30.data || []).map((r) => ({
      fecha: r.date_start,
      gasto: Math.round(Number(r.spend) || 0),
      clicks: Number(r.clicks) || 0,
      conversaciones: conversacionesDe(r),
    })),
    resumen7: {
      gasto: gasto7,
      conversaciones: conv7,
      costoPorConversacion: conv7 ? Math.round(gasto7 / conv7) : null,
      impresiones: sum(c7f, 'impresiones'),
      clicks: sum(c7f, 'clicks'),
      // Frecuencia: la MÁXIMA entre campañas, no el promedio. Un promedio
      // diluye justo la campaña que se está quemando, que es la que hay que ver.
      frecuenciaMax: c7f.reduce((m, r) => Math.max(m, r.frecuencia || 0), 0),
      previo: {
        gasto: gastoPrev,
        conversaciones: convPrev,
        costoPorConversacion: convPrev ? Math.round(gastoPrev / convPrev) : null,
      },
    },
    activas: (estados.data || []).filter((c) => c.effective_status === 'ACTIVE').length,
  };
}

function rango(desdeDias, hastaDias) {
  const d = (n) => new Date(Date.now() - n * 86400e3).toISOString().slice(0, 10);
  return { since: d(desdeDias), until: d(hastaDias) };
}

/* ─────────────── El embudo real: lo que vive en nuestra base ─────────────── */

/**
 * Cruza el gasto con lo que realmente pasó: chats del bot, leads, trials y
 * clientes. La ventana es de 7 días para que calce con `resumen7` de Meta.
 */
async function leerEmbudoReal() {
  const hace7 = Date.now() - 7 * 86400e3;
  const ms = (v) => v?.toMillis?.() || 0;

  const [convsSnap, leadsSnap, tenantRefs] = await Promise.all([
    db.collection('wa_ventas_conversaciones').get(),
    db.collection('wa_ventas_leads').get(),
    db.collection('tenants').listDocuments(),
  ]);

  const convs  = convsSnap.docs.map((d) => ({ tel: d.id, ...d.data() }));
  const leads  = leadsSnap.docs.map((d) => ({ tel: d.id, ...d.data() }));
  const convs7 = convs.filter((c) => ms(c.updatedAt) >= hace7);
  const leads7 = leads.filter((l) => ms(l.updatedAt) >= hace7);

  // Tenants nacidos del self-service en la ventana. listDocuments porque los
  // docs padre pueden no existir (regla de la casa).
  const tenants = (await Promise.all(tenantRefs.map(async (r) => {
    const v = (await r.get()).data();
    if (!v || !['self-service', 'admin-express'].includes(v.origen)) return null;
    return {
      id: r.id, status: v.status || null, origen: v.origen,
      creadoEn: ms(v.createdAt) || ms(v.creadoEn) || 0,
      utmSource: v.atribucion?.utm_source || null,
      ref: v.refVendedor || null,
    };
  }))).filter(Boolean);

  const trials7 = tenants.filter((t) => t.creadoEn >= hace7);
  // "De Meta" = el alta trae utm_source de Meta. Los que no lo traen no se
  // cuentan como pagados aunque hayan venido del anuncio: preferimos
  // subestimar la campaña antes que atribuirle altas que no trajo.
  const esMeta = (t) => /meta|facebook|instagram|fb|ig/i.test(String(t.utmSource || ''));

  // Atribución por anuncio: sale del referido CTWA que guarda ventas.js.
  const porAnuncio = {};
  const anota = (sourceId, campo) => {
    if (!sourceId) return;
    porAnuncio[sourceId] = porAnuncio[sourceId] || { chats: 0, leads: 0, reuniones: 0 };
    porAnuncio[sourceId][campo]++;
  };
  convs7.forEach((c) => anota(c.anuncio?.sourceId, 'chats'));
  leads7.forEach((l) => {
    anota(l.anuncio?.sourceId, 'leads');
    if (l.estado === 'reunion_solicitada') anota(l.anuncio?.sourceId, 'reuniones');
  });

  const conAnuncio = convs7.filter((c) => c.anuncio).length;

  return {
    chatsActivados7d:  convs7.filter((c) => c.activado === true).length,
    chatsTotales7d:    convs7.length,
    // Cuántos de los chats de la semana traen referido de anuncio. Antes del
    // arreglo del 05-08 esto era 0 SIEMPRE: el referido no se leía.
    chatsConAnuncio7d: conAnuncio,
    leads7d:           leads7.length,
    reuniones7d:       leads7.filter((l) => l.estado === 'reunion_solicitada').length,
    descartados7d:     leads7.filter((l) => l.estado === 'descartado').length,
    trials7d:          trials7.length,
    trialsDeMeta7d:    trials7.filter(esMeta).length,
    clientesPagando:   tenants.filter((t) => t.status === 'active').length,
    porAnuncio,
    // Histórico, para no perder de vista el acumulado.
    totales: {
      chats: convs.length,
      leads: leads.length,
      reuniones: leads.filter((l) => l.estado === 'reunion_solicitada').length,
      tenantsSelfService: tenants.length,
    },
  };
}

/* ─────────────────────────── Construir el snapshot ─────────────────────────── */

/**
 * Arma el snapshot completo de Meta Ads. Nunca lanza por culpa de Meta: si la
 * Graph API falla, devuelve el embudo real igual y marca el error, porque la
 * mitad nuestra del embudo sigue siendo útil (y es la que revela los problemas).
 */
async function construirSnapshotMetaAds(token) {
  const cfg = (await db.doc('_system/meta_ads').get()).data() || {};
  const adAccountId = String(cfg.adAccountId || '').trim();
  const benchmark   = Number(cfg.benchmarkConversacionClp) || 1850;

  const [embudo, metaRes] = await Promise.all([
    leerEmbudoReal().catch((e) => { logger.warn('[meta-panel] embudo:', e.message); return null; }),
    (async () => {
      if (!adAccountId) return { error: 'Falta _system/meta_ads.adAccountId' };
      if (!token)       return { error: 'Falta el secret META_ADS_TOKEN' };
      try { return await leerMeta(adAccountId, token); }
      catch (e) {
        logger.warn('[meta-panel] Marketing API:', e.message);
        return { error: e.message, esAuth: !!e.esAuth };
      }
    })(),
  ]);

  // Último reporte del analista, para mostrarlo sin ir a buscarlo aparte.
  let ultimoReporte = null;
  try {
    const q = await db.collection('_metrics')
      .where('fecha', '>=', new Date(Date.now() - 8 * 86400e3).toISOString().slice(0, 10))
      .orderBy('fecha', 'desc').limit(1).get();
    const doc = q.docs.find((d) => d.id.startsWith('meta_ads_reporte_'));
    if (doc) ultimoReporte = { fecha: doc.data().fecha, texto: doc.data().reporte || '' };
  } catch (_) { /* índice ausente o sin reportes: no es crítico */ }

  const meta = metaRes && !metaRes.error ? metaRes : null;

  // Costo por etapa: lo que convierte una tabla de gasto en un diagnóstico.
  const gasto7 = meta?.resumen7?.gasto || 0;
  const etapa  = (n) => (n > 0 && gasto7 > 0 ? Math.round(gasto7 / n) : null);
  const embudoCosteado = embudo ? {
    ...embudo,
    costo: {
      porConversacion: meta?.resumen7?.costoPorConversacion ?? null,
      porChatBot:      etapa(embudo.chatsActivados7d),
      porLead:         etapa(embudo.leads7d),
      porReunion:      etapa(embudo.reuniones7d),
      porTrial:        etapa(embudo.trials7d),
    },
  } : null;

  return {
    generadoEn: Date.now(),
    benchmark,
    adAccountId: adAccountId || null,
    meta,
    metaError: metaRes?.error || null,
    metaEsAuth: !!metaRes?.esAuth,
    embudo: embudoCosteado,
    ultimoReporte,
  };
}

/** Calcula el snapshot y lo persiste. Devuelve lo mismo que guardó. */
async function refrescarSnapshotMetaAds(token) {
  const snap = await construirSnapshotMetaAds(token);
  await SNAP_REF().set({ ...snap, guardadoEn: FieldValue.serverTimestamp() }, { merge: false })
    .catch((e) => logger.warn('[meta-panel] no pude guardar el snapshot:', e.message));
  return snap;
}

/** Lee el snapshot ya calculado (1 lectura). null si nunca se generó. */
async function leerSnapshotMetaAds() {
  const s = await SNAP_REF().get();
  return s.exists ? s.data() : null;
}

module.exports = {
  construirSnapshotMetaAds,
  refrescarSnapshotMetaAds,
  leerSnapshotMetaAds,
  _leerEmbudoReal: leerEmbudoReal,
};
