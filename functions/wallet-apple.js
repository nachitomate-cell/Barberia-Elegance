'use strict';

// functions/wallet-apple.js
// ─────────────────────────────────────────────────────────────────
//  MÓDULO APPLE WALLET — tarjetas de fidelidad (multi-tenant)
//  Espejo de wallet.js (Google). Ver lib/wallet-apple-core.js.
//
//  Exports:
//    walletAppleGenerarLink — callable cliente: mint de link corto (15 min)
//                             para descargar el pase desde Safari.
//    walletApplePase        — HTTP: valida el link, firma y sirve el .pkpass.
//    walletAppleWs          — HTTP: web service del spec de Apple (registro
//                             de dispositivos, seriales, pase fresco, log).
//    notificarCambioPase    — helper para wallet.js: bump + push APNs.
//
//  Firestore:
//    apple_wallet_links/{token}          — links de descarga efímeros
//    apple_wallet_passes/{serial}        — {tenantId, uid, token, updatedAt}
//    apple_wallet_regs/{deviceId_serial} — dispositivos registrados (APNs)
//    users/{uid}.appleWalletSerial       — habilita el sync automático
//
//  Secrets: APPLE_PASS_CERT + APPLE_PASS_KEY (PEM del Pass Type ID).
//  El WWDR G4 (público) vive en assets/AppleWWDRCAG4.pem.
//
//  DEPLOY (requiere los secrets creados):
//    firebase deploy --only functions:walletAppleGenerarLink,\
//      functions:walletApplePase,functions:walletAppleWs
// ─────────────────────────────────────────────────────────────────

const { onRequest, onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const core = require('./lib/wallet-core'); // stampState / rangoNombre (compartidos)
const apple = require('./lib/wallet-apple-core');

const db = admin.firestore();
const APPLE_PASS_CERT = defineSecret('APPLE_PASS_CERT');
const APPLE_PASS_KEY = defineSecret('APPLE_PASS_KEY');
// Para que wallet.js pueda enlazar los mismos secrets en sus triggers.
const APPLE_SECRETS = [APPLE_PASS_CERT, APPLE_PASS_KEY];

const PASE_URL = 'https://us-central1-barberia-elegance.cloudfunctions.net/walletApplePase';
const WWDR_PEM = fs.readFileSync(path.join(__dirname, 'assets', 'AppleWWDRCAG4.pem'), 'utf8');

// ── Rutas por tenant (espejo exacto de wallet.js) ─────────────────
const premiosCol   = (tid) => db.collection(tid === 'elegance' ? 'premios' : `tenants/${tid}/premios`);
const rangosRef    = (tid) => db.doc(tid === 'elegance' ? 'configuracion/rangos' : `tenants/${tid}/configuracion/rangos`);
const walletCfgRef = (tid) => db.doc(tid === 'elegance' ? 'configuracion/wallet' : `tenants/${tid}/configuracion/wallet`);
const userRef      = (tid, uid) => db.doc(tid === 'elegance' ? `users/${uid}` : `tenants/${tid}/users/${uid}`);
const billingRef   = (tid) => db.doc(`_billing/${tid}`);

const linksCol = db.collection('apple_wallet_links');
const pasesCol = db.collection('apple_wallet_passes');
const regsCol  = db.collection('apple_wallet_regs');

const LINK_TTL_MS = 15 * 60 * 1000;

function certs() {
  return { wwdr: WWDR_PEM, signerCert: APPLE_PASS_CERT.value(), signerKey: APPLE_PASS_KEY.value() };
}

async function walletActivo(tid) {
  try {
    const snap = await billingRef(tid).get();
    return snap.exists ? snap.data().walletActivo === true : false;
  } catch (_) { return false; }
}

async function leerContexto(tid) {
  const [premiosSnap, rangosSnap, cfgSnap] = await Promise.all([
    premiosCol(tid).get().catch(() => null),
    rangosRef(tid).get().catch(() => null),
    walletCfgRef(tid).get().catch(() => null),
  ]);
  return {
    premios: premiosSnap ? premiosSnap.docs.map((d) => d.data()) : [],
    rangosCfg: rangosSnap && rangosSnap.exists ? (rangosSnap.data().rangos || []) : [],
    cfg: cfgSnap && cfgSnap.exists ? (cfgSnap.data() || {}) : {},
  };
}

// Comparación de tokens sin fugas de timing (largos distintos incluidos).
function tokenValido(recibido, esperado) {
  if (!recibido || !esperado) return false;
  const a = crypto.createHash('sha256').update(String(recibido)).digest();
  const b = crypto.createHash('sha256').update(String(esperado)).digest();
  return crypto.timingSafeEqual(a, b);
}

function tokenDeHeader(req) {
  const m = /^ApplePass\s+(.+)$/i.exec(req.get('authorization') || '');
  return m ? m[1].trim() : null;
}

// ── Generación compartida del .pkpass (link de descarga + WS GET) ──
//  NO bumpea updatedAt (eso es exclusivo del sync de sellos): Apple
//  usa updatedAt para saber qué seriales cambiaron.
async function generarPkpass(tenantId, uid) {
  const [uSnap, ctx] = await Promise.all([userRef(tenantId, uid).get(), leerContexto(tenantId)]);
  const u = uSnap.exists ? uSnap.data() : {};
  const disp = Number(u.sellosDisponibles ?? u.stamps ?? 0);
  const hist = Number(u.sellosHistoricos ?? disp);
  const { filled, target } = core.stampState(disp, ctx.premios);
  const rango = core.rangoNombre(hist, ctx.rangosCfg);
  const accountName = u.nombre || u.displayName || 'Cliente';

  const serial = apple.serialFor(tenantId, uid);
  const paseRef = pasesCol.doc(serial);
  const paseSnap = await paseRef.get();
  const authToken = (paseSnap.exists && paseSnap.data().token) || apple.nuevoAuthToken();
  const meta = { tenantId, uid, token: authToken };
  if (!paseSnap.exists) meta.updatedAt = admin.firestore.Timestamp.now();
  await paseRef.set(meta, { merge: true });

  const buf = await apple.crearPkpass({
    certs: certs(),
    uid,
    serial,
    authToken,
    datos: { accountName, filled, target, rango, cfg: ctx.cfg },
  });
  const updatedAt = paseSnap.exists ? paseSnap.data().updatedAt : meta.updatedAt;
  return { buf, serial, updatedAt };
}

// ═══════════════════════════════════════════════════════════════
//  1) CALLABLE (cliente) — mint del link de descarga (espejo del
//     Save URL de Google). El front navega a la URL y Safari abre
//     la hoja "Agregar a Apple Wallet".
// ═══════════════════════════════════════════════════════════════
exports.walletAppleGenerarLink = onCall({ region: 'us-central1', cors: true }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
  const tenantId = (request.data?.tenantId || 'elegance').toString();

  if (!apple.configurado()) {
    throw new HttpsError('failed-precondition', 'Apple Wallet está en preparación para este local.');
  }
  if (!(await walletActivo(tenantId))) {
    throw new HttpsError('failed-precondition', 'El wallet no está disponible en este local.');
  }
  const { cfg } = await leerContexto(tenantId);
  if (cfg.enabled === false) {
    throw new HttpsError('failed-precondition', 'El wallet no está activo para este local.');
  }

  const token = crypto.randomBytes(24).toString('base64url');
  await linksCol.doc(token).set({
    tenantId,
    uid,
    exp: admin.firestore.Timestamp.fromMillis(Date.now() + LINK_TTL_MS),
    createdAt: admin.firestore.Timestamp.now(),
  });
  logger.info(`[Wallet Apple] link generado (${tenantId}/${uid})`);
  return { ok: true, url: `${PASE_URL}?t=${token}` };
});

// ═══════════════════════════════════════════════════════════════
//  2) HTTP — sirve el .pkpass firmado. Safari/iOS abre Wallet al
//     recibir el content-type. Link multi-uso dentro de su TTL
//     (Wallet puede pedir el archivo más de una vez).
// ═══════════════════════════════════════════════════════════════
exports.walletApplePase = onRequest(
  { region: 'us-central1', cors: true, secrets: [APPLE_PASS_CERT, APPLE_PASS_KEY] },
  async (req, res) => {
    try {
      const t = String(req.query.t || '');
      if (!t) return res.status(400).send('Falta el enlace.');
      const linkSnap = await linksCol.doc(t).get();
      if (!linkSnap.exists) return res.status(404).send('Enlace inválido.');
      const { tenantId, uid, exp } = linkSnap.data();
      if (!exp || exp.toMillis() < Date.now()) {
        linkSnap.ref.delete().catch(() => {});
        return res.status(410).send('El enlace expiró. Genera uno nuevo desde tu perfil.');
      }

      const { buf, serial } = await generarPkpass(tenantId, uid);
      // Vínculo en el user doc → habilita el sync automático (espejo
      // de walletObjectId en Google).
      await userRef(tenantId, uid).set(
        { appleWalletSerial: serial, appleWalletSavedAt: admin.firestore.Timestamp.now() },
        { merge: true },
      );

      logger.info(`[Wallet Apple] pase ${serial} servido`);
      res.set('Content-Type', 'application/vnd.apple.pkpass');
      res.set('Content-Disposition', 'attachment; filename="tarjeta.pkpass"');
      res.set('Cache-Control', 'no-store');
      return res.status(200).send(buf);
    } catch (e) {
      logger.error('[Wallet Apple] servir pase falló:', e.message);
      return res.status(500).send('No pudimos generar tu tarjeta. Reintenta en un momento.');
    }
  },
);

// ═══════════════════════════════════════════════════════════════
//  3) HTTP — Web service del spec PassKit. Apple llama:
//    POST   /v1/devices/{dev}/registrations/{ptid}/{serial}  registro
//    GET    /v1/devices/{dev}/registrations/{ptid}?passesUpdatedSince=
//    GET    /v1/passes/{ptid}/{serial}                       pase fresco
//    DELETE /v1/devices/{dev}/registrations/{ptid}/{serial}  baja
//    POST   /v1/log                                          errores
//  Auth: header "Authorization: ApplePass {authenticationToken}".
// ═══════════════════════════════════════════════════════════════
exports.walletAppleWs = onRequest(
  { region: 'us-central1', secrets: [APPLE_PASS_CERT, APPLE_PASS_KEY] },
  async (req, res) => {
    try {
      const seg = (req.path || '').split('/').filter(Boolean);
      if (seg[0] !== 'v1') return res.status(404).send('not found');

      // ── Log de errores que reporta iOS ──
      if (seg[1] === 'log' && req.method === 'POST') {
        logger.warn('[Wallet Apple WS] logs de Apple:', JSON.stringify(req.body?.logs || req.body || {}));
        return res.status(200).send('ok');
      }

      // ── GET /v1/passes/{ptid}/{serial} → .pkpass regenerado ──
      if (seg[1] === 'passes' && seg.length === 4 && req.method === 'GET') {
        const [, , ptid, serial] = seg;
        if (ptid !== apple.PASS_TYPE_ID) return res.status(404).send('not found');
        const paseSnap = await pasesCol.doc(serial).get();
        if (!paseSnap.exists) return res.status(404).send('not found');
        const pase = paseSnap.data();
        if (!tokenValido(tokenDeHeader(req), pase.token)) return res.status(401).send('unauthorized');

        const lastModMs = pase.updatedAt ? pase.updatedAt.toMillis() : Date.now();
        const ims = Date.parse(req.get('if-modified-since') || '');
        // HTTP tiene precisión de segundos → comparamos truncando.
        if (Number.isFinite(ims) && Math.floor(lastModMs / 1000) <= Math.floor(ims / 1000)) {
          return res.status(304).send('');
        }
        const { buf } = await generarPkpass(pase.tenantId, pase.uid);
        res.set('Content-Type', 'application/vnd.apple.pkpass');
        res.set('Last-Modified', new Date(lastModMs).toUTCString());
        return res.status(200).send(buf);
      }

      // ── /v1/devices/{dev}/registrations/{ptid}[/{serial}] ──
      if (seg[1] === 'devices' && seg[3] === 'registrations') {
        const deviceId = seg[2];
        const ptid = seg[4];
        if (ptid !== apple.PASS_TYPE_ID) return res.status(404).send('not found');

        // Registro / baja de un dispositivo para un pase.
        if (seg.length === 6) {
          const serial = seg[5];
          const paseSnap = await pasesCol.doc(serial).get();
          if (!paseSnap.exists) return res.status(404).send('not found');
          const pase = paseSnap.data();
          if (!tokenValido(tokenDeHeader(req), pase.token)) return res.status(401).send('unauthorized');
          const regRef = regsCol.doc(`${deviceId}_${serial}`);

          if (req.method === 'POST') {
            const pushToken = String(req.body?.pushToken || '');
            if (!pushToken) return res.status(400).send('pushToken requerido');
            const existed = (await regRef.get()).exists;
            await regRef.set({
              deviceLibraryId: deviceId,
              serial,
              tenantId: pase.tenantId,
              uid: pase.uid,
              pushToken,
              createdAt: admin.firestore.Timestamp.now(),
            }, { merge: true });
            logger.info(`[Wallet Apple WS] registro ${serial} (${existed ? 'refresh' : 'nuevo'})`);
            return res.status(existed ? 200 : 201).send('ok');
          }
          if (req.method === 'DELETE') {
            await regRef.delete();
            logger.info(`[Wallet Apple WS] baja ${deviceId}/${serial}`);
            return res.status(200).send('ok');
          }
          return res.status(405).send('method not allowed');
        }

        // Seriales con cambios para un dispositivo (sin auth, por spec).
        if (seg.length === 5 && req.method === 'GET') {
          const regsSnap = await regsCol.where('deviceLibraryId', '==', deviceId).get();
          if (regsSnap.empty) return res.status(404).send('not found');
          const since = Number(req.query.passesUpdatedSince || 0) || 0;

          const pases = await Promise.all(
            regsSnap.docs.map((d) => pasesCol.doc(d.data().serial).get()),
          );
          let lastUpdated = 0;
          const serialNumbers = [];
          for (const p of pases) {
            if (!p.exists) continue;
            const ms = p.data().updatedAt ? p.data().updatedAt.toMillis() : 0;
            if (ms > since) {
              serialNumbers.push(p.id);
              lastUpdated = Math.max(lastUpdated, ms);
            }
          }
          if (!serialNumbers.length) return res.status(204).send('');
          return res.status(200).json({ serialNumbers, lastUpdated: String(lastUpdated) });
        }
      }

      return res.status(404).send('not found');
    } catch (e) {
      logger.error('[Wallet Apple WS] error:', e.message);
      return res.status(500).send('error');
    }
  },
);

// ═══════════════════════════════════════════════════════════════
//  4) SYNC (helper para wallet.js) — al cambiar sellos/rango:
//     bump de updatedAt + APNs vacío a los dispositivos registrados.
//     iOS viene solo a buscar el pase y notifica (changeMessage).
// ═══════════════════════════════════════════════════════════════
async function notificarCambioPase(serial) {
  if (!apple.configurado()) return { ok: 0, fail: 0, skipped: true };
  await pasesCol.doc(serial).set({ updatedAt: admin.firestore.Timestamp.now() }, { merge: true });
  const regsSnap = await regsCol.where('serial', '==', serial).get();
  const pushTokens = regsSnap.docs.map((d) => d.data().pushToken).filter(Boolean);
  if (!pushTokens.length) return { ok: 0, fail: 0 };
  const res = await apple.pushApns({
    certPem: APPLE_PASS_CERT.value(),
    keyPem: APPLE_PASS_KEY.value(),
    pushTokens,
  });
  logger.info(`[Wallet Apple] APNs ${serial}: ok=${res.ok} fail=${res.fail}`);
  return res;
}

exports.notificarCambioPase = notificarCambioPase;
exports.APPLE_SECRETS = APPLE_SECRETS;
