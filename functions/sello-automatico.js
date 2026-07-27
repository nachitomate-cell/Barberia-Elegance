'use strict';

// functions/sello-automatico.js
// ─────────────────────────────────────────────────────────────────
//  SELLO AUTOMÁTICO AL COMPLETAR CITA — Fase 3.C
//
//  Dispara cuando cita.estado cambia a 'completada' (o 'Completada').
//  Decide si corresponde sello de fidelidad o descuento de membresía:
//
//    1. Si el cliente tiene membresía activa con usos del servicio
//       → decrementa remainingServices[key] (NO suma sello)
//    2. Si no tiene membresía
//       → incrementa sellosDisponibles y sellosHistoricos según su rango
//
//  Idempotente: escribe selloProcesado=true en la cita para evitar
//  doble procesamiento si la función se re-ejecuta.
//
//  Fase 3.C: fuente de verdad = users/. Antes escribía en paralelo a
//  clientes/{tel} (mirror histórico) y users/{uid}; ahora solo users/.
//  El clienteUid ya viene resuelto en la mayoría de citas gracias a la
//  Fase 1 (upsertCliente en client-side) + rescate-cliente-cita.js
//  (trigger server-side de rescate al crear cita). Solo quedan
//  fallbacks para citas legacy sin clienteUid.
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
const marca                 = require('./lib/kronnos-marca');

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
// Kronnos (Camino 1.5): users es marca-level → tenants/kronnos/users para
// todos los legacy. citas queda per-sede.
function colecciones(tenantId) {
  const isElegance = tenantId === 'elegance';
  const usersTid   = marca.marcaAwareTenant(tenantId, 'users');
  return {
    users: db.collection(isElegance ? 'users' : `tenants/${usersTid}/users`),
    citas: db.collection(isElegance ? 'citas' : `tenants/${tenantId}/citas`),
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

// ── Corte al Lápiz (Yūgen): membresía a cuenta corriente ──────────
//  Si el cliente que completa la cita tiene una cuenta Corte al Lápiz
//  activa, le sumamos a su cuota el PRECIO del servicio + un recargo
//  (default $5.000 por usar el crédito). Paga el total a fin de mes.
//  Idempotente por citaId: si la cuenta ya tiene un cargo de esta cita,
//  no vuelve a sumar. La cuenta vive en tenants/{tid}/corteLapiz/{uid}.
const CORTE_LAPIZ_RECARGO_DEFAULT = 5000;
// Tenants con la membresía Corte al Lápiz activa (evita lecturas extra en el resto).
const CORTE_LAPIZ_TENANTS = new Set(['yugen']);

async function acreditarCorteLapiz({ tenantId, uid, telefono, cita, citaId }) {
  if (!CORTE_LAPIZ_TENANTS.has(tenantId)) return;
  // Solo se acredita si la cita se marcó explícitamente como Corte al Lápiz
  // (reserva online con la opción, o el barbero la cobró "a fin de mes").
  // Así un miembro que paga normal ese día NO se carga a su cuota.
  if (cita.corteLapiz !== true) return;
  try {
    const col = db.collection(`tenants/${tenantId}/corteLapiz`);

    // Buscar la cuenta: primero por uid (resuelto o el clienteUid de la cita),
    // luego por teléfono normalizado.
    let cuentaRef = null;
    for (const u of [uid, cita.clienteUid].filter(Boolean)) {
      const d = await col.doc(u).get();
      if (d.exists) { cuentaRef = d.ref; break; }
    }
    if (!cuentaRef && telefono) {
      const q = await col.where('telefonoNorm', '==', telefono).limit(1).get();
      if (!q.empty) cuentaRef = q.docs[0].ref;
    }
    if (!cuentaRef) return; // el cliente no es miembro Corte al Lápiz

    // Recargo configurable (tenants/{tid}/configuracion/corteLapiz.recargo).
    let recargo = CORTE_LAPIZ_RECARGO_DEFAULT;
    try {
      const cfg = await db.doc(`tenants/${tenantId}/configuracion/corteLapiz`).get();
      // Soporta el campo nuevo (recargo) y el antiguo (monto).
      const r = cfg.exists ? Number(cfg.data().recargo ?? cfg.data().monto) : NaN;
      if (Number.isFinite(r) && r >= 0) recargo = Math.round(r);
    } catch (_) {}

    const precio = Math.round(Number(cita.precio) || 0);
    const total  = precio + recargo;

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(cuentaRef);
      if (!snap.exists) return;
      const data = snap.data();
      if (data.activo === false) return;                                   // membresía desactivada
      if ((data.servicios || []).some(s => s.citaId === citaId)) return;   // ya cargado (idempotente)

      tx.update(cuentaRef, {
        saldo: FieldValue.increment(total),
        servicios: FieldValue.arrayUnion({
          citaId,
          fecha:          cita.fecha || Timestamp.now().toDate().toISOString().split('T')[0],
          servicioNombre: cita.servicioNombre || cita.servicio || '',
          precio,
          recargo,
          monto: total,
          ts: Timestamp.now(),
        }),
        updatedAt: Timestamp.now(),
      });
    });
    logger.info(`[CorteLapiz] ${citaId} (${tenantId}): +$${total} (precio $${precio} + recargo $${recargo}) a la cuota de ${cuentaRef.id}`);
  } catch (e) {
    logger.error(`[CorteLapiz] ${citaId} (${tenantId}): error acreditando cuota:`, e);
  }
}

// ── Rangos: sellos por visita según el rango del cliente ──────────
//  El rango se deriva de sellosHistoricos (espejo de calcTier en el panel).
//  La config vive en {tenant}/configuracion/rangos (elegance: raíz).
//  Si no hay config o no define sellosPorVisita → 1 (comportamiento histórico).
function calcRangoId(historicos) {
  const h = Number(historicos) || 0;
  if (h >= 25) return 'platinum';
  if (h >= 10) return 'gold';
  return 'silver';
}

function rangosConfigRef(tenantId) {
  return tenantId === 'elegance'
    ? db.doc('configuracion/rangos')
    : db.doc(`tenants/${tenantId}/configuracion/rangos`);
}

async function sellosPorVisita(tenantId, historicos) {
  try {
    const snap = await rangosConfigRef(tenantId).get();
    if (snap.exists) {
      const rangoId = calcRangoId(historicos);
      const r = (snap.data().rangos || []).find(x => x.id === rangoId);
      const n = r ? Math.round(Number(r.sellosPorVisita)) : NaN;
      if (Number.isFinite(n) && n >= 0) return n;
    }
  } catch (e) {
    logger.warn(`[Sello] no se pudo leer rangos (${tenantId}): ${e.message}`);
  }
  return 1;
}

// ── Cliente propio del barbero (cartera externa) ──────────────────
//  En Oren, los barberos pueden traer su propia cartera de clientes que
//  marcan con un sufijo en el nombre (ej. Pablo → "Jorgito xuni cp").
//  Esos clientes NO son del club de fidelidad del local: no acumulan
//  sellos, no descuentan membresía, no entran a Corte al Lápiz. La
//  detección requiere:
//    (1) tenantId === 'oren' (gate estricto, no accidental en otros tenants)
//    (2) el barbero de la cita tiene sufijoClientePropio configurado
//    (3) el nombre del cliente termina con ese sufijo (case-insensitive)
//  Si cualquiera falla → sigue el flujo normal de sellos.
const OREN_CARTERA_TENANTS = new Set(['oren']);

async function esClientePropioDelBarbero({ tenantId, barberoId, clienteNombre }) {
  if (!OREN_CARTERA_TENANTS.has(tenantId)) return false;
  if (!barberoId || !clienteNombre) return false;
  try {
    const bSnap = await db.doc(`tenants/${tenantId}/barberos/${barberoId}`).get();
    if (!bSnap.exists) return false;
    const suf = String(bSnap.data()?.sufijoClientePropio || '').trim().toLowerCase();
    if (!suf) return false;
    const nombre = String(clienteNombre).trim().toLowerCase();
    const rx = new RegExp(`(^|\\s)${suf.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i');
    return rx.test(nombre);
  } catch (_) { return false; }
}

// ── Resolver uid en users/ para citas legacy (sin clienteUid) ─────
//  Flujo canónico Fase 1+: la cita YA trae clienteUid gracias a
//  upsertCliente (client-side) o rescate-cliente-cita.js (server-side).
//  Este fallback cubre citas viejas o edge-cases donde ambos fallaron.
//
//  Orden de resolución:
//    1. email exacto (identificador humano único)
//    2. telefonoSuf9 (últimos 9 dígitos — evita bugs de formato "+56 9 ..." vs "9...")
//    3. telefono exacto en variantes (raw, normalizado)
//
//  NOTA: no aplicamos la regla híbrida anti-familia acá porque este
//  es un fallback muy defensivo; si hay ambigüedad devolvemos el
//  primer match y confiamos en que rescate-cliente-cita.js ya hizo
//  el trabajo bien la mayoría del tiempo.
async function resolverUidEnUsers(usersCol, cita) {
  const email = String(cita.clienteEmail || cita.email || '').toLowerCase().trim();
  if (email) {
    try {
      const q = await usersCol.where('email', '==', email).limit(1).get();
      if (!q.empty) return q.docs[0].id;
    } catch (_) {}
  }

  const digs = String(cita.clienteTelefono || '').replace(/\D+/g, '');
  const suf9 = digs.length >= 9 ? digs.slice(-9) : '';
  if (suf9) {
    try {
      const q = await usersCol.where('telefonoSuf9', '==', suf9).limit(1).get();
      if (!q.empty) return q.docs[0].id;
    } catch (_) {}
  }

  const rawTel = String(cita.clienteTelefono || '').trim();
  const telN   = normalizePhone(cita.clienteTelefono);
  const variants = [...new Set([rawTel, telN].filter(Boolean))];
  for (const v of variants) {
    try {
      const q = await usersCol.where('telefono', '==', v).limit(1).get();
      if (!q.empty) return q.docs[0].id;
    } catch (_) {}
  }

  return null;
}

// ── Lógica principal ──────────────────────────────────────────────
async function procesarSello({ tenantId, citaId, citaRef, cita }) {
  const cols = colecciones(tenantId);

  const telefono       = normalizePhone(cita.clienteTelefono);
  const clienteNombre  = cita.clienteNombre || cita.nombre || 'Cliente';
  const servicioNombre = cita.servicioNombre || cita.servicio || '';
  const servicioId     = cita.servicioId || null;
  const barberoId      = cita.barberoId  || null;

  // Skip TOTAL para clientes propios del barbero (Oren + sufijo). Ver comentario
  // del helper: cartera externa del barbero, no del club.
  if (await esClientePropioDelBarbero({ tenantId, barberoId, clienteNombre })) {
    logger.info(`[Sello] ${citaId} (${tenantId}): SKIP cliente propio del barbero (${clienteNombre}). No acumula sellos ni membresía.`);
    return;
  }

  // ── 1. Resolver uid del cliente ────────────────────────────────
  // Prioridad: clienteUid (Fase 1) → userId legacy → búsqueda en users/.
  let uid = cita.clienteUid || cita.userId || null;
  if (!uid) {
    uid = await resolverUidEnUsers(cols.users, cita);
    if (uid) {
      logger.info(`[Sello] ${citaId}: uid resuelto por fallback (${uid}) — cita legacy sin clienteUid`);
      // Backfill del clienteUid en la cita para que Métricas/panel también lo vean
      try { await citaRef.update({ clienteUid: uid }); } catch (_) {}
    }
  }

  // Seguir puntero de fusión: si el uid apunta a un doc legacy que fue
  // fusionado con la cuenta del club (users/{authUid}), redirigir al canónico.
  // Sin esto, los sellos siguen yendo al legacy tras la fusión.
  if (uid) {
    try {
      const uSnap = await cols.users.doc(uid).get();
      const fusionadoCon = uSnap.exists ? uSnap.data()?.fusionadoCon : null;
      if (fusionadoCon && fusionadoCon !== uid) {
        logger.info(`[Sello] ${citaId}: uid ${uid} está fusionado con ${fusionadoCon} — redirigo sellos al canónico`);
        uid = fusionadoCon;
      }
    } catch (e) {
      logger.warn(`[Sello] ${citaId}: no se pudo verificar fusionadoCon: ${e.message}`);
    }
  }

  // ── 2. Corte al Lápiz: sumar el servicio a la cuota del miembro ─
  await acreditarCorteLapiz({ tenantId, uid, telefono: telefono || null, cita, citaId });

  // ── 3. Sin uid: no podemos sumar sello en users/ ────────────────
  if (!uid) {
    logger.warn(`[Sello] ${citaId} (${tenantId}): sin uid identificable (nombre="${clienteNombre}", tel="${cita.clienteTelefono || ''}", email="${cita.clienteEmail || ''}"). Marco pendingGoogleReview pero NO sumo sello.`);
    try {
      await citaRef.update({
        selloProcesado:      true,
        selloProcesadoEn:    Timestamp.now(),
        selloProcesadoTipo:  'omitido_sin_identificacion',
        pendingGoogleReview: true,
      });
    } catch (e) {
      logger.error(`[Sello] ${citaId}: no se pudo marcar pendingGoogleReview:`, e);
    }
    return;
  }

  // ── 4. Sincronizar telefonoSuf9 en users/{uid} para próximas resoluciones ─
  const digs = String(cita.clienteTelefono || '').replace(/\D+/g, '');
  const suf9 = digs.length >= 9 ? digs.slice(-9) : '';
  if (suf9) {
    try {
      const userSnap = await cols.users.doc(uid).get();
      if (userSnap.exists && userSnap.data()?.telefonoSuf9 !== suf9) {
        await cols.users.doc(uid).update({ telefonoSuf9: suf9 });
      }
    } catch (e) {
      logger.warn(`[Sello] ${citaId}: no se pudo sincronizar telefonoSuf9: ${e.message}`);
    }
  }

  // ── 5. Verificar membresía ─────────────────────────────────────
  const servicioKey = servicioAKey(servicioNombre);
  const membresia   = servicioKey
    ? await verificarMembresia(cols.users, uid, servicioKey)
    : { aplicable: false };

  const userRef = cols.users.doc(uid);

  if (membresia.aplicable) {
    // ── Rama A: descontar uso de membresía ───────────────────────
    await userRef.update({
      [`subscription.remainingServices.${servicioKey}`]: FieldValue.increment(-1),
      'subscription.ultimoUso': Timestamp.now(),
    });
    logger.info(`[Sello] ${citaId} (${tenantId}): -1 uso de membresía (${servicioKey}) para ${uid}`);
  } else {
    // ── Rama B: sumar sello(s) de fidelidad según el rango ───────
    let historicos = 0;
    try {
      const us = await userRef.get();
      if (us.exists) {
        const d = us.data();
        historicos = Number(d.sellosHistoricos ?? d.stamps) || 0;
      }
    } catch (_) {}

    const nSellos   = await sellosPorVisita(tenantId, historicos);
    const notaSello = nSellos === 1
      ? `Cita completada: ${servicioNombre}`
      : `Cita completada (+${nSellos} sellos): ${servicioNombre}`;

    // Kronnos: sedeId de origen (la sede donde ocurrió la cita) para
    // sellosPorSede[sedeId] + marca en historial (canje predominante).
    const sedeOrigen = marca.sedeIdFromLegacy(tenantId);
    const upd = {
      sellosDisponibles: FieldValue.increment(nSellos),
      sellosHistoricos:  FieldValue.increment(nSellos),
      stamps:            FieldValue.increment(nSellos),
      ultimoSello:       Timestamp.now().toDate().toISOString(),
      historialSellos:   FieldValue.arrayUnion({
        fecha:    Timestamp.now().toDate().toISOString(),
        tipo:     'suma',
        cantidad: nSellos,
        nota:     notaSello,
        citaId,
        ...(sedeOrigen ? { sedeId: sedeOrigen } : {}),
      }),
    };
    if (sedeOrigen) upd[`sellosPorSede.${sedeOrigen}`] = FieldValue.increment(nSellos);

    try {
      await userRef.update(upd);
      logger.info(`[Sello] ${citaId} (${tenantId}): +${nSellos} sello(s) a users/${uid}`);
    } catch (e) {
      // Este es el fallo crítico. Loggeamos con nivel error para alertar.
      logger.error(`[Sello] ${citaId}: fallo escritura en users/${uid}: ${e.message}`, {
        citaId, uid, tenantId, telefono, nSellos,
      });
    }
  }

  // ── 6. Marcar la cita como procesada (idempotencia atómica) ─────
  // Usamos transacción para evitar race condition si la CF se reintenta
  // antes de que selloProcesado=true quede persistido.
  const yaProc = await db.runTransaction(async tx => {
    const snap = await tx.get(citaRef);
    if (snap.data()?.selloProcesado === true) return true; // ya procesada
    tx.update(citaRef, {
      selloProcesado: true,
      selloProcesadoEn: Timestamp.now(),
      selloProcesadoTipo: membresia.aplicable ? 'membresia' : 'sello',
      pendingGoogleReview: true,
    });
    return false;
  });
  if (yaProc) {
    logger.info(`[Sello] ${citaId}: transacción detectó selloProcesado ya escrito, abortando.`);
    return;
  }

  logger.info(`[Sello] ${citaId}: procesado OK (${membresia.aplicable ? 'membresía' : 'sello'})`);
}

// ── Guard común: filtra solo la transición a completada ───────────
function debesProcesar(before, after, citaId) {
  if (!after) return false; // doc eliminado

  const estadoAntes   = (before?.estado || '').toLowerCase();
  const estadoDespues = (after.estado   || '').toLowerCase();

  if (estadoDespues !== 'completada') return false;   // no es completada
  if (estadoAntes   === 'completada') return false;   // ya estaba completada

  if (after.selloProcesado === true) {                 // idempotencia (silencioso)
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
