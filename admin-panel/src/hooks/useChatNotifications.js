import { useState, useEffect, useRef } from 'react';
import { query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { resolveTenantId } from '../lib/tenantUtils';
import { collection } from 'firebase/firestore';

function chatsCol() {
  const tid = resolveTenantId();
  return tid === 'elegance'
    ? collection(db, 'chats')
    : collection(db, `tenants/${tid}/chats`);
}

// Tono de campanita via Web Audio API (no requiere archivo externo)
function playBell() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    const times   = [0, 0.18, 0.36];
    const freqs   = [880, 1109, 1318];

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
      osc.stop(ctx.currentTime + t + 0.6);
    });
  } catch (e) {
    // Autoplay bloqueado o AudioContext no disponible — silencioso
  }
}

export function useChatNotifications() {
  const [unreadCount, setUnreadCount] = useState(0);
  const initialized = useRef(false);

  useEffect(() => {
    const q = query(chatsCol(), orderBy('updatedAt', 'desc'));

    const unsub = onSnapshot(q, snap => {
      // ── Primera carga: solo contar sin sonar ──
      if (!initialized.current) {
        initialized.current = true;
        const count = snap.docs.filter(d => d.data().hasUnread === true).length;
        setUnreadCount(count);
        return;
      }

      // ── Cambios posteriores ──
      snap.docChanges().forEach(change => {
        if (change.type === 'modified') {
          const data = change.doc.data();
          // Sonar solo si el último mensaje es del cliente (hasUnread=true)
          if (data.hasUnread === true) {
            playBell();
          }
        }
      });

      // Actualizar contador total de no leídos
      const count = snap.docs.filter(d => d.data().hasUnread === true).length;
      setUnreadCount(count);
    });

    return unsub;
  }, []);

  return unreadCount;
}
