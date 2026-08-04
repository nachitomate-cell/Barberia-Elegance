#!/usr/bin/env node
/**
 * test-caja-gastos-dia.js — recepción puede cuadrar la caja sin ver la planilla.
 *
 * /gastos es admin-only con razón: las liquidaciones de los barberos son
 * documentos de esa colección (`tipo: 'liquidacion'`), así que abrirla le
 * mostraría a recepción cuánto gana cada profesional.
 *
 * Pero el arqueo los necesita: un gasto en efectivo sale del cajón. Sin esto,
 * la caja le mostraba a recepción "no pudimos cargar los gastos de hoy — no
 * cierres la caja con estos números" (kronnos Peñablanca, 04-08).
 *
 * Lo que se prueba acá es la parte que no puede fallar: que el total en
 * efectivo salga EXACTO (si no, el arqueo miente) y que ningún nombre ni
 * monto individual de una liquidación se escape en la respuesta.
 *
 * Uso:  npm run test:caja-gastos
 */
const Module = require('module');

let docsFake = [];
const colStub = () => ({
  where: function () { return this; },
  get: async () => ({ forEach: (f) => docsFake.forEach((d, i) => f({ id: `g${i}`, data: () => d })) }),
});

let capturado = null;
const origLoad = Module._load;
Module._load = function (req) {
  if (req === 'firebase-admin') {
    return {
      firestore: Object.assign(() => ({ collection: colStub }), {
        Timestamp: { fromMillis: (m) => ({ _ms: m }) },
      }),
    };
  }
  if (req === 'firebase-functions') return { logger: { info(){}, warn(){}, error(){} } };
  if (req === 'firebase-functions/v2/https') {
    return {
      onCall: (_opts, handler) => { capturado = handler; return handler; },
      HttpsError: class extends Error { constructor(code, msg) { super(msg); this.code = code; } },
    };
  }
  return origLoad.apply(this, arguments);
};
require('../functions/caja-gastos-dia');
Module._load = origLoad;

const HOY = Date.UTC(2026, 7, 4);
const llamar = (data, claims) => capturado({
  auth: { token: { email: 'recepcion@local.cl', ...claims } },
  data: { tenantId: 'kronnos_penablanca', desdeMs: HOY, hastaMs: HOY + 86400000, ...data },
});

let fallos = 0;
const chk = (ok, detalle) => { if (!ok) { fallos++; console.log(`      ✗ ${detalle}`); } return ok; };
const casos = [];
const caso = (t, fn) => casos.push([t, fn]);

const RECEPCION = { role: 'recepcion', tenantId: 'kronnos_penablanca' };

/* ── Sumar bien es lo primero: si el efectivo no calza, el arqueo miente ── */

caso('el efectivo total sale exacto, con liquidaciones incluidas', async () => {
  docsFake = [
    { descripcion: 'Shampoo',   monto: 12000, metodoPago: 'Efectivo',      categoria: 'Insumos' },
    { descripcion: 'Liq. Juan', monto: 80000, metodoPago: 'Efectivo',      tipo: 'liquidacion', barberoId: 'juan' },
    { descripcion: 'Liq. Ana',  monto: 50000, metodoPago: 'Transferencia', tipo: 'liquidacion', barberoId: 'ana' },
  ];
  const r = await llamar({}, RECEPCION);
  const efectivo = r.gastos.reduce((s, g) => {
    if (Array.isArray(g.pagos)) return s + g.pagos.filter(p => p.tipo === 'Efectivo').reduce((a, p) => a + p.monto, 0);
    return s + (g.metodoPago === 'Efectivo' ? g.monto : 0);
  }, 0);
  chk(efectivo === 92000, `efectivo=${efectivo}, esperaba 92000 (12.000 + 80.000)`);
});

caso('liquidación con pago dividido: solo su parte en efectivo sale del cajón', async () => {
  docsFake = [{
    descripcion: 'Liq. Juan', monto: 100000, metodoPago: 'Mixto', tipo: 'liquidacion', barberoId: 'juan',
    pagos: [{ tipo: 'Efectivo', monto: 30000 }, { tipo: 'Transferencia', monto: 70000 }],
  }];
  const r = await llamar({}, RECEPCION);
  const g = r.gastos[0];
  const efectivo = g.pagos.filter(p => p.tipo === 'Efectivo').reduce((a, p) => a + p.monto, 0);
  chk(efectivo === 30000, `efectivo=${efectivo}, esperaba 30000`);
  chk(g.monto === 100000, `total=${g.monto}, esperaba 100000`);
});

caso('gasto sin método se cuenta como efectivo (salió del cajón igual)', async () => {
  docsFake = [{ descripcion: 'Liq. X', monto: 7000, tipo: 'liquidacion', barberoId: 'x' }];
  const r = await llamar({}, RECEPCION);
  chk(r.gastos[0].metodoPago === 'Efectivo', `metodoPago=${r.gastos[0].metodoPago}`);
  chk(r.gastos[0].monto === 7000, 'monto perdido');
});

/* ── Y no filtrar la planilla es lo segundo ── */

caso('no se escapa ningún nombre ni monto individual de liquidación', async () => {
  docsFake = [
    { descripcion: 'Liquidación Juan Pérez', monto: 80000, metodoPago: 'Efectivo', tipo: 'liquidacion', barberoId: 'juan', barberoNombre: 'Juan Pérez' },
    { descripcion: 'Liquidación Ana Soto',   monto: 50000, metodoPago: 'Efectivo', tipo: 'liquidacion', barberoId: 'ana',  barberoNombre: 'Ana Soto' },
  ];
  const r = await llamar({}, RECEPCION);
  const json = JSON.stringify(r);
  for (const fuga of ['Juan', 'Ana', 'juan', 'ana', '80000', '50000']) {
    chk(!json.includes(fuga), `se filtró "${fuga}" en la respuesta: ${json}`);
  }
  chk(r.gastos.length === 1, `esperaba 1 fila fundida, salieron ${r.gastos.length}`);
  chk(r.gastos[0].monto === 130000, 'el total fundido no calza');
});

caso('los gastos normales SÍ pasan con su detalle (son operativos)', async () => {
  docsFake = [{ descripcion: 'Compra de shampoo', monto: 12000, metodoPago: 'Efectivo', categoria: 'Insumos' }];
  const r = await llamar({}, RECEPCION);
  chk(r.gastos[0].descripcion === 'Compra de shampoo', 'se perdió la descripción del gasto normal');
});

caso('se agrupa por sucursal para no romper el filtro por sede', async () => {
  docsFake = [
    { monto: 10000, metodoPago: 'Efectivo', tipo: 'liquidacion', barberoId: 'a', sucursalId: 's1' },
    { monto: 20000, metodoPago: 'Efectivo', tipo: 'liquidacion', barberoId: 'b', sucursalId: 's2' },
  ];
  const r = await llamar({}, RECEPCION);
  chk(r.gastos.length === 2, `esperaba una fila por sede, salieron ${r.gastos.length}`);
  chk(r.gastos.every(g => g.sucursalId), 'alguna fila quedó sin sucursalId');
});

/* ── Puerta de entrada ── */

caso('un barbero no entra', async () => {
  docsFake = [];
  try { await llamar({}, { role: 'barbero', tenantId: 'kronnos_penablanca' }); chk(false, 'lo dejó entrar'); }
  catch (e) { chk(e.code === 'permission-denied', `código ${e.code}`); }
});

caso('recepción de OTRO local no entra', async () => {
  docsFake = [];
  try { await llamar({}, { role: 'recepcion', tenantId: 'otro_local' }); chk(false, 'lo dejó entrar'); }
  catch (e) { chk(e.code === 'permission-denied', `código ${e.code}`); }
});

caso('sin sesión no entra', async () => {
  try { await capturado({ data: { tenantId: 'kronnos_penablanca', desdeMs: HOY, hastaMs: HOY + 1000 } }); chk(false, 'lo dejó entrar'); }
  catch (e) { chk(e.code === 'unauthenticated', `código ${e.code}`); }
});

caso('rango absurdo se rechaza (no es un exportador de contabilidad)', async () => {
  try { await llamar({ hastaMs: HOY + 400 * 86400000 }, RECEPCION); chk(false, 'aceptó 400 días'); }
  catch (e) { chk(e.code === 'invalid-argument', `código ${e.code}`); }
});

(async () => {
  console.log('\n💰 cajaGastosDelDia — el arqueo cuadra sin exponer la planilla\n');
  for (const [t, fn] of casos) {
    const antes = fallos;
    try { await fn(); } catch (e) { fallos++; console.log(`      ✗ excepción: ${e.stack}`); }
    console.log(`  ${fallos === antes ? '✓' : '✗'} ${t}`);
  }
  if (fallos) { console.log(`\n❌ ${fallos} comprobación(es) fallaron.\n`); process.exit(1); }
  console.log(`\n✅ ${casos.length} casos OK — suma exacta, planilla cerrada.\n`);
})();
