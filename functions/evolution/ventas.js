'use strict';

// functions/evolution/ventas.js
// ─────────────────────────────────────────────────────────────────────────────
//  CEREBRO DE VENTAS — asistente comercial de SynapTech sobre un chip propio.
//
//  Nació en ExpoVino (ago-2026): el QR del tótem apunta al WhatsApp de Ignacio
//  y los leads llegan a toda hora. Este cerebro responde SOLO en los chips que
//  tengan `ventasBot: true` en su doc (_system/wa_plataforma_{chipId}) — el
//  resto de los chips sigue con el flujo de confirmaciones de plataforma.js.
//
//  Qué es y qué NO es:
//   · Es un calificador de leads B2B: responde dudas del producto (agenda
//     online, recordatorios, club, wallets, bioo), captura nombre/negocio/
//     comuna y promete el contacto personal de Ignacio. SIN tools: no agenda,
//     no cobra, no inventa precios.
//   · NO es el bot de locales (cerebro.js): acá no hay tenant, ni citas, ni
//     catálogo. Por eso vive aparte — meterle un "modo ventas" al cerebro de
//     locales habría cruzado los dos dominios en el mismo prompt.
//
//  Anti-colisión (mismo patrón Sprint 4 del cerebro): si Ignacio contesta a
//  mano desde su teléfono, el bot se calla 4 h EN ESE CHAT. En una feria él
//  está vendiendo en persona; el bot es la red de seguridad, no el titular.
// ─────────────────────────────────────────────────────────────────────────────

const { logger }                = require('firebase-functions');
const admin                     = require('firebase-admin');
const { FieldValue, Timestamp } = require('firebase-admin/firestore');
const Anthropic                 = require('@anthropic-ai/sdk');

const { _ahoraChile: ahoraChile }        = require('../chat-horas-disponibles');
const { logAiUsage }                     = require('../lib/metrics');
const { puedeGastar }                    = require('../lib/ai-presupuesto');
const { detectarStop, registrarOptOut, estaBloqueado } = require('../lib/wa-consent');

const db = admin.firestore();

// Sonnet y no Haiku a propósito: acá cada conversación es un LEAD que pagó
// stand y tótem para existir. La diferencia de costo por chat (~US$0,05 vs
// ~US$0,01) es ruido al lado de perder un lead por una respuesta torpe.
const MODEL        = 'claude-sonnet-5';
const MAX_TOKENS   = 500;                  // WhatsApp: respuestas cortas
const MAX_HISTORIA = 16;                   // 8 pares — una conversación de ventas cabe entera
const SILENCIO_MS  = 4 * 60 * 60 * 1000;  // Ignacio tomó el chat → bot mudo 4 h ahí

// Topes anti-troll / anti-bucle. El presupuesto en USD (ai-presupuesto, vendor
// 'ventas') es el cinturón; estos son los tirantes en unidades de mensaje.
const MAX_RESP_CHAT_DIA = 12;   // por chat
const MAX_RESP_CHIP_DIA = 150;  // por chip — un solo número no conversa más que esto en un día sano

const millis = (v) => (v && typeof v.toMillis === 'function' ? v.toMillis() : 0);

const convRef  = (tel)          => db.doc(`wa_ventas_conversaciones/${tel}`);
const cuotaRef = (chipId, f)    => db.doc(`wa_plataforma_cuota/${chipId}__${f}`);

/* ─────────────────────────── El pitch (bloque fijo) ───────────────────────────
   Solo DATOS REALES del producto. Nada de precios: los cierra Ignacio.
   Español neutro cercano (tú), mensajes cortos — es WhatsApp, no un brochure. */
const SYSTEM_FIJO = `Eres el asistente virtual del equipo de SynapTech (SynapTech Studio), respondiendo el WhatsApp comercial de Ignacio, el fundador. Las personas que escriben son en su mayoría dueños o encargados de negocios que conocieron SynapTech en la feria ExpoVino (escanearon un QR en el stand) o por redes sociales.

QUÉ ES SYNAPTECH STUDIO
Una plataforma de agenda online y fidelización para negocios que atienden con hora: barberías, peluquerías, salones de belleza, estética y afines.
· Agenda online 24/7: los clientes del negocio reservan solos desde un link propio del local.
· Panel de gestión: agenda del equipo, caja, ventas, métricas e inventario en el teléfono o el computador.
· Recordatorios y confirmaciones por WhatsApp: menos inasistencias (no-shows).
· Club de fidelidad: sellos y premios automáticos por visita, con rangos para los clientes frecuentes.
· Tarjetas de fidelidad en Apple Wallet y Google Wallet.
· bioo (bioo.cl): link-in-bio premium con agenda, pagos y redes en un solo link.
· Asistente con IA opcional que responde y agenda por WhatsApp en el número del propio local.
Datos reales: 20 locales activos, más de 9.400 clientes finales registrados y más de 3.000 citas agendadas en los últimos 6 meses.
Web: empieza.synaptechspa.cl · Instagram: @synaptechspa

TU OBJETIVO (en este orden)
1. Responder claro y corto las dudas sobre el producto.
2. Capturar los datos del lead conversando de forma natural: su nombre, el nombre del negocio, el rubro y la comuna/ciudad. No los pidas todos de golpe.
3. Cerrar con el compromiso de contacto: "Ignacio te va a escribir personalmente por aquí mismo para mostrarte una demo y armarte un plan a la medida".

REGLAS DURAS
· PRECIOS: nunca des cifras ni rangos. Di que el plan depende del tamaño del local y los módulos, y que Ignacio le manda el detalle hoy mismo. Puedes mencionar que hay una versión base gratuita para partir.
· No inventes funciones, plazos, descuentos ni nombres de clientes. Si no sabes algo, dilo y deriva a Ignacio.
· Si el mensaje NO es de un lead (soporte de un local que ya es cliente, temas personales, proveedores, spam), responde en una línea que Ignacio le responderá directamente, y nada más.
· Si te preguntan si eres un bot, dilo con naturalidad: eres el asistente virtual del equipo.
· Si piden no recibir más mensajes, discúlpate en una línea y no insistas.
· Nunca compartas datos de otros clientes ni información interna.

ESTILO
· WhatsApp: 2 a 5 líneas por mensaje, máximo un emoji de vez en cuando.
· Español neutro y cercano, trato de "tú". Profesional pero con calidez, cero jerga técnica.
· Una sola pregunta por mensaje, nunca un interrogatorio.`;

function systemVariable({ fecha, pushName, telefono }) {
  return [
    `Hoy es ${fecha} (hora de Chile).`,
    `El lead escribe desde el número ${telefono}${pushName ? ` y en WhatsApp aparece como "${pushName}"` : ''}.`,
    'Si es el primer mensaje de la conversación, saluda, preséntate como el asistente del equipo de SynapTech y agradece la visita al stand si viene de ExpoVino.',
  ].join('\n');
}

/* ─────────────────────────── Entrada pública ─────────────────────────── */

/**
 * Procesa un messages.upsert de un chip con ventasBot.
 * @param {object} p
 * @param {string} p.chipId        chip del que llegó (p.ej. 'ventas')
 * @param {object} p.cfg           doc del chip (_system/wa_plataforma_{chipId})
 * @param {object} p.body          payload crudo del webhook de Evolution
 * @param {object} p.evoClient     cliente Evolution ya construido
 * @param {string} p.anthropicKey  ANTHROPIC_API_KEY.value()
 * @param {string} p.instancia     nombre de la instancia (para responder)
 */
async function procesarMensajeVentas({ chipId, cfg, body, evoClient, anthropicKey, instancia }) {
  const data      = body?.data || {};
  const key       = data.key || {};
  let   remoteJid = String(key.remoteJid || '');
  // LID: mismo mapeo que cerebro.js — sin él, el silencio anti-colisión cae en
  // un doc @lid huérfano y el bot le pisa la conversación a Ignacio.
  const jidAlt = String(key.remoteJidAlt || key.senderPn || '');
  if (remoteJid.endsWith('@lid') && jidAlt.endsWith('@s.whatsapp.net')) remoteJid = jidAlt;
  const fromMe = key.fromMe === true;
  const msgId  = String(key.id || '');

  if (!remoteJid) return;
  if (remoteJid.endsWith('@g.us')) return;        // grupos: jamás
  if (remoteJid === 'status@broadcast') return;   // estados: jamás

  const telefono = remoteJid.replace(/[:@].*$/, '');
  const ref      = convRef(telefono);

  // ── ANTI-COLISIÓN: Ignacio escribió a mano → el bot suelta ESE chat 4 h ──
  if (fromMe) {
    const conv = (await ref.get()).data() || {};
    const botIds = Array.isArray(conv.botMsgIds) ? conv.botMsgIds : [];
    if (msgId && botIds.includes(msgId)) return;                       // eco propio
    if (Date.now() - millis(conv.lastBotSendAt) < 15_000) return;      // gracia anti-carrera
    await ref.set({
      botSilencedUntil: Timestamp.fromMillis(Date.now() + SILENCIO_MS),
      remoteJid,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true }).catch(() => {});
    logger.info(`[ventas:${chipId}] chat=***${telefono.slice(-4)}: Ignacio tomó el control → bot en silencio 4h`);
    return;
  }

  // ── Texto entrante (mismo desenvoltorio que cerebro.js) ──
  let msg = data.message || {};
  msg = msg.ephemeralMessage?.message || msg.viewOnceMessage?.message
     || msg.viewOnceMessageV2?.message || msg;
  const texto = String(
    msg.conversation ?? msg.extendedTextMessage?.text ??
    msg.imageMessage?.caption ?? msg.videoMessage?.caption ?? '',
  ).trim();
  const esAudio = !!msg.audioMessage;
  const esMedia = esAudio || !!msg.imageMessage || !!msg.videoMessage
    || !!msg.documentMessage || !!msg.documentWithCaptionMessage
    || !!msg.locationMessage || !!msg.contactMessage || !!msg.contactsArrayMessage;
  if (!texto && !esMedia) return;
  const pushName = String(data.pushName || '').trim();

  const textoClaude = (esMedia && texto)
    ? `${texto}\n\n[Nota: la persona adjuntó ${esAudio ? 'un audio' : 'una imagen o archivo'} que NO puedes ver ni escuchar. Si es relevante, pídele que lo cuente en texto.]`
    : (texto || (esAudio
      ? '[la persona envió un audio que no puedes escuchar — pídele amablemente que te lo escriba]'
      : '[la persona envió una imagen o archivo que no puedes ver]'));

  // ── Dedup transaccional: reclamar el mensaje antes del trabajo lento ──
  const claimed = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const prev = snap.exists ? (snap.data() || {}) : {};
    if (prev.lastMsgId && prev.lastMsgId === msgId) return false;
    tx.set(ref, { lastMsgId: msgId, remoteJid, chipId, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return true;
  });
  if (!claimed) return;

  evoClient.marcarLeido(instancia, [{ remoteJid, fromMe: false, id: msgId }]).catch(() => {});

  // ── STOP: global, antes que todo ──
  if (texto && detectarStop(texto)) {
    await registrarOptOut(telefono, `stop-ventas-${chipId}`).catch(e =>
      logger.error(`[ventas:${chipId}] optout ${telefono}:`, e.message));
    try { await evoClient.enviarTexto(instancia, telefono, '🔕 Listo, no te escribiremos más por este medio. ¡Gracias por tu tiempo!'); } catch (_) {}
    logger.info(`[ventas:${chipId}] chat=***${telefono.slice(-4)}: opt-out registrado`);
    return;
  }
  if (await estaBloqueado(telefono)) return;

  // ── Estado del chat: silencio, memoria y topes ──
  const convData = (await ref.get()).data() || {};
  if (millis(convData.botSilencedUntil) > Date.now()) {
    logger.info(`[ventas:${chipId}] chat=***${telefono.slice(-4)} silenciado (Ignacio al mando); no respondo`);
    return;
  }
  const hoy = ahoraChile().fecha;
  const respHoy = (convData.respDia && convData.respDia.fecha === hoy)
    ? (Number(convData.respDia.n) || 0) : 0;
  if (respHoy >= MAX_RESP_CHAT_DIA) {
    logger.warn(`[ventas:${chipId}] chat=***${telefono.slice(-4)}: tope diario por chat (${MAX_RESP_CHAT_DIA})`);
    return;
  }
  const cuotaHoy = (await cuotaRef(chipId, hoy).get()).data() || {};
  if ((Number(cuotaHoy.ventas_resp) || 0) >= MAX_RESP_CHIP_DIA) {
    logger.warn(`[ventas:${chipId}] tope diario del chip (${MAX_RESP_CHIP_DIA} respuestas); silencio`);
    return;
  }

  // ── Presupuesto IA (vendor 'ventas'): cinturón en USD, falla abierto ──
  const gasto = await puedeGastar('ventas');
  if (!gasto.ok) {
    logger.error(`[ventas:${chipId}] tope de gasto IA (${gasto.motivo}); el bot calla hasta el próximo período`);
    return;
  }

  // ── Claude ──
  const historia = (Array.isArray(convData.messages) ? convData.messages : []).slice(-MAX_HISTORIA);
  const client = new Anthropic({ apiKey: anthropicKey });
  let respuesta = '';
  try {
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      // Mismo esquema de caché que el cerebro: prefijo fijo a 1 h — acá el
      // pitch es corto, pero el TTL largo cubre el ritmo lento de WhatsApp.
      system: [
        { type: 'text', text: SYSTEM_FIJO, cache_control: { type: 'ephemeral', ttl: '1h' } },
        { type: 'text', text: systemVariable({ fecha: hoy, pushName, telefono }) },
      ],
      messages: [...historia, { role: 'user', content: textoClaude }],
    });
    logAiUsage(MODEL, resp.usage || {}, 'ventas').catch(() => {});
    respuesta = resp.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
  } catch (e) {
    logger.error(`[ventas:${chipId}] Claude:`, e.message);
    return;   // mejor callar que responder basura: el lead le llega igual a Ignacio
  }
  if (!respuesta) return;

  // ── Responder + persistir (eco registrado AL TIRO, como cerebro.js) ──
  const sentIds = [];
  try {
    const r = await evoClient.enviarTexto(instancia, telefono, respuesta);
    const id = r && r.key && r.key.id;
    if (id) sentIds.push(String(id));
    await ref.set({
      ...(id ? { botMsgIds: FieldValue.arrayUnion(String(id)) } : {}),
      lastBotSendAt: FieldValue.serverTimestamp(),
    }, { merge: true }).catch(() => {});
  } catch (e) {
    logger.error(`[ventas:${chipId}] enviar a ***${telefono.slice(-4)}:`, e.message);
    return;
  }

  await ref.set({
    messages: [
      ...historia,
      { role: 'user', content: texto || textoClaude },
      { role: 'assistant', content: respuesta },
    ].slice(-MAX_HISTORIA),
    respDia:   { fecha: hoy, n: respHoy + 1 },
    clienteNombre: pushName || convData.clienteNombre || '',
    chipId,
    remoteJid,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true }).catch(() => {});

  // Telemetría del chip (misma colección de cuotas de plataforma).
  await cuotaRef(chipId, hoy).set({
    fecha: hoy, chipId,
    ventas_resp: FieldValue.increment(1),
    actualizado: FieldValue.serverTimestamp(),
  }, { merge: true }).catch(() => {});

  logger.info(`[ventas:${chipId}] respondido a ***${telefono.slice(-4)} (${respHoy + 1}/${MAX_RESP_CHAT_DIA} hoy)`);
}

module.exports = { procesarMensajeVentas };
