#!/usr/bin/env node
/**
 * test-rules-roles.js — Pruebas de firestore.rules por ROL.
 *
 * Verifica contra el emulador que cada rol puede hacer su trabajo y NADA más.
 * Nació con el rol `recepcion` (opera el mostrador sin ver los números del
 * negocio), pero sirve para cualquier cambio futuro de permisos: esconder una
 * vista del panel es cosmético, lo que de verdad protege son estas reglas.
 *
 * Uso:  npm run test:rules
 *       (levanta el emulador de Firestore solo mientras corre; necesita Java)
 */
const fs = require('fs');
const path = require('path');
const { initializeTestEnvironment, assertSucceeds, assertFails } =
  require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc, updateDoc } = require('firebase/firestore');

const TID = 'delnero';
const REGLAS = fs.readFileSync(path.resolve(__dirname, '..', 'firestore.rules'), 'utf8');

(async () => {
  const env = await initializeTestEnvironment({
    projectId: 'reglas-roles-test',
    firestore: { rules: REGLAS, host: '127.0.0.1', port: 8080 },
  });

  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, `tenants/${TID}/citas/c1`),          { fecha: '2026-07-29', precio: 15000 });
    await setDoc(doc(db, `tenants/${TID}/clientes/x1`),       { nombre: 'Cliente' });
    await setDoc(doc(db, `tenants/${TID}/gastos/g1`),         { monto: 50000, concepto: 'Arriendo' });
    await setDoc(doc(db, `tenants/${TID}/caja_sesiones/s1`),  { abierta: true });
    await setDoc(doc(db, `tenants/${TID}/productos/p1`),      { nombre: 'Cera', precio: 8990, stock: 5 });

    // ── Planes del add-on de WhatsApp (ver lib/wa-plan.js) ──
    // Un tenant por plan, para probar que el local no se auto-contrata nada.
    await setDoc(doc(db, '_system/t_rec'),    { waPlan: 'recordatorios' });
    await setDoc(doc(db, '_system/t_bot'),    { waPlan: 'bot' });
    await setDoc(doc(db, '_system/t_full'),   { waPlan: 'full' });
    await setDoc(doc(db, '_system/t_legacy'), { waAsistente: true });   // pre-planes
    await setDoc(doc(db, '_system/t_nada'),   { });
    for (const t of ['t_rec', 't_bot', 't_full', 't_legacy', 't_nada']) {
      await setDoc(doc(db, `tenants/${t}/configuracion/whatsapp`), { estadoConexion: 'disconnected' });
    }
    // Tenant que quedó con el bot encendido de un plan anterior: al bajarlo a
    // 'recordatorios' NO debe quedar con la configuración trabada.
    await setDoc(doc(db, '_billing/delnero'), { monto: 14900 });
    await setDoc(doc(db, '_ingresos/2026-07'), { total: 100000 });
    await setDoc(doc(db, '_system/t_bajado'), { waPlan: 'recordatorios' });
    await setDoc(doc(db, 'tenants/t_bajado/configuracion/whatsapp'),
                 { estadoConexion: 'connected', botEnabled: true, recordatorio: { ventanaHoras: 24 } });
  });

  const como = (role, tid = TID) =>
    env.authenticatedContext(`u_${role}_${tid}`, { role, tenantId: tid }).firestore();
  const recepcion = como('recepcion');
  const admin     = como('admin');
  const barbero   = como('barbero');

  const wa = (cliente, tid) => doc(cliente, `tenants/${tid}/configuracion/whatsapp`);
  const adminDe = (tid) => como('admin', tid);

  // Operadores de la plataforma: se identifican por EMAIL en las reglas, no
  // por rol de tenant. El socio developer opera todo menos los números.
  const socio = env.authenticatedContext('u_socio', { email: 'simpson7gonzalo@gmail.com' }).firestore();
  const boot  = env.authenticatedContext('u_boot',  { email: 'ignaciiio.mate@gmail.com' }).firestore();

  const casos = [
    // ── recepcion: SÍ puede trabajar ──
    ['recepción lee citas',                    () => getDoc(doc(recepcion, `tenants/${TID}/citas/c1`)),            true],
    ['recepción lee clientes',                 () => getDoc(doc(recepcion, `tenants/${TID}/clientes/x1`)),         true],
    ['recepción lee la caja',                  () => getDoc(doc(recepcion, `tenants/${TID}/caja_sesiones/s1`)),    true],
    ['recepción ajusta stock (inventario)',    () => updateDoc(doc(recepcion, `tenants/${TID}/productos/p1`), { stock: 4 }), true],

    // ── recepcion: NO ve/toca la plata del negocio ──
    ['recepción NO lee gastos',                () => getDoc(doc(recepcion, `tenants/${TID}/gastos/g1`)),           false],
    ['recepción NO crea gastos',               () => setDoc(doc(recepcion, `tenants/${TID}/gastos/g2`), { monto: 1 }), false],
    ['recepción NO cambia precios',            () => updateDoc(doc(recepcion, `tenants/${TID}/productos/p1`), { precio: 1 }), false],

    // ── no rompimos los roles que ya existían ──
    ['admin sí lee gastos',                    () => getDoc(doc(admin, `tenants/${TID}/gastos/g1`)),               true],
    ['admin sí cambia precios',                () => updateDoc(doc(admin, `tenants/${TID}/productos/p1`), { precio: 9990 }), true],
    ['barbero lee citas',                      () => getDoc(doc(barbero, `tenants/${TID}/citas/c1`)),              true],
    ['barbero NO lee gastos',                  () => getDoc(doc(barbero, `tenants/${TID}/gastos/g1`)),             false],

    // ── Planes de WhatsApp: el local NO se auto-contrata un módulo ──
    ['plan recordatorios: SÍ enciende confirmaciones',
      () => updateDoc(wa(adminDe('t_rec'), 't_rec'), { confirmacionesEnabled: true }), true],
    ['plan recordatorios: NO enciende el bot',
      () => updateDoc(wa(adminDe('t_rec'), 't_rec'), { botEnabled: true }), false],
    ['plan bot: SÍ enciende el bot',
      () => updateDoc(wa(adminDe('t_bot'), 't_bot'), { botEnabled: true }), true],
    ['plan bot: NO enciende confirmaciones',
      () => updateDoc(wa(adminDe('t_bot'), 't_bot'), { confirmacionesEnabled: true }), false],
    ['plan full: enciende ambos',
      () => updateDoc(wa(adminDe('t_full'), 't_full'), { botEnabled: true, confirmacionesEnabled: true }), true],
    ['legacy waAsistente:true vale por plan full',
      () => updateDoc(wa(adminDe('t_legacy'), 't_legacy'), { botEnabled: true, confirmacionesEnabled: true }), true],
    ['sin plan: NO enciende nada',
      () => updateDoc(wa(adminDe('t_nada'), 't_nada'), { botEnabled: true }), false],
    ['sin plan: SÍ puede editar lo que no es un módulo',
      () => updateDoc(wa(adminDe('t_nada'), 't_nada'), { estiloChileno: true }), true],
    ['apagar siempre se puede, esté o no en el plan',
      () => updateDoc(wa(adminDe('t_bajado'), 't_bajado'), { botEnabled: false }), true],
    ['bajado de plan: NO queda trabado editando el resto del doc',
      () => updateDoc(wa(adminDe('t_bajado'), 't_bajado'), { recordatorio: { ventanaHoras: 12 } }), true],

    // ── Socio developer: opera la plataforma pero NO ve la plata ──
    // Esconder la tarjeta en /admin es cosmético; el candado es este.
    ['socio NO lee _billing (ingresos proyectados)',
      () => getDoc(doc(socio, '_billing/delnero')), false],
    ['socio NO lee _ingresos',
      () => getDoc(doc(socio, '_ingresos/2026-07')), false],
    ['socio SÍ opera _system (planes, kill switch)',
      () => setDoc(doc(socio, '_system/t_rec'), { waPlan: 'bot' }, { merge: true }), true],
    ['socio SÍ opera wa_notif',
      () => setDoc(doc(socio, 'wa_notif/t_rec'), { planCliente: true }, { merge: true }), true],
    ['socio SÍ lee las citas de un local',
      () => getDoc(doc(socio, `tenants/${TID}/citas/c1`)), true],
    ['bootstrap SÍ lee _billing',
      () => getDoc(doc(boot, '_billing/delnero')), true],
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
    : `\n✅ ${casos.length}/${casos.length} — las reglas hacen exactamente lo que queremos\n`);
  process.exit(fallos ? 1 : 0);
})();
