/**
 * seed-aura.js — Inicialización Firestore para AURA SALÓN & MALE GROOMING
 *
 * Crea bajo tenants/aura/:
 *   servicios · barberos · configuracion · premios · profile · settings/theme
 */

const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'service-account.json');
let credential;
if (fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  credential = admin.credential.cert(JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8')));
  console.log('🔑 Usando service-account.json');
} else {
  credential = admin.credential.applicationDefault();
  console.log('🔑 Usando Application Default Credentials');
}

admin.initializeApp({ credential, projectId: 'barberia-elegance' });

const db = admin.firestore();
const TS = admin.firestore.FieldValue.serverTimestamp;

const TENANT_ID = 'aura';
const tenantRef = db.collection('tenants').doc(TENANT_ID);
const col       = (name) => tenantRef.collection(name);

function separador(titulo) {
  console.log(`\n── ${titulo} ${'─'.repeat(50 - titulo.length)}`);
}

// ── Servicios ────────────────────────────────────────────────────────────────
const SERVICIOS = [
  // Cortes
  { id: 'srv-a-01', nombre: 'Corte de Cabello Profesional',               precio: 19990, duracion: 60, categoria: 'Cortes', icono: 'ph-scissors', activo: true, orden: 0 },
  { id: 'srv-a-02', nombre: 'Corte de Cabello de precisión sólo a tijeras',precio: 22990, duracion: 60, categoria: 'Cortes', icono: 'ph-scissors', activo: true, orden: 1 },
  
  // Barba
  { id: 'srv-a-03', nombre: 'Perfilado y arreglo de Barba',                 precio: 14990, duracion: 30, categoria: 'Barba', icono: 'ph-mustache', activo: true, orden: 2 },
  { id: 'srv-a-04', nombre: 'Perfilado y arreglo de Barba paños calientes', precio: 19990, duracion: 40, categoria: 'Barba', icono: 'ph-mustache', activo: true, orden: 3 },
  
  // Packs de Servicios
  { id: 'srv-a-05', nombre: 'Corte, perfilado y arreglo de Barba paños calientes', precio: 34990, duracion: 60, categoria: 'Packs de Servicios', icono: 'ph-star', activo: true, orden: 4 },
  { id: 'srv-a-06', nombre: 'Corte, perfilado y arreglo de barba',                 precio: 29990, duracion: 60, categoria: 'Packs de Servicios', icono: 'ph-star', activo: true, orden: 5 },
  
  // Tratamientos y Color
  { id: 'srv-a-07', nombre: 'Ondulación permanente', precio: 60000, duracion: 180, categoria: 'Tratamientos y Color', icono: 'ph-drop', activo: true, orden: 6 },
  { id: 'srv-a-08', nombre: 'Global',                precio: 80000, duracion: 240, categoria: 'Tratamientos y Color', icono: 'ph-palette', activo: true, orden: 7 },
  { id: 'srv-a-09', nombre: 'Mechas / Visos',        precio: 60000, duracion: 240, categoria: 'Tratamientos y Color', icono: 'ph-palette', activo: true, orden: 8 },

  // Suscripciones Mensuales
  { id: 'srv-a-10', nombre: '2 cortes al mes',                     precio: 29990, duracion: 60, categoria: 'Suscripciones Mensuales', icono: 'ph-calendar-check', activo: true, orden: 9 },
  { id: 'srv-a-11', nombre: '2 cortes y 2 arreglo de barba al mes', precio: 49990, duracion: 60, categoria: 'Suscripciones Mensuales', icono: 'ph-calendar-check', activo: true, orden: 10 },
  { id: 'srv-a-12', nombre: '4 cortes al mes',                     precio: 49990, duracion: 60, categoria: 'Suscripciones Mensuales', icono: 'ph-calendar-check', activo: true, orden: 11 },
  { id: 'srv-a-13', nombre: '2 Perfilados Barba al mes',           precio: 29990, duracion: 60, categoria: 'Suscripciones Mensuales', icono: 'ph-calendar-check', activo: true, orden: 12 },

  // Experiencias Premium (Aura)
  { id: 'srv-a-14', nombre: 'AURA PRIME',      precio: 34990, duracion: 60, categoria: 'Experiencias Premium', icono: 'ph-crown', activo: true, orden: 13 },
  { id: 'srv-a-15', nombre: '#ELEVATUAURA',    precio: 49990, duracion: 90, categoria: 'Experiencias Premium', icono: 'ph-sparkle', activo: true, orden: 14 },
  { id: 'srv-a-16', nombre: 'AURA RITUAL',     precio: 19990, duracion: 30, categoria: 'Experiencias Premium', icono: 'ph-leaf', activo: true, orden: 15 },
];

// ── Profesionales ────────────────────────────────────────────────────────────
const BARBEROS = [
  { id: 'aura-manolito', nombre: 'Manolito',          foto: null, disponible: true, activo: true, rol: 'profesional', orden: 0 },
  { id: 'aura-jocce',    nombre: 'Jocce Garcia (JG)', foto: null, disponible: true, activo: true, rol: 'profesional', orden: 1 },
  { id: 'aura-chiky',    nombre: 'Chiky barber',      foto: null, disponible: true, activo: true, rol: 'profesional', orden: 2 },
  { id: 'aura-matiaz',   nombre: 'Matiaz cutz',       foto: null, disponible: true, activo: true, rol: 'profesional', orden: 3 },
  { id: 'aura-lina',     nombre: 'Maximiliano',       foto: null, disponible: true, activo: true, rol: 'profesional', orden: 4 },
];

// ── Configuración de horarios ────────────────────────────────────────────────
const CONFIG = {
  horarioInicio:    '10:00',
  horarioFin:       '20:00',
  intervaloMinutos: 30,
  diasLaborales:    [1, 2, 3, 4, 5, 6], // Lun–Sáb
  telefonoAdmin:    '56900000000',
  diasBloqueados:   [],
  colacion:         null,
  diasConfig:       {},
};

// ── Premios del club ─────────────────────────────────────────────────────────
const PREMIOS = [
  { id: 'aura-premio-1', nombre: 'Aura Ritual Gratis',      costoSellos: 10, activo: true },
  { id: 'aura-premio-2', nombre: 'Corte de Cabello Gratis', costoSellos: 15, activo: true },
];

// ── Productos ────────────────────────────────────────────────────────────────
const PRODUCTOS = [
  { id: 'aura-prod-01', nombre: 'Lightwork',             descripcion: 'Crema de peinado premium para una fijación flexible y un acabado natural.',           categoria: 'Crema de peinado',      precio: 25990, stock: 5, imagen: '', imagenPath: '', activo: true },
  { id: 'aura-prod-02', nombre: 'Clay Pomade',           descripcion: 'Pomada de arcilla de alta fijación y efecto mate ideal para estructurar tu cabello.',  categoria: 'Pomada de arcilla',     precio: 25990, stock: 5, imagen: '', imagenPath: '', activo: true },
  { id: 'aura-prod-03', nombre: 'Hair Styling Powder',   descripcion: 'Polvo texturizador ultra ligero que aporta volumen instantáneo y acabado mate de larga duración.', categoria: 'Polvo texturizador',    precio: 25990, stock: 5, imagen: '', imagenPath: '', activo: true },
  { id: 'aura-prod-04', nombre: 'Cream Styler',          descripcion: 'Crema de fijación media con acondicionamiento para estilos clásicos y manejables.',    categoria: 'Crema de fijación',     precio: 25990, stock: 5, imagen: '', imagenPath: '', activo: true },
  { id: 'aura-prod-05', nombre: 'Curl Cream',            descripcion: 'Crema nutritiva para definir, hidratar y dar elasticidad a tus rizos de forma natural.',  categoria: 'Crema para rizos',      precio: 25990, stock: 5, imagen: '', imagenPath: '', activo: true },
  { id: 'aura-prod-06', nombre: 'Sea Salt Spray',        descripcion: 'Spray de sal marina que añade textura playera y volumen sin resecar tu cabello.',     categoria: 'Spray de sal marina',   precio: 27990, stock: 5, imagen: '', imagenPath: '', activo: true },
];

// ── Seed functions ────────────────────────────────────────────────────────────
async function seedServicios() {
  separador('SERVICIOS');
  const batch = db.batch();
  for (const srv of SERVICIOS) {
    const { id, ...data } = srv;
    batch.set(col('servicios').doc(id), { ...data, updatedAt: TS() }, { merge: true });
    console.log(`  → [${data.categoria}] ${data.nombre} ($${(data.precio / 1000).toFixed(1)}k)`);
  }
  await batch.commit();
  console.log(`✅ ${SERVICIOS.length} servicios creados.`);
}

async function seedBarberos() {
  separador('PROFESIONALES');
  const batch = db.batch();
  for (const b of BARBEROS) {
    const { id, ...data } = b;
    const existingDoc = await col('barberos').doc(id).get();
    const existingData = existingDoc.exists ? existingDoc.data() : {};
    const foto = existingData.foto || data.foto;
    batch.set(col('barberos').doc(id), { ...data, foto, creadoEn: TS() }, { merge: true });
    console.log(`  → ${data.nombre} (${data.rol})`);
  }
  await batch.commit();

  for (const b of BARBEROS) {
    await col('barberos').doc(b.id).collection('configuracion').doc('main').set({
      ...CONFIG,
      updatedAt: TS(),
    }, { merge: true });
  }
  console.log(`✅ ${BARBEROS.length} profesionales creados con configuración.`);
}

async function seedConfiguracion() {
  separador('CONFIGURACIÓN');
  await col('configuracion').doc('main').set({ ...CONFIG, productosActivos: true, updatedAt: TS() }, { merge: true });
  await col('config').doc('ui').set({ productosActivos: true, updatedAt: TS() }, { merge: true });
  console.log('✅ /configuracion/main y /config/ui listos.');
}

async function seedPremios() {
  separador('PREMIOS CLUB');
  const batch = db.batch();
  for (const p of PREMIOS) {
    const { id, ...data } = p;
    batch.set(col('premios').doc(id), { ...data, creadoEn: TS() }, { merge: true });
    console.log(`  → ${data.nombre} (${data.costoSellos} sellos)`);
  }
  await batch.commit();
  console.log(`✅ ${PREMIOS.length} premios creados.`);
}

async function seedProductos() {
  separador('PRODUCTOS');
  const batch = db.batch();
  for (const prod of PRODUCTOS) {
    const { id, ...data } = prod;
    batch.set(col('productos').doc(id), { ...data, createdAt: TS(), creadoEn: TS(), updatedAt: TS() }, { merge: true });
    console.log(`  → ${data.nombre} (${data.descripcion}) - $${data.precio} - Stock: ${data.stock}`);
  }
  await batch.commit();
  console.log(`✅ ${PRODUCTOS.length} productos creados.`);
}

async function seedProfile() {
  separador('PERFIL & TEMA');

  await tenantRef.collection('profile').doc('main').set({
    name:            'AURA SALÓN & MALE GROOMING',
    shortName:       'Aura',
    slogan:          'Eleva Tu Aura',
    club:            'Club Aura',
    address:         'Viña del Mar',
    scheduleText:    'Reagenda con mín. 24 hrs',
    phone:           '56900000000',
    logoUrl:         '/aura.png',
    instagram:       'https://www.instagram.com/',
    pageTitle:       'Agendar Hora | Aura Salón & Male Grooming',
    metaDescription: 'Reserva tu hora en Aura Salón. Corte de cabello profesional, barba, tratamientos y experiencias premium.',
    updatedAt:       TS(),
  }, { merge: true });

  await tenantRef.collection('settings').doc('theme').set({
    colorBg:            '#0a0a0a',
    colorSurface:       '#141414',
    colorSurfaceAlt:    '#1f1f1f',
    colorPrimary:       '#fbbf24', // Dorado/Amarillo
    colorAccent:        '#f59e0b',
    colorText:          '#f8fafc',
    colorMuted:         '#94a3b8',
    colorBorder:        'rgba(251,191,36,0.15)', // Dorado tenue
    colorGlow:          'rgba(251,191,36,0.22)',
    colorButtonText:    '#000000', // Texto negro en botones dorados
    colorProgressTrack: '#171717',
    updatedAt:          TS(),
  }, { merge: true });

  // Add the base settings document required by the admin panel
  await tenantRef.collection('settings').doc('general').set({
    features: {
      hasCourses: false,
      hasChairRental: false,
      hasAcademiaInternal: false,
    },
    updatedAt: TS(),
  }, { merge: true });

  console.log('✅ /profile/main, /settings/theme, y /settings/general listos.');
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function seed() {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║     Aura Salón & Male Grooming — Seed            ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`Proyecto: barberia-elegance  |  Tenant: ${TENANT_ID}\n`);

  await seedServicios();
  await seedBarberos();
  await seedConfiguracion();
  await seedPremios();
  await seedProductos();
  await seedProfile();

  console.log('\n✅ Seed completado con éxito');
  process.exit(0);
}

seed().catch(err => {
  console.error('\n❌ Error durante el seed:', err.message);
  process.exit(1);
});
