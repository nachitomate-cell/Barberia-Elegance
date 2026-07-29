'use strict';

// functions/lib/wa-consent.js
// ─────────────────────────────────────────────────────────────────────────────
//  LIBRO DE CONSENTIMIENTO DE WHATSAPP — compartido por los DOS canales.
//
//  Hay dos formas de mandarle WhatsApp a un cliente y antes cada una tenía su
//  propia idea del consentimiento:
//    · Canal oficial (Cloud API de Meta)  → functions/whatsapp-notif.js
//    · Canal por sesión/QR (Evolution)    → functions/evolution/*
//  El oficial ya respetaba /wa_optout; el de Evolution lo ignoraba por
//  completo. Resultado: un cliente que escribía STOP al número oficial seguía
//  recibiendo confirmaciones desde el número del local, y un "no me escriban
//  más" respondido al local no tenía ningún efecto. Este módulo es la única
//  fuente de verdad para ambos.
//
//  MODELO (dos piezas distintas, no confundir):
//    · cita.waOptIn === true      → EVENTO de consentimiento: el cliente marcó
//      la casilla al reservar. Es la evidencia puntual de esa cita.
//    · /wa_optout/{fono}          → REGISTRO durable y global: 'optin' |
//      'optout'. Un STOP escribe 'optout' y bloquea TODO canal hasta que el
//      cliente escriba REACTIVAR. Manda por sobre cualquier waOptIn posterior.
//
//  Por qué el doc id debe salir SIEMPRE de normalizarFono(): si un canal
//  guarda 56912345678 y el otro busca 912345678, el opt-out no se ve y
//  volvemos al problema original. Es el mismo tipo de bug de espejo que ya
//  mordió con los tenants y con los roles: una sola función, sin copias.
//
//  Ley 21.719 / 19.628: el opt-out debe ser tan fácil como el opt-in y hay que
//  poder demostrarlo — por eso queda `historial` con timestamp y fuente.
// ─────────────────────────────────────────────────────────────────────────────

const admin = require('firebase-admin');
const { FieldValue, Timestamp } = require('firebase-admin/firestore');

const db = admin.firestore();
const COL = 'wa_optout';

/**
 * Teléfono → E.164 chileno SIN el '+' (569XXXXXXXX). Es el doc id del libro.
 * Idéntica a la que tenía whatsapp-notif.js, para no invalidar los docs ya
 * escritos por ese canal.
 */
function normalizarFono(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.length === 9 && d.startsWith('9')) d = '56' + d;
  if (d.length === 8) d = '569' + d;
  return d;
}

// ── Detección de baja / reactivación en texto libre ──
// Va más allá de STOP: el cliente real casi nunca escribe la palabra mágica,
// escribe "no me escriban más". Si no lo captamos, se va a "Bloquear" — y el
// ratio de bloqueos es exactamente lo que gatilla la suspensión del número.
// PRECISIÓN POR SOBRE COBERTURA. Un falso positivo da de baja para siempre a
// alguien que quería otra cosa, y no se entera nunca — solo deja de llegarle
// el recordatorio. Por eso las palabras ambiguas sueltas ("baja") solo cuentan
// si son el mensaje COMPLETO, que es justo como responde quien leyó
// "responde STOP". Contraejemplos reales que NO deben dar de baja:
//   · "quiero dar de baja mi cita"  → cancela la cita, no el canal
//   · "no me manden a otro barbero" → es una preferencia
//   · "cancelar"                    → lo maneja el fast-path de confirmación
// (el texto llega por _norm: minúsculas, sin tildes, sin puntuación en bordes)
const RE_STOP = new RegExp([
  '^(stop|baja|unsubscribe|desuscribirme|desuscribir|removerme|no molestar)$',
  'dar(me)? de baja (de|del)',
  'no (me )?(escriban|escribas|manden|envien) (mas|nada|mensajes|whatsapp)',
  'no (me )?(molesten|contacten) (mas|por whatsapp)',
  'dejen de (escribir|molestar|mandar|enviar)',
  'no quiero (mas )?(mensajes|whatsapp|recordatorios|publicidad|promociones)',
  'no quiero que me (escriban|contacten|molesten)',
  'borrenme|eliminenme|saquenme de la lista',
].join('|'), 'i');

const RE_REACTIVAR = new RegExp([
  '^(reactivar|reactivame|alta|suscribirme)$',
  'quiero (volver a )?recibir',
  'volver a recibir',
].join('|'), 'i');

/** Minúsculas, sin tildes, espacios colapsados y sin puntuación en los bordes:
 *  el cliente escribe "STOP." o "¡Baja!" y tiene que matchear igual contra ^$. */
const _norm = (s) => String(s || '')
  .toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\s+/g, ' ')
  .replace(/^[\s¡¿.,;:!?"'()]+/, '')
  .replace(/[\s.,;:!?"'()]+$/, '')
  .trim();

function detectarStop(texto)      { return RE_STOP.test(_norm(texto)); }
function detectarReactivar(texto) { return RE_REACTIVAR.test(_norm(texto)); }

/**
 * Estado del titular: 'optin' | 'optout' | 'unknown' (sin doc).
 * OJO con la asimetría entre canales, es intencional:
 *   · El canal OFICIAL exige 'optin' explícito (Meta Business Policy: mensajes
 *     iniciados por la empresa con plantilla pagada).
 *   · El canal EVOLUTION usa estaBloqueado(): solo un 'optout' explícito frena
 *     el envío, porque ahí el opt-in ya viene probado por cita.waOptIn (la
 *     casilla de la reserva). Si exigiéramos 'optin' en el libro, ninguna
 *     confirmación saldría nunca y la función quedaría muerta en silencio.
 */
async function consentimientoWa(fono) {
  const id = normalizarFono(fono);
  if (!id) return 'unknown';
  try {
    const snap = await db.collection(COL).doc(id).get();
    if (!snap.exists) return 'unknown';
    return snap.data()?.estado === 'optout' ? 'optout' : 'optin';
  } catch (_) { return 'unknown'; }
}

/** ¿Se dio de baja explícitamente? Falla-abierto: si Firestore falla, NO bloquea. */
async function estaBloqueado(fono) {
  return (await consentimientoWa(fono)) === 'optout';
}

async function registrarOptOut(fono, motivo) {
  const id = normalizarFono(fono);
  if (!id) return;
  const now = Timestamp.now();
  await db.collection(COL).doc(id).set({
    telefono:      id,
    estado:        'optout',
    motivo:        motivo || 'stop-usuario',
    actualizadoEn: now,
    historial:     FieldValue.arrayUnion({ estado: 'optout', fuente: motivo || 'stop-usuario', at: now }),
  }, { merge: true });
}

async function registrarOptIn(fono, motivo) {
  const id = normalizarFono(fono);
  if (!id) return;
  const now = Timestamp.now();
  await db.collection(COL).doc(id).set({
    telefono:      id,
    estado:        'optin',
    motivo:        motivo || 'reactivar-usuario',
    actualizadoEn: now,
    historial:     FieldValue.arrayUnion({ estado: 'optin', fuente: motivo || 'reactivar-usuario', at: now }),
  }, { merge: true });
}

module.exports = {
  normalizarFono,
  detectarStop,
  detectarReactivar,
  consentimientoWa,
  estaBloqueado,
  registrarOptOut,
  registrarOptIn,
};
