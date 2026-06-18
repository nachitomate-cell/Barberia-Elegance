'use strict';

// functions/mercadopago-pago.js
// ─────────────────────────────────────────────────────────────────────────────
//  PASARELA DE PAGO MERCADO PAGO (Checkout Pro) — cobro previo a la reserva.
//
//  Reemplaza a Flow para los tenants con pago online obligatorio (PAGO_TENANTS).
//  Hoy: yugen. El cliente paga ANTES de que se cree la cita; la cita se crea
//  recién cuando Mercado Pago confirma el pago (webhook), lo que dispara solos
//  el email de confirmación y los push (ya existen onDocumentCreated sobre /citas).
//
//  Reservas hechas por el barbero desde el panel NO pasan por aquí (el panel
//  escribe la cita directo), así que quedan exentas de pago automáticamente.
//
//  La boleta se resuelve por el modelo del SII "el voucher es tu boleta": MP
//  reporta la venta al SII a diario. Requiere que el comercio tenga inicio de
//  actividades y haya declarado ese modelo de emisión (gestión del local).
//
//  Funciones:
//    mpCrearPago   (HTTP POST)  ← el sitio público pide crear el pago
//    mpWebhook     (HTTP POST)  ← webhook server-to-server de MP (notification_url)
//    mpRetorno     (HTTP)       ← navegador del cliente vuelve aquí (back_urls)
//    mpReembolsar  (callable)   ← admin: reembolso 50% (cancelación +12h)
//
//  SECRETO (setear una vez):
//    firebase functions:secrets:set MP_ACCESS_TOKEN   ← Access Token de PRODUCCIÓN
//
//  Seguridad: nunca confiamos en el cuerpo de la notificación. Siempre
//  consultamos el pago real en la API de MP con nuestro Access Token (fuente de
//  verdad), igual que Flow re-consultaba getStatus.
//
//  DEPLOY:
//    firebase deploy --only functions:mpCrearPago,functions:mpWebhook,functions:mpRetorno,functions:mpReembolsar
// ─────────────────────────────────────────────────────────────────────────────

const { onRequest, onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret }                  = require('firebase-functions/params');
const { logger }                        = require('firebase-functions');
const admin                             = require('firebase-admin');
const { FieldValue }                    = require('firebase-admin/firestore');

const db = admin.firestore();

const MP_ACCESS_TOKEN = defineSecret('MP_ACCESS_TOKEN');

const MP_API  = 'https://api.mercadopago.com';
const FN_BASE = 'https://us-central1-barberia-elegance.cloudfunctions.net';

// Tenants con pago online obligatorio + a dónde mandar al cliente al terminar.
const PAGO_TENANTS = {
  yugen: { moneda: 'CLP', sitio: 'https://yugenstudio.synaptechspa.cl' },
};

// ── Helpers de Firestore (multi-tenant; elegance usa colecciones raíz) ──────
const citasCol           = tid => (tid === 'elegance' ? db.collection('citas')            : db.collection(`tenants/${tid}/citas`));
const pagosPendientesCol = tid => (tid === 'elegance' ? db.collection('pagos_pendientes') : db.collection(`tenants/${tid}/pagos_pendientes`));
const serviciosCol       = tid => (tid === 'elegance' ? db.collection('servicios')        : db.collection(`tenants/${tid}/servicios`));
const settingsRef        = tid => (tid === 'elegance' ? db.collection('settings').doc('general') : db.collection(`tenants/${tid}/settings`).doc('general'));

// ── Llamada a la API de MP (Bearer token) ──────────────────────────────────
async function mpRequest(method, endpoint, token, { body, idempotencyKey } = {}) {
  const headers = { Authorization: `Bearer ${token}` };
  if (body) headers['Content-Type'] = 'application/json';
  if (idempotencyKey) headers['X-Idempotency-Key'] = idempotencyKey;

  const res  = await fetch(`${MP_API}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
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
  } catch (e) { logger.warn('[MP] no se pudo leer servicio', e.message); }

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
  } catch (e) { logger.warn('[MP] no se pudo leer recargo', e.message); }

  const enviado = Math.round(Number(cita.precio) || 0);
  // Cobramos al menos base+recargo recalculado server-side (evita manipulación a
  // la baja) y honramos precios legítimamente mayores (addons / precio por día).
  return Math.max(enviado, base + recargo, 500);
}

// ════════════════════════════════════════════════════════════════════════════
//  1) CREAR PAGO — el sitio público llama aquí al confirmar la reserva
//     Crea una preference de Checkout Pro y devuelve la URL de pago.
// ════════════════════════════════════════════════════════════════════════════
exports.mpCrearPago = onRequest(
  { secrets: [MP_ACCESS_TOKEN], cors: true, region: 'us-central1' },
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
      // MP exige un email válido para el pagador. Si el cliente no dio uno,
      // usamos un dominio real nuestro como respaldo para el comprobante.
      const email = (cita.clienteEmail && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cita.clienteEmail)) ? cita.clienteEmail : 'citas@synaptechspa.cl';

      // Guardar la reserva pendiente (la cita real se crea recién al confirmar el pago)
      await pagosPendientesCol(tenantId).doc(commerceOrder).set({
        tenantId, cita, amount,
        proveedor: 'mercadopago',
        estado: 'pending',
        creadoEn: FieldValue.serverTimestamp(),
      });

      const preference = {
        items: [{
          title:       `Reserva ${cita.servicioNombre || ''} ${cita.fecha} ${cita.hora}`.trim().slice(0, 250),
          quantity:    1,
          unit_price:  amount,                       // CLP es entero (sin decimales)
          currency_id: PAGO_TENANTS[tenantId].moneda,
        }],
        payer: { email },
        external_reference: commerceOrder,           // nos vincula el pago con la reserva
        back_urls: {
          success: `${FN_BASE}/mpRetorno`,
          failure: `${FN_BASE}/mpRetorno`,
          pending: `${FN_BASE}/mpRetorno`,
        },
        auto_return:      'approved',
        notification_url: `${FN_BASE}/mpWebhook`,
        binary_mode:      true,                       // aprueba o rechaza, sin estado "pendiente"
        statement_descriptor: 'YUGEN',
      };

      const { httpStatus, json } = await mpRequest('POST', '/checkout/preferences', MP_ACCESS_TOKEN.value(), { body: preference });

      if (httpStatus >= 300 || !json || !json.init_point) {
        logger.error('[MP] crear preference falló', JSON.stringify(json));
        return res.status(502).json({ error: 'mp_create_failed', detalle: json });
      }

      await pagosPendientesCol(tenantId).doc(commerceOrder).update({
        mpPreferenceId: json.id || null,
      });

      // El cliente debe ir a esta URL para pagar (tarjeta, débito o transferencia)
      return res.json({ url: json.init_point });
    } catch (e) {
      logger.error('[MP] crearPago error', e);
      return res.status(500).json({ error: 'internal', mensaje: e.message });
    }
  },
);

// ── Crear la cita real desde una reserva pendiente pagada (idempotente) ─────
async function confirmarReserva(tid, orderId, pago) {
  const ref = pagosPendientesCol(tid).doc(orderId);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) { logger.warn(`[MP] pendiente ${orderId} no existe`); return null; }
    const data = snap.data();
    if (data.citaId) return data.citaId; // ya procesado

    const cita = data.cita || {};
    const citaRef = citasCol(tid).doc();
    tx.set(citaRef, {
      ...cita,
      estado:   'Confirmada',
      origen:   cita.origen || 'web-mercadopago',
      creadoEn: FieldValue.serverTimestamp(),
      pago: {
        proveedor:   'mercadopago',
        estado:      'pagado',
        monto:       data.amount || null,
        mpPaymentId: (pago && pago.id) ? String(pago.id) : null,
        fecha:       FieldValue.serverTimestamp(),
      },
    });
    tx.update(ref, { estado: 'paid', citaId: citaRef.id, mpPaymentId: (pago && pago.id) ? String(pago.id) : null, pagadoEn: FieldValue.serverTimestamp() });
    return citaRef.id;
  });
}

// ── Consulta el pago real en MP y, si está aprobado, crea la cita ───────────
async function procesarPago(paymentId, token) {
  const { json: pay } = await mpRequest('GET', `/v1/payments/${paymentId}`, token);
  const commerceOrder = pay && pay.external_reference;
  if (!commerceOrder) {
    logger.error('[MP] payment sin external_reference', JSON.stringify(pay));
    return { ok: false, reason: 'no_order' };
  }

  const tid = commerceOrder.split('-')[0];
  if (!PAGO_TENANTS[tid]) return { ok: false, reason: 'tenant_desconocido' };

  if (pay.status === 'approved') {
    const citaId = await confirmarReserva(tid, commerceOrder, pay);
    logger.info(`[MP] ✓ pago aprobado ${commerceOrder} → cita ${citaId}`);
    return { ok: true, tid, citaId, commerceOrder };
  }

  await pagosPendientesCol(tid).doc(commerceOrder)
    .set({ estado: `mp_${pay.status}`, actualizadoEn: FieldValue.serverTimestamp() }, { merge: true })
    .catch(() => {});
  logger.info(`[MP] pago no aprobado ${commerceOrder} status=${pay.status}`);
  return { ok: false, reason: pay.status, tid, commerceOrder };
}

// ════════════════════════════════════════════════════════════════════════════
//  2) WEBHOOK — notificación server-to-server de MP (notification_url)
//     MP avisa con el id del pago (en query o body). Consultamos el pago real
//     y, si está aprobado, creamos la cita. Respondemos 200 siempre que se
//     procese sin error para que MP no reintente en bucle.
// ════════════════════════════════════════════════════════════════════════════
exports.mpWebhook = onRequest(
  { secrets: [MP_ACCESS_TOKEN], region: 'us-central1' },
  async (req, res) => {
    try {
      const q    = req.query || {};
      const body = req.body  || {};
      const type = q.type || q.topic || body.type || '';
      // Solo nos interesan notificaciones de pago (ignoramos merchant_order, etc.)
      if (type && !String(type).includes('payment')) return res.status(200).send('ignored');

      const paymentId = q['data.id'] || q.id || (body.data && body.data.id) || null;
      if (!paymentId) {
        logger.warn('[MP] webhook sin payment id', JSON.stringify({ q, body }));
        return res.status(200).send('no id');
      }

      await procesarPago(String(paymentId), MP_ACCESS_TOKEN.value());
      return res.status(200).send('OK');
    } catch (e) {
      logger.error('[MP] webhook error', e);
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
    <div class="seal">幽玄</div>
  </div>
</body></html>`;
}

// ════════════════════════════════════════════════════════════════════════════
//  3) RETORNO — el navegador del cliente vuelve aquí tras pagar (back_urls)
//     Mostramos una página de resultado. La cita normalmente ya la creó el
//     webhook; como respaldo, si el pago está aprobado la confirmamos aquí.
// ════════════════════════════════════════════════════════════════════════════
exports.mpRetorno = onRequest(
  { secrets: [MP_ACCESS_TOKEN], region: 'us-central1' },
  async (req, res) => {
    let ok = false;
    let sitio = 'https://yugenstudio.synaptechspa.cl';
    try {
      const q = req.query || {};
      const paymentId = q.payment_id || q['data.id'] || q.collection_id || null;
      if (paymentId) {
        const result = await procesarPago(String(paymentId), MP_ACCESS_TOKEN.value());
        ok = result.ok;
        if (result.tid && PAGO_TENANTS[result.tid]) sitio = PAGO_TENANTS[result.tid].sitio;
      } else if (q.external_reference) {
        // Sin payment_id pero con la orden: deducimos el tenant para el botón.
        const tid = String(q.external_reference).split('-')[0];
        if (PAGO_TENANTS[tid]) sitio = PAGO_TENANTS[tid].sitio;
        ok = String(q.status || q.collection_status || '').toLowerCase() === 'approved';
      }
    } catch (e) {
      logger.error('[MP] retorno error', e);
    }
    res.set('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(paginaResultado({ ok, sitio }));
  },
);

// ════════════════════════════════════════════════════════════════════════════
//  4) REEMBOLSO 50% — callable admin (cancelación con +12h de anticipación)
//     Recibe { tenantId, citaId }. Calcula el 50% del monto pagado y pide el
//     reembolso parcial a MP. Idempotente vía cita.pago.reembolso.
// ════════════════════════════════════════════════════════════════════════════
exports.mpReembolsar = onCall(
  { secrets: [MP_ACCESS_TOKEN], region: 'us-central1' },
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

    if (!cita.pago || cita.pago.proveedor !== 'mercadopago' || !cita.pago.mpPaymentId) {
      throw new HttpsError('failed-precondition', 'La cita no tiene un pago Mercado Pago asociado.');
    }
    if (cita.pago.reembolso) throw new HttpsError('already-exists', 'Esta cita ya tiene un reembolso.');

    const montoPagado = Number(cita.pago.monto) || 0;
    const montoReembolso = Math.round(montoPagado * 0.5);
    if (montoReembolso < 1) throw new HttpsError('failed-precondition', 'Monto a reembolsar inválido.');

    const { httpStatus, json } = await mpRequest(
      'POST',
      `/v1/payments/${cita.pago.mpPaymentId}/refunds`,
      MP_ACCESS_TOKEN.value(),
      { body: { amount: montoReembolso }, idempotencyKey: `${citaId}-refund` },
    );

    if (httpStatus >= 300 || !json || !json.id) {
      logger.error('[MP] refund falló', JSON.stringify(json));
      throw new HttpsError('internal', 'MP rechazó el reembolso: ' + (json?.message || 'desconocido'));
    }

    await ref.update({
      'pago.reembolso': {
        monto:  montoReembolso,
        mpRefundId: String(json.id),
        estado: json.status || 'created',
        fecha:  FieldValue.serverTimestamp(),
        por:    email || callerUid,
      },
    });

    logger.info(`[MP] ✓ reembolso 50% cita ${citaId} → $${montoReembolso}`);
    return { ok: true, monto: montoReembolso };
  },
);
