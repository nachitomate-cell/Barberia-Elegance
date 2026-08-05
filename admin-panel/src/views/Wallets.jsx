import { useState, useEffect } from 'react';
import { doc, onSnapshot, collection, query, where, getCountFromServer } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  Wallet, Loader2, Users, Eye, EyeOff, ExternalLink, Sparkles,
  Crown, MapPinned, BellRing, RefreshCw, ArrowRight, Check,
  Smartphone, AlertTriangle,
} from 'lucide-react';
import { db } from '../lib/firebase';
import { ADDONS, fmtCLP } from '../lib/precios';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';
import OnboardingWallet from '../components/OnboardingWallet';

// La PERSONALIZACIÓN de la tarjeta vive en su propio estudio (wallets.bioo.cl/estudio).
// Esta vista es el launcher: estado del módulo + botón al estudio + upsell.
// Pasamos ?tid= para que el estudio abra directo con el local seleccionado
// (superadmin evita el picker; admin del tenant lo respeta igual).
const WALLETS_STUDIO_URL = 'https://wallets.bioo.cl/estudio';
const estudioUrl = (tid) => tid ? `${WALLETS_STUDIO_URL}?tid=${encodeURIComponent(tid)}` : WALLETS_STUDIO_URL;

// Ruta del doc de config por tenant (mismo criterio que las CFs de wallet).
const cfgPath = (tid) => (tid === 'elegance' ? 'configuracion/wallet' : `tenants/${tid}/configuracion/wallet`);
const usersPath = (tid) => (tid === 'elegance' ? 'users' : `tenants/${tid}/users`);

// El panel se usa mucho desde el escritorio, donde abrir un link de wallet no
// sirve de nada: el pase tiene que aterrizar en un celular. Por eso al generar
// mostramos SIEMPRE un QR (mismo servicio que usa el estudio Wallo) y solo
// abrimos el link directo cuando ya estamos en un teléfono.
const qrSrc = (url, px = 200) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${px}x${px}&margin=8&data=${encodeURIComponent(url)}`;
const ES_MOVIL = typeof navigator !== 'undefined'
  && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');

export default function Wallets() {
  const { id: tenantId, name: tenantName } = useTenant();
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  const [savedCount, setSavedCount] = useState(null);
  // Visibilidad para clientes: configuracion/wallet.enabled (se edita en el estudio).
  const [enabled, setEnabled] = useState(null);
  // `enabled:false` EXPLÍCITO en el doc. No es lo mismo que "sin configurar":
  // las CFs solo bloquean cuando el campo está en false, si el doc no existe
  // dejan generar. Sin esta distinción avisaríamos de un bloqueo inexistente.
  const [ocultaExplicita, setOcultaExplicita] = useState(false);
  // Add-on pagado: _billing/{tid}.walletActivo (null = cargando).
  const [walletActivo, setWalletActivo] = useState(null);

  // Pase de prueba del propio dueño (Google / Apple).
  const [generando, setGenerando] = useState('');   // '' | 'google' | 'apple'
  const [pase, setPase] = useState(null);           // { tipo, url }
  const [errPase, setErrPase] = useState('');

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
      (snap) => {
        setEnabled(snap.exists() && snap.data().enabled === true);
        setOcultaExplicita(snap.exists() && snap.data().enabled === false);
      },
      () => { setEnabled(false); setOcultaExplicita(false); },
    );
    return () => unsub();
  }, [tenantId]);

  // Genera el pase del usuario logueado (el dueño) reusando las mismas CFs
  // que el cliente en su vista de sellos: `walletGenerarPase` para Google y
  // `walletAppleGenerarLink` para Apple. Ambas resuelven contra request.auth,
  // así que la tarjeta sale a nombre de esta cuenta.
  async function generarPase(tipo) {
    if (generando) return;
    setGenerando(tipo); setErrPase(''); setPase(null);
    try {
      const nombre = tipo === 'google' ? 'walletGenerarPase' : 'walletAppleGenerarLink';
      const fn = httpsCallable(getFunctions(undefined, 'us-central1'), nombre);
      const res = await fn({ tenantId });
      const url = res.data?.saveUrl || res.data?.url || res.data?.link;
      if (!url) throw new Error('La respuesta no trajo el enlace del pase.');
      setPase({ tipo, url });
      if (ES_MOVIL) window.open(url, '_blank', 'noopener');
    } catch (e) {
      // Las CFs devuelven mensajes ya redactados para el usuario final
      // (add-on inactivo, tarjeta oculta, Apple sin certificados…).
      setErrPase(e?.message || 'No pudimos generar la tarjeta. Reintenta.');
    } finally {
      setGenerando('');
    }
  }

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
    return <UpsellWallet tenantName={tenantName} tenantId={tenantId} />;
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

      {/* Onboarding — checklist mientras la config no esté completa. */}
      <OnboardingWallet tenantId={tenantId} />

      {/* Hero launcher → estudio de diseño (cristal + mockup smartphone) */}
      <div
        className="relative overflow-hidden rounded-[2rem] bg-white/[0.02] [html.light_&]:bg-white px-6 sm:px-10 py-10 sm:py-12 mb-4"
        style={{ border: '1px solid rgba(255,255,255,0.05)' }}
      >
        {/* Resplandor ámbar extremadamente suave, solo esquina superior */}
        <div
          className="absolute -top-24 -right-16 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.08) 0%, transparent 70%)' }}
        />
        <div className="relative flex flex-col md:flex-row items-center gap-6 md:gap-10 text-center md:text-left">
          <div className="flex-1 min-w-0">
            <span className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] px-2.5 py-1 rounded-full bg-emerald-400/15 text-emerald-300 [html.light_&]:bg-emerald-100 [html.light_&]:text-emerald-700 mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Módulo activo
            </span>
            <h2 className="text-2xl sm:text-3xl font-semibold leading-tight tracking-tight text-primary [html.light_&]:text-ink-900">
              Diseña tu tarjeta en{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-500">
                Wallo
              </span>
            </h2>
            <p className="text-sm sm:text-base text-slate-300 [html.light_&]:text-ink-600 mt-3 max-w-xl leading-relaxed">
              Colores, logo, la zona del geo-push en el mapa y la visibilidad para tus clientes: todo se
              personaliza en el estudio, con vista previa en vivo de cómo quedará la tarjeta.
            </p>
            <a
              href={estudioUrl(tenantId)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-7 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-medium text-white bg-amber-500/90 hover:bg-amber-500 shadow-[0_1px_0_0_rgba(255,255,255,0.08)_inset] transition-all duration-200 ease-in-out active:scale-95"
            >
              <span>Abrir el estudio</span>
              <ExternalLink size={15} strokeWidth={1.75} />
            </a>
            <p className="text-xs text-slate-500 mt-3">Estudio Wallo · entra con esta misma cuenta</p>
          </div>

          {/* Wireframe smartphone — trazos finos, opacidad baja */}
          <div className="shrink-0 hidden md:block" aria-hidden>
            <svg width="128" height="220" viewBox="0 0 128 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-40">
              <rect x="4" y="4" width="120" height="212" rx="20" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2" />
              <rect x="10" y="10" width="108" height="200" rx="14" stroke="rgba(255,255,255,0.12)" strokeWidth="0.8" />
              <line x1="52" y1="14" x2="76" y2="14" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round" />
              {/* Card de wallet dentro del teléfono */}
              <rect x="18" y="34" width="92" height="60" rx="8" stroke="rgba(251,191,36,0.55)" strokeWidth="1" fill="rgba(251,191,36,0.06)" />
              <circle cx="26" cy="44" r="4" stroke="rgba(251,191,36,0.55)" strokeWidth="0.8" />
              <line x1="35" y1="43" x2="70" y2="43" stroke="rgba(255,255,255,0.35)" strokeWidth="1" strokeLinecap="round" />
              <line x1="35" y1="47" x2="55" y2="47" stroke="rgba(255,255,255,0.18)" strokeWidth="0.8" strokeLinecap="round" />
              <line x1="24" y1="62" x2="104" y2="62" stroke="rgba(255,255,255,0.10)" strokeWidth="0.8" />
              {/* Stamps */}
              {Array.from({ length: 8 }).map((_, i) => (
                <circle key={i} cx={26 + (i % 4) * 20} cy={i < 4 ? 74 : 86} r="3" stroke="rgba(255,255,255,0.35)" strokeWidth="0.8" fill={i < 3 ? 'rgba(52,199,89,0.5)' : 'none'} />
              ))}
              {/* Filas de info */}
              <line x1="18" y1="112" x2="90" y2="112" stroke="rgba(255,255,255,0.14)" strokeWidth="0.8" strokeLinecap="round" />
              <line x1="18" y1="122" x2="70" y2="122" stroke="rgba(255,255,255,0.10)" strokeWidth="0.8" strokeLinecap="round" />
              <line x1="18" y1="140" x2="110" y2="140" stroke="rgba(255,255,255,0.08)" strokeWidth="0.6" />
              <line x1="18" y1="152" x2="100" y2="152" stroke="rgba(255,255,255,0.10)" strokeWidth="0.8" strokeLinecap="round" />
              <line x1="18" y1="162" x2="80" y2="162" stroke="rgba(255,255,255,0.08)" strokeWidth="0.7" strokeLinecap="round" />
              {/* Home indicator */}
              <line x1="48" y1="204" x2="80" y2="204" stroke="rgba(255,255,255,0.30)" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* ── Añadir a Wallet (los mismos botones que ve el cliente) ──
          Genera la tarjeta a nombre de esta cuenta: sirve para revisar el
          diseño real antes de mostrarlo, y para enseñársela a un cliente que
          pregunta en el mesón sin tener que pedirle el celular. */}
      <div
        className="rounded-2xl bg-white/[0.02] [html.light_&]:bg-white p-5 sm:p-6 mb-4"
        style={{ border: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-amber-400/10 ring-1 ring-inset ring-amber-400/15 [html.light_&]:bg-amber-100 flex items-center justify-center shrink-0">
            <Smartphone size={17} className="text-amber-300 [html.light_&]:text-amber-700" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-primary [html.light_&]:text-ink-900 tracking-tight">Añádela a tu celular</h3>
            <p className="text-xs text-slate-400 [html.light_&]:text-ink-600 mt-0.5 leading-relaxed">
              La misma tarjeta que ven tus clientes, a nombre de tu cuenta. Úsala para revisar cómo
              quedó de verdad y para mostrarla en el local.
            </p>
          </div>
        </div>

        {/* Layout: QR de acceso rápido a la izquierda | botones a la derecha.
            El QR apunta al estudio (o al pase si ya se generó) para que el
            admin escanee la pantalla y siga en su móvil sin escribir la URL. */}
        <div className="grid sm:grid-cols-[auto_1fr] gap-4 items-stretch">
          <div
            className="flex flex-col items-center justify-center gap-2 rounded-2xl p-3 bg-white/[0.02] [html.light_&]:bg-slate-50"
            style={{ border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <img
              src={qrSrc(pase?.url || estudioUrl(tenantId), 140)}
              alt="QR de acceso rápido"
              className="w-[124px] h-[124px] rounded-xl bg-white p-1"
            />
            <p className="text-[10px] text-slate-400 [html.light_&]:text-ink-600 text-center leading-tight max-w-[132px]">
              {pase
                ? 'Escanea para guardar tu tarjeta en el celular'
                : 'Escanea desde tu móvil para acceder rápido'}
            </p>
          </div>

          <div className="grid gap-3">
            <button
              type="button"
              onClick={() => generarPase('google')}
              disabled={!!generando}
              className="rounded-2xl px-5 py-3.5 text-center bg-[#3367d6] hover:bg-[#2d5fbf] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 ease-in-out active:scale-[0.99] shadow-[0_1px_0_0_rgba(255,255,255,0.08)_inset]"
            >
              <span className="flex items-center justify-center gap-2 font-medium text-white">
                {generando === 'google' && <Loader2 size={15} className="animate-spin" />}
                {generando === 'google' ? 'Generando…' : 'Añadir a Google Wallet'}
              </span>
              <span className="block text-[11px] font-medium text-white/70 mt-0.5">
                Se abrirá el botón oficial de Google
              </span>
            </button>

            <button
              type="button"
              onClick={() => generarPase('apple')}
              disabled={!!generando}
              className="rounded-2xl px-5 py-3.5 text-center bg-black hover:bg-slate-900 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 ease-in-out active:scale-[0.99]"
              style={{ border: '1px solid rgba(255,255,255,0.15)' }}
            >
              <span className="flex items-center justify-center gap-2 font-medium text-white">
                {generando === 'apple' && <Loader2 size={15} className="animate-spin" />}
                {generando === 'apple' ? 'Generando…' : 'Añadir a Apple Wallet'}
              </span>
              <span className="block text-[11px] font-medium text-white/60 mt-0.5">
                Se abrirá Safari con el pase
              </span>
            </button>
          </div>
        </div>

        {/* Confirmación al generar pase — el QR grande ya vive arriba en el
            layout dual; acá solo confirmamos y damos el fallback de link. */}
        {pase && (
          <div
            className="mt-4 rounded-2xl bg-emerald-400/[0.06] [html.light_&]:bg-emerald-50 p-4 flex items-start gap-3"
            style={{ border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-400/15 ring-1 ring-inset ring-emerald-400/20 flex items-center justify-center shrink-0">
              <Check size={16} className="text-emerald-300" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-primary [html.light_&]:text-ink-900 text-sm tracking-tight">
                Tu tarjeta de {pase.tipo === 'google' ? 'Google Wallet' : 'Apple Wallet'} está lista
              </p>
              <p className="text-xs text-slate-400 [html.light_&]:text-ink-600 mt-1 leading-relaxed">
                Escanea el QR de arriba con la cámara de tu celular
                {pase.tipo === 'apple' ? ' (iPhone o iPad)' : ''} y se guardará ahí.
              </p>
              <a
                href={pase.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-amber-300 [html.light_&]:text-amber-700 hover:underline"
              >
                Abrir el enlace directo <ExternalLink size={12} strokeWidth={1.75} />
              </a>
            </div>
          </div>
        )}

        {errPase && (
          <p className="mt-3 flex items-start gap-2 text-xs text-rose-300 [html.light_&]:text-rose-700">
            <AlertTriangle size={14} className="shrink-0 mt-px" /> {errPase}
          </p>
        )}

        {ocultaExplicita && !pase && (
          <p className="mt-3 flex items-start gap-2 text-xs text-amber-300 [html.light_&]:text-amber-700">
            <AlertTriangle size={14} className="shrink-0 mt-px" />
            Tu tarjeta está oculta para los clientes, y mientras lo esté tampoco se puede generar
            la tuya. Actívala en el estudio y vuelve a intentar.
          </p>
        )}
      </div>

      {/* Estado actual — cristal para no pesar visualmente */}
      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        <div
          className="rounded-2xl bg-white/[0.02] [html.light_&]:bg-white p-5 flex items-center gap-3 transition-all duration-200 ease-in-out hover:bg-white/[0.04]"
          style={{ border: '1px solid rgba(255,255,255,0.05)' }}
        >
          {enabled
            ? <Eye size={18} className="text-emerald-300 shrink-0" strokeWidth={1.75} />
            : <EyeOff size={18} className="text-slate-500 shrink-0" strokeWidth={1.75} />}
          <div className="min-w-0">
            <p className="font-medium text-primary [html.light_&]:text-ink-900 text-sm tracking-tight">
              {enabled === null ? '…' : enabled ? 'Visible para tus clientes' : 'Oculta para tus clientes'}
            </p>
            <p className="text-xs text-slate-400 [html.light_&]:text-ink-600 mt-0.5">
              {enabled
                ? 'El botón "Añadir a Wallet" está en su vista de sellos.'
                : 'Actívala desde el estudio cuando el diseño esté listo.'}
            </p>
          </div>
        </div>
        <div
          className="rounded-2xl bg-white/[0.02] [html.light_&]:bg-white p-5 flex items-center gap-3 transition-all duration-200 ease-in-out hover:bg-white/[0.04]"
          style={{ border: '1px solid rgba(255,255,255,0.05)' }}
        >
          <Users size={18} className="text-amber-300 shrink-0" strokeWidth={1.75} />
          <div className="min-w-0">
            <p className="font-medium text-primary [html.light_&]:text-ink-900 text-sm tabular-nums tracking-tight">
              {savedCount == null ? 'Tarjetas guardadas: —' : `${savedCount} cliente${savedCount === 1 ? '' : 's'}`}
            </p>
            <p className="text-xs text-slate-400 [html.light_&]:text-ink-600 mt-0.5">
              {savedCount == null ? '' : savedCount === 1 ? 'guardó su tarjeta en el celular' : 'guardaron su tarjeta en el celular'}
            </p>
          </div>
        </div>
      </div>

      <p className="flex items-center gap-1.5 text-xs text-slate-500 mt-6">
        <Sparkles size={12} /> Google Wallet y Apple Wallet disponibles · una sola configuración para ambos.
      </p>
    </div>
  );
}

// Pantalla de venta cuando el local aún no contrató el add-on Wallet.
// Copy tipo agencia creativa — el geo-push es el gancho estrella.
// El flag pagado (_billing/{tid}.walletActivo) solo lo enciende SynapTech.
function UpsellWallet({ tenantName, tenantId }) {
  // Fallback WhatsApp (por si el checkout MP falla o el usuario prefiere hablar).
  const waMsg = encodeURIComponent(
    `Hola SynapTech, quiero activar el módulo Wallet (tarjeta de fidelidad + geo-push) para mi local ${tenantName || ''}.`.trim(),
  );
  const waUrl = `https://wa.me/56983568212?text=${waMsg}`;
  // El precio ya no vive acá: sale de lib/precios.js, que es la fuente
  // única de todas las tarifas (planes y add-ons). Antes cada vista tenía
  // el suyo hardcodeado y subir precios obligaba a tocar 4 archivos.
  const PRECIO = fmtCLP(ADDONS.find(a => a.id === 'wallets').mes).replace('$', '');

  // Checkout self-service: crea preapproval MP separado ($9.990/mes) y redirige
  // al init_point de MP. Al aprobarse el primer cobro, el webhook activa
  // walletActivo=true y el trigger manda el email de bienvenida.
  const [activando, setActivando] = useState(false);
  const [errAct, setErrAct] = useState('');
  async function activarConMp() {
    if (activando || !tenantId) return;
    setActivando(true); setErrAct('');
    try {
      const fn = httpsCallable(getFunctions(undefined, 'us-central1'), 'walletAddonCrearLink');
      const res = await fn({ tenantId, origen: window.location.origin });
      const url = res.data?.url;
      if (!url) throw new Error('MP no devolvió el link.');
      window.location.href = url;
    } catch (e) {
      // Si el error tiene mensaje user-facing (permission-denied, ya activo, etc.),
      // lo muestra tal cual — las CFs devuelven textos redactados.
      setErrAct(e?.message || 'No pudimos abrir el checkout. Intenta de nuevo o escríbenos por WhatsApp.');
      setActivando(false);
    }
  }

  const HOOKS = [
    { Icon: MapPinned, titulo: 'Aparece cuando pasa cerca', desc: 'Su tarjeta salta sola a la pantalla de bloqueo al acercarse a tu local. El recordatorio perfecto, en el segundo perfecto.', star: true },
    { Icon: RefreshCw, titulo: 'Se llena sola', desc: 'Cada sello y su rango se actualizan en su celular sin que abra nada. Magia invisible.' },
    { Icon: BellRing, titulo: 'Le grita cuando gana', desc: 'Al desbloquear un premio, su celular se lo notifica. Y vuelve por él.' },
    { Icon: Wallet, titulo: 'Imposible de perder', desc: 'Vive en Google Wallet y Apple Wallet, junto a sus tarjetas y pases. No se desinstala, no se olvida.' },
  ];

  // Lo que trae el módulo (checklist concreto, aparte de los ganchos).
  const INCLUYE = [
    'Google Wallet y Apple Wallet — ambos',
    'Geo-push con zona configurable en el mapa',
    'Sellos y rango que se actualizan solos',
    'Aviso al cliente cuando desbloquea un premio',
    'Diseño a tu marca: colores, logo y estampas',
    'Tarjetas ilimitadas, sin costo por cliente',
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
            <Crown size={13} /> Módulo Premium · Google + Apple Wallet
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
            La tarjeta de fidelidad de tu negocio, viva en el celular de cada cliente. Con <strong className="text-amber-300 [html.light_&]:text-amber-700">geo-push</strong>,
            aparece sola en su pantalla justo cuando camina a una cuadra. Sin apps. Sin que abra nada.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3">
            <p className="text-sm text-slate-400 [html.light_&]:text-ink-600">
              <span className="text-4xl font-black text-amber-300 [html.light_&]:text-amber-600 align-middle">${PRECIO}</span>
              <span className="text-sm font-semibold text-slate-300 [html.light_&]:text-ink-700">/mes · IVA incluido</span>
            </p>
            <p className="text-xs text-slate-500 -mt-1.5">Google + Apple Wallet en un solo precio · tarjetas ilimitadas</p>
            <button
              type="button"
              onClick={activarConMp}
              disabled={activando}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-black text-ink-900 bg-amber-400 hover:bg-amber-300 disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_10px_30px_-8px_rgba(251,191,36,0.6)] transition-transform active:scale-95"
            >
              {activando
                ? <>Abriendo Mercado Pago… <Loader2 size={18} className="animate-spin" /></>
                : <>Activar ahora — ${PRECIO}/mes <ArrowRight size={18} /></>}
            </button>
            <p className="text-xs text-slate-500">
              Pago automático · cancela cuando quieras · activo en el momento
            </p>
            {errAct && (
              <p className="mt-1 text-xs text-rose-300 [html.light_&]:text-rose-700 max-w-md">
                {errAct} · <a href={waUrl} target="_blank" rel="noopener noreferrer" className="underline">Prefiero hablar por WhatsApp</a>
              </p>
            )}
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

      {/* ── Todo incluido (lo que trae) ── */}
      <div className="rounded-2xl border border-slate-800 [html.light_&]:border-ink-200 bg-slate-900/40 [html.light_&]:bg-white p-6 sm:p-7 mb-6">
        <h3 className="font-bold text-primary [html.light_&]:text-ink-900 mb-4 flex items-center gap-2">
          <Check size={18} className="text-emerald-400" /> Todo incluido en el módulo
        </h3>
        <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5">
          {INCLUYE.map((t) => (
            <li key={t} className="flex items-start gap-2 text-sm text-slate-300 [html.light_&]:text-ink-700">
              <Check size={15} className="text-emerald-400 mt-0.5 shrink-0" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* ── Cierre + CTA ── */}
      <div className="rounded-2xl border border-slate-800 [html.light_&]:border-ink-200 bg-slate-900/40 [html.light_&]:bg-white p-7 text-center">
        <p className="text-lg font-bold text-primary [html.light_&]:text-ink-900 mb-1">
          Fidelización que trabaja incluso con el local cerrado.
        </p>
        <p className="text-sm text-slate-400 [html.light_&]:text-ink-600 mb-5 max-w-lg mx-auto">
          Tú atiendes; el geo-push trae a la gente de vuelta. Se activa en el momento.
        </p>
        <button
          type="button"
          onClick={activarConMp}
          disabled={activando}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-ink-900 bg-amber-400 hover:bg-amber-300 disabled:opacity-70 transition-transform active:scale-95"
        >
          {activando
            ? <>Abriendo Mercado Pago… <Loader2 size={15} className="animate-spin" /></>
            : <>Activar el módulo · ${PRECIO}/mes <ArrowRight size={16} /></>}
        </button>
        <p className="text-xs text-slate-500 mt-3">
          ¿Prefieres hablar antes? <a href={waUrl} target="_blank" rel="noopener noreferrer" className="text-amber-400 underline">WhatsApp con nosotros</a>
        </p>
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
