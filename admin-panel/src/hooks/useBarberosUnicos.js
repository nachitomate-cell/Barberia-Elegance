import { useMemo } from 'react';
import { useCollection } from './useCollection';
import { dedupeBarberos } from '../lib/dedupeBarberos';

/**
 * Lista de barberos SIN duplicados, lista para renderizar o para poblar un
 * selector. Úsalo en vez de `useCollection('barberos')` en cualquier vista que
 * muestre personas o deje elegir una.
 *
 * La lógica vive en `lib/dedupeBarberos.js` para poder probarse contra los
 * datos reales de producción (`npm run test:dedupe-barberos`). Ahí está el
 * porqué de cada filtro.
 *
 * La auditoría de 2026-08-05 encontró 60 link-docs en 19 locales y $824.970 en
 * citas y ventas colgando de ellos, porque dos vistas los ofrecían como
 * vendedor y una tercera los mostraba como persona a pagar.
 *
 * @param {{ soloActivos?: boolean, verQA?: boolean }} opts
 *   soloActivos — descarta los dados de baja (default true). Ponlo en false
 *   donde importe el histórico, como Comisiones: alguien desvinculado puede
 *   tener pagos pendientes.
 *   verQA — incluye al barbero fantasma de QA (default false).
 */
export function useBarberosUnicos({ soloActivos = true, verQA = false } = {}) {
  const { data: raw = [], loading, error } = useCollection('barberos');

  const barberos = useMemo(
    () => dedupeBarberos(raw, { soloActivos, verQA }),
    [raw, soloActivos, verQA],
  );

  return { barberos, loading, error };
}
