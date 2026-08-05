'use strict';

// functions/self-service-payment-hook.js
// ─────────────────────────────────────────────────────────────────────────────
//  ACTIVACIÓN AUTOMÁTICA DEL TENANT SELF-SERVICE AL PAGAR
//
//  Cierra el loop trial → paid sin intervención manual. Antes: al vencer trial
//  el dueño escribía WhatsApp a Ignacio, que activaba `status:'active'` a mano
//  (perdíamos 40-60% de conversiones por la latencia).
//
//  Trigger: onDocumentUpdated de _billing/{tid}. Cuando `estadoPago` pasa de
//  'trial'/'trial_expirado' a 'al_dia' (webhook MP ya procesó el primer cobro
//  vía mpMensualidadWebhook → procesarCobro en mensualidad-mp.js):
//    1) Activa el tenant (tenants/{tid}.status = 'active').
//    2) Envía comprobante WhatsApp al dueño (bienvenida + link a su panel).
//    3) Notifica a los admins de la plataforma (Ignacio y quien esté en la
//       colección admin_fcm_tokens) — la comisión del vendedor se procesa en
//       otro paso.
//
//  Solo aplica a tenants con origen 'self-service' o 'admin-express' — los
//  a-medida se activan por otros flujos.
//
//  DEPLOY:
//    firebase deploy --only functions:activarSelfServicePostPago
// ─────────────────────────────────────────────────────────────────────────────

const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { logger }            = require('firebase-functions');
const admin                 = require('firebase-admin');
const { FieldValue }        = require('firebase-admin/firestore');
const { enviarEmail, MAIL_SECRETS } = require('./lib/mailer');

const db = admin.firestore();

const ORIGENES_SELF = new Set(['self-service', 'admin-express']);
const MAIL_FROM = 'SynapTech <hola@synaptechspa.cl>';

function htmlBienvenida({ nombre, nombreLocal, plan, urlAgenda, urlPanel }) {
  const planNice = plan === 'local' ? 'Local' : 'Individual';
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;background:#0b1220;color:#e2e8f0;border-radius:14px;overflow:hidden;border:1px solid #1e293b;">
    <div style="padding:22px 26px;border-bottom:1px solid #1e293b;">
      <p style="margin:0;font-size:12px;letter-spacing:3px;color:#8b7cf6;font-weight:bold;">SYNAPTECH</p>
      <h2 style="margin:6px 0 0;font-size:20px;color:#f8fafc;">¡Bienvenido, ${nombre}! 🎉</h2>
    </div>
    <div style="padding:22px 26px;">
      <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#cbd5e1;">
        Tu plan <b style="color:#f8fafc;">${planNice}</b> de <b style="color:#f8fafc;">${nombreLocal}</b> está activo. 🚀
      </p>
      <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#cbd5e1;">
        Ya recibimos tu primer pago y tu agenda vuelve a recibir reservas de inmediato.
      </p>
      <div style="background:#0f172a;border:1px solid #1e293b;border-radius:10px;padding:14px 16px;margin:14px 0;">
        <p style="margin:0 0 6px;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.1em;">Tu link para clientes</p>
        <a href="${urlAgenda}" style="color:#8b7cf6;font-weight:bold;font-size:14px;word-break:break-all;">${urlAgenda}</a>
        <p style="margin:12px 0 6px;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.1em;">Tu panel</p>
        <a href="${urlPanel}" style="color:#8b7cf6;font-weight:bold;font-size:14px;word-break:break-all;">${urlPanel}</a>
      </div>
      <p style="margin:14px 0 0;font-size:13px;line-height:1.6;color:#cbd5e1;">
        <b>Pon el link de tu agenda en tu bio de Instagram</b> y en tu WhatsApp: es el paso #1 para que tus clientes reserven solos.
      </p>
      <p style="margin:14px 0 0;font-size:12px;color:#64748b;line-height:1.6;">
        El próximo cobro es automático. Cualquier duda, WhatsApp +56 9 8356 8212.
      </p>
    </div>
    <div style="padding:14px 26px;background:#0f172a;font-size:11px;color:#475569;">
      Powered by SynapTech SpA · synaptechspa.cl
    </div>
  </div>`;
}

exports.activarSelfServicePostPago = onDocumentUpdated(
  { document: '_billing/{tid}', region: 'us-central1', secrets: MAIL_SECRETS },
  async (event) => {
    const tid    = event.params.tid;
    const before = event.data?.before?.data() || {};
    const after  = event.data?.after?.data()  || {};

    const antesEnTrial = ['trial', 'trial_expirado'].includes(before.estadoPago);
    const ahoraAlDia   = after.estadoPago === 'al_dia';

    // Solo actuamos en la transición trial → al_dia (idempotente).
    if (!(antesEnTrial && ahoraAlDia)) return;

    const tSnap = await db.doc(`tenants/${tid}`).get();
    if (!tSnap.exists) {
      logger.warn(`[selfPay] tenant ${tid} no existe — ignoro activación`);
      return;
    }
    const t = tSnap.data();
    if (!ORIGENES_SELF.has(t.origen)) {
      logger.info(`[selfPay] ${tid} origen=${t.origen || '-'} no es self-service; skip`);
      return;
    }

    // 1. Marcar tenant como activo (kill switch pasa a 'active', el edge
    //    reanuda la agenda pública automáticamente).
    await db.doc(`tenants/${tid}`).set({
      status:        'active',
      plan:          String(after.plan || t.plan || 'individual'),
      activadoEn:    FieldValue.serverTimestamp(),
      trialFinaliza: null,
      updatedAt:     FieldValue.serverTimestamp(),
    }, { merge: true });

    // _system se usa como kill switch por el edge middleware — lo mantenemos
    // sincronizado por si algún día se pausa un tenant desde ahí.
    try {
      await db.doc(`_system/${tid}`).set({
        status:     'active',
        plan:       String(after.plan || t.plan || 'individual'),
        activadoEn: FieldValue.serverTimestamp(),
      }, { merge: true });
    } catch (e) { logger.warn(`[selfPay] _system update falló ${tid}:`, e.message); }

    logger.info(`[selfPay] ✓ tenant activado ${tid} plan=${after.plan || '-'} ref=${t.refVendedor || '-'}`);

    // 2. Bienvenida al dueño por EMAIL (más confiable que WA cross-window de
    //    Meta, sin depender de ventana de 24h). Best-effort — nunca rompe la
    //    activación si el email falla.
    const nombreCorto = String((t.contacto?.nombre || t.ownerEmail || 'compañero')).split(/\s+/)[0];
    const emailDueno  = String(t.contacto?.email || t.ownerEmail || after.emailCobro || '').trim().toLowerCase();
    const nombreLoc   = t.nombre || tid;
    const urlAgenda   = `https://${tid}.synaptechspa.cl`;
    const urlPanel    = `https://${tid}.synaptechspa.cl/gestion-interna/`;
    const plan        = String(after.plan || t.plan || 'individual');

    if (emailDueno && emailDueno.includes('@')) {
      try {
        await enviarEmail({
          from:    MAIL_FROM,
          to:      emailDueno,
          subject: `¡Bienvenido a SynapTech! Tu plan ${plan === 'local' ? 'Local' : 'Individual'} está activo`,
          html:    htmlBienvenida({ nombre: nombreCorto, nombreLocal: nombreLoc, plan, urlAgenda, urlPanel }),
        });
        logger.info(`[selfPay] email bienvenida enviado a ${emailDueno}`);
      } catch (e) {
        logger.warn(`[selfPay] email bienvenida falló ${tid}:`, e.message);
      }
    }

    // 3. Notificación al admin de la plataforma (push + WhatsApp a Ignacio si
    //    hay canal). El vendedor recibe su reporte por otro camino (script
    //    ver-comisiones-massiel.js corrido por Ignacio).
    try {
      const { dispatchAdminPush } = require('./admin-push');
      await dispatchAdminPush({
        title: '💚 Nuevo cliente pagado',
        body:  `${nombreLoc} activó ${after.plan === 'local' ? 'Local' : 'Individual'}` +
               (t.refVendedor ? ` · vendedor: ${t.refVendedor}` : ''),
        data:  { tid, tipo: 'self-service-active' },
        url:   '/admin/',
        tag:   `self-active-${tid}`,
      });
    } catch (e) { logger.warn(`[selfPay] admin push falló:`, e.message); }
  }
);
