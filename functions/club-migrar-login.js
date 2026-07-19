'use strict';

// functions/club-migrar-login.js
// ─────────────────────────────────────────────────────────────────
//  CLUB PASSWORDLESS — migración de cuentas al vuelo (login directo)
//
//  Problema: el Club es passwordless (registro.html entra con una
//  password interna por tenant), pero las cuentas viejas (clave
//  propia) y las creadas con Google no la tienen. Además, con la
//  protección anti-enumeración de Firebase, el cliente NO puede
//  saber si una cuenta existe (fetchSignInMethodsForEmail responde
//  vacío siempre) → clientes reales terminaban en "crear cuenta" y
//  chocaban con email-already-in-use. Lockout.
//
//  Solución: cuando el login passwordless falla, registro.html llama
//  este callable. Con Admin SDK (la verdad, sin enumeración-limits):
//    · cuenta no existe        → { existe:false }  (flujo registro)
//    · cuenta de STAFF/claims  → { existe:true, migrable:false }
//      (JAMÁS se toca: su clave real es su acceso a gestion-interna)
//    · cuenta de cliente       → password := clubPassword(tenant) y
//      { existe:true, migrado:true } → el cliente reintenta y entra.
//
//  Modelo de seguridad: NO baja el nivel del producto — toda cuenta
//  nueva del Club ya se crea con esta misma password interna (que
//  vive en el código del cliente). Esto solo lleva las cuentas
//  legacy/Google al mismo estándar passwordless ya decidido.
//
//  DEPLOY: firebase deploy --only functions:clubMigrarLogin
// ─────────────────────────────────────────────────────────────────

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');

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

exports.clubMigrarLogin = onCall({ region: 'us-central1', cors: true }, async (request) => {
  const email = String(request.data?.email || '').trim().toLowerCase();
  const tenantId = String(request.data?.tenantId || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpsError('invalid-argument', 'Email inválido.');
  }

  let user;
  try {
    user = await admin.auth().getUserByEmail(email);
  } catch (e) {
    if (e.code === 'auth/user-not-found') return { existe: false };
    logger.error(`[Club migrar] getUserByEmail(${email}):`, e.message);
    throw new HttpsError('internal', 'No pudimos verificar tu cuenta. Intenta de nuevo.');
  }

  // Staff fuera SIEMPRE: su contraseña real protege el panel del local.
  const role = user.customClaims && user.customClaims.role;
  if (role || SUPERADMINS.includes(email)) {
    logger.info(`[Club migrar] rechazado (staff ${role || 'superadmin'}): ${email}`);
    return { existe: true, migrable: false };
  }

  const password = CLUB_PASSWORDS[tenantId] || DEFAULT_PASSWORD;
  await admin.auth().updateUser(user.uid, { password });
  logger.info(`[Club migrar] ${email} → passwordless (tenant ${tenantId || 'default'})`);
  return { existe: true, migrado: true };
});
