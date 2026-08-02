import { useState, useMemo, useCallback, useEffect } from 'react';
import { getDocs, getDoc, setDoc, query, where, addDoc, deleteDoc, doc, serverTimestamp, Timestamp } from 'firebase/firestore';
import {
  DollarSign, Download, RefreshCcw, ChevronDown, CheckCircle2,
  Scissors, User, AlertCircle, Banknote, TrendingUp, Calendar, Wallet, FileText,
  Plus, Minus, Trash2, Pencil,
} from 'lucide-react';
import { db } from '../lib/firebase';
import { tenantCol, tenantDoc } from '../lib/tenantUtils';
import { SheetModal, sheetBtn, sheetInput, sheetLabel, sheetHighlight } from '../components/ui/SheetModal';
import SlideOver from '../components/ui/SlideOver';
import { withTimeout } from '../lib/firestore-helpers';
import { useCollection } from '../hooks/useCollection';
import { comisionCita, comisionVenta } from '../lib/comisiones-core';
import { useAuth } from '../contexts/AuthContext';
import { useSucursal } from '../contexts/SucursalContext';

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
//  `adelanto` opcional → si viene, es edición (soporta actualizar los
//  campos y hasta reasignar cuotas). Sin él, es creación nueva.
function AdelantoModal({ barbero, adelanto, onConfirm, onClose }) {
  const editing = !!adelanto;
  const [monto, setMonto] = useState(editing ? String(adelanto.monto) : '');
  const [fecha, setFecha] = useState(editing ? (fechaToStr(adelanto.fecha) || today()) : today());
  const [metodoPago, setMetodoPago] = useState(editing ? (adelanto.metodoPago || 'Efectivo') : 'Efectivo');
  // Notas: al crear se persiste como parte de la descripción. Al editar,
  // separamos la nota original de la descripción "Adelanto NOMBRE" prefix.
  const notaInicial = editing
    ? String(adelanto.descripcion || '').replace(/^Adelanto [^—]*—\s*/i, '').trim()
    : '';
  const [nota, setNota] = useState(notaInicial);
  // Cuotas: 1 = adelanto plano (se descuenta todo del próximo pago). N > 1
  // distribuye el descuento en N meses consecutivos a partir de `fecha`.
  // La salida de caja sigue siendo el día `fecha` por el total.
  const [cuotas, setCuotas] = useState(editing ? (Number(adelanto.cuotasTotal) || 1) : 1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handle = async () => {
    const m = parseFloat(monto);
    if (!m || m <= 0) { setError('El monto debe ser mayor a 0.'); return; }
    const c = Math.max(1, Math.min(36, Math.round(Number(cuotas) || 1)));
    setLoading(true);
    setError('');
    try {
      await onConfirm({
        id: adelanto?.id || null,
        monto: Math.round(m), fecha, metodoPago, nota: nota.trim(), cuotas: c,
      });
      onClose();
    } catch {
      setError('Error al registrar. Intenta de nuevo.');
      setLoading(false);
    }
  };

  const montoNum = parseFloat(monto);
  const montoPorCuota = montoNum > 0 && cuotas > 1 ? Math.round(montoNum / cuotas) : null;

  return (
    <SheetModal
      icon={Wallet}
      tone="amber"
      titulo={editing ? 'Editar adelanto' : 'Registrar adelanto'}
      sub={barbero.nombre}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className={`${sheetBtn.base} ${sheetBtn.ghost}`}>Cancelar</button>
          <button onClick={handle} disabled={loading} className={`${sheetBtn.base} ${sheetBtn.warn}`}>
            {loading ? 'Guardando…' : (editing ? 'Guardar' : 'Registrar')}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={sheetLabel}>Monto ($)</label>
          <input className={sheetInput} type="number" min="1" step="1" placeholder="0" autoFocus
            value={monto} onChange={e => setMonto(e.target.value)} />
        </div>
        <div>
          <label className={sheetLabel}>Fecha</label>
          <input className={sheetInput} type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
        </div>
      </div>

      <div>
        <label className={sheetLabel}>Método de pago</label>
        <select className={sheetInput} value={metodoPago} onChange={e => setMetodoPago(e.target.value)}>
          {METODOS_PAGO.map(m => <option key={m}>{m}</option>)}
        </select>
      </div>

      <div>
        <label className={sheetLabel}>Nota (opcional)</label>
        <input className={sheetInput} placeholder="Ej: adelanto quincena" value={nota} onChange={e => setNota(e.target.value)} />
      </div>

      <div>
        <label className={sheetLabel}>Cuotas para descontar</label>
        <div className="flex items-center gap-2.5">
          <input className={sheetInput} type="number" min="1" max="36" step="1"
            value={cuotas} onChange={e => setCuotas(e.target.value)} />
          <span className="whitespace-nowrap text-[13px] text-slate-500">
            {cuotas == 1 ? 'sin cuotas' : `× ${cuotas} meses`}
          </span>
        </div>
        {montoPorCuota && (
          <p className="mt-2 px-1 text-[12.5px] leading-snug text-amber-300">
            Se descontarán <strong>{formatCLP(montoPorCuota)}</strong> de la liquidación de cada uno de los próximos {cuotas} períodos.
          </p>
        )}
      </div>

      <p className="px-1 text-[12.5px] leading-relaxed text-slate-500">
        Se registra como gasto en <span className="font-medium text-slate-400">Sueldos</span> el día indicado.{' '}
        {cuotas == 1
          ? 'Se descuenta entero del próximo pago al barbero.'
          : 'El descuento se prorratea en las cuotas indicadas.'}
      </p>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-[12.5px] text-rose-400">
          <AlertCircle size={14} className="shrink-0" /> {error}
        </div>
      )}
    </SheetModal>
  );
}

/* ── ConciliarTuuModal ────────────────────────────────────────────── */
//  Importa el CSV de exportación de TUU (POS chileno común) y matchea
//  cada transacción contra las citas del período con método débito/
//  crédito. Reporta: OK, diferencia de monto, huérfano en TUU, falta en
//  TUU. No persiste — es análisis efímero, se descarga como CSV.
//
//  Formatos aceptados: separador auto-detectado (';' o ','), headers
//  case-insensitive. Busca columnas por sinónimos comunes: fecha, monto,
//  hora (opcional), tipo/medio (opcional).
function ConciliarTuuModal({ citas, precioServicio, fechaInicio, fechaFin, onClose }) {
  const [file, setFile]         = useState(null);
  const [rows, setRows]         = useState([]);
  const [error, setError]       = useState('');
  const [parsing, setParsing]   = useState(false);
  const [toleranciaMin, setTolMin] = useState(30); // ventana ± minutos para match por hora

  const handleFile = (f) => {
    setError(''); setRows([]); setFile(f);
    if (!f) return;
    setParsing(true);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const txt = String(reader.result || '');
        const parsed = parseTuuCsv(txt);
        if (!parsed.length) throw new Error('No se detectaron transacciones. Verifica que el archivo tenga columnas de fecha y monto.');
        setRows(parsed);
      } catch (e) {
        setError(e.message || 'No se pudo leer el archivo.');
      } finally {
        setParsing(false);
      }
    };
    reader.onerror = () => { setError('Error leyendo el archivo.'); setParsing(false); };
    reader.readAsText(f, 'utf-8');
  };

  // Match cada transacción de TUU contra citas del rango con método tarjeta.
  //
  // Split de pago (pagos[]): una misma cita puede tener parte débito, parte
  // crédito, parte efectivo. TUU exporta una fila por swipe, así que cada fila
  // Débito/Crédito del split se explota como pseudo-cita separada — así el
  // matcheo por monto exacto ($3000 débito ≠ $8000 total) sigue funcionando.
  const conciliacion = useMemo(() => {
    if (!rows.length) return { transacciones: [], huerfanasEnAgenda: [] };
    const citasTarjeta = [];
    citas.forEach(c => {
      const meta = {
        id: c.id, fecha: c.fecha, hora: c.hora,
        cliente: c.clienteNombre || c.nombre || '',
      };
      if (Array.isArray(c.pagos) && c.pagos.length) {
        c.pagos.forEach((p, idx) => {
          if (p.tipo === 'Débito' || p.tipo === 'Crédito') {
            citasTarjeta.push({
              ...meta,
              // ID compuesto para no confundir 2 swipes de la misma cita.
              id:     `${c.id}#${idx}`,
              metodo: p.tipo,
              monto:  Math.round(Number(p.monto) || 0),
              matched: false,
            });
          }
        });
      } else if (c.metodoPago === 'Débito' || c.metodoPago === 'Crédito') {
        citasTarjeta.push({
          ...meta,
          metodo:  c.metodoPago,
          monto:   precioServicio(c),
          matched: false,
        });
      }
    });
    const transacciones = rows.map(r => {
      // Match: mismo día + monto exacto (± $1 para redondeos). Si hora en TUU,
      // preferir la cita con hora más cercana dentro de toleranciaMin.
      const candidatos = citasTarjeta.filter(c =>
        !c.matched && c.fecha === r.fecha && Math.abs(c.monto - r.monto) <= 1,
      );
      let match = null;
      if (candidatos.length) {
        if (r.hora) {
          const minsTuu = tuuHoraToMins(r.hora);
          const conDist = candidatos.map(c => ({ c, dist: Math.abs(citaHoraToMins(c.hora) - minsTuu) }))
                                    .sort((a, b) => a.dist - b.dist);
          if (conDist[0] && conDist[0].dist <= toleranciaMin) match = conDist[0].c;
        } else {
          match = candidatos[0];
        }
      }
      if (match) match.matched = true;
      return {
        tuu: r,
        status: match ? 'ok' : 'huerfano_en_tuu',
        match,
      };
    });
    const huerfanasEnAgenda = citasTarjeta.filter(c => !c.matched);
    return { transacciones, huerfanasEnAgenda };
  }, [rows, citas, precioServicio, toleranciaMin]);

  const stats = useMemo(() => ({
    total:     conciliacion.transacciones.length,
    ok:        conciliacion.transacciones.filter(t => t.status === 'ok').length,
    huerfanas: conciliacion.transacciones.filter(t => t.status === 'huerfano_en_tuu').length,
    faltantes: conciliacion.huerfanasEnAgenda.length,
    montoTuu:      conciliacion.transacciones.reduce((s, t) => s + t.tuu.monto, 0),
    montoMatched:  conciliacion.transacciones.filter(t => t.match).reduce((s, t) => s + t.tuu.monto, 0),
    montoFaltantes: conciliacion.huerfanasEnAgenda.reduce((s, c) => s + c.monto, 0),
  }), [conciliacion]);

  const descargar = () => {
    const rows = [];
    const push = arr => rows.push(arr.map(csvEscape).join(';'));
    push([`Conciliación TUU ↔ Agenda · ${fechaInicio} al ${fechaFin}`]);
    push([`Total TUU: ${stats.total} · OK: ${stats.ok} · Huérfanas TUU: ${stats.huerfanas} · Faltan en TUU: ${stats.faltantes}`]);
    rows.push('');
    push(['Fuente', 'Fecha', 'Hora', 'Monto', 'Estado', 'Cliente cita', 'Detalle']);
    conciliacion.transacciones.forEach(t => push([
      'TUU', t.tuu.fecha, t.tuu.hora || '', t.tuu.monto,
      t.status === 'ok' ? 'OK · conciliado' : 'HUÉRFANO · no está en la agenda',
      t.match?.cliente || '',
      t.tuu.raw || '',
    ]));
    conciliacion.huerfanasEnAgenda.forEach(c => push([
      'Agenda', c.fecha, c.hora, c.monto, 'FALTA EN TUU · cita cobrada con tarjeta sin match',
      c.cliente, `${c.metodo}`,
    ]));
    const blob = new Blob(['﻿' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `conciliacion-tuu-${fechaInicio}_${fechaFin}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <SlideOver
      isOpen
      onClose={onClose}
      maxWidth="max-w-3xl"
      title="Conciliar con POS (TUU, Transbank, etc.)"
      subtitle={`Rango del análisis: ${fechaInicio} al ${fechaFin} · matches contra citas con método Débito o Crédito`}
      footer={
        <div className="flex justify-between items-center gap-3">
          <button onClick={descargar} disabled={!rows.length}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 disabled:opacity-40">
            <Download size={14} /> Descargar reporte
          </button>
          <button onClick={onClose} className={`${sheetBtn.base} ${sheetBtn.ghost}`}>Cerrar</button>
        </div>
      }
    >
      {/* Upload */}
      <div className="rounded-xl border border-dashed border-slate-700 p-5 mb-5 text-center bg-slate-800/30">
        <p className="text-[13px] text-slate-300 mb-3">
          Sube el CSV exportado desde el portal de TUU. Solo se compara con las citas ya cargadas en el rango de fechas de la vista.
        </p>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={e => handleFile(e.target.files?.[0] || null)}
          className="block mx-auto text-[12.5px] text-slate-300
                     file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0
                     file:text-sm file:font-semibold file:bg-slate-700 file:text-slate-200
                     hover:file:bg-slate-600 cursor-pointer"
        />
        {file && !error && (
          <p className="text-[11px] text-slate-500 mt-2">
            {file.name} · {parsing ? 'procesando…' : `${rows.length} transacciones detectadas`}
          </p>
        )}
        <div className="flex items-center justify-center gap-2 mt-3 text-[11.5px] text-slate-500">
          <label>Tolerancia hora ±</label>
          <input type="number" min="0" max="120" value={toleranciaMin} onChange={e => setTolMin(Number(e.target.value) || 0)}
            className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-300 text-center" />
          <span>min</span>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-[13px] text-rose-400 flex items-center gap-2 mb-4">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* Resultados */}
      {rows.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5 text-[12px]">
            <StatBox label="Transacciones TUU" val={stats.total} tone="slate" />
            <StatBox label="Conciliadas" val={stats.ok} tone="emerald" />
            <StatBox label="Huérfanas TUU" val={stats.huerfanas} tone="amber"
              hint="Están en TUU pero no coinciden con ninguna cita" />
            <StatBox label="Faltan en TUU" val={stats.faltantes} tone="rose"
              hint="Citas cobradas con tarjeta que no aparecen en TUU" />
          </div>

          {stats.huerfanas > 0 && (
            <section className="mb-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-2">Huérfanas en TUU (revisar)</h3>
              <div className="rounded-lg border border-amber-500/25 overflow-x-auto">
                <table className="w-full text-[12.5px]">
                  <thead className="bg-slate-800/60 text-[10px] uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="text-left py-2 px-3 font-semibold">Fecha</th>
                      <th className="text-left py-2 px-3 font-semibold">Hora</th>
                      <th className="text-right py-2 px-3 font-semibold">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {conciliacion.transacciones.filter(t => t.status === 'huerfano_en_tuu').map((t, i) => (
                      <tr key={i} className="hover:bg-slate-800/30">
                        <td className="py-1.5 px-3 text-slate-400">{t.tuu.fecha}</td>
                        <td className="py-1.5 px-3 text-slate-500">{t.tuu.hora || '—'}</td>
                        <td className="py-1.5 px-3 text-right text-amber-400 tabular-nums font-semibold">{formatCLP(t.tuu.monto)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {stats.faltantes > 0 && (
            <section className="mb-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-rose-400 mb-2">Faltan en TUU (cobradas con tarjeta en agenda)</h3>
              <div className="rounded-lg border border-rose-500/25 overflow-x-auto">
                <table className="w-full text-[12.5px]">
                  <thead className="bg-slate-800/60 text-[10px] uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="text-left py-2 px-3 font-semibold">Fecha · Hora</th>
                      <th className="text-left py-2 px-3 font-semibold">Cliente</th>
                      <th className="text-left py-2 px-3 font-semibold">Método</th>
                      <th className="text-right py-2 px-3 font-semibold">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {conciliacion.huerfanasEnAgenda.map(c => (
                      <tr key={c.id} className="hover:bg-slate-800/30">
                        <td className="py-1.5 px-3 text-slate-400 whitespace-nowrap">{c.fecha} · {c.hora}</td>
                        <td className="py-1.5 px-3 text-slate-300 truncate max-w-[180px]" title={c.cliente}>{c.cliente}</td>
                        <td className="py-1.5 px-3 text-slate-500">{c.metodo}</td>
                        <td className="py-1.5 px-3 text-right text-rose-400 tabular-nums font-semibold">{formatCLP(c.monto)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </SlideOver>
  );
}

function StatBox({ label, val, tone, hint }) {
  const toneMap = {
    slate:   'border-slate-700 text-slate-200',
    emerald: 'border-emerald-500/30 text-emerald-400',
    amber:   'border-amber-500/30 text-amber-400',
    rose:    'border-rose-500/30 text-rose-400',
  };
  return (
    <div className={`rounded-lg border ${toneMap[tone]} bg-slate-900 p-3`}>
      <p className="text-[10px] uppercase tracking-wide text-slate-500 font-bold">{label}</p>
      <p className={`text-lg font-bold mt-0.5 tabular-nums ${toneMap[tone].split(' ').pop()}`}>{val}</p>
      {hint && <p className="text-[10.5px] text-slate-500 mt-1 leading-tight">{hint}</p>}
    </div>
  );
}

// ── Parser CSV TUU (flexible) ─────────────────────────────────────
//  Auto-detecta separador ; o ,. Match de columnas por sinónimos
//  case-insensitive. Devuelve { fecha:YYYY-MM-DD, hora:HH:MM?, monto:number, raw }.
function parseTuuCsv(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const sep = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ';' : ',';
  const splitLine = (line) => {
    // parser CSV mínimo que respeta comillas
    const out = []; let cur = ''; let q = false;
    for (const ch of line) {
      if (ch === '"') q = !q;
      else if (ch === sep && !q) { out.push(cur); cur = ''; }
      else cur += ch;
    }
    out.push(cur);
    return out.map(s => s.trim().replace(/^"|"$/g, ''));
  };
  const header = splitLine(lines[0]).map(h => h.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''));
  const findCol = (candidatos) => header.findIndex(h => candidatos.some(c => h.includes(c)));
  const iFecha = findCol(['fecha']);
  const iMonto = findCol(['monto', 'total', 'importe', 'valor']);
  const iHora  = findCol(['hora']);
  if (iFecha < 0 || iMonto < 0) return []; // sin columnas mínimas
  const out = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitLine(lines[i]);
    const fechaRaw = cells[iFecha]; const montoRaw = cells[iMonto];
    const horaRaw = iHora >= 0 ? cells[iHora] : '';
    const fecha = normalizarFecha(fechaRaw);
    const monto = normalizarMonto(montoRaw);
    if (!fecha || monto <= 0) continue;
    out.push({ fecha, hora: normalizarHora(horaRaw), monto, raw: lines[i].slice(0, 100) });
  }
  return out;
}
function normalizarFecha(s) {
  if (!s) return '';
  // ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  // DD/MM/YYYY o DD-MM-YYYY
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (m) {
    const dd = m[1].padStart(2, '0');
    const mm = m[2].padStart(2, '0');
    let yyyy = m[3];
    if (yyyy.length === 2) yyyy = '20' + yyyy;
    return `${yyyy}-${mm}-${dd}`;
  }
  return '';
}
function normalizarHora(s) {
  if (!s) return '';
  const m = String(s).match(/(\d{1,2}):(\d{2})/);
  if (!m) return '';
  return `${m[1].padStart(2, '0')}:${m[2]}`;
}
function normalizarMonto(s) {
  if (!s) return 0;
  // Quitar $, espacios, . de miles. Aceptar , decimal (Chile) → convertir a punto.
  const clean = String(s).replace(/[$\s]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const n = Number(clean);
  return Number.isFinite(n) ? Math.round(n) : 0;
}
function tuuHoraToMins(h) { const [hh, mm] = String(h).split(':').map(Number); return (hh || 0) * 60 + (mm || 0); }
function citaHoraToMins(h) { return tuuHoraToMins(h); }

/* ── ComisionManualModal ──────────────────────────────────────────── */
//  Ajustes al pago del barbero fuera de citas: cortes previos a la agenda,
//  bonificaciones puntuales, correcciones, descuentos por daños, etc.
//  Se guardan como `gastos` con tipo='comisionManual' (misma infra que
//  adelantos). El `signo` decide si suma o resta al pago del período.
function ComisionManualModal({ barbero, ajuste, onConfirm, onClose }) {
  const editing = !!ajuste;
  const [monto, setMonto]       = useState(editing ? String(ajuste.monto) : '');
  const [signo, setSigno]       = useState(editing ? (ajuste.signo || '+') : '+');
  const [concepto, setConcepto] = useState(editing ? (ajuste.concepto || '') : '');
  const [fecha, setFecha]       = useState(editing
    ? fechaToStr(ajuste.fecha) || today()
    : today());
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handle = async () => {
    const m = parseFloat(monto);
    if (!m || m <= 0)          { setError('El monto debe ser mayor a 0.'); return; }
    if (!concepto.trim())      { setError('Ingresa un concepto.'); return; }
    setLoading(true); setError('');
    try {
      await onConfirm({ monto: Math.round(m), signo, concepto: concepto.trim(), fecha });
      onClose();
    } catch {
      setError('Error al registrar. Intenta de nuevo.');
      setLoading(false);
    }
  };

  return (
    <SheetModal
      icon={FileText}
      tone={signo === '+' ? 'emerald' : 'amber'}
      titulo={editing ? 'Editar ajuste manual' : 'Ajuste manual de pago'}
      sub={barbero.nombre}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className={`${sheetBtn.base} ${sheetBtn.ghost}`}>Cancelar</button>
          <button onClick={handle} disabled={loading} className={`${sheetBtn.base} ${signo === '+' ? sheetBtn.primary : sheetBtn.warn}`}>
            {loading ? 'Guardando…' : (editing ? 'Guardar' : 'Registrar')}
          </button>
        </>
      }
    >
      <div>
        <label className={sheetLabel}>Tipo</label>
        <div className="flex gap-2">
          <button type="button" onClick={() => setSigno('+')}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold border transition-colors ${
              signo === '+'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                : 'bg-slate-800/50 text-slate-500 border-slate-700 hover:bg-slate-800'
            }`}>
            <Plus size={14} className="inline -mt-0.5 mr-1" /> Suma al pago
          </button>
          <button type="button" onClick={() => setSigno('-')}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold border transition-colors ${
              signo === '-'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                : 'bg-slate-800/50 text-slate-500 border-slate-700 hover:bg-slate-800'
            }`}>
            <Minus size={14} className="inline -mt-0.5 mr-1" /> Descuento del pago
          </button>
        </div>
      </div>

      <div>
        <label className={sheetLabel}>Concepto</label>
        <input className={sheetInput} placeholder="Ej: Cortes previos a la agenda" autoFocus
          value={concepto} onChange={e => setConcepto(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={sheetLabel}>Monto ($)</label>
          <input className={sheetInput} type="number" min="1" step="1" placeholder="0"
            value={monto} onChange={e => setMonto(e.target.value)} />
        </div>
        <div>
          <label className={sheetLabel}>Fecha</label>
          <input className={sheetInput} type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
        </div>
      </div>

      <p className="px-1 text-[12.5px] leading-relaxed text-slate-500">
        {signo === '+'
          ? 'Se suma al pago del barbero del período que contiene esta fecha. Útil para cortes previos a la agenda, servicios informales o bonificaciones puntuales.'
          : 'Se descuenta del pago del barbero. Útil para daños, correcciones a favor del local o ajustes contables.'}
      </p>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-[12.5px] text-rose-400">
          <AlertCircle size={14} className="shrink-0" /> {error}
        </div>
      )}
    </SheetModal>
  );
}

/* ── DetalleBarberoDrawer ─────────────────────────────────────────── */
//  Drill-down: al abrirlo desde el card, muestra TODAS las citas + ventas
//  + ajustes + adelantos del barbero en el período. Permite al dueño y al
//  barbero verificar exactamente por qué se paga X. Pedido #3 de OREN.
function DetalleBarberoDrawer({
  isOpen, onClose, barbero, citas, ventas, adelantos,
  precioServicio, precioVenta, fechaInicio, fechaFin,
  onEditarAdelanto, onBorrarAdelanto,
}) {
  const detalle = useMemo(() => {
    if (!barbero) return { citas: [], ventas: [], adelantos: [] };
    // Filtrar por el ID del barbero. Alineado con `resolverBarbero` del memo
    // principal: primero por barberoId exacto, luego por barberoNombre.
    const matchCita = c => (c.barberoId === barbero.id) || (!c.barberoId && c.barbero === barbero.nombre);
    const matchVenta = v => (v.barberoId === barbero.id) || (!v.barberoId && v.barberoNombre === barbero.nombre);
    // Las reglas salen de lib/comisiones-core.js, las mismas que usa la tarjeta.
    // Antes esto era una segunda implementación y ya había derivado: un
    // override negativo caía al global en la tarjeta y se usaba tal cual acá.
    const citasB = citas
      .filter(matchCita)
      .map(c => {
        const precio = precioServicio(c);
        const nombre = String(c.clienteNombre || c.nombre || '').trim();
        const r = comisionCita({ cfg: barbero, precio, servicioId: c.servicioId, clienteNombre: nombre });
        return {
          id: c.id, fecha: c.fecha, hora: c.hora,
          cliente: nombre || 'Sin nombre',
          // El servicio extra viaja en el nombre ("Corte + Perfilado"): su
          // monto ya está dentro de `precio` (total) y la comisión se calcula
          // sobre ese total, así que solo faltaba DECIRLO en la fila.
          servicio: (c.servicioNombre || c.servicio || '')
            + (Array.isArray(c.serviciosExtra) && c.serviciosExtra.length
               ? ' + ' + c.serviciosExtra.map(e => e.nombre).join(' + ') : ''),
          servicioId: c.servicioId,
          metodoPago: c.metodoPago || 'Sin dato',
          cortesia: !!c.cortesia,
          precio,
          pct: r.pct,
          // Se redondea solo para mostrar la fila. El total de la tarjeta acumula
          // en exacto, así que la suma de filas puede quedar a un peso.
          comision: Math.round(r.comision),
          cp: r.cp,
          arriendo: r.arriendo,
          propina: Number(c.propina) || 0,
        };
      })
      .sort((a, b) => (a.fecha + ' ' + a.hora).localeCompare(b.fecha + ' ' + b.hora));

    const ventasB = ventas
      .filter(matchVenta)
      .map(v => {
        const monto = precioVenta(v);
        const r = comisionVenta({ cfg: barbero, monto, productId: v.productId });
        const pct = r.pct;
        return {
          id: v.id,
          fecha: fechaToStr(v.fecha || v.createdAt || v.creadoEn),
          producto: v.productoNombre || v.productName || v.producto || 'Producto',
          cantidad: Number(v.cantidad) || 1,
          // No se muestra como columna, pero alimenta el desglose por medio
          // de pago: sin esto el resumen dejaría fuera la plata de productos.
          metodoPago: v.metodoPago || 'Sin dato',
          monto,
          pct,
          comision: Math.round(r.comision),
        };
      })
      .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));

    const adelantosB = adelantos
      .filter(a => a.barberoId === barbero.id)
      .map(a => ({
        id: a.id,
        fecha: fechaToStr(a.fecha),
        monto: Number(a.monto) || 0,
        cuotasTotal: Math.max(1, Number(a.cuotasTotal) || 1),
        montoPorCuota: Number(a.montoPorCuota) || (Number(a.monto) || 0),
        nota: a.descripcion || '',
        metodoPago: a.metodoPago || 'Efectivo',
        descripcion: a.descripcion || '',
      }))
      .filter(a => {
        // Adelanto de una sola cuota: entra si su fecha está en el rango.
        if (a.cuotasTotal <= 1) return a.fecha >= fechaInicio && a.fecha <= fechaFin;
        // Multicuota: entra si alguna de sus cuotas cae en el rango.
        const base = new Date((a.fecha || today()) + 'T12:00:00');
        for (let i = 0; i < a.cuotasTotal; i++) {
          const d = new Date(base.getFullYear(), base.getMonth() + i, base.getDate());
          const ymd = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
          if (ymd >= fechaInicio && ymd <= fechaFin) return true;
        }
        return false;
      })
      .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));

    return { citas: citasB, ventas: ventasB, adelantos: adelantosB };
  }, [barbero, citas, ventas, adelantos, precioServicio, precioVenta, fechaInicio, fechaFin]);

  // ── Desglose por medio de pago ────────────────────────────────────
  // Son montos COBRADOS AL CLIENTE (precio de la cita / de la venta), no
  // comisión: responden "¿con qué se pagó?" para cuadrar la caja del
  // período. Suma citas + ventas de productos porque ambas son plata que
  // pasó por las manos del profesional.
  const ORDEN_METODOS = ['Efectivo', 'Débito', 'Crédito', 'Transferencia'];
  const porMetodo = useMemo(() => {
    const agg = {};
    const sumar = (metodo, monto) => {
      const m = String(metodo || '').trim() || 'Sin dato';
      if (!agg[m]) agg[m] = { count: 0, monto: 0 };
      agg[m].count += 1;
      agg[m].monto += Number(monto) || 0;
    };
    detalle.citas.forEach(c => sumar(c.metodoPago, c.precio));
    detalle.ventas.forEach(v => sumar(v.metodoPago, v.monto));
    // Orden fijo para los conocidos; cualquier método libre que el local
    // haya escrito a mano va después, alfabético.
    return [
      ...ORDEN_METODOS.filter(m => agg[m]),
      ...Object.keys(agg).filter(m => !ORDEN_METODOS.includes(m)).sort(),
    ].map(m => ({ metodo: m, ...agg[m] }));
  }, [detalle]);

  const exportCSV = () => {
    if (!barbero) return;
    const rows = [];
    const push = arr => rows.push(arr.map(csvEscape).join(';'));
    push([`Detalle de ${barbero.nombre} · ${fechaInicio} al ${fechaFin}`]);
    rows.push('');
    push(['CITAS']);
    push(['Fecha', 'Hora', 'Cliente', 'Servicio', 'Método', 'Precio', '% Comisión', 'Comisión $', 'Propina']);
    detalle.citas.forEach(c => push([c.fecha, c.hora, c.cliente, c.servicio + (c.cortesia ? ' (cortesía)' : ''), c.metodoPago, c.precio, c.pct, c.comision, c.propina]));
    if (detalle.ventas.length) {
      rows.push('');
      push(['VENTAS DE PRODUCTOS']);
      push(['Fecha', 'Producto', 'Cantidad', 'Monto', '% Comisión', 'Comisión $']);
      detalle.ventas.forEach(v => push([v.fecha, v.producto, v.cantidad, v.monto, v.pct, v.comision]));
    }
    if (barbero.ajustesLineas.length) {
      rows.push('');
      push(['AJUSTES MANUALES']);
      push(['Fecha', 'Tipo', 'Concepto', 'Monto']);
      barbero.ajustesLineas.forEach(l => push([l.fecha, l.signo === '+' ? 'Suma' : 'Descuento', l.concepto, l.monto]));
    }
    if (detalle.adelantos.length) {
      rows.push('');
      push(['ADELANTOS DEL PERÍODO']);
      push(['Fecha', 'Monto', 'Cuotas', 'Descripción']);
      detalle.adelantos.forEach(a => push([a.fecha, a.monto, a.cuotasTotal, a.nota]));
    }
    if (porMetodo.length) {
      rows.push('');
      push(['COBRADO POR MEDIO DE PAGO']);
      push(['Método', 'Cobros', 'Monto']);
      porMetodo.forEach(m => push([m.metodo, m.count, m.monto]));
    }
    rows.push('');
    push(['RESUMEN']);
    push(['Ingresos servicios', barbero.ingresosServicios]);
    push(['Comisión servicios', barbero.comisionServicios]);
    push(['Ingresos productos', barbero.ingresosProductos]);
    push(['Comisión productos', barbero.comisionProductos]);
    push(['Sueldo base', barbero.sueldoBase]);
    push(['Ajustes +', barbero.ajustesSuma]);
    push(['Ajustes −', barbero.ajustesResta]);
    push(['Adelantos', barbero.adelantos]);
    if (barbero.arriendoTotal > 0) push(['Arriendo debido al local', barbero.arriendoTotal]);
    if (barbero.efectivoRetirado > 0) {
      push(['Efectivo retirado por el barbero', barbero.efectivoRetirado]);
      push(['— de eso, su comisión ya cobrada en mano', barbero.efectivoComisionParte]);
      push(['— de eso, parte del local retenida por él', barbero.efectivoParteLocal]);
    }
    push(['TOTAL A PAGAR', barbero.total]);
    const blob = new Blob(['﻿' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `detalle-${barbero.nombre.replace(/\s+/g, '-')}-${fechaInicio}_${fechaFin}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!barbero) return null;

  return (
    <SlideOver
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-3xl"
      title={`Detalle · ${barbero.nombre}`}
      subtitle={`${fechaInicio} al ${fechaFin} · ${detalle.citas.length} cita${detalle.citas.length !== 1 ? 's' : ''}${detalle.ventas.length ? ` · ${detalle.ventas.length} venta${detalle.ventas.length !== 1 ? 's' : ''}` : ''}`}
      footer={
        <div className="flex justify-between items-center gap-3">
          <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700">
            <Download size={14} /> Exportar CSV
          </button>
          <button onClick={onClose} className={`${sheetBtn.base} ${sheetBtn.ghost}`}>Cerrar</button>
        </div>
      }
    >
      {/* Resumen arriba (grande) */}
      <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4 mb-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Total a pagar</p>
        <p className="text-3xl font-black text-emerald-400 mt-1 tabular-nums">{formatCLP(barbero.total)}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-[12.5px]">
          <div>
            <p className="text-slate-500">Comisión servicios</p>
            <p className="font-semibold text-slate-200 tabular-nums">{formatCLP(barbero.comisionServicios)}</p>
          </div>
          <div>
            <p className="text-slate-500">Comisión productos</p>
            <p className="font-semibold text-slate-200 tabular-nums">{formatCLP(barbero.comisionProductos)}</p>
          </div>
          <div>
            <p className="text-slate-500">Ajustes netos</p>
            <p className={`font-semibold tabular-nums ${(barbero.ajustesSuma - barbero.ajustesResta) >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {(barbero.ajustesSuma - barbero.ajustesResta) >= 0 ? '+ ' : '− '}
              {formatCLP(Math.abs(barbero.ajustesSuma - barbero.ajustesResta))}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Adelantos</p>
            <p className="font-semibold text-orange-400 tabular-nums">− {formatCLP(barbero.adelantos)}</p>
          </div>
          {barbero.arriendoTotal > 0 && (
            <div>
              <p className="text-slate-500">Arriendo local</p>
              <p className="font-semibold text-amber-400 tabular-nums">− {formatCLP(barbero.arriendoTotal)}</p>
            </div>
          )}
          {barbero.efectivoRetirado > 0 && (
            <div>
              <p className="text-slate-500">Efectivo retirado por él</p>
              <p className="font-semibold text-cyan-400 tabular-nums">− {formatCLP(barbero.efectivoRetirado)}</p>
              <p className="text-[10.5px] text-slate-500 leading-snug mt-0.5">
                {formatCLP(barbero.efectivoComisionParte)} su comisión · {formatCLP(barbero.efectivoParteLocal)} del local
              </p>
            </div>
          )}
        </div>

        {/* Con qué pagaron los clientes. No es comisión: es la plata que
            entró por caja en el período, para poder cuadrarla. */}
        {porMetodo.length > 0 && (
          <div className="mt-4 pt-4 border-t border-emerald-500/20">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2.5">
              Cobrado por medio de pago
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {porMetodo.map(m => (
                <div key={m.metodo} className="rounded-lg bg-slate-800/40 px-3 py-2">
                  <p className="text-[11px] font-semibold text-slate-300 truncate" title={m.metodo}>{m.metodo}</p>
                  <p className="text-[15px] font-bold text-slate-100 tabular-nums mt-0.5">{formatCLP(m.monto)}</p>
                  <p className="text-[10px] text-slate-500">{m.count} cobro{m.count !== 1 ? 's' : ''}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Citas */}
      <section className="mb-6">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
          <Scissors size={13} className="text-emerald-400" /> Citas ({detalle.citas.length})
        </h3>
        {detalle.citas.length === 0 ? (
          <p className="text-[13px] text-slate-500 italic">Sin citas completadas en el período.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-[12.5px]">
              <thead className="bg-slate-800/60 text-[10px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="text-left py-2 px-3 font-semibold">Fecha</th>
                  <th className="text-left py-2 px-3 font-semibold">Cliente</th>
                  <th className="text-left py-2 px-3 font-semibold">Servicio</th>
                  <th className="text-left py-2 px-3 font-semibold hidden sm:table-cell">Método</th>
                  <th className="text-right py-2 px-3 font-semibold">Precio</th>
                  <th className="text-right py-2 px-3 font-semibold hidden sm:table-cell">%</th>
                  <th className="text-right py-2 px-3 font-semibold">Comisión</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {detalle.citas.map(c => (
                  <tr key={c.id} className="hover:bg-slate-800/30">
                    <td className="py-2 px-3 text-slate-400 whitespace-nowrap">{c.fecha}<span className="text-slate-600"> · {c.hora}</span></td>
                    <td className="py-2 px-3 text-slate-200 truncate max-w-[140px]" title={c.cliente}>{c.cliente}</td>
                    <td className="py-2 px-3 text-slate-300">
                      {c.servicio}
                      {c.cortesia && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-pink-500/15 text-pink-400">cortesía</span>}
                      {c.cp && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400" title={`Cliente propio del barbero · arriendo ${formatCLP(c.arriendo)}`}>CP</span>}
                    </td>
                    <td className="py-2 px-3 text-slate-500 hidden sm:table-cell">{c.metodoPago}</td>
                    <td className="py-2 px-3 text-right text-slate-300 tabular-nums">{formatCLP(c.precio)}</td>
                    <td className="py-2 px-3 text-right text-slate-500 tabular-nums hidden sm:table-cell">{c.cp ? '—' : `${c.pct}%`}</td>
                    <td className={`py-2 px-3 text-right font-semibold tabular-nums ${c.cp ? 'text-slate-500' : 'text-emerald-400'}`}>
                      {c.cp ? (
                        <span title={`Cliente pagó $${formatCLP(c.precio)} al barbero directo. Local recibe ${formatCLP(c.arriendo)} de arriendo.`}>$0</span>
                      ) : formatCLP(c.comision)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-800/40 font-bold">
                <tr>
                  <td colSpan={4} className="py-2 px-3 text-slate-300 hidden sm:table-cell">TOTAL</td>
                  <td colSpan={2} className="py-2 px-3 text-slate-300 sm:hidden">TOTAL</td>
                  <td className="py-2 px-3 text-right text-slate-200 tabular-nums">{formatCLP(detalle.citas.reduce((s, x) => s + x.precio, 0))}</td>
                  <td className="py-2 px-3 hidden sm:table-cell" />
                  <td className="py-2 px-3 text-right text-emerald-400 tabular-nums">{formatCLP(detalle.citas.reduce((s, x) => s + x.comision, 0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {/* Ventas de productos */}
      {detalle.ventas.length > 0 && (
        <section className="mb-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
            <TrendingUp size={13} className="text-blue-400" /> Ventas de productos ({detalle.ventas.length})
          </h3>
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-[12.5px]">
              <thead className="bg-slate-800/60 text-[10px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="text-left py-2 px-3 font-semibold">Fecha</th>
                  <th className="text-left py-2 px-3 font-semibold">Producto</th>
                  <th className="text-right py-2 px-3 font-semibold">Cant.</th>
                  <th className="text-right py-2 px-3 font-semibold">Monto</th>
                  <th className="text-right py-2 px-3 font-semibold">Comisión</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {detalle.ventas.map(v => (
                  <tr key={v.id} className="hover:bg-slate-800/30">
                    <td className="py-2 px-3 text-slate-400">{v.fecha}</td>
                    <td className="py-2 px-3 text-slate-200">{v.producto}</td>
                    <td className="py-2 px-3 text-right text-slate-300 tabular-nums">{v.cantidad}</td>
                    <td className="py-2 px-3 text-right text-slate-300 tabular-nums">{formatCLP(v.monto)}</td>
                    <td className="py-2 px-3 text-right font-semibold text-blue-400 tabular-nums">{formatCLP(v.comision)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Ajustes manuales */}
      {barbero.ajustesLineas.length > 0 && (
        <section className="mb-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
            <FileText size={13} className="text-slate-400" /> Ajustes manuales ({barbero.ajustesLineas.length})
          </h3>
          <div className="space-y-1.5">
            {barbero.ajustesLineas.map(l => (
              <div key={l.id} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 bg-slate-800/40 text-[12.5px]">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold ${
                    l.signo === '+' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>{l.signo}</span>
                  <span className="text-slate-300 truncate">{l.concepto || '(sin concepto)'}</span>
                  <span className="text-slate-500 shrink-0">· {l.fecha}</span>
                </div>
                <span className={`font-semibold tabular-nums shrink-0 ${
                  l.signo === '+' ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {l.signo} {formatCLP(l.monto)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Adelantos */}
      {detalle.adelantos.length > 0 && (
        <section className="mb-2">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
            <Wallet size={13} className="text-orange-400" /> Adelantos del período ({detalle.adelantos.length})
          </h3>
          <div className="space-y-1.5">
            {detalle.adelantos.map(a => (
              <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 bg-slate-800/40 text-[12.5px]">
                <div className="min-w-0 flex-1">
                  <p className="text-slate-300 truncate">{a.nota || 'Adelanto'}</p>
                  <p className="text-slate-500 text-[11px]">
                    {a.fecha}
                    {a.cuotasTotal > 1 && ` · ${a.cuotasTotal} cuotas de ${formatCLP(a.montoPorCuota)}`}
                  </p>
                </div>
                <span className="font-semibold text-orange-400 tabular-nums shrink-0">− {formatCLP(a.monto)}</span>
                {(onEditarAdelanto || onBorrarAdelanto) && (
                  <div className="flex items-center gap-1 shrink-0">
                    {onEditarAdelanto && (
                      <button
                        onClick={() => onEditarAdelanto(a)}
                        className="p-1 rounded hover:bg-slate-700/50 text-slate-400 hover:text-slate-200"
                        title="Editar"
                      >
                        <Pencil size={13} />
                      </button>
                    )}
                    {onBorrarAdelanto && (
                      <button
                        onClick={() => onBorrarAdelanto(a.id)}
                        className="p-1 rounded hover:bg-rose-500/10 text-slate-400 hover:text-rose-400"
                        title="Borrar"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </SlideOver>
  );
}

/* ── PagarModal ───────────────────────────────────────────────────── */
// Métodos con los que se liquida un sueldo. Los comparte el selector simple y
// las filas del pago dividido para que no se puedan desincronizar.
const METODOS_PAGO_SUELDO = ['Efectivo', 'Transferencia', 'Débito', 'Otro'];

function PagarModal({ barbero, periodo, pagoExistente, onConfirm, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // Método de pago del sueldo — rescatado del flujo de Equipo al unificar:
  // el gasto en Sueldos debe decir CÓMO se pagó (caja cuadra contra efectivo).
  const [metodo, setMetodo] = useState('Efectivo');

  const enReapertura = pagoExistente?.estado === 'reabierto';
  const yaPagado     = Number(pagoExistente?.montoPagado) || 0;
  const diff         = enReapertura ? barbero.total - yaPagado : 0;
  // Lo que realmente sale de caja ahora. En una reapertura con sobrepago es 0:
  // no se escribe gasto, así que tampoco tiene sentido dividirlo.
  const montoAPagar  = enReapertura ? Math.max(0, diff) : barbero.total;

  // ── Pago dividido ────────────────────────────────────────────────
  // Mismo contrato que la agenda: `pagos: [{tipo, monto}]` + metodoPago 'Mixto'.
  // Caja lee ese array para repartir el gasto entre efectivo/tarjeta/transf, así
  // que la parte en efectivo sigue descontándose del saldo esperado.
  const [pagos, setPagos] = useState(null);
  const isSplit   = Array.isArray(pagos) && pagos.length >= 1;
  const sumaSplit = isSplit ? pagos.reduce((s, p) => s + (Number(p.monto) || 0), 0) : 0;
  const splitOk   = !isSplit || Math.abs(sumaSplit - montoAPagar) < 1;
  const setPagoTipo  = (idx, tipo)  => setPagos(pagos.map((p, i) => i === idx ? { ...p, tipo } : p));
  const setPagoMonto = (idx, monto) => setPagos(pagos.map((p, i) => i === idx ? { ...p, monto } : p));
  const addPago = () => setPagos([...(pagos || []), { tipo: 'Efectivo', monto: Math.max(0, montoAPagar - sumaSplit) }]);
  const removePago = (idx) => {
    const next = pagos.filter((_, i) => i !== idx);
    setPagos(next.length ? next : null); // 0 filas → vuelve a método único
  };

  // Antes: setLoading(true) + await onConfirm() + setLoading(false) + onClose().
  // Si onConfirm rechazaba (típico: rules de Firestore bloqueando escritura,
  // network flap), el catch no existía → setLoading(false) nunca corría y el
  // botón quedaba en "Registrando…" para siempre. Reportado por Oren.
  const handle = async () => {
    setError(null);
    if (isSplit && !splitOk) {
      setError(`La suma de los métodos (${formatCLP(sumaSplit)}) no calza con el monto a pagar (${formatCLP(montoAPagar)}).`);
      return;
    }
    setLoading(true);
    try {
      await onConfirm(metodo, isSplit ? pagos.map(p => ({ tipo: p.tipo, monto: Math.round(Number(p.monto) || 0) })) : null);
      onClose();
    } catch (e) {
      console.error('[Comisiones/PagarModal] error registrando pago:', e);
      setError(e?.message || 'No se pudo registrar el pago. Revisa la consola.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <SheetModal
      icon={CheckCircle2}
      titulo={enReapertura ? 'Ajustar pago (reapertura)' : 'Registrar pago'}
      sub={barbero.nombre}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className={`${sheetBtn.base} ${sheetBtn.ghost}`}>Cancelar</button>
          <button onClick={handle} disabled={loading} className={`${sheetBtn.base} ${sheetBtn.primary}`}>
            {loading ? 'Registrando…' : 'Confirmar pago'}
          </button>
        </>
      }
    >
      {/* Aviso de reapertura + diff automático */}
      {enReapertura && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[12.5px] leading-snug text-amber-200 space-y-1.5">
          <p className="font-semibold">Estás ajustando un período ya pagado.</p>
          <div className="flex justify-between text-amber-100/80">
            <span>Total recalculado ahora</span>
            <span className="font-semibold tabular-nums">{formatCLP(barbero.total)}</span>
          </div>
          <div className="flex justify-between text-amber-100/80">
            <span>Ya se había pagado</span>
            <span className="font-semibold tabular-nums">− {formatCLP(yaPagado)}</span>
          </div>
          <div className="flex justify-between text-amber-100 border-t border-amber-500/20 pt-1.5 mt-1.5">
            <span className="font-semibold">{diff >= 0 ? 'Saldo por pagar' : 'Sobrepago (crédito al local)'}</span>
            <span className={`font-bold tabular-nums ${diff >= 0 ? 'text-emerald-300' : 'text-orange-300'}`}>
              {diff >= 0 ? '+ ' : ''}{formatCLP(Math.abs(diff))}
            </span>
          </div>
          {diff < 0 && (
            <p className="text-[11.5px] text-amber-200/70 pt-1">
              Este sobrepago quedará registrado como crédito activo del local. Al pagar el próximo período de {barbero.nombre} podrás descontarlo manualmente (v1 no lo descuenta automáticamente).
            </p>
          )}
        </div>
      )}

      {/* El total va arriba y grande: es la cifra que se confirma. El
          desglose queda debajo como respaldo, no compitiendo con ella. */}
      <div className={sheetHighlight}>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {enReapertura ? (diff >= 0 ? 'Monto a pagar ahora' : 'No se paga plata nueva') : 'Total a pagar'}
        </p>
        <p className="mt-1 text-[26px] font-semibold leading-none tracking-[-0.02em] text-emerald-400">
          {formatCLP(enReapertura ? Math.max(0, diff) : barbero.total)}
        </p>

        <div className="mt-3.5 space-y-1.5 border-t border-slate-700/50 pt-3 text-[13px]">
          <div className="flex justify-between text-slate-400">
            <span>Sueldo base</span>
            <span className="font-medium text-slate-300">{formatCLP(barbero.sueldoBase)}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Comisión servicios ({barbero.comisionPct}%)</span>
            <span className="font-medium text-slate-300">{formatCLP(barbero.comisionServicios)}</span>
          </div>
          {barbero.comisionProductos > 0 && (
            <div className="flex justify-between text-slate-400">
              <span>Comisión productos ({barbero.comisionProductosPct}%{barbero.comisionProductosMonto > 0 ? ` + ${formatCLP(barbero.comisionProductosMonto)}/venta` : ''})</span>
              <span className="font-medium text-slate-300">{formatCLP(barbero.comisionProductos)}</span>
            </div>
          )}
          {barbero.ajustesSuma > 0 && (
            <div className="flex justify-between text-slate-400">
              <span>Ajustes manuales (+)</span>
              <span className="font-medium text-emerald-400">+ {formatCLP(barbero.ajustesSuma)}</span>
            </div>
          )}
          {barbero.ajustesResta > 0 && (
            <div className="flex justify-between text-slate-400">
              <span>Ajustes manuales (−)</span>
              <span className="font-medium text-amber-400">− {formatCLP(barbero.ajustesResta)}</span>
            </div>
          )}
          {barbero.adelantos > 0 && (
            <div className="flex justify-between text-slate-400">
              <span>Adelantos del período</span>
              <span className="font-medium text-orange-400">− {formatCLP(barbero.adelantos)}</span>
            </div>
          )}
          {barbero.efectivoRetirado > 0 && (
            <>
              <div className="flex justify-between text-slate-400">
                <span>Efectivo retirado por {barbero.nombre.split(' ')[0]} ({barbero.efectivoRetiradoCount})</span>
                <span className="font-medium text-cyan-400">− {formatCLP(barbero.efectivoRetirado)}</span>
              </div>
              <p className="text-[11px] text-slate-500 pl-1 leading-snug">
                De ese efectivo, {formatCLP(barbero.efectivoComisionParte)} era su comisión (ya cobrada en mano)
                y {formatCLP(barbero.efectivoParteLocal)} corresponde al local (retenido por él).
              </p>
            </>
          )}
        </div>
      </div>

      {barbero.saldoPendiente > 0 && (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-[12.5px] leading-snug text-amber-300">
          Los descuentos del período (adelantos{barbero.efectivoRetirado > 0 ? ' y efectivo retirado' : ''}) superan lo generado. Queda un saldo de {formatCLP(barbero.saldoPendiente)} a favor del local — {barbero.efectivoRetirado > 0 ? 'el barbero lo rinde en caja o se arrastra' : 'arrástralo'} al próximo período.
        </div>
      )}

      <p className="px-1 text-[12.5px] leading-relaxed text-slate-500">
        Se registrará como gasto en <span className="font-medium text-slate-400">Sueldos</span> del período {periodo}.
      </p>

      <div className="mt-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Método de pago</p>
        <div className={`grid grid-cols-4 gap-1.5 ${isSplit ? 'opacity-40 pointer-events-none' : ''}`}>
          {METODOS_PAGO_SUELDO.map(m => (
            <button key={m} type="button" onClick={() => setMetodo(m)}
              className={`rounded-lg border px-1 py-1.5 text-[10.5px] font-semibold transition-colors ${metodo === m
                ? 'border-emerald-400 bg-emerald-500/15 text-emerald-200'
                : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/25'}`}>
              {m}
            </button>
          ))}
        </div>

        {/* Pago dividido — solo si de verdad sale plata (en reapertura con
            sobrepago el monto es 0 y no se escribe gasto). */}
        {montoAPagar > 0 && (
          <label className="flex items-center gap-2 mt-2 text-[11px] text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              className="w-3.5 h-3.5 accent-emerald-500"
              checked={isSplit}
              onChange={e => setPagos(e.target.checked
                ? [{ tipo: metodo === 'Otro' ? 'Efectivo' : metodo, monto: Math.round(montoAPagar) }]
                : null)}
            />
            Dividir pago en varios métodos (efectivo + transferencia, etc.)
          </label>
        )}

        {isSplit && (
          <div className="mt-2 space-y-2 p-3 bg-slate-950 border border-slate-800/80 rounded-xl">
            {pagos.map((p, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <select className={`${sheetInput} flex-1`} value={p.tipo}
                        onChange={e => setPagoTipo(idx, e.target.value)}>
                  {METODOS_PAGO_SUELDO.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <input
                  type="number" inputMode="numeric" min="0" placeholder="0"
                  className={`${sheetInput} w-28 text-right`}
                  value={p.monto}
                  onChange={e => setPagoMonto(idx, e.target.value !== '' ? Number(e.target.value) : 0)}
                />
                <button type="button" onClick={() => removePago(idx)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 shrink-0"
                        title="Quitar esta fila">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <div className="flex items-center justify-between pt-1">
              <button type="button" onClick={addPago}
                      className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300">
                + agregar método
              </button>
              <div className={`text-[11px] font-bold ${splitOk ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatCLP(sumaSplit)} / {formatCLP(montoAPagar)}
                {splitOk ? ' ✓' : ` · falta ${formatCLP(montoAPagar - sumaSplit)}`}
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-[12.5px] leading-snug text-rose-300">
          <p className="font-semibold mb-0.5">Error al registrar el pago</p>
          <p className="text-rose-200/90">{error}</p>
        </div>
      )}
    </SheetModal>
  );
}

/* ── Main view ────────────────────────────────────────────────────── */
export default function Comisiones() {
  const { user } = useAuth();
  const [fechaInicio, setFechaInicio] = useState(firstOfMonth());
  const [fechaFin, setFechaFin] = useState(today());
  const [citasRaw, setCitasRaw] = useState([]);
  const [ventasRaw, setVentasRaw] = useState([]);
  const [adelantos, setAdelantos] = useState([]);
  const [ajustesManuales, setAjustesManuales] = useState([]);
  const [pagosSemanales, setPagosSemanales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [pagarTarget, setPagarTarget] = useState(null);
  const [adelantoTarget, setAdelantoTarget] = useState(null);
  // { barbero, ajuste? } — ajuste presente = edit; ausente = nuevo.
  const [ajusteTarget, setAjusteTarget] = useState(null);
  const [detalleTarget, setDetalleTarget] = useState(null);
  const [tuuOpen, setTuuOpen] = useState(false);
  const [pagados, setPagados] = useState(new Set());

  // Parámetros para calcular el NETO de los pagos con tarjeta.
  // El neto quita el IVA de la venta y descuenta la comisión del POS por tipo.
  const [ivaPct, setIvaPct]         = useState(19);
  const [comDebPct, setComDebPct]   = useState(1.19);
  const [comCredPct, setComCredPct] = useState(2.95);

  // Toggle "cortesías pagan comisión": vive en configuracion/comisiones y aplica
  // solo al tenant. Default OFF (comportamiento histórico: cortesía = $0 al
  // barbero). Cuando está ON, la comisión de una cita cortesía se calcula sobre
  // el precio del catálogo (como si el servicio se hubiera cobrado).
  const [cortesiaPagaComision, setCortesiaPagaComision] = useState(false);
  // Toggle "los barberos se llevan el efectivo" (pedido por Oren, ago-2026):
  // el barbero se queda con lo pagado en efectivo, así que del pago del
  // período se DESCUENTA ese efectivo completo — su parte de comisión ya la
  // cobró en mano, y la parte del local la está reteniendo. El detalle va
  // SIEMPRE visible (card, sheet de pago, liquidación y CSV): la condición
  // explícita del cliente fue que no pareciera un descuento oculto.
  const [efectivoAlBarbero, setEfectivoAlBarbero] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const snap = await withTimeout(getDoc(tenantDoc('configuracion', 'comisiones')), 10000, 'configuracion/comisiones');
        if (snap.exists() && typeof snap.data()?.cortesiaPagaComision === 'boolean') {
          setCortesiaPagaComision(snap.data().cortesiaPagaComision);
        }
        if (snap.exists() && typeof snap.data()?.efectivoAlBarbero === 'boolean') {
          setEfectivoAlBarbero(snap.data().efectivoAlBarbero);
        }
      } catch (e) {
        console.warn('[Comisiones] no se pudo leer configuracion/comisiones:', e?.message);
      }
    })();
  }, []);
  const _guardarFlagComisiones = async (campo, nuevo, setter) => {
    setter(nuevo);   // optimista
    try {
      await setDoc(tenantDoc('configuracion', 'comisiones'), {
        [campo]: nuevo,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (e) {
      console.error('[Comisiones] error guardando configuracion/comisiones:', e);
      setter(!nuevo); // revertir
      alert('No se pudo guardar el ajuste. Intenta de nuevo.');
    }
  };
  const toggleCortesiaPagaComision = () =>
    _guardarFlagComisiones('cortesiaPagaComision', !cortesiaPagaComision, setCortesiaPagaComision);
  const toggleEfectivoAlBarbero = () =>
    _guardarFlagComisiones('efectivoAlBarbero', !efectivoAlBarbero, setEfectivoAlBarbero);

  const { data: rawBarberos = [] } = useCollection('barberos');
  // Catálogo de servicios: fuente del fallback de precio cuando la cita no
  // tiene c.precio grabado (típico en reservas online antiguas). Mismo
  // criterio que Metricas.jsx:589 para que ambas vistas cuadren.
  const { data: servicios = [] } = useCollection('servicios');
  // Separación por sede (tipo Kronnos): comisiones solo del local activo — sus
  // barberos y las citas de esa sede. En "Todas" pasa todo (matchSucursal=true).
  const { matchSucursal } = useSucursal();
  const barberos = useMemo(() => rawBarberos.filter(matchSucursal), [rawBarberos, matchSucursal]);
  const citas = useMemo(() => citasRaw.filter(matchSucursal), [citasRaw, matchSucursal]);
  const ventas = useMemo(() => ventasRaw.filter(matchSucursal), [ventasRaw, matchSucursal]);

  // Mapa id/nombre → precio del catálogo. Se usa como fallback cuando la cita
  // no tiene precio grabado. Sin este mapa, las reservas online sin precio
  // explícito pagan $0 al barbero y no aparecen en el ingreso del local.
  //
  // Multi-sucursal (Oren, Kronnos): el servicio puede traer `preciosSucursal:
  // { sucursalId: monto }` con precios distintos por sede. Guardamos el mapa
  // por sucursal para resolver por cita en precioServicio(); si no existe,
  // cae al fallback general `s.precio`. Sin este resolver, cortesías en
  // Villa Alemana pagaban comisión al precio de Reñaca (bug reportado por
  // Oren para las cortesías CP de Pablo del 2026-07-23).
  const precioMap = useMemo(() => {
    const map = {};
    for (const s of servicios) {
      const fallback = Number(s.precio) || 0;
      const bySede   = (s.preciosSucursal && typeof s.preciosSucursal === 'object')
        ? s.preciosSucursal : null;
      const entry = { fallback, bySede };
      if (s.id)     map[s.id]     = entry;
      if (s.nombre) map[s.nombre] = entry;
    }
    return map;
  }, [servicios]);

  // Resuelve el precio de catálogo de una cita respetando su sucursalId.
  const _catalogPrice = useCallback((c) => {
    const entry = precioMap[c.servicioId] || precioMap[c.servicioNombre];
    if (!entry) return 0;
    const sid = c.sucursalId;
    if (sid && entry.bySede && Number.isFinite(Number(entry.bySede[sid]))) {
      return Number(entry.bySede[sid]);
    }
    return entry.fallback;
  }, [precioMap]);

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
      setCitasRaw(
        snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          // Excluye citas del fantasma QA (origenQA) — no pagan comisiones al barbero real.
          .filter(c => c.estado === 'Completada' && !c.origenQA),
      );
    } catch (e) {
      console.error('[Comisiones] error cargando citas:', e);
    } finally {
      setLoading(false);
    }
  }, [fechaInicio, fechaFin]);

  // Ventas de productos entregadas — misma fuente que Métricas y Equipo/Sueldos
  // para que las tres vistas cuadren. Filtramos rango en cliente (el campo
  // `fecha` puede ser string o Timestamp según la ruta que creó la venta).
  const loadVentas = useCallback(async () => {
    try {
      const q = query(tenantCol('product_reservations'), where('status', '==', 'delivered'));
      const snap = await withTimeout(getDocs(q), 20000, 'comisiones/ventas');
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const inRange = all.filter(v => {
        const raw = v.fecha || v.createdAt || v.creadoEn;
        const s = fechaToStr(raw);
        return s && s >= fechaInicio && s <= fechaFin;
      });
      setVentasRaw(inRange);
    } catch (e) {
      console.error('[Comisiones] error cargando ventas:', e);
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

  // Ajustes manuales (comisionManual): mismo esquema/colección que los
  // adelantos, distintos por tipo. El filtro por rango es en cliente.
  const loadAjustesManuales = useCallback(async () => {
    try {
      const q = query(tenantCol('gastos'), where('tipo', '==', 'comisionManual'));
      const snap = await withTimeout(getDocs(q), 15000, 'comisiones/ajustes');
      setAjustesManuales(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error('[Comisiones] error cargando ajustes manuales:', e);
    }
  }, []);

  // Pagos semanales: registro por (barbero, período pagado). Al pagar, se
  // crea el doc con id determinístico `{barberoId}_{fechaInicio}_{fechaFin}`.
  // Sirve para: (1) mostrar que un período ya se pagó → oculta el botón
  // "Registrar pago" y muestra "Reabrir semana"; (2) al reabrir + re-pagar,
  // calcular diff automático (saldo adicional o crédito a favor del local).
  const loadPagosSemanales = useCallback(async () => {
    try {
      const snap = await withTimeout(getDocs(tenantCol('pagos_semanales')), 15000, 'comisiones/pagos_semanales');
      setPagosSemanales(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error('[Comisiones] error cargando pagos semanales:', e);
    }
  }, []);

  useEffect(() => { loadCitas(); }, [loadCitas]);
  useEffect(() => { loadVentas(); }, [loadVentas]);
  useEffect(() => { loadAdelantos(); }, [loadAdelantos]);
  useEffect(() => { loadAjustesManuales(); }, [loadAjustesManuales]);
  useEffect(() => { loadPagosSemanales(); }, [loadPagosSemanales]);

  // Precio del servicio de la cita. Mismo criterio que Métricas para que
  // ambas vistas cuadren:
  //  - cortesía → 0
  //  - c.precio explícito (incluye 0) → respetar. Un `precio:0` registrado a
  //    mano es "cortesía sin flag" (promo 2x1 antigua de aura donde el 2°
  //    corte se marcaba $0 en vez de tildar cortesía). Sumar el precio del
  //    catálogo acá infla el ingreso real y por consecuencia la comisión.
  //  - c.precio null/undefined → fallback al catálogo (reservas online que
  //    guardan solo servicioId sin precio).
  // NO suma productos: los productos vienen aparte desde product_reservations
  // para no doblar con el arreglo `ticketProductos` embebido en la cita.
  const precioServicio = useCallback((c) => {
    // Cortesía: por default paga $0 al barbero (comportamiento histórico).
    // Si el toggle `cortesiaPagaComision` está ON, la comisión se calcula
    // sobre el precio del catálogo — como si el servicio se hubiera cobrado.
    // Ojo: esto NO cambia el ingreso del local (Métricas sigue mostrando $0);
    // solo cambia el pago al barbero.
    if (c.cortesia) {
      if (!cortesiaPagaComision) return 0;
      return _catalogPrice(c);
    }
    if (c.precio != null) return Number(c.precio) || 0;
    return _catalogPrice(c);
  }, [_catalogPrice, cortesiaPagaComision]);
  // Precio de una venta de producto. Los docs de product_reservations guardan
  // el TOTAL de línea en `precio` (ya multiplicado × cantidad, con descuento
  // aplicado). Ver memoria "Ventas / plata (gotchas)".
  const precioVenta = useCallback((v) => Number(v.precio) || Number(v.total) || 0, []);
  // Alias legacy usado por los CSV/HTML de exportación (mismo criterio que
  // Métricas: solo servicio de la cita, sin productos).
  const getPrice = precioServicio;

  const data = useMemo(() => {
    const map = {};
    const nuevoBucket = (b) => ({
      id: b?.id || '_sin',
      nombre: b?.nombre || 'Sin barbero',
      foto: b?.foto || null,
      // % de comisión: servicio y producto se calculan por separado (el barbero
      // puede tener tarifas distintas). Ver Equipo.jsx:142-145 para los campos.
      comisionPct:            Number(b?.comision) || 0,
      // Override opcional { servicioId: pct }. Si un servicio está acá, se usa
      // ese % en vez del global. Servicios no listados caen al global.
      comisionPorServicio: (b?.comisionPorServicio && typeof b.comisionPorServicio === 'object')
        ? b.comisionPorServicio : {},
      // Arriendo por servicio { servicioId: monto_al_local }. Modelo invertido:
      // el barbero cobra el 100% y paga fee fijo al local, PERO solo con
      // clientes de su cartera propia (detectados por sufijoClientePropio en
      // el nombre). Sin sufijo, arriendo NUNCA aplica (fail-safe).
      arriendoPorServicio: (b?.arriendoPorServicio && typeof b.arriendoPorServicio === 'object')
        ? b.arriendoPorServicio : {},
      sufijoClientePropio: (typeof b?.sufijoClientePropio === 'string' && b.sufijoClientePropio.trim())
        ? b.sufijoClientePropio.trim().toLowerCase() : '',
      // Contadores para el reporte de arriendo (cuánto pagó el barbero al
      // local por servicio-cita, y cuántos servicios entraron por este canal).
      arriendoTotal: 0,
      arriendoCount: 0,
      comisionProductosPct:   b?.comisionProductos !== undefined ? Number(b.comisionProductos) : 10,
      comisionProductosMonto: Number(b?.comisionProductosMonto) || 0,
      // Override opcional { productoId: pct }. Si una venta usa un producto
      // listado acá, se aplica ese %; sino cae al pct global.
      comisionPorProducto: (b?.comisionPorProducto && typeof b.comisionPorProducto === 'object')
        ? b.comisionPorProducto : {},
      sueldoBase: Number(b?.sueldoBase) || 0,
      citas: 0,
      ventas: 0,
      ingresosServicios: 0,
      ingresosProductos: 0,
      ingresos: 0,
      comisionServicios: 0,
      comisionProductos: 0,
      montoComision: 0,
      adelantos: 0,
      ajustesSuma: 0,          // suma de ajustes manuales '+' del período
      ajustesResta: 0,         // suma de ajustes manuales '−' del período
      ajustesLineas: [],       // detalle de las líneas del período (para UI)
      propinas: 0,
      propinasCount: 0,
      // Efectivo que el barbero se llevó en mano (toggle efectivoAlBarbero).
      // Se separa cuánto de eso era SU comisión (ya cobrada) y cuánto es del
      // local (retenido) para que el desglose nunca sea una caja negra.
      efectivoRetirado: 0,
      efectivoRetiradoCount: 0,
      efectivoComisionParte: 0,
      total: 0,
    });
    barberos.forEach(b => { map[b.id] = nuevoBucket(b); });

    // Resuelve el bucket del barbero de una cita/venta. Si la referencia no
    // matchea ningún barbero cargado, cae en un bucket genérico "_sin".
    const resolverBarbero = (barberoId, barberoNombre) => {
      if (barberoId && map[barberoId]) return barberoId;
      const found = barberos.find(b => b.id === barberoId || b.nombre === barberoNombre);
      if (found) return found.id;
      if (!map['_sin']) map['_sin'] = nuevoBucket(null);
      return '_sin';
    };

    // Las reglas por ítem (override por servicio, cartera propia, arriendo)
    // viven en lib/comisiones-core.js. Antes estaban acá Y otra vez adentro de
    // DetalleBarberoDrawer, con guardas levemente distintas: un override
    // negativo caía al global en la tarjeta pero se usaba tal cual en el
    // detalle. Una sola fuente y ese tipo de deriva deja de ser posible.

    // Servicios: dos modelos según si es cliente de cartera propia (CP) o no.
    //
    // Modelo NORMAL: el cliente paga al local → local ingresa precio completo,
    //   comisión al barbero = precio × % (override o global). Cortesía = $0.
    //
    // Modelo CP (arriendo, cartera propia del barbero): el cliente le paga TODO
    //   al barbero directo, el barbero le debe al local un arriendo fijo por
    //   ese servicio. Entonces:
    //     · Ingreso del local = arriendo (NO el precio — no pasa por caja del local)
    //     · Comisión al barbero desde el local = 0 (el barbero ya cobró todo)
    //     · Arriendo contabilizado aparte (arriendoTotal) para saber cuánto le
    //       debe el barbero al local.
    //   Se detecta por sufijoClientePropio en el nombre del cliente + arriendo
    //   configurado para ese servicio en barberos/{id}.arriendoPorServicio.
    citas.forEach(c => {
      const key = resolverBarbero(c.barberoId, c.barbero);
      const precio = precioServicio(c);
      const r = comisionCita({
        cfg: map[key], precio, servicioId: c.servicioId, clienteNombre: c.clienteNombre,
      });
      map[key].citas++;
      // CP → el local ingresa el arriendo (el precio nunca pasó por su caja) y
      // la comisión es 0. Normal → ingresa el precio y paga comisión.
      map[key].ingresosServicios += r.ingresoLocal;
      map[key].comisionServicios += r.comision;
      if (r.cp) {
        map[key].arriendoTotal += r.arriendo;
        map[key].arriendoCount += 1;
      }
      const propina = Number(c.propina) || 0;
      if (propina > 0) {
        map[key].propinas += propina;
        map[key].propinasCount++;
      }

      // ── Efectivo retirado por el barbero (toggle del tenant) ──
      // Cuenta la plata REAL que quedó en su mano: cortesías no mueven caja
      // (aunque cortesiaPagaComision infle la comisión) y las citas de
      // cartera propia (CP) tampoco — ahí el barbero ya cobró todo y lo que
      // rige es el arriendo. En pago Mixto solo la porción en efectivo.
      if (efectivoAlBarbero && !r.cp) {
        const cashBase = c.cortesia ? 0
          : (c.precio != null ? (Number(c.precio) || 0) : _catalogPrice(c));
        let cash = 0;
        if (c.metodoPago === 'Efectivo') cash = cashBase;
        else if (c.metodoPago === 'Mixto' && Array.isArray(c.pagos)) {
          cash = Math.min(cashBase, c.pagos
            .filter(p => p?.tipo === 'Efectivo')
            .reduce((s, p) => s + (Number(p.monto) || 0), 0));
        }
        if (cash > 0) {
          map[key].efectivoRetirado += cash;
          map[key].efectivoRetiradoCount++;
          // Parte del efectivo que era comisión suya (proporcional si fue Mixto).
          map[key].efectivoComisionParte += cashBase > 0 ? r.comision * (cash / cashBase) : 0;
        }
      }
    });

    // Productos: cada venta paga %comisión producto (override o global) + monto fijo por venta.
    ventas.forEach(v => {
      const key = resolverBarbero(v.barberoId, v.barberoNombre);
      const monto = precioVenta(v);
      const r = comisionVenta({ cfg: map[key], monto, productId: v.productId });
      map[key].ventas++;
      map[key].ingresosProductos += r.ingresoLocal;
      map[key].comisionProductos += r.comision;
      // Producto vendido y cobrado en efectivo → esa plata también quedó en
      // la mano del barbero (mismo criterio que las citas).
      if (efectivoAlBarbero && v.metodoPago === 'Efectivo' && monto > 0) {
        map[key].efectivoRetirado += monto;
        map[key].efectivoRetiradoCount++;
        map[key].efectivoComisionParte += r.comision;
      }
    });

    // Consolidados por barbero: ingresos y comisión totales para la fila.
    Object.values(map).forEach(b => {
      b.ingresos = b.ingresosServicios + b.ingresosProductos;
      b.montoComision = b.comisionServicios + b.comisionProductos;
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

    // Ajustes manuales del período por barbero. Cada línea suma o resta
    // según su `signo`. Guardamos el detalle en `ajustesLineas` para que la
    // UI pueda listarlas (editar/borrar) sin tener que re-filtrarlas.
    ajustesManuales.forEach(a => {
      if (!a.barberoId || !map[a.barberoId]) return;
      const fStr = fechaToStr(a.fecha);
      if (!fStr || fStr < fechaInicio || fStr > fechaFin) return;
      const monto = Number(a.monto) || 0;
      if (monto <= 0) return;
      const signo = a.signo === '-' ? '-' : '+';
      if (signo === '+') map[a.barberoId].ajustesSuma  += monto;
      else               map[a.barberoId].ajustesResta += monto;
      map[a.barberoId].ajustesLineas.push({
        id: a.id, monto, signo,
        concepto: a.concepto || '',
        fecha:    fStr,
      });
    });

    return Object.values(map)
      .map(b => {
        const adel   = Math.round(b.adelantos);
        const ajSum  = Math.round(b.ajustesSuma);
        const ajRes  = Math.round(b.ajustesResta);
        const rent   = Math.round(b.arriendoTotal);
        const efec   = Math.round(b.efectivoRetirado);
        const efecCom = Math.round(Math.min(b.efectivoComisionParte, b.efectivoRetirado));
        const bruto  = Math.round(b.sueldoBase + b.montoComision);
        // Ajustes manuales se aplican ANTES de restar adelantos: primero
        // "cuánto debería cobrar" (con bonos/descuentos), y de ahí sale la
        // resta de adelantos ya tomados. El arriendo (cliente propio) se
        // descuenta al final: el barbero ya lo cobró íntegro al cliente y le
        // debe al local $X por cada corte CP. El efectivo retirado se resta
        // COMPLETO: su comisión sobre esas ventas ya está adentro del bruto y
        // la plata física ya está en su bolsillo.
        const brutoAjustado = bruto + ajSum - ajRes;
        const neto   = brutoAjustado - adel - rent - efec;
        // Ordenar líneas del período por fecha ascendente para display estable.
        b.ajustesLineas.sort((x, y) => (x.fecha || '').localeCompare(y.fecha || ''));
        return {
          ...b,
          ingresos: Math.round(b.ingresos),
          ingresosServicios: Math.round(b.ingresosServicios),
          ingresosProductos: Math.round(b.ingresosProductos),
          comisionServicios: Math.round(b.comisionServicios),
          comisionProductos: Math.round(b.comisionProductos),
          montoComision: Math.round(b.montoComision),
          adelantos: adel,
          ajustesSuma:  ajSum,
          ajustesResta: ajRes,
          propinas: Math.round(b.propinas),
          efectivoRetirado: efec,
          efectivoComisionParte: efecCom,
          efectivoParteLocal: Math.max(0, efec - efecCom),
          bruto,
          brutoAjustado,
          total: Math.max(0, neto),
          saldoPendiente: neto < 0 ? -neto : 0,
        };
      })
      .filter(b => b.citas > 0 || b.ventas > 0 || b.adelantos > 0 || b.propinas > 0 || b.ajustesSuma > 0 || b.ajustesResta > 0 || b.efectivoRetirado > 0)
      .sort((a, b) => b.ingresos - a.ingresos);
  }, [citas, ventas, adelantos, ajustesManuales, barberos, precioServicio, precioVenta, fechaInicio, fechaFin, efectivoAlBarbero, _catalogPrice]);

  const totals = useMemo(() => data.reduce((acc, b) => ({
    citas: acc.citas + b.citas,
    ventas: acc.ventas + b.ventas,
    ingresosServicios: acc.ingresosServicios + b.ingresosServicios,
    ingresosProductos: acc.ingresosProductos + b.ingresosProductos,
    ingresos: acc.ingresos + b.ingresos,
    comisionServicios: acc.comisionServicios + b.comisionServicios,
    comisionProductos: acc.comisionProductos + b.comisionProductos,
    montoComision: acc.montoComision + b.montoComision,
    sueldoBase: acc.sueldoBase + b.sueldoBase,
    adelantos: acc.adelantos + b.adelantos,
    ajustesSuma:  acc.ajustesSuma  + b.ajustesSuma,
    ajustesResta: acc.ajustesResta + b.ajustesResta,
    propinas: acc.propinas + b.propinas,
    arriendoTotal: acc.arriendoTotal + (b.arriendoTotal || 0),
    efectivoRetirado: acc.efectivoRetirado + (b.efectivoRetirado || 0),
    total: acc.total + b.total,
  }), { citas: 0, ventas: 0, ingresosServicios: 0, ingresosProductos: 0, ingresos: 0, comisionServicios: 0, comisionProductos: 0, montoComision: 0, sueldoBase: 0, adelantos: 0, ajustesSuma: 0, ajustesResta: 0, propinas: 0, arriendoTotal: 0, efectivoRetirado: 0, total: 0 }), [data]);

  const periodo = `${fechaInicio} al ${fechaFin}`;

  // Helper: doc id determinístico para pagos_semanales (barbero + rango).
  const pagoSemanalId = (barberoId) => `${barberoId}_${fechaInicio}_${fechaFin}`;

  // Busca el pago del barbero para el rango visible (si existe).
  const pagoDelPeriodo = useCallback((barberoId) => {
    return pagosSemanales.find(p =>
      p.barberoId === barberoId && p.periodoInicio === fechaInicio && p.periodoFin === fechaFin,
    ) || null;
  }, [pagosSemanales, fechaInicio, fechaFin]);

  const handlePagar = async (barbero, metodoPago = 'Efectivo', pagos = null) => {
    const pagoExistente = pagoDelPeriodo(barbero.id);
    const enReapertura = pagoExistente?.estado === 'reabierto';
    // En reapertura: monto pagado = diff con lo ya pagado.
    // Si diff < 0 → estamos pagando de más históricamente. El monto del gasto
    // es 0 (no sale plata nueva) y se registra un crédito a favor del local
    // que se descontará del próximo período (aplicado más adelante).
    const yaPagado = enReapertura ? Number(pagoExistente.montoPagado) || 0 : 0;
    const diff = barbero.total - yaPagado;
    const gastoMonto = enReapertura ? Math.max(0, diff) : barbero.total;
    const creditoNuevo = enReapertura && diff < 0 ? Math.abs(diff) : 0;

    if (gastoMonto > 0) {
      await addDoc(tenantCol('gastos'), {
        descripcion: enReapertura
          ? `Liquidación adicional ${barbero.nombre} (${periodo}) — ajuste post-reapertura`
          : `Liquidación ${barbero.nombre} (${periodo})`,
        monto: gastoMonto,
        categoria: 'Sueldos',
        tipo: 'liquidacion',
        // Cómo se pagó el sueldo (rescatado del flujo de Equipo). Si se dividió,
        // el string queda en 'Mixto' —para las vistas legacy— y el desglose real
        // va en `pagos[]`, que es lo que Caja reparte entre efectivo/tarjeta/
        // transferencia para que el saldo esperado siga cuadrando.
        metodoPago: pagos ? 'Mixto' : metodoPago,
        ...(pagos ? { pagos } : {}),
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
    }

    // Persistir el registro semanal (idempotente por id determinístico).
    // Al re-pagar en reapertura, sobreescribe con el monto final total.
    const pagoId = pagoSemanalId(barbero.id);
    const nuevoHistorial = [
      ...(pagoExistente?.historial || []),
      {
        tipo: enReapertura ? 'reapertura_repagada' : 'pagado_original',
        montoTotal: barbero.total,
        montoDelta: gastoMonto,
        creditoGenerado: creditoNuevo,
        fecha: today(),
      },
    ];
    await setDoc(tenantDoc('pagos_semanales', pagoId), {
      barberoId: barbero.id,
      barberoNombre: barbero.nombre,
      periodoInicio: fechaInicio,
      periodoFin:    fechaFin,
      montoPagado:   barbero.total,
      fechaPago:     Timestamp.fromDate(new Date(today() + 'T12:00:00')),
      estado:        'pagado',
      // Créditos acumulados: al pagar de menos en reapertura se suma un
      // crédito que se aplicará automáticamente al siguiente período del
      // mismo barbero (ver lógica en el memo `data`).
      creditoActivo: (Number(pagoExistente?.creditoActivo) || 0) + creditoNuevo,
      historial:     nuevoHistorial,
      updatedAt:     serverTimestamp(),
      ...(pagoExistente ? {} : { creadoEn: serverTimestamp() }),
    }, { merge: true });

    setPagados(prev => new Set([...prev, barbero.id]));
    await loadPagosSemanales();
  };

  const handleReabrirSemana = async (barbero) => {
    const pago = pagoDelPeriodo(barbero.id);
    if (!pago) return;
    if (!window.confirm(`Reabrir el pago de ${barbero.nombre} del ${fechaInicio} al ${fechaFin}?\n\nMonto pagado: ${formatCLP(pago.montoPagado)}\n\nPodrás editar/agregar citas y al re-pagar el sistema calculará el saldo (o crédito) automáticamente.`)) return;
    await setDoc(tenantDoc('pagos_semanales', pago.id), {
      estado: 'reabierto',
      reabiertoEn: serverTimestamp(),
      historial: [
        ...(pago.historial || []),
        { tipo: 'reabierto', fecha: today() },
      ],
    }, { merge: true });
    setPagados(prev => { const s = new Set(prev); s.delete(barbero.id); return s; });
    await loadPagosSemanales();
  };

  const handleAjusteManual = async ({ monto, signo, concepto, fecha }) => {
    if (!ajusteTarget) return;
    const { barbero, ajuste } = ajusteTarget;
    const descPrefix = signo === '+' ? 'Ajuste +' : 'Ajuste −';
    const descripcion = `${descPrefix} ${barbero.nombre} — ${concepto}`;
    const payload = {
      descripcion,
      monto,
      signo,
      concepto,
      categoria: 'Sueldos',
      tipo: 'comisionManual',
      fecha: Timestamp.fromDate(new Date(fecha + 'T12:00:00')),
      barberoId: barbero.id,
      barberoNombre: barbero.nombre,
      // Etiquetamos por sede al momento de crearlo — así el filtro por
      // sucursal en el rango también aplica a los ajustes.
      sucursalId: barbero.sucursalId || null,
      creadoPor: user?.uid || 'admin',
    };
    if (ajuste?.id) {
      // Edit: borrar + crear (más simple que un updateDoc parcial y
      // consistente con updatedAt en un solo lugar).
      await deleteDoc(doc(db, `${tenantCol('gastos').path}/${ajuste.id}`));
    }
    await addDoc(tenantCol('gastos'), {
      ...payload,
      creadoEn: serverTimestamp(),
    });
    await loadAjustesManuales();
  };

  const handleBorrarAjuste = async (ajusteId) => {
    if (!ajusteId) return;
    if (!window.confirm('¿Borrar este ajuste manual?')) return;
    await deleteDoc(doc(db, `${tenantCol('gastos').path}/${ajusteId}`));
    await loadAjustesManuales();
  };

  const handleAdelanto = async ({ id, monto, fecha, metodoPago, nota, cuotas }) => {
    if (!adelantoTarget) return;
    // adelantoTarget puede ser { barbero, adelanto? } (nuevo) o barbero directo (legado).
    const barb = adelantoTarget.barbero || adelantoTarget;
    const c = Math.max(1, Math.round(Number(cuotas) || 1));
    const montoPorCuota = c > 1 ? Math.round(monto / c) : monto;
    const payload = {
      descripcion: `Adelanto ${barb.nombre}${c > 1 ? ` (${c} cuotas)` : ''}${nota ? ` — ${nota}` : ''}`,
      monto,
      categoria: 'Sueldos',
      tipo: 'adelanto',
      metodoPago,
      fecha: Timestamp.fromDate(new Date(fecha + 'T12:00:00')),
      barberoId: barb.id,
      barberoNombre: barb.nombre,
      creadoPor: user?.uid || 'admin',
      // Si c > 1, el descuento del bruto del barbero se prorratea: la misma
      // suma `montoPorCuota` aparece en `barbero.adelantos` durante c meses
      // consecutivos desde `fecha`. El gasto en sí (salida de caja) sigue
      // siendo el día `fecha` por el total, eso no cambia.
      cuotasTotal: c,
      montoPorCuota,
    };
    if (id) {
      // Edit: borrar el anterior y crear nuevo (más simple que updateDoc con
      // toggle de merge para campos que pueden desaparecer al reducir cuotas).
      await deleteDoc(doc(db, `${tenantCol('gastos').path}/${id}`));
    }
    await addDoc(tenantCol('gastos'), { ...payload, creadoEn: serverTimestamp() });
    await loadAdelantos();
  };

  const handleBorrarAdelanto = async (adelantoId) => {
    if (!adelantoId) return;
    if (!window.confirm('¿Borrar este adelanto?')) return;
    await deleteDoc(doc(db, `${tenantCol('gastos').path}/${adelantoId}`));
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
    pushRow(['Barbero', 'Citas', 'Ingresos Servicios', '% Serv.', 'Comisión Serv.', 'Ventas', 'Ingresos Productos', '% Prod.', '$ fijo/venta', 'Comisión Prod.', 'Ingresos Totales', 'Sueldo Base', 'Ajustes +', 'Ajustes −', 'Adelantos', 'Efectivo Retirado', 'Total a Pagar']);
    data.forEach(b => pushRow([
      b.nombre, b.citas, b.ingresosServicios, b.comisionPct, b.comisionServicios,
      b.ventas, b.ingresosProductos, b.comisionProductosPct, b.comisionProductosMonto, b.comisionProductos,
      b.ingresos, b.sueldoBase, b.ajustesSuma, b.ajustesResta, b.adelantos, b.efectivoRetirado || 0, b.total,
    ]));
    pushRow([
      'TOTAL', totals.citas, totals.ingresosServicios, '', totals.comisionServicios,
      totals.ventas, totals.ingresosProductos, '', '', totals.comisionProductos,
      totals.ingresos, totals.sueldoBase, totals.ajustesSuma, totals.ajustesResta, totals.adelantos, totals.efectivoRetirado, totals.total,
    ]);

    /* ── Detalle de ajustes manuales ── */
    const conAjustes = data.filter(b => b.ajustesLineas && b.ajustesLineas.length > 0);
    if (conAjustes.length) {
      blank();
      pushRow(['AJUSTES MANUALES DEL PERÍODO (detalle)']);
      pushRow(['Barbero', 'Fecha', 'Tipo', 'Concepto', 'Monto']);
      conAjustes.forEach(b => {
        b.ajustesLineas.forEach(l => {
          pushRow([b.nombre, l.fecha, l.signo === '+' ? 'Suma' : 'Descuento', l.concepto, l.monto]);
        });
      });
    }

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
          <span>Ingresos servicios</span><b>${formatCLP(b.ingresosServicios)}</b>
          ${b.ingresosProductos > 0 ? `<span>Ingresos productos</span><b>${formatCLP(b.ingresosProductos)}</b>` : ''}
          <span>Comisión servicios (${b.comisionPct}%)</span><b>${formatCLP(b.comisionServicios)}</b>
          ${b.comisionProductos > 0 ? `<span>Comisión productos (${b.comisionProductosPct}%${b.comisionProductosMonto > 0 ? ` + ${formatCLP(b.comisionProductosMonto)}/venta` : ''})</span><b>${formatCLP(b.comisionProductos)}</b>` : ''}
          <span>Sueldo base</span><b>${formatCLP(b.sueldoBase)}</b>
          ${b.adelantos > 0 ? `<span>Adelantos</span><b class="neg">− ${formatCLP(b.adelantos)}</b>` : ''}
          ${b.arriendoTotal > 0 ? `<span>Arriendo debido al local</span><b class="neg">− ${formatCLP(b.arriendoTotal)}</b>` : ''}
          ${b.efectivoRetirado > 0 ? `<span>Efectivo retirado por él (${b.efectivoRetiradoCount})</span><b class="neg">− ${formatCLP(b.efectivoRetirado)}</b>
          <span style="font-size:11px;opacity:.75">— incluye ${formatCLP(b.efectivoComisionParte)} de su comisión ya cobrada y ${formatCLP(b.efectivoParteLocal)} del local</span><b></b>` : ''}
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
          ${totals.arriendoTotal > 0 ? `<span>Arriendo cobrado (cliente propio)</span><b class="neg">− ${formatCLP(totals.arriendoTotal)}</b>` : ''}
          ${totals.efectivoRetirado > 0 ? `<span>Efectivo retirado por los barberos</span><b class="neg">− ${formatCLP(totals.efectivoRetirado)}</b>` : ''}
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
            <h1 className="text-xl font-bold text-primary">Comisiones</h1>
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
          {/* Conciliar POS: solo si hay citas con tarjeta en el período.
              Si el tenant no usa tarjeta (cash-only, transferencias) el
              botón simplemente no aparece — cero configuración por tenant. */}
          {citas.some(c => c.metodoPago === 'Débito' || c.metodoPago === 'Crédito') && (
            <button
              onClick={() => setTuuOpen(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/30 transition-all"
              title="Comparar el CSV exportado desde el portal del POS (TUU u otro) con las citas de tarjeta del período"
            >
              <Banknote size={14} />
              Conciliar POS
            </button>
          )}
        </div>
      </div>

      {/* Date range */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Desde</label>
            <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-primary focus:border-emerald-500 focus:outline-none" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Hasta</label>
            <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-primary focus:border-emerald-500 focus:outline-none" />
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
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-primary transition-colors">
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => { loadCitas(); loadVentas(); loadAdelantos(); }} disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 disabled:opacity-50 transition-all">
            <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Cargando...' : 'Actualizar'}
          </button>
        </div>
      </div>

      {/* Reglas del pago — flags por tenant */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <FileText size={15} className="text-blue-400" />
          <p className="text-sm font-bold text-primary">Reglas del pago</p>
        </div>
        <label className="flex items-start gap-3 cursor-pointer select-none group">
          <button
            type="button"
            onClick={toggleCortesiaPagaComision}
            role="switch"
            aria-checked={cortesiaPagaComision}
            className={`shrink-0 mt-0.5 relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              cortesiaPagaComision ? 'bg-emerald-500' : 'bg-slate-700'
            }`}
          >
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
              cortesiaPagaComision ? 'translate-x-5' : 'translate-x-1'
            }`} />
          </button>
          <div onClick={toggleCortesiaPagaComision} className="flex-1">
            <p className="text-[13px] font-semibold text-slate-200 group-hover:text-primary transition-colors">
              Las cortesías pagan comisión al barbero
            </p>
            <p className="text-[11.5px] text-slate-500 mt-0.5 leading-relaxed">
              {cortesiaPagaComision
                ? 'Cada cita marcada como cortesía suma comisión al barbero (usa el precio del catálogo). El ingreso del local sigue en $0 — solo cambia el pago al equipo.'
                : 'Las cortesías NO generan comisión al barbero (comportamiento por defecto). Activa el toggle si tu política es pagarle igual por el servicio.'}
            </p>
          </div>
        </label>
        <label className="flex items-start gap-3 cursor-pointer select-none group mt-4 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={toggleEfectivoAlBarbero}
            role="switch"
            aria-checked={efectivoAlBarbero}
            className={`shrink-0 mt-0.5 relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              efectivoAlBarbero ? 'bg-emerald-500' : 'bg-slate-700'
            }`}
          >
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
              efectivoAlBarbero ? 'translate-x-5' : 'translate-x-1'
            }`} />
          </button>
          <div onClick={toggleEfectivoAlBarbero} className="flex-1">
            <p className="text-[13px] font-semibold text-slate-200 group-hover:text-primary transition-colors">
              Los barberos se llevan el efectivo
            </p>
            <p className="text-[11.5px] text-slate-500 mt-0.5 leading-relaxed">
              {efectivoAlBarbero
                ? 'Lo cobrado en efectivo queda en la mano del barbero: del pago del período se descuenta ese efectivo completo, con el desglose visible (su comisión ya cobrada + la parte del local que retuvo). Si el efectivo supera lo generado, queda saldo a favor del local.'
                : 'El efectivo entra a la caja del local (comportamiento por defecto). Activa el toggle si tus barberos se quedan con lo pagado en efectivo y quieres que el sistema lo descuente del pago con detalle visible.'}
            </p>
          </div>
        </label>
      </div>

      {/* Cálculo del neto (IVA + comisión POS) — se usa al exportar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign size={15} className="text-emerald-400" />
          <p className="text-sm font-bold text-primary">Cálculo del neto (para exportar)</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">IVA %</label>
            <input type="number" min="0" step="0.01" value={ivaPct} onChange={e => setIvaPct(e.target.value)}
              className="w-24 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-primary focus:border-emerald-500 focus:outline-none" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Comisión Débito %</label>
            <input type="number" min="0" step="0.01" value={comDebPct} onChange={e => setComDebPct(e.target.value)}
              className="w-28 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-primary focus:border-emerald-500 focus:outline-none" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Comisión Crédito %</label>
            <input type="number" min="0" step="0.01" value={comCredPct} onChange={e => setComCredPct(e.target.value)}
              className="w-28 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-primary focus:border-emerald-500 focus:outline-none" />
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
            ...(totals.efectivoRetirado > 0 ? [{ icon: Banknote, color: 'text-cyan-400', bg: 'bg-cyan-500/10', label: 'Efectivo retirado', value: `− ${formatCLP(totals.efectivoRetirado)}` }] : []),
            { icon: Banknote,   color: 'text-pink-400',    bg: 'bg-pink-500/10',    label: 'Propinas',          value: formatCLP(totals.propinas) },
            { icon: Banknote,   color: 'text-rose-400',    bg: 'bg-rose-500/10',    label: 'Total a pagar',     value: formatCLP(totals.total) },
          ].map(({ icon: Icon, color, bg, label, value }) => (
            <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-3`}>
                <Icon size={16} className={color} />
              </div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">{label}</p>
              <p className="text-xl font-bold text-primary mt-0.5">{value}</p>
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
                {/* Avatar + nombre — clic abre detalle */}
                <button
                  onClick={() => setDetalleTarget(barbero)}
                  className="flex items-center gap-3 min-w-[160px] text-left rounded-lg -m-1 p-1 hover:bg-slate-800/40 transition-colors"
                  title="Ver detalle de citas y comisiones"
                >
                  <BarberAvatar foto={barbero.foto} nombre={barbero.nombre} />
                  <div>
                    <p className="text-sm font-bold text-primary hover:text-emerald-400 transition-colors">{barbero.nombre}</p>
                    <p className="text-xs text-slate-500">{barbero.citas} cita{barbero.citas !== 1 ? 's' : ''} · ver detalle</p>
                  </div>
                </button>

                {/* Stats */}
                <div className="flex flex-1 flex-wrap gap-4 items-center">
                  <StatItem
                    label="Ingresos"
                    value={formatCLP(barbero.ingresos)}
                    subValue={barbero.ingresosProductos > 0 ? `Servicios ${formatCLP(barbero.ingresosServicios)} · Productos ${formatCLP(barbero.ingresosProductos)}` : null}
                  />
                  <StatItem
                    label="Comisión"
                    value={formatCLP(barbero.montoComision)}
                    subValue={(() => {
                      const numOvr = Object.values(barbero.comisionPorServicio || {})
                        .filter(v => v != null && v !== '' && Number.isFinite(Number(v))).length;
                      const numRent = Object.values(barbero.arriendoPorServicio || {})
                        .filter(v => v != null && v !== '' && Number(v) > 0).length;
                      const marks = [
                        numOvr  > 0 ? `${numOvr} con % propio` : null,
                        numRent > 0 ? `${numRent} con arriendo` : null,
                      ].filter(Boolean).join(' · ');
                      const svcLabel = marks
                        ? `${barbero.comisionPct}% servicio (${marks})`
                        : `${barbero.comisionPct}% servicio`;
                      return barbero.comisionProductos > 0
                        ? `${svcLabel} · ${barbero.comisionProductosPct}%${barbero.comisionProductosMonto > 0 ? ` + ${formatCLP(barbero.comisionProductosMonto)}/venta` : ''} producto`
                        : svcLabel;
                    })()}
                  />
                  {barbero.arriendoTotal > 0 && (
                    <StatItem
                      label="Arriendo debido al local"
                      value={`− ${formatCLP(barbero.arriendoTotal)}`}
                      subValue={`${barbero.arriendoCount} servicio${barbero.arriendoCount !== 1 ? 's' : ''}`}
                      valueClass="text-amber-400"
                    />
                  )}
                  <StatItem label="Sueldo base" value={formatCLP(barbero.sueldoBase)} />
                  {barbero.ajustesSuma > 0 && (
                    <StatItem label="Ajustes +" value={`+ ${formatCLP(barbero.ajustesSuma)}`} valueClass="text-emerald-400" />
                  )}
                  {barbero.ajustesResta > 0 && (
                    <StatItem label="Ajustes −" value={`− ${formatCLP(barbero.ajustesResta)}`} valueClass="text-amber-400" />
                  )}
                  {barbero.adelantos > 0 && (
                    <StatItem label="Adelantos" value={`− ${formatCLP(barbero.adelantos)}`} valueClass="text-orange-400" />
                  )}
                  {barbero.efectivoRetirado > 0 && (
                    <StatItem
                      label={`Efectivo retirado (${barbero.efectivoRetiradoCount})`}
                      value={`− ${formatCLP(barbero.efectivoRetirado)}`}
                      subValue={`${formatCLP(barbero.efectivoComisionParte)} su comisión ya cobrada · ${formatCLP(barbero.efectivoParteLocal)} del local`}
                      valueClass="text-cyan-400"
                    />
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
                    onClick={() => setAjusteTarget({ barbero })}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-slate-800/50 text-slate-300 border border-slate-700 hover:bg-slate-800 transition-all"
                    title="Ajuste manual (suma o resta al pago del período)"
                  >
                    <FileText size={14} /> Ajuste manual
                  </button>
                  <button
                    onClick={() => setAdelantoTarget(barbero)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/30 hover:bg-orange-500/20 transition-all"
                  >
                    <Wallet size={14} /> Adelanto
                  </button>
                  {(() => {
                    const pago = pagoDelPeriodo(barbero.id);
                    // Si el período está pagado y NO fue reabierto → botón "Reabrir".
                    if (pago && pago.estado === 'pagado' && !pagados.has(barbero.id)) {
                      return (
                        <button
                          onClick={() => handleReabrirSemana(barbero)}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20 transition-all"
                          title={`Pagado el ${fechaToStr(pago.fechaPago)} · ${formatCLP(pago.montoPagado)}`}
                        >
                          <CheckCircle2 size={14} /> Semana pagada · Reabrir
                        </button>
                      );
                    }
                    // Si fue reabierto → mostrar diff y botón "Ajustar pago".
                    if (pago && pago.estado === 'reabierto') {
                      const diff = barbero.total - (Number(pago.montoPagado) || 0);
                      const diffLabel = diff > 0
                        ? `Saldo: ${formatCLP(diff)}`
                        : diff < 0
                          ? `Sobrepago: ${formatCLP(-diff)}`
                          : 'Sin diferencia';
                      return (
                        <button
                          onClick={() => setPagarTarget(barbero)}
                          disabled={pagados.has(barbero.id)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border ${
                            pagados.has(barbero.id)
                              ? 'bg-slate-800/50 text-slate-500 border-slate-700 cursor-default'
                              : 'bg-orange-500/10 text-orange-400 border-orange-500/30 hover:bg-orange-500/20'
                          }`}
                          title={`Reabierto · antes se pagó ${formatCLP(pago.montoPagado)}`}
                        >
                          {pagados.has(barbero.id)
                            ? <><CheckCircle2 size={14} /> Ajustado</>
                            : <><RefreshCcw size={14} /> Ajustar pago · {diffLabel}</>}
                        </button>
                      );
                    }
                    // Sin pago previo → flujo normal.
                    return (
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
                    );
                  })()}
                </div>
              </div>

              {/* Ajustes manuales del período — visible solo si hay líneas */}
              {barbero.ajustesLineas.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-800">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText size={12} className="text-slate-500" />
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Ajustes manuales del período ({barbero.ajustesLineas.length})
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    {barbero.ajustesLineas.map(line => (
                      <div key={line.id} className="flex items-center justify-between gap-3 text-[12.5px] rounded-lg px-3 py-2 bg-slate-800/40">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold ${
                            line.signo === '+'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {line.signo}
                          </span>
                          <span className="truncate text-slate-300">{line.concepto || '(sin concepto)'}</span>
                          <span className="text-slate-500 shrink-0">· {line.fecha}</span>
                        </div>
                        <span className={`font-semibold tabular-nums shrink-0 ${
                          line.signo === '+' ? 'text-emerald-400' : 'text-amber-400'
                        }`}>
                          {line.signo} {formatCLP(line.monto)}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => setAjusteTarget({ barbero, ajuste: {
                              id: line.id,
                              monto: line.monto,
                              signo: line.signo,
                              concepto: line.concepto,
                              fecha: line.fecha,
                            }})}
                            className="p-1 rounded hover:bg-slate-700/50 text-slate-400 hover:text-slate-200"
                            title="Editar"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => handleBorrarAjuste(line.id)}
                            className="p-1 rounded hover:bg-rose-500/10 text-slate-400 hover:text-rose-400"
                            title="Borrar"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
              <h2 className="text-sm font-bold text-primary">Propinas del período</h2>
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
                    <td className="py-2 text-primary font-medium">{b.nombre}</td>
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
                  <td className="py-2 font-bold text-primary">Total</td>
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
      <DetalleBarberoDrawer
        isOpen={!!detalleTarget}
        onClose={() => setDetalleTarget(null)}
        barbero={detalleTarget}
        citas={citas}
        ventas={ventas}
        adelantos={adelantos}
        precioServicio={precioServicio}
        precioVenta={precioVenta}
        fechaInicio={fechaInicio}
        fechaFin={fechaFin}
        onEditarAdelanto={(a) => setAdelantoTarget({ barbero: detalleTarget, adelanto: a })}
        onBorrarAdelanto={handleBorrarAdelanto}
      />
      {ajusteTarget && (
        <ComisionManualModal
          barbero={ajusteTarget.barbero}
          ajuste={ajusteTarget.ajuste || null}
          onConfirm={handleAjusteManual}
          onClose={() => setAjusteTarget(null)}
        />
      )}
      {adelantoTarget && (
        <AdelantoModal
          barbero={adelantoTarget.barbero || adelantoTarget}
          adelanto={adelantoTarget?.adelanto || null}
          onConfirm={handleAdelanto}
          onClose={() => setAdelantoTarget(null)}
        />
      )}
      {tuuOpen && (
        <ConciliarTuuModal
          citas={citas}
          precioServicio={precioServicio}
          fechaInicio={fechaInicio}
          fechaFin={fechaFin}
          onClose={() => setTuuOpen(false)}
        />
      )}
      {pagarTarget && (
        <PagarModal
          barbero={pagarTarget}
          periodo={periodo}
          pagoExistente={pagoDelPeriodo(pagarTarget.id)}
          onConfirm={(metodo, pagos) => handlePagar(pagarTarget, metodo, pagos)}
          onClose={() => setPagarTarget(null)}
        />
      )}

    </div>
  );
}

function StatItem({ label, value, valueClass = 'text-primary', subValue = null }) {
  return (
    <div className="min-w-[100px]">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`text-sm font-bold mt-0.5 ${valueClass}`}>{value}</p>
      {subValue && <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{subValue}</p>}
    </div>
  );
}
