import { useState, useMemo, useEffect, useCallback } from 'react';
import { getDocs } from 'firebase/firestore';
import {
  Layers, ShoppingBag, Tag, TrendingUp, Percent, AlertTriangle, RefreshCcw,
} from 'lucide-react';
import { tenantCol } from '../lib/tenantUtils';
import HelpModal, { HelpButton } from '../components/ui/HelpModal';

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
  const [fetching, setFetching] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const fetchData = useCallback(async () => {
    setFetching(true);
    try {
      const snap = await getDocs(tenantCol('productos'));
      setProductos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
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
            <p className="font-semibold text-emerald-400 mb-1">Ranking de productos</p>
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
