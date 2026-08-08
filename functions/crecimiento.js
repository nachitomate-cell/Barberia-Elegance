'use strict';

// functions/crecimiento.js
// ─────────────────────────────────────────────────────────────────────────────
//  PANEL DE CRECIMIENTO — la salud económica del SaaS en un solo lugar.
//
//  Los ingredientes de dinero ya existían, pero en silos que nunca se cruzaban:
//    · ingreso por cuota      → _billing/{tid}.cuotas + planes
//    · costo de IA            → _metrics/ai_{fecha} (USD)
//    · costo WhatsApp/Meta    → _metrics/ops_snapshot.metrics.metaWhatsApp
//    · gasto en Ads           → _metrics/meta_ads_snapshot
//    · atribución de venta    → _billing.refVendedor / utm*
//  Este módulo hace el CRUCE y produce las métricas de escalamiento:
//    LTV:CAC · churn/retención · margen bruto · burn/runway · (NPS: fase 2).
//
//  CANDADO: es la plata del negocio → `esBootstrapReq` (solo Ignacio). El socio
//  developer NO ve estos números, igual que no puede leer `_billing`. Esconder
//  la pestaña no basta: el candado real es este gate en el callable.
//
//  Lo que el sistema NO puede saber solo (caja en el banco, costos fijos como
//  sueldos/arriendo, tipo de cambio) vive en `_system/crecimiento` y se edita
//  desde el panel. Cada número lleva su origen (medido vs estimado) para no
//  fingir precisión que no hay — un LTV al arrancar es proyección, no un hecho.
// ─────────────────────────────────────────────────────────────────────────────

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onSchedule }         = require('firebase-functions/v2/scheduler');
const { logger }             = require('firebase-functions');
const admin                  = require('firebase-admin');
const { FieldValue }         = require('firebase-admin/firestore');

const { esBootstrapReq }          = require('./lib/operadores');
const { _ahoraChile: ahoraChile } = require('./chat-horas-disponibles');

const db = admin.firestore();

// Precios NETOS (sin IVA) — el IVA no es ingreso tuyo, lo pasas al fisco, así
// que el MRR real es neto. Estos son los montos que efectivamente se cobran
// (functions/mensualidad-mp.js). El anual se prorratea a mensual.
const PLAN_NETO = {
  basico: 25126, pro: 41933, full: 58739, anual: Math.round(335294 / 12),
  individual: 25126, local: 41933,        // aliases legacy
};

const CFG_DEFAULTS = {
  cajaDisponibleClp: 0,          // solo lo sabe Ignacio → input manual
  costosFijosMensualesClp: 0,    // sueldos, arriendo, herramientas (lo que el sistema no ve)
  vidaMesesEstimada: 24,         // supuesto de vida del cliente hasta tener churn real (= tope comisión recurring)
  comisionPromedioClp: 30000,    // comisión de venta promedio por cliente nuevo
  usdClp: 950,                   // tipo de cambio para pasar el costo de IA (USD) a CLP
  metaClientes: {},              // { 'YYYY-MM': n } — la escalera de objetivos
  metaReuniones: {},             // { 'YYYY-MM': n }
};

const CFG_REF = () => db.doc('_system/crecimiento');
async function leerCfg() {
  return { ...CFG_DEFAULTS, ...((await CFG_REF().get()).data() || {}) };
}

const millis = (v) => (v && typeof v.toMillis === 'function' ? v.toMillis() : (typeof v === 'number' ? v : 0));
const mesDe  = (fecha) => String(fecha).slice(0, 7);
function mesAnterior(ym) {
  const [a, m] = ym.split('-').map(Number);
  return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, '0')}`;
}

/* ── Costos del mes (CLP): se leen de los snapshots ya persistidos ────────── */

async function costoIAClp(usdClp) {
  // Suma el costUsd de los últimos 30 docs diarios globales _metrics/ai_{fecha}.
  const hoy = new Date();
  const fechas = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(hoy); d.setDate(d.getDate() - i);
    fechas.push(`ai_${d.toISOString().slice(0, 10)}`);
  }
  const snaps = await db.getAll(...fechas.map((f) => db.doc(`_metrics/${f}`)));
  const usd = snaps.reduce((a, s) => a + (Number((s.data() || {}).costUsd) || 0), 0);
  return Math.round(usd * usdClp);
}

async function costosDeSnapshots() {
  const [ops, ads] = await Promise.all([
    db.doc('_metrics/ops_snapshot').get().catch(() => null),
    db.doc('_metrics/meta_ads_snapshot').get().catch(() => null),
  ]);
  const m = (ops && ops.data() && ops.data().metrics) || {};
  const waMes = Number(m.metaWhatsApp?.mes?.costoClp) || 0;
  // Ads: la serie diaria de 30d es lo más fiel a "gasto del mes"; si no está,
  // se extrapola el gasto de 7d.
  const a = (ads && ads.data()) || {};
  let adsMes = 0;
  if (Array.isArray(a.serieDiaria) && a.serieDiaria.length) {
    adsMes = Math.round(a.serieDiaria.reduce((s, d) => s + (Number(d.gasto) || 0), 0));
  } else if (Number(a.gasto7)) {
    adsMes = Math.round(Number(a.gasto7) * 30 / 7);
  }
  return { waClp: waMes, adsClp: adsMes };
}

/* ── El cálculo central ───────────────────────────────────────────────────── */

async function calcular() {
  const cfg = await leerCfg();
  const mes = mesDe(ahoraChile().fecha);
  const ahora = Date.now();

  // Un doc _billing por tenant + su _system para saber si está operativo.
  const refs = await db.collection('_billing').listDocuments();
  const billings = await db.getAll(...refs);

  let clientesPagando = 0, clientesTrial = 0, clientesAtrasados = 0, nuevosMes = 0;
  let mrr = 0;
  const porPlan = {};

  await Promise.all(billings.map(async (snap) => {
    const b = snap.data() || {};
    const tid = snap.id;
    const sys = (await db.doc(`_system/${tid}`).get().catch(() => null))?.data() || {};
    const operativo = sys.operativo !== false && sys.status !== 'suspended';

    const trialVigente = b.trialFinaliza && millis(b.trialFinaliza) > ahora;
    if (trialVigente && b.estadoPago === 'trial') { clientesTrial++; return; }

    // Pagando = operativo, con plan, no cancelado en MP.
    const cancelado = b.suscripcionMp && b.suscripcionMp.status === 'cancelled';
    const pagando = operativo && !cancelado &&
      (b.estadoPago === 'al_dia' || b.estadoPago === 'atrasado') &&
      (b.plan || b.montoPendiente > 0);
    if (!pagando) return;

    const neto = PLAN_NETO[b.plan] || Number(b.montoPendiente) || 0;
    mrr += neto;
    porPlan[b.plan || 'otro'] = (porPlan[b.plan || 'otro'] || 0) + 1;
    if (b.estadoPago === 'atrasado') clientesAtrasados++; else clientesPagando++;

    // "Nuevo este mes": el _billing nació este mes. Proxy razonable de altas.
    if (b.creadoEn && mesDe(new Date(millis(b.creadoEn)).toISOString().slice(0, 10)) === mes) nuevosMes++;
  }));

  const activos = clientesPagando + clientesAtrasados;

  // Costos del mes.
  const [iaClp, snapCostos] = await Promise.all([costoIAClp(cfg.usdClp), costosDeSnapshots()]);
  const { waClp, adsClp } = snapCostos;
  const comisionesClp = nuevosMes * cfg.comisionPromedioClp;
  const fijosClp = Number(cfg.costosFijosMensualesClp) || 0;

  const costosDirectos = iaClp + waClp;                 // COGS: escalan con el uso
  const costosSyM       = adsClp + comisionesClp;       // sales & marketing (numerador CAC)
  const costosTotales   = costosDirectos + costosSyM + fijosClp;

  // Métricas.
  const arpu = activos ? mrr / activos : 0;
  const margenBrutoPct = mrr ? Math.max(0, (mrr - costosDirectos) / mrr) : null;
  const ltv = margenBrutoPct !== null ? Math.round(arpu * margenBrutoPct * cfg.vidaMesesEstimada) : null;
  const cac = nuevosMes ? Math.round(costosSyM / nuevosMes) : null;
  const ltvCac = (ltv && cac) ? Math.round(ltv / cac * 10) / 10 : null;
  const burn = costosTotales - mrr;                     // >0 = quema; <0 = rentable
  const runwayMeses = burn > 0 && cfg.cajaDisponibleClp > 0
    ? Math.floor(cfg.cajaDisponibleClp / burn) : null;

  // Churn: contra el snapshot del mes anterior (retención de clientes pagando).
  const prev = (await db.doc(`_metrics/crecimiento_${mesAnterior(mes)}`).get().catch(() => null))?.data();
  let churnPct = null, retencionPct = null, perdidos = null;
  if (prev && Number(prev.activos) > 0) {
    // Perdidos = los que estaban y ya no. Aproximado por saldo neto (no cuenta
    // reemplazos), suficiente para la tendencia mes a mes.
    perdidos = Math.max(0, Number(prev.activos) - (activos - nuevosMes));
    churnPct = Math.round(perdidos / Number(prev.activos) * 1000) / 10;
    retencionPct = Math.round((100 - churnPct) * 10) / 10;
  }

  // Reuniones del mes (termómetro de la meta): las que caen en el mes en curso.
  const reuSnap = await db.collection('ventas_reuniones').where('estado', '==', 'agendada').limit(200).get().catch(() => ({ docs: [] }));
  const reunionesMes = reuSnap.docs.filter((d) => mesDe((d.data() || {}).fecha || '') === mes).length;

  return {
    mes,
    ingresos: {
      mrrClp: Math.round(mrr), arpuClp: Math.round(arpu),
      clientesPagando: activos, clientesAlDia: clientesPagando,
      clientesAtrasados, clientesTrial, nuevosMes, porPlan,
    },
    costos: {
      iaClp, waClp, adsClp, comisionesClp, fijosClp,
      directosClp: costosDirectos, symClp: costosSyM, totalClp: costosTotales,
    },
    unidad: {
      ltvClp: ltv, cacClp: cac, ltvCac,
      margenBrutoPct: margenBrutoPct !== null ? Math.round(margenBrutoPct * 1000) / 10 : null,
      vidaMeses: cfg.vidaMesesEstimada,
    },
    caja: {
      disponibleClp: Number(cfg.cajaDisponibleClp) || 0,
      burnMensualClp: Math.round(burn), runwayMeses, rentable: burn <= 0,
    },
    retencion: { churnPct, retencionPct, perdidos, baseMesAnterior: prev ? Number(prev.activos) : null },
    meta: {
      clientes: { objetivo: Number(cfg.metaClientes?.[mes]) || null, logrado: nuevosMes },
      reuniones: { objetivo: Number(cfg.metaReuniones?.[mes]) || null, logrado: reunionesMes },
    },
    cfg: {
      cajaDisponibleClp: cfg.cajaDisponibleClp, costosFijosMensualesClp: cfg.costosFijosMensualesClp,
      vidaMesesEstimada: cfg.vidaMesesEstimada, comisionPromedioClp: cfg.comisionPromedioClp,
      usdClp: cfg.usdClp,
      metaClientesMes: Number(cfg.metaClientes?.[mes]) || null,
      metaReunionesMes: Number(cfg.metaReuniones?.[mes]) || null,
    },
  };
}

/* ── Callables (solo Ignacio) ─────────────────────────────────────────────── */

exports.opsCrecimiento = onCall({ region: 'us-central1', cors: true, memory: '512MiB', timeoutSeconds: 120 }, async (req) => {
  if (!req.auth || !esBootstrapReq(req)) {
    throw new HttpsError('permission-denied', 'Solo Ignacio ve los números del negocio.');
  }
  return { ok: true, ...(await calcular()) };
});

exports.opsCrecimientoConfig = onCall({ region: 'us-central1', cors: true }, async (req) => {
  if (!req.auth || !esBootstrapReq(req)) {
    throw new HttpsError('permission-denied', 'Solo Ignacio configura esto.');
  }
  const p = req.data?.patch || {};
  const patch = {};
  for (const k of ['cajaDisponibleClp', 'costosFijosMensualesClp', 'vidaMesesEstimada', 'comisionPromedioClp', 'usdClp']) {
    if (Number.isFinite(Number(p[k])) && Number(p[k]) >= 0) patch[k] = Number(p[k]);
  }
  // Metas por mes: patch.metaClientes = { 'YYYY-MM': n }.
  if (p.metaClientes && typeof p.metaClientes === 'object') {
    for (const [mes, n] of Object.entries(p.metaClientes)) {
      if (/^\d{4}-\d{2}$/.test(mes) && Number.isFinite(Number(n))) patch[`metaClientes.${mes}`] = Number(n);
    }
  }
  if (p.metaReuniones && typeof p.metaReuniones === 'object') {
    for (const [mes, n] of Object.entries(p.metaReuniones)) {
      if (/^\d{4}-\d{2}$/.test(mes) && Number.isFinite(Number(n))) patch[`metaReuniones.${mes}`] = Number(n);
    }
  }
  if (!Object.keys(patch).length) throw new HttpsError('invalid-argument', 'Nada válido que guardar.');
  await CFG_REF().set(patch, { merge: true });
  return { ok: true, ...(await calcular()) };
});

/* ── Snapshot mensual: la memoria que hace posible el churn ────────────────── */

exports.crecimientoSnapshotCron = onSchedule({
  schedule: '5 0 1 * *',            // 00:05 del día 1 de cada mes: foto del mes que cierra
  timeZone: 'America/Santiago', region: 'us-central1', memory: '512MiB', timeoutSeconds: 120,
}, async () => {
  // Guarda el mes que RECIÉN terminó, para que el churn del mes nuevo tenga base.
  const hoy = ahoraChile().fecha;
  const ymActual = mesDe(hoy);
  const ymCerrado = mesAnterior(ymActual);
  const r = await calcular().catch((e) => { logger.error('[crecimiento-snap]', e.message); return null; });
  if (!r) return;
  await db.doc(`_metrics/crecimiento_${ymCerrado}`).set({
    mes: ymCerrado, activos: r.ingresos.clientesPagando, mrrClp: r.ingresos.mrrClp,
    nuevos: r.ingresos.nuevosMes, cerradoEn: FieldValue.serverTimestamp(),
  }, { merge: true });
  logger.info(`[crecimiento-snap] ${ymCerrado}: ${r.ingresos.clientesPagando} activos, MRR ${r.ingresos.mrrClp}`);
});

// Para el resumen de WhatsApp y otros usos internos.
exports._calcularCrecimiento = calcular;
