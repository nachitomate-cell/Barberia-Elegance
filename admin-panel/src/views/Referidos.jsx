// Referidos.jsx — Programa de referidos B2B (SaaS growth loop).
// Rediseño premium dark — alineado con la estética del admin-panel:
// gradientes, glow sutil, animaciones framer-motion, jerarquía visual
// fuerte. Lógica de estado intacta (misma CF, mismos snapshots).

import { useCallback, useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot, collection, query, where, orderBy } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Copy, Check, Share2, Loader2, AlertCircle, Inbox,
  Send, Trophy, Calendar, Phone, Mail, MessageCircle, Gift,
  Link2, ArrowRight, Megaphone, Handshake, Award, Rocket,
} from 'lucide-react';
import { db } from '../lib/firebase';
import { useTenant } from '../contexts/TenantContext';
import { useAuth }   from '../contexts/AuthContext';

const SUPERADMIN_EMAILS = new Set(['ignaciiio.mate@gmail.com']);

export default function Referidos() {
  const { id: tenantId } = useTenant();
  const { user, role } = useAuth();
  const isSuperAdmin = !!user?.email && SUPERADMIN_EMAILS.has(user.email.toLowerCase());
  const canManage = role === 'admin' || role === 'jefe' || isSuperAdmin;

  const [referral, setReferral] = useState(null);
  const [signups, setSignups]   = useState([]);
  const [loadingRef, setLoadingRef] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [err, setErr] = useState(null);
  const [copied, setCopied] = useState(false);

  // ── Doc _referrals/{tenantId} (live) ──────────────────────────────
  useEffect(() => {
    if (!tenantId) return;
    setLoadingRef(true);
    const unsub = onSnapshot(
      doc(db, '_referrals', tenantId),
      (snap) => { setReferral(snap.exists() ? { id: snap.id, ...snap.data() } : null); setLoadingRef(false); },
      (e) => { console.error('[referidos] _referrals:', e); setLoadingRef(false); },
    );
    return () => unsub();
  }, [tenantId]);

  // ── Subcolección de signups del tenant referidor ──────────────────
  useEffect(() => {
    if (!tenantId) return;
    const q = query(
      collection(db, '_referralSignups'),
      where('referrerTenantId', '==', tenantId),
      orderBy('createdAt', 'desc'),
    );
    const unsub = onSnapshot(q, (snap) => {
      setSignups(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, (e) => {
      console.warn('[referidos] signups stream warning:', e?.message);
      setSignups([]);
    });
    return () => unsub();
  }, [tenantId]);

  // ── Generar/asegurar código ───────────────────────────────────────
  const ensureCode = useCallback(async () => {
    if (!tenantId) { setErr('No pudimos identificar tu local. Recarga la página.'); return; }
    setErr(null);
    setGenerating(true);
    try {
      const fn = httpsCallable(getFunctions(undefined, 'us-central1'), 'referidosAsegurarCodigo');
      await fn({ tenantId });
    } catch (e) {
      console.error('[referidos] asegurarCodigo:', e);
      setErr(e?.message || 'No se pudo generar el código.');
    } finally {
      setGenerating(false);
    }
  }, [tenantId]);

  const [autoTried, setAutoTried] = useState(false);
  useEffect(() => {
    if (!loadingRef && !referral && canManage && !autoTried) {
      setAutoTried(true);
      void ensureCode();
    }
  }, [loadingRef, referral, canManage, ensureCode, autoTried]);

  // ── Compartir ─────────────────────────────────────────────────────
  const shareUrl = referral?.code ? `https://bioo.cl/refiere/${referral.code}` : '';
  const shareText = `Te invito a SynapTech — agenda + club de fidelidad. 1 mes gratis para ti: ${shareUrl}`;

  const copyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* sin clipboard */ }
  };

  const shareNative = async () => {
    if (!shareUrl) return;
    if (navigator.share) {
      try { await navigator.share({ title: 'SynapTech', text: shareText, url: shareUrl }); } catch { /* cancel */ }
    } else {
      await copyLink();
    }
  };

  const waLink = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  // ── Stats ─────────────────────────────────────────────────────────
  const totales = useMemo(() => ({
    signups: referral?.signupsCount ?? signups.length,
    conversiones: referral?.conversionsCount ?? 0,
    mesesGratis: referral?.freeMonthsEarned ?? 0,
  }), [referral, signups.length]);

  if (!canManage) return <NoAccess />;

  return (
    <div data-view="referidos" className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      {/* ─────── HERO ─────── */}
      <Hero
        referral={referral}
        loadingRef={loadingRef}
        generating={generating}
        onEnsureCode={() => void ensureCode()}
        onCopy={copyLink}
        onShare={shareNative}
        copied={copied}
        waLink={waLink}
        err={err}
      />

      {/* ─────── STATS ─────── */}
      <section className="grid grid-cols-3 gap-3">
        <StatCard
          icon={Send} label="Invitados" value={totales.signups}
          ring="ring-emerald-500/20" text="text-emerald-300" bg="from-emerald-500/10"
          glow="shadow-emerald-500/10"
        />
        <StatCard
          icon={Trophy} label="Convertidos" value={totales.conversiones}
          ring="ring-amber-500/20" text="text-amber-300" bg="from-amber-500/10"
          glow="shadow-amber-500/10"
        />
        <StatCard
          icon={Gift} label="Meses gratis" value={totales.mesesGratis}
          ring="ring-violet-500/20" text="text-violet-300" bg="from-violet-500/10"
          glow="shadow-violet-500/10"
        />
      </section>

      {/* ─────── CÓMO FUNCIONA ─────── */}
      <ComoFunciona />

      {/* ─────── BONUS PLAN ANUAL + HITOS ─────── */}
      <BonusAnual conversiones={totales.conversiones} />

      {/* ─────── INVITADOS ─────── */}
      <SignupsSection signups={signups} isSuperAdmin={isSuperAdmin} />

      {/* Microcopy legal */}
      <p className="px-2 text-center text-[11px] leading-relaxed text-slate-500">
        Los meses gratis se abonan a tu cuenta cuando la barbería invitada activa su agenda
        de pago. Pueden tardar hasta 7 días en aplicarse — escríbenos por Soporte para confirmar.
      </p>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   HERO — link + acciones de compartir
   ════════════════════════════════════════════════════════════════ */
function Hero({ referral, loadingRef, generating, onEnsureCode, onCopy, onShare, copied, waLink, err }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
      className="hero-card-emerald relative overflow-hidden rounded-3xl border border-emerald-500/15 p-6 sm:p-8"
      style={{
        background:
          'linear-gradient(135deg, rgba(6,78,59,0.85) 0%, rgba(15,23,42,0.95) 60%), ' +
          'radial-gradient(ellipse at top right, rgba(132,204,22,0.3), transparent 60%)',
      }}
    >
      {/* Halo verde superior derecho */}
      <motion.div
        aria-hidden
        className="hero-halo pointer-events-none absolute -right-32 -top-32 h-72 w-72 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(132,204,22,0.35), transparent 70%)', filter: 'blur(30px)' }}
        animate={{ opacity: [0.5, 0.85, 0.5], scale: [1, 1.05, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Grid pattern sutil */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(to right, white 1px, transparent 1px), ' +
            'linear-gradient(to bottom, white 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
        }}
      />

      <div className="relative">
        {/* Eyebrow + título */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-lime-400/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-lime-300 ring-1 ring-lime-400/20">
            <Sparkles size={11} /> Programa de referidos
          </span>
        </div>

        <h1 className="mt-4 max-w-2xl text-3xl font-black tracking-tight text-primary sm:text-[34px] sm:leading-[1.1]">
          Gana{' '}
          <span
            style={{
              background: 'linear-gradient(120deg, #d9f99d 0%, #a3e635 50%, #84cc16 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            1 mes gratis
          </span>{' '}
          por cada barbería que invites.
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-emerald-50/80">
          Comparte tu link único. Cuando una barbería invitada activa su agenda,
          te abonamos <b className="text-primary">1 mes gratis</b> automáticamente — y
          otro a quien invitaste. Sin límite.
        </p>

        {/* Link display */}
        <div className="mt-6">
          {loadingRef || generating ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-5 text-sm font-semibold text-emerald-100 backdrop-blur">
              <Loader2 size={16} className="animate-spin" /> Generando tu código…
            </div>
          ) : !referral?.code ? (
            <button
              type="button"
              onClick={onEnsureCode}
              className="w-full rounded-2xl bg-lime-400 px-5 py-4 text-base font-extrabold text-emerald-950 shadow-[0_8px_30px_-8px_rgba(132,204,22,0.6)] transition-transform hover:scale-[1.01] active:scale-[0.99]"
            >
              <span className="inline-flex items-center gap-2">
                <Rocket size={18} /> Generar mi código de referido
              </span>
            </button>
          ) : (
            <motion.div
              key={referral.code}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur"
            >
              <div className="flex items-center gap-2 border-b border-white/10 px-5 py-2.5">
                <Link2 size={13} className="text-emerald-300" />
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-100/80">
                  Tu link único
                </p>
              </div>
              <p className="px-5 py-4 font-mono text-base font-extrabold tracking-tight break-all text-primary sm:text-xl">
                bioo.cl/refiere/
                <span
                  style={{
                    background: 'linear-gradient(120deg, #d9f99d 0%, #84cc16 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {referral.code}
                </span>
              </p>
            </motion.div>
          )}
        </div>

        {/* Acciones de compartir */}
        {referral?.code && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.35 }}
            className="mt-3 grid grid-cols-3 gap-2"
          >
            <ShareBtn
              onClick={onCopy}
              icon={copied ? Check : Copy}
              label={copied ? 'Copiado' : 'Copiar link'}
              tone="white"
              active={copied}
            />
            <ShareBtn href={waLink} icon={MessageCircle} label="WhatsApp" tone="whatsapp" />
            <ShareBtn onClick={onShare} icon={Share2} label="Compartir" tone="ghost" />
          </motion.div>
        )}

        {err && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2.5 text-xs text-amber-100">
            <AlertCircle size={14} className="mt-0.5 shrink-0" /> {err}
          </div>
        )}
      </div>
    </motion.section>
  );
}

function ShareBtn({ onClick, href, icon: Icon, label, tone, active }) {
  const base = 'flex items-center justify-center gap-1.5 rounded-xl px-3 py-3 text-[13px] font-bold transition-all active:scale-95';
  const tones = {
    white: `bg-white text-emerald-950 hover:bg-emerald-50 ${active ? 'ring-2 ring-emerald-300' : ''}`,
    whatsapp: 'bg-[#25D366] text-primary hover:brightness-110 shadow-[0_4px_18px_-4px_rgba(37,211,102,0.5)]',
    ghost: 'bg-white/10 text-primary ring-1 ring-white/15 backdrop-blur hover:bg-white/15',
  };
  const cls = `${base} ${tones[tone] || tones.ghost}`;
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        <Icon size={15} /> {label}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      <Icon size={15} /> {label}
    </button>
  );
}

/* ════════════════════════════════════════════════════════════════
   STAT CARD — métricas grandes con glow
   ════════════════════════════════════════════════════════════════ */
function StatCard({ icon: Icon, label, value, ring, text, bg, glow }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={`relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg ${glow} ring-1 ${ring} backdrop-blur-sm`}
      style={{
        backgroundImage: 'linear-gradient(135deg, var(--tw-gradient-from), transparent 70%)',
      }}
    >
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-gradient-to-br ${bg} to-transparent opacity-60 blur-2xl`}
      />
      <div className="relative">
        <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] ${text}`}>
          <Icon size={13} /> <span>{label}</span>
        </div>
        <p className="mt-2 text-3xl font-black tabular-nums tracking-tight text-primary sm:text-4xl">
          {value}
        </p>
      </div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════
   CÓMO FUNCIONA — flujo de 3 pasos
   ════════════════════════════════════════════════════════════════ */
function ComoFunciona() {
  const pasos = [
    {
      Icon: Megaphone,
      title: 'Compartes',
      body: 'Mandas tu link a otros barberos por WhatsApp, Instagram o boca a boca.',
      color: 'text-sky-300', ring: 'ring-sky-500/20', bg: 'bg-sky-500/10',
    },
    {
      Icon: Handshake,
      title: 'Se suman',
      body: 'Activan su agenda con SynapTech en su propia barbería desde el link.',
      color: 'text-violet-300', ring: 'ring-violet-500/20', bg: 'bg-violet-500/10',
    },
    {
      Icon: Award,
      title: 'Ganan los dos',
      body: 'Tú sumas un mes gratis. Ellos parten con un mes de bienvenida.',
      color: 'text-lime-300', ring: 'ring-lime-500/20', bg: 'bg-lime-500/10',
    },
  ];
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 backdrop-blur-sm">
      <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
        Cómo funciona
      </h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {pasos.map((p, i) => (
          <motion.div
            key={p.title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i, duration: 0.35 }}
            className="relative rounded-2xl border border-slate-800/60 bg-slate-900/60 p-4"
          >
            <div className={`mb-2.5 inline-flex h-9 w-9 items-center justify-center rounded-xl ${p.bg} ring-1 ${p.ring} ${p.color}`}>
              <p.Icon size={17} />
            </div>
            <p className="text-sm font-bold text-primary">{p.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">{p.body}</p>
            {i < pasos.length - 1 && (
              <ArrowRight
                size={16}
                className="absolute right-3 top-1/2 hidden -translate-y-1/2 translate-x-1/2 text-slate-700 sm:block"
                aria-hidden
              />
            )}
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
   BONUS ANUAL — multiplicador 2× + hitos cumulativos
   ════════════════════════════════════════════════════════════════ */
const HITOS_REFERIDOS = [
  { count: 3,  Icon: Gift,     premio: 'Renovación −10%',     desc: 'Próximo año a $18.000 por sede en vez de $20.000.' },
  { count: 5,  Icon: Sparkles, premio: 'Pantalla TV gratis',  desc: 'Módulo de pantalla TV instalado sin costo para una sede.' },
  { count: 10, Icon: Trophy,   premio: 'Un año gratis',       desc: 'Plan anual completo (12 meses) para 1 de tus sedes.' },
  { count: 20, Icon: Award,    premio: 'Embajador SynapTech', desc: 'Caso de estudio en synaptechspa.cl + listing premium + badge permanente.' },
];

function BonusAnual({ conversiones = 0 }) {
  return (
    <section className="space-y-3">
      {/* ── Banner del multiplicador 2× ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-2xl border border-amber-400/25 p-5 sm:p-6"
        style={{
          background:
            'linear-gradient(135deg, rgba(120,53,15,0.55) 0%, rgba(15,23,42,0.95) 65%), ' +
            'radial-gradient(ellipse at top right, rgba(251,191,36,0.25), transparent 60%)',
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.30), transparent 70%)', filter: 'blur(28px)' }}
        />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-200 ring-1 ring-amber-400/25">
            <Rocket size={11} /> Bonus plan anual
          </span>
          <h2 className="mt-3 text-xl font-black tracking-tight text-primary sm:text-2xl">
            Con plan anual recibes{' '}
            <span
              style={{
                background: 'linear-gradient(120deg, #fde68a 0%, #fbbf24 50%, #f59e0b 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              2 meses gratis
            </span>{' '}
            por cada referido.
          </h2>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-amber-50/75">
            Los clientes en plan mensual reciben 1 mes. Si tienes el plan anual,
            cada barbería que actives te suma <b className="text-primary">el doble</b>{' '}
            — acumulable a tu próxima renovación.
          </p>
        </div>
      </motion.div>

      {/* ── Hitos cumulativos ── */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 backdrop-blur-sm">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
              Hitos · premios extra
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Acumulables independientes del bonus anual. Se desbloquean por barbería convertida.
            </p>
          </div>
          <div className="shrink-0 rounded-full bg-slate-800 px-3 py-1 text-[11px] font-bold text-slate-300 ring-1 ring-slate-700">
            {conversiones}/20
          </div>
        </div>

        <ul className="space-y-2">
          {HITOS_REFERIDOS.map((h, i) => {
            const desbloqueado = conversiones >= h.count;
            const proximo = !desbloqueado &&
              HITOS_REFERIDOS.filter(x => conversiones < x.count)[0]?.count === h.count;
            return (
              <motion.li
                key={h.count}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * i, duration: 0.3 }}
                className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
                  desbloqueado
                    ? 'border-emerald-500/30 bg-emerald-500/[0.06]'
                    : proximo
                      ? 'border-amber-400/30 bg-amber-400/[0.05]'
                      : 'border-slate-800 bg-slate-900/40'
                }`}
              >
                {/* Contador grande */}
                <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-base font-black ring-1 ${
                  desbloqueado
                    ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/30'
                    : proximo
                      ? 'bg-amber-400/15 text-amber-300 ring-amber-400/30'
                      : 'bg-slate-800 text-slate-500 ring-slate-700'
                }`}>
                  {h.count}
                </div>
                {/* Texto */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h.Icon size={14} className={
                      desbloqueado ? 'text-emerald-300' : proximo ? 'text-amber-300' : 'text-slate-500'
                    } />
                    <p className={`text-sm font-bold ${desbloqueado ? 'text-primary' : 'text-slate-200'}`}>
                      {h.premio}
                    </p>
                    {desbloqueado && (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300 ring-1 ring-emerald-400/30">
                        ✓ Desbloqueado
                      </span>
                    )}
                    {proximo && (
                      <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300 ring-1 ring-amber-400/30">
                        Siguiente
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
                    {h.desc}
                  </p>
                </div>
              </motion.li>
            );
          })}
        </ul>

        <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
          Los hitos se contabilizan por barberías convertidas (no por invitados).
          Para reclamar un premio, escríbenos por Soporte.
        </p>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
   SIGNUPS — bandeja de invitados
   ════════════════════════════════════════════════════════════════ */
function SignupsSection({ signups, isSuperAdmin }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
      <header className="flex items-center gap-2 border-b border-slate-800 px-5 py-4">
        <Inbox size={16} className="text-slate-400" />
        <h2 className="text-sm font-bold text-primary">Quiénes llegaron por tu link</h2>
        <span className="ml-auto rounded-full bg-slate-800 px-2.5 py-0.5 text-[11px] font-bold text-slate-300 ring-1 ring-slate-700">
          {signups.length}
        </span>
      </header>

      {signups.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="divide-y divide-slate-800/70">
          <AnimatePresence initial={false}>
            {signups.map((s, i) => (
              <SignupRow key={s.id} signup={s} isSuperAdmin={isSuperAdmin} index={i} />
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-5 py-14 text-center">
      <div
        className="relative grid h-16 w-16 place-items-center rounded-2xl bg-slate-800/70 ring-1 ring-slate-700"
      >
        <Inbox size={26} className="text-slate-500" />
        <span
          aria-hidden
          className="absolute inset-0 rounded-2xl"
          style={{ boxShadow: '0 0 40px -8px rgba(132,204,22,0.25)' }}
        />
      </div>
      <p className="text-sm font-semibold text-slate-200">Aún no hay invitados</p>
      <p className="max-w-[36ch] text-xs leading-relaxed text-slate-500">
        Comparte tu link y aparecerán aquí en tiempo real. Cada barbería que active su
        agenda te suma 1 mes gratis.
      </p>
    </div>
  );
}

function SignupRow({ signup, isSuperAdmin, index }) {
  const [busy, setBusy] = useState(false);
  const [marked, setMarked] = useState(signup.status === 'converted');

  const status = marked ? 'converted' : signup.status || 'pending';
  const fecha = signup.createdAt?.toDate ? signup.createdAt.toDate() : null;
  const fechaStr = fecha
    ? new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(fecha)
    : '—';

  const waLink = signup.prospectPhone
    ? `https://wa.me/${String(signup.prospectPhone).replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hola ${signup.prospectName}, te escribo de SynapTech ✦ Vi que ${signup.referrerTenantName || 'un amigo'} te invitó. ¿Cuándo te queda bien una demo de 10 minutos?`)}`
    : null;

  const convertir = async () => {
    if (!isSuperAdmin) return;
    const newTid = window.prompt(
      `Convertir a "${signup.prospectBarberia}" — ingresa el tenantId asignado al nuevo tenant (déjalo vacío para no acreditar bienvenida):`,
      '',
    );
    if (newTid === null) return;
    setBusy(true);
    try {
      const fn = httpsCallable(getFunctions(undefined, 'us-central1'), 'referidosMarcarConvertido');
      await fn({ signupId: signup.id, convertedTenantId: newTid.trim() || null, monthsAwarded: 1 });
      setMarked(true);
    } catch (e) {
      console.error('[referidos] marcar convertido:', e);
      window.alert(e?.message || 'No se pudo marcar como convertido.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 6) * 0.04, duration: 0.3 }}
      className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-slate-800/30 sm:flex-row sm:items-center sm:gap-4"
    >
      {/* Avatar iniciales */}
      <div
        className="hidden h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-500/15 to-emerald-700/20 text-sm font-extrabold uppercase text-emerald-200 ring-1 ring-emerald-400/20 sm:grid"
        aria-hidden
      >
        {(signup.prospectName || '?').trim().charAt(0)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p className="truncate text-sm font-bold text-primary">{signup.prospectName}</p>
          <p className="truncate text-xs text-slate-400">· {signup.prospectBarberia}</p>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
          {signup.prospectPhone && (
            <span className="inline-flex items-center gap-1"><Phone size={10} />{signup.prospectPhone}</span>
          )}
          {signup.prospectEmail && (
            <span className="inline-flex items-center gap-1"><Mail size={10} />{signup.prospectEmail}</span>
          )}
          {signup.prospectCity && <span>· {signup.prospectCity}</span>}
          <span className="inline-flex items-center gap-1"><Calendar size={10} />{fechaStr}</span>
        </div>
        {signup.prospectMessage && (
          <p className="mt-1.5 line-clamp-2 rounded-lg bg-slate-800/40 px-2.5 py-1.5 text-[11px] italic text-slate-400 ring-1 ring-slate-800">
            “{signup.prospectMessage}”
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <StatusPill status={status} />
        {waLink && (
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="grid h-9 w-9 place-items-center rounded-xl bg-[#25D366]/15 text-[#25D366] ring-1 ring-[#25D366]/30 transition-transform hover:scale-105 hover:bg-[#25D366]/25"
            aria-label="Escribir por WhatsApp"
          >
            <MessageCircle size={15} />
          </a>
        )}
        {isSuperAdmin && status === 'pending' && (
          <button
            type="button"
            onClick={convertir}
            disabled={busy}
            className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold text-emerald-950 transition-transform hover:scale-[1.02] disabled:opacity-60"
          >
            {busy ? <Loader2 size={13} className="animate-spin" /> : 'Convertir'}
          </button>
        )}
      </div>
    </motion.li>
  );
}

function StatusPill({ status }) {
  const cfg = {
    converted: {
      Icon: Trophy,
      label: 'Convertido',
      cls: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/25',
    },
    contacted: {
      Icon: MessageCircle,
      label: 'Contactado',
      cls: 'bg-amber-500/15 text-amber-300 ring-amber-400/25',
    },
    rejected: {
      Icon: null,
      label: 'Rechazado',
      cls: 'bg-slate-700/40 text-slate-400 ring-slate-600/30',
    },
    pending: {
      Icon: Sparkles,
      label: 'Pendiente',
      cls: 'bg-violet-500/15 text-violet-300 ring-violet-400/25',
    },
  }[status] || {
    Icon: Sparkles,
    label: 'Pendiente',
    cls: 'bg-violet-500/15 text-violet-300 ring-violet-400/25',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${cfg.cls}`}>
      {cfg.Icon && <cfg.Icon size={11} />} {cfg.label}
    </span>
  );
}

function NoAccess() {
  return (
    <div className="mx-auto mt-12 max-w-md rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 backdrop-blur-sm">
      <div className="flex items-start gap-3">
        <AlertCircle size={20} className="mt-0.5 shrink-0 text-amber-400" />
        <div>
          <p className="text-sm font-bold text-amber-100">Solo administradores</p>
          <p className="mt-1 text-xs text-amber-200/80">
            El programa de referidos lo administra el dueño / admin del local.
          </p>
        </div>
      </div>
    </div>
  );
}
