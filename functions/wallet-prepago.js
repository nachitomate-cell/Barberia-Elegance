'use strict';

// functions/wallet-prepago.js
// ─────────────────────────────────────────────────────────────────
//  WALLO · SALDO PREPAGO — billetera transaccional
//
//  El cliente carga saldo por adelantado (paga $20k → tiene $20k
//  disponibles + posiblemente bonus). El staff descuenta contra
//  ese saldo al pasar por caja. Cash flow adelantado para el
//  comercio + fidelización por dinero "preso" en la app.
//
//  2 acciones del staff:
//    walletCargarSaldoStaff({tenantId, uid, montoRecarga})
//      → suma montoRecarga + bonus (según cfg.prepago.bonusRecarga)
//    walletDescontarSaldoStaff({tenantId, uid, montoConsumo})
//      → descuenta del saldoPrepago
//
//  Ambas escriben en users/{uid}:
//    saldoPrepago              (int CLP, saldo actual)
//    saldoHistoricoRecargado   (int, acumulado total recargas)
//    saldoHistoricoConsumido   (int, acumulado total consumos)
//    historialPrepago          (array: { fecha, tipo, monto, bonus?, staffEmail })
//
//  El pase Google Wallet se actualiza vía walletSyncSello* (que ya
//  watch saldoPrepago además de sellos y cashback).
//
//  DEPLOY:
//    firebase deploy --only functions:walletCargarSaldoStaff,functions:walletDescontarSaldoStaff
// ─────────────────────────────────────────────────────────────────

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const { FieldValue, Timestamp } = require('firebase-admin/firestore');

const db = admin.firestore();
const SUPERADMINS = ['ignaciiio.mate@gmail.com'];

const billingRef   = (tid) => db.doc(`_billing/${tid}`);
const walletCfgRef = (tid) => tid === 'elegance'
  ? db.doc('configuracion/wallet')
  : db.doc(`tenants/${tid}/configuracion/wallet`);
const usersCol     = (tid) => db.collection(tid === 'elegance' ? 'users' : `tenants/${tid}/users`);

async function walletActivo(tid) {
  try {
    const s = await billingRef(tid).get();
    return s.exists && s.data().walletActivo === true;
  } catch (_) { return false; }
}

// Validación común de auth + gate + resolución del target canónico
// (misma lógica que cashback/sellos). Devuelve { cfg, targetRef, targetData }
// o lanza HttpsError.
async function preparar(request, tenantId, uid) {
  const email  = String(request.auth?.token?.email || '').toLowerCase();
  const role   = request.auth?.token?.role;
  const claimT = request.auth?.token?.tenantId;
  const isSuper = SUPERADMINS.includes(email);

  if (!tenantId || typeof tenantId !== 'string') {
    throw new HttpsError('invalid-argument', 'tenantId requerido.');
  }
  if (!uid || typeof uid !== 'string') {
    throw new HttpsError('invalid-argument', 'uid del cliente requerido.');
  }
  const esStaffTenant = (role === 'admin' || role === 'jefe') && claimT === tenantId;
  if (!isSuper && !esStaffTenant) {
    throw new HttpsError('permission-denied', 'Solo el staff del local puede operar el saldo.');
  }
  if (!isSuper && !(await walletActivo(tenantId))) {
    throw new HttpsError('failed-precondition', 'El módulo Wallet no está activo para este local.');
  }

  const cfgSnap = await walletCfgRef(tenantId).get();
  const cfg = cfgSnap.exists ? cfgSnap.data() : {};
  if (cfg.modo !== 'prepago') {
    throw new HttpsError('failed-precondition', 'Este local no está en modo prepago.');
  }

  const uRef = usersCol(tenantId).doc(uid);
  const uSnap = await uRef.get();
  if (!uSnap.exists) throw new HttpsError('not-found', 'Ese cliente no existe en este local.');
  const u = uSnap.data() || {};
  let targetRef = uRef;
  let targetData = u;
  if (u.fusionadoCon && u.fusionadoCon !== uid) {
    targetRef = usersCol(tenantId).doc(u.fusionadoCon);
    const canonSnap = await targetRef.get();
    if (canonSnap.exists) targetData = canonSnap.data() || {};
    else targetRef = uRef;
  }
  if (targetData.noSumaSellos === true) {
    throw new HttpsError('failed-precondition', 'Este cliente está marcado como placeholder.');
  }
  return { email, cfg, targetRef, targetData };
}

// ═══════════════════════════════════════════════════════════════
//  1) CARGAR SALDO — el cliente pagó $X, sistema abona $X + bonus
// ═══════════════════════════════════════════════════════════════
exports.walletCargarSaldoStaff = onCall(
  { region: 'us-central1', cors: true },
  async (request) => {
    const { tenantId, uid, montoRecarga, dedupeKey } = request.data || {};
    const monto = Math.round(Number(montoRecarga));
    if (!Number.isFinite(monto) || monto <= 0 || monto > 10_000_000) {
      throw new HttpsError('invalid-argument', 'Monto inválido (entre $1 y $10.000.000).');
    }

    const { email, cfg, targetRef, targetData } = await preparar(request, tenantId, uid);
    const prepagoCfg = cfg.prepago || {};
    const minRecarga = Math.max(0, Number(prepagoCfg.minRecarga) || 0);
    if (monto < minRecarga) {
      throw new HttpsError('failed-precondition',
        `La recarga mínima es $${minRecarga.toLocaleString('es-CL')}.`);
    }

    // Bonus (0-100%). Cliente carga $20k con 10% bonus → recibe $22k.
    const bonusPct = Math.max(0, Math.min(100, Number(prepagoCfg.bonusRecarga) || 0));
    const bonus = Math.round(monto * bonusPct / 100);
    const totalAbonado = monto + bonus;

    // Dedupe corto (30s) contra doble-tap del staff.
    const dk = String(dedupeKey || `${uid}_carga_${Math.floor(Date.now() / 30000)}`);
    const yaVisto = Array.isArray(targetData.staffPrepagoSeen) &&
      targetData.staffPrepagoSeen.some((e) => e && e.k === dk);
    if (yaVisto) {
      return { ok: true, duplicado: true, montoAbonado: 0, saldo: targetData.saldoPrepago || 0 };
    }

    const nowIso = Timestamp.now().toDate().toISOString();
    const historialEntry = {
      fecha: nowIso, tipo: 'recarga', monto: monto,
      ...(bonus > 0 ? { bonus, bonusPct } : {}),
      totalAbonado, staffEmail: email, origen: 'staff_prepago',
    };

    await targetRef.update({
      saldoPrepago:            FieldValue.increment(totalAbonado),
      saldoHistoricoRecargado: FieldValue.increment(monto),
      ultimoMovimientoPrepago: nowIso,
      historialPrepago:        FieldValue.arrayUnion(historialEntry),
      staffPrepagoSeen:        FieldValue.arrayUnion({ k: dk, ts: nowIso }),
    });
    logger.info(`[Prepago] recarga +$${totalAbonado} ($${monto} + $${bonus} bonus) a ${tenantId}/${targetRef.id} por ${email}`);

    let saldoPost = null;
    try { saldoPost = Number((await targetRef.get()).data()?.saldoPrepago) || 0; } catch (_) {}
    return {
      ok: true, tipo: 'recarga',
      montoPagado: monto, bonus, montoAbonado: totalAbonado,
      saldo: saldoPost,
      cliente: { nombre: targetData.nombre || 'Cliente', uid: targetRef.id },
    };
  },
);

// ═══════════════════════════════════════════════════════════════
//  2) DESCONTAR SALDO — el cliente pagó su cuenta con el saldo
// ═══════════════════════════════════════════════════════════════
exports.walletDescontarSaldoStaff = onCall(
  { region: 'us-central1', cors: true },
  async (request) => {
    const { tenantId, uid, montoConsumo, dedupeKey, nota } = request.data || {};
    const monto = Math.round(Number(montoConsumo));
    if (!Number.isFinite(monto) || monto <= 0 || monto > 10_000_000) {
      throw new HttpsError('invalid-argument', 'Monto inválido.');
    }

    const { email, targetRef, targetData } = await preparar(request, tenantId, uid);
    const saldo = Number(targetData.saldoPrepago) || 0;
    if (saldo < monto) {
      throw new HttpsError('failed-precondition',
        `Saldo insuficiente. El cliente tiene $${saldo.toLocaleString('es-CL')} y quieres cobrar $${monto.toLocaleString('es-CL')}.`);
    }

    const dk = String(dedupeKey || `${uid}_desc_${Math.floor(Date.now() / 30000)}`);
    const yaVisto = Array.isArray(targetData.staffPrepagoSeen) &&
      targetData.staffPrepagoSeen.some((e) => e && e.k === dk);
    if (yaVisto) {
      return { ok: true, duplicado: true, montoDescontado: 0, saldo };
    }

    const nowIso = Timestamp.now().toDate().toISOString();
    const historialEntry = {
      fecha: nowIso, tipo: 'consumo', monto: -monto,
      nota: (nota || '').trim().slice(0, 100) || 'Consumo en local',
      staffEmail: email, origen: 'staff_prepago',
    };

    await targetRef.update({
      saldoPrepago:            FieldValue.increment(-monto),
      saldoHistoricoConsumido: FieldValue.increment(monto),
      ultimoMovimientoPrepago: nowIso,
      historialPrepago:        FieldValue.arrayUnion(historialEntry),
      staffPrepagoSeen:        FieldValue.arrayUnion({ k: dk, ts: nowIso }),
    });
    logger.info(`[Prepago] consumo -$${monto} en ${tenantId}/${targetRef.id} por ${email}`);

    let saldoPost = null;
    try { saldoPost = Number((await targetRef.get()).data()?.saldoPrepago) || 0; } catch (_) {}
    return {
      ok: true, tipo: 'consumo',
      montoDescontado: monto,
      saldo: saldoPost,
      cliente: { nombre: targetData.nombre || 'Cliente', uid: targetRef.id },
    };
  },
);
