// ─── Compresión de imagen (cliente) ──────────────────────────
async function _compressImage(file, maxPx = 1200, quality = 0.82) {
  return new Promise(resolve => {
    const img = new Image();
    const blobUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(blobUrl);
      let { width, height } = img;
      if (width > maxPx || height > maxPx) {
        const ratio = Math.min(maxPx / width, maxPx / height);
        width  = Math.round(width  * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      canvas.toBlob(blob => resolve(blob ?? file), 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(blobUrl); resolve(file); };
    img.src = blobUrl;
  });
}

// ─── Servicio Favorito ────────────────────────────────────────
async function initServicioFavorito(user) {
  try {
    const snap = await _tenantCol('config').doc('ui').get();
    const activo = snap.exists ? !!snap.data().servicioFavoritoActivo : false;
    const card = document.getElementById('servicioFavoritoCard');
    const cambiarBtn = document.getElementById('btnSfCambiar');
    if (!activo || !card) return;

    card.classList.remove('hidden');
    _sfSetLoading(true);

    const email = user.email.toLowerCase();
    if (_sfUnsub) { _sfUnsub(); _sfUnsub = null; }

      _sfUnsub = _tenantCol('servicioFavorito')
      .where('email', '==', email)
      .onSnapshot(qs => {
        _sfSetLoading(false);
        if (qs.empty) {
          _sfCurrentDoc = null;
          _sfShowNoPhoto();
          if (cambiarBtn) cambiarBtn.classList.add('hidden');
        } else {
          _sfCurrentDoc = qs.docs[0];
          const data = _sfCurrentDoc.data();
          const url = data.adminUrl || data.clienteUrl || null;
          if (url) {
            _sfShowPhoto(url, data.focalX, data.focalY);
            if (cambiarBtn) cambiarBtn.classList.remove('hidden');
          } else {
            _sfShowNoPhoto();
            if (cambiarBtn) cambiarBtn.classList.add('hidden');
          }
        }
      }, err => {
        console.warn('[SF]', err.message);
        _sfSetLoading(false);
      });
  } catch (e) {
    console.warn('[SF] init:', e.message);
  }
}

function _sfSetLoading(on) {
  document.getElementById('sfLoading')?.classList.toggle('hidden', !on);
  document.getElementById('sfLoading')?.style.setProperty('display', on ? 'flex' : 'none');
  if (on) {
    document.getElementById('sfWithPhoto')?.classList.add('hidden');
    document.getElementById('sfNoPhoto')?.classList.add('hidden');
  }
}

function _sfShowPhoto(url, focalX, focalY) {
  const img = document.getElementById('sfPhoto');
  if (img) {
    img.src = url;
    img.style.objectPosition = `${focalX !== undefined ? focalX : 50}% ${focalY !== undefined ? focalY : 50}%`;
  }
  document.getElementById('sfWithPhoto')?.classList.remove('hidden');
  document.getElementById('sfNoPhoto')?.classList.add('hidden');
  document.getElementById('sfLoading')?.classList.add('hidden');
}

function _sfShowNoPhoto() {
  _sfCurrentDoc = null;
  document.getElementById('sfWithPhoto')?.classList.add('hidden');
  document.getElementById('sfNoPhoto')?.classList.remove('hidden');
  document.getElementById('sfLoading')?.classList.add('hidden');
}

// ─── Subida de foto por el cliente ───────────────────────────
document.getElementById('sfFileInput').addEventListener('change', async function () {
  const file = this.files?.[0];
  this.value = '';
  if (!file || !currentUser) return;

  _sfSetLoading(true);
  try {
    const storage  = firebase.storage();
    const tid      = window.CURRENT_TENANT_ID || 'elegance';
    const emailKey = currentUser.email.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const filename = `${Date.now()}_cliente.jpg`;
    const path     = tid === 'elegance'
      ? `servicioFavorito/${emailKey}/${filename}`
      : `tenants/${tid}/servicioFavorito/${emailKey}/${filename}`;

    const compressed = await _compressImage(file);
    const snap       = await storage.ref(path).put(compressed, { contentType: 'image/jpeg' });
    const url        = await snap.ref.getDownloadURL();

    const email    = currentUser.email.toLowerCase();
    const existing = await _tenantCol('servicioFavorito').where('email', '==', email).get();

    if (!existing.empty) {
      await existing.docs[0].ref.update({
        clienteUrl:      url,
        clienteFilename: filename,
        updatedAt:       firebase.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      await _tenantCol('servicioFavorito').add({
        email,
        clienteUrl:      url,
        clienteFilename: filename,
        updatedAt:       firebase.firestore.FieldValue.serverTimestamp(),
      });
    }
    showToast('Foto guardada', 'ok');
    // Auto-abrir el selector de enfoque después de guardar para mejorar UX
    setTimeout(() => {
      abrirFocalSelector();
    }, 1200);
  } catch (err) {
    console.error('[SF cliente upload]', err);
    showToast(err.code === 'storage/unauthorized' ? 'Sin permiso para subir.' : 'Error al subir la foto.', 'err');
    _sfSetLoading(false);
  }
});

// ─── Funciones del Selector de Punto Focal (Cliente) ───────────
let _tempFocalX = 50;
let _tempFocalY = 50;

function abrirFocalSelector() {
  if (!_sfCurrentDoc) {
    showToast('Sube una foto primero', 'err');
    return;
  }
  const data = _sfCurrentDoc.data();
  const url = data.adminUrl || data.clienteUrl || null;
  if (!url) return;

  const img = document.getElementById('focalSelectorImg');
  if (img) img.src = url;

  _tempFocalX = data.focalX !== undefined ? data.focalX : 50;
  _tempFocalY = data.focalY !== undefined ? data.focalY : 50;

  _updateFocalSelectorDot();

  document.getElementById('focalSelectorModal')?.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function cerrarFocalSelector() {
  document.getElementById('focalSelectorModal')?.classList.add('hidden');
  document.body.style.overflow = '';
}

function handleFocalClick(e) {
  const rect = e.currentTarget.getBoundingClientRect();
  _tempFocalX = Math.max(0, Math.min(100, Math.round(((e.clientX - rect.left) / rect.width) * 100)));
  _tempFocalY = Math.max(0, Math.min(100, Math.round(((e.clientY - rect.top) / rect.height) * 100)));
  _updateFocalSelectorDot();
}

function _updateFocalSelectorDot() {
  const dot = document.getElementById('focalSelectorDot');
  if (dot) {
    dot.style.left = `${_tempFocalX}%`;
    dot.style.top = `${_tempFocalY}%`;
  }
}

async function guardarFocalSelector() {
  if (!_sfCurrentDoc) return;
  const btn = document.getElementById('btnGuardarFocal');
  const spin = document.getElementById('btnGuardarFocalSpin');
  const txt = document.getElementById('btnGuardarFocalText');
  
  if (btn) btn.disabled = true;
  if (spin) spin.classList.remove('hidden');
  if (txt) txt.textContent = 'Guardando...';

  try {
    await _sfCurrentDoc.ref.update({
      focalX: _tempFocalX,
      focalY: _tempFocalY,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    showToast('Enfoque guardado', 'ok');
    cerrarFocalSelector();
  } catch (err) {
    console.error('[Save client focal]', err);
    showToast('Error al guardar el enfoque.', 'err');
  } finally {
    if (btn) btn.disabled = false;
    if (spin) spin.classList.add('hidden');
    if (txt) txt.textContent = 'Fijar Enfoque';
  }
}

// ── Aura Premium Animations & Membership ───────────────────────
function esc(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
}

function abrirAuraMembresiaModal() {
  const modal = document.getElementById('auraMembresiaModal');
  if (modal) {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
}

function cerrarAuraMembresiaModal() {
  const modal = document.getElementById('auraMembresiaModal');
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }
}

/* ── Planes anuales en el bloque del dashboard (sólo Aura) ──
   Lee tenants/aura/configuracion/membresia.planes[] y renderiza cada plan
   con su precioAnual + ahorro vs 12 cuotas mensuales. Se invoca después de
   autenticar (junto a loadRangos). Falla silenciosamente si el doc no
   existe o si el tenant no es Aura. */
async function loadPlanesAnualesAura() {
  const tid = window.CURRENT_TENANT_ID || 'elegance';
  if (tid !== 'aura') return;
  const list = document.getElementById('planesAnualesAuraList');
  if (!list) return;

  try {
    const snap = await db.collection('tenants').doc(tid)
      .collection('configuracion').doc('membresia').get();

    if (!snap.exists) {
      list.innerHTML = `
        <div class="rounded-2xl border border-white/8 bg-white/5 px-4 py-5 text-center">
          <p class="text-[12px] text-white/60">Aún no hay planes anuales configurados.</p>
        </div>`;
      return;
    }

    const planes = (snap.data().planes || [])
      .filter(p => p && p.id && p.nombre)
      .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

    if (planes.length === 0) {
      list.innerHTML = `
        <div class="rounded-2xl border border-white/8 bg-white/5 px-4 py-5 text-center">
          <p class="text-[12px] text-white/60">Aún no hay planes anuales configurados.</p>
        </div>`;
      return;
    }

    const fmtCLP = n => `$${Math.round(Number(n) || 0).toLocaleString('es-CL')}`;
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

    list.innerHTML = planes.map(plan => {
      const precioMensual = Number(plan.precio) || 0;
      const precioAnual   = Number(plan.precioAnual) || precioMensual * 10;
      const equivMes      = Math.round(precioAnual / 12);
      const ahorro        = (precioMensual * 12) - precioAnual;
      const ahorroBadge   = ahorro > 0
        ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest" style="background:rgba(0,40,94,0.08); color:#00285E;">
             Ahorras ${fmtCLP(ahorro)}
           </span>`
        : '';
      const bens = (plan.caracteristicas || []).slice(0, 3).map(b =>
        `<li class="flex items-start gap-1.5 text-[11px] text-white/70 leading-relaxed">
           <i class="ph-fill ph-check-circle text-[12px] shrink-0 mt-0.5" style="color:#00285E;"></i>
           <span>${esc(b)}</span>
         </li>`
      ).join('');

      return `
        <div class="plan-anual-row rounded-2xl border border-white/8 bg-white/5 overflow-hidden">
          <div class="px-4 pt-3.5 pb-3">
            <div class="flex items-start justify-between gap-3 mb-2">
              <div class="min-w-0">
                <p class="text-[13px] font-bold text-white leading-tight">${esc(plan.nombre)}</p>
                <p class="text-[11px] text-white/55 mt-0.5">Equivale a ${fmtCLP(equivMes)} / mes</p>
              </div>
              <div class="text-right shrink-0">
                <p class="text-[18px] font-black text-white leading-none">${fmtCLP(precioAnual)}</p>
                <p class="text-[10px] text-white/45 mt-0.5">/ año</p>
              </div>
            </div>
            ${ahorroBadge ? `<div class="mb-2">${ahorroBadge}</div>` : ''}
            ${bens ? `<ul class="space-y-1 mt-1">${bens}</ul>` : ''}
          </div>
        </div>`;
    }).join('');
  } catch (err) {
    console.error('[planesAnualesAura] error:', err);
    list.innerHTML = `
      <div class="rounded-2xl border border-white/8 bg-white/5 px-4 py-5 text-center">
        <p class="text-[12px] text-white/60">No pudimos cargar los planes anuales.</p>
      </div>`;
  }
}

async function loadAuraMembresiaPlanes() {
  const tid = window.CURRENT_TENANT_ID || 'elegance';
  if (tid !== 'aura') return;
  
  try {
    const snap = await db.collection('tenants').doc(tid)
      .collection('configuracion').doc('membresia').get();
      
    if (snap.exists) {
      const data = snap.data();
      const planes = (data.planes || [])
        .filter(p => p.id && p.nombre)
        .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
        
      renderAuraMembresiaPlanesModal(planes);
    } else {
      const container = document.getElementById('auraMembresiaPlanesList');
      if (container) {
        container.innerHTML = `
          <div class="text-center py-8">
            <i class="ph-bold ph-info text-3xl text-gray-400 mb-2"></i>
            <p class="text-sm text-gray-500 font-sans">No hay planes de suscripción configurados en este momento.</p>
          </div>
        `;
      }
    }
  } catch (err) {
    console.error('[Aura Membresia Modal] Error loading plans:', err);
    const container = document.getElementById('auraMembresiaPlanesList');
    if (container) {
      container.innerHTML = `
        <div class="text-center py-8">
          <i class="ph-bold ph-warning-octagon text-3xl text-red-500 mb-2"></i>
          <p class="text-sm text-gray-500 font-sans">Hubo un problema al cargar los planes. Intente de nuevo más tarde.</p>
        </div>
      `;
    }
  }
}

function renderAuraMembresiaPlanesModal(planes) {
  const container = document.getElementById('auraMembresiaPlanesList');
  if (!container) return;
  
  if (!planes || planes.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8">
        <i class="ph-bold ph-info text-3xl text-gray-400 mb-2"></i>
        <p class="text-sm text-gray-500 font-sans">No hay planes de suscripción configurados en este momento.</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = planes.map((plan, idx) => {
    const isPopular = planes.length > 1 && idx === planes.length - 1;
    const rawPrice = plan.precio || plan.precioMensual || 0;
    const formattedPrice = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(rawPrice);
    const benefits = (plan.caracteristicas || []).map(benefit => `
      <li class="flex items-start gap-2 font-sans" style="font-size:11px; color:#52525B;">
        <i class="ph-fill ph-check-circle shrink-0 mt-0.5" style="font-size:14px; color:#00285E;"></i>
        <span class="leading-snug">${esc(benefit)}</span>
      </li>
    `).join('');

    return `
      <div class="relative rounded-2xl overflow-hidden transition-all duration-200 font-sans"
           style="${isPopular
             ? 'background: linear-gradient(145deg,#001433,#00285E); box-shadow: 0 10px 28px rgba(0,40,94,0.22);'
             : 'background:#FFFFFF; border: 1.5px solid #E4E4E7; box-shadow: 0 2px 8px rgba(0,0,0,0.04);'}">

        ${isPopular ? `
          <div style="background:rgba(255,255,255,0.10); padding:3px 10px 3px 12px; display:flex; align-items:center; gap:6px; border-bottom:1px solid rgba(255,255,255,0.10);">
            <i class="ph-fill ph-star" style="font-size:10px; color:rgba(255,255,255,0.7);"></i>
            <span style="font-size:9px; font-weight:800; text-transform:uppercase; letter-spacing:0.15em; color:rgba(255,255,255,0.75);">Más popular</span>
          </div>
        ` : ''}

        <div style="padding: 14px 16px 6px;">
          <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:10px;">
            <h4 style="font-size:13px; font-weight:800; line-height:1.3; color:${isPopular ? '#FFFFFF' : '#00285E'};">${esc(plan.nombre)}</h4>
            <div style="text-align:right; flex-shrink:0;">
              <span style="font-size:20px; font-weight:900; color:${isPopular ? '#FFFFFF' : '#00285E'}; line-height:1;">${formattedPrice}</span>
              <span style="font-size:10px; color:${isPopular ? 'rgba(255,255,255,0.55)' : '#9CA3AF'}; display:block; margin-top:1px;">/mes</span>
            </div>
          </div>

          <div style="height:1px; background:${isPopular ? 'rgba(255,255,255,0.12)' : '#F0F0F2'}; margin-bottom:10px;"></div>

          <ul style="display:flex; flex-direction:column; gap:6px; margin-bottom:14px;">
            ${isPopular
              ? (plan.caracteristicas || []).map(b => `
                  <li style="display:flex; align-items:flex-start; gap:7px; font-size:11px; color:rgba(255,255,255,0.80);">
                    <i class="ph-fill ph-check-circle" style="font-size:13px; color:rgba(255,255,255,0.6); flex-shrink:0; margin-top:1px;"></i>
                    <span style="line-height:1.4;">${esc(b)}</span>
                  </li>`).join('')
              : benefits}
          </ul>

          <a href="membresia.html?plan=${esc(plan.id)}"
             style="display:flex; align-items:center; justify-content:center; gap:6px; width:100%; padding:9px 0; border-radius:10px; font-size:12px; font-weight:700; transition:opacity .15s;
                    ${isPopular
                      ? 'background:#FFFFFF; color:#00285E;'
                      : 'background:rgba(0,40,94,0.05); border:1.5px solid rgba(0,40,94,0.22); color:#00285E;'}">
            <span>Seleccionar</span>
            <i class="ph-bold ph-arrow-right" style="font-size:11px;"></i>
          </a>
        </div>
      </div>
      </div>
    `;
  }).join('');
}

function initAuraAnimations() {
  if ((!document.documentElement.classList.contains('tenant-aura') && !document.documentElement.classList.contains('tenant-latincaribe'))) return;
  const els = document.querySelectorAll('[data-aura-stagger]');
  els.forEach((el, i) => {
    el.classList.add('aura-animate', `aura-d${Math.min(i, 4)}`);
    el.addEventListener('animationend', () => {
      el.removeAttribute('data-aura-stagger');
      el.classList.remove('aura-animate');
      for (let d = 0; d <= 4; d++) el.classList.remove(`aura-d${d}`);
    }, { once: true });
  });
  // Fallback: limpia stagger en caso de que el tab se oculte antes de que termine la animación
  setTimeout(() => {
    document.querySelectorAll('[data-aura-stagger]').forEach(el => {
      el.removeAttribute('data-aura-stagger');
      el.classList.remove('aura-animate');
      for (let d = 0; d <= 4; d++) el.classList.remove(`aura-d${d}`);
    });
  }, 1500);

  // Club de Suscripciones (Aura Premium Pass) oculto temporalmente.
  // Para reactivarlo: descomentar el bloque siguiente.
  // const promoCard = document.getElementById('auraMembresiaPromoCard');
  // if (promoCard) {
  //   promoCard.classList.remove('hidden');
  //   loadAuraMembresiaPlanes();
  // }
}

function auraCountUp(targetNum, totalTarget) {
  if ((!document.documentElement.classList.contains('tenant-aura') && !document.documentElement.classList.contains('tenant-latincaribe')) || targetNum === 0) return;
  const el = document.getElementById('stampsCount');
  if (!el) return;
  const duration = 800;
  const start = Date.now();
  const span = `<span style="font-size:0.875rem;color:rgba(255,255,255,0.3);">/${totalTarget}</span>`;
  el.innerHTML = `0${span}`;
  const tick = () => {
    const elapsed = Date.now() - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.innerHTML = Math.round(eased * targetNum) + span;
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
