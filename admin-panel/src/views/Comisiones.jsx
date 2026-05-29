import { useState, useMemo, useCallback, useEffect } from 'react';
import { getDocs, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import {
  DollarSign, Download, RefreshCcw, ChevronDown, CheckCircle2,
  Scissors, User, AlertCircle, Banknote, TrendingUp, Calendar,
} from 'lucide-react';
import { tenantCol } from '../lib/tenantUtils';
import { useCollection } from '../hooks/useCollection';
import { useAuth } from '../contexts/AuthContext';

/* ── Helpers ──────────────────────────────────────────────────────── */
function pad(n) { return String(n).padStart(2, '0'); }
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function firstOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
}
function firstOfLastMonth() {
  const d = new Date();
  d.setDate(1); d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
}
function lastOfLastMonth() {
  const d = new Date();
  d.setDate(0);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function thirtyDaysAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function formatCLP(n) { return `$${Math.round(n).toLocaleString('es-CL')}`; }
function csvEscape(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const PRESETS = [
  { label: 'Este mes', fn: () => [firstOfMonth(), today()] },
  { label: 'Mes pasado', fn: () => [firstOfLastMonth(), lastOfLastMonth()] },
  { label: 'Últimos 30 días', fn: () => [thirtyDaysAgo(), today()] },
];

/* ── BarberAvatar ─────────────────────────────────────────────────── */
function BarberAvatar({ foto, nombre }) {
  if (foto) return <img src={foto} alt={nombre} className="w-10 h-10 rounded-full object-cover border-2 border-slate-700" />;
  return (
    <div className="w-10 h-10 rounded-full bg-emerald-500/20 border-2 border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400 text-base">
      {(nombre || '?')[0].toUpperCase()}
    </div>
  );
}

/* ── PagarModal ───────────────────────────────────────────────────── */
function PagarModal({ barbero, periodo, onConfirm, onClose }) {
  const [loading, setLoading] = useState(false);
  const handle = async () => {
    setLoading(true);
    await onConfirm();
    setLoading(false);
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <CheckCircle2 size={20} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Registrar pago</p>
              <p className="text-xs text-slate-500">{barbero.nombre}</p>
            </div>
          </div>
          <div className="bg-slate-800/60 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between text-slate-400">
              <span>Sueldo base</span>
              <span className="text-white font-medium">{formatCLP(barbero.sueldoBase)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Comisiones ({barbero.comisionPct}%)</span>
              <span className="text-white font-medium">{formatCLP(barbero.montoComision)}</span>
            </div>
            <div className="border-t border-slate-700 pt-2 flex justify-between font-bold">
              <span className="text-slate-300">Total a pagar</span>
              <span className="text-emerald-400">{formatCLP(barbero.total)}</span>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Se registrará como gasto en la categoría <span className="text-slate-300 font-medium">Sueldos</span> del período {periodo}.
          </p>
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-2 rounded-lg text-sm font-semibold text-slate-400 bg-slate-800 hover:bg-slate-700 transition-all">
              Cancelar
            </button>
            <button
              onClick={handle}
              disabled={loading}
              className="flex-1 py-2 rounded-lg text-sm font-bold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 transition-all"
            >
              {loading ? 'Registrando...' : 'Confirmar pago'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main view ────────────────────────────────────────────────────── */
export default function Comisiones() {
  const { user } = useAuth();
  const [fechaInicio, setFechaInicio] = useState(firstOfMonth());
  const [fechaFin, setFechaFin] = useState(today());
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [pagarTarget, setPagarTarget] = useState(null);
  const [pagados, setPagados] = useState(new Set());

  const { data: barberos = [] } = useCollection('barberos');

  const loadCitas = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(
        tenantCol('citas'),
        where('estado', '==', 'Completada'),
        where('fecha', '>=', fechaInicio),
        where('fecha', '<=', fechaFin),
      );
      const snap = await getDocs(q);
      setCitas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error('[Comisiones] error cargando citas:', e);
    } finally {
      setLoading(false);
    }
  }, [fechaInicio, fechaFin]);

  useEffect(() => { loadCitas(); }, [loadCitas]);

  const getPrice = useCallback((c) => {
    const base = Number(c.precio) || 0;
    const extras = Array.isArray(c.ticketProductos)
      ? c.ticketProductos.reduce((s, p) => s + (Number(p.totalLinea) || 0), 0)
      : 0;
    return base + extras;
  }, []);

  const data = useMemo(() => {
    const map = {};

    barberos.forEach(b => {
      map[b.id] = {
        id: b.id,
        nombre: b.nombre || 'Sin nombre',
        foto: b.foto || null,
        comisionPct: Number(b.comision) || 0,
        sueldoBase: Number(b.sueldoBase) || 0,
        citas: 0,
        ingresos: 0,
        montoComision: 0,
        total: 0,
      };
    });

    citas.forEach(c => {
      let key = null;
      if (c.barberoId && map[c.barberoId]) {
        key = c.barberoId;
      } else {
        const found = barberos.find(b => b.nombre === c.barbero || b.id === c.barberoId);
        if (found) key = found.id;
      }
      if (!key) {
        if (!map['_sin']) {
          map['_sin'] = { id: '_sin', nombre: 'Sin barbero', foto: null, comisionPct: 0, sueldoBase: 0, citas: 0, ingresos: 0, montoComision: 0, total: 0 };
        }
        key = '_sin';
      }
      const precio = getPrice(c);
      map[key].citas++;
      map[key].ingresos += precio;
      map[key].montoComision += precio * (map[key].comisionPct / 100);
    });

    return Object.values(map)
      .filter(b => b.citas > 0)
      .map(b => ({ ...b, ingresos: Math.round(b.ingresos), montoComision: Math.round(b.montoComision), total: Math.round(b.sueldoBase + b.montoComision) }))
      .sort((a, b) => b.ingresos - a.ingresos);
  }, [citas, barberos, getPrice]);

  const totals = useMemo(() => data.reduce((acc, b) => ({
    citas: acc.citas + b.citas,
    ingresos: acc.ingresos + b.ingresos,
    montoComision: acc.montoComision + b.montoComision,
    sueldoBase: acc.sueldoBase + b.sueldoBase,
    total: acc.total + b.total,
  }), { citas: 0, ingresos: 0, montoComision: 0, sueldoBase: 0, total: 0 }), [data]);

  const periodo = `${fechaInicio} al ${fechaFin}`;

  const handlePagar = async (barbero) => {
    await addDoc(tenantCol('gastos'), {
      descripcion: `Pago comisiones ${barbero.nombre} (${periodo})`,
      monto: barbero.total,
      categoria: 'Sueldos',
      fecha: today(),
      barberoId: barbero.id,
      barberoNombre: barbero.nombre,
      creadoEn: serverTimestamp(),
      creadoPor: user?.uid || 'admin',
    });
    setPagados(prev => new Set([...prev, barbero.id]));
  };

  const downloadCSV = () => {
    const headers = ['Barbero', 'Citas', 'Ingresos', 'Comisión %', 'Monto Comisión', 'Sueldo Base', 'Total a Pagar'];
    const rows = data.map(b => [b.nombre, b.citas, b.ingresos, b.comisionPct, b.montoComision, b.sueldoBase, b.total]);
    rows.push(['TOTAL', totals.citas, totals.ingresos, '', totals.montoComision, totals.sueldoBase, totals.total]);
    const csv = [headers, ...rows].map(r => r.map(csvEscape).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `comisiones-${fechaInicio}-${fechaFin}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Banknote size={20} className="text-emerald-400" />
            <h1 className="text-xl font-bold text-white">Comisiones</h1>
          </div>
          <p className="text-sm text-slate-400">Desglose de pagos por barbero según período seleccionado.</p>
        </div>
        <button
          onClick={downloadCSV}
          disabled={data.length === 0}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 disabled:opacity-40 transition-all"
        >
          <Download size={14} />
          Exportar CSV
        </button>
      </div>

      {/* Date range */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Desde</label>
            <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Hasta</label>
            <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none" />
          </div>
          <div className="relative">
            <button
              onClick={() => setShowPresets(v => !v)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 transition-all"
            >
              <Calendar size={14} />
              Período
              <ChevronDown size={12} />
            </button>
            {showPresets && (
              <div className="absolute left-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-20 w-44 py-1">
                {PRESETS.map(p => (
                  <button key={p.label} onClick={() => { const [i, f] = p.fn(); setFechaInicio(i); setFechaFin(f); setShowPresets(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={loadCitas} disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 disabled:opacity-50 transition-all">
            <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Cargando...' : 'Actualizar'}
          </button>
        </div>
      </div>

      {/* Summary KPIs */}
      {data.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Scissors,   color: 'text-blue-400',    bg: 'bg-blue-500/10',    label: 'Citas completadas', value: totals.citas },
            { icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Ingresos totales',  value: formatCLP(totals.ingresos) },
            { icon: DollarSign, color: 'text-amber-400',   bg: 'bg-amber-500/10',   label: 'Total comisiones',  value: formatCLP(totals.montoComision) },
            { icon: Banknote,   color: 'text-rose-400',    bg: 'bg-rose-500/10',    label: 'Total a pagar',     value: formatCLP(totals.total) },
          ].map(({ icon: Icon, color, bg, label, value }) => (
            <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-3`}>
                <Icon size={16} className={color} />
              </div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">{label}</p>
              <p className="text-xl font-bold text-white mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Per-barbero cards */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500">
          <RefreshCcw size={20} className="animate-spin mr-2" /> Cargando citas...
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-2">
          <AlertCircle size={32} className="opacity-40" />
          <p className="text-sm">Sin citas completadas en el período seleccionado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map(barbero => (
            <div key={barbero.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-all">
              <div className="flex items-center gap-4 flex-wrap">
                {/* Avatar + nombre */}
                <div className="flex items-center gap-3 min-w-[160px]">
                  <BarberAvatar foto={barbero.foto} nombre={barbero.nombre} />
                  <div>
                    <p className="text-sm font-bold text-white">{barbero.nombre}</p>
                    <p className="text-xs text-slate-500">{barbero.citas} cita{barbero.citas !== 1 ? 's' : ''}</p>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex flex-1 flex-wrap gap-4 items-center">
                  <StatItem label="Ingresos" value={formatCLP(barbero.ingresos)} />
                  <StatItem label={`Comisión (${barbero.comisionPct}%)`} value={formatCLP(barbero.montoComision)} />
                  <StatItem label="Sueldo base" value={formatCLP(barbero.sueldoBase)} />
                  <div className="min-w-[100px]">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Total a pagar</p>
                    <p className="text-lg font-bold text-emerald-400">{formatCLP(barbero.total)}</p>
                  </div>
                </div>

                {/* Pagar btn */}
                <button
                  onClick={() => setPagarTarget(barbero)}
                  disabled={pagados.has(barbero.id) || barbero.total === 0}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border shrink-0 ${
                    pagados.has(barbero.id)
                      ? 'bg-slate-800/50 text-slate-500 border-slate-700 cursor-default'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                  }`}
                >
                  {pagados.has(barbero.id) ? <><CheckCircle2 size={14} /> Registrado</> : <><DollarSign size={14} /> Registrar pago</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {pagarTarget && (
        <PagarModal
          barbero={pagarTarget}
          periodo={periodo}
          onConfirm={() => handlePagar(pagarTarget)}
          onClose={() => setPagarTarget(null)}
        />
      )}

    </div>
  );
}

function StatItem({ label, value }) {
  return (
    <div className="min-w-[100px]">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm font-bold text-white mt-0.5">{value}</p>
    </div>
  );
}
