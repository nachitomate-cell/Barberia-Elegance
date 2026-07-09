'use strict';

/**
 * scripts/crear-accesos-kronnos-admins.js
 * ─────────────────────────────────────────────────────────────────
 *  Crea cuentas de Firebase Auth (email + password) para los
 *  administradores de Kronnos:
 *
 *  Por sede (claims + doc en tenants/<sede>/barberos/{uid}):
 *    · Peñablanca : sucursalblanca2@gmail.com
 *    · Limache    : kronnos.studio.spa@gmail.com
 *    · Woman      : kronnos.woman.spa@gmail.com
 *
 *  Marca (acceso a las 3 sedes — via esKronnosBrandAdmin en
 *  firestore.rules + BRAND_ADMINS en AuthContext.jsx, sin doc):
 *    · claudio.burgos91@gmail.com
 *    · grupo.kratos.spa@gmail.com
 *
 *  Idempotente: si el email ya existe, reutiliza el UID, actualiza
 *  password/claims y (re)vincula el doc.
 *
 *  Uso:
 *    node scripts/crear-accesos-kronnos-admins.js            (DRY-RUN)
 *    node scripts/crear-accesos-kronnos-admins.js --commit
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

const ACCOUNTS = [
  { tipo: 'sede',  tenant: 'kronnos_penablanca', nombre: 'Administración Peñablanca', email: 'sucursalblanca2@gmail.com',    password: 'Kronnos25@' },
  { tipo: 'sede',  tenant: 'kronnos_limache',    nombre: 'Administración Limache',    email: 'kronnos.studio.spa@gmail.com', password: '123456' },
  { tipo: 'sede',  tenant: 'kronnos_woman',      nombre: 'Administración Woman',      email: 'kronnos.woman.spa@gmail.com',  password: 'KronnosWoman25@' },
  { tipo: 'marca', tenant: 'kronnos',            nombre: 'Claudio Burgos',            email: 'claudio.burgos91@gmail.com',   password: '123456' },
  { tipo: 'marca', tenant: 'kronnos',            nombre: 'Grupo Kratos',              email: 'grupo.kratos.spa@gmail.com',   password: 'Kratos25@' },
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
  console.log(`CREAR ACCESOS KRONNOS ADMINS  ·  ${commit ? '🔴 COMMIT' : '🟢 DRY-RUN'}`);
  console.log(`${'═'.repeat(72)}`);

  const resultados = [];
  for (const acc of ACCOUNTS) {
    const alcance = acc.tipo === 'marca' ? 'marca (3 sedes)' : acc.tenant;
    const label = `${acc.nombre} · ${alcance}`;
    if (!commit) {
      console.log(`\n[DRY] ${label}`);
      console.log(`      email: ${acc.email}`);
      console.log(`      password: ${acc.password}`);
      console.log(`      claims: { role: 'admin', tenantId: '${acc.tenant}' }`);
      console.log(`      doc: ${acc.tipo === 'sede' ? `tenants/${acc.tenant}/barberos/{uid}` : '(sin doc — BRAND_ADMINS + rules)'}`);
      resultados.push({ ...acc, uid: '<dry-run>' });
      continue;
    }

    try {
      // 1) Crear/reutilizar Auth
      const { uid, reused } = await crearOReutilizarUser(acc);

      // 2) Custom claims (mismo formato que sincronizarClaimsTenant)
      const current = (await auth.getUser(uid)).customClaims || {};
      if (current.role !== 'admin' || current.tenantId !== acc.tenant) {
        await auth.setCustomUserClaims(uid, { role: 'admin', tenantId: acc.tenant });
      }

      // 3) Firestore: doc admin por sede (docId = uid, como esperan las
      //    reglas esBarberoFirestore y el AuthContext del panel)
      if (acc.tipo === 'sede') {
        const docRef = db.doc(`tenants/${acc.tenant}/barberos/${uid}`);
        const snap = await docRef.get();
        if (!snap.exists) {
          await docRef.set({
            nombre:     acc.nombre,
            email:      acc.email,
            rol:        'admin',
            authUid:    uid,
            uid,
            activo:     true,
            local:      acc.tenant,
            createdAt:  FieldValue.serverTimestamp(),
            updatedAt:  FieldValue.serverTimestamp(),
            creadoDesde: 'scripts/crear-accesos-kronnos-admins.js',
          });
        } else {
          await docRef.update({
            email:     acc.email,
            rol:       'admin',
            authUid:   uid,
            uid,
            activo:    true,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
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
    const alcance = r.tipo === 'marca' ? 'LAS 3 SEDES' : r.tenant.replace('kronnos_', '').toUpperCase();
    console.log(`ADMIN · ${r.nombre} → ${alcance}`);
    console.log(`  email    : ${r.email}`);
    console.log(`  password : ${r.password}`);
    if (r.uid && r.uid !== '<dry-run>') console.log(`  uid      : ${r.uid}`);
    if (r.error) console.log(`  ERROR    : ${r.error}`);
    console.log('');
  }
  console.log(`${'═'.repeat(72)}\n`);
  process.exit(0);
})().catch(err => { console.error('Fatal:', err); process.exit(1); });
