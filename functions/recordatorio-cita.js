'use strict';

// functions/recordatorio-cita.js
// ─────────────────────────────────────────────────────────────────
//  RECORDATORIO DE CITA 24H ANTES
//
//  Cron diario 19:00 America/Santiago.
//  Para cada tenant busca citas de mañana con estado pendiente/confirmada,
//  envía push FCM al cliente con botones Confirmar / Cancelar.
//
//  Campos requeridos en citas/{citaId}:
//    fecha:                   "YYYY-MM-DD"
//    hora:                    "HH:MM"
//    estado:                  "pendiente"|"Pendiente"|"confirmada"|"Confirmada"|"Confirmado"
//    clienteTelefono:         string (normalizable a solo dígitos)
//    clienteNombre:           string
//    recordatorio24hEnviado:  boolean — idempotencia
//
//  El fcmToken del cliente se lee de clientes/{phone}.fcmToken
//
//  DEPLOY:
//    firebase deploy --only functions:recordatorioCita24h
// ─────────────────────────────────────────────────────────────────

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { logger }     = require('firebase-functions');
const admin          = require('firebase-admin');

const db        = admin.firestore();
const messaging = admin.messaging();

const TIMEZONE = 'America/Santiago';

const TENANTS = [
  { id: 'elegance', citasPath: 'citas',                   clientesPath: 'clientes'                   },
  { id: 'gitana',   citasPath: 'tenants/gitana/citas',    clientesPath: 'tenants/gitana/clientes'    },
  { id: 'ferraza',  citasPath: 'tenants/ferraza/citas',   clientesPath: 'tenants/ferraza/clientes'   },
];

exports.recordatorioCita24h = onSchedule(
  { schedule: '0 19 * * *', timeZone: TIMEZONE },
  async () => {
    // Fecha de mañana en zona Santiago (el servidor corre en UTC)
    const mananaISO = new Intl.DateTimeFormat('en-CA', {
      timeZone: TIMEZONE,
      year:  'numeric',
      month: '2-digit',
      day:   '2-digit',
    }).format(new Date(Date.now() + 24 * 60 * 60 * 1000));

    logger.info(`[Recordatorio] Buscando citas para ${mananaISO}`);

    let totalEnviados = 0;

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

        // Idempotencia
        if (cita.recordatorio24hEnviado === true) {
          logger.info(`[Recordatorio] ${citaId}: ya procesado, omitiendo`);
          continue;
        }

        const telefono = (cita.clienteTelefono || '').replace(/\D/g, '');
        const nombre   = cita.clienteNombre || cita.nombre || 'Cliente';
        const hora     = cita.hora  || '';
        const barbero  = cita.barbero || cita.barberoNombre || '';

        // Marcar primero para evitar doble-proceso si la función se interrumpe
        await citaDoc.ref.update({ recordatorio24hEnviado: true });

        if (!telefono) {
          logger.warn(`[Recordatorio] ${citaId}: sin teléfono normalizable`);
          continue;
        }

        const clienteSnap = await clientesCol.doc(telefono).get();
        if (!clienteSnap.exists) {
          logger.info(`[Recordatorio] ${citaId}: sin doc clientes/${telefono}`);
          continue;
        }

        const fcmToken = clienteSnap.data().fcmToken || null;
        if (!fcmToken) {
          logger.info(`[Recordatorio] ${citaId}: cliente ${telefono} sin FCM token`);
          continue;
        }

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
          logger.info(`[Recordatorio] Push → ${nombre} (${telefono}) cita ${citaId}`);
          totalEnviados++;
        } catch (err) {
          logger.warn(`[Recordatorio] Push fallido ${telefono} / ${citaId}: ${err.code || err.message}`);
        }
      }
    }

    logger.info(`[Recordatorio] Total enviados: ${totalEnviados}`);
  },
);
