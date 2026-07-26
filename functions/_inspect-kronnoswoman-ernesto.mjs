// Inspect: Ernesto en kronnoswoman + lista de servicios para matchear.
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();

const T = 'kronnoswoman';

console.log(`═══ BARBEROS DE ${T} ═══`);
const bs = await db.collection(`tenants/${T}/barberos`).get();
bs.docs.map(d => ({id:d.id, ...d.data()})).filter(b => !b._mainDocId && !b.esQA).forEach(b => {
  console.log(`  ${b.id} · ${b.nombre} · comision ${b.comision||0}% · overrides ${JSON.stringify(b.comisionPorServicio||{})}`);
});

console.log(`\n═══ SERVICIOS DE ${T} ═══`);
const ss = await db.collection(`tenants/${T}/servicios`).get();
ss.docs.map(d => ({id:d.id, ...d.data()})).forEach(s => {
  console.log(`  ${s.id.padEnd(28)} · ${s.nombre}`);
});
