/**
 * Skeleton shimmer — bloques translúcidos que respiran con un gradiente.
 * Se usa en lugar del spinner central cuando estamos cargando una LISTA o
 * TABLA: mantiene la forma del contenido futuro y evita el "brinco" visual
 * de "vacío grande → contenido".
 *
 * Uso rápido:
 *   <Skeleton className="h-4 w-32" />
 *   <Skeleton className="h-12 w-full rounded-xl" />
 *
 * Presets:
 *   <SkeletonRow />                   fila típica de lista de clientes/servicios
 *   <SkeletonList count={5} />        N filas apiladas
 *   <SkeletonCard />                  card cuadrada (grid de productos)
 *   <SkeletonGrid count={8} />        grilla de N cards
 */
export function Skeleton({ className = '', style }) {
  return (
    <div
      className={`skeleton-shimmer rounded-lg ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}

export function SkeletonRow() {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3"
      style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
    >
      <Skeleton className="h-10 w-10 rounded-full shrink-0" />
      <div className="flex-1 space-y-2 min-w-0">
        <Skeleton className="h-3.5 w-1/3" />
        <Skeleton className="h-2.5 w-1/2" />
      </div>
      <Skeleton className="h-5 w-16 rounded-full" />
    </div>
  );
}

export function SkeletonList({ count = 5 }) {
  return (
    <div
      className="bg-white/[0.02] rounded-2xl overflow-hidden"
      style={{ border: '1px solid rgba(255,255,255,0.05)' }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div
      className="rounded-2xl bg-white/[0.02] p-4 space-y-3"
      style={{ border: '1px solid rgba(255,255,255,0.05)' }}
    >
      <Skeleton className="aspect-square w-full rounded-xl" />
      <Skeleton className="h-3.5 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

export function SkeletonGrid({ count = 8, cols = 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' }) {
  return (
    <div className={`grid ${cols} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
