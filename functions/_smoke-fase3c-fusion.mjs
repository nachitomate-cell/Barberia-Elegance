// _smoke-fase3c-fusion.mjs — Fusión walk-in → login passwordless.
//
// Escenario real más frecuente:
//   1. Cliente reserva en la agenda pública SIN login → se crea users/{ac_hash}
//      vía upsertCliente. Sella la cita, historial acumula ahí.
//   2. Después, ese cliente decide entrar al club: en /registro.html usa el
//      passwordless con SU MISMO email → Firebase Auth crea users/{authUid}
//      limpio (sin sellos, sin historial).
//   3. Trigger linkLegacyTenant debe fusionar el ac_hash al authUid, moviendo
//      packsActivos, sumando sellos, uniendo historial.
//
// Este smoke:
//   · Recrea el escenario end-to-end con datos ficticios trazables
//   · Verifica que TODO se fusiona al authUid
//   · Verifica que el ac_hash queda vaciado (packs=[], sellos=0, fusionadoCon=authUid)
//   · Confirma la invariante Fase 3.C: cero escrituras a clientes/
//
// USO:
//   node _smoke-fase3c-fusion.mjs                # deja los docs
//   node _smoke-fase3c-fusion.mjs --cleanup      # borra al final

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

const RUN_ID   = Date.now().toString(36);
const nombre   = `FUSION Test ${RUN_ID}`;
const email    = `fusion.${RUN_ID}@test.local`;
const telefono = `569555${String(Date.now()).slice(-6)}`;
// Simulamos un authUid de Firebase (28 chars alfanum, lo que Auth genera)
const authUid  = `AUTH${RUN_ID.padEnd(24, 'x').slice(0, 24)}`;

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
  console.log(`║  SMOKE Fase 3.C FUSIÓN — "${TENANT}" — run ${RUN_ID}`);
  console.log(`╚══════════════════════════════════════════════════════════════╝`);
  console.log(`   Cliente:  ${nombre}`);
  console.log(`   Email:    ${email}`);
  console.log(`   Teléfono: ${telefono}`);
  console.log(`   AuthUid simulado: ${authUid}`);

  // ── FASE 1: walk-in (reserva sin login) ─────────────────────────
  head('FASE 1: reserva walk-in (crea users/{ac_hash})');
  const hoy = new Date().toISOString().split('T')[0];
  const citaRef = await citasCol.add({
    clienteNombre:    nombre,
    clienteEmail:     email,
    clienteTelefono:  telefono,
    servicioNombre:   'Corte Clásico',
    servicioId:       'test-servicio',
    barberoId:        'test-barbero',
    fecha:            hoy,
    hora:             '16:00',
    estado:           'Confirmada',
    precio:           15000,
    creadoEn:         Timestamp.now(),
    _smokeTest:       true,
    _smokeRunId:      RUN_ID,
  });
  const citaId = citaRef.id;
  log(`Cita creada: ${citaId}`);

  await wait(10000);
  const citaData = (await citaRef.get()).data();
  const acUid    = citaData?.clienteUid || null;
  assert(!!acUid && acUid.startsWith('ac_'), `rescate creó user con docId 'ac_<hash>'`, acUid || 'null');

  // ── FASE 2: completar la cita (sella al ac_hash) ─────────────────
  head('FASE 2: completar cita → sello al ac_hash');
  await citaRef.update({ estado: 'Completada' });
  await wait(15000);

  const acRef = usersCol.doc(acUid);
  const acData = (await acRef.get()).data();
  assert(Number(acData?.sellosDisponibles || 0) === 1, `users/${acUid}.sellosDisponibles=1`, String(acData?.sellosDisponibles));
  assert(Array.isArray(acData?.historialSellos) && acData.historialSellos.length === 1, `users/${acUid}.historialSellos len=1`, String(acData?.historialSellos?.length));

  // ── FASE 3: simular login passwordless (crea users/{authUid}) ────
  head('FASE 3: login passwordless (crea users/{authUid}) → dispara linkLegacy');
  const authRef = usersCol.doc(authUid);
  await authRef.set({
    email,
    emailLower: email.toLowerCase(),
    telefono,
    nombre,
    creadoEn: Timestamp.now(),
    _smokeTest: true,
    _smokeRunId: RUN_ID,
  });
  log(`users/${authUid} creado (simula login passwordless)`);

  head('FASE 4: esperar linkLegacyTenant (~20s)');
  await wait(20000);

  const authAfter = (await authRef.get()).data();
  const acAfter   = (await acRef.get()).data();

  // ── Verificaciones fusión ────────────────────────────────────────
  assert(Number(authAfter?.sellosDisponibles || 0) === 1,
    `users/${authUid}.sellosDisponibles=1 (heredado del ac_hash)`,
    String(authAfter?.sellosDisponibles));
  assert(Number(authAfter?.sellosHistoricos || 0) === 1,
    `users/${authUid}.sellosHistoricos=1`,
    String(authAfter?.sellosHistoricos));
  assert(Array.isArray(authAfter?.historialSellos) && authAfter.historialSellos.length === 1,
    `users/${authUid}.historialSellos len=1`,
    String(authAfter?.historialSellos?.length));

  // ── Verificaciones vaciado del ac_hash ──────────────────────────
  assert(acAfter?.fusionadoCon === authUid,
    `users/${acUid}.fusionadoCon=${authUid}`,
    acAfter?.fusionadoCon || 'null');
  assert(Number(acAfter?.sellosDisponibles || 0) === 0,
    `users/${acUid}.sellosDisponibles=0 (vaciado post-fusión)`,
    String(acAfter?.sellosDisponibles));
  assert(Array.isArray(acAfter?.historialSellos) && acAfter.historialSellos.length === 0,
    `users/${acUid}.historialSellos len=0 (vaciado post-fusión)`,
    String(acAfter?.historialSellos?.length));

  // ── Verificación cita → apunta al authUid ────────────────────────
  const citaFinal = (await citaRef.get()).data();
  assert(citaFinal?.userId === authUid,
    `cita.userId=${authUid} (reasignada por linkLegacy)`,
    citaFinal?.userId || 'null');
  assert(citaFinal?.userIdLegacy === acUid,
    `cita.userIdLegacy=${acUid} (guarda historial)`,
    citaFinal?.userIdLegacy || 'null');

  // ── Invariante Fase 3.C: clientes/ vacío ─────────────────────────
  head('INVARIANTE Fase 3.C: clientes/ sigue vacío');
  const cliMirror = await clientesCol.doc(telefono).get();
  assert(!cliMirror.exists, `clientes/${telefono} NO existe`);
  const cliByEmail = await clientesCol.where('email', '==', email).limit(3).get();
  assert(cliByEmail.empty, `clientes/ sin doc con este email`, `size=${cliByEmail.size}`);

  // ── Resumen ──────────────────────────────────────────────────────
  head('RESUMEN');
  const pass = results.filter(r => r.ok).length;
  const fail = results.filter(r => !r.ok).length;
  console.log(`   ${pass} ${OK}  ${fail} ${fail ? KO : OK}   (total ${results.length})`);
  if (fail) {
    console.log(`\n   Fallos:`);
    results.filter(r => !r.ok).forEach(r => console.log(`      ${KO} ${r.label}`));
  }

  if (CLEANUP) {
    head('CLEANUP');
    try { await citaRef.delete();  log(`cita ${citaId} borrada`); } catch (e) { log(`${WARN} ${e.message}`); }
    try { await acRef.delete();    log(`users/${acUid} borrado`); } catch (e) { log(`${WARN} ${e.message}`); }
    try { await authRef.delete();  log(`users/${authUid} borrado`); } catch (e) { log(`${WARN} ${e.message}`); }
  } else {
    console.log(`\n   Docs dejados (correr con --cleanup para borrar):`);
    console.log(`      tenants/${TENANT}/citas/${citaId}`);
    console.log(`      tenants/${TENANT}/users/${acUid}`);
    console.log(`      tenants/${TENANT}/users/${authUid}`);
  }

  process.exit(fail ? 1 : 0);
}

main().catch(e => {
  console.error('\n❌ ERROR:', e);
  process.exit(1);
});
