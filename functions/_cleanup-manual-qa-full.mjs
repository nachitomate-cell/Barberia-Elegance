// Limpia TODOS los rastros del cliente de prueba manual (Manuel QA Fase3C).
// Borra: 2 users (ac_hash + authUid), 1 cita.
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();

const paths = [
  'tenants/delnero/users/ac_d279ae5fe76c985eb0',
  'tenants/delnero/users/iORgw8d38FX8nYdsDhGzDmQiAME3',
  'tenants/delnero/citas/rddH8VdRV6Xa0j8ZXTEl',
];
for (const p of paths) {
  await db.doc(p).delete();
  console.log(`✅ ${p} borrado`);
}
console.log('\n⚠️  Recordá borrar también el user en Firebase Auth Console si querés reusar el email:');
console.log('   Auth UID: iORgw8d38FX8nYdsDhGzDmQiAME3  (email: manual.qa.fase3c@test.local)');
