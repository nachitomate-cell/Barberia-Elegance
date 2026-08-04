'use strict';

/**
 * scripts/gen-practica-brand.js
 * ─────────────────────────────────────────────────────────────────
 *  Identidad visual del local de práctica (tenant `practica`).
 *
 *  Genera, sin depender de ningún archivo externo:
 *    practica/logo.png    512×512  — monograma para header, PWA y wallet
 *    practica/banner.jpg  1600×900 — hero de la agenda pública
 *
 *  Paleta: champán #C8A45C sobre negro #0B0B0D. Es la familia de Chameleon
 *  (dorado sobre negro) pero un tono menos saturado, para que el local de
 *  práctica no se confunda con el de un cliente real cuando se muestra en una
 *  demo.
 *
 *  Uso: node scripts/gen-practica-brand.js
 * ─────────────────────────────────────────────────────────────────
 */

const path  = require('path');
const fs    = require('fs');
const sharp = require(path.join(__dirname, '..', 'node_modules', 'sharp'));

const ROOT = path.resolve(__dirname, '..');
const DIR  = path.join(ROOT, 'practica');
fs.mkdirSync(DIR, { recursive: true });

const ORO   = '#C8A45C';
const ORO_2 = '#8A6E32';
const NEGRO = '#0B0B0D';

// ── Logo: monograma "BP" entre dos anillos finos, con el poste de barbería
//    insinuado en las diagonales del interior. ────────────────────────────────
const logoSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="oro" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="#E4C88A"/>
      <stop offset="45%"  stop-color="${ORO}"/>
      <stop offset="100%" stop-color="${ORO_2}"/>
    </linearGradient>
    <clipPath id="disco"><circle cx="256" cy="256" r="150"/></clipPath>
  </defs>

  <rect width="512" height="512" fill="${NEGRO}"/>

  <!-- Diagonales del poste de barbería, muy tenues, dentro del disco -->
  <g clip-path="url(#disco)" opacity="0.13">
    ${Array.from({ length: 14 }, (_, i) =>
      `<rect x="${-200 + i * 46}" y="-60" width="20" height="640"
             fill="${ORO}" transform="rotate(28 256 256)"/>`).join('\n    ')}
  </g>

  <!-- Anillo exterior e interior -->
  <circle cx="256" cy="256" r="186" fill="none" stroke="url(#oro)" stroke-width="7"/>
  <circle cx="256" cy="256" r="168" fill="none" stroke="url(#oro)" stroke-width="2" opacity="0.55"/>

  <!-- Monograma -->
  <text x="256" y="258" text-anchor="middle" dominant-baseline="central"
        font-family="Georgia, 'Times New Roman', serif" font-size="188"
        font-weight="700" letter-spacing="-6" fill="url(#oro)">BP</text>

  <!-- Filete inferior -->
  <rect x="196" y="352" width="120" height="2.5" fill="url(#oro)" opacity="0.75"/>
</svg>`;

// ── Banner: atmósfera oscura con un halo dorado y textura diagonal. Nada de
//    fotos falsas: es un local que no existe, no puede aparentar que sí. ─────
const bannerSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
  <defs>
    <radialGradient id="halo" cx="0.30" cy="0.34" r="0.78">
      <stop offset="0%"   stop-color="#3A2E17"/>
      <stop offset="42%"  stop-color="#17140F"/>
      <stop offset="100%" stop-color="#08080A"/>
    </radialGradient>
    <linearGradient id="filo" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="${ORO}" stop-opacity="0"/>
      <stop offset="50%"  stop-color="${ORO}" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="${ORO}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="piso" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.92"/>
    </linearGradient>
  </defs>

  <rect width="1600" height="900" fill="url(#halo)"/>

  <!-- Textura diagonal muy sutil -->
  <g opacity="0.05">
    ${Array.from({ length: 40 }, (_, i) =>
      `<rect x="${-400 + i * 66}" y="-200" width="16" height="1400"
             fill="${ORO}" transform="rotate(24 800 450)"/>`).join('\n    ')}
  </g>

  <!-- Filete de luz -->
  <rect x="0" y="612" width="1600" height="1.6" fill="url(#filo)"/>

  <!-- Degradado al piso para que el texto del hero se lea siempre -->
  <rect y="380" width="1600" height="520" fill="url(#piso)"/>
</svg>`;

(async () => {
  await sharp(Buffer.from(logoSvg)).png().toFile(path.join(DIR, 'logo.png'));
  await sharp(Buffer.from(bannerSvg)).jpeg({ quality: 88, mozjpeg: true })
    .toFile(path.join(DIR, 'banner.jpg'));

  for (const f of ['logo.png', 'banner.jpg']) {
    const { size } = fs.statSync(path.join(DIR, f));
    console.log(`  practica/${f.padEnd(11)} ${(size / 1024).toFixed(0)} KB`);
  }
  console.log('\nListo. Íconos PWA: node scripts/gen-pwa-icons.js');
})().catch(e => { console.error('FALLÓ:', e); process.exit(1); });
