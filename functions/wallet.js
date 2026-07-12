'use strict';

// functions/wallet.js
// ─────────────────────────────────────────────────────────────────
//  MÓDULO WALLETS — tarjetas de fidelidad Google Wallet (multi-tenant)
//
//  Exports:
//    walletStampImg          — HTTP: dibuja las estampas (heroImage). Público, sin secret.
//    walletProvisionarClase  — callable admin: crea/actualiza el LoyaltyClass del tenant.
//    walletGenerarPase       — callable cliente: crea su LoyaltyObject y devuelve el "Save" URL.
//    walletSyncSelloElegance — trigger users/{uid}: sincroniza el pase al cambiar sellos.
//    walletSyncSelloTenant   — trigger tenants/{tid}/users/{uid}: idem multi-tenant.
//
//  Fuente de verdad = Firestore (users/{uid}.sellos*). El pase es espejo.
//  Config del tenant en {tid}/configuracion/wallet. Secret: WALLET_SA_KEY
//  (JSON completo de la service account wallet-issuer@barberia-elegance).
//
//  DEPLOY:
//    firebase deploy --only functions:walletStampImg,functions:walletProvisionarClase,\
//      functions:walletGenerarPase,functions:walletSyncSelloElegance,functions:walletSyncSelloTenant
// ─────────────────────────────────────────────────────────────────

const { onRequest, onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { defineSecret } = require('firebase-functions/params');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');

const core = require('./lib/wallet-core');
const { renderStampStrip } = require('./lib/wallet-render');

const db = admin.firestore();
const WALLET_SA_KEY = defineSecret('WALLET_SA_KEY');
const SUPERADMINS = ['ignaciiio.mate@gmail.com'];

// ── Rutas por tenant (mismo criterio que sello-automatico / push-cliente) ──
const premiosCol   = (tid) => db.collection(tid === 'elegance' ? 'premios' : `tenants/${tid}/premios`);
const rangosRef    = (tid) => db.doc(tid === 'elegance' ? 'configuracion/rangos'  : `tenants/${tid}/configuracion/rangos`);
const walletCfgRef = (tid) => db.doc(tid === 'elegance' ? 'configuracion/wallet'  : `tenants/${tid}/configuracion/wallet`);
const userRef      = (tid, uid) => db.doc(tid === 'elegance' ? `users/${uid}` : `tenants/${tid}/users/${uid}`);
// Flag PAGADO (add-on): _billing/{tid}.walletActivo. Solo SynapTech (bootstrap)
// puede escribirlo (ver firestore.rules), el staff del tenant solo lo lee.
const billingRef   = (tid) => db.doc(`_billing/${tid}`);

function saKey() {
  return JSON.parse(WALLET_SA_KEY.value());
}

// ¿El local pagó el módulo Wallet? Gate de monetización, server-side.
async function walletActivo(tid) {
  try {
    const snap = await billingRef(tid).get();
    return snap.exists ? snap.data().walletActivo === true : false;
  } catch (_) { return false; }
}

async function leerPremios(tid) {
  try {
    const snap = await premiosCol(tid).get();
    return snap.docs.map((d) => d.data());
  } catch (_) { return []; }
}
async function leerRangosCfg(tid) {
  try {
    const snap = await rangosRef(tid).get();
    return snap.exists ? (snap.data().rangos || []) : [];
  } catch (_) { return []; }
}
async function leerWalletCfg(tid) {
  try {
    const snap = await walletCfgRef(tid).get();
    return snap.exists ? (snap.data() || {}) : {};
  } catch (_) { return {}; }
}

// ═══════════════════════════════════════════════════════════════
//  1) HTTP — imagen de estampas (heroImage). Estado en la URL.
//     ?f=<filled>&t=<target>&c=<hex sin #>. Público, cacheable.
// ═══════════════════════════════════════════════════════════════
exports.walletStampImg = onRequest({ region: 'us-central1', cors: true }, (req, res) => {
  try {
    const filled = parseInt(req.query.f, 10) || 0;
    const target = parseInt(req.query.t, 10) || 10;
    const accent = '#' + String(req.query.c || 'c9a84c').replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
    const png = renderStampStrip({ filled, target, accent });
    // Estado inmutable por URL → cache larga (Google Wallet cachea por su lado).
    res.set('Cache-Control', 'public, max-age=86400');
    res.set('Content-Type', 'image/png');
    res.status(200).send(png);
  } catch (e) {
    logger.error('[Wallet img] error:', e);
    res.status(500).send('render error');
  }
});

// ═══════════════════════════════════════════════════════════════
//  2) CALLABLE (admin) — provisiona/actualiza el LoyaltyClass del tenant
// ═══════════════════════════════════════════════════════════════
exports.walletProvisionarClase = onCall(
  { region: 'us-central1', cors: true, secrets: [WALLET_SA_KEY] },
  async (request) => {
    const callerEmail  = (request.auth?.token?.email || '').toLowerCase();
    const callerRole   = request.auth?.token?.role;
    const callerTenant = request.auth?.token?.tenantId;
    const { tenantId, config } = request.data || {};

    if (!tenantId || typeof tenantId !== 'string') {
      throw new HttpsError('invalid-argument', 'tenantId requerido.');
    }
    const isSuperadmin  = SUPERADMINS.includes(callerEmail);
    const isTenantAdmin = (callerRole === 'admin' || callerRole === 'jefe') && callerTenant === tenantId;
    if (!isSuperadmin && !isTenantAdmin) {
      throw new HttpsError('permission-denied', 'Solo el admin del local puede configurar el wallet.');
    }
    // Gate de add-on: sin pago no se puede provisionar (superadmin exento).
    if (!isSuperadmin && !(await walletActivo(tenantId))) {
      throw new HttpsError('failed-precondition', 'El módulo Wallet no está activo para este local. Contáctanos para activarlo.');
    }

    const cfg = config && typeof config === 'object' ? config : {};
    // Persistir config (branding, geo, color, enabled) para sync e imágenes.
    try {
      await walletCfgRef(tenantId).set(
        { ...cfg, updatedAt: admin.firestore.Timestamp.now() },
        { merge: true },
      );
    } catch (e) {
      logger.warn(`[Wallet] no se pudo guardar config (${tenantId}): ${e.message}`);
    }

    try {
      const cls = core.buildClass(tenantId, cfg);
      const result = await core.upsertClass(saKey(), cls);
      logger.info(`[Wallet] clase ${cls.id} ${result} by ${callerEmail}`);
      return { ok: true, classId: cls.id, result };
    } catch (e) {
      const detail = e.response?.data ? JSON.stringify(e.response.data) : e.message;
      logger.error(`[Wallet] provisionar clase (${tenantId}) falló: ${detail}`);
      throw new HttpsError('internal', 'No se pudo provisionar la tarjeta. Revisa los datos e intenta de nuevo.');
    }
  },
);

// ═══════════════════════════════════════════════════════════════
//  2b) CALLABLE (superadmin) — activa/desactiva el add-on por tenant
//      Add-on manual a la mensualidad: SynapTech lo enciende al cobrar.
//      Escribe _billing/{tid}.walletActivo (protegido por rules).
// ═══════════════════════════════════════════════════════════════
exports.walletActivarTenant = onCall({ region: 'us-central1', cors: true }, async (request) => {
  const callerEmail = (request.auth?.token?.email || '').toLowerCase();
  if (!SUPERADMINS.includes(callerEmail)) {
    throw new HttpsError('permission-denied', 'Solo SynapTech puede activar el módulo.');
  }
  const { tenantId, activo } = request.data || {};
  if (!tenantId || typeof tenantId !== 'string') {
    throw new HttpsError('invalid-argument', 'tenantId requerido.');
  }
  const on = activo !== false;
  await billingRef(tenantId).set(
    {
      walletActivo: on,
      walletDesde: on ? admin.firestore.Timestamp.now() : admin.firestore.FieldValue.delete(),
    },
    { merge: true },
  );
  // Al desactivar, apagamos el toggle del tenant para ocultar el botón al cliente.
  if (!on) {
    try { await walletCfgRef(tenantId).set({ enabled: false }, { merge: true }); } catch (_) {}
  }
  logger.info(`[Wallet] add-on tenant ${tenantId} walletActivo=${on} by ${callerEmail}`);
  return { ok: true, tenantId, walletActivo: on };
});

// ═══════════════════════════════════════════════════════════════
//  3) CALLABLE (cliente) — crea su LoyaltyObject y devuelve el Save URL
// ═══════════════════════════════════════════════════════════════
exports.walletGenerarPase = onCall(
  { region: 'us-central1', cors: true, secrets: [WALLET_SA_KEY] },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
    const tenantId = (request.data?.tenantId || 'elegance').toString();

    const [uSnap, premios, rangosCfg, cfg] = await Promise.all([
      userRef(tenantId, uid).get(),
      leerPremios(tenantId),
      leerRangosCfg(tenantId),
      leerWalletCfg(tenantId),
    ]);
    if (!(await walletActivo(tenantId))) {
      throw new HttpsError('failed-precondition', 'El wallet no está disponible en este local.');
    }
    if (cfg.enabled === false) {
      throw new HttpsError('failed-precondition', 'El wallet no está activo para este local.');
    }
    const u = uSnap.exists ? uSnap.data() : {};
    const disp = Number(u.sellosDisponibles ?? u.stamps ?? 0);
    const hist = Number(u.sellosHistoricos ?? disp);
    const accent = cfg.accent || '#c9a84c';
    const { filled, target } = core.stampState(disp, premios);
    const rango = core.rangoNombre(hist, rangosCfg);
    const accountName = u.nombre || u.displayName || 'Cliente';

    try {
      const key = saKey();
      // Asegurar la clase (idempotente) por si el admin solo activó sin provisionar.
      await core.upsertClass(key, core.buildClass(tenantId, cfg));

      const obj = core.buildObject(tenantId, uid, { accountName, filled, target, rango, accent });
      await core.upsertObject(key, obj);

      // Guardar el vínculo en el user doc → habilita el sync automático.
      await userRef(tenantId, uid).set(
        { walletObjectId: obj.id, walletSavedAt: admin.firestore.Timestamp.now() },
        { merge: true },
      );

      const origin = request.rawRequest?.headers?.origin;
      const saveUrl = core.buildSaveUrl(key, {
        loyaltyObjects: [{ id: obj.id, classId: obj.classId }],
        origins: origin ? [origin] : undefined,
      });
      logger.info(`[Wallet] pase ${obj.id} generado (${filled}/${target}, ${rango})`);
      return { ok: true, saveUrl, objectId: obj.id };
    } catch (e) {
      const detail = e.response?.data ? JSON.stringify(e.response.data) : e.message;
      logger.error(`[Wallet] generar pase (${tenantId}/${uid}) falló: ${detail}`);
      throw new HttpsError('internal', 'No pudimos crear tu tarjeta. Reintenta en un momento.');
    }
  },
);

// ═══════════════════════════════════════════════════════════════
//  4) SYNC — al cambiar los sellos, actualiza el pase (espejo push-cliente)
// ═══════════════════════════════════════════════════════════════
async function syncPase(tenantId, uid, before, after) {
  const objectId = after?.walletObjectId;
  if (!objectId) return; // el cliente aún no guardó su tarjeta

  const dispAntes = Number(before?.sellosDisponibles ?? before?.stamps ?? 0);
  const dispDesp  = Number(after?.sellosDisponibles  ?? after?.stamps  ?? 0);
  const histAntes = Number(before?.sellosHistoricos ?? 0);
  const histDesp  = Number(after?.sellosHistoricos  ?? 0);
  if (dispAntes === dispDesp && histAntes === histDesp) return; // nada relevante cambió

  const [premios, rangosCfg, cfg] = await Promise.all([
    leerPremios(tenantId),
    leerRangosCfg(tenantId),
    leerWalletCfg(tenantId),
  ]);
  const accent = cfg.accent || '#c9a84c';
  const { filled, target } = core.stampState(dispDesp, premios);
  const rango = core.rangoNombre(histDesp, rangosCfg);

  const key = saKey();
  await core.patchObject(key, objectId, {
    loyaltyPoints: { label: 'Sellos', balance: { string: `${filled} / ${target}` } },
    heroImage: { sourceUri: { uri: core.stampImageUrl({ filled, target, accent }) } },
    textModulesData: [{ id: 'rango', header: 'Rango', body: rango }],
  });

  // Hito: desbloqueó un premio nuevo → notificación automática al pase.
  if (dispDesp > dispAntes) {
    const nuevo = core.premioDesbloqueado(dispAntes, dispDesp, premios);
    if (nuevo) {
      await core.addMessage(key, objectId, {
        header: '🎁 ¡Premio disponible!',
        body: `Ya puedes canjear: ${nuevo.nombre}.`,
        id: `premio_${target}_${Date.now()}`.slice(0, 40),
      });
    }
  }
  logger.info(`[Wallet sync] ${objectId}: ${filled}/${target} (${rango})`);
}

exports.walletSyncSelloElegance = onDocumentWritten(
  { document: 'users/{uid}', region: 'us-central1', secrets: [WALLET_SA_KEY] },
  async (event) => {
    const after = event.data?.after?.data();
    if (!after) return null;
    try { await syncPase('elegance', event.params.uid, event.data?.before?.data(), after); }
    catch (e) { logger.error(`[Wallet sync] elegance/${event.params.uid}:`, e.response?.data || e.message); }
    return null;
  },
);

exports.walletSyncSelloTenant = onDocumentWritten(
  { document: 'tenants/{tid}/users/{uid}', region: 'us-central1', secrets: [WALLET_SA_KEY] },
  async (event) => {
    const after = event.data?.after?.data();
    if (!after) return null;
    try { await syncPase(event.params.tid, event.params.uid, event.data?.before?.data(), after); }
    catch (e) { logger.error(`[Wallet sync] ${event.params.tid}/${event.params.uid}:`, e.response?.data || e.message); }
    return null;
  },
);
