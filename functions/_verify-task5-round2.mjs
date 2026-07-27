import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();
const T = 'delnero';

const matchTest = (s) => {
  const x = (s || '').toLowerCase();
  return x.includes('test publico') || x.includes('test.pub');
};

console.log(`\n═══ USERS relacionados al test público (round 2) ═══`);
const usersSnap = await db.collection(`tenants/${T}/users`).get();
const users = [];
usersSnap.docs.forEach(d => {
  const data = d.data();
  if (matchTest(data.nombre) || matchTest(data.email) || (data.telefono || '').includes('977166655')) {
    users.push({ id: d.id, ...data });
  }
});
console.log(`Encontrados: ${users.length}\n`);
users.forEach(u => {
  const kind = u.id.startsWith('ac_') ? 'ac_ (determinístico ✓)'
             : u.id.length === 28 ? 'firebase-uid'
             : (/^\d+$/.test(u.id) ? 'phone-id (legacy)' : 'auto-id random');
  console.log(`─ ${u.id}  (${u.id.length} chars → ${kind})`);
  console.log(`    nombre="${u.nombre || ''}"  email="${u.email || ''}"  tel="${u.telefono || ''}"`);
  console.log(`    upsertedAt=${u.upsertedAt?.toDate ? u.upsertedAt.toDate().toISOString() : '(no)'}`);
});

console.log(`\n═══ CITAS relacionadas ═══`);
const uids = users.map(u => u.id);
const citasSnap = await db.collection(`tenants/${T}/citas`).get();
const citas = citasSnap.docs.filter(d => {
  const data = d.data();
  return matchTest(data.clienteNombre) || matchTest(data.clienteEmail)
      || (data.clienteTelefono || '').includes('977166655')
      || uids.includes(data.clienteId) || uids.includes(data.clienteUid) || uids.includes(data.userId);
});
console.log(`Encontradas: ${citas.length}\n`);
citas.forEach(d => {
  const c = d.data();
  const linked = uids.includes(c.clienteId) || uids.includes(c.clienteUid) || uids.includes(c.userId);
  console.log(`─ ${d.id}  fecha=${c.fecha}  hora=${c.hora}`);
  console.log(`    cliente="${c.clienteNombre}"`);
  console.log(`    clienteUid=${c.clienteUid || '(NULL)'}  userId=${c.userId || '(NULL)'}  ${linked ? '← LINKED ✓' : '← unlinked ✗'}`);
});

// Assertions
console.log(`\n═══ Assertions ═══`);
console.log(`  Users creados: ${users.length}  ${users.length === 1 ? '✓ (esperado: 1)' : '✗ (esperado: 1)'}`);
const linkedCount = citas.filter(d => {
  const c = d.data();
  return uids.includes(c.clienteUid) || uids.includes(c.userId);
}).length;
console.log(`  Citas LINKED: ${linkedCount}/${citas.length}  ${linkedCount === citas.length ? '✓' : '✗'}`);
if (users.length === 1) {
  const uid = users[0].id;
  const allSame = citas.every(d => (d.data().clienteUid === uid) || (d.data().userId === uid));
  console.log(`  Todas apuntan al mismo uid (${uid}): ${allSame ? '✓' : '✗'}`);
  console.log(`  Escenario B (dedup on 2ª reserva): ${citas.length >= 2 ? '✓ 2+ citas al mismo uid' : '(solo 1 cita)'}`);
}
