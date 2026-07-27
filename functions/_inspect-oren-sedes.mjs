import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();

// 1) La cita del barbero fantasma
console.log('=== Cita del barbero fantasma (R2wnYOLQW7kNWAdkIDMO) ===');
const c = await db.doc('tenants/oren/citas/R2wnYOLQW7kNWAdkIDMO').get();
console.log(JSON.stringify(c.data(), null, 2));

// 2) Config main de Oren
console.log('\n=== configuracion/main de oren (campos de sede) ===');
const cfg = await db.doc('tenants/oren/configuracion/main').get();
const d = cfg.data() || {};
console.log('sucursales:', JSON.stringify(d.sucursales || [], null, 2));
console.log('multiSucursal:', d.multiSucursal);
console.log('sedeDefault:', d.sedeDefault);

// 3) Contar citas con sedeId vs sin
console.log('\n=== Cuántas citas en Oren tienen sedeId ===');
const citas = await db.collection('tenants/oren/citas').get();
let conSede = 0, sinSede = 0;
const sedes = new Map();
for (const doc of citas.docs) {
  const x = doc.data();
  if (x.sedeId) { conSede++; sedes.set(x.sedeId, (sedes.get(x.sedeId) || 0) + 1); }
  else sinSede++;
}
console.log(`Total citas: ${citas.size}`);
console.log(`Con sedeId: ${conSede}`);
console.log(`Sin sedeId: ${sinSede}`);
console.log(`Distribución sedes:`, Object.fromEntries(sedes));
