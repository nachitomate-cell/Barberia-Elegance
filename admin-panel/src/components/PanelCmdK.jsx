import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, ExternalLink } from 'lucide-react';
import { useNavGroupsVisibles } from './layout/Sidebar';
import { useTenant } from '../contexts/TenantContext';
import { topFrecuentes } from '../lib/usoNavegacion';

/* ═══════════════════════════════════════════════════════════════════
   PanelCmdK — buscador global del panel (⌘K / Ctrl+K / botón lupa).
   ───────────────────────────────────────────────────────────────────
   · El índice sale de useNavGroupsVisibles: la MISMA fuente que pinta
     el Sidebar, así que respeta rol (admin/recepción), producto
     (wallet-only/deluxe/resto) y extras por tenant — jamás muestra una
     ruta que el sidebar esconde.
   · Sin texto: primero "Frecuentes" (uso real del equipo) y luego el
     catálogo completo agrupado. Con texto: filtro sin acentos.
   · Se abre con ⌘K/Ctrl+K en cualquier vista (salvo dentro de /ayuda,
     que tiene su propio palette con guías) y con el evento
     `panel-cmdk` que disparan la lupa del topbar y el botón del
     sidebar. Autocontenido: se monta UNA vez en AdminLayout.
   ═══════════════════════════════════════════════════════════════════ */

function normalizar(s) {
  // NFD + quitar diacríticos: "métricas" y "metricas" encuentran lo mismo.
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export default function PanelCmdK() {
  const [open, setOpen] = useState(false);
  const [q, setQ]       = useState('');
  const [sel, setSel]   = useState(0);
  const inputRef  = useRef(null);
  const listRef   = useRef(null);
  const navigate  = useNavigate();
  const location  = useLocation();
  const tenant    = useTenant();
  const groups    = useNavGroupsVisibles();

  /* Índice plano: rutas del panel + accesos externos útiles. */
  const index = useMemo(() => {
    const items = [];
    for (const g of groups) {
      for (const it of g.items) {
        items.push({ grupo: g.label, titulo: it.label, Icon: it.Icon, goto: it.to });
      }
    }
    items.push({
      grupo:    'Accesos',
      titulo:   tenant.id === 'deluxeperfumes' ? 'Ver catálogo público' : 'Ver agenda pública',
      Icon:     ExternalLink,
      goto:     tenant.id === 'deluxeperfumes' ? '/catalogo?local=deluxeperfumes' : `/index.html?local=${tenant.id}`,
      external: true,
    });
    return items;
  }, [groups, tenant.id]);

  /* Frecuentes (se leen al abrir, no en cada render). */
  const frecuentes = useMemo(() => {
    if (!open) return [];
    const porRuta = new Map(index.filter(i => !i.external).map(i => [i.goto, i]));
    return topFrecuentes(4).map(f => porRuta.get(f.slug)).filter(Boolean);
  }, [open, index]);

  const filtered = useMemo(() => {
    const s = normalizar(q.trim());
    if (!s) {
      return frecuentes.length
        ? [...frecuentes.map(i => ({ ...i, grupo: 'Frecuentes' })), ...index]
        : index;
    }
    return index.filter(i => normalizar(i.titulo).includes(s) || normalizar(i.grupo).includes(s));
  }, [index, frecuentes, q]);

  /* Reset al abrir */
  useEffect(() => {
    if (open) {
      setQ(''); setSel(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  /* Apertura: evento del sidebar/topbar + atajo global. Dentro de /ayuda el
     atajo lo maneja AyudaCmdK (palette propio con guías) — no competimos. */
  useEffect(() => {
    const onEvento = () => setOpen(true);
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        if (location.pathname.startsWith('/ayuda')) return;
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('panel-cmdk', onEvento);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('panel-cmdk', onEvento);
      window.removeEventListener('keydown', onKey);
    };
  }, [location.pathname]);

  const ejecutar = (item) => {
    if (!item) return;
    if (item.external) window.open(item.goto, '_blank', 'noopener');
    else navigate('/' + item.goto.replace(/^\//, ''));
    setOpen(false);
  };

  /* Navegación con teclado (solo con el palette abierto). */
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape')    { e.preventDefault(); setOpen(false); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSel(v => Math.min(v + 1, filtered.length - 1)); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSel(v => Math.max(v - 1, 0)); return; }
      if (e.key === 'Enter')     { e.preventDefault(); ejecutar(filtered[sel]); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, filtered, sel]);

  /* El seleccionado siempre visible al navegar con flechas. */
  useEffect(() => {
    listRef.current?.querySelector('[data-sel="1"]')?.scrollIntoView({ block: 'nearest' });
  }, [sel]);

  if (!open) return null;

  /* Grupos únicos preservando orden de aparición. */
  const grupos = [];
  for (const it of filtered) if (!grupos.includes(it.grupo)) grupos.push(it.grupo);

  return (
    <div
      className="fixed inset-0 z-[9000] bg-black/60 backdrop-blur-sm flex items-start justify-center px-4"
      style={{ paddingTop: 'max(env(safe-area-inset-top), 10vh)' }}
      onClick={e => { if (e.currentTarget === e.target) setOpen(false); }}
      role="dialog"
      aria-modal="true"
      aria-label="Buscar en el panel"
    >
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden animate-fade-in">

        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800">
          <Search size={17} className="shrink-0 text-slate-500" />
          <input
            ref={inputRef}
            type="text"
            placeholder="¿A dónde vamos? Escribe para buscar…"
            value={q}
            onChange={e => { setQ(e.target.value); setSel(0); }}
            autoComplete="off"
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
            aria-label="Buscar vista del panel"
          />
          <kbd className="hidden sm:inline text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-500">Esc</kbd>
        </div>

        {/* Resultados */}
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">
              Nada con ese nombre. Prueba con otra palabra.
            </p>
          ) : (
            grupos.map(g => (
              <div key={g}>
                <p className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-600">{g}</p>
                {filtered.filter(i => i.grupo === g).map(i => {
                  const idx = filtered.indexOf(i);
                  const activo = idx === sel;
                  const Icon = i.Icon;
                  return (
                    <button
                      key={`${g}-${i.goto}`}
                      type="button"
                      data-sel={activo ? '1' : undefined}
                      onMouseEnter={() => setSel(idx)}
                      onClick={() => ejecutar(i)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                        activo ? 'bg-white/10 text-slate-50' : 'text-slate-300'
                      }`}
                    >
                      {Icon && <Icon size={15} className="shrink-0 text-slate-400" />}
                      <span className="flex-1 truncate">{i.titulo}</span>
                      {i.external && <ExternalLink size={12} className="shrink-0 text-slate-500" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-4 py-2 border-t border-slate-800 text-[10px] text-slate-500">
          <span><kbd className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700">↑</kbd> <kbd className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700">↓</kbd> navegar</span>
          <span><kbd className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700">↵</kbd> abrir</span>
        </div>

      </div>
    </div>
  );
}
