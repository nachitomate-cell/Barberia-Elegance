import type { ReactNode } from 'react';

export const inputCls =
  'w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:border-bioo focus:bg-white focus:outline-none transition-colors';

export function Field({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-400">{label}</label>
      {children}
    </div>
  );
}

export function Group({ title, children }: { title: string; children: ReactNode }): JSX.Element {
  return (
    <div>
      <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-neutral-400">{title}</h3>
      {children}
    </div>
  );
}

export function Segmented<T extends string>({
  options, value, onChange,
}: { options: [T, string][]; value: T; onChange: (v: T) => void }): JSX.Element {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`flex-1 whitespace-nowrap rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors ${
            value === v ? 'border-bioo bg-bioo/10 text-bioo-dark' : 'border-neutral-200 text-neutral-500 hover:border-neutral-300'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
