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
const ALL_TENANTS      = ['elegance', 'ferraza', 'gitana', 'chameleon', 'mapubarbershop', 'deluxeperfumes', 'lumen', 'delnero', 'marcelo_hairdressing', 'aura', 'machos', 'infinity', 'sionbarberia', 'omegastudio', 'memphis'];
const BOOTSTRAP_ADMINS = ['ignaciiio.mate@gmail.com', 'barrazanicolasfabian@gmail.com'];

// Doc de reseñas por tenant (elegance vive en la raíz; el resto bajo tenants/)
function reviewsDocRef(tenantId) {
  return tenantId === 'elegance'
    ? db.collection('settings').doc('googleReviews')
    : db.collection('tenants').doc(tenantId).collection('settings').doc('googleReviews');
}

// Consulta Google Places (New) y mergea el resultado en el doc del tenant.
// Devuelve un resumen; si el local no tiene placeId, lo omite sin error.
async function syncTenant(tenantId, apiKey) {
  const ref  = reviewsDocRef(tenantId);
  const snap = await ref.get();
  const placeId = snap.exists ? (snap.data().placeId || '') : '';
  if (!placeId) return { tenantId, skipped: 'sin placeId' };

  // X-Goog-Language-Code: 'es' pide a Google Places que traduzca automaticamente
  // las reseñas y el relativePublishTimeDescription al español. Google usa su
  // propio sistema de traducción (mismo que Maps) — es gratis y de buena calidad.
  // Si la reseña original ya está en español, la devuelve tal cual sin tocarla.
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

  const reviews = Array.isArray(data.reviews) ? data.reviews.map(r => ({
    author: r.authorAttribution?.displayName || 'Cliente',
    rating: r.rating || 5,
    text:   r.text?.text || r.originalText?.text || '',
    time:   r.relativePublishTimeDescription || '',
  })) : [];

  await ref.set({
    rating:       typeof data.rating === 'number' ? data.rating : null,
    totalReviews: typeof data.userRatingCount === 'number' ? data.userRatingCount : null,
    reviews,
    source:       'google-places',
    updatedAt:    Timestamp.now(),
  }, { merge: true }); // merge: conserva el placeId existente

  logger.info(`[GoogleReviews] ${tenantId}: ${data.rating} · ${data.userRatingCount} opiniones (${reviews.length} reseñas)`);
  return { tenantId, rating: data.rating, totalReviews: data.userRatingCount, reviews: reviews.length };
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
