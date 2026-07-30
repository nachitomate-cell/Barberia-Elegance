#!/usr/bin/env node
/**
 * test-rules-cancelar-cliente.js — ¿puede un cliente cancelar su propia cita?
 *
 * Caso real: Tomás Bernal (Aura, 30-jul-2026) escribió "tengo dos citas
 * agendadas y no me deja cancelar una".
 *
 * El dashboard del cliente llama a FDB.updateCitaEstado(), que al cancelar
 * escribe DOS campos: `estado` y `canceladaPor: 'cliente'` (el segundo lo
 * agregó e499d20 para que la CF avise al staff). Pero la regla del cliente
 * exige `affectedKeys().hasOnly(['estado'])`, así que el write de dos campos se
 * rechaza y el cliente ve "No se pudo cancelar la cita".
 *
 * Un cliente NO tiene forma de saltarlo. Los únicos que cancelan bien son los
 * que además son staff (pasan por la rama esStaff, que permite cualquier
 * update) — por eso en producción las únicas citas con `canceladaPor` las
 * escribieron el superadmin y un admin de local.
 *
 * Uso:  npm run test:cancelar
 *       (levanta el emulador de Firestore solo mientras corre; necesita Java)
 */
const fs = require('fs');
const path = require('path');
const { initializeTestEnvironment, assertSucceeds, assertFails } =
  require('@firebase/rules-unit-testing');
const { doc, setDoc, updateDoc } = require('firebase/firestore');

const TID = 'aura';
const UID_CLIENTE = 'uid_tomas';
const EMAIL_CLIENTE = 'tomasbernalarcila28@gmail.com';
const REGLAS = fs.readFileSync(path.resolve(__dirname, '..', 'firestore.rules'), 'utf8');

(async () => {
  const env = await initializeTestEnvironment({
    projectId: 'reglas-cancelar-test',
    firestore: { rules: REGLAS, host: '127.0.0.1', port: 8080 },
  });

  const sembrar = async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      const base = {
        fecha: '2026-08-15', hora: '19:00', estado: 'Confirmada',
        clienteUid: UID_CLIENTE, clienteEmail: EMAIL_CLIENTE,
        clienteNombre: 'Tomas Bernal', servicioNombre: '2 cortes al mes',
      };
      // Un doc por caso: si se comparten, un caso que falla deja el doc sin
      // cambiar y el siguiente escribe el MISMO valor — el diff queda vacío y
      // la regla lo acepta por vacuidad, no por permiso. (Me pasó al escribir
      // este test: daba "el cliente puede reactivar su cita" y era mentira.)
      for (const id of ['c_solo_estado', 'c_dos_campos', 'c_ajeno',
                        'c_completar', 'c_precio', 'c_staff', 'c_como_staff'])
        await setDoc(doc(db, `tenants/${TID}/citas/${id}`), { ...base });
      // Cita de otra persona: el cliente no debe poder tocarla.
      await setDoc(doc(db, `tenants/${TID}/citas/c_ajeno`),
        { ...base, clienteUid: 'otro_uid', clienteEmail: 'otro@gmail.com' });
    });
  };
  await sembrar();

  // El cliente: autenticado, con su uid y su email. NO es staff.
  const cliente = env.authenticatedContext(UID_CLIENTE, { email: EMAIL_CLIENTE }).firestore();
  const staff   = env.authenticatedContext('u_admin', { role: 'admin', tenantId: TID }).firestore();

  const casos = [
    ['cliente cancela escribiendo SOLO estado',
      () => updateDoc(doc(cliente, `tenants/${TID}/citas/c_solo_estado`), { estado: 'Cancelada' }), true],

    // Este es el que hace el dashboard de verdad.
    ['cliente cancela como lo hace el dashboard (estado + canceladaPor)',
      () => updateDoc(doc(cliente, `tenants/${TID}/citas/c_dos_campos`),
        { estado: 'Cancelada', canceladaPor: 'cliente' }), true],

    // Lo que NO debe poder, para no abrir la puerta de más al arreglar.
    ['cliente NO cancela la cita de otra persona',
      () => updateDoc(doc(cliente, `tenants/${TID}/citas/c_ajeno`),
        { estado: 'Cancelada', canceladaPor: 'cliente' }), false],
    ['cliente NO se pone canceladaPor: staff',
      () => updateDoc(doc(cliente, `tenants/${TID}/citas/c_staff`),
        { estado: 'Cancelada', canceladaPor: 'staff' }), false],
    // Cambio REAL de estado (Confirmada -> Completada): marcarse la cita como
    // hecha es de la casa, no del cliente.
    ['cliente NO se marca la cita como Completada',
      () => updateDoc(doc(cliente, `tenants/${TID}/citas/c_completar`), { estado: 'Completada' }), false],
    ['cliente NO se cambia el precio de paso',
      () => updateDoc(doc(cliente, `tenants/${TID}/citas/c_precio`),
        { estado: 'Cancelada', precio: 0 }), false],

    // El staff sigue pudiendo todo.
    ['staff cancela con canceladaPor',
      () => updateDoc(doc(staff, `tenants/${TID}/citas/c_como_staff`),
        { estado: 'Cancelada', canceladaPor: 'staff' }), true],
  ];

  let fallos = 0;
  for (const [nombre, fn, debePasar] of casos) {
    try {
      await (debePasar ? assertSucceeds(fn()) : assertFails(fn()));
      console.log(`  ✓ ${nombre}`);
    } catch (e) {
      fallos++;
      console.log(`  ✗ ${nombre}  —  ${debePasar ? 'debía PERMITIRSE y se rechazó' : 'debía RECHAZARSE y pasó'}`);
    }
  }

  await env.cleanup();
  console.log(fallos === 0 ? '\nOK — el cliente puede cancelar su cita y nada más\n' : `\n${fallos} fallo(s)\n`);
  process.exit(fallos ? 1 : 0);
})();
