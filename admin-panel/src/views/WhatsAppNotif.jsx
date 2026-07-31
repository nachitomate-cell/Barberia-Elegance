import { useState, useEffect, useCallback } from 'react';
import { getApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { MessageCircle, CheckCircle2, RefreshCw, Sparkles } from 'lucide-react';
import { resolveTenantId } from '../lib/tenantUtils';
import { useTenant } from '../contexts/TenantContext';
import { WaChatPreview, LivePreviewHeader } from '../components/WaChatPreview';
import { Section, SettingsGroup } from '../components/ui/SettingsPrimitives';
import Spinner from '../components/ui/Spinner';

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

// Vista "Avisos WhatsApp" — confirmación automática al CLIENTE por WhatsApp
// oficial (plantilla verificada). Lo activa SynapTech por local; el cliente
// solo puede solicitarlo con el CTA.
//
// El módulo "Aviso de reservas al local" (nivel gratis: cada reserva llegaba
// como WhatsApp de sesión al dueño) se retiró de esta vista. El backend sigue
// en pie —whatsapp-notif.js y la callable waNotifEstado, de la que acá se
// sigue leyendo planCliente—, así que los locales que ya lo hubieran activado
// seguirían recibiendo los avisos, solo que sin panel donde gestionarlos.

const WA_SYNAPTECH = '56983568212';

// Badge pequeño estilo iOS ("Plan pagado", "Activo").
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
//
// `onEstado`: le dice a WhatsApp.jsx si el módulo está contratado, para que lo
// ubique arriba o al final. Opcional — accediendo directo, nadie escucha.
export default function WhatsAppNotif({ embedded = false, onEstado }) {
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

  // De todo lo que devuelve waNotifEstado solo se usa planCliente: el módulo
  // de avisos al dueño se retiró de esta vista, pero la callable sigue siendo
  // la fuente del entitlement del plan pagado.
  const planCliente = !!estado?.planCliente;

  // Solo se reporta con respuesta en mano. Si la callable falla no se dice
  // 'disponible': mandaría abajo un módulo que quizá sí está contratado, y el
  // dueño leería el error como "me lo quitaron".
  useEffect(() => {
    if (loading || error) return;
    onEstado?.(planCliente ? 'activo' : 'disponible');
  }, [loading, error, planCliente, onEstado]);

  const nombreLocal = tenant?.name || tenantId || 'Tu Local';
  const avatar      = (nombreLocal.trim()[0] || 'B').toUpperCase();

  const upgradeMsg = `Hola SynapTech, soy de *${tenant?.name || tenantId}* y tengo una duda sobre las confirmaciones automáticas por WhatsApp (bolsas de mensajes).`;
  // Bolsas de mensajes: catálogo (neto + IVA) y saldo vienen de waNotifEstado;
  // el catálogo lo fija SynapTech en _system/whatsapp_notif.bolsas sin deploy.
  const bolsas     = Array.isArray(estado?.bolsas) ? estado.bolsas : [];
  const bolsaSaldo = Number(estado?.bolsaSaldo) || 0;
  const saldoBajo  = planCliente && bolsaSaldo <= 10;

  const [bolsaSel, setBolsaSel]   = useState('');
  const [comprando, setComprando] = useState(false);
  const [errCompra, setErrCompra] = useState('');
  const comprarBolsa = async () => {
    if (!bolsaSel || comprando) return;
    setComprando(true);
    setErrCompra('');
    try {
      const fn = httpsCallable(getFunctions(getApp(), 'us-central1'), 'waBolsaCrearLink');
      const r  = await fn({ bolsaId: bolsaSel });
      if (r.data?.initPoint) window.open(r.data.initPoint, '_blank', 'noopener');
      else setErrCompra('No se pudo generar el link de pago. Intenta de nuevo.');
    } catch (e) {
      setErrCompra(e.message || 'No se pudo generar el link de pago.');
    } finally {
      setComprando(false);
    }
  };

  if (loading) {
    return (
      <div className={embedded ? '' : 'max-w-3xl'}>
        <div className="flex justify-center py-16">
          <Spinner size={28} className="text-slate-500" />
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

              {planCliente && (
                <div className="rounded-2xl border border-violet-500/25 bg-violet-500/[0.06] p-4 text-sm text-slate-200 space-y-2.5">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 size={16} className="text-violet-400 shrink-0" />
                    <span>Activo — tus clientes reciben confirmación y recordatorio automáticamente.</span>
                  </div>
                  <div className={`flex items-baseline justify-between rounded-xl px-3 py-2 border ${saldoBajo ? 'border-amber-500/30 bg-amber-500/[0.07]' : 'border-white/[0.06] bg-white/[0.03]'}`}>
                    <span className={`text-[12px] ${saldoBajo ? 'text-amber-200/90' : 'text-slate-400'}`}>Saldo de tu bolsa</span>
                    <span className="text-base font-bold tabular-nums text-slate-100">
                      {bolsaSaldo} <span className="text-[11px] font-normal text-slate-500">mensaje{bolsaSaldo === 1 ? '' : 's'}</span>
                    </span>
                  </div>
                  {saldoBajo && (
                    <p className="text-[11px] text-amber-300/90 leading-relaxed">
                      Quedan pocos mensajes: recarga abajo para que las confirmaciones no se detengan.
                    </p>
                  )}
                </div>
              )}

              {/* ── Bolsas de mensajes: compras solo lo que usas ── */}
              {bolsas.length > 0 && (
                <div className="rounded-2xl border border-violet-500/25 bg-violet-500/[0.05] p-4 space-y-3">
                  <p className="text-sm font-semibold text-slate-100">
                    {planCliente ? 'Recargar bolsa de mensajes' : 'Elige tu bolsa de mensajes'}
                  </p>
                  <p className="text-[12px] text-slate-400 leading-relaxed">
                    Cada confirmación o recordatorio descuenta 1 mensaje de tu bolsa. Sin mensualidad: compras solo lo que usas{planCliente ? '' : ', y con tu primera bolsa el módulo se activa solo'}.
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {bolsas.map(b => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setBolsaSel(b.id)}
                        className={`rounded-xl border px-2 py-3 text-center transition-colors ${bolsaSel === b.id
                          ? 'border-violet-400 bg-violet-500/15'
                          : 'border-white/10 bg-white/[0.03] hover:border-white/25'}`}
                      >
                        <p className="text-lg font-bold text-slate-100 tabular-nums leading-none">{b.mensajes}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">mensajes</p>
                        <p className="text-[12px] font-semibold text-slate-200 mt-1.5">${Number(b.precio).toLocaleString('es-CL')}</p>
                        <p className="text-[10px] text-slate-500">+ IVA</p>
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={comprarBolsa}
                    disabled={!bolsaSel || comprando}
                    className="w-full inline-flex items-center justify-center gap-2 bg-violet-500 hover:bg-violet-400 disabled:opacity-40 text-white text-sm font-bold px-5 py-3 rounded-full transition-all active:scale-[0.98] shadow-[0_6px_20px_-8px_rgba(139,92,246,0.6)]"
                  >
                    {comprando ? 'Generando link…' : 'Comprar con Mercado Pago'}
                  </button>
                  {bolsaSel && (
                    <p className="text-[11px] text-slate-500 text-center leading-relaxed">
                      Total: ${Number(bolsas.find(b => b.id === bolsaSel)?.precioConIva || 0).toLocaleString('es-CL')} IVA incluido.
                      El saldo se carga automáticamente apenas se acredite el pago.
                    </p>
                  )}
                  {errCompra && <p className="text-[11px] text-red-400 text-center">{errCompra}</p>}
                  <a
                    href={`https://wa.me/${WA_SYNAPTECH}?text=${encodeURIComponent(upgradeMsg)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 border border-white/10 hover:border-white/25 text-slate-400 hover:text-white text-[12px] font-semibold px-5 py-2 rounded-full transition-colors"
                  >
                    <MessageCircle size={13} /> ¿Dudas? Habla con SynapTech
                  </a>
                </div>
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
