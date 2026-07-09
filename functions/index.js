// ════════════════════════════════════════════════════════════════
//  functions/index.js — Firebase Cloud Functions v2
//  Dispara notificación push FCM cuando se crea una reserva.
//  Ver haircut-reminder.js para el sistema de recordatorios de corte.
//
//  Cubre dos colecciones:
//    1. /citas/{citaId}                          ← reservas creadas desde admin
//    2. /tenants/{tenantId}/bookings/{bookingId}  ← reservas del flujo público web
//
//  DEPLOY:
//    firebase deploy --only functions
// ════════════════════════════════════════════════════════════════

const { onDocumentCreated, onDocumentWritten } = require('firebase-functions/v2/firestore');
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

// ═════════════════════════════════════════════════════════════════
//  CUSTOM CLAIMS — sincronización automática de rol y tenantId
//
//  Cuando se escribe un doc de barbero se asignan Custom Claims al
//  usuario de Firebase Auth correspondiente.  Las reglas de Firestore
//  leen request.auth.token.role / .tenantId (sin lecturas extras).
//
//  Formato de claims: { role: 'admin'|'jefe'|'barbero', tenantId: string }
// ═════════════════════════════════════════════════════════════════

/**
 * Asigna Custom Claims a un UID dado, solo si los claims reales
 * son distintos a los existentes (evita bucles de escritura).
 */
async function setClaims(uid, role, tenantId) {
  try {
    const user = await admin.auth().getUser(uid);
    const current = user.customClaims || {};
    if (current.role === role && current.tenantId === tenantId) return; // ya están
    await admin.auth().setCustomUserClaims(uid, { role, tenantId });
    logger.info(`[Claims] ${uid} → role=${role} tenantId=${tenantId}`);
  } catch (err) {
    if (err.code !== 'auth/user-not-found') {
      logger.error('[Claims] Error setCustomUserClaims:', err.message);
    }
  }
}

/**
 * Resuelve el UID de Firebase Auth para un doc de barbero.
 * - Si el docId es directamente un UID de Auth → lo usa.
 * - Si el doc tiene campo `authUid` (patrón nuevo) → lo usa.
 * - Si el doc tiene campo `uid` (patrón legacy) → lo usa.
 * - Si el doc tiene `_mainDocId` → el docId ya ES el UID (link-doc).
 */
function resolveUid(docId, data) {
  if (data._mainDocId) return docId;         // link-doc: su ID es el UID
  if (data.authUid)    return data.authUid;  // patrón nuevo (Equipo.jsx)
  if (data.uid)        return data.uid;      // patrón legacy
  return docId;                              // intentar con el docId directamente
}

// Trigger: /barberos/{docId} (tenant elegance)
exports.sincronizarClaimsElegance = onDocumentWritten(
  'barberos/{docId}',
  async (event) => {
    const docId = event.params.docId;
    const after  = event.data?.after?.data();

    if (!after || after.activo === false) return null; // doc borrado o desactivado

    const uid      = resolveUid(docId, after);
    const role     = after.rol || 'barbero';
    const tenantId = 'elegance';

    await setClaims(uid, role, tenantId);
    return null;
  }
);

// Trigger: /tenants/{tid}/barberos/{docId} (ferraza, gitana, etc.)
exports.sincronizarClaimsTenant = onDocumentWritten(
  'tenants/{tid}/barberos/{docId}',
  async (event) => {
    const { tid, docId } = event.params;
    const after = event.data?.after?.data();

    if (!after || after.activo === false) return null;

    const uid      = resolveUid(docId, after);
    const role     = after.rol || 'barbero';

    await setClaims(uid, role, tid);
    return null;
  }
);

/**
 * CALLABLE: migración one-time — recorre todos los barberos existentes
 * y establece Custom Claims.  Solo puede invocarla ignaciiio.mate@gmail.com.
 * Llamar desde la consola del navegador (una sola vez):
 *   firebase.functions().httpsCallable('migrarClaimsExistentes')()
 */
exports.migrarClaimsExistentes = onCall({ region: 'us-central1' }, async (request) => {
  const BOOTSTRAP = ['ignaciiio.mate@gmail.com', 'barrazanicolasfabian@gmail.com'];
  const email     = request.auth?.token?.email || '';
  if (!BOOTSTRAP.includes(email.toLowerCase())) {
    throw new HttpsError('permission-denied', 'No autorizado.');
  }

  let migrados = 0;
  let errores  = 0;

  // Elegance: root /barberos
  const eleganceSnap = await db.collection('barberos').get();
  for (const docSnap of eleganceSnap.docs) {
    const data = docSnap.data();
    if (data.activo === false) continue;
    const uid = resolveUid(docSnap.id, data);
    try {
      await setClaims(uid, data.rol || 'barbero', 'elegance');
      migrados++;
    } catch { errores++; }
  }

  // Multi-tenant: /tenants/{tid}/barberos
  const tenantsSnap = await db.collection('tenants').get();
  for (const tenantDoc of tenantsSnap.docs) {
    const barberosSnap = await tenantDoc.ref.collection('barberos').get();
    for (const docSnap of barberosSnap.docs) {
      const data = docSnap.data();
      if (data.activo === false) continue;
      const uid = resolveUid(docSnap.id, data);
      try {
        await setClaims(uid, data.rol || 'barbero', tenantDoc.id);
        migrados++;
      } catch { errores++; }
    }
  }

  logger.info(`[Migración Claims] migrados=${migrados} errores=${errores}`);
  return { ok: true, migrados, errores };
});

// ═════════════════════════════════════════════════════════════════
//  CALLABLE: crearAccesoStaff
//
//  Permite a un ADMIN del local crear una cuenta Firebase Auth para
//  un miembro del equipo (barbero, jefe, admin) desde Equipo.jsx.
//  Se crea via Admin SDK server-side para que el ADMIN llamador no
//  pierda su sesión (createUserWithEmailAndPassword desde el cliente
//  loguea automáticamente al usuario recién creado).
//
//  Devuelve: { uid, email }
//
//  Autorización: superadmin bootstrap OR (role=='admin' && claim
//  tenantId coincide con el tenantId objetivo).
// ═════════════════════════════════════════════════════════════════
// cors:true → permite llamadas desde custom domains de tenants
// (delnerobarber.synaptechspa.cl, elegance.synaptechspa.cl, etc.). Sin esto,
// el default de v2 solo acepta *.web.app / *.firebaseapp.com y bloquea preflight.
exports.crearAccesoStaff = onCall({ region: 'us-central1', cors: true }, async (request) => {
  const SUPERADMINS = ['ignaciiio.mate@gmail.com', 'barrazanicolasfabian@gmail.com'];

  const callerEmail  = (request.auth?.token?.email || '').toLowerCase();
  const callerRole   = request.auth?.token?.role;
  const callerTenant = request.auth?.token?.tenantId;

  const { email, password, displayName, tenantId, rol = 'barbero' } = request.data || {};

  // ── Validación de payload ───────────────────────────────────
  if (!email || typeof email !== 'string') {
    throw new HttpsError('invalid-argument', 'Email requerido.');
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    throw new HttpsError('invalid-argument', 'La contraseña debe tener al menos 6 caracteres.');
  }
  if (!tenantId || typeof tenantId !== 'string') {
    throw new HttpsError('invalid-argument', 'tenantId requerido.');
  }
  const rolNorm = String(rol).toLowerCase();
  if (!['admin', 'jefe', 'barbero'].includes(rolNorm)) {
    throw new HttpsError('invalid-argument', `Rol inválido: ${rol}`);
  }

  // ── Autorización ────────────────────────────────────────────
  const isSuperadmin  = SUPERADMINS.includes(callerEmail);
  const isTenantAdmin = callerRole === 'admin' && callerTenant === tenantId;
  if (!isSuperadmin && !isTenantAdmin) {
    throw new HttpsError('permission-denied', 'Solo el admin del local puede crear accesos.');
  }

  // ── Crear cuenta Auth + custom claims ───────────────────────
  const emailNorm = email.trim().toLowerCase();
  try {
    const userRecord = await admin.auth().createUser({
      email:        emailNorm,
      password,
      displayName:  (displayName || '').trim() || undefined,
    });

    // Claims con la misma convención que sincronizarClaims* (role + tenantId).
    // El trigger de Firestore reasignará esto cuando el frontend guarde el doc
    // del barbero, pero lo dejamos ya seteado para que el primer login funcione.
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      role:     rolNorm,
      tenantId,
    });

    logger.info(`[crearAccesoStaff] uid=${userRecord.uid} email=${emailNorm} tenant=${tenantId} role=${rolNorm} by=${callerEmail}`);

    return { uid: userRecord.uid, email: userRecord.email };
  } catch (err) {
    if (err.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'Ya existe una cuenta con ese correo.');
    }
    if (err.code === 'auth/invalid-email') {
      throw new HttpsError('invalid-argument', 'El correo no tiene un formato válido.');
    }
    if (err.code === 'auth/invalid-password' || err.code === 'auth/weak-password') {
      throw new HttpsError('invalid-argument', 'Contraseña muy débil (mínimo 6 caracteres).');
    }
    logger.error('[crearAccesoStaff] Error inesperado:', err);
    throw new HttpsError('internal', err.message || 'No se pudo crear la cuenta.');
  }
});

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
//  HELPER: tokens para tenant multi-tenant (lee tenants/{tid}/fcm_tokens)
// ─────────────────────────────────────────────────────────────────
async function getTokensActivosTenant(tid, barberoId, barberoNombre) {
  const validUids = new Set();
  try {
    const barberoIdTrimmed     = (barberoId    || '').trim();
    const barberoNombreTrimmed = (barberoNombre || '').toLowerCase().trim();

    // Tokens viven en tenants/{tid}/fcm_tokens (misma ruta que usa tenantCol en agenda.html)
    const queries = [
      db.collection(`tenants/${tid}/barberos`).get(),
      db.collection(`tenants/${tid}/fcm_tokens`).where('activo', '==', true).get(),
    ];
    if (barberoIdTrimmed) {
      queries.push(
        db.collection(`tenants/${tid}/fcm_tokens`)
          .where('barberoId', '==', barberoIdTrimmed)
          .where('activo', '==', true)
          .get()
      );
    }

    const [barberosSnap, tokensSnap, directTokensSnap] = await Promise.all(queries);

    barberosSnap.forEach(docSnap => {
      const b = docSnap.data();
      if (b.activo === false) return;
      const isManager      = b.rol === 'jefe' || b.rol === 'admin';
      const matchById      = barberoIdTrimmed && docSnap.id === barberoIdTrimmed;
      const matchByName    = barberoNombreTrimmed && (b.nombre || '').toLowerCase().trim() === barberoNombreTrimmed;
      const matchByMainDoc = barberoIdTrimmed && b._mainDocId === barberoIdTrimmed;
      if (isManager || matchById || matchByName || matchByMainDoc) {
        validUids.add(docSnap.id);
        if (b.uid) validUids.add(b.uid);
      }
    });

    const tokenSet = new Set();
    tokensSnap.forEach(d => {
      const data = d.data();
      if (validUids.has(data.uid)) tokenSet.add(data.token);
    });
    if (directTokensSnap) {
      directTokensSnap.forEach(d => {
        const t = d.data().token;
        if (t && !tokenSet.has(t)) tokenSet.add(t);
      });
    }
    return [...tokenSet];
  } catch (err) {
    logger.error('[FCM] Error filtrando tokens tenant:', err);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────
//  TRIGGER 3: reservas desde admin en tenants multi-tenant
//  /tenants/{tenantId}/citas/{citaId}
// ─────────────────────────────────────────────────────────────────
exports.notificarCitaTenant = onDocumentCreated(
  'tenants/{tenantId}/citas/{citaId}',
  async (event) => {
    const cita = event.data?.data();
    if (!cita) return null;

    const { tenantId, citaId } = event.params;
    const cliente   = cita.clienteNombre || cita.nombre || 'Cliente';
    const servicio  = cita.servicioNombre || cita.servicio || 'Servicio';
    const hora      = cita.hora  || '';
    const fecha     = cita.fecha || '';
    const barbero   = cita.barbero || cita.barberoNombre || '';
    const barberoId = cita.barberoId || '';

    const title = `Nueva cita — ${hora} ${fecha}`.trim();
    const body  = barbero
      ? `${cliente} · ${servicio} · con ${barbero}`
      : `${cliente} · ${servicio}`;

    logger.info('[FCM] Cita tenant creada:', { tenantId, citaId, cliente, hora, fecha });

    try {
      const tokens = await getTokensActivosTenant(tenantId, barberoId, barbero);
      if (!tokens.length) {
        logger.warn(`[FCM] Sin tokens para tenant ${tenantId}. Omitiendo.`);
        return null;
      }

      const message = {
        notification: { title, body },
        data: { citaId, url: '/gestion-interna/agenda', fecha, hora },
        webpush: {
          headers: { Urgency: 'high' },
          notification: {
            title, body,
            icon:     '/gestion-interna/pwa-192.png',
            badge:    '/gestion-interna/pwa-192.png',
            vibrate:  [200, 100, 200],
            tag:      'nueva-cita',
            renotify: true,
          },
          fcmOptions: { link: '/gestion-interna/agenda' },
        },
        tokens,
      };

      const response = await messaging.sendEachForMulticast(message);
      logger.info(`[FCM] Tenant ${tenantId}: ${response.successCount} OK, ${response.failureCount} errores`);

      const TOKEN_ERRORS = new Set([
        'messaging/invalid-registration-token',
        'messaging/registration-token-not-registered',
        'messaging/invalid-argument',
      ]);
      const invalidos = [];
      response.responses.forEach((res, idx) => {
        if (!res.success && TOKEN_ERRORS.has(res.error?.code || '')) invalidos.push(tokens[idx]);
      });
      if (invalidos.length) {
        const batch = db.batch();
        invalidos.forEach(t => batch.update(db.collection(`tenants/${tenantId}/fcm_tokens`).doc(t), { activo: false }));
        await batch.commit();
      }
    } catch (err) {
      logger.error('[FCM] Error al enviar (tenant):', err);
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

// ─────────────────────────────────────────────────────────────────
//  HAIRCUT REMINDER SYSTEM — ver haircut-reminder.js para detalles
// ─────────────────────────────────────────────────────────────────
const haircutReminder = require('./haircut-reminder');
exports.actualizarSuggestionElegance = haircutReminder.actualizarSuggestionElegance;
exports.actualizarSuggestionTenant   = haircutReminder.actualizarSuggestionTenant;
exports.enviarRecordatoriosCorte     = haircutReminder.enviarRecordatoriosCorte;

// ─────────────────────────────────────────────────────────────────
//  SELLO AUTOMÁTICO — ver sello-automatico.js para detalles
// ─────────────────────────────────────────────────────────────────
const selloAutomatico = require('./sello-automatico');
exports.sellosElegance = selloAutomatico.sellosElegance;
exports.sellosTenant   = selloAutomatico.sellosTenant;

// ─────────────────────────────────────────────────────────────────
//  RECOMPENSA POR REFERIDO (B2C) — ver referidos-recompensa.js
//  Otorga sellos o crea redemptions pendientes al crear la primera
//  cita de un cliente que se registró con `referredByCode`.
// ─────────────────────────────────────────────────────────────────
const referidosRecompensa = require('./referidos-recompensa');
exports.referidosRecompensaElegance = referidosRecompensa.referidosRecompensaElegance;
exports.referidosRecompensaTenant   = referidosRecompensa.referidosRecompensaTenant;

// ─────────────────────────────────────────────────────────────────
//  FACTURACIÓN — ARRIENDO DE SILLÓN — ver facturacion-arriendo.js
//  Al completarse una cita emite la boleta AFECTA del local (arriendo
//  + productos) vía OpenFactura. BHE del barbero llega en Fase 3.
// ─────────────────────────────────────────────────────────────────
const facturacionArriendo = require('./facturacion-arriendo');
exports.facturacionArriendoElegance = facturacionArriendo.facturacionArriendoElegance;
exports.facturacionArriendoTenant   = facturacionArriendo.facturacionArriendoTenant;
exports.facturacionGuardarApiKey    = facturacionArriendo.facturacionGuardarApiKey;
exports.facturacionTestAfecta       = facturacionArriendo.facturacionTestAfecta;
exports.facturacionReemitir         = facturacionArriendo.facturacionReemitir;
exports.facturacionObtenerPDF       = facturacionArriendo.facturacionObtenerPDF;

// ─────────────────────────────────────────────────────────────────
//  CANJES ATÓMICOS — ver canjes.js
//  crearCanje descuenta sellos + crea redemption en una transacción.
//  cancelarCanje (o expiración automática) devuelve los sellos.
// ─────────────────────────────────────────────────────────────────
const canjes = require('./canjes');
exports.crearCanje              = canjes.crearCanje;
exports.cancelarCanje           = canjes.cancelarCanje;
exports.liberarCanjesExpirados  = canjes.liberarCanjesExpirados;

// ─────────────────────────────────────────────────────────────────
//  CUMPLEAÑOS AUTOMÁTICO — ver cumpleanos.js para detalles
// ─────────────────────────────────────────────────────────────────
const cumpleanos = require('./cumpleanos');
exports.selloCumpleanos = cumpleanos.selloCumpleanos;

const campanaReactivacion = require('./campana-reactivacion');
exports.campanaReactivacion = campanaReactivacion.campanaReactivacion;

const gestionCitaCodigo = require('./gestion-cita-codigo');
exports.gestionarCitaPorCodigo = gestionCitaCodigo.gestionarCitaPorCodigo;

// ─────────────────────────────────────────────────────────────────
//  ALERTAS FINANCIERAS — ver alertas-financieras.js para detalles
// ─────────────────────────────────────────────────────────────────
const alertasFinancieras = require('./alertas-financieras');
exports.alertasFinancierasDaily = alertasFinancieras.alertasFinancierasDaily;

// ─────────────────────────────────────────────────────────────────
//  AGREGADOS DE CLIENTES — ver stats-aggregate.js (reduce lecturas)
// ─────────────────────────────────────────────────────────────────
const statsAggregate = require('./stats-aggregate');
exports.agregarStatsClientes = statsAggregate.agregarStatsClientes;

// ─────────────────────────────────────────────────────────────────
//  RECORDATORIO DE CITA 24H — ver recordatorio-cita.js para detalles
// ─────────────────────────────────────────────────────────────────
const recordatorioCita = require('./recordatorio-cita');
exports.recordatorioCita24h   = recordatorioCita.recordatorioCita24h;
exports.recordatorioCita1h    = recordatorioCita.recordatorioCita1h;
exports.recordatorioCita30min = recordatorioCita.recordatorioCita30min;

// ─────────────────────────────────────────────────────────────────
//  RECORDATORIO DE COBRO (mensualidad) — push al admin del local
// ─────────────────────────────────────────────────────────────────
const recordatorioCobro = require('./recordatorio-cobro');
exports.recordatorioCobro = recordatorioCobro.recordatorioCobro;

// ─────────────────────────────────────────────────────────────────
//  CONFIRMACIÓN DE ENTREGA / CLICK DE PUSH — ver confirmar-entrega.js
//  Endpoint HTTP que el Service Worker llama para marcar deliveredAt/clickedAt.
// ─────────────────────────────────────────────────────────────────
const confirmarEntrega = require('./confirmar-entrega');
exports.confirmarEntregaPush = confirmarEntrega.confirmarEntregaPush;

// ─────────────────────────────────────────────────────────────────
//  ENVIAR PUSH DE PRUEBA — ver enviar-push-prueba.js
//  Callable (solo superadmin) para probar push a un cliente desde /admin.
// ─────────────────────────────────────────────────────────────────
const enviarPushPrueba = require('./enviar-push-prueba');
exports.enviarPushPrueba = enviarPushPrueba.enviarPushPrueba;

// ─────────────────────────────────────────────────────────────────
//  PUSH A ADMINS DEL PORTAL /admin (PWA)
//  Callable que dispara FCM a todos los tokens de /admin_fcm_tokens
//  ver admin-push.js
// ─────────────────────────────────────────────────────────────────
const adminPush = require('./admin-push');
exports.enviarPushAdmin = adminPush.enviarPushAdmin;

// ─────────────────────────────────────────────────────────────────
//  DAILY DIGEST — Push diaria 09:00 (Santiago) al portal /admin
//  con stats agregados de toda la red. Ver admin-daily-digest.js
// ─────────────────────────────────────────────────────────────────
const adminDailyDigest = require('./admin-daily-digest');
exports.adminDailyDigest   = adminDailyDigest.adminDailyDigest;
exports.adminDigestPreview = adminDailyDigest.adminDigestPreview;

// ─────────────────────────────────────────────────────────────────
//  BROADCAST DE ANUNCIO — ver broadcast-anuncio.js
//  Callable (solo superadmin) para mandar una push a todos los
//  admins + barberos del panel. Crea broadcast_campaigns/{id} con
//  un sub-doc por destinatario para auditar la entrega.
// ─────────────────────────────────────────────────────────────────
const broadcastAnuncio = require('./broadcast-anuncio');
exports.broadcastAnuncio = broadcastAnuncio.broadcastAnuncio;

// ─────────────────────────────────────────────────────────────────
//  ANUNCIOS AL CLIENTE (push publicitario con targeting + métricas)
//  Broadcast a clientes del Club con reglas duras server-side:
//  cooldown, max/mes, ventana horaria, exclusión con cita 72h, opt-out.
//  Kronnos-aware (users viven en pool marca). Tracking opens + conversions.
// ─────────────────────────────────────────────────────────────────
const anunciosCliente = require('./anuncios-cliente');
exports.enviarAnuncioCliente             = anunciosCliente.enviarAnuncioCliente;
exports.previewAudienciaAnuncio          = anunciosCliente.previewAudienciaAnuncio;
exports.trackAperturaAnuncio             = anunciosCliente.trackAperturaAnuncio;
exports.onCitaCreadaAnuncioConvElegance  = anunciosCliente.onCitaCreadaAnuncioConvElegance;
exports.onCitaCreadaAnuncioConvTenant    = anunciosCliente.onCitaCreadaAnuncioConvTenant;

// ─────────────────────────────────────────────────────────────────
//  RECORDATORIO SEMANAL — CERRAR CITAS DEL DÍA
//  Cada viernes 20:00 hora Chile manda push a admins + barberos
//  para que marquen sus citas como Completada (sello + comisión).
// ─────────────────────────────────────────────────────────────────
const recordatorioCerrarCitas = require('./recordatorio-cerrar-citas');
exports.recordatorioCerrarCitasSemanal = recordatorioCerrarCitas.recordatorioCerrarCitasSemanal;


// ─────────────────────────────────────────────────────────────────
//  CONFIRMACIÓN DE CITA POR EMAIL — ver confirmacion-cita.js
// ─────────────────────────────────────────────────────────────────
const confirmacionCita = require('./confirmacion-cita');
exports.confirmacionCitaElegance = confirmacionCita.confirmacionCitaElegance;
exports.confirmacionCitaTenant   = confirmacionCita.confirmacionCitaTenant;

// ─────────────────────────────────────────────────────────────────
//  RECUPERACIÓN DE CONTRASEÑA — ver recuperacion-password.js
//  Envía el enlace por Resend desde citas@synaptechspa.cl
// ─────────────────────────────────────────────────────────────────
const recuperacionPassword = require('./recuperacion-password');
exports.enviarRecuperacionPassword = recuperacionPassword.enviarRecuperacionPassword;

// ─────────────────────────────────────────────────────────────────
//  MEMBRESÍA DELUXE PERFUMES — ver membresia-notificaciones.js
//  Push de vencimiento (cron diario), nuevo decant (callable admin),
//  anuncio en chat (trigger onDocumentCreated)
// ─────────────────────────────────────────────────────────────────
const membresiaNotif = require('./membresia-notificaciones');
exports.avisarVencimientoMembresia = membresiaNotif.avisarVencimientoMembresia;
exports.notificarNuevoDecant       = membresiaNotif.notificarNuevoDecant;
exports.notificarAnuncioChat       = membresiaNotif.notificarAnuncioChat;

// ─────────────────────────────────────────────────────────────────
//  INSTAGRAM SYNC — ver instagram-sync.js
//  OAuth callback, cron cada 6h y sync manual desde admin panel.
//  Requiere secret: INSTAGRAM_APP_SECRET
//  App ID (no secreto): _system/instagram_app { appId: '...' }
// ─────────────────────────────────────────────────────────────────
const instagramSync = require('./instagram-sync');
exports.instagramOAuthCallback   = instagramSync.instagramOAuthCallback;
exports.instagramSyncScheduled   = instagramSync.instagramSyncScheduled;
exports.instagramSyncManual      = instagramSync.instagramSyncManual;

// ─────────────────────────────────────────────────────────────────
//  GOOGLE REVIEWS SYNC — ver google-reviews-sync.js
//  Cron diario + sync manual. Sincroniza rating/total/reseñas desde
//  Google Places API hacia settings/googleReviews por tenant.
//  Requiere secret: GOOGLE_PLACES_API_KEY
//  Place ID (no secreto): tenants/{tid}/settings/googleReviews { placeId }
// ─────────────────────────────────────────────────────────────────
const googleReviews = require('./google-reviews-sync');
exports.googleReviewsSyncScheduled = googleReviews.googleReviewsSyncScheduled;
exports.googleReviewsSyncManual    = googleReviews.googleReviewsSyncManual;

// ─────────────────────────────────────────────────────────────────
//  DEDUP CLIENTE — ver dedupe-cliente-onCreate.js
//  Al registrarse un cliente, fusiona automáticamente con su perfil
//  legacy (creado por la migración de AgendaPro) si comparte email.
// ─────────────────────────────────────────────────────────────────
const dedupeCliente = require('./dedupe-cliente-onCreate');
exports.dedupeOnCreateElegance = dedupeCliente.dedupeOnCreateElegance;
exports.dedupeOnCreateTenant   = dedupeCliente.dedupeOnCreateTenant;

// ─────────────────────────────────────────────────────────────────
//  LIBERAR SLOT AL CANCELAR — ver liberar-slot-on-cancel.js
//  Cliente puede cancelar pero no tiene permiso para borrar slotLocks.
//  Esta CF lo libera server-side cuando una cita pasa a Cancelada.
// ─────────────────────────────────────────────────────────────────
const liberarSlot = require('./liberar-slot-on-cancel');
exports.liberarSlotElegance = liberarSlot.liberarSlotElegance;
exports.liberarSlotTenant   = liberarSlot.liberarSlotTenant;

// ─────────────────────────────────────────────────────────────────
//  ASEGURAR SLOT LOCK — ver asegurar-slot.js
//  Garantiza que toda cita activa con barbero tenga su candado público
//  (slotLocks), para que la reserva online no ofrezca horas ya ocupadas
//  aunque la cita se haya creado por una vía que no escribió el lock.
// ─────────────────────────────────────────────────────────────────
const asegurarSlot = require('./asegurar-slot');
exports.asegurarSlotElegance = asegurarSlot.asegurarSlotElegance;
exports.asegurarSlotTenant   = asegurarSlot.asegurarSlotTenant;

// ─────────────────────────────────────────────────────────────────
//  PUSH AL CLIENTE — ver push-cliente.js
//  Notifica al cliente cuando: (1) su cita es creada/confirmada,
//  (2) gana un sello / desbloquea un premio.
// ─────────────────────────────────────────────────────────────────
const pushCliente = require('./push-cliente');
exports.pushCitaConfirmadaElegance = pushCliente.pushCitaConfirmadaElegance;
exports.pushCitaConfirmadaTenant   = pushCliente.pushCitaConfirmadaTenant;
exports.pushSelloGanadoElegance    = pushCliente.pushSelloGanadoElegance;
exports.pushSelloGanadoTenant      = pushCliente.pushSelloGanadoTenant;

// ─────────────────────────────────────────────────────────────────
//  AUTO-ENROLL AL CLUB — ver auto-enroll-cliente.js
//  Tenants opt-in (hardcoded en AUTO_ENROLL_TENANTS): cada cita nueva
//  crea automáticamente el perfil del cliente en users/ para que la
//  CF sello-automatico le sume sellos al completar. Hoy: aura.
// ─────────────────────────────────────────────────────────────────
const autoEnroll = require('./auto-enroll-cliente');
exports.autoEnrollTenant = autoEnroll.autoEnrollTenant;

// ─────────────────────────────────────────────────────────────────
//  REACTIVACIÓN DE CLIENTES — ver reactivacion-clientes.js
//  Cron diario a las 10:00 AM Santiago. Envía WhatsApp a clientes
//  inactivos (+30 días sin cita) con link de reserva. Cooldown 30d.
// ─────────────────────────────────────────────────────────────────
const reactivacionClientes = require('./reactivacion-clientes');
exports.reactivacionClientes = reactivacionClientes.reactivacionClientes;

// ─────────────────────────────────────────────────────────────────
//  RE-ENGANCHE POR INACTIVIDAD — ver push-reenganche.js
//  Cron diario a las 11:00 AM Santiago. Envía push a clientes cuyo
//  último sello fue hace exactamente 10, 15 o 25 días. Idempotente
//  por período: users/{uid}.pushReenganche.{d10|d15|d25}.
// ─────────────────────────────────────────────────────────────────
const pushReenganche = require('./push-reenganche');
exports.pushReengancheClientes = pushReenganche.pushReengancheClientes;

// ─────────────────────────────────────────────────────────────────
//  PUSH DEL CHAT / MENSAJES DIRECTOS — ver push-chat.js
//  Dispara en cada mensaje nuevo del chat en tiempo real:
//    - admin responde desde /gestion-interna/mensajes → push al cliente.
//    - cliente escribe desde su dashboard            → push a admins/jefes.
// ─────────────────────────────────────────────────────────────────
const pushChat = require('./push-chat');
exports.pushChatMsgElegance = pushChat.pushChatMsgElegance;
exports.pushChatMsgTenant   = pushChat.pushChatMsgTenant;

// ─────────────────────────────────────────────────────────────────
//  PASARELA DE PAGO MERCADO PAGO — ver mercadopago-pago.js
//  Cobro previo a la reserva (tenants opt-in: hoy yugen). La cita se
//  crea recién al confirmar el pago (webhook), disparando email + push.
//  Reemplazó a Flow como única pasarela. Secret: MP_ACCESS_TOKEN.
//  (El módulo flow-pago.js queda en el repo para referencia/rollback.)
// ─────────────────────────────────────────────────────────────────
const mpPago = require('./mercadopago-pago');
exports.mpCrearPago = mpPago.mpCrearPago;
exports.mpWebhook   = mpPago.mpWebhook;
exports.mpRetorno   = mpPago.mpRetorno;
exports.mpReembolsar = mpPago.mpReembolsar;

// ─────────────────────────────────────────────────────────────────
//  CORTE AL LÁPIZ — reserva sin pasarela para miembros (Yūgen)
//  ver corte-lapiz-reservar.js. La acumulación a la cuenta corriente
//  la hace sello-automatico al completar la cita.
// ─────────────────────────────────────────────────────────────────
const corteLapizReservar = require('./corte-lapiz-reservar');
exports.corteLapizReservar = corteLapizReservar.corteLapizReservar;

// ─────────────────────────────────────────────────────────────────
//  BIOO — aprovisionamiento de Link in Bio para integraciones externas
//  (p.ej. Club Patio Curauma). Crea bios/<handle> prellenado + token de
//  reclamo; el comercio toma la propiedad con Google en bioo.cl/claim.
//  ver bioo-provision.js
// ─────────────────────────────────────────────────────────────────
const biooProvision = require('./bioo-provision');
exports.biooProvision         = biooProvision.biooProvision;
exports.biooClaim             = biooProvision.biooClaim;
exports.biooEditorSession     = biooProvision.biooEditorSession;
exports.biooEditorBridge      = biooProvision.biooEditorBridge;
exports.provisionPartnerUser  = biooProvision.provisionPartnerUser;
exports.biooProvisionBarbero  = biooProvision.biooProvisionBarbero;
exports.biooOpenBarberoEditor = biooProvision.biooOpenBarberoEditor;

// ─────────────────────────────────────────────────────────────────
//  BIOO — MODO DISEÑADOR (superadmin diseña bios para clientes
//  externos y entrega por WhatsApp). Reusa biooClaim para que el
//  cliente adopte la bio iniciando sesión con Google. ver
//  bioo-designer.js.
// ─────────────────────────────────────────────────────────────────
const biooDesigner = require('./bioo-designer');
exports.biooDesignerCreate      = biooDesigner.biooDesignerCreate;
exports.biooDesignerImpersonate = biooDesigner.biooDesignerImpersonate;
exports.biooDesignerHandover    = biooDesigner.biooDesignerHandover;

// ─────────────────────────────────────────────────────────────────
//  BIOO — pagos del paywall (Stripe Checkout). ver payments-stripe.js
//  Requiere el secreto STRIPE_SECRET_KEY (Secret Manager) y el paquete
//  'stripe' instalado en functions/.
// ─────────────────────────────────────────────────────────────────
const paymentsStripe = require('./payments-stripe');
exports.createStripeCheckout = paymentsStripe.createStripeCheckout;
exports.verifyUnlock         = paymentsStripe.verifyUnlock;
exports.stripeWebhook        = paymentsStripe.stripeWebhook;
exports.onboardStripeUser    = paymentsStripe.onboardStripeUser;

// ─────────────────────────────────────────────────────────────────
//  BIOO — pagos marketplace con Mercado Pago (Chile/LatAm). ver
//  payments-mp.js. Requiere los secretos MP_APP_ID y MP_APP_SECRET.
//  Convive con Stripe: el cliente elige proveedor según lo conectado.
// ─────────────────────────────────────────────────────────────────
const paymentsMp = require('./payments-mp');
exports.mpBioConnect       = paymentsMp.mpBioConnect;
exports.mpBioOAuthCallback = paymentsMp.mpBioOAuthCallback;
exports.mpBioCheckout      = paymentsMp.mpBioCheckout;
exports.mpBioWebhook       = paymentsMp.mpBioWebhook;
exports.mpBioVerify        = paymentsMp.mpBioVerify;

// ─────────────────────────────────────────────────────────────────
//  BARBERÍAS — conexión MP por tenant (OAuth marketplace). ver
//  payments-mp-tenant.js. Reutiliza MP_APP_ID/MP_APP_SECRET. Yügen
//  sigue con el token de plataforma (fallback en mercadopago-pago.js).
// ─────────────────────────────────────────────────────────────────
const paymentsMpTenant = require('./payments-mp-tenant');
exports.mpTenantConnect       = paymentsMpTenant.mpTenantConnect;
exports.mpTenantOAuthCallback = paymentsMpTenant.mpTenantOAuthCallback;
exports.mpTenantDisconnect    = paymentsMpTenant.mpTenantDisconnect;

// ─────────────────────────────────────────────────────────────────
//  BIOO — cobros SINGLE-SELLER de plataforma (SynapTech cobra al
//  creador). Producto inicial: "Quitar marca de agua" $4.990 CLP.
//  ver payments-mp-platform.js — usa MP_PLATFORM_ACCESS_TOKEN.
// ─────────────────────────────────────────────────────────────────
const paymentsMpPlatform = require('./payments-mp-platform');
exports.mpBioPlatformCheckout = paymentsMpPlatform.mpBioPlatformCheckout;
exports.mpBioPlatformWebhook  = paymentsMpPlatform.mpBioPlatformWebhook;
exports.mpBioPlatformVerify   = paymentsMpPlatform.mpBioPlatformVerify;

// ─────────────────────────────────────────────────────────────────
//  BIOO — aviso por email al superadmin cuando se crea una nueva
//  bioo (self-service o provisionada). Usa Resend (RESEND_API_KEY).
// ─────────────────────────────────────────────────────────────────
const biooNuevoSignup = require('./bioo-nuevo-signup');
exports.notificarNuevaBioo = biooNuevoSignup.notificarNuevaBioo;

// ─────────────────────────────────────────────────────────────────
//  BIOO RESERVAS — aviso por email al barbero cuando entra una
//  cita nueva desde su Bioo pública. Resuelve email vía Auth y usa
//  Resend (RESEND_API_KEY).
// ─────────────────────────────────────────────────────────────────
const biooReservasAviso = require('./bioo-reservas-aviso');
exports.avisarNuevaReservaBioo = biooReservasAviso.avisarNuevaReservaBioo;

// ─────────────────────────────────────────────────────────────────
//  BIOO RESERVAS — emails AL CLIENTE: confirmación inmediata al
//  reservar + recordatorio scheduled 24h antes del slot. Usan
//  cliente.email del doc reserva y bumpean reminderSentAt para
//  evitar duplicados.
// ─────────────────────────────────────────────────────────────────
const biooReservasCliente = require('./bioo-reservas-cliente');
exports.confirmarReservaCliente = biooReservasCliente.confirmarReservaCliente;
exports.recordatorio24hCliente  = biooReservasCliente.recordatorio24hCliente;

// ─────────────────────────────────────────────────────────────────
//  BIOO — KPIs reales para el panel /admin. Callable que agrega
//  count(bios), conexiones Stripe/MP y volumen por moneda con
//  Admin SDK (bypass de reglas). Solo admin lo puede invocar.
// ─────────────────────────────────────────────────────────────────
const biooAdminKpis = require('./bioo-admin-kpis');
exports.loadAdminKpis = biooAdminKpis.loadAdminKpis;

// ─────────────────────────────────────────────────────────────────
//  BIOO — bootstrap admin (HTTP gated por BIOO_PROVISION_SECRET).
//  Setea bios/{u}.isAdmin. Reusable por terminal sin tocar consola.
// ─────────────────────────────────────────────────────────────────
const biooAdminBootstrap = require('./bioo-admin-bootstrap');
exports.setBioAdmin = biooAdminBootstrap.setBioAdmin;

// ─────────────────────────────────────────────────────────────────
//  REFERIDOS B2B — growth loop SaaS. Cada tenant tiene un código y
//  gana meses gratis al traer a otro tenant pagador. Ver referidos.js
//  para los 3 callables (asegurarCodigo / crearSignup / marcarConvertido).
// ─────────────────────────────────────────────────────────────────
const referidos = require('./referidos');
exports.referidosAsegurarCodigo  = referidos.referidosAsegurarCodigo;
exports.referidosCrearSignup     = referidos.referidosCrearSignup;
exports.referidosMarcarConvertido = referidos.referidosMarcarConvertido;

// Trigger Firestore: avisa por email a Ignacio cuando entra un signup nuevo.
const referidosAviso = require('./referidos-aviso');
exports.avisarNuevoReferido = referidosAviso.avisarNuevoReferido;

// ─────────────────────────────────────────────────────────────────
//  SYNAPTECH lead — captura inbound desde landing pública
//  (synaptechspa.cl/empieza, link de Instagram). Callable + trigger
//  email a Ignacio. Ver functions/synaptech-lead.js.
// ─────────────────────────────────────────────────────────────────
const synaptechLead = require('./synaptech-lead');
exports.synaptechCrearLead = synaptechLead.synaptechCrearLead;
exports.avisarNuevoLead    = synaptechLead.avisarNuevoLead;

// ─────────────────────────────────────────────────────────────────
//  BIOO — tracking de clicks por bloque (endpoint público para
//  navigator.sendBeacon desde u.html). Ver functions/bioo-track.js.
// ─────────────────────────────────────────────────────────────────
const biooTrack = require('./bioo-track');
exports.biooTrackClick = biooTrack.biooTrackClick;

// ─────────────────────────────────────────────────────────────────
//  BIOO — AI Bio Builder (Claude Sonnet tool use).
//  Callable autenticado que genera un bio completo desde un prompt
//  + nicho. Rate-limit 5/uid/día. Ver functions/bioo-ai-builder.js.
// ─────────────────────────────────────────────────────────────────
const biooAiBuilder = require('./bioo-ai-builder');
exports.biooAiGenerate = biooAiBuilder.biooAiGenerate;

// ─────────────────────────────────────────────────────────────────
//  SYNAPTECH SELF-SERVICE — aprovisionamiento automático de tenants
//  (producto masivo gratis en {slug}.synaptechspa.cl; el servicio a
//  medida sigue por el canal de leads). Ver functions/provision-tenant.js.
// ─────────────────────────────────────────────────────────────────
const provisionTenant = require('./provision-tenant');
exports.verificarSlugLibre     = provisionTenant.verificarSlugLibre;
exports.provisionarTenantSelf  = provisionTenant.provisionarTenantSelf;
