// ═══════════════════════════════════════════════════════════════════
//  GUARD — espejos del tema claro que ya mordieron en producción.
//
//  1) Stagger del dashboard: el selector CSS `[data-aura-stagger]{opacity:0}`
//     y el gate JS de initAuraAnimations() DEBEN listar los mismos tenants.
//     Si un tenant entra al CSS y no al JS, sus secciones quedan invisibles
//     para siempre (opacity 0 sin animación que las revele). Mordió con
//     Renacer el 2026-08-02.
//
//  2) Token --gold-contrast: los botones con `background:var(--gold)` inline
//     llevan text-black (para el dorado del tema oscuro). En tenants claros
//     el acento es oscuro → el texto negro desaparece. La cura de raíz es el
//     par :root{--gold-contrast} + regla `html.theme-light [style*=...]`.
//     Este guard falla si alguien la borra o la deja a medias.
//
//  Uso: node scripts/check-espejos-claros.js   (corre dentro de `npm run check`)
// ═══════════════════════════════════════════════════════════════════
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'dashboard.css'), 'utf8');
const extras = fs.readFileSync(path.join(root, 'js', 'dashboard', 'extras.js'), 'utf8');

let fallas = 0;
const fail = (msg) => { console.error('✗ ' + msg); fallas++; };

// ── 1) Espejo stagger CSS ↔ JS ──────────────────────────────────────
const mCss = css.match(/:is\(([^)]*)\)\s*\[data-aura-stagger\]/);
if (!mCss) {
  fail('dashboard.css: no encontré el selector :is(...) [data-aura-stagger]');
} else {
  const cssTenants = [...mCss[1].matchAll(/\.tenant-([\w-]+)/g)].map(m => m[1]).sort();
  const gate = extras.match(/function initAuraAnimations\(\)[\s\S]{0,600}?return;/);
  if (!gate) {
    fail('extras.js: no encontré el gate de initAuraAnimations()');
  } else {
    const jsTenants = [...gate[0].matchAll(/contains\('tenant-([\w-]+)'\)/g)].map(m => m[1]).sort();
    const soloCss = cssTenants.filter(t => !jsTenants.includes(t));
    const soloJs  = jsTenants.filter(t => !cssTenants.includes(t));
    if (soloCss.length) {
      fail(`stagger: tenants en el CSS ([data-aura-stagger]) pero NO en el gate JS de extras.js: ${soloCss.join(', ')}` +
           ' — sus secciones quedarán en opacity:0 para siempre.');
    }
    if (soloJs.length) {
      fail(`stagger: tenants en el gate JS pero no en el CSS: ${soloJs.join(', ')} (inofensivo pero desprolijo).`);
    }
  }
}

// ── 2) Token de contraste del acento ────────────────────────────────
if (!/--gold-contrast:\s*#/.test(css)) {
  fail('dashboard.css: falta la definición de --gold-contrast en :root.');
}
if (!/html\.theme-light\s*\{\s*--gold-contrast:\s*#F{6}/i.test(css.replace(/\s+/g, ' '))) {
  fail('dashboard.css: falta `html.theme-light { --gold-contrast: #FFFFFF }`.');
}
if (!/html\.theme-light \[style\*="background:var\(--gold\)"\]/.test(css)) {
  fail('dashboard.css: falta la regla genérica `html.theme-light [style*="background:var(--gold)"]` (texto de botones de acento en tenants claros).');
}

if (fallas) {
  console.error(`\n${fallas} espejo(s) del tema claro rotos.`);
  process.exit(1);
}
console.log('✓ Espejos del tema claro: stagger CSS↔JS sincronizado y token --gold-contrast presente.');
