import { useState, useMemo } from 'react';
import { Plus, Search, Edit2, Trash2, Clock, DollarSign, Tag } from 'lucide-react';
import { addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { tenantCol } from '../lib/tenantUtils';
import { useCollection } from '../hooks/useCollection';
import SlideOver    from '../components/ui/SlideOver';
import Badge        from '../components/ui/Badge';
import DropdownMenu from '../components/ui/DropdownMenu';

const EMPTY = { nombre: '', categoria: '', precio: '', duracion: '', icono: '' };

function ServiceForm({ value, onChange }) {
  const field = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors';
  const label = 'block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5';

  return (
    <div className="space-y-4">
      <div>
        <label className={label}>Nombre</label>
        <input className={field} placeholder="Corte clásico" value={value.nombre}
          onChange={e => onChange({ ...value, nombre: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Precio ($)</label>
          <input className={field} type="number" placeholder="12000" value={value.precio}
            onChange={e => onChange({ ...value, precio: e.target.value })} />
        </div>
        <div>
          <label className={label}>Duración (min)</label>
          <input className={field} type="number" placeholder="45" value={value.duracion}
            onChange={e => onChange({ ...value, duracion: e.target.value })} />
        </div>
      </div>
      <div>
        <label className={label}>Categoría</label>
        <input className={field} placeholder="Cortes" value={value.categoria}
          onChange={e => onChange({ ...value, categoria: e.target.value })} />
      </div>
    </div>
  );
}

export default function Servicios() {
  const { data: servicios, loading } = useCollection('servicios');
  const [search,   setSearch]   = useState('');
  const [slide,    setSlide]    = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [form,     setForm]     = useState(EMPTY);
  const [saving,   setSaving]   = useState(false);

  const filtered = useMemo(() =>
    servicios.filter(s =>
      s.nombre?.toLowerCase().includes(search.toLowerCase()) ||
      s.categoria?.toLowerCase().includes(search.toLowerCase())
    ),
    [servicios, search]
  );

  const openNew  = () => { setEditing(null); setForm(EMPTY); setSlide(true); };
  const openEdit = s  => { setEditing(s.id); setForm({ nombre: s.nombre, categoria: s.categoria, precio: s.precio, duracion: s.duracion }); setSlide(true); };

  const handleSave = async () => {
    if (!form.nombre) return;
    setSaving(true);
    try {
      const payload = {
        nombre:    form.nombre,
        categoria: form.categoria,
        precio:    Number(form.precio),
        duracion:  Number(form.duracion),
        updatedAt: serverTimestamp(),
      };
      if (editing) {
        await updateDoc(doc(tenantCol('servicios'), editing), payload);
      } else {
        await addDoc(tenantCol('servicios'), { ...payload, createdAt: serverTimestamp() });
      }
      setSlide(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async id => {
    if (!confirm('¿Eliminar este servicio?')) return;
    await deleteDoc(doc(tenantCol('servicios'), id));
  };

  return (
    <div className="max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Servicios</h1>
          <p className="text-sm text-slate-500 mt-0.5">{servicios.length} servicios registrados</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} /> Nuevo servicio
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          placeholder="Buscar por nombre o categoría…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-slate-600 transition-colors"
        />
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-600">
            <Tag size={32} className="mb-3" />
            <p className="text-sm font-medium">Sin servicios</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Servicio</th>
                <th className="px-3 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Categoría</th>
                <th className="px-3 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Precio</th>
                <th className="px-3 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Duración</th>
                <th className="px-3 py-3 w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map(s => (
                <tr key={s.id} className="hover:bg-slate-800/40 transition-colors group">
                  <td className="px-5 py-3.5 font-medium text-white">{s.nombre}</td>
                  <td className="px-3 py-3.5 hidden md:table-cell">
                    <Badge variant="active">{s.categoria || '—'}</Badge>
                  </td>
                  <td className="px-3 py-3.5 text-right font-mono text-emerald-400">
                    ${Number(s.precio || 0).toLocaleString('es-CL')}
                  </td>
                  <td className="px-3 py-3.5 text-right text-slate-400 hidden sm:table-cell">
                    <span className="flex items-center justify-end gap-1">
                      <Clock size={12} /> {s.duracion} min
                    </span>
                  </td>
                  <td className="px-3 py-3.5 text-right">
                    <DropdownMenu
                      items={[
                        { label: 'Editar',    Icon: Edit2,  onClick: () => openEdit(s) },
                        'separator',
                        { label: 'Eliminar',  Icon: Trash2, onClick: () => handleDelete(s.id), danger: true },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* SlideOver */}
      <SlideOver
        isOpen={slide}
        onClose={() => setSlide(false)}
        title={editing ? 'Editar servicio' : 'Nuevo servicio'}
        subtitle="Los cambios se reflejan en tiempo real en el agendamiento."
        footer={
          <div className="flex gap-3 justify-end">
            <button onClick={() => setSlide(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all">
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.nombre}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-all flex items-center gap-2"
            >
              {saving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {editing ? 'Guardar cambios' : 'Crear servicio'}
            </button>
          </div>
        }
      >
        <ServiceForm value={form} onChange={setForm} />
      </SlideOver>

    </div>
  );
}
