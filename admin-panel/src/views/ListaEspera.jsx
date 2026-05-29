import { useState, useMemo } from 'react';
import { addDoc, deleteDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { tenantCol } from '../lib/tenantUtils';
import { useCollection } from '../hooks/useCollection';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import {
  ClipboardList, Plus, X, Bell, CheckCircle2, Clock, Trash2, AlertCircle, Search,
} from 'lucide-react';

/* ── Helpers ──────────────────────────────────────────────────────── */
function pad(n) { return String(n).padStart(2, '0'); }
function today() { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

const ESTADO_CFG = {
  en_espera:  { label: 'En espera',  color: 'text-amber-400  bg-amber-500/10  border-amber-500/20',  Icon: Clock        },
  notificado: { label: 'Notificado', color: 'text-blue-400   bg-blue-500/10   border-blue-500/20',   Icon: Bell         },
  reservo:    { label: 'Reservó',    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', Icon: CheckCircle2 },
  cancelo:    { label: 'Canceló',    color: 'text-slate-500  bg-slate-500/10  border-slate-500/20',  Icon: X            },
};

/* ── AddModal ─────────────────────────────────────────────────────── */
function AddModal({ onClose }) {
  const { data: barberos = [] } = useCollection('barberos');
  const { data: servicios = [] } = useCollection('servicios');
  const [form, setForm] = useState({ clienteNombre: '', clienteTelefono: '', fecha: today(), barberoId: '', servicioId: '', notas: '' });
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.clienteNombre || !form.fecha) return;
    setLoading(true);
    try {
      const barbero = barberos.find(b => b.id === form.barberoId);
      const servicio = servicios.find(s => s.id === form.servicioId);
      await addDoc(tenantCol('listaEspera'), {
        ...form,
        barberoNombre:   barbero?.nombre  || '',
        servicioNombre:  servicio?.nombre || '',
        estado:          'en_espera',
        creadoEn:        serverTimestamp(),
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <p className="text-sm font-bold text-white">Agregar a lista de espera</p>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <Field label="Nombre cliente" required>
            <input type="text" value={form.clienteNombre} onChange={e => set('clienteNombre', e.target.value)}
              placeholder="Ej: Juan Pérez" required
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none" />
          </Field>
          <Field label="Teléfono">
            <input type="tel" value={form.clienteTelefono} onChange={e => set('clienteTelefono', e.target.value)}
              placeholder="+56912345678"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none" />
          </Field>
          <Field label="Fecha deseada" required>
            <input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} min={today()} required
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none" />
          </Field>
          <Field label="Barbero (opcional)">
            <select value={form.barberoId} onChange={e => set('barberoId', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none">
              <option value="">Cualquiera</option>
              {barberos.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
            </select>
          </Field>
          <Field label="Servicio (opcional)">
            <select value={form.servicioId} onChange={e => set('servicioId', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none">
              <option value="">Sin especificar</option>
              {servicios.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </Field>
          <Field label="Notas">
            <input type="text" value={form.notas} onChange={e => set('notas', e.target.value)}
              placeholder="Ej: Prefiere mañanas"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none" />
          </Field>
          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-xl text-sm font-bold bg-emerald-500 text-emerald-950 hover:bg-emerald-400 disabled:opacity-50 transition-all">
            {loading ? 'Agregando...' : 'Agregar a lista'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

/* ── EntryCard ────────────────────────────────────────────────────── */
function EntryCard({ entry, tenantId, onUpdate }) {
  const cfg = ESTADO_CFG[entry.estado] || ESTADO_CFG.en_espera;
  const { Icon } = cfg;
  const [deleting, setDeleting] = useState(false);

  const updateEstado = async (estado) => {
    const path = tenantId === 'elegance' ? `listaEspera/${entry.id}` : `tenants/${tenantId}/listaEspera/${entry.id}`;
    await updateDoc(doc(db, path), { estado, updatedAt: serverTimestamp() });
    onUpdate?.();
  };

  const remove = async () => {
    if (!confirm(`¿Eliminar a ${entry.clienteNombre} de la lista?`)) return;
    setDeleting(true);
    const path = tenantId === 'elegance' ? `listaEspera/${entry.id}` : `tenants/${tenantId}/listaEspera/${entry.id}`;
    await deleteDoc(doc(db, path));
  };

  return (
    <div className={`bg-slate-900 border rounded-xl p-4 transition-all ${deleting ? 'opacity-40' : 'border-slate-800 hover:border-slate-700'}`}>
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-[180px] space-y-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-white">{entry.clienteNombre}</p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border inline-flex items-center gap-1 ${cfg.color}`}>
              <Icon size={10} />
              {cfg.label}
            </span>
          </div>
          {entry.clienteTelefono && <p className="text-xs text-slate-500">{entry.clienteTelefono}</p>}
          <div className="flex flex-wrap gap-2 mt-1">
            {entry.fecha && (
              <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                📅 {entry.fecha}
              </span>
            )}
            {entry.barberoNombre && (
              <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                ✂️ {entry.barberoNombre}
              </span>
            )}
            {entry.servicioNombre && (
              <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                {entry.servicioNombre}
              </span>
            )}
          </div>
          {entry.notas && <p className="text-xs text-slate-500 italic mt-1">"{entry.notas}"</p>}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {entry.estado === 'en_espera' && (
            <button onClick={() => updateEstado('notificado')}
              title="Marcar como notificado"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-all">
              <Bell size={12} />
              Notificado
            </button>
          )}
          {(entry.estado === 'en_espera' || entry.estado === 'notificado') && (
            <button onClick={() => updateEstado('reservo')}
              title="Marcar como reservó"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all">
              <CheckCircle2 size={12} />
              Reservó
            </button>
          )}
          <button onClick={remove} disabled={deleting}
            title="Eliminar"
            className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main view ────────────────────────────────────────────────────── */
export default function ListaEspera() {
  const { id: tenantId } = useTenant();
  const [showAdd, setShowAdd] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('activos');
  const [search, setSearch] = useState('');

  const { data: entries = [] } = useCollection('listaEspera');

  const filtered = useMemo(() => {
    let list = entries;
    if (filtroEstado === 'activos') list = list.filter(e => e.estado === 'en_espera' || e.estado === 'notificado');
    else if (filtroEstado !== 'todos') list = list.filter(e => e.estado === filtroEstado);
    if (search) list = list.filter(e => e.clienteNombre?.toLowerCase().includes(search.toLowerCase()) || e.clienteTelefono?.includes(search));
    return list.sort((a, b) => (a.creadoEn?.toMillis?.() || 0) - (b.creadoEn?.toMillis?.() || 0));
  }, [entries, filtroEstado, search]);

  const stats = useMemo(() => ({
    total: entries.length,
    enEspera: entries.filter(e => e.estado === 'en_espera').length,
    notificados: entries.filter(e => e.estado === 'notificado').length,
    convertidos: entries.filter(e => e.estado === 'reservo').length,
  }), [entries]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ClipboardList size={20} className="text-emerald-400" />
            <h1 className="text-xl font-bold text-white">Lista de Espera</h1>
          </div>
          <p className="text-sm text-slate-400">Clientes que esperan una hora disponible. Se notifican cuando se libera un slot.</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 transition-all">
          <Plus size={14} />
          Agregar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'En espera', value: stats.enEspera, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Notificados', value: stats.notificados, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Convirtieron', value: stats.convertidos, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Total histórico', value: stats.total, color: 'text-slate-400', bg: 'bg-slate-500/10' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
            <p className={`text-2xl font-bold mt-0.5 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
          {[
            { key: 'activos', label: 'Activos' },
            { key: 'todos', label: 'Todos' },
            { key: 'reservo', label: 'Reservaron' },
            { key: 'cancelo', label: 'Cancelaron' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setFiltroEstado(key)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${filtroEstado === key ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-[160px] bg-slate-900 border border-slate-800 rounded-lg px-3 py-2">
          <Search size={13} className="text-slate-500 shrink-0" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente..."
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none" />
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-2">
          <AlertCircle size={32} className="opacity-30" />
          <p className="text-sm">Sin entradas en la lista de espera.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(e => <EntryCard key={e.id} entry={e} tenantId={tenantId} />)}
        </div>
      )}

      {/* Info box */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/5 border border-blue-500/15">
        <Bell size={16} className="text-blue-400 mt-0.5 shrink-0" />
        <p className="text-xs text-slate-400 leading-relaxed">
          Cuando se cancela una cita, el sistema intenta notificar automáticamente al primer cliente
          en espera para la misma fecha via WhatsApp si tiene teléfono registrado.
        </p>
      </div>

      {showAdd && <AddModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}
