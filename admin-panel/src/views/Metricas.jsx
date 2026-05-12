import { useState, useMemo } from 'react';
import { where } from 'firebase/firestore';
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

      <SynapTechNews />

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

      </div>

      {/* Rankings */}
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
