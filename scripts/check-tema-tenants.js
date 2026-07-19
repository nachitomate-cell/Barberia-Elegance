#!/usr/bin/env node
/**
 * check-tema-tenants.js — Guard de consistencia visual entre páginas públicas.
 *
 * Problema que previene: la agenda pública (index.html) define el tema de cada
 * tenant en bloques CSS `.tenant-*`, pero la ficha del barbero (barbero.html)
 * pinta su acento desde un `accentMap` en JS. Si alguien agrega un tenant en
 * index.html y olvida barbero.html, la ficha sale con el dorado de Elegance y
 * no corresponde al diseño del local.
 *
 * Uso:  node scripts/check-tema-tenants.js
 * Sale con código 1 si hay deriva (sirve para CI / pre-commit).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const barbero = fs.readFileSync(path.join(ROOT, 'barbero.html'), 'utf8');

// ── 1) Acento de cada tenant según index.html (fuente de verdad) ──
const accentsIndex = {};
const blockRe = /([^{}]*\.tenant-[a-z_0-9,.\s()-]*?)\{([^}]*)\}/g;
let m;
while ((m = blockRe.exec(index))) {
  const [, sel, body] = m;
  const hit = body.match(/--accent\s*:\s*(#[0-9a-fA-F]{6})/);
  if (!hit) continue;
  for (const t of sel.matchAll(/\.tenant-([a-z_0-9]+)/g)) {
    if (!accentsIndex[t[1]]) accentsIndex[t[1]] = hit[1].toLowerCase();
  }
}

// ── 2) Acento de cada tenant según el accentMap de barbero.html ──
const mapBlock = (barbero.match(/const accentMap = \{([\s\S]*?)\};/) || [])[1] || '';
const accentsBarbero = {};
for (const e of mapBlock.matchAll(/([a-z_0-9]+)\s*:\s*\{\s*r:\s*(\d+),\s*g:\s*(\d+),\s*b:\s*(\d+)/g)) {
  const [, t, r, g, b] = e;
  accentsBarbero[t] = '#' + [r, g, b].map(v => (+v).toString(16).padStart(2, '0')).join('');
}

// Tenants que reutilizan el tema de otro (alias) — no necesitan bloque propio.
const config = fs.readFileSync(path.join(ROOT, 'config.js'), 'utf8');
const aliasBlock = (config.match(/_themeAlias\s*=\s*\{([\s\S]*?)\};/) || [])[1] || '';
const alias = {};
for (const a of aliasBlock.matchAll(/([a-z_0-9]+)\s*:\s*'([a-z_0-9]+)'/g)) alias[a[1]] = a[2];

// ── 3) Comparar ──
const faltantes = [];
const distintos = [];
for (const [t, hexIndex] of Object.entries(accentsIndex)) {
  const hexBarbero = accentsBarbero[t];
  if (!hexBarbero) { faltantes.push({ t, hexIndex }); continue; }
  if (hexBarbero !== hexIndex) distintos.push({ t, hexIndex, hexBarbero });
}

let fail = false;
if (faltantes.length) {
  fail = true;
  console.log('\n✗ Tenants con tema en index.html pero SIN entrada en el accentMap de barbero.html');
  console.log('  (su ficha de barbero sale con el dorado de Elegance):\n');
  for (const f of faltantes) console.log(`    ${f.t.padEnd(24)} index: ${f.hexIndex}`);
}

if (distintos.length) {
  console.log('\n⚠ Tenants cuyo acento NO coincide entre las dos vistas.');
  console.log('  Puede ser deliberado (contraste), pero revísalo:\n');
  for (const d of distintos) {
    const nota = alias[d.t] ? `  (alias de tema → ${alias[d.t]})` : '';
    console.log(`    ${d.t.padEnd(24)} index: ${d.hexIndex}   barbero: ${d.hexBarbero}${nota}`);
  }
}

if (!fail && !distintos.length) {
  console.log(`\n✓ Sin deriva: los ${Object.keys(accentsIndex).length} tenants con tema propio están en ambas vistas.\n`);
} else {
  console.log('\nArregla el accentMap en barbero.html (busca "FUENTE DE VERDAD del acento").\n');
}

process.exit(fail ? 1 : 0);
