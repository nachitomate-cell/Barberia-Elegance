import { useState, useMemo, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, Plus, X, Ban, CalendarOff,
  CheckCircle2, XCircle, Clock, Trash2, Lock, History,
  User, Phone, Mail, Scissors, CalendarDays, DollarSign,
  Timer, MessageSquare, BadgeCheck,
} from 'lucide-react';
import {
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp, where, orderBy, limit,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { tenantCol } from '../lib/tenantUtils';
import { useCollection } from '../hooks/useCollection';
import { useTenant } from '../contexts/TenantContext';
import ReviewModal from '../components/ReviewModal';
import HelpModal, { HelpButton } from '../components/ui/HelpModal';

/* ── Constants ─────────────────────────────────────────────── */
const HOUR_START  = 8;
const HOUR_END    = 20;
const SLOT_MINS   = 30;
const TOTAL_SLOTS = (HOUR_END - HOUR_START) * (60 / SLOT_MINS);

const STATUS_STYLE = {
  Confirmada: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300',
  Cancelada:  'bg-red-500/10   border-red-500/30     text-red-400',
  Completada: 'bg-blue-500/10  border-blue-500/30    text-blue-400',
};

/* ── Helpers ─────────────────────────────────────────────────── */
function fmt(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function toMins(t) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }
function slotIdx(t) { return Math.floor((toMins(t) - HOUR_START * 60) / SLOT_MINS); }

const TIME_LABELS = Array.from({ length: TOTAL_SLOTS }, (_, i) => {
  const mins = HOUR_START * 60 + i * SLOT_MINS;
  return `${String(Math.floor(mins / 60)).padStart(2,'0')}:${String(mins % 60).padStart(2,'0')}`;
});

/* ── Modal shell ─────────────────────────────────────────────── */
function Modal({ title, onClose, children, footer }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h3 className="font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-all"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-slate-800">{footer}</div>}
      </div>
    </div>
  );
}

/* ── CitaModal (create / edit) ───────────────────────────────── */
function CitaModal({ cita, barberos, servicios, defaultHora, defaultBarberoId, dateStr, onClose, onComplete }) {
  const isNew = !cita;
  const defaultBarb = defaultBarberoId || barberos[0]?.id || '';
  const firstSvc = servicios[0];
  const [form, setForm] = useState({
    clienteNombre:   cita?.clienteNombre   || '',
    clienteEmail:    cita?.clienteEmail    || '',
    clienteTelefono: cita?.clienteTelefono || '',
    servicioId:      cita?.servicioId      || firstSvc?.id       || '',
    servicioNombre:  cita?.servicioNombre  || firstSvc?.nombre   || '',
    precio:          Number(cita?.precio)  || Number(firstSvc?.precio)   || 0,
    duracion:        Number(cita?.duracion)|| Number(firstSvc?.duracion) || 30,
    barberoId:       cita?.barberoId       || defaultBarb,
    barbero:         cita?.barbero         || barberos.find(b => b.id === defaultBarb)?.nombre || '',
    hora:            cita?.hora            || defaultHora || '09:00',
    estado:          cita?.estado          || 'Confirmada',
    nota:            cita?.nota            || '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const onServicioChange = id => {
    const s = servicios.find(s => s.id === id);
    setForm(f => ({
      ...f,
      servicioId:     id,
      servicioNombre: s?.nombre   || '',
      precio:         Number(s?.precio)   || 0,
      duracion:       Number(s?.duracion) || 30,
    }));
  };

  const onBarberoChange = id => {
    const b = barberos.find(b => b.id === id);
    set('barberoId', id);
    set('barbero', b?.nombre || '');
  };

  const handleSave = async () => {
    if (!form.clienteNombre.trim()) return;
    setSaving(true);
    try {
      const payload = { ...form, fecha: dateStr, updatedAt: serverTimestamp() };
      if (isNew) {
        payload.creadoEn = serverTimestamp();
        await addDoc(tenantCol('citas'), payload);
        onClose();
      } else {
        await updateDoc(doc(db, `${tenantCol('citas').path}/${cita.id}`), payload);
        const yaEraCompletada = cita?.estado === 'Completada';
        if (form.estado === 'Completada' && !yaEraCompletada && onComplete) {
          onComplete({ ...cita, ...payload });
        } else {
          onClose();
        }
      }
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm('¿Eliminar esta cita?')) return;
    await deleteDoc(doc(db, `${tenantCol('citas').path}/${cita.id}`));
    onClose();
  };

  const field = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors';
  const lbl   = 'block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1';

  return (
    <Modal
      title={isNew ? 'Nueva cita' : 'Editar cita'}
      onClose={onClose}
      footer={
        <div className="flex items-center gap-2">
          {!isNew && (
            <button onClick={handleDelete} className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors">
              <Trash2 size={15} />
            </button>
          )}
          <div className="flex-1" />
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all">Cancelar</button>
          <button onClick={handleSave} disabled={saving || !form.clienteNombre}
            className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-all">
            {saving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {isNew ? 'Crear cita' : 'Guardar'}
          </button>
        </div>
      }
    >
      <div>
        <label className={lbl}>Nombre del cliente *</label>
        <input className={field} placeholder="Juan Pérez" value={form.clienteNombre} onChange={e => set('clienteNombre', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Email</label>
          <input className={field} type="email" placeholder="juan@email.com" value={form.clienteEmail} onChange={e => set('clienteEmail', e.target.value)} />
        </div>
        <div>
          <label className={lbl}>Teléfono</label>
          <input className={field} placeholder="+569..." value={form.clienteTelefono} onChange={e => set('clienteTelefono', e.target.value)} />
        </div>
      </div>
      <div>
        <label className={lbl}>Servicio</label>
        <select className={field} value={form.servicioId} onChange={e => onServicioChange(e.target.value)}>
          {servicios.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          {servicios.length === 0 && <option value="">Sin servicios</option>}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Barbero</label>
          <select className={field} value={form.barberoId} onChange={e => onBarberoChange(e.target.value)}>
            {barberos.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Hora</label>
          <select className={field} value={form.hora} onChange={e => set('hora', e.target.value)}>
            {TIME_LABELS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      {!isNew && (
        <div>
          <label className={lbl}>Estado</label>
          <select className={field} value={form.estado} onChange={e => set('estado', e.target.value)}>
            <option>Confirmada</option>
            <option>Completada</option>
            <option>Cancelada</option>
          </select>
        </div>
      )}
      <div>
        <label className={lbl}>Nota interna</label>
        <textarea className={`${field} resize-none`} rows={2} placeholder="Ej: Cliente prefiere sin gel..." value={form.nota} onChange={e => set('nota', e.target.value)} />
      </div>
    </Modal>
  );
}

/* ── BloqueoModal ────────────────────────────────────────────── */
function BloqueoModal({ barberos, dateStr, defaultBarberoId, defaultHora, defaultTipo, onClose }) {
  const [tipo, setTipo]     = useState(defaultTipo || 'parcial');
  const [barberoId, setBId] = useState(defaultBarberoId || '');
  const [horaIni,  setHIni] = useState(defaultHora || '09:00');
  const [horaFin,  setHFin] = useState(() => {
    const idx = TIME_LABELS.indexOf(defaultHora || '09:00');
    return TIME_LABELS[Math.min(idx + 2, TIME_LABELS.length - 1)] || '10:00';
  });
  const [nota, setNota]     = useState('');
  const [saving, setSaving] = useState(false);
  const [horaError, setHoraError] = useState('');

  const handleSave = async () => {
    if (tipo === 'parcial' && toMins(horaFin) <= toMins(horaIni)) {
      setHoraError('La hora de fin debe ser posterior a la hora de inicio.');
      return;
    }
    setHoraError('');
    setSaving(true);
    try {
      const payload = { fecha: dateStr, nota, creadoEn: serverTimestamp() };
      if (barberoId) payload.barberoId = barberoId;
      if (tipo === 'dia') {
        payload.todo_el_dia = true;
      } else {
        payload.hora_inicio = horaIni;
        payload.hora_fin    = horaFin;
      }
      await addDoc(tenantCol('bloqueos'), payload);
      onClose();
    } finally { setSaving(false); }
  };

  const field = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors';
  const lbl   = 'block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1';

  return (
    <Modal
      title="Bloquear horario"
      onClose={onClose}
      footer={
        <div className="flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all">Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-all">
            {saving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            Bloquear
          </button>
        </div>
      }
    >
      {/* Tipo */}
      <div className="flex gap-2">
        {[{ v: 'parcial', l: 'Rango de horas' }, { v: 'dia', l: 'Día completo' }].map(({ v, l }) => (
          <button key={v} onClick={() => { setTipo(v); setHoraError(''); }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${tipo === v ? 'border-red-500/60 bg-red-500/10 text-red-400' : 'border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* Barbero */}
      <div>
        <label className={lbl}>Barbero (vacío = todos)</label>
        <select className={field} value={barberoId} onChange={e => setBId(e.target.value)}>
          <option value="">— Todos los barberos —</option>
          {barberos.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
        </select>
      </div>

      {/* Horario parcial */}
      {tipo === 'parcial' && (
        <div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Desde</label>
              <select className={field} value={horaIni} onChange={e => { setHIni(e.target.value); setHoraError(''); }}>
                {TIME_LABELS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Hasta</label>
              <select className={field} value={horaFin} onChange={e => { setHFin(e.target.value); setHoraError(''); }}>
                {TIME_LABELS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          {horaError && <p className="text-xs text-red-400 font-semibold mt-1.5">{horaError}</p>}
        </div>
      )}

      <div>
        <label className={lbl}>Motivo (opcional)</label>
        <input className={field} placeholder="Ej: Almuerzo, vacaciones…" value={nota} onChange={e => setNota(e.target.value)} />
      </div>
    </Modal>
  );
}

/* ── BloqueoBlock ────────────────────────────────────────────── */
function BloqueoBlock({ bloqueo, onDelete }) {
  const startIdx = bloqueo.todo_el_dia ? 0 : Math.max(0, slotIdx(bloqueo.hora_inicio));
  const endIdx   = bloqueo.todo_el_dia ? TOTAL_SLOTS : Math.min(TOTAL_SLOTS, slotIdx(bloqueo.hora_fin));
  const spans    = Math.max(endIdx - startIdx, 1);

  return (
    <div
      title={`Bloqueado${bloqueo.nota ? ': ' + bloqueo.nota : ''}`}
      onClick={() => { if (confirm('¿Desbloquear este horario?')) onDelete(bloqueo.id); }}
      className="absolute inset-x-0.5 rounded-md border border-red-500/30 bg-red-950/40 px-2 py-1 overflow-hidden cursor-pointer hover:bg-red-950/60 transition-all"
      style={{ top: `${startIdx * 40}px`, height: `${spans * 40 - 4}px` }}
    >
      <div className="flex items-center gap-1 text-[10px] text-red-400 font-semibold">
        <Lock size={10} />
        <span className="truncate">{bloqueo.todo_el_dia ? 'Día cerrado' : `${bloqueo.hora_inicio}–${bloqueo.hora_fin}`}</span>
      </div>
      {bloqueo.nota && <p className="text-[9px] text-red-400/60 truncate mt-0.5">{bloqueo.nota}</p>}
    </div>
  );
}

/* ── AppointmentBlock ────────────────────────────────────────── */
function AppointmentBlock({ cita, colIndex, colTotal, onClick }) {
  const slot  = slotIdx(cita.hora);
  const spans = Math.max(1, Math.round((cita.duracion || 30) / SLOT_MINS));
  const color = STATUS_STYLE[cita.estado] ?? STATUS_STYLE.Confirmada;
  const pct   = 100 / colTotal;

  return (
    <div
      onClick={() => onClick(cita)}
      className={`absolute rounded-md border px-2 py-1 overflow-hidden cursor-pointer hover:brightness-125 transition-all text-xs ${color}`}
      style={{
        top:    `${slot * 40}px`,
        height: `${spans * 40 - 4}px`,
        left:   `calc(${colIndex * pct}% + 2px)`,
        width:  `calc(${pct}% - 4px)`,
      }}
    >
      <p className="font-semibold truncate leading-tight">{cita.clienteNombre || 'Cliente'}</p>
      <p className="truncate text-[10px] opacity-75">{cita.servicioNombre}</p>
      <p className="truncate text-[10px] opacity-50">{cita.hora}</p>
    </div>
  );
}

/* ── SlotRow (clickable empty slot) ─────────────────────────── */
function SlotRow({ idx, barberoId, dateStr, onNewCita, onNewBloqueo, blockMode }) {
  const hora = TIME_LABELS[idx];
  return (
    <div
      onClick={() => blockMode ? onNewBloqueo(barberoId, hora) : onNewCita(barberoId, hora)}
      className={`absolute inset-x-0 h-10 border-b border-slate-800/40 transition-colors ${
        idx % 2 === 0 ? '' : 'bg-slate-800/10'
      } ${blockMode ? 'hover:bg-red-950/20 cursor-crosshair' : 'hover:bg-emerald-900/10 cursor-pointer'}`}
      style={{ top: `${idx * 40}px` }}
    />
  );
}

/* ── UltimaCitaModal ─────────────────────────────────────────── */
const ESTADO_BADGE = {
  Confirmada: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  Confirmado: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  Completada: 'bg-blue-500/20   text-blue-300   border-blue-500/40',
  Cancelada:  'bg-red-500/20    text-red-300    border-red-500/40',
  Pendiente:  'bg-amber-500/20  text-amber-300  border-amber-500/40',
};

function fmtTimestamp(val) {
  if (!val) return '—';
  const d = val?.toDate ? val.toDate() : new Date(val);
  return d.toLocaleString('es-CL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function Row({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-800 last:border-b-0">
      <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={13} className="text-slate-400" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-0.5">{label}</p>
        <p className="text-sm text-white break-words">{value}</p>
      </div>
    </div>
  );
}

function UltimaCitaModal({ cita, loading, onClose }) {
  return (
    <Modal
      title={
        <span className="flex items-center gap-2">
          <History size={15} className="text-slate-400" />
          Última cita agendada
        </span>
      }
      onClose={onClose}
    >
      {loading ? (
        <div className="flex justify-center py-8">
          <span className="w-6 h-6 border-2 border-slate-600 border-t-slate-300 rounded-full animate-spin" />
        </div>
      ) : !cita ? (
        <div className="flex flex-col items-center py-8 text-center gap-2">
          <CalendarDays size={32} className="text-slate-700" />
          <p className="text-sm text-slate-500">No hay citas registradas aún.</p>
        </div>
      ) : (
        <div>
          {/* Estado badge */}
          <div className="flex items-center justify-between mb-4">
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${ESTADO_BADGE[cita.estado] ?? 'bg-slate-700 text-slate-300 border-slate-600'}`}>
              {cita.estado ?? 'Sin estado'}
            </span>
            <span className="text-xs text-slate-600 font-mono">{cita.fecha} · {cita.hora}</span>
          </div>

          {/* Datos del cliente */}
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Cliente</p>
          <div className="bg-slate-800/50 rounded-xl px-4 mb-4">
            <Row icon={User}         label="Nombre"    value={cita.clienteNombre}   />
            <Row icon={Mail}         label="Email"     value={cita.clienteEmail}    />
            <Row icon={Phone}        label="Teléfono"  value={cita.clienteTelefono} />
          </div>

          {/* Datos de la cita */}
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Cita</p>
          <div className="bg-slate-800/50 rounded-xl px-4 mb-4">
            <Row icon={CalendarDays} label="Fecha"     value={cita.fecha}           />
            <Row icon={Clock}        label="Hora"      value={cita.hora}            />
            <Row icon={Scissors}     label="Servicio"  value={cita.servicioNombre}  />
            <Row icon={BadgeCheck}   label="Barbero"   value={cita.barbero}         />
            <Row icon={Timer}        label="Duración"  value={cita.duracion ? `${cita.duracion} min` : null} />
            <Row icon={DollarSign}   label="Precio"    value={cita.precio != null ? `$${Number(cita.precio).toLocaleString('es-CL')}` : null} />
          </div>

          {/* Nota y fecha de reserva */}
          {cita.nota && (
            <>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Nota</p>
              <div className="bg-slate-800/50 rounded-xl px-4 mb-4">
                <Row icon={MessageSquare} label="Nota interna" value={cita.nota} />
              </div>
            </>
          )}

          <p className="text-[10px] text-slate-600 text-right mt-2">
            Reservada el {fmtTimestamp(cita.creadoEn)}
          </p>
        </div>
      )}
    </Modal>
  );
}

/* ── Main Agenda component ───────────────────────────────────── */
export default function Agenda() {
  const { id: tenantId } = useTenant();
  const [date,          setDate]          = useState(new Date());
  const [showHelp,      setShowHelp]      = useState(false);
  const [blockMode,     setBlockMode]     = useState(false);
  const [citaModal,     setCitaModal]     = useState(null);
  const [blqModal,      setBlqModal]      = useState(null);
  const [reviewCita,    setReviewCita]    = useState(null);
  const [showUltima,    setShowUltima]    = useState(false);

  const { data: ultimasCitas, loading: loadingUltima } = useCollection(
    'citas',
    [orderBy('creadoEn', 'desc'), limit(1)],
    [],
  );
  const ultimaCita = ultimasCitas[0] ?? null;

  const dateStr = fmt(date);

  const { data: rawBarberos } = useCollection('barberos');
  const { data: citas }       = useCollection('citas',    [where('fecha', '==', dateStr)], [dateStr]);
  const { data: bloqueos }    = useCollection('bloqueos', [where('fecha', '==', dateStr)], [dateStr]);
  const { data: servicios }   = useCollection('servicios');

  const barberos = useMemo(() =>
    rawBarberos.filter(b => !b._mainDocId && b.disponible !== false && b.rol !== 'admin'),
  [rawBarberos]);

  const moveDay = delta => { const d = new Date(date); d.setDate(d.getDate() + delta); setDate(d); };

  const handleDeleteBloqueo = useCallback(async id => {
    await deleteDoc(doc(db, `${tenantCol('bloqueos').path}/${id}`));
  }, []);

  const openNewCita    = (barberoId, hora) => setCitaModal({ cita: null, barberoId, hora });
  const openEditCita   = (cita)            => setCitaModal({ cita, barberoId: cita.barberoId, hora: cita.hora });
  const openNewBloqueo = (barberoId, hora) => setBlqModal({ barberoId, hora, tipo: 'parcial' });

  const diaGlobalCerrado = bloqueos.some(b => b.todo_el_dia && !b.barberoId);

  const bloqueosPorBarbero = useCallback((barberoId) =>
    bloqueos.filter(b => !b.barberoId || b.barberoId === barberoId),
  [bloqueos]);

  return (
    <div className="flex flex-col h-full gap-3">

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <span className="flex items-center gap-2 mr-2">
          <h1 className="text-xl font-bold text-white">Agenda</h1>
          <HelpButton onClick={() => setShowHelp(true)} />
        </span>

        <div className="flex items-center gap-1">
          <button onClick={() => moveDay(-1)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all"><ChevronLeft size={18} /></button>
          <span className="text-sm font-semibold text-white min-w-[150px] text-center capitalize">
            {date.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
          <button onClick={() => moveDay(1)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all"><ChevronRight size={18} /></button>
          <button onClick={() => setDate(new Date())} className="ml-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-all">Hoy</button>
        </div>

        <div className="flex-1" />

        <button
          onClick={() => setBlockMode(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
            blockMode
              ? 'border-red-500/60 bg-red-500/10 text-red-400'
              : 'border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
          }`}
        >
          <Ban size={14} /> {blockMode ? 'Modo bloqueo activo' : 'Bloquear horas'}
        </button>

        <button
          onClick={() => setBlqModal({ barberoId: '', hora: '', tipo: 'dia' })}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-700 text-slate-400 hover:text-red-400 hover:border-red-500/40 transition-all"
        >
          <CalendarOff size={14} /> Cerrar día
        </button>

        <button
          onClick={() => setShowUltima(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 transition-all"
          title="Última cita agendada"
        >
          <History size={14} /> Última cita
        </button>

        <button
          onClick={() => setCitaModal({ cita: null, barberoId: barberos[0]?.id || '', hora: '09:00' })}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all"
        >
          <Plus size={14} /> Nueva cita
        </button>
      </div>

      {diaGlobalCerrado && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-950/40 border border-red-500/30 rounded-xl text-sm text-red-400 shrink-0">
          <CalendarOff size={16} />
          <span className="flex-1 font-medium">Agenda cerrada para todo el día</span>
        </div>
      )}

      {blockMode && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-950/30 border border-amber-500/30 rounded-xl text-xs text-amber-400 shrink-0">
          <Ban size={14} />
          <span>Modo bloqueo: haz clic en cualquier horario vacío para bloquearlo. Los bloqueados en rojo se pueden hacer clic para desbloquear.</span>
        </div>
      )}

      {/* Swimlane */}
      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl overflow-auto no-scrollbar">
        <div className="flex min-w-max">

          {/* Time axis */}
          <div className="w-16 shrink-0 sticky left-0 bg-slate-900 z-10 border-r border-slate-800">
            <div className="h-10 border-b border-slate-800" />
            {TIME_LABELS.map((t, i) => (
              <div key={i} className="h-10 flex items-center justify-end pr-3 text-[10px] font-mono text-slate-600 border-b border-slate-800/60">
                {t.endsWith(':00') ? t : ''}
              </div>
            ))}
          </div>

          {/* Barber columns */}
          {barberos.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-20 text-slate-600 text-sm">
              Sin barberos activos
            </div>
          ) : barberos.map(b => {
            const barberCitas    = citas.filter(c => c.barberoId === b.id);
            const barberBloqueos = bloqueosPorBarbero(b.id);

            // Group citas by start time to handle overlap layout
            const horaGroups = {};
            barberCitas.forEach(c => {
              if (!horaGroups[c.hora]) horaGroups[c.hora] = [];
              horaGroups[c.hora].push(c);
            });
            const layoutCitas = barberCitas.map(c => ({
              cita:     c,
              colIndex: horaGroups[c.hora].indexOf(c),
              colTotal: horaGroups[c.hora].length,
            }));

            return (
              <div key={b.id} className="flex-1 min-w-[160px] border-r border-slate-800 last:border-r-0">
                <div className="h-10 px-3 flex items-center gap-2 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
                  <div className="w-6 h-6 rounded-full overflow-hidden bg-emerald-500/20 flex items-center justify-center shrink-0">
                    {b.foto
                      ? <img src={b.foto} alt={b.nombre} className="w-full h-full object-cover" />
                      : <span className="text-[10px] font-bold text-emerald-400">{b.nombre?.[0] ?? '?'}</span>}
                  </div>
                  <span className="text-xs font-semibold text-white truncate">{b.nombre}</span>
                </div>

                <div className="relative" style={{ height: `${TOTAL_SLOTS * 40}px` }}>
                  {TIME_LABELS.map((_, i) => (
                    <SlotRow
                      key={i}
                      idx={i}
                      barberoId={b.id}
                      dateStr={dateStr}
                      blockMode={blockMode}
                      onNewCita={openNewCita}
                      onNewBloqueo={openNewBloqueo}
                    />
                  ))}
                  {barberBloqueos.map(blq => (
                    <BloqueoBlock key={blq.id} bloqueo={blq} onDelete={handleDeleteBloqueo} />
                  ))}
                  {layoutCitas.map(({ cita, colIndex, colTotal }) => (
                    <AppointmentBlock
                      key={cita.id}
                      cita={cita}
                      colIndex={colIndex}
                      colTotal={colTotal}
                      onClick={openEditCita}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {reviewCita && (
        <ReviewModal
          cita={reviewCita}
          tenantId={tenantId}
          onClose={() => { setReviewCita(null); setCitaModal(null); }}
        />
      )}

      {citaModal && (
        <CitaModal
          cita={citaModal.cita}
          barberos={barberos}
          servicios={servicios}
          defaultHora={citaModal.hora}
          defaultBarberoId={citaModal.barberoId}
          dateStr={dateStr}
          onClose={() => setCitaModal(null)}
          onComplete={cita => setReviewCita(cita)}
        />
      )}
      {blqModal && (
        <BloqueoModal
          barberos={barberos}
          dateStr={dateStr}
          defaultBarberoId={blqModal.barberoId}
          defaultHora={blqModal.hora}
          defaultTipo={blqModal.tipo}
          onClose={() => setBlqModal(null)}
        />
      )}
      {showUltima && (
        <UltimaCitaModal
          cita={ultimaCita}
          loading={loadingUltima}
          onClose={() => setShowUltima(false)}
        />
      )}
      {showHelp && (
        <HelpModal title="Ayuda — Agenda" onClose={() => setShowHelp(false)}>
          <p>La <strong className="text-white">Agenda</strong> muestra las citas del día organizadas por barbero en columnas.</p>
          <ul className="space-y-1.5 list-disc list-inside text-slate-400">
            <li>Navega entre días con las flechas o el botón <span className="text-white">Hoy</span>.</li>
            <li>Haz clic en un horario vacío para <span className="text-white">crear una cita</span>.</li>
            <li>Haz clic en una cita existente para <span className="text-white">editar su estado</span> (Confirmada, Completada, Cancelada) o eliminarla.</li>
            <li>Usa <span className="text-white">Bloquear</span> para marcar horas no disponibles (día libre, vacaciones, etc.).</li>
            <li>Al completar una cita se solicitará reseña al cliente automáticamente.</li>
          </ul>
        </HelpModal>
      )}
    </div>
  );
}
