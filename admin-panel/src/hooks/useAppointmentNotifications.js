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

// Tono diferente al del chat (dos notas ascendentes — "ding-dong")
function playAppointmentBell() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
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
  } catch (_) { /* autoplay bloqueado — silencioso */ }
}

export function useAppointmentNotifications() {
  const isInitialCitas    = useRef(true);
  const isInitialReservas = useRef(true);
  const citasUnsub        = useRef(null);
  const reservasUnsub     = useRef(null);

  useEffect(() => {
    const authUnsub = onAuthStateChanged(auth, user => {

      // Limpiar listeners anteriores
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
          const data = change.doc.data();
          const esReservaCliente = !!data.clienteUid;
          const esCreadorActual  = data.clienteUid === user.uid;
          if (esReservaCliente && !esCreadorActual) playAppointmentBell();
          else if (!esReservaCliente) playAppointmentBell();
        });
      });

      // ── Listener de reservas de productos ─────────────────────────
      isInitialReservas.current = true;
      const qReservas = query(reservasCol(), where('status', '==', 'pending'));

      reservasUnsub.current = onSnapshot(qReservas, snap => {
        if (isInitialReservas.current) { isInitialReservas.current = false; return; }

        snap.docChanges().forEach(change => {
          if (change.type !== 'added') return;
          // Solo sonar si la reserva no la hizo el propio admin
          const data = change.doc.data();
          if (data.userId !== user.uid) playAppointmentBell();
        });
      });
    });

    return () => {
      authUnsub();
      if (citasUnsub.current)    citasUnsub.current();
      if (reservasUnsub.current) reservasUnsub.current();
    };
  }, []);
}
