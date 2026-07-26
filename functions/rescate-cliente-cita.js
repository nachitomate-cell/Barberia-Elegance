'use strict';

// ─────────────────────────────────────────────────────────────────
//  RESCATE DE CLIENTE EN CITA — segunda línea de defensa
//
//  Dispara al crearse una cita. Si la cita quedó SIN clienteUid pero
//  tiene datos suficientes (nombre + email o telefono), llama al helper
//  interno de upsertCliente para resolver el uid canónico y actualiza
//  la cita. Cubre el caso donde el CF client-side falló (network jitter,
//  bundle viejo cacheado, browser cerrado antes del await, etc).
//
//  Idempotente: si la cita ya tiene clienteUid, no hace nada. Solo un
//  rescate por cita.
//
//  Exports:
//    rescateClienteCitaElegance — trigger /citas/{id}
//    rescateClienteCitaTenant   — trigger /tenants/{tid}/citas/{id}
// ─────────────────────────────────────────────────────────────────

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { logger }            = require('firebase-functions');
const admin                 = require('firebase-admin');

const { _upsertClienteCore: upsertClienteCore } = require('./upsert-cliente');

const db = admin.firestore();

async function procesarRescate({ tenantId, citaId, data }) {
  // Guard: si ya tiene clienteUid, nada que hacer.
  if (data.clienteUid || data.userId) return;

  const nombre   = (data.clienteNombre   || '').trim();
  const email    = (data.clienteEmail    || '').trim();
  const telefono = (data.clienteTelefono || '').trim();
  if (!nombre || (!email && !telefono)) return;

  try {
    const res = await upsertClienteCore({
      tenantId,
      nombre,
      email,
      telefono,
    });
    const uid = res?.uid;
    if (!uid) return;

    const citaRef = tenantId === 'elegance'
      ? db.doc(`citas/${citaId}`)
      : db.doc(`tenants/${tenantId}/citas/${citaId}`);
    await citaRef.update({
      clienteUid: uid,
      userId:     uid,
      rescatadoPorTrigger: true,
    });
    logger.info(`[Rescate] ${tenantId}/citas/${citaId}: linkeada a ${uid} (matchedBy=${res.matchedBy || 'none'})`);
  } catch (err) {
    logger.error(`[Rescate] ${tenantId}/citas/${citaId}: error:`, err?.message || err);
  }
}

exports.rescateClienteCitaElegance = onDocumentCreated('citas/{id}', async (event) => {
  const data = event.data?.data();
  if (!data) return null;
  try {
    await procesarRescate({ tenantId: 'elegance', citaId: event.params.id, data });
  } catch (err) {
    logger.error('[Rescate] elegance error inesperado:', err);
  }
  return null;
});

exports.rescateClienteCitaTenant = onDocumentCreated('tenants/{tid}/citas/{id}', async (event) => {
  const data = event.data?.data();
  if (!data) return null;
  try {
    await procesarRescate({ tenantId: event.params.tid, citaId: event.params.id, data });
  } catch (err) {
    logger.error('[Rescate] tenant error inesperado:', err);
  }
  return null;
});
