import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, X, Check } from 'lucide-react';
import { useEditor } from '../store';
import { PRESETS, instantiateBlocks, type Template } from '../lib/presets';

export default function TemplatePicker({ open, onClose }: { open: boolean; onClose: () => void }): JSX.Element {
  const { state, dispatch } = useEditor();

  const apply = (tpl: Template): void => {
    if (state.blocks.length > 0 && !window.confirm('Esto reemplazará tus enlaces y diseño actuales. ¿Continuar?')) return;
    dispatch({ type: 'load', state: { ...state, theme: tpl.theme, blocks: instantiateBlocks(tpl.blocks) } });
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="bd"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-neutral-950/50 backdrop-blur-sm"
          />
          <motion.div
            key="panel"
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="fixed inset-x-0 bottom-0 top-auto z-50 mx-auto max-h-[88vh] w-full max-w-2xl overflow-hidden rounded-t-3xl bg-neutral-50 shadow-2xl sm:inset-0 sm:my-auto sm:h-fit sm:rounded-3xl"
          >
            <header className="flex items-start gap-3 border-b border-neutral-200 bg-white px-6 py-5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#92c83a]/15 text-[#72a129]">
                <Sparkles size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-extrabold tracking-tight text-neutral-900">Empieza con una plantilla</h2>
                <p className="text-xs text-neutral-500">Elige un arquetipo y arma tu página al instante. Luego personalízala.</p>
              </div>
              <button type="button" onClick={onClose} aria-label="Cerrar" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-neutral-100 text-neutral-500 transition-colors hover:bg-neutral-200 active:scale-95">
                <X size={18} />
              </button>
            </header>

            <div className="grid max-h-[calc(88vh-88px)] gap-4 overflow-y-auto p-6 sm:grid-cols-3">
              {PRESETS.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => apply(tpl)}
                  className="group flex flex-col rounded-2xl bg-white p-3 text-left shadow-sm ring-1 ring-black/[0.05] transition-all hover:-translate-y-1 hover:shadow-lg"
                >
                  <div
                    className="flex h-24 items-center justify-center rounded-xl text-4xl shadow-inner"
                    style={{ backgroundImage: `linear-gradient(135deg, ${tpl.accent[0]}, ${tpl.accent[1]})` }}
                  >
                    <span className="drop-shadow-sm transition-transform group-hover:scale-110">{tpl.emoji}</span>
                  </div>
                  <p className="mt-3 text-sm font-bold text-neutral-900">{tpl.name}</p>
                  <p className="mt-0.5 text-xs leading-snug text-neutral-500">{tpl.tagline}</p>
                  <div className="mt-2.5 flex flex-wrap gap-1">
                    {tpl.includes.map((c) => (
                      <span key={c} className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-500">{c}</span>
                    ))}
                  </div>
                  <span className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-[#92c83a]/10 py-2 text-xs font-bold text-[#72a129] transition-colors group-hover:bg-[#92c83a] group-hover:text-[#15240b]">
                    <Check size={14} /> Aplicar plantilla
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
