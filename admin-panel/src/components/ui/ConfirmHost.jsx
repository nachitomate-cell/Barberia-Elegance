import { useSyncExternalStore, useEffect } from 'react';
import { subscribe, getState, resolveConfirm } from '../../lib/confirmDialog';

// Logo SynapTech (servido desde la raíz del sitio, igual que en el Sidebar).
const LOGO = '/logo1.png';

/**
 * Host único del diálogo de confirmación. Montar una sola vez en App.
 * Estética de marca SynapTech: verde, negro y blanco, con animación de
 * apertura y el logo revelándose con un anillo pulsante.
 *
 * Colores de texto van inline para no ser pisados por los overrides de
 * modo claro en index.css (que invierten text-white / text-slate-*).
 */
export default function ConfirmHost() {
  const state = useSyncExternalStore(subscribe, getState, getState);

  useEffect(() => {
    if (!state) return;
    const onKey = (e) => {
      if (e.key === 'Escape') resolveConfirm(false);
      if (e.key === 'Enter')  resolveConfirm(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state]);

  if (!state) return null;

  const {
    title       = 'Confirmar acción',
    message     = '',
    confirmText = 'Confirmar',
    cancelText  = 'Cancelar',
  } = state.opts;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-confirm-fade"
      style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) resolveConfirm(false); }}
    >
      <div
        className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-emerald-500/25 shadow-2xl animate-confirm-pop"
        style={{ background: 'linear-gradient(160deg, #0b0f0d 0%, #000000 65%)' }}
      >
        {/* Glow superior verde */}
        <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-emerald-500/20 blur-3xl" />

        {/* Logo + signo ? */}
        <div className="relative flex flex-col items-center pt-8 pb-3">
          <div className="relative animate-confirm-logo">
            {/* Anillos pulsantes */}
            <span className="absolute inset-0 rounded-2xl border-2 border-emerald-400/50 animate-confirm-ring" />
            <span className="absolute inset-0 rounded-2xl border-2 border-emerald-400/30 animate-confirm-ring" style={{ animationDelay: '0.7s' }} />
            {/* Caja del logo */}
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-400/40">
              <img src={LOGO} alt="SynapTech" className="h-10 w-10 object-contain" />
            </div>
            {/* Badge con el signo ? */}
            <span className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-base font-black text-black shadow-lg shadow-emerald-500/40">
              ?
            </span>
          </div>
        </div>

        {/* Texto */}
        <div className="px-6 pb-1 text-center">
          <h3 className="text-lg font-bold" style={{ color: '#ffffff' }}>{title}</h3>
          {message && (
            <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-line" style={{ color: '#cbd5e1' }}>
              {message}
            </p>
          )}
        </div>

        {/* Botones */}
        <div className="flex gap-3 p-5 pt-5">
          <button
            onClick={() => resolveConfirm(false)}
            className="flex-1 rounded-xl border border-white/15 bg-white/5 py-2.5 text-sm font-semibold transition-all hover:bg-white/10 active:scale-95"
            style={{ color: '#e2e8f0' }}
          >
            {cancelText}
          </button>
          <button
            autoFocus
            onClick={() => resolveConfirm(true)}
            className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-sm font-bold text-black shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400 active:scale-95"
          >
            {confirmText}
          </button>
        </div>

        {/* Marca inferior */}
        <div className="flex items-center justify-center gap-1.5 border-t border-white/5 py-2.5">
          <img src={LOGO} alt="" className="h-3 w-3 object-contain opacity-50" />
          <span className="text-[10px] font-medium uppercase tracking-widest" style={{ color: '#64748b' }}>
            SynapTech
          </span>
        </div>
      </div>
    </div>
  );
}