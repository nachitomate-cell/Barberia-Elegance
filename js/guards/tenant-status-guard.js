/**
 * tenant-status-guard.js
 * Bloquea el acceso a páginas de cliente si el tenant está suspendido.
 * Cargar DESPUÉS de firebase-config.js.
 * El portal /admin nunca queda bloqueado (bypass por ruta).
 */
(() => {
  'use strict';

  if (window.location.pathname.startsWith('/admin')) return;

  const SUPERADMIN_EMAIL = 'ignaciiio.mate@gmail.com';

  function getTenantId() {
    return window.CURRENT_TENANT_ID
      || sessionStorage.getItem('saas_current_tenant')
      || 'elegance';
  }

  function systemRef(tenantId) {
    return firebase.firestore().collection('_system').doc(tenantId);
  }

  function showSuspendedScreen() {
    if (document.getElementById('__ts-guard')) return;
    const el = document.createElement('div');
    el.id = '__ts-guard';
    el.style.cssText = [
      'position:fixed;inset:0;z-index:99999',
      'background:#080d17',
      'display:flex;flex-direction:column;align-items:center;justify-content:center',
      'padding:2rem;text-align:center',
      "font-family:'Inter',sans-serif",
    ].join(';');
    el.innerHTML = `
      <div style="max-width:300px;">
        <div style="width:60px;height:60px;border-radius:1rem;
          background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.25);
          display:flex;align-items:center;justify-content:center;margin:0 auto 1.25rem;">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="#ef4444" viewBox="0 0 256 256">
            <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm-8,56a8,8,0,0,1,16,0v56a8,8,0,0,1-16,0Zm8,104a12,12,0,1,1,12-12A12,12,0,0,1,128,184Z"/>
          </svg>
        </div>
        <h2 style="font-size:1.25rem;font-weight:700;color:#f1f5f9;margin:0 0 .75rem;">
          Cuenta Suspendida
        </h2>
        <p style="font-size:.9rem;color:#64748b;margin:0 0 1.25rem;line-height:1.6;">
          Este local se encuentra temporalmente suspendido.<br>
          Contacta al administrador para más información.
        </p>
        <div style="padding:.75rem 1rem;border-radius:.75rem;
          background:rgba(239,68,68,.05);border:1px solid rgba(239,68,68,.15);
          font-size:.8rem;color:#f87171;font-weight:500;">
          Estado: Suspendido · Acceso bloqueado
        </div>
      </div>`;
    document.body.appendChild(el);
    document.body.style.overflow = 'hidden';
  }

  function hideSuspendedScreen() {
    const el = document.getElementById('__ts-guard');
    if (el) { el.remove(); document.body.style.overflow = ''; }
  }

  function startListener(tenantId) {
    systemRef(tenantId).onSnapshot(snap => {
      if (!snap.exists) { hideSuspendedScreen(); return; }
      if (snap.data().status === 'suspended') {
        showSuspendedScreen();
      } else {
        hideSuspendedScreen();
      }
    }, err => console.warn('[TenantGuard] listener:', err.message));
  }

  // Esperar a que Firebase Auth resuelva para no bloquear al superadmin.
  const unsubAuth = firebase.auth().onAuthStateChanged(async user => {
    unsubAuth();
    if (user?.email === SUPERADMIN_EMAIL) return;

    if (!user) { try { await firebase.auth().signInAnonymously(); } catch (_) {} }

    const tenantId = getTenantId();
    try {
      const snap = await systemRef(tenantId).get();
      if (snap.exists && snap.data().status === 'suspended') showSuspendedScreen();
    } catch (e) {
      console.warn('[TenantGuard] check inicial:', e.message);
    }
    startListener(tenantId);
  });
})();
