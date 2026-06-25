'use strict';

// functions/referidos-aviso.js
// ─────────────────────────────────────────────────────────────────────────────
//  REFERIDOS — aviso al super-admin cuando entra un signup nuevo.
//
//  Trigger: onDocumentCreated('_referralSignups/{signupId}')
//  Acción:  email a Ignacio vía Resend (RESEND_API_KEY ya está en secrets)
//           con todos los datos del prospecto y CTAs directos:
//             - Abrir WhatsApp con mensaje pre-armado.
//             - Mailto si dejó email.
//
//  DEPLOY:
//    firebase deploy --only functions:avisarNuevoReferido
// ─────────────────────────────────────────────────────────────────────────────

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { defineSecret }      = require('firebase-functions/params');
const { logger }            = require('firebase-functions');

const RESEND_API_KEY = defineSecret('RESEND_API_KEY');

const ADMIN_EMAIL = 'ignaciiio.mate@gmail.com';
const FROM        = 'SynapTech <hola@synaptechspa.cl>';

async function sendResend(apiKey, payload) {
  const res = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Resend ${res.status}: ${JSON.stringify(body)}`);
  return body;
}

/** Normaliza un número a digits-only para wa.me. Acepta '+56 9 1234 5678' etc. */
function onlyDigits(s) {
  return String(s || '').replace(/\D/g, '');
}

function buildHtml({ signup, code, referrerName }) {
  const name      = signup.prospectName     || '(sin nombre)';
  const barberia  = signup.prospectBarberia || '(sin barbería)';
  const phone     = signup.prospectPhone    || '';
  const email     = signup.prospectEmail    || '';
  const city      = signup.prospectCity     || '';
  const message   = signup.prospectMessage  || '';
  const phoneDigits = onlyDigits(phone);
  const waText = encodeURIComponent(
    `Hola ${name}, te escribo de SynapTech ✦ Vi que ${referrerName || 'un amigo'} te invitó. ` +
    `¿Cuándo te queda bien una demo de 10 minutos para mostrarte la agenda + club de fidelidad?`,
  );
  const waUrl = phoneDigits ? `https://wa.me/${phoneDigits}?text=${waText}` : '';

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"></head>
<body style="margin:0;background:#f6f7f4;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#15240b">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 18px rgba(21,36,11,0.08)">
    <div style="background:linear-gradient(135deg,#15240b,#2c5a17);padding:24px 28px;color:#fff">
      <div style="font-size:11px;font-weight:700;letter-spacing:.18em;color:#92c83a;text-transform:uppercase">Nuevo referido</div>
      <div style="font-size:22px;font-weight:800;margin-top:6px">${barberia}</div>
      <div style="font-size:13px;color:#cdd9be;margin-top:4px">Te lo trajo: ${referrerName || code}</div>
    </div>
    <div style="padding:24px 28px">
      <p style="margin:0 0 14px;font-size:14px;color:#5a6052">Alguien acaba de rellenar el formulario de referidos 🎯</p>
      <table style="width:100%;font-size:13px;border-collapse:collapse">
        <tr><td style="padding:6px 0;color:#8b8f82;width:130px">Nombre</td><td style="padding:6px 0;font-weight:600">${name}</td></tr>
        <tr><td style="padding:6px 0;color:#8b8f82">Barbería</td><td style="padding:6px 0;font-weight:600">${barberia}</td></tr>
        <tr><td style="padding:6px 0;color:#8b8f82">WhatsApp</td><td style="padding:6px 0">${phone || '—'}</td></tr>
        <tr><td style="padding:6px 0;color:#8b8f82">Email</td><td style="padding:6px 0">${email || '—'}</td></tr>
        ${city    ? `<tr><td style="padding:6px 0;color:#8b8f82">Ciudad</td><td style="padding:6px 0">${city}</td></tr>` : ''}
        <tr><td style="padding:6px 0;color:#8b8f82">Código</td><td style="padding:6px 0;font-family:monospace;font-weight:700">${code}</td></tr>
        ${message ? `<tr><td style="padding:10px 0 6px;color:#8b8f82;vertical-align:top">Mensaje</td><td style="padding:10px 0 6px;font-style:italic;color:#5a6052">"${message}"</td></tr>` : ''}
      </table>
      <div style="margin-top:22px;display:flex;gap:10px;flex-wrap:wrap">
        ${waUrl ? `<a href="${waUrl}" style="display:inline-block;background:#25D366;color:#fff;text-decoration:none;font-weight:700;font-size:13px;padding:11px 18px;border-radius:12px">📱 Escribir por WhatsApp</a>` : ''}
        ${email ? `<a href="mailto:${email}?subject=${encodeURIComponent('SynapTech — demo agenda + club de fidelidad')}" style="display:inline-block;background:#15240b;color:#fff;text-decoration:none;font-weight:700;font-size:13px;padding:11px 18px;border-radius:12px">✉ Email</a>` : ''}
      </div>
    </div>
    <div style="padding:14px 28px;background:#fafaf7;border-top:1px solid #eef0e9;font-size:11px;color:#8b8f82">
      SynapTech · aviso automático del programa de referidos
    </div>
  </div>
</body></html>`;
}

exports.avisarNuevoReferido = onDocumentCreated(
  { document: '_referralSignups/{signupId}', secrets: [RESEND_API_KEY], retry: false },
  async (event) => {
    const signupId = event.params.signupId;
    const signup   = event.data?.data() || {};
    const code     = signup.code || '';
    const referrerName = signup.referrerTenantName || signup.referrerTenantId || '';

    try {
      await sendResend(RESEND_API_KEY.value(), {
        from:    FROM,
        to:      [ADMIN_EMAIL],
        subject: `🎯 Nuevo referido: ${signup.prospectBarberia || signup.prospectName || 'sin datos'} (${code})`,
        html:    buildHtml({ signup, code, referrerName }),
      });
      logger.info(`[referidos:aviso] email enviado signupId=${signupId} code=${code}`);
    } catch (err) {
      logger.error(`[referidos:aviso] fallo enviando aviso signupId=${signupId}:`, err.message);
    }
    return null;
  },
);
