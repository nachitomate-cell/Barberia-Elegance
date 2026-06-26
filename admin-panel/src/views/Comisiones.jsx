import { useState, useMemo, useCallback, useEffect } from 'react';
import { getDocs, query, where, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import {
  DollarSign, Download, RefreshCcw, ChevronDown, CheckCircle2,
  Scissors, User, AlertCircle, Banknote, TrendingUp, Calendar, Wallet, FileText,
} from 'lucide-react';
import { tenantCol } from '../lib/tenantUtils';
import { withTimeout } from '../lib/firestore-helpers';
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
  return /[";,\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
// El `fecha` de un gasto puede ser Timestamp (Gastos.jsx) o string (legacy).
// Normalizamos a 'YYYY-MM-DD' en hora local para comparar contra el rango.
function fechaToStr(f) {
  if (!f) return '';
  if (typeof f === 'string') return f.slice(0, 10);
  if (typeof f.toDate === 'function') {
    const d = f.toDate();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  return '';
}

const PRESETS = [
  { label: 'Este mes', fn: () => [firstOfMonth(), today()] },
  { label: 'Mes pasado', fn: () => [firstOfLastMonth(), lastOfLastMonth()] },
  { label: 'Últimos 30 días', fn: () => [thirtyDaysAgo(), today()] },
];

const METODOS_PAGO = ['Efectivo', 'Débito', 'Crédito', 'Transferencia'];

/* ── BarberAvatar ─────────────────────────────────────────────────── */
function BarberAvatar({ foto, nombre }) {
  if (foto) return <img src={foto} alt={nombre} className="w-10 h-10 rounded-full object-cover border-2 border-slate-700" />;
  return (
    <div className="w-10 h-10 rounded-full bg-emerald-500/20 border-2 border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400 text-base">
      {(nombre || '?')[0].toUpperCase()}
    </div>
  );
}

/* ── AdelantoModal ────────────────────────────────────────────────── */
function AdelantoModal({ barbero, onConfirm, onClose }) {
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState(today());
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [nota, setNota] = useState('');
  // Cuotas: 1 = adelanto plano (se descuenta todo del próximo pago). N > 1
  // distribuye el descuento en N meses consecutivos a partir de `fecha`.
  // La salida de caja sigue siendo el día `fecha` por el total.
  const [cuotas, setCuotas] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handle = async () => {
    const m = parseFloat(monto);
    if (!m || m <= 0) { setError('El monto debe ser mayor a 0.'); return; }
    const c = Math.max(1, Math.min(36, Math.round(Number(cuotas) || 1)));
    setLoading(true);
    setError('');
    try {
      await onConfirm({ monto: Math.round(m), fecha, metodoPago, nota: nota.trim(), cuotas: c });
      onClose();
    } catch {
      setError('Error al registrar. Intenta de nuevo.');
      setLoading(false);
    }
  };

  const montoNum = parseFloat(monto);
  const montoPorCuota = montoNum > 0 && cuotas > 1 ? Math.round(montoNum / cuotas) : null;

  const inp = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors';
  const lbl = 'block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5';

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center">
              <Wallet size={20} className="text-orange-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Registrar adelanto</p>
              <p className="text-xs text-slate-500">{barbero.nombre}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Monto ($)</label>
              <input className={inp} type="number" min="1" step="1" placeholder="0" autoFocus
                value={monto} onChange={e => setMonto(e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Fecha</label>
              <input className={inp} type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
            </div>
          </div>

          <div>
            <label className={lbl}>Método de pago</label>
            <select className={inp} value={metodoPago} onChange={e => setMetodoPago(e.target.value)}>
              {METODOS_PAGO.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>

          <div>
            <label className={lbl}>Nota (opcional)</label>
            <input className={inp} placeholder="Ej: adelanto quincena" value={nota} onChange={e => setNota(e.target.value)} />
          </div>

          <div>
            <label className={lbl}>Cuotas (para descontar)</label>
            <div className="flex items-center gap-2">
              <input className={inp} type="number" min="1" max="36" step="1"
                value={cuotas} onChange={e => setCuotas(e.target.value)} />
              <span className="text-xs text-slate-500 whitespace-nowrap">
                {cuotas == 1 ? 'sin cuotas' : `× ${cuotas} meses`}
              </span>
            </div>
            {montoPorCuota && (
              <p className="text-[11px] text-amber-300 mt-1.5">
                Se descontarán <strong>{formatCLP(montoPorCuota)}</strong> de la liquidación de cada uno de los próximos {cuotas} períodos mensuales.
              </p>
            )}
          </div>

          <p className="text-xs text-slate-500">
            Se registra como gasto en la categoría <span className="text-slate-300 font-medium">Sueldos</span> el día indicado. {cuotas == 1
              ? 'Se descuenta entero del próximo pago al barbero.'
              : 'El descuento se prorratea en las cuotas indicadas.'}
          </p>

          {error && (
            <div className="flex items-center gap-2 text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
              <AlertCircle size={13} /> {error}
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-2 rounded-lg text-sm font-semibold text-slate-400 bg-slate-800 hover:bg-slate-700 transition-all">
              Cancelar
            </button>
            <button onClick={handle} disabled={loading}
              className="flex-1 py-2 rounded-lg text-sm font-bold text-orange-950 bg-orange-400 hover:bg-orange-300 disabled:opacity-50 transition-all">
              {loading ? 'Registrando...' : 'Registrar adelanto'}
            </button>
          </div>
        </div>
      </div>
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
            {barbero.adelantos > 0 && (
              <div className="flex justify-between text-slate-400">
                <span>Adelantos del período</span>
                <span className="text-orange-400 font-medium">− {formatCLP(barbero.adelantos)}</span>
              </div>
            )}
            <div className="border-t border-slate-700 pt-2 flex justify-between font-bold">
              <span className="text-slate-300">Total a pagar</span>
              <span className="text-emerald-400">{formatCLP(barbero.total)}</span>
            </div>
          </div>
          {barbero.saldoPendiente > 0 && (
            <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
              Los adelantos superan lo generado este período. Queda un saldo de {formatCLP(barbero.saldoPendiente)} a favor del local (arrástralo al próximo período).
            </p>
          )}
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
  const [adelantos, setAdelantos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [pagarTarget, setPagarTarget] = useState(null);
  const [adelantoTarget, setAdelantoTarget] = useState(null);
  const [pagados, setPagados] = useState(new Set());

  // Parámetros para calcular el NETO de los pagos con tarjeta.
  // El neto quita el IVA de la venta y descuenta la comisión del POS por tipo.
  const [ivaPct, setIvaPct]         = useState(19);
  const [comDebPct, setComDebPct]   = useState(1.19);
  const [comCredPct, setComCredPct] = useState(2.95);

  const { data: barberos = [] } = useCollection('barberos');

  // % de comisión del POS según el medio de pago (solo tarjeta).
  const comisionPctDe = useCallback((metodo) => {
    if (metodo === 'Débito') return Number(comDebPct) || 0;
    if (metodo === 'Crédito') return Number(comCredPct) || 0;
    return 0;
  }, [comDebPct, comCredPct]);

  // Neto de un monto bruto: bruto − IVA(venta) − comisión POS.
  const netoDe = useCallback((bruto, metodo) => {
    const iva = Number(ivaPct) || 0;
    const sinIva = bruto / (1 + iva / 100);
    const comision = bruto * (comisionPctDe(metodo) / 100);
    return sinIva - comision;
  }, [ivaPct, comisionPctDe]);

  const loadCitas = useCallback(async () => {
    setLoading(true);
    try {
      // Solo filtramos por rango de fecha (índice de campo único, automático) y
      // filtramos el estado en el cliente para no requerir un índice compuesto.
      const q = query(
        tenantCol('citas'),
        where('fecha', '>=', fechaInicio),
        where('fecha', '<=', fechaFin),
      );
      const snap = await withTimeout(getDocs(q), 20000, 'comisiones/citas');
      setCitas(
        snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(c => c.estado === 'Completada'),
      );
    } catch (e) {
      console.error('[Comisiones] error cargando citas:', e);
    } finally {
      setLoading(false);
    }
  }, [fechaInicio, fechaFin]);

  // Los adelantos son gastos con tipo='adelanto'. Igualdad de campo único →
  // sin índice compuesto. Filtramos el rango de fecha en el cliente.
  const loadAdelantos = useCallback(async () => {
    try {
      const q = query(tenantCol('gastos'), where('tipo', '==', 'adelanto'));
      const snap = await withTimeout(getDocs(q), 15000, 'comisiones/adelantos');
      setAdelantos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error('[Comisiones] error cargando adelantos:', e);
    }
  }, []);

  useEffect(() => { loadCitas(); }, [loadCitas]);
  useEffect(() => { loadAdelantos(); }, [loadAdelantos]);

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
        adelantos: 0,
        propinas: 0,
        propinasCount: 0,
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
          map['_sin'] = { id: '_sin', nombre: 'Sin barbero', foto: null, comisionPct: 0, sueldoBase: 0, citas: 0, ingresos: 0, montoComision: 0, adelantos: 0, propinas: 0, propinasCount: 0, total: 0 };
        }
        key = '_sin';
      }
      const precio = getPrice(c);
      map[key].citas++;
      map[key].ingresos += precio;
      map[key].montoComision += precio * (map[key].comisionPct / 100);
      const propina = Number(c.propina) || 0;
      if (propina > 0) {
        map[key].propinas += propina;
        map[key].propinasCount++;
      }
    });

    // Acumular adelantos del período por barbero.
    //
    // Caso simple (cuotasTotal vacío o 1): descontamos el monto entero si
    // la fecha del adelanto cae en el rango.
    //
    // Caso multicuota (cuotasTotal > 1): el adelanto se distribuye en N
    // cargos mensuales empezando el mes de `fecha`. Para cada cuota que
    // caiga dentro del rango [fechaInicio, fechaFin], sumamos su
    // `montoPorCuota`. Esto permite que el rango sea de cualquier ancho
    // (mes, quincena, varios meses) y la suma siga cuadrando con el plan
    // de cuotas.
    adelantos.forEach(a => {
      if (!a.barberoId || !map[a.barberoId]) return;
      const cuotasTotal = Math.max(1, Number(a.cuotasTotal) || 1);
      const baseStr = fechaToStr(a.fecha);
      if (!baseStr) return;

      if (cuotasTotal === 1) {
        if (baseStr >= fechaInicio && baseStr <= fechaFin) {
          map[a.barberoId].adelantos += Number(a.monto) || 0;
        }
        return;
      }

      const monto = Number(a.monto) || 0;
      const montoPorCuota = Number(a.montoPorCuota) || Math.round(monto / cuotasTotal);
      // Fecha base como Date local (evitamos los corrimientos de UTC con
      // 'YYYY-MM-DDT12:00:00').
      const baseDate = new Date(baseStr + 'T12:00:00');
      for (let i = 0; i < cuotasTotal; i++) {
        const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, baseDate.getDate());
        const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (ymd >= fechaInicio && ymd <= fechaFin) {
          map[a.barberoId].adelantos += montoPorCuota;
        }
      }
    });

    return Object.values(map)
      .map(b => {
        const adel  = Math.round(b.adelantos);
        const bruto = Math.round(b.sueldoBase + b.montoComision);
        const neto  = bruto - adel;
        return {
          ...b,
          ingresos: Math.round(b.ingresos),
          montoComision: Math.round(b.montoComision),
          adelantos: adel,
          propinas: Math.round(b.propinas),
          bruto,
          total: Math.max(0, neto),
          saldoPendiente: neto < 0 ? -neto : 0,
        };
      })
      .filter(b => b.citas > 0 || b.adelantos > 0 || b.propinas > 0)
      .sort((a, b) => b.ingresos - a.ingresos);
  }, [citas, adelantos, barberos, getPrice, fechaInicio, fechaFin]);

  const totals = useMemo(() => data.reduce((acc, b) => ({
    citas: acc.citas + b.citas,
    ingresos: acc.ingresos + b.ingresos,
    montoComision: acc.montoComision + b.montoComision,
    sueldoBase: acc.sueldoBase + b.sueldoBase,
    adelantos: acc.adelantos + b.adelantos,
    propinas: acc.propinas + b.propinas,
    total: acc.total + b.total,
  }), { citas: 0, ingresos: 0, montoComision: 0, sueldoBase: 0, adelantos: 0, propinas: 0, total: 0 }), [data]);

  const periodo = `${fechaInicio} al ${fechaFin}`;

  const handlePagar = async (barbero) => {
    await addDoc(tenantCol('gastos'), {
      descripcion: `Liquidación ${barbero.nombre} (${periodo})`,
      monto: barbero.total,
      categoria: 'Sueldos',
      tipo: 'liquidacion',
      metodoPago: 'Efectivo',
      fecha: Timestamp.fromDate(new Date(today() + 'T12:00:00')),
      barberoId: barbero.id,
      barberoNombre: barbero.nombre,
      creadoEn: serverTimestamp(),
      creadoPor: user?.uid || 'admin',
      // Audit trail: el barbero acepta la liquidación desde su Inicio. Hasta
      // que lo haga, queda 'pendiente'. Una vez aceptada se sella con uid +
      // timestamp y no se vuelve a mostrar el banner.
      aceptacionBarbero: 'pendiente',
      aceptacionFecha:   null,
      aceptacionUid:     null,
      periodoInicio: fechaInicio,
      periodoFin:    fechaFin,
    });
    setPagados(prev => new Set([...prev, barbero.id]));
  };

  const handleAdelanto = async ({ monto, fecha, metodoPago, nota, cuotas }) => {
    if (!adelantoTarget) return;
    const c = Math.max(1, Math.round(Number(cuotas) || 1));
    const montoPorCuota = c > 1 ? Math.round(monto / c) : monto;
    await addDoc(tenantCol('gastos'), {
      descripcion: `Adelanto ${adelantoTarget.nombre}${c > 1 ? ` (${c} cuotas)` : ''}${nota ? ` — ${nota}` : ''}`,
      monto,
      categoria: 'Sueldos',
      tipo: 'adelanto',
      metodoPago,
      fecha: Timestamp.fromDate(new Date(fecha + 'T12:00:00')),
      barberoId: adelantoTarget.id,
      barberoNombre: adelantoTarget.nombre,
      creadoEn: serverTimestamp(),
      creadoPor: user?.uid || 'admin',
      // Si c > 1, el descuento del bruto del barbero se prorratea: la misma
      // suma `montoPorCuota` aparece en `barbero.adelantos` durante c meses
      // consecutivos desde `fecha`. El gasto en sí (salida de caja) sigue
      // siendo el día `fecha` por el total, eso no cambia.
      cuotasTotal: c,
      montoPorCuota,
    });
    await loadAdelantos();
  };

  // Dispara la descarga de un Blob como archivo.
  const triggerDownload = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadCSV = () => {
    const lines = [];
    const pushRow = (arr) => lines.push(arr.map(csvEscape).join(';'));
    const blank = () => lines.push('');

    pushRow([`Período: ${fechaInicio} al ${fechaFin}`]);
    pushRow([`Neto = Bruto − IVA ${ivaPct}% − comisión POS (Débito ${comDebPct}%, Crédito ${comCredPct}%). Efectivo/transferencia solo descuentan IVA.`]);
    blank();

    /* ── Sección 1: Comisiones por barbero ── */
    pushRow(['COMISIONES POR BARBERO']);
    pushRow(['Barbero', 'Citas', 'Ingresos', 'Comisión %', 'Monto Comisión', 'Sueldo Base', 'Adelantos', 'Total a Pagar']);
    data.forEach(b => pushRow([b.nombre, b.citas, b.ingresos, b.comisionPct, b.montoComision, b.sueldoBase, b.adelantos, b.total]));
    pushRow(['TOTAL', totals.citas, totals.ingresos, '', totals.montoComision, totals.sueldoBase, totals.adelantos, totals.total]);

    /* ── Desglose por medio de pago ── */
    // Normaliza el método de pago de cada cita y resuelve los presentes.
    const ORDEN_METODOS = ['Efectivo', 'Débito', 'Crédito', 'Transferencia'];
    const normMetodo = (m) => {
      const s = String(m || '').trim();
      return s || 'No especificado';
    };
    const presentes = new Set(citas.map(c => normMetodo(c.metodoPago)));
    const metodos = [
      ...ORDEN_METODOS.filter(m => presentes.has(m)),
      ...[...presentes].filter(m => !ORDEN_METODOS.includes(m)).sort(),
    ];

    // Nombre de barbero para una cita (misma lógica de resolución que `data`).
    const barberoNombre = (c) => {
      if (c.barberoId) {
        const b = barberos.find(x => x.id === c.barberoId);
        if (b) return b.nombre || 'Sin nombre';
      }
      if (c.barbero) return c.barbero;
      return 'Sin barbero';
    };

    // Agrega cuántos servicios y cuánto monto hubo por cada llave × método de pago.
    const construirDesglose = (keyFn) => {
      const agg = {};
      citas.forEach(c => {
        const key = keyFn(c) || 'Sin dato';
        const met = normMetodo(c.metodoPago);
        const monto = getPrice(c);
        if (!agg[key]) agg[key] = {};
        if (!agg[key][met]) agg[key][met] = { count: 0, monto: 0 };
        agg[key][met].count += 1;
        agg[key][met].monto += monto;
      });
      return agg;
    };

    // Métodos que cuentan como "tarjeta" → se agregan en una columna combinada.
    const metodosTarjeta = metodos.filter(m => m === 'Débito' || m === 'Crédito');
    const incluyeTarjeta = metodosTarjeta.length > 0;

    // Construye las filas de una tabla de desglose (servicio o trabajador).
    const filasDesglose = (agg, etiquetaCol) => {
      const header = [etiquetaCol];
      metodos.forEach(m => { header.push(`${m} (n°)`, `${m} ($)`); });
      if (incluyeTarjeta) header.push('Débito+Crédito (n°)', 'Débito+Crédito ($)', 'Débito+Crédito Neto ($)');
      header.push('Total servicios', 'Total $');
      pushRow(header);

      const totalGeneral = { count: 0, monto: 0 };
      const totalTarjeta = { count: 0, monto: 0, neto: 0 };
      const totalPorMetodo = {};
      metodos.forEach(m => { totalPorMetodo[m] = { count: 0, monto: 0 }; });

      Object.entries(agg)
        .map(([nombre, porMet]) => {
          const totCount = Object.values(porMet).reduce((s, v) => s + v.count, 0);
          const totMonto = Object.values(porMet).reduce((s, v) => s + v.monto, 0);
          return { nombre, porMet, totCount, totMonto };
        })
        .sort((a, b) => b.totMonto - a.totMonto)
        .forEach(({ nombre, porMet, totCount, totMonto }) => {
          const row = [nombre];
          metodos.forEach(m => {
            const cell = porMet[m] || { count: 0, monto: 0 };
            row.push(cell.count || '', cell.count ? Math.round(cell.monto) : '');
            totalPorMetodo[m].count += cell.count;
            totalPorMetodo[m].monto += cell.monto;
          });
          if (incluyeTarjeta) {
            const tCount = metodosTarjeta.reduce((s, m) => s + (porMet[m]?.count || 0), 0);
            const tMonto = metodosTarjeta.reduce((s, m) => s + (porMet[m]?.monto || 0), 0);
            const tNeto  = metodosTarjeta.reduce((s, m) => s + netoDe(porMet[m]?.monto || 0, m), 0);
            row.push(tCount || '', tCount ? Math.round(tMonto) : '', tCount ? Math.round(tNeto) : '');
            totalTarjeta.count += tCount;
            totalTarjeta.monto += tMonto;
            totalTarjeta.neto  += tNeto;
          }
          row.push(totCount, Math.round(totMonto));
          totalGeneral.count += totCount;
          totalGeneral.monto += totMonto;
          pushRow(row);
        });

      const totalRow = ['TOTAL'];
      metodos.forEach(m => {
        totalRow.push(totalPorMetodo[m].count, Math.round(totalPorMetodo[m].monto));
      });
      if (incluyeTarjeta) totalRow.push(totalTarjeta.count, Math.round(totalTarjeta.monto), Math.round(totalTarjeta.neto));
      totalRow.push(totalGeneral.count, Math.round(totalGeneral.monto));
      pushRow(totalRow);
    };

    /* ── Resumen compacto por barbero (solo montos $) ── */
    // Pocas columnas → legible incluso en visores de CSV del teléfono.
    blank();
    pushRow(['RESUMEN POR BARBERO · MEDIOS DE PAGO ($)']);
    {
      const aggB = construirDesglose(barberoNombre);
      const header = ['Barbero', ...metodos];
      if (incluyeTarjeta) header.push('Débito+Crédito', 'Débito+Crédito Neto');
      header.push('Total');
      pushRow(header);

      const tot = {};
      metodos.forEach(m => { tot[m] = 0; });
      let totTarjeta = 0, totTarjetaNeto = 0, totGeneral = 0;

      Object.entries(aggB)
        .map(([nombre, porMet]) => ({
          nombre, porMet,
          total: Object.values(porMet).reduce((s, v) => s + v.monto, 0),
        }))
        .sort((a, b) => b.total - a.total)
        .forEach(({ nombre, porMet, total }) => {
          const row = [nombre];
          metodos.forEach(m => {
            const monto = porMet[m]?.monto || 0;
            row.push(Math.round(monto));
            tot[m] += monto;
          });
          if (incluyeTarjeta) {
            const t = metodosTarjeta.reduce((s, m) => s + (porMet[m]?.monto || 0), 0);
            const tn = metodosTarjeta.reduce((s, m) => s + netoDe(porMet[m]?.monto || 0, m), 0);
            row.push(Math.round(t), Math.round(tn));
            totTarjeta += t;
            totTarjetaNeto += tn;
          }
          row.push(Math.round(total));
          totGeneral += total;
          pushRow(row);
        });

      const totalRow = ['TOTAL', ...metodos.map(m => Math.round(tot[m]))];
      if (incluyeTarjeta) totalRow.push(Math.round(totTarjeta), Math.round(totTarjetaNeto));
      totalRow.push(Math.round(totGeneral));
      pushRow(totalRow);
    }

    blank();
    pushRow(['DESGLOSE POR SERVICIO Y MEDIO DE PAGO']);
    filasDesglose(construirDesglose(c => c.servicioNombre), 'Servicio');

    blank();
    pushRow(['DESGLOSE POR TRABAJADOR Y MEDIO DE PAGO']);
    filasDesglose(construirDesglose(barberoNombre), 'Trabajador');

    /* ── Desglose por trabajador y servicio ── */
    // Cuántas veces hizo cada servicio cada trabajador y cuánto facturó.
    blank();
    pushRow(['DESGLOSE POR TRABAJADOR Y SERVICIO']);
    pushRow(['Trabajador', 'Servicio', 'Cantidad', 'Monto $']);
    {
      const agg = {}; // agg[trabajador][servicio] = { count, monto }
      citas.forEach(c => {
        const t = barberoNombre(c) || 'Sin barbero';
        const s = c.servicioNombre || 'Sin servicio';
        if (!agg[t]) agg[t] = {};
        if (!agg[t][s]) agg[t][s] = { count: 0, monto: 0 };
        agg[t][s].count += 1;
        agg[t][s].monto += getPrice(c);
      });
      const totalGen = { count: 0, monto: 0 };
      Object.entries(agg)
        .map(([trabajador, servicios]) => {
          const totCount = Object.values(servicios).reduce((acc, v) => acc + v.count, 0);
          const totMonto = Object.values(servicios).reduce((acc, v) => acc + v.monto, 0);
          return { trabajador, servicios, totCount, totMonto };
        })
        .sort((a, b) => b.totMonto - a.totMonto)
        .forEach(({ trabajador, servicios, totCount, totMonto }) => {
          Object.entries(servicios)
            .sort((a, b) => b[1].monto - a[1].monto)
            .forEach(([servicio, v]) => {
              pushRow([trabajador, servicio, v.count, Math.round(v.monto)]);
            });
          pushRow([`Subtotal ${trabajador}`, '', totCount, Math.round(totMonto)]);
          totalGen.count += totCount;
          totalGen.monto += totMonto;
        });
      pushRow(['TOTAL', '', totalGen.count, Math.round(totalGen.monto)]);
    }

    // Separador ';' (predeterminado en Excel es-CL) + BOM UTF-8 para que los
    // acentos se lean bien. OJO: no usar una línea `sep=;`, porque Excel la
    // toma como señal para ignorar el BOM y leer en Latin-1 (rompe acentos).
    const csv = lines.join('\n');
    triggerDownload(
      new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }),
      `comisiones-${fechaInicio}-${fechaFin}.csv`,
    );
  };

  /* ── Reporte HTML (responsivo, no se corta en el teléfono) ──────────── */
  const downloadHTML = () => {
    const esc = (v) => String(v ?? '').replace(/[&<>"]/g, c => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
    ));
    const ORDEN_METODOS = ['Efectivo', 'Débito', 'Crédito', 'Transferencia'];
    const normMetodo = (m) => String(m || '').trim() || 'No especificado';
    const presentes = new Set(citas.map(c => normMetodo(c.metodoPago)));
    const metodos = [
      ...ORDEN_METODOS.filter(m => presentes.has(m)),
      ...[...presentes].filter(m => !ORDEN_METODOS.includes(m)).sort(),
    ];
    const metodosTarjeta = metodos.filter(m => m === 'Débito' || m === 'Crédito');
    const barberoNombre = (c) => {
      if (c.barberoId) {
        const b = barberos.find(x => x.id === c.barberoId);
        if (b) return b.nombre || 'Sin nombre';
      }
      return c.barbero || 'Sin barbero';
    };

    // Acumula medios de pago y servicios por barbero, y por servicio global.
    const porBarbero = {};
    const porServicio = {};
    const totalMetodos = {};
    citas.forEach(c => {
      const n = barberoNombre(c);
      const s = c.servicioNombre || 'Sin servicio';
      const m = normMetodo(c.metodoPago);
      const monto = getPrice(c);

      if (!porBarbero[n]) porBarbero[n] = { metodos: {}, servicios: {} };
      const pb = porBarbero[n];
      if (!pb.metodos[m]) pb.metodos[m] = { count: 0, monto: 0 };
      pb.metodos[m].count += 1; pb.metodos[m].monto += monto;
      if (!pb.servicios[s]) pb.servicios[s] = { count: 0, monto: 0 };
      pb.servicios[s].count += 1; pb.servicios[s].monto += monto;

      if (!porServicio[s]) porServicio[s] = { metodos: {}, count: 0, monto: 0 };
      porServicio[s].count += 1; porServicio[s].monto += monto;
      if (!porServicio[s].metodos[m]) porServicio[s].metodos[m] = { count: 0, monto: 0 };
      porServicio[s].metodos[m].count += 1; porServicio[s].metodos[m].monto += monto;

      if (!totalMetodos[m]) totalMetodos[m] = { count: 0, monto: 0 };
      totalMetodos[m].count += 1; totalMetodos[m].monto += monto;
    });

    // Tabla de medios de pago (cantidad + bruto + neto), con fila Déb+Créd.
    const tablaMetodos = (porMet) => {
      const rows = metodos
        .filter(m => porMet[m])
        .map(m => `<tr><td>${esc(m)}</td><td>${porMet[m].count}</td><td>${formatCLP(porMet[m].monto)}</td><td>${formatCLP(netoDe(porMet[m].monto, m))}</td></tr>`);
      if (metodosTarjeta.length) {
        const tc = metodosTarjeta.reduce((s, m) => s + (porMet[m]?.count || 0), 0);
        const tm = metodosTarjeta.reduce((s, m) => s + (porMet[m]?.monto || 0), 0);
        const tn = metodosTarjeta.reduce((s, m) => s + netoDe(porMet[m]?.monto || 0, m), 0);
        if (tc) rows.push(`<tr class="hl"><td>Débito + Crédito</td><td>${tc}</td><td>${formatCLP(tm)}</td><td>${formatCLP(tn)}</td></tr>`);
      }
      return `<table><tr class="head"><td>Medio</td><td>N°</td><td>Bruto</td><td>Neto</td></tr>${rows.join('')}</table>`;
    };

    const tablaServicios = (servicios) => {
      const rows = Object.entries(servicios)
        .sort((a, b) => b[1].monto - a[1].monto)
        .map(([s, v]) => `<tr><td>${esc(s)}</td><td>${v.count}</td><td>${formatCLP(v.monto)}</td></tr>`);
      return `<table class="t3"><tr class="head"><td>Servicio</td><td>N°</td><td>Monto</td></tr>${rows.join('')}</table>`;
    };

    // Tarjeta por barbero (comisiones + medios de pago + servicios).
    const cardsBarberos = data.map(b => {
      const pb = porBarbero[b.nombre] || { metodos: {}, servicios: {} };
      return `
      <div class="card">
        <h2>${esc(b.nombre)}</h2>
        <p class="sub">${b.citas} cita${b.citas !== 1 ? 's' : ''}</p>
        <div class="kv">
          <span>Ingresos</span><b>${formatCLP(b.ingresos)}</b>
          <span>Comisión (${b.comisionPct}%)</span><b>${formatCLP(b.montoComision)}</b>
          <span>Sueldo base</span><b>${formatCLP(b.sueldoBase)}</b>
          ${b.adelantos > 0 ? `<span>Adelantos</span><b class="neg">− ${formatCLP(b.adelantos)}</b>` : ''}
          <span class="big">Total a pagar</span><b class="big pos">${formatCLP(b.total)}</b>
        </div>
        <h3>Medios de pago</h3>
        ${tablaMetodos(pb.metodos)}
        <h3>Servicios realizados</h3>
        ${tablaServicios(pb.servicios)}
      </div>`;
    }).join('');

    // Tarjeta por servicio (todo el local), con su desglose de medios de pago.
    const cardsServicios = Object.entries(porServicio)
      .sort((a, b) => b[1].monto - a[1].monto)
      .map(([s, v]) => `
      <div class="card">
        <h2>${esc(s)}</h2>
        <p class="sub">${v.count} realizado${v.count !== 1 ? 's' : ''} · ${formatCLP(v.monto)}</p>
        ${tablaMetodos(v.metodos)}
      </div>`).join('');

    const resumenLocal = `
      <div class="card hlcard">
        <h2>Resumen del local</h2>
        <div class="kv">
          <span>Citas completadas</span><b>${totals.citas}</b>
          <span>Ingresos totales</span><b>${formatCLP(totals.ingresos)}</b>
          <span>Total comisiones</span><b>${formatCLP(totals.montoComision)}</b>
          <span>Adelantos</span><b class="neg">− ${formatCLP(totals.adelantos)}</b>
          <span class="big">Total a pagar</span><b class="big pos">${formatCLP(totals.total)}</b>
        </div>
        <h3>Medios de pago (todo el local)</h3>
        ${tablaMetodos(totalMetodos)}
      </div>`;

    const html = `<!doctype html>
<html lang="es"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Comisiones ${esc(fechaInicio)} a ${esc(fechaFin)}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#0f172a;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;padding:16px;line-height:1.4;-webkit-text-size-adjust:100%}
  .wrap{max-width:760px;margin:0 auto}
  h1{font-size:20px;color:#fff;margin-bottom:2px}
  .periodo{color:#94a3b8;font-size:13px;margin-bottom:18px}
  .sechead{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#64748b;margin:22px 0 10px}
  .card{background:#1e293b;border:1px solid #334155;border-radius:14px;padding:16px;margin-bottom:12px}
  .hlcard{border-color:#10b981;background:#10281f}
  .card h2{font-size:16px;color:#fff;margin-bottom:2px;word-break:break-word}
  .sub{color:#94a3b8;font-size:12px;margin-bottom:12px}
  .kv{display:grid;grid-template-columns:1fr auto;gap:6px 12px;font-size:14px;margin-bottom:6px}
  .kv span{color:#94a3b8}
  .kv b{font-weight:600;text-align:right;white-space:nowrap}
  .kv .big{font-size:15px;font-weight:700;padding-top:8px;margin-top:4px;border-top:1px solid #334155}
  .kv span.big{color:#cbd5e1}
  .pos{color:#34d399}
  .neg{color:#fb923c}
  h3{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#64748b;margin:14px 0 6px}
  table{width:100%;border-collapse:collapse;font-size:13.5px;table-layout:fixed}
  td{padding:7px 0;border-bottom:1px solid #334155;vertical-align:top}
  td:first-child{word-break:break-word;padding-right:6px}
  td:nth-child(2){text-align:right;color:#94a3b8;width:34px;white-space:nowrap}
  td:nth-child(3){text-align:right;font-weight:600;white-space:nowrap;padding-left:6px}
  td:nth-child(4){text-align:right;color:#34d399;white-space:nowrap;padding-left:6px}
  table.t3 td:nth-child(2){width:42px}
  tr.head td{color:#64748b;font-size:10.5px;text-transform:uppercase;letter-spacing:.03em;font-weight:700;border-bottom:1px solid #475569}
  tr.hl td{color:#34d399;font-weight:700;border-top:1px solid #475569}
  tr.hl td:nth-child(4){color:#6ee7b7}
  tr:last-child td{border-bottom:none}
  .nota{background:#1e293b;border:1px dashed #475569;border-radius:12px;padding:12px 14px;font-size:12px;color:#94a3b8;margin-bottom:18px;line-height:1.5}
  .nota b{color:#cbd5e1}
  .foot{color:#475569;font-size:11px;text-align:center;margin-top:24px}
</style></head>
<body><div class="wrap">
  <h1>Comisiones por barbero</h1>
  <p class="periodo">Período: ${esc(fechaInicio)} al ${esc(fechaFin)}</p>
  <div class="nota">
    <b>Neto</b> = Bruto − IVA (${esc(ivaPct)}%) − comisión del POS
    (Débito ${esc(comDebPct)}%, Crédito ${esc(comCredPct)}%).
    El <b>Bruto</b> es el valor cobrado al cliente; el <b>Neto</b> es lo que queda
    después de impuestos y comisión de tarjeta. Efectivo y transferencia solo
    descuentan IVA.
  </div>
  ${resumenLocal}
  <div class="sechead">Por barbero</div>
  ${cardsBarberos}
  <div class="sechead">Por servicio (todo el local)</div>
  ${cardsServicios}
  <p class="foot">Generado desde el panel · Barbería</p>
</div></body></html>`;

    triggerDownload(
      new Blob([html], { type: 'text/html;charset=utf-8' }),
      `comisiones-${fechaInicio}-${fechaFin}.html`,
    );
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
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={downloadHTML}
            disabled={data.length === 0}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 disabled:opacity-40 transition-all"
          >
            <FileText size={14} />
            Exportar reporte
          </button>
          <button
            onClick={downloadCSV}
            disabled={data.length === 0}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 disabled:opacity-40 transition-all"
          >
            <Download size={14} />
            Exportar CSV
          </button>
        </div>
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
          <button onClick={() => { loadCitas(); loadAdelantos(); }} disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 disabled:opacity-50 transition-all">
            <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Cargando...' : 'Actualizar'}
          </button>
        </div>
      </div>

      {/* Cálculo del neto (IVA + comisión POS) — se usa al exportar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign size={15} className="text-emerald-400" />
          <p className="text-sm font-bold text-white">Cálculo del neto (para exportar)</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">IVA %</label>
            <input type="number" min="0" step="0.01" value={ivaPct} onChange={e => setIvaPct(e.target.value)}
              className="w-24 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Comisión Débito %</label>
            <input type="number" min="0" step="0.01" value={comDebPct} onChange={e => setComDebPct(e.target.value)}
              className="w-28 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Comisión Crédito %</label>
            <input type="number" min="0" step="0.01" value={comCredPct} onChange={e => setComCredPct(e.target.value)}
              className="w-28 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none" />
          </div>
        </div>
        <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
          El <span className="text-slate-300 font-medium">neto</span> = bruto − IVA − comisión del POS. La comisión solo se aplica a débito/crédito; efectivo y transferencia solo descuentan IVA. Ajusta los valores a los de tu comercio.
        </p>
      </div>

      {/* Summary KPIs */}
      {data.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { icon: Scissors,   color: 'text-blue-400',    bg: 'bg-blue-500/10',    label: 'Citas completadas', value: totals.citas },
            { icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Ingresos totales',  value: formatCLP(totals.ingresos) },
            { icon: DollarSign, color: 'text-amber-400',   bg: 'bg-amber-500/10',   label: 'Total comisiones',  value: formatCLP(totals.montoComision) },
            { icon: Wallet,     color: 'text-orange-400',  bg: 'bg-orange-500/10',  label: 'Adelantos',         value: formatCLP(totals.adelantos) },
            { icon: Banknote,   color: 'text-pink-400',    bg: 'bg-pink-500/10',    label: 'Propinas',          value: formatCLP(totals.propinas) },
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
                  {barbero.adelantos > 0 && (
                    <StatItem label="Adelantos" value={`− ${formatCLP(barbero.adelantos)}`} valueClass="text-orange-400" />
                  )}
                  {barbero.propinas > 0 && (
                    <StatItem label={`Propinas (${barbero.propinasCount})`} value={formatCLP(barbero.propinas)} valueClass="text-pink-400" />
                  )}
                  <div className="min-w-[100px]">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Total a pagar</p>
                    <p className="text-lg font-bold text-emerald-400">{formatCLP(barbero.total)}</p>
                    {barbero.saldoPendiente > 0 && (
                      <p className="text-[10px] font-semibold text-amber-400 mt-0.5">Saldo a favor del local: {formatCLP(barbero.saldoPendiente)}</p>
                    )}
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setAdelantoTarget(barbero)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/30 hover:bg-orange-500/20 transition-all"
                  >
                    <Wallet size={14} /> Adelanto
                  </button>
                  <button
                    onClick={() => setPagarTarget(barbero)}
                    disabled={pagados.has(barbero.id) || barbero.total === 0}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border ${
                      pagados.has(barbero.id) || barbero.total === 0
                        ? 'bg-slate-800/50 text-slate-500 border-slate-700 cursor-default'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                    }`}
                  >
                    {pagados.has(barbero.id) ? <><CheckCircle2 size={14} /> Registrado</> : <><DollarSign size={14} /> Registrar pago</>}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Propinas — sección dedicada con CSV propio */}
      {totals.propinas > 0 && (
        <div className="bg-slate-900 border border-pink-500/20 rounded-xl p-4 mt-4">
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Banknote size={16} className="text-pink-400" />
              <h2 className="text-sm font-bold text-white">Propinas del período</h2>
              <span className="text-[10px] text-slate-500 bg-slate-800 rounded-full px-2 py-0.5">no son ingreso del local</span>
            </div>
            <button
              onClick={() => {
                const lines = [];
                const push = arr => lines.push(arr.map(csvEscape).join(';'));
                push([`Propinas del período ${fechaInicio} al ${fechaFin}`]);
                push(['Las propinas son del equipo, no son ingreso del local.']);
                lines.push('');
                push(['Barbero', 'Citas con propina', 'Total propinas', 'Promedio por cita']);
                data
                  .filter(b => b.propinas > 0)
                  .forEach(b => push([
                    b.nombre, b.propinasCount, b.propinas,
                    b.propinasCount ? Math.round(b.propinas / b.propinasCount) : 0,
                  ]));
                push(['TOTAL', data.reduce((s, b) => s + b.propinasCount, 0), totals.propinas, '']);
                triggerDownload(
                  new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' }),
                  `propinas-${fechaInicio}-${fechaFin}.csv`,
                );
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-pink-500/10 text-pink-400 hover:bg-pink-500/20 border border-pink-500/30 transition-all"
            >
              <Download size={12} /> CSV propinas
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
                  <th className="text-left font-bold py-2">Barbero</th>
                  <th className="text-right font-bold py-2">Citas con propina</th>
                  <th className="text-right font-bold py-2">Total</th>
                  <th className="text-right font-bold py-2 hidden sm:table-cell">Promedio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {data.filter(b => b.propinas > 0).map(b => (
                  <tr key={b.id}>
                    <td className="py-2 text-white font-medium">{b.nombre}</td>
                    <td className="py-2 text-right text-slate-400 tabular-nums">{b.propinasCount}</td>
                    <td className="py-2 text-right font-bold text-pink-400 tabular-nums">{formatCLP(b.propinas)}</td>
                    <td className="py-2 text-right text-slate-400 tabular-nums hidden sm:table-cell">
                      {b.propinasCount ? formatCLP(Math.round(b.propinas / b.propinasCount)) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-700">
                  <td className="py-2 font-bold text-white">Total</td>
                  <td className="py-2 text-right text-slate-400 tabular-nums">{data.reduce((s, b) => s + b.propinasCount, 0)}</td>
                  <td className="py-2 text-right font-black text-pink-300 tabular-nums">{formatCLP(totals.propinas)}</td>
                  <td className="py-2 text-right hidden sm:table-cell" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Modales */}
      {adelantoTarget && (
        <AdelantoModal
          barbero={adelantoTarget}
          onConfirm={handleAdelanto}
          onClose={() => setAdelantoTarget(null)}
        />
      )}
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

function StatItem({ label, value, valueClass = 'text-white' }) {
  return (
    <div className="min-w-[100px]">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`text-sm font-bold mt-0.5 ${valueClass}`}>{value}</p>
    </div>
  );
}
