import { useState, useMemo } from 'react';
import { AlertTriangle, ChevronRight, CheckCircle2, XCircle } from 'lucide-react';
import { where, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { tenantCol } from '../lib/tenantUtils';
import { useCollection } from '../hooks/useCollection';

// Modal para gestionar citas pendientes rápidamente
function PendingAppointmentsModal({ citas, onClose }) {
  const [loadingIds, setLoadingIds] = useState(new Set());
  const navigate = useNavigate();

  const handleCancel = async (cita) => {
    setLoadingIds(prev => new Set(prev).add(cita.id));
    try {
      const payload = { estado: 'Cancelada' };
      if (cita.slotLockId) {
        const batch = writeBatch(db);
        batch.update(doc(db, `${tenantCol('citas').path}/${cita.id}`), payload);
        batch.delete(doc(db, `${tenantCol('slotLocks').path}/${cita.slotLockId}`));
        await batch.commit();
      } else {
        await updateDoc(doc(db, `${tenantCol('citas').path}/${cita.id}`), payload);
      }
    } catch (err) {
      console.error('Error al cancelar cita:', err);
      alert('Error al cancelar la cita');
    } finally {
      setLoadingIds(prev => { const next = new Set(prev); next.delete(cita.id); return next; });
    }
  };

  const handleComplete = (cita) => {
    onClose();
    navigate(`/agenda?completar=${cita.id}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-md bg-slate-900 border border-amber-500/30 rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-amber-500/10 rounded-t-2xl">
          <div className="flex items-center gap-2 text-amber-500">
            <AlertTriangle size={20} />
            <h3 className="font-semibold">Cierres Pendientes ({citas.length})</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-amber-500/60 hover:text-amber-500 hover:bg-amber-500/20 transition-all">
            <XCircle size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          <p className="text-sm text-slate-400 mb-4">
            Marca si estas citas fueron completadas o canceladas para mantener tu agenda al día:
          </p>

          {citas.map(cita => (
            <div key={cita.id} className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-700 text-slate-300">
                    {cita.fecha} {cita.hora}
                  </span>
                  <span className="text-xs text-slate-500 truncate">{cita.barbero}</span>
                </div>
                <p className="text-sm font-medium text-white truncate">{cita.clienteNombre}</p>
                <p className="text-xs text-slate-400 truncate">{cita.servicioNombre}</p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  disabled={loadingIds.has(cita.id)}
                  onClick={() => handleCancel(cita)}
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 disabled:opacity-50"
                  title="Cancelar cita"
                >
                  <XCircle size={18} />
                </button>
                <button
                  disabled={loadingIds.has(cita.id)}
                  onClick={() => handleComplete(cita)}
                  className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 disabled:opacity-50 text-xs font-semibold"
                  title="Completar cita — abre formulario con método de pago y sello"
                >
                  <CheckCircle2 size={15} />
                  Completar
                </button>
              </div>
            </div>
          ))}

          {citas.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              ¡Todo al día! No hay citas pendientes.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PendingAppointmentsBanner() {
  const [modalOpen, setModalOpen] = useState(false);

  // Obtener fecha actual YYYY-MM-DD
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

  // Consideramos que es el "final del día" si son más de las 19:00 (hora local)
  const isEndOfDay = now.getHours() >= 19;

  // Ventana acotada: solo los últimos 14 días (citas más viejas sin cerrar son irrelevantes).
  // Evita leer TODA la historia de citas Confirmada en cada carga del panel.
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 14);
  const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth()+1).padStart(2,'0')}-${String(cutoff.getDate()).padStart(2,'0')}`;

  const { data: citas } = useCollection(
    'citas',
    [where('fecha', '>=', cutoffStr), where('fecha', '<=', todayStr)],
    [cutoffStr, todayStr],
  );

  // Filtrar las citas que requieren atención (estado se filtra en memoria)
  const pendingCitas = useMemo(() => {
    if (!citas) return [];

    return citas.filter(cita => {
      if (cita.estado !== 'Confirmada') return false;

      // Si la fecha es de días anteriores, siempre requiere atención
      if (cita.fecha < todayStr) return true;

      // Si es hoy, requiere atención solo si es "final del día" (>= 19:00)
      if (cita.fecha === todayStr && isEndOfDay) return true;

      return false;
    }).sort((a, b) => {
      // Ordenar por fecha y luego hora
      if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha);
      return (a.hora || '').localeCompare(b.hora || '');
    });
  }, [citas, todayStr, isEndOfDay]);

  // Si no hay citas pendientes, cerramos el modal automáticamente si estaba abierto y no mostramos nada
  if (pendingCitas.length === 0) {
    if (modalOpen) setModalOpen(false);
    return null;
  }

  return (
    <>
      <div className="bg-amber-500/10 border-b border-amber-500/20 relative animate-fade-in z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex flex-1 items-center gap-3 min-w-0">
              <span className="flex p-2 rounded-lg bg-amber-500/20">
                <AlertTriangle className="h-5 w-5 text-amber-500" aria-hidden="true" />
              </span>
              <p className="text-sm font-medium text-amber-500 truncate">
                Tienes {pendingCitas.length} {pendingCitas.length === 1 ? 'cita pendiente' : 'citas pendientes'} de cierre.
              </p>
            </div>
            <div className="order-3 mt-2 w-full shrink-0 sm:order-2 sm:mt-0 sm:w-auto">
              <button
                onClick={() => setModalOpen(true)}
                className="flex w-full items-center justify-center rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-400 active:scale-95 transition-all shadow-sm"
              >
                Revisar citas
                <ChevronRight size={16} className="ml-1" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {modalOpen && (
        <PendingAppointmentsModal 
          citas={pendingCitas} 
          onClose={() => setModalOpen(false)} 
        />
      )}
    </>
  );
}
