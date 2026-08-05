#!/usr/bin/env node
/**
 * test-rules-hardening.js — Endurecimiento slotLocks + system_errors.
 *
 * #4 slotLocks: create público ahora valida tipos/formato (antes aceptaba
 *    fecha/hora basura y barberoId gigante → polución de la disponibilidad).
 * #5 system_errors: `write: if true` dejaba a cualquiera BORRAR/editar logs y
 *    crear docs sin cota. Ahora create acotado; update/delete solo superadmin.
 * Auditoría 2026-08-05.
 *
 * Uso: firebase emulators:exec --only firestore "node scripts/test-rules-hardening.js"
 */
const fs = require('fs');
const path = require('path');
const { initializeTestEnvironment, assertSucceeds, assertFails } =
  require('@firebase/rules-unit-testing');
const { doc, setDoc, updateDoc, deleteDoc, serverTimestamp } = require('firebase/firestore');

const TID = 'demo';
const REGLAS = fs.readFileSync(path.resolve(__dirname, '..', 'firestore.rules'), 'utf8');

const lock = (over = {}) => ({
  citaId: 'c1', creadoEn: serverTimestamp(), fecha: '2026-09-01',
  hora: '10:30', barberoId: 'u_b1', duracion: 30, ...over,
});

(async () => {
  const env = await initializeTestEnvironment({
    projectId: 'reglas-hardening-test',
    firestore: { rules: REGLAS, host: '127.0.0.1', port: 8080 },
  });
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'system_errors/e1'), { status: 'open', msg: 'x' });
  });

  const anon = env.unauthenticatedContext().firestore();
  const boot = env.authenticatedContext('u_boot', { email: 'ignaciiio.mate@gmail.com' }).firestore();
  const slot = (id) => doc(anon, `tenants/${TID}/slotLocks/${id}`);
  const big = {}; for (let i = 0; i < 50; i++) big['k' + i] = i;

  const casos = [
    // ── #4 slotLocks ──
    ['slotLock público válido se permite',
      () => setDoc(slot('u_b1_2026-09-01_1030'), lock()), true],
    ['slotLock fecha malformada se RECHAZA',
      () => setDoc(slot('junk1'), lock({ fecha: 'DROP' })), false],
    ['slotLock hora malformada se RECHAZA',
      () => setDoc(slot('junk2'), lock({ hora: 'xx' })), false],
    ['slotLock barberoId gigante se RECHAZA',
      () => setDoc(slot('junk3'), lock({ barberoId: 'A'.repeat(200) })), false],
    ['slotLock con clave extra se RECHAZA',
      () => setDoc(slot('junk4'), lock({ hacked: true })), false],

    // ── #5 system_errors ──
    ['crear log chico (anónimo) se permite',
      () => setDoc(doc(anon, 'system_errors/ok1'), { status: 'open', msg: 'boom', url: '/x' }), true],
    ['crear log con 50 claves se RECHAZA',
      () => setDoc(doc(anon, 'system_errors/junk5'), big), false],
    ['anónimo NO edita un log (tamper)',
      () => updateDoc(doc(anon, 'system_errors/e1'), { status: 'resolved' }), false],
    ['anónimo NO borra un log',
      () => deleteDoc(doc(anon, 'system_errors/e1')), false],
    ['superadmin SÍ resuelve un log',
      () => updateDoc(doc(boot, 'system_errors/e1'), { status: 'resolved' }), true],
  ];

  let fallos = 0;
  for (const [desc, fn, debePasar] of casos) {
    try {
      await (debePasar ? assertSucceeds(fn()) : assertFails(fn()));
      console.log(`  ✓ ${desc}`);
    } catch (e) {
      fallos++;
      console.log(`  ✗ ${desc}\n      ${String(e.message).split('\n')[0].slice(0, 100)}`);
    }
  }
  await env.cleanup();
  console.log(fallos ? `\n❌ ${fallos} de ${casos.length} fallaron\n`
                     : `\n✅ ${casos.length}/${casos.length} — slotLocks + system_errors endurecidos\n`);
  process.exit(fallos ? 1 : 0);
})();
