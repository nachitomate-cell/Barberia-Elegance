'use strict';

// functions/wallet-staff.js
// ─────────────────────────────────────────────────────────────────
//  WALLET · STAFF — sumar sellos a mano desde wallets.bioo.cl/staff
//
//  Pensado para tenants "wallet-only" (sin agenda): el staff escanea
//  el QR del pase del cliente y suma 1 visita. Reproduce la lógica de
//  sello-automatico.js (rama sin membresía), pero disparado por acción
//  manual del staff — no por completar cita. El trigger walletSync*
//  ya se encarga de reflejar el cambio en el pase Google/Apple.
//
//  Auth: admin | jefe del tenant + superadmin. No creamos claim
//  `staff` nuevo en el MVP — cualquier "jefe" del tenant puede sumar.
//
//  Idempotencia:
//    - Cliente-side puede pasar `dedupeKey` (default: uid + minuto actual)
//      para evitar dobles taps. Lo guardamos en users/{uid}.staffStampsSeen
//      como set corto (últimos 20).
//
//  Exports:
//    walletSumarSelloStaff  — callable {tenantId, uid, cantidad?, dedupeKey?}
//
//  DEPLOY:
//    firebase deploy --only functions:walletSumarSelloStaff
// ─────────────────────────────────────────────────────────────────

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const { FieldValue, Timestamp } = require('firebase-admin/firestore');
const marca = require('./lib/kronnos-marca');

const db = admin.firestore();
const SUPERADMINS = ['ignaciiio.mate@gmail.com'];

const billingRef = (tid) => db.doc(`_billing/${tid}`);
const rangosRef  = (tid) => tid === 'elegance'
  ? db.doc('configuracion/rangos')
  : db.doc(`tenants/${tid}/configuracion/rangos`);
const walletCfgRef = (tid) => tid === 'elegance'
  ? db.doc('configuracion/wallet')
  : db.doc(`tenants/${tid}/configuracion/wallet`);

// Multiplicador según día de la semana — leído de configuracion/wallet.reglasDia.
// Formato: { "1": 2, "3": 1.5, ... } donde 0=domingo, 1=lunes, ... 6=sábado.
// Falta el día o multiplicador ≤0 → 1 (sin efecto). Cap a 5× por defensa.
async function multiplicadorHoy(tid) {
  try {
    const s = await walletCfgRef(tid).get();
    if (!s.exists) return 1;
    const reglas = s.data().reglasDia || {};
    const dow = String(new Date().getDay());
    const m = Number(reglas[dow]);
    if (!Number.isFinite(m) || m <= 0) return 1;
    return Math.min(5, Math.max(1, m));
  } catch (_) { return 1; }
}

function usersCol(tenantId) {
  const isElegance = tenantId === 'elegance';
  const usersTid = marca.marcaAwareTenant(tenantId, 'users');
  return db.collection(isElegance ? 'users' : `tenants/${usersTid}/users`);
}

async function walletActivo(tid) {
  try {
    const s = await billingRef(tid).get();
    return s.exists ? s.data().walletActivo === true : false;
  } catch (_) { return false; }
}

// Espejo de sello-automatico.js: cuántos sellos por visita según rango.
function calcRangoId(historicos) {
  const h = Number(historicos) || 0;
  if (h >= 25) return 'platinum';
  if (h >= 10) return 'gold';
  return 'silver';
}
async function sellosPorVisita(tid, historicos) {
  try {
    const s = await rangosRef(tid).get();
    if (s.exists) {
      const id = calcRangoId(historicos);
      const r = (s.data().rangos || []).find((x) => x.id === id);
      const n = r ? Math.round(Number(r.sellosPorVisita)) : NaN;
      if (Number.isFinite(n) && n >= 0) return n;
    }
  } catch (e) {
    logger.warn(`[Staff sello] no se pudo leer rangos (${tid}): ${e.message}`);
  }
  return 1;
}

// ═══════════════════════════════════════════════════════════════
//  CALLABLE — staff suma sellos al escanear el QR del pase
// ═══════════════════════════════════════════════════════════════
exports.walletSumarSelloStaff = onCall(
  { region: 'us-central1', cors: true },
  async (request) => {
    const email  = String(request.auth?.token?.email || '').toLowerCase();
    const role   = request.auth?.token?.role;
    const claimT = request.auth?.token?.tenantId;
    const isSuper = SUPERADMINS.includes(email);

    const { tenantId, uid, cantidad, dedupeKey, nota } = request.data || {};
    if (!tenantId || typeof tenantId !== 'string') {
      throw new HttpsError('invalid-argument', 'tenantId requerido.');
    }
    if (!uid || typeof uid !== 'string') {
      throw new HttpsError('invalid-argument', 'uid del cliente requerido.');
    }

    // Auth: admin/jefe DEL tenant, o superadmin (SynapTech).
    const esStaffTenant = (role === 'admin' || role === 'jefe') && claimT === tenantId;
    if (!isSuper && !esStaffTenant) {
      throw new HttpsError('permission-denied', 'Solo el staff del local puede sumar sellos.');
    }

    // Gate de add-on (super exento).
    if (!isSuper && !(await walletActivo(tenantId))) {
      throw new HttpsError('failed-precondition', 'El módulo Wallet no está activo para este local.');
    }

    // Cantidad: si el cliente-side pasa un número > 0 lo respetamos (hasta 5);
    // si no, calculamos por rango como hace la agenda. Tope duro anti-typos.
    const uRef = usersCol(tenantId).doc(uid);
    const uSnap = await uRef.get();
    if (!uSnap.exists) {
      throw new HttpsError('not-found', 'Ese cliente no existe en este local.');
    }
    const u = uSnap.data() || {};

    // Fusiones: redirige al canónico si aplica (espejo de sello-automatico.js).
    let targetRef = uRef;
    let targetData = u;
    if (u.fusionadoCon && u.fusionadoCon !== uid) {
      targetRef = usersCol(tenantId).doc(u.fusionadoCon);
      const canonSnap = await targetRef.get();
      if (canonSnap.exists) targetData = canonSnap.data() || {};
      else targetRef = uRef; // canónico no existe → escribe en el original
    }
    if (targetData.noSumaSellos === true) {
      throw new HttpsError('failed-precondition', 'Este cliente está marcado como placeholder (no acumula sellos).');
    }

    const historicos = Number(targetData.sellosHistoricos ?? targetData.stamps) || 0;
    const nPedido = Number(cantidad);
    const nBase = Number.isFinite(nPedido) && nPedido > 0 && nPedido <= 5
      ? Math.round(nPedido)
      : await sellosPorVisita(tenantId, historicos);
    // Regla por día de la semana: si el dueño configuró un multiplicador
    // para hoy (ej. martes ×2 en horario valle), aplica AL FINAL sobre el
    // nBase. Cap 5× para no explotar el saldo por typo.
    const mult = await multiplicadorHoy(tenantId);
    const nSellos = Math.max(0, Math.round(nBase * mult));

    // Dedupe: evita doble tap del staff (mismo cliente en < N segundos).
    // Almacenamos las últimas 20 keys en el user doc.
    const dk = String(dedupeKey || `${uid}_${Math.floor(Date.now() / 30000)}`);
    const yaVisto = Array.isArray(targetData.staffStampsSeen) &&
      targetData.staffStampsSeen.some((e) => e && e.k === dk);
    if (yaVisto) {
      return { ok: true, duplicado: true, sellosNuevos: 0, sellosDisponibles: targetData.sellosDisponibles || 0 };
    }

    const sedeOrigen = marca.sedeIdFromLegacy(tenantId);
    const nowIso = Timestamp.now().toDate().toISOString();
    const historialEntry = {
      fecha: nowIso,
      tipo: 'suma',
      cantidad: nSellos,
      nota: nota || (mult > 1 ? `Sello sumado por el staff · multiplicador ×${mult} del día` : `Sello sumado por el staff`),
      staffEmail: email,
      origen: 'staff_wallet',
      ...(mult > 1 ? { multiplicadorDia: mult } : {}),
      ...(sedeOrigen ? { sedeId: sedeOrigen } : {}),
    };
    const seenEntry = { k: dk, ts: nowIso };

    const upd = {
      sellosDisponibles: FieldValue.increment(nSellos),
      sellosHistoricos:  FieldValue.increment(nSellos),
      stamps:            FieldValue.increment(nSellos),
      ultimoSello:       nowIso,
      historialSellos:   FieldValue.arrayUnion(historialEntry),
      staffStampsSeen:   FieldValue.arrayUnion(seenEntry),
    };
    if (sedeOrigen) upd[`sellosPorSede.${sedeOrigen}`] = FieldValue.increment(nSellos);

    await targetRef.update(upd);
    logger.info(`[Staff sello] +${nSellos} a ${tenantId}/${targetRef.id} por ${email}`);

    // Devolvemos el saldo post-op para que la UI del staff lo muestre al toque.
    // Re-leemos porque el increment ya fue aplicado atómicamente.
    let saldoPost = null;
    try {
      const post = await targetRef.get();
      saldoPost = Number(post.data()?.sellosDisponibles) || 0;
    } catch (_) {}

    return {
      ok: true,
      sellosNuevos: nSellos,
      sellosDisponibles: saldoPost,
      cliente: {
        nombre: targetData.nombre || targetData.displayName || 'Cliente',
        uid: targetRef.id,
      },
    };
  },
);
