import { useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { resolveTenantId } from '../lib/tenantUtils';

function citasCol() {
  const tid = resolveTenantId();
  return tid === 'elegance'
    ? collection(db, 'citas')
    : collection(db, `tenants/${tid}/citas`);
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
  const isInitialLoad  = useRef(true);
  const firestoreUnsub = useRef(null);

  useEffect(() => {
    const authUnsub = onAuthStateChanged(auth, user => {

      // Limpiar listener anterior si existe (logout / cambio de usuario)
      if (firestoreUnsub.current) {
        firestoreUnsub.current();
        firestoreUnsub.current = null;
      }

      if (!user) {
        isInitialLoad.current = true;
        return;
      }

      // Usuario confirmado: abrir listener en citas
      isInitialLoad.current = true;
      const q = query(citasCol(), orderBy('creadoEn', 'desc'));

      firestoreUnsub.current = onSnapshot(q, snap => {

        // ── Ignorar la carga inicial completa ──
        // Firestore envía todos los docs existentes como 'added' en el primer snap.
        if (isInitialLoad.current) {
          isInitialLoad.current = false;
          return;
        }

        // ── Cambios posteriores: solo docs nuevos ──
        snap.docChanges().forEach(change => {
          if (change.type !== 'added') return;

          const data = change.doc.data();

          // Filtro opcional: no sonar si la creó el propio admin desde el panel.
          // Las reservas del widget público tienen clienteUid; las del admin no.
          const esReservaCliente = !!data.clienteUid;
          const esCreadorActual  = data.clienteUid === user.uid;

          if (esReservaCliente && !esCreadorActual) {
            playAppointmentBell();
          } else if (!esReservaCliente) {
            // Sin clienteUid → reserva pública anónima → sonar igual
            playAppointmentBell();
          }
        });
      });
    });

    return () => {
      authUnsub();
      if (firestoreUnsub.current) firestoreUnsub.current();
    };
  }, []);
}
