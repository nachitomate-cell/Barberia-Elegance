import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();
const T = 'delnero';
const CITA_ID = 'BLGOTQXDip7jQoLJld6G';
const UID = 'ac_370cf5d0f1e7643e6e';
await db.doc(`tenants/${T}/citas/${CITA_ID}`).update({
  clienteUid: UID,
  userId:     UID,
});
console.log(`✓ Cita ${CITA_ID} linkeada a ${UID}`);
