#!/usr/bin/env node
/**
 * scripts/check-mojibake.js
 * ─────────────────────────────────────────────────────────────────
 *  Detecta doble-encoding UTF-8→Latin-1→UTF-8 en archivos de texto.
 *  El síntoma clásico: "reseña" se ve como "reseÃ±a", "más" como
 *  "mÃ¡s", "—" como "â€"". Pasó una vez con dashboard.html
 *  (commit ddda43c) y el fix fue con iconv-lite + windows-1252.
 *
 *  Uso:
 *    node scripts/check-mojibake.js                (scan default)
 *    node scripts/check-mojibake.js path1 path2    (files/dirs específicos)
 *
 *  Exit code 1 si encuentra mojibake → falla el pre-commit / CI.
 * ─────────────────────────────────────────────────────────────────
 */
'use strict';

const fs   = require('fs');
const path = require('path');

// Patrones inequívocos de mojibake (bytes UTF-8 leídos como cp1252 y
// re-guardados como UTF-8). Los pares acá NO aparecen en español normal —
// si están, el archivo está roto.
const MOJIBAKE_RE = /Ã[­±³¡©úñ‘“š]|â€[™œ" –—]|Â[¿¡°ª]|â•|â”/g;

// Extensiones que revisamos (texto legible por humanos).
const SCAN_EXT = new Set(['.html', '.js', '.jsx', '.ts', '.tsx', '.css', '.md', '.json']);

// Rutas a IGNORAR (bundles, deps, generados) — mojibake ahí es ruido de
// terceros o del build, no del código fuente que corregimos a mano.
const IGNORE = [
  'node_modules',
  '.git',
  'gestion-interna/assets',      // bundle Vite regenerado
  'gestion-interna/sw.js',
  'gestion-interna/workbox-',
  'admin-panel/dist',
  'scripts/plantillas',          // CSVs y snippets de terceros
  'scripts/check-mojibake.js',   // este mismo archivo (regex/ejemplos literales)
];

function shouldIgnore(rel) {
  return IGNORE.some(p => rel.includes(p));
}

function* walk(root, base = root) {
  const entries = fs.readdirSync(root, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(root, e.name);
    const rel  = path.relative(base, full).replace(/\\/g, '/');
    if (shouldIgnore(rel)) continue;
    if (e.isDirectory())    { yield* walk(full, base); }
    else if (SCAN_EXT.has(path.extname(e.name).toLowerCase())) {
      yield { full, rel };
    }
  }
}

function scan(target) {
  const stat = fs.statSync(target);
  const files = stat.isDirectory() ? [...walk(target)] : [{ full: target, rel: target }];
  let bad = 0;
  const hits = [];
  for (const { full, rel } of files) {
    const txt = fs.readFileSync(full, 'utf8');
    const matches = txt.match(MOJIBAKE_RE);
    if (!matches) continue;
    bad++;
    hits.push({ rel, count: matches.length, sample: [...new Set(matches)].slice(0, 5) });
  }
  return { total: files.length, bad, hits };
}

// ───────────────────────────────────────────────────────────────────
const args   = process.argv.slice(2);
const roots  = args.length ? args : [path.resolve(__dirname, '..')];
let allBad   = 0;
let allFiles = 0;
const allHits = [];
for (const r of roots) {
  const { total, bad, hits } = scan(r);
  allFiles += total;
  allBad   += bad;
  allHits.push(...hits);
}
console.log(`\nEscaneados: ${allFiles} archivos`);
if (allBad === 0) {
  console.log('✓ Sin mojibake detectado.\n');
  process.exit(0);
}
console.error(`✗ ${allBad} archivo(s) con mojibake:\n`);
for (const h of allHits.sort((a, b) => b.count - a.count)) {
  console.error(`  ${h.rel}  (${h.count} matches, ej: ${h.sample.join(' ')})`);
}
console.error('\nCómo reparar (funcionó con dashboard.html el 2026-07-24):');
console.error('  npm install --no-save iconv-lite');
console.error('  node -e "const fs=require(\'fs\'),i=require(\'iconv-lite\');const f=\'<PATH>\';const s=fs.readFileSync(f).toString(\'utf8\');fs.writeFileSync(f,i.decode(i.encode(s,\'windows-1252\'),\'utf-8\'))"');
process.exit(1);
