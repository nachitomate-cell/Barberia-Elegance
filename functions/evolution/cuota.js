'use strict';

// functions/evolution/cuota.js
// ─────────────────────────────────────────────────────────────────────────────
//  POLÍTICA DE RITMO ANTI-BAN del canal por sesión/QR (Evolution).
//
//  Meta no mira "confirmaciones" ni "respuestas del bot": mira el TOTAL de
//  mensajes salientes de ese número. Antes el tope diario vivía dentro de
//  confirmaciones.js y solo contaba las confirmaciones, así que un local con
//  25 chats activos × 4 respuestas sumaba ~100 salientes que el tope no veía.
//  Acá el contador es UNO SOLO y lo incrementan los dos caminos.
//
//  Contador: tenants/{tid}/wa_cuota/{YYYY-MM-DD}.n  (día en hora de Chile)
//  Se usa un doc por día con FieldValue.increment en vez de un {fecha,n}
//  dentro de la config: el increment es atómico y no se pisa cuando el cron y
//  el webhook escriben a la vez.
// ─────────────────────────────────────────────────────────────────────────────

const admin          = require('firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');
const { _ahoraChile: ahoraChile } = require('../chat-horas-disponibles');

const db = admin.firestore();

const cuotaRef = (tid, fecha) => db.doc(`tenants/${tid}/wa_cuota/${fecha}`);

/**
 * Tope DIARIO de salientes por instancia, escalonado por madurez del número.
 * Un número recién vinculado despachando decenas de mensajes el día uno es el
 * patrón que Meta suspende primero. La edad se mide desde `vinculadoDesde`
 * (primera conexión, no se resetea al reconectar); sin ese dato asumimos
 * número nuevo, que es la lectura conservadora.
 */
function capDiario(cfg) {
  const desde = cfg && cfg.vinculadoDesde && cfg.vinculadoDesde.toMillis
    ? cfg.vinculadoDesde.toMillis() : 0;
  const dias = desde ? (Date.now() - desde) / 86400000 : 0;
  if (dias >= 30) return 300;   // número maduro: bot conversacional + confirmaciones
  if (dias >= 7)  return 120;
  return 40;                    // primera semana: mínimo indispensable
}

/**
 * Tope de CONFIRMACIONES (salientes proactivos, los realmente riesgosos).
 * Es un subconjunto del cap diario total: iniciar conversación pesa mucho más
 * que responderle a alguien que te escribió.
 */
function capConfirmaciones(cfg) {
  const desde = cfg && cfg.vinculadoDesde && cfg.vinculadoDesde.toMillis
    ? cfg.vinculadoDesde.toMillis() : 0;
  const dias = desde ? (Date.now() - desde) / 86400000 : 0;
  if (dias >= 30) return 150;
  if (dias >= 7)  return 60;
  return 20;
}

/** Máximo de confirmaciones por CICLO del cron (corre cada 30 min).
 *  Reemplaza al "dormir entre envíos": distribuye la carga en el tiempo sin
 *  quemar segundos de la Cloud Function ni arriesgar el timeout. */
const MAX_POR_CICLO = 8;

/** Ventana horaria de salientes proactivos (hora de Chile).
 *  Una confirmación a las 03:00 es la forma más rápida de ganarse un bloqueo,
 *  y el cron corre cada 30 minutos las 24 horas. */
const HORA_INICIO = 9;   // 09:00
const HORA_FIN    = 21;  // 21:00 (no se envía a las 21:00 ni después)

function dentroDeVentanaHoraria(now = ahoraChile()) {
  const h = Math.floor(now.mins / 60);
  return h >= HORA_INICIO && h < HORA_FIN;
}

/** Registra un envío del día. `n` cuenta SOLO los que salieron (es lo que vio
 *  Meta); los fallos van aparte porque una tasa de fallo alta es el síntoma
 *  temprano de una sesión degradada, antes de que se caiga del todo.
 *  Nunca lanza: es telemetría de control, no puede tumbar un envío. */
async function registrarSaliente(tid, { tipo = 'bot', ok = true } = {}) {
  if (!tid) return;
  const fecha = ahoraChile().fecha;
  await cuotaRef(tid, fecha).set({
    fecha,
    ...(ok ? { n: FieldValue.increment(1) } : {}),
    [`${tipo}_${ok ? 'ok' : 'fail'}`]: FieldValue.increment(1),
    actualizado: FieldValue.serverTimestamp(),
  }, { merge: true }).catch(() => {});
}

/** Snapshot del día para el dashboard de ops: cuánto salió, cuánto falló y
 *  contra qué topes. Falla-abierto con ceros. */
async function resumenHoy(tid) {
  const vacio = { n: 0, botOk: 0, botFail: 0, confOk: 0, confFail: 0 };
  if (!tid) return vacio;
  try {
    const s = await cuotaRef(tid, ahoraChile().fecha).get();
    if (!s.exists) return vacio;
    const d = s.data() || {};
    return {
      n:        Number(d.n) || 0,
      botOk:    Number(d.bot_ok) || 0,
      botFail:  Number(d.bot_fail) || 0,
      confOk:   Number(d.confirmacion_ok) || 0,
      confFail: Number(d.confirmacion_fail) || 0,
    };
  } catch (_) { return vacio; }
}

/** Salientes ya emitidos hoy por esta instancia. Falla-abierto (0). */
async function salientesHoy(tid) {
  if (!tid) return 0;
  try {
    const s = await cuotaRef(tid, ahoraChile().fecha).get();
    return s.exists ? (Number(s.data().n) || 0) : 0;
  } catch (_) { return 0; }
}

module.exports = {
  capDiario,
  capConfirmaciones,
  MAX_POR_CICLO,
  HORA_INICIO,
  HORA_FIN,
  dentroDeVentanaHoraria,
  registrarSaliente,
  salientesHoy,
  resumenHoy,
};
