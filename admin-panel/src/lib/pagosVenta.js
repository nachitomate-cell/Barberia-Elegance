/* Medio de pago de una venta de producto: simple o dividido.
 *
 * Contrato compartido con la agenda y las liquidaciones, y el que Caja ya sabe
 * leer (`montosPorMetodo`, Caja.jsx):
 *
 *   · Pago único    → `metodoPago: 'Efectivo'|'Débito'|…`  ·  `pagos: null`
 *   · Pago dividido → `metodoPago: 'Mixto'`  ·  `pagos: [{tipo, monto}]`
 *
 * Caja suma el split de una venta suelta directamente (Caja.jsx:1262), así que
 * no hizo falta tocar el arqueo. Ojo con el caso que ya estaba resuelto ahí: si
 * la venta cuelga de una cita con split, el desglose de la CITA cubre el ticket
 * completo (servicio + productos) y Caja excluye la venta para no contar dos
 * veces — por eso este split solo se usa en ventas y entregas propias.
 *
 * Vive fuera del componente para poder probarse sin montar React
 * (`npm run test:pagos-venta`).
 */

export const METODOS_VENTA = ['Efectivo', 'Débito', 'Crédito', 'Transferencia'];

export const esSplit = (pagos) => Array.isArray(pagos) && pagos.length > 0;

export const sumaPagos = (pagos) =>
  (Array.isArray(pagos) ? pagos : []).reduce((s, p) => s + (Number(p?.monto) || 0), 0);

/** ¿Se puede guardar? Un split que no suma el total exacto descuadra la caja
 *  del día, y eso se descubre recién al cerrar turno. */
export function pagoValido({ metodoPago, pagos } = {}, total = 0) {
  if (esSplit(pagos)) {
    return Math.round(sumaPagos(pagos)) === Math.round(Number(total) || 0)
      && pagos.every(p => !!p?.tipo);
  }
  return !!metodoPago;
}

/** Lo que se escribe en Firestore. Redondea los montos y deja `pagos: null`
 *  cuando es pago único, para que las vistas legacy sigan leyendo el string. */
export function normalizarPago({ metodoPago, pagos } = {}) {
  if (esSplit(pagos)) {
    return {
      metodoPago: 'Mixto',
      pagos: pagos.map(p => ({ tipo: p.tipo, monto: Math.round(Number(p.monto) || 0) })),
    };
  }
  return { metodoPago: metodoPago || '', pagos: null };
}

/** Etiqueta para la tabla: "Efectivo" o "Efectivo + Débito". */
export function etiquetaPago({ metodoPago, pagos } = {}) {
  if (esSplit(pagos)) return pagos.map(p => p.tipo).join(' + ');
  return metodoPago || '';
}
