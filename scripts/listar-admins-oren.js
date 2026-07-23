/**
 * listar-admins-oren.js — Diagnóstico rápido: enumera todos los usuarios con
 * rol admin/jefe del tenant `oren`, cruzando el doc de Firestore con Firebase
 * Auth para mostrar el email real de login y la sede a la que están scopeados.
 */
const path  = require('path');
const admin = require('firebase-admin');

const sa = require(path.resolve(__dirname, '..', 'service-account.json'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db   = admin.firestore();
const auth = admin.auth();

const TENANT_ID = 'oren';
const barberosCol = () => db.collection('tenants').doc(TENANT_ID).collection('barberos');

async function main() {
  console.log(`\n╔═══ Admins & jefes del tenant ${TENANT_ID} ═══╗\n`);

  const snap = await barberosCol().get();
  const staff = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(x => ['admin', 'jefe'].includes(String(x.rol || '').toLowerCase()));

  if (!staff.length) {
    console.log('  ⚠ No hay usuarios con rol admin/jefe en este tenant.\n');
    return;
  }

  for (const s of staff) {
    let authEmail = '—', authDisabled = false, claims = {};
    if (s.uid) {
      try {
        const u = await auth.getUser(s.uid);
        authEmail = u.email || '—';
        authDisabled = u.disabled;
        claims = u.customClaims || {};
      } catch (e) { authEmail = `(auth error: ${e.code || e.message})`; }
    }
    console.log(`  · docId          : ${s.id}`);
    console.log(`    nombre         : ${s.nombre || '—'}`);
    console.log(`    rol            : ${s.rol}`);
    console.log(`    sucursalScope  : ${s.sucursalScope || '(sin scope — ve TODAS las sedes)'}`);
    console.log(`    activo         : ${s.activo}`);
    console.log(`    uid            : ${s.uid || '—'}`);
    console.log(`    email (doc)    : ${s.email || '—'}`);
    console.log(`    email (Auth)   : ${authEmail}${authDisabled ? '  (DISABLED)' : ''}`);
    console.log(`    Auth claims    : ${JSON.stringify(claims)}`);
    console.log('');
  }
}

main().catch(e => { console.error('\n✗ ERROR:', e); process.exit(1); });
