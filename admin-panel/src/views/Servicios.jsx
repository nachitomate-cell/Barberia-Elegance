import { useState, useRef } from 'react';
import { Plus, Tag } from 'lucide-react';
import { addDoc, updateDoc, deleteDoc, doc, writeBatch, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { tenantCol } from '../lib/tenantUtils';
import { useCollection } from '../hooks/useCollection';
import { useConfig }     from '../hooks/useConfig';
import SlideOver from '../components/ui/SlideOver';
import HelpModal, { HelpButton } from '../components/ui/HelpModal';

const ICONS = [
  'ph-scissors','ph-user-focus','ph-mask-happy','ph-magic-wand',
  'ph-sparkle','ph-star','ph-crown','ph-fire',
  'ph-drop','ph-wave','ph-lightning','ph-paint-brush',
  'ph-gift','ph-eye','ph-smiley','ph-flower',
  'ph-leaf','ph-diamond','ph-trophy','ph-confetti',
  'ph-clock','ph-sun','ph-moon','ph-wind',
];

const EMPTY = { nombre: '', categoria: 'Otro', precio: '', duracion: '', icono: 'ph-scissors' };

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

export default function Servicios() {
  const { data: servicios, loading } = useCollection('servicios', [orderBy('orden')]);
  const { config, updateConfig }     = useConfig();
  const categorias = config.categoriasServicio ?? ['Otro'];

  const [slide,     setSlide]     = useState(false);
  const [showHelp,  setShowHelp]  = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [form,    setForm]    = useState(EMPTY);
  const [saving,  setSaving]  = useState(false);
  const [newCat,  setNewCat]  = useState('');
  const [dragOver, setDragOver] = useState(null);
  const dragId = useRef(null);

  const openNew  = () => { setEditing(null); setForm({ ...EMPTY, categoria: categorias[0] || 'Otro' }); setSlide(true); };
  const openEdit = s => { setEditing(s.id); setForm({ nombre: s.nombre, categoria: s.categoria || 'Otro', precio: s.precio, duracion: s.duracion, icono: s.icono || 'ph-scissors' }); setSlide(true); };

  const handleSave = async () => {
    if (!form.nombre || !form.precio || !form.duracion) return;
    setSaving(true);
    try {
      const payload = { nombre: form.nombre, categoria: form.categoria, precio: Number(form.precio), duracion: Number(form.duracion), icono: form.icono || 'ph-scissors', updatedAt: serverTimestamp() };
      if (editing) {
        await updateDoc(doc(tenantCol('servicios'), editing), payload);
      } else {
        const nextOrden = servicios.length ? Math.max(...servicios.map(s => s.orden ?? 0)) + 1 : 0;
        await addDoc(tenantCol('servicios'), { ...payload, orden: nextOrden, createdAt: serverTimestamp() });
      }
      setSlide(false);
    } finally { setSaving(false); }
  };

  const handleDelete = async id => {
    if (!confirm('¿Eliminar este servicio?')) return;
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
          <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : servicios.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-slate-600"><Tag size={32} className="mb-3" /><p className="text-sm">No hay servicios creados.</p></div>
        ) : (
          <div className="space-y-2">
            {servicios.map(s => (
              <div key={s.id} draggable
                onDragStart={() => { dragId.current = s.id; }}
                onDragEnd={() => { dragId.current = null; setDragOver(null); }}
                onDragOver={e => { e.preventDefault(); setDragOver(s.id); }}
                onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(null); }}
                onDrop={() => handleDrop(s.id)}
                className={`flex items-center gap-4 bg-slate-900 border rounded-xl p-4 transition-all cursor-grab active:cursor-grabbing select-none ${
                  dragOver === s.id ? 'border-emerald-500 bg-emerald-500/5' : 'border-slate-800 hover:border-slate-700'
                }`}>
                {/* Drag handle */}
                <svg className="text-slate-600 shrink-0" width="12" height="18" viewBox="0 0 12 18" fill="currentColor">
                  <circle cx="3" cy="3" r="1.5"/><circle cx="9" cy="3" r="1.5"/>
                  <circle cx="3" cy="9" r="1.5"/><circle cx="9" cy="9" r="1.5"/>
                  <circle cx="3" cy="15" r="1.5"/><circle cx="9" cy="15" r="1.5"/>
                </svg>
                {/* Icon */}
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <i className={`ph ${s.icono || 'ph-scissors'} text-base text-emerald-400`} />
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-white text-sm">{s.nombre}</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-slate-950 text-slate-400 border-slate-700">{s.categoria || 'Otro'}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">${Number(s.precio || 0).toLocaleString('es-CL')} · {s.duracion} min</p>
                </div>
                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => openEdit(s)} className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/25 text-blue-400 hover:bg-blue-500/20 transition-colors">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                  </button>
                  <button onClick={() => handleDelete(s.id)} className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20 transition-colors">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Sidebar: categorías ── */}
      <div className="w-full lg:w-60 shrink-0">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-white mb-3">Categorías</h2>
          <div className="space-y-1.5 mb-3">
            {categorias.map(c => (
              <div key={c} className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-lg px-3 py-2">
                <span className="text-xs text-white">{c}</span>
                <button onClick={() => delCategoria(c)} className="text-slate-600 hover:text-red-400 transition-colors p-0.5 rounded">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-1.5">
            <input className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="Nueva categoría..." value={newCat} onChange={e => setNewCat(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCategoria()} />
            <button onClick={addCategoria} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors">+</button>
          </div>
        </div>
      </div>

      {/* ── SlideOver creación/edición ── */}
      <SlideOver isOpen={slide} onClose={() => setSlide(false)}
        title={editing ? 'Editar servicio' : 'Nuevo servicio'}
        footer={
          <div className="flex gap-3 justify-end">
            <button onClick={() => setSlide(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all">Cancelar</button>
            <button onClick={handleSave} disabled={saving || !form.nombre || !form.precio || !form.duracion}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-all flex items-center gap-2">
              {saving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {editing ? 'Guardar' : 'Crear servicio'}
            </button>
          </div>
        }>
        <div className="space-y-4">
          <div>
            <label className={lbl}>Nombre del servicio</label>
            <input className={field} placeholder="Corte clásico" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Precio ($)</label>
              <input className={field} type="number" placeholder="12000" value={form.precio} onChange={e => setForm(f => ({ ...f, precio: e.target.value }))} />
            </div>
            <div>
              <label className={lbl}>Duración (min)</label>
              <input className={field} type="number" placeholder="45" value={form.duracion} onChange={e => setForm(f => ({ ...f, duracion: e.target.value }))} />
            </div>
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
        </div>
      </SlideOver>
      {showHelp && (
        <HelpModal title="Ayuda — Servicios" onClose={() => setShowHelp(false)}>
          <p>En <strong className="text-white">Servicios</strong> defines los cortes y tratamientos que ofrece el local.</p>
          <ul className="space-y-1.5 list-disc list-inside text-slate-400">
            <li>Crea servicios con nombre, categoría, <span className="text-white">precio</span> y <span className="text-white">duración</span> en minutos.</li>
            <li><span className="text-white">Arrastra</span> las tarjetas para reordenar cómo se muestran a los clientes.</li>
            <li>Agrega <span className="text-white">categorías personalizadas</span> para agrupar los servicios (ej: Barba, Color, Premium).</li>
            <li>Cada servicio puede tener un ícono decorativo que aparece en la app pública.</li>
          </ul>
        </HelpModal>
      )}
    </div>
  );
}
