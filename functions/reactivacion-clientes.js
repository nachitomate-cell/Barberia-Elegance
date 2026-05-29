'use strict';

// functions/reactivacion-clientes.js
// ─────────────────────────────────────────────────────────────────
//  CAMPAÑA AUTOMÁTICA DE REACTIVACIÓN
//
//  Dispara diariamente a las 10:00 AM (hora de Santiago).
//  Por cada tenant activo:
//    1. Obtiene todos los usuarios con teléfono registrado.
//    2. Obtiene las citas completadas de los últimos 30 días.
//    3. Determina qué usuarios NO visitaron en ese período.
//    4. De esos usuarios, filtra los que no recibieron mensaje
//       de reactivación en los últimos 30 días.
//    5. Envía WhatsApp con link de reserva via Twilio.
//    6. Actualiza `ultimaReactivacion` en el doc del usuario.
//
//  DEPLOY:
//    firebase deploy --only functions:reactivacionClientes
// ─────────────────────────────────────────────────────────────────

const { onSchedule }   = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const { logger }       = require('firebase-functions');
const admin            = require('firebase-admin');
const { FieldValue }   = require('firebase-admin/firestore');

const db = admin.firestore();

const secretSid  = defineSecret('TWILIO_ACCOUNT_SID');
const secretAuth = defineSecret('TWILIO_AUTH_TOKEN');
const secretFrom = defineSecret('TWILIO_WA_FROM');

const TIMEZONE = 'America/Santiago';

// Tenants con campaña de reactivación habilitada.
// Añadir/quitar según contratos activos.
const TENANTS = [
  {
    id:          'elegance',
    citasPath:   'citas',
    usersPath:   'clientes',
    nombre:      'Elegance Barbershop',
    bookingUrl:  'https://barberiaelegance.synaptechspa.cl',
  },
  {
    id:          'chameleon',
    citasPath:   'tenants/chameleon/citas',
    usersPath:   'tenants/chameleon/clientes',
    nombre:      'Chameleon Barber Studio',
    bookingUrl:  'https://chameleonbarber.synaptechspa.cl',
  },
  {
    id:          'lumen',
    citasPath:   'tenants/lumen/citas',
    usersPath:   'tenants/lumen/clientes',
    nombre:      "D'Jones Barber",
    bookingUrl:  'https://barberiadjones.synaptechspa.cl',
  },
  {
    id:          'aura',
    citasPath:   'tenants/aura/citas',
    usersPath:   'tenants/aura/clientes',
    nombre:      'Aura Salon',
    bookingUrl:  'https://aurasalon.synaptechspa.cl',
  },
  {
    id:          'mapubarbershop',
    citasPath:   'tenants/mapubarbershop/citas',
    usersPath:   'tenants/mapubarbershop/clientes',
    nombre:      'Mapu Barber Shop',
    bookingUrl:  'https://mapubarbershop.synaptechspa.cl',
  },
  {
    id:          'delnero',
    citasPath:   'tenants/delnero/citas',
    usersPath:   'tenants/delnero/clientes',
    nombre:      'Del Nero Barber',
    bookingUrl:  'https://delnerobarber.synaptechspa.cl',
  },
];

const DIAS_INACTIVO      = 30;
const DIAS_COOLDOWN      = 30; // días entre mensajes de reactivación al mismo cliente

function normPhone(phone) {
  if (!phone) return null;
  let n = String(phone).replace(/\D/g, '');
  if (!n) return null;
  if (n.startsWith('56') && n.length === 11) return `+${n}`;
  if (n.length === 9) return `+56${n}`;
  if (n.length === 11 && n.startsWith('56')) return `+${n}`;
  return n.startsWith('+') ? phone : `+${n}`;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function dateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function processTenant(tenant, twilioClient, waFrom) {
  const cutoffDate = dateStr(daysAgo(DIAS_INACTIVO));
  const cooldownTs = daysAgo(DIAS_COOLDOWN);

  // 1. Citas completadas en los últimos 30 días → set de teléfonos activos
  const citasSnap = await db.collection(tenant.citasPath)
    .where('estado', '==', 'Completada')
    .where('fecha', '>=', cutoffDate)
    .get()
    .catch(() => ({ docs: [] }));

  const activosTels = new Set();
  citasSnap.docs.forEach(d => {
    const tel = d.data().clienteTelefono;
    if (tel) activosTels.add(String(tel).replace(/\D/g, ''));
  });

  // 2. Todos los usuarios con teléfono
  const usersSnap = await db.collection(tenant.usersPath).get().catch(() => ({ docs: [] }));

  let enviados = 0;
  const batch = db.batch();
  const toUpdate = [];

  for (const userDoc of usersSnap.docs) {
    const u = userDoc.data();
    const telRaw = u.telefono || u.clienteTelefono || '';
    if (!telRaw) continue;

    const telNorm = String(telRaw).replace(/\D/g, '');
    if (activosTels.has(telNorm)) continue; // visitó recientemente

    // Cooldown: no enviar si ya se mandó en los últimos 30 días
    if (u.ultimaReactivacion?.toDate?.() > cooldownTs) continue;

    const waTo = normPhone(telRaw);
    if (!waTo || waTo.length < 10) continue;

    const nombre = (u.nombre || 'Cliente').split(' ')[0];
    const mensaje = [
      `Hola ${nombre}! 👋`,
      ``,
      `Han pasado más de 30 días desde tu último corte en *${tenant.nombre}*.`,
      ``,
      `¿Listo para lucir top? Reserva tu próxima hora directamente aquí:`,
      `👉 ${tenant.bookingUrl}`,
      ``,
      `¡Te esperamos! ✂️`,
    ].join('\n');

    try {
      await twilioClient.messages.create({
        from: `whatsapp:${waFrom}`,
        to:   `whatsapp:${waTo}`,
        body: mensaje,
      });
      enviados++;
      toUpdate.push({ ref: userDoc.ref, data: { ultimaReactivacion: FieldValue.serverTimestamp() } });

      // Rate limit: 1 mensaje cada 500ms
      await new Promise(r => setTimeout(r, 500));
    } catch (e) {
      logger.warn(`[Reactivacion] ${tenant.id}: error enviando a ${waTo}:`, e.message);
    }
  }

  // Actualizar ultimaReactivacion en batch
  for (const { ref, data } of toUpdate) {
    batch.update(ref, data);
  }
  if (toUpdate.length > 0) {
    await batch.commit().catch(e => logger.warn(`[Reactivacion] ${tenant.id}: batch update error:`, e.message));
  }

  logger.info(`[Reactivacion] ${tenant.id}: ${enviados} mensajes enviados de ${usersSnap.docs.length} usuarios.`);
  return enviados;
}

exports.reactivacionClientes = onSchedule(
  {
    schedule:      'every day 10:00',
    timeZone:      TIMEZONE,
    secrets:       [secretSid, secretAuth, secretFrom],
    timeoutSeconds: 300,
    memory:        '256MiB',
  },
  async () => {
    const sid   = secretSid.value();
    const auth  = secretAuth.value();
    const from  = secretFrom.value();

    if (!sid || !auth || !from) {
      logger.error('[Reactivacion] Twilio secrets no configurados.');
      return null;
    }

    const twilioClient = require('twilio')(sid, auth);
    let totalEnviados = 0;

    for (const tenant of TENANTS) {
      try {
        const n = await processTenant(tenant, twilioClient, from);
        totalEnviados += n;
      } catch (e) {
        logger.error(`[Reactivacion] ${tenant.id}: error inesperado:`, e);
      }
    }

    logger.info(`[Reactivacion] Campaña finalizada. Total mensajes: ${totalEnviados}.`);
    return null;
  },
);
