'use strict';

// functions/evolution/cerebro.js
// ─────────────────────────────────────────────────────────────────────────────
//  CEREBRO conversacional del add-on "Asistente IA 24/7" (Sprint 2).
//
//  Recibe cada mensaje entrante de WhatsApp (vía evolutionWebhook), lo pasa por
//  Claude con TOOL USE y responde/agenda solo, sobre el número PROPIO del local.
//
//  Herramientas expuestas al modelo (todas server-side, aisladas por tenant):
//    · consultar_servicios      → catálogo real (tenants/{tid}/servicios)
//    · consultar_disponibilidad → primeros cupos libres (reusa chat-horas)
//    · agendar_cita             → crea la cita + candado (misma tx que addCita)
//
//  Blindajes de este sprint:
//    · Solo responde mensajes ENTRANTES (fromMe=false). Ignora sus propios ecos
//      y los mensajes del dueño → sin loops. (La toma-de-control con silencio de
//      2h es el Sprint 4.)
//    · Gating: botEnabled=true Y estadoConexion='connected'. Off = mudo.
//    · Dedup transaccional por messageId (los reintentos de Evolution no
//      re-procesan ni re-agendan).
//    · Nunca inventa: precios/servicios/horas SIEMPRE salen de las tools.
//    · Memoria de conversación acotada (últimos turnos) en
//      tenants/{tid}/wa_conversaciones/{chatId}.
// ─────────────────────────────────────────────────────────────────────────────

const { logger }     = require('firebase-functions');
const admin          = require('firebase-admin');
const { FieldValue, Timestamp } = require('firebase-admin/firestore');
const Anthropic      = require('@anthropic-ai/sdk');

const {
  _buscarDisponibilidad: buscarDisponibilidad,
  _barberoLibreParaSlot: barberoLibreParaSlot,
  _ahoraChile:           ahoraChile,
} = require('../chat-horas-disponibles');
const { logWaSend, logAiUsage } = require('../lib/metrics');

const db = admin.firestore();

const MODEL       = 'claude-haiku-4-5-20251001'; // el más barato + rápido, ideal para agendar (subir a 'claude-sonnet-5' si falta calidad)
const MAX_TOKENS  = 900;                 // respuestas de WhatsApp: cortas
const MAX_ROUNDS  = 5;                   // tope de rondas de tool-use por mensaje
const MAX_HISTORIA = 20;                 // turnos de texto que recordamos (10 pares)
const SILENCIO_MS  = 2 * 60 * 60 * 1000; // anti-colisión: silencio del bot tras toma-de-control (2h)

const millis = (v) => (v && typeof v.toMillis === 'function' ? v.toMillis() : 0);

/* ─────────────────────────── Helpers de datos ─────────────────────────── */

const esE = (tid) => tid === 'elegance';
const serviciosCol = (tid) => (esE(tid) ? db.collection('servicios')  : db.collection(`tenants/${tid}/servicios`));
const citasCol     = (tid) => (esE(tid) ? db.collection('citas')      : db.collection(`tenants/${tid}/citas`));
const slotLocksCol = (tid) => (esE(tid) ? db.collection('slotLocks')  : db.collection(`tenants/${tid}/slotLocks`));
const configRef    = (tid) => (esE(tid) ? db.doc('configuracion/main') : db.doc(`tenants/${tid}/configuracion/main`));
const waCfgRef     = (tid) => db.doc(`tenants/${tid}/configuracion/whatsapp`);
const convRef      = (tid, chatId) => db.doc(`tenants/${tid}/wa_conversaciones/${chatId}`);

function lockIdFor(barberoId, fecha, hora) {
  const safeHora = String(hora || '').replace(':', '');
  const safeBid  = String(barberoId || '').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${safeBid}_${fecha}_${safeHora}`;
}

function genCodigoCita() {
  const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += CHARS[Math.floor(Math.random() * CHARS.length)];
  return code.slice(0, 3) + '-' + code.slice(3);
}

const norm = (s) => String(s || '').toLowerCase().trim()
  .normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Lista los servicios activos del local (para la tool + para validar al agendar). */
async function cargarServicios(tid) {
  const snap = await serviciosCol(tid).get();
  const out = [];
  snap.forEach(d => {
    const s = d.data() || {};
    if (s.activo === false) return;
    out.push({
      id:       d.id,
      nombre:   String(s.nombre || '').trim(),
      precio:   Number(s.precio) || 0,
      duracion: Number(s.duracion || s.duracionServicio) || 30,
    });
  });
  return out.filter(s => s.nombre);
}

/** Matchea el nombre que dijo el modelo contra un servicio real (exacto → incluye). */
function matchServicio(servicios, nombre) {
  const n = norm(nombre);
  if (!n) return null;
  return servicios.find(s => norm(s.nombre) === n)
      || servicios.find(s => norm(s.nombre).includes(n) || n.includes(norm(s.nombre)))
      || null;
}

/* ─────────────────────────── Herramientas (Claude) ─────────────────────────── */

const TOOLS = [
  {
    name: 'consultar_servicios',
    description: 'Devuelve el catálogo REAL de servicios del local con su precio y duración. Úsalo antes de nombrar precios o servicios: nunca los inventes.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'consultar_disponibilidad',
    description: 'Devuelve las horas libres del local. Si pasas `fecha`, busca desde ese día; si no, desde hoy. Devuelve el primer día con cupos dentro de los próximos días. Úsalo siempre antes de ofrecer horas: nunca inventes disponibilidad.',
    input_schema: {
      type: 'object',
      properties: {
        fecha: { type: 'string', description: 'Fecha inicial de búsqueda en formato YYYY-MM-DD (opcional).' },
      },
      required: [],
    },
  },
  {
    name: 'agendar_cita',
    description: 'Reserva una cita real. Llama esto SOLO cuando ya confirmaste con el cliente: servicio, fecha (YYYY-MM-DD), hora (HH:MM) y su nombre. La hora debe haber salido de consultar_disponibilidad. Devuelve el código de la reserva si tuvo éxito.',
    input_schema: {
      type: 'object',
      properties: {
        servicio_nombre: { type: 'string', description: 'Nombre del servicio, tal como aparece en consultar_servicios.' },
        fecha:           { type: 'string', description: 'Fecha de la cita en formato YYYY-MM-DD.' },
        hora:            { type: 'string', description: 'Hora de la cita en formato HH:MM (24h).' },
        cliente_nombre:  { type: 'string', description: 'Nombre del cliente.' },
      },
      required: ['servicio_nombre', 'fecha', 'hora', 'cliente_nombre'],
    },
  },
];

// Se ofrece SOLO cuando el cliente tiene una cita pendiente de confirmar.
const GESTION_CONFIRMACION_TOOL = {
  name: 'gestionar_confirmacion',
  description: 'Aplica la respuesta del cliente a su cita PENDIENTE de confirmación. decision:"confirmar" si asistirá; decision:"cancelar" si no podrá ir.',
  input_schema: {
    type: 'object',
    properties: {
      decision: { type: 'string', enum: ['confirmar', 'cancelar'] },
    },
    required: ['decision'],
  },
};

/** Detecta CONFIRMAR/CANCELAR sin gastar el modelo (respuesta directa al cron). */
function detectarDecision(texto) {
  const t = norm(texto);
  if (/\b(confirmar|confirmo|confirmada|confirmado|asistire|ahi estare|ahi voy|si voy|voy a ir)\b/.test(t)) return 'confirmar';
  if (/\b(cancelar|cancela|cancelo|cancelada|anular|anula|no podre|no puedo|no ire|no asisto|no voy)\b/.test(t)) return 'cancelar';
  return null;
}

/** Aplica la decisión a la cita + limpia el pendiente de la conversación. */
async function aplicarDecision(tid, chatId, citaId, decision) {
  const patch = { estado: decision === 'confirmar' ? 'Confirmada' : 'Cancelada' };
  if (decision === 'confirmar') patch.waClienteConfirmoEn = FieldValue.serverTimestamp();
  else                          patch.waClienteCanceloEn  = FieldValue.serverTimestamp();
  // Cancelar → estado 'Cancelada' dispara liberar-slot-on-cancel (libera el cupo).
  await citasCol(tid).doc(citaId).update(patch).catch(e => logger.error(`[cerebro] aplicarDecision ${tid}/${citaId}:`, e.message));
  await convRef(tid, chatId).update({ citaPendiente: FieldValue.delete() }).catch(() => {});
}

/** Ejecuta la tool que pidió el modelo. Devuelve un objeto (se serializa a JSON). */
async function ejecutarTool(name, input, ctx) {
  const { tid, telefono } = ctx;

  if (name === 'gestionar_confirmacion') {
    const dec = input?.decision === 'cancelar' ? 'cancelar' : (input?.decision === 'confirmar' ? 'confirmar' : null);
    if (!dec) return { ok: false, motivo: 'decision inválida' };
    if (!ctx.citaPendiente?.citaId) return { ok: false, motivo: 'no hay cita pendiente' };
    await aplicarDecision(ctx.tid, ctx.chatId, ctx.citaPendiente.citaId, dec);
    return { ok: true, decision: dec };
  }

  if (name === 'consultar_servicios') {
    const servicios = await cargarServicios(tid);
    if (!servicios.length) return { servicios: [], nota: 'El local aún no cargó servicios.' };
    return { servicios: servicios.map(s => ({ nombre: s.nombre, precio: s.precio, duracion_min: s.duracion })) };
  }

  if (name === 'consultar_disponibilidad') {
    const r = await buscarDisponibilidad(tid, input?.fecha);
    if (!r.slots.length) return { hay_cupos: false, mensaje: 'Sin horas libres en los próximos días.' };
    return { hay_cupos: true, fecha: r.fecha, es_hoy: r.esHoy, horas: r.slots };
  }

  if (name === 'agendar_cita') {
    const fecha = String(input?.fecha || '').trim();
    const hora  = String(input?.hora || '').trim();
    const nombre = String(input?.cliente_nombre || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { ok: false, motivo: 'Fecha inválida (usa YYYY-MM-DD).' };
    if (!/^\d{2}:\d{2}$/.test(hora))        return { ok: false, motivo: 'Hora inválida (usa HH:MM).' };
    if (!nombre)                            return { ok: false, motivo: 'Falta el nombre del cliente.' };

    const servicios = await cargarServicios(tid);
    const svc = matchServicio(servicios, input?.servicio_nombre);
    if (!svc) return { ok: false, motivo: 'Servicio no encontrado.', servicios_validos: servicios.map(s => s.nombre) };

    // Elegir profesional libre en ese slot exacto (misma regla que la agenda pública).
    const barb = await barberoLibreParaSlot(tid, fecha, hora, svc.duracion);
    if (!barb) return { ok: false, motivo: 'Esa hora ya no está disponible. Vuelve a consultar disponibilidad y ofrece otra.' };

    const codigo  = genCodigoCita();
    const lockId  = lockIdFor(barb.id, fecha, hora);
    const lockRef = slotLocksCol(tid).doc(lockId);
    const citaRef = citasCol(tid).doc();

    const citaData = {
      fecha,
      hora,
      clienteNombre:    nombre,
      clienteTelefono:  telefono,
      clienteEmail:     '',
      servicioNombre:   svc.nombre,
      servicioId:       svc.id,
      duracionServicio: svc.duracion,
      precio:           svc.precio,
      barbero:          barb.nombre,
      barberoId:        barb.id,
      // Con confirmaciones activas la cita nace 'Pendiente' (ámbar) y pasa a
      // 'Confirmada' cuando el cliente responde CONFIRMAR. Sin el add-on, nace
      // confirmada como siempre (retrocompat).
      estado:           ctx.confirmacionesEnabled ? 'Pendiente' : 'Confirmada',
      nota:             '',
      origen:           'wa_bot',
      codigoCita:       codigo,
      slotLockId:       lockId,
      waOptIn:          true,
      creadoEn:         FieldValue.serverTimestamp(),
    };

    try {
      await db.runTransaction(async (tx) => {
        const ls = await tx.get(lockRef);
        if (ls.exists) { const e = new Error('slot-taken'); e.code = 'slot-taken'; throw e; }
        tx.set(lockRef, {
          citaId: citaRef.id, fecha, hora, barberoId: barb.id,
          duracion: svc.duracion, origen: 'wa_bot', creadoEn: FieldValue.serverTimestamp(),
        });
        tx.set(citaRef, citaData);
      });
    } catch (e) {
      if (e.code === 'slot-taken') {
        return { ok: false, motivo: 'Alguien tomó esa hora recién. Ofrece otra hora libre.' };
      }
      throw e;
    }

    logger.info(`[cerebro] ${tid}: cita agendada ${codigo} ${fecha} ${hora} (${svc.nombre} · ${barb.nombre})`);
    return {
      ok: true, codigo, fecha, hora,
      servicio: svc.nombre, precio: svc.precio, profesional: barb.nombre,
    };
  }

  return { error: `Herramienta desconocida: ${name}` };
}

/* ─────────────────────────── Prompt de sistema ─────────────────────────── */

function construirSystem({ nombreLocal, direccion, telefonoLocal, fechaHoy, pushName, telefono, estiloChileno }) {
  return [
    `Eres el asistente virtual de "${nombreLocal}", una barbería/peluquería en Chile. Atiendes a los clientes por WhatsApp.`,
    direccion ? `Dirección del local: ${direccion}.` : '',
    telefonoLocal ? `Teléfono del local: ${telefonoLocal}.` : '',
    `Hoy es ${fechaHoy} (hora de Chile). Usa esta fecha para interpretar "hoy", "mañana", "el viernes", etc.`,
    `El cliente escribe desde el número ${telefono}${pushName ? ` y en WhatsApp aparece como "${pushName}"` : ''}.`,
    '',
    'REGLAS:',
    '- Sé cálido, cercano y BREVE (es WhatsApp). Frases cortas, máximo 1–2 emojis.',
    // Estilo configurable por local (configuracion/whatsapp.estiloChileno).
    // Default = neutro (doctrina de copy externo de la plataforma).
    estiloChileno
      ? '- ESTILO CHILENO CERCANO: habla como un chileno amable. Puedes usar modismos suaves con moderación ("bacán", "al tiro", "ya po") — máximo UNO por mensaje y siempre entendible. SIN voseo escrito ("querís", "podís", "vos") ni groserías. La claridad manda: fechas, horas y precios siempre en lenguaje estándar.'
      : '- ESPAÑOL NEUTRO SIEMPRE: trato de "tú" con conjugación estándar (tienes, puedes, quieres). PROHIBIDO el voseo ("querís", "podís", "vos", "tenés") y los modismos o chilenismos ("bacán", "al tiro", "cachai", "po", "filete", "la raja"). Escribe claro y universal, como para cualquier país hispanohablante.',
    '- Tu único trabajo es informar del local y agendar/gestionar citas. Si preguntan otra cosa, redirige con amabilidad.',
    '- NUNCA inventes precios, servicios ni horas. Sácalos SIEMPRE de las herramientas (consultar_servicios / consultar_disponibilidad).',
    '- Antes de agendar, confirma con el cliente el servicio, la fecha y la hora en un mensaje corto.',
    '- Solo llama a agendar_cita con una hora que haya salido de consultar_disponibilidad.',
    '- Si el nombre del cliente ya lo sabes por WhatsApp, úsalo; si no, pídelo antes de agendar.',
    '- Al agendar con éxito, dale el código de la reserva y recuérdale día, hora y servicio.',
    '- Si una hora ya no está disponible, discúlpate y ofrece las alternativas reales que devuelva la herramienta.',
    '- No prometas nada fuera de las herramientas (no cobras online, no cambias precios, no confirmas cosas del local que no sepas).',
  ].filter(Boolean).join('\n');
}

/* ─────────────────────────── Loop agéntico ─────────────────────────── */

async function pensarYResponder({ anthropicKey, system, historia, texto, ctx, tools }) {
  const client = new Anthropic({ apiKey: anthropicKey });
  const messages = [...historia, { role: 'user', content: texto }];

  let finalText = '';
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const resp = await client.messages.create({
      model: MODEL, max_tokens: MAX_TOKENS, system, tools: tools || TOOLS, messages,
    });
    logAiUsage(MODEL, resp.usage?.input_tokens || 0, resp.usage?.output_tokens || 0).catch(() => {}); // métrica ops
    messages.push({ role: 'assistant', content: resp.content });

    if (resp.stop_reason === 'tool_use') {
      const results = [];
      for (const block of resp.content) {
        if (block.type !== 'tool_use') continue;
        let out;
        try { out = await ejecutarTool(block.name, block.input, ctx); }
        catch (e) { logger.error(`[cerebro] tool ${block.name}:`, e.message); out = { error: 'Fallo interno al ejecutar la acción.' }; }
        results.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(out) });
      }
      messages.push({ role: 'user', content: results });
      continue;
    }

    finalText = resp.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
    break;
  }
  return finalText || 'Perdona, ¿me repites eso? 🙏';
}

/* ─────────────────────────── Entrada pública ─────────────────────────── */

/**
 * Punto de entrada desde evolutionWebhook para eventos messages.upsert.
 * @param {object} p
 * @param {string} p.tid          tenant (derivado de instance_{tid})
 * @param {object} p.body         payload crudo del webhook de Evolution
 * @param {object} p.evoClient    cliente Evolution ya construido (con secrets)
 * @param {string} p.anthropicKey ANTHROPIC_API_KEY.value()
 */
async function procesarMensajeEntrante({ tid, body, evoClient, anthropicKey }) {
  const data      = body?.data || {};
  const key       = data.key || {};
  const remoteJid = String(key.remoteJid || '');
  const fromMe    = key.fromMe === true;
  const msgId     = String(key.id || '');

  // ── Filtros de seguridad ──
  if (!remoteJid) return;
  if (remoteJid.endsWith('@g.us')) return;              // grupos: no
  if (remoteJid === 'status@broadcast') return;         // estados: no

  const telefono = remoteJid.replace(/[:@].*$/, '');    // dígitos para responder/guardar
  const chatId   = telefono;                            // doc id de la conversación
  const ref      = convRef(tid, chatId);

  // ── Gating: conectado siempre; luego bot conversacional Y/O confirmaciones ──
  const waCfg = (await waCfgRef(tid).get()).data() || {};
  if (waCfg.estadoConexion !== 'connected') return;
  const botOn  = waCfg.botEnabled === true;
  const confOn = waCfg.confirmacionesEnabled === true;
  if (!botOn && !confOn) return;

  // ── ANTI-COLISIÓN (Sprint 4): mensajes SALIENTES (fromMe) ──
  //   · Eco de un mensaje que enviamos NOSOTROS (bot/confirmación) → ignorar.
  //   · Si no, el DUEÑO escribió a mano desde su celular → "efecto fantasma":
  //     silenciamos el bot 2h en ESE chat para no pisarle la conversación.
  if (fromMe) {
    const conv = (await ref.get()).data() || {};
    const botIds = Array.isArray(conv.botMsgIds) ? conv.botMsgIds : [];
    if (msgId && botIds.includes(msgId)) return;         // eco propio → nada
    // Gracia anti-carrera: si NOSOTROS enviamos algo hace <15s, este eco es
    // casi seguro nuestro aunque su id aún no alcanzara a persistirse (el
    // webhook del eco puede ganarle a la escritura). Sin esta gracia, el bot
    // se silenciaba 2h a sí mismo por su propia respuesta. Costo: una toma de
    // control humana en esos mismos 15s no silencia — el siguiente mensaje
    // del dueño (>15s) sí lo hace.
    if (Date.now() - millis(conv.lastBotSendAt) < 15_000) return;
    await ref.set({
      botSilencedUntil: Timestamp.fromMillis(Date.now() + SILENCIO_MS),
      remoteJid,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true }).catch(() => {});
    logger.info(`[cerebro] ${tid} chat=${chatId}: el dueño tomó el control → bot en silencio 2h`);
    return;
  }

  // ── Mensaje ENTRANTE del cliente (fromMe:false) ──
  const texto = String(
    data.message?.conversation ??
    data.message?.extendedTextMessage?.text ??
    '',
  ).trim();
  if (!texto) return;                                   // por ahora solo texto
  const pushName = String(data.pushName || '').trim();

  // ── Dedup transaccional: reclama el mensaje antes del trabajo lento ──
  const claimed = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const prev = snap.exists ? (snap.data() || {}) : {};
    if (prev.lastMsgId && prev.lastMsgId === msgId) return false;   // reintento → skip
    tx.set(ref, { lastMsgId: msgId, remoteJid, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return true;
  });
  if (!claimed) return;

  // ── Estado de la conversación (memoria + cita pendiente + silencio del bot) ──
  const convSnap = await ref.get();
  const convData = convSnap.data() || {};
  const historia = Array.isArray(convData.messages) ? convData.messages : [];
  const citaPendiente = convData.citaPendiente || null;
  const silenciado = millis(convData.botSilencedUntil) > Date.now();
  const botActivo = botOn && !silenciado;               // ¿responde el bot conversacional?

  const sentIds = [];
  const responder = async (txt) => {
    let ok = false;
    try {
      const r = await evoClient.enviarTexto(`instance_${tid}`, telefono, txt);
      const id = r && r.key && r.key.id;
      if (id) sentIds.push(String(id));                 // registrar nuestro eco (anti-colisión)
      // El id del eco se registra AL TIRO (no solo en persistir(), que corre
      // después): el webhook del eco fromMe puede llegar antes que esa
      // persistencia y, sin el id en botMsgIds, la anti-colisión leería
      // nuestro propio mensaje como "el dueño escribió" → silencio de 2h
      // autoinfligido. lastBotSendAt alimenta la gracia anti-carrera de arriba.
      await ref.set({
        ...(id ? { botMsgIds: FieldValue.arrayUnion(String(id)) } : {}),
        lastBotSendAt: FieldValue.serverTimestamp(),
      }, { merge: true }).catch(() => {});
      ok = true;
    } catch (e) { logger.error(`[cerebro] ${tid} enviar:`, e.message); }
    await logWaSend(tid, 'bot', ok).catch(() => {});    // métrica para el dashboard ops
  };
  const persistir = async (respuesta) => {
    const nuevaHistoria = [
      ...historia,
      { role: 'user', content: texto },
      { role: 'assistant', content: respuesta },
    ].slice(-MAX_HISTORIA);
    const botMsgIds = [...(Array.isArray(convData.botMsgIds) ? convData.botMsgIds : []), ...sentIds].slice(-20);
    await ref.set({
      messages:      nuevaHistoria,
      botMsgIds,
      clienteNombre: pushName || convData.clienteNombre || '',
      remoteJid,
      updatedAt:     FieldValue.serverTimestamp(),
    }, { merge: true }).catch(() => {});
  };

  // ── FAST-PATH de confirmación: CONFIRMAR / CANCELAR (aplica aunque el bot esté silenciado) ──
  if (confOn && citaPendiente) {
    const decision = detectarDecision(texto);
    if (decision) {
      await aplicarDecision(tid, chatId, citaPendiente.citaId, decision);
      const reply = decision === 'confirmar'
        ? '¡Listo! Tu cita quedó *confirmada* ✅ Te esperamos. 🙌'
        : 'Tu cita quedó *cancelada*. ¡Gracias por avisar! Cuando quieras, escríbeme y agendamos de nuevo. 🙏';
      await responder(reply);
      await persistir(reply);
      logger.info(`[cerebro] ${tid} chat=${chatId} confirmación=${decision} (fast-path)`);
      return;
    }
    // Ambiguo: si el bot conversacional NO está activo, nudge (solo si no está silenciado) y cortar.
    if (!botActivo) {
      if (!silenciado) {
        const reply = 'Para tu cita, por favor responde *CONFIRMAR* o *CANCELAR* 🙏';
        await responder(reply);
        await persistir(reply);
      }
      return;
    }
    // Con bot conversacional activo seguimos: Claude maneja la respuesta ambigua con contexto.
  }

  if (!botActivo) return;   // bot apagado o silenciado (dueño al mando) → no respondemos

  // ── Contexto del local (nombre/dirección/teléfono viven en el doc del tenant) ──
  const [tenantSnap, confSnap] = await Promise.all([
    db.doc(`tenants/${tid}`).get(),
    configRef(tid).get(),
  ]);
  const tdoc = tenantSnap.data() || {};
  const conf = confSnap.data() || {};
  const nombreLocal   = tdoc.nombre || tdoc.nombreCorto || tid;
  const direccion     = tdoc.direccion || '';
  const telefonoLocal = tdoc.telefono || conf.telefonoAdmin || '';
  const fechaHoy      = ahoraChile().fecha;

  let system = construirSystem({ nombreLocal, direccion, telefonoLocal, fechaHoy, pushName, telefono, estiloChileno: waCfg.estiloChileno === true });
  if (citaPendiente) {
    system += `\n\nIMPORTANTE: Este cliente tiene una cita PENDIENTE de confirmar: ${citaPendiente.servicio || 'servicio'} el ${citaPendiente.fecha} a las ${citaPendiente.hora}. Si su mensaje indica que asistirá, llama a gestionar_confirmacion con decision:"confirmar". Si indica que no podrá o quiere cancelar, llama con decision:"cancelar". Luego responde corto y cálido.`;
  }
  const tools = citaPendiente ? [...TOOLS, GESTION_CONFIRMACION_TOOL] : TOOLS;

  // ── Pensar ──
  let respuesta;
  try {
    respuesta = await pensarYResponder({
      anthropicKey, system, historia, texto, tools,
      ctx: { tid, telefono, pushName, confirmacionesEnabled: confOn, chatId, citaPendiente },
    });
  } catch (e) {
    logger.error(`[cerebro] ${tid} pensar:`, e.message);
    return; // sin respuesta antes que una respuesta rota
  }

  await responder(respuesta);
  await persistir(respuesta);
  logger.info(`[cerebro] ${tid} chat=${chatId} respondido (${respuesta.length} chars)`);
}

module.exports = { procesarMensajeEntrante };

// Para tests locales (scripts con Admin SDK): no es parte del API público.
module.exports._ejecutarTool    = ejecutarTool;
module.exports._cargarServicios = cargarServicios;
