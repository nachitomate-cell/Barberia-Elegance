/**
 * Abrir un HTML generado en una pestaña nueva, para imprimir.
 *
 * Con caída a descarga: si el navegador bloquea el popup y no hay fallback, el
 * botón no hace nada y parece roto.
 *
 * Vive acá porque lo usan la caja (cierre, Corte X, reporte del contador) y la
 * mensualidad (comprobante de pago). Estaba copiado en dos lugares antes de
 * extraerlo.
 */
export function abrirHTML(html, filename) {
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    return;
  }
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
