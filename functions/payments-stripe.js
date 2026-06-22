// functions/payments-stripe.js
// ─────────────────────────────────────────────────────────────────────────────
//  PAGOS DEL PAYWALL (Stripe Checkout) — Cloud Functions v2 callables
//
//  createStripeCheckout: crea la sesión de pago. El precio SIEMPRE se lee del
//    servidor (bios/{username}.bloques) — nunca se confía en el cliente.
//  verifyUnlock: tras el pago, valida la sesión con Stripe, lee la hiddenUrl de
//    la subcolección privada /secrets con el Admin SDK y la entrega. Registra la
//    venta en /purchases para idempotencia / anti-abuso.
//
//  Secreto: STRIPE_SECRET_KEY (Secret Manager, v2). Ver instrucciones de deploy.
// ─────────────────────────────────────────────────────────────────────────────

const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');

const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY');
const STRIPE_WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET');

// Monedas sin decimales en Stripe (el monto va en la unidad entera, no en centavos).
const ZERO_DECIMAL = new Set(['clp', 'jpy', 'krw', 'vnd', 'pyg', 'isk']);

function stripeClient() {
  // require perezoso: el módulo carga aunque 'stripe' aún no esté instalado en local.
  const Stripe = require('stripe');
  return new Stripe(STRIPE_SECRET_KEY.value());
}

function findBlockById(data, blockId) {
  const arr = Array.isArray(data.bloques) ? data.bloques
    : (Array.isArray(data.blocks) ? data.blocks : []);
  return arr.find((b) => b && b.id === blockId) || null;
}

// Resuelve la cuenta de Stripe Connect del creador: bios.uid → bio_users/{uid}.stripeAccountId.
async function getCreatorAccountId(bioData) {
  const uid = bioData && bioData.uid;
  if (!uid) return null;
  const u = await admin.firestore().collection('bio_users').doc(String(uid)).get();
  return (u.exists && u.data().stripeAccountId) || null;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Stripe Connect — onboarding del creador (cuenta express).
//  Crea (o reutiliza) la cuenta express vinculada al email del usuario, guarda
//  el stripeAccountId en bio_users/{uid} (privado) y devuelve un link de
//  onboarding para que complete sus datos bancarios.
// ─────────────────────────────────────────────────────────────────────────────
exports.onboardStripeUser = onCall(
  { region: 'us-central1', secrets: [STRIPE_SECRET_KEY] },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
    const uid = request.auth.uid;
    const email = (request.auth.token && request.auth.token.email) || undefined;
    const origin = (request.data && typeof request.data.origin === 'string' && /^https?:\/\//i.test(request.data.origin))
      ? request.data.origin.replace(/\/+$/, '')
      : 'https://bioo.cl/editor';

    const stripe = stripeClient();
    const userRef = admin.firestore().collection('bio_users').doc(uid);
    const userSnap = await userRef.get();
    let accountId = userSnap.exists ? userSnap.data().stripeAccountId : null;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email,
        capabilities: { transfers: { requested: true }, card_payments: { requested: true } },
      });
      accountId = account.id;
      await userRef.set({ stripeAccountId: accountId, stripeReady: false, stripeUpdatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}?stripe=refresh`,
      return_url: `${origin}?stripe=connected`,
      type: 'account_onboarding',
    });

    return { url: link.url, accountId };
  },
);

exports.createStripeCheckout = onCall(
  { region: 'us-central1', secrets: [STRIPE_SECRET_KEY] },
  async (request) => {
    const { blockId, username, origin, amount } = request.data || {};
    if (!blockId || !username) throw new HttpsError('invalid-argument', 'Faltan blockId o username.');

    // Los datos del cobro se leen del servidor (fuente de verdad).
    const snap = await admin.firestore().collection('bios').doc(String(username)).get();
    if (!snap.exists) throw new HttpsError('not-found', 'Perfil no encontrado.');
    const data = snap.data() || {};
    const block = findBlockById(data, blockId);
    if (!block) throw new HttpsError('not-found', 'Bloque no encontrado.');
    if (block.tipo !== 'paywall' && block.tipo !== 'tip') {
      throw new HttpsError('failed-precondition', 'Este bloque no admite pagos.');
    }

    const currency = String(block.currency || 'USD').toLowerCase();

    // Monto (unidad mayor) y nombre del producto según el tipo de bloque.
    let amountMajor;
    let productName;
    if (block.tipo === 'tip') {
      // Cobro dinámico: el monto DEBE existir en el array `amounts` del bloque
      // (evita que se altere el monto desde la consola del navegador).
      const sel = Number(amount);
      const allowed = Array.isArray(block.amounts) ? block.amounts.map(Number) : [];
      if (!(sel > 0) || allowed.indexOf(sel) < 0) {
        throw new HttpsError('invalid-argument', 'Monto de propina inválido.');
      }
      amountMajor = sel;
      productName = String(block.label || 'Apoyo').slice(0, 250);
    } else {
      const price = Number(block.price);
      if (!(price > 0)) throw new HttpsError('failed-precondition', 'El producto no tiene un precio válido.');
      amountMajor = price;
      productName = String(block.label || 'Producto digital').slice(0, 250);
    }
    const unitAmount = ZERO_DECIMAL.has(currency) ? Math.round(amountMajor) : Math.round(amountMajor * 100);

    // El creador debe tener su cuenta de Stripe Connect lista para recibir el pago.
    const accountId = await getCreatorAccountId(data);
    if (!accountId) throw new HttpsError('failed-precondition', 'El creador aún no conectó su cuenta de pagos.');

    const base = (typeof origin === 'string' && /^https?:\/\//i.test(origin))
      ? origin.replace(/\/+$/, '')
      : `https://bioo.cl/${username}`;

    const productData = { name: productName };
    if (block.subtitulo) productData.description = String(block.subtitulo).slice(0, 500);

    // Destination charge: el dinero va a la cuenta del creador; la plataforma
    // retiene un 5% como application fee.
    const feeAmount = Math.round(unitAmount * 0.05);

    const stripe = stripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ quantity: 1, price_data: { currency, unit_amount: unitAmount, product_data: productData } }],
      payment_intent_data: {
        application_fee_amount: feeAmount,
        transfer_data: { destination: accountId },
      },
      success_url: `${base}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}?canceled=1`,
      metadata: { username: String(username), blockId: String(blockId), tipo: String(block.tipo) },
    });

    return { url: session.url, sessionId: session.id };
  },
);

exports.verifyUnlock = onCall(
  { region: 'us-central1', secrets: [STRIPE_SECRET_KEY] },
  async (request) => {
    const { sessionId } = request.data || {};
    if (!sessionId) throw new HttpsError('invalid-argument', 'Falta sessionId.');

    const stripe = stripeClient();
    let session;
    try {
      session = await stripe.checkout.sessions.retrieve(String(sessionId));
    } catch (e) {
      throw new HttpsError('not-found', 'Sesión de pago no encontrada.');
    }

    const paid = session && (session.payment_status === 'paid' || session.status === 'complete');
    if (!paid) throw new HttpsError('failed-precondition', 'El pago aún no está confirmado.');

    const username = session.metadata && session.metadata.username;
    const blockId = session.metadata && session.metadata.blockId;
    const tipo = (session.metadata && session.metadata.tipo) || 'paywall';
    if (!username || !blockId) throw new HttpsError('failed-precondition', 'La sesión no tiene metadata válida.');

    // Las propinas no entregan recurso; solo el paywall lee su secreto.
    let hiddenUrl = '';
    if (tipo !== 'tip') {
      const secretSnap = await admin.firestore()
        .collection('bios').doc(username).collection('secrets').doc(blockId).get();
      if (!secretSnap.exists) throw new HttpsError('not-found', 'El recurso ya no está disponible.');
      hiddenUrl = (secretSnap.data() || {}).hiddenUrl || '';
    }

    // Registro de entrega (idempotente): evita reprocesar y deja traza de la venta.
    // merge: si el webhook ya creó el doc, no lo pisamos de más (mismos datos).
    await admin.firestore()
      .collection('bios').doc(username).collection('purchases').doc(String(sessionId))
      .set({
        sessionId: String(sessionId),
        blockId,
        tipo,
        amountTotal: session.amount_total != null ? session.amount_total : null,
        currency: session.currency || null,
        buyerEmail: (session.customer_details && session.customer_details.email) || null,
        status: 'paid',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        deliveredAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

    return { hiddenUrl, kind: tipo === 'tip' ? 'tip' : 'paywall' };
  },
);

// ─────────────────────────────────────────────────────────────────────────────
//  Webhook de Stripe — garantía de entrega (server-to-server).
//  Verifica la firma con STRIPE_WEBHOOK_SECRET y registra la venta al recibir
//  'checkout.session.completed', aunque el comprador no vuelva a la página.
//  Usa Admin SDK (ignora reglas). Responde 200 rápido (Stripe reintenta si falla).
// ─────────────────────────────────────────────────────────────────────────────
exports.stripeWebhook = onRequest(
  { region: 'us-central1', secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET] },
  async (req, res) => {
    const Stripe = require('stripe');
    const stripe = new Stripe(STRIPE_SECRET_KEY.value());

    let event;
    try {
      // req.rawBody (Buffer) es necesario para validar la firma criptográfica.
      const sig = req.headers['stripe-signature'];
      event = stripe.webhooks.constructEvent(req.rawBody, sig, STRIPE_WEBHOOK_SECRET.value());
    } catch (err) {
      console.error('Webhook firma inválida:', err && err.message);
      res.status(400).send('invalid-signature');
      return;
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object || {};
      const username = session.metadata && session.metadata.username;
      const blockId = session.metadata && session.metadata.blockId;
      if (username && blockId && session.id) {
        try {
          await admin.firestore()
            .collection('bios').doc(String(username)).collection('purchases').doc(String(session.id))
            .set({
              sessionId: String(session.id),
              blockId: String(blockId),
              amountTotal: session.amount_total != null ? session.amount_total : null,
              currency: session.currency || null,
              buyerEmail: (session.customer_details && session.customer_details.email) || null,
              tipo: (session.metadata && session.metadata.tipo) || 'paywall',
              status: 'paid',
              source: 'webhook',
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
        } catch (e) {
          console.error('Webhook: error guardando purchase:', e);
          res.status(500).send('store-error'); // Stripe reintentará
          return;
        }
      }
    }

    // Estado real de la cuenta Connect del creador.
    if (event.type === 'account.updated') {
      const account = event.data.object || {};
      const ready = !!account.charges_enabled;
      try {
        const qs = await admin.firestore()
          .collection('bio_users').where('stripeAccountId', '==', account.id).limit(1).get();
        if (!qs.empty) {
          const userDoc = qs.docs[0];
          await userDoc.ref.set({
            stripeReady: ready,
            stripeUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
          // Espejo público del flag (boolean no sensible) para el panel admin.
          const username = userDoc.data().username;
          if (username) {
            await admin.firestore().collection('bios').doc(String(username))
              .set({ stripeReady: ready }, { merge: true });
          }
        }
      } catch (e) {
        console.error('Webhook account.updated: error guardando estado:', e);
        res.status(500).send('store-error'); // Stripe reintentará
        return;
      }
    }

    res.status(200).json({ received: true });
  },
);
