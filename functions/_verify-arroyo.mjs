import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();

// 1. Cita de mañana
const c = await db.doc('tenants/aura/citas/8DfRzvlrGc8HesP42byK').get();
const cd = c.data();
console.log(`Cita 8DfRzvlrGc8HesP42byK (Luciano Arroyo mañana):`);
console.log(`  clienteUid: ${cd.clienteUid || '(NULL)'}`);
console.log(`  userId:     ${cd.userId     || '(NULL)'}`);
console.log(`  backfilledAt: ${cd.backfilledAt?.toDate?.().toISOString() || '(none)'}`);

// 2. User Luciano Arroyo
if (cd.clienteUid) {
  const u = await db.doc(`tenants/aura/users/${cd.clienteUid}`).get();
  if (u.exists) {
    const ud = u.data();
    console.log(`\nUser ${cd.clienteUid}:`);
    console.log(`  nombre: "${ud.nombre}"`);
    console.log(`  email:  "${ud.email}"`);
    console.log(`  tel:    "${ud.telefono}"`);
    console.log(`  createdAt: ${ud.createdAt?.toDate?.().toISOString() || '(none)'}`);
    console.log(`  upsertedAt: ${ud.upsertedAt?.toDate?.().toISOString() || '(none)'}`);
  }
}

// 3. Stats totales aura post-backfill
const all = await db.collection('tenants/aura/citas').get();
const sinUid = all.docs.filter(x => !x.data().clienteUid && !x.data().userId).length;
const conUid = all.size - sinUid;
console.log(`\nAura citas post-backfill:`);
console.log(`  Total: ${all.size}`);
console.log(`  Con clienteUid/userId: ${conUid}`);
console.log(`  Sin clienteUid/userId: ${sinUid}`);
