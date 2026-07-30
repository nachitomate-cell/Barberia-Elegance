/**
 * Spinner radial estilo iOS — 8 líneas que se desvanecen alrededor de un centro.
 * Es el look nativo de UIActivityIndicatorView. Reemplaza los antiguos rings
 * `border-emerald-500 border-t-transparent animate-spin` que quedaban neón sobre
 * el nuevo diseño pastel/cristal.
 *
 * Uso: <Spinner /> — 20px, color heredado (text-*)
 *      <Spinner size={28} className="text-slate-500" />
 *
 * `currentColor` significa que basta con darle `text-slate-400` (o el acento
 * que corresponda) al padre — sin props extras.
 */
export default function Spinner({ size = 20, className = '', label = 'Cargando' }) {
  const bars = 8;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={`ios-spinner ${className}`}
      role="status"
      aria-label={label}
    >
      {Array.from({ length: bars }).map((_, i) => (
        <rect
          key={i}
          x="10.9" y="2" width="2.2" height="6" rx="1.1"
          fill="currentColor"
          transform={`rotate(${i * (360 / bars)} 12 12)`}
          style={{
            opacity: 0.15,
            animation: 'ios-spinner-fade 0.9s linear infinite',
            animationDelay: `${-((bars - 1 - i) * (0.9 / bars))}s`,
          }}
        />
      ))}
    </svg>
  );
}

/**
 * Variante centrada — cubre el patrón "cargando toda la vista":
 *   <SpinnerCenter />
 * Se usaba antes como:
 *   <div className="flex justify-center py-16">
 *     <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
 *   </div>
 */
export function SpinnerCenter({ py = 16, size = 28, className = 'text-slate-500' }) {
  return (
    <div className={`flex justify-center py-${py}`}>
      <Spinner size={size} className={className} />
    </div>
  );
}
