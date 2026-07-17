import { useState, useEffect } from 'react';

/* ── Logo de Claude (sunburst, color arcilla oficial ~#D97757) ──────
   Aproximación en SVG del isotipo de Claude: 12 rayos redondeados que
   irradian del centro. Se usa para señalar que el asistente corre con
   la IA de Claude. */
export function ClaudeLogo({ size = 16, className = '' }) {
  const N = 12;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
      <g fill="#D97757">
        {Array.from({ length: N }).map((_, i) => (
          <rect
            key={i}
            x="11.05" y="2.4" width="1.9" height="7.4" rx="0.95"
            transform={`rotate(${(360 / N) * i} 12 12)`}
          />
        ))}
      </g>
    </svg>
  );
}

/* Badge "Con la inteligencia de Claude". */
export function ClaudeBadge({ className = '' }) {
  return (
    <div className={`inline-flex items-center gap-2 rounded-full bg-slate-900/70 border border-slate-700/60 px-3 py-1.5 ${className}`}>
      <ClaudeLogo size={14} />
      <span className="text-[11px] font-semibold text-slate-300 whitespace-nowrap">
        Con la inteligencia de <span className="text-white">Claude</span>
      </span>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-0.5">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-slate-400"
          style={{ animation: 'waDot 1.2s infinite', animationDelay: `${i * 0.16}s` }}
        />
      ))}
    </span>
  );
}

/* ── Vista previa EN VIVO de un chat de WhatsApp (animada, en loop) ──
   messages: [{ side:'in'|'out', text }]   in = el local (izq/blanco),
                                            out = el cliente (der/verde)
   timeline: [{ count, typing, dur }]      count = mensajes visibles,
                                            typing = burbuja "escribiendo…". */
export function WaChatPreview({ headerName = 'Tu Local', avatar = 'B', messages = [], timeline = [], height = 300 }) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!timeline.length) return;
    const dur = timeline[frame]?.dur || 2000;
    const t = setTimeout(() => setFrame(f => (f + 1) % timeline.length), dur);
    return () => clearTimeout(t);
  }, [frame, timeline]);

  const cur     = timeline[frame] || { count: messages.length, typing: false };
  const visible = messages.slice(0, cur.count);

  return (
    <div
      className="rounded-2xl overflow-hidden border border-black/10 shadow-xl shadow-black/25 flex flex-col"
      style={{ height }}
    >
      {/* keyframes locales */}
      <style>{`
        @keyframes waIn { from { opacity:0; transform:translateY(6px) scale(0.98); } to { opacity:1; transform:none; } }
        @keyframes waDot { 0%,60%,100% { opacity:0.3; transform:translateY(0); } 30% { opacity:1; transform:translateY(-2px); } }
      `}</style>

      {/* Header WhatsApp */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 shrink-0" style={{ background: '#075e54' }}>
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-[13px] font-bold text-white shrink-0">
          {avatar}
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-white leading-tight truncate">{headerName}</p>
          <p className="text-[10px] leading-tight" style={{ color: 'rgba(220,248,198,0.8)' }}>en línea</p>
        </div>
      </div>

      {/* Chat */}
      <div
        className="flex-1 overflow-hidden px-3 py-3 flex flex-col gap-1.5 justify-end"
        style={{
          backgroundColor: '#e5ddd5',
          backgroundImage:
            'radial-gradient(circle at 20% 15%, rgba(0,0,0,0.025) 0 1px, transparent 1px), radial-gradient(circle at 65% 55%, rgba(0,0,0,0.025) 0 1px, transparent 1px)',
          backgroundSize: '26px 26px',
        }}
      >
        {visible.map((m, i) => (
          <div key={i} className={`flex ${m.side === 'out' ? 'justify-end' : 'justify-start'}`} style={{ animation: 'waIn .32s ease' }}>
            <div
              className={`max-w-[82%] px-2.5 py-1.5 rounded-lg text-[12px] leading-snug shadow-sm ${
                m.side === 'out' ? 'rounded-tr-none' : 'rounded-tl-none'
              }`}
              style={{ background: m.side === 'out' ? '#dcf8c6' : '#ffffff', color: '#1f2937' }}
            >
              {m.text}
            </div>
          </div>
        ))}

        {cur.typing && (
          <div className="flex justify-start" style={{ animation: 'waIn .2s ease' }}>
            <div className="rounded-lg rounded-tl-none px-3 py-2 shadow-sm" style={{ background: '#ffffff' }}>
              <TypingDots />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* Cabecera "VISTA PREVIA · EN VIVO" (para acompañar el chat). */
export function LivePreviewHeader() {
  return (
    <div className="flex items-center justify-between mb-2 px-1">
      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Vista previa</span>
      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> En vivo
      </span>
    </div>
  );
}
