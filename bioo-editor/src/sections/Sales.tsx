import { useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { CircleDollarSign, TrendingUp, Landmark, Loader2, AlertTriangle, Clock, HelpCircle, ShoppingBag, HandCoins, Wallet, ShieldCheck } from 'lucide-react';
import { auth } from '../lib/firebase';
import { watchSales, formatMoney, type Sale } from '../lib/sales';
import { useStripeAccount, onboardStripe, useMpAccount, connectMercadoPago } from '../lib/connect';
import { useEditor } from '../store';
import InfoModal, { InfoStep, InfoBlock, InfoRow } from '../components/InfoModal';

// Mercado Pago en homologación con MP (validando datos de la cuenta plataforma).
// Mientras esté en true, el botón "Conectar Mercado Pago" se reemplaza por un
// aviso "Próximamente". Cambiar a false cuando MP apruebe la app marketplace.
const MP_PENDING_APPROVAL = false;

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
  const [helpOpen, setHelpOpen] = useState(false);

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

  const connectStripe = async (): Promise<void> => {
    setConnecting('stripe');
    try { window.location.href = await onboardStripe(); } catch { setConnecting(''); }
  };
  const connectMp = async (): Promise<void> => {
    setConnecting('mp');
    try { window.location.href = await connectMercadoPago(); } catch { setConnecting(''); }
  };

  const body = ((): JSX.Element => {
    if (!user) return <Notice>Inicia sesión para ver tus ventas.</Notice>;
    if (connLoading) return <Notice>Cargando…</Notice>;
    if (!connected) {
      if (accountId && !stripeReady && !mpReady) {
        return <IncompleteState onContinue={connectStripe} connecting={connecting === 'stripe'} onConnectMp={connectMp} connectingMp={connecting === 'mp'} />;
      }
      return <ConnectState onConnectStripe={connectStripe} connectingStripe={connecting === 'stripe'} onConnectMp={connectMp} connectingMp={connecting === 'mp'} />;
    }
    return <ConnectedView sales={sales} />;
  })();

  return (
    <div className="space-y-4">
      <HelpPill onClick={() => setHelpOpen(true)} />
      {body}
      <SalesHelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} username={username} />
    </div>
  );
}

function HelpPill({ onClick }: { onClick: () => void }): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-[#92c83a]/40 bg-[#92c83a]/[0.06] px-4 py-3 text-left transition-colors hover:bg-[#92c83a]/[0.12]"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[#72a129] ring-1 ring-[#92c83a]/30">
        <HelpCircle size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <p className="text-sm font-bold text-[#15240b]">¿Cómo funciona Ventas?</p>
        <p className="text-xs text-neutral-500">Conexión, cobros, comisión y depósitos — en 1 minuto.</p>
      </span>
      <span className="shrink-0 text-xs font-bold text-[#72a129]">Ver guía</span>
    </button>
  );
}

function ConnectedView({ sales }: { sales: Sale[] | null }): JSX.Element {
  const list = sales ?? [];
  const count = list.length;
  const totals: Record<string, number> = {};
  for (const s of list) if (s.amountTotal != null) totals[s.currency] = (totals[s.currency] ?? 0) + s.amountTotal;
  const currencies = Object.keys(totals).sort((a, b) => totals[b] - totals[a]);
  const primary = currencies[0];

  return (
    <>
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
    </>
  );
}

function SalesHelpModal({ isOpen, onClose, username }: { isOpen: boolean; onClose: () => void; username: string }): JSX.Element {
  return (
    <InfoModal
      isOpen={isOpen}
      onClose={onClose}
      icon={CircleDollarSign}
      title="Cómo funciona Ventas"
      kicker="Cobra propinas y vende productos digitales desde tu bioo.cl — directo a tu cuenta."
    >
      <div className="space-y-5">
        <InfoBlock title="El flujo en 4 pasos">
          <InfoStep n={1} title="Conecta tu medio de pago">
            Elige <b>Mercado Pago</b> (CLP, ideal en Chile) o <b>Stripe</b> (USD/EUR, audiencia internacional). Puedes tener uno o ambos. El onboarding es 100% en su sitio: verifican tu identidad y datos bancarios.
          </InfoStep>
          <InfoStep n={2} title="Agrega bloques de venta en tu página">
            Desde <b>Enlaces</b> → "Agregar bloque" puedes sumar <b>Propina</b> (monto sugerido o libre) y <b>Producto</b> (digital, con precio fijo). Aparecen como botones nativos dentro de tu bioo.cl/{username}.
          </InfoStep>
          <InfoStep n={3} title="Tu visitante paga sin salir">
            Al tocar el botón se abre el checkout (MP o Stripe). El cobro queda registrado contra <i>tu</i> cuenta — bioo nunca toca el dinero. Quedará reflejado en este panel <b>en vivo</b>.
          </InfoStep>
          <InfoStep n={4} title="Recibes el depósito automático">
            Mercado Pago/Stripe te depositan en tu cuenta bancaria según su calendario (24–72 h MP en Chile, 2–7 días Stripe). No tienes que hacer nada manual.
          </InfoStep>
        </InfoBlock>

        <InfoBlock title="¿Qué proveedor elegir?">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#009ee3]/10 text-[#009ee3]"><Wallet size={18} /></span>
            <div>
              <p className="font-bold text-[#15240b]">Mercado Pago — Chile</p>
              <p className="text-xs text-neutral-500">Pesos chilenos (CLP). Tarjetas locales, Webpay, transferencia. Ideal si tu audiencia está en Chile.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#635bff]/10 text-[#635bff]"><HandCoins size={18} /></span>
            <div>
              <p className="font-bold text-[#15240b]">Stripe — Internacional</p>
              <p className="text-xs text-neutral-500">Multimoneda (USD/EUR/etc.). Tarjetas globales, Apple Pay, Google Pay. Ideal para audiencia fuera de Chile.</p>
            </div>
          </div>
          <p className="text-xs text-neutral-400">💡 Puedes conectar los dos. Cada bloque cobra con el que esté disponible para esa moneda.</p>
        </InfoBlock>

        <InfoBlock title="Comisiones y dinero">
          <InfoRow label="Comisión bioo" value="0% sobre tus ventas" />
          <InfoRow label="Comisión del proveedor" value="MP/Stripe (~3,5% + IVA)" />
          <InfoRow label="Quién recibe el dinero" value="Tú directamente" />
          <InfoRow label="Plazo de depósito" value="24–72 h (MP) · 2–7 d (Stripe)" />
          <p className="pt-1 text-xs text-neutral-500">No retenemos dinero. Cada transacción va de tu comprador a tu cuenta MP/Stripe; nosotros solo conectamos el botón.</p>
        </InfoBlock>

        <InfoBlock title="Tipos de bloques de venta">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-600"><HandCoins size={18} /></span>
            <div>
              <p className="font-bold text-[#15240b]">Propina</p>
              <p className="text-xs text-neutral-500">Monto libre o sugerido (ej. $1.000 / $3.000 / $5.000). Perfecto para creadores, artistas, baristas, peluqueros.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#92c83a]/15 text-[#72a129]"><ShoppingBag size={18} /></span>
            <div>
              <p className="font-bold text-[#15240b]">Producto digital</p>
              <p className="text-xs text-neutral-500">Precio fijo. Tras pagar, el comprador recibe un email con tu link de descarga (PDF, curso, preset, etc.).</p>
            </div>
          </div>
        </InfoBlock>

        <InfoBlock title="Seguridad y privacidad">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-600"><ShieldCheck size={18} /></span>
            <p className="text-xs leading-relaxed text-neutral-600">
              bioo <b>nunca</b> ve los datos de tarjeta del comprador. Todo el checkout corre en los servidores certificados PCI-DSS de Mercado Pago/Stripe. Nosotros solo vemos: monto, email del comprador y fecha — lo que ves en esta tabla.
            </p>
          </div>
        </InfoBlock>
      </div>
    </InfoModal>
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
      <div className="mt-5 flex flex-wrap items-start justify-center gap-3">
        <div className="flex flex-col items-center gap-1">
          {MP_PENDING_APPROVAL
            ? <MpPendingPill />
            : <MpButton onClick={onConnectMp} connecting={connectingMp} label="Conectar Mercado Pago" />}
          <span className="text-[11px] font-medium text-neutral-400">Pagos en Chile (CLP)</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <StripeButton onClick={onConnectStripe} connecting={connectingStripe} label="Conectar Stripe" />
          <span className="text-[11px] font-medium text-[#635bff]">Pagos internacionales (USD/EUR)</span>
        </div>
      </div>
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
      <div className="mt-5 flex flex-wrap items-start justify-center gap-3">
        <div className="flex flex-col items-center gap-1">
          <StripeButton onClick={onContinue} connecting={connecting} label="Continuar en Stripe" />
          <span className="text-[11px] font-medium text-[#635bff]">Pagos internacionales (USD/EUR)</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          {MP_PENDING_APPROVAL
            ? <MpPendingPill />
            : <MpButton onClick={onConnectMp} connecting={connectingMp} label="Conectar Mercado Pago" />}
          <span className="text-[11px] font-medium text-neutral-400">Pagos en Chile (CLP)</span>
        </div>
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
