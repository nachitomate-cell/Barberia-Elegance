'use strict';

// functions/payments-mp-platform.js
// ─────────────────────────────────────────────────────────────────────────────
//  BIOO · COBROS SINGLE-SELLER DE PLATAFORMA (SynapTech)
//
//  A diferencia de payments-mp.js (marketplace OAuth — cada creador conecta
//  SU MP y los cobros van a él), acá la PLATAFORMA cobra al creador a SU
//  propia cuenta SynapTech con un access_token estático.
//
//  Producto inicial: "Quitar marca de agua" — pago único $4.990 CLP.
//
//  Funciones:
//    mpBioPlatformCheckout   (callable) ← creador inicia compra, devuelve init_point
//    mpBioPlatformWebhook    (HTTP POST) ← MP notifica; se aplican los grants
//    mpBioPlatformVerify     (callable) ← fallback si el webhook se atrasa
//
//  SECRETO:
//    firebase functions:secrets:set MP_PLATFORM_ACCESS_TOKEN
//      ← Access Token de PRODUCCIÓN de la app MP de SynapTech
//        (panel MP → tu app → Credenciales de producción → Access Token)
//
//  WEBHOOK en panel MP:
//    https://us-central1-barberia-elegance.cloudfunctions.net/mpBioPlatformWebhook
//    evento: payment
// ─────────────────────────────────────────────────────────────────────────────

const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');

const MP_PLATFORM_ACCESS_TOKEN = defineSecret('MP_PLATFORM_ACCESS_TOKEN');

const MP_API     = 'https://api.mercadopago.com';
const FN_BASE    = 'https://us-central1-barberia-elegance.cloudfunctions.net';
const EDITOR_URL = 'https://bioo.cl/editor';

// Catálogo central. Una sola fuente de verdad para precio (cobro) y grants
// (qué se desbloquea en el doc del usuario al pagar).
const SKUS = {
  removeWatermark: {
    id: 'removeWatermark',
    title: 'Quitar marca de agua — bioo',
    price: 4990,
    currency: 'CLP',
    grants: { proRemoveWatermark: true },
  },
};

const REGION = 'us-central1';
const CORS = [/bioo\.cl$/, /localhost(:\d+)?$/];
const db = () => admin.firestore();

async function mpFetch(method, endpoint, token, body) {
  const headers = { Authorization: `Bearer ${token}` };
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${MP_API}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { _raw: text }; }
  return { httpStatus: res.status, json };
}

// ════════════════════════════════════════════════════════════════════════════
//  CHECKOUT — crea preference con el token de plataforma (cobro va a SynapTech)
//  Idempotente: si el usuario ya compró el feature, no se vuelve a cobrar.
// ════════════════════════════════════════════════════════════════════════════
exports.mpBioPlatformCheckout = onCall(
  { region: REGION, cors: CORS, secrets: [MP_PLATFORM_ACCESS_TOKEN] },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
    const uid = request.auth.uid;
    const { sku } = request.data || {};
    const product = SKUS[String(sku)];
    if (!product) throw new HttpsError('invalid-argument', 'SKU inválido.');

    const userSnap = await db().collection('bio_users').doc(uid).get();
    const userData = userSnap.exists ? (userSnap.data() || {}) : {};
    if (product.grants.proRemoveWatermark && userData.proRemoveWatermark === true) {
      throw new HttpsError('already-exists', 'Ya tienes esta función activada.');
    }

    // Orden pending para reconciliar con webhook por external_reference.
    const orderRef = db().collection('bio_users').doc(uid).collection('platform_orders').doc();
    const orderId = orderRef.id;
    await orderRef.set({
      orderId, uid, sku: product.id,
      provider: 'mercadopago', status: 'pending',
      amount: product.price, currency: product.currency,
      createdAt: FieldValue.serverTimestamp(),
    });

    const preference = {
      items: [{
        title: product.title,
        quantity: 1,
        unit_price: product.price,
        currency_id: product.currency,
      }],
      external_reference: orderId,
      metadata: { uid, sku: product.id, orderId },
      notification_url: `${FN_BASE}/mpBioPlatformWebhook`,
      back_urls: {
        success: `${EDITOR_URL}?platform_order=${orderId}&status=ok`,
        failure: `${EDITOR_URL}?platform_order=${orderId}&status=fail`,
        pending: `${EDITOR_URL}?platform_order=${orderId}&status=pending`,
      },
      auto_return: 'approved',
      binary_mode: true,
    };

    const { httpStatus, json } = await mpFetch(
      'POST',
      '/checkout/preferences',
      MP_PLATFORM_ACCESS_TOKEN.value(),
      preference,
    );
    if (httpStatus >= 300 || !json || !json.init_point) {
      logger.error('[MP-platform] preference falló', JSON.stringify(json));
      throw new HttpsError('internal', 'No se pudo iniciar el pago.');
    }
    await orderRef.set({ mpPreferenceId: json.id || null }, { merge: true });
    return { url: json.init_point, orderId };
  },
);

// Marca orden pagada y aplica grants. Idempotente.
async function settlePlatformOrder(uid, orderId, payment) {
  const ref = db().collection('bio_users').doc(uid).collection('platform_orders').doc(orderId);
  const snap = await ref.get();
  if (!snap.exists) { logger.warn(`[MP-platform] orden ${orderId} no existe`); return false; }
  const order = snap.data() || {};
  if (order.status === 'paid') return true;

  const product = SKUS[order.sku];

  await ref.set({
    status: 'paid',
    mpPaymentId: payment && payment.id != null ? String(payment.id) : null,
    buyerEmail: (payment && payment.payer && payment.payer.email) || null,
    paidAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  if (product && product.grants) {
    const grants = { ...product.grants, updatedAt: FieldValue.serverTimestamp() };
    await db().collection('bio_users').doc(uid).set(grants, { merge: true });

    // Espejar flag en /bios/{username} para que la página pública (lectura
    // pública sin auth) pueda decidir si oculta la marca de agua.
    const userSnap = await db().collection('bio_users').doc(uid).get();
    const username = userSnap.exists ? (userSnap.data() || {}).username : null;
    if (username) {
      const publicGrants = {};
      if (product.grants.proRemoveWatermark) publicGrants.proRemoveWatermark = true;
      if (Object.keys(publicGrants).length) {
        await db().collection('bios').doc(String(username)).set(publicGrants, { merge: true });
      }
    }
  }

  logger.info(`[MP-platform] ✓ orden pagada ${uid}/${orderId} sku=${order.sku}`);
  return true;
}

// ════════════════════════════════════════════════════════════════════════════
//  WEBHOOK — MP avisa del pago; consultamos /v1/payments/{id} para verificar
// ════════════════════════════════════════════════════════════════════════════
exports.mpBioPlatformWebhook = onRequest(
  { region: REGION, secrets: [MP_PLATFORM_ACCESS_TOKEN] },
  async (req, res) => {
    try {
      const q = req.query || {};
      const body = req.body || {};
      const type = q.type || q.topic || body.type || '';
      if (type && !String(type).includes('payment')) return res.status(200).send('ignored');
      const paymentId = q['data.id'] || q.id || (body.data && body.data.id) || null;
      if (!paymentId) return res.status(200).send('no-data');

      const { json: pay } = await mpFetch(
        'GET',
        `/v1/payments/${paymentId}`,
        MP_PLATFORM_ACCESS_TOKEN.value(),
      );
      if (!pay || !pay.external_reference) return res.status(200).send('no-ref');
      if (pay.status !== 'approved') return res.status(200).send('not-approved');

      // metadata.uid se setea en checkout. Fallback: buscar la orden por
      // external_reference vía collectionGroup.
      let uid = (pay.metadata && pay.metadata.uid) || null;
      if (!uid) {
        const q2 = await db().collectionGroup('platform_orders')
          .where('orderId', '==', String(pay.external_reference))
          .limit(1)
          .get();
        if (!q2.empty) uid = q2.docs[0].ref.parent.parent.id;
      }
      if (!uid) {
        logger.error('[MP-platform] no se pudo resolver uid', pay.external_reference);
        return res.status(200).send('no-uid');
      }

      await settlePlatformOrder(uid, String(pay.external_reference), pay);
      return res.status(200).send('OK');
    } catch (e) {
      logger.error('[MP-platform] webhook error', e);
      return res.status(500).send('error');
    }
  },
);

// ════════════════════════════════════════════════════════════════════════════
//  VERIFY — cliente vuelve del pago y consulta estado (respaldo al webhook)
// ════════════════════════════════════════════════════════════════════════════
exports.mpBioPlatformVerify = onCall(
  { region: REGION, cors: CORS, secrets: [MP_PLATFORM_ACCESS_TOKEN] },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
    const uid = request.auth.uid;
    const { orderId } = request.data || {};
    if (!orderId) throw new HttpsError('invalid-argument', 'Falta orderId.');

    const ref = db().collection('bio_users').doc(uid).collection('platform_orders').doc(String(orderId));
    let snap = await ref.get();
    if (!snap.exists) throw new HttpsError('not-found', 'Orden no encontrada.');
    let order = snap.data() || {};

    if (order.status !== 'paid') {
      const { json } = await mpFetch(
        'GET',
        `/v1/payments/search?external_reference=${encodeURIComponent(orderId)}`,
        MP_PLATFORM_ACCESS_TOKEN.value(),
      );
      const results = (json && Array.isArray(json.results)) ? json.results : [];
      const approved = results.find((p) => p.status === 'approved');
      if (approved) {
        await settlePlatformOrder(uid, String(orderId), approved);
        snap = await ref.get();
        order = snap.data() || {};
      }
    }
    return { status: order.status, sku: order.sku };
  },
);

exports._SKUS = SKUS;
