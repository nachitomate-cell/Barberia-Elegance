// Lee los íconos seleccionados de lucide-react y emite un módulo TS con el
// inner-SVG (paths/circles/etc.) listo para inyectar tanto en el editor como
// en la vista pública (links/u.html). Re-ejecutable: la salida es determinista.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const lucideDir = join(__dirname, '..', 'node_modules', 'lucide-react', 'dist', 'esm', 'icons');
const outTs = join(__dirname, '..', 'src', 'lib', 'buttonIcons.ts');
const outJson = join(__dirname, '..', '..', 'links', '_button-icons.json');

// [lucide-file-name, key estable, label en español].
const ICONS = [
  ['globe',          'globe',     'Web'],
  ['link-2',         'link',      'Enlace'],
  ['smartphone',     'phone-m',   'Móvil'],
  ['qr-code',        'qr',        'QR'],
  ['instagram',      'instagram', 'Instagram'],
  ['facebook',       'facebook',  'Facebook'],
  ['youtube',        'youtube',   'YouTube'],
  ['message-circle', 'chat',      'Chat'],
  ['send',           'send',      'Mensaje'],
  ['music',          'music',     'Música'],
  ['headphones',     'audio',     'Audio'],
  ['mic-vocal',      'podcast',   'Podcast'],
  ['video',          'video',     'Video'],
  ['camera',         'camera',    'Cámara'],
  ['image',          'image',     'Foto'],
  ['shopping-cart',  'cart',      'Tienda'],
  ['shopping-bag',   'bag',       'Compras'],
  ['gift',           'gift',      'Regalo'],
  ['tag',            'tag',       'Oferta'],
  ['credit-card',    'card',      'Pago'],
  ['briefcase',      'work',      'Trabajo'],
  ['mail',           'mail',      'Correo'],
  ['phone',          'call',      'Llamada'],
  ['calendar',       'calendar',  'Agenda'],
  ['map-pin',        'pin',       'Ubicación'],
  ['heart',          'heart',     'Favorito'],
  ['star',           'star',      'Estrella'],
  ['sparkles',       'sparkles',  'Nuevo'],
  ['flame',          'flame',     'Hot'],
  ['crown',          'crown',     'Premium'],
  ['scissors',       'scissors',  'Cortar'],
  ['brush',          'brush',     'Pintura'],
  ['coffee',         'coffee',    'Café'],
  ['utensils',       'food',      'Comida'],
  ['dumbbell',       'fitness',   'Fitness'],
  ['rocket',         'rocket',    'Lanzamiento'],
];

/** Parsea el array de definición que exporta lucide-react y devuelve string SVG inner. */
function buildSvgInner(defLiteral) {
  // El export tiene forma: createLucideIcon("Name", [ ["tag", { d:"…", key:"…" }], … ])
  // Extraemos el bloque array literal completo y lo evaluamos en sandbox simple.
  const arrStart = defLiteral.indexOf('[');
  const arrEnd = defLiteral.lastIndexOf(']') + 1;
  const arrText = defLiteral.slice(arrStart, arrEnd);
  // Evaluamos con Function (es solo data literal sin código).
  // eslint-disable-next-line no-new-func
  const arr = Function('"use strict";return (' + arrText + ')')();
  return arr.map(([tag, attrs]) => {
    const attrStr = Object.entries(attrs)
      .filter(([k]) => k !== 'key')
      .map(([k, v]) => `${k}="${v}"`)
      .join(' ');
    return `<${tag} ${attrStr}/>`;
  }).join('');
}

const entries = [];
async function readIconSource(file) {
  let src = await readFile(join(lucideDir, `${file}.js`), 'utf8');
  // Algunos íconos son re-exports (mic-2 → mic-vocal). Resolvemos hasta 3 saltos.
  let hops = 0;
  while (src.indexOf('[') === -1 && hops < 3) {
    const m = src.match(/from ['"]\.\/([^'"]+)['"]/);
    if (!m) break;
    src = await readFile(join(lucideDir, m[1]), 'utf8');
    hops++;
  }
  return src;
}

for (const [file, key, label] of ICONS) {
  const src = await readIconSource(file);
  const inner = buildSvgInner(src);
  entries.push({ key, label, svg: inner });
}

// Output TS para el editor.
const ts = `// AUTO-GENERADO por scripts/extract-icons.mjs — NO editar a mano.
// Para regenerar: node scripts/extract-icons.mjs

export interface ButtonIconDef {
  key: string;
  label: string;
  /** Inner-SVG (paths/circles/etc.) sin el wrapper <svg>. stroke="currentColor". */
  svg: string;
}

export const BUTTON_ICONS: ButtonIconDef[] = ${JSON.stringify(entries, null, 2)};

export const BUTTON_ICON_MAP: Record<string, ButtonIconDef> = Object.fromEntries(
  BUTTON_ICONS.map((i) => [i.key, i]),
);
`;
await writeFile(outTs, ts, 'utf8');

// Output JSON para u.html (lo inyectamos como objeto literal a mano abajo).
await writeFile(outJson, JSON.stringify(
  Object.fromEntries(entries.map((e) => [e.key, e.svg])),
  null, 2,
), 'utf8');

console.log(`✓ ${entries.length} íconos extraídos`);
console.log(`  → ${outTs}`);
console.log(`  → ${outJson}`);
