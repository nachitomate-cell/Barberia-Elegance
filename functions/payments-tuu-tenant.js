'use strict';

// functions/payments-tuu-tenant.js
// ─────────────────────────────────────────────────────────────────────────────
//  BARBERÍAS — configuración de TUU (POS presencial de Haulmer) por TENANT.
//
//  ONBOARDING VISUAL únicamente: guardamos la API key + nº de serie del POS que
//  el dueño ingresa desde /gestion-interna → Recibir Pagos → Cobros presenciales.
//  Estas funciones NO llaman a TUU: solo persisten los datos para que el día que
//  activemos el disparador de cobro (`tuuCobrarCita`) tengamos el terreno listo
//  y no haya re-onboarding para el dueño.
//
//  Motivación del pivot MP Point → TUU:
//    · TUU cubre PRO/PRO2/SE/Mini (MP Point solo Smart/Smart 2).
//    · TUU emite DTE nativo (sin el bloqueo SII "voucher es tu boleta").
//    · Doc: https://developers.tuu.cl/docs/pago-remoto
//
//  Funciones (ambas callables, gate admin/jefe del tenant):
//    tuuGuardarConfig  → escribe apiKey + serial(es) en Firestore.
//    tuuDesconectar    → borra apiKey y marca configured:false.
//
//  Almacenamiento:
//    tenant_tuu/{tid}         → { apiKey, updatedAt }
//                               rules: read/write if false (solo Admin SDK)
//    _system/tuu_{tid}        → { configured, deviceSerial|serialsPorSucursal,
//                                 enabled:false, updatedAt }
//                               público — lo lee el panel.
//
//  DEPLOY:
//    firebase deploy --only functions:tuuGuardarConfig,functions:tuuDesconectar
// ─────────────────────────────────────────────────────────────────────────────

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin                  = require('firebase-admin');
const { FieldValue }         = require('firebase-admin/firestore');

const REGION = 'us-central1';
const CORS   = true;
const BOOTSTRAP = ['ignaciiio.mate@gmail.com'];

const db = () => admin.firestore();

function assertTenantAdmin(request, tenantId) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesion.');
  const email = (request.auth.token?.email || '').toLowerCase();
  if (BOOTSTRAP.includes(email)) return;
  const claims = request.auth.token || {};
  const ok = claims.role === 'admin' && claims.tenantId === tenantId;
  if (!ok) throw new HttpsError('permission-denied', 'Solo administradores del local.');
}

// Sanitiza un nº de serie: uppercase, alfanumérico + guiones, 4-40 chars.
function normalizarSerial(s) {
  const v = String(s || '').trim().toUpperCase().replace(/[^A-Z0-9\-]/g, '');
  if (v.length < 4 || v.length > 40) return null;
  return v;
}

// ════════════════════════════════════════════════════════════════════════════
//  GUARDAR CONFIG — recibe apiKey + serial(es). No llama a TUU.
//  Payload:
//    { tenantId, apiKey, deviceSerial?, serialsPorSucursal? }
//  Uno de deviceSerial / serialsPorSucursal es obligatorio.
// ════════════════════════════════════════════════════════════════════════════
exports.tuuGuardarConfig = onCall(
  { region: REGION, cors: CORS },
  async (request) => {
    const data = request.data || {};
    const tenantId = data.tenantId;
    if (!tenantId) throw new HttpsError('invalid-argument', 'Falta tenantId.');
    assertTenantAdmin(request, tenantId);

    const apiKey = String(data.apiKey || '').trim();
    if (apiKey.length < 8) throw new HttpsError('invalid-argument', 'API key invalida (min 8 chars).');

    // Serial: puede venir uno solo o un mapa por sucursal (multi-local).
    let deviceSerial = null;
    let serialsPorSucursal = null;

    if (data.serialsPorSucursal && typeof data.serialsPorSucursal === 'object') {
      const out = {};
      for (const [suc, raw] of Object.entries(data.serialsPorSucursal)) {
        const clean = normalizarSerial(raw);
        if (!clean) continue;
        out[String(suc)] = clean;
      }
      if (!Object.keys(out).length) {
        throw new HttpsError('invalid-argument', 'Debes indicar al menos un serial por sucursal.');
      }
      serialsPorSucursal = out;
    } else {
      deviceSerial = normalizarSerial(data.deviceSerial);
      if (!deviceSerial) throw new HttpsError('invalid-argument', 'Nº de serie del POS invalido.');
    }

    // Sensible → colección cerrada.
    await db().collection('tenant_tuu').doc(String(tenantId)).set({
      apiKey,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    // Público → lo lee el panel para mostrar estado.
    const pub = {
      configured: true,
      enabled: false,               // activación real se libera cuando exista tuuCobrarCita
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (deviceSerial) pub.deviceSerial = deviceSerial;
    if (serialsPorSucursal) pub.serialsPorSucursal = serialsPorSucursal;
    // Limpiar el opuesto para no dejar restos de una config previa.
    if (deviceSerial) pub.serialsPorSucursal = FieldValue.delete();
    if (serialsPorSucursal) pub.deviceSerial = FieldValue.delete();

    await db().collection('_system').doc(`tuu_${tenantId}`).set(pub, { merge: true });

    return { ok: true };
  },
);

// ════════════════════════════════════════════════════════════════════════════
//  DESCONECTAR — borra la API key + marca configured:false.
// ════════════════════════════════════════════════════════════════════════════
exports.tuuDesconectar = onCall(
  { region: REGION, cors: CORS },
  async (request) => {
    const tenantId = request.data && request.data.tenantId;
    if (!tenantId) throw new HttpsError('invalid-argument', 'Falta tenantId.');
    assertTenantAdmin(request, tenantId);

    await db().collection('tenant_tuu').doc(String(tenantId)).delete().catch(() => {});
    await db().collection('_system').doc(`tuu_${tenantId}`).set({
      configured: false,
      enabled: false,
      deviceSerial: FieldValue.delete(),
      serialsPorSucursal: FieldValue.delete(),
      disconnectedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    return { ok: true };
  },
);
