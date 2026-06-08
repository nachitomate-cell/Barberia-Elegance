// SynapTechNews.jsx — Feed de novedades de SynapTech con estado de lectura persistido.
// Datos: array estático `newsFeed`. Para conectar a Firestore en el futuro, reemplazar
// el array por un `useEffect` que lea de la colección global `global_news`.

import { useState, useEffect } from 'react';
import { Sparkles, X, ChevronRight, Tag } from 'lucide-react';

/* ── Mock data (reemplazar con Firestore `global_news` en el futuro) ── */
const newsFeed = [
  {
    id: 'v6-push-recordatorios',
    date: '2026-06-07',
    category: 'nueva-funcion',
    title: 'Notificaciones Push: Recordatorio 30 min Antes',
    summary: 'Los clientes reciben un aviso automático 30 minutos antes de su cita, con banner de activación en el Club y confirmación de entrega y lectura.',
    detail: 'Sistema de notificaciones push completo para clientes. Una Cloud Function envía automáticamente un recordatorio 30 minutos antes de cada cita a todos los clientes con notificaciones activas. Para impulsar la activación, agregamos un banner proactivo en el Club que invita al cliente a activarlas (se puede posponer y muestra instrucciones si las tiene bloqueadas) y un llamado a la acción en la pantalla de "Reserva Confirmada". Cada envío registra confirmación de entrega y de clic, visible en el panel. Además, desde el panel superadmin puedes enviar una push de prueba a cualquier cliente para verificar que todo funciona de punta a punta.',
  },
  {
    id: 'v6-club-amigos',
    date: '2026-06-07',
    category: 'nueva-funcion',
    title: 'Club Social: Compara tu Rango con Amigos',
    summary: 'Los clientes pueden buscar amigos por nombre, agregarlos y comparar sus visitas y rango dentro del Club.',
    detail: 'El Club ahora es social. Desde su perfil, cada cliente puede buscar a otros miembros por nombre, agregarlos como amigos y comparar cuántas visitas lleva cada uno y en qué rango están. Es un incentivo de fidelización: la competencia amistosa motiva a volver más seguido para subir de nivel. También se sumaron las biografías de los barberos en la sección "Nuestro Equipo".',
  },
  {
    id: 'v6-google-reviews-live',
    date: '2026-06-07',
    category: 'mejora',
    title: 'Reseñas de Google en Tiempo Real',
    summary: 'La calificación y el total de reseñas de Google se sincronizan automáticamente y se muestran actualizados en la web.',
    detail: 'Tu reputación, siempre al día. El sistema sincroniza la calificación promedio y la cantidad total de reseñas de tu ficha de Google y las muestra en la página de reserva. Cuando llega una reseña nueva, el número se actualiza solo, sin intervención manual.',
  },
  {
    id: 'v6-historial-productos',
    date: '2026-06-06',
    category: 'nueva-funcion',
    title: 'Historial de Ventas de Productos',
    summary: 'Registro completo de las ventas y reservas de productos para llevar el control de tu inventario y tus ingresos.',
    detail: 'Ahora puedes ver el historial de ventas de productos del local: qué se vendió, cuándo y a qué cliente. Se complementa con el módulo de Inventario para que tengas trazabilidad de tus productos y sus ingresos asociados.',
  },
  {
    id: 'v6-lookbook-likes',
    date: '2026-06-06',
    category: 'mejora',
    title: 'Likes en el Lookbook',
    summary: 'Los clientes pueden dar "me gusta" a los estilos del lookbook, con una experiencia más fluida.',
    detail: 'El lookbook se volvió interactivo: los clientes pueden dar like a sus cortes y estilos favoritos. Optimizamos el rendimiento para que al dar like solo se actualice esa foto y no se recargue toda la galería, haciendo la navegación mucho más fluida.',
  },
  {
    id: 'v6-clientes-edicion-inline',
    date: '2026-06-03',
    category: 'mejora',
    title: 'Edición Rápida de Datos del Cliente',
    summary: 'Edita nombre, teléfono y correo de un cliente directamente desde su ficha, sin salir de la lista.',
    detail: 'En la sección de Clientes, al abrir la ficha lateral de un cliente puedes editar sus datos (nombre, teléfono, email) en el mismo lugar, con guardado inmediato. Se acabó tener que navegar a otra pantalla para corregir un teléfono mal escrito.',
  },
  {
    id: 'v6-agenda-pro',
    date: '2026-06-03',
    category: 'nueva-funcion',
    title: 'Agenda Más Potente: Sobrecupo, Filtros y Marcas de Tiempo',
    summary: 'Botón de sobrecupo, vista de un solo barbero al tocar su columna, badges de estado interactivos y marcas de tiempo cada 15 minutos.',
    detail: 'Varias mejoras a la agenda: (1) Botón de Sobrecupo para agendar fuera de los cupos normales cuando lo necesites. (2) Toca la cabecera de un barbero para ver solo su agenda y enfocarte. (3) El badge de estado de cada cita es interactivo: cambias el estado con un toque. (4) Marcas de tiempo cada 15 minutos en el eje izquierdo y un selector visual para ajustar el intervalo de las etiquetas horarias. (5) Toolbar optimizada para moverte más rápido.',
  },
  {
    id: 'v6-instagram-stories',
    date: '2026-06-01',
    category: 'nueva-funcion',
    title: 'Generador de Historias para Instagram',
    summary: 'Crea imágenes listas para tus historias de Instagram desde Marketing y Productos, con tu logo y estilos de banner.',
    detail: 'Marketing sin diseñador. Desde el panel puedes generar imágenes optimizadas para historias de Instagram: promociona una campaña o un producto con su foto, el logo de tu local y el texto sobre un banner. Incluye un selector de estilos (panel, degradado, bloque, wash) para que cada historia se vea profesional y acorde a tu marca.',
  },
  {
    id: 'v6-reenganche-inactivos',
    date: '2026-05-31',
    category: 'nueva-funcion',
    title: 'Re-enganche Automático de Clientes Inactivos',
    summary: 'El sistema envía push automáticas a los clientes que llevan 10, 15 o 25 días sin volver.',
    detail: 'Recupera clientes en piloto automático. Una Cloud Function detecta a los clientes que no han vuelto en 10, 15 y 25 días y les envía una notificación push de re-enganche para invitarlos a agendar de nuevo, sin que tengas que hacer nada manualmente.',
  },
  {
    id: 'v6-horario-dinamico',
    date: '2026-05-31',
    category: 'mejora',
    title: 'Horario del Local Conectado con las Reservas',
    summary: 'El horario de atención que configuras ahora define automáticamente los cupos disponibles para reservar.',
    detail: 'Configura una sola vez. El horario de atención del local (por día) que defines en Configuración ahora se conecta directamente con el sistema de cupos de reserva: los clientes solo pueden agendar dentro de tu horario real. Si cambias el horario, los cupos disponibles se ajustan solos.',
  },
  {
    id: 'v6-limite-cancelacion',
    date: '2026-05-30',
    category: 'mejora',
    title: 'Control de Cancelaciones y Reagendamientos',
    summary: 'Define cuánto tiempo antes de la cita un cliente puede reagendar o cancelar por su cuenta.',
    detail: 'Protege tu agenda de cancelaciones de último minuto. Ahora puedes configurar un límite de tiempo (en minutos) antes de la cita dentro del cual el cliente ya no puede reagendar ni cancelar por su cuenta. Lo defines desde Configuración y aplica a todas las reservas.',
  },
  {
    id: 'v5-vip-holographic-card',
    date: '2026-05-29',
    category: 'nueva-funcion',
    title: 'Tarjeta VIP Holográfica por Niveles',
    summary: 'Dashboard público con tarjeta holográfica 3D para clientes: Bronze, Silver, Gold y Platinum según visitas acumuladas.',
    detail: 'Cada cliente puede acceder a /gestion-interna/dashboard, ingresar su número de teléfono y ver su tarjeta VIP personal. El sistema cuenta automáticamente sus citas completadas y asigna el nivel correspondiente: Bronze (1-4 visitas), Silver (5-9), Gold (10-19) o Platinum (20+). La tarjeta tiene efecto holográfico real: en escritorio gira en 3D siguiendo el mouse (±28°) con brillo radial que sigue el cursor; en mobile flota idle con una animación de sweep de luz cada 4 segundos. El nivel Platinum tiene un overlay de arcoíris animado con rotación de hue continua. Además muestra barra de progreso al siguiente nivel, beneficios exclusivos por nivel y las últimas 3 visitas del cliente.',
  },
  {
    id: 'v5-gift-cards-complete',
    date: '2026-05-29',
    category: 'nueva-funcion',
    title: 'Gift Cards Completas: WhatsApp, Checkout y Saldo Público',
    summary: 'Las gift cards ahora se comparten por WhatsApp, se aplican al momento de cobrar una cita y los clientes pueden consultar su saldo desde un link público.',
    detail: 'Tres mejoras en un solo update: (1) Al crear una gift card el modal muestra una pantalla de éxito con botón "Enviar por WhatsApp" que abre wa.me con el código y valor pre-cargado. Cada tarjeta activa en la lista también tiene un botón de compartir. (2) En la agenda, al marcar una cita como Completada aparece un campo opcional de Gift Card: se ingresa el código, el sistema valida el saldo disponible y al guardar descuenta automáticamente de la tarjeta actualizando su estado en Firestore. (3) Página pública en /gestion-interna/saldo-gift-card donde cualquier cliente puede ingresar su código y ver su saldo sin necesitar login. La vista de Gift Cards en el panel muestra un QR que apunta a esa página.',
  },
  {
    id: 'v5-tv-performance',
    date: '2026-05-29',
    category: 'mejora',
    title: 'Barber TV — Rendimiento Optimizado',
    summary: 'Eliminamos el setInterval de 80ms de la barra de progreso, montaje lazy de slides y video de fondo instantáneo en reloads.',
    detail: 'Tres optimizaciones para hardware de TV de bajo costo: (1) La barra de progreso de diapositivas dejó de usar setInterval cada 80ms (12.5 re-renders por segundo) y ahora usa animación CSS pura con @keyframes scaleX — cero carga en el hilo de JavaScript. (2) Los slides del carrusel ahora se montan de forma lazy: solo el slide actual y los visitados anteriormente están en el DOM, reduciendo el trabajo de render inicial. (3) La URL del video de fondo se cachea en sessionStorage por tenant — en cada recarga de la TV (común al reiniciar pantallas), el video empieza a descargarse inmediatamente en paralelo con la carga de configuración de Firestore en lugar de esperar a que esta llegue, eliminando el retraso visible.',
  },
  {
    id: 'v4-realtime-notifications',
    date: '2026-05-23',
    category: 'nueva-funcion',
    title: 'Alertas en Tiempo Real y Live Badges',
    summary: 'Globos numéricos persistentes en el menú y toasts flotantes de cristal en primer plano con barra de progreso.',
    detail: 'Nunca dejes pasar una cita o reserva nueva. Agregamos globos numéricos interactivos en el sidebar al lado de Agenda (citas en estado Pendiente) y Productos (reservas en estado pending), activos incluso si el menú está colapsado. Además, implementamos Toasts flotantes premium semi-transparentes de estilo cristal en la esquina inferior derecha con barras de progreso de descarte de 8s que te permiten ver y saltar directamente al detalle de las nuevas solicitudes acompañados de alertas auditivas robustas en segundo plano.',
  },
  {
    id: 'v4-interactive-feedback',
    date: '2026-05-21',
    category: 'nueva-funcion',
    title: 'Calificaciones y Propinas en 1-Click',
    summary: 'Fidelización post-cita con estrellas reactivas, chips de opinión rápida, selector de propina para barberos y filtrado NPS.',
    detail: 'Implementamos en el dashboard del cliente una tarjeta interactiva premium de feedback post-cita. Se levanta automáticamente cuando un barbero marca una cita como "Completada". Permite calificar con estrellas animadas, seleccionar tags rápidas y dejar propinas integradas. Cuenta con protección NPS: valoraciones de 4-5 estrellas celebran con confeti y enlazan a Google Reviews, mientras que las de 1-3 estrellas se registran internamente de manera discreta para proteger tu reputación pública en la web.',
  },
  {
    id: 'v4-tv-signage-multimedia',
    date: '2026-05-18',
    category: 'mejora',
    title: 'Música y Video de Fondo en Barber TV',
    summary: 'Soporte para videos MP4/WebM de fondo y música de YouTube sincronizada con control flotante inteligente de audio.',
    detail: 'Optimizamos la Barber TV (/tv) para salas de espera. Ahora puedes cargar videos crudos de fondo (MP4/WebM) silenciados en bucle con contraste protegido, y conectar música de fondo pegando cualquier enlace de YouTube. El sistema carga de forma invisible el SDK de YouTube e incluye un botón flotante neón en la esquina de la TV para que los barberos o la recepción puedan activar, silenciar o regular el audio fácilmente sorteando el bloqueo de autoplay de los navegadores.',
  },
  {
    id: 'v4-billing-synaptech',
    date: '2026-05-16',
    category: 'mejora',
    title: 'Facturación y Respuestas de Cobro Rápidas',
    summary: 'Panel de cobro con datos bancarios copiables, integración de envío de comprobante por WhatsApp y logo SynapTech S.P.A.',
    detail: 'Re-diseñamos el panel de mensualidades. Ahora muestra los datos de transferencia oficial de Ignacio Mateluna con botón de copiado rápido al portapapeles con alertas de éxito, y un botón directo para enviar el comprobante de transferencia con plantilla auto-completada a WhatsApp. Si estás al día, se despliega una hermosa tarjeta premium con el lema "Gracias por confiar en el futuro" y el logotipo SVG geométrico animado de SynapTech.',
  },
  {
    id: 'v3-ai-features',
    date: '2026-05-13',
    category: 'nueva-funcion',
    title: 'Análisis IA — Insights, Demanda y Riesgo',
    summary: 'Panel IA con insights automáticos, mapa de calor de demanda y detección de clientes en riesgo.',
    detail: 'En Métricas: un panel "Análisis IA" genera hasta 4 insights automáticos con tus datos reales — tendencia mensual vs. el mes anterior, día más activo, barbero líder y alertas de cancelación. También se agregó un Mapa de Demanda que muestra la frecuencia de citas por día y hora en un heatmap de colores. En Clientes: detección automática de clientes que no han visitado en 30+ días, clasificados como Seguimiento, En riesgo o Crítico, con acceso directo a WhatsApp para reconectarlos.',
  },
  {
    id: 'v3-sidebar-groups',
    date: '2026-05-13',
    category: 'mejora',
    title: 'Sidebar inteligente por módulos',
    summary: 'El menú lateral ahora agrupa las funciones en 5 categorías y es completamente comprimible.',
    detail: 'El sidebar fue rediseñado con 5 grupos colapsables: Operaciones, Equipo, Clientes, Análisis y Administración. Cada grupo puede comprimirse con un clic y el estado se recuerda entre sesiones. Si un grupo tiene notificaciones pendientes (chats, alertas de pago, novedades), muestra un indicador incluso estando cerrado. El grupo con la página activa nunca se colapsa accidentalmente.',
  },
  {
    id: 'v2-memberships',
    date: '2026-05-09',
    category: 'nueva-funcion',
    title: 'Sistema de Membresías y Suscripciones',
    summary: 'Tus clientes ahora pueden suscribirse a planes Silver, Gold y Black para cortes ilimitados.',
    detail: 'Activamos el módulo de membresías "Elegance Pass". Desde Finanzas puedes ver el MRR, gestionar suscripciones y activar planes manualmente. Los clientes acumulan servicios mensuales (cortes, barba, masajes) según su plan. El sistema descuenta automáticamente al momento de agendar.',
  },
  {
    id: 'v2-tv-signage',
    date: '2026-05-07',
    category: 'nueva-funcion',
    title: 'Barber TV — Digital Signage Premium',
    summary: 'Nueva pantalla de sala de espera con turnos en tiempo real, lookbook animado y equipo.',
    detail: 'Accede a /gestion-interna/tv en cualquier pantalla o Smart TV de tu local. Muestra el turno actual en sillón, los próximos clientes, fotos del lookbook y el equipo de barberos. El carrusel rota cada 15 segundos con transiciones cinematográficas. Incluye QR de reserva y reloj digital.',
  },
  {
    id: 'v2-reviews',
    date: '2026-05-05',
    category: 'mejora',
    title: 'Sistema de Reseñas Post-Cita',
    summary: 'Al completar una cita, se abre una pantalla de calificación por estrellas.',
    detail: 'Cuando el barbero marca una cita como "Completada", aparece el modal de reseña. El cliente puede dar de 1 a 5 estrellas. Si da 5 estrellas, se le ofrece publicar en Google Maps y recibe +1 sello de bonificación. Las reseñas se guardan en la colección `resenas` de Firestore.',
  },
  {
    id: 'v2-haircut-reminder',
    date: '2026-05-03',
    category: 'mejora',
    title: 'Recordatorios Automáticos de Corte',
    summary: 'El sistema ahora aprende el intervalo promedio de cada cliente y manda push cuando es hora.',
    detail: 'Una Cloud Function analiza el historial de citas de cada cliente y calcula el intervalo promedio entre visitas (entre 7 y 60 días). Cuando llega la fecha sugerida, envía una notificación push automática recordándole que es hora de su corte. El sistema avanza la fecha automáticamente para no generar spam.',
  },
  {
    id: 'v1-superadmin',
    date: '2026-04-28',
    category: 'aviso',
    title: 'Panel Superadmin — Control Total',
    summary: 'Nuevo panel en /admin para gestionar todos los tenants desde un solo lugar.',
    detail: 'Incluye Kill Switch por tenant, control de versión PWA, logger de errores en tiempo real y monitor de consumo de Firestore. Solo accesible para el equipo de SynapTech.',
  },
];

/* ── Colores por categoría ────────────────────────────────────── */
const CATEGORY_META = {
  'nueva-funcion': { label: 'Nueva función', bg: 'rgba(16,185,129,0.12)', color: '#10b981', border: 'rgba(16,185,129,0.25)' },
  'mejora':        { label: 'Mejora',        bg: 'rgba(59,130,246,0.12)',  color: '#60a5fa', border: 'rgba(59,130,246,0.25)' },
  'aviso':         { label: 'Aviso',         bg: 'rgba(212,175,55,0.12)', color: '#D4AF37', border: 'rgba(212,175,55,0.25)' },
};

const LS_KEY           = 'synaptech_last_seen_news';

function formatDate(iso) {
  const d = new Date(iso + 'T12:00:00');
  const diff = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  if (diff < 7)  return `Hace ${diff} días`;
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
}

/* ── Modal de detalle ────────────────────────────────────────── */
function DetailModal({ news, onClose }) {
  const cat = CATEGORY_META[news.category] ?? CATEGORY_META.aviso;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{ background: '#0d0d0d', border: '1px solid rgba(212,175,55,0.2)', boxShadow: '0 0 60px rgba(0,0,0,0.6)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="space-y-1.5">
            <span
              className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
              style={{ background: cat.bg, color: cat.color, border: `1px solid ${cat.border}` }}
            >
              <Tag size={9} />
              {cat.label}
            </span>
            <h3 className="text-white font-bold text-base leading-snug">{news.title}</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors ml-4 shrink-0 mt-1">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-3">
          <p className="text-slate-400 text-sm leading-relaxed">{news.detail}</p>
          <p className="text-xs text-slate-600">{formatDate(news.date)}</p>
        </div>
      </div>
    </div>
  );
}

/* ── Componente principal ────────────────────────────────────── */
export default function SynapTechNews() {
  const latestDate = newsFeed[0]?.date ?? '';

  const [hasUnread, setHasUnread] = useState(() => {
    try {
      const seen = localStorage.getItem(LS_KEY) ?? '';
      return latestDate > seen;
    } catch {
      return false;
    }
  });

  const [selected, setSelected] = useState(null);

  function markRead() {
    try { localStorage.setItem(LS_KEY, latestDate); } catch {}
    setHasUnread(false);
  }

  function openDetail(item) {
    markRead();
    setSelected(item);
  }

  function handleSectionClick() {
    if (hasUnread) markRead();
  }

  return (
    <>
      <div
        className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden"
        onClick={handleSectionClick}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-800/30">
          <div className="flex items-center gap-2.5">
            <Sparkles size={15} style={{ color: '#D4AF37' }} className="shrink-0" />
            <h2 className="text-sm font-semibold text-white">Novedades de SynapTech</h2>
            {hasUnread && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
            )}
          </div>
          <a
            href="https://www.synaptechspa.cl/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-semibold tracking-wide hover:opacity-80 transition-opacity"
            style={{ color: 'rgba(212,175,55,0.7)' }}
            onClick={e => e.stopPropagation()}
          >
            synaptechspa.cl ↗
          </a>
        </div>

        {/* Feed */}
        <div className="divide-y divide-slate-800/60">
          {newsFeed.map(item => {
            const cat = CATEGORY_META[item.category] ?? CATEGORY_META.aviso;
            return (
              <button
                key={item.id}
                onClick={() => openDetail(item)}
                className="w-full text-left px-5 py-4 hover:bg-slate-800/40 transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0"
                        style={{ background: cat.bg, color: cat.color, border: `1px solid ${cat.border}` }}
                      >
                        <Tag size={8} />
                        {cat.label}
                      </span>
                      <span className="text-[10px] text-slate-600">{formatDate(item.date)}</span>
                    </div>
                    <p className="text-sm font-semibold text-white leading-tight">{item.title}</p>
                    <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{item.summary}</p>
                  </div>
                  <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors shrink-0 mt-1" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selected && <DetailModal news={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
