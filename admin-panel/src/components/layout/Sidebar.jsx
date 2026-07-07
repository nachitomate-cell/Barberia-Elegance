import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  CalendarDays, CalendarClock, Scissors, Users, Star, BarChart3,
  Trophy, ShoppingBag, Images, LogOut, ChevronRight, ScanLine,
  Sun, Moon, ExternalLink, Settings, TrendingDown, MessageCircle, X,
  Megaphone, ImagePlus, CreditCard, Monitor, Headphones, Medal, Camera, GraduationCap, Wallet, Package, ThumbsUp, Crown,
  Globe, Banknote, Gift, ClipboardList, Building2, Home, Lock, HelpCircle, Link2, Instagram, CircleDollarSign, Sparkles, UserX, Award, Bot, Ticket,
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

// ── Icono personalizado: avatar de Syna (bot del chat público) ─────
// Implementado con la misma firma que un Icon de lucide-react (size, className,
// strokeWidth, stroke) para encajar transparentemente en SidebarItem, pero
// renderiza un <img> circular. Las props de SVG (strokeWidth, stroke) se
// ignoran porque no aplican a un raster.
function SynaIcon({ size = 16, className = '' }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL || '/'}syna.png`}
      alt=""
      aria-hidden
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={`rounded-full object-cover ${className}`}
    />
  );
}

// Ítem de "Corte al Lápiz" para Yūgen — sistema de cuota/crédito, NO es
// fidelidad clásica, así que vive fuera del módulo Fidelización.
// Chameleon usaba `membresias` acá; ahora Membresías es un tab dentro de
// Fidelización, así que solo Yūgen queda en el mapa.
const MEMBRESIAS_ITEM = {
  yugen: { to: 'corte-al-lapiz', label: 'Corte al Lápiz', Icon: Medal },
};

/* ── Grupos de navegación ────────────────────────────────────────── */
const NAV_GROUPS_DEFAULT = [
  {
    id: 'operaciones',
    label: 'Operaciones',
    items: [
      { to: 'inicio',         label: 'Inicio',          Icon: Home          },
      { to: 'agenda',         label: 'Agenda',          Icon: CalendarDays  },
      { to: 'por-cerrar',     label: 'Por cerrar',      Icon: CalendarClock },
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
      { to: 'instagram',         label: 'Instagram',        Icon: Instagram, adminOnly: false, variant: 'instagram' },
      { to: 'link-bio',          label: 'Link in Bio (bioo.cl)', Icon: Link2, adminOnly: true, variant: 'bioo' },
      { to: 'servicio-favorito', label: 'Foto de servicio', Icon: ImagePlus },
    ],
  },
  {
    id: 'clientes',
    label: 'Clientes',
    items: [
      { to: 'clientes',     label: 'Clientes',     Icon: Star        },
      { to: 'lista-negra',  label: 'Lista Negra',  Icon: UserX,    adminOnly: true },
      { to: 'resenas',      label: 'Reseñas',      Icon: ThumbsUp    },
      { to: 'fidelizacion', label: 'Fidelización', Icon: Trophy      },
      { to: 'productos',    label: 'Productos',    Icon: ShoppingBag },
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
      { to: 'gift-cards',    label: 'Gift Cards',     Icon: Gift,        adminOnly: true, variant: 'giftcard' },
      { to: 'sorteos',       label: 'Sorteos',        Icon: Ticket,      adminOnly: true },
      // Oculto del sidebar (la ruta /sucursales sigue activa si se accede directo).
      // { to: 'sucursales',    label: 'Sucursales',     Icon: Building2,   adminOnly: true },
      { to: 'recibir-pagos', label: 'Recibir Pagos',  Icon: CircleDollarSign, adminOnly: true, variant: 'pagos' },
      { to: 'referidos',     label: 'Referidos',      Icon: Sparkles,    adminOnly: true, variant: 'referidos' },
      { to: 'mensualidad',   label: 'Mensualidad',    Icon: CreditCard,  adminOnly: true },
      { to: 'tv-config',     label: 'Pantalla TV',    Icon: Monitor,     adminOnly: true, variant: 'tv' },
      { to: 'chatbot',       label: 'Chatbot · Syna', Icon: SynaIcon,    adminOnly: true },
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
      { to: 'clientes',     label: 'Miembros',     Icon: Users  },
      { to: 'fidelizacion', label: 'Fidelización', Icon: Trophy },
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
      { to: 'recibir-pagos', label: 'Recibir Pagos', Icon: CircleDollarSign, adminOnly: true, variant: 'pagos' },
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
    const html = document.documentElement;
    // Si no congelamos las transiciones durante el switch, cada elemento del
    // panel (cientos con transition-colors) anima su nuevo color a la vez y
    // el browser se traba 1-2s. Activamos .theme-switching → reset global de
    // transitions vía CSS → cambiamos la clase → la removemos en el siguiente
    // frame para que las animaciones normales vuelvan a funcionar.
    html.classList.add('theme-switching');
    html.classList.toggle('light', light);
    try { localStorage.setItem('gestion-theme', light ? 'light' : 'dark'); } catch {}
    requestAnimationFrame(() => {
      requestAnimationFrame(() => html.classList.remove('theme-switching'));
    });
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

/* ── Accent class lookup (full strings required for Tailwind purge) ──
 * `active`  → fondo (10%) + color de texto/ícono del tenant
 * `border`  → color del borde izquierdo (border-l-2) del ítem activo
 * `chevron` → color del chevron del ítem activo
 * 'zinc' = monocromático/platino (Studio Dieciséis · B&N).
 */
const ACCENT_CLASSES = {
  emerald: { active: 'bg-emerald-500/10 text-emerald-400', border: 'border-emerald-400', chevron: 'text-emerald-500' },
  cyan:    { active: 'bg-cyan-500/10 text-cyan-400',       border: 'border-cyan-400',    chevron: 'text-cyan-500'    },
  lime:    { active: 'bg-lime-500/10 text-lime-400',       border: 'border-lime-400',    chevron: 'text-lime-500'    },
  pink:    { active: 'bg-pink-500/10 text-pink-400',       border: 'border-pink-400',    chevron: 'text-pink-500'    },
  purple:  { active: 'bg-purple-500/10 text-purple-400',   border: 'border-purple-400',  chevron: 'text-purple-500'  },
  slate:   { active: 'bg-slate-500/10 text-slate-300',     border: 'border-slate-300',   chevron: 'text-slate-400'   },
  zinc:    { active: 'bg-zinc-400/10 text-zinc-200',       border: 'border-zinc-300',    chevron: 'text-zinc-400'    },
  red:     { active: 'bg-red-500/10 text-red-400',         border: 'border-red-400',     chevron: 'text-red-500'     },
  orange:  { active: 'bg-orange-500/10 text-orange-400',   border: 'border-orange-400',  chevron: 'text-orange-500'  },
};

/* ── Variantes de marca (rompen la regla gris/acento del tenant) ──────
 * Identidad propia PERMANENTE, pero INTEGRADA al tema oscuro (saturación −18%
 * vs. el neón puro, para reducir fatiga visual en jornadas largas).
 *   text      → color/gradiente del texto (modo oscuro)
 *   icon      → color/efecto del ícono (cuando no es gradiente SVG)
 *   stroke    → id del <linearGradient> para teñir el trazo del ícono lucide
 *   hover     → tinte de fondo al hover
 *   bg        → fondo del estado ACTIVO — más opaco (/20) que el hover (/10),
 *               para que el módulo actual tenga prioridad visual sobre la marca
 *   border    → borde izquierdo (border-l-2) del ítem activo
 *   lightText/lightIcon → fallback de legibilidad en Modo claro (`html.light`),
 *               donde el sidebar se vuelve casi blanco (#f8fafc).
 *   logo      → logo oficial; se muestra JUNTO al ícono (no lo reemplaza).
 * NOTA: el font-weight NO se toca aquí — todos los ítems heredan `font-medium`
 *       del NavLink base, para un ritmo tipográfico uniforme.
 * El gradiente SVG #ig-grad se define una vez en <Sidebar>.
 */
/**
 * @typedef {Object} SidebarVariant
 * @property {string} text
 * @property {string} hover
 * @property {string} bg
 * @property {string} border
 * @property {string} [icon]
 * @property {string} [stroke]
 * @property {string} [logo]
 * @property {string} [lightText]  Override del texto en Modo claro.
 * @property {string} [lightIcon]  Override del ícono en Modo claro.
 */
/** @type {Record<string, SidebarVariant>} */
const SIDEBAR_VARIANTS = {
  // Instagram — gradiente nativo suavizado (amber → rose → pink-400).
  instagram: {
    text:      'text-transparent bg-clip-text bg-gradient-to-tr from-amber-400 via-rose-400 to-pink-400',
    stroke:    'url(#ig-grad)',
    hover:     'hover:bg-pink-500/10',
    bg:        'bg-pink-500/20',
    border:    'border-pink-400',
    lightText: '[html.light_&]:text-pink-600',
    lightIcon: '[html.light_&]:[stroke:#be185d]',
  },
  // Link in Bio (bioo.cl) — violeta/índigo integrado. `logo` se muestra junto al ícono.
  bioo: {
    text:      'text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400',
    icon:      'text-violet-400',
    hover:     'hover:bg-violet-500/10',
    bg:        'bg-violet-500/20',
    border:    'border-violet-400',
    lightText: '[html.light_&]:text-violet-700',
    lightIcon: '[html.light_&]:text-violet-600',
    // logo: '/bioo-logo.svg', // ← logo oficial de bioo.cl; se renderiza JUNTO al ícono Link.
  },
  // Pantalla TV — "Neon Tech" integrado: cyan con resplandor sutil al hover.
  tv: {
    text:      'text-cyan-300',
    icon:      'text-cyan-400 group-hover/item:drop-shadow-[0_0_5px_rgba(34,211,238,0.55)]',
    hover:     'hover:bg-cyan-500/10',
    bg:        'bg-cyan-500/20',
    border:    'border-cyan-400',
    lightText: '[html.light_&]:text-cyan-700',
    lightIcon: '[html.light_&]:text-cyan-600 [html.light_&]:drop-shadow-none',
  },
  // Gift Cards — "Premium Gold" integrado (ámbar/dorado mate, menos amarillo neón).
  giftcard: {
    text:      'text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-500',
    icon:      'text-amber-400',
    hover:     'hover:bg-amber-500/10',
    bg:        'bg-amber-500/20',
    border:    'border-amber-400',
    lightText: '[html.light_&]:text-amber-600',
    lightIcon: '[html.light_&]:text-amber-600',
  },
  // Recibir Pagos — variante AMARILLO/DORADO destacada para configuración de
  // pasarelas (Flow / Mercado Pago / Stripe). Diferencia visualmente la
  // entrada de dinero del resto de Administración.
  // Light-first: base = modo oscuro; `[html.light_&]:` aplica modo claro.
  pagos: {
    text:      'text-yellow-400 group-hover/item:text-yellow-300 transition-colors duration-200',
    icon:      'text-yellow-400 group-hover/item:text-yellow-300',
    hover:     'hover:bg-yellow-400/10 [html.light_&]:hover:bg-yellow-100',
    bg:        'bg-yellow-400/20 [html.light_&]:bg-yellow-200',
    border:    'border-yellow-400 [html.light_&]:border-yellow-600',
    lightText: '[html.light_&]:text-yellow-700 [html.light_&]:group-hover/item:text-yellow-800',
    lightIcon: '[html.light_&]:text-yellow-700 [html.light_&]:group-hover/item:text-yellow-800',
  },
};

/**
 * @typedef {Object} SidebarItemProps
 * @property {string} to                       Ruta relativa (NavLink).
 * @property {string} label                    Texto del ítem.
 * @property {import('lucide-react').LucideIcon} Icon  Ícono lucide-react.
 * @property {{active:string,border:string,chevron:string}} accent  Clases de acento del tenant.
 * @property {SidebarVariant} [variant]        Identidad de marca propia (rompe la regla gris/acento).
 * @property {() => void} [onClick]            Handler (ej. cerrar drawer móvil).
 * @property {boolean} [locked]               Sección bloqueada por pago (candado).
 * @property {number} [badgeCount]            Contador del badge (0 = sin badge).
 * @property {string} [badgeColorClass]       Clases de color del badge.
 * @property {'news'|'billing'|null} [dot]    Punto de aviso (novedades / facturación).
 */

/**
 * Ítem de navegación del Sidebar.
 *  · Estándar → inactivo gris (slate-400), hover slate-50/white-5, activo color del tenant.
 *  · `variant` → identidad de marca PERMANENTE (Instagram, bioo, TV, Gift Cards):
 *               texto/ícono de marca siempre, hover y borde-activo con su propio color.
 * @param {SidebarItemProps} props
 */
function SidebarItem({ to, label, Icon, accent, variant, onClick, locked = false, badgeCount = 0, badgeColorClass = '', dot = null }) {
  const hasBadge = badgeCount > 0;
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) => {
        const base = 'group/item relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200';
        if (variant) {
          return `${base} ${isActive ? `${variant.bg} ${variant.border} border-l-2 pl-[10px]` : variant.hover}`;
        }
        return `${base} ${isActive
          ? `${accent.active} ${accent.border} border-l-2 pl-[10px]`
          : 'text-slate-400 hover:text-slate-50 hover:bg-white/5'}`;
      }}
    >
      {({ isActive }) => (
        <>
          {/* Logo oficial (si existe) JUNTO al ícono — mantiene el ritmo visual. */}
          {variant?.logo && (
            <img
              src={variant.logo} alt=""
              className="w-4 h-4 shrink-0 object-contain group-hover/item:scale-110 transition-transform duration-150"
            />
          )}
          <Icon
            size={16}
            /* Peso de línea CONSTANTE en ítems de marca (legibilidad del gradiente);
               los estándar sí engrosan al activarse. */
            strokeWidth={variant ? 2 : (isActive ? 2.5 : 2)}
            stroke={variant?.stroke}
            className={`shrink-0 group-hover/item:scale-110 group-hover/item:translate-x-0.5 transition-all duration-150 ${variant?.icon || ''} ${variant?.lightIcon || ''}`}
          />
          <span className={`flex-1 ${variant?.text || ''} ${variant?.lightText || ''}`}>{label}</span>
          {locked && <Lock size={12} className="shrink-0 text-red-400/70" />}
          {dot && !hasBadge && (
            <span className={`w-1.5 h-1.5 rounded-full animate-pulse shrink-0 ${dot === 'billing' ? 'bg-amber-400' : 'bg-red-500'}`} />
          )}
          {hasBadge && (
            <span className={`ml-auto text-xs w-5 h-5 flex items-center justify-center rounded-full shrink-0 ${badgeColorClass}`}>
              {badgeCount > 9 ? '9+' : badgeCount}
            </span>
          )}
          {isActive && !hasBadge && !dot && !variant && (
            <ChevronRight size={14} className={`${accent.chevron} opacity-60`} />
          )}
        </>
      )}
    </NavLink>
  );
}

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
  // Citas "abiertas" (Confirmada/Pendiente) — el backlog son las de fecha pasada.
  const { data: openCitas }       = useCollection('citas',               [where('estado',  'in', ['Confirmada', 'Pendiente'])]);

  const pendingCitasCount    = pendingCitas?.length    || 0;
  const pendingReservasCount = pendingReservas?.length || 0;

  const hoyStr = (() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
  })();
  const porCerrarCount = (openCitas || []).filter(c => c.fecha && c.fecha < hoyStr).length;

  const NAV_GROUPS = (() => {
    if (tenant.id === 'deluxeperfumes') return NAV_GROUPS_DELUXE;

    let base = NAV_GROUPS_DEFAULT.map(group => {
      if (group.id !== 'clientes') return group;
      // Inyectar el ítem de membresía en Clientes para los tenants con módulo activo.
      const membItem = MEMBRESIAS_ITEM[tenant.id];
      if (!membItem) return group;
      return {
        ...group,
        items: [...group.items, membItem],
      };
    });

    if (tenant.id === 'elegance' && hasAcademia) {
      base = [
        ...base.slice(0, 1),
        { id: 'academia', label: 'Academia', items: [{ to: 'academia', label: 'Academia', Icon: GraduationCap }] },
        ...base.slice(1),
      ];
    }

    // Elegance estrena Publicidad: marcas asociadas que aparecen entre los
    // servicios y el clubBanner en la página pública. Solo este tenant.
    if (tenant.id === 'elegance') {
      base = base.map(group => {
        if (group.id !== 'contenido') return group;
        return {
          ...group,
          items: [
            ...group.items,
            { to: 'publicidad', label: 'Publicidad', Icon: Award, adminOnly: true },
          ],
        };
      });
    }

    return base;
  })();

  const currentSlug = location.pathname.split('/').filter(Boolean).pop();

  return (
    <aside
      data-component="sidebar"
      className="flex flex-col h-full max-h-screen w-full bg-slate-900 border-r border-slate-800 lg:border-r-0 whitespace-nowrap"
    >

      {/* Gradientes de marca para teñir el trazo de los íconos lucide (variant items) */}
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <defs>
          <linearGradient id="ig-grad" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#fbbf24" />   {/* amber-400 */}
            <stop offset="50%" stopColor="#fb7185" />  {/* rose-400 */}
            <stop offset="100%" stopColor="#f472b6" /> {/* pink-400 */}
          </linearGradient>
        </defs>
      </svg>

      {/* Brand — fijo, no scrollea */}
      <div
        className="shrink-0 px-5 pb-5 border-b border-slate-800"
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

      {/* Nav agrupado — único área scrollable. `min-h-0` permite que
          overflow-y-auto se active dentro del padre flex-col (sin esto,
          `min-height:auto` hace crecer al nav más allá del viewport y los
          últimos ítems quedan cortados en pantallas chicas).
          Scrollbar premium: 1.5px, track invisible, thumb slate-700/50 que se
          ilumina a slate-600/80 al hover. Firefox usa `scrollbar-width/color`
          nativos vía arbitrary variants. */}
      <nav
        className="flex-1 min-h-0 pl-3 pr-2 py-3 overflow-y-auto overflow-x-hidden
          [scrollbar-width:thin] [scrollbar-color:rgb(51_65_85_/_0.5)_transparent]
          [&::-webkit-scrollbar]:w-1.5
          [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:bg-slate-700/50
          [&::-webkit-scrollbar-thumb]:rounded-full
          hover:[&::-webkit-scrollbar-thumb]:bg-slate-600/80"
      >
        {NAV_GROUPS.map(group => {
          const items = group.items.filter(item => !item.adminOnly || isAdminRole);
          if (items.length === 0) return null;
          if (group.adminOnly && !isAdminRole) return null;

          return (
            <div key={group.id} className="mb-6">

              {/* Título de categoría — jerárquico y limpio, sin línea divisoria */}
              <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                {group.label}
              </p>

              {/* Items */}
              <div className="space-y-0.5">
                {items.map(({ to, label, Icon, variant }) => {
                  const isMensajes  = to === 'mensajes';
                  const isAgenda    = to === 'agenda';
                  const isProductos = to === 'productos';
                  const isPorCerrar = to === 'por-cerrar';

                  const badgeCount = isMensajes  ? unreadChats :
                                     isAgenda    ? pendingCitasCount :
                                     isProductos ? pendingReservasCount :
                                     isPorCerrar ? porCerrarCount : 0;

                  const badgeColorClass = isMensajes  ? 'bg-red-500 text-white' :
                                          isAgenda    ? 'bg-amber-500 text-amber-950 font-bold' :
                                          isProductos ? 'bg-emerald-500 text-emerald-950 font-bold' :
                                          isPorCerrar ? 'bg-amber-500 text-amber-950 font-bold' : '';

                  const dot = (to === 'mensualidad' && hasBillingAlert) ? 'billing'
                            : (to === 'soporte'     && hasUnreadNews)   ? 'news'
                            : null;

                  return (
                    <SidebarItem
                      key={to}
                      to={to}
                      label={label}
                      Icon={Icon}
                      accent={ac}
                      variant={variant ? SIDEBAR_VARIANTS[variant] : undefined}
                      onClick={onClose}
                      locked={restringido && SECCIONES_BLOQUEADAS.has(to)}
                      badgeCount={badgeCount}
                      badgeColorClass={badgeColorClass}
                      dot={dot}
                    />
                  );
                })}
              </div>

            </div>
          );
        })}
      </nav>

      {/* Footer — fijo, no scrollea */}
      <div
        className="shrink-0 px-3 pt-4 border-t border-slate-800 space-y-2.5"
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
          className="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm font-bold bg-transparent border border-slate-700 hover:border-slate-600 hover:bg-white/5 text-slate-200 transition-all duration-200 active:scale-[0.98]"
        >
          <ExternalLink size={15} />
          <span>{tenant.id === 'deluxeperfumes' ? 'Ver catálogo' : 'Ver agenda pública'}</span>
        </a>

        <div className="flex gap-2">
          {/* Ghost button — sin borde ni fondo en reposo */}
          <button
            onClick={() => setLight(v => !v)}
            title={light ? 'Activar modo oscuro' : 'Activar modo claro'}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl text-slate-400 hover:text-slate-50 hover:bg-white/5 transition-all duration-200 active:scale-95"
          >
            {light ? <Moon size={16} /> : <Sun size={16} />}
            <span className="text-[10px] font-medium leading-none">{light ? 'Modo oscuro' : 'Modo claro'}</span>
          </button>

          {/* Ghost button — gris en reposo, rojo tenue al hover (acción de salida) */}
          <button
            onClick={() => signOut(auth)}
            title="Cerrar sesión"
            className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 active:scale-95"
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
            <img src="/synaptech/ig.png" alt="SynapTech" className="w-5 h-5 rounded object-contain opacity-60" />
            <p className="text-[10px] text-slate-600">
              Powered By SynapTech <span role="img" aria-label="Hecho en Chile">🇨🇱</span>
            </p>
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
