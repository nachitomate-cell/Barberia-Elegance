// _smoke-fase3c.mjs — Smoke test end-to-end de la Fase 3.C.
//
// Objetivo: en 1 corrida validar los 6 CFs migrados hoy sobre delnero (sandbox):
//   1. rescate-cliente-cita.js  → cita sin clienteUid recibe uid tras crearse
//   2. sello-automatico.js      → users/{uid} recibe +1 sello al marcar Completada
//   3. haircut-reminder.js      → users/{uid} recibe nextSuggestionDate/avgIntervalDias
//   4. link-legacy-on-auth.js   → (indirecto, no forzamos)
//   5. cumpleanos.js            → validación estática (cron diario)
//   6. lookup-cliente-migrado   → callable, validación separada
//
// Además valida INVARIANTE Fase 3.C: NO se crea nada en tenants/delnero/clientes.
//
// USO:
//   node _smoke-fase3c.mjs                # ejecuta y deja los docs de test
//   node _smoke-fase3c.mjs --cleanup      # ejecuta y borra la cita + user creados
//
// Los docs de test se marcan con _smokeTest:true para poder rastrearlos.

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const args = Object.fromEntries(
  process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);
const CLEANUP = args.cleanup === true;
const TENANT  = 'delnero';

const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();

const citasCol    = db.collection(`tenants/${TENANT}/citas`);
const usersCol    = db.collection(`tenants/${TENANT}/users`);
const clientesCol = db.collection(`tenants/${TENANT}/clientes`);

// ── Datos ficticios trazables ─────────────────────────────────────
const RUN_ID   = Date.now().toString(36);
const nombre   = `SMOKE Test ${RUN_ID}`;
const email    = `smoke.${RUN_ID}@test.local`;
const telefono = `569555${String(Date.now()).slice(-6)}`; // 569555xxxxxx únicos

const OK = '✅', KO = '❌', WARN = '⚠️ ';

function log(msg) { console.log(`   ${msg}`); }
function head(msg) { console.log(`\n━━ ${msg} ${'━'.repeat(Math.max(0, 60 - msg.length))}`); }
function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

const results = [];
function assert(cond, label, extra = '') {
  results.push({ ok: !!cond, label });
  console.log(`   ${cond ? OK : KO} ${label}${extra ? ' — ' + extra : ''}`);
}

async function main() {
  console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
  console.log(`║  SMOKE Fase 3.C — tenant "${TENANT}" — run ${RUN_ID}`);
  console.log(`╚══════════════════════════════════════════════════════════════╝`);
  console.log(`   Cliente ficticio: ${nombre}`);
  console.log(`   Email:            ${email}`);
  console.log(`   Teléfono:         ${telefono}`);

  // ── PASO 1: crear cita SIN clienteUid ────────────────────────────
  head('PASO 1: crear cita sin clienteUid');
  const hoy   = new Date().toISOString().split('T')[0];
  const citaData = {
    clienteNombre:    nombre,
    clienteEmail:     email,
    clienteTelefono:  telefono,
    servicioNombre:   'Corte Clásico',
    servicioId:       'test-servicio',
    barberoId:        'test-barbero',
    fecha:            hoy,
    hora:             '15:30',
    estado:           'Confirmada',
    precio:           15000,
    creadoEn:         Timestamp.now(),
    _smokeTest:       true,
    _smokeRunId:      RUN_ID,
  };
  const citaRef = await citasCol.add(citaData);
  const citaId  = citaRef.id;
  log(`Cita creada: ${citaId}`);

  // ── PASO 2: esperar rescate-cliente-cita.js ──────────────────────
  head('PASO 2: esperar rescate-cliente-cita.js (~10s)');
  await wait(10000);

  const citaTrasRescate = (await citaRef.get()).data();
  const clienteUid      = citaTrasRescate?.clienteUid || citaTrasRescate?.userId || null;
  assert(!!clienteUid, `rescate llenó clienteUid en la cita`, clienteUid || 'aún null');
  assert(citaTrasRescate?.rescatadoPorTrigger === true, `cita marcada rescatadoPorTrigger:true`);

  let userRef = null;
  let userData = null;
  if (clienteUid) {
    userRef = usersCol.doc(clienteUid);
    const userSnap = await userRef.get();
    assert(userSnap.exists, `users/${clienteUid} existe`);
    userData = userSnap.data();
    assert(userData?.nombre === nombre,       `user.nombre correcto`, userData?.nombre);
    assert(userData?.email  === email,        `user.email correcto`,  userData?.email);
    assert(!!userData?.telefono,              `user.telefono presente`);
    assert(clienteUid.startsWith('ac_'),      `user creado con docId 'ac_<hash>'`, clienteUid);
  }

  // ── PASO 3: invariante Fase 3.C — clientes/ NO debe tener nada ──
  head('PASO 3: invariante Fase 3.C — sin escrituras a clientes/');
  const clienteMirrorSnap = await clientesCol.doc(telefono).get();
  assert(!clienteMirrorSnap.exists, `clientes/${telefono} NO se creó`);

  const clientesByTel = await clientesCol.where('telefono', '==', telefono).limit(3).get();
  assert(clientesByTel.empty, `no hay docs en clientes/ con este teléfono`, `size=${clientesByTel.size}`);

  const clientesByEmail = await clientesCol.where('email', '==', email).limit(3).get();
  assert(clientesByEmail.empty, `no hay docs en clientes/ con este email`, `size=${clientesByEmail.size}`);

  // ── PASO 4: marcar cita como Completada ─────────────────────────
  head('PASO 4: marcar cita como Completada');
  await citaRef.update({ estado: 'Completada' });
  log(`cita ${citaId} → estado=Completada`);

  // ── PASO 5: esperar sello-automatico + haircut-reminder ─────────
  head('PASO 5: esperar sello + haircut-reminder (~15s)');
  await wait(15000);

  const citaFinal = (await citaRef.get()).data();
  assert(citaFinal?.selloProcesado === true,       `cita.selloProcesado=true`);
  assert(citaFinal?.selloProcesadoTipo === 'sello', `cita.selloProcesadoTipo='sello'`, citaFinal?.selloProcesadoTipo);
  assert(citaFinal?.pendingGoogleReview === true,   `cita.pendingGoogleReview=true`);

  if (clienteUid) {
    const userFinal = (await userRef.get()).data();
    assert(Number(userFinal?.sellosDisponibles || 0) >= 1, `users/${clienteUid} sellosDisponibles ≥ 1`, `valor=${userFinal?.sellosDisponibles}`);
    assert(Number(userFinal?.sellosHistoricos  || 0) >= 1, `users/${clienteUid} sellosHistoricos  ≥ 1`, `valor=${userFinal?.sellosHistoricos}`);
    assert(Number(userFinal?.stamps            || 0) >= 1, `users/${clienteUid} stamps            ≥ 1`, `valor=${userFinal?.stamps}`);
    const hist = Array.isArray(userFinal?.historialSellos) ? userFinal.historialSellos : [];
    const entradaDeEstaCita = hist.find(h => h?.citaId === citaId);
    assert(!!entradaDeEstaCita, `historialSellos contiene entrada de esta cita`, entradaDeEstaCita ? JSON.stringify(entradaDeEstaCita).slice(0, 80) : '');
    assert(!!userFinal?.ultimoSello, `users/${clienteUid} ultimoSello presente`);

    // haircut-reminder (recordatorio de próximo corte)
    // Al ser la 1a cita completada, avgIntervalDias usa default 21d.
    // ultimaCitaFecha se guarda como Timestamp: comparo su ISO.
    const ultimaTs = userFinal?.ultimaCitaFecha;
    const ultimaISO = ultimaTs?.toDate?.().toISOString?.().split('T')[0] || '';
    assert(ultimaISO === hoy, `users/${clienteUid} ultimaCitaFecha=hoy`, ultimaISO || String(ultimaTs));
    assert(Number.isFinite(userFinal?.avgIntervalDias), `users/${clienteUid} avgIntervalDias presente`, String(userFinal?.avgIntervalDias));
    assert(!!userFinal?.nextSuggestionDate, `users/${clienteUid} nextSuggestionDate presente`);
    assert(userFinal?.notificacionesActivas === true, `users/${clienteUid} notificacionesActivas=true (default)`);

    // Aún sin escritura a clientes/ tras completar
    const clienteMirrorFinal = await clientesCol.doc(telefono).get();
    assert(!clienteMirrorFinal.exists, `clientes/${telefono} sigue sin existir tras Completada`);
  }

  // ── Resumen ──────────────────────────────────────────────────────
  head('RESUMEN');
  const pass = results.filter(r => r.ok).length;
  const fail = results.filter(r => !r.ok).length;
  console.log(`   ${pass} ${OK}  ${fail} ${fail ? KO : OK}   (total ${results.length})`);
  if (fail) {
    console.log(`\n   Fallos:`);
    results.filter(r => !r.ok).forEach(r => console.log(`      ${KO} ${r.label}`));
  }

  // ── Cleanup opcional ─────────────────────────────────────────────
  if (CLEANUP) {
    head('CLEANUP');
    try { await citaRef.delete(); log(`cita ${citaId} borrada`); } catch (e) { log(`${WARN} no se pudo borrar cita: ${e.message}`); }
    if (userRef && clienteUid?.startsWith('ac_')) {
      try { await userRef.delete(); log(`users/${clienteUid} borrado`); } catch (e) { log(`${WARN} no se pudo borrar user: ${e.message}`); }
    }
  } else {
    console.log(`\n   Docs de test dejados en Firestore (correr con --cleanup para borrar):`);
    console.log(`      tenants/${TENANT}/citas/${citaId}`);
    if (clienteUid) console.log(`      tenants/${TENANT}/users/${clienteUid}`);
  }

  process.exit(fail ? 1 : 0);
}

main().catch(e => {
  console.error('\n❌ ERROR:', e);
  process.exit(1);
});
