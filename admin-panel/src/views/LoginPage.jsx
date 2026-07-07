import { useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useTenant } from '../contexts/TenantContext';

const LOGIN_IMAGE = {
  elegance:       '/loginelegance.png',
  ferraza:        '/loginferraza.webp',
  mapubarbershop: '/loginmapu.png',
  chameleon:      '/loginchameleon.webp',
  aura:           '/aura2.png',
  latincaribe:    '/playa-login.jpg',
  yugen:          '/yugen/yugen2.png',
  sionbarberia:   '/dieciseis/banner.png',
  lumen:          '/djones1.png',
  kronnos_penablanca: '/kronnos/kronospena.png',
  kronnos_limache:    '/kronnos/kronoslima.png',
  kronnos_woman:      '/kronnos/kronoswoman.png',
  elbarberomoderno:   '/elbarberomoderno/barbero1.png',
  barbersclub:        '/barbersclub/hero-bg.png',
};

/* Fallback si el tenant no tiene imagen propia — el testimonial habla de Ferraza. */
const DEFAULT_LOGIN_IMAGE = '/loginferraza.webp';

/* Manifiesto de marca — se rota cada 6s en el panel izquierdo del login. */
const MANIFIESTO_MARCA = [
  {
    titulo: 'Menos administración. Más tiempo para tu arte.',
    subtitulo: 'Plataforma inteligente de gestión para barberías de alto flujo.',
  },
  {
    titulo: 'El control total de tu negocio, en la palma de tu mano.',
    subtitulo: 'Métricas en tiempo real, agenda automatizada y control de caja.',
  },
  {
    titulo: 'Tu agenda no se detiene. Tu software tampoco.',
    subtitulo: 'Infraestructura en la nube de alta disponibilidad para tu local.',
  },
  {
    titulo: 'Métricas claras, decisiones rápidas, crecimiento real.',
    subtitulo: 'Transforma los datos de tus clientes en estrategias de fidelización.',
  },
  {
    titulo: 'De la reserva a la caja, una experiencia sin fricciones.',
    subtitulo: 'Simplifica la operación diaria de todo tu equipo de trabajo.',
  },
];
const MANIFIESTO_INTERVAL_MS = 6000;
const MANIFIESTO_FADE_MS     = 500;

/* Traduce los códigos de error de Firebase Auth a mensajes claros en español. */
function authErrorMessage(err) {
  const code = err?.code || '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Correo o contraseña incorrectos. Revisa tus datos e inténtalo de nuevo.';
    case 'auth/invalid-email':
      return 'El correo no tiene un formato válido.';
    case 'auth/missing-password':
      return 'Ingresa tu contraseña.';
    case 'auth/user-disabled':
      return 'Esta cuenta está deshabilitada. Contáctanos para reactivarla.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos fallidos. Espera unos minutos antes de volver a intentar.';
    case 'auth/network-request-failed':
      return 'Sin conexión a internet. Revisa tu red e inténtalo de nuevo.';
    default:
      return 'No pudimos iniciar sesión. Inténtalo nuevamente.';
  }
}

/* Soporte por WhatsApp cuando no pueden ingresar. */
const SUPPORT_WHATSAPP = '56983568212';
function whatsappHelpHref(tenantName) {
  const msg = `Hola, no puedo ingresar al panel de gestión interna de ${tenantName}. ¿Me pueden ayudar?`;
  return `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(msg)}`;
}

export default function LoginPage() {
  const tenant = useTenant();
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error,      setError]      = useState('');
  const [loading,    setLoading]    = useState(false);

  /* Carrusel del manifiesto de marca (panel izquierdo). */
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFading,     setIsFading]     = useState(false);

  useEffect(() => {
    let swapTimeout;
    const interval = setInterval(() => {
      setIsFading(true);
      swapTimeout = setTimeout(() => {
        setCurrentIndex(i => (i + 1) % MANIFIESTO_MARCA.length);
        setIsFading(false);
      }, MANIFIESTO_FADE_MS);
    }, MANIFIESTO_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      if (swapTimeout) clearTimeout(swapTimeout);
    };
  }, []);

  const manifiesto = MANIFIESTO_MARCA[currentIndex];

  const bgImage = LOGIN_IMAGE[tenant.id] || DEFAULT_LOGIN_IMAGE;

  const loginEmail = async e => {
    e?.preventDefault();
    setError('');

    // Validación propia (en español) — reemplaza los mensajes nativos del navegador.
    const mail = email.trim();
    if (!mail)     return setError('Ingresa tu correo electrónico.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) return setError('Ingresa un correo electrónico válido (ejemplo: nombre@correo.com).');
    if (!password) return setError('Ingresa tu contraseña.');

    setLoading(true);
    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      await signInWithEmailAndPassword(auth, mail, password);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  /* ── Diseño propio: Memphis Salón ──────────────────────────────── */
  if (tenant.id === 'memphis') {
    return (
      <MemphisLogin
        email={email} setEmail={setEmail}
        password={password} setPassword={setPassword}
        rememberMe={rememberMe} setRememberMe={setRememberMe}
        error={error} loading={loading} onSubmit={loginEmail}
        tenantName={tenant.name}
      />
    );
  }

  const inputClass =
    'w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white ' +
    'placeholder:text-neutral-500 focus:outline-none focus:bg-white/10 ' +
    'focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 ' +
    'transition-all duration-300';

  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2 bg-[#09090b]">

      {/* ── PANEL IZQUIERDO — manifiesto de marca ───────────────────── */}
      <div
        className="hidden lg:block bg-cover bg-center bg-no-repeat relative"
        style={{ backgroundImage: `url(${bgImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

        <div className="absolute bottom-12 left-12 right-12 z-10">
          <div
            className={`transition-opacity duration-700 ease-in-out ${
              isFading ? 'opacity-0' : 'opacity-100'
            }`}
          >
            <h2 className="text-3xl font-bold text-white tracking-tight mb-3">
              {manifiesto.titulo}
            </h2>
            <p className="text-neutral-400 text-sm font-medium">
              {manifiesto.subtitulo}
            </p>
          </div>
        </div>
      </div>

      {/* ── PANEL DERECHO — formulario ───────────────────────────────── */}
      <div className="bg-[#09090b] flex items-center justify-center p-8 sm:p-12 lg:p-24 relative">
        <div className="w-full max-w-sm">

          {tenant.logo && (
            <img
              src={tenant.logo}
              alt={tenant.name}
              className="h-14 w-auto object-contain mb-8"
            />
          )}

          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">
            Bienvenido de vuelta.
          </h1>
          <p className="text-neutral-300 text-sm mb-8">
            Gestiona tu agenda, clientes y caja en un solo lugar.
          </p>

          <form onSubmit={loginEmail} noValidate className="space-y-4">
            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              className={inputClass}
              aria-label="Correo electrónico"
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              className={inputClass}
              aria-label="Contraseña"
            />

            <div className="flex items-center pt-1">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="accent-emerald-500 h-4 w-4 bg-white/5 border-white/10 rounded cursor-pointer"
              />
              <label htmlFor="rememberMe" className="ml-2 text-sm text-neutral-400 select-none cursor-pointer">
                Mantener sesión iniciada
              </label>
            </div>

            <LoginError error={error} tenantName={tenant.name} />

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 mt-6 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-base rounded-xl flex items-center justify-center transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                'Ingresar'
              )}
            </button>
          </form>
        </div>

        <p className="text-xs text-neutral-600 absolute bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
          ⚡ Engineered by SynapTech SpA — Conexión cifrada TLS
        </p>
      </div>
    </div>
  );
}

/* ── Error de login + ayuda por WhatsApp ───────────────────────────── */
function LoginError({ error, tenantName }) {
  if (!error) return null;
  return (
    <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-3.5 py-3 space-y-2 mt-2">
      <p className="text-xs text-red-300 font-medium leading-relaxed">{error}</p>
      <a
        href={whatsappHelpHref(tenantName)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300 hover:text-emerald-200 transition-colors"
      >
        <WhatsappIcon /> ¿No puedes ingresar? Escríbenos
      </a>
    </div>
  );
}

/* ── Íconos (inline SVG, sin dependencias) ─────────────────────────── */
function WhatsappIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.157 5.335 5.494 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.512 5.26l-.999 3.648 3.985-1.207zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MemphisLogin — diseño propio para Memphis Salón.
   Estética "Memphis" (geometría bold + paleta vibrante magenta/cian/oro)
   sobre fondo oscuro. No depende de imágenes: todo es CSS/SVG.
   ═══════════════════════════════════════════════════════════════════ */
function MemphisLogin({
  email, setEmail, password, setPassword,
  rememberMe, setRememberMe, error, loading, onSubmit, tenantName,
}) {
  const PINK  = '#ec4899';
  const CYAN  = '#06b6d4';
  const AMBER = '#f59e0b';

  const field =
    'w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white ' +
    'placeholder-white/35 focus:outline-none focus:border-pink-400/70 focus:bg-white/[0.06] ' +
    'transition-colors';

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 overflow-hidden bg-[#0a0a0f]">

      <style>{`
        @keyframes mphFloat { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-18px) } }
        @keyframes mphSpin  { from { transform: rotate(0) } to { transform: rotate(360deg) } }
      `}</style>

      {/* Orbes de color difuminados */}
      <div className="absolute -top-24 -left-16 w-80 h-80 rounded-full blur-[90px] opacity-40 pointer-events-none"
           style={{ background: PINK, animation: 'mphFloat 9s ease-in-out infinite' }} />
      <div className="absolute -bottom-28 -right-10 w-96 h-96 rounded-full blur-[100px] opacity-30 pointer-events-none"
           style={{ background: CYAN, animation: 'mphFloat 11s ease-in-out infinite reverse' }} />
      <div className="absolute top-1/3 right-1/4 w-44 h-44 rounded-full blur-[80px] opacity-20 pointer-events-none"
           style={{ background: AMBER, animation: 'mphFloat 13s ease-in-out infinite' }} />

      {/* Formas geométricas estilo Memphis */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        {/* Círculo contorneado */}
        <div className="absolute top-16 left-[12%] w-16 h-16 rounded-full border-2"
             style={{ borderColor: `${CYAN}55`, animation: 'mphFloat 8s ease-in-out infinite' }} />
        {/* Cuadrado rotado */}
        <div className="absolute bottom-24 left-[18%] w-10 h-10 rotate-12 rounded-md"
             style={{ background: `${AMBER}33` }} />
        {/* Triángulo */}
        <div className="absolute top-1/2 left-[8%] w-0 h-0"
             style={{ borderLeft: '10px solid transparent', borderRight: '10px solid transparent', borderBottom: `18px solid ${PINK}40`, animation: 'mphFloat 10s ease-in-out infinite' }} />
        {/* Squiggle */}
        <svg className="absolute top-24 right-[14%] opacity-50" width="90" height="24" viewBox="0 0 90 24" fill="none"
             style={{ animation: 'mphFloat 12s ease-in-out infinite' }}>
          <path d="M2 12 Q 12 2, 22 12 T 42 12 T 62 12 T 82 12" stroke={PINK} strokeWidth="3" strokeLinecap="round" />
        </svg>
        {/* Grilla de puntos */}
        <svg className="absolute bottom-16 right-[10%] opacity-40" width="80" height="48" viewBox="0 0 80 48">
          {[0, 1, 2, 3].map(r => [0, 1, 2, 3, 4].map(c => (
            <circle key={`${r}-${c}`} cx={4 + c * 18} cy={4 + r * 14} r="2.5" fill={CYAN} />
          )))}
        </svg>
        {/* Anillo girando lento */}
        <div className="absolute bottom-1/3 right-[6%] w-12 h-12 rounded-full border-2 border-dashed"
             style={{ borderColor: `${AMBER}66`, animation: 'mphSpin 26s linear infinite' }} />
      </div>

      {/* Contenido */}
      <div className="relative z-10 w-full max-w-sm">

        {/* Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          {/* Monograma "M" */}
          <div className="relative w-20 h-20 mb-5">
            <div className="absolute inset-0 rounded-2xl blur-md opacity-70"
                 style={{ background: `linear-gradient(135deg, ${PINK}, ${AMBER})` }} />
            <div className="relative w-full h-full rounded-2xl flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg, #18181f, #0d0d12)', boxShadow: `inset 0 0 0 1.5px ${PINK}66` }}>
              <span className="text-4xl font-black tracking-tight"
                    style={{ background: `linear-gradient(135deg, ${PINK}, ${AMBER})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                M
              </span>
            </div>
          </div>

          <h1 className="text-3xl font-black text-white tracking-tight">
            Memphis <span style={{ background: `linear-gradient(135deg, ${PINK}, ${AMBER})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Salón</span>
          </h1>
          <p className="text-[13px] text-white/45 mt-2 font-medium tracking-wide uppercase" style={{ letterSpacing: '0.18em' }}>
            Panel de administración
          </p>
        </div>

        {/* Card */}
        <div className="relative rounded-2xl p-6 border border-white/10 overflow-hidden"
             style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}>
          {/* Barra superior tricolor */}
          <div className="absolute top-0 left-0 right-0 h-1"
               style={{ background: `linear-gradient(90deg, ${PINK}, ${AMBER} 50%, ${CYAN})` }} />

          <form onSubmit={onSubmit} noValidate className="space-y-3 mt-1">
            <input
              type="email" className={field} placeholder="Correo electrónico"
              value={email} onChange={e => setEmail(e.target.value)} autoComplete="email"
            />
            <input
              type="password" className={field} placeholder="Contraseña"
              value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password"
            />

            <div className="flex items-center mt-4 mb-1">
              <input
                type="checkbox" id="rememberMe" checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-white/10"
                style={{ accentColor: PINK }}
              />
              <label htmlFor="rememberMe" className="ml-2 text-sm text-white/45 select-none cursor-pointer">
                Mantener sesión iniciada
              </label>
            </div>

            <LoginError error={error} tenantName={tenantName} />

            <button
              type="submit" disabled={loading}
              className="w-full py-3 disabled:opacity-50 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 mt-1 text-white hover:brightness-110 active:scale-[0.99]"
              style={{ background: `linear-gradient(135deg, ${PINK}, ${AMBER})`, boxShadow: `0 8px 28px ${PINK}44` }}
            >
              {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Ingresar
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-white/25 mt-6">Memphis Salón · Viña del Mar</p>
      </div>
    </div>
  );
}
