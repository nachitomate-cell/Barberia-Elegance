// Cleanup one-shot de duplicados legacy — Fase 2 del plan.
//
// USO:
//   node _cleanup-duplicados.mjs --tenant=delnero              # dry-run (default)
//   node _cleanup-duplicados.mjs --tenant=delnero --apply      # ejecuta cambios
//   node _cleanup-duplicados.mjs --tenant=aura --apply --limit=200
//
// ARGS:
//   --tenant=<id>    (obligatorio)
//   --apply          (opt-in; sin él se hace dry-run)
//   --limit=<n>      (opt; max ops a ejecutar en una corrida, default 400)
//   --backup-dir=<p> (opt; default _snapshots/backups/)
//
// REGLAS DE FUSIÓN (misma lógica que el trigger dedupeOnCreate):
//   1. Grupos por email exacto → keeper = más antiguo por createdAt o
//      fechaRegistroOriginal. Fusiona sellos como MAX (idempotente), une
//      historialSellos por concatenación deduplicada, borra los otros y
//      sus mirrors en clientes/.
//   2. Grupos por tel normalizado + al menos uno SIN email → mismo trato.
//   3. Grupos por tel + TODOS con email distinto → skip (familia), marca
//      _needsReview:true en cada doc para revisión humana futura.
//   4. Migración walk-in-only: docs en clientes/ sin match en users/ →
//      crear users/{auto-id} con datos + copiar historialSellos si tiene.
//   5. Reasignación de citas: al borrar un doc, todas las citas apuntando
//      a su uid se reapuntan al keeper (clienteUid, userId, clienteId).
//
// BACKUP:
//   SIEMPRE (dry-run también). Dump JSON completo de users/ + clientes/
//   antes de tocar nada, más las citas afectadas para poder revertir.
//
// SAFETY:
//   · Firestore batch limit = 500 ops. Paginamos en chunks de 400.
//   · No borra si el keeper no existe / no tiene datos válidos.
//   · Log estructurado en consola; el JSON del backup queda para auditar.

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

// ── Args ─────────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith('--'))
    .map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }),
);
const TENANT = args.tenant;
const APPLY  = args.apply === true;
const LIMIT  = Number.isFinite(Number(args.limit)) ? Number(args.limit) : 400;
const BACKUP_DIR = args['backup-dir'] || '_snapshots/backups';
if (!TENANT) {
  console.error('ERROR: --tenant=<id> es obligatorio.');
  process.exit(1);
}

const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();

const usersColRef    = TENANT === 'elegance' ? db.collection('users')    : db.collection(`tenants/${TENANT}/users`);
const clientesColRef = TENANT === 'elegance' ? db.collection('clientes') : db.collection(`tenants/${TENANT}/clientes`);
const citasColRef    = TENANT === 'elegance' ? db.collection('citas')    : db.collection(`tenants/${TENANT}/citas`);

// ── Helpers ─────────────────────────────────────────────────────────
const normPhone = (t) => { const d = (t || '').replace(/\D/g, ''); return d.length > 9 ? d.slice(-9) : d; };
const normEmail = (e) => (e || '').toLowerCase().trim();

// Prefiere el más antiguo por (fechaRegistroOriginal | createdAt | creadoEn),
// con fallback al docId lexicográfico (estable, no aleatorio).
function elegirKeeper(docs) {
  return [...docs].sort((a, b) => {
    const ta = _antig(a.data());
    const tb = _antig(b.data());
    if (ta !== tb) return ta - tb;
    return String(a.id).localeCompare(String(b.id));
  })[0];
}
function _antig(d) {
  const p = d?.fechaRegistroOriginal;
  if (typeof p === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(p)) {
    const [dd, mm, yyyy] = p.split('/');
    return new Date(`${yyyy}-${mm}-${dd}`).getTime();
  }
  const ts = d?.createdAt?.toDate?.() || d?.creadoEn?.toDate?.();
  return ts ? ts.getTime() : Number.MAX_SAFE_INTEGER;
}

// Fusiona datos del "descartado" en el keeper (para mostrar plan / ejecutar).
// Devuelve solo los campos que cambiarían en el keeper (idempotente).
function calcMerge(keeperData, otros) {
  const upd = {};
  const escalares = ['email', 'telefono', 'photoURL', 'authUid', 'fechaNacimiento', 'cumpleDia', 'fechaRegistroOriginal', 'importedFrom'];
  escalares.forEach(k => {
    if ((!keeperData[k] || keeperData[k] === '') ) {
      const src = otros.find(o => o.data()[k]);
      if (src) upd[k] = src.data()[k];
    }
  });
  // Sellos: MAX de todos los docs (keeper + descartados)
  const allDocs = [{ data: () => keeperData }, ...otros];
  const maxHist = Math.max(...allDocs.map(d => Number(d.data().sellosHistoricos ?? d.data().stamps ?? 0)));
  const maxDisp = Math.max(...allDocs.map(d => Number(d.data().sellosDisponibles ?? d.data().stamps ?? 0)));
  const currHist = Number(keeperData.sellosHistoricos ?? keeperData.stamps ?? 0);
  const currDisp = Number(keeperData.sellosDisponibles ?? keeperData.stamps ?? 0);
  if (maxHist > currHist) { upd.sellosHistoricos = maxHist; upd.stamps = maxHist; }
  if (maxDisp > currDisp) { upd.sellosDisponibles = maxDisp; }
  // ultimoSello: más reciente
  const ultimos = allDocs.map(d => d.data().ultimoSello).filter(Boolean).sort();
  const maxUlt = ultimos[ultimos.length - 1];
  if (maxUlt && (!keeperData.ultimoSello || maxUlt > keeperData.ultimoSello)) upd.ultimoSello = maxUlt;
  return upd;
}

// ── Empezamos ────────────────────────────────────────────────────────
const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const backupPath = join(BACKUP_DIR, `${TENANT}-${ts}`);
if (!existsSync(backupPath)) mkdirSync(backupPath, { recursive: true });

console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
console.log(`║  CLEANUP DUPLICADOS — tenant "${TENANT}"                          `);
console.log(`║  Modo: ${APPLY ? 'APPLY (ejecuta cambios)' : 'DRY-RUN (solo plan)'}         `);
console.log(`║  Backup: ${backupPath}                                              `);
console.log(`╚══════════════════════════════════════════════════════════════╝\n`);

// ── 1. Snapshot + backup ────────────────────────────────────────────
console.log('[1/5] Backup de users/ y clientes/ ...');
const [usersSnap, clientesSnap] = await Promise.all([
  usersColRef.get(),
  clientesColRef.get(),
]);
const users    = usersSnap.docs.map(d => ({ id: d.id, ref: d.ref, data: () => d.data() }));
const clientes = clientesSnap.docs.map(d => ({ id: d.id, ref: d.ref, data: () => d.data() }));

writeFileSync(join(backupPath, 'users.json'), JSON.stringify(users.map(u => ({ id: u.id, ...u.data() })), null, 2));
writeFileSync(join(backupPath, 'clientes.json'), JSON.stringify(clientes.map(c => ({ id: c.id, ...c.data() })), null, 2));
console.log(`      ✓ ${users.length} users + ${clientes.length} clientes guardados en ${backupPath}\n`);

// Filtro: solo users con nombre no vacío (residuos anónimos se ignoran).
const usersConNombre = users.filter(u => (u.data().nombre || '').trim());

// ── 2. Grupos por email exacto ───────────────────────────────────────
console.log('[2/5] Agrupando por email exacto ...');
const porEmail = new Map();
usersConNombre.forEach(u => {
  const em = normEmail(u.data().email);
  if (!em) return;
  if (!porEmail.has(em)) porEmail.set(em, []);
  porEmail.get(em).push(u);
});
const gruposEmail = [...porEmail.entries()].filter(([_, g]) => g.length > 1);
console.log(`      Grupos duplicados por email: ${gruposEmail.length}\n`);

// ── 3. Grupos por tel normalizado (excluyendo los ya en gruposEmail) ─
const idsEnEmailGroups = new Set();
gruposEmail.forEach(([_, g]) => g.forEach(u => idsEnEmailGroups.add(u.id)));

const porTel = new Map();
usersConNombre.forEach(u => {
  if (idsEnEmailGroups.has(u.id)) return;
  const t = normPhone(u.data().telefono);
  if (!t) return;
  if (!porTel.has(t)) porTel.set(t, []);
  porTel.get(t).push(u);
});
const gruposTel = [...porTel.entries()].filter(([_, g]) => g.length > 1);

// Clasificar grupos-tel: fusionar SOLO si hay a lo sumo 1 email único
// distinto en el grupo. Con 2+ emails únicos distintos = personas distintas
// aunque haya otros docs sin email (los sin-email podrían ser cualquiera de
// las personas, no podemos asumir a cuál pertenecen).
//
// Ejemplos:
//   · 2 docs: A(email1) + B(sin email)               → 1 único → FUSIONAR (mismo humano)
//   · 2 docs: A(email1) + B(email1)                  → 1 único → FUSIONAR
//   · 2 docs: A(email1) + B(email2)                  → 2 únicos → SKIP FAMILIA
//   · 3 docs: A(email1) + B(email2) + C(sin email)   → 2 únicos → SKIP FAMILIA (fix vs bug pre-aura)
//   · 3 docs: A(sin) + B(sin) + C(sin)               → 0 únicos → FUSIONAR
//
// GUARD ANTI-PLACEHOLDER (2 criterios, cualquiera activa el skip):
//
//  A) Grupo grande — ≥5 docs con nombres distintos: casi seguro es el tel
//     de la barbería usado como placeholder para walk-ins sin tel real.
//     Detectado en oren: 78 personas al mismo tel.
//
//  B) Tel evidentemente placeholder — patrones típicos: "999999999",
//     "000000000", 8+ dígitos iguales, secuencias "123456789". Aplica
//     aunque el grupo sea pequeño (2-4). Detectado en oren:
//     "999999999" con 4 personas distintas colapsándose en "CLIENTE GENERICO".
//
// En ambos casos: SKIP + _reviewReason:posible-placeholder-tel.
const PLACEHOLDER_TEL_THRESHOLD = 5;
function _esTelPlaceholder(tel) {
  if (!tel || tel.length < 8) return false;
  // Todo el mismo dígito: 99999999, 00000000, 11111111...
  if (/^(\d)\1{7,}$/.test(tel)) return true;
  // Empieza con "99999" o "00000" (5+ del mismo dígito al inicio)
  if (/^([09])\1{4,}/.test(tel)) return true;
  // Secuencia ascendente/descendente completa (123456789, 987654321)
  if (tel === '123456789' || tel === '987654321') return true;
  return false;
}
// GUARD ADICIONAL — Umbral estricto de fusión por tel: solo grupos de
// EXACTAMENTE 2 docs. Con 3+ personas al mismo tel la probabilidad de que
// sean el mismo humano baja mucho; es más común que sean familia,
// placeholder oculto, o casos ambiguos. Prefiero perder algunos casos
// legítimos (ej: Sebastián Marrodan x3 en oren, que sí es el mismo humano)
// y dejarlos como _needsReview, que fusionar 4 personas distintas por
// accidente en el mismo doc (ej: tel=972833955 con 4 humanos distintos).
// El humano revisa el _needsReview y decide fusionar a mano si aplica.
const FUSION_MAX_GROUP_SIZE = 2;

const gruposTelFusion   = [];
const gruposTelFamilia  = [];
const gruposPlaceholder = [];
gruposTel.forEach(([tel, g]) => {
  const nombresUnicos = new Set(g.map(u => (u.data().nombre || '').trim().toLowerCase()).filter(Boolean));
  const grupoGrande = g.length >= PLACEHOLDER_TEL_THRESHOLD && nombresUnicos.size >= PLACEHOLDER_TEL_THRESHOLD;
  const telSospechoso = _esTelPlaceholder(tel) && nombresUnicos.size >= 2;
  if (grupoGrande || telSospechoso) {
    gruposPlaceholder.push([tel, g]);
    return;
  }
  const emailsUnicos = new Set(g.map(u => normEmail(u.data().email)).filter(Boolean));
  const grupoChico = g.length <= FUSION_MAX_GROUP_SIZE;
  if (emailsUnicos.size <= 1 && grupoChico) {
    gruposTelFusion.push([tel, g]);
  } else {
    gruposTelFamilia.push([tel, g]);
  }
});
console.log(`[3/5] Grupos por tel: ${gruposTel.length} total`);
console.log(`      · A fusionar (0-1 email único): ${gruposTelFusion.length}`);
console.log(`      · Familia (skip + _needsReview): ${gruposTelFamilia.length}`);
console.log(`      · PLACEHOLDER (≥${PLACEHOLDER_TEL_THRESHOLD} personas · skip + _needsReview): ${gruposPlaceholder.length}\n`);

// ── 4. Walk-ins en clientes/ sin match en users/ ─────────────────────
console.log('[4/5] Buscando walk-ins de clientes/ sin match en users/ ...');
const userEmails = new Set(usersConNombre.map(u => normEmail(u.data().email)).filter(Boolean));
const userTels   = new Set(usersConNombre.map(u => normPhone(u.data().telefono)).filter(Boolean));
const walkins = clientes.filter(c => {
  const cn = (c.data().nombre || '').trim();
  if (!cn) return false;
  const em = normEmail(c.data().email);
  const t  = normPhone(c.data().telefono || c.id);
  if (em && userEmails.has(em)) return false;
  if (t  && userTels.has(t))    return false;
  return true;
});
console.log(`      Walk-ins a migrar: ${walkins.length}\n`);

// ── 5. Ejecutar (o simular) ──────────────────────────────────────────
console.log(`[5/5] ${APPLY ? 'Ejecutando' : 'Simulando'} plan (limit=${LIMIT} ops)...\n`);

let opsUsed = 0;
const log = { fusiones: [], skipFamilia: [], skipPlaceholder: [], migraciones: [], reasignaciones: 0, errores: [] };

async function procesarGrupoFusion(razon, grupo) {
  if (opsUsed >= LIMIT) return;
  const keeper = elegirKeeper(grupo);
  const descartados = grupo.filter(u => u.id !== keeper.id);
  const upd = calcMerge(keeper.data(), descartados);

  // Contar ops necesarias: 1 update keeper + N deletes + Q reasignaciones citas + M deletes clientes/
  const telefonosLegacy = [...new Set(descartados.flatMap(d => [d.data().telefono, d.id]).map(normPhone).filter(Boolean))];

  // Buscar citas apuntando a los descartados
  const citasReasign = [];
  for (const d of descartados) {
    const [byCli, byUsr] = await Promise.all([
      citasColRef.where('clienteUid', '==', d.id).limit(500).get().catch(() => ({ docs: [] })),
      citasColRef.where('userId',     '==', d.id).limit(500).get().catch(() => ({ docs: [] })),
    ]);
    const seen = new Set();
    [...byCli.docs, ...byUsr.docs].forEach(cd => {
      if (!seen.has(cd.ref.path)) { seen.add(cd.ref.path); citasReasign.push(cd); }
    });
  }

  const opsCount = 1 + descartados.length + telefonosLegacy.length + citasReasign.length;
  if (opsUsed + opsCount > LIMIT) {
    console.log(`      · SKIP (excede limit): ${razon} · ${grupo.length} docs, requiere ${opsCount} ops`);
    return;
  }

  const entry = {
    razon,
    keeperId: keeper.id,
    descartadosIds: descartados.map(d => d.id),
    fields: Object.keys(upd),
    telefonosLegacyBorrados: telefonosLegacy,
    citasReasignadas: citasReasign.length,
  };
  log.fusiones.push(entry);
  console.log(`      · FUSION ${razon}: keeper=${keeper.id}  descarta=[${descartados.map(d => d.id).join(',')}]  citas=${citasReasign.length}`);

  if (APPLY) {
    const batch = db.batch();
    batch.set(keeper.ref, { ...upd, dedupedAt: new Date(), correccionCleanupFase2: true }, { merge: true });
    citasReasign.forEach(cd => batch.update(cd.ref, { clienteUid: keeper.id, userId: keeper.id }));
    descartados.forEach(d => batch.delete(d.ref));
    telefonosLegacy.forEach(t => batch.delete(clientesColRef.doc(t)));
    try {
      await batch.commit();
      log.reasignaciones += citasReasign.length;
    } catch (e) {
      log.errores.push({ razon, error: e.message });
      console.error(`        ERROR: ${e.message}`);
    }
  }
  opsUsed += opsCount;
}

async function procesarSkipFamilia(tel, grupo) {
  const entry = { tel, ids: grupo.map(u => u.id), nombres: grupo.map(u => u.data().nombre) };
  log.skipFamilia.push(entry);
  console.log(`      · SKIP FAMILIA tel=${tel}: ${grupo.length} personas (${grupo.map(u => u.data().nombre).join(' | ')})`);
  if (APPLY) {
    const batch = db.batch();
    grupo.forEach(u => batch.update(u.ref, { _needsReview: true, _reviewReason: 'tel-compartido' }));
    try { await batch.commit(); } catch (e) { log.errores.push({ tel, error: e.message }); }
    opsUsed += grupo.length;
  }
}

async function procesarPlaceholder(tel, grupo) {
  const entry = { tel, count: grupo.length, sampleNombres: grupo.slice(0, 5).map(u => u.data().nombre) };
  log.skipPlaceholder.push(entry);
  console.log(`      · SKIP PLACEHOLDER tel=${tel}: ${grupo.length} personas (probable tel de la barbería o "999...", muestras: ${entry.sampleNombres.join(', ')}...)`);
  if (APPLY) {
    // Chunks de 400 para no exceder batch cap (500).
    for (let i = 0; i < grupo.length; i += 400) {
      const batch = db.batch();
      grupo.slice(i, i + 400).forEach(u => batch.update(u.ref, {
        _needsReview: true,
        _reviewReason: 'posible-placeholder-tel',
      }));
      try { await batch.commit(); } catch (e) { log.errores.push({ tel, error: e.message }); break; }
    }
    opsUsed += grupo.length;
  }
}

async function procesarWalkin(c) {
  if (opsUsed >= LIMIT) return;
  const data = c.data();
  const entry = { walkinId: c.id, nombre: data.nombre, tel: data.telefono, email: data.email };
  log.migraciones.push(entry);
  console.log(`      · MIGRA walk-in ${c.id} → users/{auto} · "${data.nombre}"`);
  if (APPLY) {
    const newRef = usersColRef.doc();
    try {
      await newRef.set({
        nombre:            data.nombre || '',
        email:             data.email || '',
        telefono:          data.telefono || '',
        sellosHistoricos:  Number(data.sellosHistoricos || data.stamps || 0),
        sellosDisponibles: Number(data.sellosDisponibles || data.stamps || 0),
        stamps:            Number(data.stamps || 0),
        importedFrom:      data.importedFrom || 'clientes-walkin',
        migradoDeClientes: true,
        migradoAt:         new Date(),
      });
    } catch (e) { log.errores.push({ walkin: c.id, error: e.message }); }
    opsUsed += 1;
  }
}

for (const [email, g] of gruposEmail)       await procesarGrupoFusion(`email=${email}`, g);
for (const [tel,   g] of gruposTelFusion)   await procesarGrupoFusion(`tel=${tel}`,     g);
for (const [tel,   g] of gruposTelFamilia)  await procesarSkipFamilia(tel, g);
for (const [tel,   g] of gruposPlaceholder) await procesarPlaceholder(tel, g);
for (const c         of walkins)             await procesarWalkin(c);

// ── Resumen final + guardar log ─────────────────────────────────────
const summary = {
  tenant: TENANT,
  timestamp: ts,
  mode: APPLY ? 'apply' : 'dry-run',
  users_scan: users.length,
  clientes_scan: clientes.length,
  fusiones_total: log.fusiones.length,
  fusiones_email: log.fusiones.filter(f => f.razon.startsWith('email=')).length,
  fusiones_tel:   log.fusiones.filter(f => f.razon.startsWith('tel=')).length,
  skip_familia: log.skipFamilia.length,
  skip_placeholder: log.skipPlaceholder.length,
  users_marcados_placeholder: log.skipPlaceholder.reduce((s, e) => s + e.count, 0),
  migraciones_walkin: log.migraciones.length,
  citas_reasignadas: log.reasignaciones,
  errores: log.errores.length,
  ops_used: opsUsed,
  ops_limit: LIMIT,
  backup_path: backupPath,
};
writeFileSync(join(backupPath, 'plan.json'), JSON.stringify({ summary, log }, null, 2));

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║  RESUMEN                                                      ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
Object.entries(summary).forEach(([k, v]) => console.log(`  ${k.padEnd(20)}: ${v}`));
if (log.errores.length) {
  console.log('\n  ERRORES:');
  log.errores.forEach(e => console.log(`   · ${JSON.stringify(e)}`));
}
console.log(`\n  Log detallado en: ${backupPath}/plan.json`);
if (!APPLY) console.log(`\n  Para EJECUTAR: agregá --apply al comando.`);
process.exit(log.errores.length ? 1 : 0);
