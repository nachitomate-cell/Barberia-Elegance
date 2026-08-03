'use strict';

// functions/whatsapp-notif.js
// ─────────────────────────────────────────────────────────────────────────────
//  CONFIRMACIONES DE CITA POR WHATSAPP — Cloud API oficial de Meta
//
//  Dos niveles de servicio:
//
//  ── GRATIS (al DUEÑO del local) — RETIRADO ──────────────────────────────────
//  Enviaba un WhatsApp de sesión al dueño por cada reserva nueva. Se sacó del
//  panel (/gestion-interna/whatsapp) y, en consecuencia, también del backend:
//  dejar el envío vivo habría significado seguir escribiéndole a locales que
//  ya no tienen dónde ver el estado, pausar ni desvincular su número.
//    · notificarCita  → el bloque queda tras `FREE_TIER_RETIRADO` (no envía).
//    · whatsappWebhook → "ACTIVAR <local>" responde que el canal no existe,
//      en vez de vincular a alguien en silencio a algo que no manda nada.
//  El dueño NO se queda sin enterarse: el push FCM del panel ya cubría el
//  aviso (era el fallback cuando la ventana de 24h estaba cerrada).
//  Para revivirlo: FREE_TIER_RETIRADO=false, reponer la rama de ACTIVAR y la
//  <Section> en admin-panel/src/views/WhatsAppNotif.jsx.
//
//  ── PAGADO (al CLIENTE final) — plantillas utility, cobradas por Meta ───────
//  Triple candado, TODO apagado por defecto:
//    1. _system/whatsapp_notif.templatesEnabled === true   (global, solo Ignacio)
//    2. wa_notif/{tid}.planCliente === true                (por tenant, solo Ignacio)
//    3. _system/whatsapp_notif.templateCita definido       (plantilla aprobada en Meta)
//  Si cualquiera falta, jamás se envía una plantilla → jamás hay cobro.
//
//  ── Datos ────────────────────────────────────────────────────────────────────
//  _system/whatsapp_notif        config global (numero visible, flags, template)
//                                — lectura pública (rules _system), escritura bootstrap.
//  wa_notif/{tenantId}           estado por local (telefono dueño, ventana, plan)
//                                — solo Admin SDK (sin reglas: default deny).
//  wa_notif_phones/{telefono}    índice teléfono → tenantId para rutear entrantes.
//  wa_cita_pendiente/{telefono}  cita esperando respuesta al recordatorio.
//                                Raíz y no por tenant a propósito: el número de
//                                plataforma es compartido, así que al llegar un
//                                entrante solo tenemos el teléfono.
//
//  ── Funciones ────────────────────────────────────────────────────────────────
//  whatsappWebhook               GET verificación Meta / POST mensajes entrantes
//                                (ACTIVAR <local> · 1 · PAUSAR · REANUDAR) y
//                                respuestas del cliente al recordatorio (SÍ/NO).
//  notificarCitaWhatsApp*        triggers onCreate de citas (elegance + tenants).
//  recordatorioCitaMeta          cron 30 min: recordatorio 24h por plantilla.
//  waNotifEstado                 callable para el panel (estado del módulo).
//
//  ── Los dos canales de WhatsApp, y por qué no se pisan ───────────────────────
//  · ESTE (Meta Cloud API)  → número de PLATAFORMA compartido. Cuesta plata por
//    plantilla, pero el número del local nunca se expone a una suspensión.
//  · Evolution (evolution/) → número PROPIO del local, por sesión/QR. Gratis,
//    mejor marca, pero el activo en riesgo es el teléfono del local.
//  Para un mismo tenant se enciende UNO de los dos, nunca los dos: si no, el
//  cliente recibe el recordatorio duplicado. Flags: wa_notif/{tid}.planRecordatorio
//  acá vs tenants/{tid}/configuracion/whatsapp.confirmacionesEnabled allá.
//
//  ── Setup (una vez, manual) ──────────────────────────────────────────────────
//  1. Meta Business Manager verificado + app con producto WhatsApp.
//  2. Número dedicado registrado en la app (NO puede estar en WhatsApp normal).
//  3. Secrets reales:
//       firebase functions:secrets:set WHATSAPP_TOKEN         (token permanente)
//       firebase functions:secrets:set WHATSAPP_PHONE_ID      (phone number ID)
//       firebase functions:secrets:set WHATSAPP_VERIFY_TOKEN  (string inventado)
//  4. Webhook en Meta → URL de whatsappWebhook + ese verify token,
//     suscrito al campo "messages".
//  5. Doc _system/whatsapp_notif: { numero:'569XXXXXXXX', freeEnabled:true,
//     templatesEnabled:false, templateCita:'confirmacion_cita', templateLang:'es' }.
//
//  DEPLOY:
//    firebase deploy --only functions:whatsappWebhook,functions:notificarCitaWhatsAppElegance,functions:notificarCitaWhatsAppTenant,functions:waNotifEstado
// ─────────────────────────────────────────────────────────────────────────────

const { onRequest, onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated }             = require('firebase-functions/v2/firestore');
const { onSchedule }                    = require('firebase-functions/v2/scheduler');
const { defineSecret }                  = require('firebase-functions/params');
const { logger }                        = require('firebase-functions');
const admin                             = require('firebase-admin');
const { FieldValue, Timestamp }         = require('firebase-admin/firestore');
const { writeNotifLog }                 = require('./lib/notif-log');
const { _ahoraChile: ahoraChile }       = require('./chat-horas-disponibles');

const db = admin.firestore();

const WHATSAPP_TOKEN        = defineSecret('WHATSAPP_TOKEN');
const WHATSAPP_PHONE_ID     = defineSecret('WHATSAPP_PHONE_ID');
const WHATSAPP_VERIFY_TOKEN = defineSecret('WHATSAPP_VERIFY_TOKEN');
const ANTHROPIC_API_KEY     = defineSecret('ANTHROPIC_API_KEY');   // bot oficial (bot-oficial.js)

const GRAPH_VERSION = 'v23.0';

// Margen de seguridad sobre la ventana de 24h y tope diario por tenant.
const VENTANA_MARGEN_MS = 30 * 60 * 1000;
const TOPE_DIARIO       = 80;

/* ── Ritmo del recordatorio 24h (plantilla, sale por el número de plataforma) ──
   Mismo criterio que el canal de Evolution (evolution/cuota.js), con contador
   PROPIO: allá el pool de riesgo es el número del local y acá es el de
   plataforma, así que mezclar los contadores mediría la cosa equivocada. */
const RECORD_HORA_INICIO = 9;   // no se envía antes de las 09:00 Chile
const RECORD_HORA_FIN    = 21;  // ni a las 21:00 ni después
const RECORD_MAX_CICLO   = 8;   // reparte la tanda del día entre ciclos
const RECORD_TOPE_DIA    = 60;  // por local

const BOOTSTRAP_EMAILS = ['ignaciiio.mate@gmail.com'];

/* ─────────────────────────── Helpers ─────────────────────────── */

// normalizarFono se importa del lib compartido (más abajo, junto al resto del
// consentimiento): el doc id de /wa_optout tiene que salir de la MISMA función
// en los dos canales, o un canal guarda 569XXXXXXXX y el otro busca 9XXXXXXXX
// y el opt-out no se ve.

function fmtFecha(fechaStr) {
  if (!fechaStr) return '—';
  const [y, m, d] = String(fechaStr).split('-').map(Number);
  if (!y || !m || !d) return String(fechaStr);
  return new Date(y, m - 1, d).toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long',
  }).replace(/^\w/, c => c.toUpperCase());
}

/* Parámetros {{1}}..{{n}} del recordatorio, en el orden que espera la plantilla.
   El orden viaja JUNTO al nombre de la plantilla (`templateRecordatorioParams`)
   porque son inseparables: apuntar a otra plantilla sin cambiar el orden manda
   la fecha donde va el nombre del local, y Meta lo acepta sin chistar — el
   cliente recibe un mensaje absurdo y nosotros no nos enteramos.

   El orden por defecto es el de `recordatorio_cita`. `confirmacion_cita`, que
   es la única aprobada hoy, usa otro:
     recordatorio_cita*  → nombre · local · servicio · fecha · hora
     confirmacion_cita   → nombre · servicio · fecha · hora · local          */
const ORDEN_RECORDATORIO = ['nombre', 'local', 'servicio', 'fecha', 'hora'];

function paramsRecordatorio(cfg, { cita, nombreLocal }) {
  const valores = {
    nombre:   cita.clienteNombre  || 'Hola',
    local:    nombreLocal,
    servicio: cita.servicioNombre || 'tu servicio',
    fecha:    fmtFecha(cita.fecha),
    hora:     `${cita.hora || ''} hrs`,
  };
  const orden = Array.isArray(cfg.templateRecordatorioParams) && cfg.templateRecordatorioParams.length
    ? cfg.templateRecordatorioParams
    : ORDEN_RECORDATORIO;
  // Una clave desconocida se manda vacía en vez de "undefined": un typo en la
  // config no puede terminar impreso en el WhatsApp de un cliente.
  return orden.map(k => valores[k] ?? '');
}
exports._paramsRecordatorio = paramsRecordatorio;

async function getGlobalConfig() {
  try {
    const snap = await db.collection('_system').doc('whatsapp_notif').get();
    return snap.exists ? (snap.data() || {}) : {};
  } catch (_) { return {}; }
}

/**
 * Estado de consentimiento WhatsApp del titular (cliente final).
 * La implementación vive en functions/lib/wa-consent.js porque el canal de
 * Evolution (número propio del local) tiene que leer y escribir EL MISMO
 * libro: antes cada canal tenía su copia y un STOP acá no frenaba los
 * mensajes de allá. Semántica en este canal (Meta Cloud API): 'unknown'
 * se trata como bloqueo — Meta exige opt-in explícito para plantillas.
 */
const {
  normalizarFono,
  consentimientoWa,
  registrarOptOut,
  registrarOptIn,
} = require('./lib/wa-consent');

/** POST al Graph API. Devuelve el body parseado; lanza con detalle si falla. */
async function graphPost(payload) {
  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${WHATSAPP_PHONE_ID.value()}/messages`,
    {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN.value()}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(payload),
    },
  );
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = body?.error?.code;
    const sub  = body?.error?.error_subcode;
    throw new Error(`Graph ${res.status} code=${code} sub=${sub}: ${body?.error?.message || 'sin detalle'}`);
  }
  return body;
}

/** Mensaje de sesión (texto libre). GRATIS SIEMPRE: dentro de ventana se
 *  entrega sin costo; fuera de ventana Meta lo rechaza sin cobrar. */
async function enviarTexto(to, body) {
  return graphPost({
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body, preview_url: false },
  });
}

/** Plantilla utility — ESTE ES EL ÚNICO CAMINO QUE CUESTA PLATA.
 *  Solo lo alcanza el plan pagado (triple candado en el trigger). */
async function enviarTemplate(to, templateName, lang, parametros) {
  return graphPost({
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: lang || 'es' },
      components: [{
        type: 'body',
        parameters: (parametros || []).map(t => ({ type: 'text', text: String(t) })),
      }],
    },
  });
}

/* ───────────────────── Webhook (entrantes de Meta) ───────────────────── */

exports.whatsappWebhook = onRequest(
  { secrets: [WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, WHATSAPP_VERIFY_TOKEN, ANTHROPIC_API_KEY], cors: false, timeoutSeconds: 120 },
  async (req, res) => {
    // ── Verificación del webhook (la hace Meta al configurarlo) ──
    if (req.method === 'GET') {
      const mode      = req.query['hub.mode'];
      const token     = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];
      if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN.value()) {
        res.status(200).send(challenge);
      } else {
        res.status(403).send('forbidden');
      }
      return;
    }
    if (req.method !== 'POST') { res.status(405).send('method not allowed'); return; }

    // Responder 200 rápido pase lo que pase: si Meta acumula errores,
    // desactiva el webhook.
    try {
      const entries = req.body?.entry || [];
      for (const entry of entries) {
        for (const change of (entry.changes || [])) {
          const value = change.value || {};
          // Ignorar acuses de entrega/lectura (value.statuses).
          for (const msg of (value.messages || [])) {
            try { await procesarEntrante(msg); }
            catch (e) { logger.error('[wa:webhook] procesando mensaje:', e.message); }
          }
        }
      }
    } catch (e) {
      logger.error('[wa:webhook]', e.message);
    }
    res.status(200).send('ok');
  },
);

/* ────────── Cita pendiente de confirmar (respuesta al recordatorio) ──────────
   El cerebro de Evolution guarda esto en
   `tenants/{tid}/wa_conversaciones/{tel}.citaPendiente`, pero ahí cada local
   tiene su propia instancia y el tenant se conoce de antemano. Acá el webhook
   recibe un teléfono y nada más: el número de plataforma es COMPARTIDO por
   todos los locales, así que el pendiente tiene que vivir en una colección
   raíz indexada por teléfono. Solo Admin SDK (default deny en las rules). */

const citaPendienteRef = (fono) => db.collection('wa_cita_pendiente').doc(fono);

const citasColDe = (tid) => (tid === 'elegance'
  ? db.collection('citas')
  : db.collection('tenants').doc(tid).collection('citas'));

/** Sin tildes y en minúsculas. Los botones de la plantilla llegan como texto
 *  ("Si, confirmo") y el cliente escribe "sí" o "si" indistintamente. */
const normTexto = (s) => String(s || '')
  .toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim();

/** Intención del cliente sobre su cita.
 *  El ORDEN importa: "no me escriban más" empieza con "no" y jamás puede
 *  leerse como "cancelo mi cita". */
function intencionCita(texto) {
  const t = normTexto(texto);
  if (!t) return null;
  if (/^(stop|baja|salir|desuscrib|no me escrib|no quiero recibir)/.test(t)) return 'stop';
  if (/^(si|confirmo|confirmar|dale|ok|listo|voy|ahi estare|de acuerdo|perfecto)/.test(t)) return 'confirmar';
  if (/^(no|cancel)/.test(t)) return 'cancelar';
  return null;
}

/** Aplica la decisión a la cita. Misma semántica que aplicarDecision() del
 *  cerebro (evolution/cerebro.js): 'Cancelada' dispara liberar-slot-on-cancel
 *  y libera el cupo. Si los dos canales divergen, el mismo "SÍ" significaría
 *  cosas distintas según por dónde entró la respuesta. */
async function aplicarDecisionCita(pend, decision) {
  const patch = decision === 'confirmar'
    ? { estado: 'Confirmada', waClienteConfirmoEn: FieldValue.serverTimestamp() }
    : {
        estado: 'Cancelada',
        waClienteCanceloEn: FieldValue.serverTimestamp(),
        canceladaPor: 'cliente',
        canceladaVia: 'wa_meta',
      };
  await citasColDe(pend.tenantId).doc(pend.citaId).update(patch);
}

async function procesarEntrante(msg) {
  const from = normalizarFono(msg.from);
  if (!from) return;
  const texto = String(
    msg.text?.body ?? msg.button?.text ?? msg.interactive?.button_reply?.title ?? '',
  ).trim();
  const ahora = Timestamp.now();
  const ventanaHasta = Timestamp.fromMillis(ahora.toMillis() + 24 * 60 * 60 * 1000);

  // ── ¿ACTIVAR <local>? — vincula el teléfono al tenant ──
  const mActivar = texto.match(/^activar[\s:_-]+([a-z0-9_-]{3,40})/i);
  if (mActivar) {
    // El módulo de avisos al dueño se retiró (ver notificarCita). Se responde
    // en vez de vincular en silencio: si no, alguien con el link viejo queda
    // "suscrito" a un canal que no envía nada y creyendo que sí.
    await enviarTexto(from,
      'Este canal de avisos ya no está disponible. 🙏\n\n' +
      'Las reservas nuevas te llegan igual como notificación en tu panel de gestión.');
    logger.info(`[wa] ACTIVAR recibido para un módulo retirado, fono=${from}`);
    return;
  }

  // ── Rutear por teléfono conocido ──
  const idxSnap = await db.collection('wa_notif_phones').doc(from).get();
  if (!idxSnap.exists) {
    // ── ¿Está respondiendo el recordatorio de su cita? ──
    // Se resuelve ANTES que STOP/BAJA a propósito: en este contexto "cancelar"
    // y "no" significan "no voy a la cita", no "no me escriban más". Antes
    // ambos caían en el opt-out y pasaba lo peor de los dos mundos — el
    // cliente quedaba dado de baja Y su cita seguía en pie, ocupando el cupo.
    const pendSnap = await citaPendienteRef(from).get();
    const pend     = pendSnap.exists ? (pendSnap.data() || {}) : null;
    const vigente  = pend && pend.citaId && pend.tenantId
      && (!pend.expiraEn || pend.expiraEn.toMillis() > Date.now());

    if (vigente) {
      const intencion = intencionCita(texto);

      if (intencion === 'confirmar' || intencion === 'cancelar') {
        try {
          await aplicarDecisionCita(pend, intencion);
        } catch (e) {
          // La cita pudo borrarse o cancelarse por otro lado. No se limpia el
          // pendiente: que reintente si vuelve a responder.
          logger.error(`[wa] ${intencion} falló ${pend.tenantId}/${pend.citaId}: ${e.message}`);
          await enviarTexto(from,
            'Tuvimos un problema al registrar tu respuesta 😕\n\n' +
            'Por favor contacta directamente al local para confirmar tu cita.');
          return;
        }
        await citaPendienteRef(from).delete().catch(() => {});
        await writeNotifLog(db, {
          tenantId: pend.tenantId, type: 'wa_recordatorio_respuesta',
          channel: 'whatsapp_template', status: intencion,
          to: { telefono: from }, meta: { citaId: pend.citaId },
        }).catch(() => {});
        await enviarTexto(from, intencion === 'confirmar'
          ? `✅ ¡Listo! Tu cita quedó confirmada.\n\nTe esperamos el ${fmtFecha(pend.fecha)} a las ${pend.hora} hrs en ${pend.local || 'el local'}.`
          : `🙏 Listo, cancelamos tu cita del ${fmtFecha(pend.fecha)} a las ${pend.hora} hrs.\n\nCuando quieras volver a agendar, aquí estamos.`);
        logger.info(`[wa] ${intencion} cliente tenant=${pend.tenantId} cita=${pend.citaId}`);
        return;
      }

      if (intencion === 'stop') {
        // Baja explícita teniendo cita pendiente: se honra la baja pero NO se
        // toca la cita. Pidió dejar de recibir mensajes, no cancelar.
        await registrarOptOut(from, 'stop-cliente-final');
        await citaPendienteRef(from).delete().catch(() => {});
        await enviarTexto(from,
          '🔕 *Listo, no recibirás más avisos por WhatsApp.*\n\n' +
          'Tu cita sigue agendada. Si necesitas cambiarla, contacta directamente al local.\n\n' +
          'Para volver a recibir avisos responde *ACTIVAR*.');
        logger.info(`[wa] opt-out con cita pendiente fono=***${from.slice(-4)}`);
        return;
      }

      // Texto libre con cita pendiente: no adivinamos qué quiso decir.
      // Repreguntar es gratis — acaba de escribir, la ventana está abierta.
      await enviarTexto(from,
        `Perdona, no te entendí 🙈\n\n` +
        `Sobre tu cita del ${fmtFecha(pend.fecha)} a las ${pend.hora} hrs: ` +
        'responde *SÍ* si vienes, o *NO* si no podrás asistir.');
      return;
    }

    // ── Sin cita pendiente: solo gestión de consentimiento ──
    // Ojo: "cancelar" y "no" YA NO dan de baja. Sin una cita de por medio son
    // ambiguos, y dar de baja en silencio a quien quería cancelar una hora es
    // un error caro y silencioso. Se repregunta.
    const raw = normTexto(texto);
    const esStop      = /^(stop|baja|salir|desuscrib|no me escrib|no quiero recibir)/.test(raw);
    const esReanudar  = /^(activar|reactivar|reanudar)$/.test(raw);
    if (esStop) {
      await registrarOptOut(from, 'stop-cliente-final');
      await enviarTexto(from,
        '🔕 *Listo, no recibirás más avisos por WhatsApp.*\n\n' +
        'Si cambias de opinión, respóndenos *ACTIVAR* y volveremos a enviarte confirmaciones de tus citas.');
      logger.info(`[wa] opt-out cliente final fono=***${from.slice(-4)}`);
      return;
    }
    if (esReanudar) {
      await registrarOptIn(from, 'reactivar-cliente-final');
      await enviarTexto(from,
        '✅ *Notificaciones reactivadas.*\n\nVolverás a recibir confirmaciones de tus citas por aquí.');
      logger.info(`[wa] opt-in cliente final fono=***${from.slice(-4)}`);
      return;
    }
    if (/^(cancel|no)/.test(raw)) {
      // Ambiguo sin cita pendiente: puede ser "cancela mi hora" o "cancela los
      // mensajes". Se pregunta en vez de asumir la baja.
      // ── BOT OFICIAL (Claude) — piloto Renacer, kill-switch botOficial ──
      // Cliente sin cita pendiente que quiere conversar: territorio del bot.
      try {
        const { botOficialProcesar } = require('./bot-oficial');
        if (await botOficialProcesar({ fono: from, texto, anthropicKey: ANTHROPIC_API_KEY.value(), enviarTexto })) return;
      } catch (e) { logger.error('[bot-oficial]', e.message); }
      await enviarTexto(from,
        'No tengo ninguna cita pendiente de confirmar a tu nombre 🤔\n\n' +
        'Si quieres *cancelar una cita*, contacta directamente a tu local.\n' +
        'Si quieres *dejar de recibir estos mensajes*, responde *STOP*.');
      return;
    }
    // ── BOT OFICIAL (Claude) — número nuevo que llega a conversar ──
    try {
      const { botOficialProcesar } = require('./bot-oficial');
      if (await botOficialProcesar({ fono: from, texto, anthropicKey: ANTHROPIC_API_KEY.value(), enviarTexto })) return;
    } catch (e) { logger.error('[bot-oficial]', e.message); }
    // Número desconocido, sin comando: instrucciones (gratis: acaba de
    // escribir → ventana abierta). Se mantiene el mensaje original para
    // dueños que llegaron sin el flujo Activar-por-WhatsApp.
    await enviarTexto(from,
      'Hola 👋 Este es el número de notificaciones de *SynapTech Agenda*.\n\n' +
      'Si tienes un local, actívalo desde tu panel de gestión → *Confirmaciones WhatsApp* → "Activar por WhatsApp".\n\n' +
      'Si eres cliente y quieres dejar de recibir estos mensajes, responde *STOP*.');
    return;
  }
  const tid   = idxSnap.data().tenantId;
  const waRef = db.collection('wa_notif').doc(tid);

  // Refrescar SIEMPRE la ventana: cada entrante regala 24h más de gratis.
  const update = { ventanaAbiertaHasta: ventanaHasta, ultimoEntranteEn: ahora };

  const t = texto.toLowerCase();
  if (t === 'pausar' || t === 'baja' || t === 'stop') {
    update.estado = 'pausado';
    await waRef.set(update, { merge: true });
    await enviarTexto(from, '⏸️ Notificaciones pausadas. Escribe *REANUDAR* cuando quieras volver a recibirlas.');
    return;
  }
  if (t === 'reanudar' || t === 'activar') {
    update.estado = 'activo';
    await waRef.set(update, { merge: true });
    await enviarTexto(from, '▶️ Listo, notificaciones reanudadas.');
    return;
  }

  if (t === '1' || t === 'confirmar' || t === 'ok') {
    // Marca la última cita notificada como vista/confirmada por el local.
    const waSnap = await waRef.get();
    const ult = waSnap.exists ? waSnap.data().ultimaCitaNotificada : null;
    await waRef.set(update, { merge: true });
    if (ult && ult.citaId) {
      try {
        const citaRef = ult.tenantId === 'elegance'
          ? db.collection('citas').doc(ult.citaId)
          : db.collection('tenants').doc(ult.tenantId).collection('citas').doc(ult.citaId);
        await citaRef.update({ confirmadaPorLocal: true, confirmadaPorLocalEn: ahora });
      } catch (e) { logger.warn(`[wa] no se pudo marcar cita ${ult.citaId}: ${e.message}`); }
      await enviarTexto(from, '✓ Confirmado. ¡Que salga bueno el corte! ✂️');
    } else {
      await enviarTexto(from, '✓ Recibido.');
    }
    return;
  }

  // Cualquier otro texto: solo refresca la ventana, sin responder (evita ruido).
  await waRef.set(update, { merge: true });
}

/* ──────────────── Trigger: nueva cita → avisos WhatsApp ──────────────── */

async function notificarCita(citaId, cita, tenantId) {
  const cfg = await getGlobalConfig();

  const waSnap = await db.collection('wa_notif').doc(tenantId).get();
  if (!waSnap.exists) return;
  const wa = waSnap.data() || {};

  const hoy = new Date().toISOString().slice(0, 10);
  const enviadosHoy = (wa.enviadosHoy && wa.enviadosHoy.fecha === hoy) ? wa.enviadosHoy.count : 0;

  /* ── NIVEL GRATIS: aviso al dueño — MÓDULO RETIRADO ──────────────────
     El módulo "Aviso de reservas al local" se sacó del panel
     (/gestion-interna/whatsapp), así que el dueño ya no tiene dónde ver el
     estado, pausar ni desvincular su número. Dejar el envío vivo significaba
     seguir escribiéndole a locales que ya no pueden gestionarlo — por eso se
     apaga acá y no solo en la UI.

     El aviso de reserva NO se pierde: el push FCM del panel ya lo cubría
     (era el fallback cuando la ventana de 24h de Meta estaba cerrada, que en
     la práctica era casi siempre).

     Se deja el bloque en un `if (false)` en vez de borrarlo porque el canal
     oficial de Meta todavía no está en producción (falta app, número y
     secrets reales); si más adelante se retoma, esto vuelve cambiando la
     condición y reponiendo la sección en WhatsAppNotif.jsx. El resto del
     archivo —confirmación pagada al cliente y, sobre todo, el manejo de
     STOP/BAJA que alimenta /wa_optout— sigue intacto. */
  const FREE_TIER_RETIRADO = true;
  if (!FREE_TIER_RETIRADO && cfg.freeEnabled !== false && wa.estado === 'activo' && wa.telefono) {
    const ventanaOk = wa.ventanaAbiertaHasta
      && wa.ventanaAbiertaHasta.toMillis() - VENTANA_MARGEN_MS > Date.now();

    if (!ventanaOk) {
      // Ventana cerrada → NO se envía nada (un texto fallaría sin costo, pero
      // ni lo intentamos). El push FCM existente cubre el aviso.
      logger.info(`[wa] ventana cerrada tenant=${tenantId} — fallback push FCM`);
      await writeNotifLog(db, {
        tenantId, type: 'wa_cita_dueno', channel: 'whatsapp', status: 'skipped_window',
        to: { telefono: wa.telefono }, meta: { citaId },
      }).catch(() => {});
    } else if (enviadosHoy >= TOPE_DIARIO) {
      logger.warn(`[wa] tope diario alcanzado tenant=${tenantId} (${TOPE_DIARIO})`);
    } else {
      const precio = Number(cita.precio) ? `\n💰 $${Number(cita.precio).toLocaleString('es-CL')}` : '';
      const barbero = cita.barbero ? `\n💈 ${cita.barbero}` : '';
      const body =
        `🔔 *Nueva reserva*\n\n` +
        `👤 ${cita.clienteNombre || 'Cliente'}\n` +
        `✂️ ${cita.servicioNombre || 'Servicio'}\n` +
        `📅 ${fmtFecha(cita.fecha)} · ${cita.hora || ''} hrs` +
        barbero + precio + `\n\n` +
        `Responde *1* para confirmar que la viste.`;
      try {
        await enviarTexto(wa.telefono, body);
        await waSnap.ref.set({
          enviadosHoy: { fecha: hoy, count: enviadosHoy + 1 },
          ultimaCitaNotificada: { citaId, tenantId, en: Timestamp.now() },
        }, { merge: true });
        await writeNotifLog(db, {
          tenantId, type: 'wa_cita_dueno', channel: 'whatsapp', status: 'sent',
          to: { telefono: wa.telefono }, meta: { citaId, servicio: cita.servicioNombre || '' },
        }).catch(() => {});
        logger.info(`[wa] aviso dueño enviado tenant=${tenantId} cita=${citaId}`);
      } catch (e) {
        // 131047 = ventana cerrada (nuestro tracking quedó desfasado): sin
        // entrega y SIN COSTO. Cualquier error aquí jamás genera cobro
        // porque este camino solo envía type:"text".
        logger.warn(`[wa] fallo aviso dueño tenant=${tenantId}: ${e.message}`);
        await writeNotifLog(db, {
          tenantId, type: 'wa_cita_dueno', channel: 'whatsapp', status: 'failed',
          to: { telefono: wa.telefono }, meta: { citaId, error: e.message.slice(0, 200) },
        }).catch(() => {});
      }
    }
  }

  /* ── NIVEL PAGADO: confirmación al cliente (plantilla utility) ───────
     Triple candado. Todo apagado por defecto — sin estos tres flags
     este bloque es inalcanzable y no existe ningún cobro posible. */
  if (cfg.templatesEnabled === true && wa.planCliente === true && cfg.templateCita) {
    const fonoCliente = normalizarFono(cita.clienteTelefono);
    if (fonoCliente && fonoCliente.length >= 11) {
      // Quinto candado — BOLSA DE MENSAJES (wa-bolsas.js): cada plantilla
      // descuenta 1 del saldo del local; sin saldo NO se envía. Fail-closed a
      // propósito: nadie le genera costo Meta a la plataforma sin bolsa pagada.
      if (!(Number(wa.bolsaSaldoConf) > 0)) {
        logger.info(`[wa] template omitido por cupo de confirmaciones agotado tenant=${tenantId}`);
        await writeNotifLog(db, {
          tenantId, type: 'wa_cita_cliente', channel: 'whatsapp_template', status: 'skipped_sin_bolsa',
          to: { telefono: fonoCliente }, meta: { citaId },
        }).catch(() => {});
        return;
      }
      // Cuarto candado — consentimiento explícito del titular. Requiere
      // que el cliente haya marcado el opt-in en el flujo (cita.waOptIn
      // === true en la reserva pública, o registro/dashboard) O que ya
      // exista un consent 'optin' en /wa_optout/{fono}. STOP/BAJA queda
      // bloqueado permanentemente hasta REACTIVAR. Esto cubre el opt-in
      // explícito exigido por Meta Business Policy y Ley 21.719.
      const consent = await consentimientoWa(fonoCliente);
      if (consent === 'optout') {
        logger.info(`[wa] template omitido por opt-out tenant=${tenantId} fono=***${fonoCliente.slice(-4)}`);
        await writeNotifLog(db, {
          tenantId, type: 'wa_cita_cliente', channel: 'whatsapp_template', status: 'skipped_optout',
          to: { telefono: fonoCliente }, meta: { citaId },
        }).catch(() => {});
        return;
      }
      if (consent !== 'optin') {
        // Sin consentimiento previo. Si esta cita lo trae, se registra
        // el opt-in ahora y se procede. Si no, se omite el envío.
        if (cita.waOptIn === true) {
          await registrarOptIn(fonoCliente, 'reserva-checkbox').catch(() => {});
        } else {
          logger.info(`[wa] template omitido por sin-consentimiento tenant=${tenantId} fono=***${fonoCliente.slice(-4)}`);
          await writeNotifLog(db, {
            tenantId, type: 'wa_cita_cliente', channel: 'whatsapp_template', status: 'skipped_no_consent',
            to: { telefono: fonoCliente }, meta: { citaId },
          }).catch(() => {});
          return;
        }
      }
      try {
        // Nombre visible del local para la plantilla.
        const nombreLocal = wa.nombreLocal
          || (await db.collection('tenants').doc(tenantId).get()).data()?.nombre
          || tenantId;
        await enviarTemplate(fonoCliente, cfg.templateCita, cfg.templateLang, [
          cita.clienteNombre || 'Hola',
          cita.servicioNombre || 'tu servicio',
          fmtFecha(cita.fecha),
          `${cita.hora || ''} hrs`,
          nombreLocal,
        ]);
        await writeNotifLog(db, {
          tenantId, type: 'wa_cita_cliente', channel: 'whatsapp_template', status: 'sent',
          to: { telefono: fonoCliente }, meta: { citaId, template: cfg.templateCita },
        }).catch(() => {});
        // Índice fono → último tenant que le escribió: el enrutador del bot
        // oficial lo usa para no hablar a nombre del local equivocado.
        await db.doc(`wa_ultimo_tenant/${fonoCliente}`).set({
          tenantId, en: Timestamp.now(),
        }, { merge: true }).catch(() => {});
        // Descuento del cupo de CONFIRMACIONES: 1 envío = 1 mensaje.
        await db.collection('wa_notif').doc(tenantId).set({
          bolsaSaldoConf: FieldValue.increment(-1),
          bolsaUsados:    FieldValue.increment(1),
        }, { merge: true }).catch(() => {});
        // Si con este envío el cupo llegó a 0, el checkbox de la reserva
        // pública desaparece: todas las citas siguientes nacen verdes.
        if ((Number(wa.bolsaSaldoConf) || 0) - 1 <= 0) {
          require('./wa-bolsas')._syncCheckboxPublico(tenantId).catch(() => {});
        }
        logger.info(`[wa] template cliente enviada tenant=${tenantId} cita=${citaId}`);
      } catch (e) {
        logger.warn(`[wa] fallo template cliente tenant=${tenantId}: ${e.message}`);
      }
    }
  }
}

exports.notificarCitaWhatsAppElegance = onDocumentCreated(
  { document: 'citas/{citaId}', secrets: [WHATSAPP_TOKEN, WHATSAPP_PHONE_ID] },
  async (event) => {
    const data = event.data?.data();
    if (!data) return null;
    // Guard universal (import histórico): no notificar WhatsApp a citas
    // marcadas como import manual. Mismo guard en las 4 CFs.
    if (data.skipNotificaciones === true || data.origen === 'import_manual') {
      logger.info(`[wa] SKIP · cita ${event.params.citaId} importada`);
      return null;
    }
    try { await notificarCita(event.params.citaId, data, 'elegance'); }
    catch (e) { logger.error('[wa elegance]', e.message); }
    return null;
  },
);

exports.notificarCitaWhatsAppTenant = onDocumentCreated(
  { document: 'tenants/{tid}/citas/{citaId}', secrets: [WHATSAPP_TOKEN, WHATSAPP_PHONE_ID] },
  async (event) => {
    const data = event.data?.data();
    if (!data) return null;
    // Guard universal (import histórico): no notificar WhatsApp a citas
    // marcadas como import manual. Mismo guard en las 4 CFs.
    if (data.skipNotificaciones === true || data.origen === 'import_manual') {
      logger.info(`[wa] SKIP · cita ${event.params.citaId} importada`);
      return null;
    }
    try { await notificarCita(event.params.citaId, data, event.params.tid); }
    catch (e) { logger.error('[wa tenant]', e.message); }
    return null;
  },
);

/* ──────────── Recordatorio 24h por plantilla (canal oficial Meta) ────────────
   Sale por el número de PLATAFORMA, no por el del local: ese es justamente el
   punto — si Meta degradara algo, el número del local ni se entera. El canal
   por sesión (evolution/confirmaciones.js) hace lo mismo sobre el número
   propio del local; los dos no deben quedar encendidos para el mismo tenant o
   el cliente recibe el recordatorio dos veces.

   Candados (los mismos del envío al crear la cita, más uno):
     1. _system/whatsapp_notif.templatesEnabled === true
     2. wa_notif/{tid}.planRecordatorio === true      ← propio, NO planCliente:
        un local puede querer la confirmación al reservar y no el recordatorio.
     3. _system/whatsapp_notif.templateRecordatorio definido y aprobado
     4. consentimiento del titular (mismo libro /wa_optout que Evolution)                                                   */

/** ¿Estamos en horario para mandar proactivos? */
function dentroHorarioRecordatorio(now = ahoraChile()) {
  const h = Math.floor(now.mins / 60);
  return h >= RECORD_HORA_INICIO && h < RECORD_HORA_FIN;
}

/** Fecha (YYYY-MM-DD, hora de Chile) desplazada n días. */
function fechaChile(offsetDias = 0) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(Date.now() + offsetDias * 86400000));
}

/** Envía los recordatorios pendientes de UN tenant. Devuelve cuántos salieron. */
async function recordatoriosDeTenant({ tid, wa, cfg, cupoCiclo }) {
  const fecha = fechaChile(1);   // citas de mañana

  const hoy = fechaChile(0);
  const rec = wa.recordatoriosHoy || {};
  let enviadosHoy = rec.fecha === hoy ? (Number(rec.count) || 0) : 0;
  if (enviadosHoy >= RECORD_TOPE_DIA) {
    logger.warn(`[wa:record] ${tid}: tope diario ${RECORD_TOPE_DIA} alcanzado`);
    return 0;
  }

  // Bolsa de mensajes: mismo candado que la confirmación (wa-bolsas.js). Si el
  // saldo se agota a mitad de tanda, las citas restantes NO se marcan y el
  // próximo ciclo las retoma cuando el local recargue.
  let bolsaSaldo = Number(wa.bolsaSaldoRec) || 0;
  if (bolsaSaldo <= 0) {
    logger.warn(`[wa:record] ${tid}: sin cupo de recordatorios en la bolsa; en pausa`);
    return 0;
  }

  const snap = await citasColDe(tid).where('fecha', '==', fecha).get();
  if (snap.empty) return 0;

  const nombreLocal = wa.nombreLocal
    || (await db.collection('tenants').doc(tid).get()).data()?.nombre
    || tid;

  let enviados = 0;
  for (const doc of snap.docs) {
    if (enviados >= cupoCiclo || enviadosHoy + enviados >= RECORD_TOPE_DIA) break;
    if (bolsaSaldo <= 0) {
      logger.warn(`[wa:record] ${tid}: bolsa agotada a mitad de tanda; el resto espera recarga`);
      break;
    }

    const cita = doc.data() || {};
    // Idempotencia: el cron corre cada 30 min, esta marca es lo único que
    // impide que la misma cita se recuerde en cada ciclo del día.
    if (cita.waRecordatorioEnviado === true) continue;
    if (cita.origenQA) continue;                       // barbero fantasma de QA
    if (cita.skipNotificaciones === true || cita.origen === 'import_manual') continue;
    if (['Cancelada', 'Completada', 'No asistió'].includes(cita.estado)) continue;

    const fono = normalizarFono(cita.clienteTelefono);
    if (!fono || fono.length < 11) continue;

    const consent = await consentimientoWa(fono);
    if (consent === 'optout') continue;
    if (consent !== 'optin') {
      if (cita.waOptIn !== true) continue;
      await registrarOptIn(fono, 'reserva-checkbox').catch(() => {});
    }

    try {
      await enviarTemplate(fono, cfg.templateRecordatorio, cfg.templateLang,
        paramsRecordatorio(cfg, { cita, nombreLocal }));
    } catch (e) {
      logger.warn(`[wa:record] ${tid}/${doc.id} falló: ${e.message}`);
      continue;
    }

    // Índice fono → último tenant (enrutador del bot oficial).
    await db.doc(`wa_ultimo_tenant/${fono}`).set({ tenantId: tid, en: Timestamp.now() }, { merge: true }).catch(() => {});
    // Descuento del cupo de RECORDATORIOS: 1 envío = 1 mensaje.
    bolsaSaldo--;
    await db.collection('wa_notif').doc(tid).set({
      bolsaSaldoRec: FieldValue.increment(-1),
      bolsaUsados:   FieldValue.increment(1),
    }, { merge: true }).catch(() => {});
    if (bolsaSaldo <= 0) {   // cupo agotado con este envío → checkbox fuera
      require('./wa-bolsas')._syncCheckboxPublico(tid).catch(() => {});
    }

    // Marca de idempotencia + pendiente para interpretar la respuesta.
    // El pendiente expira 6h DESPUÉS de la cita: un "sí" que llega tarde ya no
    // debe revivir una hora que pasó.
    await doc.ref.update({
      waRecordatorioEnviado:   true,
      waRecordatorioEnviadoEn: FieldValue.serverTimestamp(),
    }).catch(() => {});

    await citaPendienteRef(fono).set({
      tenantId: tid,
      citaId:   doc.id,
      fecha:    cita.fecha,
      hora:     cita.hora || '',
      servicio: cita.servicioNombre || '',
      local:    nombreLocal,
      creadoEn: FieldValue.serverTimestamp(),
      expiraEn: Timestamp.fromMillis(Date.now() + 30 * 60 * 60 * 1000),
    }).catch(() => {});

    await writeNotifLog(db, {
      tenantId: tid, type: 'wa_recordatorio_24h', channel: 'whatsapp_template',
      status: 'sent', to: { telefono: fono },
      meta: { citaId: doc.id, template: cfg.templateRecordatorio },
    }).catch(() => {});

    enviados++;
    logger.info(`[wa:record] ${tid}/${doc.id} → recordatorio enviado`);
  }

  if (enviados > 0) {
    await db.collection('wa_notif').doc(tid).set({
      recordatoriosHoy: { fecha: hoy, count: enviadosHoy + enviados },
    }, { merge: true }).catch(() => {});
  }
  return enviados;
}

exports.recordatorioCitaMeta = onSchedule(
  {
    schedule:       'every 30 minutes',
    timeZone:       'America/Santiago',
    region:         'us-central1',
    secrets:        [WHATSAPP_TOKEN, WHATSAPP_PHONE_ID],
    timeoutSeconds: 300,
  },
  async () => {
    if (!dentroHorarioRecordatorio()) return;

    const cfg = await getGlobalConfig();
    if (cfg.templatesEnabled !== true || !cfg.templateRecordatorio) return;

    // listDocuments, NO collection().get(): la mayoría de los docs padre
    // tenants/{id} no existen como documentos y get() los omite. Acá se
    // enumera wa_notif, que sí tiene docs reales, pero se deja dicho para que
    // nadie lo "arregle" cambiándolo por un get() sobre tenants.
    const waRefs = await db.collection('wa_notif').listDocuments();
    let cupo = RECORD_MAX_CICLO;
    let total = 0;

    for (const ref of waRefs) {
      if (cupo <= 0) break;
      const wa = (await ref.get()).data() || {};
      if (wa.planRecordatorio !== true) continue;

      try {
        const n = await recordatoriosDeTenant({ tid: ref.id, wa, cfg, cupoCiclo: cupo });
        cupo  -= n;
        total += n;
      } catch (e) {
        logger.error(`[wa:record] tenant ${ref.id}:`, e.message);
      }
    }
    if (total > 0) logger.info(`[wa:record] ciclo completo: ${total} recordatorio(s)`);
  },
);

/* ─────────────── Callable: estado del módulo para el panel ─────────────── */

exports.waNotifEstado = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Inicia sesión.');
  const claims = req.auth.token || {};
  const esBootstrap = BOOTSTRAP_EMAILS.includes(String(claims.email || '').toLowerCase());

  // El tenant sale de los claims; bootstrap puede consultar cualquiera.
  let tid = claims.tenantId || null;
  if (esBootstrap && req.data && req.data.tenantId) tid = String(req.data.tenantId);
  if (!tid) throw new HttpsError('permission-denied', 'Cuenta sin local asociado.');
  // admin O jefe: el resto del módulo (waNotifPreferencias, waBolsaReparto,
  // waBolsaCrearLink, gateway, simulador) acepta ambos. Con solo 'admin' acá,
  // a un jefe le fallaba esta callable y WaEstadoLinea —que traga el error—
  // le mostraba "Tu canal está en pausa · Activar" en un local con los avisos
  // andando y con saldo: una afirmación falsa con botón. Auditoría 03-08-2026.
  if (!esBootstrap && !['admin', 'jefe'].includes(claims.role || '')) {
    throw new HttpsError('permission-denied', 'Solo administradores.');
  }

  const [cfg, waSnap] = await Promise.all([
    getGlobalConfig(),
    db.collection('wa_notif').doc(tid).get(),
  ]);
  const wa = waSnap.exists ? (waSnap.data() || {}) : {};
  const ventanaAbierta = !!(wa.ventanaAbiertaHasta && wa.ventanaAbiertaHasta.toMillis() > Date.now());

  return {
    ok: true,
    tenantId: tid,
    // Número de la plataforma para el botón wa.me (null = aún no configurado).
    numeroPlataforma: cfg.numero || null,
    disponible: cfg.freeEnabled !== false && !!cfg.numero,
    activado: waSnap.exists && !!wa.telefono,
    estado: wa.estado || null,
    telefono: wa.telefono ? `•••• ${String(wa.telefono).slice(-4)}` : null,
    ventanaAbierta,
    ventanaHasta: wa.ventanaAbiertaHasta ? wa.ventanaAbiertaHasta.toDate().toISOString() : null,
    planCliente: wa.planCliente === true,
    planRecordatorio: wa.planRecordatorio === true,
    // Bolsas de mensajes (wa-bolsas.js): catálogo con neto + IVA para la
    // tarjeta de compra del panel, y el saldo/consumo del local.
    bolsas:      require('./wa-bolsas')._bolsasDe(cfg),
    // Dos cupos: el local decide cuánto de su bolsa va a confirmar reservas y
    // cuánto a recordar citas (repartoConfPct, callable waBolsaReparto).
    bolsaSaldoConf: Number(wa.bolsaSaldoConf) || 0,
    bolsaSaldoRec:  Number(wa.bolsaSaldoRec)  || 0,
    bolsaSaldo:  (Number(wa.bolsaSaldoConf) || 0) + (Number(wa.bolsaSaldoRec) || 0),
    repartoConfPct: Number.isFinite(Number(wa.repartoConfPct)) ? Number(wa.repartoConfPct) : 50,
    bolsaUsados: Number(wa.bolsaUsados) || 0,
    // Cupo mensual incluido en la mensualidad (tratos a medida): se repone
    // hasta N el día 1 (cron waBolsaReponerMensual), no se acumula.
    bolsaMensual: Number(wa.bolsaMensualIncluida) || 0,
    activadoEn: wa.activadoEn ? wa.activadoEn.toDate().toISOString() : null,
    // Candado GLOBAL del canal oficial. Sin exponerlo, el panel dejaba comprar
    // una bolsa aunque el canal estuviera apagado: MP cobraba, el saldo se
    // acreditaba y no salía ni un mensaje — cobro sin servicio (auditoría
    // 03-08-2026). La vista lo usa para bloquear la compra y explicar por qué.
    canalOficialListo: cfg.templatesEnabled === true,
  };
});
