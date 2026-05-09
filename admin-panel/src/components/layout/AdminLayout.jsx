import { useState } from 'react';
import { Menu } from 'lucide-react';
import Sidebar    from './Sidebar';
import PWABanner  from './PWABanner';
import { useChatNotifications }       from '../../hooks/useChatNotifications';
import { useAppointmentNotifications } from '../../hooks/useAppointmentNotifications';

export default function AdminLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const unreadChats = useChatNotifications();
  useAppointmentNotifications();

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">

      {/* ── Desktop sidebar (always visible ≥ lg) ── */}
      <div className="hidden lg:flex lg:flex-col lg:w-60 lg:shrink-0">
        <Sidebar unreadChats={unreadChats} />
      </div>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden animate-fade-in">
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

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Mobile topbar */}
        <header
          className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 pb-3 bg-slate-900 border-b border-slate-800 shrink-0"
          style={{ paddingTop: 'max(env(safe-area-inset-top), 0.75rem)' }}
        >
          {/* Hamburger — 44×44px touch target */}
          <button
            onClick={() => setMobileOpen(true)}
            className="w-11 h-11 flex items-center justify-center -ml-1 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white transition-all"
            aria-label="Abrir menú"
          >
            <Menu size={22} />
          </button>

          <span className="text-sm font-bold text-white tracking-wide">Panel Admin</span>

          {/* Spacer espejo para centrar el título */}
          <div className="w-11" />
        </header>

        {/* PWA install banner */}
        <PWABanner />

        {/* Page content */}
        <main
          className="flex-1 overflow-y-auto bg-slate-950 p-5 lg:p-7"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1.25rem)' }}
        >
          {children}
        </main>

      </div>
    </div>
  );
}
