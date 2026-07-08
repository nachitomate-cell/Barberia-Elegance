import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import {
  Trophy, ScanLine, Crown, Medal, Sparkles, Gift,
  Users, TrendingUp, Clock, CheckCircle2, Gem, UserX,
  Send, X, MessageCircle, ChevronRight, ArrowUpRight, ArrowDownRight, Plus,
  Smartphone, ExternalLink, RefreshCw, Share2,
} from 'lucide-react';
import { tenantCol } from '../lib/tenantUtils';
import { useTenant } from '../contexts/TenantContext';

import Premios       from './Premios';
import Canjes        from './Canjes';
import Rangos        from './Rangos';
import Membresias    from './Membresias';
import ReferidosBoca from './ReferidosBoca';

/* ── Tabs disponibles según tenant ────────────────────────────────
   Todos los tenants tienen Resumen / Premios / Validar Canje / Rangos.
   Membresías solo aplica a los que corren módulo clásico de planes.
   Corte al Lápiz (Yügen) queda fuera: es cuenta corriente crediticia,
   no fidelidad clásica — sigue en su propia ruta /corte-al-lapiz. */
const HAS_MEMBRESIAS = new Set(['chameleon', 'deluxeperfumes']);

const TABS_BASE = [
  { key: 'resumen',     label: 'Resumen',       Icon: Sparkles   },
  { key: 'premios',     label: 'Premios',       Icon: Trophy     },
  { key: 'canjes',      label: 'Validar Canje', Icon: ScanLine   },
  { key: 'rangos',      label: 'Rangos',        Icon: Crown      },
  { key: 'boca-a-boca', label: 'Boca a boca',   Icon: Share2     },
  { key: 'preview',     label: 'Vista previa',  Icon: Smartphone },
];

// Escenarios que puede seleccionar el admin en el tab "Vista previa".
// Cada key mapea a un scenario del dashboard.html (?preview=1&scenario=<key>).
const PREVIEW_SCENARIOS = [
  { key: 'nuevo',        label: 'Cliente nuevo',        desc: '0 sellos · recién registrado'      },
  { key: 'con_sellos',   label: 'Con sellos activos',   desc: '5 sellos · historial con visitas'  },
  { key: 'cerca_premio', label: 'A un paso del premio', desc: '8 sellos · casi canjea el próximo' },
  { key: 'platinum',     label: 'Miembro Platinum',     desc: '28 históricos · rango top'         },
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

// ── WhatsApp broadcast ───────────────────────────────────────────
// Reutiliza el patrón "Click & Enter" de Clientes.jsx:1005: abre el
// protocolo nativo whatsapp:// (app instalada), y si a 1.5s el tab sigue
// visible, cae a web.whatsapp.com en un target estático para no ensuciar
// la barra de tareas con pestañas nuevas.
function normalizePhoneCL(raw) {
  const clean = String(raw ?? '').replace(/\D/g, '');
  if (!clean || clean.length < 8) return null;
  return clean.startsWith('56') ? clean : `56${clean}`;
}

function openWhatsAppNative(phone, text) {
  const encoded = encodeURIComponent(text);
  const native  = `whatsapp://send?phone=${phone}&text=${encoded}`;
  const web     = `https://web.whatsapp.com/send?phone=${phone}&text=${encoded}`;
  try {
    window.location.href = native;
  } catch (_) {
    window.open(web, 'whatsapp_tab', 'noopener,noreferrer');
    return;
  }
  setTimeout(() => {
    if (!document.hidden) {
      window.open(web, 'whatsapp_tab', 'noopener,noreferrer');
    }
  }, 1500);
}

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
  const tenant = useTenant();
  const [periodo, setPeriodo]         = useState('30d');
  const [users, setUsers]             = useState([]);
  const [premios, setPremios]         = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [redemptions6m, setRedemptions6m] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [broadcast, setBroadcast]     = useState(null); // { type, clients }
  const [showAllCanjes, setShowAllCanjes] = useState(false);

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

  // ── Redemptions 6 meses (para la tendencia) ─────────────────────
  // Fetch one-shot con cache en localStorage (15 min TTL), independiente del
  // filtro de período. Mismo patrón que Metricas.jsx trend6m.
  useEffect(() => {
    if (!tenant?.id) return;
    const cacheKey = `fideli:trend6m:${tenant.id}`;
    const TTL_MS   = 15 * 60 * 1000;

    // Hidratar desde cache si existe y no expiró.
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.updatedAt && (Date.now() - parsed.updatedAt) < TTL_MS) {
          setRedemptions6m(parsed.data || []);
          return;
        }
      }
    } catch (_) {}

    // Fetch 6 meses vía onSnapshot one-shot.
    const hace6m = new Date();
    hace6m.setMonth(hace6m.getMonth() - 5);
    hace6m.setDate(1);
    hace6m.setHours(0, 0, 0, 0);

    const q = query(tenantCol('redemptions'), where('createdAt', '>=', Timestamp.fromDate(hace6m)));
    const unsub = onSnapshot(q, snap => {
      const data = snap.docs.map(d => {
        const r = d.data();
        // Serializable para localStorage — solo lo que necesitamos.
        return {
          id:       d.id,
          status:   r.status,
          ms:       r.completedAt?.toMillis?.() || r.createdAt?.toMillis?.() || 0,
        };
      });
      setRedemptions6m(data);
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ data, updatedAt: Date.now() }));
      } catch (_) {}
      unsub();
    }, () => { unsub(); });
    return () => unsub();
  }, [tenant?.id]);

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

    // Listas de contactos accionables — se usan tanto para KPIs como para
    // los CTAs de broadcast (mismo criterio en KPI y modal).
    const proximosACanjearList = registrados.filter(u => {
      const s = sellosDe(u);
      return s > 0 && menorCosto !== Infinity && s >= menorCosto * 0.7 && s < menorCosto;
    });

    // "Sin visita 30d" = miembros que tuvieron actividad (tienen ultimoSello)
    // pero no han vuelto en 30d. NO cuenta a los que nunca ganaron un sello
    // — esos nunca "se fueron", no están churneando.
    const ahora   = Date.now();
    const cutoff  = ahora - 30 * 864e5;
    const sinVisita30dList = registrados.filter(u => {
      if (!u.ultimoSello) return false;
      const t = new Date(u.ultimoSello).getTime();
      return isFinite(t) && t < cutoff;
    }).map(u => ({
      ...u,
      diasSinVisita: Math.floor((ahora - new Date(u.ultimoSello).getTime()) / 864e5),
    }));

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

    // ── Tendencia 6 meses ─────────────────────────────────────────
    // Genera buckets por mes calendario. Cada bucket cuenta:
    //  · canjes completados que cayeron en ese mes (redemptions6m)
    //  · miembros nuevos (users con creadoEn/fechaRegistro en ese mes)
    const buckets = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        label: d.toLocaleDateString('es-CL', { month: 'short' }),
        canjes: 0,
        miembros: 0,
      });
    }
    const bucketFor = (ms) => {
      if (!ms) return -1;
      const d = new Date(ms);
      return buckets.findIndex(b => b.year === d.getFullYear() && b.month === d.getMonth());
    };

    for (const r of redemptions6m) {
      if (r.status !== 'completed') continue;
      const idx = bucketFor(r.ms);
      if (idx >= 0) buckets[idx].canjes += 1;
    }
    for (const u of registrados) {
      const ms = u.creadoEn?.toMillis?.() || u.fechaRegistro?.toMillis?.() ||
                 (typeof u.creadoEn === 'string' ? new Date(u.creadoEn).getTime() : null) ||
                 (typeof u.fechaRegistro === 'string' ? new Date(u.fechaRegistro).getTime() : null);
      if (!ms) continue;
      const idx = bucketFor(ms);
      if (idx >= 0) buckets[idx].miembros += 1;
    }

    // Delta vs mes anterior (últimos 2 buckets)
    const last = buckets[buckets.length - 1] || { canjes: 0, miembros: 0 };
    const prev = buckets[buckets.length - 2] || { canjes: 0, miembros: 0 };
    const deltaPct = (a, b) => (b === 0 ? (a > 0 ? 100 : 0) : ((a - b) / b) * 100);

    const trend = {
      buckets,
      canjes: {
        actual: last.canjes,
        deltaPct: deltaPct(last.canjes, prev.canjes),
        series: buckets.map(b => b.canjes),
      },
      miembros: {
        actual: last.miembros,
        deltaPct: deltaPct(last.miembros, prev.miembros),
        series: buckets.map(b => b.miembros),
      },
    };

    // Lista completa de canjes ordenados para el modal "Ver todos"
    const todosLosCanjes = [...completados]
      .sort((a, b) => (b.completedAt?.seconds || b.createdAt?.seconds || 0) - (a.completedAt?.seconds || a.createdAt?.seconds || 0))
      .map(r => ({
        id: r.id,
        premio: premios.find(p => p.id === r.premioId)?.nombre || r.premio || '—',
        cliente: r.clienteNombre || r.userName || '—',
        fecha: r.completedAt?.toDate() || r.createdAt?.toDate() || null,
      }));

    return {
      miembrosDelClub,
      conSellosActivos,
      proximosACanjear: proximosACanjearList.length,
      proximosACanjearList,
      sinVisita30d:     sinVisita30dList.length,
      sinVisita30dList,
      sellosEnCirculacion,
      canjesCompletados: completados.length,
      canjesPendientes:  pendientes.length,
      premiosActivos:    premiosActivos.length,
      topPremios,
      ultimosCanjes,
      distribucion,
      baseRangos,
      trend,
      todosLosCanjes,
      menorCosto: menorCosto === Infinity ? null : menorCosto,
    };
  }, [users, premios, redemptions, redemptions6m]);

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
          action={stats.proximosACanjear > 0 ? {
            label: `Enviar a los ${stats.proximosACanjear} próximos`,
            onClick: () => setBroadcast({ type: 'proximos', clients: stats.proximosACanjearList }),
          } : null}
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
          Icon={UserX}
          color="rose"
          label="Sin visita 30d"
          value={stats.sinVisita30d.toLocaleString('es-CL')}
          sub={
            stats.miembrosDelClub
              ? `${((stats.sinVisita30d / stats.miembrosDelClub) * 100).toFixed(0)}% del club en riesgo`
              : 'Sin miembros aún'
          }
          action={stats.sinVisita30d > 0 ? {
            label: `Recuperar a los ${stats.sinVisita30d}`,
            onClick: () => setBroadcast({ type: 'churn', clients: stats.sinVisita30dList }),
          } : null}
        />
      </div>

      {/* Tendencia 6 meses — canjes y miembros nuevos con delta vs mes anterior */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TrendCard
          Icon={CheckCircle2}
          color="blue"
          label="Canjes por mes"
          data={stats.trend.canjes}
          buckets={stats.trend.buckets}
        />
        <TrendCard
          Icon={Users}
          color="emerald"
          label="Miembros nuevos por mes"
          data={stats.trend.miembros}
          buckets={stats.trend.buckets}
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
            {stats.todosLosCanjes.length > 5 && (
              <button
                onClick={() => setShowAllCanjes(true)}
                className="ml-auto text-xs text-slate-500 hover:text-emerald-400 transition-colors flex items-center gap-1"
              >
                Ver todos ({stats.todosLosCanjes.length}) <ChevronRight size={12} />
              </button>
            )}
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

      {/* Modal de broadcast WhatsApp */}
      <BroadcastModal
        open={!!broadcast}
        onClose={() => setBroadcast(null)}
        type={broadcast?.type}
        clients={broadcast?.clients || []}
        tenant={tenant}
        menorCosto={stats.menorCosto}
      />

      {/* Modal: todos los canjes del período */}
      <AllCanjesModal
        open={showAllCanjes}
        onClose={() => setShowAllCanjes(false)}
        canjes={stats.todosLosCanjes}
        periodoLabel={periodoLabel}
      />
    </div>
  );
}

const COLOR_MAP = {
  emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  blue:    'bg-blue-500/10 text-blue-400 border-blue-500/20',
  amber:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
  rose:    'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

function StatCard({ Icon, label, value, sub, color = 'emerald', action = null }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className={`p-2.5 rounded-lg shrink-0 border ${COLOR_MAP[color] || COLOR_MAP.emerald}`}>
          <Icon size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">{label}</p>
          <p className="text-2xl font-bold text-white mt-0.5 tracking-tight break-words">{value}</p>
          {sub && <p className="text-xs text-slate-500 mt-0.5 truncate">{sub}</p>}
        </div>
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/25 transition-colors"
        >
          <MessageCircle size={12} />
          <span className="truncate">{action.label}</span>
          <ChevronRight size={12} className="shrink-0 opacity-70" />
        </button>
      )}
    </div>
  );
}

/* ── TrendCard + Sparkline ────────────────────────────────────────
   Mini gráfico de líneas de 6 puntos + delta vs mes anterior.
   SVG inline puro para evitar dependencia adicional. */
function Sparkline({ series, color = '#10b981' }) {
  const w = 100, h = 32, pad = 2;
  const max = Math.max(1, ...series);
  const step = series.length > 1 ? (w - pad * 2) / (series.length - 1) : 0;
  const points = series.map((v, i) => {
    const x = pad + i * step;
    const y = h - pad - ((v / max) * (h - pad * 2));
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const areaPoints = series.length
    ? `${pad},${h - pad} ${points} ${w - pad},${h - pad}`
    : '';
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-8" preserveAspectRatio="none" aria-hidden>
      <polygon points={areaPoints} fill={color} fillOpacity="0.12" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

const TREND_COLOR = { emerald: '#10b981', blue: '#3b82f6', amber: '#f59e0b', rose: '#f43f5e' };

function TrendCard({ Icon, label, color = 'blue', data, buckets }) {
  const delta = data.deltaPct;
  const positive = delta >= 0;
  const deltaTxt = isFinite(delta)
    ? `${positive ? '+' : ''}${delta.toFixed(0)}%`
    : '—';
  const strokeColor = TREND_COLOR[color] || TREND_COLOR.blue;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`p-1.5 rounded-lg border ${COLOR_MAP[color] || COLOR_MAP.blue}`}>
            <Icon size={14} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">{label}</p>
            <p className="text-lg font-bold text-white leading-tight">{data.actual}</p>
          </div>
        </div>
        <div className={`flex items-center gap-0.5 text-xs font-semibold shrink-0 px-1.5 py-0.5 rounded ${
          positive ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'
        }`}>
          {positive ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
          {deltaTxt}
        </div>
      </div>
      <Sparkline series={data.series} color={strokeColor} />
      <div className="flex justify-between mt-1 text-[10px] text-slate-600">
        {buckets.map((b, i) => (
          <span key={i} className="capitalize">{b.label}</span>
        ))}
      </div>
    </div>
  );
}

/* ── AllCanjesModal ───────────────────────────────────────────────
   Lista completa de canjes del período seleccionado, paginada. */
function AllCanjesModal({ open, onClose, canjes, periodoLabel }) {
  const [page, setPage] = useState(1);
  const PAGE = 20;

  useEffect(() => { if (!open) setPage(1); }, [open]);

  if (!open) return null;

  const total = canjes.length;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const rows  = canjes.slice((page - 1) * PAGE, page * PAGE);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl"
      >
        <div className="flex items-start justify-between p-5 border-b border-slate-800 shrink-0">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-white">Canjes validados</h3>
            <p className="text-xs text-slate-500 mt-0.5">{total} canjes en {periodoLabel.toLowerCase()}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {rows.length === 0 ? (
            <p className="text-sm text-slate-500 italic text-center py-12">Sin canjes en el período.</p>
          ) : (
            <ul className="divide-y divide-slate-800">
              {rows.map(c => (
                <li key={c.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{c.premio}</p>
                    <p className="text-xs text-slate-500 truncate">{c.cliente}</p>
                  </div>
                  <span className="text-xs text-slate-500 shrink-0">
                    {c.fecha ? c.fecha.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-slate-800 text-xs shrink-0">
            <span className="text-slate-500">Página {page} de {pages}</span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-2.5 py-1 rounded-lg font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage(p => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="px-2.5 py-1 rounded-lg font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Broadcast modal ──────────────────────────────────────────────
   Muestra la lista filtrada, permite enviar WhatsApp uno por uno
   (Click & Enter) o abrir todos en secuencia. Trackea localmente
   quién ya fue enviado en la sesión. */
function BroadcastModal({ open, onClose, type, clients, tenant, menorCosto }) {
  const [sent, setSent] = useState(() => new Set());

  useEffect(() => {
    if (!open) setSent(new Set());
  }, [open]);

  if (!open) return null;

  const tenantName = tenant?.name || 'la barbería';

  const title    = type === 'proximos' ? 'Enviar a próximos a canjear' : 'Recuperar clientes sin visita 30d';
  const subtitle = type === 'proximos'
    ? `${clients.length} miembros están a un paso de canjear un premio.`
    : `${clients.length} miembros del club llevan más de 30 días sin volver.`;

  const buildMessage = (c) => {
    const nombre = (c.nombre || 'hola').split(' ')[0];
    if (type === 'proximos') {
      const sellos = c.sellosDisponibles ?? c.stamps ?? 0;
      const falta  = Math.max(0, (menorCosto || 0) - sellos);
      const tail   = falta > 0 ? ` Te falta${falta === 1 ? '' : 'n'} solo ${falta} sello${falta === 1 ? '' : 's'} para tu premio 🎁.` : ' ¡Ya puedes canjear tu premio! 🎁';
      return `¡Hola ${nombre}! 👋 Soy de *${tenantName}*.${tail} Te esperamos pronto para agendarte.`;
    }
    // churn
    const dias = c.diasSinVisita ?? 30;
    return `¡Hola ${nombre}! 👋 Soy de *${tenantName}*. Hace ${dias} días que no nos vemos y queríamos saber cómo estás 🤝. ¿Te agendamos tu próximo corte esta semana?`;
  };

  const enviarUno = (c) => {
    const phone = normalizePhoneCL(c.telefono);
    if (!phone) return;
    openWhatsAppNative(phone, buildMessage(c));
    setSent(prev => {
      const next = new Set(prev);
      next.add(c.id);
      return next;
    });
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-800 shrink-0">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-white">{title}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
            <p className="text-[11px] text-slate-600 mt-2">
              Cada envío abre WhatsApp con el mensaje pre-llenado — presiona <kbd className="px-1 py-0.5 bg-slate-800 rounded text-[10px] font-mono">Enter</kbd> para mandarlo y vuelve acá para el siguiente.
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Progreso */}
        <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span>{sent.size} de {clients.length} enviados</span>
          <div className="w-32 h-1 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${clients.length ? (sent.size / clients.length) * 100 : 0}%` }} />
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {clients.length === 0 ? (
            <p className="text-sm text-slate-500 italic text-center py-12">Sin clientes en este segmento.</p>
          ) : (
            <ul className="divide-y divide-slate-800">
              {clients.map(c => {
                const yaEnviado = sent.has(c.id);
                const phone     = normalizePhoneCL(c.telefono);
                const disable   = !phone || yaEnviado;
                const detalle   = type === 'proximos'
                  ? `${c.sellosDisponibles ?? c.stamps ?? 0} sellos${menorCosto ? ` / ${menorCosto}` : ''}`
                  : `${c.diasSinVisita ?? '—'} días sin visita`;
                return (
                  <li key={c.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-900/40 transition-colors">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-bold text-xs ${yaEnviado ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                      {(c.nombre || '?').slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">{c.nombre || 'Sin nombre'}</p>
                      <p className="text-xs text-slate-500 truncate">{phone ? `+${phone}` : 'Sin teléfono'} · {detalle}</p>
                    </div>
                    <button
                      onClick={() => enviarUno(c)}
                      disabled={disable}
                      className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                        yaEnviado
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                          : phone
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/25'
                            : 'bg-slate-800 text-slate-600 border-slate-800 cursor-not-allowed'
                      }`}
                    >
                      {yaEnviado ? <CheckCircle2 size={13} /> : <Send size={13} />}
                      {yaEnviado ? 'Enviado' : phone ? 'Enviar' : 'Sin tel.'}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Tab: Vista previa del dashboard del cliente ──────────────────
   Renderiza dashboard.html en un iframe dentro de un frame de iPhone
   con selector de escenarios. dashboard.html detecta ?preview=1 y salta
   el gate de auth, inyectando datos mock según ?scenario=<key>.
   El tenant config (rangos, premios, tema, logo) se carga real desde
   Firestore — la preview muestra CÓMO SE VE, no data ficticia. */
function PreviewDashboard() {
  const tenant = useTenant();
  const [scenario, setScenario] = useState('con_sellos');
  const [refreshKey, setRefreshKey] = useState(0);

  // URL del iframe con ?local=<tid> + ?preview=1 + ?scenario=<key>.
  // El local= lo respeta el config.js de la home para resolver el tenant
  // correcto (necesario cuando el admin previsualiza un tenant desde otro
  // dominio, ej. panel.synaptechspa.cl previsualiza aura.synaptechspa.cl).
  const iframeSrc = useMemo(() => {
    const params = new URLSearchParams({
      local:    tenant.id,
      preview:  '1',
      scenario,
      _:        String(refreshKey), // fuerza re-mount si cambia
    });
    return `/dashboard.html?${params.toString()}`;
  }, [tenant.id, scenario, refreshKey]);

  const openExternal = () => {
    const params = new URLSearchParams({ local: tenant.id, preview: '1', scenario });
    window.open(`/dashboard.html?${params.toString()}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      {/* Explicación */}
      <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/25 shrink-0">
            <Smartphone size={16} className="text-amber-400" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white">Así ve tu cliente el dashboard</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Vista previa real del <strong className="text-white">/dashboard.html</strong> que abre cada cliente cuando entra al club.
              Los <strong className="text-white">rangos, premios, colores y logo son los tuyos</strong>; solo los sellos e historial son datos de prueba
              para que puedas ver cómo se ve en cada estado.
            </p>
          </div>
        </div>
      </div>

      {/* Selector de escenarios */}
      <div>
        <div className="flex items-center gap-2 mb-3 px-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Escenario del cliente</span>
          <div className="flex-1 h-px bg-slate-800" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {PREVIEW_SCENARIOS.map(s => {
            const active = scenario === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setScenario(s.key)}
                className={`text-left px-3 py-2.5 rounded-xl border transition-all ${
                  active
                    ? 'border-amber-500/40 bg-amber-500/10 shadow-[0_0_20px_-8px_rgba(251,191,36,0.4)]'
                    : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <p className={`text-sm font-bold leading-tight ${active ? 'text-amber-300' : 'text-white'}`}>
                  {s.label}
                </p>
                <p className={`text-[11px] mt-0.5 leading-snug ${active ? 'text-amber-400/70' : 'text-slate-500'}`}>
                  {s.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Frame de teléfono con iframe */}
      <div className="flex flex-col items-center gap-4">
        {/* Toolbar del preview */}
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            title="Recargar la vista previa"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
          >
            <RefreshCw size={12} />
            Recargar
          </button>
          <button
            onClick={openExternal}
            title="Abrir en pestaña nueva"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
          >
            <ExternalLink size={12} />
            Abrir en pestaña
          </button>
        </div>

        {/* iPhone-style frame — portrait, mobile-only */}
        <div
          className="relative bg-slate-950 rounded-[48px] shadow-2xl border-[10px] border-slate-950 shadow-black/40"
          style={{ width: 380, maxWidth: '100%' }}
        >
          {/* Dynamic Island (iPhone) */}
          <div
            className="absolute left-1/2 -translate-x-1/2 top-2 bg-black rounded-full z-10 pointer-events-none"
            style={{ width: 100, height: 26 }}
            aria-hidden
          />
          {/* Screen */}
          <div
            className="overflow-hidden bg-black rounded-[38px] relative"
            style={{ aspectRatio: '9/19.5' }}
          >
            <iframe
              key={refreshKey}
              src={iframeSrc}
              title="Vista previa del dashboard del cliente"
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms"
              loading="lazy"
            />
          </div>
        </div>

        <p className="text-[11px] text-slate-600 text-center max-w-md">
          Los datos que ves son ficticios (nombre "María González", historial de prueba). Cambia el escenario arriba
          para ver cómo se comporta el dashboard en cada estado del cliente.
        </p>
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
        <div className="min-w-0 flex-1">
          <h1 className="text-xl md:text-2xl font-bold text-white truncate">Fidelización</h1>
          <p className="text-xs text-slate-500 truncate">Club, premios, canjes y rangos — todo en un solo lugar</p>
        </div>
        <button
          onClick={() => setActiveTab('premios')}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/30 transition-colors"
        >
          <Plus size={13} />
          <span className="hidden sm:inline">Nuevo premio</span>
          <span className="sm:hidden">Premio</span>
        </button>
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
        {activeTab === 'resumen'     && <ResumenFidelizacion />}
        {activeTab === 'premios'     && <Premios />}
        {activeTab === 'canjes'      && <Canjes />}
        {activeTab === 'rangos'      && <Rangos />}
        {activeTab === 'boca-a-boca' && <ReferidosBoca />}
        {activeTab === 'preview'     && <PreviewDashboard />}
        {activeTab === 'membresias'  && HAS_MEMBRESIAS.has(tenant.id) && <Membresias />}
      </div>
    </div>
  );
}
