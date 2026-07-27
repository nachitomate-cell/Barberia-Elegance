// _fix-jordan-fusion.mjs — Fusiona los 2 docs de Jordan Zamora en aura.
//   ac_307a789dafc8da7671 (walk-in, gmail, tel plano, 0 sellos, 1 sello por reasignar)
// →
//   VCzioHrvHCd2KEtd29hFNNTER5E2 (auth club, insucoabg.cl, +56 9, 3 sellos)
//
// Mismo patrón que link-legacy-on-auth: batch1 vaciar legacy → auth.update()
// → batch2 reasignar cita → recorrer sello-automatico manualmente.
//
// USO:
//   node _fix-jordan-fusion.mjs                # dry-run
//   node _fix-jordan-fusion.mjs --apply

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const APPLY = process.argv.includes('--apply');
const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();

const TENANT  = 'aura';
const AC_ID   = 'ac_307a789dafc8da7671';
const AUTH_ID = 'VCzioHrvHCd2KEtd29hFNNTER5E2';

const acRef   = db.doc(`tenants/${TENANT}/users/${AC_ID}`);
const authRef = db.doc(`tenants/${TENANT}/users/${AUTH_ID}`);

const acSnap   = await acRef.get();
const authSnap = await authRef.get();

if (!acSnap.exists || !authSnap.exists) {
  console.error('❌ Alguno de los docs no existe. Aborto.');
  process.exit(1);
}

const acData   = acSnap.data();
const authData = authSnap.data();

console.log('\n═══════ ESTADO ACTUAL ═══════');
console.log(`ac_hash (${AC_ID}):`);
console.log(`  nombre=${acData.nombre} · sellos=${acData.sellosDisponibles || 0} · historial=${(acData.historialSellos||[]).length}`);
console.log(`  fusionadoCon=${acData.fusionadoCon || '—'}`);
console.log(`authUid (${AUTH_ID}):`);
console.log(`  nombre=${authData.nombre} · sellos=${authData.sellosDisponibles || 0} · historial=${(authData.historialSellos||[]).length}`);

// Buscar la cita completada del ac_hash. La CF sellosTenant ya procesó el
// sello y lo dejó en el ac_hash (que actualmente tiene 0 sellos porque el
// user real ya tiene 3 en el authUid). Necesito:
//   1) reasignar la cita al authUid
//   2) NO tocar el conteo de sellos — el authUid ya tiene sus sellos
//      correctos (3). La cita nueva NO debería sumar +1 porque el sello
//      ya fue procesado antes.
//   3) Marcar el ac_hash como fusionado (sin sellos que mover)

const citaId = '1NqC7YJxOnyYlkZqeak5';
const citaRef = db.doc(`tenants/${TENANT}/citas/${citaId}`);
const citaSnap = await citaRef.get();
if (!citaSnap.exists) {
  console.error(`❌ Cita ${citaId} no existe.`);
  process.exit(1);
}
const cita = citaSnap.data();
console.log(`\nCita ${citaId}: estado=${cita.estado} · clienteUid=${cita.clienteUid} · selloProcesado=${cita.selloProcesado}`);

// Detectar si el sello de esta cita ya está EN el authUid (buscando por citaId
// en su historialSellos). Si no está, hay que sumarlo.
const authHist = Array.isArray(authData.historialSellos) ? authData.historialSellos : [];
const yaEnAuth = authHist.some(h => h.citaId === citaId);
console.log(`\n¿Sello de esta cita ya está en el authUid? ${yaEnAuth ? 'SÍ' : 'NO'}`);

// El sello está EN el ac_hash o EN el auth? Chequeo ambos.
const acHist = Array.isArray(acData.historialSellos) ? acData.historialSellos : [];
const yaEnAc = acHist.some(h => h.citaId === citaId);
console.log(`¿Sello de esta cita ya está en el ac_hash? ${yaEnAc ? 'SÍ' : 'NO'}`);

if (!APPLY) {
  console.log('\n(dry-run) --apply para ejecutar los siguientes cambios:');
  console.log('  1. cita → clienteUid=authUid, userId=authUid, userIdLegacy=ac_hash');
  if (!yaEnAuth) {
    console.log(`  2. authUid → +1 sello disponible, +1 histórico, +1 stamp, +1 entrada en historialSellos`);
  } else {
    console.log('  2. authUid → sin cambios (sello ya está)');
  }
  console.log('  3. ac_hash → fusionadoCon=authUid, sellos=0, historialSellos=[]');
  process.exit(0);
}

// ── APPLY ──
console.log('\n═══════ APPLY ═══════');

// 1) reasignar cita
await citaRef.update({
  clienteUid: AUTH_ID,
  userId:     AUTH_ID,
  userIdLegacy: AC_ID,
  fusionManualAt: Timestamp.now(),
});
console.log(`  ✅ cita ${citaId} → reasignada al authUid`);

// 2) sumar sello al authUid si no está
if (!yaEnAuth) {
  const nuevaEntrada = {
    fecha:    Timestamp.now().toDate().toISOString(),
    tipo:     'suma',
    cantidad: 1,
    nota:     `Fusión manual · cita ${citaId} previo al fix`,
    citaId,
  };
  await authRef.update({
    sellosDisponibles: FieldValue.increment(1),
    sellosHistoricos:  FieldValue.increment(1),
    stamps:            FieldValue.increment(1),
    ultimoSello:       Timestamp.now().toDate().toISOString(),
    historialSellos:   FieldValue.arrayUnion(nuevaEntrada),
    fusionRescateAt:   Timestamp.now(),
  });
  console.log(`  ✅ authUid +1 sello (total ahora: ${(authData.sellosDisponibles || 0) + 1})`);
} else {
  console.log(`  ⏭  authUid ya tiene el sello de esta cita, no se toca`);
}

// 3) marcar ac_hash como fusionado
await acRef.update({
  fusionadoCon:      AUTH_ID,
  fusionadoEn:       Timestamp.now(),
  packsActivos:      [],
  sellosDisponibles: 0,
  sellosHistoricos:  0,
  stamps:            0,
  historialSellos:   [],
});
console.log(`  ✅ ac_hash → marcado fusionado`);

console.log('\n═══════ POST-CHECK ═══════');
const authFinal = (await authRef.get()).data();
const acFinal   = (await acRef.get()).data();
console.log(`authUid: sellos=${authFinal.sellosDisponibles} · historial=${(authFinal.historialSellos || []).length}`);
console.log(`ac_hash: fusionadoCon=${acFinal.fusionadoCon} · sellos=${acFinal.sellosDisponibles}`);
console.log(`\n✅ Fusión completa. Jordan verá ${authFinal.sellosDisponibles} sellos en su dashboard.`);
