'use strict';

// functions/wallet-cashback.js
// ─────────────────────────────────────────────────────────────────
//  WALLO · CASHBACK — modo alternativo a sellos
//
//  El staff registra el monto de la compra del cliente. La CF
//  calcula el % configurado en cfg.wallet.cashback.porcentaje y
//  lo abona como saldo en pesos a users.cashbackDisponible.
//
//  El pase Google Wallet se actualiza automáticamente vía
//  walletSyncSello* (que ahora watch cashbackDisponible además de
//  sellos). El cliente ve "$5.400" grande donde antes decía "3/10".
//
//  Coexistencia: un tenant tiene UN modo (cfg.wallet.modo). Si
//  modo=sellos → esta CF no se debe llamar; el staff app lee el
//  modo antes de exponer los botones.
//
//  Exports:
//    walletSumarCashbackStaff — callable admin/jefe/super
//
//  DEPLOY:
//    firebase deploy --only functions:walletSumarCashbackStaff
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

exports.walletSumarCashbackStaff = onCall(
  { region: 'us-central1', cors: true },
  async (request) => {
    const email  = String(request.auth?.token?.email || '').toLowerCase();
    const role   = request.auth?.token?.role;
    const claimT = request.auth?.token?.tenantId;
    const isSuper = SUPERADMINS.includes(email);

    const { tenantId, uid, montoCompra, dedupeKey } = request.data || {};
    if (!tenantId || typeof tenantId !== 'string') {
      throw new HttpsError('invalid-argument', 'tenantId requerido.');
    }
    if (!uid || typeof uid !== 'string') {
      throw new HttpsError('invalid-argument', 'uid del cliente requerido.');
    }
    const monto = Math.round(Number(montoCompra));
    if (!Number.isFinite(monto) || monto <= 0 || monto > 10_000_000) {
      throw new HttpsError('invalid-argument', 'Monto inválido (entre $1 y $10.000.000).');
    }

    const esStaffTenant = (role === 'admin' || role === 'jefe') && claimT === tenantId;
    if (!isSuper && !esStaffTenant) {
      throw new HttpsError('permission-denied', 'Solo el staff del local puede registrar compras.');
    }
    if (!isSuper && !(await walletActivo(tenantId))) {
      throw new HttpsError('failed-precondition', 'El módulo Wallet no está activo para este local.');
    }

    // Config: modo debe ser cashback + porcentaje + monto mínimo.
    const cfgSnap = await walletCfgRef(tenantId).get();
    const cfg = cfgSnap.exists ? cfgSnap.data() : {};
    if (cfg.modo !== 'cashback') {
      throw new HttpsError('failed-precondition', 'Este local está en modo sellos, no cashback.');
    }
    const pct = Math.max(0.5, Math.min(50, Number(cfg.cashback && cfg.cashback.porcentaje) || 5));
    const minCompra = Math.max(0, Number(cfg.cashback && cfg.cashback.minCompra) || 0);
    if (monto < minCompra) {
      throw new HttpsError('failed-precondition',
        `El monto mínimo para acumular cashback es $${minCompra.toLocaleString('es-CL')}.`);
    }

    // Cliente + fusión canónica (espejo del flujo de sellos).
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
      throw new HttpsError('failed-precondition', 'Este cliente está marcado como placeholder (no acumula cashback).');
    }

    // Dedupe: mismo staff no puede sumar dos veces por accidente al mismo
    // cliente en < 30s. Reusa el pattern de walletSumarSelloStaff.
    const dk = String(dedupeKey || `${uid}_cb_${Math.floor(Date.now() / 30000)}`);
    const yaVisto = Array.isArray(targetData.staffCashbackSeen) &&
      targetData.staffCashbackSeen.some((e) => e && e.k === dk);
    if (yaVisto) {
      return {
        ok: true, duplicado: true, montoAcreditado: 0,
        saldo: targetData.cashbackDisponible || 0,
      };
    }

    // Calcular cashback (redondeo al peso).
    const cashback = Math.round(monto * pct / 100);
    const nowIso = Timestamp.now().toDate().toISOString();

    const historialEntry = {
      fecha: nowIso,
      tipo: 'suma',
      monto: cashback,
      montoCompra: monto,
      porcentaje: pct,
      staffEmail: email,
      origen: 'staff_cashback',
    };
    const seenEntry = { k: dk, ts: nowIso };

    await targetRef.update({
      cashbackDisponible: FieldValue.increment(cashback),
      cashbackHistorico:  FieldValue.increment(cashback),
      ultimoCashback:     nowIso,
      historialCashback:  FieldValue.arrayUnion(historialEntry),
      staffCashbackSeen:  FieldValue.arrayUnion(seenEntry),
    });
    logger.info(`[Cashback] +$${cashback} (${pct}% de $${monto}) a ${tenantId}/${targetRef.id} por ${email}`);

    // Releer para devolver saldo consistente al staff.
    let saldoPost = null;
    try {
      const post = await targetRef.get();
      saldoPost = Number(post.data()?.cashbackDisponible) || 0;
    } catch (_) {}

    return {
      ok: true,
      montoAcreditado: cashback,
      porcentajeAplicado: pct,
      saldo: saldoPost,
      cliente: {
        nombre: targetData.nombre || targetData.displayName || 'Cliente',
        uid: targetRef.id,
      },
    };
  },
);
