'use strict';

// functions/liberar-slot-on-cancel.js
// ─────────────────────────────────────────────────────────────────
//  LIBERAR SLOT AUTOMÁTICO AL CANCELAR CITA
//
//  Cuando una cita pasa a estado 'Cancelada' (desde cualquier flujo:
//  admin, barbero móvil, cliente desde su dashboard), si tiene un
//  slotLockId asociado lo borra para liberar el horario en el
//  booking público.
//
//  Esto permite que las rules de slotLocks queden estrictas (solo
//  staff puede delete) pero el cliente igual pueda cancelar sin que
//  el slot quede falsamente bloqueado.
//
//  Idempotente: si el slotLock ya no existe, no falla.
//
//  Exports:
//    liberarSlotElegance — trigger /citas/{citaId}
//    liberarSlotTenant   — trigger /tenants/{tid}/citas/{citaId}
//
//  DEPLOY:
//    firebase deploy --only \
//      functions:liberarSlotElegance,functions:liberarSlotTenant
// ─────────────────────────────────────────────────────────────────

const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { logger }            = require('firebase-functions');
const admin                 = require('firebase-admin');

const db = admin.firestore();

function slotLocksCol(tenantId) {
  return db.collection(tenantId === 'elegance' ? 'slotLocks' : `tenants/${tenantId}/slotLocks`);
}

function debeLiberar(before, after) {
  if (!after) return false; // doc eliminado
  const eAntes  = (before?.estado || '').toLowerCase();
  const eDesp   = (after.estado   || '').toLowerCase();
  if (eDesp !== 'cancelada') return false;
  if (eAntes === 'cancelada') return false; // ya estaba cancelada
  return !!after.slotLockId;
}

async function liberarSlot({ tenantId, citaId, lockId, citaRef }) {
  try {
    await slotLocksCol(tenantId).doc(lockId).delete();
    logger.info(`[Liberar] ${tenantId}/${citaId}: slotLock ${lockId} liberado.`);
  } catch (e) {
    logger.warn(`[Liberar] ${tenantId}/${citaId}: no se pudo borrar slotLock ${lockId}:`, e.message);
  }
  // Limpiar slotLockId de la cita para que no vuelva a dispararse si se vuelve a editar.
  try {
    await citaRef.update({ slotLockId: null });
  } catch (e) {
    logger.warn(`[Liberar] ${tenantId}/${citaId}: no se pudo limpiar slotLockId:`, e.message);
  }
}

exports.liberarSlotElegance = onDocumentWritten('citas/{citaId}', async (event) => {
  const citaId = event.params.citaId;
  const before = event.data?.before?.data();
  const after  = event.data?.after?.data();
  if (!debeLiberar(before, after)) return null;
  await liberarSlot({ tenantId: 'elegance', citaId, lockId: after.slotLockId, citaRef: event.data.after.ref });
  return null;
});

exports.liberarSlotTenant = onDocumentWritten(
  'tenants/{tid}/citas/{citaId}',
  async (event) => {
    const { tid, citaId } = event.params;
    const before = event.data?.before?.data();
    const after  = event.data?.after?.data();
    if (!debeLiberar(before, after)) return null;
    await liberarSlot({ tenantId: tid, citaId, lockId: after.slotLockId, citaRef: event.data.after.ref });
    return null;
  },
);
