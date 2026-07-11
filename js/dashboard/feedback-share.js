    let _googleReviewCitaId = null;
    let _selectedFeedbackRating = 0;
    let _selectedFeedbackCitaId = null;

    function initFeedbackCard(cita) {
      _selectedFeedbackCitaId = cita.id;
      _selectedFeedbackRating = 0;
      
      // Reset styles and values
      const barberoNameSpan = document.getElementById('feedbackBarberoNombre');
      if (barberoNameSpan) barberoNameSpan.textContent = cita.barbero || 'tu profesional';
      
      const commentTextarea = document.getElementById('feedbackComment');
      if (commentTextarea) commentTextarea.value = '';
      
      const formContent = document.getElementById('feedbackFormContent');
      if (formContent) formContent.classList.add('hidden');
      
      // Reset stars
      for (let i = 1; i <= 5; i++) {
        const star = document.getElementById(`feedbackStar-${i}`);
        if (star) star.className = 'ph-bold ph-star text-2xl text-zinc-600';
      }
      
      // Reset chips
      document.querySelectorAll('.review-chip').forEach(c => c.classList.remove('active-chip'));
      
      
      const customTipInput = document.getElementById('feedbackCustomTip');
      if (customTipInput) customTipInput.value = '';
      
      // Show container
      const fContainer = document.getElementById('interactiveFeedbackContainer');
      if (fContainer) fContainer.classList.remove('hidden');
    }

    function hoverFeedbackRating(rating) {
      if (_selectedFeedbackRating > 0) return;
      for (let i = 1; i <= 5; i++) {
        const star = document.getElementById(`feedbackStar-${i}`);
        if (star) {
          if (i <= rating) {
            star.className = 'ph-fill ph-star text-2xl text-amber-400';
          } else {
            star.className = 'ph-bold ph-star text-2xl text-zinc-600';
          }
        }
      }
    }

    function resetFeedbackRating() {
      if (_selectedFeedbackRating > 0) return;
      for (let i = 1; i <= 5; i++) {
        const star = document.getElementById(`feedbackStar-${i}`);
        if (star) star.className = 'ph-bold ph-star text-2xl text-zinc-600';
      }
    }

    function setFeedbackRating(rating) {
      _selectedFeedbackRating = rating;
      
      // Color stars permanently
      for (let i = 1; i <= 5; i++) {
        const star = document.getElementById(`feedbackStar-${i}`);
        if (star) {
          if (i <= rating) {
            star.className = 'ph-fill ph-star text-2xl text-amber-400';
          } else {
            star.className = 'ph-bold ph-star text-2xl text-zinc-600';
          }
        }
      }
      
      // Expand form
      const formContent = document.getElementById('feedbackFormContent');
      if (formContent) formContent.classList.remove('hidden');
    }

    function toggleFeedbackChip(btn) {
      btn.classList.toggle('active-chip');
    }

    async function cerrarFeedbackCard() {
      if (!_selectedFeedbackCitaId) return;
      const fContainer = document.getElementById('interactiveFeedbackContainer');
      if (fContainer) fContainer.classList.add('hidden');
      try {
        await FDB.citasCol().doc(_selectedFeedbackCitaId).update({ pendingGoogleReview: false });
      } catch (e) {
        console.warn('[Feedback] Error al ocultar banner:', e.message);
      }
    }

    async function enviarFeedbackYPropina() {
      if (!_selectedFeedbackCitaId) return;
      if (_selectedFeedbackRating === 0) return alert('Por favor, selecciona una calificación.');

      const btn = document.querySelector('[onclick="enviarFeedbackYPropina()"]');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="w-4 h-4 border-2 border-black/40 border-t-black rounded-full animate-spin inline-block"></span>';
      }

      // Gather active chips
      const chips = [];
      document.querySelectorAll('.review-chip.active-chip').forEach(c => chips.push(c.textContent));

      // Gather comment
      const commentInput = document.getElementById('feedbackComment');
      let comment = commentInput ? commentInput.value.trim() : '';
      if (chips.length > 0) {
        const chipStr = chips.join(', ');
        comment = comment ? `${chipStr}. ${comment}` : chipStr;
      }

      try {
        await FDB.citasCol().doc(_selectedFeedbackCitaId).update({
          rating: Number(_selectedFeedbackRating),
          ratingComments: comment,
          ratingCreatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          pendingGoogleReview: false
        });

        // Burst Confetti!
        if (typeof confetti === 'function') {
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.8 } });
        }

        const fContainer = document.getElementById('interactiveFeedbackContainer');
        if (fContainer) fContainer.classList.add('hidden');

        if (_selectedFeedbackRating >= 4) {
          setTimeout(() => mostrarGoogleReviewModal(_selectedFeedbackCitaId), 800);
        }

      } catch (err) {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<i class="ph-bold ph-paper-plane-right"></i> Enviar calificación';
        }
        alert('No se pudo enviar tu valoración. Intenta de nuevo.');
      }
    }

    function mostrarGoogleReviewModal(citaId) {
      const url = (window.SHOP && window.SHOP.googleReviewUrl) || '';
      if (!url) return; // No hay URL configurada para este tenant
      _googleReviewCitaId = citaId;
      const btn = document.getElementById('googleReviewBtn');
      if (btn) btn.href = url;
      document.getElementById('googleReviewModal').classList.remove('hidden');
    }

    async function cerrarGoogleReviewModal(clicked) {
      document.getElementById('googleReviewModal').classList.add('hidden');
      const citaIdParaFeedback = _googleReviewCitaId;
      const commentInput = document.getElementById('googleReviewComment');
      const textoLibre = commentInput ? commentInput.value.trim() : '';
      if (commentInput) commentInput.value = '';

      if (_googleReviewCitaId) {
        try {
          await FDB.clearGoogleReviewFlag(_googleReviewCitaId);
        } catch (e) {
          console.warn('[GoogleReview] No se pudo limpiar flag:', e.message);
        }
      }

      if (clicked && window.SynapReseña) {
        // Flujo optimizado: guarda interno + copia al portapapeles + abre
        // Maps app en móvil o el link web en desktop. La reseña queda en
        // Firestore aunque Google gatee con login → nada se pierde.
        try {
          await window.SynapReseña.abrirGoogle({
            citaId: _googleReviewCitaId,
            texto:  textoLibre,
            rating: 5,
          });
        } catch (e) {
          console.warn('[GoogleReview] abrirGoogle falló, fallback a URL directa:', e.message);
          const url = (window.SHOP && window.SHOP.googleReviewUrl) || '';
          if (url) window.open(url, '_blank', 'noopener');
        }
        _googleReviewCitaId = null;
        return; // no abrimos el feedback privado si ya fue a Google
      }

      _googleReviewCitaId = null;
      // Si no clickeó el modal de Google (o lo cerró), pedir feedback privado
      // para no perder señal operativa de clientes con experiencia regular/mala.
      if (citaIdParaFeedback) {
        setTimeout(() => abrirPrivateFeedback(citaIdParaFeedback), 400);
      }
    }

    /* ═══════ FEEDBACK PRIVADO POST-GOOGLE ═══════ */
    let _pfCitaId = null;
    let _pfRating = 0;

    function abrirPrivateFeedback(citaId) {
      _pfCitaId = citaId;
      _pfRating = 0;
      document.getElementById('pfComment').value = '';
      document.getElementById('pfSendBtn').disabled = true;
      // Reset estrellas
      for (let i = 1; i <= 5; i++) {
        const star = document.getElementById('pfStar-' + i);
        if (star) star.className = 'ph-bold ph-star text-3xl text-zinc-500';
      }
      document.getElementById('privateFeedbackModal').classList.remove('hidden');
    }

    function pfSetRating(n) {
      _pfRating = n;
      for (let i = 1; i <= 5; i++) {
        const star = document.getElementById('pfStar-' + i);
        if (!star) continue;
        star.className = i <= n
          ? 'ph-fill ph-star text-3xl text-amber-400'
          : 'ph-bold ph-star text-3xl text-zinc-500';
      }
      document.getElementById('pfSendBtn').disabled = _pfRating === 0;
    }

    async function enviarPrivateFeedback() {
      if (!_pfCitaId || _pfRating === 0) return;
      const btn = document.getElementById('pfSendBtn');
      btn.disabled = true;
      btn.textContent = 'Enviando...';
      const comment = document.getElementById('pfComment').value.trim();
      try {
        await FDB.citasCol().doc(_pfCitaId).update({
          feedbackPrivadoRating:    Number(_pfRating),
          feedbackPrivadoComment:   comment,
          feedbackPrivadoCreatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      } catch (e) {
        console.warn('[FeedbackPrivado] error:', e.message);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Enviar reseña';
        cerrarPrivateFeedback(true);
      }
    }

    function cerrarPrivateFeedback(sent) {
      document.getElementById('privateFeedbackModal').classList.add('hidden');
      _pfCitaId = null;
      _pfRating = 0;
      if (sent && typeof showToast === 'function') {
        try { showToast('¡Gracias por tu feedback! 🙏', 'ok'); } catch (_) {}
      }
    }

    // ─── Funciones para Compartir Estilo en Instagram Stories ───
    let _storyImageBlob = null;
    let _storyImageUrl = null;

    function cerrarModalCompartir() {
      document.getElementById('compartirStoryModal')?.classList.add('hidden');
      document.body.style.overflow = '';
    }

    async function compartirEstiloStory() {
      const modal = document.getElementById('compartirStoryModal');
      if (!modal) return;
      modal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      
      const canvas = document.getElementById('storyCanvas');
      const previewImg = document.getElementById('storyPreviewImg');
      const loadingEl = document.getElementById('storyCanvasLoading');
      const btnNativo = document.getElementById('btnStoryNativo');
      
      if (!canvas || !previewImg || !loadingEl) return;
      
      loadingEl.classList.remove('hidden');
      previewImg.classList.add('opacity-0');
      
      try {
        const ctx = canvas.getContext('2d');
        const width = 1080;
        const height = 1920;
        canvas.width = width;
        canvas.height = height;
        
        // 1. Fondo gradiente oscuro elegante
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#0a0a0d');
        gradient.addColorStop(0.5, '#121217');
        gradient.addColorStop(1, '#070709');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        
        // 2. Círculos de luz cálida difuminados (glow)
        ctx.save();
        ctx.filter = 'blur(150px)';
        ctx.fillStyle = 'rgba(201, 168, 76, 0.16)';
        ctx.beginPath();
        ctx.arc(width / 2, 250, 200, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = 'rgba(201, 168, 76, 0.08)';
        ctx.beginPath();
        ctx.arc(width / 2, height - 300, 250, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        
        // 3. Bordes dorados estéticos
        ctx.strokeStyle = 'rgba(201, 168, 76, 0.22)';
        ctx.lineWidth = 14;
        ctx.strokeRect(30, 30, width - 60, height - 60);
        
        ctx.strokeStyle = 'rgba(201, 168, 76, 0.08)';
        ctx.lineWidth = 2;
        ctx.strokeRect(50, 50, width - 100, height - 100);
        
        // 4. Cargar y dibujar la foto favorita del cliente en el centro
        const photoUrl = document.getElementById('sfPhoto')?.src;
        if (!photoUrl) throw new Error('No favorite photo URL found');
        
        const clientImg = await _loadImage(photoUrl);
        
        const frameX = 100;
        const frameY = 440;
        const frameW = width - 200;
        const frameH = 1000;
        
        // Sombra de la foto
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
        ctx.shadowBlur = 40;
        ctx.shadowOffsetY = 15;
        ctx.fillStyle = '#17171d';
        _drawRoundedRect(ctx, frameX, frameY, frameW, frameH, 30);
        ctx.fill();
        ctx.restore();
        
        // Clip para redondear la imagen
        ctx.save();
        _drawRoundedRect(ctx, frameX, frameY, frameW, frameH, 30);
        ctx.clip();
        
        const imgRatio = clientImg.width / clientImg.height;
        const frameRatio = frameW / frameH;
        let drawW, drawH, drawX, drawY;
        
        let fX = 0.5;
        let fY = 0.5;
        if (_sfCurrentDoc) {
          const sfData = _sfCurrentDoc.data();
          if (sfData.focalX !== undefined) fX = sfData.focalX / 100;
          if (sfData.focalY !== undefined) fY = sfData.focalY / 100;
        }
        
        if (imgRatio > frameRatio) {
          drawH = frameH;
          drawW = frameH * imgRatio;
          drawX = frameX + (frameW - drawW) * fX;
          drawY = frameY;
        } else {
          drawW = frameW;
          drawH = frameW / imgRatio;
          drawX = frameX;
          drawY = frameY + (frameH - drawH) * fY;
        }
        
        ctx.drawImage(clientImg, drawX, drawY, drawW, drawH);
        ctx.restore();
        
        // Borde dorado fino a la foto
        ctx.strokeStyle = 'rgba(201, 168, 76, 0.35)';
        ctx.lineWidth = 4;
        ctx.save();
        _drawRoundedRect(ctx, frameX, frameY, frameW, frameH, 30);
        ctx.stroke();
        ctx.restore();
        
        // 5. Cargar y dibujar el logotipo del local arriba
        const shopLogoUrl = window.SHOP?.logo || '/logo.jpg';
        try {
          const logoImg = await _loadImage(shopLogoUrl);
          const logoSize = 130;
          const logoX = (width - logoSize) / 2;
          const logoY = 120;
          
          ctx.save();
          _drawRoundedRect(ctx, logoX, logoY, logoSize, logoSize, 25);
          ctx.clip();
          ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
          ctx.restore();
          
          ctx.strokeStyle = 'rgba(201, 168, 76, 0.4)';
          ctx.lineWidth = 3;
          ctx.save();
          _drawRoundedRect(ctx, logoX, logoY, logoSize, logoSize, 25);
          ctx.stroke();
          ctx.restore();
        } catch (_) {}
        
        // 6. Textos y Tipografías Elegantes
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        
        // Nombre del Local
        ctx.font = 'bold 36px "Plus Jakarta Sans", sans-serif';
        ctx.fillText((window.SHOP?.nombre || 'Mi Barbería').toUpperCase(), width / 2, 305);
        
        // Eslogan / Badge
        ctx.fillStyle = '#D4AF37';
        ctx.font = 'bold 23px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('• MI ESTILO RECOMENDADO •', width / 2, 355);
        
        // Ceja Superior
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.font = 'medium 20px "Plus Jakarta Sans", sans-serif';
        ctx.fillText((window.SHOP?.club || 'CLUB DE FIDELIDAD').toUpperCase(), width / 2, 95);
        
        // Mensaje inferior
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 36px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('NUEVO CAMBIO DE ESTILO', width / 2, 1530);
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.font = 'medium 25px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('Agenda tu cita y eleva tu aura en', width / 2, 1585);
        
        ctx.fillStyle = '#D4AF37';
        ctx.font = 'bold 27px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(location.hostname, width / 2, 1635);
        
        // Marca de agua Synaptech
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.font = '20px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('Powered by SynapTech', width / 2, 1850);
        
        // 7. Renderizar en la imagen preview
        canvas.toBlob(blob => {
          _storyImageBlob = blob;
          if (_storyImageUrl) URL.revokeObjectURL(_storyImageUrl);
          _storyImageUrl = URL.createObjectURL(blob);
          
          previewImg.src = _storyImageUrl;
          previewImg.classList.remove('opacity-0');
          loadingEl.classList.add('hidden');
          
          // Soporta compartir archivos nativos (Android/iOS)
          const canShare = navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], 'story.png', { type: 'image/png' })] });
          if (btnNativo) {
            btnNativo.innerHTML = canShare 
              ? `<i class="ph-bold ph-share-network text-sm mr-1 inline-block align-middle"></i> Compartir`
              : `<i class="ph-bold ph-share text-sm mr-1 inline-block align-middle"></i> Compartir App`;
          }
        }, 'image/png');
        
      } catch (err) {
        console.error('[Story Canvas Generator]', err);
        showToast('No se pudo generar la tarjeta', 'err');
        cerrarModalCompartir();
      }
    }

    function _loadImage(src) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous'; // Permitir orígenes cruzados en storage de Firebase
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(e);
        
        // Evita el bug de caché de CORS del navegador agregando un parámetro único
        let finalSrc = src;
        if (src && src.includes('firebasestorage.googleapis.com')) {
          const sep = src.includes('?') ? '&' : '?';
          finalSrc = `${src}${sep}cb_cors=${Date.now()}`;
        }
        img.src = finalSrc;
      });
    }

    function _drawRoundedRect(ctx, x, y, width, height, radius) {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    }

    function descargarStoryImage() {
      if (!_storyImageUrl) return;
      const a = document.createElement('a');
      a.href = _storyImageUrl;
      a.download = `estilo_${window.SHOP?.nombreCorto || 'corte'}_story.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast('Imagen guardada en tu dispositivo', 'ok');
    }

    async function compartirStoryNativo() {
      if (!_storyImageBlob) return;
      
      const file = new File([_storyImageBlob], 'story.png', { type: 'image/png' });
      const shareData = {
        title: 'Mi estilo recomendado',
        text: `¡Mira mi estilo recomendado en ${window.SHOP?.nombre || 'mi barbería'}!`,
        url: window.location.origin + '/registro?redirect=dashboard',
      };
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            ...shareData,
            files: [file],
          });
          showToast('Compartido con éxito', 'ok');
        } catch (err) {
          if (err.name !== 'AbortError') console.error('[Share files]', err);
        }
      } else if (navigator.share) {
        try {
          await navigator.share(shareData);
        } catch (err) {
          if (err.name !== 'AbortError') console.error('[Share text]', err);
        }
      } else {
        navigator.clipboard.writeText(shareData.url);
        showToast('Enlace copiado al portapapeles', 'ok');
      }
    }

    // ─── Academia Elegance modal ──────────────────────────────
    (function initAcademia() {
      if ((window.CURRENT_TENANT_ID || 'elegance') !== 'elegance') return;
      const wrapper = document.getElementById('academiaBtnWrapper');
      if (wrapper) wrapper.classList.remove('hidden');
    })();

    function abrirAcademiaModal() {
      const modal = document.getElementById('academiaModal');
      if (modal) modal.classList.remove('hidden');
    }
    function cerrarAcademiaModal() {
      const modal = document.getElementById('academiaModal');
      if (modal) modal.classList.add('hidden');
    }

    async function compartirAgenda() {
      const shop = window.SHOP || {};
      const url  = window.location.origin;
      const text = `¡Agenda tu hora en ${shop.nombre || 'nuestra barbería'}! ${shop.slogan || ''}\n👉 ${url}`.trim();
      if (navigator.share) {
        try { await navigator.share({ title: shop.nombre || 'Agenda', text, url }); return; } catch (e) { if (e.name === 'AbortError') return; }
      }
      try {
        await navigator.clipboard.writeText(text);
        showToast('¡Link copiado al portapapeles!', 'ok');
      } catch (_) {}
    }

    // Compartir el Club de Fidelidad — invita a un amigo a registrarse (/registro)
    async function invitarAmigoClub() {
      const shop   = window.SHOP || {};
      const nombre = shop.nombre || 'nuestro club';
      const url    = window.location.origin + '/registro';
      const text   = `¡Únete al Club de ${nombre} y acumula sellos para premios! 🎁\nRegístrate aquí 👉 ${url}`;
      if (navigator.share) {
        try { await navigator.share({ title: `Club ${nombre}`, text, url }); return; }
        catch (e) { if (e.name === 'AbortError') return; }
      }
      try {
        await navigator.clipboard.writeText(text);
        showToast('¡Invitación copiada al portapapeles!', 'ok');
      } catch (_) {}
    }
