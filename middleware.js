// middleware.js — Vercel Edge Middleware
// Inyecta meta tags OG/SEO/PWA correctos por tenant según el dominio de la petición.
// Corre en el edge (sin cold start) antes de que el HTML llegue al bot de WhatsApp/redes.
//
// Tenants soportados: elegance, ferraza, gitana, mapubarbershop
// Para añadir un tenant nuevo: agregar entrada en DOMAIN_MAP y TENANT_META.

const DOMAIN_MAP = {
  'gitananails.synaptechspa.cl':      'gitana',
  'barberiaelegance.synaptechspa.cl': 'elegance',
  'barberiaferraza.synaptechspa.cl':  'ferraza',
  'mapubarbershop.synaptechspa.cl':   'mapubarbershop',
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
    manifest: {
      name:             'Elegance Barbershop',
      short_name:       'Elegance',
      theme_color:      '#050505',
      background_color: '#050505',
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
    manifest: {
      name:             'Barbería Ferraza',
      short_name:       'Ferraza',
      theme_color:      '#000000',
      background_color: '#000000',
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
    manifest: {
      name:             'Gitana Nails Studio',
      short_name:       'Gitana',
      theme_color:      '#050505',
      background_color: '#050505',
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
    manifest: {
      name:             'Mapu Barber Shop',
      short_name:       'Mapu',
      theme_color:      '#2A1E22',
      background_color: '#2A1E22',
    },
  },
};

function getPageType(pathname) {
  if (pathname.startsWith('/dashboard')) return 'dashboard';
  if (pathname.startsWith('/registro'))  return 'registro';
  return 'booking';
}

function r(str) {
  // Escape replacement string for String.replace (avoids $1, $& etc. issues)
  return str.replace(/\$/g, '$$$$');
}

function injectMeta(html, meta, pageMeta, canonical) {
  // ── Replace existing tags ────────────────────────────────────────────────────
  html = html.replace(/(<title[^>]*>)[^<]*(<\/title>)/,     `$1${r(pageMeta.title)}$2`);
  html = html.replace(/<meta name="description"[^>]*>/,      `<meta name="description" content="${r(pageMeta.description)}">`);
  html = html.replace(/<meta property="og:title"[^>]*>/,     `<meta property="og:title" content="${r(pageMeta.ogTitle)}">`);
  html = html.replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${r(pageMeta.ogDesc)}">`);
  html = html.replace(/<meta property="og:site_name"[^>]*>/, `<meta property="og:site_name" content="${r(meta.siteName)}">`);
  html = html.replace(/<meta property="og:image"[^>]*>/,     `<meta property="og:image" content="${r(meta.ogImage)}">`);
  html = html.replace(/<meta property="og:url"[^>]*>/,       `<meta property="og:url" content="${r(canonical)}">`);
  html = html.replace(/<meta name="twitter:title"[^>]*>/,    `<meta name="twitter:title" content="${r(pageMeta.ogTitle)}">`);
  html = html.replace(/<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${r(pageMeta.ogDesc)}">`);
  html = html.replace(/<meta name="twitter:image"[^>]*>/,    `<meta name="twitter:image" content="${r(meta.ogImage)}">`);
  html = html.replace(/<meta name="theme-color"[^>]*>/,      `<meta name="theme-color" content="${r(meta.themeColor)}">`);
  html = html.replace(/<meta name="apple-mobile-web-app-title"[^>]*>/, `<meta name="apple-mobile-web-app-title" content="${r(meta.appTitle)}">`);
  html = html.replace(/<link rel="icon"[^>]*>/,              `<link rel="icon" type="image/jpeg" href="${r(meta.icon)}">`);
  html = html.replace(/<link rel="apple-touch-icon"[^>]*>/,  `<link rel="apple-touch-icon" href="${r(meta.icon)}">`);

  return html;
}

export const config = {
  matcher: [
    '/',
    '/index.html',
    '/dashboard',
    '/dashboard.html',
    '/registro',
    '/registro.html',
    '/manifest.json',
  ],
};

export default async function middleware(request) {
  const url      = new URL(request.url);
  const hostname = (request.headers.get('host') || '').replace(/:\d+$/, '');
  const tenantId = DOMAIN_MAP[hostname] || 'elegance';
  const meta     = TENANT_META[tenantId];

  // ── Manifest: devolver versión dinámica por tenant ───────────────────────────
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
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    };
    return new Response(JSON.stringify(manifest, null, 2), {
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  // ── Elegance: servir el HTML original sin modificar (ya tiene los valores correctos)
  if (tenantId === 'elegance') return;

  // ── Otros tenants: fetch + reemplazo de meta tags ────────────────────────────
  const response = await fetch(request);
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  const pageType = getPageType(url.pathname);
  const pageMeta = meta[pageType];
  const canonical = `https://${hostname}${url.pathname === '/' ? '' : url.pathname}`;

  let html = await response.text();
  html = injectMeta(html, meta, pageMeta, canonical);

  const headers = new Headers(response.headers);
  headers.set('Content-Type', 'text/html; charset=utf-8');
  headers.set('Cache-Control', 'no-store');

  return new Response(html, { status: response.status, headers });
}
