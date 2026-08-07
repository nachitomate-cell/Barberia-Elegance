import { useState, useMemo } from 'react';
import { orderBy, limit } from 'firebase/firestore';
import { useCollection } from '../hooks/useCollection';
import {
  History, CalendarPlus, Check, UserCog, Scissors, XCircle, UserX,
  CheckCircle2, Trash2, Pencil, Search, Clock,
} from 'lucide-react';

/* Historial de eventos de citas ({root}actividad, lo escribe la CF
   actividad-citas.js — retención 90 días). El push es efímero; esta vista
   responde "¿quién movió/canceló esta hora?" días después. */

const PAGE = 100;

const TIPO_CFG = {
  creada:      { Icon: CalendarPlus, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Nueva cita' },
  confirmada:  { Icon: Check,        color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Cita confirmada' },
  reagendada:  { Icon: Clock,        color: 'text-amber-400',   bg: 'bg-amber-500/10',   label: 'Cita reagendada' },
  profesional: { Icon: UserCog,      color: 'text-violet-400',  bg: 'bg-violet-500/10',  label: 'Cambio de profesional' },
  servicio:    { Icon: Scissors,     color: 'text-violet-400',  bg: 'bg-violet-500/10',  label: 'Cambio de servicio' },
  cancelada:   { Icon: XCircle,      color: 'text-rose-400',    bg: 'bg-rose-500/10',    label: 'Cita cancelada' },
  no_asistio:  { Icon: UserX,        color: 'text-rose-400',    bg: 'bg-rose-500/10',    label: 'No asistió' },
  completada:  { Icon: CheckCircle2, color: 'text-sky-400',     bg: 'bg-sky-500/10',     label: 'Cita completada' },
  eliminada:   { Icon: Trash2,       color: 'text-rose-400',    bg: 'bg-rose-500/10',    label: 'Cita eliminada' },
  estado:      { Icon: Pencil,       color: 'text-slate-400',   bg: 'bg-slate-500/10',   label: 'Cita actualizada' },
  cambio:      { Icon: Pencil,       color: 'text-slate-400',   bg: 'bg-slate-500/10',   label: 'Cita actualizada' },
};

const FILTROS = [
  { key: 'todos',      label: 'Todo' },
  { key: 'creada',     label: 'Nuevas' },
  { key: 'reagendada', label: 'Reagendadas' },
  { key: 'cancelada',  label: 'Canceladas' },
  { key: 'completada', label: 'Completadas' },
];

function pad(n) { return String(n).padStart(2, '0'); }
function hoyStr() { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

function fmtFecha(fecha) {
  if (!fecha) return '';
  const [y, m, d] = String(fecha).split('-').map(Number);
  if (!y || !m || !d) return String(fecha);
  if (fecha === hoyStr()) return 'hoy';
  const dias  = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const dt = new Date(y, m - 1, d);
  return `${dias[dt.getDay()]} ${d} ${meses[m - 1]}`;
}

function hace(ts) {
  const ms = ts?.toMillis?.() || 0;
  if (!ms) return '';
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return 'ahora';
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  const d = Math.floor(s / 86400);
  if (d === 1) return 'ayer';
  if (d < 7) return `hace ${d} días`;
  const dt = new Date(ms);
  return `${dt.getDate()}/${pad(dt.getMonth() + 1)}`;
}

function actorDe(e) {
  const quien =
    e.actor === 'cliente' ? 'el cliente' :
    e.actor === 'bot'     ? (e.actorNombre || 'el asistente') :
    e.actor === 'staff'   ? (e.actorNombre || 'el staff') : '';
  if (e.tipo === 'creada') {
    if (e.actor === 'cliente') return e.origenLabel || 'Reserva online';
    if (e.actor === 'bot') return e.actorNombre || 'Asistente';
    return quien ? `La agendó ${quien}` : 'Automática';
  }
  if (e.tipo === 'cancelada')  return quien ? `Canceló ${quien}` : 'Cancelación automática';
  if (e.tipo === 'eliminada')  return quien ? `La eliminó ${quien}` : 'Automático';
  return quien ? `Lo hizo ${quien}` : 'Automático';
}

function detalleDe(e) {
  const cambios = Array.isArray(e.cambios) ? e.cambios : [];
  if (e.tipo === 'reagendada') {
    const f = cambios.find(c => c.campo === 'fecha');
    const h = cambios.find(c => c.campo === 'hora');
    const antes = `${fmtFecha(f ? f.antes : e.fecha)} ${h ? h.antes : (e.hora || '')}`.trim();
    const ahora = `${fmtFecha(e.fecha)} ${e.hora || ''}`.trim();
    return `${antes} → ${ahora}`;
  }
  if (e.tipo === 'profesional' || e.tipo === 'servicio') {
    const campo = e.tipo === 'profesional' ? 'barbero' : 'servicio';
    const c = cambios.find(x => x.campo === campo);
    if (c) return `${c.antes || '—'} → ${c.despues || '—'}`;
  }
  const partes = [];
  if (e.servicio) partes.push(e.servicio);
  if (e.barbero) partes.push(`con ${e.barbero}`);
  const cuando = `${fmtFecha(e.fecha)} ${e.hora || ''}`.trim();
  if (cuando) partes.push(cuando);
  return partes.join(' · ');
}

function Fila({ e }) {
  const cfg = TIPO_CFG[e.tipo] || TIPO_CFG.cambio;
  const { Icon } = cfg;
  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b border-slate-800 last:border-b-0">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${cfg.bg}`}>
        <Icon size={16} className={cfg.color} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-200 truncate">
            {cfg.label} · {e.clienteNombre || 'Cliente'}
          </p>
          <span className="text-[10px] text-slate-500 shrink-0">{hace(e.ts)}</span>
        </div>
        <p className="text-xs text-slate-400 truncate mt-0.5">{detalleDe(e)}</p>
        <p className="text-[11px] text-slate-500 mt-0.5">{actorDe(e)}</p>
      </div>
    </div>
  );
}

export default function Actividad() {
  const [lim, setLim] = useState(PAGE);
  const [filtro, setFiltro] = useState('todos');
  const [search, setSearch] = useState('');

  const { data: eventos = [], loading, error } = useCollection(
    'actividad',
    [orderBy('ts', 'desc'), limit(lim)],
    [lim],
  );

  const filtrados = useMemo(() => {
    let list = eventos;
    if (filtro === 'completada') list = list.filter(e => ['completada', 'no_asistio'].includes(e.tipo));
    else if (filtro !== 'todos') list = list.filter(e => e.tipo === filtro);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(e =>
        (e.clienteNombre || '').toLowerCase().includes(q)
        || (e.barbero || '').toLowerCase().includes(q)
        || (e.servicio || '').toLowerCase().includes(q));
    }
    return list;
  }, [eventos, filtro, search]);

  const hayMas = eventos.length >= lim;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <History size={20} className="text-emerald-400" />
          <h1 className="text-xl font-bold text-primary">Actividad</h1>
        </div>
        <p className="text-sm text-slate-400">
          Historial de lo que le pasa a las citas — quién las creó, movió o canceló. Se guarda 90 días.
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
          {FILTROS.map(({ key, label }) => (
            <button key={key} onClick={() => setFiltro(key)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${filtro === key ? 'bg-slate-700 text-primary' : 'text-slate-500 hover:text-slate-300'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar cliente, profesional o servicio…" autoComplete="off"
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-primary placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Feed */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {error ? (
          /* Error ≠ vacío: un módulo caído no puede parecer "sin actividad". */
          <div className="text-center py-12 px-6">
            <p className="text-sm text-rose-400 font-semibold">No se pudo cargar el historial</p>
            <p className="text-xs text-slate-500 mt-1">Reintenta en un momento ({error.code || 'error'}).</p>
          </div>
        ) : loading && !eventos.length ? (
          <p className="text-sm text-slate-500 text-center py-10">Cargando actividad…</p>
        ) : !filtrados.length ? (
          <div className="text-center py-12 px-6">
            <History size={36} className="mx-auto text-slate-700" />
            <p className="text-sm text-slate-400 mt-3">Sin actividad {filtro !== 'todos' || search ? 'con este filtro' : 'todavía'}</p>
            <p className="text-xs text-slate-500 mt-1">
              Acá queda el registro: reservas nuevas, cambios de hora, cancelaciones — y quién hizo cada cosa.
            </p>
          </div>
        ) : (
          filtrados.map(e => <Fila key={e.id} e={e} />)
        )}
      </div>

      {hayMas && (
        <button onClick={() => setLim(l => l + PAGE)}
          className="w-full py-2.5 rounded-lg text-sm font-bold bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 transition-all">
          Ver más
        </button>
      )}
    </div>
  );
}
