import { useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

const LS_KEY = '_synaptech_version_ts';

async function cleanupAndReload(newTs) {
  console.info('[VersionManager] Nueva versión detectada:', newTs, '— recargando…');

  // Actualizar ANTES del reload para evitar loop infinito.
  localStorage.setItem(LS_KEY, String(newTs));

  // Fix (sesiones cerrándose): antes se desregistraba TODO el service worker
  // y se borraban TODAS las caches en cada bump de versión. En Safari eso
  // empujaba al navegador a limpiar también IndexedDB (donde vive la sesión
  // de Firebase Auth), y el user se encontraba deslogueado tras el reload.
  // Ahora sólo pedimos al SW que se actualice (skipWaiting → controllerchange
  // → reload automático) o forzamos reload si no hay SW. El auth queda intacto.
  // `reload(true)` es no-estándar y agresivo; usamos reload() plano.
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        // Fuerza chequeo del bundle; si hay uno nuevo, workbox dispara
        // controllerchange → main.jsx hace el reload.
        await reg.update().catch(() => {});
      }
    }
  } catch (e) {
    console.warn('[VersionManager] update SW:', e.message);
  }
  window.location.reload();
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
    }, err => {
      if (err.code !== 'permission-denied') {
        console.warn('[VersionManager] listener:', err.message);
      }
    });

    return unsub;
  }, []);
}
