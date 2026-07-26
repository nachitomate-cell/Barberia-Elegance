'use strict';

// ─────────────────────────────────────────────────────────────────
//  upsertCliente — single entry point para crear/reusar un cliente
//
//  Callable Cloud Function que UNIFICA la creación de clientes en
//  todos los puntos de entrada (agenda manual, registro club,
//  booking público, imports). Reemplaza el modelo "escribí y ya
//  aparecerá el CF dedupeOnCreate a fusionar después" por
//  "lookup canónico ANTES de escribir".
//
//  Beneficios:
//   - Cero duplicados nuevos (la única forma de crear un cliente es
//     pasando por este helper).
//   - Cero mirrors: escribe solo en `users`. La colección `clientes`
//     dejará de recibir escrituras en Fase 3 del plan.
//   - Cero race conditions relevantes: el peor caso son dos calls
//     simultáneos con mismo email creando dos docs; queda para el
//     cleanup one-shot resolverlo (raro).
//
//  Reglas de matching (en orden):
//   1. Email exacto (normalizado a lowercase trim).
//   2. Teléfono en múltiples variantes (+56, sin código, con espacios…).
//      - Si hay MÁS DE UN candidato por tel → ambiguo (familia/tel
//        compartido) → crear nuevo doc.
//      - Si hay UNO por tel Y ambos tienen email distinto → personas
//        distintas → crear nuevo doc.
//      - En caso contrario (uno sin email, o mismo email) → fusión.
//   3. Sin match → crear doc con Firestore auto-id.
//
//  Fusión (cuando hay match):
//   - Campos escalares (email/foto/authUid/cumple/telefono/nombre):
//     si target NO los tiene, copiar del payload.
//   - sellosHistoricos/Disponibles/stamps: MAX (no sumar → evita
//     doble conteo si el mismo humano tiene dos docs con sellos).
//   - ultimoSello: el más reciente.
//   - fechaRegistroOriginal: la del target si ya existe, sino la del
//     payload (preservamos la más antigua).
//
//  Response: { uid, wasCreated, wasMerged, matchedBy, targetHadEmail }
//
//  NO borra docs legacy — eso lo hace el cleanup one-shot de Fase 2.
//  Este CF solo devuelve el uid canónico para que la cita/registro
//  se linkee al doc correcto.
//
//  DEPLOY:
//    firebase deploy --only functions:upsertCliente
// ─────────────────────────────────────────────────────────────────

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger }             = require('firebase-functions');
const admin                  = require('firebase-admin');
const { FieldValue }         = require('firebase-admin/firestore');

const db = admin.firestore();

function colUsers(tenantId) {
  return tenantId === 'elegance'
    ? db.collection('users')
    : db.collection(`tenants/${tenantId}/users`);
}

// Norma canónica: últimos 9 dígitos (número nacional chileno sin código país).
// Sin esto, "+56 9 5964 6603" y "959646603" (mismo humano) quedaban con claves
// distintas. Móviles chilenos son 9 dígitos, code país +56.
function normPhone(t) {
  const d = (t || '').replace(/\D/g, '');
  if (!d) return '';
  return d.length > 9 ? d.slice(-9) : d;
}

// Devuelve TODAS las variantes razonables de un teléfono para hacer lookups
// robustos contra la data legacy que quedó con formatos inconsistentes.
function phoneVariants(rawPhone) {
  const variants = new Set();
  if (!rawPhone) return [];
  const raw  = String(rawPhone).trim();
  const norm = raw.replace(/\D/g, '');
  if (raw)  variants.add(raw);
  if (norm) {
    variants.add(norm);
    variants.add('+' + norm);
    // Chile: 56XXXXXXXXX ↔ XXXXXXXXX (móvil 9 dígitos + 56 país)
    if (norm.startsWith('56') && norm.length >= 10) {
      const sin56 = norm.slice(2);
      variants.add(sin56);
      variants.add('+' + sin56);
    }
    if (!norm.startsWith('56') && norm.length === 9) {
      variants.add('56' + norm);
      variants.add('+56' + norm);
    }
  }
  return [...variants].filter(Boolean);
}

// Descarta docs sin nombre (residuo del flujo anónimo antiguo) — mismo
// criterio que el hook useClubUsers del panel.
function tieneNombre(data) {
  return !!(data && (data.nombre || '').trim());
}

async function findByEmail(col, email) {
  if (!email) return [];
  const snap = await col.where('email', '==', email).limit(5).get();
  return snap.docs.filter(d => tieneNombre(d.data()));
}

// Match por telefono: prueba el campo `telefono` con cada variante, más
// lookup por docId (legacy tiene docId = tel). Deduplica por docId.
async function findByTel(col, telRaw) {
  const targetNorm = normPhone(telRaw);
  if (!targetNorm) return [];
  const variants = phoneVariants(telRaw);
  const results  = new Map();

  // Lookups en paralelo por campo
  const fieldPromises = variants.map(v =>
    col.where('telefono', '==', v).limit(5).get().catch(() => ({ docs: [] }))
  );
  const fieldSnaps = await Promise.all(fieldPromises);
  fieldSnaps.forEach(snap => {
    snap.docs.forEach(d => {
      if (!tieneNombre(d.data())) return;
      const dtel = normPhone(d.data().telefono);
      if (dtel === targetNorm) results.set(d.id, d);
    });
  });

  // Lookups por docId (legacy AgendaPro tenía id = telefono)
  const idPromises = variants.map(v => col.doc(v).get().catch(() => null));
  const idSnaps = await Promise.all(idPromises);
  idSnaps.forEach(snap => {
    if (!snap || !snap.exists) return;
    if (!tieneNombre(snap.data())) return;
    const dtel = normPhone(snap.data().telefono || snap.id);
    if (dtel === targetNorm) results.set(snap.id, snap);
  });

  return [...results.values()];
}

// Fusiona campos del `src` payload sobre el `dest` doc existente.
// Devuelve el objeto de update (solo los campos que cambian).
function calcularUpdate(destData, src) {
  const update = {};

  // Escalares: copiar si dest no tiene
  const escalares = ['email', 'photoURL', 'authUid', 'fechaNacimiento', 'cumpleDia', 'telefono', 'nombre'];
  escalares.forEach(k => {
    const dv = destData[k];
    const sv = src[k];
    if ((!dv || dv === '') && sv) update[k] = sv;
  });

  // Sellos: MAX (no sumar — evita doble conteo si el mismo humano vino
  // como dos docs con sellos)
  const dHist = Number(destData.sellosHistoricos ?? destData.stamps ?? 0);
  const sHist = Number(src.sellosHistoricos ?? src.stamps ?? 0);
  if (sHist > dHist) {
    update.sellosHistoricos = sHist;
    update.stamps           = sHist;
  }
  const dDisp = Number(destData.sellosDisponibles ?? destData.stamps ?? 0);
  const sDisp = Number(src.sellosDisponibles ?? src.stamps ?? 0);
  if (sDisp > dDisp) update.sellosDisponibles = sDisp;

  // ultimoSello: más reciente
  if (src.ultimoSello && (!destData.ultimoSello || src.ultimoSello > destData.ultimoSello)) {
    update.ultimoSello = src.ultimoSello;
  }

  // fechaRegistroOriginal: preservar la más antigua (si dest no tiene, usar src)
  if (src.fechaRegistroOriginal && !destData.fechaRegistroOriginal) {
    update.fechaRegistroOriginal = src.fechaRegistroOriginal;
  }

  // Marcadores de auditoría
  update.updatedAt = FieldValue.serverTimestamp();
  update.upsertedAt = FieldValue.serverTimestamp();

  return update;
}

// Fields del request que se pueden guardar como extras en el doc. Whitelist
// para no permitir que el caller escriba campos arbitrarios (como `role` o
// `esQA`) desde un booking público.
const EXTRA_FIELDS_WHITELIST = new Set([
  'photoURL', 'fechaNacimiento', 'cumpleDia', 'authUid',
  'fechaRegistroOriginal', 'importedFrom',
]);

// Handler puro (sin wrapper CF) — reutilizable desde tests y desde otros
// CFs que necesiten resolver un cliente sin pasar por la red. Recibe los
// mismos datos que el callable y devuelve el mismo shape. Tira HttpsError
// para que el wrapper propague códigos legibles al cliente.
async function upsertClienteCore(data = {}) {
  const email  = (data.email    || '').toLowerCase().trim();
  const telRaw = (data.telefono || '').trim();
  const nombre = (data.nombre   || '').trim();
  const tenantId = data.tenantId;

  // Validaciones
  if (!tenantId || typeof tenantId !== 'string') {
    throw new HttpsError('invalid-argument', 'tenantId requerido.');
  }
  if (!nombre) {
    throw new HttpsError('invalid-argument', 'nombre requerido.');
  }
  if (!email && !telRaw) {
    throw new HttpsError('invalid-argument', 'Se requiere al menos email o teléfono.');
  }

  // Extras whitelisted
  const extras = {};
  Object.keys(data).forEach(k => {
    if (EXTRA_FIELDS_WHITELIST.has(k) && data[k] != null && data[k] !== '') {
      extras[k] = data[k];
    }
  });

  const col = colUsers(tenantId);
  const payload = { nombre, email, telefono: telRaw, ...extras };

  // ── Lookup ──────────────────────────────────────────────────
  let matchedBy  = null;
  let candidates = [];

  // 1) Email exacto (identificador único humano)
  if (email) {
    candidates = await findByEmail(col, email);
    if (candidates.length) matchedBy = 'email';
  }

  // 2) Sin match por email → buscar por tel variants
  if (!candidates.length && telRaw) {
    const byTel = await findByTel(col, telRaw);

    if (byTel.length > 1) {
      // Ambiguo (familia / tel compartido) → crear nuevo
      matchedBy = 'tel-ambiguo';
    } else if (byTel.length === 1) {
      const other      = byTel[0].data();
      const otherEmail = (other.email || '').toLowerCase();
      // Regla híbrida: si ambos tienen email y son distintos, son
      // personas distintas que comparten tel → crear nuevo.
      if (email && otherEmail && email !== otherEmail) {
        matchedBy = 'tel-diff-email';
      } else {
        candidates = byTel;
        matchedBy  = 'tel';
      }
    }
  }

  // ── Sin match → CREATE ─────────────────────────────────────
  if (candidates.length === 0) {
    const newRef = col.doc(); // Firestore auto-id
    const createData = {
      nombre,
      email:    email  || '',
      telefono: telRaw || '',
      ...extras,
      createdAt:  FieldValue.serverTimestamp(),
      updatedAt:  FieldValue.serverTimestamp(),
      upsertedAt: FieldValue.serverTimestamp(),
    };
    await newRef.set(createData);
    logger.info(`[upsertCliente] ${tenantId}: CREATE ${newRef.id} nombre="${nombre}" email="${email}" tel="${telRaw}" matchedBy=${matchedBy || 'none'}`);
    return {
      uid:        newRef.id,
      wasCreated: true,
      wasMerged:  false,
      matchedBy:  matchedBy || null,
    };
  }

  // ── Match → MERGE en el target ──────────────────────────────
  const target     = candidates[0];
  const targetData = target.data();
  const update     = calcularUpdate(targetData, payload);
  const camposActualizados = Object.keys(update).filter(k => k !== 'updatedAt' && k !== 'upsertedAt');

  await target.ref.set(update, { merge: true });
  logger.info(`[upsertCliente] ${tenantId}: MERGE ${target.id} matchedBy=${matchedBy} campos=[${camposActualizados.join(',')}]`);
  return {
    uid:        target.id,
    wasCreated: false,
    wasMerged:  true,
    matchedBy,
    updatedFields: camposActualizados,
  };
}

exports.upsertCliente = onCall(
  { region: 'us-central1', cors: true },
  async (request) => {
    try {
      return await upsertClienteCore(request.data || {});
    } catch (err) {
      if (err instanceof HttpsError) throw err;
      logger.error('[upsertCliente] ERROR inesperado:', err);
      throw new HttpsError('internal', `Error interno: ${err.message}`);
    }
  }
);

// Export interno para tests locales que corren contra Firestore real sin
// pasar por la red. Usado por functions/_test-upsert-delnero.mjs.
exports._upsertClienteCore = upsertClienteCore;
