import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Instagram, Facebook, Youtube, MessageCircle, Mail, Phone, Globe, Music2, Lock, type LucideIcon } from 'lucide-react';
import { THEMES, SHAPE_RADIUS, FONTS, TSIZE, SSIZE, TWEIGHT, TSPACE, bgCss, bgAnimStyle, loadFont } from '../lib/theme';
import { embedSrc, socUrl } from '../lib/blocks';
import { createCheckoutSession } from '../lib/payments';
import type { BioState, Block, SocialNet } from '../types';

type Palette = (typeof THEMES)[keyof typeof THEMES];

const curSymbol = (c?: string): string => (c === 'EUR' ? '€' : c === 'GBP' ? '£' : c === 'BRL' ? 'R$' : '$');

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
  if (b.tipo === 'newsletter' || b.tipo === 'tip' || b.tipo === 'paywall') return true;
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
            : <span className="text-3xl font-extrabold leading-none text-neutral-400">{initial}</span>}
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

        <div className="mt-7 grid w-full grid-cols-2 gap-4">
          {visible.length === 0 && (
            <p className="col-span-2 py-6 text-center text-sm" style={{ color: p.sub }}>Aún no hay enlaces aquí.</p>
          )}
          {visible.map((b) => {
            if (b.tipo === 'separador') {
              return <hr key={b.id} className="col-span-2 my-1 w-1/2 justify-self-center border-0 border-t-2" style={{ borderColor: 'rgba(128,128,128,.35)' }} />;
            }
            if (b.tipo === 'texto') {
              return <p key={b.id} className="col-span-2 text-center text-sm font-semibold" style={{ color: p.text }}>{b.texto}</p>;
            }
            if (b.tipo === 'imagen') {
              const half = (b.layoutSize ?? 'full') === 'half';
              const spanC = half ? 'col-span-1' : 'col-span-2';
              const img = <img src={b.img} alt="" className={`w-full rounded-3xl shadow-md ${half ? 'aspect-square h-full object-cover' : ''}`} />;
              return b.url
                ? <a key={b.id} href={b.url} target="_blank" rel="noopener noreferrer" className={`block ${spanC}`}>{img}</a>
                : <div key={b.id} className={spanC}>{img}</div>;
            }
            if (b.tipo === 'embed') {
              const e = embedSrc(b.url);
              if (!e) return null;
              if (e.kind === 'youtube') {
                return (
                  <div key={b.id} className="col-span-2 relative w-full overflow-hidden rounded-3xl shadow-md" style={{ paddingTop: '56.25%' }}>
                    <iframe src={e.src} title="video" loading="lazy" className="absolute inset-0 h-full w-full border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture" allowFullScreen />
                  </div>
                );
              }
              return <iframe key={b.id} src={e.src} title="spotify" loading="lazy" className="col-span-2 w-full rounded-3xl border-0" style={{ height: e.height }} allow="encrypted-media" />;
            }
            if (b.tipo === 'social') {
              const items = (b.socials ?? []).filter((s) => (s.valor || '').trim());
              if (!items.length) return null;
              return (
                <div key={b.id} className="col-span-2 flex flex-wrap justify-center gap-4">
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
            if (b.tipo === 'newsletter') {
              return (
                <div key={b.id} className="col-span-2 rounded-3xl bg-white/90 p-4 text-center shadow-md backdrop-blur-sm">
                  <p className="text-sm font-bold text-neutral-900">{b.label || 'Únete a mi Newsletter'}</p>
                  {b.subtitulo && <p className="mt-0.5 text-xs leading-snug text-neutral-500">{b.subtitulo}</p>}
                  <div className="mt-3 flex flex-col gap-2">
                    <input
                      type="email"
                      placeholder="tucorreo@email.com"
                      className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-800 placeholder-neutral-400 focus:border-neutral-300 focus:outline-none"
                    />
                    <button
                      type="button"
                      className="w-full py-2 text-sm font-bold shadow-sm"
                      style={{ background: p.btnBg, color: p.btnText, borderRadius: radius }}
                    >
                      {b.btnText || 'Suscribirme'}
                    </button>
                  </div>
                </div>
              );
            }
            if (b.tipo === 'tip') {
              return <TipBlock key={b.id} b={b} p={p} radius={radius} username={state.username} />;
            }
            if (b.tipo === 'paywall') {
              return <PaywallBlock key={b.id} b={b} p={p} radius={radius} username={state.username} />;
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
            const size = b.layoutSize ?? 'full';
            const common = `relative shadow-sm ${animCls}`;
            const styleObj = { borderRadius: radius, ...fillStyle };
            const text = b.label || b.url || 'Enlace';
            if (size === 'half') {
              return (
                <div key={b.id} className={`col-span-1 flex aspect-square flex-col items-center justify-center gap-2 p-3 text-center text-sm font-bold ${common}`} style={styleObj}>
                  {b.thumb && <img src={b.thumb} alt="" className="h-10 w-10 rounded-lg object-cover" />}
                  <span className="line-clamp-3 leading-tight">{text}</span>
                </div>
              );
            }
            if (size === 'large') {
              return (
                <div key={b.id} className={`col-span-2 flex min-h-[150px] flex-col items-center justify-center gap-2.5 p-4 text-center text-base font-bold ${common}`} style={styleObj}>
                  {b.thumb && <img src={b.thumb} alt="" className="h-14 w-14 rounded-xl object-cover" />}
                  <span>{text}</span>
                </div>
              );
            }
            return (
              <div key={b.id} className={`col-span-2 flex items-center justify-center px-5 py-4 text-center text-sm font-bold ${common}`} style={styleObj}>
                {b.thumb && <img src={b.thumb} alt="" className="absolute left-2.5 top-1/2 h-8 w-8 -translate-y-1/2 rounded-md object-cover" />}
                {text}
              </div>
            );
          })}
        </div>

        {/* Sello viral */}
        <a
          href="https://bioo.cl"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-9 inline-flex items-center gap-1.5 rounded-full border border-white/60 bg-white/55 px-4 py-2 text-xs font-extrabold text-neutral-700 shadow-md backdrop-blur transition-transform hover:-translate-y-0.5"
        >
          <span aria-hidden>⚡</span> Creado gratis en bioo.cl
        </a>
      </div>
    </div>
  );
}

/** Bloque de propina interactivo: selección de monto + Stripe Checkout real. */
function TipBlock({ b, p, radius, username }: { b: Block; p: Palette; radius: string; username: string }): JSX.Element {
  const amounts = b.amounts && b.amounts.length ? b.amounts : [3, 5, 10];
  const sym = curSymbol(b.currency);
  const [sel, setSel] = useState<number>(amounts[0]);
  const [status, setStatus] = useState<'idle' | 'processing' | 'error'>('idle');

  const send = async (): Promise<void> => {
    if (status !== 'idle') return;
    setStatus('processing');
    try {
      const { checkoutUrl } = await createCheckoutSession(b.id, username, sel);
      window.location.href = checkoutUrl;
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2500);
    }
  };

  return (
    <div className="col-span-2 rounded-3xl bg-white/90 p-4 text-center shadow-md backdrop-blur-sm">
      <p className="text-sm font-bold text-neutral-900">{b.label || 'Apóyame'}</p>
      {b.subtitulo && <p className="mt-0.5 text-xs leading-snug text-neutral-500">{b.subtitulo}</p>}
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {amounts.map((a, i) => {
          const on = sel === a;
          return (
            <motion.button
              key={i}
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={() => status === 'idle' && setSel(a)}
              className={`rounded-full border px-4 py-2 text-sm font-bold transition-colors ${on ? 'border-transparent' : 'border-neutral-200 bg-white text-neutral-700'}`}
              style={on ? { background: p.btnBg, color: p.btnText } : undefined}
            >
              {sym}{a}
            </motion.button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={send}
        disabled={status !== 'idle'}
        className="mt-3 w-full py-2.5 text-sm font-bold shadow-sm transition-transform active:scale-95 disabled:cursor-default"
        style={{ background: status === 'error' ? '#dc2626' : p.btnBg, color: status === 'error' ? '#fff' : p.btnText, borderRadius: radius }}
      >
        {status === 'idle' ? `Enviar apoyo · ${sym}${sel}` : status === 'processing' ? 'Redirigiendo a pago seguro…' : 'No se pudo iniciar el pago'}
      </button>
    </div>
  );
}

/** Bloque paywall / producto digital (estilo Gumroad). Inicia Stripe Checkout real. */
function PaywallBlock({ b, p, radius, username }: { b: Block; p: Palette; radius: string; username: string }): JSX.Element {
  const sym = curSymbol(b.currency);
  const price = typeof b.price === 'number' ? b.price : 0;
  const [status, setStatus] = useState<'idle' | 'processing' | 'error'>('idle');

  const buy = async (): Promise<void> => {
    if (status !== 'idle') return;
    setStatus('processing');
    try {
      const { checkoutUrl } = await createCheckoutSession(b.id, username);
      window.location.href = checkoutUrl; // redirige a Stripe
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2500);
    }
  };

  return (
    <div className="col-span-2 rounded-3xl bg-white/95 p-5 text-center shadow-md backdrop-blur-sm">
      <div className="flex items-center justify-center gap-1.5">
        <Lock size={14} className="text-neutral-400" />
        <p className="text-sm font-bold text-neutral-900">{b.label || 'Producto digital'}</p>
      </div>
      {b.subtitulo && <p className="mt-1 text-xs leading-snug text-neutral-500">{b.subtitulo}</p>}
      <p className="mt-3 text-3xl font-black tracking-tight text-neutral-900">{sym}{price}</p>
      <button
        type="button"
        onClick={buy}
        disabled={status !== 'idle'}
        className="mt-3 flex w-full items-center justify-center gap-2 py-3 text-sm font-bold shadow-sm transition-transform active:scale-95 disabled:cursor-default"
        style={{ background: status === 'error' ? '#dc2626' : p.btnBg, color: status === 'error' ? '#fff' : p.btnText, borderRadius: radius }}
      >
        {status === 'idle'
          ? <><Lock size={14} /> Desbloquear por {sym}{price}</>
          : status === 'processing' ? 'Redirigiendo a pago seguro…' : 'No se pudo iniciar el pago'}
      </button>
      <p className="mt-2 text-[10px] text-neutral-400">Pago seguro con Stripe · Acceso inmediato</p>
    </div>
  );
}
