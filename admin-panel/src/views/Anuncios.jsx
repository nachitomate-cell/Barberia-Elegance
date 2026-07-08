import { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot, doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  Send, History, Settings, BellRing, Users, MessageCircle, Loader2,
  ChevronRight, AlertTriangle, Check, X, Eye, TrendingUp, Ban, Clock,
  Target, MousePointerClick, DollarSign,
} from 'lucide-react';
import { tenantCol, tenantDoc, resolveTenantId, isMultiSedeTenant, KRONNOS_SEDES } from '../lib/tenantUtils';
import { db } from '../lib/firebase';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';

const TABS = [
  { id: 'nuevo',    label: 'Nuevo',    Icon: Send },
  { id: 'historial', label: 'Historial', Icon: History },
  { id: 'ajustes',  label: 'Ajustes',  Icon: Settings },
];

const RANGOS = [
  { id: 'silver',   label: 'Silver o superior',   emoji: '🥈' },
  { id: 'gold',     label: 'Gold o superior',     emoji: '🥇' },
  { id: 'platinum', label: 'Solo Platinum',       emoji: '💎' },
];

/* ═══════════════════════════════════════════════════════════════ */
/*  MAIN                                                            */
/* ═══════════════════════════════════════════════════════════════ */
export default function Anuncios() {
  const { id: tenantId, name: shopName } = useTenant();
  const { user } = useAuth();
  const [tab, setTab] = useState('nuevo');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600">
            <BellRing size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Anuncios</h1>
            <p className="text-sm text-slate-400">Push publicitario a tus clientes del Club — {shopName}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 bg-slate-900/60 rounded-xl border border-slate-800">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all ${
                tab === t.id
                  ? 'bg-slate-800 text-white shadow-inner'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <t.Icon size={15} />
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'nuevo' && <TabNuevo tenantId={tenantId} shopName={shopName} user={user} />}
        {tab === 'historial' && <TabHistorial tenantId={tenantId} />}
        {tab === 'ajustes' && <TabAjustes tenantId={tenantId} />}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  TAB NUEVO                                                       */
/* ═══════════════════════════════════════════════════════════════ */
function TabNuevo({ tenantId, shopName, user }) {
  const isMultiSede = useMemo(() => isMultiSedeTenant(tenantId), [tenantId]);
  const [titulo, setTitulo] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [ctaTexto, setCtaTexto] = useState('Reservar ahora');
  const [ctaUrl, setCtaUrl] = useState('/agenda');
  const [rangoMin, setRangoMin] = useState('');
  const [sedeCanjeEn, setSedeCanjeEn] = useState('');
  const [ultimaVisitaDesde, setUltimaVisitaDesde] = useState('');
  const [ultimaVisitaHasta, setUltimaVisitaHasta] = useState('');
  const [excluirConCita72h, setExcluirConCita72h] = useState(true);

  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const targeting = useMemo(() => ({
    rangoMin: rangoMin || undefined,
    sedeCanjeEn: sedeCanjeEn || undefined,
    ultimaVisitaDesde: ultimaVisitaDesde || undefined,
    ultimaVisitaHasta: ultimaVisitaHasta || undefined,
    excluirConCita72h,
  }), [rangoMin, sedeCanjeEn, ultimaVisitaDesde, ultimaVisitaHasta, excluirConCita72h]);

  async function verAudiencia() {
    setPreviewLoading(true);
    setError('');
    try {
      const fn = httpsCallable(getFunctions(undefined, 'us-central1'), 'previewAudienciaAnuncio');
      const res = await fn({ tenantId, targeting });
      setPreview(res.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function enviarPrueba() {
    setEnviando(true);
    setError('');
    setResult(null);
    try {
      const fn = httpsCallable(getFunctions(undefined, 'us-central1'), 'enviarAnuncioCliente');
      const res = await fn({ tenantId, titulo, mensaje, ctaUrl, ctaTexto, targeting, isTest: true });
      setResult({ isTest: true, ...res.data });
    } catch (e) {
      setError(e.message);
    } finally {
      setEnviando(false);
    }
  }

  async function enviarBroadcast() {
    setEnviando(true);
    setConfirmando(false);
    setError('');
    setResult(null);
    try {
      const fn = httpsCallable(getFunctions(undefined, 'us-central1'), 'enviarAnuncioCliente');
      const res = await fn({ tenantId, titulo, mensaje, ctaUrl, ctaTexto, targeting, isTest: false });
      setResult(res.data);
      // Limpiar form
      setTitulo(''); setMensaje(''); setPreview(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setEnviando(false);
    }
  }

  const puedeEnviar = titulo.trim() && mensaje.trim() && titulo.length <= 60 && mensaje.length <= 240;

  return (
    <div className="space-y-4">
      {/* Composer */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">Compositor</h2>

        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Título · máx 60 caracteres</label>
        <input
          type="text" value={titulo} onChange={e => setTitulo(e.target.value.slice(0, 60))}
          placeholder="¡Ven este viernes!"
          className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm mb-1 focus:outline-none focus:border-violet-500"
        />
        <div className="flex justify-between text-[10px] text-slate-500 mb-4">
          <span>Aparece como negrita en la notificación</span>
          <span>{titulo.length}/60</span>
        </div>

        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Mensaje · máx 240 caracteres</label>
        <textarea
          value={mensaje} onChange={e => setMensaje(e.target.value.slice(0, 240))}
          rows={3}
          placeholder="2x1 en cortes hasta el domingo. Reserva ya con tu barbero de siempre."
          className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm mb-1 focus:outline-none focus:border-violet-500 resize-none"
        />
        <div className="flex justify-between text-[10px] text-slate-500 mb-4">
          <span>Aparece como cuerpo de la notificación</span>
          <span>{mensaje.length}/240</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Texto del botón</label>
            <input
              type="text" value={ctaTexto} onChange={e => setCtaTexto(e.target.value.slice(0, 24))}
              className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">URL destino</label>
            <input
              type="text" value={ctaUrl} onChange={e => setCtaUrl(e.target.value)}
              placeholder="/agenda"
              className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
            />
          </div>
        </div>
      </div>

      {/* Preview visual */}
      {(titulo || mensaje) && (
        <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">Preview</h2>
          <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 max-w-sm mx-auto">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-slate-300 truncate">{shopName}</span>
                  <span className="text-[10px] text-slate-500">ahora</span>
                </div>
                <p className="text-[13px] font-bold text-white mt-0.5 leading-tight">{titulo || 'Título'}</p>
                <p className="text-[12px] text-slate-300 mt-0.5 leading-snug break-words">{mensaje || 'Mensaje del anuncio'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Targeting */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Target size={15} className="text-violet-400" />
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Segmentación</h2>
        </div>

        {/* Rango */}
        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Rango mínimo</label>
        <div className="grid grid-cols-4 gap-2 mb-4">
          <button
            onClick={() => setRangoMin('')}
            className={`py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
              !rangoMin ? 'bg-violet-600 text-white' : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800'
            }`}
          >
            Todos
          </button>
          {RANGOS.map(r => (
            <button
              key={r.id}
              onClick={() => setRangoMin(r.id)}
              className={`py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
                rangoMin === r.id ? 'bg-violet-600 text-white' : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800'
              }`}
            >
              {r.emoji} {r.label.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* Sede (solo Kronnos) */}
        {isMultiSede && (
          <>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Sede predominante <span className="text-slate-500 font-normal">(donde acumulan más sellos)</span>
            </label>
            <div className="grid grid-cols-4 gap-2 mb-4">
              <button
                onClick={() => setSedeCanjeEn('')}
                className={`py-2 rounded-lg text-xs font-semibold transition-all ${
                  !sedeCanjeEn ? 'bg-violet-600 text-white' : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800'
                }`}
              >
                Cualquiera
              </button>
              {KRONNOS_SEDES.map(s => (
                <button
                  key={s}
                  onClick={() => setSedeCanjeEn(s)}
                  className={`py-2 rounded-lg text-xs font-semibold capitalize transition-all ${
                    sedeCanjeEn === s ? 'bg-violet-600 text-white' : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Última visita rango */}
        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Última visita</label>
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div>
            <label className="text-[10px] text-slate-500">Desde</label>
            <input type="date" value={ultimaVisitaDesde} onChange={e => setUltimaVisitaDesde(e.target.value)}
              className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-violet-500" />
          </div>
          <div>
            <label className="text-[10px] text-slate-500">Hasta</label>
            <input type="date" value={ultimaVisitaHasta} onChange={e => setUltimaVisitaHasta(e.target.value)}
              className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-violet-500" />
          </div>
        </div>

        {/* Excluir con cita 72h */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={excluirConCita72h} onChange={e => setExcluirConCita72h(e.target.checked)}
            className="accent-violet-600" />
          <span className="text-xs text-slate-300">Excluir clientes con cita en las próximas 72h</span>
        </label>
      </div>

      {/* Preview audiencia */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users size={15} className="text-violet-400" />
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Audiencia</h2>
          </div>
          <button
            onClick={verAudiencia}
            disabled={previewLoading}
            className="text-xs font-semibold text-violet-400 hover:text-violet-300 flex items-center gap-1 disabled:opacity-50"
          >
            {previewLoading ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />}
            Calcular alcance
          </button>
        </div>
        {preview ? (
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
              <p className="text-2xl font-bold text-emerald-400">{preview.enviables}</p>
              <p className="text-[10px] text-emerald-400/70 uppercase tracking-wider mt-1">Recibirán</p>
            </div>
            <div className="bg-slate-800/60 rounded-lg p-3">
              <p className="text-2xl font-bold text-slate-300">{preview.targeted}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Segmentados</p>
            </div>
            <div className="col-span-2 text-[10px] text-slate-500 grid grid-cols-2 gap-y-1 mt-1">
              <span>Opt-out: {preview.skippedOptOut}</span>
              <span>Con cita 72h: {preview.skippedCita}</span>
              <span>Cooldown 7d: {preview.skippedCooldown}</span>
              <span>Cap 2/mes: {preview.skippedMonth}</span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500 text-center py-4">Haz clic en "Calcular alcance" para ver la audiencia.</p>
        )}
      </div>

      {/* Errores + Resultado */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}
      {result && (
        <div className={`${result.isTest ? 'bg-blue-500/10 border-blue-500/30' : 'bg-emerald-500/10 border-emerald-500/30'} border rounded-lg p-4`}>
          <div className="flex items-center gap-2 mb-2">
            <Check size={15} className={result.isTest ? 'text-blue-400' : 'text-emerald-400'} />
            <p className={`text-sm font-bold ${result.isTest ? 'text-blue-300' : 'text-emerald-300'}`}>
              {result.isTest ? 'Enviado de prueba a ti' : `Anuncio enviado`}
            </p>
          </div>
          <p className="text-xs text-slate-300">
            {result.stats?.delivered ?? 0} devices recibieron el push · {result.stats?.failed ?? 0} fallos
          </p>
        </div>
      )}

      {/* Botones acción */}
      <div className="flex gap-2 sticky bottom-4">
        <button
          onClick={enviarPrueba}
          disabled={!puedeEnviar || enviando}
          className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
        >
          {enviando ? <Loader2 size={15} className="animate-spin" /> : <Eye size={15} />}
          Prueba a mí
        </button>
        <button
          onClick={() => setConfirmando(true)}
          disabled={!puedeEnviar || enviando}
          className="flex-[2] bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-lg shadow-violet-500/30"
        >
          <Send size={15} />
          Enviar broadcast
        </button>
      </div>

      {/* Modal confirmación */}
      {confirmando && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setConfirmando(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <AlertTriangle size={18} className="text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-white">¿Confirmar envío?</h3>
            </div>
            <p className="text-sm text-slate-300 mb-2">
              Se enviará a <span className="font-bold text-white">{preview?.enviables ?? '?'}</span> clientes del Club.
            </p>
            <p className="text-xs text-slate-500 mb-6">
              Recuerda: máx 2 pushes por cliente al mes, cooldown 7 días. Los que exceden se saltan automáticamente.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmando(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-lg text-sm font-semibold">
                Cancelar
              </button>
              <button onClick={enviarBroadcast}
                className="flex-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white py-2.5 rounded-lg text-sm font-bold">
                Sí, enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  TAB HISTORIAL                                                   */
/* ═══════════════════════════════════════════════════════════════ */
function TabHistorial({ tenantId }) {
  const [anuncios, setAnuncios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    const ref = tenantCol('anuncios');
    const q = query(ref, orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setAnuncios(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [tenantId]);

  if (loading) {
    return <div className="text-center py-8 text-slate-500"><Loader2 className="animate-spin mx-auto" /></div>;
  }
  if (!anuncios.length) {
    return (
      <div className="text-center py-12 text-slate-500">
        <History size={32} className="mx-auto mb-3 text-slate-700" />
        <p className="text-sm">Aún no has enviado anuncios.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {anuncios.map(a => {
        const s = a.stats || {};
        const openRate = s.delivered > 0 ? Math.round((s.opened / s.delivered) * 100) : 0;
        const convRate = s.opened > 0 ? Math.round((s.converted / s.opened) * 100) : 0;
        const isExpanded = expanded === a.id;
        return (
          <div key={a.id} className="bg-slate-900/60 rounded-2xl border border-slate-800">
            <button
              onClick={() => setExpanded(isExpanded ? null : a.id)}
              className="w-full text-left p-4 flex items-start gap-3 hover:bg-slate-900/80 transition-colors rounded-2xl"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {a.isTest && <span className="text-[9px] font-bold bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded uppercase">Test</span>}
                  <p className="text-sm font-bold text-white truncate">{a.titulo}</p>
                </div>
                <p className="text-xs text-slate-400 truncate mb-2">{a.mensaje}</p>
                <div className="flex items-center gap-4 text-[11px]">
                  <span className="flex items-center gap-1 text-slate-500">
                    <Users size={11} /> {s.delivered ?? 0}
                  </span>
                  <span className="flex items-center gap-1 text-blue-400">
                    <MousePointerClick size={11} /> {s.opened ?? 0} <span className="text-slate-500">({openRate}%)</span>
                  </span>
                  <span className="flex items-center gap-1 text-emerald-400">
                    <TrendingUp size={11} /> {s.converted ?? 0} <span className="text-slate-500">({convRate}%)</span>
                  </span>
                </div>
              </div>
              <ChevronRight size={16} className={`text-slate-600 mt-1 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            </button>

            {isExpanded && (
              <div className="border-t border-slate-800 p-4 grid grid-cols-3 gap-2 text-center">
                <Stat label="Segmentados" value={s.targeted ?? 0} />
                <Stat label="Intentos" value={s.attempted ?? 0} />
                <Stat label="Devices OK" value={s.delivered ?? 0} tone="emerald" />
                <Stat label="Opt-out" value={s.skippedOptOut ?? 0} tone="slate" small />
                <Stat label="Con cita 72h" value={s.skippedCita ?? 0} tone="slate" small />
                <Stat label="Cooldown" value={s.skippedCooldown ?? 0} tone="slate" small />
                <Stat label="Cap mes" value={s.skippedMonth ?? 0} tone="slate" small />
                <Stat label="Fallos" value={s.failed ?? 0} tone="red" small />
                <Stat label="Tokens purgados" value={s.invalidTokensPurged ?? 0} tone="slate" small />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Stat({ label, value, tone = 'white', small }) {
  const color = { white: 'text-white', emerald: 'text-emerald-400', red: 'text-red-400', slate: 'text-slate-400' }[tone];
  return (
    <div className={`${small ? 'p-2' : 'p-3'} bg-slate-800/40 rounded-lg`}>
      <p className={`${small ? 'text-sm' : 'text-lg'} font-bold ${color}`}>{value}</p>
      <p className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">{label}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  TAB AJUSTES                                                     */
/* ═══════════════════════════════════════════════════════════════ */
function TabAjustes({ tenantId }) {
  const [cfg, setCfg] = useState({
    maxPerMonthPerUser: 2,
    cooldownDays: 7,
    ventanaHoraInicio: 10,
    ventanaHoraFin: 20,
    capBroadcastsPerDay: 3,
  });
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [optOutCount, setOptOutCount] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(tenantDoc('configuracion', 'anuncios'));
        if (snap.exists()) setCfg(prev => ({ ...prev, ...snap.data() }));
      } catch {}
      setLoading(false);
    })();
  }, [tenantId]);

  useEffect(() => {
    const ref = tenantCol('anuncios_optout');
    const unsub = onSnapshot(ref, snap => setOptOutCount(snap.size), () => {});
    return unsub;
  }, [tenantId]);

  async function guardar() {
    await setDoc(tenantDoc('configuracion', 'anuncios'), cfg, { merge: true });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) return <div className="text-center py-8"><Loader2 className="animate-spin mx-auto text-slate-500" /></div>;

  return (
    <div className="space-y-4">
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Settings size={14} /> Reglas duras
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <NumberField label="Máx pushes/mes por cliente" value={cfg.maxPerMonthPerUser}
            onChange={v => setCfg({ ...cfg, maxPerMonthPerUser: v })} hint="Recomendado: 2. Above 3 → churn." />
          <NumberField label="Cooldown días entre pushes" value={cfg.cooldownDays}
            onChange={v => setCfg({ ...cfg, cooldownDays: v })} hint="Recomendado: 7. Mínimo: 3." />
          <NumberField label="Hora inicio ventana" value={cfg.ventanaHoraInicio}
            onChange={v => setCfg({ ...cfg, ventanaHoraInicio: v })} hint="Formato 24h. Chile local." />
          <NumberField label="Hora fin ventana" value={cfg.ventanaHoraFin}
            onChange={v => setCfg({ ...cfg, ventanaHoraFin: v })} hint="Formato 24h. Nada nocturno." />
          <NumberField label="Máx broadcasts/día (por admin)" value={cfg.capBroadcastsPerDay}
            onChange={v => setCfg({ ...cfg, capBroadcastsPerDay: v })} hint="Recomendado: 3." />
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button onClick={guardar}
            className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2">
            <Check size={14} /> Guardar
          </button>
          {saved && <span className="text-xs text-emerald-400">Guardado ✓</span>}
        </div>
      </div>

      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Ban size={14} className="text-slate-400" />
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Opt-out</h2>
        </div>
        <p className="text-sm text-slate-300">
          <span className="text-2xl font-bold text-white">{optOutCount}</span> clientes se dieron de baja
        </p>
        <p className="text-xs text-slate-500 mt-1">Se excluyen automáticamente de todos los broadcasts.</p>
      </div>
    </div>
  );
}

function NumberField({ label, value, onChange, hint }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 mb-1.5">{label}</label>
      <input type="number" value={value} onChange={e => onChange(parseInt(e.target.value, 10) || 0)}
        className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500" />
      {hint && <p className="text-[10px] text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}
