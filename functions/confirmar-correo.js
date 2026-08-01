'use strict';

// functions/confirmar-correo.js
// ─────────────────────────────────────────────────────────────────────────────
//  CONFIRMACIÓN DE ASISTENCIA POR CORREO — endpoint de /confirmacion.html
//
//  El botón "CONFIRMAR MI ASISTENCIA" del correo de recordatorio llega aquí.
//  REGLA DE PRODUCTO (deliberada): esto NUNCA cambia el estado de la cita.
//  El verde (Confirmada) es territorio exclusivo del flujo WhatsApp; el correo
//  solo deja el flag `confirmadaPorCorreo`, que la agenda muestra como badge
//  ✉️✓. Así una cita ámbar (esperando el CONFIRMAR por WhatsApp) sigue ámbar
//  aunque confirme por correo, y una verde solo gana el badge.
//
//  Seguridad: el citaId de Firestore es una capability de 20 chars aleatorios
//  que solo viaja en el correo del titular. Lo peor que puede hacer quien
//  tenga el link es... confirmar su propia asistencia.
// ─────────────────────────────────────────────────────────────────────────────

const { onRequest } = require('firebase-functions/v2/https');
const { logger }    = require('firebase-functions');
const admin         = require('firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');

const db = admin.firestore();

const citaRef = (tid, citaId) => (tid === 'elegance'
  ? db.collection('citas').doc(citaId)
  : db.collection(`tenants/${tid}/citas`).doc(citaId));

exports.confirmarCitaCorreo = onRequest({ region: 'us-central1', cors: true }, async (req, res) => {
  try {
    const tid    = String(req.query.t || req.body?.t || '').trim();
    const citaId = String(req.query.c || req.body?.c || '').trim();
    if (!/^[a-z0-9_-]{2,40}$/i.test(tid) || !/^[A-Za-z0-9_-]{6,40}$/.test(citaId)) {
      res.status(400).json({ ok: false, motivo: 'link-invalido' });
      return;
    }

    const ref  = citaRef(tid, citaId);
    const snap = await ref.get();
    if (!snap.exists) { res.status(404).json({ ok: false, motivo: 'no-existe' }); return; }
    const x = snap.data();

    if (['Cancelada', 'NoAsistio'].includes(x.estado)) {
      res.json({ ok: false, motivo: 'cancelada' });
      return;
    }

    const yaEstaba = x.confirmadaPorCorreo === true;
    if (!yaEstaba) {
      await ref.update({
        confirmadaPorCorreo:   true,
        confirmadaPorCorreoEn: FieldValue.serverTimestamp(),
      });
      logger.info(`[conf-correo] ${tid}/${citaId}: asistencia confirmada por correo`);
    }

    res.json({
      ok: true,
      yaEstaba,
      nombre:   x.clienteNombre  || '',
      servicio: x.servicioNombre || '',
      fecha:    x.fecha || '',
      hora:     x.hora  || '',
    });
  } catch (e) {
    logger.error('[conf-correo]', e.message);
    res.status(500).json({ ok: false, motivo: 'error' });
  }
});
