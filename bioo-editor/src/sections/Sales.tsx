import { useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { CircleDollarSign, TrendingUp, Landmark, Loader2, AlertTriangle, Clock } from 'lucide-react';
import { auth } from '../lib/firebase';
import { watchSales, formatMoney, type Sale } from '../lib/sales';
import { useStripeAccount, onboardStripe, useMpAccount, connectMercadoPago } from '../lib/connect';
import { useEditor } from '../store';

// Mercado Pago en homologación con MP (validando datos de la cuenta plataforma).
// Mientras esté en true, el botón "Conectar Mercado Pago" se reemplaza por un
// aviso "Próximamente". Cambiar a false cuando MP apruebe la app marketplace.
const MP_PENDING_APPROVAL = true;

const fmtDate = new Intl.DateTimeFormat('es-CL', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

export default function Sales(): JSX.Element {
  const { state } = useEditor();
  const username = state.username;
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const { accountId, ready: stripeReady, loading: l1 } = useStripeAccount();
  const { ready: mpReady, loading: l2 } = useMpAccount();
  const [sales, setSales] = useState<Sale[] | null>(null);
  const [connecting, setConnecting] = useState<'' | 'stripe' | 'mp'>('');

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  // "Conectado" = cualquiera de los dos proveedores listo para cobrar.
  const connected = stripeReady || mpReady;
  const connLoading = l1 || l2;

  // Suscripción EN VIVO al historial de ventas (solo con un proveedor listo).
  useEffect(() => {
    if (!user || !username || !connected) { setSales(null); return; }
    const unsub = watchSales(username, setSales, () => setSales([]));
    return () => unsub();
  }, [user, username, connected]);

  if (!user) return <Notice>Inicia sesión para ver tus ventas.</Notice>;
  if (connLoading) return <Notice>Cargando…</Notice>;

  const connectStripe = async (): Promise<void> => {
    setConnecting('stripe');
    try { window.location.href = await onboardStripe(); } catch { setConnecting(''); }
  };
  const connectMp = async (): Promise<void> => {
    setConnecting('mp');
    try { window.location.href = await connectMercadoPago(); } catch { setConnecting(''); }
  };

  if (!connected) {
    // Stripe a medio configurar (cuenta creada pero sin charges_enabled).
    if (accountId && !stripeReady && !mpReady) {
      return <IncompleteState onContinue={connectStripe} connecting={connecting === 'stripe'} onConnectMp={connectMp} connectingMp={connecting === 'mp'} />;
    }
    return <ConnectState onConnectStripe={connectStripe} connectingStripe={connecting === 'stripe'} onConnectMp={connectMp} connectingMp={connecting === 'mp'} />;
  }

  const list = sales ?? [];
  const count = list.length;
  const totals: Record<string, number> = {};
  for (const s of list) if (s.amountTotal != null) totals[s.currency] = (totals[s.currency] ?? 0) + s.amountTotal;
  const currencies = Object.keys(totals).sort((a, b) => totals[b] - totals[a]);
  const primary = currencies[0];

  return (
    <div className="space-y-4">
      <section className="rounded-[24px] bg-gradient-to-br from-[#15240b] to-[#2c5a17] p-6 text-white shadow-[0_4px_18px_rgba(21,36,11,0.18)]">
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
        <div className="overflow-hidden rounded-[24px] bg-white shadow-[0_2px_10px_rgba(0,0,0,0.02)] ring-1 ring-black/[0.03]">
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

function MpButton({ onClick, connecting, label }: { onClick: () => void; connecting: boolean; label: string }): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={connecting}
      className="flex items-center gap-2 rounded-xl bg-[#009ee3] px-5 py-3 text-sm font-bold text-white shadow-sm transition-transform active:scale-95 disabled:opacity-70"
    >
      {connecting ? <><Loader2 size={16} className="animate-spin" /> Redirigiendo…</> : label}
    </button>
  );
}

function MpPendingPill(): JSX.Element {
  return (
    <div className="flex max-w-xs flex-col items-start gap-1 rounded-xl border border-dashed border-[#009ee3]/40 bg-[#009ee3]/5 px-5 py-3 text-left">
      <div className="flex items-center gap-2 text-sm font-bold text-[#0077b3]">
        <Clock size={16} /> Mercado Pago — próximamente
      </div>
      <p className="text-xs leading-snug text-neutral-500">
        Estamos terminando la verificación de la cuenta con MP. Vuelve en unos días.
      </p>
    </div>
  );
}

function StripeButton({ onClick, connecting, label }: { onClick: () => void; connecting: boolean; label: string }): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={connecting}
      className="flex items-center gap-2 rounded-xl bg-[#635bff] px-5 py-3 text-sm font-bold text-white shadow-sm transition-transform active:scale-95 disabled:opacity-70"
    >
      {connecting ? <><Loader2 size={16} className="animate-spin" /> Redirigiendo…</> : label}
    </button>
  );
}

function ConnectState({ onConnectStripe, connectingStripe, onConnectMp, connectingMp }: {
  onConnectStripe: () => void; connectingStripe: boolean; onConnectMp: () => void; connectingMp: boolean;
}): JSX.Element {
  return (
    <div className="flex flex-col items-center rounded-[24px] bg-white px-6 py-12 text-center shadow-[0_2px_10px_rgba(0,0,0,0.02)] ring-1 ring-black/[0.03]">
      <span className="grid h-16 w-16 place-items-center rounded-full bg-[#92c83a]/15 text-[#72a129]">
        <Landmark size={30} />
      </span>
      <p className="mt-4 text-lg font-bold text-neutral-800">Recibe pagos directamente en tu cuenta</p>
      <p className="mt-1 max-w-sm text-sm text-neutral-500">
        Conecta un medio de pago para cobrar propinas y productos. El dinero llega a tu cuenta automáticamente; bioo solo retiene una pequeña comisión.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        {MP_PENDING_APPROVAL
          ? <MpPendingPill />
          : <MpButton onClick={onConnectMp} connecting={connectingMp} label="Conectar Mercado Pago" />}
        <StripeButton onClick={onConnectStripe} connecting={connectingStripe} label="Conectar Stripe" />
      </div>
      <p className="mt-3 text-xs text-neutral-400">Mercado Pago para Chile · Stripe para pagos internacionales</p>
    </div>
  );
}

function IncompleteState({ onContinue, connecting, onConnectMp, connectingMp }: {
  onContinue: () => void; connecting: boolean; onConnectMp: () => void; connectingMp: boolean;
}): JSX.Element {
  return (
    <div className="flex flex-col items-center rounded-[24px] bg-white px-6 py-12 text-center shadow-[0_2px_10px_rgba(0,0,0,0.02)] ring-1 ring-black/[0.03]">
      <span className="grid h-16 w-16 place-items-center rounded-full bg-amber-100 text-amber-500">
        <AlertTriangle size={30} />
      </span>
      <p className="mt-4 text-lg font-bold text-neutral-800">Completa tu configuración en Stripe</p>
      <p className="mt-1 max-w-sm text-sm text-neutral-500">
        Tu cuenta de Stripe está creada pero aún no puede recibir pagos. Termina de cargar tus datos, o conecta Mercado Pago si estás en Chile.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <StripeButton onClick={onContinue} connecting={connecting} label="Continuar en Stripe" />
        {MP_PENDING_APPROVAL
          ? <MpPendingPill />
          : <MpButton onClick={onConnectMp} connecting={connectingMp} label="Conectar Mercado Pago" />}
      </div>
    </div>
  );
}

function EmptySales(): JSX.Element {
  return (
    <div className="flex flex-col items-center rounded-[24px] bg-white px-6 py-12 text-center shadow-[0_2px_10px_rgba(0,0,0,0.02)] ring-1 ring-black/[0.03]">
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
    <div className="rounded-[24px] bg-white p-5 text-center text-sm text-neutral-500 shadow-[0_2px_10px_rgba(0,0,0,0.02)] ring-1 ring-black/[0.03]">
      {children}
    </div>
  );
}
