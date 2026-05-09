import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, MessageCircle, Plus, Sun, Sunrise } from 'lucide-react';

/* ── Helpers de fecha ───────────────────────────────────────────── */
const DIAS  = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function toDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function isSameDay(a, b) { return toDateKey(a) === toDateKey(b); }
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function toMins(t) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }
function fromMins(m) { return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`; }

/* ── Mock data  ─────────────────────────────────────────────────── */
const today = new Date();
today.setHours(0,0,0,0);

const MOCK_CITAS = [
  // Hoy
  { id:1,  date: today,          hora:'09:00', duracion:30, clienteNombre:'Juan Pérez',     servicio:'Corte Tradicional',  telefono:'+56912345678', estado:'Confirmada' },
  { id:2,  date: today,          hora:'10:00', duracion:45, clienteNombre:'Diego Muñoz',    servicio:'Corte + Barba',      telefono:'+56987654321', estado:'Confirmada' },
  { id:3,  date: today,          hora:'11:30', duracion:30, clienteNombre:'Andrés Silva',   servicio:'Degradado',          telefono:'+56911112222', estado:'Pendiente'  },
  { id:4,  date: today,          hora:'14:00', duracion:30, clienteNombre:'Felipe Torres',  servicio:'Corte Clásico',      telefono:'+56933334444', estado:'Confirmada' },
  { id:5,  date: today,          hora:'15:30', duracion:60, clienteNombre:'Matías Rojas',   servicio:'Combo Premium',      telefono:'+56955556666', estado:'Confirmada' },
  // Mañana
  { id:6,  date: addDays(today,1), hora:'09:30', duracion:30, clienteNombre:'Carlos Vera',  servicio:'Corte Tradicional',  telefono:'+56977778888', estado:'Confirmada' },
  { id:7,  date: addDays(today,1), hora:'13:00', duracion:45, clienteNombre:'Sebastián Núñez', servicio:'Corte + Barba',  telefono:'+56999990000', estado:'Confirmada' },
  // Pasado mañana
  { id:8,  date: addDays(today,2), hora:'10:30', duracion:30, clienteNombre:'Nicolás Gómez', servicio:'Degradado Fading', telefono:'+56911223344', estado:'Pendiente'  },
  // Ayer
  { id:9,  date: addDays(today,-1), hora:'11:00', duracion:30, clienteNombre:'Rodrigo Lagos', servicio:'Barba Perfilada',  telefono:'+56922334455', estado:'Confirmada' },
  { id:10, date: addDays(today,-1), hora:'16:00', duracion:30, clienteNombre:'Gabriel Pino',  servicio:'Corte Clásico',   telefono:'+56933445566', estado:'Confirmada' },
];

const HORARIO = { inicio: '09:00', fin: '20:00', intervalo: 30 };

/* ── DailySummary ────────────────────────────────────────────────── */
function DailySummary({ citas, date }) {
  const activas = citas.filter(c => c.estado !== 'Cancelada');
  const esHoy   = isSameDay(date, today);
  const label   = esHoy ? 'hoy' : DIAS[date.getDay()].toLowerCase();

  if (!activas.length) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl mb-4"
           style={{ backgroundColor:'#111', border:'1px solid #1e1e1e' }}>
        <span className="text-[12px] text-gray-600">Sin citas para {label}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl mb-4"
         style={{ backgroundColor:'rgba(212,175,55,0.06)', border:'1px solid rgba(212,175,55,0.15)' }}>
      <span className="text-[13px] font-semibold" style={{ color:'#D4AF37' }}>
        {activas.length} {activas.length === 1 ? 'cita programada' : 'citas programadas'} para {label}
      </span>
    </div>
  );
}

/* ── DateSelector ────────────────────────────────────────────────── */
function DateSelector({ selected, onChange }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(selected, i - 3));

  return (
    <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-5 px-5 no-scrollbar">
      {days.map((d, i) => {
        const isSel = isSameDay(d, selected);
        const isT   = isSameDay(d, today);
        return (
          <button
            key={i}
            onClick={() => onChange(d)}
            className="flex-shrink-0 w-14 h-[72px] rounded-2xl flex flex-col items-center justify-center transition-all duration-200"
            style={{
              backgroundColor: isSel ? 'rgba(212,175,55,0.12)' : '#111',
              border:          isSel ? '1.5px solid #D4AF37'   : '1px solid #1e1e1e',
              transform:       isSel ? 'scale(1.05)'           : 'scale(1)',
            }}
          >
            <span className="text-[9px] font-bold uppercase tracking-wider mb-1"
                  style={{ color: isSel ? '#D4AF37' : '#555' }}>
              {DIAS[d.getDay()]}
            </span>
            <span className="text-[18px] font-bold leading-none"
                  style={{ color: isSel ? '#fff' : '#666' }}>
              {d.getDate()}
            </span>
            {isT && (
              <div className="w-1 h-1 rounded-full mt-1"
                   style={{ backgroundColor: isSel ? '#D4AF37' : '#444' }} />
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ── EmptySlot ───────────────────────────────────────────────────── */
function EmptySlot({ hora, onAdd }) {
  return (
    <button
      onClick={() => onAdd?.(hora)}
      className="w-full flex items-center gap-3 py-2.5 group"
      style={{ borderBottom: '1px solid #141414' }}
    >
      <span className="w-12 text-right text-[11px] shrink-0" style={{ color:'#333' }}>
        {hora}
      </span>
      <span className="flex-1 text-left text-[11px]" style={{ color:'#2a2a2a' }}>
        Espacio disponible
      </span>
      <Plus size={12} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            style={{ color:'#444' }} />
    </button>
  );
}

/* ── CitaCard ────────────────────────────────────────────────────── */
function CitaCard({ hora, cita }) {
  const isPending = cita.estado === 'Pendiente';
  const waUrl = `https://wa.me/${cita.telefono?.replace(/\D/g,'') || ''}`;

  return (
    <div
      className="flex items-start gap-3 py-3 px-3 rounded-xl"
      style={{
        backgroundColor: isPending ? 'rgba(212,175,55,0.06)' : '#161616',
        border: isPending ? '1px solid rgba(212,175,55,0.25)' : '1px solid #222',
        marginBottom: '6px',
      }}
    >
      {/* Hora */}
      <div className="shrink-0 pt-0.5">
        <span className="text-[12px] font-bold w-12 block text-right"
              style={{ color: isPending ? '#D4AF37' : '#888' }}>
          {hora}
        </span>
        <span className="text-[9px] block text-right mt-0.5"
              style={{ color: '#3a3a3a' }}>
          {cita.duracion} min
        </span>
      </div>

      {/* Separador vertical */}
      <div className="w-px self-stretch shrink-0 rounded-full"
           style={{ backgroundColor: isPending ? 'rgba(212,175,55,0.4)' : '#2a2a2a' }} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-bold text-white leading-tight truncate">
          {cita.clienteNombre}
        </p>
        <p className="text-[11px] mt-0.5 truncate" style={{ color:'#666' }}>
          {cita.servicio}
        </p>
        {isPending && (
          <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                style={{ backgroundColor:'rgba(212,175,55,0.15)', color:'#D4AF37' }}>
            Pendiente
          </span>
        )}
      </div>

      {/* WhatsApp */}
      {cita.telefono && (
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95"
          style={{ backgroundColor:'rgba(37,211,102,0.12)', border:'1px solid rgba(37,211,102,0.2)' }}
        >
          <MessageCircle size={15} style={{ color:'#25D366' }} />
        </a>
      )}
    </div>
  );
}

/* ── SectionHeader ───────────────────────────────────────────────── */
function SectionHeader({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2 mb-3 mt-5">
      <Icon size={12} style={{ color:'#444' }} />
      <span className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color:'#444' }}>
        {label}
      </span>
      <div className="flex-1 h-px" style={{ backgroundColor:'#1a1a1a' }} />
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────── */
export default function AgendaBarbero({
  barberoNombre = 'Barbero',
  citas         = MOCK_CITAS,
  horario       = HORARIO,
  onAddCita,
}) {
  const [selectedDate, setSelectedDate] = useState(today);

  /* Citas del día seleccionado */
  const citasDelDia = useMemo(
    () => citas.filter(c => isSameDay(c.date, selectedDate) && c.estado !== 'Cancelada'),
    [citas, selectedDate],
  );

  /* Generar slots de tiempo */
  const slots = useMemo(() => {
    const ini = toMins(horario.inicio);
    const fin = toMins(horario.fin);
    const iv  = horario.intervalo;
    const result = [];

    let cur = ini;
    while (cur < fin) {
      const horaStr = fromMins(cur);
      const cita = citasDelDia.find(c => {
        const start = toMins(c.hora);
        const end   = start + (c.duracion || iv);
        return cur >= start && cur < end;
      });

      if (cita) {
        if (toMins(cita.hora) === cur) {
          result.push({ hora: horaStr, type: 'cita', cita });
        }
        // slots dentro de la misma cita no se renderizan
      } else {
        result.push({ hora: horaStr, type: 'empty' });
      }
      cur += iv;
    }
    return result;
  }, [citasDelDia, horario]);

  const morning   = slots.filter(s => toMins(s.hora) < 720);
  const afternoon = slots.filter(s => toMins(s.hora) >= 720);

  const handlePrev = () => setSelectedDate(d => addDays(d, -1));
  const handleNext = () => setSelectedDate(d => addDays(d, 1));

  return (
    <div
      className="max-w-md mx-auto min-h-screen flex flex-col pb-24"
      style={{ backgroundColor:'#0a0a0a', color:'#fff' }}
    >
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="px-5 pt-10 pb-5 shrink-0">
        <p className="text-[10px] font-bold tracking-[0.25em] uppercase mb-1"
           style={{ color:'#D4AF37' }}>
          Mi Agenda
        </p>
        <div className="flex items-center justify-between">
          <h1 className="text-[24px] font-black tracking-tight">{barberoNombre}</h1>
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
              style={{ backgroundColor:'#111', border:'1px solid #1e1e1e' }}
            >
              <ChevronLeft size={16} style={{ color:'#666' }} />
            </button>
            <button
              onClick={handleNext}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
              style={{ backgroundColor:'#111', border:'1px solid #1e1e1e' }}
            >
              <ChevronRight size={16} style={{ color:'#666' }} />
            </button>
          </div>
        </div>
        <p className="text-[13px] mt-0.5" style={{ color:'#555' }}>
          {MESES[selectedDate.getMonth()]} {selectedDate.getFullYear()}
        </p>
      </div>

      {/* ── Date Selector ────────────────────────────────────────── */}
      <div className="px-5 mb-4 shrink-0">
        <DateSelector selected={selectedDate} onChange={setSelectedDate} />
      </div>

      {/* ── Daily Summary ─────────────────────────────────────────── */}
      <div className="px-5 shrink-0">
        <DailySummary citas={citasDelDia} date={selectedDate} />
      </div>

      {/* ── Timeline ─────────────────────────────────────────────── */}
      <div className="flex-1 px-5 overflow-y-auto">

        {/* Mañana */}
        {morning.length > 0 && (
          <>
            <SectionHeader icon={Sunrise} label="Mañana" />
            {morning.map((s, i) =>
              s.type === 'cita'
                ? <CitaCard key={i} hora={s.hora} cita={s.cita} />
                : <EmptySlot key={i} hora={s.hora} onAdd={onAddCita} />
            )}
          </>
        )}

        {/* Tarde */}
        {afternoon.length > 0 && (
          <>
            <SectionHeader icon={Sun} label="Tarde" />
            {afternoon.map((s, i) =>
              s.type === 'cita'
                ? <CitaCard key={i} hora={s.hora} cita={s.cita} />
                : <EmptySlot key={i} hora={s.hora} onAdd={onAddCita} />
            )}
          </>
        )}

        {slots.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-[13px]" style={{ color:'#333' }}>
              No hay turnos configurados para este día.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
