import { useState, useEffect, useMemo } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../lib/firebase';
import { useTenant } from '../contexts/TenantContext';
import { confirmDialog } from '../lib/confirmDialog';
import HelpModal, { HelpButton } from '../components/ui/HelpModal';
import {
  CheckCircle2, AlertCircle, XCircle, MessageSquare,
  ExternalLink, CreditCard, Sparkles, Copy, Check, Send,
  Calendar, Building2, User, Hash, Mail, Wallet, Clock,
  Headphones, ChevronRight, Repeat, Zap,
} from 'lucide-react';

/* ── Configuración por estado ───────────────────────────────────── */
const STATUS_CFG = {
  al_dia: {
    label: 'Al día',
    sub: 'Tu suscripción está activa y todos los servicios funcionando.',
    Icon: CheckCircle2,
    accent: '#10b981',
    text: 'text-emerald-300',
    bg: 'bg-emerald-500/10',
    ring: 'ring-emerald-500/30',
    glow: 'rgba(16,185,129,0.25)',
    gradient: 'from-emerald-500/15 via-slate-900 to-slate-950',
    heroClass: 'hero-card-emerald',
  },
  pendiente: {
    label: 'Pago pendiente',
    sub: 'Tienes una cuota próxima por pagar.',
    Icon: AlertCircle,
    accent: '#f59e0b',
    text: 'text-amber-300',
    bg: 'bg-amber-500/10',
    ring: 'ring-amber-500/30',
    glow: 'rgba(245,158,11,0.25)',
    gradient: 'from-amber-500/15 via-slate-900 to-slate-950',
    heroClass: 'hero-card-amber',
  },
  atrasado: {
    label: 'Pago atrasado',
    sub: 'Tu cuota ya venció. Regulariza para evitar pausas.',
    Icon: XCircle,
    accent: '#ef4444',
    text: 'text-red-300',
    bg: 'bg-red-500/10',
    ring: 'ring-red-500/30',
    glow: 'rgba(239,68,68,0.25)',
    gradient: 'from-red-500/15 via-slate-900 to-slate-950',
    heroClass: 'hero-card-red',
  },
};

/* ── Helpers ────────────────────────────────────────────────────── */
function mesLabel(mes) {
  if (!mes) return '';
  const [y, m] = mes.split('-').map(Number);
  const s = new Date(y, m - 1, 15).toLocaleString('es-CL', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ════════════════════════════════════════════════════════════════
   PLANES Y TARIFAS MODAL
   ════════════════════════════════════════════════════════════════ */
function PlanCard({ nombre, sub, mes, anual, pop }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-4 transition-all ${
        pop
          ? 'border-lime-500/60 bg-gradient-to-br from-lime-500/15 via-slate-900 to-slate-950 shadow-[0_8px_24px_-8px_rgba(132,204,22,0.4)]'
          : 'border-slate-700/60 bg-slate-800/40'
      }`}
    >
      {pop && (
        <span className="absolute -top-2.5 left-3 inline-flex items-center gap-1 rounded-full bg-lime-400 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-emerald-950">
          <Sparkles size={9} /> Más popular
        </span>
      )}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-primary">{nombre}</p>
          <p className="text-[11px] text-slate-500">{sub}</p>
        </div>
        <div className="text-right">
          <p className={`text-lg font-black ${pop ? 'text-lime-300' : 'text-primary'}`}>
            ${mes}<span className="text-[11px] font-medium text-slate-500">/mes</span>
          </p>
          <p className="text-[10px] text-slate-500">anual ${anual}/mes</p>
        </div>
      </div>
    </div>
  );
}

function TarifasModal({ onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 4 }}
        transition={{ type: 'spring', damping: 22, stiffness: 240 }}
        className="w-full max-w-sm overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/95 shadow-2xl backdrop-blur"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3.5">
          <h3 className="text-base font-bold text-primary">Planes y tarifas</h3>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full bg-white/5 text-slate-400 transition-colors hover:bg-white/10 hover:text-primary"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
        <div className="max-h-[78vh] space-y-3 overflow-y-auto p-5">
          <PlanCard nombre="Individual" sub="1 barbero · trabajas solo" mes="14.900" anual="11.900" />
          <PlanCard nombre="Local" sub="Barberos ilimitados · por local" mes="29.900" anual="24.900" pop />
          <div className="rounded-2xl border border-slate-700/60 bg-slate-800/40 p-4">
            <p className="mb-1.5 text-sm font-bold text-primary">
              Cadena <span className="text-[11px] font-medium text-slate-500">· 3 o más locales</span>
            </p>
            <div className="space-y-0.5">
              <div className="flex items-center justify-between text-[13px] text-slate-300">
                <span>1 local</span><b className="text-primary">$29.900 c/u</b>
              </div>
              <div className="flex items-center justify-between text-[13px] text-slate-300">
                <span>2 locales</span><b className="text-primary">$25.900 c/u</b>
              </div>
              <div className="flex items-center justify-between text-[13px] text-lime-300">
                <span>3 a 5 locales</span><b>$22.900 c/u</b>
              </div>
            </div>
          </div>
          <p className="pt-1 text-center text-[11px] leading-relaxed text-slate-500">
            Primer mes gratis · sin instalación · migración gratis<br />
            2° local: 50% off los primeros 3 meses
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════
   VIEW PRINCIPAL
   ════════════════════════════════════════════════════════════════ */
export default function Mensualidad() {
  const { id: tenantId, name: tenantName } = useTenant();
  const [billing, setBilling] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showTarifas, setShowTarifas] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copiado, setCopiado] = useState(false);
  const [copiadoField, setCopiadoField] = useState(null);

  useEffect(() => {
    const ref = doc(db, '_billing', tenantId);
    const unsub = onSnapshot(
      ref,
      snap => { setBilling(snap.exists() ? snap.data() : null); setLoading(false); },
      ()   => setLoading(false),
    );
    return unsub;
  }, [tenantId]);

  // ── Estado automático por fecha (solo lectura) ──
  const _fechaPP = billing?.fechaProximoPago;
  const _dpp = useMemo(() => {
    if (!_fechaPP) return null;
    try {
      const d = _fechaPP.toDate ? _fechaPP.toDate() : new Date(`${_fechaPP}T00:00:00`);
      return isNaN(d.getTime()) ? null : d;
    } catch { return null; }
  }, [_fechaPP]);
  const _hoy = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const vencida = _dpp ? _dpp < _hoy : false;
  const diasVencido = vencida ? Math.floor((_hoy - _dpp) / 86400000) : 0;
  const diasParaVencer = !vencida && _dpp ? Math.ceil((_dpp - _hoy) / 86400000) : null;

  const estado = vencida ? 'atrasado' : (billing?.estadoPago || 'al_dia');
  const cfg    = STATUS_CFG[estado] || STATUS_CFG.al_dia;
  const { Icon } = cfg;

  const cuotas   = Array.isArray(billing?.cuotas) ? billing.cuotas : [];
  const _mesActual = `${_hoy.getFullYear()}-${String(_hoy.getMonth() + 1).padStart(2, '0')}`;
  const claseCuota = c => c.pagada ? 'pagada' : (c.mes && c.mes <= _mesActual ? 'pendiente' : 'proxima');
  const pagadas    = cuotas.filter(c => c.pagada).length;
  const pendientes = cuotas.filter(c => claseCuota(c) === 'pendiente').length;
  const proximas   = cuotas.filter(c => claseCuota(c) === 'proxima').length;
  const progresoPct = cuotas.length ? Math.round((pagadas / cuotas.length) * 100) : 0;

  const formatFecha = raw => {
    if (!raw) return null;
    try {
      const d = raw.toDate ? raw.toDate() : new Date(`${raw}T00:00:00`);
      return isNaN(d.getTime()) ? null : d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch { return null; }
  };

  const handleCopiarDatos = () => {
    const texto = `Ignacio Mateluna\n20.988.528-K\nignaciiio.mate@gmail.com\nCuenta Corriente\n19831360665\nBanco Falabella`;
    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };
  const copyField = (key, value) => {
    navigator.clipboard.writeText(value);
    setCopiadoField(key);
    setTimeout(() => setCopiadoField(null), 1500);
  };

  const primerPendiente = cuotas.find(c => claseCuota(c) === 'pendiente')
    || cuotas.find(c => claseCuota(c) === 'proxima');
  const mesMensaje = primerPendiente ? mesLabel(primerPendiente.mes) : '';

  // ── Pago automático (Suscripciones MP) ──
  // El estado vive en _billing/{tid}.suscripcionMp y lo mantiene el webhook
  // mpMensualidadWebhook; aquí solo se lee y se disparan los callables.
  const [autopayBusy, setAutopayBusy] = useState(false);
  const [autopayErr,  setAutopayErr]  = useState('');
  const sub           = billing?.suscripcionMp || null;
  const autopayActivo = sub?.status === 'authorized';
  const cobroFallido  = !!(sub?.ultimoPago?.status && sub.ultimoPago.status !== 'approved');

  const activarAutopay = async () => {
    setAutopayBusy(true); setAutopayErr('');
    try {
      const fn = httpsCallable(getFunctions(undefined, 'us-central1'), 'mpMensualidadCrearLink');
      const r  = await fn({ tenantId, origen: window.location.origin });
      if (r.data?.url) window.open(r.data.url, '_blank', 'noopener');
    } catch (e) {
      setAutopayErr(e.message || 'No se pudo generar el link. Intenta de nuevo.');
    } finally { setAutopayBusy(false); }
  };

  const cancelarAutopay = async () => {
    const ok = await confirmDialog({
      title: 'Cancelar pago automático',
      message: 'Tu tarjeta dejará de cobrarse sola y volverás a pagar por transferencia manual. ¿Continuar?',
      confirmText: 'Sí, cancelar',
      cancelText: 'Volver',
    });
    if (!ok) return;
    setAutopayBusy(true); setAutopayErr('');
    try {
      const fn = httpsCallable(getFunctions(undefined, 'us-central1'), 'mpMensualidadCancelar');
      await fn({ tenantId });
    } catch (e) {
      setAutopayErr(e.message || 'No se pudo cancelar. Intenta de nuevo.');
    } finally { setAutopayBusy(false); }
  };

  const waphone = billing?.whatsappAdmin || '56983568212';
  const txtMensaje = encodeURIComponent(
    `¡Hola Ignacio! Acabo de realizar la transferencia de la mensualidad del local *${tenantName || tenantId}*` +
    (mesMensaje ? ` correspondiente al mes de *${mesMensaje}*.` : '.') +
    ` Adjunto el comprobante de transferencia. 🚀`,
  );

  return (
    <div data-view="mensualidad" className="mx-auto max-w-2xl space-y-5 p-4 sm:p-6">

      {/* ─────── HERO ─────── */}
      <Hero
        plan={billing?.plan}
        estado={estado}
        onHelp={() => setShowHelp(true)}
      />

      {loading ? (
        <Skeleton />
      ) : (
        <>
          {/* ─────── STATUS HERO ─────── */}
          <StatusCard
            cfg={cfg}
            Icon={Icon}
            monto={Number(billing?.montoPendiente) || 0}
            fechaFmt={formatFecha(billing?.fechaProximoPago)}
            vencida={vencida}
            diasVencido={diasVencido}
            diasParaVencer={diasParaVencer}
          />

          {/* ─────── Pago automático (Suscripciones MP) ─────── */}
          {billing && Number(billing?.montoPendiente) > 0 && (
            <AutopayCard
              sub={sub}
              activo={autopayActivo}
              cobroFallido={cobroFallido}
              monto={Number(billing?.montoPendiente) || 0}
              busy={autopayBusy}
              err={autopayErr}
              onActivar={activarAutopay}
              onCancelar={cancelarAutopay}
              formatFecha={formatFecha}
            />
          )}

          {/* ─────── Ver planes ─────── */}
          {!['elegance', 'ferraza'].includes(tenantId) && (
            <button
              type="button"
              onClick={() => setShowTarifas(true)}
              className="group flex w-full items-center justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-900/40 px-5 py-3 text-left transition-all hover:border-violet-500/40 hover:bg-violet-500/[0.06]"
            >
              <span className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-violet-500/15 text-violet-300 ring-1 ring-violet-400/25">
                  <Sparkles size={14} />
                </span>
                <span>
                  <p className="text-sm font-bold text-primary">Ver planes y tarifas</p>
                  <p className="text-[11px] text-slate-500">Compara Individual, Local y Cadena.</p>
                </span>
              </span>
              <ChevronRight size={16} className="text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:text-violet-300" />
            </button>
          )}

          {/* ─────── Agradecimiento al_dia ─────── */}
          {estado === 'al_dia' && <ThanksCard />}

          {/* ─────── Datos bancarios ─────── */}
          <BankCard
            copiado={copiado}
            copiadoField={copiadoField}
            onCopyAll={handleCopiarDatos}
            onCopyField={copyField}
            waUrl={`https://wa.me/${waphone}?text=${txtMensaje}`}
          />

          {/* ─────── Cuotas ─────── */}
          {cuotas.length > 0 && (
            <CuotasCard
              cuotas={cuotas}
              claseCuota={claseCuota}
              pagadas={pagadas}
              pendientes={pendientes}
              proximas={proximas}
              progresoPct={progresoPct}
            />
          )}

          {/* ─────── Mensaje admin ─────── */}
          {billing?.mensajeAdmin && (
            <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-violet-500/10 via-slate-900 to-slate-900 p-5 shadow-lg backdrop-blur-sm">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.25), transparent 70%)', filter: 'blur(18px)' }}
              />
              <div className="relative">
                <div className="mb-3 flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-violet-500/15 text-violet-300 ring-1 ring-violet-400/25">
                    <MessageSquare size={13} />
                  </span>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-300">
                    Mensaje de SynapTech
                  </p>
                </div>
                <p className="whitespace-pre-line text-sm font-medium leading-relaxed text-slate-200">
                  {billing.mensajeAdmin}
                </p>
              </div>
            </div>
          )}

          {/* ─────── Sin billing ─────── */}
          {!billing && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center shadow-lg">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-400/25">
                <CheckCircle2 size={26} className="text-emerald-300" />
              </span>
              <p className="text-base font-bold text-primary">Todo al día</p>
              <p className="text-xs text-slate-500">No hay mensajes de facturación pendientes.</p>
            </div>
          )}

          {/* ─────── Soporte ─────── */}
          <SupportCard />
        </>
      )}

      <AnimatePresence>
        {showTarifas && <TarifasModal onClose={() => setShowTarifas(false)} />}
      </AnimatePresence>

      {showHelp && (
        <HelpModal title="Tu suscripción con SynapTech" onClose={() => setShowHelp(false)}>
          <p>Acá ves el estado de tu plan SynapTech: vigencia, fecha de próximo cobro y método de pago. Para cambios de plan o consultas, escríbenos por WhatsApp.</p>
          <div>
            <p className="font-semibold text-emerald-400 mb-1">Estados</p>
            <ul className="list-disc ml-4 space-y-1">
              <li><span className="text-emerald-400">Al día</span>: tu suscripción está activa y la próxima cuota se cobra en la fecha indicada.</li>
              <li><span className="text-amber-400">Por vencer</span>: faltan ≤7 días para el cobro. Asegurate de tener fondos.</li>
              <li><span className="text-rose-400">Vencida</span>: el cobro no se procesó. Algunas funciones se pausan hasta regularizar.</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-emerald-400 mb-1">¿Quieres cambiar de plan?</p>
            <p>Escríbenos por <strong className="text-primary">WhatsApp +56 9 8356 8212</strong>. Te ayudamos a evaluar opciones según el crecimiento del local.</p>
          </div>
          <p className="text-xs text-amber-400 bg-amber-400/5 border border-amber-400/20 rounded-lg px-3 py-2">💡 Si ves "Vencida" pero ya pagaste, esperá unos minutos a que el banco procese y refresca. Si persiste, escríbenos.</p>
        </HelpModal>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   HERO HEADER — título + plan pill + estado mini
   ════════════════════════════════════════════════════════════════ */
function Hero({ plan, estado, onHelp }) {
  const cfg = STATUS_CFG[estado] || STATUS_CFG.al_dia;
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-wrap items-center justify-between gap-3 px-1"
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500/15 to-emerald-700/10 ring-1 ring-emerald-400/25 shadow-inner">
          <CreditCard size={19} className="text-emerald-300" />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black tracking-tight text-primary sm:text-2xl">Mensualidad</h1>
            <HelpButton onClick={onHelp} />
          </div>
          <p className="text-[11px] text-slate-500">Tu suscripción con SynapTech</p>
        </div>
      </div>
      {plan && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/30 bg-violet-500/10 px-2.5 py-1 text-[11px] font-bold text-violet-200">
          <Sparkles size={11} /> {plan}
        </span>
      )}
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ring-1 ${cfg.bg} ${cfg.text} ${cfg.ring}`}>
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inset-0 animate-ping rounded-full opacity-60" style={{ background: cfg.accent }} />
          <span className="relative h-1.5 w-1.5 rounded-full" style={{ background: cfg.accent }} />
        </span>
        {cfg.label}
      </span>
    </motion.section>
  );
}

/* ════════════════════════════════════════════════════════════════
   STATUS CARD — el corazón visual de la página
   ════════════════════════════════════════════════════════════════ */
function StatusCard({ cfg, Icon, monto, fechaFmt, vencida, diasVencido, diasParaVencer }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 }}
      className={`${cfg.heroClass || ''} relative overflow-hidden rounded-3xl border bg-gradient-to-br p-6 shadow-2xl ${cfg.ring} ${cfg.gradient}`}
      style={{ boxShadow: `0 12px 40px -12px ${cfg.glow}` }}
    >
      {/* halo */}
      <div
        aria-hidden
        className="hero-halo pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full"
        style={{ background: `radial-gradient(circle, ${cfg.glow}, transparent 70%)`, filter: 'blur(28px)' }}
      />
      {/* grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(to right, white 1px, transparent 1px), ' +
            'linear-gradient(to bottom, white 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage: 'radial-gradient(ellipse at center, black 25%, transparent 70%)',
        }}
      />

      <div className="relative">
        <div className="flex items-center gap-3">
          <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ring-1 ${cfg.bg} ${cfg.ring}`}>
            <Icon size={22} className={cfg.text} />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Estado actual
            </p>
            <p className={`text-xl font-black tracking-tight ${cfg.text}`}>{cfg.label}</p>
          </div>
        </div>

        <p className="mt-3 max-w-md text-xs leading-relaxed text-slate-400">
          {cfg.sub}
        </p>

        {monto > 0 && (
          <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/[0.06] pt-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Monto mensual</p>
              <p className="mt-1 text-3xl font-black tabular-nums tracking-tight text-primary sm:text-4xl">
                ${Number(monto).toLocaleString('es-CL')}
              </p>
            </div>
            {fechaFmt && (
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  {vencida ? 'Venció' : 'Vencimiento'}
                </p>
                <p className={`mt-1 inline-flex items-center gap-1.5 text-sm font-bold ${vencida ? 'text-red-300' : 'text-slate-100'}`}>
                  <Calendar size={12} /> {fechaFmt}
                </p>
                {vencida ? (
                  <p className="mt-0.5 text-[11px] font-semibold text-red-400/85">
                    Hace {diasVencido} día{diasVencido !== 1 ? 's' : ''}
                  </p>
                ) : diasParaVencer != null && diasParaVencer <= 7 ? (
                  <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300">
                    <Clock size={10} /> En {diasParaVencer} día{diasParaVencer !== 1 ? 's' : ''}
                  </p>
                ) : null}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════
   AUTOPAY CARD — Suscripciones Mercado Pago (cargo automático)
   Estados: sin activar (promo) · link_creado (retomar) ·
   authorized (activa, con próximo cobro) · cancelled (reactivable)
   ════════════════════════════════════════════════════════════════ */
function AutopayCard({ sub, activo, cobroFallido, monto, busy, err, onActivar, onCancelar, formatFecha }) {
  if (activo) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08 }}
        className="relative overflow-hidden rounded-3xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-slate-900 to-slate-950 p-5 shadow-lg"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-500/15 ring-1 ring-emerald-400/30">
              <Repeat size={17} className="text-emerald-300" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-primary">Pago automático activo</p>
              <p className="text-[11px] text-slate-400">
                ${Number(monto).toLocaleString('es-CL')}/mes con cargo a tu tarjeta · Mercado Pago
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-400/30 shrink-0">
            <Zap size={9} /> Activo
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/[0.06] pt-4 text-[12px]">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">Próximo cobro</p>
            <p className="mt-0.5 font-semibold text-slate-200">
              {sub?.nextPaymentDate ? (formatFecha(sub.nextPaymentDate) || sub.nextPaymentDate) : 'Lo informa Mercado Pago'}
            </p>
          </div>
          {sub?.ultimoPago?.status === 'approved' && (
            <div className="text-right">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">Último pago</p>
              <p className="mt-0.5 inline-flex items-center gap-1 font-semibold text-emerald-300">
                <Check size={11} /> {formatFecha(sub.ultimoPago.fecha) || sub.ultimoPago.fecha}
              </p>
            </div>
          )}
        </div>

        {cobroFallido && (
          <p className="mt-3 rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-[11px] font-semibold leading-relaxed text-amber-300">
            El último cobro no pasó. Mercado Pago volverá a intentarlo — revisa que tu tarjeta tenga cupo o actualízala en tu cuenta de MP.
          </p>
        )}

        <button
          type="button"
          disabled={busy}
          onClick={onCancelar}
          className="mt-4 text-[11px] font-semibold text-slate-500 underline-offset-2 transition-colors hover:text-red-400 hover:underline disabled:opacity-50"
        >
          Cancelar pago automático
        </button>
        {err && <p className="mt-2 text-[11px] font-semibold text-red-400">{err}</p>}
      </motion.div>
    );
  }

  const retomar   = sub?.status === 'link_creado';
  const cancelado = sub?.status === 'cancelled';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.08 }}
      className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-sky-500/[0.07] via-slate-900 to-slate-950 p-5 shadow-lg"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-14 -top-14 h-36 w-36 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.16), transparent 70%)', filter: 'blur(22px)' }}
      />
      <div className="relative">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-sky-500/15 ring-1 ring-sky-400/25">
            <Repeat size={17} className="text-sky-300" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-primary">
              {retomar ? 'Termina de activar tu pago automático' : 'Activa el pago automático'}
            </p>
            <p className="text-[11px] leading-relaxed text-slate-400">
              {retomar
                ? 'Generaste el link pero falta ingresar tu tarjeta. Retómalo aquí.'
                : 'Ingresa tu tarjeta una vez y la mensualidad se paga sola cada mes. Sin transferencias ni comprobantes.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={onActivar}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 py-3 text-sm font-extrabold text-sky-950 shadow-[0_8px_22px_-6px_rgba(56,189,248,0.45)] transition-transform hover:scale-[1.01] active:scale-[0.98] disabled:opacity-60"
        >
          <CreditCard size={15} />
          {busy ? 'Generando link…' : retomar ? 'Continuar activación' : 'Activar pago automático'}
        </button>

        <p className="mt-2.5 text-center text-[10px] leading-relaxed text-slate-500">
          Cargo mensual de <b className="text-slate-300">${Number(monto).toLocaleString('es-CL')}</b> vía
          Mercado Pago · puedes cancelarlo cuando quieras{cancelado ? ' · lo cancelaste, reactívalo aquí' : ''}.
        </p>
        {err && <p className="mt-2 text-center text-[11px] font-semibold text-red-400">{err}</p>}
      </div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════
   THANKS CARD (cuando estado === 'al_dia')
   ════════════════════════════════════════════════════════════════ */
function ThanksCard() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-slate-900 to-slate-950 p-7 text-center shadow-xl"
    >
      <div
        aria-hidden
        className="hero-halo-soft pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.18), transparent 70%)', filter: 'blur(28px)' }}
      />
      <div className="relative flex flex-col items-center gap-4">
        <div className="relative">
          <div className="grid h-16 w-16 place-items-center rounded-2xl border border-emerald-500/30 bg-gradient-to-tr from-emerald-500/20 via-teal-500/10 to-transparent shadow-lg shadow-emerald-500/10">
            <div className="absolute inset-0.5 rounded-2xl border border-slate-800 bg-slate-900" />
            <svg className="relative z-10 h-8 w-8 text-emerald-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <motion.span
            aria-hidden
            className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-slate-900 bg-emerald-400"
            animate={{ scale: [1, 1.25, 1], opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
        <div>
          <p className="text-sm font-black uppercase tracking-[0.25em] text-primary">SynapTech</p>
          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-emerald-400/80">S P A</p>
        </div>
        <h3 className="text-lg font-extrabold tracking-tight text-primary">¡Suscripción al día!</h3>
        <p className="text-base font-bold italic text-emerald-300">"Gracias por confiar en el futuro"</p>
        <p className="max-w-sm text-xs leading-relaxed text-slate-400">
          Tu cuenta se encuentra totalmente al día y todos nuestros servicios están activos.
          ¡Sigamos creciendo juntos!
        </p>
      </div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════
   DATOS BANCARIOS (con copy por campo)
   ════════════════════════════════════════════════════════════════ */
function BankCard({ copiado, copiadoField, onCopyAll, onCopyField, waUrl }) {
  const fields = [
    { key: 'nombre', label: 'Nombre',  value: 'Ignacio Mateluna',         Icon: User },
    { key: 'rut',    label: 'RUT',     value: '20.988.528-K',             Icon: Hash },
    { key: 'banco',  label: 'Banco',   value: 'Banco Falabella',          Icon: Building2 },
    { key: 'tipo',   label: 'Tipo',    value: 'Cuenta Corriente',         Icon: Wallet },
    { key: 'num',    label: 'N° de cuenta', value: '19831360665',         Icon: Hash, mono: true },
    { key: 'email',  label: 'Correo',  value: 'ignaciiio.mate@gmail.com', Icon: Mail },
  ];
  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg backdrop-blur-sm">
      <div
        aria-hidden
        className="hero-halo-soft pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.15), transparent 70%)', filter: 'blur(22px)' }}
      />
      <div className="relative">
        <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <p className="flex items-center gap-1.5 text-sm font-bold tracking-tight text-primary">
              <Building2 size={14} className="text-emerald-300" /> Datos bancarios
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Transfiere y envía el comprobante por WhatsApp.
            </p>
          </div>
          <button
            type="button"
            onClick={onCopyAll}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all active:scale-95 ${
              copiado
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600 hover:text-primary'
            }`}
          >
            {copiado ? <><Check size={13} /> Copiado</> : <><Copy size={13} /> Copiar todo</>}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {fields.map(({ key, label, value, Icon, mono }) => {
            const just = copiadoField === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onCopyField(key, value)}
                className="group relative flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2.5 text-left transition-all hover:border-emerald-500/30 hover:bg-emerald-500/[0.04]"
              >
                <Icon size={13} className="shrink-0 text-slate-500 group-hover:text-emerald-300" />
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
                  <p className={`truncate text-[13px] font-bold text-slate-100 ${mono ? 'font-mono' : ''}`}>
                    {value}
                  </p>
                </div>
                <span className={`shrink-0 text-slate-600 transition-all ${just ? 'text-emerald-300' : 'group-hover:text-emerald-300'}`}>
                  {just ? <Check size={13} /> : <Copy size={11} />}
                </span>
              </button>
            );
          })}
        </div>

        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] py-3.5 text-sm font-extrabold text-primary shadow-[0_8px_22px_-6px_rgba(37,211,102,0.5)] transition-transform hover:scale-[1.01] active:scale-[0.98]"
        >
          <Send size={15} /> Enviar comprobante por WhatsApp
        </a>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   CUOTAS — con progress bar y rows polished
   ════════════════════════════════════════════════════════════════ */
function CuotasCard({ cuotas, claseCuota, pagadas, pendientes, proximas, progresoPct }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg backdrop-blur-sm">
      <div className="mb-4 border-b border-slate-800 pb-4">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Historial de cuotas
          </p>
          <p className="text-[11px] tabular-nums text-slate-500">
            <b className="text-primary">{pagadas}</b>/{cuotas.length} pagadas
          </p>
        </div>
        {/* Progress bar */}
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progresoPct}%` }}
            transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-lime-300 shadow-[0_0_10px_rgba(74,222,128,0.4)]"
          />
        </div>
        {/* Badges resumen */}
        <div className="mt-3 flex flex-wrap gap-2">
          {pendientes > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300 ring-1 ring-amber-400/30">
              <AlertCircle size={9} /> {pendientes} pendiente{pendientes !== 1 ? 's' : ''}
            </span>
          )}
          {proximas > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-700/50 px-2 py-0.5 text-[10px] font-bold text-slate-300 ring-1 ring-slate-600/40">
              <Clock size={9} /> {proximas} próxima{proximas !== 1 ? 's' : ''}
            </span>
          )}
          {pagadas > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300 ring-1 ring-emerald-400/30">
              <Check size={9} /> {pagadas} pagada{pagadas !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
      <div className="space-y-2">
        {cuotas.map((c, i) => {
          const clase = claseCuota(c);
          const badge =
            clase === 'pagada'    ? { cls: 'bg-emerald-500/10 text-emerald-300 ring-emerald-400/25', dot: 'bg-emerald-400', txt: 'Pagado' }
            : clase === 'pendiente' ? { cls: 'bg-amber-500/10 text-amber-300 ring-amber-400/25',   dot: 'bg-amber-400',   txt: 'Pendiente' }
            :                         { cls: 'bg-slate-700/40 text-slate-400 ring-slate-600/30',  dot: 'bg-slate-500',   txt: 'Próximo' };
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i, 8) * 0.025 }}
              className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3 transition-colors hover:bg-slate-950/70"
            >
              <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${badge.cls}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} /> {badge.txt}
              </span>
              <span className={`flex-1 truncate text-sm font-semibold ${
                clase === 'pagada'      ? 'text-slate-500 line-through'
                : clase === 'pendiente' ? 'text-slate-100'
                :                         'text-slate-400'
              }`}>
                {mesLabel(c.mes)}
              </span>
              {c.monto > 0 && (
                <span className="shrink-0 font-mono text-xs font-black tabular-nums text-slate-300">
                  ${Number(c.monto).toLocaleString('es-CL')}
                </span>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   SUPPORT CARD
   ════════════════════════════════════════════════════════════════ */
function SupportCard() {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-5 backdrop-blur-sm">
      <div className="flex items-center gap-3 min-w-0">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-800 text-slate-400 ring-1 ring-slate-700">
          <Headphones size={15} />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            ¿Tienes preguntas?
          </p>
          <p className="text-xs font-semibold text-slate-300">Estamos listos para ayudarte.</p>
        </div>
      </div>
      <a
        href="https://www.synaptechspa.cl/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-300 transition-all hover:border-emerald-500/40 hover:bg-slate-950 hover:text-emerald-300"
      >
        <ExternalLink size={12} /> SynapTech
      </a>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   SKELETON
   ════════════════════════════════════════════════════════════════ */
function Skeleton() {
  return (
    <div className="space-y-4">
      <div className="h-44 animate-pulse rounded-3xl border border-slate-800 bg-slate-900/60" />
      <div className="h-12 animate-pulse rounded-2xl border border-slate-800 bg-slate-900/40" />
      <div className="h-72 animate-pulse rounded-3xl border border-slate-800 bg-slate-900/60" />
    </div>
  );
}
