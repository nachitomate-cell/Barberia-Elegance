import { DEFAULT_BG, DEFAULT_TEXT, computeUrl } from './theme';
import type {
  Block, Theme, ThemePreset, ButtonShape, ButtonFill, FontKey, BtnAnim,
  BgConfig, TextStyle, AvatarShape,
} from '../types';

/** Spec de bloque sin id (el id se genera al aplicar la plantilla). */
type Spec = Omit<Block, 'id'>;

export interface Template {
  id: string;
  name: string;
  tagline: string;
  emoji: string;
  accent: [string, string]; // gradiente para la tarjeta
  includes: string[];       // chips de "qué incluye"
  theme: Theme;
  blocks: Spec[];
}

function mkTheme(o: {
  preset: ThemePreset; shape?: ButtonShape; fill?: ButtonFill; font?: FontKey;
  btnAnim?: BtnAnim; avatarShape?: AvatarShape; bg?: Partial<BgConfig>; text?: Partial<TextStyle>;
}): Theme {
  return {
    preset: o.preset,
    shape: o.shape ?? 'rounded',
    fill: o.fill ?? 'solid',
    font: o.font ?? 'system',
    bg: { ...DEFAULT_BG, ...(o.bg ?? {}) },
    avatarShape: o.avatarShape ?? 'circle',
    avatarRing: '',
    btnAnim: o.btnAnim ?? 'none',
    text: { ...DEFAULT_TEXT, ...(o.text ?? {}) },
  };
}

export const PRESETS: Template[] = [
  {
    id: 'musico',
    name: 'Músico / Artista',
    tagline: 'Tu música y videos al frente.',
    emoji: '🎤',
    accent: ['#7c3aed', '#1e1b4b'],
    includes: ['Video YouTube', 'Spotify', 'Instagram + TikTok', 'Avisos de conciertos'],
    theme: mkTheme({
      preset: 'night', shape: 'rounded', font: 'poppins', btnAnim: 'float',
      bg: { mode: 'animated', c1: '#1a0b2e', c2: '#6d28d9', angle: 135 },
      text: { weight: 'black', titleSize: 'l' },
    }),
    blocks: [
      { tipo: 'embed', label: '', url: 'https://youtu.be/dQw4w9WgXcQ', activo: true, layoutSize: 'large' },
      { tipo: 'embed', label: '', url: 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT', activo: true, layoutSize: 'full' },
      { tipo: 'instagram', label: 'Instagram', url: '', activo: true, usuario: '', layoutSize: 'half' },
      { tipo: 'tiktok', label: 'TikTok', url: '', activo: true, usuario: '', layoutSize: 'half' },
      { tipo: 'newsletter', label: 'Avisos de conciertos', url: '', activo: true, subtitulo: 'Entérate primero de mis próximos shows', btnText: 'Avísenme' },
    ],
  },
  {
    id: 'empresa',
    name: 'Empresa / Agencia',
    tagline: 'Elegante, sobrio y orientado a conversión.',
    emoji: '🏢',
    accent: ['#111827', '#4b5563'],
    includes: ['Portafolio destacado', 'Agenda una asesoría', 'Servicios', 'Casos de éxito'],
    theme: mkTheme({
      preset: 'snow', shape: 'sharp', font: 'montserrat',
      bg: { mode: 'preset' },
      text: { weight: 'bold', spacing: 'wide' },
    }),
    blocks: [
      { tipo: 'enlace', label: 'Ver portafolio', url: 'https://', activo: true, layoutSize: 'large' },
      { tipo: 'newsletter', label: 'Agenda una asesoría', url: '', activo: true, subtitulo: 'Cuéntanos tu proyecto y te contactamos', btnText: 'Agendar' },
      { tipo: 'enlace', label: 'Nuestros servicios', url: 'https://', activo: true, layoutSize: 'full' },
      { tipo: 'enlace', label: 'Casos de éxito', url: 'https://', activo: true, layoutSize: 'full' },
    ],
  },
  {
    id: 'creador',
    name: 'Creador / Influencer',
    tagline: 'Vibrante, viral y listo para captar fans.',
    emoji: '🚀',
    accent: ['#f97316', '#db2777'],
    includes: ['Último video', 'Descarga mi guía', 'Redes', 'Mi tienda'],
    theme: mkTheme({
      preset: 'sunset', shape: 'pill', font: 'poppins', btnAnim: 'pulse',
      bg: { mode: 'preset' },
      text: { weight: 'black', titleSize: 'l' },
    }),
    blocks: [
      { tipo: 'embed', label: '', url: 'https://youtu.be/dQw4w9WgXcQ', activo: true, layoutSize: 'large' },
      { tipo: 'newsletter', label: 'Descarga mi guía gratis', url: '', activo: true, subtitulo: 'Recíbela al instante en tu correo', btnText: 'Quiero la guía' },
      { tipo: 'instagram', label: 'Instagram', url: '', activo: true, layoutSize: 'half' },
      { tipo: 'youtube', label: 'YouTube', url: '', activo: true, layoutSize: 'half' },
      { tipo: 'enlace', label: 'Mi tienda', url: 'https://', activo: true, layoutSize: 'full' },
    ],
  },
];

let seq = 0;
/** Convierte los specs de una plantilla en bloques con id único y url calculada. */
export function instantiateBlocks(specs: Spec[]): Block[] {
  return specs.map((spec) => {
    const b: Block = { ...spec, id: 'p' + (seq++).toString(36) + Math.random().toString(36).slice(2, 6) };
    return { ...b, url: computeUrl(b) };
  });
}
