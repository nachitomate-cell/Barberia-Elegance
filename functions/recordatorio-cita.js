'use strict';

// functions/recordatorio-cita.js
// ─────────────────────────────────────────────────────────────────
//  RECORDATORIO DE CITA 24H ANTES
//
//  Cron diario 19:00 America/Santiago.
//  Dos canales en paralelo:
//    1. WhatsApp vía Twilio → llega a TODOS los clientes (tiene teléfono)
//    2. FCM push            → clientes que tienen token de notificación
//
//  Secrets requeridos en Firebase (firebase functions:secrets:set):
//    TWILIO_ACCOUNT_SID  → Account SID de tu consola Twilio
//    TWILIO_AUTH_TOKEN   → Auth Token de tu consola Twilio
//    TWILIO_WA_FROM      → Número Twilio WA en formato whatsapp:+56XXXXXXXXX
//                          (sandbox: whatsapp:+14155238886)
//
//  Campos leídos de citas/{citaId}:
//    fecha                    "YYYY-MM-DD"
//    hora                     "HH:MM"
//    estado                   "pendiente"|"Pendiente"|"confirmada"|"Confirmada"
//    clienteTelefono          string (se normaliza a solo dígitos)
//    clienteNombre            string
//    barbero / barberoNombre  string (opcional)
//    servicioNombre           string (opcional)
//    recordatorio24hEnviado   boolean — idempotencia (se escribe al inicio)
//
//  DEPLOY:
//    firebase deploy --only functions:recordatorioCita24h
// ─────────────────────────────────────────────────────────────────

const { onSchedule }   = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const { logger }       = require('firebase-functions');
const admin            = require('firebase-admin');

const db        = admin.firestore();
const messaging = admin.messaging();

const TIMEZONE = 'America/Santiago';

const TENANTS = [
  { id: 'elegance', citasPath: 'citas',                   clientesPath: 'clientes'                   },
  { id: 'gitana',   citasPath: 'tenants/gitana/citas',    clientesPath: 'tenants/gitana/clientes'    },
  { id: 'ferraza',  citasPath: 'tenants/ferraza/citas',   clientesPath: 'tenants/ferraza/clientes'   },
];

const secretSid  = defineSecret('TWILIO_ACCOUNT_SID');
const secretAuth = defineSecret('TWILIO_AUTH_TOKEN');
const secretFrom = defineSecret('TWILIO_WA_FROM');

// ── Helpers ───────────────────────────────────────────────────────

function buildWAMessage(nombre, hora, barbero, servicio) {
  const quien    = barbero  ? ` con *${barbero}*`    : '';
  const servText = servicio ? ` para *${servicio}*`  : '';
  return (
    `✂️ *Recordatorio de cita — Barbería Elegance*\n\n` +
    `Hola *${nombre}*! Te recordamos que mañana a las *${hora} hrs*` +
    `${servText}${quien} tienes tu cita agendada.\n\n` +
    `Si necesitas cancelar o reagendar, responde este mensaje. ¡Te esperamos! 💈`
  );
}

// ── Cron: 19:00 Santiago — enviar recordatorios 24h antes ─────────

exports.recordatorioCita24h = onSchedule(
  {
    schedule:  '0 19 * * *',
    timeZone:  TIMEZONE,
    secrets:   [secretSid, secretAuth, secretFrom],
  },
  async () => {
    // Fecha de mañana en zona Santiago
    const mananaISO = new Intl.DateTimeFormat('en-CA', {
      timeZone: TIMEZONE,
      year:  'numeric',
      month: '2-digit',
      day:   '2-digit',
    }).format(new Date(Date.now() + 24 * 60 * 60 * 1000));

    logger.info(`[Recordatorio] Buscando citas para ${mananaISO}`);

    // Inicializar cliente Twilio (puede no estar configurado)
    const sid  = secretSid.value();
    const auth = secretAuth.value();
    const from = secretFrom.value();
    const twilioClient = (sid && auth) ? require('twilio')(sid, auth) : null;

    if (!twilioClient) {
      logger.warn('[Recordatorio] Twilio no configurado — solo se enviará FCM push');
    }

    let totalWA  = 0;
    let totalFCM = 0;

    for (const tenant of TENANTS) {
      const citasCol    = db.collection(tenant.citasPath);
      const clientesCol = db.collection(tenant.clientesPath);

      const snap = await citasCol
        .where('fecha', '==', mananaISO)
        .where('estado', 'in', ['pendiente', 'Pendiente', 'confirmada', 'Confirmada', 'Confirmado'])
        .get();

      if (snap.empty) {
        logger.info(`[Recordatorio] ${tenant.id}: sin citas para ${mananaISO}`);
        continue;
      }

      logger.info(`[Recordatorio] ${tenant.id}: ${snap.size} cita(s)`);

      for (const citaDoc of snap.docs) {
        const cita   = citaDoc.data();
        const citaId = citaDoc.id;

        // Idempotencia: marcar antes de enviar para evitar doble proceso
        if (cita.recordatorio24hEnviado === true) {
          logger.info(`[Recordatorio] ${citaId}: ya procesado, omitiendo`);
          continue;
        }
        await citaDoc.ref.update({ recordatorio24hEnviado: true });

        const telefono = (cita.clienteTelefono || '').replace(/\D/g, '');
        const nombre   = cita.clienteNombre || cita.nombre || 'Cliente';
        const hora     = cita.hora          || '';
        const barbero  = cita.barbero       || cita.barberoNombre || '';
        const servicio = cita.servicioNombre || '';

        if (!telefono) {
          logger.warn(`[Recordatorio] ${citaId}: sin teléfono, omitiendo`);
          continue;
        }

        // ── Canal 1: WhatsApp vía Twilio ───────────────────────────
        if (twilioClient && from) {
          const phoneE164 = `+${telefono}`;
          try {
            await twilioClient.messages.create({
              from: from,
              to:   `whatsapp:${phoneE164}`,
              body: buildWAMessage(nombre, hora, barbero, servicio),
            });
            logger.info(`[WA] ✓ ${nombre} (${telefono}) → cita ${citaId}`);
            totalWA++;
          } catch (err) {
            // No abortar — intentar FCM igual
            logger.warn(`[WA] ✗ ${telefono} / ${citaId}: ${err.message}`);
          }
        }

        // ── Canal 2: FCM push (clientes con app instalada) ────────
        const clienteSnap = await clientesCol.doc(telefono).get();
        const fcmToken    = clienteSnap.exists ? (clienteSnap.data().fcmToken || null) : null;

        if (!fcmToken) continue;

        const bodyDetalle = barbero
          ? `Mañana a las ${hora} hrs con ${barbero}.`
          : `Mañana a las ${hora} hrs.`;

        try {
          await messaging.send({
            token: fcmToken,
            notification: {
              title: '📅 Recordatorio de cita',
              body:  `¡Hola ${nombre}! ${bodyDetalle}`,
            },
            data: {
              citaId:   citaId,
              tipo:     'recordatorio',
              tenantId: tenant.id,
            },
            webpush: {
              notification: {
                icon:     '/icons/icon-192.png',
                badge:    '/icons/icon-192.png',
                tag:      `recordatorio-${citaId}`,
                renotify: false,
                vibrate:  [200, 100, 200],
                actions:  [
                  { action: 'confirmar', title: '✅ Confirmar' },
                  { action: 'cancelar',  title: '❌ Cancelar'  },
                ],
              },
              fcmOptions: { link: '/dashboard.html' },
            },
          });
          logger.info(`[FCM] ✓ ${nombre} (${telefono}) → cita ${citaId}`);
          totalFCM++;
        } catch (err) {
          logger.warn(`[FCM] ✗ ${telefono} / ${citaId}: ${err.code || err.message}`);
        }
      }
    }

    logger.info(`[Recordatorio] Resumen: WA=${totalWA} FCM=${totalFCM}`);
  },
);
