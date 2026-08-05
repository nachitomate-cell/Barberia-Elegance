#!/usr/bin/env node
/**
 * test-storage-rules.js — Autorización de escritura en storage.rules.
 *
 * Verifica que los assets de MARCA (barberos, marketing, logo, menú, wallo…)
 * solo los escriba staff del tenant, y que las rutas de USUARIO (avatar) sigan
 * siendo del dueño. Antes cualquier autenticado escribía en cualquier local
 * (defacement + costo). Auditoría 2026-08-05.
 *
 * Necesita AMBOS emuladores (el fallback esBarberoFS usa firestore.exists):
 *   firebase emulators:exec --only storage,firestore "node scripts/test-storage-rules.js"
 */
const fs = require('fs');
const path = require('path');
const { initializeTestEnvironment, assertSucceeds, assertFails } =
  require('@firebase/rules-unit-testing');
const { ref, uploadBytes } = require('firebase/storage');

const S_RULES = fs.readFileSync(path.resolve(__dirname, '..', 'storage.rules'), 'utf8');
const F_RULES = fs.readFileSync(path.resolve(__dirname, '..', 'firestore.rules'), 'utf8');
const PNG  = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]); // firma PNG
const META = { contentType: 'image/png' };

(async () => {
  const env = await initializeTestEnvironment({
    projectId: 'reglas-storage-test',
    storage:   { rules: S_RULES, host: '127.0.0.1', port: 9199 },
    firestore: { rules: F_RULES, host: '127.0.0.1', port: 8080 },
  });

  const staffA   = env.authenticatedContext('u_staffA', { role: 'barbero', tenantId: 'tenantA' }).storage();
  const cliente  = env.authenticatedContext('u_cli', {}).storage(); // autenticado, sin claims de staff

  const up = (st, p, bytes = PNG, meta = META) => uploadBytes(ref(st, p), bytes, meta);

  const casos = [
    ['staff sube foto de barbero de SU tenant',
      () => up(staffA, 'tenants/tenantA/barberos/x.png'), true],
    ['staff NO sube a OTRO tenant (defacement)',
      () => up(staffA, 'tenants/tenantB/barberos/x.png'), false],
    ['cliente NO sube foto de barbero',
      () => up(cliente, 'tenants/tenantA/barberos/x.png'), false],
    ['cliente NO sube banner de marketing',
      () => up(cliente, 'tenants/tenantA/marketing/x.png'), false],
    ['cliente NO sube al TV (tv-bg)',
      () => up(cliente, 'tenants/tenantA/tv-bg.png'), false],
    ['cliente SÍ sube su propio avatar',
      () => up(cliente, 'tenants/tenantA/avatars/u_cli/x.png'), true],
    ['cliente NO sube al avatar de otro',
      () => up(cliente, 'tenants/tenantA/avatars/otro/x.png'), false],
    ['staff NO sube archivo >5MB',
      () => up(staffA, 'tenants/tenantA/barberos/big.png', new Uint8Array(6 * 1024 * 1024)), false],
    ['staff NO sube no-imagen',
      () => up(staffA, 'tenants/tenantA/barberos/x.txt', new Uint8Array([1, 2, 3]), { contentType: 'text/plain' }), false],
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
  console.log(fallos
    ? `\n❌ ${fallos} de ${casos.length} fallaron\n`
    : `\n✅ ${casos.length}/${casos.length} — storage con escritura por tenant\n`);
  process.exit(fallos ? 1 : 0);
})();
