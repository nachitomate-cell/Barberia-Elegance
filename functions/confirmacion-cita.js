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
const { getTenantConfig, mapsUrl } = require('./lib/tenant-mail-config');

const RESEND_API_KEY = defineSecret('RESEND_API_KEY');

const db = admin.firestore();

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

function buildEmailHtml({ cfg, cita, cancelUrl, reagendarUrl, chatUrl }) {
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
        <!-- Info del local. La dirección es clickeable: en móvil abre Google Maps
             (y desde ahí el cliente puede redirigir a Waze/Uber con un tap),
             en desktop abre la web de Maps. Whole-line clickable + CTA "Cómo
             llegar" en el color del tenant para señalar la acción sin cambiar
             el peso visual del info-strip. -->
        ${(cfg.direccion || cfg.horario || cita.sucursalNombre) ? (() => {
          const addr    = cita.sucursalNombre || cfg.direccion || '';
          const addrUrl = mapsUrl(addr);
          const addrRow = addr ? (addrUrl
            ? `<tr><td style="font-size:13px;color:#888;padding:3px 0;">
                 <a href="${addrUrl}" target="_blank" rel="noopener"
                    style="color:#aaa;text-decoration:none;">
                   📍 ${addr}
                   <span style="color:${cfg.color};font-size:11px;font-weight:600;margin-left:6px;white-space:nowrap;">Cómo llegar →</span>
                 </a>
               </td></tr>`
            : `<tr><td style="font-size:13px;color:#888;padding:3px 0;">📍 ${addr}</td></tr>`
          ) : '';
          return `
        <tr>
          <td style="padding:0 36px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:#141417;border-radius:10px;border:1px solid #1e1e24;padding:16px 20px;">
              ${addrRow}
              ${cfg.horario ? `<tr><td style="font-size:13px;color:#888;padding:3px 0;">🕒 ${cfg.horario}</td></tr>` : ''}
            </table>
          </td>
        </tr>`;
        })() : ''}

        ${cita.codigoCita ? `
        <!-- Código de gestión rápida vía /chat (sin login) -->
        <tr>
          <td style="padding:0 36px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:#1a1a1f;border:1px dashed ${cfg.color}88;border-radius:12px;padding:20px 22px;">
              <tr><td align="center">
                <p style="margin:0 0 8px;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${cfg.color};">📋 Tu código de gestión</p>
                <p style="margin:0 0 12px;font-size:28px;font-weight:900;letter-spacing:4px;color:#fff;font-family:'Courier New','Monaco',monospace;">${cita.codigoCita}</p>
                <p style="margin:0 0 14px;font-size:12px;color:#aaa;line-height:1.55;">
                  Con este código puedes <strong style="color:#ddd;">cancelar o reagendar</strong> tu cita
                  desde nuestro chat público, sin iniciar sesión.
                </p>
                <a href="${chatUrl}"
                  style="display:inline-block;padding:10px 22px;background:${cfg.color}1a;color:${cfg.color};border:1px solid ${cfg.color}55;font-size:12px;font-weight:700;border-radius:8px;text-decoration:none;">
                  Gestionar desde el chat →
                </a>
              </td></tr>
            </table>
          </td>
        </tr>` : ''}

        <!-- Reagendar / Cancelar -->
        <tr>
          <td style="padding:0 36px 28px;">
            <p style="margin:0 0 14px;font-size:13px;color:#666;">¿Necesitas reagendar o cancelar? Puedes hacerlo desde el club:</p>
            <a href="${reagendarUrl}"
              style="display:inline-block;padding:12px 28px;background:${cfg.color};color:#000;font-size:13px;font-weight:700;border-radius:8px;text-decoration:none;margin:0 8px 10px 0;">
              Reagendar mi cita
            </a>
            <a href="${cancelUrl}"
              style="display:inline-block;padding:12px 28px;background:transparent;border:1px solid #444;color:#aaa;font-size:13px;font-weight:600;border-radius:8px;text-decoration:none;margin:0 0 10px;">
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

// Genera un código corto XXX-XXX (igual al del flujo público) para incrustar
// en el email. Caracteres sin O/0/I/1/L para evitar confusión visual.
function _genCodigoCita() {
  const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += CHARS[Math.floor(Math.random() * CHARS.length)];
  return code.slice(0, 3) + '-' + code.slice(3);
}

// Resuelve la ruta del doc de cita según el tenant (elegance vive en raíz).
function _citaDocRef(citaId, tenantId) {
  if (!citaId) return null;
  return tenantId === 'elegance'
    ? db.collection('citas').doc(citaId)
    : db.collection('tenants').doc(tenantId).collection('citas').doc(citaId);
}

// ── Core: enviar confirmación ─────────────────────────────────────────────────

async function enviarConfirmacion(citaId, data, tenantId) {
  const email = data.clienteEmail;
  if (!email || !email.includes('@')) {
    logger.info(`[Confirmacion] Sin email válido para cita ${citaId} — omitiendo`);
    return;
  }

  const cfg = getTenantConfig(tenantId, logger);

  // Backfill del código: si la cita se creó por un path que no lo incluyó
  // (Flow, Mercado Pago o algunas citas viejas del panel), generamos uno
  // ahora y lo guardamos en el doc para que el recordatorio y /chat también
  // lo encuentren. Sin esto el bloque del código en el email queda vacío.
  if (!data.codigoCita || !String(data.codigoCita).trim()) {
    const nuevo = _genCodigoCita();
    data = { ...data, codigoCita: nuevo };
    try {
      const ref = _citaDocRef(citaId, tenantId);
      if (ref) await ref.update({ codigoCita: nuevo });
      logger.info(`[Confirmacion] Backfill codigoCita ${nuevo} en cita ${citaId} (${tenantId})`);
    } catch (e) {
      logger.warn(`[Confirmacion] No se pudo guardar codigoCita backfill: ${e.message}`);
    }
  }

  const cancelUrl    = `${cfg.dashboardUrl}?accion=cancelar&citaId=${citaId}`;
  const reagendarUrl = `${cfg.dashboardUrl}?accion=reagendar&citaId=${citaId}`;
  // chatUrl = misma raíz del dashboard pero terminando en /chat. Permite
  // gestionar la cita sin login usando el código que va en el email.
  const chatUrl      = String(cfg.dashboardUrl || '').replace(/\/dashboard\/?$/, '/chat');

  const html = buildEmailHtml({ cfg, cita: data, cancelUrl, reagendarUrl, chatUrl });

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
