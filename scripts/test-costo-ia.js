'use strict';

// scripts/test-costo-ia.js
// ─────────────────────────────────────────────────────────────────────────────
//  Guard del costo de IA que muestra ops.
//
//  Falla medida el 06-08-2026: ops decía US$2,94 en 30 días cuando la consola
//  de Anthropic marcaba US$4,41 en 6. Dos causas, las dos silenciosas:
//
//   1. `claude-sonnet-5` no estaba en la tabla de precios y caía al default
//      ($1/$5 en vez de $3/$15): un tercio del costo real.
//   2. bot-oficial.js y bioo-ai-builder.js llamaban a Claude sin registrar
//      nada, así que su gasto no existía para el panel.
//
//  Un gasto subcontado no se nota: el número se ve bien y la factura llega
//  igual. Por eso se testea que TODO el que llama a Claude registre, y que
//  todo modelo en uso tenga precio.
//
//  Uso: npm run test:costo
// ─────────────────────────────────────────────────────────────────────────────

const fs   = require('fs');
const path = require('path');

const FN = path.join(__dirname, '..', 'functions');
let fallos = 0;
const ok = (n, cond, extra) => {
  console.log(`${cond ? '  ✓' : '  ✗'} ${n}${cond ? '' : `  → ${extra}`}`);
  if (!cond) fallos++;
};

/* ── Quién llama a Claude, y quién lo registra ───────────────────────────── */
function archivosJs(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('_')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) archivosJs(p, acc);
    else if (e.name.endsWith('.js')) acc.push(p);
  }
  return acc;
}

const archivos = archivosJs(FN);
const llamanAClaude = [];
const modelosEnUso = new Set();

for (const f of archivos) {
  const src = fs.readFileSync(f, 'utf8');
  if (!/new Anthropic\(/.test(src)) continue;
  llamanAClaude.push({ archivo: path.relative(FN, f), registra: /logAiUsage\(/.test(src) });
  for (const m of src.matchAll(/['"](claude-[a-z0-9.-]+)['"]/g)) modelosEnUso.add(m[1]);
}

console.log('\n💸 Todo el que gasta, registra');
ok(`se encontraron módulos que llaman a Claude (${llamanAClaude.length})`,
  llamanAClaude.length > 0, 'el detector no encontró ninguno — ¿cambió el patrón?');
for (const m of llamanAClaude) {
  ok(`${m.archivo} registra su gasto`, m.registra,
    'llama a Claude sin logAiUsage: su costo es invisible en ops');
}

/* ── Todo modelo en uso tiene precio ─────────────────────────────────────── */
console.log('\n🏷️  Todo modelo en uso tiene precio');
const METRICS = fs.readFileSync(path.join(FN, 'lib', 'metrics.js'), 'utf8');
const tabla = METRICS.slice(METRICS.indexOf('const PRICE'), METRICS.indexOf('PRECIO_DESCONOCIDO'));
for (const modelo of [...modelosEnUso].sort()) {
  ok(`${modelo} está en la tabla`, tabla.includes(`'${modelo}'`),
    'cae al precio por defecto y el gasto se subcuenta');
}

/* ── Cómo se comporta el cálculo ─────────────────────────────────────────── */
console.log('\n🧮 Reglas del cálculo');
ok('el default es el precio MÁS CARO conocido',
  /PRECIO_DESCONOCIDO = \{ in: 5\.0, out: 25\.0 \}/.test(METRICS),
  'un default barato hace invisible el gasto de un modelo nuevo');
ok('un modelo desconocido deja aviso en el log',
  /modelo sin precio en la tabla/.test(METRICS),
  'sin aviso, nadie se entera de que falta un precio');
ok('las tarifas de lanzamiento tienen fecha de vencimiento',
  /intro:.*hasta/.test(METRICS) && /p\.intro\.hasta/.test(METRICS),
  'una tarifa intro fija subcuenta desde el día que vence');
ok('la escritura de caché a 1 h se cobra al doble',
  /write1h \/ 1e6\) \* p\.in \* 2/.test(METRICS),
  'el bot usa TTL de 1 h; cobrarla a 1,25x subcuenta');
ok('la escritura de caché a 5 min se cobra a 1,25x',
  /write5m \/ 1e6\) \* p\.in \* 1\.25/.test(METRICS), 'multiplicador incorrecto');
ok('la lectura de caché se cobra a 0,1x',
  /cacheReadTokens \/ 1e6\) \* p\.in \* 0\.1/.test(METRICS), 'multiplicador incorrecto');

console.log(fallos === 0
  ? '\n✅ El costo de IA que muestra ops refleja lo que se paga de verdad.\n'
  : `\n❌ ${fallos} problema(s) — el gasto mostrado estaría por debajo del real.\n`);
process.exit(fallos ? 1 : 0);
