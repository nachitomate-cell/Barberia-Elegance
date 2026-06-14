// confirmDialog.js — Diálogo de confirmación nativo de la app (reemplaza window.confirm).
// Imperativo: no necesita hooks en cada vista.
//
//   import { confirmDialog } from '../lib/confirmDialog';
//   if (!(await confirmDialog('¿Eliminar esta cita?'))) return;
//
//   // o con opciones:
//   await confirmDialog({ title, message, confirmText, cancelText });
//
// El render lo hace <ConfirmHost /> (montado una vez en App.jsx).

let listeners = new Set();
let state = null; // { opts, resolve } | null

function emit() { for (const l of listeners) l(); }

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getState() { return state; }

/**
 * Abre el modal de confirmación. Devuelve Promise<boolean>.
 * @param {string|{title?:string,message?:string,confirmText?:string,cancelText?:string}} optsOrMessage
 */
export function confirmDialog(optsOrMessage) {
  const opts = typeof optsOrMessage === 'string'
    ? { message: optsOrMessage }
    : (optsOrMessage || {});
  return new Promise((resolve) => {
    // Si ya había uno abierto, lo cerramos como "cancelado".
    if (state) state.resolve(false);
    state = { opts, resolve };
    emit();
  });
}

/** Cierra el modal resolviendo la promesa con el valor dado. */
export function resolveConfirm(value) {
  if (!state) return;
  const { resolve } = state;
  state = null;
  emit();
  resolve(value);
}