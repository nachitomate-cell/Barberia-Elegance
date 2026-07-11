#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════
 *  scripts/set-password-staff.js
 *  ─────────────────────────────────────────────────────────────
 *  Fija directamente la contraseña de un usuario Firebase Auth por
 *  email. Usa Admin SDK — bypaseando la CF cambiarPasswordStaff
 *  (útil cuando el deploy aún no terminó, o para one-shots).
 *
 *  Uso:
 *    node scripts/set-password-staff.js <email> <nueva-password>
 *
 *  Ejemplo:
 *    node scripts/set-password-staff.js claudio.burgos91@gmail.com 123456
 *
 *  Además revoca los refresh tokens del usuario → si tenía sesión
 *  abierta, se cerrará en el siguiente refresh (dentro de 1h).
 * ═══════════════════════════════════════════════════════════════ */
const path  = require('path');
const admin = require('firebase-admin');

const sa = require(path.resolve(__dirname, '..', 'service-account.json'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });

async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password) {
    console.error('Uso: node scripts/set-password-staff.js <email> <password>');
    process.exit(1);
  }
  if (password.length < 6) {
    console.error('La contraseña debe tener al menos 6 caracteres.');
    process.exit(1);
  }

  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().updateUser(user.uid, { password });
    await admin.auth().revokeRefreshTokens(user.uid);
    console.log(`✓ Contraseña actualizada para ${email}`);
    console.log(`  UID:  ${user.uid}`);
    console.log(`  Sesiones activas revocadas (deberá loguearse de nuevo).`);
  } catch (e) {
    if (e.code === 'auth/user-not-found') {
      console.error(`✗ No existe una cuenta con el email ${email}`);
    } else {
      console.error('✗', e.message);
    }
    process.exit(1);
  }
}

main().then(() => process.exit(0));
