// _fix-max-oren-a-renaca.mjs — corrige el mismatch causado por
// _backfill-oren-sucursales.mjs: mandé 12 citas de Max a villaalemana
// cuando en realidad Max trabajó siempre en Reñaca.
//
// Detecto por marca: cita.backfilledSucursalAt existe Y barberoId ∈ MAX_IDS
// Y sucursalId==='villaalemana'. Las devuelvo a 'renaca'.

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const APPLY = process.argv.includes('--apply');
const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();

const MAX_IDS = new Set(['oren-max-villa', 'oren-max-renaca', 'WkcTvw9HHGV2NVu4hoNwDImNfA72']);
const citas = await db.collection('tenants/oren/citas').get();

const toFix = [];
for (const d of citas.docs) {
  const c = d.data();
  if (!MAX_IDS.has(c.barberoId)) continue;
  if (!c.backfilledSucursalAt) continue;   // solo las que TOCÓ mi backfill
  if (c.sucursalId !== 'villaalemana') continue;
  toFix.push({ id: d.id, fecha: c.fecha, hora: c.hora, cliente: c.clienteNombre });
}

console.log(`\nCitas de Max a corregir (villaalemana → renaca): ${toFix.length}`);
for (const t of toFix) console.log(`  • ${t.id}  ${t.fecha} ${t.hora}  "${t.cliente}"`);

if (!APPLY) {
  console.log(`\n(dry-run) --apply para ejecutar\n`);
  process.exit(0);
}

const batch = db.batch();
for (const t of toFix) {
  batch.update(db.doc(`tenants/oren/citas/${t.id}`), {
    sucursalId: 'renaca',
    sucursalNombre: 'Oren Barber Reñaca',
    corregidoMaxRenacaAt: FieldValue.serverTimestamp(),
  });
}
await batch.commit();
console.log(`\n✅ ${toFix.length} cita(s) corregidas\n`);
