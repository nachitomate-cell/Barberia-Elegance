'use strict';

// functions/confirmar-entrega.js
// ─────────────────────────────────────────────────────────────────
//  CONFIRMACIÓN DE ENTREGA / CLICK DE PUSH
//
//  FCM Web no entrega acuse de recibo nativo, así que el Service Worker
//  del cliente (sw.js) reporta a este endpoint cuando:
//    - la notificación se MUESTRA en pantalla  → event: 'delivered'
//    - el usuario la TOCA                       → event: 'clicked'
//
//  Correlación: la push lleva data.logId con el id del doc en
//  notification_logs. Aquí se marca deliveredAt / clickedAt.
//
//  El logId es un id aleatorio de Firestore (capability token), por eso
//  el endpoint puede ser público (no expone datos, solo marca timestamps).
//
//  Deploy:
//    firebase deploy --only functions:confirmarEntregaPush
// ─────────────────────────────────────────────────────────────────

const { onRequest } = require('firebase-functions/v2/https');
const { logger }    = require('firebase-functions');
const admin         = require('firebase-admin');
const { Timestamp } = require('firebase-admin/firestore');

exports.confirmarEntregaPush = onRequest({ cors: true }, async (req, res) => {
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'POST')    { res.status(405).json({ ok: false, error: 'method' }); return; }

  try {
    const body  = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const logId = (body.logId || '').trim();
    const event = body.event;

    if (!logId || (event !== 'delivered' && event !== 'clicked')) {
      res.status(400).json({ ok: false, error: 'params' });
      return;
    }

    const db   = admin.firestore();
    const ref  = db.collection('notification_logs').doc(logId);
    const snap = await ref.get();
    if (!snap.exists) { res.status(404).json({ ok: false, error: 'not-found' }); return; }

    const data  = snap.data() || {};
    const patch = {};

    // Un click implica que se entregó.
    if (!data.deliveredAt) { patch.delivered = true; patch.deliveredAt = Timestamp.now(); }
    if (event === 'clicked' && !data.clickedAt) { patch.clicked = true; patch.clickedAt = Timestamp.now(); }

    if (Object.keys(patch).length) await ref.update(patch);

    res.status(200).json({ ok: true });
  } catch (e) {
    logger.warn('[confirmarEntregaPush]', e.message);
    res.status(500).json({ ok: false, error: 'internal' });
  }
});
