// tuuSandbox.js — Modal sandbox visual para mostrar el flujo de cobro por POS TUU.
// GATE: solo se invoca cuando tenantId === 'delnero'. NO envía ningún cobro real.
//
// Uso imperativo (igual patrón que confirmDialog.js):
//
//   import { tuuSandboxDialog } from '../lib/tuuSandbox';
//   const medio = await tuuSandboxDialog({ cliente, monto, servicio });
//   if (medio === 'cancel') return;
//   // 'tuu' | 'tuu_manual' | 'efectivo' | 'cortesia'
//
// El render lo hace <TuuSandboxHost /> (montado una vez en App.jsx).

let listeners = new Set();
let state = null; // { opts, resolve } | null

function emit() { for (const l of listeners) l(); }

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getState() { return state; }

/**
 * Abre el modal sandbox TUU. Devuelve Promise que resuelve con:
 *   'tuu'         — pagado en POS (simulado aprobado)
 *   'tuu_manual'  — POS caido, marcado como pagado igual
 *   'efectivo'    — cliente pago en efectivo
 *   'cortesia'    — cortesia u otro medio
 *   'cancel'      — no completar la cita
 *
 * @param {{cliente?:string, monto?:number, servicio?:string}} opts
 */
export function tuuSandboxDialog(opts) {
  return new Promise((resolve) => {
    if (state) state.resolve('cancel');
    state = { opts: opts || {}, resolve };
    emit();
  });
}

/** Resuelve el modal desde el Host. */
export function resolveTuu(value) {
  if (!state) return;
  const { resolve } = state;
  state = null;
  emit();
  resolve(value);
}
