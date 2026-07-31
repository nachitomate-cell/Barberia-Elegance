'use strict';

// functions/wallet-avisos-cobro.js
// ─────────────────────────────────────────────────────────────────
//  WALLO · AVISOS AUTOMÁTICOS DE COBRO Y TRIAL
//
//  Cron diario 09:00 Santiago que revisa tenants wallo y envía
//  emails al dueño según ventanas críticas:
//
//    TRIAL:
//      - 3 días antes del fin del trial      → "prepara tu tarjeta"
//      - 1 día antes                          → "mañana empieza el cobro"
//      - día del vencimiento (sin autopay)    → "activa ahora para no perder tu tarjeta"
//      - 3 días vencido (sin autopay)         → última advertencia
//
//    COBRO MENSUAL AUTOPAY (después del trial):
//      - 3 días antes del próximo cobro       → "MP cobrará $X el día Y"
//      - 1 día antes                          → recordatorio final
//
//  Idempotencia: cada aviso escribe una marca en _billing.avisosWallo
//  (ej. avisosWallo.trial_3d = '2026-07-28'). El cron no reenvía si
//  ya se envió para esa fecha.
//
//  Email exitoso post-cobro ya lo maneja mpMensualidadWebhook.
//  Email post-cobro FALLIDO también se manda desde acá cuando el
//  cron detecta ultimoPago.status === 'rejected' hace <24h y no se
//  avisó todavía.
//
//  Exports:
//    walletAvisosCobroCron
//
//  DEPLOY:
//    firebase deploy --only functions:walletAvisosCobroCron
// ─────────────────────────────────────────────────────────────────

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const { enviarEmail, MAIL_SECRETS } = require('./lib/mailer');

const db = admin.firestore();
const TZ = 'America/Santiago';
const MAIL_FROM = 'Wallo <cobros@synaptechspa.cl>';
const WA_SUPPORT = 'https://wa.me/56983568212';

const billingRef = (tid) => db.doc(`_billing/${tid}`);
const tenantRef  = (tid) => db.doc(`tenants/${tid}`);

// Formato CLP y fecha YYYY-MM-DD amigable.
function clp(n) { return '$' + Math.max(0, Math.round(Number(n) || 0)).toLocaleString('es-CL'); }
function fmt(d) {
  if (!d) return '—';
  var s = typeof d === 'string' ? d.slice(0, 10) : (d.toDate ? d.toDate().toISOString().slice(0, 10) : String(d).slice(0, 10));
  var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return s;
  var meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  return Number(m[3]) + ' de ' + meses[Number(m[2]) - 1] + ' de ' + m[1];
}

// ── Enumerar tenants con walletActivo ──────────────────────────────
async function tenantsWalloActivos() {
  const out = [];
  const refs = await db.collection('tenants').listDocuments();
  const ids = refs.map((r) => r.id);
  const chunks = [];
  for (let i = 0; i < ids.length; i += 20) chunks.push(ids.slice(i, i + 20));
  for (const chunk of chunks) {
    const snaps = await Promise.all(chunk.map((t) => billingRef(t).get().catch(() => null)));
    snaps.forEach((s, i) => {
      if (s && s.exists && s.data().walletActivo === true) out.push({ tid: chunk[i], billing: s.data() });
    });
  }
  return out;
}

// ── Resolver email(s) del dueño para avisos ────────────────────────
async function emailsDelDueno(tid, billing) {
  const emails = new Set();
  if (billing.emailCobro) {
    if (Array.isArray(billing.emailCobro)) billing.emailCobro.forEach((e) => emails.add(String(e).toLowerCase()));
    else emails.add(String(billing.emailCobro).toLowerCase());
  }
  try {
    const t = await tenantRef(tid).get();
    if (t.exists && t.data().ownerEmail) emails.add(String(t.data().ownerEmail).toLowerCase());
  } catch (_) {}
  return Array.from(emails).filter(Boolean);
}

// ── Send (best-effort — nunca bloquea el cron) ─────────────────────
// Aviso al DUEÑO del local, no al cliente final → Resend primario.
async function enviarAviso(payload) {
  const r = await enviarEmail(payload, {
    grupo: 'interno', etiqueta: 'wallet-cobro', silencioso: true,
  });
  return r.ok;
}

// ── Templates HTML — marca Wallo, mismos anchos que otros mails del sistema
const BASE_STYLE = `font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1d1d1f;line-height:1.5;`;
function wrap(inner) {
  return `<div style="${BASE_STYLE}max-width:520px;margin:0 auto;padding:24px;background:#fff;">
    <div style="text-align:center;padding-bottom:20px;border-bottom:1px solid #eee;">
      <div style="display:inline-flex;align-items:center;gap:8px;">
        <span style="display:inline-block;width:26px;height:26px;border-radius:7px;background:#15240b;color:#c6f94e;font-weight:800;text-align:center;line-height:26px;font-size:13px;">W</span>
        <b style="font-size:19px;letter-spacing:-.5px;">wallo</b>
      </div>
    </div>
    ${inner}
    <div style="margin-top:32px;padding-top:20px;border-top:1px solid #eee;font-size:12px;color:#86868b;text-align:center;">
      ¿Dudas? Escríbenos por <a href="${WA_SUPPORT}" style="color:#15240b;">WhatsApp</a>.<br>
      Wallo · SynapTech SpA · Viña del Mar, Chile
    </div>
  </div>`;
}

function tplTrial3d({ local, fin }) {
  return wrap(`
    <h1 style="font-size:22px;margin:24px 0 8px;letter-spacing:-.5px;">Tu prueba gratis termina en 3 días</h1>
    <p style="color:#3a3a3c;">Hola,</p>
    <p>Tu tarjeta digital <b>${local}</b> está funcionando de maravilla. En 3 días termina la prueba gratuita — el <b>${fmt(fin)}</b>.</p>
    <p><b>Para no perder tu tarjeta ni los clientes que ya se registraron</b>, activa tu mensualidad autopay con Mercado Pago. Es un paso, tarjeta tuya, cargo automático mensual, cancelas cuando quieras.</p>
    <p style="margin-top:20px;"><a href="${WA_SUPPORT}" style="display:inline-block;background:#15240b;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600;">Activar mensualidad por WhatsApp</a></p>
    <p style="color:#86868b;font-size:13px;">Si prefieres no continuar, no hagas nada — tu cuenta se pausa sola al terminar la prueba y tus clientes dejan de ver la tarjeta.</p>
  `);
}
function tplTrial1d({ local, fin }) {
  return wrap(`
    <h1 style="font-size:22px;margin:24px 0 8px;letter-spacing:-.5px;">Mañana termina tu prueba gratis</h1>
    <p>Tu tarjeta <b>${local}</b> deja de estar activa el <b>${fmt(fin)}</b> si no activas la mensualidad.</p>
    <p style="margin-top:20px;"><a href="${WA_SUPPORT}" style="display:inline-block;background:#15240b;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600;">Activar ahora por WhatsApp</a></p>
  `);
}
function tplTrialVencido({ local }) {
  return wrap(`
    <h1 style="font-size:22px;margin:24px 0 8px;letter-spacing:-.5px;">Tu prueba gratis terminó</h1>
    <p>La tarjeta <b>${local}</b> quedó pausada. Tus clientes registrados y sus sellos/saldo están seguros — vuelven a funcionar apenas actives la mensualidad.</p>
    <p style="margin-top:20px;"><a href="${WA_SUPPORT}" style="display:inline-block;background:#15240b;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600;">Reactivar mi tarjeta</a></p>
  `);
}
function tplPagoProximo({ local, monto, fecha, dias }) {
  return wrap(`
    <h1 style="font-size:22px;margin:24px 0 8px;letter-spacing:-.5px;">Cobro automático en ${dias} día${dias === 1 ? '' : 's'}</h1>
    <p>Mercado Pago cobrará <b>${clp(monto)}</b> el <b>${fmt(fecha)}</b> a tu tarjeta registrada — mensualidad Wallo de <b>${local}</b>.</p>
    <p style="color:#86868b;font-size:13px;">No tienes que hacer nada. Si necesitas cambiar la tarjeta o pausar, avísanos por WhatsApp con tiempo.</p>
    <p style="margin-top:14px;"><a href="${WA_SUPPORT}" style="color:#15240b;">Contactar soporte</a></p>
  `);
}
function tplPagoFallido({ local, monto, fecha }) {
  return wrap(`
    <h1 style="font-size:22px;margin:24px 0 8px;letter-spacing:-.5px;color:#dc2626;">No pudimos cobrar tu mensualidad</h1>
    <p>El cobro de <b>${clp(monto)}</b> del <b>${fmt(fecha)}</b> a tu tarjeta fue rechazado por Mercado Pago (fondos insuficientes, tarjeta bloqueada o vencida).</p>
    <p><b>Tu tarjeta Wallo sigue activa por unos días.</b> Actualiza tu método de pago para no perder el servicio.</p>
    <p style="margin-top:20px;"><a href="${WA_SUPPORT}" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600;">Actualizar tarjeta</a></p>
  `);
}

// ── Cron principal ─────────────────────────────────────────────────
exports.walletAvisosCobroCron = onSchedule(
  { schedule: 'every day 09:00', timeZone: TZ, region: 'us-central1', secrets: [...MAIL_SECRETS] },
  async () => {

    const hoyISO = new Date().toISOString().slice(0, 10);
    const hoyMs = Date.now();
    const enviosPorHacer = [];
    const enviosPostHoc = []; // marcas a persistir tras enviar exitoso.

    const tenants = await tenantsWalloActivos();
    logger.info(`[AvisosWallo] revisando ${tenants.length} tenants wallo`);

    for (const { tid, billing } of tenants) {
      const avisos = billing.avisosWallo || {};
      const emails = await emailsDelDueno(tid, billing);
      if (!emails.length) { logger.info(`[AvisosWallo] ${tid} sin email — skip`); continue; }
      const tSnap = await tenantRef(tid).get();
      const local = (tSnap.exists && tSnap.data().nombre) || tid;

      // ── TRIAL ─────────────────────────────────────────────────
      const trialFin = billing.trialFinaliza;
      const tieneAutopay = billing.suscripcionMp && billing.suscripcionMp.status === 'authorized';
      if (trialFin && !tieneAutopay) {
        const finMs = trialFin.toMillis ? trialFin.toMillis() : Date.parse(String(trialFin));
        const diffDias = Math.round((finMs - hoyMs) / 86400000);
        if (diffDias === 3 && avisos.trial_3d !== hoyISO) {
          enviosPorHacer.push({ tid, emails, subject: `Tu prueba de Wallo termina en 3 días · ${local}`, html: tplTrial3d({ local, fin: trialFin }), mark: 'trial_3d' });
        } else if (diffDias === 1 && avisos.trial_1d !== hoyISO) {
          enviosPorHacer.push({ tid, emails, subject: `Mañana termina tu prueba de Wallo · ${local}`, html: tplTrial1d({ local, fin: trialFin }), mark: 'trial_1d' });
        } else if (diffDias <= 0 && diffDias >= -3 && avisos.trial_vencido !== hoyISO) {
          enviosPorHacer.push({ tid, emails, subject: `Tu prueba de Wallo terminó · ${local}`, html: tplTrialVencido({ local }), mark: 'trial_vencido' });
        }
      }

      // ── COBRO MENSUAL PRÓXIMO (autopay activa) ────────────────
      const sub = billing.suscripcionMp;
      if (sub && sub.status === 'authorized' && sub.nextPaymentDate) {
        const nextMs = Date.parse(String(sub.nextPaymentDate) + 'T00:00:00');
        const diffDias = Math.round((nextMs - hoyMs) / 86400000);
        const monto = sub.montoIva || sub.monto || billing.montoPendiente;
        if (diffDias === 3 && avisos.pago_3d !== sub.nextPaymentDate) {
          enviosPorHacer.push({ tid, emails, subject: `Cobro automático Wallo en 3 días · ${clp(monto)}`, html: tplPagoProximo({ local, monto, fecha: sub.nextPaymentDate, dias: 3 }), markKey: 'pago_3d', markValue: sub.nextPaymentDate });
        } else if (diffDias === 1 && avisos.pago_1d !== sub.nextPaymentDate) {
          enviosPorHacer.push({ tid, emails, subject: `Mañana se cobra tu mensualidad Wallo · ${clp(monto)}`, html: tplPagoProximo({ local, monto, fecha: sub.nextPaymentDate, dias: 1 }), markKey: 'pago_1d', markValue: sub.nextPaymentDate });
        }
      }

      // ── COBRO FALLIDO (rechazado en las últimas 24h y no avisado) ─
      if (sub && sub.ultimoPago && sub.ultimoPago.status === 'rejected' && sub.ultimoPago.fecha) {
        const pagoMs = Date.parse(String(sub.ultimoPago.fecha) + 'T00:00:00');
        const horasDesde = (hoyMs - pagoMs) / 3600000;
        if (horasDesde <= 48 && avisos.pago_fallido !== sub.ultimoPago.fecha) {
          enviosPorHacer.push({ tid, emails, subject: `⚠️ Cobro rechazado Wallo · ${local}`, html: tplPagoFallido({ local, monto: sub.ultimoPago.monto, fecha: sub.ultimoPago.fecha }), markKey: 'pago_fallido', markValue: sub.ultimoPago.fecha });
        }
      }
    }

    logger.info(`[AvisosWallo] ${enviosPorHacer.length} emails a enviar`);
    let ok = 0, fail = 0;
    for (const envio of enviosPorHacer) {
      const success = await enviarAviso({
        from: MAIL_FROM,
        to: envio.emails,
        subject: envio.subject,
        html: envio.html,
      });
      if (success) {
        ok++;
        // Persistir marca de idempotencia.
        const keyName = envio.markKey || envio.mark;
        const value = envio.markValue || hoyISO;
        try {
          await billingRef(envio.tid).set({
            avisosWallo: { [keyName]: value, [`${keyName}_ts`]: admin.firestore.FieldValue.serverTimestamp() },
          }, { merge: true });
        } catch (e) { logger.warn(`[AvisosWallo] marca ${envio.tid}/${keyName} falló: ${e.message}`); }
        logger.info(`[AvisosWallo] ✓ ${envio.tid} · ${keyName} → ${envio.emails.join(', ')}`);
      } else {
        fail++;
        logger.error(`[AvisosWallo] ✗ ${envio.tid} · ${envio.subject}`);
      }
    }
    logger.info(`[AvisosWallo] fin: ${ok} enviados / ${fail} fallidos`);
    return null;
  },
);
