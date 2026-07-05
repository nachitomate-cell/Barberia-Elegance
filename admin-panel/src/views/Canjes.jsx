import { useState, useEffect, useRef, useMemo } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  runTransaction,
  serverTimestamp,
  arrayUnion,
  increment,
  Timestamp,
  onSnapshot,
  orderBy,
  limit as qLimit,
} from 'firebase/firestore';
import { KeyRound, ScanLine, User, Package, Scissors, Tag, CheckCircle2, XCircle, Clock, RefreshCw } from 'lucide-react';
import { db } from '../lib/firebase';
import { tenantCol, resolveTenantId } from '../lib/tenantUtils';
import { useAuth } from '../contexts/AuthContext';
import { withTimeout } from '../lib/firestore-helpers';

/* ── Copia local del catálogo de categorías (idéntico al de Premios.jsx) ─ */
const CATEGORIAS = {
  PRODUCTO:  { label: 'Producto',  Icon: Package,  emoji: '📦', color: 'sky',     accion: 'Entregar del inventario' },
  SERVICIO:  { label: 'Servicio',  Icon: Scissors, emoji: '✂️', color: 'emerald', accion: 'Aplicar servicio de regalo' },
  DESCUENTO: { label: 'Descuento', Icon: Tag,      emoji: '🏷️', color: 'amber',   accion: 'Aplicar descuento en caja' },
};

/* Instrucción legible según la categoría del canje. */
function buildInstruccion(r) {
  const cat = CATEGORIAS[r.categoria] || CATEGORIAS.SERVICIO;
  const cfg = r.configuracion || {};
  if (r.categoria === 'PRODUCTO') {
    const stockNote = cfg.descuentaStock ? ' · descontar stock' : '';
    return `📦 Entregar en mostrador · SKU ${cfg.skuProducto || '—'}${stockNote}`;
  }
  if (r.categoria === 'SERVICIO') {
    const turnoNote = cfg.requiereTurno ? ' · el cliente debe reservar turno' : ' · aplicar en la sesión actual';
    return `✂️ Servicio ${cfg.servicioId || '—'} de regalo${turnoNote}`;
  }
  if (r.categoria === 'DESCUENTO') {
    const val = cfg.valorDescuento || 0;
    return cfg.tipoDescuento === 'PORCENTAJE'
      ? `🏷️ Aplicar ${val}% OFF en caja`
      : `🏷️ Descontar $${val.toLocaleString('es-CL')} en caja`;
  }
  return cat.accion;
}

/* Toast local minimalista. */
function useToast() {
  const [msg, setMsg] = useState(null);
  const show = (text, type = 'ok') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3200);
  };
  return { msg, show };
}

/* Formatea un timestamp de Firestore como cuenta regresiva "MM:SS". */
function useCountdown(expiresAt) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!expiresAt) return;
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, [expiresAt]);
  if (!expiresAt) return { text: '--:--', expired: false, msLeft: 0 };
  const expMs = expiresAt.toMillis ? expiresAt.toMillis() : new Date(expiresAt).getTime();
  const msLeft = Math.max(0, expMs - now);
  const s = Math.floor(msLeft / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return { text: `${mm}:${ss}`, expired: msLeft <= 0, msLeft };
}

/* ── Vista principal ──────────────────────────────────────────────── */
export default function Canjes() {
  const { user } = useAuth();
  const { msg, show: showToast } = useToast();

  const [pin, setPin]                = useState('');
  const [searching, setSearching]    = useState(false);
  const [candidato, setCandidato]    = useState(null); // redemption doc
  const [cliente, setCliente]        = useState(null); // user doc
  const [confirming, setConfirming]  = useState(false);
  const [errorMsg, setErrorMsg]      = useState('');

  const pinRef = useRef(null);
  useEffect(() => { pinRef.current?.focus(); }, []);

  /* ── Cola de canjes pendientes (últimos 20) para dar visibilidad ── */
  const [queue, setQueue] = useState([]);
  useEffect(() => {
    const q = query(
      tenantCol('redemptions'),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc'),
      qLimit(20),
    );
    const unsub = onSnapshot(q, snap => {
      setQueue(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => setQueue([]));
    return () => unsub();
  }, []);

  const countdown = useCountdown(candidato?.expiresAt);

  const buscarPorPin = async (pinValor) => {
    const clean = String(pinValor).replace(/\D/g, '').slice(0, 4);
    if (clean.length !== 4) {
      setErrorMsg('El PIN debe tener 4 dígitos numéricos.');
      return;
    }
    setSearching(true);
    setErrorMsg('');
    setCandidato(null);
    setCliente(null);
    try {
      const q = query(
        tenantCol('redemptions'),
        where('token', '==', clean),
        where('status', '==', 'pending'),
        qLimit(5),
      );
      const snap = await withTimeout(getDocs(q), 8000, 'canjes/buscarPin');
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const vivos = docs.filter(d => {
        const exp = d.expiresAt?.toMillis?.() ?? 0;
        return exp > Date.now();
      });
      if (!vivos.length) {
        setErrorMsg(docs.length
          ? 'El código existe pero expiró. Pídele al cliente que genere uno nuevo.'
          : 'No encontramos un canje activo con ese PIN. Verifica los dígitos.');
        return;
      }
      // Si hay colisión (raro), usar el más reciente por seguridad — muestra
      // foto/nombre para que el barbero confirme visualmente.
      vivos.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
      const winner = vivos[0];
      setCandidato(winner);
      // Cargar datos del cliente (foto + nombre)
      try {
        const uSnap = await withTimeout(getDocs(query(
          tenantCol('users'),
          where('__name__', '==', winner.userId),
          qLimit(1),
        )), 6000, 'canjes/cliente');
        if (!uSnap.empty) setCliente({ id: uSnap.docs[0].id, ...uSnap.docs[0].data() });
      } catch (_) {}
    } catch (e) {
      console.error('[Canjes] buscarPorPin:', e);
      setErrorMsg('No se pudo consultar Firestore. Reintenta.');
    } finally { setSearching(false); }
  };

  const resetear = () => {
    setPin('');
    setCandidato(null);
    setCliente(null);
    setErrorMsg('');
    pinRef.current?.focus();
  };

  const confirmarEntrega = async () => {
    if (!candidato) return;
    if (countdown.expired) {
      setErrorMsg('El canje ya expiró — pídele al cliente que genere uno nuevo.');
      return;
    }
    setConfirming(true);
    setErrorMsg('');
    try {
      const redRef  = doc(tenantCol('redemptions'), candidato.id);
      const userRef = doc(tenantCol('users'),       candidato.userId);
      const tid     = resolveTenantId();
      const cfg     = candidato.configuracion || {};
      const stockRef = (candidato.categoria === 'PRODUCTO' && cfg.descuentaStock && cfg.skuProducto)
        ? doc(tenantCol('productos'), cfg.skuProducto)
        : null;

      await runTransaction(db, async (tx) => {
        const rSnap = await tx.get(redRef);
        if (!rSnap.exists()) throw new Error('El canje ya no existe.');
        const r = rSnap.data();
        if (r.status !== 'pending') throw new Error('Este canje ya fue procesado.');
        const expMs = r.expiresAt?.toMillis?.() ?? 0;
        if (expMs <= Date.now()) throw new Error('El canje expiró antes de confirmar.');

        const uSnap = await tx.get(userRef);
        if (!uSnap.exists()) throw new Error('No se encontró la cuenta del cliente.');
        const u = uSnap.data();
        const disp = u.sellosDisponibles ?? u.stamps ?? 0;
        if (disp < r.costoSellos) throw new Error('Saldo insuficiente del cliente.');

        // Stock (opcional): si el producto se encuentra y descuentaStock=true
        if (stockRef) {
          const sSnap = await tx.get(stockRef);
          if (sSnap.exists()) {
            const stockActual = Number(sSnap.data().stock ?? 0);
            if (stockActual > 0) {
              tx.update(stockRef, { stock: increment(-1) });
            }
          }
        }

        tx.update(redRef, {
          status:      'approved',
          approvedAt:  serverTimestamp(),
          approvedBy:  user?.email || user?.uid || 'staff',
        });
        tx.update(userRef, {
          sellosDisponibles: increment(-r.costoSellos),
          stamps:            increment(-r.costoSellos),
          historialSellos: arrayUnion({
            fecha: new Date().toISOString(),
            tipo:  'canje',
            cantidad: -r.costoSellos,
            nota:  `${r.prizeName || 'Premio'} (PIN ${r.token})`,
            redemptionId: rSnap.id,
            categoria: r.categoria || 'SERVICIO',
          }),
        });
      });

      showToast('✓ Canje aprobado — entrega confirmada', 'ok');
      resetear();
    } catch (e) {
      console.error('[Canjes] confirmar:', e);
      setErrorMsg(e.message || 'No se pudo confirmar. Reintenta.');
      showToast('Error al confirmar', 'err');
    } finally { setConfirming(false); }
  };

  const catMeta = candidato && (CATEGORIAS[candidato.categoria] || CATEGORIAS.SERVICIO);
  const catColorMap = {
    sky:     'bg-sky-500/10 text-sky-300 border-sky-500/25',
    emerald: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
    amber:   'bg-amber-500/10 text-amber-300 border-amber-500/25',
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <ScanLine size={20} className="text-[#D4AF37]" />
          Validar Canje
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Pídele al cliente el PIN de 4 dígitos que aparece en su app y valídalo aquí.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Columna PIN + tarjeta candidato */}
        <div className="lg:col-span-3 space-y-4">

          {/* Input PIN */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block flex items-center gap-1.5">
              <KeyRound size={12} className="text-[#D4AF37]" /> PIN del cliente
            </label>
            <div className="flex gap-2">
              <input
                ref={pinRef}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={pin}
                onChange={e => {
                  const clean = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setPin(clean);
                  setErrorMsg('');
                  if (clean.length === 4) buscarPorPin(clean);
                }}
                onKeyDown={e => e.key === 'Enter' && buscarPorPin(pin)}
                placeholder="0000"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-4 text-3xl font-black text-center text-white tracking-[0.6em] focus:border-[#D4AF37] focus:outline-none"
              />
              <button
                onClick={() => buscarPorPin(pin)}
                disabled={searching || pin.length !== 4}
                className="px-5 rounded-lg bg-[#D4AF37] text-black font-bold text-sm disabled:opacity-40 hover:bg-yellow-500 transition-colors flex items-center gap-1.5"
              >
                {searching
                  ? <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  : <ScanLine size={16} />}
                Validar
              </button>
            </div>
            {errorMsg && (
              <p className="text-xs text-rose-400 font-semibold mt-2 flex items-center gap-1">
                <XCircle size={12} /> {errorMsg}
              </p>
            )}
          </div>

          {/* Tarjeta del canje encontrado */}
          {candidato && catMeta && (
            <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
              {/* Header con foto/nombre del cliente */}
              <div className="p-4 flex items-center gap-3 border-b border-slate-800">
                <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden">
                  {cliente?.photoURL
                    ? <img src={cliente.photoURL} className="w-full h-full object-cover" alt="" />
                    : <User size={22} className="text-slate-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">
                    {cliente?.nombre || candidato.userName || 'Cliente'}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {cliente?.email || candidato.userId}
                  </p>
                </div>
                <div className="text-right">
                  <div className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${catColorMap[catMeta.color]}`}>
                    <catMeta.Icon size={10} /> {catMeta.label}
                  </div>
                  <p className="text-[10.5px] mt-1 text-slate-500 flex items-center justify-end gap-1">
                    <Clock size={10} /> Expira en {countdown.text}
                  </p>
                </div>
              </div>

              {/* Cuerpo con premio + instrucción */}
              <div className="p-5 space-y-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Premio</span>
                  <h2 className="text-lg font-black text-white leading-tight mt-0.5">
                    {candidato.prizeName || 'Premio'}
                  </h2>
                  <p className="text-xs text-[#D4AF37] font-semibold mt-1">
                    🏆 Costo: {candidato.costoSellos} sello{candidato.costoSellos !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* Instrucción para el barbero */}
                <div className={`rounded-lg border px-4 py-3 ${catColorMap[catMeta.color]}`}>
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-0.5">
                    Instrucción
                  </p>
                  <p className="text-sm font-semibold">
                    {buildInstruccion(candidato)}
                  </p>
                </div>

                {countdown.expired && (
                  <p className="text-xs text-rose-400 font-semibold flex items-center gap-1.5">
                    <XCircle size={12} /> Este canje expiró — el cliente debe regenerarlo.
                  </p>
                )}
              </div>

              {/* Botones */}
              <div className="p-4 bg-slate-950/40 border-t border-slate-800 flex gap-3">
                <button
                  onClick={resetear}
                  className="px-4 py-2.5 text-sm text-slate-300 hover:text-white rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarEntrega}
                  disabled={confirming || countdown.expired}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-sm transition-colors"
                >
                  {confirming
                    ? <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    : <CheckCircle2 size={16} />}
                  Confirmar Entrega
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Cola de canjes pendientes */}
        <div className="lg:col-span-2">
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Canjes pendientes
              </span>
              <span className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full font-mono">
                {queue.length}
              </span>
            </div>
            {queue.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-slate-600 text-xs">
                <Clock size={22} className="mb-2 text-slate-700" />
                Sin canjes activos.
              </div>
            ) : (
              <ul className="divide-y divide-slate-800 max-h-[520px] overflow-y-auto">
                {queue.map(r => {
                  const meta = CATEGORIAS[r.categoria] || CATEGORIAS.SERVICIO;
                  const expMs = r.expiresAt?.toMillis?.() ?? 0;
                  const min = Math.max(0, Math.floor((expMs - Date.now()) / 60000));
                  return (
                    <li key={r.id}
                      onClick={() => { setPin(r.token || ''); buscarPorPin(r.token); }}
                      className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-slate-800/40 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                        <meta.Icon size={14} className="text-slate-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">
                          {r.prizeName || '—'}
                        </p>
                        <p className="text-[10px] text-slate-500 flex items-center gap-2">
                          <span className="font-mono font-bold text-[#D4AF37]">{r.token}</span>
                          <span>·</span>
                          <span>{min}m restantes</span>
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Toast */}
      {msg && (
        <div className={`fixed left-1/2 -translate-x-1/2 bottom-8 z-50 px-5 py-3 rounded-xl font-semibold text-sm shadow-2xl border ${
          msg.type === 'ok'
            ? 'bg-emerald-500/95 text-black border-emerald-400'
            : 'bg-rose-500/95 text-white border-rose-400'
        }`}>
          {msg.text}
        </div>
      )}
    </div>
  );
}
