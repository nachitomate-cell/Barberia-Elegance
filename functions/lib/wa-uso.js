'use strict';

// functions/lib/wa-uso.js
// ─────────────────────────────────────────────────────────────────────────────
//  Medidor de uso del asistente. Es la base sobre la que se cobran los planes,
//  así que la regla es: el número tiene que ser exacto y auditable, o no sirve.
//
//  ¿QUÉ ES UNA CONVERSACIÓN?
//  Una ventana de 24 h por chat, igual que la define WhatsApp Business. La
//  abre la primera respuesta del bot a ese chat y todo lo que pase dentro de
//  esas 24 h es la MISMA conversación, responda el bot 2 veces o 20.
//
//  Antes era "primera respuesta del día calendario", y eso tenía dos defectos
//  que se pagaban en la factura:
//    · Medianoche partía una conversación en dos. Un cliente escribiendo a las
//      23:50 y cerrando su hora a las 00:10 se cobraba dos veces.
//    · Se contaba con un `increment` a ciegas después de leer el chat, así que
//      dos mensajes seguidos del mismo cliente —"hola" + "quiero hora", el
//      patrón normal en WhatsApp— llegaban como dos webhooks concurrentes que
//      leían los dos `respDia.n = 0` y sumaban DOS conversaciones por una.
//
//  Acá la ventana se abre DENTRO de una transacción sobre el doc del chat, que
//  es el candado natural: dos webhooks simultáneos del mismo chat se serializan
//  y solo uno la abre. El contador del mes se incrementa en esa misma
//  transacción, así que es exactamente-una-vez por construcción, no por parche.
//
//  DÓNDE VIVE
//    tenants/{tid}/wa_uso/{YYYY-MM}    → el rollup que se factura (transaccional)
//    tenants/{tid}/wa_eventos/{auto}   → libro inmutable, para auditar de dónde
//                                        salió cada conversación cobrada
//
//  El libro de eventos NO es la fuente del cobro (ese es el rollup): es la
//  prueba. Sin él, dentro de tres meses "137 conversaciones" es un número que
//  hay que creer. Guarda el chat HASHEADO, nunca el teléfono — el mismo
//  criterio que el resto del módulo.
// ─────────────────────────────────────────────────────────────────────────────

const admin          = require('firebase-admin');
const crypto         = require('crypto');
const { FieldValue, Timestamp } = require('firebase-admin/firestore');
const { logger }     = require('firebase-functions/v2');
const { _ahoraChile: ahoraChile } = require('../chat-horas-disponibles');

const db = admin.firestore();

/** Ventana de una conversación: 24 h desde la primera respuesta del bot. */
const VENTANA_MS = 24 * 60 * 60 * 1000;

/** Cuánto se conserva el libro de eventos. Los cobros se cierran mucho antes;
 *  más allá de eso es peso muerto. Se guarda `expiraEn` para poder colgarle
 *  una política de TTL de Firestore sin tocar código. */
const DIAS_RETENCION_EVENTOS = 400;

const mesChile = () => ahoraChile().fecha.slice(0, 7);
const usoRef   = (tid, mes) => db.doc(`tenants/${tid}/wa_uso/${mes}`);
const millis   = (t) => (t && t.toMillis ? t.toMillis() : 0);

/** El chat nunca viaja en claro a un registro: es el teléfono del cliente. */
const hashChat = (chatId) =>
  crypto.createHash('sha256').update(`wa:${chatId}`).digest('hex').slice(0, 16);

/**
 * Anota un hecho en el libro inmutable. Nunca lanza y nunca bloquea: es la
 * prueba de auditoría, no el camino del cobro — si se pierde una línea, el
 * rollup transaccional sigue siendo correcto.
 */
function evento(tid, { tipo, chatId = null, motivo = null, mes = null }) {
  if (!tid || !tipo) return Promise.resolve();
  const ahora = ahoraChile();
  return db.collection(`tenants/${tid}/wa_eventos`).add({
    tipo,                                  // 'conversacion' | 'in' | 'out' | 'rechazada'
    ...(chatId ? { chat: hashChat(chatId) } : {}),
    ...(motivo ? { motivo } : {}),
    dia: ahora.fecha,
    mes: mes || ahora.fecha.slice(0, 7),
    ts: FieldValue.serverTimestamp(),
    expiraEn: Timestamp.fromMillis(Date.now() + DIAS_RETENCION_EVENTOS * 86400e3),
  }).then(() => {}).catch(() => {});
}

/**
 * Abre una conversación si la ventana de ese chat venció, y devuelve si era
 * nueva. TRANSACCIONAL sobre el doc del chat: ahí está la exactitud.
 *
 * Falla-abierto: si la transacción no se puede completar se devuelve
 * `nueva: false` y el bot responde igual. Perder una unidad de cobro es
 * infinitamente más barato que dejar a un cliente hablando solo.
 *
 * @param {string} tid
 * @param {FirebaseFirestore.DocumentReference} chatRef  doc de wa_conversaciones
 * @param {string} chatId  solo para el libro de eventos (se guarda hasheado)
 */
async function abrirConversacion(tid, chatRef, chatId) {
  const mes = mesChile();
  try {
    const nueva = await db.runTransaction(async (tx) => {
      const snap = await tx.get(chatRef);
      const hasta = snap.exists ? millis(snap.data().convVentanaHasta) : 0;
      if (hasta > Date.now()) return false;          // sigue dentro de la ventana

      tx.set(chatRef, {
        convVentanaHasta: Timestamp.fromMillis(Date.now() + VENTANA_MS),
        convVentanaDesde: FieldValue.serverTimestamp(),
      }, { merge: true });

      tx.set(usoRef(tid, mes), {
        mes,
        conversaciones: FieldValue.increment(1),
        actualizado: FieldValue.serverTimestamp(),
      }, { merge: true });

      return true;
    });

    if (nueva) evento(tid, { tipo: 'conversacion', chatId, mes });
    return { nueva, mes };
  } catch (e) {
    logger.warn(`[wa-uso] ${tid}: no se pudo abrir la conversación: ${e.message}`);
    return { nueva: false, mes, error: true };
  }
}

/** ¿Este chat está dentro de una ventana abierta? Lectura barata, sin escribir.
 *  Sirve para decidir ANTES de gastar el modelo si esto sería una conversación
 *  nueva (y por lo tanto si toca revisar el cupo del plan). */
function ventanaAbierta(convData) {
  return millis(convData && convData.convVentanaHasta) > Date.now();
}

/** Volumen de mensajes del mes. No es la unidad de cobro —es el indicador de
 *  carga real del número, el que dice si un local está cerca del techo
 *  anti-ban— así que un increment suelto basta. */
function registrarMensajes(tid, { entrantes = 0, salientes = 0 } = {}) {
  if (!tid || (!entrantes && !salientes)) return Promise.resolve();
  const mes = mesChile();
  return usoRef(tid, mes).set({
    mes,
    ...(entrantes ? { mensajesIn: FieldValue.increment(entrantes) } : {}),
    ...(salientes ? { mensajesOut: FieldValue.increment(salientes) } : {}),
    actualizado: FieldValue.serverTimestamp(),
  }, { merge: true }).then(() => {}).catch(() => {});
}

/**
 * Una conversación que NO se atendió, y por qué. Es la métrica comercial más
 * valiosa del módulo: un local con rechazos es un local que necesita un plan
 * más grande, y hoy eso solo quedaba en un log que nadie lee.
 */
function registrarRechazo(tid, motivo, chatId = null) {
  if (!tid || !motivo) return Promise.resolve();
  const mes = mesChile();
  evento(tid, { tipo: 'rechazada', motivo, chatId, mes });
  return usoRef(tid, mes).set({
    mes,
    rechazadas: { [motivo]: FieldValue.increment(1) },
    actualizado: FieldValue.serverTimestamp(),
  }, { merge: true }).then(() => {}).catch(() => {});
}

const VACIO = {
  conversaciones: 0, mensajesIn: 0, mensajesOut: 0,
  rechazadas: {}, rechazadasTotal: 0,
};

/** Uso del mes tal como se factura. `ok:false` = no se pudo leer (≠ sin uso). */
async function usoDelMes(tid, mes = mesChile()) {
  if (!tid) return { ...VACIO, mes, ok: false };
  try {
    const d = (await usoRef(tid, mes).get()).data() || {};
    const rech = d.rechazadas || {};
    return {
      mes,
      conversaciones: Number(d.conversaciones) || 0,
      mensajesIn:     Number(d.mensajesIn)     || 0,
      mensajesOut:    Number(d.mensajesOut)    || 0,
      rechazadas:     rech,
      rechazadasTotal: Object.values(rech).reduce((a, b) => a + (Number(b) || 0), 0),
      ok: true,
    };
  } catch (e) {
    logger.warn(`[wa-uso] uso ${tid} ${mes}: ${e.message}`);
    return { ...VACIO, mes, ok: false };
  }
}

module.exports = {
  VENTANA_MS,
  abrirConversacion,
  ventanaAbierta,
  registrarMensajes,
  registrarRechazo,
  usoDelMes,
  mesChile,
  _hashChat: hashChat,
};
