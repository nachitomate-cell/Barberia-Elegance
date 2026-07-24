/**
 * seed-omega.js — Inicialización Firestore para Omega Studio (slug: `omega`)
 *
 * Recreado 2026-07-24. El tenant anterior era `omegastudio`; se eliminó
 * completamente y se rehizo con datos frescos de AgendaPro. Tema claro
 * (alias de Aura vía _themeAlias en config.js). Slug corto `omega`.
 *
 * Crea bajo tenants/omega/:
 *   servicios · barberos · configuracion/main · settings/general
 *   settings/theme · premios · profile/main
 * Y activa _system/omega { operativo: true }.
 *
 * Uso: node seed-omega.js
 */

'use strict';

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

const TENANT_ID = 'omega';
const tenantRef = db.collection('tenants').doc(TENANT_ID);
const col       = (name) => tenantRef.collection(name);

function separador(titulo) {
  console.log(`\n── ${titulo} ${'─'.repeat(Math.max(2, 50 - titulo.length))}`);
}

// ── Servicios ────────────────────────────────────────────────────────────────
const SERVICIOS = [
  { id: 'srv-o-01', nombre: 'Perfilado de cejas y/o diseño',    descripcion: '',
    precio: 2000,  duracion: 5,   categoria: 'Otros',   icono: 'ph-sparkle',  activo: true, orden: 0 },
  { id: 'srv-o-02', nombre: 'Corte de Cabello',
    descripcion: 'Incluye cortesía (té, café, agua o refresco), asesoramiento, lavado y aplicación de producto (cera, crema, polvo).',
    precio: 15000, duracion: 60,  categoria: 'Cortes',  icono: 'ph-scissors', activo: true, orden: 1 },
  { id: 'srv-o-03', nombre: 'Corte de cabello + cejas', descripcion: '',
    precio: 16000, duracion: 60,  categoria: 'Combos',  icono: 'ph-star',     activo: true, orden: 2 },
  { id: 'srv-o-04', nombre: 'Corte de cabello + limpieza facial', descripcion: '',
    precio: 25000, duracion: 80,  categoria: 'Combos',  icono: 'ph-star',     activo: true, orden: 3 },
  { id: 'srv-o-05', nombre: 'Corte de cabello + barba tradicional',
    descripcion: 'Combo corte de cabello + barba tradicional.',
    precio: 25000, duracion: 80,  categoria: 'Combos',  icono: 'ph-crown',    activo: true, orden: 4 },
  { id: 'srv-o-06', nombre: 'Corte de cabello + Barba express',
    descripcion: 'Combo corte de cabello + barba express.',
    precio: 22000, duracion: 70,  categoria: 'Combos',  icono: 'ph-crown',    activo: true, orden: 5 },
  { id: 'srv-o-07', nombre: 'Servicio full',
    descripcion: 'Promoción VIP: corte de cabello + barba tradicional + limpieza facial.',
    precio: 35000, duracion: 90,  categoria: 'Combos',  icono: 'ph-crown',    activo: true, orden: 6 },
  { id: 'srv-o-08', nombre: 'Barba tradicional',
    descripcion: 'Rebaje y perfilado con ritual de toallas calientes + vapor y navaja para detalles definidos.',
    precio: 13000, duracion: 40,  categoria: 'Barba',   icono: 'ph-mustache', activo: true, orden: 7 },
  { id: 'srv-o-09', nombre: 'Barba exprés',
    descripcion: 'Rebaje, perfilado y/o rasurado solo con máquina.',
    precio: 10000, duracion: 30,  categoria: 'Barba',   icono: 'ph-mustache', activo: true, orden: 8 },
  { id: 'srv-o-10', nombre: 'Limpieza facial',
    descripcion: 'Limpieza profunda con vapor, exfoliación, masaje facial, ritual de toallas calientes, mascarilla dorada para puntos negros e hidratación.',
    precio: 13000, duracion: 40,  categoria: 'Facial',  icono: 'ph-sparkles', activo: true, orden: 9 },
  { id: 'srv-o-11', nombre: 'Ondulación permanente', descripcion: '',
    precio: 60000, duracion: 240, categoria: 'Color',   icono: 'ph-drop',     activo: true, orden: 10 },
  { id: 'srv-o-12', nombre: 'Visos color', descripcion: '',
    precio: 65000, duracion: 300, categoria: 'Color',   icono: 'ph-palette',  activo: true, orden: 11 },
  { id: 'srv-o-13', nombre: 'Color global', descripcion: '',
    precio: 75000, duracion: 300, categoria: 'Color',   icono: 'ph-palette',  activo: true, orden: 12 },
];

// ── Profesionales ────────────────────────────────────────────────────────────
const BARBEROS = [
  { id: 'omega-julian',  nombre: 'Julián Beltrán',  foto: null, disponible: true, activo: true, rol: 'profesional', orden: 0 },
  { id: 'omega-antonio', nombre: 'Antonio Morales', foto: null, disponible: true, activo: true, rol: 'profesional', orden: 1 },
  { id: 'omega-thomas',  nombre: 'Thomas Castillo', foto: null, disponible: true, activo: true, rol: 'profesional', orden: 2 },
];

// ── Configuración horaria (Lun-Vie 10-20h · Sáb 10-18h · Dom cerrado) ───────
const HORARIO_MAIN = {
  '1': { activo: true,  inicio: '10:00', fin: '20:00' },
  '2': { activo: true,  inicio: '10:00', fin: '20:00' },
  '3': { activo: true,  inicio: '10:00', fin: '20:00' },
  '4': { activo: true,  inicio: '10:00', fin: '20:00' },
  '5': { activo: true,  inicio: '10:00', fin: '20:00' },
  '6': { activo: true,  inicio: '10:00', fin: '18:00' },
  '0': { activo: false, inicio: '10:00', fin: '14:00' },
};

// Formato que consume booking.service.js
const CONFIG_MAIN = {
  horarioInicio:           '10:00',
  horarioFin:              '20:00',
  intervaloMinutos:        30,
  minutosLimiteReagendar:  180, // 3h — política del negocio (según AgendaPro)
  diasLaborales:           [1, 2, 3, 4, 5, 6], // Lun–Sáb
  diasConfig: {
    1: { inicio: '10:00', fin: '20:00' },
    2: { inicio: '10:00', fin: '20:00' },
    3: { inicio: '10:00', fin: '20:00' },
    4: { inicio: '10:00', fin: '20:00' },
    5: { inicio: '10:00', fin: '20:00' },
    6: { inicio: '10:00', fin: '18:00' },
  },
  telefonoAdmin:           '+56972302811',
  diasBloqueados:          [],
  colacion:                null,
  chatCancelEnabled:       true,
  chatReagendarEnabled:    true,
  politicaMensaje:         'Las cancelaciones y modificaciones se aceptan hasta 3 horas antes de la reserva. Máximo 2 modificaciones por reserva.',
  reservaCooldownMin:      30,
  reservaMaxPorDia:        3,
  reservasGrupo:           { enabled: false, maxPersonas: 4 },
  opcionesAvanzadas: {
    verWhatsAppClientes:   true,
    bloqueoHorarios:       true,
    serviciosCortesia:     true,
    verWhatsAppBarberos:   [],
  },
};

// ── Premios del club ─────────────────────────────────────────────────────────
const PREMIOS = [
  { id: 'omega-premio-1', nombre: 'Corte de Cabello Gratis',  costoSellos: 10, activo: true },
  { id: 'omega-premio-2', nombre: 'Barba Tradicional Gratis', costoSellos: 8,  activo: true },
];

// ── Seed functions ──────────────────────────────────────────────────────────

async function seedServicios() {
  separador('SERVICIOS');
  const batch = db.batch();
  for (const srv of SERVICIOS) {
    const { id, ...data } = srv;
    batch.set(col('servicios').doc(id), { ...data, updatedAt: TS() }, { merge: true });
    console.log(`  → [${data.categoria}] ${data.nombre} ($${(data.precio / 1000).toFixed(1)}k · ${data.duracion}min)`);
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

  // Config horaria per-barbero — necesaria para que la agenda pública calcule
  // disponibilidad individual (booking.service.js lee este subdoc).
  for (const b of BARBEROS) {
    await col('barberos').doc(b.id).collection('configuracion').doc('main').set({
      ...CONFIG_MAIN,
      updatedAt: TS(),
    }, { merge: true });
  }
  console.log(`✅ ${BARBEROS.length} profesionales creados con configuración horaria.`);
}

async function seedConfiguracion() {
  separador('CONFIGURACIÓN GLOBAL');
  await col('configuracion').doc('main').set({ ...CONFIG_MAIN, updatedAt: TS() }, { merge: true });
  console.log('✅ /configuracion/main lista.');
}

async function seedSettings() {
  separador('SETTINGS (branding + tema claro)');

  // settings/general — lo que edita el panel Configuracion.jsx.
  await tenantRef.collection('settings').doc('general').set({
    nombre:    'OMEGA STUDIO',
    direccion: 'Av. Valparaíso 595, Local 53, 2do Piso, Viña del Mar',
    telefono:  '+56972302811',
    whatsapp:  '+56972302811',
    instagram: '@omegastudio.cl',
    logo:      '',      // el fallback usa /omega.jpg del config.js hasta que suban logo propio
    loginBanner: '',    // opcional — se muestra en el panel LoginPage
    emailAvisos: '',    // el dueño lo completa en Configuración
    horario:   HORARIO_MAIN,
    features: {
      hasCourses:            false,
      hasChairRental:        false,
      hasAcademiaInternal:   false,
      hasMultiServiceSelect: false,
    },
    quienesSomos: {
      activo: false,
      texto:  'Estudio de barbería en Viña del Mar. Cortes, barba, tratamientos faciales y color. Ambiente cuidado y atención profesional en Av. Valparaíso 595, Local 53, 2do piso.',
    },
    referralProgram: {
      enabled:     false,
      rewardText:  '¡Gana 1 sello gratis por cada amigo que se registre y agende su primer corte!',
      rewardType:  'stamp',
      rewardValue: 1,
      recompensaReferidor: null,
      recompensaReferido:  null,
    },
    updatedAt: TS(),
  }, { merge: true });

  // settings/theme — tokens de tema CLARO (alias visual de Aura).
  // El header/hero permanecen oscuros por contraste (aura hace lo mismo).
  await tenantRef.collection('settings').doc('theme').set({
    colorBg:            '#f8f7f4',
    colorSurface:       '#ffffff',
    colorSurfaceAlt:    '#f0efec',
    colorPrimary:       '#d4a96a',
    colorAccent:        '#c08040',
    colorText:          '#1a1a1a',
    colorMuted:         '#6b7280',
    colorBorder:        'rgba(212,169,106,0.28)',
    colorGlow:          'rgba(212,169,106,0.18)',
    colorButtonText:    '#ffffff',
    colorProgressTrack: 'rgba(212,169,106,0.10)',
    updatedAt:          TS(),
  }, { merge: true });

  console.log('✅ /settings/general y /settings/theme listos.');
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
  separador('PROFILE (metadata para landings)');
  await tenantRef.collection('profile').doc('main').set({
    name:            'OMEGA STUDIO',
    shortName:       'Omega',
    slogan:          'Estudio atendido por profesionales',
    club:            'Club Omega',
    address:         '📍 Av. Valparaíso 595, Local 53, 2do Piso | Viña del Mar',
    scheduleText:    'Lun–Vie 10–20h · Sáb 10–18h · Domingo cerrado',
    phone:           '+56972302811',
    logoUrl:         '/omega.jpg',
    instagram:       'https://www.instagram.com/omegastudio.cl/',
    pageTitle:       'Omega Studio | Agenda tu hora en Viña del Mar',
    metaDescription: 'Reserva tu hora en Omega Studio. Cortes, barba, tratamientos faciales y color en Av. Valparaíso 595, Local 53, Viña del Mar.',
    updatedAt:       TS(),
  }, { merge: true });
  console.log('✅ /profile/main listo.');
}

async function seedSystem() {
  separador('_SYSTEM (activar tenant)');
  await db.doc('_system/omega').set({ operativo: true, updatedAt: TS() }, { merge: true });
  console.log('✅ _system/omega { operativo: true } — tenant en línea.');
}

// ── Main ────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║          Omega Studio (omega) — Seed             ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`Proyecto: barberia-elegance  |  Tenant: ${TENANT_ID}\n`);

  await seedServicios();
  await seedBarberos();
  await seedConfiguracion();
  await seedSettings();
  await seedPremios();
  await seedProfile();
  await seedSystem();

  console.log('\n✅ Seed completado con éxito');
  console.log('   Próximo paso manual: agregar el dominio omega.synaptechspa.cl en Vercel.\n');
  process.exit(0);
}

seed().catch(err => {
  console.error('\n❌ Error durante el seed:', err.message);
  process.exit(1);
});
