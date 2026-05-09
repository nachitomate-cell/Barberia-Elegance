import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { resolveTenantId } from '../lib/tenantUtils';

function chatsCol() {
  const tid = resolveTenantId();
  return tid === 'elegance'
    ? collection(db, 'chats')
    : collection(db, `tenants/${tid}/chats`);
}

function playBell() {
  try {
    const ctx   = new (window.AudioContext || window.webkitAudioContext)();
    const times = [0, 0.18, 0.36];
    const freqs = [880, 1109, 1318];
    times.forEach((t, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freqs[i], ctx.currentTime + t);
      gain.gain.setValueAtTime(0.25, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.6);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime  + t + 0.6);
    });
  } catch (_) { /* autoplay bloqueado — silencioso */ }
}

export function useChatNotifications() {
  const [unreadCount, setUnreadCount] = useState(0);
  const initialized   = useRef(false);
  const firestoreUnsub = useRef(null);

  useEffect(() => {
    // Esperar confirmación de auth antes de abrir cualquier listener de Firestore
    const authUnsub = onAuthStateChanged(auth, user => {

      // ── Limpiar listener anterior (logout o cambio de usuario) ──
      if (firestoreUnsub.current) {
        firestoreUnsub.current();
        firestoreUnsub.current = null;
      }

      if (!user) {
        setUnreadCount(0);
        initialized.current = false;
        return;
      }

      // ── Usuario confirmado: abrir listener de Firestore ──
      initialized.current = false;
      const q = query(chatsCol(), orderBy('updatedAt', 'desc'));

      firestoreUnsub.current = onSnapshot(q, snap => {
        // Primera carga: solo contar, no sonar
        if (!initialized.current) {
          initialized.current = true;
          setUnreadCount(snap.docs.filter(d => d.data().hasUnread === true).length);
          return;
        }

        // Cambios posteriores: detectar mensajes nuevos del cliente
        snap.docChanges().forEach(change => {
          if (change.type === 'modified' && change.doc.data().hasUnread === true) {
            playBell();
          }
        });

        setUnreadCount(snap.docs.filter(d => d.data().hasUnread === true).length);
      });
    });

    return () => {
      authUnsub();
      if (firestoreUnsub.current) firestoreUnsub.current();
    };
  }, []);

  return unreadCount;
}
