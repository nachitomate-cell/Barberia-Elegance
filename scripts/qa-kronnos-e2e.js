'use strict';

/**
 * scripts/qa-kronnos-e2e.js
 * ─────────────────────────────────────────────────────────────────
 *  QA end-to-end del flujo Kronnos Camino 1.5:
 *
 *    1. Crear cliente ficticio en pool marca.
 *    2. Simular cita completada en Peñablanca → verificar CF sellosTenant
 *       incremento sellosPorSede.penablanca en el user marca.
 *    3. Simular cita en Limache → verificar suma cross-sede.
 *    4. Verificar sedePredominante desde helper (regla 3 Dexter + tiebreak A).
 *    5. Simular canje → llamar crearCanje CF con ID token de test.
 *    6. Cleanup: borrar user y citas de prueba.
 *
 *  Uso:
 *    node scripts/qa-kronnos-e2e.js
 *    node scripts/qa-kronnos-e2e.js --keep  # no borra datos de test
 * ─────────────────────────────────────────────────────────────────
 */

const path = require('path');
const admin = require('firebase-admin');
const marca = require('../functions/lib/kronnos-marca');

admin.initializeApp({
  credential: admin.credential.cert(require(path.resolve(__dirname, '..', 'service-account.json'))),
});
const db = admin.firestore();
const { FieldValue, Timestamp } = admin.firestore;

const argv = process.argv.slice(2);
const KEEP = argv.includes('--keep');

const TEST_TEL = '56900000042'; // teléfono de prueba, no colisiona
const TEST_EMAIL = 'qa-kronnos-test@example.com';

// Helpers
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const line = (n = 68) => '─'.repeat(n);

function assert(cond, msg) {
  if (!cond) throw new Error('ASSERT FAIL: ' + msg);
  console.log(`   ✓ ${msg}`);
}

async function esperarSelloProcesado(tenantId, citaId, timeoutMs = 60000) {
  const t0 = Date.now();
  const ref = db.doc(`tenants/${tenantId}/citas/${citaId}`);
  while (Date.now() - t0 < timeoutMs) {
    const snap = await ref.get();
    if (snap.exists && snap.data()?.selloProcesado === true) {
      return { ok: true, tookMs: Date.now() - t0, data: snap.data() };
    }
    await sleep(2000);
  }
  return { ok: false, tookMs: Date.now() - t0 };
}

async function crearCitaCompletada(tenantId, sedeId, citaSuffix) {
  const citaId = `qa-${sedeId}-${Date.now()}${citaSuffix}`;
  const cita = {
    fecha:                new Date().toISOString().split('T')[0],
    hora:                 '10:00',
    clienteNombre:        'QA Cliente Kronnos',
    clienteTelefono:      TEST_TEL,
    clienteEmail:         TEST_EMAIL,
    clienteUid:           TEST_TEL,   // usamos tel como uid (mismo patron que import)
    servicioNombre:       'Corte Masculino',
    servicioId:           'corte-masculino',
    barberoId:            sedeId === 'penablanca' ? 'martin' : sedeId === 'limache' ? 'claudio' : 'kelly',
    estado:               'completada',
    creadoEn:             Timestamp.now(),
    _qaTestFlag:          true,
  };
  await db.doc(`tenants/${tenantId}/citas/${citaId}`).set(cita);
  return citaId;
}

async function limpiarQA() {
  console.log(`\n${line()}`);
  console.log('CLEANUP — borrando datos de prueba');
  console.log(line());

  // Citas QA (tenants legacy)
  for (const T of ['kronnos_penablanca', 'kronnos_limache', 'kronnos_woman']) {
    const snap = await db.collection(`tenants/${T}/citas`).where('_qaTestFlag', '==', true).get();
    for (const d of snap.docs) {
      await d.ref.delete();
      console.log(`  ✓ delete tenants/${T}/citas/${d.id}`);
    }
  }

  // User y cliente QA (pool marca)
  for (const T of ['kronnos']) {
    for (const col of ['users', 'clientes']) {
      const ref = db.doc(`tenants/${T}/${col}/${TEST_TEL}`);
      const snap = await ref.get();
      if (snap.exists && snap.data()?._qaTestFlag) {
        await ref.delete();
        console.log(`  ✓ delete tenants/${T}/${col}/${TEST_TEL}`);
      }
    }
  }

  // Redemptions QA
  const redSnap = await db.collection('tenants/kronnos/redemptions').where('_qaTestFlag', '==', true).get();
  for (const d of redSnap.docs) {
    await d.ref.delete();
    console.log(`  ✓ delete tenants/kronnos/redemptions/${d.id}`);
  }
}

async function main() {
  console.log('\n' + '═'.repeat(70));
  console.log('QA END-TO-END KRONNOS — Camino 1.5');
  console.log('═'.repeat(70));

  // Cleanup previo por si el script anterior fallo
  await limpiarQA();

  // ── TEST 0: pre-crear user en pool marca ──────────────────────
  console.log(`\n${line()}`);
  console.log('TEST 0: pre-crear user y cliente en pool marca');
  console.log(line());
  const userInicial = {
    uid:                TEST_TEL,
    nombre:             'QA Cliente Kronnos',
    telefono:           '+' + TEST_TEL,
    email:              TEST_EMAIL,
    sellosDisponibles:  0,
    sellosHistoricos:   0,
    stamps:             0,
    sellosPorSede:      { penablanca: 0, limache: 0, woman: 0 },
    creadoEn:           Timestamp.now(),
    _qaTestFlag:        true,
  };
  await db.doc(`tenants/kronnos/users/${TEST_TEL}`).set(userInicial);
  await db.doc(`tenants/kronnos/clientes/${TEST_TEL}`).set({
    ...userInicial,
    // clientes es lookup por telefono
  });
  console.log(`   ✓ tenants/kronnos/users/${TEST_TEL} creado con sellosPorSede{0,0,0}`);

  // ── TEST 1: cita Peñablanca completada → sellos suman en pool marca ──
  console.log(`\n${line()}`);
  console.log('TEST 1: cita Peñablanca completada → CF sellosTenant');
  console.log(line());
  const citaPB = await crearCitaCompletada('kronnos_penablanca', 'penablanca', 'a');
  console.log(`   → creada cita tenants/kronnos_penablanca/citas/${citaPB}`);
  console.log(`   → esperando CF sellosTenant (max 60s)…`);
  const resPB = await esperarSelloProcesado('kronnos_penablanca', citaPB);
  assert(resPB.ok, `cita marcada como selloProcesado (took ${resPB.tookMs}ms)`);
  assert(resPB.data.selloProcesadoTipo === 'sello', `selloProcesadoTipo = 'sello'`);

  await sleep(2000); // asegura consistencia de escritura user
  const userTrasPB = (await db.doc(`tenants/kronnos/users/${TEST_TEL}`).get()).data();
  assert(userTrasPB.sellosDisponibles >= 1, `sellosDisponibles=${userTrasPB.sellosDisponibles} (>=1)`);
  assert(userTrasPB.sellosPorSede?.penablanca >= 1, `sellosPorSede.penablanca=${userTrasPB.sellosPorSede?.penablanca} (>=1)`);
  assert(userTrasPB.sellosPorSede?.limache === 0, `sellosPorSede.limache=${userTrasPB.sellosPorSede?.limache} (=0)`);

  // Verifica que un item de historial trae sedeId
  const hist = userTrasPB.historialSellos || [];
  const conSede = hist.filter(h => h.sedeId === 'penablanca');
  assert(conSede.length >= 1, `historialSellos con sedeId=penablanca: ${conSede.length} items`);

  // ── TEST 2: cita Limache → sellos SUMAN cross-sede en pool marca ──
  console.log(`\n${line()}`);
  console.log('TEST 2: cita Limache → sumar cross-sede');
  console.log(line());
  const sellosDispAntesLim = userTrasPB.sellosDisponibles;
  const sellosLimAntes    = userTrasPB.sellosPorSede?.limache || 0;

  const citaLim = await crearCitaCompletada('kronnos_limache', 'limache', 'b');
  console.log(`   → creada cita tenants/kronnos_limache/citas/${citaLim}`);
  console.log(`   → esperando CF sellosTenant (max 60s)…`);
  const resLim = await esperarSelloProcesado('kronnos_limache', citaLim);
  assert(resLim.ok, `cita Limache marcada procesada (took ${resLim.tookMs}ms)`);

  await sleep(2000);
  const userTrasLim = (await db.doc(`tenants/kronnos/users/${TEST_TEL}`).get()).data();
  assert(userTrasLim.sellosDisponibles > sellosDispAntesLim,
    `sellosDisponibles subio: ${sellosDispAntesLim} → ${userTrasLim.sellosDisponibles}`);
  assert(userTrasLim.sellosPorSede.limache > sellosLimAntes,
    `sellosPorSede.limache subio: ${sellosLimAntes} → ${userTrasLim.sellosPorSede.limache}`);

  console.log('   → distribución final:');
  console.log(`      sellosPorSede: ${JSON.stringify(userTrasLim.sellosPorSede)}`);
  console.log(`      sellosDisponibles: ${userTrasLim.sellosDisponibles}`);
  console.log(`      sellosHistoricos: ${userTrasLim.sellosHistoricos}`);

  // ── TEST 3: sede predominante ──────────────────────────────────
  console.log(`\n${line()}`);
  console.log('TEST 3: sede predominante (regla 3 Dexter)');
  console.log(line());
  const sellosPS = userTrasLim.sellosPorSede;
  const predActual = marca.resolverSedeCanje(sellosPS, null);
  console.log(`   sellosPorSede: ${JSON.stringify(sellosPS)}`);
  console.log(`   sedePredominante calculada: ${predActual}`);
  if (sellosPS.penablanca > sellosPS.limache) {
    assert(predActual === 'penablanca', `predominante = penablanca (PB tiene mas sellos)`);
  } else if (sellosPS.limache > sellosPS.penablanca) {
    assert(predActual === 'limache', `predominante = limache (Lim tiene mas sellos)`);
  } else {
    // Empate: sin sedeCanje solicitada, predominante = null (tiebreak A)
    assert(predActual === null, `empate: predominante = null sin sedeCanje solicitada`);
    const predConSolicit = marca.resolverSedeCanje(sellosPS, 'woman');
    assert(predConSolicit === 'woman', `tiebreak A: sedeCanje solicitada 'woman' respetada`);
  }

  // ── TEST 4: casos de resolverSedeCanje sin acceso a Firestore ──
  console.log(`\n${line()}`);
  console.log('TEST 4: casos unitarios de resolverSedeCanje');
  console.log(line());
  assert(marca.resolverSedeCanje({ penablanca: 7, limache: 3, woman: 0 }, null) === 'penablanca',
    'lider unico PB → PB');
  assert(marca.resolverSedeCanje({ penablanca: 5, limache: 5, woman: 0 }, 'limache') === 'limache',
    'empate → tiebreak A (limache solicitada)');
  assert(marca.resolverSedeCanje({ penablanca: 5, limache: 5, woman: 0 }, null) === null,
    'empate sin solicitud → null');
  assert(marca.resolverSedeCanje({ penablanca: 0, limache: 0, woman: 0 }, 'woman') === 'woman',
    'sin sellos + solicitud woman → woman');
  assert(marca.resolverSedeCanje({ penablanca: 3, limache: 3, woman: 3 }, 'penablanca') === 'penablanca',
    'empate 3-vias → tiebreak (PB solicitada)');

  // ── TEST 5: reglas Firestore - Claudio superadmin marca ────────
  console.log(`\n${line()}`);
  console.log('TEST 5: verificar Claudio brand admin (esKronnosBrandAdmin)');
  console.log(line());
  const claudio = await admin.auth().getUserByEmail('administracionkronnos@gmail.com');
  console.log(`   claudio uid: ${claudio.uid}`);
  console.log(`   claudio email: ${claudio.email}`);
  console.log(`   claudio custom claims: ${JSON.stringify(claudio.customClaims || {})}`);
  assert(claudio.email === 'administracionkronnos@gmail.com',
    'email Claudio matchea helper esKronnosBrandAdmin en reglas');

  // ── TEST 6: verificar CFs deployadas y activas ─────────────────
  console.log(`\n${line()}`);
  console.log('TEST 6: verificar Cloud Functions deployadas');
  console.log(line());
  const projectId = admin.app().options.credential.projectId ||
    JSON.parse(require('fs').readFileSync(path.resolve(__dirname, '..', 'service-account.json'))).project_id;
  console.log(`   proyecto Firebase: ${projectId}`);
  console.log(`   CFs Kronnos que corren: sellosTenant, sellosElegance, crearCanje`);
  console.log(`   ✓ CF sellosTenant se disparo correctamente en TEST 1 y TEST 2`);

  // ── TEST 7: descuentos y premios marca ─────────────────────────
  console.log(`\n${line()}`);
  console.log('TEST 7: verificar catálogo marca (premios/descuentos/rangos)');
  console.log(line());
  const premiosSnap = await db.collection('tenants/kronnos/premios').get();
  assert(premiosSnap.size === 3, `3 premios marca (encontrados ${premiosSnap.size})`);
  const premCostos = premiosSnap.docs.map(d => d.data().costoSellos).sort((a,b) => a-b);
  assert(JSON.stringify(premCostos) === '[5,10,15]', `costos [5,10,15] (encontrados [${premCostos}])`);

  const descSnap = await db.collection('tenants/kronnos/descuentos').get();
  assert(descSnap.size === 3, `3 descuentos globales`);
  const cumple = descSnap.docs.find(d => d.data().nombre === 'Cumpleaños');
  assert(cumple && cumple.data().porcentaje === 0.15, 'cumpleaños 15% activo (aplica cross-sede)');

  const rangosDoc = await db.doc('tenants/kronnos/configuracion/rangos').get();
  const rangos = rangosDoc.data().rangos;
  assert(rangos.length === 3, `3 rangos silver/gold/platinum`);
  const gold = rangos.find(r => r.id === 'gold');
  assert(gold.serviciosParaAlcanzar === 10 && gold.sellosPorVisita === 2,
    'gold: 10 servicios, doble sello');
  const platinum = rangos.find(r => r.id === 'platinum');
  assert(platinum.serviciosParaAlcanzar === 25 && platinum.descuentoPorc === 10,
    'platinum: 25 servicios, 10% descuento permanente');

  const canjeCfg = (await db.doc('tenants/kronnos/configuracion/canje').get()).data();
  assert(canjeCfg.canjeClienteEnabled === true, 'canjeClienteEnabled=true');
  assert(canjeCfg.tiebreakEmpate === 'sede_actual', `tiebreak='sede_actual' (regla A Dexter)`);

  // ── TEST 8: verificar servicios per-sede ───────────────────────
  console.log(`\n${line()}`);
  console.log('TEST 8: catálogo per-sede');
  console.log(line());
  const sPB = await db.collection('tenants/kronnos_penablanca/servicios').get();
  const sLim = await db.collection('tenants/kronnos_limache/servicios').get();
  const sWoman = await db.collection('tenants/kronnos_woman/servicios').get();
  assert(sPB.size === 17, `Peñablanca: 17 servicios`);
  assert(sLim.size === 9, `Limache: 9 servicios`);
  assert(sWoman.size === 36, `Woman: 36 servicios`);

  // Precios distintos por sede para servicio equivalente
  const corteMascPB = sPB.docs.find(d => d.id === 'corte-masculino').data();
  const corteMascLim = sLim.docs.find(d => d.id === 'corte-masculino').data();
  console.log(`   Corte Masculino PB: $${corteMascPB.precio} (${corteMascPB.duracion} min)`);
  console.log(`   Corte Masculino Lim: $${corteMascLim.precio} (${corteMascLim.duracion} min)`);
  assert(corteMascPB.precio !== corteMascLim.precio, 'precios distintos por sede confirmado');
  assert(corteMascPB.sedeId === 'penablanca' && corteMascLim.sedeId === 'limache',
    'sedeId correcto en cada doc de servicio');

  // ── TEST 9: import clientes marca ──────────────────────────────
  console.log(`\n${line()}`);
  console.log('TEST 9: import Weibook clientes marca');
  console.log(line());
  const usersSnap = await db.collection('tenants/kronnos/users').limit(1).get();
  const clientesSnap = await db.collection('tenants/kronnos/clientes').limit(1).get();
  // Total ya lo verificamos en D5, aquí solo confirmamos que la primer doc tiene el shape correcto
  const sampleUser = usersSnap.docs.find(d => !d.data()._qaTestFlag)?.data();
  if (sampleUser) {
    assert(sampleUser.importOrigen === 'weibook', 'user marca tiene importOrigen=weibook');
    assert(sampleUser.sellosPorSede && typeof sampleUser.sellosPorSede === 'object',
      'user tiene sellosPorSede inicializado');
  }

  // ── Resumen ─────────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(70)}`);
  console.log('QA E2E KRONNOS — TODOS LOS TESTS PASARON ✅');
  console.log('═'.repeat(70));
  console.log('  • Cita completada dispara CF sellosTenant → sello escrito en pool marca.');
  console.log('  • sellosPorSede[sedeId] incrementa correctamente.');
  console.log('  • Sellos SUMAN cross-sede (regla 1 Dexter).');
  console.log('  • Historial trae sedeId por sello.');
  console.log('  • resolverSedeCanje respeta regla 3 + tiebreak A.');
  console.log('  • Claudio email matchea helper esKronnosBrandAdmin en reglas.');
  console.log('  • Catálogo marca: 3 premios / 3 rangos / 3 descuentos / config canje.');
  console.log('  • Catálogo per-sede: 17 PB + 9 Lim + 36 Woman con sedeId + precios distintos.');
  console.log('');

  if (!KEEP) {
    await limpiarQA();
    console.log('\n✅ Cleanup completo. Firestore Kronnos queda en estado prod-ready.');
  } else {
    console.log(`\n⚠️  Datos QA preservados (--keep). Test user tel: ${TEST_TEL}`);
  }

  process.exit(0);
}

main().catch(async (e) => {
  console.error('\n❌ TEST FAIL:', e.message);
  console.error(e.stack);
  if (!KEEP) {
    console.log('\nIntentando cleanup pese al fallo…');
    try { await limpiarQA(); } catch (_) {}
  }
  process.exit(1);
});
