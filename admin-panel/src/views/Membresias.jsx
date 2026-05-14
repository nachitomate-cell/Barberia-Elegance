import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, doc, updateDoc, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useTenant } from '../contexts/TenantContext';
import { Users, UserCheck, AlertTriangle, Plus, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

const PLANES = {
  basico:  { label: 'Básico',  descuento: 10, color: 'text-slate-300', bg: 'bg-slate-700/50'  },
  premium: { label: 'Premium', descuento: 15, color: 'text-amber-400',  bg: 'bg-amber-900/30' },
};

function diasRestantes(fecha) {
  if (!fecha) return null;
  const diff = fecha.getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/* ── Modal activar membresía ─────────────────────────────────────── */
function ModalActivar({ tenantId, onClose }) {
  const [uid,     setUid]     = useState('');
  const [nombre,  setNombre]  = useState('');
  const [plan,    setPlan]    = useState('basico');
  const [periodo, setPeriodo] = useState('mensual');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  async function activar() {
    if (!uid.trim() || !nombre.trim()) { setError('UID y nombre son obligatorios.'); return; }
    setLoading(true); setError('');
    try {
      const meses = periodo === 'anual' ? 12 : 1;
      const vence = new Date();
      vence.setMonth(vence.getMonth() + meses);

      await updateDoc(doc(db, 'tenants', tenantId, 'users', uid.trim()), {
        esMiembro:                true,
        planMembresia:            plan,
        fechaVencimientoMembresia: Timestamp.fromDate(vence),
        noRenovar:                false,
      });
      await addDoc(collection(db, 'membresias', tenantId, 'pagos'), {
        clienteId:  uid.trim(),
        nombre:     nombre.trim(),
        plan,
        periodo,
        monto:      plan === 'premium' ? (periodo === 'anual' ? 99000 : 9900) : (periodo === 'anual' ? 59000 : 5900),
        fechaPago:  Timestamp.now(),
        vencimiento: Timestamp.fromDate(vence),
      });
      onClose();
    } catch (e) {
      setError(e.message || 'Error al activar membresía.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl p-6 space-y-4">
        <h3 className="text-white font-bold text-lg">Activar membresía</h3>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">UID del cliente</label>
            <input
              value={uid} onChange={e => setUid(e.target.value)} placeholder="Firebase UID"
              className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Nombre</label>
            <input
              value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre del cliente"
              className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Plan</label>
              <select value={plan} onChange={e => setPlan(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500">
                <option value="basico">Básico</option>
                <option value="premium">Premium</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Período</label>
              <select value={periodo} onChange={e => setPeriodo(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500">
                <option value="mensual">Mensual</option>
                <option value="anual">Anual</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-400 text-sm font-medium hover:bg-slate-700 transition-colors">
            Cancelar
          </button>
          <button onClick={activar} disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-500 transition-colors disabled:opacity-50">
            {loading ? 'Activando…' : 'Activar'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Fila de miembro ─────────────────────────────────────────────── */
function FilaMiembro({ miembro, tenantId }) {
  const dias = diasRestantes(miembro.fechaVencimientoMembresia?.toDate());
  const vencido = dias !== null && dias <= 0;
  const porVencer = dias !== null && dias > 0 && dias <= 7;
  const plan = PLANES[miembro.planMembresia] ?? PLANES.basico;

  async function extender() {
    const vence = miembro.fechaVencimientoMembresia?.toDate() ?? new Date();
    if (vence < new Date()) vence.setTime(Date.now());
    vence.setMonth(vence.getMonth() + 1);
    await updateDoc(doc(db, 'tenants', tenantId, 'users', miembro.uid), {
      fechaVencimientoMembresia: Timestamp.fromDate(vence),
      noRenovar: false,
    });
  }

  async function desactivar() {
    if (!window.confirm(`¿Desactivar membresía de ${miembro.nombre || miembro.uid}?`)) return;
    await updateDoc(doc(db, 'tenants', tenantId, 'users', miembro.uid), {
      esMiembro: false,
    });
  }

  return (
    <tr className={`border-b border-slate-800 transition-colors ${vencido ? 'bg-red-950/15' : porVencer ? 'bg-amber-950/10' : ''}`}>
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-white">{miembro.nombre || '—'}</p>
        <p className="text-xs text-slate-500 truncate max-w-[160px]">{miembro.uid}</p>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${plan.bg} ${plan.color}`}>
          {plan.label}
        </span>
      </td>
      <td className="px-4 py-3 text-sm">
        {miembro.fechaVencimientoMembresia
          ? (() => {
              const d = miembro.fechaVencimientoMembresia.toDate();
              return (
                <span className={vencido ? 'text-red-400' : porVencer ? 'text-amber-400' : 'text-slate-300'}>
                  {d.toLocaleDateString('es-CL')}
                  {porVencer && <span className="ml-1 text-xs">({dias}d)</span>}
                  {vencido   && <span className="ml-1 text-xs">(vencida)</span>}
                </span>
              );
            })()
          : <span className="text-slate-600">—</span>
        }
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button onClick={extender}
            title="Extender 1 mes"
            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-950/30 transition-colors">
            <RefreshCw size={14} />
          </button>
          <button onClick={desactivar}
            title="Desactivar"
            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition-colors">
            <XCircle size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}

/* ── Vista principal ─────────────────────────────────────────────── */
export default function Membresias() {
  const tenant = useTenant();
  const [miembros,    setMiembros]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [modalOpen,   setModalOpen]   = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'tenants', tenant.id, 'users'),
      where('esMiembro', '==', true),
    );
    const unsub = onSnapshot(q, snap => {
      const docs = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
      docs.sort((a, b) => {
        const ta = a.fechaVencimientoMembresia?.toDate()?.getTime() ?? 0;
        const tb = b.fechaVencimientoMembresia?.toDate()?.getTime() ?? 0;
        return ta - tb;
      });
      setMiembros(docs);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [tenant.id]);

  const ahora = Date.now();
  const activos   = miembros.filter(m => (m.fechaVencimientoMembresia?.toDate()?.getTime() ?? 0) > ahora);
  const vencidos  = miembros.filter(m => (m.fechaVencimientoMembresia?.toDate()?.getTime() ?? 0) <= ahora);
  const porVencer = activos.filter(m => diasRestantes(m.fechaVencimientoMembresia?.toDate()) <= 7);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">

      {/* Encabezado */}
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{tenant.name}</p>
        <h1 className="text-2xl font-bold text-white">Membresías</h1>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-emerald-400 mb-1">
            <UserCheck size={16} /><span className="text-xs font-bold uppercase tracking-widest">Activos</span>
          </div>
          <p className="text-3xl font-black text-white">{activos.length}</p>
        </div>
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-amber-400 mb-1">
            <AlertTriangle size={16} /><span className="text-xs font-bold uppercase tracking-widest">Por vencer</span>
          </div>
          <p className="text-3xl font-black text-white">{porVencer.length}</p>
        </div>
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-red-400 mb-1">
            <XCircle size={16} /><span className="text-xs font-bold uppercase tracking-widest">Vencidos</span>
          </div>
          <p className="text-3xl font-black text-white">{vencidos.length}</p>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-slate-800/40 border border-slate-700 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-slate-400" />
            <span className="text-sm font-bold text-white">Miembros</span>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors"
          >
            <Plus size={14} />Activar
          </button>
        </div>

        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : miembros.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">Sin miembros registrados aún.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                  <th className="px-4 py-2">Cliente</th>
                  <th className="px-4 py-2">Plan</th>
                  <th className="px-4 py-2">Vencimiento</th>
                  <th className="px-4 py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {miembros.map(m => (
                  <FilaMiembro key={m.uid} miembro={m} tenantId={tenant.id} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && <ModalActivar tenantId={tenant.id} onClose={() => setModalOpen(false)} />}
    </div>
  );
}
