import { useState, useRef, useEffect, useMemo } from 'react';
import { Plus, Tag } from 'lucide-react';
import {
  addDoc, updateDoc, deleteDoc, deleteField, doc, writeBatch,
  serverTimestamp, orderBy, getDocs, query, limit,
} from 'firebase/firestore';
import {
  ref as storageRef, uploadBytesResumable, getDownloadURL,
} from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { tenantCol, resolveTenantId } from '../lib/tenantUtils';
import { withTimeout } from '../lib/firestore-helpers';
import { confirmDialog } from '../lib/confirmDialog';
import { useCollection } from '../hooks/useCollection';
import { useConfig }     from '../hooks/useConfig';
import SlideOver from '../components/ui/SlideOver';
import HelpModal, { HelpButton } from '../components/ui/HelpModal';
import AIWatermark from '../components/ui/AIWatermark';

const ICONS = [
  'ph-scissors','ph-user-focus','ph-mask-happy','ph-magic-wand',
  'ph-sparkle','ph-star','ph-crown','ph-fire',
  'ph-drop','ph-wave','ph-lightning','ph-paint-brush',
  'ph-gift','ph-eye','ph-smiley','ph-flower',
  'ph-leaf','ph-diamond','ph-trophy','ph-confetti',
  'ph-clock','ph-sun','ph-moon','ph-wind',
];

const DIAS = [
  { key: 1, label: 'Lun' }, { key: 2, label: 'Mar' }, { key: 3, label: 'Mié' },
  { key: 4, label: 'Jue' }, { key: 5, label: 'Vie' }, { key: 6, label: 'Sáb' },
  { key: 0, label: 'Dom' },
];
const EMPTY_PPD = Object.fromEntries(DIAS.map(d => [d.key, '']));
const EMPTY = {
  nombre: '', categoria: 'Otro', precio: '', duracion: '',
  icono: 'ph-scissors', descripcion: '', varPrecios: false,
  ppd: { ...EMPTY_PPD }, imagen: null,
  recargoSobrecupoDefault: '',
};

// ── Helpers ───────────────────────────────────────────────────────────

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

async function uploadServiceImage(tenantId, serviceId, blob) {
  const path = tenantId === 'elegance'
    ? `servicios/${serviceId}/imagen.jpg`
    : `tenants/${tenantId}/servicios/${serviceId}/imagen.jpg`;
  const sRef = storageRef(storage, path);
  const task = uploadBytesResumable(sRef, blob, { contentType: 'image/jpeg' });
  return new Promise((resolve, reject) => {
    task.on('state_changed', null, reject, async () => {
      resolve(await getDownloadURL(task.snapshot.ref));
    });
  });
}

// ── Icon Picker ───────────────────────────────────────────────────────

function IconPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 hover:border-slate-600 transition-colors">
        <i className={`ph ${value} text-base text-emerald-400`} />
        <span>Elegir ícono</span>
      </button>
      {open && (
        <div className="mt-2 bg-slate-800 border border-slate-700 rounded-xl p-3 grid grid-cols-8 gap-1.5">
          {ICONS.map(ic => (
            <button key={ic} type="button" title={ic.replace('ph-', '')}
              onClick={() => { onChange(ic); setOpen(false); }}
              className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-colors ${
                value === ic ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-600 hover:border-slate-400'
              }`}>
              <i className={`ph ${ic} text-base ${value === ic ? 'text-emerald-400' : 'text-slate-400'}`} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────

export default function Servicios() {
  const { data: servicios, loading } = useCollection('servicios', [orderBy('orden')]);
  const { config, updateConfig }     = useConfig();
  const categorias = config.categoriasServicio ?? ['Otro'];

  const [citasUsage, setCitasUsage] = useState({});
  useEffect(() => {
    withTimeout(getDocs(query(tenantCol('citas'), orderBy('creadoEn', 'desc'), limit(300))), 20000, 'servicios/citas-usage')
      .then(snap => {
        const cnt = {};
        snap.forEach(d => { const n = d.data().servicioNombre; if (n) cnt[n] = (cnt[n] || 0) + 1; });
        setCitasUsage(cnt);
      })
      .catch(() => {});
  }, []);

  const topServicio = useMemo(() => {
    const sorted = Object.entries(citasUsage).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || null;
  }, [citasUsage]);

  const [slide,     setSlide]     = useState(false);
  const [showHelp,  setShowHelp]  = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [form,      setForm]      = useState(EMPTY);
  const [saving,    setSaving]    = useState(false);
  const [newCat,    setNewCat]    = useState('');
  const [dragOver,  setDragOver]  = useState(null);

  // Image upload state
  const [imageFile,    setImageFile]    = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imgUploading, setImgUploading] = useState(false);
  const imgRef  = useRef(null);
  const dragId  = useRef(null);

  const resetImageState = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ ...EMPTY, categoria: categorias[0] || 'Otro', ppd: { ...EMPTY_PPD } });
    resetImageState();
    setSlide(true);
  };

  const openEdit = s => {
    const ppd = { ...EMPTY_PPD };
    if (s.preciosPorDia) {
      Object.entries(s.preciosPorDia).forEach(([k, v]) => { ppd[Number(k)] = v != null ? String(v) : ''; });
    }
    setEditing(s.id);
    setForm({
      nombre: s.nombre, categoria: s.categoria || 'Otro',
      precio: s.precio, duracion: s.duracion,
      icono: s.icono || 'ph-scissors', descripcion: s.descripcion || '',
      varPrecios: !!s.preciosPorDia, ppd,
      imagen: s.imagen || null,
      recargoSobrecupoDefault: s.recargoSobrecupoDefault != null ? String(s.recargoSobrecupoDefault) : '',
    });
    resetImageState();
    setSlide(true);
  };

  const handleImageSelect = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    setForm(f => ({ ...f, imagen: null }));
  };

  const handleSave = async () => {
    if (!form.nombre || !form.precio || !form.duracion) return;
    setSaving(true);
    setImgUploading(false);
    try {
      const tid        = resolveTenantId();
      const basePrecio = Math.round(Number(form.precio)) || 0;   // CLP enteros, sin decimales
      const preciosPorDia = {};
      if (form.varPrecios) {
        DIAS.forEach(({ key }) => {
          const v = form.ppd[key];
          if (v !== '' && v != null) preciosPorDia[String(key)] = Math.round(Number(v));
        });
      }
      const descripcion = form.descripcion.trim();
      // Recargo por sobrecupo / horario especial: opcional. Se aplica solo si
      // el barbero activa el toggle en la agenda; el default aquí es 0.
      const rawRecargo = String(form.recargoSobrecupoDefault ?? '').trim();
      const recargoSobrecupoDefault = rawRecargo === ''
        ? 0
        : Math.max(0, Math.round(Number(rawRecargo)) || 0);
      const base = {
        nombre: form.nombre, categoria: form.categoria,
        precio: basePrecio, duracion: Number(form.duracion),
        icono: form.icono || 'ph-scissors', updatedAt: serverTimestamp(),
        recargoSobrecupoDefault,
      };

      let imagenUrl = form.imagen ?? null;

      if (editing) {
        // Upload image first if a new one was selected
        if (imageFile) {
          setImgUploading(true);
          const compressed = await compressImage(imageFile);
          imagenUrl = await uploadServiceImage(tid, editing, compressed);
          setImgUploading(false);
        }
        await updateDoc(doc(tenantCol('servicios'), editing), {
          ...base,
          imagen:       imagenUrl !== null ? imagenUrl : deleteField(),
          descripcion:  descripcion || deleteField(),
          preciosPorDia: form.varPrecios ? preciosPorDia : deleteField(),
        });
      } else {
        const nextOrden = servicios.length ? Math.max(...servicios.map(s => s.orden ?? 0)) + 1 : 0;
        const newDoc = { ...base, orden: nextOrden, createdAt: serverTimestamp() };
        if (descripcion) newDoc.descripcion = descripcion;
        if (form.varPrecios) newDoc.preciosPorDia = preciosPorDia;
        // Create doc first to get ID, then upload image
        const docRef = await addDoc(tenantCol('servicios'), newDoc);
        if (imageFile) {
          setImgUploading(true);
          const compressed = await compressImage(imageFile);
          imagenUrl = await uploadServiceImage(tid, docRef.id, compressed);
          await updateDoc(docRef, { imagen: imagenUrl });
          setImgUploading(false);
        }
      }

      resetImageState();
      setSlide(false);
    } finally {
      setSaving(false);
      setImgUploading(false);
    }
  };

  const handleDelete = async id => {
    if (!(await confirmDialog('¿Eliminar este servicio?'))) return;
    await deleteDoc(doc(tenantCol('servicios'), id));
  };

  const handleDrop = async targetId => {
    if (!dragId.current || dragId.current === targetId) return;
    const curr = [...servicios];
    const fi = curr.findIndex(s => s.id === dragId.current);
    const ti = curr.findIndex(s => s.id === targetId);
    if (fi === -1 || ti === -1) return;
    const [mv] = curr.splice(fi, 1); curr.splice(ti, 0, mv);
    dragId.current = null; setDragOver(null);
    const batch = writeBatch(db);
    curr.forEach((s, i) => batch.update(doc(tenantCol('servicios'), s.id), { orden: i }));
    await batch.commit();
  };

  const addCategoria = async () => {
    const nombre = newCat.trim(); if (!nombre) return;
    if (categorias.map(c => c.toLowerCase()).includes(nombre.toLowerCase())) return;
    await updateConfig({ categoriasServicio: [...categorias, nombre] });
    setNewCat('');
  };

  const delCategoria = async nombre => {
    if (categorias.length <= 1) return;
    const fallback = categorias.filter(c => c !== nombre)[0] ?? 'Otro';
    const afectados = servicios.filter(s => s.categoria === nombre);
    if (afectados.length > 0) {
      const batch = writeBatch(db);
      afectados.forEach(s => batch.update(doc(tenantCol('servicios'), s.id), { categoria: fallback }));
      await batch.commit();
    }
    await updateConfig({ categoriasServicio: categorias.filter(c => c !== nombre) });
  };

  const field = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors';
  const lbl   = 'block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5';

  const previewSrc = imagePreview || form.imagen;

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">

      {/* ── Lista de servicios ── */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">Servicios</h1>
              <HelpButton onClick={() => setShowHelp(true)} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Arrastra para reordenar. El orden se guarda en Firestore.</p>
          </div>
          <button onClick={openNew} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            <Plus size={16} /> Nuevo servicio
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : servicios.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-slate-600">
            <Tag size={32} className="mb-3" />
            <p className="text-sm">No hay servicios creados.</p>
          </div>
        ) : (
          <>
            <div className="space-y-2.5">
              {servicios.map(s => (
                <div key={s.id} draggable
                  onDragStart={() => { dragId.current = s.id; }}
                  onDragEnd={() => { dragId.current = null; setDragOver(null); }}
                  onDragOver={e => { e.preventDefault(); setDragOver(s.id); }}
                  onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(null); }}
                  onDrop={() => handleDrop(s.id)}
                  className={`group flex items-center gap-3 sm:gap-4 bg-slate-800/40 border rounded-2xl p-3 sm:p-4 select-none transition-all ${
                    dragOver === s.id
                      ? 'border-emerald-500 bg-emerald-500/5 shadow-lg shadow-emerald-500/10'
                      : 'border-slate-700/50 hover:bg-slate-800/80 hover:border-slate-600'
                  }`}>

                  {/* Drag handle — más discreto */}
                  <svg className="text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing shrink-0 transition-colors"
                    width="12" height="18" viewBox="0 0 12 18" fill="currentColor">
                    <circle cx="3" cy="3" r="1.5"/><circle cx="9" cy="3" r="1.5"/>
                    <circle cx="3" cy="9" r="1.5"/><circle cx="9" cy="9" r="1.5"/>
                    <circle cx="3" cy="15" r="1.5"/><circle cx="9" cy="15" r="1.5"/>
                  </svg>

                  {/* Image or Icon — contenedor tintado premium */}
                  {s.imagen ? (
                    <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 border border-slate-700">
                      <img src={s.imagen} alt={s.nombre} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                      <i className={`ph ${s.icono || 'ph-scissors'} text-lg`} />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-white font-semibold text-sm truncate">{s.nombre}</h4>
                      <span className="bg-slate-700/50 text-slate-300 border border-slate-600/50 rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0">
                        {s.categoria || 'Otro'}
                      </span>
                      {topServicio === s.nombre && (
                        <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0">
                          ✦ Más solicitado
                        </span>
                      )}
                    </div>
                    <p className="text-slate-300 text-sm mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <span>${Math.round(Number(s.precio || 0)).toLocaleString('es-CL')}</span>
                      <span className="text-slate-600">·</span>
                      <span>{s.duracion} min</span>
                      {s.preciosPorDia && Object.keys(s.preciosPorDia).length > 0 && (
                        <span className="bg-amber-400/10 text-amber-400 border border-amber-400/20 rounded-full px-1.5 py-0.5 text-[10px] font-bold">
                          precio variable
                        </span>
                      )}
                    </p>
                    {s.descripcion && (
                      <p className="hidden sm:block text-slate-500 text-sm mt-0.5 line-clamp-1">{s.descripcion}</p>
                    )}
                  </div>

                  {/* Actions — ghost buttons */}
                  <div className="flex items-center gap-0.5 shrink-0 sm:opacity-70 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(s)}
                      className="text-slate-400 hover:bg-slate-700 hover:text-white p-2 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="text-slate-400 hover:bg-red-500/10 hover:text-red-400 p-2 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {topServicio && (
              <div className="flex items-center gap-2 mt-3 px-1">
                <img src="/logo1.png" alt="SynapTech" className="h-3 w-auto opacity-30" />
                <p className="text-[9px] text-slate-700">Motor analítico de SynapTech AI · Conclusiones basadas en los datos cargados</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Sidebar: categorías ── */}
      <div className="w-full lg:w-64 shrink-0">
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Tag size={14} className="text-slate-400" />
            Categorías
          </h2>

          <div className="space-y-1.5 mb-4">
            {categorias.map(c => (
              <div key={c} className="bg-slate-900/50 border border-slate-700 rounded-lg p-2.5 flex justify-between items-center">
                <span className="text-sm text-slate-200">{c}</span>
                <button
                  onClick={() => delCategoria(c)}
                  className="text-slate-500 hover:text-red-400 transition-colors p-0.5 rounded"
                  aria-label={`Eliminar categoría ${c}`}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              className="flex-1 bg-slate-900 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg text-sm px-3 py-2 text-white placeholder-slate-500 focus:outline-none transition-colors"
              placeholder="Nueva categoría..." value={newCat} onChange={e => setNewCat(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCategoria()}
            />
            <button
              onClick={addCategoria}
              disabled={!newCat.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg w-9 h-9 flex items-center justify-center transition-colors shrink-0"
              aria-label="Añadir categoría"
            >
              <Plus size={16} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>

      {/* ── SlideOver creación/edición ── */}
      <SlideOver
        isOpen={slide}
        onClose={() => { resetImageState(); setSlide(false); }}
        title={editing ? 'Editar servicio' : 'Nuevo servicio'}
        footer={
          <div className="flex gap-3 justify-end">
            <button onClick={() => { resetImageState(); setSlide(false); }} className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all">Cancelar</button>
            <button
              onClick={handleSave}
              disabled={saving || !form.nombre || !form.precio || !form.duracion}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-all flex items-center gap-2"
            >
              {(saving || imgUploading) && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {imgUploading ? 'Subiendo imagen…' : (editing ? 'Guardar' : 'Crear servicio')}
            </button>
          </div>
        }
      >
        <div className="space-y-4">

          <div>
            <label className={lbl}>Nombre del servicio</label>
            <input className={field} placeholder="Corte clásico" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Precio (CLP)</label>
              <input className={field} type="number" min="0" step="1" inputMode="numeric" placeholder="12000" value={form.precio} onChange={e => setForm(f => ({ ...f, precio: e.target.value.replace(/[^\d]/g, '') }))} />
            </div>
            <div>
              <label className={lbl}>Duración (min)</label>
              <input className={field} type="number" placeholder="45" value={form.duracion} onChange={e => setForm(f => ({ ...f, duracion: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className={lbl}>
              Recargo por Sobrecupo / Horario Especial ($)
              <span className="text-slate-600 normal-case tracking-normal font-normal ml-1">(opcional)</span>
            </label>
            <input
              className={field}
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              placeholder="5000"
              value={form.recargoSobrecupoDefault}
              onChange={e => setForm(f => ({ ...f, recargoSobrecupoDefault: e.target.value.replace(/[^\d]/g, '') }))}
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Monto sugerido a cobrar sobre el precio base cuando la cita se agenda como sobrecupo
              o fuera de turno. El barbero podrá ajustarlo en cada cita.
            </p>
          </div>

          <div>
            <label className={lbl}>Categoría</label>
            <select className={field} value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
              {categorias.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className={lbl}>Ícono</label>
            <IconPicker value={form.icono} onChange={ic => setForm(f => ({ ...f, icono: ic }))} />
          </div>

          {/* ── Imagen del servicio ── */}
          <div>
            <label className={lbl}>
              Imagen{' '}
              <span className="text-slate-600 normal-case tracking-normal font-normal">(opcional — aparece en el portal VIP)</span>
            </label>

            {previewSrc && (
              <div className="relative mb-2 rounded-xl overflow-hidden bg-slate-800" style={{ aspectRatio: '16/9' }}>
                <img src={previewSrc} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute top-2 right-2 w-6 h-6 bg-black/60 hover:bg-red-500/80 rounded-full flex items-center justify-center transition-colors"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => imgRef.current?.click()}
              className="flex items-center justify-center gap-2 w-full px-3 py-2.5 bg-slate-800 border border-dashed border-slate-700 rounded-lg text-sm text-slate-400 hover:border-slate-500 hover:text-slate-300 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17,8 12,3 7,8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              {previewSrc ? 'Cambiar imagen' : 'Subir imagen'}
            </button>
            <input
              ref={imgRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />
            <p className="text-[11px] text-slate-600 mt-1">Se comprime automáticamente. Recomendado: 16:9, mínimo 800×450 px.</p>
          </div>

          <div>
            <label className={lbl}>
              Descripción <span className="text-slate-600 normal-case tracking-normal font-normal">(opcional)</span>
            </label>
            <textarea
              className={`${field} resize-none`}
              rows={3}
              placeholder="Breve descripción visible para el cliente al elegir servicio…"
              value={form.descripcion}
              onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
            />
            <p className="text-[11px] text-slate-600 mt-1">Máximo 2 líneas se mostrarán en la app de reserva.</p>
          </div>

          {/* Precios variables por día */}
          <div>
            <button type="button"
              onClick={() => setForm(f => ({ ...f, varPrecios: !f.varPrecios }))}
              className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-lg border text-sm font-semibold transition-colors ${
                form.varPrecios
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
              }`}>
              <span className={`w-8 h-4 rounded-full transition-colors relative ${form.varPrecios ? 'bg-emerald-500' : 'bg-slate-600'}`}>
                <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${form.varPrecios ? 'left-4' : 'left-0.5'}`} />
              </span>
              Precios variables por día
            </button>
            {form.varPrecios && (
              <div className="mt-3 bg-slate-800/60 border border-slate-700 rounded-xl p-3">
                <p className="text-[11px] text-slate-500 mb-3">Deja en blanco para usar el precio base. El precio que pague el cliente dependerá del día que elija.</p>
                <div className="grid grid-cols-7 gap-1.5">
                  {DIAS.map(({ key, label }) => (
                    <div key={key} className="flex flex-col items-center gap-1">
                      <span className={`text-[10px] font-bold uppercase ${key === 0 || key === 6 ? 'text-amber-400' : 'text-slate-400'}`}>{label}</span>
                      <input
                        type="number"
                        min="0" step="1" inputMode="numeric"
                        placeholder={form.precio || '–'}
                        value={form.ppd[key]}
                        onChange={e => setForm(f => ({ ...f, ppd: { ...f.ppd, [key]: e.target.value.replace(/[^\d]/g, '') } }))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-1 py-1.5 text-[11px] text-center text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </SlideOver>

      {showHelp && (
        <HelpModal title="Ayuda — Servicios" onClose={() => setShowHelp(false)}>
          <p>En <strong className="text-white">Servicios</strong> defines los cortes y tratamientos que ofrece el local.</p>
          <ul className="space-y-1.5 list-disc list-inside text-slate-400">
            <li>Crea servicios con nombre, categoría, <span className="text-white">precio</span> y <span className="text-white">duración</span> en minutos.</li>
            <li><span className="text-white">Arrastra</span> las tarjetas para reordenar cómo se muestran a los clientes.</li>
            <li>Agrega <span className="text-white">categorías personalizadas</span> para agrupar los servicios (ej: Barba, Color, Premium).</li>
            <li>Sube una <span className="text-white">imagen</span> a cada servicio para que aparezca en el portal VIP del cliente.</li>
          </ul>
        </HelpModal>
      )}
    </div>
  );
}
