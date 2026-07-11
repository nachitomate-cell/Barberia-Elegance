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
//  Modelo v1 (pragmático): un slot está libre si existe AL MENOS UN
//  barbero elegible sin cita/slotLock/bloqueo en ese rango. No modela
//  horarios individuales por barbero — el flujo de reserva real valida
//  al agendar, por eso el chat lo presenta como "sujeto a confirmación".
//
//  Ocupación considerada: citas del día (estado ≠ Cancelada/NoAsistio),
//  slotLocks, bloqueos (por barbero o globales, parciales o día completo),
//  colación global y horario del día (diasConfig > horario base).
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
    barberos.push(d.id);
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
    if (barberos.some(bid => libreBarbero(bid, t, t + step))) slots.push(toHHMM(t));
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

// Para tests locales (scripts con Admin SDK): no es parte del API público.
exports._horasParaFecha = horasParaFecha;
