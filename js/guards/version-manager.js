/**
 * version-manager.js
 * Escucha _system/global_config en Firestore.
 * Si forceRefreshTimestamp aumenta, limpia SW + caches y recarga.
 *
 * Anti-loop: el timestamp se persiste en localStorage ANTES del reload,
 * por lo que al volver a cargar localTs == Firestore → sin segunda recarga.
 * Primera visita: localTs === 0 → solo guarda baseline, nunca recarga.
 *
 * Cargar DESPUÉS de firebase-config.js.
 * Bypass automático para /admin/*.
 */
(() => {
  'use strict';

  if (window.location.pathname.startsWith('/admin')) return;

  const LS_KEY = '_synaptech_version_ts';

  // Leído UNA sola vez al cargar el módulo — captura el estado inicial.
  let localTs = parseInt(localStorage.getItem(LS_KEY) || '0', 10);

  async function cleanupAndReload(newTs) {
    console.info('[VersionManager] Nueva versión detectada:', newTs, '— limpiando y recargando…');

    // Actualizar ANTES del reload para evitar loop infinito.
    localTs = newTs;
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

  function startListener() {
    const ref = firebase.firestore().collection('_system').doc('global_config');

    ref.onSnapshot(snap => {
      if (!snap.exists) return;
      const firestoreTs = snap.data().forceRefreshTimestamp || 0;
      if (!firestoreTs) return;

      if (!localTs) {
        // Primera visita: guardar baseline sin recargar.
        localTs = firestoreTs;
        localStorage.setItem(LS_KEY, String(firestoreTs));
        return;
      }

      if (firestoreTs > localTs) {
        cleanupAndReload(firestoreTs);
      }
    }, err => console.warn('[VersionManager] listener:', err.message));
  }

  // Arrancar en cuanto Firebase esté listo (no necesitamos auth para esto).
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startListener);
  } else {
    startListener();
  }
})();
