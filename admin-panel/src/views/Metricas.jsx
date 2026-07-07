import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { getDocs, getDoc, query, where } from 'firebase/firestore';
import { withTimeout } from '../lib/firestore-helpers';
import {
  TrendingUp, CalendarCheck, XCircle, DollarSign,
  ShoppingBag, RefreshCcw, Activity, Crown, Star, User, Sparkles,
  TrendingDown, ArrowUpRight, ArrowDownRight, Layers,
  Calendar, BarChart3, Banknote, CreditCard, Landmark, Wallet,
  Tag, Percent, ArrowRight, Users, ChevronLeft, ChevronDown, ChevronUp,
  Download, Printer, X, Brain,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';
import { tenantCol, tenantDoc } from '../lib/tenantUtils';
import HelpModal, { HelpButton } from '../components/ui/HelpModal';
import AIWatermark from '../components/ui/AIWatermark';
import { useAuth } from '../contexts/AuthContext';
import { useChartTheme } from '../hooks/useChartTheme';

function localDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dateToStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getSixMonthsAgo() {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 5);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}
const SIX_MONTHS_AGO = getSixMonthsAgo();

/* Calcula el período anterior equivalente (misma duración, terminando un día antes de fechaInicio) */
function getPrevRange(fechaInicio, fechaFin) {
  const start = new Date(fechaInicio + 'T12:00:00');
  const end   = new Date(fechaFin    + 'T12:00:00');
  const days  = Math.round((end - start) / 86400000) + 1;
  const prevEnd   = new Date(start.getTime() - 86400000);
  const prevStart = new Date(prevEnd.getTime() - (days - 1) * 86400000);
  return { inicio: dateToStr(prevStart), fin: dateToStr(prevEnd), days };
}

/**
 * Describe el período anterior en lenguaje natural para el sub-label
 * de los KPIs. En vez de "vs. ant." genérico, muestra "vs. junio",
 * "vs. semana pasada", "vs. ayer" — mucho más digerible para el dueño.
 */
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
function describeCompRange(fechaInicio, fechaFin) {
  const start = new Date(fechaInicio + 'T12:00:00');
  const end   = new Date(fechaFin    + 'T12:00:00');
  const days  = Math.round((end - start) / 86400000) + 1;
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();
  // 1 día → "ayer"
  if (days === 1) return 'ayer';
  // 7 días exactos → "semana pasada"
  if (days === 7) return 'semana pasada';
  // Mes calendario completo → "vs. <mes anterior>"
  if (sameMonth && start.getDate() === 1) {
    const nextFirst = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    const lastOfMonth = new Date(nextFirst.getTime() - 86400000);
    if (end.getTime() >= lastOfMonth.getTime()) {
      const prev = new Date(start.getFullYear(), start.getMonth() - 1, 1);
      return MESES[prev.getMonth()];
    }
  }
  // Rango de 28-31 días → "mes pasado"
  if (days >= 28 && days <= 31) return 'mes pasado';
  // Año calendario → "año pasado"
  if (days >= 360 && days <= 366) return 'año pasado';
  // Otros: "período anterior de X días"
  return `${days} días anteriores`;
}

/* Convierte cualquier número a CSV-safe */
function csvEscape(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
function downloadCSV(filename, rows) {
  const csv = rows.map(r => r.map(csvEscape).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ── KpiCard ─────────────────────────────────────────────────────── */
const KPI_COLORS = {
  emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/10',
  blue:    'bg-blue-500/10    text-blue-400    border-blue-500/10',
  red:     'bg-red-500/10     text-red-400     border-red-500/10',
  amber:   'bg-amber-500/10   text-amber-400   border-amber-500/10',
  purple:  'bg-purple-500/10  text-purple-400  border-purple-500/10',
  cyan:    'bg-cyan-500/10    text-cyan-400    border-cyan-500/10',
  rose:    'bg-rose-500/10    text-rose-400    border-rose-500/10',
};

function DeltaBadge({ delta, invert = false, size = 'sm', compLabel }) {
  if (delta === null || delta === undefined || !isFinite(delta)) return null;
  const isUp = delta > 0;
  const isFlat = Math.abs(delta) < 0.5;
  // invert=true → para métricas donde subir es malo (cancelaciones, gastos)
  const good = isFlat ? null : invert ? !isUp : isUp;
  const cls = isFlat
    ? 'bg-slate-800 text-slate-400 border-slate-700'
    : good
      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
      : 'bg-rose-500/15 text-rose-400 border-rose-500/25';
  const Arrow = isFlat ? null : isUp ? ArrowUpRight : ArrowDownRight;
  // Tamaño 'lg' para el hero: badge más visible con contexto del período.
  const dims = size === 'lg'
    ? { pad: 'px-2.5 py-1', text: 'text-xs', gap: 'gap-1', icon: 13 }
    : { pad: 'px-1.5 py-0.5', text: 'text-[10px]', gap: 'gap-0.5', icon: 10 };
  return (
    <span className={`inline-flex items-center ${dims.gap} ${dims.text} font-bold ${dims.pad} rounded border ${cls}`}>
      {Arrow && <Arrow size={dims.icon} />}
      {isFlat ? '0%' : `${Math.abs(delta).toFixed(1)}%`}
      {compLabel && size === 'lg' && (
        <span className="ml-0.5 font-medium opacity-75">vs. {compLabel}</span>
      )}
    </span>
  );
}

function KpiCard({ Icon, label, value, sub, color = 'emerald', delta, invertDelta = false, onClick }) {
  const interactive = typeof onClick === 'function';
  return (
    <div
      onClick={onClick}
      className={`bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-start gap-4 transition-all ${
        interactive ? 'hover:border-emerald-500/30 hover:bg-slate-900/80 cursor-pointer active:scale-[0.98]' : 'hover:border-slate-700'
      }`}
    >
      <div className={`p-2.5 rounded-lg shrink-0 ${KPI_COLORS[color]} border`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide truncate">{label}</p>
          <DeltaBadge delta={delta} invert={invertDelta} />
        </div>
        <p className="text-2xl font-bold text-white mt-0.5 truncate">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
}

/* Mini sparkline para el hero */
function Sparkline({ data, color = '#10b981' }) {
  if (!data?.length) return null;
  return (
    <ResponsiveContainer width="100%" height={56}>
      <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill="url(#sparkGrad)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* Modal de drill-down */
function DrillDownModal({ open, title, subtitle, rows, columns, onClose, emptyMsg = 'Sin datos en el período' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between p-5 border-b border-slate-800">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-white">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors shrink-0">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {rows.length === 0 ? (
            <p className="text-sm text-slate-500 italic text-center py-12">{emptyMsg}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-wide font-bold">
                    {columns.map(c => (
                      <th key={c.key} className={`py-2.5 ${c.align === 'right' ? 'text-right' : ''}`}>{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {rows.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-800/20 text-slate-300">
                      {columns.map(c => (
                        <td key={c.key} className={`py-2 pr-3 ${c.align === 'right' ? 'text-right' : ''} ${c.bold ? 'font-bold text-white' : ''}`}>
                          {c.render ? c.render(r) : r[c.key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="p-3 border-t border-slate-800 text-right">
          <span className="text-xs text-slate-500">{rows.length} registro{rows.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  );
}

/* ── ChartCard ───────────────────────────────────────────────────── */
function ChartCard({ title, subtitle, children, fullWidth = false }) {
  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-750 transition-all ${fullWidth ? 'lg:col-span-2' : ''}`}>
      <p className="text-sm font-semibold text-white mb-0.5">{title}</p>
      {subtitle && <p className="text-xs text-slate-500 mb-4">{subtitle}</p>}
      {children}
    </div>
  );
}

/* ── Tooltip oscuro ──────────────────────────────────────────────── */
function DarkTooltip({ active, payload, label, fmt }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs shadow-2xl">
      {label && <p className="text-slate-400 font-semibold mb-1.5 border-b border-slate-800 pb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="leading-5 font-medium">
          {p.name}: <span className="text-white font-bold">{fmt ? fmt(p.value) : p.value}</span>
        </p>
      ))}
    </div>
  );
}

/* ── BarberAvatar ────────────────────────────────────────────────── */
function BarberAvatar({ foto, nombre, size = 'md' }) {
  const initial = (nombre || '?')[0].toUpperCase();
  const szMap = { sm: 'w-9 h-9 text-sm', md: 'w-14 h-14 text-xl', lg: 'w-20 h-20 text-3xl' };
  const cls = szMap[size] || szMap.md;
  if (foto) {
    return <img src={foto} alt={nombre} className={`${cls} rounded-full object-cover border-2 border-slate-700`} />;
  }
  return (
    <div className={`${cls} rounded-full bg-emerald-500/20 border-2 border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400`}>
      {initial}
    </div>
  );
}

/* ── InsightCard ─────────────────────────────────────────────────── */
const INSIGHT_STYLES = {
  success: { border: 'border-emerald-500/20', bg: 'bg-emerald-500/5',  dot: 'bg-emerald-400' },
  info:    { border: 'border-blue-500/20',    bg: 'bg-blue-500/5',     dot: 'bg-blue-400'    },
  star:    { border: 'border-amber-500/20',   bg: 'bg-amber-500/5',    dot: 'bg-amber-400'   },
  warning: { border: 'border-red-500/20',     bg: 'bg-red-500/5',      dot: 'bg-red-400'     },
};
function InsightCard({ text, type = 'info' }) {
  const s = INSIGHT_STYLES[type] || INSIGHT_STYLES.info;
  return (
    <div className={`flex items-start gap-2.5 px-3.5 py-3 rounded-lg border ${s.border} ${s.bg} hover:bg-slate-900/10 transition-colors`}>
      <div className={`w-1.5 h-1.5 rounded-full ${s.dot} mt-1.5 shrink-0`} />
      <p className="text-xs text-slate-300 leading-relaxed">{text}</p>
    </div>
  );
}

const fmtCLP  = v => `$${Math.round(v || 0).toLocaleString('es-CL')}`;
const rankColor = i => i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-amber-700' : 'text-slate-600';
const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f43f5e', '#14b8a6'];

export default function Metricas() {
  const { role } = useAuth();
  const isAdmin = role === 'admin' || role === 'jefe';
  // Paleta activa según modo (dark/light). Se recalcula cuando el usuario
  // toggle el tema desde el Sidebar. Los charts Recharts la reciben por
  // props porque sus SVG no leen los overrides html.light del CSS global.
  const ct = useChartTheme();

  const [showHelp,         setShowHelp]         = useState(false);
  const [activeTab,        setActiveTab]        = useState('comercial');
  const [selectedBarberoId, setSelectedBarberoId] = useState(null);
  const [showMoreKpis,     setShowMoreKpis]     = useState(false);
  const [drillDown,        setDrillDown]        = useState(null); // { type, title, subtitle, rows, columns }

  // Date range state
  const [fechaInicio, setFechaInicio] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [fechaFin, setFechaFin] = useState(localDateStr);

  // Firestore collections
  const [citas,     setCitas]     = useState([]);
  const [servicios, setServicios] = useState([]);
  const [clientes,  setClientes]  = useState([]);
  const [aggStats,  setAggStats]  = useState(null);   // resumen precalculado (_stats/resumen)
  const [ventas,    setVentas]    = useState([]);
  const [gastos,    setGastos]    = useState([]);
  const [barberos,  setBarberos]  = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading,   setLoading]   = useState(true);   // primer fetch (pantalla en spinner)
  const [fetching,  setFetching]  = useState(false);  // refetch (solo gira el boton)
  const [loadError, setLoadError] = useState(null);

  // ID de fetch en curso. Si cambia (cambio de rango o "Actualizar"), las
  // respuestas anteriores se descartan: evita race conditions y pisar estado
  // bueno con datos viejos al cambiar rangos rapido.
  const fetchIdRef = useRef(0);

  // Cache de catalogos estables (servicios, barberos, productos): NO dependen
  // del rango de fechas. Antes los re-pediamos en cada cambio de fecha — eran
  // megabytes inutiles.
  const catalogsLoadedRef = useRef(false);

  // Date range presets
  const setHoy = () => {
    const t = localDateStr();
    setFechaInicio(t);
    setFechaFin(t);
  };
  
  const setEstaSemana = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    const startStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
    setFechaInicio(startStr);
    setFechaFin(localDateStr());
  };
  
  const setEsteMes = () => {
    const d = new Date();
    setFechaInicio(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`);
    setFechaFin(localDateStr());
  };
  
  const setMesPasado = () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    const firstDay = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const lastDayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    setFechaInicio(firstDay);
    setFechaFin(lastDayStr);
  };

  const fetchData = useCallback(async () => {
    const myId = ++fetchIdRef.current;
    setFetching(true);
    setLoadError(null);
    try {
      const prevR = getPrevRange(fechaInicio, fechaFin);
      // Antes: queryStart = min(fechaInicio, SIX_MONTHS_AGO, prevR.inicio).
      // Eso forzaba traer 6 meses de citas SIEMPRE, aunque el usuario eligiera
      // "Hoy". Ahora solo extendemos al periodo previo (para los deltas) — la
      // serie historica de 6 meses la calcula la CF y vive en _stats/resumen.
      const queryStart = (fechaInicio < prevR.inicio) ? fechaInicio : prevR.inicio;

      // Resumen precalculado (1 lectura). Si existe, no traemos toda la colección de clientes
      // (que solo se usa para la retención de sellos legacy-aware).
      let stats = null;
      try {
        const statsSnap = await withTimeout(getDoc(tenantDoc('_stats', 'resumen')), 10000, 'stats');
        if (statsSnap.exists()) stats = statsSnap.data();
      } catch { /* sin stats → fallback */ }
      if (myId !== fetchIdRef.current) return; // cancelado por nuevo fetch
      setAggStats(stats);

      // Catalogos estables: solo se piden la primera vez. Antes se re-pedian
      // en cada cambio de rango → megabytes inutiles y latencia visible.
      const needCatalogs = !catalogsLoadedRef.current;
      const tasks = [
        withTimeout(getDocs(query(tenantCol('citas'), where('fecha', '>=', queryStart))), 20000, 'citas'),
        withTimeout(getDocs(query(tenantCol('product_reservations'), where('fecha', '>=', queryStart))), 20000, 'ventas'),
        withTimeout(getDocs(query(tenantCol('gastos'), where('fecha', '>=', queryStart))), 20000, 'gastos'),
      ];
      if (needCatalogs) {
        tasks.push(withTimeout(getDocs(tenantCol('servicios')), 15000, 'servicios'));
        tasks.push(withTimeout(getDocs(tenantCol('barberos')), 15000, 'barberos'));
        tasks.push(withTimeout(getDocs(tenantCol('productos')), 15000, 'productos'));
      }
      if (!stats) tasks.push(withTimeout(getDocs(tenantCol('users')), 20000, 'users'));

      const results = await Promise.all(tasks);
      if (myId !== fetchIdRef.current) return; // cancelado por nuevo fetch

      let i = 0;
      const citasSnap  = results[i++];
      const ventasSnap = results[i++];
      const gastosSnap = results[i++];
      const serviciosSnap = needCatalogs ? results[i++] : null;
      const barberosSnap  = needCatalogs ? results[i++] : null;
      const productosSnap = needCatalogs ? results[i++] : null;
      const clientesSnap  = !stats ? results[i++] : null;

      setCitas(citasSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setVentas(ventasSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setGastos(gastosSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      if (serviciosSnap) setServicios(serviciosSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      if (barberosSnap)  setBarberos(barberosSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(b => !b._mainDocId));
      if (productosSnap) setProductos(productosSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      if (clientesSnap)  setClientes(clientesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      if (needCatalogs)  catalogsLoadedRef.current = true;
    } catch (e) {
      if (myId !== fetchIdRef.current) return;
      console.error('Metricas fetchData:', e);
      setLoadError(e.message || 'No se pudo cargar la información');
    } finally {
      if (myId === fetchIdRef.current) {
        setFetching(false);
        setLoading(false);
      }
    }
  }, [fechaInicio, fechaFin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Helper to parse dates securely from Firestore timestamp/string/Date
  const parseDateStr = useCallback(val => {
    if (!val) return '';
    if (typeof val === 'string') return val.slice(0, 10);
    if (val.toDate) {
      try {
        return val.toDate().toISOString().slice(0, 10);
      } catch (e) {
        return '';
      }
    }
    if (val instanceof Date) return val.toISOString().slice(0, 10);
    return '';
  }, []);

  // Map service prices
  const precioMap = useMemo(() => {
    const map = {};
    servicios.forEach(s => {
      if (s.id)     map[s.id]     = Number(s.precio) || 0;
      if (s.nombre) map[s.nombre] = Number(s.precio) || 0;
    });
    return map;
  }, [servicios]);

  const getPrice = useCallback(c =>
    c.cortesia ? 0 : (Number(c.precio) || precioMap[c.servicioId] || precioMap[c.servicioNombre] || 0),
    [precioMap]
  );

  /* ── 1. Rendimiento Comercial Memoized KPIs and Stats ── */
  const stats = useMemo(() => {
    const rangeCitas = citas.filter(c => c.fecha >= fechaInicio && c.fecha <= fechaFin);
    const completadas = rangeCitas.filter(c => c.estado === 'Completada');
    const canceladas  = rangeCitas.filter(c => c.estado === 'Cancelada');
    const ingresos    = completadas.reduce((s, c) => s + getPrice(c), 0);
    const ticket      = completadas.length ? ingresos / completadas.length : 0;

    // Clientes recurrentes (>1 cita global)
    const clienteCounts = {};
    citas.forEach(c => {
      const k = c.clienteNombre || 'Anónimo';
      clienteCounts[k] = (clienteCounts[k] || 0) + 1;
    });
    const totalClients = Object.keys(clienteCounts).length;
    const recurring    = Object.values(clienteCounts).filter(n => n > 1).length;
    const pctRecurr    = totalClients ? Math.round((recurring / totalClients) * 100) : 0;

    // Ocupación del rango
    const ocupacion = rangeCitas.length
      ? Math.round((completadas.length / rangeCitas.length) * 100)
      : 0;

    // Top 10 clientes del rango
    const clienteMap = {};
    rangeCitas.forEach(c => {
      const k = c.clienteNombre || 'Anónimo';
      if (!clienteMap[k]) clienteMap[k] = { nombre: k, citas: 0, gasto: 0 };
      clienteMap[k].citas++;
      clienteMap[k].gasto += getPrice(c);
    });
    const top10 = Object.values(clienteMap)
      .sort((a, b) => b.citas - a.citas)
      .slice(0, 10);

    // Ranking barberos del rango
    const barberoMap = {};
    completadas.forEach(c => {
      const bObj = barberos.find(b => b.id === c.barberoId || b.nombre === c.barbero);
      const k    = bObj ? bObj.id : (c.barberoId || c.barbero || 'Sin asignar');
      const nombre = bObj ? bObj.nombre : (c.barbero || c.barberoId || 'Sin asignar');
      if (!barberoMap[k]) barberoMap[k] = { nombre, citas: 0, ingresos: 0 };
      barberoMap[k].citas++;
      barberoMap[k].ingresos += getPrice(c);
    });
    const barberRanking = Object.values(barberoMap)
      .sort((a, b) => b.ingresos - a.ingresos || b.citas - a.citas)
      .slice(0, 8);
    const ingresosBar = barberRanking.map(b => ({
      nombre:   b.nombre.split(' ')[0],
      ingresos: b.ingresos,
      citas:    b.citas,
    }));

    return {
      total: rangeCitas.length,
      completadas: completadas.length,
      canceladas: canceladas.length,
      ingresos,
      ticket,
      pctRecurr,
      ocupacion,
      top10,
      barberRanking,
      ingresosBar,
    };
  }, [citas, fechaInicio, fechaFin, getPrice]);

  /* ── Período anterior equivalente (para deltas) ── */
  const prevRange = useMemo(() => getPrevRange(fechaInicio, fechaFin), [fechaInicio, fechaFin]);
  /* Etiqueta del período comparado: "ayer" / "junio" / "mes pasado", etc.
     Se usa en el badge del hero y en los sub-labels de los KpiCards. */
  const compLabel = useMemo(() => describeCompRange(fechaInicio, fechaFin), [fechaInicio, fechaFin]);

  const prevStats = useMemo(() => {
    const r = citas.filter(c => c.fecha >= prevRange.inicio && c.fecha <= prevRange.fin);
    const completadas = r.filter(c => c.estado === 'Completada');
    const canceladas  = r.filter(c => c.estado === 'Cancelada');
    const ingresos    = completadas.reduce((s, c) => s + getPrice(c), 0);
    const ticket      = completadas.length ? ingresos / completadas.length : 0;
    const ocupacion   = r.length ? (completadas.length / r.length) * 100 : 0;

    // Utilidad neta del período anterior — versión simplificada del pnl
    // para calcular solo el delta comparativo del hero (no todo el P&L).
    const prevGastos = gastos.filter(g => {
      const d = parseDateStr(g.fecha || g.creadoEn);
      return d >= prevRange.inicio && d <= prevRange.fin;
    });
    const prevVentas = ventas.filter(v => {
      const d = parseDateStr(v.fecha || v.createdAt || v.creadoEn);
      return d >= prevRange.inicio && d <= prevRange.fin && ['confirmed','completed','paid','delivered'].includes(v.status);
    });
    const prevIngProd = prevVentas.reduce((s, v) => s + (Number(v.precio) || Number(v.total) || 0), 0);
    const prevCogs = prevVentas.reduce((s, v) => {
      const p = productos.find(x => x.id === v.productId);
      return s + ((Number(p?.precioCosto) || 0) * (Number(v.cantidad) || 1));
    }, 0);
    const prevComSvc = completadas.reduce((s, c) => {
      const b = barberos.find(x => x.id === c.barberoId || x.nombre === c.barbero);
      return s + (getPrice(c) * (Number(b?.comision) || 0) / 100);
    }, 0);
    const prevComProd = prevVentas.reduce((s, v) => {
      const b = barberos.find(x => x.id === v.barberoId || x.nombre === v.barberoNombre);
      const pct = b?.comisionProductos !== undefined ? Number(b.comisionProductos) : 10;
      return s + ((Number(v.precio) || Number(v.total) || 0) * pct / 100);
    }, 0);
    const dStart = new Date(prevRange.inicio);
    const dEnd = new Date(prevRange.fin);
    const prevDays = Math.max(1, Math.round((dEnd - dStart) / 86400000) + 1);
    const prevSueldos = barberos.reduce((s, b) => s + ((Number(b.sueldoBase) || 0) * (prevDays / 30)), 0);
    const prevOpex = prevGastos.filter(g => g.categoria !== 'Sueldos').reduce((s, g) => s + (Number(g.monto) || 0), 0);
    const prevIngBrutos = ingresos + prevIngProd;
    const prevTotalCostos = prevCogs + prevComSvc + prevComProd + prevSueldos + prevOpex;
    const prevUtilidadNeta = prevIngBrutos - prevTotalCostos;

    return { total: r.length, completadas: completadas.length, canceladas: canceladas.length, ingresos, ticket, ocupacion, utilidadNeta: prevUtilidadNeta };
  }, [citas, prevRange, getPrice, gastos, ventas, productos, barberos, parseDateStr]);

  /* Calcula delta % entre actual y previo */
  const pctDelta = useCallback((curr, prev) => {
    if (!prev || prev === 0) return curr > 0 ? 100 : null;
    return ((curr - prev) / prev) * 100;
  }, []);

  /* Sparkline ingresos últimos 7 días dentro del rango (o relativos a fechaFin) */
  const sparkData = useMemo(() => {
    const end = new Date(fechaFin + 'T12:00:00');
    const out = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(end.getTime() - i * 86400000);
      const key = dateToStr(d);
      const dayCitas = citas.filter(c => c.fecha === key && c.estado === 'Completada');
      out.push({ fecha: key, v: dayCitas.reduce((s, c) => s + getPrice(c), 0) });
    }
    return out;
  }, [citas, fechaFin, getPrice]);

  // Product sales inside range
  const rangeVentas = useMemo(() => {
    return ventas.filter(v => {
      const d = parseDateStr(v.fecha || v.createdAt || v.creadoEn);
      return d >= fechaInicio && d <= fechaFin && ['confirmed', 'completed', 'paid', 'delivered'].includes(v.status);
    });
  }, [ventas, fechaInicio, fechaFin, parseDateStr]);

  const ingresosProductos = useMemo(() => {
    return rangeVentas.reduce((s, v) => s + (Number(v.precio) || Number(v.total) || 0), 0);
  }, [rangeVentas]);

  // Chart data for 6 months (Historical trend for Comercial Tab)
  const chartData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const key   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('es-CL', { month: 'short' });
      months.push({ key, label });
    }
    return months.map(({ key, label }) => {
      const mc = citas.filter(c => c.fecha?.startsWith(key) && c.estado === 'Completada');
      return {
        mes:       label,
        servicios: mc.reduce((s, c) => s + getPrice(c), 0),
        citas:     mc.length,
      };
    });
  }, [citas, getPrice]);

  const hayPrecios = chartData.some(d => d.servicios > 0);

  // Retención de sellos del Club (solo socios registrados; excluye migrados de AgendaPro)
  const retention = useMemo(() => {
    // Resumen precalculado (1 lectura) si está disponible.
    if (aggStats) {
      const total = aggStats.registrados || 0;
      if (!total) return null;
      const conSellos = aggStats.conSellos || 0;
      const sinSellos = aggStats.sinSellos ?? Math.max(0, total - conSellos);
      return {
        data: [{ name: 'Con sellos', value: conSellos }, { name: 'Sin sellos', value: sinSellos }],
        pct: Math.round((conSellos / total) * 100),
        conSellos, sinSellos, total,
      };
    }
    // Fallback: cálculo legacy-aware desde la colección completa.
    const isLegacy = c => !!c?.uid && c?.uid === c?.id;
    const registrados = clientes.filter(c => !isLegacy(c));
    if (!registrados.length) return null;
    const conSellos = registrados.filter(c => (c.sellosHistoricos || c.stamps || 0) > 0).length;
    const sinSellos = registrados.length - conSellos;
    return {
      data: [
        { name: 'Con sellos', value: conSellos },
        { name: 'Sin sellos', value: sinSellos },
      ],
      pct:       Math.round((conSellos / registrados.length) * 100),
      conSellos,
      sinSellos,
      total:     registrados.length,
    };
  }, [aggStats, clientes]);

  // AI Insights Engine
  const aiInsights = useMemo(() => {
    if (!citas.length) return [];
    const thisMonth = localDateStr().slice(0, 7);
    const monthCitas = citas.filter(c => c.fecha?.startsWith(thisMonth));
    const completadas = monthCitas.filter(c => c.estado === 'Completada');
    const canceladas  = monthCitas.filter(c => c.estado === 'Cancelada');
    const insights = [];

    if (completadas.length > 0) {
      const prevMonth = (() => {
        const d = new Date(); d.setMonth(d.getMonth() - 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      })();
      const prevOk = citas.filter(c => c.fecha?.startsWith(prevMonth) && c.estado === 'Completada').length;
      const trendStr = prevOk
        ? (() => {
            const diff = completadas.length - prevOk;
            const pct  = Math.round(Math.abs(diff) / prevOk * 100);
            return diff > 0 ? `, un ${pct}% más que el mes pasado` : diff < 0 ? `, un ${pct}% menos que el mes pasado` : ', igual que el mes pasado';
          })()
        : '';
      insights.push({
        type: 'success',
        text: `Completaste ${completadas.length} cita${completadas.length !== 1 ? 's' : ''} este mes${trendStr}${stats.ticket > 0 ? `, con ticket promedio de $${Math.round(stats.ticket).toLocaleString('es-CL')}` : ''}.`,
      });
    }

    const byDay = {};
    citas.filter(c => c.estado === 'Completada' && c.fecha).forEach(c => {
      const dow = new Date(c.fecha + 'T12:00:00').getDay();
      byDay[dow] = (byDay[dow] || 0) + 1;
    });
    const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const mejorDia = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0];
    if (mejorDia) {
      insights.push({
        type: 'info',
        text: `El ${DIAS[+mejorDia[0]]} es tu día más demandado, acumulando ${mejorDia[1]} citas en los últimos 6 meses.`,
      });
    }

    if (stats.barberRanking.length > 0) {
      const top = stats.barberRanking[0];
      insights.push({
        type: 'star',
        text: `${top.nombre} lidera el equipo este período${top.ingresos > 0 ? ` con $${Math.round(top.ingresos).toLocaleString('es-CL')} en ${top.citas} cita${top.citas !== 1 ? 's' : ''}` : ` con ${top.citas} cita${top.citas !== 1 ? 's' : ''} completadas`}.`,
      });
    }

    const pctCancel = monthCitas.length ? Math.round((canceladas.length / monthCitas.length) * 100) : 0;
    if (pctCancel >= 20) {
      insights.push({
        type: 'warning',
        text: `La tasa de cancelación es del ${pctCancel}% este mes. Considera enviar recordatorios por WhatsApp a tus clientes.`,
      });
    } else if (stats.pctRecurr >= 50) {
      insights.push({
        type: 'success',
        text: `El ${stats.pctRecurr}% de tus clientes son recurrentes. Tu programa de fidelización está generando retención.`,
      });
    }

    // Servicio más solicitado
    const svcCnt = {};
    citas.filter(c => c.estado !== 'Cancelada' && c.servicioNombre).forEach(c => {
      svcCnt[c.servicioNombre] = (svcCnt[c.servicioNombre] || 0) + 1;
    });
    const topSvc = Object.entries(svcCnt).sort((a, b) => b[1] - a[1])[0];
    if (topSvc) {
      insights.push({
        type: 'info',
        text: `"${topSvc[0]}" es el servicio más reservado, con ${topSvc[1]} solicitud${topSvc[1] !== 1 ? 'es' : ''} en los últimos 6 meses.`,
      });
    }

    return insights;
  }, [citas, stats]);

  // Heatmap demanda
  const heatmapData = useMemo(() => {
    const DAYS  = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
    const counts = {};
    let maxVal = 1;
    citas.filter(c => c.estado !== 'Cancelada' && c.fecha && c.hora).forEach(c => {
      const d = new Date(c.fecha + 'T' + c.hora);
      if (isNaN(d.getTime())) return;
      const dow  = (d.getDay() + 6) % 7;
      const hour = d.getHours();
      if (hour < 8 || hour > 19) return;
      const key = `${dow}-${hour}`;
      counts[key] = (counts[key] || 0) + 1;
      if (counts[key] > maxVal) maxVal = counts[key];
    });
    return { DAYS, HOURS, counts, maxVal };
  }, [citas]);

  /* ── 2. Pérdidas y Ganancias (P&L) Dashboard Memo ── */
  const pnl = useMemo(() => {
    const rangeCompletas = citas.filter(c => c.fecha >= fechaInicio && c.fecha <= fechaFin && c.estado === 'Completada');
    const servicesRevenue = rangeCompletas.reduce((s, c) => s + getPrice(c), 0);
    const rangeGastos = gastos.filter(g => {
      const d = parseDateStr(g.fecha || g.creadoEn);
      return d >= fechaInicio && d <= fechaFin;
    });

    // COGS
    const totalCogs = rangeVentas.reduce((s, v) => {
      const prod = productos.find(p => p.id === v.productId);
      const cost = Number(prod?.precioCosto) || 0;
      const qty = Number(v.cantidad) || 1;
      return s + (cost * qty);
    }, 0);

    const start = new Date(fechaInicio);
    const end = new Date(fechaFin);
    const daysInRange = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);

    // Dynamic base salaries based on range duration proportion
    const totalProportionalBaseSalaries = barberos.reduce((s, b) => {
      const base = Number(b.sueldoBase) || 0;
      return s + (base * (daysInRange / 30));
    }, 0);

    // Service commissions in range
    const serviceCommissions = rangeCompletas.reduce((s, c) => {
      const b = barberos.find(x => x.id === c.barberoId || x.nombre === c.barbero);
      const pct = Number(b?.comision) || 0;
      return s + (getPrice(c) * pct / 100);
    }, 0);

    // Product commissions in range
    const productCommissions = rangeVentas.reduce((s, v) => {
      const b = barberos.find(x => x.id === v.barberoId || x.nombre === v.barberoNombre);
      const pct = b?.comisionProductos !== undefined ? Number(b.comisionProductos) : 10;
      const amt = Number(v.precio) || Number(v.total) || 0;
      return s + (amt * pct / 100);
    }, 0);

    const totalAccruedCommissions = serviceCommissions + productCommissions;

    // Filter out registered salary payouts ('Sueldos') from pure OPEX to avoid double counting
    const pureOperatingExpenses = rangeGastos
      .filter(g => g.categoria !== 'Sueldos')
      .reduce((s, g) => s + (Number(g.monto) || 0), 0);

    const totalOpex = pureOperatingExpenses + totalAccruedCommissions + totalProportionalBaseSalaries;
    const ingresosBrutos = servicesRevenue + ingresosProductos;
    const utilidadBruta = ingresosBrutos - totalCogs;
    const utilidadNeta = utilidadBruta - totalOpex;
    const margenNeto = ingresosBrutos > 0 ? (utilidadNeta / ingresosBrutos) * 100 : 0;

    // ── PUNTO DE EQUILIBRIO ──────────────────────────────────────
    // Métrica clave del asesor: "¿cuánto tengo que facturar para no
    // perder plata?". Fórmula estándar de contabilidad gerencial:
    //   BE = Costos Fijos / Margen de contribución %
    // Costos fijos = sueldos base + gastos operativos NO variables
    //   (arriendo, servicios, insumos fijos).
    // Costos variables = comisiones + COGS (cambian con facturación).
    const costosFijos = totalProportionalBaseSalaries + pureOperatingExpenses;
    const costosVariables = totalAccruedCommissions + totalCogs;
    const margenContribucion = ingresosBrutos > 0
      ? 1 - (costosVariables / ingresosBrutos)
      : 0.60; // fallback prudente para barberías: 40% comisión promedio
    const puntoEquilibrio = margenContribucion > 0
      ? costosFijos / margenContribucion
      : 0;
    // Ratio: 100% = justo en equilibrio, >100% = ganando, <100% = perdiendo.
    const ratioEquilibrio = puntoEquilibrio > 0
      ? (ingresosBrutos / puntoEquilibrio) * 100
      : 0;

    // Tips neutral pass-through sum
    const propinas = rangeCompletas.reduce((s, c) => s + (Number(c.propina) || 0), 0);

    // Expense breakdown for Pie chart
    const expenseBreakdown = [];
    if (totalAccruedCommissions > 0) {
      expenseBreakdown.push({ name: 'Comisiones', value: Math.round(totalAccruedCommissions) });
    }
    if (totalProportionalBaseSalaries > 0) {
      expenseBreakdown.push({ name: 'Sueldos Base (Prop)', value: Math.round(totalProportionalBaseSalaries) });
    }
    if (totalCogs > 0) {
      expenseBreakdown.push({ name: 'COGS (Costo Prod)', value: Math.round(totalCogs) });
    }
    
    const catExpensesMap = {};
    rangeGastos.filter(g => g.categoria !== 'Sueldos').forEach(g => {
      const cat = g.categoria || 'Otros';
      catExpensesMap[cat] = (catExpensesMap[cat] || 0) + (Number(g.monto) || 0);
    });
    Object.entries(catExpensesMap).forEach(([cat, val]) => {
      expenseBreakdown.push({ name: cat, value: Math.round(val) });
    });

    return {
      servicesRevenue,
      ingresosBrutos,
      totalCogs,
      utilidadBruta,
      totalProportionalBaseSalaries,
      totalAccruedCommissions,
      pureOperatingExpenses,
      totalOpex,
      utilidadNeta,
      margenNeto,
      costosFijos,
      costosVariables,
      margenContribucion,
      puntoEquilibrio,
      ratioEquilibrio,
      expenseBreakdown,
      rangeGastos,
      propinas,
    };
  }, [citas, fechaInicio, fechaFin, rangeVentas, productos, barberos, gastos, ingresosProductos, getPrice, parseDateStr]);

  // 6-Month P&L Historical Trend AreaChart data
  const pnlHistoricalData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const key   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('es-CL', { month: 'short' });
      months.push({ key, label });
    }

    return months.map(({ key, label }) => {
      const mc = citas.filter(c => c.fecha?.startsWith(key) && c.estado === 'Completada');
      const sRev = mc.reduce((s, c) => s + getPrice(c), 0);

      const mv = ventas.filter(v => {
        const d = parseDateStr(v.fecha || v.createdAt || v.creadoEn);
        return d.startsWith(key) && ['confirmed', 'completed', 'paid', 'delivered'].includes(v.status);
      });
      const pRev = mv.reduce((s, v) => s + (Number(v.total) || Number(v.precio) || 0), 0);

      const ingresos = sRev + pRev;

      // COGS Mes
      const cogs = mv.reduce((s, v) => {
        const prod = productos.find(p => p.id === v.productId);
        const cost = Number(prod?.precioCosto) || 0;
        const qty = Number(v.cantidad) || 1;
        return s + (cost * qty);
      }, 0);

      // Comisiones Mes
      const sComm = mc.reduce((s, c) => {
        const b = barberos.find(x => x.id === c.barberoId || x.nombre === c.barbero);
        const pct = Number(b?.comision) || 0;
        return s + (getPrice(c) * pct / 100);
      }, 0);

      const pComm = mv.reduce((s, v) => {
        const b = barberos.find(x => x.id === v.barberoId || x.nombre === v.barberoNombre);
        const pct = b?.comisionProductos !== undefined ? Number(b.comisionProductos) : 10;
        const amt = Number(v.precio) || Number(v.total) || 0;
        return s + (amt * pct / 100);
      }, 0);

      const commissions = sComm + pComm;
      const baseSalaries = barberos.reduce((s, b) => s + (Number(b.sueldoBase) || 0), 0);
      
      const pureExpenses = gastos.filter(g => {
        const d = parseDateStr(g.fecha || g.creadoEn);
        return d.startsWith(key) && g.categoria !== 'Sueldos';
      }).reduce((s, g) => s + (Number(g.monto) || 0), 0);

      const opex = pureExpenses + commissions + baseSalaries;
      const egresos = cogs + opex;
      const utilidadNeta = ingresos - egresos;

      return {
        mes: label,
        Ingresos: Math.round(ingresos),
        Egresos: Math.round(egresos),
        'Utilidad Neta': Math.round(utilidadNeta),
      };
    });
  }, [citas, ventas, productos, barberos, gastos, getPrice, parseDateStr]);

  /* ── 3. Desglose por Método de Pago ─────────────────────────────── */
  const paymentBreakdown = useMemo(() => {
    const rangeCompletadas = citas.filter(c =>
      c.fecha >= fechaInicio && c.fecha <= fechaFin && c.estado === 'Completada'
    );

    const normalize = m => {
      const v = (m || '').toString().trim().toLowerCase();
      if (v === 'efectivo' || v === 'cash')             return 'Efectivo';
      if (v === 'débito' || v === 'debito')             return 'Débito';
      if (v === 'crédito' || v === 'credito')           return 'Crédito';
      if (v === 'transferencia' || v === 'transfer')    return 'Transferencia';
      if (v === 'tarjeta' || v === 'card')              return 'Tarjeta (sin especificar)';
      return 'Sin especificar';
    };

    const acc = {
      'Efectivo':                  { servicios: 0, productos: 0, count: 0 },
      'Débito':                    { servicios: 0, productos: 0, count: 0 },
      'Crédito':                   { servicios: 0, productos: 0, count: 0 },
      'Transferencia':             { servicios: 0, productos: 0, count: 0 },
      'Tarjeta (sin especificar)': { servicios: 0, productos: 0, count: 0 },
      'Sin especificar':           { servicios: 0, productos: 0, count: 0 },
    };

    rangeCompletadas.forEach(c => {
      const k = normalize(c.metodoPago);
      acc[k].servicios += getPrice(c);
      acc[k].count     += 1;
    });

    rangeVentas.forEach(v => {
      const k = normalize(v.metodoPago);
      const monto = Number(v.precio) || Number(v.total) || 0;
      const qty   = Number(v.cantidad) || 1;
      acc[k].productos += monto * (v.total ? 1 : qty);
      acc[k].count     += 1;
    });

    const total = Object.values(acc).reduce((s, r) => s + r.servicios + r.productos, 0);

    const rows = Object.entries(acc)
      .map(([nombre, r]) => ({
        nombre,
        servicios: r.servicios,
        productos: r.productos,
        total:     r.servicios + r.productos,
        count:     r.count,
        pct:       total > 0 ? ((r.servicios + r.productos) / total) * 100 : 0,
      }))
      .filter(r => r.total > 0 || ['Efectivo', 'Débito', 'Crédito', 'Transferencia'].includes(r.nombre));

    return { rows, total };
  }, [citas, fechaInicio, fechaFin, rangeVentas, getPrice]);

  /* ── 4. Métricas por Barbero ── */
  const barberoStats = useMemo(() => {
    const rangeCitas = citas.filter(c => c.fecha >= fechaInicio && c.fecha <= fechaFin);

    return barberos.map(b => {
      const bCitas     = rangeCitas.filter(c => c.barberoId === b.id || c.barbero === b.nombre);
      const completadas = bCitas.filter(c => c.estado === 'Completada');
      const canceladas  = bCitas.filter(c => c.estado === 'Cancelada');
      const ingresos    = completadas.reduce((s, c) => s + getPrice(c), 0);
      const ticket      = completadas.length ? ingresos / completadas.length : 0;
      const propinas    = completadas.reduce((s, c) => s + (Number(c.propina) || 0), 0);
      const comisionPct = Number(b.comision) || 0;
      const comisionGanada  = ingresos * comisionPct / 100;
      const pctCancelacion  = bCitas.length ? Math.round((canceladas.length / bCitas.length) * 100) : 0;

      const svcMap = {};
      completadas.forEach(c => {
        const k = c.servicioNombre || 'Sin especificar';
        svcMap[k] = (svcMap[k] || 0) + 1;
      });
      const topServicios = Object.entries(svcMap)
        .sort((a, x) => x[1] - a[1])
        .slice(0, 6)
        .map(([nombre, count]) => ({ nombre: nombre.length > 18 ? nombre.slice(0, 16) + '…' : nombre, count }));

      const meses = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setDate(1);
        d.setMonth(d.getMonth() - i);
        const key   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString('es-CL', { month: 'short' });
        const mc    = citas.filter(c =>
          c.fecha?.startsWith(key) &&
          c.estado === 'Completada' &&
          (c.barberoId === b.id || c.barbero === b.nombre)
        );
        meses.push({ mes: label, citas: mc.length, ingresos: mc.reduce((s, c) => s + getPrice(c), 0) });
      }

      const clienteMap = {};
      bCitas.forEach(c => {
        const k = c.clienteNombre || 'Anónimo';
        if (!clienteMap[k]) clienteMap[k] = { nombre: k, citas: 0 };
        clienteMap[k].citas++;
      });
      const topClientes = Object.values(clienteMap)
        .sort((a, x) => x.citas - a.citas)
        .slice(0, 5);

      return {
        ...b,
        total: bCitas.length,
        completadas: completadas.length,
        canceladas:  canceladas.length,
        ingresos,
        ticket,
        propinas,
        comisionGanada,
        comisionPct,
        pctCancelacion,
        topServicios,
        meses,
        topClientes,
      };
    }).sort((a, x) => x.ingresos - a.ingresos || x.completadas - a.completadas);
  }, [barberos, citas, fechaInicio, fechaFin, getPrice]);

  /* ── Export CSV / Print ── */
  const exportCSV = useCallback(() => {
    const rangeCitas = citas
      .filter(c => c.fecha >= fechaInicio && c.fecha <= fechaFin)
      .sort((a, b) => (a.fecha + (a.hora || '')).localeCompare(b.fecha + (b.hora || '')));
    const rows = [
      ['Fecha', 'Hora', 'Cliente', 'Barbero', 'Servicio', 'Precio', 'Método de Pago', 'Propina', 'Estado'],
      ...rangeCitas.map(c => [
        c.fecha || '',
        c.hora || '',
        c.clienteNombre || '',
        c.barbero || '',
        c.servicioNombre || '',
        getPrice(c),
        c.metodoPago || '',
        Number(c.propina) || 0,
        c.estado || '',
      ]),
    ];
    downloadCSV(`metricas_citas_${fechaInicio}_${fechaFin}.csv`, rows);
  }, [citas, fechaInicio, fechaFin, getPrice]);

  const handlePrint = useCallback(() => window.print(), []);

  /* ── Drill-down builders ── */
  const openDrill = useCallback((type) => {
    const rangeCitas = citas.filter(c => c.fecha >= fechaInicio && c.fecha <= fechaFin);

    if (type === 'ingresos' || type === 'completadas') {
      const rows = rangeCitas.filter(c => c.estado === 'Completada')
        .sort((a, b) => (b.fecha + (b.hora || '')).localeCompare(a.fecha + (a.hora || '')));
      setDrillDown({
        title: type === 'ingresos' ? 'Detalle de Ingresos · Servicios completados' : 'Citas Completadas',
        subtitle: `${rows.length} cita${rows.length !== 1 ? 's' : ''} entre ${fechaInicio} y ${fechaFin}`,
        rows,
        columns: [
          { key: 'fecha',          label: 'Fecha' },
          { key: 'hora',           label: 'Hora' },
          { key: 'clienteNombre',  label: 'Cliente', bold: true },
          { key: 'barbero',        label: 'Barbero' },
          { key: 'servicioNombre', label: 'Servicio' },
          { key: 'metodoPago',     label: 'Pago' },
          { key: 'precio',         label: 'Precio', align: 'right', render: c => fmtCLP(getPrice(c)) },
        ],
      });
      return;
    }
    if (type === 'canceladas') {
      const rows = rangeCitas.filter(c => c.estado === 'Cancelada')
        .sort((a, b) => (b.fecha + (b.hora || '')).localeCompare(a.fecha + (a.hora || '')));
      setDrillDown({
        title: 'Citas Canceladas',
        subtitle: `${rows.length} cancelación${rows.length !== 1 ? 'es' : ''} entre ${fechaInicio} y ${fechaFin}`,
        rows,
        columns: [
          { key: 'fecha',          label: 'Fecha' },
          { key: 'hora',           label: 'Hora' },
          { key: 'clienteNombre',  label: 'Cliente', bold: true },
          { key: 'barbero',        label: 'Barbero' },
          { key: 'servicioNombre', label: 'Servicio' },
          { key: 'precio',         label: 'Precio', align: 'right', render: c => fmtCLP(getPrice(c)) },
        ],
      });
      return;
    }
    if (type === 'productos') {
      setDrillDown({
        title: 'Ventas de Productos',
        subtitle: `${rangeVentas.length} reserva${rangeVentas.length !== 1 ? 's' : ''} confirmadas en el período`,
        rows: rangeVentas,
        columns: [
          { key: 'fecha',        label: 'Fecha', render: v => parseDateStr(v.fecha || v.createdAt || v.creadoEn) },
          { key: 'productName',  label: 'Producto', bold: true, render: v => v.productName || v.productNombre || v.nombreProducto || '—' },
          { key: 'cantidad',     label: 'Cant.', align: 'right' },
          { key: 'barberoNombre',label: 'Barbero' },
          { key: 'metodoPago',   label: 'Pago' },
          { key: 'precio',       label: 'Total', align: 'right', render: v => fmtCLP(Number(v.precio) || Number(v.total) || 0) },
        ],
      });
      return;
    }
  }, [citas, rangeVentas, fechaInicio, fechaFin, getPrice, parseDateStr]);

  // Primer fetch: skeleton que refleja la estructura real del dashboard.
  // Antes: spinner suelto → sensación de "sin nada". Placeholders en $0
  // eran peores todavía porque parecían métricas reales de una barbería
  // fundida. Filosofía Linear: bloques grises con pulse, sin texto.
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-4 animate-in fade-in duration-200">
        {/* Toolbar (filtros de fecha, refresh) */}
        <div className="flex items-center gap-2">
          <div className="h-10 w-40 bg-slate-800/40 rounded-lg animate-pulse" />
          <div className="h-10 w-32 bg-slate-800/40 rounded-lg animate-pulse" />
          <div className="h-10 w-32 bg-slate-800/40 rounded-lg animate-pulse" />
          <div className="ml-auto h-10 w-24 bg-slate-800/40 rounded-lg animate-pulse" />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-800/60 pb-2">
          {[80, 60, 70, 90].map((w, i) => (
            <div key={i} className="h-8 bg-slate-800/40 rounded-md animate-pulse" style={{ width: w }} />
          ))}
        </div>

        {/* Hero card (KPI héroe + delta + sparkline) */}
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/30 p-6 flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-1 space-y-3">
            <div className="h-3 w-24 bg-slate-800/50 rounded animate-pulse" />
            <div className="h-10 w-56 bg-slate-800/60 rounded-lg animate-pulse" />
            <div className="h-4 w-40 bg-slate-800/40 rounded animate-pulse" />
          </div>
          <div className="w-full md:w-64 h-16 bg-slate-800/40 rounded-lg animate-pulse" />
        </div>

        {/* Grid de 4 KPIs críticos */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-800/60 bg-slate-900/30 p-4 space-y-2">
              <div className="h-3 w-16 bg-slate-800/50 rounded animate-pulse" />
              <div className="h-7 w-24 bg-slate-800/60 rounded animate-pulse" />
              <div className="h-3 w-20 bg-slate-800/40 rounded animate-pulse" />
            </div>
          ))}
        </div>

        {/* 2 charts grandes lado a lado */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-800/60 bg-slate-900/30 p-5 space-y-3">
              <div className="h-4 w-32 bg-slate-800/50 rounded animate-pulse" />
              <div className="h-56 bg-slate-800/30 rounded animate-pulse" />
            </div>
          ))}
        </div>

        {/* Fila de KPIs adicionales */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-800/60 bg-slate-900/30 p-4 space-y-2">
              <div className="h-3 w-16 bg-slate-800/40 rounded animate-pulse" />
              <div className="h-6 w-20 bg-slate-800/50 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (loadError && !citas.length) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-center px-4">
        <p className="text-sm text-slate-300">No pudimos cargar las métricas.</p>
        <p className="text-xs text-slate-500">{loadError}</p>
        <button
          onClick={fetchData}
          className="mt-1 px-4 py-2 rounded-lg text-xs font-semibold border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div data-view="metricas" className="max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Activity className="text-emerald-500" size={20} />
              Métricas & P&L
            </h1>
            <HelpButton onClick={() => setShowHelp(true)} />
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Analítica avanzada y estados de pérdidas y ganancias en tiempo real.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-slate-800 bg-slate-900 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/40 transition-all"
            title="Descargar citas del período en CSV"
          >
            <Download size={12} />
            CSV
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:border-slate-700 transition-all"
            title="Imprimir o guardar como PDF"
          >
            <Printer size={12} />
            Imprimir
          </button>
          <button
            onClick={fetchData}
            disabled={fetching}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:border-slate-700 disabled:opacity-40 transition-all"
          >
            <RefreshCcw size={12} className={fetching ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Date Range Selector Bar — sticky compact */}
      <div className="sticky top-0 z-20 -mx-4 sm:mx-0 px-4 sm:px-0 py-2 bg-slate-950/80 backdrop-blur-md print:hidden">
        <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 flex flex-wrap items-center gap-2">
          <Calendar size={13} className="text-emerald-500 shrink-0" />
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={fechaInicio}
              onChange={e => setFechaInicio(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
            <span className="text-slate-650 text-xs">—</span>
            <input
              type="date"
              value={fechaFin}
              onChange={e => setFechaFin(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          {(() => {
            const PRESETS = [
              { id: 'hoy',       label: 'Hoy',         fn: setHoy },
              { id: 'semana',    label: 'Semana',      fn: setEstaSemana },
              { id: 'mes',       label: 'Mes',         fn: setEsteMes },
              { id: 'mesPasado', label: 'Mes Pasado',  fn: setMesPasado },
            ];
            const today = localDateStr();
            const monthFirst = `${today.slice(0,7)}-01`;
            const activePreset =
              (fechaInicio === today && fechaFin === today) ? 'hoy' :
              (fechaInicio === monthFirst && fechaFin === today) ? 'mes' :
              null;
            return (
              <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-md border border-slate-800/80 ml-auto">
                {PRESETS.map(p => (
                  <button
                    key={p.id}
                    onClick={p.fn}
                    className={`px-2 py-1 text-[10px] font-bold rounded transition-all ${
                      activePreset === p.id
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >{p.label}</button>
                ))}
              </div>
            );
          })()}
          <span className="basis-full text-[10px] text-slate-500 px-1">
            Comparando vs período anterior: <span className="text-slate-400 font-medium">{prevRange.inicio}</span> → <span className="text-slate-400 font-medium">{prevRange.fin}</span> ({prevRange.days} día{prevRange.days !== 1 ? 's' : ''})
          </span>
        </div>
      </div>

      {/* Hero: ingresos totales + delta + sparkline */}
      {(() => {
        const ingresosTotales = stats.ingresos + ingresosProductos;
        const ingresosPrev    = prevStats.ingresos;
        const delta           = pctDelta(stats.ingresos, ingresosPrev);
        const isUp = delta != null && delta > 0;
        return (
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-900/40 border border-slate-800 rounded-2xl p-5 sm:p-6">
            <div className="absolute -top-12 -right-12 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-center relative">
              <div className="md:col-span-2 space-y-1">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                  Ingresos totales del período
                </p>
                <div className="flex flex-wrap items-baseline gap-3">
                  <h2 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
                    {fmtCLP(ingresosTotales)}
                  </h2>
                  <DeltaBadge delta={delta} />
                </div>
                <p className="text-xs text-slate-500">
                  Servicios <span className="text-slate-300 font-medium">{fmtCLP(stats.ingresos)}</span>
                  <span className="text-slate-700 mx-1.5">·</span>
                  Productos <span className="text-slate-300 font-medium">{fmtCLP(ingresosProductos)}</span>
                  {delta != null && (
                    <>
                      <span className="text-slate-700 mx-1.5">·</span>
                      <span className={isUp ? 'text-emerald-400' : 'text-rose-400'}>
                        {isUp ? '+' : ''}{fmtCLP(stats.ingresos - ingresosPrev)} vs {fmtCLP(ingresosPrev)} ant.
                      </span>
                    </>
                  )}
                </p>
              </div>
              <div className="md:border-l md:border-slate-800/60 md:pl-5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                  Últimos 7 días
                </p>
                <Sparkline data={sparkData} color={isUp || delta == null ? ct.positive : ct.negative} />
              </div>
            </div>
          </div>
        );
      })()}

      {/* Selector de Pestañas (Tabs Switch) */}
      {isAdmin && (
        <div className="flex flex-wrap gap-1 bg-slate-950/40 p-1 rounded-xl border border-slate-800/60 print:hidden">
          <button
            onClick={() => setActiveTab('comercial')}
            className={`flex-1 min-w-[140px] px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'comercial'
                ? 'bg-slate-900 text-white border border-slate-800/60 shadow-lg shadow-black/10 text-emerald-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/30'
            }`}
          >
            <BarChart3 size={13} />
            Rendimiento Comercial
          </button>
          <button
            onClick={() => setActiveTab('pnl')}
            className={`flex-1 min-w-[140px] px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'pnl'
                ? 'bg-slate-900 text-white border border-slate-800/60 shadow-lg shadow-black/10 text-emerald-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/30'
            }`}
          >
            <DollarSign size={13} />
            Pérdidas y Ganancias (P&L)
          </button>
          <button
            onClick={() => { setActiveTab('equipo'); setSelectedBarberoId(null); }}
            className={`flex-1 min-w-[140px] px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'equipo'
                ? 'bg-slate-900 text-white border border-slate-800/60 shadow-lg shadow-black/10 text-emerald-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/30'
            }`}
          >
            <Users size={13} />
            Métricas por Barbero
          </button>
          <button
            onClick={() => setActiveTab('insights')}
            className={`flex-1 min-w-[140px] px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'insights'
                ? 'bg-slate-900 text-white border border-slate-800/60 shadow-lg shadow-black/10 text-emerald-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/30'
            }`}
          >
            <Brain size={13} />
            Insights & Patrones
          </button>
        </div>
      )}

      {/* ── TAB 1: RENDIMIENTO COMERCIAL ───────────────────────────────── */}
      {activeTab === 'comercial' && (
        <div className="space-y-6">

          {/* ═════════ HERO — UTILIDAD NETA ═════════
              La cifra que le importa al dueño: lo que efectivamente se
              lleva a casa después de comisiones, sueldos, COGS y gastos.
              Facturación bruta miente; utilidad neta no. */}
          {(() => {
            const un = pnl.utilidadNeta;
            const prev = prevStats.utilidadNeta ?? 0;
            const delta = pctDelta(un, prev);
            const isUp = un >= 0 && (delta == null || delta >= 0);
            const heroColor = un < 0 ? 'from-rose-500/20 to-rose-500/5 border-rose-500/30' :
                              un > 0 ? 'from-emerald-500/15 to-emerald-500/5 border-emerald-500/25' :
                                       'from-slate-500/10 to-slate-500/5 border-slate-500/25';
            const valueColor = un < 0 ? 'text-rose-400' : un > 0 ? 'text-emerald-400' : 'text-slate-400';
            return (
              <div className={`rounded-2xl border bg-gradient-to-br ${heroColor} p-6 md:p-7`}>
                <div className="flex flex-col md:flex-row md:items-center gap-5 md:gap-8">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Wallet size={16} className="text-slate-400" />
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                        Utilidad Neta del período
                      </p>
                    </div>
                    <p className={`text-4xl md:text-5xl font-black tracking-tight leading-none ${valueColor}`}>
                      {fmtCLP(un)}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-xs">
                      <DeltaBadge delta={delta} size="lg" compLabel={compLabel} />
                      <span className="text-slate-400">
                        Ingresos brutos: <span className="text-white font-semibold">{fmtCLP(pnl.ingresosBrutos)}</span>
                      </span>
                      <span className="text-slate-400">
                        Margen: <span className={`font-semibold ${pnl.margenNeto >= 15 ? 'text-emerald-400' : pnl.margenNeto >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                          {pnl.margenNeto.toFixed(1)}%
                        </span>
                      </span>
                    </div>
                  </div>
                  <div className="md:border-l md:border-slate-800/60 md:pl-6 md:min-w-[240px]">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                      Ingresos últimos 7 días
                    </p>
                    <Sparkline data={sparkData} color={isUp || delta == null ? ct.positive : ct.negative} />
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ═════════ 4 KPIs CRÍTICOS ═════════
              Los que un dueño chequea en 30 segundos para saber si su
              barbería está sana. Todos con delta comparativo cuando aplica. */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* PUNTO DE EQUILIBRIO */}
            <KpiCard Icon={Landmark} label="Punto de Equilibrio"
              value={fmtCLP(pnl.puntoEquilibrio)}
              sub={pnl.ratioEquilibrio > 100
                ? `Superado en ${(pnl.ratioEquilibrio - 100).toFixed(0)}% ✓`
                : pnl.ratioEquilibrio > 0
                  ? `Falta ${(100 - pnl.ratioEquilibrio).toFixed(0)}% para cubrirlo`
                  : 'Sin ingresos aún en el período'}
              color={pnl.ratioEquilibrio >= 100 ? 'emerald' : pnl.ratioEquilibrio >= 80 ? 'amber' : 'rose'} />
            {/* TICKET PROMEDIO */}
            <KpiCard Icon={TrendingUp} label="Ticket Promedio"
              value={fmtCLP(stats.ticket)}
              sub={`vs ${fmtCLP(prevStats.ticket)} · ${compLabel}`}
              color="blue"
              delta={pctDelta(stats.ticket, prevStats.ticket)} />
            {/* OCUPACIÓN */}
            <KpiCard Icon={Activity} label="Tasa de Ocupación"
              value={`${stats.ocupacion}%`}
              sub={`vs ${prevStats.ocupacion.toFixed(0)}% · ${compLabel}`}
              color={stats.ocupacion >= 70 ? 'emerald' : stats.ocupacion >= 40 ? 'amber' : 'rose'}
              delta={pctDelta(stats.ocupacion, prevStats.ocupacion)} />
            {/* RETENCIÓN */}
            <KpiCard Icon={RefreshCcw} label="Retención Clientes"
              value={`${stats.pctRecurr}%`}
              sub="Clientes con más de 1 visita"
              color={stats.pctRecurr >= 40 ? 'emerald' : stats.pctRecurr >= 20 ? 'amber' : 'rose'} />
          </div>

          {/* ═════════ KPIs SECUNDARIOS — colapsable ═════════
              Ingresos brutos, completadas, cancelaciones, productos.
              Importantes pero secundarios al "¿estoy vivo este mes?". */}
          <div>
            <button
              onClick={() => setShowMoreKpis(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-slate-400 hover:text-white hover:bg-slate-800/40 transition-colors"
            >
              {showMoreKpis ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {showMoreKpis ? 'Ocultar métricas adicionales' : 'Ver métricas adicionales'}
            </button>
            {showMoreKpis && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-3">
                <KpiCard Icon={DollarSign} label="Ingresos Servicios"
                  value={fmtCLP(stats.ingresos)}
                  sub={hayPrecios ? `vs ${fmtCLP(prevStats.ingresos)} · ${compLabel}` : 'Configura precios'}
                  color="emerald"
                  delta={pctDelta(stats.ingresos, prevStats.ingresos)}
                  onClick={() => openDrill('ingresos')} />
                <KpiCard Icon={CalendarCheck} label="Citas Completadas"
                  value={stats.completadas}
                  sub={`${stats.total} agendadas · ${prevStats.completadas} en ${compLabel}`}
                  color="blue"
                  delta={pctDelta(stats.completadas, prevStats.completadas)}
                  onClick={() => openDrill('completadas')} />
                <KpiCard Icon={XCircle} label="Cancelaciones"
                  value={stats.canceladas}
                  sub={stats.total ? `${Math.round((stats.canceladas / stats.total) * 100)}% del total` : '—'}
                  color="red"
                  delta={pctDelta(stats.canceladas, prevStats.canceladas)}
                  invertDelta
                  onClick={() => openDrill('canceladas')} />
                <KpiCard Icon={ShoppingBag} label="Ingresos Productos"
                  value={fmtCLP(ingresosProductos)}
                  sub="Ventas de productos"
                  color="purple"
                  onClick={() => openDrill('productos')} />
              </div>
            )}
          </div>

          {/* Rankings */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top 10 clientes */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Crown size={16} className="text-amber-400" />
                <p className="text-sm font-semibold text-white">Top 10 Clientes</p>
                <span className="text-xs text-slate-500 ml-auto">En el rango seleccionado</span>
              </div>
              {stats.top10.length === 0 ? (
                <p className="text-xs text-slate-650 italic text-center py-10">Sin datos de citas en este período</p>
              ) : (
                <div className="space-y-1 max-h-[380px] overflow-y-auto pr-1">
                  {stats.top10.map((c, i) => (
                    <div key={i}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800/40 transition-colors">
                      <span className={`text-xs font-bold w-5 text-center shrink-0 ${rankColor(i)}`}>{i + 1}</span>
                      <div className="w-7 h-7 rounded-full bg-slate-800/80 flex items-center justify-center shrink-0 border border-slate-750">
                        <User size={13} className="text-slate-500" />
                      </div>
                      <p className="text-sm text-white flex-1 truncate">{c.nombre}</p>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-semibold text-white">
                          {c.citas} {c.citas === 1 ? 'cita' : 'citas'}
                        </p>
                        {c.gasto > 0 && (
                          <p className="text-[10px] text-slate-500">${Math.round(c.gasto).toLocaleString('es-CL')}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Ranking barberos */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Star size={16} className="text-emerald-400" />
                <p className="text-sm font-semibold text-white">Ranking de Barberos</p>
                <span className="text-xs text-slate-500 ml-auto">En el rango seleccionado</span>
              </div>
              {stats.barberRanking.length === 0 ? (
                <p className="text-xs text-slate-650 italic text-center py-10">Sin citas completadas en este período</p>
              ) : (
                <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                  {stats.barberRanking.map((b, i) => {
                    const maxIng = stats.barberRanking[0]?.ingresos || 1;
                    const pct    = maxIng > 0
                      ? Math.round((b.ingresos / maxIng) * 100)
                      : Math.round((b.citas / (stats.barberRanking[0]?.citas || 1)) * 100);
                    return (
                      <div key={i}
                        className="px-3 py-2 rounded-lg hover:bg-slate-800/40 transition-colors space-y-1.5 border border-transparent hover:border-slate-800">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold w-5 text-center shrink-0 ${rankColor(i)}`}>{i + 1}</span>
                          <p className="text-sm text-white flex-1 truncate">{b.nombre}</p>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-semibold text-white">{b.citas} citas</p>
                            {b.ingresos > 0 && (
                              <p className="text-[10px] text-slate-500">${Math.round(b.ingresos).toLocaleString('es-CL')}</p>
                            )}
                          </div>
                        </div>
                        <div className="ml-7 h-1 bg-slate-950 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500/60 rounded-full transition-all"
                            style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Gráfico 6 meses */}
            <ChartCard
              title="Histórico de Ingresos de Servicios"
              subtitle={
                hayPrecios
                  ? 'Citas completadas · últimos 6 meses (vista general)'
                  : 'Sin precios configurados — muestra cantidad de citas'
              }
              fullWidth
            >
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} vertical={false} />
                  <XAxis dataKey="mes" tick={{ fill: ct.axis, fontSize: 11 }}
                    axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: ct.axis, fontSize: 10 }}
                    axisLine={false} tickLine={false}
                    tickFormatter={v => hayPrecios ? `$${(v / 1000).toFixed(0)}k` : v} />
                  <Tooltip content={<DarkTooltip fmt={hayPrecios ? fmtCLP : undefined} />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
                  {hayPrecios ? (
                    <Bar dataKey="servicios" name="Servicios ($)" fill={ct.positive} radius={[4, 4, 0, 0]} />
                  ) : (
                    <Bar dataKey="citas" name="Citas" fill={ct.positive} radius={[4, 4, 0, 0]} />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Ingresos por barbero */}
            <ChartCard title="Ingresos por Barbero"
              subtitle="Citas completadas en el rango · de mayor a menor">
              {stats.ingresosBar.length === 0 ? (
                <div className="flex items-center justify-center h-40">
                  <p className="text-xs text-slate-650 italic">Sin citas completadas en el período</p>
                </div>
              ) : (
                <ResponsiveContainer
                  width="100%"
                  height={Math.min(280, Math.max(140, stats.ingresosBar.length * 40))}
                >
                  <BarChart data={stats.ingresosBar} layout="vertical" barSize={12}>
                    <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} horizontal={false} />
                    <XAxis type="number" tick={{ fill: ct.axis, fontSize: 10 }}
                      axisLine={false} tickLine={false}
                      tickFormatter={v => hayPrecios ? `$${(v / 1000).toFixed(0)}k` : v} />
                    <YAxis type="category" dataKey="nombre"
                      tick={{ fill: ct.axis, fontSize: 11 }}
                      axisLine={false} tickLine={false} width={65} />
                    <Tooltip content={<DarkTooltip fmt={hayPrecios ? fmtCLP : undefined} />} />
                    <Bar
                      dataKey={hayPrecios ? 'ingresos' : 'citas'}
                      name={hayPrecios ? 'Ingresos' : 'Citas'}
                      fill={ct.neutral}
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* Donut retención */}
            <ChartCard title="Clientes en el Club de Fidelidad"
              subtitle="Clientes con al menos 1 sello acumulado (histórico global)">
              {!retention ? (
                <div className="flex items-center justify-center h-40">
                  <p className="text-xs text-slate-650 italic">Sin datos de clientes aún</p>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-4">
                  <div className="w-full sm:w-[45%]">
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie
                          data={retention.data}
                          cx="50%" cy="50%"
                          innerRadius={45} outerRadius={65}
                          dataKey="value" paddingAngle={4}
                          startAngle={90} endAngle={-270}
                        >
                          <Cell fill={ct.positive} />
                          <Cell fill={ct.grid} />
                        </Pie>
                        <Tooltip content={<DarkTooltip fmt={v => `${v} clientes`} />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3.5">
                    <div className="flex items-start gap-3">
                      <span className="mt-1 w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                      <div>
                        <p className="text-2xl font-bold text-white">{retention.pct}%</p>
                        <p className="text-xs text-slate-500">En el club de fidelidad ({retention.conSellos})</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="mt-1 w-3 h-3 rounded-full bg-slate-700 shrink-0" />
                      <div>
                        <p className="text-2xl font-bold text-white">{100 - retention.pct}%</p>
                        <p className="text-xs text-slate-500">Sin sellos acumulados ({retention.sinSellos})</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-600 font-semibold border-t border-slate-800 pt-2">{retention.total} clientes registrados en total</p>
                  </div>
                </div>
              )}
            </ChartCard>

          </div>
        </div>
      )}

      {/* ── TAB INSIGHTS: IA + HEATMAP ────────────────────────────────── */}
      {activeTab === 'insights' && isAdmin && (
        <div className="space-y-6">
          {/* Panel IA */}
          {aiInsights.length > 0 ? (
            <div className="relative overflow-hidden bg-slate-900 border border-violet-500/25 rounded-xl p-5 shadow-lg shadow-violet-950/5">
              <div className="absolute top-0 right-0 w-56 h-56 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                  <Sparkles size={11} className="text-violet-400" />
                  <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">Análisis Inteligente IA</span>
                </div>
                <span className="text-[10px] text-slate-500 ml-auto">Generado a partir de tus datos reales</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {aiInsights.map((ins, i) => <InsightCard key={i} {...ins} />)}
              </div>
              <AIWatermark />
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
              <Brain size={24} className="text-slate-700 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Aún no hay suficientes datos para generar insights.</p>
            </div>
          )}

          {/* Heatmap */}
          <ChartCard title="Mapa de Demanda Semanal" subtitle="Frecuencia acumulada de citas por día y hora · últimos 6 meses" fullWidth>
            <div className="flex items-center gap-1.5 mb-3">
              <Sparkles size={11} className="text-violet-400" />
              <span className="text-[10px] font-semibold text-violet-400">Patrón térmico analizado</span>
            </div>
            <div className="overflow-x-auto">
              <div style={{ minWidth: 480 }}>
                <div className="flex items-center mb-1 ml-9">
                  {heatmapData.HOURS.map(h => (
                    <div key={h} className="flex-1 text-center text-[9px] text-slate-600">{h}h</div>
                  ))}
                </div>
                {heatmapData.DAYS.map((day, di) => (
                  <div key={di} className="flex items-center gap-0.5 mb-0.5">
                    <div className="w-9 text-[10px] text-slate-500 shrink-0 text-right pr-1.5">{day}</div>
                    {heatmapData.HOURS.map(h => {
                      const count     = heatmapData.counts[`${di}-${h}`] || 0;
                      const intensity = count / heatmapData.maxVal;
                      return (
                        <div
                          key={h}
                          className="flex-1 h-5 rounded-sm transition-colors duration-150 hover:ring-1 hover:ring-emerald-400 cursor-help"
                          style={{
                            background: count === 0
                              ? 'rgba(255,255,255,0.03)'
                              : `rgba(16,185,129,${(0.15 + intensity * 0.75).toFixed(2)})`,
                          }}
                          title={`${day} ${h}:00 — ${count} cita${count !== 1 ? 's' : ''}`}
                        />
                      );
                    })}
                  </div>
                ))}
                <div className="flex items-center gap-1.5 mt-3 ml-9">
                  <span className="text-[9px] text-slate-650">Baja frecuencia</span>
                  {[0, 0.25, 0.5, 0.75, 1].map(v => (
                    <div key={v} className="w-3 h-3 rounded-sm"
                      style={{ background: v === 0 ? 'rgba(255,255,255,0.03)' : `rgba(16,185,129,${(0.15 + v * 0.75).toFixed(2)})` }}
                    />
                  ))}
                  <span className="text-[9px] text-slate-650">Alta frecuencia</span>
                </div>
              </div>
            </div>
          </ChartCard>
        </div>
      )}

      {/* ── TAB 2: PÉRDIDAS Y GANANCIAS (P&L) ─────────────────────────── */}
      {activeTab === 'pnl' && isAdmin && (
        <div className="space-y-6">
          {/* KPIs Financieros */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <KpiCard Icon={DollarSign} label="Ingresos Brutos"
              value={fmtCLP(pnl.ingresosBrutos)}
              sub="Servicios + Ventas Prod."
              color="blue"
              delta={pctDelta(stats.ingresos, prevStats.ingresos)} />
            <KpiCard Icon={Tag} label="Costo Ventas (COGS)"
              value={fmtCLP(pnl.totalCogs)}
              sub="Costo de stock vendido"
              color="amber" />
            <KpiCard Icon={TrendingUp} label="Utilidad Bruta"
              value={fmtCLP(pnl.utilidadBruta)}
              sub="Ingreso - Costo Mercadería"
              color="emerald" />
            <KpiCard Icon={TrendingDown} label="Gastos (OPEX)"
              value={fmtCLP(pnl.totalOpex)}
              sub="Otros Gastos + Nómina"
              color="red"
              invertDelta />
            <KpiCard
              Icon={pnl.utilidadNeta >= 0 ? ArrowUpRight : ArrowDownRight}
              label="Utilidad Neta (P&L)"
              value={fmtCLP(pnl.utilidadNeta)}
              sub={`Margen Neto: ${pnl.margenNeto.toFixed(1)}%`}
              color={pnl.utilidadNeta >= 0 ? 'emerald' : 'rose'}
            />
          </div>

          {/* Desglose por Método de Pago */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Wallet size={16} className="text-emerald-400" />
                <div>
                  <p className="text-sm font-semibold text-white">Desglose por Método de Pago</p>
                  <p className="text-xs text-slate-500 mt-0.5">Ingresos cobrados en el período según forma de pago</p>
                </div>
              </div>
              <span className="text-[10px] bg-slate-950 border border-slate-850 px-2 py-0.5 rounded-full text-slate-400 font-bold">
                Total: {fmtCLP(paymentBreakdown.total)}
              </span>
            </div>

            {/* KPIs principales (4 métodos canónicos) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { key: 'Efectivo',      Icon: Banknote,   color: 'emerald' },
                { key: 'Débito',        Icon: CreditCard, color: 'blue'    },
                { key: 'Crédito',       Icon: CreditCard, color: 'purple'  },
                { key: 'Transferencia', Icon: Landmark,   color: 'amber'   },
              ].map(({ key, Icon, color }) => {
                const r = paymentBreakdown.rows.find(x => x.nombre === key) || { total: 0, count: 0, pct: 0 };
                return (
                  <KpiCard
                    key={key}
                    Icon={Icon}
                    label={key}
                    value={fmtCLP(r.total)}
                    sub={`${r.count} cobro${r.count !== 1 ? 's' : ''} · ${r.pct.toFixed(1)}%`}
                    color={color}
                  />
                );
              })}
            </div>

            {/* Tabla detallada con servicios vs productos */}
            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-wide font-bold">
                    <th className="py-2.5">Método</th>
                    <th className="py-2.5 text-right">Servicios</th>
                    <th className="py-2.5 text-right">Productos</th>
                    <th className="py-2.5 text-right">Total</th>
                    <th className="py-2.5 text-right">% del Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {paymentBreakdown.rows.length === 0 ? (
                    <tr><td colSpan={5} className="py-6 text-center text-xs text-slate-650 italic">Sin cobros registrados en el período</td></tr>
                  ) : paymentBreakdown.rows.map(r => (
                    <tr key={r.nombre} className="hover:bg-slate-800/10 text-slate-300 transition-colors">
                      <td className="py-2.5 pr-3 font-medium text-white">{r.nombre}</td>
                      <td className="py-2.5 text-right text-slate-400">{fmtCLP(r.servicios)}</td>
                      <td className="py-2.5 text-right text-slate-400">{fmtCLP(r.productos)}</td>
                      <td className="py-2.5 text-right font-bold text-white">{fmtCLP(r.total)}</td>
                      <td className="py-2.5 text-right">
                        <span className="text-[10px] bg-slate-800 text-slate-300 font-bold px-2 py-0.5 rounded">
                          {r.pct.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Panel Informativo de Propinas */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/10">
                <Sparkles size={16} />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Flujo de Propinas del Período</p>
                <p className="text-[10px] text-slate-500 leading-relaxed mt-0.5">
                  Las propinas son de libre asignación directa a los barberos. Se excluyen del P&L neto del negocio por ser pasajes de caja neutrales.
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-amber-400">{fmtCLP(pnl.propinas)}</p>
              <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Neutral Pass-through</p>
            </div>
          </div>

          {/* Gráficos de P&L */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Gráfico Tendencias de Rentabilidad */}
            <ChartCard title="Tendencia de Rentabilidad (6 meses históricos)" subtitle="Comportamiento mensual de ingresos, egresos globales y rentabilidad neta">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={pnlHistoricalData}>
                  <defs>
                    <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorEgresos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorNeta" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} vertical={false} />
                  <XAxis dataKey="mes" tick={{ fill: ct.axis, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: ct.axis, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<DarkTooltip fmt={fmtCLP} />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Area type="monotone" dataKey="Ingresos" stroke={ct.positive} strokeWidth={2} fillOpacity={1} fill="url(#colorIngresos)" />
                  <Area type="monotone" dataKey="Egresos" stroke={ct.negative} strokeWidth={2} fillOpacity={1} fill="url(#colorEgresos)" />
                  <Area type="monotone" dataKey="Utilidad Neta" stroke={ct.neutral} strokeWidth={2} fillOpacity={1} fill="url(#colorNeta)" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Distribución de Egresos */}
            <ChartCard title="Distribución de Costos & Egresos" subtitle="Desglose porcentual y total de COGS, nómina y gastos operativos en el período">
              {pnl.expenseBreakdown.length === 0 ? (
                <div className="flex items-center justify-center h-48">
                  <p className="text-xs text-slate-650 italic">Sin costos o egresos registrados en este período</p>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-2">
                  <div className="w-full sm:w-[45%]">
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie
                          data={pnl.expenseBreakdown}
                          cx="50%" cy="50%"
                          innerRadius={45} outerRadius={65}
                          dataKey="value" paddingAngle={3}
                          startAngle={90} endAngle={-270}
                        >
                          {pnl.expenseBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<DarkTooltip fmt={fmtCLP} />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2.5 max-h-[190px] overflow-y-auto pr-1 flex-1">
                    {pnl.expenseBreakdown.map((item, index) => (
                      <div key={item.name} className="flex items-start gap-2.5 text-xs">
                        <span className="mt-1 w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[index % PIE_COLORS.length] }} />
                        <div className="min-w-0 flex-1">
                          <div className="flex justify-between font-medium">
                            <span className="text-slate-350 truncate pr-2">{item.name}</span>
                            <span className="text-white font-semibold">{fmtCLP(item.value)}</span>
                          </div>
                          <p className="text-[10px] text-slate-550 mt-0.5">
                            {Math.round((item.value / pnl.totalOpex) * 100)}% del egreso general
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </ChartCard>
          </div>

          {/* Auditoría de Egresos */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Layers size={14} className="text-slate-400" />
                Auditoría de Gastos Operativos (OPEX en el período)
              </h3>
              <span className="text-[10px] bg-slate-950 border border-slate-850 px-2 py-0.5 rounded-full text-slate-400 font-bold">
                {pnl.rangeGastos.length} Registros
              </span>
            </div>
            {pnl.rangeGastos.length === 0 ? (
              <p className="text-xs text-slate-650 italic text-center py-10">Sin gastos directos guardados en este rango</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-wide font-bold">
                      <th className="py-2.5">Descripción</th>
                      <th className="py-2.5">Categoría</th>
                      <th className="py-2.5">Método de Pago</th>
                      <th className="py-2.5">Fecha</th>
                      <th className="py-2.5 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {pnl.rangeGastos.map(g => (
                      <tr key={g.id} className="hover:bg-slate-800/10 text-slate-300 transition-colors">
                        <td className="py-2.5 pr-3 font-medium text-white">{g.descripcion}</td>
                        <td className="py-2.5 pr-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            g.categoria === 'Sueldos' ? 'bg-purple-500/10 text-purple-400' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {g.categoria}
                          </span>
                        </td>
                        <td className="py-2.5 text-slate-400">{g.metodoPago || 'Efectivo'}</td>
                        <td className="py-2.5 text-slate-450">{parseDateStr(g.fecha)}</td>
                        <td className="py-2.5 text-right font-bold text-white">{fmtCLP(g.monto)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: MÉTRICAS POR BARBERO ───────────────────────────────── */}
      {activeTab === 'equipo' && isAdmin && (
        <div className="space-y-6">

          {/* Vista general: grid comparativo */}
          {!selectedBarberoId && (
            <>
              {barberoStats.length === 0 ? (
                <div className="flex items-center justify-center py-24">
                  <p className="text-sm text-slate-500 italic">No hay barberos configurados en el equipo</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {barberoStats.map((b, i) => (
                    <div
                      key={b.id}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all cursor-pointer group"
                      onClick={() => setSelectedBarberoId(b.id)}
                    >
                      <div className="flex items-start gap-4 mb-4">
                        <div className="relative shrink-0">
                          <BarberAvatar foto={b.foto} nombre={b.nombre} size="md" />
                          {i < 3 && (
                            <span className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border border-slate-900 ${
                              i === 0 ? 'bg-amber-400 text-slate-900' : i === 1 ? 'bg-slate-400 text-slate-900' : 'bg-amber-700 text-white'
                            }`}>{i + 1}</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-white truncate">{b.nombre}</p>
                          {b.especialidad && (
                            <p className="text-xs text-slate-500 truncate mt-0.5">{b.especialidad}</p>
                          )}
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            {b.comisionPct > 0 && (
                              <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 px-1.5 py-0.5 rounded">
                                {b.comisionPct}% comisión
                              </span>
                            )}
                            {b.disponible === false && (
                              <span className="text-[10px] font-bold bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">Inactivo</span>
                            )}
                          </div>
                        </div>
                        <ArrowRight size={14} className="text-slate-600 group-hover:text-emerald-400 transition-colors shrink-0 mt-1" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-950/60 rounded-lg px-3 py-2.5">
                          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Citas</p>
                          <p className="text-xl font-bold text-white">{b.completadas}</p>
                          <p className="text-[10px] text-slate-600">{b.canceladas} canceladas</p>
                        </div>
                        <div className="bg-slate-950/60 rounded-lg px-3 py-2.5">
                          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Ingresos</p>
                          <p className="text-xl font-bold text-emerald-400">{fmtCLP(b.ingresos)}</p>
                          <p className="text-[10px] text-slate-600">{b.ticket > 0 ? `Ticket: ${fmtCLP(b.ticket)}` : 'Sin precios'}</p>
                        </div>
                        <div className="bg-slate-950/60 rounded-lg px-3 py-2.5">
                          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Cancelaciones</p>
                          <p className={`text-xl font-bold ${b.pctCancelacion >= 20 ? 'text-red-400' : 'text-white'}`}>{b.pctCancelacion}%</p>
                          <p className="text-[10px] text-slate-600">del total</p>
                        </div>
                        <div className="bg-slate-950/60 rounded-lg px-3 py-2.5">
                          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Propinas</p>
                          <p className="text-xl font-bold text-amber-400">{fmtCLP(b.propinas)}</p>
                          <p className="text-[10px] text-slate-600">acumuladas</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Vista detalle: un barbero seleccionado */}
          {selectedBarberoId && (() => {
            const b = barberoStats.find(x => x.id === selectedBarberoId);
            if (!b) return null;
            const hayIngB = b.meses.some(m => m.ingresos > 0);
            return (
              <div className="space-y-6">

                {/* Back */}
                <button
                  onClick={() => setSelectedBarberoId(null)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  <ChevronLeft size={14} />
                  Volver al equipo
                </button>

                {/* Perfil */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <div className="flex items-center gap-5">
                    <BarberAvatar foto={b.foto} nombre={b.nombre} size="lg" />
                    <div>
                      <h2 className="text-xl font-bold text-white">{b.nombre}</h2>
                      {b.especialidad && <p className="text-sm text-slate-400 mt-0.5">{b.especialidad}</p>}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {b.comisionPct > 0 && (
                          <span className="text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 px-2 py-0.5 rounded">
                            {b.comisionPct}% comisión servicios
                          </span>
                        )}
                        {Number(b.sueldoBase) > 0 && (
                          <span className="text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/15 px-2 py-0.5 rounded">
                            {fmtCLP(b.sueldoBase)} sueldo base
                          </span>
                        )}
                        <span className={`text-xs font-bold px-2 py-0.5 rounded border ${
                          b.disponible !== false
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15'
                            : 'bg-slate-800 text-slate-500 border-slate-700'
                        }`}>
                          {b.disponible !== false ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  <KpiCard Icon={CalendarCheck} label="Citas Completadas"    value={b.completadas}                         sub={`de ${b.total} agendadas`}           color="blue"    />
                  <KpiCard Icon={DollarSign}    label="Ingresos Generados"   value={fmtCLP(b.ingresos)}                    sub="Servicios completados"                color="emerald" />
                  <KpiCard Icon={TrendingUp}    label="Ticket Promedio"       value={b.ticket > 0 ? fmtCLP(b.ticket) : '—'} sub="Por cita completada"                  color="amber"   />
                  <KpiCard Icon={XCircle}       label="Tasa de Cancelación"  value={`${b.pctCancelacion}%`}               sub={`${b.canceladas} citas canceladas`}  color={b.pctCancelacion >= 20 ? 'red' : 'cyan'} />
                  <KpiCard Icon={Sparkles}      label="Propinas Recibidas"   value={fmtCLP(b.propinas)}                    sub="Flujo neutral al barbero"             color="rose"    />
                  <KpiCard Icon={Percent}       label="Comisión Generada"    value={fmtCLP(b.comisionGanada)}              sub={`${b.comisionPct}% sobre ingresos`}  color="purple"  />
                </div>

                {/* Gráficos */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <ChartCard title="Tendencia de Citas (6 meses)" subtitle="Últimos 6 meses históricos · citas e ingresos">
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={b.meses} barSize={14}>
                        <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} vertical={false} />
                        <XAxis dataKey="mes" tick={{ fill: ct.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis yAxisId="left" tick={{ fill: ct.axis, fontSize: 10 }} axisLine={false} tickLine={false}
                          tickFormatter={v => hayIngB ? `$${(v / 1000).toFixed(0)}k` : v} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fill: ct.axis, fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<DarkTooltip fmt={hayIngB ? fmtCLP : undefined} />} />
                        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
                        {hayIngB && <Bar yAxisId="left"  dataKey="ingresos" name="Ingresos ($)" fill={ct.positive} radius={[4, 4, 0, 0]} />}
                        <Bar yAxisId="right" dataKey="citas" name="Citas" fill={ct.neutral} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  <ChartCard title="Top Servicios Realizados" subtitle="Más frecuentes en el rango seleccionado">
                    {b.topServicios.length === 0 ? (
                      <div className="flex items-center justify-center h-40">
                        <p className="text-xs text-slate-500 italic">Sin citas completadas en este período</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={Math.min(280, Math.max(140, b.topServicios.length * 44))}>
                        <BarChart data={b.topServicios} layout="vertical" barSize={12}>
                          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} horizontal={false} />
                          <XAxis type="number" tick={{ fill: ct.axis, fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis type="category" dataKey="nombre" tick={{ fill: ct.axis, fontSize: 10 }}
                            axisLine={false} tickLine={false} width={80} />
                          <Tooltip content={<DarkTooltip fmt={v => `${v} citas`} />} />
                          <Bar dataKey="count" name="Citas" fill={ct.accent} radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </ChartCard>
                </div>

                {/* Top clientes del barbero */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Crown size={16} className="text-amber-400" />
                    <p className="text-sm font-semibold text-white">Top Clientes</p>
                    <span className="text-xs text-slate-500 ml-auto">
                      Más visitas con {b.nombre.split(' ')[0]} · en el rango
                    </span>
                  </div>
                  {b.topClientes.length === 0 ? (
                    <p className="text-xs text-slate-500 italic text-center py-8">Sin clientes en este período</p>
                  ) : (
                    <div className="space-y-1">
                      {b.topClientes.map((c, i) => (
                        <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800/40 transition-colors">
                          <span className={`text-xs font-bold w-5 text-center shrink-0 ${rankColor(i)}`}>{i + 1}</span>
                          <div className="w-7 h-7 rounded-full bg-slate-800/80 flex items-center justify-center shrink-0 border border-slate-750">
                            <User size={13} className="text-slate-500" />
                          </div>
                          <p className="text-sm text-white flex-1 truncate">{c.nombre}</p>
                          <p className="text-xs font-semibold text-slate-400">{c.citas} {c.citas === 1 ? 'cita' : 'citas'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Drill-down modal */}
      <DrillDownModal
        open={!!drillDown}
        title={drillDown?.title}
        subtitle={drillDown?.subtitle}
        rows={drillDown?.rows || []}
        columns={drillDown?.columns || []}
        onClose={() => setDrillDown(null)}
      />

      {/* Help Modal */}
      {showHelp && (
        <HelpModal title="Guía Avanzada — Métricas & P&L" onClose={() => setShowHelp(false)}>
          <div className="space-y-4 text-slate-300 text-xs">
            <p>
              Bienvenido al centro de control analítico y financiero. Este módulo integra tus datos de servicios, caja e inventario para brindarte un panel detallado de rentabilidad:
            </p>
            <div className="space-y-2.5">
              <p className="font-bold text-white flex items-center gap-1">
                <BarChart3 size={12} className="text-emerald-400" />
                Rendimiento Comercial:
              </p>
              <p className="pl-4">
                Muestra la cantidad de citas, cancelaciones, ticket promedio e ingresos de servicios y productos acumulados estrictamente en el período de fechas seleccionado.
              </p>
              
              <p className="font-bold text-white flex items-center gap-1">
                <DollarSign size={12} className="text-emerald-450" />
                Pérdidas y Ganancias (P&L):
              </p>
              <p className="pl-4">
                Calcula la salud financiera real del negocio:
                <br />• <strong className="text-white">Ingresos Brutos</strong> = Servicios completados + Productos entregados.
                <br />• <strong className="text-white">COGS</strong> = Costo de adquisición mayorista de los productos vendidos.
                <br />• <strong className="text-white">OPEX</strong> = Suma de gastos operativos + comisiones calculadas de barberos + sueldo base proporcional en el período.
                <br />• <strong className="text-white">Utilidad Neta</strong> = Utilidad Bruta - OPEX.
              </p>

              <p className="font-bold text-white flex items-center gap-1">
                <Wallet size={12} className="text-emerald-400" />
                Desglose por Método de Pago:
              </p>
              <p className="pl-4">
                Dentro del P&L verás cuánto dinero entró según forma de cobro: <strong className="text-white">Efectivo</strong>, <strong className="text-white">Débito</strong>, <strong className="text-white">Crédito</strong> y <strong className="text-white">Transferencia</strong>. Suma servicios completados y productos vendidos en el período.
                <br />La rentabilidad de inventario ahora vive en su propia sección del sidebar.
              </p>
            </div>
          </div>
        </HelpModal>
      )}
    </div>
  );
}
