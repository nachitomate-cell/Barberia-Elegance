import { useState, useMemo, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, Plus, X, Ban, CalendarOff,
  CheckCircle2, XCircle, Clock, Trash2, Lock,
} from 'lucide-react';
import {
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp, where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { tenantCol } from '../lib/tenantUtils';
import { useCollection } from '../hooks/useCollection';

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
function fmt(d) { return d.toISOString().split('T')[0]; }
function toMins(t) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }
function fromMins(m) { return `${String(HOUR_START + Math.floor((m - HOUR_START * 60) / 60)).padStart(2,'0')}:${String((m - HOUR_START * 60) % 60).padStart(2,'0')}`; }
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
function CitaModal({ cita, barberos, servicios, defaultHora, defaultBarberoId, dateStr, onClose }) {
  const isNew = !cita;
  const defaultBarb = defaultBarberoId || barberos[0]?.id || '';
  const [form, setForm] = useState({
    clienteNombre:  cita?.clienteNombre  || '',
    clienteEmail:   cita?.clienteEmail   || '',
    clienteTelefono:cita?.clienteTelefono|| '',
    servicioId:     cita?.servicioId     || servicios[0]?.id || '',
    servicioNombre: cita?.servicioNombre || servicios[0]?.nombre || '',
    barberoId:      cita?.barberoId      || defaultBarb,
    barbero:        cita?.barbero        || barberos.find(b => b.id === defaultBarb)?.nombre || '',
    hora:           cita?.hora           || defaultHora || '09:00',
    estado:         cita?.estado         || 'Confirmada',
    nota:           cita?.nota           || '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const onServicioChange = id => {
    const s = servicios.find(s => s.id === id);
    set('servicioId', id);
    set('servicioNombre', s?.nombre || '');
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
      const payload = {
        ...form,
        fecha: dateStr,
        updatedAt: serverTimestamp(),
      };
      if (isNew) {
        payload.creadoEn = serverTimestamp();
        await addDoc(tenantCol('citas'), payload);
      } else {
        await updateDoc(doc(db, `${tenantCol('citas').path}/${cita.id}`), payload);
      }
      onClose();
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
function BloqueoModal({ barberos, dateStr, defaultBarberoId, defaultHora, onClose }) {
  const [tipo, setTipo]     = useState('parcial'); // 'parcial' | 'dia'
  const [barberoId, setBId] = useState(defaultBarberoId || '');
  const [horaIni,  setHIni] = useState(defaultHora || '09:00');
  const [horaFin,  setHFin] = useState(() => {
    const idx = TIME_LABELS.indexOf(defaultHora || '09:00');
    return TIME_LABELS[Math.min(idx + 2, TIME_LABELS.length - 1)] || '10:00';
  });
  const [nota, setNota]     = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        fecha: dateStr,
        nota,
        creadoEn: serverTimestamp(),
      };
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
          <button key={v} onClick={() => setTipo(v)}
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
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Desde</label>
            <select className={field} value={horaIni} onChange={e => setHIni(e.target.value)}>
              {TIME_LABELS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Hasta</label>
            <select className={field} value={horaFin} onChange={e => setHFin(e.target.value)}>
              {TIME_LABELS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
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
  const startIdx = bloqueo.todo_el_dia ? 0 : slotIdx(bloqueo.hora_inicio);
  const endIdx   = bloqueo.todo_el_dia ? TOTAL_SLOTS : slotIdx(bloqueo.hora_fin);
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
function AppointmentBlock({ cita, onClick }) {
  const slot  = slotIdx(cita.hora);
  const spans = Math.max(1, Math.round((cita.duracion || 30) / SLOT_MINS));
  const color = STATUS_STYLE[cita.estado] ?? STATUS_STYLE.Confirmada;

  return (
    <div
      onClick={() => onClick(cita)}
      className={`absolute inset-x-0.5 rounded-md border px-2 py-1 overflow-hidden cursor-pointer hover:brightness-125 transition-all text-xs ${color}`}
      style={{ top: `${slot * 40}px`, height: `${spans * 40 - 4}px` }}
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

/* ── Main Agenda component ───────────────────────────────────── */
export default function Agenda() {
  const [date,      setDate]      = useState(new Date());
  const [blockMode, setBlockMode] = useState(false);
  const [citaModal, setCitaModal] = useState(null);    // { cita?, barberoId, hora }
  const [blqModal,  setBlqModal]  = useState(null);    // { barberoId, hora }

  const dateStr = fmt(date);

  const { data: rawBarberos } = useCollection('barberos');
  const { data: citas }       = useCollection('citas',    [where('fecha', '==', dateStr)]);
  const { data: bloqueos }    = useCollection('bloqueos', [where('fecha', '==', dateStr)]);
  const { data: servicios }   = useCollection('servicios');

  const barberos = useMemo(() => rawBarberos.filter(b => !b._mainDocId && b.disponible !== false), [rawBarberos]);

  const moveDay = delta => { const d = new Date(date); d.setDate(d.getDate() + delta); setDate(d); };

  const handleDeleteBloqueo = useCallback(async id => {
    await deleteDoc(doc(db, `${tenantCol('bloqueos').path}/${id}`));
  }, []);

  const openNewCita   = (barberoId, hora) => setCitaModal({ cita: null, barberoId, hora });
  const openEditCita  = (cita)             => setCitaModal({ cita, barberoId: cita.barberoId, hora: cita.hora });
  const openNewBloqueo = (barberoId, hora) => setBlqModal({ barberoId, hora });

  /* Check if day is fully closed (bloqueo todo_el_dia sin barberoId) */
  const diaGlobalCerrado = bloqueos.some(b => b.todo_el_dia && !b.barberoId);

  /* Bloqueos by barber (including global ones) */
  const bloqueosPorBarbero = useCallback((barberoId) => {
    return bloqueos.filter(b => !b.barberoId || b.barberoId === barberoId);
  }, [bloqueos]);

  const isHoraBlockedForBarbero = useCallback((barberoId, hora) => {
    const mins = toMins(hora);
    return bloqueosPorBarbero(barberoId).some(b => {
      if (b.todo_el_dia) return true;
      if (b.hora_inicio && b.hora_fin) {
        return mins >= toMins(b.hora_inicio) && mins < toMins(b.hora_fin);
      }
      return false;
    });
  }, [bloqueosPorBarbero]);

  return (
    <div className="flex flex-col h-full gap-3">

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <h1 className="text-xl font-bold text-white mr-2">Agenda</h1>

        {/* Date nav */}
        <div className="flex items-center gap-1">
          <button onClick={() => moveDay(-1)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all"><ChevronLeft size={18} /></button>
          <span className="text-sm font-semibold text-white min-w-[150px] text-center capitalize">
            {date.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
          <button onClick={() => moveDay(1)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all"><ChevronRight size={18} /></button>
          <button onClick={() => setDate(new Date())} className="ml-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-all">Hoy</button>
        </div>

        <div className="flex-1" />

        {/* Block mode toggle */}
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

        {/* Close full day */}
        <button
          onClick={() => setBlqModal({ barberoId: '', hora: '', tipo: 'dia' })}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-700 text-slate-400 hover:text-red-400 hover:border-red-500/40 transition-all"
        >
          <CalendarOff size={14} /> Cerrar día
        </button>

        {/* Nueva cita */}
        <button
          onClick={() => setCitaModal({ cita: null, barberoId: barberos[0]?.id || '', hora: '09:00' })}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all"
        >
          <Plus size={14} /> Nueva cita
        </button>
      </div>

      {/* Day-closed banner */}
      {diaGlobalCerrado && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-950/40 border border-red-500/30 rounded-xl text-sm text-red-400 shrink-0">
          <CalendarOff size={16} />
          <span className="flex-1 font-medium">Agenda cerrada para todo el día</span>
        </div>
      )}

      {/* Block mode hint */}
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
            const barberCitas    = citas.filter(c => c.barberoId === b.id || c.barbero === b.nombre);
            const barberBloqueos = bloqueosPorBarbero(b.id);

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

                {/* Slots + appointments + bloqueos */}
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
                  {barberCitas.map(c => (
                    <AppointmentBlock key={c.id} cita={c} onClick={openEditCita} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modals */}
      {citaModal && (
        <CitaModal
          cita={citaModal.cita}
          barberos={barberos}
          servicios={servicios}
          defaultHora={citaModal.hora}
          defaultBarberoId={citaModal.barberoId}
          dateStr={dateStr}
          onClose={() => setCitaModal(null)}
        />
      )}
      {blqModal && (
        <BloqueoModal
          barberos={barberos}
          dateStr={dateStr}
          defaultBarberoId={blqModal.barberoId}
          defaultHora={blqModal.hora}
          onClose={() => setBlqModal(null)}
        />
      )}
    </div>
  );
}
