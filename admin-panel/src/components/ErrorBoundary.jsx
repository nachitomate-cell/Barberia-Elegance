import React from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useTenant } from '../contexts/TenantContext';

// ── Clase base ────────────────────────────────────────────────────────────────
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  async componentDidCatch(error, info) {
    try {
      await addDoc(collection(db, 'system_errors'), {
        message:        error.message || String(error),
        stack:          error.stack   || '',
        componentStack: info.componentStack || '',
        source:         'react',
        tenantId:       this.props.tenantId ?? null,
        url:            window.location.href,
        userAgent:      navigator.userAgent,
        timestamp:      serverTimestamp(),
        status:         'open',
      });
    } catch {
      // Silencio — el handler de error no debe lanzar
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#080d17] flex flex-col items-center justify-center p-8 text-center">
          <div className="max-w-xs">
            <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/25 flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#f97316" viewBox="0 0 256 256">
                <path d="M236.8,188.09,149.35,36.22a24.76,24.76,0,0,0-42.7,0L19.2,188.09a23.51,23.51,0,0,0,0,23.72A24.35,24.35,0,0,0,40.55,224h174.9a24.35,24.35,0,0,0,21.33-12.19A23.51,23.51,0,0,0,236.8,188.09ZM120,104a8,8,0,0,1,16,0v40a8,8,0,0,1-16,0Zm8,88a12,12,0,1,1,12-12A12,12,0,0,1,128,192Z"/>
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-100 mb-3">Algo salió mal</h2>
            <p className="text-sm text-slate-500 leading-relaxed mb-6">
              Ocurrió un error inesperado. El equipo ha sido notificado automáticamente.
            </p>
            <button
              onClick={() => {
                if ('caches' in window) {
                  caches.keys()
                    .then(names => Promise.all(names.map(n => caches.delete(n))))
                    .finally(() => window.location.reload());
                } else {
                  window.location.reload();
                }
              }}
              className="w-full py-3 px-6 rounded-xl bg-orange-500/10 border border-orange-500/25 text-orange-400 text-sm font-semibold hover:bg-orange-500/20 transition-colors cursor-pointer"
            >
              Recargar la página
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Wrapper funcional que inyecta tenantId desde el contexto ─────────────────
export function ErrorBoundaryWithTenant({ children }) {
  const tenant = useTenant();
  return (
    <ErrorBoundary tenantId={tenant?.id ?? null}>
      {children}
    </ErrorBoundary>
  );
}
