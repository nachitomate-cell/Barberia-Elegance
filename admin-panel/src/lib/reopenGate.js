/**
 * reopenGate — contraseña opt-in para reabrir ventas cerradas y cajas cerradas.
 *
 * Este es un GATE anti-descuido, NO autenticación:
 *   - Los hashes viven en configuracion/main.reopenGates (Firestore) y quien
 *     lea el doc puede recuperarlos. Además, quien tenga acceso al panel
 *     puede desactivar el toggle desde /gestion-interna/configuracion.
 *   - Sirve para que el cajero de turno no pueda "corregir" una venta cerrada
 *     ni reabrir la caja del día sin permiso del dueño — no para blindar
 *     contra atacantes con credenciales de admin.
 *
 * SHA-256 con SubtleCrypto (nativo, sin dependencias). Solo hex minúscula.
 */

// Hash de una contraseña en hex minúscula. `subtle.digest` es asincrónico:
// devuelve Promise<string>.
export async function sha256Hex(str) {
  const buf = new TextEncoder().encode(String(str || ''));
  const hashBuf = await crypto.subtle.digest('SHA-256', buf);
  const bytes = new Uint8Array(hashBuf);
  let hex = '';
  for (const b of bytes) hex += b.toString(16).padStart(2, '0');
  return hex;
}

// true si `pass` hasheada calza con `hash` guardado. Vacíos → siempre false.
export async function verifyPass(pass, hash) {
  if (!pass || !hash) return false;
  const h = await sha256Hex(pass);
  return h === hash;
}

// Lee la config del gate (con defaults). Robust ante missing/malformed.
export function readGateConfig(config, key) {
  const g = config?.reopenGates?.[key];
  return {
    enabled: !!g?.enabled,
    passHash: typeof g?.passHash === 'string' ? g.passHash : '',
  };
}
