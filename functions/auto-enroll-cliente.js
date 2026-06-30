'use strict';

// functions/auto-enroll-cliente.js
// ─────────────────────────────────────────────────────────────────
//  AUTO-ENROLL AL CLUB DE FIDELIDAD
//
//  Cuando un tenant tiene auto-enroll habilitado (ej. aura), cada cita
//  nueva crea automáticamente un perfil pasivo en users/ para el cliente
//  (si todavía no existe). Esto permite que la CF sello-automatico le
//  sume sello al completar la cita, aunque el cliente nunca se haya
//  registrado activamente en el Club.
//
//  Cuando el cliente DECIDE registrarse voluntariamente con email+password,
//  la CF dedupeOnCreateTenant detecta el perfil pasivo y fusiona los
//  sellos/historial al nuevo doc de Firebase Auth.
//
//  Modelo del doc creado (en tenants/{tid}/users/{telefonoNormalizado}):
//    {
//      uid:          telefonoNormalizado,   // marca de perfil pasivo
//      nombre, email, telefono,
//      sellosDisponibles: 0,
//      sellosHistoricos:  0,
//      stamps:            0,
//      autoEnrolledFrom:  'cita_{citaId}',
//      autoEnrolledAt:    serverTimestamp(),
//      creadoEn:          serverTimestamp(),
//    }
//
//  Tenants con auto-enroll habilitado: configurable abajo en AUTO_ENROLL_TENANTS.
//  Para agregar otro tenant, solo añadirlo al array.
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
const { FieldValue }        = require('firebase-admin/firestore');

const db = admin.firestore();

// Tenants con auto-enroll activado. Para sumar otro, agregar su tenantId acá.
const AUTO_ENROLL_TENANTS = new Set([
  'aura',
  'lumen', // D'Jones Barber (sin contraseña al Club, igual que aura)
  'yugen', // Yügen Studio — necesario para listar clientes en Corte al Lápiz
]);

function normalizePhone(phone) {
  return (phone || '').replace(/\D/g, '');
}

// Variantes para hacer lookup robusto (mismo helper que dedupe-cliente).
function phoneVariants(rawPhone) {
  const variants = new Set();
  if (!rawPhone) return [];
  const raw  = String(rawPhone).trim();
  const norm = raw.replace(/\D/g, '');
  if (raw)  variants.add(raw);
  if (norm) {
    variants.add(norm);
    variants.add('+' + norm);
    if (norm.startsWith('56') && norm.length >= 10) {
      const sin56 = norm.slice(2);
      variants.add(sin56);
      variants.add('+' + sin56);
    }
    if (!norm.startsWith('56') && norm.length === 9) {
      variants.add('56' + norm);
      variants.add('+56' + norm);
    }
  }
  return [...variants].filter(Boolean);
}

async function existeClienteEnUsers(tid, telRaw, email) {
  const usersCol = db.collection(`tenants/${tid}/users`);

  // 1) Lookup por variantes de teléfono (como doc.id)
  if (telRaw) {
    const variants = phoneVariants(telRaw);
    const snaps = await Promise.all(variants.map(v => usersCol.doc(v).get().catch(() => null)));
    if (snaps.some(s => s && s.exists)) return true;

    // Por campo `telefono` con cada variante
    const fieldSnaps = await Promise.all(
      variants.map(v => usersCol.where('telefono', '==', v).limit(1).get().catch(() => ({ docs: [] })))
    );
    if (fieldSnaps.some(q => q.docs.length > 0)) return true;
  }

  // 2) Lookup por email (case-insensitive normalizado)
  const emailN = (email || '').toLowerCase().trim();
  if (emailN) {
    const q = await usersCol.where('email', '==', emailN).limit(1).get().catch(() => ({ docs: [] }));
    if (q.docs.length > 0) return true;
  }

  return false;
}

async function autoEnroll(tid, citaId, cita) {
  if (!AUTO_ENROLL_TENANTS.has(tid)) return;

  const telRaw = String(cita.clienteTelefono || '').trim();
  const telN   = normalizePhone(telRaw);
  const email  = (cita.clienteEmail || '').toLowerCase().trim();
  const nombre = String(cita.clienteNombre || '').trim();

  // Silenciosos (estos paths disparan en cada cita sin hacer nada):
  if (!telN && !email) return;
  if (await existeClienteEnUsers(tid, telRaw, email)) return; // ya existe, OK
  if (!telN) return; // sólo email sin tel: no podemos crear doc

  const docId = telN || telRaw; // siempre usar teléfono normalizado como docId
  const userRef = db.collection(`tenants/${tid}/users`).doc(docId);

  const data = {
    uid:                docId, // marca de perfil pasivo (uid === id)
    nombre:             nombre || 'Cliente',
    telefono:           telRaw || telN,
    ...(email ? { email } : {}),
    sellosDisponibles:  0,
    sellosHistoricos:   0,
    stamps:             0,
    autoEnrolledFrom:   `cita_${citaId}`,
    autoEnrolledAt:     FieldValue.serverTimestamp(),
    creadoEn:           FieldValue.serverTimestamp(),
    updatedAt:          FieldValue.serverTimestamp(),
  };

  // También sembrar el doc paralelo en /clientes (consistente con el modelo
  // existente: clientes/{telefonoNormalizado} con uid).
  const clienteRef = db.collection(`tenants/${tid}/clientes`).doc(docId);
  const clienteData = {
    nombre:    nombre || 'Cliente',
    telefono:  telRaw || telN,
    uid:       docId,
    ...(email ? { email } : {}),
    autoEnrolledFrom: `cita_${citaId}`,
    autoEnrolledAt:   FieldValue.serverTimestamp(),
    updatedAt:        FieldValue.serverTimestamp(),
  };

  try {
    const batch = db.batch();
    batch.set(userRef,    data,         { merge: true });
    batch.set(clienteRef, clienteData,  { merge: true });
    await batch.commit();
    logger.info(`[AutoEnroll] ${tid}/${citaId}: cliente "${nombre || telN}" enrolado pasivo en users/${docId}.`);
  } catch (e) {
    logger.error(`[AutoEnroll] ${tid}/${citaId}: error al crear perfil:`, e);
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
