/**
 * phoneUtils — normalización canónica de teléfonos chilenos para citas
 * y perfiles de usuario. Diseñado para que UN mismo cliente escrito por
 * cualquier flujo (panel admin, agenda pública, dashboard) quede con
 * IDENTICO string en Firestore → la CF sellosTenant resuelve el uid al
 * primer intento.
 *
 * Reglas:
 *   · sanitizarTelefono(): elimina espacios/guiones/paréntesis;
 *     conserva "+" si venía; NO invento prefijo país si no lo pusieron.
 *   · sanitizarTelefonoCL(): fuerza formato canónico "+56XXXXXXXXX"
 *     (aplica solo si detecta 9 dígitos válidos con o sin prefijo 56).
 *     Si no puede canonicalizar, devuelve el sanitizado plano.
 *   · sufijo9(): los últimos 9 dígitos — mismo cálculo que la CF y el
 *     script backfill-users-telefonoSuf9.js. Sirve como índice para
 *     resolver identidad aunque el formato varíe entre docs viejos.
 */

/** Elimina espacios, guiones, paréntesis; conserva "+" al inicio. */
export function sanitizarTelefono(raw) {
  if (raw == null) return '';
  const s = String(raw).trim();
  if (!s) return '';
  const plus = s.startsWith('+') ? '+' : '';
  return plus + s.replace(/[^\d]/g, '');
}

/** Solo dígitos, últimos 9 (móvil CL). Devuelve '' si no llega a 9. */
export function sufijo9(raw) {
  const digs = String(raw || '').replace(/\D+/g, '');
  return digs.length >= 9 ? digs.slice(-9) : '';
}

/** Devuelve la representación canónica "+56XXXXXXXXX" cuando puede.
 *  Fallback: retorna el sanitizado plano si no logra reconocer el patrón. */
export function sanitizarTelefonoCL(raw) {
  const plain = sanitizarTelefono(raw);
  if (!plain) return '';
  const digs = plain.replace(/\D+/g, '');
  if (digs.length === 9) return `+56${digs}`;           // 9XXXXXXXX  → +569XXXXXXXX
  if (digs.length === 11 && digs.startsWith('56')) {    // 569XXXXXXXX → +569XXXXXXXX
    return `+${digs}`;
  }
  if (digs.length === 8) return `+56${digs}`;           // fijo 8 dígitos
  return plain; // no reconocido: devolvemos sin +56 forzado
}
