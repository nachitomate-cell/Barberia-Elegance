// ChatbotConfig.jsx — editor visual del bot del chat público.
// El bot vive en /chat (chat.html) y responde client-side leyendo este config
// desde tenants/{tid}/chatbot/config (o chatbot/config para elegance).

import { useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import {
  Bot, Save, Plus, Trash2, MessageCircle, Sparkles, AlertCircle,
  ToggleLeft, ToggleRight, GripVertical, Crown, ChevronDown, Loader2,
  Megaphone, Bell, Brain, Zap, Check, ArrowRight,
} from 'lucide-react';
import { db } from '../lib/firebase';
import { resolveTenantId } from '../lib/tenantUtils';
import { useTenant } from '../contexts/TenantContext';

const ACCENT_HEX = {
  emerald: '#10b981', amber: '#f59e0b', cyan: '#06b6d4',
  red: '#ef4444', orange: '#f97316', pink: '#ec4899',
  purple: '#a855f7', lime: '#84cc16', zinc: '#a1a1aa', slate: '#94a3b8',
};
function useAccent() {
  const tenant = useTenant();
  const hex = tenant.brand?.hex || ACCENT_HEX[tenant.accent] || '#D4AF37';
  return hex;
}

// Path del avatar de Syna respetando la base de Vite ('/gestion-interna/').
// Igual a Chat.jsx; mantiene una sola fuente de verdad para la imagen.
const SYNA_AVATAR = `${import.meta.env.BASE_URL || '/'}syna.png`;

function configDocRef() {
  const tid = resolveTenantId();
  return tid === 'elegance'
    ? doc(db, 'chatbot', 'config')
    : doc(db, `tenants/${tid}/chatbot/config`);
}

function defaultConfig(tenant) {
  return {
    enabled: true,
    // Placeholders {nombre} y {local} se interpolan en runtime con el
    // primer nombre del cliente (welcome modal) y el nombre del local.
    greeting: 'Hola {nombre}! 👋 Soy el asistente de {local}. Tocá una opción o escribime tu duda:',
    options: [
      { id: 'reservar',  label: '📅 Quiero reservar', response: 'Perfecto, agendá tu hora acá 👇', action: 'link-booking',    escalate: false },
      { id: 'horarios',  label: '🕒 Horarios',         response: 'Atendemos Lun-Sáb 10:30 a 19:00.', action: 'reply',           escalate: false },
      { id: 'ubicacion', label: '📍 Cómo llegar',      response: 'Estamos en [tu dirección].',       action: 'reply',           escalate: false },
      { id: 'precios',   label: '💰 Precios',          response: 'Estos son nuestros precios actuales:', action: 'dynamic-prices', escalate: false },
      { id: 'humano',    label: '💬 Hablar con alguien', response: 'Listo, en cuanto estemos libres te respondemos 👍', action: 'escalate', escalate: true  },
    ],
    keywords: [
      { words: 'horario, abren, abierto, cierran',   optionId: 'horarios'  },
      { words: 'donde, ubicacion, direccion, llegar', optionId: 'ubicacion' },
      { words: 'reservar, agendar, cita, turno',     optionId: 'reservar'  },
      { words: 'precio, cuesta, cuanto, valor',      optionId: 'precios'   },
    ],
    fallback: 'Anoté tu mensaje, un barbero te responde apenas pueda 👍',
  };
}

// Helpers: en Firestore keywords[].words es array de strings; en la UI lo
// editamos como string CSV para que sea fácil tipear.
function fromFirestoreKeywords(kws) {
  return (kws || []).map(k => ({
    words: Array.isArray(k.words) ? k.words.join(', ') : (k.words || ''),
    optionId: k.optionId || '',
  }));
}
function toFirestoreKeywords(kws) {
  return (kws || []).map(k => ({
    words: String(k.words || '').split(',').map(s => s.trim()).filter(Boolean),
    optionId: k.optionId || '',
  }));
}

export default function ChatbotConfig() {
  const tenant = useTenant();
  const accent = useAccent();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [error, setError] = useState(null);

  // Live load del config (snapshot)
  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(
      configDocRef(),
      snap => {
        if (snap.exists()) {
          const d = snap.data();
          setConfig({
            enabled:  d.enabled !== false,
            greeting: d.greeting || defaultConfig(tenant).greeting,
            options:  d.options  || defaultConfig(tenant).options,
            keywords: fromFirestoreKeywords(d.keywords || defaultConfig(tenant).keywords),
            fallback: d.fallback || defaultConfig(tenant).fallback,
          });
        } else {
          // Sin config previo → cargar defaults para editar
          const def = defaultConfig(tenant);
          setConfig({ ...def, keywords: fromFirestoreKeywords(def.keywords) });
        }
        setLoading(false);
      },
      err => {
        console.warn('[chatbot] load failed:', err);
        const def = defaultConfig(tenant);
        setConfig({ ...def, keywords: fromFirestoreKeywords(def.keywords) });
        setLoading(false);
      },
    );
    return unsub;
  }, [tenant.id]);

  // Mapas memo para validaciones
  const optionIds = useMemo(() => new Set((config?.options || []).map(o => o.id)), [config]);

  const save = async () => {
    if (!config) return;
    setSaving(true);
    setError(null);
    try {
      await setDoc(configDocRef(), {
        enabled:  config.enabled,
        greeting: config.greeting,
        options:  config.options,
        keywords: toFirestoreKeywords(config.keywords),
        fallback: config.fallback,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(null), 3000);
    } catch (err) {
      console.error('[chatbot] save failed:', err);
      setError(err?.message || 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  };

  // Mutaciones
  const updateOption = (idx, patch) => {
    const next = [...config.options];
    next[idx] = { ...next[idx], ...patch };
    setConfig(c => ({ ...c, options: next }));
  };
  const addOption = () => {
    const id = 'opt_' + Math.random().toString(36).slice(2, 7);
    setConfig(c => ({
      ...c,
      options: [...c.options, { id, label: 'Nueva opción', response: '', escalate: false }],
    }));
  };
  const removeOption = (idx) => {
    setConfig(c => ({ ...c, options: c.options.filter((_, i) => i !== idx) }));
  };

  const updateKeyword = (idx, patch) => {
    const next = [...config.keywords];
    next[idx] = { ...next[idx], ...patch };
    setConfig(c => ({ ...c, keywords: next }));
  };
  const addKeyword = () => {
    setConfig(c => ({ ...c, keywords: [...c.keywords, { words: '', optionId: '' }] }));
  };
  const removeKeyword = (idx) => {
    setConfig(c => ({ ...c, keywords: c.keywords.filter((_, i) => i !== idx) }));
  };

  if (loading || !config) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 gap-2">
        <Loader2 size={18} className="animate-spin" /> Cargando configuración…
      </div>
    );
  }

  return (
    <div data-view="chatbot" className="mx-auto max-w-4xl space-y-5 sm:space-y-6 p-1 sm:p-2">

      {/* ── Hero ── */}
      <header className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6">
        <div className="flex flex-wrap items-start gap-3 sm:gap-4">
          {/* Avatar de Syna en el hero: ring del accent del tenant + halo sutil
              detrás para reforzar la identidad visual del bot. */}
          <div className="relative shrink-0">
            <span
              aria-hidden
              className="absolute inset-0 rounded-2xl blur-md opacity-60"
              style={{ background: `${accent}33` }}
            />
            <img
              src={SYNA_AVATAR}
              alt="Syna"
              className="relative h-14 w-14 rounded-2xl object-cover ring-2"
              style={{ borderColor: accent, '--tw-ring-color': `${accent}55` }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 mb-0.5">
              Asistente · Syna
            </p>
            <h1 className="text-xl font-black tracking-tight text-white sm:text-2xl">
              Chatbot del chat público
            </h1>
            <p className="text-sm text-slate-400 mt-1 leading-relaxed max-w-xl">
              Configurá las respuestas automáticas de Syna, la asistente que
              atiende a los clientes que entran por <code className="text-slate-200">/chat</code>.
              Sin IA, sin costo — solo botones y palabras clave.
            </p>
          </div>

          {/* Toggle activado/desactivado */}
          <button
            type="button"
            onClick={() => setConfig(c => ({ ...c, enabled: !c.enabled }))}
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold ring-1 transition-all"
            style={{
              background: config.enabled ? `${accent}22` : 'rgba(100,116,139,0.10)',
              color:      config.enabled ? accent : '#94a3b8',
              borderColor: config.enabled ? `${accent}55` : '#334155',
            }}
          >
            {config.enabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
            <span className="uppercase tracking-wider">
              {config.enabled ? 'Bot activado' : 'Bot desactivado'}
            </span>
          </button>
        </div>
      </header>

      {/* ── Saludo inicial ── */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
        <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400 mb-3 flex items-center gap-2">
          <Sparkles size={12} style={{ color: accent }} />
          Saludo inicial
        </h2>
        <p className="text-[11.5px] text-slate-500 mb-2 leading-relaxed">
          Primer mensaje que ve el cliente al abrir el chat por primera vez.
          Va acompañado de los botones de opciones.
        </p>
        <textarea
          value={config.greeting}
          onChange={e => setConfig(c => ({ ...c, greeting: e.target.value }))}
          rows={3}
          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 transition-colors resize-none"
          style={{ '--tw-ring-color': accent }}
          placeholder="Hola {nombre}! 👋 Soy el asistente de {local}…"
        />
        {/* Hint: placeholders disponibles */}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
          <span>Variables que podés usar:</span>
          <button
            type="button"
            onClick={() => setConfig(c => ({ ...c, greeting: (c.greeting || '') + '{nombre}' }))}
            className="rounded-md bg-slate-800 px-2 py-0.5 font-mono font-bold text-slate-200 ring-1 ring-slate-700 hover:bg-slate-700 transition"
            title="Insertar el nombre del cliente"
          >{'{nombre}'}</button>
          <button
            type="button"
            onClick={() => setConfig(c => ({ ...c, greeting: (c.greeting || '') + '{local}' }))}
            className="rounded-md bg-slate-800 px-2 py-0.5 font-mono font-bold text-slate-200 ring-1 ring-slate-700 hover:bg-slate-700 transition"
            title="Insertar el nombre del local"
          >{'{local}'}</button>
          <span className="text-slate-600">— se reemplazan automáticamente al saludar.</span>
        </div>
      </section>

      {/* ── Opciones (botones quick-reply) ── */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400 flex items-center gap-2">
            <MessageCircle size={12} style={{ color: accent }} />
            Opciones · botones rápidos
          </h2>
          <button
            type="button"
            onClick={addOption}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-slate-200 ring-1 ring-slate-700 hover:bg-slate-800 transition"
          >
            <Plus size={11} /> Agregar
          </button>
        </div>
        <p className="text-[11.5px] text-slate-500 mb-4 leading-relaxed">
          Cada opción es un botón que el cliente toca y dispara una respuesta.
          Marcá <b className="text-white">"Escalar a humano"</b> si esa opción
          requiere atención del dueño (ej. precios, hablar con alguien).
        </p>

        <ul className="space-y-3">
          {config.options.map((opt, idx) => (
            <li key={idx} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 sm:p-4">
              <div className="flex items-start gap-2 mb-2">
                <GripVertical size={14} className="text-slate-600 mt-1.5 hidden sm:block" />
                <div className="flex-1 min-w-0">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Texto del botón
                  </label>
                  <input
                    value={opt.label}
                    onChange={e => updateOption(idx, { label: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 transition-colors"
                    style={{ '--tw-ring-color': accent }}
                    placeholder="Ej: 📅 Quiero reservar"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeOption(idx)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:text-red-300 hover:bg-red-500/10 transition"
                  aria-label="Eliminar opción"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              <div className="mt-2 grid grid-cols-1 sm:grid-cols-[1fr_180px] gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Respuesta del bot
                  </label>
                  <textarea
                    value={opt.response}
                    onChange={e => updateOption(idx, { response: e.target.value })}
                    rows={2}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 transition-colors resize-none"
                    style={{ '--tw-ring-color': accent }}
                    placeholder="Lo que el bot responde al tocar este botón"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Acción
                  </label>
                  <div className="relative mt-1">
                    <select
                      value={opt.action || 'reply'}
                      onChange={e => updateOption(idx, { action: e.target.value, escalate: e.target.value === 'escalate' })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-3 pr-8 py-2 text-sm text-white focus:outline-none focus:ring-1 transition-colors appearance-none"
                      style={{ '--tw-ring-color': accent }}
                    >
                      <option value="reply">💬 Solo respuesta</option>
                      <option value="dynamic-prices">💰 Mostrar precios en vivo</option>
                      <option value="link-booking">📅 Link a la agenda</option>
                      <option value="cancel-reagendar">🗓 Cancelar/reagendar con código</option>
                      <option value="link-club">🔗 Link al Club</option>
                      <option value="escalate">🙋 Escalar a humano</option>
                    </select>
                    <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  </div>
                  <p className="text-[10.5px] text-slate-500 mt-1.5 leading-tight">
                    {opt.action === 'dynamic-prices' && 'Carga servicios desde tu catálogo.'}
                    {opt.action === 'link-booking' && 'Manda link a tu sitio público.'}
                    {opt.action === 'cancel-reagendar' && 'Pide código de cita y permite cancelar/reagendar sin login.'}
                    {opt.action === 'link-club' && 'Manda al cliente al Club (dashboard).'}
                    {opt.action === 'escalate' && 'Marca el chat para que lo atiendas.'}
                    {(!opt.action || opt.action === 'reply') && 'Solo manda el texto de arriba.'}
                  </p>
                </div>
              </div>

              <p className="text-[10.5px] text-slate-600 mt-2">
                id interno: <code className="text-slate-500">{opt.id}</code>
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Palabras clave ── */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400 flex items-center gap-2">
            <Sparkles size={12} style={{ color: accent }} />
            Palabras clave
          </h2>
          <button
            type="button"
            onClick={addKeyword}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-slate-200 ring-1 ring-slate-700 hover:bg-slate-800 transition"
          >
            <Plus size={11} /> Agregar
          </button>
        </div>
        <p className="text-[11.5px] text-slate-500 mb-4 leading-relaxed">
          Cuando el cliente <b className="text-white">escribe libre</b>, el bot
          busca estas palabras y, si encuentra alguna, responde con la opción
          asociada. Si no encuentra nada, manda el mensaje de despedida y avisa
          al dueño.
        </p>

        <ul className="space-y-2.5">
          {config.keywords.map((kw, idx) => (
            <li key={idx} className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 items-start rounded-xl border border-slate-800 bg-slate-900/60 p-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Palabras (separadas por coma)
                </label>
                <input
                  value={kw.words}
                  onChange={e => updateKeyword(idx, { words: e.target.value })}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 transition-colors"
                  style={{ '--tw-ring-color': accent }}
                  placeholder="horario, abren, abierto, cierran"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Responde con
                </label>
                <div className="relative mt-1">
                  <select
                    value={kw.optionId}
                    onChange={e => updateKeyword(idx, { optionId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-3 pr-8 py-2 text-sm text-white focus:outline-none focus:ring-1 transition-colors appearance-none"
                    style={{ '--tw-ring-color': accent }}
                  >
                    <option value="">— elegir —</option>
                    {config.options.map(o => (
                      <option key={o.id} value={o.id}>{o.label.replace(/^\W+\s*/, '')}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                </div>
              </div>

              <button
                type="button"
                onClick={() => removeKeyword(idx)}
                className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:text-red-300 hover:bg-red-500/10 transition sm:mt-5"
                aria-label="Eliminar palabra clave"
              >
                <Trash2 size={13} />
              </button>
              {kw.optionId && !optionIds.has(kw.optionId) && (
                <p className="sm:col-span-3 text-[11px] text-amber-300 mt-1 flex items-center gap-1">
                  <AlertCircle size={11} />
                  Esta keyword apunta a una opción que ya no existe.
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* ── Mensaje fallback ── */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
        <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400 mb-3">
          Cuando no entiende
        </h2>
        <p className="text-[11.5px] text-slate-500 mb-2 leading-relaxed">
          Si el cliente escribe algo que ninguna palabra clave matchea, el bot
          manda este mensaje y avisa al dueño que necesita respuesta humana.
        </p>
        <textarea
          value={config.fallback}
          onChange={e => setConfig(c => ({ ...c, fallback: e.target.value }))}
          rows={2}
          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-1 transition-colors resize-none"
          style={{ '--tw-ring-color': accent }}
        />
      </section>

      {/* ── Campaña de reactivación (push automático) ── */}
      <ReactivacionSection accent={accent} />

      {/* ── Upgrades premium (cotizaciones IA + WhatsApp) ── */}
      <UpgradesSection tenantName={tenant.name} />

      {/* ── Barra de guardado ── */}
      <div
        className="sticky bottom-0 -mx-4 sm:mx-0 sm:rounded-2xl flex items-center justify-between gap-3 bg-slate-900/95 border-t sm:border border-slate-800 backdrop-blur p-3 sm:p-4"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.75rem)' }}
      >
        <div className="min-w-0 text-[11.5px] text-slate-400 truncate">
          {savedAt && (
            <span className="text-emerald-400 font-semibold">✓ Guardado.</span>
          )}
          {error && (
            <span className="text-red-400 font-semibold">✗ {error}</span>
          )}
          {!savedAt && !error && (
            <span>Los cambios se aplican al chat público apenas guardás.</span>
          )}
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all active:scale-95 disabled:opacity-50"
          style={{ background: accent, color: '#0a0a0a' }}
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
}

// ─── Campaña de reactivación de clientes dormidos ─────────────────
// Lee/escribe en `tenants/{tid}/_marketing/reactivacion`. La Cloud
// Function `campanaReactivacion` (cron diario 10:00) usa este config.
function reactivacionDocRef() {
  const tid = resolveTenantId();
  return tid === 'elegance'
    ? doc(db, '_marketing', 'reactivacion')
    : doc(db, `tenants/${tid}/_marketing/reactivacion`);
}

function ReactivacionSection({ accent }) {
  const [cfg, setCfg] = useState({
    enabled: false,
    diasInactivo: 30,
    throttleDias: 60,
    titulo:  'Te extrañamos 💈',
    mensaje: 'Hola {nombre}! Ya pasaron {dias} días desde tu último corte. Te esperamos cuando quieras 👋',
  });
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(reactivacionDocRef(), snap => {
      if (snap.exists()) {
        const d = snap.data();
        setCfg(prev => ({ ...prev, ...d }));
      }
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await setDoc(reactivacionDocRef(), {
        ...cfg,
        diasInactivo: Number(cfg.diasInactivo) || 30,
        throttleDias: Number(cfg.throttleDias) || 60,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(null), 3000);
    } finally { setSaving(false); }
  };

  if (loading) return null;

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
      <div className="flex items-start gap-3 flex-wrap mb-4">
        <div
          className="grid h-10 w-10 place-items-center rounded-xl ring-1 ring-slate-700"
          style={{ background: `${accent}22` }}
        >
          <Megaphone size={18} style={{ color: accent }} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-white">Campaña de reactivación</h2>
          <p className="text-[11.5px] text-slate-500 mt-0.5 leading-relaxed">
            Manda un push automático a clientes que no vienen hace tiempo.
            Corre cada día a las 10:00 AM.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCfg(c => ({ ...c, enabled: !c.enabled }))}
          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold ring-1 transition-all"
          style={{
            background: cfg.enabled ? `${accent}22` : 'rgba(100,116,139,0.10)',
            color: cfg.enabled ? accent : '#94a3b8',
            borderColor: cfg.enabled ? `${accent}55` : '#334155',
          }}
        >
          {cfg.enabled ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
          <span className="uppercase tracking-wider">{cfg.enabled ? 'Activa' : 'Apagada'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Días de inactividad
          </label>
          <input
            type="number"
            min={7}
            max={365}
            value={cfg.diasInactivo}
            onChange={e => setCfg(c => ({ ...c, diasInactivo: e.target.value }))}
            className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 transition-colors"
            style={{ '--tw-ring-color': accent }}
          />
          <p className="text-[10.5px] text-slate-500 mt-1">A partir de cuántos días sin venir mandamos.</p>
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            No volver a mandar en
          </label>
          <input
            type="number"
            min={7}
            max={365}
            value={cfg.throttleDias}
            onChange={e => setCfg(c => ({ ...c, throttleDias: e.target.value }))}
            className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 transition-colors"
            style={{ '--tw-ring-color': accent }}
          />
          <p className="text-[10.5px] text-slate-500 mt-1">Throttle por cliente (días). Evita spam.</p>
        </div>
      </div>

      <div className="mb-3">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Título del push
        </label>
        <input
          value={cfg.titulo}
          onChange={e => setCfg(c => ({ ...c, titulo: e.target.value }))}
          className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 transition-colors"
          style={{ '--tw-ring-color': accent }}
          placeholder="Te extrañamos 💈"
        />
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Mensaje
        </label>
        <textarea
          value={cfg.mensaje}
          onChange={e => setCfg(c => ({ ...c, mensaje: e.target.value }))}
          rows={3}
          className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 transition-colors resize-none"
          style={{ '--tw-ring-color': accent }}
          placeholder="Hola {nombre}! Ya pasaron {dias} días…"
        />
        <p className="text-[10.5px] text-slate-500 mt-1.5">
          Variables: <code className="text-slate-300">{`{nombre}`}</code> · <code className="text-slate-300">{`{dias}`}</code>
        </p>
      </div>

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all active:scale-95 disabled:opacity-50"
        style={{ background: accent, color: '#0a0a0a' }}
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
        {saving ? 'Guardando…' : 'Guardar campaña'}
        {savedAt && <span className="ml-1 text-emerald-700">✓</span>}
      </button>
    </section>
  );
}

// ─── Upgrades premium — cotizaciones IA + WhatsApp ───────────────
// Sección informativa con dos add-ons cotizables del SaaS. Click en el CTA
// abre WhatsApp con un mensaje pre-armado al número comercial de SynapTech.
const SYNAPTECH_WA = '56983568212';

function buildWaLink(tenantName, producto) {
  const text = `Hola SynapTech! Soy del local "${tenantName || 'mi local'}" y me interesa activar el módulo "${producto}" en el chatbot. ¿Me cuentan más?`;
  return `https://wa.me/${SYNAPTECH_WA}?text=${encodeURIComponent(text)}`;
}

function UpgradesSection({ tenantName }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 mb-1 mt-2">
        <Sparkles size={14} className="text-amber-300" />
        <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-amber-200/90">
          Lleva tu Syna al siguiente nivel
        </h2>
      </div>
      <p className="text-[12px] text-slate-500 leading-relaxed -mt-1 mb-1 max-w-2xl">
        Dos upgrades opcionales que potencian al bot. Se activan a pedido y se
        suman a tu plan actual. Hablalo directo con SynapTech.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

        {/* ── IA Avanzada ───────────────────────────────────────── */}
        <article
          className="relative overflow-hidden rounded-2xl border border-violet-500/25 p-5 sm:p-6"
          style={{
            background:
              'linear-gradient(135deg, rgba(76,29,149,0.45) 0%, rgba(15,23,42,0.95) 65%), ' +
              'radial-gradient(ellipse at top right, rgba(167,139,250,0.30), transparent 60%)',
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.30), transparent 70%)', filter: 'blur(28px)' }}
          />
          <div className="relative">
            <div className="flex items-start gap-3 mb-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-violet-500/15 ring-1 ring-violet-400/30">
                <Brain size={20} className="text-violet-300" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-400/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-violet-300 ring-1 ring-violet-400/30">
                  <Zap size={9} /> Add-on
                </span>
                <h3 className="mt-1 text-lg font-black tracking-tight text-white">
                  IA conversacional
                </h3>
                <p className="text-[12.5px] text-violet-100/70 mt-0.5">
                  Syna entiende lenguaje natural, sin atarse a palabras clave.
                </p>
              </div>
            </div>

            <ul className="space-y-1.5 mb-4">
              {[
                'Responde con contexto a preguntas abiertas ("¿el corte incluye lavado?")',
                'Detecta intent aunque el cliente abrevie o escriba mal',
                'Mantiene memoria del cliente dentro de la sesión',
                'Si no sabe, te escala — nunca inventa precios o servicios',
              ].map((t, i) => (
                <li key={i} className="flex gap-2 text-[12.5px] text-slate-200 leading-relaxed">
                  <Check size={12} className="text-violet-300 shrink-0 mt-1" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>

            <div className="flex items-end justify-between gap-3 pt-3 border-t border-white/10">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-violet-200/70">
                  Inversión mensual
                </p>
                <p className="text-2xl font-black text-white leading-tight">
                  $9.900 <span className="text-[12px] font-medium text-violet-200/60">+ IVA / mes</span>
                </p>
                <p className="text-[10.5px] text-violet-200/55 mt-0.5">
                  Incluido en plan anual · sin permanencia
                </p>
              </div>
              <a
                href={buildWaLink(tenantName, 'IA conversacional')}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-violet-500 hover:bg-violet-400 text-white px-3.5 py-2.5 text-[12.5px] font-bold transition-all active:scale-95 shrink-0"
              >
                <span>Activar</span>
                <ArrowRight size={13} />
              </a>
            </div>
          </div>
        </article>

        {/* ── WhatsApp Business ─────────────────────────────────── */}
        <article
          className="relative overflow-hidden rounded-2xl border border-emerald-500/25 p-5 sm:p-6"
          style={{
            background:
              'linear-gradient(135deg, rgba(6,78,59,0.55) 0%, rgba(15,23,42,0.95) 65%), ' +
              'radial-gradient(ellipse at top right, rgba(37,211,102,0.28), transparent 60%)',
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(37,211,102,0.30), transparent 70%)', filter: 'blur(28px)' }}
          />
          <div className="relative">
            <div className="flex items-start gap-3 mb-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-400/30">
                <MessageCircle size={20} className="text-emerald-300" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-400/30">
                  <Zap size={9} /> Add-on
                </span>
                <h3 className="mt-1 text-lg font-black tracking-tight text-white">
                  Integración WhatsApp
                </h3>
                <p className="text-[12.5px] text-emerald-100/70 mt-0.5">
                  Que Syna responda directo en tu WhatsApp Business.
                </p>
              </div>
            </div>

            <ul className="space-y-1.5 mb-4">
              {[
                'Recordatorio + confirmación de citas 1h antes — automático',
                'Cliente cancela / confirma desde WhatsApp y la agenda se actualiza sola',
                'Mismo número de tu negocio, sin perder tu identidad',
                'Compatible con el bot del /chat público — la misma config sirve para ambos',
              ].map((t, i) => (
                <li key={i} className="flex gap-2 text-[12.5px] text-slate-200 leading-relaxed">
                  <Check size={12} className="text-emerald-300 shrink-0 mt-1" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>

            <div className="flex items-end justify-between gap-3 pt-3 border-t border-white/10">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-200/70">
                  Inversión mensual
                </p>
                <p className="text-2xl font-black text-white leading-tight">
                  $14.900 <span className="text-[12px] font-medium text-emerald-200/60">+ IVA / mes</span>
                </p>
                <p className="text-[10.5px] text-emerald-200/55 mt-0.5">
                  Incluido en plan anual · primer mes gratis
                </p>
              </div>
              <a
                href={buildWaLink(tenantName, 'WhatsApp Business')}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white px-3.5 py-2.5 text-[12.5px] font-bold transition-all active:scale-95 shrink-0"
              >
                <span>Activar</span>
                <ArrowRight size={13} />
              </a>
            </div>
          </div>
        </article>

      </div>

      {/* ── Bundle hint ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-amber-400/25 bg-amber-400/[0.06] px-4 py-3 flex items-start gap-3">
        <Sparkles size={14} className="text-amber-300 shrink-0 mt-0.5" />
        <p className="text-[12px] text-amber-100/80 leading-relaxed">
          <b className="text-amber-200">¿Te interesan los dos?</b> Activá ambos
          módulos juntos por <b className="text-amber-200">$19.900 + IVA / mes</b> (en
          vez de $24.800). Descuento del 20% sólo aplicable al bundle.
        </p>
      </div>
    </section>
  );
}
