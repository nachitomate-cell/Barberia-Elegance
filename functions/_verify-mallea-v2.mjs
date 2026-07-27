import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();
const T = 'aura';

const normPhone = (t) => {
  const d = (t || '').replace(/\D/g, '');
  return d.length > 9 ? d.slice(-9) : d;
};

const usersRaw    = (await db.collection(`tenants/${T}/users`).get()).docs.map(d => ({ id: d.id, ...d.data() }));
const clientesRaw = (await db.collection(`tenants/${T}/clientes`).get()).docs.map(d => ({ id: d.id, ...d.data() }));
const users = usersRaw.filter(u => (u.nombre || '').trim());

const fusionar = (dest, src) => {
  ['email','photoURL','authUid','fechaNacimiento','cumpleDia'].forEach(k => {
    if ((dest[k] == null || dest[k] === '') && src[k]) dest[k] = src[k];
  });
  const dHist = Number(dest.sellosHistoricos ?? dest.stamps ?? 0);
  const sHist = Number(src.sellosHistoricos ?? src.stamps ?? 0);
  if (sHist > dHist) { dest.sellosHistoricos = sHist; dest.stamps = sHist; }
  const dDisp = Number(dest.sellosDisponibles ?? dest.stamps ?? 0);
  const sDisp = Number(src.sellosDisponibles ?? src.stamps ?? 0);
  if (sDisp > dDisp) dest.sellosDisponibles = sDisp;
};

const seenTel   = new Map();
const seenEmail = new Map();
const merged = [];
const tryPush = (rec) => {
  const tel   = normPhone(rec.telefono || rec.id);
  const email = (rec.email || '').toLowerCase();
  if (email && seenEmail.has(email)) { fusionar(seenEmail.get(email), rec); return false; }
  if (tel && seenTel.has(tel)) {
    const other = seenTel.get(tel);
    const otherEmail = (other.email || '').toLowerCase();
    if (!email || !otherEmail) {
      fusionar(other, rec);
      if (email) seenEmail.set(email, other);
      return false;
    }
  }
  merged.push(rec);
  if (tel)   seenTel.set(tel, rec);
  if (email) seenEmail.set(email, rec);
  return true;
};
users.forEach(u => tryPush(u));
clientesRaw.forEach(c => tryPush(c));

const finalCount = merged.filter(c => (c.nombre || '').trim()).length;
console.log(`Total merged: ${finalCount}\n`);

['mallea', 'retamales'].forEach(name => {
  const results = merged.filter(m => (m.nombre || '').toLowerCase().includes(name));
  console.log(`"${name}": ${results.length} resultado(s)`);
  results.forEach(r => {
    const sellos = r.sellosHistoricos ?? r.stamps ?? 0;
    console.log(`  · ${r.id} · "${r.nombre}" · em="${r.email||''}" · tel="${r.telefono||''}" · sellos=${sellos}`);
  });
  console.log();
});
