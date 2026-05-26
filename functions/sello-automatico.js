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
    logger.warn(`[Sello] ${citaId}: sin teléfono en la cita. No suma sello pero igual habilita el modal de Google review.`);
    // Aun sin teléfono, asegurar que el cliente vea la pantalla de calificación al abrir su dashboard.
    // Marcamos selloProcesado=true para no reintentar (la cita ya no cambiará de teléfono retroactivamente
    // en flujos normales; si el admin lo agrega después puede usar el botón "Añadir sello" manual).
    try {
      await citaRef.update({
        selloProcesado:      true,
        selloProcesadoEn:    Timestamp.now(),
        selloProcesadoTipo:  'omitido_sin_telefono',
        pendingGoogleReview: true,
      });
    } catch (e) {
      logger.error(`[Sello] ${citaId}: no se pudo marcar pendingGoogleReview sin teléfono:`, e);
    }
    return;
  }

  const servicioKey = servicioAKey(servicioNombre);

  // ── 1. Obtener o crear doc del cliente ─────────────────────────
  // El doc de clientes usa el teléfono normalizado (sin símbolo +, con código de país).
  // Intentamos primero con el teléfono tal como viene de la cita; si no existe,
  // probamos la variante con/sin código de país '56' para manejar formatos distintos
  // entre el formulario de reserva y el de registro.
  let clienteRef  = cols.clientes.doc(telefono);
  let clienteSnap = await clienteRef.get();

  if (!clienteSnap.exists) {
    const alt = telefono.startsWith('56') && telefono.length >= 10
      ? telefono.slice(2)                          // 56912345678 → 912345678
      : (telefono.length === 9 ? '56' + telefono : null); // 912345678 → 56912345678
    if (alt) {
      const altSnap = await cols.clientes.doc(alt).get();
      if (altSnap.exists) {
        clienteRef  = cols.clientes.doc(alt);
        clienteSnap = altSnap;
      }
    }
  }

  const clienteData = clienteSnap.exists ? clienteSnap.data() : null;

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
    logger.info(`[Sello] ${citaId}: cliente creado → ${clienteRef.id}`);
  }

  let uid = clienteData?.uid ?? null;

  // Si el doc de clientes existe pero no tiene uid, buscar en users por teléfono.
  // Esto ocurre cuando la cita fue creada con un formato de teléfono distinto al del registro.
  if (!uid) {
    try {
      const rawPhone = (cita.clienteTelefono || '').trim();
      const variants = [...new Set([rawPhone, telefono, clienteRef.id])].filter(Boolean);
      for (const v of variants) {
        const q = await cols.users.where('telefono', '==', v).limit(1).get();
        if (!q.empty) {
          uid = q.docs[0].id;
          await clienteRef.update({ uid });
          logger.info(`[Sello] ${citaId}: uid resuelto por teléfono → ${uid}`);
          break;
        }
      }
    } catch (e) {
      logger.warn(`[Sello] ${citaId}: fallback uid por teléfono falló: ${e.message}`);
    }
  }

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
    pendingGoogleReview: true,
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

// Si el flujo principal falla, al menos garantizamos que el cliente vea
// el modal de Google review al abrir su dashboard.
async function asegurarPendingGoogleReview(citaRef, citaId, scope = '') {
  try {
    await citaRef.update({ pendingGoogleReview: true });
    logger.info(`[Sello] ${citaId}${scope}: pendingGoogleReview=true asegurado tras error.`);
  } catch (e) {
    logger.error(`[Sello] ${citaId}${scope}: no se pudo asegurar pendingGoogleReview:`, e);
  }
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
    await asegurarPendingGoogleReview(event.data.after.ref, citaId);
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
      await asegurarPendingGoogleReview(event.data.after.ref, citaId, ` (${tid})`);
    }

    return null;
  },
);
