'use strict';

// functions/acceso-staff-email.js
// ─────────────────────────────────────────────────────────────────────────────
//  enviarLinkAccesoStaff — reemplaza el sendPasswordResetEmail del cliente.
//
//  El template por defecto de Firebase sale de noreply@…firebaseapp.com, en
//  inglés, con el project-id en el asunto y CAE A SPAM. Esta callable genera
//  el link de restablecimiento server-side y lo envía por Resend
//  (avisos@synaptechspa.cl, DKIM ok) con plantilla GENÉRICA de SynapTech —
//  la misma para todos los tenants, a propósito (pedido de Ignacio 2026-07-24).
//
//  Autorización: superadmin bootstrap OR admin del tenant (mismo criterio que
//  crearAccesoStaff). Además el email destino DEBE pertenecer a un miembro del
//  equipo de ese tenant — evita usar la plataforma para spamear resets a
//  correos arbitrarios con nuestra marca.
// ─────────────────────────────────────────────────────────────────────────────

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret }       = require('firebase-functions/params');
const { logger }             = require('firebase-functions');
const admin                  = require('firebase-admin');

const db = admin.firestore();
const RESEND_API_KEY = defineSecret('RESEND_API_KEY');

const SUPERADMINS = ['ignaciiio.mate@gmail.com'];
const MAIL_FROM   = 'SynapTech <avisos@synaptechspa.cl>';
const LOGO_URL    = 'https://elegance.synaptechspa.cl/synaptech/ig.png';

function htmlReset({ email, link }) {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;background:#0b1220;color:#e2e8f0;border-radius:14px;overflow:hidden;border:1px solid #1e293b;">
    <div style="padding:22px 26px;border-bottom:1px solid #1e293b;">
      <p style="margin:0;font-size:12px;letter-spacing:3px;color:#9CCC3C;font-weight:bold;">SYNAPTECH · ACCESO</p>
      <h2 style="margin:6px 0 0;font-size:19px;color:#f8fafc;">Crea tu nueva contraseña 🔑</h2>
    </div>
    <div style="padding:22px 26px;">
      <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#cbd5e1;">
        Recibiste este correo porque se solicitó restablecer la contraseña de acceso
        al panel de gestión para <b style="color:#f8fafc;">${email}</b>.
      </p>
      <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#cbd5e1;">
        Toca el botón, elige tu nueva contraseña y vuelve a iniciar sesión en tu panel.
      </p>
      <a href="${link}" style="display:inline-block;padding:12px 22px;border-radius:10px;background:#9CCC3C;color:#0b1220;font-size:14px;font-weight:bold;text-decoration:none;">Crear nueva contraseña</a>
      <p style="margin:18px 0 0;font-size:12px;color:#64748b;line-height:1.6;">
        El enlace expira pronto por seguridad. Si tú no pediste este cambio,
        ignora este correo: tu contraseña actual sigue vigente.
      </p>
    </div>
    <div style="padding:14px 26px;background:#0f172a;font-size:11px;color:#475569;">
      <img src="${LOGO_URL}" alt="" width="14" height="14" style="vertical-align:middle;border-radius:3px;margin-right:6px;">Powered by SynapTech SpA · synaptechspa.cl
    </div>
  </div>`;
}

exports.enviarLinkAccesoStaff = onCall(
  { region: 'us-central1', cors: true, secrets: [RESEND_API_KEY] },
  async (request) => {
    const callerEmail  = (request.auth?.token?.email || '').toLowerCase();
    const callerRole   = request.auth?.token?.role;
    const callerTenant = request.auth?.token?.tenantId;

    const { email, tenantId } = request.data || {};
    if (!email || typeof email !== 'string') throw new HttpsError('invalid-argument', 'Email requerido.');
    if (!tenantId || typeof tenantId !== 'string') throw new HttpsError('invalid-argument', 'tenantId requerido.');

    const isSuperadmin  = SUPERADMINS.includes(callerEmail);
    const isTenantAdmin = callerRole === 'admin' && callerTenant === tenantId;
    if (!request.auth || (!isSuperadmin && !isTenantAdmin)) {
      throw new HttpsError('permission-denied', 'Solo el admin del local puede enviar enlaces de acceso.');
    }

    const emailNorm = email.trim().toLowerCase();

    // El destino debe ser parte del EQUIPO del tenant (barberos con ese email).
    const barberosCol = tenantId === 'elegance'
      ? db.collection('barberos')
      : db.collection(`tenants/${tenantId}/barberos`);
    const snap = await barberosCol.where('email', '==', emailNorm).limit(1).get();
    const snap2 = snap.empty ? await barberosCol.where('email', '==', email.trim()).limit(1).get() : snap;
    if (snap.empty && snap2.empty && !isSuperadmin) {
      throw new HttpsError('permission-denied', 'Ese email no pertenece al equipo de este local.');
    }

    let link;
    try {
      link = await admin.auth().generatePasswordResetLink(emailNorm);
    } catch (e) {
      if (e.code === 'auth/user-not-found' || e.code === 'auth/email-not-found') {
        throw new HttpsError('not-found', 'No existe una cuenta con ese email.');
      }
      logger.error('[accesoStaffEmail] generar link:', e.message);
      throw new HttpsError('internal', 'No se pudo generar el enlace.');
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY.value()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: MAIL_FROM,
        to: [emailNorm],
        subject: 'Restablece tu contraseña · Acceso al panel',
        html: htmlReset({ email: emailNorm, link }),
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      logger.error('[accesoStaffEmail] Resend:', res.status, JSON.stringify(body));
      throw new HttpsError('internal', 'No se pudo enviar el correo.');
    }

    logger.info(`[accesoStaffEmail] ${tenantId}: enlace de acceso enviado a ${emailNorm} (pedido por ${callerEmail})`);
    return { ok: true };
  },
);
