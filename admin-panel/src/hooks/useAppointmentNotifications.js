import { useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { resolveTenantId } from '../lib/tenantUtils';

function citasCol() {
  const tid = resolveTenantId();
  return tid === 'elegance'
    ? collection(db, 'citas')
    : collection(db, `tenants/${tid}/citas`);
}

function reservasCol() {
  const tid = resolveTenantId();
  return tid === 'elegance'
    ? collection(db, 'product_reservations')
    : collection(db, `tenants/${tid}/product_reservations`);
}

// ── Badge ─────────────────────────────────────────────────────────
let _badge = 0;

function addBadge() {
  _badge++;
  navigator.setAppBadge?.(_badge).catch(() => {});
}

function resetBadge() {
  _badge = 0;
  navigator.clearAppBadge?.().catch(() => {});
}

// ── AudioContext compartido — se reutiliza y se reanuda si fue suspendido ──
let _audioCtx = null;

function getAudioCtx() {
  if (!_audioCtx || _audioCtx.state === 'closed') {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return _audioCtx;
}

// Tono diferente al del chat (dos notas ascendentes — "ding-dong")
async function playAppointmentBell() {
  // Vibración — funciona en primer y segundo plano
  navigator.vibrate?.([200, 100, 200]);

  // Sonido — se reanuda el contexto de audio si el tab está en segundo plano
  try {
    const ctx = getAudioCtx();
    if (ctx.state === 'suspended') await ctx.resume();

    [
      { freq: 698, start: 0,    dur: 0.5 },
      { freq: 880, start: 0.22, dur: 0.5 },
    ].forEach(({ freq, start, dur }) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      gain.gain.setValueAtTime(0.28, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime  + start + dur);
    });
  } catch (_) { /* autoplay bloqueado */ }
}

export function useAppointmentNotifications() {
  const isInitialCitas    = useRef(true);
  const isInitialReservas = useRef(true);
  const citasUnsub        = useRef(null);
  const reservasUnsub     = useRef(null);

  useEffect(() => {
    // Limpiar badge al hacer foco o volver al panel
    const onVisible = () => { if (document.visibilityState === 'visible') resetBadge(); };
    const onFocus   = () => resetBadge();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);

    // Limpiar badge residual que pudo dejar el SW (app cerrada → push → reabre)
    resetBadge();

    const authUnsub = onAuthStateChanged(auth, user => {
      if (citasUnsub.current)    { citasUnsub.current();    citasUnsub.current    = null; }
      if (reservasUnsub.current) { reservasUnsub.current(); reservasUnsub.current = null; }

      if (!user) {
        isInitialCitas.current    = true;
        isInitialReservas.current = true;
        return;
      }

      // ── Listener de citas ──────────────────────────────────────────
      isInitialCitas.current = true;
      const qCitas = query(citasCol(), orderBy('creadoEn', 'desc'));

      citasUnsub.current = onSnapshot(qCitas, snap => {
        if (isInitialCitas.current) { isInitialCitas.current = false; return; }

        snap.docChanges().forEach(change => {
          if (change.type !== 'added') return;
          const data          = change.doc.data();
          const esPropia      = !!data.clienteUid && data.clienteUid === user.uid;
          if (esPropia) return;

          playAppointmentBell();
          if (document.visibilityState !== 'visible') addBadge();
        });
      });

      // ── Listener de reservas de productos ─────────────────────────
      isInitialReservas.current = true;
      const qReservas = query(reservasCol(), where('status', '==', 'pending'));

      reservasUnsub.current = onSnapshot(qReservas, snap => {
        if (isInitialReservas.current) { isInitialReservas.current = false; return; }

        snap.docChanges().forEach(change => {
          if (change.type !== 'added') return;
          if (change.doc.data().userId === user.uid) return;

          playAppointmentBell();
          if (document.visibilityState !== 'visible') addBadge();
        });
      });
    });

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
      authUnsub();
      if (citasUnsub.current)    citasUnsub.current();
      if (reservasUnsub.current) reservasUnsub.current();
    };
  }, []);
}
