import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();
const T = 'delnero';

const snap = await db.collection(`tenants/${T}/citas`).get();
snap.docs.forEach(d => {
  const c = d.data();
  if ((c.clienteNombre || '').toLowerCase().includes('test publico') || (c.clienteTelefono || '').includes('977166655')) {
    console.log(`\n─── ${d.id} ───`);
    console.log(`  fecha=${c.fecha}  hora=${c.hora}  origen="${c.origen || '(none)'}"`);
    console.log(`  clienteNombre="${c.clienteNombre}"`);
    console.log(`  clienteTel="${c.clienteTelefono}"  clienteEmail="${c.clienteEmail}"`);
    console.log(`  clienteId=${c.clienteId || '(NULL)'}`);
    console.log(`  clienteUid=${c.clienteUid || '(NULL)'}`);
    console.log(`  userId=${c.userId || '(NULL)'}`);
    console.log(`  creadoEn=${c.creadoEn?.toDate ? c.creadoEn.toDate().toISOString() : c.creadoEn}`);
    console.log(`  estado="${c.estado}"`);
    console.log(`  slotLockId=${c.slotLockId || '(NULL)'}`);
    console.log(`  codigoCita=${c.codigoCita}`);
  }
});
