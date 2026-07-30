/**
 * Ticket térmico de 80 mm — renderizador único de todo lo que sale por la
 * impresora del mesón (cierre de caja, Corte X, y lo que venga).
 *
 * Vive aparte de la vista por dos razones: es una función pura sin
 * dependencias, así que se puede probar en node sin levantar el panel, y así
 * existe UNA sola plantilla. Dos plantillas de ticket se separan con el primer
 * cambio de formato y nadie se entera hasta que un local imprime uno cortado.
 *
 * El ancho útil de una térmica de 80 mm es ~72 mm: el resto se lo comen los
 * márgenes del cabezal. `size: 80mm auto` hace que el papel se corte al alto
 * del contenido en vez de escupir una hoja carta entera.
 */

export function escapeHTML(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/**
 * @param {object}   o
 * @param {string}   o.local      Nombre del local (cabecera).
 * @param {string}   o.titulo     Qué es este ticket.
 * @param {Array}    [o.meta]     Filas de contexto, mismo formato que `filas`.
 * @param {Array}    [o.secciones] `[{ titulo, filas }]`. Las secciones sin filas se omiten.
 * @param {string}   [o.nota]     Observaciones en texto libre, al final.
 * @param {string}   [o.pie]      Línea final.
 *
 * Cada fila es `[etiqueta, valor, opciones?]` con opciones:
 *   `fuerte` → negrita (totales), `centro` → una sola línea centrada (sellos
 *   tipo CUADRADA / SOBRANTE, donde el valor no aporta).
 */
export function renderTicketTermico({ local, titulo, meta, secciones, nota, pie }) {
  const sep = '<div class="sep"></div>';
  const fila = ([etq, val, o = {}]) => (o.centro
    ? `<div class="centro ${o.fuerte ? 'fuerte' : ''}">${escapeHTML(etq)}</div>`
    : `<div class="fila ${o.fuerte ? 'fuerte' : ''}">`
      + `<span class="etq">${escapeHTML(etq)}</span>`
      + `<span class="val">${escapeHTML(val)}</span></div>`);

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>${escapeHTML(titulo)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page { size: 80mm auto; margin: 3mm; }
  body {
    font-family: "Courier New", Courier, monospace;
    /* Negro puro y sin grises: la térmica no tiene tonos, un #666 sale igual
       que un #000 pero más débil y en papel viejo no se lee. */
    color: #000; background: #fff;
    width: 72mm; margin: 0 auto; padding: 4mm 0;
    font-size: 11px; line-height: 1.45;
  }
  .centro { text-align: center; }
  .local  { font-size: 13px; font-weight: bold; text-transform: uppercase; text-align: center; }
  .titulo { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; text-align: center; margin-top: 1px; }
  .sep    { border-top: 1px dashed #000; margin: 5px 0; }
  .sectit { font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 2px; }
  .fila   { display: flex; justify-content: space-between; gap: 6px; }
  /* La etiqueta parte el renglón y el monto NO: un total cortado a la mitad no
     sirve de nada. */
  .etq    { flex: 1 1 auto; word-break: break-word; }
  .val    { flex: 0 0 auto; text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .fuerte { font-weight: bold; }
  .nota   { font-size: 10px; white-space: pre-line; word-break: break-word; }
  .pie    { font-size: 9px; text-align: center; }
  .toolbar { width: 72mm; margin: 6px auto 0; display: flex; gap: 6px; font-family: system-ui, sans-serif; }
  .toolbar button { flex: 1; padding: 7px 0; border: 1px solid #000; background: #000; color: #fff; font-weight: 700; font-size: 11px; cursor: pointer; border-radius: 3px; }
  .toolbar button.sec { background: #fff; color: #000; }
  @media print { .noprint { display: none !important; } body { padding: 0; } }
</style></head>
<body>
  <div class="local">${escapeHTML(local || 'Local')}</div>
  <div class="titulo">${escapeHTML(titulo)}</div>
  ${sep}
  ${(meta || []).map(fila).join('')}
  ${(secciones || []).filter(s => s && (s.filas || []).length).map(s => `
    ${sep}
    ${s.titulo ? `<div class="sectit">${escapeHTML(s.titulo)}</div>` : ''}
    ${s.filas.map(fila).join('')}
  `).join('')}
  ${nota ? `${sep}<div class="sectit">Observaciones</div><div class="nota">${escapeHTML(nota)}</div>` : ''}
  ${sep}
  <div class="pie">${escapeHTML(pie || '')}</div>
  <div class="toolbar noprint">
    <button onclick="window.print()">Imprimir</button>
    <button class="sec" onclick="window.close()">Cerrar</button>
  </div>
  <script>
    // La térmica se usa con el ticket ya en la mano: se abre el diálogo solo.
    window.addEventListener('load', () => setTimeout(() => window.print(), 250));
  <\/script>
</body></html>`;
}
