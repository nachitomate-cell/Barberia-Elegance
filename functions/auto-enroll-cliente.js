'use strict';

// functions/auto-enroll-cliente.js
// ─────────────────────────────────────────────────────────────────
//  AUTO-ENROLL AL CLUB DE FIDELIDAD — Fase 3.C
//
//  Cuando un tenant tiene auto-enroll habilitado (ej. aura), cada cita
//  nueva crea automáticamente un perfil pasivo en users/ para el cliente
//  si todavía no existe. Esto permite que sello-automatico le sume sello
//  al completar la cita aunque el cliente nunca se haya registrado.
//
//  Fase 3.C: delegamos toda la lógica de "crea o reusa cliente" al helper
//  centralizado `_upsertClienteCore` (upsert-cliente.js). Esto:
//   · Aplica la misma regla híbrida de matching (email/tel con guarda
//     anti-familia) que el resto del sistema.
//   · Usa docId determinístico `ac_<hash>` en vez de `{tel}` (evita
//     duplicados por formato de tel inconsistente).
//   · Ya no escribe a la colección `clientes/` (Fase 3 la retira).
//   · Idempotente: si upsertCliente ya se llamó desde el client-side
//     (rescate/wiring), esta llamada es un no-op de MERGE.
//
//  Antes: 174 líneas con detector propio de existencia + dobleescritura
//  users/+clientes/. Ahora: 60 líneas, delega al helper único.
//
//  Exports:
//    autoEnrollTenant — trigger /tenants/{tid}/citas/{citaId}
//
//  DEPLOY:
//    firebase deploy --only functions:autoEnrollTenant
// ─────────────────────────────────────────────────────────────────

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { logger }            = require('firebase-functions');
const admin                 = require('firebase-admin');

const { _upsertClienteCore: upsertClienteCore } = require('./upsert-cliente');

// no-op: mantiene la ref por si algún módulo importa admin.firestore
admin.firestore;

// Tenants con auto-enroll activado. Para sumar otro, agregar su tenantId acá.
const AUTO_ENROLL_TENANTS = new Set([
  'aura',
  'lumen',        // D'Jones Barber (passwordless, mismo criterio que aura)
  'yugen',        // Yügen Studio — necesario para listar clientes en Corte al Lápiz
  'sionbarberia', // Studio Dieciséis — cero fricción al Club
  'infinity',     // Infinity Studio — passwordless + import batch cargado 2026-07
]);

async function autoEnroll(tid, citaId, cita) {
  if (!AUTO_ENROLL_TENANTS.has(tid)) return;

  // Si la cita ya trae clienteUid (Fase 1: agenda/booking/registro llamaron
  // upsertCliente en el cliente), no hay nada que hacer.
  if (cita.clienteUid || cita.userId) return;

  const nombre = String(cita.clienteNombre || '').trim();
  const email  = (cita.clienteEmail || '').toLowerCase().trim();
  const tel    = String(cita.clienteTelefono || '').trim();

  if (!nombre) return;
  if (!email && !tel) return;

  try {
    const res = await upsertClienteCore({
      tenantId: tid,
      nombre,
      email,
      telefono: tel,
    });
    logger.info(`[AutoEnroll] ${tid}/${citaId}: ${res.wasCreated ? 'CREATE' : 'MERGE'} uid=${res.uid} matchedBy=${res.matchedBy || 'none'} · "${nombre}"`);
  } catch (e) {
    logger.error(`[AutoEnroll] ${tid}/${citaId}: error:`, e?.message || e);
  }
}

exports.autoEnrollTenant = onDocumentCreated(
  'tenants/{tid}/citas/{citaId}',
  async (event) => {
    const cita = event.data?.data();
    if (!cita) return null;
    try {
      await autoEnroll(event.params.tid, event.params.citaId, cita);
    } catch (e) {
      logger.error(`[AutoEnroll] ${event.params.tid}/${event.params.citaId}: error inesperado:`, e);
    }
    return null;
  },
);
