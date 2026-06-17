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
    <div className="max-w-3xl mx-auto px-4 py-6 sm:px-6 lg:px-8 pb-32">
      {/* Encabezado */}
      <div className="flex items-start gap-3 mb-1">
        <span className="flex p-2 rounded-xl bg-amber-500/15 shrink-0">
          <CalendarClock className="h-5 w-5 text-amber-500" />
        </span>
        <div>
          <h1 className="text-lg font-bold text-white leading-tight">Citas por cerrar</h1>
          <p className="text-sm text-slate-400">
            Citas pasadas que quedaron sin marcar. Ponéte al día cerrándolas en lote.
          </p>
        </div>
      </div>

      {/* Nota de efectos */}
      <div className="flex items-start gap-2 mt-4 mb-5 text-xs text-slate-400 bg-slate-800/40 border border-slate-800 rounded-xl px-3 py-2.5">
        <Info size={14} className="text-slate-500 shrink-0 mt-0.5" />
        <p>
          <strong className="text-slate-300">Completar</strong> registra la cita en Caja, Métricas e Historial,
          pero <strong className="text-slate-300">no</strong> suma sellos ni pide reseña de Google
          (cierre retroactivo). Las que el cliente no asistió, marcalas como <strong className="text-slate-300">no-show</strong>.
        </p>
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
          <p className="text-sm font-medium text-white">¡Todo al día!</p>
          <p className="text-xs text-slate-500">No hay citas pasadas sin cerrar.</p>
        </div>
      ) : (
        <>
          {/* Barra de selección */}
          <div className="flex items-center justify-between mb-2 px-1">
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500/50"
              />
              Seleccionar todo
            </label>
            <span className="text-xs text-slate-500">
              {selected.size > 0 ? `${selected.size} de ${backlog.length}` : `${backlog.length} cita${backlog.length !== 1 ? 's' : ''}`}
            </span>
          </div>

          {/* Lista */}
          <div className="space-y-1.5">
            {backlog.map(c => {
              const checked = selected.has(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => toggle(c.id)}
                  className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                    checked
                      ? 'bg-amber-500/10 border-amber-500/40'
                      : 'bg-slate-800/50 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(c.id)}
                    onClick={e => e.stopPropagation()}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500/50 shrink-0"
                  />
                  <span className={`w-2 h-2 rounded-full shrink-0 ${c.estado === 'Pendiente' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{c.clienteNombre || 'Sin nombre'}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {c.servicioNombre || '—'}{c.barbero ? ` · ${c.barbero}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-slate-400">{fmtFecha(c.fecha)}</p>
                    <p className="text-[10px] text-slate-600">{c.hora || '—'}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Barra de acciones (sticky) */}
      {selected.size > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-30 bg-slate-900/95 backdrop-blur border-t border-slate-800">
          <div className="max-w-3xl mx-auto px-4 py-3 sm:px-6 lg:px-8 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 mr-auto">
              <span className="text-sm font-semibold text-white">{selected.size}</span>
              <span className="text-xs text-slate-400">seleccionada{selected.size !== 1 ? 's' : ''}</span>
            </div>

            <select
              value={metodoPago}
              onChange={e => setMetodoPago(e.target.value)}
              disabled={busy}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 disabled:opacity-50"
              title="Método de pago para las citas completadas (opcional)"
            >
              <option value="">Pago: sin especificar</option>
              {METODOS_PAGO.map(m => <option key={m} value={m}>Pago: {m}</option>)}
            </select>

            <button
              onClick={handleNoShow}
              disabled={busy}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 disabled:opacity-50 text-sm font-semibold transition-colors"
            >
              <XCircle size={16} />
              No-show
            </button>

            <button
              onClick={handleCompletar}
              disabled={busy}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 text-emerald-950 hover:bg-emerald-400 disabled:opacity-50 text-sm font-bold transition-colors active:scale-95"
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
