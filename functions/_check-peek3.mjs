import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();
const T = 'delnero';

// User nuevo
const snap = await db.collection(`tenants/${T}/users`).get();
snap.docs.forEach(d => {
  const data = d.data();
  const em = (data.email || '').toLowerCase();
  if (em.includes('peek.test3')) {
    console.log(`─ user ${d.id}  (${d.id.length} chars)`);
    console.log(`    nombre="${data.nombre}"`);
    console.log(`    sellosHist=${data.sellosHistoricos}  sellosDisp=${data.sellosDisponibles}  stamps=${data.stamps}`);
    console.log(`    dedupedAt=${data.dedupedAt?.toDate ? data.dedupedAt.toDate().toISOString() : '(none)'}`);
    console.log(`    importedFrom="${data.importedFrom || ''}"`);
    console.log(`    fechaRegOrig="${data.fechaRegistroOriginal || ''}"`);
  }
});
// Legacy debería estar borrado
const legacyRef = db.doc(`tenants/${T}/users/56988377744`);
const legacySnap = await legacyRef.get();
console.log(`\nLegacy 56988377744 (esperado: borrado): ${legacySnap.exists ? '✗ AÚN EXISTE' : '✓ borrado'}`);
// Cliente mirror
const clienteMirror = await db.doc(`tenants/${T}/clientes/56988377744`).get();
console.log(`Mirror clientes/56988377744 (esperado: borrado o updated): ${clienteMirror.exists ? '(existe: ' + JSON.stringify(clienteMirror.data()) + ')' : 'borrado'}`);
