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
import {
  KeyRound, ScanLine, User, Package, Scissors, Tag, CheckCircle2, XCircle,
  Clock, RefreshCw, Smartphone, Info, HelpCircle, ArrowRight, Sparkles,
  Timer, ShieldCheck,
} from 'lucide-react';
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

/* Instrucción legible según la categoría del canje. Soporta dos orígenes:
   premios (skuProducto/servicioId/valorDescuento/tipoDescuento) y recompensas
   del programa de referidos (detalle.nombre/productoId/servicioId/valor/tipo).
   Preferimos SIEMPRE el nombre limpio del ítem (cfg.nombre / r.prizeName) para
   que el barbero lea “Corte Degradado de regalo” en vez de “Servicio abc123”. */
function buildInstruccion(r) {
  const cat = CATEGORIAS[r.categoria] || CATEGORIAS.SERVICIO;
  const cfg = r.configuracion || r.detalle || {};
  const nombre = cfg.nombre || r.prizeName || '';
  if (r.categoria === 'PRODUCTO') {
    const sku       = cfg.skuProducto ? ` · SKU ${cfg.skuProducto}` : '';
    const stockNote = cfg.descuentaStock ? ' · descontar stock' : '';
    return `📦 Entregar ${nombre ? `“${nombre}”` : 'el producto'} en mostrador${sku}${stockNote}`;
  }
  if (r.categoria === 'SERVICIO') {
    const turnoNote = cfg.requiereTurno ? ' · el cliente debe reservar turno' : ' · aplicar en la sesión actual';
    return `✂️ ${nombre ? `“${nombre}”` : 'Servicio'} de regalo${turnoNote}`;
  }
  if (r.categoria === 'DESCUENTO') {
    // valorDescuento/tipoDescuento (premios) o valor/tipo (referidos).
    const val     = cfg.valorDescuento ?? cfg.valor ?? 0;
    const esPct   = cfg.tipoDescuento ? cfg.tipoDescuento === 'PORCENTAJE' : (cfg.tipo || '%') === '%';
    const monto   = esPct ? `${val}% OFF` : `$${Number(val).toLocaleString('es-CL')} OFF`;
    const aplicaA = cfg.aplicaA || 'GLOBAL';
    const target  = cfg.targetName || cfg.targetId || '';
    if (aplicaA === 'SERVICIO_ESPECIFICO' && target) {
      return `🏷️ Aplicar ${monto} solo en: ${target}`;
    }
    if (aplicaA === 'PRODUCTO_ESPECIFICO' && target) {
      return `🏷️ Aplicar ${monto} solo al producto: ${target}`;
    }
    return `🏷️ Aplicar ${monto} en total de caja`;
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

        // Retro-compat: los canjes nuevos vienen con `sellosCargados: true`
        // (CF `crearCanje` ya descontó los sellos al generar el QR). Los canjes
        // legacy (creados antes del refactor) no tienen ese flag y el descuento
        // ocurre acá, al aprobar. Este check evita el doble-descuento.
        const sellosYaCargados = r.sellosCargados === true;

        let uData = null;
        if (!sellosYaCargados) {
          const uSnap = await tx.get(userRef);
          if (!uSnap.exists()) throw new Error('No se encontró la cuenta del cliente.');
          uData = uSnap.data();
          const disp = uData.sellosDisponibles ?? uData.stamps ?? 0;
          if (disp < r.costoSellos) throw new Error('Saldo insuficiente del cliente.');
        }

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

        // Descuento SOLO si el canje es legacy (no tiene sellosCargados=true).
        // Para canjes nuevos, los sellos ya se descontaron al generar el QR;
        // acá solo dejamos un item en el historial para la trazabilidad.
        if (!sellosYaCargados) {
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
        } else {
          tx.update(userRef, {
            historialSellos: arrayUnion({
              fecha: new Date().toISOString(),
              tipo:  'canje-aprobado',
              cantidad: 0, // sin cambio: los sellos ya se cargaron al generar
              nota:  `${r.prizeName || 'Premio'} (PIN ${r.token}) — entrega confirmada`,
              redemptionId: rSnap.id,
              categoria: r.categoria || 'SERVICIO',
            }),
          });
        }
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
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
      {/* ── Header + intro ───────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/25 shrink-0">
            <ScanLine size={18} className="text-amber-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-primary leading-tight">Validar Canje</h1>
            <p className="text-[11px] sm:text-xs text-slate-500 leading-snug">Aprueba y entrega premios del club de fidelidad</p>
          </div>
        </div>
        <p className="text-[13px] sm:text-sm text-slate-400 leading-relaxed mt-3 max-w-3xl">
          Un miembro del club quiere reclamar su premio. Pídele el <strong className="text-primary">PIN de 4 dígitos</strong> que
          generó en su app y confírmalo acá: se descuentan sellos automáticamente,
          se actualiza el stock (si aplica) y queda registro en el historial del cliente.
        </p>
      </div>

      {/* ── Cómo funciona (3 pasos) ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { n: 1, Icon: Smartphone,   title: 'Cliente muestra su PIN',    desc: 'Lo genera en su app tocando "Canjear premio". Válido 5 minutos.' },
          { n: 2, Icon: KeyRound,     title: 'Ingresa los 4 dígitos',      desc: 'Se valida solo al llegar al 4to número. Aparece la instrucción de entrega.' },
          { n: 3, Icon: CheckCircle2, title: 'Confirma la entrega',        desc: 'Descuenta sellos, ajusta stock y registra el canje en el historial.' },
        ].map(({ n, Icon, title, desc }, i, arr) => (
          <div key={n} className="relative bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
              <span className="w-6 h-6 rounded-full bg-amber-500/15 text-amber-400 text-xs font-black flex items-center justify-center border border-amber-500/25 shrink-0">
                {n}
              </span>
              <Icon size={14} className="text-slate-400 shrink-0" />
              <p className="text-sm font-bold text-primary leading-tight sm:hidden">{title}</p>
            </div>
            <p className="text-sm font-bold text-primary leading-tight hidden sm:block">{title}</p>
            <p className="text-[11px] text-slate-500 mt-1 leading-snug">{desc}</p>
            {i < arr.length - 1 && (
              <ArrowRight size={14} className="hidden sm:block absolute top-1/2 -right-3 -translate-y-1/2 text-slate-700 z-10 bg-slate-950 rounded-full" />
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6">
        {/* Columna PIN + tarjeta candidato */}
        <div className="lg:col-span-3 space-y-4">

          {/* Input PIN */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <KeyRound size={12} className="text-amber-400" /> PIN del cliente
              </label>
              <span className="text-[10px] text-slate-600 italic flex items-center gap-1">
                <Timer size={10} /> Válido 5 min
              </span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
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
                className="w-full sm:flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 sm:px-4 py-3 sm:py-4 text-2xl sm:text-3xl font-black text-center text-primary tracking-[0.4em] sm:tracking-[0.6em] focus:border-amber-400 focus:outline-none"
              />
              <button
                onClick={() => buscarPorPin(pin)}
                disabled={searching || pin.length !== 4}
                className="w-full sm:w-auto px-5 py-3 sm:py-0 rounded-lg bg-amber-400 text-black font-bold text-sm disabled:opacity-40 hover:bg-amber-300 transition-colors flex items-center justify-center gap-1.5"
              >
                {searching
                  ? <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  : <ScanLine size={16} />}
                Validar
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 leading-snug">
              El cliente ve este código en <strong className="text-slate-400">Mi Club → Canjear premio</strong> de su app.
              Se valida solo al ingresar los 4 dígitos.
            </p>
            {errorMsg && (
              <p className="text-xs text-rose-400 font-semibold mt-2 flex items-start gap-1">
                <XCircle size={12} className="shrink-0 mt-0.5" /> <span>{errorMsg}</span>
              </p>
            )}
          </div>

          {/* Estado vacío antes de que aparezca la tarjeta */}
          {!candidato && !errorMsg && (
            <div className="bg-slate-950/40 border border-dashed border-slate-800 rounded-xl p-4 sm:p-6 text-center">
              <div className="w-11 h-11 sm:w-12 sm:h-12 mx-auto rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-3">
                <ScanLine size={20} className="text-slate-600" />
              </div>
              <p className="text-sm font-semibold text-slate-400">Esperando el PIN del cliente</p>
              <p className="text-[11px] sm:text-xs text-slate-600 mt-1 max-w-sm mx-auto leading-relaxed">
                Cuando ingreses los 4 dígitos correctos, verás acá el detalle del premio,
                la instrucción de entrega y el botón para confirmar.
              </p>
            </div>
          )}

          {/* Tarjeta del canje encontrado */}
          {candidato && catMeta && (
            <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
              {/* Header con foto/nombre del cliente */}
              <div className="p-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                    {cliente?.photoURL
                      ? <img src={cliente.photoURL} className="w-full h-full object-cover" alt="" />
                      : <User size={22} className="text-slate-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-primary truncate">
                      {cliente?.nombre || candidato.userName || 'Cliente'}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {cliente?.email || candidato.userId}
                    </p>
                  </div>
                  {/* Meta compacta en desktop */}
                  <div className="hidden sm:block text-right shrink-0">
                    <div className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${catColorMap[catMeta.color]}`}>
                      <catMeta.Icon size={10} /> {catMeta.label}
                    </div>
                    <p className="text-[10.5px] mt-1 text-slate-500 flex items-center justify-end gap-1">
                      <Clock size={10} /> Expira en {countdown.text}
                    </p>
                  </div>
                </div>
                {/* Meta full-width en mobile — evita colisión con nombre largo */}
                <div className="sm:hidden mt-3 flex items-center justify-between gap-2">
                  <div className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${catColorMap[catMeta.color]}`}>
                    <catMeta.Icon size={10} /> {catMeta.label}
                  </div>
                  <p className="text-[10.5px] text-slate-500 flex items-center gap-1">
                    <Clock size={10} /> Expira en {countdown.text}
                  </p>
                </div>
              </div>

              {/* Cuerpo con premio + instrucción */}
              <div className="p-4 sm:p-5 space-y-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Premio a entregar</span>
                  <h2 className="text-lg font-black text-primary leading-tight mt-0.5">
                    {candidato.prizeName || 'Premio'}
                  </h2>
                  <p className="text-xs text-amber-400 font-semibold mt-1">
                    🏆 Costo: {candidato.costoSellos} sello{candidato.costoSellos !== 1 ? 's' : ''} · se descuentan al confirmar
                  </p>
                </div>

                {/* Instrucción para el barbero */}
                <div className={`rounded-lg border px-4 py-3 ${catColorMap[catMeta.color]}`}>
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-0.5">
                    Qué debes hacer
                  </p>
                  <p className="text-sm font-semibold">
                    {buildInstruccion(candidato)}
                  </p>
                </div>

                {/* Recordatorio de qué pasa al confirmar */}
                <div className="bg-slate-950/50 border border-slate-800 rounded-lg p-3">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <ShieldCheck size={11} /> Al confirmar la entrega
                  </p>
                  <ul className="space-y-1 text-[11px] text-slate-400">
                    <li className="flex items-start gap-1.5"><span className="text-emerald-400 shrink-0">✓</span> Se descuentan {candidato.costoSellos} sello{candidato.costoSellos !== 1 ? 's' : ''} del saldo del cliente</li>
                    {candidato.categoria === 'PRODUCTO' && (candidato.configuracion?.descuentaStock) && (
                      <li className="flex items-start gap-1.5"><span className="text-emerald-400 shrink-0">✓</span> Se descuenta 1 unidad del stock del producto</li>
                    )}
                    <li className="flex items-start gap-1.5"><span className="text-emerald-400 shrink-0">✓</span> Queda registro en el historial del cliente (trazabilidad)</li>
                  </ul>
                </div>

                {countdown.expired && (
                  <p className="text-xs text-rose-400 font-semibold flex items-center gap-1.5">
                    <XCircle size={12} /> Este canje expiró — el cliente debe regenerarlo.
                  </p>
                )}
              </div>

              {/* Botones */}
              <div className="p-3 sm:p-4 bg-slate-950/40 border-t border-slate-800 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={resetear}
                  className="px-4 py-3 sm:py-2.5 text-sm text-slate-300 hover:text-primary rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors"
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
            <div className="px-4 py-3 border-b border-slate-800">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Canjes en curso
                </span>
                <span className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full font-mono">
                  {queue.length}
                </span>
              </div>
              <p className="text-[10.5px] text-slate-600 leading-snug">
                PINs activos generados por clientes. Toca uno para auto-validarlo.
              </p>
            </div>
            {queue.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-slate-500 text-xs px-4 text-center">
                <div className="w-10 h-10 rounded-full bg-slate-800/60 border border-slate-800 flex items-center justify-center mb-3">
                  <Clock size={16} className="text-slate-600" />
                </div>
                <p className="font-semibold text-slate-400">Sin canjes activos</p>
                <p className="text-[10.5px] text-slate-600 mt-1 leading-relaxed max-w-[220px]">
                  Cuando un cliente genere un PIN desde su app, aparecerá acá con cuenta regresiva.
                </p>
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
                        <p className="text-xs font-semibold text-primary truncate">
                          {r.prizeName || '—'}
                        </p>
                        <p className="text-[10px] text-slate-500 flex items-center gap-2">
                          <span className="font-mono font-bold text-amber-400">{r.token}</span>
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

      {/* ── Legenda de tipos de premio ──────────────────────────── */}
      <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <Info size={14} className="text-slate-400 shrink-0" />
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Tipos de premio que verás</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Object.entries(CATEGORIAS).map(([key, cat]) => (
            <div key={key} className={`rounded-lg border p-3 ${catColorMap[cat.color]}`}>
              <div className="flex items-center gap-2 mb-1.5">
                <cat.Icon size={14} className="shrink-0" />
                <p className="text-xs font-bold uppercase tracking-wider">{cat.label}</p>
              </div>
              <p className="text-[11px] leading-snug opacity-90">
                {key === 'PRODUCTO'  && 'Entregas un ítem físico del inventario. Si el premio lo pide, se descuenta 1 unidad del stock.'}
                {key === 'SERVICIO'  && 'Aplicas un servicio gratis (corte, arreglo de barba, etc.). Puede requerir reservar turno.'}
                {key === 'DESCUENTO' && 'Aplicas un descuento (% o monto fijo) en la caja al próximo pago del cliente.'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tips / casos raros ──────────────────────────────────── */}
      <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <HelpCircle size={14} className="text-slate-400 shrink-0" />
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Casos que podrías ver</h3>
        </div>
        <ul className="space-y-2 text-xs text-slate-400">
          <li className="flex items-start gap-2">
            <Timer size={12} className="text-rose-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-200">El PIN expiró.</strong> Los canjes duran 5 minutos.
              Pídele al cliente que abra su app y genere uno nuevo — los sellos no se pierden.
            </div>
          </li>
          <li className="flex items-start gap-2">
            <Sparkles size={12} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-200">Producto sin stock.</strong> El sistema igual permite confirmar
              (los sellos ya se descontaron cuando el cliente generó el PIN). Coordina con el cliente para reponer o cambiar el premio.
            </div>
          </li>
          <li className="flex items-start gap-2">
            <ShieldCheck size={12} className="text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-200">Verifica visualmente.</strong> Antes de confirmar, revisa que el
              nombre y la foto del cliente en la tarjeta coincidan con quien está frente a ti.
            </div>
          </li>
        </ul>
      </div>

      {/* Toast */}
      {msg && (
        <div className={`fixed left-1/2 -translate-x-1/2 bottom-8 z-50 px-5 py-3 rounded-xl font-semibold text-sm shadow-2xl border ${
          msg.type === 'ok'
            ? 'bg-emerald-500/95 text-black border-emerald-400'
            : 'bg-rose-500/95 text-primary border-rose-400'
        }`}>
          {msg.text}
        </div>
      )}
    </div>
  );
}
