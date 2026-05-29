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
//  Adicionalmente notifica vía WhatsApp al primer cliente en lista
//  de espera (listaEspera) que coincida con la misma fecha
//  (y opcionalmente el mismo barbero) de la cita cancelada.
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
const { defineSecret }      = require('firebase-functions/params');
const { logger }            = require('firebase-functions');
const admin                 = require('firebase-admin');

const db = admin.firestore();
const { FieldValue } = require('firebase-admin/firestore');

const secretSid  = defineSecret('TWILIO_ACCOUNT_SID');
const secretAuth = defineSecret('TWILIO_AUTH_TOKEN');
const secretFrom = defineSecret('TWILIO_WA_FROM');

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

function normPhone(phone) {
  if (!phone) return null;
  let n = String(phone).replace(/\D/g, '');
  if (!n) return null;
  if (n.length === 9) return `+56${n}`;
  if (n.startsWith('56') && n.length === 11) return `+${n}`;
  return n.startsWith('+') ? phone : `+${n}`;
}

async function notificarListaEspera({ tenantId, cita, sid, auth, from }) {
  if (!sid || !auth || !from) return;
  const fecha    = cita.fecha;
  const barberoId = cita.barberoId;
  if (!fecha) return;

  const col = tenantId === 'elegance'
    ? db.collection('listaEspera')
    : db.collection(`tenants/${tenantId}/listaEspera`);

  // Buscar primero por fecha + barberoId, fallback a cualquier entrada de esa fecha
  let snap = await col
    .where('estado', '==', 'en_espera')
    .where('fecha', '==', fecha)
    .orderBy('creadoEn', 'asc')
    .limit(5)
    .get()
    .catch(() => null);

  if (!snap || snap.empty) return;

  // Preferir mismo barbero si hay preferencia, sino tomar el primero
  let target = snap.docs.find(d => !d.data().barberoId || d.data().barberoId === barberoId);
  if (!target) target = snap.docs[0];

  const entry = target.data();
  const waTo  = normPhone(entry.clienteTelefono);

  if (waTo) {
    const nombre = (entry.clienteNombre || 'Cliente').split(' ')[0];
    const mensaje = [
      `Hola ${nombre}! 🎉`,
      ``,
      `Se liberó una hora para el *${fecha}* en tu barbería.`,
      `Tienes la primera prioridad — ¡reserva ahora antes de que alguien más tome el cupo!`,
      entry.barberoNombre ? `\nBarbero: ${entry.barberoNombre}` : '',
    ].filter(Boolean).join('\n');

    try {
      const twilio = require('twilio')(sid, auth);
      await twilio.messages.create({ from: `whatsapp:${from}`, to: `whatsapp:${waTo}`, body: mensaje });
      logger.info(`[ListaEspera] ${tenantId}: notificado ${entry.clienteNombre} (${waTo}) para fecha ${fecha}.`);
    } catch (e) {
      logger.warn(`[ListaEspera] ${tenantId}: error enviando WhatsApp:`, e.message);
    }
  }

  // Marcar como notificado
  await target.ref.update({ estado: 'notificado', notificadoEn: FieldValue.serverTimestamp() }).catch(() => {});
}

async function liberarSlot({ tenantId, citaId, lockId, citaRef, cita, sid, auth, from }) {
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
  // Notificar lista de espera
  await notificarListaEspera({ tenantId, cita, sid, auth, from });
}

exports.liberarSlotElegance = onDocumentWritten(
  { document: 'citas/{citaId}', secrets: [secretSid, secretAuth, secretFrom] },
  async (event) => {
    const citaId = event.params.citaId;
    const before = event.data?.before?.data();
    const after  = event.data?.after?.data();
    if (!debeLiberar(before, after)) return null;
    await liberarSlot({
      tenantId: 'elegance', citaId,
      lockId: after.slotLockId, citaRef: event.data.after.ref, cita: after,
      sid:  secretSid.value(), auth: secretAuth.value(), from: secretFrom.value(),
    });
    return null;
  },
);

exports.liberarSlotTenant = onDocumentWritten(
  { document: 'tenants/{tid}/citas/{citaId}', secrets: [secretSid, secretAuth, secretFrom] },
  async (event) => {
    const { tid, citaId } = event.params;
    const before = event.data?.before?.data();
    const after  = event.data?.after?.data();
    if (!debeLiberar(before, after)) return null;
    await liberarSlot({
      tenantId: tid, citaId,
      lockId: after.slotLockId, citaRef: event.data.after.ref, cita: after,
      sid:  secretSid.value(), auth: secretAuth.value(), from: secretFrom.value(),
    });
    return null;
  },
);
