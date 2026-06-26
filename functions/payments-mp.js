'use strict';

// functions/payments-mp.js
// ─────────────────────────────────────────────────────────────────────────────
//  BIOO — PAGOS MARKETPLACE con MERCADO PAGO (paywall + propinas)
//
//  Equivalente a payments-stripe.js pero para Chile/LatAm. Modelo marketplace:
//  cada creador conecta SU cuenta de Mercado Pago vía OAuth; el cobro se crea
//  con el access_token del creador y la plataforma retiene `marketplace_fee`.
//  El dinero entra a la cuenta del creador; MP transfiere la comisión a la
//  plataforma automáticamente.
//
//  A diferencia de mercadopago-pago.js (Yūgen → 1 sola cuenta, sin split), aquí
//  hay N creadores, cada uno con su propio token (guardado en bio_users/{uid}).
//
//  Funciones:
//    mpBioConnect        (callable) ← el creador inicia el OAuth; devuelve la URL
//    mpBioOAuthCallback  (HTTP GET) ← MP redirige aquí con ?code&state; canjeamos
//                                      el code por tokens y los guardamos
//    mpBioCheckout       (callable) ← crea la preference (con marketplace_fee) y
//                                      devuelve init_point
//    mpBioWebhook        (HTTP POST)← notificación server-to-server de MP
//    mpBioVerify         (callable) ← tras el pago, valida y entrega la hiddenUrl
//
//  SECRETOS (Secret Manager, setear una vez):
//    firebase functions:secrets:set MP_APP_ID       ← client_id de tu app MP
//    firebase functions:secrets:set MP_APP_SECRET   ← client_secret de tu app MP
//
//  En el panel de MP Developers, registra como Redirect URI EXACTA:
//    https://us-central1-barberia-elegance.cloudfunctions.net/mpBioOAuthCallback
//
//  DEPLOY:
//    firebase deploy --only functions:mpBioConnect,functions:mpBioOAuthCallback,functions:mpBioCheckout,functions:mpBioWebhook,functions:mpBioVerify
// ─────────────────────────────────────────────────────────────────────────────

const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');

const MP_APP_ID     = defineSecret('MP_APP_ID');
const MP_APP_SECRET = defineSecret('MP_APP_SECRET');

const MP_API     = 'https://api.mercadopago.com';
const MP_AUTH    = 'https://auth.mercadopago.com/authorization';
const FN_BASE    = 'https://us-central1-barberia-elegance.cloudfunctions.net';
const REDIRECT_URI = `${FN_BASE}/mpBioOAuthCallback`;
const EDITOR_URL = 'https://bioo.cl/editor';

// Comisión de plataforma (fracción). 0 = sin comisión por ahora; el dinero va
// íntegro al creador. Subir aquí para activar el split (ej. 0.05 = 5%).
const PLATFORM_FEE = 0;

const REGION = 'us-central1';
const CORS = [/bioo\.cl$/, /localhost(:\d+)?$/];

const db = () => admin.firestore();

// ── Llamada a la API de MP ──────────────────────────────────────────────────
async function mpRequest(method, endpoint, token, { body, idempotencyKey, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (idempotencyKey) headers['X-Idempotency-Key'] = idempotencyKey;
  let payload;
  if (form) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    payload = new URLSearchParams(form).toString();
  } else if (body) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(`${MP_API}${endpoint}`, { method, headers, body: payload });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { _raw: text }; }
  return { httpStatus: res.status, json };
}

function findBlockById(data, blockId) {
  const arr = Array.isArray(data.bloques) ? data.bloques
    : (Array.isArray(data.blocks) ? data.blocks : []);
  return arr.find((b) => b && b.id === blockId) || null;
}

// Monto y nombre del cobro según el bloque (precio leído del servidor, NUNCA
// del cliente). CLP es entero (sin decimales).
function resolvePricing(block, amount) {
  if (block.tipo === 'tip') {
    const sel = Number(amount);
    const allowed = Array.isArray(block.amounts) ? block.amounts.map(Number) : [];
    if (!(sel > 0) || allowed.indexOf(sel) < 0) {
      throw new HttpsError('invalid-argument', 'Monto de propina inválido.');
    }
    return { amount: Math.round(sel), title: String(block.label || 'Apoyo').slice(0, 250) };
  }
  const price = Number(block.price);
  if (!(price > 0)) throw new HttpsError('failed-precondition', 'El producto no tiene un precio válido.');
  return { amount: Math.round(price), title: String(block.label || 'Producto digital').slice(0, 250) };
}

// ── Token del creador con auto-refresh ──────────────────────────────────────
//  Los tokens (credenciales bearer de la cuenta MP del creador) viven en
//  bio_mp/{uid}, colección CERRADA al cliente (reglas: read/write if false).
//  bio_users/{uid} solo guarda el flag mpReady (no sensible) para el panel.
//  Si el access_token está por vencer, lo renovamos con el refresh_token.
async function getValidSellerToken(uid) {
  const ref = db().collection('bio_mp').doc(String(uid));
  const snap = await ref.get();
  if (!snap.exists) return null;
  const d = snap.data() || {};
  if (!d.mpAccessToken) return null;

  const expMs = d.mpTokenExpiresAt && d.mpTokenExpiresAt.toMillis ? d.mpTokenExpiresAt.toMillis() : 0;
  const margin = 5 * 60 * 1000; // 5 min de margen
  if (expMs && Date.now() < expMs - margin) return d.mpAccessToken;

  // Vencido (o sin expiración registrada): refrescar.
  if (!d.mpRefreshToken) return d.mpAccessToken; // sin refresh: devolvemos el que hay
  const { httpStatus, json } = await mpRequest('POST', '/oauth/token', null, {
    form: {
      grant_type: 'refresh_token',
      client_id: MP_APP_ID.value(),
      client_secret: MP_APP_SECRET.value(),
      refresh_token: d.mpRefreshToken,
    },
  });
  if (httpStatus >= 300 || !json || !json.access_token) {
    logger.error('[MP-bio] refresh token falló', JSON.stringify(json));
    return d.mpAccessToken; // último recurso: el token viejo
  }
  await ref.set({
    mpAccessToken: json.access_token,
    mpRefreshToken: json.refresh_token || d.mpRefreshToken,
    mpTokenExpiresAt: new admin.firestore.Timestamp(Math.floor(Date.now() / 1000) + (Number(json.expires_in) || 21600), 0),
    mpUpdatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  return json.access_token;
}

// ════════════════════════════════════════════════════════════════════════════
//  1) CONNECT — el creador inicia el OAuth de Mercado Pago
//     Devuelve la URL de autorización. `state` lleva el uid firmado de forma
//     simple (uid:nonce) para recuperarlo en el callback.
// ════════════════════════════════════════════════════════════════════════════
exports.mpBioConnect = onCall(
  { region: REGION, cors: CORS, secrets: [MP_APP_ID] },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
    const uid = request.auth.uid;
    const url = `${MP_AUTH}?client_id=${encodeURIComponent(MP_APP_ID.value())}`
      + `&response_type=code&platform_id=mp`
      + `&state=${encodeURIComponent(uid)}`
      + `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
    return { url };
  },
);

// ════════════════════════════════════════════════════════════════════════════
//  2) OAUTH CALLBACK — MP redirige aquí con ?code & ?state(uid)
//     Canjeamos el code por { access_token, refresh_token, user_id } y los
//     guardamos en bio_users/{uid}. Espejamos el flag público mpReady en bios.
// ════════════════════════════════════════════════════════════════════════════
exports.mpBioOAuthCallback = onRequest(
  { region: REGION, secrets: [MP_APP_ID, MP_APP_SECRET] },
  async (req, res) => {
    const back = (ok) => res.redirect(`${EDITOR_URL}?mp=${ok ? 'connected' : 'error'}`);
    try {
      const code = req.query.code;
      const uid = req.query.state;
      if (!code || !uid) return back(false);

      const { httpStatus, json } = await mpRequest('POST', '/oauth/token', null, {
        form: {
          grant_type: 'authorization_code',
          client_id: MP_APP_ID.value(),
          client_secret: MP_APP_SECRET.value(),
          code: String(code),
          redirect_uri: REDIRECT_URI,
        },
      });
      if (httpStatus >= 300 || !json || !json.access_token) {
        logger.error('[MP-bio] oauth token falló', JSON.stringify(json));
        return back(false);
      }

      // Tokens sensibles → colección cerrada (solo Admin SDK).
      await db().collection('bio_mp').doc(String(uid)).set({
        mpUserId: json.user_id != null ? String(json.user_id) : null,
        mpAccessToken: json.access_token,
        mpRefreshToken: json.refresh_token || null,
        mpTokenExpiresAt: new admin.firestore.Timestamp(Math.floor(Date.now() / 1000) + (Number(json.expires_in) || 21600), 0),
        mpUpdatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      // Flag no sensible → bio_users (lo lee el panel del creador en vivo).
      const userRef = db().collection('bio_users').doc(String(uid));
      await userRef.set({ mpReady: true, mpUpdatedAt: FieldValue.serverTimestamp() }, { merge: true });

      // Espejo público del flag en el bio del creador, para que la página
      // pública sepa que puede cobrar por MP.
      const u = (await userRef.get()).data() || {};
      if (u.username) {
        await db().collection('bios').doc(String(u.username)).set({ mpReady: true }, { merge: true });
      }
      return back(true);
    } catch (e) {
      logger.error('[MP-bio] callback error', e);
      return back(false);
    }
  },
);

// ════════════════════════════════════════════════════════════════════════════
//  3) CHECKOUT — crea la preference con el token del creador + marketplace_fee
//     El precio se lee del servidor. external_reference = orderId (registramos
//     una compra pendiente para mapear el pago de vuelta sin parsear strings).
// ════════════════════════════════════════════════════════════════════════════
exports.mpBioCheckout = onCall(
  { region: REGION, cors: CORS, secrets: [MP_APP_ID, MP_APP_SECRET] },
  async (request) => {
    const { blockId, username, amount } = request.data || {};
    if (!blockId || !username) throw new HttpsError('invalid-argument', 'Faltan blockId o username.');

    const snap = await db().collection('bios').doc(String(username)).get();
    if (!snap.exists) throw new HttpsError('not-found', 'Perfil no encontrado.');
    const data = snap.data() || {};
    const block = findBlockById(data, blockId);
    if (!block) throw new HttpsError('not-found', 'Bloque no encontrado.');
    if (block.tipo !== 'paywall' && block.tipo !== 'tip') {
      throw new HttpsError('failed-precondition', 'Este bloque no admite pagos.');
    }

    const sellerToken = data.uid ? await getValidSellerToken(data.uid) : null;
    if (!sellerToken) throw new HttpsError('failed-precondition', 'El creador aún no conectó Mercado Pago.');

    const { amount: unitPrice, title } = resolvePricing(block, amount);
    const currency = String(block.currency || 'CLP').toUpperCase();
    const fee = PLATFORM_FEE > 0 ? Math.round(unitPrice * PLATFORM_FEE) : 0;

    // Compra pendiente: nos permite recuperar username/blockId desde el pago.
    const orderRef = db().collection('bios').doc(String(username)).collection('purchases').doc();
    const orderId = orderRef.id;
    await orderRef.set({
      orderId, blockId: String(blockId), tipo: String(block.tipo),
      provider: 'mercadopago', status: 'pending',
      amount: unitPrice, currency,
      createdAt: FieldValue.serverTimestamp(),
    });

    const base = `https://bioo.cl/${username}`;
    const preference = {
      items: [{
        title, quantity: 1, unit_price: unitPrice, currency_id: currency,
        description: block.subtitulo ? String(block.subtitulo).slice(0, 250) : undefined,
      }],
      external_reference: orderId,
      metadata: { username: String(username), blockId: String(blockId), tipo: String(block.tipo), orderId },
      // u= y order= permiten al webhook saber QUÉ creador (token) consultar.
      notification_url: `${FN_BASE}/mpBioWebhook?u=${encodeURIComponent(username)}`,
      back_urls: {
        success: `${base}?mp_order=${orderId}`,
        failure: `${base}?mp_order=${orderId}&mp_status=failure`,
        pending: `${base}?mp_order=${orderId}&mp_status=pending`,
      },
      auto_return: 'approved',
      binary_mode: true,
      ...(fee > 0 ? { marketplace_fee: fee } : {}),
    };

    const { httpStatus, json } = await mpRequest('POST', '/checkout/preferences', sellerToken, { body: preference });
    if (httpStatus >= 300 || !json || !json.init_point) {
      logger.error('[MP-bio] crear preference falló', JSON.stringify(json));
      throw new HttpsError('internal', 'No se pudo iniciar el pago.');
    }
    await orderRef.set({ mpPreferenceId: json.id || null }, { merge: true });

    return { url: json.init_point, orderId, provider: 'mercadopago' };
  },
);

// ── Consulta el pago real y, si está aprobado, marca la compra como pagada ────
async function settleOrder(username, orderId, payment) {
  const ref = db().collection('bios').doc(String(username)).collection('purchases').doc(String(orderId));
  const snap = await ref.get();
  if (!snap.exists) { logger.warn(`[MP-bio] orden ${orderId} no existe`); return false; }
  const order = snap.data() || {};
  if (order.status === 'paid') return true; // idempotente

  await ref.set({
    status: 'paid',
    mpPaymentId: payment && payment.id != null ? String(payment.id) : null,
    buyerEmail: (payment && payment.payer && payment.payer.email) || null,
    paidAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  // Tip Goal — sumar al contador del bloque (MP ya da unidad mayor).
  if (order.tipo === 'tip' && order.blockId && Number(order.amount) > 0) {
    try {
      const major = Number(order.amount);
      // Privado (panel) + público (doc raíz para u.html).
      await Promise.all([
        db().collection('bios').doc(String(username))
          .collection('blockStats').doc(String(order.blockId))
          .set({
            tipTotal: FieldValue.increment(major),
            tipCurrency: (order.currency || 'clp').toLowerCase(),
            lastTipAt: FieldValue.serverTimestamp(),
          }, { merge: true }),
        db().collection('bios').doc(String(username))
          .set({ tipTotals: { [String(order.blockId)]: FieldValue.increment(major) } }, { merge: true }),
      ]);
    } catch (e) {
      logger.warn(`[MP-bio] no se pudo sumar tipTotal ${orderId}:`, e.message);
    }
  }

  logger.info(`[MP-bio] ✓ orden pagada ${username}/${orderId}`);
  return true;
}

async function processPayment(username, paymentId) {
  const sellerToken = await sellerTokenForUsername(username);
  if (!sellerToken) { logger.error('[MP-bio] sin token de creador', username); return false; }
  const { json: pay } = await mpRequest('GET', `/v1/payments/${paymentId}`, sellerToken);
  if (!pay || !pay.external_reference) { logger.error('[MP-bio] pago sin external_reference', paymentId); return false; }
  if (pay.status !== 'approved') {
    logger.info(`[MP-bio] pago no aprobado ${paymentId} status=${pay.status}`);
    return false;
  }
  return settleOrder(username, pay.external_reference, pay);
}

async function sellerTokenForUsername(username) {
  const bio = await db().collection('bios').doc(String(username)).get();
  const uid = bio.exists ? bio.data().uid : null;
  return uid ? getValidSellerToken(uid) : null;
}

// ════════════════════════════════════════════════════════════════════════════
//  4) WEBHOOK — notificación de MP. notification_url trae ?u=username, así
//     sabemos qué token de creador usar para consultar el pago real.
// ════════════════════════════════════════════════════════════════════════════
exports.mpBioWebhook = onRequest(
  { region: REGION, secrets: [MP_APP_ID, MP_APP_SECRET] },
  async (req, res) => {
    try {
      const q = req.query || {};
      const body = req.body || {};
      const username = q.u;
      const type = q.type || q.topic || body.type || '';
      if (type && !String(type).includes('payment')) return res.status(200).send('ignored');
      const paymentId = q['data.id'] || q.id || (body.data && body.data.id) || null;
      if (!paymentId || !username) return res.status(200).send('no-data');

      await processPayment(String(username), String(paymentId));
      return res.status(200).send('OK');
    } catch (e) {
      logger.error('[MP-bio] webhook error', e);
      return res.status(500).send('error');
    }
  },
);

// ════════════════════════════════════════════════════════════════════════════
//  5) VERIFY — el cliente vuelve del pago y pide desbloquear.
//     Si el webhook ya marcó la orden pagada, devolvemos la hiddenUrl. Como
//     respaldo (webhook atrasado), buscamos el pago en MP por external_reference.
// ════════════════════════════════════════════════════════════════════════════
exports.mpBioVerify = onCall(
  { region: REGION, cors: CORS, secrets: [MP_APP_ID, MP_APP_SECRET] },
  async (request) => {
    const { username, orderId } = request.data || {};
    if (!username || !orderId) throw new HttpsError('invalid-argument', 'Faltan username u orderId.');

    const ref = db().collection('bios').doc(String(username)).collection('purchases').doc(String(orderId));
    let snap = await ref.get();
    if (!snap.exists) throw new HttpsError('not-found', 'Orden no encontrada.');
    let order = snap.data() || {};

    // Respaldo: si aún figura pendiente, consultamos MP por external_reference.
    if (order.status !== 'paid') {
      const sellerToken = await sellerTokenForUsername(username);
      if (sellerToken) {
        const { json } = await mpRequest('GET', `/v1/payments/search?external_reference=${encodeURIComponent(orderId)}`, sellerToken);
        const results = (json && Array.isArray(json.results)) ? json.results : [];
        const approved = results.find((p) => p.status === 'approved');
        if (approved) { await settleOrder(username, orderId, approved); snap = await ref.get(); order = snap.data() || {}; }
      }
    }
    if (order.status !== 'paid') throw new HttpsError('failed-precondition', 'El pago aún no está confirmado.');

    // Las propinas no entregan recurso; solo el paywall lee su secreto.
    let hiddenUrl = '';
    if (order.tipo !== 'tip') {
      const secret = await db().collection('bios').doc(String(username)).collection('secrets').doc(String(order.blockId)).get();
      if (!secret.exists) throw new HttpsError('not-found', 'El recurso ya no está disponible.');
      hiddenUrl = (secret.data() || {}).hiddenUrl || '';
      await ref.set({ deliveredAt: FieldValue.serverTimestamp() }, { merge: true });
    }
    return { hiddenUrl, kind: order.tipo === 'tip' ? 'tip' : 'paywall' };
  },
);
