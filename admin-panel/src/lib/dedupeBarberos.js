/**
 * Deja UNA entrada por persona a partir de la colección `barberos` cruda.
 *
 * Vive fuera del hook para poder probarse contra los datos reales de los 35
 * locales sin montar React — ver `scripts/test-dedupe-barberos.js`.
 *
 * Un mismo profesional puede tener más de un documento:
 *
 *  - **Link-doc de SSO**: su id ES el UID de Firebase Auth y solo lleva
 *    `{ _mainDocId }` apuntando al canónico. Existe para que la persona entre
 *    con un segundo email; NO es otra persona y borrarlo la deja sin login
 *    (`AuthContext` resuelve el rol leyendo `barberos/{uid}`).
 *  - **Docs regravados**: recrear una cuenta admin con otro email dejaba el
 *    doc viejo en pie.
 *
 * `activo !== false` y no `activo === true` a propósito: varios docs CANÓNICOS
 * no traen el campo, y filtrar por `=== true` dejaba fuera a la persona real
 * mientras su link-doc (que sí lo trae) pasaba.
 *
 * Ordena por nombre para que `lista[0]` no dependa del orden de docId — que es
 * como un link-doc terminaba siendo el valor por defecto de un selector.
 */
export function dedupeBarberos(raw, { soloActivos = true, verQA = false } = {}) {
  const vistos = new Set();
  return (Array.isArray(raw) ? raw : [])
    .filter(b => b && !b._mainDocId)
    .filter(b => (soloActivos ? b.activo !== false : true))
    .filter(b => (verQA ? true : b.esQA !== true))
    .filter(b => {
      const clave = String(b.authUid || b.uid || (b.nombre || '').trim().toLowerCase() || b.id);
      if (vistos.has(clave)) return false;
      vistos.add(clave);
      return true;
    })
    .sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es'));
}
