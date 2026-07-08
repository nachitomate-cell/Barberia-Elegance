import { useState, useEffect, useMemo } from 'react';
import { onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import {
  Share2, Users, Award, Gift, Sparkles, RefreshCw,
  Copy, MessageCircle, ArrowUpRight,
} from 'lucide-react';
import { tenantCol, tenantDoc } from '../lib/tenantUtils';
import { useTenant } from '../contexts/TenantContext';

/* ── Referidos boca a boca (B2C) ──────────────────────────────────
   Tab bajo Fidelización. Muestra:
     · Programa: activo / recompensas configuradas / link para compartir
     · Métricas: conversiones totales, este mes, referidores activos
     · Top referidores (users con referralConversionsCount > 0)
     · Audit log (referral_awards, últimas 50)

   Fuente: users (referralCode, referralConversionsCount, referralActive)
           settings/general.referralProgram
           referral_awards (escrito por CF referidos-recompensa)
   ────────────────────────────────────────────────────────────────── */

function fmt(n) {
  return Number(n || 0).toLocaleString('es-CL');
}

function fmtDate(ts) {
  if (!ts) return '';
  const d = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
}

function describeRecompensa(rec) {
  if (!rec || !rec.categoria) return '—';
  const cat = rec.categoria;
  if (cat === 'SELLOS') return `${rec.detalle?.cantidad || 0} sellos`;
  return rec.textoDinamico || rec.detalle?.nombre || cat.toLowerCase();
}

export default function ReferidosBoca() {
  const tenant = useTenant();

  const [rp, setRp]                 = useState(null);   // referralProgram config
  const [users, setUsers]           = useState([]);
  const [awards, setAwards]         = useState([]);
  const [loadingCfg, setLoadingCfg] = useState(true);

  // ── settings/general.referralProgram (config) ────────────────────
  useEffect(() => {
    const ref = tenantDoc('settings', 'general');
    const unsub = onSnapshot(
      ref,
      snap => {
        const d = snap.exists() ? snap.data() : {};
        setRp(d.referralProgram || { enabled: false });
        setLoadingCfg(false);
      },
      err => { console.warn('[referidos-boca] cfg:', err.message); setLoadingCfg(false); },
    );
    return unsub;
  }, [tenant.id]);

  // ── users: para top-referidores + activos ────────────────────────
  useEffect(() => {
    const ref = tenantCol('users');
    const unsub = onSnapshot(
      ref,
      snap => setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err  => console.warn('[referidos-boca] users:', err.message),
    );
    return unsub;
  }, [tenant.id]);

  // ── referral_awards: audit log (últimas 50) ──────────────────────
  useEffect(() => {
    const ref = tenantCol('referral_awards');
    const q   = query(ref, orderBy('createdAt', 'desc'), limit(50));
    const unsub = onSnapshot(
      q,
      snap => setAwards(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err  => {
        // Collection puede no existir aún → no es error real
        if (err.code !== 'permission-denied' && err.code !== 'not-found') {
          console.warn('[referidos-boca] awards:', err.message);
        }
      },
    );
    return unsub;
  }, [tenant.id]);

  // ── Métricas derivadas ───────────────────────────────────────────
  const metricas = useMemo(() => {
    const total = awards.length;
    const desdeInicioMes = (() => {
      const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0);
      return d.getTime();
    })();
    const esteMes = awards.filter(a => {
      const t = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      return t >= desdeInicioMes;
    }).length;

    const conCodigo   = users.filter(u => u.referralCode).length;
    const referidores = users.filter(u => (u.referralConversionsCount || 0) > 0);
    return {
      total, esteMes,
      conCodigo,
      referidoresActivos: referidores.length,
    };
  }, [awards, users]);

  const topReferidores = useMemo(() => {
    return users
      .filter(u => (u.referralConversionsCount || 0) > 0)
      .sort((a, b) => (b.referralConversionsCount || 0) - (a.referralConversionsCount || 0))
      .slice(0, 10);
  }, [users]);

  const programaActivo = rp?.enabled === true;

  // ── Render ───────────────────────────────────────────────────────
  if (loadingCfg) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
        <RefreshCw size={16} className="animate-spin mr-2" /> Cargando…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Estado del programa ─────────────────────────────────── */}
      <section className={`rounded-2xl border p-5 ${
        programaActivo
          ? 'bg-emerald-500/5 border-emerald-500/20'
          : 'bg-slate-800/40 border-slate-700/60'
      }`}>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${programaActivo ? 'bg-emerald-500/15' : 'bg-slate-700/50'}`}>
            <Share2 size={18} className={programaActivo ? 'text-emerald-400' : 'text-slate-400'} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-white">
              Boca a boca {programaActivo
                ? <span className="text-emerald-400">· Activo</span>
                : <span className="text-slate-500">· Apagado</span>}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {programaActivo
                ? 'Cada cliente recibe un código único. Cuando invita a un amigo y ese amigo completa su primera cita, ambos reciben recompensa automáticamente.'
                : 'Actívalo en Configuración → “Programa de Referidos” para que tus clientes empiecen a traer amigos con recompensa mutua.'}
            </p>
            {programaActivo && (
              <div className="mt-3 flex flex-wrap gap-3 text-xs">
                <span className="px-2.5 py-1 rounded-full bg-slate-800/70 border border-slate-700/60 text-slate-300">
                  <b className="text-white">Referidor:</b> {describeRecompensa(rp?.recompensaReferidor)}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-slate-800/70 border border-slate-700/60 text-slate-300">
                  <b className="text-white">Referido:</b> {describeRecompensa(rp?.recompensaReferido)}
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Métricas ────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard Icon={Award}    label="Conversiones totales"   value={fmt(metricas.total)} accent="amber"   />
        <MetricCard Icon={Sparkles} label="Este mes"               value={fmt(metricas.esteMes)} accent="emerald" />
        <MetricCard Icon={Users}    label="Referidores activos"    value={fmt(metricas.referidoresActivos)} accent="violet" />
        <MetricCard Icon={Gift}     label="Clientes con código"    value={fmt(metricas.conCodigo)} accent="sky" />
      </section>

      {/* ── Top referidores ─────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
        <header className="px-5 py-4 border-b border-slate-800">
          <h3 className="text-sm font-bold text-white">Top referidores</h3>
          <p className="text-xs text-slate-500 mt-0.5">Ranking por cantidad de amigos que completaron su primera cita.</p>
        </header>
        {topReferidores.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500">
            Aún nadie ha convertido a un amigo. {programaActivo
              ? 'Anima a tus mejores clientes a compartir su código desde la app.'
              : 'Activa el programa para empezar.'}
          </div>
        ) : (
          <ul className="divide-y divide-slate-800/60">
            {topReferidores.map((u, i) => (
              <li key={u.id} className="px-5 py-3 flex items-center gap-3">
                <div className="w-6 text-center text-xs font-bold text-slate-500">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{u.nombre || '(Sin nombre)'}</div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {u.referralCode || '—'} · {u.telefono || 'sin tel'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold text-amber-400">{u.referralConversionsCount || 0}</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wide">amigos</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Audit log ───────────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
        <header className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Recompensas otorgadas</h3>
            <p className="text-xs text-slate-500 mt-0.5">Últimas 50 · útil para revisar cuánto está costando el programa.</p>
          </div>
        </header>
        {awards.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500">
            Todavía no se ha otorgado ninguna recompensa por referido.
          </div>
        ) : (
          <ul className="divide-y divide-slate-800/60">
            {awards.map(a => (
              <li key={a.id} className="px-5 py-3">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-md bg-amber-500/10 border border-amber-500/20 mt-0.5">
                    <ArrowUpRight size={12} className="text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">
                      <b>{a.referidoNombre || '(cliente)'}</b>
                      {' '}
                      <span className="text-slate-400">completó su primera cita usando código</span>
                      {' '}
                      <span className="font-mono text-emerald-400">{a.referidorCode || '—'}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {a.referidorNombre ? `Referido por ${a.referidorNombre}` : 'Referidor no encontrado'}
                      {' · '}
                      {fmtDate(a.createdAt)}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      {a.resRefdo?.ok && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-300">
                          Referido: {a.resRefdo.tipo === 'sellos' ? `+${a.resRefdo.cantidad} sellos` : 'canje pendiente'}
                        </span>
                      )}
                      {a.resRefdor?.ok && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300">
                          Referidor: {a.resRefdor.tipo === 'sellos' ? `+${a.resRefdor.cantidad} sellos` : 'canje pendiente'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function MetricCard({ Icon, label, value, accent = 'slate' }) {
  const ACCENTS = {
    amber:   { bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/20' },
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    violet:  { bg: 'bg-violet-500/10',  text: 'text-violet-400',  border: 'border-violet-500/20' },
    sky:     { bg: 'bg-sky-500/10',     text: 'text-sky-400',     border: 'border-sky-500/20' },
    slate:   { bg: 'bg-slate-700/40',   text: 'text-slate-300',   border: 'border-slate-700/60' },
  };
  const s = ACCENTS[accent] || ACCENTS.slate;
  return (
    <div className={`rounded-xl border p-4 ${s.border} bg-slate-900/40`}>
      <div className={`inline-flex p-1.5 rounded-md ${s.bg}`}>
        <Icon size={14} className={s.text} />
      </div>
      <div className="mt-2 text-2xl font-bold text-white leading-none">{value}</div>
      <div className="mt-1 text-[11px] text-slate-500">{label}</div>
    </div>
  );
}
