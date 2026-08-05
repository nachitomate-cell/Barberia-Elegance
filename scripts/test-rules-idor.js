#!/usr/bin/env node
/**
 * test-rules-idor.js — IDOR / escritura cross-tenant en firestore.rules.
 *
 * Cubre dos huecos de la auditoría 2026-08-05:
 *   1. fcm_tokens (raíz y por-tenant): `write: if autenticado()` dejaba a
 *      cualquier usuario escribir tokens en el store de OTRO local. Son tokens
 *      de STAFF (agenda/panel); los de cliente viven en fcm_clientes. Fix:
 *      write solo para esStaff del tenant dueño.
 *   2. clientes update: la rama de doc sin `uid` dejaba a cualquier autenticado
 *      EDITAR/vandalizar registros legacy. Fix: solo se puede tocar un doc sin
 *      dueño si el write toma posesión (uid == self) — calcado de perfil.js.
 *
 * Uso:  firebase emulators:exec --only firestore "node scripts/test-rules-idor.js"
 */
const fs = require('fs');
const path = require('path');
const { initializeTestEnvironment, assertSucceeds, assertFails } =
  require('@firebase/rules-unit-testing');
const { doc, setDoc, updateDoc } = require('firebase/firestore');

const REGLAS = fs.readFileSync(path.resolve(__dirname, '..', 'firestore.rules'), 'utf8');

(async () => {
  const env = await initializeTestEnvironment({
    projectId: 'reglas-idor-test',
    firestore: { rules: REGLAS, host: '127.0.0.1', port: 8080 },
  });

  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    // clientes (raíz = tenant elegance)
    await setDoc(doc(db, 'clientes/mio'),         { nombre: 'Yo',    uid: 'u_cliente' });
    await setDoc(doc(db, 'clientes/legacyVandal'),{ nombre: 'Viejo', telefono: '111', uid: '' });
    await setDoc(doc(db, 'clientes/legacyClaim'), { nombre: 'Viejo', telefono: '222', uid: '' });
    await setDoc(doc(db, 'clientes/ajeno'),       { nombre: 'Otro',  uid: 'u_victima' });
  });

  const staffA  = env.authenticatedContext('u_staffA', { role: 'barbero', tenantId: 'tenantA' }).firestore();
  const staffE  = env.authenticatedContext('u_staffE', { role: 'barbero', tenantId: 'elegance' }).firestore();
  const cliente = env.authenticatedContext('u_cliente', {}).firestore(); // cliente: autenticado, sin claims de staff

  const tok = { token: 'x', uid: 'u_staffA', activo: true };

  const casos = [
    // ── fcm_tokens: cross-tenant / no-staff ──
    ['staff escribe fcm_tokens de SU tenant',
      () => setDoc(doc(staffA, 'tenants/tenantA/fcm_tokens/tokA'), tok), true],
    ['staff NO escribe fcm_tokens de OTRO tenant',
      () => setDoc(doc(staffA, 'tenants/tenantB/fcm_tokens/tokX'), tok), false],
    ['no-staff NO escribe fcm_tokens por-tenant',
      () => setDoc(doc(cliente, 'tenants/tenantA/fcm_tokens/tokY'), tok), false],
    ['staff elegance escribe fcm_tokens raíz',
      () => setDoc(doc(staffE, 'fcm_tokens/tokE'), tok), true],
    ['no-staff NO escribe fcm_tokens raíz',
      () => setDoc(doc(cliente, 'fcm_tokens/tokZ'), tok), false],

    // ── clientes: IDOR de docs legacy ──
    ['cliente edita su propio doc (uid==self)',
      () => updateDoc(doc(cliente, 'clientes/mio'), { nombre: 'Yo v2' }), true],
    ['cliente NO vandaliza doc legacy sin reclamarlo',
      () => updateDoc(doc(cliente, 'clientes/legacyVandal'), { nombre: 'hackeado' }), false],
    ['cliente SÍ reclama legacy tomando posesión (uid=self)',
      () => updateDoc(doc(cliente, 'clientes/legacyClaim'), { nombre: 'mio', uid: 'u_cliente' }), true],
    ['cliente NO edita doc de OTRO dueño',
      () => updateDoc(doc(cliente, 'clientes/ajeno'), { nombre: 'hack' }), false],
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
    : `\n✅ ${casos.length}/${casos.length} — sin IDOR ni escritura cross-tenant\n`);
  process.exit(fallos ? 1 : 0);
})();
