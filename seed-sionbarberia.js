/**
 * seed-sionbarberia.js — Inicialización Firestore para Sion Barbería (sionbarberia)
 *
 * Crea bajo tenants/sionbarberia/:
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

const TENANT_ID = 'sionbarberia';
const tenantRef = db.collection('tenants').doc(TENANT_ID);
const col       = (name) => tenantRef.collection(name);

function separador(titulo) {
  console.log(`\n── ${titulo} ${'─'.repeat(50 - titulo.length)}`);
}

// ── Servicios ────────────────────────────────────────────────────────────────
const SERVICIOS = [
  // Cortes
  { id: 'srv-s-01', nombre: 'Corte de Cabello Premium',       precio: 12000, duracion: 40, categoria: 'Cortes', icono: 'ph-scissors', activo: true, orden: 0 },
  
  // Barba
  { id: 'srv-s-02', nombre: 'Perfilado de Barba Premium',     precio: 8000,  duracion: 30, categoria: 'Barba', icono: 'ph-mustache', activo: true, orden: 1 },
  
  // Combos / Packs
  { id: 'srv-s-03', nombre: 'Corte + Barba Premium',          precio: 18000, duracion: 60, categoria: 'Combos', icono: 'ph-star', activo: true, orden: 2 },
  { id: 'srv-s-04', nombre: 'Experiencia Sion Completa',      precio: 26000, duracion: 90, categoria: 'Combos', icono: 'ph-crown', activo: true, orden: 3 },
  
  // Color
  { id: 'srv-s-05', nombre: 'Camuflaje de Canas',             precio: 15000, duracion: 40, categoria: 'Color', icono: 'ph-drop', activo: true, orden: 4 },
  
  // Facial
  { id: 'srv-s-06', nombre: 'Limpieza Facial + Mascarilla',   precio: 10000, duracion: 30, categoria: 'Facial', icono: 'ph-sparkles', activo: true, orden: 5 },
  
  // Extras
  { id: 'srv-s-07', nombre: 'Lavado Capilar Premium',         precio: 4000,  duracion: 15, categoria: 'Extras', icono: 'ph-shower', activo: true, orden: 6 }
];

// ── Profesionales ────────────────────────────────────────────────────────────
const BARBEROS = [
  { 
    id: 'sion-martin', 
    nombre: 'Martín de los Santos', 
    foto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop', 
    disponible: true, 
    activo: true, 
    rol: 'profesional', 
    orden: 0 
  },
  { 
    id: 'sion-matias', 
    nombre: 'Matías Méndez', 
    foto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop', 
    disponible: true, 
    activo: true, 
    rol: 'profesional', 
    orden: 1 
  },
  { 
    id: 'sion-heitor', 
    nombre: 'Heitor Barber', 
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
  diasLaborales:    [1, 2, 3, 4, 5, 6], // Lun-Sáb
  telefonoAdmin:    '56988888888',
  diasBloqueados:   [],
  colacion:         null,
  diasConfig:       {}
};

// ── Premios del club ─────────────────────────────────────────────────────────
const PREMIOS = [
  { id: 'sion-premio-1', nombre: 'Corte de Cabello Gratis', costoSellos: 10, activo: true },
  { id: 'sion-premio-2', nombre: 'Perfilado de Barba Gratis', costoSellos: 8,  activo: true }
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
  
  // 1. Obtener y eliminar barberos antiguos para evitar duplicados
  const oldBarbers = await col('barberos').get();
  if (!oldBarbers.empty) {
    console.log(`  🗑️ Limpiando ${oldBarbers.size} barberos antiguos...`);
    const cleanBatch = db.batch();
    for (const doc of oldBarbers.docs) {
      // Eliminar subcolección de configuración interna si existe
      const oldConfig = await doc.ref.collection('configuracion').get();
      for (const cfgDoc of oldConfig.docs) {
        cleanBatch.delete(cfgDoc.ref);
      }
      cleanBatch.delete(doc.ref);
    }
    await cleanBatch.commit();
    console.log('  ✅ Limpieza completada.');
  }

  // 2. Cargar los nuevos barberos reales
  const batch = db.batch();
  for (const b of BARBEROS) {
    const { id, ...data } = b;
    batch.set(col('barberos').doc(id), { ...data, creadoEn: TS() }, { merge: true });
    console.log(`  → ${data.nombre} (${data.rol})`);
  }
  await batch.commit();

  // 3. Aplicar configuración de horarios para cada uno
  for (const b of BARBEROS) {
    await col('barberos').doc(b.id).collection('configuracion').doc('main').set({
      ...CONFIG,
      updatedAt: TS(),
    }, { merge: true });
  }
  console.log(`✅ ${BARBEROS.length} profesionales reales creados con configuración.`);
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
    name:            "Sion Barbería",
    shortName:       "Sion",
    slogan:          'Una barbería destacada para brindar un servicio de primera calidad brindándote asesoría de imagen y profesionalismo.',
    club:            "Club Sion",
    address:         '📍 Av. Libertad 123, Viña del Mar',
    scheduleText:    'Lunes a sábado 10:00-20:00',
    phone:           '56988888888',
    logoUrl:         'https://dcx13p9dsx90t.cloudfront.net/uploads/logos/page_logo_378df61d67dfec81.png',
    instagram:       'https://www.instagram.com/sionbarberia/',
    pageTitle:       "Sion Barbería | Calidad y Profesionalismo en Viña del Mar",
    metaDescription: "Reserva tu hora en Sion Barbería. Brindamos asesoría de imagen y servicios de barbería de primera calidad en cualquier tipo de cabello.",
    updatedAt:       TS(),
  }, { merge: true });

  await tenantRef.collection('settings').doc('theme').set({
    colorBg:            '#2C3941',
    colorSurface:       '#1E282E',
    colorSurfaceAlt:    '#233037',
    colorPrimary:       '#F57808',
    colorAccent:        '#e06a07',
    colorText:          '#f3f4f6',
    colorMuted:         '#9ca3af',
    colorBorder:        'rgba(245,120,8,0.15)',
    colorGlow:          'rgba(245,120,8,0.22)',
    colorButtonText:    '#ffffff',
    colorProgressTrack: 'rgba(245,120,8,0.08)',
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
  console.log("║      Sion Barbería (sionbarberia) — Seed          ║");
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
