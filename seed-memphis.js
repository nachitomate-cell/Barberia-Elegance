/**
 * seed-memphis.js — Inicialización Firestore para Memphis Salón (memphis)
 *
 * Fuente: instagram.com/memphissalon · agendapro.com/mp/cl/pl/memphis-salon-vina-del-mar/40694
 *
 * Crea bajo tenants/memphis/:
 *   servicios · barberos · configuracion · premios · profile · settings/theme · settings/general
 *
 * ⚠️  PRECIOS ESTIMADOS — confirmar con el cliente antes de publicar.
 * ⚠️  PROFESIONALES — reemplazar nombres por los reales del equipo Memphis.
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

const TENANT_ID = 'memphis';
const tenantRef = db.collection('tenants').doc(TENANT_ID);
const col       = (name) => tenantRef.collection(name);

function separador(titulo) {
  console.log(`\n── ${titulo} ${'─'.repeat(50 - titulo.length)}`);
}

// ── Servicios ────────────────────────────────────────────────────────────────
// ⚠️ Precios y duraciones estimados según mercado Viña del Mar — confirmar con Memphis Salón
const SERVICIOS = [
  // Cortes
  {
    id: 'srv-mem-01',
    nombre: 'Corte de Cabello',
    descripcion: 'Corte personalizado con lavado, secado y aplicación de producto terminador.',
    precio: 13000, duracion: 45, categoria: 'Cortes', icono: 'ph-scissors', activo: true, orden: 0,
  },
  {
    id: 'srv-mem-02',
    nombre: 'Lavado de Cabello',
    descripcion: '',
    precio: 5000, duracion: 15, categoria: 'Cortes', icono: 'ph-drop-half', activo: true, orden: 1,
  },
  // Barba
  {
    id: 'srv-mem-03',
    nombre: 'Afeitado Tradicional',
    descripcion: 'Ritual completo con toallas calientes, vapor y navaja para un acabado impecable.',
    precio: 11000, duracion: 30, categoria: 'Barba', icono: 'ph-mustache', activo: true, orden: 2,
  },
  {
    id: 'srv-mem-04',
    nombre: 'Arreglo de Barba',
    descripcion: 'Perfilado y rebalance de barba con máquina y tijera.',
    precio: 9000, duracion: 25, categoria: 'Barba', icono: 'ph-mustache', activo: true, orden: 3,
  },
  {
    id: 'srv-mem-05',
    nombre: 'Diseño de Barba',
    descripcion: 'Diseño personalizado y definición de líneas con navaja.',
    precio: 12000, duracion: 35, categoria: 'Barba', icono: 'ph-mustache', activo: true, orden: 4,
  },
  // Combos
  {
    id: 'srv-mem-06',
    nombre: 'Corte + Arreglo de Barba',
    descripcion: 'Combo clásico: corte de cabello más arreglo y perfilado de barba.',
    precio: 20000, duracion: 60, categoria: 'Combos', icono: 'ph-crown', activo: true, orden: 5,
  },
  {
    id: 'srv-mem-07',
    nombre: 'Corte + Afeitado Tradicional',
    descripcion: 'Corte de cabello más ritual de afeitado completo con navaja.',
    precio: 22000, duracion: 70, categoria: 'Combos', icono: 'ph-crown', activo: true, orden: 6,
  },
  {
    id: 'srv-mem-08',
    nombre: 'Servicio Full',
    descripcion: 'Corte de cabello, afeitado tradicional y tratamiento facial en una sola sesión.',
    precio: 34000, duracion: 105, categoria: 'Combos', icono: 'ph-star', activo: true, orden: 7,
  },
  // Facial
  {
    id: 'srv-mem-09',
    nombre: 'Tratamiento Facial',
    descripcion: 'Limpieza profunda con vapor, exfoliación, mascarilla y crema hidratante.',
    precio: 15000, duracion: 40, categoria: 'Facial', icono: 'ph-sparkles', activo: true, orden: 8,
  },
  {
    id: 'srv-mem-10',
    nombre: 'Depilación Facial',
    descripcion: '',
    precio: 7000, duracion: 20, categoria: 'Facial', icono: 'ph-sparkle', activo: true, orden: 9,
  },
  {
    id: 'srv-mem-11',
    nombre: 'Tratamiento de Cejas',
    descripcion: 'Diseño, depilación y perfilado de cejas.',
    precio: 4000, duracion: 15, categoria: 'Facial', icono: 'ph-sparkle', activo: true, orden: 10,
  },
  // Color
  {
    id: 'srv-mem-12',
    nombre: 'Coloración Capilar',
    descripcion: 'Color global con productos profesionales de alta calidad.',
    precio: 25000, duracion: 90, categoria: 'Color', icono: 'ph-palette', activo: true, orden: 11,
  },
  // Tratamientos
  {
    id: 'srv-mem-13',
    nombre: 'Masaje Capilar',
    descripcion: 'Masaje estimulante del cuero cabelludo con aceites esenciales.',
    precio: 8000, duracion: 20, categoria: 'Tratamientos', icono: 'ph-hand', activo: true, orden: 12,
  },
  {
    id: 'srv-mem-14',
    nombre: 'Tratamiento Cuero Cabelludo',
    descripcion: 'Tratamiento con productos naturales sin parabenos ni sulfatos.',
    precio: 12000, duracion: 30, categoria: 'Tratamientos', icono: 'ph-first-aid', activo: true, orden: 13,
  },
  // Uñas
  {
    id: 'srv-mem-15',
    nombre: 'Manicure',
    descripcion: '',
    precio: 10000, duracion: 30, categoria: 'Uñas', icono: 'ph-hand-waving', activo: true, orden: 14,
  },
  {
    id: 'srv-mem-16',
    nombre: 'Pedicure',
    descripcion: '',
    precio: 12000, duracion: 40, categoria: 'Uñas', icono: 'ph-sneaker', activo: true, orden: 15,
  },
  // Estilismo
  {
    id: 'srv-mem-17',
    nombre: 'Peinado Formal',
    descripcion: 'Peinado de ocasión con técnica profesional y fijación duradera.',
    precio: 15000, duracion: 30, categoria: 'Estilismo', icono: 'ph-wind', activo: true, orden: 16,
  },
  {
    id: 'srv-mem-18',
    nombre: 'Maquillaje Masculino',
    descripcion: '',
    precio: 15000, duracion: 30, categoria: 'Estilismo', icono: 'ph-paint-brush', activo: true, orden: 17,
  },
];

// ── Profesionales ────────────────────────────────────────────────────────────
// ⚠️ Reemplazar por los nombres reales del equipo de Memphis Salón
const BARBEROS = [
  { id: 'memphis-profesional1', nombre: 'Profesional 1', foto: null, disponible: true, activo: true, rol: 'jefe',        orden: 0 },
  { id: 'memphis-profesional2', nombre: 'Profesional 2', foto: null, disponible: true, activo: true, rol: 'profesional', orden: 1 },
  { id: 'memphis-profesional3', nombre: 'Profesional 3', foto: null, disponible: true, activo: true, rol: 'profesional', orden: 2 },
];

// ── Configuración de horarios ────────────────────────────────────────────────
// Horario confirmado: Lun–Sáb 09:00–21:00 · Domingo cerrado
const CONFIG = {
  horarioInicio:        '09:00',
  horarioFin:           '21:00',
  intervaloMinutos:          30,
  minutosLimiteReagendar:     0,
  diasLaborales:    [1, 2, 3, 4, 5, 6], // Lun–Sáb
  telefonoAdmin:    '',                  // ⚠️ Agregar teléfono real de Memphis Salón
  diasBloqueados:   [],
  colacion:         null,
  diasConfig:       {},
};

// ── Premios del club ─────────────────────────────────────────────────────────
const PREMIOS = [
  { id: 'memphis-premio-1', nombre: 'Corte de Cabello Gratis',      costoSellos: 10, activo: true },
  { id: 'memphis-premio-2', nombre: 'Afeitado Tradicional Gratis',  costoSellos: 8,  activo: true },
  { id: 'memphis-premio-3', nombre: 'Corte + Arreglo de Barba Gratis', costoSellos: 15, activo: true },
];

// ── Seed functions ────────────────────────────────────────────────────────────
async function seedServicios() {
  separador('SERVICIOS');
  const batch = db.batch();
  for (const srv of SERVICIOS) {
    const { id, ...data } = srv;
    batch.set(col('servicios').doc(id), { ...data, updatedAt: TS() }, { merge: true });
    console.log(`  → [${data.categoria}] ${data.nombre} ($${(data.precio / 1000).toFixed(0)}k · ${data.duracion}min)`);
  }
  await batch.commit();
  console.log(`✅ ${SERVICIOS.length} servicios creados.`);
}

async function seedBarberos() {
  separador('PROFESIONALES (LIMPIEZA Y CARGA)');

  const oldBarbers = await col('barberos').get();
  if (!oldBarbers.empty) {
    console.log(`  🗑️ Limpiando ${oldBarbers.size} profesionales anteriores...`);
    const cleanBatch = db.batch();
    for (const docSnap of oldBarbers.docs) {
      const oldConfig = await docSnap.ref.collection('configuracion').get();
      for (const cfgDoc of oldConfig.docs) cleanBatch.delete(cfgDoc.ref);
      cleanBatch.delete(docSnap.ref);
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
    name:            'Memphis Salón',
    shortName:       'Memphis',
    slogan:          'Estilo y cuidado masculino en Viña del Mar',
    club:            'Club Memphis',
    address:         '📍 12 Norte 801 | Viña del Mar',
    scheduleText:    '🕒 Lun–Sáb: 09:00–21:00',
    phone:           '',                 // ⚠️ Agregar teléfono real
    logoUrl:         '/memphis.jpg',     // ⚠️ Subir logo real
    pageTitle:       'Memphis Salón | Agenda tu hora en Viña del Mar',
    metaDescription: 'Reserva tu hora en Memphis Salón. Cortes, barba, facial, manicure y más en 12 Norte 801, Viña del Mar.',
    instagram:       'https://www.instagram.com/memphissalon/',
    updatedAt:       TS(),
  }, { merge: true });

  // Paleta Memphis: fondo cálido oscuro + rojo Memphis + acento ámbar
  await tenantRef.collection('settings').doc('theme').set({
    colorBg:            '#0d0807',
    colorSurface:       '#16100d',
    colorSurfaceAlt:    '#1e1512',
    colorPrimary:       '#c8392e',
    colorAccent:        '#e87050',
    colorText:          '#f5ede8',
    colorMuted:         '#9c8882',
    colorBorder:        'rgba(200,57,46,0.16)',
    colorGlow:          'rgba(200,57,46,0.20)',
    colorButtonText:    '#ffffff',
    colorProgressTrack: 'rgba(200,57,46,0.08)',
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
  console.log('║         Memphis Salón (memphis) — Seed           ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`Proyecto: barberia-elegance  |  Tenant: ${TENANT_ID}\n`);

  await seedServicios();
  await seedBarberos();
  await seedConfiguracion();
  await seedPremios();
  await seedProfile();

  console.log('\n✅ Seed completado con éxito.');
  console.log('\n⚠️  Pendientes:');
  console.log('   · Confirmar precios reales de servicios');
  console.log('   · Reemplazar nombres de profesionales');
  console.log('   · Agregar teléfono de administrador');
  console.log('   · Subir logo (/memphis.jpg) a Firebase Storage');
  console.log('   · Agregar dominio en tenantUtils.js');
  process.exit(0);
}

seed().catch(err => {
  console.error('\n❌ Error durante el seed:', err.message);
  process.exit(1);
});
