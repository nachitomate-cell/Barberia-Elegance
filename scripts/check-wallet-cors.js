#!/usr/bin/env node
/**
 * check-wallet-cors.js — Guard de la lista espejo de DOMINIOS PROPIOS.
 *
 * `functions/wallet-registro.js` acepta CORS de `*.synaptechspa.cl`,
 * `*.bioo.cl` y `*.wallo.cl` por regex, más una lista explícita de los
 * locales que sirven su agenda desde dominio propio. Esa lista es un
 * espejo del mapa de hosts de `middleware.js`, que corre en el Edge de
 * Vercel y no se puede importar desde Cloud Functions.
 *
 * Si middleware gana un dominio propio y nadie lo agrega al endpoint, el
 * navegador bloquea el POST por CORS y ese local se queda sin poder
 * ofrecer la tarjeta — en silencio, sin error visible en el panel.
 *
 * Uso:  npm run check:wallet-cors   (va dentro de `npm run check`)
 */
const fs = require('fs');
const path = require('path');

const raiz = path.resolve(__dirname, '..');
const leer = (p) => fs.readFileSync(path.join(raiz, p), 'utf8');

const F_MIDDLEWARE = 'middleware.js';
const F_ENDPOINT   = 'functions/wallet-registro.js';

const fallos = [];

/** Hosts del mapa `'host': 'tenant',` de middleware.js. */
function hostsDeMiddleware(src) {
  const hosts = [];
  const re = /^\s*'([a-z0-9][a-z0-9.-]*\.[a-z]{2,})'\s*:\s*'[a-z0-9_]+'/gim;
  let m;
  while ((m = re.exec(src)) !== null) hosts.push(m[1].toLowerCase());
  return [...new Set(hosts)];
}

/** Lista DOMINIOS_PROPIOS del endpoint. */
function dominiosDelEndpoint(src) {
  const m = src.match(/DOMINIOS_PROPIOS\s*=\s*\[([\s\S]*?)\]/);
  if (!m) { fallos.push(`${F_ENDPOINT}: no encontré la constante DOMINIOS_PROPIOS`); return null; }
  return m[1].split(',')
    .map((s) => s.trim().replace(/^['"]|['"]$/g, '').trim())
    .filter(Boolean)
    .map((s) => s.toLowerCase());
}

// Los cubiertos por el regex del endpoint no necesitan estar en la lista.
const CUBIERTO_POR_REGEX = /\.(synaptechspa\.cl|bioo\.cl|wallo\.cl)$/i;

const hosts     = hostsDeMiddleware(leer(F_MIDDLEWARE));
const dominios  = dominiosDelEndpoint(leer(F_ENDPOINT));

if (dominios) {
  const propios = hosts.filter((h) => !CUBIERTO_POR_REGEX.test(h));

  const faltantes = propios.filter((h) => !dominios.includes(h));
  if (faltantes.length) {
    fallos.push(
      `Dominios propios en ${F_MIDDLEWARE} que ${F_ENDPOINT} bloquearía por CORS:\n` +
      faltantes.map((h) => `      · ${h}`).join('\n') +
      `\n    → agrégalos a DOMINIOS_PROPIOS.`
    );
  }

  const sobrantes = dominios.filter((d) => !hosts.includes(d));
  if (sobrantes.length) {
    fallos.push(
      `DOMINIOS_PROPIOS tiene hosts que ya no existen en ${F_MIDDLEWARE}:\n` +
      sobrantes.map((h) => `      · ${h}`).join('\n') +
      `\n    → sácalos o corrige el typo.`
    );
  }

  if (!fallos.length) {
    console.log(`✓ check:wallet-cors — ${propios.length} dominio(s) propio(s) cubierto(s) por el endpoint.`);
  }
}

if (fallos.length) {
  console.error('\n✗ check:wallet-cors falló:\n');
  fallos.forEach((f) => console.error(`  - ${f}\n`));
  process.exit(1);
}
