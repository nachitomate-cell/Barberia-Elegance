'use strict';

// functions/ops-metrics.js
// Callable `opsMetrics` para el dashboard ops.synaptechspa.cl.
// Agrega las métricas de barbería (_metrics/*) + los locales activos, y consulta
// server-to-server el resumen de conexion/SushiPro con el OPS_TOKEN. Solo operador.
//
// v2 (2026-07-22) — control total:
//   · Semáforo de sesiones por local (ok/caída/off + minutos caído + edad del nº)
//   · Costo de IA por local (mes en curso, _metrics/ai_vendor_{tid}_{YYYY-MM})
//   · Negocio del bot por local (_metrics/bot_{tid}_{YYYY-MM}: agendadas,
//     canceladas, ratio CONFIRMAR/CANCELAR)
//   · Trials (_system/{tid}.waAsistenteTrial) con días restantes
//   · Alertas server-side (sesión caída, tope diario, trial por vencer,
//     chats silenciados)
//   · FIX: enumeración por listDocuments (los docs padre tenants/{id} no
//     existen y collection().get() los omitía → el dashboard veía 0 locales)

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret }       = require('firebase-functions/params');
const { logger }             = require('firebase-functions');
const admin                  = require('firebase-admin');
const { Timestamp }          = require('firebase-admin/firestore');

const db = admin.firestore();
const OPS_TOKEN = defineSecret('OPS_TOKEN');

const BOOTSTRAP = ['ignaciiio.mate@gmail.com'];
const CONEXION_URL = 'https://sushipro.synaptechspa.cl/api/metrics/summary';

function ultimosDias(n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(new Date(Date.now() - i * 86400000).toISOString().slice(0, 10));
  return out;
}

// Tope diario de confirmaciones por madurez del número (espejo de
// evolution/confirmaciones.js — mantener sincronizados).
function capDiario(cfg) {
  const desde = cfg && cfg.vinculadoDesde && cfg.vinculadoDesde.toMillis
    ? cfg.vinculadoDesde.toMillis() : 0;
  const dias = desde ? (Date.now() - desde) / 86400000 : 0;
  if (dias >= 30) return 150;
  if (dias >= 7)  return 60;
  return 20;
}

const millis = (v) => (v && typeof v.toMillis === 'function' ? v.toMillis() : 0);

exports.opsMetrics = onCall({ region: 'us-central1', cors: true, secrets: [OPS_TOKEN] }, async (req) => {
  const email = String(req.auth?.token?.email || '').toLowerCase();
  if (!req.auth || !BOOTSTRAP.includes(email)) {
    throw new HttpsError('permission-denied', 'Solo el operador de la plataforma.');
  }

  const ds = ultimosDias(30);
  const hoy = ds[0];
  const mesActual = hoy.slice(0, 7);

  // ── Métricas globales de barbería (30 días) ──
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

  // ── Por local: canal WhatsApp + trial + costo + negocio + alertas ──
  // listDocuments: los docs padre tenants/{id} pueden no existir (solo
  // subcolecciones) y collection().get() los omite.
  const tenantRefs = await db.collection('tenants').listDocuments();
  const tids = new Set(tenantRefs.map((r) => r.id)); tids.add('elegance');

  const locales = [];
  const trials = [];
  const alertas = [];
  const negocioTotal = { agendadas: 0, canceladas: 0, confSi: 0, confNo: 0 };

  for (const tid of tids) {
    const [waSnap, sysSnap] = await Promise.all([
      db.doc(`tenants/${tid}/configuracion/whatsapp`).get(),
      db.doc(`_system/${tid}`).get(),
    ]);

    // Trial del asistente (independiente de si ya vinculó el canal).
    const trial = (sysSnap.data() || {}).waAsistenteTrial || null;
    let trialInfo = null;
    if (trial && trial.fin) {
      const diasRestantes = Math.ceil((Date.parse(trial.fin) - Date.now()) / 86400000);
      trialInfo = { fin: trial.fin, inicio: trial.inicio || null, tipo: trial.tipo || '', diasRestantes };
      trials.push({ tid, ...trialInfo });
      if (diasRestantes < 0) {
        alertas.push({ nivel: 'rojo', texto: `Trial VENCIDO: ${tid} venció el ${trial.fin} — apagar waAsistente o convertir a pago.` });
      } else if (diasRestantes <= 15) {
        alertas.push({ nivel: 'ambar', texto: `Trial de ${tid} vence en ${diasRestantes} día(s) (${trial.fin}).` });
      }
    }

    const wa = waSnap.data();
    if (!wa) continue;
    const tieneCanal = wa.estadoConexion === 'connected' || wa.botEnabled === true
      || wa.confirmacionesEnabled === true || !!wa.numeroVinculado;
    if (!tieneCanal) continue;

    const conectado = wa.estadoConexion === 'connected';
    const usaModulo = wa.botEnabled === true || wa.confirmacionesEnabled === true;
    const minCaida  = (!conectado && millis(wa.desconectadoEn))
      ? Math.floor((Date.now() - millis(wa.desconectadoEn)) / 60000) : 0;
    // Semáforo: ok = conectado · caida = desconectado con módulos que DEBERÍAN
    // correr (bot/confirmaciones mudos) · off = canal vinculado pero módulos apagados.
    const salud = conectado ? 'ok' : (usaModulo ? 'caida' : 'off');
    if (salud === 'caida' && minCaida >= 20) {
      alertas.push({ nivel: 'rojo', texto: `Sesión caída: ${tid} lleva ${minCaida >= 60 ? Math.floor(minCaida / 60) + ' h' : minCaida + ' min'} sin WhatsApp — bot y confirmaciones mudos.` });
    }

    // Tope diario de confirmaciones alcanzado hoy.
    const cap = capDiario(wa);
    const cd  = wa.confirmDia || {};
    if (cd.fecha === hoy && Number(cd.enviadas) >= cap) {
      alertas.push({ nivel: 'ambar', texto: `${tid} alcanzó el tope diario anti-ban de confirmaciones (${cap}/día) — citas sin preguntar hasta mañana.` });
    }

    // Chats con el bot silenciado AHORA (intervención humana o derivación).
    let silenciados = 0;
    try {
      const sq = await db.collection(`tenants/${tid}/wa_conversaciones`)
        .where('botSilencedUntil', '>', Timestamp.now()).get();
      silenciados = sq.size;
    } catch (e) { logger.warn(`[opsMetrics] silenciados ${tid}:`, e.message); }
    if (silenciados > 0) {
      alertas.push({ nivel: 'info', texto: `${tid}: bot en pausa en ${silenciados} chat(s) (humano al mando o derivación).` });
    }

    // Costo IA + negocio del bot — mes en curso, por tenant.
    const [aiV, botV] = await Promise.all([
      db.doc(`_metrics/ai_vendor_${tid}_${mesActual}`).get(),
      db.doc(`_metrics/bot_${tid}_${mesActual}`).get(),
    ]);
    const ai  = aiV.data() || {};
    const neg = botV.data() || {};
    const negocio = {
      agendadas:  Number(neg.agendada)  || 0,
      canceladas: Number(neg.cancelada) || 0,
      confSi:     Number(neg.conf_si)   || 0,
      confNo:     Number(neg.conf_no)   || 0,
    };
    negocioTotal.agendadas  += negocio.agendadas;
    negocioTotal.canceladas += negocio.canceladas;
    negocioTotal.confSi     += negocio.confSi;
    negocioTotal.confNo     += negocio.confNo;

    locales.push({
      id: tid,
      estado: wa.estadoConexion || 'disconnected',
      salud, minCaida,
      bot: wa.botEnabled === true,
      conf: wa.confirmacionesEnabled === true,
      numero: wa.numeroVinculado || null,
      edadDias: millis(wa.vinculadoDesde) ? Math.floor((Date.now() - millis(wa.vinculadoDesde)) / 86400000) : null,
      silenciados,
      ia: { llamadas: Number(ai.llamadas) || 0, costoUsd: Number(ai.costUsd) || 0 },
      negocio,
      trial: trialInfo,
    });
  }

  // Rojo primero, luego ámbar, luego info.
  const peso = { rojo: 0, ambar: 1, info: 2 };
  alertas.sort((a, b) => (peso[a.nivel] ?? 9) - (peso[b.nivel] ?? 9));
  trials.sort((a, b) => a.diasRestantes - b.diasRestantes);

  const localesActivos = locales.filter((l) => l.estado === 'connected').length;

  const barberia = {
    proyecto: 'barberia', localesActivos, locales,
    mensajes: { total: mensajes, ok: mensajesOk, porDia },
    claude: { costoUsd, tokensIn, tokensOut, llamadas },
    negocio: negocioTotal,          // mes en curso
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

  return { total, barberia, sushipro, sushiError, alertas, trials, mesActual, generadoEn: Date.now() };
});
