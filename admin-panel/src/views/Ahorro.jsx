/**
 * Ahorro — libro del efectivo que el local guarda aparte.
 *
 * Pedido de Infinity Studio: llevan un ahorro en efectivo en el local y lo
 * anotaban en papel. Esto es ese cuaderno, con saldo al día y quién movió qué.
 *
 * DECISIÓN DE PRODUCTO (Infinity, 04-08): es un libro INDEPENDIENTE, no está
 * conectado a la caja. Meter plata acá NO descuenta del arqueo. La consecuencia
 * está avisada en pantalla y es real: si sacan los billetes del cajón y no
 * registran también el egreso en Caja, el arqueo del día les va a descuadrar
 * por ese monto. Se avisa, no se obliga — la alternativa (acoplarlo a la caja)
 * se ofreció y se descartó.
 *
 * Solo admin: es plata del negocio, mismo criterio que Comisiones y Finanzas.
 * El gate real está en firestore.rules; acá solo se esconde la UI.
 */
import { useState, useMemo } from 'react';
import {
  PiggyBank, Plus, Minus, Trash2, AlertTriangle, CalendarDays, User,
} from 'lucide-react';
import { addDoc, deleteDoc, doc, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore';
import { tenantCol } from '../lib/tenantUtils';
import { useCollection } from '../hooks/useCollection';
import { useAuth } from '../contexts/AuthContext';

// Orden estable fuera del componente: pasarlo inline recrearía el array en
// cada render y el listener se remontaría en bucle.
const ORDEN = [orderBy('fecha', 'desc')];

const fmt = (v) => '$' + Math.round(Number(v) || 0).toLocaleString('es-CL');

const hoyStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Fecha del movimiento en palabras, tolerante a Timestamp o string. */
function fechaLegible(m) {
  const d = m?.fecha?.toDate ? m.fecha.toDate() : (m?.fecha ? new Date(m.fecha + 'T12:00:00') : null);
  if (!d || isNaN(d)) return '—';
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function Ahorro() {
  const { user } = useAuth();
  const { data: movimientos, loading } = useCollection('ahorro_movimientos', ORDEN);

  const [modal, setModal]   = useState(null);   // 'deposito' | 'retiro' | null
  const [monto, setMonto]   = useState('');
  const [nota, setNota]     = useState('');
  const [fecha, setFecha]   = useState(hoyStr());
  const [guardando, setGuardando] = useState(false);
  const [error, setError]   = useState('');
  const [borrando, setBorrando] = useState(null);

  const { saldo, totalDep, totalRet } = useMemo(() => {
    let dep = 0, ret = 0;
    (movimientos || []).forEach(m => {
      const v = Math.round(Number(m.monto) || 0);
      if (m.tipo === 'retiro') ret += v; else dep += v;
    });
    return { saldo: dep - ret, totalDep: dep, totalRet: ret };
  }, [movimientos]);

  const cerrar = () => { setModal(null); setMonto(''); setNota(''); setFecha(hoyStr()); setError(''); };

  const guardar = async () => {
    const v = Math.round(Number(monto) || 0);
    if (v <= 0) { setError('Escribe un monto mayor a cero.'); return; }
    // Un retiro no puede dejar el ahorro en negativo: si pasa, o el saldo
    // está mal o el monto está mal, y las dos cosas se arreglan mirando, no
    // guardando.
    if (modal === 'retiro' && v > saldo) {
      setError(`No puedes retirar ${fmt(v)}: en el ahorro hay ${fmt(saldo)}.`);
      return;
    }
    setGuardando(true); setError('');
    try {
      await addDoc(tenantCol('ahorro_movimientos'), {
        tipo:   modal,
        monto:  v,
        nota:   nota.trim(),
        fecha:  Timestamp.fromDate(new Date(fecha + 'T12:00:00')),
        creadoEn:  serverTimestamp(),
        creadoPor: { uid: user?.uid || null, email: user?.email || null },
      });
      cerrar();
    } catch (e) {
      setError(e.message || 'No se pudo guardar.');
    } finally { setGuardando(false); }
  };

  const borrar = async (m) => {
    setBorrando(m.id);
    try { await deleteDoc(doc(tenantCol('ahorro_movimientos'), m.id)); }
    catch (e) { setError(e.message || 'No se pudo borrar.'); }
    finally { setBorrando(null); }
  };

  const inp = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-primary placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors';
  const lbl = 'block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1';

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-primary flex items-center gap-2">
          <PiggyBank size={20} className="text-emerald-400" /> Ahorro
        </h1>
        <p className="text-[13px] text-slate-400 mt-1">
          El efectivo que guardan aparte, con su historial. Cada movimiento queda con fecha y con quién lo anotó.
        </p>
      </div>

      {/* Saldo */}
      <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-6">
        <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-300/80">Guardado hoy</p>
        <p className="text-4xl font-black text-emerald-300 tabular-nums mt-1">{fmt(saldo)}</p>
        <p className="text-[12px] text-slate-400 mt-2">
          {fmt(totalDep)} depositado · {fmt(totalRet)} retirado · {(movimientos || []).length} movimiento{(movimientos || []).length === 1 ? '' : 's'}
        </p>
        <div className="flex gap-2 mt-4">
          <button onClick={() => { setModal('deposito'); setError(''); }}
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold px-4 py-2 transition-colors">
            <Plus size={15} /> Guardar plata
          </button>
          <button onClick={() => { setModal('retiro'); setError(''); }}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 hover:border-white/35 text-slate-200 text-sm font-bold px-4 py-2 transition-colors">
            <Minus size={15} /> Sacar del ahorro
          </button>
        </div>
      </div>

      {/* El aviso que importa: esto NO toca la caja (decisión de producto). */}
      <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-4 py-3 flex items-start gap-2.5">
        <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
        <p className="text-[12.5px] text-amber-200/90 leading-relaxed">
          Este libro es independiente de la caja: anotar acá <b>no</b> descuenta del arqueo.
          Si los billetes salen del cajón, regístralos también como <b>Egreso</b> en Control de Caja
          o el cierre del día te va a dar descuadre por ese monto.
        </p>
      </div>

      {/* Movimientos */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Movimientos</p>
        {loading ? (
          <p className="text-sm text-slate-500 py-6 text-center">Cargando…</p>
        ) : !(movimientos || []).length ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
            <PiggyBank size={26} className="text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Todavía no hay movimientos.</p>
            <p className="text-[12px] text-slate-500 mt-1">Cuando guarden plata, va a aparecer acá con su fecha.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] divide-y divide-white/[0.06] overflow-hidden">
            {movimientos.map(m => {
              const esRetiro = m.tipo === 'retiro';
              return (
                <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${esRetiro ? 'bg-rose-500/15 text-rose-300' : 'bg-emerald-500/15 text-emerald-300'}`}>
                    {esRetiro ? <Minus size={15} /> : <Plus size={15} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-semibold text-slate-100 truncate">
                      {m.nota || (esRetiro ? 'Retiro del ahorro' : 'Depósito al ahorro')}
                    </p>
                    <p className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="inline-flex items-center gap-1"><CalendarDays size={10} /> {fechaLegible(m)}</span>
                      {m.creadoPor?.email && (
                        <span className="inline-flex items-center gap-1"><User size={10} /> {m.creadoPor.email}</span>
                      )}
                    </p>
                  </div>
                  <p className={`text-sm font-bold tabular-nums shrink-0 ${esRetiro ? 'text-rose-300' : 'text-emerald-300'}`}>
                    {esRetiro ? '−' : '+'}{fmt(m.monto)}
                  </p>
                  <button
                    onClick={() => borrar(m)}
                    disabled={borrando === m.id}
                    title="Borrar movimiento"
                    className="shrink-0 text-slate-600 hover:text-rose-400 transition-colors disabled:opacity-40"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal depositar / retirar */}
      {modal && (
        <div className="fixed inset-0 z-[9000] flex items-center justify-center px-4 bg-black/75 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) cerrar(); }}>
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-950 p-5 space-y-3">
            <h3 className="text-base font-bold text-primary">
              {modal === 'retiro' ? 'Sacar del ahorro' : 'Guardar plata en el ahorro'}
            </h3>
            <div>
              <label className={lbl}>Monto ($)</label>
              <input type="number" min="0" className={inp} placeholder="0" value={monto} onChange={e => setMonto(e.target.value)} autoFocus />
            </div>
            <div>
              <label className={lbl}>Fecha</label>
              <input type="date" className={inp} value={fecha} onChange={e => setFecha(e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Nota (opcional)</label>
              <input className={inp} placeholder={modal === 'retiro' ? 'Ej: compra de sillón' : 'Ej: cierre de la semana'} value={nota} onChange={e => setNota(e.target.value)} />
            </div>
            {modal === 'retiro' && (
              <p className="text-[11.5px] text-slate-500">Disponible en el ahorro: <b className="text-slate-300">{fmt(saldo)}</b></p>
            )}
            {error && <p className="text-[12px] text-rose-400 leading-relaxed">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={cerrar} className="flex-1 rounded-xl border border-white/10 hover:border-white/25 text-slate-300 text-sm font-semibold py-2.5 transition-colors">
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={guardando || !monto}
                className={`flex-1 rounded-xl text-white text-sm font-bold py-2.5 transition-colors disabled:bg-slate-700 ${modal === 'retiro' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}
              >
                {guardando ? 'Guardando…' : (modal === 'retiro' ? 'Sacar' : 'Guardar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
