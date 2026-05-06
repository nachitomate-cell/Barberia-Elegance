// ════════════════════════════════════════════════════════════════
//  functions/index.js — Firebase Cloud Functions v2
//  Dispara notificación push FCM cuando se crea una reserva.
//
//  Cubre dos colecciones:
//    1. /citas/{citaId}                          ← reservas creadas desde admin
//    2. /tenants/{tenantId}/bookings/{bookingId}  ← reservas del flujo público web
//
//  DEPLOY:
//    firebase deploy --only functions
// ════════════════════════════════════════════════════════════════

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { setGlobalOptions }  = require('firebase-functions/v2');
const { logger }            = require('firebase-functions');
const admin                 = require('firebase-admin');

admin.initializeApp();
const db        = admin.firestore();
const messaging = admin.messaging();

// Región: us-central1 es el default de FCM; cambia a southamerica-east1 si prefieres Brasil
setGlobalOptions({ region: 'us-central1' });

// ─────────────────────────────────────────────────────────────────
//  HELPER: obtener tokens filtrados por rol (jefe/admin) y barbero
// ─────────────────────────────────────────────────────────────────
async function getTokensActivos(barberoId, barberoNombre) {
  const validUids = new Set();
  
  try {
    const barberosSnap = await db.collection('barberos').get();
    barberosSnap.forEach(doc => {
      const b = doc.data();
      const isManager = b.rol === 'jefe' || b.rol === 'admin';
      const isTheBarber = (barberoId && doc.id === barberoId) || (barberoNombre && b.nombre === barberoNombre);
      
      if (isManager || isTheBarber) {
        validUids.add(doc.id);
        if (b.uid) validUids.add(b.uid); // Por si acaso guardan el uid explícito
      }
    });

    const snap = await db.collection('fcm_tokens').where('activo', '==', true).get();
    const tokens = [];
    snap.forEach(d => {
      const data = d.data();
      if (validUids.has(data.uid)) {
        tokens.push(data.token);
      }
    });
    return tokens;
  } catch (err) {
    logger.error('[FCM] Error filtrando tokens:', err);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────
//  HELPER: enviar push a dispositivos filtrados
// ─────────────────────────────────────────────────────────────────
async function enviarPush({ title, body, citaId, fecha, hora, barberoId, barberoNombre }) {
  const tokens = await getTokensActivos(barberoId, barberoNombre);

  if (!tokens.length) {
    logger.warn('[FCM] No hay tokens registrados para los destinatarios (jefes/barbero). Omitiendo envío.');
    return null;
  }

  const message = {
    notification: { title, body },
    data: {
      citaId:  citaId || '',
      url:     '/gestion-interna/',
      fecha:   fecha  || '',
      hora:    hora   || '',
    },
    webpush: {
      headers: { Urgency: 'high' },
      notification: {
        title,
        body,
        icon:     '/icons/icon-192.png',
        badge:    '/icons/icon-192.png',
        vibrate:  [200, 100, 200],
        tag:      'nueva-cita',
        renotify: true,
        actions:  [{ action: 'abrir', title: 'Ver cita' }],
        data:     { url: '/gestion-interna/', citaId: citaId || '' }
      },
      fcmOptions: { link: '/gestion-interna/' }
    },
    tokens,
  };

  const response = await messaging.sendEachForMulticast(message);
  logger.info(`[FCM] Enviado: ${response.successCount} OK, ${response.failureCount} errores`);

  // Limpiar tokens inválidos
  const invalidos = [];
  response.responses.forEach((res, idx) => {
    if (!res.success) {
      const code = res.error?.code;
      logger.warn(`[FCM] Token ${idx} falló: ${code}`);
      if (
        code === 'messaging/invalid-registration-token' ||
        code === 'messaging/registration-token-not-registered'
      ) invalidos.push(tokens[idx]);
    }
  });

  if (invalidos.length) {
    const batch = db.batch();
    invalidos.forEach(t => batch.update(db.collection('fcm_tokens').doc(t), { activo: false }));
    await batch.commit();
    logger.info(`[FCM] ${invalidos.length} tokens marcados inactivos`);
  }
}

// ─────────────────────────────────────────────────────────────────
//  TRIGGER 1: reservas desde el admin (/citas/{citaId})
// ─────────────────────────────────────────────────────────────────
exports.notificarCitaAdmin = onDocumentCreated('citas/{citaId}', async (event) => {
  const cita   = event.data?.data();
  if (!cita) return null;

  // Anti-spam: máx. 3 citas por teléfono en las últimas 24 horas
  const telefono = cita.clienteTelefono;
  if (telefono) {
    const oneDayAgo = admin.firestore.Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
    try {
      const recientes = await db.collection('citas')
        .where('clienteTelefono', '==', telefono)
        .where('creadoEn', '>', oneDayAgo)
        .get();
      if (recientes.size > 3) {
        logger.warn(`[Anti-spam] ${telefono} superó el límite diario. Eliminando ${event.params.citaId}.`);
        await event.data.ref.delete();
        return null;
      }
    } catch (err) {
      logger.error('[Anti-spam] Error en verificación de rate limit:', err);
    }
  }

  const citaId  = event.params.citaId;
  const cliente = cita.clienteNombre || cita.nombre || 'Cliente';
  const servicio = cita.servicioNombre || cita.servicio || 'Servicio';
  const hora    = cita.hora  || '';
  const fecha   = cita.fecha || '';
  const barbero = cita.barbero || cita.barberoNombre || '';
  const barberoId = cita.barberoId || '';

  const title = `Nueva cita — ${hora} ${fecha}`.trim();
  const body  = barbero
    ? `${cliente} · ${servicio} · con ${barbero}`
    : `${cliente} · ${servicio}`;

  logger.info('[FCM] Cita admin creada:', { citaId, cliente, servicio, hora, fecha, barberoId, barbero });

  try {
    await enviarPush({ title, body, citaId, fecha, hora, barberoId, barberoNombre: barbero });
  } catch (err) {
    logger.error('[FCM] Error al enviar (admin):', err);
  }
  return null;
});

// ─────────────────────────────────────────────────────────────────
//  TRIGGER 2: reservas del flujo público web
//  /tenants/{tenantId}/bookings/{bookingId}
// ─────────────────────────────────────────────────────────────────
exports.notificarReservaPublica = onDocumentCreated(
  'tenants/{tenantId}/bookings/{bookingId}',
  async (event) => {
    const booking = event.data?.data();
    if (!booking) return null;

    const bookingId = event.params.bookingId;
    const cliente   = booking.customerData?.name  || 'Cliente';
    const servicio  = booking.serviceNameSnapshot  || 'Servicio';
    const hora      = booking.startTime            || '';
    const fecha     = booking.date                 || '';
    const barbero   = booking.professionalNameSnapshot || '';
    const barberoId = booking.professionalId || '';

    const title = `Nueva reserva — ${hora} ${fecha}`.trim();
    const body  = barbero
      ? `${cliente} · ${servicio} · con ${barbero}`
      : `${cliente} · ${servicio}`;

    logger.info('[FCM] Reserva pública creada:', { bookingId, cliente, servicio, hora, fecha, barberoId, barbero });

    try {
      await enviarPush({ title, body, citaId: bookingId, fecha, hora, barberoId, barberoNombre: barbero });
    } catch (err) {
      logger.error('[FCM] Error al enviar (público):', err);
    }
    return null;
  }
);
