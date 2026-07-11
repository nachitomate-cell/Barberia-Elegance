/* ═══════════════════════════════════════════════════════════════
 *  ayudaData.js — accesos a _ayuda/* en Firestore
 *  ─────────────────────────────────────────────────────────────
 *  Contenido GLOBAL (no per-tenant). Todos los tenants leen la
 *  misma raíz `_ayuda/*`. Reglas: read público, write bootstrap.
 * ═══════════════════════════════════════════════════════════════ */

import { collection, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

/* Estructura: _ayuda/global/{categorias,articulos,changelog}/{docId}
 * (Firestore requiere paths con componentes pares.) */
export const AYUDA_ROOT = '_ayuda/global';
export const ayudaCategoriasCol = () => collection(db, `${AYUDA_ROOT}/categorias`);
export const ayudaArticulosCol  = () => collection(db, `${AYUDA_ROOT}/articulos`);
export const ayudaChangelogCol  = () => collection(db, `${AYUDA_ROOT}/changelog`);

export const ayudaCategoriaDoc = (catId) => doc(db, `${AYUDA_ROOT}/categorias`, catId);
export const ayudaArticuloDoc  = (artId) => doc(db, `${AYUDA_ROOT}/articulos`,  artId);

/* Icono por slug de categoría — mapea al `icono` del doc.
 * Uso Lucide en el editor, pero renderizamos SVGs inline para
 * evitar bundle bloat y matchear el tipo de trazo del mockup. */
export const CATEGORIA_ICONOS = {
  'comenzar-aqui':    'activity',
  'agenda-reservas':  'calendar',
  'servicios-precios':'shield',
  'equipo-roles':     'users',
  'pagos-caja':       'wallet',
  'fidelizacion':     'star',
  'marketing':        'globe',
  'multi-sede':       'building',
};
