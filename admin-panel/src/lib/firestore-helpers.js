/**
 * Helpers para llamadas defensivas a Firestore desde el panel.
 *
 * Anti-cuelgue: el SDK web de Firestore no aborta getDocs/getDoc por si solo.
 * Si la PWA se duerme o el WiFi parpadea, el socket gRPC queda colgado y un
 * Promise.all jamas resuelve. Eso era la causa del "se queda cargando
 * infinitamente" reportado en Inicio y Metricas.
 *
 * REGLA: cualquier getDocs/getDoc en una vista debe pasar por withTimeout().
 * Para multi-fetch sincronizado a una vista, usar fetchAll() que tambien
 * cancela respuestas obsoletas via fetchIdRef.
 */

const DEFAULT_TIMEOUT_MS = 20000;

/**
 * Envuelve una promesa de Firestore en un Promise.race con timeout.
 * Si el timeout se cumple, rechaza con un Error informativo en lugar de
 * quedarse colgado para siempre.
 *
 * @template T
 * @param {Promise<T>} p           — la promesa a vigilar (getDocs, getDoc, etc.)
 * @param {number}     [ms]        — timeout en ms (default 20s)
 * @param {string}     [label]     — etiqueta para el mensaje de error
 * @returns {Promise<T>}
 */
export const withTimeout = (p, ms = DEFAULT_TIMEOUT_MS, label = 'firestore') =>
  Promise.race([
    p,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`timeout(${label}) ${ms}ms`)), ms)
    ),
  ]);

/**
 * Crea un controlador de "fetch en curso" para una vista.
 *
 * Patron de uso:
 *   const fetchCtl = useRef(createFetchController()).current;
 *   const myId = fetchCtl.start();
 *   // ... await fetches ...
 *   if (!fetchCtl.isCurrent(myId)) return; // cancelado por un fetch posterior
 *
 * Evita race conditions cuando el usuario cambia rangos o presiona "Actualizar"
 * antes de que termine la peticion anterior — las respuestas obsoletas se
 * descartan en lugar de pisar el estado con datos viejos.
 */
export function createFetchController() {
  let id = 0;
  return {
    start: () => ++id,
    isCurrent: (myId) => myId === id,
    current: () => id,
  };
}
