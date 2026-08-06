'use strict';

/**
 * scripts/gen-clinicalglow-placeholders.js
 * ─────────────────────────────────────────────────────────────────
 *  Genera los assets placeholder de Clinical Glow (logo, banner, og)
 *  mientras la profesional entrega los archivos oficiales.
 *
 *  Placeholders:
 *   · logo.png   — 1024×1024, monograma "CG" dorado (#d4a574) sobre nude
 *                  (#fdf7f4). Sirve como fuente para gen-pwa-icons.js.
 *   · banner.webp— 1920×640, gradiente nude+dorado+rosa (placeholder hero).
 *   · og.png     — 1200×630 con wordmark centrado (para tarjetas WA/redes).
 *
 *  Uso (una vez, hasta que llegue el logo real):  node scripts/gen-clinicalglow-placeholders.js
 * ─────────────────────────────────────────────────────────────────
 */

const path  = require('path');
const fs    = require('fs');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const OUT  = path.join(ROOT, 'clinicalglow');
fs.mkdirSync(OUT, { recursive: true });

const NUDE   = '#fdf7f4';
const GOLD   = '#d4a574';
const ROSE   = '#c9899b';
const CHOCO  = '#3d2f2b';

// ── logo.png (1024×1024 · monograma CG en dorado sobre nude) ─────────
const logoSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <radialGradient id="glow" cx="50%" cy="45%" r="60%">
      <stop offset="0%" stop-color="${GOLD}" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="${NUDE}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1024" height="1024" fill="${NUDE}"/>
  <rect width="1024" height="1024" fill="url(#glow)"/>
  <circle cx="512" cy="512" r="360" fill="none" stroke="${GOLD}" stroke-width="2" opacity="0.55"/>
  <circle cx="512" cy="512" r="330" fill="none" stroke="${GOLD}" stroke-width="1" opacity="0.30"/>
  <text x="512" y="560" text-anchor="middle"
        font-family="Georgia, 'Times New Roman', serif"
        font-size="360" font-weight="400" fill="${CHOCO}"
        letter-spacing="-8">CG</text>
  <text x="512" y="700" text-anchor="middle"
        font-family="Helvetica, Arial, sans-serif"
        font-size="46" letter-spacing="14" fill="${GOLD}"
        font-weight="300">CLINICAL GLOW</text>
</svg>`;

// ── banner.webp (1920×640 · nude con halos dorado+rosa) ──────────────
const bannerSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="640" viewBox="0 0 1920 640">
  <defs>
    <radialGradient id="goldHalo" cx="25%" cy="0%" r="70%">
      <stop offset="0%"   stop-color="${GOLD}" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="${NUDE}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="roseHalo" cx="80%" cy="100%" r="70%">
      <stop offset="0%"   stop-color="${ROSE}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${NUDE}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1920" height="640" fill="${NUDE}"/>
  <rect width="1920" height="640" fill="url(#goldHalo)"/>
  <rect width="1920" height="640" fill="url(#roseHalo)"/>
</svg>`;

// ── og.png (1200×630 · wordmark centrado) ────────────────────────────
const ogSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="g" cx="50%" cy="35%" r="70%">
      <stop offset="0%"   stop-color="${GOLD}" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="${NUDE}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="${NUDE}"/>
  <rect width="1200" height="630" fill="url(#g)"/>
  <text x="600" y="280" text-anchor="middle"
        font-family="Georgia, 'Times New Roman', serif"
        font-size="140" fill="${CHOCO}" letter-spacing="-3">CG</text>
  <line x1="500" y1="330" x2="700" y2="330" stroke="${GOLD}" stroke-width="1" opacity="0.7"/>
  <text x="600" y="400" text-anchor="middle"
        font-family="Helvetica, Arial, sans-serif"
        font-size="44" letter-spacing="18" fill="${CHOCO}"
        font-weight="400">CLINICAL GLOW</text>
  <text x="600" y="470" text-anchor="middle"
        font-family="Helvetica, Arial, sans-serif"
        font-size="22" letter-spacing="5" fill="${GOLD}"
        font-style="italic">Resultados naturales y visibles</text>
  <text x="600" y="560" text-anchor="middle"
        font-family="Helvetica, Arial, sans-serif"
        font-size="18" letter-spacing="4" fill="rgba(61,47,43,0.55)">VIÑA DEL MAR · CHILE</text>
</svg>`;

(async () => {
  await sharp(Buffer.from(logoSvg)).png().toFile(path.join(OUT, 'logo.png'));
  console.log('✓ /clinicalglow/logo.png (1024×1024)');

  await sharp(Buffer.from(bannerSvg)).webp({ quality: 88 }).toFile(path.join(OUT, 'banner.webp'));
  console.log('✓ /clinicalglow/banner.webp (1920×640)');

  await sharp(Buffer.from(ogSvg)).png().toFile(path.join(OUT, 'og.png'));
  console.log('✓ /clinicalglow/og.png (1200×630)');

  console.log('\nPlaceholders listos. Reemplazar cuando lleguen los assets oficiales.');
})().catch(e => { console.error(e); process.exit(1); });
