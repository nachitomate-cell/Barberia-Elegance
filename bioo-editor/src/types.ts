export type BlockType =
  | 'enlace' | 'whatsapp' | 'instagram' | 'tiktok' | 'facebook'
  | 'youtube' | 'email' | 'telefono' | 'texto' | 'separador';

export interface Block {
  id: string;
  tipo: BlockType;
  label: string;
  url: string;
  activo: boolean;
  featured?: boolean;
  usuario?: string;
  prefijo?: string;
  telefono?: string;
  mensaje?: string;
  email?: string;
  texto?: string;
}

export type ThemePreset =
  | 'lime' | 'forest' | 'snow' | 'ocean' | 'sunset' | 'grape' | 'rose' | 'night';
export type ButtonShape = 'rounded' | 'pill' | 'sharp';
export type ButtonFill = 'solid' | 'outline';
export type FontKey = 'system' | 'poppins' | 'montserrat' | 'playfair';

export type BgMode = 'preset' | 'color' | 'gradient' | 'animated' | 'pattern' | 'image';
export type PatternKind = 'dots' | 'grid' | 'diag';
export type AvatarShape = 'circle' | 'rounded';

export interface BgConfig {
  mode: BgMode;
  color: string;
  c1: string;
  c2: string;
  angle: number;
  pattern: PatternKind;
  image: string;
}

export interface Theme {
  preset: ThemePreset;
  shape: ButtonShape;
  fill: ButtonFill;
  font: FontKey;
  bg: BgConfig;
  avatarShape: AvatarShape;
  avatarRing: string;
}

export interface Profile {
  titulo: string;
  subtitulo: string;
  avatar: string;
  cover: string;
  verified: boolean;
}

export interface BioState {
  username: string;
  profile: Profile;
  blocks: Block[];
  theme: Theme;
}

export type SectionId = 'links' | 'profile' | 'design' | 'share';
