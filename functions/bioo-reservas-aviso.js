'use strict';

// functions/bioo-reservas-aviso.js
// ─────────────────────────────────────────────────────────────────────────────
//  BIOO RESERVAS — aviso por email al barbero cuando un visitante reserva.
//
//  Trigger: onDocumentCreated('bios/{username}/reservas/{reservaId}')
//  Acción:  resuelve el email del dueño (vía /bios/{u}.uid → Auth.getUser)
//           y le manda un email con los datos de la cita + botón WhatsApp.
//
//  Sin reintentos: si Resend falla, mejor un log que un email duplicado.
//
//  DEPLOY:
//    firebase deploy --only functions:avisarNuevaReservaBioo
// ─────────────────────────────────────────────────────────────────────────────

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
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

/** "YYYY-MM-DD" → "lunes 8 de julio". Si llega algo raro lo devuelve igual. */
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

function buildWaUrl(reserva) {
  const digits = String(reserva.cliente && reserva.cliente.whatsapp || '').replace(/\D/g, '');
  if (digits.length < 8) return '';
  const nombre = String(reserva.cliente && reserva.cliente.nombre || '').trim() || 'tu cita';
  const fechaFmt = formatearFecha(reserva.fecha);
  const msg = `Hola ${nombre}! 👋 Confirmo tu cita de ${reserva.servicioNombre} el ${fechaFmt} a las ${reserva.hora}. ¡Te espero!`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
}

function buildHtml({ username, reserva, fechaFmt }) {
  const wa     = buildWaUrl(reserva);
  const tel    = String(reserva.cliente && reserva.cliente.whatsapp || '').replace(/[^\d+]/g, '');
  const precio = (typeof reserva.precio === 'number' && reserva.precio > 0)
    ? `$${reserva.precio.toLocaleString('es-CL')}` : '';

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"></head>
<body style="margin:0;background:#f6f7f4;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#15240b">
  <div style="max-width:540px;margin:32px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 18px rgba(21,36,11,0.08)">
    <div style="background:linear-gradient(135deg,#15240b,#2c5a17);padding:24px 28px;color:#fff">
      <div style="font-size:11px;font-weight:700;letter-spacing:.18em;color:#92c83a;text-transform:uppercase">Nueva reserva</div>
      <div style="font-size:22px;font-weight:800;margin-top:6px">${escapeHtml(reserva.cliente && reserva.cliente.nombre || 'Cliente')}</div>
      <div style="font-size:13px;opacity:.85;margin-top:2px">acaba de reservar en bioo.cl/${escapeHtml(username)}</div>
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
        <tr><td style="padding:7px 0;color:#8b8f82">Cliente</td>
            <td style="padding:7px 0;font-weight:600">${escapeHtml(reserva.cliente && reserva.cliente.nombre || '—')}</td></tr>
        <tr><td style="padding:7px 0;color:#8b8f82">WhatsApp</td>
            <td style="padding:7px 0">${escapeHtml(tel || '—')}</td></tr>
      </table>

      <div style="margin-top:22px;display:flex;gap:10px;flex-wrap:wrap">
        ${wa ? `<a href="${wa}" style="display:inline-block;background:#25D366;color:#fff;text-decoration:none;font-weight:700;font-size:13px;padding:12px 18px;border-radius:12px">💬 Confirmar por WhatsApp</a>` : ''}
        <a href="${BIOO_BASE}/editor" style="display:inline-block;background:#15240b;color:#fff;text-decoration:none;font-weight:700;font-size:13px;padding:12px 18px;border-radius:12px">Ver mis reservas</a>
      </div>

      <p style="margin:20px 0 0;font-size:12.5px;color:#8b8f82;line-height:1.5">
        Si no puedes atender este horario, cancela la reserva desde tu editor
        para liberar el slot y notificar al cliente.
      </p>
    </div>

    <div style="padding:14px 28px;background:#fafaf7;border-top:1px solid #eef0e9;font-size:11px;color:#8b8f82">
      bioo · aviso automático de tu agenda
    </div>
  </div>
</body></html>`;
}

/** Calcula el instante en que debe dispararse el recordatorio 24h antes
 *  de la cita. Asume hora local de Chile (TZ del comercio). Si la cita
 *  ya pasó o queda a menos de 24h, devuelve null (no tiene sentido
 *  programar un recordatorio para el pasado). */
function computarReminderAt(fecha, hora) {
  const m = String(fecha || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const h = String(hora || '').match(/^(\d{2}):(\d{2})$/);
  if (!m || !h) return null;
  // new Date(y, m-1, d, hh, mm) crea el instante en hora del SERVIDOR.
  // Cloud Functions corre en UTC; el comercio chileno es UTC-4/-3. Para
  // no introducir un offset, interpretamos fecha+hora como hora local de
  // Chile vía Date.UTC + offset fijo de -4h (Chile usa CLST/CLT). Para
  // mayor precisión a futuro podríamos leer el TZ del perfil del barbero.
  const tzOffsetMin = 4 * 60; // Chile continental ≈ UTC-4
  const utcMs = Date.UTC(
    parseInt(m[1], 10),
    parseInt(m[2], 10) - 1,
    parseInt(m[3], 10),
    parseInt(h[1], 10),
    parseInt(h[2], 10),
  ) + tzOffsetMin * 60 * 1000;
  const slot = new Date(utcMs);
  const reminder = new Date(slot.getTime() - 24 * 60 * 60 * 1000);
  if (reminder.getTime() <= Date.now()) return null;
  return reminder;
}

/** Bumpea el contador mensual de reservas del bioo. Idempotente respecto a
 *  meses (al cambiar de mes resetea usadasMes a 0 antes de sumar). El doc
 *  vive en bios/{u}/reservasMeta/contadores y NO contiene PII — la UI lo
 *  lee para mostrar la barra de uso del free tier. */
async function bumpContadorMensual(username) {
  const ref = admin.firestore().doc(`bios/${username}/reservasMeta/contadores`);
  const d = new Date();
  const mesActual = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  await admin.firestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const cur = snap.exists ? snap.data() : {};
    const sameMonth = cur.mesActual === mesActual;
    const usadasMes      = (sameMonth ? Number(cur.usadasMes || 0) : 0) + 1;
    const totalHistorico = Number(cur.totalHistorico || 0) + 1;
    tx.set(ref, {
      mesActual,
      usadasMes,
      totalHistorico,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  });
}

exports.avisarNuevaReservaBioo = onDocumentCreated(
  { document: 'bios/{username}/reservas/{reservaId}', secrets: [RESEND_API_KEY], retry: false },
  async (event) => {
    const username = event.params.username;
    const reserva  = event.data?.data() || {};

    // Sanity: el visitante solo puede crear estado 'confirmada' (rule check),
    // pero por si en el futuro alguien cambia la rule: solo avisamos en ese caso.
    if (reserva.estado !== 'confirmada') {
      logger.info(`[bioo:reserva] skip @${username}: estado=${reserva.estado || '—'}`);
      return null;
    }

    // Contador mensual primero (es lo más barato y no depende del email).
    try {
      await bumpContadorMensual(username);
    } catch (err) {
      logger.error(`[bioo:reserva] no se pudo bumpear contador de @${username}:`, err.message);
    }

    // Backfill `reminderAt` (slot menos 24h) en el doc de la reserva. Esto lo
    // consulta la CF scheduled recordatorio24hCliente. Lo escribimos acá con
    // Admin SDK (bypass de rules) para no expandir la regla pública del
    // visitante. Si el cómputo falla, el recordatorio simplemente no sale —
    // log + sigue para no romper el aviso al barbero.
    try {
      const reminderAt = computarReminderAt(reserva.fecha, reserva.hora);
      if (reminderAt) {
        await event.data.ref.update({ reminderAt: admin.firestore.Timestamp.fromDate(reminderAt) });
      }
    } catch (err) {
      logger.error(`[bioo:reserva] no se pudo setear reminderAt @${username}:`, err.message);
    }

    // Resolver email del dueño: /bios/{u}.uid → admin.auth().getUser(uid).
    let email = '';
    try {
      const bioSnap = await admin.firestore().doc(`bios/${username}`).get();
      const uid = bioSnap.exists ? bioSnap.get('uid') : null;
      if (!uid) {
        logger.warn(`[bioo:reserva] @${username} sin uid en /bios — no envío email.`);
        return null;
      }
      const user = await admin.auth().getUser(uid);
      email = user.email || '';
      if (!email) {
        // Sesión anónima sin email vinculado (Lazy Registration aún no upgrade).
        // El barbero verá la reserva en /editor; el aviso queda silenciado.
        logger.info(`[bioo:reserva] @${username} (uid=${uid}) sin email — usuario anónimo, sin aviso.`);
        return null;
      }
    } catch (err) {
      logger.error(`[bioo:reserva] no se pudo resolver email de @${username}:`, err.message);
      return null;
    }

    const fechaFmt = formatearFecha(reserva.fecha);
    const subject  = `📅 Nueva reserva — ${reserva.cliente && reserva.cliente.nombre || 'Cliente'} · ${fechaFmt} ${reserva.hora}`;

    try {
      await sendResend(RESEND_API_KEY.value(), {
        from:    FROM,
        to:      [email],
        subject,
        html:    buildHtml({ username, reserva, fechaFmt }),
      });
      logger.info(`[bioo:reserva] aviso enviado a ${email} por reserva en @${username}.`);
    } catch (err) {
      logger.error(`[bioo:reserva] fallo enviando aviso a ${email} (@${username}):`, err.message);
    }
    return null;
  },
);
