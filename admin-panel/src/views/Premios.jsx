import { useState } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import { addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { tenantCol } from '../lib/tenantUtils';
import { useCollection } from '../hooks/useCollection';

const EMPTY = { nombre: '', costoSellos: '', icono: '✂️' };

const ICONOS = [
  { v: '✂️',  l: 'Tijeras'  },
  { v: '💈',  l: 'Barbería' },
  { v: '🎁',  l: 'Regalo'   },
  { v: '⭐',  l: 'Estrella' },
  { v: '👑',  l: 'VIP'      },
  { v: '💆',  l: 'Masaje'   },
  { v: '🪒',  l: 'Navaja'   },
  { v: '🎯',  l: 'Objetivo' },
  { v: '🏆',  l: 'Trofeo'   },
  { v: '🎉',  l: 'Fiesta'   },
  { v: '💎',  l: 'Diamante' },
  { v: '🔥',  l: 'Fuego'    },
  { v: '🌟',  l: 'Especial' },
  { v: '🎀',  l: 'Lazo'     },
  { v: '💅',  l: 'Uñas'     },
  { v: '🧴',  l: 'Producto' },
];

export default function Premios() {
  const { data: premios, loading } = useCollection('premios', [orderBy('costoSellos')]);

  const [form,    setForm]    = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [saving,  setSaving]  = useState(false);

  const openEdit = p => {
    setEditing(p.id);
    setForm({ nombre: p.nombre, costoSellos: p.costoSellos, icono: p.icono || '✂️' });
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

  const field = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors';
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
          <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : premios.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-slate-600">
            <span className="text-3xl mb-2">🏆</span>
            <p className="text-sm">Sin premios configurados.</p>
            <p className="text-xs mt-0.5 text-slate-700">Crea el primero con el formulario de abajo.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {premios.map(p => (
              <div key={p.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-800/30 transition-colors">
                <span className="text-xl shrink-0">{p.icono || '✂️'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{p.nombre}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{p.costoSellos} sello{p.costoSellos !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => openEdit(p)} className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-colors">
                    <Edit2 size={13} />
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors">
                    <Trash2 size={13} />
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
          <div className="flex flex-wrap gap-1.5">
            {ICONOS.map(({ v, l }) => (
              <button
                key={v}
                type="button"
                title={l}
                onClick={() => setForm(f => ({ ...f, icono: v }))}
                className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all border ${
                  form.icono === v
                    ? 'border-emerald-500 bg-emerald-500/15'
                    : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className={lbl}>Nombre</label>
            <input className={field} placeholder="Ej. Corte gratis"
              value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleSave()} />
          </div>
          <div>
            <label className={lbl}>Sellos requeridos</label>
            <input className={field} type="number" min="1" max="99" placeholder="10"
              value={form.costoSellos} onChange={e => setForm(f => ({ ...f, costoSellos: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleSave()} />
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          {editing && (
            <button onClick={cancelEdit} className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all">
              Cancelar
            </button>
          )}
          <button onClick={handleSave} disabled={saving || !form.nombre || !form.costoSellos}
            className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-all">
            {saving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {editing ? 'Guardar' : <><Plus size={15} /> Agregar</>}
          </button>
        </div>
      </div>
    </div>
  );
}
