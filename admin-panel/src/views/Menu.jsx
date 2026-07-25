// Menu.jsx — Panel admin de carta digital (tenants tipo restaurante).
//
// Modelo Firestore:
//   tenants/{tid}/menu/{itemId}          → platos
//   tenants/{tid}/configuracion/main     → { categoriasMenu[], tagsMenu{} }
//
// Reusa el motor de imágenes del panel (compressImage + upload a Storage bajo
// tenants/{tid}/menu/{itemId}/imagen.jpg). CRUD minimalista pero completo:
// crear, editar, activar/desactivar, marcar agotado, borrar.
//
// Ojo: NO es una copia de Servicios.jsx. Un restaurante NO necesita duración,
// packs, restricciones por barbero/sede/día ni recomendaciones. La UI busca
// que dar de alta un plato sean 4 campos: nombre, categoría, precio, foto.

import { useState, useMemo, useEffect } from 'react';
import {
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp, setDoc, getDoc,
} from 'firebase/firestore';
import {
  ref as storageRef, uploadBytesResumable, getDownloadURL,
} from 'firebase/storage';
import {
  Plus, Trash2, Edit2, Eye, EyeOff, Image as ImageIcon, Loader2,
  UtensilsCrossed, X, Check,
} from 'lucide-react';
import { db, storage } from '../lib/firebase';
import { tenantCol, resolveTenantId } from '../lib/tenantUtils';
import { useCollection } from '../hooks/useCollection';
import { withTimeout } from '../lib/firestore-helpers';
import { confirmDialog } from '../lib/confirmDialog';
import SlideOver from '../components/ui/SlideOver';

// ── Categorías default (si el tenant aún no las tiene en configuracion/main) ──
const CATEGORIAS_DEFAULT = [
  { id: 'entradas', nombre: 'Entradas', emoji: '🥗', orden: 0 },
  { id: 'fondos',   nombre: 'Fondos',   emoji: '🍽️', orden: 1 },
  { id: 'postres',  nombre: 'Postres',  emoji: '🍰', orden: 2 },
  { id: 'bebidas',  nombre: 'Bebidas',  emoji: '🥤', orden: 3 },
];

// ── Tags disponibles para marcar en cada plato ────────────────────────────────
const TAGS = [
  { id: 'popular',     label: 'Popular',      emoji: '⭐' },
  { id: 'novedad',     label: 'Nuevo',        emoji: '✨' },
  { id: 'vegano',      label: 'Vegano',       emoji: '🌱' },
  { id: 'vegetariano', label: 'Vegetariano',  emoji: '🥬' },
  { id: 'sin_gluten',  label: 'Sin gluten',   emoji: '🌾' },
  { id: 'picante',     label: 'Picante',      emoji: '🌶️' },
];

const EMPTY = {
  nombre: '',
  descripcion: '',
  precio: '',
  categoria: 'entradas',
  tags: [],
  imagen: null,
  activo: true,
  disponible: true,
  orden: 0,
};

// ── Helpers de imagen (mismo patrón que Servicios.jsx) ────────────────────────
async function compressImage(file, maxPx = 800, quality = 0.82) {
  return new Promise(resolve => {
    const img = new Image();
    const blobUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(blobUrl);
      let { width, height } = img;
      if (width > maxPx || height > maxPx) {
        const ratio = Math.min(maxPx / width, maxPx / height);
        width  = Math.round(width  * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      canvas.toBlob(blob => resolve(blob ?? file), 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(blobUrl); resolve(file); };
    img.src = blobUrl;
  });
}

async function uploadMenuImage(tenantId, itemId, blob) {
  const path = `tenants/${tenantId}/menu/${itemId}/imagen.jpg`;
  const sRef = storageRef(storage, path);
  const task = uploadBytesResumable(sRef, blob, {
    contentType: 'image/jpeg',
    cacheControl: 'public, max-age=86400',
  });
  return new Promise((resolve, reject) => {
    task.on('state_changed', null, reject, async () => {
      resolve(await getDownloadURL(task.snapshot.ref));
    });
  });
}

const fmtPrecio = (n) => '$' + (Number(n) || 0).toLocaleString('es-CL');

// ══════════════════════════════════════════════════════════════════════════════
export default function Menu() {
  const tenantId = resolveTenantId();
  const { data: items, loading } = useCollection('menu');

  // Categorías vienen de configuracion/main; si no existen, defaults.
  const [categorias, setCategorias] = useState(CATEGORIAS_DEFAULT);
  useEffect(() => {
    const ref = doc(db, 'tenants', tenantId, 'configuracion', 'main');
    withTimeout(getDoc(ref)).then(snap => {
      const cats = snap.exists() && Array.isArray(snap.data().categoriasMenu)
        ? snap.data().categoriasMenu
        : CATEGORIAS_DEFAULT;
      setCategorias(cats.slice().sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)));
    }).catch(() => setCategorias(CATEGORIAS_DEFAULT));
  }, [tenantId]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);         // item en edición o null (crear)
  const [filter, setFilter]   = useState('all');        // categoria activa (chip)

  function openNew() { setEditing(null); setOpen(true); }
  function openEdit(item) { setEditing(item); setOpen(true); }

  async function toggleActivo(item) {
    await updateDoc(doc(db, 'tenants', tenantId, 'menu', item.id), {
      activo: !item.activo,
      actualizadoEn: serverTimestamp(),
    });
  }
  async function toggleDisponible(item) {
    await updateDoc(doc(db, 'tenants', tenantId, 'menu', item.id), {
      disponible: item.disponible === false ? true : false,
      actualizadoEn: serverTimestamp(),
    });
  }
  async function borrar(item) {
    const ok = await confirmDialog({
      title: 'Borrar plato',
      message: `¿Seguro que quieres borrar "${item.nombre}"? Esta acción no se puede deshacer.`,
      confirmLabel: 'Borrar',
      danger: true,
    });
    if (!ok) return;
    await deleteDoc(doc(db, 'tenants', tenantId, 'menu', item.id));
  }

  // Agrupa por categoría + filtra por chip
  const grouped = useMemo(() => {
    const visibles = filter === 'all' ? items : items.filter(i => i.categoria === filter);
    const map = {};
    categorias.forEach(c => { map[c.id] = []; });
    visibles.forEach(it => {
      const cat = it.categoria || 'entradas';
      (map[cat] = map[cat] || []).push(it);
    });
    Object.values(map).forEach(arr => arr.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)));
    return map;
  }, [items, categorias, filter]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UtensilsCrossed className="w-6 h-6 text-orange-500" />
            Carta digital
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            {items.length} platos · Se ven en tiempo real en tu carta pública.
          </p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg shadow-sm transition"
        >
          <Plus className="w-4 h-4" /> Añadir plato
        </button>
      </div>

      {/* Chips filtro categoría */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 -mx-6 px-6 scrollbar-none">
        <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
          Todos ({items.length})
        </FilterChip>
        {categorias.map(c => {
          const count = items.filter(i => i.categoria === c.id).length;
          return (
            <FilterChip key={c.id} active={filter === c.id} onClick={() => setFilter(c.id)}>
              {c.emoji} {c.nombre} ({count})
            </FilterChip>
          );
        })}
      </div>

      {/* Estado carga */}
      {loading && (
        <div className="text-center py-12 text-zinc-500 text-sm">
          <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin" />
          Cargando carta…
        </div>
      )}

      {!loading && !items.length && (
        <EmptyState onNew={openNew} />
      )}

      {/* Secciones por categoría */}
      {!loading && !!items.length && categorias.map(cat => {
        const arr = grouped[cat.id] || [];
        if (!arr.length && filter !== 'all') return null;
        if (!arr.length) return null;
        return (
          <section key={cat.id} className="mb-8">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-2">
              <span>{cat.emoji}</span> {cat.nombre}
              <span className="text-xs font-normal text-zinc-400">· {arr.length}</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {arr.map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onEdit={() => openEdit(item)}
                  onToggleActivo={() => toggleActivo(item)}
                  onToggleDisponible={() => toggleDisponible(item)}
                  onDelete={() => borrar(item)}
                />
              ))}
            </div>
          </section>
        );
      })}

      {/* SlideOver crear/editar */}
      <SlideOver open={open} onClose={() => setOpen(false)} title={editing ? 'Editar plato' : 'Nuevo plato'}>
        <ItemForm
          key={editing?.id || 'new'}
          tenantId={tenantId}
          categorias={categorias}
          initial={editing}
          onSaved={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </SlideOver>
    </div>
  );
}

// ── Subcomponentes ────────────────────────────────────────────────────────────

function FilterChip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition border ${
        active
          ? 'bg-orange-500 text-white border-orange-500'
          : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-orange-300'
      }`}
    >
      {children}
    </button>
  );
}

function EmptyState({ onNew }) {
  return (
    <div className="text-center py-16 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
      <UtensilsCrossed className="w-12 h-12 mx-auto mb-3 text-zinc-400" />
      <h3 className="text-lg font-semibold mb-1">Aún no hay platos</h3>
      <p className="text-sm text-zinc-500 mb-4">Añade el primer plato para que aparezca en tu carta digital.</p>
      <button
        onClick={onNew}
        className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg"
      >
        <Plus className="w-4 h-4" /> Añadir primer plato
      </button>
    </div>
  );
}

function ItemCard({ item, onEdit, onToggleActivo, onToggleDisponible, onDelete }) {
  const dim = item.activo === false || item.disponible === false;
  return (
    <div className={`bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden group ${dim ? 'opacity-60' : ''}`}>
      <div className="aspect-video bg-zinc-100 dark:bg-zinc-800 relative overflow-hidden">
        {item.imagen
          ? <img src={item.imagen} alt={item.nombre} className="w-full h-full object-cover" loading="lazy" />
          : <div className="w-full h-full grid place-items-center text-zinc-400"><ImageIcon className="w-8 h-8" /></div>
        }
        {item.activo === false && (
          <span className="absolute top-2 left-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded uppercase tracking-wider">Oculto</span>
        )}
        {item.disponible === false && item.activo !== false && (
          <span className="absolute top-2 left-2 bg-red-500/90 text-white text-[10px] px-2 py-0.5 rounded uppercase tracking-wider">Agotado</span>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-sm leading-tight">{item.nombre || 'Sin nombre'}</h3>
          <span className="text-orange-600 dark:text-orange-400 font-bold text-sm whitespace-nowrap">{fmtPrecio(item.precio)}</span>
        </div>
        {item.descripcion && (
          <p className="text-xs text-zinc-500 line-clamp-2 mb-2">{item.descripcion}</p>
        )}
        {Array.isArray(item.tags) && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {item.tags.map(t => {
              const meta = TAGS.find(x => x.id === t);
              if (!meta) return null;
              return <span key={t} className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2 py-0.5 rounded">{meta.emoji} {meta.label}</span>;
            })}
          </div>
        )}
        <div className="flex gap-1 mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <IconBtn onClick={onEdit} title="Editar" icon={Edit2} />
          <IconBtn onClick={onToggleActivo} title={item.activo === false ? 'Mostrar en carta' : 'Ocultar de la carta'} icon={item.activo === false ? Eye : EyeOff} />
          <IconBtn onClick={onToggleDisponible} title={item.disponible === false ? 'Marcar disponible' : 'Marcar agotado'} icon={item.disponible === false ? Check : X} />
          <IconBtn onClick={onDelete} title="Borrar" icon={Trash2} danger />
        </div>
      </div>
    </div>
  );
}

function IconBtn({ onClick, title, icon: Icon, danger }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex-1 flex items-center justify-center py-2 rounded transition ${
        danger
          ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30'
          : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-orange-500'
      }`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

// ── Form crear/editar ────────────────────────────────────────────────────────
function ItemForm({ tenantId, categorias, initial, onSaved, onCancel }) {
  const [form, setForm]         = useState(() => ({ ...EMPTY, ...(initial || {}) }));
  const [file, setFile]         = useState(null);
  const [preview, setPreview]   = useState(initial?.imagen || null);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState(null);

  function setField(k, v) { setForm(f => ({ ...f, [k]: v })); }
  function toggleTag(id) {
    setForm(f => ({
      ...f,
      tags: f.tags.includes(id) ? f.tags.filter(x => x !== id) : [...f.tags, id],
    }));
  }
  function onPickFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function submit(e) {
    e.preventDefault();
    setError(null);
    if (!form.nombre.trim()) return setError('Nombre requerido');
    if (!form.precio || Number(form.precio) <= 0) return setError('Precio inválido');
    setSaving(true);
    try {
      const payload = {
        nombre:       form.nombre.trim(),
        descripcion:  (form.descripcion || '').trim(),
        precio:       Number(form.precio),
        categoria:    form.categoria || 'entradas',
        tags:         Array.isArray(form.tags) ? form.tags : [],
        activo:       form.activo !== false,
        disponible:   form.disponible !== false,
        orden:        Number(form.orden) || 0,
        actualizadoEn: serverTimestamp(),
      };
      let itemId = initial?.id;
      if (initial) {
        await updateDoc(doc(db, 'tenants', tenantId, 'menu', itemId), payload);
      } else {
        payload.creadoEn = serverTimestamp();
        const ref = await addDoc(tenantCol('menu'), payload);
        itemId = ref.id;
      }
      if (file) {
        const compressed = await compressImage(file);
        const url = await uploadMenuImage(tenantId, itemId, compressed);
        await updateDoc(doc(db, 'tenants', tenantId, 'menu', itemId), { imagen: url });
      }
      onSaved();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error al guardar');
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 pb-8">
      {/* Foto */}
      <div>
        <label className="text-xs uppercase tracking-wider text-zinc-500 font-semibold block mb-2">Foto del plato</label>
        <div className="aspect-video bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-hidden relative group">
          {preview
            ? <img src={preview} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full grid place-items-center text-zinc-400"><ImageIcon className="w-8 h-8" /></div>
          }
          <label className="absolute inset-0 bg-black/0 hover:bg-black/40 transition cursor-pointer flex items-center justify-center text-white text-sm font-medium opacity-0 hover:opacity-100">
            <input type="file" accept="image/*" className="hidden" onChange={onPickFile} />
            {preview ? 'Cambiar foto' : 'Subir foto'}
          </label>
        </div>
      </div>

      {/* Nombre */}
      <div>
        <label className="text-xs uppercase tracking-wider text-zinc-500 font-semibold block mb-1">Nombre *</label>
        <input
          className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          value={form.nombre}
          onChange={e => setField('nombre', e.target.value)}
          placeholder="Ej. Lomo a lo Pobre"
          autoFocus
          required
        />
      </div>

      {/* Descripción */}
      <div>
        <label className="text-xs uppercase tracking-wider text-zinc-500 font-semibold block mb-1">Descripción</label>
        <textarea
          className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
          rows={3}
          value={form.descripcion}
          onChange={e => setField('descripcion', e.target.value)}
          placeholder="Ingredientes principales o forma de preparación."
        />
      </div>

      {/* Precio + Categoría */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs uppercase tracking-wider text-zinc-500 font-semibold block mb-1">Precio (CLP) *</label>
          <input
            type="number"
            min="0"
            step="100"
            className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            value={form.precio}
            onChange={e => setField('precio', e.target.value)}
            placeholder="0"
            required
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-zinc-500 font-semibold block mb-1">Categoría *</label>
          <select
            className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            value={form.categoria}
            onChange={e => setField('categoria', e.target.value)}
          >
            {categorias.map(c => (
              <option key={c.id} value={c.id}>{c.emoji} {c.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="text-xs uppercase tracking-wider text-zinc-500 font-semibold block mb-2">Etiquetas</label>
        <div className="flex flex-wrap gap-2">
          {TAGS.map(t => {
            const on = form.tags.includes(t.id);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => toggleTag(t.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full border transition ${
                  on
                    ? 'bg-orange-500 border-orange-500 text-white'
                    : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300'
                }`}
              >
                {t.emoji} {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Orden dentro de la categoría */}
      <div>
        <label className="text-xs uppercase tracking-wider text-zinc-500 font-semibold block mb-1">Orden en la categoría</label>
        <input
          type="number"
          className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          value={form.orden}
          onChange={e => setField('orden', e.target.value)}
        />
        <p className="text-xs text-zinc-400 mt-1">Menor = aparece primero</p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg text-red-600 dark:text-red-400 text-sm">{error}</div>
      )}

      {/* Acciones */}
      <div className="flex gap-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {saving ? 'Guardando…' : (initial ? 'Guardar cambios' : 'Crear plato')}
        </button>
      </div>
    </form>
  );
}
