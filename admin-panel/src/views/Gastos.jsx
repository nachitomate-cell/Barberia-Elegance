import { useState, useEffect } from 'react';
import {
  TrendingDown, Plus, X, Calendar, DollarSign,
  Tag, CreditCard, AlertCircle, ChevronDown,
} from 'lucide-react';
import {
  collection, addDoc, query, where, orderBy,
  onSnapshot, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { tenantCol } from '../lib/tenantUtils';

/* ─── Constants ─────────────────────────────────────────────── */
const CATEGORIAS   = ['Insumos', 'Sueldos', 'Arriendo', 'Servicios Básicos', 'Equipamiento', 'Marketing', 'Otros'];
const METODOS_PAGO = ['Efectivo', 'Transferencia', 'Tarjeta'];

const CAT_COLORS = {
  Insumos:            'bg-blue-500/20 text-blue-400',
  Sueldos:            'bg-purple-500/20 text-purple-400',
  Arriendo:           'bg-amber-500/20 text-amber-400',
  'Servicios Básicos':'bg-cyan-500/20 text-cyan-400',
  Equipamiento:       'bg-emerald-500/20 text-emerald-400',
  Marketing:          'bg-rose-500/20 text-rose-400',
  Otros:              'bg-slate-500/20 text-slate-400',
};

const EMPTY_FORM = {
  descripcion: '',
  monto:       '',
  categoria:   'Insumos',
  metodoPago:  'Efectivo',
  fecha:       new Date().toISOString().slice(0, 10),
};

/* ─── Helpers ────────────────────────────────────────────────── */
function gastosCol() {
  return tenantCol('gastos');
}

function thisMonthRange() {
  const now   = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start: Timestamp.fromDate(start), end: Timestamp.fromDate(end) };
}

/* ─── GastoModal ─────────────────────────────────────────────── */
function GastoModal({ onClose, onSaved }) {
  const [form,   setForm]   = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async e => {
    e.preventDefault();
    if (!form.descripcion.trim()) { setError('La descripción es obligatoria.'); return; }
    const monto = parseFloat(form.monto);
    if (!monto || monto <= 0)     { setError('El monto debe ser mayor a 0.');   return; }

    setSaving(true);
    try {
      const fechaDate  = new Date(form.fecha + 'T12:00:00');
      await addDoc(gastosCol(), {
        descripcion: form.descripcion.trim(),
        monto,
        categoria:   form.categoria,
        metodoPago:  form.metodoPago,
        fecha:       Timestamp.fromDate(fechaDate),
        creadoEn:    serverTimestamp(),
      });
      onSaved?.();
      onClose();
    } catch {
      setError('Error al guardar. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const inp = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors';
  const lbl = 'block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <TrendingDown size={16} className="text-red-400" />
            <h2 className="text-sm font-bold text-white">Registrar Gasto</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={18} /></button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div>
            <label className={lbl}>Descripción *</label>
            <input className={inp} placeholder="Ej: Compra de navajas y crema" value={form.descripcion}
              onChange={e => set('descripcion', e.target.value)} autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Monto ($) *</label>
              <div className="relative">
                <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input className={`${inp} pl-8`} type="number" min="1" step="1" placeholder="0"
                  value={form.monto} onChange={e => set('monto', e.target.value)} />
              </div>
            </div>
            <div>
              <label className={lbl}>Fecha</label>
              <input className={inp} type="date" value={form.fecha}
                onChange={e => set('fecha', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Categoría</label>
              <div className="relative">
                <select value={form.categoria} onChange={e => set('categoria', e.target.value)}
                  className={`${inp} appearance-none pr-8`}>
                  {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className={lbl}>Método de Pago</label>
              <div className="relative">
                <select value={form.metodoPago} onChange={e => set('metodoPago', e.target.value)}
                  className={`${inp} appearance-none pr-8`}>
                  {METODOS_PAGO.map(m => <option key={m}>{m}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              <AlertCircle size={13} /> {error}
            </div>
          )}

          <div className="flex gap-3 justify-end pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-all">
              {saving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Registrar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── KpiCard ─────────────────────────────────────────────────── */
function KpiCard({ label, value, sub, color = 'red' }) {
  const colors = {
    red:    'bg-red-500/10 text-red-400',
    amber:  'bg-amber-500/10 text-amber-400',
    purple: 'bg-purple-500/10 text-purple-400',
  };
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color === 'red' ? 'text-red-400' : color === 'amber' ? 'text-amber-400' : 'text-white'}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────── */
export default function Gastos() {
  const [gastos,  setGastos]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(false);

  useEffect(() => {
    const { start, end } = thisMonthRange();
    const q = query(
      gastosCol(),
      where('fecha', '>=', start),
      where('fecha', '<',  end),
      orderBy('fecha', 'desc'),
    );
    const unsub = onSnapshot(q, snap => {
      setGastos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);

  /* Summary stats */
  const total   = gastos.reduce((s, g) => s + (g.monto || 0), 0);
  const catMap  = {};
  gastos.forEach(g => { catMap[g.categoria] = (catMap[g.categoria] || 0) + g.monto; });
  const topCat  = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0];

  const fmt = v => `$${Number(v).toLocaleString('es-CL')}`;
  const fmtDate = ts => {
    if (!ts) return '—';
    const d = ts.toDate?.() ?? new Date(ts);
    return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Gastos</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {new Date().toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button onClick={() => setModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-lg transition-all">
          <Plus size={16} /> Registrar Gasto
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard label="Total Gastos del Mes" value={fmt(total)} sub={`${gastos.length} registros`} color="red" />
        <KpiCard label="Categoría Principal"
          value={topCat ? topCat[0] : '—'}
          sub={topCat ? fmt(topCat[1]) : 'Sin datos'}
          color="amber" />
        <KpiCard label="Promedio por Gasto"
          value={gastos.length ? fmt(Math.round(total / gastos.length)) : '$0'}
          sub="Este mes"
          color="purple" />
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-2">
          <TrendingDown size={15} className="text-red-400" />
          <h2 className="text-sm font-semibold text-white">Registros del Mes</h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : gastos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <DollarSign size={32} className="text-slate-700" />
            <p className="text-sm text-slate-600">Sin gastos registrados este mes</p>
            <button onClick={() => setModal(true)}
              className="mt-2 text-xs text-red-400 hover:text-red-300 underline underline-offset-2 transition-colors">
              Registrar el primero
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Fecha</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Descripción</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Categoría</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Método</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                {gastos.map((g, i) => (
                  <tr key={g.id}
                    className={`border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors ${i === gastos.length - 1 ? 'border-0' : ''}`}>
                    <td className="px-5 py-3.5 text-slate-400 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={12} className="text-slate-600" />
                        {fmtDate(g.fecha)}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-white max-w-xs truncate">{g.descripcion}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${CAT_COLORS[g.categoria] || CAT_COLORS.Otros}`}>
                        <Tag size={9} /> {g.categoria}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                        <CreditCard size={12} className="text-slate-600" /> {g.metodoPago}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-red-400 whitespace-nowrap">
                      {fmt(g.monto)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-800/30">
                  <td colSpan={4} className="px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wide">Total</td>
                  <td className="px-5 py-3 text-right font-bold text-red-400 text-sm">{fmt(total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {modal && <GastoModal onClose={() => setModal(false)} />}
    </div>
  );
}
