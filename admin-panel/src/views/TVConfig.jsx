// TVConfig.jsx — Gestión de la pantalla /gestion-interna/tv
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Monitor, ExternalLink, Save, Check, ChevronRight,
  AlertCircle, Eye, Palette, Images, Users, Megaphone, ShoppingBag, QrCode,
  ImagePlus, Trash2, Upload, Music,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { getDoc, setDoc, getDocs, query, where, doc, deleteDoc } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { tenantDoc, tenantCol, resolveTenantId } from '../lib/tenantUtils';

/* ── Compresión de imagen vía canvas ─────────────────────────────── */
async function compressImage(file, { maxPx = 1280, quality = 0.7 } = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxPx || height > maxPx) {
        const ratio = Math.min(maxPx / width, maxPx / height);
        width  = Math.round(width  * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('Compresión fallida')),
        'image/jpeg',
        quality,
      );
    };
    img.onerror = reject;
    img.src = url;
  });
}

// Debe coincidir con OFERTA_DEFAULT en BarberTV.jsx
const OFERTA_DEFAULT = {
  etiqueta:    'Oferta del Mes',
  titulo1:     'Corte',
  titulo2:     '+ Barba',
  descripcion: 'Lunes a Miércoles — precio especial\npara clientes frecuentes del local.',
  cta:         'Consulta en caja',
};

const CONFIG_DEFAULT = {
  oferta:        { ...OFERTA_DEFAULT },
  duracionSlide: 15,
  slidesActivos: { oferta: true, lookbook: true, equipo: true, productos: true },
  accentColor:   '',
  qr:            { color: '', size: 160 },
  youtubeUrl:    '',
  hideSlideshow: false,
  rawVideoBg:    false,
  sidebarSize:   'md',
  hideHeader:    false,
  hideTicker:    false,
};

const QR_SIZE_STEPS = [100, 120, 140, 160, 180, 200, 220, 240];

const ACCENT_PRESETS = [
  { label: 'Dorado',    value: '#D4AF37' },
  { label: 'Blanco',    value: '#e2e8f0' },
  { label: 'Azul neon', value: '#00C8FF' },
  { label: 'Esmeralda', value: '#10b981' },
  { label: 'Rosa',      value: '#f43f5e' },
  { label: 'Naranja',   value: '#f97316' },
  { label: 'Violeta',   value: '#a855f7' },
];

// ── Sub-componentes ───────────────────────────────────────────────

function Card({ icon: Icon, title, badge, children }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-800 bg-slate-800/30">
        <Icon size={15} className="text-slate-400 shrink-0" />
        <h2 className="text-sm font-semibold text-white flex-1">{title}</h2>
        {badge}
      </div>
      <div className="px-5 py-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, hint, charCount, charMax, children }) {
  const isOver = charCount !== undefined && charMax !== undefined && charCount > charMax;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
          {label}
        </label>
        {charCount !== undefined && charMax !== undefined && (
          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded transition-colors ${
            isOver ? 'bg-red-950 text-red-400 border border-red-900/50' : 'text-slate-500 bg-slate-800/40 border border-slate-800'
          }`}>
            {charCount}/{charMax}
          </span>
        )}
      </div>
      {children}
      {isOver && (
        <p className="text-[10px] text-red-400 font-medium mt-1 flex items-center gap-1">
          <AlertCircle size={10} className="shrink-0" />
          Recomendado máximo {charMax} caracteres para evitar cortes en la TV.
        </p>
      )}
      {hint && !isOver && <p className="text-xs text-slate-600 mt-1">{hint}</p>}
    </div>
  );
}

function SlideToggle({ checked, onChange, label, sublabel }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border transition-all text-left"
      style={{
        background:  checked ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.02)',
        borderColor: checked ? 'rgba(16,185,129,0.3)'  : 'rgba(255,255,255,0.07)',
      }}
    >
      <div
        className="w-9 h-5 rounded-full relative shrink-0 transition-colors duration-200"
        style={{ background: checked ? '#10b981' : '#334155' }}
      >
        <div
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200"
          style={{ left: checked ? '18px' : '2px' }}
        />
      </div>
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        {sublabel && <p className="text-xs text-slate-500 mt-0.5">{sublabel}</p>}
      </div>
    </button>
  );
}

function StatusBadge({ active }) {
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
      active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-700 text-slate-500'
    }`}>
      {active ? 'Activo' : 'Inactivo'}
    </span>
  );
}

// Vista previa a escala del slide de anuncio
function AnuncioPreview({ oferta, accentColor }) {
  const gold = accentColor || '#D4AF37';
  const o    = { ...OFERTA_DEFAULT, ...oferta };
  return (
    <div
      className="rounded-xl overflow-hidden relative w-full"
      style={{ background: '#050505', aspectRatio: '16/7' }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(ellipse 80% 80% at 30% 60%, ${gold}12 0%, transparent 70%)`,
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className="text-center">
          <p
            className="font-black tracking-[0.4em] uppercase mb-2"
            style={{ color: gold, fontSize: '8px' }}
          >
            ✦ {o.etiqueta} ✦
          </p>
          <p
            className="font-black text-white leading-tight"
            style={{ fontSize: 'clamp(1.1rem, 2.8vw, 1.8rem)' }}
          >
            {o.titulo1}
          </p>
          <p
            className="font-black leading-tight mb-2"
            style={{
              fontSize: 'clamp(1.1rem, 2.8vw, 1.8rem)',
              color: gold,
            }}
          >
            {o.titulo2}
          </p>
          <p className="text-slate-500 leading-relaxed mb-3" style={{ fontSize: '8px' }}>
            {o.descripcion.split('\n').map((line, i, arr) => (
              <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
            ))}
          </p>
          <div
            className="inline-flex items-center rounded-full px-3 py-1"
            style={{ border: `1px solid ${gold}55`, background: `${gold}12` }}
          >
            <span className="font-bold tracking-widest" style={{ color: gold, fontSize: '8px' }}>
              {o.cta}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Datos Simulados para la Vista Previa de TV ───────────────────
const SIM_CITAS = [
  { id: '1', clienteNombre: 'Matías Orozco', barberoNombre: 'Claudio', servicioNombre: 'Degradado + Barba', hora: '15:15' },
  { id: '2', clienteNombre: 'Ignacio Pérez', barberoNombre: 'Sebastián', servicioNombre: 'Perfilado de Cejas', hora: '15:45' },
  { id: '3', clienteNombre: 'Felipe Gómez', barberoNombre: 'Claudio', servicioNombre: 'Corte Clásico', hora: '16:15' },
];

const SIM_BARBEROS = [
  { id: 'b1', nombre: 'Claudio', specialty: 'Jefe de Sala', foto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80' },
  { id: 'b2', nombre: 'Sebastián', specialty: 'Experto en Barba', foto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80' },
  { id: 'b3', nombre: 'Javier', specialty: 'Cortes Modernos', foto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&q=80' },
];

const SIM_LOOKBOOK = [
  { id: 'l1', url: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400&q=80' },
  { id: 'l2', url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&q=80' },
  { id: 'l3', url: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=400&q=80' },
];

const SIM_PRODUCTOS = [
  { id: 'p1', nombre: 'Pomada Premium Matte', precio: '12500', stock: 15, imagen: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=300&q=80' },
  { id: 'p2', nombre: 'Aceite Orgánico Barba', precio: '14900', stock: 8, imagen: 'https://images.unsplash.com/photo-1608248597481-496100c80836?w=300&q=80' },
  { id: 'p3', nombre: 'Shampú Purificante', precio: '8900', stock: 0, imagen: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=300&q=80' },
];

const SIM_MARCAS = [
  { id: 'm1', nombre: 'Wahl Pro', logoUrl: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=150&q=80' },
  { id: 'm2', nombre: 'Reuzel Pomade', logoUrl: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=150&q=80' },
];

function TVSimulator({ config, bgUrl, tenantId }) {
  const [activeTab, setActiveTab] = useState('oferta');
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const pad = n => String(n).padStart(2, '0');
  const clockText = `${pad(time.getHours())}:${pad(time.getMinutes())}:${pad(time.getSeconds())}`;
  const dateText = time.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' });

  const gold = config.accentColor || '#D4AF37';
  const qrColor = config.qr.color || gold;
  const qrSize = config.qr.size || 160;

  const o = { ...OFERTA_DEFAULT, ...config.oferta };

  const isTabActive = (tabId) => {
    if (tabId === 'marcas') return config.slidesActivos.marcas ?? true;
    return config.slidesActivos[tabId] !== false;
  };

  const isVideoBg = bgUrl && (
    bgUrl.includes('.mp4') ||
    bgUrl.includes('.webm') ||
    bgUrl.includes('.mov') ||
    bgUrl.split('?')[0].endsWith('.mp4') ||
    bgUrl.split('?')[0].endsWith('.webm')
  );

  const tabs = [
    { id: 'oferta', label: 'Oferta' },
    { id: 'lookbook', label: 'Trabajos' },
    { id: 'equipo', label: 'Equipo' },
    { id: 'productos', label: 'Productos' },
    ...(tenantId === 'elegance' ? [{ id: 'marcas', label: 'Marcas' }] : []),
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes kb-pan-zoom {
          0% { transform: scale(1.02) translate(0px, 0px); }
          50% { transform: scale(1.08) translate(-4px, -2px); }
          100% { transform: scale(1.02) translate(0px, 0px); }
        }
        @keyframes sim-glow-pulse {
          0% { border-color: ${gold}40; box-shadow: 0 0 6px ${gold}15 inset, 0 0 0px ${gold}0; }
          50% { border-color: ${gold}; box-shadow: 0 0 10px ${gold}35 inset, 0 0 8px ${gold}25; }
          100% { border-color: ${gold}40; box-shadow: 0 0 6px ${gold}15 inset, 0 0 0px ${gold}0; }
        }
        @keyframes sim-qr-glow {
          0% { box-shadow: 0 0 8px ${qrColor}15; border-color: ${qrColor}40; }
          50% { box-shadow: 0 0 18px ${qrColor}35; border-color: ${qrColor}; }
          100% { box-shadow: 0 0 8px ${qrColor}15; border-color: ${qrColor}40; }
        }
        @keyframes sim-ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}} />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-bold text-slate-300">Simulador de Pantalla (16:9)</span>
        </div>
        <span className="text-[10px] text-slate-500 font-medium">Miniatura Interactiva</span>
      </div>

      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-[#050505] border-4 border-slate-950 shadow-2xl flex flex-col select-none">
        
        {bgUrl ? (
          <>
            {isVideoBg ? (
              <video
                src={bgUrl}
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                style={{
                  filter: config.rawVideoBg ? 'none' : 'brightness(0.24) saturate(0.6)',
                  zIndex: 0
                }}
              />
            ) : (
              <img
                src={bgUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                style={{
                  filter: config.rawVideoBg ? 'none' : 'brightness(0.24) saturate(0.6)',
                  animation: 'kb-pan-zoom 40s infinite ease-in-out',
                  zIndex: 0
                }}
              />
            )}
            {!config.rawVideoBg && <div className="absolute inset-0 bg-black/45" style={{ zIndex: 0 }} />}
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900 to-slate-950" style={{ zIndex: 0 }} />
        )}

        {/* ── HEADER SIMULADO ── */}
        {!config.hideHeader && (
          <header className="h-[12%] border-b border-white/5 bg-black/35 backdrop-blur-[2px] flex items-center justify-between px-3 shrink-0 relative z-10">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-md overflow-hidden bg-slate-800 border border-white/10 shrink-0">
              <span className="text-[6px] font-black text-white flex items-center justify-center h-full">B</span>
            </div>
            <div>
              <div className="text-white font-extrabold text-[7.5px] tracking-tight leading-none">
                {tenantId === 'elegance' ? 'Barber Elegance' : 'Barber Ferraza'}
              </div>
              <div className="text-[4px] font-bold tracking-[0.25em] uppercase mt-0.5" style={{ color: gold }}>
                Premium Signage
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[8px] font-mono font-black text-white leading-none">
              {clockText}
            </div>
            <div className="text-[5px] text-slate-500 font-medium tracking-wide uppercase mt-0.5">
              {dateText}
            </div>
          </div>
        </header>
        )}

        {/* ── BODY SIMULADO ── */}
        <div className="flex-1 flex min-h-0 relative z-10 overflow-hidden">
          
          <aside
            className="border-r border-white/5 bg-black/25 flex flex-col justify-between py-1.5 px-2 shrink-0 transition-all"
            style={{
              width: config.sidebarSize === 'sm' ? '20%' : config.sidebarSize === 'lg' ? '32%' : '26%'
            }}
          >
            <div>
              <div className="flex items-center gap-1 mb-1">
                <div className="w-0.5 h-2 rounded-full" style={{ background: gold }} />
                <span className="text-[5px] font-black tracking-widest uppercase text-slate-400">Hoy</span>
              </div>
              <div className="grid grid-cols-2 gap-1 mb-1.5">
                <div className="bg-white/[0.02] border border-white/5 rounded p-0.5 text-center">
                  <p className="font-extrabold text-[8px] text-white leading-none">12</p>
                  <p className="text-[3.5px] text-slate-500 uppercase tracking-wider">Total</p>
                </div>
                <div className="bg-emerald-500/[0.02] border border-emerald-500/10 rounded p-0.5 text-center">
                  <p className="font-extrabold text-[8px] text-emerald-400 leading-none">8</p>
                  <p className="text-[3.5px] text-slate-500 uppercase tracking-wider">Listas</p>
                </div>
              </div>

              <div className="mb-1.5">
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[4.5px] font-bold uppercase tracking-wider text-slate-500">En Sillón</span>
                </div>
                <div 
                  className="rounded p-1 relative overflow-hidden bg-white/[0.02] border border-white/5"
                  style={{ animation: 'sim-glow-pulse 3s infinite ease-in-out' }}
                >
                  <div className="flex items-center gap-1 mb-1">
                    <div className="w-3 h-3 rounded-full bg-slate-700 flex items-center justify-center text-[5px] font-black text-white shrink-0 overflow-hidden">
                      <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&q=80" alt="" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[4px] font-bold text-slate-400 truncate">Claudio</span>
                  </div>
                  <p className="text-white font-extrabold text-[7px] leading-tight truncate">Matías Orozco</p>
                  <p className="text-slate-500 text-[5px] truncate">Degradado + Barba</p>
                  <p className="font-mono text-[7px] font-bold mt-0.5 text-right" style={{ color: gold }}>15:15</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-[4.5px] font-black tracking-widest text-slate-500 uppercase mb-0.5">Siguientes</p>
              <div className="space-y-0.5">
                {SIM_CITAS.slice(1, 3).map((c) => (
                  <div key={c.id} className="bg-white/[0.01] border border-white/5 rounded px-1 py-0.5 flex items-center justify-between gap-1">
                    <div className="min-w-0 flex-1">
                      <p className="text-white font-bold text-[5.5px] truncate leading-tight">{c.clienteNombre}</p>
                      <p className="text-slate-500 text-[4px] truncate leading-none mt-0.5">{c.servicioNombre}</p>
                    </div>
                    <span className="font-mono text-[5px] text-slate-400 shrink-0">{c.hora}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <main className="flex-1 relative flex flex-col justify-center items-center p-3 overflow-hidden">
            <div className="absolute inset-0 pointer-events-none" style={{
              backgroundImage: `radial-gradient(ellipse 70% 70% at 50% 100%, ${gold}07 0%, transparent 60%)`,
              zIndex: 0
            }} />

            <div className="w-full h-full relative flex items-center justify-center z-10">
              
              {!config.hideSlideshow ? (
                <>
                  {activeTab === 'oferta' && (
                    <div className="text-center max-w-[85%] flex flex-col items-center">
                      <p className="text-[5.5px] font-black tracking-[0.4em] uppercase mb-1" style={{ color: gold }}>
                        ✦ {o.etiqueta} ✦
                      </p>
                      <h2 className="font-black text-white text-[12px] leading-tight tracking-tight">
                        {o.titulo1}
                      </h2>
                      <h2 className="font-black text-[12px] leading-tight tracking-tight" style={{ color: gold }}>
                        {o.titulo2}
                      </h2>
                      <p className="text-slate-400 text-[5px] mt-1 line-clamp-2 max-w-[140px] text-center leading-normal whitespace-pre-line">
                        {o.descripcion}
                      </p>
                      <div 
                        className="inline-flex items-center rounded-full px-2 py-0.5 mt-2" 
                        style={{ border: `0.5px solid ${gold}66`, background: `${gold}15` }}
                      >
                        <span className="font-bold text-[4.5px] tracking-wider" style={{ color: gold }}>
                          {o.cta}
                        </span>
                      </div>
                    </div>
                  )}

                  {activeTab === 'lookbook' && (
                    <div className="w-full h-full flex flex-col items-center justify-center relative">
                      <div className="absolute top-0 inset-x-0 text-center">
                        <p className="text-[5px] font-black tracking-[0.4em] uppercase" style={{ color: gold }}>
                          ✦ Nuestros Trabajos ✦
                        </p>
                      </div>
                      <div className="w-[85%] h-[75%] rounded-lg overflow-hidden border border-white/10 shadow-lg relative bg-slate-950 mt-1">
                        <img 
                          src={SIM_LOOKBOOK[0].url} 
                          alt="" 
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
                        <div className="absolute bottom-1 right-2">
                          <span className="font-mono text-[6px] font-black text-white/80">1 / 9</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'equipo' && (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      <p className="text-[5px] font-black tracking-[0.4em] uppercase mb-1.5" style={{ color: gold }}>
                        ✦ Nuestro Equipo ✦
                      </p>
                      <div className="grid grid-cols-3 gap-2 w-[85%]">
                        {SIM_BARBEROS.map(b => (
                          <div key={b.id} className="bg-white/[0.01] border border-white/5 rounded-lg py-2 px-1 text-center flex flex-col items-center gap-1 shadow-sm">
                            <div className="w-7 h-7 rounded-full overflow-hidden border border-gold/30 shrink-0 bg-slate-800">
                              <img src={b.foto} alt="" className="w-full h-full object-cover" />
                            </div>
                            <div className="min-w-0 w-full">
                              <p className="text-white font-bold text-[5.5px] truncate leading-none">{b.nombre}</p>
                              <p className="text-slate-500 text-[4px] truncate mt-0.5 leading-none">{b.specialty}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === 'productos' && (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      <p className="text-[5px] font-black tracking-[0.4em] uppercase mb-1.5" style={{ color: gold }}>
                        ✦ Productos Premium ✦
                      </p>
                      <div className="grid grid-cols-3 gap-2 w-[90%]">
                        {SIM_PRODUCTOS.map(p => (
                          <div key={p.id} className="bg-white/[0.01] border border-gold/15 rounded-lg overflow-hidden flex flex-col shadow-sm">
                            <div className="aspect-square bg-black overflow-hidden relative shrink-0">
                              <img src={p.imagen} alt="" className="w-full h-full object-cover" />
                            </div>
                            <div className="p-1 min-w-0 flex flex-col gap-0.5">
                              <p className="text-white font-bold text-[5px] truncate leading-tight">{p.nombre}</p>
                              <p className="text-[5px] font-black" style={{ color: gold }}>${Number(p.precio).toLocaleString('es-CL')}</p>
                              <div className="flex items-center gap-0.5 mt-0.5">
                                <div className={`w-0.8 h-0.8 rounded-full ${p.stock > 0 ? 'bg-emerald-400' : 'bg-red-400'}`} />
                                <span className="text-[3.5px] font-bold text-slate-500">{p.stock > 0 ? 'Stock' : 'Agotado'}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === 'marcas' && (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      <p className="text-[5px] font-black tracking-[0.4em] uppercase mb-2" style={{ color: gold }}>
                        ✦ Marcas Asociadas ✦
                      </p>
                      <div className="grid grid-cols-2 gap-2 w-[70%]">
                        {SIM_MARCAS.map(m => (
                          <div key={m.id} className="bg-white/[0.01] border border-white/5 rounded-lg p-1 text-center flex flex-col items-center justify-center gap-1 shadow-sm">
                            <div className="w-full h-6 rounded bg-slate-950 flex items-center justify-center p-0.5">
                              <span className="text-[5px] font-black text-slate-400 truncate">{m.nombre}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center text-slate-400 text-[8px] font-bold bg-black/60 px-3 py-1.5 rounded-xl border border-white/5 backdrop-blur-sm shadow-xl">
                  Modo Solo Video Activo
                </div>
              )}

            </div>

            {/* QR Overlay en miniatura */}
            <div className="absolute bottom-2 right-2 z-20 shrink-0">
              <div 
                className="rounded-lg p-1 flex flex-col items-center gap-0.5 border bg-[#050505]/95"
                style={{ animation: 'sim-qr-glow 3s infinite ease-in-out', borderColor: qrColor }}
              >
                <span className="text-[3.5px] font-black tracking-wider uppercase leading-none" style={{ color: qrColor }}>
                  ¡Únete!
                </span>
                <div className="p-0.5 bg-white/5 rounded shrink-0">
                  <QRCodeSVG 
                    value={`${window.location.origin}/registro.html?local=${tenantId}`} 
                    size={26} 
                    fgColor={qrColor} 
                    bgColor="transparent" 
                    level="L" 
                  />
                </div>
                <span className="text-slate-600 text-[2.5px] uppercase font-bold leading-none mt-0.5">Club</span>
              </div>
            </div>

            {/* Slide Indicators */}
            {!config.hideSlideshow && (
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1 z-10 shrink-0">
                {tabs.map((t) => {
                  const active = activeTab === t.id;
                  const activeInSettings = isTabActive(t.id);
                  return (
                    <div
                      key={t.id}
                      className="h-[2px] rounded-full transition-all duration-300"
                      style={{
                        width: active ? '8px' : '3px',
                        background: active 
                          ? `linear-gradient(to right, ${gold}, #FDE047)` 
                          : activeInSettings ? 'rgba(255,255,255,0.2)' : 'rgba(255,0,0,0.25)',
                      }}
                    />
                  );
                })}
              </div>
            )}

          </main>
        </div>

        {/* Ticker inferior */}
        {!config.hideTicker && (
          <div className="h-[8%] border-t border-white/5 bg-black/45 flex items-center px-3 shrink-0 relative z-10 overflow-hidden">
            <div className="absolute left-2 inset-y-0 z-30 flex items-center pr-1 bg-black">
              <div className="flex items-center gap-0.5 px-1 py-0.2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black tracking-wider text-[3.5px] uppercase rounded">
                <span className="w-0.5 h-0.5 bg-emerald-400 rounded-full animate-ping" />
                <span>Servicios</span>
              </div>
            </div>
            
            <div className="relative w-full h-full flex items-center overflow-hidden pl-11">
              <div 
                className="absolute flex whitespace-nowrap text-[4px] font-bold tracking-widest uppercase"
                style={{ 
                  color: `${gold}a0`,
                  animation: 'sim-ticker-scroll 20s infinite linear'
                }}
              >
                <span className="pr-10">✦ Corte Masculino: $12.000 &nbsp;✦ Barba Premium: $8.000 &nbsp;✦ Afeitado Navaja: $10.000 &nbsp;✦ Cejas: $4.000</span>
                <span className="pr-10">✦ Corte Masculino: $12.000 &nbsp;✦ Barba Premium: $8.000 &nbsp;✦ Afeitado Navaja: $10.000 &nbsp;✦ Cejas: $4.000</span>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Simulator navigation controls */}
      {!config.hideSlideshow && (
        <div className="space-y-1.5 mt-2">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Toca un slide para previsualizar:</p>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {tabs.map(t => {
              const active = isTabActive(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border flex items-center gap-1.5 transition-all ${
                    activeTab === t.id
                      ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-950/20'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
                  }`}
                >
                  <span className={`w-1 h-1 rounded-full ${active ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────

export default function TVConfig() {
  const [config,        setConfig]        = useState(CONFIG_DEFAULT);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [saved,         setSaved]         = useState(false);
  const [saveErr,       setSaveErr]       = useState('');
  const [dirty,         setDirty]         = useState(false);
  const [lookbookCount,  setLookbookCount]  = useState(null);
  const [barberoCount,   setBarberoCount]   = useState(null);
  const [productosCount, setProductosCount] = useState(null);
  const savedTimer = useRef(null);

  const tenantId = resolveTenantId();

  const [marcas, setMarcas] = useState([]);
  const [marcaNombre, setMarcaNombre] = useState('');
  const [marcaImg, setMarcaImg] = useState(null);
  const [marcaUploading, setMarcaUploading] = useState(false);
  const marcaInputRef = useRef(null);

  /* ── Background image ───────────────────────────────────────────── */
  const [bgUrl,       setBgUrl]       = useState('');
  const [bgUploading, setBgUploading] = useState(false);
  const [bgErr,       setBgErr]       = useState('');
  const bgInputRef = useRef(null);

  const isVideoBg = bgUrl && (
    bgUrl.includes('.mp4') ||
    bgUrl.includes('.webm') ||
    bgUrl.includes('.mov') ||
    bgUrl.split('?')[0].endsWith('.mp4') ||
    bgUrl.split('?')[0].endsWith('.webm')
  );

  useEffect(() => {
    getDoc(tenantDoc('configuracion', 'tv'))
      .then(snap => {
        if (snap.exists()) {
          const d = snap.data();
          setConfig({
            oferta:        { ...OFERTA_DEFAULT, ...(d.oferta || {}) },
            duracionSlide: d.duracionSlide ?? 15,
            slidesActivos: { oferta: true, lookbook: true, equipo: true, productos: true, ...(d.slidesActivos || {}) },
            accentColor:   d.accentColor || '',
            qr:            { color: '', size: 160, ...(d.qr || {}) },
            youtubeUrl:    d.youtubeUrl || '',
            hideSlideshow: d.hideSlideshow === true,
            rawVideoBg:    d.rawVideoBg === true,
            sidebarSize:   d.sidebarSize || 'md',
            hideHeader:    d.hideHeader === true,
            hideTicker:    d.hideTicker === true,
          });
          if (d.backgroundUrl) setBgUrl(d.backgroundUrl);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    getDocs(tenantCol('lookbook'))
      .then(snap => setLookbookCount(snap.size))
      .catch(() => setLookbookCount(0));
  }, []);

  useEffect(() => {
    getDocs(query(tenantCol('barberos'), where('activo', '!=', false)))
      .then(snap =>
        setBarberoCount(
          snap.docs.filter(d => !d.data()._mainDocId && d.data().rol !== 'admin').length
        )
      )
      .catch(() => setBarberoCount(0));
  }, []);

  useEffect(() => {
    getDocs(tenantCol('productos'))
      .then(snap => setProductosCount(snap.size))
      .catch(() => setProductosCount(0));
  }, []);

  useEffect(() => {
    if (tenantId !== 'elegance') return;
    getDocs(query(tenantCol('publicidad_tv')))
      .then(snap => setMarcas(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(() => {});
  }, [tenantId]);

  const update = (path, value) => {
    setConfig(prev => {
      if (path.includes('.')) {
        const [k, sk] = path.split('.');
        return { ...prev, [k]: { ...prev[k], [sk]: value } };
      }
      return { ...prev, [path]: value };
    });
    setDirty(true);
  };

  const handleBgUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBgErr('');
    setBgUploading(true);
    try {
      const isVideo = file.type.startsWith('video/');
      const ext = file.name.split('.').pop().toLowerCase() || (isVideo ? 'mp4' : 'jpg');
      const blob = isVideo ? file : await compressImage(file, { maxPx: 1280, quality: 0.7 });
      const contentType = isVideo ? file.type : 'image/jpeg';
      const tid = resolveTenantId();
      const sRef = storageRef(storage, `tenants/${tid}/tv-bg.${ext}`);
      await uploadBytes(sRef, blob, { contentType });
      const url = await getDownloadURL(sRef);
      await setDoc(tenantDoc('configuracion', 'tv'), { backgroundUrl: url }, { merge: true });
      setBgUrl(url);
    } catch (err) {
      setBgErr('Error al subir el archivo. Intenta con un archivo más liviano o pequeño.');
      console.error(err);
    } finally {
      setBgUploading(false);
      if (bgInputRef.current) bgInputRef.current.value = '';
    }
  };

  const handleBgRemove = async () => {
    setBgErr('');
    try {
      const tid  = resolveTenantId();
      let ext = 'jpg';
      if (bgUrl) {
        const decodedUrl = decodeURIComponent(bgUrl);
        const match = decodedUrl.match(/tv-bg\.([a-zA-Z0-9]+)/);
        if (match && match[1]) {
          ext = match[1].toLowerCase();
        }
      }
      const mainRef = storageRef(storage, `tenants/${tid}/tv-bg.${ext}`);
      await deleteObject(mainRef).catch(() => {});

      // Borrado preventivo de otras extensiones comunes por si quedan fantasmas
      const extraExts = ['jpg', 'jpeg', 'png', 'mp4', 'webm', 'mov'].filter(e => e !== ext);
      for (const e of extraExts) {
        const ref = storageRef(storage, `tenants/${tid}/tv-bg.${e}`);
        await deleteObject(ref).catch(() => {});
      }

      await setDoc(tenantDoc('configuracion', 'tv'), { backgroundUrl: '' }, { merge: true });
      setBgUrl('');
    } catch (err) {
      setBgErr('No se pudo eliminar el archivo.');
      console.error(err);
    }
  };

  const handleMarcaUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMarcaImg(file);
  };

  const handleAddMarca = async () => {
    if (!marcaNombre || !marcaImg || marcaUploading) return;
    setMarcaUploading(true);
    try {
      const blob = await compressImage(marcaImg, { maxPx: 800, quality: 0.8 });
      const id = Date.now().toString();
      const sRef = storageRef(storage, `tenants/${tenantId}/publicidad_tv/${id}.jpg`);
      await uploadBytes(sRef, blob, { contentType: 'image/jpeg' });
      const url = await getDownloadURL(sRef);
      
      const newMarca = { id, nombre: marcaNombre, logoUrl: url, activo: true, createdAt: new Date().toISOString() };
      await setDoc(doc(tenantCol('publicidad_tv'), id), newMarca);
      
      setMarcas(prev => [...prev, newMarca]);
      setMarcaNombre('');
      setMarcaImg(null);
      if (marcaInputRef.current) marcaInputRef.current.value = '';
    } catch (err) {
      console.error(err);
      alert('Error al guardar marca');
    } finally {
      setMarcaUploading(false);
    }
  };

  const handleToggleMarca = async (m) => {
    const next = !m.activo;
    await setDoc(doc(tenantCol('publicidad_tv'), m.id), { activo: next }, { merge: true });
    setMarcas(prev => prev.map(x => x.id === m.id ? { ...x, activo: next } : x));
  };

  const handleDeleteMarca = async (m) => {
    if (!confirm('¿Eliminar esta marca?')) return;
    await deleteDoc(doc(tenantCol('publicidad_tv'), m.id));
    try {
      await deleteObject(storageRef(storage, `tenants/${tenantId}/publicidad_tv/${m.id}.jpg`));
    } catch {}
    setMarcas(prev => prev.filter(x => x.id !== m.id));
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setSaveErr('');
    try {
      await setDoc(tenantDoc('configuracion', 'tv'), {
        oferta:        config.oferta,
        duracionSlide: config.duracionSlide,
        slidesActivos: config.slidesActivos,
        accentColor:   config.accentColor,
        qr:            config.qr,
        youtubeUrl:    config.youtubeUrl || '',
        hideSlideshow: config.hideSlideshow === true,
        rawVideoBg:    config.rawVideoBg === true,
        sidebarSize:   config.sidebarSize || 'md',
        hideHeader:    config.hideHeader === true,
        hideTicker:    config.hideTicker === true,
      }, { merge: true });
      setSaved(true);
      setDirty(false);
      clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setSaveErr(e?.message || 'Error al guardar. Verifica tu conexión.');
    } finally {
      setSaving(false);
    }
  };

  const updateQr = (key, value) => {
    setConfig(prev => ({ ...prev, qr: { ...prev.qr, [key]: value } }));
    setDirty(true);
  };

  const inp = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors';
  const gold = config.accentColor || '#D4AF37';
  const qrColor = config.qr.color || gold;

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6 pb-20 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/40 p-5 rounded-2xl border border-slate-800 shadow-md">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2.5">
            <Monitor className="text-emerald-500" size={22} />
            Pantalla TV
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Configura el contenido de la pantalla del local en tiempo real con vista previa en vivo
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href="/gestion-interna/tv"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-400 border border-slate-700 hover:text-white hover:border-slate-500 hover:bg-slate-800/50 transition-all bg-slate-800/40 shadow-sm"
          >
            <ExternalLink size={13} /> Ver TV en vivo
          </a>
          <button
            onClick={handleSave}
            disabled={saving}
            className="relative flex items-center gap-2 px-4.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-emerald-950/20"
          >
            {saving
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : saved ? <Check size={15} /> : <Save size={15} />}
            {saved ? 'Guardado' : 'Guardar Cambios'}
            {dirty && !saving && !saved && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-slate-950" />
            )}
          </button>
        </div>
      </div>

      {saveErr && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-950/50 border border-red-500/30 rounded-xl text-sm text-red-400">
          <AlertCircle size={15} className="shrink-0" />
          <span className="flex-1">{saveErr}</span>
          <button onClick={() => setSaveErr('')} className="ml-2 text-red-400/50 hover:text-red-400">×</button>
        </div>
      )}

      {/* Grid de dos columnas responsive */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* COLUMNA IZQUIERDA: FORMULARIOS (Col 7) */}
        <div className="lg:col-span-7 space-y-6">

          {/* ── Fondo de pantalla TV ───────────────────────────────────────── */}
          <Card icon={ImagePlus} title="Fondo de Pantalla TV">
            <p className="text-xs text-slate-500 -mt-1">
              Se aplica en toda la pantalla TV con brillo reducido para no tapar el contenido.
              Soporta imágenes (comprimidas automáticamente) y videos (se suben crudos para mantener la calidad).
            </p>

            {bgErr && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-red-950/50 border border-red-500/30 rounded-lg text-xs text-red-400">
                <AlertCircle size={13} className="shrink-0" />
                {bgErr}
              </div>
            )}

            {bgUrl ? (
              <div className="space-y-3">
                {/* Preview */}
                <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: '16/5' }}>
                  {isVideoBg ? (
                    <video
                      src={bgUrl}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{ filter: 'brightness(0.28) saturate(0.7)' }}
                    />
                  ) : (
                    <img
                      src={bgUrl}
                      alt="Fondo TV"
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{ filter: 'brightness(0.28) saturate(0.7)' }}
                    />
                  )}
                  <div className="absolute inset-0" style={{ background: 'rgba(5,5,5,0.45)' }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-black/40 px-3 py-1 rounded-full border border-white/5 backdrop-blur-sm">
                      Así se ve en la TV del local
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700 text-xs font-semibold text-slate-400 hover:text-white hover:border-slate-600 cursor-pointer transition-all">
                    <Upload size={13} />
                    Cambiar archivo
                    <input ref={bgInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleBgUpload} disabled={bgUploading} />
                  </label>
                  <button
                    onClick={handleBgRemove}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-900/50 text-xs font-semibold text-red-500 hover:bg-red-950/40 hover:border-red-700/50 transition-all"
                  >
                    <Trash2 size={13} />
                    Quitar fondo
                  </button>
                </div>
              </div>
            ) : (
              <label
                className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-700 hover:border-slate-600 cursor-pointer transition-colors py-8 bg-slate-900/20"
                style={{ background: bgUploading ? 'rgba(16,185,129,0.03)' : 'rgba(255,255,255,0.01)' }}
              >
                {bgUploading ? (
                  <>
                    <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs text-slate-500">Subiendo archivo…</p>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-800/50 border border-slate-700/50">
                      <ImagePlus size={22} className="text-slate-500" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-slate-400">Subir fondo de pantalla</p>
                      <p className="text-xs text-slate-600 mt-0.5">Imágenes (JPG, PNG) o Videos (MP4, WEBM)</p>
                    </div>
                  </>
                )}
                <input ref={bgInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleBgUpload} disabled={bgUploading} />
              </label>
            )}
          </Card>

          {/* ── Música de Fondo (YouTube) ──────────────────────────────── */}
          <Card icon={Music} title="Música de Fondo (YouTube)">
            <p className="text-xs text-slate-500 -mt-1">
              Permite reproducir transmisiones en vivo (ej. radios Lofi), playlists o cualquier video de YouTube de fondo con audio en la sala de espera.
            </p>

            <Field
              label="URL o ID de YouTube"
              hint="Pega la dirección del video de YouTube (ej. https://www.youtube.com/watch?v=5qap5aO4i9A)"
            >
              <input
                className={inp}
                placeholder="https://www.youtube.com/watch?v=..."
                value={config.youtubeUrl || ''}
                onChange={e => update('youtubeUrl', e.target.value)}
              />
            </Field>
            
            <p className="text-[10px] text-slate-600 bg-slate-800/30 rounded-xl px-3 py-2.5 leading-relaxed border border-slate-800">
              💡 **Recomendación:** Utiliza streams continuos de música ambiental Lofi, jazz o chillout para mantener una atmósfera relajante en el local.
            </p>
          </Card>

          {/* ── General ───────────────────────────────────────────────── */}
          <Card icon={Monitor} title="Configuración General">

            <Field label="Opciones de Visualización Especial">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <SlideToggle
                  checked={config.hideSlideshow === true}
                  onChange={v => update('hideSlideshow', v)}
                  label="Ocultar Diapositivas"
                  sublabel="Oculta el carrusel y muestra solo el fondo de video/imagen"
                />
                <SlideToggle
                  checked={config.rawVideoBg === true}
                  onChange={v => update('rawVideoBg', v)}
                  label="Video sin Filtros (Color Real)"
                  sublabel="Muestra el fondo con su brillo y color original sin sombras"
                />
                <SlideToggle
                  checked={config.hideHeader === true}
                  onChange={v => update('hideHeader', v)}
                  label="Ocultar Reloj y Encabezado"
                  sublabel="Remueve la hora, fecha y logo de la parte superior"
                />
                <SlideToggle
                  checked={config.hideTicker === true}
                  onChange={v => update('hideTicker', v)}
                  label="Ocultar Marquesina Inferior"
                  sublabel="Remueve la barra de servicios del extremo inferior"
                />
              </div>
            </Field>

            <Field
              label="Tamaño del Listado de Citas"
              hint="Achica o agranda el panel lateral de citas para dejar más espacio al video de fondo"
            >
              <div className="flex gap-2 mb-4">
                {[
                  { value: 'sm', label: 'Achicado (20% ancho)' },
                  { value: 'md', label: 'Normal (26% ancho)' },
                  { value: 'lg', label: 'Agrandado (32% ancho)' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => update('sidebarSize', opt.value)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                      config.sidebarSize === opt.value
                        ? 'bg-emerald-600 border-emerald-500 text-white shadow-md shadow-emerald-950/20'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </Field>

            <Field
              label="Duración de cada slide"
              hint={`El carrusel avanza automáticamente cada ${config.duracionSlide} segundos`}
            >
              <div className="flex items-center gap-4">
                <div className="flex-1 space-y-1">
                  <input
                    type="range"
                    min={5}
                    max={60}
                    step={5}
                    value={config.duracionSlide}
                    onChange={e => update('duracionSlide', Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <div className="flex justify-between text-[9px] text-slate-600 px-1 font-mono font-bold select-none">
                    <span>5s</span>
                    <span>15s</span>
                    <span>30s</span>
                    <span>45s</span>
                    <span>60s</span>
                  </div>
                </div>
                <span className="text-white font-mono font-black tabular-nums w-14 text-center bg-emerald-500/10 text-emerald-400 rounded-xl py-2 text-sm border border-emerald-500/20 shadow-lg">
                  {config.duracionSlide}s
                </span>
              </div>
            </Field>

            <Field label="Slides activos">
              <div className="space-y-2">
                <SlideToggle
                  checked={config.slidesActivos.oferta}
                  onChange={v => update('slidesActivos', { ...config.slidesActivos, oferta: v })}
                  label="Anuncio / Oferta"
                  sublabel="Slide de texto promocional"
                />
                <SlideToggle
                  checked={config.slidesActivos.lookbook}
                  onChange={v => update('slidesActivos', { ...config.slidesActivos, lookbook: v })}
                  label="Lookbook"
                  sublabel="Galería de trabajos del local"
                />
                <SlideToggle
                  checked={config.slidesActivos.equipo}
                  onChange={v => update('slidesActivos', { ...config.slidesActivos, equipo: v })}
                  label="Nuestro Equipo"
                  sublabel="Presentación de barberos"
                />
                <SlideToggle
                  checked={config.slidesActivos.productos}
                  onChange={v => update('slidesActivos', { ...config.slidesActivos, productos: v })}
                  label="Productos"
                  sublabel="Catálogo de productos del local"
                />
                {tenantId === 'elegance' && (
                  <SlideToggle
                    checked={config.slidesActivos.marcas ?? true}
                    onChange={v => update('slidesActivos', { ...config.slidesActivos, marcas: v })}
                    label="Publicidad Marcas"
                    sublabel="Logos de auspiciadores (Solo Elegance)"
                  />
                )}
              </div>
            </Field>

          </Card>

          {/* ── QR ────────────────────────────────────────────────────── */}
          <Card icon={QrCode} title="Código QR">
            <p className="text-xs text-slate-500 -mt-1">
              El QR aparece fijo en la esquina inferior derecha del carrusel y apunta al registro del club.
            </p>

            <Field label="Color del QR">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2 items-center">
                  {/* Opción: heredar color de acento */}
                  <button
                    type="button"
                    title="Color de acento (por defecto)"
                    onClick={() => updateQr('color', '')}
                    className="w-7 h-7 rounded-lg transition-all duration-150 flex items-center justify-center text-[9px] font-black border border-white/10"
                    style={{
                      background:    gold,
                      outline:       config.qr.color === '' ? '2px solid #fff' : '2px solid transparent',
                      outlineOffset: '2px',
                      transform:     config.qr.color === '' ? 'scale(1.15)' : 'scale(1)',
                    }}
                  >
                    A
                  </button>
                  {/* Presets fijos */}
                  {[
                    { label: 'Blanco',    value: '#e2e8f0' },
                    { label: 'Azul neon', value: '#00C8FF' },
                    { label: 'Esmeralda', value: '#10b981' },
                    { label: 'Rosa',      value: '#f43f5e' },
                    { label: 'Naranja',   value: '#f97316' },
                    { label: 'Violeta',   value: '#a855f7' },
                  ].map(p => (
                    <button
                      key={p.value}
                      type="button"
                      title={p.label}
                      onClick={() => updateQr('color', p.value)}
                      className="w-7 h-7 rounded-lg transition-all duration-150 border border-white/10"
                      style={{
                        background:    p.value,
                        outline:       config.qr.color === p.value ? '2px solid #fff' : '2px solid transparent',
                        outlineOffset: '2px',
                        transform:     config.qr.color === p.value ? 'scale(1.15)' : 'scale(1)',
                      }}
                    />
                  ))}
                  {/* Picker personalizado */}
                  <label className="relative w-7 h-7 cursor-pointer" title="Color personalizado">
                    <input
                      type="color"
                      value={qrColor}
                      onChange={e => updateQr('color', e.target.value)}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    />
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: qrColor, border: '1.5px dashed rgba(255,255,255,0.45)' }}
                    >
                      <Palette size={11} className="text-white opacity-80" />
                    </div>
                  </label>
                </div>
                <div className="flex items-center gap-2 bg-slate-800/40 p-2 rounded-xl border border-slate-800">
                  <div className="w-5 h-5 rounded-md shrink-0 border border-white/10" style={{ background: qrColor }} />
                  <span className="text-xs text-slate-400 font-mono font-bold">{qrColor}</span>
                  {config.qr.color && (
                    <button
                      type="button"
                      onClick={() => updateQr('color', '')}
                      className="ml-auto text-xs text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
                    >
                      Usar color de acento
                    </button>
                  )}
                </div>
              </div>
            </Field>

            <Field
              label="Tamaño del QR"
              hint={`El QR se mostrará en ${config.qr.size} × ${config.qr.size} px en la pantalla TV`}
            >
              <div className="flex items-center gap-4">
                <div className="flex-1 space-y-1">
                  <input
                    type="range"
                    min={0}
                    max={QR_SIZE_STEPS.length - 1}
                    step={1}
                    value={QR_SIZE_STEPS.indexOf(config.qr.size) !== -1
                      ? QR_SIZE_STEPS.indexOf(config.qr.size)
                      : 3}
                    onChange={e => updateQr('size', QR_SIZE_STEPS[Number(e.target.value)])}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <div className="flex justify-between text-[9px] text-slate-600 px-1 font-mono font-bold select-none">
                    <span>100px</span>
                    <span>160px</span>
                    <span>240px</span>
                  </div>
                </div>
                <span className="text-white font-mono font-black tabular-nums w-20 text-center bg-emerald-500/10 text-emerald-400 rounded-xl py-2 text-sm border border-emerald-500/20 shadow-lg">
                  {config.qr.size}px
                </span>
              </div>
            </Field>
          </Card>

          {/* ── Slide Anuncio ─────────────────────────────────────────── */}
          <Card
            icon={Megaphone}
            title="Slide 1 — Anuncio / Oferta"
            badge={<StatusBadge active={config.slidesActivos.oferta} />}
          >
            <p className="text-xs text-slate-500 -mt-1">
              El texto vacío usa los valores por defecto como ejemplo.
              Escribe el tuyo para que aparezca en pantalla.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field 
                label="Etiqueta superior"
                charCount={config.oferta.etiqueta?.length ?? 0}
                charMax={25}
              >
                <input
                  className={inp}
                  placeholder={OFERTA_DEFAULT.etiqueta}
                  value={config.oferta.etiqueta}
                  onChange={e => update('oferta.etiqueta', e.target.value)}
                />
              </Field>
              <Field 
                label="Botón / CTA"
                charCount={config.oferta.cta?.length ?? 0}
                charMax={25}
              >
                <input
                  className={inp}
                  placeholder={OFERTA_DEFAULT.cta}
                  value={config.oferta.cta}
                  onChange={e => update('oferta.cta', e.target.value)}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field 
                label="Título línea 1 (blanco)"
                charCount={config.oferta.titulo1?.length ?? 0}
                charMax={20}
              >
                <input
                  className={inp}
                  placeholder={OFERTA_DEFAULT.titulo1}
                  value={config.oferta.titulo1}
                  onChange={e => update('oferta.titulo1', e.target.value)}
                />
              </Field>
              <Field 
                label="Título línea 2 (color acento)"
                charCount={config.oferta.titulo2?.length ?? 0}
                charMax={20}
              >
                <input
                  className={inp}
                  placeholder={OFERTA_DEFAULT.titulo2}
                  value={config.oferta.titulo2}
                  onChange={e => update('oferta.titulo2', e.target.value)}
                />
              </Field>
            </div>

            <Field 
              label="Descripción" 
              hint="Usa Enter para salto de línea en la pantalla"
              charCount={config.oferta.descripcion?.length ?? 0}
              charMax={90}
            >
              <textarea
                className={`${inp} resize-none`}
                rows={3}
                placeholder={OFERTA_DEFAULT.descripcion}
                value={config.oferta.descripcion}
                onChange={e => update('oferta.descripcion', e.target.value)}
              />
            </Field>

            <Field label="Color de acento">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2 items-center">
                  {ACCENT_PRESETS.map(p => (
                    <button
                      key={p.value}
                      type="button"
                      title={p.label}
                      onClick={() => update('accentColor', p.value)}
                      className="w-7 h-7 rounded-lg transition-all duration-150 border border-white/10"
                      style={{
                        background:    p.value,
                        outline:       config.accentColor === p.value ? '2px solid #fff' : '2px solid transparent',
                        outlineOffset: '2px',
                        transform:     config.accentColor === p.value ? 'scale(1.15)' : 'scale(1)',
                      }}
                    />
                  ))}
                  <label className="relative w-7 h-7 cursor-pointer" title="Color personalizado">
                    <input
                      type="color"
                      value={gold}
                      onChange={e => update('accentColor', e.target.value)}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    />
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: gold, border: '1.5px dashed rgba(255,255,255,0.45)' }}
                    >
                      <Palette size={11} className="text-white opacity-80" />
                    </div>
                  </label>
                </div>
                <div className="flex items-center gap-2 bg-slate-800/40 p-2 rounded-xl border border-slate-800">
                  <div className="w-5 h-5 rounded-md shrink-0 border border-white/10" style={{ background: gold }} />
                  <span className="text-xs text-slate-400 font-mono font-bold">{gold}</span>
                  {config.accentColor && (
                    <button
                      type="button"
                      onClick={() => update('accentColor', '')}
                      className="ml-auto text-xs text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
                    >
                      Restablecer dorado
                    </button>
                  )}
                </div>
              </div>
            </Field>
          </Card>

          {/* ── Slide Lookbook ────────────────────────────────────────── */}
          <Card
            icon={Images}
            title="Slide 2 — Lookbook"
            badge={<StatusBadge active={config.slidesActivos.lookbook} />}
          >
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium text-white">
                  {lookbookCount === null
                    ? <span className="text-slate-500 animate-pulse font-bold">Cargando…</span>
                    : `${lookbookCount} foto${lookbookCount !== 1 ? 's' : ''} publicada${lookbookCount !== 1 ? 's' : ''}`}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">Las fotos se gestionan en la sección Lookbook</p>
              </div>
              <Link
                to="lookbook"
                className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-bold transition-colors bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 shadow-sm"
              >
                Ir a Lookbook <ChevronRight size={13} />
              </Link>
            </div>
            <p className="text-xs text-slate-600 bg-slate-800/30 rounded-xl px-3 py-2.5 leading-relaxed border border-slate-800">
              La TV muestra las primeras <strong className="text-slate-400">9 fotos</strong> en orden.
              Reordénalas arrastrando desde Lookbook para controlar cuáles aparecen en pantalla.
            </p>
          </Card>

          {/* ── Slide Equipo ──────────────────────────────────────────── */}
          <Card
            icon={Users}
            title="Slide 3 — Nuestro Equipo"
            badge={<StatusBadge active={config.slidesActivos.equipo} />}
          >
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium text-white">
                  {barberoCount === null
                    ? <span className="text-slate-500 animate-pulse font-bold">Cargando…</span>
                    : `${barberoCount} barbero${barberoCount !== 1 ? 's' : ''} activo${barberoCount !== 1 ? 's' : ''}`}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">El equipo se gestiona en la sección Equipo</p>
              </div>
              <Link
                to="equipo"
                className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-bold transition-colors bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 shadow-sm"
              >
                Ir a Equipo <ChevronRight size={13} />
              </Link>
            </div>
            <p className="text-xs text-slate-600 bg-slate-800/30 rounded-xl px-3 py-2.5 leading-relaxed border border-slate-800">
              Muestra todos los barberos activos (máx. 8).
              Los usuarios con rol <strong className="text-slate-400">admin</strong> no aparecen en pantalla.
            </p>
          </Card>

          {/* ── Slide Productos ───────────────────────────────────────── */}
          <Card
            icon={ShoppingBag}
            title="Slide 4 — Productos"
            badge={<StatusBadge active={config.slidesActivos.productos} />}
          >
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium text-white">
                  {productosCount === null
                    ? <span className="text-slate-500 animate-pulse font-bold">Cargando…</span>
                    : `${productosCount} producto${productosCount !== 1 ? 's' : ''} cargado${productosCount !== 1 ? 's' : ''}`}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">Los productos se gestionan en la sección Productos</p>
              </div>
              <Link
                to="productos"
                className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-bold transition-colors bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 shadow-sm"
              >
                Ir a Productos <ChevronRight size={13} />
              </Link>
            </div>
            <p className="text-xs text-slate-600 bg-slate-800/30 rounded-xl px-3 py-2.5 leading-relaxed border border-slate-800">
              Muestra los primeros <strong className="text-slate-400">8 productos</strong> con imagen, precio y disponibilidad de stock.
            </p>
          </Card>

          {/* ── Slide Marcas (Solo Elegance) ──────────────────────────── */}
          {tenantId === 'elegance' && (
            <Card
              icon={Megaphone}
              title="Slide 5 — Publicidad de Marcas"
              badge={<StatusBadge active={config.slidesActivos.marcas ?? true} />}
            >
              <p className="text-xs text-slate-500 -mt-1">
                Agrega los logos de las marcas que auspician la barbería.
              </p>

              {/* Formulario Add Marca */}
              <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-800 space-y-3">
                <p className="text-xs font-semibold text-slate-300">Nueva Marca</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    placeholder="Nombre de la marca"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    value={marcaNombre}
                    onChange={e => setMarcaNombre(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <label className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-700 text-xs font-semibold text-slate-400 hover:text-white hover:border-slate-600 cursor-pointer transition-all bg-slate-900 shrink-0">
                      <Upload size={14} />
                      <span className="truncate max-w-[80px]">{marcaImg ? marcaImg.name : 'Logo'}</span>
                      <input ref={marcaInputRef} type="file" accept="image/*" className="hidden" onChange={handleMarcaUpload} />
                    </label>
                    <button
                      onClick={handleAddMarca}
                      disabled={!marcaNombre || !marcaImg || marcaUploading}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-all shrink-0 shadow-md"
                    >
                      {marcaUploading ? 'Guardando...' : 'Añadir'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Lista de marcas */}
              {marcas.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                  {marcas.map(m => (
                    <div key={m.id} className="relative p-3 bg-slate-800/30 rounded-xl border border-slate-800 flex flex-col items-center gap-2 shadow-sm">
                      <div className="w-full h-16 bg-slate-950 rounded-lg flex items-center justify-center overflow-hidden border border-slate-800/50 p-2">
                        <img src={m.logoUrl} alt={m.nombre} className="max-w-full max-h-full object-contain" />
                      </div>
                      <p className="text-xs font-semibold text-white text-center truncate w-full">{m.nombre}</p>
                      
                      <div className="flex items-center gap-2 w-full mt-1">
                        <button
                          onClick={() => handleToggleMarca(m)}
                          className={`flex-1 text-[10px] py-1 rounded-md border font-semibold transition-colors ${m.activo !== false ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-slate-700 text-slate-400 border-slate-600'}`}
                        >
                          {m.activo !== false ? 'Activa' : 'Oculta'}
                        </button>
                        <button
                          onClick={() => handleDeleteMarca(m)}
                          className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

        </div>

        {/* COLUMNA DERECHA: SIMULADOR TV (Col 5 - Sticky) */}
        <div className="lg:col-span-5 lg:sticky lg:top-6">
          <TVSimulator config={config} bgUrl={bgUrl} tenantId={tenantId} />
        </div>

      </div>

    </div>
  );
}
