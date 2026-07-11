import { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

/* ═══════════════════════════════════════════════════════════════
 *  AyudaCmdK — buscador ⌘K (portal global del módulo Ayuda)
 *  ─────────────────────────────────────────────────────────────
 *  Recibe:
 *    open       — controlado desde afuera (booleano)
 *    onClose    — cerrar
 *    categorias — [{ id, nombre, slug, totalArticulos }]
 *    articulos  — [{ id, titulo, slug, categoriaSlug, tiempoLectura }]
 *
 *  Al montar registra ⌘K/Ctrl+K global; el padre solo tiene que
 *  renderizarlo una vez al final del árbol.
 * ═══════════════════════════════════════════════════════════════ */
export default function AyudaCmdK({ open, onOpen, onClose, categorias = [], articulos = [] }) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  /* Índice combinado — el mismo formato que el mockup */
  const index = useMemo(() => {
    const items = [];
    for (const a of articulos) {
      const cat = categorias.find(c => c.slug === a.categoriaSlug || c.id === a.categoriaId);
      items.push({
        grupo: 'Guías',
        titulo: a.titulo,
        hint:   `${cat?.nombre || 'Guía'} · ${a.tiempoLectura || 5} min`,
        goto:   `/ayuda/${a.categoriaSlug || 'general'}/${a.slug}`,
      });
    }
    for (const c of categorias) {
      items.push({
        grupo: 'Categorías',
        titulo: c.nombre,
        hint:   `${c.totalArticulos || 0} guías`,
        goto:   `/ayuda/${c.slug}`,
      });
    }
    items.push(
      { grupo: 'Acciones rápidas', titulo: 'Ir a la agenda', hint: '/gestion-interna/agenda', goto: '/agenda' },
      { grupo: 'Acciones rápidas', titulo: 'Hablar con soporte', hint: 'WhatsApp',
        goto:  'https://wa.me/56983568212?text=Hola,%20necesito%20ayuda%20con%20SynapTech', external: true },
    );
    return items;
  }, [categorias, articulos]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return index;
    return index.filter(i =>
      i.titulo.toLowerCase().includes(s) ||
      i.grupo.toLowerCase().includes(s) ||
      i.hint.toLowerCase().includes(s)
    );
  }, [index, q]);

  /* Reset al abrir */
  useEffect(() => {
    if (open) {
      setQ(''); setSel(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  /* Bindings globales ⌘K / Ctrl+K */
  useEffect(() => {
    const onKey = (e) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === 'k') { e.preventDefault(); onOpen(); return; }
      if (!open) return;
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSel(v => Math.min(v + 1, filtered.length - 1)); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSel(v => Math.max(v - 1, 0)); return; }
      if (e.key === 'Enter') {
        e.preventDefault();
        const it = filtered[sel];
        if (!it) return;
        if (it.external) window.open(it.goto, '_blank', 'noopener');
        else navigate(it.goto);
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, filtered, sel, onOpen, onClose, navigate]);

  if (!open) return null;

  /* Grupos únicos preservando orden */
  const grupos = [];
  for (const it of filtered) if (!grupos.includes(it.grupo)) grupos.push(it.grupo);

  return (
    <div className="ay-cmdk-scrim open" onClick={e => { if (e.currentTarget === e.target) onClose(); }}
         role="dialog" aria-modal="true" aria-label="Buscar en el Centro de Ayuda">
      <div className="ay-cmdk">
        <div className="ay-cmdk-input-wrap">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--ay-text-mute)' }}>
            <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
          </svg>
          <input
            ref={inputRef}
            className="ay-cmdk-input"
            type="text"
            placeholder="Buscar guías, categorías, acciones…"
            value={q}
            onChange={e => { setQ(e.target.value); setSel(0); }}
            autoComplete="off"
          />
        </div>
        <div className="ay-cmdk-results">
          {filtered.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--ay-text-faint)', fontSize: 14 }}>
              Sin resultados. Prueba con otras palabras.
            </div>
          ) : (
            grupos.map(g => (
              <div key={g}>
                <div className="ay-cmdk-group-label">{g}</div>
                {filtered.filter(i => i.grupo === g).map(i => {
                  const idx = filtered.indexOf(i);
                  return (
                    <div
                      key={idx}
                      className={`ay-cmdk-item ${idx === sel ? 'selected' : ''}`}
                      onMouseEnter={() => setSel(idx)}
                      onClick={() => {
                        if (i.external) window.open(i.goto, '_blank', 'noopener');
                        else navigate(i.goto);
                        onClose();
                      }}
                    >
                      <div className="ay-cmdk-item-icon">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z"/>
                        </svg>
                      </div>
                      <div className="ay-cmdk-item-content">
                        <div className="ay-cmdk-item-title">{i.titulo}</div>
                        <div className="ay-cmdk-item-hint">{i.hint}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
        <div className="ay-cmdk-footer">
          <span><span className="ay-kbd">↑</span> <span className="ay-kbd">↓</span> navegar</span>
          <span><span className="ay-kbd">↵</span> abrir</span>
          <span className="split" style={{ flex: 1 }}></span>
          <span><span className="ay-kbd">Esc</span> cerrar</span>
        </div>
      </div>
    </div>
  );
}
