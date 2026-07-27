import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();
const T = 'delnero';

const matches = (s) => {
  const x = (s || '').toLowerCase();
  return x.includes('cliente e2e final') || x.includes('cliente.e2e.final');
};

console.log(`\n═══ USERS relacionados a "Cliente E2E Final" ═══`);
const usersSnap = await db.collection(`tenants/${T}/users`).get();
const users = [];
usersSnap.docs.forEach(d => {
  const data = d.data();
  if (matches(data.nombre) || matches(data.email) || (data.telefono || '').includes('911119999')) {
    users.push({ id: d.id, ...data });
  }
});
console.log(`Encontrados: ${users.length}\n`);
users.forEach(u => {
  const kind = u.id.startsWith('ac_') ? 'ac_ (upsertCliente)'
             : u.id.length === 28 ? 'Firebase Auth uid'
             : (/^\d+$/.test(u.id) ? 'phone-id (legacy)' : 'otro');
  console.log(`─ ${u.id}  (${u.id.length} chars → ${kind})`);
  console.log(`    nombre="${u.nombre || ''}"  email="${u.email || ''}"  tel="${u.telefono || ''}"`);
  console.log(`    upsertedAt=${u.upsertedAt?.toDate ? u.upsertedAt.toDate().toISOString() : '(no)'}`);
  console.log(`    dedupedAt=${u.dedupedAt?.toDate ? u.dedupedAt.toDate().toISOString() : '(no)'}`);
  console.log(`    creadoEn=${u.creadoEn?.toDate ? u.creadoEn.toDate().toISOString() : u.creadoEn || '(no)'}`);
  console.log(`    stamps=${u.stamps ?? 0}  sellosHist=${u.sellosHistoricos ?? 0}  sellosDisp=${u.sellosDisponibles ?? 0}`);
  console.log(`    importedFrom="${u.importedFrom || ''}"`);
});

console.log(`\n═══ CITAS de "Cliente E2E Final" ═══`);
const uids = users.map(u => u.id);
const citasSnap = await db.collection(`tenants/${T}/citas`).get();
const citas = citasSnap.docs.filter(d => {
  const data = d.data();
  return matches(data.clienteNombre) || matches(data.clienteEmail)
      || (data.clienteTelefono || '').includes('911119999')
      || uids.includes(data.clienteId) || uids.includes(data.clienteUid) || uids.includes(data.userId);
});
console.log(`Encontradas: ${citas.length}\n`);
citas.forEach(d => {
  const c = d.data();
  const linked = uids.includes(c.clienteUid) || uids.includes(c.userId);
  console.log(`─ ${d.id}  fecha=${c.fecha}  hora=${c.hora}  origen="${c.origen || '(none)'}"`);
  console.log(`    clienteUid=${c.clienteUid || '(NULL)'}  userId=${c.userId || '(NULL)'}  ${linked ? '← LINKED ✓' : '← unlinked ✗'}`);
});

console.log(`\n═══ Assertions ═══`);
const finalUser = users.find(u => u.id.length === 28); // Firebase Auth uid
const acUsers = users.filter(u => u.id.startsWith('ac_'));
console.log(`  ¿Hay 1 doc Firebase Auth uid? ${finalUser ? '✓' : '✗'}`);
console.log(`  ¿ac_ ya fue borrado por trigger dedupe? ${acUsers.length === 0 ? '✓' : `✗ (aún hay ${acUsers.length})`}`);
if (finalUser) {
  console.log(`  ¿Tiene dedupedAt (evidencia de fusión)? ${finalUser.dedupedAt ? '✓' : '✗'}`);
  const linkedCount = citas.filter(d => (d.data().clienteUid === finalUser.id) || (d.data().userId === finalUser.id)).length;
  console.log(`  Citas linked al doc final: ${linkedCount}/${citas.length}  ${linkedCount === citas.length ? '✓' : '✗'}`);
}
console.log(`  Total users (esperado: 1): ${users.length}  ${users.length === 1 ? '✓' : (users.length > 1 ? '✗ hay más de 1' : '✗ ninguno')}`);
console.log(`  Total citas (esperado: 2 → paso A + B): ${citas.length}`);
