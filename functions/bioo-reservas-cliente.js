'use strict';

// functions/bioo-reservas-cliente.js
// ─────────────────────────────────────────────────────────────────────────────
//  BIOO RESERVAS — emails AL CLIENTE (no al barbero).
//
//  Dos funciones:
//    1) confirmarReservaCliente — onCreate sobre /bios/{u}/reservas/{id}.
//       Envía email INMEDIATO de confirmación al cliente con todos los datos
//       + botón "Agregar a Google Calendar" + link a la página pública del
//       barbero por si necesita reagendar.
//
//    2) recordatorio24hCliente — scheduled cada 15 min. Hace collectionGroup
//       query sobre todas las reservas con `reminderAt <= now` y
//       `reminderSentAt` ausente, manda email de recordatorio y marca el flag.
//
//  Email único = cliente.email (capturado en el modal público de u.html).
//  Si el doc no tiene email (reservas antiguas o por algún bug), se loggea
//  y se salta sin error.
//
//  DEPLOY:
//    firebase deploy --only functions:confirmarReservaCliente,functions:recordatorio24hCliente
// ─────────────────────────────────────────────────────────────────────────────

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onSchedule }        = require('firebase-functions/v2/scheduler');
const { defineSecret }      = require('firebase-functions/params');
const { logger }            = require('firebase-functions');
const admin                 = require('firebase-admin');

const RESEND_API_KEY = defineSecret('RESEND_API_KEY');

const FROM      = 'bioo <hola@synaptechspa.cl>';
const BIOO_BASE = 'https://bioo.cl';

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

const DIAS_LARGOS = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const MESES       = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

function formatearFecha(iso) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return String(iso || '');
  const d = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
  return `${DIAS_LARGOS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/** Genera la URL "agregar evento" de Google Calendar (sin TZ → respeta la
 *  del cliente). Coincide con buildGoogleCalUrl de links/u.html. */
function buildGoogleCalUrl(username, reserva) {
  try {
    const fm = String(reserva.fecha).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const hm = String(reserva.hora).match(/^(\d{2}):(\d{2})$/);
    if (!fm || !hm) return '';
    const yy = parseInt(fm[1], 10);
    const mo = parseInt(fm[2], 10);
    const dd = parseInt(fm[3], 10);
    const hh = parseInt(hm[1], 10);
    const mm = parseInt(hm[2], 10);
    const dur = Number(reserva.duracion) || 30;
    const start = new Date(yy, mo - 1, dd, hh, mm);
    const end   = new Date(start.getTime() + dur * 60000);
    const p = (n) => String(n).padStart(2, '0');
    const fmt = (d) =>
      `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}00`;
    const titulo = `${reserva.servicioNombre || 'Cita'} — @${username}`;
    const detalles = `Reserva confirmada vía ${BIOO_BASE}/${username}`;
    return 'https://calendar.google.com/calendar/render?action=TEMPLATE'
      + `&text=${encodeURIComponent(titulo)}`
      + `&dates=${fmt(start)}/${fmt(end)}`
      + `&details=${encodeURIComponent(detalles)}`;
  } catch (e) {
    return '';
  }
}

function buildHtmlConfirmacion({ username, reserva, fechaFmt, gcalUrl, bioUrl }) {
  const precio = (typeof reserva.precio === 'number' && reserva.precio > 0)
    ? `$${reserva.precio.toLocaleString('es-CL')}` : '';

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"></head>
<body style="margin:0;background:#f6f7f4;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#15240b">
  <div style="max-width:540px;margin:32px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 18px rgba(21,36,11,0.08)">
    <div style="background:linear-gradient(135deg,#15240b,#2c5a17);padding:24px 28px;color:#fff">
      <div style="font-size:11px;font-weight:700;letter-spacing:.18em;color:#92c83a;text-transform:uppercase">Reserva confirmada</div>
      <div style="font-size:22px;font-weight:800;margin-top:6px">¡Hola ${escapeHtml(reserva.cliente && reserva.cliente.nombre || '')}! 👋</div>
      <div style="font-size:13px;opacity:.85;margin-top:2px">Tu hora con <b>@${escapeHtml(username)}</b> está confirmada.</div>
    </div>

    <div style="padding:24px 28px">
      <div style="background:#f0f7e3;border-radius:14px;padding:16px 18px;margin-bottom:18px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.12em;color:#5a6052;text-transform:uppercase;margin-bottom:6px">Cuándo</div>
        <div style="font-size:18px;font-weight:800;color:#15240b">${escapeHtml(fechaFmt)} · ${escapeHtml(reserva.hora)}</div>
      </div>

      <table style="width:100%;font-size:13.5px;border-collapse:collapse">
        <tr><td style="padding:7px 0;color:#8b8f82;width:130px">Servicio</td>
            <td style="padding:7px 0;font-weight:600">${escapeHtml(reserva.servicioNombre || '—')}</td></tr>
        <tr><td style="padding:7px 0;color:#8b8f82">Duración</td>
            <td style="padding:7px 0">${escapeHtml(String(reserva.duracion || ''))} min</td></tr>
        ${precio ? `<tr><td style="padding:7px 0;color:#8b8f82">Precio</td><td style="padding:7px 0">${escapeHtml(precio)}</td></tr>` : ''}
      </table>

      <div style="margin-top:22px;display:flex;gap:10px;flex-wrap:wrap">
        ${gcalUrl ? `<a href="${gcalUrl}" style="display:inline-block;background:#15240b;color:#fff;text-decoration:none;font-weight:700;font-size:13px;padding:12px 18px;border-radius:12px">📅 Agregar a Google Calendar</a>` : ''}
        <a href="${bioUrl}" style="display:inline-block;background:#fff;color:#15240b;text-decoration:none;font-weight:700;font-size:13px;padding:12px 18px;border-radius:12px;border:1px solid #d4e6b6">Ver el perfil</a>
      </div>

      <p style="margin:22px 0 0;font-size:12.5px;color:#8b8f82;line-height:1.5">
        Te enviaremos otro email <b>24 horas antes</b> como recordatorio.<br>
        Si necesitas reagendar o cancelar, contacta a tu barbero por sus canales en el perfil.
      </p>
    </div>

    <div style="padding:14px 28px;background:#fafaf7;border-top:1px solid #eef0e9;font-size:11px;color:#8b8f82">
      bioo · confirmación automática de tu reserva
    </div>
  </div>
</body></html>`;
}

function buildHtmlRecordatorio({ username, reserva, fechaFmt, gcalUrl, bioUrl }) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"></head>
<body style="margin:0;background:#f6f7f4;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#15240b">
  <div style="max-width:540px;margin:32px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 18px rgba(21,36,11,0.08)">
    <div style="background:linear-gradient(135deg,#15240b,#2c5a17);padding:24px 28px;color:#fff">
      <div style="font-size:11px;font-weight:700;letter-spacing:.18em;color:#92c83a;text-transform:uppercase">Recordatorio</div>
      <div style="font-size:22px;font-weight:800;margin-top:6px">Mañana tienes tu cita 👋</div>
      <div style="font-size:13px;opacity:.85;margin-top:2px">Con <b>@${escapeHtml(username)}</b></div>
    </div>

    <div style="padding:24px 28px">
      <div style="background:#f0f7e3;border-radius:14px;padding:16px 18px;margin-bottom:18px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.12em;color:#5a6052;text-transform:uppercase;margin-bottom:6px">Cuándo</div>
        <div style="font-size:18px;font-weight:800;color:#15240b">${escapeHtml(fechaFmt)} · ${escapeHtml(reserva.hora)}</div>
      </div>

      <table style="width:100%;font-size:13.5px;border-collapse:collapse">
        <tr><td style="padding:7px 0;color:#8b8f82;width:130px">Servicio</td>
            <td style="padding:7px 0;font-weight:600">${escapeHtml(reserva.servicioNombre || '—')}</td></tr>
        <tr><td style="padding:7px 0;color:#8b8f82">Duración</td>
            <td style="padding:7px 0">${escapeHtml(String(reserva.duracion || ''))} min</td></tr>
      </table>

      <div style="margin-top:22px;display:flex;gap:10px;flex-wrap:wrap">
        ${gcalUrl ? `<a href="${gcalUrl}" style="display:inline-block;background:#15240b;color:#fff;text-decoration:none;font-weight:700;font-size:13px;padding:12px 18px;border-radius:12px">📅 Agregar a Google Calendar</a>` : ''}
        <a href="${bioUrl}" style="display:inline-block;background:#fff;color:#15240b;text-decoration:none;font-weight:700;font-size:13px;padding:12px 18px;border-radius:12px;border:1px solid #d4e6b6">Ver el perfil</a>
      </div>

      <p style="margin:22px 0 0;font-size:12.5px;color:#8b8f82;line-height:1.5">
        ¡Te esperamos! Si necesitas cancelar a último momento, contacta a tu barbero
        para que pueda liberar el espacio.
      </p>
    </div>

    <div style="padding:14px 28px;background:#fafaf7;border-top:1px solid #eef0e9;font-size:11px;color:#8b8f82">
      bioo · recordatorio automático de tu reserva
    </div>
  </div>
</body></html>`;
}

// ════════════════════════════════════════════════════════════════════════════
//   1) Confirmación inmediata al cliente
// ════════════════════════════════════════════════════════════════════════════

exports.confirmarReservaCliente = onDocumentCreated(
  { document: 'bios/{username}/reservas/{reservaId}', secrets: [RESEND_API_KEY], retry: false },
  async (event) => {
    const username = event.params.username;
    const reserva  = event.data?.data() || {};

    if (reserva.estado !== 'confirmada') {
      logger.info(`[bioo:cliente:conf] skip @${username}: estado=${reserva.estado || '—'}`);
      return null;
    }

    const email = String(reserva.cliente && reserva.cliente.email || '').trim().toLowerCase();
    if (!email) {
      logger.info(`[bioo:cliente:conf] skip @${username}: reserva sin email del cliente.`);
      return null;
    }

    const fechaFmt = formatearFecha(reserva.fecha);
    const gcalUrl  = buildGoogleCalUrl(username, reserva);
    const bioUrl   = `${BIOO_BASE}/${encodeURIComponent(username)}`;
    const subject  = `✅ Confirmada — ${reserva.servicioNombre || 'cita'} · ${fechaFmt} ${reserva.hora}`;

    try {
      await sendResend(RESEND_API_KEY.value(), {
        from:    FROM,
        to:      [email],
        subject,
        html:    buildHtmlConfirmacion({ username, reserva, fechaFmt, gcalUrl, bioUrl }),
      });
      logger.info(`[bioo:cliente:conf] enviado a ${email} (reserva @${username}).`);
    } catch (err) {
      logger.error(`[bioo:cliente:conf] fallo enviando a ${email} (@${username}):`, err.message);
    }
    return null;
  },
);

// ════════════════════════════════════════════════════════════════════════════
//   2) Recordatorio 24h — corre cada 15 min vía Cloud Scheduler
// ════════════════════════════════════════════════════════════════════════════

exports.recordatorio24hCliente = onSchedule(
  { schedule: 'every 15 minutes', secrets: [RESEND_API_KEY], timeZone: 'America/Santiago', region: 'us-central1' },
  async () => {
    const db  = admin.firestore();
    const now = admin.firestore.Timestamp.now();

    // Buscamos reservas confirmadas cuyo reminderAt ya venció (slot - 24h ≤ now).
    // Filtramos un poco hacia atrás (1h) por si la CF no corrió por algún motivo,
    // pero NO más allá: si pasaron >2h sin enviarse, asumimos que ya no aporta.
    const desde = admin.firestore.Timestamp.fromMillis(now.toMillis() - 2 * 60 * 60 * 1000);

    const snap = await db.collectionGroup('reservas')
      .where('reminderAt', '>=', desde)
      .where('reminderAt', '<=', now)
      .where('estado', '==', 'confirmada')
      .get();

    if (snap.empty) {
      logger.info('[bioo:cliente:recordatorio] sin reservas pendientes en ventana.');
      return;
    }

    let enviados = 0, saltados = 0, errores = 0;
    for (const docSnap of snap.docs) {
      const reserva = docSnap.data() || {};
      // Idempotencia: si ya se envió, saltar.
      if (reserva.reminderSentAt) { saltados++; continue; }

      // El path es /bios/{username}/reservas/{reservaId}.
      const parent = docSnap.ref.parent.parent; // → /bios/{username}
      const username = parent ? parent.id : '';
      if (!username) { saltados++; continue; }

      const email = String(reserva.cliente && reserva.cliente.email || '').trim().toLowerCase();
      if (!email) {
        // Sin email no hay a quién recordarle; marcamos para no reconsultar.
        await docSnap.ref.update({ reminderSentAt: admin.firestore.FieldValue.serverTimestamp() })
          .catch(() => {});
        saltados++;
        continue;
      }

      const fechaFmt = formatearFecha(reserva.fecha);
      const gcalUrl  = buildGoogleCalUrl(username, reserva);
      const bioUrl   = `${BIOO_BASE}/${encodeURIComponent(username)}`;
      const subject  = `⏰ Mañana — ${reserva.servicioNombre || 'cita'} · ${fechaFmt} ${reserva.hora}`;

      try {
        await sendResend(RESEND_API_KEY.value(), {
          from:    FROM,
          to:      [email],
          subject,
          html:    buildHtmlRecordatorio({ username, reserva, fechaFmt, gcalUrl, bioUrl }),
        });
        await docSnap.ref.update({ reminderSentAt: admin.firestore.FieldValue.serverTimestamp() });
        enviados++;
      } catch (err) {
        logger.error(`[bioo:cliente:recordatorio] fallo enviando a ${email} (@${username}):`, err.message);
        errores++;
      }
    }

    logger.info(`[bioo:cliente:recordatorio] enviados=${enviados} saltados=${saltados} errores=${errores} total=${snap.size}`);
  },
);
