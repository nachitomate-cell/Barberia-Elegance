'use strict';

// functions/referidos.js
// ─────────────────────────────────────────────────────────────────────────────
//  PROGRAMA DE REFERIDOS B2B — SaaS growth loop
//
//  Cada tenant tiene un código único (ej. ELEGANCE-K3X9). Cuando comparte el
//  link /refiere/<codigo>, los prospectos llenan un formulario público que
//  cae en _referralSignups. El super-admin convierte el signup cuando el
//  prospecto efectivamente se vuelve cliente pagador, y eso suma 1 mes
//  gratis tanto al referidor como al nuevo tenant.
//
//  Tres callables:
//
//    1. referidosAsegurarCodigo  (auth requerida, tenant-owner / super-admin)
//       Devuelve el código del tenant. Si no existe, lo crea (y escribe el
//       índice inverso _referralCodes/<CODE> para lookup público).
//
//    2. referidosCrearSignup     (sin auth — formulario público)
//       Crea un _referralSignups con los datos del prospecto, validando el
//       código contra _referralCodes. Incrementa el contador del referidor.
//
//    3. referidosMarcarConvertido (super-admin solamente)
//       Marca el signup como 'converted'. Suma 1 mes gratis al referidor.
//       Si se incluye `convertedTenantId`, también suma 1 mes al nuevo
//       tenant ("bienvenida").
//
//  Modelo Firestore:
//    _referrals/{tenantId}          { code, tenantName, signupsCount,
//                                    conversionsCount, freeMonthsEarned,
//                                    welcomeMonthsEarned, updatedAt }
//    _referralCodes/{CODE}          { tenantId, tenantName, active }
//    _referralSignups/{signupId}    { code, referrerTenantId, prospect*,
//                                    status, createdAt, convertedAt?,
//                                    convertedTenantId?, monthsAwarded? }
//
//  DEPLOY: firebase deploy --only functions:referidosAsegurarCodigo,functions:referidosCrearSignup,functions:referidosMarcarConvertido
// ─────────────────────────────────────────────────────────────────────────────

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger }             = require('firebase-functions');
const admin                  = require('firebase-admin');
const { FieldValue }         = require('firebase-admin/firestore');

const db = admin.firestore();

// Lista de emails super-admin (sincronizada con esBootstrap en firestore.rules).
const SUPERADMIN_EMAILS = new Set([
  'ignaciiio.mate@gmail.com',
  'barrazanicolasfabian@gmail.com',
]);

function esSuperAdmin(auth) {
  return !!auth?.token?.email && SUPERADMIN_EMAILS.has(String(auth.token.email).toLowerCase());
}

/* ─────────────────────────── Helpers ─────────────────────────── */

/** Slug ASCII en MAYÚSCULAS sin caracteres confusos. Máx 10 chars. */
function slugTenantName(name) {
  const base = String(name || 'tenant')
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // quita tildes
    .replace(/[^a-zA-Z0-9]/g, '')                     // solo alfanum
    .toUpperCase()
    .slice(0, 10);
  return base || 'TENANT';
}

/** 4 chars random de un alfabeto sin caracteres ambiguos (0/O, 1/I). */
function sufijoRandom() {
  const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 4; i++) out += ALPHA.charAt(Math.floor(Math.random() * ALPHA.length));
  return out;
}

/** Construye un código único probando hasta N veces. Lanza si no logra. */
async function generarCodigoUnico(tenantName) {
  const base = slugTenantName(tenantName);
  for (let intento = 0; intento < 8; intento++) {
    const code = `${base}-${sufijoRandom()}`;
    const snap = await db.collection('_referralCodes').doc(code).get();
    if (!snap.exists) return code;
  }
  throw new HttpsError('internal', 'No se pudo generar un código único, intenta otra vez.');
}

/** Resuelve nombre legible del tenant para mostrar en la landing. */
async function nombreTenant(tenantId) {
  // Múltiples fuentes posibles: _system/<tid>.nombre, o _billing, o seed.
  const sys = await db.collection('_system').doc(tenantId).get();
  if (sys.exists && sys.data().nombre) return String(sys.data().nombre);
  // Fallback: capitaliza el tenantId.
  return tenantId.charAt(0).toUpperCase() + tenantId.slice(1);
}

/* ─────────────────────────── Callables ─────────────────────────── */

/**
 * 1. Asegura que el tenant del usuario autenticado (o el `tenantId` que pasa
 *    un super-admin) tenga un código de referido. Si ya existe, lo devuelve;
 *    si no, lo crea y escribe el índice inverso.
 *
 *    Input:  { tenantId?: string }   ← solo super-admin puede pasarlo
 *    Output: { code, tenantId, tenantName, shareUrl }
 */
exports.referidosAsegurarCodigo = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Inicia sesión.');

  const callerTid = req.auth.token?.tenantId || '';
  const callerRol = req.auth.token?.role || '';
  const inputTid = String(req.data?.tenantId || '').trim();
  const superadmin = esSuperAdmin(req.auth);

  // Resolución de tenantId:
  //  - super-admin puede pedirlo para cualquier tenant
  //  - resto: solo el suyo, y solo si es admin/jefe
  let tenantId;
  if (superadmin && inputTid) {
    tenantId = inputTid;
  } else if (callerTid && ['admin', 'jefe'].includes(callerRol)) {
    tenantId = callerTid;
  } else {
    throw new HttpsError('permission-denied', 'Solo administradores pueden generar el código.');
  }

  const refDoc = db.collection('_referrals').doc(tenantId);
  const existing = await refDoc.get();
  if (existing.exists && existing.data().code) {
    const d = existing.data();
    return {
      code: d.code,
      tenantId,
      tenantName: d.tenantName || (await nombreTenant(tenantId)),
      shareUrl: `https://bioo.cl/refiere/${d.code}`,
    };
  }

  const tenantName = await nombreTenant(tenantId);
  const code = await generarCodigoUnico(tenantName);

  // Doble escritura atómica: contador + índice inverso.
  const batch = db.batch();
  batch.set(refDoc, {
    code,
    tenantId,
    tenantName,
    signupsCount: 0,
    conversionsCount: 0,
    freeMonthsEarned: 0,
    welcomeMonthsEarned: 0,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  batch.set(db.collection('_referralCodes').doc(code), {
    tenantId,
    tenantName,
    active: true,
    createdAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();

  logger.info(`[referidos] código emitido tid=${tenantId} code=${code}`);
  return { code, tenantId, tenantName, shareUrl: `https://bioo.cl/refiere/${code}` };
});

/**
 * 2. Crea un signup público desde la landing /refiere/<code>. No requiere
 *    sesión. Valida el código contra _referralCodes y rate-limita en cliente
 *    (App Check no está montado aún, lo dejamos para V2).
 *
 *    Input:  { code, name, barberia, email, phone, city?, message? }
 *    Output: { ok: true, signupId, tenantName }
 */
exports.referidosCrearSignup = onCall(async (req) => {
  const raw = req.data || {};
  const code = String(raw.code || '').trim().toUpperCase();
  const name = String(raw.name || '').trim().slice(0, 80);
  const barberia = String(raw.barberia || '').trim().slice(0, 80);
  const email = String(raw.email || '').trim().toLowerCase().slice(0, 120);
  const phone = String(raw.phone || '').trim().slice(0, 40);
  const city = String(raw.city || '').trim().slice(0, 60);
  const message = String(raw.message || '').trim().slice(0, 400);

  if (!code || !/^[A-Z0-9-]{6,16}$/.test(code)) {
    throw new HttpsError('invalid-argument', 'Código de referido inválido.');
  }
  if (!name || !barberia || (!email && !phone)) {
    throw new HttpsError('invalid-argument', 'Faltan datos del prospecto.');
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpsError('invalid-argument', 'Email inválido.');
  }

  const codeSnap = await db.collection('_referralCodes').doc(code).get();
  if (!codeSnap.exists || codeSnap.data().active === false) {
    throw new HttpsError('not-found', 'Ese código no existe o está deshabilitado.');
  }
  const { tenantId: referrerTenantId, tenantName: referrerTenantName } = codeSnap.data();

  const signupRef = db.collection('_referralSignups').doc();
  const referrerRef = db.collection('_referrals').doc(referrerTenantId);

  await db.runTransaction(async (tx) => {
    tx.set(signupRef, {
      code,
      referrerTenantId,
      referrerTenantName: referrerTenantName || null,
      prospectName: name,
      prospectBarberia: barberia,
      prospectEmail: email || null,
      prospectPhone: phone || null,
      prospectCity: city || null,
      prospectMessage: message || null,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
      // Antifrau ligero — guarda el IP/UA para auditoría (sin PII pesada).
      meta: {
        ua: String(req.rawRequest?.headers?.['user-agent'] || '').slice(0, 180),
        ip: String(req.rawRequest?.headers?.['x-forwarded-for'] || '').split(',')[0].trim().slice(0, 45),
      },
    });
    tx.set(referrerRef, {
      signupsCount: FieldValue.increment(1),
      lastSignupAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });

  logger.info(`[referidos] signup creado code=${code} from=${barberia}`);
  return { ok: true, signupId: signupRef.id, tenantName: referrerTenantName || referrerTenantId };
});

/**
 * 3. Super-admin marca un signup como convertido. Suma 1 mes gratis al
 *    referidor y, si se entrega `convertedTenantId`, también al nuevo tenant.
 *
 *    Input:  { signupId, convertedTenantId?, monthsAwarded?: number }
 *    Output: { ok: true, freeMonthsEarned, welcomeMonthsEarned }
 */
exports.referidosMarcarConvertido = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Inicia sesión.');
  if (!esSuperAdmin(req.auth)) {
    throw new HttpsError('permission-denied', 'Solo super-admin.');
  }

  const signupId = String(req.data?.signupId || '').trim();
  const newTid = String(req.data?.convertedTenantId || '').trim();
  const months = Math.max(1, Math.min(12, parseInt(req.data?.monthsAwarded ?? 1, 10) || 1));
  if (!signupId) throw new HttpsError('invalid-argument', 'Falta signupId.');

  const signupRef = db.collection('_referralSignups').doc(signupId);
  const snap = await signupRef.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Signup no encontrado.');
  const sd = snap.data();
  if (sd.status === 'converted') {
    throw new HttpsError('failed-precondition', 'Este signup ya estaba convertido.');
  }
  const referrerTid = sd.referrerTenantId;

  let earnedAfter = 0;
  let welcomeAfter = 0;
  await db.runTransaction(async (tx) => {
    // Referidor: +1 mes gratis + 1 conversión.
    const referrerRef = db.collection('_referrals').doc(referrerTid);
    const refSnap = await tx.get(referrerRef);
    earnedAfter = (refSnap.data()?.freeMonthsEarned ?? 0) + months;
    tx.set(referrerRef, {
      freeMonthsEarned: FieldValue.increment(months),
      conversionsCount: FieldValue.increment(1),
      lastConversionAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    // Nuevo tenant: 1 mes de bienvenida (solo si nos dieron su id).
    if (newTid) {
      const newRef = db.collection('_referrals').doc(newTid);
      const newSnap = await tx.get(newRef);
      welcomeAfter = (newSnap.data()?.welcomeMonthsEarned ?? 0) + months;
      tx.set(newRef, {
        welcomeMonthsEarned: FieldValue.increment(months),
        broughtBy: referrerTid,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    }

    tx.update(signupRef, {
      status: 'converted',
      convertedAt: FieldValue.serverTimestamp(),
      convertedTenantId: newTid || null,
      monthsAwarded: months,
    });
  });

  logger.info(`[referidos] convertido signupId=${signupId} ref=${referrerTid} nuevo=${newTid}`);
  return { ok: true, freeMonthsEarned: earnedAfter, welcomeMonthsEarned: welcomeAfter };
});
