'use strict';

// functions/gestion-cita-codigo.js
// ─────────────────────────────────────────────────────────────────
//  GESTIÓN DE CITA POR CÓDIGO — para cancelar/consultar desde /chat
//  sin requerir login del cliente.
//
//  El cliente, al reservar, recibe un código corto (XXX-XXX) que se
//  guarda en el doc de la cita como `codigoCita`. Para gestionar esa
//  cita desde el chat público, el cliente envía el código y el bot
//  llama esta function. El código actúa como auth ligera: quien lo
//  tiene, puede consultar o cancelar.
//
//  Acciones soportadas:
//    - 'consultar':      devuelve datos de la cita
//    - 'cancelar':       marca estado='Cancelada' + libera slotLock
//    - 'cancelar-grupo': cancela TODAS las citas hermanas de la reserva
//                        grupal. Solo el código del reservante
//                        (grupoIndex===0) puede disparar esta acción —
//                        un acompañante puede cancelar SÓLO la suya
//                        con 'cancelar'.
//
//  DEPLOY:
//    firebase deploy --only functions:gestionarCitaPorCodigo
// ─────────────────────────────────────────────────────────────────

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin      = require('firebase-admin');

const db = admin.firestore();

// Path de citas según tenant — Elegance vive en raíz; el resto bajo
// tenants/{tid}/citas. Mismo split que el resto del SaaS.
function citasCol(tenantId) {
  return tenantId === 'elegance'
    ? db.collection('citas')
    : db.collection('tenants').doc(tenantId).collection('citas');
}
function slotLocksCol(tenantId) {
  return tenantId === 'elegance'
    ? db.collection('slotLocks')
    : db.collection('tenants').doc(tenantId).collection('slotLocks');
}
// Doc de configuración operativa (mismo path que usa Configuracion.jsx)
function confDoc(tenantId) {
  return tenantId === 'elegance'
    ? db.collection('configuracion').doc('main')
    : db.collection('tenants').doc(tenantId).collection('configuracion').doc('main');
}

// Devuelve { minutosLimite, chatCancelEnabled, chatReagendarEnabled,
// politicaMensaje } con defaults si el doc no existe o está incompleto.
async function loadPoliticas(tenantId) {
  try {
    const snap = await confDoc(tenantId).get();
    const d = snap.exists ? snap.data() : {};
    return {
      minutosLimite:        Number(d.minutosLimiteReagendar) || 0,
      chatCancelEnabled:    d.chatCancelEnabled !== false,       // default true
      chatReagendarEnabled: d.chatReagendarEnabled !== false,    // default true
      politicaMensaje:      String(d.politicaMensaje || '').trim(),
    };
  } catch (err) {
    logger.warn('[gestion-cita] no se pudieron leer políticas, usando defaults:', err.message);
    return { minutosLimite: 0, chatCancelEnabled: true, chatReagendarEnabled: true, politicaMensaje: '' };
  }
}

// Devuelve minutos restantes entre AHORA (zona Santiago) y la cita.
// Si la fecha/hora son inválidas devuelve null.
function minutosHastaCita(fechaStr, horaStr) {
  if (!fechaStr || !horaStr) return null;
  try {
    const [y, m, d] = fechaStr.split('-').map(Number);
    const [hh, mm]  = horaStr.split(':').map(Number);
    if (!y || !m || !d || isNaN(hh) || isNaN(mm)) return null;
    // Aproximación: tratamos los timestamps como UTC con offset -3 (Santiago
    // verano) / -4 (invierno). Para validación de "horas antes" la
    // aproximación es suficiente — el error máximo es 1h por DST y siempre
    // a favor del cliente.
    const citaUtc = Date.UTC(y, m - 1, d, hh + 3, mm); // -3 horas → +3 UTC
    return Math.floor((citaUtc - Date.now()) / 60000);
  } catch (_) { return null; }
}

function normalizarCodigo(codigo) {
  return String(codigo || '')
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9-]/g, '');
}

// Comparación segura de fecha YYYY-MM-DD ('2026-06-29')
function fechaPasada(fechaStr) {
  if (!fechaStr || typeof fechaStr !== 'string') return false;
  // Hoy en zona Santiago para coherencia con el resto del sistema
  const hoy = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
  return fechaStr < hoy;
}

exports.gestionarCitaPorCodigo = onCall(
  { region: 'us-central1' },
  async (request) => {
    const { tenantId, codigo, accion } = request.data || {};

    if (!tenantId || typeof tenantId !== 'string') {
      throw new HttpsError('invalid-argument', 'Falta tenantId.');
    }
    if (!codigo) {
      throw new HttpsError('invalid-argument', 'Falta código de cita.');
    }
    if (!['consultar', 'cancelar', 'cancelar-grupo'].includes(accion)) {
      throw new HttpsError('invalid-argument', 'Acción inválida.');
    }

    const codigoNorm = normalizarCodigo(codigo);
    if (codigoNorm.length < 5) {
      throw new HttpsError('invalid-argument', 'Código demasiado corto.');
    }

    let snap;
    try {
      snap = await citasCol(tenantId)
        .where('codigoCita', '==', codigoNorm)
        .limit(2)
        .get();
    } catch (err) {
      logger.error('[gestion-cita] query fail', { tenantId, codigoNorm, err: err.message });
      throw new HttpsError('internal', 'Error consultando la cita.');
    }

    if (snap.empty) {
      throw new HttpsError('not-found', 'No encontramos una cita con ese código.');
    }
    if (snap.size > 1) {
      // Extremadamente raro (colisión de códigos) — log para investigar.
      logger.warn('[gestion-cita] código duplicado', { tenantId, codigoNorm });
    }

    const citaDoc = snap.docs[0];
    const cita = citaDoc.data();

    // Validaciones de estado
    if (cita.estado === 'Cancelada') {
      throw new HttpsError('failed-precondition', 'Esta cita ya fue cancelada.');
    }
    if (fechaPasada(cita.fecha)) {
      throw new HttpsError('failed-precondition', 'Esta cita ya pasó.');
    }

    // Cargar políticas del tenant (anticipación mínima + toggles + mensaje)
    const pol = await loadPoliticas(tenantId);
    const minsRestantes = minutosHastaCita(cita.fecha, cita.hora);

    // ── CONSULTAR ───────────────────────────────────────────
    if (accion === 'consultar') {
      // Calcular qué acciones puede hacer este cliente con esta cita
      const dentroDeVentana = pol.minutosLimite === 0 ||
        (minsRestantes !== null && minsRestantes >= pol.minutosLimite);
      // Grupo: idx 0 es el reservante. Solo él puede cancelar el grupo entero;
      // un acompañante puede cancelar sólo su cita.
      const esGrupo          = !!cita.grupoId;
      const esGrupoPrincipal = esGrupo && (Number(cita.grupoIndex) || 0) === 0;
      return {
        ok: true,
        cita: {
          id:             citaDoc.id,
          codigo:         codigoNorm,
          fecha:          cita.fecha || '',
          hora:           cita.hora || '',
          servicioNombre: cita.servicioNombre || '',
          barbero:        cita.barbero || cita.barberoNombre || '',
          clienteNombre:  cita.clienteNombre || '',
          estado:         cita.estado || 'Pendiente',
          esGrupo,
          esGrupoPrincipal,
          grupoTotal:     esGrupo ? (Number(cita.grupoTotal) || null) : null,
          grupoIndex:     esGrupo ? (Number(cita.grupoIndex) || 0) : null,
        },
        politicas: {
          puedeCancelar:      pol.chatCancelEnabled    && dentroDeVentana,
          puedeReagendar:     pol.chatReagendarEnabled && dentroDeVentana,
          puedeCancelarGrupo: esGrupoPrincipal && pol.chatCancelEnabled && dentroDeVentana,
          minutosLimite:      pol.minutosLimite,
          minutosRestantes:   minsRestantes,
          mensaje:            pol.politicaMensaje,
          dentroDeVentana,
        },
      };
    }

    // ── CANCELAR ────────────────────────────────────────────
    if (accion === 'cancelar') {
      // Validar políticas server-side: el cliente NO puede saltarse las reglas
      // aunque ataque la function directamente (el bot ya las respeta en UI).
      if (!pol.chatCancelEnabled) {
        throw new HttpsError(
          'permission-denied',
          'El local no permite cancelaciones desde el chat. Contactanos directamente.',
        );
      }
      if (pol.minutosLimite > 0 && (minsRestantes === null || minsRestantes < pol.minutosLimite)) {
        const horas = Math.round(pol.minutosLimite / 60);
        throw new HttpsError(
          'failed-precondition',
          `Las cancelaciones se aceptan con al menos ${horas}h de anticipación. Contactanos para cancelar esta cita.`,
        );
      }
      try {
        await citaDoc.ref.update({
          estado:        'Cancelada',
          canceladaAt:   admin.firestore.FieldValue.serverTimestamp(),
          canceladaVia:  'cliente_chat',
        });
      } catch (err) {
        logger.error('[gestion-cita] cancel fail', { citaId: citaDoc.id, err: err.message });
        throw new HttpsError('internal', 'No se pudo cancelar.');
      }

      // Liberar slotLock (best-effort, no bloquea si falla).
      // El formato canónico que usa firebaseUtils.addCita es:
      //   `${barberoId}_${fecha}_${hora.replace(':','')}`
      // (ej. xyz_2026-07-01_1430). El trigger liberarSlotTenant lo borra
      // automáticamente cuando estado pasa a Cancelada — pero solo si la
      // cita tiene slotLockId guardado. Para citas viejas o creadas por la
      // ruta de transaction fallback (slotLockId=null), intentamos borrar
      // tanto el lockId guardado como el reconstruido a partir de los datos
      // de la cita. Si ninguno existe, no pasa nada.
      const intentos = [];
      if (cita.slotLockId) intentos.push(cita.slotLockId);
      if (cita.barberoId && cita.fecha && cita.hora) {
        const safeHora = String(cita.hora).replace(':', '');
        const safeBid  = String(cita.barberoId).replace(/[^a-zA-Z0-9_-]/g, '_');
        intentos.push(`${safeBid}_${cita.fecha}_${safeHora}`);
      }
      await Promise.all(
        [...new Set(intentos)].map(id =>
          slotLocksCol(tenantId).doc(id).delete().catch(() => {})
        )
      );

      logger.info('[gestion-cita] cancelada por cliente', {
        tenantId, citaId: citaDoc.id, codigoNorm,
      });

      return {
        ok: true,
        cancelada: true,
        cita: {
          id:    citaDoc.id,
          fecha: cita.fecha,
          hora:  cita.hora,
        },
      };
    }

    // ── CANCELAR GRUPO ──────────────────────────────────────
    //  Solo el código de la cita PRINCIPAL (grupoIndex 0) puede cancelar
    //  todo el grupo. Un acompañante que use su código llegará aquí solo
    //  si maliciosamente pasa 'cancelar-grupo' — lo bloqueamos.
    if (accion === 'cancelar-grupo') {
      if (!cita.grupoId) {
        throw new HttpsError('failed-precondition', 'Esta cita no pertenece a una reserva grupal.');
      }
      if ((Number(cita.grupoIndex) || 0) !== 0) {
        throw new HttpsError(
          'permission-denied',
          'Solo quien hizo la reserva puede cancelar todo el grupo. Usa tu propio código para cancelar solo tu cita.',
        );
      }
      if (!pol.chatCancelEnabled) {
        throw new HttpsError(
          'permission-denied',
          'El local no permite cancelaciones desde el chat. Contactanos directamente.',
        );
      }
      if (pol.minutosLimite > 0 && (minsRestantes === null || minsRestantes < pol.minutosLimite)) {
        const horas = Math.round(pol.minutosLimite / 60);
        throw new HttpsError(
          'failed-precondition',
          `Las cancelaciones se aceptan con al menos ${horas}h de anticipación. Contactanos para cancelar este grupo.`,
        );
      }

      // Traer TODAS las hermanas (incluye la principal). Filtramos las que ya
      // estén canceladas para no rescribirlas ni gatillar de nuevo el trigger
      // liberarSlotTenant.
      let hermanas;
      try {
        const snap = await citasCol(tenantId)
          .where('grupoId', '==', cita.grupoId)
          .get();
        hermanas = snap.docs.filter(d => (d.data().estado || '') !== 'Cancelada');
      } catch (err) {
        logger.error('[gestion-cita] cancel-grupo query fail', { tenantId, grupoId: cita.grupoId, err: err.message });
        throw new HttpsError('internal', 'Error consultando el grupo.');
      }
      if (!hermanas.length) {
        throw new HttpsError('failed-precondition', 'Todas las citas del grupo ya estaban canceladas.');
      }

      // Batch: N updates atómicos. El trigger liberarSlotTenant se dispara por
      // cada cita y borra su slotLock. Además intentamos borrar los locks
      // best-effort (mismo patrón que 'cancelar' arriba) por si alguna cita
      // vieja del grupo tuviera slotLockId=null.
      const batch = db.batch();
      hermanas.forEach(h => {
        batch.update(h.ref, {
          estado:       'Cancelada',
          canceladaAt:  admin.firestore.FieldValue.serverTimestamp(),
          canceladaVia: 'cliente_chat_grupo',
        });
      });
      try {
        await batch.commit();
      } catch (err) {
        logger.error('[gestion-cita] cancel-grupo commit fail', { grupoId: cita.grupoId, err: err.message });
        throw new HttpsError('internal', 'No se pudo cancelar el grupo.');
      }

      const lockIds = new Set();
      hermanas.forEach(h => {
        const c = h.data();
        if (c.slotLockId) lockIds.add(c.slotLockId);
        if (c.barberoId && c.fecha && c.hora) {
          const safeHora = String(c.hora).replace(':', '');
          const safeBid  = String(c.barberoId).replace(/[^a-zA-Z0-9_-]/g, '_');
          lockIds.add(`${safeBid}_${c.fecha}_${safeHora}`);
        }
      });
      await Promise.all(
        [...lockIds].map(id => slotLocksCol(tenantId).doc(id).delete().catch(() => {})),
      );

      logger.info('[gestion-cita] grupo cancelado por reservante', {
        tenantId, grupoId: cita.grupoId, canceladas: hermanas.length,
      });

      return {
        ok: true,
        cancelada: true,
        grupoCancelado: true,
        canceladas: hermanas.length,
        cita: {
          id:    citaDoc.id,
          fecha: cita.fecha,
          hora:  cita.hora,
        },
      };
    }
  },
);
