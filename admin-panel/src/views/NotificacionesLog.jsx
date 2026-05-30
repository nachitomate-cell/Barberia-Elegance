import { useState, useCallback } from 'react';
import { Bell, RefreshCw, Search } from 'lucide-react';
import {
  collection, query, where, orderBy, limit, getDocs, Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useTenant } from '../contexts/TenantContext';

const PAGE_SIZE = 200;

const TYPE_META = {
  push_confirmacion:      { label: 'Push · Cita confirmada',     color: 'bg-emerald-500/10 text-emerald-400' },
  email_confirmacion:     { label: 'Email · Confirmación',       color: 'bg-blue-500/10 text-blue-400'       },
  email_recordatorio_1h:  { label: 'Email · Recordatorio 1h',   color: 'bg-sky-500/10 text-sky-400'         },
  whatsapp_24h:           { label: 'WhatsApp · Recordatorio 24h', color: 'bg-green-500/10 text-green-400'   },
  push_sello:             { label: 'Push · Sello ganado',        color: 'bg-amber-500/10 text-amber-400'     },
  push_cumpleanos:        { label: 'Push · Cumpleaños',          color: 'bg-pink-500/10 text-pink-400'       },
  push_recordatorio_corte:{ label: 'Push · Recordatorio corte',  color: 'bg-violet-500/10 text-violet-400'  },
  whatsapp_reactivacion:  { label: 'WhatsApp · Reactivación',   color: 'bg-lime-500/10 text-lime-400'       },
};

const CHANNEL_EMOJI = { push: '📱', email: '✉️', whatsapp: '💬' };

function todayStr()     { return new Date().toISOString().slice(0, 10); }
function daysAgoStr(n)  { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); }

function fmtDT(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function NotificacionesLog() {
  const { id: tenantId } = useTenant();
  const isGlobal = tenantId === 'elegance';

  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded,  setLoaded]  = useState(false);
  const [error,   setError]   = useState(null);

  const [dateFrom, setDateFrom] = useState(daysAgoStr(7));
  const [dateTo,   setDateTo]   = useState(todayStr());
  const [fTenant,  setFTenant]  = useState('');
  const [fType,    setFType]    = useState('');
  const [fChannel, setFChannel] = useState('');
  const [fStatus,  setFStatus]  = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const start = new Date(dateFrom + 'T00:00:00');
      const end   = new Date(dateTo   + 'T23:59:59');
      const q = query(
        collection(db, 'notification_logs'),
        where('sentAt', '>=', Timestamp.fromDate(start)),
        where('sentAt', '<=', Timestamp.fromDate(end)),
        orderBy('sentAt', 'desc'),
        limit(PAGE_SIZE),
      );
      const snap = await getDocs(q);
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoaded(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  const filtered = logs.filter(log => {
    if (!isGlobal && log.tenantId !== tenantId) return false;
    if (fTenant  && log.tenantId !== fTenant)   return false;
    if (fType    && log.type     !== fType)      return false;
    if (fChannel && log.channel  !== fChannel)   return false;
    if (fStatus  && log.status   !== fStatus)    return false;
    return true;
  });

  const stats = {
    total:    filtered.length,
    push:     filtered.filter(l => l.channel === 'push').length,
    email:    filtered.filter(l => l.channel === 'email').length,
    whatsapp: filtered.filter(l => l.channel === 'whatsapp').length,
  };

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-6xl mx-auto">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Bell size={20} className="text-slate-400" />
          Log de Notificaciones
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Auditoría de push, emails y WhatsApp enviados por las automatizaciones</p>
      </div>

      {/* Filters */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
        <div className="flex flex-wrap gap-3 items-end">

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Desde</label>
            <input
              type="date" value={dateFrom} max={dateTo}
              onChange={e => setDateFrom(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Hasta</label>
            <input
              type="date" value={dateTo} min={dateFrom} max={todayStr()}
              onChange={e => setDateTo(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-500"
            />
          </div>

          {isGlobal && (
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Tenant</label>
              <input
                type="text" placeholder="ej: chameleon" value={fTenant}
                onChange={e => setFTenant(e.target.value.trim().toLowerCase())}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white w-36 focus:outline-none focus:border-slate-500"
              />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Canal</label>
            <select
              value={fChannel} onChange={e => setFChannel(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
            >
              <option value="">Todos</option>
              <option value="push">Push</option>
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Tipo</label>
            <select
              value={fType} onChange={e => setFType(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
            >
              <option value="">Todos</option>
              {Object.entries(TYPE_META).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Estado</label>
            <select
              value={fStatus} onChange={e => setFStatus(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
            >
              <option value="">Todos</option>
              <option value="sent">Enviado</option>
              <option value="failed">Fallido</option>
            </select>
          </div>

          <button
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-all active:scale-95"
          >
            {loading
              ? <RefreshCw size={14} className="animate-spin" />
              : <Search size={14} />
            }
            {loaded ? 'Recargar' : 'Buscar'}
          </button>

        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-950/30 border border-red-800/40 rounded-xl p-4 text-sm text-red-400">
          Error al cargar: {error}
          {error.includes('index') && (
            <p className="mt-1 text-xs text-red-400/70">
              Es posible que necesites crear el índice en Firestore para el campo <code className="font-mono">sentAt</code>.
            </p>
          )}
        </div>
      )}

      {/* Stats */}
      {loaded && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total',    value: stats.total,    color: 'text-white'       },
            { label: 'Push',     value: stats.push,     color: 'text-emerald-400' },
            { label: 'Email',    value: stats.email,    color: 'text-blue-400'    },
            { label: 'WhatsApp', value: stats.whatsapp, color: 'text-green-400'   },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Results table */}
      {loaded && filtered.length === 0 && (
        <div className="text-center py-16 text-slate-500">
          <Bell size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">Sin notificaciones en este período</p>
        </div>
      )}

      {loaded && filtered.length > 0 && (
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-slate-500 font-bold whitespace-nowrap">Fecha</th>
                  {isGlobal && <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-slate-500 font-bold">Tenant</th>}
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-slate-500 font-bold">Tipo</th>
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-slate-500 font-bold">Destinatario</th>
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-slate-500 font-bold">Detalle</th>
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-slate-500 font-bold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log, i) => {
                  const typeInfo = TYPE_META[log.type] ?? { label: log.type, color: 'bg-slate-700/50 text-slate-300' };
                  return (
                    <tr
                      key={log.id}
                      className={`border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors ${i % 2 !== 0 ? 'bg-slate-800/20' : ''}`}
                    >
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap font-mono text-xs">
                        {fmtDT(log.sentAt)}
                      </td>

                      {isGlobal && (
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono bg-slate-700/50 text-slate-300 px-2 py-0.5 rounded">
                            {log.tenantId}
                          </span>
                        </td>
                      )}

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${typeInfo.color}`}>
                          <span className="text-[11px]">{CHANNEL_EMOJI[log.channel] ?? '📤'}</span>
                          <span>{typeInfo.label}</span>
                        </span>
                      </td>

                      <td className="px-4 py-3 min-w-[140px]">
                        <p className="text-white text-xs font-medium">{log.to?.nombre || '—'}</p>
                        <p className="text-slate-500 text-xs truncate max-w-[180px]">
                          {log.to?.email || log.to?.telefono || ''}
                        </p>
                      </td>

                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                        {log.meta?.servicio && <span>{log.meta.servicio}</span>}
                        {log.meta?.fecha    && (
                          <span className="ml-2 text-slate-500">
                            {log.meta.fecha}{log.meta?.hora ? ` ${log.meta.hora}` : ''}
                          </span>
                        )}
                        {log.meta?.sellos   && <span className="text-amber-400">{log.meta.sellos} sellos</span>}
                        {log.meta?.citaId   && (
                          <span className="ml-2 text-slate-600 font-mono text-[10px]">
                            #{log.meta.citaId.slice(-6)}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          log.status === 'sent'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-red-500/10 text-red-400'
                        }`}>
                          {log.status === 'sent' ? 'Enviado' : 'Fallido'}
                        </span>
                        {log.error && (
                          <p className="text-[10px] text-red-400/60 mt-0.5 max-w-[160px] truncate">{log.error}</p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-slate-700/50 flex items-center justify-between gap-4">
            <p className="text-xs text-slate-500">
              {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
              {logs.length !== filtered.length ? ` (de ${logs.length} leídos)` : ''}
            </p>
            {logs.length >= PAGE_SIZE && (
              <p className="text-xs text-amber-400">
                Límite de {PAGE_SIZE} docs alcanzado — acota el rango de fechas para ver más
              </p>
            )}
          </div>
        </div>
      )}

      {/* Empty state before first search */}
      {!loaded && !loading && (
        <div className="text-center py-16 text-slate-500">
          <Bell size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">Selecciona un rango y haz clic en Buscar</p>
          <p className="text-xs mt-1 text-slate-600">Los datos aparecen desde que se desplegaron las funciones con logging</p>
        </div>
      )}

    </div>
  );
}
