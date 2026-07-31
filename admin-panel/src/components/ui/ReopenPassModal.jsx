import { useState, useRef, useEffect } from 'react';
import { X, Lock, ShieldAlert } from 'lucide-react';
import { verifyPass } from '../../lib/reopenGate';

/**
 * Modal de contraseña para reabrir venta cerrada o caja cerrada.
 *
 * Se muestra ANTES de la acción destructiva; llama a `onOk()` solo si el
 * hash calza. `onCancel()` cierra sin hacer nada. `autoFocus` en el input
 * y ENTER dispara la verificación (fricción cero, patrón del PIN de canjes).
 *
 * Props:
 *   - titulo:     string  — cabecera ("Reabrir venta cerrada", etc.)
 *   - contexto:   string  — 1-2 líneas explicando qué se va a hacer
 *   - passHash:   string  — hash SHA-256 hex almacenado (verifica contra esto)
 *   - onOk:       fn      — se llama tras verificación exitosa
 *   - onCancel:   fn      — se llama al cerrar (X, ESC, botón cancelar)
 */
export default function ReopenPassModal({ titulo, contexto, passHash, onOk, onCancel }) {
  const [pass, setPass] = useState('');
  const [err,  setErr]  = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  // ESC cierra — mismo patrón que los otros drawers/modales de la vista.
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  async function submit() {
    if (busy || !pass) return;
    setBusy(true);
    setErr('');
    const ok = await verifyPass(pass, passHash);
    setBusy(false);
    if (ok) {
      onOk();
    } else {
      setErr('Contraseña incorrecta');
      setPass('');
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-slate-950 border border-white/[0.08] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldAlert size={16} className="text-amber-400/90 shrink-0" />
            <h3 className="text-sm font-black text-primary truncate">{titulo}</h3>
          </div>
          <button onClick={onCancel} className="p-1.5 rounded-lg text-slate-500 hover:text-primary hover:bg-white/[0.05]">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          {contexto && (
            <p className="text-[12px] text-slate-400 leading-relaxed">{contexto}</p>
          )}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-1.5">
              <Lock size={11} /> Contraseña
            </label>
            <input
              ref={inputRef}
              autoFocus
              type="password"
              value={pass}
              onChange={e => { setPass(e.target.value); setErr(''); }}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder="Ingresa la contraseña"
              className="w-full px-3 py-2.5 rounded-lg text-sm text-primary bg-white/[0.02] border border-white/[0.05] focus:border-amber-400/60 focus:bg-white/[0.04] focus:outline-none transition-colors"
            />
            {err && (
              <p className="text-xs text-rose-400 font-semibold mt-1.5">{err}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/[0.05] flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={busy || !pass}
            className="px-4 py-1.5 rounded-lg text-xs font-black bg-amber-500 hover:bg-amber-400 text-slate-950 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {busy ? 'Verificando…' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}
