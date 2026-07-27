import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();

const citas = await db.collection('tenants/oren/citas').get();
let con = 0, sin = 0;
const dist = new Map();
const sample = [];
for (const d of citas.docs) {
  const c = d.data();
  if (c.sucursalId) {
    con++;
    dist.set(c.sucursalId, (dist.get(c.sucursalId) || 0) + 1);
    if (sample.length < 3) sample.push({ id: d.id, sucursalId: c.sucursalId, sucursalNombre: c.sucursalNombre, barbero: c.barberoNombre, fecha: c.fecha });
  } else {
    sin++;
  }
}
console.log(`Total: ${citas.size}`);
console.log(`Con sucursalId: ${con}`);
console.log(`Sin sucursalId: ${sin}`);
console.log(`Distribución:`, Object.fromEntries(dist));
console.log(`\nMuestra:`, sample);

// Barberos: ¿tienen sucursalId?
const barbs = await db.collection('tenants/oren/barberos').get();
console.log(`\n=== Barberos con/sin sucursalId ===`);
let bcon = 0, bsin = 0;
for (const d of barbs.docs) {
  const b = d.data();
  if (b.sucursalId || (Array.isArray(b.sucursales) && b.sucursales.length)) bcon++;
  else bsin++;
}
console.log(`Barberos con sucursalId (o sucursales[]): ${bcon}`);
console.log(`Barberos sin: ${bsin}`);
