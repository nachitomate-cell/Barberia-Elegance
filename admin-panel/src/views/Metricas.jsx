import { useMemo } from 'react';
import SynapTechNews from '../components/SynapTechNews';
import {
  TrendingUp, CalendarCheck, XCircle, DollarSign,
  ShoppingBag, RefreshCcw, Activity, Crown, Star, User,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { useCollection } from '../hooks/useCollection';

/* ── Mock data (product revenue & retention not tracked in citas) ── */
const MOCK_6M = [
  { mes: 'Dic', servicios: 420000, productos: 85000 },
  { mes: 'Ene', servicios: 380000, productos: 72000 },
  { mes: 'Feb', servicios: 510000, productos: 93000 },
  { mes: 'Mar', servicios: 445000, productos: 68000 },
  { mes: 'Abr', servicios: 490000, productos: 110000 },
  { mes: 'May', servicios: 520000, productos: 125000 },
];
const MOCK_PRODUCTOS_MES = 125000;
const MOCK_RETENCION = [
  { name: 'Canjearon', value: 38 },
  { name: 'Sin canje',  value: 62 },
];

/* ── KpiCard ── */
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

/* ── Chart card wrapper ── */
function ChartCard({ title, subtitle, children, fullWidth = false }) {
  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-xl p-5 ${fullWidth ? 'lg:col-span-2' : ''}`}>
      <p className="text-sm font-semibold text-white mb-0.5">{title}</p>
      {subtitle && <p className="text-xs text-slate-500 mb-4">{subtitle}</p>}
      {children}
    </div>
  );
}

/* ── Custom tooltip ── */
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

const fmtCLP = v => `$${Number(v).toLocaleString('es-CL')}`;

export default function Metricas() {
  const { data: citas } = useCollection('citas');

  const stats = useMemo(() => {
    const thisMonth   = new Date().toISOString().slice(0, 7);
    const monthly     = citas.filter(c => c.fecha?.startsWith(thisMonth));
    const completadas = monthly.filter(c => c.estado === 'Completada');
    const canceladas  = monthly.filter(c => c.estado === 'Cancelada');
    const ingresos    = completadas.reduce((s, c) => s + (c.precio || 0), 0);
    const ticket      = completadas.length ? ingresos / completadas.length : 0;

    /* Recurrentes: clientes con > 1 cita histórica */
    const clienteCounts = {};
    citas.forEach(c => {
      const k = c.clienteNombre || 'Anónimo';
      clienteCounts[k] = (clienteCounts[k] || 0) + 1;
    });
    const totalClients  = Object.keys(clienteCounts).length;
    const recurring     = Object.values(clienteCounts).filter(n => n > 1).length;
    const pctRecurr     = totalClients ? Math.round((recurring / totalClients) * 100) : 0;

    /* Ocupación: completadas / total agendadas del mes */
    const ocupacion = monthly.length ? Math.round((completadas.length / monthly.length) * 100) : 0;

    /* Top 10 clientes por nº de citas */
    const clienteMap = {};
    citas.forEach(c => {
      const k = c.clienteNombre || 'Anónimo';
      if (!clienteMap[k]) clienteMap[k] = { nombre: k, citas: 0, gasto: 0 };
      clienteMap[k].citas++;
      clienteMap[k].gasto += c.precio || 0;
    });
    const top10 = Object.values(clienteMap)
      .sort((a, b) => b.citas - a.citas)
      .slice(0, 10);

    /* Ranking barberos (citas completadas) */
    const barberoMap = {};
    completadas.forEach(c => {
      const k = c.barberoNombre || c.barberoId || 'N/A';
      if (!barberoMap[k]) barberoMap[k] = { nombre: k, citas: 0, ingresos: 0 };
      barberoMap[k].citas++;
      barberoMap[k].ingresos += c.precio || 0;
    });
    const barberRanking = Object.values(barberoMap)
      .sort((a, b) => b.ingresos - a.ingresos)
      .slice(0, 8);

    /* Horizontal bar data (first name only to keep labels short) */
    const ingresosBar = barberRanking.map(b => ({
      nombre:   b.nombre.split(' ')[0],
      ingresos: b.ingresos,
    }));

    return {
      total: monthly.length,
      completadas: completadas.length,
      canceladas:  canceladas.length,
      ingresos,
      ticket,
      pctRecurr,
      ocupacion,
      top10,
      barberRanking,
      ingresosBar,
    };
  }, [citas]);

  const rankColor = i => i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-amber-700' : 'text-slate-600';

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">Métricas</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {new Date().toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Novedades SynapTech */}
      <SynapTechNews />

      {/* KPIs — row 1 (servicios) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard Icon={DollarSign}    label="Ingresos Servicios" value={`$${stats.ingresos.toLocaleString('es-CL')}`} sub="Citas completadas"                                                  color="emerald" />
        <KpiCard Icon={CalendarCheck} label="Citas"              value={stats.completadas}                            sub={`${stats.total} agendadas`}                                       color="blue"    />
        <KpiCard Icon={TrendingUp}    label="Ticket prom."       value={`$${Math.round(stats.ticket).toLocaleString('es-CL')}`}  sub="Por servicio"                                         color="amber"   />
        <KpiCard Icon={XCircle}       label="Cancelaciones"      value={stats.canceladas}                             sub={stats.total ? `${Math.round((stats.canceladas/stats.total)*100)}% del total` : '—'} color="red" />
      </div>

      {/* KPIs — row 2 (nuevas) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard Icon={ShoppingBag} label="Ingresos Productos"   value={`$${MOCK_PRODUCTOS_MES.toLocaleString('es-CL')}`} sub="Ventas del mes"              color="purple" />
        <KpiCard Icon={RefreshCcw}  label="Clientes Recurrentes" value={`${stats.pctRecurr}%`}                            sub={`Del total de clientes`}     color="cyan"   />
        <KpiCard Icon={Activity}    label="Tasa de Ocupación"    value={`${stats.ocupacion}%`}                            sub="Citas completadas vs total"  color="rose"   />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Stacked bar: Servicios vs Productos — full width */}
        <ChartCard
          title="Ingresos Servicios vs Productos"
          subtitle="Últimos 6 meses · datos de productos son ilustrativos"
          fullWidth
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={MOCK_6M} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="mes" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<DarkTooltip fmt={fmtCLP} />} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
              <Bar dataKey="servicios" name="Servicios" stackId="a" fill="#10b981" />
              <Bar dataKey="productos"  name="Productos" stackId="a" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Horizontal bar: Ingresos por barbero */}
        <ChartCard title="Ingresos por Barbero" subtitle="Citas completadas este mes · de mayor a menor">
          {stats.ingresosBar.length === 0 ? (
            <div className="flex items-center justify-center h-40">
              <p className="text-xs text-slate-600 italic">Sin citas completadas este mes</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.min(280, Math.max(120, stats.ingresosBar.length * 40))}>
              <BarChart data={stats.ingresosBar} layout="vertical" barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="nombre" tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={false} tickLine={false} width={65} />
                <Tooltip content={<DarkTooltip fmt={fmtCLP} />} />
                <Bar dataKey="ingresos" name="Ingresos" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Donut: Tasa de retención */}
        <ChartCard title="Tasa de Retención" subtitle="Clientes que canjearon premios este mes · datos ilustrativos">
          <div className="flex items-center gap-8">
            <ResponsiveContainer width="45%" height={160}>
              <PieChart>
                <Pie data={MOCK_RETENCION} cx="50%" cy="50%"
                  innerRadius={45} outerRadius={68}
                  dataKey="value" paddingAngle={4} startAngle={90} endAngle={-270}>
                  <Cell fill="#10b981" />
                  <Cell fill="#1e293b" />
                </Pie>
                <Tooltip content={<DarkTooltip fmt={v => `${v}%`} />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                <div>
                  <p className="text-2xl font-bold text-white">38%</p>
                  <p className="text-xs text-slate-500">Canjearon premios</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 w-3 h-3 rounded-full bg-slate-700 shrink-0" />
                <div>
                  <p className="text-2xl font-bold text-white">62%</p>
                  <p className="text-xs text-slate-500">Sin canje aún</p>
                </div>
              </div>
            </div>
          </div>
        </ChartCard>

      </div>

      {/* Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Top 10 clientes */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Crown size={16} className="text-amber-400" />
            <p className="text-sm font-semibold text-white">Top 10 Clientes</p>
            <span className="text-xs text-slate-500 ml-auto">Histórico</span>
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
                    <p className="text-xs font-semibold text-white">{c.citas} {c.citas === 1 ? 'cita' : 'citas'}</p>
                    {c.gasto > 0 && <p className="text-[10px] text-slate-500">${c.gasto.toLocaleString('es-CL')}</p>}
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
                const pct    = Math.round((b.ingresos / maxIng) * 100);
                return (
                  <div key={i} className="px-3 py-2 rounded-lg hover:bg-slate-800/50 transition-colors space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold w-5 text-center shrink-0 ${rankColor(i)}`}>{i + 1}</span>
                      <p className="text-sm text-white flex-1 truncate">{b.nombre}</p>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-semibold text-white">{b.citas} citas</p>
                        <p className="text-[10px] text-slate-500">${b.ingresos.toLocaleString('es-CL')}</p>
                      </div>
                    </div>
                    <div className="ml-7 h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500/70 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
