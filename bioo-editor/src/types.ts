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

export interface Theme {
  preset: ThemePreset;
  shape: ButtonShape;
  fill: ButtonFill;
  font: FontKey;
}

export interface Profile {
  titulo: string;
  subtitulo: string;
  avatar: string;
  verified: boolean;
}

export interface BioState {
  username: string;
  profile: Profile;
  blocks: Block[];
  theme: Theme;
}

export type SectionId = 'links' | 'profile' | 'design' | 'share';
