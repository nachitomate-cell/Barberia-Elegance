import { useEffect } from 'react';
import { Instagram, Facebook, Youtube, MessageCircle, Mail, Phone, Globe, Music2, type LucideIcon } from 'lucide-react';
import { THEMES, SHAPE_RADIUS, FONTS, TSIZE, SSIZE, TWEIGHT, TSPACE, bgCss, bgAnimStyle, loadFont } from '../lib/theme';
import { embedSrc, socUrl } from '../lib/blocks';
import type { BioState, Block, SocialNet } from '../types';

const SOCIAL_ICON: Record<SocialNet, LucideIcon> = {
  instagram: Instagram, tiktok: Music2, facebook: Facebook, youtube: Youtube,
  whatsapp: MessageCircle, email: Mail, telefono: Phone, enlace: Globe,
};

function renderable(b: Block): boolean {
  if (!b.activo) return false;
  if (b.tipo === 'separador') return true;
  if (b.tipo === 'texto') return !!(b.texto || '').trim();
  if (b.tipo === 'imagen') return !!(b.img || '').trim();
  if (b.tipo === 'embed') return !!(b.url || '').trim();
  if (b.tipo === 'social') return (b.socials ?? []).some((s) => (s.valor || '').trim());
  return !!((b.label || '').trim() || (b.url || '').trim());
}

export default function BioPreview({ state }: { state: BioState }): JSX.Element {
  const { profile, blocks, theme } = state;
  const p = THEMES[theme.preset];
  const radius = SHAPE_RADIUS[theme.shape];

  useEffect(() => { loadFont(theme.font); }, [theme.font]);

  const visible = blocks.filter(renderable);
  const shown = profile.titulo || '@' + state.username;
  const initial = shown.replace(/^@/, '').charAt(0).toUpperCase() || 'B';
  const avRadius = theme.avatarShape === 'rounded' ? '22%' : '50%';
  const ring = theme.avatarRing || 'rgba(255,255,255,.55)';
  const txt = theme.text;

  return (
    <div className="min-h-full px-6 py-10" style={{ background: bgCss(theme), fontFamily: FONTS[theme.font].stack, ...bgAnimStyle(theme) }}>
      <div className="mx-auto flex max-w-sm flex-col items-center">
        {profile.cover && (
          <div className="h-28 w-full rounded-2xl bg-cover bg-center shadow-md" style={{ backgroundImage: `url("${profile.cover}")` }} />
        )}
        <div
          className={`relative grid h-24 w-24 place-items-center overflow-hidden bg-white shadow-lg ${profile.cover ? '-mt-11' : ''}`}
          style={{ borderRadius: avRadius, border: `3px solid ${ring}` }}
        >
          {profile.avatar
            ? <img src={profile.avatar} alt="" className="h-full w-full object-cover" />
            : <span className="text-3xl font-extrabold text-neutral-400">{initial}</span>}
        </div>

        <h2
          className="mt-4 text-center"
          style={{
            color: p.text,
            fontSize: TSIZE[txt.titleSize],
            fontWeight: TWEIGHT[txt.weight],
            textTransform: txt.caps === 'upper' ? 'uppercase' : 'none',
            letterSpacing: TSPACE[txt.spacing],
          }}
        >
          {shown}
          {profile.verified && <span className="ml-1 align-middle text-base">✓</span>}
        </h2>
        {profile.subtitulo && (
          <p className="mt-1 max-w-[32ch] text-center leading-snug" style={{ color: p.sub, fontSize: SSIZE[txt.subSize] }}>{profile.subtitulo}</p>
        )}

        <div className="mt-7 flex w-full flex-col gap-3">
          {visible.length === 0 && (
            <p className="py-6 text-center text-sm" style={{ color: p.sub }}>Aún no hay enlaces aquí.</p>
          )}
          {visible.map((b) => {
            if (b.tipo === 'separador') {
              return <hr key={b.id} className="my-1 w-1/2 self-center border-0 border-t-2" style={{ borderColor: 'rgba(128,128,128,.35)' }} />;
            }
            if (b.tipo === 'texto') {
              return <p key={b.id} className="text-center text-sm font-semibold" style={{ color: p.text }}>{b.texto}</p>;
            }
            if (b.tipo === 'imagen') {
              const img = <img src={b.img} alt="" className="w-full rounded-2xl shadow-md" />;
              return b.url
                ? <a key={b.id} href={b.url} target="_blank" rel="noopener noreferrer" className="block">{img}</a>
                : <div key={b.id}>{img}</div>;
            }
            if (b.tipo === 'embed') {
              const e = embedSrc(b.url);
              if (!e) return null;
              if (e.kind === 'youtube') {
                return (
                  <div key={b.id} className="relative w-full overflow-hidden rounded-2xl shadow-md" style={{ paddingTop: '56.25%' }}>
                    <iframe src={e.src} title="video" className="absolute inset-0 h-full w-full border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture" allowFullScreen />
                  </div>
                );
              }
              return <iframe key={b.id} src={e.src} title="spotify" className="w-full rounded-2xl border-0" style={{ height: e.height }} allow="encrypted-media" />;
            }
            if (b.tipo === 'social') {
              const items = (b.socials ?? []).filter((s) => (s.valor || '').trim());
              if (!items.length) return null;
              return (
                <div key={b.id} className="flex flex-wrap justify-center gap-4">
                  {items.map((s, i) => {
                    const u = socUrl(s);
                    const Icon = SOCIAL_ICON[s.red];
                    return u ? (
                      <a key={i} href={u} target="_blank" rel="noopener noreferrer"><Icon size={26} style={{ color: p.text }} /></a>
                    ) : null;
                  })}
                </div>
              );
            }
            const fillStyle =
              theme.fill === 'outline'
                ? { background: 'transparent', color: p.text, border: `1.5px solid ${p.btnBorder === 'transparent' ? p.text : p.btnBorder}` }
                : { background: p.btnBg, color: p.btnText, border: `1px solid ${p.btnBorder}` };
            const animCls = b.featured
              ? 'anim-feat ring-2 ring-white/60'
              : theme.btnAnim !== 'none'
                ? `anim-${theme.btnAnim}`
                : '';
            return (
              <div
                key={b.id}
                className={`relative px-5 py-4 text-center text-sm font-bold shadow-sm ${animCls}`}
                style={{ borderRadius: radius, ...fillStyle }}
              >
                {b.thumb && <img src={b.thumb} alt="" className="absolute left-2.5 top-1/2 h-8 w-8 -translate-y-1/2 rounded-md object-cover" />}
                {b.label || b.url || 'Enlace'}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
