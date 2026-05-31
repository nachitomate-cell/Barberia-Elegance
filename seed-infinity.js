/**
 * seed-infinity.js — Inicialización Firestore para Infinity Studio (infinity)
 *
 * Crea bajo tenants/infinity/:
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

const TENANT_ID = 'infinity';
const tenantRef = db.collection('tenants').doc(TENANT_ID);
const col       = (name) => tenantRef.collection(name);

function separador(titulo) {
  console.log(`\n── ${titulo} ${'─'.repeat(50 - titulo.length)}`);
}

// ── Servicios ────────────────────────────────────────────────────────────────
const SERVICIOS = [
  // Cortes
  { id: 'srv-inf-01', nombre: 'Corte de Cabello Premium',    precio: 13000, duracion: 40, categoria: 'Cortes', icono: 'ph-scissors', activo: true, orden: 0 },
  
  // Barba
  { id: 'srv-inf-02', nombre: 'Perfilado de Barba Ritual',     precio: 9000,  duracion: 30, categoria: 'Barba', icono: 'ph-mustache', activo: true, orden: 1 },
  
  // Combos / Packs
  { id: 'srv-inf-03', nombre: 'Corte + Perfilado de Barba',   precio: 23000, duracion: 60, categoria: 'Combos', icono: 'ph-star', activo: true, orden: 2 },
  { id: 'srv-inf-04', nombre: 'Infinity Experience (Premium)', precio: 30000, duracion: 90, categoria: 'Combos', icono: 'ph-crown', activo: true, orden: 3 },
  
  // Color
  { id: 'srv-inf-06', nombre: 'Camuflaje de Canas',             precio: 15000, duracion: 40, categoria: 'Color', icono: 'ph-drop', activo: true, orden: 4 },
  
  // Facial
  { id: 'srv-inf-05', nombre: 'Limpieza Facial Profunda',      precio: 12000, duracion: 35, categoria: 'Facial', icono: 'ph-sparkles', activo: true, orden: 5 },
  
  // Extras
  { id: 'srv-inf-07', nombre: 'Hair Wash (Lavado Premium)',     precio: 4000,  duracion: 15, categoria: 'Extras', icono: 'ph-shower', activo: true, orden: 6 }
];

// ── Profesionales ────────────────────────────────────────────────────────────
const BARBEROS = [
  { 
    id: 'infinity-miguel', 
    nombre: 'Miguel Martínez', 
    foto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop', 
    disponible: true, 
    activo: true, 
    rol: 'profesional', 
    orden: 0 
  },
  { 
    id: 'infinity-elio', 
    nombre: 'Elio Alfonso', 
    foto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop', 
    disponible: true, 
    activo: true, 
    rol: 'profesional', 
    orden: 1 
  },
  { 
    id: 'infinity-jose', 
    nombre: 'Jose Luis Cordero', 
    foto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop', 
    disponible: true, 
    activo: true, 
    rol: 'profesional', 
    orden: 2 
  },
  { 
    id: 'infinity-mailo', 
    nombre: 'Mailo Serrano', 
    foto: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&h=150&fit=crop', 
    disponible: true, 
    activo: true, 
    rol: 'profesional', 
    orden: 3 
  }
];

// ── Configuración de horarios ────────────────────────────────────────────────
const CONFIG = {
  horarioInicio:    '10:00',
  horarioFin:       '20:00',
  intervaloMinutos:      30,
  minutosLimiteReagendar: 0,
  diasLaborales:    [1, 2, 3, 4, 5, 6], // Lun-Sáb (0 = Domingo bloqueado para Infinity)
  telefonoAdmin:    '56985551234',
  diasBloqueados:   [],
  colacion:         null,
  diasConfig:       {}
};

// ── Premios del club ─────────────────────────────────────────────────────────
const PREMIOS = [
  { id: 'infinity-premio-1', nombre: 'Corte de Cabello Gratis', costoSellos: 10, activo: true },
  { id: 'infinity-premio-2', nombre: 'Ritual de Barba Gratis',   costoSellos: 8,  activo: true }
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
    name:            "INFINITY STUDIO",
    shortName:       "Infinity",
    slogan:          "Ambiente familiar y confianza son nuestra esencia. Resultados de alto nivel.",
    club:            "Club Infinity",
    address:         "Traslaviña 114, Viña del Mar",
    scheduleText:    "Lunes a sábado 10:00-20:00",
    phone:           "56985551234",
    logoUrl:         "/infinity.png",
    instagram:       "https://www.instagram.com/infinitystudio23/",
    pageTitle:       "INFINITY STUDIO | Estilo y Confianza en Viña del Mar",
    metaDescription: "Reserva tu hora en Infinity Studio. Barbería y peluquería de primer nivel en Traslaviña 114, Viña del Mar. Calidad, estilo y un ambiente familiar.",
    updatedAt:       TS(),
  }, { merge: true });

  await tenantRef.collection('settings').doc('theme').set({
    colorBg:            '#ffffff',
    colorSurface:       'rgba(255,255,255,0.85)',
    colorSurfaceAlt:    'rgba(255,255,255,0.92)',
    colorPrimary:       '#111827',
    colorAccent:        '#4b5563',
    colorText:          '#1f2937',
    colorMuted:         '#9ca3af',
    colorBorder:        'rgba(17, 24, 39, 0.08)',
    colorGlow:          'rgba(255,255,255,0.8)',
    colorButtonText:    '#111827',
    colorProgressTrack: 'rgba(17, 24, 39, 0.04)',
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
  console.log("║         Infinity Studio (infinity) — Seed        ║");
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
