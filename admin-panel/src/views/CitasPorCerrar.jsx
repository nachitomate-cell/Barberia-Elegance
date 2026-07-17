import { useState, useMemo } from 'react';
import {
  CalendarClock, CheckCircle2, XCircle, AlertTriangle, Loader2, Info,
} from 'lucide-react';
import { where, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { tenantCol } from '../lib/tenantUtils';
import { useCollection } from '../hooks/useCollection';
import { confirmDialog } from '../lib/confirmDialog';

const METODOS_PAGO = ['Efectivo', 'Tarjeta', 'Transferencia'];

// Firestore limita un batch a 500 escrituras. Cancelar borra también el
// slotLock (2 writes/cita), así que usamos chunks de 200 para ir seguros.
const CHUNK = 200;

function todayStr() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

function fmtFecha(f) {
  if (!f) return '—';
  const [y, m, d] = f.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
}

async function commitInChunks(items, applyFn) {
  for (let i = 0; i < items.length; i += CHUNK) {
    const batch = writeBatch(db);
    items.slice(i, i + CHUNK).forEach(c => applyFn(batch, c));
    await batch.commit();
  }
}

export default function CitasPorCerrar() {
  const hoy = todayStr();

  // `in` sobre un campo único no requiere índice compuesto. Trae solo las
  // citas "abiertas" (excluye del servidor todo el histórico Completada/Cancelada).
  const { data: citas, loading, error } = useCollection(
    'citas',
    [where('estado', 'in', ['Confirmada', 'Pendiente'])],
  );

  const [selected, setSelected]   = useState(() => new Set());
  const [metodoPago, setMetodoPago] = useState('');
  const [busy, setBusy]           = useState(false);

  // Backlog = citas abiertas con fecha estrictamente anterior a hoy.
  const backlog = useMemo(() => (
    (citas || [])
      .filter(c => c.fecha && c.fecha < hoy)
      .sort((a, b) => {
        if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha); // más viejas primero
        return (a.hora || '').localeCompare(b.hora || '');
      })
  ), [citas, hoy]);

  const allSelected = backlog.length > 0 && selected.size === backlog.length;

  const toggle = (id) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(backlog.map(c => c.id)));

  const selectedCitas = useMemo(
    () => backlog.filter(c => selected.has(c.id)),
    [backlog, selected],
  );

  const handleCompletar = async () => {
    if (!selectedCitas.length) return;
    const ok = await confirmDialog(
      `Vas a marcar ${selectedCitas.length} cita${selectedCitas.length !== 1 ? 's' : ''} como Completada${selectedCitas.length !== 1 ? 's' : ''}. ` +
      `Cuentan para Caja, Métricas e Historial, pero NO suman sellos ni piden reseña. ¿Continuar?`,
    );
    if (!ok) return;

    setBusy(true);
    try {
      await commitInChunks(selectedCitas, (batch, c) => {
        batch.update(doc(db, `${tenantCol('citas').path}/${c.id}`), {
          estado:             'Completada',
          // Marca la cita como ya procesada → la Cloud Function de sellos la ignora
          // (no suma sello ni setea pendingGoogleReview). "Solo registrar".
          selloProcesado:     true,
          selloProcesadoTipo: 'cierre_masivo',
          selloProcesadoEn:   serverTimestamp(),
          cierreMasivo:       true,
          updatedAt:          serverTimestamp(),
          ...(metodoPago ? { metodoPago } : {}),
        });
      });
      setSelected(new Set());
    } catch (err) {
      console.error('Error al completar citas:', err);
      alert('Ocurrió un error al marcar las citas. Reintentá.');
    } finally {
      setBusy(false);
    }
  };

  const handleNoShow = async () => {
    if (!selectedCitas.length) return;
    const ok = await confirmDialog(
      `Vas a marcar ${selectedCitas.length} cita${selectedCitas.length !== 1 ? 's' : ''} como no-show (Cancelada${selectedCitas.length !== 1 ? 's' : ''}). ` +
      `No cuentan para ingresos. ¿Continuar?`,
    );
    if (!ok) return;

    setBusy(true);
    try {
      await commitInChunks(selectedCitas, (batch, c) => {
        batch.update(doc(db, `${tenantCol('citas').path}/${c.id}`), {
          estado:    'Cancelada',
          updatedAt: serverTimestamp(),
        });
        if (c.slotLockId) {
          batch.delete(doc(db, `${tenantCol('slotLocks').path}/${c.slotLockId}`));
        }
      });
      setSelected(new Set());
    } catch (err) {
      console.error('Error al cancelar citas:', err);
      alert('Ocurrió un error al cancelar las citas. Reintentá.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
      {/* Encabezado */}
      <div className="flex items-start gap-3 mb-4">
        <span className="flex p-2 rounded-xl bg-amber-500/15 shrink-0">
          <CalendarClock className="h-5 w-5 text-amber-500" />
        </span>
        <div>
          <h1 className="text-xl font-bold text-primary [html.light_&]:text-ink-900 leading-tight">Citas por cerrar</h1>
          <p className="text-sm text-slate-400 [html.light_&]:text-ink-600 mt-0.5">
            Citas pasadas que quedaron sin marcar. Ponte al día cerrándolas en lote.
          </p>
        </div>
      </div>

      {/* Alerta destacada — regla clave sobre el efecto de cada acción */}
      <div className="bg-indigo-500/10 [html.light_&]:bg-indigo-50 border-l-4 border-indigo-500 [html.light_&]:border-indigo-400 rounded-r-xl p-4 mb-6">
        <p className="text-indigo-400 [html.light_&]:text-indigo-700 font-bold text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
          <Info size={13} />
          Cómo funciona este cierre
        </p>
        <ul className="space-y-2 text-sm text-slate-300 [html.light_&]:text-ink-700 leading-relaxed">
          <li className="flex gap-2">
            <span className="text-indigo-400/70 [html.light_&]:text-indigo-500 shrink-0">•</span>
            <span>
              <strong className="font-semibold text-primary [html.light_&]:text-ink-900">Completar</strong> registra la cita en Caja, Métricas e Historial. Para evitar spam,{' '}
              <span className="text-amber-400 [html.light_&]:text-amber-600 font-medium">no suma sellos ni pide reseña de Google</span>{' '}
              (cierre retroactivo).
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-indigo-400/70 [html.light_&]:text-indigo-500 shrink-0">•</span>
            <span>
              Si el cliente no asistió, márcala estrictamente como{' '}
              <strong className="text-rose-400 [html.light_&]:text-rose-600 font-semibold">No-show</strong>.
            </span>
          </li>
        </ul>
      </div>

      {/* Estados de carga / error / vacío */}
      {error ? (
        <div className="flex flex-col items-center py-16 gap-2 text-center">
          <AlertTriangle size={32} className="text-red-500/70" />
          <p className="text-sm text-slate-400">No se pudieron cargar las citas.</p>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
        </div>
      ) : backlog.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-2 text-center">
          <CheckCircle2 size={36} className="text-emerald-500/70" />
          <p className="text-sm font-medium text-primary">¡Todo al día!</p>
          <p className="text-xs text-slate-500">No hay citas pasadas sin cerrar.</p>
        </div>
      ) : (
        <>
          {/* Barra de seleccionar todo — cabecera adherida a la lista */}
          <div className="flex items-center justify-between bg-slate-900/50 [html.light_&]:bg-white p-3 rounded-t-xl border border-slate-700/50 [html.light_&]:border-ink-200 border-b-slate-700/50">
            <label className="flex items-center gap-3 text-sm text-slate-300 [html.light_&]:text-ink-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="w-5 h-5 rounded bg-slate-800 [html.light_&]:bg-ink-100 border-slate-600 [html.light_&]:border-ink-300 accent-indigo-600 focus:ring-2 focus:ring-indigo-500/40 cursor-pointer"
              />
              <span className="font-medium">Seleccionar todo</span>
            </label>
            <span className="text-xs font-medium text-slate-500 [html.light_&]:text-ink-500 tabular-nums">
              {selected.size > 0 ? `${selected.size} de ${backlog.length}` : `${backlog.length} cita${backlog.length !== 1 ? 's' : ''}`}
            </span>
          </div>

          {/* Lista de citas — pb-32 para que la ultima card no quede bajo el footer */}
          <div className="pt-3 pb-32">
            {backlog.map(c => {
              const checked = selected.has(c.id);
              const isPendiente = c.estado === 'Pendiente';
              return (
                <div
                  key={c.id}
                  onClick={() => toggle(c.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(c.id); } }}
                  className={`flex items-center gap-4 rounded-xl p-4 mb-3 border transition-colors cursor-pointer ${
                    checked
                      ? 'bg-indigo-900/20 [html.light_&]:bg-indigo-50 border-indigo-500/50 [html.light_&]:border-indigo-200 hover:bg-indigo-900/30 [html.light_&]:hover:bg-indigo-100/70'
                      : 'bg-slate-800/40 [html.light_&]:bg-white border-slate-700/50 [html.light_&]:border-ink-200 hover:bg-slate-800/80 [html.light_&]:hover:bg-ink-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(c.id)}
                    onClick={e => e.stopPropagation()}
                    className="w-5 h-5 rounded bg-slate-800 [html.light_&]:bg-ink-100 border-slate-600 [html.light_&]:border-ink-300 accent-indigo-600 focus:ring-2 focus:ring-indigo-500/40 cursor-pointer shrink-0"
                  />
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      isPendiente
                        ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                        : 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                    }`}
                    aria-label={isPendiente ? 'Pendiente' : 'Confirmada'}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-primary [html.light_&]:text-ink-900 font-bold text-base truncate">{c.clienteNombre || 'Sin nombre'}</p>
                    <p className="text-slate-400 [html.light_&]:text-ink-600 text-sm truncate">
                      {c.servicioNombre || '—'}{c.barbero ? ` · ${c.barbero}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <p className="text-[10px] text-slate-400 [html.light_&]:text-ink-500 uppercase tracking-wider">{fmtFecha(c.fecha)}</p>
                    <p className="text-sm font-medium text-slate-300 [html.light_&]:text-ink-700 tabular-nums mt-0.5">{c.hora || '—'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Barra de acciones sticky — glassmorphism, 2 filas. z-40 para que el
          menu lateral mobile (z-60) siga por encima al abrirse. */}
      {selected.size > 0 && (
        <div className="sticky bottom-0 w-full bg-slate-900/85 [html.light_&]:bg-white/90 backdrop-blur-xl border-t border-slate-700/50 [html.light_&]:border-ink-200 p-4 flex flex-col gap-3 z-40 shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.3)] rounded-b-xl">
          {/* Fila 1 — contador + selector de pago */}
          <div className="flex items-center justify-between w-full">
            <span className="text-sm font-medium text-slate-300 [html.light_&]:text-ink-600">
              {selected.size} seleccionada{selected.size !== 1 ? 's' : ''}
            </span>
            <select
              value={metodoPago}
              onChange={e => setMetodoPago(e.target.value)}
              disabled={busy}
              className="bg-slate-800 [html.light_&]:bg-ink-50 border border-slate-600 [html.light_&]:border-ink-300 text-slate-200 [html.light_&]:text-ink-700 text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 py-2 pl-3 pr-8 w-auto min-w-[160px] disabled:opacity-50"
              title="Método de pago para las citas completadas (opcional)"
            >
              <option value="">Pago: sin especificar</option>
              {METODOS_PAGO.map(m => <option key={m} value={m}>Pago: {m}</option>)}
            </select>
          </div>

          {/* Fila 2 — botones de acción al mismo ancho */}
          <div className="flex items-center gap-3 w-full">
            <button
              onClick={handleNoShow}
              disabled={busy}
              className="flex-1 bg-rose-500/10 [html.light_&]:bg-rose-50 border border-rose-500/20 [html.light_&]:border-rose-200 hover:bg-rose-500/20 [html.light_&]:hover:bg-rose-100 disabled:opacity-50 text-rose-400 [html.light_&]:text-rose-600 font-medium py-3 rounded-xl transition-colors flex justify-center items-center gap-2"
            >
              <XCircle size={16} />
              No-show
            </button>

            <button
              onClick={handleCompletar}
              disabled={busy}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-primary font-medium py-3 rounded-xl shadow-lg shadow-emerald-900/20 transition-colors flex justify-center items-center gap-2"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Completar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
