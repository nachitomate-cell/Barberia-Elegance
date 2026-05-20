// middleware.js — Vercel Edge Middleware
// Inyecta meta tags OG/SEO/PWA correctos por tenant según el dominio de la petición.
// Corre en el edge (sin cold start) antes de que el HTML llegue al bot de WhatsApp/redes.
//
// Tenants soportados: elegance, ferraza, gitana, mapubarbershop, chameleon, lumen
// Para añadir un tenant nuevo: agregar entrada en DOMAIN_MAP y TENANT_META.

const DOMAIN_MAP = {
  'gitananails.synaptechspa.cl':       'gitana',
  'barberiaelegance.synaptechspa.cl':  'elegance',
  'barberiaferraza.synaptechspa.cl':   'ferraza',
  'mapubarbershop.synaptechspa.cl':    'mapubarbershop',
  'chameleonbarber.synaptechspa.cl':   'chameleon',
  'deluxeperfumes.synaptechspa.cl':    'deluxeperfumes',
  'lumenbarbershop.synaptechspa.cl':   'lumen',
  'delnerobarber.synaptechspa.cl':     'delnero',
  'aurasalon.synaptechspa.cl':         'aura',
  'aurasalonmalegrooming.synaptech.cl':'aura',
  'aurasalonmalegrooming.synaptechspa.cl':'aura',
};

const TENANT_META = {
  elegance: {
    booking: {
      title:       'Agendar Hora | Elegance Barbershop',
      description: 'Reserva tu hora en Elegance Barbershop. Cortes, barba y más. Elige tu barbero, servicio y horario en segundos.',
      ogTitle:     'Agendar Hora | Elegance Barbershop',
      ogDesc:      'Reserva tu hora en Elegance Barbershop. Elige barbero, servicio y horario fácilmente.',
    },
    dashboard: {
      title:       'Mi Club | Elegance Barbershop',
      description: 'Tu panel personal en Elegance Barbershop. Revisa tus sellos, canjea premios y actualiza tu perfil.',
      ogTitle:     'Mi Club | Elegance Barbershop',
      ogDesc:      'Panel de fidelidad de Elegance Barbershop. Acumula sellos y disfruta de servicios gratis.',
    },
    registro: {
      title:       'Únete al Club | Elegance Barbershop',
      description: 'Crea tu cuenta en el Club Elegance. Acumula sellos, canjea premios y lleva un registro de tus visitas.',
      ogTitle:     'Únete al Club | Elegance Barbershop',
      ogDesc:      'Regístrate en Elegance Barbershop y disfruta de beneficios exclusivos.',
    },
    siteName:    'Elegance Barbershop',
    ogImage:     '/logo.jpg',
    themeColor:  '#050505',
    appTitle:    'Elegance',
    icon:        '/logo.jpg',
    local: { telephone: '', streetAddress: '', addressLocality: 'Valparaíso', schemaType: 'HairSalon' },
    manifest: {
      name:             'Elegance Barbershop',
      short_name:       'Elegance',
      theme_color:      '#050505',
      background_color: '#050505',
    },
    adminManifest: {
      name:             'Panel Admin · Elegance',
      short_name:       'Elegance',
      description:      'Panel de administración — Elegance Barbershop',
      theme_color:      '#10b981',
      background_color: '#0f172a',
      start_url:        '/gestion-interna/?local=elegance',
      icons: [
        { src: '/logo.jpg',                    sizes: 'any',     type: 'image/jpeg' },
        { src: '/gestion-interna/pwa-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/gestion-interna/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    },
  },
  ferraza: {
    booking: {
      title:       'Barbería Ferraza | El cambio comienza por ti',
      description: 'Reserva tu hora en Barbería Ferraza. Cortes y barba en Av. Libertad 63, Local 28.',
      ogTitle:     'Agendar Hora | Barbería Ferraza',
      ogDesc:      'Reserva tu hora en Barbería Ferraza. El cambio comienza por ti.',
    },
    dashboard: {
      title:       'Mi Club | Barbería Ferraza',
      description: 'Tu panel personal en Barbería Ferraza. Revisa tus sellos y canjea premios.',
      ogTitle:     'Mi Club | Barbería Ferraza',
      ogDesc:      'Panel de fidelidad de Barbería Ferraza. Acumula sellos y disfruta de servicios gratis.',
    },
    registro: {
      title:       'Únete al Club | Barbería Ferraza',
      description: 'Crea tu cuenta en el Club Ferraza. Acumula sellos y canjea premios.',
      ogTitle:     'Únete al Club | Barbería Ferraza',
      ogDesc:      'Regístrate en Barbería Ferraza y disfruta de beneficios exclusivos.',
    },
    siteName:    'Barbería Ferraza',
    ogImage:     '/local1.jpg',
    themeColor:  '#000000',
    appTitle:    'Ferraza',
    icon:        '/local1.jpg',
    local: { telephone: '', streetAddress: 'Av. Libertad 63, Local 28', addressLocality: 'Valparaíso', schemaType: 'HairSalon', ratingGeneral: 4.9, totalReviews: 54, reviews: [{ author: 'Carlos M.', rating: 5, text: 'El mejor corte que he tenido. Técnica impecable y ambiente de primer nivel.' }, { author: 'Pablo R.', rating: 5, text: 'Llevo años viniendo y nunca me han fallado. Saben exactamente lo que uno busca.' }, { author: 'Sebastián T.', rating: 5, text: 'Primera vez y quedé impresionado. Atención al detalle que no se encuentra en cualquier parte.' }] },
    manifest: {
      name:             'Barbería Ferraza',
      short_name:       'Ferraza',
      theme_color:      '#000000',
      background_color: '#000000',
    },
    adminManifest: {
      name:             'Panel Admin · Ferraza',
      short_name:       'Ferraza',
      description:      'Panel de administración — Barbería Ferraza',
      theme_color:      '#f59e0b',
      background_color: '#0f172a',
      start_url:        '/gestion-interna/?local=ferraza',
      icons: [
        { src: '/ferraza.png',                 sizes: 'any',     type: 'image/png' },
        { src: '/gestion-interna/pwa-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/gestion-interna/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    },
  },
  gitana: {
    booking: {
      title:       'Gitana Nails Studio | Uñas y Pestañas en Concón',
      description: 'Reserva tu hora en Gitana Nails Studio. Uñas, pestañas y cejas en Las Encinas 1390, Concón.',
      ogTitle:     'Agendar Hora | Gitana Nails Studio',
      ogDesc:      'Reserva tu hora en Gitana Nails Studio. Estudio de uñas y pestañas en Concón.',
    },
    dashboard: {
      title:       'Mi Club | Gitana Nails Studio',
      description: 'Tu panel personal en Gitana Nails Studio. Revisa tus sellos y canjea premios.',
      ogTitle:     'Mi Club | Gitana Nails Studio',
      ogDesc:      'Panel de fidelidad de Gitana Nails Studio. Acumula sellos y disfruta de servicios gratis.',
    },
    registro: {
      title:       'Únete al Club | Gitana Nails Studio',
      description: 'Crea tu cuenta en Gitana Nails Studio. Acumula sellos y canjea premios.',
      ogTitle:     'Únete al Club | Gitana Nails Studio',
      ogDesc:      'Regístrate en Gitana Nails Studio y disfruta de beneficios exclusivos.',
    },
    siteName:    'Gitana Nails Studio',
    ogImage:     '/local2.jpg',
    themeColor:  '#050505',
    appTitle:    'Gitana',
    icon:        '/local2.jpg',
    local: { telephone: '', streetAddress: 'Las Encinas 1390', addressLocality: 'Concón', schemaType: 'BeautySalon' },
    manifest: {
      name:             'Gitana Nails Studio',
      short_name:       'Gitana',
      theme_color:      '#050505',
      background_color: '#050505',
    },
    adminManifest: {
      name:             'Panel Admin · Gitana',
      short_name:       'Gitana',
      description:      'Panel de administración — Gitana Nails Studio',
      theme_color:      '#ec4899',
      background_color: '#0f172a',
      start_url:        '/gestion-interna/?local=gitana',
      icons: [
        { src: '/gitana.png',                  sizes: 'any',     type: 'image/png' },
        { src: '/gestion-interna/pwa-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/gestion-interna/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    },
  },
  mapubarbershop: {
    booking: {
      title:       'Mapu Barber Shop | Vive la Experiencia',
      description: 'Reserva tu hora en Mapu Barber Shop. Elige tu sucursal (Valparaíso o Viña del Mar), servicio y horario fácilmente.',
      ogTitle:     'Agendar Hora | Mapu Barber Shop',
      ogDesc:      'Reserva tu hora en Mapu Barber Shop. La barbería clásica de Valparaíso y Viña del Mar.',
    },
    dashboard: {
      title:       'Mi Club | Mapu Barber Shop',
      description: 'Tu panel personal en Mapu Barber Shop. Revisa tus sellos y canjea premios.',
      ogTitle:     'Mi Club | Mapu Barber Shop',
      ogDesc:      'Panel de fidelidad de Mapu Barber Shop. Acumula sellos y disfruta de servicios gratis.',
    },
    registro: {
      title:       'Únete al Club | Mapu Barber Shop',
      description: 'Crea tu cuenta en el Club Mapu. Acumula sellos, canjea premios y lleva un registro de tus visitas.',
      ogTitle:     'Únete al Club | Mapu Barber Shop',
      ogDesc:      'Regístrate en Mapu Barber Shop y disfruta de beneficios exclusivos.',
    },
    siteName:    'Mapu Barber Shop',
    // TODO: sube /og-image-mapu.jpg a la carpeta pública (banner 1200×630px de Mapu)
    ogImage:     '/og-image-mapu.jpg',
    themeColor:  '#2A1E22',
    appTitle:    'Mapu',
    icon:        '/mapu2.png',
    local: { telephone: '', streetAddress: '', addressLocality: 'Valparaíso', schemaType: 'HairSalon', ratingGeneral: 4.8, totalReviews: 72, reviews: [{ author: 'Tomás E.', rating: 5, text: 'Dos sucursales y en ambas el nivel es excelente. Mi favorito en Valparaíso y Viña del Mar.' }, { author: 'Ignacio F.', rating: 5, text: 'El corte perfecto y el ambiente de barbería que te hace volver. Siempre satisfecho.' }, { author: 'Andrés C.', rating: 5, text: 'Profesionalismo total. Me dejaron exactamente el estilo que quería.' }] },
    manifest: {
      name:             'Mapu Barber Shop',
      short_name:       'Mapu',
      theme_color:      '#2A1E22',
      background_color: '#2A1E22',
    },
    adminManifest: {
      name:             'Panel Admin · Mapu',
      short_name:       'Mapu',
      description:      'Panel de administración — Mapu Barbershop',
      theme_color:      '#3b82f6',
      background_color: '#0f172a',
      start_url:        '/gestion-interna/?local=mapubarber',
      icons: [
        { src: '/mapu2.png',                   sizes: 'any',     type: 'image/png' },
        { src: '/gestion-interna/pwa-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/gestion-interna/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    },
  },
  chameleon: {
    booking: {
      title:       'Chameleon Barber Studio | Tu estilo, tu identidad',
      description: 'Reserva tu hora en Chameleon Barber Studio. Cortes y barba de élite.',
      ogTitle:     'Agendar Hora | Chameleon Barber Studio',
      ogDesc:      'Reserva tu hora en Chameleon Barber Studio. Tu estilo, tu identidad.',
    },
    dashboard: {
      title:       'Mi Club | Chameleon Barber Studio',
      description: 'Tu panel personal en Chameleon Barber Studio. Revisa tus sellos y canjea premios.',
      ogTitle:     'Mi Club | Chameleon Barber Studio',
      ogDesc:      'Panel de fidelidad de Chameleon Barber Studio. Acumula sellos y disfruta de servicios gratis.',
    },
    registro: {
      title:       'Únete al Club | Chameleon Barber Studio',
      description: 'Crea tu cuenta en Chameleon Barber Studio. Acumula sellos y canjea premios.',
      ogTitle:     'Únete al Club | Chameleon Barber Studio',
      ogDesc:      'Regístrate en Chameleon Barber Studio y disfruta de beneficios exclusivos.',
    },
    siteName:    'Chameleon Barber Studio',
    ogImage:     '/local3.jpg',
    themeColor:  '#c9a84c',
    appTitle:    'Chameleon',
    icon:        '/local3.jpg',
    local: { telephone: '', streetAddress: 'Av. Libertad 868', addressLocality: 'Viña del Mar', schemaType: 'HairSalon', ratingGeneral: 5.0, totalReviews: 226, reviews: [{ author: 'Rodrigo V.', rating: 5, text: 'El mejor Barber Studio de Viña del Mar. Ambiente premium y barberos de primer nivel.' }, { author: 'Diego S.', rating: 5, text: 'Vine por el degradado y me quedé por la experiencia completa. Increíble atención.' }, { author: 'Matías A.', rating: 5, text: 'El lugar perfecto para quienes cuidan su imagen. Calidad profesional en cada visita.' }] },
    manifest: {
      name:             'Chameleon Barber Studio',
      short_name:       'Chameleon',
      theme_color:      '#c9a84c',
      background_color: '#c9a84c',
    },
    adminManifest: {
      name:             'Panel Admin · Chameleon',
      short_name:       'Chameleon',
      description:      'Panel de administración — Chameleon Barber Studio',
      theme_color:      '#c9a84c',
      background_color: '#0f172a',
      start_url:        '/gestion-interna/?local=chameleon',
      icons: [
        { src: '/local3.jpg',                  sizes: 'any',     type: 'image/jpeg' },
        { src: '/gestion-interna/pwa-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/gestion-interna/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    },
  },
  delnero: {
    booking: {
      title:       'Del Nero Barber | Agenda tu hora',
      description: 'Reserva tu hora en Del Nero Barber. Cortes y barba de élite en Curauma / Placilla.',
      ogTitle:     'Agendar Hora | Del Nero Barber',
      ogDesc:      'Reserva tu hora en Del Nero Barber. Estilo que define, arte que trasciende.',
    },
    dashboard: {
      title:       'Mi Club | Del Nero Barber',
      description: 'Tu panel personal en Del Nero Barber. Revisa tus sellos y canjea premios.',
      ogTitle:     'Mi Club | Del Nero Barber',
      ogDesc:      'Panel de fidelidad de Del Nero Barber. Acumula sellos y disfruta de servicios gratis.',
    },
    registro: {
      title:       'Únete al Club | Del Nero Barber',
      description: 'Crea tu cuenta en Del Nero Barber. Acumula sellos y canjea premios.',
      ogTitle:     'Únete al Club | Del Nero Barber',
      ogDesc:      'Regístrate en Del Nero Barber y disfruta de beneficios exclusivos.',
    },
    siteName:    'Del Nero Barber',
    ogImage:     '/nero.jpg',
    themeColor:  '#050505',
    appTitle:    'Del Nero',
    icon:        '/nero.jpg',
    local: { telephone: '', streetAddress: '', addressLocality: 'Placilla', schemaType: 'HairSalon' },
    manifest: {
      name:             'Del Nero Barber',
      short_name:       'Del Nero',
      theme_color:      '#050505',
      background_color: '#050505',
    },
    adminManifest: {
      name:             'Panel Admin · Del Nero',
      short_name:       'Del Nero',
      description:      'Panel de administración — Del Nero Barber',
      theme_color:      '#39ff14',
      background_color: '#050505',
      start_url:        '/gestion-interna/?local=delnero',
      icons: [
        { src: '/nero.jpg',                    sizes: 'any',     type: 'image/jpeg' },
        { src: '/gestion-interna/pwa-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/gestion-interna/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    },
  },
  lumen: {
    booking: {
      title:       'Lumen Barbershop | Agenda tu hora',
      description: 'Reserva tu hora en Lumen Barbershop. Cortes y barba de élite con estética neón.',
      ogTitle:     'Agendar Hora | Lumen Barbershop',
      ogDesc:      'Reserva tu hora en Lumen Barbershop. Ilumina tu estilo.',
    },
    dashboard: {
      title:       'Mi Club | Lumen Barbershop',
      description: 'Tu panel personal en Lumen Barbershop. Revisa tus sellos y canjea premios.',
      ogTitle:     'Mi Club | Lumen Barbershop',
      ogDesc:      'Panel de fidelidad de Lumen Barbershop. Acumula sellos y disfruta de servicios gratis.',
    },
    registro: {
      title:       'Únete al Club | Lumen Barbershop',
      description: 'Crea tu cuenta en Lumen Barbershop. Acumula sellos y canjea premios.',
      ogTitle:     'Únete al Club | Lumen Barbershop',
      ogDesc:      'Regístrate en Lumen Barbershop y disfruta de beneficios exclusivos.',
    },
    siteName:    'Lumen Barbershop',
    ogImage:     '/lumen.jpg',
    themeColor:  '#22d3ee',
    appTitle:    'Lumen',
    icon:        '/lumen.jpg',
    local: { telephone: '', streetAddress: '', addressLocality: 'Valparaíso', schemaType: 'HairSalon' },
    manifest: {
      name:             'Lumen Barbershop',
      short_name:       'Lumen',
      theme_color:      '#22d3ee',
      background_color: '#030712',
    },
    adminManifest: {
      name:             'Panel Admin · Lumen',
      short_name:       'Lumen',
      description:      'Panel de administración — Lumen Barbershop',
      theme_color:      '#22d3ee',
      background_color: '#030712',
      start_url:        '/gestion-interna/?local=lumen',
      icons: [
        { src: '/lumen.jpg',                   sizes: 'any',     type: 'image/jpeg' },
        { src: '/gestion-interna/pwa-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/gestion-interna/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    },
  },
  aura: {
    booking: {
      title:       'AURA SALÓN & MALE GROOMING | Agenda tu hora',
      description: 'Reserva tu hora en AURA SALÓN. Especialistas en corte, barba y experiencias premium de grooming.',
      ogTitle:     'Agendar Hora | AURA SALÓN & MALE GROOMING',
      ogDesc:      'Reserva tu hora en AURA SALÓN. Eleva Tu Aura.',
    },
    dashboard: {
      title:       'Mi Club | AURA SALÓN',
      description: 'Tu panel personal en AURA SALÓN. Revisa tus sellos y canjea premios.',
      ogTitle:     'Mi Club | AURA SALÓN',
      ogDesc:      'Panel de fidelidad de AURA SALÓN. Acumula sellos y disfruta de servicios gratis.',
    },
    registro: {
      title:       'Únete al Club | AURA SALÓN',
      description: 'Crea tu cuenta en AURA SALÓN. Acumula sellos y canjea premios.',
      ogTitle:     'Únete al Club | AURA SALÓN',
      ogDesc:      'Regístrate en AURA SALÓN y disfruta de beneficios exclusivos.',
    },
    siteName:    'AURA SALÓN & MALE GROOMING',
    ogImage:     '/aura.png',
    themeColor:  '#0a0a0a',
    appTitle:    'AURA',
    icon:        '/aura.png',
    local: { telephone: '', streetAddress: '', addressLocality: 'Viña del Mar', schemaType: 'HairSalon' },
    manifest: {
      name:             'AURA SALÓN & MALE GROOMING',
      short_name:       'AURA',
      theme_color:      '#0a0a0a',
      background_color: '#0a0a0a',
    },
    adminManifest: {
      name:             'Panel Admin · AURA',
      short_name:       'AURA',
      description:      'Panel de administración — AURA SALÓN & MALE GROOMING',
      theme_color:      '#fbbf24',
      background_color: '#0a0a0a',
      start_url:        '/gestion-interna/?local=aura',
      icons: [
        { src: '/aura.png',                    sizes: 'any',     type: 'image/png' },
        { src: '/gestion-interna/pwa-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/gestion-interna/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    },
  },
};

function mimeFromSrc(src) {
  if (src.endsWith('.png'))  return 'image/png';
  if (src.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

function buildJsonLd(meta, hostname) {
  const local = meta.local || {};
  const absImage = meta.ogImage.startsWith('http')
    ? meta.ogImage
    : `https://${hostname}${meta.ogImage}`;

  const schema = {
    '@context': 'https://schema.org',
    '@type':    local.schemaType || 'HairSalon',
    name:       meta.siteName,
    image:      absImage,
    url:        `https://${hostname}`,
  };

  if (local.telephone) schema.telephone = local.telephone;

  const addr = { '@type': 'PostalAddress', addressCountry: 'CL', addressRegion: 'Valparaíso' };
  if (local.streetAddress)   addr.streetAddress   = local.streetAddress;
  if (local.addressLocality) addr.addressLocality = local.addressLocality;
  schema.address = addr;

  if (local.ratingGeneral && local.totalReviews) {
    schema.aggregateRating = {
      '@type':       'AggregateRating',
      ratingValue:   String(local.ratingGeneral),
      bestRating:    '5',
      worstRating:   '1',
      reviewCount:   String(local.totalReviews),
    };
  }

  if (Array.isArray(local.reviews) && local.reviews.length) {
    schema.review = local.reviews.map(r => ({
      '@type':       'Review',
      author:        { '@type': 'Person', name: r.author },
      reviewRating:  { '@type': 'Rating', ratingValue: String(r.rating), bestRating: '5', worstRating: '1' },
      reviewBody:    r.text,
    }));
  }

  return JSON.stringify(schema);
}

function getPageType(pathname) {
  if (pathname.startsWith('/dashboard')) return 'dashboard';
  if (pathname.startsWith('/registro'))  return 'registro';
  return 'booking';
}

function r(str) {
  // Escape replacement string for String.replace (avoids $1, $& etc. issues)
  return str.replace(/\$/g, '$$$$');
}

// WhatsApp/Facebook scrapers require absolute URLs for og:image — relative paths are silently ignored.
function injectMeta(html, meta, pageMeta, canonical, hostname, pageType) {
  const absImage = meta.ogImage.startsWith('http')
    ? meta.ogImage
    : `https://${hostname}${meta.ogImage}`;

  html = html.replace(/(<title[^>]*>)[^<]*(<\/title>)/,     `$1${r(pageMeta.title)}$2`);
  html = html.replace(/<meta name="description"[^>]*>/,      `<meta name="description" content="${r(pageMeta.description)}">`);
  html = html.replace(/<meta property="og:title"[^>]*>/,     `<meta property="og:title" content="${r(pageMeta.ogTitle)}">`);
  html = html.replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${r(pageMeta.ogDesc)}">`);
  html = html.replace(/<meta property="og:site_name"[^>]*>/, `<meta property="og:site_name" content="${r(meta.siteName)}">`);
  html = html.replace(/<meta property="og:image"[^>]*>/,     `<meta property="og:image" content="${r(absImage)}">`);
  html = html.replace(/<meta property="og:url"[^>]*>/,       `<meta property="og:url" content="${r(canonical)}">`);
  html = html.replace(/<meta name="twitter:title"[^>]*>/,    `<meta name="twitter:title" content="${r(pageMeta.ogTitle)}">`);
  html = html.replace(/<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${r(pageMeta.ogDesc)}">`);
  html = html.replace(/<meta name="twitter:image"[^>]*>/,    `<meta name="twitter:image" content="${r(absImage)}">`);
  html = html.replace(/<meta name="theme-color"[^>]*>/,      `<meta name="theme-color" content="${r(meta.themeColor)}">`);
  html = html.replace(/<meta name="apple-mobile-web-app-title"[^>]*>/, `<meta name="apple-mobile-web-app-title" content="${r(meta.appTitle)}">`);
  html = html.replace(/<meta name="application-name"[^>]*>/,           `<meta name="application-name" content="${r(meta.appTitle)}">`);
  html = html.replace(/<link rel="icon"[^>]*>/,              `<link rel="icon" type="image/jpeg" href="${r(meta.icon)}">`);
  html = html.replace(/<link rel="apple-touch-icon"[^>]*>/,  `<link rel="apple-touch-icon" href="${r(meta.icon)}">`);

  // Inyectar JSON-LD solo en páginas de booking (index y rutas de barbero)
  if (pageType === 'booking') {
    const jsonLd = buildJsonLd(meta, hostname);
    html = html.replace('</head>', `<script type="application/ld+json">${jsonLd}</script>\n</head>`);
  }

  return html;
}

function injectAdminMeta(html, meta) {
  const am = meta.adminManifest;
  html = html.replace(/<meta name="theme-color"[^>]*>/,                `<meta name="theme-color" content="${r(am.theme_color)}">`);
  html = html.replace(/<meta name="apple-mobile-web-app-title"[^>]*>/, `<meta name="apple-mobile-web-app-title" content="${r(am.short_name)}">`);
  html = html.replace(/<meta name="application-name"[^>]*>/,           `<meta name="application-name" content="${r(am.short_name)}">`);
  html = html.replace(/<link rel="icon"[^>]*>/,                        `<link rel="icon" href="${r(am.icons[0].src)}">`);
  html = html.replace(/<link rel="apple-touch-icon"[^>]*>/,            `<link rel="apple-touch-icon" href="${r(am.icons[0].src)}">`);
  return html;
}

export const config = {
  matcher: [
    '/((?!api|_next|favicon\\.ico|.*\\.).*)',
    '/(.*)\\.html',
    '/manifest.json',
    '/manifest-agenda.json',
    '/gestion-interna/',
    '/gestion-interna/index.html',
    '/gestion-interna/manifest.webmanifest',
    '/sitemap.xml',
    '/robots.txt',
  ],
};

export default async function middleware(request) {
  const url      = new URL(request.url);
  const hostname = (request.headers.get('host') || '').replace(/:\d+$/, '');
  const tenantId = DOMAIN_MAP[hostname] || 'elegance';

  // ── Sitemap XML: debe interceptarse antes de cualquier otro handler ───────────
  if (url.pathname === '/sitemap.xml') {
    const baseUrl    = `https://${hostname}`;
    const projectId  = process.env.FIREBASE_PROJECT_ID || 'barberia-elegance';
    const firestoreUrl = tenantId === 'elegance'
      ? `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/barberos`
      : `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/tenants/${tenantId}/barberos`;

    const slugify = (str) =>
      String(str).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
        .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const today    = new Date().toISOString().split('T')[0];
    const isDeluxe = tenantId === 'deluxeperfumes';

    const staticPages = [
      { loc: baseUrl,                      priority: '1.0', changefreq: 'weekly'  },
      ...(!isDeluxe ? [{ loc: `${baseUrl}/agenda`,   priority: '0.9', changefreq: 'daily'   }] : []),
      ...(isDeluxe  ? [{ loc: `${baseUrl}/catalogo`, priority: '0.9', changefreq: 'weekly'  }] : []),
      ...(!isDeluxe ? [{ loc: `${baseUrl}/registro`, priority: '0.7', changefreq: 'monthly' }] : []),
    ];

    const dynamicPages = [];
    try {
      const dbRes = await fetch(firestoreUrl);
      if (dbRes.ok) {
        const dbData = await dbRes.json();
        for (const doc of (dbData.documents || [])) {
          const nombre = doc.fields?.nombre?.stringValue || '';
          const docId  = doc.name.split('/').pop();
          const slug   = slugify(nombre) || docId;
          if (slug) dynamicPages.push({ loc: `${baseUrl}/${slug}`, priority: '0.8', changefreq: 'monthly' });
        }
      }
    } catch (_) { /* Falla silenciosa: el sitemap sólo tendrá URLs estáticas */ }

    const toEntry = ({ loc, priority, changefreq }) =>
      `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...staticPages, ...dynamicPages].map(toEntry).join('\n')}\n</urlset>`;

    return new Response(xml, {
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  }

  // ── Robots.txt: generado dinámicamente para apuntar al sitemap correcto ───────
  if (url.pathname === '/robots.txt') {
    const baseUrl = `https://${hostname}`;
    const txt = `User-agent: *\nAllow: /\n\nSitemap: ${baseUrl}/sitemap.xml\n`;
    return new Response(txt, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  }

  // ── Deluxeperfumes: redirigir al catálogo (sólo rutas de cliente, no admin)
  if (tenantId === 'deluxeperfumes' && !url.pathname.startsWith('/gestion-interna')) {
    return Response.redirect(new URL('/catalogo', request.url), 302);
  }

  // Deep copy para no contaminar el estado global (importante en Edge environments)
  const meta = JSON.parse(JSON.stringify(TENANT_META[tenantId] ?? TENANT_META.elegance));

  // ── Manifest cliente: devolver versión dinámica por tenant ───────────────────
  if (url.pathname === '/manifest.json') {
    const manifest = {
      ...meta.manifest,
      description: meta.booking.description,
      start_url:   '/dashboard',
      scope:       '/',
      display:     'standalone',
      orientation: 'portrait',
      categories:  ['lifestyle', 'beauty'],
      author:      'SynapTech SpA',
      icons: [
        { src: meta.icon, sizes: 'any', type: mimeFromSrc(meta.icon), purpose: 'any maskable' },
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    };
    return new Response(JSON.stringify(manifest, null, 2), {
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'no-cache, must-revalidate',
      },
    });
  }

  // ── Manifest agenda: devolver versión dinámica por tenant ────────────────────
  if (url.pathname === '/manifest-agenda.json') {
    const manifest = {
      name:             `Agenda — ${meta.manifest.name}`,
      short_name:       'Agenda',
      description:      `Agenda de citas para barberos de ${meta.manifest.name}`,
      start_url:        '/agenda',
      scope:            '/',
      display:          'standalone',
      orientation:      'portrait',
      background_color: meta.manifest.background_color,
      theme_color:      meta.manifest.theme_color,
      categories:       ['business', 'productivity'],
      author:           'SynapTech SpA',
      icons: [
        { src: meta.icon, sizes: 'any', type: mimeFromSrc(meta.icon), purpose: 'any maskable' },
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    };
    return new Response(JSON.stringify(manifest, null, 2), {
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'no-cache, must-revalidate',
      },
    });
  }

  // ── Manifest admin: devolver versión dinámica por tenant ─────────────────────
  if (url.pathname === '/gestion-interna/manifest.webmanifest') {
    const manifest = {
      ...meta.adminManifest,
      display:     'standalone',
      orientation: 'portrait-primary',
      scope:       '/gestion-interna/',
    };
    return new Response(JSON.stringify(manifest, null, 2), {
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'no-cache, must-revalidate',
      },
    });
  }

  // ── Admin HTML: inyectar meta tags del tenant (icon, theme-color, title) ─────
  // Cubre /gestion-interna/, /gestion-interna/index.html y cualquier ruta SPA como /gestion-interna/equipo
  if (url.pathname === '/gestion-interna' || url.pathname.startsWith('/gestion-interna/')) {
    const response = await fetch(request);
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) return response;
    let html = await response.text();
    html = injectAdminMeta(html, meta);
    const headers = new Headers(response.headers);
    headers.set('Content-Type', 'text/html; charset=utf-8');
    headers.set('Cache-Control', 'no-store');
    return new Response(html, { status: response.status, headers });
  }

  const knownStaticRoutes = [
    '/', '/index.html', '/agenda', '/agenda.html', '/dashboard', '/dashboard.html', 
    '/registro', '/registro.html', '/catalogo', '/catalogo.html', 
    '/membresia', '/membresia.html', '/chat-miembros', '/chat-miembros.html', 
    '/admin-membresias', '/admin-membresias.html', '/barbero.html'
  ];
  const isDynamicRoute = !url.pathname.startsWith('/gestion-interna') && !knownStaticRoutes.includes(url.pathname);
  
  const pageType = getPageType(url.pathname);
  let pageMeta = meta[pageType];

  // ── Consulta Dinámica para Rutas de Barberos (Fetch a Firestore) ─────────────
  if (isDynamicRoute) {
    const slug = url.pathname.substring(1).toLowerCase();
    const projectId = process.env.FIREBASE_PROJECT_ID || 'barberia-elegance';
    
    const firestoreUrl = tenantId === 'elegance'
      ? `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/barberos`
      : `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/tenants/${tenantId}/barberos`;

    try {
      const dbRes = await fetch(firestoreUrl);
      if (dbRes.ok) {
        const dbData = await dbRes.json();
        const docs = dbData.documents || [];
        const slugify = (str) => String(str).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        
        let match = null;
        for (const doc of docs) {
          const docId = doc.name.split('/').pop();
          const nombre = doc.fields?.nombre?.stringValue || '';
          if (docId === slug || slugify(nombre) === slug) {
            match = doc;
            break;
          }
        }

        if (match) {
          const nombreBarbero = match.fields?.nombre?.stringValue || '';
          const fotoBarbero = match.fields?.foto?.stringValue;

          if (nombreBarbero) {
            pageMeta.title = `Agenda con ${nombreBarbero} - ${meta.siteName}`;
            pageMeta.ogTitle = `Agenda con ${nombreBarbero} - ${meta.siteName}`;
            pageMeta.ogDesc = `Reserva tu hora con ${nombreBarbero} en ${meta.siteName}.`;
          }
          if (fotoBarbero) {
            meta.ogImage = fotoBarbero.startsWith('http') ? fotoBarbero : (fotoBarbero.startsWith('/') ? fotoBarbero : `/${fotoBarbero}`);
          }
        }
      }
    } catch (e) {
      console.error('[Edge] Fallback activado. Fetch a BD falló:', e);
      // Falla silenciosa: mantenemos pageMeta intacto usando los defaults del tenant
    }
  }

  // ── Elegance: servir original sin inyección sólo si NO es ruta dinámica ──────
  if (tenantId === 'elegance' && !isDynamicRoute) {
    return;
  }

  // ── Inyección de Meta Tags en HTML ───────────────────────────────────────────
  const response = await fetch(request);
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  const canonical = `https://${hostname}${url.pathname === '/' ? '' : url.pathname}`;

  let html = await response.text();
  html = injectMeta(html, meta, pageMeta, canonical, hostname, pageType);

  const headers = new Headers(response.headers);
  headers.set('Content-Type', 'text/html; charset=utf-8');

  // ── Edge Caching para Vercel CDN ─────────────────────────────────────────────
  if (isDynamicRoute) {
    headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
  } else {
    headers.set('Cache-Control', 'no-store');
  }

  return new Response(html, { status: response.status, headers });
}
