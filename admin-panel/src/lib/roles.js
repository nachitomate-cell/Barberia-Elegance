/**
 * ¿Quién atiende sillón?
 *
 * La pregunta correcta es "¿atiende?", NO "¿su rol es admin?". El filtro de la
 * agenda enumeraba un solo rol (`rol !== 'admin'`), así que al aparecer
 * `recepcion` esas cuentas se volvieron columna de la agenda sin que nadie lo
 * pidiera. Y la reserva pública no miraba el rol para nada, así que podía
 * ofrecer a alguien que el panel no dibuja: una cita ahí entra al sistema y no
 * aparece en ninguna agenda. Pasó de verdad con Kronnos — un admin que sí
 * atendía quedó público-sí / panel-no con 4 citas confirmadas invisibles.
 *
 * Es una lista de NEGACIÓN a propósito. Con una lista de los roles que sí
 * atienden, un rol nuevo que atiende (tatuador, podóloga) quedaría oculto y sus
 * citas invisibles. Al revés, un rol de escritorio que se cuele aparece de más:
 * molesta, pero se ve y se corrige. Se elige el error que se nota.
 *
 * Espejo de `atiendeSillon` en firebaseUtils.js (ReservaCore), que usan las
 * páginas públicas. No pueden compartir código —una es módulo Vite y la otra un
 * script global— así que `scripts/check-agenda-visibles.js` verifica que las dos
 * digan lo mismo.
 */
export const ROLES_MOSTRADOR = new Set(['admin', 'jefe', 'recepcion']);

/**
 * @param {object} b        doc de /barberos
 * @param {string} tenantId tenant activo (delnero tiene convención propia)
 * @param {boolean} [verQA] si el que mira es superadmin, el fantasma de QA sí va
 */
export function atiendeSillon(b, tenantId, verQA = false) {
  if (!b) return false;
  if (b._mainDocId) return false;              // doc espejo de SSO, no otra persona
  if (b.disponible === false) return false;
  if (b.esQA && !verQA) return false;
  if (!ROLES_MOSTRADOR.has(b.rol)) return true;
  // Roles de mostrador: solo si el doc lo dice explícitamente. delnero sigue la
  // convención admin === barbero desde antes de que esto existiera.
  return tenantId === 'delnero' || b.mostrarEnAgenda === true || b.esBarbero === true;
}
