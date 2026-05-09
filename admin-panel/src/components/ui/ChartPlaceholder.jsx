import { BarChart3 } from 'lucide-react';

export default function ChartPlaceholder({ title, subtitle }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-3">
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex-1 min-h-[160px] flex flex-col items-center justify-center gap-2 border border-dashed border-slate-700 rounded-lg">
        <BarChart3 size={28} className="text-slate-700" />
        <p className="text-xs text-slate-600 font-medium">Integra Recharts aquí</p>
      </div>
    </div>
  );
}
