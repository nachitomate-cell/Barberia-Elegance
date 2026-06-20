'use strict';

// functions/push-cliente.js
// ─────────────────────────────────────────────────────────────────
//  NOTIFICACIONES PUSH AL CLIENTE
//
//  Dos triggers principales:
//    - pushCitaConfirmada{Elegance,Tenant} : cuando se crea una cita
//      con clienteUid/clienteId/clienteEmail, manda push "✅ Tu cita
//      está confirmada para {fecha} {hora}".
//    - pushSelloGanado{Elegance,Tenant} : cuando users/{uid}.sellosDisponibles
//      sube, manda push "🥇 Ganaste un sello!" o "🎁 Premio disponible".
//
//  Tokens se leen de fcm_tokens donde userId == uid del cliente Y activo=true.
//
//  Idempotente: ambos triggers se protegen para no spamear.
//
//  DEPLOY:
//    firebase deploy --only \
//      functions:pushCitaConfirmadaElegance,functions:pushCitaConfirmadaTenant,\
//      functions:pushSelloGanadoElegance,functions:pushSelloGanadoTenant
// ─────────────────────────────────────────────────────────────────

const { onDocumentCreated, onDocumentWritten } = require('firebase-functions/v2/firestore');
const { logger } = require('firebase-functions');
const admin      = require('firebase-admin');
const { writeNotifLog } = require('./lib/notif-log');

const db        = admin.firestore();
const messaging = admin.messaging();

function fcmTokensCol(tenantId) {
  return db.collection(tenantId === 'elegance' ? 'fcm_tokens' : `tenants/${tenantId}/fcm_tokens`);
}

async function tokensDe(tenantId, uid) {
  if (!uid) return [];
  try {
    const snap = await fcmTokensCol(tenantId)
      .where('userId', '==', uid)
      .where('activo', '==', true)
      .get();
    return snap.docs.map(d => ({ id: d.id, token: d.data().token })).filter(t => t.token);
  } catch (e) {
    logger.warn(`[Push] tokensDe ${tenantId}/${uid} error:`, e.message);
    return [];
  }
}

async function enviarPush(tenantId, uid, { title, body, data = {} }) {
  const tokens = await tokensDe(tenantId, uid);
  if (tokens.length === 0) return 0; // silencioso: dispara en cada evento sin acción
  const message = {
    notification: { title, body },
    data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
  };
  const responses = await Promise.allSettled(
    tokens.map(t => messaging.send({ ...message, token: t.token }))
  );
  // Desactivar tokens inválidos
  const invalidos = [];
  responses.forEach((r, i) => {
    if (r.status === 'rejected') {
      const code = r.reason?.errorInfo?.code || '';
      if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
        invalidos.push(tokens[i].id);
      }
    }
  });
  if (invalidos.length) {
    const batch = db.batch();
    invalidos.forEach(id => batch.update(fcmTokensCol(tenantId).doc(id), { activo: false }));
    await batch.commit().catch(() => {});
  }
  const exitos = responses.filter(r => r.status === 'fulfilled').length;
  logger.info(`[Push] ${tenantId}/${uid}: ${exitos}/${tokens.length} enviados. ${invalidos.length} desactivados.`);
  return exitos;
}

// Resuelve el uid del cliente desde varios campos posibles de la cita.
async function resolverUidCita(tenantId, cita) {
  if (cita.clienteUid) return cita.clienteUid;
  if (cita.clienteId  && cita.clienteId.length > 12) return cita.clienteId; // probablemente firebaseUid
  // Buscar en users/ por email (cuando booking público no pone uid)
  const email = (cita.clienteEmail || '').toLowerCase().trim();
  if (!email) return null;
  try {
    const usersCol = db.collection(tenantId === 'elegance' ? 'users' : `tenants/${tenantId}/users`);
    const q = await usersCol.where('email', '==', email).limit(1).get();
    return q.empty ? null : q.docs[0].id;
  } catch (_) { return null; }
}

// ═══════════════════════════════════════════════════════════════
//  1) CITA CONFIRMADA
// ═══════════════════════════════════════════════════════════════

async function notifCitaConfirmada(tenantId, citaId, cita) {
  // Evita push para citas que el admin creó manualmente (no necesita push) y
  // para confirmaciones de ya completadas/canceladas.
  if (cita.estado === 'Completada' || cita.estado === 'Cancelada') return;
  if (cita.notifConfirmadaEnviada) return; // idempotencia

  const uid = await resolverUidCita(tenantId, cita);
  if (!uid) return; // cliente no es miembro del Club

  const fecha = cita.fecha || '';
  const hora  = cita.hora  || '';
  const barbero = cita.barbero || cita.barberoNombre || '';
  const servicio = cita.servicioNombre || cita.servicio || '';

  const sent = await enviarPush(tenantId, uid, {
    title: '✅ Cita confirmada',
    body:  `${servicio || 'Tu cita'}${barbero ? ` con ${barbero}` : ''} · ${fecha} a las ${hora}`,
    data:  { type: 'cita_confirmada', citaId, fecha, hora },
  });

  if (sent > 0) {
    try {
      const citaRef = db.collection(tenantId === 'elegance' ? 'citas' : `tenants/${tenantId}/citas`).doc(citaId);
      await citaRef.update({ notifConfirmadaEnviada: true });
    } catch (e) { logger.warn(`[Push] no se pudo marcar notifConfirmadaEnviada: ${e.message}`); }
    await writeNotifLog(db, {
      tenantId,
      type:    'push_confirmacion',
      channel: 'push',
      status:  'sent',
      to:      { nombre: cita.clienteNombre || '', email: cita.clienteEmail || '' },
      meta:    { citaId, servicio: servicio, fecha, hora },
    });
  }
}

exports.pushCitaConfirmadaElegance = onDocumentCreated('citas/{citaId}', async (event) => {
  const cita = event.data?.data();
  if (!cita) return null;
  try { await notifCitaConfirmada('elegance', event.params.citaId, cita); }
  catch (e) { logger.error(`[Push cita] elegance/${event.params.citaId}:`, e); }
  return null;
});

exports.pushCitaConfirmadaTenant = onDocumentCreated('tenants/{tid}/citas/{citaId}', async (event) => {
  const cita = event.data?.data();
  if (!cita) return null;
  try { await notifCitaConfirmada(event.params.tid, event.params.citaId, cita); }
  catch (e) { logger.error(`[Push cita] ${event.params.tid}/${event.params.citaId}:`, e); }
  return null;
});

// ═══════════════════════════════════════════════════════════════
//  2) SELLO GANADO + PREMIO DISPONIBLE
// ═══════════════════════════════════════════════════════════════

async function leerProxPremio(tenantId, sellosDisp) {
  try {
    const col = db.collection(tenantId === 'elegance' ? 'premios' : `tenants/${tenantId}/premios`);
    const snap = await col.get();
    const arr = snap.docs.map(d => ({ ...d.data() })).filter(p => Number(p.costoSellos) > 0);
    arr.sort((a, b) => Number(a.costoSellos) - Number(b.costoSellos));
    const proximo  = arr.find(p => sellosDisp < p.costoSellos);
    const ganado   = [...arr].reverse().find(p => sellosDisp >= p.costoSellos);
    return { proximo, ganado, primero: arr[0] };
  } catch (_) { return { proximo: null, ganado: null, primero: null }; }
}

async function notifSelloGanado(tenantId, uid, before, after) {
  const dispAntes  = Number(before?.sellosDisponibles ?? before?.stamps ?? 0);
  const dispDesp   = Number(after?.sellosDisponibles  ?? after?.stamps  ?? 0);
  if (dispDesp <= dispAntes) return; // bajó o igual (canje, no ganó)
  const delta = dispDesp - dispAntes;

  const { proximo, ganado } = await leerProxPremio(tenantId, dispDesp);

  // Detectar si justo desbloqueó un premio nuevo (dispAntes no lo tenía, dispDesp sí)
  const premiosPrev = await leerProxPremio(tenantId, dispAntes);
  const desbloqueoNuevo = ganado && (!premiosPrev.ganado || premiosPrev.ganado.nombre !== ganado.nombre);

  let title, body;
  if (desbloqueoNuevo) {
    title = '🎁 ¡Premio disponible!';
    body  = `Tienes ${dispDesp} sellos. Puedes canjear: ${ganado.nombre}.`;
  } else if (proximo) {
    const faltan = Math.max(0, proximo.costoSellos - dispDesp);
    title = `🥇 +${delta} sello${delta > 1 ? 's' : ''}`;
    body  = faltan === 0
      ? `Tienes ${dispDesp} sellos. Premio disponible 🎁`
      : `Te ${faltan === 1 ? 'falta' : 'faltan'} ${faltan} para ${proximo.nombre}.`;
  } else {
    title = `🥇 +${delta} sello${delta > 1 ? 's' : ''}`;
    body  = `Total acumulado: ${dispDesp} sellos. ¡Gracias por tu visita!`;
  }

  const selloSent = await enviarPush(tenantId, uid, {
    title, body,
    data: { type: 'sello_ganado', sellos: dispDesp },
  });
  if (selloSent > 0) {
    await writeNotifLog(db, {
      tenantId,
      type:    'push_sello',
      channel: 'push',
      status:  'sent',
      to:      { nombre: after.nombre || after.clienteNombre || '' },
      meta:    { sellos: String(dispDesp) },
    });
  }
}

exports.pushSelloGanadoElegance = onDocumentWritten('users/{uid}', async (event) => {
  const before = event.data?.before?.data();
  const after  = event.data?.after?.data();
  if (!after) return null;
  try { await notifSelloGanado('elegance', event.params.uid, before, after); }
  catch (e) { logger.error(`[Push sello] elegance/${event.params.uid}:`, e); }
  return null;
});

exports.pushSelloGanadoTenant = onDocumentWritten('tenants/{tid}/users/{uid}', async (event) => {
  const before = event.data?.before?.data();
  const after  = event.data?.after?.data();
  if (!after) return null;
  try { await notifSelloGanado(event.params.tid, event.params.uid, before, after); }
  catch (e) { logger.error(`[Push sello] ${event.params.tid}/${event.params.uid}:`, e); }
  return null;
});
