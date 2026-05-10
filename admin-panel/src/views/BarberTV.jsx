// BarberTV.jsx — Digital Signage Premium para la barbería
// Ruta: /gestion-interna/tv (sin AdminLayout)
// Deps: framer-motion, qrcode.react  (npm install framer-motion qrcode.react)

import { useState, useEffect, useRef }      from 'react';
import { motion, AnimatePresence }          from 'framer-motion';
import { QRCodeSVG }                        from 'qrcode.react';
import { query, onSnapshot, orderBy, where } from 'firebase/firestore';
import { useTenant }                        from '../contexts/TenantContext';
import { tenantCol }                        from '../lib/tenantUtils';

// ── Constantes ────────────────────────────────────────────────────
const GOLD          = '#D4AF37';
const SLIDE_MS      = 15_000;
const SLIDE_COUNT   = 3;
const RATIOS        = ['4/5', '1/1', '3/4', '4/5', '1/1', '3/4', '4/5', '1/1', '3/4'];

// ── Reloj con fecha ───────────────────────────────────────────────
function DigitalClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);
  const pad  = n => String(n).padStart(2, '0');
  const hora = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const secs = pad(now.getSeconds());
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

// ── Panel de turnos ───────────────────────────────────────────────
function AppointmentPanel({ citas }) {
  const [enSillon, ...siguientes] = citas.slice(0, 4);

  return (
    <div className="h-full flex flex-col p-5 gap-4 overflow-hidden">
      {/* Título */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-1 h-5 rounded-full" style={{ background: GOLD }} />
        <span className="text-[10px] font-black tracking-[0.4em] uppercase text-gray-400">Turnos de Hoy</span>
      </div>

      {/* En Sillón */}
      <div className="shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <motion.span
            className="w-2 h-2 rounded-full"
            style={{ background: GOLD }}
            animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
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
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
              className="rounded-2xl p-4 relative overflow-hidden"
              style={{
                background: 'rgba(212,175,55,0.07)',
                border: `1px solid rgba(212,175,55,0.3)`,
                boxShadow: `0 0 30px rgba(212,175,55,0.08) inset`,
              }}
            >
              {/* shimmer line */}
              <div className="absolute top-0 left-0 right-0 h-px"
                style={{ background: `linear-gradient(to right, transparent, ${GOLD}60, transparent)` }} />

              <p className="text-white font-black text-xl leading-tight truncate">
                {enSillon.clienteNombre || enSillon.nombre}
              </p>
              <p className="text-gray-500 text-xs truncate mt-0.5">
                {enSillon.servicioNombre || enSillon.servicio}
              </p>
              <p className="font-mono font-bold text-lg mt-2" style={{ color: GOLD }}>
                {enSillon.hora}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-2xl p-4 text-center"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <p className="text-gray-600 text-sm font-semibold">Sillón Disponible</p>
              <motion.div
                className="w-2 h-2 rounded-full mx-auto mt-2"
                style={{ background: '#22c55e' }}
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* A continuación — stagger */}
      <div className="flex-1 overflow-hidden">
        <p className="text-[9px] font-black tracking-[0.4em] uppercase text-gray-700 mb-2">
          A continuación
        </p>
        <div className="flex flex-col gap-2.5">
          {siguientes.length === 0 ? (
            <p className="text-gray-800 text-sm text-center mt-4">No hay más turnos</p>
          ) : siguientes.map((c, i) => (
            <motion.div
              key={c.id || i}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1, duration: 0.35 }}
              className="flex items-center gap-3 rounded-xl p-3"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                backdropFilter: 'blur(4px)',
              }}
            >
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                style={{ background: 'rgba(212,175,55,0.1)', color: GOLD, border: `1px solid rgba(212,175,55,0.2)` }}>
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">{c.clienteNombre || c.nombre}</p>
                <p className="text-gray-600 text-xs truncate">{c.servicioNombre || c.servicio}</p>
              </div>
              <p className="font-mono text-xs font-bold shrink-0" style={{ color: GOLD }}>{c.hora}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <p className="text-center text-gray-800 text-[9px] tracking-widest uppercase shrink-0">
        Powered by Synaptech
      </p>
    </div>
  );
}

// ── Slide 1: Publicidad ───────────────────────────────────────────
function SlidePublicidad() {
  return (
    <div className="w-full h-full flex items-center justify-center p-20 relative">
      {/* Fondo con textura */}
      <div className="absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 80% 80% at 30% 60%, rgba(212,175,55,0.06) 0%, transparent 70%),
            radial-gradient(ellipse 60% 60% at 80% 20%, rgba(212,175,55,0.04) 0%, transparent 60%)
          `,
        }}
      />
      {/* Grid texture overlay */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10 text-center max-w-3xl">
        <motion.p
          className="text-[10px] font-black tracking-[0.6em] uppercase mb-6"
          style={{ color: GOLD }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          ✦ &nbsp; Oferta del Mes &nbsp; ✦
        </motion.p>

        <motion.h2
          className="font-black leading-[0.88] mb-8"
          style={{ fontSize: 'clamp(5rem,12vw,9rem)' }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <span className="text-white">Corte</span>
          <br />
          <span
            style={{
              background: `linear-gradient(135deg, ${GOLD} 0%, #FDE047 50%, ${GOLD} 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            + Barba
          </span>
        </motion.h2>

        <motion.p
          className="text-gray-400 text-xl font-light mb-12 leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          Lunes a Miércoles — precio especial<br />para clientes frecuentes del local.
        </motion.p>

        <motion.div
          className="inline-flex items-center gap-3 rounded-full px-10 py-4"
          style={{
            border: `1px solid rgba(212,175,55,0.35)`,
            background: 'rgba(212,175,55,0.05)',
            boxShadow: '0 0 40px rgba(212,175,55,0.1)',
          }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <span className="font-bold text-base tracking-widest" style={{ color: GOLD }}>
            Consulta en caja
          </span>
        </motion.div>
      </div>
    </div>
  );
}

// ── Slide 2: Lookbook ─────────────────────────────────────────────
function SlideLookbook({ photos }) {
  if (!photos.length) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-800">
        <div className="text-center">
          <p className="text-7xl mb-4 opacity-20">📷</p>
          <p className="text-xl">Lookbook en construcción</p>
        </div>
      </div>
    );
  }
  return (
    <div className="w-full h-full flex flex-col p-5 overflow-hidden">
      <motion.p
        className="text-[9px] font-black tracking-[0.6em] uppercase text-center mb-4 shrink-0"
        style={{ color: GOLD }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        ✦ &nbsp; Nuestros Trabajos &nbsp; ✦
      </motion.p>
      <div className="columns-3 gap-3 flex-1 overflow-hidden">
        {photos.slice(0, 9).map((p, i) => (
          <motion.div
            key={p.id || i}
            className="break-inside-avoid rounded-xl overflow-hidden mb-3"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.06 }}
          >
            <img
              src={p.url}
              alt=""
              className="w-full object-cover"
              style={{ aspectRatio: RATIOS[i % RATIOS.length] }}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ── Slide 3: Meet the Team ────────────────────────────────────────
// imageCache: { [barberoId]: resolvedUrl } — pre-cargado en el padre
function SlideEquipo({ barberos, imageCache }) {
  // Máximo 8 miembros; grid adaptativo según cantidad
  const team    = barberos.slice(0, 8);
  const cols    = team.length > 6 ? 'grid-cols-4' : 'grid-cols-3';
  const maxCols = team.length > 6 ? 4 : 3;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-12 relative">
      <div className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(212,175,55,0.04) 0%, transparent 70%)',
        }}
      />
      <motion.p
        className="text-[9px] font-black tracking-[0.6em] uppercase text-center mb-10 relative z-10"
        style={{ color: GOLD }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        ✦ &nbsp; Nuestro Equipo &nbsp; ✦
      </motion.p>

      <div className={`grid ${cols} gap-8 w-full max-w-4xl relative z-10`}>
        {team.map((b, i) => {
          const resolvedUrl = imageCache[b.id] ?? null;
          const initial     = (b.nombre || '?')[0].toUpperCase();

          return (
            <motion.div
              key={b.id || i}
              className="flex flex-col items-center text-center gap-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
            >
              {/*
                Contenedor de tamaño fijo: el avatar (iniciales) siempre ocupa
                el espacio — la foto se superpone encima cuando está lista.
                Esto evita layout shift mientras cargan las imágenes.
              */}
              <div
                className="relative w-28 h-28 rounded-full overflow-hidden shrink-0"
                style={{
                  border:     `2px solid rgba(212,175,55,0.3)`,
                  boxShadow:  `0 0 20px rgba(212,175,55,0.1)`,
                }}
              >
                {/* Capa base: avatar de iniciales (siempre visible) */}
                <div
                  className="absolute inset-0 flex items-center justify-center text-3xl font-black select-none"
                  style={{ background: 'rgba(212,175,55,0.08)', color: GOLD }}
                >
                  {initial}
                </div>

                {/* Foto: se renderiza encima cuando la URL está resuelta.
                    La transición opacity-0 → 1 evita el parpadeo de carga. */}
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
                <p className="text-sm mt-0.5 capitalize" style={{ color: GOLD }}>
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

// ── QR con efecto glow ────────────────────────────────────────────
function QrOverlay({ qrUrl }) {
  return (
    <div className="absolute bottom-6 right-6 z-20">
      <motion.div
        className="rounded-3xl p-5 flex flex-col items-center gap-3 relative overflow-hidden"
        style={{
          background:   'rgba(5,5,5,0.88)',
          backdropFilter: 'blur(16px)',
          border:       `1px solid rgba(212,175,55,0.5)`,
          boxShadow:    `0 0 0 1px rgba(212,175,55,0.1) inset`,
        }}
        animate={{
          boxShadow: [
            '0 0 20px rgba(212,175,55,0.12), 0 0 0 1px rgba(212,175,55,0.1) inset',
            '0 0 45px rgba(212,175,55,0.30), 0 0 0 1px rgba(212,175,55,0.2) inset',
            '0 0 20px rgba(212,175,55,0.12), 0 0 0 1px rgba(212,175,55,0.1) inset',
          ],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Borde interior decorativo */}
        <div className="absolute inset-[3px] rounded-[20px] pointer-events-none"
          style={{ border: `1px solid rgba(212,175,55,0.15)` }} />

        {/* Texto con brillo animado */}
        <div className="relative">
          <motion.span
            className="text-xs font-black tracking-[0.3em] uppercase relative z-10"
            style={{ color: GOLD }}
            animate={{
              textShadow: [
                '0 0 8px rgba(212,175,55,0.3)',
                '0 0 20px rgba(212,175,55,0.8)',
                '0 0 8px rgba(212,175,55,0.3)',
              ],
            }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            ¡Agenda tu hora!
          </motion.span>
        </div>

        <QRCodeSVG
          value={qrUrl}
          size={160}
          fgColor={GOLD}
          bgColor="transparent"
          level="M"
        />

        <p className="text-gray-600 text-[10px] tracking-wide">Escanea con tu cámara</p>
      </motion.div>
    </div>
  );
}

// ── Indicadores de slide mejorados ───────────────────────────────
function SlideIndicators({ count, active, onChange }) {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
      {Array.from({ length: count }).map((_, i) => (
        <button
          key={i}
          onClick={() => onChange(i)}
          className="h-1.5 rounded-full transition-all duration-500 cursor-none"
          style={{
            width:      i === active ? '2rem' : '0.5rem',
            background: i === active
              ? `linear-gradient(to right, ${GOLD}, #FDE047)`
              : 'rgba(255,255,255,0.15)',
            boxShadow:  i === active ? `0 0 8px rgba(212,175,55,0.5)` : 'none',
          }}
        />
      ))}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────
export default function BarberTV() {
  const { id: tenantId, name: tenantName } = useTenant();

  const [citas,      setCitas]      = useState([]);
  const [photos,     setPhotos]     = useState([]);
  const [barberos,   setBarberos]   = useState([]);
  const [slide,      setSlide]      = useState(0);
  // imageCache: { [barberoId]: resolvedUrl }
  // Vive en el padre para sobrevivir el unmount/mount de SlideEquipo en el carrusel
  const [imageCache, setImageCache] = useState({});
  const preloadedRef = useRef(new Set()); // evita crear Image() duplicados

  const qrUrl = `${window.location.origin}/index.html?local=${tenantId}`;

  // Citas de hoy
  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const q = query(
      tenantCol('citas'),
      where('estado', 'in', ['Confirmada', 'confirmada', 'pendiente', 'Pendiente']),
      orderBy('hora', 'asc'),
    );
    return onSnapshot(q, snap => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCitas(docs.filter(c => {
        const f = c.fecha;
        if (!f) return false;
        if (typeof f === 'string') return f.startsWith(todayStr);
        if (f.toDate) return f.toDate().toISOString().startsWith(todayStr);
        return false;
      }));
    });
  }, [tenantId]);

  // Lookbook
  useEffect(() => {
    const q = query(tenantCol('lookbook'), orderBy('order', 'asc'));
    return onSnapshot(q, snap => setPhotos(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [tenantId]);

  // Equipo — excluye docs de enlace UID (_mainDocId) y rol 'admin'
  useEffect(() => {
    const q = query(tenantCol('barberos'), where('activo', '!=', false));
    return onSnapshot(q, snap => {
      setBarberos(
        snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(b => !b._mainDocId && b.rol !== 'admin'),
      );
    });
  }, [tenantId]);

  // ── Caché de URLs de foto (se pobla una sola vez por barbero) ───
  useEffect(() => {
    if (!barberos.length) return;

    setImageCache(prev => {
      const next    = { ...prev };
      let changed   = false;
      barberos.forEach(b => {
        const url = b.foto || b.fotoUrl;
        if (url && !next[b.id]) {
          next[b.id] = url;
          changed    = true;
        }
      });
      return changed ? next : prev;
    });
  }, [barberos]);

  // ── Pre-loader: calienta la caché del navegador ─────────────────
  // Fotos del equipo → se precargan en cuanto llegan de Firestore
  useEffect(() => {
    barberos.forEach(b => {
      const url = b.foto || b.fotoUrl;
      if (url && !preloadedRef.current.has(url)) {
        preloadedRef.current.add(url);
        const img = new Image();
        img.src   = url;
      }
    });
  }, [barberos]);

  // Fotos del lookbook → se precargan cuando el slide de Publicidad está activo
  // (el siguiente slide es Lookbook, así las imágenes ya están en caché)
  useEffect(() => {
    if (slide !== 0) return;
    photos.forEach(p => {
      if (p.url && !preloadedRef.current.has(p.url)) {
        preloadedRef.current.add(p.url);
        const img = new Image();
        img.src   = p.url;
      }
    });
  }, [slide, photos]);

  // Carrusel automático
  useEffect(() => {
    const id = setInterval(() => setSlide(s => (s + 1) % SLIDE_COUNT), SLIDE_MS);
    return () => clearInterval(id);
  }, []);

  const slides = [
    <SlidePublicidad key="pub" />,
    <SlideLookbook   key="look" photos={photos} />,
    <SlideEquipo     key="team" barberos={barberos} imageCache={imageCache} />,
  ];

  return (
    <div
      className="w-screen h-screen overflow-hidden flex flex-col select-none cursor-none"
      style={{ background: '#050505' }}
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <header
        className="flex items-center justify-between px-10 py-5 shrink-0 relative"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
      >
        {/* Shimmer border */}
        <div className="absolute bottom-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(to right, transparent, rgba(212,175,55,0.2), transparent)' }} />

        <div className="flex items-center gap-4">
          <div
            className="relative w-12 h-12 rounded-2xl overflow-hidden"
            style={{ boxShadow: `0 0 20px rgba(212,175,55,0.2), 0 0 0 1px rgba(212,175,55,0.15)` }}
          >
            <img src="/logo.jpg" alt="" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="text-white font-black text-xl tracking-tight leading-none">
              {tenantName}
            </div>
            <div className="text-[9px] tracking-[0.4em] uppercase mt-0.5" style={{ color: GOLD }}>
              Premium Barbershop
            </div>
          </div>
        </div>

        <DigitalClock />
      </header>

      {/* ── Body ───────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Panel turnos — 25% */}
        <aside
          className="w-[25%] overflow-hidden shrink-0"
          style={{ borderRight: '1px solid rgba(255,255,255,0.04)' }}
        >
          <AppointmentPanel citas={citas} />
        </aside>

        {/* Carrusel — 75% */}
        <main className="flex-1 relative overflow-hidden">
          {/* Fondo base con profundidad */}
          <div className="absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse 100% 80% at 50% 100%, rgba(212,175,55,0.03) 0%, transparent 60%)',
            }}
          />

          {/* Slide con blur-out / scale-in transition */}
          <AnimatePresence mode="wait">
            <motion.div
              key={slide}
              className="absolute inset-0"
              initial={{ opacity: 0, filter: 'blur(12px)', scale: 1.02 }}
              animate={{ opacity: 1, filter: 'blur(0px)',  scale: 1    }}
              exit={  { opacity: 0, filter: 'blur(8px)',   scale: 0.99 }}
              transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
            >
              {slides[slide]}
            </motion.div>
          </AnimatePresence>

          {/* Indicadores */}
          <SlideIndicators count={SLIDE_COUNT} active={slide} onChange={setSlide} />

          {/* QR */}
          <QrOverlay qrUrl={qrUrl} />
        </main>
      </div>
    </div>
  );
}
