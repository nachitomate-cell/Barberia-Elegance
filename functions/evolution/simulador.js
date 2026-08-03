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

const { logAiUsage } = require('../lib/metrics');

const BOOTSTRAP_EMAILS = ['ignaciiio.mate@gmail.com'];
const MAX_TURNOS = 12;   // historial que acepta por sesión
const MAX_LOOPS  = 5;    // vueltas de tools por respuesta
// Cada turno del historial se recorta a este largo: el navegador controla el
// contenido y se reenvía en cada vuelta de tools.
const MAX_CHARS_TURNO = 600;
// Pruebas por local y por día. El simulador no manda WhatsApp, pero sí gasta
// Claude: sin techo es un botón de quemar presupuesto.
const MAX_PRUEBAS_DIA = 40;
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

    // Gate de plan: el simulador NO envía WhatsApp, pero sí gasta tokens de
    // Claude. Sin este candado, un local que no contrató el asistente podía
    // consumir IA desde el panel. El plan lo escribe solo SynapTech.
    const { incluyeBot } = require('../lib/wa-plan');
    const sys = (await db.doc(`_system/${tid}`).get()).data() || {};
    if (!incluyeBot(sys)) {
      throw new HttpsError('permission-denied', 'El Asistente IA no está activo para tu local.');
    }

    // Historial que manda el cliente (la sesión vive en el navegador: es una
    // prueba, no una conversación que haya que persistir).
    //
    // El contenido se RECORTA por mensaje: `slice(-MAX_TURNOS)` acotaba la
    // cantidad de turnos pero no su tamaño, y el historial lo controla el
    // navegador — 12 mensajes de largo arbitrario reenviados hasta 5 vueltas
    // es amplificación de costo servida en bandeja (auditoría 03-08-2026).
    const previos = (Array.isArray(req.data?.historial) ? req.data.historial.slice(-MAX_TURNOS) : [])
      .map(m => ({
        role:    m && m.role === 'assistant' ? 'assistant' : 'user',
        content: String((m && m.content) || '').slice(0, MAX_CHARS_TURNO),
      }))
      .filter(m => m.content);

    // Tope de pruebas por local y por día. Sin esto, el simulador es un botón
    // de "gastar IA" sin techo: no manda WhatsApp, pero cada envío son hasta
    // 5 llamadas a Claude con el catálogo completo.
    const hoyCl = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date());
    const usoRef = db.doc(`tenants/${tid}/wa_cuota/sim_${hoyCl}`);
    const usadasHoy = Number((await usoRef.get().catch(() => null))?.data()?.n) || 0;
    if (usadasHoy >= MAX_PRUEBAS_DIA) {
      return { ok: false, motivo: `Llegaste a las ${MAX_PRUEBAS_DIA} pruebas de hoy. Mañana se renuevan — así el simulador no consume el presupuesto que necesita tu bot real.` };
    }

    const { puedeGastar } = require('../lib/ai-presupuesto');
    // Sin `.catch(() => ok:true)`: puedeGastar YA falla-abierto por diseño
    // (devuelve ok:true si no puede leer). El catch extra solo escondía
    // errores reales de la lectura del presupuesto.
    const permiso = await puedeGastar(tid);
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

    const messages = [...previos, { role: 'user', content: texto }];

    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });
    const ctx = { tid, telefono: '+56900000000', chatId: 'simulador', confirmacionesEnabled: false };
    const usadas = [];
    let respuesta = '';

    for (let i = 0; i < MAX_LOOPS; i++) {
      const r = await anthropic.messages.create({
        model: cerebro._MODEL,
        // Mismos parámetros que producción: el simulador promete que "esto es
        // exactamente lo que respondería". Con 700 tokens una respuesta larga
        // se cortaba en la prueba y no en la realidad, y el caché de 5 min por
        // defecto no compartía prefijo con el bot real (se pagaba la escritura
        // dos veces). Ver cerebro.js MAX_TOKENS y el breakpoint de 1 h.
        max_tokens: 900,
        system: [
          { type: 'text', text: systemFijo, cache_control: { type: 'ephemeral', ttl: '1h' } },
          { type: 'text', text: systemVar },
        ],
        tools: toolsBase,
        messages,
      });
      // El gasto del simulador NO se registraba: `puedeGastar` leía un
      // contador que este archivo nunca incrementaba, así que su propio tope
      // era inalcanzable y el consumo era invisible en ops y para la alerta de
      // gasto. Es la MISMA llamada que hace el bot real (cerebro.js).
      logAiUsage(cerebro._MODEL, r.usage || {}, tid).catch(() => {});

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

    // Contador de pruebas del día (mismo doc-por-día que el resto de la cuota).
    await usoRef.set({
      fecha: hoyCl,
      n: admin.firestore.FieldValue.increment(1),
      actualizado: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true }).catch(() => {});

    logger.info(`[simulador] ${tid}: turno simulado ${usadasHoy + 1}/${MAX_PRUEBAS_DIA} (tools: ${usadas.join(',') || 'ninguna'})`);
    return {
      ok: true,
      respuesta: respuesta || 'Perdona, ¿me repites eso? 🙏',
      herramientas: usadas,
      pruebasRestantes: Math.max(0, MAX_PRUEBAS_DIA - (usadasHoy + 1)),
    };
  },
);
