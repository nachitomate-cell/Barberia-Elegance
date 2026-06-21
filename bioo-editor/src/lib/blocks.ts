import type { Social, SocialNet } from '../types';

export const SOCIAL_NETS: { red: SocialNet; label: string }[] = [
  { red: 'instagram', label: 'Instagram' },
  { red: 'tiktok', label: 'TikTok' },
  { red: 'facebook', label: 'Facebook' },
  { red: 'youtube', label: 'YouTube' },
  { red: 'whatsapp', label: 'WhatsApp' },
  { red: 'email', label: 'Correo' },
  { red: 'telefono', label: 'Teléfono' },
  { red: 'enlace', label: 'Web' },
];

export function socUrl(s: Social): string {
  const v = (s.valor || '').trim();
  if (!v) return '';
  const isHttp = /^https?:\/\//i.test(v);
  const u = v.replace(/^@/, '');
  switch (s.red) {
    case 'instagram': return isHttp ? v : `https://instagram.com/${u}`;
    case 'tiktok':    return isHttp ? v : `https://tiktok.com/@${u}`;
    case 'facebook':  return isHttp ? v : `https://facebook.com/${u}`;
    case 'youtube':   return isHttp ? v : `https://youtube.com/@${u}`;
    case 'whatsapp':  { const d = v.replace(/\D/g, ''); return d.length >= 8 ? `https://wa.me/${d}` : ''; }
    case 'email':     return /^mailto:/i.test(v) ? v : `mailto:${v}`;
    case 'telefono':  { const d = v.replace(/[^\d+]/g, ''); return d ? `tel:${d}` : ''; }
    default:          return isHttp ? v : `https://${v}`;
  }
}

export interface EmbedInfo {
  kind: 'youtube' | 'spotify';
  src: string;
  height: number; // 0 = ratio 16:9
}

export function embedSrc(raw: string): EmbedInfo | null {
  const u = (raw || '').trim();
  const yt = u.match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/)([\w-]{11})/);
  if (yt) return { kind: 'youtube', src: `https://www.youtube.com/embed/${yt[1]}`, height: 0 };
  const sp = u.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(track|album|playlist|episode|show|artist)\/([A-Za-z0-9]+)/);
  if (sp) {
    const compact = sp[1] === 'track' || sp[1] === 'episode';
    return { kind: 'spotify', src: `https://open.spotify.com/embed/${sp[1]}/${sp[2]}`, height: compact ? 152 : 352 };
  }
  return null;
}
