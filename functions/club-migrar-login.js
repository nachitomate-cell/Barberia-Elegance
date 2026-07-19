'use strict';

// functions/club-migrar-login.js
// ─────────────────────────────────────────────────────────────────
//  CLUB PASSWORDLESS — migración/aprovisionamiento de cuentas al vuelo
//
//  El Club es passwordless: el cliente entra SOLO con su email. Este
//  callable es el cerebro server-side cuando el login directo falla
//  (con Admin SDK = la verdad, sin los límites de enumeración):
//
//   1. Cuenta de STAFF/claims   → { existe:true, migrable:false }
//      (JAMÁS se toca: su clave real es su acceso a gestion-interna)
//   2. Cuenta de cliente        → password := clubPassword(tenant) →
//      { existe:true, migrado:true }. Cubre claves viejas Y cuentas
//      creadas con Google (se les agrega el proveedor password).
//   3. Sin cuenta, pero el email calza con un CLIENTE MIGRADO de
//      AgendaPro/Weibook (tenants/{tid}/clientes) → se crea la cuenta
//      Y su doc en users/ con los datos de la ficha →
//      { existe:true, migrado:true, creado:true }. Los triggers
//      dedupeOnCreate* fusionan sellos/historial legacy solos.
//   4. Sin cuenta y sin ficha   → { existe:false } (flujo registro:
//      nombre + teléfono + consentimiento clickwrap).
//
//  Modelo de seguridad: NO baja el nivel del producto — toda cuenta
//  nueva del Club ya se crea con la password interna (que vive en el
//  código del cliente). Email = identidad es la decisión de producto.
//
//  DEPLOY: firebase deploy --only functions:clubMigrarLogin
// ─────────────────────────────────────────────────────────────────

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');

const db = admin.firestore();

const SUPERADMINS = ['ignaciiio.mate@gmail.com'];

// Espejo EXACTO de clubPassword() en registro.html. Si se agrega un
// tenant con password propia allá, agregarlo acá también.
const CLUB_PASSWORDS = {
  lumen: 'DjonesLoyaltyPassword2026!',
  kronnos_penablanca: 'KronnosLoyaltyPassword2026!',
  kronnos_limache: 'KronnosLoyaltyPassword2026!',
  kronnos_woman: 'KronnosLoyaltyPassword2026!',
  yugen: 'YugenLoyaltyPassword2026!',
  sionbarberia: 'DieciseisLoyaltyPassword2026!',
  infinity: 'InfinityLoyaltyPassword2026!',
  estudioluxury: 'LuxuryLoyaltyPassword2026!',
};
const DEFAULT_PASSWORD = 'AuraLoyaltyPassword2026!';

// Rutas por tenant (espejo de lookup-cliente-migrado.js / registro.html).
const clientesCol = (tid) => db.collection(tid === 'elegance' ? 'clientes' : `tenants/${tid}/clientes`);
const usersCol    = (tid) => db.collection(tid === 'elegance' ? 'users'    : `tenants/${tid}/users`);

// Espejo de generateReferralCode() en registro.html.
function generarReferralCode(nombre) {
  const first = String(nombre || '').trim().split(/\s+/)[0] || '';
  const clean = first.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z]/g, '').toUpperCase();
  const prefix = (clean + 'XXXX').slice(0, 4);
  const suffix = String(Math.floor(1000 + Math.random() * 9000));
  return `${prefix}-${suffix}`;
}

exports.clubMigrarLogin = onCall({ region: 'us-central1', cors: true }, async (request) => {
  const email = String(request.data?.email || '').trim().toLowerCase();
  const tenantId = String(request.data?.tenantId || '').trim();
  const terminosVersion = String(request.data?.terminosVersion || '').slice(0, 20);
  const ua = String(request.data?.ua || '').slice(0, 500);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpsError('invalid-argument', 'Email inválido.');
  }
  const password = CLUB_PASSWORDS[tenantId] || DEFAULT_PASSWORD;

  // ── ¿Existe la cuenta Auth? ─────────────────────────────────────
  let user = null;
  try {
    user = await admin.auth().getUserByEmail(email);
  } catch (e) {
    if (e.code !== 'auth/user-not-found') {
      logger.error(`[Club migrar] getUserByEmail(${email}):`, e.message);
      throw new HttpsError('internal', 'No pudimos verificar tu cuenta. Intenta de nuevo.');
    }
  }

  if (user) {
    // Staff fuera SIEMPRE: su contraseña real protege el panel del local.
    const role = user.customClaims && user.customClaims.role;
    if (role || SUPERADMINS.includes(email)) {
      logger.info(`[Club migrar] rechazado (staff ${role || 'superadmin'}): ${email}`);
      return { existe: true, migrable: false };
    }
    await admin.auth().updateUser(user.uid, { password });
    logger.info(`[Club migrar] ${email} → passwordless (tenant ${tenantId || 'default'})`);
    return { existe: true, migrado: true };
  }

  // ── Sin cuenta Auth: ¿es un cliente migrado (AgendaPro/Weibook)? ──
  //  Si su ficha ya está en clientes/ con este email, aprovisionamos
  //  la cuenta completa server-side: entra directo, sin formulario.
  if (!tenantId) return { existe: false };
  let ficha = null;
  try {
    const snap = await clientesCol(tenantId).where('email', '==', email).limit(1).get();
    if (!snap.empty) ficha = { id: snap.docs[0].id, ...snap.docs[0].data() };
  } catch (e) {
    logger.warn(`[Club migrar] lookup clientes (${tenantId}) falló: ${e.message}`);
  }
  if (!ficha) return { existe: false };

  const nombre = String(ficha.nombre || '').trim();
  const telefono = String(ficha.telefono || ficha.id || '').trim();
  const digs = telefono.replace(/\D+/g, '');
  const suf9 = digs.length >= 9 ? digs.slice(-9) : '';

  let nuevo;
  try {
    nuevo = await admin.auth().createUser({
      email,
      password,
      ...(nombre ? { displayName: nombre } : {}),
    });
  } catch (e) {
    logger.error(`[Club migrar] createUser(${email}):`, e.message);
    throw new HttpsError('internal', 'No pudimos crear tu cuenta. Intenta de nuevo.');
  }

  // Doc en users/ — espejo de ensureUserDoc (registro.html). Al crearse,
  // los triggers dedupeOnCreate* fusionan sellos/historial del legacy.
  try {
    const data = {
      nombre: nombre || '',
      email,
      telefono,
      ...(suf9 ? { telefonoSuf9: suf9 } : {}),
      photoURL: null,
      stamps: 0,
      creadoEn: FieldValue.serverTimestamp(),
      // Evidencia de consentimiento (Ley 19.628 art. 4 / 21.719 art. 12):
      // clickwrap del botón "Ingresar" (el login declara la aceptación).
      aceptoTerminosAt: FieldValue.serverTimestamp(),
      aceptoPrivacidadAt: FieldValue.serverTimestamp(),
      ...(terminosVersion ? { terminosVersion } : {}),
      ...(ua ? { userAgentSignup: ua } : {}),
      signupMetodo: 'email-migrado',
      waOptIn: true,
      waOptInAt: FieldValue.serverTimestamp(),
      waOptInMetodo: 'email-migrado',
      referralCode: generarReferralCode(nombre || 'CLUB'),
      importadoDeFicha: true,
    };
    await usersCol(tenantId).doc(nuevo.uid).set(data);
  } catch (e) {
    // La cuenta Auth ya existe: el login igual funcionará y ensureUserDoc
    // del cliente crea el doc como red de seguridad.
    logger.warn(`[Club migrar] users doc (${tenantId}/${nuevo.uid}) falló: ${e.message}`);
  }

  logger.info(`[Club migrar] cuenta APROVISIONADA desde ficha: ${email} (tenant ${tenantId})`);
  return { existe: true, migrado: true, creado: true };
});
