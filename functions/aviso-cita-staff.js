'use strict';

// ─────────────────────────────────────────────────────────────────────────────
//  aviso-cita-staff.js
//  Email de respaldo al STAFF cuando se crea una cita. El push FCM depende de
//  que el teléfono mantenga viva la suscripción del navegador (tokens stale,
//  ahorro de batería, PWA matada en background); el email siempre llega.
//
//  Opt-in por tenant: _system/{tid}.emailStaffCitas === true
//  (controla el volumen contra la cuota de Resend).
//
//  Destinatarios: el barbero asignado a la cita (si tiene email);
//  si no se resuelve, fallback a admins/jefes del local con email.
//  No incluye teléfono ni email del cliente (política: no exponer el canal
//  de contacto del cliente al staff).
//
//  Triggers:
//    avisoCitaStaffElegance → /citas/{citaId}
//    avisoCitaStaffTenant   → /tenants/{tid}/citas/{citaId}
// ─────────────────────────────────────────────────────────────────────────────

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { defineSecret }      = require('firebase-functions/params');
const { logger }            = require('firebase-functions');
const admin                 = require('firebase-admin');
const { writeNotifLog }     = require('./lib/notif-log');
const { TENANT_CONFIG }     = require('./lib/tenant-mail-config');

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

async function estaHabilitado(tenantId) {
  try {
    const doc = await db.doc(`_system/${tenantId}`).get();
    return doc.exists && doc.data().emailStaffCitas === true;
  } catch (e) {
    logger.warn(`[AvisoStaff] No se pudo leer _system/${tenantId}: ${e.message}`);
    return false;
  }
}

// Branding: tenants a medida viven en lib/tenant-mail-config.js; los
// self-service no están mapeados ahí, así que caemos al doc raíz público
// tenants/{tid} que crea provisionarTenantSelf.
async function brandingDe(tenantId) {
  if (TENANT_CONFIG[tenantId]) return TENANT_CONFIG[tenantId];
  try {
    const doc = await db.doc(`tenants/${tenantId}`).get();
    const d = doc.exists ? doc.data() : {};
    const nombre = d.nombre || d.nombreLocal || d.branding?.nombre || tenantId;
    return {
      nombre,
      color: d.accentColor || '#DAA520',
      from:  `${nombre} <citas@synaptechspa.cl>`,
      dashboardUrl: `https://${tenantId}.synaptechspa.cl/dashboard`,
    };
  } catch (e) {
    logger.warn(`[AvisoStaff] Branding fallback para ${tenantId}: ${e.message}`);
    return { nombre: tenantId, color: '#DAA520', from: `Agenda <citas@synaptechspa.cl>`, dashboardUrl: '' };
  }
}

// Emails del staff: barbero asignado primero; si no hay, admins/jefes.
// Mismo criterio de match que getTokensActivosTenant (id, _mainDocId, nombre).
async function resolverDestinatarios(barberosCol, cita) {
  const barberoId     = String(cita.barberoId || '').trim();
  const barberoNombre = String(cita.barbero || cita.barberoNombre || '').toLowerCase().trim();

  const snap = await barberosCol.get();
  const asignado = new Set();
  const jefes    = new Set();

  snap.forEach(docSnap => {
    const b = docSnap.data();
    if (b.activo === false) return;
    const email = String(b.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) return;

    const matchById      = barberoId && docSnap.id === barberoId;
    const matchByMainDoc = barberoId && b._mainDocId === barberoId;
    const matchByName    = barberoNombre && String(b.nombre || '').toLowerCase().trim() === barberoNombre;
    if (matchById || matchByMainDoc || matchByName) asignado.add(email);
    if (b.rol === 'jefe' || b.rol === 'admin') jefes.add(email);
  });

  return asignado.size ? [...asignado] : [...jefes];
}

function buildStaffHtml({ cfg, cita, panelUrl }) {
  const cliente  = cita.clienteNombre || cita.nombre || 'Cliente';
  const servicio = cita.servicioNombre || cita.servicio || 'Servicio';
  const barbero  = cita.barbero || cita.barberoNombre || '';
  const fecha    = fmtFecha(cita.fecha);
  const hora     = cita.hora || '—';

  const fila = (label, value) => value ? `
    <tr>
      <td style="padding:6px 0;color:#999;font-size:13px;width:110px;">${label}</td>
      <td style="padding:6px 0;color:#ffffff;font-size:13px;font-weight:600;">${value}</td>
    </tr>` : '';

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Nueva cita — ${cfg.nombre}</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#111115;border-radius:16px;overflow:hidden;border:1px solid #222228;">
        <tr>
          <td style="background:${cfg.headerBg || '#030f1a'};padding:28px 36px 24px;border-bottom:2px solid ${cfg.color};">
            <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:${cfg.color};">${cfg.nombre}</p>
            <h1 style="margin:0;font-size:24px;font-weight:900;color:#f1f5f9;letter-spacing:-0.5px;">📅 Nueva cita agendada</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 36px 8px;">
            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:#1a1a1f;border-radius:12px;border:1px solid #2a2a30;padding:18px 24px;">
              <tr><td>
                <table width="100%" cellpadding="0" cellspacing="0">
                  ${fila('Cliente', cliente)}
                  ${fila('Servicio', servicio)}
                  ${fila('Fecha', fecha)}
                  ${fila('Hora', hora)}
                  ${fila('Profesional', barbero)}
                </table>
              </td></tr>
            </table>
          </td>
        </tr>
        ${panelUrl ? `
        <tr>
          <td style="padding:20px 36px 8px;" align="center">
            <a href="${panelUrl}" style="display:inline-block;background:${cfg.color};color:#000;font-size:14px;font-weight:800;text-decoration:none;padding:13px 34px;border-radius:10px;">Ver agenda</a>
          </td>
        </tr>` : ''}
        <tr>
          <td style="padding:18px 36px 26px;">
            <p style="margin:0;font-size:11px;color:#555;line-height:1.6;">
              Aviso automático para el staff de ${cfg.nombre}. Es un respaldo del aviso push:
              te llega aunque el teléfono haya desactivado las notificaciones de la app.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Core ──────────────────────────────────────────────────────────────────────

async function avisarStaff(tenantId, citaId, cita, barberosCol, panelUrl) {
  if (!(await estaHabilitado(tenantId))) return;

  const destinatarios = await resolverDestinatarios(barberosCol, cita);
  if (!destinatarios.length) {
    logger.info(`[AvisoStaff] ${tenantId}: sin emails de staff para cita ${citaId} — omitiendo`);
    return;
  }

  const cfg  = await brandingDe(tenantId);
  const html = buildStaffHtml({ cfg, cita, panelUrl: panelUrl(cfg) });

  const cliente = cita.clienteNombre || cita.nombre || 'Cliente';
  const subject = `📅 Nueva cita — ${cita.fecha || ''} ${cita.hora || ''} · ${cliente}`.replace(/\s+/g, ' ').trim();

  try {
    await sendResend(RESEND_API_KEY.value(), { from: cfg.from, to: destinatarios, subject, html });
    logger.info(`[AvisoStaff] ${tenantId}: email enviado a ${destinatarios.join(', ')} (cita ${citaId})`);
    await writeNotifLog(db, {
      tenantId,
      type:    'email_staff_cita',
      channel: 'email',
      status:  'sent',
      to:      { email: destinatarios.join(', ') },
      meta:    { citaId, cliente, fecha: cita.fecha || '', hora: cita.hora || '' },
    });
  } catch (err) {
    logger.error(`[AvisoStaff] ${tenantId}: fallo el envío (cita ${citaId}):`, err);
    await writeNotifLog(db, {
      tenantId,
      type:    'email_staff_cita',
      channel: 'email',
      status:  'failed',
      to:      { email: destinatarios.join(', ') },
      error:   err.message,
      meta:    { citaId },
    });
  }
}

// Para scripts de prueba (scripts/test-aviso-staff.js)
exports._test = { buildStaffHtml, resolverDestinatarios, brandingDe, sendResend };

// ── Triggers ──────────────────────────────────────────────────────────────────

exports.avisoCitaStaffElegance = onDocumentCreated(
  { document: 'citas/{citaId}', secrets: [RESEND_API_KEY] },
  async (event) => {
    const cita = event.data?.data();
    if (!cita) return null;
    await avisarStaff(
      'elegance',
      event.params.citaId,
      cita,
      db.collection('barberos'),
      cfg => String(cfg.dashboardUrl || '').replace(/\/dashboard\/?$/, '/agenda'),
    );
    return null;
  }
);

exports.avisoCitaStaffTenant = onDocumentCreated(
  { document: 'tenants/{tenantId}/citas/{citaId}', secrets: [RESEND_API_KEY] },
  async (event) => {
    const cita = event.data?.data();
    if (!cita) return null;
    const { tenantId, citaId } = event.params;
    await avisarStaff(
      tenantId,
      citaId,
      cita,
      db.collection(`tenants/${tenantId}/barberos`),
      cfg => String(cfg.dashboardUrl || '').replace(/\/dashboard\/?$/, '/gestion-interna/agenda'),
    );
    return null;
  }
);
