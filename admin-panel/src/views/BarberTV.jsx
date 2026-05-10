// BarberTV.jsx — Digital Signage / Vista de TV para el local
// Requiere: npm install qrcode.react (en admin-panel/)
// Ruta: /gestion-interna/tv  (renderiza sin AdminLayout)

import { useState, useEffect } from 'react';
import { QRCodeSVG }           from 'qrcode.react';
import { query, onSnapshot, orderBy, where } from 'firebase/firestore';
import { useTenant }           from '../contexts/TenantContext';
import { tenantCol }           from '../lib/tenantUtils';

// ── Reloj digital ────────────────────────────────────────────────
function DigitalClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const pad = n => String(n).padStart(2, '0');
  const h = pad(now.getHours());
  const m = pad(now.getMinutes());
  const s = pad(now.getSeconds());

  return (
    <div className="text-right font-mono leading-none">
      <div className="text-5xl font-black text-white tracking-widest">
        {h}<span className="text-[#D4AF37]">:</span>{m}
      </div>
      <div className="text-base text-gray-600 tracking-widest mt-1">:{s}</div>
    </div>
  );
}

// ── Panel de turnos (25% izquierdo) ──────────────────────────────
function AppointmentPanel({ citas }) {
  const [enSillon, ...siguientes] = citas.slice(0, 4);

  return (
    <div className="h-full flex flex-col p-6 gap-5 overflow-hidden">
      {/* En Sillón */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse" />
          <span className="text-[#D4AF37] text-[10px] font-black tracking-[0.35em] uppercase">
            En Sillón
          </span>
        </div>
        {enSillon ? (
          <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/40 rounded-2xl p-4">
            <div className="text-white text-2xl font-black truncate leading-tight">
              {enSillon.clienteNombre || enSillon.nombre || '—'}
            </div>
            <div className="text-gray-400 text-sm mt-1 truncate">
              {enSillon.servicioNombre || enSillon.servicio || ''}
            </div>
            <div className="text-[#D4AF37] font-mono text-xl font-bold mt-2">
              {enSillon.hora}
            </div>
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center text-gray-600 text-sm">
            Sin turno activo
          </div>
        )}
      </div>

      {/* A continuación */}
      <div className="flex-1 overflow-hidden">
        <div className="text-gray-600 text-[10px] font-black tracking-[0.35em] uppercase mb-3">
          A continuación
        </div>
        <div className="flex flex-col gap-2.5">
          {siguientes.length === 0 ? (
            <div className="text-gray-700 text-sm text-center mt-6">
              No hay más turnos hoy
            </div>
          ) : siguientes.map((c, i) => (
            <div
              key={c.id || i}
              className="flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-xl p-3"
            >
              <div className="w-8 h-8 rounded-full bg-gray-800 text-gray-500 text-sm font-bold flex items-center justify-center shrink-0">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-semibold text-sm truncate">
                  {c.clienteNombre || c.nombre}
                </div>
                <div className="text-gray-600 text-xs truncate">
                  {c.servicioNombre || c.servicio}
                </div>
              </div>
              <div className="text-[#D4AF37] font-mono text-sm font-bold shrink-0">
                {c.hora}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center text-gray-800 text-[10px] tracking-widest uppercase">
        Powered by Synaptech
      </div>
    </div>
  );
}

// ── Slides ────────────────────────────────────────────────────────
function SlidePublicidad() {
  return (
    <div className="w-full h-full flex items-center justify-center p-16 bg-gradient-to-br from-gray-950 via-[#0a0a0a] to-gray-950">
      <div className="text-center max-w-2xl">
        <div className="text-[#D4AF37] text-xs font-black tracking-[0.5em] uppercase mb-8">
          ✦ &nbsp; Oferta del Mes &nbsp; ✦
        </div>
        <h2 className="text-white font-black leading-[0.9] mb-8" style={{ fontSize: 'clamp(4rem,9vw,7rem)' }}>
          Corte&nbsp;+<br />
          <span className="text-[#D4AF37]">Barba</span>
        </h2>
        <p className="text-gray-400 text-xl font-light mb-12 leading-relaxed">
          Lunes a Miércoles — precio especial<br />
          para clientes frecuentes del local.
        </p>
        <div className="inline-flex items-center gap-3 border border-[#D4AF37]/40 rounded-full px-8 py-3.5 bg-[#D4AF37]/5">
          <span className="text-[#D4AF37] font-bold text-base tracking-widest">
            Consulta en caja
          </span>
        </div>
      </div>
    </div>
  );
}

function SlideLookbook({ photos }) {
  if (!photos.length) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-800">
        <div className="text-center">
          <div className="text-7xl mb-4 opacity-30">📷</div>
          <div className="text-xl text-gray-700">Lookbook en construcción</div>
        </div>
      </div>
    );
  }
  const RATIOS = ['4/5', '1/1', '3/4', '4/5', '1/1', '3/4', '4/5', '1/1', '3/4'];
  return (
    <div className="w-full h-full flex flex-col p-6 overflow-hidden">
      <div className="text-[#D4AF37] text-[10px] font-black tracking-[0.5em] uppercase mb-4 text-center">
        ✦ &nbsp; Nuestros Trabajos &nbsp; ✦
      </div>
      <div className="columns-3 gap-3 flex-1 overflow-hidden">
        {photos.slice(0, 9).map((p, i) => (
          <div key={p.id || i} className="break-inside-avoid rounded-xl overflow-hidden mb-3">
            <img
              src={p.url}
              alt=""
              className="w-full object-cover"
              style={{ aspectRatio: RATIOS[i % RATIOS.length] }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function SlideEquipo({ barberos }) {
  const team = barberos.slice(0, 6);
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-12">
      <div className="text-[#D4AF37] text-[10px] font-black tracking-[0.5em] uppercase mb-12 text-center">
        ✦ &nbsp; Nuestro Equipo &nbsp; ✦
      </div>
      <div className="grid grid-cols-3 gap-10 w-full max-w-3xl">
        {team.map((b, i) => (
          <div key={b.id || i} className="flex flex-col items-center text-center gap-3">
            <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-[#D4AF37]/30 bg-gray-900">
              {b.foto || b.fotoUrl ? (
                <img
                  src={b.foto || b.fotoUrl}
                  alt={b.nombre}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl font-black text-[#D4AF37] bg-[#D4AF37]/5">
                  {(b.nombre || '?')[0].toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <div className="text-white font-bold text-lg leading-tight">{b.nombre}</div>
              <div className="text-[#D4AF37] text-sm mt-0.5">
                {b.especialidad || b.rol || 'Barbero'}
              </div>
            </div>
          </div>
        ))}
        {team.length === 0 && (
          <div className="col-span-3 text-gray-700 text-center">
            Sin datos de equipo
          </div>
        )}
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────
const SLIDE_COUNT    = 3;
const SLIDE_INTERVAL = 15_000; // 15 segundos

export default function BarberTV() {
  const { id: tenantId, name: tenantName } = useTenant();

  const [citas,    setCitas]    = useState([]);
  const [photos,   setPhotos]   = useState([]);
  const [barberos, setBarberos] = useState([]);
  const [slide,    setSlide]    = useState(0);
  const [visible,  setVisible]  = useState(true);

  const qrUrl = `${window.location.origin}/index.html?local=${tenantId}`;

  // Citas de hoy, ordenadas por hora
  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'

    const q = query(
      tenantCol('citas'),
      where('estado', 'in', ['confirmada', 'pendiente']),
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

  // Fotos del lookbook
  useEffect(() => {
    const q = query(tenantCol('lookbook'), orderBy('order', 'asc'));
    return onSnapshot(q, snap => {
      setPhotos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [tenantId]);

  // Equipo (excluye docs de enlace UID)
  useEffect(() => {
    const q = query(tenantCol('barberos'), where('activo', '!=', false));
    return onSnapshot(q, snap => {
      setBarberos(
        snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(b => !b._mainDocId),
      );
    });
  }, [tenantId]);

  // Carrusel automático con cross-fade
  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setSlide(s => (s + 1) % SLIDE_COUNT);
        setVisible(true);
      }, 700);
    }, SLIDE_INTERVAL);
    return () => clearInterval(id);
  }, []);

  const slides = [
    <SlidePublicidad key="pub" />,
    <SlideLookbook   key="look" photos={photos} />,
    <SlideEquipo     key="team" barberos={barberos} />,
  ];

  return (
    <div className="w-screen h-screen bg-black overflow-hidden flex flex-col select-none cursor-none">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-10 py-5 border-b border-gray-900 shrink-0">
        <div className="flex items-center gap-4">
          <img src="/logo.jpg" alt="" className="h-12 w-12 rounded-xl object-cover" />
          <div>
            <div className="text-white font-black text-xl tracking-tight leading-none">
              {tenantName}
            </div>
            <div className="text-[#D4AF37] text-[10px] tracking-[0.35em] uppercase mt-0.5">
              Premium Barbershop
            </div>
          </div>
        </div>
        <DigitalClock />
      </header>

      {/* ── Body ───────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Panel izquierdo — turnos */}
        <aside className="w-[25%] border-r border-gray-900 overflow-hidden shrink-0">
          <AppointmentPanel citas={citas} />
        </aside>

        {/* Área principal — carrusel */}
        <main className="flex-1 relative overflow-hidden">
          {/* Slide activo con fade */}
          <div
            className="absolute inset-0 transition-opacity duration-700 ease-in-out"
            style={{ opacity: visible ? 1 : 0 }}
          >
            {slides[slide]}
          </div>

          {/* Indicadores de slide */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
              <button
                key={i}
                onClick={() => { setSlide(i); setVisible(true); }}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-none ${
                  i === slide ? 'w-8 bg-[#D4AF37]' : 'w-2 bg-gray-800'
                }`}
              />
            ))}
          </div>

          {/* QR Code — esquina inferior derecha */}
          <div className="absolute bottom-6 right-6 z-20" style={{ animation: 'qr-glow 3s ease-in-out infinite' }}>
            <div className="
              bg-gray-950/85 backdrop-blur-md
              border border-[#D4AF37]/50
              rounded-2xl p-4
              flex flex-col items-center gap-3
              shadow-[0_0_40px_rgba(212,175,55,0.12)]
            ">
              <span className="text-[#D4AF37] font-black text-sm tracking-[0.2em] uppercase">
                ¡Agenda tu hora!
              </span>
              <QRCodeSVG
                value={qrUrl}
                size={170}
                fgColor="#D4AF37"
                bgColor="transparent"
                level="M"
              />
              <span className="text-gray-600 text-xs tracking-wide">
                Escanea con tu cámara
              </span>
            </div>
          </div>
        </main>
      </div>

      <style>{`
        @keyframes qr-glow {
          0%, 100% { filter: drop-shadow(0 0 6px rgba(212,175,55,0.15)); }
          50%       { filter: drop-shadow(0 0 18px rgba(212,175,55,0.40)); }
        }
      `}</style>
    </div>
  );
}
