'use strict';

// scripts/check-reservacore.js
// ─────────────────────────────────────────────────────────────────────────────
//  Guard del contrato entre las vistas y ReservaCore (firebaseUtils.js).
//
//  Caída del 06-08-2026: `index.html` llamaba a `ReservaCore.validarTelefono()`
//  y ese commit sí se publicó, pero las 260 líneas de firebaseUtils.js que
//  definían la función se quedaron sin commitear. Producción quedó con medio
//  cambio y NINGUNA cita se pudo confirmar: el botón moría con
//  "ReservaCore.validarTelefono is not a function" en el último paso, con el
//  cliente ya con todos los datos escritos.
//
//  La mitad que faltaba no rompía nada al cargar la página — solo al pulsar
//  Confirmar. Por eso no se notó: el error no existe hasta que alguien intenta
//  reservar de verdad.
//
//  Se comprueban dos cosas:
//   1. Todo `ReservaCore.X` que usa una vista está exportado.
//   2. El cache-buster de firebaseUtils.js es el MISMO en todas las vistas.
//      Con versiones distintas, media plataforma carga el archivo viejo; y si
//      el archivo cambia sin subir la versión, el navegador que lo tenía
//      cacheado se queda con la combinación rota aunque el deploy esté bien.
//
//  Uso: npm run check:reservacore
// ─────────────────────────────────────────────────────────────────────────────

const fs   = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
let fallos = 0;
const ok = (n, cond, extra) => {
  console.log(`${cond ? '  ✓' : '  ✗'} ${n}${cond ? '' : `  → ${extra}`}`);
  if (!cond) fallos++;
};

/* ── Vistas que cargan el módulo ─────────────────────────────────────────── */
// `dist/` queda fuera: es el build commiteado del panel y se regenera aparte.
function vistas(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'dist', 'functions', 'scripts'].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) vistas(p, acc);
    else if (e.name.endsWith('.html')) acc.push(p);
  }
  return acc;
}

const UTILS = fs.readFileSync(path.join(RAIZ, 'firebaseUtils.js'), 'utf8');
// El objeto que devuelve el IIFE: lo que queda expuesto como ReservaCore.
const bloque = UTILS.slice(UTILS.lastIndexOf('return {'));
const exportado = new Set([...bloque.matchAll(/^\s{4}(\w+),/gm)].map((m) => m[1]));

const usos = new Map();          // función → vistas que la usan
const versiones = new Map();     // versión del cache-buster → vistas

for (const f of vistas(RAIZ)) {
  const src = fs.readFileSync(f, 'utf8');
  const rel = path.relative(RAIZ, f).replace(/\\/g, '/');
  for (const m of src.matchAll(/ReservaCore\.(\w+)/g)) {
    if (!usos.has(m[1])) usos.set(m[1], new Set());
    usos.get(m[1]).add(rel);
  }
  const v = src.match(/firebaseUtils\.js\?v=([\d.]+)/);
  if (v) {
    if (!versiones.has(v[1])) versiones.set(v[1], []);
    versiones.get(v[1]).push(rel);
  }
}

console.log(`\n🔗 Contrato vistas ↔ ReservaCore (${exportado.size} exportes)`);
ok('las vistas efectivamente usan ReservaCore', usos.size > 0,
  'no encontré ni una llamada — ¿cambió el nombre del módulo?');
for (const [fn, donde] of [...usos].sort()) {
  ok(`ReservaCore.${fn}()`, exportado.has(fn),
    `la usa ${[...donde].join(', ')} pero firebaseUtils.js no la exporta`);
}

console.log('\n🧊 Caché del módulo');
ok(`todas las vistas piden la misma versión (${[...versiones.keys()].join(', ')})`,
  versiones.size === 1,
  [...versiones].map(([v, fs_]) => `v=${v}: ${fs_.join(', ')}`).join(' · '));

console.log(fallos === 0
  ? '\n✅ Toda función que las vistas llaman existe, y todas cargan el mismo archivo.\n'
  : `\n❌ ${fallos} problema(s) — habría citas que no se pueden confirmar.\n`);
process.exit(fallos ? 1 : 0);
