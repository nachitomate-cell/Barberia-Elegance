'use strict';

// functions/asegurar-slot.js
// ─────────────────────────────────────────────────────────────────
//  ASEGURAR SLOT LOCK AL CREAR/EDITAR CITA  (auto-sync citas → slotLocks)
//
//  Problema que resuelve: la reserva pública (cliente) NO puede leer las
//  citas (requieren auth), así que sabe qué horas están ocupadas leyendo
//  la colección espejo pública `slotLocks`. Si una cita se crea por una
//  vía que no escribe su candado (agregada sin barbero y luego asignada,
//  movida con colisión de id, importada/legacy, etc.), el horario queda
//  invisible para el booking público → doble reserva.
//
//  Esta función garantiza, ante CUALQUIER escritura de una cita, que:
//    • Cita ACTIVA con barbero y NO sobrecupo  → existe su slotLock.
//    • Cita ELIMINADA                          → se libera su slotLock.
//  (La cancelación ya la maneja liberar-slot-on-cancel.js; aquí no se
//   toca para no duplicar.)
//
//  Idempotente y sin loops: solo escribe cuando falta algo. No pisa un
//  lock que pertenezca a OTRA cita (respeta sobrecupos reales).
//
//  Exports:
//    asegurarSlotElegance — trigger /citas/{citaId}
//    asegurarSlotTenant   — trigger /tenants/{tid}/citas/{citaId}
//
//  DEPLOY:
//    firebase deploy --only \
//      functions:asegurarSlotElegance,functions:asegurarSlotTenant
// ─────────────────────────────────────────────────────────────────

const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { logger }            = require('firebase-functions');
const admin                 = require('firebase-admin');
const { FieldValue }        = require('firebase-admin/firestore');

const db = admin.firestore();

function slotLocksCol(tenantId) {
  return db.collection(tenantId === 'elegance' ? 'slotLocks' : `tenants/${tenantId}/slotLocks`);
}

// Mismo formato de id que el panel (Agenda.jsx) y firebaseUtils.addCita:
//   `${barberoId saneado}_${YYYY-MM-DD}_${HHMM}`
function lockIdFor(barberoId, fecha, hora) {
  const safeHora = String(hora || '').replace(':', '');
  const safeBid  = String(barberoId || '').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${safeBid}_${fecha}_${safeHora}`;
}

function duracionDe(cita) {
  return Number(cita.duracionServicio ?? cita.duracion) || 30;
}

// ¿Esta cita debe tener un candado propio?
function debeTenerLock(cita) {
  if (!cita) return false;
  if ((cita.estado || '').toLowerCase() === 'cancelada') return false;
  if (cita.sobrecupo === true) return false;        // overbooking: no toma lock propio
  if (!cita.barberoId) return false;
  if (!cita.fecha || !cita.hora) return false;
  return true;
}

async function asegurar({ tenantId, citaId, citaRef, cita }) {
  const lockId  = lockIdFor(cita.barberoId, cita.fecha, cita.hora);
  const lockRef = slotLocksCol(tenantId).doc(lockId);
  const dur     = duracionDe(cita);

  const snap = await lockRef.get();

  if (snap.exists) {
    const d = snap.data() || {};
    // Si el lock pertenece a otra cita (sobrecupo/doble agenda real), no lo tocamos.
    if (d.citaId && d.citaId !== citaId) {
      logger.info(`[AsegurarSlot] ${tenantId}/${citaId}: lock ${lockId} es de ${d.citaId}; no se modifica.`);
      return;
    }
    // El lock ya es de esta cita: solo sincronizar referencia y duración si difieren.
    if (cita.slotLockId !== lockId) await citaRef.update({ slotLockId: lockId }).catch(() => {});
    if (Number(d.duracion) !== dur)  await lockRef.update({ duracion: dur }).catch(() => {});
    return;
  }

  // No existe → crearlo y referenciarlo desde la cita.
  await lockRef.set({
    citaId,
    fecha:     cita.fecha,
    hora:      cita.hora,
    barberoId: cita.barberoId,
    duracion:  dur,
    creadoEn:  FieldValue.serverTimestamp(),
    origen:    'auto_sync',
  });
  if (cita.slotLockId !== lockId) await citaRef.update({ slotLockId: lockId }).catch(() => {});
  logger.info(`[AsegurarSlot] ${tenantId}/${citaId}: slotLock ${lockId} creado (dur ${dur}).`);
}

// Cita eliminada por completo → liberar su candado (si era suyo) para no dejarlo huérfano.
async function limpiarPorBorrado({ tenantId, citaId, before }) {
  const lockId = before?.slotLockId
    || (debeTenerLock(before) ? lockIdFor(before.barberoId, before.fecha, before.hora) : null);
  if (!lockId) return;
  const lockRef = slotLocksCol(tenantId).doc(lockId);
  try {
    const snap = await lockRef.get();
    if (snap.exists && snap.data().citaId === citaId) {
      await lockRef.delete();
      logger.info(`[AsegurarSlot] ${tenantId}/${citaId}: cita borrada, slotLock ${lockId} liberado.`);
    }
  } catch (e) {
    logger.warn(`[AsegurarSlot] ${tenantId}/${citaId}: no se pudo liberar lock tras borrado:`, e.message);
  }
}

async function manejar({ tenantId, citaId, event }) {
  const before = event.data?.before?.data();
  const after  = event.data?.after?.data();

  if (!after) {                       // documento eliminado
    await limpiarPorBorrado({ tenantId, citaId, before });
    return;
  }
  if (!debeTenerLock(after)) return;  // cancelada / sin barbero / sobrecupo
  await asegurar({ tenantId, citaId, citaRef: event.data.after.ref, cita: after });
}

exports.asegurarSlotElegance = onDocumentWritten('citas/{citaId}', async (event) => {
  try {
    await manejar({ tenantId: 'elegance', citaId: event.params.citaId, event });
  } catch (err) {
    logger.error(`[AsegurarSlot] ${event.params.citaId}: error:`, err);
  }
  return null;
});

exports.asegurarSlotTenant = onDocumentWritten('tenants/{tid}/citas/{citaId}', async (event) => {
  try {
    await manejar({ tenantId: event.params.tid, citaId: event.params.citaId, event });
  } catch (err) {
    logger.error(`[AsegurarSlot] ${event.params.citaId} (${event.params.tid}): error:`, err);
  }
  return null;
});
