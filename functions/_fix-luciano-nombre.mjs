import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();
const { _upsertClienteCore } = require('./upsert-cliente.js');

const res = await _upsertClienteCore({
  tenantId: 'aura',
  nombre: 'Luciano Arroyo',
  email: 'lucianogarroyo@gmail.com',
  telefono: '+56947564309',
});
console.log('upsert result:', res);

// Verificar user post-fix
const u = await db.doc(`tenants/aura/users/${res.uid}`).get();
if (u.exists) {
  const ud = u.data();
  console.log(`\nUser ${res.uid} post-fix:`);
  console.log(`  nombre: "${ud.nombre}"`);
  console.log(`  email:  "${ud.email}"`);
  console.log(`  tel:    "${ud.telefono}"`);
}
