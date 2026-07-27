import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();
const T = 'delnero';
let u = 0;
for (const d of (await db.collection(`tenants/${T}/users`).get()).docs) {
  const data = d.data();
  const nom = (data.nombre || '').toLowerCase();
  const em  = (data.email || '').toLowerCase();
  if (nom.includes('zz_test_dedup') || em.includes('zz_test_dedup')) {
    await d.ref.delete();
    console.log(`  del ${d.id} · "${data.nombre}"`);
    u++;
  }
}
console.log(`Borrados: ${u} users residuales`);
