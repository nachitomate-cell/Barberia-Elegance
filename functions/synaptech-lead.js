'use strict';

// functions/synaptech-lead.js
// ─────────────────────────────────────────────────────────────────────────────
//  SYNAPTECH — captura de leads inbound desde empieza.synaptechspa.cl
//
//  Form expandido: además del básico (nombre/barbería/WhatsApp) ahora
//  captura datos para tener una DEMO LISTA cuando el lead entre — tipo
//  de negocio, servicios ofrecidos, sistema actual, estilo visual,
//  color brand y Instagram.
//
//  Dos piezas:
//    1. synaptechCrearLead   (callable público) — escribe _synaptechLeads/{id}.
//    2. avisarNuevoLead      (trigger Firestore) — manda email con
//       "demo-ready brief" + color swatch + checklist a Ignacio vía Resend.
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

/* ─────────────────────────── Diccionarios ─────────────────────────── */

const TIPOS_VALIDOS = new Set([
  'barberia', 'peluqueria', 'mixto', 'nails', 'spa', 'barber-nails', 'otro',
]);
const SERVICIOS_VALIDOS = new Set([
  'corte', 'barba', 'color', 'peinado', 'alisado', 'depilacion',
  'cejas', 'manicure', 'pedicure', 'masaje', 'facial', 'otros',
]);
const SISTEMAS_VALIDOS = new Set([
  'whatsapp', 'nada', 'agenda-papel', 'google-cal', 'otra-app',
]);
const ESTILOS_VALIDOS = new Set([
  'minimal', 'moderno', 'clasico', 'lujo', 'urbano', 'fem',
]);

/** Labels legibles para el email (no exponer slugs internos). */
const LABELS = {
  tipo: {
    'barberia': 'Barbería (hombres)', 'peluqueria': 'Peluquería',
    'mixto': 'Mixto (hombre + mujer)', 'nails': 'Estudio de uñas',
    'spa': 'Spa / estética', 'barber-nails': 'Barbería + nails', 'otro': 'Otro',
  },
  servicios: {
    'corte': 'Corte', 'barba': 'Barba', 'color': 'Color', 'peinado': 'Peinado',
    'alisado': 'Alisado', 'depilacion': 'Depilación', 'cejas': 'Cejas',
    'manicure': 'Manicure', 'pedicure': 'Pedicure', 'masaje': 'Masaje',
    'facial': 'Facial', 'otros': 'Otros',
  },
  sistema: {
    'whatsapp': 'WhatsApp manual', 'nada': 'No agenda (sin reserva)',
    'agenda-papel': 'Agenda de papel', 'google-cal': 'Google Calendar',
    'otra-app': 'Otra app (Booksy/Fresha/etc.)',
  },
  estilo: {
    'minimal': 'Minimalista (blanco, líneas finas)',
    'moderno': 'Moderno (dark, premium)',
    'clasico': 'Clásico (madera, dorado)',
    'lujo': 'Lujo (negro, oro)',
    'urbano': 'Urbano (rojo, negro)',
    'fem': 'Femenino (pastel, suave)',
  },
  barbers: {
    'solo': 'Solo el dueño', '2-3': '2 a 3 barberos',
    '4-7': '4 a 7 barberos', '8+': '8 o más barberos',
  },
};

/* ─────────────────────────── Callable público ─────────────────────────── */

exports.synaptechCrearLead = onCall(async (req) => {
  const raw = req.data || {};

  // Básicos (obligatorios)
  const name     = String(raw.name || '').trim().slice(0, 80);
  const barberia = String(raw.barberia || '').trim().slice(0, 80);
  const phone    = String(raw.phone || '').trim().slice(0, 40);

  // Identidad extendida
  const email    = String(raw.email || '').trim().toLowerCase().slice(0, 120);
  const city     = String(raw.city || '').trim().slice(0, 60);

  // Tu negocio
  const tipoRaw    = String(raw.tipo || '').trim();
  const barbers    = String(raw.barbers || '').trim().slice(0, 10);
  const precio     = String(raw.precio || '').trim().slice(0, 60);
  const sistemaRaw = String(raw.sistemaActual || '').trim();
  const serviciosRaw = Array.isArray(raw.servicios) ? raw.servicios : [];

  // Personalización demo
  const estiloRaw = String(raw.estilo || '').trim();
  const color     = String(raw.color || '').trim().slice(0, 9); // #RRGGBB
  const instagram = String(raw.instagram || '').trim().replace(/^@+/, '').slice(0, 40);

  // Libres
  const message = String(raw.message || '').trim().slice(0, 600);
  const source  = String(raw.source || 'direct').trim().slice(0, 30);

  // Validación
  if (!name || !barberia || !phone) {
    throw new HttpsError('invalid-argument', 'Faltan datos: nombre, barbería y WhatsApp son obligatorios.');
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpsError('invalid-argument', 'Email inválido.');
  }
  // Sanea valores enum — si llegan basura, se descarta (no falla).
  const tipo     = TIPOS_VALIDOS.has(tipoRaw) ? tipoRaw : null;
  const sistema  = SISTEMAS_VALIDOS.has(sistemaRaw) ? sistemaRaw : null;
  const estilo   = ESTILOS_VALIDOS.has(estiloRaw) ? estiloRaw : null;
  const servicios = serviciosRaw
    .map((s) => String(s || '').trim())
    .filter((s) => SERVICIOS_VALIDOS.has(s))
    .slice(0, 20);
  const colorClean = /^#[0-9a-fA-F]{6}$/.test(color) ? color.toLowerCase() : null;

  const ref = db.collection('_synaptechLeads').doc();
  await ref.set({
    name, barberia, phone,
    email: email || null,
    city: city || null,
    barbers: barbers || null,
    tipo,
    servicios,
    precio: precio || null,
    sistemaActual: sistema,
    estilo,
    color: colorClean,
    instagram: instagram || null,
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

  logger.info(`[synaptech:lead] creado ${ref.id} barberia="${barberia}" tipo=${tipo} src=${source}`);
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

function onlyDigits(s) { return String(s || '').replace(/\D/g, ''); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]); }

/** Devuelve un % de completitud "demo-readiness": qué tan listo está
 *  el lead para que armes la demo sin tener que pedir más datos. */
function demoReadiness(lead) {
  const checks = [
    { key: 'tipo',       label: 'Tipo de local',         ok: !!lead.tipo },
    { key: 'barbers',    label: 'Tamaño del equipo',     ok: !!lead.barbers },
    { key: 'servicios',  label: 'Servicios definidos',   ok: Array.isArray(lead.servicios) && lead.servicios.length > 0 },
    { key: 'estilo',     label: 'Estilo visual',         ok: !!lead.estilo },
    { key: 'color',      label: 'Color brand',           ok: !!lead.color },
    { key: 'sistema',    label: 'Sistema actual',        ok: !!lead.sistemaActual },
    { key: 'city',       label: 'Ciudad / ubicación',    ok: !!lead.city },
    { key: 'instagram',  label: 'Instagram para preview',ok: !!lead.instagram },
  ];
  const okCount = checks.filter((c) => c.ok).length;
  const pct = Math.round((okCount / checks.length) * 100);
  return { checks, okCount, total: checks.length, pct };
}

/** Sub-bloque de chip (pill) para mostrar items en HTML email. */
function chip(text, bg, fg) {
  return `<span style="display:inline-block;padding:4px 11px;border-radius:99px;background:${bg};color:${fg};font-weight:700;font-size:11px;margin:2px 4px 2px 0">${esc(text)}</span>`;
}

function buildHtml(lead) {
  const name      = lead.name     || '(sin nombre)';
  const barberia  = lead.barberia || '(sin barbería)';
  const phone     = lead.phone    || '';
  const email     = lead.email    || '';
  const city      = lead.city     || '';
  const barbers   = lead.barbers  || '';
  const tipo      = lead.tipo     || '';
  const servicios = Array.isArray(lead.servicios) ? lead.servicios : [];
  const precio    = lead.precio   || '';
  const sistema   = lead.sistemaActual || '';
  const estilo    = lead.estilo   || '';
  const color     = lead.color    || '';
  const instagram = lead.instagram || '';
  const message   = lead.message  || '';
  const source    = lead.source   || 'direct';

  const phoneDigits = onlyDigits(phone);
  const waText = encodeURIComponent(
    `Hola ${name}, te escribo de SynapTech ✦ Recibí tu solicitud para activar ${barberia}. ` +
    `Estoy armando tu demo personalizada con tus datos. ¿Cuándo te queda bien una llamada de 10 minutos?`,
  );
  const waUrl = phoneDigits ? `https://wa.me/${phoneDigits}?text=${waText}` : '';
  const igUrl = instagram ? `https://instagram.com/${instagram}` : '';

  const srcColor = source === 'ig' || source === 'instagram'
    ? '#d62976' : source === 'stories' ? '#f56040' : '#72a129';

  const tipoLabel    = tipo ? (LABELS.tipo[tipo] || tipo) : '';
  const barbersLabel = barbers ? (LABELS.barbers[barbers] || barbers) : '';
  const sistemaLabel = sistema ? (LABELS.sistema[sistema] || sistema) : '';
  const estiloLabel  = estilo ? (LABELS.estilo[estilo] || estilo) : '';

  const serviciosHtml = servicios.length
    ? servicios.map((s) => chip(LABELS.servicios[s] || s, '#ecfccb', '#3f6212')).join('')
    : '<span style="color:#9aa88c;font-size:12px;font-style:italic">No especificó</span>';

  const ready = demoReadiness(lead);
  const readyChecksHtml = ready.checks.map((c) =>
    `<tr><td style="padding:3px 0;font-size:12px;color:${c.ok?'#1d6118':'#9aa88c'};vertical-align:middle">` +
    `<span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:${c.ok?'#cef07c':'#e5e7eb'};color:#15240b;text-align:center;line-height:14px;font-size:10px;font-weight:900;margin-right:8px">${c.ok?'✓':'·'}</span>` +
    `${esc(c.label)}</td></tr>`).join('');

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"></head>
<body style="margin:0;background:#f6f7f4;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#15240b">
  <div style="max-width:620px;margin:32px auto;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 8px 32px rgba(21,36,11,0.10)">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0c1108 0%,#2c5a17 60%,#92c83a 100%);padding:28px 32px;color:#fff;position:relative">
      <div style="font-size:11px;font-weight:800;letter-spacing:.22em;color:#cef07c;text-transform:uppercase">Nuevo lead — SynapTech</div>
      <div style="font-size:26px;font-weight:900;margin-top:8px;letter-spacing:-.5px">${esc(barberia)}</div>
      <div style="font-size:14px;color:#cdd9be;margin-top:4px">${esc(name)}${city ? ' · ' + esc(city) : ''}${tipoLabel ? ' · ' + esc(tipoLabel) : ''}</div>

      <!-- Demo readiness % -->
      <div style="margin-top:18px;display:inline-block;padding:8px 14px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.22);border-radius:12px;font-size:12px;font-weight:700">
        <span style="color:#cef07c">DEMO READINESS</span>
        <span style="color:#fff;font-size:14px;margin-left:8px">${ready.okCount} / ${ready.total} datos</span>
        <span style="color:${ready.pct >= 75 ? '#cef07c' : ready.pct >= 50 ? '#fde68a' : '#fecaca'};margin-left:6px;font-weight:900">${ready.pct}%</span>
      </div>
    </div>

    <!-- Body -->
    <div style="padding:26px 32px">

      <p style="margin:0 0 22px;font-size:14px;color:#5a6052;line-height:1.5">
        Acabas de recibir una solicitud de activación 🎯 ${ready.pct >= 75 ? '<b style="color:#1d6118">Datos suficientes para armar demo.</b>' : '<b style="color:#a16207">Faltan algunos datos — confirma por WhatsApp.</b>'}
      </p>

      <!-- ── Sección: Contacto ── -->
      <div style="margin-bottom:22px">
        <h3 style="font-size:11px;font-weight:800;letter-spacing:.18em;color:#72a129;text-transform:uppercase;margin:0 0 10px;border-bottom:1px solid #e8efd9;padding-bottom:6px">Contacto</h3>
        <table style="width:100%;font-size:13px;border-collapse:collapse">
          <tr><td style="padding:5px 0;color:#8b8f82;width:130px">Nombre</td><td style="padding:5px 0;font-weight:600">${esc(name)}</td></tr>
          <tr><td style="padding:5px 0;color:#8b8f82">WhatsApp</td><td style="padding:5px 0;font-family:monospace">${esc(phone) || '—'}</td></tr>
          ${email   ? `<tr><td style="padding:5px 0;color:#8b8f82">Email</td><td style="padding:5px 0">${esc(email)}</td></tr>` : ''}
          ${city    ? `<tr><td style="padding:5px 0;color:#8b8f82">Ciudad</td><td style="padding:5px 0">${esc(city)}</td></tr>` : ''}
          ${igUrl   ? `<tr><td style="padding:5px 0;color:#8b8f82">Instagram</td><td style="padding:5px 0"><a href="${esc(igUrl)}" style="color:#d62976;text-decoration:none;font-weight:600">@${esc(instagram)} →</a></td></tr>` : ''}
          <tr><td style="padding:5px 0;color:#8b8f82">Origen</td><td style="padding:5px 0"><span style="display:inline-block;padding:2px 10px;border-radius:99px;background:${srcColor}1f;color:${srcColor};font-weight:700;font-size:11px;text-transform:uppercase">${esc(source)}</span></td></tr>
        </table>
      </div>

      <!-- ── Sección: Su negocio ── -->
      <div style="margin-bottom:22px">
        <h3 style="font-size:11px;font-weight:800;letter-spacing:.18em;color:#72a129;text-transform:uppercase;margin:0 0 10px;border-bottom:1px solid #e8efd9;padding-bottom:6px">Su negocio</h3>
        <table style="width:100%;font-size:13px;border-collapse:collapse">
          ${tipoLabel    ? `<tr><td style="padding:5px 0;color:#8b8f82;width:130px">Tipo de local</td><td style="padding:5px 0;font-weight:600">${esc(tipoLabel)}</td></tr>` : ''}
          ${barbersLabel ? `<tr><td style="padding:5px 0;color:#8b8f82">Equipo</td><td style="padding:5px 0;font-weight:600">${esc(barbersLabel)}</td></tr>` : ''}
          ${precio       ? `<tr><td style="padding:5px 0;color:#8b8f82">Precio promedio</td><td style="padding:5px 0;font-weight:600">${esc(precio)}</td></tr>` : ''}
          ${sistemaLabel ? `<tr><td style="padding:5px 0;color:#8b8f82">Sistema actual</td><td style="padding:5px 0"><span style="color:#a16207;font-weight:600">${esc(sistemaLabel)}</span></td></tr>` : ''}
          <tr><td style="padding:8px 0 5px;color:#8b8f82;vertical-align:top">Servicios</td><td style="padding:8px 0 5px">${serviciosHtml}</td></tr>
        </table>
      </div>

      <!-- ── Sección: Personalización para demo ── -->
      ${estiloLabel || color ? `<div style="margin-bottom:22px">
        <h3 style="font-size:11px;font-weight:800;letter-spacing:.18em;color:#72a129;text-transform:uppercase;margin:0 0 10px;border-bottom:1px solid #e8efd9;padding-bottom:6px">Personalización para demo</h3>
        <table style="width:100%;font-size:13px;border-collapse:collapse">
          ${estiloLabel ? `<tr><td style="padding:5px 0;color:#8b8f82;width:130px">Estilo visual</td><td style="padding:5px 0;font-weight:600">${esc(estiloLabel)}</td></tr>` : ''}
          ${color ? `<tr><td style="padding:8px 0;color:#8b8f82;vertical-align:middle">Color brand</td><td style="padding:8px 0"><div style="display:inline-flex;align-items:center;gap:10px"><span style="display:inline-block;width:28px;height:28px;border-radius:50%;background:${esc(color)};border:2px solid #e5e7eb;box-shadow:0 1px 3px rgba(0,0,0,.12)"></span><code style="font-family:monospace;font-weight:700;color:#15240b">${esc(color)}</code></div></td></tr>` : ''}
        </table>
      </div>` : ''}

      <!-- ── Mensaje libre ── -->
      ${message ? `<div style="margin-bottom:22px;padding:14px 16px;background:#f4f6ee;border-left:3px solid #92c83a;border-radius:8px">
        <div style="font-size:11px;font-weight:800;letter-spacing:.12em;color:#72a129;text-transform:uppercase;margin-bottom:6px">Mensaje libre</div>
        <p style="margin:0;font-style:italic;color:#3a4530;line-height:1.5">"${esc(message)}"</p>
      </div>` : ''}

      <!-- ── Demo readiness checklist ── -->
      <div style="margin-bottom:22px;padding:14px 16px;background:#fafaf7;border-radius:12px">
        <div style="font-size:11px;font-weight:800;letter-spacing:.12em;color:#72a129;text-transform:uppercase;margin-bottom:10px">✦ Demo Readiness Checklist</div>
        <table style="width:100%">${readyChecksHtml}</table>
      </div>

      <!-- ── CTAs ── -->
      <div style="margin-top:24px;display:flex;gap:10px;flex-wrap:wrap">
        ${waUrl ? `<a href="${esc(waUrl)}" style="display:inline-block;background:#25D366;color:#fff;text-decoration:none;font-weight:800;font-size:13px;padding:13px 22px;border-radius:12px;box-shadow:0 4px 14px rgba(37,211,102,0.3)">📱 Escribir por WhatsApp</a>` : ''}
        ${email ? `<a href="mailto:${esc(email)}?subject=${encodeURIComponent('SynapTech — activación de tu barbería')}" style="display:inline-block;background:#15240b;color:#fff;text-decoration:none;font-weight:800;font-size:13px;padding:13px 22px;border-radius:12px">✉ Email</a>` : ''}
        ${igUrl ? `<a href="${esc(igUrl)}" style="display:inline-block;background:linear-gradient(135deg,#feda75,#d62976,#4f5bd5);color:#fff;text-decoration:none;font-weight:800;font-size:13px;padding:13px 22px;border-radius:12px">📷 Ver IG</a>` : ''}
      </div>
    </div>

    <div style="padding:14px 32px;background:#fafaf7;border-top:1px solid #eef0e9;font-size:11px;color:#8b8f82">
      SynapTech · aviso automático de lead inbound · empieza.synaptechspa.cl
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
      const ready = demoReadiness(lead);
      await sendResend(RESEND_API_KEY.value(), {
        from:    FROM,
        to:      [ADMIN_EMAIL],
        subject: `🎯 [${ready.pct}%] Lead SynapTech: ${lead.barberia || lead.name || 'sin datos'}${lead.source ? ' · ' + lead.source : ''}`,
        html:    buildHtml(lead),
      });
      logger.info(`[synaptech:aviso] email enviado leadId=${leadId} readiness=${ready.pct}%`);
    } catch (err) {
      logger.error(`[synaptech:aviso] fallo enviando aviso leadId=${leadId}:`, err.message);
    }
    return null;
  },
);
