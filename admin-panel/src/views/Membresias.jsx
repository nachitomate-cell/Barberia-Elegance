import { useState, useEffect, useMemo } from 'react';
import {
  collection, onSnapshot, query, where,
  doc, updateDoc, setDoc, addDoc, Timestamp, limit
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useTenant } from '../contexts/TenantContext';
import {
  Users, UserCheck, AlertTriangle, Plus, XCircle,
  RefreshCw, Settings, Trash2, GripVertical, Search,
  DollarSign, CreditCard, Check, ShieldCheck, HelpCircle
} from 'lucide-react';

/* ── Helpers ─────────────────────────────────────────────────────── */
function diasRestantes(fecha) {
  if (!fecha) return null;
  return Math.ceil((fecha.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

const INPUT_CLS = 'w-full bg-slate-900 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500/80 transition-all shadow-inner placeholder:text-slate-500';

/* ── Modal: Confirmar y Registrar Extensión de Membresía ─────────── */
function ModalConfirmarExtender({ miembro, tenantId, planes, onClose, onConfirm }) {
  const planObj = planes.find(p => p.id === miembro.planMembresia);
  const montoPlan = planObj?.precio ?? 0;
  const [metodo, setMetodo] = useState('transferencia'); // 'transferencia' | 'efectivo' | 'tarjeta' | 'ninguno'
  const [loading, setLoading] = useState(false);

  const fechaActualVence = miembro.fechaVencimientoMembresia?.toDate() ?? new Date();
  const nuevaFecha = new Date(fechaActualVence < new Date() ? Date.now() : fechaActualVence.getTime());
  nuevaFecha.setMonth(nuevaFecha.getMonth() + 1);

  async function procesar() {
    setLoading(true);
    try {
      // 1. Actualizar vencimiento de membresía
      await updateDoc(doc(db, 'tenants', tenantId, 'users', miembro.uid), {
        fechaVencimientoMembresia: Timestamp.fromDate(nuevaFecha),
        noRenovar: false,
      });

      // 2. Registrar el pago en Firestore si no es de cortesía
      if (metodo !== 'ninguno') {
        await addDoc(collection(db, 'membresias', tenantId, 'pagos'), {
          clienteId:   miembro.uid,
          nombre:      miembro.nombre || 'Cliente',
          plan:        miembro.planMembresia || '',
          planNombre:  planObj?.nombre ?? miembro.planNombre ?? 'Membresía',
          periodo:     'mensual',
          monto:       montoPlan,
          metodoPago:  metodo,
          fechaPago:   Timestamp.now(),
          vencimiento: Timestamp.fromDate(nuevaFecha),
        });
      }
      onConfirm();
    } catch (e) {
      console.error(e);
      alert('Error al extender la membresía.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-md bg-slate-800 border border-slate-700/80 rounded-2xl p-6 space-y-4 shadow-2xl relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-1">
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            <RefreshCw size={18} className="text-emerald-400 animate-spin-slow" />
            Extender membresía
          </h3>
          <p className="text-xs text-slate-400">Cliente: <strong className="text-white">{miembro.nombre || '—'}</strong></p>
        </div>

        <div className="bg-slate-900/80 border border-slate-700/40 rounded-xl p-4 space-y-2.5 text-sm text-slate-300">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Vencimiento actual:</span>
            <span className="font-semibold text-slate-200">{fechaActualVence.toLocaleDateString('es-CL')}</span>
          </div>
          <div className="flex justify-between items-center text-emerald-400">
            <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Nuevo vencimiento (+1 mes):</span>
            <span className="font-bold flex items-center gap-1">
              {nuevaFecha.toLocaleDateString('es-CL')}
            </span>
          </div>
          {montoPlan > 0 && (
            <div className="flex justify-between items-center pt-2.5 border-t border-slate-800">
              <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Monto a cobrar:</span>
              <span className="font-black text-white text-base">${montoPlan.toLocaleString('es-CL')}</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Método de registro de pago</label>
          <select value={metodo} onChange={e => setMetodo(e.target.value)} className={INPUT_CLS}>
            <option value="transferencia">📲 Transferencia Bancaria</option>
            <option value="efectivo">💵 Efectivo</option>
            <option value="tarjeta">💳 Tarjeta de Débito/Crédito</option>
            <option value="ninguno">⚠️ Extender gratis (Cortesía / Sin registrar pago)</option>
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 text-sm font-semibold hover:bg-slate-700 hover:text-white transition-all">
            Cancelar
          </button>
          <button onClick={procesar} disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-all shadow-lg shadow-emerald-950/20 disabled:opacity-50">
            {loading ? 'Procesando…' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}

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
      <div className="w-full max-w-3xl bg-slate-800 border border-slate-700/80 rounded-2xl shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-750">
          <div>
            <h3 className="text-white font-bold text-lg">Definir planes de membresía</h3>
            <p className="text-xs text-slate-500 mt-0.5">Los cambios se guardan en Firestore y aplican de inmediato.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700 transition-all">
            <XCircle size={18} />
          </button>
        </div>

        {/* Planes */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[65vh]">
          {error && <p className="text-red-400 text-sm bg-red-950/30 border border-red-800/40 rounded-xl px-4 py-2">{error}</p>}

          {planes.map((plan, pidx) => (
            <div key={plan.id} className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 space-y-3 relative">
              
              {/* Cabecera del plan */}
              <div className="flex items-center gap-3">
                <GripVertical size={16} className="text-slate-600 shrink-0 cursor-grab" />
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
                  className="p-2.5 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition-all shrink-0"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Características */}
              <div className="pl-7 space-y-2">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Características</p>
                {plan.caract.map((c, cidx) => (
                  <div key={cidx} className="flex items-center gap-2">
                    <span className="text-emerald-500 text-xs shrink-0 font-bold">✓</span>
                    <input
                      value={c}
                      onChange={e => updateCaract(pidx, cidx, e.target.value)}
                      placeholder={`Característica ${cidx + 1}`}
                      className={INPUT_CLS + ' py-2 flex-1'}
                    />
                    <button
                      onClick={() => removeCaract(pidx, cidx)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 transition-colors shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addCaract(pidx)}
                  className="flex items-center gap-1.5 text-xs text-emerald-500 hover:text-emerald-400 transition-colors mt-1 font-semibold"
                >
                  <Plus size={13} /> Agregar característica
                </button>
              </div>

            </div>
          ))}

          <button
            onClick={addPlan}
            className="w-full py-3.5 border-2 border-dashed border-slate-700 hover:border-emerald-700/80 rounded-xl text-sm font-bold text-slate-500 hover:text-emerald-500 transition-all flex items-center justify-center gap-2 bg-slate-900/10 hover:bg-slate-900/30"
          >
            <Plus size={16} /> Agregar plan
          </button>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-slate-750">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 text-sm font-semibold hover:bg-slate-700 hover:text-white transition-all">
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-500 transition-all disabled:opacity-50 shadow-lg shadow-emerald-950/20"
          >
            {loading ? 'Guardando…' : 'Guardar planes'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Modal: Activar membresía con Autocompletado ──────────────────── */
function ModalActivar({ tenantId, planes, onClose }) {
  const [uid,     setUid]     = useState('');
  const [nombre,  setNombre]  = useState('');
  const [planId,  setPlanId]  = useState(planes[0]?.id ?? '');
  const [periodo, setPeriodo] = useState('mensual');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  // Estados para búsqueda de clientes
  const [todosUsuarios, setTodosUsuarios] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  // Cargar clientes del tenant
  useEffect(() => {
    setBuscando(true);
    const ref = collection(db, 'tenants', tenantId, 'users');
    const unsub = onSnapshot(ref, snap => {
      const uList = snap.docs.map(d => ({
        uid:       d.id,
        nombre:    d.data().nombre || 'Cliente sin nombre',
        telefono:  d.data().telefono || '',
        esMiembro: d.data().esMiembro || false,
      }));
      setTodosUsuarios(uList);
      setBuscando(false);
    }, () => setBuscando(false));
    return unsub;
  }, [tenantId]);

  // Filtrar sugerencias en memoria (instantáneo)
  const suggestions = useMemo(() => {
    if (searchVal.trim() === '' || selectedUser) return [];
    const term = searchVal.toLowerCase();
    return todosUsuarios
      .filter(u => 
        (u.nombre.toLowerCase().includes(term) ||
         u.uid.toLowerCase().includes(term) ||
         u.telefono.includes(term)) &&
        !u.esMiembro // No sugerir si ya es miembro activo
      )
      .slice(0, 5);
  }, [searchVal, todosUsuarios, selectedUser]);

  function handleSelectUser(u) {
    setSelectedUser(u);
    setUid(u.uid);
    setNombre(u.nombre);
    setSearchVal(u.nombre);
  }

  function handleClearUser() {
    setSelectedUser(null);
    setUid('');
    setNombre('');
    setSearchVal('');
  }

  async function activar() {
    if (!uid.trim() || !nombre.trim()) { setError('Selecciona o busca un cliente válido.'); return; }
    if (!planId) { setError('Selecciona un plan de membresía.'); return; }
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
      <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl p-6 space-y-4 shadow-2xl relative">
        <h3 className="text-white font-bold text-lg flex items-center gap-2">
          <ShieldCheck className="text-emerald-400" size={20} />
          Activar membresía
        </h3>
        {error && <p className="text-red-400 text-xs bg-red-950/20 border border-red-900/30 rounded-lg px-3 py-2">{error}</p>}
        
        <div className="space-y-3.5">
          {/* Campo de búsqueda reactivo */}
          <div className="relative">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Buscar Cliente</label>
            <div className="relative">
              <input 
                value={searchVal} 
                onChange={e => {
                  setSearchVal(e.target.value);
                  if (selectedUser) handleClearUser();
                }}
                disabled={buscando}
                placeholder="Escribe el nombre o teléfono del cliente…" 
                className={INPUT_CLS + (selectedUser ? ' border-emerald-500/80 pr-10 text-emerald-400 font-semibold' : ' pr-8')} 
              />
              {selectedUser ? (
                <button 
                  onClick={handleClearUser}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-red-400 text-xs font-bold transition-all p-0.5 rounded"
                >
                  Cambiar
                </button>
              ) : (
                <Search size={16} className="absolute right-3 top-3 text-slate-500 pointer-events-none" />
              )}
            </div>

            {/* Sugerencias flotantes */}
            {suggestions.length > 0 && (
              <div className="absolute z-10 left-0 right-0 mt-1.5 bg-slate-900 border border-slate-750 rounded-xl overflow-hidden shadow-2xl max-h-48 overflow-y-auto">
                {suggestions.map(u => (
                  <button
                    key={u.uid}
                    onClick={() => handleSelectUser(u)}
                    className="w-full text-left px-4 py-2.5 hover:bg-slate-800 text-sm text-slate-300 flex flex-col transition-colors border-b border-slate-800/40"
                  >
                    <span className="font-semibold text-white">{u.nombre}</span>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <span>UID: {u.uid.slice(0, 10)}...</span>
                      {u.telefono && <span>• Tel: {u.telefono}</span>}
                    </span>
                  </button>
                ))}
              </div>
            )}
            
            {searchVal && !selectedUser && suggestions.length === 0 && !buscando && (
              <p className="text-[10px] text-slate-500 mt-1 pl-1">Presiona "Crear un nuevo cliente" si es una cuenta nueva, o busca otro término.</p>
            )}
          </div>

          {/* Campos de Nombre y UID (Lectura o edición manual si lo desean) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Nombre</label>
              <input 
                value={nombre} 
                onChange={e => setNombre(e.target.value)} 
                placeholder="Nombre" 
                className={INPUT_CLS + ' py-2'} 
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">UID</label>
              <input 
                value={uid} 
                onChange={e => setUid(e.target.value)} 
                placeholder="Firebase UID" 
                className={INPUT_CLS + ' py-2 text-slate-400 font-mono text-xs'} 
              />
            </div>
          </div>

          {/* Config de Plan y Periodo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Plan</label>
              <select value={planId} onChange={e => setPlanId(e.target.value)} className={INPUT_CLS + ' py-2'}>
                {planes.length
                  ? planes.map(p => <option key={p.id} value={p.id}>{p.nombre} — ${p.precio?.toLocaleString('es-CL')}</option>)
                  : <option value="">Sin planes definidos</option>
                }
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Período</label>
              <select value={periodo} onChange={e => setPeriodo(e.target.value)} className={INPUT_CLS + ' py-2'}>
                <option value="mensual">Mensual</option>
                <option value="anual">Anual (10 meses)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 text-sm font-semibold hover:bg-slate-700 hover:text-white transition-all">
            Cancelar
          </button>
          <button onClick={activar} disabled={loading || !planes.length}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-all disabled:opacity-50 shadow-lg shadow-emerald-950/20">
            {loading ? 'Activando…' : 'Activar'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Fila de miembro ─────────────────────────────────────────────── */
function FilaMiembro({ miembro, planes, onExtenderClick, onDesactivarClick }) {
  const dias    = diasRestantes(miembro.fechaVencimientoMembresia?.toDate());
  const vencido  = dias !== null && dias <= 0;
  const porVencer = dias !== null && dias > 0 && dias <= 7;
  const planObj  = planes.find(p => p.id === miembro.planMembresia);
  const planLabel = planObj?.nombre ?? miembro.planNombre ?? miembro.planMembresia ?? '—';

  return (
    <tr className={`border-b border-slate-800/60 hover:bg-slate-800/10 transition-all ${vencido ? 'bg-red-950/10' : porVencer ? 'bg-amber-950/10' : ''}`}>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2">
          <div>
            <p className="text-sm font-semibold text-white">{miembro.nombre || '—'}</p>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5 truncate max-w-[150px]">{miembro.uid}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 border border-slate-700 text-slate-300">
          {planLabel}
        </span>
      </td>
      <td className="px-4 py-3.5 text-sm">
        {miembro.fechaVencimientoMembresia
          ? (() => {
              const d = miembro.fechaVencimientoMembresia.toDate();
              return (
                <span className={`font-semibold ${vencido ? 'text-red-400' : porVencer ? 'text-amber-400' : 'text-slate-300'}`}>
                  {d.toLocaleDateString('es-CL')}
                  {porVencer && <span className="ml-1.5 text-xs text-amber-500 font-black animate-pulse">({dias}d)</span>}
                  {vencido   && <span className="ml-1.5 text-xs text-red-500 font-black">(vencida)</span>}
                </span>
              );
            })()
          : <span className="text-slate-600">—</span>
        }
      </td>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => onExtenderClick(miembro)} 
            title="Extender membresía y cobrar"
            className="p-2 rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-emerald-950/30 transition-all"
          >
            <RefreshCw size={14} className="hover:rotate-180 transition-all duration-300" />
          </button>
          <button 
            onClick={() => onDesactivarClick(miembro)} 
            title="Desactivar membresía"
            className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition-all"
          >
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

  // Estados de Extensión de Cita
  const [miembroExtender, setMiembroExtender] = useState(null);

  // Estados de Búsqueda y Filtro
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos'); // 'todos' | 'activos' | 'porVencer' | 'vencidos'

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

  // Cálculos de métricas
  const ahora = Date.now();
  const activos = useMemo(() => miembros.filter(m => (m.fechaVencimientoMembresia?.toDate()?.getTime() ?? 0) > ahora), [miembros, ahora]);
  const vencidos = useMemo(() => miembros.filter(m => (m.fechaVencimientoMembresia?.toDate()?.getTime() ?? 0) <= ahora), [miembros, ahora]);
  const porVencer = useMemo(() => activos.filter(m => {
    const dias = diasRestantes(m.fechaVencimientoMembresia?.toDate());
    return dias !== null && dias <= 7;
  }), [activos]);

  // Cálculo de MRR recurrente proyectado
  const mrrProyectado = useMemo(() => {
    return activos.reduce((sum, m) => {
      const plan = planes.find(p => p.id === m.planMembresia);
      return sum + (plan?.precio || 0);
    }, 0);
  }, [activos, planes]);

  // Filtrado reactivo de miembros para la tabla
  const miembrosFiltrados = useMemo(() => {
    return miembros
      .filter(m => {
        const vencimiento = m.fechaVencimientoMembresia?.toDate();
        const dias = diasRestantes(vencimiento);
        const isActivo = vencimiento && vencimiento.getTime() > ahora;

        if (statusFilter === 'activos') return isActivo;
        if (statusFilter === 'porVencer') return isActivo && dias !== null && dias <= 7;
        if (statusFilter === 'vencidos') return !isActivo;
        return true;
      })
      .filter(m => {
        const term = searchTerm.toLowerCase().trim();
        if (!term) return true;
        return (m.nombre || '').toLowerCase().includes(term) || m.uid.toLowerCase().includes(term);
      });
  }, [miembros, statusFilter, searchTerm, ahora]);

  async function handleDesactivarMiembro(miembro) {
    if (!window.confirm(`¿Seguro que deseas desactivar la membresía de ${miembro.nombre || miembro.uid}?`)) return;
    try {
      await updateDoc(doc(db, 'tenants', tenant.id, 'users', miembro.uid), { esMiembro: false });
    } catch (e) {
      console.error(e);
      alert('Error al desactivar membresía.');
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">

      {/* Encabezado */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{tenant.name}</p>
          <h1 className="text-2xl font-black text-white tracking-tight">Membresías</h1>
        </div>
        <button
          onClick={() => setModalPlanes(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700/80 text-slate-400 text-sm font-semibold hover:text-white hover:border-slate-500 hover:bg-slate-900/40 transition-all shadow-sm"
        >
          <Settings size={15} /> Definir planes
        </button>
      </div>

      {/* Planes activos (preview) */}
      {planes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {planes.map(p => (
            <div key={p.id} className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4 shadow-sm relative overflow-hidden group hover:border-slate-600 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">{p.nombre}</span>
                <span className="text-emerald-400 font-extrabold text-sm flex items-center">
                  ${(p.precio ?? 0).toLocaleString('es-CL')}<span className="text-slate-500 text-xs font-normal ml-0.5">/mes</span>
                </span>
              </div>
              <ul className="space-y-1">
                {(p.caracteristicas ?? []).slice(0, 4).map((c, i) => (
                  <li key={i} className="flex items-center gap-1.5 text-xs text-slate-400">
                    <span className="text-emerald-500 font-bold shrink-0">✓</span>{c}
                  </li>
                ))}
                {(p.caracteristicas ?? []).length > 4 && (
                  <li className="text-[10px] text-slate-600 pl-4 mt-0.5">+{p.caracteristicas.length - 4} características más</li>
                )}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Grid de Métricas Premium */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* MRR Proyectado */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4 shadow-md relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all" />
          <div className="flex items-center gap-2 text-emerald-400 mb-1">
            <DollarSign size={15} /><span className="text-[10px] font-bold uppercase tracking-widest">MRR Recurrente</span>
          </div>
          <p className="text-xl md:text-2xl font-black text-white">${mrrProyectado.toLocaleString('es-CL')}</p>
        </div>

        {/* Miembros Activos */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4 shadow-md relative overflow-hidden group">
          <div className="flex items-center gap-2 text-indigo-400 mb-1">
            <UserCheck size={15} /><span className="text-[10px] font-bold uppercase tracking-widest">Activos</span>
          </div>
          <p className="text-2xl font-black text-white">{activos.length}</p>
        </div>

        {/* Por vencer */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4 shadow-md relative overflow-hidden group">
          <div className="flex items-center gap-2 text-amber-400 mb-1">
            <AlertTriangle size={15} /><span className="text-[10px] font-bold uppercase tracking-widest">Por vencer</span>
          </div>
          <p className="text-2xl font-black text-white">{porVencer.length}</p>
        </div>

        {/* Vencidos */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4 shadow-md relative overflow-hidden group">
          <div className="flex items-center gap-2 text-red-400 mb-1">
            <XCircle size={15} /><span className="text-[10px] font-bold uppercase tracking-widest">Vencidos</span>
          </div>
          <p className="text-2xl font-black text-white">{vencidos.length}</p>
        </div>
      </div>

      {/* Contenedor Tabla Miembros con Filtros */}
      <div className="bg-slate-800/40 border border-slate-700/80 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm">
        
        {/* Barra de Filtros y Acciones */}
        <div className="px-5 py-4 border-b border-slate-750 flex flex-col gap-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-slate-400" />
              <span className="text-sm font-bold text-white">Listado de Miembros</span>
            </div>
            <button
              onClick={() => setModalActivar(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-950/20 active:scale-95"
            >
              <Plus size={14} /> Activar Membresía
            </button>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            {/* Input de Búsqueda rápida */}
            <div className="relative flex-1">
              <input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar por cliente o UID…"
                className={INPUT_CLS + ' py-2 pl-9 pr-4 text-xs'}
              />
              <Search size={14} className="absolute left-3.5 top-3 text-slate-500" />
            </div>

            {/* Tab segmentados por Estado */}
            <div className="flex bg-slate-900 border border-slate-750 p-1 rounded-xl text-xs overflow-x-auto shrink-0">
              <button
                onClick={() => setStatusFilter('todos')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${statusFilter === 'todos' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Todos ({miembros.length})
              </button>
              <button
                onClick={() => setStatusFilter('activos')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${statusFilter === 'activos' ? 'bg-slate-800 text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Activos ({activos.length})
              </button>
              <button
                onClick={() => setStatusFilter('porVencer')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${statusFilter === 'porVencer' ? 'bg-slate-800 text-amber-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Por vencer ({porVencer.length})
              </button>
              <button
                onClick={() => setStatusFilter('vencidos')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${statusFilter === 'vencidos' ? 'bg-slate-800 text-red-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Vencidos ({vencidos.length})
              </button>
            </div>
          </div>
        </div>

        {/* Contenido Tabla */}
        {loadingM ? (
          <div className="p-12 flex justify-center">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : miembrosFiltrados.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm flex flex-col items-center justify-center gap-2.5">
            <HelpCircle size={24} className="text-slate-600" />
            <span>No se encontraron miembros registrados con los filtros seleccionados.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-900/10">
                  <th className="px-4 py-2.5">Cliente</th>
                  <th className="px-4 py-2.5">Plan</th>
                  <th className="px-4 py-2.5">Vencimiento</th>
                  <th className="px-4 py-2.5">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {miembrosFiltrados.map(m => (
                  <FilaMiembro
                    key={m.uid}
                    miembro={m}
                    planes={planes}
                    onExtenderClick={setMiembroExtender}
                    onDesactivarClick={handleDesactivarMiembro}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modales */}
      {modalPlanes  && <ModalPlanes  tenantId={tenant.id} planesIniciales={planes} onClose={() => setModalPlanes(false)}  />}
      {modalActivar && <ModalActivar tenantId={tenant.id} planes={planes}          onClose={() => setModalActivar(false)} />}
      
      {miembroExtender && (
        <ModalConfirmarExtender
          miembro={miembroExtender}
          tenantId={tenant.id}
          planes={planes}
          onClose={() => setMiembroExtender(null)}
          onConfirm={() => {
            setMiembroExtender(null);
            // Mostrar sutil alert o notificación
          }}
        />
      )}
    </div>
  );
}
