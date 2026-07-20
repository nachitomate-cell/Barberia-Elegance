'use strict';

// functions/mensualidad-mp.js
// ─────────────────────────────────────────────────────────────────────────────
//  PAGO AUTOMÁTICO DE LA MENSUALIDAD — Suscripciones de Mercado Pago.
//
//  SynapTech cobra la mensualidad a cada local con cargo automático mensual a
//  la tarjeta del dueño, vía Suscripciones MP (preapproval_plan + checkout).
//  El dinero entra a la cuenta MP de SYNAPTECH: MP_PLATFORM_ACCESS_TOKEN,
//  app "bioo12" (6764890748674836) — la misma de los cobros single-seller de
//  bioo. ⚠ NO usar MP_ACCESS_TOKEN aquí: ese token es de la app de YÜGEN
//  (4270046524878802, cuenta de Dusan) y la plata caería en su cuenta.
//  Tampoco las cuentas OAuth de los tenants (tenant_mp).
//
//  Flujo:
//    1) El dueño toca "Activar pago automático" en /gestion-interna/mensualidad
//       → mpMensualidadCrearLink crea un preapproval_plan con el monto de
//       _billing/{tid}.montoPendiente y devuelve el init_point.
//    2) El dueño ingresa su tarjeta UNA vez en el checkout de MP.
//    3) MP cobra solo cada mes y notifica a mpMensualidadWebhook:
//       · subscription_preapproval          → alta/cambio de estado de la suscripción
//       · subscription_authorized_payment   → resultado de cada cobro mensual
//       Cobro aprobado → _billing/{tid}: estadoPago 'al_dia', fechaProximoPago =
//       próximo débito real de MP, cuota del mes marcada pagada, comprobante por
//       email (Resend). Cobro rechazado → queda anotado y la escalera de avisos
//       existente (recordatorioCobro) hace el resto.
//
//  El estado vive en _billing/{tid}.suscripcionMp:
//    { planId, initPoint, status, monto, preapprovalId, payerEmail,
//      nextPaymentDate, ultimoPago, creadoEn, ... }
//  status: 'link_creado' → 'authorized' → ('paused'|'cancelled')
//
//  Cada cobro queda además en _billing/{tid}/pagosAuto/{authorizedPaymentId}
//  (idempotencia: si MP reenvía el webhook, no se procesa dos veces).
//
//  CONFIGURACIÓN MANUAL (una vez, en el panel de desarrolladores de MP,
//  cuenta SynapTech Spa → aplicación "bioo12"):
//    Webhooks → Modo productivo → agregar
//      https://us-central1-barberia-elegance.cloudfunctions.net/mpMensualidadWebhook
//    con los eventos de "Planes y suscripciones".
//
//  DEPLOY:
//    firebase deploy --only functions:mpMensualidadCrearLink,functions:mpMensualidadWebhook,functions:mpMensualidadCancelar
// ─────────────────────────────────────────────────────────────────────────────

const { onRequest, onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret }                  = require('firebase-functions/params');
const { logger }                        = require('firebase-functions');
const admin                             = require('firebase-admin');
const { FieldValue }                    = require('firebase-admin/firestore');

const db = admin.firestore();

const MP_PLATFORM_ACCESS_TOKEN = defineSecret('MP_PLATFORM_ACCESS_TOKEN');
const RESEND_API_KEY  = defineSecret('RESEND_API_KEY');

const MP_API    = 'https://api.mercadopago.com';
const MAIL_FROM = 'SynapTech <cobros@synaptechspa.cl>';

// La app bioo12 admite UNA sola URL de webhook a nivel de aplicación, y antes
// de este módulo apuntaba a mpBioWebhook (evento "Pagos"). Ahora la URL de la
// app apunta aquí, y todo evento que NO sea de suscripciones se reenvía tal
// cual a mpBioWebhook — comportamiento idéntico al anterior para bioo.
// (Los flujos de pago además traen notification_url por preferencia, así que
// este forward es cinturón y tirantes.)
const BIO_WEBHOOK_URL = 'https://us-central1-barberia-elegance.cloudfunctions.net/mpBioWebhook';

const BOOTSTRAP_ADMINS = ['ignaciiio.mate@gmail.com'];

// Monto mínimo defensivo: nadie paga una mensualidad de menos de $1.000 CLP;
// evita crear suscripciones con un _billing a medio configurar.
const MONTO_MINIMO = 1000;

// ── Helpers ─────────────────────────────────────────────────────────────────

async function mpRequest(method, endpoint, token, { body } = {}) {
  const headers = { Authorization: `Bearer ${token}` };
  if (body) headers['Content-Type'] = 'application/json';
  const res  = await fetch(`${MP_API}${endpoint}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { _raw: text }; }
  return { httpStatus: res.status, json };
}

const settingsRef = tid => (tid === 'elegance'
  ? db.collection('settings').doc('general')
  : db.collection(`tenants/${tid}/settings`).doc('general'));

const barberosCol = tid => (tid === 'elegance'
  ? db.collection('barberos')
  : db.collection(`tenants/${tid}/barberos`));

// Admin del tenant: bootstrap → claims {role,tenantId} → doc barberos/{uid}
// (con salto por _mainDocId, mismo criterio que AuthContext del panel).
async function esAdminDelTenant(auth, tid) {
  if (!auth || !auth.uid) return false;
  const email = String((auth.token && auth.token.email) || '').toLowerCase();
  if (BOOTSTRAP_ADMINS.includes(email)) return true;
  if (auth.token && auth.token.role === 'admin' && auth.token.tenantId === tid) return true;
  try {
    let snap = await barberosCol(tid).doc(auth.uid).get();
    if (snap.exists && snap.data()._mainDocId) {
      snap = await barberosCol(tid).doc(String(snap.data()._mainDocId)).get();
    }
    return snap.exists && snap.data().rol === 'admin';
  } catch (_) { return false; }
}

async function nombreLocal(tid) {
  try {
    const s = await settingsRef(tid).get();
    if (s.exists && s.data().nombre) return String(s.data().nombre).trim();
  } catch (_) {}
  try {
    const t = await db.doc(`tenants/${tid}`).get();
    if (t.exists && t.data().nombre) return String(t.data().nombre).trim();
  } catch (_) {}
  return tid;
}

// Destinatarios del comprobante — MISMO orden que recordatorio-cobro.js:
// emailAvisos (lo edita el dueño) → _billing.emailCobro → tenants/{tid}.ownerEmail.
// NUNCA correos de barberos/ (son credenciales de login, muchos inventados).
async function emailsComprobante(tid, billing) {
  const limpia = v => {
    const arr = Array.isArray(v) ? v : (typeof v === 'string' ? [v] : []);
    return [...new Set(arr.map(e => String(e || '').trim().toLowerCase()).filter(e => e.includes('@')))];
  };
  try {
    const s = await settingsRef(tid).get();
    if (s.exists) {
      const avisos = limpia(s.data().emailAvisos);
      if (avisos.length) return avisos;
    }
  } catch (_) {}
  const cobro = limpia(billing && billing.emailCobro);
  if (cobro.length) return cobro;
  try {
    const t = await db.doc(`tenants/${tid}`).get();
    if (t.exists) {
      const owner = limpia(t.data().ownerEmail);
      if (owner.length) return owner;
    }
  } catch (_) {}
  return [];
}

async function sendResend(apiKey, payload) {
  const res  = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Resend error ${res.status}: ${JSON.stringify(body)}`);
  return body;
}

function clp(n) { return '$' + Number(n || 0).toLocaleString('es-CL'); }

function htmlComprobante({ local, monto, fecha, proximo }) {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;background:#0b1220;color:#e2e8f0;border-radius:14px;overflow:hidden;border:1px solid #1e293b;">
    <div style="padding:22px 26px;border-bottom:1px solid #1e293b;">
      <p style="margin:0;font-size:12px;letter-spacing:3px;color:#34d399;font-weight:bold;">SYNAPTECH</p>
      <h2 style="margin:6px 0 0;font-size:19px;color:#f8fafc;">Pago automático recibido ✓</h2>
    </div>
    <div style="padding:22px 26px;">
      <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#cbd5e1;">
        Recibimos el pago de la mensualidad de <b style="color:#f8fafc;">${local}</b>.
        No tienes que hacer nada: tu suscripción sigue activa y todos los servicios funcionando.
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:7px 0;color:#64748b;">Monto</td><td style="padding:7px 0;text-align:right;color:#f8fafc;font-weight:bold;">${clp(monto)}</td></tr>
        <tr><td style="padding:7px 0;color:#64748b;">Fecha</td><td style="padding:7px 0;text-align:right;">${fecha}</td></tr>
        ${proximo ? `<tr><td style="padding:7px 0;color:#64748b;">Próximo cobro</td><td style="padding:7px 0;text-align:right;">${proximo}</td></tr>` : ''}
        <tr><td style="padding:7px 0;color:#64748b;">Medio</td><td style="padding:7px 0;text-align:right;">Cargo automático · Mercado Pago</td></tr>
      </table>
      <p style="margin:18px 0 0;font-size:12px;color:#64748b;line-height:1.6;">
        ¿Dudas o quieres cambiar el medio de pago? Escríbenos al WhatsApp +56 9 8356 8212.
      </p>
    </div>
    <div style="padding:14px 26px;background:#0f172a;font-size:11px;color:#475569;">
      Powered by SynapTech SpA · synaptechspa.cl
    </div>
  </div>`;
}

// Fecha YYYY-MM-DD en horario de Chile.
function hoyChile() {
  const dtf = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' });
  return dtf.format(new Date());
}

// Resuelve a qué tenant pertenece una suscripción/plan de MP.
// 1º por external_reference (el plan se crea con external_reference = tenantId);
// 2º escaneando _billing (pocas decenas de docs) por preapprovalId / planId.
async function tenantPorSuscripcion({ externalRef, preapprovalId, planId }) {
  if (externalRef) {
    try {
      const d = await db.doc(`_billing/${externalRef}`).get();
      if (d.exists) return externalRef;
    } catch (_) {}
  }
  try {
    const snap = await db.collection('_billing').get();
    for (const d of snap.docs) {
      const s = d.data().suscripcionMp;
      if (!s) continue;
      if (preapprovalId && s.preapprovalId === preapprovalId) return d.id;
      if (planId && (s.planId === planId)) return d.id;
    }
  } catch (e) { logger.warn('[MPmens] scan _billing falló', e.message); }
  return null;
}

// ════════════════════════════════════════════════════════════════════════════
//  1) CREAR LINK — callable desde /gestion-interna/mensualidad
//     Crea el preapproval_plan del tenant (monto server-side desde _billing)
//     y devuelve el init_point para que el dueño ingrese su tarjeta.
// ════════════════════════════════════════════════════════════════════════════
exports.mpMensualidadCrearLink = onCall(
  { secrets: [MP_PLATFORM_ACCESS_TOKEN], region: 'us-central1', cors: true },
  async (request) => {
    const tid = String(request.data?.tenantId || '').trim();
    if (!tid) throw new HttpsError('invalid-argument', 'Falta tenantId.');
    if (!(await esAdminDelTenant(request.auth, tid))) {
      throw new HttpsError('permission-denied', 'Solo el administrador del local puede activar el pago automático.');
    }

    const bSnap   = await db.doc(`_billing/${tid}`).get();
    const billing = bSnap.exists ? bSnap.data() : {};
    const monto   = Math.round(Number(billing.montoPendiente) || 0);
    if (monto < MONTO_MINIMO) {
      throw new HttpsError('failed-precondition', 'La mensualidad de este local aún no está configurada. Escríbenos por WhatsApp.');
    }

    const sub = billing.suscripcionMp || null;
    if (sub && sub.status === 'authorized') {
      throw new HttpsError('failed-precondition', 'El pago automático ya está activo.');
    }
    // Link vigente con el mismo monto → reusar (evita un plan nuevo por cada clic).
    if (sub && sub.status === 'link_creado' && sub.initPoint && Number(sub.monto) === monto) {
      return { url: sub.initPoint };
    }

    // back_url: origen del panel que llamó, validado contra nuestros dominios.
    const origen  = String(request.data?.origen || '');
    const origenOk = /^https:\/\/([a-z0-9-]+\.)?(synaptechspa\.cl|yugenstudio\.cl)$/.test(origen);
    const backUrl = `${origenOk ? origen : 'https://barberiaelegance.synaptechspa.cl'}/gestion-interna/mensualidad?local=${encodeURIComponent(tid)}&autopay=ok`;

    const local = await nombreLocal(tid);
    const plan  = {
      reason:             `Mensualidad SynapTech · ${local}`.slice(0, 250),
      external_reference: tid,
      back_url:           backUrl,
      auto_recurring: {
        frequency:          1,
        frequency_type:     'months',
        transaction_amount: monto,
        currency_id:        'CLP',
      },
    };

    const { httpStatus, json } = await mpRequest('POST', '/preapproval_plan', MP_PLATFORM_ACCESS_TOKEN.value(), { body: plan });
    if (httpStatus >= 300 || !json || !json.init_point || !json.id) {
      logger.error('[MPmens] crear plan falló', JSON.stringify(json));
      throw new HttpsError('internal', 'Mercado Pago no pudo crear la suscripción. Intenta de nuevo.');
    }

    await db.doc(`_billing/${tid}`).set({
      suscripcionMp: {
        planId:    json.id,
        initPoint: json.init_point,
        status:    'link_creado',
        monto,
        creadoEn:  FieldValue.serverTimestamp(),
        creadoPor: String((request.auth.token && request.auth.token.email) || request.auth.uid),
      },
    }, { merge: true });

    logger.info(`[MPmens] plan creado ${tid} → ${json.id} (${clp(monto)}/mes)`);
    return { url: json.init_point };
  },
);

// ════════════════════════════════════════════════════════════════════════════
//  2) WEBHOOK — eventos de "Planes y suscripciones" de MP
//     (configurar la URL en el panel de la aplicación de MP — ver cabecera)
// ════════════════════════════════════════════════════════════════════════════

// Alta / cambio de estado de la suscripción (authorized, paused, cancelled…)
async function procesarPreapproval(preapprovalId, token) {
  const { json: pre } = await mpRequest('GET', `/preapproval/${preapprovalId}`, token);
  if (!pre || !pre.id) { logger.warn(`[MPmens] preapproval ${preapprovalId} no encontrado`); return; }

  const tid = await tenantPorSuscripcion({
    externalRef:   pre.external_reference || null,
    preapprovalId: pre.id,
    planId:        pre.preapproval_plan_id || null,
  });
  if (!tid) { logger.warn(`[MPmens] preapproval ${preapprovalId} sin tenant (ext=${pre.external_reference || '—'})`); return; }

  const next = String(pre.next_payment_date || (pre.summarized && pre.summarized.next_payment_date) || '').slice(0, 10) || null;
  await db.doc(`_billing/${tid}`).set({
    suscripcionMp: {
      preapprovalId:   pre.id,
      status:          pre.status || 'unknown',
      payerEmail:      pre.payer_email || null,
      nextPaymentDate: next,
      actualizadoEn:   FieldValue.serverTimestamp(),
    },
  }, { merge: true });
  logger.info(`[MPmens] preapproval ${pre.id} → ${tid} status=${pre.status}`);
}

// Resultado de un cobro mensual. Idempotente por authorizedPaymentId.
async function procesarCobro(authorizedPaymentId, token, resendKey) {
  const { json: ap } = await mpRequest('GET', `/authorized_payments/${authorizedPaymentId}`, token);
  if (!ap || !ap.id) { logger.warn(`[MPmens] authorized_payment ${authorizedPaymentId} no encontrado`); return; }

  const preId = ap.preapproval_id || null;
  const tid   = await tenantPorSuscripcion({ externalRef: ap.external_reference || null, preapprovalId: preId });
  if (!tid) { logger.warn(`[MPmens] cobro ${authorizedPaymentId} sin tenant (pre=${preId || '—'})`); return; }

  const pagoStatus = String((ap.payment && ap.payment.status) || ap.status || '').toLowerCase();
  const monto      = Math.round(Number(ap.transaction_amount) || 0);
  const billingRef = db.doc(`_billing/${tid}`);

  if (pagoStatus !== 'approved') {
    // Cobro fallido: se anota y la escalera de avisos existente hace el resto.
    await billingRef.set({
      suscripcionMp: {
        ultimoPago: { status: pagoStatus || 'rejected', monto, fecha: hoyChile(), authorizedPaymentId: String(ap.id) },
        actualizadoEn: FieldValue.serverTimestamp(),
      },
    }, { merge: true });
    logger.info(`[MPmens] cobro NO aprobado ${tid} status=${pagoStatus}`);
    return;
  }

  // Próximo débito real según MP (para correr fechaProximoPago con la verdad).
  let next = null;
  if (preId) {
    try {
      const { json: pre } = await mpRequest('GET', `/preapproval/${preId}`, token);
      next = String((pre && (pre.next_payment_date || (pre.summarized && pre.summarized.next_payment_date))) || '').slice(0, 10) || null;
    } catch (_) {}
  }

  const hoy      = hoyChile();
  const mesActual = hoy.slice(0, 7);   // YYYY-MM
  const reciboRef = billingRef.collection('pagosAuto').doc(String(ap.id));

  const yaProcesado = await db.runTransaction(async (tx) => {
    const recibo = await tx.get(reciboRef);
    if (recibo.exists) return true;                       // MP reintentó el webhook
    const bSnap   = await tx.get(billingRef);
    const billing = bSnap.exists ? bSnap.data() : {};

    // Marcar la cuota del mes como pagada (si el superadmin lleva cuotas[]).
    let cuotas = Array.isArray(billing.cuotas) ? billing.cuotas.map(c => ({ ...c })) : [];
    const idx  = cuotas.findIndex(c => c && c.mes === mesActual && !c.pagada);
    if (idx !== -1) cuotas[idx] = { ...cuotas[idx], pagada: true };

    tx.set(reciboRef, {
      monto,
      mpPaymentId:   (ap.payment && ap.payment.id) ? String(ap.payment.id) : null,
      preapprovalId: preId,
      fecha:         hoy,
      creadoEn:      FieldValue.serverTimestamp(),
    });
    tx.set(billingRef, {
      estadoPago: 'al_dia',
      ...(next ? { fechaProximoPago: next } : {}),
      ...(cuotas.length ? { cuotas } : {}),
      suscripcionMp: {
        status:          'authorized',
        preapprovalId:   preId || (billing.suscripcionMp && billing.suscripcionMp.preapprovalId) || null,
        nextPaymentDate: next,
        ultimoPago:      { status: 'approved', monto, fecha: hoy, authorizedPaymentId: String(ap.id) },
        actualizadoEn:   FieldValue.serverTimestamp(),
      },
    }, { merge: true });
    return false;
  });

  if (yaProcesado) { logger.info(`[MPmens] cobro ${ap.id} ya estaba procesado (${tid})`); return; }
  logger.info(`[MPmens] ✓ cobro aprobado ${tid} ${clp(monto)} próximo=${next || '—'}`);

  // Comprobante por email — best-effort, nunca rompe el webhook.
  try {
    const bSnap   = await billingRef.get();
    const billing = bSnap.exists ? bSnap.data() : {};
    const emails  = await emailsComprobante(tid, billing);
    if (emails.length && resendKey) {
      const local = await nombreLocal(tid);
      await sendResend(resendKey, {
        from:    MAIL_FROM,
        to:      emails,
        subject: `Pago automático recibido · ${local} (${clp(monto)})`,
        html:    htmlComprobante({ local, monto, fecha: hoy, proximo: next }),
      });
      logger.info(`[MPmens] comprobante enviado a ${emails.join(', ')}`);
    }
  } catch (e) { logger.warn(`[MPmens] comprobante falló: ${e.message}`); }
}

exports.mpMensualidadWebhook = onRequest(
  { secrets: [MP_PLATFORM_ACCESS_TOKEN, RESEND_API_KEY], region: 'us-central1' },
  async (req, res) => {
    try {
      const q    = req.query || {};
      const body = req.body  || {};
      const type = String(q.type || q.topic || body.type || body.topic || '').toLowerCase();
      const id   = q['data.id'] || q.id || (body.data && body.data.id) || null;

      if (type.includes('subscription_authorized_payment') || type.includes('authorized_payment')) {
        if (!id) return res.status(200).send('no id');
        await procesarCobro(String(id), MP_PLATFORM_ACCESS_TOKEN.value(), RESEND_API_KEY.value());
      } else if (type.includes('subscription_preapproval_plan')) {
        // Evento del PLAN (alta/edición), no de una suscripción: su data.id es un
        // plan id — consultarlo como preapproval solo generaría 404 y ruido.
        return res.status(200).send('ignored');
      } else if (type.includes('subscription_preapproval') || type === 'preapproval') {
        if (!id) return res.status(200).send('no id');
        await procesarPreapproval(String(id), MP_PLATFORM_ACCESS_TOKEN.value());
      } else {
        // Evento ajeno a suscripciones (ej: "Pagos" de bioo) → reenviar a
        // mpBioWebhook, que era el destino original de la URL de la app.
        try {
          const qs = new URLSearchParams(q).toString();
          await fetch(`${BIO_WEBHOOK_URL}${qs ? '?' + qs : ''}`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(body),
          });
        } catch (e) { logger.warn('[MPmens] forward a mpBioWebhook falló:', e.message); }
        return res.status(200).send('forwarded');
      }
      return res.status(200).send('OK');
    } catch (e) {
      logger.error('[MPmens] webhook error', e);
      return res.status(500).send('error');
    }
  },
);

// ════════════════════════════════════════════════════════════════════════════
//  3) CANCELAR — callable (dueño del local o superadmin)
//     Cancela la suscripción en MP; el local vuelve a transferencia manual.
// ════════════════════════════════════════════════════════════════════════════
exports.mpMensualidadCancelar = onCall(
  { secrets: [MP_PLATFORM_ACCESS_TOKEN], region: 'us-central1', cors: true },
  async (request) => {
    const tid = String(request.data?.tenantId || '').trim();
    if (!tid) throw new HttpsError('invalid-argument', 'Falta tenantId.');
    if (!(await esAdminDelTenant(request.auth, tid))) {
      throw new HttpsError('permission-denied', 'Solo el administrador del local puede cancelar el pago automático.');
    }

    const bSnap = await db.doc(`_billing/${tid}`).get();
    const sub   = (bSnap.exists && bSnap.data().suscripcionMp) || null;
    if (!sub) throw new HttpsError('failed-precondition', 'Este local no tiene pago automático configurado.');

    // Solo link creado (nadie se suscribió aún) → basta con limpiar el estado.
    if (sub.preapprovalId) {
      const { httpStatus, json } = await mpRequest('PUT', `/preapproval/${sub.preapprovalId}`, MP_PLATFORM_ACCESS_TOKEN.value(), {
        body: { status: 'cancelled' },
      });
      if (httpStatus >= 300) {
        logger.error('[MPmens] cancelar falló', JSON.stringify(json));
        throw new HttpsError('internal', 'Mercado Pago no pudo cancelar la suscripción. Intenta de nuevo.');
      }
    }

    await db.doc(`_billing/${tid}`).set({
      suscripcionMp: {
        status:       'cancelled',
        canceladoEn:  FieldValue.serverTimestamp(),
        canceladoPor: String((request.auth.token && request.auth.token.email) || request.auth.uid),
      },
    }, { merge: true });

    logger.info(`[MPmens] suscripción cancelada ${tid}`);
    return { ok: true };
  },
);
