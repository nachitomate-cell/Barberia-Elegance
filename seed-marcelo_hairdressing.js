/**
 * seed-marcelo_hairdressing.js — Inicialización Firestore para Marcelo Palma Hairdressing (marcelo_hairdressing)
 *
 * Crea bajo tenants/marcelo_hairdressing/:
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

const TENANT_ID = 'marcelo_hairdressing';
const tenantRef = db.collection('tenants').doc(TENANT_ID);
const col       = (name) => tenantRef.collection(name);

function separador(titulo) {
  console.log(`\n── ${titulo} ${'─'.repeat(50 - titulo.length)}`);
}

// ── Servicios (Iguales a los delnero / standard premium) ──────────────────────
const SERVICIOS = [
  // Cortes
  { id: 'srv-m-01', nombre: 'Corte de Cabello Premium',       precio: 12000, duracion: 40, categoria: 'Cortes', icono: 'ph-scissors', activo: true, orden: 0 },
  
  // Barba
  { id: 'srv-m-02', nombre: 'Perfilado de Barba Premium',     precio: 8000,  duracion: 30, categoria: 'Barba', icono: 'ph-mustache', activo: true, orden: 1 },
  
  // Combos / Packs
  { id: 'srv-m-03', nombre: 'Corte + Barba Premium',          precio: 18000, duracion: 60, categoria: 'Combos', icono: 'ph-star', activo: true, orden: 2 },
  { id: 'srv-m-04', nombre: 'Experiencia Marcelo Palma',      precio: 25000, duracion: 90, categoria: 'Combos', icono: 'ph-crown', activo: true, orden: 3 },
  
  // Extras
  { id: 'srv-m-05', nombre: 'Lavado Capilar Premium',         precio: 4000,  duracion: 15, categoria: 'Extras', icono: 'ph-shower', activo: true, orden: 4 }
];

// ── Profesionales (Barbero Único: Marcelo Palma) ─────────────────────────────
const BARBEROS = [
  { 
    id: 'marcelo-palma', 
    nombre: 'Marcelo Palma', 
    foto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop', 
    disponible: true, 
    activo: true, 
    rol: 'profesional', 
    orden: 0 
  }
];

// ── Configuración de horarios ────────────────────────────────────────────────
const CONFIG = {
  horarioInicio:    '10:00',
  horarioFin:       '20:00',
  intervaloMinutos: 30,
  diasLaborales:    [1, 2, 3, 4, 5, 6], // Lun-Sáb
  telefonoAdmin:    '56988888888',
  diasBloqueados:   [],
  colacion:         null,
  diasConfig:       {}
};

// ── Premios del club ─────────────────────────────────────────────────────────
const PREMIOS = [
  { id: 'marcelo-premio-1', nombre: 'Corte de Cabello Gratis', costoSellos: 10, activo: true },
  { id: 'marcelo-premio-2', nombre: 'Perfilado de Barba Gratis', costoSellos: 8,  activo: true }
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
    // Aplicar la configuración individual de cada barbero
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
    name:            "Marcelo Palma Hairdressing",
    shortName:       "Marcelo Palma",
    slogan:          'Estilo que define. Arte que trasciende.',
    club:            "Club Marcelo Palma",
    address:         '📍 Curauma / Placilla',
    scheduleText:    'Lunes a sábado 10:00-20:00',
    phone:           '56988888888',
    logoUrl:         '/nero.jpg',
    instagram:       '',
    pageTitle:       "Marcelo Palma Hairdressing | Agenda tu hora",
    metaDescription: "Reserva tu hora en Marcelo Palma Hairdressing. Cortes y barba de élite en Curauma / Placilla.",
    updatedAt:       TS(),
  }, { merge: true });

  // Neon lime green & black deep theme matching delnero exactly
  await tenantRef.collection('settings').doc('theme').set({
    colorBg:            '#050505',
    colorSurface:       '#0d0d0d',
    colorSurfaceAlt:    '#121212',
    colorPrimary:       '#39ff14',
    colorAccent:        '#39ff14',
    colorText:          '#f0ead6',
    colorMuted:         '#71717a',
    colorBorder:        'rgba(57,255,20,0.15)',
    colorGlow:          'rgba(57,255,20,0.22)',
    colorButtonText:    '#050505',
    colorProgressTrack: 'rgba(57,255,20,0.08)',
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
  console.log("║    Marcelo Palma Hairdressing — Database Seed    ║");
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
