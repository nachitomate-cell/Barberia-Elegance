import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useTenant } from '../contexts/TenantContext';
import { CheckCircle2, AlertCircle, XCircle, MessageSquare, ExternalLink, CreditCard, Sparkles } from 'lucide-react';

const STATUS_CFG = {
  al_dia:   { label: 'Al día',         Icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  pendiente:{ label: 'Pago pendiente', Icon: AlertCircle,  color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/30'   },
  atrasado: { label: 'Pago atrasado',  Icon: XCircle,      color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/30'     },
};

function mesLabel(mes) {
  const [y, m] = mes.split('-').map(Number);
  const s = new Date(y, m - 1, 15).toLocaleString('es-CL', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function Mensualidad() {
  const { id: tenantId } = useTenant();
  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ref = doc(db, '_billing', tenantId);
    const unsub = onSnapshot(
      ref,
      snap => { setBilling(snap.exists() ? snap.data() : null); setLoading(false); },
      ()   => setLoading(false),
    );
    return unsub;
  }, [tenantId]);

  const estado = billing?.estadoPago || 'al_dia';
  const cfg    = STATUS_CFG[estado] || STATUS_CFG.al_dia;
  const { Icon } = cfg;

  const cuotas   = Array.isArray(billing?.cuotas) ? billing.cuotas : [];
  const pagadas  = cuotas.filter(c => c.pagada).length;
  const pendientes = cuotas.filter(c => !c.pagada).length;

  const formatFecha = raw => {
    if (!raw) return null;
    try {
      const d = raw.toDate ? raw.toDate() : new Date(raw);
      return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch { return null; }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <CreditCard size={20} className="text-slate-400" />
        <div>
          <h1 className="text-xl font-bold text-white">Mensualidad</h1>
          <p className="text-sm text-slate-500">Estado de tu suscripción con SynapTech</p>
        </div>
      </div>

      {loading ? (
        <div className="h-36 bg-slate-900 border border-slate-800 rounded-xl animate-pulse" />
      ) : (
        <>
          {/* Plan de uso */}
          {billing?.plan && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center gap-4">
              <div className="p-2.5 rounded-lg bg-violet-500/10">
                <Sparkles size={18} className="text-violet-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Plan activo</p>
                <p className="text-base font-bold text-white">{billing.plan}</p>
              </div>
            </div>
          )}

          {/* Estado */}
          <div className={`bg-slate-900 border rounded-xl p-5 ${cfg.border}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2.5 rounded-lg ${cfg.bg}`}>
                <Icon size={20} className={cfg.color} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado actual</p>
                <p className={`text-lg font-bold ${cfg.color}`}>{cfg.label}</p>
              </div>
            </div>

            {Number(billing?.montoPendiente) > 0 && (
              <div className="border-t border-slate-800 pt-4 mt-4 flex items-end justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Monto mensual</p>
                  <p className="text-3xl font-bold text-white">
                    ${Number(billing.montoPendiente).toLocaleString('es-CL')}
                  </p>
                </div>
                {formatFecha(billing?.fechaProximoPago) && (
                  <div className="text-right">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Vencimiento</p>
                    <p className="text-sm font-semibold text-white">{formatFecha(billing.fechaProximoPago)}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cuotas */}
          {cuotas.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Historial de cuotas</p>
                <span className="text-xs text-slate-500">
                  {pagadas}/{cuotas.length} pagada{pagadas !== 1 ? 's' : ''}
                  {pendientes > 0 && (
                    <span className="ml-2 text-amber-400 font-semibold">· {pendientes} pendiente{pendientes !== 1 ? 's' : ''}</span>
                  )}
                </span>
              </div>
              <div className="space-y-2">
                {cuotas.map((c, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50"
                  >
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                      c.pagada
                        ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                        : 'bg-amber-500/10 border border-amber-500/25 text-amber-400'
                    }`}>
                      {c.pagada ? '✓' : '○'}
                    </span>
                    <span className={`flex-1 text-sm font-medium ${c.pagada ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                      {mesLabel(c.mes)}
                    </span>
                    {c.monto > 0 && (
                      <span className="text-xs font-semibold text-slate-400 flex-shrink-0">
                        ${Number(c.monto).toLocaleString('es-CL')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mensaje del admin */}
          {billing?.mensajeAdmin ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare size={14} className="text-slate-400" />
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Mensaje de SynapTech</p>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">{billing.mensajeAdmin}</p>
            </div>
          ) : null}

          {/* Sin datos */}
          {!billing && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center">
              <CheckCircle2 size={32} className="text-emerald-500/40 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-400">Todo al día</p>
              <p className="text-xs text-slate-600 mt-1">No hay mensajes de facturación pendientes.</p>
            </div>
          )}

          {/* Contacto */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">¿Tienes preguntas?</p>
            <a
              href="https://www.synaptechspa.cl/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <ExternalLink size={14} />
              Contactar a SynapTech
            </a>
          </div>
        </>
      )}
    </div>
  );
}
