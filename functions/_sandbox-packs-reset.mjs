// Resetea el cliente de prueba: borra sus packs activos + borra sus
// citas de prueba + limpia logs de packConsumos.
// Útil para repetir el flujo del checklist desde cero sin borrar la
// config del sandbox (los servicios se mantienen).
//
// Uso:
//   node _sandbox-packs-reset.mjs           → dry-run
//   node _sandbox-packs-reset.mjs --apply

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const APPLY = process.argv.includes('--apply');
const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();

const TENANT = 'delnero';
const CLIENTE_UID = '56999888777';
const CLIENTE_TEL = '+56 9 9988 8777';

console.log(APPLY ? '=== APPLY ===' : '=== DRY-RUN ===\n');

// Citas del cliente
const citasSnap = await db.collection(`tenants/${TENANT}/citas`)
  .where('clienteTelefono', '==', CLIENTE_TEL)
  .get();

// Logs del cliente
const logsSnap = await db.collection(`tenants/${TENANT}/packConsumos`)
  .where('userId', '==', CLIENTE_UID)
  .get();

console.log(`  Citas a borrar:        ${citasSnap.size}`);
console.log(`  Logs a borrar:         ${logsSnap.size}`);
console.log(`  Cliente:               packsActivos → []  (doc preservado)`);

if (!APPLY) {
  console.log('\n(dry-run) para aplicar: node _sandbox-packs-reset.mjs --apply');
  process.exit(0);
}

const batch = db.batch();
for (const d of citasSnap.docs) batch.delete(d.ref);
for (const d of logsSnap.docs) batch.delete(d.ref);
batch.update(db.doc(`tenants/${TENANT}/users/${CLIENTE_UID}`), { packsActivos: [], updatedAt: FieldValue.serverTimestamp() });
await batch.commit();

console.log('\n✓ Reset completo. Podés arrancar el checklist de nuevo desde el paso 1.');
