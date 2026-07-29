#!/usr/bin/env node
/**
 * check-tema-tenants.js — Guard de consistencia visual entre páginas públicas.
 *
 * Problema que previene: index.html (agenda del local) es la fuente de verdad
 * del look de cada tenant, pero barbero.html (ficha individual) lo repite en
 * mapas JS propios. Cuando se agrega un tenant en una y se olvida la otra, la
 * ficha sale con el diseño de Elegance y nadie se entera hasta que el cliente
 * lo ve. Revisa DOS espejos:
 *
 *   1. Acento  — `.tenant-X { --accent }` en index  vs  `accentMap` en barbero.
 *   2. Banner  — `.tenant-X .booking-hero { background-image }` en index
 *                vs `heroBanner` del tenant en config.js, que es de donde
 *                barbero.html lo lee. Sin entrada, la ficha usa el LOGO del
 *                local estirado como banner (pasó con sion).
 *
 * Solo falla por tenants REALES (los declarados en config.js). Antes marcaba
 * `omegastudio`, que es una clase CSS huérfana y no un tenant — un guard que
 * grita en falso es un guard que nadie corre.
 *
 * Uso:  npm run check:tenants
 * Sale con código 1 si hay deriva (sirve para CI / pre-commit).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const barbero = fs.readFileSync(path.join(ROOT, 'barbero.html'), 'utf8');
const configSrc = fs.readFileSync(path.join(ROOT, 'config.js'), 'utf8');

// Tenants declarados en config.js — lo único contra lo que vale fallar.
const TENANTS = new Set(
  [...configSrc.matchAll(/^    ([a-z0-9_]+): \{/gm)].map(m => m[1]),
);

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
const aliasBlock = (configSrc.match(/_themeAlias\s*=\s*\{([\s\S]*?)\};/) || [])[1] || '';
const alias = {};
for (const a of aliasBlock.matchAll(/([a-z_0-9]+)\s*:\s*'([a-z_0-9]+)'/g)) alias[a[1]] = a[2];

// ── 2b) BANNER de cada tenant ────────────────────────────────────
// index.html: `.tenant-X … .booking-hero { background-image: url(…) }`
const bannersIndex = {};
const heroRe = /\.tenant-([a-z0-9_]+)[^{]*\.booking-hero[^{]*\{([^}]*)\}/gi;
let hm;
while ((hm = heroRe.exec(index))) {
  const url = (hm[2].match(/background-image:\s*url\(['"]?([^'")]+)/i) || [])[1];
  if (url && !bannersIndex[hm[1]]) bannersIndex[hm[1]] = url;
}
// config.js: `heroBanner` de cada tenant. Desde que barbero.html lo lee de
// ahí (ya no tiene mapa propio), config.js es el espejo a vigilar.
const bannersBarbero = {};
for (const b of configSrc.matchAll(/^    ([a-z0-9_]+): \{/gm)) {
  const tid = b[1];
  const desde = configSrc.indexOf(`\n    ${tid}: {`);
  const resto = configSrc.slice(desde + 1);
  const fin = resto.search(/\n    [a-z0-9_]+: \{/);
  const bloque = fin === -1 ? resto : resto.slice(0, fin);
  const hb = bloque.match(/^\s*heroBanner:\s*'([^']+)'/m);
  if (hb) bannersBarbero[tid] = hb[1];
}

// ── 3) Comparar ───────────────────────────────────────────────────
// Solo cuentan los tenants REALES; un `.tenant-X` que no existe en config.js
// es CSS que nunca se aplica (la clase que se pone es `tenant-<id>`).
const esReal = t => TENANTS.has(t);

const faltaAcento = [];
const distintos   = [];
for (const [t, hexIndex] of Object.entries(accentsIndex)) {
  if (!esReal(t)) continue;
  const hexBarbero = accentsBarbero[t];
  if (!hexBarbero) { faltaAcento.push({ t, hexIndex }); continue; }
  if (hexBarbero !== hexIndex) distintos.push({ t, hexIndex, hexBarbero });
}

const faltaBanner = Object.entries(bannersIndex)
  .filter(([t]) => esReal(t) && !bannersBarbero[t])
  .map(([t, url]) => ({ t, url }));

const bannerDistinto = Object.entries(bannersIndex)
  .filter(([t, url]) => esReal(t) && bannersBarbero[t] && bannersBarbero[t] !== url)
  .map(([t, url]) => ({ t, url, barbero: bannersBarbero[t] }));

// Clases CSS que no corresponden a ningún tenant → nunca se aplican.
const huerfanas = [...new Set([...Object.keys(accentsIndex), ...Object.keys(bannersIndex)])]
  .filter(t => !esReal(t));

let fail = false;

if (faltaAcento.length) {
  fail = true;
  console.log('\n✗ Tenants con tema en index.html pero SIN entrada en el accentMap de barbero.html');
  console.log('  (su ficha de barbero sale con el dorado de Elegance):\n');
  for (const f of faltaAcento) console.log(`    ${f.t.padEnd(24)} index: ${f.hexIndex}`);
  console.log('\n  → Arregla el accentMap en barbero.html (busca "FUENTE DE VERDAD del acento").');
}

if (faltaBanner.length) {
  fail = true;
  console.log('\n✗ Tenants con banner en index.html pero SIN entrada en heroBanner de config.js');
  console.log('  (su ficha usa el LOGO del local estirado como banner):\n');
  for (const f of faltaBanner) console.log(`    ${f.t.padEnd(24)} index: ${f.url}`);
  console.log('\n  → Agrega heroBanner al tenant en config.js.');
}

if (bannerDistinto.length) {
  console.log('\n⚠ Banners que NO coinciden entre las dos vistas:\n');
  for (const d of bannerDistinto) {
    console.log(`    ${d.t.padEnd(24)} index: ${d.url}   barbero: ${d.barbero}`);
  }
}

if (distintos.length) {
  console.log('\n⚠ Tenants cuyo acento NO coincide entre las dos vistas.');
  console.log('  Puede ser deliberado (contraste), pero revísalo:\n');
  for (const d of distintos) {
    const nota = alias[d.t] ? `  (alias de tema → ${alias[d.t]})` : '';
    console.log(`    ${d.t.padEnd(24)} index: ${d.hexIndex}   barbero: ${d.hexBarbero}${nota}`);
  }
}

if (huerfanas.length) {
  console.log('\n⚠ Clases .tenant-* que NO son tenants de config.js — ese CSS nunca se aplica:\n');
  for (const t of huerfanas) console.log(`    .tenant-${t}`);
}

if (!fail) {
  const nAcento = Object.keys(accentsIndex).filter(esReal).length;
  const nBanner = Object.keys(bannersIndex).filter(esReal).length;
  console.log(`\n✓ Sin deriva: ${nAcento} tenants con acento propio y ${nBanner} con banner están en ambas vistas.\n`);
} else {
  console.log('');
}

process.exit(fail ? 1 : 0);
