import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();
const T = 'aura';

async function scan(col) {
  console.log(`\n═══ ${col} ═══`);
  const snap = await db.collection(`tenants/${T}/${col}`).get();
  snap.docs.forEach(d => {
    const data = d.data();
    const nom = (data.nombre || data.name || '').toLowerCase();
    const em  = (data.email || '').toLowerCase();
    if (nom.includes('sebast') || em.includes('sebast') ||
        nom.includes('retamal') || em.includes('retamal') ||
        nom.includes('mallea') || em.includes('mallea')) {
      const legacy = data.uid && data.uid === d.id ? ' [legacy]' : '';
      console.log(`  ${d.id} · "${data.nombre}" · em="${data.email||''}" · tel="${data.telefono||''}" · uid="${data.uid||''}"${legacy}`);
    }
  });
}
await scan('users');
await scan('clientes');
