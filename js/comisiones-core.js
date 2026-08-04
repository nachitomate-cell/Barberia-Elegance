/**
 * Reglas de comisión — fuente única.
 *
 * Esto es plata: si dos vistas calculan la comisión por su cuenta, tarde o
 * temprano muestran números distintos para el mismo barbero y nadie sabe cuál
 * creer. Ya pasaba dentro de Comisiones.jsx, donde el drawer de detalle
 * reimplementaba la detección de cartera propia con guardas levemente distintas
 * a las de la tarjeta.
 *
 * Acá viven SOLO las reglas por ítem (una cita, una venta). La agregación por
 * período —adelantos en cuotas, ajustes manuales, sueldo base— se queda en
 * Comisiones.jsx: es mensual y la caja del día no la necesita.
 *
 * Funciones puras, sin imports: se pueden probar en node sin levantar el panel.
 */

/** Config de comisión de un barbero, normalizada y con defaults seguros. */
export function configBarbero(b) {
  const obj = v => (v && typeof v === 'object') ? v : {};
  return {
    id:     b?.id || '_sin',
    nombre: b?.nombre || 'Sin barbero',
    foto:   b?.foto || null,
    // Servicios y productos llevan tarifas distintas (ver Equipo.jsx).
    comisionPct:            Number(b?.comision) || 0,
    comisionPorServicio:    obj(b?.comisionPorServicio),
    // Modelo invertido (arriendo de sillón): el barbero cobra el 100% y le paga
    // un fijo al local, pero SOLO con clientes de su cartera propia.
    arriendoPorServicio:    obj(b?.arriendoPorServicio),
    sufijoClientePropio: (typeof b?.sufijoClientePropio === 'string' && b.sufijoClientePropio.trim())
      ? b.sufijoClientePropio.trim().toLowerCase() : '',
    comisionProductosPct:   b?.comisionProductos !== undefined ? Number(b.comisionProductos) : 10,
    comisionProductosMonto: Number(b?.comisionProductosMonto) || 0,
    comisionPorProducto:    obj(b?.comisionPorProducto),
    sueldoBase:             Number(b?.sueldoBase) || 0,
  };
}

// Un override vale solo si es un número finito y no negativo. Vacío, basura o
// negativo → cae al porcentaje global.
const overrideValido = (raw) => {
  const n = Number(raw);
  return (raw != null && raw !== '' && Number.isFinite(n) && n >= 0) ? n : null;
};

/** % de comisión de un servicio: override por servicio, si no el global. */
export function pctServicio(cfg, servicioId) {
  const ovr = overrideValido(cfg?.comisionPorServicio?.[servicioId]);
  return ovr != null ? ovr : (cfg?.comisionPct || 0);
}

/** % de comisión de un producto: override por producto, si no el global. */
export function pctProducto(cfg, productoId) {
  const ovr = overrideValido(cfg?.comisionPorProducto?.[productoId]);
  return ovr != null ? ovr : (cfg?.comisionProductosPct || 0);
}

/**
 * ¿El cliente es de la cartera propia del barbero?
 * Se detecta por el sufijo configurado al final del nombre. Sin sufijo →
 * SIEMPRE false: es a prueba de fallos, para no disparar arriendo por accidente.
 */
export function esClientePropio(cfg, clienteNombre) {
  const suf = cfg?.sufijoClientePropio;
  if (!suf) return false;
  const nombre = String(clienteNombre || '').trim().toLowerCase();
  if (!nombre) return false;
  const rx = new RegExp(`(^|\\s)${suf.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i');
  return rx.test(nombre);
}

/** Arriendo que el barbero le debe al local por ese servicio, o 0. */
export function arriendoDe(cfg, servicioId, clienteNombre) {
  if (!esClientePropio(cfg, clienteNombre)) return 0;
  const raw = cfg?.arriendoPorServicio?.[servicioId];
  const n = Number(raw);
  return (raw != null && raw !== '' && Number.isFinite(n) && n > 0) ? n : 0;
}

/**
 * Comisión de UNA cita. Dos modelos:
 *
 *  NORMAL — el cliente le paga al local: el local ingresa el precio y le paga
 *  comisión al barbero.
 *
 *  CARTERA PROPIA (CP) — el cliente le paga todo al barbero y el barbero le
 *  debe un arriendo fijo al local. Entonces el ingreso del local es el
 *  arriendo (no el precio, que nunca pasó por su caja) y la comisión es 0,
 *  porque el barbero ya cobró íntegro.
 *
 * `comision` va SIN redondear a propósito: la tarjeta de Comisiones acumula en
 * exacto y redondea al final. Para mostrar una fila suelta, redondear al usar.
 */
export function comisionCita({ cfg, precio, servicioId, clienteNombre }) {
  const p = Number(precio) || 0;
  const arriendo = arriendoDe(cfg, servicioId, clienteNombre);
  const cp = arriendo > 0 && p > 0;
  if (cp) {
    return { cp: true, pct: 0, comision: 0, arriendo, ingresoLocal: arriendo };
  }
  const pct = pctServicio(cfg, servicioId);
  return { cp: false, pct, comision: p * (pct / 100), arriendo: 0, ingresoLocal: p };
}

/** Comisión de UNA venta de producto: % (override o global) + monto fijo por venta. */
export function comisionVenta({ cfg, monto, productId }) {
  const m = Number(monto) || 0;
  const pct = pctProducto(cfg, productId);
  return { pct, comision: m * (pct / 100) + (cfg?.comisionProductosMonto || 0), ingresoLocal: m };
}

/**
 * Agrega comisiones de un conjunto de citas y ventas, por barbero.
 * Es lo que necesita la caja del día. NO incluye adelantos, ajustes ni sueldo
 * base: eso es del período mensual y vive en Comisiones.jsx.
 *
 * `resolverBarberoId` mapea una cita/venta a un barbero cargado; se inyecta
 * porque la regla de match (por id, por nombre) la decide quien llama.
 */
export function agregarComisiones({ barberos, citas = [], ventas = [], precioServicio, precioVenta }) {
  const cfgs = new Map();
  const bucket = (b) => {
    const cfg = configBarbero(b);
    if (!cfgs.has(cfg.id)) {
      cfgs.set(cfg.id, {
        ...cfg,
        citas: 0, ventas: 0,
        ingresosServicios: 0, ingresosProductos: 0,
        comisionServicios: 0, comisionProductos: 0,
        arriendoTotal: 0, arriendoCount: 0,
        propinas: 0, propinasCount: 0,
      });
    }
    return cfgs.get(cfg.id);
  };
  barberos.forEach(bucket);

  const resolver = (id, nombre) => {
    if (id && cfgs.has(id)) return cfgs.get(id);
    const found = barberos.find(b => b.id === id || b.nombre === nombre);
    if (found) return bucket(found);
    return bucket(null);
  };

  for (const c of citas) {
    const b = resolver(c.barberoId, c.barbero);
    const precio = precioServicio ? precioServicio(c) : (Number(c.precio) || 0);
    const r = comisionCita({ cfg: b, precio, servicioId: c.servicioId, clienteNombre: c.clienteNombre });
    b.citas++;
    b.ingresosServicios += r.ingresoLocal;
    b.comisionServicios += r.comision;
    if (r.cp) { b.arriendoTotal += r.arriendo; b.arriendoCount++; }
    const propina = Number(c.propina) || 0;
    if (propina > 0) { b.propinas += propina; b.propinasCount++; }
  }

  for (const v of ventas) {
    const b = resolver(v.barberoId, v.barberoNombre);
    const monto = precioVenta ? precioVenta(v) : (Number(v.precio) || 0);
    const r = comisionVenta({ cfg: b, monto, productId: v.productId });
    b.ventas++;
    b.ingresosProductos += r.ingresoLocal;
    b.comisionProductos += r.comision;
  }

  return [...cfgs.values()].map(b => ({
    ...b,
    ingresos: b.ingresosServicios + b.ingresosProductos,
    montoComision: b.comisionServicios + b.comisionProductos,
  }));
}
