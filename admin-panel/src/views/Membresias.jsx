import { useState, useEffect } from 'react';
import {
  collection, onSnapshot, query, where,
  doc, updateDoc, setDoc, addDoc, getDoc, Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useTenant } from '../contexts/TenantContext';
import {
  Users, UserCheck, AlertTriangle, Plus, XCircle,
  RefreshCw, Settings, Trash2, GripVertical,
} from 'lucide-react';

/* ── Helpers ─────────────────────────────────────────────────────── */
function diasRestantes(fecha) {
  if (!fecha) return null;
  return Math.ceil((fecha.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

const INPUT_CLS = 'w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors';

/* ── Modal: Definir Planes ───────────────────────────────────────── */
function ModalPlanes({ tenantId, planesIniciales, onClose }) {
  const [planes,  setPlanes]  = useState(() =>
    planesIniciales.length
      ? planesIniciales.map(p => ({ ...p, caract: p.caracteristicas ?? [] }))
      : [{ id: Date.now(), nombre: '', precio: '', caract: [''] }]
  );
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  function addPlan() {
    setPlanes(prev => [...prev, { id: Date.now(), nombre: '', precio: '', caract: [''] }]);
  }

  function removePlan(idx) {
    setPlanes(prev => prev.filter((_, i) => i !== idx));
  }

  function updatePlan(idx, key, val) {
    setPlanes(prev => prev.map((p, i) => i === idx ? { ...p, [key]: val } : p));
  }

  function addCaract(pidx) {
    setPlanes(prev => prev.map((p, i) =>
      i === pidx ? { ...p, caract: [...p.caract, ''] } : p
    ));
  }

  function removeCaract(pidx, cidx) {
    setPlanes(prev => prev.map((p, i) =>
      i === pidx ? { ...p, caract: p.caract.filter((_, ci) => ci !== cidx) } : p
    ));
  }

  function updateCaract(pidx, cidx, val) {
    setPlanes(prev => prev.map((p, i) =>
      i === pidx
        ? { ...p, caract: p.caract.map((c, ci) => ci === cidx ? val : c) }
        : p
    ));
  }

  async function guardar() {
    const validos = planes.filter(p => p.nombre.trim());
    if (!validos.length) { setError('Define al menos un plan con nombre.'); return; }
    setLoading(true); setError('');
    try {
      const payload = validos.map((p, idx) => ({
        id:              String(p.id ?? idx),
        nombre:          p.nombre.trim(),
        precio:          Number(p.precio) || 0,
        orden:           idx,
        caracteristicas: p.caract.filter(c => c.trim()),
      }));
      await setDoc(
        doc(db, 'tenants', tenantId, 'configuracion', 'membresia'),
        { planes: payload, updatedAt: Timestamp.now() },
        { merge: true }
      );
      onClose();
    } catch (e) {
      setError(e.message || 'Error al guardar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm overflow-y-auto py-6 px-3">
      <div className="w-full max-w-3xl bg-slate-800 border border-slate-700 rounded-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div>
            <h3 className="text-white font-bold text-lg">Definir planes de membresía</h3>
            <p className="text-xs text-slate-500 mt-0.5">Los cambios se guardan en Firestore y aplican de inmediato.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700 transition-colors">
            <XCircle size={18} />
          </button>
        </div>

        {/* Planes */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[65vh]">
          {error && <p className="text-red-400 text-sm bg-red-950/30 border border-red-800/40 rounded-xl px-4 py-2">{error}</p>}

          {planes.map((plan, pidx) => (
            <div key={plan.id} className="bg-slate-900/60 border border-slate-700 rounded-xl p-4 space-y-3">

              {/* Cabecera del plan */}
              <div className="flex items-center gap-3">
                <GripVertical size={16} className="text-slate-600 shrink-0" />
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Nombre del plan</label>
                    <input
                      value={plan.nombre}
                      onChange={e => updatePlan(pidx, 'nombre', e.target.value)}
                      placeholder="Ej. Básico, Premium…"
                      className={INPUT_CLS}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Precio mensual (CLP)</label>
                    <input
                      type="number"
                      value={plan.precio}
                      onChange={e => updatePlan(pidx, 'precio', e.target.value)}
                      placeholder="5900"
                      className={INPUT_CLS}
                    />
                  </div>
                </div>
                <button
                  onClick={() => removePlan(pidx)}
                  className="p-2 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-950/30 transition-colors shrink-0"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Características */}
              <div className="pl-7 space-y-2">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Características</p>
                {plan.caract.map((c, cidx) => (
                  <div key={cidx} className="flex items-center gap-2">
                    <span className="text-emerald-500 text-xs shrink-0">✓</span>
                    <input
                      value={c}
                      onChange={e => updateCaract(pidx, cidx, e.target.value)}
                      placeholder={`Característica ${cidx + 1}`}
                      className={INPUT_CLS + ' flex-1'}
                    />
                    <button
                      onClick={() => removeCaract(pidx, cidx)}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 transition-colors shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addCaract(pidx)}
                  className="flex items-center gap-1.5 text-xs text-emerald-500 hover:text-emerald-400 transition-colors mt-1"
                >
                  <Plus size={13} /> Agregar característica
                </button>
              </div>

            </div>
          ))}

          <button
            onClick={addPlan}
            className="w-full py-3 border-2 border-dashed border-slate-700 rounded-xl text-sm font-medium text-slate-500 hover:border-emerald-700 hover:text-emerald-500 transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={16} /> Agregar plan
          </button>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-slate-700">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-400 text-sm font-medium hover:bg-slate-700 transition-colors">
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-500 transition-colors disabled:opacity-50"
          >
            {loading ? 'Guardando…' : 'Guardar planes'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Modal: Activar membresía ────────────────────────────────────── */
function ModalActivar({ tenantId, planes, onClose }) {
  const [uid,     setUid]     = useState('');
  const [nombre,  setNombre]  = useState('');
  const [planId,  setPlanId]  = useState(planes[0]?.id ?? '');
  const [periodo, setPeriodo] = useState('mensual');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  async function activar() {
    if (!uid.trim() || !nombre.trim()) { setError('UID y nombre son obligatorios.'); return; }
    if (!planId) { setError('Selecciona un plan.'); return; }
    setLoading(true); setError('');
    try {
      const meses = periodo === 'anual' ? 12 : 1;
      const vence = new Date();
      vence.setMonth(vence.getMonth() + meses);
      const planObj = planes.find(p => p.id === planId);

      await updateDoc(doc(db, 'tenants', tenantId, 'users', uid.trim()), {
        esMiembro:                 true,
        planMembresia:             planId,
        planNombre:                planObj?.nombre ?? planId,
        fechaVencimientoMembresia: Timestamp.fromDate(vence),
        noRenovar:                 false,
      });
      await addDoc(collection(db, 'membresias', tenantId, 'pagos'), {
        clienteId:   uid.trim(),
        nombre:      nombre.trim(),
        plan:        planId,
        planNombre:  planObj?.nombre ?? planId,
        periodo,
        monto:       planObj ? (periodo === 'anual' ? (planObj.precio * 10) : planObj.precio) : 0,
        fechaPago:   Timestamp.now(),
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
            <input value={uid} onChange={e => setUid(e.target.value)} placeholder="Firebase UID" className={INPUT_CLS} />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Nombre</label>
            <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre del cliente" className={INPUT_CLS} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Plan</label>
              <select value={planId} onChange={e => setPlanId(e.target.value)} className={INPUT_CLS}>
                {planes.length
                  ? planes.map(p => <option key={p.id} value={p.id}>{p.nombre} — ${p.precio?.toLocaleString('es-CL')}</option>)
                  : <option value="">Sin planes definidos</option>
                }
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Período</label>
              <select value={periodo} onChange={e => setPeriodo(e.target.value)} className={INPUT_CLS}>
                <option value="mensual">Mensual</option>
                <option value="anual">Anual (−2 meses)</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-400 text-sm font-medium hover:bg-slate-700 transition-colors">
            Cancelar
          </button>
          <button onClick={activar} disabled={loading || !planes.length}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-500 transition-colors disabled:opacity-50">
            {loading ? 'Activando…' : 'Activar'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Fila de miembro ─────────────────────────────────────────────── */
function FilaMiembro({ miembro, tenantId, planes }) {
  const dias    = diasRestantes(miembro.fechaVencimientoMembresia?.toDate());
  const vencido  = dias !== null && dias <= 0;
  const porVencer = dias !== null && dias > 0 && dias <= 7;
  const planObj  = planes.find(p => p.id === miembro.planMembresia);
  const planLabel = planObj?.nombre ?? miembro.planNombre ?? miembro.planMembresia ?? '—';

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
    await updateDoc(doc(db, 'tenants', tenantId, 'users', miembro.uid), { esMiembro: false });
  }

  return (
    <tr className={`border-b border-slate-800 transition-colors ${vencido ? 'bg-red-950/15' : porVencer ? 'bg-amber-950/10' : ''}`}>
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-white">{miembro.nombre || '—'}</p>
        <p className="text-xs text-slate-500 truncate max-w-[160px]">{miembro.uid}</p>
      </td>
      <td className="px-4 py-3">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-slate-700/50 text-slate-300">
          {planLabel}
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
          <button onClick={extender} title="Extender 1 mes"
            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-950/30 transition-colors">
            <RefreshCw size={14} />
          </button>
          <button onClick={desactivar} title="Desactivar"
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
  const [miembros,     setMiembros]     = useState([]);
  const [planes,       setPlanes]       = useState([]);
  const [loadingM,     setLoadingM]     = useState(true);
  const [modalActivar, setModalActivar] = useState(false);
  const [modalPlanes,  setModalPlanes]  = useState(false);

  // Planes desde Firestore
  useEffect(() => {
    const ref = doc(db, 'tenants', tenant.id, 'configuracion', 'membresia');
    const unsub = onSnapshot(ref, snap => {
      setPlanes(snap.exists() ? (snap.data().planes ?? []) : []);
    });
    return unsub;
  }, [tenant.id]);

  // Miembros desde Firestore
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
      setLoadingM(false);
    }, () => setLoadingM(false));
    return unsub;
  }, [tenant.id]);

  const ahora     = Date.now();
  const activos   = miembros.filter(m => (m.fechaVencimientoMembresia?.toDate()?.getTime() ?? 0) > ahora);
  const vencidos  = miembros.filter(m => (m.fechaVencimientoMembresia?.toDate()?.getTime() ?? 0) <= ahora);
  const porVencer = activos.filter(m => diasRestantes(m.fechaVencimientoMembresia?.toDate()) <= 7);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">

      {/* Encabezado */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{tenant.name}</p>
          <h1 className="text-2xl font-bold text-white">Membresías</h1>
        </div>
        <button
          onClick={() => setModalPlanes(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-600 text-slate-400 text-sm font-medium hover:text-white hover:border-slate-500 transition-colors"
        >
          <Settings size={15} /> Definir planes
        </button>
      </div>

      {/* Planes activos (preview) */}
      {planes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {planes.map(p => (
            <div key={p.id} className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-white">{p.nombre}</span>
                <span className="text-emerald-400 font-bold text-sm">
                  ${(p.precio ?? 0).toLocaleString('es-CL')}<span className="text-slate-500 text-xs font-normal">/mes</span>
                </span>
              </div>
              <ul className="space-y-1">
                {(p.caracteristicas ?? []).slice(0, 4).map((c, i) => (
                  <li key={i} className="flex items-center gap-1.5 text-xs text-slate-400">
                    <span className="text-emerald-500 shrink-0">✓</span>{c}
                  </li>
                ))}
                {(p.caracteristicas ?? []).length > 4 && (
                  <li className="text-xs text-slate-600">+{p.caracteristicas.length - 4} más…</li>
                )}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 text-emerald-400 mb-1">
            <UserCheck size={15} /><span className="text-[10px] font-bold uppercase tracking-widest">Activos</span>
          </div>
          <p className="text-3xl font-black text-white">{activos.length}</p>
        </div>
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 text-amber-400 mb-1">
            <AlertTriangle size={15} /><span className="text-[10px] font-bold uppercase tracking-widest">Por vencer</span>
          </div>
          <p className="text-3xl font-black text-white">{porVencer.length}</p>
        </div>
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 text-red-400 mb-1">
            <XCircle size={15} /><span className="text-[10px] font-bold uppercase tracking-widest">Vencidos</span>
          </div>
          <p className="text-3xl font-black text-white">{vencidos.length}</p>
        </div>
      </div>

      {/* Tabla miembros */}
      <div className="bg-slate-800/40 border border-slate-700 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-slate-400" />
            <span className="text-sm font-bold text-white">Miembros</span>
          </div>
          <button
            onClick={() => setModalActivar(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors"
          >
            <Plus size={14} />Activar
          </button>
        </div>

        {loadingM ? (
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
                  <FilaMiembro key={m.uid} miembro={m} tenantId={tenant.id} planes={planes} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modales */}
      {modalPlanes  && <ModalPlanes  tenantId={tenant.id} planesIniciales={planes} onClose={() => setModalPlanes(false)}  />}
      {modalActivar && <ModalActivar tenantId={tenant.id} planes={planes}          onClose={() => setModalActivar(false)} />}
    </div>
  );
}
