// MembershipCard.jsx — Tarjeta "Elegance Pass" para el dashboard del cliente.
// Cambia visual según el plan (Silver / Gold / Black).
// Uso: <MembershipCard tenantId={id} uid={uid} />

import { useMembership }       from '../hooks/useMembership';
import { PLANES, formatPrecio } from '../lib/plans';
import { CrownIcon, ScissorsIcon, SparklesIcon, ShieldCheckIcon } from 'lucide-react';

/* ── Íconos por tipo de servicio ─────────────────────────────── */
const SVC_META = {
  cortes:  { label: 'Cortes',  Icon: ScissorsIcon   },
  barba:   { label: 'Barba',   Icon: SparklesIcon   },
  masaje:  { label: 'Masaje',  Icon: ShieldCheckIcon },
};

/* ── Gradiente por tier ──────────────────────────────────────── */
const PLAN_GRADIENTS = {
  silver: 'linear-gradient(135deg, #4b5563 0%, #1f2937 60%, #111827 100%)',
  gold:   'linear-gradient(135deg, #b8960c 0%, #7c5c06 60%, #3d2c00 100%)',
  black:  'linear-gradient(135deg, #1c1c1e 0%, #0a0a0a 60%, #000000 100%)',
};

/* ── Botón de suscripción (sin plan) ─────────────────────────── */
function JoinCard({ onJoin }) {
  return (
    <div
      className="rounded-3xl p-6 relative overflow-hidden cursor-pointer group"
      style={{
        background: 'linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%)',
        border: '1px solid rgba(212,175,55,0.25)',
        boxShadow: '0 0 40px rgba(212,175,55,0.06)',
      }}
      onClick={onJoin}
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: 'radial-gradient(circle at center, rgba(212,175,55,0.08) 0%, transparent 70%)' }} />

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.2)' }}>
            <CrownIcon size={18} style={{ color: '#D4AF37' }} />
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-[0.3em] uppercase" style={{ color: '#D4AF37' }}>
              Elegance Pass
            </p>
            <p className="text-white font-bold text-base leading-tight">Club VIP</p>
          </div>
        </div>

        <p className="text-gray-400 text-sm leading-relaxed mb-5">
          Suscríbete a un plan mensual y agenda tus cortes sin costo adicional. Desde{' '}
          <span style={{ color: '#D4AF37' }}>
            {formatPrecio(PLANES.silver.precio)}/mes.
          </span>
        </p>

        <button
          onClick={e => { e.stopPropagation(); onJoin?.(); }}
          className="w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, #D4AF37 0%, #b8960c 100%)',
            color: '#000',
            boxShadow: '0 0 24px rgba(212,175,55,0.3)',
          }}
        >
          <CrownIcon size={16} />
          Unirme al Club VIP
        </button>
      </div>
    </div>
  );
}

/* ── Barra de uso por servicio ───────────────────────────────── */
function ServiceBar({ label, Icon, restantes, total, badgeColor }) {
  const pct = total > 0 ? (restantes / total) * 100 : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon size={11} style={{ color: badgeColor }} />
          <span className="text-xs font-semibold" style={{ color: badgeColor }}>{label}</span>
        </div>
        <span className="text-xs font-bold text-white">{restantes}/{total}</span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: pct > 30
              ? badgeColor
              : pct > 0 ? '#ef4444' : 'transparent',
          }}
        />
      </div>
    </div>
  );
}

/* ── Tarjeta activa ──────────────────────────────────────────── */
function ActiveCard({ sub, plan }) {
  const vence = sub.currentPeriodEnd?.toDate?.();
  const diasRestantes = vence
    ? Math.max(0, Math.ceil((vence - new Date()) / 86_400_000))
    : 0;

  const remaining = sub.remainingServices ?? {};

  return (
    <div
      className="rounded-3xl p-6 relative overflow-hidden"
      style={{
        background: PLAN_GRADIENTS[plan.id] ?? PLAN_GRADIENTS.gold,
        border: `1px solid rgba(${plan.id === 'gold' ? '212,175,55' : plan.id === 'silver' ? '156,163,175' : '167,139,250'},0.35)`,
        boxShadow: `0 4px 40px rgba(0,0,0,0.4)`,
      }}
    >
      {/* Shimmer decorativo */}
      <div className="absolute top-0 left-0 right-0 h-px"
        style={{ background: `linear-gradient(to right, transparent, ${plan.color.badge}60, transparent)` }} />

      {/* Header */}
      <div className="flex items-start justify-between mb-5 relative z-10">
        <div>
          <p className="text-[10px] font-black tracking-[0.35em] uppercase mb-1"
            style={{ color: plan.color.badge }}>
            Elegance Pass
          </p>
          <h2 className="text-2xl font-black tracking-tight" style={{ color: plan.color.text }}>
            {plan.nombre}
          </h2>
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `rgba(255,255,255,0.08)`, border: `1px solid rgba(255,255,255,0.12)` }}>
          <CrownIcon size={18} style={{ color: plan.color.badge }} />
        </div>
      </div>

      {/* Servicios restantes */}
      <div className="space-y-3 mb-5 relative z-10">
        {Object.entries(SVC_META).map(([key, { label, Icon }]) => {
          const total   = plan.servicios[key] ?? 0;
          if (total === 0) return null;
          const restantes = remaining[key] ?? 0;
          return (
            <ServiceBar
              key={key}
              label={label}
              Icon={Icon}
              restantes={restantes}
              total={total}
              badgeColor={plan.color.badge}
            />
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between relative z-10">
        <div>
          <p className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: `${plan.color.text}80` }}>
            Vence en
          </p>
          <p className="text-sm font-bold" style={{ color: plan.color.text }}>
            {diasRestantes} días
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: `${plan.color.text}80` }}>
            Plan
          </p>
          <p className="text-sm font-bold" style={{ color: plan.color.badge }}>
            {formatPrecio(plan.precio)}/mes
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Componente principal ────────────────────────────────────── */
export default function MembershipCard({ tenantId, uid, onJoin, onManage }) {
  const { sub, plan, activa, loading } = useMembership(tenantId, uid);

  if (loading) {
    return (
      <div className="rounded-3xl h-48 animate-pulse"
        style={{ background: '#111', border: '1px solid #1e1e1e' }} />
    );
  }

  if (!activa || !plan) {
    return <JoinCard onJoin={onJoin} />;
  }

  return (
    <div onClick={onManage} className="cursor-pointer">
      <ActiveCard sub={sub} plan={plan} />
    </div>
  );
}
