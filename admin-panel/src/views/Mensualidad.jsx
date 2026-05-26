import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useTenant } from '../contexts/TenantContext';
import HelpModal, { HelpButton } from '../components/ui/HelpModal';
import { 
  CheckCircle2, AlertCircle, XCircle, MessageSquare, 
  ExternalLink, CreditCard, Sparkles, Copy, Check, Send 
} from 'lucide-react';

const STATUS_CFG = {
  al_dia:   { 
    label: 'Al día', 
    Icon: CheckCircle2, 
    color: 'text-emerald-400', 
    glow: 'shadow-emerald-500/10 border-emerald-500/30', 
    bg: 'bg-emerald-500/10' 
  },
  pendiente:{ 
    label: 'Pago pendiente', 
    Icon: AlertCircle, 
    color: 'text-amber-400', 
    glow: 'shadow-amber-500/10 border-amber-500/30', 
    bg: 'bg-amber-500/10' 
  },
  atrasado: { 
    label: 'Pago atrasado', 
    Icon: XCircle, 
    color: 'text-red-400', 
    glow: 'shadow-red-500/10 border-red-500/30', 
    bg: 'bg-red-500/10' 
  },
};

function mesLabel(mes) {
  if (!mes) return '';
  const [y, m] = mes.split('-').map(Number);
  const s = new Date(y, m - 1, 15).toLocaleString('es-CL', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function Mensualidad() {
  const { id: tenantId, name: tenantName } = useTenant();
  const [billing,  setBilling]  = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copiado, setCopiado] = useState(false);

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

  const handleCopiarDatos = () => {
    const texto = `Ignacio Mateluna\n20.988.528-K\nignaciiio.mate@gmail.com\nCuenta Corriente\n19831360665\nBanco Falabella`;
    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  // Obtener el mes pendiente actual si existe para armar el mensaje de WhatsApp
  const primerPendiente = cuotas.find(c => !c.pagada);
  const mesMensaje = primerPendiente ? mesLabel(primerPendiente.mes) : '';
  
  const waphone = billing?.whatsappAdmin || '56983568212'; // Teléfono oficial corregido de Ignacio
  const txtMensaje = encodeURIComponent(
    `¡Hola Ignacio! Acabo de realizar la transferencia de la mensualidad del local *${tenantName || tenantId}*` +
    (mesMensaje ? ` correspondiente al mes de *${mesMensaje}*.` : '.') + 
    ` Adjunto el comprobante de transferencia. 🚀`
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-slate-900 border border-slate-700/60 rounded-2xl shadow-inner">
          <CreditCard size={20} className="text-emerald-450" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Mensualidad
            <HelpButton onClick={() => setShowHelp(true)} />
          </h1>
          <p className="text-xs text-slate-500">Estado de tu suscripción con SynapTech</p>
        </div>
      </div>

      {loading ? (
        <div className="h-44 bg-slate-900 border border-slate-800/80 rounded-2xl animate-pulse" />
      ) : (
        <>
          {/* Plan de uso */}
          {billing?.plan && (
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-5 flex items-center gap-4 relative overflow-hidden shadow-sm group">
              <div className="absolute -top-10 -right-10 w-24 h-24 bg-violet-500/5 rounded-full blur-2xl group-hover:bg-violet-500/15 transition-all pointer-events-none" />
              <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20">
                <Sparkles size={18} className="text-violet-400" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Plan activo</p>
                <p className="text-base font-black text-white">{billing.plan}</p>
              </div>
            </div>
          )}

          {/* Estado de Suscripción */}
          <div className={`bg-slate-800/40 border rounded-2xl p-5 shadow-lg ${cfg.glow} relative overflow-hidden transition-all duration-300`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2.5 rounded-xl border border-slate-700/40 ${cfg.bg}`}>
                <Icon size={20} className={cfg.color} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Estado actual</p>
                <p className={`text-base font-black tracking-tight ${cfg.color}`}>{cfg.label}</p>
              </div>
            </div>

            {Number(billing?.montoPendiente) > 0 && (
              <div className="border-t border-slate-800/80 pt-4 mt-4 flex items-end justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Monto mensual</p>
                  <p className="text-3xl font-black text-white tracking-tight">
                    ${Number(billing.montoPendiente).toLocaleString('es-CL')}
                  </p>
                </div>
                {formatFecha(billing?.fechaProximoPago) && (
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Vencimiento</p>
                    <p className="text-sm font-bold text-slate-200">{formatFecha(billing.fechaProximoPago)}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Renderizado condicional del panel según estado de pago */}
          {estado === 'al_dia' ? (
            /* Tarjeta de Agradecimiento SynapTech (Al día) */
            <div className="bg-gradient-to-b from-slate-800/60 to-slate-900/60 border border-emerald-500/20 rounded-2xl p-8 shadow-xl relative overflow-hidden text-center flex flex-col items-center justify-center space-y-4">
              <div className="absolute -top-12 -left-12 w-36 h-36 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
              
              {/* Futuristic SynapTech Digital Logo */}
              <div className="flex flex-col items-center gap-2 mb-2 animate-bounce-slow">
                <div className="relative flex items-center justify-center w-16 h-16 bg-gradient-to-tr from-emerald-500/20 via-teal-500/10 to-transparent border border-emerald-500/30 rounded-2xl shadow-lg shadow-emerald-500/5">
                  <div className="absolute inset-0.5 rounded-2xl bg-slate-900 border border-slate-800" />
                  <svg className="w-8 h-8 text-emerald-400 relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-450 rounded-full border-2 border-slate-900 animate-pulse" />
                </div>
                <div>
                  <p className="text-sm font-black text-white tracking-[0.25em] uppercase">SynapTech</p>
                  <p className="text-[8px] font-black text-emerald-450 tracking-[0.4em] uppercase opacity-80 mt-0.5">S P A</p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-extrabold text-white tracking-tight">¡Suscripción al día!</h3>
                <p className="text-emerald-400 font-bold italic text-base">“Gracias por confiar en el futuro”</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                  Tu cuenta se encuentra totalmente al día y todos nuestros servicios están activos. Agradecemos enormemente tu compromiso de pago y preferencia con nosotros. ¡Sigamos creciendo juntos!
                </p>
              </div>
            </div>
          ) : (
            /* Datos de Transferencia Bancaria (Si tiene deudas/pendientes) */
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-5 shadow-lg relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-28 h-28 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
              <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
                <div>
                  <p className="text-xs font-bold text-white tracking-tight flex items-center gap-1.5">
                    🏦 Datos de Transferencia Bancaria
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Realiza tu pago directamente a los siguientes datos:</p>
                </div>
                <button
                  onClick={handleCopiarDatos}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-700 text-slate-400 hover:text-white text-xs font-bold rounded-xl transition-all active:scale-95 shadow-inner"
                >
                  {copiado ? (
                    <>
                      <Check size={13} className="text-emerald-400" />
                      <span className="text-emerald-400 font-bold">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      <span>Copiar Datos</span>
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Nombre</span>
                  <span className="font-semibold text-slate-200">Ignacio Mateluna</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">RUT</span>
                  <span className="font-semibold text-slate-200">20.988.528-K</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Banco</span>
                  <span className="font-semibold text-slate-200">Banco Falabella</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Tipo de Cuenta</span>
                  <span className="font-semibold text-slate-200">Cuenta Corriente</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Número de Cuenta</span>
                  <span className="font-bold text-slate-200 font-mono">19831360665</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Correo de confirmación</span>
                  <span className="font-semibold text-slate-200">ignaciiio.mate@gmail.com</span>
                </div>
              </div>

              {/* Botón de Envío por WhatsApp */}
              <div className="pt-5 mt-5 border-t border-slate-800/80">
                <a
                  href={`https://wa.me/${waphone}?text=${txtMensaje}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-emerald-950/20 active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send size={15} />
                  <span>Enviar Comprobante por WhatsApp</span>
                </a>
              </div>
            </div>
          )}

          {/* Cuotas */}
          {cuotas.length > 0 && (
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
                <p className="text-xs font-bold text-slate-200 tracking-tight uppercase">Historial de cuotas</p>
                <span className="text-xs text-slate-500">
                  {pagadas}/{cuotas.length} pagadas
                  {pendientes > 0 && (
                    <span className="ml-2.5 text-amber-400 font-bold">· {pendientes} pendiente{pendientes !== 1 ? 's' : ''}</span>
                  )}
                </span>
              </div>
              <div className="space-y-2">
                {cuotas.map((c, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900/30 border border-slate-800/80 transition-all hover:bg-slate-900/50"
                  >
                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full flex-shrink-0 border ${
                      c.pagada
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-amber-500/10 border-amber-500/25 text-amber-400'
                    }`}>
                      {c.pagada ? '✓ Pagado' : '○ Pendiente'}
                    </span>
                    <span className={`flex-1 text-sm font-semibold ${c.pagada ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                      {mesLabel(c.mes)}
                    </span>
                    {c.monto > 0 && (
                      <span className="text-xs font-black text-slate-400 flex-shrink-0 font-mono">
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
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare size={14} className="text-slate-400 animate-pulse" />
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Mensaje de SynapTech</p>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line font-medium">{billing.mensajeAdmin}</p>
            </div>
          ) : null}

          {/* Sin datos */}
          {!billing && (
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-10 text-center shadow-lg">
              <CheckCircle2 size={32} className="text-emerald-500/40 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-350">Todo al día</p>
              <p className="text-xs text-slate-600 mt-1">No hay mensajes de facturación pendientes.</p>
            </div>
          )}

          {/* Contacto */}
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-5 flex items-center justify-between shadow-lg">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">¿Tienes preguntas?</p>
              <p className="text-xs text-slate-300 font-semibold">Estamos listos para ayudarte con soporte.</p>
            </div>
            <a
              href="https://www.synaptechspa.cl/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 border border-slate-700 hover:text-emerald-400 hover:border-slate-500 text-slate-400 text-xs font-bold rounded-xl transition-all"
            >
              <ExternalLink size={13} />
              SynapTech
            </a>
          </div>
        </>
      )}

      {showHelp && (
        <HelpModal title="Tu suscripción con SynapTech" onClose={() => setShowHelp(false)}>
          <p>Acá ves el estado de tu plan SynapTech: vigencia, fecha de próximo cobro y método de pago. Para cambios de plan o consultas, escribinos por WhatsApp.</p>

          <div>
            <p className="font-semibold text-emerald-400 mb-1">Estados</p>
            <ul className="list-disc ml-4 space-y-1">
              <li><span className="text-emerald-400">Al día</span>: tu suscripción está activa y la próxima cuota se cobra en la fecha indicada.</li>
              <li><span className="text-amber-400">Por vencer</span>: faltan ≤7 días para el cobro. Asegurate de tener fondos.</li>
              <li><span className="text-rose-400">Vencida</span>: el cobro no se procesó. Algunas funciones se pausan hasta regularizar.</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-emerald-400 mb-1">¿Querés cambiar de plan?</p>
            <p>Escribinos por <strong className="text-white">WhatsApp +56 9 8356 8212</strong>. Te ayudamos a evaluar opciones según el crecimiento del local.</p>
          </div>

          <p className="text-xs text-amber-400 bg-amber-400/5 border border-amber-400/20 rounded-lg px-3 py-2">💡 Si ves "Vencida" pero ya pagaste, esperá unos minutos a que el banco procese y refresca. Si persiste, escribinos.</p>
        </HelpModal>
      )}
    </div>
  );
}
