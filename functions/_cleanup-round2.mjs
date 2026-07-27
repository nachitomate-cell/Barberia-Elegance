import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();
const T = 'delnero';
const match = (s) => {
  const x = (s || '').toLowerCase();
  return x === 'test a' || x.includes('hermano') || x.includes('test.a@') || x.includes('test.hermano@');
};
let u=0, c=0;
for (const d of (await db.collection(`tenants/${T}/users`).get()).docs) {
  const data = d.data();
  if (match(data.nombre) || match(data.email)) { await d.ref.delete(); u++; }
}
for (const d of (await db.collection(`tenants/${T}/citas`).get()).docs) {
  const data = d.data();
  if (match(data.clienteNombre) || match(data.clienteEmail)) { await d.ref.delete(); c++; }
}
console.log(`Borrados: ${u} users, ${c} citas`);
