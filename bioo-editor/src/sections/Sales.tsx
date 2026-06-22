import { useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { CircleDollarSign, TrendingUp, Landmark, Loader2, AlertTriangle } from 'lucide-react';
import { auth } from '../lib/firebase';
import { watchSales, formatMoney, type Sale } from '../lib/sales';
import { useStripeAccount, onboardStripe } from '../lib/connect';
import { useEditor } from '../store';

const fmtDate = new Intl.DateTimeFormat('es-CL', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

export default function Sales(): JSX.Element {
  const { state } = useEditor();
  const username = state.username;
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const { accountId, ready, loading: connLoading } = useStripeAccount();
  const [sales, setSales] = useState<Sale[] | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  // Suscripción EN VIVO al historial de ventas (solo con la cuenta lista).
  useEffect(() => {
    if (!user || !username || !accountId || !ready) { setSales(null); return; }
    const unsub = watchSales(username, setSales, () => setSales([]));
    return () => unsub();
  }, [user, username, accountId, ready]);

  if (!user) return <Notice>Inicia sesión para ver tus ventas.</Notice>;
  if (connLoading) return <Notice>Cargando…</Notice>;

  const connect = async (): Promise<void> => {
    setConnecting(true);
    try {
      window.location.href = await onboardStripe();
    } catch {
      setConnecting(false);
    }
  };

  if (!accountId) return <ConnectState onConnect={connect} connecting={connecting} />;
  if (!ready) return <IncompleteState onContinue={connect} connecting={connecting} />;

  const list = sales ?? [];
  const count = list.length;
  const totals: Record<string, number> = {};
  for (const s of list) if (s.amountTotal != null) totals[s.currency] = (totals[s.currency] ?? 0) + s.amountTotal;
  const currencies = Object.keys(totals).sort((a, b) => totals[b] - totals[a]);
  const primary = currencies[0];

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-gradient-to-br from-[#15240b] to-[#2c5a17] p-5 text-white shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/70">
          <TrendingUp size={14} /> Total de ingresos
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold text-white/90">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#92c83a]" /> En vivo
          </span>
        </div>
        <p className="mt-2 text-3xl font-black tracking-tight">{primary ? formatMoney(totals[primary], primary) : '$0'}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/70">
          <span>{count} {count === 1 ? 'venta' : 'ventas'}</span>
          {currencies.slice(1).map((c) => <span key={c}>· {formatMoney(totals[c], c)}</span>)}
        </div>
      </section>

      {sales === null && <Notice>Cargando ventas…</Notice>}
      {sales && count === 0 && <EmptySales />}

      {count > 0 && (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/[0.04]">
          <div className="max-h-[55vh] overflow-y-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-neutral-50/95 backdrop-blur">
                <tr className="text-left text-xs font-bold uppercase tracking-wider text-neutral-400">
                  <th className="px-4 py-3">Comprador</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                  <th className="px-4 py-3">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {list.map((s) => (
                  <tr key={s.id} className="border-t border-neutral-100 transition-colors hover:bg-gray-50">
                    <td className="max-w-[40%] truncate px-4 py-3 font-medium text-neutral-800">{s.buyerEmail || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-[#2c5a17]">
                      {s.amountTotal != null ? formatMoney(s.amountTotal, s.currency) : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-neutral-500">{s.ts ? fmtDate.format(s.ts) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function ConnectState({ onConnect, connecting }: { onConnect: () => void; connecting: boolean }): JSX.Element {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-white px-6 py-12 text-center shadow-sm ring-1 ring-black/[0.04]">
      <span className="grid h-16 w-16 place-items-center rounded-full bg-[#635bff]/12 text-[#635bff]">
        <Landmark size={30} />
      </span>
      <p className="mt-4 text-lg font-bold text-neutral-800">Recibe pagos directamente en tu cuenta bancaria</p>
      <p className="mt-1 max-w-sm text-sm text-neutral-500">
        Conecta tu cuenta con Stripe para cobrar propinas y productos. El dinero llega a tu banco automáticamente; bioo solo retiene una pequeña comisión.
      </p>
      <button
        type="button"
        onClick={onConnect}
        disabled={connecting}
        className="mt-5 flex items-center gap-2 rounded-xl bg-[#635bff] px-5 py-3 text-sm font-bold text-white shadow-sm transition-transform active:scale-95 disabled:opacity-70"
      >
        {connecting ? <><Loader2 size={16} className="animate-spin" /> Redirigiendo…</> : <>Conectar con Stripe</>}
      </button>
    </div>
  );
}

function IncompleteState({ onContinue, connecting }: { onContinue: () => void; connecting: boolean }): JSX.Element {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-white px-6 py-12 text-center shadow-sm ring-1 ring-black/[0.04]">
      <span className="grid h-16 w-16 place-items-center rounded-full bg-amber-100 text-amber-500">
        <AlertTriangle size={30} />
      </span>
      <p className="mt-4 text-lg font-bold text-neutral-800">Completa tu configuración en Stripe</p>
      <p className="mt-1 max-w-sm text-sm text-neutral-500">
        Tu cuenta está creada pero aún no puede recibir pagos. Termina de cargar tus datos (banco e identidad) para activar los cobros.
      </p>
      <button
        type="button"
        onClick={onContinue}
        disabled={connecting}
        className="mt-5 flex items-center gap-2 rounded-xl bg-[#635bff] px-5 py-3 text-sm font-bold text-white shadow-sm transition-transform active:scale-95 disabled:opacity-70"
      >
        {connecting ? <><Loader2 size={16} className="animate-spin" /> Redirigiendo…</> : <>Continuar configuración</>}
      </button>
    </div>
  );
}

function EmptySales(): JSX.Element {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-white px-6 py-12 text-center shadow-sm ring-1 ring-black/[0.04]">
      <span className="grid h-16 w-16 place-items-center rounded-full bg-[#92c83a]/15 text-[#72a129]">
        <CircleDollarSign size={30} />
      </span>
      <p className="mt-4 text-base font-bold text-neutral-800">Aún no tienes ventas</p>
      <p className="mt-1 max-w-xs text-sm text-neutral-500">
        Comparte tu página con bloques de <strong className="font-bold text-neutral-600">Propina</strong> o <strong className="font-bold text-neutral-600">Producto</strong>. Tus ventas aparecerán aquí en tiempo real.
      </p>
    </div>
  );
}

function Notice({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="rounded-2xl bg-white p-5 text-center text-sm text-neutral-500 shadow-sm ring-1 ring-black/[0.04]">
      {children}
    </div>
  );
}
