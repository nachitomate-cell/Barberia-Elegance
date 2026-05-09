import { NavLink } from 'react-router-dom';
import {
  CalendarDays, Scissors, Users, Star, BarChart3,
  Trophy, ShoppingBag, Images, LogOut, ChevronRight,
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useTenant } from '../../contexts/TenantContext';
import { useAuth }   from '../../contexts/AuthContext';

const NAV = [
  { to: 'agenda',    label: 'Agenda',    Icon: CalendarDays, adminOnly: false },
  { to: 'servicios', label: 'Servicios', Icon: Scissors                       },
  { to: 'equipo',    label: 'Equipo',    Icon: Users                          },
  { to: 'clientes',  label: 'Clientes',  Icon: Star                           },
  { to: 'premios',   label: 'Premios',   Icon: Trophy                         },
  { to: 'productos', label: 'Productos', Icon: ShoppingBag                    },
  { to: 'lookbook',  label: 'Lookbook',  Icon: Images                         },
  { to: 'metricas',  label: 'Métricas',  Icon: BarChart3                      },
];

export default function Sidebar({ onClose }) {
  const tenant        = useTenant();
  const { role }      = useAuth();
  const isAdminRole   = role === 'admin' || role === 'jefe';
  const visibleNav    = NAV.filter(item => !(item.to === 'agenda' && isAdminRole));

  return (
    <aside className="flex flex-col h-full bg-slate-900 border-r border-slate-800">
      {/* Brand */}
      <div className="px-5 pt-6 pb-5 border-b border-slate-800">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Panel Admin</p>
        <h1 className="text-sm font-bold text-white leading-tight">{tenant.name}</h1>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto no-scrollbar">
        {visibleNav.map(({ to, label, Icon }) => (
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
                <Icon size={17} strokeWidth={isActive ? 2.5 : 2} />
                <span className="flex-1">{label}</span>
                {isActive && <ChevronRight size={14} className="text-emerald-500 opacity-60" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-slate-800">
        <button
          onClick={() => signOut(auth)}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition-all"
        >
          <LogOut size={17} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
