'use strict';

// functions/cumpleanos.js
// ─────────────────────────────────────────────────────────────────
//  SELLO AUTOMÁTICO DE CUMPLEAÑOS
//
//  Cron diario 9:00 AM America/Santiago.
//  Para cada tenant busca clientes con cumpleDia === "MM-DD" de hoy,
//  suma +1 sello en users/{uid} y manda push FCM si hay token.
//
//  Campos requeridos en clientes/{phone}:
//    cumpleDia:          "MM-DD"       — campo de query (ej: "05-10")
//    fechaNacimiento:    "YYYY-MM-DD"  — para display
//    uid:                string        — link a users/{uid}
//    fcmToken:           string|null   — push token del cliente
//    ultimoSelloCumple:  "YYYY-MM-DD"  — idempotencia
//
//  DEPLOY:
//    firebase deploy --only functions:selloCumpleanos
// ─────────────────────────────────────────────────────────────────

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { logger }     = require('firebase-functions');
const admin          = require('firebase-admin');
const { FieldValue, Timestamp } = require('firebase-admin/firestore');

const db        = admin.firestore();
const messaging = admin.messaging();

const TIMEZONE = 'America/Santiago';

const TENANTS = [
  { id: 'elegance', clientesPath: 'clientes',                 usersPath: 'users'                 },
  { id: 'gitana',   clientesPath: 'tenants/gitana/clientes',  usersPath: 'tenants/gitana/users'  },
  { id: 'ferraza',  clientesPath: 'tenants/ferraza/clientes', usersPath: 'tenants/ferraza/users'  },
];

exports.selloCumpleanos = onSchedule(
  { schedule: '0 9 * * *', timeZone: TIMEZONE },
  async () => {
    // Fecha actual en zona Santiago (independiente del servidor UTC)
    const santiagoDt = new Intl.DateTimeFormat('en-CA', {
      timeZone: TIMEZONE,
      year:  'numeric',
      month: '2-digit',
      day:   '2-digit',
    }).format(new Date());

    const parts    = santiagoDt.split('-');   // ["2026","05","10"]
    const mmdd     = `${parts[1]}-${parts[2]}`;   // "05-10"
    const todayISO = santiagoDt;                  // "2026-05-10"

    logger.info(`[Cumple] Iniciando para ${todayISO} (cumpleDia=${mmdd})`);

    let totalProcesados = 0;

    for (const tenant of TENANTS) {
      const clientesCol = db.collection(tenant.clientesPath);
      const usersCol    = db.collection(tenant.usersPath);

      const snap = await clientesCol
        .where('cumpleDia', '==', mmdd)
        .get();

      if (snap.empty) {
        logger.info(`[Cumple] ${tenant.id}: sin cumpleaños hoy`);
        continue;
      }

      logger.info(`[Cumple] ${tenant.id}: ${snap.size} cliente(s)`);

      for (const clienteDoc of snap.docs) {
        const cliente  = clienteDoc.data();
        const phone    = clienteDoc.id;
        const nombre   = cliente.nombre   || 'Cliente';
        const uid      = cliente.uid      ?? null;
        const fcmToken = cliente.fcmToken ?? null;

        // ── Idempotencia: un sello por año calendario ───────────
        // Se compara el AÑO (no el día) para que cambiar la fecha
        // de nacimiento no permita canjear el sello más de una vez.
        const anoUltimoSello = (cliente.ultimoSelloCumple || '').substring(0, 4);
        if (anoUltimoSello === parts[0]) {
          logger.info(`[Cumple] ${phone}: ya recibió sello de cumpleaños en ${parts[0]}, omitiendo`);
          continue;
        }

        // Marcar inmediatamente para evitar doble-proceso si la función se interrumpe
        await clienteDoc.ref.update({
          ultimoSelloCumple: todayISO,
          updatedAt: Timestamp.now(),
        });

        // ── Sello en users/{uid} (lo que lee el admin panel y el dashboard) ──
        if (uid) {
          try {
            await usersCol.doc(uid).update({
              sellosDisponibles: FieldValue.increment(1),
              sellosHistoricos:  FieldValue.increment(1),
              stamps:            FieldValue.increment(1),  // campo legacy UI
              historialSellos:   FieldValue.arrayUnion({
                fecha:    todayISO,
                tipo:     'suma',
                cantidad: 1,
                nota:     '🎂 Regalo de cumpleaños',
              }),
            });
            logger.info(`[Cumple] +1 sello → ${nombre} (${phone}, uid=${uid})`);
            totalProcesados++;
          } catch (err) {
            logger.error(`[Cumple] Error sumando sello a ${phone}:`, err.message);
          }
        } else {
          logger.warn(`[Cumple] ${phone}: sin uid — cliente sin cuenta. Sello no sumado.`);
        }

        // ── Push FCM ────────────────────────────────────────────
        if (!fcmToken) {
          logger.info(`[Cumple] ${phone}: sin FCM token`);
          continue;
        }

        try {
          await messaging.send({
            token: fcmToken,
            notification: {
              title: '🎂 ¡Feliz cumpleaños!',
              body:  `¡Hola ${nombre}! Te regalamos 1 sello por tu cumpleaños 🎉`,
            },
            data: {
              tenantId: tenant.id,
              type:     'birthday_stamp',
            },
            webpush: {
              notification: {
                icon:     '/icons/icon-192.png',
                badge:    '/icons/icon-192.png',
                tag:      'birthday',
                renotify: false,
                vibrate:  [300, 100, 300, 100, 300],
                actions:  [{ action: 'ver', title: '🎁 Ver mis sellos' }],
              },
              fcmOptions: { link: '/dashboard.html' },
            },
          });
          logger.info(`[Cumple] Push enviado → ${nombre}`);
        } catch (err) {
          logger.warn(`[Cumple] Push fallido para ${phone}: ${err.code || err.message}`);
        }
      }
    }

    logger.info(`[Cumple] Total sellos sumados hoy: ${totalProcesados}`);
  },
);
