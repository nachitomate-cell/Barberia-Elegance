import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  CalendarDays, CalendarClock, Scissors, Users, Star, BarChart3,
  Trophy, ShoppingBag, Images, LogOut, ChevronRight, ScanLine,
  Sun, Moon, ExternalLink, Settings, TrendingDown, MessageCircle, X,
  Megaphone, ImagePlus, CreditCard, Monitor, Headphones, Medal, Camera, GraduationCap, Wallet, Package, ThumbsUp, Crown,
  Globe, Banknote, Gift, ClipboardList, Building2, Home, Lock, HelpCircle, Link2, Instagram, CircleDollarSign, Sparkles, UserX, Award, Bot, Ticket, BellRing, Receipt, BookOpen, Plug,
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { doc, onSnapshot, where } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { useTenant } from '../../contexts/TenantContext';
import { useAuth, getBrandTenants } from '../../contexts/AuthContext';
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

// Ícono oficial "G" de Google en sus 4 colores (misma firma que un Icon de
// lucide-react para encajar transparente en SidebarItem).
function GoogleIcon({ size = 16, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

// Ícono oficial de YouTube (rectángulo rojo con triángulo blanco) para el
// item "Pantalla TV" en el sidebar — refleja que el módulo permite reproducir
// contenido de YouTube en las pantallas del local.
function PantallaTvIcon({ size = 16, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="#FF0000"
        d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"
      />
      <path fill="#FFFFFF" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

// Ícono oficial de WhatsApp (burbuja verde con teléfono blanco).
// Colores hardcoded para respetar la marca — verde WhatsApp #25D366.
function WhatsAppIcon({ size = 16, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="#25D366"
        d="M20.52 3.45C18.24 1.17 15.24 0 12.06 0 5.55 0 .21 5.28.21 11.79c0 2.07.54 4.11 1.62 5.91L.06 24l6.42-1.68c1.71.93 3.66 1.44 5.58 1.44 6.51 0 11.85-5.28 11.85-11.79 0-3.15-1.23-6.15-3.39-8.52z"
      />
      <path
        fill="#FFFFFF"
        d="M17.51 14.31c-.33-.15-1.95-.96-2.25-1.08-.3-.12-.51-.15-.72.15-.21.33-.84 1.08-1.05 1.29-.18.21-.39.24-.72.09-.33-.18-1.41-.51-2.67-1.65-.99-.87-1.65-1.98-1.86-2.31-.18-.33-.03-.51.15-.66.15-.15.33-.39.48-.6.15-.18.21-.33.33-.54.09-.21.06-.42-.03-.6-.09-.18-.72-1.74-.99-2.37-.24-.6-.51-.51-.72-.51-.18 0-.39-.03-.6-.03s-.57.09-.87.42c-.3.33-1.14 1.11-1.14 2.7 0 1.59 1.17 3.15 1.35 3.36.18.21 2.31 3.51 5.61 4.92.78.33 1.41.54 1.89.69.78.24 1.5.21 2.07.12.63-.09 1.95-.81 2.22-1.56.27-.75.27-1.41.21-1.56-.09-.15-.3-.24-.63-.39z"
      />
    </svg>
  );
}

// Ícono custom para "Recibir Pagos" — tarjeta de crédito con un check mark
// que evoca "pago aprobado". El color viene por CSS (currentColor).
function RecibirPagosIcon({ size = 16, className = '', strokeWidth = 2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth={strokeWidth} />
      <line x1="2" y1="10" x2="22" y2="10" stroke="currentColor" strokeWidth={strokeWidth} />
      <path d="M15 15l2 2 4-4" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
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
    // Lo que se abre cada día.
    id: 'operacion',
    label: 'Operación',
    items: [
      { to: 'inicio',         label: 'Inicio',         Icon: Home          },
      { to: 'agenda',         label: 'Agenda',         Icon: CalendarDays  },
      { to: 'por-cerrar',     label: 'Por cerrar',     Icon: CalendarClock },
      { to: 'reserva-online', label: 'Reserva online', Icon: Globe         },
      { to: 'mensajes',       label: 'Mensajes',       Icon: MessageCircle },
    ],
  },
  {
    // Relación con el cliente + TODA la retención junta.
    id: 'clientes',
    label: 'Clientes',
    items: [
      { to: 'clientes',     label: 'Clientes',     Icon: Star                                          },
      { to: 'fidelizacion', label: 'Fidelización', Icon: Trophy,   variant: 'fideli'                   },
      { to: 'wallets',      label: 'Wallet',       Icon: Wallet,   adminOnly: true                     },
      { to: 'gift-cards',   label: 'Gift Cards',   Icon: Gift,     adminOnly: true, variant: 'giftcard' },
      { to: 'sorteos',      label: 'Sorteos',      Icon: Ticket,   adminOnly: true                     },
      { to: 'referidos',    label: 'Referidos',    Icon: Sparkles, adminOnly: true, variant: 'referidos' },
    ],
  },
  {
    // Lo que ofreces / vendes.
    id: 'catalogo',
    label: 'Catálogo',
    items: [
      { to: 'servicios',         label: 'Servicios',        Icon: Scissors                  },
      { to: 'productos',         label: 'Productos',        Icon: ShoppingBag               },
      { to: 'inventario',        label: 'Inventario',       Icon: Package,   adminOnly: true },
      { to: 'lookbook',          label: 'Lookbook',         Icon: Images                    },
      { to: 'servicio-favorito', label: 'Foto de servicio', Icon: ImagePlus                 },
    ],
  },
  {
    id: 'equipo',
    label: 'Equipo',
    items: [
      { to: 'equipo',     label: 'Equipo',     Icon: Users                     },
      { to: 'comisiones', label: 'Comisiones', Icon: Banknote,  adminOnly: true },
    ],
  },
  {
    // Reputación + marketing en un solo lugar.
    id: 'crecimiento',
    label: 'Crecimiento',
    items: [
      { to: 'marketing', label: 'Marketing',             Icon: Megaphone,  adminOnly: true                       },
      { to: 'anuncios',  label: 'Anuncios',              Icon: BellRing,   adminOnly: true                       },
      { to: 'resenas',   label: 'Reseñas',               Icon: ThumbsUp                                          },
      { to: 'instagram', label: 'Instagram',             Icon: Instagram,  adminOnly: false, variant: 'instagram' },
      { to: 'link-bio',  label: 'Link in Bio (bioo.cl)', Icon: Link2,      adminOnly: true,  variant: 'bioo'      },
    ],
  },
  {
    // Toda la plata junta.
    id: 'finanzas',
    label: 'Finanzas',
    items: [
      { to: 'caja',        label: 'Control de Caja', Icon: Wallet,       adminOnly: true  },
      { to: 'metricas',    label: 'Métricas',        Icon: BarChart3,    adminOnly: false },
      { to: 'gastos',      label: 'Gastos',          Icon: TrendingDown, adminOnly: true  },
      { to: 'facturacion', label: 'Facturación',     Icon: Receipt,      adminOnly: true  },
      { to: 'mensualidad', label: 'Mensualidad',     Icon: CreditCard,   adminOnly: true  },
    ],
  },
  {
    // Solo integraciones / plumbing.
    id: 'conexiones',
    label: 'Conexiones',
    items: [
      { to: 'google',        label: 'Google',        Icon: GoogleIcon,       adminOnly: true, variant: 'google'   },
      { to: 'whatsapp',      label: 'WhatsApp',      Icon: WhatsAppIcon,     adminOnly: true, variant: 'whatsapp' },
      { to: 'tv-config',     label: 'Pantalla TV',   Icon: PantallaTvIcon,   adminOnly: true, variant: 'tv'       },
      { to: 'recibir-pagos', label: 'Recibir Pagos', Icon: RecibirPagosIcon, adminOnly: true, variant: 'pagos'    },
      // `integraciones` (mockup CAPI + GHL) se inyecta solo en delnero — ver NAV_GROUPS builder.
    ],
  },
  {
    // Configuración y soporte, al fondo.
    id: 'sistema',
    label: 'Sistema',
    adminOnly: true,
    items: [
      { to: 'configuracion', label: 'Configuración',   Icon: Settings,     adminOnly: true },
      { to: 'chatbot',       label: 'Chatbot · Syna',  Icon: SynaIcon,     adminOnly: true },
      { to: 'lista-espera',  label: 'Lista de espera', Icon: ClipboardList,adminOnly: true },
      { to: 'lista-negra',   label: 'Lista Negra',     Icon: UserX,        adminOnly: true },
      // Oculto del sidebar (la ruta /sucursales sigue activa si se accede directo).
      // { to: 'sucursales', label: 'Sucursales', Icon: Building2, adminOnly: true },
      { to: 'consultas',     label: 'Consultas',       Icon: HelpCircle,   adminOnly: true },
      { to: 'soporte',       label: 'Soporte',         Icon: Headphones,   adminOnly: true },
      { to: 'ayuda',         label: 'Centro de Ayuda', Icon: BookOpen                      },
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
      { to: 'fidelizacion', label: 'Fidelización', Icon: Trophy, variant: 'fideli' },
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
      { to: 'ayuda',         label: 'Centro de Ayuda', Icon: BookOpen },
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
  // Fidelización — módulo estrella del club: gradiente vibrante rose → amber →
  // yellow con shimmer continuo, trofeo con glow pulsante Y halo expansivo
  // (dos rings concéntricos que salen del ícono), sparkle rotativo en la
  // esquina, y fondo con gradiente animado sutil en el ítem completo. El
  // objetivo es que sea IMPOSIBLE que pase desapercibido en el sidebar.
  fideli: {
    text:      'text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-amber-300 to-yellow-200 bg-[length:200%_100%] animate-shimmer font-bold',
    // Ver SidebarItem: el ícono trofeo lleva el halo expansivo + sparkle overlay
    // vía DOM adicional; el `icon` clase solo controla color/glow del propio SVG.
    icon:      'text-amber-300 animate-trophy-glow group-hover/item:text-yellow-200 group-hover/item:scale-110',
    hover:     'hover:bg-gradient-to-r hover:from-rose-500/10 hover:via-amber-500/15 hover:to-yellow-500/10',
    bg:        'bg-gradient-to-r from-rose-500/15 via-amber-500/20 to-yellow-500/15 bg-[length:200%_100%] animate-fideli-bg',
    border:    'border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.35)]',
    lightText: '[html.light_&]:text-amber-700',
    lightIcon: '[html.light_&]:text-amber-600 [html.light_&]:animate-none [html.light_&]:drop-shadow-none [html.light_&]:group-hover/item:scale-100',
    // Flag para que SidebarItem renderice el DOM extra (halo + sparkle)
    isFideli:  true,
  },
  // WhatsApp — verde oficial de la marca. El icono ya es la burbuja verde
  // con teléfono blanco (colores hardcoded), el texto queda verde WA para
  // reforzar la identidad de canal comunicacional.
  whatsapp: {
    text:      'text-[#25D366] font-semibold',
    hover:     'hover:bg-[#25D366]/10',
    bg:        'bg-[#25D366]/15',
    border:    'border-[#25D366]',
    lightText: '[html.light_&]:text-emerald-700',
    lightIcon: '',
  },
  // Google — variante con paleta multicolor sutil. El ícono ya es la G de
  // Google en sus 4 colores oficiales, así que el texto queda en gradiente
  // suave azul→rojo→amarillo→verde para acompañar sin sobrecargar.
  google: {
    text:      'text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-rose-400 via-40% to-emerald-400 font-semibold',
    hover:     'hover:bg-blue-500/10',
    bg:        'bg-blue-500/15',
    border:    'border-blue-400',
    lightText: '[html.light_&]:text-slate-800',
    lightIcon: '',
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
        // Modo claro: el color del acento del tenant vive en el border-left +
        // fondo, NO en el texto. Sobre el sidebar blanco, acentos claros
        // (zinc-200/slate-300/…) quedan casi invisibles y NO se remapean en
        // html.light. Forzamos texto neutro oscuro; el ícono y el label lo
        // heredan (no tienen color propio). Las variantes de marca traen su
        // propio lightText y usan otra rama, así que no se ven afectadas.
        return `${base} ${isActive
          ? `${accent.active} ${accent.border} border-l-2 pl-[10px] [html.light_&]:text-slate-900`
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
          {/* Ítem Fidelización: el ícono va envuelto en un contenedor relative
              para poder superponer el halo expansivo y el sparkle rotativo
              alrededor del trofeo (le da presencia sin volarlo). */}
          {variant?.isFideli ? (
            <span className="relative inline-flex items-center justify-center shrink-0 w-5 h-5 transition-all duration-150 group-hover/item:scale-110 group-hover/item:translate-x-0.5 [html.light_&]:group-hover/item:scale-100">
              {/* Halo expansivo (ping) — solo en modo oscuro para no sobrecargar */}
              <span className="absolute inset-0 rounded-full bg-amber-400/40 animate-trophy-halo [html.light_&]:hidden" aria-hidden />
              <span className="absolute inset-0 rounded-full bg-rose-400/25 animate-trophy-halo [animation-delay:0.9s] [html.light_&]:hidden" aria-hidden />
              <Icon
                size={16}
                strokeWidth={2.2}
                className={`relative z-10 ${variant?.icon || ''} ${variant?.lightIcon || ''}`}
              />
              {/* Sparkle decorativo arriba a la derecha del trofeo */}
              <Sparkles
                size={9}
                className="absolute -top-1 -right-1 z-20 text-yellow-200 animate-sparkle-pop drop-shadow-[0_0_4px_rgba(253,224,71,0.9)] [html.light_&]:text-amber-500 [html.light_&]:animate-none [html.light_&]:drop-shadow-none"
                aria-hidden
              />
            </span>
          ) : (
            <Icon
              size={16}
              /* Peso de línea CONSTANTE en ítems de marca (legibilidad del gradiente);
                 los estándar sí engrosan al activarse. */
              strokeWidth={variant ? 2 : (isActive ? 2.5 : 2)}
              stroke={variant?.stroke}
              className={`shrink-0 group-hover/item:scale-110 group-hover/item:translate-x-0.5 transition-all duration-150 ${variant?.icon || ''} ${variant?.lightIcon || ''}`}
            />
          )}
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
            <ChevronRight size={14} className={`${accent.chevron} opacity-60 [html.light_&]:text-slate-500`} />
          )}
        </>
      )}
    </NavLink>
  );
}

/* ── Switch rápido de sede (solo brand admins Kronnos) ────────────
 * admin.kronnos.synaptechspa.cl es UN solo origen → cambiar de sede es
 * solo cambiar `?local=` (misma sesión Firebase, SIN re-login). Se
 * muestra únicamente a los brand-admins (allowlist) parados en una sede. */
const KRONNOS_SEDES_SWITCH = [
  { tenant: 'kronnos_penablanca', label: 'Peñablanca', color: '#e11d2a' },
  { tenant: 'kronnos_limache',    label: 'Limache',    color: '#f97316' },
  { tenant: 'kronnos_woman',      label: 'Woman',      color: '#ec4899' },
];

function SedeSwitcher() {
  const { user } = useAuth();
  const tenant   = useTenant();
  const brandTenants = getBrandTenants(user?.email);
  if (!brandTenants) return null;
  const sedes = KRONNOS_SEDES_SWITCH.filter(s => brandTenants.includes(s.tenant));
  // Solo con 2+ sedes accesibles y estando parado en una de ellas.
  if (sedes.length < 2 || !sedes.some(s => s.tenant === tenant.id)) return null;

  const irASede = (t) => {
    if (t === tenant.id) return;
    // Mismo origen → misma sesión, sin re-login. Conserva la vista actual.
    window.location.href = `${window.location.pathname}?local=${encodeURIComponent(t)}`;
  };

  return (
    <div className="mt-3">
      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Cambiar de sede</p>
      <div className="grid grid-cols-3 gap-1">
        {sedes.map(s => {
          const active = s.tenant === tenant.id;
          return (
            <button
              key={s.tenant}
              onClick={() => irASede(s.tenant)}
              title={`Ir a Kronnos ${s.label}`}
              aria-current={active ? 'true' : undefined}
              className={`text-[10px] font-bold py-1.5 px-1 rounded-lg truncate transition-all active:scale-95 ${
                active ? 'text-white shadow-sm' : 'text-slate-300 bg-white/5 hover:bg-white/10 hover:text-white'
              }`}
              style={active ? { background: s.color } : undefined}
            >
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
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
        if (group.id !== 'crecimiento') return group;
        return {
          ...group,
          items: [
            ...group.items,
            { to: 'publicidad', label: 'Publicidad', Icon: Award, adminOnly: true },
          ],
        };
      });
    }

    // Integraciones (mockup Conversión & CRM: Meta CAPI + GoHighLevel) — SOLO
    // en el sandbox `delnero`, para demos a socios de marketing sin que el
    // borrador aparezca en el panel de los clientes reales.
    if (tenant.id === 'delnero') {
      base = base.map(group => {
        if (group.id !== 'conexiones') return group;
        return {
          ...group,
          items: [
            ...group.items,
            { to: 'integraciones', label: 'Integraciones', Icon: Plug, adminOnly: true },
          ],
        };
      });
    }

    // AURA · Módulo exclusivo. Aparece como primer item de Administración
    // para máxima visibilidad. Solo este tenant lo ve.
    if (tenant.id === 'aura') {
      base = base.map(group => {
        if (group.id !== 'sistema') return group;
        return {
          ...group,
          items: [
            { to: 'aura', label: 'AURA · Exclusivo', Icon: Sparkles, adminOnly: true },
            ...group.items,
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
        <SedeSwitcher />
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
