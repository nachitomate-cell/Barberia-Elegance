import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useTenant } from '../../contexts/TenantContext';
import { AlertTriangle, Clock, X, ChevronRight } from 'lucide-react';

function parseFecha(f) {
  if (!f) return null;
  try {
    const d = f.toDate ? f.toDate() : new Date(`${f}T00:00:00`);
    return isNaN(d.getTime()) ? null : d;
  } catch { return null; }
}

/**
 * Banner global de cobro: avisa si el pago está próximo (≤5 días) o atrasado.
 * Lee _billing/{tenant}. El de "próximo" se puede descartar (por fecha);
 * el de "atrasado" no se descarta (presión hasta regularizar).
 */
export default function BillingBanner() {
  const { id: tenantId } = useTenant();
  const navigate = useNavigate();
  const [billing, setBilling]     = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const ref = doc(db, '_billing', tenantId);
    const unsub = onSnapshot(ref, s => setBilling(s.exists() ? s.data() : null), () => setBilling(null));
    return unsub;
  }, [tenantId]);

  if (!billing) return null;

  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const due = parseFecha(billing.fechaProximoPago);
  const dias = due ? Math.round((due.getTime() - hoy.getTime()) / 86400000) : null;

  let level = null;
  if (billing.estadoPago === 'atrasado' || (dias !== null && dias < 0)) level = 'atrasado';
  else if (dias !== null && dias >= 0 && dias <= 5) level = 'proximo';
  if (!level) return null;

  // El aviso "próximo" se puede descartar (clave por fecha de vencimiento).
  const dismissKey = `billing_banner_${tenantId}_${billing.fechaProximoPago || ''}`;
  const yaDescartado = level === 'proximo' && (dismissed || (() => {
    try { return localStorage.getItem(dismissKey) === '1'; } catch { return false; }
  })());
  if (yaDescartado) return null;

  const fechaTxt = due ? due.toLocaleDateString('es-CL', { day: 'numeric', month: 'long' }) : '';
  const montoTxt = Number(billing.montoPendiente) > 0 ? `$${Number(billing.montoPendiente).toLocaleString('es-CL')}` : '';
  const isRed = level === 'atrasado';

  let msg, sub;
  if (isRed) {
    const d = dias !== null && dias < 0 ? Math.abs(dias) : null;
    msg = 'Tu mensualidad está atrasada';
    sub = (d ? `Venció hace ${d} día${d !== 1 ? 's' : ''}. ` : '') +
          `Regulariza tu pago${montoTxt ? ` de ${montoTxt}` : ''} para mantener tu cuenta activa.`;
  } else {
    msg = dias === 0 ? 'Tu mensualidad vence hoy' : `Tu mensualidad vence en ${dias} día${dias !== 1 ? 's' : ''}`;
    sub = `${fechaTxt ? `Vence el ${fechaTxt}. ` : ''}${montoTxt ? `Monto: ${montoTxt}.` : ''}`.trim();
  }

  const dismiss = () => { setDismissed(true); try { localStorage.setItem(dismissKey, '1'); } catch {} };

  return (
    <div className={`shrink-0 px-4 py-3 border-b flex items-center gap-3 ${isRed ? 'bg-red-950/40 border-red-900/50' : 'bg-amber-950/30 border-amber-900/40'}`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isRed ? 'bg-red-500/15' : 'bg-amber-500/15'}`}>
        {isRed ? <AlertTriangle size={18} className="text-red-400" /> : <Clock size={18} className="text-amber-400" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-bold ${isRed ? 'text-red-300' : 'text-amber-300'}`}>{msg}</p>
        {sub && <p className="text-xs text-slate-400 truncate">{sub}</p>}
      </div>
      <button
        onClick={() => navigate('/mensualidad')}
        className={`shrink-0 flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-lg transition-all active:scale-95 border ${
          isRed ? 'bg-red-500/15 text-red-300 hover:bg-red-500/25 border-red-500/30'
                : 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border-amber-500/30'
        }`}
      >
        {isRed ? 'Pagar ahora' : 'Pagar'} <ChevronRight size={13} />
      </button>
      {level === 'proximo' && (
        <button onClick={dismiss} className="shrink-0 text-slate-500 hover:text-primary transition-colors p-1" aria-label="Descartar">
          <X size={16} />
        </button>
      )}
    </div>
  );
}
