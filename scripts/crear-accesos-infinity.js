'use strict';

/**
 * scripts/crear-accesos-infinity.js
 * ─────────────────────────────────────────────────────────────────
 *  Crea cuentas de Firebase Auth (email + password) para los 4
 *  barberos de Infinity y un administrador nuevo. Asigna Custom
 *  Claims { role, tenantId } y vincula authUid en el doc de Firestore.
 *
 *  Idempotente: si el email ya existe, reutiliza el UID, actualiza
 *  claims y vincula el doc.
 *
 *  Uso:
 *    node scripts/crear-accesos-infinity.js         (DRY-RUN)
 *    node scripts/crear-accesos-infinity.js --commit
 * ─────────────────────────────────────────────────────────────────
 */

const path  = require('path');
const admin = require('firebase-admin');

const commit = process.argv.includes('--commit');
const SA_PATH = path.resolve(__dirname, '..', 'service-account.json');
admin.initializeApp({ credential: admin.credential.cert(require(SA_PATH)) });
const db   = admin.firestore();
const auth = admin.auth();
const { FieldValue } = admin.firestore;

const TENANT = 'infinity';

// Cuentas a crear. docId=null significa "crear un doc nuevo" (para el admin).
const ACCOUNTS = [
  { docId: 'infinity-miguel', nombre: 'Miguel Angel',       email: 'miguel@infinitystudio.cl', password: 'MiguelInfinity2026!', role: 'barbero' },
  { docId: 'infinity-elio',   nombre: 'Elio Alfonso',       email: 'elio@infinitystudio.cl',   password: 'ElioInfinity2026!',   role: 'barbero' },
  { docId: 'infinity-jose',   nombre: 'Jose Luis Cordero',  email: 'jose@infinitystudio.cl',   password: 'JoseInfinity2026!',   role: 'barbero' },
  { docId: 'infinity-mailo',  nombre: 'Mailo Serrano',      email: 'mailo@infinitystudio.cl',  password: 'MailoInfinity2026!',  role: 'barbero' },
  { docId: 'infinity-admin',  nombre: 'Administración Infinity', email: 'admin@infinitystudio.cl', password: 'AdminInfinity2026!', role: 'admin', createDoc: true },
];

async function crearOReutilizarUser({ email, password, nombre }) {
  const emailN = email.trim().toLowerCase();
  try {
    const rec = await auth.createUser({ email: emailN, password, displayName: nombre });
    return { uid: rec.uid, reused: false };
  } catch (err) {
    if (err.code === 'auth/email-already-exists') {
      const rec = await auth.getUserByEmail(emailN);
      // Actualiza la password para dejarla igual a la del script (fuente de verdad)
      await auth.updateUser(rec.uid, { password, displayName: nombre });
      return { uid: rec.uid, reused: true };
    }
    throw err;
  }
}

(async () => {
  console.log(`\n${'═'.repeat(72)}`);
  console.log(`CREAR ACCESOS INFINITY  ·  ${commit ? '🔴 COMMIT' : '🟢 DRY-RUN'}`);
  console.log(`${'═'.repeat(72)}`);

  const resultados = [];
  for (const acc of ACCOUNTS) {
    const label = `${acc.nombre} (${acc.role})`;
    if (!commit) {
      console.log(`\n[DRY] ${label}`);
      console.log(`      email: ${acc.email}`);
      console.log(`      password: ${acc.password}`);
      console.log(`      docId: ${acc.docId}${acc.createDoc ? ' (crear nuevo)' : ' (existente)'}`);
      resultados.push({ ...acc, uid: '<dry-run>' });
      continue;
    }

    try {
      // 1) Crear/reutilizar Auth
      const { uid, reused } = await crearOReutilizarUser(acc);

      // 2) Custom claims (mismo formato que sincronizarClaimsTenant)
      const current = (await auth.getUser(uid)).customClaims || {};
      if (current.role !== acc.role || current.tenantId !== TENANT) {
        await auth.setCustomUserClaims(uid, { role: acc.role, tenantId: TENANT });
      }

      // 3) Firestore: vincular authUid al doc barbero
      const docRef = db.doc(`tenants/${TENANT}/barberos/${acc.docId}`);
      if (acc.createDoc) {
        const snap = await docRef.get();
        if (!snap.exists) {
          await docRef.set({
            nombre:    acc.nombre,
            email:     acc.email,
            rol:       acc.role,
            authUid:   uid,
            uid,
            disponible: true,
            createdAt:  FieldValue.serverTimestamp(),
            updatedAt:  FieldValue.serverTimestamp(),
            creadoDesde: 'scripts/crear-accesos-infinity.js',
          });
        } else {
          await docRef.update({
            authUid:  uid,
            uid,
            email:    acc.email,
            rol:      acc.role,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      } else {
        await docRef.update({
          authUid:  uid,
          uid,
          email:    acc.email,
          // Alineamos el rol al que reconocen las reglas (era 'profesional')
          rol:      acc.role,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      console.log(`  ✓ ${label}  → uid=${uid}${reused ? ' (reutilizado)' : ''}`);
      resultados.push({ ...acc, uid, reused });
    } catch (err) {
      console.error(`  ✗ ${label}  → ${err.message}`);
      resultados.push({ ...acc, error: err.message });
    }
  }

  console.log(`\n${'═'.repeat(72)}`);
  console.log('CREDENCIALES FINALES');
  console.log(`${'═'.repeat(72)}\n`);
  for (const r of resultados) {
    console.log(`${r.role.toUpperCase().padEnd(8)} · ${r.nombre}`);
    console.log(`  email    : ${r.email}`);
    console.log(`  password : ${r.password}`);
    if (r.uid && r.uid !== '<dry-run>') console.log(`  uid      : ${r.uid}`);
    if (r.error) console.log(`  ERROR    : ${r.error}`);
    console.log('');
  }
  console.log(`${'═'.repeat(72)}\n`);
  process.exit(0);
})().catch(err => { console.error('Fatal:', err); process.exit(1); });
