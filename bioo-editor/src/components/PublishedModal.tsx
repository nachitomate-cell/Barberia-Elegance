import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Copy, Check, Download, Sparkles, ExternalLink,
  MessageCircle, Send, Twitter, Facebook, Instagram, Music2,
  type LucideIcon,
} from 'lucide-react';

/**
 * @param isOpen     Visibilidad del modal.
 * @param onClose    Cierra. Se llama también al click en backdrop.
 * @param username   Handle publicado — define la URL pública.
 * @param mintedNow  true → el handle se acaba de mintear (anónimo recién
 *                   publicó). Cambia el copy a "Tu bio está al aire"
 *                   (celebración fuerte) en vez de "Compartir tu bio".
 */
interface PublishedModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  mintedNow: boolean;
}

interface NetAction {
  label: string;
  Icon: LucideIcon;
  cls: string;
  href?: string;
  action?: () => void | Promise<void>;
}

const SPRING = { type: 'spring', stiffness: 380, damping: 30 } as const;

export default function PublishedModal({ isOpen, onClose, username, mintedNow }: PublishedModalProps): JSX.Element | null {
  const url = `https://bioo.cl/${username}`;
  const enc = encodeURIComponent(url);
  const msg = encodeURIComponent('Mira mi bioo 👇 ' + url);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=12&data=${enc}`;

  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Reset estado al re-abrir
  useEffect(() => { if (!isOpen) { setCopied(false); setToast(null); } }, [isOpen]);

  const copyUrl = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard bloqueado */ }
  };

  /** Copia el link al portapapeles y muestra un toast con instrucción
   *  específica de plataforma (IG/TikTok no exponen un share URL nativo). */
  const copyForPlatform = async (place: string): Promise<void> => {
    try { await navigator.clipboard.writeText(url); } catch { /* noop */ }
    setToast(`Link copiado — pégalo en ${place}`);
    setTimeout(() => setToast(null), 3500);
  };

  const downloadQR = async (): Promise<void> => {
    try {
      const res = await fetch(qrUrl);
      const blob = await res.blob();
      const o = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = o;
      a.download = `bioo-${username || 'codigo'}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(o);
    } catch {
      window.open(qrUrl, '_blank');
    }
  };

  // Orden táctico: los 4 que el usuario pidió primero (WA, IG, X, TikTok),
  // luego Telegram + Facebook para cubrir más redes sin saturar.
  const nets: NetAction[] = [
    { label: 'WhatsApp', Icon: MessageCircle, cls: 'bg-[#25D366]',
      href: `https://wa.me/?text=${msg}` },
    { label: 'Instagram', Icon: Instagram,
      cls: 'bg-gradient-to-tr from-[#feda75] via-[#d62976] to-[#4f5bd5]',
      action: () => copyForPlatform('tu bio de Instagram') },
    { label: 'X', Icon: Twitter, cls: 'bg-black',
      href: `https://twitter.com/intent/tweet?text=${msg}` },
    { label: 'TikTok', Icon: Music2, cls: 'bg-black',
      action: () => copyForPlatform('tu bio de TikTok') },
    { label: 'Telegram', Icon: Send, cls: 'bg-[#229ED9]',
      href: `https://t.me/share/url?url=${enc}` },
    { label: 'Facebook', Icon: Facebook, cls: 'bg-[#1877F2]',
      href: `https://www.facebook.com/sharer/sharer.php?u=${enc}` },
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      >
        <motion.div
          key="panel"
          initial={{ opacity: 0, scale: 0.94, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 18 }}
          transition={SPRING}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
        >
          {/* Header confeti */}
          <div className="relative bg-gradient-to-br from-[#92c83a]/15 via-white to-[#92c83a]/5 px-6 pb-5 pt-7 text-center">
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
            >
              <X size={18} />
            </button>
            <motion.span
              initial={{ scale: 0, rotate: -25 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ ...SPRING, delay: 0.05 }}
              className="mx-auto mb-2 grid h-14 w-14 place-items-center rounded-2xl bg-[#92c83a] shadow-lg"
            >
              <Sparkles size={26} className="text-[#15240b]" />
            </motion.span>
            <h2 className="text-xl font-extrabold tracking-tight text-[#15240b]">
              {mintedNow ? '🎉 Tu bio está al aire' : 'Comparte tu bioo'}
            </h2>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-neutral-500 transition-colors hover:text-[#15240b]"
            >
              bioo.cl/{username} <ExternalLink size={12} />
            </a>
          </div>

          <div className="px-6 pb-6 pt-1">
            {/* Acciones primarias */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={copyUrl}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#15240b] py-3 text-sm font-bold text-white shadow-sm transition-transform active:scale-95"
              >
                {copied ? <Check size={16} strokeWidth={2.6} /> : <Copy size={16} />}
                {copied ? '¡Copiado!' : 'Copiar enlace'}
              </button>
              <button
                type="button"
                onClick={downloadQR}
                className="flex items-center justify-center gap-2 rounded-xl bg-neutral-100 py-3 text-sm font-bold text-neutral-700 transition-colors hover:bg-neutral-200 active:scale-95"
              >
                <Download size={16} /> Descargar QR
              </button>
            </div>

            {/* Redes — 3 cols × 2 filas */}
            <p className="mb-2.5 mt-5 text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              Compartir en
            </p>
            <div className="grid grid-cols-3 gap-3">
              {nets.map((n) => {
                const Icon = n.Icon;
                const inner = (
                  <>
                    <span className={`grid h-12 w-12 place-items-center rounded-2xl text-white shadow-sm ${n.cls}`}>
                      <Icon size={20} />
                    </span>
                    <span className="text-[11px] font-semibold text-neutral-500">{n.label}</span>
                  </>
                );
                const cls = 'flex flex-col items-center gap-1.5 rounded-2xl py-2 transition-all active:scale-95 hover:bg-neutral-50';
                return n.href ? (
                  <a key={n.label} href={n.href} target="_blank" rel="noopener noreferrer" className={cls}>
                    {inner}
                  </a>
                ) : (
                  <button key={n.label} type="button" onClick={n.action} className={cls}>
                    {inner}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Toast (IG/TikTok copy feedback) */}
          <AnimatePresence>
            {toast && (
              <motion.p
                key={toast}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 14 }}
                className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#15240b] px-4 py-2 text-xs font-bold text-white shadow-lg"
              >
                {toast}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
