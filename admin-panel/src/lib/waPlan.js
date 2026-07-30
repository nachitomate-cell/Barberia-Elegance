// admin-panel/src/lib/waPlan.js
// ─────────────────────────────────────────────────────────────────────────────
//  Planes del add-on de WhatsApp — copia CLIENTE de la derivación.
//
//  ⚠️ ESTO ES UNA LISTA ESPEJO. La fuente es functions/lib/wa-plan.js, y la
//  misma lógica existe además en firestore.rules (waPlanDeSys). No se puede
//  importar una sola: las reglas no son JS y el bundle de Vite no alcanza
//  functions/. Por eso hay un guard que verifica que las tres coincidan:
//      npm run check:wa-plan
//  Si agregas o renombras un plan, tócalo en los TRES lados o el guard falla.
//
//  Semántica: el plan lo escribe SOLO SynapTech en _system/{tid}.waPlan. Los
//  switches del panel son preferencias DENTRO del plan — sirven para apagar
//  algo un feriado, nunca para contratarlo.
// ─────────────────────────────────────────────────────────────────────────────

export const PLANES = ['recordatorios', 'bot', 'full'];

/** Plan contratado según el doc `_system/{tid}`. null si no hay ninguno. */
export function planDe(sys) {
  const p = sys && sys.waPlan;
  if (PLANES.includes(p)) return p;
  // Legacy: el booleano previo a los planes valía por el paquete completo.
  if (sys && sys.waAsistente === true) return 'full';
  return null;
}

export function incluyeBot(sys) {
  const p = planDe(sys);
  return p === 'bot' || p === 'full';
}

export function incluyeRecordatorios(sys) {
  const p = planDe(sys);
  return p === 'recordatorios' || p === 'full';
}

export function tienePlan(sys) {
  return planDe(sys) !== null;
}

export const ETIQUETA_PLAN = {
  recordatorios: 'Recordatorios',
  bot:           'Asistente IA',
  full:          'Completo',
};

export function etiquetaPlan(sys) {
  return ETIQUETA_PLAN[planDe(sys)] || 'Sin plan';
}
