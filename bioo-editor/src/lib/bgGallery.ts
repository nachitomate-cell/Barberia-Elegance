/**
 * Galería curada de fondos premium (Unsplash, licencia libre).
 * Las imágenes viven en `/bg/` (raíz del repo Vercel) y se sirven con
 * cache infinito. Cada item expone `url` (1080w, 9:16) para el fondo
 * real y `thumb` (200w) para la grilla del editor.
 *
 * URL pública: https://bioo.cl/bg/{filename}.webp
 */

export type BgCategory = 'espacio' | 'naturaleza' | 'abstracto' | 'minimalista';

export interface BgGalleryItem {
  id: string;
  /** URL absoluta de la imagen full (1080w, ~9:16). */
  url: string;
  /** URL absoluta del thumbnail (200w). */
  thumb: string;
  category: BgCategory;
  label: string;
}

export const BG_CATEGORIES: { id: BgCategory; label: string }[] = [
  { id: 'espacio',      label: 'Espacio'      },
  { id: 'naturaleza',   label: 'Naturaleza'   },
  { id: 'abstracto',    label: 'Abstracto'    },
  { id: 'minimalista',  label: 'Minimalista'  },
];

/** Helper interno: genera item desde category + slug + label. */
function item(category: BgCategory, slug: string, label: string): BgGalleryItem {
  const base = `/bg/${category}-${slug}`;
  return { id: `${category}-${slug}`, url: `${base}.webp`, thumb: `${base}-t.webp`, category, label };
}

export const BG_GALLERY: BgGalleryItem[] = [
  // ── Espacio ── (el primero evoca la nebulosa Petrova / atmósfera Erid de Project Hail Mary)
  item('espacio', 'hail-mary-nebula', 'Nebulosa Petrova'),
  item('espacio', 'galaxy',           'Galaxia'),
  item('espacio', 'milky-way',        'Vía Láctea'),
  item('espacio', 'cosmos',           'Cosmos Estelar'),

  // ── Naturaleza ──
  item('naturaleza', 'foggy-forest',     'Bosque Brumoso'),
  item('naturaleza', 'mountain-sunset',  'Montaña al Atardecer'),
  item('naturaleza', 'tropical-beach',   'Playa Tropical'),
  item('naturaleza', 'aurora-borealis',  'Aurora Boreal'),
  item('naturaleza', 'waterfall',        'Cascada'),

  // ── Abstracto ──
  item('abstracto', 'light-trails',      'Estelas de Luz'),
  item('abstracto', 'colored-smoke',     'Humo de Color'),
  item('abstracto', 'organic-gradient',  'Gradiente Orgánico'),
  item('abstracto', 'ink-liquid',        'Tinta Líquida'),

  // ── Minimalista ──
  item('minimalista', 'marble-texture',         'Mármol'),
  item('minimalista', 'paper-texture',          'Papel Texturizado'),
  item('minimalista', 'pastel-wall',            'Pared Pastel'),
  item('minimalista', 'architectural-shadow',   'Sombra Arquitectónica'),
];

/** Detecta si una URL pertenece a la galería curada (vs. una subida del usuario). */
export function isGalleryUrl(url: string | undefined): boolean {
  return !!url && url.startsWith('/bg/');
}
