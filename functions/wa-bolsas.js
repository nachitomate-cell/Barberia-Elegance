'use strict';

// functions/wa-bolsas.js
// ─────────────────────────────────────────────────────────────────────────────
//  BOLSAS DE MENSAJES — canal oficial de WhatsApp (plantillas Meta)
//
//  El plan del canal oficial NO es tarifa plana: el local compra una BOLSA de
//  mensajes y cada plantilla enviada (confirmación al reservar + recordatorio
//  24h) descuenta 1. Sin saldo, no sale nada — fail-closed: nadie le genera
//  costo Meta a SynapTech sin haber pagado su bolsa. El candado y el descuento
//  viven en whatsapp-notif.js (junto a los otros 4 candados del canal).
//
//  Flujo de compra (self-service desde /gestion-interna → WhatsApp):
//    1) El dueño elige bolsa → waBolsaCrearLink crea una preferencia de
//       Checkout Pro por precio NETO + 19% IVA. La plata entra a la cuenta MP
//       de SYNAPTECH (MP_PLATFORM_ACCESS_TOKEN, app "bioo12" — la misma de la
//       mensualidad; ⚠ jamás MP_ACCESS_TOKEN, que es de Yügen/Dusan).
//    2) MP notifica a waBolsaWebhook (notification_url POR PREFERENCIA, así
//       no depende de la URL de webhook a nivel de app).
//    3) Pago aprobado → wa_notif/{tid}: bolsaSaldo += mensajes y se encienden
//       planCliente + planRecordatorio (la primera compra ACTIVA el módulo).
//       Idempotencia en wa_bolsa_pagos/{paymentId}: un reintento de MP no
//       acredita dos veces. Aviso por correo a SynapTech con cada compra.
//
//  Catálogo: _system/whatsapp_notif.bolsas (editable sin deploy). Los precios
//  son NETOS; el +IVA se muestra en el panel y se cobra en MP.
// ─────────────────────────────────────────────────────────────────────────────

const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret }                  = require('firebase-functions/params');
const { logger }                        = require('firebase-functions');
const admin                             = require('firebase-admin');
const { FieldValue }                    = require('firebase-admin/firestore');
const { esBootstrap }                   = require('./lib/operadores');
const { enviarEmail, MAIL_SECRETS }     = require('./lib/mailer');

const db = admin.firestore();

const MP_PLATFORM_ACCESS_TOKEN = defineSecret('MP_PLATFORM_ACCESS_TOKEN');
const MP_API      = 'https://api.mercadopago.com';
const IVA         = 0.19;
const WEBHOOK_URL = 'https://us-central1-barberia-elegance.cloudfunctions.net/waBolsaWebhook';
const PANEL_URL   = 'https://app.synaptechspa.cl/gestion-interna/';
const MAIL_OPS    = ['ignaciiio.mate@gmail.com'];

// Catálogo por defecto (NETO, CLP). El costo Meta es ~US$0,02/mensaje (~$19
// CLP), así que hasta la bolsa chica deja margen sano. Se pisa completo con
// _system/whatsapp_notif.bolsas si Ignacio quiere otros tramos o precios.
const BOLSAS_DEFAULT = [
  { id: 'b100', mensajes: 100, precio: 9990 },
  { id: 'b300', mensajes: 300, precio: 24990 },
  { id: 'b800', mensajes: 800, precio: 54990 },
];

const conIva = (neto) => Math.round(Number(neto) * (1 + IVA));

/** Catálogo vigente, saneado (una bolsa sin id/mensajes/precio se descarta). */
function bolsasDe(cfg) {
  const raw = Array.isArray(cfg?.bolsas) && cfg.bolsas.length ? cfg.bolsas : BOLSAS_DEFAULT;
  return raw
    .map(b => ({
      id:       String(b.id || '').trim(),
      mensajes: Math.round(Number(b.mensajes) || 0),
      precio:   Math.round(Number(b.precio) || 0),
    }))
    .filter(b => b.id && b.mensajes > 0 && b.precio >= 1000)
    .map(b => ({ ...b, precioConIva: conIva(b.precio) }));
}
exports._bolsasDe = bolsasDe;
exports._BOLSAS_DEFAULT = BOLSAS_DEFAULT;

/* ─────────────── 1) Crear link de pago (Checkout Pro) ─────────────── */

exports.waBolsaCrearLink = onCall(
  { region: 'us-central1', cors: true, secrets: [MP_PLATFORM_ACCESS_TOKEN] },
  async (req) => {
    if (!req.auth) throw new HttpsError('unauthenticated', 'Inicia sesión.');
    const claims = req.auth.token || {};
    const boot   = esBootstrap(claims.email);
    let tid      = claims.tenantId || null;
    if (boot && req.data?.tenantId) tid = String(req.data.tenantId);
    if (!tid) throw new HttpsError('permission-denied', 'Cuenta sin local asociado.');
    if (!boot && !['admin', 'jefe'].includes(claims.role || '')) {
      throw new HttpsError('permission-denied', 'Solo administradores del local.');
    }

    const cfg   = (await db.doc('_system/whatsapp_notif').get()).data() || {};
    const bolsa = bolsasDe(cfg).find(b => b.id === String(req.data?.bolsaId || ''));
    if (!bolsa) throw new HttpsError('invalid-argument', 'Esa bolsa no existe.');

    const nombreLocal = (await db.doc(`tenants/${tid}`).get()).data()?.nombre || tid;

    const pref = {
      items: [{
        title:       `WhatsApp oficial · Bolsa de ${bolsa.mensajes} mensajes · ${nombreLocal}`,
        description: `Confirmaciones y recordatorios de cita por WhatsApp oficial (incluye IVA)`,
        quantity:    1,
        currency_id: 'CLP',
        unit_price:  bolsa.precioConIva,
      }],
      external_reference: `wabolsa|${tid}|${bolsa.id}|${bolsa.mensajes}`,
      notification_url:   WEBHOOK_URL,
      back_urls: { success: PANEL_URL, pending: PANEL_URL, failure: PANEL_URL },
      auto_return: 'approved',
      statement_descriptor: 'SYNAPTECH',
      metadata: { tid, bolsaId: bolsa.id, mensajes: bolsa.mensajes, neto: bolsa.precio },
    };

    const r = await fetch(`${MP_API}/checkout/preferences`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${MP_PLATFORM_ACCESS_TOKEN.value()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pref),
    });
    const j = await r.json();
    if (!r.ok || !j.init_point) {
      logger.error(`[wa-bolsa] preferencia falló tid=${tid}:`, JSON.stringify(j).slice(0, 300));
      throw new HttpsError('internal', 'No se pudo crear el link de pago. Reintenta en unos minutos.');
    }

    logger.info(`[wa-bolsa] link creado tid=${tid} bolsa=${bolsa.id} ($${bolsa.precioConIva} IVA inc.)`);
    return { ok: true, initPoint: j.init_point, bolsa };
  },
);

/* ─────────────── 2) Webhook — acredita la bolsa al aprobarse ───────────────
   La validación es por CONSULTA, no por firma: pase lo que pase en el POST,
   el saldo solo se acredita si la API de MP (con NUESTRO token) confirma un
   pago approved con external_reference nuestro. Un request forjado no puede
   fabricar esa respuesta. */

exports.waBolsaWebhook = onRequest(
  { region: 'us-central1', secrets: [MP_PLATFORM_ACCESS_TOKEN, ...MAIL_SECRETS], cors: false },
  async (req, res) => {
    try {
      const q = req.query || {};
      const b = req.body || {};
      const tipo = String(q.type || q.topic || b.type || b.topic || '');
      const payId = String(b?.data?.id || q['data.id'] || q.id || '');
      if (!/payment/.test(tipo) || !payId) { res.status(200).send('ok'); return; }

      const r = await fetch(`${MP_API}/v1/payments/${payId}`, {
        headers: { Authorization: `Bearer ${MP_PLATFORM_ACCESS_TOKEN.value()}` },
      });
      if (!r.ok) { res.status(200).send('ok'); return; }   // id ajeno o borrado: nada que hacer
      const pago = await r.json();

      const ref = String(pago.external_reference || '');
      if (!ref.startsWith('wabolsa|')) { res.status(200).send('ok'); return; }  // pago de otro flujo de la app
      if (pago.status !== 'approved')  { res.status(200).send('ok'); return; }

      const [, tid, bolsaId, mensajesRaw] = ref.split('|');
      const mensajes = Math.round(Number(mensajesRaw) || 0);
      if (!tid || mensajes <= 0) { res.status(200).send('ok'); return; }

      // Idempotencia: MP reintenta webhooks — el ledger decide una sola vez.
      const ledger = db.doc(`wa_bolsa_pagos/${payId}`);
      const acreditado = await db.runTransaction(async (tx) => {
        const s = await tx.get(ledger);
        if (s.exists) return false;
        tx.set(ledger, {
          tid, bolsaId, mensajes,
          monto:    Number(pago.transaction_amount) || 0,
          payerEmail: pago.payer?.email || '',
          creadoEn: FieldValue.serverTimestamp(),
        });
        tx.set(db.doc(`wa_notif/${tid}`), {
          bolsaSaldo:  FieldValue.increment(mensajes),
          // La primera compra ACTIVA el módulo completo; las siguientes solo recargan.
          planCliente:      true,
          planRecordatorio: true,
          bolsaUltimaCompra: { bolsaId, mensajes, monto: Number(pago.transaction_amount) || 0, paymentId: payId },
          bolsaUltimaCompraEn: FieldValue.serverTimestamp(),
        }, { merge: true });
        return true;
      });

      if (acreditado) {
        logger.info(`[wa-bolsa] ✅ ${tid}: +${mensajes} mensajes (pago ${payId}, $${pago.transaction_amount})`);
        await enviarEmail({
          from: 'SynapTech <cobros@synaptechspa.cl>',
          to:   MAIL_OPS,
          subject: `💰 ${tid} compró bolsa de ${mensajes} mensajes WhatsApp ($${Number(pago.transaction_amount).toLocaleString('es-CL')})`,
          html: `<div style="font-family:system-ui,sans-serif;max-width:520px">
              <h2 style="font-size:16px">Bolsa acreditada automáticamente</h2>
              <p style="font-size:14px;line-height:1.6">Local: <b>${tid}</b><br>
              Bolsa: <b>${bolsaId}</b> (+${mensajes} mensajes)<br>
              Pago MP: <b>${payId}</b> · $${Number(pago.transaction_amount).toLocaleString('es-CL')} (IVA incluido)<br>
              El módulo quedó activo y el saldo cargado — no hay nada que hacer a mano.</p>
              <p style="font-size:12px;color:#666">Detalle en <a href="https://ops.synaptechspa.cl">ops.synaptechspa.cl</a>.</p>
            </div>`,
        }, { grupo: 'interno', etiqueta: 'wa-bolsa-compra', silencioso: true }).catch((e) =>
          logger.warn('[wa-bolsa] correo aviso:', e.message));
      }

      res.status(200).send('ok');
    } catch (e) {
      logger.error('[wa-bolsa] webhook:', e.message);
      // 200 igual: si acumulamos errores MP reintenta en ráfaga y no ganamos nada.
      res.status(200).send('ok');
    }
  },
);
