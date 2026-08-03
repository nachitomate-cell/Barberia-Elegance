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
const { doc, getDoc, setDoc, updateDoc, deleteDoc,
        collection, query, where, getDocs } = require('firebase/firestore');

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
    // La excepción de recepción sobre configuracion/main compara contra el doc
    // existente (diff), así que tiene que existir antes de la prueba.
    await setDoc(doc(db, `tenants/${TID}/configuracion/main`), { diasLaborales: [1, 2, 3, 4, 5], categoriasProducto: [] });

    // ── Liquidaciones (banner "Confirmar recibo") ──
    // liq1: barberoId = UID directo (docs unificados).
    // liq2: barberoId = doc principal; el barbero autentica con su UID y su
    //       doc-espejo apunta vía _mainDocId (caso Araceli/kronnos_penablanca).
    await setDoc(doc(db, `tenants/${TID}/gastos/liq1`),
                 { tipo: 'liquidacion', barberoId: `u_barbero_${TID}`, monto: 100000, aceptacionBarbero: 'pendiente' });
    await setDoc(doc(db, `tenants/${TID}/barberos/u_espejo_${TID}`),
                 { _mainDocId: 'ara-main', uid: `u_espejo_${TID}`, rol: 'barbero', activo: true });
    await setDoc(doc(db, `tenants/${TID}/gastos/liq2`),
                 { tipo: 'liquidacion', barberoId: 'ara-main', monto: 50000, aceptacionBarbero: 'pendiente' });

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
  // Barbero que autentica con UID pero cuya liquidación apunta al doc
  // principal (espejo _mainDocId). `como()` metería 'espejo' como role,
  // así que se construye a mano con claims reales de barbero.
  const espejoDb  = env.authenticatedContext(`u_espejo_${TID}`, { role: 'barbero', tenantId: TID }).firestore();

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

    // ── recepcion: gestiona el catálogo de productos completo ──
    // Decisión de producto 2026-08-01: recibe la mercadería y la carga, así que
    // maneja alta/precio/baja igual que un admin. Ojo: el guardado real del
    // panel manda `updatedAt` junto con el resto, por eso se prueba así y no
    // con un campo suelto — con la regla vieja (`hasOnly(['stock'])`) esto
    // fallaba incluso cuando lo único que cambiaba era la cantidad.
    ['recepción edita precio + nombre',        () => updateDoc(doc(recepcion, `tenants/${TID}/productos/p1`), { precio: 7990, nombre: 'Cera fuerte', updatedAt: new Date() }), true],
    ['recepción da de alta un producto',       () => setDoc(doc(recepcion, `tenants/${TID}/productos/p2`), { nombre: 'Shampoo', precio: 5990, stock: 3 }), true],
    ['recepción elimina un producto',          () => deleteDoc(doc(recepcion, `tenants/${TID}/productos/p2`)), true],
    ['recepción crea categoría de producto',   () => updateDoc(doc(recepcion, `tenants/${TID}/configuracion/main`), { categoriasProducto: ['Aceites'] }), true],

    // ── recepcion: NO ve/toca la plata del negocio ──
    ['recepción NO lee gastos',                () => getDoc(doc(recepcion, `tenants/${TID}/gastos/g1`)),           false],
    ['recepción NO crea gastos',               () => setDoc(doc(recepcion, `tenants/${TID}/gastos/g2`), { monto: 1 }), false],
    // El permiso de productos NO se le puede escapar al resto de configuracion.
    ['recepción NO toca otra config',          () => updateDoc(doc(recepcion, `tenants/${TID}/configuracion/main`), { diasLaborales: [1] }), false],
    ['recepción NO cuela config junto a la categoría',
      () => updateDoc(doc(recepcion, `tenants/${TID}/configuracion/main`), { categoriasProducto: ['X'], diasLaborales: [1] }), false],
    ['barbero NO cambia precios',              () => updateDoc(doc(barbero, `tenants/${TID}/productos/p1`), { precio: 1 }), false],

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

    // ── Liquidaciones: el barbero confirma el recibo de SU pago ──
    // El banner de agenda.html quedaba en permission-denied para rol barbero
    // (caso Araceli/kronnos_penablanca, 2026-08-02). Ojo con el orden: los
    // casos que ACEPTAN mutan el doc, van al final de su grupo.
    ['barbero lee SU liquidación pendiente',
      () => getDoc(doc(barbero, `tenants/${TID}/gastos/liq1`)), true],
    ['banner: query liquidaciones pendientes (uid directo)',
      () => getDocs(query(collection(barbero, `tenants/${TID}/gastos`),
        where('tipo', '==', 'liquidacion'),
        where('barberoId', '==', `u_barbero_${TID}`),
        where('aceptacionBarbero', '==', 'pendiente'))), true],
    ['banner: query liquidaciones pendientes (vía espejo _mainDocId)',
      () => getDocs(query(collection(espejoDb, `tenants/${TID}/gastos`),
        where('tipo', '==', 'liquidacion'),
        where('barberoId', '==', 'ara-main'),
        where('aceptacionBarbero', '==', 'pendiente'))), true],
    ['barbero NO cambia el monto de su liquidación',
      () => updateDoc(doc(barbero, `tenants/${TID}/gastos/liq1`), { monto: 1 }), false],
    ['barbero NO cuela el monto junto a la aceptación',
      () => updateDoc(doc(barbero, `tenants/${TID}/gastos/liq1`),
        { aceptacionBarbero: 'aceptada', aceptacionFecha: new Date(), aceptacionUid: `u_barbero_${TID}`, monto: 1 }), false],
    ['barbero NO firma la aceptación con otro uid',
      () => updateDoc(doc(barbero, `tenants/${TID}/gastos/liq1`),
        { aceptacionBarbero: 'aceptada', aceptacionFecha: new Date(), aceptacionUid: 'otro' }), false],
    ['barbero NO lee ni acepta liquidación AJENA',
      () => updateDoc(doc(barbero, `tenants/${TID}/gastos/liq2`),
        { aceptacionBarbero: 'aceptada', aceptacionFecha: new Date(), aceptacionUid: `u_barbero_${TID}` }), false],
    ['barbero acepta SU liquidación (solo 3 campos + su uid)',
      () => updateDoc(doc(barbero, `tenants/${TID}/gastos/liq1`),
        { aceptacionBarbero: 'aceptada', aceptacionFecha: new Date(), aceptacionUid: `u_barbero_${TID}` }), true],
    ['espejo acepta la suya (barberoId = doc principal)',
      () => updateDoc(doc(espejoDb, `tenants/${TID}/gastos/liq2`),
        { aceptacionBarbero: 'aceptada', aceptacionFecha: new Date(), aceptacionUid: `u_espejo_${TID}` }), true],
    ['aceptada NO se vuelve a tocar (ni re-aceptar)',
      () => updateDoc(doc(barbero, `tenants/${TID}/gastos/liq1`),
        { aceptacionBarbero: 'aceptada', aceptacionFecha: new Date(), aceptacionUid: `u_barbero_${TID}` }), false],
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
