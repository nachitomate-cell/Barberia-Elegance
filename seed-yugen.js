/**
 * seed-yugen.js — Inicialización Firestore para YŪGEN STUDIO
 *
 * Crea bajo tenants/yugen/:
 *   configuracion · barberos · premios · profile · settings/theme · settings/general
 *
 * Clon de seed-latincaribe.js. Identidad: dark mode, negro + madera + greige + dorado.
 *
 * ⚠️ PENDIENTE (no se siembra porque falta info del cliente):
 *   - Servicios y precios → se agregan en el panel o cuando los envíe.
 *   - Logo / banner → falta el archivo en alta resolución.
 *   - Recargo fuera de horario → no es función nativa (ver notas al operador).
 *   - Atención a domicilio → no es función nativa (ver notas al operador).
 *   - Hora de cierre del Domingo → placeholder 14:00 (confirmar).
 *   - Nombre del barbero/dueño, dirección, teléfono, Instagram → placeholders.
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

const TENANT_ID = 'yugen';
const tenantRef = db.collection('tenants').doc(TENANT_ID);
const col       = (name) => tenantRef.collection(name);

function separador(titulo) {
  console.log(`\n── ${titulo} ${'─'.repeat(Math.max(0, 50 - titulo.length))}`);
}

// ── Horario por día ────────────────────────────────────────────────────────────
// Lun–Vie 10:00–19:00 · Sáb 10:00–18:00 · Dom 10:00–14:00 (cierre por confirmar)
const HORARIO = {
  '1': { activo: true,  inicio: '10:00', fin: '19:00' },
  '2': { activo: true,  inicio: '10:00', fin: '19:00' },
  '3': { activo: true,  inicio: '10:00', fin: '19:00' },
  '4': { activo: true,  inicio: '10:00', fin: '19:00' },
  '5': { activo: true,  inicio: '10:00', fin: '19:00' },
  '6': { activo: true,  inicio: '10:00', fin: '18:00' },
  '0': { activo: true,  inicio: '10:00', fin: '14:00' }, // ⚠️ confirmar cierre domingo
};

const diasLaborales = Object.entries(HORARIO).filter(([, c]) => c.activo).map(([d]) => Number(d));
const diasConfig = {};
diasLaborales.forEach(d => { diasConfig[d] = { inicio: HORARIO[String(d)].inicio, fin: HORARIO[String(d)].fin }; });

const CONFIG = {
  horarioInicio:          '10:00',
  horarioFin:             '19:00',
  intervaloMinutos:       30,
  minutosLimiteReagendar: 720,        // 12 horas previas para reagendar
  diasLaborales,
  diasConfig,
  telefonoAdmin:          '56900000000', // ⚠️ placeholder
  diasBloqueados:         [],
  colacion:               null,
};

// ── Barbero / dueño (solo studio) ──────────────────────────────────────────────
const BARBEROS = [
  { id: 'yugen-prof-1', nombre: 'Yūgen', foto: null, disponible: true, activo: true, rol: 'profesional', orden: 0 },
];

// ── Premios del club (placeholder editable) ────────────────────────────────────
const PREMIOS = [
  { id: 'yugen-premio-1', nombre: 'Servicio Yūgen de cortesía', costoSellos: 10, activo: true },
];

// ── Servicios ───────────────────────────────────────────────────────────────────
const SERVICIOS = [
  // Barbería
  { id: 'srv-yg-01', nombre: 'Corte de Cabello',               precio: 15000, duracion: 60, categoria: 'Barbería', icono: 'ph-scissors', activo: true, orden: 0,
    descripcion: 'Vive la experiencia de un corte de cabello a otro nivel. Recibiendo el asesoramiento del profesional y renovando tu estilo.' },
  { id: 'srv-yg-02', nombre: 'Retoque y Perfilado de barba',   precio: 15000, duracion: 60, categoria: 'Barbería', icono: 'ph-mustache', activo: true, orden: 1,
    descripcion: 'Retocas tu barba a gusto o bajo asesoría de nuestros profesionales. Luego tu barba es perfilada y/o afeitada bajo tratamiento de toallas calientes y productos que protegen tu piel.' },
  { id: 'srv-yg-03', nombre: 'Limpieza Facial',                precio: 15000, duracion: 45, categoria: 'Barbería', icono: 'ph-sparkle', activo: true, orden: 2,
    descripcion: 'Tratamiento integral de tu rostro para rectificar y prevenir futuros problemas en tu piel. Productos de calidad y utilización de toallas calientes para garantizar una limpieza real.' },

  // Promociones
  { id: 'srv-yg-04', nombre: 'Corte + Barba',                            precio: 25000, duracion: 90,  categoria: 'Promociones', icono: 'ph-star',  activo: true, orden: 3 },
  { id: 'srv-yg-05', nombre: 'Corte + Limpieza Facial',                  precio: 25000, duracion: 90,  categoria: 'Promociones', icono: 'ph-star',  activo: true, orden: 4 },
  { id: 'srv-yg-06', nombre: 'Barba + Limpieza Facial',                  precio: 25000, duracion: 70,  categoria: 'Promociones', icono: 'ph-star',  activo: true, orden: 5 },
  { id: 'srv-yg-07', nombre: 'Full Corte + Barba + Limpieza Facial',     precio: 35000, duracion: 100, categoria: 'Promociones', icono: 'ph-crown', activo: true, orden: 6 },

  // Colorimetría y Tratamientos
  { id: 'srv-yg-08', nombre: 'Global Color', precio: 100000, duracion: 180, categoria: 'Colorimetría y Tratamientos', icono: 'ph-palette', activo: true, orden: 7,
    descripcion: 'Cambia tu estilo con un tinte completo de tu cabello. Incluye Corte de cabello y Limpieza facial.' },
  { id: 'srv-yg-09', nombre: 'Tratamiento semi permanente de Rizos u Ondulación', precio: 80000, duracion: 180, categoria: 'Colorimetría y Tratamientos', icono: 'ph-drop', activo: true, orden: 8,
    descripcion: 'Incluye corte de cabello + Limpieza Facial y Asesoría completa.' },
];

// ── Seed functions ──────────────────────────────────────────────────────────────
async function seedBarberos() {
  separador('PROFESIONAL');
  const batch = db.batch();
  for (const b of BARBEROS) {
    const { id, ...data } = b;
    const existing = await col('barberos').doc(id).get();
    const foto = (existing.exists ? existing.data().foto : null) || data.foto;
    batch.set(col('barberos').doc(id), { ...data, foto, creadoEn: TS() }, { merge: true });
    console.log(`  → ${data.nombre} (${data.rol})`);
  }
  await batch.commit();

  for (const b of BARBEROS) {
    await col('barberos').doc(b.id).collection('configuracion').doc('main').set(
      { ...CONFIG, updatedAt: TS() }, { merge: true },
    );
  }
  console.log(`✅ ${BARBEROS.length} profesional(es) con configuración de horario.`);
}

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

async function seedConfiguracion() {
  separador('CONFIGURACIÓN');
  await col('configuracion').doc('main').set({ ...CONFIG, productosActivos: true, updatedAt: TS() }, { merge: true });
  await col('config').doc('ui').set({ productosActivos: true, updatedAt: TS() }, { merge: true });
  console.log('✅ /configuracion/main y /config/ui listos.');
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
  console.log(`✅ ${PREMIOS.length} premio(s) creado(s).`);
}

async function seedProfileYSettings() {
  separador('PERFIL & TEMA');

  // Perfil público
  await col('profile').doc('main').set({
    name:            'Yūgen Studio',
    shortName:       'Yūgen',
    slogan:          'La profundidad que no se explica, se experimenta',
    club:            'Club Yūgen',
    address:         '',                       // ⚠️ pendiente
    scheduleText:    'Reagenda solo 1 vez, hasta 12 h antes · Tolerancia máx. 15 min',
    phone:           '',                       // ⚠️ pendiente
    logoUrl:         '/yugen/yugen.jpg',
    instagram:       '',                       // ⚠️ pendiente
    pageTitle:       'Agendar Hora | Yūgen Studio',
    metaDescription: 'Reserva tu hora en Yūgen Studio. Una experiencia personalizada que conecta contigo — más allá de lo visible.',
    politicas:       'Hola! Ya que has decidido agendar te invito a leer las políticas de Yūgen Studio. ' +
                     'Existe un máximo de 15 min de retraso permitido. Además solo se permite reagendar 1 vez ' +
                     'y hasta 12 horas previas a tu cita.',
    updatedAt:       TS(),
  }, { merge: true });

  // Tema — Dark mode: negro + madera + greige + dorado + blanco cálido
  await col('settings').doc('theme').set({
    colorBg:            '#0b0a09', // negro cálido
    colorSurface:       '#15120e',
    colorSurfaceAlt:    '#1f1a14', // madera oscura
    colorPrimary:       '#f5f3ef', // blanco (como el logo)
    colorAccent:        '#a9885f', // madera
    colorText:          '#f5f3ef', // blanco cálido
    colorMuted:         '#b7afa3', // greige
    colorBorder:        'rgba(245,243,239,0.16)', // blanco tenue
    colorGlow:          'rgba(245,243,239,0.18)',
    colorButtonText:    '#0b0a09',
    colorProgressTrack: '#1a1611',
    updatedAt:          TS(),
  }, { merge: true });

  // settings/general — requerido por el panel (info + horario + features)
  await col('settings').doc('general').set({
    nombre:    'Yūgen Studio',
    direccion: '',
    telefono:  '',
    whatsapp:  '',
    instagram: '',
    logo:      '/yugen/yugen.jpg',
    horario:   HORARIO,
    features: {
      hasCourses: false,
      hasChairRental: false,
      hasAcademiaInternal: false,
    },
    updatedAt: TS(),
  }, { merge: true });

  console.log('✅ /profile/main, /settings/theme y /settings/general listos.');
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function seed() {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║               YŪGEN STUDIO — Seed                ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`Proyecto: barberia-elegance  |  Tenant: ${TENANT_ID}\n`);

  await seedServicios();
  await seedConfiguracion();
  await seedBarberos();
  await seedPremios();
  await seedProfileYSettings();

  console.log('\n✅ Seed completado.');
  console.log('   ⚠️ Pendiente: servicios+precios, logo/banner, datos de contacto.');
  process.exit(0);
}

seed().catch(err => {
  console.error('\n❌ Error durante el seed:', err.message);
  process.exit(1);
});
