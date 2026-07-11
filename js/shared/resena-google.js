/* ═══════════════════════════════════════════════════════════════
 *  js/shared/resena-google.js
 *  ─────────────────────────────────────────────────────────────
 *  Helper unificado para el flujo optimizado de reseñas Google.
 *  Lo usan: dashboard.html (card + modal), rate.html, y cualquier
 *  landing futura que quiera esta lógica.
 *
 *  Qué hace:
 *    1. Guarda la reseña internamente (aunque el cliente no llegue
 *       a Google), usando los campos feedbackPrivado* que las rules
 *       ya permiten sobre citas/{id}.
 *    2. Copia al portapapeles el texto que el cliente escribió
 *       (o los chips que marcó, o un fallback variado).
 *    3. Detecta plataforma y abre Google Maps app en móvil (donde
 *       el usuario ya está logueado) o el link web en desktop.
 *
 *  Requisitos globales:
 *    - firebase.firestore ya inicializado
 *    - window.SHOP (config.js)
 *    - window.CURRENT_TENANT_ID
 *
 *  Uso:
 *    await window.SynapReseña.abrirGoogle({
 *      citaId,          // opcional — si viene, se persiste el feedback
 *      texto,           // opcional — lo que escribió el cliente
 *      chips,           // opcional — array de strings ["Excelente atención", ...]
 *      rating,          // 1..5
 *      googleUrl,       // override del URL, sino usa SHOP.googleReviewUrl
 *    });
 * ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  if (window.SynapReseña) return; // idempotente

  // ── Copy fallback: variantes rotativas para evitar patrones scripted ──
  //   Google detecta reseñas idénticas y las esconde. Si el cliente no
  //   marcó chips ni escribió nada, pickeamos random de este pool.
  const FALLBACK_VARIANTS = [
    'Excelente atención, muy recomendados 🙌',
    'Súper profesionales, quedé encantado 💯',
    'Gran experiencia, ya me toca volver ✂️',
    'Muy buen servicio y trato amable',
    'Recomendados 100%. Los mejores 👌',
    'Ambiente increíble y trabajo impecable',
    'Puntualidad y calidad, todo perfecto',
  ];

  // ── Chips → texto natural ────────────────────────────────────
  //   Une chips con separadores humanos ("A · B" o "A, B y C").
  function chipsATexto(chips) {
    const arr = (chips || []).filter(Boolean).map(s => String(s).trim());
    if (arr.length === 0) return '';
    if (arr.length === 1) return arr[0] + '.';
    if (arr.length === 2) return arr.join(' y ') + '.';
    return arr.slice(0, -1).join(', ') + ' y ' + arr.slice(-1) + '.';
  }

  // ── Copy sugerida por tenant (opción 2 + variantes) ──────────
  function pickCopy({ texto, chips }) {
    // 1. Cliente escribió: eso gana
    if (texto && texto.trim()) return texto.trim().slice(0, 400);
    // 2. Cliente marcó chips: los formateamos
    const chipTxt = chipsATexto(chips);
    if (chipTxt) return chipTxt;
    // 3. Fallback: pick random del pool (variantes o config del tenant)
    const tenantCopy = window.SHOP?.copyResenaSugerida;
    if (Array.isArray(tenantCopy) && tenantCopy.length) {
      return tenantCopy[Math.floor(Math.random() * tenantCopy.length)];
    }
    if (typeof tenantCopy === 'string' && tenantCopy.trim()) return tenantCopy;
    return FALLBACK_VARIANTS[Math.floor(Math.random() * FALLBACK_VARIANTS.length)];
  }

  // ── Extraer placeId desde varios formatos de googleReviewUrl ─
  //   Formatos válidos:
  //     https://g.page/r/PLACEID/review
  //     https://search.google.com/local/writereview?placeid=PLACEID
  //     https://maps.google.com/?cid=PLACEID
  function extraerPlaceId(url) {
    if (!url) return '';
    // g.page/r/PLACEID
    let m = url.match(/g\.page\/r\/([A-Za-z0-9_-]+)/);
    if (m) return m[1];
    // ?placeid=PLACEID
    m = url.match(/[?&]placeid=([A-Za-z0-9_-]+)/i);
    if (m) return m[1];
    // ?cid=PLACEID
    m = url.match(/[?&]cid=([A-Za-z0-9_-]+)/i);
    if (m) return m[1];
    return '';
  }

  // ── Copiar al portapapeles con fallback para navegadores viejos ──
  async function copiarAlPortapapeles(texto) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(texto);
        return true;
      }
      // Fallback: textarea invisible + execCommand
      const ta = document.createElement('textarea');
      ta.value = texto;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) {
      console.warn('[reseña] copiar falló:', e.message);
      return false;
    }
  }

  // ── Toast minimalista para "ya copiamos tu opinión" ──────────
  function toast(msg, ms = 3200) {
    // Si el sitio ya define un toast global (dashboard.html), lo usamos
    if (typeof window.showToast === 'function') {
      try { window.showToast(msg); return; } catch (_) {}
    }
    // Fallback: crear un toast propio
    const existing = document.getElementById('_synapReseñaToast');
    if (existing) existing.remove();
    const el = document.createElement('div');
    el.id = '_synapReseñaToast';
    el.textContent = msg;
    Object.assign(el.style, {
      position: 'fixed',
      bottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
      left: '50%',
      transform: 'translateX(-50%)',
      background: '#111',
      color: '#fff',
      padding: '12px 20px',
      borderRadius: '999px',
      fontSize: '13px',
      fontWeight: '600',
      boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
      zIndex: '9999',
      maxWidth: 'calc(100vw - 40px)',
      textAlign: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, sans-serif',
      pointerEvents: 'none',
    });
    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s ease'; }, ms - 300);
    setTimeout(() => el.remove(), ms);
  }

  // ── Guardar reseña interna en la cita (si vino citaId) ───────
  //   Reutiliza los campos feedbackPrivado* que las rules ya
  //   permiten al propio cliente escribir sobre su cita.
  async function guardarInterno({ citaId, texto, chips, rating }) {
    if (!citaId) return;
    try {
      const db = firebase.firestore();
      const tid = window.CURRENT_TENANT_ID || 'elegance';
      const ref = tid === 'elegance'
        ? db.collection('citas').doc(citaId)
        : db.collection('tenants').doc(tid).collection('citas').doc(citaId);

      const payload = {
        feedbackPrivadoRating:    Number(rating) || 5,
        feedbackPrivadoComment:   (texto && texto.trim()) || chipsATexto(chips) || '(sin comentario)',
        feedbackPrivadoCreatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      };
      await ref.update(payload);
    } catch (e) {
      // No bloquea el flujo si falla: al menos el redirect a Google sigue
      console.warn('[reseña] no se pudo guardar interno:', e.message);
    }
  }

  // ── Detección de plataforma + deep-link a Maps app ───────────
  function abrirGoogleMaps(url, placeId) {
    const ua = navigator.userAgent || '';
    const esIOS     = /iPhone|iPad|iPod/.test(ua);
    const esAndroid = /Android/.test(ua);

    // Si no tenemos placeId no podemos deep-link. Ir al web como está.
    if (!placeId) { window.open(url, '_blank', 'noopener'); return; }

    if (esIOS) {
      // iOS: intento con esquema de la app. Si no está instalada, el
      // esquema falla silenciosamente y caemos al web tras 400ms.
      const app = `comgooglemaps://?daddr=&q=place_id:${placeId}`;
      const t = Date.now();
      const w = window.open(app, '_self');
      setTimeout(() => {
        // Si sigue en el sitio (no saltó a Maps) → fallback web
        if (Date.now() - t < 1000) window.open(url, '_blank', 'noopener');
      }, 500);
      return;
    }

    if (esAndroid) {
      // Android: intent oficial. Si Maps no está, el navegador cae
      // automáticamente al fallback (que es el mismo URL web).
      const intent = `intent://maps.google.com/?q=place_id:${placeId}` +
                     `#Intent;package=com.google.android.apps.maps;scheme=https;` +
                     `S.browser_fallback_url=${encodeURIComponent(url)};end`;
      window.location.href = intent;
      return;
    }

    // Desktop: el web es lo único que hay
    window.open(url, '_blank', 'noopener');
  }

  // ═══════════════════════════════════════════════════════════════
  //  API pública
  // ═══════════════════════════════════════════════════════════════
  async function abrirGoogle(opts) {
    opts = opts || {};
    const {
      citaId  = null,
      texto   = '',
      chips   = [],
      rating  = 5,
      googleUrl = (window.SHOP && window.SHOP.googleReviewUrl) || '',
    } = opts;

    if (!googleUrl) {
      // Sin URL configurada, al menos guardamos internamente
      await guardarInterno({ citaId, texto, chips, rating });
      toast('Gracias por tu opinión — la recibimos 💛');
      return { ok: true, google: false };
    }

    // 1. Armar copy y copiar al clipboard EN PARALELO con el guardado interno
    const copy = pickCopy({ texto, chips });
    const [copiado] = await Promise.all([
      copiarAlPortapapeles(copy),
      guardarInterno({ citaId, texto, chips, rating }),
    ]);

    // 2. Toast según si se copió
    if (copiado) {
      toast('📋 Tu opinión ya está copiada — solo pégala y publica');
    } else {
      toast('Te abrimos Google Maps — dinos algo bonito 🙌');
    }

    // 3. Abrir Google Maps (app si es móvil con Maps instalado)
    const placeId = extraerPlaceId(googleUrl);
    setTimeout(() => abrirGoogleMaps(googleUrl, placeId), copiado ? 400 : 100);

    return { ok: true, google: true, copiado };
  }

  window.SynapReseña = {
    abrirGoogle,
    pickCopy,
    extraerPlaceId,
    copiarAlPortapapeles,
    chipsATexto,
  };
})();
