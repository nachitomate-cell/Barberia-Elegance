import { useState } from 'react';
import {
  Zap, Send, CheckCircle2, Copy, Check, Activity, ArrowRight, Plug,
  RefreshCw, Info, Radio, Calendar, ShoppingBag, UserPlus, Eye, EyeOff,
} from 'lucide-react';
import { useTenant } from '../contexts/TenantContext';

/* ────────────────────────────────────────────────────────────────
 * Integraciones · Conversión & CRM  (MOCKUP / borrador)
 * ---------------------------------------------------------------
 * Vista de demostración: muestra cómo se verá y funcionará la conexión
 * de la agenda con Meta Conversions API (CAPI) y GoHighLevel (CRM).
 * NO está conectada a ningún backend — todos los estados son locales
 * y el "Probar evento" simula el flujo sin salir a la red.
 * Sirve para: (a) enseñársela a socios de marketing (ej. Benjamín),
 * (b) especificar cómo debe comportarse cuando se implemente de verdad.
 * ──────────────────────────────────────────────────────────────── */

// ── Logos de marca (SVG inline, colores oficiales) ──────────────
function MetaLogo({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 24" aria-hidden>
      <path fill="#0866FF" d="M6.9 0C3.1 0 0 3.9 0 9.6c0 5 2.4 8.4 5.9 8.4 2 0 3.4-.9 5-3.6.5-.8 1-1.8 1.7-3.1l1.2-2.3c.2.3.4.7.6 1.1l1.9 3.4c1.7 3 3.3 4.5 5.7 4.5 3.5 0 5.6-3.4 5.6-8.6C33.6 3.8 30.5 0 26.7 0c-2 0-3.6 1.1-5.3 3.9-.6 1-1.3 2.2-2 3.6-1.9-3.6-2.9-5.2-3.9-6.1C14.3.5 12.9 0 11.3 0H6.9zm-.2 3.4h.2c1 0 1.8.4 2.9 1.9.7 1 1.5 2.4 2.6 4.5l-1.2 2.4c-1.5 2.9-2.2 3.6-3.4 3.6-1.4 0-2.4-1.9-2.4-5 0-4.5 1.5-7.4 1.3-7.4zm19.9 0c1.6 0 2.6 2.5 2.6 5.2 0 3.4-1 5.1-2.4 5.1-1.1 0-1.8-.8-3.3-3.6l-1.5-2.9c1.7-3.3 2.8-3.8 4.6-3.8z"/>
    </svg>
  );
}
function GhlLogo({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="12" fill="#161C2C" />
      <path fill="#3BC4C4" d="M12 4l6.9 4v8L12 20l-6.9-4V8L12 4zm0 2.6L7.4 9.3v5.4L12 17.4l4.6-2.7V9.3L12 6.6z"/>
      <circle cx="12" cy="12" r="2.1" fill="#3BC4C4" />
    </svg>
  );
}

// ── Toggle reutilizable ─────────────────────────────────────────
function Toggle({ on, onChange, tint = 'emerald' }) {
  const tintCls = tint === 'blue' ? 'bg-blue-500' : tint === 'teal' ? 'bg-teal-500' : 'bg-emerald-500';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`relative w-11 h-6 rounded-full shrink-0 transition-colors duration-200 ${on ? tintCls : 'bg-slate-700'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${on ? 'translate-x-5' : ''}`} />
    </button>
  );
}

// ── Campo de texto etiquetado ───────────────────────────────────
function Field({ label, value, onChange, placeholder, hint, secret = false, mono = false }) {
  const [show, setShow] = useState(false);
  return (
    <label className="block">
      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
      <div className="relative mt-1">
        <input
          type={secret && !show ? 'password' : 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className={`w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-slate-600 focus:ring-1 focus:ring-slate-600 transition-colors ${mono ? 'font-mono text-[13px]' : ''} ${secret ? 'pr-10' : ''}`}
        />
        {secret && (
          <button
            type="button"
            onClick={() => setShow(v => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
            aria-label={show ? 'Ocultar' : 'Mostrar'}
          >
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
      {hint && <span className="text-[11px] text-slate-500 mt-1 block leading-snug">{hint}</span>}
    </label>
  );
}

export default function Integraciones() {
  const tenant = useTenant();

  const [meta, setMeta] = useState({ enabled: false, pixelId: '', token: '', evento: 'Schedule' });
  const [ghl,  setGhl]  = useState({ enabled: false, locationId: '', apiKey: '' });
  const [testing, setTesting]       = useState(false);
  const [testDone, setTestDone]     = useState(false);
  const [copied, setCopied]         = useState(false);

  // URL de webhook que la agenda expondría (solo display en el mockup).
  const webhookUrl = `https://api.synaptechspa.cl/hooks/${tenant.id || 'tu-local'}/reserva`;

  const eventos = [
    { id: 'Lead',     label: 'Lead',            desc: 'Al iniciar una reserva',      Icon: UserPlus },
    { id: 'Schedule', label: 'Reserva',         desc: 'Al confirmar la hora',        Icon: Calendar },
    { id: 'Purchase', label: 'Cita completada', desc: 'Al asistir y pagar',          Icon: ShoppingBag },
  ];

  // Payload de ejemplo (formato Meta CAPI) — solo ilustrativo.
  const payload = {
    event_name: meta.evento,
    event_time: 1721145600,
    action_source: 'website',
    event_source_url: `https://${tenant.id || 'tu-local'}.synaptechspa.cl`,
    user_data: { ph: '‹telefono hasheado›', em: '‹email hasheado›' },
    custom_data: { servicio: 'Corte + Barba', value: 12000, currency: 'CLP' },
  };

  function probar() {
    setTesting(true);
    setTestDone(false);
    // Simulación local — NO sale a la red. Recrea el "envío" con un pequeño delay.
    setTimeout(() => { setTesting(false); setTestDone(true); }, 1300);
  }

  function copiarWebhook() {
    try {
      navigator.clipboard?.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* noop */ }
  }

  return (
    <div data-view="integraciones" className="max-w-4xl mx-auto p-1 md:p-2 space-y-6 pb-16">

      {/* ── Aviso de borrador ─────────────────────────────────── */}
      <div className="flex items-start gap-2.5 bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3">
        <Info size={16} className="text-amber-400 shrink-0 mt-0.5" />
        <p className="text-[12.5px] text-amber-200/90 leading-relaxed">
          <b className="text-amber-300">Vista previa (borrador).</b> Esta pantalla todavía no está conectada:
          muestra cómo se verá y funcionará la conexión de la agenda con las plataformas de marketing.
          El botón <i>Probar evento</i> simula el flujo sin enviar nada real.
        </p>
      </div>

      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/25 shrink-0">
          <Plug size={22} className="text-blue-400" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl md:text-2xl font-bold text-white leading-tight">Integraciones · Conversión &amp; CRM</h1>
          <p className="text-sm text-slate-400 leading-relaxed mt-1 max-w-2xl">
            Cada vez que un cliente reserva, tu agenda le puede avisar a <b className="text-slate-200">Meta</b> (para
            que tus anuncios optimicen sobre reservas reales) y a tu <b className="text-slate-200">GoHighLevel</b> (para
            que tu CRM siga el seguimiento). Te enchufas a tu máquina de marketing, no la reemplazas.
          </p>
        </div>
      </header>

      {/* ── Flujo ──────────────────────────────────────────────── */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-center gap-2 md:gap-3 flex-wrap text-center">
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
              <Calendar size={20} className="text-slate-300" />
            </div>
            <span className="text-[11px] font-semibold text-slate-400">Cliente<br />reserva</span>
          </div>
          <ArrowRight size={18} className="text-slate-600 shrink-0" />
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <Radio size={20} className="text-emerald-400" />
            </div>
            <span className="text-[11px] font-semibold text-slate-400">Tu agenda<br />lo registra</span>
          </div>
          <ArrowRight size={18} className="text-slate-600 shrink-0" />
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
                <MetaLogo size={22} />
              </div>
              <span className="text-[11px] font-semibold text-slate-400">Meta<br />(CAPI)</span>
            </div>
            <span className="text-slate-600 font-bold px-0.5">+</span>
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center">
                <GhlLogo size={22} />
              </div>
              <span className="text-[11px] font-semibold text-slate-400">GoHigh<br />Level</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Meta Conversions API ───────────────────────────────── */}
      <section className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <MetaLogo size={26} />
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-white">Meta · Conversions API (CAPI)</h2>
              <p className="text-[11.5px] text-slate-500">Envía cada reserva a Meta para atribución y optimización de anuncios.</p>
            </div>
          </div>
          <Toggle on={meta.enabled} onChange={(v) => setMeta(m => ({ ...m, enabled: v }))} tint="blue" />
        </div>

        <div className={`px-5 py-5 space-y-4 transition-opacity ${meta.enabled ? 'opacity-100' : 'opacity-45 pointer-events-none'}`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Pixel / Dataset ID"
              value={meta.pixelId}
              onChange={(v) => setMeta(m => ({ ...m, pixelId: v }))}
              placeholder="1234567890123456"
              hint="Lo genera Benjamín en Meta Business Manager."
              mono
            />
            <Field
              label="Access Token (CAPI)"
              value={meta.token}
              onChange={(v) => setMeta(m => ({ ...m, token: v }))}
              placeholder="EAAG…"
              hint="Token de conversión del sistema. Se guarda cifrado."
              secret
              mono
            />
          </div>

          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Evento que dispara la conversión</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-2">
              {eventos.map(ev => {
                const active = meta.evento === ev.id;
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => setMeta(m => ({ ...m, evento: ev.id }))}
                    className={`flex items-start gap-2.5 text-left px-3 py-2.5 rounded-xl border transition-all ${
                      active ? 'bg-blue-500/10 border-blue-500/50 ring-1 ring-blue-500/30' : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <ev.Icon size={16} className={active ? 'text-blue-400 mt-0.5 shrink-0' : 'text-slate-500 mt-0.5 shrink-0'} />
                    <div className="min-w-0">
                      <p className={`text-[13px] font-bold leading-tight ${active ? 'text-white' : 'text-slate-300'}`}>{ev.label}</p>
                      <p className="text-[11px] text-slate-500 leading-tight mt-0.5">{ev.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── GoHighLevel ────────────────────────────────────────── */}
      <section className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <GhlLogo size={26} />
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-white">GoHighLevel · CRM</h2>
              <p className="text-[11.5px] text-slate-500">Sincroniza cada reserva como contacto/oportunidad en tu CRM.</p>
            </div>
          </div>
          <Toggle on={ghl.enabled} onChange={(v) => setGhl(g => ({ ...g, enabled: v }))} tint="teal" />
        </div>

        <div className={`px-5 py-5 space-y-4 transition-opacity ${ghl.enabled ? 'opacity-100' : 'opacity-45 pointer-events-none'}`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Location ID"
              value={ghl.locationId}
              onChange={(v) => setGhl(g => ({ ...g, locationId: v }))}
              placeholder="ve9EPM428h8vShlRW1KT"
              hint="El ID de la sub-cuenta del cliente en GoHighLevel."
              mono
            />
            <Field
              label="API Key"
              value={ghl.apiKey}
              onChange={(v) => setGhl(g => ({ ...g, apiKey: v }))}
              placeholder="ghl_…"
              hint="Clave privada de la integración. Se guarda cifrada."
              secret
              mono
            />
          </div>

          {/* Webhook inverso — por si prefieren que GHL "tire" el evento */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Webhook de tu agenda</span>
              <button
                type="button"
                onClick={copiarWebhook}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-white transition-colors"
              >
                {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>
            <code className="text-[12.5px] text-teal-300 font-mono break-all">{webhookUrl}</code>
            <p className="text-[11px] text-slate-500 mt-1.5 leading-snug">
              Pega esta URL en un <i>Inbound Webhook</i> de GoHighLevel si prefieres que sea tu CRM el que reciba el evento de reserva.
            </p>
          </div>
        </div>
      </section>

      {/* ── Probar evento (simulación local) ───────────────────── */}
      <section className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Zap size={15} className="text-amber-400" />
            <h3 className="text-sm font-bold text-white">Probar evento</h3>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-800 px-2 py-0.5 rounded-full">Simulación</span>
          </div>
          <button
            type="button"
            onClick={probar}
            disabled={testing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 disabled:opacity-60 text-white text-sm font-bold transition-all active:scale-[0.98]"
          >
            {testing ? <RefreshCw size={15} className="animate-spin" /> : <Send size={15} />}
            {testing ? 'Enviando…' : 'Simular una reserva'}
          </button>
        </div>

        <p className="text-[12px] text-slate-500 mt-2">
          Recrea una reserva de prueba (Corte + Barba · $12.000) y muestra qué se enviaría a cada plataforma.
        </p>

        {/* Resultado */}
        {(testing || testDone) && (
          <div className="mt-4 space-y-2.5">
            <div className="flex items-center gap-2.5 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5">
              {testDone
                ? <CheckCircle2 size={16} className="text-blue-400 shrink-0" />
                : <RefreshCw size={16} className="text-slate-500 shrink-0 animate-spin" />}
              <MetaLogo size={16} />
              <span className="text-[13px] text-slate-300 flex-1">
                Meta CAPI — evento <b className="text-white">{meta.evento}</b>
              </span>
              <span className={`text-[11px] font-bold ${testDone ? 'text-blue-400' : 'text-slate-500'}`}>
                {testDone ? 'Recibido ✓' : 'enviando…'}
              </span>
            </div>
            <div className="flex items-center gap-2.5 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5">
              {testDone
                ? <CheckCircle2 size={16} className="text-teal-400 shrink-0" />
                : <RefreshCw size={16} className="text-slate-500 shrink-0 animate-spin" />}
              <GhlLogo size={16} />
              <span className="text-[13px] text-slate-300 flex-1">
                GoHighLevel — contacto + oportunidad
              </span>
              <span className={`text-[11px] font-bold ${testDone ? 'text-teal-400' : 'text-slate-500'}`}>
                {testDone ? 'Sincronizado ✓' : 'enviando…'}
              </span>
            </div>
          </div>
        )}

        {/* Payload de ejemplo */}
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-1.5">
            <Activity size={13} className="text-slate-500" />
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Datos que se enviarían</span>
          </div>
          <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 overflow-x-auto text-[12px] leading-relaxed font-mono text-slate-400">
{JSON.stringify(payload, null, 2)}
          </pre>
        </div>
      </section>

    </div>
  );
}
