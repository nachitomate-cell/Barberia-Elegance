import { useState, useEffect } from 'react';
import { getApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { resolveTenantId } from '../lib/tenantUtils';
import { useTenant } from '../contexts/TenantContext';
import { WaChatPreview, ClaudeBadge, LivePreviewHeader } from '../components/WaChatPreview';
import {
  QrCode, ShieldAlert, Loader2, CheckCircle2, Power, Clock,
  Smartphone, Unlink, Sparkles, X, Lock, MessageCircle, ExternalLink, Bot,
  ShieldCheck, FileText, ChevronRight,
} from 'lucide-react';

// Módulo premium "Asistente IA 24/7" — el bot responde y agenda solo sobre el
// número PROPIO del local (Evolution API, sesión/QR). Backend: functions/evolution/gateway.js.
//
// GATING (lo que cambió): la "llave" del módulo vive en _system/{tid}.waAsistente,
// que SOLO SynapTech puede escribir (reglas: _system write = esBootstrap). El
// cliente NO lo auto-activa: si no está habilitado, solo ve la tarjeta bloqueada
// con "Solicitar activación". Fallback: si ya está conectado, se respeta (no se
// bloquea a quien ya lo tenía andando).

const WA_SYNAPTECH = '56983568212';

const TYC_TEXT =
  'Comprendo que al vincular mi línea particular a un asistente automatizado de terceros, ' +
  'asumo las políticas de uso responsable de WhatsApp y de la plataforma.';

/* ── Políticas de WhatsApp (v1.0 · julio 2026) ─────────────────────
   Documento de riesgos y uso responsable del módulo. Protege a ambas
   partes: el local sabe EXACTAMENTE qué acepta al vincular, y SynapTech
   deja constancia de que informó los riesgos del canal (que no controla).
   La aceptación queda registrada al vincular (tycAceptado/En/Por). */
const POLITICAS_WHATSAPP = [
  {
    t: '1 · Qué es este servicio',
    c: 'El Asistente funciona vinculando tu número de WhatsApp como "dispositivo vinculado" (igual que WhatsApp Web), no mediante la API oficial de Meta. Tu teléfono y tu app siguen funcionando normal y mantienes el control total de tus conversaciones.',
  },
  {
    t: '2 · Riesgo del canal (importante)',
    c: 'WhatsApp/Meta puede restringir o suspender números que, según sus sistemas automáticos, infrinjan sus condiciones. Ese riesgo existe con cualquier herramienta de automatización no oficial, SynapTech no lo controla ni puede garantizar que no ocurra, y al vincular tu número lo aceptas expresamente. Recomendamos usar un número con historial (nunca un chip recién comprado) y tener un chip de respaldo.',
  },
  {
    t: '3 · Uso responsable (lo que el sistema permite)',
    c: 'El Asistente solo responde a clientes que te escriben primero y envía confirmaciones de citas reales de tu propia agenda. Está prohibido usar el canal para spam, marketing masivo, mensajes a bases de datos compradas o contenido ilícito. SynapTech puede suspender el módulo ante un uso indebido.',
  },
  {
    t: '4 · Protecciones automáticas',
    c: 'Para cuidar tu número, el sistema impone ritmo humano de escritura, topes diarios de envío según la antigüedad de la vinculación, silencio automático del bot cuando un humano toma la conversación, y respeto inmediato a quien pide no recibir mensajes. Estos límites no son configurables: son la protección.',
  },
  {
    t: '5 · Datos personales (Ley 21.719)',
    c: 'Los datos de tus clientes (nombres, teléfonos, mensajes, citas) son tuyos: tu local es el responsable del tratamiento y SynapTech actúa como encargado, procesándolos únicamente para operar el servicio (responder, agendar, confirmar). La memoria conversacional es acotada y no se venden ni comparten datos con terceros.',
  },
  {
    t: '6 · Responsabilidad',
    c: 'SynapTech responde por el funcionamiento de su software. No responde por decisiones de Meta/WhatsApp sobre tu número (restricciones, suspensiones, cambios de plataforma), por indisponibilidad del canal, por la entrega efectiva de cada mensaje, ni por usos del canal contrarios a estas políticas. Tus datos de negocio (citas, clientes, historial) viven en la plataforma, no en WhatsApp: una suspensión del número no los afecta.',
  },
  {
    t: '7 · Tu control',
    c: 'Puedes apagar el Asistente, apagar las confirmaciones o desvincular tu número cuando quieras desde este mismo panel, con efecto inmediato. Desvincular devuelve el control 100% manual a tu teléfono.',
  },
  {
    t: '8 · Continuidad del servicio',
    c: 'Si WhatsApp modifica o bloquea el mecanismo de dispositivos vinculados, el servicio podrá migrar a otro canal o suspenderse mientras exista una alternativa viable, sin que ello constituya incumplimiento de SynapTech.',
  },
  {
    t: '9 · Aceptación',
    c: 'Al marcar la casilla y vincular tu número, el administrador del local declara haber leído y aceptado estas políticas. Queda registro de la cuenta, fecha y hora de aceptación. Versión 1.0 · julio 2026 · Dudas: WhatsApp +56 9 8356 8212.',
  },
];

function PoliticasModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-[9100] flex items-center justify-center px-4 py-8 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-3xl border border-slate-700/60 bg-[#0e0e12] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <ShieldCheck size={18} className="text-emerald-400" />
            <div>
              <h3 className="text-base font-bold text-primary leading-tight">Políticas de WhatsApp</h3>
              <p className="text-[11px] text-slate-500">Riesgos y uso responsable del Asistente · v1.0</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-primary shrink-0" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-4 space-y-4">
          {POLITICAS_WHATSAPP.map((s) => (
            <div key={s.t}>
              <p className="text-xs font-bold text-emerald-300 mb-1">{s.t}</p>
              <p className="text-xs text-slate-300 leading-relaxed">{s.c}</p>
            </div>
          ))}
        </div>
        <div className="px-6 py-3.5 border-t border-slate-800 shrink-0">
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold py-2.5 transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

const card = 'bg-slate-800/30 border border-slate-700/50 rounded-2xl';

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

// Cabecera común del módulo (ícono + título + badge de estado).
function ModuleHeader({ statusBadge }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div className="flex items-center gap-2.5 min-w-0">
        <Sparkles size={17} className="text-violet-400 shrink-0" />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-bold text-primary leading-tight">Asistente IA 24/7</h2>
            <span className="bg-violet-500/10 text-violet-300 border border-violet-500/30 rounded-full text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider">Premium</span>
          </div>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-md">
            El bot responde y agenda solo en <strong className="text-slate-300">tu propio WhatsApp</strong> — sin perder tu app ni tu número.
          </p>
        </div>
      </div>
      {statusBadge}
    </div>
  );
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

  /* ── Cargando el estado del entitlement ── */
  if (sys === null || cfg === null) {
    return (
      <div className={`${card} p-6 flex items-center justify-center`}>
        <Loader2 size={20} className="animate-spin text-slate-500" />
      </div>
    );
  }

  /* ══ BLOQUEADO — no habilitado por SynapTech ══ */
  if (!habilitado) {
    return (
      <div className={`${card} p-6 relative overflow-hidden`}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(70% 60% at 100% 0%, rgba(139,92,246,0.08), transparent 70%)' }} />
        <div className="relative">
          <ModuleHeader
            statusBadge={
              <span className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 bg-slate-700/50 border border-slate-600/60 rounded-full px-2.5 py-1">
                <Lock size={12} /> Bajo activación
              </span>
            }
          />

          <div className="grid lg:grid-cols-[1fr_260px] gap-5 items-start">
            {/* Izquierda: beneficios + Claude + CTA */}
            <div className="order-2 lg:order-1 space-y-3.5">
              <div className="space-y-2">
                {[
                  { Icon: Bot,      t: 'Responde solo',  d: 'Precios, horarios y disponibilidad — al instante, 24/7.' },
                  { Icon: Clock,    t: 'Agenda por ti',  d: 'El cliente pide hora y el bot la reserva en tu agenda.' },
                  { Icon: Sparkles, t: 'Anti no-show',   d: 'Confirma las citas para reducir las inasistencias.' },
                ].map((f, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="p-1.5 rounded-lg bg-violet-500/10 border border-violet-500/25 shrink-0">
                      <f.Icon size={14} className="text-violet-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-primary leading-tight">{f.t}</p>
                      <p className="text-[11px] text-slate-400 leading-snug">{f.d}</p>
                    </div>
                  </div>
                ))}
              </div>

              <ClaudeBadge />

              <div>
                <a
                  href={solicitarUrl}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 bg-violet-600 hover:bg-violet-500 text-primary text-sm font-bold px-5 py-3 rounded-xl transition-colors shadow-lg shadow-violet-900/40"
                >
                  <MessageCircle size={16} /> Solicitar activación <ExternalLink size={13} />
                </a>
                <p className="text-[11px] text-slate-500 mt-2.5 leading-relaxed">
                  Módulo premium que activa el equipo de SynapTech por ti. Toca el botón y coordinamos la puesta en marcha sobre tu número.
                </p>
              </div>
            </div>

            {/* Derecha: vista previa EN VIVO del chat */}
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
        </div>
      </div>
    );
  }

  /* ══ HABILITADO — módulo operativo ══ */
  return (
    <div className={`${card} p-6 relative overflow-hidden`}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(70% 60% at 100% 0%, rgba(139,92,246,0.06), transparent 70%)' }} />
      <div className="relative space-y-4">

        <ModuleHeader
          statusBadge={
            isConnected ? (
              <span className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 rounded-full px-2.5 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Conectado
              </span>
            ) : (
              <span className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/25 rounded-full px-2.5 py-1">
                Listo para vincular
              </span>
            )
          }
        />

        <ClaudeBadge />

        {err && (
          <div role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300">{err}</div>
        )}

        {!isConnected ? (
          /* ── No vinculado: T&C + botón ── */
          <div className="rounded-2xl border border-slate-700/60 bg-slate-900/40 p-5 space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-3.5">
              <ShieldAlert size={18} className="text-amber-400 shrink-0 mt-0.5" />
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={tyc}
                  onChange={(e) => setTyc(e.target.checked)}
                  className="mt-0.5 accent-amber-500 h-4 w-4 shrink-0"
                />
                <span className="text-xs text-amber-200/90 leading-relaxed">{TYC_TEXT}</span>
              </label>
            </div>

            <button
              type="button"
              onClick={() => setShowPoliticas(true)}
              className="w-full flex items-center justify-between gap-2 rounded-xl border border-slate-700/60 bg-slate-900/60 px-3.5 py-2.5 text-xs font-semibold text-slate-300 hover:border-emerald-500/40 hover:text-emerald-300 transition-colors"
            >
              <span className="flex items-center gap-2"><FileText size={14} /> Políticas de WhatsApp — riesgos y uso responsable</span>
              <ChevronRight size={14} className="shrink-0" />
            </button>

            <button
              type="button"
              onClick={vincular}
              disabled={!tyc || vinculando}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] disabled:opacity-40 disabled:cursor-not-allowed text-ink-950 font-bold py-3 transition-all"
            >
              {vinculando ? <Loader2 size={16} className="animate-spin" /> : <QrCode size={16} />}
              {vinculando ? 'Generando QR…' : 'Vincular WhatsApp'}
            </button>
            <p className="text-[11px] text-slate-500 text-center">
              Vas a escanear un QR desde tu celular (WhatsApp → Dispositivos vinculados). Tu número sigue funcionando normal.
            </p>
          </div>
        ) : (
          /* ── Vinculado: estado + switches ── */
          <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-4 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/25">
                <Smartphone size={18} className="text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-primary flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Conectado
                </p>
                <p className="text-xs text-slate-400 truncate">{numero ? `+${numero}` : 'Tu número está vinculado'}</p>
              </div>
              <button onClick={desvincular} className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-red-300 transition-colors">
                <Unlink size={14} /> Desvincular
              </button>
            </div>

            {/* Switch maestro del bot + estilo de conversación */}
            <div className="rounded-2xl border border-slate-700/60 bg-slate-900/40 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Power size={18} className={botOn ? 'text-emerald-400' : 'text-slate-500'} />
                  <div>
                    <p className="text-sm font-semibold text-primary">Asistente encendido</p>
                    <p className="text-xs text-slate-400">{botOn ? 'Responde y agenda solo' : 'Apagado — nadie responde por ti (útil en feriados)'}</p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={botOn}
                  onClick={() => patchCfg({ botEnabled: !botOn })}
                  className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${botOn ? 'bg-emerald-500' : 'bg-slate-600'}`}
                >
                  <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${botOn ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
              {botOn && (
                <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-700/40">
                  <div>
                    <p className="text-xs text-slate-400">Estilo de conversación</p>
                    <p className="text-[11px] text-slate-500">
                      {estiloChileno
                        ? 'Chileno cercano — modismos suaves con moderación'
                        : 'Español neutro — claro y universal (recomendado)'}
                    </p>
                  </div>
                  <select
                    value={estiloChileno ? 'chileno' : 'neutro'}
                    onChange={(e) => patchCfg({ estiloChileno: e.target.value === 'chileno' })}
                    className="bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-primary focus:outline-none focus:border-emerald-500 shrink-0"
                  >
                    <option value="neutro">Neutro</option>
                    <option value="chileno">Chileno</option>
                  </select>
                </div>
              )}
            </div>

            {/* Confirmaciones anti-no-show */}
            <div className="rounded-2xl border border-slate-700/60 bg-slate-900/40 p-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Clock size={18} className={confirmOn ? 'text-emerald-400' : 'text-slate-500'} />
                  <div>
                    <p className="text-sm font-semibold text-primary">Confirmación de cita</p>
                    <p className="text-xs text-slate-400">
                      {confirmOn
                        ? 'Le pedimos al cliente confirmar por WhatsApp antes de su hora'
                        : 'Apagado — no se piden confirmaciones (útil para no molestar)'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={confirmOn}
                  onClick={() => patchCfg({ confirmacionesEnabled: !confirmOn })}
                  className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${confirmOn ? 'bg-emerald-500' : 'bg-slate-600'}`}
                >
                  <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${confirmOn ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
              {confirmOn && (
                <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-700/40">
                  <p className="text-xs text-slate-400">¿Cuántas horas antes se le pide confirmar?</p>
                  <select
                    value={ventana}
                    onChange={(e) => patchCfg({ recordatorio: { ...(cfg?.recordatorio || {}), ventanaHoras: Number(e.target.value) } })}
                    className="bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-primary focus:outline-none focus:border-emerald-500"
                  >
                    <option value={12}>12 horas antes</option>
                    <option value={24}>24 horas antes</option>
                    <option value={48}>48 horas antes</option>
                  </select>
                </div>
              )}
            </div>

            {/* ── Aviso explícito: convivencia con humanos + automáticos nativos ──
                Caso real (Kronnos, demo 2026-07-21): los mensajes de bienvenida/
                ausencia de la app WhatsApp Business salen del teléfono como
                fromMe → el anti-colisión los lee como "un humano tomó el chat"
                y silencia al bot 2h en CADA conversación nueva. La regla
                operativa: automáticos nativos APAGADOS, humanos cuando quieran. */}
            <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-4 space-y-2.5">
              <p className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <ShieldAlert size={14} /> Cómo convive el bot con tu equipo
              </p>
              <p className="text-xs text-amber-100/80 leading-relaxed">
                Si tú o alguien de tu equipo responde un chat <strong>a mano desde el teléfono</strong>,
                el bot se calla <strong>2 horas en esa conversación</strong>. Es a propósito: cuando un
                humano toma el control, el bot no se mete. Pasadas las 2 horas (o si el cliente
                escribe en otro chat) vuelve a responder solo.
              </p>
              <p className="text-xs text-amber-100/80 leading-relaxed">
                ⚠ <strong>Apaga los mensajes automáticos de WhatsApp Business</strong> (el de
                bienvenida y el de ausencia): el sistema los detecta como si un humano hubiera
                respondido y silencia al bot en cada chat nuevo. En tu teléfono:
                <strong> WhatsApp Business → Herramientas para la empresa → Mensaje de bienvenida / Mensaje de ausencia → desactivar</strong>.
                El Asistente los reemplaza conversando y agendando de verdad.
              </p>
            </div>

            {/* Políticas siempre a un toque, también con el módulo andando */}
            <button
              type="button"
              onClick={() => setShowPoliticas(true)}
              className="w-full flex items-center justify-between gap-2 rounded-xl border border-slate-700/60 bg-slate-900/40 px-3.5 py-2.5 text-xs font-semibold text-slate-400 hover:border-emerald-500/40 hover:text-emerald-300 transition-colors"
            >
              <span className="flex items-center gap-2"><ShieldCheck size={14} /> Políticas de WhatsApp — riesgos y uso responsable</span>
              <ChevronRight size={14} className="shrink-0" />
            </button>
          </div>
        )}

      {showPoliticas && <PoliticasModal onClose={() => setShowPoliticas(false)} />}
      </div>

      {/* ── Modal de escaneo QR ── */}
      {modal && (
        <div className="fixed inset-0 z-[9000] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-slate-700/60 bg-[#0e0e12] p-6 shadow-2xl relative">
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
                <h3 className="text-base font-bold text-primary text-center mb-1">Escanea con tu WhatsApp</h3>
                <p className="text-xs text-slate-400 text-center mb-4 leading-relaxed">
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
