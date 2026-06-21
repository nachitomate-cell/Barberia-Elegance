import type { ReactNode } from 'react';

/** Emulador de teléfono premium: rounded-[3rem], marco grueso e isla dinámica.
 *  `embedded` adapta la altura (sheet móvil vs. columna desktop). */
export default function PhoneFrame({ children, embedded = false }: { children: ReactNode; embedded?: boolean }): JSX.Element {
  return (
    <div
      className={`relative aspect-[9/19.5] overflow-hidden rounded-[3rem] border-[10px] border-neutral-900 bg-neutral-900 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.4)] ${
        embedded ? 'h-full max-h-full' : 'h-[640px] max-h-[82vh]'
      }`}
    >
      {/* Isla dinámica / notch */}
      <div className="absolute left-1/2 top-2.5 z-20 flex h-7 w-24 -translate-x-1/2 items-center justify-end rounded-full bg-black pr-2.5">
        <span className="h-2 w-2 rounded-full bg-neutral-700 ring-1 ring-neutral-600" />
      </div>
      {/* Pantalla */}
      <div className="no-scrollbar h-full w-full overflow-y-auto rounded-[2.2rem]">{children}</div>
    </div>
  );
}
