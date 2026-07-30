'use strict';

// functions/push-agenda-respuesta.js
// ─────────────────────────────────────────────────────────────────────────────
//  PUSH AL PROFESIONAL cuando el cliente responde su confirmación
//
//  Hasta ahora el círculo quedaba abierto: el cliente contestaba CONFIRMAR o
//  CANCELAR por WhatsApp, la cita cambiaba de estado en la base… y el barbero
//  se enteraba solo si abría el panel. Justo al revés de lo que necesita: una
//  cancelación avisada con horas de anticipación vale plata SI llega a tiempo.
//
//  Va sobre el UPDATE de la cita, no sobre el canal que la respondió, a
//  propósito: hoy responden tres caminos distintos (chip de plataforma, número
//  propio del local, Cloud API de Meta) y mañana puede haber otro. Enganchado
//  al estado, cualquiera de ellos dispara el aviso sin tocar este archivo.
//
//  Destinatario: el token FCM de /agenda.html —la PWA del profesional— que se
//  guarda en `tenants/{tid}/fcm_tokens` con `barberoId` y
//  `plataforma: 'web-agenda'`. NO es el mismo público que push-cliente.js, que
//  le escribe al cliente final.
// ─────────────────────────────────────────────────────────────────────────────

const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { logger }            = require('firebase-functions');
const admin                 = require('firebase-admin');
const { writeNotifLog }     = require('./lib/notif-log');

const db        = admin.firestore();
const messaging = admin.messaging();

const tokensCol = (tid) => (tid === 'elegance'
  ? db.collection('fcm_tokens')
  : db.collection(`tenants/${tid}/fcm_tokens`));

const citasCol = (tid) => (tid === 'elegance'
  ? db.collection('citas')
  : db.collection(`tenants/${tid}/citas`));

/** Tokens de la PWA de agenda de UN profesional.
 *  Se filtra `plataforma` en memoria en vez de en la query: son colecciones
 *  chicas y así no hace falta un índice compuesto solo para esto. */
async function tokensAgenda(tid, barberoId) {
  if (!barberoId) return [];
  try {
    const snap = await tokensCol(tid).where('barberoId', '==', barberoId).get();
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(t => t.activo !== false && t.token && t.plataforma === 'web-agenda');
  } catch (e) {
    logger.warn(`[push-agenda] tokens ${tid}/${barberoId}: ${e.message}`);
    return [];
  }
}

function fmtFecha(f) {
  if (!f) return '';
  const [y, m, d] = String(f).split('-').map(Number);
  if (!y || !m || !d) return String(f);
  return new Date(y, m - 1, d).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
}

async function avisar(tid, citaId, cita, decision) {
  const tokens = await tokensAgenda(tid, cita.barberoId);
  if (!tokens.length) return 0;   // el barbero no tiene la PWA: silencio, no es un error

  const quien = String(cita.clienteNombre || 'Un cliente').trim().split(/\s+/)[0];
  const cuando = `${fmtFecha(cita.fecha)} · ${cita.hora} hrs`;

  const msg = decision === 'confirmar'
    ? { title: `✅ ${quien} confirmó`, body: `${cuando}${cita.servicioNombre ? ' · ' + cita.servicioNombre : ''}` }
    : { title: `🚫 ${quien} canceló`,  body: `${cuando} — el cupo quedó libre` };

  const res = await Promise.allSettled(tokens.map(t => messaging.send({
    token: t.token,
    notification: msg,
    data: { tipo: 'cita_respuesta', decision, citaId, tenantId: tid, fecha: String(cita.fecha || ''), hora: String(cita.hora || '') },
    webpush: {
      fcmOptions: { link: '/agenda.html' },
      notification: { icon: '/icons/pwa/icon-192.png', tag: `cita-${citaId}`, renotify: true },
    },
  })));

  // Un token muerto (app desinstalada, permiso revocado) se desactiva en vez
  // de reintentarse cada vez: si no, cada respuesta arrastra errores para
  // siempre y ensucian los logs donde sí importan.
  let ok = 0;
  await Promise.all(res.map(async (r, i) => {
    if (r.status === 'fulfilled') { ok++; return; }
    const code = r.reason?.errorInfo?.code || '';
    if (/registration-token-not-registered|invalid-argument/.test(code)) {
      await tokensCol(tid).doc(tokens[i].id).set({ activo: false }, { merge: true }).catch(() => {});
    }
  }));

  if (ok) {
    await writeNotifLog(db, {
      tenantId: tid, type: 'push_agenda_respuesta', channel: 'push',
      status: 'sent', to: { barberoId: cita.barberoId },
      meta: { citaId, decision },
    }).catch(() => {});
  }
  logger.info(`[push-agenda] ${tid}/${citaId} ${decision} → ${ok}/${tokens.length} push`);
  return ok;
}

/** Núcleo compartido por los dos triggers. */
async function alCambiarEstado(tid, citaId, antes, despues) {
  if (!antes || !despues) return;

  const e0 = String(antes.estado || '');
  const e1 = String(despues.estado || '');
  if (e0 === e1) return;

  // Solo interesan las transiciones que vienen de una RESPUESTA DEL CLIENTE.
  // Sin esta condición, cada vez que el propio barbero marca una cita como
  // confirmada desde el panel se mandaría un push a sí mismo.
  const respondioCliente = !!(despues.waClienteConfirmoEn || despues.waClienteCanceloEn);
  if (!respondioCliente) return;

  let decision = null;
  if (e1 === 'Confirmada' && despues.waClienteConfirmoEn && !antes.waClienteConfirmoEn) decision = 'confirmar';
  if (e1 === 'Cancelada'  && despues.waClienteCanceloEn  && !antes.waClienteCanceloEn)  decision = 'cancelar';
  if (!decision) return;

  // Idempotencia: un reintento del trigger no debe volver a vibrar el teléfono.
  if (despues.pushAgendaRespuesta === decision) return;

  const n = await avisar(tid, citaId, despues, decision);
  if (n > 0) {
    await citasCol(tid).doc(citaId)
      .update({ pushAgendaRespuesta: decision })
      .catch(() => {});
  }
}

exports.pushAgendaRespuestaElegance = onDocumentUpdated('citas/{citaId}', async (event) => {
  try {
    await alCambiarEstado('elegance', event.params.citaId,
      event.data?.before?.data(), event.data?.after?.data());
  } catch (e) { logger.error('[push-agenda] elegance:', e.message); }
  return null;
});

exports.pushAgendaRespuestaTenant = onDocumentUpdated('tenants/{tid}/citas/{citaId}', async (event) => {
  try {
    await alCambiarEstado(event.params.tid, event.params.citaId,
      event.data?.before?.data(), event.data?.after?.data());
  } catch (e) { logger.error(`[push-agenda] ${event.params.tid}:`, e.message); }
  return null;
});

module.exports._alCambiarEstado = alCambiarEstado;
