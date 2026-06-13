'use strict';

// functions/recordatorio-cobro.js
// ─────────────────────────────────────────────────────────────────
//  RECORDATORIO DE COBRO (mensualidad) — push FCM al admin del local.
//  Cron diario: avisa cuando el pago está próximo a vencer o atrasado.
//  Lee _billing/{tenant}. Manda push a los tokens de los jefes/admin.
//  Deploy: firebase deploy --only functions:recordatorioCobro
// ─────────────────────────────────────────────────────────────────

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { logger }     = require('firebase-functions');
const admin          = require('firebase-admin');

const db        = admin.firestore();
const messaging = admin.messaging();
const TIMEZONE  = 'America/Santiago';

// Días respecto al vencimiento en los que se envía recordatorio.
// Negativo = antes de vencer; 0 = vence hoy; positivo = atrasado.
const DIAS_RECORDATORIO = new Set([-3, -1, 0, 1, 3, 8, 15]);

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

exports.recordatorioCobro = onSchedule(
  { schedule: '0 10 * * *', timeZone: TIMEZONE },
  async () => {
    const hoyUTC   = santiagoHoyUTC();
    const todayStr = new Date(hoyUTC).toISOString().slice(0, 10);
    const snap     = await db.collection('_billing').get();

    let totalPush = 0;
    for (const doc of snap.docs) {
      const tid = doc.id;
      const d   = doc.data();
      const dueUTC = parseFechaUTC(d.fechaProximoPago);
      if (dueUTC === null) continue;

      const dias = Math.round((hoyUTC - dueUTC) / 86400000); // + = atrasado, - = falta
      if (!DIAS_RECORDATORIO.has(dias)) continue;
      if (d.ultimoRecordatorioPush === todayStr) continue; // idempotencia diaria

      const tokens = await tokensAdmin(tid);
      if (!tokens.length) { logger.info(`[Cobro] ${tid}: sin tokens admin`); continue; }

      const { title, body } = buildMensaje(dias, d.montoPendiente);
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
        await doc.ref.update({ ultimoRecordatorioPush: todayStr }).catch(() => {});
        totalPush += enviados;
        logger.info(`[Cobro] ✓ ${tid} (dias=${dias}) → ${enviados} push`);
      }
    }
    logger.info(`[Cobro] Resumen: ${totalPush} push enviados`);
  },
);
