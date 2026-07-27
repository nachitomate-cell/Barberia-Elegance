// Smoke test: cliente walk-in SIN email → registro con tel → fusión por tel.
//
// Escenario que antes no funcionaba (memoria/QA):
//  1. Reserva walk-in con nombre+tel, SIN email → ac_hash sin email
//  2. Cita completada → sello al ac_hash
//  3. Cliente se registra con nombre+tel+email → nuevo authUid
//  4. linkLegacy debe encontrar ac_hash POR TEL (antes solo buscaba por
//     tel-as-docId y por email — el ac_hash sin email quedaba huérfano)
//
// USO:
//   node _smoke-fusion-por-tel.mjs [--cleanup]

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

const usersCol = db.collection(`tenants/${TENANT}/users`);
const citasCol = db.collection(`tenants/${TENANT}/citas`);

const RUN_ID   = Date.now().toString(36);
const nombre   = `TELONLY Test ${RUN_ID}`;
const telefono = `+56955${String(Date.now()).slice(-6)}`;
const suf9     = telefono.replace(/\D/g, '').slice(-9);
const authUid  = `AUTHtel${RUN_ID.padEnd(21, 'x').slice(0, 21)}`;
// El authUid al registrarse SÍ tendrá email (obligatorio en el nuevo flow A).
const emailAuth = `telonly.${RUN_ID}@test.local`;

const results = [];
function assert(cond, label, extra = '') {
  results.push({ ok: !!cond, label });
  console.log(`   ${cond ? '✅' : '❌'} ${label}${extra ? ' — ' + extra : ''}`);
}
function head(msg) { console.log(`\n━━ ${msg} ${'━'.repeat(Math.max(0, 60 - msg.length))}`); }
function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
console.log(`║  SMOKE FUSIÓN POR TEL — ${TENANT} — run ${RUN_ID}`);
console.log(`╚══════════════════════════════════════════════════════════════╝`);
console.log(`   Nombre:   ${nombre}`);
console.log(`   Tel:      ${telefono}`);
console.log(`   AuthUid:  ${authUid}`);
console.log(`   Email:    ${emailAuth} (solo en el authUid, NO en el ac_hash)`);

// ── FASE 1: crear cita walk-in SIN email ────────────────────────────
head('FASE 1: reserva walk-in SIN email');
const hoy = new Date().toISOString().split('T')[0];
const citaRef = await citasCol.add({
  clienteNombre: nombre,
  clienteTelefono: telefono,
  // clienteEmail intencionalmente ausente
  servicioNombre: 'Corte Clásico',
  servicioId: 'test',
  barberoId: 'test',
  fecha: hoy, hora: '10:00',
  estado: 'Confirmada',
  precio: 15000,
  creadoEn: Timestamp.now(),
  _smokeTest: true,
});
await wait(10000);
const cita = (await citaRef.get()).data();
const acUid = cita?.clienteUid || null;
assert(!!acUid && acUid.startsWith('ac_'), `rescate creó ac_hash`, acUid);

const acData = (await usersCol.doc(acUid).get()).data();
assert(!acData?.email || acData.email === '', `ac_hash NO tiene email`, acData?.email || '(vacío)');
assert(acData?.telefono, `ac_hash SÍ tiene telefono`, acData?.telefono);
assert(acData?.telefonoSuf9 === suf9, `ac_hash tiene telefonoSuf9=${suf9}`, acData?.telefonoSuf9);

// ── FASE 2: completar cita (sello al ac_hash) ───────────────────────
head('FASE 2: completar cita → sello al ac_hash');
await citaRef.update({ estado: 'Completada' });
await wait(12000);
const acDataPostSello = (await usersCol.doc(acUid).get()).data();
assert(acDataPostSello?.sellosDisponibles === 1, `ac_hash tiene 1 sello`, String(acDataPostSello?.sellosDisponibles));

// ── FASE 3: simular registro con tel + email → dispara linkLegacy ───
head('FASE 3: registro (crea authUid con tel + email) → dispara linkLegacy');
const authRef = usersCol.doc(authUid);
await authRef.set({
  nombre,
  email: emailAuth,
  emailLower: emailAuth,
  telefono,
  telefonoSuf9: suf9,
  creadoEn: Timestamp.now(),
  _smokeTest: true,
});
console.log(`   users/${authUid} creado con tel + email`);

head('FASE 4: esperar linkLegacyTenant (~20s)');
await wait(20000);

const authAfter = (await authRef.get()).data();
const acAfter   = (await usersCol.doc(acUid).get()).data();

// ── Verificaciones fusión ───────────────────────────────────────────
head('VERIFICAR FUSIÓN');
assert(Number(authAfter?.sellosDisponibles || 0) === 1, `authUid.sellosDisponibles=1 (heredado)`, String(authAfter?.sellosDisponibles));
assert(Number(authAfter?.sellosHistoricos || 0) === 1, `authUid.sellosHistoricos=1`, String(authAfter?.sellosHistoricos));
assert(acAfter?.fusionadoCon === authUid, `ac_hash.fusionadoCon=${authUid}`, acAfter?.fusionadoCon || 'null');
assert(Number(acAfter?.sellosDisponibles || 0) === 0, `ac_hash.sellosDisponibles=0 (vaciado)`, String(acAfter?.sellosDisponibles));

// Resumen
head('RESUMEN');
const pass = results.filter(r => r.ok).length;
const fail = results.filter(r => !r.ok).length;
console.log(`   ${pass} ✅  ${fail} ${fail ? '❌' : '✅'}  (total ${results.length})`);

if (CLEANUP) {
  head('CLEANUP');
  try { await citaRef.delete(); } catch (_) {}
  try { await usersCol.doc(acUid).delete(); } catch (_) {}
  try { await authRef.delete(); } catch (_) {}
  console.log('   ✅ borrado');
}
process.exit(fail ? 1 : 0);
