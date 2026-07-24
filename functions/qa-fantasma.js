// ══════════════════════════════════════════════════════════════════
//  QA FANTASMA — barbero invisible del superadmin para QA cross-tenant
//
//  Objetivo: que ignaciiio.mate@gmail.com pueda entrar a agenda.html /
//  barbero.html en cualquier local y ver la vista del barbero, sin
//  aparecer en dropdowns públicos ni en las listas del panel del dueño.
//
//  Modelo:
//    _superadmin/qaBarbero               ← config maestra (nombre, horario, activo)
//    tenants/{tid}/barberos/{ignacioUid} ← espejo por tenant con esQA:true
//    barberos/{ignacioUid} (elegance)    ← mismo, en la colección raíz legacy
//
//  Sync:
//    - Callable `sincronizarQaFantasma`  ← botón manual desde /admin
//    - Trigger onWrite `_superadmin/qaBarbero`  ← re-sync automático al editar
//
//  Invisibilidad: filtro `esQA===true` en las vistas (agenda.html público,
//  Equipo.jsx, Agenda.jsx del panel). El superadmin las ve; el resto no.
// ══════════════════════════════════════════════════════════════════

const { onCall, HttpsError }                     = require('firebase-functions/v2/https');
const { onDocumentWritten, onDocumentCreated }   = require('firebase-functions/v2/firestore');
const { logger }                                 = require('firebase-functions');
const admin                                      = require('firebase-admin');

const SUPERADMIN_EMAIL = 'ignaciiio.mate@gmail.com';
const QA_DOC_ID_LEGACY = 'qaSuperadmin'; // fallback si aún no resolvió el UID
const MASTER_PATH      = '_superadmin/qaBarbero';

// Cache en memoria del UID del superadmin (se hidrata al primer call). Evita
// martillar admin.auth().getUserByEmail() en cada sync.
let _superadminUidCache = null;
async function resolveSuperadminUid() {
  if (_superadminUidCache) return _superadminUidCache;
  const u = await admin.auth().getUserByEmail(SUPERADMIN_EMAIL);
  _superadminUidCache = u.uid;
  return u.uid;
}

/**
 * Payload por tenant que se escribe en cada `barberos/{superadminUid}`.
 * Reusa las mismas claves que un barbero normal para que agenda.html no
 * necesite código especial más allá del filtro `esQA` en las vistas
 * públicas. `authUid` = UID real → los flujos que buscan barbero por UID
 * lo encuentran al iniciar sesión.
 */
function buildBarberoDoc(uid, cfg, tenantId) {
  return {
    // Identidad
    authUid:       uid,
    email:         SUPERADMIN_EMAIL,
    nombre:        cfg.nombre || 'QA · Superadmin',
    avatar:        cfg.avatar || '',
    // Rol como barbero para que la vista privada lo trate como uno más.
    rol:           'barbero',
    activo:        cfg.activo !== false,
    disponible:    cfg.activo !== false,
    // Horario simple aplicado como default de trabajo (los que quieran
    // testear un horario específico del tenant, ese manda por sucursal).
    horario:       cfg.horario || defaultHorario(),
    // Flags de aislamiento
    esQA:          true,           // FILTRO PRINCIPAL en TODAS las vistas
    _managedBy:    'qaFantasma',   // marca de origen para debug/limpieza
    _tenantId:     tenantId,       // útil en logs
    // Timestamps
    updatedAt:     admin.firestore.FieldValue.serverTimestamp(),
    // No seteamos comisiones, ni tarifas, ni sucursalId — se hereda del tenant.
  };
}

function defaultHorario() {
  // 09:00-20:00 lun-sáb, domingo cerrado. Formato compatible con el que
  // usa el resto del panel (barbero.horario en el config del barbero).
  const dia = (activo, inicio = '09:00', fin = '20:00') => ({ activo, inicio, fin });
  return {
    0: dia(false),        // dom
    1: dia(true),         // lun
    2: dia(true),
    3: dia(true),
    4: dia(true),
    5: dia(true),
    6: dia(true, '10:00', '18:00'), // sáb más corto
  };
}

/**
 * Núcleo del sync: itera TODOS los tenants (usando listDocuments porque
 * `tenants/{id}` puede no existir como doc padre — ver memoria) y upsert
 * el espejo. También cubre la colección raíz `/barberos` para elegance
 * (misma dualidad que migrarClaimsExistentes).
 *
 * Si `cfg.activo === false`, elimina los espejos en vez de escribirlos.
 */
async function ejecutarSync(cfg) {
  const db  = admin.firestore();
  const uid = await resolveSuperadminUid();

  const activo = cfg.activo !== false;
  const results = { activo, tenants: [], errores: [] };

  async function apply(ref, tid) {
    try {
      if (activo) {
        await ref.set(buildBarberoDoc(uid, cfg, tid), { merge: true });
        results.tenants.push({ tid, action: 'upsert' });
      } else {
        // Solo borra si existe — evita crear tombstones innecesarios.
        const snap = await ref.get();
        if (snap.exists) {
          await ref.delete();
          results.tenants.push({ tid, action: 'delete' });
        }
      }
    } catch (err) {
      logger.error(`[QA] error en ${tid}:`, err.message);
      results.errores.push({ tid, error: err.message });
    }
  }

  // Elegance: colección raíz /barberos (idéntico patrón que otros sync).
  await apply(db.collection('barberos').doc(uid), 'elegance');

  // Multi-tenant vía listDocuments (nunca .get() a tenants — memoria).
  const tenantRefs = await db.collection('tenants').listDocuments();
  for (const tenantRef of tenantRefs) {
    await apply(tenantRef.collection('barberos').doc(uid), tenantRef.id);
  }

  return results;
}

// ─── Callable: botón manual desde /admin ─────────────────────────
exports.sincronizarQaFantasma = onCall({ region: 'us-central1', cors: true }, async (request) => {
  const email = (request.auth?.token?.email || '').toLowerCase();
  if (email !== SUPERADMIN_EMAIL) {
    throw new HttpsError('permission-denied', 'Solo el superadmin puede sincronizar el QA fantasma.');
  }

  const db  = admin.firestore();
  // Lee la config actual del maestro. Si el cliente mandó override, gana.
  const masterSnap = await db.doc(MASTER_PATH).get();
  const stored = masterSnap.exists ? (masterSnap.data() || {}) : {};
  const cfg = Object.assign({}, stored, request.data || {});

  // Si vino override en request.data, persistirlo en el maestro para que
  // el próximo trigger onWrite tenga la fuente de verdad.
  if (request.data && Object.keys(request.data).length > 0) {
    await db.doc(MASTER_PATH).set({
      ...cfg,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: email,
    }, { merge: true });
  }

  const result = await ejecutarSync(cfg);
  logger.info(`[QA] sync manual by ${email}: activo=${result.activo}, tenants=${result.tenants.length}, errores=${result.errores.length}`);
  return { ok: true, ...result };
});

// ─── Helper exportado: provisionar en UN tenant (hook para provision-tenant) ──
// Se llama al terminar `provisionarTenantSelf` / `provisionarTenantAdmin` para
// que un tenant recién nacido ya venga con el fantasma listo. Silencioso: no
// levanta si el maestro no está activo o no existe (no hay nada que espejar).
exports.provisionarQaEnTenant = async function (tenantId) {
  if (!tenantId) return { skipped: 'no-tenant' };
  const db = admin.firestore();
  const masterSnap = await db.doc(MASTER_PATH).get();
  if (!masterSnap.exists) return { skipped: 'no-master' };
  const cfg = masterSnap.data() || {};
  if (cfg.activo === false) return { skipped: 'inactive' };
  try {
    const uid = await resolveSuperadminUid();
    const ref = tenantId === 'elegance'
      ? db.collection('barberos').doc(uid)
      : db.collection('tenants').doc(tenantId).collection('barberos').doc(uid);
    await ref.set(buildBarberoDoc(uid, cfg, tenantId), { merge: true });
    logger.info(`[QA] provisionado en tenant nuevo ${tenantId}`);
    return { ok: true, tenantId };
  } catch (err) {
    logger.error(`[QA] provision en ${tenantId} falló:`, err.message);
    return { ok: false, error: err.message };
  }
};

// ─── Trigger: marca cita creada por el fantasma con origenQA:true ───
// Cualquier cita del fantasma (agenda.html manual, booking público, etc.) queda
// con origenQA:true → los agregadores del panel filtran esas para no ensuciar
// métricas/ventas/comisiones del dueño real.
//
// Nota: se dispara post-write; hay una ventana chica (~500ms) donde una cita
// del fantasma aparece "sin marca". Vistas que consumen en tiempo real la
// verán aparecer y desaparecer una vez. Aceptable dado el volumen (~5 citas/día
// del QA en su peor caso).
async function _marcarCitaSiFantasma(citaRef, data) {
  try {
    const barberoId = data && data.barberoId;
    if (!barberoId || data.origenQA === true) return; // ya marcada o sin barbero
    // Descubrí el tenant desde el path del doc de cita para leer el barbero
    // correcto — evita confundir root /barberos con tenants/*/barberos.
    const parts = citaRef.path.split('/');
    const barberoRef = (parts[0] === 'tenants')
      ? admin.firestore().collection('tenants').doc(parts[1]).collection('barberos').doc(barberoId)
      : admin.firestore().collection('barberos').doc(barberoId);
    const bSnap = await barberoRef.get();
    if (!bSnap.exists) return;
    if (bSnap.data().esQA !== true) return;
    await citaRef.set({ origenQA: true }, { merge: true });
    logger.info(`[QA] cita marcada origenQA=${citaRef.path}`);
  } catch (err) {
    logger.error('[QA] marcarCitaSiFantasma:', err.message);
  }
}

exports.marcarCitaQaElegance = onDocumentCreated(
  { document: 'citas/{citaId}', region: 'us-central1' },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;
    await _marcarCitaSiFantasma(event.data.ref, data);
  }
);

exports.marcarCitaQaTenant = onDocumentCreated(
  { document: 'tenants/{tid}/citas/{citaId}', region: 'us-central1' },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;
    await _marcarCitaSiFantasma(event.data.ref, data);
  }
);

// ─── Trigger: re-sync automático al editar el maestro ────────────
// Si Ignacio cambia el horario / nombre / activo desde /admin (que
// escribe directo al doc), este trigger propaga a todos los tenants
// sin necesidad de llamar el callable a mano.
exports.qaFantasmaOnMasterWrite = onDocumentWritten(
  { document: '_superadmin/qaBarbero', region: 'us-central1' },
  async (event) => {
    const after = event.data?.after?.data();
    if (!after) {
      // Borrado del maestro: no re-sync (deja los espejos como estén,
      // Ignacio puede volver a crearlo si lo necesita).
      logger.info('[QA] maestro borrado, no propago');
      return;
    }
    try {
      const result = await ejecutarSync(after);
      logger.info(`[QA] trigger onMasterWrite: activo=${result.activo}, tenants=${result.tenants.length}, errores=${result.errores.length}`);
    } catch (err) {
      logger.error('[QA] trigger onMasterWrite falló:', err);
    }
  }
);
