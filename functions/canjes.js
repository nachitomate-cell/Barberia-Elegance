'use strict';

// functions/canjes.js
// ─────────────────────────────────────────────────────────────────
//  CANJES ATÓMICOS DE PREMIOS (Club de Fidelidad)
//
//  Antes: el cliente creaba el doc `redemptions` con status:'pending'
//  desde su dashboard y el descuento de sellos ocurría cuando el staff
//  aprobaba en el panel. Problema: hasta la aprobación, el cliente
//  podía generar N canjes con los mismos sellos ("canjear infinito").
//
//  Ahora: al canjear desde el dashboard, en una sola transacción:
//    1. Se valida saldo `sellosDisponibles ≥ costo`
//    2. Se descuentan sellos (sellosDisponibles + stamps + historial)
//    3. Se crea el redemption con status:'pending' + token + expiresAt
//
//  Al cancelar (cliente) o expirar (scheduled): se DEVUELVEN los sellos.
//
//  Exports (callables):
//    crearCanje        — cliente ejecuta al tocar "Generar QR"
//    cancelarCanje     — cliente ejecuta al cancelar antes que se use
//    liberarExpirados  — scheduled cada 15 min, cancela pendings vencidas
//
//  DEPLOY:
//    firebase deploy --only functions:crearCanje,functions:cancelarCanje,functions:liberarCanjesExpirados
// ─────────────────────────────────────────────────────────────────

const { onCall, HttpsError }     = require('firebase-functions/v2/https');
const { onSchedule }             = require('firebase-functions/v2/scheduler');
const { logger }                 = require('firebase-functions');
const admin                      = require('firebase-admin');
const { FieldValue, Timestamp }  = require('firebase-admin/firestore');

const db = admin.firestore();

// ── Colecciones según tenant (legacy elegance usa root) ──────────
function colecciones(tenantId) {
  const isElegance = tenantId === 'elegance';
  return {
    users:        db.collection(isElegance ? 'users'        : `tenants/${tenantId}/users`),
    premios:      db.collection(isElegance ? 'premios'      : `tenants/${tenantId}/premios`),
    redemptions:  db.collection(isElegance ? 'redemptions'  : `tenants/${tenantId}/redemptions`),
    settingsRef:  db.doc(isElegance ? 'settings/general' : `tenants/${tenantId}/settings/general`),
  };
}

// Lee el saldo con backward-compat: prefiere sellosDisponibles, fallback a stamps.
function saldoDe(userData) {
  const u = userData || {};
  const disp = u.sellosDisponibles;
  if (typeof disp === 'number' && !isNaN(disp)) return disp;
  const st = u.stamps;
  if (typeof st === 'number' && !isNaN(st)) return st;
  return 0;
}

// PIN aleatorio de 4 dígitos (mismo formato que el flujo cliente anterior).
function nuevoToken() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

// ─────────────────────────────────────────────────────────────────
//  1) crearCanje
//  Input:  { tenantId, prizeId, ttlMinutes? (default 15) }
//  Output: { redemptionId, token, expiresMs }
//  Errores: 'insufficient-stamps', 'not-found', 'unauthenticated'.
// ─────────────────────────────────────────────────────────────────
exports.crearCanje = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Inicia sesión para canjear.');

  const tenantId = String(req.data?.tenantId || '').trim();
  const prizeId  = String(req.data?.prizeId  || '').trim();
  const ttlMin   = Math.max(1, Math.min(60, parseInt(req.data?.ttlMinutes ?? 15, 10) || 15));

  if (!tenantId || !prizeId) {
    throw new HttpsError('invalid-argument', 'Faltan tenantId o prizeId.');
  }

  const uid = req.auth.uid;
  const { users, premios, redemptions, settingsRef } = colecciones(tenantId);

  const userRef  = users.doc(uid);
  const premioRef = premios.doc(prizeId);
  const redRef   = redemptions.doc(); // id auto-generado

  const token = nuevoToken();
  const now   = Date.now();
  const expiresMs = now + ttlMin * 60 * 1000;
  const expiresAt = Timestamp.fromMillis(expiresMs);

  try {
    await db.runTransaction(async (tx) => {
      // Validar toggle "autoservicio de canje" (panel Premios).
      // Default true — solo false explícito bloquea.
      const setSnap = await tx.get(settingsRef);
      const setData = setSnap.exists ? (setSnap.data() || {}) : {};
      if (setData.canjeClienteEnabled === false) {
        throw new HttpsError('permission-denied', 'El local desactivó el autoservicio de canje. Muéstrale el premio al staff.');
      }

      const [uSnap, pSnap] = await Promise.all([tx.get(userRef), tx.get(premioRef)]);
      if (!uSnap.exists) throw new HttpsError('not-found', 'Tu cuenta de club no existe.');
      if (!pSnap.exists) throw new HttpsError('not-found', 'Este premio ya no está disponible.');

      const uData = uSnap.data() || {};
      const pData = pSnap.data() || {};
      const costo = Number(pData.costoSellos) || 0;
      if (costo <= 0) throw new HttpsError('failed-precondition', 'Premio mal configurado (sin costo).');

      const disp = saldoDe(uData);
      if (disp < costo) {
        throw new HttpsError('failed-precondition', `Saldo insuficiente: tienes ${disp} y necesitas ${costo}.`);
      }

      // Descuento atómico. sellosDisponibles + stamps para compat con lectores
      // legacy (dashboard cliente prefiere sellosDisponibles, otros lugares
      // aún leen stamps).
      tx.update(userRef, {
        sellosDisponibles: FieldValue.increment(-costo),
        stamps:            FieldValue.increment(-costo),
        historialSellos:   FieldValue.arrayUnion({
          fecha:        new Date().toISOString(),
          tipo:         'canje-generado',
          cantidad:     -costo,
          nota:         `${pData.nombre || 'Premio'} — QR generado (pendiente aprobación)`,
          redemptionId: redRef.id,
          categoria:    pData.categoria || 'SERVICIO',
        }),
        updatedAt: FieldValue.serverTimestamp(),
      });

      tx.set(redRef, {
        userId:        uid,
        userName:      uData.nombre || uData.displayName || '',
        userEmail:     uData.email || req.auth.token?.email || '',
        prizeId,
        prizeName:     pData.nombre || 'Premio',
        categoria:     pData.categoria || 'SERVICIO',
        configuracion: pData.configuracion || {},
        costoSellos:   costo,
        token,
        status:        'pending',
        createdAt:     FieldValue.serverTimestamp(),
        expiresAt,
        // Marca importante: los sellos YA se descontaron. El staff al aprobar
        // NO debe descontar de nuevo. Este flag lo protege contra bugs.
        sellosCargados: true,
      });
    });

    logger.info(`[canjes] crearCanje OK tid=${tenantId} uid=${uid} prize=${prizeId} rid=${redRef.id}`);
    return { redemptionId: redRef.id, token, expiresMs };
  } catch (err) {
    if (err instanceof HttpsError) throw err;
    logger.error(`[canjes] crearCanje ERROR tid=${tenantId} uid=${uid}:`, err.message);
    throw new HttpsError('internal', err.message || 'No pudimos crear el canje.');
  }
});

// ─────────────────────────────────────────────────────────────────
//  2) cancelarCanje
//  Input:  { tenantId, redemptionId }
//  Output: { ok, refundedSellos }
//  Idempotente si ya está cancelada (retorna refundedSellos=0).
// ─────────────────────────────────────────────────────────────────
exports.cancelarCanje = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Inicia sesión.');

  const tenantId     = String(req.data?.tenantId     || '').trim();
  const redemptionId = String(req.data?.redemptionId || '').trim();

  if (!tenantId || !redemptionId) {
    throw new HttpsError('invalid-argument', 'Faltan tenantId o redemptionId.');
  }

  const uid = req.auth.uid;
  const { users, redemptions } = colecciones(tenantId);

  const redRef  = redemptions.doc(redemptionId);
  let refunded = 0;

  try {
    await db.runTransaction(async (tx) => {
      const rSnap = await tx.get(redRef);
      if (!rSnap.exists) throw new HttpsError('not-found', 'El canje no existe.');
      const r = rSnap.data();
      if (r.userId !== uid) throw new HttpsError('permission-denied', 'No es tu canje.');
      if (r.status === 'cancelled') return; // idempotente
      if (r.status !== 'pending') {
        throw new HttpsError('failed-precondition', `El canje ya está en estado "${r.status}" y no puede cancelarse.`);
      }

      const costo = Number(r.costoSellos) || 0;
      const debeReembolsar = r.sellosCargados === true && costo > 0;

      tx.update(redRef, {
        status:      'cancelled',
        cancelledAt: FieldValue.serverTimestamp(),
        cancelReason: req.data?.reason || 'user_cancel',
      });

      if (debeReembolsar) {
        refunded = costo;
        tx.update(users.doc(uid), {
          sellosDisponibles: FieldValue.increment(costo),
          stamps:            FieldValue.increment(costo),
          historialSellos:   FieldValue.arrayUnion({
            fecha:        new Date().toISOString(),
            tipo:         'canje-cancelado',
            cantidad:     costo,
            nota:         `${r.prizeName || 'Premio'} — canje cancelado, sellos devueltos`,
            redemptionId,
            categoria:    r.categoria || null,
          }),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    });

    logger.info(`[canjes] cancelarCanje OK tid=${tenantId} uid=${uid} rid=${redemptionId} refunded=${refunded}`);
    return { ok: true, refundedSellos: refunded };
  } catch (err) {
    if (err instanceof HttpsError) throw err;
    logger.error(`[canjes] cancelarCanje ERROR tid=${tenantId} uid=${uid} rid=${redemptionId}:`, err.message);
    throw new HttpsError('internal', err.message || 'No pudimos cancelar el canje.');
  }
});

// ─────────────────────────────────────────────────────────────────
//  3) liberarCanjesExpirados (scheduled)
//  Corre cada 15 min. Busca redemptions con status='pending' y
//  expiresAt < ahora, las cancela y devuelve los sellos.
//  Multi-tenant: escanea la lista de tenants activos.
// ─────────────────────────────────────────────────────────────────
async function tenantsActivos() {
  // Fuente: docs de _system que representan tenants. Filtrar por convención:
  // los que son "tenants reales" tienen un doc en _system con id != 'instagram_app'
  // y sin prefijo especial. Como fallback ligero, listamos las collections
  // dentro de tenants/. Aquí usamos _system.
  try {
    const snap = await db.collection('_system').get();
    const ids = [];
    snap.docs.forEach(d => {
      const id = d.id;
      // Excluye docs de configuración global (no son tenants)
      if (id.startsWith('instagram_')) return;
      if (['app_version', 'version', 'ping', 'ingresos'].includes(id)) return;
      ids.push(id);
    });
    // Siempre incluimos elegance (usa root, no aparece en _system como tenant)
    if (!ids.includes('elegance')) ids.push('elegance');
    return ids;
  } catch (e) {
    logger.warn('[canjes] tenantsActivos fallback:', e.message);
    return ['elegance'];
  }
}

async function liberarUnTenant(tenantId) {
  const { users, redemptions } = colecciones(tenantId);
  const nowTs = Timestamp.now();
  const snap = await redemptions
    .where('status', '==', 'pending')
    .where('expiresAt', '<', nowTs)
    .limit(200)
    .get();

  if (snap.empty) return { tenantId, cancelled: 0 };

  let cancelled = 0;
  for (const doc of snap.docs) {
    const r = doc.data();
    const costo = Number(r.costoSellos) || 0;
    const debeReembolsar = r.sellosCargados === true && costo > 0 && r.userId;

    try {
      await db.runTransaction(async (tx) => {
        const fresh = await tx.get(doc.ref);
        if (!fresh.exists) return;
        const fr = fresh.data();
        if (fr.status !== 'pending') return; // ya se procesó

        tx.update(doc.ref, {
          status:      'expired',
          cancelledAt: FieldValue.serverTimestamp(),
          cancelReason: 'auto_expired',
        });

        if (debeReembolsar) {
          tx.update(users.doc(r.userId), {
            sellosDisponibles: FieldValue.increment(costo),
            stamps:            FieldValue.increment(costo),
            historialSellos:   FieldValue.arrayUnion({
              fecha:        new Date().toISOString(),
              tipo:         'canje-expirado',
              cantidad:     costo,
              nota:         `${r.prizeName || 'Premio'} — canje expirado sin usar`,
              redemptionId: doc.id,
              categoria:    r.categoria || null,
            }),
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      });
      cancelled++;
    } catch (e) {
      logger.warn(`[canjes] no se pudo expirar rid=${doc.id} (${tenantId}):`, e.message);
    }
  }
  return { tenantId, cancelled };
}

exports.liberarCanjesExpirados = onSchedule(
  { schedule: 'every 15 minutes', region: 'us-central1' },
  async () => {
    const tenants = await tenantsActivos();
    const results = await Promise.allSettled(tenants.map(liberarUnTenant));
    const total = results.reduce((sum, r) => r.status === 'fulfilled' ? sum + (r.value?.cancelled || 0) : sum, 0);
    logger.info(`[canjes] liberarCanjesExpirados: total=${total} tenants=${tenants.length}`);
  },
);
