/**
 * seed-omega.js — Inicialización Firestore para Omega Studio (omegastudio)
 *
 * Crea bajo tenants/omegastudio/:
 *   servicios · barberos · configuracion · premios · profile · settings/theme · settings/general
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

const TENANT_ID = 'omegastudio';
const tenantRef = db.collection('tenants').doc(TENANT_ID);
const col       = (name) => tenantRef.collection(name);

function separador(titulo) {
  console.log(`\n── ${titulo} ${'─'.repeat(50 - titulo.length)}`);
}

// ── Servicios ────────────────────────────────────────────────────────────────
const SERVICIOS = [
  // Otros
  {
    id: 'srv-o-01',
    nombre: 'Perfilado de cejas y/o diseño',
    descripcion: '',
    precio: 2000, duracion: 5, categoria: 'Otros', icono: 'ph-sparkle', activo: true, orden: 0,
  },
  // Cortes
  {
    id: 'srv-o-02',
    nombre: 'Corte de Cabello',
    descripcion: 'El servicio de corte de cabello incluye una cortesía (Té, café, agua, refresco), asesoramiento, lavado de cabello, aplicación de producto (Cera, crema, polvo).',
    precio: 15000, duracion: 60, categoria: 'Cortes', icono: 'ph-scissors', activo: true, orden: 1,
  },
  // Combos
  {
    id: 'srv-o-03',
    nombre: 'Corte de cabello + cejas',
    descripcion: '',
    precio: 16000, duracion: 60, categoria: 'Combos', icono: 'ph-star', activo: true, orden: 2,
  },
  {
    id: 'srv-o-04',
    nombre: 'Corte de cabello + limpieza facial',
    descripcion: '',
    precio: 25000, duracion: 80, categoria: 'Combos', icono: 'ph-star', activo: true, orden: 3,
  },
  {
    id: 'srv-o-05',
    nombre: 'Corte de cabello + barba tradicional',
    descripcion: 'Promoción de corte de cabello más la barba tradicional.',
    precio: 25000, duracion: 80, categoria: 'Combos', icono: 'ph-crown', activo: true, orden: 4,
  },
  {
    id: 'srv-o-06',
    nombre: 'Corte de cabello + Barba express',
    descripcion: 'Promoción de corte de cabello más la barba express.',
    precio: 22000, duracion: 70, categoria: 'Combos', icono: 'ph-crown', activo: true, orden: 5,
  },
  {
    id: 'srv-o-07',
    nombre: 'Servicio full',
    descripcion: 'Promoción VIP que combina los tres servicios (Corte de cabello, barba tradicional y limpieza facial).',
    precio: 35000, duracion: 90, categoria: 'Combos', icono: 'ph-crown', activo: true, orden: 6,
  },
  // Barba
  {
    id: 'srv-o-08',
    nombre: 'Barba tradicional',
    descripcion: 'La barba tradicional consiste en rebajar y perfilar (Con ritual de toallas calientes más vapor para perfilar con navaja y lograr detalles más definidos).',
    precio: 13000, duracion: 40, categoria: 'Barba', icono: 'ph-mustache', activo: true, orden: 7,
  },
  {
    id: 'srv-o-09',
    nombre: 'Barba exprés',
    descripcion: 'La barba express consiste en rebajar, perfilar y/o rasurar solo con máquina.',
    precio: 10000, duracion: 30, categoria: 'Barba', icono: 'ph-mustache', activo: true, orden: 8,
  },
  // Facial
  {
    id: 'srv-o-10',
    nombre: 'Limpieza facial',
    descripcion: 'La limpieza facial consiste en limpiar el rostro sacando todas las impurezas de la cara con máquina de vapor, crema exfoliante, masaje facial, ritual de toallas calientes, mascarilla dorada para retirar puntos negros e hidratación de la piel con crema facial.',
    precio: 13000, duracion: 40, categoria: 'Facial', icono: 'ph-sparkles', activo: true, orden: 9,
  },
  // Color
  {
    id: 'srv-o-11',
    nombre: 'Ondulación permanente',
    descripcion: '',
    precio: 60000, duracion: 240, categoria: 'Color', icono: 'ph-drop', activo: true, orden: 10,
  },
  {
    id: 'srv-o-12',
    nombre: 'Visos color',
    descripcion: '',
    precio: 65000, duracion: 300, categoria: 'Color', icono: 'ph-palette', activo: true, orden: 11,
  },
  {
    id: 'srv-o-13',
    nombre: 'Color global',
    descripcion: '',
    precio: 75000, duracion: 300, categoria: 'Color', icono: 'ph-palette', activo: true, orden: 12,
  },
];

// ── Profesionales ────────────────────────────────────────────────────────────
const BARBEROS = [
  { id: 'omega-julian',  nombre: 'Julián Beltrán',  foto: null, disponible: true, activo: true, rol: 'profesional', orden: 0 },
  { id: 'omega-antonio', nombre: 'Antonio Morales', foto: null, disponible: true, activo: true, rol: 'profesional', orden: 1 },
  { id: 'omega-thomas',  nombre: 'Thomas Castillo', foto: null, disponible: true, activo: true, rol: 'profesional', orden: 2 },
];

// ── Configuración de horarios ────────────────────────────────────────────────
const CONFIG = {
  horarioInicio:    '10:00',
  horarioFin:       '20:00',
  intervaloMinutos: 30,
  diasLaborales:    [1, 2, 3, 4, 5, 6], // Lun–Sáb
  telefonoAdmin:    '56972302811',
  diasBloqueados:   [],
  colacion:         null,
  diasConfig:       {},
};

// ── Premios del club ─────────────────────────────────────────────────────────
const PREMIOS = [
  { id: 'omega-premio-1', nombre: 'Corte de Cabello Gratis',   costoSellos: 10, activo: true },
  { id: 'omega-premio-2', nombre: 'Barba Tradicional Gratis',  costoSellos: 8,  activo: true },
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
  separador('PROFESIONALES (LIMPIEZA Y CARGA)');

  const oldBarbers = await col('barberos').get();
  if (!oldBarbers.empty) {
    console.log(`  🗑️ Limpiando ${oldBarbers.size} barberos antiguos...`);
    const cleanBatch = db.batch();
    for (const doc of oldBarbers.docs) {
      const oldConfig = await doc.ref.collection('configuracion').get();
      for (const cfgDoc of oldConfig.docs) cleanBatch.delete(cfgDoc.ref);
      cleanBatch.delete(doc.ref);
    }
    await cleanBatch.commit();
    console.log('  ✅ Limpieza completada.');
  }

  const batch = db.batch();
  for (const b of BARBEROS) {
    const { id, ...data } = b;
    batch.set(col('barberos').doc(id), { ...data, creadoEn: TS() }, { merge: true });
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
  await col('configuracion').doc('main').set({ ...CONFIG, updatedAt: TS() }, { merge: true });
  console.log('✅ /configuracion/main lista.');
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

async function seedProfile() {
  separador('PERFIL & TEMA');

  await tenantRef.collection('profile').doc('main').set({
    name:            'Omega Studio',
    shortName:       'Omega',
    slogan:          'Estudio atendido por profesionales',
    club:            'Club Omega',
    address:         '📍 Av. Valparaíso 595, Local 53, 2do Piso | Viña del Mar',
    scheduleText:    'Lunes a Sábado · ¡Reserva tu hora!',
    phone:           '56972302811',
    logoUrl:         '/omega.jpg',
    instagram:       'https://www.instagram.com/omegastudio.cl/',
    pageTitle:       'Omega Studio | Agenda tu hora en Viña del Mar',
    metaDescription: 'Reserva tu hora en Omega Studio. Cortes, barba, facial y color en Av. Valparaíso 595, Local 53, Viña del Mar.',
    updatedAt:       TS(),
  }, { merge: true });

  await tenantRef.collection('settings').doc('theme').set({
    colorBg:            '#0c0c0e',
    colorSurface:       '#141416',
    colorSurfaceAlt:    '#1c1c1f',
    colorPrimary:       '#d4a96a',
    colorAccent:        '#c08040',
    colorText:          '#f0ede8',
    colorMuted:         '#9ca3af',
    colorBorder:        'rgba(212,169,106,0.15)',
    colorGlow:          'rgba(212,169,106,0.20)',
    colorButtonText:    '#0c0c0e',
    colorProgressTrack: 'rgba(212,169,106,0.08)',
    updatedAt:          TS(),
  }, { merge: true });

  await tenantRef.collection('settings').doc('general').set({
    features: {
      hasCourses:          false,
      hasChairRental:      false,
      hasAcademiaInternal: false,
    },
    updatedAt: TS(),
  }, { merge: true });

  console.log('✅ /profile/main, /settings/theme y /settings/general listos.');
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function seed() {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║        Omega Studio (omegastudio) — Seed         ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`Proyecto: barberia-elegance  |  Tenant: ${TENANT_ID}\n`);

  await seedServicios();
  await seedBarberos();
  await seedConfiguracion();
  await seedPremios();
  await seedProfile();

  console.log('\n✅ Seed completado con éxito');
  process.exit(0);
}

seed().catch(err => {
  console.error('\n❌ Error durante el seed:', err.message);
  process.exit(1);
});
