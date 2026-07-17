import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X, Calendar, ShoppingBag, ChevronRight, HelpCircle } from 'lucide-react';
import Sidebar    from './Sidebar';
import PWABanner           from './PWABanner';
import NotificationBanner  from './NotificationBanner';
import BillingBanner       from './BillingBanner';
import PendingAppointmentsBanner from '../PendingAppointmentsBanner';
import ContextualHelpButton     from '../ContextualHelpButton';
import { useChatNotifications }       from '../../hooks/useChatNotifications';
import { useAppointmentNotifications } from '../../hooks/useAppointmentNotifications';

// Tarjeta de notificación Toast interactiva y auto-animada
function ToastCard({ id, type, title, description, targetPath, onDismiss }) {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const duration = 8000; // 8 segundos de auto-descarte
    const intervalTime = 50;
    const step = (intervalTime / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          onDismiss(id);
          return 0;
        }
        return prev - step;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [id, onDismiss]);

  const handleAction = () => {
    if (targetPath) {
      navigate(targetPath);
    }
    onDismiss(id);
  };

  const Icon = type === 'appointment' ? Calendar : ShoppingBag;
  const isAppointment = type === 'appointment';
  const accentBg     = isAppointment ? 'bg-amber-500'       : 'bg-emerald-500';
  const accentText   = isAppointment ? 'text-amber-500'     : 'text-emerald-500';
  const accentBorder = isAppointment ? 'border-l-amber-500' : 'border-l-emerald-500';

  return (
    <div
      data-toast-card
      className={`relative w-80 bg-slate-900 border border-slate-800 border-l-4 ${accentBorder} rounded-xl shadow-lg overflow-hidden p-4 flex flex-col gap-2 animate-slide-in-right pointer-events-auto`}
    >
      {/* Cabecera */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className={accentText} size={16} />
          <h4 className={`text-xs font-bold uppercase tracking-wider ${accentText}`}>
            {title}
          </h4>
        </div>
        <button
          onClick={() => onDismiss(id)}
          data-toast-close
          className="text-slate-400 hover:text-primary transition-colors p-0.5 rounded"
        >
          <X size={14} />
        </button>
      </div>

      {/* Descripción / Mensaje */}
      <p className="text-sm font-medium text-slate-200 leading-relaxed">
        {description}
      </p>

      {/* Botón de acción */}
      <div className="flex justify-end mt-1">
        <button
          onClick={handleAction}
          data-toast-action
          className="flex items-center gap-1 text-sm font-semibold text-primary px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 transition-colors border border-slate-700"
        >
          <span>Ver detalles</span>
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Barra de progreso de auto-descarte */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800">
        <div
          className={`h-full ${accentBg} transition-all duration-75`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export default function AdminLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  // Sidebar colapsable en desktop (persistido). En mobile no aplica —
  // ahí el drawer sigue siendo un overlay independiente.
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar-collapsed') === '1'; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem('sidebar-collapsed', collapsed ? '1' : '0'); } catch { /* noop */ }
  }, [collapsed]);
  const [toasts, setToasts] = useState([]);
  const unreadChats = useChatNotifications();

  // Función para inyectar nuevos Toasts
  const handleAddToast = (toast) => {
    setToasts((prev) => {
      // Evitar duplicar el mismo toast si se emite repetidamente
      if (prev.some(t => t.id.split('-')[0] === toast.id.split('-')[0])) return prev;
      return [...prev, toast];
    });
  };

  // Función para descartar Toasts
  const handleDismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Escuchar notificaciones y vincular el callback de Toasts
  useAppointmentNotifications(handleAddToast);

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden relative">
      
      {/* Estilos CSS Inline autoprotegidos para micro-animaciones */}
      <style>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100%) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* ── Desktop sidebar (always visible ≥ lg) ──
          Estructura wrapper/inner que arregla el recorte del toggle:
          - Wrapper (esta <aside>): reserva el espacio flex (w-60 o w-0) y
            SIN overflow-hidden, para que el botón (absolute -right-3.5)
            pueda sobresalir a la derecha aunque el sidebar colapse.
          - Inner (<div>): posición absoluta con w-60 fija + overflow-hidden
            propio. Al colapsar, se desliza con -translate-x-full en lugar
            de deformarse. Así el contenido nunca reflowa a mitad de la
            animación y el ancho de los items es siempre estable. */}
      <aside
        className={`hidden lg:flex relative flex-shrink-0 h-screen bg-slate-900 border-r border-slate-800 transition-all duration-300 ease-in-out ${collapsed ? 'lg:w-0' : 'lg:w-60'}`}
      >
        <div
          className={`absolute top-0 left-0 h-full w-60 flex flex-col overflow-hidden transition-transform duration-300 ease-in-out ${collapsed ? '-translate-x-full' : 'translate-x-0'}`}
        >
          <Sidebar unreadChats={unreadChats} />
        </div>
        {/* Toggle flotante — hijo directo del wrapper (fuera del inner con
            overflow-hidden). Queda siempre visible: cuando colapsa, la mitad
            derecha del botón "asoma" 14px en el main area (siempre clickeable). */}
        <button
          onClick={() => setCollapsed(v => !v)}
          className="hidden lg:flex absolute top-10 -right-3.5 z-50 h-7 w-7 items-center justify-center rounded-full bg-slate-800 border border-slate-600 text-slate-400 hover:text-primary hover:bg-slate-700 hover:border-slate-400 shadow-md transition-colors cursor-pointer"
          aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
        >
          {/* Chevron minimalista — apunta hacia adentro (izq) al estar abierto,
              y rota 180° para apuntar hacia afuera (der) al colapsar. */}
          <svg
            className={`transform transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </aside>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] flex lg:hidden animate-fade-in">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Panel */}
          <div className="relative z-10 w-64 flex flex-col animate-slide-in-right">
            <Sidebar onClose={() => setMobileOpen(false)} unreadChats={unreadChats} />
          </div>
        </div>
      )}

      {/* ── Main area — flex-1 se expande al colapsar el sidebar ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300">

        {/* Mobile topbar */}
        <header
          className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 pb-3 bg-slate-900 border-b border-slate-800 shrink-0"
          style={{ paddingTop: 'max(env(safe-area-inset-top), 0.75rem)' }}
        >
          {/* Hamburger — 44×44px touch target */}
          <button
            onClick={() => setMobileOpen(true)}
            className="w-11 h-11 flex items-center justify-center -ml-1 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-primary transition-all"
            aria-label="Abrir menú"
          >
            <Menu size={22} />
          </button>

          <span className="text-sm font-bold text-primary tracking-wide">Panel Admin</span>

          {/* Spacer espejo para centrar el título */}
          <div className="w-11" />
        </header>

        {/* PWA install banner */}
        <PWABanner />

        {/* Push notification opt-in banner */}
        <NotificationBanner />

        {/* Aviso de cobro (próximo a vencer / atrasado) */}
        <BillingBanner />

        {/* End of day pending appointments banner */}
        <PendingAppointmentsBanner />

        {/* Page content */}
        <main
          data-app-canvas
          className="flex-1 overflow-y-auto bg-slate-950 p-5 lg:p-7"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1.25rem)' }}
        >
          {children}
        </main>

      </div>

      {/* Contenedor de Alertas Toasts Flotantes */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 pointer-events-none">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} {...toast} onDismiss={handleDismissToast} />
        ))}
      </div>

      {/* Botón flotante de ayuda contextual: detecta la ruta actual y
          abre la guía relacionada del Centro de Ayuda. Ver helpMap.js */}
      <ContextualHelpButton />

    </div>
  );
}
