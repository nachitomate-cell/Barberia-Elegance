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
  // ── Web / Conectividad ──
  ['globe',          'globe',     'Web'],
  ['link-2',         'link',      'Enlace'],
  ['smartphone',     'phone-m',   'Móvil'],
  ['qr-code',        'qr',        'QR'],
  ['monitor',        'monitor',   'Pantalla'],
  ['laptop',         'laptop',    'Laptop'],
  ['tv',             'tv',        'TV'],
  ['wifi',           'wifi',      'WiFi'],

  // ── Social ──
  ['instagram',      'instagram', 'Instagram'],
  ['facebook',       'facebook',  'Facebook'],
  ['youtube',        'youtube',   'YouTube'],
  ['twitter',        'twitter',   'Twitter / X'],
  ['linkedin',       'linkedin',  'LinkedIn'],
  ['github',         'github',    'GitHub'],
  ['twitch',         'twitch',    'Twitch'],
  ['apple',          'apple',     'Apple'],
  ['message-circle', 'chat',      'Chat'],
  ['send',           'send',      'Mensaje'],

  // ── Media ──
  ['music',          'music',     'Música'],
  ['headphones',     'audio',     'Audio'],
  ['mic-vocal',      'podcast',   'Podcast'],
  ['mic',            'mic',       'Micrófono'],
  ['video',          'video',     'Video'],
  ['camera',         'camera',    'Cámara'],
  ['image',          'image',     'Foto'],
  ['play',           'play',      'Reproducir'],
  ['film',           'film',      'Cine'],

  // ── Comercio ──
  ['shopping-cart',  'cart',      'Tienda'],
  ['shopping-bag',   'bag',       'Compras'],
  ['gift',           'gift',      'Regalo'],
  ['tag',            'tag',       'Oferta'],
  ['credit-card',    'card',      'Pago'],
  ['dollar-sign',    'dollar',    'Precio'],
  ['percent',        'percent',   'Descuento'],
  ['package',        'package',   'Paquete'],
  ['truck',          'truck',     'Envío'],
  ['store',          'store',     'Local'],
  ['receipt',        'receipt',   'Boleta'],
  ['wallet',         'wallet',    'Billetera'],
  ['piggy-bank',     'piggy',     'Ahorro'],

  // ── Trabajo / Negocio ──
  ['briefcase',      'work',      'Trabajo'],
  ['building',       'office',    'Oficina'],
  ['mail',           'mail',      'Correo'],
  ['phone',          'call',      'Llamada'],
  ['calendar',       'calendar',  'Agenda'],
  ['map-pin',        'pin',       'Ubicación'],
  ['file-text',      'doc',       'Documento'],
  ['presentation',   'present',   'Presentación'],
  ['users',          'team',      'Equipo'],

  // ── Personal / Emoción ──
  ['heart',          'heart',     'Favorito'],
  ['star',           'star',      'Estrella'],
  ['sparkles',       'sparkles',  'Nuevo'],
  ['flame',          'flame',     'Hot'],
  ['crown',          'crown',     'Premium'],
  ['smile',          'smile',     'Sonrisa'],
  ['thumbs-up',      'like',      'Me gusta'],
  ['bookmark',       'bookmark',  'Guardar'],
  ['award',          'award',     'Premio'],
  ['trophy',         'trophy',    'Trofeo'],
  ['medal',          'medal',     'Medalla'],

  // ── Servicio / Belleza ──
  ['scissors',       'scissors',  'Cortar'],
  ['brush',          'brush',     'Pintura'],
  ['paintbrush',     'paintbr',   'Pincel'],
  ['shirt',          'shirt',     'Ropa'],
  ['droplet',        'droplet',   'Gota'],

  // ── Lifestyle / Food ──
  ['coffee',         'coffee',    'Café'],
  ['utensils',       'food',      'Comida'],
  ['pizza',          'pizza',     'Pizza'],
  ['wine',           'wine',      'Vino'],
  ['beer',           'beer',      'Cerveza'],
  ['cake',           'cake',      'Pastel'],
  ['ice-cream-cone', 'icecream',  'Helado'],

  // ── Naturaleza ──
  ['leaf',           'leaf',      'Hoja'],
  ['sun',            'sun',       'Sol'],
  ['moon',           'moon',      'Luna'],
  ['sprout',         'sprout',    'Brote'],

  // ── Hogar / Misc ──
  ['house',          'house',     'Casa'],
  ['target',         'target',    'Objetivo'],
  ['gem',            'gem',       'Diamante'],
  ['book',           'book',      'Libro'],
  ['book-open',      'book-o',    'Lectura'],
  ['graduation-cap', 'graduate',  'Educación'],
  ['gamepad-2',      'gaming',    'Gaming'],
  ['dumbbell',       'fitness',   'Fitness'],
  ['rocket',         'rocket',    'Lanzamiento'],
  ['car',            'car',       'Auto'],
  ['plane',          'plane',     'Viaje'],
  ['bike',           'bike',      'Bici'],
  ['key',            'key',       'Acceso'],
  ['shield',         'shield',    'Seguridad'],
  ['bell',           'bell',      'Notificación'],
  ['search',         'search',    'Buscar'],
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
