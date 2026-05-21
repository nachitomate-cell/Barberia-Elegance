/**
 * seed-lumen.js — Inicialización Firestore para D'Jones Barber
 *
 * Crea bajo tenants/lumen/:
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

const TENANT_ID = 'lumen';
const tenantRef = db.collection('tenants').doc(TENANT_ID);
const col       = (name) => tenantRef.collection(name);

function separador(titulo) {
  console.log(`\n── ${titulo} ${'─'.repeat(50 - titulo.length)}`);
}

// ── Servicios ────────────────────────────────────────────────────────────────
const SERVICIOS = [
  // Cortes
  { id: 'srv-l-01', nombre: 'Corte de Cabello',               precio: 14000, duracion: 60, categoria: 'Cortes', icono: 'ph-scissors', activo: true, orden: 0 },
  { id: 'srv-l-02', nombre: 'Corte de cabello + cejas',      precio: 15000, duracion: 60, categoria: 'Cortes', icono: 'ph-scissors', activo: true, orden: 1 },
  { id: 'srv-l-03', nombre: 'Corte cabello largo',           precio: 18000, duracion: 60, categoria: 'Cortes', icono: 'ph-scissors', activo: true, orden: 2 },
  
  // Barba
  { id: 'srv-l-07', nombre: 'Ritual de Barba',                 precio: 14000, duracion: 40, categoria: 'Barba', icono: 'ph-mustache', activo: true, orden: 3 },
  { id: 'srv-l-08', nombre: 'Barba express',                   precio: 10000, duracion: 30, categoria: 'Barba', icono: 'ph-mustache', activo: true, orden: 4 },
  
  // Combos / Packs
  { id: 'srv-l-04', nombre: 'Corte de cabello + barba express',  precio: 20000, duracion: 75, categoria: 'Combos', icono: 'ph-star', active: true, orden: 5 },
  { id: 'srv-l-05', nombre: 'Corte de cabello + ritual de barba',precio: 24000, duracion: 90, categoria: 'Combos', icono: 'ph-crown', active: true, orden: 6 },
  
  // Extras
  { id: 'srv-l-06', nombre: 'Cejas con navaja',               precio: 3000,  duracion: 15, categoria: 'Extras', icono: 'ph-eye', active: true, orden: 7 },

  // Otros
  { id: 'srv-l-09', nombre: 'Tratamiento químico',             precio: 30000, duracion: 60, categoria: 'Otros', icono: 'ph-drop', active: true, orden: 8 },
  { id: 'srv-l-10', nombre: 'Ondulaciones permanentes',        precio: 50000, duracion: 120, categoria: 'Otros', icono: 'ph-sparkles', active: true, orden: 9 }
];

// ── Profesionales ────────────────────────────────────────────────────────────
const BARBEROS = [
  { id: 'brayan-soto',      nombre: 'Brayan Soto',      foto: 'https://dcx13p9dsx90t.cloudfront.net/uploads/attachment_images/250141/attachment_870cf32e763eb130.png', disponible: true, activo: true, rol: 'profesional', orden: 0 },
  { id: 'valeria-narvaez',  nombre: 'Valeria Narvaez',  foto: 'https://dcx13p9dsx90t.cloudfront.net/uploads/attachment_images/278445/attachment_c1a02d21144da9f9.png', disponible: true, activo: true, rol: 'profesional', orden: 1 },
  { id: 'jorge-espinosa',   nombre: 'Jorge Espinosa',   foto: null, disponible: true, activo: true, rol: 'profesional', orden: 2 }
];

// ── Configuración de horarios ────────────────────────────────────────────────
const CONFIG = {
  horarioInicio:    '10:00',
  horarioFin:       '20:15',
  intervaloMinutos: 30,
  diasLaborales:    [1, 2, 3, 4, 5, 6, 0], // Lun-Dom (0 = Domingo)
  telefonoAdmin:    '56929808223',
  diasBloqueados:   [],
  colacion:         null,
  diasConfig:       {
    '0': { horarioInicio: '09:00', horarioFin: '20:00' } // Especial Domingo
  }
};

// ── Premios del club ─────────────────────────────────────────────────────────
const PREMIOS = [
  { id: 'lumen-premio-1', nombre: 'Corte de Cabello Gratis', costoSellos: 10, activo: true },
  { id: 'lumen-premio-2', nombre: 'Ritual de Barba Gratis',   costoSellos: 8,  activo: true }
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
    batch.set(col('barberos').doc(id), { ...data, creadoEn: TS() }, { merge: true });
    console.log(`  → ${data.nombre} (${data.rol})`);
  }
  await batch.commit();

  for (const b of BARBEROS) {
    // Si es domingo, aplicar horario del domingo en la config individual de cada barbero
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
    name:            "D'Jones Barber",
    shortName:       "D'Jones",
    slogan:          'Estilo y tradición',
    club:            "Club D'Jones",
    address:         'Villanelo 279, Viña del Mar',
    scheduleText:    'Reagenda con mín. 24 hrs',
    phone:           '56929808223',
    logoUrl:         '/djones.png',
    instagram:       'https://www.instagram.com/d.jonesbarberia/',
    pageTitle:       "D'Jones Barber | Estilo y tradición",
    metaDescription: "Reserva tu hora en D'Jones Barber. Cortes de cabello clásicos, combos especiales y rituales de barba.",
    updatedAt:       TS(),
  }, { merge: true });

  await tenantRef.collection('settings').doc('theme').set({
    colorBg:            '#0d0a08',
    colorSurface:       '#181210',
    colorSurfaceAlt:    '#241b18',
    colorPrimary:       '#D4AF37', // Oro Doblón
    colorAccent:        '#8b0000', // Carmesí Pirata
    colorText:          '#f5ead6', // Pergamino Envejecido
    colorMuted:         '#a89f9a', // Vela gastada
    colorBorder:        'rgba(212,175,55,0.15)',
    colorGlow:          'rgba(212,175,55,0.22)',
    colorButtonText:    '#0d0a08',
    colorProgressTrack: '#181210',
    updatedAt:          TS(),
  }, { merge: true });

  // Base settings document for the admin panel features
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
  console.log("║         D'Jones Barber (lumen) — Seed            ║");
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
