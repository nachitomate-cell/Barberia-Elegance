'use strict';

// functions/evolution/simulador.js
// ─────────────────────────────────────────────────────────────────────────────
//  SIMULADOR — "Probar mi bot" desde el panel del local
//
//  El dueño no enciende un bot que no vio funcionar. Hasta ahora la única
//  forma de probarlo era escribirle al WhatsApp del local con otro teléfono:
//  gasta cuota, ensucia la bandeja y —lo peor— si el bot agenda de verdad, deja
//  una cita fantasma en la agenda.
//
//  Acá el cerebro corre COMPLETO (mismo prompt, mismo catálogo, mismas horas
//  reales) pero con las herramientas que ESCRIBEN neutralizadas:
//    · agendar_cita / reagendar_cita / cancelar_cita → responden ok:true
//      simulado, sin tocar Firestore.
//    · pasar_con_humano → responde sin silenciar ningún chat real.
//  Las de LECTURA (disponibilidad, servicios, mis citas) sí corren de verdad:
//  es justo lo que el dueño quiere comprobar — que ofrezca sus horas y sus
//  precios, no los de un ejemplo.
//
//  No consume bolsa ni cuota anti-ban: no sale ningún mensaje de WhatsApp.
//  Sí consume tokens de Claude, así que va con el mismo tope de gasto por
//  local (lib/ai-presupuesto) y un límite de turnos por sesión.
// ─────────────────────────────────────────────────────────────────────────────

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret }       = require('firebase-functions/params');
const { logger }             = require('firebase-functions');
const admin                  = require('firebase-admin');
const Anthropic              = require('@anthropic-ai/sdk');

const db = admin.firestore();
const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');

const BOOTSTRAP_EMAILS = ['ignaciiio.mate@gmail.com'];
const MAX_TURNOS = 12;   // historial que acepta por sesión
const MAX_LOOPS  = 5;    // vueltas de tools por respuesta
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

// Herramientas que ESCRIBEN: en el simulador se responden en seco.
const TOOLS_SIMULADAS = {
  agendar_cita: (input) => ({
    ok: true,
    codigo: 'DEMO-01',
    fecha: input?.fecha || '', hora: input?.hora || '',
    servicio: input?.servicio_nombre || '',
    profesional: 'Profesional disponible',
    nota: 'SIMULACIÓN: no se creó ninguna cita real.',
  }),
  reagendar_cita: (input) => ({
    ok: true, codigo: 'DEMO-01',
    fecha: input?.fecha || '', hora: input?.hora || '',
    nota: 'SIMULACIÓN: no se movió ninguna cita real.',
  }),
  cancelar_cita: () => ({ ok: true, nota: 'SIMULACIÓN: no se canceló ninguna cita real.' }),
  pasar_con_humano: () => ({ ok: true, nota: 'SIMULACIÓN: en producción acá el bot se calla 2h y avisa al equipo.' }),
};

function tenantDelCaller(req) {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Inicia sesión.');
  const claims = req.auth.token || {};
  const boot = BOOTSTRAP_EMAILS.includes(String(claims.email || '').toLowerCase());
  let tid = claims.tenantId || null;
  if (boot && req.data?.tenantId) tid = String(req.data.tenantId);
  if (!tid) throw new HttpsError('permission-denied', 'Cuenta sin local asociado.');
  if (!boot && !['admin', 'jefe'].includes(claims.role || '')) {
    throw new HttpsError('permission-denied', 'Solo administradores del local.');
  }
  return tid;
}

exports.waSimularBot = onCall(
  { region: 'us-central1', cors: true, secrets: [ANTHROPIC_API_KEY], timeoutSeconds: 120 },
  async (req) => {
    const tid = tenantDelCaller(req);
    const texto = String(req.data?.texto || '').trim().slice(0, 500);
    if (!texto) throw new HttpsError('invalid-argument', 'Escribe un mensaje.');

    // Historial que manda el cliente (la sesión vive en el navegador: es una
    // prueba, no una conversación que haya que persistir).
    const previos = Array.isArray(req.data?.historial) ? req.data.historial.slice(-MAX_TURNOS) : [];

    const { puedeGastar } = require('../lib/ai-presupuesto');
    const permiso = await puedeGastar(tid).catch(() => ({ ok: true }));
    if (permiso && permiso.ok === false) {
      return { ok: false, motivo: 'El tope de gasto de IA de este mes está alcanzado. El simulador vuelve a estar disponible el mes que viene.' };
    }

    const cerebro = require('./cerebro');
    const cfgWa = (await db.doc(`tenants/${tid}/configuracion/whatsapp`).get()).data() || {};
    const { systemFijo, toolsBase } = await cerebro._armarContextoLocal(tid, {
      estiloChileno: cfgWa.estiloChileno === true,
    });

    const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date());
    const hhmm = new Intl.DateTimeFormat('es-CL', { timeZone: 'America/Santiago', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
    const dow = new Date(`${hoy}T12:00:00Z`).getUTCDay();
    const systemVar = `HOY es ${DIAS[dow]} ${hoy} y son las ${hhmm} en Chile. El cliente se llama "Cliente de prueba".`;

    const messages = [
      ...previos.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '') })),
      { role: 'user', content: texto },
    ];

    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });
    const ctx = { tid, telefono: '+56900000000', chatId: 'simulador', confirmacionesEnabled: false };
    const usadas = [];
    let respuesta = '';

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

      const toolUses = r.content.filter(b => b.type === 'tool_use');
      const textos = r.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
      if (!toolUses.length) { respuesta = textos; break; }

      messages.push({ role: 'assistant', content: r.content });
      const results = [];
      for (const tu of toolUses) {
        usadas.push(tu.name);
        let out;
        if (TOOLS_SIMULADAS[tu.name]) {
          out = TOOLS_SIMULADAS[tu.name](tu.input);     // no toca la base
        } else {
          try { out = await cerebro._ejecutarTool(tu.name, tu.input, ctx); }   // lecturas reales
          catch (e) { out = { error: e.message }; }
        }
        results.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(out ?? {}) });
      }
      messages.push({ role: 'user', content: results });
      if (i === MAX_LOOPS - 1) respuesta = textos || 'Dame un segundo…';
    }

    logger.info(`[simulador] ${tid}: turno simulado (tools: ${usadas.join(',') || 'ninguna'})`);
    return {
      ok: true,
      respuesta: respuesta || 'Perdona, ¿me repites eso? 🙏',
      herramientas: usadas,
    };
  },
);
