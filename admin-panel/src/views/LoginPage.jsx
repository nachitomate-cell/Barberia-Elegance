import { useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail,
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
  sionbarberia:   '/dieciseis/banner16-bn.png',
  lumen:          '/djones1.png',
  infinity:       '/infinity/infinit.png',
  kronnos_penablanca: '/kronnos/kronospena.png',
  kronnos_limache:    '/kronnos/kronoslima.png',
  kronnos_woman:      '/kronnos/kronoswoman.png',
  elbarberomoderno:   '/elbarberomoderno/barbero1.png',
  barbersclub:        '/barbersclub/hero-bg.png',
};

/* El banner del panel izquierdo se resuelve dinámicamente por tenant:
   tenant.banner → LOGIN_IMAGE[id] → /{slug}/banner.webp, y si todo falla (404)
   el onError cae a un fondo oscuro SynapTech. NUNCA a la foto de otro local. */

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

/* Persistimos la última elección de "Mantener sesión". El panel corre en el
   mismo iPad/PC compartido del local, así que el default útil es `true`. */
const REMEMBER_ME_KEY = 'sy_gi_remember';
function readRememberMe() {
  try {
    const saved = localStorage.getItem(REMEMBER_ME_KEY);
    return saved === null ? true : saved === '1';
  } catch { return true; }
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

/* Soporte por WhatsApp cuando no pueden ingresar. Incluye tenant.id y correo
   tecleado para que soporte no tenga que hacer ping-pong preguntando. */
const SUPPORT_WHATSAPP = '56983568212';
function whatsappHelpHref({ tenantName, tenantId, email } = {}) {
  const parts = [
    `Hola, soy usuario del panel de gestión de ${tenantName || 'una barbería SynapTech'}.`,
    tenantId ? `(tenant: ${tenantId})` : '',
    'No puedo iniciar sesión.',
    email ? `Mi correo es ${email}.` : '',
    '¿Me pueden ayudar?',
  ].filter(Boolean).join(' ');
  return `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(parts)}`;
}

export default function LoginPage() {
  const tenant = useTenant();
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [rememberMe, setRememberMe] = useState(readRememberMe);
  const [error,      setError]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [resetSent,    setResetSent]    = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [bannerFailed, setBannerFailed] = useState(false);

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

  /* Persistencia de la elección "Mantener sesión". */
  useEffect(() => {
    try { localStorage.setItem(REMEMBER_ME_KEY, rememberMe ? '1' : '0'); } catch {}
  }, [rememberMe]);

  const manifiesto = MANIFIESTO_MARCA[currentIndex];

  /* Banner del panel izquierdo — prioridad: config del tenant → mapa curado →
     convención /{slug}/banner.webp. onError cae a fondo oscuro SynapTech. */
  const bannerSrc = tenant.banner || LOGIN_IMAGE[tenant.id] || `/${tenant.id}/banner.webp`;

  const validateEmail = mail => {
    if (!mail) { setError('Ingresa tu correo electrónico.'); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      setError('Ingresa un correo electrónico válido (ejemplo: nombre@correo.com).');
      return false;
    }
    return true;
  };

  const loginEmail = async e => {
    e?.preventDefault();
    setError('');
    setResetSent(false);

    const mail = email.trim();
    if (!validateEmail(mail)) return;
    if (!password) return setError('Ingresa tu contraseña.');

    setLoading(true);
    try {
      // setPersistence puede fallar en iframes/Safari privado; no debe
      // bloquear el intento de login (por eso el .catch silencioso).
      await setPersistence(
        auth,
        rememberMe ? browserLocalPersistence : browserSessionPersistence
      ).catch(() => {});
      await signInWithEmailAndPassword(auth, mail, password);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError('');
    setResetSent(false);
    const mail = email.trim();
    if (!mail) {
      setError('Escribe tu correo arriba y luego toca "¿Olvidaste tu contraseña?" — te enviaremos un enlace.');
      return;
    }
    if (!validateEmail(mail)) return;

    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, mail);
      setResetSent(true);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setResetLoading(false);
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
        onForgot={handleForgotPassword}
        resetLoading={resetLoading} resetSent={resetSent}
        tenantName={tenant.name} tenantId={tenant.id}
      />
    );
  }

  // Inputs: estilo glass premium — bg suave con borde neutral que se ilumina
  // en focus. Se aplica el mismo estilo en mobile y desktop.
  const inputClass =
    'w-full bg-neutral-900/50 border border-neutral-800 rounded-xl px-4 py-3.5 ' +
    'text-primary placeholder-neutral-500 focus:outline-none focus:bg-neutral-900 ' +
    'focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 ' +
    'transition-all';

  return (
    <div className="min-h-[100dvh] w-full grid grid-cols-1 lg:grid-cols-2 bg-[#050505]">

      {/* ── PANEL IZQUIERDO — manifiesto de marca (solo desktop) ───── */}
      {/* Fondo oscuro SynapTech SIEMPRE detrás: si el banner del tenant falla
          (404), queda este degradado — jamás la foto de otro local. */}
      <div className="hidden lg:block relative overflow-hidden bg-gradient-to-br from-neutral-950 via-black to-neutral-900">
        {!bannerFailed && (
          <img
            src={bannerSrc}
            alt=""
            aria-hidden="true"
            onError={() => setBannerFailed(true)}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {/* Overlay de contraste: mantiene legible el testimonial sobre cualquier foto */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-black/25" />

        {/* Branding SynapTech esquina superior */}
        <div className="absolute top-8 left-8 sm:left-12 z-20 flex items-center gap-3">
          <img
            src="/synaptech/ig.png"
            alt="SynapTech Logo"
            className="h-8 w-auto drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]"
          />
          <span className="text-primary font-bold text-xl tracking-tight">SynapTech</span>
        </div>

        <div className="absolute bottom-12 left-12 right-12 z-10">
          <div
            className={`transition-opacity duration-700 ease-in-out ${
              isFading ? 'opacity-0' : 'opacity-100'
            }`}
          >
            <h2 className="text-3xl font-bold text-primary tracking-tight mb-3">
              {manifiesto.titulo}
            </h2>
            <p className="text-neutral-400 text-sm font-medium">
              {manifiesto.subtitulo}
            </p>
          </div>
        </div>
      </div>

      {/* ── PANEL DERECHO — formulario (full bleed en mobile) ─────── */}
      <div className="flex flex-col h-[100dvh] relative bg-[#050505] lg:bg-[#09090b]">

        {/* Ambient glow — resplandor sutil detrás del formulario */}
        <div
          aria-hidden
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md aspect-square bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none z-0"
        />

        <div className="flex-1 flex flex-col justify-center w-full max-w-sm mx-auto px-6 relative z-10">

          <TenantLogo logo={tenant.logo} name={tenant.name} />

          <h1 className="text-3xl font-extrabold text-primary tracking-tight mb-2">
            Bienvenido de vuelta.
          </h1>
          <p className="text-neutral-300 text-sm mb-8">
            Gestiona tu agenda, clientes y caja en un solo lugar.
          </p>

          <form onSubmit={loginEmail} noValidate className="space-y-4">
            <input
              type="email"
              inputMode="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
              className={inputClass}
              aria-label="Correo electrónico"
            />

            <PasswordField
              value={password}
              onChange={e => setPassword(e.target.value)}
              inputClass={inputClass}
              accent="emerald"
            />

            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-1">
              <label className="flex items-center gap-2 text-sm text-neutral-400 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="accent-emerald-500 h-4 w-4 bg-white/5 border-white/10 rounded cursor-pointer"
                />
                Mantener sesión iniciada
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={resetLoading}
                className="text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors disabled:opacity-50"
              >
                {resetLoading ? 'Enviando…' : '¿Olvidaste tu contraseña?'}
              </button>
            </div>

            <LoginError
              error={error}
              resetSent={resetSent}
              email={email.trim()}
              tenantName={tenant.name}
              tenantId={tenant.id}
            />

            <button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className="w-full mt-6 bg-emerald-500 hover:bg-emerald-400 text-ink-950 font-bold rounded-xl py-3.5 shadow-[0_0_20px_-5px_rgba(16,185,129,0.4)] flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                'Ingresar'
              )}
            </button>
          </form>

          {/* Ayuda por WhatsApp — siempre visible, no solo cuando falla */}
          <a
            href={whatsappHelpHref({ tenantName: tenant.name, tenantId: tenant.id, email: email.trim() })}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center justify-center gap-1.5 text-xs text-neutral-500 hover:text-emerald-300 transition-colors"
          >
            <WhatsappIcon /> ¿Problemas para entrar? Escríbenos
          </a>
        </div>

        <p className="shrink-0 pb-8 text-center text-xs text-neutral-600 flex items-center justify-center whitespace-nowrap relative z-10">
          <img
            src="/synaptech/ig.png"
            alt="SynapTech Icon"
            className="h-4 w-auto inline-block mr-1.5 opacity-90"
          />
          Engineered by SynapTech SpA — Conexión cifrada TLS
        </p>
      </div>
    </div>
  );
}

/* ── Logo del tenant con fallback a iniciales ──────────────────────
   Si el tenant no tiene logo (o falla la carga), renderiza un círculo con la
   inicial del local en ámbar sobre gris oscuro — nunca un ícono roto ni vacío. */
function tenantInitials(name) {
  const stop = new Set(['y', 'de', 'la', 'el', 'los', 'las', 'del', 'and', '&']);
  const words = String(name || '').split(/\s+/).filter(w => w && !stop.has(w.toLowerCase()));
  const letters = words.slice(0, 2).map(w => w[0]).join('');
  return (letters || String(name || '?').trim()[0] || '?').toUpperCase();
}

function TenantLogo({ logo, name }) {
  const [failed, setFailed] = useState(false);
  if (logo && !failed) {
    return (
      <img
        src={logo}
        alt={name}
        onError={() => setFailed(true)}
        className="h-14 w-14 object-contain rounded-full mb-8 bg-neutral-900/40 ring-1 ring-white/10"
      />
    );
  }
  return (
    <div
      role="img"
      aria-label={name}
      className="h-14 w-14 rounded-full mb-8 flex items-center justify-center bg-neutral-800 text-amber-500 font-bold text-xl select-none ring-1 ring-white/10"
    >
      {tenantInitials(name)}
    </div>
  );
}

/* ── Error de login + confirmación de reset + ayuda WhatsApp ───────── */
function LoginError({ error, resetSent, email, tenantName, tenantId }) {
  if (resetSent) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3.5 py-3 mt-2"
      >
        <p className="text-xs text-emerald-200 font-medium leading-relaxed">
          Te enviamos un enlace de recuperación{email ? ` a ${email}` : ''}. Revisa tu bandeja de entrada y la carpeta de spam.
        </p>
      </div>
    );
  }
  if (!error) return null;
  return (
    <div
      role="alert"
      aria-live="polite"
      className="rounded-xl border border-red-500/25 bg-red-500/10 px-3.5 py-3 space-y-2 mt-2"
    >
      <p className="text-xs text-red-300 font-medium leading-relaxed">{error}</p>
      <a
        href={whatsappHelpHref({ tenantName, tenantId, email })}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300 hover:text-emerald-200 transition-colors"
      >
        <WhatsappIcon /> ¿No puedes ingresar? Escríbenos
      </a>
    </div>
  );
}

/* ── Campo de contraseña con toggle mostrar/ocultar + Bloq Mayús ──── */
function PasswordField({ value, onChange, inputClass, accent = 'emerald' }) {
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);

  const detectCaps = e => {
    if (typeof e.getModifierState === 'function') {
      setCaps(e.getModifierState('CapsLock'));
    }
  };

  const capsColor = accent === 'pink' ? 'text-pink-300' : 'text-amber-400';

  return (
    <div>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          placeholder="Contraseña"
          value={value}
          onChange={onChange}
          onKeyDown={detectCaps}
          onKeyUp={detectCaps}
          onBlur={() => setCaps(false)}
          autoComplete="current-password"
          className={`${inputClass} pr-11`}
          aria-label="Contraseña"
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          tabIndex={-1}
          aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-neutral-400 hover:text-neutral-200 transition-colors"
        >
          {show ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
      {caps && (
        <p
          role="status"
          aria-live="polite"
          className={`mt-1.5 flex items-center gap-1.5 text-[11px] font-medium ${capsColor}`}
        >
          <CapsLockIcon /> Bloq Mayús activado
        </p>
      )}
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
function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.06 10.06 0 0 1 12 20c-7 0-10-8-10-8a18.5 18.5 0 0 1 4.24-5.19M9.9 4.24A10.05 10.05 0 0 1 12 4c7 0 10 8 10 8a18.6 18.6 0 0 1-2.16 3.19M1 1l22 22" />
      <path d="M9.88 9.88A3 3 0 0 0 12 15a3 3 0 0 0 2.12-.88" />
    </svg>
  );
}
function CapsLockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l8 9h-4v6H8v-6H4l8-9z" />
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
  rememberMe, setRememberMe, error, loading, onSubmit,
  onForgot, resetLoading, resetSent,
  tenantName, tenantId,
}) {
  const PINK  = '#ec4899';
  const CYAN  = '#06b6d4';
  const AMBER = '#f59e0b';

  const field =
    'w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-primary ' +
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
        <div className="absolute top-16 left-[12%] w-16 h-16 rounded-full border-2"
             style={{ borderColor: `${CYAN}55`, animation: 'mphFloat 8s ease-in-out infinite' }} />
        <div className="absolute bottom-24 left-[18%] w-10 h-10 rotate-12 rounded-md"
             style={{ background: `${AMBER}33` }} />
        <div className="absolute top-1/2 left-[8%] w-0 h-0"
             style={{ borderLeft: '10px solid transparent', borderRight: '10px solid transparent', borderBottom: `18px solid ${PINK}40`, animation: 'mphFloat 10s ease-in-out infinite' }} />
        <svg className="absolute top-24 right-[14%] opacity-50" width="90" height="24" viewBox="0 0 90 24" fill="none"
             style={{ animation: 'mphFloat 12s ease-in-out infinite' }}>
          <path d="M2 12 Q 12 2, 22 12 T 42 12 T 62 12 T 82 12" stroke={PINK} strokeWidth="3" strokeLinecap="round" />
        </svg>
        <svg className="absolute bottom-16 right-[10%] opacity-40" width="80" height="48" viewBox="0 0 80 48">
          {[0, 1, 2, 3].map(r => [0, 1, 2, 3, 4].map(c => (
            <circle key={`${r}-${c}`} cx={4 + c * 18} cy={4 + r * 14} r="2.5" fill={CYAN} />
          )))}
        </svg>
        <div className="absolute bottom-1/3 right-[6%] w-12 h-12 rounded-full border-2 border-dashed"
             style={{ borderColor: `${AMBER}66`, animation: 'mphSpin 26s linear infinite' }} />
      </div>

      {/* Contenido */}
      <div className="relative z-10 w-full max-w-sm">

        {/* Header */}
        <div className="flex flex-col items-center mb-8 text-center">
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

          <h1 className="text-3xl font-black text-primary tracking-tight">
            Memphis <span style={{ background: `linear-gradient(135deg, ${PINK}, ${AMBER})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Salón</span>
          </h1>
          <p className="text-[13px] text-primary/45 mt-2 font-medium tracking-wide uppercase" style={{ letterSpacing: '0.18em' }}>
            Panel de administración
          </p>
        </div>

        {/* Card */}
        <div className="relative rounded-2xl p-6 border border-white/10 overflow-hidden"
             style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}>
          <div className="absolute top-0 left-0 right-0 h-1"
               style={{ background: `linear-gradient(90deg, ${PINK}, ${AMBER} 50%, ${CYAN})` }} />

          <form onSubmit={onSubmit} noValidate className="space-y-3 mt-1">
            <input
              type="email"
              inputMode="email"
              className={field}
              placeholder="Correo electrónico"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
              aria-label="Correo electrónico"
            />
            <PasswordField
              value={password}
              onChange={e => setPassword(e.target.value)}
              inputClass={field}
              accent="pink"
            />

            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 mt-4 mb-1">
              <label className="flex items-center gap-2 text-sm text-primary/55 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-white/10"
                  style={{ accentColor: PINK }}
                />
                Mantener sesión iniciada
              </label>
              <button
                type="button"
                onClick={onForgot}
                disabled={resetLoading}
                className="text-sm font-medium disabled:opacity-50 transition-opacity hover:brightness-125"
                style={{ color: PINK }}
              >
                {resetLoading ? 'Enviando…' : '¿Olvidaste tu contraseña?'}
              </button>
            </div>

            <LoginError
              error={error}
              resetSent={resetSent}
              email={email.trim()}
              tenantName={tenantName}
              tenantId={tenantId}
            />

            <button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className="w-full py-3 disabled:opacity-50 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 mt-1 text-primary hover:brightness-110 active:scale-[0.99]"
              style={{ background: `linear-gradient(135deg, ${PINK}, ${AMBER})`, boxShadow: `0 8px 28px ${PINK}44` }}
            >
              {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Ingresar
            </button>
          </form>
        </div>

        <a
          href={whatsappHelpHref({ tenantName, tenantId, email: email.trim() })}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 w-full inline-flex items-center justify-center gap-1.5 text-xs text-primary/40 hover:text-primary/70 transition-colors"
        >
          <WhatsappIcon /> ¿Problemas para entrar? Escríbenos
        </a>

        <p className="text-center text-[11px] text-primary/25 mt-4">Memphis Salón · Viña del Mar</p>
      </div>
    </div>
  );
}
