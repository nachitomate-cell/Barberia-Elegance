'use strict';

// functions/bot-oficial.js
// ─────────────────────────────────────────────────────────────────────────────
//  BOT DE CLAUDE POR LA API OFICIAL DE META — el canal "cero riesgo"
//
//  El bot conversa por el número de PLATAFORMA (+56 9 6589 7142), no por el
//  del local: el dueño sigue usando su teléfono personal como siempre y su
//  número jamás se expone a un bloqueo (modelo AgendaPro/Julia). El staff
//  interviene silenciando el chat desde el panel (botSilencedUntil), no desde
//  su WhatsApp. Ventana de oportunidad: los mensajes de sesión son GRATIS
//  hasta el 1-oct-2026 → piloto Renacer sin costo por mensaje.
//
//  REUSA el cerebro de Evolution (mismas tools, mismo system cacheable, mismos
//  candados de negocio): agendar/reagendar/cancelar pasan por los MISMOS
//  validadores (duración real, colación, horarios, días del servicio).
//
//  Kill-switch y roster: _system/whatsapp_notif.botOficial =
//    { enabled: bool, tenants: ['renacer'], fallbackTenant: 'renacer' }
//  Enrutamiento (número compartido): 1º el índice wa_ultimo_tenant (a quién le
//  escribió una plantilla este número), 2º fallbackTenant. Si el fono es de un
//  tenant SIN bot oficial, NO se responde (devuelve false → mensaje genérico).
// ─────────────────────────────────────────────────────────────────────────────

const { logger }    = require('firebase-functions');
const admin         = require('firebase-admin');
const { FieldValue, Timestamp } = require('firebase-admin/firestore');
const Anthropic     = require('@anthropic-ai/sdk');
const { logAiUsage } = require('./lib/metrics');

const db = admin.firestore();

const MAX_HISTORIA = 20;    // turnos guardados por chat
const MAX_RESP_DIA = 15;    // anti-troll, mismo tope que Evolution
const MAX_LOOPS    = 6;     // vueltas de tools por respuesta
const DIAS_SEM     = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function ahoraChile() {
  const s = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date()).reduce((o, p) => (o[p.type] = p.value, o), {});
  return { fecha: `${s.year}-${s.month}-${s.day}`, hhmm: `${s.hour}:${s.minute}` };
}

async function resolverTenant(fono, bot) {
  const tenants = new Set(Array.isArray(bot.tenants) ? bot.tenants : []);
  if (!tenants.size) return null;
  const u = (await db.doc(`wa_ultimo_tenant/${fono}`).get().catch(() => null))?.data();
  // Si este número pertenece a la órbita de OTRO local (le llegaron plantillas
  // de kronnos, p. ej.), el bot del piloto NO se mete: mejor mudo que hablar
  // a nombre del local equivocado.
  if (u?.tenantId) return tenants.has(u.tenantId) ? u.tenantId : null;
  const fb = String(bot.fallbackTenant || '');
  return tenants.has(fb) ? fb : null;
}

/**
 * Atiende un texto entrante del número oficial. Devuelve true si el bot se
 * hizo cargo (aunque haya decidido callar por pausa/tope) — el webhook
 * entonces NO manda su mensaje genérico.
 */
async function botOficialProcesar({ fono, texto, anthropicKey, enviarTexto }) {
  const cfg = (await db.doc('_system/whatsapp_notif').get()).data() || {};
  const bot = cfg.botOficial || {};
  if (bot.enabled !== true || !texto) return false;

  const tid = await resolverTenant(fono, bot);
  if (!tid) return false;

  const ref  = db.doc(`tenants/${tid}/wa_conversaciones_oficial/${fono}`);
  const conv = (await ref.get()).data() || {};
  if ((conv.botSilencedUntil?.toMillis?.() || 0) > Date.now()) return true;  // staff al mando
  const { fecha: hoy, hhmm } = ahoraChile();
  const respHoy = conv.respDia?.fecha === hoy ? (Number(conv.respDia.n) || 0) : 0;
  if (respHoy >= MAX_RESP_DIA) return true;                                  // tope anti-troll

  const cerebro = require('./evolution/cerebro');
  // El nombre del agente lo elige el local en /gestion-interna/whatsapp y tiene
  // que ser el MISMO en los dos canales: sin esta lectura el bot se llamaría
  // Hermes por el número propio y quedaría anónimo por el oficial, que es
  // justo el tipo de lista espejo que se desincroniza en silencio.
  const cfgWa = (await db.doc(`tenants/${tid}/configuracion/whatsapp`).get()).data() || {};
  // `estiloChileno` también sale de la config del local y no de un `false` fijo:
  // un local que eligió "chileno" hablaba neutro por este canal y cercano por el
  // propio, o sea dos personalidades para el mismo negocio según por dónde le
  // escribieran. Mismo dato, misma fuente.
  const { systemFijo, toolsBase } = await cerebro._armarContextoLocal(tid, {
    estiloChileno: cfgWa.estiloChileno === true,
    nombreAgente:  cfgWa.nombreAgente,
  });
  // Calendario masticado (lib/calendario): hoy + próximos 7 días con su día de
  // semana y la hora actual — el modelo no calcula fechas ni deduce la hora
  // (regla de la casa, 02 y 03-08-2026). La línea de la hora la arma la lib:
  // acá vivía una copia propia y el bot de los locales quedó sin ninguna.
  const { lineasCalendario } = require('./lib/calendario');
  const systemVar = `${lineasCalendario(hoy, hhmm).join('\n')}\nEl cliente escribe desde el +${fono}. Este chat corre por el número oficial de la plataforma.`;

  const historia = Array.isArray(conv.messages) ? conv.messages.slice(-MAX_HISTORIA) : [];
  const messages = [...historia, { role: 'user', content: texto }];

  const anthropic = new Anthropic({ apiKey: anthropicKey });
  const ctxTool   = { tid, telefono: `+${fono}`, chatId: fono, confirmacionesEnabled: false };
  let finalText = '';
  for (let i = 0; i < MAX_LOOPS; i++) {
    const r = await anthropic.messages.create({
      model: cerebro._MODEL,
      max_tokens: 700,
      system: [
        { type: 'text', text: systemFijo, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: systemVar },
      ],
      tools: toolsBase,
      messages,
    });
    // Sin esto el gasto de este bot no aparece en ninguna métrica: el canal
    // oficial consumía tokens que el panel de ops nunca vio.
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

  await enviarTexto(fono, finalText);
  await ref.set({
    messages: [...historia,
      { role: 'user', content: texto },
      { role: 'assistant', content: finalText }].slice(-MAX_HISTORIA),
    respDia: { fecha: hoy, n: respHoy + 1 },
    canal: 'oficial',
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true }).catch(() => {});
  logger.info(`[bot-oficial] ${tid} +${fono}: respondido (${respHoy + 1}/${MAX_RESP_DIA} hoy)`);
  return true;
}

module.exports = { botOficialProcesar };
