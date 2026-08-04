'use strict';

// functions/payments-tuu-tenant.js
// ─────────────────────────────────────────────────────────────────────────────
//  BARBERÍAS — integración con TUU (POS presencial de Haulmer) por TENANT.
//
//  ONBOARDING (tuuGuardarConfig / tuuDesconectar / tuuSetFlag):
//    Guardamos apiKey + nº de serie(s) del POS que el dueño ingresa desde
//    /gestion-interna → Recibir Pagos → Cobros presenciales.
//
//  COBRO EN VIVO (tuuCobrarCita / tuuConsultarCobro):
//    Cuando el barbero marca "Tarjeta (POS)" en Agenda al completar la cita:
//      1) Front llama tuuCobrarCita → CF resuelve serial, POST a TUU.
//      2) Front hace polling llamando tuuConsultarCobro cada 2s.
//      3) Cuando TUU responde Completed → Front cierra el modal y persiste
//         la cita como Completada con metodoPago='Tarjeta (POS)'.
//    La CF NO marca estado='Completada' — esa decisión sigue en Agenda.jsx
//    (mantiene toda la lógica de payload, comisiones, caja, etc).
//
//  Doc TUU: https://developers.tuu.cl/docs/pago-remoto
//    · POST integrations.payment.haulmer.com/RemotePayment/v2/Create
//      Body: { idempotencyKey, amount, device, dteType, description }
//    · GET  integrations.payment.haulmer.com/RemotePayment/v2/GetPaymentReques/:idempotencyKey
//    · Auth: header X-API-Key
//    · Estados: Pending / Sent / Processing / Completed / Failed / Canceled
//    · dteType 0 = comprobante afecto (default, correcto para barbería con IVA)
//
//  Almacenamiento:
//    tenant_tuu/{tid}         → { apiKey, updatedAt }         (rules: closed)
//    _system/tuu_{tid}        → { configured, enabled, deviceSerial|serialsPorSucursal,
//                                 permitirTarjetaManual, updatedAt }  (público read)
//    tenants/{tid}/citas/{citaId}._tuu
//                             → { idempotencyKey, status, serial, amount,
//                                 startedAt, startedBy, lastCheckedAt,
//                                 completedAt?, failedAt?, canceledAt?, raw? }
//
//  DEPLOY:
//    firebase deploy --only \
//      functions:tuuGuardarConfig,functions:tuuDesconectar,functions:tuuSetFlag,\
//      functions:tuuCobrarCita,functions:tuuConsultarCobro
// ─────────────────────────────────────────────────────────────────────────────

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger }             = require('firebase-functions');
const admin                  = require('firebase-admin');
const { FieldValue }         = require('firebase-admin/firestore');

const REGION = 'us-central1';
const CORS   = true;
const BOOTSTRAP = ['ignaciiio.mate@gmail.com'];

const TUU_BASE = 'https://integrations.payment.haulmer.com/RemotePayment/v2';
const TUU_HTTP_TIMEOUT_MS = 15000; // TUU responde en ms al Create; margen amplio

const db = () => admin.firestore();

function assertTenantAdmin(request, tenantId) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesion.');
  const email = (request.auth.token?.email || '').toLowerCase();
  if (BOOTSTRAP.includes(email)) return;
  const claims = request.auth.token || {};
  const ok = claims.role === 'admin' && claims.tenantId === tenantId;
  if (!ok) throw new HttpsError('permission-denied', 'Solo administradores del local.');
}

// Cualquier miembro del staff (admin | barbero | recepcion) del tenant.
// Se usa para cobrar/consultar: el barbero pasa la tarjeta desde su propia sesión.
function assertTenantStaff(request, tenantId) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesion.');
  const email = (request.auth.token?.email || '').toLowerCase();
  if (BOOTSTRAP.includes(email)) return;
  const claims = request.auth.token || {};
  const roleOk = claims.role === 'admin' || claims.role === 'barbero' || claims.role === 'recepcion';
  const tenantOk = claims.tenantId === tenantId;
  if (!roleOk || !tenantOk) throw new HttpsError('permission-denied', 'Solo el staff del local.');
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
      // Habilitamos el cobro real: ya existe tuuCobrarCita.
      enabled: true,
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
//  DESCONECTAR — borra la API key + marca configured:false + enabled:false.
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

// ════════════════════════════════════════════════════════════════════════════
//  SET FLAG — toggle chico para banderas booleanas del panel.
//  Hoy solo: permitirTarjetaManual (por defecto false).
//  Motivo: Oren pidió que con POS integrado no se pueda marcar tarjeta a mano
//  (evita registrar efectivo como tarjeta). El fallback se enciende solo si
//  el admin lo autoriza explícitamente — por ejemplo, POS caído.
// ════════════════════════════════════════════════════════════════════════════
exports.tuuSetFlag = onCall(
  { region: REGION, cors: CORS },
  async (request) => {
    const data = request.data || {};
    const tenantId = data.tenantId;
    if (!tenantId) throw new HttpsError('invalid-argument', 'Falta tenantId.');
    assertTenantAdmin(request, tenantId);

    const patch = { updatedAt: FieldValue.serverTimestamp() };
    if (typeof data.permitirTarjetaManual === 'boolean') {
      patch.permitirTarjetaManual = data.permitirTarjetaManual;
    }
    if (Object.keys(patch).length === 1) {
      throw new HttpsError('invalid-argument', 'No hay flags para actualizar.');
    }

    await db().collection('_system').doc(`tuu_${tenantId}`).set(patch, { merge: true });
    return { ok: true };
  },
);

// ════════════════════════════════════════════════════════════════════════════
//  Helpers internos para el cobro
// ════════════════════════════════════════════════════════════════════════════

async function leerConfigTuu(tenantId) {
  const [sysSnap, keySnap] = await Promise.all([
    db().collection('_system').doc(`tuu_${tenantId}`).get(),
    db().collection('tenant_tuu').doc(String(tenantId)).get(),
  ]);
  const sys = sysSnap.exists ? sysSnap.data() : null;
  const key = keySnap.exists ? keySnap.data() : null;
  if (!sys || !sys.configured) {
    throw new HttpsError('failed-precondition', 'El POS TUU no está configurado.');
  }
  if (!sys.enabled) {
    throw new HttpsError('failed-precondition', 'El POS TUU está deshabilitado.');
  }
  if (!key || !key.apiKey) {
    throw new HttpsError('failed-precondition', 'Falta la API key de TUU (reconfigura).');
  }
  return { apiKey: key.apiKey, sys };
}

function resolverSerial(sys, sucursalId) {
  if (sys.serialsPorSucursal && typeof sys.serialsPorSucursal === 'object') {
    const serial = sucursalId && sys.serialsPorSucursal[String(sucursalId)];
    if (serial) return serial;
    throw new HttpsError('failed-precondition',
      sucursalId
        ? `No hay POS registrado para la sucursal "${sucursalId}".`
        : 'La cita no tiene sucursalId; no puedo resolver a qué POS enviar.');
  }
  if (sys.deviceSerial) return sys.deviceSerial;
  throw new HttpsError('failed-precondition', 'No hay nº de serie de POS configurado.');
}

// TUU acepta enteros en pesos. Rechaza <= 0.
function calcularMontoCobrable(cita) {
  const cand = [cita.precioFinal, cita.precio, cita.total, cita.monto].find(
    (v) => Number.isFinite(Number(v)) && Number(v) > 0,
  );
  const n = Number(cand);
  if (!Number.isFinite(n) || n <= 0) {
    throw new HttpsError('failed-precondition', 'La cita no tiene monto cobrable.');
  }
  return Math.round(n);
}

// TUU acepta description max ~ 60 chars según ejemplos; recortamos por si.
function armarDescripcion(cita) {
  const svc = cita.servicio || cita.servicioNombre || 'Servicio';
  const cli = cita.cliente || cita.clienteNombre || '';
  const raw = cli ? `${svc} - ${cli}` : svc;
  return String(raw).slice(0, 60);
}

// El GET/POST de TUU. Devuelve {ok, status, json, text}.
// Nunca lanza HttpsError acá — el caller decide qué reportar al front.
async function tuuHttp(method, path, apiKey, body) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TUU_HTTP_TIMEOUT_MS);
  try {
    const res = await fetch(`${TUU_BASE}${path}`, {
      method,
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    let json = null; let text = null;
    try { json = await res.json(); } catch (_) { try { text = await res.text(); } catch (_) {} }
    return { ok: res.ok, status: res.status, json, text };
  } finally {
    clearTimeout(t);
  }
}

// Normaliza el "estado" que devuelve TUU. La doc lista:
//   Pending / Sent / Processing / Completed / Failed / Canceled
// pero no dice si viene como string o como el número (0..5). Manejamos ambos.
function normalizarEstadoTuu(raw) {
  if (raw == null) return 'Unknown';
  if (typeof raw === 'number') {
    return ['Pending','Sent','Canceled','Processing','Failed','Completed'][raw] || 'Unknown';
  }
  const s = String(raw).trim();
  const cap = s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  const known = ['Pending','Sent','Canceled','Processing','Failed','Completed'];
  return known.includes(cap) ? cap : 'Unknown';
}

// Busca el estado adentro del response de TUU. Como no tenemos ejemplo oficial
// del JSON, probamos las claves más comunes. Guardamos siempre `raw` en la cita
// para inspeccionar el shape real en producción.
function extraerEstado(json) {
  if (!json || typeof json !== 'object') return 'Unknown';
  const c = json.state ?? json.status ?? json.State ?? json.Status
         ?? json?.data?.state ?? json?.data?.status;
  return normalizarEstadoTuu(c);
}

// ════════════════════════════════════════════════════════════════════════════
//  COBRAR — envía el pago al POS TUU y persiste la referencia en la cita.
//  Payload: { tenantId, citaId }
//  Return : { idempotencyKey, status } (status inicial devuelto por TUU)
// ════════════════════════════════════════════════════════════════════════════
exports.tuuCobrarCita = onCall(
  { region: REGION, cors: CORS },
  async (request) => {
    const data = request.data || {};
    const tenantId = data.tenantId;
    const citaId   = data.citaId;
    if (!tenantId) throw new HttpsError('invalid-argument', 'Falta tenantId.');
    if (!citaId)   throw new HttpsError('invalid-argument', 'Falta citaId.');
    assertTenantStaff(request, tenantId);

    const citaRef  = db().collection('tenants').doc(tenantId).collection('citas').doc(String(citaId));
    const citaSnap = await citaRef.get();
    if (!citaSnap.exists) throw new HttpsError('not-found', 'Cita no encontrada.');
    const cita = citaSnap.data();

    // El barbero solo puede cobrar SU cita; el admin puede cobrar cualquiera del tenant.
    const claims = request.auth?.token || {};
    if (claims.role === 'barbero') {
      const uid = request.auth.uid;
      const owns = cita.barberoId === uid || cita.barberoAuthUid === uid;
      if (!owns) throw new HttpsError('permission-denied', 'Solo puedes cobrar tus propias citas.');
    }
    const { apiKey, sys } = await leerConfigTuu(tenantId);
    const serial = resolverSerial(sys, cita.sucursalId);
    const amount = calcularMontoCobrable(cita);

    // idempotencyKey único por intento de cobro. Formato: cita-<citaId>-<ts>.
    // Si el 1er intento fue Failed/Canceled, el reintento genera una nueva key
    // (TUU rechaza reutilizar keys ya consumidas).
    const idempotencyKey = `cita-${String(citaId).slice(0, 32)}-${Date.now()}`;

    const body = {
      idempotencyKey,
      amount,
      device: serial,
      dteType: 0,               // 0 = comprobante afecto (por defecto en TUU)
      description: armarDescripcion(cita),
    };

    const t0 = Date.now();
    const resp = await tuuHttp('POST', '/Create', apiKey, body);
    const elapsed = Date.now() - t0;

    if (!resp.ok) {
      logger.error('[tuuCobrarCita] TUU respondió error', {
        tenantId, citaId, status: resp.status, elapsed,
        response: resp.json || resp.text,
      });
      throw new HttpsError('internal',
        `TUU rechazó la solicitud (HTTP ${resp.status}). Revisa consola.`);
    }

    const initialStatus = extraerEstado(resp.json) || 'Pending';

    await citaRef.set({
      _tuu: {
        idempotencyKey,
        status: initialStatus,
        serial,
        amount,
        startedAt: FieldValue.serverTimestamp(),
        startedBy: request.auth?.uid || null,
        createResponse: resp.json || null,
      },
    }, { merge: true });

    logger.info('[tuuCobrarCita] Cobro enviado al POS', {
      tenantId, citaId, idempotencyKey, amount, serial, initialStatus, elapsed,
    });

    return { idempotencyKey, status: initialStatus };
  },
);

// ════════════════════════════════════════════════════════════════════════════
//  CONSULTAR — polling desde el front para saber si TUU ya cerró el cobro.
//  Payload: { tenantId, citaId }
//  Return : { status, amount, raw }  (status en formato Pending/Sent/Processing/
//           Completed/Failed/Canceled)
// ════════════════════════════════════════════════════════════════════════════
exports.tuuConsultarCobro = onCall(
  { region: REGION, cors: CORS },
  async (request) => {
    const data = request.data || {};
    const tenantId = data.tenantId;
    const citaId   = data.citaId;
    if (!tenantId) throw new HttpsError('invalid-argument', 'Falta tenantId.');
    if (!citaId)   throw new HttpsError('invalid-argument', 'Falta citaId.');
    assertTenantStaff(request, tenantId);

    const citaRef  = db().collection('tenants').doc(tenantId).collection('citas').doc(String(citaId));
    const citaSnap = await citaRef.get();
    if (!citaSnap.exists) throw new HttpsError('not-found', 'Cita no encontrada.');
    const cita = citaSnap.data();

    const claims = request.auth?.token || {};
    if (claims.role === 'barbero') {
      const uid = request.auth.uid;
      const owns = cita.barberoId === uid || cita.barberoAuthUid === uid;
      if (!owns) throw new HttpsError('permission-denied', 'Solo puedes consultar tus propias citas.');
    }

    const tuuMeta = cita._tuu || null;
    if (!tuuMeta || !tuuMeta.idempotencyKey) {
      throw new HttpsError('failed-precondition', 'La cita no tiene cobro TUU iniciado.');
    }

    const { apiKey } = await leerConfigTuu(tenantId);
    const key = encodeURIComponent(tuuMeta.idempotencyKey);
    const resp = await tuuHttp('GET', `/GetPaymentReques/${key}`, apiKey);

    if (!resp.ok) {
      logger.warn('[tuuConsultarCobro] TUU respondió error al GET', {
        tenantId, citaId, status: resp.status, response: resp.json || resp.text,
      });
      // Devolvemos el estado guardado en Firestore; el polling reintenta.
      return { status: tuuMeta.status || 'Unknown', amount: tuuMeta.amount || 0, raw: null };
    }

    const nuevoStatus = extraerEstado(resp.json);
    const patch = {
      _tuu: {
        ...tuuMeta,
        status: nuevoStatus,
        lastCheckedAt: FieldValue.serverTimestamp(),
        lastResponse: resp.json || null,
      },
    };
    if (nuevoStatus === 'Completed' && !tuuMeta.completedAt) {
      patch._tuu.completedAt = FieldValue.serverTimestamp();
    }
    if (nuevoStatus === 'Failed' && !tuuMeta.failedAt) {
      patch._tuu.failedAt = FieldValue.serverTimestamp();
    }
    if (nuevoStatus === 'Canceled' && !tuuMeta.canceledAt) {
      patch._tuu.canceledAt = FieldValue.serverTimestamp();
    }

    await citaRef.set(patch, { merge: true });

    return {
      status: nuevoStatus,
      amount: tuuMeta.amount || 0,
      raw: resp.json || null,
    };
  },
);
