import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();

// Nuevo teléfono válido: +56 9 + 8 dígitos = 12 caracteres
const NEW_TEL   = '+56955550370';
const NEW_SUF9  = '955550370';

const ac = 'ac_d279ae5fe76c985eb0';
await db.doc(`tenants/delnero/users/${ac}`).update({
  telefono: NEW_TEL,
  telefonoSuf9: NEW_SUF9,
  updatedAt: Timestamp.now(),
});
console.log(`✅ users/${ac} → tel=${NEW_TEL}`);

const cita = 'rddH8VdRV6Xa0j8ZXTEl';
await db.doc(`tenants/delnero/citas/${cita}`).update({
  clienteTelefono: NEW_TEL,
  clienteTelefonoSuf9: NEW_SUF9,
});
console.log(`✅ citas/${cita} → tel=${NEW_TEL}`);
