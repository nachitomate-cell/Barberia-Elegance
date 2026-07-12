'use strict';

// functions/lib/wallet-core.js
// ─────────────────────────────────────────────────────────────────
//  NÚCLEO GOOGLE WALLET (multi-tenant)
//
//  Issuer único de SynapTech: 3388000000023126417. Todas las clases y
//  objetos cuelgan de él:
//    LoyaltyClass  = {issuer}.{tenantId}           (branding + geo-push)
//    LoyaltyObject = {issuer}.{tenantId}_{uid}      (sellos del cliente)
//
//  Autenticación: service account wallet-issuer@barberia-elegance
//  (secret WALLET_SA_KEY, JSON completo). Scope wallet_object.issuer.
//
//  El pase es un ESPEJO de Firestore (users/{uid}.sellos*). Este módulo
//  no lee Firestore: recibe los datos ya resueltos y habla con la API.
// ─────────────────────────────────────────────────────────────────

const { GoogleAuth } = require('google-auth-library');
const jwt = require('jsonwebtoken');

const ISSUER_ID = '3388000000023126417';
const API = 'https://walletobjects.googleapis.com/walletobjects/v1';
const SCOPE = 'https://www.googleapis.com/auth/wallet_object.issuer';

// Endpoint HTTP que dibuja las estampas (ver walletStampImg en wallet.js).
// El estado va en la URL → Google Wallet cachea cada combinación.
const IMG_BASE = `https://us-central1-barberia-elegance.cloudfunctions.net/walletStampImg`;

// Los IDs de Wallet solo admiten [A-Za-z0-9._-]. Saneamos tenant/uid.
function safe(s) {
  return String(s || '').replace(/[^A-Za-z0-9]/g, '');
}

function classIdFor(tenantId) {
  return `${ISSUER_ID}.${safe(tenantId)}`;
}

function objectIdFor(tenantId, uid) {
  return `${ISSUER_ID}.${safe(tenantId)}_${safe(uid)}`;
}

// ── Auth client (cacheado por client_email) ───────────────────────
const _authCache = new Map();
async function authClient(saKey) {
  const key = saKey.client_email;
  if (_authCache.has(key)) return _authCache.get(key);
  const auth = new GoogleAuth({
    credentials: { client_email: saKey.client_email, private_key: saKey.private_key },
    scopes: [SCOPE],
  });
  const client = await auth.getClient();
  _authCache.set(key, client);
  return client;
}

// ── URL de la imagen de estampas para un estado dado ──────────────
function stampImageUrl({ filled, target, accent }) {
  const c = String(accent || '#c9a84c').replace('#', '');
  return `${IMG_BASE}?f=${Math.max(0, filled | 0)}&t=${Math.max(1, target | 0)}&c=${encodeURIComponent(c)}`;
}

// ── Estado de estampas (espejo de leerProxPremio en push-cliente.js) ──
//  Devuelve {filled, target} para el saldo actual: la tarjeta se llena
//  hacia el PRÓXIMO premio no alcanzado (o el mayor si ya los superó).
function stampState(sellosDisp, premios) {
  const disp = Math.max(0, Number(sellosDisp) || 0);
  const arr = (premios || [])
    .map((p) => Number(p.costoSellos))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);
  if (!arr.length) return { filled: Math.min(disp, 10), target: 10 };
  const proximo = arr.find((c) => disp < c);
  const target = proximo != null ? proximo : arr[arr.length - 1];
  return { filled: Math.min(disp, target), target };
}

// ── ¿Cruzó a un premio nuevo? (espejo de desbloqueoNuevo) ─────────
function premioDesbloqueado(dispAntes, dispDesp, premios) {
  const arr = (premios || [])
    .filter((p) => Number(p.costoSellos) > 0)
    .sort((a, b) => Number(a.costoSellos) - Number(b.costoSellos));
  const ganadoDe = (n) => [...arr].reverse().find((p) => n >= Number(p.costoSellos)) || null;
  const antes = ganadoDe(dispAntes);
  const desp = ganadoDe(dispDesp);
  if (desp && (!antes || antes.nombre !== desp.nombre)) return desp;
  return null;
}

// ── Rango por sellos históricos (espejo de calcTier / _rangoIdDe) ──
const RANGO_DEFAULTS = { silver: 'Silver', gold: 'Gold', platinum: 'Platinum' };
function rangoNombre(historicos, rangosCfg) {
  const h = Number(historicos) || 0;
  const id = h >= 25 ? 'platinum' : h >= 10 ? 'gold' : 'silver';
  const custom = (rangosCfg || []).find((r) => r.id === id);
  return (custom && custom.nombre) || RANGO_DEFAULTS[id];
}

// ── Constructores de recursos ─────────────────────────────────────
function buildClass(tenantId, cfg = {}) {
  const cls = {
    id: classIdFor(tenantId),
    issuerName: cfg.issuerName || 'SynapTech',
    programName: cfg.programName || 'Club de Fidelidad',
    reviewStatus: 'UNDER_REVIEW',
    hexBackgroundColor: (cfg.bg || '#0a0a0a'),
  };
  if (cfg.logoUrl) cls.programLogo = { sourceUri: { uri: cfg.logoUrl } };
  const lat = Number(cfg.location && cfg.location.lat);
  const lng = Number(cfg.location && cfg.location.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    cls.locations = [{ latitude: lat, longitude: lng }];
  }
  return cls;
}

function buildObject(tenantId, uid, { accountName, filled, target, rango, accent }) {
  const obj = {
    id: objectIdFor(tenantId, uid),
    classId: classIdFor(tenantId),
    state: 'ACTIVE',
    accountId: String(uid),
    accountName: accountName || 'Cliente',
    loyaltyPoints: { label: 'Sellos', balance: { string: `${filled} / ${target}` } },
    heroImage: { sourceUri: { uri: stampImageUrl({ filled, target, accent }) } },
  };
  if (rango) obj.textModulesData = [{ id: 'rango', header: 'Rango', body: rango }];
  return obj;
}

// ── CRUD contra la API (upsert idempotente por GET→PUT / POST) ─────
async function _upsert(saKey, resource, kind) {
  const client = await authClient(saKey);
  const url = `${API}/${kind}/${resource.id}`;
  try {
    await client.request({ url, method: 'GET' });
    await client.request({ url, method: 'PUT', data: resource });
    return 'updated';
  } catch (e) {
    if (e.response && e.response.status === 404) {
      await client.request({ url: `${API}/${kind}`, method: 'POST', data: resource });
      return 'created';
    }
    throw e;
  }
}

const upsertClass = (saKey, cls) => _upsert(saKey, cls, 'loyaltyClass');
const upsertObject = (saKey, obj) => _upsert(saKey, obj, 'loyaltyObject');

// PATCH parcial del objeto (sync de sellos/rango/heroImage).
async function patchObject(saKey, objectId, partial) {
  const client = await authClient(saKey);
  await client.request({
    url: `${API}/loyaltyObject/${objectId}`,
    method: 'PATCH',
    data: partial,
  });
}

// Mensaje/notificación al pase (hitos). Google lo empuja a los dispositivos
// que tengan el pase guardado.
async function addMessage(saKey, objectId, { header, body, id }) {
  const client = await authClient(saKey);
  await client.request({
    url: `${API}/loyaltyObject/${objectId}/addMessage`,
    method: 'POST',
    data: { message: { header, body, id: id || `m_${header}`.slice(0, 40), messageType: 'TEXT' } },
  });
}

// ── JWT "Save to Google Wallet" (RS256 con la private key de la SA) ──
function buildSaveUrl(saKey, { loyaltyObjects, loyaltyClasses, origins }) {
  const claims = {
    iss: saKey.client_email,
    aud: 'google',
    typ: 'savetowallet',
    payload: {},
  };
  if (loyaltyClasses && loyaltyClasses.length) claims.payload.loyaltyClasses = loyaltyClasses;
  if (loyaltyObjects && loyaltyObjects.length) claims.payload.loyaltyObjects = loyaltyObjects;
  if (origins && origins.length) claims.origins = origins;
  const token = jwt.sign(claims, saKey.private_key, { algorithm: 'RS256' });
  return `https://pay.google.com/gp/v/save/${token}`;
}

module.exports = {
  ISSUER_ID,
  classIdFor,
  objectIdFor,
  stampImageUrl,
  stampState,
  premioDesbloqueado,
  rangoNombre,
  buildClass,
  buildObject,
  upsertClass,
  upsertObject,
  patchObject,
  addMessage,
  buildSaveUrl,
};
