'use strict';

// functions/corte-lapiz-reservar.js
// ─────────────────────────────────────────────────────────────────────────────
//  RESERVA CON MEMBRESÍA "CORTE AL LÁPIZ" (Yūgen) — sin pasarela de pago.
//
//  El sitio público (index.html) llama aquí cuando un cliente LOGUEADO con
//  membresía Corte al Lápiz activa elige agendar sin pagar en el momento.
//  La cita se crea de inmediato (estado Confirmada). El cargo a su cuenta
//  (precio + recargo) lo hace la CF sello-automatico al completar la cita.
//
//  Seguridad: se exige el ID token de Firebase Auth (header Authorization:
//  Bearer <token>) y se verifica server-side que el usuario tenga una cuenta
//  Corte al Lápiz activa. Así un no-miembro no puede saltarse el pago.
//
//  DEPLOY:
//    firebase deploy --only functions:corteLapizReservar
// ─────────────────────────────────────────────────────────────────────────────

const { onRequest }  = require('firebase-functions/v2/https');
const { logger }     = require('firebase-functions');
const admin          = require('firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');

const db = admin.firestore();

// Tenants con la membresía Corte al Lápiz activa.
const CORTE_LAPIZ_TENANTS = new Set(['yugen']);

const citasCol = tid => (tid === 'elegance' ? db.collection('citas') : db.collection(`tenants/${tid}/citas`));

exports.corteLapizReservar = onRequest(
  { cors: true, region: 'us-central1' },
  async (req, res) => {
    try {
      if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

      const tenantId = req.body && req.body.tenantId;
      const cita     = req.body && req.body.cita;
      if (!tenantId || !CORTE_LAPIZ_TENANTS.has(tenantId)) return res.status(400).json({ error: 'tenant_no_habilitado' });
      if (!cita || !cita.servicioId || !cita.fecha || !cita.hora) return res.status(400).json({ error: 'datos_incompletos' });

      // ── Verificar identidad (ID token de Firebase Auth) ──────────────────
      const authz = req.get('Authorization') || '';
      const m = authz.match(/^Bearer (.+)$/);
      if (!m) return res.status(401).json({ error: 'no_auth' });
      let decoded;
      try {
        decoded = await admin.auth().verifyIdToken(m[1]);
      } catch (e) {
        return res.status(401).json({ error: 'token_invalido' });
      }
      const uid = decoded.uid;

      // ── Verificar membresía Corte al Lápiz activa ────────────────────────
      const cuentaRef  = db.doc(`tenants/${tenantId}/corteLapiz/${uid}`);
      const cuentaSnap = await cuentaRef.get();
      if (!cuentaSnap.exists || cuentaSnap.data().activo === false) {
        return res.status(403).json({ error: 'no_es_miembro' });
      }

      // ── Anti doble-reserva: mismo barbero, fecha y hora, no cancelada ────
      if (cita.barberoId) {
        const dup = await citasCol(tenantId)
          .where('fecha', '==', cita.fecha)
          .where('hora', '==', cita.hora)
          .where('barberoId', '==', cita.barberoId)
          .get();
        const ocupado = dup.docs.some(d => (d.data().estado || '').toLowerCase() !== 'cancelada');
        if (ocupado) return res.status(409).json({ error: 'slot-taken' });
      }

      // ── Crear la cita ────────────────────────────────────────────────────
      const citaRef = citasCol(tenantId).doc();
      await citaRef.set({
        ...cita,
        estado:     'Confirmada',
        origen:     'web-corte-lapiz',
        corteLapiz: true,
        clienteUid: uid,
        creadoEn:   FieldValue.serverTimestamp(),
      });

      logger.info(`[CorteLapiz] reserva creada ${citaRef.id} (${tenantId}) uid=${uid}`);
      return res.json({ ok: true, citaId: citaRef.id });
    } catch (e) {
      logger.error('[CorteLapiz] reservar error', e);
      return res.status(500).json({ error: 'internal' });
    }
  },
);
