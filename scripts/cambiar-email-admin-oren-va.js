/**
 * cambiar-email-admin-oren-va.js — Reemplaza el email del admin de la sede
 * Villa Alemana del tenant oren:
 *   maximilianojcarrasco@gmail.com  →  contacto@snackhub.cl
 *
 * Toca tres capas y por eso se hace acá y no desde el panel:
 *   1) Firebase Auth: se cambia el email de login (auth.updateUser). Preserva
 *      UID, password y custom claims (rol / tenantId).
 *   2) tenants/oren/barberos/{uid}: se actualiza el email del doc-espejo.
 *   3) tenants/oren/barberos/{_mainDocId}: si el email vive también en el doc
 *      "principal" del staff (el que ve el panel de Equipo), se sincroniza.
 *
 * Uso:
 *   node scripts/cambiar-email-admin-oren-va.js            (dry-run, muestra plan)
 *   node scripts/cambiar-email-admin-oren-va.js --commit   (aplica los cambios)
 */
const path  = require('path');
const admin = require('firebase-admin');

const sa = require(path.resolve(__dirname, '..', 'service-account.json'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db   = admin.firestore();
const auth = admin.auth();

const TENANT_ID  = 'oren';
const SUCURSAL   = 'villaalemana';
const OLD_EMAIL  = 'maximilianojcarrasco@gmail.com';
const NEW_EMAIL  = 'contacto@snackhub.cl';
const COMMIT     = process.argv.includes('--commit');

const barberosCol = () => db.collection('tenants').doc(TENANT_ID).collection('barberos');

async function main() {
  console.log(`\n╔═══ Cambiar email admin ${TENANT_ID}/${SUCURSAL} ${COMMIT ? '· COMMIT' : '· DRY-RUN'} ═══╗`);
  console.log(`   ${OLD_EMAIL}  →  ${NEW_EMAIL}\n`);

  // 1) Encontrar candidatos por email en tenants/oren/barberos.
  const q = await barberosCol().where('email', '==', OLD_EMAIL).get();
  if (q.empty) {
    console.log('  ⚠ No hay docs en tenants/oren/barberos con ese email.');
  } else {
    console.log(`  🔎 Docs con email antiguo (${q.size}):`);
    q.docs.forEach(d => {
      const x = d.data();
      console.log(`     · id=${d.id}  rol=${x.rol}  sucursalScope=${x.sucursalScope || '—'}  activo=${x.activo}  nombre=${x.nombre || '—'}  uid=${x.uid || '—'}  _mainDocId=${x._mainDocId || '—'}`);
    });
  }

  // 2) Confirmar cuál es el admin real de la sede pedida. Puede haber más de
  //    un doc con ese email (uno "principal" tipo `oren-admin-va` y otro
  //    "espejo" bajo el UID). Aplicamos a TODOS los que coincidan por email.
  const adminsSede = q.docs.filter(d => {
    const x = d.data();
    const esAdmin = ['admin', 'jefe'].includes(String(x.rol || '').toLowerCase());
    const enSede  = !x.sucursalScope || x.sucursalScope === SUCURSAL || x.sucursalScope === 'all';
    return esAdmin && enSede;
  });
  if (!adminsSede.length) {
    console.log(`\n  ⚠ Ningún doc con ese email tiene rol admin/jefe para la sede ${SUCURSAL}.`);
    console.log(`     Los cambios de email se aplicarán igual sobre todos los docs coincidentes por email + al Auth user.`);
  }

  // 3) Firebase Auth: user por email viejo.
  let authUser = null;
  try {
    authUser = await auth.getUserByEmail(OLD_EMAIL);
    console.log(`\n  🔐 Auth user actual: uid=${authUser.uid}  disabled=${authUser.disabled}  claims=${JSON.stringify(authUser.customClaims || {})}`);
  } catch (e) {
    if (e.code === 'auth/user-not-found') {
      console.log('\n  ⚠ No hay Auth user con ese email — solo se actualizarán los docs de Firestore.');
    } else {
      throw e;
    }
  }

  // 4) Colisión: si NEW_EMAIL ya está tomado en Auth, no podemos cambiar.
  try {
    const collide = await auth.getUserByEmail(NEW_EMAIL);
    if (collide && (!authUser || collide.uid !== authUser.uid)) {
      throw new Error(`El correo ${NEW_EMAIL} ya está tomado en Auth por uid=${collide.uid}. No se puede reasignar sin liberar/mergear primero.`);
    }
    console.log(`  ℹ El correo nuevo ya apunta al mismo uid — sin cambio en Auth.`);
  } catch (e) {
    if (e.code !== 'auth/user-not-found') throw e;
    console.log(`  ✓ El correo nuevo ${NEW_EMAIL} está libre en Auth.`);
  }

  if (!COMMIT) {
    console.log('\n  → Dry-run. Volvé a correr con --commit para aplicar los cambios.\n');
    return;
  }

  // 5) Commit: Auth primero (más frágil), después Firestore en batch.
  if (authUser && authUser.email !== NEW_EMAIL) {
    await auth.updateUser(authUser.uid, { email: NEW_EMAIL, emailVerified: false });
    console.log(`  ✓ Auth email actualizado en uid=${authUser.uid}.`);
  }

  const batch = db.batch();
  for (const d of q.docs) {
    batch.update(d.ref, { email: NEW_EMAIL, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    console.log(`  ✓ Firestore update en tenants/${TENANT_ID}/barberos/${d.id}`);
    // Si tiene _mainDocId apuntando a otro doc, actualizarlo también.
    const x = d.data();
    if (x._mainDocId && x._mainDocId !== d.id) {
      batch.update(barberosCol().doc(x._mainDocId), { email: NEW_EMAIL, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      console.log(`  ✓ Firestore update en tenants/${TENANT_ID}/barberos/${x._mainDocId} (mainDoc)`);
    }
  }
  await batch.commit();
  console.log('\n╚═══ Listo ═══╝\n');
}

main().catch(e => { console.error('\n✗ ERROR:', e); process.exit(1); });
