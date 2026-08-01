#!/usr/bin/env node
/**
 * check-tema-claro.js — guard del modo claro en las páginas del cliente.
 *
 * Problema que previene (pasó el 1-ago-2026 con Renacer): estas páginas son
 * dark-first y el tema claro se hace con overrides. Cuando alguien agrega un
 * bloque nuevo con una clase de fondo oscuro que NADIE mapeó, en oscuro se ve
 * perfecto y en claro queda negro sobre claro —o peor, el texto se voltea a
 * oscuro sobre un fondo que siguió negro y no se lee nada. El modo de falla es
 * silencioso: solo lo ve el tenant claro, y solo si alguien entra a mirar.
 *
 * Qué revisa: toda clase de FONDO oscuro usada en el HTML tiene que estar
 * mapeada en el bloque `html.theme-light` de su hoja de estilos.
 *
 * Uso:  npm run check:tema-claro   (va dentro de `npm run check`)
 */
const fs   = require('fs');
const path = require('path');

const raiz = path.resolve(__dirname, '..');
const leer = (p) => fs.readFileSync(path.join(raiz, p), 'utf8');

// Página → hoja donde viven sus overrides de tema claro.
const PARES = [
  { html: 'dashboard.html', css: 'dashboard.css' },
  // barbero.html y registro.html llevan sus overrides EN EL PROPIO archivo.
  { html: 'barbero.html',   css: 'barbero.html' },
  { html: 'registro.html',  css: 'registro.html' },
];

/* Fondos que se consideran OSCUROS y por tanto exigen override. Se listan por
   patrón y no por nombre exacto para que una variante nueva (bg-zinc-800, un
   hex nuevo) también quede cubierta por el guard. */
const ES_FONDO_OSCURO = (c) =>
  /^bg-\[#(0|1|2)[0-9a-f]{5}\]/i.test(c) ||            // hex oscuro: #050505, #1a1a1f…
  /^bg-(black|zinc-(8|9)00|zinc-950|gray-(8|9)00|neutral-(8|9)00|slate-(8|9)00|slate-950)/.test(c);

// Se ignoran los overlays a pantalla completa: son lightbox/modales que en
// modo claro TAMBIÉN deben quedar oscuros (ahí el texto blanco es correcto).
const ES_OVERLAY = (c) => /^bg-black\/\d+$/.test(c);

let fallos = [];

for (const { html, css } of PARES) {
  let src, hoja;
  try { src = leer(html); hoja = css === html ? src : leer(css); }
  catch { continue; }                                   // página que ya no existe

  // Solo aplica si la página participa del tema claro.
  if (!/theme-light/.test(hoja)) {
    fallos.push(`${html}: no tiene NINGÚN override de theme-light — los tenants claros la verán oscura.`);
    continue;
  }

  const clases = new Set();
  (src.match(/class="[^"]*"/g) || []).forEach(m =>
    m.slice(7, -1).split(/\s+/).forEach(c => clases.add(c)));

  // Se compara sobre la hoja SIN escapes CSS (`.bg-zinc-900\/60` → `.bg-zinc-900/60`)
  // para que el escape no haga fallar la comparación.
  const hojaPlana = hoja.replace(/\\/g, '');

  const oscuras = [...clases].filter(c => ES_FONDO_OSCURO(c) && !ES_OVERLAY(c));
  const sinMapear = oscuras.filter((c) => {
    // Un override puede nombrar la clase exacta (.bg-zinc-900\/60) o cubrirla
    // por selector de atributo del color base ([class*="bg-[#050505]"], que
    // alcanza también a bg-[#050505]/90). Por eso se prueban las dos formas.
    const exacta = c.replace(/^bg-/, '');
    const base   = exacta.replace(/\/\d+$/, '');        // sin la opacidad
    return ![exacta, base].some((t) => {
      const re = new RegExp(`theme-light[^{}]*${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
      return re.test(hojaPlana);
    });
  });

  if (sinMapear.length) {
    fallos.push(`${html}: ${sinMapear.length} fondo(s) oscuro(s) sin override de tema claro:\n     · ${sinMapear.join('\n     · ')}`);
  }
}

if (fallos.length) {
  console.error('\n❌ Modo claro incompleto:\n');
  fallos.forEach(f => console.error('  ' + f + '\n'));
  console.error('  Agrega el override en el bloque `html.theme-light` de la hoja correspondiente.');
  console.error('  Regla: si mapeas un fondo oscuro, mapéalos TODOS — los textos claros se voltean en bloque.\n');
  process.exit(1);
}

console.log('✓ Modo claro: todos los fondos oscuros tienen override.');
