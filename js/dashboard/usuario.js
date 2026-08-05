
/* ─── Productos tab ──────────────────────────────────────────── */
let _isProductsEnabled = false;
let _productosUnsub    = null;
// Filtro de categoría activo. 'all' = mostrar todos. Se resetea cuando la
// categoría seleccionada desaparece (ej: se ocultó el último producto de esa
// categoría). Ver renderProductosGrid abajo.
let _productosCatSel   = 'all';
let _productosLista    = [];

// Delega en FDB.tenantCol para heredar el redirect marca-aware Kronnos (D3, Camino 1.5).
// Colecciones marca-level (users/sellos/premios/rangos/canjes) en tenants Kronnos legacy
// se redirigen automáticamente a tenants/kronnos/*. Ver firebaseUtils.js.
function _tenantCol(name) {
  if (typeof FDB !== 'undefined' && FDB.tenantCol) return FDB.tenantCol(name);
  // Fallback legacy si FDB no cargó por alguna razón (defensivo — no debería pasar en prod)
  const tid = window.CURRENT_TENANT_ID || 'elegance';
  return tid === 'elegance' ? db.collection(name) : db.collection('tenants').doc(tid).collection(name);
}

async function initProductosTab() {
  try {
    const snap = await _tenantCol('config').doc('ui').get();
    const activo = snap.exists ? !!snap.data().productosActivos : false;
    _isProductsEnabled = activo;
    if (!activo) return;

    // Show nav button
    const navBtn = document.getElementById('navProductos');
    if (navBtn) navBtn.classList.remove('hidden');

    // Subscribe to products
    if (_productosUnsub) { _productosUnsub(); _productosUnsub = null; }
    _productosUnsub = _tenantCol('productos').onSnapshot(snap2 => {
      _productosLista = snap2.docs.map(d => ({ id: d.id, ...d.data() }));
      renderProductosCategorias();
      renderProductosGrid();
    });
  } catch (e) {
    console.warn('[Productos] Error:', e.message);
  }
}

// Categorías únicas en uso (sin categoría → no cuenta). Ordenadas por
// nombre; devuelven [{ nombre, count }, ...]. Los productos que el admin
// activó con `activo:false` aún no entran acá porque no se rendrean.
function _productosCategoriasEnUso() {
  const map = new Map();
  _productosLista.forEach(p => {
    if (p.activo === false) return;
    const cat = (p.categoria || '').trim();
    if (!cat) return;
    map.set(cat, (map.get(cat) || 0) + 1);
  });
  return [...map.entries()]
    .map(([nombre, count]) => ({ nombre, count }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

function renderProductosCategorias() {
  const row = document.getElementById('productosCategorias');
  if (!row) return;
  const cats = _productosCategoriasEnUso();
  // Si no hay ninguna categoría en uso, ocultamos toda la fila (no aporta).
  if (cats.length === 0) {
    row.classList.add('hidden');
    row.innerHTML = '';
    _productosCatSel = 'all';
    return;
  }
  // Si la categoría seleccionada dejó de existir, volvemos a "Todos".
  if (_productosCatSel !== 'all' && !cats.some(c => c.nombre === _productosCatSel)) {
    _productosCatSel = 'all';
  }
  row.classList.remove('hidden');
  const totalActivos = _productosLista.filter(p => p.activo !== false).length;
  const chip = (id, label, count, active) => `
    <button type="button" data-cat="${id.replace(/"/g, '&quot;')}"
      class="prod-chip shrink-0 px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider border transition-all duration-200 active:scale-95 ${
        active
          ? 'is-active bg-[#D4AF37] border-[#D4AF37] text-black shadow-[0_4px_16px_-4px_rgba(212,175,55,0.55)]'
          : 'bg-white/[0.04] border-white/10 text-gray-400 hover:bg-white/[0.08] hover:text-white'
      }">${label}<span class="ml-1.5 opacity-60 tabular-nums">${count}</span></button>`;
  row.innerHTML = [
    chip('all', 'Todos', totalActivos, _productosCatSel === 'all'),
    ...cats.map(c => chip(c.nombre, c.nombre, c.count, _productosCatSel === c.nombre)),
  ].join('');
  // Delegar clicks: cada chip cambia _productosCatSel y re-renderea.
  row.querySelectorAll('button[data-cat]').forEach(btn => {
    btn.addEventListener('click', () => {
      _productosCatSel = btn.getAttribute('data-cat') || 'all';
      renderProductosCategorias();
      renderProductosGrid();
    });
  });
}

function renderProductosGrid() {
  const grid  = document.getElementById('productosGrid');
  const empty = document.getElementById('productosEmpty');
  const cnt   = document.getElementById('productosCount');
  if (!grid || !empty) return;
  const visibles = _productosLista.filter(p => p.activo !== false);
  const lista = _productosCatSel === 'all'
    ? visibles
    : visibles.filter(p => (p.categoria || '').trim() === _productosCatSel);
  if (cnt) {
    if (lista.length > 0) {
      cnt.textContent = lista.length + (lista.length === 1 ? ' producto' : ' productos');
      cnt.classList.remove('hidden');
    } else {
      cnt.classList.add('hidden');
    }
  }
  if (lista.length === 0) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    empty.style.display = 'flex';
    return;
  }
  empty.classList.add('hidden');
  empty.style.display = '';
  grid.innerHTML = lista.map(p => {
    const safeNombre = (p.nombre || '').replace(/'/g, '&#39;').replace(/"/g, '&quot;');
    const safeDesc   = (p.descripcion || '').replace(/'/g, '&#39;').replace(/"/g, '&quot;');
    const precioNum  = Number(p.precio || 0);
    const precio     = precioNum.toLocaleString('es-CL');
    const precioOrig = Number(p.precioOriginal || 0);
    const enOferta   = precioOrig > 0 && precioOrig > precioNum;
    const descPct    = enOferta ? Math.round((1 - precioNum / precioOrig) * 100) : 0;
    const stockVal   = p.stock !== undefined && p.stock !== null && p.stock !== '' ? Number(p.stock) : null;
    const agotado    = stockVal !== null && stockVal <= 0;
    const stockBajo  = stockVal !== null && stockVal > 0 && stockVal <= 5;

    // Badges flotantes sobre la imagen (arriba). Máximo 2 para no saturar.
    const badgeOferta = enOferta
      ? `<span class="absolute z-10 font-black uppercase text-white shadow-lg" style="top:8px;left:8px;font-size:9.5px;letter-spacing:0.06em;padding:4px 8px;border-radius:100px;background:linear-gradient(135deg,#ef4444,#dc2626);">−${descPct}%</span>`
      : '';
    const badgeAgotado = agotado
      ? `<span class="absolute z-10 font-black uppercase backdrop-blur-md" style="top:8px;right:8px;font-size:9.5px;letter-spacing:0.06em;padding:4px 8px;border-radius:100px;background:rgba(0,0,0,0.72);color:rgba(255,255,255,0.95);">Agotado</span>`
      : '';
    // Categoría como chip glassy arriba (solo si no hay badge de oferta ahí)
    const catFloat = (!enOferta && p.categoria && String(p.categoria).trim())
      ? `<span class="absolute z-10 font-bold uppercase backdrop-blur-md" style="top:8px;left:8px;font-size:9px;letter-spacing:0.14em;padding:4px 8px;border-radius:100px;background:rgba(0,0,0,0.45);color:rgba(255,255,255,0.92);border:1px solid rgba(255,255,255,0.12);">${String(p.categoria).replace(/</g, '&lt;')}</span>`
      : '';
    // Barra sutil de stock bajo (solo si aplica y no está agotado)
    const stockBar = stockBajo
      ? `<div class="absolute bottom-0 left-0 right-0" style="height:3px;background:linear-gradient(90deg, transparent 0%, #f59e0b ${Math.max(15, stockVal * 20)}%, transparent 100%);"></div>`
      : '';
    // Sede badge (multi-sede) — vive abajo con el precio
    const sedeHtml = p.sucursalNombre
      ? `<p class="font-bold mt-1.5 flex items-center gap-1" style="font-size:9.5px;color:#fdba74;"><i class="ph-fill ph-map-pin" style="font-size:10px;"></i>Solo en ${String(p.sucursalNombre).replace(/</g, '&lt;')}</p>`
      : '';
    // Precio: si hay oferta, mostrar tachado el original
    const precioHtml = enOferta
      ? `<div class="flex flex-col leading-none">
           <span class="text-gray-500 line-through font-medium" style="font-size:10px;">$${precioOrig.toLocaleString('es-CL')}</span>
           <span class="prod-precio font-black" style="font-size:16px;margin-top:2px;color:#D4AF37;">$${precio}</span>
         </div>`
      : `<span class="prod-precio font-black leading-none" style="font-size:16px;color:#D4AF37;">$${precio}</span>`;

    const passedStock = stockVal !== null ? stockVal : 'null';
    const dimClass    = agotado ? 'opacity-70' : '';
    const safeImg     = (p.imagen || '').replace(/'/g, '&#39;').replace(/"/g, '&quot;');

    return `
    <div onclick="abrirProductoModal('${safeNombre}','${safeDesc}','${safeImg}',${precioNum},'${p.id}', ${passedStock})"
         class="producto-card group relative bg-[#0d0d10] border border-white/10 rounded-2xl overflow-hidden flex flex-col cursor-pointer active:scale-95 transition-all duration-200 ${dimClass}"
         style="box-shadow:0 2px 12px -4px rgba(0,0,0,0.6);">
      <div class="prod-img-wrap relative overflow-hidden pointer-events-none" style="aspect-ratio:4/5;background:radial-gradient(circle at 50% 40%, #ffffff 0%, #f4f4f5 100%);">
        ${badgeOferta}
        ${catFloat}
        ${badgeAgotado}
        ${p.imagen
          ? `<img src="${p.imagen}" alt="${safeNombre}" loading="lazy" class="prod-img w-full h-full object-contain p-3 transition-transform duration-500">`
          : `<div class="w-full h-full flex items-center justify-center"><i class="ph ph-shopping-bag text-5xl text-gray-300"></i></div>`}
        ${stockBar}
      </div>
      <div class="p-3 flex flex-col flex-1 pointer-events-none" style="padding-top:10px;">
        ${p.marca ? `<p class="font-bold uppercase text-gray-500" style="font-size:9px;letter-spacing:0.15em;margin-bottom:2px;">${String(p.marca).replace(/</g,'&lt;')}</p>` : ''}
        <p class="font-bold text-white leading-tight line-clamp-2" style="font-size:13px;min-height:2.2em;">${p.nombre || ''}</p>
        ${sedeHtml}
        <div class="flex items-end justify-between mt-auto" style="padding-top:10px;">
          ${precioHtml}
          <span class="prod-cta shrink-0 inline-flex items-center justify-center rounded-full transition-all" style="width:32px;height:32px;background:#D4AF37;color:#000;">
            <i class="ph-bold ph-arrow-right" style="font-size:13px;"></i>
          </span>
        </div>
      </div>
    </div>`;
  }).join('');
}


// ─── Crear documento si no existe ────────────────────────────
async function ensureUserDoc(user, extra = {}) {
  const ref  = FDB.usersCol().doc(user.uid);
  const snap = await ref.get();
  if (!snap.exists) {
    // Defense-in-depth: rehusar crear docs sin identificador. Pre-2026-06-25
    // este path se disparaba con users anonimos (residual de chat.html) y
    // dejo ~27 docs fantasma en tenants/yugen/users. Hoy los ghost guards
    // de los onAuthStateChanged ya filtran antes, pero si algun caller
    // futuro olvida ese guard, el doc basura no se materializa.
    const nombreFinal = (extra.nombre || user.displayName || '').trim();
    const emailFinal  = (user.email || '').trim();
    if (!nombreFinal && !emailFinal) {
      console.warn('[ensureUserDoc] skip ghost user', user.uid);
      return null;
    }
    await ref.set({
      nombre:   extra.nombre   || user.displayName || '',
      email:    user.email     || '',
      telefono: extra.telefono || '',
      photoURL: user.photoURL  || null,
      stamps:   0,
      creadoEn: firebase.firestore.FieldValue.serverTimestamp()
    });
    return (await ref.get()).data();
  }
  // Asegurar campos que podrían faltar en documentos antiguos
  const updates = {};
  const d = snap.data();
  if (!d.email    && user.email)    updates.email    = user.email;
  if (!d.photoURL && user.photoURL) updates.photoURL = user.photoURL;
  if (Object.keys(updates).length)  await ref.update(updates);
  return snap.data();
}

// ─── Cargar datos del usuario en tiempo real ─────────────────
async function subscribeUserData(user) {
  let _firstSnap = true;

  function _hideAuthGuard() {
    if (!_firstSnap) return;
    _firstSnap = false;
    const g = document.getElementById('authGuard');
    if (g) g.style.display = 'none';
  }

  // Timeout de seguridad: si Firestore no responde en 8s, quitar la pantalla
  // de carga. Va ANTES del primer await a propósito. Estaba después de
  // ensureUserDoc y esa era la causa del "Cargando…" infinito visto en sion
  // recién registrado: una operación de Firestore que no recibe ack del
  // server no rechaza, queda PENDIENTE, así que el .catch() no la salva y el
  // timeout nunca alcanzaba a programarse. Nada de esto depende del tenant.
  const _guardTimeout = setTimeout(_hideAuthGuard, 8000);

  // Y que tampoco bloquee la suscripción: si ensureUserDoc se cuelga seguimos
  // igual: el doc se materializa solo cuando vuelva la conexión, y mientras
  // tanto el cliente ve su dashboard en vez de un spinner eterno.
  await Promise.race([
    ensureUserDoc(user).catch(() => {}),
    new Promise(r => setTimeout(r, 6000)),
  ]);

  if (_userUnsub) { _userUnsub(); _userUnsub = null; }
  _stampsSynced = false;
  _prevStamps   = null;

  _userUnsub = FDB.usersCol().doc(user.uid).onSnapshot(snap => {
    clearTimeout(_guardTimeout);
    _hideAuthGuard();
    if (!snap.exists) return;
    const data = snap.data();

    const nombre = data.nombre || user.displayName || 'Cliente';
    const email  = user.email  || '';

    // sellosDisponibles = saldo actual para canjear (se descuenta al canjear)
    // sellosHistoricos  = total histórico acumulado (nunca disminuye, determina nivel)
    const disponibles = data.sellosDisponibles ?? data.stamps ?? 0;
    const historicos  = data.sellosHistoricos  ?? data.stamps ?? 0;

    // ── Kronnos multi-sede (D3): guardar conteo por sede para calcular ─
    // sede predominante en canje. sellosPorSede es marca-level pool.
    window._userSellosPorSede = (data && typeof data.sellosPorSede === 'object' && data.sellosPorSede) || {};

    if (_stampsSynced && disponibles > _prevStamps) dispararConfetti();
    _prevStamps   = disponibles;
    _stampsSynced = true;
    userStamps    = disponibles;

    // Perfil público (para que amigos me encuentren/comparen) + mi lista de amigos
    syncUserPublic(data);
    renderAmigos(data.amigos || []);
    // Packs activos (motor de cuponeras). Se filtra client-side por vencimiento
    // + saldo > 0 para no mostrar los ya agotados o vencidos.
    renderMisPacks(Array.isArray(data.packsActivos) ? data.packsActivos : []);
    // Referidos: card promocional (solo si el tenant activo el programa)
    renderReferralCard(data);

    // No sobreescribir document.title con "Hola, {nombre}" — leakea el nombre
    // del cliente en el tab / historial / install prompt (Chrome/iOS lo leen
    // como sugerencia de nombre de la app). El título estable lo setea core.js
    // a "Mi {club} · {tenant}" al aplicar SHOP.

    if (user.photoURL) {
      document.getElementById('avatarContainer').innerHTML =
        `<img src="${user.photoURL}" loading="lazy" class="w-full h-full object-cover" alt="Avatar">`;
    }

    document.getElementById('profileName').textContent   = nombre;
    document.getElementById('profileEmail').textContent  = email;
    document.getElementById('profileStamps').textContent = `${disponibles} sello${disponibles !== 1 ? 's' : ''}`;

    const nombreInput = document.getElementById('editNombre');
    const telInput    = document.getElementById('editTelefono');
    const cumpleInput = document.getElementById('editFechaNacimiento');
    if (document.activeElement !== nombreInput) nombreInput.value = nombre;
    if (document.activeElement !== telInput)    telInput.value    = data.telefono || '';
    if (document.activeElement !== cumpleInput) cumpleInput.value = data.fechaNacimiento || '';

    // Aviso de perfil incompleto
    const _aviso = document.getElementById('perfilIncompletoAviso');
    const _avisoMsg = document.getElementById('perfilIncompletoMsg');
    if (_aviso && _avisoMsg) {
      const faltaNombre  = !nombre || nombre === 'Cliente';
      const faltaTel     = !data.telefono;
      const faltaCumple  = !data.fechaNacimiento;
      const faltantes = [];
      if (faltaNombre) faltantes.push('tu nombre');
      if (faltaTel)    faltantes.push('tu teléfono');
      if (faltaCumple) faltantes.push('tu fecha de nacimiento');
      if (faltantes.length) {
        _avisoMsg.textContent = `Completa ${faltantes.join(', ')} para aprovechar todos los beneficios.`;
        _aviso.classList.remove('hidden');
      } else {
        _aviso.classList.add('hidden');
      }
    }
    // Bloquear la fecha de nacimiento una vez guardada para evitar abuso del sello de cumpleaños
    if (data.fechaNacimiento) {
      cumpleInput.readOnly = true;
      cumpleInput.style.opacity  = '0.5';
      cumpleInput.style.cursor   = 'not-allowed';
      const lockMsg = document.getElementById('nacimientoLockMsg');
      if (lockMsg) {
        lockMsg.textContent  = '🔒 Para modificar la fecha contactá al local.';
        lockMsg.style.color  = '#6b7280';
      }
    } else {
      cumpleInput.readOnly = false;
      cumpleInput.style.opacity = '';
      cumpleInput.style.cursor  = '';
      const lockMsg = document.getElementById('nacimientoLockMsg');
      if (lockMsg) {
        lockMsg.textContent = 'Recibirás 1 sello de regalo el día de tu cumpleaños.';
        lockMsg.style.color = '';
      }
    }
    document.getElementById('editEmail').value = email;

    if (user.photoURL) {
      document.getElementById('profileAvatar').innerHTML =
        `<img src="${user.photoURL}" loading="lazy" class="w-full h-full object-cover" alt="Avatar">`;
    }

    renderStamps(disponibles, historicos);

  }, err => {
    clearTimeout(_guardTimeout);
    _hideAuthGuard();
    console.error('[Dashboard] onSnapshot usuario:', err);
  });
}

// ─── Subida de foto de perfil ────────────────────────────────
document.getElementById('avatarFileInput').addEventListener('change', async function() {
  const file = this.files?.[0];
  if (!file || !currentUser) return;

  const avatarEl = document.getElementById('profileAvatar');
  const camBtn   = avatarEl?.parentElement?.querySelector('button');

  // Mostrar spinner mientras sube
  avatarEl.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-[#111115]">
    <div class="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div></div>`;
  if (camBtn) camBtn.disabled = true;

  try {
    const storage = firebase.storage();
    const tid     = window.CURRENT_TENANT_ID || 'elegance';
    const path    = tid === 'elegance'
      ? `avatars/${currentUser.uid}/profile`
      : `tenants/${tid}/avatars/${currentUser.uid}/profile`;

    const snap    = await storage.ref(path).put(file, { contentType: file.type || 'image/jpeg' });
    const url     = await snap.ref.getDownloadURL();

    // Actualizar Firebase Auth
    await currentUser.updateProfile({ photoURL: url });

    // Actualizar Firestore
    await FDB.usersCol().doc(currentUser.uid).update({ photoURL: url });

    // Actualizar DOM
    const imgTag = `<img src="${url}" loading="lazy" class="w-full h-full object-cover" alt="Avatar">`;
    avatarEl.innerHTML = imgTag;
    const headerAvatar = document.getElementById('avatarContainer');
    if (headerAvatar) headerAvatar.innerHTML = imgTag;

    showToast('Foto actualizada correctamente', 'ok');
  } catch (err) {
    console.error('[Avatar] Upload error:', err);
    const msg = err.code === 'storage/unauthorized'
      ? 'Sin permiso para subir. Volvé a iniciar sesión.'
      : 'Error al subir la foto. Intentá de nuevo.';
    showToast(msg, 'err');
    // Restaurar ícono por defecto
    avatarEl.innerHTML = currentUser.photoURL
      ? `<img src="${currentUser.photoURL}" loading="lazy" class="w-full h-full object-cover" alt="Avatar">`
      : `<i class="ph-fill ph-user text-4xl text-gray-500"></i>`;
  } finally {
    if (camBtn) camBtn.disabled = false;
    this.value = '';
  }
});

