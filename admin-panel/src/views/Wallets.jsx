import { useState, useEffect } from 'react';
import { doc, onSnapshot, collection, query, where, getCountFromServer } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';
import {
  Wallet, MapPin, Palette, Save, CheckCircle2, AlertCircle, Loader2,
  Store, Users, Sparkles, Power, Crown, MapPinned, BellRing, RefreshCw, ArrowRight,
} from 'lucide-react';
import { db } from '../lib/firebase';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';

// Ruta del doc de config por tenant (mismo criterio que las CFs de wallet).
const cfgPath = (tid) => (tid === 'elegance' ? 'configuracion/wallet' : `tenants/${tid}/configuracion/wallet`);
const usersPath = (tid) => (tid === 'elegance' ? 'users' : `tenants/${tid}/users`);

export default function Wallets() {
  const { id: tenantId, name: tenantName, logo: tenantLogo } = useTenant();
  const { role } = useAuth();
  const isAdmin = role === 'admin' || role === 'jefe';

  const [form, setForm] = useState({
    enabled: false,
    programName: '',
    issuerName: '',
    accent: '#c9a84c',
    bg: '#0a0a0a',
    logoUrl: '',
    lat: '',
    lng: '',
  });
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [savedCount, setSavedCount] = useState(null);
  // Add-on pagado: _billing/{tid}.walletActivo (null = cargando).
  const [walletActivo, setWalletActivo] = useState(null);

  useEffect(() => {
    if (!tenantId) return;
    const unsub = onSnapshot(
      doc(db, '_billing', tenantId),
      (snap) => setWalletActivo(snap.exists() && snap.data().walletActivo === true),
      () => setWalletActivo(false),
    );
    return () => unsub();
  }, [tenantId]);

  // Prefill desde configuracion/wallet.
  useEffect(() => {
    if (!tenantId) return;
    const unsub = onSnapshot(
      doc(db, cfgPath(tenantId)),
      (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setForm((f) => ({
            ...f,
            enabled: d.enabled ?? f.enabled,
            programName: d.programName ?? f.programName,
            issuerName: d.issuerName ?? f.issuerName,
            accent: d.accent ?? f.accent,
            bg: d.bg ?? f.bg,
            logoUrl: d.logoUrl ?? f.logoUrl,
            lat: d.location?.lat ?? f.lat,
            lng: d.location?.lng ?? f.lng,
          }));
        }
        setLoaded(true);
      },
      () => setLoaded(true),
    );
    return () => unsub();
  }, [tenantId]);

  // Defaults sensatos la primera vez (nombre del programa + emisor + logo del tenant).
  useEffect(() => {
    if (!loaded) return;
    setForm((f) => ({
      ...f,
      programName: f.programName || `Club ${tenantName || ''}`.trim(),
      issuerName: f.issuerName || tenantName || 'SynapTech',
      logoUrl: f.logoUrl || (typeof tenantLogo === 'string' && /^https:\/\//.test(tenantLogo) ? tenantLogo : ''),
    }));
  }, [loaded, tenantName, tenantLogo]);

  // Cuántos clientes guardaron su tarjeta (best-effort).
  useEffect(() => {
    if (!tenantId) return;
    (async () => {
      try {
        const q = query(collection(db, usersPath(tenantId)), where('walletObjectId', '!=', null));
        const agg = await getCountFromServer(q);
        setSavedCount(agg.data().count);
      } catch { setSavedCount(null); }
    })();
  }, [tenantId, saving]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function guardar() {
    setSaving(true);
    setMsg(null);
    try {
      const config = {
        enabled: form.enabled,
        programName: form.programName.trim(),
        issuerName: form.issuerName.trim(),
        accent: form.accent,
        bg: form.bg,
        logoUrl: form.logoUrl.trim() || null,
        location: (form.lat !== '' && form.lng !== '')
          ? { lat: Number(form.lat), lng: Number(form.lng) }
          : null,
      };
      const fn = httpsCallable(getFunctions(getApp(), 'us-central1'), 'walletProvisionarClase');
      const res = await fn({ tenantId, config });
      setMsg({ ok: true, text: `Tarjeta ${res.data?.result === 'created' ? 'creada' : 'actualizada'} correctamente.` });
    } catch (err) {
      setMsg({ ok: false, text: err.message || 'No se pudo guardar. Reintenta.' });
    } finally {
      setSaving(false);
    }
  }

  if (!isAdmin) {
    return (
      <div className="px-4 sm:px-6 py-6 max-w-3xl mx-auto">
        <p className="text-sm text-slate-400">Solo el administrador del local puede configurar el Wallet.</p>
      </div>
    );
  }

  // Cargando estado del add-on.
  if (walletActivo === null) {
    return (
      <div className="px-4 sm:px-6 py-20 flex justify-center">
        <Loader2 size={22} className="animate-spin text-slate-500" />
      </div>
    );
  }

  // Add-on no contratado → pantalla de venta (upsell).
  if (!walletActivo) {
    return <UpsellWallet tenantName={tenantName} />;
  }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-amber-400/15 [html.light_&]:bg-amber-100 flex items-center justify-center shrink-0">
          <Wallet size={22} className="text-amber-400 [html.light_&]:text-amber-700" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-white [html.light_&]:text-slate-900">Wallet</h1>
          <p className="text-sm text-slate-400 [html.light_&]:text-slate-600 mt-1">
            Tus clientes llevan sus sellos y rango en su Google Wallet. Se actualizan solos y reciben un aviso
            al pasar cerca del local (geo-push).
          </p>
        </div>
      </div>

      {msg && (
        <div className={`mb-5 flex items-center gap-2 p-3 rounded-xl text-sm ${
          msg.ok ? 'bg-emerald-950/30 border border-emerald-800/30 text-emerald-300'
                 : 'bg-red-950/30 border border-red-800/30 text-red-300'
        }`}>
          {msg.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
          {msg.text}
        </div>
      )}

      {/* Toggle activar */}
      <div className="rounded-2xl border border-slate-800 [html.light_&]:border-slate-200 bg-slate-900/40 [html.light_&]:bg-white p-5 mb-4">
        <label className="flex items-center justify-between gap-4 cursor-pointer">
          <div className="flex items-center gap-3 min-w-0">
            <Power size={18} className={form.enabled ? 'text-emerald-400' : 'text-slate-500'} />
            <div className="min-w-0">
              <p className="font-semibold text-white [html.light_&]:text-slate-900">Wallet activo</p>
              <p className="text-xs text-slate-400 [html.light_&]:text-slate-600">
                Habilita el botón "Añadir a Google Wallet" en la vista de sellos del cliente.
              </p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
            className="w-5 h-5 accent-emerald-500 shrink-0"
          />
        </label>
      </div>

      {/* Branding */}
      <div className="rounded-2xl border border-slate-800 [html.light_&]:border-slate-200 bg-slate-900/40 [html.light_&]:bg-white p-5 mb-4 space-y-4">
        <div className="flex items-center gap-2 text-slate-300 [html.light_&]:text-slate-700">
          <Store size={16} /> <h3 className="font-semibold">Marca de la tarjeta</h3>
        </div>

        <Field label="Nombre del programa">
          <input value={form.programName} onChange={set('programName')} placeholder="Club Elegance"
            className="input" />
        </Field>
        <Field label="Nombre del emisor (tu local)">
          <input value={form.issuerName} onChange={set('issuerName')} placeholder={tenantName || 'Tu barbería'}
            className="input" />
        </Field>
        <Field label="Logo (URL https pública)" hint="Se muestra en la tarjeta. Debe ser un enlace público https.">
          <input value={form.logoUrl} onChange={set('logoUrl')} placeholder="https://…/logo.png"
            className="input" />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Color de marca">
            <div className="flex items-center gap-2">
              <input type="color" value={form.accent} onChange={set('accent')}
                className="w-9 h-9 rounded-lg bg-transparent border border-slate-700 cursor-pointer shrink-0" />
              <input value={form.accent} onChange={set('accent')} className="input" />
            </div>
          </Field>
          <Field label="Fondo de la tarjeta">
            <div className="flex items-center gap-2">
              <input type="color" value={form.bg} onChange={set('bg')}
                className="w-9 h-9 rounded-lg bg-transparent border border-slate-700 cursor-pointer shrink-0" />
              <input value={form.bg} onChange={set('bg')} className="input" />
            </div>
          </Field>
        </div>

        {/* Previsualización de las estampas */}
        <Field label="Vista previa de las estampas">
          <img
            alt="Vista previa"
            src={`https://us-central1-barberia-elegance.cloudfunctions.net/walletStampImg?f=7&t=10&c=${encodeURIComponent(form.accent.replace('#', ''))}`}
            className="w-full rounded-xl border border-slate-800 [html.light_&]:border-slate-200"
            style={{ background: form.bg }}
          />
        </Field>
      </div>

      {/* Geo-push */}
      <div className="rounded-2xl border border-slate-800 [html.light_&]:border-slate-200 bg-slate-900/40 [html.light_&]:bg-white p-5 mb-4 space-y-4">
        <div className="flex items-center gap-2 text-slate-300 [html.light_&]:text-slate-700">
          <MapPin size={16} /> <h3 className="font-semibold">Geo-push (ubicación del local)</h3>
        </div>
        <p className="text-xs text-slate-400 [html.light_&]:text-slate-600 -mt-1">
          Cuando el cliente pase cerca, su tarjeta aparece en la pantalla de bloqueo. Copia las coordenadas
          desde Google Maps (clic derecho sobre tu local → "¿Qué hay aquí?").
        </p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Latitud">
            <input value={form.lat} onChange={set('lat')} inputMode="decimal" placeholder="-33.0472" className="input" />
          </Field>
          <Field label="Longitud">
            <input value={form.lng} onChange={set('lng')} inputMode="decimal" placeholder="-71.6127" className="input" />
          </Field>
        </div>
      </div>

      {/* Stats + guardar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-slate-400 [html.light_&]:text-slate-600">
          <Users size={15} />
          {savedCount == null ? 'Tarjetas guardadas: —' : `${savedCount} cliente${savedCount === 1 ? '' : 's'} guardó su tarjeta`}
        </div>
        <button
          onClick={guardar}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 transition-transform active:scale-95 disabled:opacity-60"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {saving ? 'Guardando…' : 'Guardar y provisionar'}
        </button>
      </div>

      <p className="flex items-center gap-1.5 text-xs text-slate-500 mt-6">
        <Sparkles size={12} /> Apple Wallet llegará en una fase futura. Hoy solo Google Wallet (Android).
      </p>

      {/* Estilos de input compartidos (Tailwind @apply no está disponible en JSX inline) */}
      <style>{`
        .input {
          width: 100%;
          background: rgba(15,23,42,0.6);
          border: 1px solid rgb(51,65,85);
          border-radius: 0.6rem;
          padding: 0.5rem 0.7rem;
          font-size: 0.875rem;
          color: white;
          outline: none;
        }
        .input:focus { border-color: #fbbf24; }
        html.light .input { background: white; color: #0f172a; border-color: rgb(203,213,225); }
      `}</style>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-400 [html.light_&]:text-slate-600 mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-slate-500 mt-1">{hint}</span>}
    </label>
  );
}

// Pantalla de venta cuando el local aún no contrató el add-on Wallet.
// Copy tipo agencia creativa — el geo-push es el gancho estrella.
// El flag pagado (_billing/{tid}.walletActivo) solo lo enciende SynapTech.
function UpsellWallet({ tenantName }) {
  const waMsg = encodeURIComponent(
    `Hola SynapTech, quiero activar el módulo Wallet (tarjeta de fidelidad + geo-push) para mi local ${tenantName || ''}.`.trim(),
  );
  const waUrl = `https://wa.me/56983568212?text=${waMsg}`;
  const PRECIO = '9.990'; // CLP/mes · cambiar acá si ajustas el precio

  const HOOKS = [
    { Icon: MapPinned, titulo: 'Aparece cuando pasa cerca', desc: 'Su tarjeta salta sola a la pantalla de bloqueo al acercarse a tu local. El recordatorio perfecto, en el segundo perfecto.', star: true },
    { Icon: RefreshCw, titulo: 'Se llena sola', desc: 'Cada sello y su rango se actualizan en su celular sin que abra nada. Magia invisible.' },
    { Icon: BellRing, titulo: 'Le grita cuando gana', desc: 'Al desbloquear un premio, su celular se lo notifica. Y vuelve por él.' },
    { Icon: Wallet, titulo: 'Imposible de perder', desc: 'Vive en Google Wallet, junto a sus tarjetas y pases. No se desinstala, no se olvida.' },
  ];

  return (
    <div className="px-4 sm:px-6 py-6 max-w-4xl mx-auto">
      {/* ── HERO grande ── */}
      <div className="relative overflow-hidden rounded-[2rem] border border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-slate-950/60 to-slate-950/60 [html.light_&]:from-amber-50 [html.light_&]:via-white [html.light_&]:to-white px-6 sm:px-10 py-12 sm:py-16 mb-6 text-center">
        {/* Glows */}
        <div className="absolute -top-20 -right-16 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.22) 0%, transparent 70%)' }} />
        <div className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.10) 0%, transparent 70%)' }} />

        <div className="relative">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded-full bg-amber-400/15 text-amber-300 [html.light_&]:bg-amber-100 [html.light_&]:text-amber-700 mb-6">
            <Crown size={13} /> Módulo Premium · Google Wallet
          </span>

          {/* Radar de geo-push */}
          <div className="relative mx-auto mb-7 w-24 h-24 flex items-center justify-center">
            <span className="wl-radar" /><span className="wl-radar wl-radar-2" />
            <div className="relative z-10 w-16 h-16 rounded-2xl bg-amber-400 flex items-center justify-center shadow-[0_0_40px_rgba(251,191,36,0.5)]">
              <MapPinned size={30} className="text-slate-900" />
            </div>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black leading-[1.05] tracking-tight text-white [html.light_&]:text-slate-900">
            Cuando tu cliente pase cerca,<br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-500">
              su celular le hablará de ti.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 [html.light_&]:text-slate-600 mt-5 max-w-2xl mx-auto leading-relaxed">
            La tarjeta de fidelidad de tu barbería, viva en el celular de cada cliente. Con <strong className="text-amber-300 [html.light_&]:text-amber-700">geo-push</strong>,
            aparece sola en su pantalla justo cuando camina a una cuadra. Sin apps. Sin que abra nada.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3">
            <p className="text-sm text-slate-400 [html.light_&]:text-slate-600">
              Desde{' '}
              <span className="text-3xl font-black text-amber-300 [html.light_&]:text-amber-600 align-middle">${PRECIO}</span>
              <span className="text-sm font-semibold text-slate-300 [html.light_&]:text-slate-700">/mes</span>
            </p>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-black text-slate-900 bg-amber-400 hover:bg-amber-300 shadow-[0_10px_30px_-8px_rgba(251,191,36,0.6)] transition-transform active:scale-95"
            >
              Quiero esto en mi barbería <ArrowRight size={18} />
            </a>
            <p className="text-xs text-slate-500">Add-on mensual · lo activamos por ti en minutos</p>
          </div>
        </div>
      </div>

      {/* ── Ganchos ── */}
      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        {HOOKS.map(({ Icon, titulo, desc, star }) => (
          <div key={titulo}
            className={`rounded-2xl border p-5 transition-colors ${
              star
                ? 'border-amber-500/40 bg-amber-500/[0.06] [html.light_&]:bg-amber-50'
                : 'border-slate-800 [html.light_&]:border-slate-200 bg-slate-900/40 [html.light_&]:bg-white'
            }`}>
            <div className="flex items-center gap-2.5 mb-2">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                star ? 'bg-amber-400/20' : 'bg-slate-800/60 [html.light_&]:bg-slate-100'
              }`}>
                <Icon size={18} className="text-amber-400 [html.light_&]:text-amber-700" />
              </div>
              <h3 className="font-bold text-white [html.light_&]:text-slate-900">{titulo}</h3>
              {star && <span className="ml-auto text-[9px] font-black uppercase tracking-widest text-amber-400">★ Estrella</span>}
            </div>
            <p className="text-sm text-slate-400 [html.light_&]:text-slate-600 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      {/* ── Cierre + CTA ── */}
      <div className="rounded-2xl border border-slate-800 [html.light_&]:border-slate-200 bg-slate-900/40 [html.light_&]:bg-white p-7 text-center">
        <p className="text-lg font-bold text-white [html.light_&]:text-slate-900 mb-1">
          Fidelización que trabaja incluso con el local cerrado.
        </p>
        <p className="text-sm text-slate-400 [html.light_&]:text-slate-600 mb-5 max-w-lg mx-auto">
          Tú atiendes; el geo-push trae a la gente de vuelta. Escríbenos y lo dejamos andando en tu barbería.
        </p>
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 transition-transform active:scale-95"
        >
          Activar el módulo <ArrowRight size={16} />
        </a>
        <div className="flex items-center justify-center gap-2 mt-6 opacity-70">
          <img src="/synaptech/ig.png" alt="SynapTech" className="w-4 h-4 rounded object-contain" />
          <span className="text-[11px] text-slate-500">Powered by SynapTech</span>
        </div>
      </div>

      <style>{`
        .wl-radar {
          position: absolute; inset: 0; border-radius: 9999px;
          background: rgba(251,191,36,0.35);
          animation: wl-radar-pulse 2.4s ease-out infinite;
        }
        .wl-radar-2 { animation-delay: 1.2s; }
        @keyframes wl-radar-pulse {
          0%   { transform: scale(0.5); opacity: 0.7; }
          100% { transform: scale(1.9); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) { .wl-radar { animation: none; opacity: 0; } }
      `}</style>
    </div>
  );
}
