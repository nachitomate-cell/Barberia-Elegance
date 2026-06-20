import { useEffect } from 'react';
import { THEMES, SHAPE_RADIUS, FONTS, bgCss, loadFont } from '../lib/theme';
import type { BioState, Block } from '../types';

function renderable(b: Block): boolean {
  if (!b.activo) return false;
  if (b.tipo === 'separador') return true;
  if (b.tipo === 'texto') return !!(b.texto || '').trim();
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

  return (
    <div className="min-h-full px-6 py-10" style={{ background: bgCss(theme), fontFamily: FONTS[theme.font].stack }}>
      <div className="mx-auto flex max-w-sm flex-col items-center">
        <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-full bg-white shadow-lg ring-4 ring-white/30">
          {profile.avatar
            ? <img src={profile.avatar} alt="" className="h-full w-full object-cover" />
            : <span className="text-3xl font-extrabold text-neutral-400">{initial}</span>}
        </div>

        <h2 className="mt-4 text-center text-xl font-extrabold" style={{ color: p.text }}>
          {shown}
          {profile.verified && <span className="ml-1 align-middle text-base">✓</span>}
        </h2>
        {profile.subtitulo && (
          <p className="mt-1 max-w-[32ch] text-center text-sm leading-snug" style={{ color: p.sub }}>{profile.subtitulo}</p>
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
            const fillStyle =
              theme.fill === 'outline'
                ? { background: 'transparent', color: p.text, border: `1.5px solid ${p.btnBorder === 'transparent' ? p.text : p.btnBorder}` }
                : { background: p.btnBg, color: p.btnText, border: `1px solid ${p.btnBorder}` };
            return (
              <div
                key={b.id}
                className={`px-5 py-4 text-center text-sm font-bold shadow-sm ${b.featured ? 'ring-2 ring-white/60' : ''}`}
                style={{ borderRadius: radius, ...fillStyle }}
              >
                {b.label || b.url || 'Enlace'}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
