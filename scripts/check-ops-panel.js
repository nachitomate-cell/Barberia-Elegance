'use strict';

// scripts/check-ops-panel.js
// ─────────────────────────────────────────────────────────────────────────────
//  Guard del panel de operaciones (ops.html).
//
//  ops.html es UN archivo con un solo <script> gigante: un paréntesis suelto no
//  rompe el build de nadie, simplemente deja el panel en blanco la próxima vez
//  que alguien lo abra — y como es interno, se descubre tarde y de la peor forma.
//
//  Además cuida las dos reglas de rendimiento que se ganaron midiendo
//  (05-08-2026): abrir el panel costaba ~600 lecturas de Firestore y 3-8 s, y
//  CADA acción disparaba una recarga global. Si alguien vuelve a meter un
//  `cargar()` dentro de una mutación, la regresión vuelve entera.
//
//  Uso: npm run check:ops
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ARCHIVO = path.join(__dirname, '..', 'ops.html');
const html = fs.readFileSync(ARCHIVO, 'utf8');

let fallos = 0;
const ok = (nombre, cond, extra) => {
  console.log(`${cond ? '  ✓' : '  ✗'} ${nombre}${cond ? '' : `  → ${extra}`}`);
  if (!cond) fallos++;
};

/* ── 1. El <script> inline tiene que parsear ─────────────────────────────── */
console.log('\n📄 Sintaxis');
const bloques = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
ok('hay un <script> inline', bloques.length > 0, 'no encontré ninguno');
let src = '';
bloques.forEach((b, i) => {
  src += b;
  let err = null;
  try { new vm.Script(b); } catch (e) { err = e.message; }
  ok(`bloque ${i + 1} parsea`, !err, err);
});

/* ── 2. Toda función usada en un onclick/handler tiene que existir ───────── */
console.log('\n🔗 Funciones referenciadas');
const REQUERIDAS = [
  'render', 'cargar', 'cargarLivianos', 'repintar', 'frescuraHtml',
  'seccionVentas', 'seccionCobranza',
  'refrescarVentas', 'refrescarCobranza', 'refrescarChips', 'refrescarAds',
  'metaAdsPanel', 'embudoHtml', 'sparkHtml', 'clpOpt',
  'leadsPanel', 'botVentasPanel', 'cobranzaPanel', 'chipsAdminPanel', 'chipPanel', 'metaWaPanel',
];
for (const f of REQUERIDAS) {
  ok(`${f}()`, src.includes(`function ${f}(`), 'no está definida');
}

// Los `onclick="algo(...)"` del HTML generado llaman funciones globales: si una
// se renombra sin actualizar la plantilla, el botón muere en silencio.
const llamadasInline = [...src.matchAll(/onclick="(\w+)\(/g)].map((m) => m[1]);
const definidas = new Set([
  ...[...src.matchAll(/function\s+(\w+)\s*\(/g)].map((m) => m[1]),
  // Algunos handlers se cuelgan de window para poder llamarse desde el HTML
  // generado dentro de otra función (p.ej. window._setTab = setTab).
  ...[...src.matchAll(/window\.(\w+)\s*=/g)].map((m) => m[1]),
]);
const huerfanas = [...new Set(llamadasInline)].filter((n) => !definidas.has(n) && !['confirm', 'alert'].includes(n));
ok('ningún onclick apunta a una función inexistente', huerfanas.length === 0, huerfanas.join(', '));

/* ── 3. Rendimiento: nada de recargas globales en las mutaciones ─────────── */
console.log('\n⚡ Rendimiento (regresiones medidas el 05-08-2026)');
ok('ninguna mutación llama a cargar() global',
  !/await cargar\(\)/.test(src),
  'volvió el patrón "una acción = recargar todo" (~600 lecturas por clic)');

ok('la carga inicial usa el snapshot precalculado',
  src.includes("_fn('opsSnapshot')"),
  'ops volvió a pegarle directo a opsMetrics al abrir');

ok('opsMetrics ya no se llama en la carga inicial',
  !/_fn\('opsMetrics'\)/.test(src),
  'la ruta cara volvió a la apertura del panel');

ok('el botón Actualizar pide datos frescos explícitamente',
  src.includes('cargar(true)'),
  'sin fresco:true el botón devuelve el mismo snapshot y parece roto');

ok('el panel declara la edad del dato',
  src.includes('frescuraHtml') && src.includes('edadSegundos'),
  'un snapshot sin fecha visible hace creer que el dato es de ahora');

/* ── 4. Ancho útil en monitores grandes ──────────────────────────────────── */
// El panel vivía clavado a 1040px: en un monitor de 1920 eso dejaba ~440px
// muertos a cada lado y estiraba las filas hasta que etiqueta y valor quedaban
// en extremos opuestos. Medido con Playwright tras el arreglo: 97% del ancho a
// 1280px, 81% a 1920 y 72% a 2560, con 2 y 3 columnas de paneles.
console.log('\n🖥️  Ancho en pantallas grandes');
const est = (html.match(/<style>([\s\S]*?)<\/style>/i) || [, ''])[1];
ok('el ancho máximo es una variable, no un número fijo',
  /--maxw\s*:/.test(est) && /\.wrap\{[^}]*max-width:\s*var\(--maxw\)/.test(est),
  '.wrap volvió a un max-width hardcodeado');
ok('las pestañas siguen el mismo ancho que el contenido',
  /\.tabs\{[^}]*max-width:\s*var\(--maxw\)/.test(est),
  'las pestañas quedaron desalineadas del contenido');
ok('hay breakpoints que ensanchan en monitores grandes',
  /min-width:\s*1600px/.test(est) && /min-width:\s*2000px/.test(est),
  'sin tramos anchos el panel desperdicia media pantalla');
ok('los paneles fluyen en columnas desde 1280px',
  /min-width:\s*1280px\)\s*\{[\s\S]{0,400}?\.sec\.on\{[\s\S]{0,200}?display:grid/.test(est),
  'las secciones volvieron a apilarse en una sola columna');
ok('los bloques anchos ocupan la fila completa',
  /\.sec\.on\s*>\s*\.full\{[^}]*grid-column:1\s*\/\s*-1/.test(est.replace(/\s*,\s*/g, ',')) ||
  /grid-column:1 \/ -1/.test(est),
  'kpis/.cols/.full quedarían encerrados en una columna');

/* ── 5. Paleta SynapTech ─────────────────────────────────────────────────── */
console.log('\n🎨 Paleta');
const estilo = (html.match(/<style>([\s\S]*?)<\/style>/i) || [, ''])[1];
ok('usa la lima de marca (#9CCC3C)', /#9CCC3C/i.test(estilo), 'no está el verde de marca');
ok('el neón (#C6F94E) está declarado', /#C6F94E/i.test(estilo), 'falta el acento');
// Regla de los dos verdes: el neón es ACENTO, no superficie. Se prohíbe
// explícitamente como fondo de los contenedores grandes; en barras de 2 px,
// puntos de estado y hovers sigue siendo legítimo.
const SUPERFICIES = ['body', 'header', '.panel', '.kpi', '.sec', '.wrap', '.tabs', '.modal', '.box'];
const abusos = SUPERFICIES.filter((sel) => {
  const re = new RegExp(`${sel.replace('.', '\\.')}\\s*\\{[^}]*background:\\s*var\\(--neon\\)`, 'i');
  return re.test(estilo);
});
ok('el neón no es fondo de ninguna superficie grande', abusos.length === 0,
  `${abusos.join(', ')} — el acento dejó de ser acento (regla de los dos verdes)`);
ok('no quedan restos de la paleta vieja', !/#0d1117|#7aa8ff|#5ee89a|rgba\(94,232,154/i.test(estilo),
  'quedaron colores del tema anterior');

console.log(fallos === 0
  ? '\n✅ ops.html sano: parsea, no tiene handlers huérfanos y conserva la carga rápida.\n'
  : `\n❌ ${fallos} problema(s) en ops.html.\n`);
process.exit(fallos ? 1 : 0);
