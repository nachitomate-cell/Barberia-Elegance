import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import {
  Trophy, ScanLine, Crown, Medal, Sparkles, Gift,
  Users, TrendingUp, Clock, CheckCircle2,
} from 'lucide-react';
import { tenantCol } from '../lib/tenantUtils';
import { useTenant } from '../contexts/TenantContext';

import Premios     from './Premios';
import Canjes      from './Canjes';
import Rangos      from './Rangos';
import Membresias  from './Membresias';

/* ── Tabs disponibles según tenant ────────────────────────────────
   Todos los tenants tienen Resumen / Premios / Validar Canje / Rangos.
   Membresías solo aplica a los que corren módulo clásico de planes.
   Corte al Lápiz (Yügen) queda fuera: es cuenta corriente crediticia,
   no fidelidad clásica — sigue en su propia ruta /corte-al-lapiz. */
const HAS_MEMBRESIAS = new Set(['chameleon', 'deluxeperfumes']);

const TABS_BASE = [
  { key: 'resumen', label: 'Resumen',       Icon: Sparkles },
  { key: 'premios', label: 'Premios',       Icon: Trophy   },
  { key: 'canjes',  label: 'Validar Canje', Icon: ScanLine },
  { key: 'rangos',  label: 'Rangos',        Icon: Crown    },
];

function fmtCLP(v) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(v || 0);
}

/* ── Tab Resumen ─────────────────────────────────────────────────
   Snapshot del club: miembros con sellos activos, canjes del mes,
   premios más pedidos y últimos canjes validados. Suscribe a
   users/premios/redemptions vía tenantCol → funciona en todos los
   tenants (marca-level, elegance legacy, kronnos redirect). */
function ResumenFidelizacion() {
  const [users, setUsers]             = useState([]);
  const [premios, setPremios]         = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    let acks = 0;
    const done = () => { if (++acks >= 3) setLoading(false); };

    const unsubU = onSnapshot(tenantCol('users'), snap => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      done();
    }, () => done());

    const unsubP = onSnapshot(tenantCol('premios'), snap => {
      setPremios(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      done();
    }, () => done());

    // Solo canjes del mes actual — reduce lecturas y es lo único que se muestra.
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);
    const q = query(tenantCol('redemptions'), where('createdAt', '>=', Timestamp.fromDate(inicioMes)));
    const unsubR = onSnapshot(q, snap => {
      setRedemptions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      done();
    }, () => done());

    return () => { unsubU(); unsubP(); unsubR(); };
  }, []);

  const stats = useMemo(() => {
    const sellosDe = u => u.sellosDisponibles ?? u.stamps ?? 0;
    const costoDe  = p => p.costoSellos ?? p.sellosCosto ?? 0;

    const premiosActivos = premios.filter(p => p.activo !== false);
    const menorCosto     = premiosActivos.length
      ? Math.min(...premiosActivos.map(costoDe).filter(c => c > 0))
      : Infinity;

    const miembrosConSellos = users.filter(u => sellosDe(u) > 0).length;
    const proximosACanjear  = users.filter(u => {
      const s = sellosDe(u);
      return s > 0 && menorCosto !== Infinity && s >= menorCosto * 0.7 && s < menorCosto;
    }).length;

    const completados = redemptions.filter(r => r.status === 'completed');
    const pendientes  = redemptions.filter(r => r.status === 'pending');

    // Top premios canjeados este mes
    const byPremio = new Map();
    completados.forEach(r => {
      const key = r.premioId || r.premio || '—';
      byPremio.set(key, (byPremio.get(key) || 0) + 1);
    });
    const topPremios = [...byPremio.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([premioId, count]) => {
        const p = premios.find(x => x.id === premioId);
        return {
          id: premioId,
          nombre: p?.nombre || 'Premio eliminado',
          count,
          costo: p ? costoDe(p) : 0,
        };
      });

    // Últimos 5 canjes validados
    const ultimosCanjes = [...completados]
      .sort((a, b) => (b.completedAt?.seconds || b.createdAt?.seconds || 0) - (a.completedAt?.seconds || a.createdAt?.seconds || 0))
      .slice(0, 5)
      .map(r => ({
        id: r.id,
        premio: premios.find(p => p.id === r.premioId)?.nombre || r.premio || '—',
        cliente: r.clienteNombre || r.userName || '—',
        fecha: r.completedAt?.toDate() || r.createdAt?.toDate() || null,
      }));

    return {
      miembrosConSellos,
      proximosACanjear,
      canjesCompletados: completados.length,
      canjesPendientes:  pendientes.length,
      premiosActivos:    premiosActivos.length,
      topPremios,
      ultimosCanjes,
      menorCosto: menorCosto === Infinity ? null : menorCosto,
    };
  }, [users, premios, redemptions]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-4 h-24 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          Icon={Users}
          color="emerald"
          label="Miembros activos"
          value={stats.miembrosConSellos.toLocaleString('es-CL')}
          sub={`${stats.proximosACanjear} a un paso de canjear`}
        />
        <StatCard
          Icon={CheckCircle2}
          color="blue"
          label="Canjes este mes"
          value={stats.canjesCompletados.toLocaleString('es-CL')}
          sub={stats.canjesPendientes > 0 ? `${stats.canjesPendientes} pendientes` : 'Sin pendientes'}
        />
        <StatCard
          Icon={Trophy}
          color="amber"
          label="Premios activos"
          value={stats.premiosActivos.toLocaleString('es-CL')}
          sub={stats.menorCosto ? `Desde ${stats.menorCosto} sellos` : 'Configura tu primer premio'}
        />
        <StatCard
          Icon={TrendingUp}
          color="rose"
          label="Sellos disponibles"
          value={users.reduce((s, u) => s + (u.sellosDisponibles ?? u.stamps ?? 0), 0).toLocaleString('es-CL')}
          sub="Total en circulación"
        />
      </div>

      {/* Top 3 premios + Últimos canjes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top premios */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
            <Gift size={16} className="text-amber-400" />
            <h3 className="text-sm font-bold text-white">Premios más canjeados este mes</h3>
          </div>
          {stats.topPremios.length === 0 ? (
            <p className="text-sm text-slate-500 italic text-center py-6">Aún no hay canjes este mes.</p>
          ) : (
            <ul className="space-y-3">
              {stats.topPremios.map((p, i) => (
                <li key={p.id} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                    i === 0 ? 'bg-amber-500/15 text-amber-400' :
                    i === 1 ? 'bg-slate-700/50 text-slate-300' :
                              'bg-orange-900/30 text-orange-400'
                  }`}>
                    #{i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{p.nombre}</p>
                    <p className="text-xs text-slate-500">{p.costo || '—'} sellos</p>
                  </div>
                  <span className="text-sm font-bold text-amber-400 shrink-0">{p.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Últimos canjes */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
            <Clock size={16} className="text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Últimos canjes validados</h3>
          </div>
          {stats.ultimosCanjes.length === 0 ? (
            <p className="text-sm text-slate-500 italic text-center py-6">Aún no hay canjes validados.</p>
          ) : (
            <ul className="space-y-3">
              {stats.ultimosCanjes.map(c => (
                <li key={c.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{c.premio}</p>
                    <p className="text-xs text-slate-500 truncate">{c.cliente}</p>
                  </div>
                  <span className="text-xs text-slate-500 shrink-0">
                    {c.fecha ? c.fecha.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }) : '—'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

const COLOR_MAP = {
  emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  blue:    'bg-blue-500/10 text-blue-400 border-blue-500/20',
  amber:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
  rose:    'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

function StatCard({ Icon, label, value, sub, color = 'emerald' }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-start gap-3">
      <div className={`p-2.5 rounded-lg shrink-0 border ${COLOR_MAP[color] || COLOR_MAP.emerald}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">{label}</p>
        <p className="text-2xl font-bold text-white mt-0.5 tracking-tight break-words">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
}

/* ── Vista principal ─────────────────────────────────────────────── */
export default function Fidelizacion() {
  const tenant = useTenant();
  const [params, setParams] = useSearchParams();

  const tabs = useMemo(() => {
    const t = [...TABS_BASE];
    if (HAS_MEMBRESIAS.has(tenant.id)) {
      t.push({ key: 'membresias', label: 'Membresías', Icon: Medal });
    }
    return t;
  }, [tenant.id]);

  const tabParam  = params.get('tab') || 'resumen';
  const activeTab = tabs.some(t => t.key === tabParam) ? tabParam : 'resumen';

  function setActiveTab(key) {
    const next = new URLSearchParams(params);
    if (key === 'resumen') next.delete('tab');
    else                   next.set('tab', key);
    setParams(next, { replace: true });
  }

  return (
    <div data-view="fidelizacion" className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <header className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 shrink-0">
          <Trophy size={20} className="text-amber-400" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold text-white truncate">Fidelización</h1>
          <p className="text-xs text-slate-500 truncate">Club, premios, canjes y rangos — todo en un solo lugar</p>
        </div>
      </header>

      {/* Toolbar de tabs */}
      <div className="flex flex-wrap gap-1 border-b border-slate-800">
        {tabs.map(t => {
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-3 md:px-4 py-2.5 text-sm font-semibold transition-all border-b-2 -mb-px ${
                isActive
                  ? 'text-amber-400 border-amber-400'
                  : 'text-slate-500 border-transparent hover:text-slate-300'
              }`}
            >
              <t.Icon size={14} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Contenido */}
      <div>
        {activeTab === 'resumen'    && <ResumenFidelizacion />}
        {activeTab === 'premios'    && <Premios />}
        {activeTab === 'canjes'     && <Canjes />}
        {activeTab === 'rangos'     && <Rangos />}
        {activeTab === 'membresias' && HAS_MEMBRESIAS.has(tenant.id) && <Membresias />}
      </div>
    </div>
  );
}
