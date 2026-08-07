import { useSyncExternalStore, useEffect, useState, useRef, useCallback } from 'react';
import { subscribe, getState, resolveTuuCobro } from '../../lib/tuuCobro';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';
import {
  Terminal, CheckCircle2, XCircle, Loader2, AlertTriangle, RefreshCw,
} from 'lucide-react';

// Modal REAL de cobro TUU. Un solo Host montado en App.jsx.
// Flujo:
//   1) Al abrir: llama CF tuuCobrarCita → obtiene idempotencyKey.
//   2) Polling cada 2s a tuuConsultarCobro hasta 180s.
//   3) Estados intermedios de TUU: Pending / Sent / Processing (siguen esperando).
//   4) Termina en: Completed → 'approved' | Failed → 'rejected' | Canceled → 'canceled'.
//   5) 180s sin cierre → 'timeout' con opciones.

const POLL_INTERVAL_MS = 2000;
const TIMEOUT_MS = 180000; // 3 minutos

const REGION = 'us-central1';

export default function TuuCobroHost() {
  const st = useSyncExternalStore(subscribe, getState, getState);

  // 'iniciando' | 'esperando' | 'aprobado' | 'rechazado' | 'timeout' | 'error'
  const [step, setStep] = useState('iniciando');
  const [elapsed, setElapsed] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [detalle, setDetalle] = useState('');
  const tickRef = useRef(null);
  const pollRef = useRef(null);
  const idempotencyKeyRef = useRef(null);

  const cleanupTimers = useCallback(() => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  // Cerrar con un resultado + limpiar timers.
  const finish = useCallback((value) => {
    cleanupTimers();
    resolveTuuCobro(value);
  }, [cleanupTimers]);

  // Manejar Escape para cancelar (mientras no está en Aprobado).
  useEffect(() => {
    if (!st) return;
    const onKey = (e) => {
      if (e.key === 'Escape' && step !== 'aprobado') finish('canceled');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [st, step, finish]);

  // Arrancar el flujo cada vez que se abre el modal.
  const iniciarCobro = useCallback(async () => {
    if (!st) return;
    const { tenantId, citaId, monto } = st.opts;
    setStep('iniciando');
    setElapsed(0);
    setErrorMsg('');
    setDetalle('');
    idempotencyKeyRef.current = null;

    try {
      const fn = httpsCallable(getFunctions(getApp(), REGION), 'tuuCobrarCita');
      // monto = total del formulario (descuento aún sin guardar); la CF lo
      // usa en vez del precio viejo persistido en la cita.
      const res = await fn({ tenantId, citaId, monto: Number(monto) || 0 });
      const data = res?.data || {};
      idempotencyKeyRef.current = data.idempotencyKey || null;

      // Si TUU rechazó el Create con "Completed" (raro pero posible en reintento
      // instantáneo), corta directo.
      if (data.status === 'Completed') { setStep('aprobado'); return; }
      if (data.status === 'Failed')    { setStep('rechazado'); return; }
      if (data.status === 'Canceled')  { setStep('rechazado'); return; }

      setStep('esperando');
    } catch (err) {
      setErrorMsg(err?.message || 'No se pudo iniciar el cobro en el POS.');
      setStep('error');
    }
  }, [st]);

  // Reset + kickoff al abrir.
  useEffect(() => {
    if (st) iniciarCobro();
    else cleanupTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st]);

  // Timer visible + timeout global (solo activo mientras esperamos al POS).
  useEffect(() => {
    if (step !== 'esperando') return;

    setElapsed(0);
    tickRef.current = setInterval(() => {
      setElapsed((e) => {
        const next = e + 1;
        if (next * 1000 >= TIMEOUT_MS) {
          setStep('timeout');
        }
        return next;
      });
    }, 1000);

    return () => { if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; } };
  }, [step]);

  // Polling a tuuConsultarCobro.
  useEffect(() => {
    if (step !== 'esperando') return;
    const { tenantId, citaId } = st.opts;
    const fn = httpsCallable(getFunctions(getApp(), REGION), 'tuuConsultarCobro');
    let inFlight = false;

    const tick = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const res = await fn({ tenantId, citaId });
        const status = res?.data?.status;
        if (status === 'Completed') { setStep('aprobado'); return; }
        if (status === 'Failed')    { setDetalle(pickRejectMsg(res?.data?.raw)); setStep('rechazado'); return; }
        if (status === 'Canceled')  { setStep('rechazado'); setDetalle('El cliente canceló en el POS.'); return; }
        // Pending / Sent / Processing / Unknown → seguir esperando.
      } catch (_err) {
        // Errores de red no matan el polling: seguimos hasta el timeout.
      } finally {
        inFlight = false;
      }
    };

    // Primer chequeo inmediato + intervalo.
    tick();
    pollRef.current = setInterval(tick, POLL_INTERVAL_MS);
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Auto-cerrar 1.5s tras aprobado.
  useEffect(() => {
    if (step !== 'aprobado') return;
    const t = setTimeout(() => finish('approved'), 1500);
    return () => clearTimeout(t);
  }, [step, finish]);

  if (!st) return null;

  const { cliente = 'Cliente', monto = 0, servicio = '', showManualFallback = false } = st.opts;
  const montoFmt = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(monto) || 0);

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-confirm-fade"
      style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && step !== 'aprobado' && step !== 'iniciando') finish('canceled');
      }}
    >
      <div
        className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-yellow-400/30 shadow-2xl animate-confirm-pop"
        style={{ background: 'linear-gradient(160deg, #0f0d08 0%, #000000 65%)' }}
      >
        {/* Header */}
        <div className="relative flex flex-col items-center pt-8 pb-3">
          <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-yellow-400/15 blur-3xl" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-400/10 ring-1 ring-yellow-400/40">
            <Terminal size={30} className="text-yellow-300" />
          </div>
        </div>

        {/* Info cliente + monto */}
        <div className="px-6 pb-3 text-center">
          <div className="text-[11px] uppercase tracking-widest" style={{ color: '#64748b' }}>
            Cobro en POS TUU
          </div>
          <div className="mt-1 text-base font-semibold" style={{ color: '#ffffff' }}>{cliente}</div>
          {servicio && (
            <div className="text-xs" style={{ color: '#94a3b8' }}>{servicio}</div>
          )}
          <div className="mt-2 text-3xl font-black" style={{ color: '#fde68a' }}>{montoFmt}</div>
        </div>

        {step === 'iniciando'  && <StepIniciando />}
        {step === 'esperando'  && <StepEsperando elapsed={elapsed} onCancel={() => finish('canceled')} />}
        {step === 'aprobado'   && <StepAprobado montoFmt={montoFmt} />}
        {step === 'rechazado'  && <StepRechazado detalle={detalle} onRetry={iniciarCobro} onCancel={() => finish('canceled')} />}
        {step === 'timeout'    && <StepTimeout onRetry={iniciarCobro} onCancel={() => finish('canceled')} onManual={showManualFallback ? () => finish('manual_fallback') : null} />}
        {step === 'error'      && <StepError message={errorMsg} onRetry={iniciarCobro} onCancel={() => finish('canceled')} />}

        <div className="flex items-center justify-center gap-1.5 border-t border-white/5 py-2.5">
          <span className="text-[10px] font-medium uppercase tracking-widest" style={{ color: '#64748b' }}>
            TUU · Cobro presencial
          </span>
        </div>
      </div>
    </div>
  );
}

function pickRejectMsg(raw) {
  if (!raw || typeof raw !== 'object') return 'El POS rechazó la tarjeta.';
  const msg = raw.message || raw.error || raw.rejectReason
    || raw?.data?.message || raw?.data?.error;
  return msg ? String(msg) : 'El POS rechazó la tarjeta.';
}

// ─── Iniciando (llamada al POST Create de TUU) ────────────────────────────
function StepIniciando() {
  return (
    <div className="px-5 pb-4">
      <div className="rounded-xl bg-white/5 border border-white/10 p-4 flex items-center gap-3">
        <Loader2 size={22} className="animate-spin text-yellow-300 shrink-0" />
        <div className="min-w-0">
          <div className="text-sm font-semibold" style={{ color: '#ffffff' }}>Enviando al POS…</div>
          <div className="text-xs" style={{ color: '#94a3b8' }}>Preparando el cobro</div>
        </div>
      </div>
    </div>
  );
}

// ─── Esperando (polling) ──────────────────────────────────────────────────
function StepEsperando({ elapsed, onCancel }) {
  const min = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const sec = String(elapsed % 60).padStart(2, '0');
  return (
    <div className="px-5 pb-3 space-y-3">
      <div className="rounded-xl bg-white/5 border border-white/10 p-4 flex items-center gap-3">
        <Loader2 size={22} className="animate-spin text-yellow-300 shrink-0" />
        <div className="min-w-0">
          <div className="text-sm font-semibold" style={{ color: '#ffffff' }}>Esperando al POS</div>
          <div className="text-xs" style={{ color: '#94a3b8' }}>Pídele al cliente que pase la tarjeta</div>
        </div>
        <div className="ml-auto text-xs font-mono tabular-nums" style={{ color: '#fde68a' }}>{min}:{sec}</div>
      </div>
      <div className="flex items-center justify-end">
        <button onClick={onCancel} className="text-[11px] hover:underline" style={{ color: '#94a3b8' }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ─── Aprobado ─────────────────────────────────────────────────────────────
function StepAprobado({ montoFmt }) {
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
    </div>
  );
}

// ─── Rechazado ────────────────────────────────────────────────────────────
function StepRechazado({ detalle, onRetry, onCancel }) {
  return (
    <div className="px-5 pb-4 space-y-3">
      <div className="rounded-xl bg-red-500/10 border border-red-500/40 p-5 flex flex-col items-center">
        <XCircle size={44} className="text-red-400" />
        <div className="mt-2 text-base font-bold" style={{ color: '#ffffff' }}>Cobro rechazado</div>
        <div className="text-xs text-center mt-1" style={{ color: '#fecaca' }}>
          {detalle || 'Fondos insuficientes, tarjeta bloqueada o cancelado por el cliente.'}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={onCancel} className="rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-sm font-semibold py-2.5" style={{ color: '#e2e8f0' }}>Cancelar</button>
        <button onClick={onRetry}  className="rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black text-sm font-bold py-2.5 active:scale-95 inline-flex items-center justify-center gap-1.5">
          <RefreshCw size={14} /> Reintentar
        </button>
      </div>
    </div>
  );
}

// ─── Timeout ──────────────────────────────────────────────────────────────
function StepTimeout({ onRetry, onCancel, onManual }) {
  return (
    <div className="px-5 pb-4 space-y-3">
      <div className="rounded-xl bg-amber-500/10 border border-amber-500/40 p-5 flex flex-col items-center">
        <AlertTriangle size={44} className="text-amber-400" />
        <div className="mt-2 text-base font-bold" style={{ color: '#ffffff' }}>El POS no confirmó</div>
        <div className="text-xs text-center mt-1" style={{ color: '#fde68a' }}>
          Revisa físicamente si la tarjeta pasó. Puede estar apagado, sin internet o con Modo Integración desactivado.
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={onCancel} className="rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-sm font-semibold py-2.5" style={{ color: '#e2e8f0' }}>Cancelar</button>
        <button onClick={onRetry}  className="rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black text-sm font-bold py-2.5 active:scale-95 inline-flex items-center justify-center gap-1.5">
          <RefreshCw size={14} /> Reintentar
        </button>
      </div>
      {onManual && (
        <button onClick={onManual} className="w-full rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-semibold py-2.5">
          Marcar pagado igual (fallback manual)
        </button>
      )}
    </div>
  );
}

// ─── Error del backend (CF) ───────────────────────────────────────────────
function StepError({ message, onRetry, onCancel }) {
  return (
    <div className="px-5 pb-4 space-y-3">
      <div className="rounded-xl bg-red-500/10 border border-red-500/40 p-5 flex flex-col items-center">
        <XCircle size={44} className="text-red-400" />
        <div className="mt-2 text-base font-bold" style={{ color: '#ffffff' }}>No se pudo iniciar el cobro</div>
        <div className="text-xs text-center mt-1 break-words" style={{ color: '#fecaca' }}>
          {message || 'Error desconocido.'}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={onCancel} className="rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-sm font-semibold py-2.5" style={{ color: '#e2e8f0' }}>Cancelar</button>
        <button onClick={onRetry}  className="rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black text-sm font-bold py-2.5 active:scale-95 inline-flex items-center justify-center gap-1.5">
          <RefreshCw size={14} /> Reintentar
        </button>
      </div>
    </div>
  );
}
