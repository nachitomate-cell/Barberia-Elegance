import { useEffect, useState, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { doc, onSnapshot } from 'firebase/firestore';
import { Instagram, Facebook, Youtube, MessageCircle, Mail, Phone, Globe, Music2, Lock, CalendarClock, type LucideIcon } from 'lucide-react';
import { THEMES, SHAPE_RADIUS, FONTS, TSIZE, SSIZE, TWEIGHT, TSPACE, bgCss, bgAnimStyle, bgFxKind, bgFxVars, bgFxHasBlobs, loadFont } from '../lib/theme';
import { embedSrc, socUrl } from '../lib/blocks';
import { startCheckout } from '../lib/payments';
import { db } from '../lib/firebase';
import type { BioState, Block, SocialNet } from '../types';

type Palette = (typeof THEMES)[keyof typeof THEMES];

const curSymbol = (c?: string): string => (c === 'EUR' ? '€' : c === 'GBP' ? '£' : c === 'BRL' ? 'R$' : '$');

const SOCIAL_ICON: Record<SocialNet, LucideIcon> = {
  instagram: Instagram, tiktok: Music2, facebook: Facebook, youtube: Youtube,
  whatsapp: MessageCircle, email: Mail, telefono: Phone, enlace: Globe,
};

// Tipos de bloque que llevan ícono PNG a la izquierda del botón (paridad con
// u.html: '<img class="btn-ic" src="/ic-{tipo}-orig.png">'). Cualquier otro
// tipo se renderiza sin ícono (mismo comportamiento que el público).
const BTN_ICON_TIPOS: Record<string, true> = {
  whatsapp: true, instagram: true, tiktok: true, facebook: true,
  youtube: true, email: true, telefono: true, enlace: true,
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

  // Vista previa del CTA de Reservas — espía la config en vivo para reflejar
  // los cambios apenas el barbero guarde en la sección "Reservas". No bloquea
  // el render; si la lectura falla (sin permisos / sin doc) queda en false.
  const [reservasOn, setReservasOn] = useState(false);
  useEffect(() => {
    if (!state.username || state.username === 'tunombre') { setReservasOn(false); return; }
    const ref = doc(db, 'bios', state.username, 'reservasConfig', 'config');
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const d = snap.exists() ? (snap.data() as Record<string, unknown>) : null;
        const servicios = Array.isArray(d?.servicios) ? (d!.servicios as unknown[]) : [];
        const hasSrv = servicios.some((s) => {
          if (!s || typeof s !== 'object') return false;
          const sv = s as { nombre?: unknown; duracion?: unknown };
          return typeof sv.nombre === 'string' && sv.nombre.trim().length > 0
              && typeof sv.duracion === 'number' && sv.duracion > 0;
        });
        setReservasOn(d?.activo === true && hasSrv);
      },
      () => setReservasOn(false),
    );
    return (): void => unsub();
  }, [state.username]);

  const visible = blocks.filter(renderable);
  const shown = profile.titulo || '@' + state.username;
  const initial = shown.replace(/^@/, '').charAt(0).toUpperCase() || 'B';
  const avRadius = theme.avatarShape === 'rounded' ? '22%' : '50%';
  const hasRing = !!theme.avatarRing;
  const ring = theme.avatarRing || 'transparent';
  const txt = theme.text;
  const fx = bgFxKind(theme);
  // Fondos oscuros/vibrantes → texto claro para mantener contraste.
  const fxDark = fx === 'aurora' || fx === 'fluid' || fx === 'grain';
  const tCol = fxDark ? '#ffffff' : p.text;
  const sCol = fxDark ? 'rgba(255,255,255,.92)' : p.sub;
  // Color sólido del fondo de la página para el efecto "cutout" del avatar.
  // Para gradientes extraemos el primer color; para fx oscuros usamos el negro de body.
  const firstColor = (s: string): string => {
    const m = s.match(/#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)/);
    return m ? m[0] : 'transparent';
  };
  const pageBgSolid = fxDark ? '#0b0d12' : (p.bg.includes('gradient') ? firstColor(p.bg) : p.bg);

  // Overrides custom del usuario (Apariencia → Texto). Caen al color del tema si están vacíos.
  const titleColor = txt.titleColor || tCol;
  const subColor = txt.subColor || sCol;
  const align = txt.align ?? 'center';
  const itemsAlign: 'items-start' | 'items-center' | 'items-end' =
    align === 'left' ? 'items-start' : align === 'right' ? 'items-end' : 'items-center';
  const textAlign: 'left' | 'center' | 'right' = align;
  const subWeight = TWEIGHT[txt.subWeight ?? 'normal'];

  return (
    <div
      className="relative min-h-full overflow-hidden"
      style={{
        fontFamily: FONTS[theme.font].stack,
        // text-shadow es INHERITED → forzarla a 'none' acá la apaga para todos
        // los descendientes que no la sobreescriban (que ya no la setean).
        // Cualquier theme con shadow !== 'none' queda ignorado en el preview.
        textShadow: 'none',
        ...(fx ? {} : { background: bgCss(theme), ...bgAnimStyle(theme) }),
      }}
    >
      {fx && (
        <div className={`bgfx bgfx-${fx}`} style={bgFxVars(theme) as CSSProperties}>
          {bgFxHasBlobs(theme) && <><i className="blob" /><i className="blob" /><i className="blob" /></>}
        </div>
      )}
      <div className="relative z-10 px-6 py-10">
      <div className={`mx-auto flex max-w-sm flex-col ${itemsAlign}`}>
        {profile.cover && (
          // Paridad con u.html .cover: 132px alto, border-radius 24px en
          // las 4 esquinas (no solo abajo), box-shadow suave.
          <div
            className="w-full bg-cover bg-center"
            style={{
              backgroundImage: `url("${profile.cover}")`,
              height: '132px',
              borderRadius: '24px',
              boxShadow: '0 3px 14px rgba(0,0,0,.16)',
            }}
          />
        )}
        <div
          className="relative grid h-24 w-24 place-items-center overflow-hidden bg-white"
          style={{
            // Paridad con .avatar.over { margin-top: -46px }.
            marginTop: profile.cover ? '-46px' : 0,
            borderRadius: avRadius,
            border: hasRing ? `3px solid ${ring}` : 'none',
            // Anillo exterior con el color del fondo de la página → efecto "cutout" tipo iOS.
            // Cuando "Sin anillo": solo drop-shadow, sin el cutout exterior.
            boxShadow: hasRing
              ? `0 0 0 4px ${pageBgSolid}, 0 8px 22px rgba(0,0,0,.18)`
              : '0 8px 22px rgba(0,0,0,.18)',
          }}
        >
          {profile.avatar
            ? <img src={profile.avatar} alt="" className="h-full w-full object-cover" />
            : <span className="text-3xl font-extrabold leading-none text-neutral-400">{initial}</span>}
        </div>

        {/* Texto PLANO en el emulador. Sin textShadow ni drop-shadow ni filtros:
            en la escala chica del phone-frame, cualquier sombra de texto se
            ve como un blur. Antialiasing forzado a 'antialiased' (Webkit) y
            'grayscale' (Moz) para nitidez tipo Apple/Vercel. */}
        {/* Texto PLANO: drop-shadow-none + shadow-none + filter:none inline.
            Sin textShadow inyectado por el tema en el preview. */}
        <h2
          className="mt-4 antialiased subpixel-antialiased drop-shadow-none shadow-none"
          style={{
            color: titleColor,
            fontSize: TSIZE[txt.titleSize],
            fontWeight: TWEIGHT[txt.weight],
            textTransform: txt.caps === 'upper' ? 'uppercase' : 'none',
            letterSpacing: TSPACE[txt.spacing],
            fontStyle: txt.italic ? 'italic' : 'normal',
            textAlign,
            textShadow: 'none',
            filter: 'none',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
          }}
        >
          {shown}
          {/* Insignia verificada: misma <img> que u.html — height 0.85em. */}
          {profile.verified && (
            <img
              src="/ic-verified.png"
              alt="✓"
              style={{ height: '0.85em', width: 'auto', verticalAlign: '-1px', marginLeft: '5px', display: 'inline-block' }}
            />
          )}
        </h2>
        {profile.subtitulo && (
          // Paridad con .sub: max-width 34ch, line-height 1.45, margin-top 6px.
          <p
            className="antialiased drop-shadow-none shadow-none"
            style={{
              color: subColor,
              fontSize: SSIZE[txt.subSize],
              fontWeight: subWeight,
              textAlign,
              maxWidth: '34ch',
              lineHeight: 1.45,
              marginTop: '6px',
              textShadow: 'none',
              filter: 'none',
              WebkitFontSmoothing: 'antialiased',
              MozOsxFontSmoothing: 'grayscale',
            }}
          >
            {profile.subtitulo}
          </p>
        )}

        {/* Sello de Comercio Verificado (Partner Club Patio) — opcional para el comercio */}
        {profile.partner === 'patio-curauma' && profile.showPartnerBadge !== false && (
          <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 bg-white/50 backdrop-blur-sm border border-black/5 rounded-full shadow-sm">
            <img src="/patio-curauma.png" alt="" className="w-4 h-4 object-contain" />
            <span className="text-[11px] font-semibold text-gray-700 tracking-wide uppercase">Comercio Oficial Patio Curauma</span>
          </div>
        )}

        <div className="mt-7 grid w-full grid-cols-2 gap-4">
          {reservasOn && (
            <button
              type="button"
              // Grid 3-cols (24px | 1fr | 24px) — cero superposición posible.
              className="col-span-2 grid w-full grid-cols-[24px_1fr_24px] items-center gap-4 px-5 py-4 font-extrabold text-[15px] tracking-[-0.01em] text-white antialiased shadow-none drop-shadow-none transition-transform active:scale-[0.98]"
              style={{ background: '#15240b', borderRadius: radius, color: '#fff', WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' }}
              title="Vista previa: tu cliente verá este botón en bioo.cl"
            >
              <div className="flex items-center justify-center" aria-hidden>
                <CalendarClock size={20} strokeWidth={2} />
              </div>
              <span className="truncate text-center leading-none">Reservar hora</span>
              <div aria-hidden />
            </button>
          )}
          {visible.length === 0 && !reservasOn && (
            <p className="col-span-2 py-6 text-center text-sm" style={{ color: sCol }}>Aún no hay enlaces aquí.</p>
          )}
          {visible.map((b) => {
            if (b.tipo === 'separador') {
              return <hr key={b.id} className="col-span-2 my-1 w-1/2 justify-self-center border-0 border-t-2" style={{ borderColor: 'rgba(128,128,128,.35)' }} />;
            }
            if (b.tipo === 'texto') {
              return <p key={b.id} className="col-span-2 text-center text-sm font-semibold" style={{ color: tCol }}>{b.texto}</p>;
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
                <div key={b.id} className="col-span-2 flex flex-wrap justify-center gap-5">
                  {items.map((s, i) => {
                    const u = socUrl(s);
                    const Icon = SOCIAL_ICON[s.red];
                    return u ? (
                      <a
                        key={i}
                        href={u}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="opacity-80 transition-opacity hover:opacity-100"
                      >
                        <Icon className="size-6" style={{ color: tCol }} strokeWidth={1.75} />
                      </a>
                    ) : null;
                  })}
                </div>
              );
            }
            if (b.tipo === 'newsletter') {
              // Paridad con .u-news: padding 28px 24px, título 15.5/800/1.3,
              // sub 13/normal/1.45 mt 6px.
              return (
                <div
                  key={b.id}
                  className="col-span-2 rounded-3xl bg-white/95 text-center shadow-sm ring-1 ring-black/5 backdrop-blur-sm"
                  style={{ padding: '28px 24px' }}
                >
                  <p className="font-extrabold text-neutral-900" style={{ fontSize: '15.5px', lineHeight: 1.3 }}>
                    {b.label || 'Entérate de todas las novedades'}
                  </p>
                  {b.subtitulo && (
                    <p className="text-neutral-500" style={{ fontSize: '13px', lineHeight: 1.45, marginTop: '6px' }}>
                      {b.subtitulo}
                    </p>
                  )}
                  <div className="mt-4 flex flex-col gap-2.5">
                    <input
                      type="email"
                      placeholder="tucorreo@email.com"
                      className="w-full rounded-xl border-none bg-black/5 p-3 text-sm text-neutral-900 placeholder-neutral-400 transition focus:outline-none focus:ring-2 focus:ring-black/10"
                    />
                    <button
                      type="button"
                      className="w-full bg-gray-900 py-3 text-sm font-bold text-white shadow-sm ring-1 ring-black/5 transition-colors hover:bg-gray-800"
                      style={{ borderRadius: radius }}
                    >
                      {b.btnText || 'Suscribirme'}
                    </button>
                  </div>
                </div>
              );
            }
            if (b.tipo === 'tip') {
              return <TipBlock key={b.id} b={b} radius={radius} username={state.username} />;
            }
            if (b.tipo === 'paywall') {
              return <PaywallBlock key={b.id} b={b} radius={radius} username={state.username} />;
            }
            // Overrides custom de color del botón (Apariencia → Botones).
            // En outline: el override de "texto" pinta texto + borde; el override
            // de "fondo" se ignora (el modo outline no tiene fondo).
            const btnBg = theme.btnBgColor || p.btnBg;
            const btnText = theme.btnTextColor || p.btnText;
            const outlineColor = theme.btnTextColor || (p.btnBorder === 'transparent' ? p.text : p.btnBorder);
            const fillStyle =
              theme.fill === 'outline'
                ? { background: 'transparent', color: theme.btnTextColor || p.text, border: `1.5px solid ${outlineColor}` }
                : { background: btnBg, color: btnText, border: `1px solid ${theme.btnBgColor ? 'transparent' : p.btnBorder}` };
            // Featured: solo añade la animación de pulso (sombra neutra). u.html
            // NO agrega aro blanco ni glow tintado — los quitamos también acá
            // para mantener nitidez y paridad con la vista pública.
            const animCls = b.featured
              ? 'anim-feat font-extrabold'
              : theme.btnAnim !== 'none'
                ? `anim-${theme.btnAnim}`
                : '';
            const common = `relative shadow-sm ring-1 ring-black/5 ${animCls}`;
            const size = b.layoutSize ?? 'full';
            const styleObj = { borderRadius: radius, ...fillStyle };
            const text = b.label || b.url || 'Enlace';
            // Paridad con u.html: el botón muestra a la izquierda un ícono
            // PNG del tipo (/ic-{tipo}-orig.png), o el thumb del enlace si
            // existe. En tamaño full el ícono va absoluto a la izquierda;
            // en half/large va apilado arriba del texto.
            const hasTipoIcon = b.tipo === 'enlace' ? !b.thumb : !!BTN_ICON_TIPOS[b.tipo as string];
            const hasThumb = b.tipo === 'enlace' && !!b.thumb;
            if (size === 'half') {
              return (
                <div key={b.id} className={`col-span-1 flex aspect-square flex-col items-center justify-center gap-2 p-3.5 text-center text-sm font-bold ${common}`} style={styleObj}>
                  {hasThumb
                    ? <img src={b.thumb} alt="" className="h-[46px] w-[46px] shrink-0 rounded-xl object-cover" />
                    : hasTipoIcon
                      ? <img src={`/ic-${b.tipo}-orig.png`} alt="" className="h-[30px] w-[30px] shrink-0 object-contain" />
                      : null}
                  <span className="line-clamp-3 min-w-0 leading-tight">{text}</span>
                </div>
              );
            }
            if (size === 'large') {
              return (
                <div key={b.id} className={`col-span-2 flex min-h-[150px] flex-col items-center justify-center gap-2.5 p-[18px] text-center text-base font-bold ${common}`} style={styleObj}>
                  {hasThumb
                    ? <img src={b.thumb} alt="" className="h-[46px] w-[46px] shrink-0 rounded-xl object-cover" />
                    : hasTipoIcon
                      ? <img src={`/ic-${b.tipo}-orig.png`} alt="" className="h-[30px] w-[30px] shrink-0 object-contain" />
                      : null}
                  <span>{text}</span>
                </div>
              );
            }
            // size === 'full' → ESTRUCTURA GRID 3-cols (24px | 1fr | 24px).
            // Garantiza CERO superposición ícono/texto: cada elemento vive en
            // su propia columna. El div vacío de la derecha equilibra para que
            // el texto quede perfectamente centrado, no offset por el ícono.
            return (
              <div
                key={b.id}
                className={`col-span-2 grid w-full grid-cols-[24px_1fr_24px] items-center gap-4 px-5 py-4 text-center antialiased shadow-none drop-shadow-none ${common}`}
                style={{
                  ...styleObj,
                  fontSize: '15.5px',
                  fontWeight: 700,
                  WebkitFontSmoothing: 'antialiased',
                  MozOsxFontSmoothing: 'grayscale',
                }}
              >
                <div className="flex items-center justify-center" aria-hidden>
                  {hasThumb && (
                    <img
                      src={b.thumb}
                      alt=""
                      className="h-6 w-6 rounded-md object-cover"
                    />
                  )}
                  {hasTipoIcon && (
                    <img
                      src={`/ic-${b.tipo}-orig.png`}
                      alt=""
                      className="h-6 w-6 object-contain"
                    />
                  )}
                </div>
                <span className="truncate text-center font-medium leading-none">{text}</span>
                <div aria-hidden />
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
    </div>
  );
}

/** Bloque de propina interactivo: selección de monto + Stripe Checkout real. */
function TipBlock({ b, radius, username }: { b: Block; radius: string; username: string }): JSX.Element {
  const amounts = b.amounts && b.amounts.length ? b.amounts : [3, 5, 10];
  const sym = curSymbol(b.currency);
  const [sel, setSel] = useState<number>(amounts[0]);
  const [status, setStatus] = useState<'idle' | 'processing' | 'error'>('idle');

  const send = async (): Promise<void> => {
    if (status !== 'idle') return;
    setStatus('processing');
    try {
      const { url } = await startCheckout(b.id, username, sel);
      window.location.href = url;
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2500);
    }
  };

  return (
    // Paridad con .u-tip: padding 18px 16px, título 15.5/800/1.3,
    // sub 13/1.45 mt 4px.
    <div
      className="col-span-2 rounded-3xl bg-white/90 text-center shadow-md backdrop-blur-sm"
      style={{ padding: '18px 16px' }}
    >
      <p className="font-extrabold text-neutral-900" style={{ fontSize: '15.5px', lineHeight: 1.3 }}>
        {b.label || 'Apóyame'}
      </p>
      {b.subtitulo && (
        <p className="text-neutral-500" style={{ fontSize: '13px', lineHeight: 1.45, marginTop: '4px' }}>
          {b.subtitulo}
        </p>
      )}
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {amounts.map((a, i) => {
          const on = sel === a;
          return (
            <motion.button
              key={i}
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={() => status === 'idle' && setSel(a)}
              className={`rounded-full border px-4 py-2 text-sm font-bold transition-colors ${on ? 'border-transparent bg-gray-900 text-white' : 'border-neutral-200 bg-gray-100 text-gray-800'}`}
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
        className={`mt-3 w-full py-2.5 text-sm font-bold text-white shadow-sm transition active:scale-95 disabled:cursor-default ${status === 'error' ? 'bg-red-600' : 'bg-gray-900 hover:bg-gray-800'}`}
        style={{ borderRadius: radius }}
      >
        {status === 'idle' ? `Enviar apoyo · ${sym}${sel}` : status === 'processing' ? 'Redirigiendo a pago seguro…' : 'No se pudo iniciar el pago'}
      </button>
    </div>
  );
}

/** Bloque paywall / producto digital (estilo Gumroad). Inicia Stripe Checkout real. */
function PaywallBlock({ b, radius, username }: { b: Block; radius: string; username: string }): JSX.Element {
  const sym = curSymbol(b.currency);
  const price = typeof b.price === 'number' ? b.price : 0;
  const [status, setStatus] = useState<'idle' | 'processing' | 'error'>('idle');

  const buy = async (): Promise<void> => {
    if (status !== 'idle') return;
    setStatus('processing');
    try {
      const { url } = await startCheckout(b.id, username);
      window.location.href = url; // redirige a Stripe
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2500);
    }
  };

  return (
    // Paridad con .u-pw: padding 20px 16px, título 15.5/800/1.3,
    // sub 13/1.45 mt 5px.
    <div
      className="col-span-2 rounded-3xl bg-white/95 text-center shadow-md backdrop-blur-sm"
      style={{ padding: '20px 16px' }}
    >
      <div className="flex items-center justify-center gap-1.5">
        <Lock size={14} className="text-neutral-400" />
        <p className="font-extrabold text-neutral-900" style={{ fontSize: '15.5px', lineHeight: 1.3 }}>
          {b.label || 'Producto digital'}
        </p>
      </div>
      {b.subtitulo && (
        <p className="text-neutral-500" style={{ fontSize: '13px', lineHeight: 1.45, marginTop: '5px' }}>
          {b.subtitulo}
        </p>
      )}
      <p className="mt-3 text-3xl font-black tracking-tight text-neutral-900">{sym}{price}</p>
      <button
        type="button"
        onClick={buy}
        disabled={status !== 'idle'}
        className={`mt-3 flex w-full items-center justify-center gap-2 py-3 text-sm font-bold text-white shadow-sm transition active:scale-95 disabled:cursor-default ${status === 'error' ? 'bg-red-600' : 'bg-gray-900 hover:bg-gray-800'}`}
        style={{ borderRadius: radius }}
      >
        {status === 'idle'
          ? <><Lock size={14} /> Desbloquear por {sym}{price}</>
          : status === 'processing' ? 'Redirigiendo a pago seguro…' : 'No se pudo iniciar el pago'}
      </button>
      <p className="mt-2 text-[10px] text-neutral-400">Pago seguro con Stripe · Acceso inmediato</p>
    </div>
  );
}
