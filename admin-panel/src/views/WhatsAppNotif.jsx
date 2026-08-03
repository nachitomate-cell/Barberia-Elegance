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

// Caché a nivel de módulo (vive mientras el panel esté abierto). La vista de
// WhatsApp son pestañas: sin esto, ir a Facturación y volver a Mensajería
// desmonta y remonta este componente, y cada vuelta pagaba otra llamada a
// waNotifEstado con su spinner. 60s es suficiente para que navegar entre
// pestañas sea instantáneo sin mostrar datos rancios.
// Va CON el tenant adentro: es una variable de módulo, así que un operador que
// salta de local en el hub se llevaba el estado del anterior por 60s.
let cacheEstado = null;   // { tid, data, at }
const CACHE_MS = 60_000;

// Fuera del componente A PROPÓSITO: definido adentro, React lo trata como un
// tipo nuevo en cada render y remonta los toggles (parpadeo y pérdida de foco).
function Toggle({ on, onChange, titulo, detalle, disabled }) {
  return (
    <button type="button" disabled={disabled} onClick={() => onChange(!on)}
      className="w-full flex items-start justify-between gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-left hover:border-white/[0.15] transition-colors disabled:opacity-60">
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold text-slate-200">{titulo}</span>
        <span className="block text-[11px] text-slate-500 mt-0.5 leading-relaxed">{detalle}</span>
      </span>
      <span className={`relative w-10 h-[22px] rounded-full transition-colors shrink-0 mt-0.5 ${on ? 'bg-violet-500' : 'bg-slate-700'}`}>
        <span className={`absolute top-0.5 w-[18px] h-[18px] bg-white rounded-full shadow transition-all ${on ? 'left-[20px]' : 'left-0.5'}`} />
      </span>
    </button>
  );
}

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
// `seccion` parte esta vista entre pestañas de WhatsApp.jsx sin tocar el
// diseño de los bloques: 'reglas' = qué avisos salen (toggles + vista previa),
// 'facturacion' = saldo, reparto y compra de bolsas. 'todo' (default) es la
// vista completa, para cuando se entra por la ruta directa /whatsapp-notif.
export default function WhatsAppNotif({ embedded = false, onEstado, seccion = 'todo' }) {
  const tenant   = useTenant();
  const tenantId = resolveTenantId();

  // Arranca con lo último conocido: cambiar de pestaña no debe mostrar spinner.
  // Solo si la caché es de ESTE local (ver nota arriba).
  const fresco = cacheEstado && cacheEstado.tid === tenantId && (Date.now() - cacheEstado.at) < CACHE_MS;
  const [estado,   setEstado]   = useState(fresco ? cacheEstado.data : null);
  const [loading,  setLoading]  = useState(!fresco);
  const [error,    setError]    = useState(null);

  // `silencioso`: refresca los datos SIN volver al spinner. Sin esto, cada vez
  // que el dueño tocaba un toggle la vista entera se desmontaba y volvía a
  // montarse — se veía como si la pantalla se reiniciara sola.
  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true);
    setError(null);
    try {
      const fn  = httpsCallable(getFunctions(getApp(), 'us-central1'), 'waNotifEstado');
      // `tenantId` explícito — el servidor solo lo honra para operadores de
      // SynapTech, pero sin él caía al tenant del claim: Ignacio abriendo el
      // panel de otro local veía los flags y el saldo de ELEGANCE. En renacer
      // eso se leía como "confirmaciones ACTIVAS · te quedan 0 mensajes"
      // mientras arriba WaEstadoLinea (que sí lo manda) decía 100 disponibles.
      const res = await fn({ tenantId });
      setEstado(res.data || null);
      if (res.data) cacheEstado = { tid: tenantId, data: res.data, at: Date.now() };
    } catch (e) {
      if (!silencioso) setError(e.message || 'No se pudo cargar el estado.');
    } finally {
      if (!silencioso) setLoading(false);
    }
  }, [tenantId]);

  // Con caché fresca se revalida en segundo plano (sin spinner): datos al
  // instante y aun así al día.
  useEffect(() => { cargar(fresco); }, [cargar]);   // eslint-disable-line react-hooks/exhaustive-deps

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
  const verReglas = seccion === 'todo' || seccion === 'reglas';
  const verFact   = seccion === 'todo' || seccion === 'facturacion';
  const bolsas     = Array.isArray(estado?.bolsas) ? estado.bolsas : [];
  const bolsaSaldo = Number(estado?.bolsaSaldo) || 0;
  // Ojo: cuelga del módulo, no de planCliente — un local con SOLO recordatorios
  // (Kronnos) también tiene que ver el aviso de saldo bajo.
  // Los DOS cupos son independientes en el backend (confirmar reservas y
  // recordar citas), así que la alerta también: con 0 en confirmaciones y 100
  // en recordatorios el total se veía sano mientras las confirmaciones estaban
  // detenidas hace días, sin ninguna señal (auditoría 03-08-2026).
  const saldoConfBajo = !!estado?.planCliente      && (Number(estado?.bolsaSaldoConf) || 0) <= 10;
  const saldoRecBajo  = !!estado?.planRecordatorio && (Number(estado?.bolsaSaldoRec)  || 0) <= 10;
  const saldoBajo  = saldoConfBajo || saldoRecBajo;

  const [bolsaSel, setBolsaSel]     = useState('');
  const [comprando, setComprando]   = useState(false);
  const [errCompra, setErrCompra]   = useState('');
  // Link de pago de respaldo cuando el navegador bloquea la pestaña nueva.
  const [linkPago, setLinkPago]     = useState('');
  const [repartiendo, setRepartiendo] = useState(false);
  const [prefiriendo, setPrefiriendo] = useState(false);
  const planRecordatorio = !!estado?.planRecordatorio;
  const moduloActivo = planCliente || planRecordatorio;
  // Toggles auto-gestionables (estilo AgendaPro): cada tipo de aviso se
  // prende/apaga por separado; sin saldo en la bolsa igual no sale nada.
  // El switch se mueve AL TIRO en pantalla y después se confirma contra el
  // servidor (y se revierte si falla). Antes esperaba el round-trip completo y
  // recargaba con spinner: el dueño tocaba, no pasaba nada por un segundo, la
  // pantalla parpadeaba… y volvía a tocar, apagando lo que acababa de encender.
  const togglePref = async (campo, valor) => {
    if (prefiriendo) return;
    const key = campo === 'confirmaciones' ? 'planCliente' : 'planRecordatorio';
    setPrefiriendo(true);
    setErrCompra('');
    setEstado(e => (e ? { ...e, [key]: valor } : e));
    try {
      const fn = httpsCallable(getFunctions(getApp(), 'us-central1'), 'waNotifPreferencias');
      // Sin `tenantId` esto ESCRIBÍA en el tenant del claim: un operador
      // encendiendo las confirmaciones en el panel de un local se las prendía
      // (y le gastaba la bolsa) a otro.
      await fn({ tenantId, [campo]: valor });
      await cargar(true);                                   // silencioso: sin spinner
    } catch (e) {
      setEstado(prev => (prev ? { ...prev, [key]: !valor } : prev));   // revertir
      setErrCompra(e.message || 'No se pudo guardar.');
    }
    finally { setPrefiriendo(false); }
  };
  const cambiarReparto = async (pct) => {
    if (repartiendo) return;
    setRepartiendo(true);
    setErrCompra('');
    // Optimista: el reparto se ve aplicado de inmediato sobre el saldo actual.
    const antes = estado;   // para revertir si el servidor rechaza
    const total = (Number(estado?.bolsaSaldoConf) || 0) + (Number(estado?.bolsaSaldoRec) || 0);
    const confOpt = Math.round(total * pct / 100);
    setEstado(e => (e ? { ...e, repartoConfPct: pct, bolsaSaldoConf: confOpt, bolsaSaldoRec: total - confOpt } : e));
    try {
      const fn = httpsCallable(getFunctions(getApp(), 'us-central1'), 'waBolsaReparto');
      await fn({ tenantId, pct });
      await cargar(true);   // refresca saldos por cupo, sin spinner
    } catch (e) {
      // Sin esta reversión los saldos quedaban mostrando un reparto que el
      // servidor rechazó, hasta recargar la página: plata en pantalla que no
      // coincide con la real (auditoría 03-08-2026).
      setEstado(antes);
      setErrCompra(e.message || 'No se pudo cambiar el reparto.');
    } finally {
      setRepartiendo(false);
    }
  };
  const comprarBolsa = async () => {
    if (!bolsaSel || comprando) return;
    setComprando(true);
    setErrCompra('');
    try {
      // La pestaña se abre ANTES del await: Safari y Firefox pierden la
      // "user activation" durante la llamada y bloqueaban el popup. Como
      // `initPoint` existía, no se mostraba ningún error: el dueño apretaba
      // "Comprar" y no pasaba nada — plata que no entra (auditoría 03-08-2026).
      const tab = window.open('', '_blank', 'noopener');
      const fn = httpsCallable(getFunctions(getApp(), 'us-central1'), 'waBolsaCrearLink');
      // Idem: sin `tenantId` la bolsa comprada se acreditaba al local del claim.
      const r  = await fn({ tenantId, bolsaId: bolsaSel });
      if (r.data?.initPoint) {
        if (tab) tab.location = r.data.initPoint;
        else { setLinkPago(r.data.initPoint); setErrCompra('Tu navegador bloqueó la ventana de pago. Usa el botón de abajo para abrirla.'); }
      } else {
        if (tab) tab.close();
        setErrCompra('No se pudo generar el link de pago. Intenta de nuevo.');
      }
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
            {/* `onClick={cargar}` pasaba el SyntheticEvent como `silencioso`:
                un evento es truthy, así que el reintento corría en modo
                silencioso — se borraba el error, no se mostraba spinner y, si
                volvía a fallar, la vista quedaba con estado null renderizando
                "saldo 0" de forma permanente. Auditoría 03-08-2026. */}
            <button onClick={() => cargar()} className="shrink-0 text-slate-300 hover:text-primary p-2 rounded-lg hover:bg-white/5 transition-colors" aria-label="Reintentar">
              <RefreshCw size={15} />
            </button>
          </div>
        </SettingsGroup>
      </div>
    );
  }

  return (
    <div className={`space-y-8 ${embedded ? '' : 'max-w-3xl'}`}>

      {/* Errores de acciones (toggles, reparto, compra). Antes solo se
          renderizaban DENTRO del bloque de bolsas —invisible en la pestaña
          Mensajería—, así que un toggle rechazado por el servidor rebotaba
          sin explicación y el dueño lo volvía a tocar. */}
      {errCompra && (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.08] px-4 py-3 flex items-start gap-2.5">
          <p className="text-[12.5px] text-amber-200 leading-relaxed flex-1">{errCompra}</p>
          {linkPago && (
            <a href={linkPago} target="_blank" rel="noreferrer"
               className="shrink-0 text-[12px] font-semibold text-amber-300 hover:text-amber-100 underline">Abrir pago</a>
          )}
          <button onClick={() => { setErrCompra(''); setLinkPago(''); }}
                  className="text-[11px] text-amber-300/70 hover:text-amber-200 shrink-0">Cerrar</button>
        </div>
      )}

      {/* ══════════ NIVEL PAGADO — confirmación al cliente ══════════ */}
      <Section
        Icon={Sparkles}
        title={
          <span className="flex items-center gap-2">
            {verReglas ? 'Confirmación automática a tus clientes' : 'Tu bolsa de mensajes'}
            {/* `moduloActivo`, no `planCliente`: un local que paga y solo tiene
                recordatorios encendidos veía el badge gris de "no contratado"
                justo encima de una tarjeta que decía "Activo". */}
            {moduloActivo ? <Badge tone="violet">Activo</Badge> : <Badge tone="slate">Plan pagado</Badge>}
          </span>
        }
        description={verReglas
          ? 'Al reservar, tu cliente recibe un WhatsApp oficial a nombre de tu local con el detalle de su cita — menos inasistencias, imagen más profesional.'
          : 'Compras solo los mensajes que usas: cada confirmación o recordatorio descuenta uno. Sin mensualidad y sin vencimiento.'}
      >
        <SettingsGroup>
          <div className={`grid gap-6 items-start p-5 sm:p-6 ${verReglas ? 'lg:grid-cols-[1fr_260px]' : ''}`}>

            {/* Izquierda: descripción + estado o CTA */}
            <div className="order-2 lg:order-1 space-y-4">
              {verReglas && (
                <>
                  <p className="text-[13px] text-slate-400 leading-relaxed">
                    Usa plantillas oficiales verificadas por WhatsApp (mensajería con costo, por eso es parte del plan pagado). Los envíos quedan registrados y no dependen de que respondas a mano.
                  </p>

                  {/* Preferencias auto-gestionables (como AgendaPro) */}
                  <div className="space-y-2">
                    <Toggle
                      on={planCliente}
                      disabled={prefiriendo}
                      onChange={(v) => togglePref('confirmaciones', v)}
                      titulo="Notificación de creación de cita"
                      detalle={`Tu cliente recibe un WhatsApp oficial apenas reserva. Te quedan ${Number(estado?.bolsaSaldoConf) || 0} mensajes de confirmación.`}
                    />
                    <Toggle
                      on={planRecordatorio}
                      disabled={prefiriendo}
                      onChange={(v) => togglePref('recordatorios', v)}
                      titulo="Recordatorio 24 horas antes"
                      detalle={`Le recordamos la cita y puede confirmar con un toque. Te quedan ${Number(estado?.bolsaSaldoRec) || 0} mensajes de recordatorio.`}
                    />
                  </div>
                  {moduloActivo && (Number(estado?.bolsaSaldo) || 0) <= 10 && (
                    <p className="text-[11px] text-amber-300/90 leading-relaxed">
                      Te quedan pocos mensajes: recarga tu bolsa en la pestaña <b>Facturación</b> para que los avisos no se detengan.
                    </p>
                  )}
                </>
              )}

              {/* El saldo se muestra SIEMPRE que haya bolsa, aunque los dos
                  avisos estén apagados: si no, el dueño que los pausa deja de
                  ver cuántos mensajes tiene —y no puede repartirlos ni saber
                  si le alcanzan para volver a encenderlos. */}
              {verFact && (moduloActivo || bolsaSaldo > 0 || Number(estado?.bolsaMensual) > 0) && (
                <div className="rounded-2xl border border-violet-500/25 bg-violet-500/[0.06] p-4 text-sm text-slate-200 space-y-2.5">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 size={16} className={`shrink-0 ${moduloActivo ? 'text-violet-400' : 'text-slate-500'}`} />
                    <span>
                      {moduloActivo
                        ? <>Activo — {planCliente && planRecordatorio ? 'confirmación y recordatorio funcionando' : planCliente ? 'confirmación al reservar funcionando' : 'recordatorio 24h funcionando'}.</>
                        : <>En pausa — tienes mensajes disponibles, pero no saldrá ninguno hasta que enciendas un aviso en <b>Mensajería</b>.</>}
                    </span>
                  </div>
                  <div className={`rounded-xl px-3 py-2 border space-y-1.5 ${saldoBajo ? 'border-amber-500/30 bg-amber-500/[0.07]' : 'border-white/[0.06] bg-white/[0.03]'}`}>
                    <div className="flex items-baseline justify-between">
                      <span className={`text-[12px] ${saldoBajo ? 'text-amber-200/90' : 'text-slate-400'}`}>Saldo de tu bolsa</span>
                      <span className="text-base font-bold tabular-nums text-slate-100">
                        {bolsaSaldo} <span className="text-[11px] font-normal text-slate-500">mensaje{bolsaSaldo === 1 ? '' : 's'}</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Confirmaciones: <b className="text-slate-300 tabular-nums">{Number(estado?.bolsaSaldoConf) || 0}</b></span>
                      <span>Recordatorios: <b className="text-slate-300 tabular-nums">{Number(estado?.bolsaSaldoRec) || 0}</b></span>
                    </div>
                  </div>

                  {/* Reparto del cupo: hay locales que prefieren confirmar y otros recordar */}
                  <div className="space-y-1.5">
                    <p className="text-[11px] text-slate-500">¿En qué prefieres gastar tus mensajes?</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { pct: 100, label: 'Todo confirmaciones' },
                        { pct: 50,  label: 'Equilibrado' },
                        { pct: 0,   label: 'Todo recordatorios' },
                      ].map(o => (
                        <button
                          key={o.pct}
                          type="button"
                          disabled={repartiendo}
                          onClick={() => cambiarReparto(o.pct)}
                          className={`rounded-lg border px-2 py-1.5 text-[10.5px] font-semibold transition-colors ${Number(estado?.repartoConfPct) === o.pct
                            ? 'border-violet-400 bg-violet-500/15 text-violet-200'
                            : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/25'}`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-600 leading-relaxed">El cambio re-reparte tu saldo actual al instante y aplica también a las recargas futuras.</p>
                  </div>
                  {Number(estado?.bolsaMensual) > 0 && (
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Tu plan incluye <b className="text-slate-300">{estado.bolsaMensual} mensajes al mes</b>: el cupo se repone cada día 1 (no se acumula; lo que compres aparte no vence).
                    </p>
                  )}
                  {saldoBajo && (
                    <p className="text-[11px] text-amber-300/90 leading-relaxed">
                      Quedan pocos mensajes: recarga abajo para que las confirmaciones no se detengan.
                    </p>
                  )}
                </div>
              )}

              {/* ── Canal oficial aún no habilitado: NO se vende ──
                  El envío real exige _system/whatsapp_notif.templatesEnabled.
                  Sin este bloque el flujo de compra funcionaba completo (MP
                  cobraba, el saldo se acreditaba) y no salía ni un mensaje. */}
              {verFact && estado?.canalOficialListo === false && (
                <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.07] p-4">
                  <p className="text-sm font-semibold text-amber-200">Este canal todavía no está habilitado</p>
                  <p className="text-[12px] text-slate-400 leading-relaxed mt-1">
                    Estamos terminando la certificación con Meta para tu local. Cuando quede lista te avisamos y podrás
                    comprar tu bolsa — no queremos cobrarte por mensajes que aún no pueden salir.
                  </p>
                  <a href={`https://wa.me/56983568212?text=${encodeURIComponent('Hola SynapTech, quiero saber cuándo queda listo el canal de confirmaciones por WhatsApp para mi local.')}`}
                     target="_blank" rel="noreferrer"
                     className="inline-flex items-center gap-1.5 mt-2.5 text-[12px] font-semibold text-amber-300 hover:text-amber-200">
                    Consultar por WhatsApp →
                  </a>
                </div>
              )}

              {/* ── Bolsas de mensajes: compras solo lo que usas ── */}
              {verFact && bolsas.length > 0 && estado?.canalOficialListo !== false && (
                <div className="rounded-2xl border border-violet-500/25 bg-violet-500/[0.05] p-4 space-y-3">
                  <p className="text-sm font-semibold text-slate-100">
                    {moduloActivo ? 'Recargar bolsa de mensajes' : 'Elige tu bolsa de mensajes'}
                  </p>
                  <p className="text-[12px] text-slate-400 leading-relaxed">
                    Cada confirmación o recordatorio descuenta 1 mensaje de tu bolsa. Sin mensualidad: compras solo lo que usas{moduloActivo ? '' : ', y con tu primera bolsa el módulo se activa solo'}.
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
            {verReglas && (
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
            )}

          </div>
        </SettingsGroup>
      </Section>

    </div>
  );
}
