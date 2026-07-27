import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();
const T = 'delnero';

const match = (s) => (s || '').toLowerCase().includes('peek.test') || (s || '').toLowerCase().includes('prueba peek');

let u = 0, c = 0;
for (const d of (await db.collection(`tenants/${T}/users`).get()).docs) {
  const data = d.data();
  if (match(data.nombre) || match(data.email)) { await d.ref.delete(); u++; }
}
for (const d of (await db.collection(`tenants/${T}/clientes`).get()).docs) {
  const data = d.data();
  if (match(data.nombre) || match(data.email)) { await d.ref.delete(); c++; }
}
// También cuentas Firebase Auth de prueba (residuales)
console.log(`Borrados: ${u} users + ${c} clientes en delnero`);
console.log(`\nNota: las cuentas Firebase Auth (peek.test@, peek.test2@, peek.test3@) quedan.`);
console.log(`Si querés borrarlas, hay que hacerlo desde Auth Console o vía admin.auth().deleteUser().`);
