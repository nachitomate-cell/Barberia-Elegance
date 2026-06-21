import type { CSSProperties } from 'react';
import type {
  Theme, ThemePreset, ButtonShape, FontKey, Block, BgConfig, PatternKind,
  SizeKey, Weight, Spacing, TextStyle,
} from '../types';

export interface Palette {
  name: string;
  bg: string;
  text: string;
  sub: string;
  btnBg: string;
  btnText: string;
  btnBorder: string;
}

export const THEMES: Record<ThemePreset, Palette> = {
  lime:   { name: 'Lima',      bg: '#92c83a', text: '#15240b', sub: '#3f5230', btnBg: '#ffffff', btnText: '#15240b', btnBorder: 'transparent' },
  forest: { name: 'Bosque',    bg: '#15240b', text: '#eef6e3', sub: '#aac08e', btnBg: 'rgba(255,255,255,.12)', btnText: '#ffffff', btnBorder: 'rgba(255,255,255,.28)' },
  snow:   { name: 'Nieve',     bg: '#f4f6ee', text: '#15240b', sub: '#5b6a4e', btnBg: '#ffffff', btnText: '#15240b', btnBorder: '#e0e6d4' },
  ocean:  { name: 'Océano',    bg: 'linear-gradient(165deg,#1f6feb,#0b3d91)', text: '#ffffff', sub: 'rgba(255,255,255,.82)', btnBg: '#ffffff', btnText: '#0b3d91', btnBorder: 'transparent' },
  sunset: { name: 'Atardecer', bg: 'linear-gradient(165deg,#ff8a3d,#d6249f)', text: '#ffffff', sub: 'rgba(255,255,255,.88)', btnBg: 'rgba(255,255,255,.96)', btnText: '#b3208a', btnBorder: 'transparent' },
  grape:  { name: 'Uva',       bg: 'linear-gradient(165deg,#7c3aed,#3b1d8f)', text: '#ffffff', sub: 'rgba(255,255,255,.82)', btnBg: '#ffffff', btnText: '#3b1d8f', btnBorder: 'transparent' },
  rose:   { name: 'Rosa',      bg: '#dd19bb', text: '#ffffff', sub: 'rgba(255,255,255,.88)', btnBg: '#ffffff', btnText: '#a3148a', btnBorder: 'transparent' },
  night:  { name: 'Noche',     bg: '#0e0e10', text: '#ffffff', sub: '#9aa3ad', btnBg: 'rgba(255,255,255,.10)', btnText: '#ffffff', btnBorder: 'rgba(255,255,255,.22)' },
};

export const SHAPE_RADIUS: Record<ButtonShape, string> = { rounded: '14px', pill: '100px', sharp: '4px' };

export const TSIZE: Record<SizeKey, string> = { s: '17px', m: '21px', l: '26px' };
export const SSIZE: Record<SizeKey, string> = { s: '12px', m: '14px', l: '16px' };
export const TWEIGHT: Record<Weight, string> = { normal: '600', bold: '800', black: '900' };
export const TSPACE: Record<Spacing, string> = { tight: '-0.4px', normal: 'normal', wide: '1.6px' };
export const DEFAULT_TEXT: TextStyle = { titleSize: 'm', subSize: 'm', weight: 'bold', caps: 'normal', spacing: 'normal' };

export const FONTS: Record<FontKey, { name: string; stack: string; g?: string }> = {
  system:     { name: 'Sistema',          stack: '"Plus Jakarta Sans", system-ui, sans-serif' },
  poppins:    { name: 'Poppins',          stack: '"Poppins", sans-serif',     g: 'Poppins:wght@400;600;800' },
  montserrat: { name: 'Montserrat',       stack: '"Montserrat", sans-serif',  g: 'Montserrat:wght@400;600;800' },
  playfair:   { name: 'Playfair Display', stack: '"Playfair Display", serif', g: 'Playfair+Display:wght@500;700;800' },
};

const fontsLoaded = new Set<string>();
export function loadFont(key: FontKey): void {
  const f = FONTS[key];
  if (!f.g || fontsLoaded.has(key)) return;
  fontsLoaded.add(key);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${f.g}&display=swap`;
  document.head.appendChild(link);
}

export const DEFAULT_BG: BgConfig = {
  mode: 'preset', color: '#92c83a', c1: '#92c83a', c2: '#2c5a17', angle: 165, pattern: 'dots', image: '',
};

export function patternCss(kind: PatternKind, base: string): string {
  if (kind === 'grid')
    return `linear-gradient(rgba(255,255,255,.16) 1px,transparent 1px) 0 0/26px 26px, linear-gradient(90deg,rgba(255,255,255,.16) 1px,transparent 1px) 0 0/26px 26px, ${base}`;
  if (kind === 'diag')
    return `repeating-linear-gradient(45deg,rgba(255,255,255,.10) 0 10px,transparent 10px 20px), ${base}`;
  return `radial-gradient(rgba(255,255,255,.28) 1.6px,transparent 1.7px) 0 0/22px 22px, ${base}`;
}

export function bgCss(theme: Theme): string {
  const b = theme.bg;
  switch (b.mode) {
    case 'color':    return b.color;
    case 'gradient': return `linear-gradient(${b.angle}deg, ${b.c1}, ${b.c2})`;
    case 'animated': return `linear-gradient(${b.angle}deg, ${b.c1}, ${b.c2}, ${b.c1})`;
    case 'pattern':  return patternCss(b.pattern, b.color);
    case 'image':    return b.image ? `url("${b.image}") center/cover no-repeat` : THEMES[theme.preset].bg;
    default:         return THEMES[theme.preset].bg;
  }
}

/** Estilos extra para el fondo animado (background-size + animation). */
export function bgAnimStyle(theme: Theme): CSSProperties {
  return theme.bg.mode === 'animated'
    ? { backgroundSize: '220% 220%', animation: 'bgshift 14s ease infinite' }
    : {};
}

const onlyDigits = (s: string): string => String(s || '').replace(/\D/g, '');
const cleanUser = (s: string): string =>
  String(s || '').trim().replace(/^@+/, '').replace(/^https?:\/\/[^/]+\//i, '').replace(/\/+$/, '');

/** Construye la URL final de un bloque según su tipo. */
export function computeUrl(b: Block): string {
  switch (b.tipo) {
    case 'whatsapp': {
      const d = (onlyDigits(b.prefijo || '') || '56') + onlyDigits(b.telefono || '');
      return d.length >= 8 ? `https://wa.me/${d}${b.mensaje ? `?text=${encodeURIComponent(b.mensaje)}` : ''}` : '';
    }
    case 'telefono': {
      const d = (onlyDigits(b.prefijo || '') || '56') + onlyDigits(b.telefono || '');
      return d.length >= 8 ? `tel:+${d}` : '';
    }
    case 'instagram': return b.usuario ? `https://instagram.com/${cleanUser(b.usuario)}` : '';
    case 'tiktok':    return b.usuario ? `https://tiktok.com/@${cleanUser(b.usuario)}` : '';
    case 'facebook':  return b.usuario ? `https://facebook.com/${cleanUser(b.usuario)}` : '';
    case 'email':     return b.email ? `mailto:${b.email.trim()}` : '';
    default:          return String(b.url || '').trim();
  }
}
