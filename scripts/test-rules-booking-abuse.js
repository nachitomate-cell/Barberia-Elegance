#!/usr/bin/env node
/**
 * test-rules-booking-abuse.js — Endurecimiento del booking público.
 *
 * Verifica contra el emulador que la creación pública de citas
 * (bookingPublicoValido en firestore.rules) acepte una reserva legítima pero
 * RECHACE payloads basura: nombre gigante, tipos inválidos, fecha/hora
 * malformadas, nota gigante. Antes del endurecimiento del 2026-08-05 los casos
 * "basura" pasaban — hueco de validación de input en el camino público.
 *
 * OJO: esto NO cubre el flood de reservas BIEN formadas. Esa mitigación es
 * App Check (reCAPTCHA v3 + enforcement en Firestore), que no se puede probar
 * en el emulador de reglas. Ver el bloque App Check en firebase-config.js.
 *
 * Uso:  firebase emulators:exec --only firestore "node scripts/test-rules-booking-abuse.js"
 *       (necesita Java)
 */
const fs = require('fs');
const path = require('path');
const { initializeTestEnvironment, assertSucceeds, assertFails } =
  require('@firebase/rules-unit-testing');
const { doc, setDoc } = require('firebase/firestore');

const TID = 'demo';
const REGLAS = fs.readFileSync(path.resolve(__dirname, '..', 'firestore.rules'), 'utf8');

// Reserva pública legítima, calcada de firebaseUtils.js (addCita / addCitasGrupo):
// todos los campos con su tipo real y default '' donde aplica.
const citaOK = () => ({
  fecha: '2026-09-01',
  hora: '10:30',
  clienteNombre: 'Jose Perez',
  clienteTelefono: '956781234',
  clienteEmail: 'jose@example.com',
  duracionServicio: 30,
  barbero: 'Cristobal',
  estado: 'Confirmada',
  nota: '',
});

(async () => {
  const env = await initializeTestEnvironment({
    projectId: 'reglas-booking-test',
    firestore: { rules: REGLAS, host: '127.0.0.1', port: 8080 },
  });
  const anon = env.unauthenticatedContext().firestore();
  const ref = (id) => doc(anon, `tenants/${TID}/citas/${id}`);

  const casos = [
    // La reserva legítima DEBE seguir pasando: el endurecimiento no puede
    // romper el widget público real.
    ['reserva pública legítima SÍ se permite',
      () => setDoc(ref('ok1'), citaOK()), true],

    // Payloads basura que HOY pasan y no deberían (huecos que cierra el fix).
    ['nombre gigante (payload) se RECHAZA',
      () => setDoc(ref('junk1'), { ...citaOK(), clienteNombre: 'A'.repeat(5000) }), false],
    ['clienteNombre no-string se RECHAZA',
      () => setDoc(ref('junk2'), { ...citaOK(), clienteNombre: 123456 }), false],
    ['fecha malformada se RECHAZA',
      () => setDoc(ref('junk3'), { ...citaOK(), fecha: 'DROP' }), false],
    ['hora malformada se RECHAZA',
      () => setDoc(ref('junk4'), { ...citaOK(), hora: 'xx' }), false],
    ['nota gigante se RECHAZA',
      () => setDoc(ref('junk5'), { ...citaOK(), nota: 'B'.repeat(9000) }), false],

    // ── Piso de contacto (2026-08-05) ──────────────────────────────────
    // Basura estructural fuera…
    ['teléfono con letras se RECHAZA',
      () => setDoc(ref('tel1'), { ...citaOK(), clienteTelefono: 'no te importa' }), false],
    ['teléfono muy corto se RECHAZA',
      () => setDoc(ref('tel2'), { ...citaOK(), clienteTelefono: '123' }), false],
    ['correo sin @ se RECHAZA',
      () => setDoc(ref('mail1'), { ...citaOK(), clienteEmail: 'asdf' }), false],
    ['correo sin punto se RECHAZA',
      () => setDoc(ref('mail2'), { ...citaOK(), clienteEmail: 'yaite@' }), false],

    // …pero el piso NO puede castigar a clientes reales que se equivocaron.
    // Estos son datos textuales de producción: si alguno cae en deny, el
    // endurecimiento está mal calibrado y hay que aflojarlo, no "arreglar" el test.
    ['teléfono real mal tipeado (+5664748862) SÍ pasa',
      () => setDoc(ref('tel3'), { ...citaOK(), clienteTelefono: '+5664748862' }), true],
    ['teléfono con formato bonito SÍ pasa',
      () => setDoc(ref('tel4'), { ...citaOK(), clienteTelefono: '+56 9 1234 5678' }), true],
    ['teléfono vacío SÍ pasa (correo puede ser el único canal)',
      () => setDoc(ref('tel5'), { ...citaOK(), clienteTelefono: '' }), true],
    ['correo con TLD raro pero bien formado SÍ pasa (lo corrige el chip, no la regla)',
      () => setDoc(ref('mail3'), { ...citaOK(), clienteEmail: 'trefghut@mhhh.cpm' }), true],
    ['correo vacío SÍ pasa (correoObligatorio puede estar apagado)',
      () => setDoc(ref('mail4'), { ...citaOK(), clienteEmail: '' }), true],
    ['correo extranjero SÍ pasa',
      () => setDoc(ref('mail5'), { ...citaOK(), clienteEmail: 'karim.drozd@gmx.de' }), true],

    // Estos YA los cubría la regla original (regresión, deben seguir en deny).
    ['inyección de rol se RECHAZA',
      () => setDoc(ref('junk6'), { ...citaOK(), role: 'admin' }), false],
    ['faltan campos mínimos se RECHAZA',
      () => setDoc(ref('junk7'), { fecha: '2026-09-01', hora: '10:30' }), false],
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
    : `\n✅ ${casos.length}/${casos.length} — booking público validado\n`);
  process.exit(fallos ? 1 : 0);
})();
