// _backfill-telefonoSuf9-ac.mjs
// Agrega el campo `telefonoSuf9` (últimos 9 dígitos) a todos los users con
// docId 'ac_*' que aún no lo tienen. Sin esto, linkLegacyTenant no fusiona
// walk-ins cuando el cliente después se registra con email distinto pero
// mismo teléfono (caso Jordan Zamora en aura).
//
// USO:
//   node _backfill-telefonoSuf9-ac.mjs                # dry-run
//   node _backfill-telefonoSuf9-ac.mjs --apply        # ejecuta
//   node _backfill-telefonoSuf9-ac.mjs --apply --tenant=aura

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const args = Object.fromEntries(
  process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);
const APPLY  = args.apply === true;
const ONLY   = args.tenant || null;

const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();

console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
console.log(`║  BACKFILL telefonoSuf9 en ac_* users ${APPLY ? '⚠️  APPLY  ' : '(DRY-RUN)'}`);
console.log(`╚══════════════════════════════════════════════════════════════╝\n`);

async function tenantIds() {
  // enumera tenants explícitamente. Complementa con elegance (raíz).
  const tenantDocs = await db.collection('tenants').listDocuments();
  const ids = tenantDocs.map(d => d.id).sort();
  return ONLY ? [ONLY] : [...ids, 'elegance'];
}

const tenants = await tenantIds();
console.log(`Tenants a procesar: ${tenants.length} [${tenants.join(', ')}]\n`);

let totalCandidatos = 0;
let totalActualizados = 0;

for (const tid of tenants) {
  const usersCol = tid === 'elegance'
    ? db.collection('users')
    : db.collection(`tenants/${tid}/users`);
  const snap = await usersCol.get();
  const candidatos = snap.docs.filter(d => {
    if (!d.id.startsWith('ac_')) return false;
    const data = d.data();
    if (data.telefonoSuf9) return false;
    const tel = data.telefono || '';
    const digs = String(tel).replace(/\D+/g, '');
    return digs.length >= 9;
  });
  if (candidatos.length === 0) continue;
  totalCandidatos += candidatos.length;
  console.log(`  ${tid.padEnd(28)}  ${String(candidatos.length).padStart(4)} ac_* sin telefonoSuf9`);

  if (APPLY) {
    // batches de 400
    for (let i = 0; i < candidatos.length; i += 400) {
      const chunk = candidatos.slice(i, i + 400);
      const batch = db.batch();
      for (const d of chunk) {
        const digs = String(d.data().telefono || '').replace(/\D+/g, '');
        const suf9 = digs.slice(-9);
        batch.update(d.ref, {
          telefonoSuf9: suf9,
          backfilledSuf9At: FieldValue.serverTimestamp(),
        });
      }
      await batch.commit();
      totalActualizados += chunk.length;
    }
  }
}

console.log(`\n─────────────────────────────────────────────`);
console.log(`Total candidatos: ${totalCandidatos}`);
if (APPLY) console.log(`Total actualizados: ${totalActualizados}`);
else       console.log(`(dry-run) --apply para ejecutar`);
