/**
 * crear-admin-barberos-sion.js — Crea cuentas admin-barbero para los 2
 * barberos existentes del tenant `sion` (Martín Ramírez y Jose Luis Romero).
 *
 * Un "admin-barbero" tiene rol='admin' (acceso al panel completo) Y aparece
 * en la agenda como barbero atendible (disponible:true). Requiere DOS docs
 * en tenants/sion/barberos/:
 *
 *   1) Doc PRINCIPAL (ya existe del seed: `martin-ramirez`, `jose-luis-romero`)
 *      → se le agrega authUid, email, rol='admin', disponible:true, activo:true.
 *
 *   2) Doc ESPEJO en `barberos/{authUid}` con _mainDocId → principal.
 *      Este doc es el que lee AuthContext por UID para resolver el rol.
 *      Las listas de Equipo/Configuracion filtran `_mainDocId` para no
 *      duplicar (memoria: "Dedupe barberos en listas").
 *
 * 3 pasos por cuenta:
 *   a) Firebase Auth: createUser(email, password, emailVerified:true)
 *      — idempotente: si ya existe, resetea password + displayName.
 *   b) Custom claims: { role:'admin', tenantId:'sion' }
 *   c) Escritura de doc principal (link) + doc espejo (_mainDocId).
 *
 * Uso:
 *   node scripts/crear-admin-barberos-sion.js            (dry-run)
 *   node scripts/crear-admin-barberos-sion.js --commit
 */
const path  = require('path');
const admin = require('firebase-admin');

const sa = require(path.resolve(__dirname, '..', 'service-account.json'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db   = admin.firestore();
const auth = admin.auth();
const { FieldValue } = admin.firestore;

const TENANT_ID = 'sion';
const COMMIT    = process.argv.includes('--commit');

const CUENTAS = [
  {
    mainDocId: 'martin-ramirez',
    nombre:    'Martín Ramírez',
    email:     'martinramireznn1992@gmail.com',
    password:  'martinramirezsion26',
  },
  {
    mainDocId: 'jose-luis-romero',
    nombre:    'Jose Luis Romero',
    email:     'joselrc06@gmail.com',
    password:  'barberosion26',
  },
];

const barberosCol = () => db.collection('tenants').doc(TENANT_ID).collection('barberos');

async function crearOReutilizarUser({ email, password, nombre }) {
  const emailN = email.trim().toLowerCase();
  try {
    const rec = await auth.createUser({
      email:         emailN,
      password,
      displayName:   nombre,
      emailVerified: true,
    });
    return { uid: rec.uid, reused: false };
  } catch (err) {
    if (err.code !== 'auth/email-already-exists') throw err;
    const rec = await auth.getUserByEmail(emailN);
    await auth.updateUser(rec.uid, {
      password,
      displayName:   nombre,
      emailVerified: true,
    });
    return { uid: rec.uid, reused: true };
  }
}

async function main() {
  console.log(`\n╔═══ Crear admin-barberos ${TENANT_ID} ${COMMIT ? '· COMMIT' : '· DRY-RUN'} ═══╗\n`);

  const resultados = [];

  for (const acc of CUENTAS) {
    console.log(`─ ${acc.nombre}  (${acc.email})`);

    // Verificar que el doc principal existe
    const mainRef  = barberosCol().doc(acc.mainDocId);
    const mainSnap = await mainRef.get();
    if (!mainSnap.exists) {
      console.log(`  ✗ NO existe doc principal barberos/${acc.mainDocId}. Se salta.`);
      resultados.push({ ...acc, error: 'main-doc-missing' });
      continue;
    }

    if (!COMMIT) {
      console.log(`  [DRY] crearía user Auth, claims { role:'admin', tenantId:'${TENANT_ID}' }`);
      console.log(`        actualizaría barberos/${acc.mainDocId} (authUid, rol=admin, disponible=true)`);
      console.log(`        crearía espejo barberos/{uid} con _mainDocId=${acc.mainDocId}\n`);
      resultados.push({ ...acc, uid: '<dry-run>' });
      continue;
    }

    // 1) Auth
    const { uid, reused } = await crearOReutilizarUser(acc);
    console.log(`  ✓ Auth uid=${uid}${reused ? ' (reutilizado)' : ''}`);

    // 2) Claims
    const current = (await auth.getUser(uid)).customClaims || {};
    if (current.role !== 'admin' || current.tenantId !== TENANT_ID) {
      await auth.setCustomUserClaims(uid, { role: 'admin', tenantId: TENANT_ID });
    }
    console.log(`  ✓ Claims { role:'admin', tenantId:'${TENANT_ID}' }`);

    // 3a) Update doc principal
    await mainRef.set({
      nombre:     acc.nombre,
      email:      acc.email,
      rol:        'admin',
      authUid:    uid,
      disponible: true,
      activo:     true,
      updatedAt:  FieldValue.serverTimestamp(),
    }, { merge: true });
    console.log(`  ✓ Doc principal barberos/${acc.mainDocId} linkeado`);

    // 3b) Doc espejo por UID
    await barberosCol().doc(uid).set({
      _mainDocId: acc.mainDocId,
      uid,
      email:      acc.email,
      nombre:     acc.nombre,
      rol:        'admin',
      activo:     true,
      updatedAt:  FieldValue.serverTimestamp(),
    }, { merge: true });
    console.log(`  ✓ Espejo barberos/${uid} creado con _mainDocId=${acc.mainDocId}\n`);

    resultados.push({ ...acc, uid });
  }

  console.log('╚═══ Listo ═══╝\n');
  console.log('Credenciales:\n');
  for (const r of resultados) {
    console.log(`  ${r.nombre}`);
    console.log(`    email    : ${r.email}`);
    console.log(`    password : ${r.password}`);
    if (r.uid && r.uid !== '<dry-run>') console.log(`    uid      : ${r.uid}`);
    if (r.error) console.log(`    ERROR    : ${r.error}`);
    console.log('');
  }
  console.log('  panel: https://sion.synaptechspa.cl/gestion-interna/\n');
}

main().then(() => process.exit(0)).catch(e => { console.error('\n✗ ERROR:', e); process.exit(1); });
