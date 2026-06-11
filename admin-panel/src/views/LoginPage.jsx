import { useState } from 'react';
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
  lumen:          '/djones1.png',
  kronnos_penablanca: '/kronnos/kronospena.png',
  kronnos_limache:    '/kronnos/kronoslima.png',
  kronnos_woman:      '/kronnos/kronoswoman.png',
};

/* Colores de marca SynapTech (tomados del logo): verde lima + verde oscuro. */
const SYNAPTECH_GREEN      = '#8BC53F';
const SYNAPTECH_GREEN_DARK = '#5F9E2A';

/* Texto legible (negro/blanco) según luminancia del acento — evita botones ilegibles. */
function readableText(hex) {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const L = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return L > 0.6 ? '#0a0a0a' : '#ffffff';
}

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
  const [rememberMe,   setRememberMe]   = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error,        setError]        = useState('');
  const [loading,      setLoading]      = useState(false);

  const bgImage   = LOGIN_IMAGE[tenant.id];
  const brand     = tenant.brand;
  // Acento de marca SynapTech (verde del logo) para todo el login de gestión interna.
  const accent    = SYNAPTECH_GREEN;
  const accentDark = SYNAPTECH_GREEN_DARK;
  const logo      = tenant.logo;
  const btnText   = readableText(accent);

  const field = 'lg-field w-full bg-black/40 backdrop-blur-sm border border-white/15 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-white/40 focus:outline-none transition-all';

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

  return (
    <div
      className="min-h-screen relative flex items-center justify-center px-4 overflow-hidden"
      style={{ '--accent': accent }}
    >
      <style>{`
        .lg-field:focus { border-color: ${accent}; box-shadow: 0 0 0 3px ${accent}30; background: rgba(0,0,0,0.55); }
        @keyframes lgUp { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: none } }
      `}</style>

      {/* Fondo: foto por sede */}
      {bgImage ? (
        <img src={bgImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-slate-950" />
      )}

      {/* Oscurecido con profundidad hacia abajo (legibilidad del formulario) */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/60 to-black/85" />
      {/* Glow de acento por sede en la parte superior */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(115% 80% at 50% -10%, ${accent}3a 0%, transparent 55%)` }}
      />

      {/* Contenido */}
      <div className="relative z-10 w-full max-w-sm" style={{ animation: 'lgUp 0.6s cubic-bezier(0.22,1,0.36,1) both' }}>

        {/* Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          {logo ? (
            <img
              src={logo}
              alt={tenant.name}
              className="w-20 h-20 rounded-2xl object-cover mb-4"
              style={{ boxShadow: `0 0 0 1.5px ${accent}, 0 10px 40px ${accent}55` }}
            />
          ) : (
            <div
              className="w-20 h-20 rounded-2xl mb-4 flex items-center justify-center text-4xl"
              style={{ background: 'rgba(255,255,255,0.06)', boxShadow: `inset 0 0 0 1.5px ${accent}66` }}
            >
              {tenant.emoji || '✂️'}
            </div>
          )}
          <h1 className="text-2xl font-black text-white tracking-tight">{tenant.name}</h1>
          {brand ? (
            <p className="text-sm mt-1.5 font-semibold tracking-wide" style={{ color: accent }}>
              {brand.sede} · <span className="text-white/50 font-medium">{brand.tagline}</span>
            </p>
          ) : (
            <p className="text-[11px] text-white/45 mt-2 font-medium uppercase" style={{ letterSpacing: '0.2em' }}>
              Panel de administración
            </p>
          )}
        </div>

        {/* Card */}
        <div
          className="relative rounded-2xl p-6 border border-white/12 overflow-hidden"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(20px)' }}
        >
          {/* Línea de acento superior */}
          <div
            className="absolute top-0 left-0 right-0 h-[3px]"
            style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
          />

          <form onSubmit={loginEmail} noValidate className="space-y-3">
            {/* Correo */}
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none">
                <MailIcon />
              </span>
              <input
                type="email"
                className={field}
                placeholder="Correo electrónico"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            {/* Contraseña */}
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none">
                <LockIcon />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                className={`${field} pr-11`}
                placeholder="Contraseña"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                tabIndex={-1}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/35 hover:text-white/70 transition-colors"
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>

            <div className="flex items-center mt-4 mb-1">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-white/10 cursor-pointer"
                style={{ accentColor: accent }}
              />
              <label htmlFor="rememberMe" className="ml-2 text-sm text-white/50 select-none cursor-pointer">
                Mantener sesión iniciada
              </label>
            </div>

            <LoginError error={error} tenantName={tenant.name} />

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 disabled:opacity-50 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 mt-1 hover:brightness-110 active:scale-[0.99]"
              style={{ background: `linear-gradient(135deg, ${accent}, ${accentDark})`, color: btnText, boxShadow: `0 8px 28px ${accent}44` }}
            >
              {loading && (
                <span
                  className="w-4 h-4 border-2 rounded-full animate-spin"
                  style={{ borderColor: btnText, borderTopColor: 'transparent' }}
                />
              )}
              Ingresar
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-white/25 mt-6">{tenant.name} · Panel interno</p>
      </div>
    </div>
  );
}

/* ── Error de login + ayuda por WhatsApp ───────────────────────────── */
function LoginError({ error, tenantName }) {
  if (!error) return null;
  return (
    <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-3.5 py-3 space-y-2">
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
function MailIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}
function LockIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
function EyeIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function EyeOffIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.88 9.88a3 3 0 0 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c6.5 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3.5 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" y1="2" x2="22" y2="22" />
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
