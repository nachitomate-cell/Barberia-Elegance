import { useState } from 'react';
import { Plus, Trophy } from 'lucide-react';
import { addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { tenantCol } from '../lib/tenantUtils';
import { useCollection } from '../hooks/useCollection';
import HelpModal, { HelpButton } from '../components/ui/HelpModal';

const ICONOS = [
  'ph-scissors','ph-gift','ph-star','ph-crown',
  'ph-trophy','ph-fire','ph-drop','ph-lightning',
  'ph-tag','ph-diamond','ph-sparkle','ph-confetti',
];

const EMPTY = { nombre: '', descripcion: '', costoSellos: '', icono: 'ph-scissors' };

function IconPicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {ICONOS.map(ic => {
        const active = value === ic;
        return (
          <button key={ic} type="button" title={ic.replace('ph-', '')}
            onClick={() => onChange(ic)}
            className={`w-10 h-10 flex items-center justify-center rounded-lg border transition-all ${
              active
                ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]'
                : 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
            }`}>
            <i className={`ph ${ic} text-base`} />
          </button>
        );
      })}
    </div>
  );
}

export default function Premios() {
  const { data: premios, loading } = useCollection('premios', [orderBy('costoSellos')]);

  const [form,     setForm]     = useState(EMPTY);
  const [showHelp, setShowHelp] = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  const openEdit = p => {
    setEditing(p.id);
    setError('');
    setForm({
      nombre:      p.nombre,
      descripcion: p.descripcion || '',
      costoSellos: p.costoSellos,
      icono:       p.icono || 'ph-scissors',
    });
  };
  const cancelEdit = () => { setEditing(null); setForm(EMPTY); setError(''); };

  const handleSave = async () => {
    const nombre = form.nombre.trim();
    const sellos = parseInt(form.costoSellos);
    if (!nombre || !sellos || sellos < 1) return;

    setError('');

    setSaving(true);
    try {
      const payload = {
        nombre,
        descripcion: form.descripcion.trim(),
        costoSellos: sellos,
        icono:       form.icono,
        updatedAt:   serverTimestamp(),
      };
      if (editing) {
        await updateDoc(doc(tenantCol('premios'), editing), payload);
        cancelEdit();
      } else {
        await addDoc(tenantCol('premios'), { ...payload, activo: true, creadoEn: serverTimestamp() });
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
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-white">Premios del Club</h1>
          <HelpButton onClick={() => setShowHelp(true)} />
        </div>
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
                <i className={`ph ${p.icono || 'ph-scissors'} text-base shrink-0 text-[#D4AF37]`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{p.nombre}</p>
                  {p.descripcion && (
                    <p className="text-xs text-slate-500 truncate">{p.descripcion}</p>
                  )}
                  <p className="text-xs text-slate-600 mt-0.5">{p.costoSellos} sello{p.costoSellos !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(p)}
                    className="p-2 rounded-lg text-slate-400 hover:text-[#D4AF37] transition-colors" title="Editar">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                  </button>
                  <button onClick={() => handleDelete(p.id)}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-500 transition-colors" title="Eliminar">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
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
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}
        </div>

        {/* Icono picker */}
        <div className="mb-4">
          <label className={lbl}>Ícono</label>
          <IconPicker value={form.icono} onChange={ic => setForm(f => ({ ...f, icono: ic }))} />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className={lbl}>Nombre</label>
            <input className={field} placeholder="Ej. Corte gratis"
              value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleSave()} />
          </div>
          <div>
            <label className={lbl}>Sellos requeridos</label>
            <input className={field} type="number" min="1" placeholder="10"
              value={form.costoSellos}
              onChange={e => setForm(f => ({ ...f, costoSellos: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleSave()} />
          </div>
        </div>

        <div className="mb-4">
          <label className={lbl}>Descripción <span className="normal-case font-normal text-slate-600">(opcional)</span></label>
          <input className={field} placeholder="Ej. Canjea 10 sellos por un corte gratis"
            value={form.descripcion}
            onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && handleSave()} />
        </div>

        {error && (
          <p className="text-xs text-red-400 font-semibold mb-3">{error}</p>
        )}

        <div className="flex gap-3 justify-end">
          {editing && (
            <button onClick={cancelEdit} className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all">
              Cancelar
            </button>
          )}
          <button onClick={handleSave}
            disabled={saving || !form.nombre || !form.costoSellos}
            className="flex items-center gap-2 px-5 py-2 bg-[#D4AF37] hover:bg-yellow-500 disabled:opacity-40 text-black text-sm font-semibold rounded-lg transition-colors">
            {saving && <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />}
            {editing ? 'Guardar' : <><Plus size={15} /> Agregar</>}
          </button>
        </div>
      </div>
      {showHelp && (
        <HelpModal title="Ayuda — Premios del Club" onClose={() => setShowHelp(false)}>
          <p><strong className="text-white">Premios</strong> define las recompensas del programa de fidelización.</p>
          <ul className="space-y-1.5 list-disc list-inside text-slate-400">
            <li>Crea premios con nombre, descripción, ícono y el <span className="text-white">costo en sellos</span> para canjearlos.</li>
            <li>Los clientes ven los premios disponibles y cuántos sellos les faltan en su app.</li>
            <li>Al alcanzar el umbral, el sistema notifica al cliente que tiene un premio disponible.</li>
            <li>Edita o elimina premios existentes según las promociones del local.</li>
          </ul>
        </HelpModal>
      )}
    </div>
  );
}
