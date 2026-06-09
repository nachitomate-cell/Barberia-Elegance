/**
 * error-logger.js
 * Captura window.onerror + unhandledrejection y los persiste en Firestore.
 * Cargar JUSTO DESPUÉS de firebase-config.js (necesita firebase.firestore()).
 *
 * Protecciones:
 *  - Max 10 errores por sesión (evita spam ante loops de error).
 *  - Deduplicación en ventana de 30 s (mismo mensaje no se envía dos veces).
 *  - Falla silenciosamente — nunca lanza desde un handler de error.
 */
(() => {
  'use strict';

  const MAX_PER_SESSION = 10;
  const SESSION_KEY     = '__erlog_n';
  const recentMsgs      = new Set();

  // Errores internos del SDK de Firebase (IndexedDB del navegador bajo presión de memoria).
  // No son bugs de la app — filtrarlos evita que llenen el log de errores.
  const IGNORE_PATTERNS = [
    'Attempt to get records from database without an in-progress transaction',
    'Connection to Indexed Database server lost',
    'An internal error was encountered in the Indexed Database server',
    'Database deleted by request of the user',
    'Script error.',
    'IDBDatabase.transaction',
  ];

  function shouldIgnore(message) {
    const msg = String(message || '');
    return IGNORE_PATTERNS.some(p => msg.includes(p));
  }

  function getDb() {
    try { return firebase.firestore(); } catch { return null; }
  }

  function getTenantId() {
    return window.CURRENT_TENANT_ID
      || sessionStorage.getItem('saas_current_tenant')
      || null;
  }

  function sessionCount() {
    return parseInt(sessionStorage.getItem(SESSION_KEY) || '0', 10);
  }

  function incCount() {
    sessionStorage.setItem(SESSION_KEY, String(sessionCount() + 1));
  }

  function escapeMsg(str) {
    return String(str || '').slice(0, 500);
  }

  async function send(message, stack) {
    if (shouldIgnore(message)) return;
    if (sessionCount() >= MAX_PER_SESSION) return;

    const key = String(message).slice(0, 120);
    if (recentMsgs.has(key)) return;
    recentMsgs.add(key);
    setTimeout(() => recentMsgs.delete(key), 30_000);

    const db = getDb();
    if (!db) return;

    incCount();
    try {
      await db.collection('system_errors').add({
        message:   escapeMsg(message),
        stack:     String(stack || '').slice(0, 2000),
        source:    'static',
        tenantId:  getTenantId(),
        url:       window.location.href,
        userAgent: navigator.userAgent,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        status:    'open',
      });
    } catch {
      // Silencio absoluto — no crear loops de error
    }
  }

  window.onerror = function (message, source, lineno, colno, error) {
    send(
      error?.message || message,
      error?.stack   || `${source}:${lineno}:${colno}`
    );
    return false; // No suprimir la consola del navegador
  };

  window.addEventListener('unhandledrejection', function (e) {
    const err = e.reason;
    send(
      err?.message || String(err),
      err?.stack   || 'unhandledrejection'
    );
  });
})();
