import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();
const T = 'delnero';

console.log(`\n═══ Users con "test a" o "hermano" en delnero ═══`);
const usersSnap = await db.collection(`tenants/${T}/users`).get();
const users = [];
usersSnap.docs.forEach(d => {
  const data = d.data();
  const nom = (data.nombre || '').toLowerCase();
  const em  = (data.email || '').toLowerCase();
  if (nom === 'test a' || nom.includes('hermano') || em.includes('test.a@') || em.includes('test.hermano@')) {
    users.push({ id: d.id, ...data });
  }
});
console.log(`Encontrados: ${users.length}\n`);
users.forEach(m => {
  console.log(`─ ${m.id}  (${m.id.length} chars → ${m.id.length > 15 ? 'auto-id (upsertCliente ✓)' : 'phone-based (flujo viejo)'})`);
  console.log(`    nombre="${m.nombre}"  email="${m.email}"  tel="${m.telefono}"`);
  console.log(`    upsertedAt=${m.upsertedAt?.toDate ? m.upsertedAt.toDate().toISOString() : m.upsertedAt || '(no)'}`);
  console.log(`    createdAt=${m.createdAt?.toDate ? m.createdAt.toDate().toISOString() : m.createdAt || '(no)'}`);
});

console.log(`\n═══ Citas de Test A / Test Hermano ═══`);
const uids = users.map(u => u.id);
const citasSnap = await db.collection(`tenants/${T}/citas`).get();
const citas = citasSnap.docs.filter(d => {
  const data = d.data();
  const nom = (data.clienteNombre || '').toLowerCase();
  return nom === 'test a' || nom.includes('hermano')
      || uids.includes(data.clienteId) || uids.includes(data.clienteUid);
});
console.log(`Encontradas: ${citas.length}\n`);
citas.forEach(d => {
  const c = d.data();
  const linked = uids.includes(c.clienteId) || uids.includes(c.clienteUid);
  console.log(`─ cita ${d.id}`);
  console.log(`    fecha=${c.fecha} hora=${c.hora}`);
  console.log(`    cliente="${c.clienteNombre}"  tel="${c.clienteTelefono}"  email="${c.clienteEmail}"`);
  console.log(`    clienteId=${c.clienteId || '(NULL)'}  ${linked ? '← LINKED ✓' : '← unlinked ✗'}`);
  console.log(`    clienteUid=${c.clienteUid || '(NULL)'}`);
});

// Assertions
console.log(`\n═══ Assertions ═══`);
const testA = users.filter(u => (u.nombre || '').toLowerCase() === 'test a');
const hermano = users.filter(u => (u.nombre || '').toLowerCase().includes('hermano'));
const citasTestA = citas.filter(c => (c.data().clienteNombre || '').toLowerCase() === 'test a');
const citasHermano = citas.filter(c => (c.data().clienteNombre || '').toLowerCase().includes('hermano'));

console.log(`  Users "Test A": ${testA.length}  ${testA.length === 1 ? '✓' : '✗ (esperado 1)'}`);
console.log(`  Users "Hermano": ${hermano.length}  ${hermano.length === 1 ? '✓' : '✗ (esperado 1)'}`);
console.log(`  Citas Test A: ${citasTestA.length}`);
console.log(`  Citas Hermano: ${citasHermano.length}`);

if (testA.length === 1 && citasTestA.length >= 2) {
  const uidTestA = testA[0].id;
  const allLinked = citasTestA.every(c => c.data().clienteId === uidTestA);
  console.log(`  Todas las citas de Test A linkean al mismo uid: ${allLinked ? '✓' : '✗'}`);
}
if (hermano.length === 1 && testA.length === 1) {
  const distintos = hermano[0].id !== testA[0].id;
  console.log(`  Hermano tiene uid distinto de Test A: ${distintos ? '✓ (familia no colapsó)' : '✗ (BUG: se colapsaron)'}`);
}
