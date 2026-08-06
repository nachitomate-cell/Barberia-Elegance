/**
 * seed-clinicalglow.js — Inicialización Firestore para Clinical Glow
 *   (clínica estética facial · Viña del Mar)
 *
 * Perfil: instagram.com/clinical___glow · WhatsApp +56 9 4924 4594
 * Rubro: estética facial (BeautySalon) — 1er tenant no-barbería en el
 * schema, sobre los mismos rieles que los locales de peluquería.
 *
 * Crea bajo tenants/clinicalglow/:
 *   servicios · barberos · configuracion/{main,whatsapp} · premios ·
 *   profile · settings/{theme,general}
 * Y a nivel plataforma:
 *   _system/clinicalglow (estado + plan)
 *   _billing/clinicalglow (mensualidad $29.990 neto, sin bolsa WA)
 *
 * ⚠️ Servicios, precios, horarios y nombre de la profesional son PLACEHOLDER
 * — reemplazar cuando ella los confirme. El chip WhatsApp también queda por
 * asignar (instancia Evolution nueva).
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

const TENANT_ID    = 'clinicalglow';
const TENANT_NAME  = 'Clinical Glow';
const EMAIL_COBRO  = 'ignaciiio.mate@gmail.com'; // provisional — reemplazar con el mail real de la dueña
const MONTO_NETO   = 29990;                       // + IVA se factura al cobrar (mensualidad-mp.js)

const tenantRef = db.collection('tenants').doc(TENANT_ID);
const col       = (name) => tenantRef.collection(name);

function separador(titulo) {
  console.log(`\n── ${titulo} ${'─'.repeat(50 - titulo.length)}`);
}

// ── Servicios ────────────────────────────────────────────────────────────────
// Los 8 tratamientos que la profesional destaca en su Instagram. Precios y
// duraciones son referenciales de mercado estético en Chile — CONFIRMAR con
// la dueña antes del go-live real.
const SERVICIOS = [
  {
    id: 'srv-cg-01',
    nombre: 'Toxina Botulínica (Botox)',
    descripcion: 'Aplicación de toxina botulínica en zonas de expresión (frente, entrecejo, patas de gallo). Reduce arrugas dinámicas con resultado natural. Duración 4–6 meses.',
    precio: 150000, duracion: 45, categoria: 'Facial', icono: 'ph-syringe', activo: true, orden: 0,
  },
  {
    id: 'srv-cg-02',
    nombre: 'Ácido Hialurónico Labios (Hidralips)',
    descripcion: 'Hidratación profunda y perfilado sutil de labios con ácido hialurónico. Resultado natural, sin exceso de volumen. Duración 6–9 meses.',
    precio: 180000, duracion: 45, categoria: 'Facial', icono: 'ph-drop', activo: true, orden: 1,
  },
  {
    id: 'srv-cg-03',
    nombre: 'Rejuvenecimiento de Ojeras',
    descripcion: 'Tratamiento para el surco lagrimal y ojeras con ácido hialurónico específico para zona ocular. Rellena y disimula bolsas leves.',
    precio: 220000, duracion: 45, categoria: 'Facial', icono: 'ph-eye', activo: true, orden: 2,
  },
  {
    id: 'srv-cg-04',
    nombre: 'Bioestimulador Facial',
    descripcion: 'Estimula la producción natural de colágeno para mejorar firmeza y calidad de la piel. Ideal para prevención y rejuvenecimiento estructural.',
    precio: 280000, duracion: 60, categoria: 'Facial', icono: 'ph-sparkle', activo: true, orden: 3,
  },
  {
    id: 'srv-cg-05',
    nombre: 'Reducción de Papada',
    descripcion: 'Tratamiento inyectable para reducir grasa localizada en la papada y definir el contorno del cuello. Protocolo de 2 a 4 sesiones.',
    precio: 200000, duracion: 45, categoria: 'Facial', icono: 'ph-triangle', activo: true, orden: 4,
  },
  {
    id: 'srv-cg-06',
    nombre: 'PRP + Exosomas',
    descripcion: 'Plasma rico en plaquetas potenciado con exosomas para rejuvenecimiento facial profundo, mejora de calidad de piel y luminosidad.',
    precio: 250000, duracion: 60, categoria: 'Facial', icono: 'ph-flask', activo: true, orden: 5,
  },
  {
    id: 'srv-cg-07',
    nombre: 'Mesoterapia Capilar',
    descripcion: 'Inyecciones capilares con vitaminas y factores de crecimiento para estimular el crecimiento del cabello y frenar la caída.',
    precio: 80000, duracion: 40, categoria: 'Capilar', icono: 'ph-flower', activo: true, orden: 6,
  },
  {
    id: 'srv-cg-08',
    nombre: 'Tratamiento Corporal',
    descripcion: 'Protocolo corporal reductivo/reafirmante (a definir según objetivo del cliente en la consulta).',
    precio: 60000, duracion: 45, categoria: 'Corporal', icono: 'ph-heart', activo: true, orden: 7,
  },
];

// ── Horario del local ────────────────────────────────────────────────────────
// PLACEHOLDER — confirmar horarios reales con la profesional.
const CONFIG = {
  horarioInicio:           '10:00',
  horarioFin:              '19:00',
  intervaloMinutos:             30,
  minutosLimiteReagendar:      240, // 4h de anticipación mínima (procedimientos requieren logística)
  diasLaborales:    [1, 2, 3, 4, 5, 6], // Lun–Sáb
  telefonoAdmin:    '+56949244594',
  diasBloqueados:   [],
  colacion:         null,
  diasConfig: {
    6: { inicio: '10:00', fin: '14:00' }, // Sábado media jornada
  },
};

// ── Configuración WhatsApp (bot IA acotado) ──────────────────────────────────
// El bot corre sobre bot-oficial.js / evolution/cerebro.js. Su system prompt
// ya incluye la regla "tu único trabajo es informar y agendar/gestionar citas".
// La restricción adicional viaja en `politicaMensaje`, que cerebro.js concatena
// al bloque POLÍTICAS DEL LOCAL del system.
const CONFIG_WA = {
  nombreAgente:   'Glow',
  estiloChileno:  false, // español neutro (doctrina de copy externo)
  chatCancelEnabled: false, // cancelaciones se derivan al equipo humano
  minutosLimiteReagendar: 240,
  politicaMensaje: [
    'Solo respondes tres cosas: 1) horarios de atención, 2) servicios y sus precios, y 3) ayudar a agendar hora.',
    'Cualquier consulta médica, sobre indicaciones post-tratamiento, contraindicaciones, medicamentos, resultados esperados, cuidados o cotizaciones especiales debe pasar SIEMPRE con el equipo humano — usa pasar_con_humano de inmediato con un mensaje corto y cálido.',
    'JAMÁS des recomendaciones médicas ni estimes tiempos de recuperación: la profesional a cargo es enfermera estética y solo ella puede indicar tratamientos.',
    'Al confirmar una hora, recuerda que los tratamientos son procedimientos estéticos y sugiere llegar 10 minutos antes.',
  ].join('\n'),
};

// ── Profesionales ────────────────────────────────────────────────────────────
// 1 profesional (enfermera estética). Nombre real por confirmar — se deja
// "Enfermera Estética" para no publicar un nombre incorrecto.
const BARBEROS = [
  {
    id: 'cg-profesional-01',
    nombre: 'Enfermera Estética',
    foto: null,
    especialidad: 'Enfermera estética · +8 años de experiencia',
    disponible: true, activo: true, rol: 'jefe', orden: 0,
    config: {}, // hereda el horario del local
  },
];

// ── Premios del club ─────────────────────────────────────────────────────────
// Placeholder — la dueña puede reemplazarlos desde el panel.
const PREMIOS = [
  { id: 'cg-premio-1', nombre: 'Sesión de Mesoterapia Capilar de regalo',    costoSellos: 10, activo: true },
  { id: 'cg-premio-2', nombre: '20% dcto en tu próximo tratamiento facial',   costoSellos: 6,  activo: true },
];

// ── Seed functions ───────────────────────────────────────────────────────────
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
  separador('PROFESIONALES');
  const batch = db.batch();
  for (const b of BARBEROS) {
    const { id, config: _cfg, ...data } = b;
    batch.set(col('barberos').doc(id), { ...data, creadoEn: TS() }, { merge: true });
    console.log(`  → ${data.nombre} (${data.rol})`);
  }
  await batch.commit();
  for (const b of BARBEROS) {
    await col('barberos').doc(b.id).collection('configuracion').doc('main').set({
      ...CONFIG,
      ...(b.config || {}),
      updatedAt: TS(),
    }, { merge: true });
  }
  console.log(`✅ ${BARBEROS.length} profesional(es) creado(s) con configuración.`);
}

async function seedConfiguracion() {
  separador('CONFIGURACIÓN + WHATSAPP');
  await col('configuracion').doc('main').set({ ...CONFIG, updatedAt: TS() }, { merge: true });
  console.log('  → /configuracion/main');

  await col('configuracion').doc('whatsapp').set({ ...CONFIG_WA, updatedAt: TS() }, { merge: true });
  console.log('  → /configuracion/whatsapp (bot acotado)');
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
  await tenantRef.set({
    nombre:    TENANT_NAME,
    telefono:  '+56949244594',
    direccion: 'Viña del Mar',
    creadoEn:  TS(),
  }, { merge: true });

  await tenantRef.collection('profile').doc('main').set({
    name:            'Clinical Glow · Clínica Estética',
    shortName:       'Clinical Glow',
    slogan:          'Resultados naturales y visibles',
    club:            'Club Clinical Glow',
    address:         'Viña del Mar',
    scheduleText:    'Lun–Vie: 10–19h · Sáb: 10–14h · Dom: cerrado',
    phone:           '+56949244594',
    email:           '',
    logoUrl:         '/clinicalglow/logo.png',
    pageTitle:       'Clinical Glow · Clínica Estética | Agenda tu hora en Viña del Mar',
    metaDescription: 'Reserva tu hora en Clinical Glow, clínica de estética facial y corporal en Viña del Mar. Enfermera estética con más de 8 años de experiencia.',
    instagram:       'https://www.instagram.com/clinical___glow/',
    updatedAt:       TS(),
  }, { merge: true });

  await tenantRef.collection('settings').doc('theme').set({
    colorBg:            '#fdf7f4',
    colorSurface:       '#ffffff',
    colorSurfaceAlt:    '#f7ede7',
    colorPrimary:       '#d4a574',
    colorAccent:        '#c9899b',
    colorText:          '#3d2f2b',
    colorMuted:         '#8a7570',
    colorBorder:        'rgba(212,165,116,0.18)',
    colorGlow:          'rgba(201,137,155,0.10)',
    colorButtonText:    '#ffffff',
    colorProgressTrack: 'rgba(212,165,116,0.14)',
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

  console.log('✅ /tenants/clinicalglow doc raíz + profile + theme + general listos.');
}

async function seedPlataforma() {
  separador('_system + _billing');

  await db.collection('_system').doc(TENANT_ID).set({
    status:       'active',
    plan:         'individual',
    origen:       'seed-clinicalglow',
    tenantNombre: TENANT_NAME,
    // Bot IA acotado — sin bolsa de mensajes Meta (no se activa planCliente ni
    // planRecordatorio). El local paga por uso REAL de tokens del bot.
    emailAlertaStock: null,
    creadoEn:     TS(),
    updatedAt:    TS(),
  }, { merge: true });
  console.log('  → _system/clinicalglow (plan=individual, sin bolsa WA)');

  // Fecha próximo pago = hoy + 30 días (formato YYYY-MM-DD, TZ Santiago).
  const hoy = new Date();
  hoy.setDate(hoy.getDate() + 30);
  const fpp = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(hoy);

  await db.collection('_billing').doc(TENANT_ID).set({
    estadoPago:      'al_dia',
    montoPendiente:  MONTO_NETO,          // neto — el +19% IVA lo suma el cobro
    plan:            'Individual · Estética · con IA acotada',
    fechaProximoPago: fpp,
    emailCobro:      EMAIL_COBRO,
    creadoEn:        TS(),
    updatedAt:       TS(),
  }, { merge: true });
  console.log(`  → _billing/clinicalglow ($${MONTO_NETO.toLocaleString('es-CL')} + IVA · vence ${fpp})`);
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function seed() {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║   Clinical Glow · Clínica Estética · Seed        ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`Proyecto: barberia-elegance  |  Tenant: ${TENANT_ID}\n`);

  await seedServicios();
  await seedBarberos();
  await seedConfiguracion();
  await seedPremios();
  await seedProfile();
  await seedPlataforma();

  console.log('\n✅ Seed completado con éxito.\n');
  console.log('⚠️  Pendientes humanos:');
  console.log('   · Reemplazar "Enfermera Estética" con el nombre real de la profesional');
  console.log('   · Confirmar precios/duraciones de los 8 servicios placeholder');
  console.log('   · Confirmar horario real (hoy: Lun–Vie 10–19h · Sáb 10–14h)');
  console.log('   · Reemplazar EMAIL_COBRO (hoy: ignaciiio.mate — cambiar por el mail real)');
  console.log('   · Reemplazar logo/banner/og placeholders en /clinicalglow/ con assets oficiales');
  console.log('   · Provisionar instancia Evolution "instance_clinicalglow" en wa.synaptechspa.cl y linkear QR con +56949244594');
  console.log('   · Crear cuenta admin para la dueña (auth) y setear claim { role: "admin", tenantId: "clinicalglow" }');
  console.log('   · Generar link de autopay MP con waSuscripcionCrearLink cuando ella quiera activarlo\n');
  process.exit(0);
}

seed().catch(err => {
  console.error('\n❌ Error durante el seed:', err.message);
  process.exit(1);
});
