import { useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

const LS_KEY = '_synaptech_version_ts';

async function cleanupAndReload(newTs) {
  console.info('[VersionManager] Nueva versión detectada:', newTs, '— limpiando y recargando…');

  // Actualizar ANTES del reload para evitar loop infinito.
  localStorage.setItem(LS_KEY, String(newTs));

  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
  } catch (e) {
    console.warn('[VersionManager] cleanup parcial:', e.message);
  }

  window.location.reload(true);
}

export function useVersionManager() {
  useEffect(() => {
    // Leído UNA sola vez al montar — captura el estado inicial.
    let localTs = parseInt(localStorage.getItem(LS_KEY) || '0', 10);
    const ref   = doc(db, '_system', 'global_config');

    const unsub = onSnapshot(ref, snap => {
      if (!snap.exists()) return;
      const firestoreTs = snap.data().forceRefreshTimestamp || 0;
      if (!firestoreTs) return;

      if (!localTs) {
        // Primera visita: guardar baseline sin recargar.
        localTs = firestoreTs;
        localStorage.setItem(LS_KEY, String(firestoreTs));
        return;
      }

      if (firestoreTs > localTs) {
        localTs = firestoreTs; // Evita que el cierre llame a cleanupAndReload dos veces.
        cleanupAndReload(firestoreTs);
      }
    }, err => console.warn('[VersionManager] listener:', err.message));

    return unsub;
  }, []);
}
