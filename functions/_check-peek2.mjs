import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();
const T = 'delnero';

console.log(`\n═══ Users con "peek.test2" ═══`);
const snap = await db.collection(`tenants/${T}/users`).get();
snap.docs.forEach(d => {
  const data = d.data();
  const em = (data.email || '').toLowerCase();
  const nom = (data.nombre || '').toLowerCase();
  if (em.includes('peek.test2') || nom.includes('peek') && nom.includes('2')) {
    console.log(`\n─ ${d.id}  (${d.id.length} chars)`);
    console.log(`    nombre="${data.nombre}"`);
    console.log(`    email="${data.email}"`);
    console.log(`    tel="${data.telefono}"`);
    console.log(`    uid="${data.uid || '(none)'}"`);
    console.log(`    sellosHist=${data.sellosHistoricos}  sellosDisp=${data.sellosDisponibles}  stamps=${data.stamps}`);
    console.log(`    dedupedAt=${data.dedupedAt?.toDate ? data.dedupedAt.toDate().toISOString() : data.dedupedAt || '(none)'}`);
    console.log(`    creadoEn=${data.creadoEn?.toDate ? data.creadoEn.toDate().toISOString() : data.creadoEn || '(none)'}`);
    console.log(`    updatedAt=${data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt || '(none)'}`);
    console.log(`    importedFrom="${data.importedFrom || ''}"`);
  }
});
