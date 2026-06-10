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
  lumen:          '/djones1.png',
  kronnos_penablanca: '/kronnos/kronospena.png',
  kronnos_limache:    '/kronnos/kronoslima.png',
  kronnos_woman:      '/kronnos/kronoswoman.png',
};

export default function LoginPage() {
  const tenant = useTenant();
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error,      setError]      = useState('');
  const [loading,    setLoading]    = useState(false);

  const bgImage = LOGIN_IMAGE[tenant.id];
  const brand   = tenant.brand;

  const field = 'w-full bg-black/40 backdrop-blur-sm border border-white/20 rounded-lg px-4 py-3 text-sm text-white placeholder-white/40 focus:outline-none focus:border-white/50 transition-colors';

  const loginEmail = async e => {
    e?.preventDefault();
    setError('');
    setLoading(true);
    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 overflow-hidden">

      {/* Background image */}
      {bgImage ? (
        <>
          <img
            src={bgImage}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black/60" />
        </>
      ) : (
        <div className="absolute inset-0 bg-slate-950" />
      )}

      {/* Tinte de marca por sede (Kronnos): lavado de color sobre el fondo */}
      {brand && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(120% 90% at 50% 0%, ${brand.hex}40 0%, ${brand.hex}14 35%, transparent 70%)` }}
        />
      )}

      {/* Content */}
      <div className="relative z-10 w-full max-w-sm">

        {/* Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          {brand && tenant.logo && (
            <img
              src={tenant.logo}
              alt=""
              className="w-16 h-16 rounded-2xl object-cover mb-4 shadow-lg"
              style={{ boxShadow: `0 0 0 2px ${brand.hex}, 0 8px 30px ${brand.hex}55` }}
            />
          )}
          <h1 className="text-2xl font-black text-white tracking-tight">{tenant.name}</h1>
          {brand ? (
            <p className="text-sm mt-1.5 font-semibold tracking-wide" style={{ color: brand.hex }}>
              {brand.sede} · <span className="text-white/50 font-medium">{brand.tagline}</span>
            </p>
          ) : (
            <p className="text-sm text-white/50 mt-1">Panel de administración</p>
          )}
        </div>

        {/* Card */}
        <div className="rounded-2xl p-6 border border-white/15" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(20px)' }}>
          <form onSubmit={loginEmail} className="space-y-3">
            <input
              type="email"
              className={field}
              placeholder="Correo electrónico"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
            />
            <input
              type="password"
              className={field}
              placeholder="Contraseña"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <div className="flex items-center mt-4 mb-1">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 bg-gray-700 focus:ring-offset-gray-900"
                style={brand ? { accentColor: brand.hex } : undefined}
              />
              <label htmlFor="rememberMe" className="ml-2 text-sm text-gray-400 select-none cursor-pointer">
                Mantener sesión iniciada
              </label>
            </div>

            {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 disabled:opacity-50 font-bold text-sm rounded-lg transition-all flex items-center justify-center gap-2 mt-1 ${
                brand ? 'text-white hover:brightness-110' : 'bg-white hover:bg-white/90 text-black'
              }`}
              style={brand ? { backgroundColor: brand.hex, boxShadow: `0 6px 24px ${brand.hex}55` } : undefined}
            >
              {loading && <span className={`w-4 h-4 border-2 rounded-full animate-spin ${brand ? 'border-white border-t-transparent' : 'border-black border-t-transparent'}`} />}
              Ingresar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
