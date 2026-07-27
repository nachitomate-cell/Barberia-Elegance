import { useSyncExternalStore, useEffect, useState, useRef } from 'react';
import { subscribe, getState, resolveTuu } from '../../lib/tuuSandbox';
import {
  Terminal, CreditCard, Banknote, Gift, CheckCircle2, XCircle,
  Loader2, AlertTriangle, ArrowLeft,
} from 'lucide-react';

// Host unico del modal sandbox TUU. Montar una sola vez en App.
// SANDBOX VISUAL — no llama a TUU, no persiste medio de pago. El objetivo es
// mostrar como se veria el flujo real de cobro por POS al marcar Completada.
// Solo se abre cuando Agenda.jsx lo invoca (gate: tenantId === 'delnero').
//
// Estados del flujo:
//   'selector'   — 3 botones (POS TUU / Efectivo / Cortesia)
//   'esperando'  — spinner + botones DEV para simular resultado
//   'aprobado'   — check verde, continuar
//   'rechazado'  — cross rojo, reintentar / cambiar medio / cancelar
//   'timeout'    — warning, reintentar / marcar pagado (POS caido) / cambiar / cancelar

export default function TuuSandboxHost() {
  const st = useSyncExternalStore(subscribe, getState, getState);

  const [step, setStep] = useState('selector');
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  // Reset al abrir.
  useEffect(() => {
    if (st) { setStep('selector'); setElapsed(0); }
  }, [st]);

  // Timer del estado "esperando" (solo visual).
  useEffect(() => {
    if (step !== 'esperando') { clearInterval(timerRef.current); return; }
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [step]);

  useEffect(() => {
    if (!st) return;
    const onKey = (e) => { if (e.key === 'Escape') resolveTuu('cancel'); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [st]);

  if (!st) return null;

  const { cliente = 'Cliente', monto = 0, servicio = '' } = st.opts;
  const montoFmt = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(monto) || 0);

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-confirm-fade"
      style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) resolveTuu('cancel'); }}
    >
      <div
        className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-yellow-400/30 shadow-2xl animate-confirm-pop"
        style={{ background: 'linear-gradient(160deg, #0f0d08 0%, #000000 65%)' }}
      >
        {/* Etiqueta sandbox arriba a la derecha */}
        <div className="absolute top-3 right-3 z-10 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-yellow-400/15 text-yellow-300 border border-yellow-400/30">
          Sandbox visual
        </div>

        {/* Header */}
        <div className="relative flex flex-col items-center pt-8 pb-3">
          <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-yellow-400/15 blur-3xl" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-400/10 ring-1 ring-yellow-400/40">
            <Terminal size={30} className="text-yellow-300" />
          </div>
        </div>

        {/* Info cliente + monto (siempre visible) */}
        <div className="px-6 pb-3 text-center">
          <div className="text-[11px] uppercase tracking-widest" style={{ color: '#64748b' }}>
            Cita a completar
          </div>
          <div className="mt-1 text-base font-semibold" style={{ color: '#ffffff' }}>{cliente}</div>
          {servicio && (
            <div className="text-xs" style={{ color: '#94a3b8' }}>{servicio}</div>
          )}
          <div className="mt-2 text-3xl font-black" style={{ color: '#fde68a' }}>{montoFmt}</div>
        </div>

        {/* Contenido variable */}
        {step === 'selector'   && <StepSelector onCobrarPos={() => setStep('esperando')} />}
        {step === 'esperando'  && <StepEsperando elapsed={elapsed} onSim={setStep} onBack={() => setStep('selector')} />}
        {step === 'aprobado'   && <StepAprobado montoFmt={montoFmt} />}
        {step === 'rechazado'  && <StepRechazado onRetry={() => setStep('esperando')} onBack={() => setStep('selector')} />}
        {step === 'timeout'    && <StepTimeout onRetry={() => setStep('esperando')} onBack={() => setStep('selector')} />}

        {/* Marca inferior */}
        <div className="flex items-center justify-center gap-1.5 border-t border-white/5 py-2.5">
          <span className="text-[10px] font-medium uppercase tracking-widest" style={{ color: '#64748b' }}>
            TUU · Cobro presencial
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Selector inicial ─────────────────────────────────────────────────────
function StepSelector({ onCobrarPos }) {
  const btn = "w-full flex items-center gap-3 rounded-xl border py-3 px-4 text-sm font-semibold text-left transition-all active:scale-[0.98]";
  return (
    <div className="px-5 pb-2 space-y-2.5">
      <div className="text-[11px] uppercase tracking-widest text-center pb-1" style={{ color: '#94a3b8' }}>
        ¿Como pago el cliente?
      </div>
      <button
        autoFocus
        onClick={onCobrarPos}
        className={`${btn} border-yellow-400/40 bg-yellow-400/10 hover:bg-yellow-400/15`}
        style={{ color: '#fde68a' }}
      >
        <CreditCard size={18} /> <span>Cobrar en POS TUU</span>
        <span className="ml-auto text-[10px] uppercase tracking-widest opacity-70">Recomendado</span>
      </button>
      <button
        onClick={() => resolveTuu('efectivo')}
        className={`${btn} border-white/10 bg-white/5 hover:bg-white/10`}
        style={{ color: '#e2e8f0' }}
      >
        <Banknote size={18} /> Efectivo
      </button>
      <button
        onClick={() => resolveTuu('cortesia')}
        className={`${btn} border-white/10 bg-white/5 hover:bg-white/10`}
        style={{ color: '#e2e8f0' }}
      >
        <Gift size={18} /> Cortesia / otro medio
      </button>
      <button
        onClick={() => resolveTuu('cancel')}
        className="w-full text-center text-[11px] py-2 hover:underline"
        style={{ color: '#64748b' }}
      >
        Volver a la cita
      </button>
    </div>
  );
}

// ─── Estado "enviado, esperando cobro" ────────────────────────────────────
function StepEsperando({ elapsed, onSim, onBack }) {
  const min = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const sec = String(elapsed % 60).padStart(2, '0');
  return (
    <div className="px-5 pb-3 space-y-4">
      <div className="rounded-xl bg-white/5 border border-white/10 p-4 flex items-center gap-3">
        <Loader2 size={22} className="animate-spin text-yellow-300 shrink-0" />
        <div className="min-w-0">
          <div className="text-sm font-semibold" style={{ color: '#ffffff' }}>Enviado al POS</div>
          <div className="text-xs" style={{ color: '#94a3b8' }}>Pidele al cliente que pase la tarjeta</div>
        </div>
        <div className="ml-auto text-xs font-mono tabular-nums" style={{ color: '#fde68a' }}>{min}:{sec}</div>
      </div>

      {/* Panel DEV — solo sandbox */}
      <div className="rounded-xl border border-dashed border-yellow-400/30 bg-yellow-400/5 p-3">
        <div className="text-[10px] uppercase tracking-widest text-yellow-300 mb-2 text-center">
          Sandbox · Simular respuesta del POS
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => onSim('aprobado')}  className="rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-[11px] font-semibold py-2 flex flex-col items-center gap-0.5">
            <CheckCircle2 size={14} /> Aprobado
          </button>
          <button onClick={() => onSim('rechazado')} className="rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-300 text-[11px] font-semibold py-2 flex flex-col items-center gap-0.5">
            <XCircle size={14} /> Rechazado
          </button>
          <button onClick={() => onSim('timeout')}   className="rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-[11px] font-semibold py-2 flex flex-col items-center gap-0.5">
            <AlertTriangle size={14} /> Timeout
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button onClick={onBack} className="inline-flex items-center gap-1 text-[11px] hover:underline" style={{ color: '#94a3b8' }}>
          <ArrowLeft size={12} /> Cambiar medio
        </button>
        <button onClick={() => resolveTuu('cancel')} className="text-[11px] hover:underline" style={{ color: '#64748b' }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ─── Aprobado ─────────────────────────────────────────────────────────────
function StepAprobado({ montoFmt }) {
  useEffect(() => {
    // Auto-cerrar tras 1.5s para que se sienta fluido — igual que un cobro real.
    const t = setTimeout(() => resolveTuu('tuu'), 1500);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="px-5 pb-4">
      <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/40 p-5 flex flex-col items-center">
        <div className="relative">
          <span className="absolute inset-0 rounded-full bg-emerald-500/30 blur-xl" />
          <CheckCircle2 size={54} className="relative text-emerald-400" />
        </div>
        <div className="mt-3 text-base font-bold" style={{ color: '#ffffff' }}>Cobro aprobado</div>
        <div className="text-xs" style={{ color: '#a7f3d0' }}>{montoFmt} · TUU</div>
      </div>
      <button onClick={() => resolveTuu('tuu')} className="w-full mt-4 rounded-xl bg-emerald-500 text-black text-sm font-bold py-2.5 hover:bg-emerald-400 active:scale-95">
        Continuar
      </button>
    </div>
  );
}

// ─── Rechazado ────────────────────────────────────────────────────────────
function StepRechazado({ onRetry, onBack }) {
  return (
    <div className="px-5 pb-4 space-y-3">
      <div className="rounded-xl bg-red-500/10 border border-red-500/40 p-5 flex flex-col items-center">
        <XCircle size={44} className="text-red-400" />
        <div className="mt-2 text-base font-bold" style={{ color: '#ffffff' }}>Cobro rechazado</div>
        <div className="text-xs text-center mt-1" style={{ color: '#fecaca' }}>
          El POS rechazo la tarjeta. Puede ser fondos insuficientes, tarjeta bloqueada o cancelado por el cliente.
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={onBack}   className="rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-sm font-semibold py-2.5" style={{ color: '#e2e8f0' }}>Cambiar medio</button>
        <button onClick={onRetry}  className="rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black text-sm font-bold py-2.5 active:scale-95">Reintentar</button>
      </div>
      <button onClick={() => resolveTuu('cancel')} className="w-full text-center text-[11px] hover:underline" style={{ color: '#64748b' }}>
        Cancelar completar cita
      </button>
    </div>
  );
}

// ─── Timeout ──────────────────────────────────────────────────────────────
function StepTimeout({ onRetry, onBack }) {
  return (
    <div className="px-5 pb-4 space-y-3">
      <div className="rounded-xl bg-amber-500/10 border border-amber-500/40 p-5 flex flex-col items-center">
        <AlertTriangle size={44} className="text-amber-400" />
        <div className="mt-2 text-base font-bold" style={{ color: '#ffffff' }}>El POS no respondio</div>
        <div className="text-xs text-center mt-1" style={{ color: '#fde68a' }}>
          Puede estar apagado, sin internet o con Modo Integracion desactivado.
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={onBack}  className="rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-sm font-semibold py-2.5" style={{ color: '#e2e8f0' }}>Cambiar medio</button>
        <button onClick={onRetry} className="rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black text-sm font-bold py-2.5 active:scale-95">Reintentar</button>
      </div>
      <button onClick={() => resolveTuu('tuu_manual')} className="w-full rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-semibold py-2.5">
        Marcar pagado igual (POS caido)
      </button>
      <button onClick={() => resolveTuu('cancel')} className="w-full text-center text-[11px] hover:underline" style={{ color: '#64748b' }}>
        Cancelar completar cita
      </button>
    </div>
  );
}
