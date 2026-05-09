import { useState, useRef, useEffect } from 'react';
import { MoreHorizontal } from 'lucide-react';

export default function DropdownMenu({ items, align = 'right' }) {
  const [open, setOpen]   = useState(false);
  const containerRef      = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = e => {
      if (!containerRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700 transition-all"
      >
        <MoreHorizontal size={16} />
      </button>

      {open && (
        <div
          className={`absolute z-30 mt-1 w-44 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden animate-fade-in ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {items.map((item, i) =>
            item === 'separator' ? (
              <div key={i} className="h-px bg-slate-700 my-1" />
            ) : (
              <button
                key={i}
                onClick={e => { e.stopPropagation(); setOpen(false); item.onClick?.(); }}
                className={`flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-left transition-colors ${
                  item.danger
                    ? 'text-red-400 hover:bg-red-950/40'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                {item.Icon && <item.Icon size={15} />}
                {item.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
