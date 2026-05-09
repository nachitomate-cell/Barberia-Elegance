import { Scissors } from 'lucide-react';

export default function StampProgressBar({ stamps = 0, total = 10, size = 'md' }) {
  const sm = size === 'sm';

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {Array.from({ length: total }).map((_, i) => {
        const filled = i < stamps;
        return (
          <div
            key={i}
            title={filled ? `Sello ${i + 1}` : undefined}
            className={`rounded-full flex items-center justify-center transition-all ${
              sm ? 'w-4 h-4' : 'w-5 h-5'
            } ${
              filled
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-slate-800 border border-slate-700'
            }`}
          >
            {filled && <Scissors size={sm ? 8 : 10} strokeWidth={2.5} />}
          </div>
        );
      })}
      <span className={`ml-1 font-mono font-bold text-slate-400 ${sm ? 'text-[10px]' : 'text-xs'}`}>
        {stamps}/{total}
      </span>
    </div>
  );
}
