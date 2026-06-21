export type BlockType =
  | 'enlace' | 'whatsapp' | 'instagram' | 'tiktok' | 'facebook'
  | 'youtube' | 'email' | 'telefono' | 'texto' | 'separador'
  | 'imagen' | 'embed' | 'social' | 'newsletter';

export type SocialNet =
  | 'instagram' | 'tiktok' | 'facebook' | 'youtube' | 'whatsapp' | 'email' | 'telefono' | 'enlace';

export interface Social {
  red: SocialNet;
  valor: string;
}

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
  img?: string;
  thumb?: string;
  socials?: Social[];
  // Bloque de captura de leads / newsletter
  subtitulo?: string;
  btnText?: string;
}

export type ThemePreset =
  | 'lime' | 'forest' | 'snow' | 'ocean' | 'sunset' | 'grape' | 'rose' | 'night';
export type ButtonShape = 'rounded' | 'pill' | 'sharp';
export type ButtonFill = 'solid' | 'outline';
export type FontKey = 'system' | 'poppins' | 'montserrat' | 'playfair';

export type BgMode = 'preset' | 'color' | 'gradient' | 'animated' | 'pattern' | 'image';
export type PatternKind = 'dots' | 'grid' | 'diag';
export type AvatarShape = 'circle' | 'rounded';
export type BtnAnim = 'none' | 'float' | 'pulse' | 'grow';

export type SizeKey = 's' | 'm' | 'l';
export type Weight = 'normal' | 'bold' | 'black';
export type Caps = 'normal' | 'upper';
export type Spacing = 'tight' | 'normal' | 'wide';

export interface TextStyle {
  titleSize: SizeKey;
  subSize: SizeKey;
  weight: Weight;
  caps: Caps;
  spacing: Spacing;
}

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
  btnAnim: BtnAnim;
  text: TextStyle;
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

export type SectionId = 'links' | 'profile' | 'design' | 'share' | 'leads';
