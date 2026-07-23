/**
 * crear-admin-oren-va.js — Crea el admin de la sede Villa Alemana del tenant
 * oren con email contacto@snackhub.cl. Genera password inicial aleatoria y
 * la imprime al final para que se la comunique al usuario final.
 *
 * Tres cosas en una sola pasada:
 *   1) Firebase Auth: createUser(email, password, emailVerified:true)
 *   2) Custom claims: { role:'admin', tenantId:'oren', sucursalScope:'villaalemana' }
 *      El trigger `sincronizarClaimsTenant` también reescribe estos claims al
 *      crear el doc-espejo, pero acá los seteamos directo para evitar la
 *      ventana donde el user existe pero aún no tiene role/tenantId → no
 *      pasaría el guard esBarberoFirestore en el panel.
 *   3) Doc-espejo tenants/oren/barberos/{uid} con rol:'admin', sucursalScope,
 *      nombre, email, activo, creadoEn — necesario para que el panel resuelva
 *      el rol del user (rules leen el doc por UID). Sin este doc la memoria
 *      "roles: doc-espejo por UID" nos dice que se degrada admin → barbero.
 *
 * Uso:
 *   node scripts/crear-admin-oren-va.js            (dry-run)
 *   node scripts/crear-admin-oren-va.js --commit   (aplica)
 */
const path   = require('path');
const crypto = require('crypto');
const admin  = require('firebase-admin');

const sa = require(path.resolve(__dirname, '..', 'service-account.json'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db   = admin.firestore();
const auth = admin.auth();

const TENANT_ID    = 'oren';
const SUCURSAL_ID  = 'villaalemana';
const EMAIL        = 'contacto@snackhub.cl';
const NOMBRE       = 'Admin Villa Alemana';
const COMMIT       = process.argv.includes('--commit');

/**
 * Password inicial de 14 chars: 3 mayúsculas, 3 minúsculas, 3 dígitos, 1 símbolo
 * seguro (los que no rompen shells / copy-paste), y 4 caracteres random extras.
 * Se mezcla al final. Suficiente entropía para uso inicial; el user la cambia
 * al primer login desde el panel.
 */
function genPassword() {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';   // sin I ni O para no confundir
  const lower = 'abcdefghijkmnopqrstuvwxyz';  // sin l
  const digit = '23456789';                    // sin 0 ni 1
  const sym   = '!@#$%&*';
  const pool  = upper + lower + digit;
  const pick  = (chars, n) => Array.from({ length: n }, () => chars[crypto.randomInt(0, chars.length)]).join('');
  const raw   = pick(upper, 3) + pick(lower, 3) + pick(digit, 3) + pick(sym, 1) + pick(pool, 4);
  return raw.split('').sort(() => crypto.randomInt(0, 3) - 1).join('');
}

const barberosCol = () => db.collection('tenants').doc(TENANT_ID).collection('barberos');

async function main() {
  console.log(`\n╔═══ Crear admin ${TENANT_ID}/${SUCURSAL_ID} ${COMMIT ? '· COMMIT' : '· DRY-RUN'} ═══╗`);
  console.log(`   Nombre : ${NOMBRE}`);
  console.log(`   Email  : ${EMAIL}\n`);

  // 1) Chequeo de colisión: el email no puede estar tomado por otro user.
  try {
    const existe = await auth.getUserByEmail(EMAIL);
    console.log(`  ⚠ El correo ${EMAIL} YA existe en Auth (uid=${existe.uid}). Aborto — no piso una cuenta ajena.`);
    return;
  } catch (e) {
    if (e.code !== 'auth/user-not-found') throw e;
    console.log(`  ✓ El correo está libre en Auth.`);
  }

  const password = genPassword();
  console.log(`\n  🔑 Password inicial generada (guardala AHORA, no vuelve a mostrarse en el log):\n     ${password}\n`);

  if (!COMMIT) {
    console.log(`  → Dry-run. Corré con --commit para aplicar los cambios.\n`);
    return;
  }

  // 2) createUser en Auth. emailVerified:true evita el prompt de verificación
  //    inicial — al ser un usuario staff no queremos ese friction. displayName
  //    ayuda a identificar en la Consola.
  const created = await auth.createUser({
    email:         EMAIL,
    password,
    emailVerified: true,
    displayName:   NOMBRE,
  });
  const uid = created.uid;
  console.log(`  ✓ Auth user creado. uid=${uid}`);

  // 3) Custom claims. `role` con `e` (no `rol`), así lo espera setClaims en
  //    functions/index.js: al leerse en el cliente vía token, esas keys son
  //    las que pisan la validación.
  await auth.setCustomUserClaims(uid, {
    role:          'admin',
    tenantId:      TENANT_ID,
    sucursalScope: SUCURSAL_ID,
  });
  console.log(`  ✓ Custom claims seteados: role=admin, tenantId=${TENANT_ID}, sucursalScope=${SUCURSAL_ID}`);

  // 4) Doc-espejo. Sin este doc, el panel degrada el rol al leer barberos/{uid}
  //    y el user termina viéndose como barbero. Ver memoria "Roles: doc-espejo
  //    por UID". No lo marcamos como "barbero disponible" (no atiende): activo:false
  //    en la Agenda para no aparecer como opción de reserva, aunque el user
  //    sí pueda entrar al panel con rol admin.
  await barberosCol().doc(uid).set({
    nombre:        NOMBRE,
    email:         EMAIL,
    rol:           'admin',
    sucursalScope: SUCURSAL_ID,
    // uid + activo permite que las queries del panel de Equipo lo listen si
    // se quiere. `disponible:false` evita que aparezca como barbero agendable.
    uid,
    activo:        true,
    disponible:    false,
    creadoEn:      admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  console.log(`  ✓ Doc-espejo creado en tenants/${TENANT_ID}/barberos/${uid}`);

  console.log('\n╚═══ Listo ═══╝');
  console.log(`\n  Comunica al encargado:`);
  console.log(`     usuario  : ${EMAIL}`);
  console.log(`     password : ${password}`);
  console.log(`     panel    : https://oren.synaptechspa.cl/gestion-interna/`);
  console.log(`\n  Al primer login, sugerir cambio de password desde el panel.\n`);
}

main().catch(e => { console.error('\n✗ ERROR:', e); process.exit(1); });
