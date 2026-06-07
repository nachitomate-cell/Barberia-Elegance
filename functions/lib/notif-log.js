'use strict';

const { Timestamp } = require('firebase-admin/firestore');

/**
 * Appends one record to the root /notification_logs collection.
 * Never throws — a logging failure must not crash the caller.
 *
 * @param {import('firebase-admin/firestore').Firestore} db
 * @param {{
 *   tenantId: string,
 *   type:    'push_confirmacion'|'email_confirmacion'|'email_recordatorio_1h'|
 *            'push_recordatorio_30min'|'push_prueba'|
 *            'push_sello'|'push_cumpleanos'|'push_recordatorio_corte'|
 *            'push_reenganche'|
 *            'whatsapp_24h'|'whatsapp_reactivacion',
 *   channel: 'push'|'email'|'whatsapp',
 *   status:  'sent'|'failed',
 *   to?:     { nombre?: string, telefono?: string, email?: string },
 *   error?:  string,
 *   meta?:   Record<string, string>
 * }} payload
 */
async function writeNotifLog(db, payload) {
  try {
    const ref = await db.collection('notification_logs').add({
      tenantId: payload.tenantId || '',
      type:     payload.type,
      channel:  payload.channel,
      status:   payload.status,
      to: {
        nombre:   payload.to?.nombre   || null,
        telefono: payload.to?.telefono || null,
        email:    payload.to?.email    || null,
      },
      error:  payload.error || null,
      meta:   payload.meta  || {},
      sentAt: Timestamp.now(),
      // Confirmación de entrega/click (solo push). Las actualiza la función
      // confirmarEntregaPush cuando el Service Worker del cliente reporta.
      delivered:   false,
      deliveredAt: null,
      clicked:     false,
      clickedAt:   null,
    });
    return ref.id;
  } catch (err) {
    const { logger } = require('firebase-functions');
    logger.warn('[notif-log] write failed:', err.message);
    return null;
  }
}

module.exports = { writeNotifLog };
