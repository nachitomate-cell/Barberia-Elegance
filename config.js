// config.js — Configuración del negocio (multi-tenant)
// El tenant se resuelve desde ?local= en la URL o desde el dominio.

(function () {
  const _g = 'color:#C9A84C;font-weight:900;';
  const _s = 'color:#888;font-size:12px;';
  console.log('%c  SynapTech  ', `${_g}font-size:28px;background:#0a0a0d;padding:6px 18px;border-radius:8px;letter-spacing:2px;`);
  console.log('%c  Desarrollado por SynapTech SpA · synaptechspa.cl', _s);
  console.log('%c  ¿Curioso/a? Contáctanos y construyamos algo juntos. 🚀', _s);
})();

(function () {
  const _domainMap = {
    'gitananails.synaptechspa.cl':        'gitana',
    'barberiaelegance.synaptechspa.cl':   'elegance',
    'barberiaferraza.synaptechspa.cl':    'ferraza',
    'mapubarbershop.synaptechspa.cl':     'mapubarbershop',
    'chameleonbarber.synaptechspa.cl':    'chameleon',
    'memphissalon.synaptechspa.cl':       'memphis',
    'deluxeperfumes.synaptechspa.cl':     'deluxeperfumes',
    'barberiadjones.synaptechspa.cl':     'lumen',
    'delnerobarber.synaptechspa.cl':      'delnero',
    'marcelohairdressing.synaptechspa.cl': 'marcelo_hairdressing',
    'marcelo-hairdressing.synaptechspa.cl': 'marcelo_hairdressing',
    'marcelopalma.synaptechspa.cl':       'marcelo_hairdressing',
    'aurasalon.synaptechspa.cl':          'aura',
    'aurasalonmalegrooming.synaptechspa.cl': 'aura',
    'latincaribe.synaptechspa.cl':        'latincaribe',
    'thelatincaribe.synaptechspa.cl':     'latincaribe',
    'djonesbarberia.synaptechspa.cl':     'lumen',
    'machos.synaptechspa.cl':             'machos',
    'infinity.synaptechspa.cl':           'infinity',
    'studiodieciseis.synaptechspa.cl':    'sionbarberia',
    'sionbarberia.synaptechspa.cl':       'sionbarberia',
    'barberiasion.synaptechspa.cl':       'sionbarberia',
    'omegastudio.synaptechspa.cl':        'omegastudio',
    'alfamen.synaptechspa.cl':            'alfamen',
    'yugenstudio.synaptechspa.cl':        'yugen',
    'yugen.synaptechspa.cl':              'yugen',
    'yugenstudio.cl':                     'yugen',
    'www.yugenstudio.cl':                 'yugen',
    'sandbox.synaptechspa.cl':            'sandbox',
    'kronnospenablanca.synaptechspa.cl':  'kronnos_penablanca',
    'kronnos-penablanca.synaptechspa.cl': 'kronnos_penablanca',
    'kronnoslimache.synaptechspa.cl':     'kronnos_limache',
    'kronnos-limache.synaptechspa.cl':    'kronnos_limache',
    'kronnoswoman.synaptechspa.cl':       'kronnos_woman',
    'kronnos-woman.synaptechspa.cl':      'kronnos_woman',
    'barbersclub.synaptechspa.cl':        'barbersclub',
    'elbarberomoderno.synaptechspa.cl':   'elbarberomoderno',
    'estudioluxury.synaptechspa.cl':      'estudioluxury',
  };

  // Alias de tema: reutiliza los estilos CSS de un tenant existente en lugar
  // de duplicar decenas de reglas. Se aplica una segunda clase al <html>.
  const _themeAlias = {
    // elbarberomoderno tiene tema propio "Silver & Pure Dark" — ver bloque
    // .tenant-elbarberomoderno en index.html.
    // Estudio Luxury reutiliza el tema "Premium Dark" (dark + dorado) de
    // Barbers Club en las 3 superficies —index.html (booking), registro.html
    // y dashboard.css— sin duplicar CSS. Se distingue solo por contenido
    // (logo, nombre, slogan, watermark) y datos.
    estudioluxury: 'barbersclub',
  };

  const _tenants = {
    // ── SANDBOX — tenant de pruebas (datos aislados en tenants/sandbox/) ──
    // Acceso: ?local=sandbox  o  sandbox.synaptechspa.cl
    // Para probar features en producción sin tocar clientes reales.
    sandbox: {
      categoriasServicio: ['Cortes', 'Barba', 'Combos', 'Extras', 'Otro'],
      nombre:          'Barbería Demo',
      nombreCorto:     'Demo',
      pageTitle:       'Barbería Demo · Entorno de pruebas',
      bodyBg:          '#0a0a0a',
      slogan:          'Entorno de pruebas — Sandbox',
      logo:            '/logo.jpg',
      direccion:       '📍 Entorno de pruebas',
      horario:         '🕒 Lun a Sáb · Demo',
      telefono:        '',
      club:            'Club Demo',
      instagram:       '',
      instagramHandle: '',
      waEmoji:         '✂️',
      googleReviewUrl: '',
      // ── Copy sugerida para reseñas Google (opcional) ───────────
      //   Cuando el cliente no escribe nada, el helper copia al portapapeles
      //   este texto (o uno del pool default). Acepta string o array de strings
      //   — si es array, se pickea random para evitar patrones scripted que
      //   Google penaliza. Ejemplo por tenant:
      //     copyResenaSugerida: [
      //       'Excelente atención en Kronnos, muy recomendados 🙌',
      //       'Súper profesionales, quedé encantado con mi corte 💯',
      //       'Gran experiencia en Kronnos ✂️ Ya me toca volver',
      //     ]
      // copyResenaSugerida: '',
      ratingGeneral:   0,
      totalReviews:    0,
      reviews:         [],
      barberos:        [],
      _esSandbox:      true,
    },
    // ── KRONNOS STUDIO — marca unificada (Camino 1, 2026-07-06) ──
    // Un solo tenant con las 3 sedes internas (penablanca, limache, woman).
    // Pool marca compartido: users/sellos/premios/rangos. Catálogo/staff/precio por sede.
    // Fidelización cross-sede (sellos suman entre sedes). Canje en sede predominante.
    // Acceso: subdominio (kronnospenablanca/limache/woman.synaptechspa.cl) resuelve la sede;
    // o ?local=kronnos&sede=X en cualquier dominio.
    kronnos: {
      categoriasServicio: ['PACKS KRONNOS', 'Servicios Masculinos', 'Servicios Femeninos', 'Manicura', 'Masajes', 'Maquillaje', 'Pestañas', 'Cabello', 'Otro'],
      nombre:          'Kronnos Studio',
      nombreCorto:     'Kronnos',
      pageTitle:       'Kronnos Studio · Agenda tu hora',
      bodyBg:          '#0a0a0a',
      slogan:          'Un espacio unisex donde ambos mundos convergen',
      sobreNosotros:   'Kronnos Studio es un espacio unisex en donde ambos mundos convergen en manos de profesionales estilistas y barberos con más de 12 años de experiencia.',
      logo:            '/kronnos/studio.jpg',
      direccion:       '', // resuelto por sede — ver sedes[]
      horario:         '', // idem
      telefono:        '', // idem
      club:            'Club Kronnos',
      instagram:       '',
      instagramHandle: '',
      waEmoji:         '✂️',
      googleReviewUrl: 'https://search.google.com/local/writereview?placeid=ChIJV4oFY8XXiZYRqUPwb1wNDwU', // Peñablanca (unica sede con Google Business review)
      // ── Dashboard (club): copy del hero, subtítulo del header y watermark ──
      // heroLine1/2: string = innerHTML (admite <br>) · false = oculto · ausente = default
      headerSub:       'STUDIO',
      heroLine1:       'Donde ambos<br>mundos',
      heroLine2:       'convergen.',
      watermark:       'K',
      ratingGeneral:   4.3,     // real (Peñablanca) — Limache y Woman aun sin reseñas
      totalReviews:    7,       // real (Peñablanca)
      reviews:         [],
      barberos:        [], // resuelto por sede — SedeContext filtra en D2/D3
      partners:        [],
      // ── SEDES: fuente de verdad para catálogo/staff/tel/IG/review/tema por local ──
      sedes: [
        {
          id:               'penablanca',
          nombre:           'Kronnos Studio Peñablanca',
          tipo:             'Barbería · Estilismo',
          subdomain:        'kronnospenablanca.synaptechspa.cl',
          direccion:        '📍 Av. Vicepresidente Bernardo Leighton 20, local 13 · Villa Alemana',
          horario:          '🕒 Lun a Sáb · 10:30 – 19:00',
          telefono:         '56982504870',
          instagram:        'https://www.instagram.com/Kronnos.pb/',
          instagramHandle:  '@Kronnos.pb',
          googleReviewUrl:  'https://search.google.com/local/writereview?placeid=ChIJV4oFY8XXiZYRqUPwb1wNDwU',
          colorAccent:      '#e11d2a', // rojo Peñablanca
          heroBgUrl:        '/kronnos/kronospena.png',
          logo:             '/kronnos/studio.jpg',
          pageTitle:        'Kronnos Studio Peñablanca | Agenda tu hora',
          categoriasServicio: ['PACKS KRONNOS', 'Servicios Masculinos', 'Servicios Femeninos', 'Otro'],
          barberos: [
            { nombre: 'Martin',            foto: null, disponible: true },
            { nombre: 'Evelyn Contreras',  foto: null, disponible: true },
            { nombre: 'Araceli',           foto: null, disponible: true },
          ],
          partners: [
            { name: 'Viking Brand', role: 'Embajador oficial',
              logo: '/kronnos/viking.jpg',
              instagram: 'https://www.instagram.com/vikingbrand.chile/' },
          ],
        },
        {
          id:               'limache',
          nombre:           'Kronnos Studio Limache',
          tipo:             'Barbería · Estilismo',
          subdomain:        'kronnoslimache.synaptechspa.cl',
          direccion:        '📍 Paseo Las Araucarias 405, local 5 · Limache',
          horario:          '🕒 Lun a Sáb · 10:30 – 19:00',
          telefono:         '56920241041',
          instagram:        'https://www.instagram.com/kronnos.studio/',
          instagramHandle:  '@kronnos.studio',
          googleReviewUrl:  'https://search.google.com/local/writereview?placeid=ChIJS-YkghHViZYRnjPD2hbP6Ik',
          colorAccent:      '#f97316', // naranja Limache
          heroBgUrl:        '/kronnos/kronoslima.png',
          logo:             '/kronnos/studio.jpg',
          pageTitle:        'Kronnos Studio Limache | Agenda tu hora',
          categoriasServicio: ['PACKS KRONNOS', 'Servicios Masculinos', 'Otro'],
          barberos: [
            { nombre: 'Evelyn Contreras',  foto: null, disponible: true },
            { nombre: 'Claudio',           foto: null, disponible: true },
            { nombre: 'Cristian Orostica', foto: null, disponible: true },
            { nombre: 'Orlando Palacios',  foto: null, disponible: true },
            { nombre: 'Víctor',            foto: null, disponible: true },
          ],
          partners: [
            { name: 'Viking Brand', role: 'Embajador oficial',
              logo: '/kronnos/viking.jpg',
              instagram: 'https://www.instagram.com/vikingbrand.chile/' },
          ],
        },
        {
          id:               'woman',
          nombre:           'Kronnos Woman',
          tipo:             'Belleza · Estética',
          subdomain:        'kronnoswoman.synaptechspa.cl',
          direccion:        '📍 Palmira Romano Sur 405, local 3 · Limache',
          horario:          '🕒 Lun a Dom · 09:30 – 23:00',
          telefono:         '', // pendiente cliente
          instagram:        'https://www.instagram.com/kronnoswoman/',
          instagramHandle:  '@kronnoswoman',
          googleReviewUrl:  '', // pendiente cliente
          colorAccent:      '#ec4899', // magenta Woman
          heroBgUrl:        '/kronnos/kronoswoman.png',
          logo:             '/kronnos/woman.jpg',
          pageTitle:        'Kronnos Woman | Agenda tu hora',
          categoriasServicio: ['Manicura', 'Masajes', 'Maquillaje', 'Pestañas', 'Cabello', 'Otro'],
          barberos: [
            { nombre: 'Kelly',   foto: null, disponible: true },
            { nombre: 'Ernesto', foto: null, disponible: true },
            { nombre: 'Heydee',  foto: null, disponible: true },
          ],
          partners: [],
        },
      ],
    },

    // ── LEGACY: 3 tenants Kronnos separados — en migración a `kronnos` (Camino 1) ──
    // Se eliminarán en D4-D5 tras cutover de UI y datos. Middleware aún los usa para SEO por sede.
    // Ver project_kronnos.md en memoria para plan completo de migración.

    // ── KRONNOS STUDIO PEÑABLANCA — barbería + estilismo unisex (Villa Alemana) ──
    // Acceso: ?local=kronnos_penablanca  o  kronnospenablanca.synaptechspa.cl
    kronnos_penablanca: {
      categoriasServicio: ['PACKS KRONNOS', 'Servicios Masculinos', 'Servicios Femeninos', 'Manicure', 'Otro'],
      nombre:          'Kronnos Studio Peñablanca',
      nombreCorto:     'Kronnos',
      pageTitle:       'Kronnos Studio Peñablanca | Agenda tu hora',
      bodyBg:          '#0a0a0a',
      headerSub:       'STUDIO',
      heroLine1:       'Donde ambos<br>mundos',
      heroLine2:       'convergen.',
      watermark:       'K',
      slogan:          'Un espacio unisex donde ambos mundos convergen',
      sobreNosotros:   'Kronnos Studio es un espacio unisex en donde ambos mundos convergen en manos de profesionales estilistas y barberos con más de 12 años de experiencia.',
      logo:            '/kronnos/studio.jpg',
      direccion:       '📍 Av. Vicepresidente Bernardo Leighton 20, local 13 · Villa Alemana',
      horario:         '🕒 Lun a Sáb · 10:30 – 19:00',
      telefono:        '56982504870',
      club:            'Club Kronnos',
      instagram:       '',
      instagramHandle: '',
      waEmoji:         '✂️',
      googleReviewUrl: 'https://search.google.com/local/writereview?placeid=ChIJV4oFY8XXiZYRqUPwb1wNDwU',
      ratingGeneral:   4.3,     // real Google (7 opiniones al 2026-07-09)
      totalReviews:    7,
      reviews:         [],
      barberos: [
        { nombre: 'Martin',           foto: null, disponible: true },
        { nombre: 'Evelyn Contreras', foto: null, disponible: true },
        { nombre: 'Araceli',          foto: null, disponible: true },
      ],
      partners: [
        { name: 'Viking Brand', role: 'Embajador oficial',
          logo: '/kronnos/viking.jpg',
          instagram: 'https://www.instagram.com/vikingbrand.chile/' },
      ],
    },
    // ── KRONNOS STUDIO LIMACHE — barbería + estilismo unisex (Limache) ──
    kronnos_limache: {
      categoriasServicio: ['PACKS KRONNOS', 'Servicios Masculinos', 'Servicios Femeninos', 'Manicure', 'Otro'],
      nombre:          'Kronnos Studio Limache',
      nombreCorto:     'Kronnos',
      pageTitle:       'Kronnos Studio Limache | Agenda tu hora',
      bodyBg:          '#0a0a0a',
      headerSub:       'STUDIO',
      heroLine1:       'Donde ambos<br>mundos',
      heroLine2:       'convergen.',
      watermark:       'K',
      slogan:          'Un espacio unisex donde ambos mundos convergen',
      sobreNosotros:   'Kronnos Studio es un espacio unisex en donde ambos mundos convergen en manos de profesionales estilistas y barberos con más de 12 años de experiencia.',
      logo:            '/kronnos/studio.jpg',
      direccion:       '📍 Paseo Las Araucarias 405, local 5 · Limache',
      horario:         '🕒 Lun a Sáb · 10:30 – 19:00',
      telefono:        '56920241041',
      club:            'Club Kronnos',
      instagram:       '',
      instagramHandle: '',
      waEmoji:         '✂️',
      googleReviewUrl: '',
      ratingGeneral:   0,       // sin reseñas Google (aun no aparece en Google Business)
      totalReviews:    0,
      reviews:         [],
      barberos: [
        { nombre: 'Evelyn Contreras', foto: null, disponible: true },
        { nombre: 'Claudio',          foto: null, disponible: true },
        { nombre: 'Cristian Orostica', foto: null, disponible: true },
        { nombre: 'Orlando Palacios',  foto: null, disponible: true },
        { nombre: 'Víctor',            foto: null, disponible: true },
      ],
      partners: [
        { name: 'Viking Brand', role: 'Embajador oficial',
          logo: '/kronnos/viking.jpg',
          instagram: 'https://www.instagram.com/vikingbrand.chile/' },
      ],
    },
    // ── KRONNOS WOMAN — belleza y estética femenina (Limache) ──
    kronnos_woman: {
      categoriasServicio: ['Manicura', 'Masajes', 'Maquillaje', 'Pestañas', 'Cabello', 'Otro'],
      nombre:          'Kronnos Woman',
      nombreCorto:     'Kronnos Woman',
      pageTitle:       'Kronnos Woman | Agenda tu hora',
      bodyBg:          '#0a0a0a',
      headerSub:       'BELLEZA & ESTÉTICA',
      heroLine1:       'Belleza y',
      heroLine2:       'estilo.',
      watermark:       'K',
      slogan:          'Belleza y estilo en un solo lugar',
      sobreNosotros:   'Kronnos Woman es un espacio de belleza y estética en donde profesionales estilistas dan vida a tu mejor versión, con más de 12 años de experiencia.',
      logo:            '/kronnos/woman.jpg',
      direccion:       '📍 Palmira Romano Sur 405, local 3 · Limache',
      horario:         '🕒 Lun a Dom · 09:30 – 23:00',
      telefono:        '',
      club:            'Club Kronnos Woman',
      instagram:       '',
      instagramHandle: '',
      waEmoji:         '💅',
      googleReviewUrl: '',
      ratingGeneral:   0,       // sin reseñas Google (aun no en Google Business)
      totalReviews:    0,
      reviews:         [],
      barberos: [
        { nombre: 'Kelly',  foto: null, disponible: true },
        { nombre: 'Ernesto', foto: null, disponible: true },
        { nombre: 'Heydee', foto: null, disponible: true },
      ],
    },
    elegance: {
      categoriasServicio: ['Cortes', 'Barba', 'Combos', 'Extras', 'Otro'],
      nombre:          '𝐄𝐥𝐞𝐠𝐚𝐧𝐜𝐞 𝐛𝐚𝐫𝐛𝐞𝐫𝐬𝐡𝐨𝐩',
      nombreCorto:     'Elegance',
      slogan:          'No es un corte, es elegancia que te mereces',
      logo:            '/logo.jpg',
      direccion:       '📍 Ecuador 243 | Viña del Mar',
      horario:         '🕒 Lunes-Sáb: 10-20h | Dom: 12-20h. ¡Reserva ya!',
      telefono:        '+56947999370',
      club:            'Club Elegance',
      instagram:       'https://www.instagram.com/elegance.cl_/',
      instagramHandle: '@elegance.cl_',
      waEmoji:         '✂️',
      googleReviewUrl: '',
      ratingGeneral: 0,
      totalReviews:  0,
      reviews:       [],
      barberos: [
        { nombre: 'Nicolas Fabian', foto: 'Fabian.png', disponible: true },
      ],
    },
    ferraza: {
      categoriasServicio: ['Cortes', 'Barba', 'Combos', 'Extras', 'Otro'],
      nombre:          'Barbería Ferraza',
      nombreCorto:     'Ferraza',
      pageTitle:       'Barbería Ferraza | El cambio comienza por ti',
      bodyBg:          '#000000',
      slogan:          'El cambio comienza por ti',
      logo:            '/local1.jpg',
      direccion:       '📍 Av. Libertad 63 / Local 28',
      horario:         '🕒 Lun a Sáb: 10:00 – 20:00 hrs.',
      telefono:        '56994269228',
      club:            'Club Ferraza',
      heroLine1:       false,
      heroLine2:       'El cambio comienza por ti.',
      watermark:       'F',
      instagram:       '',
      instagramHandle: '',
      waEmoji:         '✂️',
      googleReviewUrl: 'https://search.google.com/local/writereview?placeid=ChIJS67hFAzdiZYRP85Wk_nR93w',
      ratingGeneral: 4.8,
      totalReviews:  46,
      reviews: [
        { author: 'Iván Klemencic',      rating: 5, text: 'Excelente atención. Quien atiende demuestra profesionalismo en lo que hace, lo recomiendo totalmente. Además, está la posibilidad de agendar para el mismo día.' },
        { author: 'Juan P. Mesa',         rating: 5, text: 'Primero que todo, excelente servicio. Un lugar muy grato, limpio y muy buena disposición de Nicolás. Me atendieron al tiro, excelente corte de cabello, todo bien. Recomendable 100%.' },
        { author: 'Nicolas Pardo',        rating: 5, text: 'Excelente servicio por parte de Nico, lugar con un muy buen ambiente y atención. Para relajarse un rato. Recomendado!' },
      ],
      barberos: [
        { nombre: 'Nicolas Fabian', foto: 'Fabian.png', disponible: true },
      ],
    },
    gitana: {
      categoriasServicio: ['Uñas', 'Pestañas', 'Cejas', 'Combos', 'Otro'],
      nombre:          'Gitana Nails Studio',
      nombreCorto:     'Gitana',
      slogan:          'Estudio de Uñas y Pestañas',
      logo:            '/gitana.png',
      direccion:       '📍 Las Encinas 1390 local 18 | Concón',
      horario:         'Estudio de uñas y pestañas en Concón | Atención con hora previa',
      telefono:        '56997023355',
      club:            'Club Gitana',
      headerSub:       'NAILS & STUDIO',
      heroLine1:       'No son solo uñas.<br>Es arte.',
      heroLine2:       'Tu momento de brillar.',
      watermark:       'G',
      instagram:       'https://www.instagram.com/gitana.nails.studio',
      instagramHandle: '@gitana.nails.studio',
      waEmoji:         '💅',
      googleReviewUrl: '',
      ratingGeneral: 0,
      totalReviews:  0,
      reviews:       [],
      barberos: [
        { nombre: 'Sabina', foto: null, disponible: true },
        { nombre: 'Clau',   foto: null, disponible: true },
        { nombre: 'Cony',   foto: null, disponible: true },
        { nombre: 'Gigi',   foto: null, disponible: true },
      ],
    },
    chameleon: {
      categoriasServicio: ['Ritual del Cabello', 'Ritual de la Barba', 'Diseño de Cejas', 'Otros'],
      nombre:          'Chameleon Barber Studio',
      nombreCorto:     'Chameleon',
      pageTitle:       'Chameleon Barber Studio | Agenda tu hora',
      slogan:          'Clásico y moderno, perfecto para tí!',
      logo:            '/local3.jpg',
      direccion:       '📍 Av. Libertad 868 | Viña del Mar',
      horario:         '🕒 Lun a Sáb: 10:30 – 20:00 hrs.',
      telefono:        '56928186861',
      club:            'Club Chameleon',
      headerSub:       'BARBER STUDIO',
      heroLine1:       false,
      heroLine2:       'Clásico y moderno, perfecto para tí!',
      watermark:       'C',
      instagram:       'https://www.instagram.com/chameleon.barberstudio/',
      instagramHandle: '@chameleon.barberstudio',
      waEmoji:         '✂️',
      ratingGeneral: 5.0,
      totalReviews:  226,
      reviews: [
        { author: 'Carlos Andrés Yáñez', rating: 5, text: 'Excelente servicio! Vengo de Santiago y confié en esta barbería para cortarme el pelo más barba, el barbero supo cortarme tal cual lo solicitado. Muy profesional!' },
        { author: 'Cristian Veas',        rating: 5, text: 'Profesionales del corte de pelo y barba. Amables y buena onda, con tema de conversación, ambiente muy agradable y precio acorde al resultado. 5/5' },
        { author: 'Jorge Miranda',         rating: 5, text: 'Me atendí con Omar, un crack, muy amable y gentil al usar las tijeras, creo que es lo que más destacaría, primera vez que voy, y volvería a ir.' },
      ],
      googleReviewUrl: 'https://search.google.com/local/writereview?placeid=ChIJkWF0fDDdiZYRAnOAcRUjWn4',
      features: {
        hasCourses: true,
        courses: {
          title:       'Cursos de Barbería',
          description: 'Aprende con los mejores. Formamos a los próximos profesionales del arte de la barbería con técnicas clásicas y modernas, desde cero hasta nivel avanzado.',
          ctaMsg:      'Hola Chameleon! Quiero información sobre los cursos de barbería 🎓',
        },
        hasChairRental: true,
        chairRental: {
          title:       'Arriendo de Sillones',
          description: 'Únete a nuestro equipo. Alquila tu espacio en nuestro studio y trabaja con total autonomía en un ambiente profesional y bien equipado.',
          ctaMsg:      'Hola Chameleon! Me interesa el arriendo de un sillón en el studio ✂️',
        },
      },
      barberos: [
        { nombre: 'Omar Peñafiel',  foto: null, disponible: true },
        { nombre: 'Juan Vásquez',   foto: null, disponible: true },
        { nombre: 'David Figueredo',foto: null, disponible: true },
      ],
    },
    lumen: {
      categoriasServicio: ['Cortes', 'Barba', 'Combos', 'Extras', 'Otros'],
      nombre:          "D'Jones Barber",
      nombreCorto:     "D'Jones",
      pageTitle:       "D'Jones Barber | Estilo y tradición",
      slogan:          'Estilo y tradición',
      logo:            '/djones.png',
      direccion:       '📍 Villanelo 279 | Viña del Mar',
      horario:         '🕒 Lun a Sáb: 10:00 – 20:15 hrs | Dom: 09:00 – 20:00 hrs',
      telefono:        '56929808223',
      club:            "Club D'Jones",
      heroLine1:       'Estilo &',
      heroLine2:       'tradición.',
      watermark:       'D',
      instagram:       'https://www.instagram.com/d.jonesbarberia/',
      instagramHandle: '@d.jonesbarberia',
      waEmoji:         '⚓',
      googleReviewUrl: 'https://search.google.com/local/writereview?placeid=ChIJL9JDMXTfiZYRpFpAh8skNWs',
      ratingGeneral: 4.98,
      totalReviews:  64,
      reviews: [
        { author: 'Pablo', rating: 5, text: 'Excelente como siempre buen ambiente ' },
        { author: 'Abel', rating: 5, text: 'Siempre cuando voy és un excelente servicio. Recomendado totalmente. Excelentes trabajadores' },
      ],
      barberos: [
        { nombre: 'Brayan Soto', foto: 'https://dcx13p9dsx90t.cloudfront.net/uploads/attachment_images/250141/attachment_870cf32e763eb130.png', disponible: true },
        { nombre: 'Valeria Narvaez', foto: 'https://dcx13p9dsx90t.cloudfront.net/uploads/attachment_images/278445/attachment_c1a02d21144da9f9.png', disponible: true },
        { nombre: 'Jorge Espinosa', foto: null, disponible: true },
      ],
    },
    deluxeperfumes: {
      categoriasServicio: ['Perfumes', 'Sets', 'Miniaturas', 'Accesorios', 'Otro'],
      nombre:          'Deluxe Perfumes',
      nombreCorto:     'Deluxe',
      pageTitle:       'Deluxe Perfumes | Tu fragancia perfecta',
      slogan:          'Tu fragancia perfecta',
      logo:            '/logo5.jpg',
      logo2:           '/logo5.jpg',
      direccion:       '📍 1/2 Oriente 831, Oficina 601, Viña del Mar',
      horario:         '🚚 Delivery en Viña, Valparaíso y Con-Con.',
      telefono:        '',
      club:            'Club Deluxe',
      instagram:       '',
      instagramHandle: '',
      waEmoji:         '🌸',
      googleReviewUrl: '',
      ratingGeneral: 0,
      totalReviews:  0,
      reviews:       [],
      barberos:        [],
    },
    delnero: {
      categoriasServicio: ['Cortes', 'Barba', 'Combos', 'Extras', 'Otro'],
      nombre:          'Del Nero Barber',
      nombreCorto:     'Del Nero',
      pageTitle:       'Del Nero Barber | Agenda tu hora',
      slogan:          'Estilo que define. Arte que trasciende.',
      logo:            '/nero.jpg',
      direccion:       '📍 Curauma / Placilla',
      horario:         '🕒 Lun a Sáb: 10:00 – 20:00 hrs.',
      telefono:        '',
      club:            'Club Del Nero',
      headerSub:       'BARBER',
      heroLine1:       'Arte &',
      heroLine2:       'Distinción.',
      watermark:       'N',
      instagram:       '',
      instagramHandle: '',
      waEmoji:         '✂️',
      googleReviewUrl: 'https://search.google.com/local/writereview?placeid=ChIJV8m8wKXdiZYRnf2oliYG2Wo',
      ratingGeneral: 0,
      totalReviews:  0,
      reviews:       [],
      barberos: [],
    },
    marcelo_hairdressing: {
      categoriasServicio: ['Cortes', 'Barba', 'Combos', 'Extras', 'Otro'],
      nombre:          'Marcelo Palma',
      nombreCorto:     'Marcelo',
      pageTitle:       'Marcelo Palma | Agenda tu hora',
      slogan:          'Hairdressing & Estilo',
      logo:            '/marcelo1.png',
      direccion:       '📍 Curauma / Placilla',
      horario:         '🕒 Lun a Sáb: 10:00 – 20:00 hrs.',
      telefono:        '',
      club:            'Club Marcelo',
      heroLine1:       false,
      heroLine2:       'Tu imagen,<br>en las mejores manos.',
      pwaIcon:         '/marcelo1.png',
      instagram:       '',
      instagramHandle: '',
      waEmoji:         '✂️',
      googleReviewUrl: '',
      ratingGeneral: 0,
      totalReviews:  0,
      reviews:       [],
      barberos: [],
    },
    mapubarbershop: {
      categoriasServicio: ['Cortes', 'Barba', 'Combos', 'Extras', 'Otro'],
      nombre:          'Mapu Barber Shop',
      nombreCorto:     'Mapu',
      pageTitle:       'Mapu Barber Shop | Vive la Experiencia',
      slogan:          'Vive la Experiencia',
      sobreNosotros:   'Fundada en 2017 en Valparaíso, Mapu Barber nació de la pasión por el oficio y la convicción de que una barbería puede ser mucho más que un espacio de corte. Hoy, con dos sucursales en la región, somos un referente de la barbería clásica en Chile.<br><br>Cada barbero que forma parte de nuestro equipo comparte los mismos valores: precisión, respeto por el cliente y amor por el oficio. A través de la Academia Mapu Barber, hemos egresado más de 24 generaciones de barberos que hoy ejercen su profesión con orgullo en todo Chile.',
      logo:            '/mapu2.png',
      logo2:           '/mapu2.png',
      direccion:       '',
      horario:         '',
      telefono:        '',
      club:            'Club Mapu',
      heroLine1:       'Vive<br>la Experiencia.',
      heroLine2:       false,
      watermark:       'M',
      instagram:       '',
      instagramHandle: '',
      waEmoji:         '✂️',
      googleReviewUrl: 'https://search.google.com/local/writereview?placeid=ChIJr877gzibCoQRIBXW76VfBV4',
      ratingGeneral: 4.8,
      totalReviews:  72,
      reviews: [
        { author: 'Tomás E.',   rating: 5, text: 'Dos sucursales y en ambas el nivel es excelente. Mi favorito en Valparaíso y Viña del Mar.' },
        { author: 'Ignacio F.', rating: 5, text: 'El corte perfecto y el ambiente de barbería que te hace volver. Siempre satisfecho.' },
        { author: 'Andrés C.',  rating: 5, text: 'Profesionalismo total. Me dejaron exactamente el estilo que quería. Barbaros todos.' },
      ],
      sucursales: [
        {
          id:        'valparaiso',
          nombre:    'Mapu Barber Shop Valparaíso',
          calle:     'Blanco 974 Local 01',
          ciudad:    'Valparaíso',
          mapsUrl:   'https://maps.google.com/?q=Blanco+974+Local+01+Valparaíso+Chile',
        },
        {
          id:        'vinadelmar',
          nombre:    'Mapu Barber Shop Viña del Mar',
          calle:     '1 Oriente 876 Casi esq. 10 Norte',
          ciudad:    'Viña del Mar',
          mapsUrl:   'https://maps.google.com/?q=1+Oriente+876+Viña+del+Mar+Chile',
        },
      ],
      barberos: [
        // ── Ambas sucursales ────────────────────────────────────────
        { id: 'luka-araya',          nombre: 'Luka Araya',          foto: null, disponible: true },
        { id: 'ivi-soto',            nombre: 'Ivi Soto',            foto: null, disponible: true },
        { id: 'felipe-vergara',      nombre: 'Felipe Vergara',      foto: null, disponible: true },
        { id: 'lucia-fuentes',       nombre: 'Lucia Fuentes',       foto: null, disponible: true },
        { id: 'santiago-echeverria', nombre: 'Santiago Echeverria', foto: null, disponible: true },
        { id: 'jonathan-chamorro',   nombre: 'Jonathan Chamorro',   foto: null, disponible: true },
        // ── Solo Valparaíso ─────────────────────────────────────────
        { id: 'fernanda-soudre',     nombre: 'Fernanda Soudre',     foto: null, disponible: true, sucursalId: 'valparaiso'  },
        // ── Solo Viña del Mar ───────────────────────────────────────
        { id: 'renato-perez',        nombre: 'Renato Perez',        foto: null, disponible: true, sucursalId: 'vinadelmar'  },
        { id: 'daniela-ramirez',     nombre: 'Daniela Ramirez',     foto: null, disponible: true, sucursalId: 'vinadelmar'  },
        { id: 'ian-alcalde',         nombre: 'Ian Alcalde',         foto: null, disponible: true, sucursalId: 'vinadelmar'  },
        { id: 'gabriel-apablaza',    nombre: 'Gabriel Apablaza',    foto: null, disponible: true, sucursalId: 'vinadelmar'  },
      ],
    },
    aura: {
      categoriasServicio: ['Cortes de Cabello', 'Barba', 'Packs', 'Tratamientos', 'Suscripciones Mensuales', 'Experiencias Premium'],
      nombre:          'AURA SALÓN & MALE GROOMING',
      nombreCorto:     'AURA',
      pageTitle:       'AURA SALÓN | Agenda tu hora',
      slogan:          'Eleva Tu Aura',
      sobreNosotros:   '✨ AURA SALÓN & MALE GROOMING ✂️<br><br>Más que una barbería, somos un espacio creado para el cuidado, el estilo y la experiencia masculina moderna. En AURA combinamos técnica, diseño y detalles para ofrecerte un servicio integral: cortes clásicos y contemporáneos, perfilado de barba, tratamientos capilares y una atención pensada para tu bienestar.<br><br>Cada visita es una pausa en la rutina, un momento para verte y sentirte mejor.<br><br>💈 Estilo, precisión y personalidad — eso es AURA.',
      logo:            '/aura.png',
      direccion:       '📍 2 Oriente 124, Local 3 | Viña del Mar',
      horario:         '🕒 Lun-Sáb: 10-20h. ¡Reserva tu hora!',
      telefono:        '+56966153086',
      club:            'Club AURA',
      heroLine1:       'Eleva Tu',
      heroLine2:       'Aura',
      headerInlineText: 'AURA SALÓN & MALE GROOMING',
      instagram:       'https://www.instagram.com/aura.salon.cl',
      instagramHandle: '@aura.salon.cl',
      waEmoji:         '✂️',
      googleReviewUrl: 'https://search.google.com/local/writereview?placeid=ChIJsdBD2IvdiZYRHD2H33TBDmM',
      ratingGeneral: 5.0,
      totalReviews:  43,
      reviews: [
        { author: 'Rafael Contador',    rating: 5, text: 'Tremenda experiencia! Fui por un corte de pelo y a arreglarme la barba y quedé más que satisfecho. Chiky Barber me entendió perfectamente lo que quería y fue muy detallista. El ambiente es muy agradable y el servicio impecable. Definitivamente volveré y lo recomiendo al 100%.' },
        { author: 'Luciano Bravo',      rating: 5, text: 'Excelente experiencia y maravilloso servicio, pasar el rato con un cafecito y cortarse el pelo deja un Aura semanal 🔥' },
        { author: 'Ignacio Ibaceta',    rating: 5, text: 'Súper buena atención! Servicio completo y perfecto para ir a relajarse, hasta un café ofrecieron al momento de atenderme!' },
      ],
      barberos: [],
    },
    latincaribe: {
      categoriasServicio: ['Cortes Premium', 'Cejas Premium', 'Barbas Premium', 'Diseños Freestyle', 'Platinados'],
      nombre:          'The Latin Caribe',
      nombreCorto:     'TheLatinCaribe',
      pageTitle:       'The Latin Caribe | Agenda tu hora',
      slogan:          'Eleva Tu Estilo',
      sobreNosotros:   'Agenda con nosotros virtualmente y reserva tu cita para cualquiera de nuestros servicios.<br><br>Somos una excelente barbería ubicada en las adyacencias del centro de la ciudad, una buena opción, buen espacio y sobre todo un buen servicio, dejando una experiencia grata y reconfortante.',
      logo:            '/thelatin/latin.png',
      direccion:       '📍 Viña del Mar',
      horario:         '🕒 Lun-Sáb: 10-20h. ¡Reserva tu hora!',
      telefono:        '',
      club:            'Club The Latin Caribe',
      heroLine1:       'Más que<br>un corte.',
      heroLine2:       'Una experiencia.',
      instagram:       '',
      instagramHandle: '',
      waEmoji:         '✂️',
      googleReviewUrl: 'https://search.google.com/local/writereview?placeid=ChIJUbDnXQAFmJYRjOOYtUXkHgU',
      ratingGeneral:   0,
      totalReviews:    0,
      reviews:         [],
      barberos:        [],
      // Registro obligatorio: oculta CTA "Continuar con mi reserva" en
      // registro.html y muestra banner de club-only. Flag genérica —
      // otros tenants pueden activarla igual.
      requireClubRegistration: true,
    },
    machos: {
      categoriasServicio: ['Cortes', 'Barba', 'Combos', 'Extras', 'Otros'],
      nombre:          "Macho´s Barbershop",
      nombreCorto:     "Macho's",
      pageTitle:       "Macho´s Barbershop | Calidad y Asesoría Profesional",
      slogan:          'En Barbería Machos ofrecemos servicios de calidad y contamos con profesionales de primer nivel.',
      logo:            '/machos.png',
      direccion:       '📍 4 Norte 477 local 5 | Viña del Mar',
      horario:         '🕒 Lun a Sáb: 10:00 – 20:00 hrs | Dom y Feriados: 11:00 – 17:00 hrs',
      telefono:        '56978390422',
      club:            'Club Machos',
      instagram:       'https://www.instagram.com/machos_barbershop.cl/',
      instagramHandle: '@machos_barbershop.cl',
      waEmoji:         '💈',
      googleReviewUrl: '',
      ratingGeneral: 4.9,
      totalReviews:  32,
      reviews: [
        { author: 'Cristian E.', rating: 5, text: 'Excelente atención de los muchachos, profesionalismo en cada corte.' },
        { author: 'Matías O.', rating: 5, text: 'Buen ambiente, limpio, acogedor y el corte impecable. Recomiendo totalmente.' },
        { author: 'Gonzalo F.', rating: 5, text: 'Un agrado atenderse aquí. Muy cuidadosos con el rebaje de barba y toallas calientes.' },
      ],
      barberos: [
        { nombre: 'Álvaro Muñoz', foto: null, disponible: true },
        { nombre: 'Carlos Rivas', foto: null, disponible: true },
        { nombre: 'Sebastián Jara', foto: null, disponible: true },
      ],
    },
    infinity: {
      categoriasServicio: ['Cortes', 'Barba', 'Combos', 'Color', 'Facial', 'Extras'],
      nombre:          'INFINITY STUDIO',
      nombreCorto:     'Infinity',
      pageTitle:       'INFINITY STUDIO | Estilo y Confianza en Viña del Mar',
      slogan:          'Ambiente familiar y confianza son nuestra esencia. Resultados de alto nivel.',
      logo:            '/infinity.png',
      direccion:       '📍 Traslaviña 114 | Viña del Mar',
      horario:         '🕒 Lun a Sáb: 10:00 – 20:00 hrs.',
      telefono:        '56985551234',
      club:            'Comunidad Infinity',
      headerSub:       'STUDIO',
      heroLine1:       'Estilo &',
      heroLine2:       'Confianza.',
      watermark:       '∞',
      instagram:       'https://www.instagram.com/infinitystudio23/',
      instagramHandle: '@infinitystudio23',
      waEmoji:         '💈',
      googleReviewUrl: 'https://search.google.com/local/writereview?placeid=ChIJVbUumMXfiZYRKSsYpEMTN00',
      ratingGeneral: 5.0,
      totalReviews:  135,
      // Fallback estatico si Firestore no responde. En vivo, el doc
      // tenants/infinity/settings/googleReviews trae los valores reales
      // vía Cloud Function googleReviewsSyncScheduled (Places API New).
      reviews: [
        { author: 'Nicolas Quiñones',       rating: 5, text: 'Excelentes barberos, hacen los mejores fade que he visto. Profesionales, simpáticos y confiables. Destacar su precio accesible y el buen ambiente.' },
        { author: 'Enrique Alfaro',         rating: 5, text: 'Como siempre buena experiencia en la barbería, me atendieron muy bien y en grato ambiente. Gracias Elio por la atención y disposición.' },
        { author: 'Victor De la rosa Alviña', rating: 5, text: 'Excelente servicio. Cortan muy bien y no solo es corte, si no que te brindan una muy buena experiencia.' },
        { author: 'Pablo Salas',            rating: 5, text: 'Excelente, me atendió Miguel, muy amable y profesional. Me dejó tal como yo quería y el local está bien ubicado.' },
        { author: 'Julio Opazo',            rating: 5, text: 'Totalmente recomendado, un descubrimiento en Viña. La atención muy amable, el ambiente es muy acogedor y el lugar está impecable.' },
      ],
      barberos: [
        { nombre: 'Miguel Martínez', foto: null, disponible: true },
        { nombre: 'Elio Alfonso', foto: null, disponible: true },
        { nombre: 'Jose Luis Cordero', foto: null, disponible: true },
        { nombre: 'Mailo Serrano', foto: null, disponible: true },
      ],
    },
    omegastudio: {
      categoriasServicio: ['Cortes', 'Barba', 'Combos', 'Facial', 'Color', 'Otros'],
      nombre:          'OMEGA STUDIO',
      nombreCorto:     'Omega',
      pageTitle:       'Omega Studio | Agenda tu hora',
      slogan:          'ESTUDIO ATENDIDO POR PROFESIONALES',
      logo:            '/omega.jpg',
      direccion:       '📍 Av. Valparaíso 595, Local 53, 2do Piso | Viña del Mar',
      horario:         '🕒 Lunes a Sábado · Agenda tu hora',
      telefono:        '56972302811',
      club:            'Club Omega',
      headerSub:       'STUDIO',
      heroLine1:       'La puntualidad<br>es nuestro',
      heroLine2:       'estilo.',
      watermark:       'Ω',
      instagram:       'https://www.instagram.com/omegastudio.cl/',
      instagramHandle: '@omegastudio.cl',
      waEmoji:         '✂️',
      googleReviewUrl: '',
      ratingGeneral:   0,
      totalReviews:    0,
      reviews:         [],
      barberos: [
        { nombre: 'Julián Beltrán',  foto: null, disponible: true },
        { nombre: 'Antonio Morales', foto: null, disponible: true },
        { nombre: 'Thomas Castillo', foto: null, disponible: true },
      ],
    },
    alfamen: {
      categoriasServicio: ['Cortes', 'Barba', 'Combos', 'Color', 'Extras'],
      nombre:          'Barbería Alfa Men',
      nombreCorto:     'Alfa Men',
      pageTitle:       'Barbería Alfa Men | Agenda tu hora',
      slogan:          'Since 2017 · Aesthetics For Men',
      logo:            '/alfamen.jpg',
      direccion:       '📍 Av. Valparaíso #694 L. 14 | Viña del Mar',
      horario:         '🕒 Lun–Vie: 10:00–20:00 · Sáb: 10:00–18:00',
      telefono:        '',
      club:            'Club Alfa Men',
      instagram:       'https://www.instagram.com/barberia_alfa/',
      instagramHandle: '@barberia_alfa',
      waEmoji:         '💈',
      googleReviewUrl: '',
      ratingGeneral:   0,
      totalReviews:    0,
      reviews:         [],
      barberos: [
        { nombre: 'Profesional 1', foto: null, disponible: true },
        { nombre: 'Profesional 2', foto: null, disponible: true },
        { nombre: 'Profesional 3', foto: null, disponible: true },
      ],
    },
    memphis: {
      categoriasServicio: ['Cortes', 'Barba', 'Combos', 'Facial', 'Color', 'Uñas', 'Estilismo', 'Tratamientos'],
      nombre:          'Memphis Salón',
      nombreCorto:     'Memphis',
      pageTitle:       'Memphis Salón | Agenda tu hora',
      slogan:          'Estilo y profesionalismo en Viña del Mar',
      logo:            '/memphis.jpg',
      direccion:       '📍 Viña del Mar',
      horario:         '🕒 Lunes a Sábado · Agenda tu hora',
      telefono:        '',
      club:            'Club Memphis',
      instagram:       'https://www.instagram.com/memphissalon',
      instagramHandle: '@memphissalon',
      waEmoji:         '✂️',
      googleReviewUrl: '',
      ratingGeneral:   0,
      totalReviews:    0,
      reviews:         [],
      barberos: [
        { nombre: 'Profesional 1', foto: null, disponible: true },
        { nombre: 'Profesional 2', foto: null, disponible: true },
        { nombre: 'Profesional 3', foto: null, disponible: true },
      ],
    },
    // ── STUDIO DIECISÉIS — (clave interna sionbarberia, reusada) ──
    // Tema Premium Dark · Monocromático (B&N) — CSS en index.html → .tenant-sionbarberia.
    // ⚠️ Pendiente del cliente: fotos de profesionales, URL reseñas Google.
    sionbarberia: {
      categoriasServicio: ['Cabello', 'Barba', 'Tratamiento Facial', 'Pack Servicios', 'Color'],
      nombre:          'Studio Dieciséis',
      nombreCorto:     'Dieciséis',
      pageTitle:       'Studio Dieciséis | Barbería premium en Valparaíso',
      bodyBg:          '#0a0a0a',
      slogan:          'Cuidado personal que combina estilo y calidad.',
      sobreNosotros:   'En Studio Dieciséis, ubicado en el corazón de Valparaíso, ofrecemos una experiencia de cuidado personal que combina estilo y calidad. Nos especializamos en cortes de cabello que incluyen el arreglo de cejas, así como en servicios premium que integran detallados retoques de barba para quienes buscan un look impecable. Además, nuestro equipo experto se dedica al cuidado de uñas, garantizando un acabado elegante y duradero.<br><br>Visítanos y descubre un studio privado con un ambiente grato y familiar donde puedes conectar contigo mismo y recibir la atención que te mereces.',
      logo:            '/dieciseis/logo.png',
      banner:          '/dieciseis/banner16.webp',
      infoBtnLabel:    'Portafolio',
      galeria:         [],
      direccion:       '📍 Condell 1525, Piso 5, Local 43 · Galería Beye, Valparaíso',
      horario:         '🕒 Lun a Sáb: 09:00 – 21:00 · Dom cerrado',
      telefono:        '56937179177',
      club:            'Club Dieciséis',
      heroLine1:       'Estilo &',
      heroLine2:       'Calidad.',
      watermark:       '16',
      instagram:       'https://www.instagram.com/studio.dieciseis_/',
      instagramHandle: '@studio.dieciseis_',
      waEmoji:         '🍃',
      googleReviewUrl: '',
      ratingGeneral: 5.0,
      totalReviews:  2,
      reviews: [
        { author: 'Nicolás',    rating: 5, text: 'Los mejores.' },
        { author: 'Cristopher', rating: 5, text: 'Atención extraordinaria y además de ser súper profesional, súper contento con el trabajo realizado 🙌' },
      ],
      barberos: [
        { nombre: 'Matías Random Barber', foto: null, disponible: true },
        { nombre: 'Atelier Catalan',      foto: null, disponible: true },
      ],
    },
    // ── YŪGEN STUDIO — estudio dark/zen (negro · madera · greige · dorado) ──
    // Acceso: ?local=yugen  o  yugenstudio.synaptechspa.cl
    // ⚠️ Pendiente del cliente: logo, dirección, teléfono, Instagram, servicios+precios.
    yugen: {
      categoriasServicio: ['Barbería', 'Promociones', 'Colorimetría y Tratamientos'],
      nombre:          'Yūgen Studio',
      nombreCorto:     'Yūgen',
      pageTitle:       'Yūgen Studio | Agenda tu hora',
      bodyBg:          '#0b0a09',
      slogan:          'La profundidad que no se explica, se experimenta',
      sobreNosotros:   'Yūgen (幽玄) es un término japonés que habla de una belleza profunda, misteriosa e inefable, que no se puede describir con palabras, pero que se siente.<br><br>Es aquello que va más allá de lo evidente, donde la simplicidad esconde significado y el silencio revela emociones. En Yūgen Studio, cada detalle está diseñado para que vivas esa profundidad.',
      logo:            '/yugen/yugen.jpg',
      direccion:       '',
      horario:         '🕒 Lun–Vie: 08:00–23:00 · Sáb: 08:00–22:00 · Dom: 09:00–21:00 · Colación 14:00–16:00',
      telefono:        '',
      club:            'Club Yūgen',
      headerSub:       'STUDIO',
      heroLine1:       'Yūgen',
      heroLine2:       'Experience',
      watermark:       '幽玄', // sello de marca en la tarjeta de fidelización
      instagram:       '',
      instagramHandle: '',
      waEmoji:         '☯',
      googleReviewUrl: 'https://search.google.com/local/writereview?placeid=ChIJ_y0F1__NiZYRB-Kf-qiCuGg',
      ratingGeneral:   0,
      totalReviews:    0,
      reviews:         [],
      barberos: [
        { nombre: 'Yūgen', foto: null, disponible: true },
      ],
    },
    // ── BARBERS CLUB — Premium Dark re-skin (Ciudad de los Valles, Pudahuel) ──
    // Acceso: ?local=barbersclub  o  barbersclub.synaptechspa.cl
    // Paleta: neutral-900 body · neutral-800 cards · yellow-500 acento · orange-600 CTA.
    barbersclub: {
      categoriasServicio: ['Cortes', 'Combos', 'Barba & Estilo', 'Otros'],
      nombre:          'Barbers Club',
      nombreCorto:     'Barbers Club',
      pageTitle:       'Barbers Club | Agenda tu hora',
      bodyBg:          '#18181b',
      slogan:          'Exclusivo salón ambientado para potenciar tu imagen.',
      sobreNosotros:   'Barbers Club es un salón exclusivo pensado para elevar tu imagen. Ambiente cuidado, profesionales especializados y una experiencia integral de barbería, estilismo y cuidado facial.',
      logo:            '/barbersclub/barber12.jpg',
      banner:          '/barbersclub/hero-bg.png',
      direccion:       '📍 Av. Del Canal 19811, Local 12 · Ciudad de los Valles, Pudahuel · Santiago',
      horario:         '🕒 Lun a Sáb: 10:00 – 20:30 hrs.',
      telefono:        '56981806262',
      club:            'Barbers Club VIP',
      instagram:       'https://www.instagram.com/barbersclub_/',
      instagramHandle: '@barbersclub_',
      waEmoji:         '✂️',
      googleReviewUrl: '',
      ratingGeneral:   0,
      totalReviews:    0,
      reviews:         [],
      darkHeader:      true,
      headerBg:        '#18181b',
      barberos: [
        { nombre: 'Alexander', foto: null, disponible: true },
        { nombre: 'Nicolás',   foto: null, disponible: true },
        { nombre: 'Nicole',    foto: null, disponible: true },
        { nombre: 'Ignacio',   foto: null, disponible: true },
        { nombre: 'Máximo',    foto: null, disponible: true },
      ],
    },
    // ── EL BARBERO MODERNO — Jhoseth Morales · Master Barber (dark + gold) ──
    // Acceso: ?local=elbarberomoderno  o  elbarberomoderno.synaptechspa.cl
    // Reutiliza el tema visual de Chameleon vía _themeAlias.
    elbarberomoderno: {
      categoriasServicio: ['Cortes', 'Barba', 'Combos', 'Otros'],
      nombre:          'El Barbero Moderno',
      nombreCorto:     'El Barbero Moderno',
      pageTitle:       'El Barbero Moderno | Agenda tu hora',
      bodyBg:          '#080808',
      slogan:          'Barbero Profesional con 8 años de experiencia. Tu estilo, a otro nivel.',
      sobreNosotros:   'El Barbero Moderno es el espacio de Jhoseth Morales, Master Barber con 8 años de experiencia. Cortes clásicos y modernos, perfilado y ritual de barba, atención personalizada para llevar tu estilo a otro nivel.',
      logo:            '/elbarberomoderno/logobarb.webp',
      direccion:       '📍 Serrano 73',
      horario:         '🕒 Lun a Sáb: 10:00 – 20:00 hrs.',
      telefono:        '',
      club:            'Club El Barbero Moderno',
      headerSub:       'MASTER BARBER',
      heroLine1:       'El Barbero',
      heroLine2:       'Moderno.',
      watermark:       'BM',
      instagram:       'https://instagram.com/jhbarber.cl/',
      instagramHandle: '@jhbarber.cl',
      waEmoji:         '✂️',
      googleReviewUrl: '',
      ratingGeneral:   0,
      totalReviews:    0,
      reviews:         [],
      darkHeader:      true,
      headerBg:        '#080808',
      // Hero background — foto real de la estación (con overlay oscuro en CSS)
      heroBgUrl:       '/elbarberomoderno/barbero1.png',
      barberos: [
        { nombre: 'Jhoseth Morales', foto: '/elbarberomoderno/barbero2.jpg', disponible: true },
      ],
    },
    // ── STUDIO LUXURY — barbería clásica (dark + dorado/naranja) · Talagante ──
    // Acceso: ?local=estudioluxury  o  estudioluxury.synaptechspa.cl
    // Reutiliza el tema "Premium Dark" de Barbers Club vía _themeAlias.
    // Logo real en /luxury/luxury.jpg. Servicios/precios → seed-estudioluxury.html.
    // ⚠️ Pendiente del cliente: teléfono (WhatsApp), dirección exacta del local,
    //    horario definitivo y nombre(s) del/los barbero(s).
    estudioluxury: {
      categoriasServicio: ['Cortes', 'Barba', 'Combos', 'Facial', 'Color', 'Domicilio', 'Membresía'],
      nombre:          'Studio Luxury',
      nombreCorto:     'Luxury',
      pageTitle:       'Studio Luxury | Barbería · Agenda tu hora',
      bodyBg:          '#0b0a09',
      slogan:          'Estilo y distinción en cada corte.',
      sobreNosotros:   'Barbería Studio Luxury: cortes clásicos y modernos con atención de lujo. Servicio en local y a domicilio en Talagante, Isla de Maipo y El Monte. Consulta por nuestra suscripción mensual (4 cortes) y nuestras promociones.',
      logo:            '/luxury/luxury.jpg',
      banner:          '/luxury/banner.webp',  // foto real de la estación de Matías (hero)
      direccion:       '📍 Talagante · Isla de Maipo · El Monte (local y domicilio)',
      horario:         '🕒 Lun a Sáb · Agenda tu hora',
      telefono:        '56958994297',    // WhatsApp Matías
      club:            'Club Luxury',
      headerSub:       'BARBERÍA',
      heroLine1:       'Estilo &',
      heroLine2:       'Distinción.',
      watermark:       'L',
      instagram:       'https://www.instagram.com/estudio.luxury_/',
      instagramHandle: '@estudio.luxury_',
      waEmoji:         '💈',
      googleReviewUrl: '',
      ratingGeneral:   0,
      totalReviews:    0,
      reviews:         [],
      darkHeader:      true,
      headerBg:        '#0b0a09',
      barberos:        [],               // se provisiona en Firestore (ver seed-estudioluxury.html)
    },
  };

  // ── Tenants self-service ({slug}.synaptechspa.cl, producto masivo) ──
  // El edge middleware resuelve el subdominio contra el doc raíz público
  // tenants/{slug} e inyecta window.__TENANT_CONFIG__ (branding) junto a
  // window.__FORCE_TENANT__. Aquí lo registramos en _tenants para que TODO
  // el pipeline de abajo (SHOP, clases CSS, favicon) funcione sin tocar
  // código por tenant. Usan la plantilla visual neutra (sin CSS tenant-X)
  // + color de acento vía CSS vars (ver más abajo).
  try {
    var _selfCfg = window.__TENANT_CONFIG__;
    if (_selfCfg && _selfCfg.id && !_tenants[_selfCfg.id]) {
      var _selfNombre = _selfCfg.nombre || 'Mi Local';
      var _selfCorto  = _selfCfg.nombreCorto || _selfNombre.split(' ')[0];
      var _selfIgUrl  = _selfCfg.instagram ? ('https://instagram.com/' + _selfCfg.instagram) : '';
      _tenants[_selfCfg.id] = {
        categoriasServicio: ['Cortes', 'Barba', 'Combos', 'Extras', 'Otro'],
        nombre:          _selfNombre,
        nombreCorto:     _selfCorto,
        slogan:          _selfCfg.slogan || 'Reserva tu hora online en segundos',
        logo:            _selfCfg.logoUrl || '/syn-192.png',
        direccion:       _selfCfg.direccion ? ('📍 ' + _selfCfg.direccion) : '',
        horario:         '¡Reserva tu hora online!',
        telefono:        _selfCfg.telefono || '',
        club:            'Club ' + _selfCorto,
        instagram:       _selfIgUrl,
        instagramHandle: _selfCfg.instagram ? ('@' + _selfCfg.instagram) : '',
        waEmoji:         '✂️',
        googleReviewUrl: '',
        ratingGeneral:   0,
        totalReviews:    0,
        reviews:         [],
        accentColor:     _selfCfg.color || null,
        barberos:        [],
      };
    }
  } catch (_) {}

  // Resolver tenant: query param > dominio > sessionStorage > default
  let tenantId = '';
  // Tenant forzado por el edge middleware (bioo.cl/<handle> sirve la bio de un local).
  try { if (window.__FORCE_TENANT__ && _tenants[window.__FORCE_TENANT__]) tenantId = window.__FORCE_TENANT__; } catch (_) {}
  try {
    if (!tenantId) tenantId = new URL(window.location.href).searchParams.get('local') || '';
  } catch (_) {}

  // ── Kronnos: traducir ?local=kronnos&sede=X al tenant legacy correspondiente ──
  // El tenant marca 'kronnos' NO tiene servicios/staff/tema propios (Camino 1.5).
  // Los datos operacionales viven en tenants/kronnos_<sede>/*. Convertimos en
  // memoria para que TODO el sitio publico use el legacy (heredando servicios,
  // barberos, CSS themes, Firestore paths, etc.). El pool marca se sigue
  // usando para fidelizacion via marca-aware redirect en firebaseUtils.js.
  if (tenantId === 'kronnos') {
    try {
      const sedeQ = new URL(window.location.href).searchParams.get('sede');
      const _validSedes = new Set(['penablanca', 'limache', 'woman']);
      if (sedeQ && _validSedes.has(sedeQ) && _tenants['kronnos_' + sedeQ]) {
        tenantId = 'kronnos_' + sedeQ;
      }
    } catch (_) {}
  }

  // Si llega por URL, persistir en sessionStorage para esta pestaña
  if (tenantId && _tenants[tenantId]) {
    try { sessionStorage.setItem('saas_current_tenant', tenantId); } catch (_) {}
  }

  // Fallback: dominio configurado
  if (!tenantId || !_tenants[tenantId]) {
    tenantId = _domainMap[window.location.hostname.toLowerCase()] || '';
  }

  // Fallback: sessionStorage (navegar entre páginas del panel sin perder el tenant)
  if (!tenantId || !_tenants[tenantId]) {
    try { tenantId = sessionStorage.getItem('saas_current_tenant') || ''; } catch (_) {}
  }

  if (!_tenants[tenantId]) tenantId = 'elegance';

  window.CURRENT_TENANT_ID = tenantId;
  window.SHOP = _tenants[tenantId];
  // Lista completa de tenants (la usa el panel de superadmin para no mantener cards a mano).
  try { window.ALL_TENANTS = _tenants; } catch (_) {}

  // ── Color de acento self-service ──────────────────────────────────
  // Los tenants a medida traen su tema en CSS (clases tenant-X). Los
  // self-service no tienen CSS propio: pisamos las vars --neon-* del
  // tema base con el color que eligió el dueño al crear su agenda.
  try {
    var _accSelf = _tenants[tenantId] && _tenants[tenantId].accentColor;
    if (_accSelf && /^#[0-9a-fA-F]{6}$/.test(_accSelf)) {
      var _accR = parseInt(_accSelf.slice(1, 3), 16);
      var _accG = parseInt(_accSelf.slice(3, 5), 16);
      var _accB = parseInt(_accSelf.slice(5, 7), 16);
      var _rootSt = document.documentElement.style;
      _rootSt.setProperty('--neon-clr', _accSelf);
      _rootSt.setProperty('--neon-r', String(_accR));
      _rootSt.setProperty('--neon-g', String(_accG));
      _rootSt.setProperty('--neon-b', String(_accB));
    }
  } catch (_) {}

  // ── Kronnos multi-sede (Camino 1, D2): resuelve sedeId en el sitio público ──
  // Espejo del map en middleware.js y admin-panel/tenantUtils.js.
  const _kronnosSubdomainSede = {
    'kronnospenablanca.synaptechspa.cl': 'penablanca',
    'kronnoslimache.synaptechspa.cl':    'limache',
    'kronnoswoman.synaptechspa.cl':      'woman',
  };
  const _legacyKronnosToSede = {
    kronnos_penablanca: 'penablanca',
    kronnos_limache:    'limache',
    kronnos_woman:      'woman',
  };
  let sedeId = null;
  try {
    const sedeQ = new URL(window.location.href).searchParams.get('sede');
    if (sedeQ) sedeId = sedeQ;
  } catch (_) {}
  if (!sedeId) sedeId = _kronnosSubdomainSede[window.location.hostname.toLowerCase()] || null;
  if (!sedeId) sedeId = _legacyKronnosToSede[tenantId] || null;
  if (sedeId) {
    try { sessionStorage.setItem('saas_current_sede', sedeId); } catch (_) {}
  } else {
    try { sedeId = sessionStorage.getItem('saas_current_sede') || null; } catch (_) {}
  }
  window.CURRENT_SEDE_ID = sedeId;
  // Marca CSS por sede (permite temas en D3): .sede-penablanca / .sede-limache / .sede-woman
  if (sedeId) document.documentElement.classList.add('sede-' + sedeId);

  // ── Marca-tenant (Camino 1.5, D3): pool compartido de fidelización ─────
  // Para tenants Kronnos legacy, los datos marca-level (users, sellos, premios,
  // rangos) viven en tenants/kronnos/* en Firestore, no en tenants/kronnos_<sede>/*.
  // Los datos operacionales (servicios, barberos, citas, settings) siguen per-sede
  // en los tenants legacy. dashboard.html usa MARCA_TENANT_ID para queries marca.
  // Para tenants no-multi-sede, MARCA_TENANT_ID === CURRENT_TENANT_ID (sin efecto).
  window.MARCA_TENANT_ID = _legacyKronnosToSede[tenantId] ? 'kronnos' : tenantId;
  window.isKronnosSede = function (sede) {
    return _legacyKronnosToSede[tenantId] === sede
        || (tenantId === 'kronnos' && sedeId === sede);
  };
  window.isKronnos = function () {
    return !!(_legacyKronnosToSede[tenantId] || tenantId === 'kronnos');
  };

  document.documentElement.classList.add('tenant-' + tenantId);
  if (_themeAlias[tenantId]) {
    document.documentElement.classList.add('tenant-' + _themeAlias[tenantId]);
  }

  var _logoSrc = _tenants[tenantId] && _tenants[tenantId].logo;
  if (_logoSrc) {
    var _favicon = document.querySelector('link[rel="icon"]');
    if (_favicon) _favicon.href = _logoSrc;
    var _touchIcon = document.querySelector('link[rel="apple-touch-icon"]');
    if (_touchIcon) _touchIcon.href = _logoSrc;
  }
})();
