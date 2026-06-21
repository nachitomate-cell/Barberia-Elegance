import { AnimatePresence, motion, type Transition, type PanInfo } from 'framer-motion';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

/* Spring estilo iOS (spec: stiffness 300 / damping 30). */
const SHEET_SPRING: Transition = { type: 'spring', stiffness: 300, damping: 30 };

interface Props {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export default function PreviewSheet({ open, onClose, children }: Props): JSX.Element {
  const handleDragEnd = (_e: unknown, info: PanInfo): void => {
    if (info.offset.y > 120 || info.velocity.y > 800) onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-neutral-950/40 backdrop-blur-md"
          />
          <motion.section
            key="sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Vista previa de tu página"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={SHEET_SPRING}
            drag="y"
            dragDirectionLock
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.45 }}
            onDragEnd={handleDragEnd}
            className="fixed inset-x-0 bottom-0 top-10 z-50 mx-auto flex max-w-md flex-col overflow-hidden rounded-t-[30px] bg-neutral-100 shadow-[0_-14px_44px_-12px_rgba(0,0,0,0.35)]"
          >
            <header className="flex shrink-0 flex-col items-center pt-3">
              <span className="h-1.5 w-10 rounded-full bg-neutral-300" aria-hidden />
              <div className="flex w-full items-center justify-between px-5 pb-3 pt-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">Vista previa</span>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Cerrar"
                  className="grid h-9 w-9 place-items-center rounded-full bg-neutral-100 text-neutral-600 transition-colors hover:bg-neutral-200 active:scale-95"
                >
                  <X size={18} strokeWidth={2.4} />
                </button>
              </div>
            </header>

            <div className="grid min-h-0 flex-1 place-items-center overflow-hidden p-3">{children}</div>

            <footer className="shrink-0 border-t border-neutral-100 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-2xl bg-neutral-900 py-3.5 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
              >
                Cerrar y seguir editando
              </button>
            </footer>
          </motion.section>
        </>
      )}
    </AnimatePresence>
  );
}
