import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();
const T = 'aura';

const normPhone = (t) => {
  const d = (t || '').replace(/\D/g, '');
  if (!d) return '';
  return d.length > 9 ? d.slice(-9) : d;
};

const usersRaw    = (await db.collection(`tenants/${T}/users`).get()).docs.map(d => ({ id: d.id, ...d.data() }));
const clientesRaw = (await db.collection(`tenants/${T}/clientes`).get()).docs.map(d => ({ id: d.id, ...d.data() }));
const users = usersRaw.filter(u => (u.nombre || '').trim());

// Reproducir merge con lógica NUEVA (email preferente + tel norm 9 digits)
const seenTel   = new Map();
const seenEmail = new Map();
const merged = [];
const tryPush = (rec) => {
  const tel   = normPhone(rec.telefono || rec.id);
  const email = (rec.email || '').toLowerCase();
  if (email && seenEmail.has(email)) return false;
  if (tel && seenTel.has(tel)) {
    const other = seenTel.get(tel);
    const otherEmail = (other.email || '').toLowerCase();
    if (!email || !otherEmail) return false;
  }
  merged.push(rec);
  if (tel)   seenTel.set(tel, rec);
  if (email) seenEmail.set(email, rec);
  return true;
};
users.forEach(u => tryPush(u));
clientesRaw.forEach(c => tryPush(c));

// Buscar Mallea y Retamales en el resultado
const finalCount = merged.filter(c => (c.nombre || '').trim()).length;
console.log(`Total merged: ${finalCount}\n`);

['mallea', 'retamales', 'sebastian tureo'].forEach(name => {
  const results = merged.filter(m => (m.nombre || '').toLowerCase().includes(name));
  console.log(`Búsqueda "${name}": ${results.length} resultado(s)`);
  results.forEach(r => console.log(`  · ${r.id} · "${r.nombre}" · em="${r.email||''}" · tel="${r.telefono||''}"`));
  console.log();
});
