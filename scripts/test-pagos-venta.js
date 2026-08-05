#!/usr/bin/env node
/**
 * Prueba el medio de pago dividido de las ventas de producto.
 *
 * Lo que de verdad importa acá no es la UI sino que lo que se GUARDA lo sepa
 * leer Caja: un split mal escrito descuadra el arqueo del día y se descubre
 * recién al cerrar turno. Por eso el test replica `montosPorMetodo` de
 * Caja.jsx y comprueba que los buckets cuadren.
 *
 *   npm run test:pagos-venta
 */
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const LIB = pathToFileURL(path.join(ROOT, 'admin-panel', 'src', 'lib', 'pagosVenta.js')).href;

let fallos = 0;
const check = (cond, m) => { console.log(`  ${cond ? '✅' : '❌'} ${m}`); if (!cond) fallos++; };

// ── Copia de montosPorMetodo (Caja.jsx) ─────────────────────────────
const TARJETA = new Set(['Tarjeta', 'Débito', 'Crédito']);
function montosPorMetodo(item, total) {
  const out = { efectivo: 0, tarjeta: 0, transf: 0 };
  if (Array.isArray(item?.pagos) && item.pagos.length) {
    item.pagos.forEach(p => {
      const m = Number(p.monto) || 0;
      if (p.tipo === 'Efectivo') out.efectivo += m;
      else if (TARJETA.has(p.tipo)) out.tarjeta += m;
      else if (p.tipo === 'Transferencia') out.transf += m;
    });
    return out;
  }
  if (item?.metodoPago === 'Efectivo') out.efectivo = total;
  else if (TARJETA.has(item?.metodoPago)) out.tarjeta = total;
  else if (item?.metodoPago === 'Transferencia') out.transf = total;
  return out;
}

(async () => {
  const { pagoValido, normalizarPago, etiquetaPago, sumaPagos, esSplit } = await import(LIB);

  console.log('\n── Validación ──');
  check(pagoValido({ metodoPago: 'Efectivo', pagos: null }, 10000), 'pago único con método vale');
  check(!pagoValido({ metodoPago: '', pagos: null }, 10000), 'pago único SIN método no vale');
  check(pagoValido({ pagos: [{ tipo: 'Efectivo', monto: 6000 }, { tipo: 'Débito', monto: 4000 }] }, 10000),
    'split que suma el total vale');
  check(!pagoValido({ pagos: [{ tipo: 'Efectivo', monto: 6000 }, { tipo: 'Débito', monto: 3000 }] }, 10000),
    'split que NO suma el total se rechaza (descuadraría la caja)');
  check(!pagoValido({ pagos: [{ tipo: 'Efectivo', monto: 6000 }, { tipo: '', monto: 4000 }] }, 10000),
    'split con una fila sin método se rechaza');
  check(pagoValido({ pagos: [{ tipo: 'Efectivo', monto: 10000.4 }] }, 10000),
    'tolera decimales al redondear');

  console.log('\n── Lo que se escribe en Firestore ──');
  const unico = normalizarPago({ metodoPago: 'Débito', pagos: null });
  check(unico.metodoPago === 'Débito' && unico.pagos === null,
    'pago único guarda el string y pagos:null (las vistas legacy no notan nada)');
  const dividido = normalizarPago({ metodoPago: 'Efectivo', pagos: [{ tipo: 'Efectivo', monto: 6000.6 }, { tipo: 'Crédito', monto: 4000 }] });
  check(dividido.metodoPago === 'Mixto', 'split deja metodoPago Mixto — misma convención que agenda y liquidaciones');
  check(dividido.pagos.length === 2 && dividido.pagos[0].monto === 6001, 'los montos se redondean al guardar');

  console.log('\n── Compatibilidad con el arqueo de Caja ──');
  const total = 10000;
  const split = { metodoPago: 'Mixto', pagos: [{ tipo: 'Efectivo', monto: 6000 }, { tipo: 'Crédito', monto: 4000 }] };
  const b = montosPorMetodo(split, total);
  check(b.efectivo === 6000 && b.tarjeta === 4000 && b.transf === 0,
    'Caja reparte el split a sus buckets (efectivo 6.000 · tarjeta 4.000)');
  check(b.efectivo + b.tarjeta + b.transf === total, 'los buckets suman el total, sin plata perdida');

  const legacy = montosPorMetodo({ metodoPago: 'Transferencia' }, total);
  check(legacy.transf === total, 'una venta vieja sin pagos[] sigue cayendo entera en su bucket');

  const sinNada = montosPorMetodo({ metodoPago: '' }, total);
  check(sinNada.efectivo + sinNada.tarjeta + sinNada.transf === 0,
    'una venta sin método no inventa plata en ningún bucket');

  console.log('\n── Etiqueta de la tabla ──');
  check(etiquetaPago({ metodoPago: 'Efectivo' }) === 'Efectivo', 'pago único muestra su método');
  check(etiquetaPago(split) === 'Efectivo + Crédito', 'split muestra el desglose, no "Mixto"');
  check(etiquetaPago({}) === '', 'sin método devuelve vacío (la vista pone "Sin registrar")');

  console.log('\n── Helpers ──');
  check(esSplit([{ tipo: 'Efectivo', monto: 1 }]) === true && esSplit(null) === false && esSplit([]) === false,
    'esSplit distingue split de pago único');
  check(sumaPagos([{ monto: 1000 }, { monto: 'x' }, {}]) === 1000, 'sumaPagos ignora valores no numéricos');

  console.log(fallos ? `\n❌ ${fallos} fallo(s)\n` : '\n✅ Todo en orden\n');
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
