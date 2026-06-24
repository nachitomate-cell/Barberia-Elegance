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

    try {
      const biosCol = db().collection('bios');

      // count() corre en el server-side de Firestore (1 read facturada por
      // aggregation, no por doc — barato a cualquier escala).
      const [totalSnap, stripeSnap, mpSnap, paidSalesSnap] = await Promise.all([
        biosCol.count().get(),
        biosCol.where('stripeReady', '==', true).count().get(),
        biosCol.where('mpReady', '==', true).count().get(),
        db().collectionGroup('purchases').where('status', '==', 'paid').get(),
      ]);

      const totalsByCurrency = {};
      paidSalesSnap.forEach((d) => {
        const x = d.data() || {};
        const currency = String(x.currency || 'usd').toUpperCase();
        // Stripe: amountTotal en unidad menor. MP: amount en unidad mayor.
        let major = 0;
        if (typeof x.amountTotal === 'number') major = toMajor(x.amountTotal, currency);
        else if (typeof x.amount === 'number') major = Number(x.amount);
        if (major > 0) totalsByCurrency[currency] = (totalsByCurrency[currency] || 0) + major;
      });

      return {
        totalUsers:   totalSnap.data().count,
        stripeActive: stripeSnap.data().count,
        mpActive:     mpSnap.data().count,
        salesCount:   paidSalesSnap.size,
        totalsByCurrency,
      };
    } catch (err) {
      logger.error('[admin-kpis] error', err);
      throw new HttpsError('internal', 'No se pudieron cargar los KPIs.');
    }
  },
);
