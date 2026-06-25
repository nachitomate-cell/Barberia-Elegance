import { useState } from 'react';
import { AnimatePresence, motion, type Transition, type PanInfo } from 'framer-motion';
import {
  Link2, Copy, Check, Plus, Mail, MessageCircle, Send,
  Twitter, Facebook, Instagram, Linkedin, type LucideIcon,
} from 'lucide-react';

/* Spring estilo iOS (spec: stiffness 300 / damping 30) — igual que PreviewSheet. */
const SHEET_SPRING: Transition = { type: 'spring', stiffness: 300, damping: 30 };

const FOREST = '#15240b';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  avatar?: string;
}

interface Net {
  label: string;
  Icon: LucideIcon;
  /** URL de compartir genérica (fallback si no hay navigator.share). */
  href?: string;
  /** Acción custom (copiar, share nativo…). */
  onClick?: () => void | Promise<void>;
  cls: string;
}

export default function ShareModal({ isOpen, onClose, username, avatar }: Props): JSX.Element {
  const url = `https://bioo.cl/${username}`;
  const [copied, setCopied] = useState(false);

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard no disponible */ }
  };

  /* Intenta la API nativa (móvil); si no existe, abre la URL genérica. */
  const nativeOr = (href: string) => async (): Promise<void> => {
    if ('share' in navigator) {
      try {
        await navigator.share({ title: `@${username} en bioo`, url });
        return;
      } catch { /* el usuario canceló → no abrimos fallback */ return; }
    }
    window.open(href, '_blank', 'noopener,noreferrer');
  };

  const enc = encodeURIComponent(url);
  const msg = encodeURIComponent(`Mira mi bioo 👇 ${url}`);

  const nets: Net[] = [
    {
      label: copied ? '¡Copiado!' : 'Copiar',
      Icon: copied ? Check : Copy,
      onClick: copy,
      cls: 'bg-neutral-100 text-neutral-700',
    },
    {
      label: 'X',
      Icon: Twitter,
      onClick: nativeOr(`https://twitter.com/intent/tweet?text=${msg}`),
      cls: 'bg-black text-white',
    },
    {
      label: 'Facebook',
      Icon: Facebook,
      onClick: nativeOr(`https://www.facebook.com/sharer/sharer.php?u=${enc}`),
      cls: 'bg-[#1877F2] text-white',
    },
    {
      label: 'WhatsApp',
      Icon: MessageCircle,
      onClick: nativeOr(`https://wa.me/?text=${msg}`),
      cls: 'bg-[#25D366] text-white',
    },
    {
      label: 'LinkedIn',
      Icon: Linkedin,
      onClick: nativeOr(`https://www.linkedin.com/sharing/share-offsite/?url=${enc}`),
      cls: 'bg-[#0A66C2] text-white',
    },
    {
      label: 'Instagram',
      Icon: Instagram,
      // Instagram no acepta share por URL → copiamos el enlace.
      onClick: copy,
      cls: 'bg-gradient-to-tr from-[#feda75] via-[#d62976] to-[#4f5bd5] text-white',
    },
    {
      label: 'Telegram',
      Icon: Send,
      onClick: nativeOr(`https://t.me/share/url?url=${enc}`),
      cls: 'bg-[#229ED9] text-white',
    },
    {
      label: 'Email',
      Icon: Mail,
      href: `mailto:?subject=${encodeURIComponent(`@${username} en bioo`)}&body=${msg}`,
      cls: 'bg-neutral-100 text-neutral-700',
    },
  ];

  const handleDragEnd = (_e: unknown, info: PanInfo): void => {
    if (info.offset.y > 120 || info.velocity.y > 800) onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* ── Backdrop ── */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          />

          {/* ── Bottom Sheet ── */}
          <motion.section
            key="sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Compartir página"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={SHEET_SPRING}
            drag="y"
            dragDirectionLock
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.45 }}
            onDragEnd={handleDragEnd}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[92dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-3xl bg-white pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-14px_44px_-12px_rgba(0,0,0,0.35)]"
          >
            {/* Píldora deslizable */}
            <div className="sticky top-0 z-10 flex justify-center bg-white pt-3 pb-2">
              <span className="h-1.5 w-10 rounded-full bg-neutral-300" aria-hidden />
            </div>

            {/* ── Tarjeta de identidad ── */}
            <div className="m-4 rounded-[24px] bg-[#15240b] p-6 text-white shadow-lg">
              <div className="flex flex-col items-center text-center">
                {avatar ? (
                  <img
                    src={avatar}
                    alt={`Avatar de @${username}`}
                    className="h-20 w-20 rounded-full object-cover ring-2 ring-white/20"
                  />
                ) : (
                  <span className="grid h-20 w-20 place-items-center rounded-full bg-white/10 text-2xl font-bold ring-2 ring-white/20">
                    {username.charAt(0).toUpperCase()}
                  </span>
                )}
                <p className="mt-4 text-lg font-bold">@{username}</p>
                <span className="mt-1 inline-flex items-center gap-1 text-sm text-white/60">
                  <Link2 size={13} /> bioo.cl/{username}
                </span>
              </div>
            </div>

            {/* ── Grid de redes ── */}
            <div className="grid grid-cols-4 gap-y-6 px-6 pt-2">
              {nets.map((n) => {
                const Icon = n.Icon;
                const inner = (
                  <>
                    <span className={`grid h-14 w-14 place-items-center rounded-full shadow-sm transition-transform group-active:scale-90 ${n.cls}`}>
                      <Icon size={22} />
                    </span>
                    <span className="text-[11px] font-medium text-neutral-600">{n.label}</span>
                  </>
                );
                const cls = 'group flex flex-col items-center gap-2';
                return n.href ? (
                  <a key={n.label} href={n.href} target="_blank" rel="noopener noreferrer" className={cls}>
                    {inner}
                  </a>
                ) : (
                  <button key={n.label} type="button" onClick={n.onClick} className={cls}>
                    {inner}
                  </button>
                );
              })}
            </div>

            {/* ── Botón PWA ── */}
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event('bioo:install-pwa'))}
              className="mx-4 mt-6 flex items-center justify-center gap-2 rounded-2xl border border-neutral-200 py-3 font-bold text-[#15240b] transition-colors hover:bg-neutral-50 active:scale-[0.98]"
            >
              <Plus size={18} strokeWidth={2.6} /> Añadir a pantalla de inicio
            </button>

            {/* ── Banner viral (growth loop) ── */}
            <div className="mt-6 border-t border-neutral-100 bg-neutral-50/60 px-6 py-6">
              <p className="text-center text-base font-bold text-neutral-900">
                Únete a <span style={{ color: FOREST }}>@{username}</span> en bioo
              </p>
              <p className="mt-1 text-center text-sm text-neutral-500">
                Obtén tu propia página de enlaces gratis y comparte todo lo que eres en un solo link.
              </p>
              <div className="mt-4 flex gap-3">
                <a
                  href="https://bioo.cl"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 rounded-2xl bg-[#15240b] py-3 text-center text-sm font-bold text-white transition-transform active:scale-[0.98]"
                >
                  Regístrate gratis
                </a>
                <a
                  href="https://bioo.cl"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 rounded-2xl border border-neutral-300 py-3 text-center text-sm font-bold text-neutral-700 transition-colors hover:bg-white active:scale-[0.98]"
                >
                  Descubre más
                </a>
              </div>
            </div>
          </motion.section>
        </>
      )}
    </AnimatePresence>
  );
}
