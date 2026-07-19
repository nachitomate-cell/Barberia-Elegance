import { useState, useEffect } from 'react';
import { doc, onSnapshot, collection, query, where, getCountFromServer } from 'firebase/firestore';
import {
  Wallet, Loader2, Users, Eye, EyeOff, ExternalLink, Sparkles,
  Crown, MapPinned, BellRing, RefreshCw, ArrowRight,
} from 'lucide-react';
import { db } from '../lib/firebase';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';

// La PERSONALIZACIÓN de la tarjeta vive en su propio estudio (wallets.bioo.cl).
// Esta vista es el launcher: estado del módulo + botón al estudio + upsell.
const WALLETS_BIOO_URL = 'https://wallets.bioo.cl';

// Ruta del doc de config por tenant (mismo criterio que las CFs de wallet).
const cfgPath = (tid) => (tid === 'elegance' ? 'configuracion/wallet' : `tenants/${tid}/configuracion/wallet`);
const usersPath = (tid) => (tid === 'elegance' ? 'users' : `tenants/${tid}/users`);

export default function Wallets() {
  const { id: tenantId, name: tenantName } = useTenant();
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  const [savedCount, setSavedCount] = useState(null);
  // Visibilidad para clientes: configuracion/wallet.enabled (se edita en el estudio).
  const [enabled, setEnabled] = useState(null);
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

  useEffect(() => {
    if (!tenantId) return;
    const unsub = onSnapshot(
      doc(db, cfgPath(tenantId)),
      (snap) => setEnabled(snap.exists() && snap.data().enabled === true),
      () => setEnabled(false),
    );
    return () => unsub();
  }, [tenantId]);

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
  }, [tenantId]);

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

  // ── Módulo ACTIVO → launcher al estudio wallets.bioo.cl ──────────
  return (
    <div className="px-4 sm:px-6 py-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-amber-400/15 [html.light_&]:bg-amber-100 flex items-center justify-center shrink-0">
          <Wallet size={22} className="text-amber-400 [html.light_&]:text-amber-700" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-primary [html.light_&]:text-ink-900">Wallet</h1>
          <p className="text-sm text-slate-400 [html.light_&]:text-ink-600 mt-1">
            Tus clientes llevan sus sellos y rango en el wallet de su celular. Se actualizan solos y reciben
            un aviso al pasar cerca del local (geo-push).
          </p>
        </div>
      </div>

      {/* Hero launcher → estudio de diseño */}
      <div className="relative overflow-hidden rounded-[2rem] border border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-slate-950/60 to-slate-950/60 [html.light_&]:from-amber-50 [html.light_&]:via-white [html.light_&]:to-white px-6 sm:px-10 py-10 sm:py-12 mb-4 text-center">
        <div className="absolute -top-20 -right-16 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.18) 0%, transparent 70%)' }} />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded-full bg-emerald-400/15 text-emerald-300 [html.light_&]:bg-emerald-100 [html.light_&]:text-emerald-700 mb-5">
            ● Módulo activo
          </span>
          <h2 className="text-2xl sm:text-3xl font-black leading-tight tracking-tight text-primary [html.light_&]:text-ink-900">
            Diseña tu tarjeta en{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-500">
              Wallets · bioo
            </span>
          </h2>
          <p className="text-sm sm:text-base text-slate-300 [html.light_&]:text-ink-600 mt-3 max-w-xl mx-auto leading-relaxed">
            Colores, logo, geo-push y visibilidad para tus clientes: todo se personaliza en el estudio,
            con vista previa en vivo de cómo quedará la tarjeta.
          </p>
          <a
            href={WALLETS_BIOO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-7 inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-black text-ink-900 bg-amber-400 hover:bg-amber-300 shadow-[0_10px_30px_-8px_rgba(251,191,36,0.6)] transition-transform active:scale-95"
          >
            Abrir el estudio <ExternalLink size={17} />
          </a>
          <p className="text-xs text-slate-500 mt-3">wallets.bioo.cl · entra con esta misma cuenta</p>
        </div>
      </div>

      {/* Estado actual */}
      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        <div className="rounded-2xl border border-slate-800 [html.light_&]:border-ink-200 bg-slate-900/40 [html.light_&]:bg-white p-5 flex items-center gap-3">
          {enabled
            ? <Eye size={18} className="text-emerald-400 shrink-0" />
            : <EyeOff size={18} className="text-slate-500 shrink-0" />}
          <div className="min-w-0">
            <p className="font-semibold text-primary [html.light_&]:text-ink-900 text-sm">
              {enabled === null ? '…' : enabled ? 'Visible para tus clientes' : 'Oculta para tus clientes'}
            </p>
            <p className="text-xs text-slate-400 [html.light_&]:text-ink-600">
              {enabled
                ? 'El botón "Añadir a Wallet" está en su vista de sellos.'
                : 'Actívala desde el estudio cuando el diseño esté listo.'}
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 [html.light_&]:border-ink-200 bg-slate-900/40 [html.light_&]:bg-white p-5 flex items-center gap-3">
          <Users size={18} className="text-amber-400 shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold text-primary [html.light_&]:text-ink-900 text-sm">
              {savedCount == null ? 'Tarjetas guardadas: —' : `${savedCount} cliente${savedCount === 1 ? '' : 's'}`}
            </p>
            <p className="text-xs text-slate-400 [html.light_&]:text-ink-600">
              {savedCount == null ? '' : savedCount === 1 ? 'guardó su tarjeta en el celular' : 'guardaron su tarjeta en el celular'}
            </p>
          </div>
        </div>
      </div>

      <p className="flex items-center gap-1.5 text-xs text-slate-500 mt-6">
        <Sparkles size={12} /> Google Wallet disponible hoy · Apple Wallet muy pronto (misma configuración).
      </p>
    </div>
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
              <MapPinned size={30} className="text-ink-900" />
            </div>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black leading-[1.05] tracking-tight text-primary [html.light_&]:text-ink-900">
            Cuando tu cliente pase cerca,<br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-500">
              su celular le hablará de ti.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 [html.light_&]:text-ink-600 mt-5 max-w-2xl mx-auto leading-relaxed">
            La tarjeta de fidelidad de tu barbería, viva en el celular de cada cliente. Con <strong className="text-amber-300 [html.light_&]:text-amber-700">geo-push</strong>,
            aparece sola en su pantalla justo cuando camina a una cuadra. Sin apps. Sin que abra nada.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3">
            <p className="text-sm text-slate-400 [html.light_&]:text-ink-600">
              Desde{' '}
              <span className="text-3xl font-black text-amber-300 [html.light_&]:text-amber-600 align-middle">${PRECIO}</span>
              <span className="text-sm font-semibold text-slate-300 [html.light_&]:text-ink-700">/mes</span>
            </p>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-black text-ink-900 bg-amber-400 hover:bg-amber-300 shadow-[0_10px_30px_-8px_rgba(251,191,36,0.6)] transition-transform active:scale-95"
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
                : 'border-slate-800 [html.light_&]:border-ink-200 bg-slate-900/40 [html.light_&]:bg-white'
            }`}>
            <div className="flex items-center gap-2.5 mb-2">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                star ? 'bg-amber-400/20' : 'bg-slate-800/60 [html.light_&]:bg-ink-100'
              }`}>
                <Icon size={18} className="text-amber-400 [html.light_&]:text-amber-700" />
              </div>
              <h3 className="font-bold text-primary [html.light_&]:text-ink-900">{titulo}</h3>
              {star && <span className="ml-auto text-[9px] font-black uppercase tracking-widest text-amber-400">★ Estrella</span>}
            </div>
            <p className="text-sm text-slate-400 [html.light_&]:text-ink-600 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      {/* ── Cierre + CTA ── */}
      <div className="rounded-2xl border border-slate-800 [html.light_&]:border-ink-200 bg-slate-900/40 [html.light_&]:bg-white p-7 text-center">
        <p className="text-lg font-bold text-primary [html.light_&]:text-ink-900 mb-1">
          Fidelización que trabaja incluso con el local cerrado.
        </p>
        <p className="text-sm text-slate-400 [html.light_&]:text-ink-600 mb-5 max-w-lg mx-auto">
          Tú atiendes; el geo-push trae a la gente de vuelta. Escríbenos y lo dejamos andando en tu barbería.
        </p>
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-ink-900 bg-amber-400 hover:bg-amber-300 transition-transform active:scale-95"
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
