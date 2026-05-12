// functions/haircut-reminder.js
// ─────────────────────────────────────────────────────────────────
//  SISTEMA DE RECORDATORIOS DE CORTE
//
//  Dos exports:
//    actualizarSuggestionElegance  — trigger en /citas/{id}
//    actualizarSuggestionTenant    — trigger en /tenants/{tid}/citas/{id}
//    enviarRecordatoriosCorte      — cron medianoche (Santiago)
//
//  Flujo:
//    Cuando una cita cambia a 'completada' → recalcula nextSuggestionDate
//    del cliente en /clientes/{telefono} (o /tenants/{tid}/clientes/{tel}).
//
//    El cron solo consulta WHERE nextSuggestionDate <= hoy — nunca escanea
//    todas las citas; es O(clientes_a_notificar).
// ─────────────────────────────────────────────────────────────────

'use strict';

const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { onSchedule }        = require('firebase-functions/v2/scheduler');
const { logger }            = require('firebase-functions');
const admin                 = require('firebase-admin');
const { Timestamp }         = require('firebase-admin/firestore');

const db        = admin.firestore();
const messaging = admin.messaging();

const ADVANCE_DAYS  = 3;   // notificar N días antes del corte predicho
const MIN_CITAS_AVG = 2;   // mínimo de citas completadas para calcular promedio
const MAX_CITAS_AVG = 4;   // ventana de citas para el rolling average
const TIMEZONE      = 'America/Santiago';

const TENANTS = [
  { id: 'elegance', citasPath: 'citas',                   clientesPath: 'clientes'                   },
  { id: 'gitana',   citasPath: 'tenants/gitana/citas',    clientesPath: 'tenants/gitana/clientes'    },
  { id: 'ferraza',  citasPath: 'tenants/ferraza/citas',   clientesPath: 'tenants/ferraza/clientes'   },
];

// ── Helpers ───────────────────────────────────────────────────────

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date)   return value;
  if (value.toDate)            return value.toDate();        // Firestore Timestamp
  if (typeof value === 'string') return new Date(value);     // 'YYYY-MM-DD'
  return null;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function daysBetween(d1, d2) {
  return Math.round(Math.abs(toDate(d2) - toDate(d1)) / 86_400_000);
}

// Normaliza teléfono para usar como ID de documento en /clientes
function normalizePhone(phone) {
  return (phone || '').replace(/\D/g, '');
}

// ── Core: recalcular nextSuggestionDate para un cliente ───────────

async function recalcularSuggestion(citasCol, clientesCol, telefono, clienteNombre) {
  const phone = normalizePhone(telefono);
  if (!phone) return;

  // Últimas MAX_CITAS_AVG citas completadas de este cliente
  const snap = await citasCol
    .where('clienteTelefono', '==', telefono)
    .where('estado', 'in', ['Completada', 'completada'])
    .orderBy('fecha', 'desc')
    .limit(MAX_CITAS_AVG)
    .get();

  if (snap.empty) return;

  const fechas = snap.docs
    .map(d => toDate(d.data().fecha))
    .filter(Boolean)
    .sort((a, b) => b - a);   // desc

  if (!fechas.length) return;

  const ultimaCitaFecha = fechas[0];

  // Promedio de intervalos entre citas consecutivas
  let avgIntervalDias = 21; // fallback: 3 semanas
  if (fechas.length >= MIN_CITAS_AVG) {
    const intervals = [];
    for (let i = 0; i < fechas.length - 1; i++) {
      intervals.push(daysBetween(fechas[i], fechas[i + 1]));
    }
    avgIntervalDias = Math.round(intervals.reduce((s, v) => s + v, 0) / intervals.length);
    avgIntervalDias = Math.max(7, Math.min(60, avgIntervalDias)); // clamp 7–60 días
  }

  // nextSuggestionDate = última cita + promedio - anticipo
  const nextDate = addDays(ultimaCitaFecha, avgIntervalDias - ADVANCE_DAYS);

  await clientesCol.doc(phone).set({
    nombre:             clienteNombre || null,
    telefono,
    ultimaCitaFecha:    Timestamp.fromDate(ultimaCitaFecha),
    avgIntervalDias,
    nextSuggestionDate: Timestamp.fromDate(nextDate),
    // notificacionesActivas: debe ser true para recibir recordatorios.
    // Se respeta si ya existe; se establece true solo en la primera escritura.
    updatedAt:          Timestamp.now(),
  }, { merge: true });

  // En la primera escritura activa las notificaciones por defecto
  const doc = await clientesCol.doc(phone).get();
  if (!doc.data()?.notificacionesActivas) {
    await clientesCol.doc(phone).update({ notificacionesActivas: true });
  }

  logger.info(`[Haircut] ${phone} → avg=${avgIntervalDias}d next=${nextDate.toISOString().split('T')[0]}`);
}

// ── Trigger: /citas/{citaId} (elegance root) ──────────────────────

exports.actualizarSuggestionElegance = onDocumentWritten('citas/{citaId}', async (event) => {
  const before = event.data?.before?.data();
  const after  = event.data?.after?.data();

  if (!after)                                              return null; // doc eliminado
  if (!['Completada', 'completada'].includes(after.estado)) return null;
  if (['Completada', 'completada'].includes(before?.estado)) return null;

  const telefono      = after.clienteTelefono;
  const clienteNombre = after.clienteNombre || after.nombre || '';
  if (!telefono) return null;

  await recalcularSuggestion(
    db.collection('citas'),
    db.collection('clientes'),
    telefono,
    clienteNombre,
  );
  return null;
});

// ── Trigger: /tenants/{tid}/citas/{citaId} (multi-tenant) ─────────

exports.actualizarSuggestionTenant = onDocumentWritten(
  'tenants/{tid}/citas/{citaId}',
  async (event) => {
    const before = event.data?.before?.data();
    const after  = event.data?.after?.data();

    if (!after)                                               return null;
    if (!['Completada', 'completada'].includes(after.estado))  return null;
    if (['Completada', 'completada'].includes(before?.estado))  return null;

    const { tid }       = event.params;
    const telefono      = after.clienteTelefono;
    const clienteNombre = after.clienteNombre || after.nombre || '';
    if (!telefono) return null;

    await recalcularSuggestion(
      db.collection(`tenants/${tid}/citas`),
      db.collection(`tenants/${tid}/clientes`),
      telefono,
      clienteNombre,
    );
    return null;
  },
);

// ── Cron: medianoche — enviar recordatorios ───────────────────────

exports.enviarRecordatoriosCorte = onSchedule(
  { schedule: '0 0 * * *', timeZone: TIMEZONE },
  async () => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayTs = Timestamp.fromDate(todayStart);

    let totalEnviados = 0;

    for (const tenant of TENANTS) {
      const clientesCol = db.collection(tenant.clientesPath);
      const citasCol    = db.collection(tenant.citasPath);

      // Consulta eficiente: solo clientes cuyo recordatorio vence hoy o antes
      const snap = await clientesCol
        .where('notificacionesActivas', '==', true)
        .where('nextSuggestionDate', '<=', todayTs)
        .get();

      if (snap.empty) continue;

      const batchWrite  = db.batch();
      const pushPromises = [];

      for (const clienteDoc of snap.docs) {
        const cliente  = clienteDoc.data();
        const telefono = cliente.telefono;
        const nombre   = cliente.nombre || 'Cliente';
        const fcmToken = cliente.fcmToken || null;
        const avgDias  = cliente.avgIntervalDias || 21;

        // Verificar que no tenga cita futura ya agendada
        const futuraCita = await citasCol
          .where('clienteTelefono', '==', telefono)
          .where('estado', 'in', ['Pendiente', 'pendiente', 'Confirmada', 'confirmada', 'Confirmado'])
          .where('fecha', '>', todayTs)
          .limit(1)
          .get();

        // Avanzar nextSuggestionDate un ciclo (evita spam mañana)
        const nextCycle = Timestamp.fromDate(addDays(todayStart, avgDias));
        batchWrite.update(clienteDoc.ref, { nextSuggestionDate: nextCycle });

        if (!futuraCita.empty) continue; // ya tiene turno → no molestar

        // Crear doc en notifications_queue (auditoría)
        const notifRef = db.collection('notifications_queue').doc();
        batchWrite.set(notifRef, {
          tenantId:        tenant.id,
          clienteTelefono: telefono,
          clienteNombre:   nombre,
          fcmToken:        fcmToken || null,
          type:            'haircut_reminder',
          status:          'pending',
          createdAt:       Timestamp.now(),
        });

        if (!fcmToken) continue; // sin token no hay push

        pushPromises.push(
          messaging.send({
            token: fcmToken,
            notification: {
              title: '✂️ ¡Tu estilo te extraña!',
              body:  `¡Hola ${nombre}! Tu corte está por perderse. ¿Lo agendamos?`,
            },
            data: { tenantId: tenant.id, type: 'haircut_reminder' },
            webpush: {
              notification: {
                icon:     '/icons/icon-192.png',
                badge:    '/icons/icon-192.png',
                tag:      'haircut-reminder',
                renotify: true,
                vibrate:  [200, 100, 200],
                actions:  [{ action: 'agendar', title: 'Agendar ahora' }],
              },
              fcmOptions: { link: '/' },
            },
          }).catch(err => logger.warn(`[Haircut FCM] ${telefono}: ${err.code}`)),
        );
      }

      await batchWrite.commit();
      await Promise.all(pushPromises);
      logger.info(`[Haircut] ${tenant.id}: ${pushPromises.length} notificaciones enviadas`);
      totalEnviados += pushPromises.length;
    }

    logger.info(`[Haircut] Total hoy: ${totalEnviados}`);
  },
);
