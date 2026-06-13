'use strict';

// functions/flow-pago.js
// ─────────────────────────────────────────────────────────────────────────────
//  PASARELA DE PAGO FLOW (flow.cl) — cobro previo a la reserva.
//
//  Tenants con pago online obligatorio en la reserva pública (PAGO_TENANTS).
//  Hoy: yugen. El cliente paga ANTES de que se cree la cita; la cita se crea
//  recién cuando Flow confirma el pago (webhook), lo que dispara solos el email
//  de confirmación y los push (ya existen onDocumentCreated sobre /citas).
//
//  Reservas hechas por el barbero desde el panel NO pasan por aquí (el panel
//  escribe la cita directo), así que quedan exentas de pago automáticamente.
//
//  Funciones:
//    flowCrearPago   (HTTP POST)  ← el sitio público pide crear el pago
//    flowConfirmacion(HTTP POST)  ← webhook server-to-server de Flow (urlConfirmation)
//    flowRetorno     (HTTP)       ← navegador del cliente vuelve aquí (urlReturn)
//    flowReembolsar  (callable)   ← admin: reembolso 50% (cancelación +12h)
//
//  SECRETOS (setear una vez):
//    firebase functions:secrets:set FLOW_API_KEY
//    firebase functions:secrets:set FLOW_SECRET_KEY
//
//  DEPLOY:
//    firebase deploy --only functions:flowCrearPago,functions:flowConfirmacion,functions:flowRetorno,functions:flowReembolsar
// ─────────────────────────────────────────────────────────────────────────────

const { onRequest, onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret }                  = require('firebase-functions/params');
const { logger }                        = require('firebase-functions');
const admin                             = require('firebase-admin');
const crypto                            = require('crypto');
const { FieldValue }                    = require('firebase-admin/firestore');

const db = admin.firestore();

const FLOW_API_KEY    = defineSecret('FLOW_API_KEY');
const FLOW_SECRET_KEY = defineSecret('FLOW_SECRET_KEY');

// Producción. Sandbox: 'https://sandbox.flow.cl/api'
const FLOW_API = 'https://www.flow.cl/api';
const FN_BASE  = 'https://us-central1-barberia-elegance.cloudfunctions.net';

// Tenants con pago online obligatorio + a dónde mandar al cliente al terminar.
const PAGO_TENANTS = {
  yugen: { moneda: 'CLP', sitio: 'https://yugenstudio.synaptechspa.cl' },
};

// ── Helpers de Firestore (multi-tenant; elegance usa colecciones raíz) ──────
const citasCol           = tid => (tid === 'elegance' ? db.collection('citas')            : db.collection(`tenants/${tid}/citas`));
const pagosPendientesCol = tid => (tid === 'elegance' ? db.collection('pagos_pendientes') : db.collection(`tenants/${tid}/pagos_pendientes`));
const serviciosCol       = tid => (tid === 'elegance' ? db.collection('servicios')        : db.collection(`tenants/${tid}/servicios`));
const settingsRef        = tid => (tid === 'elegance' ? db.collection('settings').doc('general') : db.collection(`tenants/${tid}/settings`).doc('general'));

// ── Firma Flow: params ordenados por clave, concatenar key+value, HMAC-SHA256 hex ──
function firmar(params, secret) {
  const toSign = Object.keys(params).sort().map(k => k + params[k]).join('');
  return crypto.createHmac('sha256', secret).update(toSign).digest('hex');
}

async function flowRequest(method, endpoint, params, apiKey, secret) {
  const full = { ...params, apiKey };
  full.s = firmar(full, secret);
  const qs = new URLSearchParams(full).toString();

  let res;
  if (method === 'GET') {
    res = await fetch(`${FLOW_API}${endpoint}?${qs}`, { method: 'GET' });
  } else {
    res = await fetch(`${FLOW_API}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: qs,
    });
  }
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { _raw: text }; }
  return { httpStatus: res.status, json };
}

// ── Monto a cobrar: se recalcula server-side para evitar manipulación ───────
//  base = precio del servicio en Firestore; + recargo por horario (config).
//  Se acepta el precio enviado por el cliente solo si es >= piso razonable.
async function calcularMonto(tid, cita) {
  let base = 0;
  try {
    if (cita.servicioId) {
      const svc = await serviciosCol(tid).doc(String(cita.servicioId)).get();
      if (svc.exists) base = Number(svc.data().precio) || 0;
    }
  } catch (e) { logger.warn('[Flow] no se pudo leer servicio', e.message); }

  let recargo = 0;
  try {
    const snap = await settingsRef(tid).get();
    const r = snap.exists ? snap.data().recargosHorario : null;
    if (r && cita.fecha && cita.hora) {
      const dow  = new Date(`${cita.fecha}T00:00:00`).getDay();
      const hour = parseInt(String(cita.hora), 10);
      const dia  = r[String(dow)];
      recargo = dia ? (Number(dia[String(hour)]) || 0) : 0;
    }
  } catch (e) { logger.warn('[Flow] no se pudo leer recargo', e.message); }

  const enviado = Math.round(Number(cita.precio) || 0);
  // Cobramos al menos base+recargo recalculado server-side (evita manipulación a
  // la baja) y honramos precios legítimamente mayores (addons / precio por día).
  return Math.max(enviado, base + recargo, 500);
}

// ════════════════════════════════════════════════════════════════════════════
//  1) CREAR PAGO — el sitio público llama aquí al confirmar la reserva
// ════════════════════════════════════════════════════════════════════════════
exports.flowCrearPago = onRequest(
  { secrets: [FLOW_API_KEY, FLOW_SECRET_KEY], cors: true, region: 'us-central1' },
  async (req, res) => {
    try {
      if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

      const body     = req.body || {};
      const tenantId = body.tenantId;
      const cita     = body.cita;

      if (!tenantId || !PAGO_TENANTS[tenantId]) return res.status(400).json({ error: 'tenant_no_habilitado' });
      if (!cita || !cita.servicioId || !cita.fecha || !cita.hora) return res.status(400).json({ error: 'datos_incompletos' });

      const amount = await calcularMonto(tenantId, cita);
      if (!amount || amount < 500) return res.status(400).json({ error: 'monto_invalido' });

      const commerceOrder = `${tenantId}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
      // Flow valida el email (code 1620 si no es válido). Si el cliente no dio
      // uno, usamos un dominio real nuestro como respaldo para el comprobante.
      const email = (cita.clienteEmail && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cita.clienteEmail)) ? cita.clienteEmail : 'citas@synaptechspa.cl';

      // Guardar la reserva pendiente (la cita real se crea recién al confirmar el pago)
      await pagosPendientesCol(tenantId).doc(commerceOrder).set({
        tenantId, cita, amount,
        estado: 'pending',
        creadoEn: FieldValue.serverTimestamp(),
      });

      const params = {
        commerceOrder,
        subject:  `Reserva ${cita.servicioNombre || ''} ${cita.fecha} ${cita.hora}`.trim().slice(0, 250),
        currency: PAGO_TENANTS[tenantId].moneda,
        amount:   String(amount),
        email,
        urlConfirmation: `${FN_BASE}/flowConfirmacion`,
        urlReturn:       `${FN_BASE}/flowRetorno`,
      };

      const { json } = await flowRequest('POST', '/payment/create', params, FLOW_API_KEY.value(), FLOW_SECRET_KEY.value());

      if (!json || !json.url || !json.token) {
        logger.error('[Flow] create falló', JSON.stringify(json));
        return res.status(502).json({ error: 'flow_create_failed', detalle: json });
      }

      await pagosPendientesCol(tenantId).doc(commerceOrder).update({
        flowToken: json.token,
        flowOrder: json.flowOrder || null,
      });

      // El cliente debe ir a esta URL para pagar (tarjeta o transferencia)
      return res.json({ url: `${json.url}?token=${json.token}` });
    } catch (e) {
      logger.error('[Flow] crearPago error', e);
      return res.status(500).json({ error: 'internal', mensaje: e.message });
    }
  },
);

// ── Crear la cita real desde una reserva pendiente pagada (idempotente) ─────
async function confirmarReserva(tid, orderId) {
  const ref = pagosPendientesCol(tid).doc(orderId);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) { logger.warn(`[Flow] pendiente ${orderId} no existe`); return null; }
    const data = snap.data();
    if (data.citaId) return data.citaId; // ya procesado

    const cita = data.cita || {};
    const citaRef = citasCol(tid).doc();
    tx.set(citaRef, {
      ...cita,
      estado:   'Confirmada',
      origen:   cita.origen || 'web-flow',
      creadoEn: FieldValue.serverTimestamp(),
      pago: {
        proveedor: 'flow',
        estado:    'pagado',
        monto:     data.amount || null,
        flowOrder: data.flowOrder || null,
        fecha:     FieldValue.serverTimestamp(),
      },
    });
    tx.update(ref, { estado: 'paid', citaId: citaRef.id, pagadoEn: FieldValue.serverTimestamp() });
    return citaRef.id;
  });
}

// ════════════════════════════════════════════════════════════════════════════
//  2) CONFIRMACIÓN — webhook server-to-server de Flow (urlConfirmation)
//     Flow envía `token`; consultamos el estado real y, si está pagado,
//     creamos la cita. Respondemos 200 siempre que se procese sin error.
// ════════════════════════════════════════════════════════════════════════════
exports.flowConfirmacion = onRequest(
  { secrets: [FLOW_API_KEY, FLOW_SECRET_KEY], region: 'us-central1' },
  async (req, res) => {
    try {
      const token = (req.body && req.body.token) || req.query.token;
      if (!token) return res.status(400).send('missing token');

      const { json } = await flowRequest('GET', '/payment/getStatus', { token }, FLOW_API_KEY.value(), FLOW_SECRET_KEY.value());
      // status Flow: 1 pendiente, 2 pagado, 3 rechazado, 4 anulado
      const commerceOrder = json && json.commerceOrder;
      const pagado = json && Number(json.status) === 2;

      if (!commerceOrder) {
        logger.error('[Flow] getStatus sin commerceOrder', JSON.stringify(json));
        return res.status(200).send('no order');
      }

      const tid = commerceOrder.split('-')[0];
      if (!PAGO_TENANTS[tid]) return res.status(200).send('tenant desconocido');

      if (pagado) {
        const citaId = await confirmarReserva(tid, commerceOrder);
        logger.info(`[Flow] ✓ pago confirmado ${commerceOrder} → cita ${citaId}`);
      } else {
        await pagosPendientesCol(tid).doc(commerceOrder)
          .set({ estado: `flow_${json.status}`, actualizadoEn: FieldValue.serverTimestamp() }, { merge: true })
          .catch(() => {});
        logger.info(`[Flow] pago no completado ${commerceOrder} status=${json.status}`);
      }
      return res.status(200).send('OK');
    } catch (e) {
      logger.error('[Flow] confirmacion error', e);
      return res.status(500).send('error');
    }
  },
);

// ── Página de resultado (HTML autocontenido, estilo Yūgen) ──────────────────
function paginaResultado({ ok, sitio, mensaje }) {
  const titulo = ok ? 'Reserva confirmada' : 'Pago no completado';
  const icono  = ok ? '✓' : '✕';
  const color  = ok ? '#9ca38f' : '#b14a4a';
  const sub = ok
    ? 'Tu pago se realizó con éxito y tu hora quedó reservada. Te enviamos la confirmación por correo.'
    : (mensaje || 'No se completó el pago, por lo que tu hora no fue reservada. Puedes intentarlo nuevamente.');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titulo} · Yūgen Studio</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0b0a09;color:#efeae2;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
  .card{max-width:420px;width:100%;text-align:center;background:#141210;border:1px solid #2a2622;border-radius:20px;padding:40px 28px}
  .badge{width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:30px;color:#0b0a09;background:${color}}
  h1{font-size:20px;font-weight:600;letter-spacing:.02em;margin-bottom:10px}
  p{font-size:14px;line-height:1.6;color:#b8b0a4;margin-bottom:26px}
  a{display:inline-block;text-decoration:none;background:#efeae2;color:#0b0a09;font-weight:600;font-size:14px;padding:12px 26px;border-radius:12px}
  .seal{margin-top:24px;font-size:12px;color:#6b645b;letter-spacing:.3em}
</style></head><body>
  <div class="card">
    <div class="badge">${icono}</div>
    <h1>${titulo}</h1>
    <p>${sub}</p>
    <a href="${sitio}">Volver a Yūgen Studio</a>
    <div class="seal">玄</div>
  </div>
</body></html>`;
}

// ════════════════════════════════════════════════════════════════════════════
//  3) RETORNO — el navegador del cliente vuelve aquí tras pagar (urlReturn)
//     Mostramos una página de resultado. La cita ya la creó el webhook.
// ════════════════════════════════════════════════════════════════════════════
exports.flowRetorno = onRequest(
  { secrets: [FLOW_API_KEY, FLOW_SECRET_KEY], region: 'us-central1' },
  async (req, res) => {
    let ok = false;
    let sitio = 'https://yugenstudio.synaptechspa.cl';
    try {
      const token = (req.body && req.body.token) || req.query.token;
      if (token) {
        const { json } = await flowRequest('GET', '/payment/getStatus', { token }, FLOW_API_KEY.value(), FLOW_SECRET_KEY.value());
        ok = json && Number(json.status) === 2;
        const tid = json && json.commerceOrder ? json.commerceOrder.split('-')[0] : null;
        if (tid && PAGO_TENANTS[tid]) sitio = PAGO_TENANTS[tid].sitio;
        // Respaldo: si el webhook aún no corrió, confirmamos aquí también.
        if (ok && json.commerceOrder && tid) {
          await confirmarReserva(tid, json.commerceOrder).catch(() => {});
        }
      }
    } catch (e) {
      logger.error('[Flow] retorno error', e);
    }
    res.set('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(paginaResultado({ ok, sitio }));
  },
);

// ════════════════════════════════════════════════════════════════════════════
//  4) REEMBOLSO 50% — callable admin (cancelación con +12h de anticipación)
//     Recibe { tenantId, citaId }. Calcula el 50% del monto pagado y pide el
//     reembolso a Flow. Idempotente vía cita.pago.reembolso.
// ════════════════════════════════════════════════════════════════════════════
exports.flowReembolsar = onCall(
  { secrets: [FLOW_API_KEY, FLOW_SECRET_KEY], region: 'us-central1' },
  async (request) => {
    const callerUid = request.auth?.uid;
    if (!callerUid) throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');

    const { tenantId, citaId } = request.data || {};
    if (!tenantId || !citaId) throw new HttpsError('invalid-argument', 'tenantId y citaId requeridos.');
    if (!PAGO_TENANTS[tenantId]) throw new HttpsError('failed-precondition', 'Tenant sin pago online.');

    // Verificar que el caller sea admin/jefe del tenant
    const BOOTSTRAP = ['ignaciiio.mate@gmail.com', 'barrazanicolasfabian@gmail.com'];
    const email = (request.auth?.token?.email || '').toLowerCase();
    if (!BOOTSTRAP.includes(email)) {
      const claims = request.auth?.token || {};
      const rolOk = (claims.role === 'admin' || claims.role === 'jefe') && claims.tenantId === tenantId;
      if (!rolOk) throw new HttpsError('permission-denied', 'Solo administradores del local.');
    }

    const ref  = citasCol(tenantId).doc(citaId);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError('not-found', 'Cita no encontrada.');
    const cita = snap.data();

    if (!cita.pago || cita.pago.proveedor !== 'flow' || !cita.pago.flowOrder) {
      throw new HttpsError('failed-precondition', 'La cita no tiene un pago Flow asociado.');
    }
    if (cita.pago.reembolso) throw new HttpsError('already-exists', 'Esta cita ya tiene un reembolso.');

    const montoPagado = Number(cita.pago.monto) || 0;
    const montoReembolso = Math.round(montoPagado * 0.5);
    if (montoReembolso < 1) throw new HttpsError('failed-precondition', 'Monto a reembolsar inválido.');

    const params = {
      refundCommerceOrder: `${citaId}-refund`,
      receiverEmail: (cita.clienteEmail && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cita.clienteEmail)) ? cita.clienteEmail : 'citas@synaptechspa.cl',
      amount: String(montoReembolso),
      urlCallBack: `${FN_BASE}/flowConfirmacion`,
      flowOrder: String(cita.pago.flowOrder),
    };

    const { json } = await flowRequest('POST', '/refund/create', params, FLOW_API_KEY.value(), FLOW_SECRET_KEY.value());
    if (!json || json.token === undefined) {
      logger.error('[Flow] refund falló', JSON.stringify(json));
      throw new HttpsError('internal', 'Flow rechazó el reembolso: ' + (json?.message || 'desconocido'));
    }

    await ref.update({
      'pago.reembolso': {
        monto: montoReembolso,
        token: json.token,
        estado: json.status || 'created',
        fecha: FieldValue.serverTimestamp(),
        por: email || callerUid,
      },
    });

    logger.info(`[Flow] ✓ reembolso 50% cita ${citaId} → $${montoReembolso}`);
    return { ok: true, monto: montoReembolso };
  },
);
