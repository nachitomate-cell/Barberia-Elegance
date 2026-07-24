import { useState, useEffect } from 'react';
import { getApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { resolveTenantId } from '../lib/tenantUtils';
import { useTenant } from '../contexts/TenantContext';
import { WaChatPreview, ClaudeBadge, LivePreviewHeader } from '../components/WaChatPreview';
import { Section, SettingsGroup, SettingRow, IosToggle } from '../components/ui/SettingsPrimitives';
import {
  QrCode, ShieldAlert, Loader2, CheckCircle2, Clock,
  Smartphone, Unlink, Sparkles, X, Lock, MessageCircle, ExternalLink, Bot,
  ShieldCheck, FileText, ChevronRight, Zap,
} from 'lucide-react';

// Módulo premium "Asistente IA 24/7" — el bot responde y agenda solo sobre el
// número PROPIO del local (Evolution API, sesión/QR). Backend: functions/evolution/gateway.js.
//
// GATING: la "llave" del módulo vive en _system/{tid}.waAsistente, que SOLO
// SynapTech puede escribir (reglas: _system write = esBootstrap). El cliente
// NO lo auto-activa: si no está habilitado, solo ve la tarjeta bloqueada con
// "Solicitar activación". Fallback: si ya está conectado, se respeta (no se
// bloquea a quien ya lo tenía andando).

const WA_SYNAPTECH = '56983568212';

const TYC_TEXT =
  'Comprendo que al vincular mi línea particular a un asistente automatizado de terceros, ' +
  'asumo las políticas de uso responsable de WhatsApp y de la plataforma.';

/* ── Políticas de WhatsApp (v1.0 · julio 2026) ─────────────────────
   Documento de riesgos y uso responsable del módulo. */
const POLITICAS_WHATSAPP = [
  { t: '1 · Qué es este servicio', c: 'El Asistente funciona vinculando tu número de WhatsApp como "dispositivo vinculado" (igual que WhatsApp Web), no mediante la API oficial de Meta. Tu teléfono y tu app siguen funcionando normal y mantienes el control total de tus conversaciones.' },
  { t: '2 · Riesgo del canal (importante)', c: 'WhatsApp/Meta puede restringir o suspender números que, según sus sistemas automáticos, infrinjan sus condiciones. Ese riesgo existe con cualquier herramienta de automatización no oficial, SynapTech no lo controla ni puede garantizar que no ocurra, y al vincular tu número lo aceptas expresamente. Recomendamos usar un número con historial (nunca un chip recién comprado) y tener un chip de respaldo.' },
  { t: '3 · Uso responsable (lo que el sistema permite)', c: 'El Asistente solo responde a clientes que te escriben primero y envía confirmaciones de citas reales de tu propia agenda. Está prohibido usar el canal para spam, marketing masivo, mensajes a bases de datos compradas o contenido ilícito. SynapTech puede suspender el módulo ante un uso indebido.' },
  { t: '4 · Protecciones automáticas', c: 'Para cuidar tu número, el sistema impone ritmo humano de escritura, topes diarios de envío según la antigüedad de la vinculación, silencio automático del bot cuando un humano toma la conversación, y respeto inmediato a quien pide no recibir mensajes. Estos límites no son configurables: son la protección.' },
  { t: '5 · Datos personales (Ley 21.719)', c: 'Los datos de tus clientes (nombres, teléfonos, mensajes, citas) son tuyos: tu local es el responsable del tratamiento y SynapTech actúa como encargado, procesándolos únicamente para operar el servicio (responder, agendar, confirmar). La memoria conversacional es acotada y no se venden ni comparten datos con terceros.' },
  { t: '6 · Responsabilidad', c: 'SynapTech responde por el funcionamiento de su software. No responde por decisiones de Meta/WhatsApp sobre tu número (restricciones, suspensiones, cambios de plataforma), por indisponibilidad del canal, por la entrega efectiva de cada mensaje, ni por usos del canal contrarios a estas políticas. Tus datos de negocio (citas, clientes, historial) viven en la plataforma, no en WhatsApp: una suspensión del número no los afecta.' },
  { t: '7 · Tu control', c: 'Puedes apagar el Asistente, apagar las confirmaciones o desvincular tu número cuando quieras desde este mismo panel, con efecto inmediato. Desvincular devuelve el control 100% manual a tu teléfono.' },
  { t: '8 · Continuidad del servicio', c: 'Si WhatsApp modifica o bloquea el mecanismo de dispositivos vinculados, el servicio podrá migrar a otro canal o suspenderse mientras exista una alternativa viable, sin que ello constituya incumplimiento de SynapTech.' },
  { t: '9 · Aceptación', c: 'Al marcar la casilla y vincular tu número, el administrador del local declara haber leído y aceptado estas políticas. Queda registro de la cuenta, fecha y hora de aceptación. Versión 1.0 · julio 2026 · Dudas: WhatsApp +56 9 8356 8212.' },
];

/* ── Capacidades del bot (VERAZ — espejo de functions/evolution/cerebro.js) ── */
const CAPACIDADES_SI = [
  { t: 'Responde 24/7 en tu propio número', c: 'Contesta al instante cualquier día y hora, con el nombre y los datos de tu local. Tu app y tu teléfono siguen funcionando normal.' },
  { t: 'Informa tus servicios y precios reales', c: 'Lee tu catálogo tal como está en el panel. Nunca inventa un precio ni un servicio: si no existe, lo dice.' },
  { t: 'Revisa disponibilidad real', c: 'Calcula las horas libres respetando tu horario, el horario personal de cada profesional (días libres, descansos, colación) y las citas ya tomadas.' },
  { t: 'Agenda citas por sí solo', c: 'Confirma servicio, fecha y hora con el cliente, elige un profesional libre y crea la cita con código de reserva. Sin dobles reservas: usa el mismo candado de cupos que tu agenda.' },
  { t: 'Consulta las citas del cliente que escribe', c: 'Si el cliente pregunta "¿a qué hora era mi cita?", el bot busca las citas futuras de ESE número y se las recuerda.' },
  { t: 'Cancela o cambia citas del propio cliente', c: 'Solo las citas del número que escribe (jamás las de otra persona) y respetando tu política. Cancelar libera el cupo al instante.' },
  { t: 'Pide confirmación de asistencia', c: 'Con las confirmaciones activas, escribe al cliente antes de su hora (12/24/48 h, tú eliges) pidiendo responder CONFIRMAR o CANCELAR.' },
  { t: 'Deriva a tu equipo cuando corresponde', c: 'Si el cliente pide hablar con una persona, reclama o pide algo fuera de su alcance, el bot avisa que el equipo seguirá la conversación y se calla 2 horas en ese chat.' },
  { t: 'Habla como tú prefieras', c: 'Español neutro por defecto, o "chileno cercano" con modismos suaves si lo activas en este panel.' },
];
const CAPACIDADES_NO = [
  { t: 'No entiende audios ni fotos', c: 'Si le mandan una nota de voz o una imagen, responde amablemente que solo puede leer texto. Si la foto trae texto, ese texto sí lo lee.' },
  { t: 'No cobra ni maneja pagos', c: 'No pide transferencias, no envía links de pago ni promete descuentos.' },
  { t: 'No hace marketing ni mensajes masivos', c: 'Solo conversa con quien le escribe y envía las confirmaciones de cita. Cero spam: es parte del blindaje anti-bloqueo del número.' },
  { t: 'No responde grupos ni estados', c: 'Solo chats directos de clientes.' },
  { t: 'No pisa a tu equipo', c: 'Si alguien del local responde un chat a mano, el bot se calla 2 horas en esa conversación.' },
  { t: 'No cae en abusos', c: 'Máximo 30 respuestas al día por chat: si alguien lo hace hablar de más, avisa que el equipo seguirá y se detiene.' },
  { t: 'No agenda en el pasado ni inventa horas', c: 'Toda hora ofrecida sale del cálculo real de disponibilidad; fechas ya pasadas se rechazan siempre.' },
];

/* ── Modales de ayuda (idénticos en lógica al diseño anterior) ── */
function InfoModal({ title, subtitle, Icon, iconColor, onClose, children }) {
  return (
    <div className="fixed inset-0 z-[9100] flex items-center justify-center px-4 py-8 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-3xl border border-white/10 bg-slate-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2.5">
            <Icon size={18} className={iconColor} />
            <div>
              <h3 className="text-base font-semibold text-primary leading-tight tracking-tight">{title}</h3>
              <p className="text-[11.5px] text-slate-500">{subtitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-primary shrink-0" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">
          {children}
        </div>
        <div className="px-6 py-3.5 border-t border-white/[0.06] shrink-0">
          <button
            onClick={onClose}
            className="w-full rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-primary text-sm font-semibold py-2.5 transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

function PoliticasModal({ onClose }) {
  return (
    <InfoModal
      title="Políticas de WhatsApp"
      subtitle="Riesgos y uso responsable del Asistente · v1.0"
      Icon={ShieldCheck}
      iconColor="text-emerald-400"
      onClose={onClose}
    >
      <div className="space-y-4">
        {POLITICAS_WHATSAPP.map((s) => (
          <div key={s.t}>
            <p className="text-xs font-semibold text-emerald-300 mb-1">{s.t}</p>
            <p className="text-xs text-slate-300 leading-relaxed">{s.c}</p>
          </div>
        ))}
      </div>
    </InfoModal>
  );
}

function CapacidadesModal({ onClose }) {
  return (
    <InfoModal
      title="¿Qué puede hacer el bot?"
      subtitle="Capacidades y límites, sin letra chica"
      Icon={Bot}
      iconColor="text-violet-400"
      onClose={onClose}
    >
      <div className="space-y-5">
        <div className="space-y-3.5">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-emerald-400">Lo que hace</p>
          {CAPACIDADES_SI.map((s) => (
            <div key={s.t} className="flex items-start gap-2.5">
              <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-slate-200 mb-0.5">{s.t}</p>
                <p className="text-xs text-slate-400 leading-relaxed">{s.c}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-3.5 pt-4 border-t border-white/[0.06]">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-amber-400">Lo que NO hace (a propósito)</p>
          {CAPACIDADES_NO.map((s) => (
            <div key={s.t} className="flex items-start gap-2.5">
              <X size={14} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-slate-200 mb-0.5">{s.t}</p>
                <p className="text-xs text-slate-400 leading-relaxed">{s.c}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </InfoModal>
  );
}

// Badge de status. `tone` fija el color.
function Badge({ tone = 'slate', children, pulse = false }) {
  const tones = {
    slate:   'bg-white/[0.04] text-slate-300 border-white/10',
    emerald: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
    violet:  'bg-violet-500/10 text-violet-300 border-violet-500/25',
    amber:   'bg-amber-500/10 text-amber-300 border-amber-500/25',
    red:     'bg-red-500/10 text-red-300 border-red-500/25',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 border rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.07em] ${tones[tone]}`}>
      {pulse && <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${tone === 'emerald' ? 'bg-emerald-400' : 'bg-current'}`} />}
      {children}
    </span>
  );
}

// Row-link con chevron a la derecha — para abrir modales de ayuda.
function LinkRow({ Icon, title, onClick, iconColor = 'text-slate-400' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 text-left hover:bg-white/[0.02] transition-colors"
    >
      <Icon size={16} className={`shrink-0 ${iconColor}`} />
      <span className="flex-1 text-[14px] font-medium text-primary">{title}</span>
      <ChevronRight size={15} className="text-slate-500 shrink-0" />
    </button>
  );
}

// Guion del chat de la vista previa (el bot que responde y agenda solo).
const ASISTENTE_MSGS = [
  { side: 'out', text: 'Hola! ¿Tienen hora para hoy? ✂️' },
  { side: 'in',  text: '¡Hola! 👋 Sí, tengo 16:00 o 17:30 con Vicente. ¿Cuál te acomoda?' },
  { side: 'out', text: '16:00 porfa 🙌' },
  { side: 'in',  text: '✅ Listo, te agendé Corte + Barba hoy a las 16:00. ¡Te esperamos!' },
];
const ASISTENTE_TIMELINE = [
  { count: 1, typing: false, dur: 1700 },
  { count: 1, typing: true,  dur: 1300 },
  { count: 2, typing: false, dur: 2600 },
  { count: 3, typing: false, dur: 1500 },
  { count: 3, typing: true,  dur: 1200 },
  { count: 4, typing: false, dur: 3200 },
];

function callFn(name, payload) {
  const fn = httpsCallable(getFunctions(getApp(), 'us-central1'), name);
  return fn(payload).then((r) => r.data);
}

export default function WhatsAppAsistente({ embedded = false }) {
  const tid    = resolveTenantId();
  const tenant = useTenant();

  const [sys, setSys]           = useState(null);   // _system/{tid} → entitlement
  const [cfg, setCfg]           = useState(null);   // configuracion/whatsapp → operativo
  const [tyc, setTyc]           = useState(false);
  const [modal, setModal]       = useState(false);
  const [qr, setQr]             = useState(null);
  const [pairing, setPairing]   = useState(null);
  const [vinculando, setVinc]   = useState(false);
  const [conectado, setConectado] = useState(false);
  const [err, setErr]           = useState('');
  const [showPoliticas, setShowPoliticas] = useState(false);
  const [showCapacidades, setShowCapacidades] = useState(false);

  /* ── Entitlement: _system/{tid}.waAsistente (solo SynapTech lo escribe) ── */
  useEffect(() => {
    const ref = doc(db, '_system', tid);
    return onSnapshot(ref, (s) => setSys(s.exists() ? s.data() : {}), () => setSys({}));
  }, [tid]);

  /* ── Config operativa del local ── */
  useEffect(() => {
    const ref = doc(db, 'tenants', tid, 'configuracion', 'whatsapp');
    return onSnapshot(ref, (snap) => setCfg(snap.exists() ? snap.data() : {}), () => setCfg({}));
  }, [tid]);

  const estado      = cfg?.estadoConexion || 'disconnected';
  const isConnected = estado === 'connected';
  const numero      = cfg?.numeroVinculado;
  const botOn       = cfg?.botEnabled === true;
  const confirmOn   = cfg?.confirmacionesEnabled === true;
  const estiloChileno = cfg?.estiloChileno === true;
  const ventana     = cfg?.recordatorio?.ventanaHoras ?? 24;

  // Habilitado = la llave de SynapTech, o (fallback) ya estaba conectado.
  const habilitado = sys?.waAsistente === true || isConnected;

  const solicitarUrl = `https://wa.me/${WA_SYNAPTECH}?text=${encodeURIComponent(
    `Hola SynapTech, soy de *${tenant?.name || tid}* y quiero activar el *Asistente IA 24/7* por WhatsApp (el bot que responde y agenda solo). ¿Cómo lo activamos?`,
  )}`;

  const nombreLocal = tenant?.name || tid || 'Tu Local';
  const avatar      = (nombreLocal.trim()[0] || 'B').toUpperCase();

  /* ── Escritura de switches operativos (solo si está habilitado) ── */
  function patchCfg(patch) {
    setDoc(doc(db, 'tenants', tid, 'configuracion', 'whatsapp'), patch, { merge: true }).catch(() => {});
  }

  async function vincular() {
    setErr(''); setVinc(true); setQr(null); setConectado(false);
    try {
      const r = await callFn('evolutionVincular', { tycAceptado: true, tenantId: tid });
      setQr(r.qr); setPairing(r.pairingCode); setModal(true);
    } catch (e) {
      setErr(e?.message || 'No se pudo iniciar la vinculación. Reintenta.');
    } finally {
      setVinc(false);
    }
  }

  useEffect(() => {
    if (!modal || conectado) return;
    let alive = true;
    const iv = setInterval(async () => {
      try {
        const r = await callFn('evolutionEstado', { tenantId: tid });
        if (!alive) return;
        if (r.estado === 'connected') {
          setConectado(true);
          setTimeout(() => { if (alive) { setModal(false); setConectado(false); } }, 1900);
        } else if (r.qr) {
          setQr(r.qr); setPairing(r.pairingCode);
        }
      } catch { /* transitorio */ }
    }, 5000);
    return () => { alive = false; clearInterval(iv); };
  }, [modal, conectado, tid]);

  async function desvincular() {
    if (!window.confirm('¿Desvincular WhatsApp? El bot dejará de responder y recuperas el control 100% manual de tu teléfono.')) return;
    setErr('');
    try { await callFn('evolutionDesvincular', { tenantId: tid }); }
    catch (e) { setErr(e?.message || 'No se pudo desvincular.'); }
  }

  /* ── Título estándar de la Section (usado en los 3 modos) ── */
  const sectionTitle = (statusBadge) => (
    <span className="flex items-center gap-2 flex-wrap">
      Asistente IA 24/7
      <Badge tone="violet">Premium</Badge>
      {statusBadge}
    </span>
  );
  const sectionDesc = 'El bot responde y agenda solo en tu propio WhatsApp — sin perder tu app ni tu número.';

  /* ── Cargando el estado del entitlement ── */
  if (sys === null || cfg === null) {
    return (
      <div className={embedded ? '' : 'max-w-3xl'}>
        <SettingsGroup>
          <div className="px-4 sm:px-5 py-8 flex items-center justify-center">
            <Loader2 size={20} className="animate-spin text-slate-500" />
          </div>
        </SettingsGroup>
      </div>
    );
  }

  /* ══════════ BLOQUEADO — no habilitado por SynapTech ══════════ */
  if (!habilitado) {
    return (
      <div className={embedded ? '' : 'max-w-3xl'}>
        <Section
          Icon={Sparkles}
          title={sectionTitle(<Badge tone="slate"><Lock size={10} /> Bajo activación</Badge>)}
          description={sectionDesc}
        >
          <SettingsGroup>
            <div className="grid lg:grid-cols-[1fr_260px] gap-6 items-start p-5 sm:p-6">

              <div className="order-2 lg:order-1 space-y-5">
                {/* 3 beneficios */}
                <div className="space-y-3">
                  {[
                    { Icon: Bot,      t: 'Responde solo',  d: 'Precios, horarios y disponibilidad — al instante, 24/7.' },
                    { Icon: Clock,    t: 'Agenda por ti',  d: 'El cliente pide hora y el bot la reserva en tu agenda.' },
                    { Icon: Sparkles, t: 'Anti no-show',   d: 'Confirma las citas para reducir las inasistencias.' },
                  ].map((f, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="p-1.5 rounded-lg bg-violet-500/10 border border-violet-500/25 shrink-0">
                        <f.Icon size={14} className="text-violet-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13.5px] font-semibold text-primary leading-tight">{f.t}</p>
                        <p className="text-[12px] text-slate-500 leading-snug mt-0.5">{f.d}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <ClaudeBadge />

                <div>
                  <a
                    href={solicitarUrl}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-violet-500 hover:bg-violet-400 text-white text-sm font-bold px-5 py-3 rounded-full transition-all active:scale-[0.98] shadow-[0_6px_20px_-8px_rgba(139,92,246,0.6)]"
                  >
                    <MessageCircle size={16} /> Solicitar activación <ExternalLink size={13} />
                  </a>
                  <p className="text-[11.5px] text-slate-500 mt-2.5 leading-relaxed">
                    Módulo premium que activa el equipo de SynapTech por ti. Toca el botón y coordinamos la puesta en marcha sobre tu número.
                  </p>
                </div>
              </div>

              {/* Vista previa */}
              <div className="order-1 lg:order-2">
                <LivePreviewHeader />
                <WaChatPreview
                  headerName={nombreLocal}
                  avatar={avatar}
                  messages={ASISTENTE_MSGS}
                  timeline={ASISTENTE_TIMELINE}
                  height={320}
                />
                <p className="text-[11px] text-slate-500 text-center mt-2 leading-relaxed px-1">
                  Así responde y agenda el bot en tu WhatsApp, solo.
                </p>
              </div>
            </div>
          </SettingsGroup>
        </Section>

        {showPoliticas && <PoliticasModal onClose={() => setShowPoliticas(false)} />}
        {showCapacidades && <CapacidadesModal onClose={() => setShowCapacidades(false)} />}
      </div>
    );
  }

  /* ══════════ HABILITADO — módulo operativo ══════════ */
  return (
    <div className={`space-y-6 ${embedded ? '' : 'max-w-3xl'}`}>

      <Section
        Icon={Sparkles}
        title={sectionTitle(isConnected
          ? <Badge tone="emerald" pulse>Conectado</Badge>
          : <Badge tone="amber">Listo para vincular</Badge>
        )}
        description={sectionDesc}
      >

        {err && (
          <div role="alert" className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-[13px] text-red-300">
            {err}
          </div>
        )}

        <ClaudeBadge />

        {!isConnected ? (
          /* ── MODO NO VINCULADO — T&C + info + botón ── */
          <>
            <SettingsGroup label="Antes de vincular" divide>
              {/* Fila de aceptación T&C */}
              <label className="flex items-start gap-3 cursor-pointer select-none px-4 sm:px-5 py-3.5">
                <input
                  type="checkbox"
                  checked={tyc}
                  onChange={(e) => setTyc(e.target.checked)}
                  className="mt-0.5 accent-amber-500 h-4 w-4 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium text-primary leading-snug">Acepto las políticas del canal</p>
                  <p className="text-[12px] text-slate-500 mt-0.5 leading-relaxed">{TYC_TEXT}</p>
                </div>
              </label>

              <LinkRow Icon={Bot} title="¿Qué puede hacer el bot? — capacidades y límites"
                iconColor="text-violet-400"
                onClick={() => setShowCapacidades(true)} />
              <LinkRow Icon={FileText} title="Políticas de WhatsApp — riesgos y uso responsable"
                iconColor="text-emerald-400"
                onClick={() => setShowPoliticas(true)} />
            </SettingsGroup>

            <SettingsGroup footer="Vas a escanear un QR desde tu celular (WhatsApp → Dispositivos vinculados). Tu número sigue funcionando normal.">
              <div className="px-4 sm:px-5 py-5">
                <button
                  type="button"
                  onClick={vincular}
                  disabled={!tyc || vinculando}
                  className="w-full flex items-center justify-center gap-2 rounded-full bg-[#25D366] hover:bg-[#20bd5a] disabled:opacity-40 disabled:cursor-not-allowed text-ink-950 text-sm font-bold py-3 transition-all active:scale-[0.99] shadow-[0_6px_20px_-8px_rgba(37,211,102,0.6)]"
                >
                  {vinculando ? <Loader2 size={16} className="animate-spin" /> : <QrCode size={16} />}
                  {vinculando ? 'Generando QR…' : 'Vincular WhatsApp'}
                </button>
              </div>
            </SettingsGroup>
          </>
        ) : (
          /* ── MODO VINCULADO — estado + switches operativos ── */
          <>
            {/* Conexión */}
            <SettingsGroup label="Conexión">
              <SettingRow
                Icon={Smartphone}
                title={numero ? `+${numero}` : 'Número vinculado'}
                description="Tu WhatsApp está conectado al Asistente."
              >
                <button
                  onClick={desvincular}
                  className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-400 hover:text-red-300 transition-colors px-3 py-1.5 rounded-full border border-white/10 hover:border-red-500/40"
                >
                  <Unlink size={13} /> Desvincular
                </button>
              </SettingRow>
            </SettingsGroup>

            {/* Asistente encendido + estilo */}
            <SettingsGroup label="Asistente" divide>
              <SettingRow
                Icon={Zap}
                title="Asistente encendido"
                description={botOn
                  ? 'El bot responde y agenda solo a los clientes que escriben.'
                  : 'Apagado — nadie responde por ti (útil en feriados o cierres).'
                }
              >
                <IosToggle checked={botOn} onChange={(v) => patchCfg({ botEnabled: v })} />
              </SettingRow>
              {botOn && (
                <SettingRow
                  Icon={MessageCircle}
                  title="Estilo de conversación"
                  description={estiloChileno
                    ? 'Chileno cercano — modismos suaves con moderación.'
                    : 'Español neutro — claro y universal (recomendado).'
                  }
                >
                  <select
                    value={estiloChileno ? 'chileno' : 'neutro'}
                    onChange={(e) => patchCfg({ estiloChileno: e.target.value === 'chileno' })}
                    className="bg-white/[0.04] border border-white/10 rounded-full px-3 py-1.5 text-[13px] text-primary focus:outline-none focus:border-emerald-500 shrink-0"
                  >
                    <option value="neutro">Neutro</option>
                    <option value="chileno">Chileno</option>
                  </select>
                </SettingRow>
              )}
            </SettingsGroup>

            {/* Confirmaciones */}
            <SettingsGroup label="Confirmaciones de cita" divide>
              <SettingRow
                Icon={Clock}
                title="Confirmación previa"
                description={confirmOn
                  ? 'El bot pide al cliente confirmar antes de su cita.'
                  : 'Apagado — no se piden confirmaciones (útil para no molestar).'
                }
              >
                <IosToggle checked={confirmOn} onChange={(v) => patchCfg({ confirmacionesEnabled: v })} />
              </SettingRow>
              {confirmOn && (
                <SettingRow
                  Icon={Clock}
                  title="Ventana de aviso"
                  description="Cuántas horas antes se le pide confirmar."
                >
                  <select
                    value={ventana}
                    onChange={(e) => patchCfg({ recordatorio: { ...(cfg?.recordatorio || {}), ventanaHoras: Number(e.target.value) } })}
                    className="bg-white/[0.04] border border-white/10 rounded-full px-3 py-1.5 text-[13px] text-primary focus:outline-none focus:border-emerald-500 shrink-0"
                  >
                    <option value={12}>12 horas antes</option>
                    <option value={24}>24 horas antes</option>
                    <option value={48}>48 horas antes</option>
                  </select>
                </SettingRow>
              )}
            </SettingsGroup>

            {/* Callout: convivencia bot + humanos.
                Caso Kronnos 2026-07-21: los mensajes de bienvenida/ausencia
                de WhatsApp Business salen como fromMe → el anti-colisión los lee
                como "un humano tomó el chat" y silencia al bot 2h en cada
                conversación nueva. Regla operativa: automáticos nativos OFF. */}
            <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-5 space-y-3">
              <p className="text-[13px] font-semibold text-amber-300 flex items-center gap-2">
                <ShieldAlert size={15} /> Cómo convive el bot con tu equipo
              </p>
              <p className="text-[12.5px] text-amber-100/85 leading-relaxed">
                Si alguien de tu equipo responde un chat <strong>a mano desde el teléfono</strong>, el bot se calla <strong>2 horas en esa conversación</strong>. Cuando un humano toma el control, el bot no se mete. Pasadas las 2h (o si el cliente escribe en otro chat) vuelve a responder solo.
              </p>
              <p className="text-[12.5px] text-amber-100/85 leading-relaxed">
                ⚠ <strong>Apagá los mensajes automáticos de WhatsApp Business</strong> (bienvenida y ausencia): el sistema los detecta como si un humano hubiera respondido y silencia al bot en cada chat nuevo.
                En tu teléfono: <em>WhatsApp Business → Herramientas para la empresa → Mensaje de bienvenida / Mensaje de ausencia → desactivar</em>.
                El Asistente los reemplaza conversando y agendando de verdad.
              </p>
            </div>

            {/* Ayuda + políticas */}
            <SettingsGroup label="Ayuda" divide>
              <LinkRow Icon={Bot} title="¿Qué puede hacer el bot? — capacidades y límites"
                iconColor="text-violet-400"
                onClick={() => setShowCapacidades(true)} />
              <LinkRow Icon={ShieldCheck} title="Políticas de WhatsApp — riesgos y uso responsable"
                iconColor="text-emerald-400"
                onClick={() => setShowPoliticas(true)} />
            </SettingsGroup>
          </>
        )}
      </Section>

      {showPoliticas && <PoliticasModal onClose={() => setShowPoliticas(false)} />}
      {showCapacidades && <CapacidadesModal onClose={() => setShowCapacidades(false)} />}

      {/* ── Modal de escaneo QR ── */}
      {modal && (
        <div className="fixed inset-0 z-[9000] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl relative">
            <button onClick={() => setModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-primary" aria-label="Cerrar">
              <X size={18} />
            </button>

            {conectado ? (
              <div className="flex flex-col items-center text-center py-6">
                <CheckCircle2 size={64} className="text-emerald-400 mb-4 animate-[pulse_1s_ease-in-out]" />
                <h3 className="text-lg font-bold text-primary">¡Vinculado! 🎉</h3>
                <p className="text-sm text-slate-400 mt-1">Tu WhatsApp ya está conectado al Asistente.</p>
              </div>
            ) : (
              <>
                <h3 className="text-base font-semibold text-primary text-center mb-1 tracking-tight">Escanea con tu WhatsApp</h3>
                <p className="text-[12px] text-slate-400 text-center mb-4 leading-relaxed">
                  En tu celular: <strong className="text-slate-200">WhatsApp → Ajustes → Dispositivos vinculados → Vincular un dispositivo</strong>
                </p>
                <div className="rounded-2xl bg-white p-3 mx-auto w-fit">
                  {qr
                    ? <img src={qr} alt="Código QR de vinculación" className="w-56 h-56 object-contain" />
                    : <div className="w-56 h-56 flex items-center justify-center"><Loader2 size={28} className="animate-spin text-slate-400" /></div>}
                </div>
                {pairing && (
                  <p className="text-[11px] text-slate-500 text-center mt-3">
                    ¿No puedes escanear? Código: <span className="font-mono text-slate-300 tracking-widest">{pairing}</span>
                  </p>
                )}
                <p className="text-[11px] text-slate-500 text-center mt-3 flex items-center justify-center gap-1.5">
                  <Loader2 size={11} className="animate-spin" /> Esperando el escaneo… (el QR se refresca solo)
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
