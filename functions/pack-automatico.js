'use strict';

// functions/pack-automatico.js
// ─────────────────────────────────────────────────────────────────
//  MOTOR DE PACKS AL COMPLETAR CITA (server-side)
//
//  Antes vivía SOLO en el cliente (admin-panel/src/views/Agenda.jsx,
//  procesarPackDeCita). Eso significaba que el pack se activaba/descontaba
//  únicamente si la cita se completaba DESDE EL ADMIN. Si el barbero cerraba
//  su propia cita desde agenda.html —lo normal— el pack no pasaba nada, en
//  silencio. Este CF lo mueve al servidor: dispara al completar la cita venga
//  de donde venga.
//
//  Dispara cuando cita.estado pasa a 'completada'/'Completada':
//    · ACTIVACIÓN — el servicio es un pack (isPack) → crea el pack en
//      users/{uid}.packsActivos[] con N-1 sesiones (esta cita cuenta como 1).
//    · CONSUMO — la cita trae consumeSesionPack + packRefId (la reserva
//      pública la marca así) → descuenta una sesión del pack.
//
//  Idempotente en DOS capas:
//    1. packProcesado=true en la cita (evita re-ejecutar la función).
//    2. Dentro del array: citaActivacion===cita.id / citasConsumo.includes(id).
//  Esta segunda capa hace que sea SEGURO que convivan este CF y el viejo
//  motor del cliente durante la transición — el segundo en correr es no-op.
//
//  Exports:
//    packsElegance — trigger en /citas/{citaId}
//    packsTenant   — trigger en /tenants/{tid}/citas/{citaId}
//
//  DEPLOY:
//    firebase deploy --only functions:packsElegance,functions:packsTenant
// ─────────────────────────────────────────────────────────────────

const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { logger }            = require('firebase-functions');
const admin                 = require('firebase-admin');
const { FieldValue, Timestamp } = require('firebase-admin/firestore');
const marca                 = require('./lib/kronnos-marca');

const db = admin.firestore();

// ── Colecciones según tenant (marca-aware para Kronnos) ───────────
// users y packConsumos son marca-level (el saldo y su log viven en
// tenants/kronnos para todas las sedes). servicios y citas son per-sede.
function colecciones(tenantId) {
  const isElegance   = tenantId === 'elegance';
  const usersTid     = marca.marcaAwareTenant(tenantId, 'users');
  const packLogTid   = marca.marcaAwareTenant(tenantId, 'packConsumos');
  return {
    users:        db.collection(isElegance ? 'users'        : `tenants/${usersTid}/users`),
    packConsumos: db.collection(isElegance ? 'packConsumos' : `tenants/${packLogTid}/packConsumos`),
    servicios:    db.collection(isElegance ? 'servicios'    : `tenants/${tenantId}/servicios`),
    citas:        db.collection(isElegance ? 'citas'        : `tenants/${tenantId}/citas`),
  };
}

// ── Resuelve a qué doc de users pertenece la cita ─────────────────
// Espejo de resolverUserIdCita() del cliente. El último eslabón —el
// teléfono— es EL QUE FALTABA en el motor: los clientes creados desde el
// panel son "legacy" (doc users/{id} con id = teléfono solo-dígitos) y la
// cita les llega sin userId/clienteUid/clienteId. El docId es el teléfono en
// forma 11-dígitos (569XXXXXXXX), así que lo normalizamos igual que
// sanitizarTelefonoCL para que calce.
function resolverUserId(cita) {
  const directo = cita?.userId || cita?.clienteUid || cita?.clienteId;
  if (directo) return directo;
  const digs = String(cita?.clienteTelefono || '').replace(/\D/g, '');
  if (digs.length === 11 && digs.startsWith('56')) return digs; // 569XXXXXXXX
  if (digs.length === 9) return `56${digs}`;                    // 9XXXXXXXX → 569XXXXXXXX
  return digs.length >= 11 ? digs : '';
}

// ── Guard: solo la transición a completada, una sola vez ──────────
function debesProcesar(before, after) {
  if (!after) return false; // doc eliminado
  const antes   = (before?.estado || '').toLowerCase();
  const despues = (after.estado   || '').toLowerCase();
  if (despues !== 'completada') return false;   // no es completada
  if (antes   === 'completada') return false;   // ya estaba completada
  if (after.packProcesado === true) return false; // idempotencia (silencioso)
  return true;
}

// Marca la cita como procesada aunque no haya pack, para no re-ejecutar la
// función en cada escritura futura del doc.
async function marcarProcesada(citaRef, citaId, scope = '') {
  try { await citaRef.update({ packProcesado: true }); }
  catch (e) { logger.error(`[Pack] ${citaId}${scope}: no se pudo marcar packProcesado:`, e); }
}

// ── Núcleo: activa o consume el pack de una cita ──────────────────
async function procesarPack({ tenantId, citaId, citaRef, cita }) {
  const cols = colecciones(tenantId);

  // El servicio decide si es activación. El cliente lo tenía en memoria; acá
  // se lee del doc (per-sede).
  let servicio = null;
  if (cita.servicioId) {
    const s = await cols.servicios.doc(cita.servicioId).get();
    if (s.exists) servicio = { id: s.id, ...s.data() };
  }

  const esActivacion = !!(servicio && servicio.isPack);
  const esConsumo    = !!cita.consumeSesionPack && !!cita.packRefId;

  if (!esActivacion && !esConsumo) {
    // Cita normal: nada que hacer, pero marcamos para no re-evaluar.
    await marcarProcesada(citaRef, citaId, ` (${tenantId})`);
    return;
  }

  const userId = resolverUserId(cita);
  if (!userId) {
    logger.warn(`[Pack] ${citaId} (${tenantId}): sin userId/teléfono resoluble, no se acredita.`);
    await marcarProcesada(citaRef, citaId, ` (${tenantId})`);
    return;
  }

  // Snapshot de nombres de los servicios cubiertos (para activación): congela
  // el catálogo al momento de activar, así el pack sigue legible si luego
  // renombran/borran un servicio.
  let idsCubiertos = [];
  let snapshot = [];
  if (esActivacion) {
    idsCubiertos = Array.isArray(servicio.serviciosIncluidos) ? servicio.serviciosIncluidos : [];
    const docs = await Promise.all(
      idsCubiertos.map(id => cols.servicios.doc(id).get().catch(() => null)),
    );
    snapshot = idsCubiertos.map((id, i) => ({
      id,
      nombre: (docs[i] && docs[i].exists) ? (docs[i].data().nombre || id) : id,
    }));
  }

  const barbNombre = cita.barberoNombre || '';
  const logBase = {
    userId,
    clienteNombre:       cita.clienteNombre || '',
    clienteTelefonoSuf9: cita.clienteTelefonoSuf9 || cita.telefonoSuf9 || '',
    citaId:              citaId,
    citaFecha:           cita.fecha || '',
    citaHora:            cita.hora || '',
    barberoId:           cita.barberoId || '',
    barberoNombre:       barbNombre,
    servicioId:          cita.servicioId || (servicio && servicio.id) || '',
    servicioNombre:      cita.servicioNombre || (servicio && servicio.nombre) || '',
    sedeId:              tenantId || '',
    origen:              'cf', // se procesó en el server (vs el motor viejo del cliente)
    createdAt:           FieldValue.serverTimestamp(),
  };

  const userRef = cols.users.doc(userId);
  const logRef  = cols.packConsumos.doc();

  // La tx devuelve los campos a denormalizar en la cita (badge), o null si no
  // hubo cambio (user sin doc / pack sin saldo / ya procesado en el array).
  const denorm = await db.runTransaction(async (tx) => {
    const uSnap = await tx.get(userRef);
    if (!uSnap.exists) return null; // cliente sin doc de users → no aplica
    const packs = Array.isArray(uSnap.data().packsActivos) ? [...uSnap.data().packsActivos] : [];
    const now = Date.now();
    let logPayload = null;
    let denormFields = null;

    if (esActivacion) {
      if (packs.some(p => p.citaActivacion === citaId)) return null; // ya activado por esta cita
      const totalSes = Math.max(1, Number(servicio.sesionesTotales) || 1);
      const dias     = Math.max(1, Number(servicio.diasValidez)     || 30);
      const nuevoPack = {
        packId:            servicio.id,
        nombrePack:        servicio.nombre,
        sesionesTotales:   totalSes,
        sesionesRestantes: Math.max(0, totalSes - 1), // esta cita cuenta como 1
        fechaCompra:       Timestamp.fromMillis(now),
        fechaVencimiento:  Timestamp.fromMillis(now + dias * 24 * 60 * 60 * 1000),
        citaActivacion:    citaId,
        serviciosIncluidos:          idsCubiertos,
        serviciosIncluidosSnapshot:  snapshot,
      };
      packs.push(nuevoPack);
      logPayload = {
        ...logBase, tipo: 'activacion',
        packId: nuevoPack.packId, packNombre: nuevoPack.nombrePack,
        sesionesTotales: totalSes, sesionesAntes: totalSes,
        sesionesDespues: nuevoPack.sesionesRestantes,
        fechaVencimiento: nuevoPack.fechaVencimiento,
      };
      denormFields = {
        esActivacionPack:     true,
        packNombre:           servicio.nombre || null,
        packSesionIndex:      1,
        packSesionTotal:      totalSes,
        packFechaVencimiento: nuevoPack.fechaVencimiento,
      };
    }

    if (esConsumo) {
      const idx = packs.findIndex(p =>
        p.packId === cita.packRefId &&
        (p.sesionesRestantes || 0) > 0 &&
        (!p.fechaVencimiento || (p.fechaVencimiento.toMillis?.() || 0) > now));
      if (idx === -1) return null; // sin pack / sin saldo / expirado
      if (Array.isArray(packs[idx].citasConsumo) && packs[idx].citasConsumo.includes(citaId)) return null; // ya consumida
      const antes   = packs[idx].sesionesRestantes || 0;
      const despues = Math.max(0, antes - 1);
      packs[idx] = {
        ...packs[idx],
        sesionesRestantes: despues,
        citasConsumo: [...(packs[idx].citasConsumo || []), citaId],
        ultimoConsumo: Timestamp.fromMillis(now),
      };
      logPayload = {
        ...logBase, tipo: 'consumo',
        packId: packs[idx].packId, packNombre: packs[idx].nombrePack,
        sesionesTotales: packs[idx].sesionesTotales || 0,
        sesionesAntes: antes, sesionesDespues: despues,
        fechaVencimiento: packs[idx].fechaVencimiento || null,
      };
      // El vencimiento en la cita solo si no lo trae ya (denormalización tardía).
      if (packs[idx].fechaVencimiento && !cita.packFechaVencimiento) {
        denormFields = { packFechaVencimiento: packs[idx].fechaVencimiento };
      }
    }

    tx.update(userRef, { packsActivos: packs, updatedAt: FieldValue.serverTimestamp() });
    if (logPayload) tx.set(logRef, logPayload);
    return denormFields;
  });

  // Una sola escritura a la cita, siempre: los campos del badge (si hubo) +
  // packProcesado. Si la tx no hizo nada, igual marcamos procesada.
  await citaRef.update({ ...(denorm || {}), packProcesado: true });
}

// ── Export 1: elegance root (/citas/{citaId}) ─────────────────────
exports.packsElegance = onDocumentWritten('citas/{citaId}', async (event) => {
  const citaId = event.params.citaId;
  const before = event.data?.before?.data();
  const after  = event.data?.after?.data();
  if (!debesProcesar(before, after)) return null;
  try {
    await procesarPack({ tenantId: 'elegance', citaId, citaRef: event.data.after.ref, cita: after });
  } catch (err) {
    logger.error(`[Pack] ${citaId}: error inesperado:`, err);
    // No marcamos procesada en error: que reintente en la próxima escritura.
  }
  return null;
});

// ── Export 2: multi-tenant (/tenants/{tid}/citas/{citaId}) ────────
exports.packsTenant = onDocumentWritten('tenants/{tid}/citas/{citaId}', async (event) => {
  const { tid, citaId } = event.params;
  const before = event.data?.before?.data();
  const after  = event.data?.after?.data();
  if (!debesProcesar(before, after)) return null;
  try {
    await procesarPack({ tenantId: tid, citaId, citaRef: event.data.after.ref, cita: after });
  } catch (err) {
    logger.error(`[Pack] ${citaId} (${tid}): error inesperado:`, err);
  }
  return null;
});
