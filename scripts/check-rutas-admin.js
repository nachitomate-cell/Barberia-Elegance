#!/usr/bin/env node
'use strict';

/* scripts/check-rutas-admin.js
 * ---------------------------------------------------------------------------
 * El guard de rutas del panel es lo único que impide que recepción entre por
 * URL a las vistas de plata (métricas, comisiones, gastos, facturación...).
 * Esconder el ítem del menú NO cierra la ruta.
 *
 * Este check verifica dos cosas que se rompen solas con el tiempo:
 *
 *   1. La LÓGICA del guard (lib/rutasAdmin.js): que compare la ruta completa
 *      y que las subrutas hereden del padre. La versión vieja miraba el último
 *      segmento y habría dejado pasar `metricas/detalle`.
 *
 *   2. Que las vistas de dinero SIGAN marcadas adminOnly en el Sidebar. Si
 *      alguien le quita el flag a `comisiones`, el guard hace su trabajo
 *      perfectamente y aun así recepción ve las comisiones.
 *
 * `caja` e `inventario` NO están en la lista a propósito: recepción los opera.
 * ---------------------------------------------------------------------------
 */

const fs   = require('fs');
const path = require('path');

const RAIZ     = path.join(__dirname, '..', 'admin-panel', 'src');
const SIDEBAR  = path.join(RAIZ, 'components', 'layout', 'Sidebar.jsx');
const REGLA    = path.join(RAIZ, 'lib', 'rutasAdmin.js');

let fallos = 0;
const ok   = (m) => console.log(`  ✓ ${m}`);
const mal  = (m) => { console.log(`  ✗ ${m}`); fallos++; };

/* ── 1. La lógica del guard ─────────────────────────────────────────────── */
// Se carga el módulo ESM real convirtiéndolo a CommonJS (es una función pura).
const fuente = fs.readFileSync(REGLA, 'utf8').replace(/export\s+function/, 'function');
const esRutaSoloAdmin = new Function(`${fuente}; return esRutaSoloAdmin;`)();

const SET = new Set(['metricas', 'comisiones', 'gastos']);

const casos = [
  ['metricas',           true,  'ruta protegida exacta'],
  ['/metricas',          true,  'con slash inicial'],
  ['/metricas/',         true,  'con slashes a ambos lados'],
  ['metricas/detalle',   true,  'SUBRUTA de una protegida (el bug del pop())'],
  ['metricas/a/b',       true,  'subruta anidada'],
  ['comisiones',         true,  'otra protegida'],
  ['caja',               false, 'caja NO es adminOnly: recepción la opera'],
  ['inventario',         false, 'inventario tampoco'],
  ['agenda',             false, 'ruta libre'],
  ['',                   false, 'ruta vacía'],
  ['metricasfalsa',      false, 'prefijo parecido no debe bloquear'],
  ['otra/metricas',      false, 'protegida en el medio no aplica'],
];

console.log('\nLógica del guard (lib/rutasAdmin.js):');
for (const [ruta, esperado, desc] of casos) {
  const real = esRutaSoloAdmin(ruta, SET);
  if (real === esperado) ok(`"${ruta || '(vacía)'}" → ${real ? 'bloqueada' : 'libre'} — ${desc}`);
  else mal(`"${ruta}" → esperaba ${esperado ? 'bloqueada' : 'libre'} y dio ${real} — ${desc}`);
}

/* ── 2. Las vistas de dinero siguen marcadas adminOnly ──────────────────── */
const sidebar = fs.readFileSync(SIDEBAR, 'utf8');

// Vistas que NUNCA debe ver recepción: exponen ingresos, márgenes o pagos.
const DEBEN_SER_ADMIN = [
  'metricas', 'comisiones', 'gastos', 'facturacion', 'mensualidad',
  'equipo', 'inicio',
];

console.log('\nVistas de dinero marcadas adminOnly en el Sidebar:');
for (const ruta of DEBEN_SER_ADMIN) {
  // Se busca el item por su `to` y se comprueba que la MISMA línea traiga el flag.
  const re = new RegExp(`to:\\s*'${ruta}'[^}\\n]*adminOnly:\\s*true`);
  if (re.test(sidebar)) ok(`${ruta}`);
  else mal(`${ruta} — ya NO está marcada adminOnly (o cambió de formato). Recepción la vería.`);
}

/* ── 3. Ninguna ruta del menú con varios segmentos sin querer ───────────── */
// No es un error en sí, pero si aparece una hay que confirmar que el guard la
// cubre: es justo el caso que rompía la versión anterior.
const conSlash = [...sidebar.matchAll(/to:\s*'([^']*\/[^']*)'/g)].map(m => m[1]);
console.log('\nRutas del menú con más de un segmento:');
if (!conSlash.length) ok('ninguna (el guard las cubriría igual por herencia)');
else conSlash.forEach(r => ok(`${r} — cubierta por herencia de subruta`));

console.log(
  fallos === 0
    ? '\n✅ El guard de rutas protege lo que tiene que proteger.\n'
    : `\n❌ ${fallos} problema(s) en el guard de rutas — recepción podría ver plata.\n`,
);
process.exit(fallos === 0 ? 0 : 1);
