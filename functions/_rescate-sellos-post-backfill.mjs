// _rescate-sellos-post-backfill.mjs
// Post backfill de citas huérfanas, cada cita ahora tiene clienteUid pero
// el sello NO se sumó automáticamente (la CF sellosTenant solo dispara en
// onDocumentWritten del cambio de estado, no re-dispara para docs viejos).
//
// Este script barre citas completadas de cada tenant y para cada una:
//  1. Si tiene clienteUid y su citaId NO está en user.historialSellos → suma
//     sello (+1 disp, +1 hist, +1 stamp, +1 entrada historial) y marca la cita
//     con selloProcesado=true.
//  2. Skip: cortesías, citas ya en el historial, citas cuyo user no existe.
//
// Idempotente: la clave es citaId en historialSellos. Correr N veces = mismo
// resultado que 1 vez.
//
// USO:
//   node _rescate-sellos-post-backfill.mjs                   # dry-run todos
//   node _rescate-sellos-post-backfill.mjs --tenant=lumen    # dry-run uno
//   node _rescate-sellos-post-backfill.mjs --apply           # ejecuta

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const args = Object.fromEntries(
  process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);
const APPLY = args.apply === true;
const ONLY  = args.tenant || null;

const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();

async function tenantIds() {
  const docs = await db.collection('tenants').listDocuments();
  return ONLY ? [ONLY] : [...docs.map(d => d.id).sort(), 'elegance'];
}

console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
console.log(`║  RESCATE DE SELLOS POST-BACKFILL  ${APPLY ? '⚠️  APPLY  ' : '(DRY-RUN)'}`);
console.log(`╚══════════════════════════════════════════════════════════════╝\n`);

const tenants = await tenantIds();

let totalRescatables = 0, totalAplicados = 0, totalSkipCortesia = 0;
let totalSkipYaEnHist = 0, totalSkipSinUid = 0, totalSkipUserNo = 0, totalSkipFusionado = 0;

for (const tid of tenants) {
  const citasCol = tid === 'elegance' ? db.collection('citas') : db.collection(`tenants/${tid}/citas`);
  const usersBase = tid === 'elegance' ? 'users' : `tenants/${tid}/users`;
  const snapC = await citasCol.where('estado', '==', 'Completada').get();
  if (snapC.empty) continue;

  const userCache = new Map();
  const getUser = async (uid) => {
    if (!uid) return null;
    if (userCache.has(uid)) return userCache.get(uid);
    const snap = await db.doc(`${usersBase}/${uid}`).get();
    const data = snap.exists ? { id: snap.id, ...snap.data() } : null;
    userCache.set(uid, data);
    return data;
  };

  let rescatables = 0, skipCortesia = 0, skipYaEnHist = 0, skipSinUid = 0, skipUserNo = 0, skipFusionado = 0;
  const acciones = []; // { citaRef, userId, ejemplo }

  for (const cd of snapC.docs) {
    const c = cd.data();
    if (c.cortesia) { skipCortesia++; continue; }
    const uid = c.clienteUid || c.userId || null;
    if (!uid) { skipSinUid++; continue; }
    const u = await getUser(uid);
    if (!u) { skipUserNo++; continue; }
    // Si el user está fusionado con otro, seguir el puntero.
    let destinoUid = uid;
    if (u.fusionadoCon) {
      const canon = await getUser(u.fusionadoCon);
      if (!canon) { skipUserNo++; continue; }
      destinoUid = canon.id;
      skipFusionado++;
    }
    const destino = await getUser(destinoUid);
    const hist = Array.isArray(destino.historialSellos) ? destino.historialSellos : [];
    if (hist.some(h => h.citaId === cd.id)) { skipYaEnHist++; continue; }
    rescatables++;
    acciones.push({
      citaRef: cd.ref, citaId: cd.id, userId: destinoUid,
      ejemplo: `${(c.clienteNombre || '').slice(0, 25).padEnd(25)} · ${c.fecha}`,
    });
  }

  const anom = rescatables;
  if (!anom && !skipSinUid && !skipUserNo) continue;

  totalRescatables += rescatables;
  totalSkipCortesia += skipCortesia;
  totalSkipYaEnHist += skipYaEnHist;
  totalSkipSinUid += skipSinUid;
  totalSkipUserNo += skipUserNo;
  totalSkipFusionado += skipFusionado;

  console.log(`── ${tid} — completadas=${snapC.size}, RESCATAR=${rescatables}, ya-en-hist=${skipYaEnHist}, cortesía=${skipCortesia}, sin-uid=${skipSinUid}, user-no=${skipUserNo}, fusionados=${skipFusionado}`);
  for (const a of acciones.slice(0, 5)) console.log(`   · ${a.ejemplo}`);
  if (acciones.length > 5) console.log(`   … (${acciones.length - 5} más)`);

  if (!APPLY) continue;

  // Aplicar en batches de 400 (Firestore límite).
  // Agrupo por user para no rehacer el arrayUnion. Simplifico: 1 update por acción
  // pero en batches. Correcto porque cada acción es a un doc distinto (o al mismo,
  // con arrayUnion es idempotente igual).
  for (let i = 0; i < acciones.length; i += 400) {
    const chunk = acciones.slice(i, i + 400);
    const batch = db.batch();
    const nowIso = Timestamp.now().toDate().toISOString();
    for (const a of chunk) {
      const entry = {
        fecha:    nowIso,
        tipo:     'suma',
        cantidad: 1,
        nota:     'Rescate post-backfill',
        citaId:   a.citaId,
      };
      const userRef = db.doc(`${usersBase}/${a.userId}`);
      batch.update(userRef, {
        sellosDisponibles: FieldValue.increment(1),
        sellosHistoricos:  FieldValue.increment(1),
        stamps:            FieldValue.increment(1),
        ultimoSello:       nowIso,
        historialSellos:   FieldValue.arrayUnion(entry),
      });
      batch.update(a.citaRef, {
        selloProcesado:      true,
        selloProcesadoEn:    Timestamp.now(),
        selloProcesadoTipo:  'sello',
        rescatadoPostBackfill: true,
      });
    }
    await batch.commit();
    totalAplicados += chunk.length;
  }
  console.log(`   ✅ ${acciones.length} aplicados`);
}

console.log(`\n─────────────────────────────────────────────`);
console.log(`Total RESCATABLES:      ${totalRescatables}`);
if (APPLY) console.log(`Total APLICADOS:        ${totalAplicados}`);
console.log(`Skip ya-en-historial:   ${totalSkipYaEnHist}`);
console.log(`Skip cortesías:          ${totalSkipCortesia}`);
console.log(`Skip sin clienteUid:    ${totalSkipSinUid}   (probablemente sin email+tel para backfill)`);
console.log(`Skip user no existe:    ${totalSkipUserNo}`);
console.log(`Fusiones seguidas:      ${totalSkipFusionado}`);
if (!APPLY) console.log(`\n(dry-run) --apply para ejecutar`);
