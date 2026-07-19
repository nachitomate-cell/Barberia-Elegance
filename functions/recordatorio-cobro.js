'use strict';

// functions/recordatorio-cobro.js
// ─────────────────────────────────────────────────────────────────
//  RECORDATORIO DE COBRO (mensualidad) — aviso al admin del local.
//  Cron diario: avisa cuando el pago está próximo a vencer o atrasado.
//  Lee _billing/{tenant}.
//
//  Canales, en orden:
//    1) Push FCM a los jefes/admin del local (si tienen la PWA activada).
//    2) FALLBACK por email (Resend) si NO hay tokens: si nadie activó las
//       notificaciones, el aviso igual sale. Antes esto fallaba en silencio.
//    3) ALERTA al superadmin (/admin) si un local con cobro pendiente lleva
//       ALERTA_DIAS_SIN_CANAL días sin push, y con más urgencia si además no
//       hay email de contacto (ahí el cobro es literalmente inalcanzable).
//
//  Destinatarios de email: SOLO campos explícitos (_billing.emailCobro o
//  tenants/{tid}.ownerEmail). Nunca se derivan de barberos/, cuyos correos
//  son credenciales de login y en muchos locales son inventados.
//
//  Deploy: firebase deploy --only functions:recordatorioCobro
// ─────────────────────────────────────────────────────────────────

const { onSchedule }    = require('firebase-functions/v2/scheduler');
const { defineSecret }  = require('firebase-functions/params');
const { logger }        = require('firebase-functions');
const admin             = require('firebase-admin');
const { dispatchAdminPush } = require('./admin-push');

const db        = admin.firestore();
const messaging = admin.messaging();
const TIMEZONE  = 'America/Santiago';

const RESEND_API_KEY = defineSecret('RESEND_API_KEY');
const MAIL_FROM      = 'SynapTech <cobros@synaptechspa.cl>';

// Días respecto al vencimiento en los que se envía recordatorio.
// Negativo = antes de vencer; 0 = vence hoy; positivo = atrasado.
const DIAS_RECORDATORIO = new Set([-3, -1, 0, 1, 3, 8, 15]);

// Días seguidos sin tokens push antes de molestar al superadmin.
const ALERTA_DIAS_SIN_CANAL = 3;

const fcmTokensColPath = (tid) => (tid === 'elegance' ? 'fcm_tokens' : `tenants/${tid}/fcm_tokens`);
const barberosColPath  = (tid) => (tid === 'elegance' ? 'barberos'   : `tenants/${tid}/barberos`);

function santiagoHoyUTC() {
  const dtf = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
  const [y, m, d] = dtf.format(new Date()).split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function parseFechaUTC(f) {
  try {
    const s = typeof f === 'string' ? f : (f && f.toDate ? f.toDate().toISOString().slice(0, 10) : null);
    if (!s) return null;
    const [y, m, d] = s.slice(0, 10).split('-').map(Number);
    if (!y || !m || !d) return null;
    return Date.UTC(y, m - 1, d);
  } catch { return null; }
}

// Tokens de los administradores/jefes del local.
async function tokensAdmin(tid) {
  try {
    const [bSnap, tSnap] = await Promise.all([
      db.collection(barberosColPath(tid)).get(),
      db.collection(fcmTokensColPath(tid)).where('activo', '==', true).get(),
    ]);
    const uids = new Set();
    bSnap.forEach(doc => {
      const b = doc.data();
      if (b.activo === false) return;
      if (b.rol === 'jefe' || b.rol === 'admin') { uids.add(doc.id); if (b.uid) uids.add(b.uid); }
    });
    const out = [];
    tSnap.forEach(doc => {
      const x = doc.data();
      if (x.token && uids.has(x.uid)) out.push({ id: doc.id, token: x.token });
    });
    return out;
  } catch (e) {
    logger.warn(`[Cobro] tokens ${tid}: ${e.message}`);
    return [];
  }
}

// Destinatarios EXPLÍCITOS para el fallback por correo, en orden:
//   1) settings/general.emailAvisos — correo oficial del local, que el propio
//      dueño edita en /gestion-interna → Configuración → "Correo para avisos".
//   2) _billing/{tid}.emailCobro    — override del superadmin (string | array)
//   3) tenants/{tid}.ownerEmail     — capturado en el alta self-service
// NUNCA se usan los correos de barberos/: son credenciales de login y en
// varios locales están inventados.
const settingsRefPath = (tid) => (tid === 'elegance' ? 'settings/general' : `tenants/${tid}/settings/general`);

async function emailsCobro(tid, billingData) {
  const limpia = (v) => {
    const arr = Array.isArray(v) ? v : (typeof v === 'string' ? [v] : []);
    return [...new Set(arr.map(e => String(e || '').trim().toLowerCase()).filter(e => e.includes('@')))];
  };

  try {
    const s = await db.doc(settingsRefPath(tid)).get();
    if (s.exists) {
      const oficial = limpia(s.data().emailAvisos);
      if (oficial.length) return oficial;
    }
  } catch (e) {
    logger.warn(`[Cobro] emailAvisos ${tid}: ${e.message}`);
  }

  const deBilling = limpia(billingData.emailCobro);
  if (deBilling.length) return deBilling;

  try {
    const t = await db.collection('tenants').doc(tid).get();
    if (t.exists) {
      const owner = limpia(t.data().ownerEmail);
      if (owner.length) return owner;
    }
  } catch (e) {
    logger.warn(`[Cobro] ownerEmail ${tid}: ${e.message}`);
  }
  return [];
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

function buildMensaje(dias, monto) {
  const m = Number(monto) > 0 ? `$${Number(monto).toLocaleString('es-CL')}` : 'tu mensualidad';
  if (dias < 0) {
    const n = Math.abs(dias);
    return { title: `💳 Tu mensualidad vence en ${n} día${n !== 1 ? 's' : ''}`, body: `Paga ${m} a tiempo para mantener tu cuenta activa.` };
  }
  if (dias === 0) return { title: '💳 Tu mensualidad vence hoy', body: `Paga ${m} para mantener tu cuenta activa.` };
  if (dias < 8)  return { title: '⚠️ Tu mensualidad está atrasada', body: `Venció hace ${dias} día${dias !== 1 ? 's' : ''}. Regulariza ${m} para no perder funciones.` };
  if (dias < 15) return { title: '🔒 Secciones bloqueadas por falta de pago', body: `Llevas ${dias} días de atraso. Regulariza ${m} para reactivar Métricas, Comisiones y Caja.` };
  return { title: '⛔ Tu cuenta puede ser suspendida', body: `${dias} días de atraso. Regulariza ${m} hoy para evitar la suspensión.` };
}

function buildEmailHtml({ title, body, tid }) {
  const url = `https://${tid === 'elegance' ? 'www' : tid}.synaptechspa.cl/gestion-interna/mensualidad`;
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.06);">
        <tr><td style="padding:26px 26px 8px;">
          <h1 style="margin:0 0 10px;font-size:19px;line-height:1.3;color:#111827;">${title}</h1>
          <p style="margin:0;font-size:14px;line-height:1.6;color:#4b5563;">${body}</p>
        </td></tr>
        <tr><td style="padding:20px 26px 28px;">
          <a href="${url}" style="display:block;text-align:center;background:#111827;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:13px 20px;border-radius:10px;">Ver mi mensualidad</a>
          <p style="margin:16px 0 0;font-size:11px;line-height:1.5;color:#9ca3af;">
            Recibes este correo porque tienes una mensualidad pendiente en tu panel de SynapTech.
            Activa las notificaciones en Configuración para recibir los avisos directo en tu teléfono.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

exports.recordatorioCobro = onSchedule(
  { schedule: '0 10 * * *', timeZone: TIMEZONE, secrets: [RESEND_API_KEY] },
  async () => {
    const hoyUTC   = santiagoHoyUTC();
    const todayStr = new Date(hoyUTC).toISOString().slice(0, 10);
    const snap     = await db.collection('_billing').get();

    let totalPush = 0, totalMail = 0;
    const sinCanal = [];   // locales inalcanzables → alerta al superadmin

    for (const doc of snap.docs) {
      const tid = doc.id;
      const d   = doc.data();
      const dueUTC = parseFechaUTC(d.fechaProximoPago);
      if (dueUTC === null) continue;

      const dias = Math.round((hoyUTC - dueUTC) / 86400000); // + = atrasado, - = falta
      if (!DIAS_RECORDATORIO.has(dias)) continue;
      // Idempotencia diaria: da igual por qué canal haya salido hoy.
      if (d.ultimoRecordatorioPush === todayStr || d.ultimoRecordatorioEmail === todayStr) continue;

      const { title, body } = buildMensaje(dias, d.montoPendiente);
      const tokens = await tokensAdmin(tid);

      // ── Canal 1: push FCM ──────────────────────────────────────
      if (tokens.length) {
        const invalidos = [];
        let enviados = 0;

        await Promise.all(tokens.map(async t => {
          try {
            await messaging.send({
              token: t.token,
              notification: { title, body },
              data: { tipo: 'cobro', tenantId: tid, url: '/gestion-interna/mensualidad' },
              webpush: {
                headers: { Urgency: 'high' },
                notification: {
                  title, body,
                  icon: '/icons/icon-192.png', badge: '/icons/icon-192.png',
                  tag: `cobro-${tid}`, renotify: true, vibrate: [200, 100, 200],
                },
                fcmOptions: { link: `/gestion-interna/mensualidad?local=${tid}` },
              },
            });
            enviados++;
          } catch (err) {
            const code = err.errorInfo?.code || err.code || '';
            if (['messaging/registration-token-not-registered', 'messaging/invalid-registration-token', 'messaging/invalid-argument'].includes(code)) invalidos.push(t.id);
            logger.warn(`[Cobro] ✗ ${tid}: ${code || err.message}`);
          }
        }));

        if (invalidos.length) {
          const batch = db.batch();
          invalidos.forEach(id => batch.update(db.collection(fcmTokensColPath(tid)).doc(id), { activo: false }));
          await batch.commit().catch(() => {});
        }

        if (enviados > 0) {
          await doc.ref.update({
            ultimoRecordatorioPush: todayStr,
            sinTokensDesde: admin.firestore.FieldValue.delete(),  // se recuperó el canal
          }).catch(() => {});
          totalPush += enviados;
          logger.info(`[Cobro] ✓ ${tid} (dias=${dias}) → ${enviados} push`);
          continue;
        }
        // Si ninguna push salió, seguimos al fallback por correo.
      }

      // ── Canal 2: fallback por email ────────────────────────────
      // Marca desde cuándo este local no tiene push, para la alerta.
      const desde = d.sinTokensDesde || todayStr;
      const diasSinCanal = Math.round((hoyUTC - (parseFechaUTC(desde) ?? hoyUTC)) / 86400000);

      const destinatarios = await emailsCobro(tid, d);
      let mailOk = false;

      if (destinatarios.length) {
        try {
          await sendResend(RESEND_API_KEY.value(), {
            from:    MAIL_FROM,
            to:      destinatarios,
            subject: title,
            html:    buildEmailHtml({ title, body, tid }),
          });
          mailOk = true;
          totalMail += destinatarios.length;
          logger.info(`[Cobro] ✉ ${tid} (dias=${dias}) → email a ${destinatarios.length} destinatario(s)`);
        } catch (e) {
          logger.error(`[Cobro] ✗ email ${tid}: ${e.message}`);
        }
      } else {
        logger.warn(`[Cobro] ${tid}: sin tokens y sin email de contacto`);
      }

      await doc.ref.update({
        sinTokensDesde: desde,
        ...(mailOk ? { ultimoRecordatorioEmail: todayStr } : {}),
      }).catch(() => {});

      // ── Canal 3: alerta al superadmin ──────────────────────────
      // Solo si la falta de push ya es crónica, o si no hubo NINGÚN canal.
      const yaAvisadoHoy = d.ultimaAlertaSuperadmin === todayStr;
      if (!yaAvisadoHoy && (!mailOk || diasSinCanal >= ALERTA_DIAS_SIN_CANAL)) {
        sinCanal.push({ tid, dias, diasSinCanal, mailOk, ref: doc.ref });
      }
    }

    // Una sola push al superadmin por corrida (no una por local).
    if (sinCanal.length) {
      const criticos = sinCanal.filter(x => !x.mailOk);
      const nombres  = sinCanal.map(x => x.tid).join(', ');
      const title = criticos.length
        ? `⛔ ${criticos.length} local(es) sin canal de cobro`
        : `📵 ${sinCanal.length} local(es) sin push de cobro`;
      const body = criticos.length
        ? `Sin push NI email: ${criticos.map(x => x.tid).join(', ')}. No les está llegando el aviso de mensualidad.`
        : `${nombres}: llevan ${ALERTA_DIAS_SIN_CANAL}+ días sin notificaciones activas. El aviso salió por correo.`;
      try {
        await dispatchAdminPush(db, messaging, {
          title, body,
          url:  '/admin/',
          tag:  'admin-cobro-sin-canal',
          data: { tipo: 'cobro_sin_canal', tenants: nombres },
        });
        await Promise.all(sinCanal.map(x =>
          x.ref.update({ ultimaAlertaSuperadmin: todayStr }).catch(() => {})));
      } catch (e) {
        logger.error('[Cobro] alerta superadmin:', e.message);
      }
    }

    logger.info(`[Cobro] Resumen: ${totalPush} push, ${totalMail} email, ${sinCanal.length} sin canal`);
  },
);
