import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();
const T = 'delnero';

console.log(`\n═══ Todos los users en delnero con email "peek.test.delnero" ═══`);
const snap = await db.collection(`tenants/${T}/users`).get();
const matches = [];
snap.docs.forEach(d => {
  const data = d.data();
  const em = (data.email || '').toLowerCase();
  const nom = (data.nombre || '').toLowerCase();
  if (em.includes('peek.test.delnero') || nom.includes('peek test')) {
    matches.push({ id: d.id, ...data });
  }
});
console.log(`Encontrados: ${matches.length}\n`);
matches.forEach(m => {
  console.log(`─ ${m.id}  (${m.id.length} chars → ${m.id.length === 11 && /^\d+$/.test(m.id) ? 'legacy (id=tel)' : 'Firebase Auth uid'})`);
  console.log(`    nombre="${m.nombre || ''}"  email="${m.email || ''}"  tel="${m.telefono || ''}"`);
  console.log(`    uid="${m.uid || '(none)'}"`);
  console.log(`    sellosHistoricos=${m.sellosHistoricos ?? '(none)'}  sellosDisponibles=${m.sellosDisponibles ?? '(none)'}  stamps=${m.stamps ?? '(none)'}`);
  console.log(`    dedupedAt=${m.dedupedAt?.toDate ? m.dedupedAt.toDate().toISOString() : m.dedupedAt || '(none)'}`);
  console.log(`    importedFrom="${m.importedFrom || ''}"  fechaRegOrig="${m.fechaRegistroOriginal || ''}"`);
  console.log(`    creadoEn=${m.creadoEn?.toDate ? m.creadoEn.toDate().toISOString() : m.creadoEn || '(none)'}`);
});

// También cliente mirror
console.log(`\n═══ tenants/${T}/clientes con tel 56988177744 ═══`);
const cSnap = await db.collection(`tenants/${T}/clientes`).get();
cSnap.docs.forEach(d => {
  const data = d.data();
  const t = (data.telefono || '').replace(/\D/g, '');
  if (t.includes('988177744') || d.id.includes('988177744')) {
    console.log(`  ${d.id} · "${data.nombre}" · ${JSON.stringify({ sellos: data.sellosDisponibles, stamps: data.stamps, uid: data.uid })}`);
  }
});
