'use strict';

// functions/google-reviews-sync.js
// ─────────────────────────────────────────────────────────────────
//  GOOGLE REVIEWS SYNC — sincroniza rating + total de opiniones (y
//  hasta 5 reseñas) desde Google Places API (New) hacia Firestore.
//
//  El Place ID de cada local vive en Firestore (no hardcodeado):
//      settings/googleReviews                 { placeId }   (elegance)
//      tenants/{tid}/settings/googleReviews   { placeId }   (resto)
//  La función lee ese placeId, consulta Google y MERGEA en el mismo doc:
//      { rating, totalReviews, reviews[], source, updatedAt }
//
//  Límite de Google: la API entrega rating + total siempre, pero solo
//  hasta 5 reseñas individuales (no todas). Las 5 quedan guardadas por
//  si luego se quieren usar; el cliente hoy solo usa rating + total.
//
//  SETUP (una vez):
//    1. Google Cloud (proyecto barberia-elegance) → habilitar "Places API (New)"
//    2. Crear API key restringida a "Places API (New)"
//    3. firebase functions:secrets:set GOOGLE_PLACES_API_KEY
//    4. Guardar el Place ID del local en Firestore, p. ej. para D'Jones (lumen):
//       tenants/lumen/settings/googleReviews  →  { placeId: 'ChIJ...' }
//
//  DEPLOY:
//    firebase deploy --only functions:googleReviewsSyncScheduled,functions:googleReviewsSyncManual
// ─────────────────────────────────────────────────────────────────

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onSchedule }         = require('firebase-functions/v2/scheduler');
const { defineSecret }       = require('firebase-functions/params');
const { logger }             = require('firebase-functions');
const admin                  = require('firebase-admin');
const { Timestamp }          = require('firebase-admin/firestore');

const db = admin.firestore();

const GOOGLE_PLACES_API_KEY = defineSecret('GOOGLE_PLACES_API_KEY');

// Mismos tenants que el resto de funciones multi-tenant (ver instagram-sync.js)
const ALL_TENANTS      = ['elegance', 'ferraza', 'gitana', 'chameleon', 'mapubarbershop', 'deluxeperfumes', 'lumen', 'delnero', 'marcelo_hairdressing', 'aura', 'latincaribe', 'machos', 'infinity', 'sionbarberia', 'omegastudio', 'memphis'];
const BOOTSTRAP_ADMINS = ['ignaciiio.mate@gmail.com'];

// Doc de reseñas por tenant (elegance vive en la raíz; el resto bajo tenants/)
function reviewsDocRef(tenantId) {
  return tenantId === 'elegance'
    ? db.collection('settings').doc('googleReviews')
    : db.collection('tenants').doc(tenantId).collection('settings').doc('googleReviews');
}

// Traduce el string de "hace X" al español desde el formato en ingles que
// devuelve Places API (New) cuando el header X-Goog-Language-Code no fuerza
// la localizacion (que es la mayoria del tiempo — Google es inconsistente).
function localizeTimeString(str) {
  if (!str) return '';
  const s = str.toLowerCase().trim();
  // "N days ago" | "a day ago" | "yesterday"
  if (s === 'yesterday') return 'ayer';
  const patterns = [
    { re: /^a day ago$/i,          out: 'hace 1 día' },
    { re: /^(\d+) days? ago$/i,    fn: n => `hace ${n} día${n === '1' ? '' : 's'}` },
    { re: /^a week ago$/i,         out: 'hace 1 semana' },
    { re: /^(\d+) weeks? ago$/i,   fn: n => `hace ${n} semana${n === '1' ? '' : 's'}` },
    { re: /^a month ago$/i,        out: 'hace 1 mes' },
    { re: /^(\d+) months? ago$/i,  fn: n => `hace ${n} mes${n === '1' ? '' : 'es'}` },
    { re: /^a year ago$/i,         out: 'hace 1 año' },
    { re: /^(\d+) years? ago$/i,   fn: n => `hace ${n} año${n === '1' ? '' : 's'}` },
    { re: /^an? hour ago$/i,       out: 'hace 1 hora' },
    { re: /^(\d+) hours? ago$/i,   fn: n => `hace ${n} hora${n === '1' ? '' : 's'}` },
  ];
  for (const p of patterns) {
    const m = s.match(p.re);
    if (m) return p.out || p.fn(m[1]);
  }
  return str; // fallback: dejar como estaba si no matchea ningun patron
}

// Traduce texto al español via MyMemory (API gratuita, 5000 chars/dia por IP).
// Bajo volumen para nuestro caso (5 reseñas * ~50 tenants = 250 llamadas/dia
// en el peor caso, cada una <500 chars). Si falla, devuelve el texto original.
async function translateToSpanish(text, sourceLang = 'en') {
  const t = (text || '').trim();
  if (!t) return '';
  // Cap a 500 chars para no pasarnos del limite ni gastar cuota
  const q = t.slice(0, 500);
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=${sourceLang}|es`;
    const r   = await fetch(url);
    if (!r.ok) return text;
    const j = await r.json();
    const translated = j?.responseData?.translatedText;
    if (!translated || typeof translated !== 'string') return text;
    // Si MyMemory devolvio un mensaje de error tipo "MYMEMORY WARNING", lo detecta
    if (translated.toUpperCase().includes('MYMEMORY WARNING')) return text;
    // Si la traduccion es igual al original y hay chars ASCII, algo fallo
    return translated;
  } catch (_) {
    return text;
  }
}

// Devuelve el texto de la reseña en español. Prefiere text.text si Google ya
// lo devolvio en es-*; si no, traduce el originalText via MyMemory.
async function pickSpanishText(review) {
  const textLang     = (review.text?.languageCode         || '').toLowerCase();
  const originalLang = (review.originalText?.languageCode || '').toLowerCase();
  const textStr     = review.text?.text         || '';
  const originalStr = review.originalText?.text || textStr;

  // Si Google ya nos dio el texto en español (text.text traducido o originalText en es), usarlo.
  if (textLang === 'es' || textLang.startsWith('es-'))     return textStr;
  if (originalLang === 'es' || originalLang.startsWith('es-')) return originalStr;

  // No hay version en español → traducir el original.
  const src = originalLang.split('-')[0] || 'en';
  return translateToSpanish(originalStr, src);
}

// Consulta Google Places (New) por un placeId y devuelve { rating,
// totalReviews, reviews[] } ya normalizado y en español. Lo usan syncTenant
// (cron) y googleReviewsVincular (autoservicio). Tira si el placeId es inválido.
async function fetchPlaceReviews(placeId, apiKey) {
  // X-Goog-Language-Code: 'es' es una pista para Places API pero NO garantiza
  // traduccion — Google es inconsistente. Lo dejamos por si algun placeId lo
  // respeta, pero fallbackeamos a MyMemory abajo para los que no.
  const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    headers: {
      'X-Goog-Api-Key':       apiKey,
      'X-Goog-FieldMask':     'rating,userRatingCount,reviews',
      'X-Goog-Language-Code': 'es',
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Places API ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();

  const rawReviews = Array.isArray(data.reviews) ? data.reviews : [];
  const reviews = await Promise.all(rawReviews.map(async (r) => ({
    author: r.authorAttribution?.displayName || 'Cliente',
    rating: r.rating || 5,
    text:   await pickSpanishText(r),
    time:   localizeTimeString(r.relativePublishTimeDescription || ''),
  })));

  return {
    rating:       typeof data.rating === 'number' ? data.rating : null,
    totalReviews: typeof data.userRatingCount === 'number' ? data.userRatingCount : null,
    reviews,
  };
}

// Consulta Google Places (New) y mergea el resultado en el doc del tenant.
// Devuelve un resumen; si el local no tiene placeId, lo omite sin error.
async function syncTenant(tenantId, apiKey) {
  const ref  = reviewsDocRef(tenantId);
  const snap = await ref.get();
  const placeId = snap.exists ? (snap.data().placeId || '') : '';
  if (!placeId) return { tenantId, skipped: 'sin placeId' };

  const { rating, totalReviews, reviews } = await fetchPlaceReviews(placeId, apiKey);

  await ref.set({
    rating, totalReviews, reviews,
    source:    'google-places',
    updatedAt: Timestamp.now(),
  }, { merge: true }); // merge: conserva el placeId existente

  logger.info(`[GoogleReviews] ${tenantId}: ${rating} · ${totalReviews} opiniones (${reviews.length} reseñas)`);
  return { tenantId, rating, totalReviews, reviews: reviews.length };
}

// ── Cron: una vez al día (las reseñas cambian lento) ───────────────
exports.googleReviewsSyncScheduled = onSchedule(
  { schedule: '0 6 * * *', region: 'us-central1', secrets: [GOOGLE_PLACES_API_KEY] },
  async () => {
    const apiKey  = GOOGLE_PLACES_API_KEY.value();
    const results = await Promise.allSettled(ALL_TENANTS.map(t => syncTenant(t, apiKey)));
    results.forEach((r, i) => {
      if (r.status === 'rejected') logger.error(`[GoogleReviews] Error (${ALL_TENANTS[i]}):`, r.reason);
    });
  }
);

// ── Callable: sync manual (solo superadmin) ────────────────────────
//  Sin tenantId → sincroniza todos los que tengan placeId.
// cors:true → permite llamadas desde custom domains de tenants (yugen.synaptechspa.cl,
// aura.synaptechspa.cl, etc.). Sin esto, el default de v2 solo acepta *.web.app
// y bloquea el preflight con "No Access-Control-Allow-Origin".
exports.googleReviewsSyncManual = onCall(
  { region: 'us-central1', cors: true, secrets: [GOOGLE_PLACES_API_KEY] },
  async (request) => {
    const email = (request.auth?.token?.email || '').toLowerCase();
    if (!BOOTSTRAP_ADMINS.includes(email)) {
      throw new HttpsError('permission-denied', 'Solo el superadmin puede sincronizar reseñas.');
    }
    const apiKey   = GOOGLE_PLACES_API_KEY.value();
    const tenantId = request.data?.tenantId;
    if (tenantId) {
      if (!ALL_TENANTS.includes(tenantId)) throw new HttpsError('invalid-argument', 'tenantId inválido.');
      return syncTenant(tenantId, apiKey);
    }
    const out = [];
    for (const t of ALL_TENANTS) {
      try { out.push(await syncTenant(t, apiKey)); }
      catch (e) { out.push({ tenantId: t, error: String(e) }); }
    }
    return out;
  }
);

// ── Auth: ¿el que llama es admin/jefe de este tenant? ──────────────
//  El panel NO guarda el rol en un custom claim — lo lee de Firestore
//  (barberos/{uid}.rol, ver AuthContext.jsx). Los custom claims (role/
//  tenantId) solo los traen los dueños provisionados por provision-tenant,
//  NO el equipo agregado desde el panel. Por eso autorizamos leyendo el doc
//  de barbero (con fallback a claims + bootstrap), igual que el frontend.
function barberoRef(tenantId, uid) {
  return tenantId === 'elegance'
    ? db.collection('barberos').doc(uid)
    : db.collection('tenants').doc(tenantId).collection('barberos').doc(uid);
}
async function autorizarTenantAdmin(request, tenantId) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Inicia sesión.');
  if (!tenantId)     throw new HttpsError('invalid-argument', 'Falta el local (tenantId).');
  const email = (request.auth.token?.email || '').toLowerCase();
  if (BOOTSTRAP_ADMINS.includes(email)) return; // superadmin
  // Fast path: dueños provisionados traen rol/tenant en el claim.
  const claims = request.auth.token || {};
  if (['admin', 'jefe'].includes(claims.role || '') && (claims.tenantId || '') === tenantId) return;
  // Fuente de verdad: barberos/{uid}.rol (sigue _mainDocId como AuthContext).
  let snap = await barberoRef(tenantId, request.auth.uid).get();
  if (snap.exists && snap.data()._mainDocId) {
    snap = await barberoRef(tenantId, snap.data()._mainDocId).get();
  }
  const rol = snap.exists ? (snap.data().rol || '') : '';
  if (['admin', 'jefe'].includes(rol)) return;
  throw new HttpsError('permission-denied', 'Solo administradores del local.');
}

// ── Callable: buscar el negocio del local por nombre (AUTOSERVICIO) ──
//  El admin del local escribe el nombre de su barbería; devolvemos hasta 6
//  candidatos con su Place ID, nombre, dirección y rating para que elija el
//  suyo. Usa Places API (New) searchText. A diferencia de googleReviewsSyncManual
//  (superadmin), esto lo puede usar el admin/jefe de cualquier local para SU local.
exports.googlePlacesBuscar = onCall(
  { region: 'us-central1', cors: true, secrets: [GOOGLE_PLACES_API_KEY] },
  async (request) => {
    await autorizarTenantAdmin(request, String(request.data?.tenantId || ''));
    const query = String(request.data?.query || '').trim();
    if (query.length < 3) throw new HttpsError('invalid-argument', 'Escribe al menos 3 caracteres.');

    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type':     'application/json',
        'X-Goog-Api-Key':   GOOGLE_PLACES_API_KEY.value(),
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount',
      },
      body: JSON.stringify({ textQuery: query, languageCode: 'es', regionCode: 'CL' }),
    });
    if (!res.ok) {
      const body = await res.text();
      logger.error('[GooglePlacesBuscar] Places API', res.status, body.slice(0, 300));
      throw new HttpsError('internal', 'No pudimos buscar en Google ahora. Reintenta.');
    }
    const data = await res.json();
    const candidatos = (Array.isArray(data.places) ? data.places : []).slice(0, 6).map(p => ({
      placeId:      p.id,
      nombre:       p.displayName?.text || '(sin nombre)',
      direccion:    p.formattedAddress || '',
      rating:       typeof p.rating === 'number' ? p.rating : null,
      totalReviews: typeof p.userRatingCount === 'number' ? p.userRatingCount : null,
    }));
    return { candidatos };
  }
);

// ── Callable: vincular el Place ID elegido al local (AUTOSERVICIO) ──
//  El admin elige un candidato de la búsqueda; guardamos su placeId en
//  settings/googleReviews (o tenants/{tid}/...) y hacemos un sync inicial
//  inmediato (rating + reseñas). Escribe SOLO sobre el tenant del que llama;
//  el superadmin puede pasar un tenantId explícito. Con esto, rate.html
//  redirige a Google y el panel muestra el rating — sin tocar config.js.
exports.googleReviewsVincular = onCall(
  { region: 'us-central1', cors: true, secrets: [GOOGLE_PLACES_API_KEY] },
  async (request) => {
    const tid = String(request.data?.tenantId || '');
    await autorizarTenantAdmin(request, tid);

    const placeId = String(request.data?.placeId || '').trim();
    if (!/^[A-Za-z0-9_-]{10,}$/.test(placeId)) {
      throw new HttpsError('invalid-argument', 'Place ID inválido.');
    }

    const apiKey = GOOGLE_PLACES_API_KEY.value();
    // Validación + sync inicial en un solo fetch: si el placeId no existe, tira.
    let datos;
    try {
      datos = await fetchPlaceReviews(placeId, apiKey);
    } catch (e) {
      logger.error('[GoogleReviewsVincular] fetch', String(e));
      throw new HttpsError('invalid-argument', 'No pudimos verificar ese lugar en Google. Elige otro de la lista.');
    }

    const ref = reviewsDocRef(tid);
    await ref.set({
      placeId,
      rating:       datos.rating,
      totalReviews: datos.totalReviews,
      reviews:      datos.reviews,
      source:       'google-places',
      vinculadoPor: (request.auth.token?.email || '').toLowerCase() || null,
      vinculadoEn:  Timestamp.now(),
      updatedAt:    Timestamp.now(),
    }, { merge: true });

    logger.info(`[GoogleReviewsVincular] ${tid} ← ${placeId} (${datos.rating} · ${datos.totalReviews})`);
    return {
      ok: true, tenantId: tid, placeId,
      rating: datos.rating, totalReviews: datos.totalReviews, reviews: datos.reviews.length,
    };
  }
);
