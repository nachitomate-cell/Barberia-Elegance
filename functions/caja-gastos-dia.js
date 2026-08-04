'use strict';

// functions/caja-gastos-dia.js
// ─────────────────────────────────────────────────────────────────
//  GASTOS DEL DÍA PARA LA CAJA — callable `cajaGastosDelDia`
//
//  Recepción opera la caja pero NO puede leer /gastos: la regla es
//  `esAdmin(tid)` y con razón — las liquidaciones de los barberos son
//  documentos de `gastos` (`tipo == 'liquidacion'`), así que abrir esa
//  colección le mostraría cuánto gana cada profesional, que es justo la
//  línea sobre la que está construido el rol.
//
//  Pero el arqueo NECESITA los gastos: un gasto pagado en efectivo sale del
//  cajón y el saldo esperado no cuadra sin él. Sin esto, la caja le mostraba
//  a recepción el aviso "no pudimos cargar los gastos de hoy — no cierres la
//  caja con estos números" (kronnos Peñablanca, 04-08).
//
//  Solución: el servidor lee (el Admin SDK se salta las reglas) y devuelve la
//  MISMA forma de documento que leería un admin, con una diferencia: todas las
//  liquidaciones se funden en UNA sola fila anónima ("Pagos al equipo"). El
//  arqueo cuadra al peso y no se ve ni un nombre ni un monto individual.
//
//  Devolver la misma forma es a propósito: el cliente reusa `montosPorMetodo`,
//  `matchSucursal` y el armado de transacciones sin una sola rama nueva.
//
//  DEPLOY:
//    firebase deploy --only functions:cajaGastosDelDia
// ─────────────────────────────────────────────────────────────────

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger }             = require('firebase-functions');
const admin                  = require('firebase-admin');

const db = admin.firestore();

const BOOTSTRAP = ['ignaciiio.mate@gmail.com'];
const KRONNOS_SEDES = ['kronnos_penablanca', 'kronnos_limache', 'kronnos_woman'];
const KRONNOS_BRAND = ['administracionkronnos@gmail.com', 'claudio.burgos91@gmail.com', 'grupo.kratos.spa@gmail.com'];
const ROLES_CAJA = ['admin', 'jefe', 'recepcion'];

const gastosCol = (tid) => (tid === 'elegance' ? db.collection('gastos') : db.collection(`tenants/${tid}/gastos`));

/** Mismo criterio que `esStaff` de firestore.rules, acotado a quien opera caja. */
function puedeOperarCaja(claims, email, tenantId) {
  if (BOOTSTRAP.includes(email)) return true;
  if (KRONNOS_BRAND.includes(email) && (tenantId === 'kronnos' || KRONNOS_SEDES.includes(tenantId))) return true;
  const rol = String(claims.role || claims.rol || '');
  if (!ROLES_CAJA.includes(rol)) return false;
  if (claims.tenantId === tenantId) return true;
  // Kronnos: el claim es la sede y se opera esa misma sede.
  if (KRONNOS_SEDES.includes(String(claims.tenantId)) && claims.tenantId === tenantId) return true;
  return false;
}

exports.cajaGastosDelDia = onCall({ cors: true }, async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Sesión requerida.');

  const tenantId = String(req.data?.tenantId || '').trim();
  if (!/^[a-z0-9_-]{3,40}$/.test(tenantId)) throw new HttpsError('invalid-argument', 'tenantId inválido.');

  const desdeMs = Number(req.data?.desdeMs);
  const hastaMs = Number(req.data?.hastaMs);
  if (!Number.isFinite(desdeMs) || !Number.isFinite(hastaMs) || hastaMs <= desdeMs) {
    throw new HttpsError('invalid-argument', 'Rango de fechas inválido.');
  }
  // Tope de 45 días: esto alimenta el arqueo de UN turno, no es un exportador
  // de la contabilidad del año.
  if (hastaMs - desdeMs > 45 * 24 * 3600 * 1000) {
    throw new HttpsError('invalid-argument', 'Rango demasiado amplio.');
  }

  const claims = req.auth.token || {};
  const email  = String(claims.email || '').toLowerCase();
  if (!puedeOperarCaja(claims, email, tenantId)) {
    throw new HttpsError('permission-denied', 'No tienes acceso a la caja de este local.');
  }

  try {
    const snap = await gastosCol(tenantId)
      .where('fecha', '>=', admin.firestore.Timestamp.fromMillis(desdeMs))
      .where('fecha', '<',  admin.firestore.Timestamp.fromMillis(hastaMs))
      .get();

    const normales = [];
    const liquidaciones = [];
    snap.forEach(d => {
      const g = { id: d.id, ...d.data() };
      (g.tipo === 'liquidacion' ? liquidaciones : normales).push(g);
    });

    // Las liquidaciones se funden en una sola fila. Se conserva el desglose por
    // MÉTODO (no por persona) porque el arqueo lo necesita: una liquidación
    // mitad efectivo / mitad transferencia solo descuenta del cajón su parte
    // en efectivo. Se agrupa por sucursal para no romper el filtro por sede.
    const porSede = new Map();
    for (const g of liquidaciones) {
      const sede = g.sucursalId || '';
      if (!porSede.has(sede)) porSede.set(sede, { efectivo: 0, tarjeta: 0, transf: 0, n: 0, sucursalNombre: g.sucursalNombre || '' });
      const acc = porSede.get(sede);
      acc.n++;
      const pagos = Array.isArray(g.pagos) ? g.pagos : null;
      if (pagos && pagos.length) {
        for (const p of pagos) {
          const m = Number(p.monto) || 0;
          if (p.tipo === 'Efectivo')            acc.efectivo += m;
          else if (p.tipo === 'Transferencia')  acc.transf   += m;
          else                                  acc.tarjeta  += m;
        }
      } else {
        const m = Number(g.monto) || 0;
        if (g.metodoPago === 'Efectivo')            acc.efectivo += m;
        else if (g.metodoPago === 'Transferencia')  acc.transf   += m;
        else if (g.metodoPago)                      acc.tarjeta  += m;
        else                                        acc.efectivo += m;  // sin método = salió del cajón
      }
    }

    const sinteticos = [];
    for (const [sede, a] of porSede) {
      const pagos = [
        ...(a.efectivo ? [{ tipo: 'Efectivo',      monto: a.efectivo }] : []),
        ...(a.tarjeta  ? [{ tipo: 'Tarjeta',       monto: a.tarjeta  }] : []),
        ...(a.transf   ? [{ tipo: 'Transferencia', monto: a.transf   }] : []),
      ];
      sinteticos.push({
        id: `__liquidaciones__${sede || 'sin-sede'}`,
        descripcion: a.n === 1 ? 'Pago al equipo' : `Pagos al equipo (${a.n})`,
        categoria: 'Sueldos',
        monto: a.efectivo + a.tarjeta + a.transf,
        metodoPago: pagos.length > 1 ? 'Mixto' : (pagos[0]?.tipo || 'Efectivo'),
        ...(pagos.length > 1 ? { pagos } : {}),
        ...(sede ? { sucursalId: sede, sucursalNombre: a.sucursalNombre } : {}),
        agregado: true,   // el panel lo pinta sin botón de detalle
      });
    }

    return { ok: true, gastos: [...normales, ...sinteticos], nLiquidaciones: liquidaciones.length };
  } catch (e) {
    logger.error(`[cajaGastos] ${tenantId}:`, e.message);
    throw new HttpsError('internal', 'No se pudieron leer los gastos.');
  }
});
