'use strict';

// functions/evolution/ventas-agenda.js
// ─────────────────────────────────────────────────────────────────────────────
//  AGENDA PROPIA DE IGNACIO — la que leen los asistentes de ventas.
//
//  Hasta ahora el bot de ventas (WhatsApp + Instagram) "agendaba" en el aire:
//  registrar_reunion guardaba "prefiere el martes en la tarde" como texto libre
//  y la hora real la confirmaba Ignacio a mano, mirando su calendario mental.
//  Dos leads podían quedar "confirmados" a la misma hora y nadie se enteraba
//  hasta el choque en el Meet.
//
//  Esto es una agenda REAL de la plataforma (no de un tenant): jornada
//  configurable desde ops, reuniones como documentos y CANDADOS transaccionales
//  con el mismo patrón de slotLocks que usa la reserva de los locales — el
//  primero que toma la hora gana, el segundo recibe "ya la tomaron" y ofrece
//  otra. La leen los DOS cerebros comerciales porque ambos entran por
//  procesarMensajeVentas (ventas.js): las tools nuevas viven allá y llaman acá.
//
//  Dónde vive cada cosa (todo raíz, todo server-only — las reglas de Firestore
//  no declaran estas colecciones, así que ningún cliente puede leerlas):
//    _system/ventas_agenda        → config: activo, jornada por día, duración
//    ventas_reuniones/{contacto}  → UNA reunión activa por lead (id = teléfono
//                                   o `ig_{igsid}`, el mismo id que usa
//                                   wa_ventas_leads — así lead y reunión se
//                                   cruzan sin índice)
//    ventas_agenda_locks/{fecha_HHMM} → el candado. tipo 'reunion' (del bot o
//                                   de un reagendo) o 'bloqueo' (Ignacio marcó
//                                   la hora como no disponible desde ops)
//
//  DEPLOY:
//    firebase deploy --only functions:ventasAgendaVer,functions:ventasAgendaConfigSet,functions:ventasAgendaBloquear,functions:ventasAgendaReunionEstado,functions:evolutionWebhook,functions:instagramWebhook
// ─────────────────────────────────────────────────────────────────────────────

const { logger }                = require('firebase-functions');
const { onCall, HttpsError }    = require('firebase-functions/v2/https');
const admin                     = require('firebase-admin');
const { FieldValue }            = require('firebase-admin/firestore');
const { esOperador }            = require('../lib/operadores');
const { conDiaSemana }          = require('../lib/calendario');
const { _ahoraChile: ahoraChile } = require('../chat-horas-disponibles');

const db = admin.firestore();

const CFG_REF       = () => db.doc('_system/ventas_agenda');
const reunionRef    = (contacto) => db.doc(`ventas_reuniones/${contacto}`);
const locksCol      = () => db.collection('ventas_agenda_locks');
const leadRef       = (contacto) => db.doc(`wa_ventas_leads/${contacto}`);

/* ─────────────────────────── Config y jornada ───────────────────────────
   La jornada por defecto es lunes a viernes de 10:00 a 19:00 en bloques de
   30 min. Todo se ajusta desde ops sin deploy; los defaults existen para que
   la agenda funcione desde el primer mensaje, sin seed. */

const HORARIO_DEF = {
  0: null,                 // domingo: no atiende
  1: ['10:00', '19:00'],
  2: ['10:00', '19:00'],
  3: ['10:00', '19:00'],
  4: ['10:00', '19:00'],
  5: ['10:00', '19:00'],
  6: null,                 // sábado: no atiende
};

const RE_HORA = /^([01]?\d|2[0-3]):[0-5]\d$/;
const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;

const aMin  = (h) => { const [hh, mm] = String(h).split(':').map(Number); return hh * 60 + mm; };
const aHhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

// Mismo cálculo UTC que lib/calendario: el día de la semana de una fecha ISO
// no depende de la zona horaria del contenedor.
function dowDe(fecha) {
  const [y, m, d] = String(fecha).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function rangoValido(v) {
  return Array.isArray(v) && v.length === 2 && RE_HORA.test(v[0]) && RE_HORA.test(v[1])
    && aMin(v[0]) < aMin(v[1]);
}

/** Config con defaults ya aplicados: el resto del módulo nunca ve un hueco. */
async function leerCfgAgenda() {
  const raw = (await CFG_REF().get()).data() || {};
  const clamp = (v, min, max, def) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : def;
  };
  const horario = {};
  for (let d = 0; d <= 6; d++) {
    const v = (raw.horario || {})[String(d)];
    // null explícito = día libre; ausente o inválido = default de ese día.
    horario[d] = v === null ? null : (rangoValido(v) ? v : HORARIO_DEF[d]);
  }
  return {
    activo:        raw.activo !== false,
    duracionMin:   clamp(raw.duracionMin, 15, 120, 30),
    antelacionMin: clamp(raw.antelacionMin, 0, 1440, 90),
    ventanaDias:   clamp(raw.ventanaDias, 1, 14, 7),
    horario,
  };
}

/** Todas las horas de la jornada de `fecha` (sin descontar ocupadas). */
function slotsJornada(cfg, fecha) {
  const rango = cfg.horario[dowDe(fecha)];
  if (!rango) return [];
  const out = [];
  for (let m = aMin(rango[0]); m + cfg.duracionMin <= aMin(rango[1]); m += cfg.duracionMin) {
    out.push(aHhmm(m));
  }
  return out;
}

const lockIdDe = (fecha, hora) => `${fecha}_${String(hora).replace(':', '')}`;

/** Locks entre dos fechas (inclusive), como Map lockId → data. Una sola
 *  consulta por rango en vez de una por día: es lo que lee CADA turno del bot. */
async function locksEntre(desde, hasta) {
  const s = await locksCol().where('fecha', '>=', desde).where('fecha', '<=', hasta).get();
  return new Map(s.docs.map((d) => [d.id, d.data() || {}]));
}

/* ─────────────────────────── Disponibilidad ───────────────────────────
   Lo que consume la tool consultar_agenda y la grilla de ops. Todo llega
   MASTICADO (regla de la casa): fecha ISO + forma hablada copiable; el filtro
   de "ya pasó" se hace acá con la hora real de Chile, jamás en el modelo. */

/**
 * Días con sus horas libres.
 * @param {object} [opts]
 * @param {string} [opts.soloFecha] YYYY-MM-DD: solo ese día (todas sus horas).
 * @param {object} [opts.cfg]      config ya leída (para no leerla dos veces).
 */
async function disponibilidad(opts = {}) {
  const cfg   = opts.cfg || await leerCfgAgenda();
  const ahora = ahoraChile();
  const fechas = [];
  if (opts.soloFecha) {
    fechas.push(String(opts.soloFecha));
  } else {
    for (let i = 0; i < cfg.ventanaDias; i++) fechas.push(conDiaSemana(ahora.fecha, i).fecha);
  }
  const locks = await locksEntre(fechas[0], fechas[fechas.length - 1]);
  const corteHoy = ahora.mins + cfg.antelacionMin;

  return fechas.map((fecha) => {
    const x = conDiaSemana(fecha);
    const horas = slotsJornada(cfg, fecha).filter((h) => {
      if (fecha < ahora.fecha) return false;
      if (fecha === ahora.fecha && aMin(h) < corteHoy) return false;
      return !locks.has(lockIdDe(fecha, h));
    });
    return { fecha, hablada: x.hablada, horas };
  });
}

/* ─────────────────────────── Agendar de verdad ───────────────────────────
   Mismo esqueleto que la cita del cerebro de locales (cerebro.js): validar
   TODO antes, y el par lock+doc dentro de UNA transacción — si el lock ya
   existe, la transacción muere con 'slot-taken' y el modelo ofrece otra hora.

   Reagendar es el mismo camino: si el contacto ya tiene una reunión activa,
   la transacción suelta el candado viejo y toma el nuevo EN EL MISMO commit.
   Nunca hay un instante con dos horas tomadas ni con ninguna. */

/**
 * @param {object} p
 * @param {string} p.contacto  teléfono WhatsApp o `ig_{igsid}` (id de lead)
 * @param {string} p.canal     chipId ('ventas', 'instagram', …)
 * @param {string} p.fecha     YYYY-MM-DD
 * @param {string} p.hora      HH:MM (acepta H:MM y normaliza)
 * @param {object} [p.datos]   nombre/negocio/rubro/comuna/notas del lead
 * @returns {{ok:boolean, motivo?:string, cuando?:string, reagendada?:boolean}}
 *   `motivo` viene masticado para que el MODELO sepa qué hacer a continuación.
 */
async function agendarReunion({ contacto, canal, fecha, hora, datos = {} }) {
  const cfg = await leerCfgAgenda();
  if (!cfg.activo) {
    return { ok: false, motivo: 'La agenda está pausada por ahora. Registra el interés con registrar_reunion y dile que le confirmas la hora por este mismo chat.' };
  }
  if (!RE_FECHA.test(String(fecha || ''))) {
    return { ok: false, motivo: 'Fecha inválida: usa el formato YYYY-MM-DD tal como aparece en el calendario del prompt.' };
  }
  const horaNorm = String(hora || '').padStart(5, '0');
  if (!RE_HORA.test(horaNorm)) {
    return { ok: false, motivo: 'Hora inválida: usa HH:MM, exactamente como la devolvió consultar_agenda.' };
  }

  const ahora = ahoraChile();
  const hoy   = ahora.fecha;
  if (fecha < hoy) {
    return { ok: false, motivo: `Esa fecha ya pasó (hoy es ${conDiaSemana(hoy).hablada}). Consulta la agenda y ofrece días desde hoy en adelante.` };
  }
  const lim = conDiaSemana(hoy, 60).fecha;
  if (fecha > lim) {
    return { ok: false, motivo: 'Esa fecha está a más de 2 meses. Propón algo dentro de las próximas semanas.' };
  }
  const jornada = slotsJornada(cfg, fecha);
  const hablada = conDiaSemana(fecha).hablada;
  if (!jornada.length) {
    return { ok: false, motivo: `El ${hablada} Ignacio no tiene agenda. Consulta consultar_agenda y ofrece otro día.` };
  }
  if (!jornada.includes(horaNorm)) {
    return { ok: false, motivo: `Las ${horaNorm} no calzan con la agenda del ${hablada} (atiende de ${cfg.horario[dowDe(fecha)][0]} a ${cfg.horario[dowDe(fecha)][1]}, en bloques de ${cfg.duracionMin} min). Ofrece una hora de las que devuelve consultar_agenda.` };
  }
  if (fecha === hoy && aMin(horaNorm) < ahora.mins + cfg.antelacionMin) {
    return { ok: false, motivo: 'Esa hora está demasiado encima (o ya pasó). Ofrece la siguiente hora libre de hoy o de mañana.' };
  }

  const lockId  = lockIdDe(fecha, horaNorm);
  const lockRef = locksCol().doc(lockId);
  const runRef  = reunionRef(contacto);
  const limpio  = (v, n) => String(v || '').slice(0, n).trim();

  let reagendada = false;
  try {
    await db.runTransaction(async (tx) => {
      const [nuevo, actual] = await Promise.all([tx.get(lockRef), tx.get(runRef)]);
      if (nuevo.exists) { const e = new Error('slot-taken'); e.code = 'slot-taken'; throw e; }

      const prev = actual.exists ? (actual.data() || {}) : {};
      // Reagendo: soltar el candado viejo SOLO si de verdad es de esta reunión
      // (jamás pisar un bloqueo ni el lock de otro contacto).
      if (prev.estado === 'agendada' && prev.lockId && prev.lockId !== lockId) {
        const viejoRef = locksCol().doc(prev.lockId);
        const viejo = await tx.get(viejoRef);
        if (viejo.exists && (viejo.data() || {}).reunionId === contacto) {
          tx.delete(viejoRef);
          reagendada = true;
        }
      }

      tx.set(lockRef, {
        tipo: 'reunion', reunionId: contacto, fecha, hora: horaNorm,
        duracion: cfg.duracionMin, creadoEn: FieldValue.serverTimestamp(),
      });
      tx.set(runRef, {
        contacto,
        canal:    String(canal || 'ventas'),
        fecha,
        hora:     horaNorm,
        duracion: cfg.duracionMin,
        lockId,
        estado:   'agendada',
        // Los datos del lead solo se PISAN si esta llamada trae algo: un
        // reagendo sin datos no puede borrar el nombre que ya se sabía.
        ...(limpio(datos.nombre, 80)   ? { nombre:  limpio(datos.nombre, 80) }   : {}),
        ...(limpio(datos.negocio, 120) ? { negocio: limpio(datos.negocio, 120) } : {}),
        ...(limpio(datos.rubro, 60)    ? { rubro:   limpio(datos.rubro, 60) }    : {}),
        ...(limpio(datos.comuna, 60)   ? { comuna:  limpio(datos.comuna, 60) }   : {}),
        ...(limpio(datos.notas, 300)   ? { notas:   limpio(datos.notas, 300) }   : {}),
        ...(actual.exists ? {} : { creadoEn: FieldValue.serverTimestamp() }),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    });
  } catch (e) {
    if (e.code === 'slot-taken') {
      return { ok: false, motivo: 'Justo alguien tomó esa hora. Vuelve a consultar la agenda y ofrece otra de las libres.' };
    }
    throw e;
  }

  // El lead de la card de ops queda CONFIRMADO con su hora real. Fuera de la
  // transacción a propósito: si esto falla, la reunión y el candado ya existen
  // y la card solo pierde el badge — se prefiere eso a abortar la reserva.
  await leadRef(contacto).set({
    telefono: contacto,
    estado: 'confirmada',
    reunionFecha: fecha,
    reunionHora:  horaNorm,
    chipId: String(canal || 'ventas'),
    ...(limpio(datos.nombre, 80)   ? { nombre:  limpio(datos.nombre, 80) }   : {}),
    ...(limpio(datos.negocio, 120) ? { negocio: limpio(datos.negocio, 120) } : {}),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true }).catch((e) => logger.warn('[ventas-agenda] lead no actualizado:', e.message));

  logger.info(`[ventas-agenda] 📅 ${reagendada ? 'reagendada' : 'agendada'} ${fecha} ${horaNorm} · ***${String(contacto).slice(-4)} (${canal})`);
  return {
    ok: true, fecha, hora: horaNorm, reagendada,
    duracionMin: cfg.duracionMin,
    cuando: `${hablada} a las ${horaNorm}`,
  };
}

/**
 * Cancela la reunión activa de un contacto y suelta su candado.
 * La usa la tool del bot y también ops (accion 'cancelar').
 */
async function cancelarReunion({ contacto, motivo }) {
  const runRef = reunionRef(contacto);
  const snap = await runRef.get();
  const r = snap.exists ? (snap.data() || {}) : null;
  if (!r || r.estado !== 'agendada') {
    return { ok: false, motivo: 'Este contacto no tiene ninguna reunión agendada que cancelar.' };
  }
  await db.runTransaction(async (tx) => {
    if (r.lockId) {
      const lRef = locksCol().doc(r.lockId);
      const l = await tx.get(lRef);
      if (l.exists && (l.data() || {}).reunionId === contacto) tx.delete(lRef);
    }
    tx.set(runRef, {
      estado: 'cancelada',
      canceladaMotivo: String(motivo || '').slice(0, 200),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });
  await leadRef(contacto).set({
    estado: 'reunion_solicitada',
    reunionFecha: FieldValue.delete(),
    reunionHora:  FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true }).catch(() => {});
  logger.info(`[ventas-agenda] ✖ cancelada ${r.fecha} ${r.hora} · ***${String(contacto).slice(-4)}`);
  return { ok: true, fecha: r.fecha, hora: r.hora, cuando: `${conDiaSemana(r.fecha).hablada} a las ${r.hora}` };
}

/* ─────────────────── Callables: la agenda dentro de ops ───────────────────
   Mismo contrato que el resto del panel: ops no carga el SDK de Firestore,
   todo pasa por callables gateadas a operadores, y cada acción refresca SOLO
   la sección de Ventas (nada de cargar() global). */

function exigirOperador(req) {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Inicia sesión.');
  if (!esOperador(String(req.auth.token?.email || '').toLowerCase())) {
    throw new HttpsError('permission-denied', 'Solo SynapTech administra esta agenda.');
  }
}

/** La grilla completa: cada día de la ventana con TODOS sus bloques y estado. */
const ventasAgendaVer = onCall({ region: 'us-central1', cors: true }, async (req) => {
  exigirOperador(req);
  const cfg   = await leerCfgAgenda();
  const ahora = ahoraChile();
  const fechas = [];
  for (let i = 0; i < cfg.ventanaDias; i++) fechas.push(conDiaSemana(ahora.fecha, i).fecha);
  // Los locks se leen hasta el horizonte de agendar_reunion (60 días), no solo
  // la ventana visible: un lead puede proponer una fecha lejana y esa reunión
  // tiene que aparecer en la lista aunque la grilla todavía no la muestre —
  // si no, existe el candado pero nadie lo ve hasta que entra en la semana.
  const locks = await locksEntre(fechas[0], conDiaSemana(ahora.fecha, 60).fecha);

  // Una lectura por reunión referenciada, en lote. El lock trae el id.
  const ids = [...new Set([...locks.values()].filter((l) => l.tipo === 'reunion' && l.reunionId).map((l) => l.reunionId))];
  const reuniones = {};
  if (ids.length) {
    const snaps = await db.getAll(...ids.map((id) => reunionRef(id)));
    for (const s of snaps) if (s.exists) reuniones[s.id] = s.data() || {};
  }

  const dias = fechas.map((fecha) => {
    const x = conDiaSemana(fecha);
    const slots = slotsJornada(cfg, fecha).map((h) => {
      const l = locks.get(lockIdDe(fecha, h));
      const pasada = fecha === ahora.fecha && aMin(h) < ahora.mins;
      if (l && l.tipo === 'reunion') {
        const r = reuniones[l.reunionId] || {};
        return { hora: h, estado: 'reunion', contacto: l.reunionId || '',
                 nombre: r.nombre || '', negocio: r.negocio || '', canal: r.canal || '' };
      }
      if (l) return { hora: h, estado: 'bloqueado' };
      return { hora: h, estado: pasada ? 'pasada' : 'libre' };
    });
    return { fecha, hablada: x.hablada, dia: x.dia, slots };
  });

  const lista = Object.entries(reuniones)
    .map(([contacto, r]) => ({
      contacto, canal: r.canal || '', nombre: r.nombre || '', negocio: r.negocio || '',
      rubro: r.rubro || '', comuna: r.comuna || '', notas: r.notas || '',
      fecha: r.fecha, hora: r.hora, hablada: r.fecha ? conDiaSemana(r.fecha).hablada : '',
      estado: r.estado || 'agendada',
    }))
    .sort((a, b) => `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`));

  return { ok: true, cfg, hoy: ahora.fecha, dias, reuniones: lista };
});

const ventasAgendaConfigSet = onCall({ region: 'us-central1', cors: true }, async (req) => {
  exigirOperador(req);
  const data = req.data || {};
  const patch = {};
  if (data.activo !== undefined) patch.activo = data.activo === true;
  const num = (v, min, max) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n < min || n > max) throw new HttpsError('invalid-argument', `Valor fuera de rango (${min}–${max}).`);
    return Math.round(n);
  };
  if (data.duracionMin !== undefined)   patch.duracionMin   = num(data.duracionMin, 15, 120);
  if (data.antelacionMin !== undefined) patch.antelacionMin = num(data.antelacionMin, 0, 1440);
  if (data.horario !== undefined) {
    if (typeof data.horario !== 'object' || data.horario === null) {
      throw new HttpsError('invalid-argument', 'horario debe ser un objeto {dia: [ini,fin]|null}.');
    }
    for (const [k, v] of Object.entries(data.horario)) {
      if (!/^[0-6]$/.test(k)) throw new HttpsError('invalid-argument', `Día inválido: ${k} (0=domingo … 6=sábado).`);
      if (v !== null && !rangoValido(v)) {
        throw new HttpsError('invalid-argument', `Horario inválido para el día ${k}: usa ["HH:MM","HH:MM"] con inicio < fin, o null para día libre.`);
      }
      patch[`horario.${k}`] = v;
    }
  }
  if (!Object.keys(patch).length) throw new HttpsError('invalid-argument', 'Nada que cambiar.');
  // update con dot-paths para tocar UN día del horario sin pisar el resto;
  // si el doc no existe todavía, set con merge de la forma expandida.
  try {
    await CFG_REF().update(patch);
  } catch (_) {
    const doc = {};
    for (const [k, v] of Object.entries(patch)) {
      if (k.startsWith('horario.')) { doc.horario = doc.horario || {}; doc.horario[k.slice(8)] = v; }
      else doc[k] = v;
    }
    await CFG_REF().set(doc, { merge: true });
  }
  logger.info(`[ventas-agenda:config] ${JSON.stringify(Object.keys(patch))} por ${req.auth.token.email}`);
  return { ok: true };
});

/** Bloquear/liberar una hora puntual, o el día completo si no viene `hora`. */
const ventasAgendaBloquear = onCall({ region: 'us-central1', cors: true }, async (req) => {
  exigirOperador(req);
  const fecha    = String(req.data?.fecha || '');
  const hora     = req.data?.hora ? String(req.data.hora).padStart(5, '0') : null;
  const bloquear = req.data?.bloquear !== false;
  if (!RE_FECHA.test(fecha)) throw new HttpsError('invalid-argument', 'Falta la fecha (YYYY-MM-DD).');
  if (hora && !RE_HORA.test(hora)) throw new HttpsError('invalid-argument', 'Hora inválida (HH:MM).');
  const cfg = await leerCfgAgenda();

  if (hora) {
    const ref = locksCol().doc(lockIdDe(fecha, hora));
    if (bloquear) {
      try {
        await ref.create({ tipo: 'bloqueo', fecha, hora, creadoEn: FieldValue.serverTimestamp() });
      } catch (_) {
        // create falla si ya existe: puede ser una reunión — esa no se pisa.
        const l = (await ref.get()).data() || {};
        if (l.tipo === 'reunion') throw new HttpsError('failed-precondition', 'Esa hora tiene una reunión agendada: cancélala primero.');
      }
    } else {
      const l = (await ref.get()).data() || null;
      if (l && l.tipo === 'reunion') throw new HttpsError('failed-precondition', 'Esa hora es una reunión, no un bloqueo.');
      if (l) await ref.delete();
    }
    return { ok: true, fecha, hora, bloqueado: bloquear };
  }

  // Día completo. Bloquear crea candados solo en los huecos libres (las
  // reuniones existentes se respetan y se cancelan aparte, a conciencia).
  const locks = await locksEntre(fecha, fecha);
  const batch = db.batch();
  let n = 0;
  for (const h of slotsJornada(cfg, fecha)) {
    const id = lockIdDe(fecha, h);
    const l = locks.get(id);
    if (bloquear && !l) {
      batch.set(locksCol().doc(id), { tipo: 'bloqueo', fecha, hora: h, creadoEn: FieldValue.serverTimestamp() });
      n++;
    } else if (!bloquear && l && l.tipo === 'bloqueo') {
      batch.delete(locksCol().doc(id));
      n++;
    }
  }
  if (n) await batch.commit();
  logger.info(`[ventas-agenda] día ${fecha} ${bloquear ? 'bloqueado' : 'liberado'} (${n} bloques) por ${req.auth.token.email}`);
  return { ok: true, fecha, bloqueado: bloquear, bloques: n };
});

/** Acciones sobre una reunión desde ops: cancelarla o marcarla realizada. */
const ventasAgendaReunionEstado = onCall({ region: 'us-central1', cors: true }, async (req) => {
  exigirOperador(req);
  const contacto = String(req.data?.contacto || '').trim();
  const accion   = String(req.data?.accion || '');
  if (!contacto || !/^[a-z0-9_+]+$/i.test(contacto)) throw new HttpsError('invalid-argument', 'Contacto inválido.');

  if (accion === 'cancelar') {
    const r = await cancelarReunion({ contacto, motivo: `cancelada desde ops por ${req.auth.token.email}` });
    if (!r.ok) throw new HttpsError('failed-precondition', r.motivo);
    return { ok: true };
  }
  if (accion === 'realizada') {
    await reunionRef(contacto).set({ estado: 'realizada', updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    await leadRef(contacto).set({ estado: 'realizada', updatedAt: FieldValue.serverTimestamp() }, { merge: true }).catch(() => {});
    return { ok: true };
  }
  throw new HttpsError('invalid-argument', 'accion debe ser cancelar o realizada.');
});

module.exports = {
  // Para ventas.js (las tools del cerebro comercial):
  leerCfgAgenda, disponibilidad, agendarReunion, cancelarReunion,
  // Callables de ops:
  ventasAgendaVer, ventasAgendaConfigSet, ventasAgendaBloquear, ventasAgendaReunionEstado,
  // Para tests:
  _slotsJornada: slotsJornada, _lockIdDe: lockIdDe, _dowDe: dowDe,
};
