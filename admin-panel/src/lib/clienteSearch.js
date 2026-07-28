/* ── Búsqueda de clientes — lógica ÚNICA del panel ──────────────────
 *
 * Existía dos veces, distinta en cada lugar, y daba resultados
 * contradictorios para la misma consulta (reportado en Aura, 2026-07-28):
 *
 *   · Clientes  → substring literal del texto completo sobre el nombre,
 *                 sin normalizar acentos. Buscar "aldo cris" NO encontraba
 *                 a "Aldo Medel" (su ficha tiene el nombre corto, sus citas
 *                 el largo "Aldo Cristóbal Medel Bernales"), y "alvarez"
 *                 tampoco encontraba a "Gonzalo Ramos Álvarez".
 *   · Nueva cita → por palabra, sobre nombre+email+teléfono, con acentos
 *                 normalizados.
 *
 * Se queda la segunda, que es la que sirve para buscar a una persona: uno
 * recuerda pedazos del nombre, no la cadena exacta con la que quedó
 * guardada.
 *
 * Consecuencia a tener presente: al buscar también dentro del email,
 * "aldo" matchea "respaldojetrox@gmail.com". Es el precio de encontrar a
 * quien está guardado solo por correo, y por eso ordenamos por score —
 * las coincidencias en el nombre van primero.
 */

/** Minúsculas + sin acentos. "Álvarez" → "alvarez". */
export function normalizarTexto(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Los teléfonos se comparan solo por dígitos: +56 9 4239 8845 ≡ 56942398845. */
const soloDigitos = s => (s || '').replace(/\D/g, '');

/**
 * ¿Este cliente coincide con la consulta?
 * TODAS las palabras de la consulta deben aparecer en alguno de los campos
 * (no necesariamente en el mismo): así "aldo medel" encuentra a quien tiene
 * el nombre en un campo y el apellido en otro.
 */
export function matchCliente(cliente, queryNormalizada) {
  const q = queryNormalizada;
  if (!q) return true;
  const palabras = q.split(/\s+/).filter(Boolean);
  if (!palabras.length) return true;

  const nombre = normalizarTexto(cliente?.nombre);
  const email  = normalizarTexto(cliente?.email);
  const tel    = soloDigitos(cliente?.telefono);

  return palabras.every(w =>
    nombre.includes(w) || email.includes(w) || tel.includes(soloDigitos(w) || w));
}

/**
 * Relevancia (menor = más relevante), para ordenar los resultados:
 *   0 · el nombre empieza con la consulta completa
 *   1 · alguna palabra del nombre empieza con alguna palabra de la consulta
 *   2 · coincide, pero en medio de un campo (típico del email)
 */
export function scoreCliente(cliente, queryNormalizada) {
  const nombre = normalizarTexto(cliente?.nombre);
  if (nombre.startsWith(queryNormalizada)) return 0;
  const palabras = queryNormalizada.split(/\s+/).filter(Boolean);
  if (palabras.some(w => nombre.startsWith(w))) return 1;
  return 2;
}

/** Filtra + ordena por relevancia. Devuelve la lista intacta si no hay query. */
export function buscarClientes(clientes, query, { limite } = {}) {
  const q = normalizarTexto((query || '').trim());
  if (!q) return limite ? (clientes || []).slice(0, limite) : (clientes || []);
  const out = (clientes || [])
    .filter(c => matchCliente(c, q))
    .map(c => ({ c, score: scoreCliente(c, q) }))
    .sort((a, b) => a.score - b.score)
    .map(({ c }) => c);
  return limite ? out.slice(0, limite) : out;
}
