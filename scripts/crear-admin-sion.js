/**
 * crear-admin-sion.js — Crea el admin del tenant `sion` (Viña, 1 Oriente 985).
 *
 * Sion es single-tenant (NO multi-sucursal como oren), por eso no setea
 * sucursalScope. La password la fija el usuario final (no aleatoria).
 *
 * 3 pasos:
 *   1) Firebase Auth: createUser(email, password, emailVerified:true)
 *   2) Custom claims: { role:'admin', tenantId:'sion' }
 *   3) Doc-espejo tenants/sion/barberos/{uid} con rol:'admin' (obligatorio,
 *      sin este doc el panel degrada admin → barbero — ver memoria roles espejo)
 *
 * Uso:
 *   node scripts/crear-admin-sion.js            (dry-run)
 *   node scripts/crear-admin-sion.js --commit   (aplica)
 */
const path  = require('path');
const admin = require('firebase-admin');

const sa = require(path.resolve(__dirname, '..', 'service-account.json'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db   = admin.firestore();
const auth = admin.auth();

const TENANT_ID = 'sion';
const EMAIL     = 'Sionbarberiavina@gmail.com';
const PASSWORD  = 'Barberossion2026';
const NOMBRE    = 'Admin Sion';
const COMMIT    = process.argv.includes('--commit');

const barberosCol = () => db.collection('tenants').doc(TENANT_ID).collection('barberos');

async function main() {
  console.log(`\n╔═══ Crear admin ${TENANT_ID} ${COMMIT ? '· COMMIT' : '· DRY-RUN'} ═══╗`);
  console.log(`   Nombre : ${NOMBRE}`);
  console.log(`   Email  : ${EMAIL}\n`);

  let uid;
  let existente = null;

  try {
    existente = await auth.getUserByEmail(EMAIL);
    console.log(`  ⚠ El correo ${EMAIL} YA existe en Auth (uid=${existente.uid}).`);
    console.log(`    → No lo pisamos; solo aseguramos claims + doc-espejo + password.`);
    uid = existente.uid;
  } catch (e) {
    if (e.code !== 'auth/user-not-found') throw e;
    console.log(`  ✓ El correo está libre en Auth.`);
  }

  if (!COMMIT) {
    console.log(`\n  → Dry-run. Corré con --commit para aplicar los cambios.\n`);
    return;
  }

  if (!existente) {
    const created = await auth.createUser({
      email:         EMAIL,
      password:      PASSWORD,
      emailVerified: true,
      displayName:   NOMBRE,
    });
    uid = created.uid;
    console.log(`  ✓ Auth user creado. uid=${uid}`);
  } else {
    await auth.updateUser(uid, {
      password:      PASSWORD,
      emailVerified: true,
      displayName:   existente.displayName || NOMBRE,
    });
    console.log(`  ✓ Password reseteada para uid=${uid}`);
  }

  await auth.setCustomUserClaims(uid, {
    role:     'admin',
    tenantId: TENANT_ID,
  });
  console.log(`  ✓ Custom claims seteados: role=admin, tenantId=${TENANT_ID}`);

  await barberosCol().doc(uid).set({
    nombre:     NOMBRE,
    email:      EMAIL,
    rol:        'admin',
    uid,
    activo:     true,
    disponible: false,
    creadoEn:   admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  console.log(`  ✓ Doc-espejo creado/actualizado en tenants/${TENANT_ID}/barberos/${uid}`);

  console.log('\n╚═══ Listo ═══╝');
  console.log(`\n  Credenciales:`);
  console.log(`     usuario  : ${EMAIL}`);
  console.log(`     password : ${PASSWORD}`);
  console.log(`     panel    : https://sion.synaptechspa.cl/gestion-interna/`);
  console.log('');
}

main().catch(e => { console.error('\n✗ ERROR:', e); process.exit(1); });
