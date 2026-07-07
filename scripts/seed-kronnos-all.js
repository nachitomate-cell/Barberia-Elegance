'use strict';

/**
 * scripts/seed-kronnos-all.js
 * ─────────────────────────────────────────────────────────────────
 *  Seed unificado Kronnos (Camino 1.5) — ejecuta los 4 seeds via
 *  firebase-admin (sin browser), en orden:
 *
 *  1. MARCA (tenants/kronnos/): premios, rangos, descuentos, configuracion/canje.
 *  2. PEÑABLANCA (tenants/kronnos_penablanca/): 17 servicios + 3 barberos + config + anuncio.
 *  3. LIMACHE (tenants/kronnos_limache/): 9 servicios + 5 barberos + config + anuncio.
 *  4. WOMAN (tenants/kronnos_woman/): 36 servicios + 3 profesionales + config + anuncio.
 *
 *  Los seeds HTML (seed-kronnos-*.html) siguen existiendo para re-ejecucion
 *  manual desde browser si es necesario. Este script hace lo mismo desde CLI.
 *
 *  Uso:
 *    node scripts/seed-kronnos-all.js              # dry-run (default)
 *    node scripts/seed-kronnos-all.js --commit     # ejecuta
 *    node scripts/seed-kronnos-all.js --only=marca # solo una fase
 *
 *  Fases: marca | penablanca | limache | woman | all (default)
 * ─────────────────────────────────────────────────────────────────
 */

const path = require('path');
const fs   = require('fs');

const argv = process.argv.slice(2);
const commit = argv.includes('--commit');
const onlyArg = argv.find(a => a.startsWith('--only='));
const ONLY = onlyArg ? onlyArg.split('=')[1] : 'all';

const SERVICE_PATH = path.resolve(__dirname, '..', 'service-account.json');
if (!fs.existsSync(SERVICE_PATH)) {
  console.error(`ERROR: service-account no existe: ${SERVICE_PATH}`);
  process.exit(1);
}

const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.cert(require(SERVICE_PATH)) });
const db = admin.firestore();

// ── Helpers ──────────────────────────────────────────────────────
async function setDoc(path, data, opts = {}) {
  const line = `  ${opts.action || 'SET'} ${path}`;
  if (!commit) { console.log(`  [dry] ${line}`); return; }
  await db.doc(path).set(data, { merge: true });
  console.log(`  ✓ ${line}`);
}
async function addDoc(colPath, data) {
  if (!commit) { console.log(`  [dry] ADD ${colPath}/…`); return null; }
  const ref = await db.collection(colPath).add(data);
  console.log(`  ✓ ADD ${colPath}/${ref.id}`);
  return ref.id;
}
async function purgeCol(colPath) {
  if (!commit) { console.log(`  [dry] PURGE ${colPath}`); return; }
  const snap = await db.collection(colPath).get();
  if (!snap.size) return;
  const batch = db.batch();
  snap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
  console.log(`  ✓ PURGE ${colPath} (${snap.size} docs)`);
}

// Horarios
const H_BARBERIA = {
  '1': { activo: true,  inicio: '10:30', fin: '19:00', descansos: [] },
  '2': { activo: true,  inicio: '10:30', fin: '19:00', descansos: [] },
  '3': { activo: true,  inicio: '10:30', fin: '19:00', descansos: [] },
  '4': { activo: true,  inicio: '10:30', fin: '19:00', descansos: [] },
  '5': { activo: true,  inicio: '10:30', fin: '19:00', descansos: [] },
  '6': { activo: true,  inicio: '10:30', fin: '19:00', descansos: [] },
  '0': { activo: false, inicio: '10:30', fin: '19:00', descansos: [] },
};
const H_WOMAN = {
  '0': { activo: true, inicio: '09:30', fin: '23:00', descansos: [] },
  '1': { activo: true, inicio: '09:30', fin: '23:00', descansos: [] },
  '2': { activo: true, inicio: '09:30', fin: '23:00', descansos: [] },
  '3': { activo: true, inicio: '09:30', fin: '23:00', descansos: [] },
  '4': { activo: true, inicio: '09:30', fin: '23:00', descansos: [] },
  '5': { activo: true, inicio: '09:30', fin: '23:00', descansos: [] },
  '6': { activo: true, inicio: '09:30', fin: '23:00', descansos: [] },
};

// ── FASE 1: MARCA ────────────────────────────────────────────────
async function seedMarca() {
  console.log('\n═══ FASE 1: MARCA (tenants/kronnos/) ═══');
  const T = 'kronnos';

  console.log('\n── Premios (3 marca) ──');
  await purgeCol(`tenants/${T}/premios`);
  await addDoc(`tenants/${T}/premios`, {
    nombre: 'Descuento 30%',
    descripcion: '30% de descuento en cualquier servicio. Válido por 30 días.',
    costoSellos: 5, icono: 'ph-tag', activo: true,
    categoria: 'DESCUENTO', configuracion: { aplicaA: 'GLOBAL' }, scope: 'MARCA',
  });
  await addDoc(`tenants/${T}/premios`, {
    nombre: 'Servicio gratis',
    descripcion: 'Servicio gratis (hasta el valor del corte clásico). Se canjea en la sede donde tengas más sellos.',
    costoSellos: 10, icono: 'ph-scissors', activo: true,
    categoria: 'SERVICIO', scope: 'MARCA',
  });
  await addDoc(`tenants/${T}/premios`, {
    nombre: 'Pack premium',
    descripcion: 'Pack de toallas + corte + barba con valor diferenciado.',
    costoSellos: 15, icono: 'ph-crown', activo: true,
    categoria: 'SERVICIO', scope: 'MARCA',
  });

  console.log('\n── Rangos silver/gold/platinum ──');
  await setDoc(`tenants/${T}/configuracion/rangos`, {
    rangos: [
      { id: 'silver',   nombre: 'Silver',   serviciosParaAlcanzar: 0,  sellosPorVisita: 1, descuentoPorc: 0,  beneficios: ['Acceso al Club Kronnos.'] },
      { id: 'gold',     nombre: 'Gold',     serviciosParaAlcanzar: 10, sellosPorVisita: 2, descuentoPorc: 0,  beneficios: ['Doble sello en cada servicio.'] },
      { id: 'platinum', nombre: 'Platinum', serviciosParaAlcanzar: 25, sellosPorVisita: 2, descuentoPorc: 10, beneficios: ['Doble sello.', '10% descuento permanente en todos los servicios.'] },
    ],
    actualizadoEn: new Date().toISOString(),
  });

  console.log('\n── Descuentos globales (3) ──');
  await purgeCol(`tenants/${T}/descuentos`);
  await addDoc(`tenants/${T}/descuentos`, {
    nombre: 'Cumpleaños', cuandoAplica: 'Día del cumpleaños del cliente',
    porcentaje: 0.15, detalle: 'Aplicable a cualquier servicio en cualquier sede Kronnos.',
    scope: 'MARCA', activo: true,
  });
  await addDoc(`tenants/${T}/descuentos`, {
    nombre: 'Cliente nuevo', cuandoAplica: 'Primer servicio en Kronnos',
    porcentaje: 0.10, detalle: 'Sin cupo, válido en todas las sedes.',
    scope: 'MARCA', activo: true,
  });
  await addDoc(`tenants/${T}/descuentos`, {
    nombre: 'Lunes promocional', cuandoAplica: 'Todos los lunes',
    tipo: '2x1', detalle: 'En cortes masculinos básicos.',
    scope: 'MARCA', activo: true,
  });

  console.log('\n── Configuracion de canje ──');
  await setDoc(`tenants/${T}/configuracion/canje`, {
    canjeClienteEnabled: true,
    tiebreakEmpate: 'sede_actual',
    notas: 'Canje se ejecuta en sede predominante en sellos. Empate: sede donde el cliente pide canjearlo.',
    actualizadoEn: new Date().toISOString(),
  });
}

// ── FASE 2: PEÑABLANCA ───────────────────────────────────────────
async function seedPenablanca() {
  console.log('\n═══ FASE 2: PEÑABLANCA (tenants/kronnos_penablanca/) ═══');
  const T = 'kronnos_penablanca';
  const SEDE = 'penablanca';

  console.log('\n── Barberos (3) ──');
  await setDoc(`tenants/${T}/barberos/martin`, {
    nombre: 'Martin', activo: true, disponible: true, foto: null, horario: H_BARBERIA, sedes: [SEDE],
  });
  await setDoc(`tenants/${T}/barberos/evelyn-contreras`, {
    nombre: 'Evelyn Contreras', activo: true, disponible: true, foto: null, horario: H_BARBERIA,
    sedes: ['penablanca', 'limache'],
  });
  await setDoc(`tenants/${T}/barberos/araceli`, {
    nombre: 'Araceli', activo: true, disponible: true, foto: null, horario: H_BARBERIA, sedes: [SEDE],
  });

  console.log('\n── Configuracion general ──');
  await setDoc(`tenants/${T}/configuracion/main`, {
    horarioInicio: '10:30', horarioFin: '19:00', intervaloMinutos: 30,
    diasLaborales: [1, 2, 3, 4, 5, 6], telefonoAdmin: '', diasBloqueados: [],
    colacion: null, diasConfig: {}, sedeId: SEDE,
  });

  console.log('\n── Servicios (17) ──');
  const servs = [
    { id: 'pack-toallas-calientes', nombre: 'Pack Toallas Calientes',      categoria: 'PACKS KRONNOS',        duracion: 45,  precio: 24990, descripcion: 'Incluye corte de cabello y perfilado de barba con productos premium Viking, toallas caliente y fría, lavado de cabello y asesoramiento' },
    { id: 'corte-barba',            nombre: 'Corte y Barba',                categoria: 'Servicios Masculinos', duracion: 40,  precio: 18990, descripcion: 'Corte + perfilado de barba' },
    { id: 'corte-masculino',        nombre: 'Corte Masculino',              categoria: 'Servicios Masculinos', duracion: 45,  precio: 12990, descripcion: 'Incluye asesoría antes y después del corte, lavado de cabello y styling.' },
    { id: 'pack-full-kronnos',      nombre: 'Pack Full Kronnos',            categoria: 'PACKS KRONNOS',        duracion: 75,  precio: 35990, descripcion: 'Incluye corte de cabello, barba con toallas calientes, masaje craneal y aplicación de productos Premium Viking.' },
    { id: 'corte-dama',             nombre: 'Corte Dama',                   categoria: 'Servicios Femeninos',  duracion: 45,  precio: 14990, descripcion: 'Corte de cabello, con lavado revitalizante para un acabado perfecto' },
    { id: 'corte-escolar',          nombre: 'Corte Escolar',                categoria: 'Servicios Masculinos', duracion: 30,  precio: 11990, descripcion: 'Corte de cabello Clásico sin degradado' },
    { id: 'corte-bebe',             nombre: 'Corte Bebé 3 meses a 3 años',  categoria: 'Otro',                 duracion: 45,  precio: 14990, descripcion: 'Corte de especialidad, priorizado en el confort y cuidado del bebé, sin forzar.' },
    { id: 'corte-de-puntas',        nombre: 'Corte de Puntas',              categoria: 'Servicios Femeninos',  duracion: 20,  precio: 11990, descripcion: 'Revitaliza tu cabello con nuestro servicio de Corte de Puntas. En 20 min eliminamos las puntas dañadas.' },
    { id: 'barba-simple',           nombre: 'Barba Simple',                 categoria: 'Servicios Masculinos', duracion: 30,  precio: 10990, descripcion: 'Perfilado de barba con definición de contornos y ajuste de largo.' },
    { id: 'barba-premium',          nombre: 'Barba Premium',                categoria: 'Servicios Masculinos', duracion: 35,  precio: 13990, descripcion: 'Perfilado y afeitado de barba con toallas calientes para acabado premium.' },
    { id: 'corte-precision',        nombre: 'Corte de Precisión Masculino', categoria: 'Servicios Masculinos', duracion: 55,  precio: 16990, descripcion: 'Corte masculino con técnicas de precisión, acabado limpio y definido.' },
    { id: 'masaje-craneal',         nombre: 'Masaje Craneal',               categoria: 'Servicios Masculinos', duracion: 5,   precio: 10000, descripcion: '10 min de masaje craneal con exfoliación del cuero cabelludo y activación del folículo.' },
    { id: 'perfilado-cejas',        nombre: 'Perfilado de Cejas',           categoria: 'Servicios Masculinos', duracion: 10,  precio: 3000,  descripcion: 'Perfilado de cejas para definir su forma, acabado limpio y armonioso.' },
    { id: 'hidratacion-femenina',   nombre: 'Hidratación de Cabello Femenino', categoria: 'Servicios Femeninos', duracion: 30, precio: 10000, descripcion: 'Lavado de cabello con Shampoo de algas marinas con germen de trigo. Vitamina E.' },
    { id: 'total-restore',          nombre: 'Tratamiento Restaurador Total Restore', categoria: 'Servicios Femeninos', duracion: 30, precio: 15990, descripcion: 'Tratamiento restaurador para cabellos sensibilizados a base de Algas marinas y Keratina Vegetal.' },
    { id: 'algaterapia',            nombre: 'Algaterapia',                  categoria: 'Servicios Femeninos',  duracion: 130, precio: 35990, descripcion: 'Tratamiento capilar que fortalece, nutre y revitaliza el cabello desde la raíz.' },
    { id: 'corte-chasquilla',       nombre: 'Corte Chasquilla',             categoria: 'Servicios Femeninos',  duracion: 10,  precio: 4990,  descripcion: 'Corte de chasquilla para renovar tu estilo con acabado preciso.' },
  ];
  for (let i = 0; i < servs.length; i++) {
    const s = servs[i];
    await setDoc(`tenants/${T}/servicios/${s.id}`, {
      nombre: s.nombre, categoria: s.categoria, duracion: s.duracion, precio: s.precio,
      disponible: true, orden: i + 1, descripcion: s.descripcion, sedeId: SEDE,
    });
  }

  console.log('\n── Anuncio ──');
  await setDoc(`tenants/${T}/config/anuncio`, {
    titulo: 'Espacio unisex en Villa Alemana',
    descripcion: 'Barbería y estilismo profesional con más de 12 años de experiencia. Agenda tu hora online.',
    imagen: '', ctaTexto: 'Reservar ahora', ctaUrl: '/', activo: true,
    versionId: Date.now().toString(),
  });
}

// ── FASE 3: LIMACHE ──────────────────────────────────────────────
async function seedLimache() {
  console.log('\n═══ FASE 3: LIMACHE (tenants/kronnos_limache/) ═══');
  const T = 'kronnos_limache';
  const SEDE = 'limache';

  console.log('\n── Barberos (5) ──');
  await setDoc(`tenants/${T}/barberos/evelyn-contreras`, {
    nombre: 'Evelyn Contreras', activo: true, disponible: true, foto: null, horario: H_BARBERIA,
    sedes: ['penablanca', 'limache'],
  });
  for (const b of ['claudio', 'cristian-orostica', 'orlando-palacios', 'victor']) {
    const nombre = { claudio: 'Claudio', 'cristian-orostica': 'Cristian Orostica', 'orlando-palacios': 'Orlando Palacios', victor: 'Víctor' }[b];
    await setDoc(`tenants/${T}/barberos/${b}`, {
      nombre, activo: true, disponible: true, foto: null, horario: H_BARBERIA, sedes: [SEDE],
    });
  }

  console.log('\n── Configuracion general ──');
  await setDoc(`tenants/${T}/configuracion/main`, {
    horarioInicio: '10:30', horarioFin: '19:00', intervaloMinutos: 30,
    diasLaborales: [1, 2, 3, 4, 5, 6], telefonoAdmin: '', diasBloqueados: [],
    colacion: null, diasConfig: {}, sedeId: SEDE,
  });

  console.log('\n── Servicios (9) ──');
  const servs = [
    { id: 'pack-toallas-calientes', nombre: 'Pack Toallas Calientes',    categoria: 'PACKS KRONNOS',        duracion: 60, precio: 24990, descripcion: 'Incluye corte de cabello y perfilado de barba con productos premium Viking, toallas caliente y fría, lavado de cabello y asesoramiento' },
    { id: 'corte-masculino',        nombre: 'Corte Masculino',            categoria: 'Servicios Masculinos', duracion: 45, precio: 14990, descripcion: 'Incluye asesoría antes y después del corte, lavado de cabello y styling.' },
    { id: 'corte-barba',            nombre: 'Corte y Barba',              categoria: 'Servicios Masculinos', duracion: 60, precio: 20990, descripcion: 'Corte + perfilado de barba' },
    { id: 'precision-masculino',    nombre: 'Precisión Masculino',        categoria: 'Servicios Masculinos', duracion: 50, precio: 16990, descripcion: 'Corte masculino con técnicas de precisión.' },
    { id: 'corte-bebe',             nombre: 'Corte Bebé',                 categoria: 'Servicios Masculinos', duracion: 20, precio: 8990,  descripcion: 'Niños menores de 4 años.' },
    { id: 'corte-escolar',          nombre: 'Corte Escolar',              categoria: 'Servicios Masculinos', duracion: 30, precio: 12990, descripcion: 'Corte clásico sin degradado.' },
    { id: 'barba-simple',           nombre: 'Barba Simple',               categoria: 'Servicios Masculinos', duracion: 30, precio: 12990, descripcion: 'Perfilado de barba con definición de contornos.' },
    { id: 'barba-premium',          nombre: 'Barba Premium',              categoria: 'Servicios Masculinos', duracion: 35, precio: 15990, descripcion: 'Perfilado y afeitado con toallas calientes.' },
    { id: 'perfilado-ceja',         nombre: 'Perfilado Ceja',             categoria: 'Servicios Masculinos', duracion: 10, precio: 3000,  descripcion: 'Perfilado de cejas para definir su forma.' },
  ];
  for (let i = 0; i < servs.length; i++) {
    const s = servs[i];
    await setDoc(`tenants/${T}/servicios/${s.id}`, {
      nombre: s.nombre, categoria: s.categoria, duracion: s.duracion, precio: s.precio,
      disponible: true, orden: i + 1, descripcion: s.descripcion, sedeId: SEDE,
    });
  }

  console.log('\n── Anuncio ──');
  await setDoc(`tenants/${T}/config/anuncio`, {
    titulo: 'Espacio unisex en Limache',
    descripcion: 'Barbería y estilismo profesional con más de 12 años de experiencia. Agenda tu hora online.',
    imagen: '', ctaTexto: 'Reservar ahora', ctaUrl: '/', activo: true,
    versionId: Date.now().toString(),
  });
}

// ── FASE 4: WOMAN ────────────────────────────────────────────────
async function seedWoman() {
  console.log('\n═══ FASE 4: WOMAN (tenants/kronnos_woman/) ═══');
  const T = 'kronnos_woman';
  const SEDE = 'woman';

  console.log('\n── Profesionales (3) ──');
  await setDoc(`tenants/${T}/barberos/kelly`,   { nombre: 'Kelly',   activo: true, disponible: true, foto: null, horario: H_WOMAN, rol: 'manicurista', sedes: [SEDE] });
  await setDoc(`tenants/${T}/barberos/ernesto`, { nombre: 'Ernesto', activo: true, disponible: true, foto: null, horario: H_WOMAN, rol: 'estilista',   sedes: [SEDE] });
  await setDoc(`tenants/${T}/barberos/heydee`,  { nombre: 'Heydee',  activo: true, disponible: true, foto: null, horario: H_WOMAN, rol: 'estilista',   sedes: [SEDE] });

  console.log('\n── Configuracion general ──');
  await setDoc(`tenants/${T}/configuracion/main`, {
    horarioInicio: '09:30', horarioFin: '23:00', intervaloMinutos: 30,
    diasLaborales: [0, 1, 2, 3, 4, 5, 6], telefonoAdmin: '', diasBloqueados: [],
    colacion: null, diasConfig: {}, sedeId: SEDE,
  });

  console.log('\n── Servicios (36) ──');
  const servs = [
    { id: 'maquillaje-noche',                     nombre: 'Maquillaje Noche',                     categoria: 'Maquillaje', duracion: 60,  precio: 35000 },
    { id: 'masaje-corporal',                      nombre: 'Masaje Corporal',                      categoria: 'Masajes',    duracion: 70,  precio: 29990, descripcion: 'Masaje descontracturante' },
    { id: 'manicura-rusa',                        nombre: 'Manicura Rusa',                        categoria: 'Manicura',   duracion: 45,  precio: 15000, descripcion: 'Técnica E-File' },
    { id: 'laminado-ceja',                        nombre: 'Laminado de Ceja',                     categoria: 'Pestañas',   duracion: 40,  precio: 15000 },
    { id: 'masaje-brasil-cacao',                  nombre: 'Masaje Brasil Cacao (botox alisante)', categoria: 'Cabello',    duracion: 90,  precio: 20990 },
    { id: 'masaje-hidratacion-expres',            nombre: 'Masaje de Hidratación Express',        categoria: 'Cabello',    duracion: 60,  precio: 15000 },
    { id: 'depilacion-menton',                    nombre: 'Depilación del Mentón',                categoria: 'Otro',       duracion: 10,  precio: 2500 },
    { id: 'depilacion-media-espalda',             nombre: 'Depilación Media Espalda',             categoria: 'Otro',       duracion: 20,  precio: 6000 },
    { id: 'masaje-capilar-nanno-botox',           nombre: 'Masaje Capilar (Nano Botox)',          categoria: 'Otro',       duracion: 90,  precio: 26990 },
    { id: 'masaje-craneal',                       nombre: 'Masaje Craneal',                       categoria: 'Cabello',    duracion: 10,  precio: 2500 },
    { id: 'limpieza-manicura-basica',             nombre: 'Limpieza de Manicura Básica',          categoria: 'Manicura',   duracion: 60,  precio: 11000 },
    { id: 'depilacion-nuca',                      nombre: 'Depilación de Nuca',                   categoria: 'Otro',       duracion: 10,  precio: 5000 },
    { id: 'depilacion-espalda-completa',          nombre: 'Depilación Espalda Completa',          categoria: 'Otro',       duracion: 60,  precio: 10000 },
    { id: 'depilacion-medio-brazo',               nombre: 'Depilación de Medio Brazo',            categoria: 'Otro',       duracion: 20,  precio: 5500 },
    { id: 'polygel',                              nombre: 'Polygel',                              categoria: 'Manicura',   duracion: 155, precio: 35000 },
    { id: 'masaje-reductivo-3-sesiones',          nombre: 'Masaje Reductivo (3 sesiones)',        categoria: 'Masajes',    duracion: 60,  precio: 50000 },
    { id: 'bano-color',                           nombre: 'Baño Color',                           categoria: 'Cabello',    duracion: 120, precio: 30000 },
    { id: 'rebaje-largo',                         nombre: 'Rebaje Largo',                         categoria: 'Otro',       duracion: 30,  precio: 8000 },
    { id: 'global',                               nombre: 'Global',                               categoria: 'Otro',       duracion: 160, precio: 55000 },
    { id: 'corte-de-puntas',                      nombre: 'Corte de Puntas',                      categoria: 'Cabello',    duracion: 30,  precio: 8990 },
    { id: 'depilacion-frente',                    nombre: 'Depilación de Frente',                 categoria: 'Otro',       duracion: 15,  precio: 3500 },
    { id: 'depilacion-pierna-completa',           nombre: 'Depilación Pierna Completa',           categoria: 'Otro',       duracion: 35,  precio: 10000 },
    { id: 'corte-bob',                            nombre: 'Corte Bob',                            categoria: 'Cabello',    duracion: 60,  precio: 20990 },
    { id: 'bloque-fantasia',                      nombre: 'Bloque de Fantasía',                   categoria: 'Cabello',    duracion: 240, precio: 55000 },
    { id: 'depilacion-mejillas',                  nombre: 'Depilación de Mejillas',               categoria: 'Otro',       duracion: 10,  precio: 3500 },
    { id: 'rebaje-completo',                      nombre: 'Rebaje Completo',                      categoria: 'Otro',       duracion: 30,  precio: 15000 },
    { id: 'masaje-reductivo-9-sesiones',          nombre: 'Masaje Reductivo (9 sesiones)',        categoria: 'Masajes',    duracion: 240, precio: 120000 },
    { id: 'mechas',                               nombre: 'Mechas',                               categoria: 'Cabello',    duracion: 10,  precio: 50000 },
    { id: 'embellecimiento-pie-spa-esmaltado',    nombre: 'Embellecimiento de Pie con Spa + Esmaltado', categoria: 'Manicura', duracion: 120, precio: 25990 },
    { id: 'depilacion-abdomen-completo',          nombre: 'Depilación Abdomen Completo',          categoria: 'Otro',       duracion: 30,  precio: 8000 },
    { id: 'corte-bordado',                        nombre: 'Corte Bordado',                        categoria: 'Cabello',    duracion: 60,  precio: 22990 },
    { id: 'babylights',                           nombre: 'Babylights',                           categoria: 'Cabello',    duracion: 240, precio: 60000 },
    { id: 'depilacion-brazo-completa',            nombre: 'Depilación de Brazo Completa',         categoria: 'Otro',       duracion: 20,  precio: 8000 },
    { id: 'retiro-esmaltado-permanente',          nombre: 'Retiro Esmaltado Permanente',          categoria: 'Manicura',   duracion: 35,  precio: 6000 },
    { id: 'retiro-kapping-gel',                   nombre: 'Retiro Kapping Gel',                   categoria: 'Manicura',   duracion: 30,  precio: 8000 },
    { id: 'aplicacion-tintura',                   nombre: 'Aplicación de Tintura',                categoria: 'Cabello',    duracion: 60,  precio: 18000 },
  ];
  for (let i = 0; i < servs.length; i++) {
    const s = servs[i];
    await setDoc(`tenants/${T}/servicios/${s.id}`, {
      nombre: s.nombre, categoria: s.categoria, duracion: s.duracion, precio: s.precio,
      disponible: true, orden: i + 1, descripcion: s.descripcion || '', sedeId: SEDE,
    });
  }

  console.log('\n── Anuncio ──');
  await setDoc(`tenants/${T}/config/anuncio`, {
    titulo: 'Belleza y estética en Limache',
    descripcion: 'Espacio de belleza con más de 12 años de experiencia. Manicura, cabello, masajes y más.',
    imagen: '', ctaTexto: 'Reservar ahora', ctaUrl: '/', activo: true,
    versionId: Date.now().toString(),
  });
}

// ── Main ─────────────────────────────────────────────────────────
(async () => {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`SEED KRONNOS ALL — modo: ${commit ? '🔴 COMMIT' : '🟢 DRY-RUN'} — fase: ${ONLY}`);
  console.log('═══════════════════════════════════════════════════════════');

  const t0 = Date.now();
  try {
    if (ONLY === 'all' || ONLY === 'marca')       await seedMarca();
    if (ONLY === 'all' || ONLY === 'penablanca') await seedPenablanca();
    if (ONLY === 'all' || ONLY === 'limache')    await seedLimache();
    if (ONLY === 'all' || ONLY === 'woman')      await seedWoman();
    console.log(`\n✅ Seed completado en ${((Date.now() - t0) / 1000).toFixed(1)}s.`);
    if (!commit) console.log('🟢 Dry-run: sin escritura. Usa --commit para persistir.\n');
  } catch (e) {
    console.error(`\n❌ Error:`, e.message);
    process.exit(1);
  }
  process.exit(0);
})();
