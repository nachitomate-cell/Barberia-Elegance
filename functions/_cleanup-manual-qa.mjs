// Limpia el doc rebelde que se creó en clientes/ durante la prueba manual.
// Después del fix del registro.html ya no debería crearse.
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();

await db.doc('tenants/delnero/clientes/56955550370').delete();
console.log('✅ tenants/delnero/clientes/56955550370 borrado');
