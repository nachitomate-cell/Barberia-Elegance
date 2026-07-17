import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function SlideOver({ isOpen, onClose, title, subtitle, children, footer, maxWidth = 'max-w-md' }) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className={`relative z-10 w-full ${maxWidth} flex flex-col bg-slate-900 shadow-2xl border-l border-slate-800 animate-slide-in-right`}>

        {/* Header — safe-area-inset-top para no quedar bajo el notch/Dynamic Island */}
        <div
          className="flex items-start justify-between gap-4 px-6 pb-5 border-b border-slate-800 shrink-0"
          style={{ paddingTop: 'max(env(safe-area-inset-top), 1.5rem)' }}
        >
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-primary truncate">{title}</h2>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-primary hover:bg-slate-800 active:scale-95 transition-all shrink-0"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 no-scrollbar">
          {children}
        </div>

        {/* Footer — safe-area-inset-bottom para el home indicator */}
        {footer && (
          <div
            className="px-6 pt-4 border-t border-slate-800 shrink-0"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
