// Referidos.jsx — Programa de referidos B2B (SaaS growth loop).
//
//   • Cada tenant tiene un código único (auto-generado al primer ingreso).
//   • Comparte /refiere/<código> a otros barberos.
//   • Cuando un prospecto rellena el formulario público → cae en
//     _referralSignups con status='pending'.
//   • Al confirmarse la venta (super-admin marca 'converted'), el
//     referidor gana 1 mes gratis y el nuevo tenant otro mes de bienvenida.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot, collection, query, where, orderBy } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  Sparkles, Copy, Check, Share2, Loader2, AlertCircle, Inbox,
  Send, Trophy, Calendar, Phone, Mail, MessageCircle, Gift,
} from 'lucide-react';
import { db } from '../lib/firebase';
import { useTenant } from '../contexts/TenantContext';
import { useAuth }   from '../contexts/AuthContext';

const SUPERADMIN_EMAILS = new Set(['ignaciiio.mate@gmail.com', 'barrazanicolasfabian@gmail.com']);

export default function Referidos() {
  const { id: tenantId } = useTenant();
  const { user, role } = useAuth();
  const isSuperAdmin = !!user?.email && SUPERADMIN_EMAILS.has(user.email.toLowerCase());
  const canManage = role === 'admin' || role === 'jefe' || isSuperAdmin;

  const [referral, setReferral] = useState(null); // doc _referrals/{tid}
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
      // Si el índice compuesto aún no se creó, Firestore lo pide en consola.
      // Por ahora caemos en lista vacía sin romper la UI.
      console.warn('[referidos] signups stream warning:', e?.message);
      setSignups([]);
    });
    return () => unsub();
  }, [tenantId]);

  // ── Generar/asegurar código ───────────────────────────────────────
  const ensureCode = useCallback(async () => {
    setErr(null);
    setGenerating(true);
    try {
      const fn = httpsCallable(getFunctions(undefined, 'us-central1'), 'referidosAsegurarCodigo');
      await fn({});
      // El doc se actualiza vía onSnapshot, no hacemos setState aquí.
    } catch (e) {
      console.error('[referidos] asegurarCodigo:', e);
      setErr(e?.message || 'No se pudo generar el código.');
    } finally {
      setGenerating(false);
    }
  }, []);

  // Auto-genera el código al primer ingreso si no existe.
  useEffect(() => {
    if (!loadingRef && !referral && canManage) { void ensureCode(); }
  }, [loadingRef, referral, canManage, ensureCode]);

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

  if (!canManage) {
    return <NoAccess />;
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
      {/* Hero / Código + share */}
      <section className="rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-800 p-6 text-white shadow-xl">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/15 ring-1 ring-white/25">
            <Gift size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-100/90">Programa de referidos</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight">Gana 1 mes gratis por cada barbería que invites.</h1>
            <p className="mt-1 text-sm text-emerald-50/90 leading-relaxed">
              Comparte tu link único. Cuando una barbería invitada activa su agenda,
              te abonamos <b className="text-white">1 mes gratis</b> y otro a quien invitaste.
            </p>
          </div>
        </div>

        {/* Código + link */}
        <div className="mt-5 rounded-xl bg-white/10 backdrop-blur-sm ring-1 ring-white/15 p-4">
          {loadingRef || generating ? (
            <div className="flex items-center justify-center py-2 text-sm font-semibold text-emerald-50">
              <Loader2 size={16} className="animate-spin mr-2" /> Generando tu código…
            </div>
          ) : !referral?.code ? (
            <button
              type="button"
              onClick={() => void ensureCode()}
              className="w-full rounded-lg bg-white py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-50"
            >
              Generar mi código
            </button>
          ) : (
            <>
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-100/85">Tu link</p>
              <p className="mt-1 font-mono text-base sm:text-lg font-extrabold tracking-tight break-all text-white">
                bioo.cl/refiere/<span className="text-emerald-200">{referral.code}</span>
              </p>
            </>
          )}
        </div>

        {referral?.code && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={copyLink}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-white py-2.5 text-sm font-bold text-emerald-700 transition active:scale-95"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 rounded-lg bg-[#25D366] py-2.5 text-sm font-bold text-white transition active:scale-95"
            >
              <MessageCircle size={16} /> WhatsApp
            </a>
            <button
              type="button"
              onClick={shareNative}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-white/15 py-2.5 text-sm font-bold text-white ring-1 ring-white/25 transition active:scale-95"
            >
              <Share2 size={16} /> Compartir
            </button>
          </div>
        )}

        {err && <p className="mt-3 text-sm text-amber-100">{err}</p>}
      </section>

      {/* Stats */}
      <section className="grid grid-cols-3 gap-3">
        <StatCard icon={Send} label="Invitados" value={totales.signups} accent="emerald" />
        <StatCard icon={Trophy} label="Convertidos" value={totales.conversiones} accent="amber" />
        <StatCard icon={Gift} label="Meses gratis" value={totales.mesesGratis} accent="violet" />
      </section>

      {/* Lista de signups */}
      <section className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <header className="flex items-center gap-2 border-b border-neutral-100 px-5 py-4">
          <Inbox size={18} className="text-neutral-500" />
          <h2 className="text-sm font-bold text-neutral-800">Quiénes llegaron por tu link</h2>
          <span className="ml-auto rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-bold text-neutral-600">
            {signups.length}
          </span>
        </header>

        {signups.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-neutral-400">
            Aún no hay invitados. Comparte tu link y aparecerán aquí en tiempo real.
          </div>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {signups.map((s) => (
              <SignupRow key={s.id} signup={s} isSuperAdmin={isSuperAdmin} />
            ))}
          </ul>
        )}
      </section>

      <p className="px-2 text-center text-[11px] text-neutral-400">
        Los meses gratis se abonan a tu cuenta cuando la barbería invitada activa su agenda
        de pago. Pueden tardar hasta 7 días en aplicarse — escríbenos por Soporte para confirmar.
      </p>
    </div>
  );
}

/* ── Subcomponentes ─────────────────────────────────────────────── */

function StatCard({ icon: Icon, label, value, accent }) {
  const tones = {
    emerald: 'from-emerald-50 text-emerald-700 ring-emerald-100',
    amber:   'from-amber-50 text-amber-700 ring-amber-100',
    violet:  'from-violet-50 text-violet-700 ring-violet-100',
  };
  const tone = tones[accent] || tones.emerald;
  return (
    <div className={`rounded-2xl bg-gradient-to-br to-white p-4 ring-1 ring-black/[0.04] ${tone}`}>
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
        <Icon size={14} /> <span>{label}</span>
      </div>
      <p className="mt-2 text-2xl font-black tracking-tight text-neutral-900">{value}</p>
    </div>
  );
}

function SignupRow({ signup, isSuperAdmin }) {
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
    <li className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p className="truncate text-sm font-bold text-neutral-900">{signup.prospectName}</p>
          <p className="truncate text-xs text-neutral-500">· {signup.prospectBarberia}</p>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-neutral-500">
          {signup.prospectPhone && <span className="inline-flex items-center gap-1"><Phone size={11} />{signup.prospectPhone}</span>}
          {signup.prospectEmail && <span className="inline-flex items-center gap-1"><Mail size={11} />{signup.prospectEmail}</span>}
          {signup.prospectCity && <span>· {signup.prospectCity}</span>}
          <span className="inline-flex items-center gap-1"><Calendar size={11} />{fechaStr}</span>
        </div>
        {signup.prospectMessage && (
          <p className="mt-1 line-clamp-2 text-xs italic text-neutral-400">"{signup.prospectMessage}"</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <StatusPill status={status} />
        {waLink && (
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="grid h-9 w-9 place-items-center rounded-lg bg-[#25D366]/10 text-[#1ba954] hover:bg-[#25D366]/20"
            aria-label="Escribir por WhatsApp"
          >
            <MessageCircle size={16} />
          </a>
        )}
        {isSuperAdmin && status === 'pending' && (
          <button
            type="button"
            onClick={convertir}
            disabled={busy}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {busy ? '…' : 'Convertir'}
          </button>
        )}
      </div>
    </li>
  );
}

function StatusPill({ status }) {
  if (status === 'converted') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-bold text-emerald-700">
        <Trophy size={11} /> Convertido
      </span>
    );
  }
  if (status === 'contacted') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-700">
        Contactado
      </span>
    );
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-1 text-[11px] font-bold text-neutral-500">
        Rechazado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-1 text-[11px] font-bold text-violet-700">
      <Sparkles size={11} /> Pendiente
    </span>
  );
}

function NoAccess() {
  return (
    <div className="mx-auto max-w-md p-6 mt-12 rounded-2xl bg-amber-50 ring-1 ring-amber-200">
      <div className="flex items-start gap-3">
        <AlertCircle size={20} className="mt-0.5 shrink-0 text-amber-500" />
        <div>
          <p className="text-sm font-bold text-amber-900">Solo administradores</p>
          <p className="mt-1 text-xs text-amber-700">
            El programa de referidos lo administra el dueño / admin del local.
          </p>
        </div>
      </div>
    </div>
  );
}
