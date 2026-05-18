// config.js — Configuración del negocio (multi-tenant)
// El tenant se resuelve desde ?local= en la URL o desde el dominio.

(function () {
  const _domainMap = {
    'gitananails.synaptechspa.cl':        'gitana',
    'barberiaelegance.synaptechspa.cl':   'elegance',
    'barberiaferraza.synaptechspa.cl':    'ferraza',
    'mapubarbershop.synaptechspa.cl':     'mapubarbershop',
    'chameleonbarber.synaptechspa.cl':    'chameleon',
    'deluxeperfumes.synaptechspa.cl':     'deluxeperfumes',
  };

  const _tenants = {
    elegance: {
      categoriasServicio: ['Cortes', 'Barba', 'Combos', 'Extras', 'Otro'],
      nombre:          '𝐄𝐥𝐞𝐠𝐚𝐧𝐜𝐞 𝐛𝐚𝐫𝐛𝐞𝐫𝐬𝐡𝐨𝐩',
      nombreCorto:     'Elegance',
      slogan:          'No es un corte, es elegancia que te mereces',
      logo:            '/logo.jpg',
      direccion:       '📍 Ecuador 243 | Viña del Mar',
      horario:         '🕒 Lunes-Sáb: 10-20h | Dom: 12-20h. ¡Reserva ya!',
      telefono:        '',
      club:            'Club Elegance',
      instagram:       'https://www.instagram.com/elegance.cl_/',
      instagramHandle: '@elegance.cl_',
      waEmoji:         '✂️',
      googleReviewUrl: '',
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
      instagram:       '',
      instagramHandle: '',
      waEmoji:         '✂️',
      googleReviewUrl: 'https://g.page/r/CT_OVpP50fd8EBM/review',
      barberos: [
        { nombre: 'Nicolas Fabian', foto: 'Fabian.png', disponible: true },
      ],
    },
    gitana: {
      categoriasServicio: ['Uñas', 'Pestañas', 'Cejas', 'Combos', 'Otro'],
      nombre:          'Gitana Nails Studio',
      nombreCorto:     'Gitana',
      slogan:          'Estudio de Uñas y Pestañas',
      logo:            '/local2.jpg',
      direccion:       '📍 Las Encinas 1390 local 18 | Concón',
      horario:         'Estudio de uñas y pestañas en Concón | Atención con hora previa',
      telefono:        '56997023355',
      club:            'Club Gitana',
      instagram:       'https://www.instagram.com/gitana.nails.studio',
      instagramHandle: '@gitana.nails.studio',
      waEmoji:         '💅',
      googleReviewUrl: '',
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
      instagram:       'https://www.instagram.com/chameleon.barberstudio/',
      instagramHandle: '@chameleon.barberstudio',
      waEmoji:         '✂️',
      googleReviewUrl: 'https://www.google.com/maps/place/Chameleon+Barber+Studio/@-33.0128439,-71.5521047,837m/data=!3m1!1e3!4m24!1m15!4m14!1m6!1m2!1s0x9689dd307c746191:0x7e5a231571807302!2sChameleon+Barber+Studio,+2520000+Vi%C3%B1a+del+Mar,+Valpara%C3%ADso!2m2!1d-71.5494108!2d-33.0136638!1m6!1m2!1s0x9689dd307c746191:0x7e5a231571807302!2sChameleon+Barber+Studio,+2520000+Vi%C3%B1a+del+Mar,+Valpara%C3%ADso!2m2!1d-71.5494108!2d-33.0136638!3m7!1s0x9689dd307c746191:0x7e5a231571807302!8m2!3d-33.0136638!4d-71.5494108!9m1!1b1!16s%2Fg%2F11vlx04l0m?entry=ttu&g_ep=EgoyMDI2MDUxMC4wIKXMDSoASAFQAw%3D%3D',
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
      barberos:        [],
    },
    mapubarbershop: {
      categoriasServicio: ['Cortes', 'Barba', 'Combos', 'Extras', 'Otro'],
      nombre:          'Mapu Barber Shop',
      nombreCorto:     'Mapu',
      pageTitle:       'Mapu Barber Shop | Vive la Experiencia',
      slogan:          'Vive la Experiencia',
      logo:            '/mapu.jfif',
      logo2:           '/mapu2.png',
      direccion:       '',
      horario:         '',
      telefono:        '',
      club:            'Club Mapu',
      instagram:       '',
      instagramHandle: '',
      waEmoji:         '✂️',
      googleReviewUrl: 'https://g.page/r/CSAV1u-lXwVeEBM/review',
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
  };

  // Resolver tenant: query param > dominio > sessionStorage > default
  let tenantId = '';
  try {
    tenantId = new URL(window.location.href).searchParams.get('local') || '';
  } catch (_) {}

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
  document.documentElement.classList.add('tenant-' + tenantId);

  var _logoSrc = _tenants[tenantId] && _tenants[tenantId].logo;
  if (_logoSrc) {
    var _favicon = document.querySelector('link[rel="icon"]');
    if (_favicon) _favicon.href = _logoSrc;
    var _touchIcon = document.querySelector('link[rel="apple-touch-icon"]');
    if (_touchIcon) _touchIcon.href = _logoSrc;
  }
})();
