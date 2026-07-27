// Análisis forense de los duplicados en oren para entender origen.
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();
const T = 'oren';

const normPhone = (t) => { const d = (t || '').replace(/\D/g, ''); return d.length > 9 ? d.slice(-9) : d; };
const normEmail = (e) => (e || '').toLowerCase().trim();

const usersSnap = await db.collection(`tenants/${T}/users`).get();
const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => (u.nombre || '').trim());

console.log(`\n═══ Total users con nombre: ${users.length} ═══\n`);

// Origen de los users
const porImportedFrom = new Map();
users.forEach(u => {
  const src = u.importedFrom || '(sin marca)';
  porImportedFrom.set(src, (porImportedFrom.get(src) || 0) + 1);
});
console.log('Origen (importedFrom):');
[...porImportedFrom.entries()].sort((a,b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k.padEnd(25)}: ${v}`));

// Formato del docId (legacy tel vs Auth uid)
const porFormato = { 'legacy-tel': 0, 'auth-uid-28': 0, 'ac_hash': 0, 'otro': 0 };
users.forEach(u => {
  if (u.id.startsWith('ac_')) porFormato['ac_hash']++;
  else if (u.id.length === 28 && /^[a-zA-Z0-9]+$/.test(u.id)) porFormato['auth-uid-28']++;
  else if (/^\d+$/.test(u.id) || u.id.startsWith('+') || u.id.startsWith('56')) porFormato['legacy-tel']++;
  else porFormato['otro']++;
});
console.log('\nFormato de docId:');
Object.entries(porFormato).forEach(([k, v]) => console.log(`  ${k.padEnd(25)}: ${v}`));

// Grupos duplicados por tel — analizar tamaño
const porTel = new Map();
users.forEach(u => {
  const t = normPhone(u.telefono);
  if (t) {
    if (!porTel.has(t)) porTel.set(t, []);
    porTel.get(t).push(u);
  }
});
const grupos = [...porTel.values()].filter(g => g.length > 1);
console.log(`\nGrupos por tel duplicado: ${grupos.length}`);

// Distribución de tamaño
const distSize = new Map();
grupos.forEach(g => distSize.set(g.length, (distSize.get(g.length) || 0) + 1));
console.log('\nTamaño de grupo:');
[...distSize.entries()].sort((a,b) => a[0] - b[0]).forEach(([size, count]) => console.log(`  ${size} personas x tel: ${count} grupos`));

// Categorizar grupos: familia (todos emails distintos) vs mismo humano
let fusionables = 0, familias = 0, mixtos = 0;
grupos.forEach(g => {
  const emailsUnicos = new Set(g.map(u => normEmail(u.email)).filter(Boolean));
  if (emailsUnicos.size <= 1) fusionables++;
  else if (emailsUnicos.size === g.length) familias++;
  else mixtos++;
});
console.log(`\nClasificación:`);
console.log(`  Fusionables (0-1 email único):     ${fusionables}`);
console.log(`  Familia pura (N emails distintos): ${familias}`);
console.log(`  Mixto (algún email + algún vacío): ${mixtos}`);

// Muestras de los grupos MÁS grandes (top 10)
const grupsSorted = [...grupos].sort((a, b) => b.length - a.length);
console.log(`\n─── Top 10 grupos más grandes ───`);
grupsSorted.slice(0, 10).forEach(g => {
  const t = normPhone(g[0].telefono);
  const emails = g.map(u => normEmail(u.email)).filter(Boolean);
  const uniqueEmails = new Set(emails);
  console.log(`  tel=${t} (${g.length} personas, ${uniqueEmails.size} emails únicos):`);
  g.forEach(u => {
    const src = u.importedFrom ? `[${u.importedFrom}]` : '';
    const legacy = u.uid === u.id ? ' [legacy-uid=id]' : '';
    console.log(`    · ${u.id.slice(0, 20).padEnd(20)} "${u.nombre}" em="${u.email || ''}"${legacy}${src}`);
  });
});

// Últimos users creados (¿post Fase 1 o antes?)
console.log(`\n─── Últimos 10 users creados ───`);
const conFecha = users.filter(u => u.creadoEn || u.createdAt).map(u => {
  const d = u.creadoEn?.toDate?.() || u.createdAt?.toDate?.();
  return { ...u, ts: d ? d.getTime() : 0 };
}).sort((a, b) => b.ts - a.ts).slice(0, 10);
conFecha.forEach(u => {
  const d = new Date(u.ts).toISOString().slice(0, 10);
  console.log(`  ${d}  ${u.id.slice(0,20).padEnd(20)}  "${u.nombre}"  em="${u.email||''}"  imp="${u.importedFrom||''}"`);
});
