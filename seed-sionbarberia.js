/**
 * seed-sionbarberia.js — Inicialización Firestore para STUDIO DIECISÉIS
 * (clave interna del tenant: sionbarberia)
 *
 * Crea bajo tenants/sionbarberia/:
 *   servicios · barberos · configuracion · premios · profile · settings/theme · settings/general
 *
 * ⚠️ Pendiente del cliente: fotos de profesionales.
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
// Nota: "Visos" y "Color Completo" (ambos incluyen corte) viven solo en la
// categoría "Color" para no duplicarlos con "Pack Servicios".
const SERVICIOS = [
  // Cabello
  { id: 'd16-cab-01', nombre: 'Corte de Cabello (Incluye Cejas)',          precio: 15000, duracion: 45, categoria: 'Cabello', icono: 'ph-scissors', activo: true, orden: 0 },
  { id: 'd16-cab-02', nombre: 'Corte de Cabello Premium',                  precio: 20000, duracion: 60, categoria: 'Cabello', icono: 'ph-star',     activo: true, orden: 1, descripcion: 'Incluye asesoría, shaver, cejas y lavado' },
  { id: 'd16-cab-03', nombre: 'Corte de Cabello Vip',                      precio: 25000, duracion: 75, categoria: 'Cabello', icono: 'ph-crown',    activo: true, orden: 2 },
  { id: 'd16-cab-04', nombre: 'Perfilado de Cejas',                        precio: 4000,  duracion: 5,  categoria: 'Cabello', icono: 'ph-eye',      activo: true, orden: 3 },

  // Barba
  { id: 'd16-bar-01', nombre: 'Barba Premium',                             precio: 15000, duracion: 40, categoria: 'Barba', icono: 'ph-mustache', activo: true, orden: 4, descripcion: 'Toallas calientes, afeitado a ras' },
  { id: 'd16-bar-02', nombre: 'Afeitado a Ras',                            precio: 10000, duracion: 25, categoria: 'Barba', icono: 'ph-mustache', activo: true, orden: 5 },

  // Tratamiento Facial
  { id: 'd16-fac-01', nombre: 'Limpieza Facial',                           precio: 15000, duracion: 45, categoria: 'Tratamiento Facial', icono: 'ph-sparkles', activo: true, orden: 6, descripcion: 'Limpieza y exfoliación' },

  // Pack Servicios
  { id: 'd16-pack-01', nombre: 'Corte de Cabello + Barba Premium',                                  precio: 25000, duracion: 75,  categoria: 'Pack Servicios', icono: 'ph-star',  activo: true, orden: 7 },
  { id: 'd16-pack-02', nombre: 'Corte de Cabello + Limpieza Facial',                                precio: 28000, duracion: 80,  categoria: 'Pack Servicios', icono: 'ph-star',  activo: true, orden: 8 },
  { id: 'd16-pack-03', nombre: 'Corte de Cabello Premium + Barba Premium',                          precio: 30000, duracion: 75,  categoria: 'Pack Servicios', icono: 'ph-crown', activo: true, orden: 9 },
  { id: 'd16-pack-04', nombre: 'Corte Premium + Barba Premium + Limpieza Facial',                   precio: 40000, duracion: 120, categoria: 'Pack Servicios', icono: 'ph-crown', activo: true, orden: 10 },

  // Color
  { id: 'd16-col-01', nombre: 'Color Completo (incluye Corte de Cabello)', precio: 70000, duracion: 45, categoria: 'Color', icono: 'ph-paint-brush', activo: true, orden: 11 },
  { id: 'd16-col-02', nombre: 'Visos (incluye Corte de Cabello)',          precio: 60000, duracion: 40, categoria: 'Color', icono: 'ph-drop',        activo: true, orden: 12 },
];

// ── Profesionales ────────────────────────────────────────────────────────────
// ⚠️ Fotos pendientes del cliente.
const BARBEROS = [
  { id: 'd16-matias',  nombre: 'Matías Random Barber', foto: null, disponible: true, activo: true, rol: 'profesional', orden: 0 },
  { id: 'd16-atelier', nombre: 'Atelier Catalan',      foto: null, disponible: true, activo: true, rol: 'profesional', orden: 1 },
];

// ── Configuración de horarios ────────────────────────────────────────────────
const CONFIG = {
  horarioInicio:    '09:00',
  horarioFin:       '21:00',
  intervaloMinutos:      30,
  minutosLimiteReagendar: 0,
  diasLaborales:    [1, 2, 3, 4, 5, 6], // Lun-Sáb (Domingo cerrado)
  telefonoAdmin:    '56937179177',
  diasBloqueados:   [],
  colacion:         null,
  diasConfig:       {},
};

// ── Premios del club ─────────────────────────────────────────────────────────
// Escala diseñada: enganche bajo (cejas) → meta aspiracional (pack). 1 sello por
// visita; múltiplos de 5 para que el progreso sea claro y motive el retorno.
const PREMIOS = [
  { id: 'd16-premio-1', nombre: 'Perfilado de Cejas Gratis',              costoSellos: 5,  activo: true },
  { id: 'd16-premio-2', nombre: 'Afeitado a Ras Gratis',                  costoSellos: 10, activo: true },
  { id: 'd16-premio-3', nombre: 'Corte de Cabello Gratis (incluye cejas)', costoSellos: 15, activo: true },
  { id: 'd16-premio-4', nombre: 'Pack Corte + Barba Premium Gratis',       costoSellos: 25, activo: true },
];

// ── Seed functions ────────────────────────────────────────────────────────────
async function seedServicios() {
  separador('SERVICIOS (LIMPIEZA Y CARGA)');

  // Eliminar servicios antiguos (Sion/Atenas) para evitar duplicados/leftovers.
  const oldSrv = await col('servicios').get();
  if (!oldSrv.empty) {
    console.log(`  🗑️ Limpiando ${oldSrv.size} servicios antiguos...`);
    const cleanBatch = db.batch();
    oldSrv.docs.forEach(d => cleanBatch.delete(d.ref));
    await cleanBatch.commit();
    console.log('  ✅ Limpieza completada.');
  }

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

  // 1. Eliminar barberos antiguos (Atenas/Sion) para evitar duplicados
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

  // 2. Cargar profesionales reales
  const batch = db.batch();
  for (const b of BARBEROS) {
    const { id, ...data } = b;
    batch.set(col('barberos').doc(id), { ...data, creadoEn: TS() }, { merge: true });
    console.log(`  → ${data.nombre} (${data.rol})`);
  }
  await batch.commit();

  // 3. Configuración de horarios por profesional
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
    name:            'Studio Dieciséis',
    shortName:       'Dieciséis',
    slogan:          'Cuidado personal que combina estilo y calidad.',
    club:            'Club Dieciséis',
    address:         '📍 Condell 1525, Piso 5, Local 43 · Galería Beye, Valparaíso',
    scheduleText:    'Lunes a sábado 09:00-21:00 · Domingo cerrado',
    phone:           '56937179177',
    logoUrl:         '/dieciseis/logo.png',
    instagram:       'https://www.instagram.com/studio.dieciseis_/',
    pageTitle:       'Studio Dieciséis | Barbería premium en Valparaíso',
    metaDescription: 'Reserva tu hora en Studio Dieciséis. Cortes, barba, tratamiento facial y color en Galería Beye, Valparaíso. Cuidado personal que combina estilo y calidad.',
    updatedAt:       TS(),
  }, { merge: true });

  // Tema Premium Dark · Monocromático (B&N · "Private Room")
  await tenantRef.collection('settings').doc('theme').set({
    colorBg:            '#0a0a0a',
    colorSurface:       '#111111',
    colorSurfaceAlt:    '#161616',
    colorPrimary:       '#FAFAFA',
    colorAccent:        '#E5E7EB',
    colorText:          '#e8e8ea',
    colorMuted:         '#9a9a9e',
    colorBorder:        'rgba(255,255,255,0.12)',
    colorGlow:          'rgba(255,255,255,0.18)',
    colorButtonText:    '#0a0a0a',
    colorProgressTrack: 'rgba(255,255,255,0.08)',
    updatedAt:          TS(),
  }, { merge: true });

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
  console.log('║      Studio Dieciséis (sionbarberia) — Seed       ║');
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
