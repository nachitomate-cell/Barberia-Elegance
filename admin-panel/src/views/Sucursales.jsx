import { useState } from 'react';
import { updateDoc } from 'firebase/firestore';
import { tenantDoc } from '../lib/tenantUtils';
import { confirmDialog } from '../lib/confirmDialog';
import { useSucursales } from '../hooks/useSucursales';
import { useAuth } from '../contexts/AuthContext';
import { Building2, Plus, X, Pencil, Trash2, MapPin, Phone, Clock, AlertCircle } from 'lucide-react';

/* ── Helpers ──────────────────────────────────────────────────────── */
function genId() {
  return Math.random().toString(36).slice(2, 10);
}

const EMPTY_FORM = { nombre: '', direccion: '', telefono: '', horario: '', color: '#10b981' };

/* ── SucursalModal ────────────────────────────────────────────────── */
function SucursalModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const editing = !!initial?.id;

  const submit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) return;
    setLoading(true);
    await onSave({ ...form, nombre: form.nombre.trim(), id: initial?.id || genId() });
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <p className="text-sm font-bold text-primary">{editing ? 'Editar sucursal' : 'Nueva sucursal'}</p>
          <button onClick={onClose} className="text-slate-500 hover:text-primary"><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Nombre <span className="text-red-400">*</span></label>
            <input type="text" value={form.nombre} onChange={e => set('nombre', e.target.value)} required
              placeholder="Ej: Sucursal Centro"
              className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-primary placeholder-slate-500 focus:border-emerald-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Dirección</label>
            <input type="text" value={form.direccion} onChange={e => set('direccion', e.target.value)}
              placeholder="Ej: Av. Principal 123, Viña del Mar"
              className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-primary placeholder-slate-500 focus:border-emerald-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Teléfono</label>
            <input type="tel" value={form.telefono} onChange={e => set('telefono', e.target.value)}
              placeholder="+56912345678"
              className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-primary placeholder-slate-500 focus:border-emerald-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Horario</label>
            <input type="text" value={form.horario} onChange={e => set('horario', e.target.value)}
              placeholder="Ej: Lun–Sáb: 10:00–20:00"
              className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-primary placeholder-slate-500 focus:border-emerald-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Color de identificación</label>
            <div className="flex items-center gap-3 mt-1">
              <input type="color" value={form.color} onChange={e => set('color', e.target.value)}
                className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0 p-0" />
              <span className="text-sm text-slate-400 font-mono">{form.color}</span>
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-xl text-sm font-bold bg-emerald-500 text-emerald-950 hover:bg-emerald-400 disabled:opacity-50 transition-all">
            {loading ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear sucursal'}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ── SucursalCard ─────────────────────────────────────────────────── */
function SucursalCard({ suc, onEdit, onDelete }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all group">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${suc.color}20`, border: `1px solid ${suc.color}40` }}>
            <Building2 size={18} style={{ color: suc.color }} />
          </div>
          <div>
            <p className="text-sm font-bold text-primary">{suc.nombre}</p>
            <div className="w-2 h-0.5 rounded-full mt-1" style={{ background: suc.color }} />
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(suc)} title="Editar"
            className="p-1.5 rounded-lg text-slate-500 hover:text-primary hover:bg-slate-800 transition-all">
            <Pencil size={13} />
          </button>
          <button onClick={() => onDelete(suc)} title="Eliminar"
            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
      <div className="space-y-2">
        {suc.direccion && (
          <div className="flex items-start gap-2">
            <MapPin size={13} className="text-slate-500 mt-0.5 shrink-0" />
            <p className="text-xs text-slate-400">{suc.direccion}</p>
          </div>
        )}
        {suc.telefono && (
          <div className="flex items-center gap-2">
            <Phone size={13} className="text-slate-500 shrink-0" />
            <p className="text-xs text-slate-400">{suc.telefono}</p>
          </div>
        )}
        {suc.horario && (
          <div className="flex items-center gap-2">
            <Clock size={13} className="text-slate-500 shrink-0" />
            <p className="text-xs text-slate-400">{suc.horario}</p>
          </div>
        )}
        {!suc.direccion && !suc.telefono && !suc.horario && (
          <p className="text-xs text-slate-600 italic">Sin datos adicionales</p>
        )}
      </div>
    </div>
  );
}

/* ── Main view ────────────────────────────────────────────────────── */
export default function Sucursales() {
  const sucursales = useSucursales();
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  const [modal, setModal] = useState(null); // null | { mode: 'create' | 'edit', data?: suc }
  const [saving, setSaving] = useState(false);

  const persist = async (next) => {
    setSaving(true);
    try {
      await updateDoc(tenantDoc('settings', 'general'), { sucursales: next });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (suc) => {
    let next;
    if (modal.mode === 'edit') {
      next = sucursales.map(s => s.id === suc.id ? suc : s);
    } else {
      next = [...sucursales, suc];
    }
    await persist(next);
  };

  const handleDelete = async (suc) => {
    if (!(await confirmDialog(`¿Eliminar la sucursal "${suc.nombre}"?`))) return;
    await persist(sucursales.filter(s => s.id !== suc.id));
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Building2 size={20} className="text-emerald-400" />
            <h1 className="text-xl font-bold text-primary">Sucursales</h1>
          </div>
          <p className="text-sm text-slate-400">Gestiona tus locales. Cada sucursal puede tener barberos y servicios asignados.</p>
        </div>
        {isAdmin && (
          <button onClick={() => setModal({ mode: 'create' })} disabled={saving}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 disabled:opacity-50 transition-all">
            <Plus size={14} />
            Nueva sucursal
          </button>
        )}
      </div>

      {/* Grid */}
      {sucursales.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-3">
          <AlertCircle size={32} className="opacity-30" />
          <p className="text-sm">No hay sucursales configuradas.</p>
          {isAdmin && (
            <button onClick={() => setModal({ mode: 'create' })}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 transition-all">
              <Plus size={14} />
              Agregar primera sucursal
            </button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {sucursales.map(suc => (
            <SucursalCard
              key={suc.id}
              suc={suc}
              onEdit={s => setModal({ mode: 'edit', data: s })}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Info */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-800/40 border border-slate-800">
        <Building2 size={16} className="text-slate-500 mt-0.5 shrink-0" />
        <p className="text-xs text-slate-500 leading-relaxed">
          Las sucursales son informativas por ahora. La agenda unificada multi-sucursal
          con asignación de barberos y servicios por local estará disponible próximamente.
        </p>
      </div>

      {modal && (
        <SucursalModal
          initial={modal.data}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
