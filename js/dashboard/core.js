// ─── Toast ────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  let el = document.getElementById('_dashToast');
  if (!el) {
    el = document.createElement('div');
    el.id = '_dashToast';
    el.style.cssText = 'position:fixed;bottom:88px;left:50%;transform:translateX(-50%) translateY(20px);z-index:9999;padding:10px 18px;border-radius:12px;font-size:13px;font-weight:700;white-space:nowrap;pointer-events:none;transition:all .25s;opacity:0;';
    document.body.appendChild(el);
  }
  const colors = { info:'#1a1a2e;color:#e2e8f0', ok:'#064e3b;color:#6ee7b7', err:'#450a0a;color:#fca5a5' };
  const [bg, fg] = (colors[type] || colors.info).split(';color:');
  el.style.background = bg; el.style.color = '#' + fg;
  el.style.border = type === 'err' ? '1px solid rgba(248,113,113,0.3)' : type === 'ok' ? '1px solid rgba(110,231,183,0.3)' : '1px solid rgba(255,255,255,0.1)';
  el.textContent = msg;
  clearTimeout(el._t);
  requestAnimationFrame(() => { el.style.opacity = '1'; el.style.transform = 'translateX(-50%) translateY(0)'; });
  el._t = setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(-50%) translateY(20px)'; }, 2800);
}

/* ─── Deep-link desde notificación de recordatorio ──────────── */
async function manejarDeepLinkRecordatorio() {
  const params = new URLSearchParams(window.location.search);
  const accion  = params.get('accion');
  const citaId  = params.get('citaId');

  if (!accion || !citaId) return;

  // Limpiar params de la URL sin recargar la página
  const cleanUrl = window.location.pathname;
  window.history.replaceState({}, '', cleanUrl);

  try {
    if (accion === 'confirmar') {
      await FDB.updateCitaEstado(citaId, 'Confirmada');
      showToast('✅ Cita confirmada correctamente', 'ok');
    } else if (accion === 'cancelar') {
      await FDB.updateCitaEstado(citaId, 'Cancelada');
      showToast('Cita cancelada', 'info');
    } else if (accion === 'reagendar') {
      // Esperar a que la cita esté en cache para mostrar info y validar el límite
      const abrir = (intentos = 0) => {
        const cache = window._citaCache || {};
        if (cache[citaId] || intentos >= 12) {
          abrirModalReagendar(citaId);
        } else {
          setTimeout(() => abrir(intentos + 1), 400);
        }
      };
      abrir();
    }
  } catch (e) {
    console.error('[DeepLink] Error al procesar acción:', e);
    showToast('No se pudo procesar la acción. Intenta desde la app.', 'err');
  }
}

// ─── Estado global ────────────────────────────────────────────
let currentUser     = null;
let userStamps      = 0;
let activeTab       = 'loyalty';
let _premiosDynamic = [];
let _userUnsub      = null;
let _citasUnsub     = null;
let _premiosUnsub   = null;
let _pendingRewardsUnsub = null; // listener de redemptions con status:'pending'
let _lookbookUnsub  = null;
let _lbDocs         = [];
let _lbCurrentId    = null;
let _sfUnsub        = null;
let _sfCurrentDoc   = null;
let _prevStamps     = null;
let _stampsSynced   = false;
let _premiosVisible = false;
var _citaCache      = window._citaCache || {};
window._citaCache   = _citaCache;
window._minutosLimiteReagendar = 0;

// ─── Aplicar Config ───────────────────────────────────────────
document.title = `Mi ${SHOP.club}`;
document.getElementById('shopHeaderName').textContent = SHOP.nombreCorto.toUpperCase();
document.getElementById('shopClubName').textContent   = SHOP.club;

// Tarjeta de reseña Google — solo si el tenant tiene URL configurada.
// El botón usa el flujo optimizado (deep-link Maps + copiar al portapapeles
// + guardar reseña interna). Ver js/shared/resena-google.js.
(function initGoogleReviewCard() {
  const url = SHOP.googleReviewUrl || '';
  if (!url) return;
  const card = document.getElementById('googleReviewCard');
  if (card) card.classList.remove('hidden');
})();

// Handler global: se llama desde el card en el feed.
// Sin citaId (el card no tiene contexto de cita específica) → solo abre
// Google con el copy sugerido / variantes fallback.
window.abrirReseñaGoogleDesdeCard = async function () {
  if (window.SynapReseña) {
    try { await window.SynapReseña.abrirGoogle({ rating: 5 }); return; }
    catch (e) { console.warn('[card] abrirGoogle falló:', e.message); }
  }
  const url = SHOP.googleReviewUrl || '';
  if (url) window.open(url, '_blank', 'noopener');
};

// Contenido tenant-específico — 100% data-driven desde config.js (SHOP).
// headerSub/heroLine1/heroLine2/watermark/pwaIcon/headerInlineText se
// definen por tenant en config.js; sin campo → default de la plantilla.
(function applyTenantContent() {
  // Subtítulo header
  const sub = document.getElementById('shopHeaderSub');
  if (sub) sub.textContent = SHOP.headerSub || 'BARBERSHOP';

  // Header alterno: logo + nombre largo inline (ej: Aura)
  if (SHOP.headerInlineText) {
    const nameEl = document.getElementById('shopHeaderName');
    const parentDiv = nameEl && nameEl.parentElement;
    if (parentDiv) {
      parentDiv.className = "flex items-center justify-center gap-1.5 select-none min-w-0";
      parentDiv.innerHTML = `
        <img src="${SHOP.logo || '/logo.jpg'}" alt="${SHOP.nombreCorto || ''} Logo" loading="lazy" class="rounded-md shrink-0 shadow-sm" style="width: 20px; height: 20px; object-fit: contain; border: 1px solid rgba(0,40,94,0.08);" />
        <span class="text-[11px] font-black tracking-[0.04em] text-[#00285E] uppercase truncate">${SHOP.headerInlineText}</span>
      `;
    }
  }

  // Hero copy — string = innerHTML (admite <br>) · false = oculto · ausente = default del HTML
  const h1 = document.getElementById('heroLine1');
  const h2 = document.getElementById('heroLine2');
  if (h1) { if (SHOP.heroLine1 === false) h1.style.display = 'none'; else if (SHOP.heroLine1) h1.innerHTML = SHOP.heroLine1; }
  if (h2) { if (SHOP.heroLine2 === false) h2.style.display = 'none'; else if (SHOP.heroLine2) h2.innerHTML = SHOP.heroLine2; }

  // Watermark
  const wm = document.getElementById('membershipWatermark');
  if (wm) wm.textContent = SHOP.watermark || 'É';

  // PWA install icons — SHOP.pwaIcon permite un ícono distinto al logo (ej: Marcelo).
  // pwaBigIcon está antes del script en el DOM → se puede actualizar ya.
  // pwaBannerIcon y pwaModalIcon están después → necesitan DOMContentLoaded.
  const _pwaLogoSrc = SHOP.pwaIcon || SHOP.logo || '/logo.jpg';
  const _pwaLogoAlt = SHOP.nombreCorto || 'App';
  const _pwaBigEl = document.getElementById('pwaBigIcon');
  if (_pwaBigEl) { _pwaBigEl.src = _pwaLogoSrc; _pwaBigEl.alt = _pwaLogoAlt; }
  if (SHOP.pwaIcon) {
    const _appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
    if (_appleIcon) _appleIcon.href = SHOP.pwaIcon;
    const _faviconEl = document.querySelector('link[rel="icon"]');
    if (_faviconEl) { _faviconEl.href = SHOP.pwaIcon; _faviconEl.type = 'image/png'; }
  }
  document.addEventListener('DOMContentLoaded', function () {
    ['pwaBannerIcon', 'pwaModalIcon'].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) { el.src = _pwaLogoSrc; el.alt = _pwaLogoAlt; }
    });
    // Initialize premium active tab indicator
    updateNavIndicator(activeTab);
  });
})();

// ─── Cargar límite de cancelación/reagendamiento ──────────────
(async function loadCancelLimitConfig() {
  try {
    const _tid = window.CURRENT_TENANT_ID || 'elegance';
    const _ref = _tid === 'elegance'
      ? db.collection('configuracion').doc('main')
      : db.collection('tenants').doc(_tid).collection('configuracion').doc('main');
    const _snap = await _ref.get();
    if (_snap.exists && _snap.data().minutosLimiteReagendar) {
      window._minutosLimiteReagendar = _snap.data().minutosLimiteReagendar;
    }
  } catch (_e) {
    // config no crítica, no bloquear
  }
})();

// ─── Preview mode runner ──────────────────────────────────────
// Ejecuta el flujo de arranque del dashboard usando el mock user,
// saltando el gate de auth y cualquier redirect. Se llama desde el
// onAuthStateChanged cuando PREVIEW=true.
async function runPreviewMode() {
  const authGuardEl = document.getElementById('authGuard');
  if (authGuardEl) authGuardEl.style.display = 'none';
  currentUser = PREVIEW_MOCK_USER;
  try { initAuraAnimations(); } catch (_) {}
  try { loadRangos(); } catch (_) {}
  try { loadPlanesAnualesAura(); } catch (_) {}
  try { subscribeUserData(PREVIEW_MOCK_USER); } catch (e) { console.warn('[preview] subscribeUserData:', e); }
  try {
    _premiosUnsub = FDB.onPremiosChange(premios => {
      _premiosDynamic = premios;
      renderPremiosDashboard(premios);
      renderStamps(userStamps);
    });
  } catch (_) {}
  try { initLookbook(); } catch (_) {}
  try { initServicioFavorito(PREVIEW_MOCK_USER); } catch (_) {}
  try { cargarServicios(); } catch (_) {}
  try { initProductosTab(); } catch (_) {}
  try { cargarAnuncio(); } catch (_) {}
}

// ─── Anuncios · toggle opt-out cliente ────────────────────────────
// Lee/escribe tenants/{tid}/anuncios_optout/{uid}. Si existe doc → opted out.
let _anuncioOptOutState = null; // true = recibiendo (default), false = opt-out
function _updateAnuncioToggleUI() {
  const btn = document.getElementById('anuncioOptOutToggle');
  if (!btn) return;
  const knob = btn.querySelector('span');
  if (_anuncioOptOutState === false) {
    btn.setAttribute('aria-checked', 'false');
    btn.classList.remove('bg-emerald-500');
    btn.classList.add('bg-white/15');
    if (knob) knob.style.transform = 'translateX(0)';
  } else {
    btn.setAttribute('aria-checked', 'true');
    btn.classList.remove('bg-white/15');
    btn.classList.add('bg-emerald-500');
    if (knob) knob.style.transform = 'translateX(20px)';
  }
}
async function _loadAnuncioOptOut() {
  try {
    const user = auth.currentUser;
    if (!user) return;
    // anuncios_optout es marca-aware para Kronnos (via _tenantCol/FDB.tenantCol).
    const ref = _tenantCol('anuncios_optout').doc(user.uid);
    const snap = await ref.get();
    _anuncioOptOutState = !snap.exists; // existe = opted out = state:false
    _updateAnuncioToggleUI();
  } catch (e) { console.warn('[anuncio-optout] load:', e.message); }
}
window.toggleAnuncioOptOut = async function () {
  const user = auth.currentUser;
  if (!user) return;
  const ref = _tenantCol('anuncios_optout').doc(user.uid);
  try {
    if (_anuncioOptOutState !== false) {
      // Actualmente recibiendo → opt-out
      await ref.set({ optedOutAt: new Date().toISOString(), uid: user.uid });
      _anuncioOptOutState = false;
    } else {
      // Actualmente opt-out → volver a recibir
      await ref.delete();
      _anuncioOptOutState = true;
    }
    _updateAnuncioToggleUI();
  } catch (e) { console.error('[anuncio-optout] toggle:', e.message); }
};

// ─── Anuncios · tracking apertura desde deep link ?ann={id} ───────
// Cuando el cliente entra vía click en un push, la URL trae ?ann={anuncioId}.
// Llamamos trackAperturaAnuncio para registrar el open + habilitar conversion
// attribution en las próximas 7 días. Idempotente en el server side.
async function trackAperturaAnuncioDesdeUrl(userAuth) {
  try {
    const url = new URL(window.location.href);
    const anuncioId = url.searchParams.get('ann');
    if (!anuncioId || !userAuth) return;
    const tenantId = window.CURRENT_TENANT_ID || 'elegance';
    const fn = firebase.functions().httpsCallable('trackAperturaAnuncio');
    await fn({ tenantId, anuncioId });
    // Limpia el param para que un refresh no lo cuente 2 veces (idempotente igual,
    // pero cuida la UX del link).
    url.searchParams.delete('ann');
    window.history.replaceState({}, '', url.toString());
  } catch (e) {
    console.warn('[anuncio] trackApertura failed:', e.message);
  }
}

