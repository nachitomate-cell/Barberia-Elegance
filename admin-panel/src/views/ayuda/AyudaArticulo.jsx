import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getDocs, query, where, limit as fbLimit, orderBy } from 'firebase/firestore';
import { ayudaCategoriasCol, ayudaArticulosCol } from './ayudaData';
import { withTimeout } from '../../lib/firestore-helpers';
import { renderAyudaMd } from './ayudaMarkdown';
import AyudaCmdK from './AyudaCmdK';
import '../../styles/ayuda.css';

/* Vista de artículo — replica el mockup:
 *   nav sticky · breadcrumb · h1 con serif inline · deck · byline ·
 *   columna 66ch + sidebar sticky con TOC (scroll-spy).
 * El contenido MD viene de Firestore y se renderiza con parser propio.
 */
export default function AyudaArticulo() {
  const { categoriaSlug, articuloSlug } = useParams();
  const navigate = useNavigate();
  const [art, setArt] = useState(null);
  const [cat, setCat] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [articulosCategoria, setArticulosCategoria] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [tocActive, setTocActive] = useState(null);
  const bodyRef = useRef(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [catSnap, artSnap] = await Promise.all([
          withTimeout(getDocs(query(ayudaCategoriasCol(), orderBy('orden'))), 12000, 'ayuda/art-cats'),
          withTimeout(getDocs(query(ayudaArticulosCol(), where('slug', '==', articuloSlug), fbLimit(1))), 12000, 'ayuda/art-slug'),
        ]);
        const cats = catSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setCategorias(cats);
        setCat(cats.find(c => c.slug === categoriaSlug) || null);

        if (!artSnap.empty) {
          const a = { id: artSnap.docs[0].id, ...artSnap.docs[0].data() };
          setArt(a);

          // Otros artículos de la misma categoría para el buscador
          const sameCat = await withTimeout(
            getDocs(query(
              ayudaArticulosCol(),
              where('publicado', '==', true),
              where('categoriaSlug', '==', categoriaSlug),
              fbLimit(30),
            )),
            12000, 'ayuda/art-sameCat',
          );
          setArticulosCategoria(sameCat.docs.map(d => ({ id: d.id, ...d.data() })));
        } else {
          setArt(null);
        }
      } catch (e) {
        console.warn('[ayuda] load articulo:', e.message);
      }
      setLoading(false);
    })();
  }, [categoriaSlug, articuloSlug]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const { body, toc } = useMemo(() => {
    if (!art) return { body: null, toc: [] };
    return renderAyudaMd(art.contenidoMd || '');
  }, [art]);

  /* Scroll-spy — activa la sección visible del TOC */
  useEffect(() => {
    if (!toc.length || !bodyRef.current) return;
    const targets = toc
      .map(t => document.getElementById(t.id))
      .filter(Boolean);
    if (!targets.length) return;
    const io = new IntersectionObserver(entries => {
      const first = entries.find(e => e.isIntersecting);
      if (first) setTocActive(first.target.id);
    }, { rootMargin: '-30% 0px -60% 0px' });
    targets.forEach(t => io.observe(t));
    setTocActive(toc[0]?.id);
    return () => io.disconnect();
  }, [toc]);

  const iniciales = (nombre = 'S') => {
    const parts = String(nombre).trim().split(/\s+/);
    return (parts[0]?.[0] || 'S').toUpperCase();
  };

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
          <button
            className="ay-btn ay-btn-close"
            onClick={() => window.history.length > 2 ? navigate(-1) : navigate('/agenda')}
            title="Cerrar ayuda y volver al panel"
            aria-label="Cerrar ayuda y volver al panel"
          >
            <span aria-hidden="true" style={{ fontSize: 18, lineHeight: 1 }}>×</span>
            <span>Volver al panel</span>
          </button>
        </div>
      </nav>

      {loading ? (
        <div style={{ padding: 64, textAlign: 'center', color: 'var(--ay-text-mute)' }}>Cargando…</div>
      ) : !art ? (
        <div className="ay-article">
          <div className="ay-article-header">
            <nav className="ay-breadcrumb">
              <Link to="/ayuda">Ayuda</Link>
              <span className="ay-breadcrumb-sep">/</span>
              <span>No encontrado</span>
            </nav>
            <h1 className="ay-article-h1">Guía no <span className="serif">encontrada</span>.</h1>
            <p className="ay-article-deck">
              Puede que se haya movido o que aún no esté publicada. Prueba buscar con ⌘K o vuelve al inicio.
            </p>
            <div style={{ marginTop: 32 }}>
              <Link to="/ayuda" className="ay-btn ay-btn-dark">Volver al inicio →</Link>
            </div>
          </div>
        </div>
      ) : (
        <article className="ay-article">
          <header className="ay-article-header">
            <nav className="ay-breadcrumb">
              <Link to="/ayuda">Ayuda</Link>
              <span className="ay-breadcrumb-sep">/</span>
              {cat && <Link to={`/ayuda/${cat.slug}`}>{cat.nombre}</Link>}
              <span className="ay-breadcrumb-sep">/</span>
              <span>{art.titulo}</span>
            </nav>
            <h1 className="ay-article-h1">{renderTituloConSerif(art.titulo)}</h1>
            {art.deck && <p className="ay-article-deck">{art.deck}</p>}
            <div className="ay-article-byline">
              <span className="ay-avatar">{iniciales(art.autor?.nombre)}</span>
              <span>
                <strong style={{ color: 'var(--ay-text)' }}>{art.autor?.nombre || 'Equipo SynapTech'}</strong>
                {art.autor?.rol && ` · ${art.autor.rol}`}
              </span>
              <span style={{ color: 'var(--ay-text-faint)' }}>·</span>
              <span>Actualizado {fechaRel(art.updatedAt || art.entregadoEn)}</span>
              <span style={{ color: 'var(--ay-text-faint)' }}>·</span>
              <span>{art.tiempoLectura || 5} min de lectura</span>
            </div>
          </header>

          <div className="ay-article-body-wrap">
            <div className="ay-article-body" ref={bodyRef}>
              {body}
            </div>
            {toc.length > 0 && (
              <aside className="ay-article-side">
                <div className="ay-toc-label">En esta página</div>
                <nav>
                  <ul className="ay-toc-list">
                    {toc.map(t => (
                      <li key={t.id}>
                        <a
                          href={`#${t.id}`}
                          className={tocActive === t.id ? 'active' : ''}
                          onClick={e => {
                            e.preventDefault();
                            document.getElementById(t.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }}
                        >{t.texto}</a>
                      </li>
                    ))}
                  </ul>
                </nav>
              </aside>
            )}
          </div>

          <div className="ay-feedback">
            <p className="ay-feedback-q">¿Te sirvió este artículo?</p>
            <div className="ay-feedback-btns">
              <button className="ay-btn ay-btn-ghost">Sí, gracias</button>
              <button className="ay-btn ay-btn-ghost">Necesito más contexto</button>
              <a
                href="https://wa.me/56983568212?text=Hola,%20tengo%20una%20duda%20sobre%20una%20gu%C3%ADa%20del%20Centro%20de%20Ayuda"
                target="_blank" rel="noopener noreferrer"
                className="ay-btn ay-btn-dark"
              >Hablar con humano →</a>
            </div>
          </div>
        </article>
      )}

      <AyudaCmdK
        open={cmdkOpen}
        onOpen={() => setCmdkOpen(true)}
        onClose={() => setCmdkOpen(false)}
        categorias={categorias}
        articulos={articulosCategoria.map(a => ({ ...a, categoriaSlug }))}
      />
    </div>
  );
}

/* Detecta " — " en el título y aplica serif italic a la segunda parte,
 * imitando el device del mockup ("Cómo funciona el motor de packs"). */
function renderTituloConSerif(t) {
  const s = String(t || '');
  const sep = s.split(/\s—\s|\s-\s/);
  if (sep.length < 2) return s;
  return (
    <>
      {sep[0]}<br />
      <span className="serif">{sep.slice(1).join(' — ')}</span>
    </>
  );
}

function fechaRel(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const hoy = new Date();
  const diff = Math.floor((hoy - d) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'hoy';
  if (diff === 1) return 'ayer';
  if (diff < 7)   return `hace ${diff} días`;
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
}
