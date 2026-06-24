import { useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  Users, Wallet, DollarSign, Percent, ExternalLink, ShieldAlert, Loader2, type LucideIcon,
} from 'lucide-react';
import { auth } from './lib/firebase';
import { fetchIsAdmin, loadRecentUsers, loadKpis, type AdminUser, type Kpis } from './lib/admin';
import { cardCls } from './ui';

const fmtDate = new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });

const ZERO_DECIMAL = new Set(['CLP', 'JPY', 'KRW', 'VND', 'PYG', 'ISK']);

/** Formatea un monto en unidad MAYOR con su moneda. */
function money(amount: number, currency: string): string {
  const c = currency.toUpperCase();
  const zero = ZERO_DECIMAL.has(c);
  return '$' + amount.toLocaleString('es-CL', {
    minimumFractionDigits: zero ? 0 : 2,
    maximumFractionDigits: zero ? 0 : 2,
  }) + ' ' + c;
}

/** Elige la moneda con mayor volumen y devuelve [amount, currency]. */
function primaryCurrency(totals: Record<string, number>): [number, string] {
  const entries = Object.entries(totals);
  if (entries.length === 0) return [0, 'CLP'];
  entries.sort((a, b) => b[1] - a[1]);
  return [entries[0][1], entries[0][0]];
}

/** Resume monedas secundarias para mostrar "+ $25 USD · $10 EUR". */
function secondaryCurrencies(totals: Record<string, number>): string {
  const entries = Object.entries(totals);
  if (entries.length <= 1) return '';
  entries.sort((a, b) => b[1] - a[1]);
  return entries.slice(1).map(([c, v]) => money(v, c)).join(' · ');
}

type Gate = 'loading' | 'anon' | 'denied' | 'ok';

export default function AdminDashboard(): JSX.Element {
  const [gate, setGate] = useState<Gate>('loading');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [kpis, setKpis] = useState<Kpis | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u: User | null) => {
      if (!u) { setGate('anon'); return; }
      setGate('loading');
      try {
        const admin = await fetchIsAdmin(u.uid);
        if (!admin) { setGate('denied'); return; }
        const [list, k] = await Promise.all([loadRecentUsers(), loadKpis()]);
        setUsers(list);
        setKpis(k);
        setGate('ok');
      } catch {
        setGate('denied');
      }
    });
  }, []);

  if (gate === 'loading') return <Centered><Loader2 className="animate-spin text-neutral-400" /></Centered>;
  if (gate === 'anon') return <Blocked title="Inicia sesión" msg="Necesitas una cuenta para acceder." href="/editor" cta="Ir a iniciar sesión" />;
  if (gate === 'denied') return <Blocked title="Acceso denegado" msg="No tienes permisos para ver el Centro de Comando." href="/" cta="Volver al inicio" />;

  return (
    <div className="min-h-[100dvh] bg-neutral-50 text-neutral-900">
      <header className="border-b border-neutral-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-4">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#15240b] text-xs font-black text-[#92c83a]">b</span>
          <h1 className="text-base font-extrabold tracking-tight text-[#15240b]">Bioo Command Center</h1>
          <span className="ml-auto rounded-full bg-[#92c83a]/15 px-2.5 py-1 text-[11px] font-bold text-[#72a129]">Admin</span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-5 py-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Kpi
            icon={Users}
            label="Total usuarios"
            value={kpis ? kpis.totalUsers.toLocaleString('es-CL') : '—'}
            hint={kpis ? `${kpis.salesCount.toLocaleString('es-CL')} ventas pagadas` : undefined}
          />
          <Kpi
            icon={Wallet}
            label="Cuentas conectadas"
            value={kpis ? (kpis.stripeActive + kpis.mpActive).toLocaleString('es-CL') : '—'}
            hint={kpis ? `${kpis.mpActive} MP · ${kpis.stripeActive} Stripe` : undefined}
          />
          {(() => {
            if (!kpis) return <Kpi icon={DollarSign} label="Volumen procesado (GMV)" value="—" />;
            const [amt, cur] = primaryCurrency(kpis.totalsByCurrency);
            return (
              <Kpi
                icon={DollarSign}
                label="Volumen procesado (GMV)"
                value={money(amt, cur)}
                hint={secondaryCurrencies(kpis.totalsByCurrency) || undefined}
              />
            );
          })()}
          {(() => {
            if (!kpis) return <Kpi icon={Percent} label="Ingresos bioo (5%)" value="—" accent />;
            const [amt, cur] = primaryCurrency(kpis.totalsByCurrency);
            return (
              <Kpi
                icon={Percent}
                label="Ingresos bioo (5%)"
                value={money(amt * 0.05, cur)}
                hint="proyectado · hoy fee=0"
                accent
              />
            );
          })()}
        </div>

        {/* Tabla de usuarios */}
        <section className="overflow-hidden rounded-[24px] bg-white shadow-[0_2px_10px_rgba(0,0,0,0.02)] ring-1 ring-black/[0.03]">
          <div className="flex items-center justify-between px-6 py-4">
            <h2 className="text-lg font-bold text-[#15240b]">Usuarios recientes</h2>
            <span className="text-xs text-neutral-400">Últimos {users.length}</span>
          </div>
          <div className="max-h-[60vh] overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-neutral-50/95 backdrop-blur">
                <tr className="text-left text-xs font-bold uppercase tracking-wider text-neutral-400">
                  <th className="px-6 py-3">Username</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Actividad</th>
                  <th className="px-6 py-3">Stripe</th>
                  <th className="px-6 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.username} className="border-t border-neutral-100 transition-colors hover:bg-neutral-50">
                    <td className="px-6 py-3 font-semibold text-[#15240b]">@{u.username}</td>
                    <td className="max-w-[200px] truncate px-6 py-3 text-neutral-500">{u.email || '—'}</td>
                    <td className="whitespace-nowrap px-6 py-3 text-neutral-500">{u.ts ? fmtDate.format(u.ts) : '—'}</td>
                    <td className="px-6 py-3"><StripeBadge ready={u.stripeReady} /></td>
                    <td className="px-6 py-3 text-right">
                      <a
                        href={`https://bioo.cl/${u.username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Ver página"
                        className="inline-grid h-8 w-8 place-items-center rounded-lg bg-neutral-100 text-neutral-500 transition-colors hover:bg-neutral-200 hover:text-[#15240b]"
                      >
                        <ExternalLink size={15} />
                      </a>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-10 text-center text-sm text-neutral-400">Sin usuarios todavía.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, hint, accent = false }: { icon: LucideIcon; label: string; value: string; hint?: string; accent?: boolean }): JSX.Element {
  return (
    <div className={cardCls}>
      <div className={`grid h-10 w-10 place-items-center rounded-xl ${accent ? 'bg-[#92c83a]/15 text-[#72a129]' : 'bg-neutral-100 text-neutral-500'}`}>
        <Icon size={18} />
      </div>
      <p className="mt-4 text-2xl font-black tracking-tight text-[#15240b]">{value}</p>
      <p className="mt-0.5 text-xs font-medium text-neutral-500">{label}</p>
      {hint && <p className="mt-1 text-[11px] text-neutral-400">{hint}</p>}
    </div>
  );
}

function StripeBadge({ ready }: { ready: boolean }): JSX.Element {
  return ready ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#92c83a]/15 px-2.5 py-1 text-[11px] font-bold text-[#2c5a17]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#92c83a]" /> Activa
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-bold text-neutral-400">
      <span className="h-1.5 w-1.5 rounded-full bg-neutral-300" /> Sin conectar
    </span>
  );
}

function Centered({ children }: { children: ReactNode }): JSX.Element {
  return <div className="grid min-h-[100dvh] place-items-center bg-neutral-50">{children}</div>;
}

function Blocked({ title, msg, href, cta }: { title: string; msg: string; href: string; cta: string }): JSX.Element {
  return (
    <Centered>
      <div className={`${cardCls} max-w-sm text-center`}>
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-amber-100 text-amber-500">
          <ShieldAlert size={28} />
        </span>
        <p className="mt-4 text-lg font-bold text-[#15240b]">{title}</p>
        <p className="mt-1 text-sm text-neutral-500">{msg}</p>
        <a href={href} className="mt-5 inline-block rounded-xl bg-[#15240b] px-5 py-2.5 text-sm font-bold text-white transition-transform active:scale-95">{cta}</a>
      </div>
    </Centered>
  );
}
