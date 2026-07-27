import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();
const T = 'delnero';

// Borra users y citas que matcheen los nombres/emails de los tests manuales
const match = (s) => {
  const x = (s || '').toLowerCase();
  return x.includes('test upsert') || x.includes('test hermano') || x.includes('upsert wire');
};

const usersSnap = await db.collection(`tenants/${T}/users`).get();
let uDel = 0;
for (const d of usersSnap.docs) {
  const data = d.data();
  if (match(data.nombre) || match(data.email)) {
    await d.ref.delete();
    console.log(`  del user ${d.id} · "${data.nombre}"`);
    uDel++;
  }
}
const citasSnap = await db.collection(`tenants/${T}/citas`).get();
let cDel = 0;
for (const d of citasSnap.docs) {
  const data = d.data();
  if (match(data.clienteNombre) || match(data.clienteEmail)) {
    await d.ref.delete();
    console.log(`  del cita ${d.id} · "${data.clienteNombre}" · ${data.fecha} ${data.hora}`);
    cDel++;
  }
}
console.log(`\nBorrados: ${uDel} users, ${cDel} citas`);
