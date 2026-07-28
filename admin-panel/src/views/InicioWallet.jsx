import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet, Users, TrendingUp, Gift, ScanLine, ExternalLink,
  Crown, Sparkles, ArrowRight, ChevronRight,
} from 'lucide-react';
import { useTenant } from '../contexts/TenantContext';
import { useCollection } from '../hooks/useCollection';

// ─────────────────────────────────────────────────────────────────
//  INICIO — vista para tenants con plan 'wallet-only'
//
//  Reemplaza a Inicio.jsx (que asume citas + agenda) cuando el
//  tenant vende SOLO la tarjeta de fidelidad. Métricas relevantes al
//  wallet: tarjetas guardadas, sellos otorgados (semana/mes), canjes
//  y cliente destacado. Plus CTAs directos a los dos flujos vivos:
//  editor (wallets.bioo.cl) y scanner staff (wallets.bioo.cl/staff).
//
//  El despacho por plan vive en App.jsx (billingPlan === 'wallet-only').
// ─────────────────────────────────────────────────────────────────

const WALLETS_STUDIO_URL = 'https://wallets.bioo.cl/estudio';
const WALLETS_STAFF_URL  = 'https://wallets.bioo.cl/staff';

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
};

// Normaliza cualquier "fecha" (string ISO, Timestamp, Date) a ms.
function toMs(v) {
  if (!v) return 0;
  if (typeof v === 'string') return Date.parse(v) || 0;
  if (v.toMillis) return v.toMillis();
  if (v.toDate)   return v.toDate().getTime();
  if (v instanceof Date) return v.getTime();
  return 0;
}

function startOfWeekMs() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  // Lunes como inicio (patrón chileno).
  const day = d.getDay(); // 0 = domingo
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d.getTime();
}
function startOfMonthMs() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

export default function InicioWallet() {
  const navigate = useNavigate();
  const { id: tenantId, name: tenantName, logo } = useTenant();
  const { data: users, loading } = useCollection('users');

  const stats = useMemo(() => {
    const list = users || [];
    const weekStart  = startOfWeekMs();
    const monthStart = startOfMonthMs();

    let tarjetasGuardadas = 0;
    let sellosSemana = 0;
    let sellosMes    = 0;
    let canjesSemana = 0;
    let canjesMes    = 0;
    let clientesConSellos = 0;

    // Cliente destacado: el que más sellos históricos acumuló.
    let destacado = null;

    // Próximos a canjear: top 3 con más sellos disponibles.
    const conSaldo = [];

    for (const u of list) {
      if (u.noSumaSellos === true) continue;                 // placeholder walk-in
      if (u.fusionadoCon && u.fusionadoCon !== u.id) continue; // legacy fusionado (mostramos solo canónicos)

      const disp = Number(u.sellosDisponibles ?? u.stamps) || 0;
      const hist = Number(u.sellosHistoricos)              || 0;
      const guardada = !!(u.walletObjectId || u.appleWalletSerial);

      if (guardada) tarjetasGuardadas++;
      if (hist > 0) clientesConSellos++;

      if (!destacado || hist > destacado.hist) {
        destacado = { nombre: u.nombre || u.displayName || 'Cliente', hist, disp, uid: u.id };
      }
      if (disp > 0) conSaldo.push({ nombre: u.nombre || u.displayName || 'Cliente', disp, uid: u.id });

      // Sellos/canjes del período: recorremos historialSellos si existe.
      const hs = Array.isArray(u.historialSellos) ? u.historialSellos : [];
      for (const e of hs) {
        const t = toMs(e.fecha);
        if (!t) continue;
        const cant = Number(e.cantidad) || 0;
        const isCanje = e.tipo === 'canje' || cant < 0;
        if (t >= monthStart) {
          if (isCanje) canjesMes += 1; else sellosMes += Math.abs(cant);
        }
        if (t >= weekStart) {
          if (isCanje) canjesSemana += 1; else sellosSemana += Math.abs(cant);
        }
      }
    }

    conSaldo.sort((a, b) => b.disp - a.disp);
    const topSaldo = conSaldo.slice(0, 3);

    return {
      totalClientes: list.length,
      clientesConSellos,
      tarjetasGuardadas,
      sellosSemana,
      sellosMes,
      canjesSemana,
      canjesMes,
      destacado,
      topSaldo,
    };
  }, [users]);

  return (
    <div className="px-4 sm:px-6 py-6 max-w-4xl mx-auto">
      {/* Header saludo */}
      <div className="flex items-center gap-3 mb-6">
        {logo && (
          <img src={logo} alt="" className="w-11 h-11 rounded-xl object-cover shrink-0" />
        )}
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 [html.light_&]:text-ink-500">
            {greeting()}
          </p>
          <h1 className="text-2xl font-black text-primary [html.light_&]:text-ink-900 leading-tight truncate">
            {tenantName || 'Tu local'}
          </h1>
        </div>
      </div>

      {/* CTAs primarios: los dos flujos del producto */}
      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        <a
          href={WALLETS_STAFF_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative overflow-hidden rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/15 via-slate-950/40 to-slate-950/40 [html.light_&]:from-emerald-50 [html.light_&]:via-white [html.light_&]:to-white p-5 flex items-center gap-4 hover:border-emerald-500/50 transition-colors"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-400 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/25">
            <ScanLine size={22} className="text-emerald-950" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-primary [html.light_&]:text-ink-900 leading-tight">Abrir escáner</p>
            <p className="text-xs text-slate-400 [html.light_&]:text-ink-600 mt-0.5">Sumar sellos al cliente que llegó</p>
          </div>
          <ExternalLink size={15} className="text-slate-500 group-hover:text-emerald-400 shrink-0" />
        </a>
        <a
          href={WALLETS_STUDIO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/15 via-slate-950/40 to-slate-950/40 [html.light_&]:from-amber-50 [html.light_&]:via-white [html.light_&]:to-white p-5 flex items-center gap-4 hover:border-amber-500/50 transition-colors"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-400 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/25">
            <Wallet size={22} className="text-ink-900" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-primary [html.light_&]:text-ink-900 leading-tight">Diseño de la tarjeta</p>
            <p className="text-xs text-slate-400 [html.light_&]:text-ink-600 mt-0.5">Colores, logo, geo-push, premios</p>
          </div>
          <ExternalLink size={15} className="text-slate-500 group-hover:text-amber-400 shrink-0" />
        </a>
      </div>

      {/* Métricas grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Stat
          Icon={Wallet}
          label="Tarjetas guardadas"
          value={loading ? '…' : stats.tarjetasGuardadas}
          hint={loading ? '' : `de ${stats.totalClientes} clientes`}
          tint="amber"
        />
        <Stat
          Icon={Users}
          label="Con sellos activos"
          value={loading ? '…' : stats.clientesConSellos}
          hint={loading ? '' : 'en total'}
          tint="emerald"
        />
        <Stat
          Icon={TrendingUp}
          label="Sellos esta semana"
          value={loading ? '…' : stats.sellosSemana}
          hint={loading ? '' : `${stats.sellosMes} en el mes`}
          tint="blue"
        />
        <Stat
          Icon={Gift}
          label="Canjes esta semana"
          value={loading ? '…' : stats.canjesSemana}
          hint={loading ? '' : `${stats.canjesMes} en el mes`}
          tint="pink"
        />
      </div>

      {/* Cliente destacado + top saldo */}
      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        {/* Cliente destacado */}
        <div className="rounded-2xl border border-slate-800 [html.light_&]:border-ink-200 bg-slate-900/40 [html.light_&]:bg-white p-5">
          <div className="flex items-center gap-2 mb-3">
            <Crown size={17} className="text-amber-400" />
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 [html.light_&]:text-ink-500">
              Cliente destacado
            </p>
          </div>
          {!loading && stats.destacado ? (
            <>
              <p className="text-lg font-bold text-primary [html.light_&]:text-ink-900 truncate">{stats.destacado.nombre}</p>
              <p className="text-sm text-slate-400 [html.light_&]:text-ink-600 mt-0.5">
                {stats.destacado.hist} sello{stats.destacado.hist === 1 ? '' : 's'} en total
                {' · '}{stats.destacado.disp} disponibles
              </p>
              <button
                onClick={() => navigate('/clientes')}
                className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300"
              >
                Ver todos los clientes <ChevronRight size={13} />
              </button>
            </>
          ) : (
            <p className="text-sm text-slate-500 [html.light_&]:text-ink-500">
              {loading ? 'Cargando…' : 'Aún no tienes clientes con sellos.'}
            </p>
          )}
        </div>

        {/* Top saldo */}
        <div className="rounded-2xl border border-slate-800 [html.light_&]:border-ink-200 bg-slate-900/40 [html.light_&]:bg-white p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={17} className="text-emerald-400" />
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 [html.light_&]:text-ink-500">
              Próximos a canjear
            </p>
          </div>
          {!loading && stats.topSaldo.length > 0 ? (
            <ul className="space-y-2">
              {stats.topSaldo.map((c, i) => (
                <li key={c.uid} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-sm text-primary [html.light_&]:text-ink-900 truncate flex-1">{c.nombre}</span>
                  <span className="text-sm font-bold text-emerald-400 shrink-0">{c.disp}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500 [html.light_&]:text-ink-500">
              {loading ? 'Cargando…' : 'Nadie tiene sellos aún — apunta al primer canje.'}
            </p>
          )}
        </div>
      </div>

      {/* Guía rápida (una vez que la conozca puede colapsar mentalmente) */}
      <div className="rounded-2xl border border-slate-800 [html.light_&]:border-ink-200 bg-slate-900/30 [html.light_&]:bg-white p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 [html.light_&]:text-ink-500 mb-3">
          Cómo funciona
        </p>
        <ol className="space-y-2.5 text-sm text-slate-300 [html.light_&]:text-ink-700">
          <Step n="1">Diseña la tarjeta y sus premios desde <span className="text-amber-400 font-semibold">Tarjeta digital → Diseño</span>.</Step>
          <Step n="2">Tus clientes la guardan en su celular escaneando el QR desde tu link o el botón "Añadir a Wallet".</Step>
          <Step n="3">Cuando llegan al local, abren su tarjeta y muestran el QR. Tú lo escaneas desde <span className="text-emerald-400 font-semibold">Abrir escáner</span> y suma 1 sello.</Step>
          <Step n="4">Al completar los sellos de un premio, canjean con el mismo QR y quedan listos para la próxima ronda.</Step>
        </ol>
      </div>
    </div>
  );
}

function Stat({ Icon, label, value, hint, tint = 'emerald' }) {
  const tints = {
    emerald: { icon: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    amber:   { icon: 'text-amber-400',   bg: 'bg-amber-500/10'   },
    blue:    { icon: 'text-blue-400',    bg: 'bg-blue-500/10'    },
    pink:    { icon: 'text-pink-400',    bg: 'bg-pink-500/10'    },
  }[tint] || { icon: 'text-slate-400', bg: 'bg-slate-500/10' };
  return (
    <div className="rounded-2xl border border-slate-800 [html.light_&]:border-ink-200 bg-slate-900/40 [html.light_&]:bg-white p-4">
      <div className={`w-9 h-9 rounded-lg ${tints.bg} flex items-center justify-center mb-3`}>
        <Icon size={17} className={tints.icon} />
      </div>
      <p className="text-2xl font-black text-primary [html.light_&]:text-ink-900 leading-tight">{value}</p>
      <p className="text-xs font-semibold text-slate-400 [html.light_&]:text-ink-600 mt-1">{label}</p>
      {hint && <p className="text-[11px] text-slate-500 [html.light_&]:text-ink-500 mt-0.5">{hint}</p>}
    </div>
  );
}

function Step({ n, children }) {
  return (
    <li className="flex items-start gap-3">
      <span className="w-6 h-6 rounded-full bg-slate-800 [html.light_&]:bg-ink-100 text-slate-300 [html.light_&]:text-ink-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
        {n}
      </span>
      <span className="leading-relaxed">{children}</span>
    </li>
  );
}
