import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();

const c = await db.doc('tenants/aura/citas/8DfRzvlrGc8HesP42byK').get();
const d = c.data();
console.log('Cita Luciano Arroyo:');
console.log('  creadoEn:', d.creadoEn?.toDate?.().toISOString() || d.creadoEn);
console.log('  origen:', d.origen);
console.log('  clienteNombre:', d.clienteNombre);
console.log('  clienteTelefono:', d.clienteTelefono);
console.log('  clienteEmail:', d.clienteEmail);
console.log('  clienteUid:', d.clienteUid || '(NULL)');
console.log('  userId:', d.userId || '(NULL)');
console.log('  rescatadoPorTrigger:', d.rescatadoPorTrigger || '(no)');

// Cuenta cuántas citas de aura no tienen clienteUid
const all = await db.collection('tenants/aura/citas').get();
const sinUid = all.docs.filter(x => !x.data().clienteUid && !x.data().userId);
const conUid = all.docs.filter(x => x.data().clienteUid || x.data().userId);
console.log(`\nCitas en aura sin clienteUid/userId: ${sinUid.length}`);
console.log(`Citas en aura CON clienteUid o userId: ${conUid.length}`);
console.log(`Total: ${all.size}`);

// Distribución por fecha creada
const buckets = new Map();
all.docs.forEach(x => {
  const d = x.data();
  const ts = d.creadoEn?.toDate?.();
  if (!ts) { buckets.set('sin-fecha', (buckets.get('sin-fecha') || 0) + 1); return; }
  const mes = ts.toISOString().slice(0, 7);
  const key = `${mes} ${d.clienteUid || d.userId ? '✓linked' : '✗sin-link'}`;
  buckets.set(key, (buckets.get(key) || 0) + 1);
});
console.log('\nDistribución citas por mes creado × linked:');
[...buckets.entries()].sort().forEach(([k, v]) => console.log(`  ${k}: ${v}`));
