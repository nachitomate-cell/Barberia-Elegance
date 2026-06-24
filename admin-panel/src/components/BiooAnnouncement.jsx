// BiooAnnouncement.jsx — Anuncio modal que invita a usar Bioo (Link in Bio premium).
// Se muestra a todos los usuarios al entrar a gestión-interna hasta que lo cierran.
// La decisión de cerrar se persiste en localStorage para no volver a mostrarlo.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ArrowRight } from 'lucide-react';

const LS_KEY = 'bioo_announcement_dismissed';

export default function BiooAnnouncement() {
  const navigate = useNavigate();

  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(LS_KEY) !== '1';
    } catch {
      return true;
    }
  });

  function dismiss() {
    try { localStorage.setItem(LS_KEY, '1'); } catch {}
    setOpen(false);
  }

  function goToLinkBio() {
    dismiss();
    navigate('/link-bio');
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(6px)' }}
      onClick={dismiss}
    >
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: '#0d0d0d', border: '1px solid rgba(212,175,55,0.25)', boxShadow: '0 0 70px rgba(0,0,0,0.7)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Cerrar (X) */}
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full text-white/80 hover:text-white transition-colors"
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>

        {/* Imagen */}
        <img
          src="/gestion-interna/bio2.png"
          alt="Bioo — tu Link in Bio premium"
          className="w-full h-auto block"
          draggable={false}
        />

        {/* Contenido */}
        <div className="px-6 py-5 space-y-4">
          <div className="space-y-1.5 text-center">
            <h3 className="text-white font-bold text-lg leading-snug">
              Conoce <span style={{ color: '#D4AF37' }}>Bioo</span>
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Tu Link in Bio premium: reúne tu agenda, redes y contacto en un solo
              enlace con tu marca. Créalo en minutos desde el panel.
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            <button
              onClick={goToLinkBio}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-transform hover:scale-[1.02]"
              style={{ background: '#D4AF37', color: '#0d0d0d' }}
            >
              Ir a mi Link in Bio
              <ArrowRight size={16} />
            </button>
            <button
              onClick={dismiss}
              className="w-full px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              Ahora no
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
