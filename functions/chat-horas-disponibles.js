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

function cols(tid) {
  const root = tid === 'elegance';
  const base = root ? null : db.collection('tenants').doc(tid);
  return {
    conf:     root ? db.collection('configuracion').doc('main') : base.collection('configuracion').doc('main'),
    barberos: root ? db.collection('barberos') : base.collection('barberos'),
    citas:    root ? db.collection('citas')    : base.collection('citas'),
    locks:    root ? db.collection('slotLocks') : base.collection('slotLocks'),
    bloqueos: root ? db.collection('bloqueos')  : base.collection('bloqueos'),
  };
}

const toMins = (t) => {
  const [h, m] = String(t || '').split(':').map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
};
const toHHMM = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

/** Fecha (YYYY-MM-DD) y minutos del día actuales en Chile. */
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
  return { fecha: `${parts.year}-${parts.month}-${parts.day}`, mins: hh * 60 + Number(parts.minute) };
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
    const fin = toMins(day.fin    || cfg.horarioFin    || '24:00');
    push(0, ini);
    push(fin, 1440);
    descansosDe(day).forEach(([a, b]) => push(a, b));
  } else if (cfg.horarioInicio || cfg.horarioFin) {
    // Sin config del día pero con jornada base propia.
    push(0, toMins(cfg.horarioInicio || '00:00'));
    push(toMins(cfg.horarioFin || '24:00'), 1440);
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

/** Slots libres de UN día. Exportada para tests locales con Admin SDK. */
async function horasParaFecha(tenantId, fechaStr, minMinuto = 0) {
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
  const finMins  = toMins((dia && dia.fin)    || conf.horarioFin    || '20:00');
  const step     = Number(conf.intervaloMinutos) || 30;
  if (finMins <= iniMins || step <= 0) return [];

  const colacion = conf.colacion && conf.colacion.inicio && conf.colacion.fin
    ? [toMins(conf.colacion.inicio), toMins(conf.colacion.fin)]
    : null;

  // ── Barberos elegibles (misma regla que la reserva pública) ──
  const barbSnap = await c.barberos.get();
  const barberos = [];
  barbSnap.forEach(d => {
    const b = d.data();
    if (b._mainDocId) return;
    if (b.disponible === false || b.activo === false) return;
    if (b.rol === 'admin' && b.mostrarEnAgenda !== true && tenantId !== 'delnero') return;
    barberos.push({ id: d.id, docHorario: b.horario || null });
  });
  if (!barberos.length) return [];

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
    addBusy(x.barberoId, toMins(x.hora_inicio), toMins(x.hora_fin));
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
  const slots = [];
  for (let t = iniMins; t + step <= finMins; t += step) {
    if (t < minMinuto) continue;
    if (colacion && solapan(t, t + step, colacion[0], colacion[1])) continue;
    if (barberos.some(b => libreBarbero(b.id, t, t + step))) slots.push(toHHMM(t));
    if (slots.length >= MAX_SLOTS) break;
  }
  return slots;
}

exports.chatHorasDisponibles = onCall({ cors: true }, async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Sesión requerida.');

  const tenantId = String(req.data?.tenantId || '').trim();
  if (!/^[a-z0-9_-]{3,40}$/.test(tenantId)) {
    throw new HttpsError('invalid-argument', 'tenantId inválido.');
  }

  const ahora = ahoraChile();
  const desde = /^\d{4}-\d{2}-\d{2}$/.test(String(req.data?.fecha || '')) ? req.data.fecha : ahora.fecha;

  try {
    for (let i = 0; i < MAX_DIAS_BUSQUEDA; i++) {
      const fecha = sumarDias(desde, i);
      const esHoy = fecha === ahora.fecha;
      const slots = await horasParaFecha(tenantId, fecha, esHoy ? ahora.mins + MARGEN_HOY_MIN : 0);
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
async function buscarDisponibilidad(tenantId, desdeFecha) {
  const ahora = ahoraChile();
  const desde = /^\d{4}-\d{2}-\d{2}$/.test(String(desdeFecha || '')) ? desdeFecha : ahora.fecha;
  for (let i = 0; i < MAX_DIAS_BUSQUEDA; i++) {
    const fecha = sumarDias(desde, i);
    const esHoy = fecha === ahora.fecha;
    const slots = await horasParaFecha(tenantId, fecha, esHoy ? ahora.mins + MARGEN_HOY_MIN : 0);
    if (slots.length) return { fecha, esHoy, slots };
  }
  return { fecha: null, esHoy: false, slots: [] };
}

/**
 * Elige un profesional ELEGIBLE que esté LIBRE en [hora, hora+dur) de `fechaStr`.
 * Reusa la misma regla de elegibilidad y de ocupación que `horasParaFecha`.
 * (El bot lo usa para asignar barbero al agendar; devuelve null si no hay ninguno.)
 * @returns {Promise<{ id:string, nombre:string }|null>}
 */
async function barberoLibreParaSlot(tenantId, fechaStr, hora, dur) {
  const c = cols(tenantId);
  const startMin = toMins(hora);
  const endMin   = startMin + (Number(dur) || 30);

  const barbSnap = await c.barberos.get();
  const barberos = [];
  barbSnap.forEach(d => {
    const b = d.data();
    if (b._mainDocId) return;
    if (b.disponible === false || b.activo === false) return;
    if (b.rol === 'admin' && b.mostrarEnAgenda !== true && tenantId !== 'delnero') return;
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
    addBusy(x.barberoId, toMins(x.hora_inicio), toMins(x.hora_fin));
  });

  // Jornada personal (día libre / horas propias / descansos / colación).
  await aplicarJornadasPersonales(c, barberos, dowDe(fechaStr), addBusy);

  const global = busy.get('*') || [];
  if (global.some(([a, b]) => solapan(startMin, endMin, a, b))) return null;
  for (const barb of barberos) {
    const propios = busy.get(barb.id) || [];
    if (!propios.some(([a, b]) => solapan(startMin, endMin, a, b))) return { id: barb.id, nombre: barb.nombre };
  }
  return null;
}

// Para tests locales (scripts con Admin SDK) y reuso por el bot de WhatsApp
// (functions/evolution/cerebro.js): no son parte del API público.
exports._horasParaFecha        = horasParaFecha;
exports._buscarDisponibilidad  = buscarDisponibilidad;
exports._barberoLibreParaSlot  = barberoLibreParaSlot;
exports._ahoraChile            = ahoraChile;
