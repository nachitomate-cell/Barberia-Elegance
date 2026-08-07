'use strict';

// functions/instagram-reservas.js
// ─────────────────────────────────────────────────────────────────────────────
//  ASISTENTE DE RESERVAS POR INSTAGRAM — el bot del LOCAL, no el de ventas.
//
//  Distinguir los dos es lo primero, porque comparten webhook y se confunden
//  fácil:
//    · instagram-plataforma.js → DMs a @synaptechspa. Cerebro COMERCIAL
//      (evolution/ventas.js): capta leads de los anuncios y agenda reuniones.
//    · este archivo            → DMs a la cuenta de UN LOCAL. Cerebro de
//      RESERVAS (evolution/cerebro.js): consulta disponibilidad y agenda cortes.
//
//  Igual que bot-oficial.js hace con el número oficial de Meta, acá se REUSA el
//  cerebro con otro transporte: mismas tools, mismo system cacheable, mismos
//  candados de negocio (duración real, colación, horarios, días del servicio).
//  El cerebro no sabe por dónde le hablan, y esa es justamente la idea.
//
//  Lo que NO se hereda de WhatsApp, a propósito:
//    · Tope anti-ban. Instagram es API OFICIAL de Meta: no hay riesgo de que
//      bloqueen la cuenta por volumen. El tope de cuota.js protege un número
//      de WhatsApp conectado por sesión, que es otro problema.
//    · Anti-colisión por `fromMe`. En Instagram los ecos vienen marcados
//      (`is_echo`) y los filtra el webhook antes de llegar acá.
//    · Confirmaciones de cita. Esas siguen saliendo por WhatsApp.
//
//  Lo que SÍ aplica y no está en WhatsApp:
//    · VENTANA DE 24 H. Meta rechaza un DM pasadas 24 h desde el último mensaje
//      del usuario. Como acá solo se responde a un mensaje entrante, siempre se
//      está dentro — pero por eso el bot nunca puede escribir primero.
//
//  Habilitación en dos capas, igual que el asistente de WhatsApp:
//    · `_system/{tid}.igAsistente`  → entitlement, solo SynapTech lo escribe.
//    · `tenants/{tid}/configuracion/instagram.botEnabled` → preferencia del
//      local (apagarlo un feriado), nunca contratación.
// ─────────────────────────────────────────────────────────────────────────────

const { logger }     = require('firebase-functions');
const admin          = require('firebase-admin');
const { FieldValue, Timestamp } = require('firebase-admin/firestore');
const Anthropic      = require('@anthropic-ai/sdk');
const { logAiUsage } = require('./lib/metrics');
const ig             = require('./lib/instagram-api');

const db = admin.firestore();

const MAX_HISTORIA = 20;   // turnos guardados por conversación
const MAX_RESP_DIA = 20;   // anti-troll por chat y día
const MAX_LOOPS    = 6;    // vueltas de tools por respuesta
const MAX_TOKENS   = 2000; // ≥2000 con tools: al ras el modelo enmudece sin error

// `elegance` es el tenant legacy: sus colecciones cuelgan de la raíz, no de
// tenants/elegance/. Olvidarlo no da error — lee un doc vacío, o sea "apagado",
// y el bot calla sin motivo aparente.
const raiz = (tid, resto) => (tid === 'elegance' ? resto : `tenants/${tid}/${resto}`);

const convRef = (tid, igsid) => db.doc(raiz(tid, `ig_conversaciones/${igsid}`));

function ahoraChile() {
  const s = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date()).reduce((o, p) => (o[p.type] = p.value, o), {});
  return { fecha: `${s.year}-${s.month}-${s.day}`, hhmm: `${s.hour}:${s.minute}` };
}

/**
 * ¿Este local tiene el asistente de Instagram habilitado y encendido?
 * Devuelve el motivo cuando dice que no, para que el log sirva de algo.
 */
async function estadoDelLocal(tid) {
  const [sysSnap, cfgSnap] = await Promise.all([
    db.doc(`_system/${tid}`).get().catch(() => null),
    db.doc(raiz(tid, 'configuracion/instagram')).get().catch(() => null),
  ]);
  const sys = sysSnap?.data() || {};
  const cfg = cfgSnap?.data() || {};
  if (sys.igAsistente !== true) return { ok: false, motivo: 'sin entitlement igAsistente' };
  // Default encendido una vez habilitado: si SynapTech lo activó, el local no
  // tiene que ir a prenderlo para que empiece a servir.
  if (cfg.botEnabled === false) return { ok: false, motivo: 'apagado por el local' };
  return { ok: true, cfg };
}

/**
 * Atiende un DM entrante dirigido a la cuenta de un LOCAL.
 * Devuelve true si el asistente se hizo cargo (aunque haya decidido callar).
 */
async function procesarDMReserva({ tid, igsid, texto, mid, con, anthropicKey }) {
  if (!tid || !igsid || !texto) return false;

  const estado = await estadoDelLocal(tid);
  if (!estado.ok) {
    logger.info(`[ig-reservas] ${tid}: ${estado.motivo} — no contesta`);
    return false;
  }

  const ref  = convRef(tid, igsid);
  const prev = (await ref.get()).data() || {};

  /* Dedup por id de mensaje. Meta reintenta el webhook cuando la respuesta
     tarda o falla, y sin esto el cliente recibe la misma respuesta dos veces
     —o peor, se le agenda dos veces. Se reclama ANTES del trabajo lento, mismo
     patrón que el webhook de Evolution. */
  const claimed = await db.runTransaction(async (tx) => {
    const s = tx.get ? await tx.get(ref) : null;
    const d = s?.exists ? (s.data() || {}) : {};
    if (mid && d.lastMid === mid) return false;
    tx.set(ref, { lastMid: mid || null, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return true;
  }).catch(() => true);   // falla-abierto: mejor contestar dos veces que callar
  if (!claimed) {
    logger.info(`[ig-reservas] ${tid}: mid repetido (${mid}) — ya contestado`);
    return true;
  }

  const { fecha: hoy, hhmm } = ahoraChile();
  const respHoy = prev.respDia?.fecha === hoy ? (Number(prev.respDia.n) || 0) : 0;
  if (respHoy >= MAX_RESP_DIA) {
    logger.warn(`[ig-reservas] ${tid}/${igsid}: tope de ${MAX_RESP_DIA} respuestas del día`);
    return true;
  }

  // ── Contexto del local: el MISMO que usa WhatsApp ──
  const cerebro = require('./evolution/cerebro');
  const cfgWa = (await db.doc(raiz(tid, 'configuracion/whatsapp')).get().catch(() => null))?.data() || {};
  const { systemFijo, toolsBase, presentacion } = await cerebro._armarContextoLocal(tid, {
    // El estilo y el nombre del asistente los eligió el local una vez; no tiene
    // por qué configurarlos de nuevo por cada canal. Si se leyeran distinto,
    // el mismo negocio tendría dos personalidades según por dónde le escriban.
    estiloChileno: cfgWa.estiloChileno === true,
    nombreAgente:  cfgWa.nombreAgente,
  });

  const { lineasCalendario } = require('./lib/calendario');
  const systemVar = [
    ...lineasCalendario(hoy, hhmm),
    'El cliente te escribe por MENSAJE DIRECTO DE INSTAGRAM.',
    /* El teléfono es la única diferencia real entre este canal y WhatsApp, y
       hay que decirla de las dos formas: qué NO tienes, y qué hacer con eso.
       Sin la primera línea el modelo dice "confírmame tu número" como si ya lo
       supiera; sin la segunda, agenda sin pedirlo y deja una cita que el local
       no puede contactar ni el cliente consultar después. */
    'NO tienes su número de teléfono: por acá no llega con el mensaje.',
    'Pídeselo UNA VEZ, junto con el nombre, cuando ya tengas la hora elegida y estés por agendar. '
      + 'Dile para qué es: para confirmarle la hora y avisarle si pasa algo. '
      + 'Después pásalo en `cliente_telefono` al llamar a agendar_cita.',
    'Si te pregunta por una cita que ya tiene y aún no te dio el número, pídeselo: sin él no puedo buscarla.',
  ].join('\n');

  const historia = Array.isArray(prev.messages) ? prev.messages.slice(-MAX_HISTORIA) : [];
  const messages = [...historia, { role: 'user', content: texto }];

  const anthropic = new Anthropic({ apiKey: anthropicKey });
  // `canal` es lo que hace que la cita quede marcada `ig_bot` en vez de
  // `wa_bot` y que las herramientas sepan que acá no hay número en el chat.
  const ctxTool = { tid, canal: 'instagram', telefono: '', chatId: `ig_${igsid}`, confirmacionesEnabled: false };

  let finalText = '';
  for (let i = 0; i < MAX_LOOPS; i++) {
    const r = await anthropic.messages.create({
      model: cerebro._MODEL,
      max_tokens: MAX_TOKENS,
      system: [
        { type: 'text', text: systemFijo, cache_control: { type: 'ephemeral', ttl: '1h' } },
        { type: 'text', text: systemVar },
      ],
      tools: toolsBase,
      messages,
    });
    // Sin esto el gasto de este canal no aparece en ninguna métrica de ops.
    logAiUsage(cerebro._MODEL, r.usage || {}, tid).catch(() => {});

    const toolUses = r.content.filter(b => b.type === 'tool_use');
    const textos   = r.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
    if (!toolUses.length) { finalText = textos; break; }

    messages.push({ role: 'assistant', content: r.content });
    const results = [];
    for (const tu of toolUses) {
      let out;
      try { out = await cerebro._ejecutarTool(tu.name, tu.input, ctxTool); }
      catch (e) { out = { error: e.message }; }
      results.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(out ?? {}) });
    }
    messages.push({ role: 'user', content: results });
    if (i === MAX_LOOPS - 1) finalText = textos || 'Dame un segundo y te confirmo 🙏';
  }
  if (!finalText) finalText = 'Perdona, ¿me repites eso? 🙏';
  // Cinturón 7 del cerebro: presentarse en el primer mensaje del chat.
  if (presentacion && !historia.length) finalText = cerebro._asegurarPresentacion(finalText, presentacion);

  await ig.enviarDM(con.token, con.igUserId, igsid, finalText);

  await ref.set({
    igsid,
    tenantId: tid,
    cuenta: con.igUserId,
    messages: [...historia,
      { role: 'user', content: texto },
      { role: 'assistant', content: finalText }].slice(-MAX_HISTORIA),
    respDia: { fecha: hoy, n: respHoy + 1 },
    canal: 'instagram',
    // Se registra para saber si más tarde todavía se le puede escribir: Meta
    // rechaza cualquier DM pasadas 24 h desde el último mensaje del usuario.
    ultimoMensajeEn: Timestamp.now(),
    ultimoTexto: texto.slice(0, 400),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true }).catch((e) => logger.warn(`[ig-reservas] ${tid}: guardar historial:`, e.message));

  logger.info(`[ig-reservas] ${tid} ig:${igsid}: respondido (${respHoy + 1}/${MAX_RESP_DIA} hoy)`);
  return true;
}

module.exports = { procesarDMReserva, _estadoDelLocal: estadoDelLocal };
