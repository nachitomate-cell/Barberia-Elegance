import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();
const T = 'delnero';

console.log(`\n═══ Estado post-cleanup en ${T} ═══\n`);

// 1. Users test
const uSnap = await db.collection(`tenants/${T}/users`).get();
const testUsers = uSnap.docs.filter(d => (d.data().nombre || '').includes('ZZ_CLEANUP_TEST_') || (d.data().email || '').includes('zz_cleanup_test_'));
console.log(`Users test residuales: ${testUsers.length}`);
testUsers.forEach(d => {
  const x = d.data();
  console.log(`  ${d.id} · "${x.nombre}" · em="${x.email || ''}" · tel="${x.telefono || ''}" · hist=${x.sellosHistoricos ?? 0} · disp=${x.sellosDisponibles ?? 0} · needsReview=${x._needsReview ? '✓' : '-'} · migradoDeClientes=${x.migradoDeClientes ? '✓' : '-'}`);
});

// 2. Users reales con _needsReview
const needsReview = uSnap.docs.filter(d => d.data()._needsReview && !(d.data().nombre || '').includes('ZZ_CLEANUP_TEST_'));
console.log(`\nUsers reales con _needsReview:true: ${needsReview.length}`);
needsReview.forEach(d => console.log(`  ${d.id} · "${d.data().nombre}" · em="${d.data().email || ''}"`));

// 3. Cita del test — debe apuntar al keeper AHxlVDBVHTZF96u4dYiU
const c = await db.doc(`tenants/${T}/citas/ngqo54YGkxd0eFqB1v7l`).get();
if (c.exists) {
  const cd = c.data();
  console.log(`\nCita huérfana reasignada:`);
  console.log(`  clienteUid=${cd.clienteUid}  userId=${cd.userId}  ${cd.clienteUid === 'AHxlVDBVHTZF96u4dYiU' ? '✓ apunta al keeper' : '✗'}`);
} else console.log(`\nCita ngqo54YGkxd0eFqB1v7l NO existe`);

// 4. Docs borrados
const debenNoExistir = ['oyc4nXMKM7lUW7XZFfYR', 'VpXqua8EnHdiWVj3yTyK'];
for (const id of debenNoExistir) {
  const s = await db.doc(`tenants/${T}/users/${id}`).get();
  console.log(`\nUser descartado ${id}: ${s.exists ? '✗ aún existe' : '✓ borrado'}`);
}

// 5. Clientes/ post-cleanup
const cSnap = await db.collection(`tenants/${T}/clientes`).get();
console.log(`\nClientes/ restantes: ${cSnap.size}`);
cSnap.docs.forEach(d => console.log(`  ${d.id} · "${d.data().nombre}"`));
