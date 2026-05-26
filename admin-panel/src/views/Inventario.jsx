import { useState, useMemo, useEffect, useCallback } from 'react';
import { getDocs, query, where } from 'firebase/firestore';
import {
  Layers, ShoppingBag, Tag, TrendingUp, Percent, AlertTriangle, RefreshCcw, Flame,
} from 'lucide-react';
import { tenantCol } from '../lib/tenantUtils';
import HelpModal, { HelpButton } from '../components/ui/HelpModal';

// Ventana de ventas usada para ranking de "más vendidos" y rotación de stock.
const SALES_WINDOW_DAYS = 30;

const KPI_COLORS = {
  emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/10',
  amber:   'bg-amber-500/10   text-amber-400   border-amber-500/10',
  cyan:    'bg-cyan-500/10    text-cyan-400    border-cyan-500/10',
  purple:  'bg-purple-500/10  text-purple-400  border-purple-500/10',
};

function KpiCard({ Icon, label, value, sub, color = 'emerald' }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-start gap-4 hover:border-slate-700 transition-all">
      <div className={`p-2.5 rounded-lg shrink-0 ${KPI_COLORS[color]} border`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-white mt-0.5 truncate">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5 truncate">{sub}</p>}
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
      const pSnap = await getDocs(tenantCol('productos'));
      setProductos(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // Ventas en ventana: status 'delivered' creadas en los últimos N días.
      // Sin orderBy/limit para evitar índices compuestos; filtramos en cliente.
      const cutoff = new Date(Date.now() - SALES_WINDOW_DAYS * 864e5);
      const vSnap = await getDocs(query(tenantCol('product_reservations'), where('status', '==', 'delivered')));
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
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
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
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:border-slate-700 disabled:opacity-40 transition-all self-start sm:self-center"
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
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Flame size={16} className="text-rose-400" />
            <div>
              <p className="text-sm font-semibold text-white">Más vendidos · últimos {SALES_WINDOW_DAYS} días</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Velocidad de rotación y proyección de días hasta agotarse.
              </p>
            </div>
          </div>
          {ventasStats.totalUnidades > 0 && (
            <div className="text-right">
              <p className="text-xs text-slate-500">Total</p>
              <p className="text-sm font-bold text-white">{ventasStats.totalUnidades} u · ${Math.round(ventasStats.totalIngresos).toLocaleString('es-CL')}</p>
            </div>
          )}
        </div>
        {ventasStats.filas.length === 0 ? (
          <p className="text-xs text-slate-500 italic text-center py-8">
            Sin ventas registradas en los últimos {SALES_WINDOW_DAYS} días.
          </p>
        ) : (
          <div className="space-y-1.5">
            {ventasStats.filas.slice(0, 10).map((r, i) => {
              const sinStock   = r.stockActual === 0;
              const rotacionCls =
                r.diasParaAgotar === null ? 'text-slate-600' :
                r.diasParaAgotar <= 7     ? 'text-rose-400'   :
                r.diasParaAgotar <= 21    ? 'text-amber-400'  :
                                            'text-emerald-400';
              return (
                <div key={r.productId} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/3 transition-colors">
                  <span className="w-6 text-xs font-bold text-slate-500 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{r.nombre}</p>
                    <p className="text-[11px] text-slate-500">
                      {r.unidades} vendido{r.unidades !== 1 ? 's' : ''} · ${Math.round(r.ingresos).toLocaleString('es-CL')}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {sinStock ? (
                      <p className="text-[11px] font-bold text-rose-400 flex items-center gap-1">
                        <AlertTriangle size={11} /> Sin stock
                      </p>
                    ) : r.diasParaAgotar === null ? (
                      <p className="text-[11px] text-slate-600">—</p>
                    ) : (
                      <>
                        <p className={`text-[11px] font-bold ${rotacionCls}`}>{r.diasParaAgotar}d hasta agotar</p>
                        <p className="text-[10px] text-slate-600">{r.stockActual} en stock</p>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            {ventasStats.filas.length > 10 && (
              <p className="text-[11px] text-slate-600 text-center pt-2">
                +{ventasStats.filas.length - 10} productos más vendidos. Top 10 mostrados.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
          <Layers size={16} className="text-slate-400" />
          <div>
            <p className="text-sm font-semibold text-white">Análisis de Rentabilidad por Producto</p>
            <p className="text-xs text-slate-500 mt-0.5">Ordenados de mayor a menor margen bruto absoluto de ganancia unitaria</p>
          </div>
        </div>
        {inventoryStats.items.length === 0 ? (
          <p className="text-xs text-slate-650 italic text-center py-10">Sin productos guardados en inventario</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-550 uppercase tracking-wide font-bold">
                  <th className="py-2.5">Producto</th>
                  <th className="py-2.5 text-center">Stock</th>
                  <th className="py-2.5 text-right">Precio Costo</th>
                  <th className="py-2.5 text-right">Precio Venta</th>
                  <th className="py-2.5 text-right">Margen Neto ($)</th>
                  <th className="py-2.5 text-right">Margen Neto (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {inventoryStats.items.map(p => {
                  const isLowStock = p.stock <= (p.stockMinimo || 0);
                  const isMissingCost = p.costo === 0;
                  return (
                    <tr key={p.id} className="hover:bg-slate-800/10 text-slate-350 transition-colors">
                      <td className="py-3 pr-3 font-medium text-white">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
                          <span className="truncate max-w-[240px]">{p.nombre}</span>
                          <div className="flex flex-wrap items-center gap-1">
                            {isLowStock && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[9px] font-bold border border-amber-500/10">
                                <AlertTriangle size={8} /> Stock Crítico
                              </span>
                            )}
                            {isMissingCost && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-450 text-[9px] font-semibold border border-rose-500/10">
                                Sin Costo Cargado
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className={`py-3 text-center font-bold ${isLowStock ? 'text-amber-500' : 'text-slate-300'}`}>
                        {p.stock}
                      </td>
                      <td className={`py-3 text-right ${isMissingCost ? 'text-slate-600 italic' : 'text-slate-350'}`}>
                        {isMissingCost ? '$0' : fmtCLP(p.costo)}
                      </td>
                      <td className="py-3 text-right text-white font-medium">{fmtCLP(p.precio)}</td>
                      <td className={`py-3 text-right font-bold ${p.margenAbs > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {fmtCLP(p.margenAbs)}
                      </td>
                      <td className="py-3 text-right">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.margenPct >= 50 ? 'bg-emerald-500/10 text-emerald-400' : p.margenPct >= 20 ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-800 text-slate-400'
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
          <p>Esta vista te dice <strong className="text-white">qué tan rentable es tu stock de productos</strong>. No es para editar precios ni cargar productos (eso es en <em>/productos</em>), sino para tomar decisiones de compra y precio.</p>

          <div>
            <p className="font-semibold text-emerald-400 mb-1">KPIs superiores</p>
            <ul className="list-disc ml-4 space-y-1">
              <li><strong className="text-white">Valor del stock</strong>: lo que vale tu inventario al precio de venta.</li>
              <li><strong className="text-white">Costo del stock</strong>: lo que pagaste por todo ese stock.</li>
              <li><strong className="text-white">Margen total</strong>: la ganancia potencial si vendieras TODO. Si es muy bajo, estás vendiendo demasiado barato.</li>
              <li><strong className="text-white">% margen promedio</strong>: salud financiera global. Saludable: 40–60% en productos de barbería.</li>
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
            <p>Ordenado por <strong className="text-white">margen unitario</strong> ($) y <strong className="text-white">% de margen</strong>. Los de arriba son los que más plata te dejan por unidad — promocionarlos primero.</p>
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
