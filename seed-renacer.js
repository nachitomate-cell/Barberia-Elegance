/**
 * seed-renacer.js — Inicialización Firestore para Peluquería y Barbería Renacer (renacer)
 *
 * Fuente: https://agendapro.com/site/cl/peluqueriaybarberiarenacer/479550
 *         Extraído el 2026-07-14 desde el blob RSC embebido de AgendaPro
 *         (63 servicios en 6 categorías originales · 6 miembros del staff).
 *
 * Crea bajo tenants/renacer/:
 *   · configuracion/main    · horario Lun–Sáb 10:00–20:00 · slotDuration 30
 *   · servicios/{id}        · 63 servicios (Barbería: 9, Estética: 37, Peluquería: 17)
 *   · barberos/{id}         · 6 profesionales reales de AgendaPro
 *   · premios/default       · 1 premio de fidelidad (10 sellos → Servicio Gratis)
 *
 * Y bajo _system/renacer:
 *   · killSwitch, plan, billingStatus (control multi-tenant)
 *
 * Categorías normalizadas al schema del sistema (['Peluquería','Barbería','Estética','Manicura']).
 * Las categorías originales de AgendaPro quedan preservadas en `categoriaOriginal` por si
 * la UI las necesita para migración o auditoría.
 *
 * Uso:
 *   node seed-renacer.js            # dry-run: imprime el plan sin escribir
 *   node seed-renacer.js --commit   # ejecuta la escritura real en Firestore
 *
 * ⚠️  PENDIENTES DEL CLIENTE (revisar tras primer seed):
 *   · Confirmar rol jefe/dueño entre Priscila, Cris, Claudia, Yender, Jhon, Rubén
 *   · Subir logo real (/renacer/logo.png) y banner (/renacer/banner.jpg)
 *   · Confirmar teléfono, dirección y horarios definitivos
 *   · Revisar duraciones marcadas como raras (Alisado 240min, Axilas 5min...)
 *   · Asignar Custom Claims (role=admin, tenantId=renacer) al UID del dueño
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

const db  = admin.firestore();
const TS  = admin.firestore.FieldValue.serverTimestamp;

const TENANT_ID  = 'renacer';
const COMMIT     = process.argv.includes('--commit');
const tenantRef  = db.collection('tenants').doc(TENANT_ID);
const col        = (name) => tenantRef.collection(name);

function separador(titulo) {
  console.log(`\n── ${titulo} ${'─'.repeat(Math.max(0, 55 - titulo.length))}`);
}

// ── Servicios (extraídos de AgendaPro) ────────────────────────────────────────
const SERVICIOS = [
  { id: 'corte-masculino-barba', nombre: 'Corte Masculino + Barba', precio: 20000, duracion: 60, categoria: 'Barbería', categoriaOriginal: 'BARBERÍA & CUIDADO MASCULINO', agendaproId: 2694819, activo: true, orden: 0 },
  { id: 'corte-masculino-perfilado-de-cejas', nombre: 'Corte Masculino + Perfilado de Cejas', precio: 14000, duracion: 30, categoria: 'Barbería', categoriaOriginal: 'BARBERÍA & CUIDADO MASCULINO', agendaproId: 2699807, activo: true, orden: 1 },
  { id: 'corte-de-cabello-masculino', nombre: 'Corte de Cabello Masculino', precio: 13000, duracion: 30, categoria: 'Barbería', categoriaOriginal: 'BARBERÍA & CUIDADO MASCULINO', agendaproId: 2694754, activo: true, orden: 2 },
  { id: 'lavado-delux-masculino', nombre: 'Lavado Delux Masculino', precio: 4000, duracion: 5, categoria: 'Barbería', categoriaOriginal: 'BARBERÍA & CUIDADO MASCULINO', agendaproId: 2695452, activo: true, orden: 3 },
  { id: 'limpieza-facial-maculina', nombre: 'Limpieza Facial Maculina', precio: 10000, duracion: 15, categoria: 'Barbería', categoriaOriginal: 'BARBERÍA & CUIDADO MASCULINO', agendaproId: 2699810, activo: true, orden: 4 },
  { id: 'ondulacion-permanente', nombre: 'Ondulación Permanente', precio: 35000, duracion: 120, categoria: 'Barbería', categoriaOriginal: 'BARBERÍA & CUIDADO MASCULINO', agendaproId: 2699816, activo: true, orden: 5 },
  { id: 'perfilado-de-cejas-masculino', nombre: 'Perfilado De Cejas Masculino', precio: 3000, duracion: 5, categoria: 'Barbería', categoriaOriginal: 'BARBERÍA & CUIDADO MASCULINO', agendaproId: 2699803, activo: true, orden: 6 },
  { id: 'perfilado-de-barba', nombre: 'Perfilado de Barba', precio: 10000, duracion: 30, categoria: 'Barbería', categoriaOriginal: 'BARBERÍA & CUIDADO MASCULINO', agendaproId: 2694758, activo: true, orden: 7 },
  { id: 'promocion-estudiantes', nombre: '💈Promoción 💈estudiantes', precio: 11000, duracion: 30, categoria: 'Barbería', categoriaOriginal: 'BARBERÍA & CUIDADO MASCULINO', agendaproId: 2846906, activo: true, orden: 8 },
  { id: 'abdomen', nombre: 'Abdomen', precio: 7000, duracion: 15, categoria: 'Estética', categoriaOriginal: 'DEPILACION FEMENINA', agendaproId: 2725952, activo: true, orden: 9 },
  { id: 'axilas', nombre: 'Axilas', precio: 4500, duracion: 5, categoria: 'Estética', categoriaOriginal: 'DEPILACION FEMENINA', agendaproId: 2725209, activo: true, orden: 10 },
  { id: 'brazo', nombre: 'Brazo', precio: 8500, duracion: 15, categoria: 'Estética', categoriaOriginal: 'DEPILACION FEMENINA', agendaproId: 2725947, activo: true, orden: 11 },
  { id: 'colales', nombre: 'Colales', precio: 9000, duracion: 15, categoria: 'Estética', categoriaOriginal: 'DEPILACION FEMENINA', agendaproId: 2725961, activo: true, orden: 12 },
  { id: 'cuello', nombre: 'Cuello', precio: 3000, duracion: 5, categoria: 'Estética', categoriaOriginal: 'DEPILACION FEMENINA', agendaproId: 2725191, activo: true, orden: 13 },
  { id: 'depilacion-cejas', nombre: 'Depilación Cejas', precio: 4000, duracion: 5, categoria: 'Estética', categoriaOriginal: 'DEPILACION FEMENINA', agendaproId: 2725188, activo: true, orden: 14 },
  { id: 'depilacion-menton', nombre: 'Depilación Mentón', precio: 2000, duracion: 5, categoria: 'Estética', categoriaOriginal: 'DEPILACION FEMENINA', agendaproId: 2725187, activo: true, orden: 15 },
  { id: 'depilacion-nariz', nombre: 'Depilación Nariz', precio: 2000, duracion: 5, categoria: 'Estética', categoriaOriginal: 'DEPILACION FEMENINA', agendaproId: 2725190, activo: true, orden: 16 },
  { id: 'depilacion-bozo', nombre: 'Depilación bozo', precio: 2000, duracion: 5, categoria: 'Estética', categoriaOriginal: 'DEPILACION FEMENINA', agendaproId: 2725185, activo: true, orden: 17 },
  { id: 'espalda-completa', nombre: 'Espalda Completa', precio: 10000, duracion: 15, categoria: 'Estética', categoriaOriginal: 'DEPILACION FEMENINA', agendaproId: 2725953, activo: true, orden: 18 },
  { id: 'gluteos', nombre: 'Glúteos', precio: 6000, duracion: 15, categoria: 'Estética', categoriaOriginal: 'DEPILACION FEMENINA', agendaproId: 2725957, activo: true, orden: 19 },
  { id: 'manos-y-dedos', nombre: 'Manos y Dedos', precio: 4000, duracion: 10, categoria: 'Estética', categoriaOriginal: 'DEPILACION FEMENINA', agendaproId: 2725963, activo: true, orden: 20 },
  { id: 'media-espalda', nombre: 'Media Espalda', precio: 5000, duracion: 15, categoria: 'Estética', categoriaOriginal: 'DEPILACION FEMENINA', agendaproId: 2725955, activo: true, orden: 21 },
  { id: 'media-pierna', nombre: 'Media Pierna', precio: 6500, duracion: 20, categoria: 'Estética', categoriaOriginal: 'DEPILACION FEMENINA', agendaproId: 2725223, activo: true, orden: 22 },
  { id: 'medio-brazo', nombre: 'Medio Brazo', precio: 6500, duracion: 15, categoria: 'Estética', categoriaOriginal: 'DEPILACION FEMENINA', agendaproId: 2725949, activo: true, orden: 23 },
  { id: 'muslo', nombre: 'Muslo', precio: 6000, duracion: 15, categoria: 'Estética', categoriaOriginal: 'DEPILACION FEMENINA', agendaproId: 2725945, activo: true, orden: 24 },
  { id: 'nuca', nombre: 'Nuca', precio: 4000, duracion: 5, categoria: 'Estética', categoriaOriginal: 'DEPILACION FEMENINA', agendaproId: 2725212, activo: true, orden: 25 },
  { id: 'pierna-completa', nombre: 'Pierna Completa', precio: 8500, duracion: 30, categoria: 'Estética', categoriaOriginal: 'DEPILACION FEMENINA', agendaproId: 2725224, activo: true, orden: 26 },
  { id: 'pies', nombre: 'Pies', precio: 4000, duracion: 10, categoria: 'Estética', categoriaOriginal: 'DEPILACION FEMENINA', agendaproId: 2725965, activo: true, orden: 27 },
  { id: 'promocion-rostro-completo', nombre: 'Promocion Rostro Completo', precio: 14000, duracion: 20, categoria: 'Estética', categoriaOriginal: 'DEPILACION FEMENINA', agendaproId: 2725201, activo: true, orden: 28 },
  { id: 'rebaje-completo', nombre: 'Rebaje Completo', precio: 13000, duracion: 20, categoria: 'Estética', categoriaOriginal: 'DEPILACION FEMENINA', agendaproId: 2725959, activo: true, orden: 29 },
  { id: 'rebaje-largo', nombre: 'Rebaje largo', precio: 7000, duracion: 15, categoria: 'Estética', categoriaOriginal: 'DEPILACION FEMENINA', agendaproId: 2725958, activo: true, orden: 30 },
  { id: 'axilas-2', nombre: 'Axilas', precio: 6000, duracion: 10, categoria: 'Estética', categoriaOriginal: 'DEPILACION MASCULINA', agendaproId: 2725970, activo: true, orden: 31 },
  { id: 'barba', nombre: 'Barba', precio: 12000, duracion: 20, categoria: 'Estética', categoriaOriginal: 'DEPILACION MASCULINA', agendaproId: 2725977, activo: true, orden: 32 },
  { id: 'brazo-2', nombre: 'Brazo', precio: 13000, duracion: 20, categoria: 'Estética', categoriaOriginal: 'DEPILACION MASCULINA', agendaproId: 2725971, activo: true, orden: 33 },
  { id: 'cejas', nombre: 'Cejas', precio: 4000, duracion: 10, categoria: 'Estética', categoriaOriginal: 'DEPILACION MASCULINA', agendaproId: 2725980, activo: true, orden: 34 },
  { id: 'espalda', nombre: 'Espalda', precio: 18000, duracion: 30, categoria: 'Estética', categoriaOriginal: 'DEPILACION MASCULINA', agendaproId: 2725975, activo: true, orden: 35 },
  { id: 'frente', nombre: 'Frente', precio: 3000, duracion: 10, categoria: 'Estética', categoriaOriginal: 'DEPILACION MASCULINA', agendaproId: 2725981, activo: true, orden: 36 },
  { id: 'manos-y-dedos-2', nombre: 'Manos y Dedos', precio: 4000, duracion: 10, categoria: 'Estética', categoriaOriginal: 'DEPILACION MASCULINA', agendaproId: 2725972, activo: true, orden: 37 },
  { id: 'medio-brazo-2', nombre: 'Medio Brazo', precio: 9000, duracion: 15, categoria: 'Estética', categoriaOriginal: 'DEPILACION MASCULINA', agendaproId: 2725973, activo: true, orden: 38 },
  { id: 'nariz', nombre: 'Nariz', precio: 2000, duracion: 5, categoria: 'Estética', categoriaOriginal: 'DEPILACION MASCULINA', agendaproId: 2725983, activo: true, orden: 39 },
  { id: 'orejas', nombre: 'Orejas', precio: 5000, duracion: 10, categoria: 'Estética', categoriaOriginal: 'DEPILACION MASCULINA', agendaproId: 2725982, activo: true, orden: 40 },
  { id: 'pecho-completo', nombre: 'Pecho Completo', precio: 18000, duracion: 15, categoria: 'Estética', categoriaOriginal: 'DEPILACION MASCULINA', agendaproId: 2725987, activo: true, orden: 41 },
  { id: 'perfilado-barba', nombre: 'Perfilado Barba', precio: 8000, duracion: 15, categoria: 'Estética', categoriaOriginal: 'DEPILACION MASCULINA', agendaproId: 2725985, activo: true, orden: 42 },
  { id: 'pies-2', nombre: 'Pies', precio: 4000, duracion: 10, categoria: 'Estética', categoriaOriginal: 'DEPILACION MASCULINA', agendaproId: 2725978, activo: true, orden: 43 },
  { id: 'pomulos', nombre: 'Pómulos', precio: 3000, duracion: 10, categoria: 'Estética', categoriaOriginal: 'DEPILACION MASCULINA', agendaproId: 2725979, activo: true, orden: 44 },
  { id: 'rostro-completo', nombre: 'Rostro Completo', precio: 18000, duracion: 20, categoria: 'Estética', categoriaOriginal: 'DEPILACION MASCULINA', agendaproId: 2725976, activo: true, orden: 45 },
  { id: 'barrido-de-color-correccion-de-color', nombre: 'Barrido de color + corrección de Color', precio: 50000, duracion: 120, categoria: 'Peluquería', categoriaOriginal: 'COLOR', agendaproId: 2758772, activo: true, orden: 46 },
  { id: 'bano-de-color-tratamiento-loreal', nombre: 'Baño de Color + Tratamiento Loreal', precio: 45000, duracion: 120, categoria: 'Peluquería', categoriaOriginal: 'COLOR', agendaproId: 2694107, activo: true, orden: 47 },
  { id: 'cobertura-de-canas-premium-sin-amoniaco', nombre: 'Cobertura de Canas Premium Sin amoniaco', precio: 40000, duracion: 120, categoria: 'Peluquería', categoriaOriginal: 'COLOR', agendaproId: 2694095, activo: true, orden: 48 },
  { id: 'cobertura-de-canas-premium-sin-amoniaco-bano-color', nombre: 'Cobertura de Canas Premium sin Amoniaco + Baño Color', precio: 45000, duracion: 130, categoria: 'Peluquería', categoriaOriginal: 'COLOR', agendaproId: 2722746, activo: true, orden: 49 },
  { id: 'cobertura-de-canas-standar', nombre: 'Cobertura de Canas Standar', precio: 35000, duracion: 120, categoria: 'Peluquería', categoriaOriginal: 'COLOR', agendaproId: 2694084, activo: true, orden: 50 },
  { id: 'cobertura-de-canas-standar-bano-de-color', nombre: 'Cobertura de Canas Standar + Baño de Color', precio: 40000, duracion: 130, categoria: 'Peluquería', categoriaOriginal: 'COLOR', agendaproId: 2761767, activo: true, orden: 51 },
  { id: 'lavado-matizante', nombre: 'Lavado Matizante', precio: 20000, duracion: 60, categoria: 'Peluquería', categoriaOriginal: 'COLOR', agendaproId: 2793840, activo: true, orden: 52 },
  { id: 'morena-iluminada', nombre: 'Morena Iluminada', precio: 70000, duracion: 240, categoria: 'Peluquería', categoriaOriginal: 'COLOR', agendaproId: 2762825, activo: true, orden: 53 },
  { id: 'visos-dimension-capilar', nombre: 'Visos & Dimensión Capilar', precio: 50000, duracion: 180, categoria: 'Peluquería', categoriaOriginal: 'COLOR', agendaproId: 2694770, activo: true, orden: 54 },
  { id: 'alisado-organico', nombre: 'Alisado Orgánico', precio: 45000, duracion: 240, categoria: 'Peluquería', categoriaOriginal: 'CORTE FEMENINO Y TRATAMIENTOS CAPILARES', agendaproId: 2693983, activo: true, orden: 55 },
  { id: 'corte-de-cabello-femenino', nombre: 'Corte de Cabello Femenino', precio: 16000, duracion: 60, categoria: 'Peluquería', categoriaOriginal: 'CORTE FEMENINO Y TRATAMIENTOS CAPILARES', agendaproId: 2625326, activo: true, orden: 56 },
  { id: 'corte-de-cabello-femenino-peinado', nombre: 'Corte de Cabello Femenino + Peinado', precio: 20000, duracion: 60, categoria: 'Peluquería', categoriaOriginal: 'CORTE FEMENINO Y TRATAMIENTOS CAPILARES', agendaproId: 2694067, activo: true, orden: 57 },
  { id: 'lavado-brushing', nombre: 'Lavado + brushing', precio: 13000, duracion: 30, categoria: 'Peluquería', categoriaOriginal: 'CORTE FEMENINO Y TRATAMIENTOS CAPILARES', agendaproId: 2740023, activo: true, orden: 58 },
  { id: 'masaje-nutritivo-standar', nombre: 'Masaje Nutritivo Standar', precio: 20000, duracion: 120, categoria: 'Peluquería', categoriaOriginal: 'CORTE FEMENINO Y TRATAMIENTOS CAPILARES', agendaproId: 2694715, activo: true, orden: 59 },
  { id: 'nutricion-premium-loreal', nombre: 'Nutrición Premium L’Oreal', precio: 30000, duracion: 100, categoria: 'Peluquería', categoriaOriginal: 'CORTE FEMENINO Y TRATAMIENTOS CAPILARES', agendaproId: 2846401, activo: true, orden: 60 },
  { id: 'promo-cobertura-de-canas', nombre: 'Promo Cobertura de Canas', precio: 50000, duracion: 120, categoria: 'Peluquería', categoriaOriginal: 'PROMOCIONES', agendaproId: 2707706, activo: true, orden: 61 },
  { id: 'promo-corte-de-cabello-femenino-nutricion', nombre: 'Promo Corte de Cabello Femenino + Nutrición', precio: 25000, duracion: 70, categoria: 'Peluquería', categoriaOriginal: 'PROMOCIONES', agendaproId: 2694814, activo: true, orden: 62 },
];

// ── Profesionales (extraídos de AgendaPro) ────────────────────────────────────
// ⚠️ Rol default = 'profesional'. Confirmar con el cliente cuál es jefe/dueño.
const BARBEROS = [
  { id: 'renacer-priscila', nombre: 'Priscila', agendaproId: 781266, foto: null, disponible: true, activo: true, rol: 'profesional', orden: 0 },
  { id: 'renacer-cris', nombre: 'Cris', agendaproId: 802659, foto: null, disponible: true, activo: true, rol: 'profesional', orden: 1 },
  { id: 'renacer-claudia', nombre: 'Claudia', agendaproId: 802661, foto: null, disponible: true, activo: true, rol: 'profesional', orden: 2 },
  { id: 'renacer-yender', nombre: 'Yender', agendaproId: 802680, foto: null, disponible: true, activo: true, rol: 'profesional', orden: 3 },
  { id: 'renacer-jhon', nombre: 'Jhon', agendaproId: 803575, foto: null, disponible: true, activo: true, rol: 'profesional', orden: 4 },
  { id: 'renacer-ruben', nombre: 'Rubén', agendaproId: 829650, foto: null, disponible: true, activo: true, rol: 'profesional', orden: 5 },
];

// ── Configuración de horarios ────────────────────────────────────────────────
const CONFIG = {
  horarioInicio:          '10:00',
  horarioFin:             '20:00',
  intervaloMinutos:       30,
  slotDuration:           30,
  reservasActivas:        true,
  minutosLimiteReagendar: 0,
  diasLaborales:          [1, 2, 3, 4, 5, 6], // Lun–Sáb
  telefonoAdmin:          '',                  // ⚠️ Agregar teléfono real
  diasBloqueados:         [],
  colacion:               null,
  diasConfig:             {},
};

// ── Premios del club ─────────────────────────────────────────────────────────
const PREMIOS = [
  {
    id:            'default',
    nombre:        'Servicio de Estilismo o Corte Gratis',
    descripcion:   'Canjea 10 sellos por un servicio gratis de estilismo o corte.',
    sellosRequeridos: 10,
    costoSellos:   10,        // alias para compatibilidad UI (algunos componentes leen costoSellos)
    activo:        true,
  },
];

// ── _system/renacer (control multi-tenant + billing) ─────────────────────────
const SYSTEM_DOC = {
  killSwitch:    false,
  plan:          'pro',
  billingStatus: 'active',
  status:        'active',   // alias usado por otros módulos
};

// ── Seed functions ────────────────────────────────────────────────────────────
async function seedServicios() {
  separador('SERVICIOS');
  const batches = [];
  let batch = db.batch();
  let count = 0;
  for (const srv of SERVICIOS) {
    const { id, ...data } = srv;
    batch.set(col('servicios').doc(id), { ...data, updatedAt: TS() }, { merge: true });
    console.log(`  → [${data.categoria}] ${data.nombre} · $${data.precio.toLocaleString('es-CL')} · ${data.duracion}min`);
    count++;
    if (count % 400 === 0) { batches.push(batch); batch = db.batch(); }
  }
  batches.push(batch);
  if (COMMIT) {
    for (const b of batches) await b.commit();
  }
  console.log(`${COMMIT ? '✅' : '🅳🆁🆈'} ${SERVICIOS.length} servicios ${COMMIT ? 'creados' : 'planeados (dry-run)'}.`);
}

async function seedBarberos() {
  separador('PROFESIONALES');
  const batch = db.batch();
  for (const b of BARBEROS) {
    const { id, ...data } = b;
    batch.set(col('barberos').doc(id), { ...data, creadoEn: TS() }, { merge: true });
    console.log(`  → ${data.nombre} (${data.rol})`);
  }
  if (COMMIT) await batch.commit();
  console.log(`${COMMIT ? '✅' : '🅳🆁🆈'} ${BARBEROS.length} profesionales ${COMMIT ? 'creados' : 'planeados (dry-run)'}.`);
}

async function seedConfiguracion() {
  separador('CONFIGURACIÓN');
  if (COMMIT) {
    await col('configuracion').doc('main').set({ ...CONFIG, updatedAt: TS() }, { merge: true });
  }
  console.log(`${COMMIT ? '✅' : '🅳🆁🆈'} /configuracion/main ${COMMIT ? 'lista' : 'planeada (dry-run)'}.`);
}

async function seedPremios() {
  separador('PREMIOS CLUB');
  const batch = db.batch();
  for (const p of PREMIOS) {
    const { id, ...data } = p;
    batch.set(col('premios').doc(id), { ...data, creadoEn: TS() }, { merge: true });
    console.log(`  → ${data.nombre} (${data.sellosRequeridos} sellos)`);
  }
  if (COMMIT) await batch.commit();
  console.log(`${COMMIT ? '✅' : '🅳🆁🆈'} ${PREMIOS.length} premios ${COMMIT ? 'creados' : 'planeados (dry-run)'}.`);
}

async function seedSystem() {
  separador('_SYSTEM (kill switch + billing)');
  if (COMMIT) {
    await db.collection('_system').doc(TENANT_ID).set(
      { ...SYSTEM_DOC, updatedAt: TS() },
      { merge: true },
    );
  }
  console.log(`${COMMIT ? '✅' : '🅳🆁🆈'} _system/${TENANT_ID} · plan=${SYSTEM_DOC.plan} · killSwitch=${SYSTEM_DOC.killSwitch}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function seed() {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║  Peluquería y Barbería Renacer (renacer) — Seed  ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`Proyecto: barberia-elegance  |  Tenant: ${TENANT_ID}  |  Modo: ${COMMIT ? 'COMMIT' : 'DRY-RUN'}\n`);
  if (!COMMIT) console.log('ℹ️  Sin --commit: nada se escribe en Firestore. Solo imprime el plan.\n');

  await seedServicios();
  await seedBarberos();
  await seedConfiguracion();
  await seedPremios();
  await seedSystem();

  console.log('\n✅ Seed completado con éxito.');
  console.log('\n⚠️  Pendientes humanos:');
  console.log('   · Confirmar rol jefe/dueño del equipo (Priscila, Cris, Claudia, Yender, Jhon, Rubén)');
  console.log('   · Subir /renacer/logo.png y /renacer/banner.jpg a public/');
  console.log('   · Confirmar teléfono real, dirección exacta y horarios definitivos');
  console.log('   · Revisar duraciones marcadas como raras (Alisado 240min, Axilas 5min, etc.)');
  console.log('   · Asignar Custom Claims { role: "admin", tenantId: "renacer" } al UID del dueño');
  console.log('   · Fase 2: generar PWA icons (node scripts/gen-pwa-icons.js)');
  process.exit(0);
}

seed().catch(err => {
  console.error('\n❌ Error durante el seed:', err.message);
  process.exit(1);
});
