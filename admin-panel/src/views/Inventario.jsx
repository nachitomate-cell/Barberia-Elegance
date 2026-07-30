import { useState, useMemo, useEffect, useCallback } from 'react';
import { getDocs, query, where } from 'firebase/firestore';
import {
  Layers, ShoppingBag, Tag, TrendingUp, Percent, AlertTriangle, RefreshCcw, Flame,
} from 'lucide-react';
import { tenantCol } from '../lib/tenantUtils';
import { withTimeout } from '../lib/firestore-helpers';
import HelpModal, { HelpButton } from '../components/ui/HelpModal';

// Ventana de ventas usada para ranking de "más vendidos" y rotación de stock.
const SALES_WINDOW_DAYS = 30;

const KPI_COLORS = {
  emerald: 'bg-emerald-400/10 text-emerald-300 ring-1 ring-inset ring-emerald-400/15',
  amber:   'bg-amber-400/10   text-amber-300   ring-1 ring-inset ring-amber-400/15',
  cyan:    'bg-cyan-400/10    text-cyan-300    ring-1 ring-inset ring-cyan-400/15',
  purple:  'bg-purple-400/10  text-purple-300  ring-1 ring-inset ring-purple-400/15',
};

function KpiCard({ Icon, label, value, sub, color = 'emerald' }) {
  return (
    <div className="group bg-slate-900 border border-white/[0.05] rounded-2xl p-5 flex items-start gap-4 hover:bg-white/[0.02] hover:border-white/[0.08] transition-all duration-200 ease-in-out">
      <div className={`p-2.5 rounded-xl shrink-0 ${KPI_COLORS[color]}`}>
        <Icon size={20} strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-slate-400 uppercase tracking-[0.08em]">{label}</p>
        <p className="text-2xl font-semibold text-primary mt-1 tracking-tight tabular-nums truncate">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-1 truncate">{sub}</p>}
      </div>
    </div>
  );
}

const fmtCLP = v => `$${Math.round(v || 0).toLocaleString('es-CL')}`;

export default function Inventario() {
  const [productos, setProductos] = useState([]);
  const [ventas,    setVentas]    = useState([]); // product_reservations entregadas en la ventana
  const [fetching,  setFetching]  = useState(false);
  const [showHelp,  setShowHelp]  = useState(false);

  const fetchData = useCallback(async () => {
    setFetching(true);
    try {
      // Productos
      const pSnap = await withTimeout(getDocs(tenantCol('productos')), 15000, 'inventario/productos');
      setProductos(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // Ventas en ventana: status 'delivered' creadas en los últimos N días.
      // Sin orderBy/limit para evitar índices compuestos; filtramos en cliente.
      const cutoff = new Date(Date.now() - SALES_WINDOW_DAYS * 864e5);
      const vSnap = await withTimeout(
        getDocs(query(tenantCol('product_reservations'), where('status', '==', 'delivered'))),
        20000, 'inventario/ventas'
      );
      const docs = vSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setVentas(docs.filter(v => {
        const ts = v.createdAt?.toDate?.() || (v.fecha ? new Date(v.fecha) : null);
        return ts && ts >= cutoff;
      }));
    } catch (e) {
      console.error('Inventario fetchData:', e);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const inventoryStats = useMemo(() => {
    let totalValorVenta = 0;
    let totalValorCosto = 0;

    const items = productos.map(p => {
      const stock = Number(p.stock) || 0;
      const precio = Number(p.precio) || 0;
      const costo = Number(p.precioCosto) || 0;

      totalValorVenta += precio * stock;
      totalValorCosto += costo * stock;

      const margenAbs = precio - costo;
      const margenPct = precio > 0 ? (margenAbs / precio) * 100 : 0;

      return { ...p, stock, precio, costo, margenAbs, margenPct };
    }).sort((a, b) => b.margenAbs - a.margenAbs);

    const margenPotencial = totalValorVenta - totalValorCosto;
    const margenPotencialPct = totalValorVenta > 0 ? (margenPotencial / totalValorVenta) * 100 : 0;

    return { items, totalValorVenta, totalValorCosto, margenPotencial, margenPotencialPct };
  }, [productos]);

  // Ranking de "Más vendidos" + rotación de stock en la ventana.
  const ventasStats = useMemo(() => {
    const agg = new Map(); // productId -> { unidades, ingresos }
    for (const v of ventas) {
      const pid = v.productId;
      if (!pid) continue;
      const cur = agg.get(pid) || { unidades: 0, ingresos: 0, nombre: v.productName || '—' };
      cur.unidades += Number(v.cantidad) || 0;
      cur.ingresos += Number(v.precio)   || 0; // ya viene como total de la linea
      cur.nombre    = v.productName || cur.nombre;
      agg.set(pid, cur);
    }

    const productosMap = new Map(productos.map(p => [p.id, p]));
    const filas = [...agg.entries()].map(([pid, v]) => {
      const p = productosMap.get(pid);
      const stockActual = Number(p?.stock) || 0;
      const diasParaAgotar = v.unidades > 0
        ? Math.round((stockActual / v.unidades) * SALES_WINDOW_DAYS)
        : null;
      return {
        productId:      pid,
        nombre:         v.nombre,
        unidades:       v.unidades,
        ingresos:       v.ingresos,
        stockActual,
        diasParaAgotar, // null = no se calcula (sin ventas), 0 = sin stock
      };
    }).sort((a, b) => b.unidades - a.unidades);

    const totalUnidades = filas.reduce((s, r) => s + r.unidades, 0);
    const totalIngresos = filas.reduce((s, r) => s + r.ingresos, 0);

    return { filas, totalUnidades, totalIngresos };
  }, [ventas, productos]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-primary flex items-center gap-2">
            <Layers className="text-emerald-500" size={20} />
            Rentabilidad de Inventario
            <HelpButton onClick={() => setShowHelp(true)} />
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Valoración del stock y ranking de margen unitario por producto.
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={fetching}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium border border-white/[0.06] bg-slate-900 text-slate-400 hover:bg-white/[0.04] hover:text-primary hover:border-white/[0.1] disabled:opacity-40 transition-all duration-200 ease-in-out self-start sm:self-center"
        >
          <RefreshCcw size={12} className={fetching ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard Icon={ShoppingBag} label="Valor del Stock a Venta"
          value={fmtCLP(inventoryStats.totalValorVenta)}
          sub="Precio Venta * Stock actual"
          color="emerald" />
        <KpiCard Icon={Tag} label="Valor del Stock a Costo"
          value={fmtCLP(inventoryStats.totalValorCosto)}
          sub="Precio Costo * Stock actual"
          color="amber" />
        <KpiCard Icon={TrendingUp} label="Margen Bruto Potencial"
          value={fmtCLP(inventoryStats.margenPotencial)}
          sub="Margen potencial absoluto"
          color="cyan" />
        <KpiCard Icon={Percent} label="Margen Proyectado Promedio"
          value={`${inventoryStats.margenPotencialPct.toFixed(1)}%`}
          sub="Porcentaje de retorno proyectado"
          color="purple" />
      </div>

      {/* Más vendidos + Rotación de stock */}
      <div className="bg-slate-900 border border-white/[0.05] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4 border-b border-white/[0.06] pb-4">
          <div className="flex items-center gap-2.5">
            <Flame size={16} className="text-rose-300" strokeWidth={1.75} />
            <div>
              <p className="text-sm font-semibold text-primary tracking-tight">Más vendidos · últimos {SALES_WINDOW_DAYS} días</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Velocidad de rotación y proyección de días hasta agotarse.
              </p>
            </div>
          </div>
          {ventasStats.totalUnidades > 0 && (
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.08em] text-slate-500 font-medium">Total</p>
              <p className="text-sm font-semibold text-primary tabular-nums mt-0.5">{ventasStats.totalUnidades} u · ${Math.round(ventasStats.totalIngresos).toLocaleString('es-CL')}</p>
            </div>
          )}
        </div>
        {ventasStats.filas.length === 0 ? (
          <p className="text-xs text-slate-400 italic text-center py-8">
            Sin ventas registradas en los últimos {SALES_WINDOW_DAYS} días.
          </p>
        ) : (
          <div className="space-y-1">
            {ventasStats.filas.slice(0, 10).map((r, i) => {
              const sinStock   = r.stockActual === 0;
              const rotacionCls =
                r.diasParaAgotar === null ? 'text-slate-500' :
                r.diasParaAgotar <= 7     ? 'text-rose-300'    :
                r.diasParaAgotar <= 21    ? 'text-amber-300'   :
                                            'text-emerald-300';
              return (
                <div key={r.productId} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/[0.03] transition-all duration-200 ease-in-out">
                  <span className="w-6 text-xs font-semibold text-slate-500 shrink-0 tabular-nums">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary truncate tracking-tight">{r.nombre}</p>
                    <p className="text-[11px] text-slate-400 tabular-nums">
                      {r.unidades} vendido{r.unidades !== 1 ? 's' : ''} · ${Math.round(r.ingresos).toLocaleString('es-CL')}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {sinStock ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-400/10 text-rose-300 text-[10px] font-semibold ring-1 ring-inset ring-rose-400/20">
                        <AlertTriangle size={10} /> Sin stock
                      </span>
                    ) : r.diasParaAgotar === null ? (
                      <p className="text-[11px] text-slate-500">—</p>
                    ) : (
                      <>
                        <p className={`text-[11px] font-semibold tabular-nums ${rotacionCls}`}>{r.diasParaAgotar}d hasta agotar</p>
                        <p className="text-[10px] text-slate-500 tabular-nums mt-0.5">{r.stockActual} en stock</p>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            {ventasStats.filas.length > 10 && (
              <p className="text-[11px] text-slate-500 text-center pt-3">
                +{ventasStats.filas.length - 10} productos más vendidos. Top 10 mostrados.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-slate-900 border border-white/[0.05] rounded-2xl p-5">
        <div className="flex items-center gap-2.5 mb-4 border-b border-white/[0.06] pb-4">
          <Layers size={16} className="text-slate-400" strokeWidth={1.75} />
          <div>
            <p className="text-sm font-semibold text-primary tracking-tight">Análisis de Rentabilidad por Producto</p>
            <p className="text-xs text-slate-400 mt-0.5">Ordenados de mayor a menor margen bruto absoluto de ganancia unitaria</p>
          </div>
        </div>
        {inventoryStats.items.length === 0 ? (
          <p className="text-xs text-slate-500 italic text-center py-10">Sin productos guardados en inventario</p>
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-slate-400 uppercase tracking-[0.08em] font-medium text-[10px]">
                  <th className="py-3 px-2 font-medium">Producto</th>
                  <th className="py-3 px-2 text-right font-medium">Stock</th>
                  <th className="py-3 px-2 text-right font-medium">Precio Costo</th>
                  <th className="py-3 px-2 text-right font-medium">Precio Venta</th>
                  <th className="py-3 px-2 text-right font-medium">Margen Neto ($)</th>
                  <th className="py-3 px-2 text-right font-medium">Margen Neto (%)</th>
                </tr>
              </thead>
              <tbody>
                {inventoryStats.items.map(p => {
                  const isLowStock = p.stock <= (p.stockMinimo || 0);
                  const isMissingCost = p.costo === 0;
                  return (
                    <tr key={p.id} className="border-t border-white/[0.06] text-slate-300 hover:bg-white/[0.02] transition-all duration-200 ease-in-out">
                      <td className="py-4 px-2 pr-3 font-medium text-primary">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <span className="truncate max-w-[240px] tracking-tight">{p.nombre}</span>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {isLowStock && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-300 text-[10px] font-medium ring-1 ring-inset ring-amber-400/20">
                                <AlertTriangle size={9} /> Stock crítico
                              </span>
                            )}
                            {isMissingCost && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-rose-400/10 text-rose-300 text-[10px] font-medium ring-1 ring-inset ring-rose-400/20">
                                Sin costo cargado
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className={`py-4 px-2 text-right font-semibold tabular-nums ${isLowStock ? 'text-amber-300' : 'text-slate-200'}`}>
                        {p.stock}
                      </td>
                      <td className={`py-4 px-2 text-right tabular-nums ${isMissingCost ? 'text-slate-500 italic' : 'text-slate-300'}`}>
                        {isMissingCost ? '—' : fmtCLP(p.costo)}
                      </td>
                      <td className="py-4 px-2 text-right text-primary font-medium tabular-nums">{fmtCLP(p.precio)}</td>
                      <td className={`py-4 px-2 text-right font-semibold tabular-nums ${p.margenAbs > 0 ? 'text-emerald-300' : 'text-slate-500'}`}>
                        {fmtCLP(p.margenAbs)}
                      </td>
                      <td className="py-4 px-2 text-right">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-semibold tabular-nums ring-1 ring-inset ${
                          p.margenPct >= 50
                            ? 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/20'
                            : p.margenPct >= 20
                              ? 'bg-sky-400/10 text-sky-300 ring-sky-400/20'
                              : 'bg-white/[0.04] text-slate-400 ring-white/[0.06]'
                        }`}>
                          {p.margenPct.toFixed(0)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de ayuda */}
      {showHelp && (
        <HelpModal title="Cómo leer este inventario" onClose={() => setShowHelp(false)}>
          <p>Esta vista te dice <strong className="text-primary">qué tan rentable es tu stock de productos</strong>. No es para editar precios ni cargar productos (eso es en <em>/productos</em>), sino para tomar decisiones de compra y precio.</p>

          <div>
            <p className="font-semibold text-emerald-400 mb-1">KPIs superiores</p>
            <ul className="list-disc ml-4 space-y-1">
              <li><strong className="text-primary">Valor del stock</strong>: lo que vale tu inventario al precio de venta.</li>
              <li><strong className="text-primary">Costo del stock</strong>: lo que pagaste por todo ese stock.</li>
              <li><strong className="text-primary">Margen total</strong>: la ganancia potencial si vendieras TODO. Si es muy bajo, estás vendiendo demasiado barato.</li>
              <li><strong className="text-primary">% margen promedio</strong>: salud financiera global. Saludable: 40–60% en productos de barbería.</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-emerald-400 mb-1">Más vendidos · últimos 30 días</p>
            <p>Ranking por unidades vendidas. La columna "Xd hasta agotar" proyecta cuántos días te dura el stock al ritmo actual:</p>
            <ul className="list-disc ml-4 space-y-0.5 text-xs">
              <li><span className="text-rose-400">≤ 7 días</span>: reponer urgente</li>
              <li><span className="text-amber-400">8-21 días</span>: planificar compra</li>
              <li><span className="text-emerald-400">&gt; 21 días</span>: stock saludable</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-emerald-400 mb-1">Ranking por rentabilidad</p>
            <p>Ordenado por <strong className="text-primary">margen unitario</strong> ($) y <strong className="text-primary">% de margen</strong>. Los de arriba son los que más plata te dejan por unidad — promocionarlos primero.</p>
          </div>

          <div>
            <p className="font-semibold text-emerald-400 mb-1">Alertas de stock</p>
            <p>Productos con stock ≤ 3 unidades se marcan en ámbar. Es momento de reponer antes de quedarte sin.</p>
          </div>

          <p className="text-xs text-amber-400 bg-amber-400/5 border border-amber-400/20 rounded-lg px-3 py-2">💡 Para que el margen aparezca, cada producto debe tener <strong>precio</strong> y <strong>costo</strong> cargados en /productos. Si ves "—" en margen, falta cargar el costo.</p>
        </HelpModal>
      )}
    </div>
  );
}
