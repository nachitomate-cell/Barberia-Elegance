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
    const barberoIdTrimmed     = (barberoId    || '').trim();
    const barberoNombreTrimmed = (barberoNombre || '').toLowerCase().trim();

    // Query paralela: docs de barberos + tokens por UID + tokens directos por barberoId
    const queries = [
      db.collection('barberos').get(),
      db.collection('fcm_tokens').where('activo', '==', true).get(),
    ];
    if (barberoIdTrimmed) {
      queries.push(
        db.collection('fcm_tokens')
          .where('barberoId', '==', barberoIdTrimmed)
          .where('activo', '==', true)
          .get()
      );
    }

    const [barberosSnap, tokensSnap, directTokensSnap] = await Promise.all(queries);

    barberosSnap.forEach(doc => {
      const b = doc.data();
      if (b.activo === false) return;

      const isManager      = b.rol === 'jefe' || b.rol === 'admin';
      const matchById      = barberoIdTrimmed && doc.id === barberoIdTrimmed;
      const matchByName    = barberoNombreTrimmed && (b.nombre || '').toLowerCase().trim() === barberoNombreTrimmed;
      // Detecta doc de enlace (uid-doc): su _mainDocId apunta al doc original del barbero.
      // doc.id en este caso ES el UID de Firebase Auth del barbero.
      const matchByMainDoc = barberoIdTrimmed && b._mainDocId === barberoIdTrimmed;

      if (isManager || matchById || matchByName || matchByMainDoc) {
        validUids.add(doc.id);
        if (b.uid) validUids.add(b.uid);
      }
    });

    const tokenSet = new Set();

    // Tokens encontrados por UID
    tokensSnap.forEach(d => {
      const data = d.data();
      if (validUids.has(data.uid) && !tokenSet.has(data.token)) {
        tokenSet.add(data.token);
      }
    });

    // Tokens encontrados directamente por barberoId (mecanismo secundario)
    if (directTokensSnap) {
      directTokensSnap.forEach(d => {
        const t = d.data().token;
        if (t && !tokenSet.has(t)) tokenSet.add(t);
      });
    }

    return [...tokenSet];
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

  const { barberoId, email, password } = request.data;
  if (!password || password.length < 6) {
    throw new HttpsError('invalid-argument', 'Contraseña de mínimo 6 caracteres requerida.');
  }
  if (!email && !barberoId) {
    throw new HttpsError('invalid-argument', 'Se requiere email o barberoId.');
  }

  let targetUid = null;

  // 1. Buscar por email en Firebase Auth (método más directo y confiable)
  if (email) {
    try {
      const userRecord = await admin.auth().getUserByEmail(email.toLowerCase().trim());
      targetUid = userRecord.uid;
      logger.info(`[Admin] Usuario encontrado por email: ${email} → uid=${targetUid}`);
    } catch (err) {
      if (err.code !== 'auth/user-not-found') throw new HttpsError('internal', err.message);
    }
  }

  // 2. Fallback: buscar doc de enlace en Firestore que apunte al barberoId
  if (!targetUid && barberoId) {
    const linkSnap = await db.collection('barberos')
      .where('_mainDocId', '==', barberoId)
      .limit(1)
      .get();
    if (!linkSnap.empty) {
      targetUid = linkSnap.docs[0].id;
      logger.info(`[Admin] UID encontrado via link doc: ${targetUid}`);
    }
  }

  // 3. Fallback: uid guardado en el doc del barbero
  if (!targetUid && barberoId) {
    const barberoDoc = await db.collection('barberos').doc(barberoId).get();
    if (barberoDoc.exists && barberoDoc.data().uid) {
      targetUid = barberoDoc.data().uid;
    }
  }

  if (!targetUid) {
    throw new HttpsError('not-found', `No se encontró ningún usuario de Firebase Auth con el email "${email}". Verifica que el correo sea correcto.`);
  }

  try {
    await admin.auth().updateUser(targetUid, { password });
    logger.info(`[Admin] Contraseña actualizada uid=${targetUid}`);
    return { ok: true };
  } catch (err) {
    logger.error('[Admin] Error actualizando contraseña:', err);
    throw new HttpsError('internal', err.message);
  }
});
