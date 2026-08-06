'use strict';

// functions/lib/metrics.js
// Instrumentación de barbería para el dashboard ops.synaptechspa.cl.
// Contadores diarios planos en _metrics/* (mismo esquema que conexion/SushiPro).

const admin = require('firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');
const { logger } = require('firebase-functions');

const db = admin.firestore();

// Precio aprox. por millón de tokens (USD) para estimar costo de Claude.
// Precios oficiales por millón de tokens. Cualquier modelo que se empiece a
// usar TIENE que estar acá: lo que falta cae al precio por defecto y el gasto
// que muestra ops queda por debajo del real (pasó con claude-sonnet-5, que
// costaba 3x lo que se estaba contando).
const PRICE = {
  'claude-haiku-4-5-20251001': { in: 1.0,  out: 5.0  },
  'claude-haiku-4-5':          { in: 1.0,  out: 5.0  },
  'claude-sonnet-4-6':         { in: 3.0,  out: 15.0 },
  'claude-sonnet-5':           { in: 3.0,  out: 15.0, intro: { in: 2.0, out: 10.0, hasta: '2026-08-31' } },
  'claude-opus-4-8':           { in: 5.0,  out: 25.0 },
  'claude-opus-5':             { in: 5.0,  out: 25.0 },
};

// El más caro de la tabla. Es el default a propósito: si aparece un modelo
// desconocido preferimos SOBREestimar el gasto — una alarma de más se revisa,
// un gasto invisible no se revisa nunca.
const PRECIO_DESCONOCIDO = { in: 5.0, out: 25.0 };

/**
 * Precio vigente de un modelo. Contempla las tarifas de lanzamiento, que
 * vencen en una fecha concreta: dejarlas fijas subcontaría desde ese día sin
 * que nadie se entere.
 */
function precioDe(model, hoyISO) {
  const p = PRICE[model];
  if (!p) {
    logger.warn(`[metrics] modelo sin precio en la tabla: "${model}" — se cobra al máximo conocido para no subcontar`);
    return PRECIO_DESCONOCIDO;
  }
  if (p.intro && (hoyISO || new Date().toISOString().slice(0, 10)) <= p.intro.hasta) {
    return { in: p.intro.in, out: p.intro.out };
  }
  return { in: p.in, out: p.out };
}

/* Día y mes en hora de CHILE, no UTC.
   Con toISOString() el contador cortaba a las 20:00 de Chile (medianoche UTC),
   así que todo lo que pasaba entre las 20:00 y las 00:00 —que son horas de
   movimiento real en una barbería— se anotaba en el día siguiente. En el mismo
   dashboard convivía con el cupo de WhatsApp, que sí corta en Santiago: dos
   cifras que se leen juntas y contaban días distintos.

   Es el mismo problema que ya tenía el contador de correo y que resolvió
   diaMail() en lib/mailer.js. Acá se usa el mismo criterio para que no haya
   dos definiciones de "hoy" conviviendo en el proyecto.

   ⚠️ Los docs escritos ANTES de este cambio siguen con clave UTC. Para la
   franja de las 20:00–00:00 quedaron en el día siguiente y ahí se quedan: son
   pocos y migrarlos costaría más de lo que valen. */
const DIA_CL = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit',
});
const hoy = () => DIA_CL.format(new Date());   // en-CA da YYYY-MM-DD
const mes = () => hoy().slice(0, 7);

/** Registra un envío de WhatsApp por Evolution (tipo: 'bot' | 'confirmacion'). */
async function logWaSend(tid, tipo, ok) {
  const key = `${tipo}_${ok ? 'ok' : 'fail'}`;
  await Promise.all([
    db.doc(`_metrics/wa_${hoy()}`).set({
      proyecto: 'barberia',
      total: FieldValue.increment(1),
      [key]: FieldValue.increment(1),
      actualizado: FieldValue.serverTimestamp(),
    }, { merge: true }),
    db.doc(`_metrics/wa_vendor_${tid}`).set({
      vendorId: tid,
      [tipo]: FieldValue.increment(1),
      ultimoEnvio: FieldValue.serverTimestamp(),
    }, { merge: true }),
  ]).catch(() => {});
}

/** Registra uso de Claude (tokens + costo estimado) desde el `usage` crudo de la API. */
// Prompt caching: input_tokens ya NO incluye lo cacheado — la API reporta
// aparte cache_creation y cache_read. Sin estos términos la métrica subcontaría.
// OJO con el multiplicador de escritura: NO es uno solo. Depende del TTL del
// bloque cacheado — 1.25× a 5 minutos y 2× a 1 hora — y el bot conversacional
// usa 1h. La API desglosa ambos en usage.cache_creation; si ese desglose no
// viene, asumimos 1h (el TTL que usamos) para no subcontar el costo real.
async function logAiUsage(model, usage = {}, tid = null) {
  const p = precioDe(model, hoy());
  const inputTokens     = usage.input_tokens || 0;
  const outputTokens    = usage.output_tokens || 0;
  const cacheReadTokens = usage.cache_read_input_tokens || 0;
  const desglose        = usage.cache_creation || null;
  const write5m         = desglose ? (desglose.ephemeral_5m_input_tokens || 0) : 0;
  const write1h         = desglose
    ? (desglose.ephemeral_1h_input_tokens || 0)
    : (usage.cache_creation_input_tokens || 0);
  const cacheWriteTokens = write5m + write1h;

  const costUsd =
    (inputTokens / 1e6) * p.in +
    (outputTokens / 1e6) * p.out +
    (write5m / 1e6) * p.in * 1.25 +
    (write1h / 1e6) * p.in * 2 +
    (cacheReadTokens / 1e6) * p.in * 0.1;
  const writes = [
    db.doc(`_metrics/ai_${hoy()}`).set({
      proyecto: 'barberia',
      llamadas: FieldValue.increment(1),
      tokensIn: FieldValue.increment(inputTokens),
      tokensOut: FieldValue.increment(outputTokens),
      tokensCacheWrite: FieldValue.increment(cacheWriteTokens),
      tokensCacheRead: FieldValue.increment(cacheReadTokens),
      costUsd: FieldValue.increment(costUsd),
      actualizado: FieldValue.serverTimestamp(),
    }, { merge: true }),
  ];
  // Desglose por tenant, MENSUAL y DIARIO.
  //  · mensual → cuánto cuesta cada local (trials, pricing del add-on)
  //  · diario  → es el que sirve para vigilar: con el mensual un local que se
  //    dispara 10× hoy no se nota hasta que ya lleva días quemando plata.
  // Ambos llevan los tokens de caché: si el prefijo de un local se rompe
  // (queda bajo el mínimo cacheable), cacheRead se va a 0 y el costo se
  // duplica EN SILENCIO. El hit rate es la alarma más barata que existe.
  if (tid) {
    const desglose = {
      vendorId: tid,
      llamadas: FieldValue.increment(1),
      tokensIn: FieldValue.increment(inputTokens),
      tokensOut: FieldValue.increment(outputTokens),
      tokensCacheWrite: FieldValue.increment(cacheWriteTokens),
      tokensCacheRead: FieldValue.increment(cacheReadTokens),
      costUsd: FieldValue.increment(costUsd),
      actualizado: FieldValue.serverTimestamp(),
    };
    writes.push(db.doc(`_metrics/ai_vendor_${tid}_${mes()}`).set({ ...desglose, mes: mes() }, { merge: true }));
    writes.push(db.doc(`_metrics/ai_dia_${tid}_${hoy()}`).set({ ...desglose, fecha: hoy() }, { merge: true }));
  }
  await Promise.all(writes).catch(() => {});
}

/** Eventos de negocio del bot por tenant/mes (el ROI que ve ops):
 *  'agendada' (cita creada por el bot) · 'cancelada' (cancelada vía bot) ·
 *  'conf_si' / 'conf_no' (respuesta CONFIRMAR / CANCELAR a la confirmación). */
async function logBotNegocio(tid, evento) {
  if (!tid || !evento) return;
  await db.doc(`_metrics/bot_${tid}_${mes()}`).set({
    vendorId: tid,
    mes: mes(),
    [evento]: FieldValue.increment(1),
    actualizado: FieldValue.serverTimestamp(),
  }, { merge: true }).catch(() => {});
}

/**
 * Cuántas veces intervino cada cinturón del bot, por tenant y por mes.
 *
 * Hasta ahora solo escribían un logger.warn: no había forma de saber si el
 * bot mejora o empeora sin leer logs a mano, ni de detectar que un local
 * dispara mucho más que el resto (que casi siempre significa que ahí hay un
 * dato mal cargado, no un modelo peor).
 */
async function logCinturon(tid, cinturon) {
  if (!tid || !cinturon) return;
  await db.doc(`_metrics/cinturones_${tid}_${mes()}`).set({
    vendorId: tid,
    mes: mes(),
    [cinturon]: FieldValue.increment(1),
    total: FieldValue.increment(1),
    actualizado: FieldValue.serverTimestamp(),
  }, { merge: true }).catch(() => {});
}

module.exports = { logWaSend, logAiUsage, logBotNegocio, logCinturon };
