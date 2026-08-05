import { Star, Check, Heart, Coffee, Utensils, Wine, Scissors } from 'lucide-react';

// Preview visual (aproximado) de la tarjeta Google Wallet, para que el dueño
// vea EN VIVO cómo va a quedar antes de provisionar. NO es el render real de
// Google — es un mockup: dimensiones, colores, tipografía y jerarquía apuntan
// al look de la tarjeta emitida, con licencias visuales para que se lea bien
// en el panel.
//
// Recibe cfg (mismo shape que configuracion/wallet) + preview data (nombre,
// sellos). Reactivo: cualquier cambio de props re-renderiza.

const ICONS = {
  check:    Check,
  star:     Star,
  heart:    Heart,
  coffee:   Coffee,
  fork:     Utensils,
  wine:     Wine,
  scissors: Scissors,
};

// Luminosidad de un hex (0-1) para elegir texto blanco o negro.
function lum(hex) {
  const s = String(hex || '').replace('#', '').padEnd(6, '0').slice(0, 6);
  const r = parseInt(s.slice(0, 2), 16) || 0;
  const g = parseInt(s.slice(2, 4), 16) || 0;
  const b = parseInt(s.slice(4, 6), 16) || 0;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}
const contrast = (hex) => (lum(hex) > 0.6 ? '#0b0b0b' : '#ffffff');

export default function WalletMockup({
  cfg = {},
  nombreCliente = 'Tu Cliente',
  sellosDisp = 3,
  target = 10,
  rango = 'Silver',
}) {
  const accent = cfg.accent   || '#c9a84c';
  const bg     = cfg.bg       || '#0a0a0a';
  const programName = cfg.programName || 'Club de Fidelidad';
  const issuerName  = cfg.issuerName  || 'SynapTech';
  const iconId = cfg.stampIcon || 'check';
  const Icon   = ICONS[iconId] || Check;
  const txtBg  = contrast(bg);
  const filled = Math.min(sellosDisp, target);

  // Logo default: usa fallback endpoint si no hay logoUrl real.
  const iniciales = programName
    .split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase().slice(0, 3) || 'B';
  const logoUrl = cfg.logoUrl
    || `https://us-central1-barberia-elegance.cloudfunctions.net/walletFallbackLogo?text=${encodeURIComponent(iniciales)}&bg=${accent.replace('#', '')}`;

  // Render de estampas: círculos llenos con ícono para las completadas,
  // vacíos para las pendientes, ★ para la meta final.
  const stamps = Array.from({ length: target }, (_, i) => {
    const idx = i + 1;
    const done = idx <= filled;
    const isTarget = idx === target;
    return { idx, done, isTarget };
  });

  return (
    <div className="w-full max-w-[340px] mx-auto select-none">
      {/* Card real (Google Wallet-ish): esquinas redondeadas grandes,
          fondo con degradado sutil hacia el color acento en la esquina */}
      <div
        className="relative rounded-[26px] overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)]"
        style={{
          background: `linear-gradient(135deg, ${bg} 0%, ${bg} 65%, ${accent}22 100%)`,
          border: `1px solid ${accent}30`,
        }}
      >
        {/* Header: logo + issuer + programName */}
        <div className="px-5 pt-5 pb-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-full shrink-0 overflow-hidden ring-1 ring-white/10 bg-white/5">
            {/* Google Wallet cuadra el logo dentro de un círculo — replicamos. */}
            <img
              src={logoUrl}
              alt="logo"
              className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p style={{ color: txtBg + 'AA' }} className="text-[10px] font-medium uppercase tracking-[0.14em] truncate">
              {issuerName}
            </p>
            <p style={{ color: txtBg }} className="text-[15px] font-bold leading-tight truncate mt-0.5">
              {programName}
            </p>
          </div>
          {/* Google Wallet muestra el ícono del programa arriba a la derecha */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            style={{ background: accent }}
          >
            <Icon size={16} color={contrast(accent)} strokeWidth={2.5} />
          </div>
        </div>

        {/* Balance grande — "N / M sellos" o "N puntos" */}
        <div className="px-5 pb-4">
          <p style={{ color: txtBg + '99' }} className="text-[10px] font-medium uppercase tracking-widest">Sellos</p>
          <p style={{ color: txtBg }} className="text-[38px] font-black leading-none mt-1 tabular-nums">
            {filled} <span style={{ color: txtBg + '55' }} className="text-[22px] font-bold">/ {target}</span>
          </p>
        </div>

        {/* Strip de estampas (aprox del heroImage) */}
        <div
          className="px-5 py-4"
          style={{
            background: `linear-gradient(180deg, ${accent}0F 0%, ${accent}05 100%)`,
            borderTop: `1px solid ${accent}20`,
          }}
        >
          <div
            className={`grid gap-1.5`}
            style={{ gridTemplateColumns: `repeat(${Math.min(target, 10)}, minmax(0, 1fr))` }}
          >
            {stamps.slice(0, 10).map(({ idx, done, isTarget }) => (
              <div
                key={idx}
                className="aspect-square rounded-full flex items-center justify-center transition-all"
                style={{
                  background: done ? accent : txtBg === '#ffffff' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                  border: `1.5px solid ${done ? accent : txtBg + '25'}`,
                  boxShadow: done ? `0 0 12px -2px ${accent}` : 'none',
                }}
              >
                {done
                  ? (isTarget
                      ? <Star size={12} color={contrast(accent)} fill={contrast(accent)} />
                      : <Icon size={11} color={contrast(accent)} strokeWidth={3} />)
                  : (isTarget
                      ? <Star size={11} color={txtBg + '55'} strokeWidth={2} />
                      : null)}
              </div>
            ))}
          </div>
          {target > 10 && (
            <p style={{ color: txtBg + '55' }} className="text-[9px] mt-2 text-center">
              +{target - 10} sellos más
            </p>
          )}
        </div>

        {/* Footer: rango + nombre cliente */}
        <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderTop: `1px solid ${accent}20` }}>
          <div className="min-w-0">
            <p style={{ color: txtBg + '99' }} className="text-[9px] font-medium uppercase tracking-widest">Rango</p>
            <p style={{ color: txtBg }} className="text-[13px] font-bold truncate">{rango}</p>
          </div>
          <div className="min-w-0 text-right">
            <p style={{ color: txtBg + '99' }} className="text-[9px] font-medium uppercase tracking-widest">Cliente</p>
            <p style={{ color: txtBg }} className="text-[13px] font-bold truncate max-w-[160px]">{nombreCliente}</p>
          </div>
        </div>
      </div>

      {/* Pie: aclaración de que es una previsualización */}
      <p className="text-[10px] text-slate-500 text-center mt-3 leading-relaxed">
        Previsualización aproximada · Google Wallet renderiza en el celular con
        sus tipografías y anima el color en modo oscuro.
      </p>
    </div>
  );
}
