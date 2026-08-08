'use strict';

// functions/prospeccion.js
// ─────────────────────────────────────────────────────────────────────────────
//  PROSPECCIÓN — el agente de ventas deja de esperar y sale a buscar.
//
//  Hasta ahora todo el embudo comercial era REACTIVO: el bot de WhatsApp y el
//  de Instagram contestan a quien escribe primero (ventas.js), y los leads del
//  form caen en _synaptechLeads. Este módulo agrega la mitad que faltaba, con
//  una regla no negociable: SOLO por canales que no arriesgan las cuentas.
//  Meta ya restringió el chip principal (31-jul) — acá no hay DM frío
//  automatizado ni WhatsApp masivo a números scrapeados. Lo que sí hay:
//
//   1. RESCATE DE TIBIOS (cron cada hora) — conversaciones reales que se
//      enfriaron hace 18–26 h sin reunión agendada reciben UN follow-up.
//      En Instagram respeta la ventana de 24 h de Meta; el texto es fijo
//      (masticado: cero improvisación del modelo en un mensaje no pedido).
//
//   2. SECUENCIADOR DE EMAIL FRÍO (cron diario) — prospectos con email
//      reciben una secuencia D0/D+3/D+7 redactada por Claude con los datos
//      scrapeados del negocio. Nace en modo BORRADOR: los correos quedan en
//      el doc del prospecto y se aprueban desde ops. `emailAuto: true` en
//      _system/prospeccion los suelta solos (activar recién cuando exista el
//      dominio de frío — hola@synaptechspa.cl es transaccional y no se quema).
//
//   3. COLA DE DMs PREPARADOS — la API de Instagram NO permite iniciar
//      conversaciones (el IGSID solo existe cuando la persona escribe), así
//      que el DM frío lo envía un humano: el agente redacta el mensaje
//      personalizado, ops lo muestra con botón de copiar, y Massiel/Ignacio
//      lo pegan desde el teléfono. Cuando el prospecto contesta, el webhook
//      de siempre lo atiende y los triggers de acá lo marcan "respondió".
//
//   4. REACTIVACIÓN WA (cron diario, apagada por defecto) — leads PROPIOS
//      (ya conversaron con el chip de ventas) inactivos 7–30 días reciben un
//      toque. Solo números que escribieron primero: nada de frío por
//      Evolution, que es la receta exacta del baneo.
//
//  Colecciones:
//    _synaptechProspectos/{id}      — un doc por prospecto (ver forma abajo)
//    _synaptechProspeccionCuota/{f} — contadores diarios (rescates, emails…)
//    _system/prospeccion            — config viva sin deploy (switches, topes)
//
//  Forma del prospecto:
//    { nombre, negocio, rubro, comuna, direccion, telefono, email, instagram,
//      origen: 'massiel'|'manual'|'lead', estado: 'frio'|'contactado'|
//      'respondio'|'reunion'|'sin_respuesta'|'optout'|'descartado',
//      emailsEnviados, toques: [{tipo, en, detalle}], emailBorrador,
//      dmBorrador, optOutToken, notas, creadoEn, updatedAt }
//
//  El estado AVANZA solo (triggers sobre wa_ventas_conversaciones y
//  wa_ventas_leads); retroceder es siempre manual desde ops.
// ─────────────────────────────────────────────────────────────────────────────

const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { onSchedule }                    = require('firebase-functions/v2/scheduler');
const { onDocumentWritten }             = require('firebase-functions/v2/firestore');
const { defineSecret }                  = require('firebase-functions/params');
const { logger }                        = require('firebase-functions');
const admin                             = require('firebase-admin');
const crypto                            = require('crypto');
const { FieldValue, Timestamp }         = require('firebase-admin/firestore');
const Anthropic                         = require('@anthropic-ai/sdk');

const { esOperadorReq }             = require('./lib/operadores');
const { enviarEmail, MAIL_SECRETS } = require('./lib/mailer');
const { estaBloqueado }             = require('./lib/wa-consent');
const { logAiUsage }                = require('./lib/metrics');
const { puedeGastar }               = require('./lib/ai-presupuesto');
const ig                            = require('./lib/instagram-api');
const { _ahoraChile: ahoraChile }   = require('./chat-horas-disponibles');
const { conDiaSemana }              = require('./lib/calendario');
// La agenda REAL de Ignacio (candados transaccionales): las reuniones que se
// crean desde la pestaña usan la misma cañería que las del bot.
const agendaVentas                  = require('./evolution/ventas-agenda');

const db = admin.firestore();

const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');
const EVOLUTION_API_URL = defineSecret('EVOLUTION_API_URL');
const EVOLUTION_API_KEY = defineSecret('EVOLUTION_API_KEY');

// Mismo modelo y techo que ventas.js, y por el mismo motivo: cada texto que
// sale de acá le llega a un negocio real con nombre y apellido.
const MODEL      = 'claude-sonnet-5';
const MAX_TOKENS = 2000;

const WHATSAPP_IGNACIO = '56983568212';
// Misma instancia hardcodeada que admin-alerts / cobranza-saas-daily: el chip
// comercial de Ignacio. El mapeo chipId→instancia vive en evolution/plataforma
// (_instanciaDe) y de ahí se deriva para los envíos por conversación.
const INSTANCIA_VENTAS = 'instance_plat_ventas';
const OPTOUT_URL       = 'https://us-central1-barberia-elegance.cloudfunctions.net/prospeccionOptOut';

const PROSPECTOS = () => db.collection('_synaptechProspectos');
const CFG_REF    = () => db.doc('_system/prospeccion');
const cuotaRef   = (fecha) => db.doc(`_synaptechProspeccionCuota/${fecha}`);

/* ─────────────────────────────── Config ───────────────────────────────
   Todo switch vive en Firestore para moverlo sin deploy. Los defaults son
   deliberadamente conservadores: lo único que corre solo desde el día uno es
   el rescate de tibios, que le habla a gente que YA nos escribió. */

const CFG_DEFAULTS = {
  activo: true,
  rescateAuto: true,          // palanca 1 — follow-up a conversaciones tibias
  emailAuto: false,           // palanca 2 — false = los correos quedan en borrador
  reactivacionAuto: false,    // palanca 4 — false = solo se listan candidatos en ops
  maxEmailsDia: 20,
  maxRescatesDia: 20,
  maxReactivacionesDia: 10,
  // Mientras no exista el dominio de frío, el remitente es el transaccional;
  // por eso emailAuto nace apagado y los envíos son aprobados a mano.
  emailFrom: 'Ignacio de SynapTech <hola@synaptechspa.cl>',
  emailReplyTo: 'ignaciiio.mate@gmail.com',
  // Ley 19.496 art. 28B: el correo promocional no solicitado se identifica
  // como publicidad. Se puede apagar desde ops bajo criterio de Ignacio.
  emailPrefijoPublicidad: true,
  // Orden en que se trabaja la calle (decisión de Ignacio, 08-08): la cola de
  // DMs y la secuencia de correos redactan primero a las comunas de arriba.
  comunasPrioridad: ['viña del mar', 'valparaíso', 'curauma', 'providencia'],
};

const normComuna = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

/** Posición de la comuna en el orden de trabajo; lo desconocido va al final. */
function prioridadComuna(cfg, comuna) {
  const lista = Array.isArray(cfg?.comunasPrioridad) && cfg.comunasPrioridad.length
    ? cfg.comunasPrioridad : CFG_DEFAULTS.comunasPrioridad;
  const c = normComuna(comuna);
  const i = lista.findIndex((x) => c.includes(normComuna(x)));
  return i === -1 ? lista.length : i;
}

async function leerCfg() {
  const guardada = (await CFG_REF().get()).data() || {};
  return { ...CFG_DEFAULTS, ...guardada };
}

const millis = (v) => (v && typeof v.toMillis === 'function' ? v.toMillis() : 0);

function clienteEvolution() {
  return require('./evolution/client').crearCliente({
    baseUrl: EVOLUTION_API_URL.value(), apiKey: EVOLUTION_API_KEY.value(),
  });
}

/** Conexión de Instagram de la PLATAFORMA (@synaptechspa), para los DMs. */
async function conexionIG() {
  const c = (await db.doc('_system/instagram_synaptech').get()).data() || {};
  if (!c.accessToken) return null;
  return { token: c.accessToken, igUserId: String(c.instagramUserId || '') };
}

/**
 * Dirección → lat/lng con Nominatim (OSM). Best-effort con timeout corto:
 * el mapa de la cartera lo necesita, pero un alta jamás falla por geocoding.
 * Mismo proveedor que usa scripts/geocodificar-prospectos.js para el seed.
 */
async function geocodificar(direccion, comuna = 'Providencia') {
  if (!direccion) return null;
  try {
    const q = `${direccion}, ${comuna}, Santiago, Chile`;
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'SynapTech-Prospeccion/1.0 (hola@synaptechspa.cl)' },
      signal: AbortSignal.timeout(4000),
    });
    const j = await res.json().catch(() => []);
    const hit = Array.isArray(j) && j[0];
    if (!hit || !hit.lat) return null;
    return { lat: Number(hit.lat), lng: Number(hit.lon) };
  } catch (_) { return null; }
}

/** Aviso a Ignacio por su WhatsApp. Fire-and-forget: informar no puede romper. */
async function avisarIgnacio(texto) {
  try {
    await clienteEvolution().enviarTexto(INSTANCIA_VENTAS, WHATSAPP_IGNACIO, texto);
  } catch (e) { logger.warn('[prospeccion] aviso a Ignacio:', e.message); }
}

async function sumarCuota(campo, n = 1) {
  const fecha = ahoraChile().fecha;
  await cuotaRef(fecha).set({
    fecha, [campo]: FieldValue.increment(n), actualizado: FieldValue.serverTimestamp(),
  }, { merge: true }).catch(() => {});
}

async function cuotaDeHoy() {
  return (await cuotaRef(ahoraChile().fecha).get()).data() || {};
}

/* ═══════════════════ PALANCA 1 · Rescate de tibios ═══════════════════
   Un lead que preguntó y se enfrió es plata ya gastada (el clic del anuncio
   se pagó). El rescate manda UN único follow-up por conversación, con texto
   FIJO — un mensaje no pedido no es lugar para que el modelo improvise. */

// Sin fechas, sin horas, sin promesas que dependan de datos: solo retomar.
function textoRescate(nombre) {
  const saludo = nombre ? `¡Hola ${String(nombre).split(' ')[0]}!` : '¡Hola!';
  return `${saludo} Soy Ignacio, de SynapTech 👋 Quedamos a mitad de conversación y no quiero dejarte sin respuesta. Si te sirve, te muestro la agenda funcionando en una videollamada corta de 15 minutos — dime qué día te acomoda y lo coordinamos por aquí mismo 🙌`;
}

const RESCATE_DESDE_MS = 18 * 3600e3;   // menos de 18 h: todavía no está frío
const RESCATE_HASTA_MS = 26 * 3600e3;   // más de 26 h: en IG la ventana ya murió
const VENTANA_IG_MS    = 23 * 3600e3;   // margen sobre las 24 h duras de Meta

async function correrRescate({ limite }) {
  const ahora = Date.now();
  const desde = Timestamp.fromMillis(ahora - RESCATE_HASTA_MS);
  const hasta = Timestamp.fromMillis(ahora - RESCATE_DESDE_MS);

  // Rango sobre un solo campo: no exige índice compuesto. El resto de los
  // filtros (activado, silencio, canal) se resuelve en memoria — la colección
  // son decenas de docs, no miles.
  const snap = await db.collection('wa_ventas_conversaciones')
    .where('updatedAt', '>=', desde).where('updatedAt', '<=', hasta).get();

  const resultados = [];
  for (const doc of snap.docs) {
    if (resultados.filter((r) => r.enviado).length >= limite) break;
    const conv = doc.data() || {};
    const id   = doc.id;

    if (conv.activado !== true) continue;
    if (conv.rescate) continue;                                  // ya se rescató una vez
    if (millis(conv.botSilencedUntil) > ahora) continue;         // Ignacio al mando
    if (conv.chipId === 'sandbox') continue;                     // probador del bot

    // Si el último turno es del LEAD, el bot le quedó debiendo una respuesta:
    // eso es una falla a diagnosticar, no un tibio que rescatar encima.
    const msgs = Array.isArray(conv.messages) ? conv.messages : [];
    if (!msgs.length || msgs[msgs.length - 1].role !== 'assistant') continue;

    const esIG     = id.startsWith('ig_');
    const telefono = esIG ? null : id;

    // Con reunión tomada (o ya realizada) no hay nada que rescatar; se le
    // escribiría encima de una cita confirmada. El doc de lead comparte id
    // con la conversación en ambos canales (tel o ig_{igsid}).
    const lead = (await db.doc(`wa_ventas_leads/${id}`).get()).data() || {};
    if (['confirmada', 'realizada'].includes(lead.estado)) continue;
    if (telefono) {
      if (!/^\d{9,15}$/.test(telefono)) continue;                // defensivo
      if (await estaBloqueado(telefono)) continue;               // dijo STOP
    }

    const texto = textoRescate(conv.clienteNombre);
    try {
      if (esIG) {
        const igsid = id.slice(3);
        const meta  = (await db.doc(`ig_conversaciones/${igsid}`).get()).data() || {};
        if (meta.esSoporte === true) continue;
        // La ventana de Meta corre desde el último mensaje DEL LEAD, no desde
        // la última actividad del doc (que también la toca el bot al responder).
        const ultimoDelLead = millis(meta.ultimoMensajeEn);
        if (!ultimoDelLead || (ahora - ultimoDelLead) > VENTANA_IG_MS) {
          await doc.ref.set({ rescate: { en: FieldValue.serverTimestamp(), resultado: 'ventana_cerrada' } }, { merge: true });
          continue;
        }
        const con = await conexionIG();
        if (!con) { logger.warn('[rescate] Instagram sin conexión; me salto los ig_'); continue; }
        await ig.enviarDM(con.token, con.igUserId, igsid, texto);
      } else {
        // El mapeo chipId→instancia es de plataforma.js y se le pide a él:
        // copiarlo acá sería una lista espejo esperando desincronizarse.
        const instancia = require('./evolution/plataforma')._instanciaDe(conv.chipId || 'ventas');
        await clienteEvolution().enviarTexto(instancia, telefono, texto);
      }
    } catch (e) {
      logger.warn(`[rescate] ${id}: no se pudo enviar —`, e.message);
      resultados.push({ id, enviado: false, error: e.message });
      continue;
    }

    // El follow-up entra a la MEMORIA de la conversación: si el lead contesta
    // "ya, el jueves", el cerebro tiene que saber a qué venía ese jueves.
    // `msgsAlEnviar` es la vara de medición: si después la historia creció,
    // el rescate revivió la conversación — así se evalúa si vale la pena.
    await doc.ref.set({
      messages: [...msgs, { role: 'assistant', content: texto }],
      rescate: {
        en: FieldValue.serverTimestamp(), resultado: 'enviado',
        canal: esIG ? 'instagram' : 'whatsapp', msgsAlEnviar: msgs.length + 1,
      },
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    await sumarCuota('rescates');
    resultados.push({ id, enviado: true, canal: esIG ? 'instagram' : 'whatsapp' });
    logger.info(`[rescate] follow-up a ${id.slice(0, 6)}*** (${esIG ? 'IG' : 'WA'})`);
  }
  return resultados;
}

exports.prospeccionRescateCron = onSchedule({
  schedule: '10 * * * *',            // cada hora; la franja 18–26 h da holgura de sobra
  timeZone: 'America/Santiago',
  region:   'us-central1',
  secrets:  [EVOLUTION_API_URL, EVOLUTION_API_KEY],
  timeoutSeconds: 300,
  memory: '512MiB',
}, async () => {
  const cfg = await leerCfg();
  if (!cfg.activo || !cfg.rescateAuto) { logger.info('[rescate] apagado por config'); return; }

  const hechoHoy = Number((await cuotaDeHoy()).rescates) || 0;
  const cupo = Math.max(0, (Number(cfg.maxRescatesDia) || 20) - hechoHoy);
  if (!cupo) { logger.info('[rescate] tope diario alcanzado'); return; }

  const r = await correrRescate({ limite: cupo });
  const enviados = r.filter((x) => x.enviado);
  if (enviados.length) {
    await avisarIgnacio([
      '🌡 *Rescate de leads tibios*', '',
      `Retomé ${enviados.length} conversación(es) que se habían enfriado:`,
      ...enviados.map((x) => `· ${x.canal === 'instagram' ? '📸' : '💬'} ${x.id.replace('ig_', 'IG ***').slice(-8)}`),
      '', 'Si contestan, el bot sigue la conversación como siempre.',
    ].join('\n'));
  }
});

/* ═══════════════════ PALANCA 2 · Email frío secuenciado ═══════════════════ */

const CADENCIA_DIAS = [0, 3, 7];   // D0, D+3, D+7 — después: estado sin_respuesta

function pieLegal(prospecto, cfg) {
  const url = `${OPTOUT_URL}?p=${encodeURIComponent(prospecto.id)}&t=${encodeURIComponent(prospecto.optOutToken || '')}`;
  return `<hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0 12px">
<p style="font-size:12px;color:#8a8a8a;line-height:1.5">Te escribo porque encontré los datos públicos de ${prospecto.negocio || 'tu negocio'} y creo que esto te puede servir de verdad. Si no quieres recibir más correos míos, <a href="${url}" style="color:#8a8a8a">haz clic aquí</a> y no te vuelvo a escribir.<br>
SynapTech SpA · Chile · WhatsApp <a href="https://wa.me/56983568212" style="color:#8a8a8a">+56 9 8356 8212</a> · <a href="https://www.synaptechspa.cl" style="color:#8a8a8a">synaptechspa.cl</a></p>`;
}

/**
 * Redacta el email de la secuencia con Claude. Devuelve { asunto, html } o
 * null si el modelo no entregó JSON usable (se loguea y el prospecto espera
 * al próximo ciclo: un correo mal armado no sale).
 */
async function redactarEmail(prospecto, numeroToque, anthropicKey) {
  const client = new Anthropic({ apiKey: anthropicKey });

  const contexto = [
    `Negocio: ${prospecto.negocio || '(sin nombre)'}`,
    prospecto.nombre    ? `Persona de contacto: ${prospecto.nombre}` : null,
    prospecto.rubro     ? `Rubro: ${prospecto.rubro}` : null,
    prospecto.comuna    ? `Comuna: ${prospecto.comuna}` : null,
    prospecto.direccion ? `Dirección: ${prospecto.direccion}` : null,
    prospecto.instagram ? `Instagram: @${prospecto.instagram}` : null,
    prospecto.notas     ? `Notas del scraping: ${prospecto.notas}` : null,
  ].filter(Boolean).join('\n');

  const angulo = numeroToque === 1
    ? 'PRIMER contacto: preséntate breve, di algo específico de SU negocio (rubro/comuna/Instagram) para que se note que no es masivo, cuenta en 2 líneas qué resuelve SynapTech y cierra con UNA pregunta simple.'
    : numeroToque === 2
      ? 'SEGUNDO toque (no contestó el primero): no reproches. Aporta UN dato de valor nuevo (ej: los recordatorios automáticos bajan las horas perdidas; los clientes reservan solos a cualquier hora) y vuelve a ofrecer la demo de 15 minutos.'
      : 'TERCER y último toque: despedida elegante. Deja la puerta abierta ("si más adelante te hace sentido, respóndeme no más") sin presionar. Máximo 4 líneas.';

  const prompt = `Escribe un email de prospección B2B en frío para este negocio chileno:

${contexto}

${angulo}

REGLAS DURAS:
· Firmas como Ignacio, fundador de SynapTech (plataforma de agenda online y fidelización para barberías, peluquerías y salones en Chile).
· Español neutro, trato de "tú", cercano pero profesional. Nada de chilenismos escritos ni jerga corporativa.
· NUNCA menciones precios ni planes: eso lo conversa Ignacio en persona.
· No inventes datos del negocio que no estén arriba. No prometas funciones específicas no mencionadas: agenda online 24/7, recordatorios automáticos por WhatsApp, club de fidelización.
· Cuerpo total: 5 a 8 líneas. CTA: responder este correo o escribir al WhatsApp +56 9 8356 8212.
· HTML simple: solo <p>, <strong> y <a>. Sin imágenes, sin estilos inline salvo en enlaces.

Responde SOLO con un JSON válido, sin markdown: {"asunto": "...", "html": "..."}`;

  const resp = await client.messages.create({
    model: MODEL, max_tokens: MAX_TOKENS,
    messages: [{ role: 'user', content: prompt }],
  });
  logAiUsage(MODEL, resp.usage || {}, 'ventas').catch(() => {});

  const texto = resp.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
  try {
    // Del primer { al último }: sobrevive a fences de markdown y a preámbulos.
    const crudo = texto.slice(texto.indexOf('{'), texto.lastIndexOf('}') + 1);
    const j = JSON.parse(crudo);
    if (!j.asunto || !j.html) throw new Error('faltan campos');
    return { asunto: String(j.asunto).slice(0, 150), html: String(j.html) };
  } catch (e) {
    logger.warn(`[email-frio] JSON inválido para ${prospecto.id}:`, e.message, texto.slice(0, 120));
    return null;
  }
}

/** Envía (de verdad) un borrador aprobado y actualiza el prospecto. */
async function enviarEmailProspecto(prospecto, borrador, cfg, { etiqueta = 'prospeccion' } = {}) {
  const asunto = (cfg.emailPrefijoPublicidad ? 'PUBLICIDAD: ' : '') + borrador.asunto;
  // Grupo 'interno' (Resend synaptechspa.cl primero): la escalera 'citas' es
  // de los clientes de los locales y su cupo diario no se toca desde acá.
  await enviarEmail({
    from: cfg.emailFrom,
    to: prospecto.email,
    subject: asunto,
    html: borrador.html + pieLegal(prospecto, cfg),
    reply_to: cfg.emailReplyTo,
  }, { grupo: 'interno', etiqueta });

  await PROSPECTOS().doc(prospecto.id).set({
    estado: prospecto.estado === 'frio' ? 'contactado' : prospecto.estado,
    emailsEnviados: FieldValue.increment(1),
    emailBorrador: FieldValue.delete(),
    ultimoEmailEn: FieldValue.serverTimestamp(),
    toques: FieldValue.arrayUnion({ tipo: 'email', asunto: borrador.asunto, en: Timestamp.now() }),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  await sumarCuota('emails');
}

/**
 * Un pase del secuenciador: decide a quién le toca correo hoy, lo redacta y
 * — según `emailAuto` — lo envía o lo deja en borrador esperando aprobación.
 */
async function correrSecuenciadorEmail({ cfg, limite, anthropicKey }) {
  const snap = await PROSPECTOS()
    .where('estado', 'in', ['frio', 'contactado']).limit(400).get();

  const ahora = Date.now();
  let procesados = 0;
  const out = { redactados: 0, enviados: 0, agotados: 0 };

  // El cupo diario se reparte según el orden de trabajo por comuna.
  const docs = snap.docs.slice().sort((a, b) =>
    prioridadComuna(cfg, (a.data() || {}).comuna) - prioridadComuna(cfg, (b.data() || {}).comuna));

  for (const doc of docs) {
    if (procesados >= limite) break;
    const p = { id: doc.id, ...doc.data() };

    if (!p.email) continue;
    if (p.emailPausado === true) continue;
    if (p.emailBorrador) continue;                      // ya hay uno esperando aprobación
    const enviados = Number(p.emailsEnviados) || 0;

    if (enviados >= CADENCIA_DIAS.length) {
      // Secuencia completa sin respuesta: se archiva para no redactarle a
      // ciegas por siempre. Sigue vivo para DM o para un toque manual.
      if (p.estado === 'contactado') {
        await doc.ref.set({ estado: 'sin_respuesta', updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        out.agotados++;
      }
      continue;
    }
    // ¿Ya le toca el siguiente? D0 sale al tiro; D+3 y D+7 esperan su día.
    if (enviados > 0) {
      const diasDesdeUltimo = (ahora - millis(p.ultimoEmailEn)) / 86400e3;
      const esperaMinima = CADENCIA_DIAS[enviados] - CADENCIA_DIAS[enviados - 1];
      if (diasDesdeUltimo < esperaMinima) continue;
    }

    const gasto = await puedeGastar('ventas');
    if (!gasto.ok) { logger.warn('[email-frio] tope de gasto IA:', gasto.motivo); break; }

    const borrador = await redactarEmail(p, enviados + 1, anthropicKey);
    if (!borrador) continue;
    procesados++;

    if (cfg.emailAuto) {
      try {
        await enviarEmailProspecto(p, borrador, cfg);
        out.enviados++;
      } catch (e) { logger.error(`[email-frio] envío a ${p.id}:`, e.message); }
    } else {
      await doc.ref.set({
        emailBorrador: { ...borrador, secuencia: enviados + 1, creadoEn: Timestamp.now() },
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      out.redactados++;
    }
  }
  return out;
}

exports.prospeccionEmailCron = onSchedule({
  schedule: '30 10 * * 1-5',        // hábiles a las 10:30 — hora de leer correo
  timeZone: 'America/Santiago',
  region:   'us-central1',
  secrets:  [ANTHROPIC_API_KEY, EVOLUTION_API_URL, EVOLUTION_API_KEY, ...MAIL_SECRETS],
  timeoutSeconds: 540,
  memory: '512MiB',
}, async () => {
  const cfg = await leerCfg();
  if (!cfg.activo) { logger.info('[email-frio] módulo apagado'); return; }

  const hechoHoy = Number((await cuotaDeHoy()).emails) || 0;
  const cupo = Math.max(0, (Number(cfg.maxEmailsDia) || 20) - hechoHoy);
  if (!cupo) { logger.info('[email-frio] tope diario alcanzado'); return; }

  const r = await correrSecuenciadorEmail({ cfg, limite: cupo, anthropicKey: ANTHROPIC_API_KEY.value() });
  logger.info(`[email-frio] redactados=${r.redactados} enviados=${r.enviados} agotados=${r.agotados}`);
  if (r.redactados) {
    await avisarIgnacio(`📬 *Prospección por correo*\n\nDejé ${r.redactados} correo(s) redactados esperando tu OK en ops → Prospección.`);
  } else if (r.enviados) {
    await avisarIgnacio(`📬 *Prospección por correo*\n\nSalieron ${r.enviados} correo(s) de la secuencia. El detalle está en ops → Prospección.`);
  }
});

/* ═══════════════════ PALANCA 3 · Cola de DMs preparados ═══════════════════ */

async function redactarDM(prospecto, anthropicKey) {
  const client = new Anthropic({ apiKey: anthropicKey });
  const contexto = [
    `Negocio: ${prospecto.negocio || '(sin nombre)'}`,
    prospecto.rubro  ? `Rubro: ${prospecto.rubro}` : null,
    prospecto.comuna ? `Comuna: ${prospecto.comuna}` : null,
    prospecto.instagram ? `Su Instagram: @${prospecto.instagram}` : null,
    prospecto.notas  ? `Notas: ${prospecto.notas}` : null,
  ].filter(Boolean).join('\n');

  const prompt = `Escribe UN mensaje directo de Instagram para iniciar conversación en frío con este negocio chileno:

${contexto}

Lo enviará A MANO Ignacio (fundador de SynapTech: agenda online y fidelización para barberías, peluquerías y salones) desde @synaptechspa.

REGLAS:
· 3 a 5 líneas máximo. Tono humano y directo, español neutro de "tú" — debe leerse como escrito por una persona, no por una marca.
· Parte por algo específico de SU negocio (rubro, comuna o su Instagram). Nada de "estimado" ni plantilla genérica.
· Sin precios. Sin enlaces. Máximo UN emoji.
· Cierra con una pregunta fácil de contestar (sí/no o de una palabra).

Responde SOLO con el texto del mensaje, sin comillas ni explicación.`;

  const resp = await client.messages.create({
    model: MODEL, max_tokens: MAX_TOKENS,
    messages: [{ role: 'user', content: prompt }],
  });
  logAiUsage(MODEL, resp.usage || {}, 'ventas').catch(() => {});
  return resp.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim().slice(0, 900);
}

async function generarColaDMs({ cantidad, anthropicKey, cfg = {} }) {
  const snap = await PROSPECTOS().where('estado', '==', 'frio').limit(400).get();
  let hechos = 0;
  // Mismo orden de trabajo que los correos: Viña → Valpo → Curauma → Providencia.
  const docs = snap.docs.slice().sort((a, b) =>
    prioridadComuna(cfg, (a.data() || {}).comuna) - prioridadComuna(cfg, (b.data() || {}).comuna));
  for (const doc of docs) {
    if (hechos >= cantidad) break;
    const p = { id: doc.id, ...doc.data() };
    if (!p.instagram || p.dmBorrador) continue;

    const gasto = await puedeGastar('ventas');
    if (!gasto.ok) { logger.warn('[dm-cola] tope de gasto IA:', gasto.motivo); break; }

    const texto = await redactarDM(p, anthropicKey);
    if (!texto) continue;
    await doc.ref.set({
      dmBorrador: { texto, creadoEn: Timestamp.now() },
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    hechos++;
  }
  return hechos;
}

/* ═══════════════════ PALANCA 4 · Reactivación WA de leads propios ═══════════════════ */

const REACTIVAR_DESDE_MS = 7  * 86400e3;
const REACTIVAR_HASTA_MS = 30 * 86400e3;

function textoReactivacion(nombre) {
  const saludo = nombre ? `¡Hola ${String(nombre).split(' ')[0]}!` : '¡Hola!';
  return `${saludo} Soy Ignacio, de SynapTech 👋 Hablamos hace unos días por la agenda online para tu negocio y quedó ahí. Te escribo una única vez más por si el tema sigue dando vueltas: si quieres, te muestro todo funcionando en 15 minutos por videollamada, sin compromiso. Y si no es el momento, todo bien — me dices "no por ahora" y no te molesto más 🙌`;
}

async function candidatosReactivacion() {
  const ahora = Date.now();
  const desde = Timestamp.fromMillis(ahora - REACTIVAR_HASTA_MS);
  const hasta = Timestamp.fromMillis(ahora - REACTIVAR_DESDE_MS);
  const snap = await db.collection('wa_ventas_conversaciones')
    .where('updatedAt', '>=', desde).where('updatedAt', '<=', hasta).get();

  // Filtros baratos primero; los que requieren viajes (lead + opt-out) van
  // en paralelo — la versión en serie era la mitad del "carga muy lento"
  // que se le achacaba a la pestaña.
  const base = [];
  for (const doc of snap.docs) {
    const conv = doc.data() || {};
    const id = doc.id;
    if (conv.activado !== true) continue;
    if (conv.reactivacion) continue;                    // un solo toque, siempre
    if (id.startsWith('ig_')) continue;                 // fuera de ventana: IG no se puede
    if (conv.chipId === 'sandbox') continue;
    if (!/^\d{9,15}$/.test(id)) continue;
    base.push({ id, nombre: conv.clienteNombre || '', chipId: conv.chipId || 'ventas' });
  }
  const evaluados = await Promise.all(base.map(async (c) => {
    const [leadSnap, bloqueado] = await Promise.all([
      db.doc(`wa_ventas_leads/${c.id}`).get(),
      estaBloqueado(c.id),
    ]);
    const lead = leadSnap.data() || {};
    if (['confirmada', 'realizada'].includes(lead.estado)) return null;
    if (bloqueado) return null;
    return c;
  }));
  return evaluados.filter(Boolean);
}

exports.prospeccionReactivacionCron = onSchedule({
  schedule: '0 11 * * 2,4',          // martes y jueves 11:00 — ritmo de toque, no de spam
  timeZone: 'America/Santiago',
  region:   'us-central1',
  secrets:  [EVOLUTION_API_URL, EVOLUTION_API_KEY],
  timeoutSeconds: 300,
  memory: '512MiB',
}, async () => {
  const cfg = await leerCfg();
  if (!cfg.activo || !cfg.reactivacionAuto) { logger.info('[reactivacion] apagada por config'); return; }

  const hechoHoy = Number((await cuotaDeHoy()).reactivaciones) || 0;
  const cupo = Math.max(0, (Number(cfg.maxReactivacionesDia) || 10) - hechoHoy);
  if (!cupo) return;

  const candidatos = (await candidatosReactivacion()).slice(0, cupo);
  const evo = clienteEvolution();
  const { _instanciaDe } = require('./evolution/plataforma');
  let enviadas = 0;
  for (const c of candidatos) {
    const texto = textoReactivacion(c.nombre);
    try {
      await evo.enviarTexto(_instanciaDe(c.chipId), c.id, texto);
    } catch (e) { logger.warn(`[reactivacion] ${c.id}:`, e.message); continue; }
    const ref = db.doc(`wa_ventas_conversaciones/${c.id}`);
    const msgs = ((await ref.get()).data() || {}).messages || [];
    await ref.set({
      messages: [...msgs, { role: 'assistant', content: texto }],
      reactivacion: { en: FieldValue.serverTimestamp(), resultado: 'enviada', msgsAlEnviar: msgs.length + 1 },
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    await sumarCuota('reactivaciones');
    enviadas++;
  }
  if (enviadas) await avisarIgnacio(`♻️ *Reactivación WA*\n\nToqué a ${enviadas} lead(s) propios inactivos 7–30 días. Si contestan, el bot retoma solo.`);
});

/* ═══════════ Señales: el estado del prospecto avanza solo ═══════════
   Triggers y no ediciones a ventas.js / instagram-plataforma.js: los bots de
   producción no se tocan para esto. Firestore avisa, prospección escucha. */

const norm = (s) => String(s || '').replace(/^@+/, '').trim().toLowerCase();

async function avanzarProspecto(campo, valor, nuevoEstado, { canal = null } = {}) {
  if (!valor) return;
  const snap = await PROSPECTOS().where(campo, '==', valor).limit(1).get();
  if (snap.empty) return;
  const doc = snap.docs[0];
  const actual = (doc.data() || {}).estado || 'frio';
  // Solo se AVANZA (frio → contactado → respondio → reunion). Un webhook
  // repetido no puede devolver a "respondió" a alguien que ya tiene reunión.
  const orden = ['frio', 'contactado', 'sin_respuesta', 'respondio', 'reunion', 'cliente'];
  if (orden.indexOf(nuevoEstado) <= orden.indexOf(actual)) return;
  if (['optout', 'descartado'].includes(actual)) return;
  // Cada transición deja SU timestamp y su canal: sin esto no hay forma de
  // medir "cuánto tarda un DM en convertirse en respuesta" ni qué canal
  // funciona — y lo que no se mide no mejora. El guard de arriba garantiza
  // que respondioEn/reunionEn quedan con la PRIMERA vez, no con reintentos.
  await doc.ref.set({
    estado: nuevoEstado, estadoEn: FieldValue.serverTimestamp(),
    ...(nuevoEstado === 'respondio' ? { respondioEn: FieldValue.serverTimestamp(), respondioCanal: canal } : {}),
    ...(nuevoEstado === 'reunion'   ? { reunionEn: FieldValue.serverTimestamp() } : {}),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  logger.info(`[prospeccion] ${doc.id}: ${actual} → ${nuevoEstado} (por ${campo}${canal ? '/' + canal : ''})`);
}

/**
 * ¿Este texto es el contestador automático del negocio y no una persona?
 * Importa para la MÉTRICA: el primer "gracias por ponerte en contacto" de un
 * negocio contó como "respondió" (Oz Barbería, 07-08) e infla la tasa de los
 * DMs. Un auto-reply no mueve el embudo; el humano que escribe después, sí.
 */
function pareceAutoRespuesta(texto) {
  const t = String(texto || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  return /(gracias por (ponerte en contacto|contactarnos|comunicarte|tu mensaje|escribirnos))|(recibimos tu (mensaje|consulta))|(responderemos (a la brevedad|en breve|pronto))|(te responderemos)|(fuera de (nuestro )?horario)|(mensaje automatico)|(en breve (te contactaremos|nos pondremos en contacto))/.test(t);
}

// Alguien escribió al bot de ventas (WA o IG) → si era prospecto, respondió.
exports.prospeccionSenalConversacion = onDocumentWritten({
  document: 'wa_ventas_conversaciones/{chatId}',
  region: 'us-central1',
}, async (event) => {
  const despues = event.data?.after?.data();
  if (!despues) return;
  const antes = event.data?.before?.data() || {};
  // Solo cuando el LEAD habló: crece messages con turno user al final.
  const msgsAhora = Array.isArray(despues.messages) ? despues.messages : [];
  const msgsAntes = Array.isArray(antes.messages) ? antes.messages : [];
  if (msgsAhora.length <= msgsAntes.length) return;

  // Si TODO lo que ha dicho el "lead" parece contestador automático, todavía
  // no respondió nadie: el avance espera al primer mensaje humano.
  const deLead = msgsAhora.filter((m) => m.role === 'user');
  if (deLead.length && deLead.every((m) => pareceAutoRespuesta(m.content))) {
    logger.info(`[prospeccion] ${event.params.chatId}: solo auto-respuestas; el embudo no se mueve`);
    return;
  }

  const chatId = event.params.chatId;
  if (chatId.startsWith('ig_')) {
    const meta = (await db.doc(`ig_conversaciones/${chatId.slice(3)}`).get()).data() || {};
    await avanzarProspecto('instagram', norm(meta.username), 'respondio', { canal: 'instagram' });
  } else {
    await avanzarProspecto('telefono', chatId, 'respondio', { canal: 'whatsapp' });
  }
});

// El cerebro registró/agendó reunión → el prospecto llegó a "reunión".
exports.prospeccionSenalLead = onDocumentWritten({
  document: 'wa_ventas_leads/{telefono}',
  region: 'us-central1',
}, async (event) => {
  const lead = event.data?.after?.data();
  if (!lead) return;
  if (!['reunion_solicitada', 'confirmada'].includes(lead.estado)) return;
  const tel = event.params.telefono;
  if (tel.startsWith('ig_')) {
    const meta = (await db.doc(`ig_conversaciones/${tel.slice(3)}`).get()).data() || {};
    await avanzarProspecto('instagram', norm(meta.username), 'reunion', { canal: 'instagram' });
  } else {
    await avanzarProspecto('telefono', tel, 'reunion', { canal: 'whatsapp' });
  }
});

/* ═══════════════════ Opt-out de email (enlace del pie) ═══════════════════ */

exports.prospeccionOptOut = onRequest({ region: 'us-central1' }, async (req, res) => {
  const id    = String(req.query.p || '');
  const token = String(req.query.t || '');
  const pagina = (msg) => `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SynapTech</title></head><body style="font-family:system-ui,sans-serif;background:#0d0d0d;color:#eee;display:grid;place-items:center;min-height:100vh;margin:0"><div style="text-align:center;padding:24px"><p style="font-size:18px">${msg}</p></div></body></html>`;

  if (!id || !token) { res.status(400).send(pagina('Enlace incompleto.')); return; }
  const ref = PROSPECTOS().doc(id);
  const p = (await ref.get()).data();
  if (!p || String(p.optOutToken || '') !== token) {
    res.status(404).send(pagina('Enlace inválido o vencido.')); return;
  }
  await ref.set({
    estado: 'optout', optOutEn: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  logger.info(`[prospeccion] opt-out de ${id}`);
  res.status(200).send(pagina('Listo ✅ No te volveremos a escribir. Gracias por tu tiempo.'));
});

/* ═══════════════════ Rendimiento: lo que no se mide no mejora ═══════════════════
   Tasas reales por palanca, no conteos sueltos: DMs enviados → respondieron →
   reunión (con horas hasta la respuesta), correos con sus bajas, y si los
   rescates/reactivaciones revivieron la conversación (la historia creció
   después de `msgsAlEnviar`). Es lo que decide si un mensaje se cambia,
   se mantiene o se mata. */

/** ¿La conversación siguió después del toque? Con vara guardada compara
 *  largos; los toques viejos (sin vara) buscan el texto y miran si quedó algo
 *  detrás. */
function contestoTrasToque(conv, campo, fraseDelTexto) {
  const t = conv[campo];
  if (!t) return false;
  const msgs = Array.isArray(conv.messages) ? conv.messages : [];
  if (Number.isFinite(Number(t.msgsAlEnviar))) return msgs.length > Number(t.msgsAlEnviar);
  const idx = msgs.findIndex((m) => m.role === 'assistant' && String(m.content).includes(fraseDelTexto));
  return idx >= 0 && idx < msgs.length - 1;
}

async function metricasRendimiento(docsProspectos) {
  const horas = (a, b) => (a && b ? Math.round((a - b) / 36e5 * 10) / 10 : null);

  const dms = { enviados: 0, respondieron: 0, reuniones: 0, horasRespuesta: [] };
  const emails = { prospectos: 0, correos: 0, bajas: 0, respondieron: 0 };
  for (const d of docsProspectos) {
    const p = d.data() || {};
    const respondio = ['respondio', 'reunion', 'cliente'].includes(p.estado);
    if (p.dmEnviadoEn) {
      dms.enviados++;
      if (respondio) {
        dms.respondieron++;
        const h = horas(millis(p.respondioEn), millis(p.dmEnviadoEn));
        if (h !== null && h >= 0) dms.horasRespuesta.push(h);
      }
      if (['reunion', 'cliente'].includes(p.estado)) dms.reuniones++;
    }
    if ((Number(p.emailsEnviados) || 0) > 0) {
      emails.prospectos++;
      emails.correos += Number(p.emailsEnviados) || 0;
      if (p.estado === 'optout') emails.bajas++;
      if (respondio) emails.respondieron++;
    }
  }
  dms.horasPromedio = dms.horasRespuesta.length
    ? Math.round(dms.horasRespuesta.reduce((a, b) => a + b, 0) / dms.horasRespuesta.length * 10) / 10
    : null;
  delete dms.horasRespuesta;

  // Rescates y reactivaciones viven en las conversaciones, no en la cartera.
  const rescates = { enviados: 0, contestaron: 0 };
  const reactivaciones = { enviadas: 0, contestaron: 0 };
  try {
    const [rs, ra] = await Promise.all([
      db.collection('wa_ventas_conversaciones').where('rescate.resultado', '==', 'enviado').limit(300).get(),
      db.collection('wa_ventas_conversaciones').where('reactivacion.resultado', '==', 'enviada').limit(300).get(),
    ]);
    for (const d of rs.docs) {
      rescates.enviados++;
      if (contestoTrasToque(d.data() || {}, 'rescate', 'Quedamos a mitad de conversación')) rescates.contestaron++;
    }
    for (const d of ra.docs) {
      reactivaciones.enviadas++;
      if (contestoTrasToque(d.data() || {}, 'reactivacion', 'el tema sigue dando vueltas')) reactivaciones.contestaron++;
    }
  } catch (e) { logger.warn('[prospeccion] métricas de toques:', e.message); }

  return { dms, emails, rescates, reactivaciones };
}

/* ═══════════════════ Callables del panel (ops → Prospección) ═══════════════════ */

function resumenProspecto(d) {
  const p = d.data() || {};
  return {
    id: d.id,
    negocio: p.negocio || '', nombre: p.nombre || '', comuna: p.comuna || '',
    rubro: p.rubro || '', instagram: p.instagram || null, email: p.email || null,
    telefono: p.telefono || null, origen: p.origen || 'manual',
    estado: p.estado || 'frio', notas: p.notas || '',
    descartadoMotivo: p.descartadoMotivo || null,
    direccion: p.direccion || '',
    lat: Number.isFinite(Number(p.lat)) ? Number(p.lat) : null,
    lng: Number.isFinite(Number(p.lng)) ? Number(p.lng) : null,
    emailsEnviados: Number(p.emailsEnviados) || 0,
    dmEnviadoEn: millis(p.dmEnviadoEn) || null,
    respondioEn: millis(p.respondioEn) || null,
    respondioCanal: p.respondioCanal || null,
    emailBorrador: p.emailBorrador
      ? { asunto: p.emailBorrador.asunto, html: p.emailBorrador.html, secuencia: p.emailBorrador.secuencia }
      : null,
    dmBorrador: p.dmBorrador ? { texto: p.dmBorrador.texto } : null,
    toques: (p.toques || []).slice(-6).map((t) => ({ tipo: t.tipo, en: millis(t.en) || null })),
    seguimiento: (p.seguimiento || []).slice(-3).map((n) => ({ texto: n.texto, en: millis(n.en) || null })),
    updatedAt: millis(p.updatedAt) || null,
  };
}

exports.prospeccionEstado = onCall({
  region: 'us-central1', cors: true,
  timeoutSeconds: 120, memory: '512MiB',
}, async (req) => {
  if (!req.auth || !esOperadorReq(req)) {
    throw new HttpsError('permission-denied', 'Solo SynapTech opera la prospección.');
  }
  // `ligero: true` es el refresco después de una acción del panel: devuelve
  // solo la cartera y se salta lo caro (reactivables + rendimiento) — el
  // cliente conserva los últimos valores. Sin esto cada clic pagaba el
  // recálculo completo y la pestaña se sentía pesada.
  const ligero = req.data?.ligero === true;
  const [cfg, snap, cuota] = await Promise.all([
    leerCfg(),
    PROSPECTOS().orderBy('updatedAt', 'desc').limit(500).get(),
    cuotaDeHoy(),
  ]);

  const prospectos = snap.docs.map(resumenProspecto);
  const funnel = {};
  for (const p of prospectos) funnel[p.estado] = (funnel[p.estado] || 0) + 1;

  // Los candidatos a reactivación se calculan al abrir la pestaña (decenas de
  // lecturas, una vez): así el switch se decide viendo A QUIÉN tocaría.
  const [reactivables, rendimiento, reuniones] = ligero ? [null, null, null] : await Promise.all([
    candidatosReactivacion().catch(() => []),
    metricasRendimiento(snap.docs).catch((e) => { logger.warn('[prospeccion] rendimiento:', e.message); return null; }),
    proximasReuniones().catch((e) => { logger.warn('[prospeccion] reuniones:', e.message); return []; }),
  ]);

  return {
    ok: true,
    cfg: {
      activo: cfg.activo, rescateAuto: cfg.rescateAuto, emailAuto: cfg.emailAuto,
      reactivacionAuto: cfg.reactivacionAuto, maxEmailsDia: cfg.maxEmailsDia,
      maxRescatesDia: cfg.maxRescatesDia, maxReactivacionesDia: cfg.maxReactivacionesDia,
      emailFrom: cfg.emailFrom, emailPrefijoPublicidad: cfg.emailPrefijoPublicidad,
    },
    funnel, prospectos, rendimiento,
    cuotaHoy: {
      rescates: Number(cuota.rescates) || 0,
      emails: Number(cuota.emails) || 0,
      reactivaciones: Number(cuota.reactivaciones) || 0,
    },
    reactivables: reactivables ? reactivables.map((c) => ({ telefono: c.id, nombre: c.nombre })) : null,
    reuniones,
  };
});

/** Próximas reuniones agendadas (todas: del bot y de la pestaña), con el día
 *  hablado ya masticado — la fecha jamás la calcula el navegador. */
async function proximasReuniones() {
  const hoy = ahoraChile().fecha;
  const snap = await db.collection('ventas_reuniones').where('estado', '==', 'agendada').limit(60).get();
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() || {}) }))
    .filter((r) => r.fecha >= hoy)
    .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))
    .slice(0, 20)
    .map((r) => ({
      contacto: r.contacto || r.id, fecha: r.fecha, hora: r.hora,
      hablada: conDiaSemana(r.fecha).hablada,
      canal: r.canal || 'ventas',
      nombre: r.nombre || '', negocio: r.negocio || '',
      comuna: r.comuna || '', notas: r.notas || '',
      esHoy: r.fecha === hoy,
    }));
}

/* ═══════ Recordatorio de reuniones: correo + WhatsApp, hoy y mañana ═══════
   Pedido de Ignacio (08-08): el día de la reunión y el día antes, con las
   características de cada una (hora, tipo, negocio, detalle). */

function htmlReuniones(items) {
  const fila = (r) => `<tr>
      <td style="padding:8px 10px;border-bottom:1px solid #eee;white-space:nowrap"><b>${r.hora}</b></td>
      <td style="padding:8px 10px;border-bottom:1px solid #eee">${r.canal === 'presencial' ? '🏪 presencial' : r.canal === 'online' ? '💻 online' : '🤖 ' + r.canal}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #eee"><b>${r.negocio || r.nombre || r.contacto}</b>${r.nombre && r.negocio ? '<br>' + r.nombre : ''}${r.comuna ? '<br><span style="color:#888">' + r.comuna + '</span>' : ''}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #eee;color:#555">${r.notas || ''}</td>
    </tr>`;
  return `<table style="border-collapse:collapse;width:100%;font-size:14px">${items.map(fila).join('')}</table>`;
}

exports.prospeccionReunionesAvisoCron = onSchedule({
  schedule: '30 8 * * *',
  timeZone: 'America/Santiago',
  region:   'us-central1',
  secrets:  [EVOLUTION_API_URL, EVOLUTION_API_KEY, ...MAIL_SECRETS],
  timeoutSeconds: 120,
  memory: '512MiB',
}, async () => {
  const hoy = ahoraChile().fecha;
  const manana = conDiaSemana(hoy, 1).fecha;
  const todas = await proximasReuniones();
  const deHoy = todas.filter((r) => r.fecha === hoy);
  const deManana = todas.filter((r) => r.fecha === manana);
  if (!deHoy.length && !deManana.length) { logger.info('[reuniones-aviso] nada hoy ni mañana'); return; }

  const cfg = await leerCfg();
  const asunto = deHoy.length
    ? `📅 Hoy tienes ${deHoy.length} reunión(es)${deManana.length ? ` (y ${deManana.length} mañana)` : ''}`
    : `📅 Mañana tienes ${deManana.length} reunión(es)`;
  const html = `
    ${deHoy.length ? `<h3 style="margin:6px 0">HOY — ${conDiaSemana(hoy).hablada}</h3>${htmlReuniones(deHoy)}` : ''}
    ${deManana.length ? `<h3 style="margin:18px 0 6px">MAÑANA — ${conDiaSemana(manana).hablada}</h3>${htmlReuniones(deManana)}` : ''}
    <p style="color:#888;font-size:12px;margin-top:16px">La grilla completa está en ops → 🎯 Ventas. Este aviso sale a las 08:30 cuando hay reuniones hoy o mañana.</p>`;
  await enviarEmail({
    from: cfg.emailFrom, to: 'ignaciiio.mate@gmail.com', subject: asunto, html,
  }, { grupo: 'interno', etiqueta: 'reuniones-aviso', silencioso: true });

  const linea = (r) => `· ${r.hora} ${r.canal === 'presencial' ? '🏪' : '💻'} ${r.negocio || r.nombre || r.contacto}${r.notas ? ` — ${r.notas.slice(0, 60)}` : ''}`;
  await avisarIgnacio([
    `📅 *Reuniones*`,
    ...(deHoy.length ? ['', `*HOY* (${conDiaSemana(hoy).hablada}):`, ...deHoy.map(linea)] : []),
    ...(deManana.length ? ['', `*Mañana* (${conDiaSemana(manana).hablada}):`, ...deManana.map(linea)] : []),
  ].join('\n'));
  logger.info(`[reuniones-aviso] hoy=${deHoy.length} mañana=${deManana.length}`);
});

exports.prospeccionAccion = onCall({
  region: 'us-central1', cors: true,
  secrets: [ANTHROPIC_API_KEY, EVOLUTION_API_URL, EVOLUTION_API_KEY, ...MAIL_SECRETS],
  timeoutSeconds: 540, memory: '512MiB',
}, async (req) => {
  if (!req.auth || !esOperadorReq(req)) {
    throw new HttpsError('permission-denied', 'Solo SynapTech opera la prospección.');
  }
  const accion = String(req.data?.accion || '');
  const id     = String(req.data?.id || '');
  const cfg    = await leerCfg();

  /* Config: switches y topes desde el panel, sin deploy. */
  if (accion === 'config') {
    const patch = {};
    const p = req.data?.patch || {};
    for (const k of ['activo', 'rescateAuto', 'emailAuto', 'reactivacionAuto', 'emailPrefijoPublicidad']) {
      if (typeof p[k] === 'boolean') patch[k] = p[k];
    }
    for (const k of ['maxEmailsDia', 'maxRescatesDia', 'maxReactivacionesDia']) {
      if (Number.isFinite(Number(p[k]))) patch[k] = Math.max(0, Math.min(100, Number(p[k])));
    }
    if (!Object.keys(patch).length) throw new HttpsError('invalid-argument', 'Nada que cambiar.');
    await CFG_REF().set(patch, { merge: true });
    return { ok: true, cfg: { ...cfg, ...patch } };
  }

  /* Alta manual de un prospecto desde el panel. */
  if (accion === 'agregar') {
    const d = req.data?.datos || {};
    const negocio = String(d.negocio || '').trim();
    if (!negocio) throw new HttpsError('invalid-argument', 'El negocio necesita nombre.');
    const docId = negocio.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || `p-${Date.now()}`;
    const ref = PROSPECTOS().doc(docId);
    if ((await ref.get()).exists) throw new HttpsError('already-exists', `Ya existe un prospecto "${docId}".`);
    const geo = await geocodificar(String(d.direccion || '').trim(), String(d.comuna || '').trim() || 'Providencia');
    await ref.set({
      ...(geo || {}),
      negocio, nombre: String(d.nombre || '').trim(), rubro: String(d.rubro || '').trim(),
      comuna: String(d.comuna || 'Providencia').trim(), direccion: String(d.direccion || '').trim(),
      telefono: String(d.telefono || '').replace(/\D/g, '') || null,
      email: String(d.email || '').trim().toLowerCase() || null,
      instagram: norm(d.instagram) || null,
      notas: String(d.notas || '').trim(),
      origen: 'manual', estado: 'frio',
      emailsEnviados: 0, toques: [],
      optOutToken: crypto.randomBytes(12).toString('hex'),
      creadoEn: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
    });
    return { ok: true, id: docId };
  }

  /* Redactar cola de DMs / pase de emails a demanda (sin esperar el cron). */
  if (accion === 'generarDMs') {
    const n = await generarColaDMs({
      cantidad: Math.max(1, Math.min(15, Number(req.data?.cantidad) || 5)),
      anthropicKey: ANTHROPIC_API_KEY.value(),
      cfg,
    });
    return { ok: true, generados: n };
  }
  if (accion === 'generarEmails') {
    const r = await correrSecuenciadorEmail({
      cfg: { ...cfg, emailAuto: false },   // a demanda SIEMPRE deja borradores
      limite: Math.max(1, Math.min(30, Number(req.data?.cantidad) || 10)),
      anthropicKey: ANTHROPIC_API_KEY.value(),
    });
    return { ok: true, ...r };
  }

  /* Reuniones REALES (candado en la agenda de Ignacio) desde la pestaña:
     online o presencial, con o sin prospecto de la cartera. */
  if (accion === 'reunionCrear') {
    const d = req.data || {};
    const tipo = d.tipo === 'presencial' ? 'presencial' : 'online';
    let datos = {
      nombre: String(d.nombre || '').trim(),
      negocio: String(d.negocio || '').trim(),
      notas: [tipo === 'presencial' ? `📍 ${String(d.detalle || 'en el local').trim()}` : `💻 ${String(d.detalle || 'Meet').trim()}`,
              String(d.notas || '').trim()].filter(Boolean).join(' · '),
    };
    let contacto = `manual_${Date.now()}`;
    let prospectoRef = null;
    if (d.id) {
      const pDoc = await PROSPECTOS().doc(String(d.id)).get();
      if (pDoc.exists) {
        const p = pDoc.data() || {};
        prospectoRef = pDoc.ref;
        // El contacto comparte id con wa_ventas_leads: si el prospecto tiene
        // teléfono la reunión queda cruzada con su conversación real.
        contacto = p.telefono || `pros_${pDoc.id}`;
        datos = { ...datos, nombre: datos.nombre || p.nombre, negocio: datos.negocio || p.negocio, rubro: p.rubro, comuna: p.comuna };
      }
    }
    const r = await agendaVentas.agendarReunion({
      contacto, canal: tipo, fecha: String(d.fecha || ''), hora: String(d.hora || ''), datos,
    });
    if (!r.ok) throw new HttpsError('failed-precondition', r.motivo || 'No se pudo agendar.');
    if (prospectoRef) {
      await prospectoRef.set({
        estado: 'reunion', reunionEn: FieldValue.serverTimestamp(),
        estadoEn: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true }).catch(() => {});
    }
    return { ok: true, cuando: r.cuando, reagendada: !!r.reagendada };
  }
  if (accion === 'reunionCancelar') {
    const contacto = String(req.data?.contacto || '');
    if (!contacto) throw new HttpsError('invalid-argument', 'Falta el contacto de la reunión.');
    const r = await agendaVentas.cancelarReunion({ contacto, motivo: 'cancelada desde ops → Prospección' });
    if (!r.ok) throw new HttpsError('failed-precondition', r.motivo || 'No había reunión activa.');
    return { ok: true, cuando: r.cuando };
  }

  /* Acciones sobre un prospecto puntual. */
  if (['dmEnviado', 'aprobarEmail', 'descartarBorrador', 'descartar', 'reactivar', 'nota'].includes(accion)) {
    if (!id) throw new HttpsError('invalid-argument', 'Falta el id del prospecto.');
    const ref = PROSPECTOS().doc(id);
    const doc = await ref.get();
    if (!doc.exists) throw new HttpsError('not-found', `No existe el prospecto ${id}.`);
    const p = { id, ...doc.data() };

    if (accion === 'dmEnviado') {
      // El humano ya pegó el DM en Instagram. El TEXTO no se bota: cuando el
      // prospecto conteste, manejarDM se lo siembra al cerebro como primer
      // turno del asistente — sin esto el bot saludaba de cero a alguien que
      // acababa de recibir el pitch de Ignacio (pasó con Oz Barbería, 07-08:
      // "¿qué tipo de negocio tienes?" a una barbería con el rubro en el DM).
      await ref.set({
        estado: p.estado === 'frio' ? 'contactado' : p.estado,
        ...(p.dmBorrador && p.dmBorrador.texto ? { dmEnviadoTexto: p.dmBorrador.texto } : {}),
        dmBorrador: FieldValue.delete(),
        dmEnviadoEn: FieldValue.serverTimestamp(),
        toques: FieldValue.arrayUnion({ tipo: 'dm_manual', en: Timestamp.now() }),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      return { ok: true };
    }
    if (accion === 'aprobarEmail') {
      if (!p.emailBorrador) throw new HttpsError('failed-precondition', 'No hay borrador que aprobar.');
      if (!p.email) throw new HttpsError('failed-precondition', 'El prospecto no tiene email.');
      await enviarEmailProspecto(p, p.emailBorrador, cfg, { etiqueta: 'prospeccion-aprobado' });
      return { ok: true };
    }
    if (accion === 'descartarBorrador') {
      await ref.set({
        emailBorrador: FieldValue.delete(), dmBorrador: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      return { ok: true };
    }
    if (accion === 'descartar') {
      // El motivo es DATO: "IG sin DMs activados", "cerró", "usa otro sistema"
      // — es lo que enseña qué canal sirve para qué prospecto.
      await ref.set({
        estado: 'descartado',
        descartadoMotivo: String(req.data?.motivo || '').trim().slice(0, 200) || null,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      return { ok: true };
    }
    if (accion === 'reactivar') {
      await ref.set({ estado: 'frio', updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      return { ok: true };
    }
    if (accion === 'nota') {
      // Bitácora de terreno: lo que se vio/habló con ese local. Es memoria
      // del equipo, no del bot — y aparece en la ficha del mapa y en el feed.
      const texto = String(req.data?.texto || '').trim().slice(0, 400);
      if (!texto) throw new HttpsError('invalid-argument', 'La nota viene vacía.');
      await ref.set({
        seguimiento: FieldValue.arrayUnion({ texto, en: Timestamp.now(), por: String(req.auth.token?.email || '') }),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      return { ok: true };
    }
  }

  /* Prueba de humo: la secuencia completa contra el correo de Ignacio. */
  if (accion === 'testEmail') {
    const fake = {
      id: '_test', negocio: 'Barbería La Prueba', nombre: 'Ignacio', rubro: 'barbería',
      comuna: 'Providencia', instagram: 'synaptechspa',
      email: 'ignaciiio.mate@gmail.com', optOutToken: 'test',
      notas: 'Prospecto ficticio para probar el circuito de correo.',
    };
    const borrador = await redactarEmail(fake, 1, ANTHROPIC_API_KEY.value());
    if (!borrador) throw new HttpsError('internal', 'El modelo no entregó un borrador válido.');
    await enviarEmail({
      from: cfg.emailFrom, to: fake.email,
      subject: `[PRUEBA] ${borrador.asunto}`,
      html: borrador.html + pieLegal(fake, cfg),
    }, { grupo: 'prospeccion', etiqueta: 'prospeccion-test' });
    return { ok: true, asunto: borrador.asunto };
  }

  /* Correr el rescate a demanda (para probar sin esperar el cron). */
  if (accion === 'rescatarAhora') {
    const r = await correrRescate({ limite: Math.max(1, Math.min(20, Number(req.data?.limite) || 5)) });
    return { ok: true, resultados: r };
  }

  throw new HttpsError('invalid-argument', `Acción desconocida: "${accion}".`);
});

/**
 * ¿Qué le dijo ya Ignacio a este @ al abrirlo a mano desde la cola?
 * La usa instagram-plataforma.js al fabricar una conversación NUEVA: el texto
 * se siembra como primer turno del asistente para que el cerebro retome el
 * pitch en vez de saludar de cero. Devuelve null si no hay apertura.
 */
async function aperturaPendienteIG(username) {
  const u = norm(username);
  if (!u) return null;
  const snap = await PROSPECTOS().where('instagram', '==', u).limit(1).get();
  if (snap.empty) return null;
  const p = snap.docs[0].data() || {};
  return p.dmEnviadoTexto ? String(p.dmEnviadoTexto) : null;
}
exports.aperturaPendienteIG = aperturaPendienteIG;

// Para scripts/test-prospeccion.js: probar la redacción y el rescate sin
// levantar el emulador entero.
exports._redactarEmail          = redactarEmail;
exports._redactarDM             = redactarDM;
exports._textoRescate           = textoRescate;
exports._correrSecuenciadorEmail = correrSecuenciadorEmail;
