'use strict';

// functions/chat-horas-disponibles.js
// ─────────────────────────────────────────────────────────────────
//  DISPONIBILIDAD PARA EL CHAT — callable `chatHorasDisponibles`
//
//  Responde la pregunta nº1 de los clientes en /chat: "¿tienes hora?".
//  Calcula server-side los slots libres del día (o del primer día con
//  cupos dentro de los próximos 4) y el bot los muestra con un CTA a
//  la reserva. Reutilizable a futuro por el bot de WhatsApp.
//
//  Un slot está libre si existe AL MENOS UN barbero elegible sin
//  cita/slotLock/bloqueo en ese rango Y dentro de SU jornada personal.
//
//  Ocupación considerada: citas del día (estado ≠ Cancelada/NoAsistio),
//  slotLocks, bloqueos (por barbero o globales, parciales o día completo),
//  colación global, horario del día del local (diasConfig > horario base)
//  y — desde 2026-07-22 — la JORNADA PERSONAL de cada barbero: día libre,
//  horas de entrada/salida propias, descansos y colación individual
//  (barbero.horario del doc > barberos/{id}/configuracion/main). Antes el
//  bot de WhatsApp agendó con una barbera en su día libre (caso Araceli,
//  Kronnos) porque esto no se modelaba.
//
//  DEPLOY:
//    firebase deploy --only functions:chatHorasDisponibles
// ─────────────────────────────────────────────────────────────────

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger }             = require('firebase-functions');
const admin                  = require('firebase-admin');

const db = admin.firestore();

const MAX_DIAS_BUSQUEDA = 4;   // hoy + 3
const MARGEN_HOY_MIN    = 20;  // no ofrecer slots que empiezan en <20 min
const MAX_SLOTS         = 12;
const DUR_FALLBACK      = 30;  // local sin catálogo cargado

function cols(tid) {
  const root = tid === 'elegance';
  const base = root ? null : db.collection('tenants').doc(tid);
  return {
    conf:      root ? db.collection('configuracion').doc('main') : base.collection('configuracion').doc('main'),
    barberos:  root ? db.collection('barberos') : base.collection('barberos'),
    citas:     root ? db.collection('citas')    : base.collection('citas'),
    locks:     root ? db.collection('slotLocks') : base.collection('slotLocks'),
    bloqueos:  root ? db.collection('bloqueos')  : base.collection('bloqueos'),
    servicios: root ? db.collection('servicios') : base.collection('servicios'),
  };
}

/**
 * Duración con la que se calculan las horas cuando el cliente TODAVÍA no dijo
 * qué servicio quiere: la MEDIANA del catálogo activo, con piso en el paso de
 * la grilla. Se autoajusta por tenant — 45 min en una barbería, 60 en un spa.
 *
 * Antes se caía al paso de la grilla (`intervaloMinutos`), que en varios
 * locales es 15: se ofrecían huecos de 15 min donde no cabe ningún servicio
 * real. Pasó el 1-ago en kronnos_penablanca — el chat ofreció las 12:00 con
 * Araceli y Evelyn, que solo tenían el hueco 12:00–12:15 entre dos cortes,
 * y el cliente no pudo reservar ("la página web tiene un error").
 *
 * Mediana y no la MODA: un catálogo con muchos tratamientos largos la dispara
 * (latincaribe 240, omega 300, yugen 180) y el chat dejaría de ofrecer horas
 * que sí existen. Contrastado contra lo que de verdad se reserva en cada
 * local (moda de las últimas 150 citas), la mediana acierta o queda a un
 * paso: penablanca 45/45, oren 45/45, aura 60/60, sion 35/40, yugen 70/60.
 *
 * El piso en `step` la vuelve monótona: nunca ofrece MÁS horas que antes, solo
 * deja de ofrecer las que no eran reservables (renacer tenía mediana 15).
 */
async function duracionTipica(tenantId) {
  try {
    const c = cols(tenantId);
    const [svcSnap, confSnap] = await Promise.all([c.servicios.get(), c.conf.get()]);
    const step = Number((confSnap.exists ? confSnap.data() : {}).intervaloMinutos) || 30;
    const durs = [];
    svcSnap.forEach(d => {
      const s = d.data() || {};
      if (s.activo === false) return;
      const dur = Number(s.duracion || s.duracionServicio) || 0;
      if (dur > 0) durs.push(dur);
    });
    if (!durs.length) return Math.max(DUR_FALLBACK, step);
    durs.sort((a, b) => a - b);
    return Math.max(durs[Math.floor(durs.length / 2)], step);
  } catch (e) {
    logger.warn(`[chatHoras] duracionTipica ${tenantId}: ${e.message}`);
    return DUR_FALLBACK;
  }
}

const toMins = (t) => {
  const [h, m] = String(t || '').split(':').map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
};
const toHHMM = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

/** Minutos de una HORA DE CIERRE. Igual que toMins salvo por medianoche:
 *  "00:00" como fin significa "cierro a las 12 de la noche", no "cierro en el
 *  minuto cero". Con toMins a secas la jornada quedaba invertida y el motor la
 *  leía como día libre: estudioluxury tenía a Matías —su único profesional— con
 *  08:00–00:00 los siete días y el bot ofrecía CERO horas, todos los días. */
const toMinsFin = (t) => {
  const m = toMins(t);
  return m === 0 ? 1440 : m;
};

/** Fecha (YYYY-MM-DD), minutos del día y hora HH:MM actuales en Chile.
 *  `hhmm` existe para los prompts: el bot debe RECIBIR la hora, nunca deducirla. */
function ahoraChile() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Santiago',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(new Date()).map(p => [p.type, p.value]),
  );
  // Intl puede devolver hour '24' a medianoche — normalizamos.
  const hh = Number(parts.hour) % 24;
  return {
    fecha: `${parts.year}-${parts.month}-${parts.day}`,
    mins:  hh * 60 + Number(parts.minute),
    hhmm:  `${String(hh).padStart(2, '0')}:${parts.minute}`,
  };
}

function sumarDias(fechaStr, n) {
  const [y, m, d] = fechaStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
function dowDe(fechaStr) {
  const [y, m, d] = fechaStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Dom … 6=Sáb
}

const solapan = (aIni, aFin, bIni, bFin) => aIni < bFin && bIni < aFin;

/* ── Jornada personal del barbero ─────────────────────────────────
   Resuelve el día `dow` del barbero con la MISMA prioridad que el cliente
   (getHorasDisponiblesMulti en firebaseUtils): `horario` del doc del barbero
   > configuracion/main del barbero (horario | diasConfig) > horario del local.
   Devuelve rangos OCUPADOS [ini,fin) que representan su indisponibilidad:
   día libre → todo el día; jornada propia → fuera de [entrada, salida);
   descansos y colación personal → sus tramos. */
function rangosFueraDeJornada({ docHorario, cfgPersonal, dow }) {
  const out = [];
  const push = (a, b) => { if (b > a) out.push([a, b]); };
  const descansosDe = (day) => (Array.isArray(day && day.descansos) ? day.descansos : [])
    .filter(x => x && x.inicio && x.fin)
    .map(x => [toMins(x.inicio), toMins(x.fin)]);

  const cfg = cfgPersonal || {};
  const h   = docHorario || cfg.horario || null;
  let day   = h ? (h[dow] ?? h[String(dow)]) : null;
  let viaHorario = !!day;
  if (!day && cfg.diasConfig) day = cfg.diasConfig[dow] ?? cfg.diasConfig[String(dow)] ?? null;

  if (day) {
    // Día libre: en el esquema `horario` el día debe estar activo (mismo
    // criterio que el cliente: `if (!dayH.activo) continue`); en diasConfig
    // solo un activo === false explícito lo apaga.
    const libre = viaHorario ? day.activo !== true : day.activo === false;
    if (libre) { push(0, 1440); return out; }
    const ini = toMins(day.inicio || cfg.horarioInicio || '00:00');
    const fin = toMinsFin(day.fin || cfg.horarioFin    || '24:00');
    push(0, ini);
    push(fin, 1440);
    descansosDe(day).forEach(([a, b]) => push(a, b));
  } else if (cfg.horarioInicio || cfg.horarioFin) {
    // Sin config del día pero con jornada base propia.
    push(0, toMins(cfg.horarioInicio || '00:00'));
    push(toMinsFin(cfg.horarioFin || '24:00'), 1440);
  }

  // Colación personal (la que muestra la Pizarra) también bloquea.
  if (cfg.colacion && cfg.colacion.inicio && cfg.colacion.fin) {
    push(toMins(cfg.colacion.inicio), toMins(cfg.colacion.fin));
  }
  return out;
}

/** Carga configuracion/main de cada barbero y vuelca su jornada al mapa busy. */
async function aplicarJornadasPersonales(c, barberos, dow, addBusy) {
  const cfgs = await Promise.all(barberos.map(b =>
    c.barberos.doc(b.id).collection('configuracion').doc('main').get().catch(() => null)));
  barberos.forEach((b, i) => {
    const cfgPersonal = cfgs[i] && cfgs[i].exists ? cfgs[i].data() : null;
    rangosFueraDeJornada({ docHorario: b.docHorario, cfgPersonal, dow })
      .forEach(([a, z]) => addBusy(b.id, a, z));
  });
}

/** Elegibilidad para atender: la MISMA regla que la reserva pública.
 *  Vive suelta porque la usan las tres entradas (horasParaFecha,
 *  barberoLibreParaSlot, atiendeEseDia) y una copia que se desincronice
 *  significa ofrecer horas de alguien que no puede tomarlas. */
function esElegible(b, tenantId, servicioId = null) {
  if (b._mainDocId) return false;
  if (b.disponible === false || b.activo === false) return false;
  if (b.rol === 'admin' && b.mostrarEnAgenda !== true && tenantId !== 'delnero') return false;
  // ¿Realiza ESE servicio? Misma convención que el panel y la reserva pública:
  // `serviciosIds` vacío o ausente = los hace todos.
  //
  // Sin esto el bot ofrecía y agendaba con quien no puede atender: en
  // kronnos_woman le dio a Ernesto dos "Retoque de Raíces" (05-08), servicio
  // que no está en sus 13 habilitados. El cliente llega y nadie puede hacerlo.
  if (servicioId && Array.isArray(b.serviciosIds) && b.serviciosIds.length
      && !b.serviciosIds.map(String).includes(String(servicioId))) return false;
  return true;
}

/** Slots libres de UN día. Exportada para tests locales con Admin SDK.
 *
 *  @param {object} [opts]
 *  @param {string} [opts.barberoId] Calcula las horas de ESE profesional y de
 *    nadie más. Sin él un slot está libre si CUALQUIER barbero puede tomarlo,
 *    que es lo correcto para "¿tienen hora?" pero una mentira para "¿tiene
 *    hora Claudio?": el 03-08 el bot ofreció a un cliente las horas de Orlando
 *    como si fueran de Claudio, que ese lunes tenía día libre.
 */
async function horasParaFecha(tenantId, fechaStr, minMinuto = 0, durMin = null, opts = {}) {
  const { barberoId = null, servicioId = null, personas = 1 } = opts || {};
  const c = cols(tenantId);

  const confSnap = await c.conf.get();
  const conf = confSnap.exists ? (confSnap.data() || {}) : {};

  // ── Día laboral / bloqueado ──
  const dow = dowDe(fechaStr);
  const diasLaborales = Array.isArray(conf.diasLaborales) ? conf.diasLaborales : [1, 2, 3, 4, 5, 6];
  if (!diasLaborales.map(Number).includes(dow)) return [];
  if (Array.isArray(conf.diasBloqueados) && conf.diasBloqueados.includes(fechaStr)) return [];

  // ── Rango horario del día (diasConfig pisa el horario base) ──
  const dc = conf.diasConfig || {};
  const dia = dc[dow] ?? dc[String(dow)] ?? null;
  if (dia && dia.activo === false) return [];
  const iniMins  = toMins((dia && dia.inicio) || conf.horarioInicio || '09:00');
  const finMins  = toMinsFin((dia && dia.fin) || conf.horarioFin    || '20:00');
  const step     = Number(conf.intervaloMinutos) || 30;
  if (finMins <= iniMins || step <= 0) return [];

  const colacion = conf.colacion && conf.colacion.inicio && conf.colacion.fin
    ? [toMins(conf.colacion.inicio), toMins(conf.colacion.fin)]
    : null;

  // ── Barberos elegibles (misma regla que la reserva pública) ──
  const nPersonas = Math.max(1, Number(personas) || 1);
  const barbSnap = await c.barberos.get();
  const barberos = [];
  barbSnap.forEach(d => {
    const b = d.data();
    if (!esElegible(b, tenantId, servicioId)) return;
    // Con profesional pedido Y VARIAS personas, el resto del equipo se queda
    // en la lista: "con Evelyn, para adulto y niño" necesita a Evelyn libre Y
    // a un segundo profesional libre a la misma hora. Filtrar aquí dejaba la
    // lista en 1 y `nLibres >= 2` era imposible por construcción: el bot
    // respondió "Evelyn no tiene cupos en los próximos días" con su agenda
    // abierta y las 16:00 libres (kronnos_penablanca, 07-08).
    if (barberoId && nPersonas <= 1 && d.id !== barberoId) return;
    barberos.push({ id: d.id, docHorario: b.horario || null });
  });
  if (!barberos.length) return [];
  // El profesional pedido no realiza este servicio (o no es elegible): mismo
  // resultado que antes del filtro por grupo — ningún slot es suyo.
  if (barberoId && !barberos.some(b => b.id === barberoId)) return [];

  // ── Ocupación del día ──
  const [citasSnap, locksSnap, bloqueosSnap] = await Promise.all([
    c.citas.where('fecha', '==', fechaStr).get(),
    c.locks.where('fecha', '==', fechaStr).get(),
    c.bloqueos.where('fecha', '==', fechaStr).get(),
  ]);

  // Map barberoId → rangos ocupados [ini, fin). '*' = todos los barberos.
  const busy = new Map();
  const addBusy = (bid, ini, fin) => {
    const key = bid || '*';
    if (!busy.has(key)) busy.set(key, []);
    busy.get(key).push([ini, fin]);
  };

  citasSnap.forEach(d => {
    const x = d.data();
    if (x.estado === 'Cancelada' || x.estado === 'NoAsistio') return;
    if (typeof x.hora !== 'string' || !x.hora.includes(':')) return;
    const ini = toMins(x.hora);
    addBusy(x.barberoId, ini, ini + (Number(x.duracion || x.duracionServicio) || 30));
  });
  locksSnap.forEach(d => {
    const x = d.data();
    if (typeof x.hora !== 'string' || !x.hora.includes(':')) return;
    const ini = toMins(x.hora);
    addBusy(x.barberoId, ini, ini + (Number(x.duracion) || 30));
  });
  bloqueosSnap.forEach(d => {
    const x = d.data();
    if (x.todo_el_dia) { addBusy(x.barberoId, 0, 1440); return; }
    if (typeof x.hora_inicio !== 'string' || typeof x.hora_fin !== 'string') return;
    // hora_fin "00:00" = hasta medianoche. Con toMins quedaba [1200,0], un
    // rango vacío: el bloqueo no bloqueaba nada.
    addBusy(x.barberoId, toMins(x.hora_inicio), toMinsFin(x.hora_fin));
  });

  // Jornada personal: día libre / horas propias / descansos / colación → busy.
  await aplicarJornadasPersonales(c, barberos, dow, addBusy);

  const global = busy.get('*') || [];
  const libreBarbero = (bid, ini, fin) => {
    if (global.some(([a, b]) => solapan(ini, fin, a, b))) return false;
    const propios = busy.get(bid) || [];
    return !propios.some(([a, b]) => solapan(ini, fin, a, b));
  };

  // ── Barrido de slots ──
  // La ventana que se valida es la DURACIÓN REAL del servicio, no el paso de
  // la grilla. Con `step` fijo (30) un masaje de 60 min se ofrecía si los
  // primeros 30 estaban libres: hora ofrecida → agendar_cita la rechazaba →
  // "el bot ofrece horas ocupadas" (Nancy/Romy, 31-jul). Lo mismo con la
  // colación: un servicio largo que ARRANCA antes de colación ya no pasa.
  //
  // Sin servicio elegido NO se cae al paso de la grilla (era el mismo bug al
  // revés: 15 min en varios locales). Los puntos de entrada resuelven la
  // duración típica del local y la pasan; esto es la red para llamadas sueltas.
  const dur = Number(durMin) > 0 ? Math.round(Number(durMin)) : await duracionTipica(tenantId);

  // Se recorre el día COMPLETO y recién al final se recorta. Antes el loop
  // hacía `break` al juntar MAX_SLOTS y devolvía los PRIMEROS libres: con la
  // grilla de 15 min eso son apenas 3 horas, así que el bot veía la mañana y
  // concluía que la tarde estaba llena. Mordió el 02-08 en kronnos_penablanca:
  // el cliente pidió las 16:00 —libres con Martin— y el bot le respondió que
  // ya estaban tomadas; terminó agendando a las 13:15 a regañadientes.
  const libres = [];
  for (let t = iniMins; t + dur <= finMins; t += step) {
    if (t < minMinuto) continue;
    if (colacion && solapan(t, t + dur, colacion[0], colacion[1])) continue;
    // Con N personas hacen falta N profesionales libres A LA VEZ. Ofrecer un
    // slot donde solo cabe una y descubrirlo al agendar es lo que dejó a Ceci
    // y su amiga sin hora en kronnos_woman (05-08): el bot agendó a la primera,
    // eso consumió el único cupo, y le dijo a la segunda que ya estaba tomado.
    // Y si el cliente nombró a alguien, esa persona tiene que estar entre los
    // libres: N ajenos no sirven para "con Evelyn somos dos".
    const libresAhora = barberos.filter(b => libreBarbero(b.id, t, t + dur));
    if (libresAhora.length < nPersonas) continue;
    if (barberoId && !libresAhora.some(b => b.id === barberoId)) continue;
    libres.push(toHHMM(t));
  }
  if (libres.length <= MAX_SLOTS) return libres;

  // Hay más cupos que los que caben en la respuesta: se toma una MUESTRA
  // repartida por todo el día (conservando la primera y la última) en vez de
  // un prefijo. Así el modelo nunca cree que después de cierta hora no queda
  // nada, y el cliente que pide "en la tarde" ve horas de la tarde.
  const muestra = [];
  const paso = (libres.length - 1) / (MAX_SLOTS - 1);
  for (let i = 0; i < MAX_SLOTS; i++) muestra.push(libres[Math.round(i * paso)]);
  return [...new Set(muestra)];
}

exports.chatHorasDisponibles = onCall({ cors: true }, async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Sesión requerida.');

  const tenantId = String(req.data?.tenantId || '').trim();
  if (!/^[a-z0-9_-]{3,40}$/.test(tenantId)) {
    throw new HttpsError('invalid-argument', 'tenantId inválido.');
  }

  const ahora = ahoraChile();
  const desde = /^\d{4}-\d{2}-\d{2}$/.test(String(req.data?.fecha || '')) ? req.data.fecha : ahora.fecha;
  // Estas dos se referenciaban sin existir en este scope: TODA llamada al
  // callable moría en ReferenceError y el chat público respondía "No se pudo
  // calcular la disponibilidad" (detectado 07-08 al auditar el caso Evelyn).
  const servicioId = String(req.data?.servicioId || '').trim() || null;
  const personas   = Math.max(1, Number(req.data?.personas) || 1);

  try {
    // El chat pregunta "¿tienes hora?" antes de saber el servicio: se asume la
    // duración típica del local. Se resuelve UNA vez, fuera del loop de días.
    const dur = await duracionTipica(tenantId);
    for (let i = 0; i < MAX_DIAS_BUSQUEDA; i++) {
      const fecha = sumarDias(desde, i);
      const esHoy = fecha === ahora.fecha;
      const slots = await horasParaFecha(tenantId, fecha, esHoy ? ahora.mins + MARGEN_HOY_MIN : 0, dur, { servicioId, personas });
      if (slots.length) return { ok: true, fecha, esHoy, slots };
    }
    return { ok: true, fecha: null, esHoy: false, slots: [] };
  } catch (e) {
    logger.error(`[chatHoras] ${tenantId}:`, e.message);
    throw new HttpsError('internal', 'No se pudo calcular la disponibilidad.');
  }
});

/**
 * Busca el primer día (dentro de MAX_DIAS_BUSQUEDA desde `desdeFecha`) con cupos.
 * Misma semántica que el callable, extraída para reuso por el bot de WhatsApp.
 * @returns {{ fecha:string|null, esHoy:boolean, slots:string[] }}
 */
async function buscarDisponibilidad(tenantId, desdeFecha, opts = {}) {
  const { durMin = null, diasServicio = null, barberoId = null, servicioId = null, personas = 1 } = opts || {};
  const ahora = ahoraChile();
  const desde = /^\d{4}-\d{2}-\d{2}$/.test(String(desdeFecha || '')) ? desdeFecha : ahora.fecha;
  // Sin servicio elegido, la duración típica del local (una sola lectura para
  // toda la búsqueda, no una por día).
  const dur = Number(durMin) > 0 ? durMin : await duracionTipica(tenantId);
  // Con servicio restringido por días se amplía la búsqueda: 4 días podían no
  // contener NINGÚN día válido (ej. promo Lu-Ju consultada un viernes). Filtrar
  // por profesional necesita el mismo aire: quien trabaja 3 días a la semana no
  // tiene por qué tener su próximo cupo dentro de los próximos 4.
  const maxDias = (Array.isArray(diasServicio) && diasServicio.length) || barberoId ? 10 : MAX_DIAS_BUSQUEDA;
  for (let i = 0; i < maxDias; i++) {
    const fecha = sumarDias(desde, i);
    if (Array.isArray(diasServicio) && diasServicio.length && !diasServicio.includes(dowDe(fecha))) continue;
    const esHoy = fecha === ahora.fecha;
    const slots = await horasParaFecha(tenantId, fecha, esHoy ? ahora.mins + MARGEN_HOY_MIN : 0, dur, { barberoId, servicioId, personas });
    if (slots.length) return { fecha, esHoy, slots };
  }
  return { fecha: null, esHoy: false, slots: [] };
}

/**
 * ¿Ese profesional atiende ese día? Responde la diferencia que al cliente le
 * importa: "Claudio hoy no trabaja" no es lo mismo que "Claudio hoy está lleno",
 * y sin este dato el bot solo sabe que no hay slots y termina inventando el
 * motivo. No mira ocupación — solo jornada del barbero y puertas del local.
 *
 * @returns {Promise<{atiende:boolean, motivo:'ok'|'dia_libre'|'bloqueado'|'local_cerrado'|'no_elegible'|'no_existe'}>}
 */
async function atiendeEseDia(tenantId, fechaStr, barberoId) {
  const c = cols(tenantId);
  const [confSnap, barbSnap] = await Promise.all([
    c.conf.get(),
    c.barberos.doc(String(barberoId || '')).get().catch(() => null),
  ]);
  if (!barbSnap || !barbSnap.exists) return { atiende: false, motivo: 'no_existe' };
  const b = barbSnap.data() || {};
  if (!esElegible(b, tenantId)) return { atiende: false, motivo: 'no_elegible' };

  const conf = confSnap.exists ? (confSnap.data() || {}) : {};
  const dow  = dowDe(fechaStr);
  const diasLaborales = Array.isArray(conf.diasLaborales) ? conf.diasLaborales : [1, 2, 3, 4, 5, 6];
  if (!diasLaborales.map(Number).includes(dow)) return { atiende: false, motivo: 'local_cerrado' };
  if (Array.isArray(conf.diasBloqueados) && conf.diasBloqueados.includes(fechaStr)) {
    return { atiende: false, motivo: 'local_cerrado' };
  }
  const dc  = conf.diasConfig || {};
  const dia = dc[dow] ?? dc[String(dow)] ?? null;
  if (dia && dia.activo === false) return { atiende: false, motivo: 'local_cerrado' };

  const cfgSnap = await c.barberos.doc(barbSnap.id).collection('configuracion').doc('main').get().catch(() => null);
  const rangos = rangosFueraDeJornada({
    docHorario:  b.horario || null,
    cfgPersonal: cfgSnap && cfgSnap.exists ? cfgSnap.data() : null,
    dow,
  });
  // Día libre = su jornada tapa el día entero (rangosFueraDeJornada empuja
  // [0,1440) en ese caso). Un descanso suelto no lo deja "sin atender".
  const tapaTodo = rangos.some(([a, z]) => a <= 0 && z >= 1440);
  if (tapaTodo) return { atiende: false, motivo: 'dia_libre' };

  // Bloqueo de día completo: el local marcando "hoy esta persona no está"
  // (vacaciones, licencia, franco puntual). NO es ocupación — es exactamente
  // la diferencia que esta función existe para contar, y era el único caso
  // que no miraba.
  //
  // Por eso el bot le dijo a Daniel "Araceli está atendiendo hasta las 19:00"
  // (kronnos_penablanca, 03-08) con ella bloqueada el día entero desde el 29
  // de julio: su horario semanal dice que los lunes trabaja, y esta función
  // solo miraba el horario. Terminó mandándolo al local a que lo atendiera
  // alguien que no estaba.
  const blSnap = await c.bloqueos.where('fecha', '==', fechaStr).get().catch(() => null);
  let bloqueadoTodoElDia = false;
  if (blSnap) blSnap.forEach(d => {
    const x = d.data() || {};
    if (!x.todo_el_dia) return;
    // Sin barberoId = bloqueo global del local; con él, solo si es suyo.
    if (!x.barberoId || x.barberoId === barbSnap.id) bloqueadoTodoElDia = true;
  });
  if (bloqueadoTodoElDia) return { atiende: false, motivo: 'bloqueado' };

  return { atiende: true, motivo: 'ok' };
}

/**
 * Elige un profesional ELEGIBLE que esté LIBRE en [hora, hora+dur) de `fechaStr`.
 * Reusa la misma regla de elegibilidad y de ocupación que `horasParaFecha`.
 * (El bot lo usa para asignar barbero al agendar; devuelve null si no hay ninguno.)
 *
 * @param {object} [opts]
 * @param {string} [opts.preferirBarberoId] Si ese profesional está libre, se
 *   devuelve a ÉL antes que a cualquier otro. Al reagendar, el cliente espera
 *   quedarse con la misma persona; sin esto el orden del snapshot decidía.
 * @param {string} [opts.exigirBarberoId] Ese profesional o NADIE (devuelve null
 *   si no está libre). Preferir no alcanza cuando el cliente pidió a alguien por
 *   su nombre: caer en otro es exactamente el error que hay que evitar — que
 *   llegue al local creyendo que lo atiende Claudio y se encuentre con Orlando.
 * @param {string} [opts.excluirCitaId] Ignora esa cita y su candado al calcular
 *   ocupación. Necesario al MOVER una cita: su propio cupo actual no puede
 *   bloquear el traslado (pasaba al mover a un horario solapado, ej. 13:00→12:45).
 * @returns {Promise<{ id:string, nombre:string }|null>}
 */
async function barberoLibreParaSlot(tenantId, fechaStr, hora, dur, opts = {}) {
  const { preferirBarberoId = null, exigirBarberoId = null, excluirCitaId = null, servicioId = null } = opts || {};
  const c = cols(tenantId);
  const startMin = toMins(hora);
  const endMin   = startMin + (Number(dur) || 30);

  // ── Puertas del LOCAL — las MISMAS de horasParaFecha ──
  // Este validador solo miraba la ocupación (citas/locks/bloqueos/jornadas):
  // aceptaba agendar en plena colación del local, fuera del horario del día o
  // en fecha bloqueada, horas que la oferta jamás mostraría. Mordió el 31-jul
  // ("no respetó horarios de colación"). El sobrecupo del panel NO pasa por
  // aquí, así que el local sigue pudiendo forzar horas a mano.
  const confSnap = await c.conf.get();
  const conf = confSnap.exists ? (confSnap.data() || {}) : {};
  const dowLocal = dowDe(fechaStr);
  const diasLab = Array.isArray(conf.diasLaborales) ? conf.diasLaborales : [1, 2, 3, 4, 5, 6];
  if (!diasLab.map(Number).includes(dowLocal)) return null;
  if (Array.isArray(conf.diasBloqueados) && conf.diasBloqueados.includes(fechaStr)) return null;
  const dcCfg = conf.diasConfig || {};
  const diaCfg = dcCfg[dowLocal] ?? dcCfg[String(dowLocal)] ?? null;
  if (diaCfg && diaCfg.activo === false) return null;
  const abre   = toMins((diaCfg && diaCfg.inicio) || conf.horarioInicio || '09:00');
  const cierra = toMinsFin((diaCfg && diaCfg.fin) || conf.horarioFin    || '20:00');
  if (startMin < abre || endMin > cierra) return null;
  if (conf.colacion && conf.colacion.inicio && conf.colacion.fin
      && solapan(startMin, endMin, toMins(conf.colacion.inicio), toMins(conf.colacion.fin))) return null;

  const barbSnap = await c.barberos.get();
  const barberos = [];
  barbSnap.forEach(d => {
    const b = d.data();
    if (!esElegible(b, tenantId, servicioId)) return;
    if (exigirBarberoId && d.id !== exigirBarberoId) return;
    barberos.push({ id: d.id, nombre: b.nombre || '', docHorario: b.horario || null });
  });
  if (!barberos.length) return null;

  const [citasSnap, locksSnap, bloqueosSnap] = await Promise.all([
    c.citas.where('fecha', '==', fechaStr).get(),
    c.locks.where('fecha', '==', fechaStr).get(),
    c.bloqueos.where('fecha', '==', fechaStr).get(),
  ]);

  const busy = new Map();
  const addBusy = (bid, ini, fin) => {
    const key = bid || '*';
    if (!busy.has(key)) busy.set(key, []);
    busy.get(key).push([ini, fin]);
  };
  citasSnap.forEach(d => {
    const x = d.data();
    if (excluirCitaId && d.id === excluirCitaId) return;
    if (x.estado === 'Cancelada' || x.estado === 'NoAsistio') return;
    if (typeof x.hora !== 'string' || !x.hora.includes(':')) return;
    const ini = toMins(x.hora);
    addBusy(x.barberoId, ini, ini + (Number(x.duracion || x.duracionServicio) || 30));
  });
  locksSnap.forEach(d => {
    const x = d.data();
    if (excluirCitaId && x.citaId === excluirCitaId) return;
    if (typeof x.hora !== 'string' || !x.hora.includes(':')) return;
    const ini = toMins(x.hora);
    addBusy(x.barberoId, ini, ini + (Number(x.duracion) || 30));
  });
  bloqueosSnap.forEach(d => {
    const x = d.data();
    if (x.todo_el_dia) { addBusy(x.barberoId, 0, 1440); return; }
    if (typeof x.hora_inicio !== 'string' || typeof x.hora_fin !== 'string') return;
    // hora_fin "00:00" = hasta medianoche. Con toMins quedaba [1200,0], un
    // rango vacío: el bloqueo no bloqueaba nada.
    addBusy(x.barberoId, toMins(x.hora_inicio), toMinsFin(x.hora_fin));
  });

  // Jornada personal (día libre / horas propias / descansos / colación).
  await aplicarJornadasPersonales(c, barberos, dowDe(fechaStr), addBusy);

  const global = busy.get('*') || [];
  if (global.some(([a, b]) => solapan(startMin, endMin, a, b))) return null;
  const libre = (barb) => {
    const propios = busy.get(barb.id) || [];
    return !propios.some(([a, b]) => solapan(startMin, endMin, a, b));
  };
  // Al reagendar: quedarse con el MISMO profesional si puede (el cliente ya
  // eligió persona; cambiársela sin avisar es peor que ofrecerle otra hora).
  if (preferirBarberoId) {
    const pref = barberos.find(b => b.id === preferirBarberoId);
    if (pref && libre(pref)) return { id: pref.id, nombre: pref.nombre };
  }
  // Entre los libres, el que MENOS citas tiene ese día — "prioridad al que ha
  // cortado menos" (pedido de Kronnos, 07-08). Antes se devolvía el primero
  // del snapshot (orden alfabético por id de doc) y en penablanca Araceli se
  // llevaba casi todas las citas del bot. Cuentan las citas vivas del día ya
  // leídas arriba; empate → orden del snapshot, que con el propio conteo va
  // rotando solo a medida que se llena el día.
  const citasDia = new Map();
  citasSnap.forEach(d => {
    const x = d.data();
    if (excluirCitaId && d.id === excluirCitaId) return;
    if (x.estado === 'Cancelada' || x.estado === 'NoAsistio') return;
    if (!x.barberoId) return;
    citasDia.set(x.barberoId, (citasDia.get(x.barberoId) || 0) + 1);
  });
  let mejor = null;
  for (const barb of barberos) {
    if (!libre(barb)) continue;
    const n = citasDia.get(barb.id) || 0;
    if (!mejor || n < mejor.n) mejor = { barb, n };
  }
  return mejor ? { id: mejor.barb.id, nombre: mejor.barb.nombre } : null;
}

// Para tests locales (scripts con Admin SDK) y reuso por el bot de WhatsApp
// (functions/evolution/cerebro.js): no son parte del API público.
exports._horasParaFecha        = horasParaFecha;
exports._buscarDisponibilidad  = buscarDisponibilidad;
exports._duracionTipica        = duracionTipica;
exports._barberoLibreParaSlot  = barberoLibreParaSlot;
exports._atiendeEseDia         = atiendeEseDia;
exports._ahoraChile            = ahoraChile;
// La usa scripts/auditar-citas-imposibles.js: la jornada se DERIVA de acá,
// no se recalcula, o el auditor y el motor dirían cosas distintas.
exports._rangosFueraDeJornada  = rangosFueraDeJornada;
exports._dowDe                 = dowDe;
