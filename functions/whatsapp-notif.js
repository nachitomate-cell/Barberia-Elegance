'use strict';

// functions/whatsapp-notif.js
// ─────────────────────────────────────────────────────────────────────────────
//  CONFIRMACIONES DE CITA POR WHATSAPP — Cloud API oficial de Meta
//
//  Dos niveles de servicio:
//
//  ── GRATIS (al DUEÑO del local) — garantía de costo $0 ──────────────────────
//  Meta solo cobra MENSAJES DE PLANTILLA (template). Este nivel envía
//  EXCLUSIVAMENTE mensajes de sesión (type:"text"), que:
//    · dentro de la ventana de servicio de 24h son gratis e ilimitados,
//    · fuera de la ventana NO se entregan NI se cobran (error 131047).
//  Por lo tanto es imposible que este nivel genere costo, incluso si el
//  tracking de ventana fallara. Defensas adicionales:
//    1. Solo se envía si la ventana sigue abierta (últ. mensaje entrante
//       del dueño + 24h, con margen de seguridad de 30 min).
//    2. Tope diario de envíos por tenant (protege la calidad del número).
//    3. Kill switch global: _system/whatsapp_notif.freeEnabled.
//  La ventana se mantiene viva sola: cada notificación pide "Responde 1
//  para confirmar" y cada respuesta del dueño reinicia las 24h. Si la
//  ventana está cerrada, el fallback es el push FCM que ya existe
//  (notificarCitaTenant) — el dueño nunca queda sin enterarse.
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
//
//  ── Funciones ────────────────────────────────────────────────────────────────
//  whatsappWebhook               GET verificación Meta / POST mensajes entrantes
//                                (ACTIVAR <local> · 1 · PAUSAR · REANUDAR).
//  notificarCitaWhatsApp*        triggers onCreate de citas (elegance + tenants).
//  waNotifEstado                 callable para el panel (estado del módulo).
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
const { defineSecret }                  = require('firebase-functions/params');
const { logger }                        = require('firebase-functions');
const admin                             = require('firebase-admin');
const { FieldValue, Timestamp }         = require('firebase-admin/firestore');
const { writeNotifLog }                 = require('./lib/notif-log');

const db = admin.firestore();

const WHATSAPP_TOKEN        = defineSecret('WHATSAPP_TOKEN');
const WHATSAPP_PHONE_ID     = defineSecret('WHATSAPP_PHONE_ID');
const WHATSAPP_VERIFY_TOKEN = defineSecret('WHATSAPP_VERIFY_TOKEN');

const GRAPH_VERSION = 'v23.0';

// Margen de seguridad sobre la ventana de 24h y tope diario por tenant.
const VENTANA_MARGEN_MS = 30 * 60 * 1000;
const TOPE_DIARIO       = 80;

const BOOTSTRAP_EMAILS = ['ignaciiio.mate@gmail.com'];

/* ─────────────────────────── Helpers ─────────────────────────── */

/** Normaliza a dígitos estilo Meta (E.164 sin '+'). Chile: 9XXXXXXXX → 569XXXXXXXX. */
function normalizarFono(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.length === 9 && d.startsWith('9')) d = '56' + d;
  if (d.length === 8) d = '569' + d;
  return d;
}

function fmtFecha(fechaStr) {
  if (!fechaStr) return '—';
  const [y, m, d] = String(fechaStr).split('-').map(Number);
  if (!y || !m || !d) return String(fechaStr);
  return new Date(y, m - 1, d).toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long',
  }).replace(/^\w/, c => c.toUpperCase());
}

async function getGlobalConfig() {
  try {
    const snap = await db.collection('_system').doc('whatsapp_notif').get();
    return snap.exists ? (snap.data() || {}) : {};
  } catch (_) { return {}; }
}

/**
 * Estado de consentimiento WhatsApp del titular (cliente final).
 * Almacenado en /wa_optout/{fono}. El default (sin doc) es "unknown",
 * que la política de envío trata como bloqueo — es más estricto pero
 * cumple con opt-in explícito de Meta Business Policy y Ley 21.719.
 *   · 'optin'   → autorizó recibir por WhatsApp.
 *   · 'optout'  → escribió STOP/BAJA. Prohibido enviar, sin renovación
 *                 automática (solo respondiendo REACTIVAR).
 *   · 'unknown' → nunca aceptó explícitamente. No enviar.
 */
async function consentimientoWa(fono) {
  if (!fono) return 'unknown';
  try {
    const snap = await db.collection('wa_optout').doc(fono).get();
    if (!snap.exists) return 'unknown';
    return snap.data()?.estado === 'optout' ? 'optout' : 'optin';
  } catch (_) { return 'unknown'; }
}

async function registrarOptOut(fono, motivo) {
  const now = Timestamp.now();
  await db.collection('wa_optout').doc(fono).set({
    telefono:       fono,
    estado:         'optout',
    motivo:         motivo || 'stop-usuario',
    actualizadoEn:  now,
    historial:      FieldValue.arrayUnion({ estado: 'optout', fuente: motivo || 'stop-usuario', at: now }),
  }, { merge: true });
}

async function registrarOptIn(fono, motivo) {
  const now = Timestamp.now();
  await db.collection('wa_optout').doc(fono).set({
    telefono:       fono,
    estado:         'optin',
    motivo:         motivo || 'reactivar-usuario',
    actualizadoEn:  now,
    historial:      FieldValue.arrayUnion({ estado: 'optin', fuente: motivo || 'reactivar-usuario', at: now }),
  }, { merge: true });
}

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
  { secrets: [WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, WHATSAPP_VERIFY_TOKEN], cors: false },
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
    const tid = mActivar[1].toLowerCase();
    const esValido = tid === 'elegance'
      ? true
      : (await db.collection('tenants').doc(tid).collection('configuracion').doc('main').get()).exists;
    if (!esValido) {
      await enviarTexto(from, 'No encontramos ese local. Usa el botón "Activar por WhatsApp" desde tu panel de gestión para que el código vaya correcto. 🙏');
      return;
    }
    // Nota: planCliente NO se toca desde aquí — ese flag (plan pagado) lo
    // administra solo Ignacio a mano, y un re-ACTIVAR no debe resetearlo.
    await db.collection('wa_notif').doc(tid).set({
      tenantId: tid,
      telefono: from,
      estado: 'activo',
      ventanaAbiertaHasta: ventanaHasta,
      ultimoEntranteEn: ahora,
      activadoEn: ahora,
    }, { merge: true });
    await db.collection('wa_notif_phones').doc(from).set({ tenantId: tid, updatedAt: ahora });
    await enviarTexto(from,
      '✅ *Notificaciones activadas*\n\n' +
      'Cada vez que un cliente reserve, te avisaremos por aquí al instante.\n\n' +
      '💡 *Importante:* responde *1* cuando recibas una reserva — así confirmas que la viste y mantienes las notificaciones activas. ' +
      'Si pasas más de un día sin responder, los avisos te llegarán por la app del panel hasta que vuelvas a escribir.\n\n' +
      'Comandos: *PAUSAR* · *REANUDAR*');
    logger.info(`[wa] activado tenant=${tid} fono=${from}`);
    return;
  }

  // ── Rutear por teléfono conocido ──
  const idxSnap = await db.collection('wa_notif_phones').doc(from).get();
  if (!idxSnap.exists) {
    // Número desconocido: puede ser un CLIENTE FINAL respondiendo a una
    // plantilla que le llegó por confirmación de cita. Interceptamos STOP/
    // BAJA/CANCELAR ANTES de la respuesta genérica para honrar la baja
    // (Meta Business Policy + Ley 21.719). Y ACTIVAR/REACTIVAR para
    // reincorporarlo.
    const raw = texto.toLowerCase().trim();
    const esStop      = raw === 'stop' || raw === 'baja' || raw === 'cancelar' || raw === 'no' || raw === 'salir';
    const esReanudar  = raw === 'activar' || raw === 'reactivar' || raw === 'reanudar' || raw === 'si' || raw === 'sí';
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

  /* ── NIVEL GRATIS: aviso al dueño (SOLO mensajes de sesión) ─────────── */
  if (cfg.freeEnabled !== false && wa.estado === 'activo' && wa.telefono) {
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
    try { await notificarCita(event.params.citaId, data, event.params.tid); }
    catch (e) { logger.error('[wa tenant]', e.message); }
    return null;
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
    activadoEn: wa.activadoEn ? wa.activadoEn.toDate().toISOString() : null,
  };
});
