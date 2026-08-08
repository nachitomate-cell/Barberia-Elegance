'use strict';

// functions/ops-admin-legacy.js
// ─────────────────────────────────────────────────────────────────────────────
//  MIGRACIÓN TOTAL de /admin → ops. Las secciones "de plataforma" (no las de un
//  tenant puntual, que viven en ops-plataforma.js) que hasta ahora solo existían
//  en admin/index.html: estadísticas globales, ingresos proyectados del mes,
//  referidos, y las utilidades de crecimiento (embudo, ranking, alertas).
//
//  Todo con Admin SDK server-side: admin/index.html leía cada tenant desde el
//  cliente con un objeto TENANTS hardcodeado de 14 locales — acá se enumeran
//  TODOS con listDocuments (regla de oro del proyecto). Los cálculos replican
//  los de admin fielmente; el que toca plata (ingresos) va con candado bootstrap.
// ─────────────────────────────────────────────────────────────────────────────

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger }             = require('firebase-functions');
const admin                  = require('firebase-admin');
const { FieldValue }         = require('firebase-admin/firestore');

const { esOperadorReq, esBootstrapReq } = require('./lib/operadores');
const { _ahoraChile: ahoraChile }       = require('./chat-horas-disponibles');

const db = admin.firestore();
const tsMs = (v) => (v && typeof v.toMillis === 'function' ? v.toMillis() : 0);

/** Todos los tenants (listDocuments, jamás collection().get()) + elegance raíz. */
async function idsDeTenants() {
  const refs = await db.collection('tenants').listDocuments();
  const ids = new Set(refs.map((r) => r.id));
  ids.add('elegance');
  return [...ids];
}

// Rutas por tenant: elegance vive en las colecciones raíz; el resto bajo tenants/{tid}.
const col = (tid, name) => (tid === 'elegance' ? db.collection(name) : db.collection(`tenants/${tid}/${name}`));

/* ═══════════════ Estadísticas globales de la plataforma ═══════════════
   Réplica server-side de loadPlatformStats (admin/index.html:7409). */

exports.opsPlatformStats = onCall({ region: 'us-central1', cors: true, memory: '1GiB', timeoutSeconds: 300 }, async (req) => {
  if (!req.auth || !esOperadorReq(req)) {
    throw new HttpsError('permission-denied', 'Solo el operador de la plataforma.');
  }
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const hoyStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const seisMesesAtras = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()).toISOString().slice(0, 10);
  const mesIni = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
  const sigMes = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const mesSigIni = `${sigMes.getFullYear()}-${pad(sigMes.getMonth() + 1)}-01`;
  const yyyyMm = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  const hoyIni = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const hoyFin = hoyIni + 86400000;
  const mesIniMs = hoyIni - (now.getDate() - 1) * 86400000;

  const tids = await idsDeTenants();

  // Locales activos = no suspendidos en el kill switch.
  const suspend = new Set();
  try {
    const sys = await db.collection('_system').get();
    sys.forEach((d) => { if ((d.data() || {}).status === 'suspended') suspend.add(d.id); });
  } catch (_) { /* sin _system: todos activos */ }

  const porTenant = await Promise.allSettled(tids.map(async (tid) => {
    const [citasS, usersS, profS, canjesS] = await Promise.allSettled([
      col(tid, 'citas').where('fecha', '>=', seisMesesAtras).get(),
      col(tid, 'users').get(),
      col(tid, 'barberos').get(),
      col(tid, 'redemptions').where('status', '==', 'approved').get(),
    ]);
    const citas = citasS.status === 'fulfilled' ? citasS.value.docs.map((d) => d.data()) : [];

    const userKeys = []; let sellosHist = 0, sellosMes = 0, walletsG = 0, walletsA = 0;
    if (usersS.status === 'fulfilled') {
      usersS.value.docs.forEach((d) => {
        const u = d.data() || {};
        userKeys.push(u.telefonoSuf9 || `${tid}:${d.id}`);
        sellosHist += Number(u.sellosHistoricos ?? u.stamps ?? 0) || 0;
        (Array.isArray(u.historialSellos) ? u.historialSellos : []).forEach((h) => {
          if (h && h.tipo === 'suma' && typeof h.fecha === 'string' && h.fecha.startsWith(yyyyMm)) sellosMes += Number(h.cantidad) || 0;
        });
        if (u.walletObjectId) walletsG++;
        if (u.appleWalletSerial) walletsA++;
      });
    }
    const profCount = profS.status === 'fulfilled'
      ? profS.value.docs.filter((d) => { const p = d.data() || {}; return !p._mainDocId && p.disponible !== false; }).length : 0;

    const citasHoyCreadas = citas.filter((c) => { const t = tsMs(c.creadoEn) || tsMs(c.createdAt); return t >= hoyIni && t < hoyFin; }).length;
    const citasParaHoy = citas.filter((c) => c.fecha === hoyStr && !String(c.estado || '').toLowerCase().startsWith('cancelad')).length;
    const citasPasadas = citas.filter((c) => c.fecha && c.fecha <= hoyStr);
    const citasMes = citas.filter((c) => c.fecha >= mesIni && c.fecha < mesSigIni).length;
    const canceladas = citasPasadas.filter((c) => String(c.estado || '').toLowerCase().startsWith('cancelad')).length;
    const servicios = new Set(); citasPasadas.forEach((c) => { if (c.servicioNombre) servicios.add(c.servicioNombre); });

    let premiosHist = 0, premiosMes = 0;
    if (canjesS.status === 'fulfilled') canjesS.value.docs.forEach((d) => { premiosHist++; if (tsMs((d.data() || {}).approvedAt) >= mesIniMs) premiosMes++; });

    return { tid, citasTotal: citasPasadas.length, citasMes, citasHoyCreadas, citasParaHoy, canceladas,
      visitas: citasPasadas.map((c) => c.clienteId || c.clienteTelefono || c.clienteNombre).filter(Boolean),
      userKeys, profCount, servicios: [...servicios], sellosHist, sellosMes, walletsG, walletsA, premiosHist, premiosMes };
  }));

  const T = { citas: 0, citasMes: 0, hoy: 0, paraHoy: 0, canceladas: 0, prof: 0, sellosHist: 0, sellosMes: 0, walletsG: 0, walletsA: 0, premiosHist: 0, premiosMes: 0 };
  const users = new Set(), visitas = new Map(), servicios = new Set();
  const hoyDesglose = [], paraHoyDesglose = [];
  const nombreDe = {};
  porTenant.forEach((r) => {
    if (r.status !== 'fulfilled') return;
    const v = r.value;
    T.citas += v.citasTotal; T.citasMes += v.citasMes; T.hoy += v.citasHoyCreadas; T.paraHoy += v.citasParaHoy;
    T.canceladas += v.canceladas; T.prof += v.profCount; T.sellosHist += v.sellosHist; T.sellosMes += v.sellosMes;
    T.walletsG += v.walletsG; T.walletsA += v.walletsA; T.premiosHist += v.premiosHist; T.premiosMes += v.premiosMes;
    if (v.citasHoyCreadas > 0) hoyDesglose.push({ tid: v.tid, n: v.citasHoyCreadas });
    if (v.citasParaHoy > 0) paraHoyDesglose.push({ tid: v.tid, n: v.citasParaHoy });
    v.userKeys.forEach((k) => users.add(k));
    v.visitas.forEach((k) => visitas.set(k, (visitas.get(k) || 0) + 1));
    v.servicios.forEach((s) => servicios.add(s));
  });
  const unicos = visitas.size;
  const recurrentes = [...visitas.values()].filter((n) => n >= 2).length;

  // Nombres de los tenants para el desglose (una lectura por tenant que aparece).
  const idsDesglose = [...new Set([...hoyDesglose, ...paraHoyDesglose].map((x) => x.tid))];
  await Promise.all(idsDesglose.map(async (tid) => {
    const t = (await db.doc(`tenants/${tid}`).get().catch(() => null))?.data() || {};
    nombreDe[tid] = t.nombre || tid;
  }));
  const conNombre = (arr) => arr.sort((a, b) => b.n - a.n).map((x) => ({ nombre: nombreDe[x.tid] || x.tid, n: x.n }));

  return {
    ok: true, mes: yyyyMm,
    localesActivos: tids.filter((t) => !suspend.has(t)).length,
    citasHoy: T.hoy, citasParaHoy: T.paraHoy, citasAgendadas: T.citas, citasMes: T.citasMes,
    clientesUnicos: unicos, usuariosApp: users.size,
    retencionPct: unicos > 0 ? Math.round(recurrentes / unicos * 100) : 0,
    cancelacionPct: T.citas > 0 ? Math.round(T.canceladas / T.citas * 100) : 0,
    profesionales: T.prof, serviciosDistintos: servicios.size,
    sellosHist: T.sellosHist, sellosMes: T.sellosMes,
    walletsGoogle: T.walletsG, walletsApple: T.walletsA,
    premiosHist: T.premiosHist, premiosMes: T.premiosMes,
    hoyDesglose: conNombre(hoyDesglose), paraHoyDesglose: conNombre(paraHoyDesglose),
  };
});

/* ═══════════════ Ingresos proyectados del mes ═══════════════ CANDADO BOOTSTRAP
   Réplica de loadIncomeProjection (admin/index.html:7242). Fuente de verdad:
   las cuotas del mes en _billing/{tid}.cuotas (mes===YYYY-MM, monto>0). */

exports.opsIngresos = onCall({ region: 'us-central1', cors: true, memory: '512MiB', timeoutSeconds: 120 }, async (req) => {
  if (!req.auth || !esBootstrapReq(req)) {
    throw new HttpsError('permission-denied', 'Solo Ignacio ve los ingresos.');
  }
  // `mes` opcional (YYYY-MM) para navegar; por defecto el mes en curso (Chile).
  const mes = /^\d{4}-\d{2}$/.test(String(req.data?.mes || '')) ? req.data.mes : ahoraChile().fecha.slice(0, 7);

  // Se itera el universo COMPLETO de tenants (no solo los que tienen _billing),
  // igual que admin: un local suspendido sin doc de billing igual cuenta como
  // suspendido. Sin esto el conteo no cuadra (admin marcaba 17, no 5).
  const tids = await idsDeTenants();
  let total = 0, cobrado = 0, pendiente = 0, mrr = 0;
  const cats = { pagadas: [], pendientes: [], sinCuota: [], suspendidos: [] };

  await Promise.all(tids.map(async (tid) => {
    const [sysSnap, billSnap] = await Promise.all([
      db.doc(`_system/${tid}`).get().catch(() => null),
      db.doc(`_billing/${tid}`).get().catch(() => null),
    ]);
    const sys = sysSnap?.data() || {}, b = billSnap?.data() || {};
    const operativo = sys.operativo !== false && sys.status !== 'suspended';
    if (!operativo) { cats.suspendidos.push({ tid }); return; }

    const s = b.suscripcionMp;
    if (s && s.status === 'authorized' && s.monto) mrr += Number(s.monto) || 0;

    const cuota = Array.isArray(b.cuotas) ? b.cuotas.find((c) => c && c.mes === mes && Number(c.monto) > 0) : null;
    if (!cuota) { cats.sinCuota.push({ tid }); return; }

    const monto = Number(cuota.monto) || 0;
    total += monto;
    if (cuota.pagada) { cobrado += monto; cats.pagadas.push({ tid, monto, pagadaEn: cuota.pagadaEn || cuota.fechaPago || null }); }
    else { pendiente += monto; cats.pendientes.push({ tid, monto, fechaProximoPago: b.fechaProximoPago && b.fechaProximoPago.toDate ? b.fechaProximoPago.toDate().toISOString().slice(0, 10) : (b.fechaProximoPago || null) }); }
  }));

  return {
    ok: true, mes,
    total, cobrado, pendiente,
    nPagadas: cats.pagadas.length, nPendientes: cats.pendientes.length,
    nSinCuota: cats.sinCuota.length, nSuspendidos: cats.suspendidos.length,
    mrrEstimado: mrr,
    detalle: {
      pagadas: cats.pagadas.sort((a, b) => b.monto - a.monto),
      pendientes: cats.pendientes.sort((a, b) => b.monto - a.monto),
      sinCuota: cats.sinCuota.map((x) => x.tid).sort(),
      suspendidos: cats.suspendidos.map((x) => x.tid).sort(),
    },
  };
});

/* ═══════════════ Notificaciones: log global de push/email/WhatsApp ═══════════════ */

exports.opsNotifLogs = onCall({ region: 'us-central1', cors: true, timeoutSeconds: 60 }, async (req) => {
  if (!req.auth || !esOperadorReq(req)) {
    throw new HttpsError('permission-denied', 'Solo el operador de la plataforma.');
  }
  const canal = String(req.data?.canal || '');   // '', 'push', 'email', 'whatsapp'
  let q = db.collection('notification_logs').orderBy('createdAt', 'desc').limit(60);
  const snap = await q.get().catch(() => ({ docs: [] }));
  const items = snap.docs.map((d) => {
    const v = d.data() || {};
    return {
      id: d.id, canal: v.canal || v.channel || '?', tipo: v.tipo || v.type || '',
      tenantId: v.tenantId || null, estado: v.estado || v.status || '?',
      destino: v.to || v.destino || '', creadoEn: tsMs(v.createdAt) || null,
    };
  }).filter((x) => !canal || x.canal === canal);
  return { ok: true, items };
});

/* ═══════════════ Analytics: ranking de locales + alertas tempranas ═══════════════
   Ranking por citas de los últimos 30 días; alertas de locales que cayeron
   fuerte vs el mes anterior. Réplica de loadAnalytics (admin). */

exports.opsAnalytics = onCall({ region: 'us-central1', cors: true, memory: '1GiB', timeoutSeconds: 300 }, async (req) => {
  if (!req.auth || !esOperadorReq(req)) {
    throw new HttpsError('permission-denied', 'Solo el operador de la plataforma.');
  }
  const now = new Date();
  const iso = (d) => d.toISOString().slice(0, 10);
  const hace30 = iso(new Date(now.getTime() - 30 * 86400000));
  const hace60 = iso(new Date(now.getTime() - 60 * 86400000));
  const tids = await idsDeTenants();

  const filas = await Promise.allSettled(tids.map(async (tid) => {
    const snap = await col(tid, 'citas').where('fecha', '>=', hace60).get().catch(() => ({ docs: [] }));
    const citas = snap.docs.map((d) => d.data());
    const ult30 = citas.filter((c) => c.fecha >= hace30 && !String(c.estado || '').toLowerCase().startsWith('cancelad')).length;
    const prev30 = citas.filter((c) => c.fecha >= hace60 && c.fecha < hace30 && !String(c.estado || '').toLowerCase().startsWith('cancelad')).length;
    const t = (await db.doc(`tenants/${tid}`).get().catch(() => null))?.data() || {};
    return { tid, nombre: t.nombre || tid, ult30, prev30, delta: prev30 > 0 ? Math.round((ult30 - prev30) / prev30 * 100) : null };
  }));

  const ranking = filas.filter((r) => r.status === 'fulfilled').map((r) => r.value)
    .sort((a, b) => b.ult30 - a.ult30);
  // Alertas: locales que venían con actividad y cayeron ≥40% (o a cero).
  const alertas = ranking.filter((r) => r.prev30 >= 5 && (r.ult30 === 0 || (r.delta !== null && r.delta <= -40)))
    .map((r) => ({ tid: r.tid, nombre: r.nombre, ult30: r.ult30, prev30: r.prev30, delta: r.delta }));

  return { ok: true, ranking: ranking.slice(0, 20), alertas };
});

/* ═══════════════ Programa de referidos B2B (migrado de /admin) ═══════════════
   Modelo: _referrals/{champTid}/referidos/{referredTid}. */

exports.opsReferidos = onCall({ region: 'us-central1', cors: true, memory: '512MiB', timeoutSeconds: 120 }, async (req) => {
  if (!req.auth || !esOperadorReq(req)) {
    throw new HttpsError('permission-denied', 'Solo el operador de la plataforma.');
  }
  const champs = await db.collection('_referrals').listDocuments();
  const out = await Promise.all(champs.map(async (ref) => {
    const referidos = await ref.collection('referidos').get().catch(() => ({ docs: [] }));
    return {
      champion: ref.id,
      referidos: referidos.docs.map((d) => {
        const v = d.data() || {};
        return {
          tid: d.id, nombre: v.referredNombre || d.id,
          fecha: v.fechaReferido || null, status: v.status || null,
          mesesOtorgados: v.mesesGratisOtorgados || 0,
          mesesPendientes: v.mesesGratisPendientesAplicar || 0,
          notas: v.notas || '',
        };
      }),
    };
  }));
  return { ok: true, programas: out.filter((p) => p.referidos.length) };
});

exports.opsReferidoGuardar = onCall({ region: 'us-central1', cors: true }, async (req) => {
  if (!req.auth || !esOperadorReq(req)) {
    throw new HttpsError('permission-denied', 'Solo el operador de la plataforma.');
  }
  const d = req.data || {};
  const champ = String(d.champion || '').trim();
  const referred = String(d.referredTid || '').trim();
  if (!champ || !referred) throw new HttpsError('invalid-argument', 'Falta champion o referido.');
  if (champ === referred) throw new HttpsError('invalid-argument', 'Un local no se refiere a sí mismo.');

  const ref = db.doc(`_referrals/${champ}/referidos/${referred}`);
  if (d.borrar === true) { await ref.delete(); return { ok: true, borrado: true }; }

  const existe = (await ref.get()).exists;
  await ref.set({
    referredNombre: String(d.referredNombre || referred).slice(0, 120),
    fechaReferido: d.fecha || null,
    mesesGratisOtorgados: Number(d.mesesOtorgados) || 0,
    mesesGratisPendientesAplicar: Number(d.mesesPendientes) || 0,
    status: String(d.status || 'activo').slice(0, 30),
    notas: String(d.notas || '').slice(0, 500),
    updatedAt: FieldValue.serverTimestamp(),
    ...(existe ? {} : { createdAt: FieldValue.serverTimestamp() }),
  }, { merge: true });
  return { ok: true };
});

/** Marcar una cuota del mes como pagada/no pagada desde ops (bootstrap). */
exports.opsIngresoMarcarPagada = onCall({ region: 'us-central1', cors: true }, async (req) => {
  if (!req.auth || !esBootstrapReq(req)) {
    throw new HttpsError('permission-denied', 'Solo Ignacio.');
  }
  const tid = String(req.data?.tid || '').trim();
  const mes = String(req.data?.mes || '');
  const pagada = req.data?.pagada !== false;
  if (!tid || !/^\d{4}-\d{2}$/.test(mes)) throw new HttpsError('invalid-argument', 'tid o mes inválido.');

  const ref = db.doc(`_billing/${tid}`);
  await db.runTransaction(async (tx) => {
    const b = (await tx.get(ref)).data() || {};
    const cuotas = Array.isArray(b.cuotas) ? b.cuotas.map((c) => ({ ...c })) : [];
    let cuota = cuotas.find((c) => c && c.mes === mes);
    if (!cuota) { cuota = { mes, monto: Number(b.montoPendiente) || 0, pagada: false }; cuotas.push(cuota); }
    cuota.pagada = pagada;
    if (pagada) {
      const h = ahoraChile().fecha;
      cuota.fechaPago = h; cuota.pagadaEn = h; cuota.medioPago = 'Transferencia';
    } else { delete cuota.fechaPago; delete cuota.pagadaEn; delete cuota.medioPago; }
    tx.set(ref, { cuotas, estadoPago: pagada ? 'al_dia' : (b.estadoPago || 'pendiente') }, { merge: true });
  });
  logger.info(`[ops-ingresos] ${tid} cuota ${mes} → ${pagada ? 'pagada' : 'no pagada'} por ${req.auth.token?.email}`);
  return { ok: true };
});
