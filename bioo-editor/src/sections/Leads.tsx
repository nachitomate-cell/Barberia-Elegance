import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { Download, Inbox, RefreshCw } from 'lucide-react';
import { auth } from '../lib/firebase';
import { loadLeads, type Lead } from '../lib/leads';
import { useEditor } from '../store';

const fmt = new Intl.DateTimeFormat('es-CL', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

export default function Leads(): JSX.Element {
  const { state } = useEditor();
  const username = state.username;
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  const refresh = useCallback(async (): Promise<void> => {
    if (!user || !username) return;
    setLoading(true);
    setError('');
    try {
      setLeads(await loadLeads(username));
    } catch {
      setError('No se pudieron cargar los leads. Revisa tu conexión.');
    } finally {
      setLoading(false);
    }
  }, [user, username]);

  useEffect(() => { void refresh(); }, [refresh]);

  if (!user) return <Notice>Inicia sesión para ver los correos capturados.</Notice>;

  const count = leads?.length ?? 0;

  const exportCsv = (): void => {
    if (!leads || !count) return;
    const rows: string[][] = [
      ['Email', 'Fecha de suscripción'],
      ...leads.map((l) => [l.email, l.ts ? new Date(l.ts).toISOString() : '']),
    ];
    const csv = rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads_${username || 'bioo'}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-neutral-800">{count} {count === 1 ? 'suscriptor' : 'suscriptores'}</p>
          <p className="truncate text-xs text-neutral-400">Correos capturados por tus bloques de suscripción</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => void refresh()}
            title="Actualizar"
            className="grid h-9 w-9 place-items-center rounded-xl bg-neutral-100 text-neutral-500 transition-all hover:bg-neutral-200 active:scale-95"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={!count}
            className="flex items-center gap-2 rounded-xl bg-[#92c83a] px-4 py-2 text-sm font-bold text-[#15240b] shadow-sm transition-all active:scale-95 disabled:opacity-40"
          >
            <Download size={15} /> Exportar CSV
          </button>
        </div>
      </div>

      {error && <Notice>{error}</Notice>}
      {leads === null && loading && <Notice>Cargando…</Notice>}
      {leads && count === 0 && !loading && <EmptyState />}

      {leads && count > 0 && (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/[0.04]">
          <div className="max-h-[60dvh] overflow-x-auto overflow-y-auto">
            <table className="w-full min-w-[420px] border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-neutral-50/95 backdrop-blur">
                <tr className="text-left text-xs font-bold uppercase tracking-wider text-neutral-400">
                  <th className="whitespace-nowrap px-4 py-3">Email</th>
                  <th className="whitespace-nowrap px-4 py-3">Fecha de suscripción</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id} className="border-t border-neutral-100 transition-colors hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-neutral-800">{l.email}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-neutral-500">{l.ts ? fmt.format(l.ts) : '—'}</td>
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

function csvCell(v: string): string {
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
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
        <Inbox size={30} />
      </span>
      <p className="mt-4 text-base font-bold text-neutral-800">Aún no hay suscriptores</p>
      <p className="mt-1 max-w-xs text-sm text-neutral-500">
        Agrega un bloque de <strong className="font-bold text-neutral-600">Suscripción</strong> en Enlaces y comparte tu página para empezar a capturar correos.
      </p>
    </div>
  );
}
