// ═══════════════════════════════════════════════════════════════════
//  LEGAL WIDGETS — banner cookies + footer legal reutilizables.
//
//  Se incluye con:
//    <script src="/js/legal-widgets.js?v=1" defer></script>
//
//  Auto-inyecta:
//    · Un banner de cookies dismissible (se recuerda por 12 meses en
//      localStorage) en la primera visita.
//    · Un footer legal opcional si la página tiene un <div id="legal-footer-slot">.
//
//  Sin dependencias externas. CSS aislado con prefijo .sptl-*.
// ═══════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  if (window.__sptLegalWidgetsLoaded__) return;
  window.__sptLegalWidgetsLoaded__ = true;

  const STORAGE_KEY   = 'sptl_cookies_ack_v1';
  const RECORDATORIO_MS = 365 * 24 * 60 * 60 * 1000; // 12 meses

  function yaAceptado() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const { at } = JSON.parse(raw);
      return typeof at === 'number' && (Date.now() - at) < RECORDATORIO_MS;
    } catch (_) { return false; }
  }

  function marcarAceptado() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ at: Date.now() })); }
    catch (_) {}
  }

  function injectStyles() {
    const css = `
      .sptl-banner {
        position: fixed; left: 12px; right: 12px; bottom: 12px;
        z-index: 999999;
        background: rgba(15,15,20,.96); color: #f4f4f6;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255,255,255,.10);
        border-radius: 14px; padding: 14px 16px;
        font-family: 'Inter',-apple-system,BlinkMacSystemFont,sans-serif;
        font-size: 12.5px; line-height: 1.55;
        box-shadow: 0 20px 40px -20px rgba(0,0,0,.6);
        display: flex; align-items: flex-start; gap: 12px;
        max-width: 640px; margin: 0 auto;
      }
      .sptl-banner p { margin: 0; color: rgba(255,255,255,.78); }
      .sptl-banner a { color: #a78bfa; text-decoration: underline; }
      .sptl-banner__actions { display: flex; gap: 8px; flex-shrink: 0; }
      .sptl-banner button {
        border: 0; border-radius: 8px; padding: 8px 14px;
        font-family: inherit; font-size: 12.5px; font-weight: 600;
        cursor: pointer; transition: transform .1s;
      }
      .sptl-banner button:active { transform: scale(.97); }
      .sptl-banner__ok { background: #8b7cf6; color: #0a0a0d; }
      .sptl-banner__ok:hover { background: #a78bfa; }
      .sptl-footer {
        text-align: center; padding: 18px 14px 14px;
        color: rgba(255,255,255,.35);
        font-family: 'Inter',-apple-system,BlinkMacSystemFont,sans-serif;
        font-size: 10.5px; line-height: 1.65;
      }
      .sptl-footer a { color: rgba(255,255,255,.55); text-decoration: underline; }
      .sptl-footer strong { color: rgba(255,255,255,.6); font-weight: 600; }
      @media (max-width: 480px) {
        .sptl-banner { flex-direction: column; }
        .sptl-banner__actions { width: 100%; }
        .sptl-banner button { flex: 1; }
      }
    `;
    const style = document.createElement('style');
    style.setAttribute('data-sptl', 'widgets');
    style.textContent = css;
    document.head.appendChild(style);
  }

  function pintarBanner() {
    if (yaAceptado()) return;

    const wrap = document.createElement('div');
    wrap.className = 'sptl-banner';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-label', 'Aviso de privacidad y cookies');
    wrap.innerHTML =
      '<p>Usamos <strong>almacenamiento local del navegador</strong> ' +
      '(no cookies de terceros ni publicidad) para mantener tu sesión y ' +
      'recordar tus preferencias. Al continuar aceptas la ' +
      '<a href="/privacidad.html" target="_blank" rel="noopener">Política de Privacidad</a> ' +
      'y las <a href="/legal.html" target="_blank" rel="noopener">condiciones legales</a>.</p>' +
      '<div class="sptl-banner__actions">' +
      '  <button class="sptl-banner__ok" type="button">Entendido</button>' +
      '</div>';

    wrap.querySelector('.sptl-banner__ok').addEventListener('click', function () {
      marcarAceptado();
      wrap.remove();
    });

    document.body.appendChild(wrap);
  }

  function pintarFooter() {
    const slot = document.getElementById('legal-footer-slot');
    if (!slot) return;
    const anio = new Date().getFullYear();
    slot.innerHTML =
      '<div class="sptl-footer">' +
      '  &copy; ' + anio + ' <strong>SynapTech SpA</strong> · ' +
      '  <a href="/legal.html" target="_blank" rel="noopener">Centro legal</a> · ' +
      '  <a href="/privacidad.html" target="_blank" rel="noopener">Privacidad</a> · ' +
      '  <a href="/terminos-saas.html" target="_blank" rel="noopener">Términos</a><br>' +
      '  SynapTech&reg; · Bioo&trade; · Y&uuml;gen&trade;' +
      '</div>';
  }

  function init() {
    injectStyles();
    pintarBanner();
    pintarFooter();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
