#!/usr/bin/env node
/**
 * check-dominios-espejo.js — los dos mapas de dominio tienen que decir lo mismo.
 *
 * Hay DOS resolutores de tenant por hostname y viven en repos mentales
 * distintos:
 *
 *   · `DOMAIN_MAP` de middleware.js — Edge, decide marca/SEO/manifest.
 *   · `DOMAIN_MAP` de admin-panel/src/lib/tenantUtils.js — cliente, decide de
 *     QUÉ tenant lee el panel.
 *
 * No pueden compartir código: uno corre en el Edge de Vercel y el otro es un
 * módulo Vite. Cuando se separan, el modo de falla es de los caros: el host
 * pinta la marca correcta y el panel lee las colecciones de OTRO local, sin un
 * solo error en consola.
 *
 * Y el default lo empeora: un host que tenantUtils no conoce cae a 'elegance',
 * que NO es un tenant vacío sino una barbería viva en las colecciones RAÍZ.
 * Pasó el 08-08-2026 con `admin.kronnos.synaptechspa.cl` — el host desde el que
 * Claudio tiene instalada la PWA de Kronnos. Estaba en middleware.js desde
 * siempre y nunca en tenantUtils.js: al abrir la app en frío (sin `?local=` y
 * con sessionStorage recién nacido) le aparecía el equipo de Elegance.
 *
 * Este guard exige que TODO host del middleware exista del otro lado, como
 * tenant o declarado como lobby de marca.
 *
 * Uso:  node scripts/check-dominios-espejo.js
 *       npm run check:dominios
 */
const fs   = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');

// Hosts que el Edge resuelve a algo que NO es un tenant del panel: lobbies de
// marca, landings y sitios que no son un local. No se les exige espejo.
const NO_SON_TENANT = new Set(['kronnos_lobby']);

/** Saca los pares 'host': 'valor' de un objeto literal JS. */
function leerMapa(archivo, nombreConst) {
  const txt = fs.readFileSync(path.join(RAIZ, archivo), 'utf8');
  const i = txt.indexOf(`${nombreConst} = {`);
  if (i === -1) return null;
  // Hasta el primer cierre a nivel de columna 0: los literales del repo se
  // cierran con `};` al margen, y así no nos comemos el resto del archivo.
  const fin = txt.indexOf('\n};', i);
  const cuerpo = txt.slice(i, fin === -1 ? undefined : fin);
  const mapa = {};
  for (const m of cuerpo.matchAll(/'([a-z0-9.-]+\.[a-z]{2,})'\s*:\s*'([^']+)'/gi)) {
    mapa[m[1].toLowerCase()] = m[2];
  }
  return mapa;
}

const edge  = leerMapa('middleware.js', 'const DOMAIN_MAP');
const panel = leerMapa('admin-panel/src/lib/tenantUtils.js', 'const DOMAIN_MAP');
const lobby = leerMapa('admin-panel/src/lib/tenantUtils.js', 'const LOBBY_HOSTS') || {};

let fallos = 0;
const mal = m => { console.log('  ✗ ' + m); fallos++; };

console.log('\n== dominios: middleware.js  vs  tenantUtils.js ==');

if (!edge)  mal('no encontré DOMAIN_MAP en middleware.js');
if (!panel) mal('no encontré DOMAIN_MAP en admin-panel/src/lib/tenantUtils.js');

if (edge && panel) {
  console.log(`  edge: ${Object.keys(edge).length} hosts · panel: ${Object.keys(panel).length} + ${Object.keys(lobby).length} de lobby`);

  for (const [host, tid] of Object.entries(edge)) {
    if (NO_SON_TENANT.has(tid)) {
      // El Edge no lo trata como local, pero el panel igual necesita saber a
      // dónde mandar a quien abra /gestion-interna/ ahí.
      if (!panel[host] && !lobby[host]) {
        mal(`${host} → el Edge lo marca "${tid}" (no es un local) y el panel no lo conoce: cae al fallback 'elegance' = colecciones RAÍZ.`);
      }
      continue;
    }
    if (!panel[host] && !lobby[host]) {
      mal(`${host} → middleware dice "${tid}" y tenantUtils no lo tiene: el panel cae al fallback 'elegance' = colecciones RAÍZ.`);
    } else if (panel[host] && panel[host] !== tid) {
      mal(`${host} → middleware dice "${tid}" y tenantUtils dice "${panel[host]}": marca de uno, datos del otro.`);
    }
  }

  // Al revés es aviso, no falla: el panel puede conocer hosts que el Edge no
  // necesita tocar (dominios internos, hosts de desarrollo).
  const sobran = Object.keys(panel).filter(h => !edge[h]);
  if (sobran.length) {
    console.log(`  – ${sobran.length} host(s) solo en el panel (sin SEO por Edge): ${sobran.join(', ')}`);
  }
}

if (fallos === 0) console.log('  ✓ todos los hosts del Edge tienen destino en el panel');
console.log(fallos === 0 ? '\nOK\n' : `\n${fallos} problema(s)\n`);
process.exit(fallos ? 1 : 0);
