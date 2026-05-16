'use strict';

// functions/sello-automatico.js
// ─────────────────────────────────────────────────────────────────
//  SELLO AUTOMÁTICO AL COMPLETAR CITA
//
//  Dispara cuando cita.estado cambia a 'completada' (o 'Completada').
//  Decide si corresponde sello de fidelidad o descuento de membresía:
//
//    1. Si el cliente tiene membresía activa con usos del servicio
//       → decrementa remainingServices[key] (NO suma sello)
//    2. Si no tiene membresía
//       → incrementa sellosDisponibles y sellosHistoricos en +1
//
//  Idempotente: escribe selloProcesado=true en la cita para evitar
//  doble procesamiento si la función se re-ejecuta.
//
//  Exports:
//    sellosElegance  — trigger en /citas/{citaId}
//    sellosTenant    — trigger en /tenants/{tid}/citas/{citaId}
//
//  DEPLOY:
//    firebase deploy --only functions:sellosElegance,functions:sellosTenant
// ─────────────────────────────────────────────────────────────────

const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { logger }            = require('firebase-functions');
const admin                 = require('firebase-admin');
const { FieldValue, Timestamp } = require('firebase-admin/firestore');

const db = admin.firestore();

// ── Mapeo servicioNombre → clave en remainingServices ─────────────
// Espejo del SERVICIO_KEY_MAP de plans.js (React). Actualizar ambos
// si se agregan nuevas categorías de servicio.
const SERVICIO_KEY_MAP = {
  'Corte Clásico':      'cortes',
  'Corte Degradado':    'cortes',
  'Corte Tradicional':  'cortes',
  'Corte':              'cortes',
  'Fade':               'cortes',
  'Arreglo de Barba':   'barba',
  'Barba':              'barba',
  'Perfilado de Barba': 'barba',
  'Masaje Capilar':     'masaje',
  'Masaje':             'masaje',
};

function servicioAKey(nombreServicio = '') {
  const nombre = (nombreServicio || '').trim();
  if (SERVICIO_KEY_MAP[nombre]) return SERVICIO_KEY_MAP[nombre];
  const lower = nombre.toLowerCase();
  if (lower.includes('corte') || lower.includes('fade') || lower.includes('degradado')) return 'cortes';
  if (lower.includes('barba') || lower.includes('beard'))  return 'barba';
  if (lower.includes('masaje') || lower.includes('massage')) return 'masaje';
  return null;
}

function normalizePhone(phone) {
  return (phone || '').replace(/\D/g, '');
}

// ── Colecciones según tenant ──────────────────────────────────────
function colecciones(tenantId) {
  const isElegance = tenantId === 'elegance';
  return {
    clientes: db.collection(isElegance ? 'clientes'      : `tenants/${tenantId}/clientes`),
    users:    db.collection(isElegance ? 'users'         : `tenants/${tenantId}/users`),
    citas:    db.collection(isElegance ? 'citas'         : `tenants/${tenantId}/citas`),
  };
}

// ── Verifica si el usuario tiene membresía activa con usos ────────
async function verificarMembresia(usersCol, uid, servicioKey) {
  if (!uid || !servicioKey) return { aplicable: false };

  const snap = await usersCol.doc(uid).get();
  if (!snap.exists) return { aplicable: false };

  const sub = snap.data()?.subscription;
  if (!sub || sub.status !== 'active') return { aplicable: false };

  // Verificar que no esté vencida
  const vence = sub.currentPeriodEnd?.toDate?.() ?? new Date(0);
  if (vence < new Date()) return { aplicable: false };

  const restantes = sub.remainingServices?.[servicioKey] ?? 0;
  if (restantes <= 0) return { aplicable: false };

  return { aplicable: true, restantes };
}

// ── Lógica principal ──────────────────────────────────────────────
async function procesarSello({ tenantId, citaId, citaRef, cita }) {
  const cols = colecciones(tenantId);

  const telefono      = normalizePhone(cita.clienteTelefono);
  const clienteNombre = cita.clienteNombre || cita.nombre || 'Cliente';
  const clienteEmail  = cita.clienteEmail  || cita.email  || null;
  const servicioNombre = cita.servicioNombre || cita.servicio || '';
  const servicioId     = cita.servicioId || null;
  const barberoId      = cita.barberoId  || null;

  if (!telefono) {
    logger.warn(`[Sello] ${citaId}: sin teléfono en la cita, saltando.`);
    await citaRef.update({ selloProcesado: true });
    return;
  }

  const servicioKey = servicioAKey(servicioNombre);

  // ── 1. Obtener o crear doc del cliente ─────────────────────────
  const clienteRef  = cols.clientes.doc(telefono);
  const clienteSnap = await clienteRef.get();

  const clienteData = clienteSnap.exists
    ? clienteSnap.data()
    : null;

  if (!clienteSnap.exists) {
    await clienteRef.set({
      nombre:   clienteNombre,
      telefono: cita.clienteTelefono,
      email:    clienteEmail,
      sellosDisponibles:  0,
      sellosHistoricos:   0,
      historial:          [],
      creadoEn:           Timestamp.now(),
      updatedAt:          Timestamp.now(),
    });
    logger.info(`[Sello] ${citaId}: cliente creado → ${telefono}`);
  }

  const uid = clienteData?.uid ?? null;

  // ── 2. Verificar membresía ─────────────────────────────────────
  const membresia = uid && servicioKey
    ? await verificarMembresia(cols.users, uid, servicioKey)
    : { aplicable: false };

  // Entrada de historial (se añade en ambas ramas)
  const entradaHistorial = {
    citaId,
    fecha:       cita.fecha      || Timestamp.now().toDate().toISOString().split('T')[0],
    hora:        cita.hora       || null,
    servicioId,
    servicioNombre,
    barberoId,
    tipo:        membresia.aplicable ? 'membresia' : 'sello',
    procesadoEn: Timestamp.now(),
  };

  if (membresia.aplicable) {
    // ── Rama A: descontar uso de membresía ──────────────────────
    logger.info(`[Sello] ${citaId}: membresía activa → desconta ${servicioKey} para uid=${uid}`);

    const userRef = cols.users.doc(uid);
    await userRef.update({
      [`subscription.remainingServices.${servicioKey}`]: FieldValue.increment(-1),
      'subscription.ultimoUso': Timestamp.now(),
    });

    await clienteRef.update({
      historial: FieldValue.arrayUnion(entradaHistorial),
      updatedAt: Timestamp.now(),
    });

    logger.info(`[Sello] ${citaId}: membresía descontada (${servicioKey}). Restantes: ${membresia.restantes - 1}`);
  } else {
    // ── Rama B: sumar sello de fidelidad ───────────────────────
    logger.info(`[Sello] ${citaId}: sin membresía activa → sumando sello a ${telefono}`);

    // Actualizar clientes/{phone} (lookup por teléfono, fuente de verdad para flujos web)
    await clienteRef.update({
      sellosDisponibles:  FieldValue.increment(1),
      sellosHistoricos:   FieldValue.increment(1),
      historial:          FieldValue.arrayUnion(entradaHistorial),
      updatedAt:          Timestamp.now(),
    });

    // Sincronizar en users/{uid} para que el panel admin muestre el sello al instante
    // (mismos campos que usa el botón "Añadir sello" en /gestion-interna/clientes)
    if (uid) {
      const userRef = cols.users.doc(uid);
      await userRef.update({
        sellosDisponibles: FieldValue.increment(1),
        sellosHistoricos:  FieldValue.increment(1),
        stamps:            FieldValue.increment(1),
        ultimoSello:       Timestamp.now().toDate().toISOString(),
        historialSellos:   FieldValue.arrayUnion({
          fecha:    Timestamp.now().toDate().toISOString(),
          tipo:     'suma',
          cantidad: 1,
          nota:     `Cita completada: ${servicioNombre}`,
          citaId,
        }),
      });
      logger.info(`[Sello] ${citaId}: sello sincronizado en users/${uid}`);
    }

    logger.info(`[Sello] ${citaId}: +1 sello para ${clienteNombre} (${telefono})`);
  }

  // ── 3. Marcar la cita como procesada (idempotencia) ────────────
  await citaRef.update({
    selloProcesado: true,
    selloProcesadoEn: Timestamp.now(),
    selloProcesadoTipo: membresia.aplicable ? 'membresia' : 'sello',
  });

  logger.info(`[Sello] ${citaId}: procesado OK (${membresia.aplicable ? 'membresía' : 'sello'})`);
}

// ── Guard común: filtra solo la transición a completada ───────────
function debesProcesar(before, after, citaId) {
  if (!after) return false; // doc eliminado

  const estadoAntes  = (before?.estado  || '').toLowerCase();
  const estadoDespues = (after.estado   || '').toLowerCase();

  if (estadoDespues !== 'completada') return false;   // no es completada
  if (estadoAntes   === 'completada') return false;   // ya estaba completada

  if (after.selloProcesado === true) {                 // idempotencia
    logger.info(`[Sello] ${citaId}: ya procesado, ignorando.`);
    return false;
  }

  return true;
}

// ── Export 1: elegance root (/citas/{citaId}) ─────────────────────
exports.sellosElegance = onDocumentWritten('citas/{citaId}', async (event) => {
  const citaId = event.params.citaId;
  const before = event.data?.before?.data();
  const after  = event.data?.after?.data();

  if (!debesProcesar(before, after, citaId)) return null;

  try {
    await procesarSello({
      tenantId: 'elegance',
      citaId,
      citaRef: event.data.after.ref,
      cita:    after,
    });
  } catch (err) {
    logger.error(`[Sello] ${citaId}: error inesperado:`, err);
  }

  return null;
});

// ── Export 2: multi-tenant (/tenants/{tid}/citas/{citaId}) ────────
exports.sellosTenant = onDocumentWritten(
  'tenants/{tid}/citas/{citaId}',
  async (event) => {
    const { tid, citaId } = event.params;
    const before = event.data?.before?.data();
    const after  = event.data?.after?.data();

    if (!debesProcesar(before, after, citaId)) return null;

    try {
      await procesarSello({
        tenantId: tid,
        citaId,
        citaRef: event.data.after.ref,
        cita:    after,
      });
    } catch (err) {
      logger.error(`[Sello] ${citaId} (${tid}): error inesperado:`, err);
    }

    return null;
  },
);
