import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  CalendarDays, Scissors, Users, Star, BarChart3,
  Trophy, ShoppingBag, Images, LogOut, ChevronRight,
  Sun, Moon, ExternalLink, Settings, TrendingDown, MessageCircle, X,
  Megaphone, ImagePlus, CreditCard, Monitor, Headphones, Medal, Camera, GraduationCap, Wallet, Package, ThumbsUp,
  Globe, Banknote, Gift, ClipboardList, Building2, Home, Lock, HelpCircle,
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { doc, onSnapshot, where } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { useTenant } from '../../contexts/TenantContext';
import { useAuth }   from '../../contexts/AuthContext';
import { useCollection } from '../../hooks/useCollection';
import { useBillingRestriction } from '../BillingGate';

// Secciones que se bloquean cuando el pago está muy atrasado (modo restringido).
const SECCIONES_BLOQUEADAS = new Set(['metricas', 'comisiones', 'caja', 'gastos', 'marketing', 'finanzas']);

// Tenants con módulo de Membresías (suscripción) activo en el panel.
const MEMBRESIAS_TENANTS = new Set(['chameleon', 'yugen']);

/* ── Grupos de navegación ────────────────────────────────────────── */
const NAV_GROUPS_DEFAULT = [
  {
    id: 'operaciones',
    label: 'Operaciones',
    items: [
      { to: 'inicio',         label: 'Inicio',          Icon: Home          },
      { to: 'agenda',         label: 'Agenda',          Icon: CalendarDays  },
      { to: 'mensajes',       label: 'Mensajes',        Icon: MessageCircle },
      { to: 'lista-espera',   label: 'Lista de espera', Icon: ClipboardList },
      { to: 'reserva-online', label: 'Reserva online',  Icon: Globe         },
    ],
  },
  {
    id: 'equipo',
    label: 'Equipo',
    items: [
      { to: 'equipo',    label: 'Equipo',    Icon: Users    },
      { to: 'servicios', label: 'Servicios', Icon: Scissors },
    ],
  },
  {
    id: 'contenido',
    label: 'Contenido',
    items: [
      { to: 'lookbook',          label: 'Lookbook',         Icon: Images    },
      { to: 'instagram',         label: 'Instagram',        Icon: Camera,   adminOnly: true },
      { to: 'servicio-favorito', label: 'Foto de servicio', Icon: ImagePlus },
    ],
  },
  {
    id: 'clientes',
    label: 'Clientes',
    items: [
      { to: 'clientes',  label: 'Clientes',  Icon: Star        },
      { to: 'resenas',   label: 'Reseñas',   Icon: ThumbsUp    },
      { to: 'premios',   label: 'Premios',   Icon: Trophy      },
      { to: 'productos', label: 'Productos', Icon: ShoppingBag },
    ],
  },
  {
    id: 'analisis',
    label: 'Análisis',
    items: [
      { to: 'metricas',    label: 'Métricas',        Icon: BarChart3,    adminOnly: false },
      { to: 'comisiones',  label: 'Comisiones',      Icon: Banknote,     adminOnly: true  },
      { to: 'inventario',  label: 'Inventario',      Icon: Package,      adminOnly: true  },
      { to: 'gastos',      label: 'Gastos',          Icon: TrendingDown, adminOnly: true  },
      { to: 'caja',        label: 'Control de Caja', Icon: Wallet,       adminOnly: true  },
    ],
  },
  {
    id: 'administracion',
    label: 'Administración',
    adminOnly: true,
    items: [
      { to: 'marketing',     label: 'Marketing',      Icon: Megaphone,   adminOnly: true },
      { to: 'gift-cards',    label: 'Gift Cards',     Icon: Gift,        adminOnly: true },
      // Oculto del sidebar (la ruta /sucursales sigue activa si se accede directo).
      // { to: 'sucursales',    label: 'Sucursales',     Icon: Building2,   adminOnly: true },
      { to: 'mensualidad',   label: 'Mensualidad',    Icon: CreditCard,  adminOnly: true },
      { to: 'tv-config',     label: 'Pantalla TV',    Icon: Monitor,     adminOnly: true },
      { to: 'configuracion', label: 'Configuración',  Icon: Settings,    adminOnly: true },
      { to: 'consultas',     label: 'Consultas',      Icon: HelpCircle,  adminOnly: true },
      { to: 'soporte',       label: 'Soporte',        Icon: Headphones,  adminOnly: true },
    ],
  },
];

const NAV_GROUPS_DELUXE = [
  {
    id: 'catalogo',
    label: 'Catálogo',
    items: [
      { to: 'inicio',     label: 'Inicio',      Icon: Home          },
      { to: 'productos',  label: 'Productos',   Icon: ShoppingBag   },
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
      { to: 'metricas',   label: 'Métricas',    Icon: BarChart3                     },
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
      { to: 'consultas',     label: 'Consultas',     Icon: HelpCircle, adminOnly: true },
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
          // También se considera "pendiente" si la fecha de próximo pago ya venció.
          let vencida = false;
          if (d.fechaProximoPago) {
            try {
              const f = d.fechaProximoPago;
              const dt = f.toDate ? f.toDate() : new Date(`${f}T00:00:00`);
              const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
              vencida = !isNaN(dt.getTime()) && dt < hoy;
            } catch { vencida = false; }
          }
          setHasPending(d.estadoPago === 'pendiente' || d.estadoPago === 'atrasado' || Number(d.montoPendiente) > 0 || vencida);
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
const LATEST_NEWS_DATE = '2026-05-23';

function useAcademiaEnabled() {
  const { id: tenantId } = useTenant();
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    if (tenantId !== 'elegance') return;
    const ref = doc(db, `tenants/${tenantId}/settings`, 'general');
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) {
        const d = snap.data();
        setEnabled(!!d.features?.hasAcademiaInternal);
      }
    }, () => {});
    return unsub;
  }, [tenantId]);
  return enabled;
}

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
  red:     { active: 'bg-red-500/10 text-red-400',         chevron: 'text-red-500'     },
  orange:  { active: 'bg-orange-500/10 text-orange-400',   chevron: 'text-orange-500'  },
};

/* ── Sidebar ─────────────────────────────────────────────────────── */
export default function Sidebar({ onClose, unreadChats = 0 }) {
  const tenant          = useTenant();
  const { role }        = useAuth();
  const isAdminRole     = role === 'admin' || role === 'jefe';
  const ac              = ACCENT_CLASSES[tenant.accent] ?? ACCENT_CLASSES.emerald;
  const [light, setLight] = useTheme();
  const hasUnreadNews   = useUnreadNews();
  const hasBillingAlert = useBillingAlert();
  const hasAcademia     = useAcademiaEnabled();
  const { restringido } = useBillingRestriction();
  const location        = useLocation();

  const { data: pendingCitas }    = useCollection('citas',               [where('estado',  '==', 'Pendiente')]);
  const { data: pendingReservas } = useCollection('product_reservations', [where('status',  '==', 'pending')]);

  const pendingCitasCount    = pendingCitas?.length    || 0;
  const pendingReservasCount = pendingReservas?.length || 0;

  const NAV_GROUPS = (() => {
    if (tenant.id === 'deluxeperfumes') return NAV_GROUPS_DELUXE;

    let base = NAV_GROUPS_DEFAULT.map(group => {
      if (group.id !== 'clientes') return group;
      // Inyectar Membresías en Clientes para los tenants con suscripción activa.
      if (!MEMBRESIAS_TENANTS.has(tenant.id)) return group;
      return {
        ...group,
        items: [
          ...group.items,
          { to: 'membresias', label: 'Membresías', Icon: Medal },
        ],
      };
    });

    if (tenant.id === 'elegance' && hasAcademia) {
      base = [
        ...base.slice(0, 1),
        { id: 'academia', label: 'Academia', items: [{ to: 'academia', label: 'Academia', Icon: GraduationCap }] },
        ...base.slice(1),
      ];
    }

    return base;
  })();

  const currentSlug = location.pathname.split('/').filter(Boolean).pop();

  return (
    <aside className="flex flex-col h-full bg-slate-900 border-r border-slate-800">

      {/* Brand */}
      <div
        className="px-5 pb-5 border-b border-slate-800"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 1.5rem)' }}
      >
        <div className="flex items-start justify-between gap-2">
          {tenant.logo && (
            <img src={tenant.logo} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0 mt-0.5" />
          )}
          <div className="min-w-0 flex-1">
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

          return (
            <div key={group.id} className="mb-4">

              {/* Cabecera del grupo — solo visual, sin colapso */}
              <div className="flex items-center gap-2 px-3 mb-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  {group.label}
                </span>
                <div className="flex-1 h-px bg-slate-800" />
              </div>

              {/* Items */}
              <div className="space-y-0.5">
                {items.map(({ to, label, Icon }) => {
                  const isMensajes  = to === 'mensajes';
                  const isAgenda    = to === 'agenda';
                  const isProductos = to === 'productos';

                  const hasBadge   = (isMensajes && unreadChats > 0) ||
                                     (isAgenda && pendingCitasCount > 0) ||
                                     (isProductos && pendingReservasCount > 0);

                  const badgeCount = isMensajes  ? unreadChats :
                                     isAgenda    ? pendingCitasCount :
                                     isProductos ? pendingReservasCount : 0;

                  const badgeColorClass = isMensajes  ? 'bg-red-500 text-white' :
                                          isAgenda    ? 'bg-amber-500 text-amber-950 font-bold' :
                                          isProductos ? 'bg-emerald-500 text-emerald-950 font-bold' : '';

                  const showNewsDot    = to === 'soporte'    && hasUnreadNews;
                  const showBillingDot = to === 'mensualidad' && hasBillingAlert;

                  return (
                    <NavLink
                      key={to}
                      to={to}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `group/item relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          isActive
                            ? `${ac.active} pl-4`
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-md bg-current" />
                          )}
                          <Icon size={16} strokeWidth={isActive ? 2.5 : 2} className="shrink-0 group-hover/item:scale-110 group-hover/item:translate-x-0.5 transition-transform duration-150" />
                          <span className="flex-1">{label}</span>
                          {restringido && SECCIONES_BLOQUEADAS.has(to) && (
                            <Lock size={12} className="shrink-0 text-red-400/70" />
                          )}
                          {(showNewsDot || showBillingDot) && !hasBadge && (
                            <span className={`w-1.5 h-1.5 rounded-full animate-pulse shrink-0 ${showBillingDot ? 'bg-amber-400' : 'bg-red-500'}`} />
                          )}
                          {hasBadge && (
                            <span className={`ml-auto text-xs w-5 h-5 flex items-center justify-center rounded-full shrink-0 ${badgeColorClass}`}>
                              {badgeCount > 9 ? '9+' : badgeCount}
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
          );
        })}
      </nav>

      {/* Footer */}
      <div
        className="px-3 pt-4 border-t border-slate-800 space-y-2.5"
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
          className="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm font-bold border border-slate-700/80 hover:border-slate-500 hover:bg-slate-800 text-white transition-all shadow-sm active:scale-[0.98]"
        >
          <ExternalLink size={15} />
          <span>{tenant.id === 'deluxeperfumes' ? 'Ver catálogo' : 'Ver agenda pública'}</span>
        </a>

        <div className="flex gap-2">
          <button
            onClick={() => setLight(v => !v)}
            title={light ? 'Activar modo oscuro' : 'Activar modo claro'}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl bg-slate-800/40 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-all active:scale-95"
          >
            {light ? <Moon size={16} /> : <Sun size={16} />}
            <span className="text-[10px] font-medium leading-none">{light ? 'Modo oscuro' : 'Modo claro'}</span>
          </button>

          <button
            onClick={() => signOut(auth)}
            title="Cerrar sesión"
            className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl bg-red-950/10 border border-red-950/20 text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition-all active:scale-95"
          >
            <LogOut size={16} />
            <span className="text-[10px] font-medium leading-none">Cerrar sesión</span>
          </button>
        </div>

        <div className="pt-3 mt-1 border-t border-slate-800/60 px-3 flex items-center justify-between gap-2">
          <a
            href="https://www.synaptechspa.cl/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <img src="/logo1.png" alt="SynapTech" className="w-5 h-5 rounded object-contain opacity-60" />
            <p className="text-[10px] text-slate-600">Desarrollado por SynapTech</p>
          </a>
          <a
            href="https://www.instagram.com/synaptechspa"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] text-slate-600 hover:text-pink-400 transition-colors"
            title="@synaptechspa en Instagram"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
            @synaptechspa
          </a>
        </div>
      </div>

    </aside>
  );
}
