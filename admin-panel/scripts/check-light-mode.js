#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════
 * check-light-mode.js — Guard del modo claro.
 *
 * El panel es dark-first: el modo claro se construye pisando clases en
 * index.css. Eso tiene un modo de falla silencioso — si alguien usa una
 * clase nueva y nadie la mapea, en oscuro se ve bien y en claro se ve
 * mal, y no hay error en ninguna parte.
 *
 * Este check cubre el caso donde el daño es evidente: shades OSCURAS
 * (>=800) de un color usadas como fondo o borde. Sobre negro son un
 * panel apenas insinuado; sobre blanco son una mancha sucia. El tono
 * oscuro no se aclara solo — hay que mapearlo a su contraparte clara.
 *
 * NO revisa los tintes claros (bg-emerald-500/10 y similares): sobre
 * blanco quedan sutiles igual, así que exigir un override para cada uno
 * sería ruido. La regla es: fallar solo donde se rompe de verdad.
 *
 * Uso:  node scripts/check-light-mode.js
 * Corre en prebuild. Sale 1 si hay clases sin mapear.
 * ═══════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FAMILIAS = 'emerald|blue|amber|rose|red|violet|indigo|cyan|purple|pink|teal|orange|green|lime|sky';
const RE = new RegExp(
  String.raw`\b(bg|border)-(${FAMILIAS})-(\d{2,3})\/(\[?[\d.]+\]?)`,
  'g',
);
const SHADE_OSCURA = 800;

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : (/\.jsx?$/.test(e.name) ? [p] : []);
  });
}

function main() {
  // 1) clases usadas en el código
  const usadas = new Map();
  for (const f of walk(path.join(ROOT, 'src'))) {
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(RE)) {
      const clase = `${m[1]}-${m[2]}-${m[3]}/${m[4]}`;
      if (+m[3] < SHADE_OSCURA) continue;
      if (!usadas.has(clase)) usadas.set(clase, new Set());
      usadas.get(clase).add(path.relative(ROOT, f));
    }
  }

  // 2) clases con override de modo claro (el CSS las escapa: \/ )
  const css = fs.readFileSync(path.join(ROOT, 'src', 'index.css'), 'utf8')
    .split(String.fromCharCode(92)).join('');
  const mapeadas = new Set(
    [...css.matchAll(RE)].map(m => `${m[1]}-${m[2]}-${m[3]}/${m[4]}`),
  );

  const faltan = [...usadas.entries()].filter(([c]) => !mapeadas.has(c));

  if (!faltan.length) {
    console.log(`✓ modo claro: ${usadas.size} clases de superficie oscura, todas mapeadas`);
    return 0;
  }

  console.error('\n✗ Modo claro: shades oscuras usadas sin override en index.css.');
  console.error('  Sobre blanco se ven como manchas. Mapéalas a su contraparte');
  console.error('  clara en la sección "Fondos de color oscuros" de index.css.\n');
  for (const [clase, files] of faltan) {
    console.error(`   ${clase.padEnd(26)} ${[...files].slice(0, 3).join(', ')}`);
  }
  console.error('');
  return 1;
}

process.exit(main());
