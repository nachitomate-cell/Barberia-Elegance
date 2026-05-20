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

let _chatAudioCtx = null;
function _getChatAudioCtx() {
  if (!_chatAudioCtx || _chatAudioCtx.state === 'closed') {
    _chatAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return _chatAudioCtx;
}
document.addEventListener('click',    () => { try { const c = _getChatAudioCtx(); if (c.state === 'suspended') c.resume().catch(()=>{}); } catch(_){} }, { once: true });
document.addEventListener('keydown',  () => { try { const c = _getChatAudioCtx(); if (c.state === 'suspended') c.resume().catch(()=>{}); } catch(_){} }, { once: true });
document.addEventListener('touchstart',() => { try { const c = _getChatAudioCtx(); if (c.state === 'suspended') c.resume().catch(()=>{}); } catch(_){} }, { once: true });

function playBell() {
  try {
    if (!window.AudioContext && !window.webkitAudioContext) return;
    const audioCtx = _getChatAudioCtx();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
    osc.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.1); // Up to A6
    
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.6);
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
