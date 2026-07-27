// _scan-fusiones-v2.mjs — Detector de docs duplicados post-diagnóstico Jordan+3.
//
// Mejoras vs v1:
//   1. Normaliza nombres correctamente (tildes/ñ) usando regex \p{Diacritic}.
//   2. Detecta uno-prefijo-del-otro (ej. "Osvaldo Vargas" ⊂ "Osvaldo Vargas Vergara").
//   3. Similitud de emails (distancia Levenshtein ≤ 2 ó igualdad post-normalizar tildes).
//   4. Ya no requiere ac↔auth: fusiona TAMBIÉN auth↔auth (caso Luciano Ornella).
//   5. Elige canonical (B) por más sellos históricos, tiebreaker por createdAt más antiguo.
//   6. Guard familia sigue vigente: solo fusiona si HAY señal fuerte de mismo humano.
//
// USO:
//   node _scan-fusiones-v2.mjs                # dry-run report
//   node _scan-fusiones-v2.mjs --apply

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const APPLY = process.argv.includes('--apply');
const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();

// Normaliza: minúsculas + quita tildes/diacríticos + colapsa espacios.
const norm = (s) => String(s || '')
  .normalize('NFD')
  .replace(/\p{Diacritic}/gu, '')
  .toLowerCase()
  .trim()
  .replace(/\s+/g, ' ');

// Edit distance Levenshtein simple (para emails cortos, O(n*m) OK).
function editDistance(a, b) {
  a = String(a); b = String(b);
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j-1], dp[i-1][j], dp[i][j-1]);
    }
  }
  return dp[m][n];
}

// Decisión de fusión: devuelve { fusionar, motivo }
function decidir(a, b) {
  const aN = norm(a.data.nombre);
  const bN = norm(b.data.nombre);
  const aE = norm(a.data.email || a.data.emailLower);
  const bE = norm(b.data.email || b.data.emailLower);

  if (aE && bE && aE === bE) return { fusionar: true, motivo: 'mismo email (normalizado)' };
  if (!aE || !bE)             return { fusionar: true, motivo: 'uno sin email' };
  if (aN && bN && aN === bN)  return { fusionar: true, motivo: 'mismo nombre exacto (normalizado)' };
  // Prefijo/sufijo: uno contiene al otro completamente al principio.
  if (aN && bN && (aN.startsWith(bN) || bN.startsWith(aN))) {
    return { fusionar: true, motivo: `un nombre extiende al otro ("${aN}" ↔ "${bN}")` };
  }
  // Emails con edit distance ≤ 2 (típico typos: .11 vs .131, extra letra)
  const dE = editDistance(aE, bE);
  if (dE <= 2) return { fusionar: true, motivo: `emails muy similares (edit=${dE})` };
  return { fusionar: false, motivo: `emails y nombres distintos (edit_email=${dE}) — posible familia` };
}

async function tenantIds() {
  const docs = await db.collection('tenants').listDocuments();
  return [...docs.map(d => d.id).sort(), 'elegance'];
}

console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
console.log(`║  SCAN v2 fusiones pendientes ${APPLY ? '⚠️  APPLY  ' : '(DRY-RUN)'}`);
console.log(`╚══════════════════════════════════════════════════════════════╝\n`);

const tenants = await tenantIds();
let totalPares = 0, totalFusionados = 0;

for (const tid of tenants) {
  const usersBase = tid === 'elegance' ? 'users' : `tenants/${tid}/users`;
  const snap = await db.collection(usersBase).get();

  // Agrupar por suf9. Solo docs sin fusionadoCon.
  const bySuf9 = new Map();
  for (const d of snap.docs) {
    const data = d.data();
    if (data.fusionadoCon) continue;
    const suf9 = data.telefonoSuf9;
    if (!suf9) continue;
    if (!bySuf9.has(suf9)) bySuf9.set(suf9, []);
    bySuf9.get(suf9).push({ id: d.id, data });
  }

  // Excluir QA fantasma en yugen (tel 983568212 con multi-personalidad).
  // Ver memoria project_qa_fantasma. NO tocar.
  const isFantasma = (docId) => docId === '2T8cPwontUOGbfKtDSbyW7vuTwy1';

  let paresTenant = [];
  for (const [suf9, docs] of bySuf9) {
    if (docs.length < 2) continue;
    // Filtrar QA fantasma.
    const validos = docs.filter(d => !isFantasma(d.id));
    if (validos.length < 2) continue;
    // Elegir B (canonical): más sellosHistoricos, tiebreaker createdAt ASC.
    const sorted = [...validos].sort((x, y) => {
      const sx = Number(x.data.sellosHistoricos ?? x.data.stamps ?? 0);
      const sy = Number(y.data.sellosHistoricos ?? y.data.stamps ?? 0);
      if (sy !== sx) return sy - sx;
      const cx = x.data.createdAt?.toMillis?.() || 0;
      const cy = y.data.createdAt?.toMillis?.() || 0;
      return cx - cy;
    });
    const b = sorted[0];
    for (let i = 1; i < sorted.length; i++) {
      const a = sorted[i];
      const decision = decidir(a, b);
      paresTenant.push({ suf9, a, b, decision });
    }
  }

  if (!paresTenant.length) continue;

  console.log(`── ${tid} — ${paresTenant.length} par(es) ──`);
  for (const p of paresTenant) {
    totalPares++;
    const flag = p.decision.fusionar ? '✅' : '⏭ ';
    const aTag = p.a.id.startsWith('ac_') ? 'ac ' : p.a.id.startsWith('+') ? 'lg+' : /^\d+$/.test(p.a.id) ? 'lgN' : 'auth';
    const bTag = p.b.id.startsWith('ac_') ? 'ac ' : p.b.id.startsWith('+') ? 'lg+' : /^\d+$/.test(p.b.id) ? 'lgN' : 'auth';
    console.log(`  ${flag} suf9=${p.suf9}`);
    console.log(`      A(${aTag}) ${p.a.id}  "${p.a.data.nombre || '?'}"  em="${p.a.data.email || '—'}"  sellos=${p.a.data.sellosDisponibles || 0}`);
    console.log(`      B(${bTag}) ${p.b.id}  "${p.b.data.nombre || '?'}"  em="${p.b.data.email || '—'}"  sellos=${p.b.data.sellosDisponibles || 0}`);
    console.log(`      → ${p.decision.motivo} ${p.decision.fusionar ? '' : '(NO)'}`);

    if (!APPLY || !p.decision.fusionar) continue;

    // ── Fusionar A → B ──
    const aRef = db.doc(`${usersBase}/${p.a.id}`);
    const bRef = db.doc(`${usersBase}/${p.b.id}`);

    // Reasignar citas de A al B.
    const citasCol = db.collection(tid === 'elegance' ? 'citas' : `tenants/${tid}/citas`);
    const qA = await citasCol.where('clienteUid', '==', p.a.id).get();
    const batch = db.batch();
    for (const cd of qA.docs) batch.update(cd.ref, {
      clienteUid: p.b.id, userId: p.b.id, userIdLegacy: p.a.id,
      fusionScanV2At: Timestamp.now(),
    });
    if (qA.size) await batch.commit();

    // Rescatar sellos de citas completadas de A cuyo citaId no esté ya en B.
    const bHist = Array.isArray(p.b.data.historialSellos) ? p.b.data.historialSellos : [];
    const bCitaIds = new Set(bHist.map(h => h.citaId).filter(Boolean));
    const rescatables = qA.docs.filter(d => {
      const c = d.data();
      return c.estado === 'Completada' && c.selloProcesado && !c.cortesia && !bCitaIds.has(d.id);
    });
    if (rescatables.length) {
      const entries = rescatables.map(d => ({
        fecha: Timestamp.now().toDate().toISOString(),
        tipo: 'suma', cantidad: 1,
        nota: `Fusión scan v2 · rescate cita ${d.id}`,
        citaId: d.id,
      }));
      await bRef.update({
        sellosDisponibles: FieldValue.increment(rescatables.length),
        sellosHistoricos:  FieldValue.increment(rescatables.length),
        stamps:            FieldValue.increment(rescatables.length),
        ultimoSello:       Timestamp.now().toDate().toISOString(),
        historialSellos:   FieldValue.arrayUnion(...entries),
      });
    }

    // Marcar A fusionado.
    await aRef.update({
      fusionadoCon: p.b.id,
      fusionadoEn:  Timestamp.now(),
      packsActivos: [],
      sellosDisponibles: 0, sellosHistoricos: 0, stamps: 0,
      historialSellos: [],
    });

    console.log(`      ✅ fusionado (+${rescatables.length} sellos, +${qA.size} cita(s))`);
    totalFusionados++;
  }
}

console.log(`\n─────────────────────────────────────────────`);
console.log(`Total pares detectados: ${totalPares}`);
if (APPLY) console.log(`Total fusionados:      ${totalFusionados}`);
else       console.log(`(dry-run) --apply para ejecutar`);
