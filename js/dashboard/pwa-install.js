    let _pwaPrompt = null;
    const _isIOS_PWA  = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const _isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    const _pwaDismissed = sessionStorage.getItem('pwa_dismissed');

    // Mostrar el banner grande de inmediato si no es PWA (y no fue descartado)
    if (!_isStandalone && !_pwaDismissed) {
      document.getElementById('pwaBigInstallCard').classList.remove('hidden');
    }

    // Capturar el evento antes que el navegador lo consuma (Android/Desktop)
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      _pwaPrompt = e;
      if (!_isStandalone && !_pwaDismissed) mostrarBannerPWA();
    });

    // Esconder banners si el usuario ya instaló
    window.addEventListener('appinstalled', () => {
      ocultarBannerPWA();
      const bigCard = document.getElementById('pwaBigInstallCard');
      if (bigCard) bigCard.classList.add('hidden');
      console.log('[PWA] App instalada correctamente.');
    });

    function mostrarBannerPWA() {
      const _logo = window.SHOP?.logo || '/logo.jpg';
      const _alt  = window.SHOP?.nombreCorto || 'App';
      const icon = document.getElementById('pwaBannerIcon');
      if (icon) { icon.src = _logo; icon.alt = _alt; }
      // Pequeño delay para no aparecer encima del loading
      setTimeout(() => {
        document.getElementById('pwaBanner').classList.remove('hidden');
      }, 2500);
    }

    let _productoActual = {};

    function abrirProductoModal(nombre, descripcion, imagen, precio, productId, stock) {
      _productoActual = { id: productId || '', nombre, precio, stock };
      const modal = document.getElementById('productoModal');
      const img   = document.getElementById('productoModalImg');
      const imgFallback = document.getElementById('productoModalImgFallback');
      document.getElementById('productoModalNombre').textContent  = nombre;
      document.getElementById('productoModalDesc').textContent    = descripcion || '';
      document.getElementById('productoModalPrecio').textContent  = '$' + Number(precio).toLocaleString('es-CL');
      if (imagen) {
        img.src = imagen;
        img.alt = nombre;
        img.classList.remove('hidden');
        imgFallback.classList.add('hidden');
      } else {
        img.classList.add('hidden');
        imgFallback.classList.remove('hidden');
      }
      
      const stockEl = document.getElementById('productoModalStock');
      const btn = document.getElementById('btnReservarProducto');
      if (stockEl) {
        if (stock !== undefined && stock !== null && stock !== '') {
          const numStock = Number(stock);
          if (numStock > 0) {
            stockEl.textContent = `Stock disponible: ${numStock}`;
            stockEl.className = "text-xs font-semibold mb-4 text-emerald-400";
            if (btn) {
              btn.disabled = false;
              btn.textContent = 'Reservar Producto';
            }
          } else {
            stockEl.textContent = 'Agotado';
            stockEl.className = "text-xs font-semibold mb-4 text-red-500 font-bold";
            if (btn) {
              btn.disabled = true;
              btn.textContent = 'Agotado';
            }
          }
        } else {
          // Sin control de stock
          stockEl.textContent = '';
          if (btn) {
            btn.disabled = false;
            btn.textContent = 'Reservar Producto';
          }
        }
      } else {
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'Reservar Producto';
        }
      }

      modal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    }

    function cerrarProductoModal() {
      document.getElementById('productoModal').classList.add('hidden');
      document.body.style.overflow = '';
    }

    async function reservarProducto() {
      if (!currentUser || !_productoActual.id) return;
      if (_productoActual.stock !== undefined && _productoActual.stock !== null && _productoActual.stock !== '') {
        if (Number(_productoActual.stock) <= 0) {
          showToast('Este producto no tiene stock disponible.', 'error');
          return;
        }
      }
      const btn = document.getElementById('btnReservarProducto');
      btn.disabled    = true;
      btn.textContent = 'Reservando...';
      try {
        const tid = window.CURRENT_TENANT_ID || 'elegance';
        const col = tid === 'elegance'
          ? firebase.firestore().collection('product_reservations')
          : firebase.firestore().collection('tenants').doc(tid).collection('product_reservations');
        await col.add({
          productId:   _productoActual.id,
          productName: _productoActual.nombre,
          precio:      _productoActual.precio,
          userId:      currentUser.uid,
          userName:    currentUser.displayName || currentUser.email || 'Cliente',
          userEmail:   currentUser.email || '',
          status:      'pending',
          createdAt:   firebase.firestore.FieldValue.serverTimestamp(),
        });
        cerrarProductoModal();
        showToast('¡Producto reservado! Lo separaremos para tu próxima visita.', 'ok');
      } catch (err) {
        console.error('[Reserva producto]', err);
        btn.disabled    = false;
        btn.textContent = 'Reservar Producto';
        showToast('Error al reservar. Intenta de nuevo.', 'error');
      }
    }

    // ══════════════════════════════════════════════
    //  CHAT DE SOPORTE
    // ══════════════════════════════════════════════
    let _chatUnsub   = null;
    let _chatOpen    = false;
    let _chatInited  = false;

    function _chatDoc(userId) {
      const tid = window.CURRENT_TENANT_ID || 'elegance';
      return tid === 'elegance'
        ? firebase.firestore().collection('chats').doc(userId)
        : firebase.firestore().collection('tenants').doc(tid).collection('chats').doc(userId);
    }

    function _chatMsgsCol(userId) {
      return _chatDoc(userId).collection('messages');
    }

    function initChat() {
      if (_chatInited || !currentUser) return;
      _chatInited = true;

      // Nombre del local en el header
      const shopName = (window.SHOP?.nombreCorto || window.SHOP?.nombre || 'Soporte');
      document.getElementById('chatHeaderNombre').textContent = 'Soporte ' + shopName;

      // Escuchar mensajes en tiempo real
      _chatUnsub = _chatMsgsCol(currentUser.uid)
        .orderBy('timestamp', 'asc')
        .onSnapshot(snap => {
          const container = document.getElementById('chatMessages');
          if (!container) return;
          const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          if (msgs.length === 0) return;
          container.innerHTML = msgs.map(m => {
            const isUser = m.sender === 'user';
            const text   = m.text || '';
            return isUser
              ? `<div class="flex justify-end">
                   <div class="max-w-[75%] text-sm rounded-2xl rounded-tr-none px-3 py-2 leading-snug font-medium" style="background:#D4AF37;color:#000">${text}</div>
                 </div>`
              : `<div class="flex justify-start">
                   <div class="max-w-[75%] text-sm rounded-2xl rounded-tl-none px-3 py-2 leading-snug" style="background:#1f2937;color:#e5e7eb">${text}</div>
                 </div>`;
          }).join('');
          container.scrollTop = container.scrollHeight;

          // Badge si el popover está cerrado y hay msg del admin
          const lastMsg = msgs[msgs.length - 1];
          if (!_chatOpen && lastMsg?.sender === 'admin') {
            document.getElementById('chatUnreadDot').classList.remove('hidden');
          }
        });
    }

    async function sendChatMessage() {
      if (!currentUser) return;
      const input = document.getElementById('chatInput');
      const text  = (input?.value || '').trim();
      if (!text) return;
      input.value = '';

      const ts = firebase.firestore.FieldValue.serverTimestamp();
      const uid = currentUser.uid;

      await _chatMsgsCol(uid).add({ text, sender: 'user', timestamp: ts });
      await _chatDoc(uid).set({
        userName:    currentUser.displayName || currentUser.email || 'Cliente',
        userEmail:   currentUser.email || '',
        source:      'club',  // 'club' = cliente registrado en el Club desde su dashboard
        lastMessage: text,
        updatedAt:   ts,
        hasUnread:   true,
      }, { merge: true });
    }

    function toggleChat() {
      _chatOpen = !_chatOpen;
      document.getElementById('chatPopover').classList.toggle('hidden', !_chatOpen);
      document.getElementById('chatIconMsg').classList.toggle('hidden',  _chatOpen);
      document.getElementById('chatIconX').classList.toggle('hidden',   !_chatOpen);
      document.getElementById('chatUnreadDot').classList.add('hidden');

      if (_chatOpen) {
        initChat();
        setTimeout(() => {
          const c = document.getElementById('chatMessages');
          if (c) c.scrollTop = c.scrollHeight;
          document.getElementById('chatInput')?.focus();
        }, 60);
      }
    }

    // El widget se muestra/oculta desde el onAuthStateChanged principal (ver auth.onAuthStateChanged)

    function instalarPWA() {
      if (_isIOS_PWA) {
        const _logo = window.SHOP?.logo || '/logo.jpg';
        const _alt  = window.SHOP?.nombreCorto || 'App';
        const icon = document.getElementById('pwaModalIcon');
        if (icon) { icon.src = _logo; icon.alt = _alt; }
        document.getElementById('pwaModalIOS').classList.remove('hidden');
        return;
      }
      if (!_pwaPrompt) {
        showToast("Usa 'Agregar a pantalla de inicio' en el menú del navegador", 'info');
        return;
      }
      _pwaPrompt.prompt();
      _pwaPrompt.userChoice.then(r => {
        if (r.outcome === 'accepted') {
          ocultarBannerPWA();
          const bigCard = document.getElementById('pwaBigInstallCard');
          if (bigCard) bigCard.classList.add('hidden');
        }
        _pwaPrompt = null;
      });
    }

    function cerrarBannerPWA() {
      ocultarBannerPWA();
      sessionStorage.setItem('pwa_dismissed', '1');
      const bigCard = document.getElementById('pwaBigInstallCard');
      if (bigCard) bigCard.classList.add('hidden');
    }

    function ocultarBannerPWA() {
      const banner = document.getElementById('pwaBanner');
      if(banner) banner.classList.add('hidden');
    }

    // iOS: el modal se usa a través del botón instalar, no es necesario lanzarlo al inicio automáticamente 
    // a menos que quieras forzarlo. Ya lo forzamos al presionar el BigCard, así que lo quitamos del onLoad.

    function cerrarModalIOS() {
      document.getElementById('pwaModalIOS').classList.add('hidden');
      sessionStorage.setItem('pwa_dismissed', '1');
      const bigCard = document.getElementById('pwaBigInstallCard');
      if (bigCard) bigCard.classList.add('hidden');
    }
