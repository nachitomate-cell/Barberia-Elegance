#!/usr/bin/env node
/**
 * check-wa-plan.js — Guard de la lista espejo de PLANES de WhatsApp.
 *
 * La derivación del plan vive en tres lugares que no pueden compartir código:
 *   1. functions/lib/wa-plan.js      (Cloud Functions)
 *   2. admin-panel/src/lib/waPlan.js (bundle Vite del panel)
 *   3. firestore.rules               (waPlanDeSys / waIncluyeBot / waIncluyeRecordatorios)
 *
 * Si los tres no coinciden, el sistema miente: el panel le ofrece al cliente
 * algo que las reglas le van a negar, o peor, las reglas dejan pasar algo que
 * el servidor no cobra. Este guard compara los tres y falla si divergen.
 *
 * Uso:  npm run check:wa-plan   (va dentro de `npm run check`)
 */
const fs = require('fs');
const path = require('path');

const raiz = path.resolve(__dirname, '..');
const leer = (p) => fs.readFileSync(path.join(raiz, p), 'utf8');

const F_SERVER = 'functions/lib/wa-plan.js';
const F_PANEL  = 'admin-panel/src/lib/waPlan.js';
const F_RULES  = 'firestore.rules';

let fallos = [];

/** Extrae la lista de planes de un `const PLANES = [...]`. */
function planesDeJs(src, archivo) {
  const m = src.match(/PLANES\s*=\s*\[([^\]]*)\]/);
  if (!m) { fallos.push(`${archivo}: no encontré la constante PLANES`); return null; }
  return m[1].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean).sort();
}

/** Extrae los planes nombrados en las reglas (`in ['bot', 'full']`, etc.). */
function planesDeRules(src) {
  const bot = src.match(/waIncluyeBot\([^)]*\)\s*\{\s*return\s+waPlanDe\([^)]*\)\s+in\s+\[([^\]]*)\]/);
  const rec = src.match(/waIncluyeRecordatorios\([^)]*\)\s*\{\s*return\s+waPlanDe\([^)]*\)\s+in\s+\[([^\]]*)\]/);
  if (!bot || !rec) { fallos.push(`${F_RULES}: no encontré waIncluyeBot / waIncluyeRecordatorios`); return null; }
  const lista = (m) => m[1].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
  return { bot: lista(bot).sort(), rec: lista(rec).sort() };
}

const srcServer = leer(F_SERVER);
const srcPanel  = leer(F_PANEL);
const srcRules  = leer(F_RULES);

const planesServer = planesDeJs(srcServer, F_SERVER);
const planesPanel  = planesDeJs(srcPanel,  F_PANEL);
const enRules      = planesDeRules(srcRules);

// 1. Las dos listas JS deben ser idénticas.
if (planesServer && planesPanel && planesServer.join('|') !== planesPanel.join('|')) {
  fallos.push(`PLANES difiere:\n      ${F_SERVER}: [${planesServer}]\n      ${F_PANEL}: [${planesPanel}]`);
}

// 2. Los planes que las reglas aceptan deben existir en la lista canónica.
if (planesServer && enRules) {
  for (const [quien, lista] of [['waIncluyeBot', enRules.bot], ['waIncluyeRecordatorios', enRules.rec]]) {
    const fuera = lista.filter(p => !planesServer.includes(p));
    if (fuera.length) fallos.push(`${F_RULES} ${quien}() nombra planes inexistentes: ${fuera.join(', ')}`);
  }
}

// 3. La retrocompat del booleano legacy tiene que estar en los tres.
const legacy = [
  [F_SERVER, /waAsistente\s*===\s*true/],
  [F_PANEL,  /waAsistente\s*===\s*true/],
  [F_RULES,  /waAsistente['"]?\s*,\s*false\)\s*==\s*true/],
];
for (const [archivo, re] of legacy) {
  const src = archivo === F_SERVER ? srcServer : archivo === F_PANEL ? srcPanel : srcRules;
  if (!re.test(src)) {
    fallos.push(`${archivo}: se perdió la retrocompat de waAsistente:true → 'full' (tenants viejos quedarían sin plan)`);
  }
}

// 4. Coherencia semántica: cada plan debe estar cubierto por al menos un módulo.
if (planesServer && enRules) {
  const cubiertos = new Set([...enRules.bot, ...enRules.rec]);
  const huerfanos = planesServer.filter(p => !cubiertos.has(p));
  if (huerfanos.length) {
    fallos.push(`Planes que no habilitan ningún módulo en las reglas: ${huerfanos.join(', ')}`);
  }
}

if (fallos.length) {
  console.error('\n❌ La lista espejo de planes de WhatsApp está desincronizada:\n');
  fallos.forEach(f => console.error(`   · ${f}`));
  console.error(`\n   Fuente de verdad: ${F_SERVER}. Sincroniza ${F_PANEL} y ${F_RULES}.\n`);
  process.exit(1);
}

console.log(`✓ Planes de WhatsApp sincronizados en los 3 lados: [${planesServer.join(', ')}]`);
