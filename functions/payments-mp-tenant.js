'use strict';

// functions/payments-mp-tenant.js
// ─────────────────────────────────────────────────────────────────────────────
//  BARBERÍAS — conexión MARKETPLACE de Mercado Pago por TENANT (OAuth)
//
//  Cada barbería conecta SU propia cuenta de Mercado Pago para recibir los
//  cobros (reservas, gift cards, propinas) directo en su cuenta. Mismo modelo
//  que bioo (payments-mp.js) pero el "vendedor" es el tenant, no un creador.
//
//  Reutiliza la MISMA Aplicación de MP de la plataforma (MP_APP_ID/MP_APP_SECRET).
//  Yügen NO se toca: sigue cobrando con el token de plataforma (MP_ACCESS_TOKEN)
//  porque no tendrá doc en tenant_mp (ver fallback en mercadopago-pago.js).
//
//  Funciones:
//    mpTenantConnect       (callable) ← admin/jefe inicia el OAuth; devuelve URL
//    mpTenantOAuthCallback (HTTP GET)  ← MP redirige con ?code&state(tenantId)
//    mpTenantDisconnect    (callable) ← admin/jefe desconecta su cuenta
//
//  Almacenamiento:
//    tenant_mp/{tid}              → tokens (CERRADO: reglas read/write if false)
//    _system/mercadopago_{tid}    → estado público no sensible { connected, mpUserId }
//
//  SECRETOS (compartidos con bioo): MP_APP_ID, MP_APP_SECRET.
//  Redirect URI a registrar en la app de MP:
//    https://us-central1-barberia-elegance.cloudfunctions.net/mpTenantOAuthCallback
//
//  DEPLOY:
//    firebase deploy --only functions:mpTenantConnect,functions:mpTenantOAuthCallback,functions:mpTenantDisconnect
// ─────────────────────────────────────────────────────────────────────────────

const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');

const MP_APP_ID     = defineSecret('MP_APP_ID');
const MP_APP_SECRET = defineSecret('MP_APP_SECRET');

const MP_API  = 'https://api.mercadopago.com';
const MP_AUTH = 'https://auth.mercadopago.com/authorization';
const FN_BASE = 'https://us-central1-barberia-elegance.cloudfunctions.net';
const REDIRECT_URI = `${FN_BASE}/mpTenantOAuthCallback`;
const PANEL_URL = 'https://barberia-elegance.web.app/gestion-interna';

const REGION = 'us-central1';
const CORS = true;
const BOOTSTRAP = ['ignaciiio.mate@gmail.com', 'barrazanicolasfabian@gmail.com'];

const db = () => admin.firestore();

async function mpRequest(method, endpoint, token, { body, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) { headers['Content-Type'] = 'application/x-www-form-urlencoded'; payload = new URLSearchParams(form).toString(); }
  else if (body) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  const res = await fetch(`${MP_API}${endpoint}`, { method, headers, body: payload });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = { _raw: text }; }
  return { httpStatus: res.status, json };
}

// El caller debe ser admin/jefe del tenant (o bootstrap de SynapTech).
function assertTenantAdmin(request, tenantId) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
  const email = (request.auth.token?.email || '').toLowerCase();
  if (BOOTSTRAP.includes(email)) return;
  const claims = request.auth.token || {};
  const ok = (claims.role === 'admin' || claims.role === 'jefe') && claims.tenantId === tenantId;
  if (!ok) throw new HttpsError('permission-denied', 'Solo administradores del local.');
}

// ── Token del tenant con auto-refresh (lo usa también mercadopago-pago.js) ───
//  tenant_mp/{tid}: { mpUserId, mpAccessToken, mpRefreshToken, mpTokenExpiresAt }
//  Devuelve null si el tenant no conectó su MP (→ el caller usa el fallback).
async function getValidTenantToken(tenantId) {
  const ref = db().collection('tenant_mp').doc(String(tenantId));
  const snap = await ref.get();
  if (!snap.exists) return null;
  const d = snap.data() || {};
  if (!d.mpAccessToken) return null;

  const expMs = d.mpTokenExpiresAt && d.mpTokenExpiresAt.toMillis ? d.mpTokenExpiresAt.toMillis() : 0;
  if (expMs && Date.now() < expMs - 5 * 60 * 1000) return d.mpAccessToken;
  if (!d.mpRefreshToken) return d.mpAccessToken;

  const { httpStatus, json } = await mpRequest('POST', '/oauth/token', null, {
    form: {
      grant_type: 'refresh_token',
      client_id: MP_APP_ID.value(),
      client_secret: MP_APP_SECRET.value(),
      refresh_token: d.mpRefreshToken,
    },
  });
  if (httpStatus >= 300 || !json || !json.access_token) {
    logger.error('[MP-tenant] refresh falló', tenantId, JSON.stringify(json));
    return d.mpAccessToken;
  }
  await ref.set({
    mpAccessToken: json.access_token,
    mpRefreshToken: json.refresh_token || d.mpRefreshToken,
    mpTokenExpiresAt: new admin.firestore.Timestamp(Math.floor(Date.now() / 1000) + (Number(json.expires_in) || 21600), 0),
    mpUpdatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  return json.access_token;
}
exports.getValidTenantToken = getValidTenantToken;

// ════════════════════════════════════════════════════════════════════════════
//  1) CONNECT — admin/jefe inicia el OAuth. state = tenantId.
// ════════════════════════════════════════════════════════════════════════════
exports.mpTenantConnect = onCall(
  { region: REGION, cors: CORS, secrets: [MP_APP_ID] },
  async (request) => {
    const tenantId = request.data && request.data.tenantId;
    if (!tenantId) throw new HttpsError('invalid-argument', 'Falta tenantId.');
    assertTenantAdmin(request, tenantId);
    const url = `${MP_AUTH}?client_id=${encodeURIComponent(MP_APP_ID.value())}`
      + `&response_type=code&platform_id=mp`
      + `&state=${encodeURIComponent(tenantId)}`
      + `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
    return { url };
  },
);

// ════════════════════════════════════════════════════════════════════════════
//  2) OAUTH CALLBACK — MP redirige con ?code & ?state(tenantId).
// ════════════════════════════════════════════════════════════════════════════
exports.mpTenantOAuthCallback = onRequest(
  { region: REGION, secrets: [MP_APP_ID, MP_APP_SECRET] },
  async (req, res) => {
    const back = (ok) => res.redirect(`${PANEL_URL}/recibir-pagos?mp=${ok ? 'connected' : 'error'}`);
    try {
      const code = req.query.code;
      const tenantId = req.query.state;
      if (!code || !tenantId) return back(false);

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
        logger.error('[MP-tenant] oauth token falló', JSON.stringify(json));
        return back(false);
      }

      // Token sensible → colección cerrada.
      await db().collection('tenant_mp').doc(String(tenantId)).set({
        mpUserId: json.user_id != null ? String(json.user_id) : null,
        mpAccessToken: json.access_token,
        mpRefreshToken: json.refresh_token || null,
        mpTokenExpiresAt: new admin.firestore.Timestamp(Math.floor(Date.now() / 1000) + (Number(json.expires_in) || 21600), 0),
        mpUpdatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      // Estado público (no sensible) → lo lee el panel.
      await db().collection('_system').doc(`mercadopago_${tenantId}`).set({
        connected: true,
        mpUserId: json.user_id != null ? String(json.user_id) : null,
        connectedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      return back(true);
    } catch (e) {
      logger.error('[MP-tenant] callback error', e);
      return back(false);
    }
  },
);

// ════════════════════════════════════════════════════════════════════════════
//  3) DISCONNECT — admin/jefe desvincula la cuenta (borra token + flag).
// ════════════════════════════════════════════════════════════════════════════
exports.mpTenantDisconnect = onCall(
  { region: REGION, cors: CORS },
  async (request) => {
    const tenantId = request.data && request.data.tenantId;
    if (!tenantId) throw new HttpsError('invalid-argument', 'Falta tenantId.');
    assertTenantAdmin(request, tenantId);
    await db().collection('tenant_mp').doc(String(tenantId)).delete().catch(() => {});
    await db().collection('_system').doc(`mercadopago_${tenantId}`).set({
      connected: false,
      disconnectedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return { ok: true };
  },
);
