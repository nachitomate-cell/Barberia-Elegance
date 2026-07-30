'use strict';

// functions/lib/wa-plan.js
// ─────────────────────────────────────────────────────────────────────────────
//  PLANES DEL ADD-ON DE WHATSAPP (canal Evolution, número propio del local)
//
//  Tres planes vendibles:
//    · 'recordatorios' → solo confirmaciones de cita (cron proactivo)
//    · 'bot'           → solo el asistente IA que responde y agenda
//    · 'full'          → ambos
//    · null            → sin contratar
//
//  FUENTE DE VERDAD ÚNICA: `_system/{tid}.waPlan` (solo SynapTech lo escribe;
//  reglas: _system write = esBootstrap). Los switches que el local ve en su
//  panel — `botEnabled` / `confirmacionesEnabled` — son PREFERENCIAS dentro de
//  lo que su plan ya permite: sirven para apagar algo temporalmente (feriado,
//  cierre), nunca para contratarlo.
//
//  ⚠️ Esto NO es una lista espejo: el plan no se copia a ningún otro doc. Todo
//  el que necesite saber si el bot puede correr DERIVA con estas funciones.
//  Si en algún momento se copia a otro lado, ese otro lado se desincroniza y
//  volvemos al bug de siempre.
//
//  RETROCOMPAT: los tenants activados antes de los planes solo tienen el
//  booleano `waAsistente: true`, y lo que tenían era todo → se lee como 'full'.
//  No se migra el dato: se deriva. Escribir `waPlan` en esos docs es opcional
//  y lo hace /admin cuando el superadmin toca el selector.
//
//  Tres capas, y las tres importan (misma lección que el rol 'recepcion':
//  esconder el switch en el panel NO cierra la puerta):
//    1. firestore.rules → impide que el local se auto-active un switch.
//    2. Estos gates en el servidor → impiden que un flag viejo siga corriendo
//       después de una baja de plan (las reglas no revisan el pasado).
//    3. El panel → no le ofrece al cliente lo que no compró.
// ─────────────────────────────────────────────────────────────────────────────

const PLANES = ['recordatorios', 'bot', 'full'];

/** Plan contratado a partir del doc `_system/{tid}`. Devuelve null si no hay. */
function planDe(sys) {
  const p = sys && sys.waPlan;
  if (PLANES.includes(p)) return p;
  // Legacy: el booleano de antes de los planes valía por el paquete completo.
  if (sys && sys.waAsistente === true) return 'full';
  return null;
}

/** ¿El plan cubre el asistente conversacional? */
function incluyeBot(sys) {
  const p = planDe(sys);
  return p === 'bot' || p === 'full';
}

/** ¿El plan cubre las confirmaciones/recordatorios proactivos? */
function incluyeRecordatorios(sys) {
  const p = planDe(sys);
  return p === 'recordatorios' || p === 'full';
}

/** ¿Tiene algo contratado? (lo que habilita vincular el número por QR) */
function tienePlan(sys) {
  return planDe(sys) !== null;
}

/** Etiqueta para UI y logs. */
function etiquetaPlan(sys) {
  return ({
    recordatorios: 'Recordatorios',
    bot:           'Asistente IA',
    full:          'Completo',
  })[planDe(sys)] || 'Sin plan';
}

module.exports = {
  PLANES,
  planDe,
  incluyeBot,
  incluyeRecordatorios,
  tienePlan,
  etiquetaPlan,
};
