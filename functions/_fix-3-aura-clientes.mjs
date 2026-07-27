// Fix directo de 3 clientes en aura con docs duplicados que scan v1 no capturó.
// Cada uno: fusionar A → B (B = doc canónico = el que ve el cliente).
// Reasignar citas de A a B, sumar sellos si aplica, marcar A como fusionado.

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const APPLY = process.argv.includes('--apply');
const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();

const TENANT = 'aura';

// Fusiones: A (huérfano, se vacía) → B (canónico, hereda).
const fusiones = [
  {
    nombre: 'Osvaldo Vargas',
    a: 'ac_d523bd29d8a8b3fc8d',
    b: 'R4VCBLadaPhOMNfW24Fa5Cc9jHn2',
    motivo: 'Emails casi iguales (.vtr.net + apellido extra), mismo tel',
  },
  {
    nombre: 'Luciano Ornella',
    a: '1SJx4AY53ubho6JxGIgpF8VjyRo2',   // 0 sellos, 1 cita nueva
    b: 'TZyR3u1Sw4eaW6KrNIVrbzoPK332',   // 2 sellos históricos, canónico
    motivo: 'Mismo nombre exacto, 2 authUIDs por login con 2 emails distintos',
  },
  {
    nombre: 'Joaquin Lopez',
    a: 'ac_c0882efa41da002ef7',
    b: '+56975755460',                    // doc legacy con id numérico "+"
    motivo: 'Email con vs sin tildes (joaquín vs joaquin)',
  },
];

console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
console.log(`║  FIX 3 CLIENTES AURA ${APPLY ? '⚠️  APPLY  ' : '(DRY-RUN)'}`);
console.log(`╚══════════════════════════════════════════════════════════════╝\n`);

for (const f of fusiones) {
  const aRef = db.doc(`tenants/${TENANT}/users/${f.a}`);
  const bRef = db.doc(`tenants/${TENANT}/users/${f.b}`);
  const [aSnap, bSnap] = await Promise.all([aRef.get(), bRef.get()]);
  if (!aSnap.exists || !bSnap.exists) {
    console.log(`❌ ${f.nombre}: alguno no existe. Skip.`);
    continue;
  }
  const aData = aSnap.data();
  const bData = bSnap.data();
  console.log(`── ${f.nombre} ──`);
  console.log(`   A ${f.a}  sellos=${aData.sellosDisponibles || 0}  hist=${(aData.historialSellos||[]).length}`);
  console.log(`   B ${f.b}  sellos=${bData.sellosDisponibles || 0}  hist=${(bData.historialSellos||[]).length}`);
  console.log(`   → ${f.motivo}`);

  // Citas de A
  const citasCol = db.collection(`tenants/${TENANT}/citas`);
  const qA = await citasCol.where('clienteUid', '==', f.a).get();
  const citasCompletadas = qA.docs.filter(d => d.data().estado === 'Completada');
  console.log(`   Citas de A: ${qA.size} total, ${citasCompletadas.length} completada(s)`);

  // Sellos a rescatar: citas de A completadas con selloProcesado=true
  // cuyo citaId NO está ya en bData.historialSellos
  const bHist = Array.isArray(bData.historialSellos) ? bData.historialSellos : [];
  const bCitaIds = new Set(bHist.map(h => h.citaId).filter(Boolean));
  const sellosRescatables = citasCompletadas.filter(d => {
    const c = d.data();
    if (!c.selloProcesado) return false;
    if (c.cortesia) return false;
    return !bCitaIds.has(d.id);
  });
  console.log(`   Sellos a rescatar de A→B: ${sellosRescatables.length}`);

  if (!APPLY) {
    console.log(`   (dry-run)\n`);
    continue;
  }

  // Reasignar TODAS las citas de A al B
  const batch = db.batch();
  for (const cd of qA.docs) {
    batch.update(cd.ref, {
      clienteUid: f.b,
      userId:     f.b,
      userIdLegacy: f.a,
      fusionManualAt: Timestamp.now(),
    });
  }
  if (qA.size) await batch.commit();

  // Sumar sellos rescatables al B
  if (sellosRescatables.length) {
    const nuevasEntradas = sellosRescatables.map(d => ({
      fecha:    Timestamp.now().toDate().toISOString(),
      tipo:     'suma',
      cantidad: 1,
      nota:     `Fusión manual · rescate cita ${d.id}`,
      citaId:   d.id,
    }));
    await bRef.update({
      sellosDisponibles: FieldValue.increment(sellosRescatables.length),
      sellosHistoricos:  FieldValue.increment(sellosRescatables.length),
      stamps:            FieldValue.increment(sellosRescatables.length),
      ultimoSello:       Timestamp.now().toDate().toISOString(),
      historialSellos:   FieldValue.arrayUnion(...nuevasEntradas),
      fusionRescateAt:   Timestamp.now(),
    });
  }

  // Marcar A como fusionado
  await aRef.update({
    fusionadoCon:      f.b,
    fusionadoEn:       Timestamp.now(),
    packsActivos:      [],
    sellosDisponibles: 0,
    sellosHistoricos:  0,
    stamps:            0,
    historialSellos:   [],
  });

  // Post-check
  const bFinal = (await bRef.get()).data();
  console.log(`   ✅ fusionado. B ahora: sellos=${bFinal.sellosDisponibles}  hist=${(bFinal.historialSellos||[]).length}\n`);
}

console.log(`─────────────────────────────────────────────`);
if (!APPLY) console.log(`(dry-run) --apply para ejecutar`);
