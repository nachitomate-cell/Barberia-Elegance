// functions/haircut-reminder.js
// ─────────────────────────────────────────────────────────────────
//  SISTEMA DE RECORDATORIOS DE CORTE — Fase 3.C
//
//  Dos exports:
//    actualizarSuggestionElegance  — trigger en /citas/{id}
//    actualizarSuggestionTenant    — trigger en /tenants/{tid}/citas/{id}
//    enviarRecordatoriosCorte      — cron medianoche (Santiago)
//
//  Flujo:
//    Cuando una cita cambia a 'completada' → recalcula nextSuggestionDate
//    en users/{clienteUid} (post Fase 1 toda cita tiene clienteUid).
//
//    El cron consulta WHERE nextSuggestionDate <= hoy sobre users/.
//    Nunca escanea todas las citas; es O(users_a_notificar).
//
//  Fase 3.C: migrado de clientes/ a users/. Los recordatorios "en vuelo"
//  (calculados antes del deploy) se recalculan al próximo trigger de
//  cita completada. Impacto acotado (~21 días).
// ─────────────────────────────────────────────────────────────────

'use strict';

const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { onSchedule }        = require('firebase-functions/v2/scheduler');
const { logger }            = require('firebase-functions');
const admin                 = require('firebase-admin');
const { Timestamp }         = require('firebase-admin/firestore');
const { writeNotifLog }     = require('./lib/notif-log');

const db        = admin.firestore();
const messaging = admin.messaging();

const ADVANCE_DAYS  = 3;
const MIN_CITAS_AVG = 2;
const MAX_CITAS_AVG = 4;
const TIMEZONE      = 'America/Santiago';

// Fase 3.C: solo el path de users/. clientes/ ya no se lee.
const TENANTS = [
  { id: 'elegance',             citasPath: 'citas',                              usersPath: 'users' },
  { id: 'gitana',               citasPath: 'tenants/gitana/citas',               usersPath: 'tenants/gitana/users' },
  { id: 'ferraza',              citasPath: 'tenants/ferraza/citas',              usersPath: 'tenants/ferraza/users' },
  { id: 'chameleon',            citasPath: 'tenants/chameleon/citas',            usersPath: 'tenants/chameleon/users' },
  { id: 'aura',                 citasPath: 'tenants/aura/citas',                 usersPath: 'tenants/aura/users' },
  { id: 'lumen',                citasPath: 'tenants/lumen/citas',                usersPath: 'tenants/lumen/users' },
  { id: 'mapubarbershop',       citasPath: 'tenants/mapubarbershop/citas',       usersPath: 'tenants/mapubarbershop/users' },
  { id: 'delnero',              citasPath: 'tenants/delnero/citas',              usersPath: 'tenants/delnero/users' },
  { id: 'marcelo_hairdressing', citasPath: 'tenants/marcelo_hairdressing/citas', usersPath: 'tenants/marcelo_hairdressing/users' },
  { id: 'machos',               citasPath: 'tenants/machos/citas',               usersPath: 'tenants/machos/users' },
  { id: 'infinity',             citasPath: 'tenants/infinity/citas',             usersPath: 'tenants/infinity/users' },
  { id: 'sionbarberia',         citasPath: 'tenants/sionbarberia/citas',         usersPath: 'tenants/sionbarberia/users' },
];

// ── Helpers ───────────────────────────────────────────────────────

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date)   return value;
  if (value.toDate)            return value.toDate();
  if (typeof value === 'string') return new Date(value);
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

// ── Core: recalcular nextSuggestionDate en users/{uid} ────────────

async function recalcularSuggestion(citasCol, usersCol, clienteUid, telefonoFallback, clienteNombre) {
  // Buscar por clienteUid (Fase 1: agenda/booking/registro linkean la
  // cita con el uid). Si por alguna razón la cita no tiene clienteUid,
  // fallback a buscar por teléfono (data legacy).
  const queries = [];
  if (clienteUid) {
    queries.push(citasCol
      .where('clienteUid', '==', clienteUid)
      .where('estado', 'in', ['Completada', 'completada'])
      .orderBy('fecha', 'desc')
      .limit(MAX_CITAS_AVG)
      .get());
  }
  if (telefonoFallback) {
    queries.push(citasCol
      .where('clienteTelefono', '==', telefonoFallback)
      .where('estado', 'in', ['Completada', 'completada'])
      .orderBy('fecha', 'desc')
      .limit(MAX_CITAS_AVG)
      .get());
  }
  if (!queries.length) return;

  const snaps = await Promise.all(queries);
  const seen = new Set();
  const docs = [];
  for (const snap of snaps) {
    for (const d of snap.docs) {
      if (!seen.has(d.id)) { seen.add(d.id); docs.push(d); }
    }
  }
  if (!docs.length) return;

  const fechas = docs
    .map(d => toDate(d.data().fecha))
    .filter(Boolean)
    .sort((a, b) => b - a)
    .slice(0, MAX_CITAS_AVG);
  if (!fechas.length) return;

  const ultimaCitaFecha = fechas[0];

  let avgIntervalDias = 21;
  if (fechas.length >= MIN_CITAS_AVG) {
    const intervals = [];
    for (let i = 0; i < fechas.length - 1; i++) {
      intervals.push(daysBetween(fechas[i], fechas[i + 1]));
    }
    avgIntervalDias = Math.round(intervals.reduce((s, v) => s + v, 0) / intervals.length);
    avgIntervalDias = Math.max(7, Math.min(60, avgIntervalDias));
  }

  const nextDate = addDays(ultimaCitaFecha, avgIntervalDias - ADVANCE_DAYS);

  if (!clienteUid) {
    logger.info(`[Haircut] cita sin clienteUid (tel=${telefonoFallback}) — skip escritura, no hay uid destino`);
    return;
  }

  // Seguir puntero de fusión: si el clienteUid apunta a un legacy que fue
  // fusionado con la cuenta del club (users/{authUid}), redirigir al
  // canónico. Sin esto los recordatorios quedan en el doc fusionado y el
  // push nunca sale (el fcmToken vive en el authUid).
  let uidDestino = clienteUid;
  try {
    const legacySnap = await usersCol.doc(clienteUid).get();
    const fusionadoCon = legacySnap.exists ? legacySnap.data()?.fusionadoCon : null;
    if (fusionadoCon && fusionadoCon !== clienteUid) {
      logger.info(`[Haircut] ${clienteUid} fusionado con ${fusionadoCon} — redirigo recordatorio al canónico`);
      uidDestino = fusionadoCon;
    }
  } catch (e) {
    logger.warn(`[Haircut] no se pudo verificar fusionadoCon de ${clienteUid}: ${e.message}`);
  }

  const userRef      = usersCol.doc(uidDestino);
  const existingSnap = await userRef.get();
  const writeData = {
    ultimaCitaFecha:    Timestamp.fromDate(ultimaCitaFecha),
    avgIntervalDias,
    nextSuggestionDate: Timestamp.fromDate(nextDate),
    updatedAt:          Timestamp.now(),
  };
  // Activar notificaciones solo si el campo no existe aún (opt-out sticky).
  if (!existingSnap.exists || existingSnap.data()?.notificacionesActivas === undefined) {
    writeData.notificacionesActivas = true;
  }
  // Rellenar nombre si el user no lo tiene (raro post-cleanup pero por si acaso)
  if (clienteNombre && existingSnap.exists && !existingSnap.data()?.nombre) {
    writeData.nombre = clienteNombre;
  }
  await userRef.set(writeData, { merge: true });

  logger.info(`[Haircut] users/${uidDestino} → avg=${avgIntervalDias}d next=${nextDate.toISOString().split('T')[0]}`);
}

// ── Trigger: /citas/{citaId} (elegance root) ──────────────────────

exports.actualizarSuggestionElegance = onDocumentWritten('citas/{citaId}', async (event) => {
  const before = event.data?.before?.data();
  const after  = event.data?.after?.data();

  if (!after)                                              return null;
  if (!['Completada', 'completada'].includes(after.estado)) return null;
  if (['Completada', 'completada'].includes(before?.estado)) return null;
  if (after.cierreMasivo) return null;

  await recalcularSuggestion(
    db.collection('citas'),
    db.collection('users'),
    after.clienteUid || after.userId || null,
    after.clienteTelefono,
    after.clienteNombre || after.nombre || '',
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
    if (after.cierreMasivo) return null;

    const { tid } = event.params;
    await recalcularSuggestion(
      db.collection(`tenants/${tid}/citas`),
      db.collection(`tenants/${tid}/users`),
      after.clienteUid || after.userId || null,
      after.clienteTelefono,
      after.clienteNombre || after.nombre || '',
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
    const todayTs  = Timestamp.fromDate(todayStart);
    const todayStr = todayStart.toISOString().split('T')[0];

    let totalEnviados = 0;

    for (const tenant of TENANTS) {
      const usersCol = db.collection(tenant.usersPath);
      const citasCol = db.collection(tenant.citasPath);

      const snap = await usersCol
        .where('notificacionesActivas', '==', true)
        .where('nextSuggestionDate', '<=', todayTs)
        .get();

      if (snap.empty) continue;

      const batchWrite = db.batch();
      const pushPromises = [];

      for (const userDoc of snap.docs) {
        const user     = userDoc.data();
        const uid      = userDoc.id;
        const telefono = user.telefono || '';
        const nombre   = user.nombre || 'Cliente';
        const fcmToken = user.fcmToken || null;
        const avgDias  = user.avgIntervalDias || 21;

        // Verificar que no tenga cita futura ya agendada (por uid o tel)
        const futurasQueries = [
          citasCol
            .where('clienteUid', '==', uid)
            .where('estado', 'in', ['Pendiente', 'pendiente', 'Confirmada', 'confirmada', 'Confirmado'])
            .where('fecha', '>', todayStr)
            .limit(1)
            .get(),
        ];
        if (telefono) {
          futurasQueries.push(citasCol
            .where('clienteTelefono', '==', telefono)
            .where('estado', 'in', ['Pendiente', 'pendiente', 'Confirmada', 'confirmada', 'Confirmado'])
            .where('fecha', '>', todayStr)
            .limit(1)
            .get());
        }
        const futuras = await Promise.all(futurasQueries);

        // Avanzar nextSuggestionDate un ciclo (evita spam mañana)
        const nextCycle = Timestamp.fromDate(addDays(todayStart, avgDias));
        batchWrite.update(userDoc.ref, { nextSuggestionDate: nextCycle });

        if (futuras.some(f => !f.empty)) continue; // ya tiene turno

        // notifications_queue (auditoría)
        const notifRef = db.collection('notifications_queue').doc();
        batchWrite.set(notifRef, {
          tenantId:        tenant.id,
          clienteUid:      uid,
          clienteTelefono: telefono,
          clienteNombre:   nombre,
          fcmToken:        fcmToken || null,
          type:            'haircut_reminder',
          status:          'pending',
          createdAt:       Timestamp.now(),
        });

        if (!fcmToken) continue;

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
          })
            .then(() => writeNotifLog(db, {
              tenantId: tenant.id,
              type:    'push_recordatorio_corte',
              channel: 'push',
              status:  'sent',
              to:      { nombre, telefono },
              meta:    {},
            }))
            .catch(err => logger.warn(`[Haircut FCM] ${uid}: ${err.code}`)),
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
