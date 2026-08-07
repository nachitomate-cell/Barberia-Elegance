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
const { onCall, HttpsError }    = require('firebase-functions/v2/https');
const admin                     = require('firebase-admin');
const { FieldValue, Timestamp } = require('firebase-admin/firestore');
const Anthropic                 = require('@anthropic-ai/sdk');
const { esOperador }            = require('../lib/operadores');

const { _ahoraChile: ahoraChile }        = require('../chat-horas-disponibles');
const { logAiUsage }                     = require('../lib/metrics');
const { puedeGastar, topesDe, _diaCL, _mesCL } = require('../lib/ai-presupuesto');
const { detectarStop, registrarOptOut, estaBloqueado } = require('../lib/wa-consent');

const db = admin.firestore();

// Sonnet y no Haiku a propósito: acá cada conversación es un LEAD que pagó
// stand y tótem para existir. La diferencia de costo por chat (~US$0,05 vs
// ~US$0,01) es ruido al lado de perder un lead por una respuesta torpe.
const MODEL        = 'claude-sonnet-5';
// 2000 y no 500. El largo de la respuesta lo manda el PROMPT ("1 a 4 líneas");
// `max_tokens` es un techo de seguridad, y ponerlo en el largo que uno quiere
// leer es lo que rompió esto: el modelo razona y arma la llamada a herramienta
// ANTES de escribir, así que con 500 se quedaba sin cupo a mitad del tool_use
// y devolvía cero texto. Medido el 06-08: 1 llamada, tokensOut=500 exacto, el
// lead escribió "quiero agendar una hora" y no recibió nada.
// Mismo error que ya mordió en meta-ads-analista.js (1200 → 4000).
const MAX_TOKENS   = 2000;
const MAX_ROUNDS   = 3;                    // tope de rondas de tool-use por mensaje
const MAX_HISTORIA = 16;                   // turnos que se le MANDAN al modelo (8 pares)
const MAX_ARCHIVO  = 80;                   // turnos archivados para auditar (ver cerebro.js)
const SILENCIO_MS  = 4 * 60 * 60 * 1000;  // Ignacio tomó el chat → bot mudo 4 h ahí

// Topes anti-troll / anti-bucle. El presupuesto en USD (ai-presupuesto, vendor
// 'ventas') es el cinturón; estos son los tirantes en unidades de mensaje.
/* ── Ráfaga ────────────────────────────────────────────────────────────────
   En WhatsApp nadie escribe un párrafo: manda "Hola, tengo una barbería" y
   acto seguido "¿Cuáles son los valores?". Sin esto cada mensaje disparaba su
   propia respuesta y ninguna veía a la otra, así que el bot preguntaba lo
   mismo dos y tres veces. Un lead real (06-08-2026) recibió "¿en qué comuna
   está?" justo después de decir "En Ñuñoa", y "¿qué rubro es?" tres veces
   seguidas. Los mismos números que usa el cerebro conversacional. */
const ESPERA_RAFAGA_MS   = 7000;          // ventana para que llegue el siguiente
const VIGENCIA_RAFAGA_MS = 3 * 60 * 1000; // cola vieja = corrida que murió a medias
const MAX_COLA_RAFAGA    = 8;

const MAX_RESP_CHAT_DIA = 12;   // por chat
const MAX_RESP_CHIP_DIA = 150;  // por chip — un solo número no conversa más que esto en un día sano

const millis = (v) => (v && typeof v.toMillis === 'function' ? v.toMillis() : 0);

// Click-to-WhatsApp: lee el referido del anuncio y el texto de los botones /
// Flow del mensaje de bienvenida. Ver lib/ctwa.js para el porqué (auditoría
// 05-08-2026: 14 de 23 chats de anuncios quedaron sin respuesta por esto).
const { referidoDeAnuncio, textoInteractivo, esRespuestaDeFormulario } = require('../lib/ctwa');

// Teclado en el bolsillo: se contesta 2 veces y después silencio (ver
// lib/texto-ilegible — misma regla en el bot de los locales).
const { pareceIlegible, MAX_ILEGIBLES } = require('../lib/texto-ilegible');

const convRef  = (tel)          => db.doc(`wa_ventas_conversaciones/${tel}`);
const cuotaRef = (chipId, f)    => db.doc(`wa_plataforma_cuota/${chipId}__${f}`);

/* ─────────────────────────── El pitch (bloque fijo) ───────────────────────────
   Solo DATOS REALES del producto. Nada de precios: los cierra Ignacio.
   Español neutro cercano (tú), mensajes cortos — es WhatsApp, no un brochure. */
const SYSTEM_FIJO = `Respondes el WhatsApp comercial de Ignacio, el fundador de SynapTech (SynapTech Studio). Escribes SIEMPRE en primera persona, como Ignacio: cercano y directo, jamás corporativo. Las personas que escriben son en su mayoría dueños o encargados de negocios que conocieron SynapTech en la feria ExpoVino (escanearon un QR en el stand) o por redes sociales.

QUÉ ES SYNAPTECH STUDIO
Una plataforma de agenda online y fidelización para negocios que atienden con hora: barberías, peluquerías, salones de belleza, estética y afines.

AGENDA Y RESERVAS
· Agenda online 24/7: los clientes reservan solos desde un link propio del local.
· Agenda por profesional y vista de todo el equipo; cada uno ve la suya.
· Recordatorios y confirmaciones automáticas por WhatsApp: menos inasistencias.
· Lista de espera: si no hay cupo, el cliente queda anotado y se le avisa cuando se libera.
· Reservas en grupo (varias personas a la misma hora) y reagendamiento por el cliente.
· Multi-sucursal: varias sedes bajo un mismo negocio, cada una con su equipo y su caja.

CLIENTES Y FIDELIZACIÓN
· Club de sellos digitales: premios automáticos por visita, sin cartoncito de papel.
· Rangos de cliente frecuente (Silver, Gold, Platinum) con beneficios automáticos.
· Tarjeta en Apple Wallet y Google Wallet.
· NOTIFICACIONES POR CERCANÍA: la tarjeta del wallet aparece sola en la pantalla del teléfono del cliente cuando pasa cerca del local. Esto SÍ EXISTE.
· Referidos: el cliente trae a un amigo y los dos ganan.
· Gift cards, membresías y planes mensuales.
· Ficha de cada cliente con su historial de cortes y fotos.
· Lista negra para los que reservan y nunca llegan.

DINERO
· Caja diaria, gastos, finanzas y métricas del negocio.
· Comisiones del equipo calculadas solas.
· Inventario y venta de productos.
· Pagos online con Mercado Pago y boletas electrónicas.

WHATSAPP E IA
· Asistente con IA que responde y agenda 24/7 por WhatsApp en el número del propio local.
· Bandeja de WhatsApp dentro del panel y campañas de marketing por WhatsApp.

MARCA Y CONTENIDO
· bioo (bioo.cl): link-in-bio premium con agenda, pagos y redes en un solo link.
· Lookbook con las fotos del Instagram del local cargadas solas.
· Pantalla para el televisor del local (BarberTV) y solicitud automática de reseñas de Google.

EQUIPO
· Roles: administrador, profesional y recepción, cada uno con lo que le corresponde.
· Portabilidad de datos y cumplimiento de la Ley 21.719.

Datos reales (verificados): 23 locales activos, más de 9.900 clientes finales registrados y más de 3.800 citas agendadas en los últimos 6 meses.
Web: empieza.synaptechspa.cl · Instagram: @synaptechspa

TU OBJETIVO (en este orden)
1. Responder claro y corto las dudas sobre el producto.
2. Conseguir los datos conversando de forma natural: su nombre, el nombre del negocio, el rubro y la comuna/ciudad. No los pidas todos de golpe.
3. CERRAR UNA REUNIÓN: propón una videollamada corta de 15 minutos por Google Meet para mostrarle la agenda funcionando y armarle un plan. Pregunta qué día y horario le acomodan. Nunca comprometas una hora exacta al tiro: la confirmas después, mirando el calendario.
4. En cuanto el lead ACEPTE reunirse (aunque falten datos), llama a la herramienta registrar_reunion con todo lo que tengas. Sigue las instrucciones que te devuelva: si trae un link de Meet, compártelo diciendo que ese será el link y que confirmas la hora exacta por este chat; si no trae, di que mandas el link al confirmar la hora.

REGLAS DURAS
· PRECIOS: nunca des cifras ni rangos. Di que depende del tamaño del local y los módulos, que hay una versión base gratuita para partir, y que el detalle se lo muestras en la reunión.
· No inventes funciones, plazos, descuentos ni nombres de clientes.
· NUNCA digas que algo "no lo tenemos" o "esa función no existe". La lista de arriba es un resumen, no el catálogo completo: la plataforma tiene decenas de módulos más. Si te preguntan por algo que no está listado, responde que lo confirmas y sigue la conversación ("Déjame confirmarlo y te digo con certeza — ¿para qué tipo de negocio sería?"). Negar de más ha costado ventas: a un lead se le dijo que no había notificaciones por cercanía cuando sí existen.
· Si la duda es sobre algo que SÍ está listado arriba, respóndela con seguridad.
· Si el mensaje NO es de un lead (soporte de un local que ya es cliente, temas personales, proveedores, spam), responde en una línea que le contestas más tarde con calma, y nada más.
· No digas espontáneamente que eres un asistente, un bot o una IA. Si te lo preguntan de frente, no lo niegues con una mentira: di que este número lo atiende el equipo de SynapTech junto a Ignacio y que en la reunión habla directo con él, y sigue con lo que estaban hablando.
· Si piden no recibir más mensajes, discúlpate en una línea y no insistas.
· Nunca compartas datos de otros clientes ni información interna.

ESTILO
· WhatsApp humano: 1 a 4 líneas por mensaje, a veces una sola. Máximo un emoji de vez en cuando.
· Español neutro y cercano, trato de "tú". Cero jerga técnica, cero lenguaje de plantilla; nunca firmes los mensajes.
· Una sola pregunta por mensaje, nunca un interrogatorio.`;

/* ─────────────────── Herramienta: registrar la captura ───────────────────
   El módulo "Leads" no adivina con regex cuándo se cerró la reunión: el
   propio modelo lo declara llamando esta tool con los datos ya estructurados.
   El executor escribe wa_ventas_leads/{tel} (lo que lee la card de ops.html)
   y le avisa a Ignacio a su propio WhatsApp (chat "Mensajes a ti mismo"). */
const TOOLS = [{
  name: 'registrar_reunion',
  description: 'Registra que el lead aceptó tener una reunión por Google Meet. Llámala EN CUANTO el lead acepte reunirse, con todos los datos que tengas hasta ese momento (aunque falten algunos). Vuelve a llamarla si el lead corrige o agrega datos importantes (otro día, otro nombre, etc.).',
  input_schema: {
    type: 'object',
    properties: {
      nombre:        { type: 'string', description: 'Nombre de la persona' },
      negocio:       { type: 'string', description: 'Nombre del negocio/local' },
      rubro:         { type: 'string', description: 'Rubro (barbería, salón, estética, etc.)' },
      comuna:        { type: 'string', description: 'Comuna o ciudad' },
      dia_preferido: { type: 'string', description: 'Día que le acomoda (ej: "lunes 4 de agosto", "esta semana")' },
      franja:        { type: 'string', description: 'Franja horaria preferida (ej: "en la tarde", "después de las 19")' },
      notas:         { type: 'string', description: 'Cualquier dato útil extra (tamaño del local, qué le interesó, urgencia)' },
    },
    required: [],
  },
}];

async function registrarReunion(input, { chipId, cfg, telefono, pushName, evoClient, instancia }) {
  const lead = {
    telefono,
    nombre:       String(input?.nombre || pushName || '').slice(0, 80),
    negocio:      String(input?.negocio || '').slice(0, 120),
    rubro:        String(input?.rubro || '').slice(0, 60),
    comuna:       String(input?.comuna || '').slice(0, 60),
    diaPreferido: String(input?.dia_preferido || '').slice(0, 80),
    franja:       String(input?.franja || '').slice(0, 80),
    notas:        String(input?.notas || '').slice(0, 300),
    estado:       'reunion_solicitada',
    chipId,
    updatedAt:    FieldValue.serverTimestamp(),
  };
  const ref = db.doc(`wa_ventas_leads/${telefono}`);
  const [ya, conv] = await Promise.all([ref.get(), convRef(telefono).get()]);
  // Atribución al anuncio que trajo el lead: sin píxel, este es el único puente
  // entre lo que se gastó en Meta y una reunión real. Se copia al lead para que
  // el analista pueda calcular costo por reunión POR ANUNCIO.
  const anuncio = (conv.data() || {}).anuncio || null;
  await ref.set({
    ...lead,
    ...(anuncio ? { anuncio } : {}),
    ...(ya.exists ? {} : { creadoEn: FieldValue.serverTimestamp() }),
  }, { merge: true });

  // Aviso instantáneo a Ignacio: mensaje a sí mismo desde su propia línea →
  // cae en el chat "Tú" de WhatsApp. Fire-and-forget: si falla, el lead igual
  // queda en la card de ops.html.
  const aviso = [
    '🎯 *Lead listo para reunión*',
    '',
    `👤 ${lead.nombre || '(sin nombre)'}${lead.negocio ? ' · ' + lead.negocio : ''}`,
    [lead.rubro, lead.comuna].filter(Boolean).join(' · '),
    `📅 Prefiere: ${[lead.diaPreferido, lead.franja].filter(Boolean).join(' · ') || 'sin preferencia clara'}`,
    lead.notas ? `📝 ${lead.notas}` : '',
    anuncio ? `📣 Llegó del anuncio${anuncio.titulo ? ` "${anuncio.titulo}"` : ''}${anuncio.sourceId ? ` (id ${anuncio.sourceId})` : ''}` : '',
    '',
    `💬 wa.me/${telefono}`,
    'Confirma hora + link de Meet por ese chat. Card completa en ops.',
  ].filter(Boolean).join('\n');
  evoClient.enviarTexto(instancia, '56983568212', aviso).catch(e =>
    logger.warn(`[ventas:${chipId}] aviso self falló: ${e.message}`));

  logger.info(`[ventas:${chipId}] 🎯 reunión registrada ***${telefono.slice(-4)} (${lead.negocio || 's/negocio'})`);
  const meetLink = String(cfg?.meetLink || '').trim() || null;
  return {
    ok: true,
    meetLink,
    instruccion: meetLink
      ? 'Registrado. Comparte el link de Meet: dile que ese será el link de la reunión y que le confirmas la hora exacta por este mismo chat.'
      : 'Registrado. NO tienes link aún: dile que le confirmas la hora exacta y le mandas el link de Meet por este mismo chat.',
  };
}

const { lineasCalendario } = require('../lib/calendario');
function systemVariable({ fecha, pushName, telefono, anuncio }) {
  return [
    // Calendario masticado: el agente propone días de reunión y JAMÁS debe
    // calcular él qué día de la semana cae una fecha (regla de la casa 02-08).
    ...lineasCalendario(fecha),
    `El lead escribe desde el número ${telefono}${pushName ? ` y en WhatsApp aparece como "${pushName}"` : ''}.`,
    'Si es el primer mensaje de la conversación, saluda breve como Ignacio ("¡Hola! Soy Ignacio, de SynapTech 👋" o similar).',
    'SOLO si el mensaje de la persona menciona ExpoVino, agradécele la visita al stand. Si no lo menciona (por ejemplo llega con "me gustaría conseguir más información sobre esto", que viene de un anuncio en redes), NO des por hecho de dónde viene ni menciones la feria.',
    // Cuando el referido del anuncio viene en el mensaje sabemos con certeza de
    // dónde llega: el modelo puede enganchar con el gancho que ya lo convenció
    // en vez de arrancar en frío. Nunca decirle "vi que venías de un anuncio":
    // suena a vigilancia y enfría el chat.
    anuncio
      ? `ESTA PERSONA LLEGA DE UN ANUNCIO PAGADO EN FACEBOOK/INSTAGRAM${anuncio.titulo ? `, cuyo gancho era "${anuncio.titulo}"` : ''}. Es un lead frío que recién conoce SynapTech: parte por lo que le interesó del anuncio y no menciones ExpoVino. NO le digas que sabes que viene de un anuncio ni que lo estás rastreando.`
      : '',
  ].filter(Boolean).join('\n');
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
  ).trim() || textoInteractivo(msg);
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

  // ── PUERTA DE ACTIVACIÓN: este número es el personal/comercial de Ignacio ──
  // El bot SOLO entra donde el lead se identifica solo: el mensaje precargado
  // del QR del tótem y del NFC dice "ExpoVino" y "agenda online". Amigos,
  // familia, dueños de locales y proveedores escriben cualquier otra cosa →
  // silencio TOTAL (ni el doble check azul se marca): esas conversaciones son
  // de Ignacio, no del bot. Una vez activado el chat (`activado: true`), la
  // conversación sigue completa aunque los mensajes siguientes no repitan la
  // palabra. Gatillos extra configurables en el doc del chip (`activadores`).
  const preData = (await ref.get()).data() || {};
  const yaActivo = preData.activado === true;
  // Un referido de anuncio ES la identificación: quien llega por un CTWA pagado
  // no es amigo ni proveedor. Abre la puerta aunque el texto no matchee nada.
  const anuncio = referidoDeAnuncio(data, msg);
  if (!yaActivo) {
    const textoNorm = String(texto).toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
    const gatillo = !!anuncio
      || esRespuestaDeFormulario(msg)   // completó el formulario del anuncio
      || /expo\s*vino|agenda\s+online/.test(textoNorm)
      || (Array.isArray(cfg?.activadores) && cfg.activadores.some(k =>
           k && textoNorm.includes(String(k).toLowerCase())));
    if (!gatillo) {
      // Contador anónimo del día (ni teléfono ni texto: estos chats son
      // personales). Es la señal que el analista de Meta Ads cruza con el
      // gasto: un salto sobre la línea base = gente escribiendo sin respuesta.
      const f = ahoraChile().fecha;
      cuotaRef(chipId, f).set({
        fecha: f, chipId,
        sin_gatillo: FieldValue.increment(1),
        actualizado: FieldValue.serverTimestamp(),
      }, { merge: true }).catch(() => {});
      logger.info(`[ventas:${chipId}] chat=***${telefono.slice(-4)} sin gatillo (ExpoVino/agenda online/anuncio); lo maneja Ignacio`);
      return;
    }
    if (anuncio) logger.info(`[ventas:${chipId}] chat=***${telefono.slice(-4)} 📣 llega del anuncio ${anuncio.sourceId || anuncio.origen}`);
  }

  // ── Dedup transaccional: reclamar el mensaje antes del trabajo lento ──
  const claimed = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const prev = snap.exists ? (snap.data() || {}) : {};
    if (prev.lastMsgId && prev.lastMsgId === msgId) return false;
    // `activado` queda escrito en el claim: el chat ya cruzó la puerta y los
    // mensajes siguientes entran directo aunque no repitan el gatillo.
    // La atribución del anuncio se guarda en FIRST-TOUCH: si el lead vuelve a
    // escribir desde otro anuncio, manda el que lo trajo la primera vez.
    tx.set(ref, {
      lastMsgId: msgId, activado: true, remoteJid, chipId,
      ...(anuncio && !prev.anuncio ? { anuncio: { ...anuncio, visto: FieldValue.serverTimestamp() } } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
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

  // ── Ilegibles seguidos: se contesta 2 veces y después silencio ──
  // El contador se resetea con el primer mensaje entendible, así que el
  // cliente que arregla el teclado retoma la conversación sin fricción.
  const ilegible = pareceIlegible(texto);
  const ilegiblesPrevios = Number(convData.ilegiblesSeguidos) || 0;
  if (ilegible && ilegiblesPrevios >= MAX_ILEGIBLES) {
    await ref.set({ ilegiblesSeguidos: ilegiblesPrevios + 1, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    logger.info(`[ventas:${chipId}] chat=***${telefono.slice(-4)}: ${ilegiblesPrevios + 1} ilegibles seguidos; no respondo`);
    return;
  }
  await ref.set({
    ilegiblesSeguidos: ilegible ? ilegiblesPrevios + 1 : 0,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true }).catch(() => {});
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

  /* ── Ráfaga: junta los mensajes seguidos y contesta UNA vez ───────────
     Cada mensaje reclama el turno con un token propio y deja su texto en la
     cola del chat. Después espera: si en esa ventana llegó otro, el token dejó
     de ser mío y me retiro en silencio — el último se lleva la cola entera y
     responde por todos. El estado vive en el doc del chat porque entre dos
     webhooks no hay proceso compartido.

     Va DESPUÉS de los topes y del presupuesto: el que se retira no debe haber
     gastado nada, y el que responde ya pasó todos los controles. */
  const miTurno = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await ref.set({
    rafagaTurno: miTurno,
    // Objeto y no string: arrayUnion deduplica por igualdad y dos "sí"
    // seguidos del mismo lead se colapsarían en uno.
    rafagaCola:  FieldValue.arrayUnion({ txt: textoClaude, at: Date.now(), id: String(msgId || miTurno) }),
  }, { merge: true }).catch(() => {});

  await new Promise(r => setTimeout(r, ESPERA_RAFAGA_MS));

  const trasEspera = (await ref.get().catch(() => null))?.data() || {};
  if (trasEspera.rafagaTurno && trasEspera.rafagaTurno !== miTurno) {
    logger.info(`[ventas:${chipId}] chat=***${telefono.slice(-4)}: llegó otro mensaje, contesta esa corrida`);
    return;
  }
  const ahoraMs = Date.now();
  const crudo = Array.isArray(trasEspera.rafagaCola) ? trasEspera.rafagaCola : [];
  const cola = crudo
    .map(x => (typeof x === 'string' ? { txt: x, at: ahoraMs } : x))
    .filter(x => x && typeof x.txt === 'string' && (ahoraMs - Number(x.at || 0)) < VIGENCIA_RAFAGA_MS)
    .sort((a, b) => Number(a.at || 0) - Number(b.at || 0))
    .slice(-MAX_COLA_RAFAGA)
    .map(x => x.txt);
  if (!cola.length) cola.push(textoClaude);
  await ref.set({ rafagaCola: [] }, { merge: true }).catch(() => {});
  const textoRafaga = cola.join('\n');
  if (cola.length > 1) {
    logger.info(`[ventas:${chipId}] chat=***${telefono.slice(-4)}: ${cola.length} mensajes juntados en una respuesta`);
  }

  // ── Claude (loop con tool use: registrar_reunion) ──
  // `historiaCompleta` es el archivo (se vuelve a guardar entero); al modelo
  // solo van los últimos turnos. Antes se recortaba al leer y el recorte se
  // arrastraba al guardar: la conversación vieja se borraba sola.
  const historiaCompleta = Array.isArray(convData.messages) ? convData.messages : [];
  const historia = historiaCompleta.slice(-MAX_HISTORIA);
  const client = new Anthropic({ apiKey: anthropicKey });
  let respuesta = '';
  let motivoCorte = null;   // stop_reason, para poder diagnosticar un vacío
  try {
    const messages = [...historia, { role: 'user', content: textoRafaga }];
    // Mismo esquema de caché que el cerebro: prefijo fijo a 1 h — acá el
    // pitch es corto, pero el TTL largo cubre el ritmo lento de WhatsApp.
    const system = [
      { type: 'text', text: SYSTEM_FIJO, cache_control: { type: 'ephemeral', ttl: '1h' } },
      // `anuncio || preData.anuncio`: el referido solo viaja en el PRIMER
      // mensaje del lead; en los siguientes se recupera de la conversación.
      { type: 'text', text: systemVariable({ fecha: hoy, pushName, telefono, anuncio: anuncio || preData.anuncio || null }) },
    ];
    for (let round = 0; round < MAX_ROUNDS; round++) {
      const resp = await client.messages.create({
        model: MODEL, max_tokens: MAX_TOKENS, system, tools: TOOLS, messages,
      });
      logAiUsage(MODEL, resp.usage || {}, 'ventas').catch(() => {});
      messages.push({ role: 'assistant', content: resp.content });

      if (resp.stop_reason === 'tool_use') {
        const results = [];
        for (const block of resp.content) {
          if (block.type !== 'tool_use') continue;
          let out;
          try {
            out = await registrarReunion(block.input, { chipId, cfg, telefono, pushName, evoClient, instancia });
          } catch (e) {
            logger.error(`[ventas:${chipId}] tool registrar_reunion:`, e.message);
            out = { error: 'Fallo interno al registrar. Sigue la conversación con normalidad.' };
          }
          results.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(out) });
        }
        messages.push({ role: 'user', content: results });
        continue;
      }

      respuesta = resp.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
      motivoCorte = resp.stop_reason || null;
      break;
    }
  } catch (e) {
    logger.error(`[ventas:${chipId}] Claude:`, e.message);
    return;   // mejor callar que responder basura: el lead le llega igual a Ignacio
  }

  // Quedarse mudo es la peor salida posible: pasa justo cuando el lead dice
  // algo tan comprometido como "quiero agendar una hora" (ahí el modelo llama
  // a la herramienta y puede quedarse sin cupo antes de escribir). Antes esto
  // era un `return` sin log y no había forma de enterarse.
  if (!respuesta) {
    logger.error(`[ventas:${chipId}] respuesta VACÍA (stop_reason=${motivoCorte}) para ***${telefono.slice(-4)} — se manda un puente para no dejarlo colgado`);
    respuesta = 'Perdón, se me cruzaron los cables un segundo 😅 ¿Me lo repites?';
  }

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
      ...historiaCompleta,
      { role: 'user', content: textoRafaga },
      { role: 'assistant', content: respuesta },
    ].slice(-MAX_ARCHIVO),
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

/* ─────────────────── Callables del módulo Leads (ops.html) ───────────────────
   Mismo patrón que plataforma.js: ops no carga el SDK de Firestore, todo pasa
   por callables gateadas a operadores. */

function exigirOperador(req) {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Inicia sesión.');
  const email = String(req.auth.token?.email || '').toLowerCase();
  if (!esOperador(email)) {
    throw new HttpsError('permission-denied', 'Solo SynapTech administra los leads de ventas.');
  }
}

const ventasLeads = onCall({ region: 'us-central1', cors: true }, async (req) => {
  exigirOperador(req);
  const [leadsSnap, chipSnap, convsSnap] = await Promise.all([
    db.collection('wa_ventas_leads').orderBy('updatedAt', 'desc').limit(60).get(),
    db.doc('_system/wa_plataforma_ventas').get(),
    db.collection('wa_ventas_conversaciones').where('activado', '==', true).get(),
  ]);
  const chip = chipSnap.data() || {};
  const leads = leadsSnap.docs.map((d) => {
    const l = d.data() || {};
    return {
      telefono:     d.id,
      nombre:       l.nombre || '',
      negocio:      l.negocio || '',
      rubro:        l.rubro || '',
      comuna:       l.comuna || '',
      diaPreferido: l.diaPreferido || '',
      franja:       l.franja || '',
      notas:        l.notas || '',
      estado:       l.estado || 'reunion_solicitada',
      actualizado:  l.updatedAt?.toMillis?.() || null,
    };
  });
  return {
    ok: true,
    leads,
    meetLink:      String(chip.meetLink || '').trim() || null,
    chipConectado: chip.estadoConexion === 'connected',
    convs:         convsSnap.size,
  };
});

const ESTADOS_LEAD = ['reunion_solicitada', 'confirmada', 'realizada', 'descartado'];

const ventasLeadEstado = onCall({ region: 'us-central1', cors: true }, async (req) => {
  exigirOperador(req);
  const tel    = String(req.data?.telefono || '').replace(/\D/g, '');
  const estado = String(req.data?.estado || '');
  if (!/^\d{8,15}$/.test(tel) || !ESTADOS_LEAD.includes(estado)) {
    throw new HttpsError('invalid-argument', 'Teléfono o estado inválido.');
  }
  await db.doc(`wa_ventas_leads/${tel}`).set({ estado, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  logger.info(`[ventas:leads] ***${tel.slice(-4)} → ${estado} (${req.auth.token.email})`);
  return { ok: true, telefono: tel, estado };
});

/* ── Gestión del agente: card "⚙️ Bot de ventas" en ops.html ──
   Lo operable vive en Firestore y se administra desde acá; lo único que
   sigue en código es el prompt (la personalidad), a propósito: cambiarlo
   merece revisión, no un textarea a las 2 AM. */

const CHIP_VENTAS_REF = () => db.doc('_system/wa_plataforma_ventas');

const ventasBotConfig = onCall({ region: 'us-central1', cors: true }, async (req) => {
  exigirOperador(req);
  const hoy = ahoraChile().fecha;
  const [chipSnap, sysSnap, gastoDiaSnap, gastoMesSnap, cuotaSnap, convsSnap] = await Promise.all([
    CHIP_VENTAS_REF().get(),
    db.doc('_system/ventas').get(),
    db.doc(`_metrics/ai_dia_ventas_${_diaCL()}`).get(),
    db.doc(`_metrics/ai_vendor_ventas_${_mesCL()}`).get(),
    cuotaRef('ventas', hoy).get(),
    db.collection('wa_ventas_conversaciones').orderBy('updatedAt', 'desc').limit(15).get(),
  ]);
  const chip  = chipSnap.data() || {};
  const topes = topesDe(sysSnap.data() || {});
  const ahora = Date.now();
  const convs = convsSnap.docs.map((d) => {
    const c = d.data() || {};
    const sil = c.botSilencedUntil?.toMillis?.() || 0;
    const msgs = Array.isArray(c.messages) ? c.messages : [];
    return {
      telefono:    d.id,
      nombre:      c.clienteNombre || '',
      activado:    c.activado === true,
      silenciado:  sil > ahora,
      silenciadoHasta: sil > ahora ? sil : null,
      respHoy:     (c.respDia && c.respDia.fecha === hoy) ? (Number(c.respDia.n) || 0) : 0,
      actualizado: c.updatedAt?.toMillis?.() || null,
      // Transcripción completa de lo archivado, para auditar el chat entero.
      turnos: msgs.slice(-80).map(m => ({
        de: m.role === 'assistant' ? 'bot' : 'lead',
        texto: typeof m.content === 'string' ? m.content : '[no textual]',
      })),
    };
  });
  return {
    ok: true,
    ventasBot:       chip.ventasBot === true,
    estadoConexion:  chip.estadoConexion || 'disconnected',
    numeroVinculado: chip.numeroVinculado || null,
    meetLink:        String(chip.meetLink || '').trim() || null,
    activadores:     Array.isArray(chip.activadores) ? chip.activadores : [],
    topeChat:        MAX_RESP_CHAT_DIA,
    topeChip:        MAX_RESP_CHIP_DIA,
    respHoy:         Number((cuotaSnap.data() || {}).ventas_resp) || 0,
    gasto: {
      hoyUsd:     Number((gastoDiaSnap.data() || {}).costUsd) || 0,
      mesUsd:     Number((gastoMesSnap.data() || {}).costUsd) || 0,
      topeDiaUsd: topes.dia,
      topeMesUsd: topes.mes,
    },
    convs,
  };
});

const RE_MEET = /^https:\/\/meet\.google\.com\/[a-z0-9-]+$/i;

const ventasBotConfigSet = onCall({ region: 'us-central1', cors: true }, async (req) => {
  exigirOperador(req);
  const data = req.data || {};

  // ── Pausar/soltar un chat puntual (mismo interruptor que la anti-colisión) ──
  if (data.chat) {
    const tel = String(data.chat.telefono || '').replace(/\D/g, '');
    if (!/^\d{8,15}$/.test(tel)) throw new HttpsError('invalid-argument', 'Teléfono inválido.');
    await db.doc(`wa_ventas_conversaciones/${tel}`).set({
      botSilencedUntil: data.chat.pausar === true
        ? Timestamp.fromMillis(Date.now() + SILENCIO_MS)
        : FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    logger.info(`[ventas:config] chat ***${tel.slice(-4)} ${data.chat.pausar ? 'pausado 4h' : 'devuelto al bot'} (${req.auth.token.email})`);
    return { ok: true };
  }

  // ── Config del chip ──
  const patch = {};
  if (data.ventasBot !== undefined) patch.ventasBot = data.ventasBot === true;
  if (data.meetLink !== undefined) {
    const link = String(data.meetLink || '').trim();
    if (link && !RE_MEET.test(link)) {
      throw new HttpsError('invalid-argument', 'El link debe ser https://meet.google.com/xxx-xxxx-xxx (o vacío para quitarlo).');
    }
    patch.meetLink = link || FieldValue.delete();
  }
  if (data.activadores !== undefined) {
    if (!Array.isArray(data.activadores)) throw new HttpsError('invalid-argument', 'activadores debe ser una lista.');
    // Normalizados igual que compara el gate: minúsculas y sin tildes.
    const limpio = [...new Set(data.activadores
      .map(a => String(a || '').trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, ''))
      .filter(a => a.length >= 3 && a.length <= 60))].slice(0, 20);
    patch.activadores = limpio;
  }
  if (!Object.keys(patch).length) throw new HttpsError('invalid-argument', 'Nada que cambiar.');

  await CHIP_VENTAS_REF().set(patch, { merge: true });
  logger.info(`[ventas:config] ${JSON.stringify(Object.keys(patch))} por ${req.auth.token.email}`);
  return { ok: true };
});

module.exports = { procesarMensajeVentas, ventasLeads, ventasLeadEstado, ventasBotConfig, ventasBotConfigSet };
