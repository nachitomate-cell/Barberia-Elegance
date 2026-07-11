import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getDocs, query, where, orderBy, limit as fbLimit } from 'firebase/firestore';
import { ayudaCategoriasCol, ayudaArticulosCol, CATEGORIA_ICONOS } from './ayudaData';
import { CatIcon } from './AyudaIcons';
import AyudaCmdK from './AyudaCmdK';
import '../../styles/ayuda.css';

/* Listado de guías dentro de una categoría. Layout minimal:
 * hero corto con nombre + descripción de la categoría, seguido
 * de una lista limpia de artículos (title + deck + tiempo). */
export default function AyudaCategoria() {
  const { categoriaSlug } = useParams();
  const navigate = useNavigate();
  const [cat, setCat] = useState(null);
  const [articulos, setArticulos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const catSnap = await getDocs(query(ayudaCategoriasCol(), orderBy('orden')));
        const cats = catSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setCategorias(cats);
        const found = cats.find(c => c.slug === categoriaSlug);
        setCat(found || null);

        if (found) {
          const artSnap = await getDocs(query(
            ayudaArticulosCol(),
            where('publicado', '==', true),
            where('categoriaSlug', '==', categoriaSlug),
            orderBy('orden'),
            fbLimit(60),
          ));
          setArticulos(artSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        }
      } catch (e) {
        console.warn('[ayuda] load categoria:', e.message);
      }
      setLoading(false);
    })();
  }, [categoriaSlug]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="ayuda-root">
      <nav className={`ayuda-nav ${scrolled ? 'scrolled' : ''}`}>
        <a href="/gestion-interna/ayuda" className="ayuda-brand" onClick={e => { e.preventDefault(); navigate('/ayuda'); }}>
          <span>SynapTech</span>
          <span className="ayuda-brand-slash">/</span>
          <span className="ayuda-brand-tag">Ayuda</span>
        </a>
        <div className="ayuda-nav-actions">
          <button className="ay-btn ay-btn-ghost" onClick={() => setCmdkOpen(true)}>Buscar ⌘ K</button>
          <a
            href="https://wa.me/56983568212?text=Hola,%20necesito%20ayuda%20con%20SynapTech"
            target="_blank" rel="noopener noreferrer"
            className="ay-btn ay-btn-dark"
          >Contactar soporte</a>
        </div>
      </nav>

      <section className="ay-hero" style={{ paddingBottom: 0, alignItems: 'start' }}>
        <div>
          <nav className="ay-breadcrumb" style={{ marginBottom: 24 }}>
            <Link to="/ayuda">Ayuda</Link>
            <span className="ay-breadcrumb-sep">/</span>
            <span>{cat?.nombre || (loading ? '…' : 'No encontrado')}</span>
          </nav>
          <h1 style={{ fontSize: 'clamp(40px, 6vw, 72px)' }}>
            {cat?.nombre || 'Categoría'}.
          </h1>
        </div>
        <div className="ay-hero-right">
          <p className="ay-hero-copy">
            {cat?.descripcion || 'Guías reales sobre este tema.'}
          </p>
          {!!articulos.length && (
            <p style={{ fontSize: 13, color: 'var(--ay-text-faint)', margin: 0 }}>
              {articulos.length} guía{articulos.length !== 1 ? 's' : ''} publicada{articulos.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </section>

      <section className="ay-section">
        {loading ? (
          <ArticuloListSkeleton />
        ) : !cat ? (
          <EmptyBox msg="Esta categoría no existe todavía." link={{ to: '/ayuda', label: 'Volver al inicio' }} />
        ) : articulos.length === 0 ? (
          <EmptyBox msg="Aún no hay guías publicadas en esta categoría." link={{ to: '/ayuda', label: 'Ver otras categorías' }} />
        ) : (
          <div className="ay-articulo-list">
            {articulos.map(a => (
              <Link
                key={a.id}
                to={`/ayuda/${categoriaSlug}/${a.slug}`}
                className="ay-articulo-row"
              >
                <div className="ay-articulo-row-icon">
                  <CatIcon name={cat.icono || CATEGORIA_ICONOS[cat.slug] || 'globe'} size={20} />
                </div>
                <div className="ay-articulo-row-body">
                  <h3 className="ay-articulo-row-title">{a.titulo}</h3>
                  <p className="ay-articulo-row-deck">{a.deck}</p>
                </div>
                <div className="ay-articulo-row-meta">
                  <span className="ay-articulo-row-time">{a.tiempoLectura || 5} min</span>
                  <span className="ay-articulo-row-arrow">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <style>{`
        .ay-articulo-list {
          display: flex; flex-direction: column;
          border: 1px solid var(--ay-line);
          border-radius: var(--ay-r-md);
          overflow: hidden; background: var(--ay-bg-card);
        }
        .ay-articulo-row {
          display: grid; grid-template-columns: auto 1fr auto;
          gap: 20px; align-items: center;
          padding: 22px 24px;
          border-bottom: 1px solid var(--ay-line);
          transition: background-color .15s ease;
        }
        .ay-articulo-row:last-child { border-bottom: none; }
        .ay-articulo-row:hover { background: var(--ay-cream-3); }
        .ayuda-root[data-ay-theme="dark"] .ay-articulo-row:hover { background: #2A2621; }
        .ay-articulo-row-icon {
          width: 36px; height: 36px; border-radius: 8px;
          background: var(--ay-bg-input);
          display: grid; place-items: center;
          color: var(--ay-text); flex-shrink: 0;
        }
        .ay-articulo-row-title {
          font-family: var(--ay-font-display); font-weight: 700;
          font-size: 17px; letter-spacing: -0.02em; line-height: 1.2;
          color: var(--ay-text); margin: 0 0 4px;
        }
        .ay-articulo-row-deck {
          font-size: 13.5px; color: var(--ay-text-mute); margin: 0;
          line-height: 1.45;
        }
        .ay-articulo-row-meta {
          display: flex; align-items: center; gap: 14px;
          font-size: 12.5px; color: var(--ay-text-faint);
          font-variant-numeric: tabular-nums;
        }
        .ay-articulo-row-arrow { font-size: 16px; color: var(--ay-text); }
      `}</style>

      <AyudaCmdK
        open={cmdkOpen}
        onOpen={() => setCmdkOpen(true)}
        onClose={() => setCmdkOpen(false)}
        categorias={categorias}
        articulos={articulos.map(a => ({ ...a, categoriaSlug }))}
      />
    </div>
  );
}

function ArticuloListSkeleton() {
  return (
    <div style={{ background: 'var(--ay-bg-card)', borderRadius: 'var(--ay-r-md)', border: '1px solid var(--ay-line)' }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{ padding: 24, borderBottom: '1px solid var(--ay-line)', opacity: 0.5 }}>
          <div style={{ height: 18, background: 'var(--ay-hair)', borderRadius: 4, width: '55%', marginBottom: 8 }} />
          <div style={{ height: 12, background: 'var(--ay-hair)', borderRadius: 4, width: '85%' }} />
        </div>
      ))}
    </div>
  );
}

function EmptyBox({ msg, link }) {
  return (
    <div style={{
      padding: '64px 24px', textAlign: 'center',
      background: 'var(--ay-bg-card)', borderRadius: 'var(--ay-r-md)',
      color: 'var(--ay-text-mute)',
    }}>
      <p style={{ fontSize: 16, margin: '0 0 16px' }}>{msg}</p>
      {link && (
        <Link to={link.to} className="ay-btn ay-btn-ghost" style={{ display: 'inline-flex' }}>
          {link.label}
        </Link>
      )}
    </div>
  );
}
