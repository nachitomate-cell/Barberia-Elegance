'use strict';

// functions/bioo-admin-kpis.js
// ─────────────────────────────────────────────────────────────────────────────
//  BIOO · KPIs para el panel /admin (Command Center).
//
//  Callable: loadAdminKpis  (sin payload)
//    Verifica que el caller sea admin (bios/{username}.isAdmin === true), igual
//    que fetchIsAdmin del cliente. Después agrega con Admin SDK (bypass reglas):
//      - totalUsers       = count(bios)
//      - stripeActive     = count(bios where stripeReady == true)
//      - mpActive         = count(bios where mpReady == true)
//      - salesCount       = count(collectionGroup(purchases) where status == 'paid')
//      - totalsByCurrency = { CLP: 12500, USD: 25.5, ... }  (en unidad mayor)
//
//  NOTA sobre unidades:
//    - Stripe guarda `amountTotal` en unidad MENOR (centavos). Convertimos
//      según ZERO_DECIMAL.
//    - MP guarda `amount` en unidad MAYOR (CLP es entero, no hay centavos).
//    Si en el futuro este loop crece (>10k purchases), pasar a agregación
//    incremental con onDocumentUpdated/Created sobre purchases.
//
//  DEPLOY:
//    firebase deploy --only functions:loadAdminKpis
// ─────────────────────────────────────────────────────────────────────────────

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger }             = require('firebase-functions');
const admin                  = require('firebase-admin');

const db = () => admin.firestore();

// Monedas sin centavos (Stripe las maneja en unidad mayor directamente, no /100).
const ZERO_DECIMAL = new Set(['clp', 'jpy', 'krw', 'vnd', 'pyg', 'isk']);

function toMajor(amountMinor, currency) {
  if (amountMinor == null) return 0;
  const c = String(currency || '').toLowerCase();
  return ZERO_DECIMAL.has(c) ? Number(amountMinor) : Number(amountMinor) / 100;
}

async function assertCallerIsAdmin(uid) {
  const us = await db().collection('bio_users').doc(String(uid)).get();
  const username = us.exists ? us.data().username : null;
  if (!username) throw new HttpsError('permission-denied', 'No autorizado.');
  const bio = await db().collection('bios').doc(String(username)).get();
  const isAdmin = bio.exists && bio.data().isAdmin === true;
  if (!isAdmin) throw new HttpsError('permission-denied', 'No autorizado.');
}

exports.loadAdminKpis = onCall(
  { region: 'us-central1', cors: [/bioo\.cl$/, /localhost(:\d+)?$/] },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
    await assertCallerIsAdmin(request.auth.uid);

    const biosCol = db().collection('bios');

    // count() corre en el server-side de Firestore (1 read facturada por
    // aggregation, no por doc — barato a cualquier escala).
    let totalUsers = 0, stripeActive = 0, mpActive = 0;
    try {
      const [totalSnap, stripeSnap, mpSnap] = await Promise.all([
        biosCol.count().get(),
        biosCol.where('stripeReady', '==', true).count().get(),
        biosCol.where('mpReady', '==', true).count().get(),
      ]);
      totalUsers   = totalSnap.data().count;
      stripeActive = stripeSnap.data().count;
      mpActive     = mpSnap.data().count;
    } catch (err) {
      logger.error('[admin-kpis] count() error', err.message);
    }

    // GMV puede fallar si el índice de collectionGroup aún no está listo o si
    // no hay datos. Aislado: devolvemos {} en vez de tirar todo el panel.
    let totalsByCurrency = {};
    let salesCount = 0;
    try {
      const paidSalesSnap = await db().collectionGroup('purchases')
        .where('status', '==', 'paid').get();
      salesCount = paidSalesSnap.size;
      paidSalesSnap.forEach((d) => {
        const x = d.data() || {};
        const currency = String(x.currency || 'usd').toUpperCase();
        // Stripe: amountTotal en unidad menor. MP: amount en unidad mayor.
        let major = 0;
        if (typeof x.amountTotal === 'number') major = toMajor(x.amountTotal, currency);
        else if (typeof x.amount === 'number') major = Number(x.amount);
        if (major > 0) totalsByCurrency[currency] = (totalsByCurrency[currency] || 0) + major;
      });
    } catch (err) {
      logger.warn('[admin-kpis] purchases query no disponible (¿índice construyéndose?):', err.message);
    }

    return { totalUsers, stripeActive, mpActive, salesCount, totalsByCurrency };
  },
);
