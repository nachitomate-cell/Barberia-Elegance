// ─── Confetti ─────────────────────────────────────────────────
function dispararConfetti() {
  const colors = window.CURRENT_TENANT_ID === 'lumen'
    ? ['#C9A050', '#06b6d4', '#67e8f9', '#ffffff', '#0891b2']
    : window.CURRENT_TENANT_ID === 'aura'
      ? ['#9CA3AF', '#00285E', '#ffffff', '#8E9399', '#D4D4D8']
      : window.CURRENT_TENANT_ID === 'infinity'
        ? ['#ffffff', '#f3f4f6', '#4b5563', '#111827', '#9ca3af']
        : ['#c9a84c', '#f0d080', '#ffffff', '#e8c060', '#ffd700'];
  confetti({ particleCount: 90, spread: 70, origin: { y: 0.55 }, colors, ticks: 220, scalar: 1.1 });
  setTimeout(() => {
    confetti({ particleCount: 45, spread: 80, angle: 60,  origin: { x: 0.15, y: 0.5 }, colors });
    confetti({ particleCount: 45, spread: 80, angle: 120, origin: { x: 0.85, y: 0.5 }, colors });
  }, 180);
}

// ─── Renderizar premios ───────────────────────────────────────
const _DASH_PREMIO_ICONS = ['ph-scissors','ph-drop','ph-lightning','ph-wind','ph-crown','ph-star','ph-gift'];

/* ═══ Sistema polimórfico de premios (categorías) ═══════════════════
   Cada premio lleva una `categoria` PRODUCTO/SERVICIO/DESCUENTO con
   una `configuracion` específica. Legacy sin categoría → SERVICIO.  */
const _CAT_META = {
  PRODUCTO:  { label: 'Producto',  emoji: '📦', icon: 'ph-package',    bg: 'rgba(56,189,248,0.12)',  border: 'rgba(56,189,248,0.35)',  color: '#38bdf8' },
  SERVICIO:  { label: 'Servicio',  emoji: '✂️', icon: 'ph-scissors',   bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.35)',  color: '#34d399' },
  DESCUENTO: { label: 'Descuento', emoji: '🏷️', icon: 'ph-tag',        bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.35)',  color: '#fbbf24' },
};
function _readCategoria(p) {
  return _CAT_META[p?.categoria] ? p.categoria : 'SERVICIO';
}

// ── Kronnos multi-sede: helpers de sede predominante para canje (D3) ──
// Regla 3 de Dexter: el premio se canjea en la sede con más sellos del cliente.
// Tiebreak A (empate): se canjea en la sede donde el cliente lo pide (sede actual).
const _KRONNOS_SEDE_NOMBRE = { penablanca: 'Peñablanca', limache: 'Limache', woman: 'Woman' };
function _kronnosSedeCanjeInfo() {
  // Devuelve { predominante, isEmpate, sedeCanje, resumen }.
  // predominante: sedeId ganadora o null si empate/sin sellos.
  // sedeCanje: sede a la que se atribuye contablemente el descuento (aplica tiebreak A).
  const conteo = window._userSellosPorSede || {};
  const sedes  = ['penablanca', 'limache', 'woman'];
  const sedeActual = window.CURRENT_SEDE_ID || null;
  let max = 0, ganador = null, empate = false;
  for (const s of sedes) {
    const n = Number(conteo[s]) || 0;
    if (n > max)      { max = n; ganador = s; empate = false; }
    else if (n === max && n > 0) empate = true;
  }
  const resumen = sedes.map(s => `${_KRONNOS_SEDE_NOMBRE[s]}: ${Number(conteo[s]) || 0}`).join(' · ');
  if (max === 0)  return { predominante: null,    isEmpate: false, sedeCanje: sedeActual, resumen };
  if (empate)     return { predominante: null,    isEmpate: true,  sedeCanje: sedeActual, resumen };
  return          { predominante: ganador, isEmpate: false, sedeCanje: ganador,    resumen };
}
/* ── Kronnos: contador animado para stats del perfil ──────────────
 * Anima el textContent de un elemento desde su valor actual (0 si es
 * primera vez) hasta el nuevo. Usa easing cubic-bezier(0.16, 1, 0.3, 1)
 * — mismo perfil que las entradas CSS. Duracion 700ms max.
 * Al finalizar agrega .stat-updated para el pulso definido en CSS.
 * Respeta prefers-reduced-motion (setea directo, sin animar). */
function _animarNumeroKronnos(el, target) {
  if (!el) return;
  const t = Number(target) || 0;
  // Reduced motion o valor identico → set directo
  const prefiereReduccion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const current = parseInt(el.textContent || '0', 10) || 0;
  if (prefiereReduccion || current === t) {
    el.textContent = t;
    return;
  }
  const from = current;
  const to   = t;
  const start = performance.now();
  const duration = Math.min(700, 220 + Math.abs(to - from) * 40);
  function easeOutQuint(x) { return 1 - Math.pow(1 - x, 5); }
  function step(now) {
    const elapsed = now - start;
    const progress = Math.min(1, elapsed / duration);
    const eased = easeOutQuint(progress);
    const val = Math.round(from + (to - from) * eased);
    el.textContent = val;
    if (progress < 1) requestAnimationFrame(step);
    else {
      el.classList.add('stat-updated');
      setTimeout(() => el.classList.remove('stat-updated'), 550);
    }
  }
  requestAnimationFrame(step);
}

function _kronnosPremioSublinea() {
  if (!(typeof window.isKronnos === 'function' && window.isKronnos())) return '';
  const info = _kronnosSedeCanjeInfo();
  let msg;
  if (info.predominante)  msg = `Canjeable en Kronnos ${_KRONNOS_SEDE_NOMBRE[info.predominante]}`;
  else if (info.isEmpate) msg = 'Canjeable en cualquier sede (empate en sellos)';
  else                    msg = 'Canjeable en la sede donde acumules más sellos';
  return `<p class="text-[10px] mt-0.5 text-white/50 flex items-center gap-1"><i class="ph ph-map-pin"></i>${msg}</p>`;
}

function renderPremiosDashboard(premios) {
  const el = document.getElementById('premiosList');
  if (!el) return;

  const lista = premios;

  if (!lista.length) {
    el.innerHTML = `<div class="flex flex-col items-center py-8 text-center">
      <i class="ph ph-trophy text-4xl text-white/10 mb-3"></i>
      <p class="text-sm text-gray-600">No hay premios configurados aún.</p>
    </div>`;
    return;
  }

  el.innerHTML = lista.map((p, i) => {
    const cat  = _readCategoria(p);
    const meta = _CAT_META[cat];
    const safeName = (p.nombre || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    // Para descuentos con restricción, mostrar sublínea "aplica en: X"
    let restrictLine = '';
    if (cat === 'DESCUENTO') {
      const cfg = p.configuracion || {};
      const a   = cfg.aplicaA || 'GLOBAL';
      const t   = cfg.targetName || '';
      if ((a === 'SERVICIO_ESPECIFICO' || a === 'PRODUCTO_ESPECIFICO') && t) {
        const safeTarget = String(t).replace(/</g, '&lt;');
        restrictLine = `<p class="text-[11px] mt-0.5" style="color:${meta.color};opacity:0.9;">aplica en ${safeTarget}</p>`;
      }
    }
    // Sede única (multisede) — copy explícito para que el cliente sepa dónde
    // canjear antes de gastar sus sellos.
    let sedeLine = '';
    if (p.sucursalNombre) {
      const safeSede = String(p.sucursalNombre).replace(/</g, '&lt;');
      sedeLine = `<p class="text-[11px] mt-0.5 font-semibold" style="color:#fdba74;">📍 Solo canjeable en ${safeSede}</p>`;
    }
    return `
    <div onclick="abrirModalCanje('${p.id || ''}')"
      data-prize-id="${p.id || ''}"
      data-nombre="${safeName}"
      data-sellos="${p.costoSellos}"
      data-categoria="${cat}"
      class="flex items-center gap-4 bg-[#111115] rounded-2xl border border-white/8 px-5 py-4 cursor-pointer active:scale-[0.98] transition-transform select-none hover:border-white/20">
      <span class="text-xl font-black text-white leading-none">${p.costoSellos}</span>
      <div class="w-px h-6 bg-white/10"></div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-0.5">
          <p class="text-xs font-bold text-white/30 uppercase tracking-widest">Sellos</p>
          <span class="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border"
            style="background:${meta.bg};border-color:${meta.border};color:${meta.color};">
            <span>${meta.emoji}</span>${meta.label}
          </span>
        </div>
        <p class="text-sm font-bold text-white">${p.nombre}</p>
        ${restrictLine}
        ${sedeLine}
        ${_kronnosPremioSublinea()}
      </div>
      <i class="ph-bold ph-caret-right text-white/20 text-sm shrink-0"></i>
    </div>`;
  }).join('');
}

/* ═══ Recompensas pendientes por canjear ═══════════════════════════
   Listener en tiempo real a `redemptions` con status:'pending' y
   userId del cliente logueado. Renderiza cards tocables que abren
   el modal QR/PIN con la redemption existente (sin generar una nueva). */
function subscribePendingRewards(user) {
  if (_pendingRewardsUnsub) { _pendingRewardsUnsub(); _pendingRewardsUnsub = null; }
  if (!user) return;
  try {
    _pendingRewardsUnsub = _tenantCol('redemptions')
      .where('userId', '==', user.uid)
      .where('status', '==', 'pending')
      .onSnapshot(
        snap => {
          const list = snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            // Ordenar cliente-side por createdAt desc (evita necesitar índice compuesto)
            .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
          renderPendingRewards(list);
        },
        err => {
          console.warn('[pending-rewards] snapshot:', err.message);
          renderPendingRewards([]);
        },
      );
  } catch (e) {
    console.warn('[pending-rewards] subscribe:', e.message);
  }
}

function renderPendingRewards(rewards) {
  const list    = document.getElementById('pendingRewardsList');
  const empty   = document.getElementById('pendingRewardsEmpty');
  const count   = document.getElementById('pendingRewardsCount');
  const navBtn  = document.getElementById('navRecompensas');
  const badge   = document.getElementById('recompensasBadge');
  if (!list) return;

  // Filtrar expiradas — la CF `sellosTenant` limpia los expired también,
  // pero mientras tanto no las mostramos.
  const now = Date.now();
  const activos = (rewards || []).filter(r => {
    const exp = r.expiresAt?.toMillis?.() || 0;
    return !exp || exp > now;
  });

  // Toggle nav-tab: solo aparece si hay ≥ 1 recompensa activa. Badge muestra
  // el conteo para llamar la atención sin ser invasivo.
  if (navBtn) {
    if (activos.length > 0) navBtn.classList.remove('hidden');
    else                    navBtn.classList.add('hidden');
  }
  if (badge) {
    if (activos.length > 0) {
      badge.textContent = String(activos.length);
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }
  if (count) count.textContent = activos.length;

  // Empty state dentro de la pestaña (por si el user llega desde otro punto).
  if (activos.length === 0) {
    list.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    // Si estaba mirando esta tab, redirigimos a loyalty para no dejarlo en un
    // panel vacío (caso: canjeó la única que tenía).
    if (typeof activeTab !== 'undefined' && activeTab === 'recompensas') {
      try { switchTab('loyalty'); } catch(_) {}
    }
    return;
  }
  if (empty) empty.classList.add('hidden');

  list.innerHTML = activos.map(r => {
    // Origen legible (por si viene del programa de referidos vs canje manual)
    const origen = r.origen === 'referral_referrer' ? 'Por invitar a un amigo'
                 : r.origen === 'referral_referred' ? 'Por usar un código al registrarte'
                 : (r.motivo || '');
    const safeName = String(r.prizeName || 'Recompensa').replace(/</g, '&lt;');
    const safeOrigen = String(origen).replace(/</g, '&lt;');
    // Tiempo restante hasta expirar (si aplica) — helper visual, la validez la
    // impone el escáner del local al leer el QR/PIN.
    let ttlBadge = '';
    const exp = r.expiresAt?.toMillis?.() || 0;
    if (exp) {
      const mins = Math.max(0, Math.floor((exp - now) / 60000));
      if (mins <= 60) {
        ttlBadge = `<span class="text-[9px] font-bold px-2 py-0.5 rounded-full" style="background:rgba(239,68,68,0.15);color:rgba(252,165,165,1);">${mins}m</span>`;
      }
    }

    const sedeName = r.sucursalNombre ? String(r.sucursalNombre).replace(/</g, '&lt;') : '';
    const sedeLine = sedeName
      ? `<p class="text-[11px] mt-0.5 truncate font-semibold" style="color:#fdba74;">📍 Solo en ${sedeName}</p>`
      : '';

    return `
      <div onclick="abrirCanjeExistente('${r.id}')" data-red-id="${r.id}"
        class="flex items-center gap-3 rounded-2xl px-4 py-3 cursor-pointer active:scale-[0.98] transition-transform select-none"
        style="background:linear-gradient(135deg, rgba(251,191,36,0.10) 0%, rgba(251,191,36,0.04) 100%);border:1px solid rgba(251,191,36,0.25);">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style="background:rgba(251,191,36,0.15);border:1px solid rgba(251,191,36,0.20);">
          <i class="ph-fill ph-gift text-lg" style="color:rgba(251,191,36,1);"></i>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-bold text-white truncate leading-tight">${safeName}</p>
          ${safeOrigen ? `<p class="text-[11px] text-white/50 mt-0.5 truncate">${safeOrigen}</p>` : ''}
          ${sedeLine}
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          ${ttlBadge}
          <span class="text-[10px] font-bold px-2 py-1 rounded-full text-white/70" style="background:rgba(255,255,255,0.08);">Canjear →</span>
        </div>
      </div>`;
  }).join('');
}

/* Abre el modal de QR/PIN con una redemption YA CREADA (por la CF de
   referidos o por un canje previo). No genera un doc nuevo — se lee
   el existente. Si el token expiró, se refresca (nuevo token + expiresAt). */
window.abrirCanjeExistente = async function (redemptionId) {
  try {
    const snap = await _tenantCol('redemptions').doc(redemptionId).get();
    if (!snap.exists) {
      showToast('Esta recompensa ya no está disponible.', 'err');
      return;
    }
    const data = snap.data() || {};
    if (data.status !== 'pending') {
      showToast('Esta recompensa ya fue canjeada.', 'ok');
      return;
    }

    const exp = data.expiresAt?.toMillis?.() || 0;
    _activeRedemption = {
      id:        redemptionId,
      token:     data.token || '----',
      expiresMs: exp,
      prizeName: data.prizeName || 'Recompensa',
    };
    // Nota: si el token expiró, `_mostrarPinYQR` renderea el countdown a 00:00
    // y muestra el warning "código expiró". El user puede cancelar la redemption
    // y generar una nueva desde la tabla de premios. No refrescamos el token acá
    // porque las rules solo permiten al user cambiar status a 'cancelled'.

    // El modal usa dos estados: info (canjeInfoState) y token (canjeTokenState).
    // Saltamos directo al token porque la redemption ya existe.
    document.getElementById('canjeInfoState')?.classList.add('hidden');
    document.getElementById('canjeTokenState')?.classList.remove('hidden');
    document.getElementById('canjeModal')?.classList.remove('hidden');
    _mostrarPinYQR(_activeRedemption);
  } catch (e) {
    console.error('[canje-existente] error:', e);
    showToast('No pudimos abrir la recompensa. Reintenta.', 'err');
  }
};

/* ═══ Canje seguro: crear redemption doc con PIN 4 dígitos ══════════ */
let _activeRedemption = null;   // { id, token, expiresAt, prizeName }
let _canjeCountdownIv = null;

function _findPremio(prizeId) {
  return (_premiosDynamic || []).find(p => String(p.id) === String(prizeId));
}

function _showCanjeError(text, target = 'canjeError') {
  const el = document.getElementById(target);
  if (!el) return;
  el.textContent = text;
  el.classList.remove('hidden');
}
function _hideCanjeError() {
  document.getElementById('canjeError')?.classList.add('hidden');
  document.getElementById('canjeTokenError')?.classList.add('hidden');
}

/* Abre el modal en estado 1 (info + confirmación) con datos del premio. */
function abrirModalCanje(prizeId) {
  const p = _findPremio(prizeId);
  if (!p) return;
  const cat = _readCategoria(p);
  const meta = _CAT_META[cat];

  document.getElementById('canjeInfoState').classList.remove('hidden');
  document.getElementById('canjeTokenState').classList.add('hidden');
  _hideCanjeError();

  document.getElementById('canjeModalTitle').textContent = p.nombre;
  // Kronnos: agrega info de sede predominante al subtitle (regla 3 Dexter + tiebreak A).
  let _subtitle = `${p.costoSellos} sello${p.costoSellos !== 1 ? 's' : ''}`;
  if (typeof window.isKronnos === 'function' && window.isKronnos()) {
    const info = _kronnosSedeCanjeInfo();
    if (info.predominante)      _subtitle += ` · Canjeable en Kronnos ${_KRONNOS_SEDE_NOMBRE[info.predominante]}`;
    else if (info.isEmpate)     _subtitle += ` · Canjeable en cualquier sede`;
    else                        _subtitle += ` · Canjeable donde tengas más sellos`;
  }
  document.getElementById('canjeModalSubtitle').textContent = _subtitle;
  document.getElementById('canjeCategoryBadge').innerHTML = `
    <span class="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border"
      style="background:${meta.bg};border-color:${meta.border};color:${meta.color};">
      <span>${meta.emoji}</span>${meta.label}
    </span>`;
  const iconEl = document.getElementById('canjeCategoryIcon');
  iconEl.style.background   = meta.bg;
  iconEl.style.borderColor  = meta.border;
  iconEl.innerHTML = `<i class="ph-fill ${meta.icon} text-2xl" style="color:${meta.color};"></i>`;

  // Guardar id del premio candidato en el botón "Generar" para que el
  // handler sepa qué doc crear al presionar.
  const btn = document.getElementById('canjeGenerarBtn');
  btn.dataset.prizeId = p.id;
  btn.disabled = false;
  btn.innerHTML = '<i class="ph-bold ph-qr-code"></i> Generar QR / PIN';

  // Respeta el flag "autoservicio de canje" (panel → Premios).
  // Si el dueño lo apagó, ocultamos el botón "Generar" y mostramos un
  // aviso pidiendo canje asistido por el staff.
  const autoAviso = document.getElementById('canjeAutoAviso');
  if (_canjeAutoEnabled) {
    btn.classList.remove('hidden');
    if (autoAviso) autoAviso.classList.add('hidden');
  } else {
    btn.classList.add('hidden');
    if (autoAviso) autoAviso.classList.remove('hidden');
  }

  document.getElementById('canjeModal').classList.remove('hidden');
}

function cerrarModalCanje() {
  document.getElementById('canjeModal').classList.add('hidden');
  if (_canjeCountdownIv) { clearInterval(_canjeCountdownIv); _canjeCountdownIv = null; }
  _activeRedemption = null;
}

/* Genera el canje llamando a la CF `crearCanje` (descuenta sellos +
   crea la redemption en una sola transacción atómica). Antes se hacía
   con un add() directo desde el cliente, sin descontar → permitía
   generar N QRs con los mismos sellos hasta que el staff aprobara.
   Ahora los sellos bajan al instante y solo vuelven si se cancela/expira. */
async function generarCanjeDesdeModal() {
  const btn = document.getElementById('canjeGenerarBtn');
  const prizeId = btn?.dataset?.prizeId;
  const p = _findPremio(prizeId);
  if (!p || !currentUser) return;

  _hideCanjeError();
  btn.disabled = true;
  btn.innerHTML = '<span class="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span> Generando...';

  try {
    const fn = firebase.functions().httpsCallable('crearCanje');
    // Kronnos: incluye sedeCanje (regla 3 + tiebreak A) para que la CF atribuya
    // contablemente el descuento a la sede correcta. Ignorado por CF pre-D5.
    const payload = {
      tenantId: window.CURRENT_TENANT_ID || 'elegance',
      prizeId:  p.id,
      ttlMinutes: 15,
    };
    if (typeof window.isKronnos === 'function' && window.isKronnos()) {
      const info = _kronnosSedeCanjeInfo();
      payload.marcaTenantId = 'kronnos';
      payload.sedeCanje = info.sedeCanje; // 'penablanca' | 'limache' | 'woman' | null
    }
    const res = await fn(payload);
    const { redemptionId, token, expiresMs } = res.data || {};
    if (!redemptionId) throw new Error('Respuesta del servidor inválida.');

    _activeRedemption = {
      id:        redemptionId,
      token,
      expiresMs,
      prizeName: p.nombre,
    };
    _mostrarPinYQR(_activeRedemption);
  } catch (e) {
    console.error('[Canje] generar:', e);
    // Los errores de httpsCallable vienen con .message legible (definido en la CF).
    const msg = e?.message || 'No pudimos crear tu canje. Reintenta.';
    _showCanjeError(msg);
    btn.disabled = false;
    btn.innerHTML = '<i class="ph-bold ph-qr-code"></i> Generar QR / PIN';
  }
}

/* Renderiza el estado 2 del modal: QR + PIN + countdown. */
function _mostrarPinYQR(red) {
  document.getElementById('canjeInfoState').classList.add('hidden');
  document.getElementById('canjeTokenState').classList.remove('hidden');
  _hideCanjeError();

  document.getElementById('canjeTokenPrizeName').textContent = red.prizeName;
  document.getElementById('canjeTokenPin').textContent       = red.token;

  // Payload del QR: una URL a la página de canje del staff. Cualquier barbero
  // /admin la abre con la cámara nativa del teléfono (sin depender del panel),
  // inicia sesión con su cuenta y confirma la entrega. La página + la Cloud
  // Function canjearRecompensaLink validan que sea staff del local (si el link
  // fuera abierto, el propio cliente se auto-canjearía desde la casa).
  const _tenant = window.CURRENT_TENANT_ID || 'elegance';
  const payload = `${location.origin}/canjear.html`
    + `?t=${encodeURIComponent(_tenant)}`
    + `&r=${encodeURIComponent(red.id)}`
    + `&k=${encodeURIComponent(red.token || '')}`;
  const canvas = document.getElementById('canjeQrCanvas');
  if (canvas) {
    const pintarQR = () => window.QRCode.toCanvas(canvas, payload, {
      width: 200,
      margin: 1,
      color: { dark: '#0a0a0a', light: '#ffffff' },
    }, err => {
      if (err) console.error('[QR] render error', err);
    });
    // El módulo del QR es diferido: si el cliente abre el canje antes de que
    // cargue, pintamos en cuanto avise. Antes el guard lo saltaba en silencio
    // y el QR simplemente no aparecía.
    if (window.QRCode?.toCanvas) pintarQR();
    else window.addEventListener('qrcode:ready', pintarQR, { once: true });
  }

  // Countdown
  if (_canjeCountdownIv) clearInterval(_canjeCountdownIv);
  const upd = () => {
    const msLeft = Math.max(0, red.expiresMs - Date.now());
    const s = Math.floor(msLeft / 1000);
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    const cd = document.getElementById('canjeCountdown');
    if (cd) cd.textContent = `${mm}:${ss}`;
    if (msLeft <= 0) {
      clearInterval(_canjeCountdownIv);
      _canjeCountdownIv = null;
      _showCanjeError('Tu código expiró. Ciérralo y genera uno nuevo.', 'canjeTokenError');
    }
  };
  upd();
  _canjeCountdownIv = setInterval(upd, 1000);
}

/* Cancela el canje activo (client → status "cancelled"). */
async function cancelarCanjeActivo() {
  if (!_activeRedemption) { cerrarModalCanje(); return; }
  const btn = document.getElementById('canjeCancelarBtn');
  btn.disabled = true;
  const originalHtml = btn.innerHTML;
  btn.innerHTML = '<span class="w-4 h-4 border-2 border-white/40 border-t-transparent rounded-full animate-spin"></span> Cancelando...';
  try {
    // La CF devuelve los sellos que se descontaron al crear el canje. Antes
    // se hacía update directo — no devolvía sellos porque no había flag de
    // "sellosCargados" y el descuento venía después (en el aprove del staff).
    const fn = firebase.functions().httpsCallable('cancelarCanje');
    await fn({
      tenantId:     window.CURRENT_TENANT_ID || 'elegance',
      redemptionId: _activeRedemption.id,
      reason:       'user_cancel_modal',
    });
  } catch (e) {
    console.error('[Canje] cancelar:', e);
  } finally {
    if (_canjeCountdownIv) { clearInterval(_canjeCountdownIv); _canjeCountdownIv = null; }
    _activeRedemption = null;
    cerrarModalCanje();
  }
}

// ─── Toggle premios ───────────────────────────────────────────
function togglePremios() {
  const section = document.getElementById('premiosSection');
  _premiosVisible = !_premiosVisible;
  
  if (_premiosVisible) {
    section.classList.remove('hidden');
    void section.offsetHeight; // Forzar reflow para habilitar transición
    section.classList.add('visible');
  } else {
    section.classList.remove('visible');
    setTimeout(() => {
      if (!_premiosVisible) section.classList.add('hidden');
    }, 400);
  }
}

// ─── Rangos del cliente (config desde el panel /rangos) ───────
let _rangosCfg = null;
let _lastHistoricos = 0;
const _RANGO_DEFAULTS = [
  { id: 'silver',   nombre: 'Silver',   minSellos: 0  },
  { id: 'gold',     nombre: 'Gold',     minSellos: 10 },
  { id: 'platinum', nombre: 'Platinum', minSellos: 25 },
];
// Espejo del catálogo informativo del panel (Rangos.jsx).
const _RANGO_BENEF_CATALOGO = {
  descuento_productos:   'Descuento en productos',
  prioridad_reserva:     'Prioridad en la reserva',
  atencion_preferencial: 'Atención preferencial',
  regalo_cumpleanos:     'Regalo de cumpleaños',
  producto_regalo:       'Producto de regalo',
  promos_exclusivas:     'Promociones exclusivas',
};

function _getRangos() {
  return _RANGO_DEFAULTS.map(d => {
    const f = (_rangosCfg || []).find(r => r.id === d.id) || {};
    return {
      id: d.id,
      nombre:    f.nombre || d.nombre,
      minSellos: f.minSellos != null ? f.minSellos : d.minSellos,
      sellosPorVisita:    f.sellosPorVisita,
      descuentoServicios: f.descuentoServicios,
      descuentoPct:       f.descuentoPct,
      beneficios:         Array.isArray(f.beneficios) ? f.beneficios : [],
      beneficiosCustom:   Array.isArray(f.beneficiosCustom) ? f.beneficiosCustom : [],
    };
  });
}
function _rangoBeneficios(r) {
  const out = [];
  const s = Number(r.sellosPorVisita);
  if (Number.isFinite(s) && s > 0) out.push(`${s} sello${s !== 1 ? 's' : ''} por visita`);
  if (r.descuentoServicios) out.push(`${Number(r.descuentoPct) || 10}% de descuento en servicios`);
  (r.beneficios || []).forEach(id => { if (_RANGO_BENEF_CATALOGO[id]) out.push(_RANGO_BENEF_CATALOGO[id]); });
  (r.beneficiosCustom || []).forEach(c => { if (c && String(c).trim()) out.push(String(c).trim()); });
  return out;
}
function _rangoReqLabel(r) {
  const m = Number(r.minSellos) || 0;
  return m <= 0 ? 'Toda visita' : `Desde ${m} visitas`;
}
function _rangoIdDe(historicos) {
  const h = Number(historicos) || 0;
  return h >= 25 ? 'platinum' : h >= 10 ? 'gold' : 'silver';
}
async function loadRangos() {
  try {
    const snap = await _tenantCol('configuracion').doc('rangos').get();
    _rangosCfg = snap.exists ? (snap.data().rangos || []) : [];
  } catch (_) { _rangosCfg = []; }
  renderRangoBeneficios(_lastHistoricos);
}
function toggleRangoDetalle(id) {
  const d = document.getElementById('rangoDetalle-' + id);
  const c = document.getElementById('rangoCaret-' + id);
  if (!d) return;
  const open = !d.classList.toggle('hidden');
  if (c) c.style.transform = open ? 'rotate(180deg)' : '';
}
// Reconstruye las tarjetas de rango con nombres + beneficios (desplegables).
function renderRangoBeneficios(historicos) {
  const cont = document.querySelector('#profileBenefits > div');
  if (!cont) return;
  const rangos = _getRangos();
  const currentId = _rangoIdDe(historicos);
  cont.innerHTML = rangos.map(r => {
    const benes = _rangoBeneficios(r);
    const isCur = r.id === currentId;
    const items = benes.length
      ? benes.map(b => `<li class="flex items-start gap-2 text-[12px] text-white/70"><i class="ph-fill ph-check-circle text-[13px] shrink-0 mt-0.5" style="color:var(--gold);"></i><span>${b}</span></li>`).join('')
      : '<li class="text-[11px] text-white/30 italic">Sin beneficios definidos todavía.</li>';
    return `
      <div class="tier-row rounded-2xl border border-white/8 bg-white/5 overflow-hidden ${isCur ? 'is-current' : ''}" data-tier="${r.id}">
        <button type="button" class="w-full px-4 py-3 flex items-center justify-between text-left" onclick="toggleRangoDetalle('${r.id}')">
          <div class="flex items-center gap-2 min-w-0">
            <span class="tier-badge ${r.id}">${r.nombre}</span>
            <span class="text-[10px] text-white/40 font-bold uppercase tracking-wider truncate">${_rangoReqLabel(r)}</span>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <span class="tier-current-label ${isCur ? '' : 'hidden'} text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full" style="background:var(--gold-glow);color:var(--gold);">Tu rango</span>
            <i class="ph-bold ph-caret-down text-white/40 text-sm transition-transform" id="rangoCaret-${r.id}"></i>
          </div>
        </button>
        <div id="rangoDetalle-${r.id}" class="hidden px-4 pb-3.5 pt-0.5">
          <ul class="space-y-1.5">${items}</ul>
        </div>
      </div>`;
  }).join('');
}

// ─── Renderizar sellos ────────────────────────────────────────
// count       = sellosDisponibles (saldo actual — controla el grid y la barra)
// historicos  = sellosHistoricos  (total acumulado — controla el nivel)
function renderStamps(count, historicos) {
  if (historicos === undefined) historicos = count; // retrocompat
  const grid = document.getElementById('stampsGrid');
  grid.innerHTML = '';

  const premios = _premiosDynamic.length
    ? [..._premiosDynamic].sort((a, b) => a.costoSellos - b.costoSellos)
    : [{ costoSellos: 10, nombre: 'Corte Gratis' }];

  const nextPremio  = premios.find(p => count < p.costoSellos);
  const target      = nextPremio ? nextPremio.costoSellos : (premios[premios.length - 1]?.costoSellos || 10);
  const filledCount = Math.min(count, target);

  // Ajustar cols del grid al target — con target ≤5 usamos `target` columnas
  // para que la fila llene el ancho (antes forzaba 5 y dejaba columnas vacías).
  const cols = target <= 5 ? target : target <= 8 ? 4 : 5;
  grid.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;

  const tid = window.CURRENT_TENANT_ID || 'elegance';

  for (let i = 1; i <= target; i++) {
    const filled       = i <= filledCount;
    const isNew        = i === filledCount && count > 0 && _stampsSynced;
    const isGrandPrize = i === target;

    const cell = document.createElement('div');

    if (filled) {
      cell.className = `stamp-cell filled${isGrandPrize ? ' prize-filled' : ''}`;
      if (isNew) cell.style.animation = 'stampPop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards';
      if (tid === 'chameleon') {
        cell.innerHTML = `<img src="/sellochamaleon.png" loading="lazy" style="width:75%;height:75%;object-fit:contain;" alt="sello" />`;
      } else if (tid === 'lumen') {
        cell.innerHTML = `<i class="ph-fill ph-anchor text-lg text-black"></i>`;
      } else if (isGrandPrize) {
        cell.innerHTML = `<i class="ph-fill ph-gift text-lg"></i>`;
      } else if (tid === 'aura') {
        cell.innerHTML = `<i class="ph-fill ph-basketball text-lg"></i>`;
      } else if (tid === 'latincaribe') {
        cell.innerHTML = `<span style="font-size:18px;line-height:1;">🎱</span>`;
      } else {
        cell.innerHTML = `<i class="ph-fill ph-scissors text-lg text-black"></i>`;
      }
    } else if (isGrandPrize) {
      cell.className = 'stamp-cell prize-empty';
      cell.innerHTML = `<i class="ph-fill ph-gift text-lg" style="color:rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.38);"></i>`;
    } else {
      const isNextStamp = (i === filledCount + 1) && tid === 'omega';
      cell.className = 'stamp-cell empty' + (isNextStamp ? ' stamp-next' : '');
    }

    grid.appendChild(cell);
  }

  // Counter
  document.getElementById('stampsCount').innerHTML =
    `${count}<span style="font-size:0.875rem;color:rgba(255,255,255,0.3);">/${target}</span>`;
  auraCountUp(count, target);

  // Onboarding hint para usuarios nuevos sin sellos
  const onboardingEl = document.getElementById('sellosOnboarding');
  if (onboardingEl) onboardingEl.classList.toggle('hidden', count > 0);
  const onbMeta = document.getElementById('onboardingMeta');
  if (onbMeta) onbMeta.textContent = `${target} sello${target === 1 ? '' : 's'}`;

  // Progress bar
  const pct = Math.min((count / target) * 100, 100);
  document.getElementById('stampsBar').style.width = pct + '%';

  // Next reward texts
  const faltan = nextPremio ? nextPremio.costoSellos - count : 0;

  const nextRewardTextEl = document.getElementById('nextRewardText');
  const nextRewardNameEl = document.getElementById('nextRewardName');

  if (nextPremio) {
    nextRewardTextEl.textContent = `${nextPremio.costoSellos} sellos → ${nextPremio.nombre}`;
    if (nextRewardNameEl) nextRewardNameEl.textContent = nextPremio.nombre;
  } else {
    nextRewardTextEl.textContent = '¡Eres nuestro cliente más fiel!';
    if (nextRewardNameEl) nextRewardNameEl.textContent = '¡Nivel máximo!';
  }

  // Membership description
  const descEl = document.getElementById('membershipDesc');
  if (descEl && nextPremio) {
    descEl.textContent = `Agenda ${nextPremio.costoSellos} citas y obtén ${nextPremio.nombre.toLowerCase()}.`;
  }

  // Tier — calculado con el total histórico (no con disponibles)
  _lastHistoricos = historicos;
  const tierLabel = historicos >= 25 ? 'PLATINUM' : historicos >= 10 ? 'GOLD' : 'SILVER';
  const tierId    = tierLabel.toLowerCase();
  // Nombres personalizados de los rangos (config /rangos).
  const _rangos    = _getRangos();
  const _nombreDe  = id => (_rangos.find(r => r.id === id)?.nombre) || id;
  const tierNombre = _nombreDe(tierId);

  const tierEl = document.getElementById('memberTier');
  if (tierEl) {
    tierEl.className = 'tier-badge';
    tierEl.textContent = tierNombre;
    tierEl.classList.add(tierId);
  }

  // Profile: tier badge + visitas + sellos
  const profileTierEl = document.getElementById('profileTierBadge');
  if (profileTierEl) profileTierEl.textContent = tierNombre;
  const profileVisitsEl = document.getElementById('profileVisitsCount');
  if (profileVisitsEl) _animarNumeroKronnos(profileVisitsEl, historicos);
  const profileStampsEl = document.getElementById('profileStamps');
  if (profileStampsEl) _animarNumeroKronnos(profileStampsEl, count);

  // Beneficios por rango — tarjetas con nombres + beneficios (desplegables)
  renderRangoBeneficios(historicos);

  // Mensaje de progresión al siguiente rango (con nombres personalizados)
  const profileTierProgressEl = document.getElementById('profileTierProgress');
  if (profileTierProgressEl) {
    if (historicos < 10) {
      const faltan = 10 - historicos;
      profileTierProgressEl.innerHTML = `¡Faltan <span class="font-bold text-white">${faltan}</span> visitas para subir al rango <span class="font-bold animate-pulse" style="color:var(--gold);">${_nombreDe('gold')}</span>!`;
    } else if (historicos < 25) {
      const faltan = 25 - historicos;
      profileTierProgressEl.innerHTML = `¡Faltan <span class="font-bold text-white">${faltan}</span> visitas para subir al rango <span class="font-bold text-purple-300 animate-pulse">${_nombreDe('platinum')}</span>!`;
    } else {
      profileTierProgressEl.innerHTML = `🏆 ¡Has alcanzado el rango máximo <span class="font-bold animate-pulse" style="color:var(--gold);">${_nombreDe('platinum')}</span>!`;
    }
  }
}

/* ═══ Mis Packs Activos ══════════════════════════════════════════
   Renderiza el listado de packs (cuponeras) activos del cliente. Se
   filtran client-side los expirados o sin saldo para dejarlos ocultos
   visualmente (los datos siguen en el doc para auditoría). */
function renderMisPacks(packs) {
  const section = document.getElementById('misPacksSection');
  const list    = document.getElementById('misPacksList');
  const count   = document.getElementById('misPacksCount');
  if (!section || !list) return;

  const now = Date.now();
  const activos = (packs || []).filter(p => {
    const rest = Number(p.sesionesRestantes || 0);
    const vencMs = p.fechaVencimiento?.toMillis?.() ?? 0;
    return rest > 0 && (!vencMs || vencMs > now);
  });

  if (activos.length === 0) {
    section.classList.add('hidden');
    return;
  }
  section.classList.remove('hidden');
  if (count) count.textContent = activos.length;

  list.innerHTML = activos.map(p => {
    const total = Math.max(1, Number(p.sesionesTotales || 1));
    const rest  = Number(p.sesionesRestantes || 0);
    const usadas = total - rest;
    const pctUsadas = Math.min(100, Math.round((usadas / total) * 100));
    const nombre = String(p.nombrePack || 'Pack').replace(/</g, '&lt;');
    // Vencimiento legible: "vence en 12d" o "vence hoy" cuando faltan <24h
    let vencChip = '';
    const vencMs = p.fechaVencimiento?.toMillis?.() ?? 0;
    if (vencMs) {
      const diffMs = vencMs - now;
      const dias = Math.floor(diffMs / (24*60*60*1000));
      const urgente = dias <= 3;
      const label = dias <= 0 ? 'vence hoy' : `${dias}d`;
      vencChip = `<span class="text-[9px] font-bold px-2 py-0.5 rounded-full" style="background:${urgente ? 'rgba(239,68,68,0.15)' : 'rgba(167,139,250,0.15)'};color:${urgente ? 'rgba(252,165,165,1)' : 'rgba(167,139,250,1)'};">${label}</span>`;
    }
    return `
      <div class="rounded-2xl px-4 py-3 flex items-center gap-3 select-none"
        style="background:linear-gradient(135deg, rgba(167,139,250,0.10) 0%, rgba(167,139,250,0.04) 100%);border:1px solid rgba(167,139,250,0.25);">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style="background:rgba(167,139,250,0.15);border:1px solid rgba(167,139,250,0.20);">
          <span class="text-lg leading-none" aria-hidden="true">📦</span>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <p class="text-sm font-bold text-white truncate leading-tight flex-1 min-w-0">${nombre}</p>
            ${vencChip}
          </div>
          <p class="text-[11px] text-white/60 mt-0.5">
            <span class="text-white font-semibold">${rest}</span> de ${total} sesión${total !== 1 ? 'es' : ''} restante${rest !== 1 ? 's' : ''}
          </p>
          <div class="mt-1.5 h-1 rounded-full overflow-hidden" style="background:rgba(255,255,255,0.06);">
            <div class="h-full transition-all" style="width:${pctUsadas}%;background:linear-gradient(90deg, rgba(167,139,250,0.85), rgba(139,92,246,1));"></div>
          </div>
        </div>
      </div>`;
  }).join('');
}

/* ═══ Google Wallet — botón "Añadir a Google Wallet" ═══════════════
   Visible solo si el local activó el módulo (configuracion/wallet.enabled).
   Al tocar, la CF walletGenerarPase crea/asegura el LoyaltyObject del
   cliente y devuelve el "Save to Google Wallet" URL. El pase se
   sincroniza solo después (trigger walletSyncSello*). */
(function initWalletSave() {
  function walletCfgRef() {
    const tid = window.CURRENT_TENANT_ID || 'elegance';
    return tid === 'elegance'
      ? db.doc('configuracion/wallet')
      : db.doc(`tenants/${tid}/configuracion/wallet`);
  }

  async function maybeShow() {
    const btn = document.getElementById('walletSaveBtn');
    if (!btn) return;
    try {
      const snap = await walletCfgRef().get();
      if (snap.exists && snap.data().enabled === true) btn.classList.remove('hidden');
      else btn.classList.add('hidden');
    } catch (_) { /* config no disponible → botón oculto */ }
  }

  window.guardarEnGoogleWallet = async function () {
    const btn = document.getElementById('walletSaveBtn');
    if (!currentUser) {
      if (typeof showToast === 'function') showToast('Inicia sesión para guardar tu tarjeta.', 'err');
      return;
    }
    const original = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="w-4 h-4 border-2 border-black/50 border-t-transparent rounded-full animate-spin inline-block"></span> Generando...';
    }
    try {
      const tid = window.CURRENT_TENANT_ID || 'elegance';
      const fn = firebase.functions().httpsCallable('walletGenerarPase');
      const res = await fn({ tenantId: tid });
      const url = res.data && res.data.saveUrl;
      if (!url) throw new Error('Respuesta sin URL de guardado.');
      const w = window.open(url, '_blank');
      if (!w) window.location.href = url; // fallback si el popup fue bloqueado
    } catch (e) {
      console.error('[wallet] guardar:', e);
      if (typeof showToast === 'function') showToast('No pudimos generar tu tarjeta. Reintenta.', 'err');
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = original; }
    }
  };

  // Mostrar cuando el auth esté listo (cubre flujo real y preview).
  try { firebase.auth().onAuthStateChanged(() => maybeShow()); } catch (_) {}
  document.addEventListener('DOMContentLoaded', maybeShow);
})();

