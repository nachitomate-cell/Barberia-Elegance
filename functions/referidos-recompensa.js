'use strict';

// functions/referidos-recompensa.js
// ─────────────────────────────────────────────────────────────────
//  RECOMPENSA AUTOMÁTICA POR REFERIDO (B2C)
//
//  Dispara cuando se CREA una cita. Si es la primera cita del cliente
//  Y el cliente se registró usando el `referralCode` de otro cliente,
//  otorga:
//    · Recompensa al REFERIDO (el que hizo la reserva)
//    · Recompensa al REFERIDOR (el que lo invitó)
//
//  Ambas recompensas se leen de tenants/{tid}/settings/general.referralProgram
//  con formato polimórfico:
//    { categoria: 'SELLOS'|'SERVICIO'|'PRODUCTO'|'DESCUENTO'|'OTRO',
//      textoDinamico: string, detalle: { ... } }
//
//  Materialización por categoría:
//    · SELLOS         → increment(cantidad) sobre sellosDisponibles + stamps
//    · SERVICIO/etc.  → crea doc `redemptions` con status:'pending'
//
//  Idempotencia: marca user.referralRewardsGranted=true al terminar.
//
//  Exports:
//    referidosRecompensaElegance  — trigger en /citas/{citaId}
//    referidosRecompensaTenant    — trigger en /tenants/{tid}/citas/{citaId}
//
//  DEPLOY:
//    firebase deploy --only functions:referidosRecompensaElegance,functions:referidosRecompensaTenant
// ─────────────────────────────────────────────────────────────────

const { onDocumentCreated }       = require('firebase-functions/v2/firestore');
const { logger }                  = require('firebase-functions');
const admin                       = require('firebase-admin');
const { FieldValue, Timestamp }   = require('firebase-admin/firestore');

const db = admin.firestore();

// ── Colecciones según tenant ──────────────────────────────────────
function colecciones(tenantId) {
  const isElegance = tenantId === 'elegance';
  return {
    users:        db.collection(isElegance ? 'users'        : `tenants/${tenantId}/users`),
    citas:        db.collection(isElegance ? 'citas'        : `tenants/${tenantId}/citas`),
    redemptions:  db.collection(isElegance ? 'redemptions'  : `tenants/${tenantId}/redemptions`),
    settingsRef:  db.doc       (isElegance ? 'settings/general' : `tenants/${tenantId}/settings/general`),
  };
}

// Cuenta las citas del user (excluye la actual). Si es 0 → es la primera.
// Ligero: proyecta solo el docId, sin traer campos.
async function esPrimeraCita({ citasCol, userId, citaIdActual }) {
  const snap = await citasCol
    .where('userId', '==', userId)
    .select() // no bajamos data, solo docIds
    .get();
  const otros = snap.docs.filter(d => d.id !== citaIdActual);
  return otros.length === 0;
}

// Otorga una recompensa polimórfica a un user. Si es SELLOS incrementa
// el balance; caso contrario crea un redemption pendiente (canjeable).
async function otorgar({ tenantId, users, redemptions, userId, recompensa, origen, motivo }) {
  if (!recompensa || !recompensa.categoria) return { ok: false, reason: 'sin-recompensa' };

  const { categoria, textoDinamico, detalle } = recompensa;

  if (categoria === 'SELLOS') {
    const cantidad = Number(detalle?.cantidad) || 0;
    if (cantidad <= 0) return { ok: false, reason: 'cantidad-invalida' };
    await users.doc(userId).set({
      // Escribimos AMBOS campos (nuevo + legacy) igual que sello-automatico.js
      sellosDisponibles: FieldValue.increment(cantidad),
      stamps:            FieldValue.increment(cantidad),
      // Historial: solo el "histórico" se acumula sin decrementarse al canjear.
      sellosHistoricos:  FieldValue.increment(cantidad),
      updatedAt:         FieldValue.serverTimestamp(),
    }, { merge: true });
    return { ok: true, tipo: 'sellos', cantidad };
  }

  // Categoría "premio" → crea redemption pendiente. El cliente lo verá
  // en su dashboard (sección "Tus recompensas por canjear") y lo presenta
  // en el local con QR/PIN. TTL 30 días para que no expire pronto.
  const token = String(Math.floor(1000 + Math.random() * 9000));
  const expiresMs = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 días

  const payload = {
    userId,
    prizeName:     textoDinamico || (recompensa.detalle?.nombre) || 'Recompensa',
    categoria,                   // SERVICIO | PRODUCTO | DESCUENTO | OTRO
    configuracion: detalle || {},// legacy compat (algunos lectores lo usan)
    detalle:       detalle || {},
    origen,                      // 'referral_referrer' | 'referral_referred'
    motivo:        motivo || null,
    costoSellos:   0,            // otorgada, no comprada con sellos
    token,
    status:        'pending',
    createdAt:     FieldValue.serverTimestamp(),
    expiresAt:     Timestamp.fromMillis(expiresMs),
  };
  const ref = await redemptions.add(payload);
  return { ok: true, tipo: 'redemption', id: ref.id };
}

// Busca al referidor por su referralCode dentro del tenant. Retorna su UID.
async function findReferidorUid({ users, referralCode }) {
  if (!referralCode) return null;
  const snap = await users.where('referralCode', '==', referralCode).limit(1).get();
  return snap.empty ? null : snap.docs[0].id;
}

// Núcleo compartido entre los dos exports (elegance root + multi-tenant).
async function procesarRecompensa({ tenantId, citaId, cita }) {
  const userId = cita?.userId;
  if (!userId) return { skip: 'sin-userId' };

  const { users, citas, redemptions, settingsRef } = colecciones(tenantId);

  // Idempotencia: si ya se otorgaron las recompensas, salir.
  const userSnap = await users.doc(userId).get();
  if (!userSnap.exists) return { skip: 'user-no-existe' };
  const userData = userSnap.data() || {};
  if (userData.referralRewardsGranted) return { skip: 'ya-otorgado' };

  // Debe haberse registrado con código.
  const referredByCode = userData.referredByCode;
  if (!referredByCode) return { skip: 'sin-referredByCode' };

  // Debe ser su primera cita (evita otorgar en la #2 si la #1 fue cancelada).
  const esPrimera = await esPrimeraCita({ citasCol: citas, userId, citaIdActual: citaId });
  if (!esPrimera) return { skip: 'no-es-primera-cita' };

  // Config del programa debe estar habilitada.
  const setSnap = await settingsRef.get();
  const rp = setSnap.exists ? (setSnap.data()?.referralProgram || {}) : {};
  if (!rp.enabled) return { skip: 'programa-deshabilitado' };

  const recRefdo   = rp.recompensaReferido  || null; // el que hizo la reserva
  const recRefdor  = rp.recompensaReferidor || null; // el que lo invitó
  if (!recRefdo && !recRefdor) return { skip: 'sin-recompensas-configuradas' };

  // Otorgar al REFERIDO (dueño de la cita).
  const resRefdo = recRefdo
    ? await otorgar({
        tenantId, users, redemptions, userId, recompensa: recRefdo,
        origen: 'referral_referred',
        motivo: `Bienvenida por usar código ${referredByCode}`,
      }).catch(err => ({ ok: false, reason: err.message }))
    : { ok: false, reason: 'no-configurada' };

  // Buscar y otorgar al REFERIDOR.
  const referidorUid = await findReferidorUid({ users, referralCode: referredByCode });
  const resRefdor = (recRefdor && referidorUid)
    ? await otorgar({
        tenantId, users, redemptions, userId: referidorUid, recompensa: recRefdor,
        origen: 'referral_referrer',
        motivo: `Tu amigo agendó su primer corte`,
      }).catch(err => ({ ok: false, reason: err.message }))
    : { ok: false, reason: referidorUid ? 'no-configurada' : 'referidor-no-encontrado' };

  // Marcar user como ya procesado para idempotencia estricta.
  await users.doc(userId).set({
    referralRewardsGranted:    true,
    referralRewardsGrantedAt:  FieldValue.serverTimestamp(),
    updatedAt:                 FieldValue.serverTimestamp(),
  }, { merge: true });

  logger.info(`[referidos-recompensa] ${tenantId}/${citaId}: refdo=${JSON.stringify(resRefdo)} refdor=${JSON.stringify(resRefdor)} referidor=${referidorUid}`);
  return { ok: true, resRefdo, resRefdor, referidorUid };
}

// ── Export 1: elegance root (/citas/{citaId}) ─────────────────────
exports.referidosRecompensaElegance = onDocumentCreated('citas/{citaId}', async (event) => {
  const citaId = event.params.citaId;
  const cita   = event.data?.data();
  if (!cita) return null;
  try {
    const res = await procesarRecompensa({ tenantId: 'elegance', citaId, cita });
    logger.info(`[referidos-recompensa] elegance/${citaId}: ${JSON.stringify(res)}`);
  } catch (err) {
    logger.error(`[referidos-recompensa] elegance/${citaId}: error inesperado`, err);
  }
  return null;
});

// ── Export 2: multi-tenant (/tenants/{tid}/citas/{citaId}) ────────
exports.referidosRecompensaTenant = onDocumentCreated(
  'tenants/{tid}/citas/{citaId}',
  async (event) => {
    const { tid, citaId } = event.params;
    const cita = event.data?.data();
    if (!cita) return null;
    try {
      const res = await procesarRecompensa({ tenantId: tid, citaId, cita });
      logger.info(`[referidos-recompensa] ${tid}/${citaId}: ${JSON.stringify(res)}`);
    } catch (err) {
      logger.error(`[referidos-recompensa] ${tid}/${citaId}: error inesperado`, err);
    }
    return null;
  },
);
