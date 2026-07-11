
/* ─── Productos tab ──────────────────────────────────────────── */
let _isProductsEnabled = false;
let _productosUnsub    = null;

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
    const grid  = document.getElementById('productosGrid');
    const empty = document.getElementById('productosEmpty');
    if (_productosUnsub) { _productosUnsub(); _productosUnsub = null; }
    _productosUnsub = _tenantCol('productos').onSnapshot(snap2 => {
      const lista = snap2.docs.map(d => ({ id: d.id, ...d.data() }));
      if (!grid || !empty) return;
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
        const safeImg    = (p.imagen || '').replace(/'/g, '&#39;').replace(/"/g, '&quot;');
        const precio     = Number(p.precio || 0).toLocaleString('es-CL');
        const stockVal   = p.stock !== undefined && p.stock !== null && p.stock !== '' ? Number(p.stock) : null;
        const stockHtml  = stockVal !== null
          ? (stockVal > 0
              ? `<p class="text-[10px] text-gray-400 font-semibold mt-1">Stock: ${stockVal}</p>`
              : `<p class="text-[10px] text-red-500 font-bold mt-1">Agotado</p>`)
          : '';
        const passedStock = stockVal !== null ? stockVal : 'null';
        return `
        <div onclick="abrirProductoModal('${safeNombre}','${safeDesc}','${safeImg}',${Number(p.precio||0)},'${p.id}', ${passedStock})"
             class="bg-[#0d0d10] border border-white/8 rounded-2xl overflow-hidden flex flex-col cursor-pointer active:scale-95 transition-transform">
          <div class="bg-white rounded-t-xl p-3 aspect-square flex items-center justify-center overflow-hidden pointer-events-none">
            ${p.imagen
              ? `<img src="${p.imagen}" alt="${safeNombre}" loading="lazy" class="w-full h-full object-contain">`
              : `<i class="ph ph-shopping-bag text-4xl text-gray-300"></i>`}
          </div>
          <div class="p-3 flex flex-col flex-1 pointer-events-none">
            <p class="text-sm font-bold text-white leading-tight">${p.nombre || ''}</p>
            ${p.descripcion
              ? `<p class="text-xs text-gray-400 mt-1.5 leading-snug" style="-webkit-line-clamp:3;display:-webkit-box;-webkit-box-orient:vertical;overflow:hidden;">${p.descripcion}</p>`
              : ''}
            ${stockHtml}
            <div class="flex items-center justify-between mt-auto pt-3">
              <span class="text-lg font-bold" style="color:#D4AF37;">$${precio}</span>
              <span class="border border-[#D4AF37]/60 text-[#D4AF37] px-3 py-1.5 rounded-lg text-xs font-semibold">Ver detalle</span>
            </div>
          </div>
        </div>`;
      }).join('');
    });
  } catch (e) {
    console.warn('[Productos] Error:', e.message);
  }
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
  await ensureUserDoc(user).catch(() => {});
  if (_userUnsub) { _userUnsub(); _userUnsub = null; }
  _stampsSynced = false;
  _prevStamps   = null;
  let _firstSnap = true;

  function _hideAuthGuard() {
    if (!_firstSnap) return;
    _firstSnap = false;
    document.getElementById('authGuard').style.display = 'none';
  }

  // Timeout de seguridad: si Firestore no responde en 8s, quitar la pantalla de carga
  const _guardTimeout = setTimeout(_hideAuthGuard, 8000);

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

    document.title = `Hola, ${nombre.split(' ')[0]} | ${SHOP.nombre}`;

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

