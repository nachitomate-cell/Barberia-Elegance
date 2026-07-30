'use strict';

// functions/cobranza-saas-daily.js
// ─────────────────────────────────────────────────────────────────────────────
//  RECORDATORIO DIARIO DE COBRANZA SaaS (SynapTech interno)
//
//  Cron 09:00 America/Santiago. Recorre _billing/{tid}:
//    · tenant operativo (_system/{tid})
//    · cuota del mes actual con monto>0 y NO pagada
//    · fechaProximoPago cae HOY o MAÑANA en Santiago
//
//  Si hay hallazgos: dispara un push a admin_fcm_tokens (dispatchAdminPush,
//  mismo canal que /admin usa para el resto de alertas del superadmin) con
//  el resumen del día. Si no: log silencioso, no notifica.
//
//  El body de la notif FCM está limitado a 240 chars — si el detalle no
//  cabe, degrada a resumen ("3 cobros vencen · Total $…") y el listado
//  completo viaja en data.detalle para que /admin lo pinte al abrirse.
//
//  DEPLOY:
//    firebase deploy --only functions:cobranzaSaasDaily
// ─────────────────────────────────────────────────────────────────────────────

const { onSchedule }        = require('firebase-functions/v2/scheduler');
const { logger }            = require('firebase-functions');
const admin                 = require('firebase-admin');
const { dispatchAdminPush } = require('./admin-push');

const db = admin.firestore();

const TIMEZONE   = 'America/Santiago';
const BODY_LIMIT = 240;   // límite FCM que aplica dispatchAdminPush

// ── Helpers ─────────────────────────────────────────────────────────────────

function partesSantiago(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const y = parts.find(p => p.type === 'year').value;
  const m = parts.find(p => p.type === 'month').value;
  const d = parts.find(p => p.type === 'day').value;
  return { y, m, d };
}

function ymdSantiago(date) {
  const { y, m, d } = partesSantiago(date);
  return `${y}-${m}-${d}`;
}

function periodoActualSantiago() {
  const { y, m } = partesSantiago(new Date());
  return `${y}-${m}`;
}

function timestampASantiagoYmd(v) {
  if (!v) return null;
  const d = v && typeof v.toDate === 'function' ? v.toDate()
          : (v instanceof Date ? v : new Date(v));
  if (isNaN(d.getTime())) return null;
  return ymdSantiago(d);
}

const settingsRef = (tid) => tid === 'elegance'
  ? db.collection('settings').doc('general')
  : db.collection(`tenants/${tid}/settings`).doc('general');

// Mismo helper que mensualidad-mp.js / finance-api.js — mantener sincronizado.
async function nombreLocal(tid) {
  try {
    const s = await settingsRef(tid).get();
    if (s.exists && s.data().nombre) return String(s.data().nombre).trim();
  } catch (_) {}
  try {
    const t = await db.doc(`tenants/${tid}`).get();
    if (t.exists && t.data().nombre) return String(t.data().nombre).trim();
  } catch (_) {}
  return tid;
}

const fmtCLP = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('es-CL');
// Fecha corta DD/MM (formato humano dentro de un push).
function fmtFechaCorta(ymd) {
  if (!ymd) return '—';
  const [_, mm, dd] = ymd.split('-');
  return `${dd}/${mm}`;
}

/**
 * Construye title + body + data.detalle a partir de las cuotas de hoy/mañana.
 * body respeta BODY_LIMIT — si el listado no cabe, degrada a resumen y guarda
 * el listado completo en data.detalle (el /admin lo lee al abrirse).
 */
function componerMensaje(cuotas, hoyYmd, mananaYmd) {
  const total = cuotas.reduce((s, c) => s + c.monto, 0);
  const hayHoy    = cuotas.some(c => c.dueYmd === hoyYmd);
  const hayManana = cuotas.some(c => c.dueYmd === mananaYmd);
  const cuando = hayHoy && hayManana ? 'hoy y mañana'
               : hayHoy               ? 'hoy'
               : 'mañana';

  const encabezado = `Hola Ignacio, ${cuando} vencen los siguientes cobros:`;
  const lineas = cuotas.map(c =>
    `• ${c.nombre} — ${fmtCLP(c.monto)} CLP (Vence: ${fmtFechaCorta(c.dueYmd)})`
  );
  const cierre = `Total a cobrar: ${fmtCLP(total)} CLP`;
  const bodyCompleto = [encabezado, ...lineas, '', cierre].join('\n');

  const body = bodyCompleto.length <= BODY_LIMIT
    ? bodyCompleto
    : `${cuotas.length} cobro${cuotas.length === 1 ? '' : 's'} vence${cuotas.length === 1 ? '' : 'n'} ${cuando} · Total ${fmtCLP(total)} · Toca para ver el detalle.`;

  return {
    title: '🔔 Recordatorio de Cobranza SynapTech',
    body,
    detalle: bodyCompleto,   // completo, para el /admin
    total,
    cuando,
  };
}

// ── Handler ─────────────────────────────────────────────────────────────────

exports.cobranzaSaasDaily = onSchedule(
  { schedule: '0 9 * * *', timeZone: TIMEZONE, region: 'us-central1' },
  async () => {
    const now       = new Date();
    const hoyYmd    = ymdSantiago(now);
    const mananaYmd = ymdSantiago(new Date(now.getTime() + 86400000));
    const period    = periodoActualSantiago();

    const [billSnap, sysSnap] = await Promise.all([
      db.collection('_billing').get(),
      db.collection('_system').get(),
    ]);
    const sysMap = {};
    sysSnap.forEach(d => { sysMap[d.id] = d.data() || {}; });

    const candidatos = [];
    billSnap.forEach(d => {
      const tid  = d.id;
      const bill = d.data() || {};
      const sys  = sysMap[tid] || {};
      const operativo = sys.operativo !== false && sys.status !== 'suspended';
      if (!operativo) return;

      const cuotas = Array.isArray(bill.cuotas) ? bill.cuotas : [];
      const cuotaMes = cuotas.find(c => c && c.mes === period && Number(c.monto) > 0);
      if (!cuotaMes || cuotaMes.pagada) return;

      // El vencimiento vive a nivel tenant (siguiente débito de MP).
      const dueYmd = timestampASantiagoYmd(bill.fechaProximoPago);
      if (dueYmd !== hoyYmd && dueYmd !== mananaYmd) return;

      candidatos.push({
        tid,
        monto:  Math.round(Number(cuotaMes.monto)),
        dueYmd,
      });
    });

    if (!candidatos.length) {
      logger.info('[cobranzaSaasDaily] sin cobros para hoy/mañana — no se envía push', {
        hoy: hoyYmd, manana: mananaYmd, period,
      });
      return null;
    }

    // Resuelve nombres en paralelo (una lectura de settings por candidato).
    const nombres = await Promise.all(candidatos.map(c => nombreLocal(c.tid)));
    const cuotas = candidatos.map((c, i) => ({ ...c, nombre: nombres[i] }))
      .sort((a, b) => {
        if (a.dueYmd !== b.dueYmd) return a.dueYmd < b.dueYmd ? -1 : 1;
        return a.nombre.localeCompare(b.nombre, 'es');
      });

    const msg = componerMensaje(cuotas, hoyYmd, mananaYmd);

    try {
      const res = await dispatchAdminPush(db, admin.messaging(), {
        title: msg.title,
        body:  msg.body,
        url:   '/admin/#cobranza',
        tag:   'cobranza-saas-daily',
        data: {
          tipo:    'cobranza_saas',
          cuando:  msg.cuando,
          total:   msg.total,
          count:   cuotas.length,
          detalle: msg.detalle,
        },
      });
      logger.info('[cobranzaSaasDaily] push enviado', {
        hoy: hoyYmd, manana: mananaYmd, cobros: cuotas.length,
        total: msg.total, ...res,
      });
    } catch (err) {
      // Fail-open a nivel proceso: log detallado pero no relanza, para que
      // el Scheduler no re-encole (evita spam si el error persiste).
      logger.error('[cobranzaSaasDaily] falló el push', {
        message: err && err.message,
        stack:   err && err.stack,
        cobros:  cuotas.length,
      });
    }
    return null;
  }
);
