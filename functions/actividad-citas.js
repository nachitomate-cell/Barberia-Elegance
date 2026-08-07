'use strict';

// ─────────────────────────────────────────────────────────────────────────────
//  actividad-citas.js
//  HISTORIAL DE ACTIVIDAD DE CITAS (feed de la campanita)
//
//  Los push son efímeros: si el staff no lo vio al momento, el dato se
//  esfumó y "¿quién movió esta hora?" no tiene respuesta. Este módulo deja
//  un registro persistente por local de todo lo que le pasa a una cita:
//  creada, reagendada, cambio de profesional/servicio, cancelada (y por
//  quién), completada, no asistió, eliminada.
//
//  Escribe a {root}actividad — colección nueva, solo-lectura para el staff
//  (rules: read esStaff, write false; solo Admin SDK escribe acá).
//
//  Diseño anti-ruido: los demás triggers escriben campos internos sobre la
//  cita (slotLockId, notifCancelLocalEnviada, pendingGoogleReview, flags de
//  recordatorio…). Acá solo importan los campos que un humano reconoce como
//  "la cita cambió" — whitelist CAMPOS. Si ninguno cambió, no hay evento.
//
//  Actor: se usa el auth context del trigger (authId) + las señales que el
//  repo ya maneja (canceladaPor:'cliente', origen wa_bot/ig_bot). Un authId
//  con @ es un service account (CFs, bots, scripts) → 'sistema'.
//
//  Retención: cada evento trae expiraEl (+90 días). El cron purgarActividad
//  borra los vencidos una vez al día — sin esto la colección crece para
//  siempre y se paga storage por eventos que ya no le importan a nadie.
//
//  Triggers:
//    actividadCitaElegance → /citas/{citaId}
//    actividadCitaTenant   → /tenants/{tid}/citas/{citaId}
//    purgarActividadDaily  → cron 04:40 America/Santiago
//
//  DEPLOY:
//    firebase deploy --only functions:actividadCitaElegance,functions:actividadCitaTenant,functions:purgarActividadDaily
// ─────────────────────────────────────────────────────────────────────────────

const { onDocumentWrittenWithAuthContext } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { logger }     = require('firebase-functions');
const admin          = require('firebase-admin');
const { rootDe, listaTenants } = require('./lib/push-staff');

const db = admin.firestore();

const DIAS_RETENCION = 90;
const TIMEZONE = 'America/Santiago';

// Mismo guard que push-cliente-eventos: imports masivos y QA fantasma no
// son actividad real del local.
function citaGuard(cita) {
  return !cita || cita.skipNotificaciones === true || cita.origen === 'import_manual' || cita.origenQA;
}

const nomCliente  = c => c.clienteNombre || c.nombre || 'Cliente';
const nomBarbero  = c => c.barbero || c.barberoNombre || '';
const nomServicio = c => c.servicioNombre || c.servicio || '';

// Campos que un humano reconoce como "la cita cambió". El resto (flags de
// otros triggers, feedback, slotLockId…) no genera eventos.
const CAMPOS = [
  { campo: 'estado',   valor: c => c.estado || '' },
  { campo: 'fecha',    valor: c => c.fecha || '' },
  { campo: 'hora',     valor: c => c.hora || '' },
  { campo: 'barbero',  valor: nomBarbero },
  { campo: 'servicio', valor: nomServicio },
];

const ORIGEN_LABEL = {
  'reserva-web':          'Reserva online',
  'reserva_online_grupo': 'Reserva online (grupo)',
  'barbero-page':         'Reserva online',
  'agenda_manual':        'Agenda del profesional',
  'wa_bot':               'Asistente WhatsApp',
  'ig_bot':               'Asistente Instagram',
};

// ── Resolución de actor ───────────────────────────────────────────────────────

// Cache por instancia (Fluid reusa instancias): `${root}|${uid}` → nombre|null
const _staffCache = new Map();

async function nombreStaff(root, uid) {
  if (!uid) return null;
  const key = `${root}|${uid}`;
  if (_staffCache.has(key)) return _staffCache.get(key);
  let nombre = null;
  try {
    const porId = await db.doc(`${root}barberos/${uid}`).get();
    if (porId.exists) {
      nombre = porId.data().nombre || null;
    } else {
      for (const campo of ['authUid', 'uid']) {
        const q = await db.collection(`${root}barberos`).where(campo, '==', uid).limit(1).get();
        if (!q.empty) { nombre = q.docs[0].data().nombre || null; break; }
      }
    }
  } catch (e) {
    logger.warn(`[Actividad] lookup staff ${uid} falló: ${e.message}`);
  }
  _staffCache.set(key, nombre);
  return nombre;
}

function esServiceAccount(authId) {
  return typeof authId === 'string' && authId.includes('@');
}

function esUidDelCliente(cita, authId) {
  if (!authId) return false;
  return authId === cita.clienteUid || authId === cita.clienteId;
}

async function actorDeCreacion(root, cita, authId) {
  const origen = cita.origen || '';
  if (origen === 'wa_bot') return { actor: 'bot', actorNombre: 'Asistente WhatsApp' };
  if (origen === 'ig_bot') return { actor: 'bot', actorNombre: 'Asistente Instagram' };
  if (authId && !esServiceAccount(authId) && !esUidDelCliente(cita, authId)) {
    const nombre = await nombreStaff(root, authId);
    if (nombre) return { actor: 'staff', actorNombre: nombre };
  }
  if (origen === 'agenda_manual') return { actor: 'staff', actorNombre: '' };
  if (esServiceAccount(authId) && !origen) return { actor: 'sistema', actorNombre: '' };
  return { actor: 'cliente', actorNombre: '' };
}

async function actorDeCambio(root, after, authId, seCancelo) {
  if (seCancelo && after.canceladaPor === 'cliente') return { actor: 'cliente', actorNombre: '' };
  if (esUidDelCliente(after, authId)) return { actor: 'cliente', actorNombre: '' };
  if (esServiceAccount(authId) || !authId) return { actor: 'sistema', actorNombre: '' };
  const nombre = await nombreStaff(root, authId);
  return { actor: 'staff', actorNombre: nombre || '' };
}

// ── Núcleo ────────────────────────────────────────────────────────────────────

function expiraEl() {
  return admin.firestore.Timestamp.fromMillis(Date.now() + DIAS_RETENCION * 24 * 60 * 60 * 1000);
}

function baseEvento(citaId, cita) {
  return {
    citaId,
    clienteNombre: nomCliente(cita),
    barbero:       nomBarbero(cita),
    barberoId:     cita.barberoId || '',
    servicio:      nomServicio(cita),
    fecha:         cita.fecha || '',
    hora:          cita.hora || '',
    sucursalId:    cita.sucursalId || '',
    origen:        cita.origen || '',
    origenLabel:   ORIGEN_LABEL[cita.origen] || '',
    ts:            admin.firestore.FieldValue.serverTimestamp(),
    expiraEl:      expiraEl(),
  };
}

function tipoDeUpdate(before, after, cambios) {
  const campos = new Set(cambios.map(c => c.campo));
  if (campos.has('estado')) {
    if (after.estado === 'Cancelada')  return 'cancelada';
    if (after.estado === 'Completada') return 'completada';
    if (after.estado === 'NoAsistio')  return 'no_asistio';
    if (after.estado === 'Confirmada') return 'confirmada';
    return 'estado';
  }
  if (campos.has('fecha') || campos.has('hora')) return 'reagendada';
  if (campos.has('barbero'))  return 'profesional';
  if (campos.has('servicio')) return 'servicio';
  return 'cambio';
}

async function registrarEvento(tid, citaId, event) {
  const root   = rootDe(tid);
  const before = event.data?.before?.exists ? event.data.before.data() : null;
  const after  = event.data?.after?.exists  ? event.data.after.data()  : null;
  if (citaGuard(after || before)) return;

  const authId = event.authId || '';
  let evento = null;

  if (!before && after) {
    // ── CREADA ──
    const { actor, actorNombre } = await actorDeCreacion(root, after, authId);
    evento = { ...baseEvento(citaId, after), tipo: 'creada', actor, actorNombre, cambios: [] };
  } else if (before && !after) {
    // ── ELIMINADA (borrado físico, distinto de cancelar) ──
    const { actor, actorNombre } = await actorDeCambio(root, before, authId, false);
    evento = { ...baseEvento(citaId, before), tipo: 'eliminada', actor, actorNombre, cambios: [] };
  } else if (before && after) {
    // ── MODIFICADA: solo si cambió un campo de la whitelist ──
    const cambios = [];
    for (const { campo, valor } of CAMPOS) {
      const a = valor(before), b = valor(after);
      if (a !== b) cambios.push({ campo, antes: a, despues: b });
    }
    if (!cambios.length) return;
    const tipo = tipoDeUpdate(before, after, cambios);
    const { actor, actorNombre } = await actorDeCambio(root, after, authId, tipo === 'cancelada');
    evento = { ...baseEvento(citaId, after), tipo, actor, actorNombre, cambios };
  }

  if (!evento) return;
  try {
    await db.collection(`${root}actividad`).add(evento);
  } catch (e) {
    logger.error(`[Actividad] ${tid}: no se pudo registrar ${evento.tipo} de ${citaId}: ${e.message}`);
  }
}

// ── Triggers ──────────────────────────────────────────────────────────────────

exports.actividadCitaElegance = onDocumentWrittenWithAuthContext(
  'citas/{citaId}',
  async (event) => {
    await registrarEvento('elegance', event.params.citaId, event);
    return null;
  }
);

exports.actividadCitaTenant = onDocumentWrittenWithAuthContext(
  'tenants/{tid}/citas/{citaId}',
  async (event) => {
    await registrarEvento(event.params.tid, event.params.citaId, event);
    return null;
  }
);

// ── Purga diaria de eventos vencidos ─────────────────────────────────────────

exports.purgarActividadDaily = onSchedule(
  { schedule: '40 4 * * *', timeZone: TIMEZONE },
  async () => {
    const ahora = admin.firestore.Timestamp.now();
    const tenants = await listaTenants();
    let total = 0;
    for (const { id, root } of tenants) {
      // Lotes acotados: si un tenant acumuló mucho, el resto sale mañana.
      for (let i = 0; i < 10; i++) {
        const snap = await db.collection(`${root}actividad`)
          .where('expiraEl', '<=', ahora)
          .limit(400)
          .get()
          .catch(() => null);
        if (!snap || snap.empty) break;
        const batch = db.batch();
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
        total += snap.size;
        if (snap.size < 400) break;
      }
    }
    if (total) logger.info(`[Actividad] purga: ${total} eventos vencidos borrados`);
    return null;
  }
);
