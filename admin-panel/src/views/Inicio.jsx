import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDocs, getDoc, query, where } from 'firebase/firestore';
import { motion } from 'framer-motion';
import {
  Users, TrendingDown, DollarSign, RefreshCcw, CalendarCheck, UserPlus,
  ClipboardList, Cake, MessageCircle, ArrowUpRight, ArrowDownRight, Clock,
  ExternalLink, Hourglass, Receipt, Wallet, ChevronRight,
  Target, TrendingUp, AlertTriangle, CheckCircle2,
} from 'lucide-react';
/* Nota: el banner de "Liquidaciones pendientes de aceptación" se renderiza
   en `agenda.html` (panel del barbero), NO acá. Este panel admin solo lo ve
   admin/jefe y para ellos no aplica. */
import {
  ResponsiveContainer, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { tenantCol, tenantDoc } from '../lib/tenantUtils';
import { withTimeout } from '../lib/firestore-helpers';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';
import { useConfig } from '../hooks/useConfig';

/* ── Helpers de fecha ─────────────────────────────────────────────── */
function dateToStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const localDateStr = () => dateToStr(new Date());

function monthBounds(offset = 0) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  const first = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  const last  = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { first, last: dateToStr(last), key: first.slice(0, 7) };
}

const fmtCLP = v => `$${Math.round(v || 0).toLocaleString('es-CL')}`;
const fmtCLPshort = v => (v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${Math.round(v || 0)}`);

function parseDateStr(val) {
  if (!val) return '';
  if (typeof val === 'string') return val.slice(0, 10);
  if (val.toDate)              { try { return val.toDate().toISOString().slice(0, 10); } catch { return ''; } }
  if (val instanceof Date)     return val.toISOString().slice(0, 10);
  return '';
}

const VENTA_OK = ['confirmed', 'completed', 'paid', 'delivered'];
const DOW_SHORT = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
};

const nowHHMM = () => {
  const n = new Date();
  return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
};

/** Estado del local según horario configurado (días laborales + rango horario). */
function isOpenNow(config) {
  const now  = new Date();
  const dias = config?.diasLaborales || [1, 2, 3, 4, 5, 6];
  if (!dias.includes(now.getDay())) return false;
  const cur = nowHHMM();
  return cur >= (config?.horarioInicio || '09:00') && cur <= (config?.horarioFin || '21:00');
}

/* ── Acento dinámico por tenant (clases full-string para purge + hex para Recharts) ── */
const ACCENT = {
  emerald: { text: 'text-emerald-400', tile: 'bg-emerald-500/10 text-emerald-400', dot: 'bg-emerald-400', hex: '#34d399' },
  cyan:    { text: 'text-cyan-400',    tile: 'bg-cyan-500/10 text-cyan-400',       dot: 'bg-cyan-400',    hex: '#22d3ee' },
  lime:    { text: 'text-lime-400',    tile: 'bg-lime-500/10 text-lime-400',       dot: 'bg-lime-400',    hex: '#a3e635' },
  pink:    { text: 'text-pink-400',    tile: 'bg-pink-500/10 text-pink-400',       dot: 'bg-pink-400',    hex: '#f472b6' },
  purple:  { text: 'text-purple-400',  tile: 'bg-purple-500/10 text-purple-400',   dot: 'bg-purple-400',  hex: '#c084fc' },
  slate:   { text: 'text-slate-300',   tile: 'bg-slate-500/10 text-slate-300',     dot: 'bg-slate-300',   hex: '#cbd5e1' },
  zinc:    { text: 'text-zinc-200',    tile: 'bg-zinc-400/10 text-zinc-200',       dot: 'bg-zinc-200',    hex: '#e4e4e7' },
  red:     { text: 'text-red-400',     tile: 'bg-red-500/10 text-red-400',         dot: 'bg-red-400',     hex: '#f87171' },
  orange:  { text: 'text-orange-400',  tile: 'bg-orange-500/10 text-orange-400',   dot: 'bg-orange-400',  hex: '#fb923c' },
};

/* ── Animación de entrada (fade-in + slide-up) ────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.4, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] },
  }),
};

/* ── Badge de variación ──────────────────────────────────────────── */
/**
 * @param {{ value:number|null, invert?:boolean }} props
 */
function Delta({ value, invert = false }) {
  if (value === null || value === undefined || !isFinite(value)) return null;
  const flat = Math.abs(value) < 0.5;
  const up   = value > 0;
  const good = flat ? null : invert ? !up : up;
  const cls  = flat
    ? 'bg-slate-800 text-slate-400 border-slate-700'
    : good
      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15'
      : 'bg-rose-500/10 text-rose-400 border-rose-500/15';
  const Arrow = flat ? null : up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded border ${cls}`}>
      {Arrow && <Arrow size={10} />}
      {flat ? '0%' : `${Math.abs(value).toFixed(1)}%`}
    </span>
  );
}

/* ── Tarjeta KPI del día (ícono watermark + número grande) ────────── */
/**
 * @typedef {Object} DayKpiProps
 * @property {import('lucide-react').LucideIcon} Icon
 * @property {string} label
 * @property {string|number} value
 * @property {string} [sub]
 * @property {number|null} [delta]       Variación % (vs ayer). Omitir si no aplica.
 * @property {boolean} [invertDelta]     true si "menos es mejor".
 * @property {{text:string,tile:string,hex:string}} accent
 * @property {number} [index]            Orden para el stagger de entrada.
 */
/** @param {DayKpiProps} props */
function DayKpiCard({ Icon, label, value, sub, delta, invertDelta, accent, index = 0 }) {
  return (
    <motion.div
      variants={fadeUp} initial="hidden" animate="show" custom={index}
      className="relative overflow-hidden bg-slate-800/50 backdrop-blur border border-slate-700/60 rounded-2xl p-5 hover:border-slate-600 transition-colors"
    >
      {/* Ícono semitransparente de fondo */}
      <Icon className={`absolute -right-3 -bottom-3 ${accent.text} opacity-[0.07] pointer-events-none`} size={104} strokeWidth={1.5} />
      <div className="relative">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
          <div className={`p-1.5 rounded-lg ${accent.tile}`}><Icon size={15} /></div>
        </div>
        <p className="text-2xl sm:text-3xl font-bold text-white mt-3 tabular-nums">{value}</p>
        <div className="flex items-center gap-2 mt-1.5 min-h-[18px]">
          {delta !== undefined && <Delta value={delta} invert={invertDelta} />}
          {sub && <p className="text-xs text-slate-500 truncate">{sub}</p>}
        </div>
      </div>
    </motion.div>
  );
}

/* ── Panel con título ────────────────────────────────────────────── */
/**
 * @param {{ title:React.ReactNode, action?:React.ReactNode, children:React.ReactNode, className?:string, index?:number }} props
 */
function Panel({ title, action, children, className = '', index = 0 }) {
  return (
    <motion.div
      variants={fadeUp} initial="hidden" animate="show" custom={index}
      className={`bg-slate-800/50 backdrop-blur border border-slate-700/60 rounded-2xl p-5 ${className}`}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-white">{title}</h2>
        {action}
      </div>
      {children}
    </motion.div>
  );
}

/* ── Tooltip del gráfico de ingresos ─────────────────────────────── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900/95 backdrop-blur border border-slate-700 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm font-bold text-white tabular-nums">{fmtCLP(payload[0].value)}</p>
    </div>
  );
}

const PIE_COLORS = ['#10b981', '#475569'];

export default function Inicio() {
  const tenant   = useTenant();
  const navigate = useNavigate();
  const { role, user } = useAuth();
  const { config } = useConfig();
  const isAdmin  = role === 'admin' || role === 'jefe';
  const A        = ACCENT[tenant.accent] ?? ACCENT.emerald;

  const [citas,     setCitas]     = useState([]);
  const [servicios, setServicios] = useState([]);
  const [clientes,  setClientes]  = useState([]);
  const [aggStats,  setAggStats]  = useState(null);   // resumen precalculado (_stats/resumen)
  const [gastos,    setGastos]    = useState([]);
  const [ventas,    setVentas]    = useState([]);
  const [espera,    setEspera]    = useState([]);     // lista de espera
  const [loading,   setLoading]   = useState(true);
  const [fetching,  setFetching]  = useState(false);
  const [loadError, setLoadError] = useState(null);

  // ID de fetch en curso (anti-race-condition al pulsar "Actualizar" varias
  // veces o si el efecto re-dispara antes de terminar el anterior).
  const fetchIdRef = useRef(0);

  const mesActual = useMemo(() => monthBounds(0),  []);
  const mesPrev   = useMemo(() => monthBounds(-1), []);

  const fetchData = useCallback(async () => {
    const myId = ++fetchIdRef.current;
    setFetching(true);
    setLoadError(null);
    try {
      // Resumen precalculado por la Cloud Function (1 lectura). Si existe, evitamos
      // traer toda la colección de clientes (~700 lecturas) para los KPIs de clientes.
      let stats = null;
      try {
        const statsSnap = await withTimeout(getDoc(tenantDoc('_stats', 'resumen')), 10000, 'stats');
        if (statsSnap.exists()) stats = statsSnap.data();
      } catch { /* sin stats → fallback al fetch completo */ }
      if (myId !== fetchIdRef.current) return;
      setAggStats(stats);

      // Acotamos gastos/ventas/citas a partir del mes anterior. Antes se
      // traian historiales completos (miles de docs en tenants viejos) y el
      // componente solo usa el mes actual + anterior.
      const tasks = [
        withTimeout(getDocs(query(tenantCol('citas'), where('fecha', '>=', mesPrev.first))), 20000, 'citas'),
        withTimeout(getDocs(tenantCol('servicios')), 15000, 'servicios'),
        withTimeout(getDocs(query(tenantCol('gastos'), where('fecha', '>=', mesPrev.first))), 20000, 'gastos'),
        withTimeout(getDocs(query(tenantCol('product_reservations'), where('fecha', '>=', mesPrev.first))), 20000, 'ventas'),
        withTimeout(getDocs(tenantCol('listaEspera')), 15000, 'espera'),
      ];
      // Fallback: solo traemos clientes si NO hay stats agregados todavía.
      if (!stats) tasks.push(withTimeout(getDocs(tenantCol('users')), 20000, 'users'));

      const [citasSnap, servSnap, gastosSnap, ventasSnap, esperaSnap, cliSnap] = await Promise.all(tasks);
      if (myId !== fetchIdRef.current) return;
      setCitas(citasSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setServicios(servSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setGastos(gastosSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setVentas(ventasSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setEspera(esperaSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setClientes(cliSnap ? cliSnap.docs.map(d => ({ id: d.id, ...d.data() })) : []);
    } catch (e) {
      if (myId !== fetchIdRef.current) return;
      console.error('Inicio fetchData:', e);
      setLoadError(e.message || 'No se pudo cargar la información');
    } finally {
      if (myId === fetchIdRef.current) {
        setFetching(false);
        setLoading(false);
      }
    }
  }, [mesPrev.first]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const precioMap = useMemo(() => {
    const m = {};
    servicios.forEach(s => {
      if (s.id)     m[s.id]     = Number(s.precio) || 0;
      if (s.nombre) m[s.nombre] = Number(s.precio) || 0;
    });
    return m;
  }, [servicios]);

  const getPrice = useCallback(c =>
    c.cortesia ? 0 : (Number(c.precio) || precioMap[c.servicioId] || precioMap[c.servicioNombre] || 0),
    [precioMap]);

  /* ── Ingresos por día (servicios completados + ventas de productos) ── */
  const revenueByDay = useMemo(() => {
    const map = {};
    citas.forEach(c => {
      if (c.estado === 'Completada' && c.fecha) map[c.fecha] = (map[c.fecha] || 0) + getPrice(c);
    });
    ventas.forEach(v => {
      if (!VENTA_OK.includes(v.status)) return;
      const d = parseDateStr(v.fecha || v.createdAt || v.creadoEn);
      if (d) map[d] = (map[d] || 0) + (Number(v.precio) || Number(v.total) || 0);
    });
    return map;
  }, [citas, ventas, getPrice]);

  const pctDelta = (a, b) => (!b ? (a > 0 ? 100 : null) : ((a - b) / b) * 100);

  /* ── KPIs del DÍA (hoy vs ayer) ──────────────────────────────────── */
  const dia = useMemo(() => {
    const hoy  = localDateStr();
    const ayer = dateToStr(new Date(Date.now() - 86_400_000));
    const citasHoy     = citas.filter(c => c.fecha === hoy);
    const completadas  = citasHoy.filter(c => c.estado === 'Completada');
    const totalHoy     = citasHoy.filter(c => c.estado !== 'Cancelada').length;
    const ingresosServ = completadas.reduce((s, c) => s + getPrice(c), 0);
    const ingresosHoy  = revenueByDay[hoy]  || 0;
    const ingresosAyer = revenueByDay[ayer] || 0;
    return {
      ingresos:    ingresosHoy,
      deltaIngres: pctDelta(ingresosHoy, ingresosAyer),
      completadas: completadas.length,
      total:       totalHoy,
      ticket:      completadas.length ? ingresosServ / completadas.length : 0,
    };
  }, [citas, getPrice, revenueByDay]);

  const enEspera = useMemo(
    () => espera.filter(e => e.estado === 'en_espera' || e.estado === 'notificado').length,
    [espera],
  );

  /* ── Ingresos de la semana actual (Lun→Dom o últimos 7 días) ─────── */
  const semanaData = useMemo(() => {
    const out = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = dateToStr(d);
      out.push({ label: DOW_SHORT[d.getDay()], date: key, value: revenueByDay[key] || 0 });
    }
    return out;
  }, [revenueByDay]);
  const semanaTotal = useMemo(() => semanaData.reduce((s, d) => s + d.value, 0), [semanaData]);

  /* ── Próximas citas de hoy (desde la hora actual) ────────────────── */
  const proximas = useMemo(() => {
    const hoy = localDateStr();
    const ahora = nowHHMM();
    return citas
      .filter(c => c.fecha === hoy && (c.estado === 'Pendiente' || c.estado === 'Confirmada') && (c.hora || '99:99') >= ahora)
      .sort((a, b) => (a.hora || '').localeCompare(b.hora || ''))
      .slice(0, 5);
  }, [citas]);

  /* ── Cálculo mensual (para el resumen del mes) ───────────────────── */
  const monthStats = useCallback((mb) => {
    const rango       = citas.filter(c => c.fecha >= mb.first && c.fecha <= mb.last);
    const completadas = rango.filter(c => c.estado === 'Completada');
    const ingresosServ = completadas.reduce((s, c) => s + getPrice(c), 0);
    const ventasMes = ventas.filter(v => {
      const d = parseDateStr(v.fecha || v.createdAt || v.creadoEn);
      return d >= mb.first && d <= mb.last && VENTA_OK.includes(v.status);
    });
    const ingresosProd = ventasMes.reduce((s, v) => s + (Number(v.precio) || Number(v.total) || 0), 0);
    const gastosMes = gastos.filter(g => {
      const d = parseDateStr(g.fecha || g.creadoEn);
      return d >= mb.first && d <= mb.last;
    }).reduce((s, g) => s + (Number(g.monto) || 0), 0);
    const atendidos = new Set(completadas.map(c => c.clienteNombre || c.clienteId).filter(Boolean)).size;
    return {
      ventas:      ingresosServ + ingresosProd,
      gastos:      gastosMes,
      reservas:    rango.length,
      completadas: completadas.length,
      ticket:      completadas.length ? ingresosServ / completadas.length : 0,
      atendidos,
    };
  }, [citas, ventas, gastos, getPrice]);

  const cur  = useMemo(() => monthStats(mesActual), [monthStats, mesActual]);
  const prev = useMemo(() => monthStats(mesPrev),   [monthStats, mesPrev]);

  /* ── Meta del mes + break-even del día ────────────────────────────── */
  // Meta y costo fijo viven en `configuracion/main` (seteados en
  // Configuracion.jsx). Si no están definidos, derivamos un costo diario
  // automático desde los gastos del mes anterior — así la card es útil aunque
  // el dueño no haya configurado nada.
  const finanzas = useMemo(() => {
    const meta = Math.max(0, Number(config?.metaMensualVentas) || 0);
    const hoy = new Date();
    const finMes = new Date(mesActual.last);
    const enMesActual = hoy >= new Date(mesActual.first) && hoy <= finMes;
    // diasMes = total de días del mes. diaActual = qué día va corriendo (o el
    // último del mes si estamos en otro mes, por seguridad).
    const diasMes = finMes.getDate();
    const diaActual = enMesActual ? hoy.getDate() : diasMes;
    const diasRestantes = Math.max(0, diasMes - diaActual);
    // Proyección lineal: si seguimos al mismo ritmo, ¿con cuánto cerramos?
    const proyeccion = diaActual > 0 ? (cur.ventas / diaActual) * diasMes : 0;
    // Lo que falta cada día restante para alcanzar la meta.
    const faltaPorDia = meta > 0 && diasRestantes > 0
      ? Math.max(0, (meta - cur.ventas) / diasRestantes)
      : 0;
    const pctMeta       = meta > 0 ? Math.min(100, (cur.ventas / meta) * 100) : 0;
    const pctProyeccion = meta > 0 ? Math.min(100, (proyeccion  / meta) * 100) : 0;

    // Costo fijo configurado o fallback automático (gastos mes pasado / 30).
    const costoConfig = Number(config?.costoDiarioFijo);
    const costoAuto   = prev.gastos > 0 ? Math.round(prev.gastos / 30) : 0;
    const costoDiario = Number.isFinite(costoConfig) && costoConfig > 0 ? costoConfig : costoAuto;
    const costoEsAuto = !(Number.isFinite(costoConfig) && costoConfig > 0);
    const cubierto    = costoDiario > 0 && dia.ingresos >= costoDiario;
    const faltaHoy    = Math.max(0, costoDiario - dia.ingresos);
    const pctBE       = costoDiario > 0 ? Math.min(100, (dia.ingresos / costoDiario) * 100) : 0;

    return {
      meta, diasMes, diaActual, diasRestantes,
      proyeccion, faltaPorDia, pctMeta, pctProyeccion,
      costoDiario, costoEsAuto, cubierto, faltaHoy, pctBE,
    };
  }, [config?.metaMensualVentas, config?.costoDiarioFijo, cur.ventas, prev.gastos, dia.ingresos, mesActual.first, mesActual.last]);

  /* ── Fidelización del Club ───────────────────────────────────────── */
  const fidelizacion = useMemo(() => {
    if (aggStats) {
      const total = aggStats.registrados || 0;
      const con   = aggStats.conSellos   || 0;
      const sin   = aggStats.sinSellos ?? Math.max(0, total - con);
      return { data: [{ name: 'Con sellos', value: con }, { name: 'Sin sellos', value: sin }], con, sin, total, pct: total ? Math.round((con / total) * 100) : 0 };
    }
    const isLegacy = c => !!c?.uid && c?.uid === c?.id;
    const registrados = clientes.filter(c => !isLegacy(c));
    const sellos = c => c.sellosHistoricos ?? c.stamps ?? 0;
    const con = registrados.filter(c => sellos(c) > 0).length;
    const sin = registrados.length - con;
    return { data: [{ name: 'Con sellos', value: con }, { name: 'Sin sellos', value: sin }], con, sin, total: registrados.length, pct: registrados.length ? Math.round((con / registrados.length) * 100) : 0 };
  }, [aggStats, clientes]);

  /* ── Últimas visitas ─────────────────────────────────────────────── */
  const ultimasVisitas = useMemo(() =>
    citas
      .filter(c => c.estado === 'Completada')
      .sort((a, b) => (b.fecha + (b.hora || '')).localeCompare(a.fecha + (a.hora || '')))
      .slice(0, 7),
    [citas]);

  /* ── Cumpleaños del mes ──────────────────────────────────────────── */
  const cumpleaneros = useMemo(() => {
    if (aggStats) return (aggStats.cumpleanerosMes || []).map(c => ({ ...c, _dia: c.dia || 99 }));
    const mm = String(new Date().getMonth() + 1).padStart(2, '0');
    return clientes
      .filter(c => {
        if (c.cumpleDia)       return c.cumpleDia.startsWith(mm + '-');
        if (c.fechaNacimiento) return c.fechaNacimiento.split('-')[1] === mm;
        return false;
      })
      .map(c => {
        const fn = c.fechaNacimiento || '';
        const dia = c.cumpleDia ? c.cumpleDia.split('-')[1] : (fn.split('-')[2] || '');
        return { ...c, _dia: Number(dia) || 99 };
      })
      .sort((a, b) => a._dia - b._dia);
  }, [aggStats, clientes]);

  const cumpleWaUrl = useCallback((c) => {
    const raw = (c.telefono || '').replace(/\D/g, '');
    if (!raw || raw.length < 8) return null;
    const num = raw.startsWith('56') ? raw : `56${raw}`;
    const msg = `¡Feliz cumpleaños ${c.nombre || ''}! 🎉 De parte de todo el equipo de ${tenant.name} te deseamos un gran día. Te esperamos pronto. 🎁`;
    return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
  }, [tenant.name]);

  const userName = (user?.displayName || user?.email || '').split('@')[0].split(' ')[0];
  const open     = isOpenNow(config);
  const fechaHoy = useMemo(() => {
    const s = new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: A.hex, borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (loadError && !citas.length && !servicios.length) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-center px-4">
        <p className="text-sm text-slate-300">No pudimos cargar el inicio.</p>
        <p className="text-xs text-slate-500">{loadError}</p>
        <button
          onClick={fetchData}
          className="mt-1 px-4 py-2 rounded-lg text-xs font-semibold border transition-all"
          style={{ borderColor: A.hex + '66', color: A.hex, background: A.hex + '14' }}
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* ── Header de bienvenida ─────────────────────────────────────── */}
      <motion.div
        variants={fadeUp} initial="hidden" animate="show"
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          {tenant.logo && <img src={tenant.logo} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              {greeting()}{userName ? `, ${userName}` : ''} 👋
            </h1>
            <div className="flex items-center flex-wrap gap-x-2.5 gap-y-1 mt-0.5">
              <p className="text-sm text-slate-500 capitalize">{fechaHoy}</p>
              <span className="text-slate-700">·</span>
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${open ? 'text-emerald-400' : 'text-slate-400'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${open ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                {open ? 'Local abierto' : 'Local cerrado'}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={fetchData}
          disabled={fetching}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-slate-700/60 bg-slate-800/50 text-slate-400 hover:text-white hover:border-slate-600 disabled:opacity-40 transition-all self-start"
        >
          <RefreshCcw size={12} className={fetching ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </motion.div>

      {/* ── KPIs del día ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <DayKpiCard
          index={0} accent={A} Icon={Wallet}
          label="Ingresos hoy" value={fmtCLP(dia.ingresos)}
          delta={dia.deltaIngres} sub="vs. ayer"
        />
        <DayKpiCard
          index={1} accent={A} Icon={CalendarCheck}
          label="Citas hoy" value={`${dia.completadas}/${dia.total}`}
          sub="completadas / agendadas"
        />
        <DayKpiCard
          index={2} accent={A} Icon={Hourglass}
          label="En fila de espera" value={enEspera}
          sub={enEspera === 1 ? 'cliente esperando' : 'clientes esperando'}
        />
        <DayKpiCard
          index={3} accent={A} Icon={Receipt}
          label="Ticket promedio" value={fmtCLP(dia.ticket)}
          sub="por cita de hoy"
        />
      </div>

      {/* ── Meta del mes + Break-even del día ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <MetaMesPanel
          index={4}
          accent={A}
          finanzas={finanzas}
          ventasMes={cur.ventas}
          configurada={Number(config?.metaMensualVentas) > 0}
          onConfigurar={() => navigate('/configuracion')}
        />
        <BreakEvenPanel
          index={5}
          accent={A}
          finanzas={finanzas}
          ingresosHoy={dia.ingresos}
        />
      </div>

      {/* ── Rendimiento semanal + Próximas citas ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Gráfico de ingresos de la semana */}
        <Panel
          index={6}
          className="lg:col-span-2"
          title="Ingresos de la semana"
          action={<span className="text-sm font-bold text-white tabular-nums">{fmtCLP(semanaTotal)}</span>}
        >
          <div className="h-[230px] -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={semanaData} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={A.hex} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={A.hex} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#334155" strokeOpacity={0.35} strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} dy={6} />
                <YAxis hide domain={[0, 'dataMax + 100']} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: A.hex, strokeOpacity: 0.25, strokeWidth: 1 }} />
                <Area
                  type="monotone" dataKey="value"
                  stroke={A.hex} strokeWidth={2.5}
                  fill="url(#revGlow)"
                  dot={false}
                  activeDot={{ r: 4, fill: A.hex, stroke: '#0f172a', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* Próximas citas (timeline) */}
        <Panel
          index={7}
          title="Próximas citas"
          action={
            <button onClick={() => navigate('/agenda')} className={`flex items-center gap-1 text-xs font-semibold ${A.text} hover:opacity-80`}>
              Agenda <ExternalLink size={12} />
            </button>
          }
        >
          {proximas.length === 0 ? (
            <p className="text-sm text-slate-500 italic text-center py-10">No quedan citas pendientes hoy.</p>
          ) : (
            <ol className="relative space-y-3">
              {proximas.map((c, i) => (
                <li key={c.id || i} className="relative flex gap-3">
                  {/* Línea + nodo del timeline */}
                  <div className="flex flex-col items-center">
                    <span className={`w-2.5 h-2.5 rounded-full ${A.dot} ring-4 ring-slate-800/60 shrink-0 mt-1`} />
                    {i < proximas.length - 1 && <span className="w-px flex-1 bg-slate-700/60 my-1" />}
                  </div>
                  <button
                    onClick={() => navigate('/agenda')}
                    className="group/cita flex-1 text-left -mt-0.5 pb-1"
                    title="Ver en la agenda"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-white tabular-nums">
                        <Clock size={11} className={A.text} />{c.hora || '--:--'}
                      </span>
                      <ChevronRight size={14} className="text-slate-600 group-hover/cita:text-slate-300 transition-colors" />
                    </div>
                    <p className="text-sm font-semibold text-white truncate mt-0.5">{c.clienteNombre || 'Cliente'}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {c.servicioNombre || 'Servicio'}{c.barbero ? ` · ${c.barbero}` : ''}
                    </p>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>

      {/* ── Resumen del mes + Fidelización ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel index={8} title="Resumen del mes" className="lg:col-span-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <MonthStat Icon={DollarSign} accent={A} label="Ventas"   value={fmtCLP(cur.ventas)}  delta={pctDelta(cur.ventas, prev.ventas)} />
            {isAdmin && (
              <MonthStat Icon={TrendingDown} accent={A} label="Gastos" value={fmtCLP(cur.gastos)} delta={pctDelta(cur.gastos, prev.gastos)} invertDelta />
            )}
            <MonthStat Icon={Receipt}       accent={A} label="Ticket prom."  value={fmtCLP(cur.ticket)} />
            <MonthStat Icon={UserPlus}      accent={A} label="Atendidos"     value={cur.atendidos} />
            <MonthStat Icon={ClipboardList} accent={A} label="Reservas"      value={cur.reservas} />
          </div>
        </Panel>

        <Panel index={9} title="Fidelización del Club">
          {fidelizacion.total === 0 ? (
            <p className="text-sm text-slate-500 italic text-center py-8">Aún no hay clientes registrados.</p>
          ) : (
            <>
              <div className="relative">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={fidelizacion.data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={46} outerRadius={66} paddingAngle={2} stroke="none">
                      {fidelizacion.data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold text-white">{fidelizacion.pct}%</span>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wide">con sellos</span>
                </div>
              </div>
              <div className="space-y-1.5 mt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-slate-400"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />Con sellos</span>
                  <span className="font-bold text-white">{fidelizacion.con}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-slate-400"><span className="w-2.5 h-2.5 rounded-full bg-slate-600" />Sin sellos</span>
                  <span className="font-bold text-white">{fidelizacion.sin}</span>
                </div>
              </div>
            </>
          )}
        </Panel>
      </div>

      {/* ── Últimas visitas ──────────────────────────────────────────── */}
      <Panel
        index={10}
        title="Últimas visitas"
        action={
          <button onClick={() => navigate('/clientes')} className={`flex items-center gap-1 text-xs font-semibold ${A.text} hover:opacity-80`}>
            Ver clientes <ExternalLink size={12} />
          </button>
        }
      >
        {ultimasVisitas.length === 0 ? (
          <p className="text-sm text-slate-500 italic text-center py-8">Sin visitas registradas todavía.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[11px] text-slate-500 uppercase tracking-wide border-b border-slate-800">
                  <th className="py-2 font-bold">Nombre</th>
                  <th className="py-2 font-bold hidden sm:table-cell">Servicio</th>
                  <th className="py-2 font-bold">Fecha</th>
                  <th className="py-2 font-bold text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {ultimasVisitas.map((c, i) => (
                  <tr key={c.id || i} className="hover:bg-slate-800/20">
                    <td className="py-2.5 font-semibold text-white">{c.clienteNombre || 'Cliente'}</td>
                    <td className="py-2.5 text-slate-400 hidden sm:table-cell">{c.servicioNombre || '—'}</td>
                    <td className="py-2.5 text-slate-400">{c.fecha}{c.hora ? `, ${c.hora}` : ''}</td>
                    <td className={`py-2.5 text-right font-bold ${A.text}`}>{fmtCLP(getPrice(c))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* ── Cumpleaños del mes ───────────────────────────────────────── */}
      <Panel index={11} title={<span className="flex items-center gap-2"><Cake size={16} className="text-pink-400" />Cumpleaños este mes</span>}>
        {cumpleaneros.length === 0 ? (
          <p className="text-sm text-slate-500 italic text-center py-8">No hay cumpleaños registrados este mes.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[11px] text-slate-500 uppercase tracking-wide border-b border-slate-800">
                  <th className="py-2 font-bold">Día</th>
                  <th className="py-2 font-bold">Nombre</th>
                  <th className="py-2 font-bold hidden sm:table-cell">Teléfono</th>
                  <th className="py-2 font-bold text-right">Saludar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {cumpleaneros.map((c, i) => {
                  const wa = cumpleWaUrl(c);
                  return (
                    <tr key={c.id || i} className="hover:bg-slate-800/20">
                      <td className="py-2.5 text-slate-400">{c._dia < 99 ? String(c._dia).padStart(2, '0') : '—'}</td>
                      <td className="py-2.5 font-semibold text-white">{c.nombre || 'Cliente'}</td>
                      <td className="py-2.5 text-slate-400 hidden sm:table-cell">{c.telefono || '—'}</td>
                      <td className="py-2.5 text-right">
                        {wa ? (
                          <a href={wa} target="_blank" rel="noopener noreferrer"
                             className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300">
                            <MessageCircle size={13} /> WhatsApp
                          </a>
                        ) : <span className="text-xs text-slate-600">Sin teléfono</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

    </div>
  );
}

/* ── Meta del mes (gauge horizontal + proyección de cierre) ──────── */
/**
 * Muestra avance vs. meta configurada, una proyección lineal de cierre y
 * cuánto debería facturarse por día para llegar. Si la meta no está seteada,
 * empuja a Configuración (la card sigue ocupando espacio: no aparece y
 * desaparece silenciosamente).
 */
function MetaMesPanel({ index, accent, finanzas, ventasMes, configurada, onConfigurar }) {
  const { meta, diaActual, diasMes, diasRestantes, proyeccion, faltaPorDia, pctMeta, pctProyeccion } = finanzas;

  if (!configurada) {
    return (
      <Panel index={index} className="lg:col-span-2" title={<span className="flex items-center gap-2"><Target size={15} className={accent.text} />Meta del mes</span>}>
        <div className="flex flex-col items-start gap-3 py-4">
          <p className="text-sm text-slate-400">
            Define cuánto apuntas a facturar este mes y aparece acá un gauge con la proyección de cierre.
          </p>
          <button onClick={onConfigurar}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition-all ${accent.tile} hover:opacity-80`}>
            <Target size={13} /> Configurar meta
          </button>
        </div>
      </Panel>
    );
  }

  // Pintamos el ritmo: si la proyección supera la meta es verde; si va flojo,
  // ámbar; en rojo solo si la proyección es <70% (mes claramente perdido).
  const rumbo = pctProyeccion >= 100 ? 'good' : pctProyeccion >= 70 ? 'warn' : 'bad';
  const rumboCls = { good: 'text-emerald-400', warn: 'text-amber-400', bad: 'text-rose-400' }[rumbo];
  const rumboTxt = { good: 'Vas sobre la meta', warn: 'Por debajo del ritmo', bad: 'Lejos de la meta' }[rumbo];

  return (
    <Panel
      index={index}
      className="lg:col-span-2"
      title={<span className="flex items-center gap-2"><Target size={15} className={accent.text} />Meta del mes</span>}
      action={<span className="text-[11px] font-semibold text-slate-500">{diaActual}/{diasMes} días</span>}
    >
      {/* Cifra principal: lo facturado / meta */}
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-2xl sm:text-3xl font-bold text-white tabular-nums">{fmtCLP(ventasMes)}</span>
        <span className="text-sm text-slate-500 tabular-nums">/ {fmtCLP(meta)}</span>
        <span className={`text-xs font-bold ml-auto ${rumboCls} inline-flex items-center gap-1`}>
          <TrendingUp size={12} /> {rumboTxt}
        </span>
      </div>

      {/* Barra: avance real (sólido) + proyección de cierre (fantasma) */}
      <div className="relative h-2.5 bg-slate-800 rounded-full overflow-hidden mt-3">
        <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pctProyeccion}%`, background: accent.hex, opacity: 0.18 }} />
        <div className="absolute inset-y-0 left-0 rounded-full transition-all" style={{ width: `${pctMeta}%`, background: accent.hex }} />
      </div>
      <div className="flex justify-between text-[10px] text-slate-500 mt-1 tabular-nums">
        <span>{Math.round(pctMeta)}% real</span>
        <span>{Math.round(pctProyeccion)}% proyección</span>
      </div>

      {/* Dos mini-stats laterales: proyección de cierre + necesario por día */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-3">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Proyección de cierre</p>
          <p className="text-base font-bold text-white tabular-nums mt-1">{fmtCLP(proyeccion)}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">si seguimos al mismo ritmo</p>
        </div>
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-3">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Necesario por día</p>
          <p className={`text-base font-bold tabular-nums mt-1 ${faltaPorDia > 0 ? 'text-white' : 'text-emerald-400'}`}>
            {faltaPorDia > 0 ? fmtCLP(faltaPorDia) : '¡Meta cubierta!'}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {diasRestantes > 0 ? `en los ${diasRestantes} días que quedan` : 'cierre del mes hoy'}
          </p>
        </div>
      </div>
    </Panel>
  );
}

/* ── Break-even del día ──────────────────────────────────────────── */
/**
 * "Te faltan $X para cubrir el día". Si el costo no está configurado,
 * cae al fallback automático (gastos mes pasado / 30) y lo etiqueta como
 * tal — así nunca queda vacío.
 */
function BreakEvenPanel({ index, accent, finanzas, ingresosHoy }) {
  const { costoDiario, costoEsAuto, cubierto, faltaHoy, pctBE } = finanzas;

  return (
    <Panel
      index={index}
      title={<span className="flex items-center gap-2"><Wallet size={15} className={accent.text} />Break-even hoy</span>}
    >
      {costoDiario <= 0 ? (
        <div className="py-4">
          <p className="text-sm text-slate-500">
            Aún no hay datos para estimar tu costo fijo diario. Carga gastos en <span className="text-slate-300 font-semibold">Gastos</span> o configúralo manualmente.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-xl ${cubierto ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
              {cubierto ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            </div>
            <div className="flex-1 min-w-0">
              {cubierto ? (
                <>
                  <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Día cubierto</p>
                  <p className="text-xl font-bold text-white tabular-nums mt-0.5">+{fmtCLP(ingresosHoy - costoDiario)}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">sobre el break-even</p>
                </>
              ) : (
                <>
                  <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide">Te faltan</p>
                  <p className="text-xl font-bold text-white tabular-nums mt-0.5">{fmtCLP(faltaHoy)}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">para cubrir el día</p>
                </>
              )}
            </div>
          </div>

          <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden mt-3">
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all"
              style={{ width: `${pctBE}%`, background: cubierto ? '#34d399' : '#fbbf24' }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 mt-1.5 tabular-nums">
            <span>{fmtCLP(ingresosHoy)}</span>
            <span>de {fmtCLP(costoDiario)}</span>
          </div>

          <p className="text-[10px] text-slate-600 mt-2">
            Costo fijo {costoEsAuto ? <span className="italic">automático</span> : <span>configurado</span>}.
          </p>
        </>
      )}
    </Panel>
  );
}

/* ── Mini-stat del resumen mensual ───────────────────────────────── */
/**
 * @param {{ Icon:import('lucide-react').LucideIcon, label:string, value:string|number,
 *           delta?:number|null, invertDelta?:boolean, accent:{text:string,tile:string} }} props
 */
function MonthStat({ Icon, label, value, delta, invertDelta, accent }) {
  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-3.5">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded-lg ${accent.tile}`}><Icon size={14} /></div>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide truncate">{label}</p>
      </div>
      <p className="text-lg font-bold text-white tabular-nums">{value}</p>
      {delta !== undefined && <div className="mt-1"><Delta value={delta} invert={invertDelta} /></div>}
    </div>
  );
}
