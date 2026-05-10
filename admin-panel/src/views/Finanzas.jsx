// Finanzas.jsx — MRR y métricas de suscripciones del tenant.
// Ruta: /gestion-interna/finanzas

import { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, Users, CreditCard, BarChart2, RefreshCcw,
  Crown, ShieldCheck, Star, AlertCircle,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { query, where, onSnapshot } from 'firebase/firestore';
import { tenantCol }   from '../lib/tenantUtils';
import { PLANES, formatPrecio } from '../lib/plans';
import {
  activarSuscripcion, cancelarSuscripcion,
} from '../lib/subscriptionUtils';

/* ── Colores por plan ─────────────────────────────────────────── */
const PLAN_COLORS = {
  silver: '#9ca3af',
  gold:   '#D4AF37',
  black:  '#a78bfa',
};

/* ── KPI card ─────────────────────────────────────────────────── */
function KpiCard({ Icon, label, value, sub, color = 'gold', trend }) {
  const colorMap = {
    gold:    'bg-amber-500/10 text-amber-400 border-amber-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    red:     'bg-red-500/10 text-red-400 border-red-500/20',
    purple:  'bg-purple-500/10 text-purple-400 border-purple-500/20',
  };
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${colorMap[color]}`}>
          <Icon size={18} />
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            trend >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
          }`}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div className="text-2xl font-black text-white tracking-tight">{value}</div>
      <div className="text-xs font-semibold text-slate-500 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-slate-600 mt-1">{sub}</div>}
    </div>
  );
}

/* ── Tooltip personalizado para recharts ─────────────────────── */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 shadow-xl">
      <p className="text-slate-400 text-xs mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-white text-sm font-bold" style={{ color: p.color }}>
          {formatPrecio(p.value)}
        </p>
      ))}
    </div>
  );
}

/* ── Función para construir serie temporal de MRR ────────────── */
function buildMrrSeries(users) {
  // Agrupa suscripciones activas por mes de inicio para construir
  // la curva de adopción acumulada desde el primer suscriptor.
  const now   = new Date();
  const meses = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    meses.push({
      label: d.toLocaleDateString('es-CL', { month: 'short', year: '2-digit' }),
      ts:    d.getTime(),
    });
  }

  return meses.map(({ label, ts }) => {
    const finMes = new Date(ts);
    finMes.setMonth(finMes.getMonth() + 1);

    const mrrMes = users.reduce((sum, u) => {
      const sub   = u.subscription;
      if (!sub || sub.status !== 'active') return sum;
      const inicio = sub.startedAt?.toDate?.()?.getTime() ?? Infinity;
      const vence  = sub.currentPeriodEnd?.toDate?.()?.getTime() ?? 0;
      // El sub existía este mes si empezó antes del fin del mes y no venció antes de inicio del mes
      if (inicio <= finMes.getTime() && vence >= ts) {
        return sum + (sub.mrr ?? PLANES[sub.planId]?.precio ?? 0);
      }
      return sum;
    }, 0);

    return { mes: label, mrr: mrrMes };
  });
}

/* ── Fila de suscriptor (para listado) ───────────────────────── */
function SubscriberRow({ user, tenantId, onCancel }) {
  const sub  = user.subscription;
  const plan = PLANES[sub?.planId];
  const vence = sub?.currentPeriodEnd?.toDate?.();
  const diasRestantes = vence ? Math.max(0, Math.ceil((vence - new Date()) / 86_400_000)) : 0;

  if (!plan) return null;
  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-800 last:border-0">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0"
        style={{ background: `${PLAN_COLORS[plan.id]}20`, color: PLAN_COLORS[plan.id], border: `1px solid ${PLAN_COLORS[plan.id]}40` }}
      >
        {(user.nombre || user.email || '?')[0]?.toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-semibold truncate">{user.nombre || user.email || user.uid}</p>
        <p className="text-slate-500 text-xs">{plan.nombre} · {diasRestantes}d restantes</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-bold" style={{ color: PLAN_COLORS[plan.id] }}>
          {formatPrecio(plan.precio)}
        </p>
        <button
          onClick={() => onCancel(user.uid)}
          className="text-[10px] text-red-500 hover:text-red-400 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

/* ── Vista de gestión de suscripciones ──────────────────────── */
function GestionPanel({ users, tenantId, onActivar }) {
  // Usuarios sin suscripción activa
  const sinSub = users.filter(u =>
    !u.subscription || u.subscription.status !== 'active' ||
    (u.subscription.currentPeriodEnd?.toDate?.() ?? new Date(0)) < new Date(),
  );

  return (
    <div className="space-y-3">
      {sinSub.length === 0 && (
        <p className="text-slate-500 text-sm text-center py-4">
          Todos los clientes registrados tienen suscripción activa.
        </p>
      )}
      {sinSub.map(u => (
        <div key={u.uid} className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3">
          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400 shrink-0">
            {(u.nombre || u.email || '?')[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold truncate">{u.nombre || u.email}</p>
            <p className="text-slate-500 text-xs">{u.telefono || 'Sin teléfono'}</p>
          </div>
          <div className="flex gap-2">
            {Object.values(PLANES).map(plan => (
              <button
                key={plan.id}
                onClick={() => onActivar(u.uid, plan)}
                className="text-[10px] font-bold px-2 py-1 rounded-lg border transition-all hover:opacity-80"
                style={{
                  borderColor: `${PLAN_COLORS[plan.id]}60`,
                  color: PLAN_COLORS[plan.id],
                  background: `${PLAN_COLORS[plan.id]}10`,
                }}
              >
                {plan.nombre}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Componente principal ─────────────────────────────────────── */
export default function Finanzas() {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState('dashboard'); // 'dashboard' | 'clientes'

  // Suscribirse a todos los users del tenant en tiempo real
  useEffect(() => {
    const unsub = onSnapshot(tenantCol('users'), snap => {
      setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);

  // ── Métricas computadas ───────────────────────────────────────
  const activos = useMemo(() =>
    users.filter(u =>
      u.subscription?.status === 'active' &&
      (u.subscription.currentPeriodEnd?.toDate?.() ?? new Date(0)) > new Date(),
    ), [users]);

  const cancelados = useMemo(() =>
    users.filter(u => u.subscription?.status === 'canceled'),
  [users]);

  const mrr = useMemo(() =>
    activos.reduce((sum, u) => sum + (u.subscription?.mrr ?? PLANES[u.subscription?.planId]?.precio ?? 0), 0),
  [activos]);

  const arpu = activos.length ? Math.round(mrr / activos.length) : 0;

  const porPlan = useMemo(() => {
    const counts = { silver: 0, gold: 0, black: 0 };
    activos.forEach(u => { counts[u.subscription?.planId]  = (counts[u.subscription?.planId] ?? 0) + 1; });
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([id, value]) => ({ name: PLANES[id]?.nombre ?? id, value, color: PLAN_COLORS[id] }));
  }, [activos]);

  const mrrSeries = useMemo(() => buildMrrSeries(users), [users]);

  const handleActivar = async (uid, plan) => {
    const tenantId = tenantCol('users').path.includes('tenants/')
      ? tenantCol('users').path.split('/')[1]
      : 'elegance';
    await activarSuscripcion(tenantId, uid, plan);
  };

  const handleCancelar = async (uid) => {
    if (!confirm('¿Cancelar esta suscripción?')) return;
    const tenantId = tenantCol('users').path.includes('tenants/')
      ? tenantCol('users').path.split('/')[1]
      : 'elegance';
    await cancelarSuscripcion(tenantId, uid);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white">Finanzas · MRR</h1>
          <p className="text-slate-500 text-sm mt-0.5">Ingresos Recurrentes Mensuales</p>
        </div>
        <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1">
          {[['dashboard', 'Métricas'], ['clientes', 'Gestión']].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setTab(v)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                tab === v ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-white'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {tab === 'dashboard' && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              Icon={TrendingUp}
              label="MRR Total"
              value={formatPrecio(mrr)}
              sub={`${activos.length} suscriptores activos`}
              color="gold"
            />
            <KpiCard
              Icon={Users}
              label="Suscriptores Activos"
              value={activos.length}
              color="emerald"
            />
            <KpiCard
              Icon={CreditCard}
              label="ARPU"
              value={formatPrecio(arpu)}
              sub="Ingreso promedio por usuario"
              color="purple"
            />
            <KpiCard
              Icon={AlertCircle}
              label="Cancelados"
              value={cancelados.length}
              color="red"
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Evolución MRR */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-5">
                <BarChart2 size={16} className="text-amber-400" />
                <h3 className="text-sm font-bold text-white">Evolución del MRR</h3>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={mrrSeries} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#D4AF37" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="mes" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={false} tickLine={false}
                    width={48}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="mrr"
                    stroke="#D4AF37"
                    strokeWidth={2}
                    fill="url(#mrrGrad)"
                    dot={{ fill: '#D4AF37', r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: '#D4AF37' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Distribución por plan */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-5">
                <Crown size={16} className="text-amber-400" />
                <h3 className="text-sm font-bold text-white">Por Plan</h3>
              </div>
              {porPlan.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-slate-600">
                  <Star size={28} className="mb-2 opacity-30" />
                  <p className="text-sm">Sin suscriptores aún</p>
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={130}>
                    <PieChart>
                      <Pie data={porPlan} cx="50%" cy="50%" innerRadius={35} outerRadius={55}
                        paddingAngle={4} dataKey="value">
                        {porPlan.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {porPlan.map((p, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                          <span className="text-xs text-slate-400">{p.name}</span>
                        </div>
                        <span className="text-xs font-bold text-white">{p.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Lista de suscriptores activos */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck size={16} className="text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Suscriptores Activos</h3>
              <span className="ml-auto text-xs text-slate-500">{activos.length} total</span>
            </div>
            {activos.length === 0 ? (
              <p className="text-slate-600 text-sm text-center py-6">
                Ningún suscriptor activo todavía.
              </p>
            ) : (
              activos.map(u => (
                <SubscriberRow
                  key={u.uid}
                  user={u}
                  onCancel={handleCancelar}
                />
              ))
            )}
          </div>
        </>
      )}

      {tab === 'clientes' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <RefreshCcw size={16} className="text-slate-400" />
            <h3 className="text-sm font-bold text-white">Activar suscripción</h3>
            <span className="ml-auto text-xs text-slate-500">
              {users.filter(u => !u.subscription?.status || u.subscription?.status !== 'active').length} sin plan
            </span>
          </div>
          <GestionPanel users={users} onActivar={handleActivar} />
        </div>
      )}
    </div>
  );
}
