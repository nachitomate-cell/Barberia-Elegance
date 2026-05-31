/**
 * seed-machos.js — Inicialización Firestore para Macho's Barbershop (machos)
 *
 * Crea bajo tenants/machos/:
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

const TENANT_ID = 'machos';
const tenantRef = db.collection('tenants').doc(TENANT_ID);
const col       = (name) => tenantRef.collection(name);

function separador(titulo) {
  console.log(`\n── ${titulo} ${'─'.repeat(50 - titulo.length)}`);
}

// ── Servicios ────────────────────────────────────────────────────────────────
const SERVICIOS = [
  // Cortes
  { id: 'srv-m-01', nombre: 'Corte de Cabello',               precio: 12000, duracion: 40, categoria: 'Cortes', icono: 'ph-scissors', activo: true, orden: 0 },
  
  // Barba
  { id: 'srv-m-02', nombre: 'Perfilado de Barba',             precio: 9000,  duracion: 30, categoria: 'Barba', icono: 'ph-mustache', activo: true, orden: 1 },
  
  // Combos / Packs
  { id: 'srv-m-03', nombre: 'Corte + Barba',                  precio: 18000, duracion: 60, categoria: 'Combos', icono: 'ph-star', activo: true, orden: 2 },
  { id: 'srv-m-06', nombre: 'Premium Experience',             precio: 25000, duracion: 90, categoria: 'Combos', icono: 'ph-crown', activo: true, orden: 3 },
  
  // Color
  { id: 'srv-m-04', nombre: 'Camuflaje de Canas',             precio: 15000, duracion: 40, categoria: 'Color', icono: 'ph-drop', activo: true, orden: 4 },
  
  // Facial
  { id: 'srv-m-05', nombre: 'Limpieza Facial',                precio: 10000, duracion: 30, categoria: 'Facial', icono: 'ph-sparkles', activo: true, orden: 5 },
  
  // Extras
  { id: 'srv-m-07', nombre: 'Hair Wash (Lavado Premium)',     precio: 4000,  duracion: 15, categoria: 'Extras', icono: 'ph-shower', activo: true, orden: 6 }
];

// ── Profesionales ────────────────────────────────────────────────────────────
const BARBEROS = [
  { 
    id: 'machos-alvaro', 
    nombre: 'Álvaro Muñoz', 
    foto: 'https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d?w=150&h=150&fit=crop', 
    disponible: true, 
    activo: true, 
    rol: 'profesional', 
    orden: 0 
  },
  { 
    id: 'machos-carlos', 
    nombre: 'Carlos Rivas', 
    foto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop', 
    disponible: true, 
    activo: true, 
    rol: 'profesional', 
    orden: 1 
  },
  { 
    id: 'machos-sebastian', 
    nombre: 'Sebastián Jara', 
    foto: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&h=150&fit=crop', 
    disponible: true, 
    activo: true, 
    rol: 'profesional', 
    orden: 2 
  }
];

// ── Configuración de horarios ────────────────────────────────────────────────
const CONFIG = {
  horarioInicio:    '10:00',
  horarioFin:       '20:00',
  intervaloMinutos:      30,
  minutosLimiteReagendar: 0,
  diasLaborales:    [1, 2, 3, 4, 5, 6, 0], // Lun-Dom (0 = Domingo)
  telefonoAdmin:    '56937666270',
  diasBloqueados:   [],
  colacion:         null,
  diasConfig:       {
    '0': { horarioInicio: '11:00', horarioFin: '17:00' } // Especial Domingo para Macho's
  }
};

// ── Premios del club ─────────────────────────────────────────────────────────
const PREMIOS = [
  { id: 'machos-premio-1', nombre: 'Corte de Cabello Gratis', costoSellos: 10, activo: true },
  { id: 'machos-premio-2', nombre: 'Limpieza Facial Gratis',   costoSellos: 8,  activo: true }
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
    name:            "Macho´s Barbershop",
    shortName:       "Macho´s",
    slogan:          'Estilo, carácter y tradición',
    club:            "Club Macho´s",
    address:         '4 Norte 477, local 5, Viña del Mar',
    scheduleText:    'Lunes a sábado 10:00-20:00, Domingo 11:00-17:00',
    phone:           '56937666270',
    logoUrl:         '/machos.png',
    instagram:       'https://www.instagram.com/machos_barbershop.cl/',
    pageTitle:       "Macho´s Barbershop | Estilo y Carácter en Viña del Mar",
    metaDescription: "Reserva tu hora en Macho´s Barbershop Viña del Mar. Barbería premium con cortes de cabello, perfilado de barba, camuflaje y limpieza facial.",
    updatedAt:       TS(),
  }, { merge: true });

  await tenantRef.collection('settings').doc('theme').set({
    colorBg:            '#090d16',
    colorSurface:       '#111827',
    colorSurfaceAlt:    '#1f2937',
    colorPrimary:       '#f97316',
    colorAccent:        '#ea580c',
    colorText:          '#f3f4f6',
    colorMuted:         '#9ca3af',
    colorBorder:        'rgba(249,115,22,0.15)',
    colorGlow:          'rgba(249,115,22,0.22)',
    colorButtonText:    '#ffffff',
    colorProgressTrack: 'rgba(249,115,22,0.08)',
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
  console.log("║      Macho's Barbershop (machos) — Seed          ║");
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
