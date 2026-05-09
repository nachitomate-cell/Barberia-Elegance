import { useMemo } from 'react';
import { TrendingUp, CalendarCheck, XCircle, DollarSign } from 'lucide-react';
import { where } from 'firebase/firestore';
import { useCollection } from '../hooks/useCollection';
import ChartPlaceholder  from '../components/ui/ChartPlaceholder';

function KpiCard({ Icon, label, value, sub, color = 'emerald' }) {
  const colors = {
    emerald: 'bg-emerald-500/10 text-emerald-400',
    blue:    'bg-blue-500/10    text-blue-400',
    red:     'bg-red-500/10     text-red-400',
    amber:   'bg-amber-500/10   text-amber-400',
  };
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-start gap-4">
      <div className={`p-2.5 rounded-lg ${colors[color]}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-white mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function Metricas() {
  const { data: citas } = useCollection('citas');

  const stats = useMemo(() => {
    const thisMonth = new Date().toISOString().slice(0, 7);
    const monthly   = citas.filter(c => c.fecha?.startsWith(thisMonth));
    const completadas = monthly.filter(c => c.estado === 'Completada');
    const canceladas  = monthly.filter(c => c.estado === 'Cancelada');
    const ingresos    = completadas.reduce((s, c) => s + (c.precio || 0), 0);
    const ticket      = completadas.length ? ingresos / completadas.length : 0;

    return {
      total:      monthly.length,
      completadas: completadas.length,
      canceladas:  canceladas.length,
      ingresos,
      ticket,
    };
  }, [citas]);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Métricas</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {new Date().toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          Icon={DollarSign}
          label="Ingresos"
          value={`$${stats.ingresos.toLocaleString('es-CL')}`}
          sub="Citas completadas"
          color="emerald"
        />
        <KpiCard
          Icon={CalendarCheck}
          label="Citas"
          value={stats.completadas}
          sub={`${stats.total} agendadas`}
          color="blue"
        />
        <KpiCard
          Icon={TrendingUp}
          label="Ticket prom."
          value={`$${Math.round(stats.ticket).toLocaleString('es-CL')}`}
          sub="Por servicio"
          color="amber"
        />
        <KpiCard
          Icon={XCircle}
          label="Cancelaciones"
          value={stats.canceladas}
          sub={stats.total ? `${Math.round((stats.canceladas / stats.total) * 100)}% del total` : '—'}
          color="red"
        />
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartPlaceholder
          title="Ingresos mensuales"
          subtitle="Últimos 6 meses · LineChart (Recharts)"
        />
        <ChartPlaceholder
          title="Horas pico"
          subtitle="Distribución de citas por hora · BarChart (Recharts)"
        />
        <ChartPlaceholder
          title="Servicios más vendidos"
          subtitle="Top 5 servicios del mes · PieChart (Recharts)"
        />
        <ChartPlaceholder
          title="Rendimiento por barbero"
          subtitle="Citas completadas por profesional · BarChart (Recharts)"
        />
      </div>
    </div>
  );
}
