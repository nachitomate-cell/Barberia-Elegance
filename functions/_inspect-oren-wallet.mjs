// ¿Wallet enabled en oren? + estado config Apple.
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();

const T = 'oren';
console.log(`\n═══ tenants/${T}/configuracion/wallet ═══`);
const snap = await db.doc(`tenants/${T}/configuracion/wallet`).get();
if (!snap.exists) {
  console.log('  DOC NO EXISTE → botones ocultos');
} else {
  console.log(JSON.stringify(snap.data(), null, 2));
}
