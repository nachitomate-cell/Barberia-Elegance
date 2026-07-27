import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();

console.log(`\n═══ Buscando "luengo" o "esteban lu" en aura ═══`);
const uSnap = await db.collection(`tenants/aura/users`).get();
const matches = [];
uSnap.docs.forEach(d => {
  const data = d.data();
  const nom = (data.nombre || '').toLowerCase();
  if (nom.includes('luengo')) matches.push({ id: d.id, ...data });
});
console.log(`Encontrados en users/: ${matches.length}\n`);
matches.forEach(m => {
  const legacy = m.uid && m.uid === m.id;
  console.log(`─ ${m.id}  ${legacy ? '[LEGACY]' : ''}`);
  console.log(`    nombre="${m.nombre}"`);
  console.log(`    email="${m.email || ''}"`);
  console.log(`    tel="${m.telefono || ''}"`);
  console.log(`    uid="${m.uid || ''}" authUid="${m.authUid || ''}"`);
  console.log(`    importedFrom="${m.importedFrom || ''}"`);
  console.log(`    createdAt=${m.createdAt?.toDate?.().toISOString() || '(none)'}`);
  console.log(`    fechaRegOrig="${m.fechaRegistroOriginal || ''}"`);
  console.log(`    sellos: hist=${m.sellosHistoricos ?? 0} disp=${m.sellosDisponibles ?? 0}`);
  const flags = [];
  if (m._needsReview) flags.push(`_needsReview (${m._reviewReason || ''})`);
  if (m.dedupedAt) flags.push('dedupedAt');
  if (m.backfilledAt) flags.push('backfilledAt');
  if (flags.length) console.log(`    flags: ${flags.join(' · ')}`);
});

// También en clientes/ mirror
const cSnap = await db.collection(`tenants/aura/clientes`).get();
const cMatches = cSnap.docs.filter(d => (d.data().nombre || '').toLowerCase().includes('luengo'));
console.log(`\nEn clientes/ mirror: ${cMatches.length}`);
cMatches.forEach(d => console.log(`  ${d.id} · "${d.data().nombre}" · em="${d.data().email || ''}" · tel="${d.data().telefono || ''}"`));

// Citas
const citasSnap = await db.collection(`tenants/aura/citas`).get();
const citas = citasSnap.docs.filter(d => (d.data().clienteNombre || '').toLowerCase().includes('luengo'));
console.log(`\nCitas con "luengo": ${citas.length}`);
citas.forEach(d => {
  const c = d.data();
  console.log(`  ${d.id} · ${c.fecha} · "${c.clienteNombre}" · em="${c.clienteEmail}" · tel="${c.clienteTelefono}" · uid=${c.clienteUid || c.userId || '(NULL)'}`);
});
