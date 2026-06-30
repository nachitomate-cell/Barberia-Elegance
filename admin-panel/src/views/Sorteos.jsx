import { useState, useMemo, useEffect } from 'react';
import { addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Plus, X, Eye, Link2, CheckCheck, Search, Calendar,
  Users, Sparkles, Loader2, PartyPopper, Ticket, AlertCircle,
} from 'lucide-react';
import { tenantCol, tenantDoc } from '../lib/tenantUtils';
import { useCollection } from '../hooks/useCollection';
import { useAuth } from '../contexts/AuthContext';

/* ── Helpers ───────────────────────────────────────────────────────── */
const MONTHS_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
function pad(n) { return String(n).padStart(2, '0'); }

/** Formatea un rango "01 Jun – 30 Jun 2026" en español compacto. */
function formatRange(start, end) {
  const s = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);
  if (isNaN(s) || isNaN(e)) return '';
  const sameYear  = s.getFullYear() === e.getFullYear();
  const sameMonth = sameYear && s.getMonth() === e.getMonth();
  const yearSuffix = ` ${e.getFullYear()}`;
  const sStr = sameMonth
    ? `${pad(s.getDate())}`
    : `${pad(s.getDate())} ${MONTHS_ES[s.getMonth()]}`;
  const eStr = `${pad(e.getDate())} ${MONTHS_ES[e.getMonth()]}${yearSuffix}`;
  return `${sStr} – ${eStr}`;
}

/** True si la fecha fin (YYYY-MM-DD) ya quedó atrás (incluido el día actual). */
function isClosingDay(end) {
  if (!end) return false;
  const e = new Date(`${end}T23:59:59`);
  return e.getTime() <= Date.now();
}

const STATUS_CONFIG = {
  activo:     { label: 'Activo',     color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  finalizado: { label: 'Finalizado', color: 'text-slate-400   bg-slate-500/10   border-slate-500/20'   },
};

/* ── Animaciones ──────────────────────────────────────────────────── */
const backdrop = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };
const panel = {
  initial: { opacity: 0, scale: 0.96, y: 12 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit:    { opacity: 0, scale: 0.96, y: 12 },
};
const spring = { type: 'spring', stiffness: 420, damping: 32 };

/* ── ModalShell ───────────────────────────────────────────────────── */
function ModalShell({ children, onClose, maxW = 'max-w-sm' }) {
  return (
    <motion.div
      {...backdrop}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        {...panel} transition={spring}
        className={`bg-slate-900 border border-slate-800 rounded-2xl w-full ${maxW} shadow-2xl overflow-hidden`}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

/* ── CreateSorteoModal ────────────────────────────────────────────────
   Escribe un nuevo doc en tenants/{tenantId}/sorteos. Estructura base:
     { nombre, premio, fecha_inicio, fecha_fin, estado,
       ganador_nombre, participantes_count, creadoEn, creadoPor } */
function CreateSorteoModal({ onClose, user }) {
  const [nombre, setNombre]   = useState('');
  const [premio, setPremio]   = useState('');
  const [inicio, setInicio]   = useState('');
  const [fin,    setFin]      = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!nombre.trim() || !inicio || !fin) return;
    if (fin < inicio) {
      setError('La fecha de cierre debe ser igual o posterior al inicio.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await addDoc(tenantCol('sorteos'), {
        nombre:              nombre.trim(),
        premio:              premio.trim(),
        fecha_inicio:        inicio, // YYYY-MM-DD (string, igual que vence en gift cards)
        fecha_fin:           fin,
        estado:              'activo',
        ganador_nombre:      null,
        participantes_count: 0,
        creadoEn:            serverTimestamp(),
        creadoPor:           user?.uid || 'admin',
      });
      onClose();
    } catch (err) {
      console.error('[Sorteos/create] error:', err);
      setError(err.message || 'No se pudo crear el sorteo.');
      setSubmitting(false);
    }
  };

  return (
    <ModalShell onClose={submitting ? undefined : onClose}>
      <div className="flex items-center justify-between p-5 border-b border-slate-800">
        <p className="text-sm font-bold text-white">Nuevo sorteo</p>
        <button onClick={onClose} disabled={submitting} className="text-slate-500 hover:text-white disabled:opacity-30">
          <X size={16} />
        </button>
      </div>

      <form onSubmit={submit} className="p-5 space-y-4">
        <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Nombre del sorteo</label>
          <input
            type="text" value={nombre} onChange={e => setNombre(e.target.value)}
            placeholder="Ej: Kit de Cuidado Premium"
            className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            disabled={submitting}
            required
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Premio</label>
          <input
            type="text" value={premio} onChange={e => setPremio(e.target.value)}
            placeholder="Ej: Set Wahl + productos premium"
            className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            disabled={submitting}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Inicio</label>
            <input
              type="date" value={inicio} onChange={e => setInicio(e.target.value)}
              className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
              disabled={submitting}
              required
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Cierre</label>
            <input
              type="date" value={fin} onChange={e => setFin(e.target.value)} min={inicio || undefined}
              className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
              disabled={submitting}
              required
            />
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-400 flex items-center gap-1">
            <AlertCircle size={12} /> {error}
          </p>
        )}

        <button type="submit" disabled={submitting}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold bg-emerald-500 text-emerald-950 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
          {submitting
            ? <><Loader2 size={15} className="animate-spin" /> Creando...</>
            : <><Sparkles size={15} /> Crear sorteo</>}
        </button>
      </form>
    </ModalShell>
  );
}

/* ── DetailModal ──────────────────────────────────────────────────── */
function DetailModal({ sorteo, onClose }) {
  const cfg = STATUS_CONFIG[sorteo.estado] || STATUS_CONFIG.activo;
  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-center justify-between p-5 border-b border-slate-800">
        <p className="text-sm font-bold text-white">Detalles del sorteo</p>
        <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={16} /></button>
      </div>

      <div className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Trophy size={20} className="text-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold text-white truncate">{sorteo.nombre}</p>
            <p className="text-xs font-mono text-slate-500 mt-0.5">{sorteo.id}</p>
          </div>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${cfg.color} shrink-0`}>
            {cfg.label}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-lg p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Participantes</p>
            <p className="text-base font-bold text-white mt-0.5 flex items-center gap-1.5">
              <Users size={13} className="text-slate-400" />
              {sorteo.participantes_count ?? 0}
            </p>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-lg p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Periodo</p>
            <p className="text-xs font-bold text-white mt-0.5 flex items-center gap-1.5">
              <Calendar size={13} className="text-slate-400" />
              {formatRange(sorteo.fecha_inicio, sorteo.fecha_fin)}
            </p>
          </div>
        </div>

        {sorteo.premio && (
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-lg p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Premio</p>
            <p className="text-sm text-slate-200 mt-1 leading-snug">{sorteo.premio}</p>
          </div>
        )}

        {sorteo.ganador_nombre && (
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <PartyPopper size={15} className="text-emerald-400" />
              <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-300">Ganador</p>
            </div>
            <p className="text-sm font-bold text-white">{sorteo.ganador_nombre}</p>
          </div>
        )}

        <button onClick={onClose} className="w-full py-2 rounded-xl text-sm text-slate-400 hover:text-white transition-colors">
          Cerrar
        </button>
      </div>
    </ModalShell>
  );
}

/* ── ElegirGanadorModal ───────────────────────────────────────────────
   Animación corta tipo "ruleta": cicla 4 nombres mock y se detiene en
   uno. Cuando exista persistencia, esto leerá `participantes` reales. */
const MOCK_PARTICIPANTES = [
  'Joaquín Soto', 'Catalina Vidal', 'Diego Müller', 'Renata Olivares',
  'Felipe Aguirre', 'Antonia Espinoza', 'Tomás Bravo', 'Isidora Castro',
];

function ElegirGanadorModal({ sorteo, onClose }) {
  const [spinning,   setSpinning]   = useState(true);
  const [currentName,setCurrentName]= useState(MOCK_PARTICIPANTES[0]);
  const [winner,     setWinner]     = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [error,      setError]      = useState('');

  useEffect(() => {
    let i = 0;
    const tickInterval = setInterval(() => {
      i = (i + 1) % MOCK_PARTICIPANTES.length;
      setCurrentName(MOCK_PARTICIPANTES[i]);
    }, 90);
    const stopAt = setTimeout(() => {
      clearInterval(tickInterval);
      const pick = MOCK_PARTICIPANTES[Math.floor(Math.random() * MOCK_PARTICIPANTES.length)];
      setCurrentName(pick);
      setWinner(pick);
      setSpinning(false);
    }, 1800);
    return () => { clearInterval(tickInterval); clearTimeout(stopAt); };
  }, [sorteo.id]);

  const repetir = () => {
    if (confirming) return;
    setError('');
    setSpinning(true);
    setWinner(null);
    let i = 0;
    const tickInterval = setInterval(() => {
      i = (i + 1) % MOCK_PARTICIPANTES.length;
      setCurrentName(MOCK_PARTICIPANTES[i]);
    }, 90);
    setTimeout(() => {
      clearInterval(tickInterval);
      const pick = MOCK_PARTICIPANTES[Math.floor(Math.random() * MOCK_PARTICIPANTES.length)];
      setCurrentName(pick);
      setWinner(pick);
      setSpinning(false);
    }, 1800);
  };

  const confirmar = async () => {
    if (confirming || !winner) return;
    setConfirming(true);
    setError('');
    try {
      await updateDoc(tenantDoc('sorteos', sorteo.id), {
        estado:           'finalizado',
        ganador_nombre:   winner,
        finalizadoEn:     serverTimestamp(),
      });
      onClose();
    } catch (err) {
      console.error('[Sorteos/ganador] error:', err);
      setError(err.message || 'No se pudo guardar el ganador.');
      setConfirming(false);
    }
  };

  const locked = spinning || confirming;

  return (
    <ModalShell onClose={locked ? undefined : onClose}>
      <div className="flex items-center justify-between p-5 border-b border-slate-800">
        <p className="text-sm font-bold text-white">Elegir ganador</p>
        <button onClick={locked ? undefined : onClose} disabled={locked} className="text-slate-500 hover:text-white disabled:opacity-30">
          <X size={16} />
        </button>
      </div>

      <div className="p-5 space-y-4">
        <p className="text-xs text-slate-400 text-center">{sorteo.nombre}</p>

        <div className="relative bg-slate-800/40 border border-slate-700/60 rounded-2xl p-6 overflow-hidden">
          <motion.div
            initial={{ opacity: 0, rotate: -20 }} animate={{ opacity: 1, rotate: 0 }}
            transition={spring}
            className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-emerald-500/20 blur-2xl pointer-events-none"
          />
          <div className="relative flex flex-col items-center text-center">
            <motion.div
              animate={spinning ? { rotate: 360 } : { rotate: 0 }}
              transition={spinning ? { duration: 1.8, ease: 'easeOut' } : { duration: 0.3 }}
              className="mb-3"
            >
              <Trophy size={32} className="text-emerald-400" />
            </motion.div>

            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-1">
              {spinning ? 'Eligiendo...' : 'El ganador es'}
            </p>

            <AnimatePresence mode="popLayout">
              <motion.p
                key={currentName}
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -10, opacity: 0 }}
                transition={{ duration: 0.12 }}
                className={`text-xl font-bold ${spinning ? 'text-slate-200' : 'text-emerald-400'}`}
              >
                {currentName}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-400 flex items-center gap-1">
            <AlertCircle size={12} /> {error}
          </p>
        )}

        {!spinning && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 gap-2"
          >
            <button
              onClick={repetir}
              disabled={confirming}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Repetir
            </button>
            <button
              onClick={confirmar}
              disabled={confirming}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold bg-emerald-500 text-emerald-950 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {confirming
                ? <><Loader2 size={15} className="animate-spin" /> Guardando...</>
                : <><PartyPopper size={15} /> Confirmar</>}
            </button>
          </motion.div>
        )}
      </div>
    </ModalShell>
  );
}

/* ── SorteoRow ────────────────────────────────────────────────────── */
function SorteoRow({ sorteo, publicLink, onView, onElegirGanador }) {
  const [copied, setCopied] = useState(false);
  const cfg = STATUS_CONFIG[sorteo.estado] || STATUS_CONFIG.activo;
  const isActivo  = sorteo.estado === 'activo';
  const cerrado   = isActivo && isClosingDay(sorteo.fecha_fin);
  const partCount = sorteo.participantes_count ?? 0;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(publicLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* noop */ }
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition-all flex-wrap">
      {/* Icono */}
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${cfg.color.split(' ').slice(1).join(' ')} shrink-0`}>
        <Trophy size={18} className={cfg.color.split(' ')[0]} />
      </div>

      {/* Info principal */}
      <div className="flex-1 min-w-[180px]">
        <p className="font-bold text-sm text-white truncate">{sorteo.nombre}</p>
        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
          <span className="inline-flex items-center gap-1">
            <Calendar size={11} />
            {formatRange(sorteo.fecha_inicio, sorteo.fecha_fin)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users size={11} />
            {partCount} {partCount === 1 ? 'participante' : 'participantes'}
          </span>
        </div>
        {/* Ganador inline cuando finalizado */}
        {!isActivo && sorteo.ganador_nombre && (
          <p className="mt-1.5 text-xs font-semibold text-emerald-400 inline-flex items-center gap-1">
            <PartyPopper size={11} />
            Ganador: <span className="text-emerald-300">{sorteo.ganador_nombre}</span>
          </p>
        )}
      </div>

      {/* Badge estado */}
      <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${cfg.color} shrink-0`}>
        {cfg.label}
      </span>

      {/* Acciones */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Elegir ganador (destacado) */}
        {cerrado && (
          <button
            onClick={() => onElegirGanador(sorteo)}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 transition-all"
            title="Elegir ganador"
          >
            <Sparkles size={13} /> Elegir ganador
          </button>
        )}

        {/* Link público (solo activo) */}
        {isActivo && (
          <button
            onClick={copy}
            className={`text-slate-500 hover:text-emerald-400 transition-colors p-1.5 rounded ${copied ? 'text-emerald-400' : ''}`}
            title="Copiar link público"
          >
            {copied ? <CheckCheck size={14} /> : <Link2 size={14} />}
          </button>
        )}

        {/* Ver detalles */}
        <button
          onClick={() => onView(sorteo)}
          className="text-slate-500 hover:text-emerald-400 transition-colors p-1.5 rounded"
          title="Ver detalles"
        >
          <Eye size={14} />
        </button>
      </div>

      {/* Botón "Elegir ganador" en mobile (full-width abajo) */}
      {cerrado && (
        <button
          onClick={() => onElegirGanador(sorteo)}
          className="sm:hidden w-full mt-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 transition-all"
        >
          <Sparkles size={13} /> Elegir ganador
        </button>
      )}
    </div>
  );
}

/* ── Main view ────────────────────────────────────────────────────── */
export default function Sorteos() {
  const { user } = useAuth();
  const { data: sorteos = [], loading } = useCollection('sorteos');
  const [filter,  setFilter]  = useState('todas');
  const [search,  setSearch]  = useState('');
  const [showCreate,   setShowCreate]   = useState(false);
  const [detailSorteo, setDetailSorteo] = useState(null);
  const [chooseSorteo, setChooseSorteo] = useState(null);

  const stats = useMemo(() => ({
    activos:        sorteos.filter(s => s.estado === 'activo').length,
    participantes:  sorteos.reduce((sum, s) => sum + (s.participantes_count || 0), 0),
    finalizados:    sorteos.filter(s => s.estado === 'finalizado').length,
  }), [sorteos]);

  const filtered = useMemo(() => {
    return sorteos
      .filter(s => filter === 'todas' || s.estado === filter)
      .filter(s => !search || s.nombre?.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        // 1) creadoEn desc (Firestore Timestamp); 2) fallback a fecha_inicio.
        const am = a.creadoEn?.toMillis?.() || 0;
        const bm = b.creadoEn?.toMillis?.() || 0;
        if (am || bm) return bm - am;
        return (b.fecha_inicio || '').localeCompare(a.fecha_inicio || '');
      });
  }, [sorteos, filter, search]);

  const publicLink = (s) => `${window.location.origin}/sorteo/${s.id}`;

  return (
    <div data-view="sorteos" className="max-w-3xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Trophy size={20} className="text-emerald-400" />
            <h1 className="text-xl font-bold text-white">Sorteos</h1>
          </div>
          <p className="text-sm text-slate-400">Crea dinámicas y fideliza a tus clientes.</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 transition-all">
          <Plus size={14} />
          Nuevo sorteo
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Sorteos activos',       value: stats.activos,       icon: Trophy,        color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Total participantes',   value: stats.participantes, icon: Users,         color: 'text-amber-400',   bg: 'bg-amber-500/10'   },
          { label: 'Sorteos finalizados',   value: stats.finalizados,   icon: PartyPopper,   color: 'text-slate-400',   bg: 'bg-slate-500/10'   },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className={`${bg} rounded-xl p-2.5 w-fit mb-3`}>
              <Icon size={16} className={color} />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="text-lg font-bold text-white mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
          {[
            { id: 'todas',      label: 'Todas'      },
            { id: 'activo',     label: 'Activo'     },
            { id: 'finalizado', label: 'Finalizado' },
          ].map(t => (
            <button key={t.id} onClick={() => setFilter(t.id)}
              className={`px-3 py-1.5 rounded-md text-xs transition-all ${
                filter === t.id
                  ? 'bg-slate-700 text-white font-medium shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-medium'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-[160px] bg-slate-900 border border-slate-800 rounded-lg px-3 py-2">
          <Search size={13} className="text-slate-500 shrink-0" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre del sorteo..."
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
          <Loader2 size={28} className="animate-spin text-emerald-400/70" />
          <p className="text-sm mt-3">Cargando sorteos...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
          <Ticket size={32} className="opacity-30" />
          <p className="text-sm mt-2">Sin sorteos{filter !== 'todas' ? ` con estado "${filter}"` : ''}.</p>
          <p className="text-slate-400 text-sm mt-2 text-center max-w-xs">
            Los sorteos son una excelente forma de fidelizar y captar nuevos clientes.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 transition-all"
          >
            <Plus size={14} />
            Crear primer sorteo
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(s => (
            <SorteoRow
              key={s.id}
              sorteo={s}
              publicLink={publicLink(s)}
              onView={setDetailSorteo}
              onElegirGanador={setChooseSorteo}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {showCreate && (
          <CreateSorteoModal
            key="create"
            user={user}
            onClose={() => setShowCreate(false)}
          />
        )}
        {detailSorteo && (
          <DetailModal
            key="detail"
            sorteo={detailSorteo}
            onClose={() => setDetailSorteo(null)}
          />
        )}
        {chooseSorteo && (
          <ElegirGanadorModal
            key="ganador"
            sorteo={chooseSorteo}
            onClose={() => setChooseSorteo(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
