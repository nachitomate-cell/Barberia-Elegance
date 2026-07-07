import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import {
  Trophy, ScanLine, Crown, Medal, Sparkles, Gift,
  Users, TrendingUp, Clock, CheckCircle2, Gem,
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

// Umbrales de rango — espejo de Clientes.jsx:43. Si el tenant customizó
// los thresholds vía Rangos.jsx, el resultado será aproximado (puede
// leerse desde configuracion/rangos en una iteración futura).
function calcTier(historicos) {
  if (historicos >= 25) return 'PLATINUM';
  if (historicos >= 10) return 'GOLD';
  return 'SILVER';
}

const TIER_STYLE = {
  SILVER:   { label: 'Silver',   Icon: Medal, color: '#94a3b8', text: 'text-slate-300', bar: 'bg-slate-400' },
  GOLD:     { label: 'Gold',     Icon: Crown, color: '#eab308', text: 'text-yellow-400', bar: 'bg-yellow-500' },
  PLATINUM: { label: 'Platinum', Icon: Gem,   color: '#a855f7', text: 'text-purple-400', bar: 'bg-purple-500' },
};

// Selector de período — controla el rango de canjes que se cargan.
// Miembros/rangos/premios NO dependen del período (son estado actual).
const PERIODOS = [
  { key: '30d', label: 'Últimos 30 días',  dias: 30 },
  { key: '90d', label: 'Últimos 90 días',  dias: 90 },
  { key: 'mes', label: 'Este mes',         dias: 'mes' },
  { key: 'ano', label: 'Este año',         dias: 'ano' },
];

function inicioPeriodo(key) {
  const now = new Date();
  if (key === 'mes') {
    const d = new Date(now); d.setDate(1); d.setHours(0, 0, 0, 0); return d;
  }
  if (key === 'ano') {
    const d = new Date(now); d.setMonth(0, 1); d.setHours(0, 0, 0, 0); return d;
  }
  const preset = PERIODOS.find(p => p.key === key);
  const dias = preset?.dias ?? 30;
  const d = new Date(now.getTime() - dias * 864e5);
  d.setHours(0, 0, 0, 0);
  return d;
}

/* ── Tab Resumen ─────────────────────────────────────────────────
   Snapshot del club con período configurable. Suscribe a
   users/premios/redemptions vía tenantCol → funciona en todos los
   tenants (marca-level, elegance legacy, kronnos redirect). */
function ResumenFidelizacion() {
  const [periodo, setPeriodo]         = useState('30d');
  const [users, setUsers]             = useState([]);
  const [premios, setPremios]         = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [loading, setLoading]         = useState(true);

  // users y premios son estado actual — se cargan una sola vez.
  useEffect(() => {
    let acks = 0;
    const done = () => { if (++acks >= 2) setLoading(false); };

    const unsubU = onSnapshot(tenantCol('users'), snap => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      done();
    }, () => done());

    const unsubP = onSnapshot(tenantCol('premios'), snap => {
      setPremios(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      done();
    }, () => done());

    return () => { unsubU(); unsubP(); };
  }, []);

  // redemptions se re-suscribe cuando cambia el período.
  useEffect(() => {
    const desde = inicioPeriodo(periodo);
    const q = query(tenantCol('redemptions'), where('createdAt', '>=', Timestamp.fromDate(desde)));
    const unsubR = onSnapshot(q, snap => {
      setRedemptions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => {});
    return () => unsubR();
  }, [periodo]);

  const stats = useMemo(() => {
    const sellosDe    = u => u.sellosDisponibles ?? u.stamps ?? 0;
    const historicoDe = u => u.sellosHistoricos  ?? u.stamps ?? 0;
    const costoDe     = p => p.costoSellos ?? p.sellosCosto ?? 0;
    // Espejo de Clientes.jsx:1585 — clientes migrados/importados por staff
    // tienen uid === docId (teléfono). Los "registrados en el club" son los
    // que crearon su cuenta de auth propia.
    const isLegacy = u => !!u?.uid && u.uid === u.id;

    const premiosActivos = premios.filter(p => p.activo !== false);
    const menorCosto     = premiosActivos.length
      ? Math.min(...premiosActivos.map(costoDe).filter(c => c > 0))
      : Infinity;

    // Miembros del club = registrados en la app (matches Clientes → tab "Registrados Club").
    const registrados      = users.filter(u => !isLegacy(u));
    const miembrosDelClub  = registrados.length;
    const conSellosActivos = registrados.filter(u => sellosDe(u) > 0).length;
    const proximosACanjear = registrados.filter(u => {
      const s = sellosDe(u);
      return s > 0 && menorCosto !== Infinity && s >= menorCosto * 0.7 && s < menorCosto;
    }).length;

    // Distribución por rango — solo sobre registrados con al menos 1 sello histórico.
    const distribucion = { SILVER: 0, GOLD: 0, PLATINUM: 0 };
    let baseRangos = 0;
    for (const u of registrados) {
      const h = historicoDe(u);
      if (h <= 0) continue;
      distribucion[calcTier(h)] += 1;
      baseRangos += 1;
    }

    const completados = redemptions.filter(r => r.status === 'completed');
    const pendientes  = redemptions.filter(r => r.status === 'pending');

    // Top premios canjeados en el período
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

    const sellosEnCirculacion = registrados.reduce((s, u) => s + sellosDe(u), 0);

    return {
      miembrosDelClub,
      conSellosActivos,
      proximosACanjear,
      sellosEnCirculacion,
      canjesCompletados: completados.length,
      canjesPendientes:  pendientes.length,
      premiosActivos:    premiosActivos.length,
      topPremios,
      ultimosCanjes,
      distribucion,
      baseRangos,
      menorCosto: menorCosto === Infinity ? null : menorCosto,
    };
  }, [users, premios, redemptions]);

  const periodoLabel = PERIODOS.find(p => p.key === periodo)?.label || '';

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-4 h-24 animate-pulse" />
          ))}
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 h-40 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selector de período — solo afecta a los canjes */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {PERIODOS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriodo(p.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                periodo === p.key
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/40'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-slate-500">
          Los canjes se filtran por período — miembros y rangos son estado actual.
        </p>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          Icon={Users}
          color="emerald"
          label="Miembros del club"
          value={stats.miembrosDelClub.toLocaleString('es-CL')}
          sub={`${stats.conSellosActivos} con sellos · ${stats.proximosACanjear} a un paso`}
        />
        <StatCard
          Icon={CheckCircle2}
          color="blue"
          label={`Canjes · ${periodoLabel.toLowerCase()}`}
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
          value={stats.sellosEnCirculacion.toLocaleString('es-CL')}
          sub="Total en circulación"
        />
      </div>

      {/* Distribución del club por rango */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
          <Crown size={16} className="text-purple-400" />
          <h3 className="text-sm font-bold text-white">Distribución del club por rango</h3>
          <span className="ml-auto text-xs text-slate-500">
            {stats.baseRangos} miembros con historial
          </span>
        </div>
        {stats.baseRangos === 0 ? (
          <p className="text-sm text-slate-500 italic text-center py-6">
            Aún no hay miembros con sellos históricos.
          </p>
        ) : (
          <>
            {/* Barra apilada */}
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden flex mb-4">
              {(['SILVER', 'GOLD', 'PLATINUM']).map(t => {
                const pct = stats.baseRangos ? (stats.distribucion[t] / stats.baseRangos) * 100 : 0;
                if (pct <= 0) return null;
                return (
                  <div
                    key={t}
                    className={`h-full ${TIER_STYLE[t].bar} transition-all`}
                    style={{ width: `${pct}%` }}
                    title={`${TIER_STYLE[t].label}: ${stats.distribucion[t]} (${pct.toFixed(1)}%)`}
                  />
                );
              })}
            </div>

            {/* Detalle por rango */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(['SILVER', 'GOLD', 'PLATINUM']).map(t => {
                const style = TIER_STYLE[t];
                const count = stats.distribucion[t];
                const pct   = stats.baseRangos ? (count / stats.baseRangos) * 100 : 0;
                return (
                  <div key={t} className="flex items-center gap-3 p-3 rounded-lg border border-slate-800 bg-slate-950/40">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0`} style={{ backgroundColor: `${style.color}20`, border: `1px solid ${style.color}40` }}>
                      <style.Icon size={16} style={{ color: style.color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-bold uppercase tracking-wider ${style.text}`}>{style.label}</p>
                      <p className="text-lg font-bold text-white leading-tight">{count.toLocaleString('es-CL')}</p>
                      <p className="text-[11px] text-slate-500">{pct.toFixed(1)}% del club</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Top 3 premios + Últimos canjes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top premios */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
            <Gift size={16} className="text-amber-400" />
            <h3 className="text-sm font-bold text-white">Premios más canjeados</h3>
            <span className="ml-auto text-xs text-slate-500 truncate">{periodoLabel.toLowerCase()}</span>
          </div>
          {stats.topPremios.length === 0 ? (
            <p className="text-sm text-slate-500 italic text-center py-6">Aún no hay canjes en el período.</p>
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
