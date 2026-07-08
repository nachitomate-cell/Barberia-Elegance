import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  addDoc, onSnapshot, query, where, orderBy, limit as qLimit, Timestamp,
} from 'firebase/firestore';
import {
  Star, MessageSquare, Send, Clock, CheckCircle2, AlertCircle,
  Info, X, ExternalLink, Copy, Check, TrendingUp, Users, Sparkles,
} from 'lucide-react';
import { tenantCol, tenantDoc } from '../lib/tenantUtils';
import { useTenant } from '../contexts/TenantContext';

/* ── G oficial en 4 colores para el hero (más grande que en el sidebar) ── */
function GoogleG({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

const TABS = [
  { key: 'resumen',      label: 'Resumen',           Icon: TrendingUp   },
  { key: 'solicitar',    label: 'Solicitar reseña',  Icon: Send         },
  { key: 'enviadas',     label: 'Solicitudes',       Icon: Clock        },
  { key: 'como-funciona',label: 'Cómo funciona',     Icon: Info         },
];

// Genera un token aleatorio corto para el link público de la landing.
// No es criptográficamente perfecto pero suficiente para no ser adivinable
// a mano (36 bits ≈ 6 chars alfanuméricos = 2^36 = 68 mil millones).
function randomToken(len = 12) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const arr   = new Uint32Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, n => chars[n % chars.length]).join('');
}

function normalizePhoneCL(raw) {
  const clean = String(raw ?? '').replace(/\D/g, '');
  if (!clean || clean.length < 8) return null;
  return clean.startsWith('56') ? clean : `56${clean}`;
}

function openWhatsAppNative(phone, text) {
  const encoded = encodeURIComponent(text);
  const native  = `whatsapp://send?phone=${phone}&text=${encoded}`;
  const web     = `https://web.whatsapp.com/send?phone=${phone}&text=${encoded}`;
  try { window.location.href = native; } catch (_) {
    window.open(web, 'whatsapp_tab', 'noopener,noreferrer');
    return;
  }
  setTimeout(() => {
    if (!document.hidden) window.open(web, 'whatsapp_tab', 'noopener,noreferrer');
  }, 1500);
}

/* ── Tab Resumen ────────────────────────────────────────────────
   Muestra rating actual, total de reseñas, las 5 más recientes
   (todo pulled por la CF googleReviewsSync que corre diariamente). */
function TabResumen() {
  const tenant = useTenant();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(tenantDoc('settings', 'googleReviews'), snap => {
      setData(snap.exists() ? snap.data() : null);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-5 h-32 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data?.placeId) {
    return (
      <div className="bg-amber-500/5 border border-amber-500/25 rounded-xl p-6 text-center">
        <AlertCircle size={22} className="mx-auto text-amber-400 mb-2" />
        <p className="text-sm font-bold text-white">Aún no configuraste tu Place ID de Google</p>
        <p className="text-xs text-slate-400 mt-2 leading-relaxed max-w-md mx-auto">
          Sin el Place ID no podemos leer tus reseñas de Google Maps ni redirigir a los clientes
          para que dejen su opinión. Contáctate con soporte para activarlo — se hace en 1 minuto.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs Google */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-yellow-500/15 border border-yellow-500/25">
              <Star size={16} className="text-yellow-400" fill="currentColor" />
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rating</span>
          </div>
          <p className="text-4xl md:text-5xl font-black text-white tracking-tight">
            {data.rating != null ? data.rating.toFixed(1) : '—'}
          </p>
          <p className="text-xs text-slate-500 mt-1">Promedio en Google</p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-blue-500/15 border border-blue-500/25">
              <MessageSquare size={16} className="text-blue-400" />
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total reseñas</span>
          </div>
          <p className="text-4xl md:text-5xl font-black text-white tracking-tight">
            {data.totalReviews != null ? data.totalReviews.toLocaleString('es-CL') : '—'}
          </p>
          <p className="text-xs text-slate-500 mt-1">En Google Maps</p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/25">
              <Sparkles size={16} className="text-emerald-400" />
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Actualizado</span>
          </div>
          <p className="text-lg font-bold text-white mt-2 leading-tight">
            {data.updatedAt?.toDate
              ? data.updatedAt.toDate().toLocaleDateString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
              : '—'}
          </p>
          <p className="text-xs text-slate-500 mt-1">Sync automático diario a las 06:00</p>
        </div>
      </div>

      {/* Últimas reseñas */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
          <Star size={16} className="text-yellow-400" fill="currentColor" />
          <h3 className="text-sm font-bold text-white">Últimas reseñas de Google</h3>
          <span className="text-xs text-slate-500 ml-auto">Google devuelve solo las 5 más recientes</span>
        </div>
        {(!data.reviews || data.reviews.length === 0) ? (
          <p className="text-sm text-slate-500 italic text-center py-6">Sin reseñas para mostrar aún.</p>
        ) : (
          <ul className="space-y-4">
            {data.reviews.map((r, i) => (
              <li key={i} className="flex gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-xs font-bold text-slate-300">
                  {(r.author || '?').slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-white truncate">{r.author}</p>
                    <div className="flex items-center gap-0.5">
                      {[1,2,3,4,5].map(n => (
                        <Star key={n} size={11} className={n <= (r.rating || 5) ? 'text-yellow-400' : 'text-slate-700'} fill="currentColor" />
                      ))}
                    </div>
                    <span className="text-[10px] text-slate-500">{r.time}</span>
                  </div>
                  {r.text && <p className="text-xs text-slate-400 mt-1 leading-relaxed">{r.text}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ── Tab Solicitar reseña ───────────────────────────────────────
   Formulario simple: nombre + teléfono del cliente + citaId opcional.
   Genera un review_intent en Firestore y devuelve la URL de la landing
   para copiar o mandar por WhatsApp. */
function TabSolicitar() {
  const tenant = useTenant();
  const [form, setForm] = useState({ clienteNombre: '', clientePhone: '', citaId: '' });
  const [status, setStatus] = useState('idle'); // idle | saving | ok | err
  const [errMsg, setErrMsg] = useState('');
  const [generated, setGenerated] = useState(null); // { url, intentId, phone }
  const [copied, setCopied] = useState(false);

  const canSubmit = form.clienteNombre.trim() && normalizePhoneCL(form.clientePhone);

  async function handleGenerate() {
    if (!canSubmit || status === 'saving') return;
    setStatus('saving');
    setErrMsg('');
    try {
      const token = randomToken(14);
      const payload = {
        token,
        status:         'pending',
        clienteNombre:  form.clienteNombre.trim(),
        clientePhone:   normalizePhoneCL(form.clientePhone),
        citaId:         form.citaId.trim() || null,
        createdAt:      Timestamp.now(),
        expiresAt:      Timestamp.fromMillis(Date.now() + 30 * 864e5), // 30 días
      };
      const docRef = await addDoc(tenantCol('review_intents'), payload);
      const url = `${window.location.origin}/rate.html?t=${docRef.id}&s=${token}`;
      setGenerated({ url, intentId: docRef.id, phone: payload.clientePhone });
      setStatus('ok');
    } catch (e) {
      console.error('[Google] crear intent:', e);
      setStatus('err');
      setErrMsg('No se pudo generar el link. Reintenta.');
    }
  }

  function reset() {
    setForm({ clienteNombre: '', clientePhone: '', citaId: '' });
    setGenerated(null);
    setStatus('idle');
    setCopied(false);
    setErrMsg('');
  }

  function copyLink() {
    if (!generated) return;
    navigator.clipboard.writeText(generated.url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function sendWhatsApp() {
    if (!generated) return;
    const nombre = form.clienteNombre.split(' ')[0] || 'hola';
    const msg = `¡Hola ${nombre}! 👋 Soy de *${tenant.name || 'la barbería'}*. Gracias por venir 🙌\n\n¿Nos regalas 30 segundos para calificar tu experiencia? Nos ayuda un montón:\n\n${generated.url}`;
    openWhatsAppNative(generated.phone, msg);
  }

  const field = 'w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors';

  return (
    <div className="max-w-2xl space-y-6">
      {!generated ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
              <Send size={14} className="text-blue-400" />
              Solicitar reseña a un cliente
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Genera un link único para invitar al cliente a calificar. Al abrirlo, verá 5 estrellas —
              si califica 4 o 5, va directo a dejar su reseña en Google Maps. Si califica menos, recibe un formulario privado y a ti te llega el feedback (protege tu rating público).
            </p>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Nombre del cliente *</label>
            <input
              type="text"
              value={form.clienteNombre}
              onChange={e => setForm(f => ({ ...f, clienteNombre: e.target.value }))}
              placeholder="Ej: María González"
              className={field}
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Teléfono (WhatsApp) *</label>
            <input
              type="tel"
              inputMode="tel"
              value={form.clientePhone}
              onChange={e => setForm(f => ({ ...f, clientePhone: e.target.value }))}
              placeholder="+56 9 8765 4321"
              className={field}
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              ID de cita <span className="text-slate-600 normal-case font-normal">(opcional, ayuda a la trazabilidad)</span>
            </label>
            <input
              type="text"
              value={form.citaId}
              onChange={e => setForm(f => ({ ...f, citaId: e.target.value }))}
              placeholder="Ej: abc123 (déjalo vacío si no aplica)"
              className={field}
            />
          </div>

          {status === 'err' && (
            <p className="text-xs text-rose-400 font-semibold flex items-center gap-1">
              <X size={12} /> {errMsg}
            </p>
          )}

          <button
            onClick={handleGenerate}
            disabled={!canSubmit || status === 'saving'}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-blue-500 hover:bg-blue-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors"
          >
            {status === 'saving'
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Send size={14} />}
            {status === 'saving' ? 'Generando link…' : 'Generar link de reseña'}
          </button>
        </div>
      ) : (
        <div className="bg-emerald-500/5 border border-emerald-500/25 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/25">
              <CheckCircle2 size={16} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Link generado</p>
              <p className="text-xs text-slate-400">Para <strong className="text-white">{form.clienteNombre}</strong> · válido 30 días</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 flex items-center gap-2">
            <ExternalLink size={12} className="text-slate-500 shrink-0" />
            <input
              type="text"
              value={generated.url}
              readOnly
              className="flex-1 bg-transparent text-xs text-slate-300 truncate focus:outline-none font-mono"
            />
            <button
              onClick={copyLink}
              className="shrink-0 text-slate-400 hover:text-white transition-colors"
              title="Copiar link"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>
          </div>

          <div className="flex gap-2 flex-col sm:flex-row">
            <button
              onClick={sendWhatsApp}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-bold transition-colors"
            >
              <Send size={14} /> Enviar por WhatsApp
            </button>
            <button
              onClick={reset}
              className="px-4 py-2.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-semibold transition-colors"
            >
              Nueva solicitud
            </button>
          </div>

          <p className="text-[10.5px] text-slate-500 leading-relaxed">
            💡 Cuando el cliente califique, verás el resultado en el tab <strong className="text-slate-300">Solicitudes</strong>.
            Si calificó 4 o 5 estrellas y hubo un aumento de reseñas en Google dentro de 5 minutos, presumimos que fue esa persona (~85% de certeza).
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Tab Solicitudes enviadas ───────────────────────────────────
   Lista los intents ordenados por createdAt desc con status visual. */
function TabEnviadas() {
  const [intents, setIntents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      tenantCol('review_intents'),
      orderBy('createdAt', 'desc'),
      qLimit(50),
    );
    const unsub = onSnapshot(q, snap => {
      setIntents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  const stats = useMemo(() => {
    const pending    = intents.filter(i => i.status === 'pending').length;
    const positive   = intents.filter(i => i.status === 'positive_redirected').length;
    const negative   = intents.filter(i => i.status === 'negative_feedback').length;
    const conversion = intents.length ? Math.round((positive / intents.length) * 100) : 0;
    return { total: intents.length, pending, positive, negative, conversion };
  }, [intents]);

  const STATUS_CFG = {
    pending:              { label: 'Pendiente',            color: 'bg-slate-500/10 text-slate-400 border-slate-500/25' },
    positive_redirected:  { label: 'Redirigida a Google',  color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' },
    negative_feedback:    { label: 'Feedback interno',     color: 'bg-amber-500/10 text-amber-400 border-amber-500/25' },
    expired:              { label: 'Expirada',             color: 'bg-slate-800/50 text-slate-500 border-slate-700' },
  };

  if (loading) {
    return <div className="h-40 bg-slate-900 border border-slate-800 rounded-xl animate-pulse" />;
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      {intents.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatMini label="Enviadas"       value={stats.total}      color="slate" />
          <StatMini label="Pendientes"     value={stats.pending}    color="slate" />
          <StatMini label="A Google"       value={stats.positive}   color="emerald" />
          <StatMini label="% conversión"   value={`${stats.conversion}%`} color="blue" />
        </div>
      )}

      {/* Lista */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Últimas solicitudes</p>
        </div>
        {intents.length === 0 ? (
          <div className="py-12 text-center px-4">
            <Send size={22} className="mx-auto text-slate-700 mb-2" />
            <p className="text-sm text-slate-400 font-semibold">Aún no has enviado solicitudes</p>
            <p className="text-xs text-slate-600 mt-1">Ve al tab "Solicitar reseña" para generar tu primer link.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-800">
            {intents.map(i => {
              const cfg = STATUS_CFG[i.status] || STATUS_CFG.pending;
              return (
                <li key={i.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-xs font-bold text-slate-300">
                    {(i.clienteNombre || '?').slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{i.clienteNombre}</p>
                    <p className="text-[11px] text-slate-500 truncate">
                      +{i.clientePhone} · {i.createdAt?.toDate?.().toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                      {i.rating != null && ` · ${i.rating}⭐`}
                    </p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.color} shrink-0`}>
                    {cfg.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

const STAT_COLOR = {
  slate:   'bg-slate-500/10 text-slate-300 border-slate-500/20',
  emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
  blue:    'bg-blue-500/10 text-blue-400 border-blue-500/25',
};

function StatMini({ label, value, color = 'slate' }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={`text-xl font-black mt-1 ${
        color === 'emerald' ? 'text-emerald-400' :
        color === 'blue'    ? 'text-blue-400' :
                              'text-white'
      }`}>{value}</p>
    </div>
  );
}

/* ── Tab Cómo funciona ─────────────────────────────────────────── */
function TabComoFunciona() {
  return (
    <div className="max-w-3xl space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Info size={14} className="text-blue-400" />
          Sistema de reseñas con protección de rating
        </h3>
        <p className="text-sm text-slate-400 leading-relaxed">
          Este módulo hace lo mismo que Weibook o Podium: convierte más clientes en reseñas
          positivas en Google Maps, protegiendo tu calificación pública de opiniones negativas.
        </p>
      </div>

      {/* Pasos */}
      <div className="space-y-3">
        {[
          {
            n: 1,
            title: 'Envías el link al cliente',
            desc: 'Después de la cita, generas un link único desde el tab "Solicitar reseña" y se lo mandas por WhatsApp con un mensaje pre-armado.',
          },
          {
            n: 2,
            title: 'El cliente califica su experiencia',
            desc: 'Al abrir el link ve 5 estrellas grandes. La landing es limpia, sin logins ni pasos extra — el cliente tapea una calificación en 5 segundos.',
          },
          {
            n: 3,
            title: 'Branching automático según el rating',
            desc: 'Si califica 4 o 5 estrellas, se redirige directo a la ventana de escribir reseña en Google Maps. Si califica 1, 2 o 3, se abre un formulario privado para que cuente qué falló — a ti te llega el feedback y NO va a Google. Así proteges tu rating.',
          },
          {
            n: 4,
            title: 'Tracking de intención (~85% certeza)',
            desc: 'No podemos saber CON SEGURIDAD si el cliente publicó en Google (Google no lo notifica). Pero registramos el momento en que redirigiste. Si el sync diario detecta que el total de reseñas subió +1 dentro de los 5 minutos, atribuimos la reseña a esa persona.',
          },
        ].map(step => (
          <div key={step.n} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center shrink-0 text-white text-sm font-black">
              {step.n}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white leading-tight">{step.title}</p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Nota sobre atribución dura */}
      <div className="bg-amber-500/5 border border-amber-500/25 rounded-xl p-4">
        <div className="flex items-start gap-2">
          <AlertCircle size={14} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-300">¿Necesitas atribución 100% verificada?</p>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Como Google no da nombre real ni teléfono del reviewer, la única forma de atribución perfecta
              es pedirle al cliente que te mande <strong className="text-slate-200">un screenshot</strong> de su reseña por WhatsApp a cambio de un beneficio
              (descuento, sello extra). Combina esto con el tracking de intención para tener el mejor de ambos mundos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Vista principal ─────────────────────────────────────────── */
export default function Google() {
  const [params, setParams] = useSearchParams();
  const tabParam = params.get('tab') || 'resumen';
  const activeTab = TABS.some(t => t.key === tabParam) ? tabParam : 'resumen';

  function setActiveTab(key) {
    const next = new URLSearchParams(params);
    if (key === 'resumen') next.delete('tab');
    else                   next.set('tab', key);
    setParams(next, { replace: true });
  }

  return (
    <div data-view="google" className="p-4 md:p-6 space-y-6">
      {/* Header con G oficial */}
      <header className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-white/95 shadow-lg border border-slate-200 shrink-0">
          <GoogleG size={22} />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold text-white truncate">Google</h1>
          <p className="text-xs text-slate-500 truncate">Solicita reseñas · protege tu rating · trackea la conversión</p>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-slate-800">
        {TABS.map(t => {
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-3 md:px-4 py-2.5 text-sm font-semibold transition-all border-b-2 -mb-px ${
                active
                  ? 'text-blue-400 border-blue-400'
                  : 'text-slate-500 border-transparent hover:text-slate-300'
              }`}
            >
              <t.Icon size={14} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Contenido */}
      <div>
        {activeTab === 'resumen'       && <TabResumen />}
        {activeTab === 'solicitar'     && <TabSolicitar />}
        {activeTab === 'enviadas'      && <TabEnviadas />}
        {activeTab === 'como-funciona' && <TabComoFunciona />}
      </div>
    </div>
  );
}
