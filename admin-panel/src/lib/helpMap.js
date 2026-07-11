/* ═══════════════════════════════════════════════════════════════
 *  helpMap.js — mapeo de vistas del panel → guías del Centro de Ayuda
 *  ─────────────────────────────────────────────────────────────
 *  El botón contextual de ayuda (componente ContextualHelpButton
 *  en la esquina inferior derecha) usa este mapa para saber a qué
 *  guía llevar al usuario según la vista en la que está.
 *
 *  Formato:
 *    '/ruta-del-panel': {
 *      categoriaSlug:  'slug de la categoría en _ayuda/global/categorias',
 *      articuloSlug?:  'slug del artículo específico (opcional)',
 *      titulo?:        'texto que se muestra en el tooltip (opcional)',
 *    }
 *
 *  Con articuloSlug abre el artículo directo.
 *  Sin articuloSlug abre la home de la categoría (lista de guías).
 *
 *  Categorías disponibles (ver seed-ayuda.js):
 *    comenzar-aqui · agenda-reservas · servicios-precios · equipo-roles
 *    pagos-caja · fidelizacion · marketing · multi-sede
 * ═══════════════════════════════════════════════════════════════ */

export const HELP_MAP = {
  // ── Comenzar aquí ──────────────────────────────────────
  '/inicio':           { categoriaSlug: 'comenzar-aqui',   titulo: 'Primeros pasos en tu panel' },
  '/configuracion':    { categoriaSlug: 'comenzar-aqui',   titulo: 'Ajustes generales' },
  '/mensualidad':      { categoriaSlug: 'comenzar-aqui',   titulo: 'Tu suscripción' },
  '/soporte':          { categoriaSlug: 'comenzar-aqui',   titulo: 'Contactar soporte' },
  '/consultas':        { categoriaSlug: 'comenzar-aqui',   titulo: 'Consultas' },

  // ── Agenda y reservas ──────────────────────────────────
  '/agenda':           { categoriaSlug: 'agenda-reservas', titulo: 'Cómo funciona la agenda' },
  '/por-cerrar':       { categoriaSlug: 'agenda-reservas', titulo: 'Citas pendientes de cierre' },
  '/reserva-online':   { categoriaSlug: 'agenda-reservas', titulo: 'Vista pública de reservas' },
  '/lista-espera':     { categoriaSlug: 'agenda-reservas', titulo: 'Lista de espera' },

  // ── Servicios y precios ───────────────────────────────
  '/servicios':        { categoriaSlug: 'fidelizacion',    articuloSlug: 'vender-packs-a-tus-clientes', titulo: 'Vender packs a tus clientes' },
  '/productos':        { categoriaSlug: 'servicios-precios', titulo: 'Cómo vender productos' },
  '/inventario':       { categoriaSlug: 'servicios-precios', titulo: 'Manejar tu inventario' },
  '/servicio-favorito': { categoriaSlug: 'servicios-precios', titulo: 'Servicio favorito del cliente' },

  // ── Equipo y roles ────────────────────────────────────
  '/equipo':           { categoriaSlug: 'equipo-roles',    titulo: 'Manejar tu equipo' },
  '/comisiones':       { categoriaSlug: 'equipo-roles',    titulo: 'Comisiones' },
  '/academia':         { categoriaSlug: 'equipo-roles',    titulo: 'Formar tu equipo' },

  // ── Pagos y caja ──────────────────────────────────────
  '/caja':             { categoriaSlug: 'pagos-caja',      titulo: 'Cierre de caja diario' },
  '/recibir-pagos':    { categoriaSlug: 'pagos-caja',      titulo: 'Activar cobros online' },
  '/facturacion':      { categoriaSlug: 'pagos-caja',      titulo: 'Facturación electrónica' },
  '/gastos':           { categoriaSlug: 'pagos-caja',      titulo: 'Registrar gastos' },
  '/finanzas':         { categoriaSlug: 'pagos-caja',      titulo: 'Análisis financiero' },
  '/metricas':         { categoriaSlug: 'pagos-caja',      titulo: 'Métricas de tu negocio' },

  // ── Fidelización ─────────────────────────────────────
  '/clientes':         { categoriaSlug: 'fidelizacion',    titulo: 'Manejar tus clientes' },
  '/lista-negra':      { categoriaSlug: 'fidelizacion',    titulo: 'Lista negra de clientes' },
  '/fidelizacion':     { categoriaSlug: 'fidelizacion',    titulo: 'Sistema de fidelización' },
  '/premios':          { categoriaSlug: 'fidelizacion',    titulo: 'Configurar premios' },
  '/canjes':           { categoriaSlug: 'fidelizacion',    titulo: 'Historial de canjes' },
  '/rangos':           { categoriaSlug: 'fidelizacion',    titulo: 'Rangos Silver / Gold / Platinum' },
  '/historial':        { categoriaSlug: 'fidelizacion',    titulo: 'Historial de cortes' },
  '/membresias':       { categoriaSlug: 'fidelizacion',    titulo: 'Membresías' },
  '/corte-al-lapiz':   { categoriaSlug: 'fidelizacion',    titulo: 'Corte al Lápiz' },
  '/gift-cards':       { categoriaSlug: 'fidelizacion',    titulo: 'Gift cards' },
  '/sorteos':          { categoriaSlug: 'fidelizacion',    titulo: 'Sorteos' },
  '/referidos':        { categoriaSlug: 'fidelizacion',    titulo: 'Programa de referidos' },

  // ── Marketing y anuncios ─────────────────────────────
  '/marketing':        { categoriaSlug: 'marketing',       titulo: 'Marketing y campañas' },
  '/anuncios':         { categoriaSlug: 'marketing',       titulo: 'Enviar anuncios push' },
  '/aura':             { categoriaSlug: 'marketing',       articuloSlug: 'saber-de-donde-vienen-tus-clientes', titulo: 'Saber de dónde vienen tus clientes' },
  '/instagram':        { categoriaSlug: 'marketing',       titulo: 'Integración con Instagram' },
  '/google':           { categoriaSlug: 'marketing',       titulo: 'Reseñas de Google' },
  '/resenas':          { categoriaSlug: 'marketing',       titulo: 'Reseñas de tus clientes' },
  '/publicidad':       { categoriaSlug: 'marketing',       titulo: 'Publicidad' },
  '/whatsapp-bot':     { categoriaSlug: 'marketing',       titulo: 'Chatbot de WhatsApp' },
  '/whatsapp-notif':   { categoriaSlug: 'marketing',       titulo: 'Avisos por WhatsApp' },
  '/mensajes':         { categoriaSlug: 'marketing',       titulo: 'Chat con clientes' },
  '/chatbot':          { categoriaSlug: 'marketing',       titulo: 'Chatbot' },
  '/link-bio':         { categoriaSlug: 'marketing',       titulo: 'Link in bio' },
  '/tv-config':        { categoriaSlug: 'marketing',       titulo: 'TV del salón' },
  '/lookbook':         { categoriaSlug: 'marketing',       titulo: 'Lookbook de estilos' },

  // ── Multi-sede ──────────────────────────────────────
  '/sucursales':       { categoriaSlug: 'multi-sede',      articuloSlug: 'compartir-clientes-entre-sucursales', titulo: 'Compartir clientes entre sucursales' },
};

/* Devuelve el destino de ayuda para un pathname del panel.
 * Hace match exacto primero, después prefijo (para subrutas
 * como /agenda/completar). Null si no hay guía para esa ruta. */
export function resolveHelpFor(pathname) {
  if (!pathname) return null;
  // Normalizamos: quitamos el prefijo /gestion-interna si viene incluido,
  // porque HELP_MAP usa rutas relativas al panel (/agenda, /clientes, ...).
  const path = pathname.replace(/^\/gestion-interna/, '') || '/inicio';

  // Match exacto
  if (HELP_MAP[path]) return HELP_MAP[path];

  // Match por prefijo (ej. /agenda/completar → /agenda)
  const seg = path.split('/').filter(Boolean)[0];
  if (seg && HELP_MAP['/' + seg]) return HELP_MAP['/' + seg];

  return null;
}

/* URL final de la guía. Sin articuloSlug → home de la categoría. */
export function helpUrlFor(target) {
  if (!target) return null;
  const { categoriaSlug, articuloSlug } = target;
  if (articuloSlug) return `/ayuda/${categoriaSlug}/${articuloSlug}`;
  return `/ayuda/${categoriaSlug}`;
}
