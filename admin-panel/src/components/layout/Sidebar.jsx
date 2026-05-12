import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  CalendarDays, Scissors, Users, Star, BarChart3,
  Trophy, ShoppingBag, Images, LogOut, ChevronRight,
  Sun, Moon, ExternalLink, Settings, TrendingDown, MessageCircle, X, Megaphone,
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useTenant } from '../../contexts/TenantContext';
import { useAuth }   from '../../contexts/AuthContext';

const NAV = [
  { to: 'agenda',        label: 'Agenda',        Icon: CalendarDays               },
  { to: 'servicios',     label: 'Servicios',     Icon: Scissors                   },
  { to: 'equipo',        label: 'Equipo',        Icon: Users                      },
  { to: 'clientes',      label: 'Clientes',      Icon: Star                       },
  { to: 'mensajes',      label: 'Mensajes',      Icon: MessageCircle              },
  { to: 'premios',       label: 'Premios',       Icon: Trophy                     },
  { to: 'productos',     label: 'Productos',     Icon: ShoppingBag                },
  { to: 'lookbook',      label: 'Lookbook',      Icon: Images                     },
  { to: 'metricas',      label: 'Métricas',      Icon: BarChart3                  },
  { to: 'marketing',     label: 'Marketing',     Icon: Megaphone,     adminOnly: true },
  { to: 'gastos',        label: 'Gastos',        Icon: TrendingDown,  adminOnly: true },
  { to: 'configuracion', label: 'Configuración', Icon: Settings,      adminOnly: true },
];

function useTheme() {
  const [light, setLight] = useState(() => {
    try { return localStorage.getItem('gestion-theme') === 'light'; } catch { return false; }
  });

  useEffect(() => {
    document.documentElement.classList.toggle('light', light);
    try { localStorage.setItem('gestion-theme', light ? 'light' : 'dark'); } catch {}
  }, [light]);

  return [light, setLight];
}

const LS_KEY_NEWS = 'synaptech_last_seen_news';
const LATEST_NEWS_DATE = '2026-05-09';

function useUnreadNews() {
  const [unread, setUnread] = useState(() => {
    try { return (localStorage.getItem(LS_KEY_NEWS) ?? '') < LATEST_NEWS_DATE; } catch { return false; }
  });
  useEffect(() => {
    function check() {
      try { setUnread((localStorage.getItem(LS_KEY_NEWS) ?? '') < LATEST_NEWS_DATE); } catch {}
    }
    window.addEventListener('storage', check);
    return () => window.removeEventListener('storage', check);
  }, []);
  return unread;
}

export default function Sidebar({ onClose, unreadChats = 0 }) {
  const tenant        = useTenant();
  const { role }      = useAuth();
  const isAdminRole   = role === 'admin' || role === 'jefe';
  const visibleNav    = NAV.filter(item => !item.adminOnly || isAdminRole);
  const [light, setLight] = useTheme();
  const hasUnreadNews = useUnreadNews();

  return (
    <aside className="flex flex-col h-full bg-slate-900 border-r border-slate-800">
      {/* Brand — safe-area-inset-top para que el notch no tape el título */}
      <div
        className="px-5 pb-5 border-b border-slate-800"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 1.5rem)' }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Panel Admin</p>
            <h1 className="text-sm font-bold text-white leading-tight truncate">{tenant.name}</h1>
          </div>
          {/* Botón X visible solo en el drawer móvil (onClose se pasa solo en móvil) */}
          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center shrink-0 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700 active:scale-95 transition-all mt-0.5"
              aria-label="Cerrar menú"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto no-scrollbar">
        {visibleNav.map(({ to, label, Icon }) => {
          const isMensajes = to === 'mensajes';
          const hasBadge   = isMensajes && unreadChats > 0;
          return (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`
              }
            >
              {({ isActive }) => {
                const isMetricas   = to === 'metricas';
                const showNewsDot  = isMetricas && hasUnreadNews;
                const showBadge    = hasBadge;
                return (
                  <>
                    <Icon size={17} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
                    <span className="flex-1">{label}</span>
                    {showNewsDot && !showBadge && (
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                    )}
                    {showBadge && (
                      <span className="ml-auto bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                        {unreadChats > 9 ? '9+' : unreadChats}
                      </span>
                    )}
                    {isActive && !showBadge && !showNewsDot && (
                      <ChevronRight size={14} className="text-emerald-500 opacity-60" />
                    )}
                  </>
                );
              }}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer — safe-area-inset-bottom para el home indicator */}
      <div
        className="px-3 pt-4 border-t border-slate-800 space-y-1"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)' }}
      >
        {/* Link to public agenda */}
        <a
          href={`/index.html?local=${tenant.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:text-white hover:bg-slate-800 transition-all"
        >
          <ExternalLink size={17} />
          Ver agenda pública
        </a>

        {/* Theme toggle */}
        <button
          onClick={() => setLight(v => !v)}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:text-white hover:bg-slate-800 transition-all"
        >
          {light ? <Moon size={17} /> : <Sun size={17} />}
          {light ? 'Modo oscuro' : 'Modo claro'}
        </button>

        {/* Logout */}
        <button
          onClick={() => signOut(auth)}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition-all"
        >
          <LogOut size={17} />
          Cerrar sesión
        </button>

        {/* SynapTech branding */}
        <div className="pt-3 mt-1 border-t border-slate-800/60 px-3">
          <a
            href="https://www.synaptechspa.cl/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <img src="/logo1.png" alt="SynapTech" className="w-5 h-5 rounded object-contain opacity-60" />
            <p className="text-[10px] text-slate-600">Desarrollado con ❤️ por SynapTech</p>
          </a>
        </div>
      </div>
    </aside>
  );
}
