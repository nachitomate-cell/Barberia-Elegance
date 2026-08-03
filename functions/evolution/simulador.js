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
//  Acá corre el MISMO loop del cerebro (cerebro._pensarYResponder): mismo
//  prompt, mismo catálogo, mismas horas reales y los mismos cinturones. Lo
//  único distinto es `ctx.simulado`, que hace que agendar/reagendar/cancelar
//  validen TODO —servicio, días, fecha pasada, jornada, candado de profesional—
//  y se salten únicamente el write en Firestore.
//
//  Antes esas tres se respondían con un ok:true de mentira, así que el dueño
//  veía "cita confirmada" en horas que su bot real habría rechazado: la prueba
//  mentía justo donde importaba. Las de LECTURA siempre corrieron de verdad.
//
//  No consume bolsa ni cuota anti-ban: no sale ningún mensaje de WhatsApp.
//  Sí consume tokens de Claude, así que va con el mismo tope de gasto por
//  local (lib/ai-presupuesto) y un límite de turnos por sesión.
// ─────────────────────────────────────────────────────────────────────────────

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret }       = require('firebase-functions/params');
const { logger }             = require('firebase-functions');
const admin                  = require('firebase-admin');

const db = admin.firestore();
const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');

const { lineasCalendario } = require('../lib/calendario');
const { _ahoraChile: ahoraChile } = require('../chat-horas-disponibles');

const BOOTSTRAP_EMAILS = ['ignaciiio.mate@gmail.com'];
const MAX_TURNOS = 12;   // historial que acepta por sesión
// Cada turno del historial se recorta a este largo: el navegador controla el
// contenido y se reenvía en cada vuelta de tools.
const MAX_CHARS_TURNO = 600;
// Pruebas por local y por día. El simulador no manda WhatsApp, pero sí gasta
// Claude: sin techo es un botón de quemar presupuesto.
const MAX_PRUEBAS_DIA = 40;

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

    // Calendario masticado + hora actual, EXACTAMENTE como producción. Antes
    // este archivo armaba su propia línea de fecha sin la tabla de días, así
    // que el simulador podía equivocarse de día donde el bot real no (y al
    // revés): dejaba de ser una prueba fiel. Ver lib/calendario.
    const { fecha: hoy, hhmm } = ahoraChile();
    const systemVar = [
      ...lineasCalendario(hoy, hhmm),
      'El cliente se llama "Cliente de prueba".',
    ].join('\n');

    // El loop COMPLETO del cerebro: mismas herramientas, mismos reintentos y
    // los mismos cinturones (voseo, horas inventadas). `simulado: true` hace
    // que agendar/reagendar/cancelar corran TODAS sus validaciones y se salten
    // solo el write — antes se respondía ok:true a ciegas, así que el dueño
    // veía "cita confirmada" en horas que su bot real habría rechazado.
    const ctx = {
      tid, telefono: '+56900000000', chatId: 'simulador',
      confirmacionesEnabled: false, simulado: true, traza: [],
    };
    const respuesta = await cerebro._pensarYResponder({
      anthropicKey: ANTHROPIC_API_KEY.value(),
      systemFijo, systemVariable: systemVar,
      historia: previos, texto, ctx, tools: toolsBase,
    });
    const usadas = ctx.traza.map(t => t.name);

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
