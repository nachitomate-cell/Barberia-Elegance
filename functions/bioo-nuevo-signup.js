'use strict';

// functions/bioo-nuevo-signup.js
// ─────────────────────────────────────────────────────────────────────────────
//  BIOO — aviso al superadmin cuando se crea una nueva bioo.
//
//  Trigger: onDocumentCreated('bios/{username}')
//  Acción:  manda un email a Ignacio vía Resend (RESEND_API_KEY ya configurado).
//
//  Distingue dos orígenes:
//    - "Self-service"  → alguien creó su bioo desde bioo.cl/editor (saveBio).
//    - "Provisionada"  → la creó un panel (Club Patio, Barbería, etc.).
//      Detectado por la presencia de `provisionedAt`.
//
//  DEPLOY:
//    firebase deploy --only functions:notificarNuevaBioo
// ─────────────────────────────────────────────────────────────────────────────

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { defineSecret }      = require('firebase-functions/params');
const { logger }            = require('firebase-functions');

const RESEND_API_KEY = defineSecret('RESEND_API_KEY');

const ADMIN_EMAIL = 'ignaciiio.mate@gmail.com';
const FROM        = 'bioo <hola@synaptechspa.cl>';
const BIOO_BASE   = 'https://bioo.cl';

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

function buildHtml({ username, email, source, provisioned, perfil }) {
  const titulo    = (perfil && perfil.titulo)    ? String(perfil.titulo)    : '(sin título)';
  const subtitulo = (perfil && perfil.subtitulo) ? String(perfil.subtitulo) : '';
  const tipo      = provisioned ? 'Provisionada' : 'Self-service';
  const tipoColor = provisioned ? '#0077b3'      : '#72a129';
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"></head>
<body style="margin:0;background:#f6f7f4;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#15240b">
  <div style="max-width:520px;margin:32px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 18px rgba(21,36,11,0.08)">
    <div style="background:linear-gradient(135deg,#15240b,#2c5a17);padding:24px 28px;color:#fff">
      <div style="font-size:11px;font-weight:700;letter-spacing:.18em;color:#92c83a;text-transform:uppercase">Nueva bioo</div>
      <div style="font-size:22px;font-weight:800;margin-top:6px">@${username}</div>
    </div>
    <div style="padding:24px 28px">
      <p style="margin:0 0 14px;font-size:14px;color:#5a6052">Alguien acaba de crear una página en bioo.cl 🎉</p>
      <table style="width:100%;font-size:13px;border-collapse:collapse">
        <tr><td style="padding:6px 0;color:#8b8f82;width:130px">Username</td><td style="padding:6px 0;font-weight:600">@${username}</td></tr>
        <tr><td style="padding:6px 0;color:#8b8f82">Email</td><td style="padding:6px 0">${email || '—'}</td></tr>
        <tr><td style="padding:6px 0;color:#8b8f82">Tipo</td><td style="padding:6px 0"><span style="display:inline-block;padding:2px 10px;border-radius:99px;background:${tipoColor}1f;color:${tipoColor};font-weight:700;font-size:11px">${tipo}</span>${source ? ` <span style="color:#8b8f82">· source: ${source}</span>` : ''}</td></tr>
        <tr><td style="padding:6px 0;color:#8b8f82">Título</td><td style="padding:6px 0">${titulo}</td></tr>
        ${subtitulo ? `<tr><td style="padding:6px 0;color:#8b8f82">Subtítulo</td><td style="padding:6px 0">${subtitulo}</td></tr>` : ''}
      </table>
      <div style="margin-top:22px;display:flex;gap:10px;flex-wrap:wrap">
        <a href="${BIOO_BASE}/${encodeURIComponent(username)}" style="display:inline-block;background:#15240b;color:#fff;text-decoration:none;font-weight:700;font-size:13px;padding:11px 18px;border-radius:12px">Ver página</a>
        <a href="${BIOO_BASE}/admin" style="display:inline-block;background:#f0f2ec;color:#15240b;text-decoration:none;font-weight:700;font-size:13px;padding:11px 18px;border-radius:12px">Abrir Command Center</a>
      </div>
    </div>
    <div style="padding:14px 28px;background:#fafaf7;border-top:1px solid #eef0e9;font-size:11px;color:#8b8f82">
      bioo · aviso automático para superadmin
    </div>
  </div>
</body></html>`;
}

exports.notificarNuevaBioo = onDocumentCreated(
  { document: 'bios/{username}', secrets: [RESEND_API_KEY], retry: false },
  async (event) => {
    const username = event.params.username;
    const data     = event.data?.data() || {};

    const email       = data.email || data.ownerEmail || (data.perfil && data.perfil.email) || '';
    const source      = data.source || '';
    const provisioned = !!data.provisionedAt;
    const perfil      = data.perfil || {};

    try {
      await sendResend(RESEND_API_KEY.value(), {
        from:    FROM,
        to:      [ADMIN_EMAIL],
        subject: `🎉 Nueva bioo — @${username}${provisioned ? ' (provisionada)' : ''}`,
        html:    buildHtml({ username, email, source, provisioned, perfil }),
      });
      logger.info(`[bioo:nuevo] email enviado por @${username}`);
    } catch (err) {
      logger.error(`[bioo:nuevo] fallo enviando aviso de @${username}:`, err.message);
    }
    return null;
  },
);
