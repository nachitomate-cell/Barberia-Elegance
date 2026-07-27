// Reproducir el merge de useClubUsers y contar exactamente cuántos
// docs quedan tras dedupe. Objetivo: entender por qué aura muestra 799
// cuando teníamos 819 users + 86 clientes-only esperados = 905.
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();
const T = process.argv[2] || 'aura';

const normPhone = (t) => {
  const d = (t || '').replace(/\D/g, '');
  if (!d) return '';
  return d.length > 9 ? d.slice(-9) : d;
};

const usersRaw = (await db.collection(`tenants/${T}/users`).get())
  .docs.map(d => ({ id: d.id, ...d.data() }));
const clientesRaw = (await db.collection(`tenants/${T}/clientes`).get())
  .docs.map(d => ({ id: d.id, ...d.data() }));

// Mismo filtro que Clientes.jsx: descartar users sin nombre
const users = usersRaw.filter(u => (u.nombre || '').trim());
console.log(`\n═══ ${T} ═══`);
console.log(`users total:            ${usersRaw.length}`);
console.log(`users con nombre:       ${users.length}`);
console.log(`clientes total:         ${clientesRaw.length}`);

// Duplicados INTERNOS en users por tel o email
const usersByTel   = new Map();
const usersByEmail = new Map();
let dupTelUsers = 0, dupEmailUsers = 0;
users.forEach(u => {
  const tel   = normPhone(u.telefono);
  const email = (u.email || '').toLowerCase();
  if (tel) {
    if (usersByTel.has(tel)) dupTelUsers++;
    else usersByTel.set(tel, u);
  }
  if (email) {
    if (usersByEmail.has(email)) dupEmailUsers++;
    else usersByEmail.set(email, u);
  }
});
console.log(`\nDuplicados INTERNOS de users:`);
console.log(`  por teléfono: ${dupTelUsers}`);
console.log(`  por email:    ${dupEmailUsers}`);

// Reproducir merge NUEVO (regla híbrida)
const seenTel   = new Map();
const seenEmail = new Map();
const merged = [];
let usersSkippedByTel = 0, usersSkippedByEmail = 0;
users.forEach(u => {
  const tel   = normPhone(u.telefono);
  const email = (u.email || '').toLowerCase();
  if (email && seenEmail.has(email)) { usersSkippedByEmail++; return; }
  if (tel && seenTel.has(tel)) {
    const other = seenTel.get(tel);
    const otherEmail = (other.email || '').toLowerCase();
    if (!email || !otherEmail) { usersSkippedByTel++; return; }
  }
  merged.push(u);
  if (tel)   seenTel.set(tel, u);
  if (email) seenEmail.set(email, u);
});
console.log(`\nMerge — pasada USERS:`);
console.log(`  incluidos: ${merged.length}`);
console.log(`  saltados por tel duplicado:   ${usersSkippedByTel}`);
console.log(`  saltados por email duplicado: ${usersSkippedByEmail}`);

// Segunda pasada: clientes
let clSkippedByTel = 0, clSkippedByEmail = 0, clAdded = 0;
clientesRaw.forEach(c => {
  const tel   = normPhone(c.telefono || c.id);
  const email = (c.email || '').toLowerCase();
  if (email && seenEmail.has(email)) { clSkippedByEmail++; return; }
  if (tel && seenTel.has(tel)) {
    const other = seenTel.get(tel);
    const otherEmail = (other.email || '').toLowerCase();
    if (!email || !otherEmail) { clSkippedByTel++; return; }
  }
  merged.push(c);
  clAdded++;
  if (tel)   seenTel.set(tel, c);
  if (email) seenEmail.set(email, c);
});
console.log(`\nMerge — pasada CLIENTES:`);
console.log(`  agregados: ${clAdded}`);
console.log(`  saltados por tel match con user:   ${clSkippedByTel}`);
console.log(`  saltados por email match con user: ${clSkippedByEmail}`);

console.log(`\n═══ TOTAL merged: ${merged.length} ═══`);
console.log(`(Clientes.jsx aplica luego .filter(c => (c.nombre || '').trim()) sobre esto)`);

// Aplicar filtro de nombre sobre el merge final
const finalCount = merged.filter(c => (c.nombre || '').trim()).length;
console.log(`Después del filtro de nombre no vacío: ${finalCount}`);

// Muestras de duplicados internos de users (los primeros 10)
if (dupTelUsers + dupEmailUsers > 0) {
  console.log(`\n─── Muestras de duplicados internos users (primeros 10) ───`);
  const seenT = new Set(), seenE = new Set();
  let shown = 0;
  for (const u of users) {
    if (shown >= 10) break;
    const tel = normPhone(u.telefono);
    const email = (u.email || '').toLowerCase();
    if (tel && seenT.has(tel)) {
      const other = users.find(x => normPhone(x.telefono) === tel && x.id !== u.id);
      console.log(`  DUP TEL "${tel}"`);
      console.log(`    ${u.id} · "${u.nombre}" · email="${u.email || ''}"`);
      if (other) console.log(`    ${other.id} · "${other.nombre}" · email="${other.email || ''}"`);
      shown++;
    } else if (email && seenE.has(email)) {
      const other = users.find(x => (x.email || '').toLowerCase() === email && x.id !== u.id);
      console.log(`  DUP EMAIL "${email}"`);
      console.log(`    ${u.id} · "${u.nombre}" · tel="${u.telefono || ''}"`);
      if (other) console.log(`    ${other.id} · "${other.nombre}" · tel="${other.telefono || ''}"`);
      shown++;
    }
    if (tel)   seenT.add(tel);
    if (email) seenE.add(email);
  }
}
