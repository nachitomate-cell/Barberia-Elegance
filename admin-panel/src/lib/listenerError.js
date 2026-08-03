/* Manejador de errores para los listeners de Firestore.
 *
 * Existe porque el atajo `onSnapshot(q, cb, () => {})` deja el fallo INVISIBLE:
 * el estado se queda en su valor inicial —casi siempre `[]` o `0`— y la vista
 * lo pinta como si fuera el dato real. Un permiso denegado se ve igual que un
 * día sin ventas. Ya nos costó un ticket: el permission-denied de recepción en
 * inventario se leía como "no hay productos".
 *
 * Lo mínimo es que quede en la consola con el nombre de lo que falló, para que
 * un reporte del cliente sea reproducible. Donde el cero además ENGAÑA (una
 * cifra de plata, una lista que bloquea una operación) hay que mostrarlo en
 * pantalla, no solo loggearlo: ver el patrón `fallos` en Caja.jsx.
 */
export function errorListener(que, onError) {
  return (e) => {
    console.error(`[listener] no se pudo leer ${que}:`, e?.code || '', e?.message || e);
    onError?.(e);
  };
}
