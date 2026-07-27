import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();
const T = 'delnero';
const M = 'ZZ_CLEANUP_TEST_';
let u=0, c=0, cli=0;
for (const d of (await db.collection(`tenants/${T}/users`).get()).docs) {
  const data = d.data();
  if ((data.nombre || '').includes(M) || (data.email || '').includes(M.toLowerCase())) { await d.ref.delete(); u++; }
}
for (const d of (await db.collection(`tenants/${T}/citas`).get()).docs) {
  const data = d.data();
  if ((data.clienteNombre || '').includes(M) || (data.clienteEmail || '').includes(M.toLowerCase())) { await d.ref.delete(); c++; }
}
for (const d of (await db.collection(`tenants/${T}/clientes`).get()).docs) {
  const data = d.data();
  if ((data.nombre || '').includes(M) || (data.email || '').includes(M.toLowerCase())) { await d.ref.delete(); cli++; }
}
console.log(`Borrado: ${u} users, ${c} citas, ${cli} clientes de test`);
