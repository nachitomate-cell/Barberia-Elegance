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
// Kronnos (Camino 1.5): users es marca-level → tenants/kronnos/users para todos los legacy.
// clientes también es marca-level (lookup por teléfono cross-sede). citas queda per-sede.
function colecciones(tenantId) {
  const isElegance = tenantId === 'elegance';
  const usersTid    = marca.marcaAwareTenant(tenantId, 'users');
  const clientesTid = marca.marcaAwareTenant(tenantId, 'clientes');
  return {
    clientes: db.collection(isElegance ? 'clientes' : `tenants/${clientesTid}/clientes`),
    users:    db.collection(isElegance ? 'users'    : `tenants/${usersTid}/users`),
    citas:    db.collection(isElegance ? 'citas'    : `tenants/${tenantId}/citas`),
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
    // Sin teléfono: intentar resolver uid desde otros campos de la cita.
    let uidSinTel = cita.clienteUid || null;
    if (!uidSinTel && cita.clienteId) {
      if (cita.clienteId.length > 20) {
        uidSinTel = cita.clienteId; // Firebase UID
      } else {
        // Puede ser el teléfono usado como docId en clientes (e.g. "56999335412")
        try {
          const cliSnap = await cols.clientes.doc(cita.clienteId).get();
          if (cliSnap.exists && cliSnap.data()?.uid) uidSinTel = cliSnap.data().uid;
        } catch (_) {}
      }
    }
    if (!uidSinTel) {
      const email = (cita.clienteEmail || '').toLowerCase().trim();
      if (email) {
        try {
          const q = await cols.users.where('email', '==', email).limit(1).get();
          if (!q.empty) uidSinTel = q.docs[0].id;
        } catch (_) {}
      }
    }

    if (uidSinTel) {
      // Corte al Lápiz: sumar el servicio a la cuota del miembro (sin teléfono).
      await acreditarCorteLapiz({ tenantId, uid: uidSinTel, telefono: null, cita, citaId });

      const svcNombre = cita.servicioNombre || cita.servicio || '';
      const svcKey    = servicioAKey(svcNombre);
      const membresia = svcKey
        ? await verificarMembresia(cols.users, uidSinTel, svcKey)
        : { aplicable: false };
      const tipo = membresia.aplicable ? 'membresia' : 'sello';
      const userRef = cols.users.doc(uidSinTel);

      if (membresia.aplicable) {
        await userRef.update({
          [`subscription.remainingServices.${svcKey}`]: FieldValue.increment(-1),
          'subscription.ultimoUso': Timestamp.now(),
        });
      } else {
        // Sellos según el rango del cliente (sellosPorVisita).
        let histSinTel = 0;
        try {
          const us = await userRef.get();
          if (us.exists) histSinTel = Number(us.data().sellosHistoricos ?? us.data().stamps) || 0;
        } catch (_) {}
        const nSellos   = await sellosPorVisita(tenantId, histSinTel);
        const notaSello = nSellos === 1
          ? `Cita completada: ${svcNombre}`
          : `Cita completada (+${nSellos} sellos): ${svcNombre}`;
        // Kronnos: incrementa sellosPorSede[sedeId] para calcular sede predominante.
        const sedeOrigenSt = marca.sedeIdFromLegacy(tenantId);
        const updSt = {
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
            ...(sedeOrigenSt ? { sedeId: sedeOrigenSt } : {}),
          }),
        };
        if (sedeOrigenSt) updSt[`sellosPorSede.${sedeOrigenSt}`] = FieldValue.increment(nSellos);
        await userRef.update(updSt);
      }
      await citaRef.update({
        selloProcesado:      true,
        selloProcesadoEn:    Timestamp.now(),
        selloProcesadoTipo:  tipo,
        pendingGoogleReview: true,
      });
      logger.info(`[Sello] ${citaId}: procesado sin teléfono (uid=${uidSinTel}, tipo=${tipo})`);
    } else {
      logger.warn(`[Sello] ${citaId}: sin teléfono ni uid identificable. No suma sello.`);
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
  }

  let uid = clienteData?.uid ?? null;

  // Si el doc de clientes existe pero no tiene uid, buscar en users por teléfono o email.
  // Esto ocurre cuando la cita fue creada con un formato de teléfono distinto al del registro
  // (ej: "+56977669503" vs "+56 9 77669503"), o cuando el user guardó su tel con espacios/+.
  if (!uid) {
    try {
      const rawPhone = (cita.clienteTelefono || '').trim();
      const variants = [...new Set([rawPhone, telefono, clienteRef.id])].filter(Boolean);
      for (const v of variants) {
        const q = await cols.users.where('telefono', '==', v).limit(1).get();
        if (!q.empty) {
          uid = q.docs[0].id;
          await clienteRef.update({ uid });
          break;
        }
      }
    } catch (e) {
      logger.warn(`[Sello] ${citaId}: fallback uid por teléfono falló: ${e.message}`);
    }
  }

  // Fallback por sufijo de 9 dígitos (soluciona bug histórico donde el
  // registro guardó "958856719" y la cita "+56 9 5885 6719" → exact match
  // fallaba). Requiere que el user tenga `telefonoSuf9` denormalizado
  // (backfill vía scripts/backfill-users-telefonoSuf9.js).
  if (!uid) {
    try {
      const digs = String(cita.clienteTelefono || '').replace(/\D+/g, '');
      const suf9 = digs.length >= 9 ? digs.slice(-9) : '';
      if (suf9) {
        const q = await cols.users.where('telefonoSuf9', '==', suf9).limit(1).get();
        if (!q.empty) {
          uid = q.docs[0].id;
          await clienteRef.update({ uid });
          logger.info(`[Sello] ${citaId}: uid resuelto por telefonoSuf9 (${suf9})`);
        }
      }
    } catch (e) {
      logger.warn(`[Sello] ${citaId}: fallback uid por telefonoSuf9 falló: ${e.message}`);
    }
  }

  // Fallback final: buscar por email si aún no se encontró uid.
  // Cubre el caso en que el teléfono almacenado en users tiene un formato
  // diferente al de la cita (espacios, +, largo distinto).
  if (!uid && clienteEmail) {
    try {
      const q = await cols.users.where('email', '==', clienteEmail.toLowerCase().trim()).limit(1).get();
      if (!q.empty) {
        uid = q.docs[0].id;
        await clienteRef.update({ uid });
        logger.info(`[Sello] ${citaId}: uid resuelto por email (${clienteEmail})`);
      }
    } catch (e) {
      logger.warn(`[Sello] ${citaId}: fallback uid por email falló: ${e.message}`);
    }
  }

  // Sincronización preventiva de telefonoSuf9 en users/{uid} para próximas
  // resoluciones — solo si logramos identificar al usuario y aún no lo tiene.
  if (uid) {
    try {
      const digs = String(cita.clienteTelefono || '').replace(/\D+/g, '');
      const suf9 = digs.length >= 9 ? digs.slice(-9) : '';
      if (suf9) {
        const userSnap = await cols.users.doc(uid).get();
        if (userSnap.exists && userSnap.data()?.telefonoSuf9 !== suf9) {
          await cols.users.doc(uid).update({ telefonoSuf9: suf9 });
        }
      }
    } catch (e) {
      logger.warn(`[Sello] ${citaId}: no se pudo sincronizar telefonoSuf9: ${e.message}`);
    }
  }

  // ── Corte al Lápiz: sumar el servicio a la cuota del miembro ────
  await acreditarCorteLapiz({ tenantId, uid, telefono, cita, citaId });

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
    const userRef = cols.users.doc(uid);
    await userRef.update({
      [`subscription.remainingServices.${servicioKey}`]: FieldValue.increment(-1),
      'subscription.ultimoUso': Timestamp.now(),
    });

    await clienteRef.update({
      historial: FieldValue.arrayUnion(entradaHistorial),
      updatedAt: Timestamp.now(),
    });
  } else {
    // ── Rama B: sumar sello(s) de fidelidad según el rango ──────
    // La cantidad depende del rango actual del cliente (sellosPorVisita).
    const historicos = Number(clienteData?.sellosHistoricos) || 0;
    const nSellos    = await sellosPorVisita(tenantId, historicos);
    const notaSello  = nSellos === 1
      ? `Cita completada: ${servicioNombre}`
      : `Cita completada (+${nSellos} sellos): ${servicioNombre}`;

    // Actualizar clientes/{phone} (lookup por teléfono, fuente de verdad para flujos web).
    // Usamos set(..., merge:true) en vez de update() para evitar fallos silenciosos
    // cuando el doc no existe (caso raro observado en yugen: cita antigua cuyo
    // clientes/{tel} fue borrado o nunca se creó por race con otra CF).
    try {
      await clienteRef.set({
        sellosDisponibles:  FieldValue.increment(nSellos),
        sellosHistoricos:   FieldValue.increment(nSellos),
        historial:          FieldValue.arrayUnion(entradaHistorial),
        updatedAt:          Timestamp.now(),
        // Aseguramos identidad mínima si el doc se creó recién con este merge
        telefono:           cita.clienteTelefono || telefono,
        ...(clienteNombre ? { nombre: clienteNombre } : {}),
      }, { merge: true });
    } catch (e) {
      logger.error(`[Sello] ${citaId}: fallo escritura en clientes/${clienteRef.id}: ${e.message}`);
      // No abortamos: seguimos con users/ que es lo que ve el cliente final
    }

    // Sincronizar en users/{uid} para que el panel admin muestre el sello al instante
    // (mismos campos que usa el botón "Añadir sello" en /gestion-interna/clientes)
    if (uid) {
      try {
        const userRef = cols.users.doc(uid);
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
        await userRef.update(upd);
      } catch (e) {
        // Este es el fallo crítico: el sello suma en clientes/ pero no llega al
        // dashboard del cliente. Loggeamos con nivel error para alertar al admin.
        logger.error(`[Sello] ${citaId}: fallo escritura en users/${uid}: ${e.message}`, {
          citaId, uid, tenantId, telefono, nSellos,
        });
      }
    } else {
      // Advertencia visible en Cloud Logging cuando el sello queda huérfano en clientes/
      // (nunca se pudo resolver el uid del cliente registrado). Facilita el debug.
      logger.warn(`[Sello] ${citaId}: sumado en clientes/${clienteRef.id} pero SIN uid — el cliente no verá el sello en su panel. Revisar telefonoSuf9 / registro.`);
    }
  }

  // ── 3. Marcar la cita como procesada (idempotencia atómica) ─────
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

  const estadoAntes  = (before?.estado  || '').toLowerCase();
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
