// Setup cartera propia (modelo Pablo) sobre Vicente Maira en delnero sandbox.
// Sufijo "cp" + arriendo en 3 servicios comunes. Idempotente.
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();

const T = 'delnero';
const VICENTE_ID = 'BmGjJ3AcdJqjnqx4OfMn';

const arriendo = {
  '3wyong4KzWz45QzmftpW': 8000,  // Corte degradado ($12.000) → barbero se queda $4.000
  'VBCV8zR9LzixtECZQkJE': 3000,  // Barba ($5.000)            → barbero se queda $2.000
  'd63OiwY5j3Vu27q58hYv': 10000, // Corte + Barba ($16.000)   → barbero se queda $6.000
};

const ref = db.doc(`tenants/${T}/barberos/${VICENTE_ID}`);
const snap = await ref.get();
if (!snap.exists) {
  console.log('ERROR: Vicente no existe.');
  process.exit(1);
}

await ref.set({
  sufijoClientePropio: 'cp',
  arriendoPorServicio: arriendo,
}, { merge: true });

const after = (await ref.get()).data();
console.log('✓ Cartera configurada en delnero → Vicente Maira');
console.log('  sufijo:', JSON.stringify(after.sufijoClientePropio));
console.log('  arriendoPorServicio:');
Object.entries(after.arriendoPorServicio || {}).forEach(([sid, monto]) => {
  console.log(`    ${sid}: $${Number(monto).toLocaleString('es-CL')}`);
});
