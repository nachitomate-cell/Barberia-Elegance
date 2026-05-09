import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  CalendarDays, Scissors, Users, Star, BarChart3,
  Trophy, ShoppingBag, Images, LogOut, ChevronRight,
  Sun, Moon, ExternalLink, Settings, TrendingDown, MessageCircle,
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
  { to: 'mensajes',      label: 'Mensajes',      Icon: MessageCircle, adminOnly: true },
  { to: 'premios',       label: 'Premios',       Icon: Trophy                     },
  { to: 'productos',     label: 'Productos',     Icon: ShoppingBag                },
  { to: 'lookbook',      label: 'Lookbook',      Icon: Images                     },
  { to: 'metricas',      label: 'Métricas',      Icon: BarChart3                  },
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

export default function Sidebar({ onClose, unreadChats = 0 }) {
  const tenant        = useTenant();
  const { role }      = useAuth();
  const isAdminRole   = role === 'admin' || role === 'jefe';
  const visibleNav    = NAV.filter(item => !item.adminOnly || isAdminRole);
  const [light, setLight] = useTheme();

  return (
    <aside className="flex flex-col h-full bg-slate-900 border-r border-slate-800">
      {/* Brand */}
      <div className="px-5 pt-6 pb-5 border-b border-slate-800">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Panel Admin</p>
        <h1 className="text-sm font-bold text-white leading-tight">{tenant.name}</h1>
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
              {({ isActive }) => (
                <>
                  <Icon size={17} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
                  <span className="flex-1">{label}</span>
                  {hasBadge && (
                    <span className="ml-auto bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                      {unreadChats > 9 ? '9+' : unreadChats}
                    </span>
                  )}
                  {isActive && !hasBadge && (
                    <ChevronRight size={14} className="text-emerald-500 opacity-60" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-slate-800 space-y-1">
        {/* Link to public agenda */}
        <a
          href="/index.html"
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

        {/* Synaptechspa branding */}
        <div className="pt-3 mt-1 border-t border-slate-800/60 flex items-center gap-2 px-3">
          <img src="/logo1.png" alt="Synaptech" className="w-5 h-5 rounded object-contain opacity-60" />
          <p className="text-[10px] text-slate-600">Desarrollado por Synaptechspa</p>
        </div>
      </div>
    </aside>
  );
}
