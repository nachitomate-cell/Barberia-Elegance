import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { resolveTenantId } from '../lib/tenantUtils';
import { withTimeout } from '../lib/firestore-helpers';
import { useTenant } from '../contexts/TenantContext';
import { Shield, Star, Zap, Crown, Search, ChevronRight, Scissors } from 'lucide-react';

// ── Nivel config ────────────────────────────────────────────────────
const LEVELS = [
  {
    name: 'Bronze',
    min: 1, threshold: 5,
    Icon: Shield,
    bg: 'linear-gradient(135deg,#1a0800 0%,#5c2200 30%,#c87030 52%,#5c2200 74%,#1a0800 100%)',
    holoRgb: '200,110,40',
    accent: '#e8904a',
    text: '#ffe0c0',
    badge: 'bg-amber-950/60 border-amber-600/50 text-amber-300',
    progressCls: 'bg-amber-500',
    benefits: ['5% descuento en servicios', 'Acceso anticipado a ofertas'],
  },
  {
    name: 'Silver',
    min: 5, threshold: 10,
    Icon: Star,
    bg: 'linear-gradient(135deg,#0a0a14 0%,#2a2a44 30%,#a8a8cc 52%,#2a2a44 74%,#0a0a14 100%)',
    holoRgb: '168,168,210',
    accent: '#c0c0e0',
    text: '#eeeef8',
    badge: 'bg-slate-800/60 border-slate-400/50 text-slate-200',
    progressCls: 'bg-slate-400',
    benefits: ['10% descuento en servicios', 'Producto trimestral de regalo', 'Reserva prioritaria'],
  },
  {
    name: 'Gold',
    min: 10, threshold: 20,
    Icon: Zap,
    bg: 'linear-gradient(135deg,#120c00 0%,#4a3400 30%,#c8a020 52%,#4a3400 74%,#120c00 100%)',
    holoRgb: '210,168,30',
    accent: '#e8c030',
    text: '#fff8c8',
    badge: 'bg-yellow-950/60 border-yellow-500/50 text-yellow-300',
    progressCls: 'bg-yellow-400',
    benefits: ['15% descuento en servicios', 'Servicio gratis mensual', 'Línea directa con tu barbero', 'Producto mensual de regalo'],
  },
  {
    name: 'Platinum',
    min: 20, threshold: null,
    Icon: Crown,
    bg: 'linear-gradient(135deg,#080018 0%,#1a0048 20%,#003880 38%,#007060 54%,#500080 72%,#080018 100%)',
    holoRgb: '160,80,255',
    accent: '#d080ff',
    text: '#ffffff',
    badge: 'bg-purple-950/60 border-purple-400/50 text-purple-200',
    progressCls: 'bg-purple-400',
    benefits: ['25% descuento en todos los servicios', 'Servicio completo gratis mensual', 'Atención VIP personalizada', 'Invitación a eventos exclusivos', 'Acceso a Academia incluido'],
  },
];

const HOLO_CSS = `
  @keyframes holo-sweep {
    0%   { transform: translateX(-180%) skewX(-20deg); opacity: 0; }
    10%  { opacity: 1; }
    90%  { opacity: 1; }
    100% { transform: translateX(280%) skewX(-20deg); opacity: 0; }
  }
  @keyframes holo-rainbow {
    0%   { filter: hue-rotate(0deg)   saturate(1.8) brightness(1.1); }
    100% { filter: hue-rotate(360deg) saturate(1.8) brightness(1.1); }
  }
  @keyframes card-float {
    0%, 100% { transform: perspective(900px) rotateX(1deg)  translateY(0px); }
    50%       { transform: perspective(900px) rotateX(-1deg) translateY(-6px); }
  }
  .holo-sweep {
    position: absolute; inset: 0; pointer-events: none;
    background: linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.55) 50%, transparent 70%);
    animation: holo-sweep 4s ease-in-out infinite;
    mix-blend-mode: overlay;
  }
  .holo-rainbow {
    position: absolute; inset: 0; pointer-events: none;
    background: linear-gradient(135deg,
      rgba(255,0,128,0.2) 0%,
      rgba(255,128,0,0.2) 20%,
      rgba(255,255,0,0.2) 35%,
      rgba(0,255,128,0.2) 50%,
      rgba(0,128,255,0.2) 65%,
      rgba(128,0,255,0.2) 80%,
      rgba(255,0,128,0.2) 100%
    );
    background-size: 300% 300%;
    animation: holo-rainbow 4s linear infinite;
    mix-blend-mode: color-dodge;
    border-radius: inherit;
  }
  .card-idle {
    animation: card-float 5s ease-in-out infinite;
  }
  .card-active {
    animation: none !important;
    transition: transform 0.08s ease-out, box-shadow 0.08s ease-out;
  }
`;

function getLevel(visits) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (visits >= LEVELS[i].min) return LEVELS[i];
  }
  return null;
}

function normPhone(p) {
  if (!p) return '';
  const n = String(p).replace(/\D/g, '');
  if (n.startsWith('56') && n.length === 11) return n;
  if (n.length === 9) return `56${n}`;
  return n;
}

function formatDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('es-CL', { month: 'short', year: 'numeric' });
}

// ── Tarjeta holográfica ─────────────────────────────────────────────
function HoloCard({ client, visits, level, tenantName }) {
  const cardRef  = useRef(null);
  const rafRef   = useRef(null);
  const idleRef  = useRef(true);
  const LevelIcon = level.Icon;
  const isPlatinum = level.name === 'Platinum';

  const onMouseMove = useCallback((e) => {
    if (!cardRef.current) return;
    idleRef.current = false;
    cardRef.current.classList.remove('card-idle');
    cardRef.current.classList.add('card-active');
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (!cardRef.current) return;
      const r   = cardRef.current.getBoundingClientRect();
      const x   = (e.clientX - r.left) / r.width;
      const y   = (e.clientY - r.top)  / r.height;
      const rX  = (y - 0.5) * -28;
      const rY  = (x - 0.5) *  28;
      cardRef.current.style.transform =
        `perspective(900px) rotateX(${rX}deg) rotateY(${rY}deg) scale(1.03)`;
      cardRef.current.style.setProperty('--hx', `${x * 100}%`);
      cardRef.current.style.setProperty('--hy', `${y * 100}%`);
      cardRef.current.style.setProperty('--ho', '1');
    });
  }, []);

  const onMouseLeave = useCallback(() => {
    if (!cardRef.current) return;
    cardRef.current.style.transform = '';
    cardRef.current.style.setProperty('--ho', '0');
    cardRef.current.classList.remove('card-active');
    cardRef.current.classList.add('card-idle');
  }, []);

  // number display like a credit card (padded with visit count)
  const cardNum = `•••• •••• •••• ${String(visits).padStart(4, '0')}`;

  return (
    <div
      ref={cardRef}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="card-idle relative w-full rounded-2xl overflow-hidden select-none"
      style={{
        aspectRatio: '1.586',
        background: level.bg,
        boxShadow: `0 30px 70px rgba(0,0,0,0.6), 0 0 60px rgba(${level.holoRgb},0.25)`,
        willChange: 'transform',
        '--hx': '50%', '--hy': '50%', '--ho': '0',
      }}
    >
      {/* Dot-grid texture */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.07]"
        style={{ backgroundImage: 'radial-gradient(circle,rgba(255,255,255,1) 1px,transparent 1px)', backgroundSize: '18px 18px' }} />

      {/* Rainbow layer (Platinum always, others on hover) */}
      {isPlatinum
        ? <div className="holo-rainbow" />
        : <div className="absolute inset-0 pointer-events-none" style={{
            background: `radial-gradient(circle at var(--hx) var(--hy), rgba(255,255,255,0.22) 0%, transparent 55%)`,
            opacity: 'var(--ho)', transition: 'opacity 0.3s',
            mixBlendMode: 'overlay',
          }} />
      }

      {/* Sweep shine */}
      <div className="holo-sweep" style={{ animationDelay: isPlatinum ? '0s' : '1.5s' }} />

      {/* Edge gloss */}
      <div className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{ boxShadow: `inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.3)` }} />

      {/* Content */}
      <div className="relative h-full flex flex-col justify-between p-5 sm:p-6">
        {/* Top */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[8px] font-black tracking-[0.5em] uppercase opacity-50" style={{ color: level.text }}>
              {tenantName}
            </p>
            <p className="text-[9px] font-bold tracking-[0.3em] uppercase mt-0.5 opacity-70" style={{ color: level.text }}>
              Tarjeta VIP
            </p>
          </div>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black tracking-widest uppercase backdrop-blur-sm ${level.badge}`}>
            <LevelIcon size={9} />
            {level.name}
          </div>
        </div>

        {/* Chip */}
        <div className="flex">
          <div className="w-9 h-6 rounded-md border-2 opacity-35"
            style={{ borderColor: level.accent, background: `linear-gradient(135deg,${level.accent}25,transparent)` }} />
        </div>

        {/* Bottom */}
        <div>
          <p className="font-mono text-xs tracking-[0.22em] opacity-40 mb-0.5" style={{ color: level.text }}>
            {cardNum}
          </p>
          <p className="font-bold text-sm sm:text-base tracking-[0.12em] truncate" style={{ color: level.text }}>
            {client.nombre.toUpperCase()}
          </p>
          <div className="flex items-center justify-between mt-1.5">
            <p className="text-[8px] tracking-widest uppercase opacity-40 font-semibold" style={{ color: level.text }}>
              {visits} visita{visits !== 1 ? 's' : ''}
            </p>
            <p className="text-[8px] tracking-widest uppercase opacity-40 font-semibold" style={{ color: level.text }}>
              Desde {client.desde}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Barra de progreso ───────────────────────────────────────────────
function LevelProgress({ visits, level }) {
  const nextLevel = LEVELS[LEVELS.indexOf(level) + 1];
  if (!nextLevel) return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-purple-500/10 border border-purple-500/20 rounded-xl">
      <Crown size={14} className="text-purple-400 shrink-0" />
      <p className="text-xs text-purple-300 font-semibold">Nivel máximo alcanzado — eres Platinum ✨</p>
    </div>
  );
  const pct = Math.round(((visits - level.min) / (level.threshold - level.min)) * 100);
  const remaining = level.threshold - visits;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400 font-semibold">{level.name}</span>
        <span className="text-slate-500">{remaining} visita{remaining !== 1 ? 's' : ''} para <span className="text-white font-bold">{nextLevel.name}</span></span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${level.progressCls}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Vista principal ─────────────────────────────────────────────────
export default function VIPDashboard() {
  const { name: tenantName } = useTenant();
  const [phone, setPhone]   = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState('');
  const [result, setResult]   = useState(null); // { client, visits, citas }

  const tenantId  = resolveTenantId();
  const colPath   = tenantId === 'elegance' ? 'citas' : `tenants/${tenantId}/citas`;
  const svcPath   = tenantId === 'elegance' ? 'servicios' : `tenants/${tenantId}/servicios`;

  const [servicios, setServicios] = useState([]);
  useEffect(() => {
    withTimeout(getDocs(query(collection(db, svcPath), orderBy('orden'))), 15000, 'vip/servicios')
      .then(snap => setServicios(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(() => {});
  }, [svcPath]);

  const buscar = async () => {
    const raw = phone.trim();
    if (!raw) return;
    setLoading(true);
    setErr('');
    setResult(null);
    try {
      const norm = normPhone(raw);
      // Try normalized and raw
      const variants = [...new Set([norm, raw, `+${norm}`])];
      let allDocs = [];
      for (const v of variants) {
        const snap = await withTimeout(getDocs(
          query(collection(db, colPath),
            where('clienteTelefono', '==', v),
            where('estado', '==', 'Completada'),
            orderBy('creadoEn', 'asc'),
          )
        ), 20000, 'vip/citas-cliente').catch(() => ({ docs: [] }));
        allDocs = [...allDocs, ...snap.docs];
      }
      // Deduplicate by id
      const seen = new Set();
      const unique = allDocs.filter(d => { if (seen.has(d.id)) return false; seen.add(d.id); return true; });

      if (unique.length === 0) {
        setErr('No encontramos visitas con ese número. Verifica que sea el número registrado en la barbería.');
        return;
      }
      const first = unique[0].data();
      const last  = unique[unique.length - 1].data();
      setResult({
        visits: unique.length,
        client: {
          nombre: first.clienteNombre || 'Cliente',
          desde:  formatDate(first.creadoEn),
        },
        recientes: unique.slice(-3).reverse().map(d => {
          const dd = d.data();
          return { id: d.id, fecha: dd.fecha, servicio: dd.servicioNombre || '—', barbero: dd.barbero || '—' };
        }),
      });
    } catch (e) {
      setErr('Error al buscar. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const level  = result ? getLevel(result.visits) : null;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center px-4 py-10 gap-8">
      <style>{HOLO_CSS}</style>

      {/* Header */}
      <div className="text-center">
        <p className="text-xs font-black tracking-[0.5em] uppercase text-slate-500 mb-1">{tenantName}</p>
        <h1 className="text-2xl font-black text-white">Tarjeta VIP</h1>
        <p className="text-sm text-slate-400 mt-1">Descubre tu nivel y beneficios exclusivos</p>
      </div>

      {/* Lookup */}
      {!result && (
        <div className="w-full max-w-sm space-y-3">
          <div className="flex gap-2">
            <input
              type="tel"
              value={phone}
              onChange={e => { setPhone(e.target.value); setErr(''); }}
              onKeyDown={e => e.key === 'Enter' && buscar()}
              placeholder="Ej: 912345678"
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
            <button
              onClick={buscar}
              disabled={loading || !phone.trim()}
              className="px-4 py-3 rounded-xl bg-emerald-500 text-emerald-950 font-bold hover:bg-emerald-400 disabled:opacity-50 transition-all"
            >
              {loading
                ? <div className="w-4 h-4 border-2 border-emerald-900 border-t-transparent rounded-full animate-spin" />
                : <Search size={16} />
              }
            </button>
          </div>
          {err && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 leading-relaxed">
              {err}
            </p>
          )}

          {/* Niveles preview */}
          <div className="grid grid-cols-4 gap-2 pt-4">
            {LEVELS.map(l => {
              const LI = l.Icon;
              return (
                <div key={l.name} className="flex flex-col items-center gap-1.5 p-2.5 bg-slate-900 border border-slate-800 rounded-xl">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: `rgba(${l.holoRgb},0.15)`, border: `1px solid rgba(${l.holoRgb},0.3)` }}>
                    <LI size={14} style={{ color: l.accent }} />
                  </div>
                  <p className="text-[9px] font-black tracking-wider uppercase text-slate-400">{l.name}</p>
                  <p className="text-[8px] text-slate-600">{l.min === 20 ? '20+' : `${l.min}–${l.threshold - 1}`} v.</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Card + Info */}
      {result && level && (
        <div className="w-full max-w-sm space-y-6">
          <HoloCard
            client={result.client}
            visits={result.visits}
            level={level}
            tenantName={tenantName}
          />

          <LevelProgress visits={result.visits} level={level} />

          {/* Beneficios */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">Tus beneficios</p>
            {level.benefits.map(b => (
              <div key={b} className="flex items-start gap-2">
                <ChevronRight size={13} className="shrink-0 mt-0.5" style={{ color: level.accent }} />
                <p className="text-sm text-slate-300">{b}</p>
              </div>
            ))}
          </div>

          {/* Visitas recientes */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">Últimas visitas</p>
            {result.recientes.map(c => (
              <div key={c.id} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: `rgba(${level.holoRgb},0.15)` }}>
                  <Scissors size={12} style={{ color: level.accent }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{c.servicio}</p>
                  <p className="text-xs text-slate-500">{c.fecha} · {c.barbero}</p>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => { setResult(null); setPhone(''); }}
            className="w-full py-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            Buscar otro número
          </button>
        </div>
      )}

      {/* ── Servicios ─────────────────────────────────────────────── */}
      {servicios.length > 0 && (
        <div className="w-full max-w-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-800" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Nuestros servicios</p>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {servicios.map(s => (
              <div key={s.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                {s.imagen ? (
                  <div className="w-full overflow-hidden bg-slate-800" style={{ aspectRatio: '4/3' }}>
                    <img
                      src={s.imagen}
                      alt={s.nombre}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="w-full flex items-center justify-center bg-slate-800/60" style={{ aspectRatio: '4/3' }}>
                    <i className={`ph ${s.icono || 'ph-scissors'} text-3xl text-slate-600`} />
                  </div>
                )}
                <div className="p-3">
                  <p className="text-white text-xs font-semibold leading-snug">{s.nombre}</p>
                  {s.descripcion && (
                    <p className="text-slate-500 text-[11px] mt-0.5 line-clamp-2 leading-snug">{s.descripcion}</p>
                  )}
                  <p className="text-slate-400 text-xs mt-1 font-bold">
                    ${Number(s.precio || 0).toLocaleString('es-CL')}
                    <span className="text-slate-600 font-normal ml-1">{s.duracion} min</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
