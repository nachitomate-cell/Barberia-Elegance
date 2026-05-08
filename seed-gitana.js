/**
 * seed-gitana.js — Inicialización Firestore para Gitana Nails Studio
 *
 * Crea bajo tenants/gitana/:
 *   servicios · barberos · configuracion · premios · profile · settings/theme
 *
 * Uso:
 *   1. Asegúrate de tener "service-account.json" en la raíz del proyecto
 *      (Firebase Console → Configuración → Cuentas de servicio → Generar clave)
 *   2. node seed-gitana.js
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

const TENANT_ID = 'gitana';
const tenantRef = db.collection('tenants').doc(TENANT_ID);
const col       = (name) => tenantRef.collection(name);

function separador(titulo) {
  console.log(`\n── ${titulo} ${'─'.repeat(50 - titulo.length)}`);
}

// ── Servicios ────────────────────────────────────────────────────────────────
const SERVICIOS = [
  // Manicura
  { id: 'srv-g-01', nombre: 'Manicura un tono',              precio: 15000, duracion: 60,  categoria: 'Manicura',    icono: 'ph-sparkle',    activo: true, orden: 0  },
  { id: 'srv-g-02', nombre: 'Manicura francesa',             precio: 16000, duracion: 60,  categoria: 'Manicura',    icono: 'ph-sparkle',    activo: true, orden: 1  },
  { id: 'srv-g-03', nombre: 'Manicura difuminado',           precio: 17000, duracion: 60,  categoria: 'Manicura',    icono: 'ph-sparkle',    activo: true, orden: 2  },
  { id: 'srv-g-04', nombre: 'Manicura diseño simple',        precio: 17000, duracion: 75,  categoria: 'Manicura',    icono: 'ph-magic-wand', activo: true, orden: 3  },
  { id: 'srv-g-05', nombre: 'Manicura diseño medio',         precio: 18000, duracion: 75,  categoria: 'Manicura',    icono: 'ph-magic-wand', activo: true, orden: 4  },
  { id: 'srv-g-06', nombre: 'Manicura full diseño',          precio: 21000, duracion: 90,  categoria: 'Manicura',    icono: 'ph-magic-wand', activo: true, orden: 5  },
  // Extensiones
  { id: 'srv-g-07', nombre: 'Extensión gel un tono / francés', precio: 33000, duracion: 90,  categoria: 'Extensiones', icono: 'ph-magic-wand', activo: true, orden: 6  },
  { id: 'srv-g-08', nombre: 'Extensión gel diseño simple',   precio: 35000, duracion: 100, categoria: 'Extensiones', icono: 'ph-magic-wand', activo: true, orden: 7  },
  { id: 'srv-g-09', nombre: 'Extensión gel diseño medio',    precio: 38500, duracion: 110, categoria: 'Extensiones', icono: 'ph-magic-wand', activo: true, orden: 8  },
  { id: 'srv-g-10', nombre: 'Extensión gel full diseño',     precio: 41500, duracion: 120, categoria: 'Extensiones', icono: 'ph-magic-wand', activo: true, orden: 9  },
  // Pedicura
  { id: 'srv-g-11', nombre: 'Pedicura',                      precio: 17500, duracion: 60,  categoria: 'Pedicura',    icono: 'ph-star',       activo: true, orden: 10 },
  // Pestañas
  { id: 'srv-g-12', nombre: 'Ondulación de pestañas',        precio: 18000, duracion: 45,  categoria: 'Pestañas',    icono: 'ph-eye',        activo: true, orden: 11 },
  { id: 'srv-g-13', nombre: 'Lifting de pestañas',           precio: 18000, duracion: 45,  categoria: 'Pestañas',    icono: 'ph-eye',        activo: true, orden: 12 },
  { id: 'srv-g-14', nombre: 'Extensión de pestañas',         precio: 28000, duracion: 90,  categoria: 'Pestañas',    icono: 'ph-eye',        activo: true, orden: 13 },
  { id: 'srv-g-15', nombre: 'Retoque extensión +15 días',    precio: 20000, duracion: 45,  categoria: 'Pestañas',    icono: 'ph-eye',        activo: true, orden: 14 },
  { id: 'srv-g-16', nombre: 'Retoque extensión 15 días',     precio: 18000, duracion: 45,  categoria: 'Pestañas',    icono: 'ph-eye',        activo: true, orden: 15 },
  // Promociones
  { id: 'srv-g-17', nombre: 'Manicura + Pedicura un tono',   precio: 30500, duracion: 90,  categoria: 'Promociones', icono: 'ph-tag',        activo: true, orden: 16 },
  // Otros
  { id: 'srv-g-18', nombre: 'Hair spa japonés',              precio: 39900, duracion: 90,  categoria: 'Otros',       icono: 'ph-flower',     activo: true, orden: 17 },
];

// ── Profesionales ────────────────────────────────────────────────────────────
const BARBEROS = [
  { id: 'gitana-sabina', nombre: 'Sabina', foto: null, disponible: true, activo: true, rol: 'profesional', orden: 0 },
  { id: 'gitana-clau',   nombre: 'Clau',   foto: null, disponible: true, activo: true, rol: 'profesional', orden: 1 },
  { id: 'gitana-cony',   nombre: 'Cony',   foto: null, disponible: true, activo: true, rol: 'profesional', orden: 2 },
  { id: 'gitana-gigi',   nombre: 'Gigi',   foto: null, disponible: true, activo: true, rol: 'profesional', orden: 3 },
];

// ── Configuración de horarios ────────────────────────────────────────────────
const CONFIG = {
  horarioInicio:    '10:00',
  horarioFin:       '20:00',
  intervaloMinutos: 30,
  diasLaborales:    [1, 2, 3, 4, 5, 6], // Lun–Sáb
  telefonoAdmin:    '56997023355',
  diasBloqueados:   [],
  colacion:         null,
  diasConfig:       {},
};

// ── Premios del club ─────────────────────────────────────────────────────────
const PREMIOS = [
  { id: 'gitana-premio-1', nombre: 'Manicura un tono gratis',      costoSellos: 10, activo: true },
  { id: 'gitana-premio-2', nombre: 'Pedicura gratis',              costoSellos: 8,  activo: true },
  { id: 'gitana-premio-3', nombre: 'Manicura + Pedicura gratis',   costoSellos: 15, activo: true },
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

  // Configuración de agenda para cada profesional (heredan la config global)
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
    name:            'Gitana Nails Studio',
    shortName:       'Gitana',
    slogan:          'Hacemos uñas',
    club:            'Club Gitana',
    address:         'Las Encinas 1390 local 18 | Concón',
    scheduleText:    'Reagenda con mín. 24 hrs al +56997023355',
    phone:           '56997023355',
    logoUrl:         '/local2.jpg',
    instagram:       'https://www.instagram.com/gitana.nails.studio',
    pageTitle:       'Agendar Hora | Gitana Nails Studio',
    metaDescription: 'Reserva tu hora en Gitana Nails Studio. Manicura, extensiones, pestañas y más.',
    updatedAt:       TS(),
  }, { merge: true });

  await tenantRef.collection('settings').doc('theme').set({
    colorBg:            '#0a0508',
    colorSurface:       '#120a10',
    colorSurfaceAlt:    '#1a1018',
    colorPrimary:       '#f0b8cc',
    colorAccent:        '#c97da0',
    colorText:          '#fdf0f5',
    colorMuted:         '#c4a0b5',
    colorBorder:        'rgba(240,184,204,0.15)',
    colorGlow:          'rgba(240,184,204,0.22)',
    colorButtonText:    '#0a0508',
    colorProgressTrack: '#1f0f1a',
    updatedAt:          TS(),
  }, { merge: true });

  console.log('✅ /profile/main y /settings/theme listos.');
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function seed() {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║     Gitana Nails Studio — Seed Firestore          ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`Proyecto: barberia-elegance  |  Tenant: ${TENANT_ID}\n`);

  await seedServicios();
  await seedBarberos();
  await seedConfiguracion();
  await seedPremios();
  await seedProfile();

  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║   ✅  Seed completado con éxito                   ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('\nColecciones creadas en Firestore:');
  console.log(`  tenants/${TENANT_ID}/servicios       → ${SERVICIOS.length} documentos`);
  console.log(`  tenants/${TENANT_ID}/barberos        → ${BARBEROS.length} documentos`);
  console.log(`  tenants/${TENANT_ID}/configuracion   → 1 documento`);
  console.log(`  tenants/${TENANT_ID}/premios         → ${PREMIOS.length} documentos`);
  console.log(`  tenants/${TENANT_ID}/profile         → 1 documento`);
  console.log(`  tenants/${TENANT_ID}/settings/theme  → 1 documento`);
  console.log('\nPrueba en el navegador:');
  console.log('  http://localhost:3000/?local=gitana\n');

  process.exit(0);
}

seed().catch(err => {
  console.error('\n❌ Error durante el seed:', err.message);
  process.exit(1);
});
