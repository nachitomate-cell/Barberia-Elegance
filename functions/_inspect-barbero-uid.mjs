import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();

const BUID = '2T8cPwontUOGbfKtDSbyW7vuTwy1';
const dRef = await db.doc(`tenants/oren/barberos/${BUID}`).get();
console.log(`barberos/${BUID}  exists=${dRef.exists}`);
if (dRef.exists) console.log('  data:', JSON.stringify(dRef.data(), null, 2));

console.log('\n=== TODOS los barberos de oren ===');
const all = await db.collection('tenants/oren/barberos').get();
console.log('Total:', all.size, '\n');
for (const d of all.docs) {
  const b = d.data();
  console.log(`  ${d.id}`);
  console.log(`     nombre="${b.nombre || b.displayName || '(SIN NOMBRE)'}"  authUid=${b.authUid || b.uid || '-'}`);
  console.log(`     sucursales=${JSON.stringify(b.sucursales || [])}  sedeId=${b.sedeId || '-'}`);
}
