/* ¿Esta ruta está reservada al admin?
 *
 * Vive aparte de App.jsx por una razón concreta: es un control de seguridad y
 * tiene que poder probarse solo. Esconder el ítem del Sidebar NO cierra la
 * ruta — recepción escribiendo /gestion-interna/metricas entraba igual, y
 * Métricas se calcula desde `citas`, que sí puede leer: veía los ingresos.
 *
 * Se compara la ruta COMPLETA, no el último segmento. La versión anterior
 * hacía `pathname.split('/').pop()`, que funciona solo mientras todas las
 * rutas del menú sean de un segmento. El día que exista `caja/historial`,
 * `pop()` devuelve 'historial', el Set no lo reconoce y el guard deja pasar.
 * Un control que falla ABRIÉNDOSE y sin ruido es peor que no tenerlo, porque
 * nadie se entera de que dejó de proteger.
 *
 * Las subrutas heredan del padre: si `metricas` es adminOnly, `metricas/x`
 * también, sin tener que enumerarla.
 */
export function esRutaSoloAdmin(pathname, rutasSoloAdmin) {
  const ruta = String(pathname || '').replace(/^\/+|\/+$/g, '');
  if (!ruta) return false;
  if (rutasSoloAdmin.has(ruta)) return true;
  for (const r of rutasSoloAdmin) {
    if (r && ruta.startsWith(`${r}/`)) return true;
  }
  return false;
}
