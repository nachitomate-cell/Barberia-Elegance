import { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { resolveTenantId } from '../lib/tenantUtils';
import { withTimeout } from '../lib/firestore-helpers';
import { Gift, Search, AlertCircle } from 'lucide-react';

function pad(n) { return String(n).padStart(2, '0'); }
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function formatCLP(n) { return `$${Math.round(n).toLocaleString('es-CL')}`; }

export default function SaldoGiftCard() {
  const [codigo, setCodigo] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState('');

  const tenantId = resolveTenantId();
  const colPath = tenantId === 'elegance' ? 'giftCards' : `tenants/${tenantId}/giftCards`;

  // Prefill desde el enlace compartido (?codigo=XXXX) y auto-consulta una vez.
  const autoRan = useRef(false);
  useEffect(() => {
    if (autoRan.current) return;
    const code = new URLSearchParams(window.location.search).get('codigo');
    if (code) {
      autoRan.current = true;
      const clean = code.trim().toUpperCase();
      setCodigo(clean);
      buscar(clean);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buscar = async (codeArg) => {
    const code = (typeof codeArg === 'string' ? codeArg : codigo).trim().toUpperCase();
    if (!code) return;
    setLoading(true);
    setErr('');
    setResult(null);
    try {
      const snap = await withTimeout(getDocs(query(collection(db, colPath), where('codigo', '==', code))), 15000, 'saldogc/lookup');
      if (snap.empty) { setErr('Código no encontrado.'); return; }
      const gc = { id: snap.docs[0].id, ...snap.docs[0].data() };
      if (gc.venceEn && gc.venceEn < today()) gc.estado = 'vencida';
      setResult(gc);
    } catch {
      setErr('Error al consultar. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const statusStyle = {
    activa:  'bg-emerald-500/5 border-emerald-500/20 text-emerald-400 badge-emerald',
    parcial: 'bg-amber-500/5  border-amber-500/20  text-amber-400  badge-amber',
    usada:   'bg-slate-800    border-slate-700      text-slate-400  badge-slate',
    vencida: 'bg-red-500/5    border-red-500/20     text-red-400    badge-red',
  };
  const statusLabel = { activa: 'Activa', parcial: 'Parcial', usada: 'Usada', vencida: 'Vencida' };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">

        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <Gift size={24} className="text-emerald-400" />
          </div>
          <h1 className="text-xl font-bold text-white">Consultar Saldo</h1>
          <p className="text-sm text-slate-400 mt-1">Ingresa el código de tu Gift Card</p>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={codigo}
            onChange={e => { setCodigo(e.target.value.toUpperCase()); setErr(''); setResult(null); }}
            onKeyDown={e => e.key === 'Enter' && buscar()}
            placeholder="XXXX-XXXX-XXXX"
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm font-mono text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none uppercase"
          />
          <button
            onClick={buscar}
            disabled={loading || !codigo.trim()}
            className="px-4 py-3 rounded-xl bg-emerald-500 text-emerald-950 font-bold hover:bg-emerald-400 disabled:opacity-50 transition-all"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-emerald-900 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Search size={16} />
            )}
          </button>
        </div>

        {err && (
          <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            <AlertCircle size={14} className="shrink-0" />
            {err}
          </div>
        )}

        {result && (
          <div className={`rounded-xl border p-5 space-y-4 ${
            result.estado === 'activa'  ? 'bg-emerald-500/5 border-emerald-500/20' :
            result.estado === 'parcial' ? 'bg-amber-500/5  border-amber-500/20'  :
            result.estado === 'vencida' ? 'bg-red-500/5    border-red-500/20'    :
                                          'bg-slate-800    border-slate-700'
          }`}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-white">{result.nombre}</p>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                result.estado === 'activa'  ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' :
                result.estado === 'parcial' ? 'bg-amber-500/20   border-amber-500/30   text-amber-400'  :
                result.estado === 'vencida' ? 'bg-red-500/20     border-red-500/30     text-red-400'    :
                                              'bg-slate-700      border-slate-600      text-slate-400'
              }`}>
                {statusLabel[result.estado] || result.estado}
              </span>
            </div>

            <div className="text-center py-2">
              <p className="text-5xl font-black text-white">{formatCLP(result.saldo)}</p>
              <p className="text-sm text-slate-400 mt-1.5">saldo disponible</p>
              {result.valor !== result.saldo && (
                <p className="text-xs text-slate-500 mt-0.5">de {formatCLP(result.valor)} original</p>
              )}
            </div>

            {result.venceEn && (
              <p className="text-xs text-slate-400 text-center border-t border-slate-700/50 pt-3">
                {result.estado === 'vencida' ? '⚠️ Venció el ' : 'Vence el '}{result.venceEn}
              </p>
            )}
          </div>
        )}

        <p className="text-xs text-slate-600 text-center">
          ¿Dudas? Consulta en caja con tu código.
        </p>
      </div>
    </div>
  );
}
