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

const { onDocumentCreated }    = require('firebase-functions/v2/firestore');
const { onSchedule }           = require('firebase-functions/v2/scheduler');
const { onCall, HttpsError }   = require('firebase-functions/v2/https');
const { setGlobalOptions }     = require('firebase-functions/v2');
const { logger }               = require('firebase-functions');
const admin                    = require('firebase-admin');

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
    const [barberosSnap, tokensSnap] = await Promise.all([
      db.collection('barberos').get(),
      db.collection('fcm_tokens').where('activo', '==', true).get(),
    ]);

    const barberoIdTrimmed   = (barberoId    || '').trim();
    const barberoNombreTrimmed = (barberoNombre || '').toLowerCase().trim();

    barberosSnap.forEach(doc => {
      const b = doc.data();
      if (b.activo === false) return;

      const isManager   = b.rol === 'jefe' || b.rol === 'admin';
      const matchById   = barberoIdTrimmed   && doc.id === barberoIdTrimmed;
      const matchByName = barberoNombreTrimmed && (b.nombre || '').toLowerCase().trim() === barberoNombreTrimmed;

      if (isManager || matchById || matchByName) {
        validUids.add(doc.id);
        if (b.uid) validUids.add(b.uid);
      }
    });

    const tokens = [];
    tokensSnap.forEach(d => {
      const data = d.data();
      if (validUids.has(data.uid)) tokens.push(data.token);
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
      citaId: citaId || '',
      url:    barberoId ? `/agenda/${barberoId}` : '/agenda',
      fecha:  fecha  || '',
      hora:   hora   || '',
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
        data:     { url: barberoId ? `/agenda/${barberoId}` : '/agenda', citaId: citaId || '' }
      },
      fcmOptions: { link: barberoId ? `/agenda/${barberoId}` : '/agenda' }
    },
    tokens,
  };

  const response = await messaging.sendEachForMulticast(message);
  logger.info(`[FCM] Enviado: ${response.successCount} OK, ${response.failureCount} errores`);

  // Limpiar tokens inválidos o expirados
  const TOKEN_ERRORS = new Set([
    'messaging/invalid-registration-token',
    'messaging/registration-token-not-registered',
    'messaging/invalid-argument',
  ]);
  const invalidos = [];
  response.responses.forEach((res, idx) => {
    if (!res.success) {
      const code = res.error?.code || '';
      logger.warn(`[FCM] Token ${idx} falló: ${code}`);
      if (TOKEN_ERRORS.has(code)) invalidos.push(tokens[idx]);
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

// ─────────────────────────────────────────────────────────────────
//  CRON: limpiar tokens FCM inactivos (se ejecuta cada domingo a las 3am UTC)
//  Elimina docs con activo==false o con más de 60 días sin actualizarse.
// ─────────────────────────────────────────────────────────────────
exports.limpiarTokensInactivos = onSchedule('0 3 * * 0', async () => {
  const corte60dias = admin.firestore.Timestamp.fromDate(
    new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
  );

  const [inactivosSnap, viejosSnap] = await Promise.all([
    db.collection('fcm_tokens').where('activo', '==', false).get(),
    db.collection('fcm_tokens').where('creadoEn', '<', corte60dias).get(),
  ]);

  // Unir IDs únicos a eliminar
  const idsAEliminar = new Set([
    ...inactivosSnap.docs.map(d => d.id),
    ...viejosSnap.docs.map(d => d.id),
  ]);

  if (!idsAEliminar.size) {
    logger.info('[Cron] No hay tokens para limpiar.');
    return;
  }

  const ids = [...idsAEliminar];
  // Firestore batch: máx 500 operaciones
  for (let i = 0; i < ids.length; i += 400) {
    const batch = db.batch();
    ids.slice(i, i + 400).forEach(id => batch.delete(db.collection('fcm_tokens').doc(id)));
    await batch.commit();
  }
  logger.info(`[Cron] ${ids.length} tokens eliminados.`);
});

// ─────────────────────────────────────────────────────────────────
//  CALLABLE: cambiar contraseña de un barbero desde el panel admin
//  Solo admins/jefes pueden invocar esta función.
// ─────────────────────────────────────────────────────────────────
exports.cambiarPasswordBarbero = onCall({ region: 'us-central1' }, async (request) => {
  const callerUid = request.auth?.uid;
  if (!callerUid) throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');

  const BOOTSTRAP_ADMINS = ['ignaciiio.mate@gmail.com', 'barrazanicolasfabian@gmail.com'];
  const callerEmail = request.auth?.token?.email || '';
  const isBootstrap  = BOOTSTRAP_ADMINS.includes(callerEmail.toLowerCase());

  if (!isBootstrap) {
    // Verificar que el caller sea admin/jefe en Firestore
    const callerDoc = await db.collection('barberos').doc(callerUid).get();
    const rol = callerDoc.exists ? callerDoc.data().rol : null;
    if (rol !== 'admin' && rol !== 'jefe') {
      throw new HttpsError('permission-denied', 'Solo administradores pueden cambiar contraseñas.');
    }
  }

  const { barberoId, password } = request.data;
  if (!barberoId || !password || password.length < 6) {
    throw new HttpsError('invalid-argument', 'barberoId y contraseña (mín. 6 caracteres) son requeridos.');
  }

  // Resolver el UID del barbero desde su barberoId (ID del doc original)
  let targetUid = null;

  // 1. Buscar un doc de enlace que apunte a este barberoId
  const linkSnap = await db.collection('barberos')
    .where('_mainDocId', '==', barberoId)
    .limit(1)
    .get();

  if (!linkSnap.empty) {
    targetUid = linkSnap.docs[0].id; // El ID del link doc ES el UID de Firebase Auth
  } else {
    // 2. Quizás el barberoId mismo es el UID (doc original con uid===id)
    const barberoDoc = await db.collection('barberos').doc(barberoId).get();
    if (barberoDoc.exists) {
      const data = barberoDoc.data();
      targetUid = data.uid || barberoId;
    }
  }

  if (!targetUid) throw new HttpsError('not-found', 'No se encontró el barbero.');

  try {
    await admin.auth().updateUser(targetUid, { password });
    logger.info(`[Admin] Contraseña actualizada para uid=${targetUid} barberoId=${barberoId}`);
    return { ok: true };
  } catch (err) {
    logger.error('[Admin] Error actualizando contraseña:', err);
    throw new HttpsError('internal', err.message);
  }
});
