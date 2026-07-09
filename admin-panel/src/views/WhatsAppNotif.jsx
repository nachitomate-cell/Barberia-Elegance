import { useState, useEffect, useCallback } from 'react';
import { getApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  MessageCircle, BellRing, CheckCircle2, RefreshCw, Sparkles,
  ShieldCheck, Zap, Clock, ExternalLink, PauseCircle,
} from 'lucide-react';
import { resolveTenantId } from '../lib/tenantUtils';
import { useTenant } from '../contexts/TenantContext';

// Vista "Avisos WhatsApp" — confirmaciones de cita vía WhatsApp oficial.
//
// Nivel GRATIS (incluido): cada reserva nueva llega como WhatsApp al dueño.
// Funciona con la ventana de servicio de Meta (mensajes de sesión, costo $0);
// el dueño la mantiene viva respondiendo "1" a cada aviso. Si la ventana se
// cierra, el aviso llega igual por push de la app (fallback ya existente).
//
// Nivel PAGADO: confirmación automática al CLIENTE por WhatsApp (plantilla
// oficial). Lo activa SynapTech por local — CTA de contacto al final.

const WA_SYNAPTECH = '56983568212';

const card = 'bg-slate-800/30 border border-slate-700/50 rounded-2xl';

function WaLogo({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path fill="#25D366" d="M20.52 3.45C18.24 1.17 15.24 0 12.06 0 5.55 0 .21 5.28.21 11.79c0 2.07.54 4.11 1.62 5.91L.06 24l6.42-1.68c1.71.93 3.66 1.44 5.58 1.44 6.51 0 11.85-5.28 11.85-11.79 0-3.15-1.23-6.15-3.39-8.52z"/>
      <path fill="#fff" d="M17.51 14.31c-.33-.15-1.95-.96-2.25-1.08-.3-.12-.51-.15-.72.15-.21.33-.84 1.08-1.05 1.29-.18.21-.39.24-.72.09-.33-.18-1.41-.51-2.67-1.65-.99-.87-1.65-1.98-1.86-2.31-.18-.33-.03-.51.15-.66.15-.15.33-.39.48-.6.15-.18.21-.33.33-.54.09-.21.06-.42-.03-.6-.09-.18-.72-1.74-.99-2.37-.24-.6-.51-.51-.72-.51-.18 0-.39-.03-.6-.03s-.57.09-.87.42c-.3.33-1.14 1.11-1.14 2.7 0 1.59 1.17 3.15 1.35 3.36.18.21 2.31 3.51 5.61 4.92.78.33 1.41.54 1.89.69.78.24 1.5.21 2.07.12.63-.09 1.95-.81 2.22-1.56.27-.75.27-1.41.21-1.56-.09-.15-.3-.24-.63-.39z"/>
    </svg>
  );
}

export default function WhatsAppNotif() {
  const tenant   = useTenant();
  const tenantId = resolveTenantId();

  const [estado,   setEstado]   = useState(null);   // respuesta de waNotifEstado
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fn  = httpsCallable(getFunctions(getApp(), 'us-central1'), 'waNotifEstado');
      const res = await fn({});
      setEstado(res.data || null);
    } catch (e) {
      setError(e.message || 'No se pudo cargar el estado.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const numero      = estado?.numeroPlataforma || null;
  const disponible  = !!estado?.disponible;
  const activado    = !!estado?.activado;
  const pausado     = estado?.estado === 'pausado';
  const ventanaOk   = !!estado?.ventanaAbierta;
  const planCliente = !!estado?.planCliente;

  const activarUrl = numero
    ? `https://wa.me/${numero}?text=${encodeURIComponent(`ACTIVAR ${tenantId}`)}`
    : null;
  const upgradeMsg = `Hola SynapTech, soy de *${tenant?.name || tenantId}* y quiero activar las confirmaciones automáticas por WhatsApp para mis clientes (plan pagado). ¿Me cuentas cómo funciona?`;

  return (
    <div className="max-w-3xl">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 mb-1">
        <WaLogo size={30} />
        <h1 className="text-xl font-bold text-white">Avisos WhatsApp</h1>
      </div>
      <p className="text-sm text-slate-400 mb-6">
        Recibe cada reserva nueva directo en tu WhatsApp — y si quieres, confirma
        también a tus clientes de forma automática.
      </p>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className={`${card} p-5 text-sm text-red-400 flex items-center justify-between gap-3`}>
          <span>{error}</span>
          <button onClick={cargar} className="shrink-0 text-slate-300 hover:text-white p-2 rounded-lg hover:bg-slate-700 transition-colors" aria-label="Reintentar">
            <RefreshCw size={15} />
          </button>
        </div>
      ) : (
        <div className="space-y-5">

          {/* ══ NIVEL GRATIS — avisos al dueño ══ */}
          <div className={`${card} p-6 relative overflow-hidden`}>
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(70% 50% at 100% 0%, rgba(37,211,102,0.06), transparent 70%)' }} />
            <div className="relative">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <BellRing size={16} className="text-emerald-400" />
                    <h2 className="text-base font-bold text-white">Aviso de reservas al local</h2>
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 rounded-full text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider">Gratis</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed max-w-md">
                    Cada vez que un cliente reserve, te llega un WhatsApp al instante con
                    el detalle de la cita. Respondes <span className="text-white font-semibold">1</span> y
                    queda confirmada como vista.
                  </p>
                </div>
                <button onClick={cargar} className="shrink-0 text-slate-500 hover:text-white p-2 rounded-lg hover:bg-slate-700/60 transition-colors" title="Actualizar estado">
                  <RefreshCw size={15} />
                </button>
              </div>

              {!disponible ? (
                <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-4 text-sm text-slate-400 flex items-center gap-3">
                  <Clock size={16} className="text-amber-400 shrink-0" />
                  El módulo se está habilitando — muy pronto podrás activarlo desde aquí.
                </div>
              ) : !activado ? (
                <div className="space-y-3">
                  <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-4">
                    <p className="text-xs text-slate-400 leading-relaxed">
                      <span className="text-white font-semibold">Actívalo en 10 segundos:</span> toca
                      el botón, se abrirá WhatsApp con el mensaje listo — solo envíalo desde el
                      número donde quieres recibir los avisos.
                    </p>
                  </div>
                  <a
                    href={activarUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2.5 bg-[#25D366] hover:bg-[#1fbd5a] text-[#06281a] text-sm font-extrabold px-5 py-3 rounded-xl transition-colors shadow-lg shadow-emerald-900/40"
                  >
                    <WaLogo size={18} /> Activar por WhatsApp <ExternalLink size={14} />
                  </a>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-3.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Estado</p>
                      {pausado ? (
                        <p className="text-sm font-bold text-amber-400 flex items-center gap-1.5"><PauseCircle size={14} /> Pausado</p>
                      ) : (
                        <p className="text-sm font-bold text-emerald-400 flex items-center gap-1.5"><CheckCircle2 size={14} /> Activo</p>
                      )}
                    </div>
                    <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-3.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Número vinculado</p>
                      <p className="text-sm font-bold text-white">{estado?.telefono || '—'}</p>
                    </div>
                    <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-3.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Canal WhatsApp</p>
                      {ventanaOk ? (
                        <p className="text-sm font-bold text-emerald-400 flex items-center gap-1.5"><Zap size={13} /> Conectado</p>
                      ) : (
                        <p className="text-sm font-bold text-amber-400">En espera</p>
                      )}
                    </div>
                  </div>
                  {!ventanaOk && !pausado && (
                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3.5 text-xs text-amber-200/80 leading-relaxed">
                      Pasaste más de un día sin responder en WhatsApp, así que los próximos avisos
                      llegarán por la app. Para volver a recibirlos por WhatsApp, simplemente
                      {' '}<a href={numero ? `https://wa.me/${numero}?text=${encodeURIComponent('Hola')}` : '#'} target="_blank" rel="noopener noreferrer" className="text-amber-300 font-bold underline">envía cualquier mensaje</a>{' '}
                      al número de avisos.
                    </div>
                  )}
                  {pausado && (
                    <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-3.5 text-xs text-slate-400">
                      Pausaste los avisos. Escribe <span className="text-white font-bold">REANUDAR</span> al
                      número de avisos para retomarlos.
                    </div>
                  )}
                </div>
              )}

              {/* Cómo se mantiene gratis */}
              <div className="mt-4 flex items-start gap-2.5 text-[11px] text-slate-500 leading-relaxed">
                <ShieldCheck size={14} className="text-emerald-500/70 shrink-0 mt-0.5" />
                <span>
                  Servicio incluido sin costo: usa el canal oficial de WhatsApp. Responder
                  {' '}<span className="text-slate-300 font-semibold">1</span> a los avisos mantiene el canal
                  conectado; si no respondes por más de 24 h, los avisos siguen llegando por la app
                  del panel sin que pierdas ninguno.
                </span>
              </div>
            </div>
          </div>

          {/* ══ NIVEL PAGADO — confirmación al cliente ══ */}
          <div className={`${card} p-6 relative overflow-hidden`}>
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(70% 50% at 0% 0%, rgba(139,124,246,0.07), transparent 70%)' }} />
            <div className="relative">
              <div className="flex items-center gap-2 mb-1.5">
                <Sparkles size={16} className="text-violet-400" />
                <h2 className="text-base font-bold text-white">Confirmación automática a tus clientes</h2>
                {planCliente ? (
                  <span className="bg-violet-500/10 text-violet-300 border border-violet-500/30 rounded-full text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider">Activo</span>
                ) : (
                  <span className="bg-slate-700/60 text-slate-300 border border-slate-600 rounded-full text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider">Plan pagado</span>
                )}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-lg mb-4">
                Al reservar, tu <span className="text-white font-semibold">cliente</span> recibe un WhatsApp
                oficial a nombre de tu local con el detalle de su cita — menos inasistencias, imagen más
                profesional. Usa plantillas verificadas por WhatsApp (mensajería con costo, por eso es parte
                del plan pagado).
              </p>
              {planCliente ? (
                <div className="bg-slate-900/60 border border-violet-500/25 rounded-xl p-4 text-sm text-slate-300 flex items-center gap-3">
                  <CheckCircle2 size={16} className="text-violet-400 shrink-0" />
                  Activo — tus clientes reciben la confirmación automáticamente al reservar.
                </div>
              ) : (
                <a
                  href={`https://wa.me/${WA_SYNAPTECH}?text=${encodeURIComponent(upgradeMsg)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold px-5 py-3 rounded-xl transition-colors shadow-lg shadow-violet-900/40"
                >
                  <MessageCircle size={16} /> Quiero activarlo — hablar con SynapTech
                </a>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
