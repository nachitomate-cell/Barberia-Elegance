import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  addDoc, onSnapshot, query, where, orderBy, limit as qLimit, Timestamp,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  Star, MessageSquare, Send, Clock, CheckCircle2, AlertCircle,
  Info, X, ExternalLink, Copy, Check, TrendingUp, Users, Sparkles,
  RefreshCw, Search, MapPin,
} from 'lucide-react';
import { tenantCol, tenantDoc } from '../lib/tenantUtils';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';

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
const SUPERADMINS = new Set(['ignaciiio.mate@gmail.com']);

/* ── Conectar Google (AUTOSERVICIO) ─────────────────────────────
   Reemplaza el viejo "Contáctate con soporte". El local busca su negocio
   por nombre (googlePlacesBuscar), elige el suyo y lo vincula
   (googleReviewsVincular) → guarda el placeId + hace sync inicial. El
   onSnapshot de TabResumen detecta el placeId nuevo y refresca solo. */
function ConectarGoogle() {
  const tenant = useTenant();
  const [query, setQuery]           = useState(tenant?.name || '');
  const [buscando, setBuscando]     = useState(false);
  const [candidatos, setCandidatos] = useState(null); // null = sin buscar; [] = sin resultados
  const [vinculando, setVinculando] = useState('');   // placeId en curso
  const [error, setError]           = useState('');

  async function buscar() {
    const q = query.trim();
    if (q.length < 3 || buscando) return;
    setBuscando(true); setError(''); setCandidatos(null);
    try {
      const fn  = httpsCallable(getFunctions(undefined, 'us-central1'), 'googlePlacesBuscar');
      const res = await fn({ query: q, tenantId: tenant.id });
      setCandidatos(res.data?.candidatos || []);
    } catch (e) {
      setError(e?.message || 'No pudimos buscar. Reintenta.');
    } finally {
      setBuscando(false);
    }
  }

  async function vincular(c) {
    if (vinculando) return;
    setVinculando(c.placeId); setError('');
    try {
      const fn = httpsCallable(getFunctions(undefined, 'us-central1'), 'googleReviewsVincular');
      await fn({ placeId: c.placeId, tenantId: tenant.id });
      // El onSnapshot del padre refresca la vista al detectar el placeId nuevo.
    } catch (e) {
      setError(e?.message || 'No pudimos conectar ese lugar. Reintenta.');
      setVinculando('');
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="text-center">
        <div className="w-11 h-11 rounded-xl bg-white/95 shadow border border-slate-200 flex items-center justify-center mx-auto mb-3">
          <GoogleG size={22} />
        </div>
        <h3 className="text-sm font-bold text-primary">Conecta tu ficha de Google</h3>
        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed max-w-sm mx-auto">
          Busca tu barbería como aparece en Google Maps y selecciónala. Con eso
          activamos tus reseñas y el enlace para que tus clientes te califiquen.
        </p>
      </div>

      {/* Buscador */}
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3">
          <Search size={15} className="text-slate-500 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') buscar(); }}
            placeholder="Ej: Infinity Studio, Santiago"
            autoComplete="off"
            className="flex-1 bg-transparent py-2.5 text-sm text-primary placeholder-slate-500 focus:outline-none"
          />
        </div>
        <button
          onClick={buscar}
          disabled={buscando || query.trim().length < 3}
          className="px-4 py-2.5 rounded-lg bg-blue-500 hover:bg-blue-400 disabled:opacity-40 disabled:cursor-not-allowed text-primary text-sm font-bold transition-colors flex items-center gap-2 shrink-0"
        >
          {buscando
            ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <Search size={14} />}
          Buscar
        </button>
      </div>

      {error && (
        <p className="text-xs text-rose-400 font-semibold flex items-center gap-1">
          <X size={12} /> {error}
        </p>
      )}

      {/* Resultados */}
      {candidatos && candidatos.length === 0 && !buscando && (
        <p className="text-xs text-slate-500 text-center py-4">
          Sin resultados. Prueba con el nombre + la ciudad (ej: "Barbería Central, Valparaíso").
        </p>
      )}

      {candidatos && candidatos.length > 0 && (
        <ul className="space-y-2">
          {candidatos.map(c => {
            const enCurso = vinculando === c.placeId;
            return (
              <li key={c.placeId}>
                <button
                  onClick={() => vincular(c)}
                  disabled={!!vinculando}
                  className="w-full text-left bg-slate-900 border border-slate-700 hover:border-blue-500/60 rounded-xl p-3.5 flex items-center gap-3 transition-colors disabled:opacity-60"
                >
                  <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                    <MapPin size={15} className="text-blue-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-primary truncate">{c.nombre}</p>
                    <p className="text-[11px] text-slate-500 truncate">{c.direccion}</p>
                    {c.rating != null && (
                      <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <Star size={10} className="text-yellow-400" fill="currentColor" />
                        {c.rating.toFixed(1)}{c.totalReviews != null && ` · ${c.totalReviews.toLocaleString('es-CL')} reseñas`}
                      </p>
                    )}
                  </div>
                  {enCurso
                    ? <span className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin shrink-0" />
                    : <span className="text-[11px] font-bold text-blue-400 shrink-0 whitespace-nowrap">Es la mía →</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-[10.5px] text-slate-600 text-center leading-relaxed">
        ¿No encuentras tu local? Debe existir como ficha en Google Maps. Si es nuevo,
        créalo en Google Business primero y vuelve aquí.
      </p>
    </div>
  );
}

function TabResumen() {
  const tenant = useTenant();
  const { user } = useAuth();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const isSuperadmin = SUPERADMINS.has((user?.email || '').toLowerCase());

  // Editor superadmin del baseline (reseñas con las que empezó el local).
  const [editBaseline, setEditBaseline] = useState(false);
  const [baselineInput, setBaselineInput] = useState('');
  const [dateInput, setDateInput] = useState('');
  const [savingBaseline, setSavingBaseline] = useState(false);
  const [baselineMsg, setBaselineMsg] = useState('');

  async function handleSetBaseline() {
    const n = Number(baselineInput);
    if (!Number.isFinite(n) || n < 0) { setBaselineMsg('Número inválido'); return; }
    setSavingBaseline(true);
    setBaselineMsg('');
    try {
      const fn = httpsCallable(getFunctions(undefined, 'us-central1'), 'googleReviewsSetBaseline');
      await fn({ tenantId: tenant.id, baseline: n, date: dateInput || undefined });
      setBaselineMsg('✓ Guardado');
      setEditBaseline(false);
    } catch (e) {
      setBaselineMsg(e?.message || 'No se pudo guardar');
    } finally {
      setSavingBaseline(false);
      setTimeout(() => setBaselineMsg(''), 4000);
    }
  }

  async function handleForceSync() {
    if (syncing) return;
    setSyncing(true);
    setSyncMsg('');
    try {
      const fn = httpsCallable(getFunctions(undefined, 'us-central1'), 'googleReviewsSyncManual');
      const res = await fn({ tenantId: tenant.id });
      const skipped = res.data?.skipped;
      if (skipped) {
        setSyncMsg(`Sin placeId configurado para ${tenant.id}. Contáctate con soporte.`);
      } else {
        setSyncMsg(`✓ Sincronizado — ${res.data?.reviews ?? 0} reseñas actualizadas`);
      }
    } catch (e) {
      console.error('[Google] forceSync:', e);
      setSyncMsg(e?.message || 'No se pudo sincronizar');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(''), 5000);
    }
  }

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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <ConectarGoogle />
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
          <p className="text-4xl md:text-5xl font-black text-primary tracking-tight">
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
          <p className="text-4xl md:text-5xl font-black text-primary tracking-tight">
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
          <p className="text-lg font-bold text-primary mt-2 leading-tight">
            {data.updatedAt?.toDate
              ? data.updatedAt.toDate().toLocaleDateString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
              : '—'}
          </p>
          <p className="text-xs text-slate-500 mt-1">Sync automático diario a las 06:00</p>
          {isSuperadmin && (
            <button
              onClick={handleForceSync}
              disabled={syncing}
              className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Sincronizando…' : 'Actualizar ahora'}
            </button>
          )}
          {syncMsg && <p className="text-[10.5px] text-slate-400 mt-2 leading-snug">{syncMsg}</p>}
        </div>
      </div>

      {/* ── Crecimiento con SynapTech (hook de valor) ── */}
      {(() => {
        const baseline    = typeof data.reviewsBaseline === 'number' ? data.reviewsBaseline : null;
        const current     = typeof data.totalReviews === 'number' ? data.totalReviews : null;
        const ganadas     = (baseline != null && current != null) ? current - baseline : null;
        const pct         = (baseline > 0 && ganadas != null) ? (ganadas / baseline) * 100 : null;
        const hasGrowth   = ganadas != null && ganadas > 0;
        const baselineStr = data.baselineDate?.toDate
          ? data.baselineDate.toDate().toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
          : null;

        if (baseline == null && !isSuperadmin) return null;

        return (
          <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500/10 via-slate-900 to-slate-900 border border-emerald-500/25 rounded-2xl p-6">
            <div aria-hidden className="absolute -top-16 -right-10 w-56 h-56 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/25">
                  <TrendingUp size={15} className="text-emerald-400" />
                </div>
                <h3 className="text-sm font-bold text-primary">Tu crecimiento con SynapTech</h3>
                {isSuperadmin && (
                  <button
                    onClick={() => { setEditBaseline(v => !v); setBaselineInput(baseline != null ? String(baseline) : ''); }}
                    className="ml-auto text-[11px] font-semibold text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {editBaseline ? 'Cerrar' : 'Ajustar inicio'}
                  </button>
                )}
              </div>

              {hasGrowth ? (
                <div className="flex items-center flex-wrap gap-x-6 gap-y-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-0.5">Empezaste con</p>
                    <p className="text-2xl font-black text-slate-300 tabular-nums leading-none">{baseline.toLocaleString('es-CL')}</p>
                    {baselineStr && <p className="text-[10px] text-slate-600 mt-1 capitalize">{baselineStr}</p>}
                  </div>
                  <span className="text-2xl text-emerald-500/60 font-black">→</span>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-emerald-400/80 font-bold mb-0.5">Hoy tienes</p>
                    <p className="text-2xl font-black text-primary tabular-nums leading-none">{current.toLocaleString('es-CL')}</p>
                    <p className="text-[10px] text-slate-600 mt-1">reseñas en Google</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-3xl md:text-4xl font-black text-emerald-400 tabular-nums leading-none">
                      +{ganadas.toLocaleString('es-CL')}
                    </p>
                    <p className="text-xs font-bold text-emerald-400/90 mt-1.5">
                      {pct != null ? `▲ ${pct.toFixed(0)}% más reseñas` : 'reseñas nuevas'}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400 leading-relaxed">
                  Estamos midiendo tu crecimiento{baselineStr ? ` desde ${baselineStr}` : ' desde que empezaste'}.
                  Cada reseña nueva que sumes con el sistema aparecerá acá. 🚀
                </p>
              )}

              {isSuperadmin && editBaseline && (
                <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap items-end gap-3">
                  <label className="text-[11px] font-semibold text-slate-400 flex flex-col gap-1">
                    Reseñas al empezar
                    <input
                      type="number" min="0" value={baselineInput}
                      onChange={e => setBaselineInput(e.target.value)}
                      placeholder="ej: 45"
                      className="w-28 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-primary focus:outline-none focus:border-emerald-500"
                    />
                  </label>
                  <label className="text-[11px] font-semibold text-slate-400 flex flex-col gap-1">
                    Fecha inicio (opcional)
                    <input
                      type="date" value={dateInput}
                      onChange={e => setDateInput(e.target.value)}
                      className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-primary focus:outline-none focus:border-emerald-500"
                    />
                  </label>
                  <button
                    onClick={handleSetBaseline}
                    disabled={savingBaseline}
                    className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-emerald-950 transition-colors disabled:opacity-50"
                  >
                    {savingBaseline ? 'Guardando…' : 'Guardar inicio'}
                  </button>
                  {baselineMsg && <span className="text-[11px] text-slate-400">{baselineMsg}</span>}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Últimas reseñas */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
          <Star size={16} className="text-yellow-400" fill="currentColor" />
          <h3 className="text-sm font-bold text-primary">Últimas reseñas de Google</h3>
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
                    <p className="text-sm font-semibold text-primary truncate">{r.author}</p>
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

  const field = 'w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-primary placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors';

  return (
    <div className="max-w-2xl space-y-6">
      {!generated ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-primary flex items-center gap-2 mb-1">
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
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-blue-500 hover:bg-blue-400 disabled:opacity-40 disabled:cursor-not-allowed text-primary text-sm font-bold transition-colors"
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
              <p className="text-sm font-bold text-primary">Link generado</p>
              <p className="text-xs text-slate-400">Para <strong className="text-primary">{form.clienteNombre}</strong> · válido 30 días</p>
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
              className="shrink-0 text-slate-400 hover:text-primary transition-colors"
              title="Copiar link"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>
          </div>

          <div className="flex gap-2 flex-col sm:flex-row">
            <button
              onClick={sendWhatsApp}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-ink-950 text-sm font-bold transition-colors"
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
                    <p className="text-sm font-medium text-primary truncate">{i.clienteNombre}</p>
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
                              'text-primary'
      }`}>{value}</p>
    </div>
  );
}

/* ── "Google" en sus 4 colores oficiales (para el mock de reseña) ── */
function GoogleWord() {
  const cols = ['#4285F4', '#EA4335', '#FBBC05', '#4285F4', '#34A853', '#EA4335'];
  return (
    <span className="text-sm font-bold tracking-tight select-none" aria-label="Google">
      {'Google'.split('').map((ch, i) => (
        <span key={i} style={{ color: cols[i] }}>{ch}</span>
      ))}
    </span>
  );
}

/* ── Vista previa EN VIVO (animada) del flujo de reseñas ──────────
   Cicla en loop: el cliente valora → si es positivo se le invita a
   Google → la reseña se publica y sube el contador. Self-contained
   (estado + transiciones Tailwind), la tarjeta es blanca a propósito
   porque representa la UI de Google (se ve bien en claro y oscuro). */
function LivePreviewResenas() {
  const tenant = useTenant();
  const nombre = tenant?.name || 'Tu Barbería';
  const [phase, setPhase]     = useState(0); // 0 valorar · 1 tap · 2 google · 3 publicada
  const [reviews, setReviews] = useState(178);

  useEffect(() => {
    const dur = [1900, 1500, 1400, 2900][phase];
    const t = setTimeout(() => {
      setPhase(p => {
        const next = (p + 1) % 4;
        if (next === 3) setReviews(c => c + 1);
        if (next === 0) setReviews(178);
        return next;
      });
    }, dur);
    return () => clearTimeout(t);
  }, [phase]);

  const enGoogle  = phase >= 2;
  const tapped    = phase === 1;
  const published = phase === 3;

  return (
    <div className="relative h-[340px] rounded-2xl overflow-hidden border border-slate-200 bg-gradient-to-b from-slate-50 to-slate-200/70">
      {/* Pantalla A — el cliente valora */}
      <div className={`absolute inset-0 flex flex-col items-center justify-center px-6 transition-all duration-500 ${enGoogle ? 'opacity-0 -translate-y-4 pointer-events-none' : 'opacity-100'}`}>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">{nombre}</p>
        <p className="text-[15px] font-bold text-ink-800 mb-6 text-center">¿Cómo estuvo tu experiencia?</p>
        <div className={`flex gap-2 ${tapped ? '' : 'animate-pulse'}`}>
          {[1, 2, 3, 4, 5].map(n => (
            <Star
              key={n}
              size={36}
              strokeWidth={1.5}
              className={`transition-all duration-300 ${tapped ? 'text-yellow-400 scale-110 -translate-y-0.5' : 'text-slate-300'}`}
              fill={tapped ? 'currentColor' : 'none'}
              style={{ transitionDelay: `${n * 55}ms` }}
            />
          ))}
        </div>
        <p className={`mt-7 text-sm font-bold text-emerald-600 transition-opacity duration-300 ${tapped ? 'opacity-100' : 'opacity-0'}`}>
          ¡Nos alegra! Te llevamos a Google →
        </p>
      </div>

      {/* Pantalla B — reseña publicada en Google */}
      <div className={`absolute inset-0 flex items-center justify-center p-5 transition-all duration-500 ${enGoogle ? 'opacity-100' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
        <div className="w-full max-w-[300px] bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.25)] border border-slate-200 p-4 relative">
          {/* Toast */}
          <div className={`absolute -top-3 right-3 bg-slate-900 text-primary text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-1.5 transition-all duration-300 ${published ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            ¡Reseña publicada en Google!
          </div>
          <GoogleWord />
          <p className="text-[15px] font-bold text-ink-800 mt-2">{nombre}</p>
          <div className="flex items-center gap-1.5 mt-0.5 mb-3">
            <span className="text-lg font-black text-ink-800 leading-none">4.9</span>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map(n => <Star key={n} size={12} className="text-yellow-400" fill="currentColor" />)}
            </div>
            <span className="text-[11px] text-slate-500 tabular-nums">{reviews} reseñas</span>
          </div>
          <div className={`bg-slate-50 border border-slate-200 rounded-xl p-3 transition-all duration-500 ${published ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-blue-500 text-primary text-[11px] font-bold flex items-center justify-center shrink-0">C</div>
              <div className="min-w-0">
                <p className="text-[12px] font-bold text-slate-700 leading-none">Carolina R.</p>
                <p className="text-[9px] text-slate-400 mt-1">hace un momento · vía {nombre}</p>
              </div>
            </div>
            <div className="flex gap-0.5 mt-2">
              {[1, 2, 3, 4, 5].map(n => <Star key={n} size={10} className="text-yellow-400" fill="currentColor" />)}
            </div>
            <p className="text-[10.5px] text-slate-600 mt-1.5 leading-snug">
              ¡Excelente servicio! El corte quedó perfecto y la atención de primera. 100% recomendados.
            </p>
          </div>
        </div>
      </div>

      {/* Indicador de fase */}
      <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
        {[0, 1, 2, 3].map(i => (
          <span key={i} className={`h-1 rounded-full transition-all duration-300 ${i === phase ? 'w-5 bg-blue-500' : 'w-1.5 bg-ink-300'}`} />
        ))}
      </div>
    </div>
  );
}

/* ── Tab Cómo funciona ─────────────────────────────────────────── */
const COMO_FUNCIONA_STEPS = [
  {
    n: 1,
    title: 'El cliente valora su experiencia',
    desc: 'Le mandas un link único por WhatsApp (mensaje pre-armado). Al abrirlo ve 5 estrellas grandes — tapea su calificación en 5 segundos, sin logins ni pasos extra.',
  },
  {
    n: 2,
    title: 'Branching automático según el rating',
    desc: 'Si califica 4 o 5, se redirige directo a escribir su reseña en Google Maps. Si califica 1-3, se abre un formulario privado y el feedback te llega solo a ti — NO va a Google. Así proteges tu rating.',
  },
  {
    n: 3,
    title: 'Sube en Google Maps',
    desc: 'Cada reseña positiva engorda tu perfil de Google. Más reseñas continuas = más visibilidad y mejor posicionamiento local.',
  },
  {
    n: 4,
    title: 'Tracking de intención (~85% certeza)',
    desc: 'Google no avisa si el cliente publicó, pero registramos el momento del redirect. Si el sync diario ve que el total subió +1 en los 5 minutos siguientes, atribuimos la reseña a esa persona.',
  },
];

function TabComoFunciona() {
  return (
    <div className="max-w-5xl space-y-6">
      <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">
        {/* Izquierda: intro + pasos */}
        <div className="space-y-4 order-2 lg:order-1">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-bold text-primary mb-2 flex items-center gap-2">
              <Info size={14} className="text-blue-400" />
              Reseñas con Google Maps
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Convierte más clientes en reseñas positivas en Google Maps, protegiendo tu
              calificación pública de opiniones negativas. Mismo enfoque que Weibook o Podium.
            </p>
          </div>

          {COMO_FUNCIONA_STEPS.map(step => (
            <div key={step.n} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center shrink-0 text-primary text-sm font-black">
                {step.n}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-primary leading-tight">{step.title}</p>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Derecha: vista previa EN VIVO (sticky) */}
        <div className="order-1 lg:order-2 lg:sticky lg:top-4">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Vista previa</span>
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> En vivo
            </span>
          </div>
          <LivePreviewResenas />
          <p className="text-[11px] text-slate-500 text-center mt-2 leading-relaxed px-2">
            Tras una buena experiencia, el cliente deja su reseña en Google Maps.
          </p>
        </div>
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
          <h1 className="text-xl md:text-2xl font-bold text-primary truncate">Google</h1>
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
