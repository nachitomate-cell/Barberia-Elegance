import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

/* ── Design System (premium, estilo Apple Settings / Vercel) ── */

export const cardCls =
  'bg-white rounded-[24px] p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] ring-1 ring-black/[0.03]';

export const inputBase =
  'w-full bg-neutral-100/70 border border-transparent rounded-xl p-3.5 text-[#15240b] placeholder-neutral-400 transition-all focus:bg-white focus:border-[#92c83a] focus:ring-4 focus:ring-[#92c83a]/10 outline-none';

export const labelCls =
  'text-sm font-semibold uppercase tracking-wider text-neutral-500 mb-3 block';

export const inputCls = inputBase; // alias retrocompatible

/** Tarjeta flotante con cabecera opcional (ícono verde lima + título). */
export function Card({ icon: Icon, title, hint, children }: {
  icon?: LucideIcon; title?: string; hint?: string; children: ReactNode;
}): JSX.Element {
  return (
    <section className={cardCls}>
      {(title || hint) && (
        <div className="mb-5">
          {title && (
            <div className="flex items-center gap-2.5">
              {Icon && <Icon size={20} className="text-[#92c83a]" />}
              <h3 className="text-lg font-bold text-[#15240b]">{title}</h3>
            </div>
          )}
          {hint && <p className="mt-1 text-xs text-neutral-400">{hint}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <div>
      <label className={labelCls}>{label}</label>
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
