/**
 * seed-alfamen.js — Inicialización Firestore para Barbería Alfa Men (alfamen)
 *
 * Fuente: instagram.com/barberia_alfa · instagram.com/barberia.alfamen
 *         alfamen.site.agendapro.com/cl/sucursal/56554
 *
 * Crea bajo tenants/alfamen/:
 *   servicios · barberos · configuracion · premios · profile · settings/theme · settings/general
 *
 * ⚠️  PRECIOS ESTIMADOS — confirmar con el cliente antes de publicar.
 * ⚠️  PROFESIONALES — reemplazar nombres por los reales del equipo Alfa Men.
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
// ⚠️ Precios estimados según mercado Viña del Mar — confirmar con Alfa Men
const SERVICIOS = [
  // Cortes
  {
    id: 'srv-alfa-01',
    nombre: 'Corte de Cabello',
    descripcion: 'Corte personalizado con lavado, secado y aplicación de producto terminador.',
    precio: 10000, duracion: 40, categoria: 'Cortes', icono: 'ph-scissors', activo: true, orden: 0,
  },
  {
    id: 'srv-alfa-02',
    nombre: 'Corte Infantil',
    descripcion: 'Corte para niños hasta 12 años.',
    precio: 8000, duracion: 30, categoria: 'Cortes', icono: 'ph-scissors', activo: true, orden: 1,
  },
  {
    id: 'srv-alfa-03',
    nombre: 'Corte + Diseño',
    descripcion: 'Corte de cabello con diseño o tatuaje capilar personalizado.',
    precio: 14000, duracion: 50, categoria: 'Cortes', icono: 'ph-scissors', activo: true, orden: 2,
  },
  // Barba
  {
    id: 'srv-alfa-04',
    nombre: 'Arreglo de Barba',
    descripcion: 'Perfilado y rebalance de barba con máquina y tijera.',
    precio: 8000, duracion: 25, categoria: 'Barba', icono: 'ph-mustache', activo: true, orden: 3,
  },
  {
    id: 'srv-alfa-05',
    nombre: 'Afeitado Tradicional',
    descripcion: 'Ritual completo con toallas calientes, vapor y navaja para un acabado impecable.',
    precio: 10000, duracion: 30, categoria: 'Barba', icono: 'ph-mustache', activo: true, orden: 4,
  },
  {
    id: 'srv-alfa-06',
    nombre: 'Diseño de Barba',
    descripcion: 'Diseño personalizado y definición de líneas con navaja.',
    precio: 11000, duracion: 35, categoria: 'Barba', icono: 'ph-mustache', activo: true, orden: 5,
  },
  // Combos
  {
    id: 'srv-alfa-07',
    nombre: 'Corte + Arreglo de Barba',
    descripcion: 'Combo clásico: corte de cabello más arreglo y perfilado de barba.',
    precio: 16000, duracion: 60, categoria: 'Combos', icono: 'ph-crown', activo: true, orden: 6,
  },
  {
    id: 'srv-alfa-08',
    nombre: 'Corte + Afeitado Tradicional',
    descripcion: 'Corte de cabello más ritual de afeitado completo con navaja.',
    precio: 18000, duracion: 65, categoria: 'Combos', icono: 'ph-crown', activo: true, orden: 7,
  },
  {
    id: 'srv-alfa-09',
    nombre: 'Corte + Diseño + Barba',
    descripcion: 'El servicio completo: corte con diseño capilar más arreglo de barba.',
    precio: 22000, duracion: 80, categoria: 'Combos', icono: 'ph-star', activo: true, orden: 8,
  },
  // Color
  {
    id: 'srv-alfa-10',
    nombre: 'Coloración Capilar',
    descripcion: 'Color global con productos profesionales de alta calidad.',
    precio: 22000, duracion: 90, categoria: 'Color', icono: 'ph-palette', activo: true, orden: 9,
  },
  {
    id: 'srv-alfa-11',
    nombre: 'Mechas / Balayage',
    descripcion: 'Técnica de aclarado parcial para un look natural y degradado.',
    precio: 28000, duracion: 100, categoria: 'Color', icono: 'ph-palette', activo: true, orden: 10,
  },
  {
    id: 'srv-alfa-12',
    nombre: 'Tinte de Barba',
    descripcion: 'Coloración de barba con productos especializados.',
    precio: 8000, duracion: 30, categoria: 'Color', icono: 'ph-palette', activo: true, orden: 11,
  },
  // Extras
  {
    id: 'srv-alfa-13',
    nombre: 'Cejas (Diseño y Depilación)',
    descripcion: 'Diseño, depilación y perfilado de cejas masculinas.',
    precio: 5000, duracion: 15, categoria: 'Extras', icono: 'ph-sparkle', activo: true, orden: 12,
  },
  {
    id: 'srv-alfa-14',
    nombre: 'Tratamiento Capilar',
    descripcion: 'Tratamiento hidratante o nutritivo según tipo de cabello.',
    precio: 12000, duracion: 30, categoria: 'Extras', icono: 'ph-first-aid', activo: true, orden: 13,
  },
];

// ── Profesionales ────────────────────────────────────────────────────────────
// ⚠️ Reemplazar por los nombres reales del equipo Alfa Men
const BARBEROS = [
  { id: 'alfa-profesional1', nombre: 'Profesional 1', foto: null, disponible: true, activo: true, rol: 'jefe',        orden: 0 },
  { id: 'alfa-profesional2', nombre: 'Profesional 2', foto: null, disponible: true, activo: true, rol: 'profesional', orden: 1 },
  { id: 'alfa-profesional3', nombre: 'Profesional 3', foto: null, disponible: true, activo: true, rol: 'profesional', orden: 2 },
];

// ── Configuración de horarios ────────────────────────────────────────────────
// ⚠️ Horario estimado — confirmar con Alfa Men (sábados 10:00-18:00 confirmado)
const CONFIG = {
  horarioInicio:           '10:00',
  horarioFin:              '20:00',
  intervaloMinutos:             30,
  minutosLimiteReagendar:        0,
  diasLaborales:    [1, 2, 3, 4, 5, 6], // Lun–Sáb
  telefonoAdmin:    '',                  // ⚠️ Agregar teléfono real
  diasBloqueados:   [],
  colacion:         null,
  diasConfig: {
    6: { inicio: '10:00', fin: '18:00' }, // Sábado hasta las 18:00
  },
};

// ── Premios del club ─────────────────────────────────────────────────────────
const PREMIOS = [
  { id: 'alfa-premio-1', nombre: 'Corte de Cabello Gratis',         costoSellos: 10, activo: true },
  { id: 'alfa-premio-2', nombre: 'Arreglo de Barba Gratis',         costoSellos: 8,  activo: true },
  { id: 'alfa-premio-3', nombre: 'Corte + Arreglo de Barba Gratis', costoSellos: 15, activo: true },
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
    name:            'Barbería Alfa Men',
    shortName:       'Alfa Men',
    slogan:          'Since 2017 · Aesthetics For Men',
    club:            'Club Alfa Men',
    address:         '📍 Av. Valparaíso #694 L. 14 | Viña del Mar',
    scheduleText:    '🕒 Lun–Vie: 10:00–20:00 · Sáb: 10:00–18:00',
    phone:           '',
    logoUrl:         '/alfamen.jpg',
    pageTitle:       'Barbería Alfa Men | Agenda tu hora en Viña del Mar',
    metaDescription: 'Reserva tu hora en Barbería Alfa Men. Cortes, barba, coloración y diseño capilar desde 2017 en Av. Valparaíso 694, Viña del Mar.',
    instagram:       'https://www.instagram.com/barberia_alfa/',
    updatedAt:       TS(),
  }, { merge: true });

  // Paleta Alfa Men: negro profundo + rojo vibrante + plateado
  await tenantRef.collection('settings').doc('theme').set({
    colorBg:            '#0a0a0a',
    colorSurface:       '#141414',
    colorSurfaceAlt:    '#1c1c1c',
    colorPrimary:       '#cc2222',
    colorAccent:        '#e03030',
    colorText:          '#f0f0f0',
    colorMuted:         '#888888',
    colorBorder:        'rgba(204,34,34,0.18)',
    colorGlow:          'rgba(204,34,34,0.22)',
    colorButtonText:    '#ffffff',
    colorProgressTrack: 'rgba(204,34,34,0.08)',
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
  console.log('║       Barbería Alfa Men (alfamen) — Seed         ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`Proyecto: barberia-elegance  |  Tenant: ${TENANT_ID}\n`);

  await seedServicios();
  await seedBarberos();
  await seedConfiguracion();
  await seedPremios();
  await seedProfile();

  console.log('\n✅ Seed completado con éxito.');
  console.log('\n⚠️  Pendientes:');
  console.log('   · Confirmar precios reales de servicios con el cliente');
  console.log('   · Reemplazar nombres de profesionales con el equipo real');
  console.log('   · Agregar teléfono de administrador');
  console.log('   · Subir logo (/alfamen.jpg) a Firebase Storage');
  console.log('   · Confirmar horario completo (sábado solo hasta 18:00)');
  process.exit(0);
}

seed().catch(err => {
  console.error('\n❌ Error durante el seed:', err.message);
  process.exit(1);
});
