import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();
const T = 'delnero';
const match = (s) => {
  const x = (s || '').toLowerCase();
  return x.includes('test publico') || x.includes('test.pub');
};
let u=0, c=0;
for (const d of (await db.collection(`tenants/${T}/users`).get()).docs) {
  const data = d.data();
  if (match(data.nombre) || match(data.email) || (data.telefono || '').includes('977166655')) {
    await d.ref.delete(); u++;
  }
}
for (const d of (await db.collection(`tenants/${T}/citas`).get()).docs) {
  const data = d.data();
  if (match(data.clienteNombre) || (data.clienteTelefono || '').includes('977166655')) {
    await d.ref.delete(); c++;
  }
}
for (const d of (await db.collection(`tenants/${T}/clientes`).get()).docs) {
  const data = d.data();
  if (match(data.nombre) || match(data.email) || (data.telefono || '').includes('977166655')) {
    await d.ref.delete();
  }
}
console.log(`Borrados: ${u} users, ${c} citas en delnero (round 1 de Task 5)`);
