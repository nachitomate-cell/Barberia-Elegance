// Ver estado de oren: sucursales, barberos, servicios existentes.
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();

const T = 'oren';

console.log('═══ SUCURSALES ═══');
const sc = await db.collection(`tenants/${T}/sucursales`).get();
sc.docs.forEach(d => console.log(`  ${d.id} · ${d.data().nombre}`));

console.log('\n═══ BARBEROS ═══');
const bs = await db.collection(`tenants/${T}/barberos`).get();
bs.docs.map(d => ({id:d.id, ...d.data()})).filter(b => !b._mainDocId && !b.esQA).forEach(b => {
  console.log(`  ${b.id} · ${b.nombre} · comision ${b.comision||0}% · sucursal ${b.sucursalId||'-'} · arriendos ${JSON.stringify(b.arriendoPorServicio||{})}`);
});

console.log('\n═══ SERVICIOS ═══');
const ss = await db.collection(`tenants/${T}/servicios`).get();
ss.docs.map(d=>({id:d.id,...d.data()})).forEach(s => {
  console.log(`  ${s.id} · ${s.nombre} · $${(Number(s.precio)||0).toLocaleString('es-CL')}`);
});
