// BarberTV.jsx — Digital Signage Premium para la barbería
// Ruta: /gestion-interna/tv (sin AdminLayout)

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence }                  from 'framer-motion';
import { QRCodeSVG }                                from 'qrcode.react';
import { query, onSnapshot, where, orderBy, limit } from 'firebase/firestore';
import { getFunctions, httpsCallable }              from 'firebase/functions';
import { useTenant }                                from '../contexts/TenantContext';
import { tenantCol, tenantDoc, resolveTenantId }    from '../lib/tenantUtils';
import { Volume2, VolumeX }                         from 'lucide-react';

// ── Constantes ────────────────────────────────────────────────────
const TENANT_ACCENT = { ferraza: '#e2e8f0', lumen: '#C9A050' };
let GOLD            = '#D4AF37';
const SLIDE_MS     = 15_000;
const PHOTO_MS     = 3_000;
const SLIDE_LABELS = ['Oferta', 'Trabajos', 'Equipo'];

const OFERTA_DEFAULT = {
  etiqueta:    'Oferta del Mes',
  titulo1:     'Corte',
  titulo2:     '+ Barba',
  descripcion: 'Lunes a Miércoles — precio especial\npara clientes frecuentes del local.',
  cta:         'Consulta en caja',
};

function lsCitasKey(tid) { return `barber_tv_citas_${tid}`; }

// ── Hora de CHILE, no del navegador/UTC ───────────────────────────
// La TV vive en la zona del local. Con toISOString(), desde las ~20:00
// (UTC-4) la pantalla mostraba las citas de MAÑANA y los contadores de hoy
// en cero, justo en el horario peak. Regla de la casa: America/Santiago.
const hoyChileStr = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date());
function minsAhoraChile() {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Santiago', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
  const h = Number(p.find(x => x.type === 'hour')?.value || 0);
  const m = Number(p.find(x => x.type === 'minute')?.value || 0);
  return h * 60 + m;
}
const aMins = (t) => {
  if (typeof t !== 'string' || !t.includes(':')) return null;
  const [h, m] = t.split(':').map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
};
// Pantalla PÚBLICA: nombre + inicial del apellido. El nombre completo del
// cliente en una TV del local es exposición innecesaria (Ley 21.719).
const nombrePublico = (full) => {
  const p = String(full || '').trim().split(/\s+/).filter(Boolean);
  if (!p.length) return 'Cliente';
  return p.length === 1 ? p[0] : `${p[0]} ${p[1][0].toUpperCase()}.`;
};

// ── Partículas flotantes — CSS puro, sin JS en el loop de animación ──
const PARTICLE_DATA = Array.from({ length: 22 }, (_, i) => ({
  id:    i,
  x:     ((i * 23 + 7)  % 90) + 5,
  y:     ((i * 37 + 11) % 85) + 5,
  size:  1 + (i % 3) * 0.8,
  dur:   10 + (i % 7) * 2.5,
  delay: (i * 1.7) % 9,
}));

const PARTICLE_STYLE = `
  @keyframes tv-float {
    0%   { opacity: 0; transform: translateY(0)    scale(0.5); }
    50%  { opacity: 0.45; transform: translateY(-40px) scale(1.2); }
    100% { opacity: 0; transform: translateY(-80px) scale(0.5); }
  }
  @keyframes tv-progress {
    from { transform: scaleX(0); }
    to   { transform: scaleX(1); }
  }
`;

function FloatingParticles() {
  return (
    <>
      <style>{PARTICLE_STYLE}</style>
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {PARTICLE_DATA.map(p => (
          <div
            key={p.id}
            className="absolute rounded-full"
            style={{
              left:            `${p.x}%`,
              top:             `${p.y}%`,
              width:           p.size,
              height:          p.size,
              background:      GOLD,
              animationName:   'tv-float',
              animationDuration: `${p.dur}s`,
              animationDelay:  `${p.delay}s`,
              animationTimingFunction: 'ease-in-out',
              animationIterationCount: 'infinite',
            }}
          />
        ))}
      </div>
    </>
  );
}

// ── Barra de progreso del slide — CSS animation, sin setInterval ──
function SlideProgressBar({ slideKey, duration, paused }) {
  return (
    <div className="absolute bottom-0 left-0 right-0 h-[2px] z-20" style={{ background: 'rgba(255,255,255,0.04)' }}>
      {!paused && (
        <div
          key={slideKey}
          style={{
            height:          '100%',
            width:           '100%',
            background:      `linear-gradient(to right, ${GOLD}77, ${GOLD})`,
            boxShadow:       `0 0 6px rgba(212,175,55,0.45)`,
            transformOrigin: 'left',
            animation:       `tv-progress ${duration}ms linear forwards`,
          }}
        />
      )}
    </div>
  );
}

// ── Ticker inferior de servicios ──────────────────────────────────
function BottomTicker({ servicios }) {
  const ref = useRef(null);
  const [offset, setOffset] = useState(null);

  const items  = servicios.filter(s => s.nombre && s.activo !== false && !s.soloStaff);
  const content = items
    .map(s => `${s.nombre}${s.precio ? ` · $${Number(s.precio).toLocaleString('es-CL')}` : ''}`)
    .join('    ✦    ');

  useEffect(() => {
    if (!ref.current || !content) return;
    const t = setTimeout(() => {
      if (ref.current) setOffset(ref.current.scrollWidth / 2);
    }, 250);
    return () => clearTimeout(t);
  }, [content]);

  if (!items.length) return null;

  const duration = Math.max(22, content.length * 0.15);

  return (
    <div
      className="shrink-0 overflow-hidden relative"
      style={{ height: '2.5rem', borderTop: '1px solid rgba(212,175,55,0.07)', background: 'rgba(212,175,55,0.015)' }}
    >
      <div className="absolute inset-y-0 left-0 w-[140px] z-20 pointer-events-none"
        style={{ background: 'linear-gradient(to right, #050505 30%, transparent)' }} />
      <div className="absolute inset-y-0 right-0 w-20 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to left, #050505, transparent)' }} />

      {/* Live Badge fijo en el extremo izquierdo */}
      <div className="absolute left-6 inset-y-0 z-30 flex items-center pr-3 bg-[#050505]">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-bold tracking-wider text-[8px] uppercase select-none">
          <span className="w-1 h-1 bg-emerald-400 rounded-full animate-ping" />
          <span>Servicios</span>
        </div>
      </div>

      <div className="relative h-full flex items-center overflow-hidden pl-[110px]">
        <motion.div
          ref={ref}
          className="absolute flex whitespace-nowrap text-[10px] font-semibold tracking-[0.25em]"
          style={{ color: `${GOLD}66` }}
          animate={offset ? { x: [0, -offset] } : {}}
          transition={{ duration, repeat: Infinity, ease: 'linear', repeatType: 'loop' }}
        >
          <span className="pr-20">✦ &nbsp; {content}</span>
          <span className="pr-20">✦ &nbsp; {content}</span>
        </motion.div>
      </div>
    </div>
  );
}

// ── Reloj con fecha ───────────────────────────────────────────────
function DigitalClock({ compact = false }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const pad   = n => String(n).padStart(2, '0');
  const hora  = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const secs  = pad(now.getSeconds());
  const fecha = now.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="text-right">
      <div className="flex items-end justify-end gap-1">
        <span className="font-mono font-black text-primary leading-none" style={{ fontSize: compact ? 'clamp(1.4rem,2.6vw,2.1rem)' : 'clamp(2.5rem,5vw,4rem)' }}>
          {hora}
        </span>
        <motion.span
          className={`font-mono font-black leading-none ${compact ? 'pb-0.5' : 'pb-1'}`}
          style={{ fontSize: compact ? 'clamp(0.8rem,1.4vw,1.1rem)' : 'clamp(1.25rem,2.5vw,2rem)', color: GOLD }}
          animate={{ opacity: [1, 0.2, 1] }}
          transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
        >
          :{secs}
        </motion.span>
      </div>
      <p className={`text-gray-500 tracking-wide capitalize ${compact ? 'text-[10px] mt-0.5' : 'text-sm mt-1'}`}>{fecha}</p>
    </div>
  );
}

// ── Panel de turnos (Opción A) ────────────────────────────────────
function AppointmentPanel({ citas, totalHoy, completadasHoy, offline, barberos = [], size = 'md', nowMins = 0 }) {
  /* "En Sillón" REAL: la cita cuya ventana hora..hora+duración contiene la
     hora ACTUAL. Antes se asumía que la primera cita del día estaba en el
     sillón aunque fuera a las 16:00 y fueran las 10:00 — mentira visible
     para el cliente que espera. Sin match: "Sillón disponible" + siguiente. */
  const maxLista = size === 'sm' ? 4 : 5;
  const conVentana = citas.map(c => {
    const ini = aMins(c.hora);
    const dur = Math.max(15, parseInt(c.duracionServicio || c.duracion || 30, 10) || 30);
    return { ...c, _ini: ini, _fin: ini == null ? null : ini + dur };
  });
  // Varios profesionales pueden atender a la vez → "En Sillón" es una LISTA.
  const enAtencion = conVentana.filter(c => c._ini != null && c._ini <= nowMins && nowMins < c._fin);
  const enAtencionIds = new Set(enAtencion.map(c => c.id));
  // La cola avanza por RELOJ, no por si el barbero marcó "Completada": una
  // cita vencida sin cerrar no tapa a la que viene después.
  const siguientes = conVentana
    .filter(c => !enAtencionIds.has(c.id) && (c._fin == null || c._fin > nowMins))
    .slice(0, Math.max(1, maxLista - Math.min(enAtencion.length, 3)));
  const proxima = siguientes[0] || null;
  const enSillon = enAtencion.length === 1 ? enAtencion[0] : null;

  const padClass = size === 'sm' ? 'px-3 pt-3 pb-2' : size === 'lg' ? 'px-6 pt-6 pb-5' : 'px-5 pt-5 pb-4';
  const cardPad = size === 'sm' ? 'p-2.5' : size === 'lg' ? 'p-5' : 'p-4';
  const statsPad = size === 'sm' ? 'p-2' : size === 'lg' ? 'p-4' : 'p-3';
  const statsNumSize = size === 'sm' ? 'text-2xl' : size === 'lg' ? 'text-4xl' : 'text-3xl';
  const sillonTextSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-3xl' : 'text-2xl';
  const nextItemPad = size === 'sm' ? 'px-2.5 py-1.5' : size === 'lg' ? 'px-4 py-3' : 'px-3 py-2.5';
  const nextItemText = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm';

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* ── Stats strip ─────────────────────────── */}
      <div className={`${padClass} shrink-0`}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-5 rounded-full shrink-0" style={{ background: GOLD }} />
          <span className="text-[10px] font-black tracking-[0.4em] uppercase text-gray-400">Agenda de Hoy</span>
          {offline && <span className="ml-auto text-[8px] text-yellow-700 tracking-widest uppercase">offline</span>}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className={`rounded-xl ${statsPad} text-center`}
            style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.1)' }}>
            <p className={`font-black ${statsNumSize} text-primary leading-none`}>{totalHoy}</p>
            <p className="text-[9px] text-gray-600 uppercase tracking-widest mt-1">Total</p>
          </div>
          <div className={`rounded-xl ${statsPad} text-center`}
            style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.1)' }}>
            <p className={`font-black ${statsNumSize} text-green-400 leading-none`}>{completadasHoy}</p>
            <p className="text-[9px] text-gray-600 uppercase tracking-widest mt-1">Listas</p>
          </div>
        </div>
      </div>

      <div className="mx-5 h-px shrink-0" style={{ background: 'rgba(212,175,55,0.06)' }} />

      {/* ── Empty state ─────────────────────────── */}
      {citas.length === 0 ? (
        <motion.div
          className="flex-1 flex flex-col items-center justify-center gap-4 p-5"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}
        >
          <motion.div
            className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
            style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.12)' }}
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            ✂️
          </motion.div>
          <p className="text-gray-600 text-sm font-semibold text-center leading-relaxed">
            Sin citas<br />pendientes
          </p>
          <div className="flex flex-col items-center gap-1.5">
            <motion.div
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: '#22c55e' }}
              animate={{ opacity: [1, 0.3, 1], scale: [1, 1.3, 1] }}
              transition={{ duration: 1.8, repeat: Infinity }}
            />
            <p className="text-gray-700 text-[9px] tracking-widest uppercase">Sillón Disponible</p>
          </div>
        </motion.div>
      ) : (
        <div className={`flex-1 flex flex-col ${size === 'sm' ? 'px-3.5 py-2.5 gap-2.5' : size === 'lg' ? 'px-6 py-5 gap-5' : 'px-5 py-4 gap-4'} overflow-hidden`}>

          {/* En Sillón */}
          <div className="shrink-0">
            <div className="flex items-center gap-2 mb-2">
              <motion.span
                className="w-2 h-2 rounded-full"
                style={{ background: GOLD }}
                animate={{ scale: [1, 1.45, 1], opacity: [1, 0.55, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="text-[9px] font-black tracking-[0.4em] uppercase" style={{ color: GOLD }}>
                En Sillón{enAtencion.length > 1 ? ` · ${enAtencion.length}` : ''}
              </span>
            </div>

            <AnimatePresence mode="wait">
              {enSillon ? (
                <motion.div
                  key={enSillon.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    borderColor: [
                      'rgba(212,175,55,0.3)',
                      'rgba(212,175,55,0.7)',
                      'rgba(212,175,55,0.3)'
                    ],
                    boxShadow: [
                      '0 0 30px rgba(212,175,55,0.06) inset, 0 0 0px rgba(212,175,55,0)',
                      '0 0 30px rgba(212,175,55,0.12) inset, 0 0 15px rgba(212,175,55,0.2)',
                      '0 0 30px rgba(212,175,55,0.06) inset, 0 0 0px rgba(212,175,55,0)'
                    ]
                  }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className={`rounded-2xl ${cardPad} relative overflow-hidden`}
                  style={{
                    background: 'rgba(212,175,55,0.07)',
                    border:     `1px solid rgba(212,175,55,0.3)`,
                  }}
                >
                  <div className="absolute top-0 left-0 right-0 h-px"
                    style={{ background: `linear-gradient(to right, transparent, ${GOLD}60, transparent)` }} />

                  {/* Barbero avatar */}
                  {(enSillon.barbero || enSillon.barberoNombre) && (() => {
                    const name = enSillon.barbero || enSillon.barberoNombre;
                    const matched = barberos.find(b => b.nombre.toLowerCase().trim() === name.toLowerCase().trim());
                    const resolvedUrl = matched ? (matched.foto || matched.fotoUrl) : null;
                    const avatar = name ? name[0].toUpperCase() : '?';
                    return (
                      <div className="flex items-center gap-2.5 mb-3.5 bg-slate-950/45 border border-slate-800/80 rounded-xl px-3 py-1.5 w-fit">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 overflow-hidden relative"
                          style={{ background: 'rgba(212,175,55,0.2)', color: GOLD, border: `1.5px solid rgba(212,175,55,0.4)` }}
                        >
                          <span>{avatar}</span>
                          {resolvedUrl && (
                            <img src={resolvedUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest leading-none mb-0.5">Barbero</span>
                          <span className="text-xs sm:text-sm font-black truncate text-primary leading-tight">
                            {name}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  <p className={`text-primary font-black ${sillonTextSize} leading-tight truncate`}>
                    {nombrePublico(enSillon.clienteNombre || enSillon.nombre)}
                  </p>
                  <p className="text-gray-500 text-xs truncate mt-0.5">
                    {enSillon.servicioNombre || enSillon.servicio}
                  </p>
                  <p className="font-mono font-bold text-xl mt-2" style={{ color: GOLD }}>
                    {enSillon.hora}
                  </p>
                </motion.div>
              ) : enAtencion.length > 1 ? (
                /* Varias citas en curso a la vez (un profesional cada una):
                   filas compactas para no comerse el espacio de la cola. */
                <motion.div
                  key={'multi-' + enAtencion.map(c => c.id).join('_')}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex flex-col gap-1.5"
                >
                  {enAtencion.slice(0, 3).map(c => {
                    const bName = c.barbero || c.barberoNombre || '';
                    const matched = bName ? barberos.find(b => b.nombre.toLowerCase().trim() === bName.toLowerCase().trim()) : null;
                    const foto = matched ? (matched.foto || matched.fotoUrl) : null;
                    return (
                      <div
                        key={c.id}
                        className={`flex items-center gap-2.5 rounded-xl ${size === 'sm' ? 'px-2.5 py-2' : 'px-3 py-2.5'}`}
                        style={{ background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.3)' }}
                      >
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 overflow-hidden relative"
                          style={{ background: 'rgba(212,175,55,0.2)', color: GOLD, border: '1.5px solid rgba(212,175,55,0.4)' }}
                        >
                          <span>{bName ? bName[0].toUpperCase() : '✂'}</span>
                          {foto && <img src={foto} alt="" className="absolute inset-0 w-full h-full object-cover" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-primary font-black ${size === 'sm' ? 'text-xs' : 'text-sm'} truncate leading-tight`}>
                            {nombrePublico(c.clienteNombre || c.nombre)}
                          </p>
                          <p className="text-gray-500 text-[10px] truncate mt-0.5">
                            {bName ? `con ${bName}` : (c.servicioNombre || c.servicio || '')}
                          </p>
                        </div>
                        <p className="font-mono text-xs font-bold shrink-0" style={{ color: GOLD }}>{c.hora}</p>
                      </div>
                    );
                  })}
                  {enAtencion.length > 3 && (
                    <p className="text-[9px] text-gray-600 uppercase tracking-widest text-center">
                      +{enAtencion.length - 3} más en atención
                    </p>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="empty-sillon"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-2xl p-4 flex items-center justify-between"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <p className="text-gray-600 text-sm font-semibold">
                    Sillón Disponible{proxima ? ` · siguiente ${proxima.hora}` : ''}
                  </p>
                  <motion.div
                    className="w-2 h-2 rounded-full"
                    style={{ background: '#22c55e' }}
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* A continuación */}
          <div className="flex-1 overflow-hidden">
            <p className="text-[9px] font-black tracking-[0.4em] uppercase text-gray-700 mb-2.5">
              A continuación
            </p>
            {siguientes.length === 0 ? (
              <p className="text-gray-800 text-sm text-center mt-4">No hay más turnos</p>
            ) : (
              <div className="flex flex-col gap-2">
                {siguientes.slice(0, 4).map((c, i) => (
                  <motion.div
                    key={c.id || i}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.3 }}
                    className={`flex items-center gap-3 rounded-xl ${nextItemPad}`}
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                      style={{ background: 'rgba(212,175,55,0.08)', color: GOLD, border: `1px solid rgba(212,175,55,0.14)` }}
                    >
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-primary font-semibold ${nextItemText} truncate`}>
                        {nombrePublico(c.clienteNombre || c.nombre)}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {(c.barbero || c.barberoNombre) && (() => {
                          const bName = c.barbero || c.barberoNombre;
                          const matchedB = barberos.find(b => b.nombre.toLowerCase().trim() === bName.toLowerCase().trim());
                          const resolvedUrlB = matchedB ? (matchedB.foto || matchedB.fotoUrl) : null;
                          const avatarB = bName ? bName[0].toUpperCase() : '?';
                          return (
                            <div className="flex items-center gap-1 shrink-0 bg-slate-950/30 border border-slate-800/60 rounded px-1.5 py-0.5">
                              <div
                                className="w-3.5 h-3.5 rounded-full inline-flex items-center justify-center text-[7px] font-black shrink-0 overflow-hidden relative"
                                style={{ background: 'rgba(212,175,55,0.15)', color: GOLD, border: `0.5px solid rgba(212,175,55,0.35)` }}
                              >
                                <span>{avatarB}</span>
                                {resolvedUrlB && (
                                  <img src={resolvedUrlB} alt="" className="absolute inset-0 w-full h-full object-cover" />
                                )}
                              </div>
                              <span className="text-[9px] font-bold text-gray-200 uppercase tracking-wider">
                                {bName}
                              </span>
                            </div>
                          );
                        })()}
                        <span className="text-gray-800 text-[9px] select-none shrink-0">•</span>
                        <p className="text-gray-500 text-[10px] truncate">
                          {c.servicioNombre || c.servicio || ''}
                        </p>
                      </div>
                    </div>
                    <p className="font-mono text-xs font-bold shrink-0" style={{ color: GOLD }}>{c.hora}</p>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}

// ── Slide 1: Publicidad ───────────────────────────────────────────
function SlidePublicidad({ oferta }) {
  const o     = { ...OFERTA_DEFAULT, ...oferta };
  const lines = o.descripcion.split('\n');

  return (
    <div className="w-full h-full flex items-center justify-center p-20 relative">
      {/* Gradientes de fondo */}
      <div className="absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 80% 80% at 30% 60%, rgba(212,175,55,0.07) 0%, transparent 70%),
            radial-gradient(ellipse 60% 60% at 80% 20%, rgba(212,175,55,0.04) 0%, transparent 60%)
          `,
        }}
      />
      <div className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Partículas flotantes (Opción B) */}
      <FloatingParticles />

      <div className="relative z-10 text-center max-w-3xl">
        <motion.p
          className="text-[10px] font-black tracking-[0.6em] uppercase mb-6"
          style={{ color: GOLD }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          ✦ &nbsp; {o.etiqueta} &nbsp; ✦
        </motion.p>

        <motion.h2
          className="font-black leading-[0.88] mb-8"
          style={{ fontSize: 'clamp(5rem,12vw,9rem)' }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <span className="text-primary">{o.titulo1}</span>
          <br />
          <span style={{ color: GOLD }}>{o.titulo2}</span>
        </motion.h2>

        <motion.p
          className="text-gray-400 text-xl font-light mb-12 leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
        >
          {lines.map((line, i) => (
            <span key={i}>{line}{i < lines.length - 1 && <br />}</span>
          ))}
        </motion.p>

        <motion.div
          className="inline-flex items-center gap-3 rounded-full px-10 py-4"
          style={{
            border:     `1px solid rgba(212,175,55,0.35)`,
            background: 'rgba(212,175,55,0.05)',
            boxShadow:  '0 0 40px rgba(212,175,55,0.1)',
          }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
        >
          <span className="font-bold text-base tracking-widest" style={{ color: GOLD }}>
            {o.cta}
          </span>
        </motion.div>
      </div>
    </div>
  );
}

// ── Slide 2: Lookbook ─────────────────────────────────────────────
function SlideLookbook({ photos }) {
  const [photoIdx, setPhotoIdx] = useState(0);

  useEffect(() => {
    if (photos.length <= 1) return;
    const id = setInterval(() => setPhotoIdx(i => (i + 1) % photos.length), PHOTO_MS);
    return () => clearInterval(id);
  }, [photos.length]);

  if (!photos.length) {
    return (
      <div className="w-full h-full flex items-center justify-center text-slate-300">
        <div className="text-center bg-slate-950/65 backdrop-blur-md border border-white/10 rounded-3xl p-10 max-w-sm shadow-2xl animate-fade-in relative z-20">
          <p className="text-6xl mb-4 opacity-30">📷</p>
          <p className="text-lg font-bold tracking-wide">Lookbook en construcción</p>
          <p className="text-xs text-slate-500 mt-2">Pronto compartiremos nuestros mejores trabajos y cortes aquí.</p>
        </div>
      </div>
    );
  }

  const safe = photoIdx % photos.length;

  const next = (safe + 1) % photos.length;

  return (
    <div className="w-full h-full relative overflow-hidden">
      {/* Solo se montan la foto ACTUAL y la SIGUIENTE (pre-carga del fade).
          Antes se montaban TODAS a la vez — cada una con su capa blur y su
          Ken Burns infinito: con 30-40 fotos, un TV-stick barato se ahogaba
          tras unas horas encendido. */}
      {photos.map((photo, i) => {
        if (i !== safe && i !== next) return null;
        return (
        <motion.div
          key={photo.id || photo.url || i}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: i === safe ? 1 : 0, scale: i === safe ? 1 : 1.03 }}
          transition={{ duration: 0.55, ease: 'easeInOut' }}
        >
          <img
            src={photo.url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: 'blur(28px) brightness(0.35)', transform: 'scale(1.1)' }}
          />
          <motion.img
            src={photo.url}
            alt=""
            className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
            animate={i === safe ? {
              scale: [1, 1.04, 1.01, 1.03, 1],
              x: [0, 8, -8, 4, 0],
              y: [0, -5, 5, -3, 0]
            } : {}}
            transition={{ duration: PHOTO_MS / 1000, ease: 'linear', repeat: Infinity }}
          />
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to bottom, rgba(5,5,5,0.3) 0%, transparent 18%, transparent 78%, rgba(5,5,5,0.5) 100%)' }}
          />
        </motion.div>
        );
      })}

      <div className="absolute top-6 inset-x-0 z-10 text-center pointer-events-none">
        <p className="text-[9px] font-black tracking-[0.6em] uppercase" style={{ color: GOLD }}>
          ✦ &nbsp; Nuestros Trabajos &nbsp; ✦
        </p>
      </div>

      {photos.length <= 15 && (
        <div className="absolute bottom-12 inset-x-0 z-10 flex justify-center items-center gap-2 pointer-events-none">
          {photos.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-500"
              style={{
                width:      i === safe ? '1.5rem' : '0.375rem',
                height:     '0.375rem',
                background: i === safe ? `linear-gradient(to right, ${GOLD}, #FDE047)` : 'rgba(255,255,255,0.2)',
                boxShadow:  i === safe ? `0 0 8px rgba(212,175,55,0.5)` : 'none',
              }}
            />
          ))}
        </div>
      )}
      {photos.length > 15 && (
        <div className="absolute bottom-12 right-8 z-10 pointer-events-none">
          <span className="font-mono text-sm font-black" style={{ color: `${GOLD}AA` }}>
            {safe + 1} / {photos.length}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Slide 3: Equipo (Opción C — cards con fondo) ──────────────────
function SlideEquipo({ barberos, imageCache, cardsFondo, skipAnimation }) {
  const team = barberos.slice(0, 8);
  const cardStyle = cardsFondo
    ? { background: '#11141d', border: '1px solid rgba(212,175,55,0.32)', boxShadow: '0 8px 32px rgba(0,0,0,0.55)' }
    : { background: '#0e1018', border: '1px solid rgba(212,175,55,0.18)', boxShadow: '0 6px 24px rgba(0,0,0,0.4)' };
  const cols =
    team.length >= 7 ? 'grid-cols-4' :
    team.length >= 4 ? 'grid-cols-3' :
    team.length >= 2 ? 'grid-cols-2' : 'grid-cols-1';

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-10 relative">
      <div className="absolute inset-0"
        style={{ backgroundImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(212,175,55,0.04) 0%, transparent 70%)' }}
      />

      <motion.p
        className="text-[9px] font-black tracking-[0.6em] uppercase text-center mb-8 relative z-10"
        style={{ color: GOLD }}
        initial={skipAnimation ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        ✦ &nbsp; Nuestro Equipo &nbsp; ✦
      </motion.p>

      <div className={`grid ${cols} gap-5 w-full max-w-4xl relative z-10`}>
        {team.map((b, i) => {
          const resolvedUrl = imageCache[b.id] ?? null;
          const avatar      = (b.nombre || '?')[0].toUpperCase();

          return (
            <motion.div
              key={b.id || i}
              className="flex flex-col items-center text-center gap-3 rounded-2xl py-6 px-4"
              style={cardStyle}
              initial={skipAnimation ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={skipAnimation ? {} : { delay: i * 0.08, duration: 0.4 }}
            >
              <div
                className="relative w-24 h-24 rounded-full overflow-hidden shrink-0"
                style={{ border: `2px solid rgba(212,175,55,0.3)`, boxShadow: `0 0 20px rgba(212,175,55,0.1)` }}
              >
                <div
                  className="absolute inset-0 flex items-center justify-center text-3xl font-black select-none"
                  style={{ background: 'rgba(212,175,55,0.08)', color: GOLD }}
                >
                  {avatar}
                </div>
                {resolvedUrl && (
                  <img
                    src={resolvedUrl}
                    alt={b.nombre}
                    className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
                    style={{ opacity: 0 }}
                    onLoad={e => { e.currentTarget.style.opacity = '1'; }}
                    onError={e => { e.currentTarget.style.display = 'none'; }}
                  />
                )}
              </div>
              <div>
                <p className="text-primary font-bold text-base leading-tight">{b.nombre}</p>
                <p className="text-sm mt-1 capitalize" style={{ color: GOLD }}>
                  {b.especialidad || 'Barbero'}
                </p>
              </div>
            </motion.div>
          );
        })}
        {team.length === 0 && (
          <p className="col-span-3 text-gray-700 text-center">Sin datos de equipo</p>
        )}
      </div>
    </div>
  );
}

// ── Slide 4: Productos ────────────────────────────────────────────
function SlideProductos({ productos, cardsFondo, skipAnimation }) {
  // Rotación por páginas: antes se mostraban los primeros 8 por fecha de
  // creación, fijos para siempre — el resto del catálogo era invisible.
  const PER_PAGE = 8;
  const pages = Math.max(1, Math.ceil(productos.length / PER_PAGE));
  const [page, setPage] = useState(0);
  useEffect(() => {
    if (pages <= 1) return;
    const id = setInterval(() => setPage(p => (p + 1) % pages), 6000);
    return () => clearInterval(id);
  }, [pages]);
  const visible = productos.slice((page % pages) * PER_PAGE, (page % pages) * PER_PAGE + PER_PAGE);
  const cols    = visible.length > 6 ? 'grid-cols-4' : 'grid-cols-3';
  const cardStyle = cardsFondo
    ? { background: '#11141d', border: '1px solid rgba(212,175,55,0.32)', boxShadow: '0 8px 32px rgba(0,0,0,0.55)' }
    : { background: '#0e1018', border: '1px solid rgba(212,175,55,0.18)', boxShadow: '0 6px 24px rgba(0,0,0,0.4)' };

  if (!visible.length) {
    return (
      <div className="w-full h-full flex items-center justify-center text-slate-300">
        <div className="text-center bg-slate-950/65 backdrop-blur-md border border-white/10 rounded-3xl p-10 max-w-sm shadow-2xl animate-fade-in relative z-20">
          <p className="text-6xl mb-4 opacity-30">🛍️</p>
          <p className="text-lg font-bold tracking-wide">Sin productos disponibles</p>
          <p className="text-xs text-slate-500 mt-2">Próximamente agregaremos nuestra línea de productos exclusivos.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-12 relative">
      <div className="absolute inset-0"
        style={{ backgroundImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(212,175,55,0.04) 0%, transparent 70%)' }}
      />
      <motion.p
        className="text-[9px] font-black tracking-[0.6em] uppercase text-center mb-10 relative z-10"
        style={{ color: GOLD }}
        initial={skipAnimation ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        ✦ &nbsp; Nuestros Productos &nbsp; ✦
      </motion.p>

      <div className={`grid ${cols} gap-6 w-full max-w-5xl relative z-10`}>
        {visible.map((p, i) => {
          const enStock = p.stock == null || Number(p.stock) > 0;
          return (
            <motion.div
              key={p.id || i}
              className="flex flex-col rounded-2xl overflow-hidden"
              style={cardStyle}
              initial={skipAnimation ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={skipAnimation ? {} : { delay: i * 0.07, duration: 0.4 }}
            >
              <div className="aspect-square bg-slate-950 overflow-hidden">
                {p.imagen ? (
                  <img src={p.imagen} alt={p.nombre} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: 'rgba(212,175,55,0.04)' }}>
                    <span className="text-4xl opacity-20">🛍️</span>
                  </div>
                )}
              </div>
              <div className="px-4 py-3 flex flex-col gap-1">
                <p className="text-primary font-bold text-sm leading-tight truncate">{p.nombre}</p>
                {p.precio ? (
                  <p className="font-black text-base" style={{ color: GOLD }}>
                    ${Number(p.precio).toLocaleString('es-CL')}
                  </p>
                ) : (
                  <p className="text-xs italic" style={{ color: `${GOLD}88` }}>Consultar en el local</p>
                )}
                <div className="flex items-center gap-1.5 mt-0.5">
                  <motion.div
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: enStock ? '#22c55e' : '#ef4444' }}
                    animate={enStock ? { opacity: [1, 0.4, 1], scale: [1, 1.3, 1] } : {}}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <span className="text-[10px] font-semibold" style={{ color: enStock ? '#4ade80' : '#f87171' }}>
                    {enStock ? 'Disponible' : 'Sin stock'}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ── Slide 5: Marcas / Publicidad (Solo Elegance) ──────────────────
function SlideMarcas({ marcas, skipAnimation }) {
  const visible = marcas.filter(m => m.activo !== false).slice(0, 4);
  const cols = visible.length === 1 ? 'grid-cols-1' : 'grid-cols-2';

  if (!visible.length) {
    return (
      <div className="w-full h-full flex items-center justify-center text-slate-300">
        <div className="text-center bg-slate-950/65 backdrop-blur-md border border-white/10 rounded-3xl p-10 max-w-sm shadow-2xl animate-fade-in relative z-20">
          <p className="text-6xl mb-4 opacity-30">🏆</p>
          <p className="text-lg font-bold tracking-wide">Nuestras Marcas</p>
          <p className="text-xs text-slate-500 mt-2">Próximamente listaremos las marcas y auspiciadores del local.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-12 relative">
      <div className="absolute inset-0"
        style={{ backgroundImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(212,175,55,0.04) 0%, transparent 70%)' }}
      />
      <motion.p
        className="text-[9px] font-black tracking-[0.6em] uppercase text-center mb-10 relative z-10"
        style={{ color: GOLD }}
        initial={skipAnimation ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        ✦ &nbsp; Marcas Asociadas &nbsp; ✦
      </motion.p>

      <div className={`grid ${cols} gap-10 w-full max-w-5xl relative z-10`}>
        {visible.map((m, i) => (
          <motion.div
            key={m.id || i}
            className="flex flex-col items-center justify-center gap-5"
            initial={skipAnimation ? false : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={skipAnimation ? {} : { delay: i * 0.1, duration: 0.45 }}
          >
            {/* Marco claro para que el logo resalte sobre el fondo oscuro */}
            <div
              className="w-full flex items-center justify-center rounded-3xl overflow-hidden p-10"
              style={{
                height: visible.length === 1 ? '20rem' : '14rem',
                background: 'linear-gradient(160deg, #ffffff 0%, #f1f1f0 100%)',
                border: `2px solid ${GOLD}`,
                boxShadow: `0 12px 40px rgba(0,0,0,0.45), 0 0 0 6px rgba(212,175,55,0.08)`,
              }}
            >
              {m.logoUrl ? (
                <img src={m.logoUrl} alt={m.nombre} className="max-w-full max-h-full object-contain" />
              ) : (
                <span className="text-7xl opacity-20">🏆</span>
              )}
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <p className="text-primary font-bold text-lg tracking-[0.15em] text-center uppercase">{m.nombre}</p>
              {m.descripcion && (
                <p className="text-slate-300 text-sm text-center max-w-xs leading-snug">{m.descripcion}</p>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ── Slide: Reserva HOY (horas libres reales + QR) ─────────────────
// El slide que convierte al walk-in que mira la pantalla: los cupos
// LIBRES de hoy (disponibilidad real vía chatHorasDisponibles — la misma
// fuente que usa el bot y el chat, nada de calcular aparte) + QR directo
// a la reserva online.
function SlideReservar({ dispo, qrReservaUrl }) {
  const slots = (dispo?.slots || []).slice(0, 8);
  const hay   = slots.length > 0;
  const fechaLegible = (f) => {
    if (!f) return '';
    const [y, m, d] = f.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-16 relative">
      <div className="absolute inset-0"
        style={{ backgroundImage: 'radial-gradient(ellipse 70% 70% at 40% 50%, rgba(212,175,55,0.06) 0%, transparent 70%)' }} />
      <div className="relative z-10 flex items-center gap-16 max-w-5xl">
        <div className="flex-1">
          <p className="text-[10px] font-black tracking-[0.6em] uppercase mb-5" style={{ color: GOLD }}>
            ✦ &nbsp; {hay && dispo?.esHoy ? 'Quedan horas hoy' : 'Reserva tu hora'} &nbsp; ✦
          </p>
          <h2 className="font-black leading-[0.95] mb-6 text-primary" style={{ fontSize: 'clamp(2.6rem,5.5vw,4.5rem)' }}>
            {hay
              ? (dispo.esHoy ? <>¿Sin hora?<br /><span style={{ color: GOLD }}>Aún alcanzas hoy</span></> : <>Próximos<br /><span style={{ color: GOLD }}>cupos libres</span></>)
              : <>Reserva<br /><span style={{ color: GOLD }}>en segundos</span></>}
          </h2>
          {hay && !dispo.esHoy && dispo.fecha && (
            <p className="text-gray-400 text-lg mb-4 capitalize">{fechaLegible(dispo.fecha)}</p>
          )}
          {hay ? (
            <div className="flex flex-wrap gap-3">
              {slots.map(h => (
                <span key={h} className="font-mono font-bold text-xl px-5 py-2.5 rounded-xl"
                  style={{ color: GOLD, background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.3)' }}>
                  {h}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-xl font-light leading-relaxed">
              Agenda online abierta 24/7.<br />Elige profesional, día y hora desde tu teléfono.
            </p>
          )}
        </div>
        <div className="shrink-0 flex flex-col items-center gap-4 rounded-3xl p-8"
          style={{ background: 'rgba(5,5,5,0.7)', border: `1px solid rgba(212,175,55,0.4)`, boxShadow: '0 0 60px rgba(212,175,55,0.12)' }}>
          <QRCodeSVG value={qrReservaUrl} size={210} fgColor={GOLD} bgColor="transparent" level="M" />
          <p className="text-sm font-black tracking-[0.2em] uppercase" style={{ color: GOLD }}>Escanea y reserva</p>
        </div>
      </div>
    </div>
  );
}

// ── Slide: Reseñas de clientes (prueba social) ────────────────────
function SlideResenas({ resenas }) {
  const visible = resenas.slice(0, 6);
  const cols = visible.length >= 5 ? 'grid-cols-3' : visible.length >= 3 ? 'grid-cols-3' : 'grid-cols-2';
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-12 relative">
      <div className="absolute inset-0"
        style={{ backgroundImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(212,175,55,0.04) 0%, transparent 70%)' }} />
      <p className="text-[9px] font-black tracking-[0.6em] uppercase text-center mb-8 relative z-10" style={{ color: GOLD }}>
        ✦ &nbsp; Lo que dicen nuestros clientes &nbsp; ✦
      </p>
      <div className={`grid ${cols} gap-5 w-full max-w-5xl relative z-10`}>
        {visible.map((r, i) => (
          <motion.div
            key={r.id || i}
            className="flex flex-col gap-3 rounded-2xl p-6"
            style={{ background: '#0e1018', border: '1px solid rgba(212,175,55,0.18)', boxShadow: '0 6px 24px rgba(0,0,0,0.4)' }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
          >
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }, (_, s) => (
                <span key={s} style={{ color: s < (r.rating || 5) ? GOLD : 'rgba(255,255,255,0.15)', fontSize: '1rem' }}>★</span>
              ))}
            </div>
            <p className="text-gray-300 text-sm leading-relaxed line-clamp-4">“{String(r.comentario || '').slice(0, 160)}”</p>
            <p className="text-[11px] font-bold mt-auto" style={{ color: `${GOLD}AA` }}>
              — {nombrePublico(r.clienteNombre || r.nombre || 'Cliente')}{r.barberoNombre ? ` · con ${r.barberoNombre}` : ''}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ── Slide: Cumpleaños del día ─────────────────────────────────────
function SlideCumples({ nombres }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-16 relative">
      <div className="absolute inset-0"
        style={{ backgroundImage: 'radial-gradient(ellipse 70% 70% at 50% 40%, rgba(212,175,55,0.08) 0%, transparent 70%)' }} />
      <FloatingParticles />
      <motion.p
        className="text-7xl mb-6 relative z-10"
        animate={{ rotate: [-6, 6, -6], scale: [1, 1.08, 1] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        🎉
      </motion.p>
      <h2 className="font-black text-center leading-tight mb-6 relative z-10" style={{ fontSize: 'clamp(2.6rem,6vw,4.6rem)' }}>
        <span className="text-primary">¡Feliz cumpleaños</span>
        <br />
        <span style={{ color: GOLD }}>{nombres.slice(0, 3).join(', ')}!</span>
      </h2>
      <p className="text-gray-400 text-lg text-center relative z-10">
        De parte de todo el equipo — que tengas un gran día ✂️
      </p>
    </div>
  );
}

// ── QR overlay ────────────────────────────────────────────────────
function QrOverlay({ qrUrl, qrColor, qrSize, titulo = '¡Únete al Club!', sub = 'Escanea y regístrate gratis' }) {
  const color = qrColor || GOLD;
  const size  = qrSize  || 160;
  const hexToRgb = h => {
    const r = parseInt(h.slice(1,3),16), g = parseInt(h.slice(3,5),16), b = parseInt(h.slice(5,7),16);
    return isNaN(r) ? '212,175,55' : `${r},${g},${b}`;
  };
  const rgb = hexToRgb(color);

  return (
    <div className="absolute bottom-6 right-6 z-20">
      <motion.div
        className="rounded-3xl p-5 flex flex-col items-center gap-3 relative overflow-hidden"
        style={{ background: 'rgba(5,5,5,0.88)', backdropFilter: 'blur(16px)', border: `1px solid rgba(${rgb},0.5)` }}
        animate={{
          boxShadow: [
            `0 0 20px rgba(${rgb},0.12)`,
            `0 0 45px rgba(${rgb},0.30)`,
            `0 0 20px rgba(${rgb},0.12)`,
          ],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="absolute inset-[3px] rounded-[20px] pointer-events-none"
          style={{ border: `1px solid rgba(${rgb},0.15)` }} />

        <motion.span
          className="text-xs font-black tracking-[0.3em] uppercase"
          style={{ color }}
          animate={{ textShadow: [`0 0 8px rgba(${rgb},0.3)`, `0 0 20px rgba(${rgb},0.8)`, `0 0 8px rgba(${rgb},0.3)`] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          {titulo}
        </motion.span>

        <QRCodeSVG value={qrUrl} size={size} fgColor={color} bgColor="transparent" level="M" />
        {sub && <p className="text-gray-600 text-[10px] tracking-wide">{sub}</p>}
      </motion.div>
    </div>
  );
}

// ── Indicadores de slide ──────────────────────────────────────────
function SlideIndicators({ labels, active, paused, onChange }) {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-end gap-5 z-10">
      {labels.map((label, i) => (
        <button key={i} onClick={e => { e.stopPropagation(); onChange(i); }}
          className="flex flex-col items-center gap-1.5">
          <span
            className="text-[8px] font-black tracking-[0.3em] uppercase transition-all duration-500"
            style={{ color: i === active ? GOLD : 'rgba(255,255,255,0.2)' }}
          >
            {label}
          </span>
          <div
            className="h-1 rounded-full transition-all duration-500"
            style={{
              width:      i === active ? '3rem' : '1.5rem',
              background: i === active ? `linear-gradient(to right, ${GOLD}, #FDE047)` : 'rgba(255,255,255,0.12)',
              boxShadow:  i === active ? `0 0 8px rgba(212,175,55,0.5)` : 'none',
            }}
          />
        </button>
      ))}

      <AnimatePresence>
        {paused && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }}
            className="mb-1 w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(212,175,55,0.12)', border: `1px solid rgba(212,175,55,0.35)` }}
          >
            <span style={{ fontSize: '9px', color: GOLD }}>⏸</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function getYouTubeId(url) {
  if (!url) return '';
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : '';
}

// ── Componente principal ──────────────────────────────────────────
export default function BarberTV() {
  const { id: tenantId, name: tenantName, logo: tenantLogo } = useTenant();

  useEffect(() => {
    document.title = `${tenantName} — TV`;
  }, [tenantName]);

  const [citas,          setCitas]          = useState(() => {
    try {
      const tid = resolveTenantId();
      return JSON.parse(localStorage.getItem(lsCitasKey(tid)) || '[]');
    } catch { return []; }
  });
  const [totalHoy,       setTotalHoy]       = useState(0);
  const [completadasHoy, setCompleadasHoy]  = useState(0);
  const [photos,         setPhotos]         = useState([]);
  const [barberos,       setBarberos]       = useState([]);
  const [productos,      setProductos]      = useState([]);
  const [marcas,         setMarcas]         = useState([]);
  const [servicios,      setServicios]      = useState([]);
  const [oferta,         setOferta]         = useState(OFERTA_DEFAULT);
  const [slide,          setSlide]          = useState(0);
  const [paused,         setPaused]         = useState(false);
  const [offline,        setOffline]        = useState(false);
  const [imageCache,     setImageCache]     = useState({});
  const [duracion,       setDuracion]       = useState(SLIDE_MS);
  const [slidesActivos,  setSlidesActivos]  = useState({ oferta: true, lookbook: true, equipo: true, productos: true, marcas: true, reservar: true, resenas: true, cumples: true });
  const [accentColor,    setAccentColor]    = useState('');
  const [qrConfig,       setQrConfig]       = useState({ color: '', size: 160 });
  const [backgroundUrl,  setBackgroundUrl]  = useState(() => sessionStorage.getItem(`tv_bg_${tenantId}`) || '');
  const [youtubeUrl,     setYoutubeUrl]     = useState('');
  const [youtubeVideoUrl, setYoutubeVideoUrl] = useState('');
  const [ytPlayer,       setYtPlayer]       = useState(null);
  const [audioState,     setAudioState]     = useState('paused'); // 'paused', 'playing', 'blocked'
  const [hideSlideshow,  setHideSlideshow]  = useState(false);
  const [rawVideoBg,     setRawVideoBg]     = useState(false);
  const [sidebarSize,    setSidebarSize]    = useState('md');
  const [hideHeader,     setHideHeader]     = useState(false);
  const [headerSize,     setHeaderSize]     = useState('md');
  const [hideTicker,     setHideTicker]     = useState(false);
  const [cardsFondo,     setCardsFondo]     = useState(false);
  // Día y hora de CHILE, refrescados cada 30 s: mueven el rollover de
  // medianoche (la query de citas depende de hoyStr) y el "En Sillón" real.
  const [hoyStr,         setHoyStr]         = useState(hoyChileStr());
  const [nowMins,        setNowMins]        = useState(minsAhoraChile());
  const [dispo,          setDispo]          = useState(null);   // {fecha, esHoy, slots} de chatHorasDisponibles
  const [resenasTv,      setResenasTv]      = useState([]);
  const [cumples,        setCumples]        = useState([]);

  GOLD = accentColor || TENANT_ACCENT[tenantId] || '#D4AF37';

  const isVideoBg = backgroundUrl && (
    backgroundUrl.includes('.mp4') ||
    backgroundUrl.includes('.webm') ||
    backgroundUrl.includes('.mov') ||
    backgroundUrl.split('?')[0].endsWith('.mp4') ||
    backgroundUrl.split('?')[0].endsWith('.webm')
  );

  const ytVideoId = getYouTubeId(youtubeUrl);

  useEffect(() => {
    if (!ytVideoId) return;

    let playerInstance = null;

    const initPlayer = () => {
      if (!window.YT || !window.YT.Player) return;
      
      playerInstance = new window.YT.Player('yt-audio-player', {
        videoId: ytVideoId,
        playerVars: {
          autoplay: 1,
          loop: 1,
          playlist: ytVideoId,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
        },
        events: {
          onReady: (event) => {
            setYtPlayer(event.target);
            event.target.playVideo();
            // Comprobamos si el autoplay funcionó un momento después
            setTimeout(() => {
              if (event.target.getPlayerState() === window.YT.PlayerState.PLAYING) {
                setAudioState('playing');
              } else {
                setAudioState('blocked');
              }
            }, 1200);
          },
          onStateChange: (event) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              setAudioState('playing');
            } else if (event.data === window.YT.PlayerState.PAUSED) {
              setAudioState('paused');
            }
          }
        }
      });
    };

    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = initPlayer;
    } else {
      initPlayer();
    }

    return () => {
      if (playerInstance && typeof playerInstance.destroy === 'function') {
        playerInstance.destroy();
      }
      setYtPlayer(null);
    };
  }, [ytVideoId]);

  const toggleMute = () => {
    if (!ytPlayer) return;
    if (audioState === 'playing') {
      ytPlayer.mute();
      setAudioState('paused');
    } else {
      ytPlayer.unMute();
      ytPlayer.setVolume(50);
      ytPlayer.playVideo();
      setAudioState('playing');
    }
  };

  const bgVideoRef     = useRef(null);
  const preloadedRef   = useRef(new Set());
  const activeCountRef = useRef(4);
  const visitedRef     = useRef(new Set([0]));

  /* QR de la esquina con DESTINO configurable (TVConfig → Código QR):
     club (registro, default histórico), reservar (agenda pública) o una
     URL propia del local. El copy acompaña al destino. */
  const qrDestino = qrConfig.destino || 'club';
  const qrUrl =
    qrDestino === 'reservar' ? `${window.location.origin}/?local=${tenantId}`
    : qrDestino === 'custom' && (qrConfig.customUrl || '').trim() ? qrConfig.customUrl.trim()
    : `${window.location.origin}/registro.html?local=${tenantId}`;
  const qrTitulo = qrDestino === 'reservar' ? '¡Reserva tu hora!'
    : qrDestino === 'custom' ? (qrConfig.etiqueta || 'Escanéame')
    : '¡Únete al Club!';
  const qrSub = qrDestino === 'reservar' ? 'Escanea y agenda en segundos'
    : qrDestino === 'custom' ? ''
    : 'Escanea y regístrate gratis';

  useEffect(() => { visitedRef.current.add(slide); }, [slide]);

  /* ── Tick de 30 s (hora de Chile) ─────────────────────────────────
     Actualiza nowMins (para el "En Sillón" real) y hoyStr — cuando cruza
     medianoche, la query de citas se re-suscribe SOLA al día nuevo. Antes
     una TV encendida 24/7 amanecía mostrando la agenda de ayer hasta que
     alguien la recargara a mano. */
  useEffect(() => {
    const id = setInterval(() => {
      setNowMins(minsAhoraChile());
      const h = hoyChileStr();
      setHoyStr(prev => (prev === h ? prev : h));
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  /* Señalética always-on: (1) wake-lock para que la pantalla no se duerma;
     (2) recarga programada a las 04:05 — una SPA con video y animaciones
     corriendo semanas acumula memoria, y el reload nocturno la sanea sin
     que nadie lo note. */
  useEffect(() => {
    let lock = null;
    const pedir = async () => { try { lock = await navigator.wakeLock?.request('screen'); } catch { /* no soportado */ } };
    pedir();
    const alVolver = () => { if (document.visibilityState === 'visible') pedir(); };
    document.addEventListener('visibilitychange', alVolver);
    return () => { document.removeEventListener('visibilitychange', alVolver); lock?.release?.(); };
  }, []);
  useEffect(() => {
    const id = setInterval(() => {
      const hhmm = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Santiago', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
      if (hhmm === '04:05') window.location.reload();
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  // Citas de hoy — carga TODAS para contar completadas + filtra activas en cliente
  useEffect(() => {
    const ACTIVE   = new Set(['Confirmada', 'confirmada', 'pendiente', 'Pendiente']);
    const q = query(tenantCol('citas'), where('fecha', '==', hoyStr));
    return onSnapshot(q, snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(c => c.origenQA !== true);
      const active = all
        .filter(c => ACTIVE.has(c.estado))
        .sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
      const done = all.filter(c => c.estado === 'Completada' || c.estado === 'completada').length;
      setCitas(active);
      setTotalHoy(all.length);
      setCompleadasHoy(done);
      setOffline(false);
      try { localStorage.setItem(lsCitasKey(tenantId), JSON.stringify(active)); } catch {}
    }, () => setOffline(true));
  }, [tenantId, hoyStr]);

  /* Contenido LIVE: antes lookbook/equipo/servicios/productos/marcas se
     cargaban una sola vez — un cambio de precio o una foto nueva no
     aparecía hasta recargar la TV. Con onSnapshot la pantalla siempre está
     al día (y Firestore solo re-lee lo que cambió). */

  // Lookbook
  useEffect(() => {
    return onSnapshot(query(tenantCol('lookbook'), orderBy('order', 'asc')),
      snap => setPhotos(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      () => {});
  }, [tenantId]);

  // Equipo
  useEffect(() => {
    return onSnapshot(query(tenantCol('barberos'), where('activo', '!=', false)),
      snap => setBarberos(
        // El admin PURO no sale en la TV del local, pero el admin que atiende
        // sí: es un barbero más en la pantalla. Misma regla que la agenda.
        snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(b =>
          !b._mainDocId
          && b.esQA !== true
          && (b.rol !== 'admin' || b.esBarbero === true || b.mostrarEnAgenda === true)
        ),
      ),
      () => {});
  }, [tenantId]);

  // Servicios — para el ticker inferior
  useEffect(() => {
    return onSnapshot(query(tenantCol('servicios'), orderBy('orden', 'asc')),
      snap => setServicios(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      () => {});
  }, [tenantId]);

  // Reseñas de clientes (prueba social): 5★ con comentario; si hay pocas,
  // se relaja a 4★. El slide se auto-oculta sin datos.
  useEffect(() => {
    return onSnapshot(query(tenantCol('resenas'), orderBy('createdAt', 'desc'), limit(40)),
      snap => {
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          .filter(r => String(r.comentario || '').trim().length >= 8);
        const top = all.filter(r => (r.rating || 0) >= 5);
        setResenasTv((top.length >= 2 ? top : all.filter(r => (r.rating || 0) >= 4)).slice(0, 6));
      },
      () => {});
  }, [tenantId]);

  // Cumpleaños del día — mismo campo indexado que usa el cron (cumpleDia
  // "MM-DD" en functions/cumpleanos.js). Solo nombres de pila en pantalla.
  useEffect(() => {
    const mmdd = hoyStr.slice(5);
    return onSnapshot(query(tenantCol('users'), where('cumpleDia', '==', mmdd)),
      snap => setCumples(
        snap.docs.map(d => String(d.data().nombre || d.data().displayName || '').trim().split(/\s+/)[0])
          .filter(Boolean).slice(0, 3),
      ),
      () => setCumples([]));
  }, [tenantId, hoyStr]);

  // Disponibilidad REAL de hoy para el slide "Reserva": la misma fuente que
  // el bot y el chat (chatHorasDisponibles), refrescada cada 10 minutos.
  useEffect(() => {
    let vivo = true;
    const cargar = () => {
      const fn = httpsCallable(getFunctions(undefined, 'us-central1'), 'chatHorasDisponibles');
      fn({ tenantId: resolveTenantId() })
        .then(r => { if (vivo && r?.data?.ok) setDispo(r.data); })
        .catch(() => {});
    };
    cargar();
    const id = setInterval(cargar, 10 * 60_000);
    return () => { vivo = false; clearInterval(id); };
  }, [tenantId, hoyStr]);

  // Configuración TV
  useEffect(() => {
    const ref = tenantDoc('configuracion', 'tv');
    return onSnapshot(ref, snap => {
      if (!snap.exists()) return;
      const d = snap.data();
      if (d.oferta)        setOferta(prev => ({ ...OFERTA_DEFAULT, ...d.oferta }));
      if (d.duracionSlide) setDuracion(Number(d.duracionSlide) * 1000);
      if (d.slidesActivos) setSlidesActivos(prev => ({ ...prev, ...d.slidesActivos }));
      setAccentColor(d.accentColor || '');
      if (d.qr)            setQrConfig(prev => ({ ...prev, ...d.qr }));
      const bgUrl = d.backgroundUrl || '';
      setBackgroundUrl(bgUrl);
      if (bgUrl) sessionStorage.setItem(`tv_bg_${tenantId}`, bgUrl);
      else        sessionStorage.removeItem(`tv_bg_${tenantId}`);
      setYoutubeUrl(d.youtubeUrl || '');
      setYoutubeVideoUrl(d.youtubeVideoUrl || '');
      setHideSlideshow(d.hideSlideshow === true);
      setRawVideoBg(d.rawVideoBg === true);
      setSidebarSize(d.sidebarSize || 'md');
      setHideHeader(d.hideHeader === true);
      setHeaderSize(d.headerSize || 'md');
      setHideTicker(d.hideTicker === true);
      setCardsFondo(d.cardsFondo === true);
    }, () => {});
  }, [tenantId]);

  // Productos (solo activos)
  useEffect(() => {
    return onSnapshot(query(tenantCol('productos'), orderBy('createdAt', 'asc')),
      snap => setProductos(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => p.activo !== false)),
      () => {});
  }, [tenantId]);

  // Marcas / auspiciadores — abierto a TODOS los tenants (antes solo
  // Elegance): es espacio publicitario que el local puede vender a sus
  // marcas. Las rules de publicidad_tv ya existían raíz + tenants. El
  // slide se auto-oculta si el local no cargó ninguna.
  useEffect(() => {
    return onSnapshot(query(tenantCol('publicidad_tv'), orderBy('createdAt', 'asc')),
      snap => setMarcas(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      () => {});
  }, [tenantId]);

  // Caché de fotos de barberos
  useEffect(() => {
    if (!barberos.length) return;
    setImageCache(prev => {
      const next = { ...prev };
      let changed = false;
      barberos.forEach(b => {
        const url = b.foto || b.fotoUrl;
        if (url && !next[b.id]) { next[b.id] = url; changed = true; }
      });
      return changed ? next : prev;
    });
  }, [barberos]);

  // Pre-loaders
  useEffect(() => {
    barberos.forEach(b => {
      const url = b.foto || b.fotoUrl;
      if (url && !preloadedRef.current.has(url)) {
        preloadedRef.current.add(url);
        new Image().src = url;
      }
    });
  }, [barberos]);
  useEffect(() => {
    photos.forEach(p => {
      if (p.url && !preloadedRef.current.has(p.url)) {
        preloadedRef.current.add(p.url);
        new Image().src = p.url;
      }
    });
  }, [photos]);
  useEffect(() => {
    productos.forEach(p => {
      if (p.imagen && !preloadedRef.current.has(p.imagen)) {
        preloadedRef.current.add(p.imagen);
        new Image().src = p.imagen;
      }
    });
  }, [productos]);
  useEffect(() => {
    marcas.forEach(m => {
      if (m.logoUrl && !preloadedRef.current.has(m.logoUrl)) {
        preloadedRef.current.add(m.logoUrl);
        new Image().src = m.logoUrl;
      }
    });
  }, [marcas]);

  // Carrusel automático
  useEffect(() => {
    if (paused) return;
    const id = setInterval(
      () => setSlide(s => (s + 1) % (activeCountRef.current || 1)),
      duracion,
    );
    return () => clearInterval(id);
  }, [paused, duracion]);

  const handleCarouselClick = useCallback(() => setPaused(p => !p), []);
  const handleSlideChange   = useCallback(i => {
    const key = visibleDefs[i]?.key || i;
    visitedRef.current.add(key);
    visitedRef.current.add(i);
    setSlide(i);
  }, []);

  const qrReservaUrl = `${window.location.origin}/?local=${tenantId}`;

  const ALL_DEFS = [
    { key: 'oferta',    label: 'Oferta',    el: <SlidePublicidad key="pub"  oferta={oferta} /> },
    // El slide que convierte: cupos libres de HOY + QR directo a reservar.
    { key: 'reservar',  label: 'Reserva',   el: <SlideReservar   key="resv" dispo={dispo} qrReservaUrl={qrReservaUrl} /> },
    { key: 'lookbook',  label: 'Trabajos',  el: <SlideLookbook   key="look" photos={photos} /> },
    { key: 'equipo',    label: 'Equipo',    el: <SlideEquipo     key="team" barberos={barberos} imageCache={imageCache} cardsFondo={cardsFondo} skipAnimation={visitedRef.current.has(2)} /> },
    { key: 'productos', label: 'Productos', el: <SlideProductos  key="prod" productos={productos} cardsFondo={cardsFondo} skipAnimation={visitedRef.current.has(3)} /> },
  ];
  // Slides con datos opcionales: se AUTO-OCULTAN si el local no tiene qué
  // mostrar — un slide vacío en loop es peor que no tenerlo.
  if (resenasTv.length) {
    ALL_DEFS.push({ key: 'resenas', label: 'Reseñas', el: <SlideResenas key="rese" resenas={resenasTv} /> });
  }
  if (cumples.length) {
    ALL_DEFS.push({ key: 'cumples', label: 'Cumpleaños', el: <SlideCumples key="cump" nombres={cumples} /> });
  }
  // Marcas: abierto a todos los tenants (antes hardcodeado solo-Elegance).
  if (marcas.length) {
    ALL_DEFS.push({ key: 'marcas', label: 'Marcas', el: <SlideMarcas key="marcas" marcas={marcas} skipAnimation={visitedRef.current.has('marcas')} /> });
  }
  const activeDefs  = ALL_DEFS.filter(s => slidesActivos[s.key] !== false);
  const visibleDefs = activeDefs.length ? activeDefs : ALL_DEFS;
  activeCountRef.current = visibleDefs.length;
  const safeSlide   = Math.min(slide, visibleDefs.length - 1);
  const slideLabels = visibleDefs.map(s => s.label);

  return (
    <div
      className="relative w-screen h-screen overflow-hidden flex flex-col select-none cursor-none"
      style={{ background: '#050505' }}
    >
      {/* La imagen/video de fondo se renderiza dentro de <main> para que
          quede a la derecha de la columna izquierda (no detrás de ella ni del header). */}

      {/* ── Header ─────────────────────────────────────────────── */}
      {!hideHeader && (
        <header
          className={`flex items-center justify-between shrink-0 relative z-10 ${headerSize === 'sm' ? 'px-6 py-2.5' : 'px-10 py-5'}`}
          style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
        >
          <div className="absolute bottom-0 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(to right, transparent, rgba(212,175,55,0.2), transparent)' }} />

          <div className={`flex items-center ${headerSize === 'sm' ? 'gap-2.5' : 'gap-4'}`}>
            <div
              className={`relative overflow-hidden ${headerSize === 'sm' ? 'w-9 h-9 rounded-xl' : 'w-12 h-12 rounded-2xl'}`}
              style={{ boxShadow: `0 0 20px rgba(212,175,55,0.2), 0 0 0 1px rgba(212,175,55,0.15)` }}
            >
              <img src={tenantLogo || '/logo.jpg'} alt={tenantName} className="w-full h-full object-cover" />
            </div>
            <div>
              <div className={`text-primary font-black tracking-tight leading-none ${headerSize === 'sm' ? 'text-base' : 'text-xl'}`}>{tenantName}</div>
            </div>
          </div>

          <DigitalClock compact={headerSize === 'sm'} />
        </header>
      )}

      {/* ── Body ───────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative z-10">

        {/* Panel turnos — 26% (Configurable size) */}
        <aside
          className="overflow-hidden shrink-0 transition-all duration-300"
          style={{
            width: sidebarSize === 'sm' ? '20%' : sidebarSize === 'lg' ? '32%' : '26%',
            borderRight: '1px solid rgba(212,175,55,0.14)',
            background: 'linear-gradient(180deg, #0b0d13 0%, #08090d 100%)',
          }}
        >
          <AppointmentPanel
            citas={citas}
            totalHoy={totalHoy}
            completadasHoy={completadasHoy}
            offline={offline}
            barberos={barberos}
            size={sidebarSize}
            nowMins={nowMins}
          />
        </aside>

        {/* Carrusel — 74% */}
        <main className="flex-1 relative overflow-hidden" onClick={handleCarouselClick}>

          {/* ── YouTube video de fondo (tiene prioridad sobre backgroundUrl) ──
              Se renderiza como iframe con autoplay+mute+loop. Soporta URLs
              de video individual (playlist=videoId hack para loopear un solo
              video) y playlists reales (list=PL...). Silenciado siempre para
              evitar el bloqueo de autoplay con audio de Chrome. */}
          {(() => {
            const url = (youtubeVideoUrl || '').trim();
            if (!url) return null;
            const vMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/))([\w-]{11})/);
            const pMatch = url.match(/[?&]list=([\w-]+)/);
            const videoId    = vMatch?.[1] || '';
            const playlistId = pMatch?.[1] || '';
            if (!videoId && !playlistId) return null;
            const src = playlistId
              ? `https://www.youtube.com/embed/videoseries?list=${playlistId}&autoplay=1&mute=1&loop=1&controls=0&modestbranding=1&rel=0&playsinline=1`
              : `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&controls=0&modestbranding=1&rel=0&playsinline=1&playlist=${videoId}`;
            return (
              <iframe
                src={src}
                title="YouTube background"
                aria-hidden="true"
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ filter: rawVideoBg ? 'none' : 'brightness(0.68) saturate(0.85)', zIndex: 0, border: 0 }}
                allow="autoplay; encrypted-media"
              />
            );
          })()}

          {/* ── Imagen/Video de fondo (solo si NO hay YouTube video de fondo) ── */}
          {!youtubeVideoUrl && backgroundUrl && (
            <>
              {isVideoBg ? (
                <video
                  ref={bgVideoRef}
                  src={backgroundUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="auto"
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
                  style={{ filter: rawVideoBg ? 'none' : 'brightness(0.68) saturate(0.85)', zIndex: 0 }}
                  onEnded={() => { bgVideoRef.current?.load(); bgVideoRef.current?.play(); }}
                />
              ) : (
                <motion.img
                  src={backgroundUrl}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
                  animate={{
                    scale: [1, 1.05, 1.02, 1.06, 1],
                    x: [0, -15, 15, -8, 0],
                    y: [0, 8, -12, 8, 0]
                  }}
                  transition={{
                    duration: 45,
                    ease: 'linear',
                    repeat: Infinity
                  }}
                  style={{ filter: rawVideoBg ? 'none' : 'brightness(0.7) saturate(0.85)', zIndex: 0 }}
                />
              )}
              {!rawVideoBg && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: 'rgba(5,5,5,0.22)', zIndex: 0 }}
                />
              )}
            </>
          )}

          {!rawVideoBg && (
            <div className="absolute inset-0"
              style={{ background: 'radial-gradient(ellipse 100% 80% at 50% 100%, rgba(212,175,55,0.03) 0%, transparent 60%)' }}
            />
          )}

          {/* Slides — Opción C: parallax opacity+scale+x, lazy-mount ─ */}
          {!hideSlideshow && visibleDefs.map((def, i) => {
            const isCurrent  = i === safeSlide;
            const wasVisited = visitedRef.current.has(def.key) || visitedRef.current.has(i);
            if (!isCurrent && !wasVisited) return null;
            return (
              <motion.div
                key={def.key}
                className="absolute inset-0"
                animate={{
                  opacity: isCurrent ? 1 : 0,
                  scale:   isCurrent ? 1 : 1.025,
                  x:       isCurrent ? '0%' : i < safeSlide ? '-3%' : '3%',
                }}
                transition={{ duration: 0.75, ease: [0.4, 0, 0.2, 1] }}
                style={{ pointerEvents: isCurrent ? 'auto' : 'none' }}
              >
                {def.el}
              </motion.div>
            );
          })}

          {!hideSlideshow && (
            <SlideIndicators
              labels={slideLabels}
              active={safeSlide}
              paused={paused}
              onChange={handleSlideChange}
            />
          )}

          {qrConfig.oculto !== true && (
            <QrOverlay qrUrl={qrUrl} qrColor={qrConfig.color} qrSize={qrConfig.size} titulo={qrTitulo} sub={qrSub} />
          )}

          {/* Barra de progreso — Opción B ─────────────────────── */}
          {!hideSlideshow && <SlideProgressBar slideKey={safeSlide} duration={duracion} paused={paused} />}
        </main>

      </div>

      {/* ── Ticker inferior de servicios — Opción B ────────────── */}
      {!hideTicker && (
        <div className="relative z-10">
          <BottomTicker servicios={servicios} />
        </div>
      )}

      {/* Contenedor del reproductor de YouTube (oculto) */}
      <div id="yt-audio-player" className="hidden pointer-events-none absolute w-0 h-0" />

      {/* Botón flotante de audio premium en la esquina inferior izquierda */}
      {ytVideoId && (
        <div className="fixed bottom-16 left-6 z-50">
          <motion.button
            onClick={toggleMute}
            className="flex items-center gap-2.5 px-4.5 py-3 rounded-2xl border text-xs font-extrabold tracking-wider uppercase backdrop-blur-md shadow-2xl transition-all"
            style={{
              background: audioState === 'playing' ? 'rgba(5,5,5,0.72)' : `rgba(212,175,55,0.12)`,
              borderColor: audioState === 'playing' ? 'rgba(255,255,255,0.12)' : `rgba(212,175,55,0.45)`,
              color: audioState === 'playing' ? 'rgba(255,255,255,0.65)' : GOLD,
              boxShadow: audioState === 'playing' ? 'none' : `0 0 25px rgba(212,175,55,0.18)`,
            }}
            animate={audioState !== 'playing' ? {
              scale: [1, 1.05, 1],
              boxShadow: [
                `0 0 15px rgba(212,175,55,0.1)`,
                `0 0 30px rgba(212,175,55,0.3)`,
                `0 0 15px rgba(212,175,55,0.1)`,
              ]
            } : { scale: 1 }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {audioState === 'playing' ? (
              <>
                <Volume2 size={14} className="animate-pulse" />
                <span>Silenciar Música</span>
              </>
            ) : (
              <>
                <VolumeX size={14} />
                <span>Activar Música</span>
              </>
            )}
          </motion.button>
        </div>
      )}

    </div>
  );
}
