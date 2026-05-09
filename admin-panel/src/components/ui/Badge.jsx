const VARIANTS = {
  active:    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  inactive:  'bg-slate-700/50   text-slate-400   border-slate-600/30',
  pending:   'bg-amber-500/10   text-amber-400   border-amber-500/20',
  cancelled: 'bg-red-500/10     text-red-400     border-red-500/20',
  completed: 'bg-blue-500/10    text-blue-400    border-blue-500/20',
  admin:     'bg-purple-500/10  text-purple-400  border-purple-500/20',
};

export default function Badge({ variant = 'active', children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border ${VARIANTS[variant] ?? VARIANTS.active} ${className}`}
    >
      {children}
    </span>
  );
}
