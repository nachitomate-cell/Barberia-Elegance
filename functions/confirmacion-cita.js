'use strict';

// ─────────────────────────────────────────────────────────────────────────────
//  confirmacion-cita.js
//  Envía un email de confirmación al cliente cuando se crea una cita.
//
//  Triggers:
//    confirmacionCitaElegance  → /citas/{citaId}
//    confirmacionCitaTenant    → /tenants/{tid}/citas/{citaId}
//
//  Requiere la variable de entorno RESEND_API_KEY (Firebase Secret).
// ─────────────────────────────────────────────────────────────────────────────

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { defineSecret }      = require('firebase-functions/params');
const { logger }            = require('firebase-functions');
const admin                 = require('firebase-admin');
const { writeNotifLog }     = require('./lib/notif-log');

const RESEND_API_KEY = defineSecret('RESEND_API_KEY');

const db = admin.firestore();

// ── Config por tenant ─────────────────────────────────────────────────────────
const TENANT_CONFIG = {
  elegance: {
    nombre:    'Elegance Barbershop',
    direccion: 'Ecuador 243, Viña del Mar',
    horario:   'Lun–Sáb: 10–20h · Dom: 12–20h',
    color:     '#D4AF37',
    instagram: 'https://www.instagram.com/elegance.cl_/',
    whatsapp:  '',
    from:      'Elegance Barbershop <citas@synaptechspa.cl>',
    dashboardUrl: 'https://barberiaelegance.synaptechspa.cl/dashboard',
  },
  ferraza: {
    nombre:    'Barbería Ferraza',
    direccion: 'Av. Libertad 63 / Local 28',
    horario:   'Lun–Sáb: 10–20h',
    color:     '#C0392B',
    instagram: '',
    whatsapp:  '56994269228',
    from:      'Barbería Ferraza <citas@synaptechspa.cl>',
    dashboardUrl: 'https://barberiaferraza.synaptechspa.cl/dashboard',
  },
  gitana: {
    nombre:    'Gitana Nails Studio',
    direccion: 'Las Encinas 1390 local 18, Concón',
    horario:   'Atención con hora previa',
    color:     '#8E44AD',
    instagram: 'https://www.instagram.com/gitana.nails.studio',
    whatsapp:  '56997023355',
    from:      'Gitana Nails Studio <citas@synaptechspa.cl>',
    dashboardUrl: 'https://gitananails.synaptechspa.cl/dashboard',
  },
  mapubarbershop: {
    nombre:    'Mapu Barber Shop',
    direccion: '',
    horario:   '',
    color:     '#BFA37E',
    instagram: '',
    whatsapp:  '',
    from:      'Mapu Barber Shop <citas@synaptechspa.cl>',
    dashboardUrl: 'https://mapubarbershop.synaptechspa.cl/dashboard',
  },
  chameleon: {
    nombre:    'Chameleon Barber Studio',
    direccion: 'Av. Libertad 868, Viña del Mar',
    horario:   'Lun–Sáb: 10:30–20:00 hrs.',
    color:     '#DAA520',
    instagram: 'https://www.instagram.com/chameleon.barberstudio/',
    whatsapp:  '56928186861',
    from:      'Chameleon Barber Studio <citas@synaptechspa.cl>',
    dashboardUrl: 'https://chameleonbarber.synaptechspa.cl/dashboard',
  },
  lumen: {
    nombre:      "D'Jones Barber",
    slogan:      'Estilo y tradición',
    direccion:   '',
    horario:     '',
    color:       '#C9A050',
    darkHeader:  true,
    instagram:   '',
    whatsapp:    '',
    from:        "D'Jones Barber <citas@synaptechspa.cl>",
    dashboardUrl:'https://djonesbarberia.synaptechspa.cl/dashboard',
  },
  aura: {
    nombre:      'AURA SALÓN & MALE GROOMING',
    slogan:      'Eleva Tu Aura',
    direccion:   'Viña del Mar',
    horario:     'Lun–Sáb: 10:00–20:00 hrs.',
    color:       '#6CABDD',
    instagram:   'https://www.instagram.com/aura.salon.cl/',
    whatsapp:    '56966153086',
    from:        'AURA SALÓN & MALE GROOMING <citas@synaptechspa.cl>',
    dashboardUrl:'https://aurasalonmalegrooming.synaptechspa.cl/dashboard',
  },
  latincaribe: {
    nombre:      'The Latin Caribe',
    slogan:      'Más que un corte, una experiencia.',
    direccion:   'Manuel Rodríguez 299, Copiapó',
    horario:     'Lun–Sáb: 11:00–21:00 · Dom: 12:00–20:00',
    color:       '#35DDE6',
    darkHeader:  true,
    instagram:   '',
    whatsapp:    '',
    from:        'The Latin Caribe <citas@synaptechspa.cl>',
    dashboardUrl:'https://thelatincaribe.synaptechspa.cl/dashboard',
  },
  machos: {
    nombre:      'Macho´s Barbershop',
    slogan:      'Calidad y Asesoría Profesional',
    direccion:   '4 Norte 477 local 5, Viña del Mar',
    horario:     'Lun–Sáb: 10:00–20:00 hrs · Dom: 11:00–17:00 hrs',
    color:       '#f97316',
    instagram:   'https://www.instagram.com/machos_barbershop.cl/',
    whatsapp:    '56978390422',
    from:        'Macho´s Barbershop <citas@synaptechspa.cl>',
    dashboardUrl:'https://machos.synaptechspa.cl/dashboard',
  },
  sionbarberia: {
    nombre:    'Sion Barbería',
    direccion: 'Av. Libertad 123, Viña del Mar',
    horario:   'Lun–Sáb: 10:00–20:00 hrs',
    color:     '#F57808',
    instagram: 'https://www.instagram.com/sionbarberia/',
    whatsapp:  '56988888888',
    from:      'Sion Barbería <citas@synaptechspa.cl>',
    dashboardUrl: 'https://barberiasion.synaptechspa.cl/dashboard',
  },
  kronnos_penablanca: {
    nombre:      'Kronnos Studio Peñablanca',
    slogan:      'Un espacio unisex donde ambos mundos convergen',
    direccion:   'Av. Vicepresidente Bernardo Leighton 20, local 13, Villa Alemana',
    horario:     'Lun a Sáb · 10:30 – 19:00',
    color:       '#e11d2a',
    instagram:   '',
    whatsapp:    '56982504870',
    from:        'Kronnos Studio Peñablanca <citas@synaptechspa.cl>',
    dashboardUrl:'https://kronnospenablanca.synaptechspa.cl/dashboard',
  },
  kronnos_limache: {
    nombre:      'Kronnos Studio Limache',
    slogan:      'Un espacio unisex donde ambos mundos convergen',
    direccion:   'Paseo Las Araucarias 405, local 5, Limache',
    horario:     'Lun a Sáb · 10:30 – 19:00',
    color:       '#f97316',
    instagram:   '',
    whatsapp:    '56920241041',
    from:        'Kronnos Studio Limache <citas@synaptechspa.cl>',
    dashboardUrl:'https://kronnoslimache.synaptechspa.cl/dashboard',
  },
  kronnos_woman: {
    nombre:      'Kronnos Woman',
    slogan:      'Belleza y estilo en un solo lugar',
    direccion:   'Palmira Romano Sur 405, local 3, Limache',
    horario:     'Lun a Dom · 09:30 – 23:00',
    color:       '#ec4899',
    instagram:   '',
    whatsapp:    '',
    from:        'Kronnos Woman <citas@synaptechspa.cl>',
    dashboardUrl:'https://kronnoswoman.synaptechspa.cl/dashboard',
  },
  yugen: {
    nombre:      'Yūgen Studio',
    slogan:      'La profundidad que no se explica, se experimenta',
    direccion:   '',
    horario:     'Lun–Vie: 10:00–19:00 · Sáb: 10:00–18:00 · Dom: 10:00–14:00',
    color:       '#d8d3ca',   // marfil/greige (acento)
    darkHeader:  true,
    headerBg:    '#0b0a09',    // negro cálido (identidad Yūgen)
    intro:       'Hola {nombre}, tu espacio en Yūgen Studio está reservado. Te invitamos a desconectar del exterior y reconectarte contigo mismo. Te esperamos.',
    instagram:   '',
    whatsapp:    '',
    from:        'Yūgen Studio <citas@synaptechspa.cl>',
    dashboardUrl:'https://yugenstudio.synaptechspa.cl/dashboard',
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtFecha(fechaStr) {
  if (!fechaStr) return '—';
  const [y, m, d] = fechaStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).replace(/^\w/, c => c.toUpperCase());
}

function fmtPrecio(precio) {
  const n = Number(precio);
  if (!n) return null;
  return `$${n.toLocaleString('es-CL')}`;
}

async function sendResend(apiKey, payload) {
  const res = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Resend error ${res.status}: ${JSON.stringify(body)}`);
  return body;
}

// ── Template HTML ─────────────────────────────────────────────────────────────

function buildEmailHtml({ cfg, cita, cancelUrl }) {
  const fecha    = fmtFecha(cita.fecha);
  const precio   = fmtPrecio(cita.precio);
  const duracion = cita.duracion ? `${cita.duracion} min` : null;
  const nombre   = cita.clienteNombre || 'Cliente';

  // Corte al Lápiz (Yūgen): reserva sin pago, se carga a la cuenta del cliente.
  const esCorteLapiz = cita.corteLapiz === true;
  const clTotal = esCorteLapiz
    ? fmtPrecio(cita.corteLapizTotal != null
        ? cita.corteLapizTotal
        : (Number(cita.precio) || 0) + (Number(cita.corteLapizRecargo) || 0))
    : null;

  const filaExtra = (label, value) => value ? `
    <tr>
      <td style="padding:6px 0;color:#999;font-size:13px;width:130px;">${label}</td>
      <td style="padding:6px 0;color:#ffffff;font-size:13px;font-weight:600;">${value}</td>
    </tr>` : '';

  // Productos reservados en el cross-sell (entrega/pago presencial en el local).
  const prods = Array.isArray(cita.productosReservados) ? cita.productosReservados : [];
  const prodsTotal = prods.reduce((s, p) => s + (Number(p.precio) || 0), 0);
  const productosHtml = prods.length ? `
        <tr>
          <td style="padding:0 36px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:#1a1a1f;border-radius:12px;border:1px solid #2a2a30;padding:20px 24px;">
              <tr><td>
                <p style="margin:0 0 14px;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${cfg.color};">🛍️ Productos reservados</p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  ${prods.map(p => `
                    <tr>
                      <td style="padding:5px 0;color:#cccccc;font-size:13px;">${p.nombre || 'Producto'}</td>
                      <td style="padding:5px 0;color:#ffffff;font-size:13px;font-weight:600;text-align:right;">${fmtPrecio(p.precio) || '$0'}</td>
                    </tr>`).join('')}
                  <tr><td colspan="2" style="border-top:1px solid #2a2a30;height:10px;"></td></tr>
                  <tr>
                    <td style="padding:2px 0;color:#999;font-size:13px;">Total productos</td>
                    <td style="padding:2px 0;color:${cfg.color};font-size:14px;font-weight:800;text-align:right;">${fmtPrecio(prodsTotal) || '$0'}</td>
                  </tr>
                </table>
                <p style="margin:14px 0 0;font-size:12px;color:#888;line-height:1.5;">
                  📍 Los apartamos para ti: la <strong style="color:#bbb;">entrega y el pago son presenciales</strong> en el local, al momento de tu cita.
                </p>
              </td></tr>
            </table>
          </td>
        </tr>` : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Confirmación de cita — ${cfg.nombre}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#111115;border-radius:16px;overflow:hidden;border:1px solid #222228;">

        <!-- Header con color del tenant -->
        <tr>
          <td style="background:${cfg.headerBg || (cfg.darkHeader ? '#030f1a' : cfg.color)};padding:32px 36px 28px;${cfg.darkHeader ? `border-bottom:2px solid ${cfg.color};` : ''}">
            <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:${cfg.darkHeader ? cfg.color : 'rgba(0,0,0,0.55)'};">${cfg.nombre}</p>
            <h1 style="margin:0;font-size:26px;font-weight:900;color:${cfg.darkHeader ? '#f1f5f9' : '#000'};letter-spacing:-0.5px;">¡Tu cita está confirmada!</h1>
            ${cfg.slogan ? `<p style="margin:8px 0 0;font-size:12px;letter-spacing:2px;font-style:italic;color:${cfg.darkHeader ? cfg.color + 'bb' : 'rgba(0,0,0,0.4)'};">${cfg.slogan}</p>` : ''}
          </td>
        </tr>

        <!-- Saludo -->
        <tr>
          <td style="padding:28px 36px 0;">
            <p style="margin:0;font-size:15px;color:#cccccc;line-height:1.6;">
              ${cfg.intro
                ? cfg.intro.replace('{nombre}', `<strong style="color:#fff;">${nombre}</strong>`)
                : `Hola <strong style="color:#fff;">${nombre}</strong>, tu reserva en <strong style="color:#fff;">${cfg.nombre}</strong> ha sido registrada exitosamente. Te esperamos.`}
            </p>
          </td>
        </tr>

        <!-- Tarjeta de la cita -->
        <tr>
          <td style="padding:24px 36px;">
            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:#1a1a1f;border-radius:12px;border:1px solid #2a2a30;padding:20px 24px;">
              <tr>
                <td>
                  <p style="margin:0 0 16px;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${cfg.color};">Detalle de tu cita</p>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    ${filaExtra('📅 Fecha',    fecha)}
                    ${filaExtra('🕐 Hora',     cita.hora ? `${cita.hora} hrs` : null)}
                    ${filaExtra('✂️ Servicio',  cita.servicioNombre)}
                    ${filaExtra('💈 Barbero',   cita.barbero)}
                    ${filaExtra('📍 Sede',      cita.sucursalNombre || null)}
                    ${filaExtra('⏱ Duración',  duracion)}
                    ${filaExtra('💰 Precio',    precio)}
                    ${esCorteLapiz ? filaExtra('💳 Pago', 'Corte al Lápiz · a fin de mes') : ''}
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
${esCorteLapiz ? `
        <tr>
          <td style="padding:0 36px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:#1a1a1f;border-radius:12px;border:1px solid ${cfg.color}55;padding:18px 22px;">
              <tr><td>
                <p style="margin:0 0 6px;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${cfg.color};">✏️ Corte al Lápiz</p>
                <p style="margin:0;font-size:13px;color:#cccccc;line-height:1.6;">
                  Reservaste con <strong style="color:#fff;">Corte al Lápiz</strong>: no pagas ahora.
                  ${clTotal ? `Se suman <strong style="color:#fff;">${clTotal}</strong> a tu cuenta` : 'El valor se suma a tu cuenta'} y lo pagas a fin de mes.
                </p>
              </td></tr>
            </table>
          </td>
        </tr>` : ''}
${productosHtml}
        <!-- Info del local -->
        ${(cfg.direccion || cfg.horario || cita.sucursalNombre) ? `
        <tr>
          <td style="padding:0 36px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:#141417;border-radius:10px;border:1px solid #1e1e24;padding:16px 20px;">
              ${cita.sucursalNombre ? `<tr><td style="font-size:13px;color:#888;padding:3px 0;">📍 ${cita.sucursalNombre}</td></tr>` : (cfg.direccion ? `<tr><td style="font-size:13px;color:#888;padding:3px 0;">📍 ${cfg.direccion}</td></tr>` : '')}
              ${cfg.horario   ? `<tr><td style="font-size:13px;color:#888;padding:3px 0;">🕒 ${cfg.horario}</td></tr>`   : ''}
            </table>
          </td>
        </tr>` : ''}

        <!-- Cancelar / Reagendar -->
        <tr>
          <td style="padding:0 36px 28px;">
            <p style="margin:0 0 14px;font-size:13px;color:#666;">¿Necesitas cancelar o reagendar? Puedes hacerlo desde el club:</p>
            <a href="${cancelUrl}"
              style="display:inline-block;padding:12px 28px;background:transparent;border:1px solid #444;color:#aaa;font-size:13px;font-weight:600;border-radius:8px;text-decoration:none;">
              Cancelar mi cita
            </a>
            ${cfg.whatsapp ? `
            <p style="margin:20px 0 10px;font-size:12px;color:#555;line-height:1.6;">
              Si aún no estás inscrito en nuestro club de fidelidad, puedes reagendar o cancelar escribiéndonos directamente por WhatsApp:
            </p>
            <a href="https://wa.me/${cfg.whatsapp}?text=Hola%2C%20quisiera%20reagendar%20o%20cancelar%20mi%20cita%20del%20${encodeURIComponent(fecha)}%20a%20las%20${encodeURIComponent(cita.hora || '')}%20hrs"
              style="display:inline-flex;align-items:center;gap:8px;padding:11px 22px;background:#1a2e1a;border:1px solid #25D36655;color:#25D366;font-size:13px;font-weight:600;border-radius:8px;text-decoration:none;">
              <span style="font-size:16px;">💬</span> Contactar por WhatsApp
            </a>` : ''}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 36px;border-top:1px solid #1e1e24;">
            <p style="margin:0;font-size:11px;color:#444;line-height:1.6;">
              Este correo fue enviado automáticamente porque agendaste una cita en ${cfg.nombre}.
              ${cfg.instagram ? `· <a href="${cfg.instagram}" style="color:#555;text-decoration:none;">Instagram</a>` : ''}
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>

</body>
</html>`;
}

// ── Core: enviar confirmación ─────────────────────────────────────────────────

async function enviarConfirmacion(citaId, data, tenantId) {
  const email = data.clienteEmail;
  if (!email || !email.includes('@')) {
    logger.info(`[Confirmacion] Sin email válido para cita ${citaId} — omitiendo`);
    return;
  }

  const cfg = TENANT_CONFIG[tenantId] || TENANT_CONFIG.elegance;

  const cancelUrl = `${cfg.dashboardUrl}?accion=cancelar&citaId=${citaId}`;

  const html = buildEmailHtml({ cfg, cita: data, cancelUrl });

  const apiKey = RESEND_API_KEY.value();
  await sendResend(apiKey, {
    from:    cfg.from,
    to:      [email],
    subject: `✅ Cita confirmada — ${data.servicioNombre || 'Tu reserva'} en ${cfg.nombre}`,
    html,
  });

  logger.info(`[Confirmacion] Email enviado a ${email} (cita ${citaId}, tenant ${tenantId})`);
  await writeNotifLog(db, {
    tenantId,
    type:    'email_confirmacion',
    channel: 'email',
    status:  'sent',
    to:      { nombre: data.clienteNombre || '', email },
    meta:    { citaId, servicio: data.servicioNombre || '', fecha: data.fecha || '', hora: data.hora || '' },
  });
}

// ── Triggers ──────────────────────────────────────────────────────────────────

exports.confirmacionCitaElegance = onDocumentCreated(
  { document: 'citas/{citaId}', secrets: [RESEND_API_KEY] },
  async event => {
    const data = event.data?.data();
    if (!data) return null;
    try {
      await enviarConfirmacion(event.params.citaId, data, 'elegance');
    } catch (e) {
      logger.error('[Confirmacion elegance]', e.message);
    }
    return null;
  },
);

exports.confirmacionCitaTenant = onDocumentCreated(
  { document: 'tenants/{tid}/citas/{citaId}', secrets: [RESEND_API_KEY] },
  async event => {
    const data = event.data?.data();
    if (!data) return null;
    try {
      await enviarConfirmacion(event.params.citaId, data, event.params.tid);
    } catch (e) {
      logger.error('[Confirmacion tenant]', e.message);
    }
    return null;
  },
);
