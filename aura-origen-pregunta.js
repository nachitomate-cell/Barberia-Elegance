/* ═══════════════════════════════════════════════════════════════
 *  AURA · Modal exclusivo "¿Cómo llegaste a nosotros?"
 *  ─────────────────────────────────────────────────────────────────
 *  Se incluye en index.html (agenda pública) y barbero.html (página
 *  de barbero individual). Se autoinstala en el DOM al cargar.
 *
 *  Requiere: window.CURRENT_TENANT_ID (config.js) y firebase compat.
 *
 *  API pública:
 *    window.askAuraOrigenSiCorresponde() → Promise<origen|null|undefined>
 *      undefined = no aplica (tenant != aura o config.activo=false).
 *      null      = cliente eligió "Prefiero no decir" (permitido si !obligatorio).
 *      object    = { id, label, emoji, respondidoAt, textoLibre? }
 *
 *  Solo se ejecuta si CURRENT_TENANT_ID === 'aura'. Cero impacto en
 *  otros tenants.
 * ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // Guard: si ya se cargó por otra vía (double-include defensivo).
  if (window._auraOrigenLoaded) return;
  window._auraOrigenLoaded = true;

  const MODAL_HTML = `
    <div id="auraOrigenModal" class="fixed inset-0 z-[300] hidden items-end sm:items-center justify-center p-0 sm:p-6"
         style="background: rgba(28,25,23,.45); backdrop-filter: blur(6px);">
      <div class="w-full max-w-md shadow-2xl"
           style="background: var(--a-warm); color: var(--a-ink);
                  border: 1px solid var(--a-border);
                  border-radius: 24px 24px 0 0;
                  padding: 28px 24px;
                  padding-bottom: max(env(safe-area-inset-bottom), 24px);">
        <div class="sm:hidden h-1 w-11 rounded-full mx-auto mb-5" style="background: #d6cebd;"></div>
        <div class="text-center mb-6">
          <div class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 mb-4"
               style="background: var(--a-amber-soft); border: 1px solid #ecd9a8;">
            <span style="font-size: 11px;">✨</span>
            <span class="uppercase font-bold" style="font-size: 10px; letter-spacing: .16em; color: #8f640d;">AURA</span>
          </div>
          <h3 class="font-black tracking-tight"
              style="font-size: 22px; color: var(--a-ink); letter-spacing: -.02em; line-height: 1.15;">
            ¿Cómo llegaste a nosotros?
          </h3>
          <p id="auraOrigenSubtitle" class="mt-1.5" style="font-size: 13px; color: var(--a-muted);">
            Elige la opción que mejor te describa
          </p>
        </div>
        <div id="auraOrigenOpciones" class="space-y-2.5 mb-4"></div>
        <div id="auraOrigenTextoLibreWrap" class="hidden mb-4 -mt-1">
          <label class="block font-semibold uppercase tracking-wider mb-2"
                 style="font-size: 10px; color: var(--a-muted); letter-spacing: .12em;">
            Cuéntanos brevemente
          </label>
          <input id="auraOrigenTextoLibre" type="text" maxlength="80" autocomplete="off"
                 placeholder="Ej: por un amigo del gym"
                 style="width: 100%; padding: 12px 14px; font-size: 14px; color: var(--a-ink);
                        background: #fff; border: 1.5px solid var(--a-border); border-radius: 12px;
                        outline: none; transition: border-color .15s ease;"
                 onfocus="this.style.borderColor='var(--a-amber)'"
                 onblur="this.style.borderColor='var(--a-border)'" />
        </div>
        <div class="flex gap-2 mt-5">
          <button id="auraOrigenSkip" type="button"
                  style="flex: 1; padding: 13px 12px; font-size: 14px; font-weight: 600;
                         color: #57534e; background: #fff; border: 1.5px solid var(--a-border);
                         border-radius: 14px; cursor: pointer; transition: all .15s ease;"
                  onmouseover="this.style.background='#f5f1ea';this.style.borderColor='#d6cebd';"
                  onmouseout="this.style.background='#fff';this.style.borderColor='var(--a-border)';">
            Prefiero no decir
          </button>
          <button id="auraOrigenConfirmar" type="button" disabled
                  style="flex: 2; padding: 13px 16px; font-size: 14px; font-weight: 700;
                         color: #fff; background: linear-gradient(180deg, #1c1917, #292524);
                         border: none; border-radius: 14px; cursor: pointer; transition: all .15s ease;
                         letter-spacing: -.005em;
                         box-shadow: 0 4px 12px -4px rgba(28,25,23,.4);">
            Confirmar y reservar
          </button>
        </div>
        <p class="text-center mt-4" style="font-size: 10.5px; color: #a8a29e; letter-spacing: .06em;">
          Tu respuesta nos ayuda a mejorar
        </p>
      </div>
    </div>
  `;

  const MODAL_CSS = `
    #auraOrigenModal { --a-warm: #fbf7f1; --a-cream: #fdfaf5; --a-ink: #1c1917;
                       --a-muted: #78716c; --a-border: #e7e2da; --a-amber: #c48a2d;
                       --a-amber-soft: #f5ebd7; }
    #auraOrigenModal .aura-origen-opt {
      display: flex; align-items: center; gap: 14px; width: 100%;
      padding: 14px 16px; border-radius: 16px;
      border: 1.5px solid var(--a-border); background: var(--a-cream);
      transition: all .18s ease; text-align: left; cursor: pointer;
    }
    #auraOrigenModal .aura-origen-opt:hover {
      border-color: #d6c9ac; background: #fbf5e9; transform: translateY(-1px);
      box-shadow: 0 4px 14px -6px rgba(196,138,45,.18);
    }
    #auraOrigenModal .aura-origen-opt.selected {
      border-color: var(--a-amber); background: #fbf1dd;
      box-shadow: 0 4px 18px -8px rgba(196,138,45,.35);
    }
    #auraOrigenModal .aura-origen-opt.selected .aura-check {
      background: var(--a-amber); border-color: var(--a-amber); opacity: 1;
    }
    #auraOrigenModal .aura-origen-opt .aura-emoji {
      width: 42px; height: 42px; display: flex; align-items: center; justify-content: center;
      font-size: 22px; border-radius: 12px; background: #fff;
      border: 1px solid var(--a-border); flex-shrink: 0;
    }
    #auraOrigenModal .aura-origen-opt.selected .aura-emoji {
      background: #fff5e0; border-color: #ecd9a8;
    }
    #auraOrigenModal .aura-origen-opt .aura-label {
      flex: 1; font-size: 15px; font-weight: 500; color: var(--a-ink);
      letter-spacing: -.01em; line-height: 1.25;
    }
    #auraOrigenModal .aura-check {
      width: 22px; height: 22px; border-radius: 999px; flex-shrink: 0;
      border: 1.5px solid #d1c9b8; background: #fff;
      display: flex; align-items: center; justify-content: center;
      opacity: 0; transition: all .18s ease; color: #fff;
    }
    #auraOrigenConfirmar:disabled { opacity: .35; cursor: not-allowed; box-shadow: none !important; }
    #auraOrigenConfirmar:not(:disabled):hover {
      background: linear-gradient(180deg, #292524, #44403c) !important;
      box-shadow: 0 6px 20px -6px rgba(28,25,23,.5) !important;
      transform: translateY(-1px);
    }
    #auraOrigenConfirmar:not(:disabled):active { transform: translateY(0); }
  `;

  function inyectar() {
    // Solo inyecta si es Aura — evita HTML muerto en otros tenants.
    if ((window.CURRENT_TENANT_ID || '') !== 'aura') return;
    if (document.getElementById('auraOrigenModal')) return; // ya inyectado

    // CSS
    const styleEl = document.createElement('style');
    styleEl.id = 'auraOrigenModalStyles';
    styleEl.textContent = MODAL_CSS;
    document.head.appendChild(styleEl);

    // HTML
    const wrap = document.createElement('div');
    wrap.innerHTML = MODAL_HTML.trim();
    document.body.appendChild(wrap.firstElementChild);

    // Wire handlers (no inline para evitar globals sucios)
    document.getElementById('auraOrigenSkip').addEventListener('click', () => resolveModal(null));
    document.getElementById('auraOrigenConfirmar').addEventListener('click', confirmarSeleccion);
  }

  // Espera al DOM si aún no está listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inyectar);
  } else {
    inyectar();
  }

  let _cfg = null;                 // config cacheada tenants/aura/configuracion/origen_pregunta
  let _sel = null;                 // opción seleccionada
  let _resolverPending = null;     // resolve() de la promise pendiente

  async function loadCfg() {
    if (_cfg !== null) return _cfg;
    try {
      const ref = firebase.firestore()
        .collection('tenants').doc('aura')
        .collection('configuracion').doc('origen_pregunta');
      const snap = await ref.get();
      _cfg = snap.exists ? snap.data() : { activo: false, obligatorio: false, opciones: [] };
    } catch (e) {
      console.warn('[aura] no se pudo cargar origen_pregunta:', e.message);
      _cfg = { activo: false, obligatorio: false, opciones: [] };
    }
    return _cfg;
  }

  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, c => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  function renderOpciones() {
    const cont = document.getElementById('auraOrigenOpciones');
    if (!cont || !_cfg) return;
    const activas = (_cfg.opciones || [])
      .filter(o => o.activo !== false)
      .sort((a, b) => (a.orden || 0) - (b.orden || 0));
    cont.innerHTML = activas.map(o => `
      <button type="button" data-opcion-id="${esc(o.id)}" class="aura-origen-opt">
        <span class="aura-emoji" aria-hidden="true">${esc(o.emoji || '✨')}</span>
        <span class="aura-label">${esc(o.label)}</span>
        <span class="aura-check" aria-hidden="true">
          <svg viewBox="0 0 20 20" fill="currentColor" style="width:12px;height:12px;">
            <path d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 011.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z"/>
          </svg>
        </span>
      </button>
    `).join('');
    cont.querySelectorAll('.aura-origen-opt').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.opcionId;
        _sel = activas.find(o => o.id === id) || null;
        cont.querySelectorAll('.aura-origen-opt').forEach(b => {
          b.classList.toggle('selected', b.dataset.opcionId === id);
        });
        const wrap = document.getElementById('auraOrigenTextoLibreWrap');
        if (wrap) wrap.classList.toggle('hidden', !_sel?.permitirTextoLibre);
        document.getElementById('auraOrigenConfirmar').disabled = false;
      };
    });
  }

  function abrir() {
    // Fallback duro si la inyección no ocurrió (edge case: script se carga
    // antes que CURRENT_TENANT_ID). Reintenta la inyección.
    if (!document.getElementById('auraOrigenModal')) inyectar();
    const modal = document.getElementById('auraOrigenModal');
    if (!modal) return Promise.resolve(null);

    _sel = null;
    renderOpciones();
    const skipBtn = document.getElementById('auraOrigenSkip');
    const subtitle = document.getElementById('auraOrigenSubtitle');
    if (_cfg?.obligatorio) {
      skipBtn?.classList.add('hidden');
      if (subtitle) subtitle.textContent = 'Elige una opción para continuar';
    } else {
      skipBtn?.classList.remove('hidden');
      if (subtitle) subtitle.textContent = 'Elige la opción que mejor te describa (opcional)';
    }
    document.getElementById('auraOrigenConfirmar').disabled = true;
    document.getElementById('auraOrigenTextoLibreWrap').classList.add('hidden');
    const inp = document.getElementById('auraOrigenTextoLibre');
    if (inp) inp.value = '';
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    return new Promise(resolve => { _resolverPending = resolve; });
  }

  function cerrar() {
    const modal = document.getElementById('auraOrigenModal');
    modal?.classList.remove('flex');
    modal?.classList.add('hidden');
  }

  function resolveModal(payload) {
    cerrar();
    if (_resolverPending) {
      _resolverPending(payload);
      _resolverPending = null;
    }
  }

  function confirmarSeleccion() {
    if (!_sel) return;
    const payload = {
      id:    _sel.id,
      label: _sel.label,
      emoji: _sel.emoji || null,
      respondidoAt: new Date().toISOString(),
    };
    if (_sel.permitirTextoLibre) {
      const t = (document.getElementById('auraOrigenTextoLibre')?.value || '').trim();
      if (t) payload.textoLibre = t.slice(0, 80);
    }
    resolveModal(payload);
  }

  // API pública
  window.askAuraOrigenSiCorresponde = async function () {
    const tid = window.CURRENT_TENANT_ID || '';
    console.log('[aura-origen] llamado. tenant =', tid);
    if (tid !== 'aura') { console.log('[aura-origen] no es aura, skip'); return undefined; }
    const cfg = await loadCfg();
    console.log('[aura-origen] config cargada:', cfg);
    if (!cfg?.activo) { console.log('[aura-origen] modulo desactivado, skip'); return undefined; }
    // Fallback: si el modal no esta en el DOM (posible race con DOMContentLoaded),
    // lo inyectamos ahora antes de intentar abrirlo. Sin esto, en ciertos
    // browsers/timings puede pasar que askAuraOrigenSiCorresponde se llame
    // antes de que inyectar() haya corrido.
    if (!document.getElementById('auraOrigenModal')) {
      console.log('[aura-origen] modal no en DOM, inyectando ahora');
      inyectar();
    }
    return await abrir();
  };

  // Diagnostico: expone el estado interno para debug desde DevTools
  window._auraOrigenDebug = () => ({
    loaded:  !!window._auraOrigenLoaded,
    tid:     window.CURRENT_TENANT_ID || null,
    modal:   !!document.getElementById('auraOrigenModal'),
    cfg:     _cfg,
    hasFn:   typeof window.askAuraOrigenSiCorresponde,
  });
})();
