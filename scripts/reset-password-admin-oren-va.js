/**
 * reset-password-admin-oren-va.js — Cambia la password del admin de Villa
 * Alemana (contacto@snackhub.cl) a una simple y memorable, para que sea
 * más fácil de comunicar. El user ya existe; solo se pisa la password.
 */
const path  = require('path');
const admin = require('firebase-admin');

const sa = require(path.resolve(__dirname, '..', 'service-account.json'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const auth = admin.auth();

const EMAIL        = 'contacto@snackhub.cl';
const NEW_PASSWORD = 'Snackhub2026';

async function main() {
  const u = await auth.getUserByEmail(EMAIL);
  await auth.updateUser(u.uid, { password: NEW_PASSWORD });
  console.log(`\n  ✓ Password actualizada.`);
  console.log(`     usuario  : ${EMAIL}`);
  console.log(`     password : ${NEW_PASSWORD}\n`);
}

main().catch(e => { console.error('\n✗ ERROR:', e); process.exit(1); });
