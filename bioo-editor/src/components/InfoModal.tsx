import type { ReactNode } from 'react';
import { AnimatePresence, motion, type Transition, type PanInfo } from 'framer-motion';
import { X, type LucideIcon } from 'lucide-react';

/* Mismo spring iOS que ShareModal / PreviewSheet (300/30). */
const SHEET_SPRING: Transition = { type: 'spring', stiffness: 300, damping: 30 };

interface Props {
  isOpen: boolean;
  onClose: () => void;
  icon: LucideIcon;
  title: string;
  /** Subtítulo corto bajo el título — una línea, opcional. */
  kicker?: string;
  children: ReactNode;
}

export default function InfoModal({ isOpen, onClose, icon: Icon, title, kicker, children }: Props): JSX.Element {
  const handleDragEnd = (_e: unknown, info: PanInfo): void => {
    if (info.offset.y > 120 || info.velocity.y > 800) onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          />

          <motion.section
            key="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={title}
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
            <div className="sticky top-0 z-10 flex justify-center bg-white pt-3 pb-2">
              <span className="h-1.5 w-10 rounded-full bg-neutral-300" aria-hidden />
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-neutral-100 text-neutral-500 transition-colors hover:bg-neutral-200"
            >
              <X size={18} />
            </button>

            <header className="px-6 pt-2">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#92c83a]/15 text-[#72a129]">
                <Icon size={26} />
              </span>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-[#15240b]">{title}</h2>
              {kicker && <p className="mt-1 text-sm text-neutral-500">{kicker}</p>}
            </header>

            <div className="px-6 pb-8 pt-5">{children}</div>
          </motion.section>
        </>
      )}
    </AnimatePresence>
  );
}

/* ── Subcomponentes de contenido (reutilizables dentro del modal) ── */

export function InfoStep({ n, title, children }: { n: number; title: string; children: ReactNode }): JSX.Element {
  return (
    <div className="flex gap-3">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#15240b] text-xs font-bold text-white">{n}</span>
      <div className="min-w-0">
        <p className="font-bold text-[#15240b]">{title}</p>
        <div className="mt-1 text-sm leading-relaxed text-neutral-600">{children}</div>
      </div>
    </div>
  );
}

export function InfoBlock({ title, children }: { title: string; children: ReactNode }): JSX.Element {
  return (
    <section className="rounded-2xl bg-neutral-50 p-4 ring-1 ring-black/[0.03]">
      <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">{title}</h3>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-neutral-700">{children}</div>
    </section>
  );
}

export function InfoRow({ label, value }: { label: string; value: ReactNode }): JSX.Element {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-neutral-200/70 pt-2 first:border-0 first:pt-0">
      <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">{label}</span>
      <span className="text-right text-sm font-medium text-neutral-800">{value}</span>
    </div>
  );
}
