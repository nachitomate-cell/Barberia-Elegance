/**
 * Reenvío al núcleo de comisiones, que vive en /js/comisiones-core.js.
 *
 * Se movió a la raíz porque agenda.html —la vista del barbero, fuera del
 * panel— también necesita calcular lo que va a ganar, y el repo sirve /js
 * como estático. El archivo son funciones puras sin imports, así que lo puede
 * cargar tanto Vite como un <script type="module"> suelto.
 *
 * Este re-export existe para no tocar los imports del panel: si mañana se
 * copia el cálculo en vez de importarlo, dos vistas van a mostrar números
 * distintos para el mismo barbero y nadie va a saber cuál creer.
 */
export * from '../../../js/comisiones-core.js';
