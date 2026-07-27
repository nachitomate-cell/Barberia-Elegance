// Verifica idempotencia: 5 llamadas concurrentes al CF con MISMOS datos
// deben resultar en 1 solo user + los 5 devuelven el mismo uid.
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();
const { _upsertClienteCore } = require('./upsert-cliente.js');

const T = 'delnero';
const EMAIL = 'test.pub.a@delnero.cl';
const TEL   = '+56977166655';
const NOMBRE = 'Test Publico A';

console.log(`\nCorriendo 5 llamadas concurrentes al CF con MISMOS datos...`);
const results = await Promise.all(Array.from({length:5}, () =>
  _upsertClienteCore({ tenantId: T, nombre: NOMBRE, email: EMAIL, telefono: TEL })
));
results.forEach((r, i) => {
  console.log(`  ${i+1}. uid=${r.uid}  wasCreated=${r.wasCreated}  wasMerged=${r.wasMerged}  matchedBy=${r.matchedBy}`);
});
const uniqueUids = new Set(results.map(r => r.uid));
console.log(`\nUIDs únicos devueltos: ${uniqueUids.size}  ${uniqueUids.size === 1 ? '✓' : '✗'}`);

// Confirmar en Firestore
const usersSnap = await db.collection(`tenants/${T}/users`).get();
const matches = usersSnap.docs.filter(d => (d.data().email || '') === EMAIL);
console.log(`Users en Firestore con ese email: ${matches.length}  ${matches.length === 1 ? '✓' : '✗'}`);
matches.forEach(d => console.log(`  ${d.id}`));
