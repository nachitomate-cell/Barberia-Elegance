// tuuCobro.js — Cobro presencial REAL por POS TUU (Haulmer).
//
// A diferencia de tuuSandbox.js (mock visual), este módulo llama a las CFs:
//   · tuuCobrarCita     → POST al POS con el monto de la cita
//   · tuuConsultarCobro → GET polling cada 2s hasta 180s
//
// Uso imperativo desde Agenda.jsx al marcar Completada + "Tarjeta (POS)":
//
//   import { tuuCobroDialog } from '../lib/tuuCobro';
//   const result = await tuuCobroDialog({
//     tenantId, citaId, cliente, monto, servicio,
//     showManualFallback,   // muestra boton "Marcar pagado igual" en timeout
//   });
//
// Resuelve con:
//   'approved'         — TUU confirmó Completed
//   'rejected'         — TUU respondió Failed
//   'canceled'         — el usuario cerró el modal o TUU respondió Canceled
//   'timeout'          — 180s sin resolución
//   'error'            — el POST a TUU falló (ver consola de CFs)
//   'manual_fallback'  — el usuario eligió "marcar pagado igual" (solo si estaba habilitado)

let listeners = new Set();
let state = null; // { opts, resolve } | null

function emit() { for (const l of listeners) l(); }

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getState() { return state; }

/**
 * @param {{
 *   tenantId: string,
 *   citaId: string,
 *   cliente?: string,
 *   monto?: number,
 *   servicio?: string,
 *   showManualFallback?: boolean,
 * }} opts
 */
export function tuuCobroDialog(opts) {
  return new Promise((resolve) => {
    if (state) state.resolve('canceled');
    state = { opts: opts || {}, resolve };
    emit();
  });
}

/** Cierra el modal desde el Host con el resultado dado. */
export function resolveTuuCobro(value) {
  if (!state) return;
  const { resolve } = state;
  state = null;
  emit();
  resolve(value);
}
