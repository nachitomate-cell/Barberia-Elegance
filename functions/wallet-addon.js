'use strict';

// functions/wallet-addon.js
// ─────────────────────────────────────────────────────────────────────────────
//  ADD-ON WALLET — checkout self-service $9.990/mes
//
//  Antes: el dueño tocaba "Quiero esto" y se abría WhatsApp a Ignacio, que
//  activaba _billing/{tid}.walletActivo=true a mano. Se perdían horas y
//  conversiones fuera de oficina.
//
//  Ahora: el dueño toca "Activar Wallet" en el panel → callable crea un
//  preapproval MP separado ($9.990 CON IVA / mes, cobro recurrente) →
//  el dueño ingresa su tarjeta → MP cobra → mpMensualidadWebhook detecta
//  external_reference='wallet:{tid}' y activa walletActivo=true → trigger
//  activarWalletPostPago manda email + push + notif al vendedor.
//
//  ⚠ Se usa un preapproval MP SEPARADO del plan principal (Básico/Pro), no
//  un cargo adicional al mismo. MP permite múltiples preapprovals por payer;
//  distinguimos por external_reference: 'wallet:{tid}' vs '{tid}' (plan).
//
//  Estado guardado en _billing/{tid}.suscripcionWallet:
//    { planId, initPoint, status, monto:8395, montoIva:9990, preapprovalId,
//      payerEmail, nextPaymentDate, ultimoPago, creadoEn, ... }
//
//  DEPLOY:
//    firebase deploy --only functions:walletAddonCrearLink,\
//      functions:walletAddonCancelar,functions:activarWalletPostPago
// ─────────────────────────────────────────────────────────────────────────────

const { onCall, HttpsError }        = require('firebase-functions/v2/https');
const { onDocumentUpdated }         = require('firebase-functions/v2/firestore');
const { defineSecret }              = require('firebase-functions/params');
const { logger }                    = require('firebase-functions');
const admin                         = require('firebase-admin');
const { FieldValue }                = require('firebase-admin/firestore');

const { enviarEmail, MAIL_SECRETS } = require('./lib/mailer');

const db = admin.firestore();
const MP_PLATFORM_ACCESS_TOKEN = defineSecret('MP_PLATFORM_ACCESS_TOKEN');

const MP_API    = 'https://api.mercadopago.com';
const MAIL_FROM = 'SynapTech <hola@synaptechspa.cl>';

// Add-on Wallet: precio único, con IVA (9990). Neto para _billing = 8395.
// Si algún día se cambia, actualizar también admin-panel/src/lib/precios.js.
const WALLET_PRECIO_NETO = 8395;
const WALLET_PRECIO_IVA  = 9990;

const BOOTSTRAP_ADMINS = ['ignaciiio.mate@gmail.com'];

// ── Helpers (paralelos a mensualidad-mp.js — no importar de allí para
//    evitar acoplar ambos módulos y facilitar deploys parciales) ─────
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

const barberosCol = tid => (tid === 'elegance'
  ? db.collection('barberos')
  : db.collection(`tenants/${tid}/barberos`));

const settingsRef = tid => (tid === 'elegance'
  ? db.collection('settings').doc('general')
  : db.collection(`tenants/${tid}/settings`).doc('general'));

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

// ════════════════════════════════════════════════════════════════════════════
//  1) CREAR LINK — callable desde /gestion-interna/wallets
//     Crea preapproval MP separado por $9.990/mes con external_reference
//     'wallet:{tid}' para que el webhook lo distinga del plan principal.
// ════════════════════════════════════════════════════════════════════════════
exports.walletAddonCrearLink = onCall(
  { secrets: [MP_PLATFORM_ACCESS_TOKEN], region: 'us-central1', cors: true },
  async (request) => {
    const tid = String(request.data?.tenantId || '').trim();
    if (!tid) throw new HttpsError('invalid-argument', 'Falta tenantId.');
    if (!(await esAdminDelTenant(request.auth, tid))) {
      throw new HttpsError('permission-denied', 'Solo el administrador del local puede activar el módulo Wallet.');
    }

    const bSnap   = await db.doc(`_billing/${tid}`).get();
    const billing = bSnap.exists ? bSnap.data() : {};

    // Ya está activo → no crear nuevo link.
    if (billing.walletActivo === true) {
      throw new HttpsError('failed-precondition', 'El módulo Wallet ya está activo.');
    }

    const sub = billing.suscripcionWallet || null;
    if (sub && sub.status === 'authorized') {
      throw new HttpsError('failed-precondition', 'La suscripción Wallet ya está autorizada, esperando el primer cobro.');
    }
    if (sub && sub.status === 'link_creado' && sub.initPoint) {
      return { url: sub.initPoint };
    }

    // back_url dentro de nuestros dominios.
    const origen  = String(request.data?.origen || '');
    const origenOk = /^https:\/\/([a-z0-9-]+\.)?(synaptechspa\.cl|yugenstudio\.cl)$/.test(origen);
    const backUrl = `${origenOk ? origen : `https://${tid}.synaptechspa.cl`}/gestion-interna/wallets?walletpay=ok`;

    const local = await nombreLocal(tid);
    const plan  = {
      reason:             `Add-on Wallet · ${local}`.slice(0, 250),
      external_reference: `wallet:${tid}`,
      back_url:           backUrl,
      auto_recurring: {
        frequency:          1,
        frequency_type:     'months',
        transaction_amount: WALLET_PRECIO_IVA,
        currency_id:        'CLP',
      },
    };

    const { httpStatus, json } = await mpRequest('POST', '/preapproval_plan', MP_PLATFORM_ACCESS_TOKEN.value(), { body: plan });
    if (httpStatus >= 300 || !json || !json.init_point || !json.id) {
      logger.error('[WalletAddon] crear plan falló', JSON.stringify(json));
      throw new HttpsError('internal', 'Mercado Pago no pudo crear la suscripción del Wallet. Intenta de nuevo.');
    }

    await db.doc(`_billing/${tid}`).set({
      suscripcionWallet: {
        planId:    json.id,
        initPoint: json.init_point,
        status:    'link_creado',
        monto:     WALLET_PRECIO_NETO,
        montoIva:  WALLET_PRECIO_IVA,
        creadoEn:  FieldValue.serverTimestamp(),
        creadoPor: String((request.auth.token && request.auth.token.email) || request.auth.uid),
      },
    }, { merge: true });

    logger.info(`[WalletAddon] plan creado ${tid} → ${json.id} ($${WALLET_PRECIO_IVA}/mes)`);
    return { url: json.init_point };
  },
);

// ════════════════════════════════════════════════════════════════════════════
//  2) CANCELAR — dueño o superadmin. Apaga el add-on al fin del ciclo actual.
// ════════════════════════════════════════════════════════════════════════════
exports.walletAddonCancelar = onCall(
  { secrets: [MP_PLATFORM_ACCESS_TOKEN], region: 'us-central1', cors: true },
  async (request) => {
    const tid = String(request.data?.tenantId || '').trim();
    if (!tid) throw new HttpsError('invalid-argument', 'Falta tenantId.');
    if (!(await esAdminDelTenant(request.auth, tid))) {
      throw new HttpsError('permission-denied', 'Solo el administrador del local puede cancelar el módulo Wallet.');
    }

    const bSnap = await db.doc(`_billing/${tid}`).get();
    const sub   = (bSnap.exists && bSnap.data().suscripcionWallet) || null;
    if (!sub) throw new HttpsError('failed-precondition', 'Este local no tiene el add-on Wallet configurado.');

    if (sub.preapprovalId) {
      const { httpStatus, json } = await mpRequest('PUT', `/preapproval/${sub.preapprovalId}`, MP_PLATFORM_ACCESS_TOKEN.value(), {
        body: { status: 'cancelled' },
      });
      if (httpStatus >= 300) {
        logger.error('[WalletAddon] cancelar falló', JSON.stringify(json));
        throw new HttpsError('internal', 'Mercado Pago no pudo cancelar la suscripción Wallet. Intenta de nuevo.');
      }
    }

    // Apagamos walletActivo al toque para dejar de servir el add-on. Los
    // pases ya emitidos siguen vivos en el celular del cliente, pero dejan
    // de sincronizarse — es el comportamiento esperado al dar de baja.
    await db.doc(`_billing/${tid}`).set({
      walletActivo: false,
      suscripcionWallet: {
        status:       'cancelled',
        canceladoEn:  FieldValue.serverTimestamp(),
        canceladoPor: String((request.auth.token && request.auth.token.email) || request.auth.uid),
      },
    }, { merge: true });

    logger.info(`[WalletAddon] suscripción Wallet cancelada ${tid}`);
    return { ok: true };
  },
);

// ════════════════════════════════════════════════════════════════════════════
//  3) TRIGGER — walletActivo pasa a true → email + push admin + provisión
//     idempotente de la clase Google Wallet (por si el dueño ya cargó config).
// ════════════════════════════════════════════════════════════════════════════
function htmlBienvenidaWallet({ nombre, local, urlEditor, urlWallet }) {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;background:#0b1220;color:#e2e8f0;border-radius:14px;overflow:hidden;border:1px solid #1e293b;">
    <div style="padding:22px 26px;border-bottom:1px solid #1e293b;">
      <p style="margin:0;font-size:12px;letter-spacing:3px;color:#f59e0b;font-weight:bold;">SYNAPTECH · WALLET</p>
      <h2 style="margin:6px 0 0;font-size:20px;color:#f8fafc;">¡Tu módulo Wallet está activo! 💳</h2>
    </div>
    <div style="padding:22px 26px;">
      <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#cbd5e1;">
        Hola ${nombre}, ya podemos empezar a poner la tarjeta de fidelidad de <b style="color:#f8fafc;">${local}</b> en el celular de cada cliente.
      </p>
      <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#cbd5e1;">
        <b>Próximo paso:</b> personaliza tu tarjeta en 3 minutos — logo, colores y la ubicación exacta de tu local para el geo-push.
      </p>
      <div style="background:#0f172a;border:1px solid #1e293b;border-radius:10px;padding:14px 16px;margin:14px 0;">
        <p style="margin:0 0 6px;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.1em;">Personalizar tu tarjeta</p>
        <a href="${urlEditor}" style="color:#f59e0b;font-weight:bold;font-size:14px;word-break:break-all;">${urlEditor}</a>
        <p style="margin:12px 0 6px;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.1em;">Panel Wallet</p>
        <a href="${urlWallet}" style="color:#f59e0b;font-weight:bold;font-size:14px;word-break:break-all;">${urlWallet}</a>
      </div>
      <p style="margin:14px 0 0;font-size:13px;line-height:1.6;color:#cbd5e1;">
        Apenas termines el diseño, tus clientes verán el botón <b>Añadir a Google Wallet / Apple Wallet</b> en su vista de sellos. La tarjeta se llena sola y les avisa al pasar cerca del local.
      </p>
      <p style="margin:14px 0 0;font-size:12px;color:#64748b;line-height:1.6;">
        Add-on Wallet · $9.990/mes · se cobra junto con tu mensualidad.
      </p>
    </div>
    <div style="padding:14px 26px;background:#0f172a;font-size:11px;color:#475569;">
      Powered by SynapTech SpA · synaptechspa.cl
    </div>
  </div>`;
}

exports.activarWalletPostPago = onDocumentUpdated(
  { document: '_billing/{tid}', region: 'us-central1', secrets: MAIL_SECRETS },
  async (event) => {
    const tid    = event.params.tid;
    const before = event.data?.before?.data() || {};
    const after  = event.data?.after?.data()  || {};

    // Idempotente: solo actuamos en la transición false/null → true.
    const antesActivo = before.walletActivo === true;
    const ahoraActivo = after.walletActivo  === true;
    if (antesActivo || !ahoraActivo) return;

    const tSnap = await db.doc(`tenants/${tid}`).get();
    if (!tSnap.exists) {
      logger.warn(`[walletPay] tenant ${tid} no existe — ignoro activación`);
      return;
    }
    const t = tSnap.data();

    const nombreCorto = String((t.contacto?.nombre || t.ownerEmail || 'compañero')).split(/\s+/)[0];
    const emailDueno  = String(t.contacto?.email || t.ownerEmail || after.emailCobro || '').trim().toLowerCase();
    const local       = t.nombre || tid;
    const urlWallet   = `https://${tid}.synaptechspa.cl/gestion-interna/wallets`;
    const urlEditor   = `https://wallets.bioo.cl/estudio?tid=${encodeURIComponent(tid)}`;

    logger.info(`[walletPay] ✓ Wallet activado ${tid} ref=${t.refVendedor || '-'}`);

    // 1. Email al dueño con siguiente paso claro (personalizar).
    if (emailDueno && emailDueno.includes('@')) {
      try {
        await enviarEmail({
          from:    MAIL_FROM,
          to:      emailDueno,
          subject: `¡Wallet activo! Personaliza tu tarjeta en 3 minutos · ${local}`,
          html:    htmlBienvenidaWallet({ nombre: nombreCorto, local, urlEditor, urlWallet }),
        });
        logger.info(`[walletPay] email bienvenida enviado a ${emailDueno}`);
      } catch (e) { logger.warn(`[walletPay] email falló ${tid}:`, e.message); }
    }

    // 2. Push admin plataforma + notif al vendedor (si el tenant vino de uno).
    try {
      const { dispatchAdminPush } = require('./admin-push');
      await dispatchAdminPush({
        title: '💳 Wallet vendido',
        body:  `${local} activó el add-on Wallet ($9.990/mes)` +
               (t.refVendedor ? ` · vendedor: ${t.refVendedor}` : ''),
        data:  { tid, tipo: 'wallet-activo' },
        url:   '/admin/',
        tag:   `wallet-active-${tid}`,
      });
    } catch (e) { logger.warn(`[walletPay] admin push falló:`, e.message); }

    // 3. Provisión idempotente de la clase Google Wallet si el dueño ya
    //    subió config (defensivo: normalmente el editor lo hace al guardar).
    try {
      const cfgPath = tid === 'elegance' ? 'configuracion/wallet' : `tenants/${tid}/configuracion/wallet`;
      const cfgSnap = await db.doc(cfgPath).get();
      if (cfgSnap.exists) {
        const cfg = cfgSnap.data() || {};
        // Solo si tiene lo mínimo (logo + programName). Sin logo Google rechaza.
        if (cfg.logoUrl && cfg.programName) {
          const core = require('./lib/wallet-core');
          const WALLET_SA_KEY = require('firebase-functions/params').defineSecret('WALLET_SA_KEY');
          // Nota: si la CF no está desplegada con este secret disponible,
          // saKey() explota — envolvemos en try/catch para no romper el trigger.
          try {
            const saKey = JSON.parse(WALLET_SA_KEY.value());
            const cls = core.buildClass(tid, cfg);
            await core.upsertClass(saKey, cls);
            logger.info(`[walletPay] clase provisionada ${cls.id}`);
          } catch (e) {
            logger.warn(`[walletPay] no se pudo provisionar clase (${tid}):`, e.message);
          }
        } else {
          logger.info(`[walletPay] ${tid} sin config completa, saltando provisión inicial`);
        }
      }
    } catch (e) { logger.warn(`[walletPay] provisión defensiva falló:`, e.message); }
  }
);

// Export inline para que mensualidad-mp.js pueda leer los precios sin
// duplicarlos (evita drift si algún día se cambia el add-on).
exports.WALLET_PRECIO_NETO = WALLET_PRECIO_NETO;
exports.WALLET_PRECIO_IVA  = WALLET_PRECIO_IVA;
