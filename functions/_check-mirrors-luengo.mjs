import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();

console.log(`\nMirrors clientes/ de Luengo en aura (full data):\n`);
const snap = await db.collection('tenants/aura/clientes').get();
snap.docs.forEach(d => {
  const data = d.data();
  if ((data.nombre || '').toLowerCase().includes('luengo')) {
    console.log(`─ docId=${d.id}`);
    console.log(`    nombre="${data.nombre}"`);
    console.log(`    email="${data.email || ''}"`);
    console.log(`    tel="${data.telefono || ''}"`);
    console.log(`    uid="${data.uid || '(no field)'}"`);
    console.log(`    isLegacy (uid===id)? ${data.uid === d.id}`);
    console.log('');
  }
});
