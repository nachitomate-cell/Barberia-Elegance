import { useState, useEffect, useCallback } from 'react';
import { getApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  MessageCircle, BellRing, CheckCircle2, RefreshCw, Sparkles,
  ShieldCheck, Zap, Clock, ExternalLink, PauseCircle,
} from 'lucide-react';
import { resolveTenantId } from '../lib/tenantUtils';
import { useTenant } from '../contexts/TenantContext';
import { WaChatPreview, LivePreviewHeader } from '../components/WaChatPreview';
import { Section, SettingsGroup, SettingRow } from '../components/ui/SettingsPrimitives';

// Guion del chat de la vista previa de confirmación automática al cliente.
const CONFIRM_MSGS = [
  { side: 'in',  text: 'Hola Juan 👋 Te recordamos tu cita de mañana 15:00 — Corte + Barba con Vicente. ¿La confirmas? Responde CONFIRMAR o CANCELAR.' },
  { side: 'out', text: 'CONFIRMAR ✅' },
  { side: 'in',  text: '¡Gracias! Tu cita quedó confirmada. Te esperamos 🙌' },
];
const CONFIRM_TIMELINE = [
  { count: 1, typing: false, dur: 3400 },
  { count: 2, typing: false, dur: 1700 },
  { count: 2, typing: true,  dur: 1000 },
  { count: 3, typing: false, dur: 3200 },
];

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

function WaIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path fill="#25D366" d="M20.52 3.45C18.24 1.17 15.24 0 12.06 0 5.55 0 .21 5.28.21 11.79c0 2.07.54 4.11 1.62 5.91L.06 24l6.42-1.68c1.71.93 3.66 1.44 5.58 1.44 6.51 0 11.85-5.28 11.85-11.79 0-3.15-1.23-6.15-3.39-8.52z"/>
      <path fill="#fff" d="M17.51 14.31c-.33-.15-1.95-.96-2.25-1.08-.3-.12-.51-.15-.72.15-.21.33-.84 1.08-1.05 1.29-.18.21-.39.24-.72.09-.33-.18-1.41-.51-2.67-1.65-.99-.87-1.65-1.98-1.86-2.31-.18-.33-.03-.51.15-.66.15-.15.33-.39.48-.6.15-.18.21-.33.33-.54.09-.21.06-.42-.03-.6-.09-.18-.72-1.74-.99-2.37-.24-.6-.51-.51-.72-.51-.18 0-.39-.03-.6-.03s-.57.09-.87.42c-.3.33-1.14 1.11-1.14 2.7 0 1.59 1.17 3.15 1.35 3.36.18.21 2.31 3.51 5.61 4.92.78.33 1.41.54 1.89.69.78.24 1.5.21 2.07.12.63-.09 1.95-.81 2.22-1.56.27-.75.27-1.41.21-1.56-.09-.15-.3-.24-.63-.39z"/>
    </svg>
  );
}

// Badge pequeño estilo iOS ("Gratis", "Plan pagado", "Activo").
function Badge({ tone = 'slate', children }) {
  const tones = {
    slate:   'bg-white/[0.04] text-slate-300 border-white/10',
    emerald: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
    violet:  'bg-violet-500/10 text-violet-300 border-violet-500/25',
    amber:   'bg-amber-500/10 text-amber-300 border-amber-500/25',
  };
  return (
    <span className={`inline-flex items-center gap-1 border rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.07em] ${tones[tone]}`}>
      {children}
    </span>
  );
}

// `embedded`: sin ancho máximo — la vista unificada WhatsApp.jsx la renderiza
// como sub-página. Cuando se accede directo a /whatsapp-notif se renderiza sin
// header propio también (embedded=false), pero con el mismo layout de Section.
export default function WhatsAppNotif({ embedded = false }) {
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

  const nombreLocal = tenant?.name || tenantId || 'Tu Local';
  const avatar      = (nombreLocal.trim()[0] || 'B').toUpperCase();

  const activarUrl = numero
    ? `https://wa.me/${numero}?text=${encodeURIComponent(`ACTIVAR ${tenantId}`)}`
    : null;
  const upgradeMsg = `Hola SynapTech, soy de *${tenant?.name || tenantId}* y quiero activar las confirmaciones automáticas por WhatsApp para mis clientes (plan pagado). ¿Me cuentas cómo funciona?`;

  if (loading) {
    return (
      <div className={embedded ? '' : 'max-w-3xl'}>
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={embedded ? '' : 'max-w-3xl'}>
        <SettingsGroup>
          <div className="px-4 sm:px-5 py-4 text-sm text-red-400 flex items-center justify-between gap-3">
            <span>{error}</span>
            <button onClick={cargar} className="shrink-0 text-slate-300 hover:text-primary p-2 rounded-lg hover:bg-white/5 transition-colors" aria-label="Reintentar">
              <RefreshCw size={15} />
            </button>
          </div>
        </SettingsGroup>
      </div>
    );
  }

  return (
    <div className={`space-y-8 ${embedded ? '' : 'max-w-3xl'}`}>

      {/* ══════════ NIVEL GRATIS — avisos al dueño ══════════ */}
      <Section
        Icon={BellRing}
        title={<span className="flex items-center gap-2">Aviso de reservas al local <Badge tone="emerald">Gratis</Badge></span>}
        description="Cada vez que un cliente reserve, te llega un WhatsApp al instante con el detalle de la cita. Respondes “1” y queda confirmada como vista."
      >

        {/* Sub-módulo de activación — depende del estado del backend */}
        {!disponible && (
          <SettingsGroup>
            <div className="px-4 sm:px-5 py-4 flex items-center gap-3 text-sm text-slate-400">
              <Clock size={16} className="text-amber-400 shrink-0" />
              El módulo se está habilitando — muy pronto podrás activarlo desde aquí.
            </div>
          </SettingsGroup>
        )}

        {disponible && !activado && (
          <SettingsGroup footer="Toca el botón, se abre WhatsApp con el mensaje listo — solo envíalo desde el número donde quieres recibir los avisos.">
            <div className="px-4 sm:px-5 py-5">
              <p className="text-sm text-slate-300 leading-relaxed mb-4">
                <span className="text-primary font-semibold">Activalo en 10 segundos.</span> Se vincula tu número con el de la plataforma y a partir de ahí cada nueva reserva llega directo a tu WhatsApp.
              </p>
              <a
                href={activarUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1fbd5a] text-[#06281a] text-sm font-bold px-5 py-3 rounded-full transition-all active:scale-[0.98] shadow-[0_6px_20px_-8px_rgba(37,211,102,0.6)]"
              >
                <WaIcon size={17} /> Activar por WhatsApp <ExternalLink size={13} />
              </a>
            </div>
          </SettingsGroup>
        )}

        {disponible && activado && (
          <>
            <SettingsGroup label="Estado del canal" divide>
              <SettingRow
                Icon={pausado ? PauseCircle : CheckCircle2}
                title="Suscripción de avisos"
                description={pausado
                  ? 'Pausada. Escribe REANUDAR al número de avisos para retomar.'
                  : 'Activa. Recibes cada reserva nueva al instante.'
                }
              >
                <span className={`text-[11px] font-bold uppercase tracking-wider ${pausado ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {pausado ? 'Pausado' : 'Activo'}
                </span>
              </SettingRow>
              <SettingRow
                Icon={MessageCircle}
                title="Número vinculado"
                description="Tu WhatsApp donde llegan los avisos."
              >
                <span className="text-[13px] font-semibold text-primary">{estado?.telefono || '—'}</span>
              </SettingRow>
              <SettingRow
                Icon={Zap}
                title="Canal WhatsApp"
                description={ventanaOk
                  ? 'Conectado — la ventana de 24h con Meta está abierta.'
                  : 'En espera — respondé cualquier mensaje al número para reabrirla.'
                }
              >
                <span className={`text-[11px] font-bold uppercase tracking-wider ${ventanaOk ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {ventanaOk ? 'Conectado' : 'En espera'}
                </span>
              </SettingRow>
            </SettingsGroup>

            {!ventanaOk && !pausado && (
              <SettingsGroup>
                <div className="px-4 sm:px-5 py-3.5 text-[13px] text-amber-200/80 leading-relaxed flex items-start gap-3">
                  <Clock size={15} className="text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    Pasaste más de un día sin responder en WhatsApp, así que los próximos avisos llegan por la app.
                    Para volver a recibirlos por WhatsApp, {' '}
                    <a href={numero ? `https://wa.me/${numero}?text=${encodeURIComponent('Hola')}` : '#'}
                       target="_blank" rel="noopener noreferrer"
                       className="text-amber-300 font-bold underline">envía cualquier mensaje</a>
                    {' '} al número de avisos.
                  </span>
                </div>
              </SettingsGroup>
            )}
          </>
        )}

        {/* Nota de servicio incluido */}
        <div className="flex items-start gap-2.5 px-1 sm:px-1 text-[11.5px] text-slate-500 leading-relaxed">
          <ShieldCheck size={14} className="text-emerald-500/70 shrink-0 mt-0.5" />
          <span>
            Servicio incluido sin costo: usa el canal oficial de WhatsApp. Responder{' '}
            <span className="text-slate-300 font-semibold">1</span> a los avisos mantiene la ventana de 24h abierta.
            Si dejás de responder, los avisos siguen llegando por la app del panel sin perder ninguno.
          </span>
        </div>

        {/* Botón de refresh discreto */}
        <div className="flex justify-end">
          <button onClick={cargar} className="inline-flex items-center gap-1.5 text-[11.5px] text-slate-500 hover:text-slate-300 transition-colors">
            <RefreshCw size={12} /> Actualizar estado
          </button>
        </div>
      </Section>

      {/* ══════════ NIVEL PAGADO — confirmación al cliente ══════════ */}
      <Section
        Icon={Sparkles}
        title={
          <span className="flex items-center gap-2">
            Confirmación automática a tus clientes
            {planCliente ? <Badge tone="violet">Activo</Badge> : <Badge tone="slate">Plan pagado</Badge>}
          </span>
        }
        description="Al reservar, tu cliente recibe un WhatsApp oficial a nombre de tu local con el detalle de su cita — menos inasistencias, imagen más profesional."
      >
        <SettingsGroup>
          <div className="grid lg:grid-cols-[1fr_260px] gap-6 items-start p-5 sm:p-6">

            {/* Izquierda: descripción + estado o CTA */}
            <div className="order-2 lg:order-1 space-y-4">
              <p className="text-[13px] text-slate-400 leading-relaxed">
                Usa plantillas oficiales verificadas por WhatsApp (mensajería con costo, por eso es parte del plan pagado). Los envíos quedan registrados y no dependen de que respondas a mano.
              </p>

              {planCliente ? (
                <div className="rounded-2xl border border-violet-500/25 bg-violet-500/[0.06] p-4 text-sm text-slate-200 flex items-center gap-3">
                  <CheckCircle2 size={16} className="text-violet-400 shrink-0" />
                  Activo — tus clientes reciben la confirmación automáticamente al reservar.
                </div>
              ) : (
                <a
                  href={`https://wa.me/${WA_SYNAPTECH}?text=${encodeURIComponent(upgradeMsg)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-violet-500 hover:bg-violet-400 text-white text-sm font-bold px-5 py-3 rounded-full transition-all active:scale-[0.98] shadow-[0_6px_20px_-8px_rgba(139,92,246,0.6)]"
                >
                  <MessageCircle size={16} /> Solicitar activación
                </a>
              )}
            </div>

            {/* Derecha: vista previa EN VIVO de la confirmación */}
            <div className="order-1 lg:order-2">
              <LivePreviewHeader />
              <WaChatPreview
                headerName={nombreLocal}
                avatar={avatar}
                messages={CONFIRM_MSGS}
                timeline={CONFIRM_TIMELINE}
                height={300}
              />
              <p className="text-[11px] text-slate-500 text-center mt-2 leading-relaxed px-1">
                El cliente confirma su cita con un toque, sin llamadas.
              </p>
            </div>

          </div>
        </SettingsGroup>
      </Section>

    </div>
  );
}
