import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Lock, MessageCircle, Plus, Sun, Sunrise } from 'lucide-react';

/* ── Helpers de fecha ───────────────────────────────────────────── */
const DIAS  = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function toDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function isSameDay(a, b) { return toDateKey(a) === toDateKey(b); }
function addDays(d, n)   { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function toMins(t)       { const [h, m] = t.split(':').map(Number); return h * 60 + m; }
function fromMins(m)     { return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`; }
function getInitials(nombre) {
  return (nombre || '').split(' ').slice(0, 2).map(n => n[0] || '').join('').toUpperCase();
}

/* ── Mock data  ─────────────────────────────────────────────────── */
const today = new Date();
today.setHours(0,0,0,0);

const MOCK_CITAS = [
  { id:1,  date: today,             hora:'09:00', duracion:30, clienteNombre:'Juan Pérez',       servicio:'Corte Tradicional', telefono:'+56912345678', estado:'Confirmada' },
  { id:2,  date: today,             hora:'10:00', duracion:45, clienteNombre:'Diego Muñoz',      servicio:'Corte + Barba',     telefono:'+56987654321', estado:'Confirmada' },
  { id:3,  date: today,             hora:'11:30', duracion:30, clienteNombre:'Andrés Silva',     servicio:'Degradado',         telefono:'+56911112222', estado:'Pendiente'  },
  { id:4,  date: today,             hora:'14:00', duracion:30, clienteNombre:'Felipe Torres',    servicio:'Corte Clásico',     telefono:'+56933334444', estado:'Confirmada' },
  { id:5,  date: today,             hora:'15:30', duracion:60, clienteNombre:'Matías Rojas',     servicio:'Combo Premium',     telefono:'+56955556666', estado:'Confirmada' },
  { id:6,  date: addDays(today, 1), hora:'09:30', duracion:30, clienteNombre:'Carlos Vera',      servicio:'Corte Tradicional', telefono:'+56977778888', estado:'Confirmada' },
  { id:7,  date: addDays(today, 1), hora:'13:00', duracion:45, clienteNombre:'Sebastián Núñez',  servicio:'Corte + Barba',     telefono:'+56999990000', estado:'Confirmada' },
  { id:8,  date: addDays(today, 2), hora:'10:30', duracion:30, clienteNombre:'Nicolás Gómez',    servicio:'Degradado Fading',  telefono:'+56911223344', estado:'Pendiente'  },
  { id:9,  date: addDays(today,-1), hora:'11:00', duracion:30, clienteNombre:'Rodrigo Lagos',    servicio:'Barba Perfilada',   telefono:'+56922334455', estado:'Confirmada' },
  { id:10, date: addDays(today,-1), hora:'16:00', duracion:30, clienteNombre:'Gabriel Pino',     servicio:'Corte Clásico',     telefono:'+56933445566', estado:'Confirmada' },
];

const HORARIO = { inicio: '09:00', fin: '20:00', intervalo: 30 };

/* ── DailySummary ────────────────────────────────────────────────── */
function DailySummary({ citas, date }) {
  const activas = citas.filter(c => c.estado !== 'Cancelada');
  const esHoy   = isSameDay(date, today);
  const label   = esHoy ? 'hoy' : DIAS[date.getDay()].toLowerCase();

  if (!activas.length) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl mb-4 bg-[#111] border border-zinc-800/60">
        <span className="text-[12px] text-zinc-600">Sin citas para {label}</span>
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
            className={`flex-shrink-0 w-14 h-[72px] rounded-2xl flex flex-col items-center justify-center transition-all duration-200 ${
              isSel
                ? 'bg-zinc-100 shadow-md scale-105'
                : 'bg-[#111] border border-[#1e1e1e] hover:border-zinc-700'
            }`}
          >
            <span className={`text-[9px] font-bold uppercase tracking-wider mb-1 ${
              isSel ? 'text-zinc-500' : 'text-[#555]'
            }`}>
              {DIAS[d.getDay()]}
            </span>
            <span className={`text-[18px] font-bold leading-none ${
              isSel ? 'text-black' : 'text-[#666]'
            }`}>
              {d.getDate()}
            </span>
            {isT && (
              <div className={`w-1.5 h-1.5 rounded-full mt-1 ${isSel ? 'bg-zinc-700' : 'bg-[#444]'}`} />
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
      className="w-full flex items-center gap-3 py-2.5 group border-b border-zinc-800/50 hover:border-zinc-700/50 transition-colors"
    >
      <span className="w-12 text-right text-[11px] shrink-0 text-zinc-600">
        {hora}
      </span>
      <span className="flex-1 text-left text-[11px] text-zinc-700 group-hover:text-zinc-500 transition-colors">
        Espacio disponible
      </span>
      {/* Lock → Plus swap on hover */}
      <span className="relative w-4 h-4 shrink-0">
        <Lock
          size={12}
          className="absolute inset-0 m-auto text-zinc-700 opacity-100 group-hover:opacity-0 transition-opacity duration-200"
        />
        <Plus
          size={12}
          className="absolute inset-0 m-auto text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        />
      </span>
    </button>
  );
}

/* ── CitaCard ────────────────────────────────────────────────────── */
function CitaCard({ hora, cita }) {
  const isPending    = cita.estado === 'Pendiente';
  const waUrl        = `https://wa.me/${cita.telefono?.replace(/\D/g,'') || ''}`;
  const initials     = getInitials(cita.clienteNombre);
  // Acento izquierdo: gold para pendientes, indigo para confirmadas
  const accentColor  = isPending ? '#D4AF37' : '#6366f1';

  return (
    <div
      className="flex items-start gap-3 py-3 px-3 rounded-xl mb-1.5 border border-zinc-800/60 border-l-4"
      style={{
        backgroundColor: isPending ? 'rgba(212,175,55,0.06)' : '#161616',
        borderLeftColor: accentColor,
      }}
    >
      {/* Hora */}
      <div className="shrink-0 pt-0.5">
        <span className="text-[12px] font-bold w-12 block text-right"
              style={{ color: isPending ? '#D4AF37' : '#888' }}>
          {hora}
        </span>
        <span className="text-[9px] block text-right mt-0.5 text-zinc-700">
          {cita.duracion} min
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        {/* Servicio — jerarquía primaria */}
        <p className="text-[13px] font-semibold text-primary leading-tight truncate">
          {cita.servicio}
        </p>
        {/* Cliente con avatar — jerarquía secundaria */}
        <div className="flex items-center gap-1.5 mt-1.5">
          <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-medium text-zinc-300 shrink-0">
            {initials}
          </div>
          <p className="text-[11px] text-zinc-500 truncate">{cita.clienteNombre}</p>
        </div>
        {isPending && (
          <span className="inline-block mt-1.5 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                style={{ backgroundColor:'rgba(212,175,55,0.15)', color:'#D4AF37' }}>
            Pendiente
          </span>
        )}
      </div>

      {/* WhatsApp con micro-interacción */}
      {cita.telefono && (
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105 hover:brightness-110 active:scale-95"
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
      <Icon size={12} className="text-zinc-600" />
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">
        {label}
      </span>
      <div className="flex-1 h-px bg-zinc-800/60" />
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

  const citasDelDia = useMemo(
    () => citas.filter(c => isSameDay(c.date, selectedDate) && c.estado !== 'Cancelada'),
    [citas, selectedDate],
  );

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
        if (toMins(cita.hora) === cur) result.push({ hora: horaStr, type: 'cita', cita });
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
    <div className="max-w-md mx-auto min-h-screen flex flex-col pb-24 bg-[#0a0a0a] text-primary">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="px-5 pt-10 pb-5 shrink-0">
        <p className="text-[10px] font-bold tracking-[0.25em] uppercase mb-1" style={{ color:'#D4AF37' }}>
          Mi Agenda
        </p>
        <div className="flex items-center justify-between">
          <h1 className="text-[24px] font-black tracking-tight">{barberoNombre}</h1>
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 bg-[#111] border border-[#1e1e1e]"
            >
              <ChevronLeft size={16} className="text-zinc-500" />
            </button>
            <button
              onClick={handleNext}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 bg-[#111] border border-[#1e1e1e]"
            >
              <ChevronRight size={16} className="text-zinc-500" />
            </button>
          </div>
        </div>
        <p className="text-[13px] mt-0.5 text-zinc-600">
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
        {morning.length > 0 && (
          <>
            <SectionHeader icon={Sunrise} label="Mañana" />
            {morning.map((s, i) =>
              s.type === 'cita'
                ? <CitaCard   key={i} hora={s.hora} cita={s.cita} />
                : <EmptySlot  key={i} hora={s.hora} onAdd={onAddCita} />
            )}
          </>
        )}
        {afternoon.length > 0 && (
          <>
            <SectionHeader icon={Sun} label="Tarde" />
            {afternoon.map((s, i) =>
              s.type === 'cita'
                ? <CitaCard   key={i} hora={s.hora} cita={s.cita} />
                : <EmptySlot  key={i} hora={s.hora} onAdd={onAddCita} />
            )}
          </>
        )}
        {slots.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-[13px] text-zinc-700">No hay turnos configurados para este día.</p>
          </div>
        )}
      </div>
    </div>
  );
}
