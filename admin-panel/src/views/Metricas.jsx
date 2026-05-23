import { useState, useMemo, useEffect, useCallback } from 'react';
import { getDocs, query, where } from 'firebase/firestore';
import {
  TrendingUp, CalendarCheck, XCircle, DollarSign,
  ShoppingBag, RefreshCcw, Activity, Crown, Star, User, Sparkles,
  TrendingDown, ArrowUpRight, ArrowDownRight, Layers, AlertCircle,
  HelpCircle, Eye, Info, Calendar, BarChart3, PieChart as PieIcon,
  Tag, Percent, AlertTriangle, ArrowRight, Users, ChevronLeft,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';
import { tenantCol } from '../lib/tenantUtils';
import HelpModal, { HelpButton } from '../components/ui/HelpModal';
import AIWatermark from '../components/ui/AIWatermark';
import { useAuth } from '../contexts/AuthContext';

function localDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getSixMonthsAgo() {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 5);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}
const SIX_MONTHS_AGO = getSixMonthsAgo();

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

function KpiCard({ Icon, label, value, sub, color = 'emerald' }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-start gap-4 hover:border-slate-700 transition-all">
      <div className={`p-2.5 rounded-lg shrink-0 ${KPI_COLORS[color]} border`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-white mt-0.5 truncate">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5 truncate">{sub}</p>}
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

  const [showHelp,         setShowHelp]         = useState(false);
  const [activeTab,        setActiveTab]        = useState('comercial');
  const [selectedBarberoId, setSelectedBarberoId] = useState(null);

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
  const [ventas,    setVentas]    = useState([]);
  const [gastos,    setGastos]    = useState([]);
  const [barberos,  setBarberos]  = useState([]);
  const [productos, setProductos] = useState([]);
  const [fetching,  setFetching]  = useState(false);

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
    setFetching(true);
    try {
      const queryStart = fechaInicio < SIX_MONTHS_AGO ? fechaInicio : SIX_MONTHS_AGO;
      const [citasSnap, serviciosSnap, clientesSnap, ventasSnap, gastosSnap, barberosSnap, productosSnap] = await Promise.all([
        getDocs(query(tenantCol('citas'), where('fecha', '>=', queryStart))),
        getDocs(tenantCol('servicios')),
        getDocs(tenantCol('clientes')),
        getDocs(tenantCol('product_reservations')),
        getDocs(tenantCol('gastos')),
        getDocs(tenantCol('barberos')),
        getDocs(tenantCol('productos')),
      ]);
      setCitas(citasSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setServicios(serviciosSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setClientes(clientesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setVentas(ventasSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setGastos(gastosSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setBarberos(barberosSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setProductos(productosSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error('Metricas fetchData:', e);
    } finally {
      setFetching(false);
    }
  }, [fechaInicio]);

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
    Number(c.precio) || precioMap[c.servicioId] || precioMap[c.servicioNombre] || 0,
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
      const k = c.barbero || c.barberoId || 'Sin asignar';
      if (!barberoMap[k]) barberoMap[k] = { nombre: k, citas: 0, ingresos: 0 };
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

  // Client loyalty stamps retention
  const retention = useMemo(() => {
    if (!clientes.length) return null;
    const conSellos = clientes.filter(c => (c.sellosHistoricos || c.stamps || 0) > 0).length;
    const sinSellos = clientes.length - conSellos;
    return {
      data: [
        { name: 'Con sellos', value: conSellos },
        { name: 'Sin sellos', value: sinSellos },
      ],
      pct:       Math.round((conSellos / clientes.length) * 100),
      conSellos,
      sinSellos,
      total:     clientes.length,
    };
  }, [clientes]);

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

  /* ── 3. Rentabilidad de Inventario Memoized KPIs and Table ── */
  const inventoryStats = useMemo(() => {
    let totalValorVenta = 0;
    let totalValorCosto = 0;

    const items = productos.map(p => {
      const stock = Number(p.stock) || 0;
      const precio = Number(p.precio) || 0;
      const costo = Number(p.precioCosto) || 0;

      totalValorVenta += precio * stock;
      totalValorCosto += costo * stock;

      const margenAbs = precio - costo;
      const margenPct = precio > 0 ? (margenAbs / precio) * 100 : 0;

      return {
        ...p,
        stock,
        precio,
        costo,
        margenAbs,
        margenPct,
      };
    }).sort((a, b) => b.margenAbs - a.margenAbs);

    const margenPotencial = totalValorVenta - totalValorCosto;
    const margenPotencialPct = totalValorVenta > 0 ? (margenPotencial / totalValorVenta) * 100 : 0;

    return {
      items,
      totalValorVenta,
      totalValorCosto,
      margenPotencial,
      margenPotencialPct,
    };
  }, [productos]);

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

  return (
    <div className="max-w-6xl mx-auto space-y-6">

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
        <button
          onClick={fetchData}
          disabled={fetching}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:border-slate-700 disabled:opacity-40 transition-all self-start sm:self-center"
        >
          <RefreshCcw size={12} className={fetching ? 'animate-spin' : ''} />
          Actualizar Datos
        </button>
      </div>

      {/* Date Range Selector Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar size={13} className="text-emerald-500" />
            Filtro de Período
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Mostrando resultados desde <span className="text-white font-medium">{fechaInicio}</span> hasta <span className="text-white font-medium">{fechaFin}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={fechaInicio}
              onChange={e => setFechaInicio(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
            <span className="text-slate-650 text-xs">—</span>
            <input
              type="date"
              value={fechaFin}
              onChange={e => setFechaFin(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800/80">
            <button onClick={setHoy} className="px-2 py-1 hover:bg-slate-900 text-slate-400 hover:text-white text-[10px] font-bold rounded transition-all">Hoy</button>
            <button onClick={setEstaSemana} className="px-2 py-1 hover:bg-slate-900 text-slate-400 hover:text-white text-[10px] font-bold rounded transition-all">Semana</button>
            <button onClick={setEsteMes} className="px-2 py-1 hover:bg-slate-900 text-slate-400 hover:text-white text-[10px] font-bold rounded transition-all">Mes</button>
            <button onClick={setMesPasado} className="px-2 py-1 hover:bg-slate-900 text-slate-400 hover:text-white text-[10px] font-bold rounded transition-all">Mes Pasado</button>
          </div>
        </div>
      </div>

      {/* Selector de Pestañas (Tabs Switch) */}
      {isAdmin && (
        <div className="flex flex-wrap gap-1 bg-slate-950/40 p-1 rounded-xl border border-slate-800/60">
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
            onClick={() => setActiveTab('inventario')}
            className={`flex-1 min-w-[140px] px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'inventario'
                ? 'bg-slate-900 text-white border border-slate-800/60 shadow-lg shadow-black/10 text-emerald-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/30'
            }`}
          >
            <Layers size={13} />
            Rentabilidad de Inventario
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
        </div>
      )}

      {/* ── TAB 1: RENDIMIENTO COMERCIAL ───────────────────────────────── */}
      {activeTab === 'comercial' && (
        <div className="space-y-6">
          {/* Panel IA */}
          {aiInsights.length > 0 && (
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
          )}

          {/* KPIs — fila 1 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard Icon={DollarSign} label="Ingresos Servicios"
              value={`$${Math.round(stats.ingresos).toLocaleString('es-CL')}`}
              sub={hayPrecios ? 'Citas completadas' : 'Configura precios en Servicios'}
              color="emerald" />
            <KpiCard Icon={CalendarCheck} label="Citas"
              value={stats.completadas}
              sub={`${stats.total} agendadas`}
              color="blue" />
            <KpiCard Icon={TrendingUp} label="Ticket prom."
              value={`$${Math.round(stats.ticket).toLocaleString('es-CL')}`}
              sub="Por servicio completado"
              color="amber" />
            <KpiCard Icon={XCircle} label="Cancelaciones"
              value={stats.canceladas}
              sub={stats.total ? `${Math.round((stats.canceladas / stats.total) * 100)}% del total` : '—'}
              color="red" />
          </div>

          {/* KPIs — fila 2 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard Icon={ShoppingBag} label="Ingresos Productos"
              value={`$${Math.round(ingresosProductos).toLocaleString('es-CL')}`}
              sub="Reservas confirmadas / Ventas directas"
              color="purple" />
            <KpiCard Icon={RefreshCcw} label="Clientes Recurrentes"
              value={`${stats.pctRecurr}%`}
              sub="Con más de 1 visita (total histórico)"
              color="cyan" />
            <KpiCard Icon={Activity} label="Tasa de Ocupación"
              value={`${stats.ocupacion}%`}
              sub="Completadas vs agendadas"
              color="rose" />
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }}
                    axisLine={false} tickLine={false}
                    tickFormatter={v => hayPrecios ? `$${(v / 1000).toFixed(0)}k` : v} />
                  <Tooltip content={<DarkTooltip fmt={hayPrecios ? fmtCLP : undefined} />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
                  {hayPrecios ? (
                    <Bar dataKey="servicios" name="Servicios ($)" fill="#10b981" radius={[4, 4, 0, 0]} />
                  ) : (
                    <Bar dataKey="citas" name="Citas" fill="#10b981" radius={[4, 4, 0, 0]} />
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
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }}
                      axisLine={false} tickLine={false}
                      tickFormatter={v => hayPrecios ? `$${(v / 1000).toFixed(0)}k` : v} />
                    <YAxis type="category" dataKey="nombre"
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      axisLine={false} tickLine={false} width={65} />
                    <Tooltip content={<DarkTooltip fmt={hayPrecios ? fmtCLP : undefined} />} />
                    <Bar
                      dataKey={hayPrecios ? 'ingresos' : 'citas'}
                      name={hayPrecios ? 'Ingresos' : 'Citas'}
                      fill="#3b82f6"
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
                  <ResponsiveContainer width="45%" height={160}>
                    <PieChart>
                      <Pie
                        data={retention.data}
                        cx="50%" cy="50%"
                        innerRadius={45} outerRadius={65}
                        dataKey="value" paddingAngle={4}
                        startAngle={90} endAngle={-270}
                      >
                        <Cell fill="#10b981" />
                        <Cell fill="#1e293b" />
                      </Pie>
                      <Tooltip content={<DarkTooltip fmt={v => `${v} clientes`} />} />
                    </PieChart>
                  </ResponsiveContainer>
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

            {/* Heatmap demanda */}
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
        </div>
      )}

      {/* ── TAB 2: PÉRDIDAS Y GANANCIAS (P&L) ─────────────────────────── */}
      {activeTab === 'pnl' && isAdmin && (
        <div className="space-y-6">
          {/* KPIs Financieros */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <KpiCard Icon={DollarSign} label="Ingresos Brutos"
              value={fmtCLP(pnl.ingresosBrutos)}
              sub={`Servicios + Ventas Prod.`}
              color="blue" />
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
              color="red" />
            <KpiCard
              Icon={pnl.utilidadNeta >= 0 ? ArrowUpRight : ArrowDownRight}
              label="Utilidad Neta (P&L)"
              value={fmtCLP(pnl.utilidadNeta)}
              sub={`Margen Neto: ${pnl.margenNeto.toFixed(1)}%`}
              color={pnl.utilidadNeta >= 0 ? 'emerald' : 'rose'}
            />
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<DarkTooltip fmt={fmtCLP} />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Area type="monotone" dataKey="Ingresos" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIngresos)" />
                  <Area type="monotone" dataKey="Egresos" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorEgresos)" />
                  <Area type="monotone" dataKey="Utilidad Neta" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorNeta)" />
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
                  <ResponsiveContainer width="45%" height={180}>
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

      {/* ── TAB 3: RENTABILIDAD DE INVENTARIO ──────────────────────────── */}
      {activeTab === 'inventario' && isAdmin && (
        <div className="space-y-6">
          {/* KPIs de Inventario */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard Icon={ShoppingBag} label="Valor del Stock a Venta"
              value={fmtCLP(inventoryStats.totalValorVenta)}
              sub="Precio Venta * Stock actual"
              color="emerald" />
            <KpiCard Icon={Tag} label="Valor del Stock a Costo"
              value={fmtCLP(inventoryStats.totalValorCosto)}
              sub="Precio Costo * Stock actual"
              color="amber" />
            <KpiCard Icon={TrendingUp} label="Margen Bruto Potencial"
              value={fmtCLP(inventoryStats.margenPotencial)}
              sub="Margen potencial absoluto"
              color="cyan" />
            <KpiCard Icon={Percent} label="Margen Proyectado Promedio"
              value={`${inventoryStats.margenPotencialPct.toFixed(1)}%`}
              sub="Porcentaje de retorno proyectado"
              color="purple" />
          </div>

          {/* Tabla de Márgenes por Producto */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
              <Layers size={16} className="text-slate-400" />
              <div>
                <p className="text-sm font-semibold text-white">Análisis de Rentabilidad por Producto</p>
                <p className="text-xs text-slate-500 mt-0.5">Ordenados de mayor a menor margen bruto absoluto de ganancia unitaria</p>
              </div>
            </div>
            {inventoryStats.items.length === 0 ? (
              <p className="text-xs text-slate-650 italic text-center py-10">Sin productos guardados en inventario</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-550 uppercase tracking-wide font-bold">
                      <th className="py-2.5">Producto</th>
                      <th className="py-2.5 text-center">Stock</th>
                      <th className="py-2.5 text-right">Precio Costo</th>
                      <th className="py-2.5 text-right">Precio Venta</th>
                      <th className="py-2.5 text-right">Margen Neto ($)</th>
                      <th className="py-2.5 text-right">Margen Neto (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {inventoryStats.items.map(p => {
                      const isLowStock = p.stock <= (p.stockMinimo || 0);
                      const isMissingCost = p.costo === 0;
                      return (
                        <tr key={p.id} className="hover:bg-slate-800/10 text-slate-350 transition-colors">
                          <td className="py-3 pr-3 font-medium text-white">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
                              <span className="truncate max-w-[240px]">{p.nombre}</span>
                              <div className="flex flex-wrap items-center gap-1">
                                {isLowStock && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[9px] font-bold border border-amber-500/10">
                                    <AlertTriangle size={8} /> Stock Crítico
                                  </span>
                                )}
                                {isMissingCost && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-450 text-[9px] font-semibold border border-rose-500/10">
                                    Sin Costo Cargado
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className={`py-3 text-center font-bold ${isLowStock ? 'text-amber-500' : 'text-slate-300'}`}>
                            {p.stock}
                          </td>
                          <td className={`py-3 text-right ${isMissingCost ? 'text-slate-600 italic' : 'text-slate-350'}`}>
                            {isMissingCost ? '$0' : fmtCLP(p.costo)}
                          </td>
                          <td className="py-3 text-right text-white font-medium">{fmtCLP(p.precio)}</td>
                          <td className={`py-3 text-right font-bold ${p.margenAbs > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                            {fmtCLP(p.margenAbs)}
                          </td>
                          <td className="py-3 text-right">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              p.margenPct >= 50 ? 'bg-emerald-500/10 text-emerald-400' : p.margenPct >= 20 ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {p.margenPct.toFixed(0)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 4: MÉTRICAS POR BARBERO ───────────────────────────────── */}
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
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="mes" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis yAxisId="left" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false}
                          tickFormatter={v => hayIngB ? `$${(v / 1000).toFixed(0)}k` : v} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<DarkTooltip fmt={hayIngB ? fmtCLP : undefined} />} />
                        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
                        {hayIngB && <Bar yAxisId="left"  dataKey="ingresos" name="Ingresos ($)" fill="#10b981" radius={[4, 4, 0, 0]} />}
                        <Bar yAxisId="right" dataKey="citas" name="Citas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
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
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                          <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis type="category" dataKey="nombre" tick={{ fill: '#94a3b8', fontSize: 10 }}
                            axisLine={false} tickLine={false} width={80} />
                          <Tooltip content={<DarkTooltip fmt={v => `${v} citas`} />} />
                          <Bar dataKey="count" name="Citas" fill="#f59e0b" radius={[0, 4, 4, 0]} />
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
                <Layers size={12} className="text-emerald-400" />
                Rentabilidad de Inventario:
              </p>
              <p className="pl-4">
                Valora tu stock físico a precio de costo y venta. Genera un ranking de rentabilidad unitaria por producto para identificar los artículos con mayor margen de ganancia.
              </p>
            </div>
          </div>
        </HelpModal>
      )}
    </div>
  );
}
