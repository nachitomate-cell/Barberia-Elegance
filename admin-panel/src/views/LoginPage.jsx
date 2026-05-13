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
};

export default function LoginPage() {
  const tenant = useTenant();
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error,      setError]      = useState('');
  const [loading,    setLoading]    = useState(false);

  const bgImage = LOGIN_IMAGE[tenant.id];

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

      {/* Content */}
      <div className="relative z-10 w-full max-w-sm">

        {/* Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <h1 className="text-2xl font-black text-white tracking-tight">{tenant.name}</h1>
          <p className="text-sm text-white/50 mt-1">Panel de administración</p>
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
                className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-gray-900"
              />
              <label htmlFor="rememberMe" className="ml-2 text-sm text-gray-400 select-none cursor-pointer">
                Mantener sesión iniciada
              </label>
            </div>

            {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-white hover:bg-white/90 disabled:opacity-50 text-black font-bold text-sm rounded-lg transition-all flex items-center justify-center gap-2 mt-1"
            >
              {loading && <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />}
              Ingresar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
