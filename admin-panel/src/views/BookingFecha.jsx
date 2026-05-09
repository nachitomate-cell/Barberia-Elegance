import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';

const DIAS  = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate();
}

const today = new Date();
today.setHours(0, 0, 0, 0);

// Slots bloqueados por día de semana (mock — simula citas ya tomadas)
const BLOCKED = {
  0: ['09:00','10:30','14:00','16:00','17:30'],
  1: ['09:30','11:00','13:00','15:00'],
  2: ['10:00','12:00','14:30','16:30','18:00'],
  3: ['09:00','11:30','14:00','15:30','17:00'],
  4: ['10:30','13:30','15:00','18:30'],
  5: ['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00'],
  6: ['11:00','13:00','15:00','17:00'],
};

function generateSlots(blockedSlots = []) {
  const slots = [];
  for (let h = 9; h < 20; h++) {
    for (let m = 0; m < 60; m += 30) {
      const time = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
      slots.push({ time, available: !blockedSlots.includes(time) });
    }
  }
  return slots;
}

/* ── Chip de contexto ────────────────────────────────────────────── */
function Chip({ label, value, icon: Icon }) {
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border"
         style={{ borderColor: '#2a2a2a', backgroundColor: '#141414' }}>
      {Icon && <Icon size={10} className="text-gray-500" />}
      <span className="text-[11px] text-gray-500">{label}:</span>
      <span className="text-[11px] text-gray-300 font-medium">{value}</span>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────── */
export default function BookingFecha({
  servicioNombre = 'Corte Tradicional',
  barberoNombre  = 'Joaquin Amiri',
  duracion       = 40,
  onContinuar,
  onVolver,
}) {
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedTime, setSelectedTime] = useState(null);

  const days = Array.from({ length: 8 }, (_, i) => addDays(today, i));

  const slots = useMemo(() => {
    const dow = selectedDate.getDay();
    return generateSlots(BLOCKED[dow] || []);
  }, [selectedDate]);

  const handleDateChange = d => {
    setSelectedDate(d);
    setSelectedTime(null);
  };

  const handleContinue = () => {
    if (!selectedTime) return;
    onContinuar?.({ fecha: selectedDate, hora: selectedTime });
  };

  const fechaLabel = selectedTime
    ? `${DIAS[selectedDate.getDay()]} ${selectedDate.getDate()} de ${MESES[selectedDate.getMonth()]} · ${selectedTime}`
    : null;

  return (
    <div
      className="max-w-md mx-auto flex flex-col"
      style={{ backgroundColor: '#0a0a0a', color: '#fff', minHeight: '100dvh', paddingBottom: '6rem' }}
    >

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="px-5 pt-12 pb-5 shrink-0">
        <div className="flex items-center gap-3 mb-5">
          {onVolver && (
            <button
              onClick={onVolver}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: '#555' }}
            >
              <ChevronLeft size={20} />
            </button>
          )}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] font-bold tracking-[0.22em] uppercase" style={{ color: '#D4AF37' }}>
                Paso 3 de 4
              </p>
              <p className="text-[11px] text-gray-600">75%</p>
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: '#1a1a1a' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: '75%', backgroundColor: '#D4AF37' }}
              />
            </div>
          </div>
        </div>

        <h1 className="text-[26px] font-black text-white tracking-tight leading-tight mb-3">
          Elige fecha y hora
        </h1>

        <div className="flex flex-wrap gap-2">
          <Chip label="Servicio" value={servicioNombre} />
          <Chip label="Barbero"  value={barberoNombre} />
          <Chip label="Duración" value={`${duracion} min`} icon={Clock} />
        </div>
      </div>

      {/* ── Strip de fechas ──────────────────────────────────────── */}
      <div className="px-5 mb-5 shrink-0">
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-3" style={{ color: '#444' }}>
          {MESES[selectedDate.getMonth()]} {selectedDate.getFullYear()}
        </p>
        <div
          className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {days.map((d, i) => {
            const isSel   = isSameDay(d, selectedDate);
            const isToday = isSameDay(d, today);
            return (
              <button
                key={i}
                onClick={() => handleDateChange(d)}
                className="flex-shrink-0 w-14 h-[72px] rounded-2xl flex flex-col items-center justify-center transition-all duration-200"
                style={{
                  backgroundColor: isSel ? 'rgba(212,175,55,0.12)' : '#111',
                  border:          isSel ? '1.5px solid #D4AF37'   : '1px solid #1e1e1e',
                  transform:       isSel ? 'scale(1.05)'           : 'scale(1)',
                }}
              >
                <span
                  className="text-[9px] font-bold uppercase tracking-wider mb-1"
                  style={{ color: isSel ? '#D4AF37' : '#555' }}
                >
                  {isToday ? 'Hoy' : DIAS[d.getDay()]}
                </span>
                <span
                  className="text-[18px] font-bold leading-none"
                  style={{ color: isSel ? '#fff' : '#666' }}
                >
                  {d.getDate()}
                </span>
                {isToday && (
                  <div
                    className="w-1 h-1 rounded-full mt-1"
                    style={{ backgroundColor: isSel ? '#D4AF37' : '#444' }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Slots de hora ────────────────────────────────────────── */}
      <div className="flex-1 px-5 overflow-y-auto">
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-3" style={{ color: '#444' }}>
          Horarios disponibles
        </p>
        <div className="grid grid-cols-3 gap-2.5 pb-2">
          {slots.map(({ time, available }) => {
            const isSel = selectedTime === time;
            return (
              <button
                key={time}
                disabled={!available}
                onClick={() => available && setSelectedTime(time)}
                className="py-3 rounded-xl text-[13px] font-semibold transition-all duration-200"
                style={
                  !available
                    ? {
                        backgroundColor: '#0f0f0f',
                        color: '#2a2a2a',
                        border: '1px solid #161616',
                        cursor: 'not-allowed',
                        textDecoration: 'line-through',
                      }
                    : isSel
                    ? {
                        backgroundColor: 'rgba(212,175,55,0.12)',
                        color: '#D4AF37',
                        border: '1.5px solid #D4AF37',
                      }
                    : {
                        backgroundColor: '#111',
                        color: '#ccc',
                        border: '1px solid #1e1e1e',
                      }
                }
              >
                {time}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Botón flotante ───────────────────────────────────────── */}
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md px-5 pb-8 pt-3"
        style={{ background: 'linear-gradient(to top, #0a0a0a 75%, transparent)' }}
      >
        {fechaLabel && (
          <div className="flex items-center justify-center gap-1.5 mb-3" style={{ opacity: 0.8 }}>
            <Clock size={11} style={{ color: '#D4AF37' }} />
            <p className="text-[11px]" style={{ color: '#D4AF37' }}>{fechaLabel}</p>
          </div>
        )}
        <button
          type="button"
          disabled={!selectedTime}
          onClick={handleContinue}
          className="w-full py-4 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98]"
          style={
            selectedTime
              ? {
                  backgroundColor: '#D4AF37',
                  color: '#000',
                  boxShadow: '0 0 22px rgba(212,175,55,0.28), 0 4px 12px rgba(0,0,0,0.4)',
                }
              : {
                  backgroundColor: '#111',
                  color: '#333',
                  cursor: 'not-allowed',
                }
          }
        >
          {selectedTime ? (
            <>Continuar <ChevronRight size={18} strokeWidth={2.5} /></>
          ) : (
            'Selecciona un horario'
          )}
        </button>
      </div>
    </div>
  );
}
