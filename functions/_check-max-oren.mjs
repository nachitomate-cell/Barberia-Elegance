import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();

const MAX_IDS = new Set(['oren-max-villa', 'oren-max-renaca', 'WkcTvw9HHGV2NVu4hoNwDImNfA72']);

const citas = await db.collection('tenants/oren/citas').get();
const perId = new Map();
for (const d of citas.docs) {
  const c = d.data();
  if (!MAX_IDS.has(c.barberoId)) continue;
  const key = `${c.barberoId} → ${c.sucursalId || '(vacío)'}`;
  if (!perId.has(key)) perId.set(key, []);
  perId.get(key).push({ id: d.id, fecha: c.fecha, hora: c.hora, estado: c.estado, backfilled: !!c.backfilledSucursalAt });
}

console.log('Distribución de citas de Max por (barberoId, sucursalId):\n');
for (const [k, v] of perId) {
  console.log(`  ${k}   → ${v.length} cita(s)`);
  const backCount = v.filter(x => x.backfilled).length;
  console.log(`     de las cuales ${backCount} fueron tocadas por mi backfill`);
}
