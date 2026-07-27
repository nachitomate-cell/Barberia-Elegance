// Inspección + setup del test de comisión por servicio en delnero.
// Muestra barberos, servicios y citas recientes para saber con qué probar.
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();

const TENANT = 'delnero';

console.log(`\n═══ BARBEROS DE ${TENANT.toUpperCase()} ═══`);
const bSnap = await db.collection(`tenants/${TENANT}/barberos`).get();
const bs = bSnap.docs.map(d => ({id:d.id, ...d.data()})).filter(b => !b._mainDocId && !b.esQA);
for (const b of bs) {
  const ovr = b.comisionPorServicio || {};
  const numOvr = Object.values(ovr).filter(v => v != null && v !== '').length;
  console.log(`  • ${b.nombre} · id=${b.id}`);
  console.log(`     comisión global: ${b.comision ?? 0}% servicio · ${b.comisionProductos ?? 10}% producto`);
  console.log(`     overrides por servicio: ${numOvr}${numOvr ? ' → ' + JSON.stringify(ovr) : ''}`);
}

console.log(`\n═══ SERVICIOS DE ${TENANT.toUpperCase()} ═══`);
const sSnap = await db.collection(`tenants/${TENANT}/servicios`).get();
const svcs = sSnap.docs.map(d => ({id:d.id, ...d.data()}));
for (const s of svcs.slice(0, 15)) {
  console.log(`  • ${s.nombre} · id=${s.id} · $${(Number(s.precio)||0).toLocaleString('es-CL')}`);
}
if (svcs.length > 15) console.log(`  ... y ${svcs.length - 15} más`);

console.log(`\n═══ CITAS COMPLETADAS RECIENTES (últimas 5) ═══`);
const cSnap = await db.collection(`tenants/${TENANT}/citas`)
  .where('estado', '==', 'Completada')
  .get();
const citas = cSnap.docs.map(d => ({id:d.id, ...d.data()}))
  .sort((a,b) => (b.fecha||'').localeCompare(a.fecha||''))
  .slice(0, 5);
for (const c of citas) {
  console.log(`  ${c.fecha} · ${c.barbero || '?'} · ${c.servicioNombre || '?'} · $${(Number(c.precio)||0).toLocaleString('es-CL')} · svcId=${c.servicioId || '-'}`);
}
console.log('');
