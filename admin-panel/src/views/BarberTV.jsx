// BarberTV.jsx — Digital Signage Premium para la barbería
// Ruta: /gestion-interna/tv (sin AdminLayout)

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence }                  from 'framer-motion';
import { QRCodeSVG }                                from 'qrcode.react';
import { query, getDocs, onSnapshot, where, orderBy } from 'firebase/firestore';
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

// ── Partículas flotantes (posiciones deterministas) ───────────────
const PARTICLE_DATA = Array.from({ length: 22 }, (_, i) => ({
  id:    i,
  x:     ((i * 23 + 7)  % 90) + 5,
  y:     ((i * 37 + 11) % 85) + 5,
  size:  1 + (i % 3) * 0.8,
  dur:   10 + (i % 7) * 2.5,
  delay: (i * 1.7) % 9,
  rise:  30 + (i % 25),
}));

function FloatingParticles() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {PARTICLE_DATA.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, background: GOLD }}
          animate={{ y: [0, -p.rise, 0], opacity: [0, 0.45, 0], scale: [0.5, 1.2, 0.5] }}
          transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

// ── Barra de progreso del slide ───────────────────────────────────
function SlideProgressBar({ slideKey, duration, paused }) {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    setPct(0);
    if (paused) return;
    const start = Date.now();
    const id = setInterval(() => {
      setPct(Math.min(((Date.now() - start) / duration) * 100, 100));
    }, 80);
    return () => clearInterval(id);
  }, [slideKey, paused, duration]);

  return (
    <div className="absolute bottom-0 left-0 right-0 h-[2px] z-20" style={{ background: 'rgba(255,255,255,0.04)' }}>
      <div style={{
        height: '100%',
        width: `${pct}%`,
        background: `linear-gradient(to right, ${GOLD}77, ${GOLD})`,
        boxShadow: `0 0 6px rgba(212,175,55,0.45)`,
      }} />
    </div>
  );
}

// ── Ticker inferior de servicios ──────────────────────────────────
function BottomTicker({ servicios }) {
  const ref = useRef(null);
  const [offset, setOffset] = useState(null);

  const items  = servicios.filter(s => s.nombre && s.activo !== false);
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
function DigitalClock() {
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
        <span className="font-mono font-black text-white leading-none" style={{ fontSize: 'clamp(2.5rem,5vw,4rem)' }}>
          {hora}
        </span>
        <motion.span
          className="font-mono font-black leading-none pb-1"
          style={{ fontSize: 'clamp(1.25rem,2.5vw,2rem)', color: GOLD }}
          animate={{ opacity: [1, 0.2, 1] }}
          transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
        >
          :{secs}
        </motion.span>
      </div>
      <p className="text-gray-500 text-sm tracking-wide capitalize mt-1">{fecha}</p>
    </div>
  );
}

// ── Panel de turnos (Opción A) ────────────────────────────────────
function AppointmentPanel({ citas, totalHoy, completadasHoy, offline, barberos = [], size = 'md' }) {
  const [enSillon, ...siguientes] = citas.slice(0, size === 'sm' ? 4 : 5);

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
            <p className={`font-black ${statsNumSize} text-white leading-none`}>{totalHoy}</p>
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
                En Sillón
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
                          <span className="text-xs sm:text-sm font-black truncate text-white leading-tight">
                            {name}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  <p className={`text-white font-black ${sillonTextSize} leading-tight truncate`}>
                    {enSillon.clienteNombre || enSillon.nombre}
                  </p>
                  <p className="text-gray-500 text-xs truncate mt-0.5">
                    {enSillon.servicioNombre || enSillon.servicio}
                  </p>
                  <p className="font-mono font-bold text-xl mt-2" style={{ color: GOLD }}>
                    {enSillon.hora}
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="empty-sillon"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-2xl p-4 flex items-center justify-between"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <p className="text-gray-600 text-sm font-semibold">Sillón Disponible</p>
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
                      <p className={`text-white font-semibold ${nextItemText} truncate`}>
                        {c.clienteNombre || c.nombre}
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
          <span className="text-white">{o.titulo1}</span>
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

  return (
    <div className="w-full h-full relative overflow-hidden">
      {photos.map((photo, i) => (
        <motion.div
          key={photo.id || photo.url || i}
          className="absolute inset-0"
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
      ))}

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
function SlideEquipo({ barberos, imageCache, skipAnimation }) {
  const team = barberos.slice(0, 8);
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
              style={{
                background: 'rgba(255,255,255,0.02)',
                border:     '1px solid rgba(212,175,55,0.1)',
                boxShadow:  '0 4px 24px rgba(0,0,0,0.25)',
              }}
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
                <p className="text-white font-bold text-base leading-tight">{b.nombre}</p>
                <p className="text-sm mt-1 capitalize" style={{ color: GOLD }}>
                  {b.especialidad || (b.rol === 'jefe' ? 'Jefe de Sala' : 'Barbero')}
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
function SlideProductos({ productos, skipAnimation }) {
  const visible = productos.slice(0, 8);
  const cols    = visible.length > 6 ? 'grid-cols-4' : 'grid-cols-3';

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
              style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid rgba(212,175,55,0.15)`, boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}
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
                <p className="text-white font-bold text-sm leading-tight truncate">{p.nombre}</p>
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
  const visible = marcas.filter(m => m.activo !== false).slice(0, 12);
  const cols = visible.length > 8 ? 'grid-cols-4' : (visible.length > 4 ? 'grid-cols-3' : 'grid-cols-2');

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

      <div className={`grid ${cols} gap-8 w-full max-w-5xl relative z-10`}>
        {visible.map((m, i) => (
          <motion.div
            key={m.id || i}
            className="flex flex-col items-center justify-center rounded-2xl overflow-hidden p-6"
            style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid rgba(212,175,55,0.1)`, boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}
            initial={skipAnimation ? false : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={skipAnimation ? {} : { delay: i * 0.08, duration: 0.4 }}
          >
            <div className="w-full h-24 flex items-center justify-center mb-4">
              {m.logoUrl ? (
                <img src={m.logoUrl} alt={m.nombre} className="max-w-full max-h-full object-contain" style={{ filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.1))' }} />
              ) : (
                <span className="text-4xl opacity-20">🏆</span>
              )}
            </div>
            <p className="text-white font-bold text-sm tracking-wide text-center uppercase">{m.nombre}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ── QR overlay ────────────────────────────────────────────────────
function QrOverlay({ qrUrl, qrColor, qrSize }) {
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
          ¡Únete al Club!
        </motion.span>

        <QRCodeSVG value={qrUrl} size={size} fgColor={color} bgColor="transparent" level="M" />
        <p className="text-gray-600 text-[10px] tracking-wide">Escanea y regístrate gratis</p>
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
  const [slidesActivos,  setSlidesActivos]  = useState({ oferta: true, lookbook: true, equipo: true, productos: true, marcas: true });
  const [accentColor,    setAccentColor]    = useState('');
  const [qrConfig,       setQrConfig]       = useState({ color: '', size: 160 });
  const [backgroundUrl,  setBackgroundUrl]  = useState('');
  const [youtubeUrl,     setYoutubeUrl]     = useState('');
  const [ytPlayer,       setYtPlayer]       = useState(null);
  const [audioState,     setAudioState]     = useState('paused'); // 'paused', 'playing', 'blocked'
  const [hideSlideshow,  setHideSlideshow]  = useState(false);
  const [rawVideoBg,     setRawVideoBg]     = useState(false);
  const [sidebarSize,    setSidebarSize]    = useState('md');
  const [hideHeader,     setHideHeader]     = useState(false);
  const [hideTicker,     setHideTicker]     = useState(false);

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

  const preloadedRef   = useRef(new Set());
  const activeCountRef = useRef(4);
  const visitedRef     = useRef(new Set([0]));
  const qrUrl = `${window.location.origin}/registro.html?local=${tenantId}`;

  useEffect(() => { visitedRef.current.add(slide); }, [slide]);

  // Citas de hoy — carga TODAS para contar completadas + filtra activas en cliente
  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const ACTIVE   = new Set(['Confirmada', 'confirmada', 'pendiente', 'Pendiente']);
    const q = query(tenantCol('citas'), where('fecha', '==', todayStr));
    return onSnapshot(q, snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
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
  }, [tenantId]);

  // Lookbook
  useEffect(() => {
    getDocs(query(tenantCol('lookbook'), orderBy('order', 'asc')))
      .then(snap => setPhotos(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(() => {});
  }, [tenantId]);

  // Equipo
  useEffect(() => {
    getDocs(query(tenantCol('barberos'), where('activo', '!=', false)))
      .then(snap => setBarberos(
        snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(b => !b._mainDocId && b.rol !== 'admin'),
      ))
      .catch(() => {});
  }, [tenantId]);

  // Servicios — para el ticker inferior
  useEffect(() => {
    getDocs(query(tenantCol('servicios'), orderBy('orden', 'asc')))
      .then(snap => setServicios(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(() => {});
  }, [tenantId]);

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
      setBackgroundUrl(d.backgroundUrl || '');
      setYoutubeUrl(d.youtubeUrl || '');
      setHideSlideshow(d.hideSlideshow === true);
      setRawVideoBg(d.rawVideoBg === true);
      setSidebarSize(d.sidebarSize || 'md');
      setHideHeader(d.hideHeader === true);
      setHideTicker(d.hideTicker === true);
    }, () => {});
  }, [tenantId]);

  // Productos
  useEffect(() => {
    getDocs(query(tenantCol('productos'), orderBy('createdAt', 'asc')))
      .then(snap => setProductos(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(() => {});
  }, [tenantId]);

  // Marcas (Solo Elegance)
  useEffect(() => {
    if (tenantId !== 'elegance') return;
    getDocs(query(tenantCol('publicidad_tv'), orderBy('createdAt', 'asc')))
      .then(snap => setMarcas(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(() => {});
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

  const ALL_DEFS = [
    { key: 'oferta',    label: 'Oferta',    el: <SlidePublicidad key="pub"  oferta={oferta} /> },
    { key: 'lookbook',  label: 'Trabajos',  el: <SlideLookbook   key="look" photos={photos} /> },
    { key: 'equipo',    label: 'Equipo',    el: <SlideEquipo     key="team" barberos={barberos} imageCache={imageCache} skipAnimation={visitedRef.current.has(2)} /> },
    { key: 'productos', label: 'Productos', el: <SlideProductos  key="prod" productos={productos} skipAnimation={visitedRef.current.has(3)} /> },
  ];
  if (tenantId === 'elegance') {
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
      {/* ── Imagen de fondo ────────────────────────────────────── */}
      {/* ── Imagen/Video de fondo ────────────────────────────────────── */}
      {backgroundUrl && (
        <>
          {isVideoBg ? (
            <video
              src={backgroundUrl}
              autoPlay
              loop
              muted
              playsInline
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
              style={{ filter: rawVideoBg ? 'none' : 'brightness(0.68) saturate(0.85)', zIndex: 0 }}
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

      {/* ── Header ─────────────────────────────────────────────── */}
      {!hideHeader && (
        <header
          className="flex items-center justify-between px-10 py-5 shrink-0 relative z-10"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
        >
          <div className="absolute bottom-0 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(to right, transparent, rgba(212,175,55,0.2), transparent)' }} />

          <div className="flex items-center gap-4">
            <div
              className="relative w-12 h-12 rounded-2xl overflow-hidden"
              style={{ boxShadow: `0 0 20px rgba(212,175,55,0.2), 0 0 0 1px rgba(212,175,55,0.15)` }}
            >
              <img src={tenantLogo || '/logo.jpg'} alt={tenantName} className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="text-white font-black text-xl tracking-tight leading-none">{tenantName}</div>
              <div className="text-[9px] tracking-[0.4em] uppercase mt-0.5" style={{ color: GOLD }}>
                Premium Barbershop
              </div>
            </div>
          </div>

          <DigitalClock />
        </header>
      )}

      {/* ── Body ───────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative z-10">

        {/* Panel turnos — 26% (Configurable size) */}
        <aside
          className="overflow-hidden shrink-0 transition-all duration-300"
          style={{
            width: sidebarSize === 'sm' ? '20%' : sidebarSize === 'lg' ? '32%' : '26%',
            borderRight: '1px solid rgba(255,255,255,0.04)',
          }}
        >
          <AppointmentPanel
            citas={citas}
            totalHoy={totalHoy}
            completadasHoy={completadasHoy}
            offline={offline}
            barberos={barberos}
            size={sidebarSize}
          />
        </aside>

        {/* Carrusel — 74% */}
        <main className="flex-1 relative overflow-hidden" onClick={handleCarouselClick}>
          {!rawVideoBg && (
            <div className="absolute inset-0"
              style={{ background: 'radial-gradient(ellipse 100% 80% at 50% 100%, rgba(212,175,55,0.03) 0%, transparent 60%)' }}
            />
          )}

          {/* Slides — Opción C: parallax opacity+scale+x ─────── */}
          {!hideSlideshow && visibleDefs.map((def, i) => {
            const isCurrent = i === safeSlide;
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

          <QrOverlay qrUrl={qrUrl} qrColor={qrConfig.color} qrSize={qrConfig.size} />

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
