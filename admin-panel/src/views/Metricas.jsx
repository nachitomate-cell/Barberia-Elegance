import { useState, useMemo } from 'react';
import { where } from 'firebase/firestore';
import {
  TrendingUp, CalendarCheck, XCircle, DollarSign,
  ShoppingBag, RefreshCcw, Activity, Crown, Star, User, Sparkles,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { useCollection } from '../hooks/useCollection';
import HelpModal, { HelpButton } from '../components/ui/HelpModal';

function localYearMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Primer día de hace 5 meses (para cargar 6 meses de citas)
function getSixMonthsAgo() {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 5);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}
const SIX_MONTHS_AGO = getSixMonthsAgo();

/* ── KpiCard ─────────────────────────────────────────────────────── */
const KPI_COLORS = {
  emerald: 'bg-emerald-500/10 text-emerald-400',
  blue:    'bg-blue-500/10    text-blue-400',
  red:     'bg-red-500/10     text-red-400',
  amber:   'bg-amber-500/10   text-amber-400',
  purple:  'bg-purple-500/10  text-purple-400',
  cyan:    'bg-cyan-500/10    text-cyan-400',
  rose:    'bg-rose-500/10    text-rose-400',
};

function KpiCard({ Icon, label, value, sub, color = 'emerald' }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-start gap-4">
      <div className={`p-2.5 rounded-lg shrink-0 ${KPI_COLORS[color]}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-white mt-0.5 truncate">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

/* ── ChartCard ───────────────────────────────────────────────────── */
function ChartCard({ title, subtitle, children, fullWidth = false }) {
  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-xl p-5 ${fullWidth ? 'lg:col-span-2' : ''}`}>
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
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      {label && <p className="text-slate-400 font-semibold mb-1.5">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="leading-5">
          {p.name}: <span className="font-semibold">{fmt ? fmt(p.value) : p.value}</span>
        </p>
      ))}
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
    <div className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border ${s.border} ${s.bg}`}>
      <div className={`w-1.5 h-1.5 rounded-full ${s.dot} mt-1.5 shrink-0`} />
      <p className="text-xs text-slate-300 leading-relaxed">{text}</p>
    </div>
  );
}

const fmtCLP  = v => `$${Number(v).toLocaleString('es-CL')}`;
const rankColor = i => i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-amber-700' : 'text-slate-600';

export default function Metricas() {
  const [showHelp, setShowHelp] = useState(false);

  // Citas de los últimos 6 meses (evita cargar toda la colección)
  const { data: citas }     = useCollection('citas',    [where('fecha', '>=', SIX_MONTHS_AGO)], []);
  const { data: servicios } = useCollection('servicios', [], []);
  const { data: clientes }  = useCollection('clientes',  [], []);
  const { data: ventas }    = useCollection('product_reservations', [], []);

  // Mapa precio por servicioId y por servicioNombre
  const precioMap = useMemo(() => {
    const map = {};
    servicios.forEach(s => {
      if (s.id)     map[s.id]     = Number(s.precio) || 0;
      if (s.nombre) map[s.nombre] = Number(s.precio) || 0;
    });
    return map;
  }, [servicios]);

  const getPrice = c =>
    Number(c.precio) || precioMap[c.servicioId] || precioMap[c.servicioNombre] || 0;

  /* ── KPIs y rankings ─────────────────────────────────────────── */
  const stats = useMemo(() => {
    const thisMonth   = localYearMonth();
    const monthly     = citas.filter(c => c.fecha?.startsWith(thisMonth));
    const completadas = monthly.filter(c => c.estado === 'Completada');
    const canceladas  = monthly.filter(c => c.estado === 'Cancelada');
    const ingresos    = completadas.reduce((s, c) => s + getPrice(c), 0);
    const ticket      = completadas.length ? ingresos / completadas.length : 0;

    // Clientes recurrentes (>1 cita en los últimos 6 meses)
    const clienteCounts = {};
    citas.forEach(c => {
      const k = c.clienteNombre || 'Anónimo';
      clienteCounts[k] = (clienteCounts[k] || 0) + 1;
    });
    const totalClients = Object.keys(clienteCounts).length;
    const recurring    = Object.values(clienteCounts).filter(n => n > 1).length;
    const pctRecurr    = totalClients ? Math.round((recurring / totalClients) * 100) : 0;

    // Ocupación del mes
    const ocupacion = monthly.length
      ? Math.round((completadas.length / monthly.length) * 100)
      : 0;

    // Top 10 clientes (últimos 6 meses)
    const clienteMap = {};
    citas.forEach(c => {
      const k = c.clienteNombre || 'Anónimo';
      if (!clienteMap[k]) clienteMap[k] = { nombre: k, citas: 0, gasto: 0 };
      clienteMap[k].citas++;
      clienteMap[k].gasto += getPrice(c);
    });
    const top10 = Object.values(clienteMap)
      .sort((a, b) => b.citas - a.citas)
      .slice(0, 10);

    // Ranking barberos — campo correcto: c.barbero (no c.barberoNombre)
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
      total: monthly.length, completadas: completadas.length,
      canceladas: canceladas.length, ingresos, ticket,
      pctRecurr, ocupacion, top10, barberRanking, ingresosBar,
    };
  }, [citas, precioMap]);

  /* ── Gráfico 6 meses — datos reales ─────────────────────────── */
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
  }, [citas, precioMap]);

  const hayPrecios = chartData.some(d => d.servicios > 0);

  /* ── Ingresos de productos (ventas del mes) ──────────────────── */
  const ingresosProductos = useMemo(() => {
    const thisMonth = localYearMonth();
    return ventas
      .filter(v => {
        const fecha = v.createdAt?.toDate?.()?.toISOString?.()
          || v.fecha || v.date || '';
        return fecha.startsWith(thisMonth)
          && (v.status === 'confirmed' || v.status === 'completed' || v.status === 'paid');
      })
      .reduce((s, v) => s + (Number(v.total) || Number(v.precio) || 0), 0);
  }, [ventas]);

  /* ── Retención — datos reales de clientes/sellos ─────────────── */
  const retention = useMemo(() => {
    if (!clientes.length) return null;
    const conSellos = clientes.filter(
      c => (c.sellosHistoricos || c.stamps || 0) > 0
    ).length;
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

  /* ── Insights IA ─────────────────────────────────────────────── */
  const aiInsights = useMemo(() => {
    if (!citas.length) return [];
    const thisMonth  = localYearMonth();
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
        text: `${top.nombre} lidera el equipo este mes${top.ingresos > 0 ? ` con $${top.ingresos.toLocaleString('es-CL')} en ${top.citas} cita${top.citas !== 1 ? 's' : ''}` : ` con ${top.citas} cita${top.citas !== 1 ? 's' : ''} completadas`}.`,
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

    return insights;
  }, [citas, stats]);

  /* ── Heatmap demanda ─────────────────────────────────────────── */
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

  /* ── Render ──────────────────────────────────────────────────── */
  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-white">Métricas</h1>
          <HelpButton onClick={() => setShowHelp(true)} />
        </div>
        <p className="text-sm text-slate-500 mt-0.5">
          {new Date().toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Panel IA */}
      {aiInsights.length > 0 && (
        <div className="relative overflow-hidden bg-slate-900 border border-violet-500/25 rounded-xl p-5">
          <div className="absolute top-0 right-0 w-56 h-56 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              <Sparkles size={11} className="text-violet-400" />
              <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">Análisis IA</span>
            </div>
            <span className="text-[10px] text-slate-500 ml-auto">Generado a partir de tus datos reales</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {aiInsights.map((ins, i) => <InsightCard key={i} {...ins} />)}
          </div>
        </div>
      )}

      {/* Rankings — primero para visibilidad rápida */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Top 10 clientes */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Crown size={16} className="text-amber-400" />
            <p className="text-sm font-semibold text-white">Top 10 Clientes</p>
            <span className="text-xs text-slate-500 ml-auto">Últimos 6 meses</span>
          </div>
          {stats.top10.length === 0 ? (
            <p className="text-xs text-slate-600 italic text-center py-8">Sin datos de citas</p>
          ) : (
            <div className="space-y-1">
              {stats.top10.map((c, i) => (
                <div key={i}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800/50 transition-colors">
                  <span className={`text-xs font-bold w-5 text-center shrink-0 ${rankColor(i)}`}>{i + 1}</span>
                  <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                    <User size={13} className="text-slate-500" />
                  </div>
                  <p className="text-sm text-white flex-1 truncate">{c.nombre}</p>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-white">
                      {c.citas} {c.citas === 1 ? 'cita' : 'citas'}
                    </p>
                    {c.gasto > 0 && (
                      <p className="text-[10px] text-slate-500">${c.gasto.toLocaleString('es-CL')}</p>
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
            <span className="text-xs text-slate-500 ml-auto">Este mes</span>
          </div>
          {stats.barberRanking.length === 0 ? (
            <p className="text-xs text-slate-600 italic text-center py-8">Sin citas completadas este mes</p>
          ) : (
            <div className="space-y-1">
              {stats.barberRanking.map((b, i) => {
                const maxIng = stats.barberRanking[0]?.ingresos || 1;
                const pct    = maxIng > 0
                  ? Math.round((b.ingresos / maxIng) * 100)
                  : Math.round((b.citas / (stats.barberRanking[0]?.citas || 1)) * 100);
                return (
                  <div key={i}
                    className="px-3 py-2 rounded-lg hover:bg-slate-800/50 transition-colors space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold w-5 text-center shrink-0 ${rankColor(i)}`}>{i + 1}</span>
                      <p className="text-sm text-white flex-1 truncate">{b.nombre}</p>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-semibold text-white">{b.citas} citas</p>
                        {b.ingresos > 0 && (
                          <p className="text-[10px] text-slate-500">${b.ingresos.toLocaleString('es-CL')}</p>
                        )}
                      </div>
                    </div>
                    <div className="ml-7 h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500/70 rounded-full transition-all"
                        style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* KPIs — fila 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard Icon={DollarSign}    label="Ingresos Servicios"
          value={`$${stats.ingresos.toLocaleString('es-CL')}`}
          sub={hayPrecios ? 'Citas completadas' : 'Configura precios en Servicios'}
          color="emerald" />
        <KpiCard Icon={CalendarCheck} label="Citas"
          value={stats.completadas}
          sub={`${stats.total} agendadas`}
          color="blue" />
        <KpiCard Icon={TrendingUp}    label="Ticket prom."
          value={`$${Math.round(stats.ticket).toLocaleString('es-CL')}`}
          sub="Por servicio completado"
          color="amber" />
        <KpiCard Icon={XCircle}       label="Cancelaciones"
          value={stats.canceladas}
          sub={stats.total ? `${Math.round((stats.canceladas / stats.total) * 100)}% del total` : '—'}
          color="red" />
      </div>

      {/* KPIs — fila 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard Icon={ShoppingBag} label="Ingresos Productos"
          value={`$${ingresosProductos.toLocaleString('es-CL')}`}
          sub="Reservas confirmadas del mes"
          color="purple" />
        <KpiCard Icon={RefreshCcw}  label="Clientes Recurrentes"
          value={`${stats.pctRecurr}%`}
          sub="Con más de 1 visita (6 meses)"
          color="cyan" />
        <KpiCard Icon={Activity}    label="Tasa de Ocupación"
          value={`${stats.ocupacion}%`}
          sub="Completadas vs agendadas"
          color="rose" />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Gráfico 6 meses — datos reales */}
        <ChartCard
          title="Ingresos por mes"
          subtitle={
            hayPrecios
              ? 'Citas completadas · últimos 6 meses'
              : 'Sin precios configurados — muestra cantidad de citas'
          }
          fullWidth
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} barSize={20}>
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
          subtitle="Citas completadas este mes · de mayor a menor">
          {stats.ingresosBar.length === 0 ? (
            <div className="flex items-center justify-center h-40">
              <p className="text-xs text-slate-600 italic">Sin citas completadas este mes</p>
            </div>
          ) : (
            <ResponsiveContainer
              width="100%"
              height={Math.min(280, Math.max(120, stats.ingresosBar.length * 40))}
            >
              <BarChart data={stats.ingresosBar} layout="vertical" barSize={14}>
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

        {/* Donut retención — datos reales de clientes/sellos */}
        <ChartCard title="Clientes en el Club de Fidelidad"
          subtitle="Clientes con al menos 1 sello acumulado">
          {!retention ? (
            <div className="flex items-center justify-center h-40">
              <p className="text-xs text-slate-600 italic">Sin datos de clientes aún</p>
            </div>
          ) : (
            <div className="flex items-center gap-8">
              <ResponsiveContainer width="45%" height={160}>
                <PieChart>
                  <Pie
                    data={retention.data}
                    cx="50%" cy="50%"
                    innerRadius={45} outerRadius={68}
                    dataKey="value" paddingAngle={4}
                    startAngle={90} endAngle={-270}
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#1e293b" />
                  </Pie>
                  <Tooltip content={<DarkTooltip fmt={v => `${v} clientes`} />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                  <div>
                    <p className="text-2xl font-bold text-white">{retention.pct}%</p>
                    <p className="text-xs text-slate-500">Con sellos ({retention.conSellos})</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 w-3 h-3 rounded-full bg-slate-700 shrink-0" />
                  <div>
                    <p className="text-2xl font-bold text-white">{100 - retention.pct}%</p>
                    <p className="text-xs text-slate-500">Sin sellos ({retention.sinSellos})</p>
                  </div>
                </div>
                <p className="text-[10px] text-slate-600">{retention.total} clientes registrados</p>
              </div>
            </div>
          )}
        </ChartCard>

        {/* Heatmap demanda */}
        <ChartCard title="Mapa de demanda" subtitle="Frecuencia de citas por día y hora · últimos 6 meses" fullWidth>
          <div className="flex items-center gap-1.5 mb-3">
            <Sparkles size={11} className="text-violet-400" />
            <span className="text-[10px] font-semibold text-violet-400">Detectado por IA</span>
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
                        className="flex-1 h-5 rounded-sm"
                        style={{
                          background: count === 0
                            ? 'rgba(255,255,255,0.04)'
                            : `rgba(16,185,129,${(0.12 + intensity * 0.78).toFixed(2)})`,
                        }}
                        title={`${day} ${h}:00 — ${count} cita${count !== 1 ? 's' : ''}`}
                      />
                    );
                  })}
                </div>
              ))}
              <div className="flex items-center gap-1.5 mt-3 ml-9">
                <span className="text-[9px] text-slate-600">Menos</span>
                {[0, 0.25, 0.5, 0.75, 1].map(v => (
                  <div key={v} className="w-3 h-3 rounded-sm"
                    style={{ background: v === 0 ? 'rgba(255,255,255,0.04)' : `rgba(16,185,129,${(0.12 + v * 0.78).toFixed(2)})` }}
                  />
                ))}
                <span className="text-[9px] text-slate-600">Más</span>
              </div>
            </div>
          </div>
        </ChartCard>

      </div>

      {showHelp && (
        <HelpModal title="Ayuda — Métricas" onClose={() => setShowHelp(false)}>
          <p><strong className="text-white">Métricas</strong> muestra el resumen analítico del negocio.</p>
          <ul className="space-y-1.5 list-disc list-inside text-slate-400">
            <li>Los <span className="text-white">KPIs principales</span> muestran ingresos, citas completadas, cancelaciones y promedio por cita del mes.</li>
            <li>El gráfico de barras compara los <span className="text-white">ingresos por mes</span> de los últimos 6 meses.</li>
            <li>El gráfico circular muestra los <span className="text-white">servicios más solicitados</span>.</li>
            <li>La sección de retención indica qué porcentaje de clientes regresó en los últimos 3 meses.</li>
            <li>Los ingresos se calculan a partir de citas con estado <span className="text-white">Completada</span> y precio configurado en Servicios.</li>
          </ul>
        </HelpModal>
      )}
    </div>
  );
}
