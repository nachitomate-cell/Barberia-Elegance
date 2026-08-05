/**
 * seed-alfamen.js — Inicialización Firestore para Alfa Men – Estética Masculina (alfamen)
 *
 * Fuente: alfamen.site.agendapro.com/cl/sucursal/56554 (scrape 2026-08-05)
 *         instagram.com/barberia.alfamen
 *
 * Crea bajo tenants/alfamen/:
 *   servicios · barberos · configuracion · premios · profile · settings/theme · settings/general
 *
 * Servicios, precios, equipo y horarios son los REALES de su AgendaPro.
 * Tema CLARO blanco + tinta negra (decisión de diseño — NO el negro/rojo
 * que muestra su minisitio AgendaPro).
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

const TENANT_ID = 'alfamen';
const tenantRef = db.collection('tenants').doc(TENANT_ID);
const col       = (name) => tenantRef.collection(name);

function separador(titulo) {
  console.log(`\n── ${titulo} ${'─'.repeat(50 - titulo.length)}`);
}

// ── Servicios ────────────────────────────────────────────────────────────────
// Precios, duraciones y descripciones REALES de su AgendaPro (2026-08-05).
// Sus categorías AgendaPro se mapean a las de config.js:
//   Corte de cabello → Cortes · Corte de barba → Barba · Promociones →
//   Promociones · Tratamientos Sir Fausto (barba/facial) → Tratamientos ·
//   Otros → Otros. (El "servicio" PROPINA de AgendaPro se omite a propósito.)
const SERVICIOS = [
  // Cortes
  {
    id: 'srv-alfa-01',
    nombre: 'Corte de Cabello',
    descripcion: 'Corte con combinación de máquina y tijera, diseñado según tu estilo. Incluye lavado, masaje capilar y peinado final con productos de fijación de alta calidad.',
    precio: 15000, duracion: 60, categoria: 'Cortes', icono: 'ph-scissors', activo: true, orden: 0,
  },
  {
    id: 'srv-alfa-02',
    nombre: 'Corte de Precisión (Tijera Premium) + Productos Sir Fausto',
    descripcion: 'Técnica de tijera con fade detallado, nítido y pulido que realza la forma del rostro. Incluye lavado, masaje capilar revitalizante y styling premium con productos Sir Fausto 100% naturales.',
    precio: 19000, duracion: 60, categoria: 'Cortes', icono: 'ph-scissors', activo: true, orden: 1,
  },
  {
    id: 'srv-alfa-03',
    nombre: 'Corte Express Habitual',
    descripcion: 'Corte rápido de 40 minutos para clientes habituales que ya conocen su estilo y prefieren una atención más ágil.',
    precio: 15000, duracion: 40, categoria: 'Cortes', icono: 'ph-scissors', activo: true, orden: 2,
  },
  // Barba
  {
    id: 'srv-alfa-04',
    nombre: 'Barba Express',
    descripcion: 'Corte, perfilado y degradado de barba principalmente a máquina. Ideal para mantener contornos limpios y un acabado prolijo en poco tiempo.',
    precio: 10000, duracion: 30, categoria: 'Barba', icono: 'ph-mustache', activo: true, orden: 3,
  },
  {
    id: 'srv-alfa-05',
    nombre: 'Barba Tradicional',
    descripcion: 'Ritual completo: perfilado, degradado o recorte con toallas calientes, vaporizador, gel de afeitado, after shave y aceite o bálsamo final. Un clásico para un acabado limpio y definido.',
    precio: 14000, duracion: 40, categoria: 'Barba', icono: 'ph-mustache', activo: true, orden: 4,
  },
  // Promociones
  {
    id: 'srv-alfa-06',
    nombre: 'Corte de Cabello + Barba Express',
    descripcion: 'Corte con máquina y tijera junto al perfilado y degradado rápido de barba. Look limpio, ordenado y definido en una sola sesión.',
    precio: 22000, duracion: 70, categoria: 'Promociones', icono: 'ph-crown', activo: true, orden: 5,
  },
  {
    id: 'srv-alfa-07',
    nombre: 'Corte de Cabello + Barba Tradicional',
    descripcion: 'Corte profesional más ritual tradicional de barba: perfilado, toallas calientes, vapor, gel de afeitado, after shave y aceite o bálsamo final.',
    precio: 24000, duracion: 80, categoria: 'Promociones', icono: 'ph-crown', activo: true, orden: 6,
  },
  {
    id: 'srv-alfa-08',
    nombre: 'Corte de Precisión + Barba Premium',
    descripcion: 'Corte de precisión a tijera diseñado según tu rostro y estilo, más barba trabajada al detalle con navaja, toalla caliente y productos de alta gama.',
    precio: 28000, duracion: 60, categoria: 'Promociones', icono: 'ph-star', activo: true, orden: 7,
  },
  {
    id: 'srv-alfa-09',
    nombre: 'Promo Servicio FULL',
    descripcion: 'El paquete integral: corte profesional, full barba o perfilado según tu estilo, más limpieza facial que renueva, hidrata y deja la piel fresca.',
    precio: 30000, duracion: 90, categoria: 'Promociones', icono: 'ph-star', activo: true, orden: 8,
  },
  {
    id: 'srv-alfa-10',
    nombre: 'Corte de Cabello + Limpieza Facial Básica',
    descripcion: 'Corte a máquina y/o tijera complementado con limpieza facial básica con vapor para remover impurezas y refrescar la piel.',
    precio: 20000, duracion: 70, categoria: 'Promociones', icono: 'ph-crown', activo: true, orden: 9,
  },
  {
    id: 'srv-alfa-11',
    nombre: 'All Face (Barba Tradicional + Limpieza Facial Básica)',
    descripcion: 'Barba trabajada al detalle con vapor y navaja, más limpieza facial con exfoliación y mascarilla purificante. Un servicio integral con resultados fantásticos.',
    precio: 16000, duracion: 60, categoria: 'Promociones', icono: 'ph-crown', activo: true, orden: 10,
  },
  {
    id: 'srv-alfa-12',
    nombre: 'Corte de Cabello + Limpieza Facial Spa',
    descripcion: 'Corte a máquina y/o tijera más limpieza facial Spa: vapor, exfoliación y mascarilla para purificar, hidratar y revitalizar la piel.',
    precio: 25000, duracion: 70, categoria: 'Promociones', icono: 'ph-crown', activo: true, orden: 11,
  },
  // Tratamientos (Sir Fausto Natural)
  {
    id: 'srv-alfa-13',
    nombre: 'Barba Fresh Sir Fausto',
    descripcion: 'Lavado express de barba con shampoo premium Sir Fausto. Refresca, suaviza y deja un aroma masculino único.',
    precio: 4990, duracion: 10, categoria: 'Tratamientos', icono: 'ph-drop', activo: true, orden: 12,
  },
  {
    id: 'srv-alfa-14',
    nombre: 'Detox Facial Sir Fausto',
    descripcion: 'Limpieza profunda que elimina impurezas, toxinas y grasa que obstruyen los poros. Desintoxica la piel para una apariencia fresca y luminosa.',
    precio: 10000, duracion: 15, categoria: 'Tratamientos', icono: 'ph-sparkle', activo: true, orden: 13,
  },
  // Otros
  {
    id: 'srv-alfa-15',
    nombre: 'Cejas',
    descripcion: 'Perfilado y orden de cejas para resaltar la mirada. Se trabaja con tijera, máquina o navaja según la necesidad.',
    precio: 4000, duracion: 10, categoria: 'Otros', icono: 'ph-sparkle', activo: true, orden: 14,
  },
];

// ── Horario del local ────────────────────────────────────────────────────────
// Real de AgendaPro: Lun–Vie 10:00–20:00 · Sáb 10:00–18:00 · Dom cerrado.
const CONFIG = {
  horarioInicio:           '10:00',
  horarioFin:              '20:00',
  intervaloMinutos:             30,
  minutosLimiteReagendar:        0,
  diasLaborales:    [1, 2, 3, 4, 5, 6], // Lun–Sáb
  telefonoAdmin:    '+56985773308',
  diasBloqueados:   [],
  colacion:         null,
  diasConfig: {
    6: { inicio: '10:00', fin: '18:00' }, // Sábado hasta las 18:00
  },
};

// ── Profesionales ────────────────────────────────────────────────────────────
// Equipo real con fotos (alfamen/equipo/*.webp) y horarios individuales de su
// AgendaPro. ⚠️ Rol 'jefe' asignado al primero por convención del seed —
// confirmar con el cliente quién administra.
const BARBEROS = [
  {
    id: 'alfa-claudio-iglesias', nombre: 'Claudio Iglesias',
    foto: '/alfamen/equipo/claudio-iglesias.webp',
    especialidad: 'Especialista en Fades, Taper y Cortes Modernos',
    disponible: true, activo: true, rol: 'jefe', orden: 0,
    config: { diasLaborales: [4, 5, 6] }, // Jue–Vie 10–20 · Sáb 10–18
  },
  {
    id: 'alfa-ziggy', nombre: 'Ziggy',
    foto: '/alfamen/equipo/ziggy.webp',
    disponible: true, activo: true, rol: 'profesional', orden: 1,
    config: { diasLaborales: [1, 2, 4] }, // Lun · Mar · Jue 10–20
  },
  {
    id: 'alfa-sebastian-ignacio', nombre: 'Sebastián Ignacio',
    foto: '/alfamen/equipo/sebastian-ignacio.webp',
    disponible: true, activo: true, rol: 'profesional', orden: 2,
    // Lun–Vie 10–19 · Sáb 10–18
    config: {
      horarioFin: '19:00',
      diasConfig: { 6: { inicio: '10:00', fin: '18:00' } },
    },
  },
  {
    id: 'alfa-pablo-silva', nombre: 'Pablo Silva',
    foto: '/alfamen/equipo/pablo-silva.webp',
    disponible: true, activo: true, rol: 'profesional', orden: 3,
    config: {}, // Lun–Vie 10–20 · Sáb 10–18 (igual al local)
  },
];

// ── Premios del club ─────────────────────────────────────────────────────────
const PREMIOS = [
  { id: 'alfa-premio-1', nombre: 'Corte de Cabello Gratis',              costoSellos: 10, activo: true },
  { id: 'alfa-premio-2', nombre: 'Barba Express Gratis',                 costoSellos: 8,  activo: true },
  { id: 'alfa-premio-3', nombre: 'Corte + Barba Tradicional Gratis',     costoSellos: 15, activo: true },
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
    const { id, config: _cfg, ...data } = b;
    batch.set(col('barberos').doc(id), { ...data, creadoEn: TS() }, { merge: true });
    console.log(`  → ${data.nombre} (${data.rol})`);
  }
  await batch.commit();

  // Configuración individual: la del local como base + overrides del barbero
  // (horarios reales de AgendaPro difieren entre ellos).
  for (const b of BARBEROS) {
    await col('barberos').doc(b.id).collection('configuracion').doc('main').set({
      ...CONFIG,
      ...(b.config || {}),
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
    name:            'Alfa Men – Estética Masculina',
    shortName:       'Alfa Men',
    slogan:          'Since 2017 · Aesthetics For Men',
    club:            'Club Alfa Men',
    address:         '📍 Av. Valparaíso 694, Local 14 | Viña del Mar',
    scheduleText:    '🕒 Lun–Vie: 10–20h · Sáb: 10–18h · Dom: cerrado',
    phone:           '+56985773308',
    email:           'barberia.alfa@hotmail.com',
    logoUrl:         '/alfamen/logo.png',
    pageTitle:       'Alfa Men – Estética Masculina | Agenda tu hora en Viña del Mar',
    metaDescription: 'Reserva tu hora en Alfa Men. Cortes de precisión, fades, barba y limpieza facial desde 2017 en Av. Valparaíso 694, Viña del Mar.',
    instagram:       'https://www.instagram.com/barberia.alfamen',
    tiktok:          'https://www.tiktok.com/@barberia.alfamen',
    updatedAt:       TS(),
  }, { merge: true });

  // Paleta Alfa Men: TEMA CLARO — tinta negra sobre blanco puro (identidad
  // real del logo y wordmark). Espejo de la capa .tenant-alfamen del front.
  await tenantRef.collection('settings').doc('theme').set({
    colorBg:            '#ffffff',
    colorSurface:       '#f9fafb',
    colorSurfaceAlt:    '#f3f4f6',
    colorPrimary:       '#111111',
    colorAccent:        '#111111',
    colorText:          '#18181b',
    colorMuted:         '#6b7280',
    colorBorder:        'rgba(17,17,17,0.12)',
    colorGlow:          'rgba(17,17,17,0.06)',
    colorButtonText:    '#ffffff',
    colorProgressTrack: 'rgba(17,17,17,0.08)',
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
  console.log('║   Alfa Men – Estética Masculina (alfamen) Seed   ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`Proyecto: barberia-elegance  |  Tenant: ${TENANT_ID}\n`);

  await seedServicios();
  await seedBarberos();
  await seedConfiguracion();
  await seedPremios();
  await seedProfile();

  console.log('\n✅ Seed completado con éxito.');
  console.log('\n⚠️  Pendientes:');
  console.log('   · Confirmar quién del equipo administra (rol jefe → Claudio por convención)');
  console.log('   · Credenciales de acceso al panel para el equipo');
  console.log('   · URL de reseñas de Google (googleReviewUrl en config.js)');
  process.exit(0);
}

seed().catch(err => {
  console.error('\n❌ Error durante el seed:', err.message);
  process.exit(1);
});
