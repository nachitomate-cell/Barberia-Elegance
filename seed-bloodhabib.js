/**
 * seed-bloodhabib.js — Inicialización Firestore para Blood Habib (slug: `bloodhabib`)
 *
 * Creado 2026-08-03. Datos extraídos del perfil público de Weibook
 * (book.weibook.co/blood-habib · key `blood_habib`): identidad, dirección,
 * teléfono, Instagram, horario, 12 servicios con precio/duración/descripción
 * y 3 profesionales con su asignación real de servicios.
 *
 * Crea bajo tenants/bloodhabib/:
 *   servicios · barberos (+ configuracion/main c/u) · configuracion/main
 *   settings/general · settings/theme · premios · profile/main
 * Y activa _system/bloodhabib { operativo: true }.
 *
 * Notas de fidelidad al origen:
 *  · Weibook lista un 4º "colaborador" llamado «Blood Habib» sin foto: es el
 *    perfil del propio local, no una persona. NO se siembra como barbero.
 *  · `serviciosIds` replica qué servicio hace cada profesional en Weibook
 *    (Maurice no hace corte infantil ni ondulación; Benjamín no hace color).
 *    Lista vacía = hace todo; acá van explícitas para no inventar cobertura.
 *  · Las fotos se sirven desde /bloodhabib/ en el repo (recortadas al rostro),
 *    no desde el CDN de Weibook, que es de un tercero y puede caducar.
 *
 * Uso: node seed-bloodhabib.js
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

const TENANT_ID = 'bloodhabib';
const tenantRef = db.collection('tenants').doc(TENANT_ID);
const col       = (name) => tenantRef.collection(name);

function separador(titulo) {
  console.log(`\n── ${titulo} ${'─'.repeat(Math.max(2, 52 - titulo.length))}`);
}

// ── Servicios (12, tal como los publica Weibook) ─────────────────────────────
const SERVICIOS = [
  { id: 'bh-corte-cabello', nombre: 'Corte de cabello',
    descripcion: 'Asesoría estética, corte de cabello, lavado básico y peinado con producto a elección. Servicio orientado al mantenimiento de cabellos cortos o medios.',
    precio: 14000, duracion: 45, categoria: 'Cortes', icono: 'ph-scissors', activo: true, orden: 0 },

  { id: 'bh-corte-diseno', nombre: 'Corte de cabello y diseño',
    descripcion: 'Corte de cabello con diseño o line-up a mano alzada.',
    precio: 17000, duracion: 45, categoria: 'Cortes', icono: 'ph-scissors', activo: true, orden: 1 },

  { id: 'bh-corte-largo', nombre: 'Corte de cabello largo',
    descripcion: 'Asesoría estética y corte de cabello largo con técnicas de tijera, incluye lavado y peinado con productos a elección. Enfocado en clientes de cabello medio o largo que buscan un cambio de look.',
    precio: 18000, duracion: 45, categoria: 'Cortes', icono: 'ph-scissors', activo: true, orden: 2 },

  { id: 'bh-corte-nino', nombre: 'Corte de cabello niño (hasta 14 años)',
    descripcion: 'Corte de cabello para niños hasta 14 años. Incluye lavado y peinado.',
    precio: 14000, duracion: 45, categoria: 'Cortes', icono: 'ph-baby', activo: true, orden: 3 },

  { id: 'bh-barba', nombre: 'Perfilado de barba con paños calientes',
    descripcion: 'Corte y/o rasurado con navaja y máquinas, acompañado de paños calientes y productos de afeitado e hidratación.',
    precio: 14000, duracion: 30, categoria: 'Barba', icono: 'ph-mustache', activo: true, orden: 4 },

  { id: 'bh-corte-barba', nombre: 'Corte de cabello y perfilado de barba',
    descripcion: 'Asesoría estética, corte de cabello medio o corto, corte o rasurado de barba con navaja y paños calientes, lavado de cabello.',
    precio: 22000, duracion: 60, categoria: 'Combos', icono: 'ph-star', activo: true, orden: 5 },

  { id: 'bh-corte-largo-barba', nombre: 'Corte de cabello largo y perfilado de barba',
    descripcion: 'Asesoría estética, corte de cabello largo, corte o rasurado de barba con navaja y paños calientes, lavado de cabello.',
    precio: 24000, duracion: 60, categoria: 'Combos', icono: 'ph-star', activo: true, orden: 6 },

  { id: 'bh-corte-facial', nombre: 'Corte de cabello y limpieza facial',
    descripcion: 'Asesoría estética, exfoliación y limpieza facial con productos hidratantes y mascarilla, perfilado de cejas, corte y lavado de cabello.',
    precio: 17000, duracion: 60, categoria: 'Combos', icono: 'ph-sparkle', activo: true, orden: 7 },

  { id: 'bh-full-habib', nombre: 'Servicio full habib',
    descripcion: 'Corte de cabello, perfilado de barba con paños calientes, exfoliación y limpieza facial con productos hidratantes y mascarilla, perfilado de cejas y lavado de cabello, cerrando con peinado con pomada o polvo texturizador. ¡Experiencia única y relajante!',
    precio: 30000, duracion: 60, categoria: 'Combos', icono: 'ph-crown', activo: true, orden: 8 },

  { id: 'bh-visos', nombre: 'Visos y corte de cabello',
    descripcion: 'Visos o mechas de color a elección, corte de cabello y lavado.',
    precio: 70000, duracion: 160, categoria: 'Color', icono: 'ph-palette', activo: true, orden: 9 },

  { id: 'bh-color-fantasia', nombre: 'Color fantasía y corte de cabello',
    descripcion: 'Decoloración completa, color fantasía a elección y corte de cabello con lavado.',
    precio: 85000, duracion: 180, categoria: 'Color', icono: 'ph-palette', activo: true, orden: 10 },

  { id: 'bh-ondulacion', nombre: 'Ondulación permanente y corte de cabello',
    descripcion: 'Ondulación permanente para cabellos medios o largos, incluye corte de cabello y lavado.',
    precio: 70000, duracion: 160, categoria: 'Color', icono: 'ph-drop', activo: true, orden: 11 },
];

const ID = (n) => SERVICIOS[n].id;
const TODOS_LOS_SERVICIOS = SERVICIOS.map(s => s.id);

// ── Horario del local: Lun–Vie 10–20h · Sáb 10–18h · Dom cerrado ────────────
const HORARIO = {
  '1': { activo: true,  inicio: '10:00', fin: '20:00' },
  '2': { activo: true,  inicio: '10:00', fin: '20:00' },
  '3': { activo: true,  inicio: '10:00', fin: '20:00' },
  '4': { activo: true,  inicio: '10:00', fin: '20:00' },
  '5': { activo: true,  inicio: '10:00', fin: '20:00' },
  '6': { activo: true,  inicio: '10:00', fin: '18:00' },
  '0': { activo: false, inicio: '10:00', fin: '18:00' },
};

// ── Profesionales ───────────────────────────────────────────────────────────
// `horario` va en el DOC del barbero: de ahí sale la línea "Lun–Sáb" de la
// tarjeta en la agenda pública (_buildDiasLabel en index.html).
const BARBEROS = [
  {
    id: 'bh-maurice', nombre: 'Maurice Hinojosa',
    especialidad: 'Cortes, barba y color',
    foto: '/bloodhabib/equipo/maurice-hinojosa.webp',
    disponible: true, activo: true, rol: 'barbero', orden: 0,
    horario: HORARIO,
    // Weibook: no aparece en corte infantil ni en ondulación permanente.
    serviciosIds: TODOS_LOS_SERVICIOS.filter(id => id !== ID(3) && id !== ID(11)),
  },
  {
    id: 'bh-nicolas', nombre: 'Nicolás Vidal',
    especialidad: 'Color, ondulación y cortes',
    foto: '/bloodhabib/equipo/nicolas-vidal.webp',
    disponible: true, activo: true, rol: 'barbero', orden: 1,
    horario: HORARIO,
    serviciosIds: TODOS_LOS_SERVICIOS,
  },
  {
    id: 'bh-benjamin', nombre: 'Benjamín Ordenes',
    especialidad: 'Cortes, barba y corte infantil',
    foto: '/bloodhabib/equipo/benjamin-ordenes.webp',
    disponible: true, activo: true, rol: 'barbero', orden: 2,
    horario: HORARIO,
    // Weibook: no aparece en ninguno de los servicios de color.
    serviciosIds: TODOS_LOS_SERVICIOS.filter(id => ![ID(9), ID(10), ID(11)].includes(id)),
  },
];

// ── Configuración que consume booking.service.js ────────────────────────────
const CONFIG_MAIN = {
  horarioInicio:          '10:00',
  horarioFin:             '20:00',
  intervaloMinutos:       30,
  minutosLimiteReagendar: 180,
  diasLaborales:          [1, 2, 3, 4, 5, 6], // Lun–Sáb
  diasConfig: {
    1: { inicio: '10:00', fin: '20:00' },
    2: { inicio: '10:00', fin: '20:00' },
    3: { inicio: '10:00', fin: '20:00' },
    4: { inicio: '10:00', fin: '20:00' },
    5: { inicio: '10:00', fin: '20:00' },
    6: { inicio: '10:00', fin: '18:00' },
  },
  telefonoAdmin:          '+56945701749',
  diasBloqueados:         [],
  colacion:               null,
  chatCancelEnabled:      true,
  chatReagendarEnabled:   true,
  politicaMensaje:        'Te pedimos puntualidad para poder atenderte con la mejor disposición. Las cancelaciones y modificaciones se aceptan hasta 3 horas antes de la reserva.',
  reservaCooldownMin:     30,
  reservaMaxPorDia:       3,
  reservasGrupo:          { enabled: false, maxPersonas: 4 },
  opcionesAvanzadas: {
    verWhatsAppClientes:  true,
    bloqueoHorarios:      true,
    serviciosCortesia:    true,
    verWhatsAppBarberos:  [],
  },
};

// ── Premios del club ────────────────────────────────────────────────────────
const PREMIOS = [
  { id: 'bh-premio-1', nombre: 'Corte de cabello gratis',                 costoSellos: 10, activo: true },
  { id: 'bh-premio-2', nombre: 'Perfilado de barba con paños calientes',  costoSellos: 8,  activo: true },
];

// ── Seeds ───────────────────────────────────────────────────────────────────

async function seedServicios() {
  separador('SERVICIOS');
  const batch = db.batch();
  for (const srv of SERVICIOS) {
    const { id, ...data } = srv;
    batch.set(col('servicios').doc(id), { ...data, updatedAt: TS() }, { merge: true });
    console.log(`  → [${data.categoria.padEnd(7)}] ${data.nombre} ($${data.precio.toLocaleString('es-CL')} · ${data.duracion}min)`);
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
    console.log(`  → ${data.nombre} · ${data.especialidad} (${data.serviciosIds.length}/${SERVICIOS.length} servicios)`);
  }
  await batch.commit();

  // Config horaria por barbero — la agenda pública calcula la disponibilidad
  // individual desde este subdoc (booking.service.js).
  for (const b of BARBEROS) {
    await col('barberos').doc(b.id).collection('configuracion').doc('main')
      .set({ ...CONFIG_MAIN, updatedAt: TS() }, { merge: true });
  }
  console.log(`✅ ${BARBEROS.length} profesionales creados con configuración horaria.`);
}

async function seedConfiguracion() {
  separador('CONFIGURACIÓN GLOBAL');
  await col('configuracion').doc('main').set({ ...CONFIG_MAIN, updatedAt: TS() }, { merge: true });
  console.log('✅ /configuracion/main lista.');
}

async function seedSettings() {
  separador('SETTINGS (branding + tema)');

  await tenantRef.collection('settings').doc('general').set({
    nombre:      'Blood Habib',
    direccion:   'Calle Quinta 323, Viña del Mar',
    telefono:    '+56945701749',
    whatsapp:    '+56945701749',
    instagram:   '@bloodhabib.barbershop',
    logo:        '/bloodhabib/logo.webp',
    loginBanner: '/bloodhabib/banner.webp',
    emailAvisos: '',   // ⚠️ lo completa el dueño en Configuración
    horario:     HORARIO,
    features: {
      hasCourses:            false,
      hasChairRental:        false,
      hasAcademiaInternal:   false,
      hasMultiServiceSelect: false,
    },
    quienesSomos: {
      activo: true,
      texto:  'Ubicados en Viña del Mar, ven a conocer y vivir la experiencia Blood Habib. Agradeceremos tu puntualidad a la llegada de la cita, para poder atenderte con la mejor disposición. Si tienes alguna consulta, no dudes en dejarnos un mensaje por Instagram. ¡Gracias por tu preferencia!',
    },
    referralProgram: {
      enabled:     false,
      rewardText:  '¡Gana 1 sello gratis por cada amigo que se registre y agende su primera cita!',
      rewardType:  'stamp',
      rewardValue: 1,
      recompensaReferidor: null,
      recompensaReferido:  null,
    },
    updatedAt: TS(),
  }, { merge: true });

  // settings/theme — B&N monocromático (espejo de .tenant-bloodhabib en index.html).
  await tenantRef.collection('settings').doc('theme').set({
    colorBg:            '#080808',
    colorSurface:       '#101010',
    colorSurfaceAlt:    '#161616',
    colorPrimary:       '#e5e5e5',
    colorAccent:        '#bdbdbd',
    colorText:          '#f5f5f5',
    colorMuted:         '#9ca3af',
    colorBorder:        'rgba(229,229,229,0.22)',
    colorGlow:          'rgba(229,229,229,0.16)',
    colorButtonText:    '#080808',
    colorProgressTrack: 'rgba(229,229,229,0.10)',
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
    name:            'Blood Habib',
    shortName:       'Blood Habib',
    slogan:          'Barbería en Viña del Mar · Corte, barba y color',
    club:            'Club Blood Habib',
    address:         '📍 Calle Quinta 323 | Viña del Mar',
    scheduleText:    'Lun–Vie 10:00–20:00 · Sáb 10:00–18:00 · Domingo cerrado',
    phone:           '+56945701749',
    logoUrl:         '/bloodhabib/logo.webp',
    instagram:       'https://www.instagram.com/bloodhabib.barbershop',
    pageTitle:       'Blood Habib | Agenda tu hora en Viña del Mar',
    metaDescription: 'Reserva tu hora en Blood Habib. Cortes, perfilado de barba con paños calientes, color y limpieza facial en Calle Quinta 323, Viña del Mar.',
    updatedAt:       TS(),
  }, { merge: true });
  console.log('✅ /profile/main listo.');
}

async function seedSystem() {
  separador('_SYSTEM (activar tenant)');
  await db.doc(`_system/${TENANT_ID}`).set({ operativo: true, updatedAt: TS() }, { merge: true });
  console.log(`✅ _system/${TENANT_ID} { operativo: true } — tenant en línea.`);
}

// ── Main ────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║        Blood Habib (bloodhabib) — Seed           ║');
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
  console.log('   Pendientes manuales: dominio bloodhabib.synaptechspa.cl en Vercel,');
  console.log('   credenciales del dueño/equipo y correo de avisos.\n');
  process.exit(0);
}

seed().catch(err => {
  console.error('\n❌ Error durante el seed:', err.message);
  process.exit(1);
});
