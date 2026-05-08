/**
 * seed-barberos.js — Inicialización completa de Firestore para Elegance Barbershop
 *
 * Crea/actualiza todas las colecciones necesarias para el funcionamiento del sistema:
 *   barberos · configuracion · servicios · premios
 *
 * Uso:
 *   1. Descarga la clave de servicio desde Firebase Console:
 *      Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada
 *   2. Guarda el archivo como "service-account.json" en la raíz del proyecto
 *   3. node seed-barberos.js
 *
 * Requiere que el admin (ADMIN_EMAIL) ya tenga cuenta en Firebase Auth.
 * Si aún no la tiene, créala en Firebase Console → Authentication → Users.
 */

const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

// Buscar credenciales: service-account.json tiene prioridad, luego ADC
const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'service-account.json');

let credential;
if (fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));
  credential = admin.credential.cert(serviceAccount);
  console.log('🔑 Usando service-account.json');
} else {
  credential = admin.credential.applicationDefault();
  console.log('🔑 Usando Application Default Credentials');
}

admin.initializeApp({
  credential,
  projectId: 'barberia-elegance',
});

const db   = admin.firestore();
const auth = admin.auth();

// ── Configuración del negocio ────────────────────────────────────────────────
const ADMIN_EMAIL  = 'ignaciiio.mate@gmail.com';
const LOCAL_ID     = 'elegance';

const SHOP = {
  nombre:   '𝐄𝐥𝐞𝐠𝐚𝐧𝐜𝐞 𝐛𝐚𝐫𝐛𝐞𝐫𝐬𝐡𝐨𝐩',
  slogan:   'No es un corte, es elegancia que te mereces',
  direccion: 'Ecuador 243 | Viña del Mar',
  horario:  'Lun-Sáb: 10-20h | Dom: 12-20h',
  telefono: '',
  logo:     '/logo.jpg',
  club:     'Club Elegance',
};

// ── Servicios iniciales ──────────────────────────────────────────────────────
const SERVICIOS = [
  { id: 'srv-1', nombre: 'Corte Clásico',  precio: 15000, duracion: 60, activo: true, orden: 0 },
  { id: 'srv-2', nombre: 'Barba Premium',  precio: 10000, duracion: 30, activo: true, orden: 1 },
  { id: 'srv-3', nombre: 'Corte + Barba',  precio: 22000, duracion: 90, activo: true, orden: 2 },
  { id: 'srv-4', nombre: 'Cejas',          precio:  5000, duracion: 15, activo: true, orden: 3 },
];

// ── Premios del club de fidelización ────────────────────────────────────────
const PREMIOS = [
  { id: 'premio-1', nombre: 'Corte Gratis',    costoSellos: 10, descripcion: 'Canjea 10 sellos por un corte gratis', activo: true },
  { id: 'premio-2', nombre: 'Barba Gratis',    costoSellos:  5, descripcion: 'Canjea 5 sellos por una barba gratis',  activo: true },
  { id: 'premio-3', nombre: 'Corte + Barba',   costoSellos: 14, descripcion: 'Canjea 14 sellos por corte y barba',   activo: true },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
const TS = admin.firestore.FieldValue.serverTimestamp;

function separador(titulo) {
  console.log(`\n── ${titulo} ${'─'.repeat(50 - titulo.length)}`);
}

// ── Paso 1: Resolver UID del admin por email ─────────────────────────────────
async function resolverAdmin() {
  separador('ADMIN');
  try {
    const user = await auth.getUserByEmail(ADMIN_EMAIL);
    console.log(`✅ Admin encontrado en Auth → UID: ${user.uid}`);
    return user.uid;
  } catch (e) {
    if (e.code === 'auth/user-not-found') {
      console.warn(`⚠️  ${ADMIN_EMAIL} todavía no tiene cuenta en Firebase Auth.`);
      console.warn(`   → Inicia sesión en la app una vez y vuelve a ejecutar este script.`);
      console.warn(`   → El acceso de admin funciona de todas formas gracias al bootstrap.`);
      return null;
    }
    throw e;
  }
}

// ── Paso 2: Colección /barberos ───────────────────────────────────────────────
async function seedBarberos(adminUid) {
  separador('BARBEROS');
  const batch = db.batch();

  if (adminUid) {
    const ref = db.collection('barberos').doc(adminUid);
    batch.set(ref, {
      uid:      adminUid,
      nombre:   'Ignacio',
      email:    ADMIN_EMAIL,
      local:    LOCAL_ID,
      rol:      'jefe',
      activo:   true,
      foto:     '',
      creadoEn: TS(),
    }, { merge: true });
    console.log(`  → Admin/jefe: ${ADMIN_EMAIL} (${adminUid})`);
  } else {
    console.log('  ⏭  Admin omitido (UID desconocido, usará bootstrap).');
  }

  await batch.commit();
  console.log('✅ /barberos lista.');
}

// ── Paso 3: Colección /configuracion ─────────────────────────────────────────
async function seedConfiguracion() {
  separador('CONFIGURACION');
  await db.collection('configuracion').doc('main').set({
    ...SHOP,
    local:     LOCAL_ID,
    updatedAt: TS(),
  }, { merge: true });
  console.log('✅ /configuracion/main lista.');
}

// ── Paso 4: Colección /servicios ──────────────────────────────────────────────
async function seedServicios() {
  separador('SERVICIOS');
  const batch = db.batch();
  for (const srv of SERVICIOS) {
    const { id, ...data } = srv;
    batch.set(db.collection('servicios').doc(id), data, { merge: true });
    console.log(`  → ${srv.nombre} ($${(srv.precio / 1000).toFixed(0)}k)`);
  }
  await batch.commit();
  console.log('✅ /servicios lista.');
}

// ── Paso 5: Colección /premios ────────────────────────────────────────────────
async function seedPremios() {
  separador('PREMIOS');
  const batch = db.batch();
  for (const p of PREMIOS) {
    const { id, ...data } = p;
    batch.set(db.collection('premios').doc(id), data, { merge: true });
    console.log(`  → ${p.nombre} (${p.costoSellos} sellos)`);
  }
  await batch.commit();
  console.log('✅ /premios lista.');
}

// ── Paso 6: Colección /tenants (perfil SaaS) ──────────────────────────────────
async function seedTenants() {
  separador('TENANTS');
  const tenantRef = db.collection('tenants').doc(LOCAL_ID);

  await tenantRef.collection('profile').doc('main').set({
    name:            SHOP.nombre,
    shortName:       'Elegance',
    slogan:          SHOP.slogan,
    club:            SHOP.club,
    address:         SHOP.direccion,
    scheduleText:    SHOP.horario,
    phone:           SHOP.telefono,
    logoUrl:         SHOP.logo,
    pageTitle:       'Agendar Hora | Elegance Barbershop',
    metaDescription: 'Reserva tu hora en Elegance Barbershop. Cortes, barba y más.',
    updatedAt:       TS(),
  }, { merge: true });

  await tenantRef.collection('settings').doc('theme').set({
    colorBg:      '#050505',
    colorSurface: '#0a0a0d',
    colorPrimary: '#ffffff',
    colorAccent:  '#d4d4d8',
    updatedAt:    TS(),
  }, { merge: true });

  console.log(`✅ /tenants/${LOCAL_ID}/profile y /settings listos.`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function seed() {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║   Elegance Barbershop — Inicialización Firestore  ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`Proyecto: barberia-elegance\n`);

  const adminUid = await resolverAdmin();

  await seedBarberos(adminUid);
  await seedConfiguracion();
  await seedServicios();
  await seedPremios();
  await seedTenants();

  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║   ✅  Inicialización completada con éxito          ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  if (!adminUid) {
    console.log('⚠️  PENDIENTE: vuelve a ejecutar este script después de');
    console.log(`   que ${ADMIN_EMAIL} inicie sesión por primera vez.\n`);
  }

  process.exit(0);
}

seed().catch(err => {
  console.error('\n❌ Error durante la inicialización:', err.message);
  process.exit(1);
});
