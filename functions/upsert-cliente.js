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
const crypto                 = require('crypto');

const db = admin.firestore();

function colUsers(tenantId) {
  return tenantId === 'elegance'
    ? db.collection('users')
    : db.collection(`tenants/${tenantId}/users`);
}

// Norma canónica: número nacional chileno de 9 dígitos, sin código de país.
// Sin esto, "+56 9 5964 6603" y "959646603" (mismo humano) quedaban con claves
// distintas. Móviles chilenos son 9 dígitos empezando en 9, code país +56.
//
// Repara además los dos errores de tipeo que MÁS duplicados generan, porque el
// id determinístico sale de acá y un dígito de más o de menos creaba una
// persona nueva en silencio (caso Saúl Horta en aura, 2026-07-28: tres perfiles
// del mismo humano, y el pack quedó pegado al equivocado):
//
//   · "78642173"     → le falta el 9 inicial; se teclean los 8 últimos.
//   · "+5678642173"  → mismo caso pero con código país, y como antes tomábamos
//                      los ÚLTIMOS 9 dígitos, el resultado ("678642173") se
//                      comía el 6 del +56 y parecía un número válido.
//
// Los números ya correctos devuelven EXACTAMENTE lo mismo que antes, así que
// ningún id determinístico existente se vuelve inalcanzable.
function normPhone(t) {
  let d = (t || '').replace(/\D/g, '');
  if (!d) return '';
  // Código país chileno adelante → nos quedamos con el número nacional.
  if (d.startsWith('56') && (d.length === 10 || d.length === 11)) d = d.slice(2);
  // Móvil al que le falta el 9 inicial.
  if (d.length === 8) d = '9' + d;
  return d.length > 9 ? d.slice(-9) : d;
}

// ¿El teléfono está bien escrito? Móvil chileno = 9 dígitos empezando en 9
// (con o sin +56 adelante). Se usa para desempatar cuando varios docs matchean.
function _esTelCanonico(t) {
  const d = String(t || '').replace(/\D/g, '');
  const nac = (d.startsWith('56') && (d.length === 10 || d.length === 11)) ? d.slice(2) : d;
  return nac.length === 9 && nac.startsWith('9');
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
    // Variantes del mismo número MAL escrito, para que un lookup con el número
    // correcto encuentre igual al doc que quedó guardado sin el 9 inicial (y
    // viceversa). Sin esto la query por campo `telefono` no lo veía nunca y se
    // creaba un duplicado.
    const nac = normPhone(rawPhone);              // 9 dígitos canónicos
    if (nac.length === 9 && nac.startsWith('9')) {
      const sin9 = nac.slice(1);                  // los 8 últimos
      variants.add(sin9);
      variants.add('+' + sin9);
      variants.add('56' + sin9);
      variants.add('+56' + sin9);
      variants.add(nac);
      variants.add('+56' + nac);
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
// Un "nombre" que parece un teléfono es data legacy sucia (ejemplo aura:
// user con email real cuyo campo nombre está seteado literalmente al tel
// "+14385182476"). Si aparece un nombre real en el payload, lo preferimos
// aunque el dest ya tenga ese "nombre-tel". Regex: empieza con dígito o '+',
// solo dígitos + separadores comunes, al menos 7 chars, cero letras.
const _pareceTel = (s) => typeof s === 'string'
  && /^[+\d][\d\s+\-()]{6,}$/.test(s.trim())
  && !/[a-z]/i.test(s);

function calcularUpdate(destData, src) {
  const update = {};

  // Escalares: copiar si dest no tiene O si dest tiene basura (ej: nombre
  // que en realidad es un teléfono). El caso nombre-tel se detectó en aura
  // post-backfill; sin esta lógica, users legacy quedaban con nombre=tel
  // aunque las nuevas citas trajeran el nombre real.
  const escalares = ['email', 'photoURL', 'authUid', 'fechaNacimiento', 'cumpleDia', 'telefono', 'nombre'];
  escalares.forEach(k => {
    const dv = destData[k];
    const sv = src[k];
    if (!sv) return;
    const dvVacio = !dv || dv === '';
    const nombreLegacyBasura = k === 'nombre' && !dvVacio && _pareceTel(dv);
    if (dvVacio || nombreLegacyBasura) update[k] = sv;
  });

  // Denormalizado: telefonoSuf9 = últimos 9 dígitos del tel actual. Se recalcula
  // desde el tel del update (si vino) o del dest. Necesario para linkLegacyTenant:
  // cuando un cliente se registra con email nuevo pero mismo tel que un walk-in
  // previo, la fusión se resuelve por este campo. Sin él, el walk-in queda huérfano.
  const telFinal = update.telefono || destData.telefono || '';
  if (telFinal) {
    const digs = String(telFinal).replace(/\D+/g, '');
    const suf9 = digs.length >= 9 ? digs.slice(-9) : '';
    if (suf9 && destData.telefonoSuf9 !== suf9) update.telefonoSuf9 = suf9;
  }

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

// Doc id determinístico basado en email (identificador único humano) o tel
// normalizado como fallback. Previene race conditions donde 2 requests
// concurrentes que no encuentran match creen 2 docs distintos: ambos
// calculan el mismo id, ambos hacen set() con merge, Firestore last-write-wins
// → 1 solo doc. Prefijo 'ac_' (auto-computed) distingue visualmente estos ids
// de los legacy (docId=tel puro) y de los Firebase Auth uids (28 chars).
function _determId(email, telNorm) {
  const key = email ? `e:${email}` : `t:${telNorm}`;
  return 'ac_' + crypto.createHash('sha1').update(key).digest('hex').slice(0, 18);
}

// Lookup puro (sin escrituras) — reusable por upsertClienteCore, por el
// trigger dedupeOnCreateTenant y por el guard client-side en registro.html.
// Aplica la regla híbrida: email exacto → siempre match; tel único con
// al menos uno sin email → match; tel ambiguo o emails distintos → no match.
//
// Params:
//   col   — CollectionReference de users del tenant
//   email — string normalizado (lowercase trim, puede ser '')
//   tel   — string raw (puede ser '')
//   opts.excludeDocId — string, si viene se excluye del match (útil para
//     evitar que un doc se matchee consigo mismo desde un trigger onCreate)
//
// Returns: { target: DocSnap|null, matchedBy: string|null }
//   matchedBy ∈ {null, 'email', 'tel', 'tel-ambiguo', 'tel-diff-email'}
async function resolveMatch(col, { email, telefono }, opts = {}) {
  const excludeId = opts.excludeDocId || null;
  let matchedBy   = null;
  let candidates  = [];

  if (email) {
    candidates = await findByEmail(col, email);
    if (excludeId) candidates = candidates.filter(d => d.id !== excludeId);
    if (candidates.length) matchedBy = 'email';
  }

  if (!candidates.length && telefono) {
    let byTel = await findByTel(col, telefono);
    if (excludeId) byTel = byTel.filter(d => d.id !== excludeId);

    if (byTel.length > 1) {
      // Con el normPhone reparador, un número correcto ahora también matchea al
      // doc que quedó guardado mal escrito. Eso son DOS matches del mismo humano,
      // y caer en 'tel-ambiguo' crearía un TERCER doc — la fábrica de duplicados
      // que estamos cerrando. Si exactamente uno tiene el teléfono bien escrito,
      // ese manda. Si hay varios canónicos sí es ambigüedad real (familia
      // compartiendo número) y no adivinamos, como antes.
      const canonicos = byTel.filter(d => _esTelCanonico(d.data().telefono));
      if (canonicos.length === 1) {
        candidates = canonicos;
        matchedBy  = 'tel-canonico';
      } else {
        matchedBy = 'tel-ambiguo';
      }
    } else if (byTel.length === 1) {
      const other      = byTel[0].data();
      const otherEmail = (other.email || '').toLowerCase();
      // Regla híbrida: emails distintos → personas distintas (familia).
      if (email && otherEmail && email !== otherEmail) {
        matchedBy = 'tel-diff-email';
      } else {
        candidates = byTel;
        matchedBy  = 'tel';
      }
    }
  }

  return {
    target:    candidates[0] || null,
    matchedBy: matchedBy,
  };
}

// Handler puro (sin wrapper CF) — reutilizable desde tests y desde otros
// CFs que necesiten resolver un cliente sin pasar por la red. Recibe los
// mismos datos que el callable y devuelve el mismo shape. Tira HttpsError
// para que el wrapper propague códigos legibles al cliente.
async function upsertClienteCore(data = {}) {
  const email  = (data.email    || '').toLowerCase().trim();
  const telRaw = (data.telefono || '').trim();
  const nombre = (data.nombre   || '').trim();
  const tenantId = data.tenantId;
  const dryRun   = data.dryRun === true;

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

  // ── Lookup (delegado a resolveMatch, mismo criterio que el trigger) ──
  const { target, matchedBy } = await resolveMatch(col, { email, telefono: telRaw });
  const candidates = target ? [target] : [];

  // ── Sin match → CREATE ─────────────────────────────────────
  if (candidates.length === 0) {
    if (dryRun) {
      // Preview: retorna qué HARÍA sin escribir. uid queda null porque
      // no hay doc real. El caller decide si proceder o abortar.
      return {
        uid:        null,
        wasCreated: false,
        wasMerged:  false,
        wouldCreate: true,
        wouldMerge:  false,
        matchedBy:  matchedBy || null,
        dryRun:     true,
      };
    }
    // Id determinístico (hash de email o tel) para inmunidad a race
    // conditions: dos ejecuciones concurrentes calculan el mismo id, ambas
    // hacen set() con merge → 1 solo doc. Ver _determId arriba.
    const finalId = _determId(email, normPhone(telRaw));
    const newRef  = col.doc(finalId);
    // Guard adicional: chequeamos si otra ejecución concurrente ya lo creó
    // en la ventana desde resolveMatch hasta ahora. Si sí, fusionamos en
    // vez de sobreescribir; garantiza que no perdamos datos del "otro lado".
    const existingSnap = await newRef.get();
    if (existingSnap.exists) {
      const existingData = existingSnap.data();
      const update = calcularUpdate(existingData, { nombre, email, telefono: telRaw, ...extras });
      const camposActualizados = Object.keys(update).filter(k => k !== 'updatedAt' && k !== 'upsertedAt');
      await newRef.set(update, { merge: true });
      logger.info(`[upsertCliente] ${tenantId}: MERGE ${finalId} (race-avoid) campos=[${camposActualizados.join(',')}]`);
      return {
        uid:        finalId,
        wasCreated: false,
        wasMerged:  true,
        matchedBy:  'concurrent-create',
        updatedFields: camposActualizados,
      };
    }
    const createData = {
      nombre,
      email:    email  || '',
      telefono: telRaw || '',
      // Sufijo de 9 dígitos denormalizado. Sin esto, linkLegacyTenant no
      // puede fusionar dos docs cuando el email es distinto y el tel viene
      // en formatos distintos ("+56 9 XXXX XXXX" vs "56XXXXXXXX").
      ...(telRaw ? (() => {
        const digs = String(telRaw).replace(/\D+/g, '');
        return digs.length >= 9 ? { telefonoSuf9: digs.slice(-9) } : {};
      })() : {}),
      ...extras,
      createdAt:  FieldValue.serverTimestamp(),
      updatedAt:  FieldValue.serverTimestamp(),
      upsertedAt: FieldValue.serverTimestamp(),
    };
    await newRef.set(createData);
    logger.info(`[upsertCliente] ${tenantId}: CREATE ${finalId} nombre="${nombre}" email="${email}" tel="${telRaw}" matchedBy=${matchedBy || 'none'}`);
    return {
      uid:        finalId,
      wasCreated: true,
      wasMerged:  false,
      matchedBy:  matchedBy || null,
    };
  }

  // ── Match → MERGE en el target ──────────────────────────────
  // (target ya viene resuelto de resolveMatch arriba)
  const targetData = target.data();
  const update     = calcularUpdate(targetData, payload);
  const camposActualizados = Object.keys(update).filter(k => k !== 'updatedAt' && k !== 'upsertedAt');

  if (dryRun) {
    // Preview del match sin escribir. Devolvemos el uid encontrado + los
    // campos que se fusionarían. El caller usa esto para decidir UX
    // (por ej: "ya tenés cuenta con este email → iniciá sesión").
    return {
      uid:              target.id,
      wasCreated:       false,
      wasMerged:        false,
      wouldCreate:      false,
      wouldMerge:       true,
      matchedBy,
      updatedFields:    camposActualizados,
      targetPreview: {
        nombre:   targetData.nombre   || '',
        email:    targetData.email    || '',
        telefono: targetData.telefono || '',
        sellosHistoricos: Number(targetData.sellosHistoricos ?? targetData.stamps ?? 0),
      },
      dryRun: true,
    };
  }

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

// Export interno para tests locales y para el trigger dedupeOnCreateTenant
// (misma regla de matching en ambos flujos: cero divergencia).
exports._upsertClienteCore = upsertClienteCore;
exports._resolveMatch      = resolveMatch;
exports._colUsers          = colUsers;
exports._calcularUpdate    = calcularUpdate;
exports._normPhone         = normPhone;
