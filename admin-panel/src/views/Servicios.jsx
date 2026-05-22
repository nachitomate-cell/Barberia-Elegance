import { useState, useRef, useEffect, useMemo } from 'react';
import { Plus, Tag } from 'lucide-react';
import { addDoc, updateDoc, deleteDoc, deleteField, doc, writeBatch, serverTimestamp, orderBy, getDocs, query, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { tenantCol } from '../lib/tenantUtils';
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
const EMPTY = { nombre: '', categoria: 'Otro', precio: '', duracion: '', icono: 'ph-scissors', descripcion: '', varPrecios: false, ppd: { ...EMPTY_PPD } };

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

  const [citasUsage, setCitasUsage] = useState({});
  useEffect(() => {
    getDocs(query(tenantCol('citas'), orderBy('creadoEn', 'desc'), limit(300)))
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
  const [form,    setForm]    = useState(EMPTY);
  const [saving,  setSaving]  = useState(false);
  const [newCat,  setNewCat]  = useState('');
  const [dragOver, setDragOver] = useState(null);
  const dragId = useRef(null);

  const openNew  = () => { setEditing(null); setForm({ ...EMPTY, categoria: categorias[0] || 'Otro', ppd: { ...EMPTY_PPD } }); setSlide(true); };
  const openEdit = s => {
    const ppd = { ...EMPTY_PPD };
    if (s.preciosPorDia) {
      Object.entries(s.preciosPorDia).forEach(([k, v]) => { ppd[Number(k)] = v != null ? String(v) : ''; });
    }
    setEditing(s.id);
    setForm({ nombre: s.nombre, categoria: s.categoria || 'Otro', precio: s.precio, duracion: s.duracion, icono: s.icono || 'ph-scissors', descripcion: s.descripcion || '', varPrecios: !!s.preciosPorDia, ppd });
    setSlide(true);
  };

  const handleSave = async () => {
    if (!form.nombre || !form.precio || !form.duracion) return;
    setSaving(true);
    try {
      const basePrecio = Number(form.precio);
      const preciosPorDia = {};
      if (form.varPrecios) {
        DIAS.forEach(({ key }) => {
          const v = form.ppd[key];
          if (v !== '' && v != null) preciosPorDia[String(key)] = Number(v);
        });
      }
      const descripcion = form.descripcion.trim();
      const base = { nombre: form.nombre, categoria: form.categoria, precio: basePrecio, duracion: Number(form.duracion), icono: form.icono || 'ph-scissors', updatedAt: serverTimestamp() };
      if (editing) {
        await updateDoc(doc(tenantCol('servicios'), editing), {
          ...base,
          descripcion: descripcion || deleteField(),
          preciosPorDia: form.varPrecios ? preciosPorDia : deleteField(),
        });
      } else {
        const nextOrden = servicios.length ? Math.max(...servicios.map(s => s.orden ?? 0)) + 1 : 0;
        const newDoc = { ...base, orden: nextOrden, createdAt: serverTimestamp() };
        if (descripcion) newDoc.descripcion = descripcion;
        if (form.varPrecios) newDoc.preciosPorDia = preciosPorDia;
        await addDoc(tenantCol('servicios'), newDoc);
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
          <>
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
                    {topServicio === s.nombre && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border bg-violet-500/10 text-violet-400 border-violet-500/20">✦ Más solicitado</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    ${Number(s.precio || 0).toLocaleString('es-CL')} · {s.duracion} min
                    {s.preciosPorDia && Object.keys(s.preciosPorDia).length > 0 && (
                      <span className="ml-1.5 text-[10px] font-bold text-amber-400/70 bg-amber-400/10 border border-amber-400/20 rounded-full px-1.5 py-0.5">precio variable</span>
                    )}
                  </p>
                  {s.descripcion && (
                    <p className="text-[11px] text-slate-600 mt-0.5 truncate">{s.descripcion}</p>
                  )}
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
                        placeholder={form.precio || '–'}
                        value={form.ppd[key]}
                        onChange={e => setForm(f => ({ ...f, ppd: { ...f.ppd, [key]: e.target.value } }))}
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
            <li>Cada servicio puede tener un ícono decorativo que aparece en la app pública.</li>
          </ul>
        </HelpModal>
      )}
    </div>
  );
}
