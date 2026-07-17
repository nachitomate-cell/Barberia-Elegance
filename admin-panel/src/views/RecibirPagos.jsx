import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';
import { CircleDollarSign, Wallet, CreditCard, Sparkles, CheckCircle2, Link2Off, Loader2, AlertCircle } from 'lucide-react';
import { db } from '../lib/firebase';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';
import { confirmDialog } from '../lib/confirmDialog';

const PASARELAS = [
  { id: 'flow', nombre: 'Flow', descripcion: 'Procesador chileno. Soporta Webpay, tarjetas y transferencias.', Icon: Wallet, soon: true },
  { id: 'mercadopago', nombre: 'Mercado Pago', descripcion: 'Cobros con QR, tarjetas y cuotas. La plata llega directo a tu cuenta de MP.', Icon: CreditCard, soon: false },
  { id: 'stripe', nombre: 'Stripe', descripcion: 'Cobros internacionales en USD/EUR. Pensado para Gift Cards.', Icon: Sparkles, soon: true },
];

export default function RecibirPagos() {
  const { id: tenantId } = useTenant();
  const { role } = useAuth();
  const isAdmin = role === 'admin' || role === 'jefe';

  const [mpConnected, setMpConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [msg, setMsg] = useState(null);

  // Estado de la conexión MP (no sensible) en _system/mercadopago_{tid}.
  useEffect(() => {
    if (!tenantId) return;
    const unsub = onSnapshot(
      doc(db, '_system', `mercadopago_${tenantId}`),
      (snap) => { setMpConnected(snap.exists() && snap.data().connected === true); setLoading(false); },
      () => setLoading(false),
    );
    return () => unsub();
  }, [tenantId]);

  // Feedback al volver del OAuth (?mp=connected|error).
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('mp');
    if (p === 'connected') setMsg({ ok: true, text: 'Mercado Pago conectado correctamente.' });
    else if (p === 'error') setMsg({ ok: false, text: 'No se pudo conectar Mercado Pago. Intenta de nuevo.' });
    if (p) { try { window.history.replaceState({}, '', window.location.pathname); } catch { /* noop */ } }
  }, []);

  async function connectMp() {
    setConnecting(true);
    setMsg(null);
    try {
      const fn = httpsCallable(getFunctions(getApp(), 'us-central1'), 'mpTenantConnect');
      const res = await fn({ tenantId });
      window.location.href = res.data.url;
    } catch (err) {
      setConnecting(false);
      setMsg({ ok: false, text: err.message || 'No se pudo iniciar la conexión.' });
    }
  }

  async function disconnectMp() {
    if (!(await confirmDialog({ title: 'Desconectar Mercado Pago', message: 'Dejarás de recibir cobros en tu cuenta de MP. Puedes reconectar cuando quieras.', confirmText: 'Desconectar' }))) return;
    try {
      const fn = httpsCallable(getFunctions(getApp(), 'us-central1'), 'mpTenantDisconnect');
      await fn({ tenantId });
      setMsg({ ok: true, text: 'Mercado Pago desconectado.' });
    } catch (err) {
      setMsg({ ok: false, text: err.message || 'No se pudo desconectar.' });
    }
  }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-5xl mx-auto">
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-yellow-400/15 [html.light_&]:bg-yellow-100 flex items-center justify-center shrink-0">
          <CircleDollarSign size={22} className="text-yellow-400 [html.light_&]:text-yellow-700" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-primary [html.light_&]:text-ink-900">Recibir Pagos</h1>
          <p className="text-sm text-slate-400 [html.light_&]:text-ink-600 mt-1">
            Conecta tus pasarelas para cobrar servicios y productos online (reservas, Gift Cards, propinas).
          </p>
        </div>
      </div>

      {msg && (
        <div className={`mb-5 flex items-center gap-2 p-3 rounded-xl text-sm ${
          msg.ok ? 'bg-emerald-950/30 border border-emerald-800/30 text-emerald-300'
                 : 'bg-red-950/30 border border-red-800/30 text-red-300'
        }`}>
          {msg.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
          {msg.text}
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {PASARELAS.map(({ id, nombre, descripcion, Icon, soon }) => {
          const isMp = id === 'mercadopago';
          const connected = isMp && mpConnected;
          return (
            <div
              key={id}
              className={`rounded-2xl border bg-slate-900/40 [html.light_&]:bg-white p-5 transition-colors duration-200 ${
                connected ? 'border-emerald-500/40' : 'border-slate-800 [html.light_&]:border-ink-200 hover:border-yellow-400/40'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <Icon size={20} className="text-yellow-400 [html.light_&]:text-yellow-700" />
                <h3 className="font-semibold text-primary [html.light_&]:text-ink-900">{nombre}</h3>
              </div>
              <p className="text-xs text-slate-400 [html.light_&]:text-ink-600 leading-relaxed mb-4">{descripcion}</p>

              <div className="flex items-center justify-between gap-2">
                <span className={`text-[11px] uppercase tracking-wider flex items-center gap-1 ${
                  connected ? 'text-emerald-400' : 'text-slate-500'
                }`}>
                  {connected ? <><CheckCircle2 size={12} /> Conectado</> : 'No configurado'}
                </span>

                {/* Flow / Stripe: aún no disponibles */}
                {soon && (
                  <button disabled className="text-xs font-medium px-3 py-1.5 rounded-lg bg-yellow-400/10 text-yellow-400 [html.light_&]:bg-yellow-100 [html.light_&]:text-yellow-700 opacity-60 cursor-not-allowed">
                    Próximamente
                  </button>
                )}

                {/* Mercado Pago: conexión real */}
                {isMp && !loading && (
                  connected ? (
                    isAdmin && (
                      <button
                        onClick={disconnectMp}
                        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
                      >
                        <Link2Off size={13} /> Desconectar
                      </button>
                    )
                  ) : (
                    isAdmin ? (
                      <button
                        onClick={connectMp}
                        disabled={connecting}
                        className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg text-primary transition-transform active:scale-95 disabled:opacity-60"
                        style={{ background: '#009ee3' }}
                      >
                        {connecting ? <><Loader2 size={13} className="animate-spin" /> …</> : 'Conectar'}
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-500">Solo admin</span>
                    )
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-slate-500 [html.light_&]:text-ink-500 text-center mt-8">
        Mercado Pago ya disponible. Flow y Stripe se habilitarán próximamente.
      </p>
    </div>
  );
}
