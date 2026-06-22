import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { CircleDollarSign, RefreshCw, TrendingUp } from 'lucide-react';
import { auth } from '../lib/firebase';
import { loadSales, formatMoney, type Sale } from '../lib/sales';
import { useEditor } from '../store';

const fmtDate = new Intl.DateTimeFormat('es-CL', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

export default function Sales(): JSX.Element {
  const { state } = useEditor();
  const username = state.username;
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [sales, setSales] = useState<Sale[] | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  const refresh = useCallback(async (): Promise<void> => {
    if (!user || !username) return;
    setLoading(true);
    setError('');
    try {
      setSales(await loadSales(username));
    } catch {
      setError('No se pudo cargar el historial de ventas.');
    } finally {
      setLoading(false);
    }
  }, [user, username]);

  useEffect(() => { void refresh(); }, [refresh]);

  if (!user) return <Notice>Inicia sesión para ver tus ventas.</Notice>;

  const list = sales ?? [];
  const count = list.length;

  // Totales por moneda (suma en unidad menor); moneda principal = la de mayor total.
  const totals: Record<string, number> = {};
  for (const s of list) if (s.amountTotal != null) totals[s.currency] = (totals[s.currency] ?? 0) + s.amountTotal;
  const currencies = Object.keys(totals).sort((a, b) => totals[b] - totals[a]);
  const primary = currencies[0];

  return (
    <div className="space-y-4">
      {/* Hero de ingresos */}
      <section className="rounded-2xl bg-gradient-to-br from-[#15240b] to-[#2c5a17] p-5 text-white shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/70">
          <TrendingUp size={14} /> Total de ingresos
        </div>
        <p className="mt-2 text-3xl font-black tracking-tight">
          {primary ? formatMoney(totals[primary], primary) : '$0'}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/70">
          <span>{count} {count === 1 ? 'venta' : 'ventas'}</span>
          {currencies.slice(1).map((c) => <span key={c}>· {formatMoney(totals[c], c)}</span>)}
        </div>
      </section>

      <div className="flex items-center justify-between">
        <p className="text-xs text-neutral-400">Historial de ventas</p>
        <button
          type="button"
          onClick={() => void refresh()}
          title="Actualizar"
          className="grid h-9 w-9 place-items-center rounded-xl bg-neutral-100 text-neutral-500 transition-all hover:bg-neutral-200 active:scale-95"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && <Notice>{error}</Notice>}
      {sales === null && loading && <Notice>Cargando…</Notice>}
      {sales && count === 0 && !loading && <EmptyState />}

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

function Notice({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="rounded-2xl bg-white p-5 text-center text-sm text-neutral-500 shadow-sm ring-1 ring-black/[0.04]">
      {children}
    </div>
  );
}

function EmptyState(): JSX.Element {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-white px-6 py-12 text-center shadow-sm ring-1 ring-black/[0.04]">
      <span className="grid h-16 w-16 place-items-center rounded-full bg-[#92c83a]/15 text-[#72a129]">
        <CircleDollarSign size={30} />
      </span>
      <p className="mt-4 text-base font-bold text-neutral-800">Aún no tienes ventas</p>
      <p className="mt-1 max-w-xs text-sm text-neutral-500">
        Crea un bloque <strong className="font-bold text-neutral-600">Vender Producto/Enlace</strong> en Enlaces y compártelo. Tus ventas aparecerán aquí en tiempo real.
      </p>
    </div>
  );
}
