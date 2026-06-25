'use strict';

// functions/synaptech-lead.js
// ─────────────────────────────────────────────────────────────────────────────
//  SYNAPTECH — captura de leads inbound (sin código de referido).
//
//  Para landing pública synaptechspa.cl/empieza (link de Instagram).
//
//  Dos piezas:
//    1. synaptechCrearLead   (callable público, sin auth) — escribe en
//       _synaptechLeads/{id}.
//    2. avisarNuevoLead      (trigger Firestore) — manda email a Ignacio
//       vía Resend cuando entra un lead.
//
//  Modelo:
//    _synaptechLeads/{leadId}  { name, barberia, phone, email, city,
//                                barbers, message, source, status,
//                                createdAt, meta:{ua, ip} }
//
//  DEPLOY:
//    firebase deploy --only functions:synaptechCrearLead,functions:avisarNuevoLead
// ─────────────────────────────────────────────────────────────────────────────

const { onCall, HttpsError }   = require('firebase-functions/v2/https');
const { onDocumentCreated }    = require('firebase-functions/v2/firestore');
const { defineSecret }         = require('firebase-functions/params');
const { logger }               = require('firebase-functions');
const admin                    = require('firebase-admin');
const { FieldValue }           = require('firebase-admin/firestore');

const db = admin.firestore();

const RESEND_API_KEY = defineSecret('RESEND_API_KEY');
const ADMIN_EMAIL = 'ignaciiio.mate@gmail.com';
const FROM        = 'SynapTech <hola@synaptechspa.cl>';

/* ─────────────────────────── Callable público ─────────────────────────── */

exports.synaptechCrearLead = onCall(async (req) => {
  const raw = req.data || {};
  const name     = String(raw.name || '').trim().slice(0, 80);
  const barberia = String(raw.barberia || '').trim().slice(0, 80);
  const phone    = String(raw.phone || '').trim().slice(0, 40);
  const email    = String(raw.email || '').trim().toLowerCase().slice(0, 120);
  const city     = String(raw.city || '').trim().slice(0, 60);
  const barbers  = String(raw.barbers || '').trim().slice(0, 10);
  const message  = String(raw.message || '').trim().slice(0, 500);
  const source   = String(raw.source || 'direct').trim().slice(0, 30);

  if (!name || !barberia || !phone) {
    throw new HttpsError('invalid-argument', 'Faltan datos: nombre, barbería y WhatsApp son obligatorios.');
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpsError('invalid-argument', 'Email inválido.');
  }

  const ref = db.collection('_synaptechLeads').doc();
  await ref.set({
    name, barberia, phone,
    email: email || null,
    city: city || null,
    barbers: barbers || null,
    message: message || null,
    source,
    status: 'new',
    createdAt: FieldValue.serverTimestamp(),
    meta: {
      ua: String(req.rawRequest?.headers?.['user-agent'] || '').slice(0, 180),
      ip: String(req.rawRequest?.headers?.['x-forwarded-for'] || '').split(',')[0].trim().slice(0, 45),
      referer: String(req.rawRequest?.headers?.referer || req.rawRequest?.headers?.referrer || '').slice(0, 160),
    },
  });

  logger.info(`[synaptech:lead] creado ${ref.id} barberia="${barberia}" src=${source}`);
  return { ok: true, leadId: ref.id };
});

/* ─────────────────────────── Trigger email aviso ─────────────────────────── */

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

function onlyDigits(s) {
  return String(s || '').replace(/\D/g, '');
}

function buildHtml(lead) {
  const name      = lead.name     || '(sin nombre)';
  const barberia  = lead.barberia || '(sin barbería)';
  const phone     = lead.phone    || '';
  const email     = lead.email    || '';
  const city      = lead.city     || '';
  const barbers   = lead.barbers  || '';
  const message   = lead.message  || '';
  const source    = lead.source   || 'direct';
  const phoneDigits = onlyDigits(phone);
  const waText = encodeURIComponent(
    `Hola ${name}, te escribo de SynapTech ✦ Recibí tu solicitud para activar ${barberia}. ` +
    `¿Cuándo te queda bien una llamada/demo de 10 minutos para mostrarte la agenda + club de fidelidad?`,
  );
  const waUrl = phoneDigits ? `https://wa.me/${phoneDigits}?text=${waText}` : '';
  const srcColor = source === 'ig' || source === 'instagram'
    ? '#d62976' : source === 'stories' ? '#f56040' : '#72a129';

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"></head>
<body style="margin:0;background:#f6f7f4;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#15240b">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 18px rgba(21,36,11,0.08)">
    <div style="background:linear-gradient(135deg,#0c1108,#2c5a17);padding:24px 28px;color:#fff">
      <div style="font-size:11px;font-weight:700;letter-spacing:.18em;color:#cef07c;text-transform:uppercase">Nuevo lead — SynapTech</div>
      <div style="font-size:22px;font-weight:800;margin-top:6px">${barberia}</div>
      <div style="font-size:13px;color:#cdd9be;margin-top:4px">${name}${city ? ' · ' + city : ''}</div>
    </div>
    <div style="padding:24px 28px">
      <p style="margin:0 0 14px;font-size:14px;color:#5a6052">Acabas de recibir una solicitud de activación 🎯</p>
      <table style="width:100%;font-size:13px;border-collapse:collapse">
        <tr><td style="padding:6px 0;color:#8b8f82;width:130px">Nombre</td><td style="padding:6px 0;font-weight:600">${name}</td></tr>
        <tr><td style="padding:6px 0;color:#8b8f82">Barbería</td><td style="padding:6px 0;font-weight:600">${barberia}</td></tr>
        <tr><td style="padding:6px 0;color:#8b8f82">WhatsApp</td><td style="padding:6px 0">${phone || '—'}</td></tr>
        ${email   ? `<tr><td style="padding:6px 0;color:#8b8f82">Email</td><td style="padding:6px 0">${email}</td></tr>` : ''}
        ${city    ? `<tr><td style="padding:6px 0;color:#8b8f82">Ciudad</td><td style="padding:6px 0">${city}</td></tr>` : ''}
        ${barbers ? `<tr><td style="padding:6px 0;color:#8b8f82">Tamaño</td><td style="padding:6px 0">${barbers} barberos</td></tr>` : ''}
        <tr><td style="padding:6px 0;color:#8b8f82">Origen</td><td style="padding:6px 0"><span style="display:inline-block;padding:2px 10px;border-radius:99px;background:${srcColor}1f;color:${srcColor};font-weight:700;font-size:11px;text-transform:uppercase">${source}</span></td></tr>
        ${message ? `<tr><td style="padding:10px 0 6px;color:#8b8f82;vertical-align:top">Mensaje</td><td style="padding:10px 0 6px;font-style:italic;color:#5a6052">"${message}"</td></tr>` : ''}
      </table>
      <div style="margin-top:22px;display:flex;gap:10px;flex-wrap:wrap">
        ${waUrl ? `<a href="${waUrl}" style="display:inline-block;background:#25D366;color:#fff;text-decoration:none;font-weight:700;font-size:13px;padding:11px 18px;border-radius:12px">📱 Escribir por WhatsApp</a>` : ''}
        ${email ? `<a href="mailto:${email}?subject=${encodeURIComponent('SynapTech — activación de tu barbería')}" style="display:inline-block;background:#15240b;color:#fff;text-decoration:none;font-weight:700;font-size:13px;padding:11px 18px;border-radius:12px">✉ Email</a>` : ''}
      </div>
    </div>
    <div style="padding:14px 28px;background:#fafaf7;border-top:1px solid #eef0e9;font-size:11px;color:#8b8f82">
      SynapTech · aviso automático de lead inbound (synaptechspa.cl/empieza)
    </div>
  </div>
</body></html>`;
}

exports.avisarNuevoLead = onDocumentCreated(
  { document: '_synaptechLeads/{leadId}', secrets: [RESEND_API_KEY], retry: false },
  async (event) => {
    const leadId = event.params.leadId;
    const lead   = event.data?.data() || {};

    try {
      await sendResend(RESEND_API_KEY.value(), {
        from:    FROM,
        to:      [ADMIN_EMAIL],
        subject: `🎯 Nuevo lead SynapTech: ${lead.barberia || lead.name || 'sin datos'}${lead.source ? ' [' + lead.source + ']' : ''}`,
        html:    buildHtml(lead),
      });
      logger.info(`[synaptech:aviso] email enviado leadId=${leadId}`);
    } catch (err) {
      logger.error(`[synaptech:aviso] fallo enviando aviso leadId=${leadId}:`, err.message);
    }
    return null;
  },
);
