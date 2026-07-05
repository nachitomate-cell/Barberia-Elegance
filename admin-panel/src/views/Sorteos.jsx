import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  addDoc, updateDoc, serverTimestamp,
  collection, getDocs, query, orderBy,
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import {
  Trophy, Plus, X, Eye, Link2, CheckCheck, Search, Calendar,
  Users, UsersRound, Sparkles, Loader2, PartyPopper, Ticket, AlertCircle,
  Copy, QrCode, Mail, Phone,
} from 'lucide-react';
import { tenantCol, tenantDoc } from '../lib/tenantUtils';
import { withTimeout } from '../lib/firestore-helpers';
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

/** Formatea "YYYY-MM-DD" → "dd/mm/YYYY" para mostrar debajo del <input type="date">.
 *  El navegador puede mostrar el input en formato US según el locale del SO;
 *  esta línea de refuerzo hace explícito el formato chileno bajo el campo. */
function formatCLDate(ymd) {
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-');
  if (!y || !m || !d) return '';
  return `${d}/${m}/${y}`;
}

/** Progreso 0..100 de un sorteo según sus fechas y "ahora".
 *  - Antes del inicio → 0
 *  - Después del cierre → 100
 *  - En rango → proporción del tiempo transcurrido. */
function computeProgress(inicio, fin) {
  if (!inicio || !fin) return 0;
  const s = new Date(`${inicio}T00:00:00`).getTime();
  const e = new Date(`${fin}T23:59:59`).getTime();
  if (isNaN(s) || isNaN(e) || e <= s) return 0;
  const now = Date.now();
  if (now <= s) return 0;
  if (now >= e) return 100;
  return Math.min(100, Math.max(0, Math.round(((now - s) / (e - s)) * 100)));
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
  // Sorteos polimórficos: estándar (ruleta clásica) o fútbol (pronóstico)
  const [tipo,          setTipo]          = useState('ESTANDAR');
  const [equipoLocal,   setEquipoLocal]   = useState('');
  const [equipoVisita,  setEquipoVisita]  = useState('');
  const [fechaPartido,  setFechaPartido]  = useState('');
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
    if (tipo === 'FUTBOL') {
      if (!equipoLocal.trim() || !equipoVisita.trim()) {
        setError('Completa los nombres de ambos equipos.');
        return;
      }
      if (!fechaPartido) {
        setError('Ingresa la fecha y hora del partido.');
        return;
      }
    }
    setError('');
    setSubmitting(true);
    try {
      const doc = {
        nombre:              nombre.trim(),
        premio:              premio.trim(),
        fecha_inicio:        inicio, // YYYY-MM-DD (string, igual que vence en gift cards)
        fecha_fin:           fin,
        tipo,                // 'ESTANDAR' | 'FUTBOL' — legacy sin campo se lee como ESTANDAR
        estado:              'activo',
        ganador_nombre:      null,
        participantes_count: 0,
        creadoEn:            serverTimestamp(),
        creadoPor:           user?.uid || 'admin',
      };
      if (tipo === 'FUTBOL') {
        doc.partido = {
          equipoLocal:      equipoLocal.trim(),
          equipoVisita:     equipoVisita.trim(),
          fechaPartido,     // ISO local datetime del input datetime-local
          marcadorOficial:  { local: null, visita: null },
        };
      }
      await addDoc(tenantCol('sorteos'), doc);
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
        {/* Selector de tipo — pills mobile-first */}
        <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5 block">Tipo de sorteo</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: 'ESTANDAR', emoji: '🎟️', label: 'Estándar' },
              { key: 'FUTBOL',   emoji: '⚽', label: 'Pronóstico' },
            ].map(opt => {
              const active = tipo === opt.key;
              return (
                <button
                  key={opt.key} type="button"
                  onClick={() => setTipo(opt.key)}
                  disabled={submitting}
                  className={`flex items-center justify-center gap-1.5 h-10 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                    active
                      ? 'bg-emerald-500 text-emerald-950 shadow-[0_2px_10px_rgba(16,185,129,0.28)]'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                  }`}
                >
                  <span className="text-base leading-none">{opt.emoji}</span>
                  {opt.label}
                </button>
              );
            })}
          </div>
          <p className="text-[10.5px] text-slate-500 mt-1.5 leading-snug">
            {tipo === 'FUTBOL'
              ? 'Los participantes intentan acertar el marcador exacto. Solo entran a la ruleta los que aciertan.'
              : 'Ruleta clásica: todos los inscritos participan del sorteo.'}
          </p>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Nombre del sorteo</label>
          <input
            type="text" value={nombre} onChange={e => setNombre(e.target.value)}
            placeholder={tipo === 'FUTBOL' ? 'Ej: Pronóstico Chile vs Argentina' : 'Ej: Kit de Cuidado Premium'}
            className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            disabled={submitting}
            required
          />
        </div>

        {/* Datos del partido (solo FUTBOL) */}
        {tipo === 'FUTBOL' && (
          <div className="p-3 rounded-lg border border-emerald-500/25 bg-emerald-500/[0.03] space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-300 flex items-center gap-1.5">
              ⚽ Datos del partido
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Equipo local</label>
                <input
                  type="text" value={equipoLocal} onChange={e => setEquipoLocal(e.target.value)}
                  placeholder="Chile"
                  className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  disabled={submitting}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Equipo visita</label>
                <input
                  type="text" value={equipoVisita} onChange={e => setEquipoVisita(e.target.value)}
                  placeholder="Argentina"
                  className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  disabled={submitting}
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Fecha y hora del partido</label>
              <input
                type="datetime-local" lang="es-CL" value={fechaPartido} onChange={e => setFechaPartido(e.target.value)}
                className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                disabled={submitting}
              />
            </div>
          </div>
        )}

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
              type="date" lang="es-CL" value={inicio} onChange={e => setInicio(e.target.value)}
              className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
              disabled={submitting}
              required
            />
            {inicio && <p className="mt-1 text-[10px] text-slate-500 tabular-nums">{formatCLDate(inicio)}</p>}
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Cierre</label>
            <input
              type="date" lang="es-CL" value={fin} onChange={e => setFin(e.target.value)} min={inicio || undefined}
              className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
              disabled={submitting}
              required
            />
            {fin && <p className="mt-1 text-[10px] text-slate-500 tabular-nums">{formatCLDate(fin)}</p>}
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
  const isActivo = sorteo.estado === 'activo';
  const publicUrl = `${window.location.origin}/sorteo/${sorteo.id}`;
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* noop */ }
  };

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
            {/* ID muy tenue — para depuración/soporte, no ruido visual. */}
            <p className="text-[10px] font-mono text-slate-700 mt-0.5 truncate select-all">{sorteo.id}</p>
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

        {/* QR grande — solo tiene sentido para sorteos activos (link vivo). */}
        {isActivo && (
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <QrCode size={13} className="text-emerald-400" />
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Escanea para participar</p>
            </div>
            <div className="mx-auto w-fit bg-white p-3 rounded-2xl">
              <QRCodeSVG value={publicUrl} size={180} level="M" includeMargin={false} />
            </div>
            <p className="mt-3 text-[11px] text-center text-slate-500 leading-relaxed">
              Muestra esta pantalla o imprime el QR para que tus clientes se inscriban desde su teléfono.
            </p>
            <button
              onClick={copyLink}
              className="mt-3 w-full inline-flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-all"
            >
              {copied
                ? <><CheckCheck size={13} className="text-emerald-400" /> Enlace copiado</>
                : <><Copy size={13} /> Copiar enlace</>}
            </button>
          </div>
        )}

        <button onClick={onClose} className="w-full py-2 rounded-xl text-sm text-slate-400 hover:text-white transition-colors">
          Cerrar
        </button>
      </div>
    </ModalShell>
  );
}

/* ── ParticipantesModal ───────────────────────────────────────────────
   Lista todos los inscritos reales de un sorteo (fetch a subcolección).
   Solo lectura para el admin. Muestra nombre, contacto y fecha compacta. */
function ParticipantesModal({ sorteo, onClose }) {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const partsRef = collection(tenantDoc('sorteos', sorteo.id), 'participantes');
        // orderBy createdAt desc: los más recientes arriba. Requiere que el campo
        // exista en todos los docs — participantes creados vía /sorteo/:id lo traen.
        const q = query(partsRef, orderBy('createdAt', 'desc'));
        const snap = await withTimeout(getDocs(q), 20000, 'sorteos/participantes');
        if (cancelled) return;
        setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      } catch (e) {
        console.error('[Sorteos/participantes] fetch:', e);
        if (!cancelled) {
          setErr(e.message || 'No se pudieron cargar los participantes.');
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [sorteo.id]);

  const fmtFecha = (ts) => {
    // createdAt es Firestore Timestamp. Nulo hasta el 1er round-trip del server.
    const d = ts?.toDate?.() || (ts ? new Date(ts) : null);
    if (!d || isNaN(d)) return '—';
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  return (
    <ModalShell onClose={onClose} maxW="max-w-lg">
      <div className="flex items-center justify-between p-5 border-b border-slate-800">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white truncate">Participantes</p>
          <p className="text-[11px] text-slate-500 mt-0.5 truncate">
            {sorteo.nombre} · <span className="text-slate-400 tabular-nums">{items.length}</span> {items.length === 1 ? 'inscrito' : 'inscritos'}
          </p>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white shrink-0"><X size={16} /></button>
      </div>

      <div className="max-h-[70vh] overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <Loader2 size={22} className="animate-spin text-emerald-400/70" />
            <p className="text-xs mt-2">Cargando…</p>
          </div>
        ) : err ? (
          <div className="p-6 text-center">
            <AlertCircle size={22} className="mx-auto text-red-400 opacity-70" />
            <p className="text-xs mt-2 text-red-300">{err}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-slate-500">
            <UsersRound size={30} className="opacity-30" />
            <p className="text-sm mt-2">Nadie se ha inscrito todavía</p>
            <p className="text-xs mt-1 text-slate-600 text-center max-w-xs">
              Comparte el link o QR público para captar participantes.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-800">
            {items.map((p, idx) => (
              <li key={p.id} className="flex items-start gap-3 p-4">
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[11px] font-bold text-slate-400 shrink-0 tabular-nums">
                  {idx + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate">{p.nombre || 'Sin nombre'}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-slate-400">
                    {p.telefono && (
                      <span className="inline-flex items-center gap-1 min-w-0">
                        <Phone size={11} className="text-slate-500 shrink-0" />
                        <span className="truncate">{p.telefono}</span>
                      </span>
                    )}
                    {p.email && (
                      <span className="inline-flex items-center gap-1 min-w-0">
                        <Mail size={11} className="text-slate-500 shrink-0" />
                        <span className="truncate">{p.email}</span>
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-slate-500 tabular-nums">
                      <Calendar size={11} />
                      {fmtFecha(p.createdAt)}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="p-4 border-t border-slate-800">
        <button onClick={onClose} className="w-full py-2 rounded-xl text-sm text-slate-400 hover:text-white transition-colors">
          Cerrar
        </button>
      </div>
    </ModalShell>
  );
}

/* ── ElegirGanadorModal ───────────────────────────────────────────────
   Lee la subcolección real `participantes` del sorteo, corre la ruleta
   sobre ellos y persiste ganador con datos completos para auditoría. */

/** Explosión de confeti para el clímax de la ruleta.
 *  Tres bursts (central + dos laterales) con timing escalonado para que
 *  se sienta como una premiación. Colores marca (emerald + gold + white). */
function fireWinnerConfetti() {
  const COLORS = ['#10b981', '#059669', '#34d399', '#fbbf24', '#ffffff'];
  // Burst central hacia arriba
  confetti({
    particleCount: 130,
    spread: 100,
    startVelocity: 55,
    origin: { x: 0.5, y: 0.55 },
    colors: COLORS,
    zIndex: 9999,
  });
  // Laterales, 200ms después
  setTimeout(() => {
    confetti({
      particleCount: 70,
      angle: 60,
      spread: 65,
      startVelocity: 50,
      origin: { x: 0, y: 0.6 },
      colors: COLORS,
      zIndex: 9999,
    });
    confetti({
      particleCount: 70,
      angle: 120,
      spread: 65,
      startVelocity: 50,
      origin: { x: 1, y: 0.6 },
      colors: COLORS,
      zIndex: 9999,
    });
  }, 200);
}

function ElegirGanadorModal({ sorteo, onClose }) {
  // Participantes reales cargados desde Firestore. Cada item: { id, nombre, telefono?, email?, createdAt }.
  const [participantes, setParticipantes] = useState([]);
  const [loadingParts,  setLoadingParts]  = useState(true);
  const [fetchError,    setFetchError]    = useState('');

  const [spinning,   setSpinning]   = useState(false);
  const [currentName,setCurrentName]= useState('');
  const [winner,     setWinner]     = useState(null); // objeto participante completo
  const [confirming, setConfirming] = useState(false);
  const [error,      setError]      = useState('');

  // ── Sorteos de fútbol ──────────────────────────────────────────
  const isFutbol = sorteo.tipo === 'FUTBOL';
  // Pool completo (para fallback "sortear entre todos" si nadie acertó)
  const [todosParticipantes, setTodosParticipantes] = useState([]);
  // Filtro aplicado: en ESTANDAR arranca en true (no hay filtro);
  //   en FUTBOL arranca false y el admin ingresa el marcador oficial.
  const [marcadorFiltrado,   setMarcadorFiltrado]   = useState(!isFutbol);
  const [marcadorLocal,      setMarcadorLocal]      = useState(0);
  const [marcadorVisita,     setMarcadorVisita]     = useState(0);
  const [totalAcertantes,    setTotalAcertantes]    = useState(0);
  const [savingMarcador,     setSavingMarcador]     = useState(false);

  // Fetch de la subcolección real al montar. tenantDoc respeta el legacy elegance
  // (root) vs multi-tenant (tenants/{tid}/sorteos/...).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const partsRef = collection(tenantDoc('sorteos', sorteo.id), 'participantes');
        const snap = await withTimeout(getDocs(partsRef), 20000, 'sorteos/elegir-ganador');
        if (cancelled) return;
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setTodosParticipantes(list);
        // En ESTANDAR el pool completo es la ruleta directamente.
        // En FUTBOL esperamos a que el admin filtre por marcador antes de asignar.
        if (!isFutbol) setParticipantes(list);
        setLoadingParts(false);
      } catch (err) {
        console.error('[Sorteos/ElegirGanador] fetch participantes:', err);
        if (!cancelled) {
          setFetchError(err.message || 'No se pudieron cargar los participantes.');
          setLoadingParts(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [sorteo.id]);

  // Corre la ruleta 1.8s ciclando nombres reales, luego fija el ganador.
  // Encapsulada para reutilizar entre el primer giro y el botón "Repetir".
  const runSpin = () => {
    if (participantes.length === 0) return;
    setError('');
    setSpinning(true);
    setWinner(null);
    let i = 0;
    const tickInterval = setInterval(() => {
      i = (i + 1) % participantes.length;
      setCurrentName(participantes[i].nombre);
    }, 90);
    const stopAt = setTimeout(() => {
      clearInterval(tickInterval);
      const pick = participantes[Math.floor(Math.random() * participantes.length)];
      setCurrentName(pick.nombre);
      setWinner(pick);
      setSpinning(false);
    }, 1800);
    return () => { clearInterval(tickInterval); clearTimeout(stopAt); };
  };

  // El clímax: dispara confeti cuando termina la ruleta y hay ganador.
  // Se ejecuta en cada reveal (primer giro + cada "Repetir").
  useEffect(() => {
    if (!spinning && winner) {
      fireWinnerConfetti();
    }
  }, [spinning, winner]);

  // Body scroll lock — evita que el contenido detrás se mueva mientras
  // el dueño graba historia. También cortamos el overscroll bouncy en
  // iOS (position:fixed sobre el body preserva el scroll position al cerrar).
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'contain';
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.overscrollBehavior = prevOverscroll;
    };
  }, []);

  const repetir = () => {
    if (confirming) return;
    runSpin();
  };

  // Filtra el pool de participantes a los que acertaron el marcador exacto y
  // persiste el marcadorOficial en el doc del sorteo (auditoría + evita que
  // se sobreescriba si el admin reabre el modal más tarde).
  const filtrarAcertantes = async ({ sortearEntreTodos = false } = {}) => {
    if (savingMarcador) return;
    setError('');
    const local  = Number(marcadorLocal);
    const visita = Number(marcadorVisita);
    if (!Number.isInteger(local) || !Number.isInteger(visita) || local < 0 || visita < 0) {
      setError('Ingresa un marcador válido (números enteros ≥ 0).');
      return;
    }
    const acertantes = todosParticipantes.filter(p => {
      const pr = p.pronostico;
      return pr && Number(pr.local) === local && Number(pr.visita) === visita;
    });
    setTotalAcertantes(acertantes.length);
    setSavingMarcador(true);
    try {
      await updateDoc(tenantDoc('sorteos', sorteo.id), {
        'partido.marcadorOficial': { local, visita },
      });
    } catch (err) {
      console.error('[Sorteos/marcador] persist error:', err);
      // No bloqueamos el sorteo si falla la persistencia — la ruleta sigue
      // funcionando con los acertantes filtrados en memoria.
    } finally { setSavingMarcador(false); }
    // Sin acertantes: no aplicamos el filtro y esperamos decisión del admin
    // (botón "sortear entre todos"). Solo cuando el flag viene explícito, aplicamos.
    if (acertantes.length === 0 && !sortearEntreTodos) {
      return;
    }
    const pool = acertantes.length > 0 ? acertantes : todosParticipantes;
    setParticipantes(pool);
    setMarcadorFiltrado(true);
  };

  const confirmar = async () => {
    if (confirming || !winner) return;
    setConfirming(true);
    setError('');
    try {
      // Auditoría completa: guardamos id + nombre + contacto (preferencia tel > email)
      // para poder trazar el sorteo aún si el participante se borrara después.
      const contacto = winner.telefono || winner.email || 'Sin contacto';
      await updateDoc(tenantDoc('sorteos', sorteo.id), {
        estado:            'finalizado',
        ganador_id:        winner.id,
        ganador_nombre:    winner.nombre,
        ganador_contacto:  contacto,
        finalizadoEn:      serverTimestamp(),
      });
      onClose();
    } catch (err) {
      console.error('[Sorteos/ganador] error:', err);
      setError(err.message || 'No se pudo guardar el ganador.');
      setConfirming(false);
    }
  };

  const locked   = spinning || confirming;
  // isEmpty/isReady miran el POOL COMPLETO (todosParticipantes) para no
  // reportar "sin inscritos" cuando en realidad estamos esperando que el
  // admin ingrese el marcador oficial en un sorteo FUTBOL.
  const isEmpty  = !loadingParts && !fetchError && todosParticipantes.length === 0;
  const isReady  = !loadingParts && !fetchError && todosParticipantes.length > 0;
  // FUTBOL: solo puede girar la ruleta cuando ya se filtraron los acertantes.
  const canSpin  = isReady && !spinning && !winner && !confirming && marcadorFiltrado;
  const showMarcadorStep = isFutbol && isReady && !marcadorFiltrado && !spinning && !winner;
  const noAcertantesShown = showMarcadorStep && totalAcertantes === 0 && savingMarcador === false && (marcadorLocal !== null || marcadorVisita !== null);

  // Renderizado vía Portal directo a <body>: rompe el subtree del AdminLayout
  // (que tiene overflow-hidden + overflow-y-auto en su main area, y transforms
  // en varios contenedores). Sin esto, el modal queda "atrapado" dentro del
  // área de contenido y el sidebar/topbar del panel se sigue viendo.
  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-[9999] h-full w-full bg-slate-950/95 backdrop-blur-3xl flex flex-col items-center justify-center px-4 sm:px-6 overflow-hidden"
      style={{
        // Notch iPhone + gestos Android. Sin esto la X puede quedar debajo
        // de la barra de estado y la firma abajo tapada por el home indicator.
        paddingTop: 'max(env(safe-area-inset-top, 0px), 0.5rem)',
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0.5rem)',
      }}
    >
      {/* Halos de fondo — muy sutil ambient light */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: !spinning && winner ? 1 : 0.35 }}
          transition={{ duration: 0.9 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[900px] max-h-[900px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(16,185,129,0.22) 0%, transparent 65%)',
            filter: 'blur(60px)',
          }}
        />
      </div>

      {/* Cerrar — bg semi-transparente + borde sutil, safe-area aware.
          44×44 mínimo para tap target cómodo con el pulgar. */}
      <button
        onClick={locked ? undefined : onClose}
        disabled={locked}
        aria-label="Cerrar"
        className="absolute right-4 sm:right-6 w-11 h-11 rounded-full flex items-center justify-center text-slate-300 hover:text-white bg-slate-800/50 border border-slate-700/70 backdrop-blur-md hover:bg-slate-700/60 hover:border-slate-600 active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed transition-all z-20"
        style={{ top: 'max(env(safe-area-inset-top, 0px) + 0.5rem, 1.25rem)' }}
      >
        <X size={18} strokeWidth={2.5} />
      </button>

      {/* Eyebrow con el nombre del sorteo */}
      <div className="relative z-10 text-center mb-10 sm:mb-14">
        <p className="text-[10px] uppercase tracking-[0.32em] text-slate-500 font-semibold">Sorteo</p>
        <p className="mt-1.5 text-sm sm:text-base text-slate-300">{sorteo.nombre}</p>
      </div>

      {/* Trofeo */}
      <motion.div
        animate={spinning
          ? { rotate: [0, 8, -8, 8, 0], scale: [1, 1.05, 1] }
          : { rotate: 0, scale: 1.1 }}
        transition={spinning
          ? { duration: 0.5, repeat: Infinity, ease: 'easeInOut' }
          : { duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 mb-8 sm:mb-10"
      >
        <Trophy
          size={72}
          className={`transition-colors duration-500 ${!spinning && winner ? 'text-emerald-300' : 'text-emerald-400/80'}`}
          style={{
            filter: !spinning && winner
              ? 'drop-shadow(0 0 40px rgba(16,185,129,0.9)) drop-shadow(0 0 20px rgba(16,185,129,0.6))'
              : 'drop-shadow(0 0 20px rgba(16,185,129,0.35))',
          }}
        />
      </motion.div>

      {/* Etiqueta contextual según estado del modal */}
      <motion.p
        key={
          loadingParts ? 'label-loading'
          : fetchError ? 'label-error'
          : isEmpty    ? 'label-empty'
          : spinning   ? 'label-spin'
          : winner     ? 'label-reveal'
          : showMarcadorStep ? 'label-marcador'
          : 'label-ready'
        }
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 text-[11px] sm:text-xs uppercase tracking-[0.36em] text-slate-400 font-bold mb-6 sm:mb-8"
      >
        {loadingParts ? 'Cargando participantes…'
          : fetchError ? 'Error'
          : isEmpty    ? 'Sin inscritos'
          : spinning   ? 'Eligiendo…'
          : winner     ? 'El ganador es'
          : showMarcadorStep ? 'Ingresa el resultado'
          : `${participantes.length} ${participantes.length === 1 ? (isFutbol ? 'acertante' : 'participante inscrito') : (isFutbol ? 'acertantes' : 'participantes inscritos')}`}
      </motion.p>

      {/* Área central: cambia según estado */}
      {loadingParts && (
        <div className="relative z-10 flex items-center justify-center py-8">
          <Loader2 size={40} className="animate-spin text-emerald-400/80" />
        </div>
      )}

      {fetchError && !loadingParts && (
        <div className="relative z-10 w-full max-w-md text-center px-4">
          <p className="text-sm text-red-300 flex items-center justify-center gap-2">
            <AlertCircle size={16} /> {fetchError}
          </p>
        </div>
      )}

      {isEmpty && (
        <div className="relative z-10 w-full max-w-md text-center px-4">
          <p className="text-lg sm:text-2xl font-bold text-white/90 leading-snug">
            Aún no hay inscritos en este sorteo
          </p>
          <p className="mt-3 text-sm text-slate-400 leading-relaxed">
            Comparte el link o QR público para que tus clientes puedan participar. Cuando
            haya al menos un inscrito, podrás girar la ruleta.
          </p>
        </div>
      )}

      {/* ── Mini-marcador (solo FUTBOL, previo a la ruleta) ── */}
      {showMarcadorStep && (
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative z-10 w-full max-w-md px-2 sm:px-0"
        >
          <div className="rounded-2xl border border-emerald-500/25 bg-slate-900/70 backdrop-blur-md p-4 sm:p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-300 text-center">
              Resultado oficial del partido
            </p>
            <div className="grid grid-cols-2 gap-3 mt-4 items-start">
              {[
                { key: 'local',  team: sorteo.partido?.equipoLocal  || 'Local',  value: marcadorLocal,  set: setMarcadorLocal },
                { key: 'visita', team: sorteo.partido?.equipoVisita || 'Visita', value: marcadorVisita, set: setMarcadorVisita },
              ].map(col => (
                <div key={col.key} className="flex flex-col items-center gap-2">
                  <p className="text-xs font-bold text-white text-center truncate max-w-full">{col.team}</p>
                  <div className="flex items-center gap-2">
                    <button type="button"
                      onClick={() => col.set(v => Math.max(0, Number(v) - 1))}
                      className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 text-white text-lg font-bold hover:bg-slate-700 active:scale-95 transition-transform">
                      −
                    </button>
                    <span className="w-10 text-center text-3xl font-black text-emerald-300 tabular-nums">
                      {col.value}
                    </span>
                    <button type="button"
                      onClick={() => col.set(v => Math.min(20, Number(v) + 1))}
                      className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 text-white text-lg font-bold hover:bg-slate-700 active:scale-95 transition-transform">
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-col gap-2">
              {noAcertantesShown && (
                <p className="text-xs text-amber-300 text-center flex items-center justify-center gap-1.5">
                  <AlertCircle size={13} /> Ningún participante acertó el marcador exacto.
                </p>
              )}
              <button
                onClick={() => filtrarAcertantes()}
                disabled={savingMarcador}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold bg-emerald-500 text-emerald-950 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {savingMarcador ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                Filtrar acertantes
              </button>
              {noAcertantesShown && (
                <button
                  onClick={() => filtrarAcertantes({ sortearEntreTodos: true })}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-transparent border border-slate-700 hover:bg-slate-800/60 transition-colors"
                >
                  Sortear entre todos los inscritos igualmente
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Nombre GIGANTE — solo cuando hay ruleta girando o ganador revelado */}
      {(spinning || winner) && (
        <div className="relative z-10 w-full max-w-4xl text-center px-2 sm:px-4 min-h-[3.5em] flex items-center justify-center">
          <AnimatePresence mode="popLayout">
            <motion.h2
              key={currentName + (spinning ? '-s' : '-w')}
              initial={spinning
                ? { opacity: 0, y: 24, filter: 'blur(10px)' }
                : { opacity: 0, scale: 0.85, filter: 'blur(14px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={spinning
                ? { opacity: 0, y: -24, filter: 'blur(10px)' }
                : { opacity: 0, scale: 1.15, filter: 'blur(14px)' }}
              transition={{ duration: spinning ? 0.09 : 0.65, ease: [0.16, 1, 0.3, 1] }}
              className={
                (spinning
                  ? 'text-white/85 text-4xl sm:text-6xl md:text-7xl lg:text-8xl'
                  : 'text-transparent bg-clip-text bg-gradient-to-br from-emerald-200 via-emerald-300 to-emerald-500 text-4xl sm:text-7xl md:text-8xl lg:text-9xl'
                ) + ' font-black leading-[1.05] tracking-tight break-words hyphens-auto max-w-full'
              }
              style={
                !spinning && winner
                  ? { filter: 'drop-shadow(0 0 60px rgba(16,185,129,0.55)) drop-shadow(0 0 24px rgba(16,185,129,0.35))' }
                  : undefined
              }
            >
              {currentName}
            </motion.h2>
          </AnimatePresence>
        </div>
      )}

      {/* Errores de escritura Firestore */}
      {error && (
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="relative z-10 mt-6 text-xs text-red-400 flex items-center gap-1.5"
        >
          <AlertCircle size={13} /> {error}
        </motion.p>
      )}

      {/* Acciones — dependen del estado del modal */}
      <AnimatePresence>
        {/* Estado inicial listo: botón para arrancar la ruleta */}
        {canSpin && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="relative z-10 mt-8 w-full max-w-md"
          >
            <button
              onClick={runSpin}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-base font-bold bg-emerald-500 text-emerald-950 hover:bg-emerald-400 active:scale-[0.98] transition-all shadow-[0_10px_40px_-10px_rgba(16,185,129,0.6)]"
            >
              <Sparkles size={18} /> Girar la ruleta
            </button>
          </motion.div>
        )}

        {/* Estado vacío o error: solo cerrar */}
        {(isEmpty || fetchError) && !loadingParts && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="relative z-10 mt-8 w-full max-w-md"
          >
            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-2xl text-sm font-semibold bg-transparent text-slate-300 hover:text-white hover:bg-white/5 border border-slate-700 active:scale-[0.98] transition-all"
            >
              Cerrar
            </button>
          </motion.div>
        )}

        {/* Post-reveal: Confirmar + Repetir */}
        {winner && !spinning && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ delay: 0.9, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 mt-10 sm:mt-16 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md"
          >
            <button
              onClick={confirmar}
              disabled={confirming}
              className="order-1 sm:order-2 flex items-center justify-center gap-2 py-4 sm:py-3.5 rounded-2xl sm:rounded-xl text-base sm:text-sm font-bold bg-emerald-500 text-emerald-950 hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-[0_10px_40px_-10px_rgba(16,185,129,0.6)]"
            >
              {confirming
                ? <><Loader2 size={18} className="animate-spin" /> Guardando…</>
                : <><PartyPopper size={18} /> Confirmar ganador</>}
            </button>
            <button
              onClick={repetir}
              disabled={confirming || participantes.length < 2}
              className="order-2 sm:order-1 flex items-center justify-center gap-2 py-3.5 sm:py-3.5 rounded-2xl sm:rounded-xl text-sm font-semibold bg-transparent text-slate-300 hover:text-white hover:bg-white/5 border border-slate-700 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Repetir
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Firma de marca — safe-area aware para no chocar con el home indicator. */}
      <div
        className="fixed left-1/2 -translate-x-1/2 flex items-center gap-2.5 text-slate-600 pointer-events-none z-10 select-none"
        style={{ bottom: 'max(env(safe-area-inset-bottom, 0px) + 1rem, 2rem)' }}
      >
        <img
          src="/synaptech/ig.png"
          alt=""
          className="w-4 h-4 object-contain opacity-80"
        />
        <p className="text-[10px] uppercase tracking-[0.2em] font-light">
          Powered by SynapTech
        </p>
      </div>
    </motion.div>,
    document.body,
  );
}

/* ── SorteoRow ────────────────────────────────────────────────────── */
function SorteoRow({ sorteo, publicLink, onView, onElegirGanador, onVerParticipantes }) {
  const [copied, setCopied] = useState(false);
  const cfg = STATUS_CONFIG[sorteo.estado] || STATUS_CONFIG.activo;
  const isActivo  = sorteo.estado === 'activo';
  const cerrado   = isActivo && isClosingDay(sorteo.fecha_fin);
  const partCount = sorteo.participantes_count ?? 0;
  const progress  = isActivo
    ? computeProgress(sorteo.fecha_inicio, sorteo.fecha_fin)
    : 100;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(publicLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* noop */ }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition-all overflow-hidden">
    <div className="flex items-center gap-4 p-4 flex-wrap">
      {/* Icono */}
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${cfg.color.split(' ').slice(1).join(' ')} shrink-0`}>
        <Trophy size={18} className={cfg.color.split(' ')[0]} />
      </div>

      {/* Info principal */}
      <div className="flex-1 min-w-[180px]">
        <p className="font-bold text-sm text-white truncate">{sorteo.nombre}</p>
        <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 flex-wrap">
          <span className="inline-flex items-center gap-1">
            <Calendar size={11} />
            {formatRange(sorteo.fecha_inicio, sorteo.fecha_fin)}
          </span>
          <span className="inline-flex items-center gap-2">
            {partCount > 0 && (
              <span className="flex -space-x-2" aria-hidden="true">
                <span className="w-6 h-6 rounded-full bg-slate-700 ring-2 ring-slate-900" />
                <span className="w-6 h-6 rounded-full bg-slate-600 ring-2 ring-slate-900" />
                <span className="w-6 h-6 rounded-full bg-slate-700 ring-2 ring-slate-900" />
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Users size={11} />
              {partCount} {partCount === 1 ? 'participante' : 'participantes'}
            </span>
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

        {/* Ver participantes reales (subcolección) */}
        <button
          onClick={() => onVerParticipantes(sorteo)}
          className="text-slate-500 hover:text-emerald-400 transition-colors p-1.5 rounded"
          title="Ver participantes"
        >
          <UsersRound size={14} />
        </button>

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

    {/* Barra de progreso del sorteo — activo: proporción del tiempo transcurrido; finalizado: 100%. */}
    <div className="h-1 bg-slate-800/80">
      <div
        className={`h-full transition-all duration-500 ${isActivo ? 'bg-emerald-500' : 'bg-slate-600'}`}
        style={{ width: `${progress}%` }}
        aria-hidden="true"
      />
    </div>
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
  const [partsSorteo,  setPartsSorteo]  = useState(null);

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
              onVerParticipantes={setPartsSorteo}
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
        {partsSorteo && (
          <ParticipantesModal
            key="participantes"
            sorteo={partsSorteo}
            onClose={() => setPartsSorteo(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
