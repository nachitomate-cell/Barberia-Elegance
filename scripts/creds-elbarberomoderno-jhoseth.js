/**
 * scripts/creds-elbarberomoderno-jhoseth.js
 * Crea/actualiza credenciales para Jhoseth Morales (barbero + admin del
 * tenant elbarberomoderno).
 *
 * - Crea Auth (idempotente: si el email ya existe, actualiza el password).
 * - Enlaza al doc principal existente: tenants/elbarberomoderno/barberos/jhoseth-morales
 *   con { uid, email, rol: 'admin', activo: true } (merge, no pisa horario/foto/etc.)
 * - Crea doc mirror bajo el UID: tenants/elbarberomoderno/barberos/{uid}
 *   con { _mainDocId, uid, email, nombre, rol, activo }.
 *
 * Uso: node scripts/creds-elbarberomoderno-jhoseth.js
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const SA = path.join(__dirname, '..', 'service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(fs.readFileSync(SA, 'utf8'))),
  projectId: 'barberia-elegance',
});

const db = admin.firestore();
const auth = admin.auth();
const TENANT = 'elbarberomoderno';

const BARBERO = {
  id: 'jhoseth-morales',
  nombre: 'Jhoseth Morales',
  email: 'jhosethmorales2@gmail.com',
  password: 'BarberoModerno-Jhoseth-2026',
};

async function run() {
  console.log(`\n▶ ${BARBERO.nombre} (${TENANT})`);
  let user;

  // 1. Crear o recuperar Auth
  try {
    user = await auth.createUser({
      email: BARBERO.email,
      password: BARBERO.password,
      displayName: BARBERO.nombre,
    });
    console.log(`  ✔ Auth creado: ${BARBERO.email}  (uid ${user.uid})`);
  } catch (e) {
    if (e.code === 'auth/email-already-exists') {
      user = await auth.getUserByEmail(BARBERO.email);
      await auth.updateUser(user.uid, {
        password: BARBERO.password,
        displayName: BARBERO.nombre,
      });
      console.log(`  ✔ Auth ya existía. Password actualizado. (uid ${user.uid})`);
    } else {
      console.error(`  ✗ ${e.message}`);
      process.exit(1);
    }
  }

  // 2. Enlazar doc principal (merge, no pisa foto/servicios/etc.)
  //    Además del rol admin, marcamos mostrarEnAgenda:true para que la grilla
  //    del panel lo dibuje como columna (el filtro por defecto oculta admins
  //    puros). Y sembramos un objeto `horarios` L-S 10-20 por si algún
  //    componente futuro lo lee — la agenda actual toma el rango horario del
  //    tenant, no del barbero.
  const HORARIO_DEFAULT = { inicio: '10:00', fin: '20:00', activo: true };
  const HORARIO_DESCANSO = { inicio: '10:00', fin: '20:00', activo: false };
  const HORARIOS = {
    lunes:     HORARIO_DEFAULT,
    martes:    HORARIO_DEFAULT,
    miercoles: HORARIO_DEFAULT,
    jueves:    HORARIO_DEFAULT,
    viernes:   HORARIO_DEFAULT,
    sabado:    HORARIO_DEFAULT,
    domingo:   HORARIO_DESCANSO,
  };

  const mainRef = db
    .collection('tenants').doc(TENANT)
    .collection('barberos').doc(BARBERO.id);
  await mainRef.set({
    email: BARBERO.email.toLowerCase(),
    uid: user.uid,
    rol: 'admin',           // dueño con permisos full en el panel
    activo: true,
    disponible: true,
    mostrarEnAgenda: true,  // opt-in: aparece como columna aunque sea admin
    esBarbero: true,        // flag alterno leído por otras vistas
    nombre: BARBERO.nombre,
    horarios: HORARIOS,
  }, { merge: true });
  console.log(`  ✔ Doc principal enlazado: tenants/${TENANT}/barberos/${BARBERO.id}`);

  // 3. Doc mirror bajo el UID (para lookup rápido por sesión)
  const mirrorRef = db
    .collection('tenants').doc(TENANT)
    .collection('barberos').doc(user.uid);
  await mirrorRef.set({
    _mainDocId: BARBERO.id,
    uid: user.uid,
    email: BARBERO.email.toLowerCase(),
    nombre: BARBERO.nombre,
    rol: 'admin',
    activo: true,
    mostrarEnAgenda: true,
    esBarbero: true,
  }, { merge: true });
  console.log(`  ✔ Doc de enlace creado bajo UID: ${user.uid}`);

  console.log('\n════════════════════════════════════════════════');
  console.log('  CREDENCIALES FINALES');
  console.log('════════════════════════════════════════════════\n');
  console.log(`${BARBERO.nombre}`);
  console.log(`  ${BARBERO.email}`);
  console.log(`  ${BARBERO.password}`);
  console.log(`  uid: ${user.uid}`);
  console.log(`  tenant: ${TENANT}`);
  console.log(`  rol: admin (aparece como barbero en agenda + acceso full al panel)\n`);
  process.exit(0);
}

run().catch(e => { console.error('\n✗ Error:', e); process.exit(1); });
