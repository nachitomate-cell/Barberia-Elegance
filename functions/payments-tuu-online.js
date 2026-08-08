'use strict';

// functions/payments-tuu-online.js
// ─────────────────────────────────────────────────────────────────────────────
//  BARBERÍAS — PAGO ONLINE con TUU (pasarela e-commerce de Haulmer) por TENANT.
//
//  Modelo de negocio: ABONO configurable por local (default 50%). El cliente
//  paga el abono ANTES de que exista la cita; la cita se crea recién cuando
//  TUU confirma el pago (callback firmado), igual que el flujo Yügen con
//  Mercado Pago (mercadopago-pago.js — el molde de este archivo). El saldo se
//  cobra en el local al completar (POS TUU / efectivo), restando el abono.
//
//  Doc TUU: https://developers.tuu.cl/docs/payment-intent
//    · POST core.payment.haulmer.com/api/v1/payment   (prod)
//    · POST frontend-api.payment.haulmer.dev/v1/payment (integración/sandbox)
//    · Header X-REDIRECT: false → la respuesta trae la URL del checkout
//      (shape no documentado: extraemos defensivo y guardamos raw).
//    · Campos x_* firmados con HMAC-SHA256 (Llave Secreta): ordenar las claves
//      x_* alfabéticamente, concatenar clave+valor sin separadores, HMAC hex.
//    · Confirmación: POST x_url_callback (form-urlencoded, firmado, reintenta
//      hasta 10 veces) — LA fuente de verdad. El redirect GET es solo UX.
//    · x_result: completed | failed | pending. Solo CLP.
//
//  OJO: las credenciales de Pago Online (x_account_id + Llave Secreta) son
//  DISTINTAS de la X-API-Key del POS presencial. Ambas viven en tenant_tuu.
//
//  Almacenamiento:
//    tenant_tuu/{tid}   → + { onlineAccountId, onlineSecretKey } (rules closed)
//    _system/tuu_{tid}  → + { onlineConfigured, onlineEnabled, onlineAbonoPct,
//                             onlineSandbox?, onlineSitio? } (público read —
//                             el booking lo lee para gatear el paso de pago)
//    tenants/{tid}/pagos_pendientes/{orderId}
//                       → { tenantId, cita, amount(=abono), amountTotal,
//                           abonoPct, proveedor:'tuu_online', estado,
//                           createResponse?, citaId?, pagadoEn? }
//    Cita creada        → pago:{ proveedor:'tuu_online', estado:'abonado'|
//                           'pagado', monto, montoTotal, referencia, fecha }
//                         + top-level abonoPagado / saldoPendiente (si saldo>0)
//                         para que Agenda/agenda.html/Caja resten sin bucear.
//
//  DEPLOY:
//    FUNCTIONS_DISCOVERY_TIMEOUT=180 npx firebase deploy --only \
//      functions:tuuOnlineGuardarConfig,functions:tuuOnlineSetFlag,\
//      functions:tuuOnlineDesconectar,functions:tuuOnlineCrearPago,\
//      functions:tuuOnlineCallback,functions:tuuOnlineRetorno
// ─────────────────────────────────────────────────────────────────────────────

const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { logger }     = require('firebase-functions');
const admin          = require('firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');
const crypto         = require('crypto');

const { _calcularMontoReserva: calcularMontoReserva } = require('./mercadopago-pago');
const { _upsertClienteCore: upsertClienteCore }       = require('./upsert-cliente');

const REGION  = 'us-central1';
const FN_BASE = 'https://us-central1-barberia-elegance.cloudfunctions.net';
const BOOTSTRAP = ['ignaciiio.mate@gmail.com'];

const TUU_ONLINE_URL = {
  prod:    'https://core.payment.haulmer.com/api/v1/payment',
  sandbox: 'https://frontend-api.payment.haulmer.dev/v1/payment',
};
const HTTP_TIMEOUT_MS = 20000;

const db = () => admin.firestore();

// Multi-tenant: elegance usa colecciones raíz (mismo criterio que el resto).
const citasCol           = tid => (tid === 'elegance' ? db().collection('citas')             : db().collection(`tenants/${tid}/citas`));
const slotLocksCol       = tid => (tid === 'elegance' ? db().collection('slotLocks')          : db().collection(`tenants/${tid}/slotLocks`));
const pagosPendientesCol = tid => (tid === 'elegance' ? db().collection('pagos_pendientes')  : db().collection(`tenants/${tid}/pagos_pendientes`));

function assertTenantAdmin(request, tenantId) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesion.');
  const email = (request.auth.token?.email || '').toLowerCase();
  if (BOOTSTRAP.includes(email)) return;
  const claims = request.auth.token || {};
  const ok = claims.role === 'admin' && claims.tenantId === tenantId;
  if (!ok) throw new HttpsError('permission-denied', 'Solo administradores del local.');
}

// ── Firma HMAC-SHA256 de los campos x_* (protocolo de la pasarela) ──────────
//  Claves x_* (sin x_signature) ordenadas alfabéticamente, concatenadas como
//  clave+valor sin separadores, HMAC con la Llave Secreta, hex minúsculas.
function firmarCampos(fields, secretKey) {
  const cadena = Object.keys(fields)
    .filter(k => k.startsWith('x_') && k !== 'x_signature'
      && fields[k] !== undefined && fields[k] !== null)
    .sort()
    .map(k => `${k}${fields[k]}`)
    .join('');
  return crypto.createHmac('sha256', String(secretKey)).update(cadena, 'utf8').digest('hex');
}

function firmaValida(fields, secretKey) {
  const recibida = String(fields.x_signature || '');
  const esperada = firmarCampos(fields, secretKey);
  if (recibida.length !== esperada.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(recibida, 'utf8'), Buffer.from(esperada, 'utf8'));
  } catch (_) { return false; }
}

// ── Normalizadores para los campos del intent ───────────────────────────────
function telefonoE164(raw) {
  const d = String(raw || '').replace(/\D/g, '');
  if (d.startsWith('56') && d.length >= 11) return `+${d.slice(0, 11)}`;
  if (d.length === 9 && d.startsWith('9'))  return `+56${d}`;
  if (d.length === 8)                        return `+569${d}`;
  return '+56900000000'; // TUU exige el campo; la reserva igual guarda el real
}

function partirNombre(full) {
  const parts = String(full || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { nombre: 'Cliente', apellido: '.' };
  return { nombre: parts[0], apellido: parts.slice(1).join(' ') || '.' };
}

async function leerConfigOnline(tenantId) {
  const [sysSnap, keySnap] = await Promise.all([
    db().collection('_system').doc(`tuu_${tenantId}`).get(),
    db().collection('tenant_tuu').doc(String(tenantId)).get(),
  ]);
  const sys = sysSnap.exists ? sysSnap.data() : null;
  const key = keySnap.exists ? keySnap.data() : null;
  if (!sys || sys.onlineConfigured !== true || sys.onlineEnabled !== true) return null;
  if (!key || !key.onlineAccountId || !key.onlineSecretKey) return null;
  return {
    accountId: String(key.onlineAccountId),
    secretKey: String(key.onlineSecretKey),
    abonoPct:  Math.min(100, Math.max(5, Math.round(Number(sys.onlineAbonoPct) || 50))),
    sandbox:   sys.onlineSandbox === true,
    sitio:     sys.onlineSitio || null,
    shopName:  sys.onlineShopName || null,
  };
}

// ════════════════════════════════════════════════════════════════════════════
//  ONBOARDING — callables de configuración (admin del tenant)
// ════════════════════════════════════════════════════════════════════════════

exports.tuuOnlineGuardarConfig = onCall(
  { region: REGION, cors: true },
  async (request) => {
    const data = request.data || {};
    const tenantId = data.tenantId;
    if (!tenantId) throw new HttpsError('invalid-argument', 'Falta tenantId.');
    assertTenantAdmin(request, tenantId);

    const accountId = String(data.accountId || '').trim();
    const secretKey = String(data.secretKey || '').trim();
    if (accountId.length < 4) throw new HttpsError('invalid-argument', 'ID de comercio invalido.');
    if (secretKey.length < 8) throw new HttpsError('invalid-argument', 'Llave secreta invalida (min 8 chars).');

    const abonoPct = Math.min(100, Math.max(5, Math.round(Number(data.abonoPct) || 50)));

    await db().collection('tenant_tuu').doc(String(tenantId)).set({
      onlineAccountId: accountId,
      onlineSecretKey: secretKey,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    await db().collection('_system').doc(`tuu_${tenantId}`).set({
      onlineConfigured: true,
      onlineEnabled: true,
      onlineAbonoPct: abonoPct,
      ...(typeof data.sandbox === 'boolean' ? { onlineSandbox: data.sandbox } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    return { ok: true, abonoPct };
  },
);

exports.tuuOnlineSetFlag = onCall(
  { region: REGION, cors: true },
  async (request) => {
    const data = request.data || {};
    const tenantId = data.tenantId;
    if (!tenantId) throw new HttpsError('invalid-argument', 'Falta tenantId.');
    assertTenantAdmin(request, tenantId);

    const patch = { updatedAt: FieldValue.serverTimestamp() };
    if (typeof data.onlineEnabled === 'boolean') patch.onlineEnabled = data.onlineEnabled;
    if (data.onlineAbonoPct !== undefined) {
      const pct = Math.round(Number(data.onlineAbonoPct));
      if (!Number.isFinite(pct) || pct < 5 || pct > 100) {
        throw new HttpsError('invalid-argument', 'El abono debe ser entre 5% y 100%.');
      }
      patch.onlineAbonoPct = pct;
    }
    if (Object.keys(patch).length === 1) {
      throw new HttpsError('invalid-argument', 'No hay flags para actualizar.');
    }
    await db().collection('_system').doc(`tuu_${tenantId}`).set(patch, { merge: true });
    return { ok: true };
  },
);

exports.tuuOnlineDesconectar = onCall(
  { region: REGION, cors: true },
  async (request) => {
    const tenantId = request.data && request.data.tenantId;
    if (!tenantId) throw new HttpsError('invalid-argument', 'Falta tenantId.');
    assertTenantAdmin(request, tenantId);

    // Solo borra las credenciales ONLINE — la config del POS presencial
    // (apiKey/seriales) del mismo doc queda intacta.
    await db().collection('tenant_tuu').doc(String(tenantId)).set({
      onlineAccountId: FieldValue.delete(),
      onlineSecretKey: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    await db().collection('_system').doc(`tuu_${tenantId}`).set({
      onlineConfigured: false,
      onlineEnabled: false,
      onlineDisconnectedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    return { ok: true };
  },
);

// ════════════════════════════════════════════════════════════════════════════
//  1) CREAR PAGO — el sitio público llama aquí al confirmar la reserva.
//     Recalcula el total server-side, aplica el % de abono del local, guarda
//     la reserva pendiente y devuelve la URL del checkout de TUU.
// ════════════════════════════════════════════════════════════════════════════
exports.tuuOnlineCrearPago = onRequest(
  { cors: true, region: REGION },
  async (req, res) => {
    try {
      if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

      const body     = req.body || {};
      const tenantId = String(body.tenantId || '');
      const cita     = body.cita;
      if (!tenantId) return res.status(400).json({ error: 'tenant_requerido' });
      if (!cita || !cita.servicioId || !cita.fecha || !cita.hora) {
        return res.status(400).json({ error: 'datos_incompletos' });
      }

      const cfg = await leerConfigOnline(tenantId);
      if (!cfg) return res.status(400).json({ error: 'tenant_no_habilitado' });

      const amountTotal = await calcularMontoReserva(tenantId, cita);
      if (!amountTotal || amountTotal < 500) return res.status(400).json({ error: 'monto_invalido' });
      // Abono = % del total; nunca menos de $500 (mínimo operativo de la
      // pasarela) ni más que el total.
      const abono = Math.min(amountTotal, Math.max(500, Math.round(amountTotal * cfg.abonoPct / 100)));

      const orderId = `${tenantId}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;

      await pagosPendientesCol(tenantId).doc(orderId).set({
        tenantId, cita,
        amount: abono,
        amountTotal,
        abonoPct: cfg.abonoPct,
        proveedor: 'tuu_online',
        estado: 'pending',
        sandbox: cfg.sandbox,
        creadoEn: FieldValue.serverTimestamp(),
      });

      const email = (cita.clienteEmail && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cita.clienteEmail))
        ? cita.clienteEmail : 'citas@synaptechspa.cl';
      const { nombre, apellido } = partirNombre(cita.clienteNombre);

      const fields = {
        x_account_id:          cfg.accountId,
        x_amount:              abono,
        x_currency:            'CLP',
        x_customer_email:      email,
        x_customer_first_name: nombre,
        x_customer_last_name:  apellido,
        x_customer_phone:      telefonoE164(cita.clienteTelefono),
        x_reference:           orderId,
        x_shop_name:           cfg.shopName || tenantId,
        x_description:         `Abono ${cfg.abonoPct}% reserva ${cita.servicioNombre || ''} ${cita.fecha} ${cita.hora}`.trim().slice(0, 120),
        x_url_callback:        `${FN_BASE}/tuuOnlineCallback`,
        x_url_complete:        `${FN_BASE}/tuuOnlineRetorno?ref=${encodeURIComponent(orderId)}`,
        x_url_cancel:          `${FN_BASE}/tuuOnlineRetorno?ref=${encodeURIComponent(orderId)}&cancel=1`,
      };
      fields.x_signature = firmarCampos(fields, cfg.secretKey);

      const endpoint = cfg.sandbox ? TUU_ONLINE_URL.sandbox : TUU_ONLINE_URL.prod;
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
      let resp; let raw = null; let text = null; let redirectLoc = null;
      try {
        // redirect manual: si la pasarela responde 30x, la URL del checkout
        // viene en Location (seguirla devolvería el HTML del checkout).
        resp = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-REDIRECT': 'false' },
          body: JSON.stringify(fields),
          signal: controller.signal,
          redirect: 'manual',
        });
        redirectLoc = resp.headers.get('location') || null;
        // El body se puede leer UNA sola vez: texto primero, JSON.parse después
        // (json()+text() encadenados dejaban el response consumido y raw null).
        try { text = await resp.text(); } catch (_) {}
        if (text) { try { raw = JSON.parse(text); } catch (_) {} }
      } finally { clearTimeout(t); }

      // Guardamos el response crudo SIEMPRE: el shape no está documentado y es
      // la única forma de refinar la extracción con datos reales (mismo truco
      // que _tuu.createResponse en el POS).
      await pagosPendientesCol(tenantId).doc(orderId).update({
        createResponse: raw || (text ? String(text).slice(0, 2000) : null),
        createStatus: resp ? resp.status : null,
        ...(redirectLoc ? { createRedirect: redirectLoc } : {}),
      }).catch(() => {});

      const esRedirect = resp && resp.status >= 300 && resp.status < 400 && redirectLoc;
      if (!resp || (!resp.ok && !esRedirect)) {
        logger.error('[TUU-online] crear pago falló', { tenantId, orderId, status: resp?.status, raw: raw || text });
        return res.status(502).json({ error: 'tuu_create_failed', detalle: raw || text });
      }

      // Extracción defensiva de la URL del checkout.
      const url = (raw && (raw.url || raw.redirect_url || raw.payment_url || raw.checkout_url
        || raw.redirectUrl || raw.paymentUrl || raw.x_url || (raw.data && (raw.data.url || raw.data.redirect_url))))
        || esRedirect && redirectLoc
        || (typeof text === 'string' && /^https?:\/\//.test(text.trim()) ? text.trim() : null);

      if (!url) {
        logger.error('[TUU-online] response sin URL de checkout', { tenantId, orderId, raw: raw || text });
        return res.status(502).json({ error: 'tuu_sin_url', detalle: raw || text });
      }

      logger.info('[TUU-online] pago creado', { tenantId, orderId, abono, amountTotal, pct: cfg.abonoPct, sandbox: cfg.sandbox });
      return res.json({ url, abono, total: amountTotal, pct: cfg.abonoPct });
    } catch (e) {
      logger.error('[TUU-online] crearPago error', e);
      return res.status(500).json({ error: 'internal', mensaje: e.message });
    }
  },
);

// ── Crear la cita real desde una reserva pendiente pagada (idempotente) ─────
//  Mismo esqueleto que confirmarReserva de mercadopago-pago.js, con la
//  metadata de abono: la cita nace Confirmada con pago.estado 'abonado' (o
//  'pagado' si el local cobra 100%) + abonoPagado/saldoPendiente top-level.
async function confirmarReservaAbonada(tid, orderId, cbFields) {
  const ref = pagosPendientesCol(tid).doc(orderId);

  const preSnap = await ref.get();
  if (!preSnap.exists) { logger.warn(`[TUU-online] pendiente ${orderId} no existe`); return null; }
  const preData = preSnap.data();
  if (preData.citaId) return preData.citaId; // idempotencia
  const preCita = preData.cita || {};

  let clienteUid = preCita.clienteUid || null;
  if (!clienteUid && preCita.clienteNombre && (preCita.clienteEmail || preCita.clienteTelefono)) {
    try {
      const r = await upsertClienteCore({
        tenantId: tid,
        nombre:   preCita.clienteNombre,
        email:    preCita.clienteEmail || '',
        telefono: preCita.clienteTelefono || '',
      });
      clienteUid = r?.uid || null;
    } catch (e) {
      logger.warn(`[TUU-online] upsertCliente falló para ${orderId} (rescate onCreate):`, e?.message || e);
    }
  }

  return db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return null;
    const data = snap.data();
    if (data.citaId) return data.citaId;

    const cita = data.cita || {};
    const abono = Number(data.amount) || 0;
    const total = Number(data.amountTotal) || abono;
    const saldo = Math.max(0, total - abono);
    const citaRef = citasCol(tid).doc();

    let lockId = cita.slotLockId || null;
    const debeLock = !!cita.barberoId && !!cita.fecha && !!cita.hora && cita.sobrecupo !== true;
    if (debeLock && !lockId) {
      const safeHora = String(cita.hora).replace(':', '');
      const safeBid  = String(cita.barberoId).replace(/[^a-zA-Z0-9_-]/g, '_');
      lockId = `${safeBid}_${cita.fecha}_${safeHora}`;
    }

    tx.set(citaRef, {
      ...cita,
      slotLockId: debeLock ? lockId : (cita.slotLockId || null),
      estado:   'Confirmada',
      origen:   cita.origen || 'web-tuu-online',
      creadoEn: FieldValue.serverTimestamp(),
      ...(clienteUid ? { clienteUid, userId: clienteUid } : {}),
      pago: {
        proveedor:  'tuu_online',
        estado:     saldo > 0 ? 'abonado' : 'pagado',
        monto:      abono,
        montoTotal: total,
        abonoPct:   data.abonoPct || null,
        referencia: orderId,
        fecha:      FieldValue.serverTimestamp(),
      },
      // Acceso directo para Agenda.jsx / agenda.html / Caja: restar el abono
      // del monto a cobrar al completar, sin bucear en pago.*.
      ...(saldo > 0 ? { abonoPagado: abono, saldoPendiente: saldo } : {}),
    });
    if (debeLock && lockId) {
      tx.set(slotLocksCol(tid).doc(lockId), {
        citaId:    citaRef.id,
        fecha:     cita.fecha,
        hora:      cita.hora,
        barberoId: cita.barberoId,
        duracion:  Number(cita.duracionServicio ?? cita.duracion) || 30,
        creadoEn:  FieldValue.serverTimestamp(),
        origen:    'tuu-online',
      });
    }
    tx.update(ref, {
      estado: 'paid',
      citaId: citaRef.id,
      pagadoEn: FieldValue.serverTimestamp(),
      callback: cbFields || null,
    });
    return citaRef.id;
  });
}

// ════════════════════════════════════════════════════════════════════════════
//  2) CALLBACK — notificación server-to-server de TUU (x_url_callback).
//     form-urlencoded, firmado con HMAC. Es LA fuente de verdad: si la firma
//     y el monto calzan y x_result=completed → se crea la cita. 200 rápido
//     para cortar los reintentos de TUU.
// ════════════════════════════════════════════════════════════════════════════
exports.tuuOnlineCallback = onRequest(
  { region: REGION },
  async (req, res) => {
    try {
      // TUU manda application/x-www-form-urlencoded (Express ya lo parsea).
      const fields = { ...(req.query || {}), ...(req.body || {}) };
      const orderId = String(fields.x_reference || '');
      if (!orderId) {
        logger.warn('[TUU-online] callback sin x_reference', { body: req.body, query: req.query });
        return res.status(200).send('no reference'); // 200: reintento no va a arreglarlo
      }

      const tid = orderId.split('-')[0];
      const keySnap = await db().collection('tenant_tuu').doc(tid).get();
      const secretKey = keySnap.exists ? keySnap.data().onlineSecretKey : null;
      if (!secretKey) {
        logger.error('[TUU-online] callback de tenant sin llave', { tid, orderId });
        return res.status(200).send('tenant sin config');
      }

      if (!firmaValida(fields, secretKey)) {
        logger.error('[TUU-online] callback con firma INVALIDA', { tid, orderId, fields });
        return res.status(401).send('bad signature');
      }

      const pendRef  = pagosPendientesCol(tid).doc(orderId);
      const pendSnap = await pendRef.get();
      if (!pendSnap.exists) {
        logger.warn('[TUU-online] callback de orden desconocida', { tid, orderId });
        return res.status(200).send('orden desconocida');
      }
      const pend = pendSnap.data();

      const result = String(fields.x_result || '').toLowerCase();
      const monto  = Math.round(Number(fields.x_amount) || 0);

      if (result === 'completed') {
        // El monto del callback debe calzar con el abono que pedimos cobrar.
        if (monto !== Number(pend.amount)) {
          logger.error('[TUU-online] callback completed con MONTO DISTINTO', {
            tid, orderId, esperado: pend.amount, recibido: monto,
          });
          await pendRef.set({ estado: 'monto_no_calza', callback: fields }, { merge: true });
          return res.status(200).send('monto no calza');
        }
        const citaId = await confirmarReservaAbonada(tid, orderId, fields);
        logger.info(`[TUU-online] ✓ abono confirmado ${orderId} → cita ${citaId}`);
        return res.status(200).send('OK');
      }

      await pendRef.set({
        estado: `tuu_${result || 'desconocido'}`,
        callback: fields,
        actualizadoEn: FieldValue.serverTimestamp(),
      }, { merge: true });
      logger.info(`[TUU-online] pago no completado ${orderId} result=${result}`);
      return res.status(200).send('OK');
    } catch (e) {
      logger.error('[TUU-online] callback error', e);
      // 500 → TUU reintenta (hasta 10 veces): correcto ante errores nuestros.
      return res.status(500).send('error');
    }
  },
);

// ── Página de resultado (neutra, tema oscuro SynapTech Studio) ──────────────
function paginaResultado({ ok, sitio, abono, cancelado }) {
  const titulo = ok ? 'Reserva confirmada' : (cancelado ? 'Pago cancelado' : 'Pago no completado');
  const icono  = ok ? '✓' : '✕';
  const color  = ok ? '#22c55e' : '#ef4444';
  const sub = ok
    ? `Tu abono${abono ? ` de $${Number(abono).toLocaleString('es-CL')}` : ''} se pagó con éxito y tu hora quedó reservada. El saldo se paga en el local. Te enviamos la confirmación por correo.`
    : 'No se completó el pago, por lo que tu hora no fue reservada. Puedes intentarlo nuevamente.';
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titulo}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0f172a;color:#e2e8f0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
  .card{max-width:420px;width:100%;text-align:center;background:#1e293b;border:1px solid #334155;border-radius:20px;padding:40px 28px}
  .badge{width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:30px;color:#0f172a;background:${color}}
  h1{font-size:20px;font-weight:600;margin-bottom:10px}
  p{font-size:14px;line-height:1.6;color:#94a3b8;margin-bottom:26px}
  a{display:inline-block;text-decoration:none;background:#e2e8f0;color:#0f172a;font-weight:600;font-size:14px;padding:12px 26px;border-radius:12px}
</style></head><body>
  <div class="card">
    <div class="badge">${icono}</div>
    <h1>${titulo}</h1>
    <p>${sub}</p>
    <a href="${sitio}">Volver al sitio</a>
  </div>
</body></html>`;
}

// ════════════════════════════════════════════════════════════════════════════
//  3) RETORNO — el navegador vuelve aquí tras el checkout (x_url_complete /
//     x_url_cancel). Solo UX: la verdad la dicta el callback. Mostramos el
//     estado real leyendo la orden pendiente.
// ════════════════════════════════════════════════════════════════════════════
exports.tuuOnlineRetorno = onRequest(
  { region: REGION },
  async (req, res) => {
    let ok = false; let abono = null; let sitio = 'https://synaptechspa.cl';
    const cancelado = req.query && req.query.cancel === '1';
    try {
      // TUU concatena sus parámetros al x_url_complete con '?' (no '&'), así
      // que `ref` llega como "orden?x_account_id=...": cortamos en el primer
      // '?' y usamos x_reference como respaldo (verificado en sandbox 08-08).
      const orderId = String((req.query && req.query.ref) || (req.query && req.query.x_reference) || '')
        .split('?')[0].split('&')[0];
      if (orderId) {
        const tid = orderId.split('-')[0];
        const sysSnap = await db().collection('_system').doc(`tuu_${tid}`).get();
        sitio = (sysSnap.exists && sysSnap.data().onlineSitio) || `https://${tid}.synaptechspa.cl`;
        // El callback puede llegar unos segundos después del redirect: damos
        // hasta ~6s de gracia releyendo antes de declarar "no completado".
        for (let i = 0; i < 3; i++) {
          const snap = await pagosPendientesCol(tid).doc(orderId).get();
          const d = snap.exists ? snap.data() : null;
          if (d && (d.estado === 'paid' || d.citaId)) { ok = true; abono = d.amount; break; }
          if (cancelado || (d && String(d.estado).startsWith('tuu_'))) break;
          await new Promise(r => setTimeout(r, 2000));
        }
      }
    } catch (e) {
      logger.error('[TUU-online] retorno error', e);
    }
    res.set('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(paginaResultado({ ok, sitio, abono, cancelado }));
  },
);
