import { useState } from 'react';
import {
  Plus, Edit2, Trash2, X, Trophy,
  Scissors, Gift, Star, Crown, Award, Flame,
  Droplet, Zap, Tag, Gem, Sparkles, Diamond,
} from 'lucide-react';
import { addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { tenantCol } from '../lib/tenantUtils';
import { useCollection } from '../hooks/useCollection';

const ICONOS = [
  { key: 'scissors', Icon: Scissors,  label: 'Corte'    },
  { key: 'gift',     Icon: Gift,      label: 'Regalo'   },
  { key: 'star',     Icon: Star,      label: 'Estrella' },
  { key: 'crown',    Icon: Crown,     label: 'VIP'      },
  { key: 'award',    Icon: Award,     label: 'Trofeo'   },
  { key: 'flame',    Icon: Flame,     label: 'Fuego'    },
  { key: 'droplet',  Icon: Droplet,   label: 'Producto' },
  { key: 'zap',      Icon: Zap,       label: 'Oferta'   },
  { key: 'tag',      Icon: Tag,       label: 'Precio'   },
  { key: 'gem',      Icon: Gem,       label: 'Premium'  },
  { key: 'sparkles', Icon: Sparkles,  label: 'Especial' },
  { key: 'diamond',  Icon: Diamond,   label: 'Diamante' },
];

const ICON_MAP = Object.fromEntries(ICONOS.map(({ key, Icon }) => [key, Icon]));

function PremioIcon({ icono, size = 16, className = '' }) {
  const Icon = ICON_MAP[icono] ?? Scissors;
  return <Icon size={size} className={className} />;
}

const EMPTY = { nombre: '', costoSellos: '', icono: 'scissors' };

export default function Premios() {
  const { data: premios, loading } = useCollection('premios', [orderBy('costoSellos')]);

  const [form,    setForm]    = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [saving,  setSaving]  = useState(false);

  const openEdit = p => {
    setEditing(p.id);
    setForm({ nombre: p.nombre, costoSellos: p.costoSellos, icono: p.icono || 'scissors' });
  };
  const cancelEdit = () => { setEditing(null); setForm(EMPTY); };

  const handleSave = async () => {
    const nombre = form.nombre.trim();
    const sellos = parseInt(form.costoSellos);
    if (!nombre || !sellos || sellos < 1) return;
    setSaving(true);
    try {
      const payload = { nombre, costoSellos: sellos, icono: form.icono, updatedAt: serverTimestamp() };
      if (editing) {
        await updateDoc(doc(tenantCol('premios'), editing), payload);
        cancelEdit();
      } else {
        await addDoc(tenantCol('premios'), { ...payload, creadoEn: serverTimestamp() });
        setForm(EMPTY);
      }
    } finally { setSaving(false); }
  };

  const handleDelete = async id => {
    if (!confirm('¿Eliminar este premio?')) return;
    await deleteDoc(doc(tenantCol('premios'), id));
  };

  const field = 'w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-colors';
  const lbl   = 'block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5';

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Premios del Club</h1>
        <p className="text-sm text-slate-500 mt-0.5">Define los premios que obtienen los clientes por acumular sellos.</p>
      </div>

      {/* Lista */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mb-6">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : premios.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-slate-600">
            <Trophy size={36} className="mb-3 text-slate-700" />
            <p className="text-sm">Sin premios configurados.</p>
            <p className="text-xs mt-0.5 text-slate-700">Crea el primero con el formulario de abajo.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {premios.map(p => (
              <div key={p.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-800/30 transition-colors">
                <PremioIcon icono={p.icono} size={17} className="shrink-0 text-[#D4AF37]" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{p.nombre}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{p.costoSellos} sello{p.costoSellos !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(p)}
                    className="p-2 rounded-lg text-gray-400 hover:text-[#D4AF37] transition-colors"
                    title="Editar"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Formulario add/edit */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">
            {editing ? 'Editar premio' : 'Nuevo premio'}
          </h2>
          {editing && (
            <button onClick={cancelEdit} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-all">
              <X size={15} />
            </button>
          )}
        </div>

        {/* Icono picker */}
        <div className="mb-4">
          <label className={lbl}>Ícono</label>
          <div className="flex flex-wrap gap-2">
            {ICONOS.map(({ key, Icon, label }) => {
              const active = form.icono === key;
              return (
                <button
                  key={key}
                  type="button"
                  title={label}
                  onClick={() => setForm(f => ({ ...f, icono: key }))}
                  className={`w-10 h-10 flex items-center justify-center rounded-lg border transition-all ${
                    active
                      ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]'
                      : 'border-gray-700 bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                  }`}
                >
                  <Icon size={17} />
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className={lbl}>Nombre</label>
            <input
              className={field}
              placeholder="Ej. Corte gratis"
              value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
          </div>
          <div>
            <label className={lbl}>Sellos requeridos</label>
            <input
              className={field}
              type="number"
              min="1"
              max="99"
              placeholder="10"
              value={form.costoSellos}
              onChange={e => setForm(f => ({ ...f, costoSellos: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          {editing && (
            <button onClick={cancelEdit} className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all">
              Cancelar
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !form.nombre || !form.costoSellos}
            className="flex items-center gap-2 px-5 py-2 bg-[#D4AF37] hover:bg-yellow-500 disabled:opacity-40 text-black text-sm font-semibold rounded-lg transition-colors"
          >
            {saving && <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />}
            {editing ? 'Guardar' : <><Plus size={15} /> Agregar</>}
          </button>
        </div>
      </div>
    </div>
  );
}
