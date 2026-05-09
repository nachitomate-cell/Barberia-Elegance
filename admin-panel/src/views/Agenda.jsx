import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCollection } from '../hooks/useCollection';
import { where } from 'firebase/firestore';

const HOUR_START = 8;
const HOUR_END   = 20;
const SLOT_MINS  = 30;
const TOTAL_SLOTS = (HOUR_END - HOUR_START) * (60 / SLOT_MINS);

function formatDate(d) {
  return d.toISOString().split('T')[0];
}

function slotIndex(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return (h - HOUR_START) * (60 / SLOT_MINS) + Math.floor(m / SLOT_MINS);
}

function durationSlots(mins) {
  return Math.max(1, Math.round(mins / SLOT_MINS));
}

const STATUS_COLOR = {
  Confirmada: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
  Cancelada:  'bg-red-500/10     border-red-500/30     text-red-400',
  Completada: 'bg-blue-500/10    border-blue-500/30    text-blue-400',
};

function AppointmentBlock({ cita }) {
  const slot    = slotIndex(cita.hora);
  const spans   = durationSlots(cita.duracion || 30);
  const color   = STATUS_COLOR[cita.estado] ?? STATUS_COLOR.Confirmada;

  return (
    <div
      title={`${cita.servicioNombre} · ${cita.clienteNombre}`}
      className={`absolute inset-x-0.5 rounded-md border px-2 py-1 overflow-hidden cursor-pointer hover:brightness-110 transition-all text-xs ${color}`}
      style={{
        top:    `${slot * 40}px`,
        height: `${spans * 40 - 4}px`,
      }}
    >
      <p className="font-semibold truncate leading-tight">{cita.clienteNombre || 'Cliente'}</p>
      <p className="truncate text-[10px] opacity-75">{cita.servicioNombre}</p>
    </div>
  );
}

export default function Agenda() {
  const [date, setDate] = useState(new Date());
  const dateStr = formatDate(date);

  const { data: barberos } = useCollection('barberos');
  const { data: citas }    = useCollection('citas', [where('fecha', '==', dateStr)]);

  const activeBarberos = useMemo(() => barberos.filter(b => b.disponible !== false), [barberos]);

  const moveDay = delta => {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(d);
  };

  const timeLabels = Array.from({ length: TOTAL_SLOTS }, (_, i) => {
    const mins  = i * SLOT_MINS;
    const h     = HOUR_START + Math.floor(mins / 60);
    const m     = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  });

  return (
    <div className="flex flex-col h-full gap-4">

      {/* Toolbar */}
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-xl font-bold text-white">Agenda</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => moveDay(-1)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all">
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-semibold text-white min-w-[130px] text-center capitalize">
            {date.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
          <button onClick={() => moveDay(1)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all">
            <ChevronRight size={18} />
          </button>
          <button onClick={() => setDate(new Date())} className="ml-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-all">
            Hoy
          </button>
        </div>
      </div>

      {/* Swimlane grid */}
      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl overflow-auto no-scrollbar">
        <div className="flex min-w-max">

          {/* Time axis */}
          <div className="w-16 shrink-0 sticky left-0 bg-slate-900 z-10 border-r border-slate-800">
            <div className="h-10 border-b border-slate-800" /> {/* header spacer */}
            {timeLabels.map((t, i) => (
              <div
                key={i}
                className="h-10 flex items-center justify-end pr-3 text-[10px] font-mono text-slate-600 border-b border-slate-800/60"
              >
                {t.endsWith(':00') ? t : ''}
              </div>
            ))}
          </div>

          {/* Barber columns */}
          {activeBarberos.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-20 text-slate-600 text-sm">
              Sin barberos activos
            </div>
          ) : activeBarberos.map(b => {
            const barberCitas = citas.filter(c => c.barberoId === b.id || c.barbero === b.nombre);
            return (
              <div key={b.id} className="flex-1 min-w-[160px] border-r border-slate-800 last:border-r-0">
                {/* Column header */}
                <div className="h-10 px-3 flex items-center gap-2 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
                  <div className="w-6 h-6 rounded-full overflow-hidden bg-emerald-500/20 flex items-center justify-center shrink-0">
                    {b.foto
                      ? <img src={b.foto} alt={b.nombre} className="w-full h-full object-cover" />
                      : <span className="text-[10px] font-bold text-emerald-400">{b.nombre?.[0] ?? '?'}</span>}
                  </div>
                  <span className="text-xs font-semibold text-white truncate">{b.nombre}</span>
                </div>

                {/* Slot rows + appointments */}
                <div className="relative" style={{ height: `${TOTAL_SLOTS * 40}px` }}>
                  {timeLabels.map((_, i) => (
                    <div
                      key={i}
                      className={`absolute inset-x-0 h-10 border-b border-slate-800/40 ${
                        i % 2 === 0 ? '' : 'bg-slate-800/10'
                      }`}
                      style={{ top: `${i * 40}px` }}
                    />
                  ))}
                  {barberCitas.map(c => <AppointmentBlock key={c.id} cita={c} />)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
