'use strict';

// functions/push-reenganche.js
// ─────────────────────────────────────────────────────────────────
//  RE-ENGANCHE POR INACTIVIDAD — PUSH AL CLIENTE
//
//  Dispara diariamente a las 11:00 AM (hora de Santiago).
//  Para cada tenant activo, detecta usuarios cuyo campo `ultimoSello`
//  cayó hace exactamente 10, 15 o 25 días y les envía una push.
//
//  Idempotencia: users/{uid}.pushReenganche.{d10|d15|d25} almacena
//  el Timestamp del último envío de cada umbral. Si ese timestamp es
//  posterior a `ultimoSello`, ya notificamos en este período y se omite.
//  Cuando el cliente vuelve (nuevo ultimoSello), el ciclo se reinicia.
//
//  DEPLOY:
//    firebase deploy --only functions:pushReengancheClientes
// ─────────────────────────────────────────────────────────────────

const { onSchedule }    = require('firebase-functions/v2/scheduler');
const { logger }        = require('firebase-functions');
const admin             = require('firebase-admin');
const { Timestamp }     = require('firebase-admin/firestore');
const { writeNotifLog } = require('./lib/notif-log');

const db        = admin.firestore();
const messaging = admin.messaging();

const TIMEZONE = 'America/Santiago';

// Tenants con push de re-enganche habilitado.
// Deben tener PWA instalada con FCM tokens en fcm_tokens/.
const TENANTS = [
  { id: 'elegance',       usersPath: 'users',                             nombre: 'Elegance Barbershop',     bookingUrl: 'https://barberiaelegance.synaptechspa.cl' },
  { id: 'chameleon',      usersPath: 'tenants/chameleon/users',           nombre: 'Chameleon Barber Studio', bookingUrl: 'https://chameleonbarber.synaptechspa.cl' },
  { id: 'lumen',          usersPath: 'tenants/lumen/users',               nombre: "D'Jones Barber",          bookingUrl: 'https://barberiadjones.synaptechspa.cl' },
  { id: 'aura',           usersPath: 'tenants/aura/users',                nombre: 'Aura Salon',              bookingUrl: 'https://aurasalon.synaptechspa.cl' },
  { id: 'mapubarbershop', usersPath: 'tenants/mapubarbershop/users',      nombre: 'Mapu Barber Shop',        bookingUrl: 'https://mapubarbershop.synaptechspa.cl' },
  { id: 'delnero',        usersPath: 'tenants/delnero/users',             nombre: 'Del Nero Barber',         bookingUrl: 'https://delnerobarber.synaptechspa.cl' },
  { id: 'omegastudio',    usersPath: 'tenants/omegastudio/users',         nombre: 'Omega Studio',            bookingUrl: 'https://omegastudio.synaptechspa.cl' },
];

// Umbrales de inactividad con sus mensajes push
const UMBRALES = [
  {
    dias: 10,
    key:  'd10',
    mensaje: (nombre, shop) => ({
      title: '✂️ ¿Cuándo pasas?',
      body:  `Hola ${nombre}, ya van 10 días desde tu último servicio en ${shop}. ¡Te esperamos!`,
    }),
  },
  {
    dias: 15,
    key:  'd15',
    mensaje: (nombre, shop) => ({
      title: '💈 Tu look lo necesita',
      body:  `Van 15 días sin corte, ${nombre}. ¡Reserva tu hora en ${shop} y sigue sumando sellos!`,
    }),
  },
  {
    dias: 25,
    key:  'd25',
    mensaje: (nombre, shop) => ({
      title: '🎁 ¿Ya canjeaste tu recompensa?',
      body:  `¡${nombre}, ya son 25 días! Tu próximo corte en ${shop} podría acercarte a un premio. ¿Agendamos?`,
    }),
  },
];

// ── Helpers FCM (mismo patrón que push-cliente.js) ───────────────

function fcmTokensCol(tenantId) {
  return db.collection(
    tenantId === 'elegance' ? 'fcm_tokens' : `tenants/${tenantId}/fcm_tokens`
  );
}

async function enviarPush(tenantId, uid, { title, body, data = {} }) {
  try {
    const snap = await fcmTokensCol(tenantId)
      .where('userId', '==', uid)
      .where('activo', '==', true)
      .get();
    const tokens = snap.docs
      .map(d => ({ id: d.id, token: d.data().token }))
      .filter(t => t.token);
    if (!tokens.length) return 0;

    const message = {
      notification: { title, body },
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
    };
    const responses = await Promise.allSettled(
      tokens.map(t => messaging.send({ ...message, token: t.token }))
    );

    // Desactivar tokens inválidos
    const invalidos = responses
      .map((r, i) => ({ r, i }))
      .filter(({ r }) =>
        r.status === 'rejected' && (
          r.reason?.errorInfo?.code === 'messaging/registration-token-not-registered' ||
          r.reason?.errorInfo?.code === 'messaging/invalid-registration-token'
        )
      )
      .map(({ i }) => tokens[i].id);

    if (invalidos.length) {
      const b = db.batch();
      invalidos.forEach(id => b.update(fcmTokensCol(tenantId).doc(id), { activo: false }));
      await b.commit().catch(() => {});
    }

    return responses.filter(r => r.status === 'fulfilled').length;
  } catch (e) {
    logger.warn(`[Reenganche] enviarPush ${tenantId}/${uid}: ${e.message}`);
    return 0;
  }
}

// ── Ventana de 24 h UTC centrada en "hace N días" ─────────────────
// ultimoSello se guarda como ISO string UTC (Timestamp.now().toDate().toISOString())
// → comparación lexicográfica es equivalente a comparación cronológica.

function isoUtcMidnight(daysAgo) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

// ── Lógica por tenant ─────────────────────────────────────────────

async function procesarTenant(tenant) {
  let totalEnviadas = 0;

  for (const umbral of UMBRALES) {
    const desde = isoUtcMidnight(umbral.dias);      // inicio día N
    const hasta = isoUtcMidnight(umbral.dias - 1);  // inicio día N-1 (exclusivo)

    let snap;
    try {
      snap = await db.collection(tenant.usersPath)
        .where('ultimoSello', '>=', desde)
        .where('ultimoSello', '<',  hasta)
        .get();
    } catch (e) {
      logger.warn(`[Reenganche] ${tenant.id} umbral ${umbral.dias}d: query error: ${e.message}`);
      continue;
    }

    if (snap.empty) {
      logger.info(`[Reenganche] ${tenant.id} umbral ${umbral.dias}d: sin candidatos.`);
      continue;
    }

    const batchRefs = [];

    for (const doc of snap.docs) {
      const u   = doc.data();
      const uid = doc.id;

      // Idempotencia: ¿ya enviamos este umbral DESPUÉS del ultimoSello actual?
      const prevTs = u.pushReenganche?.[umbral.key];
      if (prevTs) {
        const prevIso = typeof prevTs.toDate === 'function'
          ? prevTs.toDate().toISOString()
          : String(prevTs);
        if (prevIso >= (u.ultimoSello || '')) continue; // ya notificado en este período
      }

      const nombre = (u.nombre || 'Cliente').split(' ')[0];
      const { title, body } = umbral.mensaje(nombre, tenant.nombre);

      const enviadas = await enviarPush(tenant.id, uid, {
        title,
        body,
        data: {
          tipo:  'reenganche',
          dias:  String(umbral.dias),
          url:   tenant.bookingUrl,
        },
      });

      if (enviadas > 0) {
        batchRefs.push(doc.ref);
        totalEnviadas++;
        await writeNotifLog(db, {
          tenantId: tenant.id,
          type:     'push_reenganche',
          channel:  'push',
          status:   'sent',
          to:       { nombre, email: u.email || null },
          meta:     { dias: String(umbral.dias), uid },
        });
      }
    }

    // Marcar envío en batch para idempotencia futura
    if (batchRefs.length) {
      const batch = db.batch();
      batchRefs.forEach(ref =>
        batch.update(ref, { [`pushReenganche.${umbral.key}`]: Timestamp.now() })
      );
      await batch.commit().catch(e =>
        logger.warn(`[Reenganche] ${tenant.id} umbral ${umbral.dias}d: batch error: ${e.message}`)
      );
    }

    logger.info(
      `[Reenganche] ${tenant.id} umbral ${umbral.dias}d: ` +
      `${batchRefs.length} push enviadas de ${snap.size} candidatos.`
    );
  }

  return totalEnviadas;
}

// ── Export ────────────────────────────────────────────────────────

exports.pushReengancheClientes = onSchedule(
  {
    schedule:        'every day 11:00',
    timeZone:        TIMEZONE,
    timeoutSeconds:  300,
    memory:          '256MiB',
  },
  async () => {
    let total = 0;
    for (const tenant of TENANTS) {
      try {
        const n = await procesarTenant(tenant);
        total += n;
      } catch (e) {
        logger.error(`[Reenganche] ${tenant.id}: error inesperado: ${e.message}`, e);
      }
    }
    logger.info(`[Reenganche] Campaña finalizada. Total push enviadas: ${total}.`);
    return null;
  },
);
