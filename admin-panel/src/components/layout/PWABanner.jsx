import { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

const STORAGE_KEY = 'pwa-banner-dismissed';

export default function PWABanner() {
  const [show,         setShow]         = useState(false);
  const [installEvent, setInstallEvent] = useState(null);
  const [installing,   setInstalling]   = useState(false);
  const [isIOS,        setIsIOS]        = useState(false);

  useEffect(() => {
    // No mostrar si ya está instalada como PWA
    const isPWA = window.matchMedia('(display-mode: standalone)').matches
               || window.navigator.standalone === true;
    if (isPWA) return;

    // No mostrar si fue descartada antes
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed) return;

    // Detectar iOS (Safari no dispara beforeinstallprompt)
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
             && !window.MSStream;
    setIsIOS(ios);

    if (ios) {
      // En iOS siempre mostramos el banner con instrucciones manuales
      setShow(true);
      return;
    }

    // En Chrome/Edge/Android capturamos el evento de instalación
    const handler = e => {
      e.preventDefault();
      setInstallEvent(e);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installEvent) return;
    setInstalling(true);
    try {
      await installEvent.prompt();
      const { outcome } = await installEvent.userChoice;
      if (outcome === 'accepted') {
        dismiss();
      }
    } finally {
      setInstalling(false);
    }
  };

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="shrink-0 mx-4 mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 overflow-hidden">
      <div className="flex items-start gap-3 px-4 py-3">

        {/* Ícono */}
        <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0 mt-0.5">
          <Smartphone size={17} className="text-emerald-400" />
        </div>

        {/* Texto */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white leading-tight">
            Instala el Panel Admin
          </p>
          {isIOS ? (
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              Toca <span className="font-semibold text-slate-300">Compartir</span> →{' '}
              <span className="font-semibold text-slate-300">Añadir a inicio</span> para
              acceder sin abrir el navegador.
            </p>
          ) : (
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              Acceso directo desde tu pantalla de inicio, sin navegador.
            </p>
          )}

          {/* Botón instalar (solo en Chrome/Android) */}
          {!isIOS && installEvent && (
            <button
              onClick={handleInstall}
              disabled={installing}
              className="flex items-center gap-1.5 mt-2.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-all"
            >
              {installing ? (
                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download size={12} />
              )}
              {installing ? 'Instalando…' : 'Instalar app'}
            </button>
          )}
        </div>

        {/* Cerrar */}
        <button
          onClick={dismiss}
          className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-slate-800 transition-all shrink-0"
          aria-label="Cerrar"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
