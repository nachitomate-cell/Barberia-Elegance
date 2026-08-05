'use strict';

/**
 * scripts/gen-pwa-icons.js
 * ─────────────────────────────────────────────────────────────────
 *  Genera íconos PWA cuadrados por tenant (192x192 y 512x512 PNG)
 *  a partir del logo de cada local, centrado sobre el color de fondo
 *  de su manifest (safe zone ~80% para purpose maskable).
 *
 *  Salida: icons/pwa/{tenant}-192.png / {tenant}-512.png
 *  Los tenants kronnos_penablanca/limache/lobby reusan kronnos-*.
 *  yugen ya tiene íconos propios (yugen/yugen-192|512.png) — no se genera.
 *
 *  Uso: node scripts/gen-pwa-icons.js
 * ─────────────────────────────────────────────────────────────────
 */

const path  = require('path');
const fs    = require('fs');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const OUT  = path.join(ROOT, 'icons', 'pwa');

// fit 'cover' = el logo llena el ícono completo (para logos que ya traen su
// propio fondo — con padding quedan chicos/invisibles sobre fondo oscuro).
const TENANTS = {
  elegance:             { src: 'logo.jpg',                        bg: '#050505' },
  ferraza:              { src: 'local1.jpg',                      bg: '#000000' },
  gitana:               { src: 'gitana.png',                      bg: '#050505' },
  mapubarbershop:       { src: 'mapu2.png',                       bg: '#2A1E22' },
  chameleon:            { src: 'local3.jpg',                      bg: '#c9a84c' },
  delnero:              { src: 'nero.jpg',                        bg: '#050505' },
  marcelo_hairdressing: { src: 'marcelo1.png',                    bg: '#050505' },
  lumen:                { src: 'djones.png',                      bg: '#030712' },
  aura:                 { src: 'aura.png',                        bg: '#0a0a0a' },
  latincaribe:          { src: 'thelatin/latin.png',              bg: '#0a0a0a' },
  machos:               { src: 'machos.png',                      bg: '#090d16' },
  infinity:             { src: 'infinity.png',                    bg: '#121214' },
  // Omega: el Ω ya viene recortado y con alfa (omega/logo.webp), así que el
  // fondo hueso de marca queda visible alrededor. El omega.jpg original traía
  // su propio fondo blanco puro y se veía como un parche sobre el hueso.
  omega:                { src: 'omega/logo.webp',                 bg: '#f8f7f4' },
  sionbarberia:         { src: 'dieciseis/logo.png',              bg: '#0a0a0a' },
  kronnos:              { src: 'kronnos/studio.jpg',              bg: '#0a0a0a' },
  kronnos_woman:        { src: 'kronnos/woman.jpg',               bg: '#0a0a0a' },
  barbersclub:          { src: 'barbersclub/barber12.jpg',        bg: '#0a0a0a' },
  elbarberomoderno:     { src: 'elbarberomoderno/logobarb.webp',  bg: '#0b0a09' },
  estudioluxury:        { src: 'luxury/luxury.jpg',               bg: '#0a0a0a', fit: 'cover' },
  deluxeperfumes:       { src: 'logo5.jpg',                       bg: '#0a0a0a' },
  memphis:              { src: 'mem.png',                         bg: '#0a0a0a' },
  renacer:              { src: 'renacer/logo.webp',               bg: '#0a0806' },
  // Oren: el logo REAL es oren-logo.webp (subido por el panel — cuadrado negro
  // con wordmark blanco). Los oren-192/512 anteriores eran copias a mano del
  // placeholder de la demo (logo.png con tijeras doradas) y no correspondían.
  oren:                 { src: 'oren/oren-logo.webp',             bg: '#0a0a0d', fit: 'cover' },
  // Restaurante Demo: logo placeholder cálido (naranja/madera). Se reemplaza
  // por el logo real del cliente cuando cierre; el path del manifest queda igual.
  restodemo:            { src: 'restodemo/logo.jpg',              bg: '#100906', fit: 'cover' },
  // Sion Barbería (Viña) — logo scrapeado del mini-site AgendaPro. Fondo
  // matchea themeColor #2C3941 del middleware.
  sion:                 { src: 'sion.png',                        bg: '#2C3941' },
  // Blood Habib: el logo es el letrero blackletter recortado de la fachada,
  // ya montado sobre negro → 'cover' para que llene el ícono sin doble marco.
  bloodhabib:           { src: 'bloodhabib/logo.png',             bg: '#080808', fit: 'cover' },
  // SynapTech Studio: ícono del TWA (app.synaptechspa.cl → Google Play).
  // Bg matchea theme_color del manifest hub (middleware.js) — sin esto Android
  // pinta un halo distinto entre splash y app.
  synaptech:            { src: 'synaptech/ig.png',                bg: '#0f172a' },
  // Local de práctica del equipo comercial. El logo lo genera
  // scripts/gen-practica-brand.js (monograma champán sobre negro), así que no
  // depende de ningún archivo subido a mano: si se borra, se vuelve a generar.
  practica:             { src: 'practica/logo.png',               bg: '#0B0B0D', fit: 'cover' },
};

const SIZES = [192, 512];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  let ok = 0, fail = 0;

  for (const [tenant, { src, bg, fit }] of Object.entries(TENANTS)) {
    const srcPath = path.join(ROOT, src);
    if (!fs.existsSync(srcPath)) {
      console.error(`✗ ${tenant}: falta ${src}`);
      fail++;
      continue;
    }
    for (const size of SIZES) {
      if (fit === 'cover') {
        await sharp(srcPath)
          .resize(size, size, { fit: 'cover', position: 'centre' })
          .png()
          .toFile(path.join(OUT, `${tenant}-${size}.png`));
        continue;
      }
      // Safe zone maskable: logo al 80% del canvas, centrado sobre bg.
      const content = Math.round(size * 0.8);
      const logo = await sharp(srcPath)
        .resize(content, content, { fit: 'contain', background: bg })
        .toBuffer();
      await sharp({
        create: { width: size, height: size, channels: 3, background: bg },
      })
        .composite([{ input: logo, gravity: 'center' }])
        .png()
        .toFile(path.join(OUT, `${tenant}-${size}.png`));
    }
    console.log(`✓ ${tenant} (192 + 512)`);
    ok++;
  }

  console.log(`\n${ok} tenants OK, ${fail} con error → ${path.relative(ROOT, OUT)}/`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
