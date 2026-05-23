import { useState, useEffect, useMemo } from 'react';
import {
  Wallet, DollarSign, ArrowDownCircle, ArrowUpCircle,
  Clock, X, Plus, AlertTriangle, CheckCircle2, History,
  Banknote, CreditCard, ArrowRightLeft, TrendingUp, Lock,
} from 'lucide-react';
import {
  addDoc, updateDoc, doc, query, where, orderBy,
  onSnapshot, serverTimestamp, Timestamp, getDocs, limit,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { tenantCol } from '../lib/tenantUtils';
import { useAuth } from '../contexts/AuthContext';
import HelpModal, { HelpButton } from '../components/ui/HelpModal';

/* ── Helpers ──────────────────────────────────────────────── */
function todayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return { start: Timestamp.fromDate(start), end: Timestamp.fromDate(end) };
}

function fmtCurrency(n) {
  return '$' + Math.round(n || 0).toLocaleString('es-CL');
}

function fmtTime(ts) {
  if (!ts) return '--:--';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(ts) {
  if (!ts) return '--';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateTime(ts) {
  if (!ts) return '--';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }) + ' ' + d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

/* ── KPI Card ─────────────────────────────────────────────── */
function KpiCard({ icon: Icon, label, value, color = 'emerald', sub }) {
  const colors = {
    emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 text-emerald-400',
    amber:   'from-amber-500/20 to-amber-500/5 border-amber-500/30 text-amber-400',
    blue:    'from-blue-500/20 to-blue-500/5 border-blue-500/30 text-blue-400',
    rose:    'from-rose-500/20 to-rose-500/5 border-rose-500/30 text-rose-400',
    purple:  'from-purple-500/20 to-purple-500/5 border-purple-500/30 text-purple-400',
    cyan:    'from-cyan-500/20 to-cyan-500/5 border-cyan-500/30 text-cyan-400',
  };
  const c = colors[color] || colors.emerald;
  return (
    <div className={`bg-gradient-to-br ${c} border rounded-2xl p-4 backdrop-blur-sm`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} className="opacity-80" />
        <span className="text-[11px] font-bold uppercase tracking-wider opacity-70">{label}</span>
      </div>
      <p className="text-2xl font-black tracking-tight">{value}</p>
      {sub && <p className="text-[11px] mt-1 opacity-60">{sub}</p>}
    </div>
  );
}

/* ── Mini Modal ───────────────────────────────────────────── */
function MiniModal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════ */
/*  CAJA — Control de Caja                                     */
/* ════════════════════════════════════════════════════════════ */
export default function Caja() {
  const { user } = useAuth();
  const userEmail = user?.email || 'admin';

  /* ── State ──────────────────────────────────────────────── */
  const [sesionActiva, setSesionActiva] = useState(null);   // doc data + id
  const [loadingSesion, setLoadingSesion] = useState(true);
  const [montoApertura, setMontoApertura] = useState('');
  const [abriendo, setAbriendo] = useState(false);

  // Cierre
  const [showCierre, setShowCierre] = useState(false);
  const [cierreEfectivo, setCierreEfectivo] = useState('');
  const [cierreObs, setCierreObs] = useState('');
  const [cerrando, setCerrando] = useState(false);

  // Manual adjustments
  const [showIngreso, setShowIngreso] = useState(false);
  const [showEgreso, setShowEgreso] = useState(false);
  const [adjDesc, setAdjDesc] = useState('');
  const [adjMonto, setAdjMonto] = useState('');
  const [adjSaving, setAdjSaving] = useState(false);

  // Transactions from today
  const [citasHoy, setCitasHoy] = useState([]);
  const [ventasHoy, setVentasHoy] = useState([]);
  const [gastosHoy, setGastosHoy] = useState([]);

  // Historical sessions
  const [historial, setHistorial] = useState([]);

  // Help modal
  const [showHelp, setShowHelp] = useState(false);

  /* ── Load active session ────────────────────────────────── */
  useEffect(() => {
    const q = query(tenantCol('caja_sesiones'), where('estado', '==', 'abierta'), limit(1));
    const unsub = onSnapshot(q, snap => {
      if (!snap.empty) {
        const d = snap.docs[0];
        setSesionActiva({ id: d.id, ...d.data() });
      } else {
        setSesionActiva(null);
      }
      setLoadingSesion(false);
    }, () => setLoadingSesion(false));
    return unsub;
  }, []);

  /* ── Load today's transactions ──────────────────────────── */
  useEffect(() => {
    if (!sesionActiva) return;
    const { start, end } = todayRange();

    // Citas completadas hoy
    const qCitas = query(
      tenantCol('citas'),
      where('fecha', '>=', start.toDate().toISOString().slice(0, 10)),
      where('fecha', '<=', end.toDate().toISOString().slice(0, 10)),
    );
    const unsub1 = onSnapshot(qCitas, snap => {
      setCitasHoy(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(c => c.estado === 'Completada'));
    }, () => {});

    // Productos vendidos hoy
    const qVentas = query(
      tenantCol('product_reservations'),
      where('status', '==', 'delivered'),
    );
    const unsub2 = onSnapshot(qVentas, snap => {
      const today = new Date().toISOString().slice(0, 10);
      setVentasHoy(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(v => {
        const vDate = v.fecha || v.createdAt || v.creadoEn;
        if (!vDate) return false;
        const dateStr = typeof vDate === 'string' ? vDate.slice(0, 10) : (vDate.toDate ? vDate.toDate().toISOString().slice(0, 10) : '');
        return dateStr === today;
      }));
    }, () => {});

    // Gastos de hoy
    const qGastos = query(
      tenantCol('gastos'),
      where('fecha', '>=', start),
      where('fecha', '<', end),
    );
    const unsub3 = onSnapshot(qGastos, snap => {
      setGastosHoy(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => {});

    return () => { unsub1(); unsub2(); unsub3(); };
  }, [sesionActiva]);

  /* ── Load historical sessions ───────────────────────────── */
  useEffect(() => {
    const q = query(tenantCol('caja_sesiones'), where('estado', '==', 'cerrada'), orderBy('fechaCierre', 'desc'), limit(20));
    const unsub = onSnapshot(q, snap => {
      setHistorial(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => {});
    return unsub;
  }, []);

  /* ── Computed KPIs ──────────────────────────────────────── */
  const kpis = useMemo(() => {
    const apertura = sesionActiva?.montoApertura || 0;

    // Servicios (citas completadas)
    const serviciosEfectivo = citasHoy.filter(c => c.metodoPago === 'Efectivo').reduce((s, c) => s + (Number(c.precio) || 0), 0);
    const serviciosTarjeta = citasHoy.filter(c => c.metodoPago === 'Tarjeta').reduce((s, c) => s + (Number(c.precio) || 0), 0);
    const serviciosTransf = citasHoy.filter(c => c.metodoPago === 'Transferencia').reduce((s, c) => s + (Number(c.precio) || 0), 0);
    const serviciosNoEspecificado = citasHoy.filter(c => !c.metodoPago).reduce((s, c) => s + (Number(c.precio) || 0), 0);

    // Propinas
    const propinasTotal = citasHoy.reduce((s, c) => s + (Number(c.propina) || 0), 0);

    // Productos vendidos
    const productosEfectivo = ventasHoy.filter(v => v.metodoPago === 'Efectivo').reduce((s, v) => s + (Number(v.precio) || 0) * (Number(v.cantidad) || 1), 0);
    const productosTarjeta = ventasHoy.filter(v => v.metodoPago === 'Tarjeta').reduce((s, v) => s + (Number(v.precio) || 0) * (Number(v.cantidad) || 1), 0);
    const productosTransf = ventasHoy.filter(v => v.metodoPago === 'Transferencia').reduce((s, v) => s + (Number(v.precio) || 0) * (Number(v.cantidad) || 1), 0);

    // Gastos
    const gastosEfectivo = gastosHoy.filter(g => g.metodoPago === 'Efectivo').reduce((s, g) => s + (Number(g.monto) || 0), 0);
    const gastosTarjeta = gastosHoy.filter(g => g.metodoPago === 'Tarjeta').reduce((s, g) => s + (Number(g.monto) || 0), 0);
    const gastosTransf = gastosHoy.filter(g => g.metodoPago === 'Transferencia').reduce((s, g) => s + (Number(g.monto) || 0), 0);

    // Manual adjustments
    const ingManuales = (sesionActiva?.ingresosManuales || []).reduce((s, i) => s + (Number(i.monto) || 0), 0);
    const egrManuales = (sesionActiva?.egresosManuales || []).reduce((s, i) => s + (Number(i.monto) || 0), 0);

    const totalIngresosEfectivo = serviciosEfectivo + serviciosNoEspecificado + productosEfectivo + ingManuales;
    const totalEgresosEfectivo = gastosEfectivo + egrManuales;
    const saldoEsperado = apertura + totalIngresosEfectivo - totalEgresosEfectivo;

    const totalIngresosTarjeta = serviciosTarjeta + productosTarjeta;
    const totalIngresosTransf = serviciosTransf + productosTransf;
    const totalIngresosGeneral = totalIngresosEfectivo + totalIngresosTarjeta + totalIngresosTransf;

    return {
      apertura,
      serviciosEfectivo, serviciosTarjeta, serviciosTransf, serviciosNoEspecificado,
      productosEfectivo, productosTarjeta, productosTransf,
      gastosEfectivo, gastosTarjeta, gastosTransf,
      ingManuales, egrManuales,
      totalIngresosEfectivo, totalEgresosEfectivo, saldoEsperado,
      totalIngresosTarjeta, totalIngresosTransf, totalIngresosGeneral,
      propinasTotal,
      totalCitas: citasHoy.length,
      totalVentas: ventasHoy.length,
      totalGastos: gastosHoy.length,
    };
  }, [sesionActiva, citasHoy, ventasHoy, gastosHoy]);

  /* ── Timeline ───────────────────────────────────────────── */
  const timeline = useMemo(() => {
    const items = [];
    citasHoy.forEach(c => {
      items.push({
        type: 'servicio',
        label: `${c.servicio || 'Servicio'} — ${c.clienteNombre || 'Cliente'}`,
        sub: `${c.barbero || ''} · ${c.metodoPago || 'No especificado'}`,
        monto: Number(c.precio) || 0,
        time: c.hora || '00:00',
        metodo: c.metodoPago || 'No especificado',
      });
    });
    ventasHoy.forEach(v => {
      items.push({
        type: 'producto',
        label: `${v.productName || v.productoNombre || 'Producto'} x${v.cantidad || 1}`,
        sub: `Venta producto · ${v.metodoPago || 'No especificado'}`,
        monto: (Number(v.precio) || 0) * (Number(v.cantidad) || 1),
        time: (() => {
          const ts = v.creadoEn || v.createdAt;
          if (!ts) return '00:00';
          const d = ts.toDate ? ts.toDate() : new Date(ts);
          return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        })(),
        metodo: v.metodoPago || 'No especificado',
      });
    });
    gastosHoy.forEach(g => {
      items.push({
        type: 'gasto',
        label: g.descripcion || 'Gasto',
        sub: `${g.categoria || ''} · ${g.metodoPago || 'Efectivo'}`,
        monto: -(Number(g.monto) || 0),
        time: (() => {
          const ts = g.creadoEn || g.fecha;
          if (!ts) return '00:00';
          const d = ts.toDate ? ts.toDate() : new Date(ts);
          return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        })(),
        metodo: g.metodoPago || 'Efectivo',
      });
    });
    // Manual adjustments
    (sesionActiva?.ingresosManuales || []).forEach(i => {
      items.push({
        type: 'ingreso_manual',
        label: i.descripcion || 'Ingreso manual',
        sub: 'Ajuste manual · Efectivo',
        monto: Number(i.monto) || 0,
        time: i.hora ? fmtTime(i.hora) : '00:00',
        metodo: 'Efectivo',
      });
    });
    (sesionActiva?.egresosManuales || []).forEach(i => {
      items.push({
        type: 'egreso_manual',
        label: i.descripcion || 'Egreso manual',
        sub: 'Retiro manual · Efectivo',
        monto: -(Number(i.monto) || 0),
        time: i.hora ? fmtTime(i.hora) : '00:00',
        metodo: 'Efectivo',
      });
    });
    items.sort((a, b) => a.time.localeCompare(b.time));
    return items;
  }, [citasHoy, ventasHoy, gastosHoy, sesionActiva]);

  /* ── Handlers ───────────────────────────────────────────── */
  const handleAbrirCaja = async () => {
    const monto = parseFloat(montoApertura);
    if (isNaN(monto) || monto < 0) return;
    setAbriendo(true);
    try {
      await addDoc(tenantCol('caja_sesiones'), {
        estado: 'abierta',
        fechaApertura: serverTimestamp(),
        montoApertura: monto,
        usuarioApertura: userEmail,
        ingresosManuales: [],
        egresosManuales: [],
      });
      setMontoApertura('');
    } finally { setAbriendo(false); }
  };

  const handleCerrarCaja = async () => {
    if (!sesionActiva) return;
    const efectivoReal = parseFloat(cierreEfectivo);
    if (isNaN(efectivoReal) || efectivoReal < 0) return;
    setCerrando(true);
    try {
      const esperado = kpis.saldoEsperado;
      await updateDoc(doc(tenantCol('caja_sesiones'), sesionActiva.id), {
        estado: 'cerrada',
        fechaCierre: serverTimestamp(),
        montoCierreReal: efectivoReal,
        montoCierreEsperado: esperado,
        diferencia: efectivoReal - esperado,
        usuarioCierre: userEmail,
        observaciones: cierreObs.trim(),
      });
      setCierreEfectivo('');
      setCierreObs('');
      setShowCierre(false);
    } finally { setCerrando(false); }
  };

  const handleAjuste = async (tipo) => {
    const monto = parseFloat(adjMonto);
    if (!adjDesc.trim() || isNaN(monto) || monto <= 0 || !sesionActiva) return;
    setAdjSaving(true);
    try {
      const field = tipo === 'ingreso' ? 'ingresosManuales' : 'egresosManuales';
      const current = sesionActiva[field] || [];
      await updateDoc(doc(tenantCol('caja_sesiones'), sesionActiva.id), {
        [field]: [...current, { descripcion: adjDesc.trim(), monto, hora: Timestamp.now() }],
      });
      setAdjDesc('');
      setAdjMonto('');
      setShowIngreso(false);
      setShowEgreso(false);
    } finally { setAdjSaving(false); }
  };

  /* ── Render helpers ─────────────────────────────────────── */
  const field = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors';
  const lbl = 'block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1';

  /* ── Loading ────────────────────────────────────────────── */
  if (loadingSesion) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════ */
  /*  PANTALLA DE APERTURA                                      */
  /* ═══════════════════════════════════════════════════════════ */
  if (!sesionActiva) {
    return (
      <div className="max-w-xl mx-auto pt-12 px-4">
        {/* Banner */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 mb-4">
            <Wallet size={36} className="text-emerald-400" />
          </div>
          <h1 className="text-2xl font-black text-white mb-1">Control de Caja</h1>
          <p className="text-slate-400 text-sm">Abre la caja para comenzar a registrar las transacciones del día.</p>
        </div>

        {/* Formulario de apertura */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 space-y-5">
          <div>
            <label className={lbl}>Efectivo de apertura ($)</label>
            <div className="relative">
              <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="number"
                className={`${field} pl-9`}
                placeholder="50000"
                min="0"
                value={montoApertura}
                onChange={e => setMontoApertura(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className={lbl}>Responsable</label>
            <input className={field} value={userEmail} disabled />
          </div>
          <button
            onClick={handleAbrirCaja}
            disabled={abriendo || !montoApertura}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
          >
            {abriendo ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Lock size={16} />}
            {abriendo ? 'Abriendo...' : 'Abrir Caja'}
          </button>
        </div>

        {/* Historial de cierres */}
        {historial.length > 0 && (
          <div className="mt-10">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-4">
              <History size={14} /> Historial de Cierres
            </h2>
            <div className="space-y-2">
              {historial.map(h => {
                const diff = h.diferencia ?? 0;
                return (
                  <div key={h.id} className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-semibold">{fmtDateTime(h.fechaApertura)} → {fmtDateTime(h.fechaCierre)}</p>
                      <p className="text-xs text-slate-500">{h.usuarioApertura || '-'} / {h.usuarioCierre || '-'}</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-slate-400">Esperado: <span className="text-white font-semibold">{fmtCurrency(h.montoCierreEsperado)}</span></span>
                      <span className="text-slate-400">Real: <span className="text-white font-semibold">{fmtCurrency(h.montoCierreReal)}</span></span>
                      <span className={`font-bold ${diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {diff >= 0 ? '+' : ''}{fmtCurrency(diff)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════ */
  /*  CAJA ACTIVA — Panel principal                             */
  /* ═══════════════════════════════════════════════════════════ */
  const diferenciaCierre = parseFloat(cierreEfectivo) - kpis.saldoEsperado;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <Wallet size={22} className="text-emerald-400" /> Caja Activa
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Abierta por {sesionActiva.usuarioApertura || '-'} a las {fmtTime(sesionActiva.fechaApertura)} · Apertura: {fmtCurrency(kpis.apertura)}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowIngreso(true)} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold hover:bg-emerald-500/20 transition-colors">
            <ArrowDownCircle size={14} /> Ingreso
          </button>
          <button onClick={() => setShowEgreso(true)} className="flex items-center gap-1.5 px-3 py-2 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-xs font-bold hover:bg-rose-500/20 transition-colors">
            <ArrowUpCircle size={14} /> Egreso
          </button>
          <button onClick={() => setShowCierre(true)} className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl text-xs font-bold hover:bg-amber-500/20 transition-colors">
            <Lock size={14} /> Cerrar Caja
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard icon={Banknote} label="Saldo Esperado" value={fmtCurrency(kpis.saldoEsperado)} color="emerald" sub="En caja física" />
        <KpiCard icon={ArrowDownCircle} label="Ingresos Efectivo" value={fmtCurrency(kpis.totalIngresosEfectivo)} color="blue" sub={`${kpis.totalCitas + kpis.totalVentas} transacciones`} />
        <KpiCard icon={ArrowUpCircle} label="Egresos Efectivo" value={fmtCurrency(kpis.totalEgresosEfectivo)} color="rose" sub={`${kpis.totalGastos} gastos`} />
        <KpiCard icon={CreditCard} label="Tarjeta" value={fmtCurrency(kpis.totalIngresosTarjeta)} color="purple" />
        <KpiCard icon={ArrowRightLeft} label="Transferencia" value={fmtCurrency(kpis.totalIngresosTransf)} color="cyan" />
        <KpiCard icon={TrendingUp} label="Total General" value={fmtCurrency(kpis.totalIngresosGeneral)} color="amber" sub={`Propinas: ${fmtCurrency(kpis.propinasTotal)}`} />
      </div>

      {/* Desglose rápido */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cash flow summary */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5">
          <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Banknote size={15} className="text-emerald-400" /> Flujo de Efectivo</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-400">Apertura</span><span className="text-white font-semibold">{fmtCurrency(kpis.apertura)}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">+ Servicios (efectivo)</span><span className="text-emerald-400 font-semibold">+{fmtCurrency(kpis.serviciosEfectivo + kpis.serviciosNoEspecificado)}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">+ Productos (efectivo)</span><span className="text-emerald-400 font-semibold">+{fmtCurrency(kpis.productosEfectivo)}</span></div>
            {kpis.ingManuales > 0 && <div className="flex justify-between"><span className="text-slate-400">+ Ingresos manuales</span><span className="text-emerald-400 font-semibold">+{fmtCurrency(kpis.ingManuales)}</span></div>}
            <div className="flex justify-between"><span className="text-slate-400">− Gastos (efectivo)</span><span className="text-rose-400 font-semibold">-{fmtCurrency(kpis.gastosEfectivo)}</span></div>
            {kpis.egrManuales > 0 && <div className="flex justify-between"><span className="text-slate-400">− Egresos manuales</span><span className="text-rose-400 font-semibold">-{fmtCurrency(kpis.egrManuales)}</span></div>}
            <div className="border-t border-slate-700 pt-2 mt-2 flex justify-between">
              <span className="text-white font-bold">Saldo Esperado</span>
              <span className="text-emerald-400 font-black text-lg">{fmtCurrency(kpis.saldoEsperado)}</span>
            </div>
          </div>
        </div>

        {/* Other methods */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5">
          <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><CreditCard size={15} className="text-purple-400" /> Otros Métodos</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-purple-500/5 border border-purple-500/20 rounded-xl">
              <div className="flex items-center gap-2 text-sm text-purple-300"><CreditCard size={14} /> Tarjeta</div>
              <div className="text-right">
                <p className="text-lg font-bold text-purple-300">{fmtCurrency(kpis.totalIngresosTarjeta)}</p>
                <p className="text-[10px] text-slate-500">Serv: {fmtCurrency(kpis.serviciosTarjeta)} · Prod: {fmtCurrency(kpis.productosTarjeta)}</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-cyan-500/5 border border-cyan-500/20 rounded-xl">
              <div className="flex items-center gap-2 text-sm text-cyan-300"><ArrowRightLeft size={14} /> Transferencia</div>
              <div className="text-right">
                <p className="text-lg font-bold text-cyan-300">{fmtCurrency(kpis.totalIngresosTransf)}</p>
                <p className="text-[10px] text-slate-500">Serv: {fmtCurrency(kpis.serviciosTransf)} · Prod: {fmtCurrency(kpis.productosTransf)}</p>
              </div>
            </div>
            {kpis.propinasTotal > 0 && (
              <div className="flex items-center justify-between p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                <div className="flex items-center gap-2 text-sm text-amber-300"><DollarSign size={14} /> Propinas</div>
                <p className="text-lg font-bold text-amber-300">{fmtCurrency(kpis.propinasTotal)}</p>
              </div>
            )}
            {(kpis.gastosTarjeta > 0 || kpis.gastosTransf > 0) && (
              <div className="flex items-center justify-between p-3 bg-rose-500/5 border border-rose-500/20 rounded-xl">
                <div className="flex items-center gap-2 text-sm text-rose-300"><ArrowUpCircle size={14} /> Gastos (otros)</div>
                <p className="text-lg font-bold text-rose-300">{fmtCurrency(kpis.gastosTarjeta + kpis.gastosTransf)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5">
        <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Clock size={15} className="text-blue-400" /> Transacciones del Día ({timeline.length})</h2>
        {timeline.length === 0 ? (
          <p className="text-center text-slate-500 text-sm py-6">Aún no hay transacciones registradas hoy.</p>
        ) : (
          <div className="space-y-1.5 max-h-[28rem] overflow-y-auto pr-2">
            {timeline.map((t, i) => {
              const isPositive = t.monto >= 0;
              const typeColors = {
                servicio: 'border-l-blue-500',
                producto: 'border-l-emerald-500',
                gasto: 'border-l-rose-500',
                ingreso_manual: 'border-l-amber-500',
                egreso_manual: 'border-l-red-500',
              };
              return (
                <div key={i} className={`flex items-center gap-3 px-3 py-2.5 bg-slate-900/40 border border-slate-700/30 border-l-2 ${typeColors[t.type] || 'border-l-slate-500'} rounded-lg`}>
                  <span className="text-xs text-slate-500 font-mono w-12 shrink-0">{t.time}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{t.label}</p>
                    <p className="text-[11px] text-slate-500 truncate">{t.sub}</p>
                  </div>
                  <span className={`text-sm font-bold shrink-0 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isPositive ? '+' : ''}{fmtCurrency(t.monto)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Historial de cierres */}
      {historial.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-3">
            <History size={14} /> Historial de Cierres
          </h2>
          <div className="space-y-2">
            {historial.slice(0, 10).map(h => {
              const diff = h.diferencia ?? 0;
              return (
                <div key={h.id} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-semibold">{fmtDateTime(h.fechaApertura)} → {fmtDateTime(h.fechaCierre)}</p>
                    <p className="text-xs text-slate-500">{h.usuarioApertura || '-'} / {h.usuarioCierre || '-'}{h.observaciones ? ` · ${h.observaciones}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-slate-400">Esperado: <span className="text-white font-semibold">{fmtCurrency(h.montoCierreEsperado)}</span></span>
                    <span className="text-slate-400">Real: <span className="text-white font-semibold">{fmtCurrency(h.montoCierreReal)}</span></span>
                    <span className={`font-bold px-2 py-0.5 rounded-full text-[11px] ${diff >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                      {diff >= 0 ? '▲' : '▼'} {fmtCurrency(Math.abs(diff))}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── MODALES ──────────────────────────────────────────── */}

      {/* Modal Cerrar Caja */}
      {showCierre && (
        <MiniModal title="Cerrar Caja" onClose={() => setShowCierre(false)}>
          <div className="space-y-4">
            <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl text-sm text-amber-300 flex items-start gap-2">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>Saldo esperado en efectivo: <strong>{fmtCurrency(kpis.saldoEsperado)}</strong></span>
            </div>
            <div>
              <label className={lbl}>Efectivo físico contado ($)</label>
              <input type="number" className={field} placeholder="0" min="0" value={cierreEfectivo} onChange={e => setCierreEfectivo(e.target.value)} />
            </div>
            {cierreEfectivo !== '' && (
              <div className={`p-3 rounded-xl text-sm font-bold flex items-center gap-2 ${diferenciaCierre >= 0 ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'}`}>
                {diferenciaCierre >= 0 ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                Diferencia: {diferenciaCierre >= 0 ? '+' : ''}{fmtCurrency(diferenciaCierre)}
                {diferenciaCierre >= 0 ? ' (Sobrante)' : ' (Faltante)'}
              </div>
            )}
            <div>
              <label className={lbl}>Observaciones / Novedades</label>
              <textarea className={`${field} resize-none`} rows={2} placeholder="Ej: Se cayó una moneda..." value={cierreObs} onChange={e => setCierreObs(e.target.value)} />
            </div>
            <button
              onClick={handleCerrarCaja}
              disabled={cerrando || cierreEfectivo === ''}
              className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 text-white font-bold text-sm transition-colors"
            >
              {cerrando ? 'Cerrando...' : 'Confirmar Cierre de Caja'}
            </button>
          </div>
        </MiniModal>
      )}

      {/* Modal Ingreso Manual */}
      {showIngreso && (
        <MiniModal title="Registrar Ingreso" onClose={() => setShowIngreso(false)}>
          <div className="space-y-3">
            <div>
              <label className={lbl}>Descripción</label>
              <input className={field} placeholder="Ej: Cambio sencillo traído" value={adjDesc} onChange={e => setAdjDesc(e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Monto ($)</label>
              <input type="number" className={field} placeholder="0" min="0" value={adjMonto} onChange={e => setAdjMonto(e.target.value)} />
            </div>
            <button
              onClick={() => handleAjuste('ingreso')}
              disabled={adjSaving || !adjDesc.trim() || !adjMonto}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-bold text-sm transition-colors"
            >
              {adjSaving ? 'Guardando...' : 'Registrar Ingreso'}
            </button>
          </div>
        </MiniModal>
      )}

      {/* Modal Egreso Manual */}
      {showEgreso && (
        <MiniModal title="Registrar Egreso / Retiro" onClose={() => setShowEgreso(false)}>
          <div className="space-y-3">
            <div>
              <label className={lbl}>Descripción</label>
              <input className={field} placeholder="Ej: Retiro parcial por seguridad" value={adjDesc} onChange={e => setAdjDesc(e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Monto ($)</label>
              <input type="number" className={field} placeholder="0" min="0" value={adjMonto} onChange={e => setAdjMonto(e.target.value)} />
            </div>
            <button
              onClick={() => handleAjuste('egreso')}
              disabled={adjSaving || !adjDesc.trim() || !adjMonto}
              className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:bg-slate-700 text-white font-bold text-sm transition-colors"
            >
              {adjSaving ? 'Guardando...' : 'Registrar Egreso'}
            </button>
          </div>
        </MiniModal>
      )}
    </div>
  );
}
