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
  'barberiadjones.synaptechspa.cl':    'lumen',
  'djonesbarberia.synaptechspa.cl':    'lumen',
  'delnerobarber.synaptechspa.cl':     'delnero',
  'marcelohairdressing.synaptechspa.cl': 'marcelo_hairdressing',
  'marcelo-hairdressing.synaptechspa.cl': 'marcelo_hairdressing',
  'marcelopalma.synaptechspa.cl':       'marcelo_hairdressing',
  'aurasalon.synaptechspa.cl':         'aura',
  'aurasalonmalegrooming.synaptechspa.cl':'aura',
  'latincaribe.synaptechspa.cl':       'latincaribe',
  'thelatincaribe.synaptechspa.cl':    'latincaribe',
  'yugenstudio.synaptechspa.cl':       'yugen',
  'yugen.synaptechspa.cl':             'yugen',
  'yugenstudio.cl':                    'yugen',
  'www.yugenstudio.cl':                'yugen',
  'machos.synaptechspa.cl':            'machos',
  'infinity.synaptechspa.cl':          'infinity',
  'studiodieciseis.synaptechspa.cl':   'sionbarberia',
  'sionbarberia.synaptechspa.cl':      'sionbarberia',
  'barberiasion.synaptechspa.cl':      'sionbarberia',
  'omegastudio.synaptechspa.cl':       'omegastudio',
  'kronnos.synaptechspa.cl':           'kronnos_lobby',
  // NOTA: los 3 subdominios de sede siguen apuntando a los tenants legacy hasta el cutover
  // en D2/D3 (cuando el cliente maneje resolveSedeId). Después mapearán todos a 'kronnos'.
  'kronnospenablanca.synaptechspa.cl': 'kronnos_penablanca',
  'kronnoslimache.synaptechspa.cl':    'kronnos_limache',
  'kronnoswoman.synaptechspa.cl':      'kronnos_woman',
  'admin.kronnos.synaptechspa.cl':     'kronnos_penablanca',
  'barbersclub.synaptechspa.cl':       'barbersclub',
  'elbarberomoderno.synaptechspa.cl':  'elbarberomoderno',
  'estudioluxury.synaptechspa.cl':     'estudioluxury',
  'memphissalon.synaptechspa.cl':      'memphis',
  'alfamen.synaptechspa.cl':           'alfamen',
  'renacer.synaptechspa.cl':           'renacer',
  'orenbarber.synaptechspa.cl':        'oren',
  'orenbarbercl.synaptechspa.cl':      'oren',
};

// Kronnos — subdomain → sedeId dentro del tenant único 'kronnos'.
// Fuente de verdad para SedeContext (cliente) y para SEO por sede en middleware (D2/D3).
// Ver project_kronnos.md en memoria.
const KRONNOS_SUBDOMAIN_SEDE = {
  'kronnospenablanca.synaptechspa.cl': 'penablanca',
  'kronnoslimache.synaptechspa.cl':    'limache',
  'kronnoswoman.synaptechspa.cl':      'woman',
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
    iconPwa192:  '/icons/pwa/elegance-192.png',
    iconPwa512:  '/icons/pwa/elegance-512.png',
    local: { telephone: '+56947999370', streetAddress: 'Ecuador 243', postalCode: '2520000', priceRange: '$$', addressLocality: 'Viña del Mar', schemaType: 'HairSalon' },
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
    iconPwa192:  '/icons/pwa/ferraza-192.png',
    iconPwa512:  '/icons/pwa/ferraza-512.png',
    local: { telephone: '+56994269228', streetAddress: 'Av. Libertad 63, Local 28', addressLocality: 'Viña del Mar', schemaType: 'HairSalon', ratingGeneral: 4.8, totalReviews: 46, reviews: [{ author: 'Iván Klemencic', rating: 5, text: 'Excelente atención. Quien atiende demuestra profesionalismo en lo que hace, lo recomiendo totalmente. Además está la posibilidad de agendar para el mismo día.' }, { author: 'Juan P. Mesa', rating: 5, text: 'Primero que todo, excelente servicio. Lugar muy grato, limpio y muy buena disposición de Nicolás. Me atendieron al tiro, excelente corte de cabello. Recomendable 100%.' }, { author: 'Nicolas Pardo', rating: 5, text: 'Excelente servicio por parte de Nico, lugar con un muy buen ambiente y atención. Para relajarse un rato. Recomendado!' }] },
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
        { src: '/local1.jpg',                 sizes: 'any',     type: 'image/jpeg' },
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
    icon:        '/gitana.png',
    iconPwa192:  '/icons/pwa/gitana-192.png',
    iconPwa512:  '/icons/pwa/gitana-512.png',
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
    iconPwa192:  '/icons/pwa/mapubarbershop-192.png',
    iconPwa512:  '/icons/pwa/mapubarbershop-512.png',
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
      start_url:        '/gestion-interna/?local=mapubarbershop',
      icons: [
        { src: '/mapu2.png',                   sizes: 'any',     type: 'image/png' },
        { src: '/gestion-interna/pwa-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/gestion-interna/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    },
  },
  oren: {
    booking: {
      title:       'Oren Barber | Cortes con Estilo',
      description: 'Reserva tu hora en Oren Barber. Elige tu sucursal (Reñaca o Villa Alemana), tu barbero, servicio y horario en segundos.',
      ogTitle:     'Agendar Hora | Oren Barber',
      ogDesc:      'Reserva tu hora en Oren Barber. Cortes con estilo en Reñaca y Villa Alemana.',
    },
    dashboard: {
      title:       'Mi Club | Oren Barber',
      description: 'Tu panel personal en Oren Barber. Revisa tus sellos y canjea premios del Club Oren.',
      ogTitle:     'Mi Club | Oren Barber',
      ogDesc:      'Panel de fidelidad de Oren Barber. Acumula sellos y disfruta de cortes gratis.',
    },
    registro: {
      title:       'Únete al Club | Oren Barber',
      description: 'Crea tu cuenta en el Club Oren. Acumula sellos, canjea premios y lleva el registro de tus visitas.',
      ogTitle:     'Únete al Club | Oren Barber',
      ogDesc:      'Regístrate en Oren Barber y disfruta de beneficios exclusivos.',
    },
    siteName:    'Oren Barber',
    ogImage:     '/oren/renaca.webp',
    themeColor:  '#0a0a0d',
    appTitle:    'Oren',
    icon:        '/oren/oren-logo.webp',
    iconPwa192:  '/icons/pwa/oren-192.png',
    iconPwa512:  '/icons/pwa/oren-512.png',
    local: { telephone: '', streetAddress: 'Av. Borgoño 14580, Local 21, Mall Plaza Reñaca', addressLocality: 'Viña del Mar', schemaType: 'HairSalon', ratingGeneral: 5.0, totalReviews: 128, reviews: [{ author: 'Matías R.', rating: 5, text: 'El mejor corte de Reñaca. Reservé por la web en un minuto y me atendieron a la hora exacta.' }, { author: 'Cristóbal V.', rating: 5, text: 'Tienen sucursal en Villa Alemana y en Reñaca, siempre el mismo nivel. Corte y barba impecables.' }, { author: 'Ignacio S.', rating: 5, text: 'Ambiente top y profesionales de verdad. Ya soy cliente del Club Oren.' }] },
    manifest: {
      name:             'Oren Barber',
      short_name:       'Oren',
      theme_color:      '#0a0a0d',
      background_color: '#0a0a0d',
    },
    adminManifest: {
      name:             'Panel Admin · Oren Barber',
      short_name:       'Oren',
      description:      'Panel de administración — Oren Barber',
      theme_color:      '#3b82f6',
      background_color: '#0f172a',
      start_url:        '/gestion-interna/?local=oren',
      icons: [
        { src: '/oren/logo.png',               sizes: 'any',     type: 'image/png' },
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
    iconPwa192:  '/icons/pwa/chameleon-192.png',
    iconPwa512:  '/icons/pwa/chameleon-512.png',
    local: { telephone: '+56928186861', streetAddress: 'Av. Libertad 868', postalCode: '2520000', priceRange: '$$', addressLocality: 'Viña del Mar', schemaType: 'HairSalon', ratingGeneral: 5.0, totalReviews: 226, reviews: [{ author: 'Carlos Andrés Yáñez', rating: 5, text: 'Excelente servicio! Vengo de Santiago y confié en esta barbería para cortarme el pelo más barba, el barbero supo cortarme tal cual lo solicitado. Muy profesional!' }, { author: 'Cristian Veas', rating: 5, text: 'Profesionales del corte de pelo y barba. Amables y buena onda, ambiente muy agradable y precio acorde al resultado.' }, { author: 'Jorge Miranda', rating: 5, text: 'Me atendí con Omar, un crack, muy amable y gentil al usar las tijeras. Primera vez que voy y volvería a ir.' }] },
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
    iconPwa192:  '/icons/pwa/delnero-192.png',
    iconPwa512:  '/icons/pwa/delnero-512.png',
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
  marcelo_hairdressing: {
    booking: {
      title:       'Marcelo Palma Hairdressing | Agenda tu hora',
      description: 'Reserva tu hora en Marcelo Palma Hairdressing. Cortes y barba de élite en Curauma / Placilla.',
      ogTitle:     'Agendar Hora | Marcelo Palma Hairdressing',
      ogDesc:      'Reserva tu hora en Marcelo Palma Hairdressing. Estilo que define, arte que trasciende.',
    },
    dashboard: {
      title:       'Mi Club | Marcelo Palma Hairdressing',
      description: 'Tu panel personal en Marcelo Palma Hairdressing. Revisa tus sellos y canjea premios.',
      ogTitle:     'Mi Club | Marcelo Palma Hairdressing',
      ogDesc:      'Panel de fidelidad de Marcelo Palma Hairdressing. Acumula sellos y disfruta de servicios gratis.',
    },
    registro: {
      title:       'Únete al Club | Marcelo Palma Hairdressing',
      description: 'Crea tu cuenta en Marcelo Palma Hairdressing. Acumula sellos y canjea premios.',
      ogTitle:     'Únete al Club | Marcelo Palma Hairdressing',
      ogDesc:      'Regístrate en Marcelo Palma Hairdressing y disfruta de beneficios exclusivos.',
    },
    siteName:    'Marcelo Palma Hairdressing',
    ogImage:     '/nero.jpg',
    themeColor:  '#050505',
    appTitle:    'Marcelo Palma',
    icon:        '/marcelo1.png',
    iconPwa192:  '/icons/pwa/marcelo_hairdressing-192.png',
    iconPwa512:  '/icons/pwa/marcelo_hairdressing-512.png',
    local: { telephone: '', streetAddress: '', addressLocality: 'Placilla', schemaType: 'HairSalon' },
    manifest: {
      name:             'Marcelo Palma Hairdressing',
      short_name:       'Marcelo Palma',
      theme_color:      '#050505',
      background_color: '#050505',
    },
    adminManifest: {
      name:             'Panel Admin · Marcelo Palma',
      short_name:       'Marcelo Palma',
      description:      'Panel de administración — Marcelo Palma Hairdressing',
      theme_color:      '#39ff14',
      background_color: '#050505',
      start_url:        '/gestion-interna/?local=marcelo_hairdressing',
      icons: [
        { src: '/marcelo1.png',                    sizes: 'any',     type: 'image/png' },
        { src: '/gestion-interna/pwa-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/gestion-interna/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    },
  },
  lumen: {
    booking: {
      title:       "D'Jones Barber | Agenda tu hora",
      description: "Reserva tu hora en D'Jones Barber. Cortes y barba de élite con estilo clásico.",
      ogTitle:     "Agendar Hora | D'Jones Barber",
      ogDesc:      "Reserva tu hora en D'Jones Barber. Estilo y tradición.",
    },
    dashboard: {
      title:       "Mi Club | D'Jones Barber",
      description: "Tu panel personal en D'Jones Barber. Revisa tus sellos y canjea premios.",
      ogTitle:     "Mi Club | D'Jones Barber",
      ogDesc:      "Panel de fidelidad de D'Jones Barber. Acumula sellos y disfruta de servicios gratis.",
    },
    registro: {
      title:       "Únete al Club | D'Jones Barber",
      description: "Crea tu cuenta en D'Jones Barber. Acumula sellos y canjea premios.",
      ogTitle:     "Únete al Club | D'Jones Barber",
      ogDesc:      "Regístrate en D'Jones Barber y disfruta de beneficios exclusivos.",
    },
    siteName:    "D'Jones Barber",
    ogImage:     '/djones.png',
    themeColor:  '#C9A050',
    appTitle:    "D'Jones",
    icon:        '/djones.png',
    iconPwa192:  '/icons/pwa/lumen-192.png',
    iconPwa512:  '/icons/pwa/lumen-512.png',
    local: { telephone: '+56929808223', streetAddress: 'Villanelo 279', postalCode: '2340000', priceRange: '$$', addressLocality: 'Viña del Mar', schemaType: 'HairSalon' },
    manifest: {
      name:             "D'Jones Barber",
      short_name:       "D'Jones",
      theme_color:      '#C9A050',
      background_color: '#030712',
    },
    adminManifest: {
      name:             "Panel Admin · D'Jones",
      short_name:       "D'Jones",
      description:      "Panel de administración — D'Jones Barber",
      theme_color:      '#C9A050',
      background_color: '#030712',
      start_url:        '/gestion-interna/?local=lumen',
      icons: [
        { src: '/djones.png',             sizes: 'any',     type: 'image/png'  },
        { src: '/gestion-interna/pwa-192.png', sizes: '192x192', type: 'image/png'  },
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
    iconPwa192:  '/icons/pwa/aura-192.png',
    iconPwa512:  '/icons/pwa/aura-512.png',
    local: { telephone: '+56966153086', streetAddress: '2 Oriente 124, Local 3', postalCode: '2520000', priceRange: '$$', addressLocality: 'Viña del Mar', schemaType: 'HairSalon', instagram: 'https://www.instagram.com/aura.salon.cl', openingHours: ['Mo-Sa 10:00-20:00'], ratingGeneral: 5.0, totalReviews: 43, reviews: [{ author: 'Rafael Contador', rating: 5, text: 'Tremenda experiencia! Fui por un corte de pelo y a arreglarme la barba y quedé más que satisfecho. Chiky Barber me entendió perfectamente lo que quería y fue muy detallista. Definitivamente volveré.' }, { author: 'Luciano Bravo', rating: 5, text: 'Excelente experiencia y maravilloso servicio, pasar el rato con un cafecito y cortarse el pelo deja un Aura semanal.' }, { author: 'Ignacio Ibaceta', rating: 5, text: 'Súper buena atención! Servicio completo y perfecto para ir a relajarse, hasta un café ofrecieron al momento de atenderme!' }] },
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
  latincaribe: {
    booking: {
      title:       'The Latin Caribe | Agenda tu hora',
      description: 'Reserva tu hora en The Latin Caribe. Especialistas en corte, barba y experiencias premium de grooming.',
      ogTitle:     'Agendar Hora | The Latin Caribe',
      ogDesc:      'Reserva tu hora en The Latin Caribe. Eleva Tu Estilo.',
    },
    dashboard: {
      title:       'Mi Club | The Latin Caribe',
      description: 'Tu panel personal en The Latin Caribe. Revisa tus sellos y canjea premios.',
      ogTitle:     'Mi Club | The Latin Caribe',
      ogDesc:      'Panel de fidelidad de The Latin Caribe. Acumula sellos y disfruta de servicios gratis.',
    },
    registro: {
      title:       'Únete al Club | The Latin Caribe',
      description: 'Crea tu cuenta en The Latin Caribe. Acumula sellos y canjea premios.',
      ogTitle:     'Únete al Club | The Latin Caribe',
      ogDesc:      'Regístrate en The Latin Caribe y disfruta de beneficios exclusivos.',
    },
    siteName:    'The Latin Caribe',
    ogImage:     '/thelatin/latin.png',
    themeColor:  '#0a0a0a',
    appTitle:    'Latin Caribe',
    icon:        '/thelatin/latin.png',
    iconPwa192:  '/icons/pwa/latincaribe-192.png',
    iconPwa512:  '/icons/pwa/latincaribe-512.png',
    local: { streetAddress: '', priceRange: '$$', addressLocality: 'Viña del Mar', schemaType: 'HairSalon', openingHours: ['Mo-Sa 10:00-20:00'], ratingGeneral: 0, totalReviews: 0, reviews: [] },
    manifest: {
      name:             'The Latin Caribe',
      short_name:       'Latin Caribe',
      theme_color:      '#0a0a0a',
      background_color: '#0a0a0a',
    },
    adminManifest: {
      name:             'Panel Admin · Latin Caribe',
      short_name:       'Latin Caribe',
      description:      'Panel de administración — The Latin Caribe',
      theme_color:      '#fbbf24',
      background_color: '#0a0a0a',
      start_url:        '/gestion-interna/?local=latincaribe',
      icons: [
        { src: '/thelatin/latin.png',             sizes: 'any',     type: 'image/png' },
        { src: '/gestion-interna/pwa-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/gestion-interna/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    },
  },
  yugen: {
    booking: {
      title:       'Yūgen Studio | Agenda tu hora',
      description: 'Reserva tu hora en Yūgen Studio. Una experiencia personalizada de corte y grooming que conecta contigo.',
      ogTitle:     'Agendar Hora | Yūgen Studio',
      ogDesc:      'La profundidad que no se explica, se experimenta. Reserva tu hora en Yūgen Studio.',
    },
    dashboard: {
      title:       'Mi Club | Yūgen Studio',
      description: 'Tu panel personal en Yūgen Studio. Revisa tus sellos y canjea premios.',
      ogTitle:     'Mi Club | Yūgen Studio',
      ogDesc:      'Club de fidelidad de Yūgen Studio. Acumula sellos y disfruta beneficios.',
    },
    registro: {
      title:       'Únete al Club | Yūgen Studio',
      description: 'Crea tu cuenta en Yūgen Studio. Acumula sellos y canjea premios.',
      ogTitle:     'Únete al Club | Yūgen Studio',
      ogDesc:      'Regístrate en Yūgen Studio y disfruta de beneficios exclusivos.',
    },
    siteName:    'Yūgen Studio',
    ogImage:     '/yugen/yugen2.png',
    themeColor:  '#0b0a09',
    appTitle:    'Yūgen',
    icon:        '/yugen/favicon.png',
    iconPwa192:  '/yugen/yugen-192.png',
    iconPwa512:  '/yugen/yugen-512.png',
    local: { streetAddress: '', priceRange: '$$', addressLocality: '', schemaType: 'HairSalon', openingHours: ['Mo-Fr 08:00-23:00', 'Sa 08:00-22:00', 'Su 09:00-21:00'], ratingGeneral: 0, totalReviews: 0, reviews: [] },
    manifest: {
      name:             'Yūgen Studio',
      short_name:       'Yūgen',
      theme_color:      '#0b0a09',
      background_color: '#0b0a09',
    },
    adminManifest: {
      name:             'Panel Admin · Yūgen Studio',
      short_name:       'Yūgen',
      description:      'Panel de administración — Yūgen Studio',
      theme_color:      '#0b0a09',
      background_color: '#0b0a09',
      start_url:        '/gestion-interna/?local=yugen',
      icons: [
        { src: '/yugen/favicon.png',   sizes: '256x256', type: 'image/png' },
        { src: '/yugen/yugen-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/yugen/yugen-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    },
  },
  machos: {
    booking: {
      title:       'Macho´s Barbershop | Agenda tu hora',
      description: 'Reserva tu hora en Macho´s Barbershop. Cortes, barba y asesoría profesional en Viña del Mar.',
      ogTitle:     'Agendar Hora | Macho´s Barbershop',
      ogDesc:      'Reserva tu hora en Macho´s Barbershop. Calidad y Asesoría Profesional.',
    },
    dashboard: {
      title:       'Mi Club | Macho´s Barbershop',
      description: 'Tu panel personal en Macho´s Barbershop. Revisa tus sellos y canjea premios.',
      ogTitle:     'Mi Club | Macho´s Barbershop',
      ogDesc:      'Panel de fidelidad de Macho´s Barbershop. Acumula sellos y disfruta de servicios gratis.',
    },
    registro: {
      title:       'Únete al Club | Macho´s Barbershop',
      description: 'Crea tu cuenta en el Club Machos. Acumula sellos y canjea premios exclusivos.',
      ogTitle:     'Únete al Club | Macho´s Barbershop',
      ogDesc:      'Regístrate en Macho´s Barbershop y disfruta de beneficios exclusivos.',
    },
    siteName:    'Macho´s Barbershop',
    ogImage:     '/machos.png',
    themeColor:  '#090d16',
    appTitle:    'Machos',
    icon:        '/machos.png',
    iconPwa192:  '/icons/pwa/machos-192.png',
    iconPwa512:  '/icons/pwa/machos-512.png',
    local: {
      telephone: '56978390422',
      streetAddress: '4 Norte 477 local 5',
      addressLocality: 'Viña del Mar',
      schemaType: 'HairSalon',
      ratingGeneral: 4.9,
      totalReviews: 32,
      reviews: [
        { author: 'Cristian E.', rating: 5, text: 'Excelente atención de los muchachos, profesionalismo en cada corte.' },
        { author: 'Matías O.', rating: 5, text: 'Buen ambiente, limpio, acogedor y el corte impecable. Recomiendo totalmente.' },
        { author: 'Gonzalo F.', rating: 5, text: 'Un agrado atenderse aquí. Muy cuidadosos con el rebaje de barba y toallas calientes.' }
      ]
    },
    manifest: {
      name:             'Macho´s Barbershop',
      short_name:       'Machos',
      theme_color:      '#090d16',
      background_color: '#090d16',
    },
    adminManifest: {
      name:             'Panel Admin · Machos',
      short_name:       'Machos',
      description:      'Panel de administración — Macho´s Barbershop',
      theme_color:      '#f97316',
      background_color: '#090d16',
      start_url:        '/gestion-interna/?local=machos',
      icons: [
        { src: '/machos.png',                  sizes: 'any',     type: 'image/png' },
        { src: '/gestion-interna/pwa-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/gestion-interna/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    },
  },
  infinity: {
    booking: {
      title:       'INFINITY STUDIO | Agenda tu hora',
      description: 'Reserva tu hora en Infinity Studio. Cortes, barba y tratamiento premium en Traslaviña 114, Viña del Mar.',
      ogTitle:     'Agendar Hora | INFINITY STUDIO',
      ogDesc:      'Reserva tu hora en Infinity Studio. Estilo, ambiente familiar y confianza.',
    },
    dashboard: {
      title:       'Mi Club | INFINITY STUDIO',
      description: 'Tu panel personal en Infinity Studio. Revisa tus sellos y canjea premios.',
      ogTitle:     'Mi Club | INFINITY STUDIO',
      ogDesc:      'Panel de fidelidad de Infinity Studio. Acumula sellos y disfruta de servicios gratis.',
    },
    registro: {
      title:       'Únete a la Comunidad | INFINITY STUDIO',
      description: 'Crea tu cuenta en la Comunidad Infinity. Acumula sellos y canjea premios exclusivos.',
      ogTitle:     'Únete a la Comunidad | INFINITY STUDIO',
      ogDesc:      'Regístrate en Infinity Studio y disfruta de beneficios exclusivos.',
    },
    siteName:    'INFINITY STUDIO',
    ogImage:     '/infinity.png',
    themeColor:  '#121214',
    appTitle:    'Infinity',
    icon:        '/infinity.png',
    iconPwa192:  '/icons/pwa/infinity-192.png',
    iconPwa512:  '/icons/pwa/infinity-512.png',
    local: {
      telephone: '56985551234',
      streetAddress: 'Traslaviña 114',
      addressLocality: 'Viña del Mar',
      schemaType: 'HairSalon',
      ratingGeneral: 5.0,
      totalReviews: 12,
      reviews: [
        { author: 'Claudio Valdivia', rating: 5, text: 'Excelente atención, el ambiente es súper agradable y familiar. Los cabros cortan con un nivel técnico altísimo. Totalmente recomendado!' },
        { author: 'Rodrigo Espinoza', rating: 5, text: 'Llevo meses cortándome acá y el servicio es siempre de primer nivel. Un agrado de barbería en Viña.' }
      ]
    },
    manifest: {
      name:             'INFINITY STUDIO',
      short_name:       'Infinity',
      theme_color:      '#121214',
      background_color: '#121214',
    },
    adminManifest: {
      name:             'Panel Admin · Infinity',
      short_name:       'Infinity',
      description:      'Panel de administración — Infinity Studio',
      theme_color:      '#3b3b3b',
      background_color: '#121214',
      start_url:        '/gestion-interna/?local=infinity',
      icons: [
        { src: '/infinity.png',                 sizes: 'any',     type: 'image/png' },
        { src: '/gestion-interna/pwa-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/gestion-interna/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    },
  },
  omegastudio: {
    booking: {
      title:       'Omega Studio | Agenda tu hora',
      description: 'Reserva tu hora en Omega Studio. Cortes, barba, facial y color en Av. Valparaíso 595, Local 53, Viña del Mar.',
      ogTitle:     'Agendar Hora | Omega Studio',
      ogDesc:      'Reserva tu hora en Omega Studio. Estudio atendido por profesionales en Viña del Mar.',
    },
    dashboard: {
      title:       'Mi Club | Omega Studio',
      description: 'Tu panel personal en el Club Omega. Revisa tus sellos y canjea premios.',
      ogTitle:     'Mi Club | Omega Studio',
      ogDesc:      'Panel de fidelidad de Omega Studio. Acumula sellos y disfruta de servicios gratis.',
    },
    registro: {
      title:       'Únete al Club | Omega Studio',
      description: 'Crea tu cuenta en el Club Omega. Acumula sellos y canjea premios exclusivos.',
      ogTitle:     'Únete al Club | Omega Studio',
      ogDesc:      'Regístrate en Omega Studio y disfruta de beneficios exclusivos.',
    },
    siteName:    'Omega Studio',
    ogImage:     '/omega.jpg',
    themeColor:  '#0c0c0e',
    appTitle:    'Omega',
    icon:        '/omega.jpg',
    iconPwa192:  '/icons/pwa/omegastudio-192.png',
    iconPwa512:  '/icons/pwa/omegastudio-512.png',
    local: {
      telephone:       '56972302811',
      streetAddress:   'Av. Valparaíso 595, Local 53',
      addressLocality: 'Viña del Mar',
      schemaType:      'HairSalon',
    },
    manifest: {
      name:             'Omega Studio',
      short_name:       'Omega',
      theme_color:      '#0c0c0e',
      background_color: '#0c0c0e',
    },
    adminManifest: {
      name:             'Panel Admin · Omega',
      short_name:       'Omega',
      description:      'Panel de administración — Omega Studio',
      theme_color:      '#d4a96a',
      background_color: '#0c0c0e',
      start_url:        '/gestion-interna/?local=omegastudio',
      icons: [
        { src: '/omega.jpg',                   sizes: 'any',     type: 'image/jpeg' },
        { src: '/gestion-interna/pwa-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/gestion-interna/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    },
  },
  sionbarberia: {
    booking: {
      title:       'Studio Dieciséis | Agenda tu hora',
      description: 'Reserva tu hora en Studio Dieciséis. Cortes, barba, tratamiento facial y color en Condell 1525, Galería Beye, Valparaíso.',
      ogTitle:     'Agendar Hora | Studio Dieciséis',
      ogDesc:      'Cuidado personal que combina estilo y calidad. Barbería premium en el corazón de Valparaíso.',
    },
    dashboard: {
      title:       'Mi Club | Studio Dieciséis',
      description: 'Tu panel personal en el Club Dieciséis. Revisa tus sellos y canjea premios.',
      ogTitle:     'Mi Club | Studio Dieciséis',
      ogDesc:      'Panel de fidelidad de Studio Dieciséis. Acumula sellos y disfruta de servicios gratis.',
    },
    registro: {
      title:       'Únete al Club | Studio Dieciséis',
      description: 'Crea tu cuenta en el Club Dieciséis. Acumula sellos y canjea premios.',
      ogTitle:     'Únete al Club | Studio Dieciséis',
      ogDesc:      'Regístrate en Studio Dieciséis y disfruta de beneficios exclusivos.',
    },
    siteName:    'Studio Dieciséis',
    ogImage:     '/dieciseis/banner16.webp',
    themeColor:  '#0a0a0a',
    appTitle:    'Dieciséis',
    icon:        '/dieciseis/logo.png',
    iconPwa192:  '/icons/pwa/sionbarberia-192.png',
    iconPwa512:  '/icons/pwa/sionbarberia-512.png',
    local: {
      telephone: '56937179177',
      streetAddress: 'Condell 1525, Piso 5, Local 43, Galería Beye',
      addressLocality: 'Valparaíso',
      schemaType: 'HairSalon',
      ratingGeneral: 5.0,
      totalReviews: 2,
      reviews: [
        { author: 'Nicolás', rating: 5, text: 'Los mejores.' },
        { author: 'Cristopher', rating: 5, text: 'Atención extraordinaria y además de ser súper profesional, súper contento con el trabajo realizado.' }
      ]
    },
    manifest: {
      name:             'Studio Dieciséis',
      short_name:       'Dieciséis',
      theme_color:      '#0a0a0a',
      background_color: '#0a0a0a',
    },
    adminManifest: {
      name:             'Panel Admin · Studio Dieciséis',
      short_name:       'Dieciséis',
      description:      'Panel de administración — Studio Dieciséis',
      theme_color:      '#0a0a0a',
      background_color: '#0a0a0a',
      start_url:        '/gestion-interna/?local=sionbarberia',
      icons: [
        { src: '/dieciseis/logo.png', sizes: 'any',     type: 'image/png' },
        { src: '/gestion-interna/pwa-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/gestion-interna/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    },
  },
  // ── KRONNOS · marca unificada (Camino 1, 2026-07-06) ──
  // Meta base para el tenant 'kronnos'. En D2/D3 el middleware inyectará SEO por sede
  // usando KRONNOS_SUBDOMAIN_SEDE (subdomain → sedeId) para elegir variante.
  kronnos: {
    booking: {
      title:       'Kronnos Studio | Agenda tu hora',
      description: 'Reserva en Kronnos Studio. Barbería y estilismo unisex con +12 años de experiencia. Peñablanca, Limache y Woman.',
      ogTitle:     'Agendar Hora | Kronnos Studio',
      ogDesc:      'Reserva en Kronnos Studio. Un espacio unisex donde ambos mundos convergen.',
    },
    dashboard: {
      title:       'Mi Club | Kronnos Studio',
      description: 'Tu panel personal en Kronnos Studio. Sellos cross-sede, rango, premios y cumpleaños.',
      ogTitle:     'Mi Club | Kronnos Studio',
      ogDesc:      'Club de fidelidad de Kronnos Studio. Acumula sellos en cualquier sede y disfruta de beneficios.',
    },
    registro: {
      title:       'Únete al Club | Kronnos Studio',
      description: 'Crea tu cuenta en el Club Kronnos. Sellos que suman entre sedes, cumpleaños con descuento y premios canjeables.',
      ogTitle:     'Únete al Club | Kronnos Studio',
      ogDesc:      'Regístrate en Kronnos Studio y disfruta de beneficios exclusivos en las 3 sedes.',
    },
    siteName:    'Kronnos Studio',
    ogImage:     '/kronnos/kronospena.png',
    themeColor:  '#0a0a0a',
    appTitle:    'Kronnos',
    icon:        '/kronnos/studio.jpg',
    iconPwa192:  '/icons/pwa/kronnos-192.png',
    iconPwa512:  '/icons/pwa/kronnos-512.png',
    local: { telephone: '', streetAddress: '', addressLocality: 'Valparaíso', schemaType: 'HairSalon', ratingGeneral: 4.3, totalReviews: 7 },
    manifest: { name: 'Kronnos Studio', short_name: 'Kronnos', theme_color: '#0a0a0a', background_color: '#0a0a0a' },
    adminManifest: {
      name: 'Panel Admin · Kronnos', short_name: 'Kronnos', description: 'Panel de administración — Kronnos Studio',
      theme_color: '#e11d2a', background_color: '#0a0a0a', start_url: '/gestion-interna/?local=kronnos',
      icons: [
        { src: '/kronnos/studio.jpg', sizes: 'any', type: 'image/jpeg' },
        { src: '/gestion-interna/pwa-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/gestion-interna/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    },
  },

  // ── LEGACY: 3 tenants Kronnos separados — en migración a `kronnos` (Camino 1) ──
  // Se retirarán en D4-D5 tras cutover. Middleware aún los usa por SEO por sede.
  kronnos_penablanca: {
    booking: {
      title:       'Kronnos Studio Peñablanca | Agenda tu hora',
      description: 'Reserva tu hora en Kronnos Studio Peñablanca. Barbería y estilismo unisex en Villa Alemana.',
      ogTitle:     'Agendar Hora | Kronnos Studio Peñablanca',
      ogDesc:      'Reserva tu hora en Kronnos Studio Peñablanca. Un espacio unisex donde ambos mundos convergen.',
    },
    dashboard: {
      title:       'Mi Club | Kronnos Studio Peñablanca',
      description: 'Tu panel personal en Kronnos Studio Peñablanca. Revisa tus sellos y canjea premios.',
      ogTitle:     'Mi Club | Kronnos Studio Peñablanca',
      ogDesc:      'Club de fidelidad de Kronnos Studio Peñablanca. Acumula sellos y disfruta de beneficios.',
    },
    registro: {
      title:       'Únete al Club | Kronnos Studio Peñablanca',
      description: 'Crea tu cuenta en el Club Kronnos. Acumula sellos y canjea premios.',
      ogTitle:     'Únete al Club | Kronnos Studio Peñablanca',
      ogDesc:      'Regístrate en Kronnos Studio Peñablanca y disfruta de beneficios exclusivos.',
    },
    siteName:    'Kronnos Studio Peñablanca',
    ogImage:     '/kronnos/kronospena.png',
    themeColor:  '#0a0a0a',
    appTitle:    'Kronnos',
    icon:        '/kronnos/studio.jpg',
    iconPwa192:  '/icons/pwa/kronnos-192.png',
    iconPwa512:  '/icons/pwa/kronnos-512.png',
    local: { telephone: '', streetAddress: 'Av. Vicepresidente Bernardo Leighton 20, local 13', addressLocality: 'Villa Alemana', schemaType: 'HairSalon', ratingGeneral: 4.3, totalReviews: 7 },
    manifest: { name: 'Kronnos Studio Peñablanca', short_name: 'Kronnos', theme_color: '#0a0a0a', background_color: '#0a0a0a' },
    adminManifest: {
      name: 'Panel Admin · Kronnos Peñablanca', short_name: 'Kronnos', description: 'Panel de administración — Kronnos Studio Peñablanca',
      theme_color: '#e11d2a', background_color: '#0a0a0a', start_url: '/gestion-interna/?local=kronnos_penablanca',
      icons: [
        { src: '/kronnos/studio.jpg', sizes: 'any', type: 'image/jpeg' },
        { src: '/gestion-interna/pwa-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/gestion-interna/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    },
  },
  kronnos_limache: {
    booking: {
      title:       'Kronnos Studio Limache | Agenda tu hora',
      description: 'Reserva tu hora en Kronnos Studio Limache. Barbería y estilismo unisex en Limache.',
      ogTitle:     'Agendar Hora | Kronnos Studio Limache',
      ogDesc:      'Reserva tu hora en Kronnos Studio Limache. Un espacio unisex donde ambos mundos convergen.',
    },
    dashboard: {
      title:       'Mi Club | Kronnos Studio Limache',
      description: 'Tu panel personal en Kronnos Studio Limache. Revisa tus sellos y canjea premios.',
      ogTitle:     'Mi Club | Kronnos Studio Limache',
      ogDesc:      'Club de fidelidad de Kronnos Studio Limache. Acumula sellos y disfruta de beneficios.',
    },
    registro: {
      title:       'Únete al Club | Kronnos Studio Limache',
      description: 'Crea tu cuenta en el Club Kronnos. Acumula sellos y canjea premios.',
      ogTitle:     'Únete al Club | Kronnos Studio Limache',
      ogDesc:      'Regístrate en Kronnos Studio Limache y disfruta de beneficios exclusivos.',
    },
    siteName:    'Kronnos Studio Limache',
    ogImage:     '/kronnos/kronoslima.png',
    themeColor:  '#0a0a0a',
    appTitle:    'Kronnos',
    icon:        '/kronnos/studio.jpg',
    iconPwa192:  '/icons/pwa/kronnos-192.png',
    iconPwa512:  '/icons/pwa/kronnos-512.png',
    local: { telephone: '', streetAddress: 'Paseo Las Araucarias 405, local 5', addressLocality: 'Limache', schemaType: 'HairSalon', ratingGeneral: 0, totalReviews: 0 },
    manifest: { name: 'Kronnos Studio Limache', short_name: 'Kronnos', theme_color: '#0a0a0a', background_color: '#0a0a0a' },
    adminManifest: {
      name: 'Panel Admin · Kronnos Limache', short_name: 'Kronnos', description: 'Panel de administración — Kronnos Studio Limache',
      theme_color: '#f97316', background_color: '#0a0a0a', start_url: '/gestion-interna/?local=kronnos_limache',
      icons: [
        { src: '/kronnos/studio.jpg', sizes: 'any', type: 'image/jpeg' },
        { src: '/gestion-interna/pwa-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/gestion-interna/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    },
  },
  kronnos_woman: {
    booking: {
      title:       'Kronnos Woman | Agenda tu hora',
      description: 'Reserva tu hora en Kronnos Woman. Belleza y estética: manicura, maquillaje, masajes y más en Limache.',
      ogTitle:     'Agendar Hora | Kronnos Woman',
      ogDesc:      'Reserva tu hora en Kronnos Woman. Belleza y estilo en un solo lugar.',
    },
    dashboard: {
      title:       'Mi Club | Kronnos Woman',
      description: 'Tu panel personal en Kronnos Woman. Revisa tus sellos y canjea premios.',
      ogTitle:     'Mi Club | Kronnos Woman',
      ogDesc:      'Club de fidelidad de Kronnos Woman. Acumula sellos y disfruta de beneficios.',
    },
    registro: {
      title:       'Únete al Club | Kronnos Woman',
      description: 'Crea tu cuenta en el Club Kronnos Woman. Acumula sellos y canjea premios.',
      ogTitle:     'Únete al Club | Kronnos Woman',
      ogDesc:      'Regístrate en Kronnos Woman y disfruta de beneficios exclusivos.',
    },
    siteName:    'Kronnos Woman',
    ogImage:     '/kronnos/kronoswoman.png',
    themeColor:  '#0a0a0a',
    appTitle:    'Kronnos Woman',
    icon:        '/kronnos/woman.jpg',
    iconPwa192:  '/icons/pwa/kronnos_woman-192.png',
    iconPwa512:  '/icons/pwa/kronnos_woman-512.png',
    local: { telephone: '', streetAddress: 'Palmira Romano Sur 405, local 3', addressLocality: 'Limache', schemaType: 'BeautySalon', ratingGeneral: 0, totalReviews: 0 },
    manifest: { name: 'Kronnos Woman', short_name: 'Kronnos Woman', theme_color: '#0a0a0a', background_color: '#0a0a0a' },
    adminManifest: {
      name: 'Panel Admin · Kronnos Woman', short_name: 'Kronnos Woman', description: 'Panel de administración — Kronnos Woman',
      theme_color: '#ec4899', background_color: '#0a0a0a', start_url: '/gestion-interna/?local=kronnos_woman',
      icons: [
        { src: '/kronnos/woman.jpg', sizes: 'any', type: 'image/jpeg' },
        { src: '/gestion-interna/pwa-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/gestion-interna/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    },
  },
  kronnos_lobby: {
    booking: {
      title:       'Kronnos Studio · Elige tu sede',
      description: 'Reserva en Kronnos Studio. Barbería y estilismo unisex con +12 años de experiencia. Elige tu sede: Peñablanca, Limache o Kronnos Woman.',
      ogTitle:     'Kronnos Studio · Agenda en tu sede',
      ogDesc:      'Un espacio unisex donde ambos mundos convergen. Elige tu sede y reserva online.',
    },
    dashboard: {
      title:       'Kronnos Studio · Elige tu sede',
      description: 'Reserva en Kronnos Studio. Elige tu sede y agenda online.',
      ogTitle:     'Kronnos Studio · Agenda en tu sede',
      ogDesc:      'Un espacio unisex donde ambos mundos convergen. Elige tu sede y reserva online.',
    },
    registro: {
      title:       'Kronnos Studio · Elige tu sede',
      description: 'Reserva en Kronnos Studio. Elige tu sede y agenda online.',
      ogTitle:     'Kronnos Studio · Agenda en tu sede',
      ogDesc:      'Un espacio unisex donde ambos mundos convergen. Elige tu sede y reserva online.',
    },
    siteName:    'Kronnos Studio',
    ogImage:     '/kronnos/kronospena.png',
    themeColor:  '#0a0a0a',
    appTitle:    'Kronnos',
    icon:        '/kronnos/studio.jpg',
    iconPwa192:  '/icons/pwa/kronnos-192.png',
    iconPwa512:  '/icons/pwa/kronnos-512.png',
    local: { telephone: '', streetAddress: '', addressLocality: 'Valparaíso', schemaType: 'HairSalon', ratingGeneral: 4.3, totalReviews: 7 },
    manifest: { name: 'Kronnos Studio', short_name: 'Kronnos', theme_color: '#0a0a0a', background_color: '#0a0a0a' },
    adminManifest: {
      name: 'Panel Admin · Kronnos', short_name: 'Kronnos', description: 'Panel de administración — Kronnos Studio',
      theme_color: '#e11d2a', background_color: '#0a0a0a', start_url: '/gestion-interna/?local=kronnos_penablanca',
      icons: [
        { src: '/kronnos/studio.jpg', sizes: 'any', type: 'image/jpeg' },
        { src: '/gestion-interna/pwa-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/gestion-interna/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    },
  },
  barbersclub: {
    booking: {
      title:       'Barbers Club | Agenda tu hora',
      description: 'Reserva en Barbers Club. Exclusivo salón ambientado para potenciar tu imagen. Ciudad de los Valles, Pudahuel.',
      ogTitle:     'Agendar Hora | Barbers Club',
      ogDesc:      'Exclusivo salón ambientado para potenciar tu imagen. Reserva tu hora online.',
    },
    dashboard: {
      title:       'Mi Club | Barbers Club',
      description: 'Tu panel personal en Barbers Club. Revisa tus sellos y canjea premios.',
      ogTitle:     'Mi Club | Barbers Club',
      ogDesc:      'Panel de fidelidad de Barbers Club. Acumula sellos y disfruta beneficios exclusivos.',
    },
    registro: {
      title:       'Únete al Barbers Club VIP',
      description: 'Crea tu cuenta en Barbers Club VIP. Acumula sellos y accede a beneficios exclusivos.',
      ogTitle:     'Únete al Barbers Club VIP',
      ogDesc:      'Regístrate en Barbers Club y disfruta beneficios exclusivos.',
    },
    siteName:    'Barbers Club',
    ogImage:     '/barbersclub/barber12.jpg?v=2.0',
    themeColor:  '#0b0a09',
    appTitle:    'Barbers Club',
    icon:        '/barbersclub/barber12.jpg',
    iconPwa192:  '/icons/pwa/barbersclub-192.png',
    iconPwa512:  '/icons/pwa/barbersclub-512.png',
    local: { telephone: '+56981806262', streetAddress: 'Av. Del Canal 19811, Local 12', addressLocality: 'Ciudad de los Valles, Pudahuel, Santiago', schemaType: 'HairSalon' },
    manifest: {
      name:             'Barbers Club',
      short_name:       'Barbers Club',
      theme_color:      '#0b0a09',
      background_color: '#0b0a09',
    },
    adminManifest: {
      name:             'Panel Admin · Barbers Club',
      short_name:       'Barbers Club',
      description:      'Panel de administración — Barbers Club',
      theme_color:      '#DAA520',
      background_color: '#0b0a09',
      start_url:        '/gestion-interna/?local=barbersclub',
      icons: [
        { src: '/barbersclub/barber12.jpg',    sizes: 'any',     type: 'image/jpeg' },
        { src: '/gestion-interna/pwa-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/gestion-interna/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    },
  },
  elbarberomoderno: {
    booking: {
      title:       'El Barbero Moderno | Agenda tu hora',
      description: 'Reserva con Jhoseth Morales — Master Barber con 8 años de experiencia. Cortes, barba y combos en Serrano 73.',
      ogTitle:     'Agendar Hora | El Barbero Moderno',
      ogDesc:      'Barbero Profesional con 8 años de experiencia. Tu estilo, a otro nivel. Reserva online.',
    },
    dashboard: {
      title:       'Mi Club | El Barbero Moderno',
      description: 'Tu panel personal en El Barbero Moderno. Revisa tus sellos y canjea premios.',
      ogTitle:     'Mi Club | El Barbero Moderno',
      ogDesc:      'Panel de fidelidad de El Barbero Moderno. Acumula sellos y disfruta beneficios exclusivos.',
    },
    registro: {
      title:       'Únete al Club | El Barbero Moderno',
      description: 'Crea tu cuenta en el Club de El Barbero Moderno. Acumula sellos y accede a beneficios exclusivos.',
      ogTitle:     'Únete al Club | El Barbero Moderno',
      ogDesc:      'Regístrate en El Barbero Moderno y disfruta beneficios exclusivos.',
    },
    siteName:    'El Barbero Moderno',
    ogImage:     '/elbarberomoderno/barbero1.png',
    themeColor:  '#0b0a09',
    appTitle:    'El Barbero Moderno',
    icon:        '/elbarberomoderno/logobarb.webp',
    iconPwa192:  '/icons/pwa/elbarberomoderno-192.png',
    iconPwa512:  '/icons/pwa/elbarberomoderno-512.png',
    local: { streetAddress: 'Serrano 73', schemaType: 'HairSalon' },
    manifest: {
      name:             'El Barbero Moderno',
      short_name:       'El Barbero Moderno',
      theme_color:      '#0b0a09',
      background_color: '#0b0a09',
    },
    adminManifest: {
      name:             'Panel Admin · El Barbero Moderno',
      short_name:       'El Barbero Moderno',
      description:      'Panel de administración — El Barbero Moderno',
      theme_color:      '#DAA520',
      background_color: '#0b0a09',
      start_url:        '/gestion-interna/?local=elbarberomoderno',
      icons: [
        { src: '/logo.jpg',                    sizes: 'any',     type: 'image/jpeg' },
        { src: '/gestion-interna/pwa-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/gestion-interna/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    },
  },
  estudioluxury: {
    booking: {
      title:       'Studio Luxury | Barbería · Agenda tu hora',
      description: 'Reserva en Barbería Studio Luxury (Talagante). Cortes clásicos y modernos, barba, facial y color. Atención en local y a domicilio en Talagante, Isla de Maipo y El Monte.',
      ogTitle:     'Agendar Hora | Studio Luxury',
      ogDesc:      'Barbería · Cortes con estilo, atención de lujo. Local y domicilio. Reserva tu hora online.',
    },
    dashboard: {
      title:       'Mi Club | Studio Luxury',
      description: 'Tu panel personal en Studio Luxury. Revisa tus sellos y canjea premios.',
      ogTitle:     'Mi Club | Studio Luxury',
      ogDesc:      'Panel de fidelidad de Studio Luxury. Acumula sellos y disfruta beneficios exclusivos.',
    },
    registro: {
      title:       'Únete al Club Luxury',
      description: 'Crea tu cuenta en el Club de Studio Luxury. Acumula sellos y accede a beneficios exclusivos.',
      ogTitle:     'Únete al Club Luxury',
      ogDesc:      'Regístrate en Studio Luxury y disfruta beneficios exclusivos.',
    },
    siteName:    'Studio Luxury',
    ogImage:     '/luxury/og.png',       // 1200x630 con logo+nombre centrado → preview grande en WhatsApp
    themeColor:  '#0b0a09',
    appTitle:    'Studio Luxury',
    icon:        '/luxury/luxury.jpg',
    iconPwa192:  '/icons/pwa/estudioluxury-192.png',
    iconPwa512:  '/icons/pwa/estudioluxury-512.png',
    local: { addressLocality: 'Talagante', schemaType: 'HairSalon' },
    manifest: {
      name:             'Studio Luxury',
      short_name:       'Studio Luxury',
      theme_color:      '#0b0a09',
      background_color: '#0b0a09',
    },
    adminManifest: {
      name:             'Panel Admin · Studio Luxury',
      short_name:       'Studio Luxury',
      description:      'Panel de administración — Studio Luxury',
      theme_color:      '#DAA520',
      background_color: '#0b0a09',
      start_url:        '/gestion-interna/?local=estudioluxury',
      icons: [
        { src: '/luxury/luxury.jpg',           sizes: 'any',     type: 'image/jpeg' },
        { src: '/gestion-interna/pwa-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/gestion-interna/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    },
  },
  memphis: {
    booking: {
      title:       'Memphis Salón | Agenda tu hora',
      description: 'Reserva tu hora en Memphis Salón, Viña del Mar. Cortes, color, uñas y estilismo. Elige tu profesional y horario en segundos.',
      ogTitle:     'Agendar Hora | Memphis Salón',
      ogDesc:      'Reserva tu hora en Memphis Salón. Estilo y profesionalismo en Viña del Mar.',
    },
    dashboard: {
      title:       'Mi Club | Memphis Salón',
      description: 'Tu panel personal en Memphis Salón. Revisa tus sellos, canjea premios y actualiza tu perfil.',
      ogTitle:     'Mi Club | Memphis Salón',
      ogDesc:      'Club de fidelidad de Memphis Salón. Acumula sellos y canjea premios.',
    },
    registro: {
      title:       'Únete al Club | Memphis Salón',
      description: 'Crea tu cuenta en Memphis Salón. Acumula sellos y canjea premios.',
      ogTitle:     'Únete al Club | Memphis Salón',
      ogDesc:      'Regístrate en Memphis Salón y disfruta de beneficios exclusivos.',
    },
    siteName:    'Memphis Salón',
    ogImage:     '/mem.png',
    themeColor:  '#0a0a0a',
    appTitle:    'Memphis',
    icon:        '/mem.png',
    iconPwa192:  '/icons/pwa/memphis-192.png',
    iconPwa512:  '/icons/pwa/memphis-512.png',
    local: { addressLocality: 'Viña del Mar', schemaType: 'BeautySalon' },
    manifest: {
      name:             'Memphis Salón',
      short_name:       'Memphis',
      theme_color:      '#0a0a0a',
      background_color: '#0a0a0a',
    },
    adminManifest: {
      name:             'Panel Admin · Memphis',
      short_name:       'Memphis',
      description:      'Panel de administración — Memphis Salón',
      theme_color:      '#10b981',
      background_color: '#0f172a',
      start_url:        '/gestion-interna/?local=memphis',
    },
  },
  alfamen: {
    booking: {
      title:       'Barbería Alfa Men | Agenda tu hora',
      description: 'Reserva tu hora en Barbería Alfa Men, Av. Valparaíso #694 L. 14, Viña del Mar. Since 2017 · Aesthetics For Men.',
      ogTitle:     'Agendar Hora | Barbería Alfa Men',
      ogDesc:      'Reserva tu hora en Barbería Alfa Men. Since 2017 · Aesthetics For Men.',
    },
    dashboard: {
      title:       'Mi Club | Alfa Men',
      description: 'Tu panel personal en Barbería Alfa Men. Revisa tus sellos, canjea premios y actualiza tu perfil.',
      ogTitle:     'Mi Club | Alfa Men',
      ogDesc:      'Club Alfa Men. Acumula sellos y canjea premios.',
    },
    registro: {
      title:       'Únete al Club Alfa Men',
      description: 'Crea tu cuenta en Barbería Alfa Men. Acumula sellos y canjea premios.',
      ogTitle:     'Únete al Club Alfa Men',
      ogDesc:      'Regístrate en Barbería Alfa Men y disfruta de beneficios exclusivos.',
    },
    siteName:    'Barbería Alfa Men',
    ogImage:     '/icons/icon-512.png',   // PENDIENTE: logo real del local
    themeColor:  '#0a0a0a',
    appTitle:    'Alfa Men',
    icon:        '/icons/icon-512.png',   // PENDIENTE: logo real del local
    local: { telephone: '', streetAddress: 'Av. Valparaíso #694 L. 14', addressLocality: 'Viña del Mar', schemaType: 'HairSalon', instagram: 'https://www.instagram.com/barberia_alfa/' },
    manifest: {
      name:             'Barbería Alfa Men',
      short_name:       'Alfa Men',
      theme_color:      '#0a0a0a',
      background_color: '#0a0a0a',
    },
    adminManifest: {
      name:             'Panel Admin · Alfa Men',
      short_name:       'Alfa Men',
      description:      'Panel de administración — Barbería Alfa Men',
      theme_color:      '#10b981',
      background_color: '#0f172a',
      start_url:        '/gestion-interna/?local=alfamen',
    },
  },
  deluxeperfumes: {
    booking: {
      title:       'Deluxe Perfumes | Catálogo online',
      description: 'Descubre el catálogo de Deluxe Perfumes. Perfumes originales, club de puntos y beneficios exclusivos.',
      ogTitle:     'Deluxe Perfumes | Catálogo online',
      ogDesc:      'Perfumes originales y beneficios exclusivos del Club Deluxe.',
    },
    dashboard: {
      title:       'Mi Club | Deluxe Perfumes',
      description: 'Tu panel personal en Deluxe Perfumes. Revisa tus puntos y canjea premios.',
      ogTitle:     'Mi Club | Deluxe Perfumes',
      ogDesc:      'Club Deluxe Perfumes. Acumula puntos y canjea premios.',
    },
    registro: {
      title:       'Únete al Club | Deluxe Perfumes',
      description: 'Crea tu cuenta en Deluxe Perfumes. Acumula puntos y canjea premios.',
      ogTitle:     'Únete al Club | Deluxe Perfumes',
      ogDesc:      'Regístrate en Deluxe Perfumes y disfruta de beneficios exclusivos.',
    },
    siteName:    'Deluxe Perfumes',
    ogImage:     '/logo5.jpg',
    themeColor:  '#0a0a0a',
    appTitle:    'Deluxe',
    icon:        '/logo5.jpg',
    iconPwa192:  '/icons/pwa/deluxeperfumes-192.png',
    iconPwa512:  '/icons/pwa/deluxeperfumes-512.png',
    local: { schemaType: 'Store' },
    manifest: {
      name:             'Deluxe Perfumes',
      short_name:       'Deluxe',
      theme_color:      '#0a0a0a',
      background_color: '#0a0a0a',
    },
    adminManifest: {
      name:             'Panel Admin · Deluxe',
      short_name:       'Deluxe',
      description:      'Panel de administración — Deluxe Perfumes',
      theme_color:      '#10b981',
      background_color: '#0f172a',
      start_url:        '/gestion-interna/?local=deluxeperfumes',
    },
  },
  renacer: {
    booking: {
      title:       'Reserva tu cita | Peluquería y Barbería Renacer',
      description: 'Agenda online en Peluquería y Barbería Renacer. Elige profesional, servicio de estilismo o barbería y horario en segundos.',
      ogTitle:     'Reserva tu cita en Renacer',
      ogDesc:      'Estilismo unisex, barbería de autor y tratamientos premium. Reserva online 24/7.',
    },
    dashboard: {
      title:       'Mis Citas y Sellos | Club Renacer',
      description: 'Revisa el historial de tus reservas, administra tus citas y acumula sellos de fidelidad en Peluquería y Barbería Renacer.',
      ogTitle:     'Tu cuenta en Club Renacer',
      ogDesc:      'Accede a tus beneficios, sellos y reservas activas en Renacer.',
    },
    registro: {
      title:       'Únete al Club Renacer | Registro',
      description: 'Regístrate gratis en el Club Renacer para acumular sellos y canjear servicios gratuitos.',
      ogTitle:     'Únete al Club Renacer',
      ogDesc:      'Crea tu cuenta, acumula sellos desde tu primera visita y accede a premios exclusivos.',
    },
    siteName:    'Peluquería y Barbería Renacer',
    ogImage:     'https://renacer.synaptechspa.cl/renacer/banner.webp',
    themeColor:  '#f59e0b',
    appTitle:    'Renacer',
    icon:        '/renacer/logo.webp',
    iconPwa192:  '/icons/pwa/renacer-192.png',
    iconPwa512:  '/icons/pwa/renacer-512.png',
    local: {
      telephone:       '+56985279282',
      streetAddress:   'Ecuador 266',
      postalCode:      '2520000',
      priceRange:      '$$',
      addressLocality: 'Viña del Mar',
      schemaType:      'BeautySalon',
    },
    manifest: {
      name:             'Peluquería y Barbería Renacer',
      short_name:       'Renacer',
      theme_color:      '#f59e0b',
      background_color: '#0a0806',
    },
    adminManifest: {
      name:             'Panel Admin · Renacer',
      short_name:       'Renacer',
      description:      'Panel de administración — Peluquería y Barbería Renacer',
      theme_color:      '#10b981',
      background_color: '#0f172a',
      start_url:        '/gestion-interna/?local=renacer',
    },
  },
};

function mimeFromSrc(src) {
  if (src.endsWith('.png'))  return 'image/png';
  if (src.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

// Coordenadas reales por tenant (extraídas del Place ID de Google) para el
// GeoCoordinates del JSON-LD → señal de SEO local. Agregar aquí al conectar
// un local nuevo a Google (sacar lat/lng de su ficha).
const GEO_COORDS = {
  elegance:           { lat: -33.024414, lng: -71.559849 },
  ferraza:            { lat: -33.021921, lng: -71.551683 },
  chameleon:          { lat: -33.013664, lng: -71.549411 },
  lumen:              { lat: -33.025211, lng: -71.557101 },
  aura:               { lat: -33.021511, lng: -71.548534 },
  oren:               { lat: -32.972200, lng: -71.551000 }, // Reñaca (sucursal principal)
  latincaribe:        { lat: -27.361472, lng: -70.335353 },
  infinity:           { lat: -33.023257, lng: -71.558337 },
  sionbarberia:       { lat: -33.048783, lng: -71.609610 },
  kronnos_penablanca: { lat: -33.046860, lng: -71.354013 },
  kronnos_limache:    { lat: -33.001860, lng: -71.267874 },
};

function buildJsonLd(meta, hostname, tenantId) {
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
  if (local.priceRange) schema.priceRange = local.priceRange;
  if (local.instagram) schema.sameAs = [local.instagram];
  if (Array.isArray(local.openingHours) && local.openingHours.length) schema.openingHours = local.openingHours;

  const addr = { '@type': 'PostalAddress', addressCountry: 'CL', addressRegion: 'Valparaíso' };
  if (local.streetAddress)   addr.streetAddress   = local.streetAddress;
  if (local.addressLocality) addr.addressLocality = local.addressLocality;
  if (local.postalCode)      addr.postalCode      = local.postalCode;
  schema.address = addr;

  // Coordenadas reales (GeoCoordinates) + ciudad servida → SEO local.
  const geo = GEO_COORDS[tenantId];
  if (geo) schema.geo = { '@type': 'GeoCoordinates', latitude: geo.lat, longitude: geo.lng };
  if (local.addressLocality) schema.areaServed = { '@type': 'City', name: local.addressLocality };

  // NOTA: NO se emiten aggregateRating ni review en el JSON-LD. Marcar en tu propio
  // sitio reseñas/notas copiadas de Google es "self-serving review markup", prohibido
  // por las guías de Google (riesgo de penalización manual). El rating real vive en el
  // Perfil de Empresa. Los campos ratingGeneral/totalReviews/reviews del objeto `local`
  // quedan disponibles para uso interno (UI), pero no se exponen como structured data.

  return JSON.stringify(schema);
}

function getPageType(pathname) {
  if (pathname.startsWith('/dashboard')) return 'dashboard';
  if (pathname.startsWith('/registro'))  return 'registro';
  // Agenda PRIVADA del profesional (con login): título/OG propios, no el home
  // de reservas del local. Cubre /agenda y /agenda.html (rewrite de vercel.json).
  if (pathname === '/agenda' || pathname === '/agenda.html') return 'agenda';
  return 'booking';
}

function r(str) {
  // Escape replacement string for String.replace (avoids $1, $& etc. issues)
  return str.replace(/\$/g, '$$$$');
}

// WhatsApp/Facebook scrapers require absolute URLs for og:image — relative paths are silently ignored.
function injectMeta(html, meta, pageMeta, canonical, hostname, pageType, tenantId) {
  // 1. Resolve absolute image URL for OG and search thumbnails
  const absImage = meta.ogImage.startsWith('http')
    ? meta.ogImage
    : `https://${hostname}${meta.ogImage}`;

  // 2. Strict tenant-isolated dynamic fallback description
  let desc = pageMeta.description || '';
  if (!desc || desc.trim() === '' || (desc.includes('Elegance Barbershop') && tenantId !== 'elegance')) {
    const name = meta.siteName || 'nuestro local';
    const address = meta.local?.streetAddress || '';
    const city = meta.local?.addressLocality || '';
    const isBeauty = meta.local?.schemaType === 'BeautySalon' || name.toLowerCase().includes('nails') || name.toLowerCase().includes('salon');
    const servicesWord = isBeauty ? 'Cortes, color, uñas y pestañas' : 'Cortes de cabello y perfilado de barba';
    
    if (address && city) {
      desc = `Reserva tu hora en ${name}. ${servicesWord} en ${address}, ${city}. Elige tu profesional y horario en segundos.`;
    } else if (city) {
      desc = `Reserva tu hora en ${name}. ${servicesWord} en ${city}. Elige tu profesional y horario en segundos.`;
    } else {
      desc = `Reserva tu hora en ${name}. ${servicesWord}. Elige tu profesional, servicio y horario en segundos.`;
    }
  }

  // 3. Strip all pre-existing SEO, social, thumbnail, and favicon tags to prevent leaks/conflicts (attribute order-agnostic)
  html = html.replace(/<meta\s+[^>]*name=["']?description["']?[^>]*>/gi, '');
  html = html.replace(/<meta\s+[^>]*property=["']?og:title["']?[^>]*>/gi, '');
  html = html.replace(/<meta\s+[^>]*property=["']?og:description["']?[^>]*>/gi, '');
  html = html.replace(/<meta\s+[^>]*property=["']?og:image["']?[^>]*>/gi, '');
  html = html.replace(/<meta\s+[^>]*property=["']?og:url["']?[^>]*>/gi, '');
  html = html.replace(/<meta\s+[^>]*property=["']?og:site_name["']?[^>]*>/gi, '');
  html = html.replace(/<meta\s+[^>]*name=["']?thumbnail["']?[^>]*>/gi, '');
  html = html.replace(/<meta\s+[^>]*name=["']?twitter:title["']?[^>]*>/gi, '');
  html = html.replace(/<meta\s+[^>]*name=["']?twitter:description["']?[^>]*>/gi, '');
  html = html.replace(/<meta\s+[^>]*name=["']?twitter:image["']?[^>]*>/gi, '');
  html = html.replace(/<link\s+[^>]*rel=["']?(?:shortcut\s+)?icon["']?[^>]*>/gi, '');
  html = html.replace(/<link\s+[^>]*rel=["']?apple-touch-icon["']?[^>]*>/gi, '');

  // 4. Resolve dynamic absolute favicon URLs and MIME type
  const absIcon = meta.icon.startsWith('http')
    ? meta.icon
    : `https://${hostname}${meta.icon}`;
  const mimeType = mimeFromSrc(meta.icon);
  // apple-touch-icon debe ser cuadrado: iOS lo usa como ícono al instalar la PWA.
  const rawApple = meta.iconPwa192 || meta.icon;
  const absApple = rawApple.startsWith('http') ? rawApple : `https://${hostname}${rawApple}`;

  // 5. Build clean, unified, edge-injected head block with absolute favicon and thumbnail URLs
  const seoBlock = `
  <meta name="description" content="${r(desc)}">
  <meta property="og:title" content="${r(pageMeta.ogTitle || pageMeta.title)}">
  <meta property="og:description" content="${r(pageMeta.ogDesc || desc)}">
  <meta property="og:image" content="${r(absImage)}">
  <meta property="og:url" content="${r(canonical)}">
  <meta property="og:site_name" content="${r(meta.siteName)}">
  <meta name="thumbnail" content="${r(absImage)}">
  <meta name="twitter:title" content="${r(pageMeta.ogTitle || pageMeta.title)}">
  <meta name="twitter:description" content="${r(pageMeta.ogDesc || desc)}">
  <meta name="twitter:image" content="${r(absImage)}">
  <link rel="icon" type="${mimeType}" href="${r(absIcon)}">
  <link rel="shortcut icon" type="${mimeType}" href="${r(absIcon)}">
  <link rel="apple-touch-icon" href="${r(absApple)}">`;

  // 6. Prepend this block right at the beginning of the <head>
  html = html.replace('<head>', `<head>${seoBlock}`);

  // 7. Dynamically replace or update the <title> tag
  html = html.replace(/(<title[^>]*>)[^<]*(<\/title>)/i, `$1${r(pageMeta.title)}$2`);

  // 8. Inject dynamic semantic schema JSON-LD before </head> for booking pages
  if (pageType === 'booking') {
    const jsonLd = buildJsonLd(meta, hostname, tenantId);
    html = html.replace('</head>', `<script type="application/ld+json">${jsonLd}</script>\n</head>`);
  }

  // 9. Inject a premium, fully isolated semantic Content SEO block right before </body> to boost crawler indexes safely
  const isBeauty = meta.local?.schemaType === 'BeautySalon' || meta.siteName.toLowerCase().includes('nails') || meta.siteName.toLowerCase().includes('salon');
  const servicesWord = isBeauty ? 'experiencia de belleza premium con servicios de manicura, pestañas y estética' : 'servicios de barbería de alta gama con cortes de cabello clásicos y modernos';
  const addressText = meta.local?.streetAddress ? `ubicado en la dirección ${meta.local.streetAddress}, ${meta.local.addressLocality || ''}` : `en ${meta.local?.addressLocality || ''}`;
  const seoText = `
  <!-- Semantic SEO Context Block - Strictly Isolated per Tenant -->
  <div id="tenant-seo-semantic-content" style="display:none;" aria-hidden="true">
    <h2>${meta.siteName}</h2>
    <p>Disfruta de una ${servicesWord} ${addressText}. Reserva tu hora fácilmente online con tu especialista preferido.</p>
  </div>`;
  html = html.replace('</body>', `${seoText}\n</body>`);

  return html;
}

function injectAdminMeta(html, meta, hostname) {
  const am = meta.adminManifest;

  // Clean all previous icon/apple icon tags and theme color tags first to avoid duplicates (attribute order-agnostic)
  html = html.replace(/<meta\s+[^>]*name=["']?theme-color["']?[^>]*>/gi, '');
  html = html.replace(/<link\s+[^>]*rel=["']?(?:shortcut\s+)?icon["']?[^>]*>/gi, '');
  html = html.replace(/<link\s+[^>]*rel=["']?apple-touch-icon["']?[^>]*>/gi, '');
  html = html.replace(/<meta\s+[^>]*name=["']?apple-mobile-web-app-title["']?[^>]*>/gi, '');
  html = html.replace(/<meta\s+[^>]*name=["']?application-name["']?[^>]*>/gi, '');
  // Strip any pre-existing social tags to evitar que el preview muestre otro local
  html = html.replace(/<meta\s+[^>]*property=["']?og:[^"']*["']?[^>]*>/gi, '');
  html = html.replace(/<meta\s+[^>]*name=["']?twitter:[^"']*["']?[^>]*>/gi, '');

  const amIcon = meta.iconPwa192 || (am.icons && am.icons[0] ? am.icons[0].src : meta.icon);
  const mimeType = mimeFromSrc(amIcon);
  const absIcon = amIcon.startsWith('http') ? amIcon : `https://${hostname}${amIcon}`;
  const absImage = meta.ogImage.startsWith('http') ? meta.ogImage : `https://${hostname}${meta.ogImage}`;
  const title = `Panel Admin · ${meta.siteName}`;

  const adminHeadBlock = `
  <meta name="theme-color" content="${r(am.theme_color)}">
  <meta name="apple-mobile-web-app-title" content="${r(am.short_name)}">
  <meta name="application-name" content="${r(am.short_name)}">
  <link rel="icon" type="${mimeType}" href="${r(absIcon)}">
  <link rel="shortcut icon" type="${mimeType}" href="${r(absIcon)}">
  <link rel="apple-touch-icon" href="${r(absIcon)}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${r(title)}">
  <meta property="og:description" content="${r(am.description || '')}">
  <meta property="og:image" content="${r(absImage)}">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${r(title)}">
  <meta name="twitter:image" content="${r(absImage)}">`;

  html = html.replace('<head>', `<head>${adminHeadBlock}`);
  // Título específico del local en vez del genérico "Barbería SaaS"
  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${r(title)}</title>`);
  return html;
}

// ═════════════════════════════════════════════════════════════════════════════
//  TENANTS SELF-SERVICE — resolución dinámica de subdominios
//
//  Producto masivo (/crea + CF provisionarTenantSelf): cada local creado
//  self-service vive en {slug}.synaptechspa.cl SIN entrada en DOMAIN_MAP ni
//  TENANT_META. La fuente de verdad es el doc raíz público tenants/{slug}
//  en Firestore (branding + plan, sin datos sensibles). Aquí:
//    1. fetchSelfTenant     — lee ese doc por REST (mismo patrón que bio_handles)
//    2. buildSelfTenantMeta — arma un TENANT_META genérico desde sus campos
//    3. selfTenantScript    — inyecta __FORCE_TENANT__ + __TENANT_CONFIG__
//       para que config.js registre el tenant sin tocar código.
//  Los tenants a medida NO pasan por aquí: DOMAIN_MAP resuelve primero.
// ═════════════════════════════════════════════════════════════════════════════

// Subdominios que jamás son un tenant self-service (evita un fetch inútil).
const SELF_SUBDOMINIOS_EXCLUIDOS = new Set([
  'www', 'empieza', 'links', 'admin', 'crea', 'demo', 'api', 'app', 'bioo',
]);

async function fetchSelfTenant(slug) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID || 'barberia-elegance';
    const docUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/tenants/${encodeURIComponent(slug)}`;
    const res = await fetch(docUrl);
    if (!res.ok) return null;
    const f = ((await res.json()).fields) || {};
    const s = (k) => (f[k] && f[k].stringValue) || null;
    // Tenants dinámicos: self-service (/crea) Y a-medida express (/admin →
    // provisionarTenantAdmin). Los a medida clásicos (con CSS propio) se
    // resuelven antes por DOMAIN_MAP y nunca llegan aquí.
    const origen = s('origen');
    if (origen !== 'self-service' && origen !== 'admin-express') return null;
    if (s('estado') === 'suspendido') return null;   // kill switch a nivel edge
    return {
      slug,
      nombre:      s('nombre') || slug,
      nombreCorto: s('nombreCorto') || (s('nombre') || slug).split(' ')[0],
      tipo:        s('tipo'),
      telefono:    s('telefono'),
      color:       s('color'),
      instagram:   s('instagram'),
      slogan:      s('slogan'),
      direccion:   s('direccion'),
      logoUrl:     s('logoUrl'),
    };
  } catch (_) {
    return null;
  }
}

function buildSelfTenantMeta(slug, t) {
  const nombre = t.nombre;
  const corto  = t.nombreCorto;
  const desc   = `Reserva tu hora en ${nombre}. Elige servicio, profesional y horario en segundos.`;
  const schemaPorTipo = {
    barberia: 'HairSalon', peluqueria: 'HairSalon', mixto: 'HairSalon',
    nails: 'NailSalon', spa: 'DaySpa', otro: 'LocalBusiness',
  };
  const icon = t.logoUrl || '/syn-192.png';
  return {
    booking: {
      title:       `Agendar Hora | ${nombre}`,
      description: desc,
      ogTitle:     `Agendar Hora | ${nombre}`,
      ogDesc:      desc,
    },
    dashboard: {
      title:       `Mi Club | ${nombre}`,
      description: `Tu panel personal en ${nombre}. Revisa tus sellos, canjea premios y actualiza tu perfil.`,
      ogTitle:     `Mi Club | ${nombre}`,
      ogDesc:      `Club de fidelidad de ${nombre}. Acumula sellos y canjea premios.`,
    },
    registro: {
      title:       `Únete al Club | ${nombre}`,
      description: `Crea tu cuenta en ${nombre}. Acumula sellos y canjea premios.`,
      ogTitle:     `Únete al Club | ${nombre}`,
      ogDesc:      `Regístrate en ${nombre} y disfruta de beneficios exclusivos.`,
    },
    siteName:   nombre,
    ogImage:    t.logoUrl || '/syn-512.png',
    themeColor: '#0a0a0a',
    appTitle:   corto,
    icon,
    // El logo del local siempre le gana al ícono genérico al instalar la PWA.
    ...(t.logoUrl ? { iconPwa192: t.logoUrl, iconPwa512: t.logoUrl } : {}),
    local: {
      schemaType: schemaPorTipo[t.tipo] || 'HairSalon',
      ...(t.telefono  ? { telephone: `+${String(t.telefono).replace(/^\+/, '')}` } : {}),
      ...(t.direccion ? { streetAddress: t.direccion } : {}),
      ...(t.instagram ? { instagram: `https://instagram.com/${t.instagram}` } : {}),
    },
    manifest: {
      name:             nombre,
      short_name:       corto.slice(0, 12),
      theme_color:      '#0a0a0a',
      background_color: '#0a0a0a',
    },
    adminManifest: {
      name:             `Panel Admin · ${corto}`,
      short_name:       corto.slice(0, 12),
      description:      `Panel de administración — ${nombre}`,
      theme_color:      '#10b981',
      background_color: '#0f172a',
      start_url:        `/gestion-interna/?local=${slug}`,
      icons: [
        { src: '/gestion-interna/pwa-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/gestion-interna/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    },
  };
}

function selfTenantScript(slug, t) {
  const cfg = { id: slug, ...t };
  // < evita cerrar el <script> si algún campo trajera "</script>".
  return '<script>window.__FORCE_TENANT__=' + JSON.stringify(slug)
    + ';window.__TENANT_CONFIG__=' + JSON.stringify(cfg).replace(/</g, '\\u003c')
    + ';</script>';
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
  // Prevent infinite loop: re-fetches from this middleware carry this header
  if (request.headers.get('x-mw-bypass') === '1') return;

  const url      = new URL(request.url);
  const hostname = (request.headers.get('host') || '').replace(/:\d+$/, '');

  // Seeders internos de administración (/seed-*.html): son páginas-herramienta
  // que hablan directo con Firestore. No inyectar meta ni pasar por el pipeline
  // de tenant — servirlos como estáticos crudos.
  if (url.pathname.startsWith('/seed-') && url.pathname.endsWith('.html')) {
    return;
  }

  // ── Dashboard interno de Operaciones (ops.synaptechspa.cl) ──
  // No es un tenant: la raíz sirve ops.html (métricas unificadas barbería +
  // conexion). Los assets externos (gstatic) los carga el navegador directo.
  if (hostname === 'ops.synaptechspa.cl') {
    if (url.pathname === '/' || url.pathname === '/index.html') {
      const rw  = new URL('/ops.html', request.url);
      const res = await fetch(new Request(rw, { headers: new Headers([...request.headers, ['x-mw-bypass', '1']]) }));
      return new Response(res.body, { status: res.status, headers: res.headers });
    }
    return;
  }

  // ── SynapTech Links (producto self-serve, bioo.cl) ────────────────────────────
  // No es un tenant: las páginas de /links sirven su propio <head>, íconos y
  // manifest dinámico, así que NO inyectamos el SEO de ningún tenant aquí.
  // Dominio viejo → redirige todo a bioo.cl (incluida la raíz, que el redirect
  // de vercel.json con `/:path*` no alcanza a matchear).
  if (hostname === 'links.synaptechspa.cl') {
    return Response.redirect('https://bioo.cl' + url.pathname + url.search, 308);
  }

  // ── Wallets · bioo (estudio de personalización de tarjetas) ──
  // No es un tenant: wallets-bioo.html trae su propio <head>. La raíz se
  // sirve desde aquí porque el index.html del repo tapa el rewrite de
  // vercel.json (mismo caso documentado de bioo.cl). El resto de rutas
  // (config.js, firebase-config.js, assets) pasan crudas.
  if (hostname === 'wallets.bioo.cl') {
    if (url.pathname === '/' || url.pathname === '/index.html') {
      const rw  = new URL('/wallets-bioo.html', request.url);
      const res = await fetch(new Request(rw, { headers: new Headers([...request.headers, ['x-mw-bypass', '1']]) }));
      return new Response(res.body, { status: res.status, headers: res.headers });
    }
    return;
  }

  if (hostname === 'bioo.cl') {
    // La raíz sirve la landing de Links (un index.html en la raíz del repo tapa
    // el rewrite afterFiles de vercel.json, así que lo servimos desde aquí).
    if (url.pathname === '/' || url.pathname === '/index.html') {
      const rw  = new URL('/links/index.html', request.url);
      const res = await fetch(new Request(rw, { headers: new Headers([...request.headers, ['x-mw-bypass', '1']]) }));
      return new Response(res.body, { status: res.status, headers: res.headers });
    }
    // ¿El slug es el handle de un local (colección bio_handles)? → servimos su
    // bio.html en bioo.cl/<handle> SIN redirect, inyectando el tenant. Si no lo
    // es, sigue al producto self-serve (u.html via rewrite de vercel.json).
    const slug = url.pathname.replace(/^\/+|\/+$/g, '');
    if (slug && slug.indexOf('/') < 0 && slug.indexOf('.') < 0 && ['registro', 'editor', 'claim', 'favicon.ico'].indexOf(slug) < 0) {
      try {
        const projectId = process.env.FIREBASE_PROJECT_ID || 'barberia-elegance';
        const docUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/bio_handles/${encodeURIComponent(slug)}`;
        const r = await fetch(docUrl);
        if (r.ok) {
          const f     = ((await r.json()).fields) || {};
          const tid   = f.tenantId && f.tenantId.stringValue;
          const bhost = (f.host && f.host.stringValue) || '';
          if (tid) {
            const rw  = new URL('/bio.html', request.url);
            const res = await fetch(new Request(rw, { headers: new Headers([...request.headers, ['x-mw-bypass', '1']]) }));
            let html  = await res.text();
            const inj = '<script>window.__FORCE_TENANT__=' + JSON.stringify(tid) + ';window.__BIO_HOST__=' + JSON.stringify(bhost) + ';</script>';
            html = html.replace('<head>', '<head>' + inj);
            return new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache, must-revalidate' } });
          }
        }
      } catch (e) { /* si falla la consulta, cae al self-serve */ }
    }
    return;
  }

  // ── Centro de Ayuda: sitemap propio ───────────────────────────
  //   /ayuda/sitemap.xml → lista todas las guías publicadas para SEO.
  //   Se genera al vuelo desde Firestore REST + se cachea 1h.
  if (url.pathname === '/ayuda/sitemap.xml') {
    try {
      const baseUrl   = `https://${hostname}`;
      const projectId = process.env.FIREBASE_PROJECT_ID || 'barberia-elegance';
      const today     = new Date().toISOString().split('T')[0];

      const catsUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/_ayuda/global/categorias`;
      const artsUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/_ayuda/global/articulos`;
      const [catsRes, artsRes] = await Promise.all([fetch(catsUrl), fetch(artsUrl)]);
      const cats = catsRes.ok ? ((await catsRes.json()).documents || []) : [];
      const arts = artsRes.ok ? ((await artsRes.json()).documents || []) : [];

      const entries = [
        `  <url><loc>${baseUrl}/ayuda</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>`,
      ];
      for (const c of cats) {
        const slug = c.fields?.slug?.stringValue;
        if (slug) entries.push(`  <url><loc>${baseUrl}/ayuda/${slug}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`);
      }
      for (const a of arts) {
        if (a.fields?.publicado?.booleanValue !== true) continue;
        const catSlug = a.fields?.categoriaSlug?.stringValue;
        const artSlug = a.fields?.slug?.stringValue;
        if (catSlug && artSlug) {
          const upd = a.fields?.updatedAt?.timestampValue?.split('T')[0] || today;
          entries.push(`  <url><loc>${baseUrl}/ayuda/${catSlug}/${artSlug}</loc><lastmod>${upd}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`);
        }
      }
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>`;
      return new Response(xml, {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      });
    } catch (e) {
      return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>', {
        headers: { 'Content-Type': 'text/xml; charset=utf-8' },
      });
    }
  }

  // ── Centro de Ayuda (SynapTech-wide, cross-tenant) ────────────
  //   /ayuda                   → home
  //   /ayuda/{cat}             → categoría
  //   /ayuda/{cat}/{articulo}  → artículo (SEO server-side inyectado)
  //   Todas las rutas caen a /ayuda.html y el client-side router
  //   monta la vista según location.pathname. El HTML es único para
  //   todos los tenants — el contenido vive en _ayuda/global/*.
  if (url.pathname === '/ayuda' || url.pathname.startsWith('/ayuda/')) {
    const rw = new URL('/ayuda.html', request.url);
    const res = await fetch(new Request(rw, {
      headers: new Headers([...request.headers, ['x-mw-bypass', '1']]),
    }));
    let html = await res.text();

    // Inyectar meta tags server-side para artículos (SEO real para bots).
    // Path /ayuda/{cat}/{art} → hacemos fetch al REST API de Firestore para
    // resolver titulo + deck; con eso reemplazamos las 4-5 metas de la home
    // por las del artículo. Bots ven contenido correcto sin ejecutar JS.
    try {
      const m = /^\/ayuda\/([^/]+)\/([^/]+)\/?$/.exec(url.pathname);
      if (m) {
        const [, catSlug, artSlug] = m;
        const projectId = process.env.FIREBASE_PROJECT_ID || 'barberia-elegance';
        const fsBase = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/_ayuda/global/articulos`;
        // Firestore no permite where sobre un solo campo con REST sencillo:
        // en su lugar, tratamos artSlug como docId primero (que es el patrón
        // del seed), y si falla haremos un runQuery.
        let art = null;
        const direct = await fetch(`${fsBase}/${encodeURIComponent(artSlug)}`);
        if (direct.ok) art = ((await direct.json()).fields) || null;
        if (!art) {
          const query = {
            structuredQuery: {
              from: [{ collectionId: 'articulos' }],
              where: {
                compositeFilter: {
                  op: 'AND',
                  filters: [
                    { fieldFilter: { field: { fieldPath: 'slug' },      op: 'EQUAL', value: { stringValue: artSlug } } },
                    { fieldFilter: { field: { fieldPath: 'publicado' }, op: 'EQUAL', value: { booleanValue: true } } },
                  ],
                },
              },
              limit: 1,
            },
          };
          const qUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/_ayuda/global:runQuery`;
          const qRes = await fetch(qUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(query),
          });
          if (qRes.ok) {
            const arr = await qRes.json();
            const doc = Array.isArray(arr) ? arr.find(x => x.document) : null;
            if (doc?.document?.fields) art = doc.document.fields;
          }
        }
        if (art) {
          const titulo = art.titulo?.stringValue || 'Guía';
          const deck   = art.deck?.stringValue || '';
          const seoTitle = `${titulo} · Centro de Ayuda SynapTech`;
          const seoDesc  = deck || `Guía sobre ${titulo} en SynapTech.`;
          const seoUrl   = `https://${hostname}${url.pathname}`;

          const escAttr = s => String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          html = html
            .replace(/<title>[^<]*<\/title>/, `<title>${escAttr(seoTitle)}</title>`)
            .replace(/(<meta name="description" content=")[^"]*(")/, `$1${escAttr(seoDesc)}$2`)
            .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${escAttr(seoTitle)}$2`)
            .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${escAttr(seoDesc)}$2`)
            .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${escAttr(seoUrl)}$2`);
        }
      }
    } catch (e) {
      // Si el fetch a Firestore falla, dejamos el HTML sin SSR y el JS del
      // cliente actualiza las metas dinámicamente. Los bots ven las metas
      // de la home hasta que se solucione, pero la página funciona.
    }

    const headers = new Headers(res.headers);
    headers.set('Content-Type', 'text/html; charset=utf-8');
    headers.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600');
    return new Response(html, { status: res.status, headers });
  }

  // /crea (registro self-service) y /empieza (landing leads): páginas propias
  // con su propio <head>; no inyectar el SEO de ningún tenant. En sus
  // subdominios dedicados la raíz NO puede resolverse por rewrite de
  // vercel.json — index.html en la raíz del repo tapa los rewrites afterFiles
  // (mismo caso documentado de bioo.cl) — así que las servimos desde el edge.
  const LANDING_HOSTS = {
    'crea.synaptechspa.cl':    '/crea.html',
    'empieza.synaptechspa.cl': '/empieza.html',
  };
  if (LANDING_HOSTS[hostname]) {
    // Assets (rutas con extensión) pasan directo al filesystem.
    if (url.pathname.indexOf('.') >= 0 && !url.pathname.endsWith('.html')) return;
    const rw  = new URL(LANDING_HOSTS[hostname], request.url);
    const res = await fetch(new Request(rw, { headers: new Headers([...request.headers, ['x-mw-bypass', '1']]) }));
    const headers = new Headers(res.headers);
    headers.set('Content-Type', 'text/html; charset=utf-8');
    headers.set('Cache-Control', 'no-cache, must-revalidate');
    return new Response(res.body, { status: res.status, headers });
  }
  if (url.pathname === '/crea' || url.pathname === '/crea.html') {
    return;
  }

  let tenantId = DOMAIN_MAP[hostname];

  // ── Tenants self-service: {slug}.synaptechspa.cl sin entrada en DOMAIN_MAP ──
  let selfTenant = null;
  if (!tenantId && hostname.endsWith('.synaptechspa.cl')) {
    const sub = hostname.slice(0, -'.synaptechspa.cl'.length);
    if (sub && sub.indexOf('.') < 0 && !SELF_SUBDOMINIOS_EXCLUIDOS.has(sub)) {
      selfTenant = await fetchSelfTenant(sub);
      if (selfTenant) tenantId = sub;
    }
  }

  if (!tenantId) tenantId = 'elegance';

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
    const txt = `User-agent: *\nAllow: /\n\nSitemap: ${baseUrl}/sitemap.xml\nSitemap: ${baseUrl}/ayuda/sitemap.xml\n`;
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
  // Self-service: el meta se construye desde el doc raíz del tenant, no del map.
  const meta = selfTenant
    ? buildSelfTenantMeta(tenantId, selfTenant)
    : JSON.parse(JSON.stringify(TENANT_META[tenantId] ?? TENANT_META.elegance));

  // ── Manifest cliente: devolver versión dinámica por tenant ───────────────────
  if (url.pathname === '/manifest.json') {
    const pwa192 = meta.iconPwa192 || '/icons/icon-192.png';
    const pwa512 = meta.iconPwa512 || '/icons/icon-512.png';
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
        { src: pwa192, sizes: '192x192', type: mimeFromSrc(pwa192), purpose: 'any maskable' },
        { src: pwa512, sizes: '512x512', type: mimeFromSrc(pwa512), purpose: 'any maskable' },
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
    const pwa192 = meta.iconPwa192 || '/icons/icon-192.png';
    const pwa512 = meta.iconPwa512 || '/icons/icon-512.png';
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
        { src: pwa192, sizes: '192x192', type: mimeFromSrc(pwa192), purpose: 'any maskable' },
        { src: pwa512, sizes: '512x512', type: mimeFromSrc(pwa512), purpose: 'any maskable' },
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
    // Íconos por tenant: sin este override Android instala el PNG genérico
    // (pwa-192/512 = logo SynapTech) porque es el único con sizes declarado.
    // Fallback neutro (círculo gris), jamás el logo SynapTech.
    const p192 = meta.iconPwa192 || '/icons/icon-192.png';
    const p512 = meta.iconPwa512 || '/icons/icon-512.png';
    const manifest = {
      ...meta.adminManifest,
      display:     'standalone',
      orientation: 'portrait-primary',
      scope:       '/gestion-interna/',
      icons: [
        { src: p192, sizes: '192x192', type: mimeFromSrc(p192), purpose: 'any' },
        { src: p512, sizes: '512x512', type: mimeFromSrc(p512), purpose: 'any maskable' },
      ],
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
    // Self-service: el panel resuelve el tenant vía ?local= (tenantUtils no
    // conoce estos subdominios). Si falta, redirigimos agregándolo — queda
    // persistido en sessionStorage del panel para el resto de la sesión.
    if (selfTenant && !url.searchParams.get('local')) {
      url.searchParams.set('local', tenantId);
      return Response.redirect(url, 302);
    }
    const response = await fetch(new Request(request, { headers: new Headers([...request.headers, ['x-mw-bypass', '1']]) }));
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) return response;
    let html = await response.text();
    html = injectAdminMeta(html, meta, hostname);
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

  // ── Agenda PERSONAL del profesional (/agenda.html) ───────────────────────────
  //  Vista privada con login del barbero. meta['agenda'] no existe en el config
  //  por-tenant, así que componemos su título/OG acá — para que al compartirse o
  //  al verse en la pestaña/PWA diga "Agenda Personal" y no "Agendar Hora | Local".
  if (pageType === 'agenda') {
    pageMeta = {
      title:       `Agenda Personal · ${meta.siteName}`,
      ogTitle:     '✂️ Agenda Directa del Profesional',
      ogDesc:      'Canal de agendamiento directo del profesional. Vista privada para gestionar reservas y horarios.',
      description: `Agenda personal del profesional en ${meta.siteName}.`,
    };
  }

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
            pageMeta.title = `Agenda directa de ${nombreBarbero} · Reserva tu hora`;
            pageMeta.ogTitle = `✂️ Agenda directa de ${nombreBarbero} · Reserva tu hora`;
            pageMeta.ogDesc = `Canal de agendamiento directo con ${nombreBarbero}. Elige tu servicio y asegura tu cita sin esperas.`;
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

  // Nota: elegance también pasa por la inyección de meta (antes se servía crudo).
  // Así su <title>/description/JSON-LD/bloque semántico quedan controlados por el
  // tenant correcto y Google no arma el snippet con texto de otros locales.

  // ── Inyección de Meta Tags en HTML ───────────────────────────────────────────
  const response = await fetch(new Request(request, { headers: new Headers([...request.headers, ['x-mw-bypass', '1']]) }));
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  const canonical = `https://${hostname}${url.pathname === '/' ? '' : url.pathname}`;

  let html = await response.text();
  html = injectMeta(html, meta, pageMeta, canonical, hostname, pageType, tenantId);

  // Self-service: registrar el tenant en config.js sin tocar código —
  // __TENANT_CONFIG__ arma window.SHOP y __FORCE_TENANT__ lo selecciona.
  if (selfTenant) {
    html = html.replace('<head>', '<head>' + selfTenantScript(tenantId, selfTenant));
  }

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
