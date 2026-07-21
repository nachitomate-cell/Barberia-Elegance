import { useState, useEffect, useMemo } from 'react';
import {
  Wallet, DollarSign, ArrowDownCircle, ArrowUpCircle,
  Clock, X, Plus, AlertTriangle, CheckCircle2, History,
  Banknote, CreditCard, ArrowRightLeft, TrendingUp, Lock,
  FileText, Printer, ListChecks, Undo2, Scissors, Gift,
} from 'lucide-react';
import {
  addDoc, updateDoc, doc, query, where, orderBy,
  onSnapshot, serverTimestamp, Timestamp, getDocs, getDoc, limit,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { tenantCol, tenantDoc } from '../lib/tenantUtils';
import { withTimeout } from '../lib/firestore-helpers';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';
import HelpModal, { HelpButton } from '../components/ui/HelpModal';

/* ── Helpers ──────────────────────────────────────────────── */
function todayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return { start: Timestamp.fromDate(start), end: Timestamp.fromDate(end) };
}

function fmtCurrency(n) {
  return '$' + Math.round(n || 0).toLocaleString('es-CL');
}

function fmtTime(ts) {
  if (!ts) return '--:--';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(ts) {
  if (!ts) return '--';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateTime(ts) {
  if (!ts) return '--';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }) + ' ' + d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

// YYYY-MM-DD en hora local — no usar toISOString().slice(0,10) porque saca fecha
// UTC y en Chile pasadas las ~20:00 CLT devuelve el día siguiente.
function todayYMD() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Débito y Crédito son los métodos vigentes en /agenda, /productos y /gastos.
// 'Tarjeta' sigue existiendo como legacy para citas antiguas.
const TARJETA_METODOS = new Set(['Tarjeta', 'Débito', 'Crédito']);
const isTarjeta = (m) => TARJETA_METODOS.has(m);

/* ── KPI Card ─────────────────────────────────────────────── */
function KpiCard({ icon: Icon, label, value, color = 'emerald', sub }) {
  const colors = {
    emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 text-emerald-400',
    amber:   'from-amber-500/20 to-amber-500/5 border-amber-500/30 text-amber-400',
    blue:    'from-blue-500/20 to-blue-500/5 border-blue-500/30 text-blue-400',
    rose:    'from-rose-500/20 to-rose-500/5 border-rose-500/30 text-rose-400',
    purple:  'from-purple-500/20 to-purple-500/5 border-purple-500/30 text-purple-400',
    cyan:    'from-cyan-500/20 to-cyan-500/5 border-cyan-500/30 text-cyan-400',
  };
  const c = colors[color] || colors.emerald;
  return (
    <div className={`bg-gradient-to-br ${c} border rounded-2xl p-4 backdrop-blur-sm`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} className="opacity-80" />
        <span className="text-[11px] font-bold uppercase tracking-wider opacity-70">{label}</span>
      </div>
      <p className="text-2xl font-black tracking-tight">{value}</p>
      {sub && <p className="text-[11px] mt-1 opacity-60">{sub}</p>}
    </div>
  );
}

/* ── Historial: fila con desglose del snapshot congelado al cierre ─ */
function HistorialSnapshotRow({ snapshot }) {
  if (!snapshot) return null;
  const chips = [
    { label: 'Efectivo', v: snapshot.ingresosEfectivo, color: 'text-emerald-400' },
    { label: 'Tarjeta',  v: snapshot.ingresosTarjeta,  color: 'text-purple-400' },
    { label: 'Transf.',  v: snapshot.ingresosTransf,   color: 'text-cyan-400'   },
    { label: 'Gastos',   v: snapshot.egresosEfectivo,  color: 'text-rose-400', prefix: '−' },
    { label: 'Propinas', v: snapshot.propinasTotal,    color: 'text-amber-400' },
  ].filter(c => (c.v ?? 0) > 0);
  if (chips.length === 0) return null;
  const nTx = (snapshot.totalCitas || 0) + (snapshot.totalVentas || 0);
  return (
    <div className="mt-2 pt-2 border-t border-slate-700/40 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
      {chips.map(c => (
        <span key={c.label} className="text-slate-500">
          {c.label}: <span className={`font-semibold tabular-nums ${c.color}`}>{c.prefix || ''}{fmtCurrency(c.v)}</span>
        </span>
      ))}
      {nTx > 0 && <span className="text-slate-500">· {nTx} transacciones</span>}
    </div>
  );
}

/* ── Mini Modal ───────────────────────────────────────────── */
function MiniModal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-primary">{title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-primary transition-colors"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ── Reporte para contador (mensual) ─────────────────────────── */
// Genera y abre un HTML imprimible con el resumen mensual del local listo
// para mandar al contador: ventas por método, gastos por categoría, IVA
// estimado y margen bruto. No persiste nada — solo lee y dibuja.

const VENTA_OK = new Set(['confirmed', 'completed', 'paid', 'delivered']);
const CAT_REPORTE = ['Insumos', 'Sueldos', 'Arriendo', 'Servicios Básicos', 'Equipamiento', 'Marketing', 'Otros'];
const METODOS_REPORTE = ['Efectivo', 'Débito', 'Crédito', 'Tarjeta', 'Transferencia', 'No especificado'];

function fechaToYMD(f) {
  if (!f) return '';
  if (typeof f === 'string') return f.slice(0, 10);
  if (f.toDate) {
    const d = f.toDate();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  return '';
}

function escapeHTML(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

async function fetchDatosMes(mesKey) {
  // mesKey = 'YYYY-MM'. Hacemos un único rango de string para citas (campo
  // 'fecha' YYYY-MM-DD) y de Timestamp para gastos.
  const [y, m] = mesKey.split('-').map(Number);
  const firstStr = `${mesKey}-01`;
  const lastDate = new Date(y, m, 0); // último día del mes
  const lastStr = `${mesKey}-${String(lastDate.getDate()).padStart(2, '0')}`;
  const firstTs = Timestamp.fromDate(new Date(y, m - 1, 1, 0, 0, 0));
  const endTs   = Timestamp.fromDate(new Date(y, m, 1, 0, 0, 0));

  const [citasSnap, ventasSnap, gastosSnap] = await Promise.all([
    withTimeout(getDocs(query(tenantCol('citas'), where('fecha', '>=', firstStr), where('fecha', '<=', lastStr))), 20000, 'reporte/citas'),
    withTimeout(getDocs(tenantCol('product_reservations')), 20000, 'reporte/ventas'),
    withTimeout(getDocs(query(tenantCol('gastos'), where('fecha', '>=', firstTs), where('fecha', '<', endTs))), 20000, 'reporte/gastos'),
  ]);

  const citas = citasSnap.docs.map(d => d.data()).filter(c => c.estado === 'Completada');
  const ventas = ventasSnap.docs.map(d => d.data()).filter(v => {
    if (!VENTA_OK.has(v.status)) return false;
    const ymd = fechaToYMD(v.fecha || v.creadoEn || v.createdAt);
    return ymd >= firstStr && ymd <= lastStr;
  });
  const gastos = gastosSnap.docs.map(d => d.data());

  return { citas, ventas, gastos, firstStr, lastStr };
}

function calcReporte({ citas, ventas, gastos }) {
  const normMet = (m) => {
    if (!m) return 'No especificado';
    if (METODOS_REPORTE.includes(m)) return m;
    return 'No especificado';
  };

  const ventasPorMetodo = Object.fromEntries(METODOS_REPORTE.map(m => [m, 0]));
  let ventasServicios = 0, ventasProductos = 0, propinasTotal = 0;

  citas.forEach(c => {
    const monto = Number(c.precio) || 0;
    ventasServicios += monto;
    propinasTotal   += Number(c.propina) || 0;
    ventasPorMetodo[normMet(c.metodoPago)] += monto;
  });
  ventas.forEach(v => {
    // `precio` ya es el TOTAL DE LÍNEA (precio_unitario × cantidad, con descuento)
    // — así lo escriben la venta rápida (Productos.jsx) y el ticket (agenda.html).
    // Multiplicar otra vez por cantidad duplicaba el monto en el arqueo/reporte.
    const monto = Number(v.precio) || Number(v.total) || 0;
    ventasProductos += monto;
    ventasPorMetodo[normMet(v.metodoPago)] += monto;
  });

  const totalVentas = ventasServicios + ventasProductos;

  const gastosPorCategoria = Object.fromEntries(CAT_REPORTE.map(c => [c, 0]));
  let totalGastos = 0, adelantos = 0, liquidaciones = 0;
  gastos.forEach(g => {
    const monto = Number(g.monto) || 0;
    const cat = CAT_REPORTE.includes(g.categoria) ? g.categoria : 'Otros';
    gastosPorCategoria[cat] += monto;
    totalGastos += monto;
    if (g.tipo === 'adelanto')    adelantos    += monto;
    if (g.tipo === 'liquidacion') liquidaciones += monto;
  });

  // IVA estimado (Chile, 19% sobre afecto). Asumimos ventas afectas: el
  // dueño puede ajustar manualmente en el contador. Lo dejamos informativo.
  const ivaDebitoEstimado = Math.round(totalVentas - totalVentas / 1.19);
  const ventasNeto        = Math.round(totalVentas / 1.19);
  const margenBruto       = totalVentas - totalGastos;

  return {
    ventasServicios, ventasProductos, totalVentas, propinasTotal,
    ventasPorMetodo, gastosPorCategoria, totalGastos,
    adelantos, liquidaciones,
    ivaDebitoEstimado, ventasNeto, margenBruto,
    nCitas: citas.length, nVentas: ventas.length, nGastos: gastos.length,
  };
}

function buildReporteHTML({ mesKey, tenantName, settings, r }) {
  const fmt = v => '$' + Math.round(v || 0).toLocaleString('es-CL');
  const [y, m] = mesKey.split('-');
  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const periodoLabel = `${meses[parseInt(m, 10) - 1]} ${y}`;
  const generadoEn = new Date().toLocaleString('es-CL');

  const rowMetodo = METODOS_REPORTE.map(m => `
    <tr><td>${escapeHTML(m)}</td><td class="num">${fmt(r.ventasPorMetodo[m])}</td></tr>
  `).join('');
  const rowCategoria = CAT_REPORTE.map(c => `
    <tr><td>${escapeHTML(c)}</td><td class="num">${fmt(r.gastosPorCategoria[c])}</td></tr>
  `).join('');

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>Reporte contable — ${escapeHTML(periodoLabel)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #1f2937; padding: 32px; max-width: 880px; margin: 0 auto; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2 { font-size: 14px; margin: 28px 0 10px; color: #111827; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em; }
  .meta { color: #6b7280; font-size: 12px; margin-bottom: 24px; }
  .meta strong { color: #111827; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { padding: 8px 10px; border-bottom: 1px solid #f3f4f6; text-align: left; }
  th { background: #f9fafb; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #4b5563; }
  .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  .resumen { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-top: 12px; }
  .resumen .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
  .resumen .row.total { border-top: 2px solid #111827; padding-top: 10px; margin-top: 6px; font-weight: bold; font-size: 15px; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 11px; }
  .info { font-size: 11px; color: #6b7280; font-style: italic; margin-top: 8px; }
  @media print {
    body { padding: 18px; }
    .noprint { display: none; }
  }
  .toolbar { background: #111827; color: #fff; padding: 12px 16px; border-radius: 8px; display: flex; gap: 10px; margin-bottom: 18px; }
  .toolbar button { background: #fff; color: #111827; border: 0; padding: 6px 14px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 13px; }
  .toolbar button:hover { background: #f3f4f6; }
</style></head>
<body>
  <div class="toolbar noprint">
    <button onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>
    <button onclick="window.close()">Cerrar</button>
  </div>

  <h1>${escapeHTML(tenantName || 'Local')}</h1>
  <div class="meta">
    Reporte contable mensual · <strong>${escapeHTML(periodoLabel)}</strong><br>
    ${settings?.direccion ? escapeHTML(settings.direccion) + '<br>' : ''}
    ${settings?.telefono  ? 'Tel: ' + escapeHTML(settings.telefono) + ' · ' : ''}
    Generado: ${escapeHTML(generadoEn)}
  </div>

  <div class="grid">
    <div>
      <h2>Ventas por método de pago</h2>
      <table>
        <thead><tr><th>Método</th><th class="num">Monto</th></tr></thead>
        <tbody>${rowMetodo}</tbody>
        <tfoot><tr><th>Total ventas brutas</th><th class="num">${fmt(r.totalVentas)}</th></tr></tfoot>
      </table>
      <p class="info">Servicios: ${fmt(r.ventasServicios)} (${r.nCitas} citas). Productos: ${fmt(r.ventasProductos)} (${r.nVentas} ventas).</p>
    </div>
    <div>
      <h2>Gastos por categoría</h2>
      <table>
        <thead><tr><th>Categoría</th><th class="num">Monto</th></tr></thead>
        <tbody>${rowCategoria}</tbody>
        <tfoot><tr><th>Total gastos</th><th class="num">${fmt(r.totalGastos)}</th></tr></tfoot>
      </table>
      <p class="info">Incluye adelantos a personal por ${fmt(r.adelantos)} y liquidaciones por ${fmt(r.liquidaciones)}.</p>
    </div>
  </div>

  <h2>Resumen contable estimado</h2>
  <div class="resumen">
    <div class="row"><span>Ventas brutas (con IVA)</span><span class="num">${fmt(r.totalVentas)}</span></div>
    <div class="row"><span>IVA débito fiscal estimado (19%)</span><span class="num">${fmt(r.ivaDebitoEstimado)}</span></div>
    <div class="row"><span>Ventas netas (sin IVA)</span><span class="num">${fmt(r.ventasNeto)}</span></div>
    <div class="row"><span>Total gastos del mes</span><span class="num">−${fmt(r.totalGastos)}</span></div>
    <div class="row total"><span>Margen bruto del período</span><span class="num">${fmt(r.margenBruto)}</span></div>
  </div>
  <p class="info">Cifras informativas para análisis previo. El cálculo definitivo de IVA crédito y débito depende de las boletas/facturas emitidas y recibidas que registre tu contador.</p>

  <h2>Propinas</h2>
  <p>Total de propinas registradas del período: <strong>${fmt(r.propinasTotal)}</strong>. Las propinas pertenecen al equipo y no son ingreso del local.</p>

  <div class="footer">
    Reporte generado por SynapTech · ${escapeHTML(periodoLabel)} · ${escapeHTML(generadoEn)}
  </div>
</body></html>`;
}

/* ── Corte X — HTML imprimible del arqueo intermedio ─────────── */
// Snapshot del momento para relevo de turno. NO cierra la sesión.
function buildCorteXHTML({ tenantName, kpis, cajero, efectivoContado, apertura, fechaApertura }) {
  const fmt = v => '$' + Math.round(v || 0).toLocaleString('es-CL');
  const generadoEn = new Date().toLocaleString('es-CL');
  const desdeStr = fechaApertura
    ? (fechaApertura.toDate ? fechaApertura.toDate() : new Date(fechaApertura)).toLocaleString('es-CL')
    : '—';
  const diff = efectivoContado != null && !isNaN(efectivoContado)
    ? efectivoContado - kpis.saldoEsperado
    : null;
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>Corte X — ${escapeHTML(tenantName || 'Local')}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #1f2937; padding: 24px; max-width: 520px; margin: 0 auto; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  h2 { font-size: 12px; margin: 20px 0 6px; color: #374151; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
  .meta { color: #6b7280; font-size: 11px; margin-bottom: 16px; line-height: 1.5; }
  .row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; font-variant-numeric: tabular-nums; }
  .row.total { border-top: 2px solid #111827; padding-top: 8px; margin-top: 6px; font-weight: bold; font-size: 15px; }
  .diff-ok  { color: #059669; font-weight: bold; }
  .diff-bad { color: #dc2626; font-weight: bold; }
  .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 10px; text-align: center; }
  .toolbar { background: #111827; color: #fff; padding: 10px 14px; border-radius: 6px; display: flex; gap: 8px; margin-bottom: 14px; }
  .toolbar button { background: #fff; color: #111827; border: 0; padding: 5px 12px; border-radius: 4px; font-weight: 600; cursor: pointer; font-size: 12px; }
  @media print { body { padding: 12px; } .noprint { display: none; } }
</style></head>
<body>
  <div class="toolbar noprint">
    <button onclick="window.print()">🖨️ Imprimir</button>
    <button onclick="window.close()">Cerrar</button>
  </div>
  <h1>${escapeHTML(tenantName || 'Local')} — Corte X</h1>
  <div class="meta">
    <strong>Arqueo intermedio</strong> (la caja sigue abierta)<br>
    Cajero: <strong>${escapeHTML(cajero || '—')}</strong><br>
    Sesión abierta: ${escapeHTML(desdeStr)}<br>
    Generado: ${escapeHTML(generadoEn)}
  </div>

  <h2>Movimientos del turno</h2>
  <div class="row"><span>Apertura</span><span>${fmt(apertura)}</span></div>
  <div class="row"><span>+ Servicios efectivo</span><span>${fmt(kpis.serviciosEfectivo)}</span></div>
  <div class="row"><span>+ Productos efectivo</span><span>${fmt(kpis.productosEfectivo)}</span></div>
  ${kpis.propinasEfectivo > 0 ? `<div class="row"><span>+ Propinas efectivo (equipo)</span><span>${fmt(kpis.propinasEfectivo)}</span></div>` : ''}
  ${kpis.ingManuales > 0 ? `<div class="row"><span>+ Ingresos manuales</span><span>${fmt(kpis.ingManuales)}</span></div>` : ''}
  <div class="row"><span>− Gastos efectivo</span><span>−${fmt(kpis.gastosEfectivo)}</span></div>
  ${kpis.egrManuales > 0 ? `<div class="row"><span>− Egresos manuales</span><span>−${fmt(kpis.egrManuales)}</span></div>` : ''}
  <div class="row total"><span>Saldo esperado en efectivo</span><span>${fmt(kpis.saldoEsperado)}</span></div>

  ${efectivoContado != null && !isNaN(efectivoContado) ? `
  <h2>Arqueo físico</h2>
  <div class="row"><span>Efectivo contado</span><span>${fmt(efectivoContado)}</span></div>
  <div class="row total"><span>Diferencia</span><span class="${diff >= 0 ? 'diff-ok' : 'diff-bad'}">${diff >= 0 ? '+' : ''}${fmt(diff)} ${diff >= 0 ? '(sobrante)' : '(faltante)'}</span></div>
  ` : ''}

  <h2>Otros métodos</h2>
  <div class="row"><span>Tarjeta</span><span>${fmt(kpis.totalIngresosTarjeta)}</span></div>
  <div class="row"><span>Transferencia</span><span>${fmt(kpis.totalIngresosTransf)}</span></div>
  <div class="row"><span>Propinas totales</span><span>${fmt(kpis.propinasTotal)}</span></div>

  <h2>Actividad</h2>
  <div class="row"><span>Servicios completados</span><span>${kpis.totalCitas}</span></div>
  <div class="row"><span>Productos vendidos</span><span>${kpis.totalVentas}</span></div>
  <div class="row"><span>Gastos registrados</span><span>${kpis.totalGastos}</span></div>

  <div class="footer">Corte X · No cierra la sesión · SynapTech</div>
</body></html>`;
}

function ReporteContadorModal({ tenantName, onClose }) {
  const ahora = new Date();
  const defaultKey = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;
  const [mesKey, setMesKey] = useState(defaultKey);
  const [generando, setGenerando] = useState(false);
  const [err, setErr] = useState('');

  const handleGenerar = async () => {
    setGenerando(true);
    setErr('');
    try {
      const [datos, settSnap] = await Promise.all([
        fetchDatosMes(mesKey),
        withTimeout(getDoc(tenantDoc('settings', 'general')), 10000, 'reporte/settings'),
      ]);
      const settings = settSnap.exists() ? settSnap.data() : {};
      const r = calcReporte(datos);
      const html = buildReporteHTML({ mesKey, tenantName, settings, r });

      // Abrir en nueva ventana. Si el popup está bloqueado, caemos a un blob.
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(html);
        win.document.close();
      } else {
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `reporte-contador-${mesKey}.html`;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      onClose();
    } catch (e) {
      console.error(e);
      setErr(e.message || 'No se pudo generar el reporte.');
    } finally {
      setGenerando(false);
    }
  };

  return (
    <MiniModal title="Reporte para contador" onClose={onClose}>
      <p className="text-xs text-slate-400 leading-relaxed">
        Genera un PDF imprimible con ventas por método de pago, gastos por categoría, IVA débito estimado (19%) y margen del mes. Pensado para mandar al contador.
      </p>
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Mes</label>
        <input type="month" value={mesKey} max={defaultKey}
          onChange={e => setMesKey(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-primary focus:outline-none focus:border-emerald-500"
        />
      </div>
      {err && (
        <div className="flex items-center gap-2 text-rose-400 text-xs bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">
          <AlertTriangle size={13} /> {err}
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={onClose}
          className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors">
          Cancelar
        </button>
        <button onClick={handleGenerar} disabled={generando}
          className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-primary text-sm font-bold transition-colors flex items-center justify-center gap-2">
          {generando ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Printer size={14} />}
          {generando ? 'Generando...' : 'Generar e imprimir'}
        </button>
      </div>
    </MiniModal>
  );
}

/* ── Conciliación bancaria (paste CSV → match contra ventas/gastos) ── */
//
// El parser tolera el formato más común de cartolas (banco/Mercado Pago):
// primera fila con encabezados, separador `,` o `;`, montos con miles en `.`
// y decimales en `,` o `.`. La fecha acepta YYYY-MM-DD, DD/MM/YYYY,
// DD-MM-YYYY. Los montos pueden traer signo o `$`/espacios — los limpiamos.

function detectSep(line) {
  // El separador más común en es-CL es `;` (porque la coma se usa como
  // decimal). Si la primera línea tiene más `,`, asumimos coma.
  const n = (line.match(/,/g) || []).length;
  const m = (line.match(/;/g) || []).length;
  return m >= n ? ';' : ',';
}

function parseFechaCartola(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  // YYYY-MM-DD
  let mm = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (mm) return `${mm[1]}-${mm[2]}-${mm[3]}`;
  // DD/MM/YYYY o DD-MM-YYYY
  mm = s.match(/^(\d{2})[/\-](\d{2})[/\-](\d{4})/);
  if (mm) return `${mm[3]}-${mm[2]}-${mm[1]}`;
  // DD/MM/YY (asumimos 20YY)
  mm = s.match(/^(\d{2})[/\-](\d{2})[/\-](\d{2})$/);
  if (mm) return `20${mm[3]}-${mm[2]}-${mm[1]}`;
  return null;
}

function parseMontoCartola(raw) {
  if (raw == null) return null;
  let s = String(raw).trim().replace(/[\s$]/g, '');
  if (!s) return null;
  const negative = s.startsWith('-') || /^\(.*\)$/.test(s);
  s = s.replace(/^[-(]/, '').replace(/\)$/, '');
  // Si hay coma y punto: el último es el decimal. es-CL usa `.` miles y `,` decimal.
  const lastComma = s.lastIndexOf(',');
  const lastDot   = s.lastIndexOf('.');
  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) { s = s.replace(/\./g, '').replace(',', '.'); }
    else                     { s = s.replace(/,/g, ''); }
  } else if (lastComma > -1) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else {
    // Solo `.` o nada — si hay un único `.` con 1-2 decimales, lo dejamos. Si
    // son separadores de miles (3 decimales), los quitamos.
    if (/\.\d{3}(\D|$)/.test(s)) s = s.replace(/\./g, '');
  }
  const n = parseFloat(s);
  if (!isFinite(n)) return null;
  return negative ? -n : n;
}

const normalize = (s) => String(s || '').toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '');

function parseCartola(texto) {
  const lines = texto.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return { error: 'Necesito al menos una fila de encabezado y una de datos.' };
  const sep = detectSep(lines[0]);
  const headers = lines[0].split(sep).map(h => normalize(h.replace(/^"|"$/g, '')));
  const idx = (...names) => {
    for (const n of names) {
      const i = headers.findIndex(h => h.includes(n));
      if (i >= 0) return i;
    }
    return -1;
  };
  const iFecha = idx('fecha');
  const iMonto = idx('monto', 'importe', 'valor', 'cargo', 'abono');
  const iDesc  = idx('descripcion', 'detalle', 'concepto', 'glosa', 'descrip');
  if (iFecha < 0 || iMonto < 0) {
    return { error: 'No encontré columnas Fecha y Monto en el encabezado. Revisa que la primera línea tenga títulos.' };
  }
  const movimientos = [];
  for (let li = 1; li < lines.length; li++) {
    const cols = lines[li].split(sep).map(c => c.replace(/^"|"$/g, ''));
    const fecha = parseFechaCartola(cols[iFecha]);
    const monto = parseMontoCartola(cols[iMonto]);
    if (!fecha || monto == null || monto === 0) continue;
    movimientos.push({
      fecha,
      monto,
      desc: iDesc >= 0 ? (cols[iDesc] || '') : '',
      raw: lines[li],
    });
  }
  return { movimientos, totalLineas: lines.length - 1 };
}

function fechasCerca(a, b, dias = 2) {
  const da = new Date(a + 'T12:00:00');
  const db_= new Date(b + 'T12:00:00');
  return Math.abs(da - db_) <= dias * 86_400_000;
}

function conciliar({ movimientos, ventas, gastos }) {
  // Cada movimiento del sistema se puede emparejar con UN solo movimiento de
  // la cartola — eso evita match doble cuando el banco trae líneas duplicadas.
  const sistemaUsado = new Set();
  const sistemaList = [
    ...ventas.map(v => ({ ...v, _kind: 'venta',  _signo:  1 })),
    ...gastos.map(g => ({ ...g, _kind: 'gasto',  _signo: -1 })),
  ];

  const conciliados   = [];
  const soloEnCartola = [];

  movimientos.forEach((m, idx) => {
    const expected = m.monto > 0 ? 1 : -1;
    const target = Math.abs(m.monto);
    const candidato = sistemaList.find(s => {
      if (sistemaUsado.has(s._kind + ':' + s._id)) return false;
      if (s._signo !== expected) return false;
      if (Math.abs(s._monto - target) > 1) return false; // tolerancia $1
      return fechasCerca(s._fecha, m.fecha);
    });
    if (candidato) {
      sistemaUsado.add(candidato._kind + ':' + candidato._id);
      conciliados.push({ mov: m, sistema: candidato });
    } else {
      soloEnCartola.push({ mov: m, idx });
    }
  });

  const soloEnSistema = sistemaList.filter(s => !sistemaUsado.has(s._kind + ':' + s._id));
  return { conciliados, soloEnCartola, soloEnSistema };
}

async function cargarMovimientosMes(mesKey) {
  const [y, m] = mesKey.split('-').map(Number);
  const firstStr = `${mesKey}-01`;
  const lastStr  = `${mesKey}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;
  const firstTs  = Timestamp.fromDate(new Date(y, m - 1, 1, 0, 0, 0));
  const endTs    = Timestamp.fromDate(new Date(y, m, 1, 0, 0, 0));

  const [citasSnap, ventasSnap, gastosSnap] = await Promise.all([
    withTimeout(getDocs(query(tenantCol('citas'), where('fecha', '>=', firstStr), where('fecha', '<=', lastStr))), 20000, 'conciliacion/citas'),
    withTimeout(getDocs(tenantCol('product_reservations')), 20000, 'conciliacion/ventas'),
    withTimeout(getDocs(query(tenantCol('gastos'), where('fecha', '>=', firstTs), where('fecha', '<', endTs))), 20000, 'conciliacion/gastos'),
  ]);

  const ventas = [];
  citasSnap.docs.forEach(d => {
    const c = d.data();
    if (c.estado !== 'Completada') return;
    const monto = Number(c.precio) || 0;
    if (monto > 0) ventas.push({
      _id: 'c:' + d.id, _fecha: c.fecha, _monto: monto,
      label: `${c.servicioNombre || c.servicio || 'Servicio'} · ${c.clienteNombre || 'Cliente'}`,
      metodo: c.metodoPago || '—',
    });
  });
  ventasSnap.docs.forEach(d => {
    const v = d.data();
    if (!['confirmed', 'completed', 'paid', 'delivered'].includes(v.status)) return;
    const f = fechaToYMD(v.fecha || v.creadoEn || v.createdAt);
    if (f < firstStr || f > lastStr) return;
    // `precio` ya es el total de línea (× cantidad ya aplicado) → no re-multiplicar.
    const monto = Number(v.precio) || Number(v.total) || 0;
    if (monto > 0) ventas.push({
      _id: 'p:' + d.id, _fecha: f, _monto: monto,
      label: `${v.productName || v.productoNombre || 'Producto'} ×${v.cantidad || 1}`,
      metodo: v.metodoPago || '—',
    });
  });

  const gastos = gastosSnap.docs.map(d => {
    const g = d.data();
    return {
      _id: 'g:' + d.id, _fecha: fechaToYMD(g.fecha), _monto: Number(g.monto) || 0,
      label: g.descripcion || 'Gasto',
      metodo: g.metodoPago || 'Efectivo',
    };
  }).filter(g => g._monto > 0 && g._fecha);

  return { ventas, gastos };
}

function ConciliacionModal({ onClose }) {
  const ahora = new Date();
  const defaultKey = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;
  const [mesKey, setMesKey] = useState(defaultKey);
  const [texto, setTexto] = useState('');
  const [resultado, setResultado] = useState(null);
  const [parseErr, setParseErr] = useState('');
  const [procesando, setProcesando] = useState(false);

  const handleConciliar = async () => {
    setParseErr('');
    const parsed = parseCartola(texto);
    if (parsed.error) { setParseErr(parsed.error); return; }
    if (!parsed.movimientos.length) {
      setParseErr('No encontré movimientos válidos. Revisa el formato.');
      return;
    }
    setProcesando(true);
    try {
      const { ventas, gastos } = await cargarMovimientosMes(mesKey);
      const res = conciliar({ movimientos: parsed.movimientos, ventas, gastos });
      setResultado({ ...res, totalCartola: parsed.movimientos.length });
    } catch (e) {
      setParseErr(e.message || 'Error cargando movimientos del sistema.');
    } finally {
      setProcesando(false);
    }
  };

  const handleReset = () => {
    setTexto(''); setResultado(null); setParseErr('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ListChecks size={16} className="text-cyan-400" />
            <h3 className="text-base font-bold text-primary">Conciliación bancaria</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-primary transition-colors"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4">
          {!resultado && (
            <>
              <p className="text-xs text-slate-400 leading-relaxed">
                Pega el contenido CSV de tu cartola bancaria o Mercado Pago. Detecta automáticamente las columnas Fecha y Monto, y compara contra las ventas + gastos registrados del mes seleccionado (tolerancia ±2 días, ±$1).
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Mes a conciliar</label>
                <input type="month" value={mesKey} max={defaultKey}
                  onChange={e => setMesKey(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-primary focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">CSV de movimientos</label>
                <textarea rows={8}
                  value={texto}
                  onChange={e => setTexto(e.target.value)}
                  placeholder={"Fecha;Descripción;Monto\n2026-06-12;Pago tarjeta;-25000\n2026-06-13;Transferencia Pedro;15990"}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-xs font-mono text-primary placeholder-slate-600 focus:outline-none focus:border-cyan-500 resize-none"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Acepta separador `,` o `;`. Montos negativos = gastos, positivos = ingresos. Fechas en YYYY-MM-DD o DD/MM/YYYY.
                </p>
              </div>
              {parseErr && (
                <div className="flex items-center gap-2 text-rose-400 text-xs bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">
                  <AlertTriangle size={13} /> {parseErr}
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors">
                  Cancelar
                </button>
                <button onClick={handleConciliar} disabled={procesando || !texto.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-primary text-sm font-bold transition-colors flex items-center justify-center gap-2">
                  {procesando ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <ListChecks size={14} />}
                  {procesando ? 'Conciliando…' : 'Conciliar'}
                </button>
              </div>
            </>
          )}

          {resultado && (
            <ResultadoConciliacion res={resultado} onReset={handleReset} />
          )}
        </div>
      </div>
    </div>
  );
}

function ResultadoConciliacion({ res, onReset }) {
  const f = v => '$' + Math.round(Math.abs(v)).toLocaleString('es-CL');
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-center">
          <p className="text-2xl font-black text-emerald-400 tabular-nums">{res.conciliados.length}</p>
          <p className="text-[10px] font-semibold text-emerald-400/80 uppercase tracking-wide">conciliados</p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-center">
          <p className="text-2xl font-black text-amber-400 tabular-nums">{res.soloEnCartola.length}</p>
          <p className="text-[10px] font-semibold text-amber-400/80 uppercase tracking-wide">solo cartola</p>
        </div>
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 text-center">
          <p className="text-2xl font-black text-orange-400 tabular-nums">{res.soloEnSistema.length}</p>
          <p className="text-[10px] font-semibold text-orange-400/80 uppercase tracking-wide">solo sistema</p>
        </div>
      </div>

      {res.soloEnCartola.length > 0 && (
        <div>
          <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">En la cartola pero no en tu sistema</p>
          <p className="text-[11px] text-slate-500 mb-2">Probablemente debes registrarlos en Gastos o son ventas que no quedaron como Completadas.</p>
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {res.soloEnCartola.map(({ mov, idx }) => (
              <div key={idx} className="flex items-center justify-between gap-2 bg-slate-800/60 rounded-lg px-3 py-2 text-xs">
                <div className="min-w-0">
                  <p className="text-slate-300 truncate">{mov.desc || '(sin descripción)'}</p>
                  <p className="text-slate-500">{mov.fecha}</p>
                </div>
                <span className={`font-bold tabular-nums whitespace-nowrap ${mov.monto < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {mov.monto < 0 ? '−' : '+'}{f(mov.monto)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {res.soloEnSistema.length > 0 && (
        <div>
          <p className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-2">En tu sistema pero no en la cartola</p>
          <p className="text-[11px] text-slate-500 mb-2">Pueden ser pagos en efectivo o movimientos que aún no aparecen en el banco.</p>
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {res.soloEnSistema.map(s => (
              <div key={s._kind + s._id} className="flex items-center justify-between gap-2 bg-slate-800/60 rounded-lg px-3 py-2 text-xs">
                <div className="min-w-0">
                  <p className="text-slate-300 truncate">{s.label}</p>
                  <p className="text-slate-500">{s._fecha} · {s.metodo}</p>
                </div>
                <span className={`font-bold tabular-nums whitespace-nowrap ${s._kind === 'gasto' ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {s._kind === 'gasto' ? '−' : '+'}{f(s._monto)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {res.conciliados.length > 0 && res.soloEnCartola.length === 0 && res.soloEnSistema.length === 0 && (
        <div className="flex items-center gap-2 text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 font-semibold">
          <CheckCircle2 size={16} /> Todo cuadra. La cartola coincide 1:1 con el sistema.
        </div>
      )}

      <button onClick={onReset}
        className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors">
        Conciliar otra cartola
      </button>
    </div>
  );
}

/* ── Arqueo por denominación (billetes + monedas CLP) ─────────── */
// Grilla para contar el efectivo billete a billete. El total se propaga
// al input libre del cierre para evitar errores de tipeo.
const DENOMINACIONES_CLP = [
  { valor: 20000, tipo: 'billete', label: '$20.000' },
  { valor: 10000, tipo: 'billete', label: '$10.000' },
  { valor:  5000, tipo: 'billete', label: '$5.000'  },
  { valor:  2000, tipo: 'billete', label: '$2.000'  },
  { valor:  1000, tipo: 'billete', label: '$1.000'  },
  { valor:   500, tipo: 'moneda',  label: '$500'    },
  { valor:   100, tipo: 'moneda',  label: '$100'    },
  { valor:    50, tipo: 'moneda',  label: '$50'     },
  { valor:    10, tipo: 'moneda',  label: '$10'     },
];

function ArqueoDenominaciones({ conteo, setConteo, total }) {
  const setQty = (valor, raw) => {
    const q = raw === '' ? '' : Math.max(0, parseInt(raw, 10) || 0);
    setConteo(prev => ({ ...prev, [valor]: q }));
  };
  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {DENOMINACIONES_CLP.map(d => {
          const q = conteo[d.valor] ?? '';
          const subtotal = (Number(q) || 0) * d.valor;
          return (
            <div key={d.valor} className="bg-slate-900/60 rounded-lg p-2">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">{d.label}</p>
              <div className="flex items-center gap-1 mt-1">
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  placeholder="0"
                  value={q}
                  onChange={e => setQty(d.valor, e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-sm text-primary text-center focus:outline-none focus:border-emerald-500"
                />
              </div>
              {subtotal > 0 && (
                <p className="text-[10px] text-emerald-400 tabular-nums text-right mt-1">{fmtCurrency(subtotal)}</p>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between px-1 pt-1 border-t border-slate-700/60">
        <span className="text-xs text-slate-400">Total contado</span>
        <span className="text-base font-black text-emerald-400 tabular-nums">{fmtCurrency(total)}</span>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════ */
/*  CAJA — Control de Caja                                     */
/* ════════════════════════════════════════════════════════════ */
export default function Caja() {
  const { user } = useAuth();
  const tenant = useTenant();
  const userEmail = user?.email || 'admin';
  const [showReporteContador, setShowReporteContador] = useState(false);
  const [showConciliacion,    setShowConciliacion]    = useState(false);

  /* ── State ──────────────────────────────────────────────── */
  const [sesionActiva, setSesionActiva] = useState(null);   // doc data + id
  const [loadingSesion, setLoadingSesion] = useState(true);
  const [montoApertura, setMontoApertura] = useState('');
  const [nombreApertura, setNombreApertura] = useState(() => {
    try { return localStorage.getItem('caja_nombre_default') || ''; } catch { return ''; }
  });
  const [abriendo, setAbriendo] = useState(false);

  // Cierre
  const [showCierre, setShowCierre] = useState(false);
  const [cierreEfectivo, setCierreEfectivo] = useState('');
  const [cierreObs, setCierreObs] = useState('');
  const [nombreCierre, setNombreCierre] = useState('');
  const [cerrando, setCerrando] = useState(false);
  const [usarDenominaciones, setUsarDenominaciones] = useState(false);
  const [conteoDenom, setConteoDenom] = useState({});
  const totalDenom = useMemo(
    () => DENOMINACIONES_CLP.reduce((s, d) => s + (Number(conteoDenom[d.valor]) || 0) * d.valor, 0),
    [conteoDenom],
  );
  // Cuando el modo denominación está activo, el input libre lo pisa el total.
  useEffect(() => {
    if (!usarDenominaciones) return;
    setCierreEfectivo(totalDenom > 0 ? String(totalDenom) : '');
  }, [usarDenominaciones, totalDenom]);

  // Manual adjustments
  const [showIngreso, setShowIngreso] = useState(false);
  const [showEgreso, setShowEgreso] = useState(false);
  const [adjDesc, setAdjDesc] = useState('');
  const [adjMonto, setAdjMonto] = useState('');
  const [adjSaving, setAdjSaving] = useState(false);
  // Revertir ajuste manual: { tipo: 'ingreso'|'egreso', id }
  const [revertirTarget, setRevertirTarget] = useState(null);
  const [motivoReverso, setMotivoReverso] = useState('');
  const [revirtiendo, setRevirtiendo] = useState(false);

  // Corte X — arqueo intermedio
  const [showCorteX, setShowCorteX] = useState(false);
  const [corteXCajero, setCorteXCajero] = useState('');
  const [corteXEfectivo, setCorteXEfectivo] = useState('');
  const [corteXSaving, setCorteXSaving] = useState(false);

  // Transactions from today
  const [citasHoy, setCitasHoy] = useState([]);
  const [ventasHoy, setVentasHoy] = useState([]);
  const [gastosHoy, setGastosHoy] = useState([]);
  const [servicios, setServicios] = useState([]);   // catálogo, para valorizar cortesías

  // Historical sessions
  const [historial, setHistorial] = useState([]);

  // Help modal
  const [showHelp, setShowHelp] = useState(false);

  /* ── Load active session ────────────────────────────────── */
  useEffect(() => {
    const q = query(tenantCol('caja_sesiones'), where('estado', '==', 'abierta'), limit(1));
    const unsub = onSnapshot(q, snap => {
      if (!snap.empty) {
        const d = snap.docs[0];
        setSesionActiva({ id: d.id, ...d.data() });
      } else {
        setSesionActiva(null);
      }
      setLoadingSesion(false);
    }, () => setLoadingSesion(false));
    return unsub;
  }, []);

  /* ── Load today's transactions ──────────────────────────── */
  useEffect(() => {
    if (!sesionActiva) return;
    const { start, end } = todayRange();
    const hoy = todayYMD();

    // Citas completadas hoy (fecha es string YYYY-MM-DD, comparación exacta)
    const qCitas = query(
      tenantCol('citas'),
      where('fecha', '==', hoy),
    );
    const unsub1 = onSnapshot(qCitas, snap => {
      setCitasHoy(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(c => c.estado === 'Completada'));
    }, () => {});

    // Productos vendidos hoy
    // Filtramos por updatedAt en el server: cubre ventas directas (creadas hoy
    // como delivered) y reservas antiguas que se entregan hoy. Antes traíamos
    // TODO el histórico de delivered y filtrábamos en cliente — inviable en
    // tenants grandes.
    const qVentas = query(
      tenantCol('product_reservations'),
      where('status', '==', 'delivered'),
      where('updatedAt', '>=', start),
      where('updatedAt', '<', end),
    );
    const unsub2 = onSnapshot(qVentas, snap => {
      setVentasHoy(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => {});

    // Gastos de hoy
    const qGastos = query(
      tenantCol('gastos'),
      where('fecha', '>=', start),
      where('fecha', '<', end),
    );
    const unsub3 = onSnapshot(qGastos, snap => {
      setGastosHoy(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => {});

    return () => { unsub1(); unsub2(); unsub3(); };
  }, [sesionActiva]);

  /* ── Catálogo de servicios (una vez) — para valorizar cortesías ── */
  useEffect(() => {
    withTimeout(getDocs(tenantCol('servicios')), 15000, 'caja/servicios')
      .then(snap => setServicios(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(() => {});
  }, []);

  /* ── Load historical sessions ───────────────────────────── */
  useEffect(() => {
    const q = query(tenantCol('caja_sesiones'), where('estado', '==', 'cerrada'), orderBy('fechaCierre', 'desc'), limit(20));
    const unsub = onSnapshot(q, snap => {
      setHistorial(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => {});
    return unsub;
  }, []);

  /* ── Computed KPIs ──────────────────────────────────────── */
  const kpis = useMemo(() => {
    const apertura = sesionActiva?.montoApertura || 0;

    // Servicios (citas completadas)
    const serviciosEfectivo = citasHoy.filter(c => c.metodoPago === 'Efectivo').reduce((s, c) => s + (Number(c.precio) || 0), 0);
    const serviciosTarjeta = citasHoy.filter(c => isTarjeta(c.metodoPago)).reduce((s, c) => s + (Number(c.precio) || 0), 0);
    const serviciosTransf = citasHoy.filter(c => c.metodoPago === 'Transferencia').reduce((s, c) => s + (Number(c.precio) || 0), 0);
    const serviciosNoEspecificado = citasHoy.filter(c => !c.metodoPago).reduce((s, c) => s + (Number(c.precio) || 0), 0);

    // Propinas
    // Total: incluye todas las citas (para métricas del día).
    // Efectivo: solo citas con método Efectivo — están físicamente en el cajón
    // y deben cuadrar contra el arqueo real. Las de tarjeta las cobra el POS.
    // Las citas sin método NO cuentan (consistente con serviciosNoEspecificado).
    const propinasTotal = citasHoy.reduce((s, c) => s + (Number(c.propina) || 0), 0);
    const propinasEfectivo = citasHoy
      .filter(c => c.metodoPago === 'Efectivo')
      .reduce((s, c) => s + (Number(c.propina) || 0), 0);

    // Productos vendidos. `precio` ya es el total de línea (× cantidad aplicado
    // por la venta rápida y el ticket) → sumar precio directo, sin re-multiplicar
    // (antes duplicaba y el arqueo mostraba faltantes falsos).
    const productosEfectivo = ventasHoy.filter(v => v.metodoPago === 'Efectivo').reduce((s, v) => s + (Number(v.precio) || 0), 0);
    const productosTarjeta = ventasHoy.filter(v => isTarjeta(v.metodoPago)).reduce((s, v) => s + (Number(v.precio) || 0), 0);
    const productosTransf = ventasHoy.filter(v => v.metodoPago === 'Transferencia').reduce((s, v) => s + (Number(v.precio) || 0), 0);

    // Gastos
    const gastosEfectivo = gastosHoy.filter(g => g.metodoPago === 'Efectivo').reduce((s, g) => s + (Number(g.monto) || 0), 0);
    const gastosTarjeta = gastosHoy.filter(g => isTarjeta(g.metodoPago)).reduce((s, g) => s + (Number(g.monto) || 0), 0);
    const gastosTransf = gastosHoy.filter(g => g.metodoPago === 'Transferencia').reduce((s, g) => s + (Number(g.monto) || 0), 0);

    // Manual adjustments — los revertidos quedan en el doc para audit trail
    // pero NO se suman ni al saldo esperado ni al desglose.
    const ingManuales = (sesionActiva?.ingresosManuales || [])
      .filter(i => !i.revertido)
      .reduce((s, i) => s + (Number(i.monto) || 0), 0);
    const egrManuales = (sesionActiva?.egresosManuales || [])
      .filter(i => !i.revertido)
      .reduce((s, i) => s + (Number(i.monto) || 0), 0);

    const totalIngresosEfectivo = serviciosEfectivo + productosEfectivo + ingManuales;
    const totalEgresosEfectivo = gastosEfectivo + egrManuales;
    // Las citas sin método NO se suman al saldo esperado — inflarían falsamente
    // el arqueo. Se muestran aparte como alerta para que el dueño las corrija en /agenda.
    // Las propinas efectivo SÍ se suman: están físicamente en el cajón hasta
    // que el dueño las separe para el equipo (ver aviso en el modal de cierre).
    const saldoEsperado = apertura + totalIngresosEfectivo + propinasEfectivo - totalEgresosEfectivo;
    const citasSinMetodo = citasHoy.filter(c => !c.metodoPago).length;

    const totalIngresosTarjeta = serviciosTarjeta + productosTarjeta;
    const totalIngresosTransf = serviciosTransf + productosTransf;
    const totalIngresosGeneral = totalIngresosEfectivo + totalIngresosTarjeta + totalIngresosTransf;

    // ── Métricas de claridad ─────────────────────────────────
    // Mapa de precios de catálogo (para valorizar las cortesías).
    const precioPorId = {}, precioPorNombre = {};
    servicios.forEach(s => {
      precioPorId[s.id] = Number(s.precio) || 0;
      if (s.nombre) precioPorNombre[String(s.nombre).toLowerCase().trim()] = Number(s.precio) || 0;
    });
    // Nº de transacciones EN EFECTIVO (el sub del card mostraba el total del día).
    const transEfectivo = citasHoy.filter(c => c.metodoPago === 'Efectivo').length
                        + ventasHoy.filter(v => v.metodoPago === 'Efectivo').length;
    // Cortesías: atenciones a $0 (flag cortesia o método "Cortesía"). No mueven
    // plata, pero es "lo que regalaste": valor = precio de catálogo del servicio.
    const cortesias = citasHoy.filter(c => c.cortesia === true || /cortes/i.test(c.metodoPago || ''));
    const valorCortesias = cortesias.reduce((s, c) => {
      const p = (c.servicioId && precioPorId[c.servicioId]) || precioPorNombre[String(c.servicioNombre || '').toLowerCase().trim()] || 0;
      return s + p;
    }, 0);
    // Ticket promedio de servicios COBRADOS (excluye cortesías $0 y sin método).
    const ventasServicios = serviciosEfectivo + serviciosTarjeta + serviciosTransf;
    const nServiciosCobrados = citasHoy.filter(c =>
      (c.metodoPago === 'Efectivo' || isTarjeta(c.metodoPago) || c.metodoPago === 'Transferencia') && (Number(c.precio) || 0) > 0
    ).length;
    const ticketPromedio = nServiciosCobrados > 0 ? Math.round(ventasServicios / nServiciosCobrados) : 0;
    // Lista de citas sin método (para la alerta accionable).
    const citasSinMetodoList = citasHoy.filter(c => !c.metodoPago);

    return {
      apertura,
      serviciosEfectivo, serviciosTarjeta, serviciosTransf, serviciosNoEspecificado,
      productosEfectivo, productosTarjeta, productosTransf,
      gastosEfectivo, gastosTarjeta, gastosTransf,
      ingManuales, egrManuales,
      totalIngresosEfectivo, totalEgresosEfectivo, saldoEsperado,
      totalIngresosTarjeta, totalIngresosTransf, totalIngresosGeneral,
      propinasTotal, propinasEfectivo,
      citasSinMetodo,
      totalCitas: citasHoy.length,
      totalVentas: ventasHoy.length,
      totalGastos: gastosHoy.length,
      transEfectivo, ticketPromedio, nServiciosCobrados,
      nCortesias: cortesias.length, valorCortesias,
      citasSinMetodoList,
    };
  }, [sesionActiva, citasHoy, ventasHoy, gastosHoy, servicios]);

  /* ── Detección de caja olvidada ─────────────────────────── */
  // Si la sesión se abrió antes de hoy 00:00 (hora local), es probable que
  // el cajero olvidó cerrarla. Los KPIs del día muestran datos MIXTOS
  // (todos los días desde la apertura) — banner rojo + fastpath a cerrar.
  const sesionOlvidada = useMemo(() => {
    if (!sesionActiva?.fechaApertura) return null;
    const apertura = sesionActiva.fechaApertura.toDate
      ? sesionActiva.fechaApertura.toDate()
      : new Date(sesionActiva.fechaApertura);
    const hoyStart = new Date();
    hoyStart.setHours(0, 0, 0, 0);
    if (apertura >= hoyStart) return null;
    const msDia = 86_400_000;
    const diasAtras = Math.floor((hoyStart - apertura) / msDia);
    return {
      apertura,
      diasAtras,
      fechaLabel: apertura.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }),
      horaLabel:  apertura.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
    };
  }, [sesionActiva]);

  /* ── Timeline ───────────────────────────────────────────── */
  const timeline = useMemo(() => {
    const items = [];
    citasHoy.forEach(c => {
      items.push({
        type: 'servicio',
        // Nombre REAL del servicio: antes usaba c.servicio (que viene vacío) y
        // caía al literal "Servicio". El nombre vive en c.servicioNombre.
        label: `${c.servicioNombre || c.servicio || 'Servicio'} — ${c.clienteNombre || 'Cliente'}`,
        sub: `✂️ ${c.barbero || 'Sin profesional'}`,   // el método se muestra como badge en el render
        monto: Number(c.precio) || 0,
        time: c.hora || '00:00',
        metodo: c.metodoPago || 'No especificado',
      });
    });
    ventasHoy.forEach(v => {
      items.push({
        type: 'producto',
        label: `${v.productName || v.productoNombre || 'Producto'} x${v.cantidad || 1}`,
        sub: 'Venta de producto',   // el método se muestra como badge en el render
        monto: Number(v.precio) || 0, // precio = total de línea; no re-multiplicar
        time: (() => {
          const ts = v.creadoEn || v.createdAt;
          if (!ts) return '00:00';
          const d = ts.toDate ? ts.toDate() : new Date(ts);
          return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        })(),
        metodo: v.metodoPago || 'No especificado',
      });
    });
    gastosHoy.forEach(g => {
      items.push({
        type: 'gasto',
        label: g.descripcion || 'Gasto',
        sub: `${g.categoria || 'Gasto'}`,   // el método se muestra como badge en el render
        monto: -(Number(g.monto) || 0),
        time: (() => {
          const ts = g.creadoEn || g.fecha;
          if (!ts) return '00:00';
          const d = ts.toDate ? ts.toDate() : new Date(ts);
          return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        })(),
        metodo: g.metodoPago || 'Efectivo',
      });
    });
    // Manual adjustments — incluimos los revertidos para que quede huella
    // visible en el timeline (tachados). El botón revertir se muestra solo
    // en los activos.
    const quienSub = (i) => {
      const persona = i.nombre || i.usuario;
      return persona ? ` · por ${persona}` : '';
    };
    (sesionActiva?.ingresosManuales || []).forEach(i => {
      items.push({
        type: 'ingreso_manual',
        label: i.descripcion || 'Ingreso manual',
        sub: `Ajuste manual · Efectivo${quienSub(i)}`,
        monto: Number(i.monto) || 0,
        time: i.hora ? fmtTime(i.hora) : '00:00',
        metodo: 'Efectivo',
        revertido: !!i.revertido,
        motivoReverso: i.motivoReverso || '',
        revertidoPor: i.revertidoPor || '',
        manualId: i.id || null,
        manualHoraSeconds: i.hora?.seconds || null,
        manualTipo: 'ingreso',
      });
    });
    (sesionActiva?.egresosManuales || []).forEach(i => {
      items.push({
        type: 'egreso_manual',
        label: i.descripcion || 'Egreso manual',
        sub: `Retiro manual · Efectivo${quienSub(i)}`,
        monto: -(Number(i.monto) || 0),
        time: i.hora ? fmtTime(i.hora) : '00:00',
        metodo: 'Efectivo',
        revertido: !!i.revertido,
        motivoReverso: i.motivoReverso || '',
        revertidoPor: i.revertidoPor || '',
        manualId: i.id || null,
        manualHoraSeconds: i.hora?.seconds || null,
        manualTipo: 'egreso',
      });
    });
    items.sort((a, b) => a.time.localeCompare(b.time));
    return items;
  }, [citasHoy, ventasHoy, gastosHoy, sesionActiva]);

  /* ── Handlers ───────────────────────────────────────────── */
  const handleAbrirCaja = async () => {
    const monto = parseFloat(montoApertura);
    if (isNaN(monto) || monto < 0) return;
    const nombre = nombreApertura.trim();
    setAbriendo(true);
    try {
      await addDoc(tenantCol('caja_sesiones'), {
        estado: 'abierta',
        fechaApertura: serverTimestamp(),
        montoApertura: monto,
        usuarioApertura: userEmail,
        nombreApertura: nombre,
        ingresosManuales: [],
        egresosManuales: [],
      });
      if (nombre) {
        try { localStorage.setItem('caja_nombre_default', nombre); } catch {}
      }
      setMontoApertura('');
    } finally { setAbriendo(false); }
  };

  const handleCerrarCaja = async () => {
    if (!sesionActiva) return;
    const efectivoReal = parseFloat(cierreEfectivo);
    if (isNaN(efectivoReal) || efectivoReal < 0) return;
    const nombre = nombreCierre.trim();
    setCerrando(true);
    try {
      const esperado = kpis.saldoEsperado;
      // Congelamos los KPIs del día en el doc para que el historial muestre
      // desglose real sin recalcular (métricas cambian con el tiempo).
      const snapshot = {
        apertura: kpis.apertura,
        ingresosEfectivo:  kpis.totalIngresosEfectivo,
        ingresosTarjeta:   kpis.totalIngresosTarjeta,
        ingresosTransf:    kpis.totalIngresosTransf,
        ingresosGeneral:   kpis.totalIngresosGeneral,
        egresosEfectivo:   kpis.totalEgresosEfectivo,
        propinasTotal:     kpis.propinasTotal,
        propinasEfectivo:  kpis.propinasEfectivo,
        serviciosEfectivo: kpis.serviciosEfectivo,
        serviciosTarjeta:  kpis.serviciosTarjeta,
        serviciosTransf:   kpis.serviciosTransf,
        serviciosNoEspecificado: kpis.serviciosNoEspecificado,
        productosEfectivo: kpis.productosEfectivo,
        productosTarjeta:  kpis.productosTarjeta,
        productosTransf:   kpis.productosTransf,
        gastosEfectivo:    kpis.gastosEfectivo,
        gastosTarjeta:     kpis.gastosTarjeta,
        gastosTransf:      kpis.gastosTransf,
        ingManuales:       kpis.ingManuales,
        egrManuales:       kpis.egrManuales,
        citasSinMetodo:    kpis.citasSinMetodo,
        totalCitas:        kpis.totalCitas,
        totalVentas:       kpis.totalVentas,
        totalGastos:       kpis.totalGastos,
      };
      // Si el usuario contó por denominación, guardamos el desglose para
      // auditoría posterior (útil para saber qué billetes faltaron/sobraron).
      const denominaciones = usarDenominaciones
        ? Object.fromEntries(
            DENOMINACIONES_CLP
              .map(d => [d.valor, Number(conteoDenom[d.valor]) || 0])
              .filter(([, q]) => q > 0),
          )
        : null;
      await updateDoc(doc(tenantCol('caja_sesiones'), sesionActiva.id), {
        estado: 'cerrada',
        fechaCierre: serverTimestamp(),
        montoCierreReal: efectivoReal,
        montoCierreEsperado: esperado,
        diferencia: efectivoReal - esperado,
        usuarioCierre: userEmail,
        nombreCierre: nombre,
        observaciones: cierreObs.trim(),
        snapshot,
        ...(denominaciones ? { denominaciones } : {}),
      });
      if (nombre) {
        try { localStorage.setItem('caja_nombre_default', nombre); } catch {}
      }
      setCierreEfectivo('');
      setCierreObs('');
      setNombreCierre('');
      setConteoDenom({});
      setUsarDenominaciones(false);
      setShowCierre(false);
    } finally { setCerrando(false); }
  };

  const handleAjuste = async (tipo) => {
    const monto = parseFloat(adjMonto);
    if (!adjDesc.trim() || isNaN(monto) || monto <= 0 || !sesionActiva) return;
    setAdjSaving(true);
    try {
      const field = tipo === 'ingreso' ? 'ingresosManuales' : 'egresosManuales';
      const current = sesionActiva[field] || [];
      // id: usamos ms + random para no chocar en el mismo ms si dos usuarios
      // ajustan a la vez. No es criptográfico, sirve para identificar el item.
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      await updateDoc(doc(tenantCol('caja_sesiones'), sesionActiva.id), {
        [field]: [...current, {
          id,
          descripcion: adjDesc.trim(),
          monto,
          hora: Timestamp.now(),
          usuario: userEmail,
          nombre: (nombreApertura || '').trim() || (sesionActiva.nombreApertura || ''),
        }],
      });
      setAdjDesc('');
      setAdjMonto('');
      setShowIngreso(false);
      setShowEgreso(false);
    } finally { setAdjSaving(false); }
  };

  const handleCorteX = async () => {
    if (!sesionActiva) return;
    setCorteXSaving(true);
    try {
      const efectivoContado = corteXEfectivo === '' ? null : parseFloat(corteXEfectivo);
      const cajero = corteXCajero.trim() || sesionActiva.nombreApertura || userEmail;

      // 1) Imprimible en nueva ventana
      const html = buildCorteXHTML({
        tenantName: tenant?.name,
        kpis,
        cajero,
        efectivoContado,
        apertura: kpis.apertura,
        fechaApertura: sesionActiva.fechaApertura,
      });
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(html);
        win.document.close();
      } else {
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `corte-x-${todayYMD()}.html`;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }

      // 2) Registro en el doc de sesión (audit trail — no modifica saldos)
      const cortes = sesionActiva.cortesX || [];
      const registro = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        hora: Timestamp.now(),
        cajero,
        usuario: userEmail,
        saldoEsperado: kpis.saldoEsperado,
        efectivoContado: efectivoContado != null && !isNaN(efectivoContado) ? efectivoContado : null,
        diferencia: efectivoContado != null && !isNaN(efectivoContado) ? efectivoContado - kpis.saldoEsperado : null,
      };
      await updateDoc(doc(tenantCol('caja_sesiones'), sesionActiva.id), {
        cortesX: [...cortes, registro],
      });

      setCorteXCajero('');
      setCorteXEfectivo('');
      setShowCorteX(false);
    } finally { setCorteXSaving(false); }
  };

  const handleRevertir = async () => {
    if (!revertirTarget || !sesionActiva) return;
    const motivo = motivoReverso.trim();
    if (!motivo) return;
    setRevirtiendo(true);
    try {
      const field = revertirTarget.tipo === 'ingreso' ? 'ingresosManuales' : 'egresosManuales';
      const current = sesionActiva[field] || [];
      const updated = current.map(item => {
        // Fallback: si el item no tiene id (registros viejos), matchear por hora.
        const matches = item.id
          ? item.id === revertirTarget.id
          : item.hora?.seconds === revertirTarget.horaSeconds;
        if (!matches) return item;
        return {
          ...item,
          revertido: true,
          motivoReverso: motivo,
          revertidoPor: userEmail,
          revertidoAt: Timestamp.now(),
        };
      });
      await updateDoc(doc(tenantCol('caja_sesiones'), sesionActiva.id), { [field]: updated });
      setRevertirTarget(null);
      setMotivoReverso('');
    } finally { setRevirtiendo(false); }
  };

  /* ── Render helpers ─────────────────────────────────────── */
  const field = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-primary placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors';
  const lbl = 'block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1';

  /* ── Loading ────────────────────────────────────────────── */
  if (loadingSesion) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════ */
  /*  PANTALLA DE APERTURA                                      */
  /* ═══════════════════════════════════════════════════════════ */
  if (!sesionActiva) {
    return (
      <div className="max-w-xl mx-auto pt-12 px-4">
        {/* Banner */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 mb-4">
            <Wallet size={36} className="text-emerald-400" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <h1 className="text-2xl font-black text-primary">Control de Caja</h1>
            <HelpButton onClick={() => setShowHelp(true)} />
          </div>
          <p className="text-slate-400 text-sm">Abre la caja para comenzar a registrar las transacciones del día.</p>
          <div className="flex flex-wrap gap-2 justify-center mt-4">
            <button onClick={() => setShowReporteContador(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/60 border border-slate-700 text-slate-300 hover:text-primary rounded-lg text-xs font-semibold transition-colors">
              <FileText size={13} /> Reporte para contador
            </button>
            <button onClick={() => setShowConciliacion(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/60 border border-slate-700 text-slate-300 hover:text-primary rounded-lg text-xs font-semibold transition-colors">
              <ListChecks size={13} /> Conciliar cartola
            </button>
          </div>
        </div>

        {/* Formulario de apertura */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 space-y-5">
          <div>
            <label className={lbl}>Efectivo de apertura ($)</label>
            <div className="relative">
              <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="number"
                className={`${field} pl-9`}
                placeholder="50000"
                min="0"
                value={montoApertura}
                onChange={e => setMontoApertura(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className={lbl}>¿Quién abre la caja?</label>
            <input
              className={field}
              placeholder="Nombre del cajero (ej: Camila)"
              value={nombreApertura}
              onChange={e => setNombreApertura(e.target.value)}
              autoComplete="off"
              maxLength={40}
            />
            <p className="text-[10px] text-slate-500 mt-1">Cuenta: {userEmail}</p>
          </div>
          <button
            onClick={handleAbrirCaja}
            disabled={abriendo || !montoApertura}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-primary font-bold text-sm transition-colors flex items-center justify-center gap-2"
          >
            {abriendo ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Lock size={16} />}
            {abriendo ? 'Abriendo...' : 'Abrir Caja'}
          </button>
        </div>

        {/* Historial de cierres */}
        {historial.length > 0 && (
          <div className="mt-10">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-4">
              <History size={14} /> Historial de Cierres
            </h2>
            <div className="space-y-2">
              {historial.map(h => {
                const diff = h.diferencia ?? 0;
                return (
                  <div key={h.id} className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-primary font-semibold">{fmtDateTime(h.fechaApertura)} → {fmtDateTime(h.fechaCierre)}</p>
                        <p className="text-xs text-slate-500">{h.nombreApertura || h.usuarioApertura || '-'} / {h.nombreCierre || h.usuarioCierre || '-'}</p>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-slate-400">Esperado: <span className="text-primary font-semibold">{fmtCurrency(h.montoCierreEsperado)}</span></span>
                        <span className="text-slate-400">Real: <span className="text-primary font-semibold">{fmtCurrency(h.montoCierreReal)}</span></span>
                        <span className={`font-bold ${diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {diff >= 0 ? '+' : ''}{fmtCurrency(diff)}
                        </span>
                      </div>
                    </div>
                    <HistorialSnapshotRow snapshot={h.snapshot} />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {showReporteContador && (
          <ReporteContadorModal tenantName={tenant?.name} onClose={() => setShowReporteContador(false)} />
        )}
        {showConciliacion && (
          <ConciliacionModal onClose={() => setShowConciliacion(false)} />
        )}
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════ */
  /*  CAJA ACTIVA — Panel principal                             */
  /* ═══════════════════════════════════════════════════════════ */
  const diferenciaCierre = parseFloat(cierreEfectivo) - kpis.saldoEsperado;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-primary flex items-center gap-2">
            <Wallet size={22} className="text-emerald-400" /> Caja Activa
            <HelpButton onClick={() => setShowHelp(true)} />
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Abierta por {sesionActiva.nombreApertura || sesionActiva.usuarioApertura || '-'} a las {fmtTime(sesionActiva.fechaApertura)} · Apertura: {fmtCurrency(kpis.apertura)}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowReporteContador(true)} className="flex items-center gap-1.5 px-3 py-2 bg-slate-800/60 border border-slate-700 text-slate-300 hover:text-primary rounded-xl text-xs font-bold transition-colors">
            <FileText size={14} /> Contador
          </button>
          <button onClick={() => setShowConciliacion(true)} className="flex items-center gap-1.5 px-3 py-2 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 rounded-xl text-xs font-bold transition-colors">
            <ListChecks size={14} /> Conciliar
          </button>
          <button onClick={() => setShowIngreso(true)} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold hover:bg-emerald-500/20 transition-colors">
            <ArrowDownCircle size={14} /> Ingreso
          </button>
          <button onClick={() => setShowEgreso(true)} className="flex items-center gap-1.5 px-3 py-2 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-xs font-bold hover:bg-rose-500/20 transition-colors">
            <ArrowUpCircle size={14} /> Egreso
          </button>
          <button onClick={() => setShowCorteX(true)} className="flex items-center gap-1.5 px-3 py-2 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 rounded-xl text-xs font-bold hover:bg-indigo-500/20 transition-colors">
            <Scissors size={14} /> Corte X
          </button>
          <button onClick={() => setShowCierre(true)} className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl text-xs font-bold hover:bg-amber-500/20 transition-colors">
            <Lock size={14} /> Cerrar Caja
          </button>
        </div>
      </div>

      {/* Alerta CRÍTICA: caja olvidada de un día anterior */}
      {sesionOlvidada && (
        <div className="bg-rose-500/15 border-2 border-rose-500/50 rounded-xl px-4 py-4 flex items-start gap-3 shadow-lg shadow-rose-500/10">
          <AlertTriangle size={22} className="text-rose-400 shrink-0 mt-0.5 animate-pulse" />
          <div className="flex-1 min-w-0">
            <p className="text-base font-black text-rose-300">
              Caja abierta desde {sesionOlvidada.fechaLabel}
              {sesionOlvidada.diasAtras >= 1 && (
                <span className="ml-2 text-xs font-bold uppercase tracking-wider bg-rose-500/30 text-rose-200 px-2 py-0.5 rounded-full">
                  hace {sesionOlvidada.diasAtras} {sesionOlvidada.diasAtras === 1 ? 'día' : 'días'}
                </span>
              )}
            </p>
            <p className="text-xs text-rose-200/80 mt-1">
              Se abrió a las {sesionOlvidada.horaLabel}. Los KPIs de abajo <strong>solo cuentan movimientos de hoy</strong> — no incluyen ventas/gastos de los días anteriores de esta misma sesión. Ciérrala antes de abrir la del día actual, o el arqueo va a descuadrar.
            </p>
          </div>
          <button
            onClick={() => setShowCierre(true)}
            className="shrink-0 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-primary font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Lock size={14} /> Cerrar ahora
          </button>
        </div>
      )}

      {/* Alerta: citas sin método de pago — lista CUÁLES para poder accionarlas */}
      {kpis.citasSinMetodo > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-amber-300">
              {kpis.citasSinMetodo} {kpis.citasSinMetodo === 1 ? 'cita' : 'citas'} sin método de pago por {fmtCurrency(kpis.serviciosNoEspecificado)}
            </p>
            <p className="text-xs text-amber-200/70 mt-0.5">
              No entran al saldo esperado hasta que les marques método en la Agenda.
            </p>
            <div className="mt-2 space-y-1">
              {kpis.citasSinMetodoList.map((c, i) => (
                <div key={c.id || i} className="text-xs text-amber-100/90 flex items-center justify-between gap-2">
                  <span className="truncate">• {c.hora || '--:--'} · {c.servicioNombre || 'Servicio'} — {c.clienteNombre || 'Cliente'}{c.barbero ? ` · ${c.barbero}` : ''}</span>
                  <span className="font-semibold shrink-0 tabular-nums">{fmtCurrency(Number(c.precio) || 0)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Cortesías del día: no mueven caja, pero es útil ver cuánto se regala */}
      {kpis.nCortesias > 0 && (
        <div className="bg-slate-800/40 border border-amber-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
          <Gift size={18} className="text-amber-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-primary">
              {kpis.nCortesias} {kpis.nCortesias === 1 ? 'atención de cortesía' : 'atenciones de cortesía'} hoy
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Valor regalado (precio de lista): <span className="font-semibold text-amber-300">{fmtCurrency(kpis.valorCortesias)}</span>. No entra a la caja — es solo para que midas cuánto regalas.
            </p>
          </div>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard icon={Banknote} label="Saldo Esperado" value={fmtCurrency(kpis.saldoEsperado)} color="emerald" sub="En caja física" />
        <KpiCard icon={ArrowDownCircle} label="Ingresos Efectivo" value={fmtCurrency(kpis.totalIngresosEfectivo)} color="blue" sub={`${kpis.transEfectivo} ${kpis.transEfectivo === 1 ? 'transacción' : 'transacciones'} en efectivo`} />
        <KpiCard icon={ArrowUpCircle} label="Egresos Efectivo" value={fmtCurrency(kpis.totalEgresosEfectivo)} color="rose" sub={`${kpis.totalGastos} gastos`} />
        <KpiCard icon={CreditCard} label="Tarjeta" value={fmtCurrency(kpis.totalIngresosTarjeta)} color="purple" />
        <KpiCard icon={ArrowRightLeft} label="Transferencia" value={fmtCurrency(kpis.totalIngresosTransf)} color="cyan" />
        <KpiCard icon={TrendingUp} label="Total General" value={fmtCurrency(kpis.totalIngresosGeneral)} color="amber" sub={kpis.ticketPromedio > 0 ? `Ticket prom: ${fmtCurrency(kpis.ticketPromedio)} · ${kpis.totalCitas + kpis.totalVentas} transac.` : `${kpis.totalCitas + kpis.totalVentas} transacciones`} />
      </div>

      {/* Desglose rápido */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cash flow summary */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5">
          <h2 className="text-sm font-bold text-primary mb-4 flex items-center gap-2"><Banknote size={15} className="text-emerald-400" /> Flujo de Efectivo</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-400">Apertura</span><span className="text-primary font-semibold">{fmtCurrency(kpis.apertura)}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">+ Servicios (efectivo)</span><span className="text-emerald-400 font-semibold">+{fmtCurrency(kpis.serviciosEfectivo)}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">+ Productos (efectivo)</span><span className="text-emerald-400 font-semibold">+{fmtCurrency(kpis.productosEfectivo)}</span></div>
            {kpis.propinasEfectivo > 0 && <div className="flex justify-between"><span className="text-slate-400">+ Propinas efectivo <span className="text-[10px] text-amber-400">(para equipo)</span></span><span className="text-amber-400 font-semibold">+{fmtCurrency(kpis.propinasEfectivo)}</span></div>}
            {kpis.ingManuales > 0 && <div className="flex justify-between"><span className="text-slate-400">+ Ingresos manuales</span><span className="text-emerald-400 font-semibold">+{fmtCurrency(kpis.ingManuales)}</span></div>}
            <div className="flex justify-between"><span className="text-slate-400">− Gastos (efectivo)</span><span className="text-rose-400 font-semibold">-{fmtCurrency(kpis.gastosEfectivo)}</span></div>
            {kpis.egrManuales > 0 && <div className="flex justify-between"><span className="text-slate-400">− Egresos manuales</span><span className="text-rose-400 font-semibold">-{fmtCurrency(kpis.egrManuales)}</span></div>}
            <div className="border-t border-slate-700 pt-2 mt-2 flex justify-between">
              <span className="text-primary font-bold">Saldo Esperado</span>
              <span className="text-emerald-400 font-black text-lg">{fmtCurrency(kpis.saldoEsperado)}</span>
            </div>
          </div>
        </div>

        {/* Other methods */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5">
          <h2 className="text-sm font-bold text-primary mb-4 flex items-center gap-2"><CreditCard size={15} className="text-purple-400" /> Otros Métodos</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-purple-500/5 border border-purple-500/20 rounded-xl">
              <div className="flex items-center gap-2 text-sm text-purple-300"><CreditCard size={14} /> Tarjeta</div>
              <div className="text-right">
                <p className="text-lg font-bold text-purple-300">{fmtCurrency(kpis.totalIngresosTarjeta)}</p>
                <p className="text-[10px] text-slate-500">Serv: {fmtCurrency(kpis.serviciosTarjeta)} · Prod: {fmtCurrency(kpis.productosTarjeta)}</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-cyan-500/5 border border-cyan-500/20 rounded-xl">
              <div className="flex items-center gap-2 text-sm text-cyan-300"><ArrowRightLeft size={14} /> Transferencia</div>
              <div className="text-right">
                <p className="text-lg font-bold text-cyan-300">{fmtCurrency(kpis.totalIngresosTransf)}</p>
                <p className="text-[10px] text-slate-500">Serv: {fmtCurrency(kpis.serviciosTransf)} · Prod: {fmtCurrency(kpis.productosTransf)}</p>
              </div>
            </div>
            {kpis.propinasTotal > 0 && (
              <div className="flex items-center justify-between p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                <div className="flex items-center gap-2 text-sm text-amber-300"><DollarSign size={14} /> Propinas</div>
                <p className="text-lg font-bold text-amber-300">{fmtCurrency(kpis.propinasTotal)}</p>
              </div>
            )}
            {(kpis.gastosTarjeta > 0 || kpis.gastosTransf > 0) && (
              <div className="flex items-center justify-between p-3 bg-rose-500/5 border border-rose-500/20 rounded-xl">
                <div className="flex items-center gap-2 text-sm text-rose-300"><ArrowUpCircle size={14} /> Gastos (otros)</div>
                <p className="text-lg font-bold text-rose-300">{fmtCurrency(kpis.gastosTarjeta + kpis.gastosTransf)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5">
        <h2 className="text-sm font-bold text-primary mb-4 flex items-center gap-2"><Clock size={15} className="text-blue-400" /> Transacciones del Día ({timeline.length})</h2>
        {timeline.length === 0 ? (
          <p className="text-center text-slate-500 text-sm py-6">Aún no hay transacciones registradas hoy.</p>
        ) : (
          <div className="space-y-1.5 max-h-[28rem] overflow-y-auto pr-2">
            {timeline.map((t, i) => {
              const isPositive = t.monto >= 0;
              const isManual = t.type === 'ingreso_manual' || t.type === 'egreso_manual';
              const revertido = !!t.revertido;
              const typeColors = {
                servicio: 'border-l-blue-500',
                producto: 'border-l-emerald-500',
                gasto: 'border-l-rose-500',
                ingreso_manual: 'border-l-amber-500',
                egreso_manual: 'border-l-red-500',
              };
              return (
                <div key={i} className={`flex items-center gap-3 px-3 py-2.5 bg-slate-900/40 border border-slate-700/30 border-l-2 ${typeColors[t.type] || 'border-l-slate-500'} rounded-lg ${revertido ? 'opacity-50' : ''}`}>
                  <span className="text-xs text-slate-500 font-mono w-12 shrink-0">{t.time}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm text-primary truncate ${revertido ? 'line-through' : ''}`}>{t.label}</p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {t.sub}
                      {revertido && t.motivoReverso ? (
                        <span className="ml-1 text-rose-400"> · Revertido: {t.motivoReverso}</span>
                      ) : null}
                    </p>
                  </div>
                  {/* Badge de método de pago: se lee de un vistazo. Cortesía en
                      ámbar resalta las atenciones gratis; sin método en rose avisa. */}
                  {t.metodo && t.metodo !== '—' && (() => {
                    const m = String(t.metodo);
                    const cls = /efectivo/i.test(m)                        ? 'bg-emerald-500/15 text-emerald-300'
                              : /cortes/i.test(m)                          ? 'bg-amber-500/15 text-amber-300'
                              : /transfer/i.test(m)                        ? 'bg-cyan-500/15 text-cyan-300'
                              : /(d[ée]bito|cr[ée]dito|tarjeta)/i.test(m)  ? 'bg-violet-500/15 text-violet-300'
                              : 'bg-rose-500/15 text-rose-300';   // No especificado / Sin método
                    return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap ${cls}`}>{m}</span>;
                  })()}
                  <span className={`text-sm font-bold shrink-0 ${revertido ? 'text-slate-500 line-through' : (isPositive ? 'text-emerald-400' : 'text-rose-400')}`}>
                    {isPositive ? '+' : ''}{fmtCurrency(t.monto)}
                  </span>
                  {isManual && !revertido && (
                    <button
                      type="button"
                      onClick={() => setRevertirTarget({ tipo: t.manualTipo, id: t.manualId, horaSeconds: t.manualHoraSeconds, label: t.label, monto: t.monto })}
                      title="Revertir ajuste"
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors shrink-0"
                    >
                      <Undo2 size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Historial de cierres */}
      {historial.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-3">
            <History size={14} /> Historial de Cierres
          </h2>
          <div className="space-y-2">
            {historial.slice(0, 10).map(h => {
              const diff = h.diferencia ?? 0;
              return (
                <div key={h.id} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-primary font-semibold">{fmtDateTime(h.fechaApertura)} → {fmtDateTime(h.fechaCierre)}</p>
                      <p className="text-xs text-slate-500">{h.nombreApertura || h.usuarioApertura || '-'} / {h.nombreCierre || h.usuarioCierre || '-'}{h.observaciones ? ` · ${h.observaciones}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-slate-400">Esperado: <span className="text-primary font-semibold">{fmtCurrency(h.montoCierreEsperado)}</span></span>
                      <span className="text-slate-400">Real: <span className="text-primary font-semibold">{fmtCurrency(h.montoCierreReal)}</span></span>
                      <span className={`font-bold px-2 py-0.5 rounded-full text-[11px] ${diff >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {diff >= 0 ? '▲' : '▼'} {fmtCurrency(Math.abs(diff))}
                      </span>
                    </div>
                  </div>
                  <HistorialSnapshotRow snapshot={h.snapshot} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── MODALES ──────────────────────────────────────────── */}

      {/* Modal Cerrar Caja */}
      {showCierre && (
        <MiniModal title="Cerrar Caja" onClose={() => setShowCierre(false)}>
          <div className="space-y-4">
            <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl text-sm text-amber-300 flex items-start gap-2">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>Saldo esperado en efectivo: <strong>{fmtCurrency(kpis.saldoEsperado)}</strong></span>
            </div>
            {sesionOlvidada && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/40 rounded-xl text-xs text-rose-200 flex items-start gap-2">
                <AlertTriangle size={14} className="shrink-0 mt-0.5 text-rose-400" />
                <span>
                  Esta caja se abrió el <strong>{sesionOlvidada.fechaLabel}</strong>. El saldo esperado <strong>solo considera movimientos de hoy</strong> — es probable que descuadre. Anota el motivo en observaciones.
                </span>
              </div>
            )}
            {kpis.propinasEfectivo > 0 && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-200 flex items-start gap-2">
                <DollarSign size={14} className="shrink-0 mt-0.5 text-amber-400" />
                <span>
                  Del esperado, <strong className="text-amber-300">{fmtCurrency(kpis.propinasEfectivo)}</strong> son propinas para el equipo. Sepáralas del arqueo antes de guardar la caja.
                </span>
              </div>
            )}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={`${lbl} mb-0`}>Efectivo físico contado ($)</label>
                <button
                  type="button"
                  onClick={() => setUsarDenominaciones(v => !v)}
                  className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full transition-colors ${usarDenominaciones ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200'}`}
                >
                  {usarDenominaciones ? '✓ Contando por billete' : 'Contar por billete'}
                </button>
              </div>
              {usarDenominaciones ? (
                <ArqueoDenominaciones conteo={conteoDenom} setConteo={setConteoDenom} total={totalDenom} />
              ) : (
                <input type="number" inputMode="numeric" className={field} placeholder="0" min="0" value={cierreEfectivo} onChange={e => setCierreEfectivo(e.target.value)} />
              )}
            </div>
            {cierreEfectivo !== '' && (
              <div className={`p-3 rounded-xl text-sm font-bold flex items-center gap-2 ${diferenciaCierre >= 0 ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'}`}>
                {diferenciaCierre >= 0 ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                Diferencia: {diferenciaCierre >= 0 ? '+' : ''}{fmtCurrency(diferenciaCierre)}
                {diferenciaCierre >= 0 ? ' (Sobrante)' : ' (Faltante)'}
              </div>
            )}
            <div>
              <label className={lbl}>¿Quién cierra la caja?</label>
              <input
                className={field}
                placeholder="Nombre del cajero (ej: Camila)"
                value={nombreCierre}
                onChange={e => setNombreCierre(e.target.value)}
                autoComplete="off"
                maxLength={40}
              />
              <p className="text-[10px] text-slate-500 mt-1">Cuenta: {userEmail}</p>
            </div>
            <div>
              <label className={lbl}>Observaciones / Novedades</label>
              <textarea className={`${field} resize-none`} rows={2} placeholder="Ej: Se cayó una moneda..." value={cierreObs} onChange={e => setCierreObs(e.target.value)} />
            </div>
            <button
              onClick={handleCerrarCaja}
              disabled={cerrando || cierreEfectivo === ''}
              className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 text-primary font-bold text-sm transition-colors"
            >
              {cerrando ? 'Cerrando...' : 'Confirmar Cierre de Caja'}
            </button>
          </div>
        </MiniModal>
      )}

      {/* Modal Ingreso Manual */}
      {showIngreso && (
        <MiniModal title="Registrar Ingreso" onClose={() => setShowIngreso(false)}>
          <div className="space-y-3">
            <div>
              <label className={lbl}>Descripción</label>
              <input className={field} placeholder="Ej: Cambio sencillo traído" value={adjDesc} onChange={e => setAdjDesc(e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Monto ($)</label>
              <input type="number" className={field} placeholder="0" min="0" value={adjMonto} onChange={e => setAdjMonto(e.target.value)} />
            </div>
            <button
              onClick={() => handleAjuste('ingreso')}
              disabled={adjSaving || !adjDesc.trim() || !adjMonto}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-primary font-bold text-sm transition-colors"
            >
              {adjSaving ? 'Guardando...' : 'Registrar Ingreso'}
            </button>
          </div>
        </MiniModal>
      )}

      {/* Modal Egreso Manual */}
      {showEgreso && (
        <MiniModal title="Registrar Egreso / Retiro" onClose={() => setShowEgreso(false)}>
          <div className="space-y-3">
            <div>
              <label className={lbl}>Descripción</label>
              <input className={field} placeholder="Ej: Retiro parcial por seguridad" value={adjDesc} onChange={e => setAdjDesc(e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Monto ($)</label>
              <input type="number" className={field} placeholder="0" min="0" value={adjMonto} onChange={e => setAdjMonto(e.target.value)} />
            </div>
            <button
              onClick={() => handleAjuste('egreso')}
              disabled={adjSaving || !adjDesc.trim() || !adjMonto}
              className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:bg-slate-700 text-primary font-bold text-sm transition-colors"
            >
              {adjSaving ? 'Guardando...' : 'Registrar Egreso'}
            </button>
          </div>
        </MiniModal>
      )}

      {/* Modal Corte X */}
      {showCorteX && (
        <MiniModal title="Corte X — Arqueo intermedio" onClose={() => setShowCorteX(false)}>
          <div className="space-y-4">
            <div className="p-3 bg-indigo-500/5 border border-indigo-500/20 rounded-xl text-xs text-indigo-300 flex items-start gap-2">
              <Scissors size={14} className="shrink-0 mt-0.5" />
              <span>Genera un imprimible con el estado actual de la caja para relevo de turno. <strong>No cierra la sesión.</strong></span>
            </div>
            <div>
              <label className={lbl}>¿Quién hace el corte?</label>
              <input
                className={field}
                placeholder={sesionActiva?.nombreApertura || 'Nombre del cajero'}
                value={corteXCajero}
                onChange={e => setCorteXCajero(e.target.value)}
                autoComplete="off"
                maxLength={40}
              />
            </div>
            <div>
              <label className={lbl}>Efectivo contado hasta el momento ($) — opcional</label>
              <input
                type="number"
                inputMode="numeric"
                className={field}
                placeholder={fmtCurrency(kpis.saldoEsperado)}
                min="0"
                value={corteXEfectivo}
                onChange={e => setCorteXEfectivo(e.target.value)}
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Si lo dejas vacío, el corte solo registra el estado esperado ({fmtCurrency(kpis.saldoEsperado)}).
              </p>
            </div>
            {corteXEfectivo !== '' && !isNaN(parseFloat(corteXEfectivo)) && (() => {
              const dif = parseFloat(corteXEfectivo) - kpis.saldoEsperado;
              return (
                <div className={`p-3 rounded-xl text-sm font-bold flex items-center gap-2 ${dif >= 0 ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'}`}>
                  {dif >= 0 ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                  Diferencia: {dif >= 0 ? '+' : ''}{fmtCurrency(dif)} {dif >= 0 ? '(sobrante)' : '(faltante)'}
                </div>
              );
            })()}
            <button
              onClick={handleCorteX}
              disabled={corteXSaving}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-primary font-bold text-sm transition-colors flex items-center justify-center gap-2"
            >
              {corteXSaving ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Printer size={14} />}
              {corteXSaving ? 'Generando...' : 'Imprimir corte X'}
            </button>
          </div>
        </MiniModal>
      )}

      {/* Modal Revertir Ajuste Manual */}
      {revertirTarget && (
        <MiniModal title="Revertir ajuste manual" onClose={() => { setRevertirTarget(null); setMotivoReverso(''); }}>
          <div className="space-y-4">
            <div className="p-3 bg-rose-500/5 border border-rose-500/20 rounded-xl text-sm">
              <p className="text-rose-300 font-semibold">{revertirTarget.label}</p>
              <p className="text-rose-400/80 text-xs mt-0.5">
                {revertirTarget.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'} de {fmtCurrency(Math.abs(revertirTarget.monto))}
              </p>
            </div>
            <p className="text-xs text-slate-400">
              El movimiento queda en el registro como <strong className="text-primary">revertido</strong> (no se borra), con tu usuario y el motivo. El saldo esperado se recalcula sin este monto.
            </p>
            <div>
              <label className={lbl}>Motivo del reverso</label>
              <textarea
                className={`${field} resize-none`}
                rows={2}
                placeholder="Ej: monto ingresado por error, se duplicó el registro..."
                value={motivoReverso}
                onChange={e => setMotivoReverso(e.target.value)}
                autoComplete="off"
                maxLength={200}
              />
            </div>
            <button
              onClick={handleRevertir}
              disabled={revirtiendo || !motivoReverso.trim()}
              className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:bg-slate-700 text-primary font-bold text-sm transition-colors"
            >
              {revirtiendo ? 'Revirtiendo...' : 'Confirmar reverso'}
            </button>
          </div>
        </MiniModal>
      )}

      {/* Modal de ayuda */}
      {showHelp && (
        <HelpModal title="Cómo usar la Caja" onClose={() => setShowHelp(false)}>
          <p><strong className="text-primary">La caja</strong> centraliza todo el dinero del día: cierres, propinas, productos, gastos y retiros — todo en un solo sitio.</p>

          <div>
            <p className="font-semibold text-emerald-400 mb-1">1. Abrir la caja</p>
            <p>Al inicio del día toca <em>"Abrir Caja"</em> e ingresa el <strong className="text-primary">monto inicial en efectivo</strong> (lo que tienes físico en el cajón). Sin caja abierta no se registran transacciones del día.</p>
          </div>

          <div>
            <p className="font-semibold text-emerald-400 mb-1">2. Durante el día</p>
            <ul className="list-disc ml-4 space-y-1">
              <li>Las <strong className="text-primary">citas completadas</strong> en /agenda suman automáticamente.</li>
              <li>Las <strong className="text-primary">ventas de productos</strong> (rápidas o en el ticket de cita) también se cuentan solas.</li>
              <li>Si retiras efectivo (banco, gasto urgente, etc.), toca <em>"Egreso / Retiro"</em> para dejarlo registrado.</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-emerald-400 mb-1">3. Cerrar la caja</p>
            <p>Al final del día, toca <em>"Cerrar Caja"</em> e ingresa lo que <strong className="text-primary">contaste físicamente en efectivo</strong>. El sistema compara con lo esperado y muestra el <strong className="text-primary">descuadre</strong> (positivo = sobrante, negativo = faltante). Queda en historial para auditar.</p>
            <p className="text-xs text-amber-400 mt-1">Las propinas en efectivo cuentan en el saldo esperado porque están en el cajón. Cuando cierres, separa esa plata para el equipo antes de guardar la caja.</p>
          </div>

          <p className="text-xs text-amber-400 bg-amber-400/5 border border-amber-400/20 rounded-lg px-3 py-2">💡 Solo puede haber <strong>una caja abierta a la vez</strong>. Si olvidaste cerrar la del día anterior, ciérrala antes de abrir la de hoy.</p>
        </HelpModal>
      )}

      {showReporteContador && (
        <ReporteContadorModal tenantName={tenant?.name} onClose={() => setShowReporteContador(false)} />
      )}
      {showConciliacion && (
        <ConciliacionModal onClose={() => setShowConciliacion(false)} />
      )}
    </div>
  );
}
