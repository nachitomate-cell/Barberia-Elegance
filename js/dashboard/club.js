// ─── Referidos: card promocional + acciones ───────────────────
// Fuente de verdad: tenants/{tid}/settings/general.referralProgram
// Se dispara desde subscribeUserData → renderReferralCard(data) cuando llega
// el snapshot del user. Si el user no tiene referralCode, se genera aquí y
// se persiste (backfill para users pre-feature).
let _referralProgramCache = null;
// Flag "autoservicio de canje" del panel /premios. Default FALSE (opt-in):
// el dueño debe activarlo desde el panel para permitir que el cliente genere
// el QR desde el móvil. Sin ese opt-in explícito, el canje es asistido por staff.
let _canjeAutoEnabled = false;

async function _loadReferralProgramConfig() {
  try {
    const tid = window.CURRENT_TENANT_ID || 'elegance';
    const ref = tid === 'elegance'
      ? db.collection('settings').doc('general')
      : db.collection('tenants').doc(tid).collection('settings').doc('general');
    // Listener en vivo: si el dueño apaga el toggle desde el panel mientras el
    // cliente tiene el dashboard abierto, el modal actualiza al vuelo sin recargar.
    ref.onSnapshot(
      snap => {
        const d = snap.exists ? (snap.data() || {}) : {};
        _referralProgramCache = d.referralProgram || { enabled: false };
        // Opt-in estricto: solo === true habilita el autoservicio.
        _canjeAutoEnabled = d.canjeClienteEnabled === true;
      },
      err => {
        console.warn('[settings] onSnapshot:', err.message);
        if (!_referralProgramCache) _referralProgramCache = { enabled: false };
      },
    );
  } catch (e) {
    _referralProgramCache = { enabled: false };
    console.warn('[referrals] cfg:', e.message);
  }
}
_loadReferralProgramConfig();

function _generateReferralCode(nombreCompleto) {
  const first = String(nombreCompleto || '').trim().split(/\s+/)[0] || '';
  const clean = first
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z]/g, '')
    .toUpperCase();
  const prefix = (clean + 'XXXX').slice(0, 4);
  const suffix = String(Math.floor(1000 + Math.random() * 9000));
  return `${prefix}-${suffix}`;
}

async function _ensureReferralCode(userDocData) {
  if (userDocData.referralCode) return userDocData.referralCode;
  const code = _generateReferralCode(userDocData.nombre || 'CLUB');
  try {
    await FDB.usersCol().doc(currentUser.uid).update({ referralCode: code });
  } catch (e) { console.warn('[referrals] backfill:', e.message); }
  return code;
}

async function renderReferralCard(userDocData) {
  const card = document.getElementById('referralCard');
  if (!card) return;
  // Esperar a que la config cargue (poll ligero, máx 3s)
  let waited = 0;
  while (!_referralProgramCache && waited < 3000) {
    await new Promise(r => setTimeout(r, 100));
    waited += 100;
  }
  const rp = _referralProgramCache || { enabled: false };
  if (!rp.enabled) { card.classList.add('hidden'); return; }

  const code = await _ensureReferralCode(userDocData);
  const msgEl = document.getElementById('referralMsg');
  const codeEl = document.getElementById('referralCodeDisplay');
  const nombreLocal = SHOP.nombre || SHOP.nombreCorto || 'nuestro Club';
  if (msgEl) {
    // Prioriza la recompensa estructurada (recompensaReferidor.textoDinamico);
    // el rewardText legacy queda solo como respaldo. Antes se usaba SIEMPRE el
    // legacy → el cliente veía "1 sello" aunque el dueño hubiera configurado 3.
    const rewardRefdor = rp.recompensaReferidor && rp.recompensaReferidor.textoDinamico;
    const rewardRefdo  = rp.recompensaReferido  && rp.recompensaReferido.textoDinamico;
    let reward;
    if (rewardRefdor) {
      // "complete su primer corte": la recompensa se otorga al COMPLETAR la cita,
      // no solo al reservar (coincide con el guard de la Cloud Function).
      reward = `<span class="text-white font-bold">¡${rewardRefdor}</span> por cada amigo que se registre y complete su primer corte!`;
      if (rewardRefdo) {
        reward += `<br><span style="opacity:.65;font-size:12px">Tu amigo también recibe ${rewardRefdo} de bienvenida.</span>`;
      }
    } else {
      reward = rp.rewardText || '¡Gana beneficios exclusivos por cada amigo que se una!';
    }
    msgEl.innerHTML = `Comparte <span class="text-white font-bold">${nombreLocal}</span> y gana:<br>${reward}`;
  }
  if (codeEl) codeEl.textContent = code || '—';
  card.dataset.referralCode = code || '';
  card.classList.remove('hidden');
}

window.copyReferralCode = function () {
  const code = document.getElementById('referralCard')?.dataset?.referralCode || '';
  if (!code) return;
  const done = () => showToast('¡Código copiado!', 'ok');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(code).then(done).catch(() => {
      _fallbackCopy(code); done();
    });
  } else {
    _fallbackCopy(code); done();
  }
};
function _fallbackCopy(text) {
  try {
    const t = document.createElement('textarea');
    t.value = text; t.style.position = 'fixed'; t.style.left = '-9999px';
    document.body.appendChild(t); t.select(); document.execCommand('copy');
    document.body.removeChild(t);
  } catch (_) {}
}

window.shareReferralWhatsApp = function (ev) {
  if (ev) ev.preventDefault();
  const code = document.getElementById('referralCard')?.dataset?.referralCode || '';
  if (!code) return;
  const nombreLocal = SHOP.nombre || SHOP.nombreCorto || 'nuestro Club';
  const origin = window.location.origin || '';
  // Link con ?ref=CODIGO: registro.html lo detecta y pre-rellena el input.
  // Así el amigo no tiene que copiar/pegar (donde se pierde el 40% del flujo).
  const link = `${origin}/registro?ref=${encodeURIComponent(code)}`;
  const msg = `¡Únete al Club de ${nombreLocal}! Regístrate con mi link y agendamos:\n${link}`;
  const url = 'https://wa.me/?text=' + encodeURIComponent(msg);
  window.open(url, '_blank', 'noopener,noreferrer');
};

// ─── Servicios desde Firestore ────────────────────────────────
async function cargarServicios() {
  const grid = document.getElementById('serviciosGrid');
  if (!grid) return;
  try {
    const servicios = await FDB.getServicios();
    const muestra   = servicios.filter(s => s.activo !== false).slice(0, 6);
    if (!muestra.length) { document.getElementById('serviciosSection')?.classList.add('hidden'); return; }

    // Barbers Club: list-view horizontal compacta (paridad con paso 1 de reservas).
    // Cambia el contenedor a flex-col apilado en lugar del carrusel horizontal.
    if (window.CURRENT_TENANT_ID === 'barbersclub') {
      grid.className = 'flex flex-col gap-2 px-5';
      grid.innerHTML = muestra.map(s => {
        const precio = s.precio ? `$${Number(s.precio).toLocaleString('es-CL')}` : '';
        const icono  = s.icono || 'ph-scissors';
        const dur    = s.duracion ? `${Number(s.duracion)} min` : '';
        const iconEl = s.imagen
          ? `<img src="${s.imagen}" alt="${s.nombre.replace(/"/g, '&quot;')}" loading="lazy" class="w-full h-full object-cover rounded-full">`
          : `<i class="ph-fill ${icono} text-xl" style="color:#eab308;"></i>`;
        const svcHref = `index.html?servicioId=${encodeURIComponent(s.id)}`;
        return `<a href="${svcHref}" class="service-card relative flex flex-row items-center gap-3 py-3 px-4 rounded-2xl overflow-hidden" style="background:#27272a;border:1px solid #404040;text-decoration:none;min-height:64px;">
          <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style="background:#18181b;border:1px solid #404040;">
            ${iconEl}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-[15px] font-semibold leading-tight tracking-tight" style="color:#e5e5e5;">${s.nombre}</p>
            ${dur ? `<p class="flex items-center gap-1 text-[11px] mt-0.5" style="color:#a3a3a3;"><i class="ph ph-clock text-[12px]"></i>${dur}</p>` : ''}
          </div>
          ${precio ? `<span class="text-lg font-bold tracking-tight text-right shrink-0" style="color:#eab308;">${precio}</span>` : ''}
        </a>`;
      }).join('');
      return;
    }

    grid.innerHTML = muestra.map(s => {
      const precio = s.precio ? `$${Number(s.precio).toLocaleString('es-CL')}` : '';
      const icono  = s.icono || (window.CURRENT_TENANT_ID === 'gitana' ? 'ph-sparkle' : 'ph-scissors');

      const imgHtml = s.imagen
        ? `<img src="${s.imagen}" alt="${s.nombre.replace(/"/g, '&quot;')}" loading="lazy" class="absolute inset-0 w-full h-full object-cover opacity-60">`
        : `<div class="absolute inset-0 flex items-center justify-center">
            <i class="ph-fill ${icono} text-5xl" style="color:var(--gold);opacity:0.15;"></i>
          </div>`;

      // Deep link a la agenda con el servicio pre-seleccionado (salta a Paso 2).
      const svcHref = `index.html?servicioId=${encodeURIComponent(s.id)}`;
      return `<a href="${svcHref}" class="service-card snap-center flex-shrink-0 relative rounded-2xl overflow-hidden cursor-pointer" style="width:148px;height:188px;background:#18181b;text-decoration:none;">
        ${imgHtml}
        <div class="absolute inset-0" style="background:linear-gradient(to top,rgba(0,0,0,0.92) 0%,rgba(0,0,0,0.10) 60%,transparent 100%);"></div>
        <div class="absolute bottom-0 left-0 right-0 p-3.5">
          <p class="text-[11px] font-black uppercase tracking-wider text-white leading-tight">${s.nombre}</p>
          ${precio ? `<p class="text-[10px] font-bold mt-1" style="color:var(--gold);">${precio}</p>` : ''}
        </div>
      </a>`;
    }).join('');
  } catch {
    document.getElementById('serviciosSection')?.classList.add('hidden');
  }
}

// ─── Lookbook ─────────────────────────────────────────────────
async function initLookbook() {
  const grid  = document.getElementById('lookbookGrid');
  const empty = document.getElementById('lookbookEmpty');
  if (!grid) return;

  // Verificar flag lookbookActivo en config/ui
  try {
    const _lbCfgTid = window.CURRENT_TENANT_ID || 'elegance';
    const _lbCfgRef = _lbCfgTid === 'elegance'
      ? db.collection('config').doc('ui')
      : db.collection('tenants').doc(_lbCfgTid).collection('config').doc('ui');
    const cfgSnap = await _lbCfgRef.get();
    const activo  = cfgSnap.exists ? !!cfgSnap.data().lookbookActivo : false;
    if (!activo) return; // sección desactivada — no mostrar tab ni cargar fotos
  } catch (_) {}

  // Mostrar pestaña en la nav
  const navBtn = document.getElementById('navLookbook');
  if (navBtn) navBtn.classList.remove('hidden');

  grid.innerHTML = `
    <div class="masonry-item rounded-md aspect-[3/4] bg-white/5 animate-pulse"></div>
    <div class="masonry-item rounded-md aspect-[4/5] bg-white/5 animate-pulse"></div>
    <div class="masonry-item rounded-md aspect-square bg-white/5 animate-pulse"></div>
    <div class="masonry-item rounded-md aspect-[3/4] bg-white/5 animate-pulse"></div>`;

  if (_lookbookUnsub) { _lookbookUnsub(); _lookbookUnsub = null; }

  const _lbTid = window.CURRENT_TENANT_ID || 'elegance';
  const _lbCol = _lbTid === 'elegance'
    ? db.collection('lookbook')
    : db.collection('tenants').doc(_lbTid).collection('lookbook');
  _lookbookUnsub = _lbCol.orderBy('order', 'asc').onSnapshot(snap => {
    if (snap.empty) {
      _lbDocs = [];
      grid.innerHTML = '';
      empty.classList.remove('hidden');
      empty.classList.add('flex');
      return;
    }
    empty.classList.add('hidden');
    empty.classList.remove('flex');
    const newDocs  = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const likedIds = _lbGetLiked();
    const changes  = snap.docChanges();

    // Reconstruir el grid completo SOLO ante altas/bajas/cambios de orden o
    // el primer render. Para un simple like (modified) actualizamos el badge
    // en su lugar — sin recrear las <img>, que era lo que causaba el
    // "recargado" tosco y el re-fade de todas las imágenes.
    const domIds    = [...grid.querySelectorAll('[data-lb-id]')].map(n => n.getAttribute('data-lb-id'));
    const newIds    = newDocs.map(d => d.id);
    const sameOrder = domIds.length === newIds.length && domIds.every((id, i) => id === newIds[i]);
    const structural = !domIds.length
      || changes.some(c => c.type === 'added' || c.type === 'removed')
      || !sameOrder;

    _lbDocs = newDocs;

    if (structural) {
      grid.innerHTML = _lbDocs.map(d => _lbItemHtml(d, likedIds)).join('');
    } else {
      changes.forEach(c => {
        const id   = c.doc.id;
        const d    = _lbDocs.find(x => x.id === id);
        const slot = grid.querySelector(`[data-lb-id="${CSS.escape(id)}"] .lb-badge-slot`);
        if (d && slot) slot.innerHTML = _lbBadgeInner(d, likedIds.includes(id));
      });
    }
    if (_lbCurrentId) _lbSyncViewer();
  }, err => console.error('[Lookbook] onSnapshot:', err));
}

// ─── Modal Equipo ─────────────────────────────────────────────
let _equipoBarberosCache = null;

function _renderEquipoGrid(barberos) {
  const grid = document.getElementById('equipoGrid');
  if (!grid) return;
  if (!barberos.length) {
    grid.innerHTML = '<p class="col-span-2 text-center text-zinc-500 text-sm py-10">Sin profesionales registrados.</p>';
    return;
  }
  const _defaultBios = [
    'Su historia se escribe en cada corte. Las tijeras hablan más que las palabras.',
    'Más años de experiencia que palabras para describirse. Deja que el resultado hable.',
    'Reservando las palabras para cuando su navaja lo haga por él.',
    'Perfeccionista nato. Aún eligiendo las palabras exactas para presentarse.',
  ];
  grid.innerHTML = barberos.map((b, i) => {
    const initials = (b.nombre || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
    const label = b.especialidad || (b.rol && b.rol !== 'barbero' ? b.rol : 'Barbero');
    const bio = b.bio || b.historia || b.descripcion || _defaultBios[i % _defaultBios.length];
    const safeNombre = (b.nombre || '').replace(/'/g, "\\'");
    const safeLabel  = label.replace(/'/g, "\\'");
    const safeBio    = bio.replace(/'/g, "\\'");
    const safeFoto   = (b.foto || '').replace(/'/g, "\\'");
    const avatarContent = b.foto
      ? `<img src="${b.foto}" alt="${b.nombre}" loading="lazy"
             class="w-full h-full object-cover transition-opacity duration-300"
             style="opacity:0;"
             onload="this.style.opacity='1';const ns=this.nextElementSibling;if(ns)ns.style.display='none';"
             onerror="this.style.display='none';const ns=this.nextElementSibling;if(ns)ns.style.display='flex';">
         <span class="absolute inset-0 animate-pulse rounded-full" style="background:var(--gold-glow);"></span>`
      : `<span class="text-2xl font-black text-white">${initials}</span>`;
    return `
      <div class="bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col items-center py-5 px-3 gap-3 cursor-pointer active:scale-95 transition-transform"
           onclick="abrirBarberoBio('${safeNombre}','${safeLabel}','${safeFoto}','${safeBio}')">
        <div class="relative w-20 h-20 rounded-full overflow-hidden flex items-center justify-center shrink-0"
             style="background:var(--gold-glow);border:2px solid var(--gold-dim);">
          ${avatarContent}
        </div>
        <div class="text-center">
          <p class="text-sm font-bold text-white leading-tight">${b.nombre}</p>
          <p class="text-[11px] mt-1 capitalize font-semibold" style="color:var(--gold);">${label}</p>
        </div>
      </div>`;
  }).join('');
}

async function abrirEquipoModal() {
  const modal = document.getElementById('equipoModal');
  const grid  = document.getElementById('equipoGrid');
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  // Si ya tenemos datos en cache, renderizamos de inmediato (sin espera)
  if (_equipoBarberosCache) {
    _renderEquipoGrid(_equipoBarberosCache);
    // Refresh silencioso en background para datos frescos
    FDB.getBarberos().then(b => {
      _equipoBarberosCache = b;
      if (!document.getElementById('equipoModal').classList.contains('hidden')) {
        _renderEquipoGrid(b);
      }
    }).catch(() => {});
    return;
  }

  try {
    const barberos = await FDB.getBarberos();
    _equipoBarberosCache = barberos;
    _renderEquipoGrid(barberos);
  } catch (e) {
    console.error('[Equipo]', e);
    grid.innerHTML = '<p class="col-span-2 text-center text-zinc-500 text-sm py-10">No se pudo cargar el equipo.</p>';
  }
}
function cerrarEquipoModal() {
  document.getElementById('equipoModal').classList.add('hidden');
  document.body.style.overflow = '';
}

function abrirBarberoBio(nombre, label, foto, bio) {
  const overlay = document.getElementById('barberoBioOverlay');
  const sheet   = document.getElementById('barberoBioSheet');
  const initials = nombre.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  document.getElementById('bioBarberoNombre').textContent = nombre;
  document.getElementById('bioBarberoLabel').textContent  = label;
  document.getElementById('bioBarberoTexto').textContent  = bio;

  const avatarEl = document.getElementById('bioBarberoAvatar');
  avatarEl.innerHTML = foto
    ? `<img src="${foto}" alt="${nombre}" loading="lazy" class="w-full h-full object-cover">`
    : initials;

  overlay.classList.remove('hidden');
  requestAnimationFrame(() => { sheet.style.transform = 'translateY(0)'; });
}

function cerrarBarberoBio() {
  const overlay = document.getElementById('barberoBioOverlay');
  const sheet   = document.getElementById('barberoBioSheet');
  sheet.style.transform = 'translateY(100%)';
  setTimeout(() => overlay.classList.add('hidden'), 320);
}

// ─── Visor Lookbook ───────────────────────────────────────────
// abrirFotoLookbook(url, photoId) — el 1er arg queda por compat con calls
// legacy (fotos manuales que pasaban solo la URL). Si viene photoId lo
// usamos para lookup del doc (permite detectar reels/videos).
function abrirFotoLookbook(url, photoId) {
  const imgEl   = document.getElementById('lookbookViewerImg');
  const videoEl = document.getElementById('lookbookViewerVideo');
  const igLink  = document.getElementById('lbOpenInIg');

  const doc = photoId ? _lbDocs.find(d => d.id === photoId) : null;
  const isVideo = !!(doc && doc.mediaType === 'VIDEO' && doc.videoUrl);

  if (isVideo) {
    // Reel: usa <video>. Poster = thumbnail. Fallback = permalink en IG.
    videoEl.src    = doc.videoUrl;
    videoEl.poster = doc.thumbnailUrl || doc.url || '';
    videoEl.classList.remove('hidden');
    imgEl.src = '';
    imgEl.classList.add('hidden');
    if (doc.permalink) {
      igLink.href = doc.permalink;
      igLink.classList.remove('hidden');
    } else {
      igLink.classList.add('hidden');
    }
    // Auto-play silencioso (los reels de IG suelen tener audio ambiental);
    // si el navegador lo bloquea, el usuario tiene los controles.
    try { videoEl.play().catch(() => {}); } catch (_) {}
  } else {
    // Foto: comportamiento clásico.
    imgEl.src = url;
    imgEl.classList.remove('hidden');
    videoEl.pause();
    videoEl.removeAttribute('src');
    videoEl.load();
    videoEl.classList.add('hidden');
    igLink.classList.add('hidden');
  }

  _lbCurrentId = photoId || null;
  _lbSyncViewer();
  document.getElementById('lookbookViewer').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function cerrarLookbookViewer() {
  const videoEl = document.getElementById('lookbookViewerVideo');
  document.getElementById('lookbookViewer').classList.add('hidden');
  document.getElementById('lookbookViewerImg').src = '';
  // Detener el reel al cerrar para liberar bandwidth y no seguir cargando.
  videoEl.pause();
  videoEl.removeAttribute('src');
  videoEl.load();
  videoEl.classList.add('hidden');
  document.getElementById('lbOpenInIg').classList.add('hidden');
  _lbCurrentId = null;
  document.body.style.overflow = '';
}

// ─── Likes del Lookbook ───────────────────────────────────────
function _lbCollection() {
  const tid = window.CURRENT_TENANT_ID || 'elegance';
  return tid === 'elegance'
    ? db.collection('lookbook')
    : db.collection('tenants').doc(tid).collection('lookbook');
}
function _lbLikesKey() { return 'lb_likes_' + (window.CURRENT_TENANT_ID || 'elegance'); }
function _lbGetLiked() { try { return JSON.parse(localStorage.getItem(_lbLikesKey()) || '[]'); } catch (_) { return []; } }
function _lbSaveLiked(ids) { try { localStorage.setItem(_lbLikesKey(), JSON.stringify(ids)); } catch (_) {} }

// Render del badge de likes (reutilizado en build y en updates en sitio).
function _lbBadgeInner(d, liked) {
  const likes = d.likes || 0;
  if (likes <= 0) return '';
  return `<div class="absolute z-20 flex items-center" style="top:0.6rem;right:0.6rem;gap:4px;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);color:#fff;font-size:10px;font-weight:700;padding:3px 8px;border-radius:10px;pointer-events:none;">
            <i class="ph-fill ph-heart" style="font-size:10px;color:${liked ? '#f87171' : 'rgba(255,255,255,0.7)'}"></i>
            <span>${likes}</span>
          </div>`;
}
// Render de una sola tarjeta del lookbook. Para reels (mediaType==='VIDEO')
// mostramos el thumbnail con un badge de play — la reproducción se abre en
// el visor.
function _lbItemHtml(d, likedIds) {
  const url     = d.url;
  const liked   = likedIds.includes(d.id);
  const isVideo = d.mediaType === 'VIDEO';
  const playBadge = isVideo
    ? `<div class="absolute z-20 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center rounded-full bg-black/55 backdrop-blur-sm" style="width:44px;height:44px;">
         <i class="ph-fill ph-play" style="color:#fff;font-size:20px;margin-left:2px;"></i>
       </div>`
    : '';
  return `
    <div class="masonry-item rounded-md overflow-hidden border border-white/8 bg-[#111115] relative min-h-[180px] cursor-pointer active:opacity-80 transition-opacity"
         data-lb-id="${d.id}"
         onclick="abrirFotoLookbook('${url}','${d.id}')">
      <div class="lk-sk absolute inset-0 bg-white/5 animate-pulse"></div>
      <img src="${url}" loading="lazy" class="w-full object-cover block relative z-10 opacity-0 transition-opacity duration-500"
           onload="this.style.opacity='1';const s=this.parentElement.querySelector('.lk-sk');if(s)s.remove();"
           onerror="this.parentElement.remove()">
      ${playBadge}
      <div class="lb-badge-slot">${_lbBadgeInner(d, liked)}</div>
    </div>`;
}

// Refresca el corazón y el contador del visor según el doc actual
function _lbSyncViewer() {
  const btn   = document.getElementById('lbLikeBtn');
  const icon  = document.getElementById('lbLikeIcon');
  const count = document.getElementById('lbLikeCount');
  if (!btn || !icon || !count) return;
  if (!_lbCurrentId) { btn.classList.add('hidden'); return; }
  btn.classList.remove('hidden');
  const doc   = _lbDocs.find(d => d.id === _lbCurrentId);
  const liked = _lbGetLiked().includes(_lbCurrentId);
  const n     = (doc && doc.likes) || 0;
  icon.style.color  = liked ? '#ef4444' : '#ffffff';
  count.textContent = n > 0 ? n : '';
}

async function toggleLikeViewer() {
  const id = _lbCurrentId;
  if (!id) return;
  const liked    = _lbGetLiked();
  const wasLiked = liked.includes(id);
  // Optimista: localStorage + cache local
  _lbSaveLiked(wasLiked ? liked.filter(x => x !== id) : [...liked, id]);
  const doc = _lbDocs.find(d => d.id === id);
  if (doc) doc.likes = Math.max(0, (doc.likes || 0) + (wasLiked ? -1 : 1));
  _lbSyncViewer();
  // Persistir en Firestore (requiere estar autenticado)
  try {
    await _lbCollection().doc(id).update({
      likes: firebase.firestore.FieldValue.increment(wasLiked ? -1 : 1)
    });
  } catch (_) { /* sin auth/conexión: el like local queda */ }
}

// ─── Anuncio dinámico (Hero Banner) ──────────────────────────
async function cargarAnuncio() {
  try {
    const tid = window.CURRENT_TENANT_ID || 'elegance';
    const ref = tid === 'elegance'
      ? firebase.firestore().collection('config').doc('anuncio')
      : firebase.firestore().collection('tenants').doc(tid).collection('config').doc('anuncio');

    const snap = await ref.get();
    if (!snap.exists) return;
    const d = snap.data();
    if (!d.activo) return;

    const banner = document.getElementById('heroBanner');
    if (!banner) return;

    // Construir el banner con imagen + estilo seleccionable + contenido
    const isAura  = (tid === 'aura');
    const estilo  = d.estilo || 'panel';
    const titulo  = d.titulo || '';
    const desc    = d.descripcion || '';
    const cta     = d.ctaTexto || 'Reservar mi lugar';
    const ctaUrl  = d.ctaUrl || 'index.html';

    if (!d.imagen) {
      // ── Sin imagen: render por defecto de cada local ──
      if (isAura) {
        banner.style.cssText = 'background:linear-gradient(145deg,#001020 0%,#001a40 45%,#002d6b 100%);position:relative;overflow:hidden;';
        banner.innerHTML = `
          <div class="absolute inset-0 pointer-events-none" style="background-image:linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px);background-size:24px 24px;"></div>
          <div class="absolute -top-8 right-0 w-40 h-40 rounded-full pointer-events-none" style="background:radial-gradient(circle,rgba(96,165,250,0.18) 0%,transparent 60%);"></div>
          <div class="relative z-10 px-5 py-5 flex flex-col justify-between" style="min-height:155px;">
            <div class="flex items-center gap-1.5">
              <i class="ph-fill ph-megaphone" style="font-size:12px;color:rgba(147,197,253,0.75);"></i>
              <span style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:0.18em;color:rgba(255,255,255,0.45);">Anuncio</span>
              ${desc ? `<span style="margin-left:auto;font-size:10px;font-weight:700;color:rgba(255,255,255,0.85);background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.18);padding:3px 10px;border-radius:100px;">${desc}</span>` : ''}
            </div>
            <div>
              <h3 class="text-white font-black leading-snug" style="font-size:1.15rem;margin-bottom:14px;">${titulo}</h3>
              <a href="${ctaUrl}" class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold active:scale-95 transition-all" style="background:#FFFFFF;color:#001a40;">${cta} <i class="ph-bold ph-arrow-right" style="font-size:14px;"></i></a>
            </div>
          </div>`;
      } else {
        banner.style.cssText = 'min-height:170px;background:#1a1208;position:relative;overflow:hidden;';
        banner.innerHTML = `
          <div class="relative z-10 p-5 flex flex-col justify-end" style="min-height:170px;">
            <p class="text-[9px] font-black uppercase tracking-widest mb-1" style="color:var(--gold);">Anuncio</p>
            <h3 class="text-lg font-black text-white leading-tight mb-1">${titulo}</h3>
            ${desc ? `<p class="text-xs text-white/65 leading-snug mb-3">${desc}</p>` : '<div class="mb-3"></div>'}
            <a href="${ctaUrl}" class="self-start inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-black active:scale-95 transition-all" style="background:var(--gold);">${cta} <i class="ph-bold ph-arrow-right text-sm"></i></a>
          </div>`;
      }
    } else {
      // ── Con imagen: estilo elegido en el panel (panel / degradado / bloque / wash) ──
      const _hexToRgb = (h) => { h = String(h).replace('#',''); if (h.length === 3) h = h.split('').map(c => c+c).join(''); const n = parseInt(h, 16); return `${(n>>16)&255},${(n>>8)&255},${n&255}`; };
      const _textOn   = (h) => { const [r,g,b] = _hexToRgb(h).split(',').map(Number); return (0.299*r + 0.587*g + 0.114*b)/255 > 0.62 ? '#1a1208' : '#ffffff'; };

      const goldVar = (getComputedStyle(document.documentElement).getPropertyValue('--gold') || '').trim() || '#D4AF37';
      const accent  = isAura ? '#0a2540' : goldVar;
      const accRGB  = _hexToRgb(accent);
      const onAcc   = isAura ? '#ffffff' : _textOn(goldVar);

      let titleClr, descClr, eyebrowClr, ctaBg, ctaTxt, shadow = false;
      if (estilo === 'wash' || estilo === 'bloque') {
        titleClr   = onAcc;
        descClr    = onAcc === '#ffffff' ? 'rgba(255,255,255,0.82)' : 'rgba(20,16,8,0.78)';
        eyebrowClr = onAcc === '#ffffff' ? 'rgba(255,255,255,0.7)'  : 'rgba(20,16,8,0.6)';
        ctaBg      = isAura ? '#ffffff' : (onAcc === '#ffffff' ? '#ffffff' : '#111111');
        ctaTxt     = isAura ? '#001a40' : (onAcc === '#ffffff' ? accent : goldVar);
      } else { // panel, degradado → texto sobre superficie oscura
        titleClr   = '#ffffff';
        descClr    = 'rgba(255,255,255,0.8)';
        eyebrowClr = isAura ? 'rgba(147,197,253,0.9)' : goldVar;
        ctaBg      = isAura ? '#ffffff' : goldVar;
        ctaTxt     = isAura ? '#001a40' : _textOn(goldVar);
        shadow     = (estilo === 'degradado');
      }

      const inner = `
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
          <i class="ph-fill ph-megaphone" style="font-size:12px;color:${eyebrowClr};"></i>
          <span style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:0.16em;color:${eyebrowClr};">Anuncio</span>
          ${desc ? `<span style="margin-left:auto;font-size:10px;font-weight:700;color:${titleClr};background:rgba(127,127,127,0.18);border:1px solid rgba(127,127,127,0.30);padding:3px 10px;border-radius:100px;">${desc}</span>` : ''}
        </div>
        <h3 class="font-black leading-snug" style="font-size:1.12rem;margin-bottom:12px;color:${titleClr};${shadow ? 'text-shadow:0 2px 8px rgba(0,0,0,0.7);' : ''}">${titulo}</h3>
        <a href="${ctaUrl}" class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold active:scale-95 transition-all" style="background:${ctaBg};color:${ctaTxt};">${cta} <i class="ph-bold ph-arrow-right" style="font-size:14px;"></i></a>`;

      if (estilo === 'bloque') {
        banner.style.cssText = `position:relative;overflow:hidden;min-height:200px;background:${accent};`;
        banner.innerHTML = `
          <div style="height:96px;background:url('${d.imagen}') center/cover no-repeat;"></div>
          <div style="padding:14px 16px;background:${accent};">${inner}</div>`;
      } else if (estilo === 'wash') {
        banner.style.cssText = `position:relative;overflow:hidden;min-height:170px;background:url('${d.imagen}') center/cover no-repeat;`;
        banner.innerHTML = `
          <div class="absolute inset-0" style="background:linear-gradient(135deg, rgba(${accRGB},0.93) 0%, rgba(${accRGB},0.80) 100%);"></div>
          <div class="relative z-10" style="padding:18px;display:flex;flex-direction:column;justify-content:flex-end;min-height:170px;">${inner}</div>`;
      } else if (estilo === 'degradado') {
        banner.style.cssText = `position:relative;overflow:hidden;min-height:170px;background:url('${d.imagen}') center/cover no-repeat;`;
        banner.innerHTML = `
          <div class="absolute inset-0" style="background:linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.15) 100%);"></div>
          <div class="relative z-10" style="padding:18px;display:flex;flex-direction:column;justify-content:flex-end;min-height:170px;">${inner}</div>`;
      } else { // panel
        banner.style.cssText = `position:relative;overflow:hidden;min-height:170px;background:url('${d.imagen}') center/cover no-repeat;`;
        banner.innerHTML = `
          <div class="absolute inset-0" style="background:rgba(0,0,0,0.30);"></div>
          <div class="relative z-10" style="padding:16px;display:flex;flex-direction:column;justify-content:flex-end;min-height:170px;">
            <div style="background:rgba(10,12,20,0.62);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,0.14);border-radius:16px;padding:14px 16px;">${inner}</div>
          </div>`;
      }
    }
    banner.classList.remove('hidden');

    // Punto rojo si el usuario no ha visto esta versión
    const versionId = d.versionId || String(d.updatedAt?.seconds || 'v1');
    banner.dataset.version = versionId;
    const lastSeen = localStorage.getItem('lastSeenAnuncio');
    if (versionId !== lastSeen) {
      const dot = document.getElementById('loyaltyDot');
      if (dot) dot.classList.remove('hidden');
      // Si el usuario ya está mirando fidelización, marcar como visto tras 2s
      if (activeTab === 'loyalty') {
        setTimeout(marcarAnuncioVisto, 2000);
      }
    }
  } catch(e) {
    console.warn('[Anuncio]', e.message);
  }
}

function marcarAnuncioVisto() {
  const dot = document.getElementById('loyaltyDot');
  if (dot) dot.classList.add('hidden');
  const banner = document.getElementById('heroBanner');
  if (banner?.dataset.version) {
    localStorage.setItem('lastSeenAnuncio', banner.dataset.version);
  }
}

// ─── Tab Navigation ───────────────────────────────────────────
function switchTab(tab) {
  if (tab === activeTab) return;
  activeTab = tab;
  if (tab === 'loyalty') marcarAnuncioVisto();

  const panels  = { loyalty: 'tabLoyalty', lookbook: 'tabLookbook', productos: 'tabProductos', recompensas: 'tabRecompensas', profile: 'tabProfile' };
  const navBtns = { loyalty: 'navLoyalty', lookbook: 'navLookbook', productos: 'navProductos', recompensas: 'navRecompensas', profile: 'navProfile' };

  Object.values(panels).forEach(id => {
    const el = document.getElementById(id);
    el.classList.add('hidden');
    el.classList.remove('animate-[fadeSlideUp_0.45s_cubic-bezier(0.16,1,0.3,1)_forwards]');
  });
  Object.values(navBtns).forEach(id => document.getElementById(id).classList.remove('active'));

  const activePanel = document.getElementById(panels[tab]);
  activePanel.classList.remove('hidden');
  void activePanel.offsetWidth;
  activePanel.classList.add('animate-[fadeSlideUp_0.45s_cubic-bezier(0.16,1,0.3,1)_forwards]');
  document.getElementById(navBtns[tab])?.classList.add('active');

  // Slide dynamic tab indicator
  updateNavIndicator(tab);
}

function updateNavIndicator(tab) {
  const btnId = { loyalty: 'navLoyalty', lookbook: 'navLookbook', productos: 'navProductos', recompensas: 'navRecompensas', profile: 'navProfile' }[tab];
  const activeBtn = document.getElementById(btnId);
  const indicator = document.getElementById('navActiveIndicator');
  if (activeBtn && indicator) {
    setTimeout(() => {
      const parentRect = activeBtn.parentElement.getBoundingClientRect();
      const btnRect = activeBtn.getBoundingClientRect();
      indicator.style.width = `${btnRect.width}px`;
      indicator.style.transform = `translateX(${btnRect.left - parentRect.left}px)`;
    }, 50);
  }
}

window.addEventListener('resize', () => {
  if (window.activeTab) {
    updateNavIndicator(window.activeTab);
  }
});

// ─── Teléfono prefix ──────────────────────────────────────────
(function initPhonePrefix() {
  const PREFIX = '+56 9 ';
  const input = document.getElementById('editTelefono');
  if (!input) return;
  input.addEventListener('focus', () => { if (!input.value.startsWith('+56')) input.value = PREFIX; });
  input.addEventListener('input', () => { if (!input.value.startsWith('+56')) input.value = PREFIX; });
  input.addEventListener('keydown', e => {
    if ((e.key === 'Backspace' || e.key === 'Delete') && input.selectionStart <= PREFIX.length) e.preventDefault();
  });
})();


function validatePhone(value) {
  return /^\+56\s?9\s?\d{4}\s?\d{4}$/.test(value.trim());
}

// ─── Comparar / amigos ────────────────────────────────────────
// Helpers compartidos
function _normalizarNombre(s) {
  return (s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // quita acentos
    .toLowerCase().trim().replace(/\s+/g, ' ');
}
function _tierInfo(historicos) {
  const tierKey = historicos >= 25 ? 'platinum' : historicos >= 10 ? 'gold' : 'silver';
  return { tierKey, tierLabel: tierKey.charAt(0).toUpperCase() + tierKey.slice(1) };
}
function _escAttr(s) {
  return (s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

// Colección PÚBLICA (solo campos no sensibles) tenant-aware.
function _userPublicCol() {
  const tid = window.CURRENT_TENANT_ID || 'elegance';
  return tid === 'elegance'
    ? db.collection('userPublic')
    : db.collection('tenants').doc(tid).collection('userPublic');
}

// Espeja mi perfil público para que mis amigos puedan encontrarme/compararme.
// Se llama desde el snapshot de userUnsub; solo escribe si algo cambió.
let _pubKey = null;
async function syncUserPublic(data) {
  if (!currentUser) return;
  const nombre = data.nombre || currentUser.displayName || '';
  const pub = {
    uid:              currentUser.uid,
    nombre,
    nombreLower:      _normalizarNombre(nombre),
    emailLower:       (currentUser.email || data.email || '').toLowerCase(),
    sellosHistoricos: data.sellosHistoricos ?? data.stamps ?? 0,
    photoURL:         currentUser.photoURL || data.photoURL || null,
  };
  const key = JSON.stringify(pub);
  if (key === _pubKey) return; // sin cambios → no reescribir
  _pubKey = key;
  try { await _userPublicCol().doc(currentUser.uid).set(pub, { merge: true }); }
  catch (e) { console.warn('[userPublic]', e.message); }
}

// Render de una fila (resultado de búsqueda o amigo guardado)
function _amigoRowHtml({ uid, nombre, email, historicos, esAmigo }) {
  const { tierKey, tierLabel } = _tierInfo(historicos);
  const visitas   = historicos;
  const iniciales = (nombre || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const eU = _escAttr(uid), eN = _escAttr(nombre), eE = _escAttr(email);
  const accion = esAmigo
    ? `<button onclick="quitarAmigo('${eU}')" title="Quitar amigo"
         class="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white/40 active:scale-95 transition-all"
         style="border:1px solid rgba(255,255,255,0.12);"><i class="ph-bold ph-x text-sm"></i></button>`
    : `<button onclick="agregarAmigo(this,'${eU}','${eN}','${eE}')"
         class="shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wide transition-all active:scale-95"
         style="background:var(--gold-glow);color:var(--gold);border:1px solid var(--gold-dim);">+ Amigo</button>`;
  return `
    <div class="flex items-center gap-3 p-3 rounded-xl bg-black/30 border border-white/8 mb-2">
      <div class="w-11 h-11 rounded-full flex items-center justify-center shrink-0 font-black text-sm"
        style="background:var(--gold-glow);color:var(--gold);border:1px solid var(--gold-dim);">${iniciales}</div>
      <div class="flex-1 min-w-0">
        <p class="font-bold text-white text-sm truncate">${nombre}</p>
        ${email ? `<p class="text-[11px] text-white/35 truncate">${email}</p>` : ''}
      </div>
      <div class="flex flex-col items-end gap-1">
        <span class="tier-badge ${tierKey}">${tierLabel}</span>
        <span class="text-[10px] text-white/30">${visitas} visita${visitas !== 1 ? 's' : ''}</span>
      </div>
      ${accion}
    </div>`;
}

// Buscar por NOMBRE (prefijo, sin mayúsculas/acentos) o por CORREO (exacto).
async function buscarAmigo() {
  const input  = document.getElementById('amigoEmailInput');
  const result = document.getElementById('amigoResult');
  const termRaw = (input.value || '').trim();
  if (!termRaw) { input.focus(); return; }

  result.innerHTML = `<div class="flex justify-center py-4"><div class="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div></div>`;
  result.classList.remove('hidden');

  try {
    let docs = [];
    if (termRaw.includes('@')) {
      const qs = await _userPublicCol().where('emailLower', '==', termRaw.toLowerCase()).limit(10).get();
      docs = qs.docs;
    } else {
      const norm = _normalizarNombre(termRaw);
      const qs = await _userPublicCol()
        .where('nombreLower', '>=', norm)
        .where('nombreLower', '<=', norm + '')
        .limit(10).get();
      docs = qs.docs;
    }

    // Excluirme a mí mismo
    docs = docs.filter(d => d.id !== (currentUser && currentUser.uid));

    if (!docs.length) {
      result.innerHTML = `<p class="text-center text-sm text-white/35 py-2">No encontramos a nadie con ${termRaw.includes('@') ? 'ese correo' : 'ese nombre'}.</p>`;
      return;
    }

    result.innerHTML = docs.map(doc => {
      const d = doc.data();
      return _amigoRowHtml({
        uid:        doc.id,
        nombre:     d.nombre || 'Usuario',
        email:      d.emailLower || '',
        historicos: d.sellosHistoricos ?? 0,
        esAmigo:    _misAmigos.includes(doc.id),
      });
    }).join('');
  } catch (e) {
    console.warn('[buscarAmigo]', e.message);
    result.innerHTML = `<p class="text-center text-sm text-white/35 py-2">Error al buscar. Intenta de nuevo.</p>`;
  }
}

// Agregar a mi lista personal de amigos (array en mi propio doc users/{uid}).
async function agregarAmigo(btn, uid, nombre, email) {
  if (!currentUser || !uid || uid === currentUser.uid) return;
  if (btn) { btn.disabled = true; btn.style.opacity = '0.6'; }
  try {
    await FDB.usersCol().doc(currentUser.uid).update({
      amigos: firebase.firestore.FieldValue.arrayUnion(uid)
    });
    if (btn) btn.textContent = 'Agregado ✓';
    showToast('Amigo agregado', 'ok');
  } catch (e) {
    if (btn) { btn.disabled = false; btn.style.opacity = ''; }
    showToast('No se pudo agregar', 'err');
  }
}

async function quitarAmigo(uid) {
  if (!currentUser || !uid) return;
  try {
    await FDB.usersCol().doc(currentUser.uid).update({
      amigos: firebase.firestore.FieldValue.arrayRemove(uid)
    });
    showToast('Amigo eliminado', 'info'); // la lista se refresca vía snapshot
  } catch (_) { showToast('No se pudo quitar', 'err'); }
}

// Renderiza mi lista de amigos guardados con su nivel actual.
// Se llama desde el snapshot de userUnsub; solo refetcha si la lista cambió.
let _misAmigos  = [];
let _amigosKey  = null;
async function renderAmigos(amigosUids) {
  _misAmigos = Array.isArray(amigosUids) ? amigosUids.filter(Boolean) : [];
  const cont = document.getElementById('amigosListContainer');
  if (!cont) return;

  const key = JSON.stringify([..._misAmigos].sort());
  if (key === _amigosKey) return; // sin cambios → no leer Firestore de nuevo
  _amigosKey = key;

  if (!_misAmigos.length) { cont.innerHTML = ''; return; }

  cont.innerHTML = `<div class="flex justify-center py-3"><div class="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div></div>`;
  try {
    // Consultas 'in' por documentId en grupos de 30 (límite de Firestore):
    // 1 request por grupo en vez de 1 get() por amigo.
    const CHUNK = 30;
    const grupos = [];
    for (let i = 0; i < _misAmigos.length; i += CHUNK) grupos.push(_misAmigos.slice(i, i + CHUNK));
    const resultados = await Promise.all(grupos.map(g =>
      _userPublicCol().where(firebase.firestore.FieldPath.documentId(), 'in', g).get()
    ));
    const porId = new Map();
    resultados.forEach(qs => qs.docs.forEach(doc => porId.set(doc.id, doc)));
    // 'in' no garantiza orden → respetar el orden original de _misAmigos
    const rows = _misAmigos.filter(uid => porId.has(uid)).map(uid => {
      const d = porId.get(uid).data();
      return _amigoRowHtml({
        uid,
        nombre:     d.nombre || 'Usuario',
        email:      d.emailLower || '',
        historicos: d.sellosHistoricos ?? 0,
        esAmigo:    true,
      });
    });
    cont.innerHTML = rows.length
      ? `<p class="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2 px-1">Tus amigos</p>${rows.join('')}`
      : '';
  } catch (_) {
    cont.innerHTML = '';
  }
}

