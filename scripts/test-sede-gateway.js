#!/usr/bin/env node
/**
 * test-sede-gateway.js — "cambiar de sede" significa lo mismo en todo el panel.
 *
 * Las callables del gateway de WhatsApp resolvían el tenant SOLO del custom
 * claim, y aceptaban el `tenantId` del request únicamente si el caller era el
 * superadmin. Para un admin de marca Kronnos —que administra las 3 sedes— el
 * selector cambiaba el header y la pestaña de WhatsApp seguía mostrando la
 * sede de su claim, sin ningún aviso (visto el 04-08-2026: Limache marcaba
 * $57.960 / 4 reservas, que son de Limache y no de las tres).
 *
 * Ahora el `tenantId` del request se honra de cualquiera que administre ese
 * local, con la MISMA puerta que usa el hub (`puedeAdministrarTenant`).
 * Lo que se prueba acá es sobre todo que no se abrió de más.
 *
 * Uso:  npm run test:sede-gateway
 */
const Module = require('module');

const origLoad = Module._load;
Module._load = function (req) {
  if (req === 'firebase-admin')                      return { firestore: () => ({ doc: () => ({}), collection: () => ({}) }) };
  if (req === 'firebase-functions')                  return { logger: { info(){}, warn(){}, error(){} } };
  if (req === 'firebase-functions/params')           return { defineSecret: () => ({ value: () => '' }) };
  if (req === 'firebase-admin/firestore')            return { FieldValue: {} };
  if (req === 'firebase-functions/v2/https') {
    return {
      onCall: () => () => {}, onRequest: () => () => {},
      HttpsError: class extends Error { constructor(code, msg) { super(msg); this.code = code; } },
    };
  }
  if (req === './client')      return { crearCliente: () => ({}) };
  if (req === './cerebro')     return { procesarMensajeEntrante: async () => {} };
  if (req === '../lib/wa-plan')return { tienePlan: () => true };
  if (req === './plataforma')  return {};
  return origLoad.apply(this, arguments);
};
const { _tenantDelCaller: tenantDelCaller } = require('../functions/evolution/gateway');
Module._load = origLoad;

const SUPER    = 'ignaciiio.mate@gmail.com';
const MARCA    = 'claudio.burgos91@gmail.com';   // admin de las 3 sedes Kronnos
const AJENO    = 'dueno.otrolocal@gmail.com';

const req = (token, data) => ({ auth: { token }, data: data || {} });

let fallos = 0;
function caso(titulo, entrada, esperado) {
  let salida;
  try { salida = tenantDelCaller(entrada); }
  catch (e) { salida = `ERR:${e.code}`; }
  const ok = salida === esperado;
  if (!ok) fallos++;
  console.log(`  ${ok ? '✓' : '✗'} ${titulo}`);
  if (!ok) console.log(`      esperaba ${esperado}, salió ${salida}`);
}

console.log('\n🏢 tenantDelCaller — el selector de sede manda, pero solo donde corresponde\n');

/* ── Lo que se venía a arreglar ── */
caso('admin de marca pide otra sede suya → la obtiene',
  req({ email: MARCA, role: 'admin', tenantId: 'kronnos_limache' }, { tenantId: 'kronnos_woman' }),
  'kronnos_woman');

caso('admin de marca sin pedir nada → su sede del claim',
  req({ email: MARCA, role: 'admin', tenantId: 'kronnos_limache' }),
  'kronnos_limache');

caso('superadmin sigue pudiendo apuntar a cualquiera',
  req({ email: SUPER }, { tenantId: 'kronnos_penablanca' }),
  'kronnos_penablanca');

/* ── Lo que NO se puede abrir ── */
caso('admin de un local cualquiera NO puede espiar otro',
  req({ email: AJENO, role: 'admin', tenantId: 'mi_local' }, { tenantId: 'kronnos_woman' }),
  'ERR:permission-denied');

caso('admin de marca NO puede salirse de sus sedes',
  req({ email: MARCA, role: 'admin', tenantId: 'kronnos_limache' }, { tenantId: 'otro_local' }),
  'ERR:permission-denied');

caso('un barbero no entra ni a su propio local',
  req({ email: AJENO, role: 'barbero', tenantId: 'mi_local' }),
  'ERR:permission-denied');

caso('un barbero tampoco pidiendo otra sede',
  req({ email: AJENO, role: 'barbero', tenantId: 'mi_local' }, { tenantId: 'kronnos_woman' }),
  'ERR:permission-denied');

caso('recepción no entra al gateway (es admin/jefe)',
  req({ email: AJENO, role: 'recepcion', tenantId: 'mi_local' }),
  'ERR:permission-denied');

caso('sin sesión',
  { data: { tenantId: 'kronnos_woman' } },
  'ERR:unauthenticated');

caso('cuenta sin local y sin sede pedida',
  req({ email: AJENO, role: 'admin' }),
  'ERR:permission-denied');

/* ── Que pedir la propia sede no rompa nada ── */
caso('jefe pidiendo SU misma sede sigue entrando',
  req({ email: AJENO, role: 'jefe', tenantId: 'mi_local' }, { tenantId: 'mi_local' }),
  'mi_local');

caso('tenantId vacío se ignora',
  req({ email: AJENO, role: 'admin', tenantId: 'mi_local' }, { tenantId: '   ' }),
  'mi_local');

if (fallos) { console.log(`\n❌ ${fallos} caso(s) fallaron.\n`); process.exit(1); }
console.log('\n✅ Todo en orden — el selector manda solo para quien administra esa sede.\n');
