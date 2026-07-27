// Ver estado de delnero (sandbox): barberos + servicios + config cartera Pablo.
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();

const T = 'delnero';

console.log('═══ SUCURSALES ═══');
const sc = await db.collection(`tenants/${T}/sucursales`).get();
if (sc.empty) console.log('  (sin sucursales — tenant mono-sede)');
sc.docs.forEach(d => console.log(`  ${d.id} · ${d.data().nombre || '-'}`));

console.log('\n═══ BARBEROS ═══');
const bs = await db.collection(`tenants/${T}/barberos`).get();
bs.docs.map(d => ({ id: d.id, ...d.data() })).filter(b => !b._mainDocId && !b.esQA).forEach(b => {
  const suf   = b.sufijoClientePropio || '';
  const arr   = b.arriendoPorServicio || {};
  const nArr  = Object.values(arr).filter(v => Number(v) > 0).length;
  const cSvc  = b.comisionPorServicio || {};
  const cProd = b.comisionPorProducto || {};
  console.log(`  ${b.id} · ${b.nombre}`);
  console.log(`     comision ${b.comision || 0}% · sucursal ${b.sucursalId || '-'}`);
  console.log(`     sufijo="${suf}" · arriendos=${nArr} servicios (${JSON.stringify(arr)})`);
  console.log(`     comisionPorServicio=${Object.keys(cSvc).length} overrides · comisionPorProducto=${Object.keys(cProd).length} overrides`);
});

console.log('\n═══ SERVICIOS ═══');
const ss = await db.collection(`tenants/${T}/servicios`).get();
ss.docs.map(d => ({ id: d.id, ...d.data() })).forEach(s => {
  console.log(`  ${s.id} · ${s.nombre} · $${(Number(s.precio) || 0).toLocaleString('es-CL')}`);
});

console.log('\n═══ CITAS de PABLO (últimas 5) ═══');
try {
  const pablo = bs.docs.map(d => ({ id: d.id, ...d.data() })).find(b => (b.nombre || '').toLowerCase().includes('pablo'));
  if (!pablo) console.log('  (Pablo no existe en delnero)');
  else {
    const cs = await db.collection(`tenants/${T}/citas`).where('barberoId', '==', pablo.id).limit(50).get();
    const list = cs.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))
      .slice(0, 5);
    if (list.length === 0) console.log('  (sin citas)');
    list.forEach(c => console.log(`  ${c.fecha} ${c.hora} · ${c.clienteNombre || c.nombre || '-'} · ${c.servicioNombre || c.servicioId || '-'} · $${c.precio || '-'} · ${c.estado || '-'}`));
  }
} catch (e) { console.log('  ERROR:', e.message); }
