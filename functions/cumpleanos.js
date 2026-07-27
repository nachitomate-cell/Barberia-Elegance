'use strict';

// functions/cumpleanos.js
// ─────────────────────────────────────────────────────────────────
//  SELLO AUTOMÁTICO DE CUMPLEAÑOS — Fase 3.C
//
//  Cron diario 9:00 AM America/Santiago.
//  Para cada tenant busca clientes con cumpleDia === "MM-DD" de hoy,
//  suma +1 sello y manda push FCM si hay token.
//
//  Fase 3.C: Query directo sobre users/ (post cleanup+backfill toda
//  la data vive ahí). Antes leía clientes/ mirror y hacía indirección
//  vía cliente.uid → users/{uid}. Ahora es directo.
//
//  Campos en users/{docId}:
//    cumpleDia:          "MM-DD"       — campo indexado del query
//    fechaNacimiento:    "YYYY-MM-DD"  — display
//    fcmToken:           string|null
//    ultimoSelloCumple:  "YYYY-MM-DD"  — idempotencia por año
//    historialSellos:    []            — doble check para idempotencia
//                                        durante la transición
//
//  DEPLOY:
//    firebase deploy --only functions:selloCumpleanos
// ─────────────────────────────────────────────────────────────────

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { logger }     = require('firebase-functions');
const admin          = require('firebase-admin');
const { FieldValue, Timestamp } = require('firebase-admin/firestore');
const { writeNotifLog } = require('./lib/notif-log');

const db        = admin.firestore();
const messaging = admin.messaging();

const TIMEZONE = 'America/Santiago';

// Sólo el usersPath — clientes/ ya no se lee.
const TENANTS = [
  { id: 'elegance',             usersPath: 'users' },
  { id: 'gitana',               usersPath: 'tenants/gitana/users' },
  { id: 'ferraza',              usersPath: 'tenants/ferraza/users' },
  { id: 'chameleon',            usersPath: 'tenants/chameleon/users' },
  { id: 'aura',                 usersPath: 'tenants/aura/users' },
  { id: 'lumen',                usersPath: 'tenants/lumen/users' },
  { id: 'mapubarbershop',       usersPath: 'tenants/mapubarbershop/users' },
  { id: 'delnero',              usersPath: 'tenants/delnero/users' },
  { id: 'marcelo_hairdressing', usersPath: 'tenants/marcelo_hairdressing/users' },
  { id: 'machos',               usersPath: 'tenants/machos/users' },
  { id: 'infinity',             usersPath: 'tenants/infinity/users' },
  { id: 'sionbarberia',         usersPath: 'tenants/sionbarberia/users' },
  { id: 'deluxeperfumes',       usersPath: 'tenants/deluxeperfumes/users' },
];

exports.selloCumpleanos = onSchedule(
  { schedule: '0 9 * * *', timeZone: TIMEZONE },
  async () => {
    const santiagoDt = new Intl.DateTimeFormat('en-CA', {
      timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date());
    const parts    = santiagoDt.split('-');     // ["2026","05","10"]
    const mmdd     = `${parts[1]}-${parts[2]}`; // "05-10"
    const todayISO = santiagoDt;                // "2026-05-10"
    const ano      = parts[0];

    logger.info(`[Cumple] Iniciando para ${todayISO} (cumpleDia=${mmdd})`);
    let totalProcesados = 0;

    for (const tenant of TENANTS) {
      const usersCol = db.collection(tenant.usersPath);
      const snap = await usersCol.where('cumpleDia', '==', mmdd).get();

      if (snap.empty) {
        logger.info(`[Cumple] ${tenant.id}: sin cumpleaños hoy`);
        continue;
      }
      logger.info(`[Cumple] ${tenant.id}: ${snap.size} user(s)`);

      for (const userDoc of snap.docs) {
        const user     = userDoc.data();
        const uid      = userDoc.id;
        const nombre   = user.nombre   || 'Cliente';
        const fcmToken = user.fcmToken ?? null;

        // ── Idempotencia doble ─────────────────────────────────────
        //  1) ultimoSelloCumple en el user (marca canónica post-Fase 3).
        //  2) historialSellos: durante la transición, algunos users tenían
        //     la marca solo en clientes/ mirror. Chequear historial evita
        //     duplicar si el sello del año ya se registró por el CF viejo.
        const anoUltimoSello = (user.ultimoSelloCumple || '').substring(0, 4);
        if (anoUltimoSello === ano) {
          logger.info(`[Cumple] ${uid}: ya recibió sello en ${ano} (ultimoSelloCumple), skip`);
          continue;
        }
        const historial = Array.isArray(user.historialSellos) ? user.historialSellos : [];
        const yaEsteAno = historial.some(h =>
          h && h.nota === '🎂 Regalo de cumpleaños' && (h.fecha || '').startsWith(ano)
        );
        if (yaEsteAno) {
          logger.info(`[Cumple] ${uid}: sello ya en historial ${ano}, backfill de ultimoSelloCumple`);
          await userDoc.ref.update({ ultimoSelloCumple: todayISO, updatedAt: Timestamp.now() });
          continue;
        }

        // ── Sumar sello ─────────────────────────────────────────────
        try {
          await userDoc.ref.update({
            sellosDisponibles: FieldValue.increment(1),
            sellosHistoricos:  FieldValue.increment(1),
            stamps:            FieldValue.increment(1),  // legacy UI
            ultimoSelloCumple: todayISO,
            historialSellos:   FieldValue.arrayUnion({
              fecha:    todayISO,
              tipo:     'suma',
              cantidad: 1,
              nota:     '🎂 Regalo de cumpleaños',
            }),
            updatedAt: Timestamp.now(),
          });
          logger.info(`[Cumple] +1 sello → ${nombre} (${uid})`);
          totalProcesados++;
        } catch (err) {
          logger.error(`[Cumple] Error sumando sello a ${uid}:`, err.message);
          continue;
        }

        // ── Push FCM ────────────────────────────────────────────────
        if (!fcmToken) {
          logger.info(`[Cumple] ${uid}: sin FCM token`);
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
          await writeNotifLog(db, {
            tenantId: tenant.id,
            type:    'push_cumpleanos',
            channel: 'push',
            status:  'sent',
            to:      { nombre, telefono: user.telefono || '' },
            meta:    {},
          });
        } catch (err) {
          logger.warn(`[Cumple] Push fallido para ${uid}: ${err.code || err.message}`);
        }
      }
    }

    logger.info(`[Cumple] Total sellos sumados hoy: ${totalProcesados}`);
  },
);
