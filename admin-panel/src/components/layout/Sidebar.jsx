import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  CalendarDays, Scissors, Users, Star, BarChart3,
  Trophy, ShoppingBag, Images, LogOut, ChevronRight, ChevronDown,
  Sun, Moon, ExternalLink, Settings, TrendingDown, MessageCircle, X,
  Megaphone, ImagePlus, CreditCard, Monitor, Headphones, Medal, Camera,
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { useTenant } from '../../contexts/TenantContext';
import { useAuth }   from '../../contexts/AuthContext';

/* ── Grupos de navegación ────────────────────────────────────────── */
const NAV_GROUPS_DEFAULT = [
  {
    id: 'operaciones',
    label: 'Operaciones',
    items: [
      { to: 'agenda',   label: 'Agenda',   Icon: CalendarDays  },
      { to: 'mensajes', label: 'Mensajes', Icon: MessageCircle },
    ],
  },
  {
    id: 'equipo',
    label: 'Equipo',
    items: [
      { to: 'equipo',            label: 'Equipo',         Icon: Users     },
      { to: 'servicios',         label: 'Servicios',      Icon: Scissors  },
      { to: 'lookbook',          label: 'Lookbook',       Icon: Images    },
      { to: 'instagram',         label: 'Instagram',      Icon: Camera,   adminOnly: true },
      { to: 'servicio-favorito', label: 'Serv. favorito', Icon: ImagePlus },
    ],
  },
  {
    id: 'clientes',
    label: 'Clientes',
    items: [
      { to: 'clientes',  label: 'Clientes',  Icon: Star          },
      { to: 'premios',   label: 'Premios',   Icon: Trophy        },
      { to: 'productos', label: 'Productos', Icon: ShoppingBag   },
    ],
  },
  {
    id: 'analisis',
    label: 'Análisis',
    items: [
      { to: 'metricas', label: 'Métricas', Icon: BarChart3                        },
      { to: 'gastos',   label: 'Gastos',   Icon: TrendingDown, adminOnly: true     },
    ],
  },
  {
    id: 'administracion',
    label: 'Administración',
    adminOnly: true,
    items: [
      { to: 'marketing',     label: 'Marketing',     Icon: Megaphone,  adminOnly: true },
      { to: 'mensualidad',   label: 'Mensualidad',   Icon: CreditCard, adminOnly: true },
      { to: 'tv-config',     label: 'Pantalla TV',   Icon: Monitor,    adminOnly: true },
      { to: 'configuracion', label: 'Configuración', Icon: Settings,   adminOnly: true },
      { to: 'soporte',       label: 'Soporte',       Icon: Headphones, adminOnly: true },
    ],
  },
];

const NAV_GROUPS_DELUXE = [
  {
    id: 'catalogo',
    label: 'Catálogo',
    items: [
      { to: 'productos',  label: 'Productos',   Icon: ShoppingBag },
      { to: 'mensajes',   label: 'Mensajes',    Icon: MessageCircle },
    ],
  },
  {
    id: 'club',
    label: 'Club Deluxe',
    items: [
      { to: 'clientes',   label: 'Miembros',    Icon: Users   },
      { to: 'membresias', label: 'Membresías',  Icon: Medal   },
      { to: 'premios',    label: 'Premios',     Icon: Trophy  },
    ],
  },
  {
    id: 'analisis',
    label: 'Análisis',
    items: [
      { to: 'metricas',   label: 'Métricas',    Icon: BarChart3                    },
      { to: 'finanzas',   label: 'Finanzas',    Icon: TrendingDown, adminOnly: true },
    ],
  },
  {
    id: 'administracion',
    label: 'Administración',
    adminOnly: true,
    items: [
      { to: 'marketing',     label: 'Marketing',     Icon: Megaphone,  adminOnly: true },
      { to: 'configuracion', label: 'Configuración', Icon: Settings,   adminOnly: true },
      { to: 'mensualidad',   label: 'Mensualidad',   Icon: CreditCard, adminOnly: true },
      { to: 'soporte',       label: 'Soporte',       Icon: Headphones, adminOnly: true },
    ],
  },
];

/* ── Hooks auxiliares ────────────────────────────────────────────── */
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

function useBillingAlert() {
  const { id: tenantId } = useTenant();
  const [hasPending, setHasPending] = useState(false);
  useEffect(() => {
    const ref = doc(db, '_billing', tenantId);
    const unsub = onSnapshot(
      ref,
      snap => {
        if (snap.exists()) {
          const d = snap.data();
          setHasPending(d.estadoPago === 'pendiente' || d.estadoPago === 'atrasado' || Number(d.montoPendiente) > 0);
        } else {
          setHasPending(false);
        }
      },
      () => setHasPending(false),
    );
    return unsub;
  }, [tenantId]);
  return hasPending;
}

const LS_KEY_NEWS      = 'synaptech_last_seen_news';
const LATEST_NEWS_DATE = '2026-05-13';

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

/* ── Accent class lookup (full strings required for Tailwind purge) ── */
const ACCENT_CLASSES = {
  emerald: { active: 'bg-emerald-500/10 text-emerald-400', chevron: 'text-emerald-500' },
  cyan:    { active: 'bg-cyan-500/10 text-cyan-400',       chevron: 'text-cyan-500'    },
  lime:    { active: 'bg-lime-500/10 text-lime-400',       chevron: 'text-lime-500'    },
  pink:    { active: 'bg-pink-500/10 text-pink-400',       chevron: 'text-pink-500'    },
  purple:  { active: 'bg-purple-500/10 text-purple-400',   chevron: 'text-purple-500'  },
  slate:   { active: 'bg-slate-500/10 text-slate-300',     chevron: 'text-slate-400'   },
};

/* ── Sidebar ─────────────────────────────────────────────────────── */
export default function Sidebar({ onClose, unreadChats = 0 }) {
  const tenant          = useTenant();
  const { role }        = useAuth();
  const isAdminRole     = role === 'admin' || role === 'jefe';
  const NAV_GROUPS      = tenant.id === 'deluxeperfumes' ? NAV_GROUPS_DELUXE : NAV_GROUPS_DEFAULT;
  const ac              = ACCENT_CLASSES[tenant.accent] ?? ACCENT_CLASSES.emerald;
  const [light, setLight] = useTheme();
  const hasUnreadNews   = useUnreadNews();
  const hasBillingAlert = useBillingAlert();
  const location        = useLocation();

  /* Estado de grupos colapsados */
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('sidebar-collapsed-groups');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  function toggleGroup(id) {
    setCollapsed(prev => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem('sidebar-collapsed-groups', JSON.stringify(next)); } catch {}
      return next;
    });
  }

  /* Auto-expandir el grupo cuando se navega a una ruta dentro de él */
  useEffect(() => {
    const slug = location.pathname.split('/').filter(Boolean).pop();
    NAV_GROUPS.forEach(group => {
      if (group.items.some(item => item.to === slug)) {
        setCollapsed(prev => {
          if (!prev[group.id]) return prev;
          const next = { ...prev, [group.id]: false };
          try { localStorage.setItem('sidebar-collapsed-groups', JSON.stringify(next)); } catch {}
          return next;
        });
      }
    });
  }, [location.pathname]);

  const currentSlug = location.pathname.split('/').filter(Boolean).pop();

  return (
    <aside className="flex flex-col h-full bg-slate-900 border-r border-slate-800">

      {/* Brand */}
      <div
        className="px-5 pb-5 border-b border-slate-800"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 1.5rem)' }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Panel Admin</p>
            <h1 className="text-sm font-bold text-white leading-tight truncate">{tenant.name}</h1>
          </div>
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

      {/* Nav agrupado */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto no-scrollbar">
        {NAV_GROUPS.map(group => {
          const items = group.items.filter(item => !item.adminOnly || isAdminRole);
          if (items.length === 0) return null;
          if (group.adminOnly && !isAdminRole) return null;

          const hasActive = items.some(item => item.to === currentSlug);
          /* El grupo activo nunca se colapsa */
          const isOpen = hasActive || !collapsed[group.id];

          /* Indicador de notificación en el grupo */
          const groupDotColor =
            items.some(i => i.to === 'mensajes'   && unreadChats > 0)   ? 'bg-red-500'   :
            items.some(i => i.to === 'mensualidad' && hasBillingAlert)   ? 'bg-amber-400' :
            items.some(i => i.to === 'soporte'    && hasUnreadNews)      ? 'bg-red-500'   :
            null;

          return (
            <div key={group.id} className="mb-2">

              {/* Cabecera del grupo */}
              <button
                onClick={() => !hasActive && toggleGroup(group.id)}
                className="w-full flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-800/40 transition-colors group/hdr"
              >
                <span className="flex-1 text-left text-[10px] font-bold text-slate-600 uppercase tracking-widest group-hover/hdr:text-slate-400 transition-colors">
                  {group.label}
                </span>
                {/* Dot de notificación visible cuando está colapsado */}
                {!isOpen && groupDotColor && (
                  <span className={`w-1.5 h-1.5 rounded-full animate-pulse shrink-0 ${groupDotColor}`} />
                )}
                <ChevronDown
                  size={12}
                  className={`text-slate-700 group-hover/hdr:text-slate-500 transition-all duration-200 ${isOpen ? '' : '-rotate-90'}`}
                />
              </button>

              {/* Items con animación de colapso */}
              <div
                className="overflow-hidden transition-all duration-200"
                style={{ maxHeight: isOpen ? '20rem' : '0px', opacity: isOpen ? 1 : 0 }}
              >
                <div className="space-y-0.5 pt-0.5 pb-1">
                  {items.map(({ to, label, Icon }) => {
                    const isMensajes    = to === 'mensajes';
                    const hasBadge      = isMensajes && unreadChats > 0;
                    const showNewsDot   = to === 'soporte'    && hasUnreadNews;
                    const showBillingDot = to === 'mensualidad' && hasBillingAlert;
                    return (
                      <NavLink
                        key={to}
                        to={to}
                        onClick={onClose}
                        className={({ isActive }) =>
                          `group/item flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            isActive
                              ? ac.active
                              : 'text-slate-400 hover:text-white hover:bg-slate-800'
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <Icon size={16} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
                            <span className="flex-1">{label}</span>
                            {(showNewsDot || showBillingDot) && !hasBadge && (
                              <span className={`w-1.5 h-1.5 rounded-full animate-pulse shrink-0 ${showBillingDot ? 'bg-amber-400' : 'bg-red-500'}`} />
                            )}
                            {hasBadge && (
                              <span className="ml-auto bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                                {unreadChats > 9 ? '9+' : unreadChats}
                              </span>
                            )}
                            {isActive && !hasBadge && !showNewsDot && !showBillingDot && (
                              <ChevronRight size={14} className={`${ac.chevron} opacity-60`} />
                            )}
                          </>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>

            </div>
          );
        })}
      </nav>

      {/* Membresías — solo Chameleon */}
      {tenant.id === 'chameleon' && (
        <div className="mb-2">
          <button className="w-full flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-800/40 transition-colors group/hdr">
            <span className="flex-1 text-left text-[10px] font-bold text-slate-600 uppercase tracking-widest group-hover/hdr:text-slate-400 transition-colors">
              Membresías
            </span>
          </button>
          <div className="space-y-0.5 pt-0.5 pb-1">
            <NavLink
              to="membresias"
              onClick={onClose}
              className={({ isActive }) =>
                `group/item flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive ? ac.active : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Medal size={16} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
                  <span className="flex-1">Membresías</span>
                  {isActive && <ChevronRight size={14} className={`${ac.chevron} opacity-60`} />}
                </>
              )}
            </NavLink>
          </div>
        </div>
      )}

      {/* Footer */}
      <div
        className="px-3 pt-4 border-t border-slate-800 space-y-1"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)' }}
      >
        <a
          href={
            tenant.id === 'deluxeperfumes'
              ? `/catalogo?local=deluxeperfumes`
              : `/index.html?local=${tenant.id}`
          }
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:text-white hover:bg-slate-800 transition-all"
        >
          <ExternalLink size={17} />
          {tenant.id === 'deluxeperfumes' ? 'Ver catálogo' : 'Ver agenda pública'}
        </a>

        <button
          onClick={() => setLight(v => !v)}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:text-white hover:bg-slate-800 transition-all"
        >
          {light ? <Moon size={17} /> : <Sun size={17} />}
          {light ? 'Modo oscuro' : 'Modo claro'}
        </button>

        <button
          onClick={() => signOut(auth)}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition-all"
        >
          <LogOut size={17} />
          Cerrar sesión
        </button>

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
