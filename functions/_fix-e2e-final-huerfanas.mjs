import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();
const T = 'delnero';
const UID = 'aAPmW1EqykeADsjqYtnETwEKkS23'; // Firebase Auth uid del "Cliente E2E Final"
await db.doc(`tenants/${T}/citas/EJTx1ctxlm8l3bw9ZLT2`).update({ clienteUid: UID, userId: UID });
await db.doc(`tenants/${T}/citas/enbdCPMf7etsY7BZa2YY`).update({ clienteUid: UID, userId: UID });
console.log('✓ 2 citas huérfanas del test E2E linkeadas al doc final');
