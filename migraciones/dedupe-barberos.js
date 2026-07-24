/**
 * dedupe-barberos.js
 *
 * Detecta y consolida documentos duplicados en `tenants/{tid}/barberos`
 * en TODOS los tenants (o el que se pase con `--tenant=`).
 *
 * ── Causas históricas que este script cubre ──────────────────────────
 *
 *   1) Link-docs SSO multi-email: docs con solo `{ _mainDocId }` que
 *      apuntan al principal. Se marcan como archivados (siempre — no
 *      son "personas" reales, son punteros de login).
 *
 *   2) Cuenta admin recreada con email nuevo: se hizo un doc nuevo sin
 *      borrar el viejo. Caso reportado 2026-07-23: Kronnos Limache
 *      tenía "Administración Limache" (nuevo, activo) y "Administrador
 *      Limache" (legacy, inactivo). Detectados por `authUid` idéntico
 *      o por `email` normalizado si el authUid falta en el legacy.
 *
 *   3) Docs sin authUid con mismo nombre (opt-in con `--include-name`):
 *      barberos importados desde AgendaPro/Weibook a veces quedaron dos
 *      veces por el mismo nombre. Requiere revisión humana → apagado
 *      por default.
 *
 * ── Qué hace ────────────────────────────────────────────────────────
 *
 *   · Elige un GANADOR por grupo: prefiere el que tenga authUid, sea
 *     activo, tenga foto, y sea el más recientemente actualizado.
 *   · Marca a los PERDEDORES como archivados: `_archived: true`,
 *     `activo: false`, `_archivedAt` (server ts), `_archivedReason`
 *     y `_mergedInto: <id ganador>`. NO los borra — quedan legibles
 *     por si alguna cita histórica los referencia por barberoId.
 *   · Actualiza `configuracion/main.opcionesAvanzadas.verWhatsAppBarberos`
 *     reemplazando el id perdedor por el id ganador (para que la
 *     whitelist "Ver WhatsApp del cliente" siga funcionando después
 *     del dedupe).
 *   · NO reasigna barberoId en citas históricas (blast radius grande;
 *     y como no las borra, las citas viejas siguen apuntando a un doc
 *     archivado válido — la agenda las sigue mostrando).
 *
 * ── Uso ─────────────────────────────────────────────────────────────
 *
 *   node migraciones/dedupe-barberos.js                      → DRY-RUN todos los tenants
 *   node migraciones/dedupe-barberos.js --tenant=kronnos_limache
 *   node migraciones/dedupe-barberos.js --include-name       → suma dedupe laxo por nombre
 *   node migraciones/dedupe-barberos.js --commit             → aplica cambios
 *
 *   Podés combinar: `--tenant=X --commit` para atacar uno primero.
 */

'use strict';

const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

const COMMIT        = process.argv.includes('--commit');
const INCLUDE_NAME  = process.argv.includes('--include-name');
const TENANT_FILTER = (process.argv.find(a => a.startsWith('--tenant=')) || '').split('=')[1] || null;

const SA_PATH = path.join(__dirname, '..', 'service-account.json');
let credential;
if (fs.existsSync(SA_PATH)) {
  credential = admin.credential.cert(JSON.parse(fs.readFileSync(SA_PATH, 'utf8')));
} else {
  credential = admin.credential.applicationDefault();
}
admin.initializeApp({ credential, projectId: 'barberia-elegance' });
const db = admin.firestore();
const FV = admin.firestore.FieldValue;

// ── Normalizadores ──────────────────────────────────────────────────
function normEmail(s) { return String(s || '').trim().toLowerCase(); }
function normNombre(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')  // sin acentos
    .replace(/\s+/g, ' ');
}
function tsToMillis(v) {
  if (!v) return 0;
  if (typeof v.toMillis === 'function') return v.toMillis();
  if (typeof v === 'number') return v;
  const t = Date.parse(v);
  return Number.isFinite(t) ? t : 0;
}

// ── Elegir ganador dentro de un grupo de dupes ──────────────────────
// Precedencia:
//   1) tiene authUid          (cuenta real de login)
//   2) activo !== false       (no está apagado)
//   3) tiene foto             (perfil completo)
//   4) updatedAt|createdAt más reciente
//   5) id lexicográficamente mayor (desempate estable)
function elegirGanador(grupo) {
  return [...grupo].sort((a, b) => {
    const aAuth = a.authUid ? 1 : 0, bAuth = b.authUid ? 1 : 0;
    if (aAuth !== bAuth) return bAuth - aAuth;
    const aAct = a.activo !== false ? 1 : 0, bAct = b.activo !== false ? 1 : 0;
    if (aAct !== bAct) return bAct - aAct;
    const aFoto = a.foto ? 1 : 0, bFoto = b.foto ? 1 : 0;
    if (aFoto !== bFoto) return bFoto - aFoto;
    const aTs = Math.max(tsToMillis(a.updatedAt), tsToMillis(a.createdAt), tsToMillis(a.creadoEn));
    const bTs = Math.max(tsToMillis(b.updatedAt), tsToMillis(b.createdAt), tsToMillis(b.creadoEn));
    if (aTs !== bTs) return bTs - aTs;
    return b.id.localeCompare(a.id);
  })[0];
}

// ── Detectar grupos de dupes dentro de una lista de barberos ────────
function detectarGrupos(barberos) {
  const grupos = [];
  const asignados = new Set(); // ids ya metidos en algún grupo

  // Los link-docs (_mainDocId) NO son duplicados reales — son punteros
  // del SSO multi-email que AuthContext lee al login (AuthContext.jsx:125).
  // Si los archivamos, potencialmente rompemos el mapeo uid→rol de los
  // barberos con múltiples correos. Los EXCLUÍMOS de todas las fases.
  // El dedupe visual en las listas ya está en Configuracion.jsx (patrón
  // documentado en feedback_dedupe_barberos.md).
  for (const b of barberos) {
    if (b._mainDocId) asignados.add(b.id);
  }
  // Los que ya fueron archivados por una corrida previa tampoco entran
  // (idempotencia: correr el script 2 veces no debe reportar los mismos).
  for (const b of barberos) {
    if (b._archived === true) asignados.add(b.id);
  }

  // Fase 2 — dedupe por authUid
  const porAuth = {};
  for (const b of barberos) {
    if (asignados.has(b.id)) continue;
    if (!b.authUid) continue;
    (porAuth[b.authUid] = porAuth[b.authUid] || []).push(b);
  }
  for (const [authUid, docs] of Object.entries(porAuth)) {
    if (docs.length < 2) continue;
    grupos.push({ razon: `authUid=${authUid}`, docs });
    docs.forEach(d => asignados.add(d.id));
  }

  // Fase 3 — dedupe por email normalizado (para los que no tenían authUid
  //          asignado al mismo grupo arriba)
  const porEmail = {};
  for (const b of barberos) {
    if (asignados.has(b.id)) continue;
    const em = normEmail(b.email);
    if (!em) continue;
    (porEmail[em] = porEmail[em] || []).push(b);
  }
  for (const [email, docs] of Object.entries(porEmail)) {
    if (docs.length < 2) continue;
    grupos.push({ razon: `email=${email}`, docs });
    docs.forEach(d => asignados.add(d.id));
  }

  // Fase 4 (opt-in) — dedupe por nombre normalizado
  if (INCLUDE_NAME) {
    const porNombre = {};
    for (const b of barberos) {
      if (asignados.has(b.id)) continue;
      const n = normNombre(b.nombre);
      if (!n) continue;
      (porNombre[n] = porNombre[n] || []).push(b);
    }
    for (const [nom, docs] of Object.entries(porNombre)) {
      if (docs.length < 2) continue;
      grupos.push({ razon: `nombre=${nom} (LAXO — revisar)`, docs });
      docs.forEach(d => asignados.add(d.id));
    }
  }

  return grupos;
}

// ── Procesar un tenant ──────────────────────────────────────────────
async function procesarTenant(tid) {
  const snap = await db.collection(`tenants/${tid}/barberos`).get();
  if (snap.empty) return null;

  const barberos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const grupos = detectarGrupos(barberos);
  if (grupos.length === 0) return { tid, total: barberos.length, grupos: 0, archivar: [] };

  // Preparar plan de archivado
  const archivar = [];
  for (const g of grupos) {
    const ganador = elegirGanador(g.docs);
    for (const d of g.docs) {
      if (d.id === ganador.id) continue;
      archivar.push({
        docId:      d.id,
        nombre:     d.nombre || '(sin nombre)',
        razon:      g.razon,
        mergedInto: ganador.id,
        ganadorNom: ganador.nombre || '(sin nombre)',
      });
    }
  }

  // Log del plan (siempre, dry-run o commit)
  console.log(`\n📁 tenants/${tid}/barberos  ·  ${barberos.length} docs  ·  ${grupos.length} grupo(s) de dupes  ·  ${archivar.length} para archivar`);
  for (const g of grupos) {
    const ganador = elegirGanador(g.docs);
    console.log(`   • ${g.razon}`);
    for (const d of g.docs) {
      const marcador = ganador && d.id === ganador.id ? '👑 GANADOR' : '❌ archivar';
      console.log(`       ${marcador}  ${d.id}  ·  ${d.nombre || '(sin nombre)'}  ${d.authUid ? `[auth ${d.authUid.slice(0,8)}…]` : '[sin auth]'}  ${d.activo === false ? '(inactivo)' : ''}`);
    }
  }

  if (!COMMIT) return { tid, total: barberos.length, grupos: grupos.length, archivar };

  // COMMIT — batchear escrituras
  let batch = db.batch();
  let ops = 0;
  const flush = async () => {
    if (ops === 0) return;
    await batch.commit();
    batch = db.batch();
    ops = 0;
  };

  const archivadosIds = new Set();
  for (const a of archivar) {
    const ref = db.doc(`tenants/${tid}/barberos/${a.docId}`);
    batch.update(ref, {
      _archived:       true,
      activo:          false,
      disponible:      false,
      _archivedAt:     FV.serverTimestamp(),
      _archivedReason: a.razon,
      _mergedInto:     a.mergedInto,
    });
    archivadosIds.add(a.docId);
    ops++;
    if (ops >= 400) await flush();
  }

  // Actualizar whitelist verWhatsAppBarberos en configuracion/main:
  // reemplazar ids archivados por su mergedInto (si no está ya en el array),
  // o simplemente quitarlos (si el ganador ya estaba en la whitelist).
  const cfgRef = db.doc(`tenants/${tid}/configuracion/main`);
  const cfgSnap = await cfgRef.get();
  if (cfgSnap.exists) {
    const cd = cfgSnap.data();
    const wl = Array.isArray(cd?.opcionesAvanzadas?.verWhatsAppBarberos)
      ? cd.opcionesAvanzadas.verWhatsAppBarberos.slice()
      : null;
    if (wl && wl.length) {
      const mapaArchivadoAGanador = {};
      for (const a of archivar) if (a.mergedInto) mapaArchivadoAGanador[a.docId] = a.mergedInto;
      const set = new Set();
      for (const id of wl) {
        if (mapaArchivadoAGanador[id]) set.add(mapaArchivadoAGanador[id]);
        else if (!archivadosIds.has(id)) set.add(id);
        // si es archivado sin mergedInto (link-doc apuntando a un main que
        // no está en la whitelist), se descarta silenciosamente.
      }
      const nueva = Array.from(set);
      const cambio = nueva.length !== wl.length || nueva.some((v, i) => v !== wl[i]);
      if (cambio) {
        batch.set(cfgRef, {
          opcionesAvanzadas: { verWhatsAppBarberos: nueva },
        }, { merge: true });
        ops++;
        console.log(`   🔄 whitelist Ver-WhatsApp actualizada: ${wl.length} → ${nueva.length}`);
      }
    }
  }

  await flush();
  return { tid, total: barberos.length, grupos: grupos.length, archivar };
}

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n${'═'.repeat(72)}`);
  console.log(`  DEDUPE BARBEROS  ·  ${COMMIT ? '🔴 COMMIT (escribe)' : '🟢 DRY-RUN (solo reporta)'}`);
  console.log(`  Filtro tenant: ${TENANT_FILTER || 'TODOS'}   Nombre laxo: ${INCLUDE_NAME ? 'sí' : 'no'}`);
  console.log(`${'═'.repeat(72)}`);

  // IMPORTANTE: usar listDocuments (no .get()) — los docs padre 'tenants/{id}'
  // no existen como docs, solo como paths. `.get()` devolvería vacío.
  const refs = await db.collection('tenants').listDocuments();
  let tenantIds = refs.map(r => r.id).sort();
  if (TENANT_FILTER) tenantIds = tenantIds.filter(t => t === TENANT_FILTER);

  console.log(`\nTenants a procesar: ${tenantIds.length}`);

  const totalRes = { tenants: 0, tenantesConDupes: 0, gruposDetectados: 0, docsAArchivar: 0 };
  for (const tid of tenantIds) {
    try {
      const res = await procesarTenant(tid);
      if (!res) continue;
      totalRes.tenants++;
      if (res.grupos > 0) {
        totalRes.tenantesConDupes++;
        totalRes.gruposDetectados += res.grupos;
        totalRes.docsAArchivar += res.archivar.length;
      }
    } catch (e) {
      console.error(`\n⚠️  Error procesando ${tid}:`, e.message);
    }
  }

  console.log(`\n${'═'.repeat(72)}`);
  console.log(`  RESUMEN`);
  console.log(`${'═'.repeat(72)}`);
  console.log(`  Tenants con barberos escaneados : ${totalRes.tenants}`);
  console.log(`  Tenants con duplicados          : ${totalRes.tenantesConDupes}`);
  console.log(`  Grupos de dupes detectados      : ${totalRes.gruposDetectados}`);
  console.log(`  Docs para archivar              : ${totalRes.docsAArchivar}`);
  if (!COMMIT && totalRes.docsAArchivar > 0) {
    console.log(`\n  → correr con --commit para aplicar los cambios.`);
    console.log(`  → agregar --tenant=X para atacar uno primero, o --include-name para dedupe laxo.\n`);
  }
  process.exit(0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
