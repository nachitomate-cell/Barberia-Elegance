import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();
const T = 'delnero';

const match = (s) => {
  const x = (s || '').toLowerCase();
  return x.includes('test publico') || x.includes('test.pub') || x.includes('publico a') || x.includes('publico b');
};

console.log(`\n═══ USERS en delnero relacionados al test público ═══`);
const usersSnap = await db.collection(`tenants/${T}/users`).get();
const users = [];
usersSnap.docs.forEach(d => {
  const data = d.data();
  if (match(data.nombre) || match(data.email) || (data.telefono || '').includes('977166655')) {
    users.push({ id: d.id, ...data });
  }
});
console.log(`Encontrados: ${users.length}\n`);
users.forEach(u => {
  const kind = u.id.length >= 20 ? 'auto-id' : (/^\d+$/.test(u.id) ? 'phone-id' : 'firebase-uid');
  console.log(`─ ${u.id}  (${u.id.length} chars → ${kind})`);
  console.log(`    nombre="${u.nombre || ''}"  email="${u.email || ''}"  tel="${u.telefono || ''}"`);
  console.log(`    upsertedAt=${u.upsertedAt?.toDate ? u.upsertedAt.toDate().toISOString() : '(no)'}`);
  console.log(`    createdAt=${u.createdAt?.toDate ? u.createdAt.toDate().toISOString() : '(no)'}`);
  console.log(`    sellos: hist=${u.sellosHistoricos ?? 0} disp=${u.sellosDisponibles ?? 0} stamps=${u.stamps ?? 0}`);
});

console.log(`\n═══ CITAS en delnero relacionadas ═══`);
const uids = users.map(u => u.id);
const citasSnap = await db.collection(`tenants/${T}/citas`).get();
const citas = citasSnap.docs.filter(d => {
  const data = d.data();
  return match(data.clienteNombre) || match(data.clienteEmail)
      || (data.clienteTelefono || '').includes('977166655')
      || uids.includes(data.clienteId) || uids.includes(data.clienteUid) || uids.includes(data.userId);
});
console.log(`Encontradas: ${citas.length}\n`);
citas.forEach(d => {
  const c = d.data();
  const linked = uids.includes(c.clienteId) || uids.includes(c.clienteUid) || uids.includes(c.userId);
  console.log(`─ cita ${d.id}`);
  console.log(`    fecha=${c.fecha} hora=${c.hora} origen=${c.origen || '-'}`);
  console.log(`    cliente="${c.clienteNombre}" tel="${c.clienteTelefono}" email="${c.clienteEmail}"`);
  console.log(`    clienteId=${c.clienteId || '(NULL)'}  clienteUid=${c.clienteUid || '(NULL)'}  userId=${c.userId || '(NULL)'}  ${linked ? '← LINKED ✓' : '← unlinked ✗'}`);
});

// Assertions rápidas
console.log(`\n═══ Chequeo rápido ═══`);
const userA = users.find(u => (u.nombre || '').toLowerCase() === 'test publico a');
const citasA = citas.filter(c => (c.data().clienteNombre || '').toLowerCase() === 'test publico a');
if (userA) {
  console.log(`✓ Escenario A: user "Test Publico A" existe (${userA.id})`);
  const linkedA = citasA.every(c => c.data().clienteUid === userA.id || c.data().userId === userA.id);
  console.log(`  citas de Test Publico A: ${citasA.length}  todas linked: ${linkedA ? '✓' : '✗'}`);
  console.log(`  Escenario B: ${citasA.length >= 2 ? '✓ hay 2+ citas al mismo uid' : '(solo 1 cita, no probaste B?)'}`);
}
const otrosUsers = users.filter(u => (u.nombre || '').toLowerCase() !== 'test publico a');
if (otrosUsers.length) {
  console.log(`\nOtros users relacionados (posible Escenario C):`);
  otrosUsers.forEach(u => console.log(`  ${u.id} · "${u.nombre}" · ${u.email || u.telefono}`));
}
