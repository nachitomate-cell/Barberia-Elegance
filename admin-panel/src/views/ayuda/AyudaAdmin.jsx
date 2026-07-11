/* ═══════════════════════════════════════════════════════════════
 *  AyudaAdmin — editor superadmin del Centro de Ayuda
 *  ─────────────────────────────────────────────────────────────
 *  Rutas internas (bajo /ayuda/admin):
 *    /                → Listado de todos los artículos + botón "Nueva"
 *    /nuevo           → Editor en modo creación
 *    /:artId          → Editor en modo edición
 *
 *  Solo bootstrap (superadmin SynapTech) puede acceder. Cualquier
 *  otro usuario ve un mensaje discreto.
 *
 *  El editor tiene split-screen:
 *    · Formulario + textarea Markdown izquierda
 *    · Preview en vivo derecha (usa el mismo parser que Ayuda)
 *    · Botones para insertar :::callout / :::mechanism / código
 * ═══════════════════════════════════════════════════════════════ */

import { useState, useEffect, useMemo, useRef } from 'react';
import { Routes, Route, useNavigate, useParams, Link } from 'react-router-dom';
import {
  getDocs, getDoc, setDoc, deleteDoc, query, orderBy,
  serverTimestamp, Timestamp,
} from 'firebase/firestore';
import {
  Plus, Save, Trash2, ArrowLeft, Eye, EyeOff, Star, ExternalLink,
  MessageSquare, Layers, Code, Loader2, ShieldOff,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  ayudaCategoriasCol, ayudaArticulosCol, ayudaArticuloDoc,
} from './ayudaData';
import { renderAyudaMd, slugify } from './ayudaMarkdown';
import '../../styles/ayuda.css';

const SUPERADMIN_EMAILS = new Set(['ignaciiio.mate@gmail.com']);

function esSuperadmin(user) {
  return !!user && SUPERADMIN_EMAILS.has((user.email || '').toLowerCase());
}

// ═══════════════════════════════════════════════════════════════
export default function AyudaAdmin() {
  const { user } = useAuth();

  if (!esSuperadmin(user)) {
    return (
      <div className="ayuda-root">
        <div style={{
          minHeight: '60vh', display: 'grid', placeItems: 'center',
          padding: 40, textAlign: 'center',
        }}>
          <div style={{ maxWidth: 380 }}>
            <ShieldOff size={28} style={{ color: 'var(--ay-text-mute)', margin: '0 auto 16px' }} />
            <h2 style={{
              fontFamily: 'var(--ay-font-display)', fontWeight: 700, fontSize: 24,
              letterSpacing: '-0.025em', color: 'var(--ay-text)', margin: '0 0 8px',
            }}>Solo para el equipo SynapTech</h2>
            <p style={{ color: 'var(--ay-text-mute)', fontSize: 14.5, margin: '0 0 20px' }}>
              El editor del Centro de Ayuda es interno. Si necesitas cambios en una guía,
              escríbenos por WhatsApp.
            </p>
            <Link to="/ayuda" className="ay-btn ay-btn-ghost">Volver al inicio</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route index          element={<AdminList />} />
      <Route path="nuevo"   element={<AdminEditor mode="new" />} />
      <Route path=":artId"  element={<AdminEditor mode="edit" />} />
    </Routes>
  );
}

// ═══════════════════════════════════════════════════════════════
//  LIST — todos los artículos con filtros básicos
// ═══════════════════════════════════════════════════════════════
function AdminList() {
  const [articulos, setArticulos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState(''); // texto o slug de categoría
  const navigate = useNavigate();

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    try {
      const [artSnap, catSnap] = await Promise.all([
        getDocs(query(ayudaArticulosCol(), orderBy('updatedAt', 'desc'))),
        getDocs(query(ayudaCategoriasCol(), orderBy('orden'))),
      ]);
      setArticulos(artSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setCategorias(catSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error('[ayuda-admin] cargar:', e);
    }
    setLoading(false);
  }

  const filtrados = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return articulos;
    return articulos.filter(a =>
      (a.titulo || '').toLowerCase().includes(q) ||
      (a.slug || '').toLowerCase().includes(q) ||
      (a.categoriaSlug || '').toLowerCase().includes(q)
    );
  }, [articulos, filtro]);

  return (
    <div className="ayuda-root">
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px clamp(20px, 4vw, 40px)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <Link to="/ayuda" className="ay-breadcrumb" style={{ marginBottom: 12, display: 'inline-flex' }}>
              <ArrowLeft size={14} style={{ marginRight: 6 }} /> Volver al Centro de Ayuda
            </Link>
            <h1 style={{
              fontFamily: 'var(--ay-font-display)', fontWeight: 700, fontSize: 40,
              letterSpacing: '-0.035em', margin: 0, color: 'var(--ay-text)',
            }}>
              Editor · <span className="serif">todas las guías</span>
            </h1>
            <p style={{ color: 'var(--ay-text-mute)', fontSize: 14.5, margin: '6px 0 0' }}>
              Solo el equipo SynapTech puede crear y editar. Publicado = visible para todos.
            </p>
          </div>
          <button
            onClick={() => navigate('/ayuda/admin/nuevo')}
            className="ay-btn ay-btn-dark"
          >
            <Plus size={14} /> Nueva guía
          </button>
        </div>

        {/* Filtro */}
        <div style={{ marginBottom: 20 }}>
          <input
            type="text"
            value={filtro}
            onChange={e => setFiltro(e.target.value)}
            placeholder="Filtrar por título, slug o categoría…"
            className="ay-search-fake"
            style={{
              width: '100%', padding: '12px 16px',
              background: 'var(--ay-bg-input)', border: '1px solid var(--ay-line)',
              borderRadius: 'var(--ay-r-sm)', color: 'var(--ay-text)',
              fontSize: 14, outline: 'none', fontFamily: 'var(--ay-font-body)',
            }}
          />
        </div>

        {/* Tabla */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ay-text-mute)' }}>
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }} />
          </div>
        ) : filtrados.length === 0 ? (
          <EmptyList onNew={() => navigate('/ayuda/admin/nuevo')} />
        ) : (
          <div style={{
            background: 'var(--ay-bg-card)', border: '1px solid var(--ay-line)',
            borderRadius: 'var(--ay-r-md)', overflow: 'hidden',
          }}>
            {filtrados.map((a, i) => {
              const cat = categorias.find(c => c.slug === a.categoriaSlug || c.id === a.categoriaId);
              return (
                <button
                  key={a.id}
                  onClick={() => navigate(`/ayuda/admin/${a.id}`)}
                  style={{
                    width: '100%', display: 'grid',
                    gridTemplateColumns: '1fr auto auto auto auto',
                    gap: 16, alignItems: 'center',
                    padding: '16px 20px', textAlign: 'left', background: 'transparent',
                    border: 'none', cursor: 'pointer',
                    borderBottom: i === filtrados.length - 1 ? 'none' : '1px solid var(--ay-line)',
                    color: 'var(--ay-text)', fontFamily: 'var(--ay-font-body)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--ay-cream-3)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontFamily: 'var(--ay-font-display)', fontWeight: 700,
                      fontSize: 15, letterSpacing: '-0.015em', marginBottom: 3,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{a.titulo || '(sin título)'}</div>
                    <div style={{ fontSize: 12, color: 'var(--ay-text-faint)', fontFamily: 'var(--ay-font-mono)' }}>{a.slug || '—'}</div>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--ay-text-mute)', textAlign: 'right' }}>
                    {cat?.nombre || '—'}
                  </span>
                  <span title={a.publicado ? 'Publicado' : 'Borrador'}
                        style={{ color: a.publicado ? '#3F7A3F' : 'var(--ay-text-faint)' }}>
                    {a.publicado ? <Eye size={14} /> : <EyeOff size={14} />}
                  </span>
                  <span title={a.destacado ? 'Destacado' : 'Sin destacar'}
                        style={{ color: a.destacado ? '#B58500' : 'var(--ay-text-faint)' }}>
                    <Star size={14} fill={a.destacado ? '#B58500' : 'transparent'} />
                  </span>
                  <span style={{ fontSize: 11.5, color: 'var(--ay-text-faint)', fontVariantNumeric: 'tabular-nums', textAlign: 'right', minWidth: 90 }}>
                    {formatFecha(a.updatedAt)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyList({ onNew }) {
  return (
    <div style={{
      padding: '64px 24px', textAlign: 'center',
      background: 'var(--ay-bg-card)', borderRadius: 'var(--ay-r-md)',
    }}>
      <p style={{ fontSize: 16, color: 'var(--ay-text-mute)', margin: '0 0 20px' }}>
        Aún no hay guías. Crea la primera para arrancar.
      </p>
      <button onClick={onNew} className="ay-btn ay-btn-dark" style={{ display: 'inline-flex' }}>
        <Plus size={14} /> Nueva guía
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  EDITOR — formulario + textarea + preview en vivo
// ═══════════════════════════════════════════════════════════════
function AdminEditor({ mode }) {
  const { artId } = useParams();
  const navigate = useNavigate();
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const textareaRef = useRef(null);

  const [form, setForm] = useState({
    titulo: '',
    slug: '',
    deck: '',
    categoriaId: '',
    categoriaSlug: '',
    tiempoLectura: 5,
    publicado: false,
    destacado: false,
    autor: { nombre: 'Ignacio Mateluna', rol: 'Producto' },
    pedidoPor: { etiqueta: '', region: '' },
    tags: [],
    orden: 1,
    contenidoMd: '',
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const catSnap = await getDocs(query(ayudaCategoriasCol(), orderBy('orden')));
        const cs = catSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setCats(cs);

        if (mode === 'edit' && artId) {
          const artSnap = await getDoc(ayudaArticuloDoc(artId));
          if (artSnap.exists()) {
            const d = artSnap.data();
            setForm({
              titulo: d.titulo || '',
              slug: d.slug || artId,
              deck: d.deck || '',
              categoriaId: d.categoriaId || '',
              categoriaSlug: d.categoriaSlug || '',
              tiempoLectura: d.tiempoLectura || 5,
              publicado: !!d.publicado,
              destacado: !!d.destacado,
              autor: d.autor || { nombre: 'Ignacio Mateluna', rol: 'Producto' },
              pedidoPor: d.pedidoPor || { etiqueta: '', region: '' },
              tags: Array.isArray(d.tags) ? d.tags : [],
              orden: d.orden || 1,
              contenidoMd: d.contenidoMd || '',
              entregadoEn: d.entregadoEn || null,
            });
          } else {
            setMsg('Guía no encontrada');
          }
        }
      } catch (e) {
        console.error('[ayuda-editor] load:', e);
      }
      setLoading(false);
    })();
  }, [mode, artId]);

  // Auto-slug desde el título mientras no lo edite manualmente
  const [slugTouched, setSlugTouched] = useState(mode === 'edit');
  function onTituloChange(v) {
    setForm(f => ({
      ...f,
      titulo: v,
      slug: slugTouched ? f.slug : slugify(v),
    }));
  }

  function onCategoriaChange(catId) {
    const c = cats.find(x => x.id === catId);
    setForm(f => ({ ...f, categoriaId: catId, categoriaSlug: c?.slug || catId }));
  }

  function insertar(snippet) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart, end = ta.selectionEnd;
    const before = form.contenidoMd.slice(0, start);
    const after  = form.contenidoMd.slice(end);
    const next = before + snippet + after;
    setForm(f => ({ ...f, contenidoMd: next }));
    // Reposicionar cursor al final del snippet
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + snippet.length, start + snippet.length);
    }, 0);
  }

  async function guardar(publicar = null) {
    if (!form.titulo.trim()) { setMsg('Falta el título'); return; }
    if (!form.slug.trim())   { setMsg('Falta el slug'); return; }
    if (!form.categoriaId)   { setMsg('Elige una categoría'); return; }

    setSaving(true);
    setMsg('');
    try {
      const id = mode === 'edit' ? artId : form.slug;
      const publicado = publicar === null ? form.publicado : publicar;
      const payload = {
        ...form,
        publicado,
        tiempoLectura: Number(form.tiempoLectura) || 5,
        orden: Number(form.orden) || 1,
        entregadoEn: form.entregadoEn || Timestamp.fromDate(new Date()),
        updatedAt: serverTimestamp(),
      };
      if (mode === 'new') payload.createdAt = serverTimestamp();

      await setDoc(ayudaArticuloDoc(id), payload, { merge: true });
      setMsg('✓ Guardado');
      setTimeout(() => setMsg(''), 2500);

      if (mode === 'new') {
        navigate(`/ayuda/admin/${id}`, { replace: true });
      } else if (publicar !== null) {
        setForm(f => ({ ...f, publicado }));
      }
    } catch (e) {
      console.error(e);
      setMsg('Error al guardar: ' + e.message);
    }
    setSaving(false);
  }

  async function eliminar() {
    if (mode !== 'edit') return;
    if (!confirm(`¿Eliminar la guía "${form.titulo}"? Esta acción no se puede deshacer.`)) return;
    try {
      await deleteDoc(ayudaArticuloDoc(artId));
      navigate('/ayuda/admin');
    } catch (e) {
      setMsg('Error al eliminar: ' + e.message);
    }
  }

  // Preview en vivo
  const { body, toc } = useMemo(() => renderAyudaMd(form.contenidoMd || ''), [form.contenidoMd]);

  if (loading) {
    return (
      <div className="ayuda-root" style={{ padding: 40, textAlign: 'center' }}>
        <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: 'var(--ay-text-mute)' }} />
      </div>
    );
  }

  return (
    <div className="ayuda-root">
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px clamp(20px, 3vw, 32px)' }}>
        {/* Header con acciones */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 16, flexWrap: 'wrap', marginBottom: 20,
          paddingBottom: 20, borderBottom: '1px solid var(--ay-line)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
            <Link to="/ayuda/admin" className="ay-btn ay-btn-ghost" style={{ padding: '8px 14px' }}>
              <ArrowLeft size={14} />
            </Link>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontFamily: 'var(--ay-font-display)', fontWeight: 700, fontSize: 20,
                letterSpacing: '-0.02em', color: 'var(--ay-text)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {mode === 'new' ? 'Nueva guía' : (form.titulo || 'Sin título')}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ay-text-faint)', fontFamily: 'var(--ay-font-mono)' }}>
                {form.slug || '—'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {msg && <span style={{
              fontSize: 12.5, color: msg.startsWith('✓') ? '#3F7A3F' : '#B54040',
              marginRight: 8,
            }}>{msg}</span>}
            {mode === 'edit' && form.publicado && form.categoriaSlug && (
              <a
                href={`/gestion-interna/ayuda/${form.categoriaSlug}/${form.slug}`}
                target="_blank" rel="noopener noreferrer"
                className="ay-btn ay-btn-ghost"
              >
                <ExternalLink size={13} /> Ver publicada
              </a>
            )}
            {mode === 'edit' && (
              <button onClick={eliminar} className="ay-btn ay-btn-ghost"
                      style={{ color: '#B54040', borderColor: 'rgba(181,64,64,0.35)' }}>
                <Trash2 size={13} />
              </button>
            )}
            <button
              onClick={() => guardar(!form.publicado)}
              disabled={saving}
              className="ay-btn ay-btn-ghost"
              title={form.publicado ? 'Despublicar' : 'Publicar'}
            >
              {form.publicado ? <EyeOff size={13} /> : <Eye size={13} />}
              {form.publicado ? 'Despublicar' : 'Publicar'}
            </button>
            <button
              onClick={() => guardar()}
              disabled={saving}
              className="ay-btn ay-btn-dark"
            >
              {saving ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={13} />}
              Guardar
            </button>
          </div>
        </div>

        {/* Grid principal: formulario + preview */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 20 }} className="admin-editor-grid">
          {/* ── Formulario + editor ────────────────────────────── */}
          <div>
            <FieldRow>
              <FieldGroup label="Título">
                <TextInput value={form.titulo} onChange={onTituloChange} placeholder="Cómo funciona el motor de packs" />
              </FieldGroup>
              <FieldGroup label="Slug (URL)">
                <TextInput
                  value={form.slug}
                  onChange={v => { setSlugTouched(true); setForm(f => ({ ...f, slug: slugify(v) })); }}
                  placeholder="motor-de-packs"
                  mono
                  disabled={mode === 'edit'}
                />
              </FieldGroup>
            </FieldRow>

            <FieldGroup label="Deck (subtítulo)">
              <TextArea
                value={form.deck}
                onChange={v => setForm(f => ({ ...f, deck: v }))}
                rows={2}
                placeholder="Un pack no es solo un servicio con descuento — es un contrato con memoria."
              />
            </FieldGroup>

            <FieldRow>
              <FieldGroup label="Categoría">
                <select
                  value={form.categoriaId}
                  onChange={e => onCategoriaChange(e.target.value)}
                  style={selectStyle}
                >
                  <option value="">— Elegir —</option>
                  {cats.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </FieldGroup>
              <FieldGroup label="Tiempo lectura (min)">
                <TextInput
                  value={String(form.tiempoLectura)}
                  onChange={v => setForm(f => ({ ...f, tiempoLectura: v.replace(/\D/g, '') }))}
                  mono
                  placeholder="5"
                />
              </FieldGroup>
            </FieldRow>

            <FieldRow>
              <FieldGroup label="Pedido por · etiqueta">
                <TextInput
                  value={form.pedidoPor?.etiqueta || ''}
                  onChange={v => setForm(f => ({ ...f, pedidoPor: { ...(f.pedidoPor||{}), etiqueta: v } }))}
                  placeholder="Salón boutique · Viña"
                />
              </FieldGroup>
              <FieldGroup label="Región">
                <TextInput
                  value={form.pedidoPor?.region || ''}
                  onChange={v => setForm(f => ({ ...f, pedidoPor: { ...(f.pedidoPor||{}), region: v } }))}
                  placeholder="V-Región"
                />
              </FieldGroup>
            </FieldRow>

            <FieldRow>
              <FieldGroup label="Autor · nombre">
                <TextInput
                  value={form.autor?.nombre || ''}
                  onChange={v => setForm(f => ({ ...f, autor: { ...(f.autor||{}), nombre: v } }))}
                />
              </FieldGroup>
              <FieldGroup label="Autor · rol">
                <TextInput
                  value={form.autor?.rol || ''}
                  onChange={v => setForm(f => ({ ...f, autor: { ...(f.autor||{}), rol: v } }))}
                />
              </FieldGroup>
            </FieldRow>

            <FieldRow>
              <FieldGroup label="Orden en categoría">
                <TextInput
                  value={String(form.orden)}
                  onChange={v => setForm(f => ({ ...f, orden: v.replace(/\D/g, '') }))}
                  mono
                />
              </FieldGroup>
              <FieldGroup label="Destacado en home">
                <button
                  onClick={() => setForm(f => ({ ...f, destacado: !f.destacado }))}
                  style={{
                    ...selectStyle,
                    textAlign: 'left', cursor: 'pointer',
                    color: form.destacado ? 'var(--ay-text)' : 'var(--ay-text-mute)',
                    fontWeight: form.destacado ? 600 : 400,
                  }}
                >
                  {form.destacado ? '★ Sí, en el hero de la home' : '☆ Solo aparece en su categoría'}
                </button>
              </FieldGroup>
            </FieldRow>

            {/* Toolbar del editor Markdown */}
            <div style={{
              display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap',
              padding: '10px 12px', background: 'var(--ay-bg-elev)',
              border: '1px solid var(--ay-line)', borderRadius: '8px 8px 0 0',
              borderBottom: 'none',
            }}>
              <ToolbarBtn onClick={() => insertar(`\n\n## Título de sección\n\nCuerpo del párrafo.\n`)}>
                H2
              </ToolbarBtn>
              <ToolbarBtn onClick={() => insertar(`**${'texto en negrita'}**`)}>B</ToolbarBtn>
              <ToolbarBtn onClick={() => insertar(`_${'texto serif italic'}_`)}>
                <span className="serif" style={{ fontSize: 13 }}>i</span>
              </ToolbarBtn>
              <ToolbarBtn onClick={() => insertar(`- Item 1\n- Item 2\n- Item 3\n`)}>Lista</ToolbarBtn>
              <ToolbarBtn onClick={() => insertar('`código inline`')}><Code size={12} /></ToolbarBtn>
              <span style={{ width: 1, height: 20, background: 'var(--ay-line)', margin: '0 4px' }} />
              <ToolbarBtn onClick={() => insertar(`\n\n:::callout Nota\nEste es el contenido del callout — una explicación breve resaltada.\n:::\n\n`)}>
                <MessageSquare size={12} /> Callout
              </ToolbarBtn>
              <ToolbarBtn onClick={() => insertar(`\n\n:::mechanism\nlabel: Entrada\ntitle: Título del bloque\ndesc:  Descripción corta de qué hace este paso.\n---\nlabel: Salida\ntitle: Segundo paso\ndesc:  Descripción del segundo paso.\n:::\n\n`)}>
                <Layers size={12} /> Mecanismo
              </ToolbarBtn>
            </div>

            <textarea
              ref={textareaRef}
              value={form.contenidoMd}
              onChange={e => setForm(f => ({ ...f, contenidoMd: e.target.value }))}
              placeholder="Escribe en Markdown. Puedes usar `:::callout` y `:::mechanism` para bloques especiales."
              style={{
                width: '100%', minHeight: 480,
                padding: 16, fontFamily: 'var(--ay-font-mono)',
                fontSize: 13, lineHeight: 1.6,
                background: 'var(--ay-bg-input)',
                border: '1px solid var(--ay-line)',
                borderRadius: '0 0 8px 8px', color: 'var(--ay-text)',
                outline: 'none', resize: 'vertical',
              }}
              spellCheck={false}
            />

            <p style={{ fontSize: 11.5, color: 'var(--ay-text-faint)', margin: '10px 4px 0', lineHeight: 1.5 }}>
              Sintaxis: <code>**bold**</code>, <code>_serif italic_</code>, <code>*italic*</code>, <code>`code`</code>, <code>## H2</code>,
              <code> [texto](url)</code>, listas con <code>-</code>, bloques con <code>:::callout</code> y <code>:::mechanism</code>.
            </p>
          </div>

          {/* ── Preview ────────────────────────────────────────── */}
          <div style={{
            background: 'var(--ay-bg-input)',
            border: '1px solid var(--ay-line)',
            borderRadius: 'var(--ay-r-md)',
            padding: '32px 28px 40px',
            maxHeight: 'calc(100vh - 200px)',
            overflowY: 'auto',
            position: 'sticky', top: 16,
          }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--ay-text-faint)', fontWeight: 700, marginBottom: 16 }}>
              Preview en vivo
            </div>
            {form.titulo ? (
              <>
                <h1 className="ay-article-h1" style={{ fontSize: 32 }}>{form.titulo}</h1>
                {form.deck && <p className="ay-article-deck" style={{ fontSize: 15 }}>{form.deck}</p>}
                <div className="ay-article-body" style={{ marginTop: 24 }}>
                  {body.length > 0 ? body : (
                    <p style={{ color: 'var(--ay-text-faint)', fontStyle: 'italic' }}>
                      El contenido aparecerá aquí en vivo mientras escribes.
                    </p>
                  )}
                </div>
                {toc.length > 0 && (
                  <div style={{
                    marginTop: 32, padding: '16px 20px',
                    background: 'var(--ay-bg-elev)', borderRadius: 8,
                    fontSize: 12, color: 'var(--ay-text-mute)',
                  }}>
                    <strong style={{ color: 'var(--ay-text)', display: 'block', marginBottom: 8, fontFamily: 'var(--ay-font-display)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.16em' }}>
                      TOC detectado
                    </strong>
                    {toc.map(t => <div key={t.id} style={{ padding: '3px 0' }}>· {t.texto}</div>)}
                  </div>
                )}
              </>
            ) : (
              <p style={{ color: 'var(--ay-text-faint)', fontStyle: 'italic' }}>
                Escribe el título para empezar.
              </p>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 960px) {
          .admin-editor-grid { grid-template-columns: 1fr !important; }
          .admin-editor-grid > div:last-child { position: static !important; max-height: none !important; }
        }
      `}</style>
    </div>
  );
}

// ── UI helpers del editor ───────────────────────────────────────
function FieldRow({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>{children}</div>;
}
function FieldGroup({ label, children }) {
  return (
    <div>
      <label style={{
        display: 'block', fontSize: 11, textTransform: 'uppercase',
        letterSpacing: '0.14em', color: 'var(--ay-text-mute)', fontWeight: 600,
        marginBottom: 6,
      }}>{label}</label>
      {children}
    </div>
  );
}
function TextInput({ value, onChange, placeholder, mono, disabled }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        width: '100%', padding: '10px 12px',
        fontFamily: mono ? 'var(--ay-font-mono)' : 'var(--ay-font-body)',
        fontSize: mono ? 13 : 14,
        background: disabled ? 'var(--ay-bg-elev)' : 'var(--ay-bg-input)',
        border: '1px solid var(--ay-line)', borderRadius: 8,
        color: 'var(--ay-text)', outline: 'none',
        opacity: disabled ? 0.6 : 1,
      }}
    />
  );
}
function TextArea({ value, onChange, rows = 3, placeholder }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      style={{
        width: '100%', padding: '10px 12px',
        fontFamily: 'var(--ay-font-body)', fontSize: 14, lineHeight: 1.5,
        background: 'var(--ay-bg-input)', border: '1px solid var(--ay-line)',
        borderRadius: 8, color: 'var(--ay-text)', outline: 'none', resize: 'vertical',
      }}
    />
  );
}
const selectStyle = {
  width: '100%', padding: '10px 12px',
  fontFamily: 'var(--ay-font-body)', fontSize: 14,
  background: 'var(--ay-bg-input)', border: '1px solid var(--ay-line)',
  borderRadius: 8, color: 'var(--ay-text)', outline: 'none',
};
function ToolbarBtn({ children, onClick }) {
  return (
    <button
      type="button" onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '5px 10px', fontSize: 12, fontWeight: 500,
        background: 'transparent', border: '1px solid var(--ay-line)',
        borderRadius: 6, color: 'var(--ay-text)', cursor: 'pointer',
        fontFamily: 'var(--ay-font-body)',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--ay-bg-input)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}

// ── Helpers ─────────────────────────────────────────────────────
function formatFecha(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const hoy = new Date();
  const misma = d.toDateString() === hoy.toDateString();
  if (misma) return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
}
