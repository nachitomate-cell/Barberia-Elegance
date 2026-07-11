import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDocs, orderBy, query, where, limit as fbLimit } from 'firebase/firestore';
import { ayudaCategoriasCol, ayudaArticulosCol, CATEGORIA_ICONOS } from './ayudaData';
import { CatIcon } from './AyudaIcons';
import AyudaCmdK from './AyudaCmdK';
import { useAuth } from '../../contexts/AuthContext';
import '../../styles/ayuda.css';

const SUPERADMIN_EMAILS = new Set(['ignaciiio.mate@gmail.com']);

/* ═══════════════════════════════════════════════════════════════
 *  AyudaHome — réplica del mockup HTML, con data real de Firestore
 *  ─────────────────────────────────────────────────────────────
 *  Lee _ayuda/categorias (ordenadas por `orden`) y las últimas 3
 *  entregas del `changelog` (o articulos con `destacado: true`).
 *  Muestra empty state elegante si aún no hay contenido.
 * ═══════════════════════════════════════════════════════════════ */
export default function AyudaHome() {
  const [categorias, setCategorias] = useState([]);
  const [destacados, setDestacados] = useState([]);
  const [articulos,  setArticulos]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [cmdkOpen,   setCmdkOpen]   = useState(false);
  const [scrolled,   setScrolled]   = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const esSuperadmin = !!user && SUPERADMIN_EMAILS.has((user.email || '').toLowerCase());

  useEffect(() => {
    (async () => {
      try {
        const [catSnap, artSnap] = await Promise.all([
          getDocs(query(ayudaCategoriasCol(), orderBy('orden'))),
          getDocs(query(ayudaArticulosCol(), where('publicado', '==', true), orderBy('entregadoEn', 'desc'), fbLimit(50))),
        ]);
        const cats = catSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const arts = artSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Contar artículos por categoría
        const conteos = {};
        for (const a of arts) {
          const k = a.categoriaSlug || a.categoriaId;
          conteos[k] = (conteos[k] || 0) + 1;
        }
        setCategorias(cats.map(c => ({ ...c, totalArticulos: conteos[c.slug] || conteos[c.id] || 0 })));
        setArticulos(arts);
        setDestacados(arts.filter(a => a.destacado).slice(0, 3));
      } catch (e) {
        console.warn('[ayuda] load home:', e.message);
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const chips = useMemo(() => (
    ['Primeros pasos', 'Mercado Pago', 'Packs y cuponeras', 'Recuperar clientes', 'Anuncios push', 'Multi-sede']
  ), []);

  return (
    <div className="ayuda-root">
      {/* ── NAV interno ─────────────────────────────────────────── */}
      <nav className={`ayuda-nav ${scrolled ? 'scrolled' : ''}`}>
        <a href="/gestion-interna/ayuda" className="ayuda-brand" onClick={e => { e.preventDefault(); navigate('/ayuda'); }}>
          <span>SynapTech</span>
          <span className="ayuda-brand-slash">/</span>
          <span className="ayuda-brand-tag">Ayuda</span>
        </a>
        <div className="ayuda-nav-actions">
          {esSuperadmin && (
            <a href="/gestion-interna/ayuda/admin"
               onClick={e => { e.preventDefault(); navigate('/ayuda/admin'); }}
               className="ay-btn ay-btn-ghost"
               title="Solo visible para el equipo SynapTech">
              Editar guías
            </a>
          )}
          <a
            href="https://wa.me/56983568212?text=Hola,%20necesito%20ayuda%20con%20SynapTech"
            target="_blank" rel="noopener noreferrer"
            className="ay-btn ay-btn-ghost"
          >Contactar soporte</a>
          <a href="/gestion-interna/agenda"
             onClick={e => { e.preventDefault(); navigate('/agenda'); }}
             className="ay-btn ay-btn-dark">Ir al panel</a>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────── */}
      <section className="ay-hero">
        <h1>
          El puente entre la <span className="serif">IA</span><br />
          y tu <span className="serif">agenda</span>.
        </h1>
        <div className="ay-hero-right">
          <p className="ay-hero-copy">
            Cada feature que necesitas, la construimos. Sin costo adicional, sin planes premium,
            sin límites artificiales. SynapTech se adapta a cómo trabajas — no al revés.
          </p>
          <div className="ay-hero-cta">
            <a href="#pedidos"
               className="ay-btn ay-btn-dark"
               onClick={e => { e.preventDefault(); document.getElementById('pedidos')?.scrollIntoView({ behavior: 'smooth' }); }}>
              Pedir una feature →
            </a>
            <button className="ay-btn ay-btn-ghost" onClick={() => setCmdkOpen(true)}>
              Ver últimas mejoras
            </button>
          </div>
        </div>
      </section>

      {/* ── Buscador ────────────────────────────────────────────── */}
      <div className="ay-search-band">
        <button className="ay-search" onClick={() => setCmdkOpen(true)} aria-label="Buscar en el Centro de Ayuda">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
          </svg>
          <span className="ay-search-fake">Busca "activar packs", "cobrar por MP", "no-show"…</span>
          <span className="ay-kbd">⌘ K</span>
        </button>
        <div className="ay-chips">
          {chips.map(c => (
            <button key={c} className="ay-chip" onClick={() => setCmdkOpen(true)}>{c}</button>
          ))}
        </div>
      </div>

      {/* ── Categorías ──────────────────────────────────────────── */}
      <section className="ay-section">
        <header className="ay-section-head">
          <div>
            <h2 className="ay-section-title">Explora por <span className="serif">tema</span>.</h2>
            <p className="ay-section-sub">Ocho territorios que cubren el 99% de las preguntas que llegan al soporte.</p>
          </div>
        </header>

        {loading ? (
          <CatSkeleton />
        ) : categorias.length === 0 ? (
          <EmptyState msg="Aún no hay categorías publicadas. Ve al editor para crearlas." />
        ) : (
          <div className="ay-cat-grid">
            {categorias.map(c => (
              <button key={c.id} className="ay-cat" onClick={() => navigate(`/ayuda/${c.slug}`)}>
                <span className="ay-cat-icon">
                  <CatIcon name={c.icono || CATEGORIA_ICONOS[c.slug] || 'globe'} />
                </span>
                <h3 className="ay-cat-name">{c.nombre}</h3>
                <p className="ay-cat-desc">{c.descripcion}</p>
                <div className="ay-cat-meta">
                  <span>{c.totalArticulos} guía{c.totalArticulos !== 1 ? 's' : ''}</span>
                  <span className="ay-cat-arrow">↗</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ── Destacados / pedidos por clientes ───────────────────── */}
      <section className="ay-section" id="pedidos">
        <header className="ay-section-head">
          <div>
            <h2 className="ay-section-title">Últimas features <span className="serif">pedidas por ti</span>.</h2>
            <p className="ay-section-sub">Cada mejora acá nació de una conversación con un cliente. Sin roadmap corporativo, sin cargos extra.</p>
          </div>
          <button className="ay-section-link" onClick={() => setCmdkOpen(true)}>Ver changelog completo →</button>
        </header>

        {loading ? (
          <FeaturedSkeleton />
        ) : destacados.length === 0 ? (
          <EmptyState msg="Aún no hay features destacadas. Marca artículos como destacado desde el editor." />
        ) : (
          <div className="ay-featured">
            {destacados.map(a => {
              const cat = categorias.find(c => c.slug === a.categoriaSlug || c.id === a.categoriaId);
              return (
                <article key={a.id} className="ay-art-card" onClick={() => navigate(`/ayuda/${cat?.slug || 'general'}/${a.slug}`)}>
                  <h3 className="ay-art-title">{a.titulo}</h3>
                  <p className="ay-art-copy">{a.deck}</p>
                  <div className="ay-art-meta">
                    <span className="ay-art-meta-key">Pedido por</span>
                    <span className="ay-art-meta-val">{a.pedidoPor?.etiqueta || '—'}</span>
                    <span className="ay-art-meta-key">Entregado</span>
                    <span className="ay-art-meta-val">{fechaCorta(a.entregadoEn)}</span>
                  </div>
                  <span className="ay-btn ay-btn-dark ay-art-cta">Leer guía →</span>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Request band ────────────────────────────────────────── */}
      <section className="ay-section ay-request-band">
        <div className="ay-request-inner">
          <div>
            <h2 className="ay-section-title" style={{ marginBottom: 12 }}>
              ¿Tu negocio necesita algo <span className="serif">distinto</span>?
            </h2>
            <p className="ay-section-sub" style={{ maxWidth: '46ch' }}>
              Escríbenos por WhatsApp con lo que necesitas y te decimos si lo podemos construir esta semana.
              La mayoría de features nuevas nacen así — un mensaje, una conversación, código nuevo el jueves.
            </p>
          </div>
          <div className="ay-request-cta">
            <a
              href="https://wa.me/56983568212?text=Hola,%20quiero%20pedir%20una%20feature%20para%20mi%20agenda%20SynapTech"
              target="_blank" rel="noopener noreferrer"
              className="ay-btn ay-btn-dark"
            >Escribir por WhatsApp →</a>
            <span className="ay-request-note">Respondemos en menos de 4 h en horario laboral.</span>
          </div>
        </div>
      </section>

      <AyudaCmdK
        open={cmdkOpen}
        onOpen={() => setCmdkOpen(true)}
        onClose={() => setCmdkOpen(false)}
        categorias={categorias}
        articulos={articulos.map(a => ({
          ...a,
          categoriaSlug: a.categoriaSlug ||
            (categorias.find(c => c.id === a.categoriaId)?.slug ?? 'general'),
        }))}
      />
    </div>
  );
}

/* ── Helpers ────────────────────────────────────────────────────── */
function fechaCorta(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const hoy = new Date();
  const misma = d.getFullYear() === hoy.getFullYear() && d.getMonth() === hoy.getMonth() && d.getDate() === hoy.getDate();
  if (misma) return 'Hoy';
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
}

function CatSkeleton() {
  return (
    <div className="ay-cat-grid">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="ay-cat" style={{ opacity: 0.5, pointerEvents: 'none' }}>
          <div style={{ width: 24, height: 24, background: 'var(--ay-hair)', borderRadius: 6 }} />
          <div style={{ width: '60%', height: 20, background: 'var(--ay-hair)', borderRadius: 4 }} />
          <div style={{ width: '90%', height: 12, background: 'var(--ay-hair)', borderRadius: 4 }} />
          <div style={{ width: '40%', height: 12, background: 'var(--ay-hair)', borderRadius: 4, marginTop: 'auto' }} />
        </div>
      ))}
    </div>
  );
}

function FeaturedSkeleton() {
  return (
    <div className="ay-featured">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="ay-art-card" style={{ opacity: 0.5, pointerEvents: 'none' }}>
          <div style={{ width: '75%', height: 24, background: 'var(--ay-hair)', borderRadius: 4, marginBottom: 12 }} />
          <div style={{ width: '100%', height: 14, background: 'var(--ay-hair)', borderRadius: 4, marginBottom: 8 }} />
          <div style={{ width: '85%', height: 14, background: 'var(--ay-hair)', borderRadius: 4 }} />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ msg }) {
  return (
    <div style={{
      padding: '48px 24px', textAlign: 'center',
      background: 'var(--ay-bg-card)', borderRadius: 'var(--ay-r-md)',
      color: 'var(--ay-text-mute)', fontSize: 15,
    }}>{msg}</div>
  );
}
