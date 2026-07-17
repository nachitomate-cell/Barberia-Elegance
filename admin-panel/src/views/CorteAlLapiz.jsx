import { useState, useEffect, useMemo } from 'react';
import {
  collection, onSnapshot, query, getDocs,
  doc, updateDoc, setDoc, addDoc, Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { withTimeout } from '../lib/firestore-helpers';
import { useTenant } from '../contexts/TenantContext';
import { confirmDialog } from '../lib/confirmDialog';
import HelpModal, { HelpButton } from '../components/ui/HelpModal';
import {
  Users, UserCheck, Plus, XCircle, Search, Check, ShieldCheck,
  Pencil, Wallet, HandCoins, Receipt, HelpCircle,
} from 'lucide-react';

const RECARGO_DEFAULT = 5000;

const INPUT_CLS = 'w-full bg-slate-900 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-primary text-sm focus:outline-none focus:border-amber-500/80 transition-all shadow-inner placeholder:text-slate-500';

const fmt = n => `$${(Number(n) || 0).toLocaleString('es-CL')}`;
const normalizePhone = p => (p || '').replace(/\D/g, '');

/* ── Modal: Activar membresía (buscar cliente registrado) ─────────── */
function ModalActivar({ tenantId, cuentasUids, onClose }) {
  const [todosUsuarios, setTodosUsuarios] = useState([]);
  const [buscando, setBuscando]   = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const [focused, setFocused]     = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    setBuscando(true);
    // Tres fuentes de clientes:
    //   1. `users`     — cuentas Firebase Auth + perfiles pasivos auto-enroll.
    //   2. `clientes`  — legacy/migrados, doc-id = teléfono.
    //   3. `citas`     — fallback: cualquier cliente que haya tenido cita
    //                    aunque nunca se haya enrolado al club. Agrupado por
    //                    teléfono normalizado (mismo modelo que auto-enroll).
    // Combinamos por uid y nos quedamos con la versión más rica. También
    // excluimos los users sin nombre (sesiones anónimas / registros
    // incompletos) que ensucian el listado.
    const merged = new Map(); // uid → { uid, nombre, telefono }
    let usersReady = false;
    let clientesReady = false;
    function emit() {
      const list = Array.from(merged.values())
        .filter(u => u.nombre && u.nombre.trim())
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
      setTodosUsuarios(list);
    }
    // Apagamos el "buscando" apenas tengamos las fuentes principales
    // (users + clientes son onSnapshot instantáneas). El fallback de citas
    // tarda y NO debe bloquear el input — si lo bloquea, el usuario ve
    // sugerencias pero no puede escribir para filtrar. Citas hace emit()
    // por su cuenta cuando termina y sólo agrega nombres faltantes.
    function maybeDone() {
      if (usersReady && clientesReady) setBuscando(false);
    }

    const unsubUsers = onSnapshot(
      collection(db, 'tenants', tenantId, 'users'),
      snap => {
        snap.docs.forEach(d => {
          const x = d.data();
          const nombre = (x.nombre || '').trim();
          if (!nombre) return; // descartamos anónimos sin nombre
          const prev = merged.get(d.id) || {};
          merged.set(d.id, {
            uid:      d.id,
            nombre:   nombre || prev.nombre || '',
            telefono: x.telefono || prev.telefono || '',
          });
        });
        usersReady = true;
        emit();
        maybeDone();
      },
      () => { usersReady = true; maybeDone(); },
    );

    const unsubClientes = onSnapshot(
      collection(db, 'tenants', tenantId, 'clientes'),
      snap => {
        snap.docs.forEach(d => {
          const x = d.data();
          const uid    = x.uid || d.id; // los legacy tienen uid en el campo
          const nombre = (x.nombre || '').trim();
          if (!nombre || !uid) return;
          const prev = merged.get(uid) || {};
          // Si ya está en `users`, no pisamos su data (esa suele ser más fresca);
          // sólo completamos campos faltantes.
          merged.set(uid, {
            uid,
            nombre:   prev.nombre   || nombre,
            telefono: prev.telefono || x.telefono || '',
          });
        });
        clientesReady = true;
        emit();
        maybeDone();
      },
      () => { clientesReady = true; maybeDone(); },
    );

    // Fallback de citas: one-shot (no es necesario seguir cambios en vivo,
    // y onSnapshot sobre todas las citas sería caro). El UID derivado es el
    // teléfono normalizado, igual que el patrón de auto-enroll-cliente.js.
    let cancelled = false;
    (async () => {
      try {
        const snap = await withTimeout(
          getDocs(collection(db, 'tenants', tenantId, 'citas')),
          20000,
          'corte-lapiz/citas-fallback',
        );
        if (cancelled) return;
        snap.docs.forEach(d => {
          const x = d.data();
          const nombre = String(x.clienteNombre || '').trim();
          const telRaw = String(x.clienteTelefono || '').trim();
          const telN   = normalizePhone(telRaw);
          if (!nombre || !telN) return;
          // Si el cliente ya está en users/clientes por uid Auth o por su
          // teléfono normalizado, no pisamos. Solo lo agregamos como entrada
          // nueva si no existe en el merge.
          if (merged.has(telN)) return;
          // También evita duplicar cuando el mismo teléfono aparece bajo un
          // uid de Auth distinto: lo detectamos buscando por campo telefono.
          const yaPorTelefono = Array.from(merged.values()).some(
            u => normalizePhone(u.telefono) === telN,
          );
          if (yaPorTelefono) return;
          merged.set(telN, {
            uid:      telN,
            nombre,
            telefono: telRaw || telN,
          });
        });
        emit(); // sólo re-emite con la lista enriquecida; no toca buscando
      } catch {
        // si falla, no pasa nada: ya teníamos users+clientes; sólo no se
        // sumarán los clientes derivados de citas históricas.
      }
    })();

    return () => { cancelled = true; unsubUsers(); unsubClientes(); };
  }, [tenantId]);

  // Clientes del club que aún no son miembros Corte al Lápiz.
  const disponibles = useMemo(
    () => todosUsuarios.filter(u => !cuentasUids.has(u.uid)),
    [todosUsuarios, cuentasUids],
  );

  // Lista filtrada para el dropdown. Calculada inline en cada render (sin
  // useMemo) para no dejar duda sobre memoización: cualquier cambio en
  // searchVal recomputa este valor de inmediato.
  // - Sin término: muestra los primeros 8 clientes (al focusear el input).
  // - Con término: filtra por nombre o teléfono (case-insensitive,
  //   teléfono normalizado a sólo dígitos).
  const term    = searchVal.trim().toLowerCase();
  const termTel = normalizePhone(searchVal);
  let clientesFiltrados = [];
  if (!selectedUser) {
    if (!term) {
      clientesFiltrados = focused ? disponibles.slice(0, 8) : [];
    } else {
      clientesFiltrados = disponibles
        .filter(u => {
          const nombreOk = (u.nombre || '').toLowerCase().includes(term);
          const telOk    = termTel && normalizePhone(u.telefono).includes(termTel);
          return nombreOk || telOk;
        })
        .slice(0, 20);
    }
  }

  async function activar() {
    if (!selectedUser) { setError('Selecciona un cliente válido.'); return; }
    setLoading(true); setError('');
    try {
      await setDoc(doc(db, 'tenants', tenantId, 'corteLapiz', selectedUser.uid), {
        uid:          selectedUser.uid,
        nombre:       selectedUser.nombre,
        telefono:     selectedUser.telefono || '',
        telefonoNorm: normalizePhone(selectedUser.telefono),
        activo:       true,
        saldo:        0,
        servicios:    [],
        creadoEn:     Timestamp.now(),
        updatedAt:    Timestamp.now(),
      }, { merge: true });
      onClose();
    } catch (e) {
      setError(e.message || 'Error al activar la membresía.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="
          fixed bottom-0 inset-x-0 w-full rounded-t-3xl pb-8
          md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2
          md:rounded-2xl md:w-full md:max-w-md md:pb-6
          bg-slate-800 border border-slate-700 px-6 pt-2 md:pt-6 shadow-2xl relative
        "
      >
        {/* Drag handle estilo iOS (solo mobile) */}
        <div className="block md:hidden w-12 h-1.5 bg-slate-600 rounded-full mx-auto mt-2 mb-4" />

        <div className="space-y-4">
        <h3 className="text-primary font-bold text-lg flex items-center gap-2">
          <ShieldCheck className="text-amber-400" size={20} />
          Activar Corte al Lápiz
        </h3>
        {error && <p className="text-red-400 text-xs bg-red-950/20 border border-red-900/30 rounded-lg px-3 py-2">{error}</p>}

        <div className="relative">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Buscar cliente</label>
          <div className="relative">
            <input
              type="text"
              name="corte-lapiz-search"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              value={searchVal}
              onChange={e => { setSearchVal(e.target.value); if (selectedUser) { setSelectedUser(null); } }}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 150)}
              disabled={buscando}
              placeholder={buscando ? 'Cargando clientes del club…' : 'Escribe o toca para ver los clientes…'}
              className={INPUT_CLS + (selectedUser ? ' border-amber-500/80 pr-10 text-amber-400 font-semibold' : ' pr-8')}
            />
            {selectedUser ? (
              <button onClick={() => { setSelectedUser(null); setSearchVal(''); }}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-red-400 text-xs font-bold transition-all p-0.5 rounded">
                Cambiar
              </button>
            ) : (
              <Search size={16} className="absolute right-3 top-3 text-slate-500 pointer-events-none" />
            )}
          </div>

          {clientesFiltrados.length > 0 && (
            <div className="absolute z-10 left-0 right-0 mt-1.5 bg-slate-800 max-h-64 overflow-y-auto">
              {clientesFiltrados.map(u => (
                <button key={u.uid}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => { setSelectedUser(u); setSearchVal(u.nombre); }}
                  className="w-full text-left py-4 px-2 text-sm text-slate-300 flex flex-col border-b border-slate-800 last:border-0 active:bg-slate-800/50 md:hover:bg-slate-800/50 rounded-lg transition-colors">
                  <span className="font-semibold text-primary">{u.nombre}</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">{u.telefono ? `Tel: ${u.telefono}` : `UID: ${u.uid.slice(0, 10)}…`}</span>
                </button>
              ))}
            </div>
          )}

          {searchVal && !selectedUser && clientesFiltrados.length === 0 && !buscando && (
            <p className="text-[10px] text-amber-400/80 mt-1 pl-1">No encontramos ese cliente. Debe registrarse en el club de fidelidad primero para activarle la membresía.</p>
          )}
          {!searchVal && !selectedUser && focused && !buscando && disponibles.length === 0 && (
            <p className="text-[10px] text-slate-500 mt-1 pl-1">No hay clientes del club disponibles para activar todavía.</p>
          )}
        </div>

        {selectedUser && (
          <div className="flex items-center gap-3 bg-amber-500/5 border border-amber-500/25 rounded-xl px-4 py-3">
            <div className="w-9 h-9 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
              <UserCheck size={17} className="text-amber-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-primary truncate">{selectedUser.nombre}</p>
              <p className="text-[11px] text-slate-400 truncate">{selectedUser.telefono ? `Tel: ${selectedUser.telefono}` : 'Cliente registrado'}</p>
            </div>
            <Check size={16} className="text-amber-400 shrink-0" />
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 text-sm font-semibold hover:bg-slate-700 hover:text-primary transition-all">
            Cancelar
          </button>
          <button onClick={activar} disabled={loading || !selectedUser}
            className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-primary text-sm font-bold transition-all disabled:opacity-50 shadow-lg shadow-amber-950/20">
            {loading ? 'Activando…' : 'Activar'}
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}

/* ── Modal: Saldar cuota del mes ─────────────────────────────────── */
function ModalSaldar({ cuenta, tenantId, onClose }) {
  const [metodo, setMetodo]   = useState('efectivo');
  const [loading, setLoading] = useState(false);
  const saldo     = Number(cuenta.saldo) || 0;
  const servicios = cuenta.servicios || [];

  async function saldar() {
    setLoading(true);
    try {
      // 1. Registrar el pago (queda como historial de la cuenta)
      await addDoc(collection(db, 'tenants', tenantId, 'corteLapiz', cuenta.uid, 'pagos'), {
        monto:            saldo,
        cantidadServicios: servicios.length,
        servicios,
        metodoPago:       metodo,
        fechaPago:        Timestamp.now(),
      });
      // 2. Reiniciar la cuota del cliente a $0
      await updateDoc(doc(db, 'tenants', tenantId, 'corteLapiz', cuenta.uid), {
        saldo:     0,
        servicios: [],
        ultimoPago: Timestamp.now(),
        updatedAt:  Timestamp.now(),
      });
      onClose();
    } catch (e) {
      console.error(e);
      alert('Error al saldar la cuota.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-md bg-slate-800 border border-slate-700/80 rounded-2xl p-6 space-y-4 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-1">
          <h3 className="text-primary font-bold text-lg flex items-center gap-2">
            <HandCoins size={18} className="text-amber-400" />
            Saldar cuota
          </h3>
          <p className="text-xs text-slate-400">Cliente: <strong className="text-primary">{cuenta.nombre || '—'}</strong></p>
        </div>

        <div className="bg-slate-900/80 border border-slate-700/40 rounded-xl p-4 space-y-2.5">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Servicios del período:</span>
            <span className="font-semibold text-slate-200">{servicios.length}</span>
          </div>
          <div className="flex justify-between items-center pt-2.5 border-t border-slate-800">
            <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Total a cobrar:</span>
            <span className="font-black text-primary text-lg">{fmt(saldo)}</span>
          </div>
        </div>

        {servicios.length > 0 && (
          <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
            {servicios.map((s, i) => (
              <div key={i} className="flex justify-between items-center text-xs bg-slate-900/40 border border-slate-800/60 rounded-lg px-3 py-2">
                <span className="text-slate-300 truncate">
                  {s.servicioNombre || 'Servicio'} <span className="text-slate-600">· {s.fecha || ''}</span>
                  {(s.precio != null && s.recargo != null) && (
                    <span className="block text-[10px] text-slate-600">{fmt(s.precio)} + {fmt(s.recargo)} recargo</span>
                  )}
                </span>
                <span className="text-slate-400 font-semibold shrink-0 ml-2">{fmt(s.monto)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Método de pago</label>
          <select value={metodo} onChange={e => setMetodo(e.target.value)} className={INPUT_CLS}>
            <option value="efectivo">💵 Efectivo</option>
            <option value="transferencia">📲 Transferencia Bancaria</option>
            <option value="tarjeta">💳 Tarjeta de Débito/Crédito</option>
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 text-sm font-semibold hover:bg-slate-700 hover:text-primary transition-all">
            Cancelar
          </button>
          <button onClick={saldar} disabled={loading || saldo <= 0}
            className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-primary text-sm font-bold transition-all shadow-lg shadow-amber-950/20 disabled:opacity-50">
            {loading ? 'Procesando…' : 'Confirmar pago'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Modal: Configurar recargo por servicio ──────────────────────── */
function ModalRecargo({ tenantId, recargoActual, onClose }) {
  const [recargo, setRecargo] = useState(String(recargoActual ?? RECARGO_DEFAULT));
  const [loading, setLoading] = useState(false);

  async function guardar() {
    setLoading(true);
    try {
      await setDoc(doc(db, 'tenants', tenantId, 'configuracion', 'corteLapiz'),
        { recargo: Math.round(Number(recargo)) || 0, updatedAt: Timestamp.now() },
        { merge: true });
      onClose();
    } catch (e) {
      console.error(e);
      alert('Error al guardar el recargo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm bg-slate-800 border border-slate-700/80 rounded-2xl p-6 space-y-4 shadow-2xl">
        <h3 className="text-primary font-bold text-lg flex items-center gap-2">
          <Pencil size={17} className="text-amber-400" /> Recargo por servicio
        </h3>
        <p className="text-xs text-slate-400">Se suma al <strong className="text-slate-200">precio del servicio</strong> cada vez que el miembro completa una cita. La cuota acumula <strong className="text-slate-200">precio + recargo</strong>.</p>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Recargo (CLP)</label>
          <input type="number" min="0" step="100" inputMode="numeric"
            value={recargo}
            onChange={e => setRecargo(e.target.value.replace(/[^\d]/g, ''))}
            className={INPUT_CLS} />
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 text-sm font-semibold hover:bg-slate-700 hover:text-primary transition-all">
            Cancelar
          </button>
          <button onClick={guardar} disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-primary text-sm font-bold transition-all disabled:opacity-50">
            {loading ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Vista principal ─────────────────────────────────────────────── */
export default function CorteAlLapiz() {
  const tenant = useTenant();
  const [cuentas, setCuentas] = useState([]);
  const [recargo, setRecargo] = useState(RECARGO_DEFAULT);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showHelp,     setShowHelp]     = useState(false);
  const [modalActivar, setModalActivar] = useState(false);
  const [modalRecargo, setModalRecargo] = useState(false);
  const [cuentaSaldar, setCuentaSaldar] = useState(null);

  // Recargo por servicio configurable
  useEffect(() => {
    const ref = doc(db, 'tenants', tenant.id, 'configuracion', 'corteLapiz');
    const unsub = onSnapshot(ref, snap => {
      // Soporta el campo nuevo (recargo) y el antiguo (monto).
      const r = snap.exists() ? Number(snap.data().recargo ?? snap.data().monto) : NaN;
      setRecargo(Number.isFinite(r) && r >= 0 ? r : RECARGO_DEFAULT);
    });
    return unsub;
  }, [tenant.id]);

  // Cuentas (miembros)
  useEffect(() => {
    const q = query(collection(db, 'tenants', tenant.id, 'corteLapiz'));
    const unsub = onSnapshot(q, snap => {
      const docs = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
      docs.sort((a, b) => (Number(b.saldo) || 0) - (Number(a.saldo) || 0));
      setCuentas(docs);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [tenant.id]);

  const activas = useMemo(() => cuentas.filter(c => c.activo !== false), [cuentas]);
  const cuentasUids = useMemo(() => new Set(activas.map(c => c.uid)), [activas]);

  const totalPorCobrar = useMemo(() => activas.reduce((s, c) => s + (Number(c.saldo) || 0), 0), [activas]);
  const serviciosMes   = useMemo(() => activas.reduce((s, c) => s + (c.servicios?.length || 0), 0), [activas]);

  const filtradas = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return activas;
    return activas.filter(c =>
      (c.nombre || '').toLowerCase().includes(term) ||
      (c.telefono || '').includes(term) ||
      c.uid.toLowerCase().includes(term));
  }, [activas, searchTerm]);

  async function handleDesactivar(cuenta) {
    const saldo = Number(cuenta.saldo) || 0;
    const msg = saldo > 0
      ? `${cuenta.nombre || 'Este cliente'} tiene una cuota pendiente de ${fmt(saldo)}. Si desactivas la membresía, la cuota quedará sin saldar. ¿Continuar?`
      : `¿Desactivar la membresía Corte al Lápiz de ${cuenta.nombre || cuenta.uid}?`;
    if (!(await confirmDialog(msg))) return;
    try {
      await updateDoc(doc(db, 'tenants', tenant.id, 'corteLapiz', cuenta.uid), {
        activo: false, updatedAt: Timestamp.now(),
      });
    } catch (e) {
      console.error(e);
      alert('Error al desactivar la membresía.');
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">

      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{tenant.name}</p>
          <h1 className="text-2xl font-black text-primary tracking-tight flex items-center gap-2">
            Corte al Lápiz
            <HelpButton onClick={() => setShowHelp(true)} />
          </h1>
          <p className="text-xs text-slate-500 mt-1">Membresía a cuenta corriente · precio del servicio + {fmt(recargo)}</p>
        </div>
        <button onClick={() => setModalRecargo(true)}
          className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700/80 text-slate-400 text-sm font-semibold hover:text-primary hover:border-slate-500 hover:bg-slate-900/40 transition-all shadow-sm shrink-0">
          <Pencil size={15} /> Recargo por servicio
        </button>
      </div>

      {/* Banner: módulo exclusivo de Yügen Studio */}
      <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/25 rounded-2xl px-4 py-3 shadow-sm">
        <ShieldCheck size={18} className="text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 leading-relaxed">
          <span className="font-bold text-amber-400">Módulo exclusivo de Yügen Studio.</span>{' '}
          Corte al Lápiz es una membresía a cuenta corriente diseñada específicamente para este local — no está disponible en otras barberías de la plataforma.
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4 shadow-md relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all" />
          <div className="flex items-center gap-2 text-amber-400 mb-1">
            <Wallet size={15} /><span className="text-[10px] font-bold uppercase tracking-widest">Total por cobrar</span>
          </div>
          <p className="text-xl md:text-2xl font-black text-primary">{fmt(totalPorCobrar)}</p>
        </div>
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4 shadow-md relative overflow-hidden group">
          <div className="flex items-center gap-2 text-emerald-400 mb-1">
            <UserCheck size={15} /><span className="text-[10px] font-bold uppercase tracking-widest">Miembros</span>
          </div>
          <p className="text-2xl font-black text-primary">{activas.length}</p>
        </div>
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4 shadow-md relative overflow-hidden group">
          <div className="flex items-center gap-2 text-indigo-400 mb-1">
            <Receipt size={15} /><span className="text-[10px] font-bold uppercase tracking-widest">Servicios sin saldar</span>
          </div>
          <p className="text-2xl font-black text-primary">{serviciosMes}</p>
        </div>
      </div>

      {/* Tabla de miembros */}
      <div className="bg-slate-800/40 border border-slate-700/80 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm">
        <div className="px-5 py-4 border-b border-slate-750 flex flex-col gap-3.5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-slate-400" />
              <span className="text-sm font-bold text-primary">Miembros Corte al Lápiz</span>
            </div>
            <button onClick={() => setModalActivar(true)}
              className="w-full md:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 md:py-2 bg-amber-600 hover:bg-amber-500 text-primary text-xs font-bold rounded-xl transition-all shadow-md shadow-amber-950/20 active:scale-95">
              <Plus size={14} /> Activar membresía
            </button>
          </div>
          <div className="relative">
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por cliente o teléfono…"
              className={INPUT_CLS + ' py-2 pl-9 pr-4 text-xs'} />
            <Search size={14} className="absolute left-3.5 top-3 text-slate-500" />
          </div>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtradas.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm flex flex-col items-center justify-center gap-2.5">
            <HelpCircle size={24} className="text-slate-600" />
            <span>Aún no hay miembros de Corte al Lápiz. Toca "Activar membresía" para agregar uno.</span>
          </div>
        ) : (
          <div className="md:overflow-x-auto">
            <table className="w-full text-left block md:table">
              <thead className="hidden md:table-header-group">
                <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-900/10">
                  <th className="px-4 py-2.5">Cliente</th>
                  <th className="px-4 py-2.5">Servicios</th>
                  <th className="px-4 py-2.5">Cuota a fin de mes</th>
                  <th className="px-4 py-2.5">Acciones</th>
                </tr>
              </thead>
              <tbody className="block md:table-row-group">
                {filtradas.map(c => {
                  const saldo = Number(c.saldo) || 0;
                  return (
                    <tr
                      key={c.uid}
                      className={`block md:table-row border-b border-slate-800/60 md:hover:bg-slate-800/10 transition-all p-4 md:p-0 ${saldo > 0 ? 'bg-amber-950/10' : ''}`}
                    >
                      {/* Cliente (nombre + tel) */}
                      <td className="block md:table-cell md:px-4 md:py-3.5">
                        <p className="text-base md:text-sm font-semibold text-primary">{c.nombre || '—'}</p>
                        <p className="text-[11px] md:text-[10px] text-slate-500 mt-0.5">{c.telefono || c.uid.slice(0, 12) + '…'}</p>
                      </td>

                      {/* Servicios + Cuota en una fila en mobile */}
                      <td className="block md:table-cell md:px-4 md:py-3.5 mt-3 md:mt-0">
                        <div className="flex items-center justify-between md:block">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 md:hidden">Servicios</span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 border border-slate-700 text-slate-300">
                            {c.servicios?.length || 0}
                          </span>
                        </div>
                      </td>
                      <td className="block md:table-cell md:px-4 md:py-3.5 mt-2 md:mt-0">
                        <div className="flex items-center justify-between md:block">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 md:hidden">Cuota a fin de mes</span>
                          <span className={`font-black text-base md:text-sm ${saldo > 0 ? 'text-amber-400' : 'text-slate-500'}`}>{fmt(saldo)}</span>
                        </div>
                      </td>

                      {/* Acciones */}
                      <td className="block md:table-cell md:px-4 md:py-3.5 mt-4 md:mt-0">
                        <div className="flex items-center gap-2 md:gap-2 w-full md:w-auto">
                          <button
                            onClick={() => setCuentaSaldar(c)}
                            disabled={saldo <= 0}
                            title="Saldar cuota"
                            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 md:px-2.5 py-2.5 md:py-1.5 rounded-xl md:rounded-lg text-sm md:text-xs font-bold text-amber-400 bg-amber-500/10 md:bg-transparent hover:text-primary hover:bg-amber-600 transition-all disabled:opacity-30 disabled:hover:bg-amber-500/10 md:disabled:hover:bg-transparent disabled:hover:text-amber-400 active:scale-95"
                          >
                            <HandCoins size={15} /> Saldar
                          </button>
                          <button
                            onClick={() => handleDesactivar(c)}
                            title="Desactivar membresía"
                            className="p-3 md:p-2 rounded-xl text-slate-400 bg-slate-800/60 md:bg-transparent hover:text-red-400 hover:bg-red-950/30 transition-all active:scale-95"
                          >
                            <XCircle size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modales */}
      {modalActivar && <ModalActivar tenantId={tenant.id} cuentasUids={cuentasUids} onClose={() => setModalActivar(false)} />}
      {modalRecargo && <ModalRecargo tenantId={tenant.id} recargoActual={recargo}    onClose={() => setModalRecargo(false)} />}
      {cuentaSaldar && <ModalSaldar  cuenta={cuentaSaldar} tenantId={tenant.id}       onClose={() => setCuentaSaldar(null)} />}

      {showHelp && (
        <HelpModal title="Cómo funciona Corte al Lápiz" onClose={() => setShowHelp(false)}>
          <p>Es una membresía <strong className="text-primary">a cuenta corriente</strong> (tipo crédito). El cliente miembro agenda sin pagar en el momento y cada servicio que completa se le suma a una cuota que paga a fin de mes.</p>

          <div>
            <p className="font-semibold text-amber-400 mb-1">1. Activar la membresía</p>
            <p>Toca <em>"Activar membresía"</em> y busca al cliente (debe estar registrado en el club). Desde ese momento queda como miembro Corte al Lápiz.</p>
          </div>

          <div>
            <p className="font-semibold text-amber-400 mb-1">2. Agendar</p>
            <p>El miembro lo agendas tú desde el panel (Agenda), igual que cualquier cita. No pasa por la pasarela de pago.</p>
          </div>

          <div>
            <p className="font-semibold text-amber-400 mb-1">3. Acumulación automática</p>
            <p>Cuando marcas la cita como <strong className="text-primary">Completada</strong>, el sistema le suma a su cuota el <strong className="text-primary">precio del servicio + {fmt(recargo)}</strong> de recargo, automáticamente. Puedes cambiar el recargo con el botón <em>"Recargo por servicio"</em>.</p>
          </div>

          <div>
            <p className="font-semibold text-amber-400 mb-1">4. Saldar a fin de mes</p>
            <p>Cuando el cliente paga, toca <em>"Saldar"</em>, elige el método de pago y la cuota vuelve a $0. El pago queda registrado en su historial.</p>
          </div>
        </HelpModal>
      )}
    </div>
  );
}
