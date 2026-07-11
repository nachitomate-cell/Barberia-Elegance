/* ═══════════════════════════════════════════════════════════════
 *  ContextualHelpButton — botón flotante de "ayuda de esta pantalla"
 *  ─────────────────────────────────────────────────────────────
 *  Vive en el AdminLayout y detecta la ruta actual. Si hay una
 *  guía relacionada (ver helpMap.js), muestra un botón "?" abajo
 *  a la derecha. Al hover expande con el título del artículo.
 *  Al click abre /ayuda/{categoria}/{articulo} en pestaña nueva.
 *
 *  Comportamiento:
 *    · Si no hay guía para la ruta actual, no se renderiza
 *    · En rutas de /ayuda* tampoco se muestra (evita el loop)
 *    · Se puede silenciar con localStorage.setItem('hide_help_btn', '1')
 *
 *  Posición: sobre la esquina inferior derecha, arriba de los toasts
 *  del sistema (que están en z-index [9999]). El botón queda en z-30
 *  y tapa nada crítico.
 * ═══════════════════════════════════════════════════════════════ */

import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { HelpCircle, ArrowUpRight, X } from 'lucide-react';
import { resolveHelpFor, helpUrlFor } from '../lib/helpMap';

const LS_KEY = 'hide_contextual_help_btn';

export default function ContextualHelpButton() {
  const location = useLocation();
  const navigate = useNavigate();
  const [hidden, setHidden] = useState(() => {
    try { return localStorage.getItem(LS_KEY) === '1'; } catch { return false; }
  });
  const [hover, setHover] = useState(false);

  // No mostrar en /ayuda/* (evita el loop) ni si el usuario lo silenció
  const isAyudaPath = /^\/ayuda(\/|$)/.test(location.pathname);
  const target = resolveHelpFor(location.pathname);

  // Reset hover al cambiar de página
  useEffect(() => { setHover(false); }, [location.pathname]);

  if (hidden || isAyudaPath || !target) return null;

  const url = helpUrlFor(target);
  const titulo = target.titulo || 'Ver guía relacionada';

  return (
    <div
      className="fixed z-30 select-none pointer-events-auto"
      style={{
        right: 'calc(env(safe-area-inset-right, 0px) + 20px)',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Pill expandido en hover: muestra título + acción */}
      <div
        className={`flex items-center gap-2 rounded-full border transition-all duration-200 ${
          hover ? 'pl-4 pr-1 py-1 bg-slate-900 border-slate-700 shadow-2xl' : 'p-0 border-transparent'
        }`}
      >
        {hover && (
          <>
            <span className="text-[12.5px] font-medium text-slate-300 whitespace-nowrap max-w-[240px] truncate">
              {titulo}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                try { localStorage.setItem(LS_KEY, '1'); } catch {}
                setHidden(true);
              }}
              className="w-6 h-6 grid place-items-center rounded-full text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Ocultar botón de ayuda"
              title="Ocultar botón de ayuda"
            >
              <X size={11} />
            </button>
          </>
        )}

        {/* Botón circular principal */}
        <button
          onClick={() => navigate(url)}
          className="w-11 h-11 grid place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-lg active:scale-95 transition-all"
          aria-label={`Ver guía: ${titulo}`}
          title={titulo}
          style={{ boxShadow: '0 6px 24px -8px rgba(16,185,129,0.5)' }}
        >
          {hover ? <ArrowUpRight size={18} /> : <HelpCircle size={18} />}
        </button>
      </div>
    </div>
  );
}
