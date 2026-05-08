// config.js — Configuración del negocio (multi-tenant)
// El tenant se resuelve desde ?local= en la URL o desde el dominio.

(function () {
  const _domainMap = {
    'gitananails.synaptechspa.cl': 'gitana',
    'barberiaelegance.synaptechspa.cl': 'elegance',
  };

  const _tenants = {
    elegance: {
      nombre:          '𝐄𝐥𝐞𝐠𝐚𝐧𝐜𝐞 𝐛𝐚𝐫𝐛𝐞𝐫𝐬𝐡𝐨𝐩',
      nombreCorto:     'Elegance',
      slogan:          'No es un corte, es elegancia que te mereces',
      logo:            '/logo.jpg',
      direccion:       '📍 Ecuador 243 | Viña del Mar',
      horario:         '🕒 Lunes-Sáb: 10-20h | Dom: 12-20h. ¡Reserva ya!',
      telefono:        '56994269228',
      club:            'Club Elegance',
      instagram:       'https://www.instagram.com/elegance.cl_/',
      instagramHandle: '@elegance.cl_',
      waEmoji:         '✂️',
      barberos: [
        { nombre: 'Nicolas Fabian', foto: 'Fabian.png', disponible: true },
      ],
    },
    gitana: {
      nombre:          'Gitana Nails Studio',
      nombreCorto:     'Gitana',
      slogan:          'Estudio de Uñas y Pestañas',
      logo:            '/local2.jpg',
      direccion:       '📍 Las Encinas 1390 local 18 | Concón',
      horario:         '🕒 Reagenda con mín. 24 hrs al +56997023355',
      telefono:        '56997023355',
      club:            'Club Gitana',
      instagram:       'https://www.instagram.com/gitana.nails.studio',
      instagramHandle: '@gitana.nails.studio',
      waEmoji:         '💅',
      barberos: [
        { nombre: 'Sabina', foto: null, disponible: true },
        { nombre: 'Clau',   foto: null, disponible: true },
        { nombre: 'Cony',   foto: null, disponible: true },
        { nombre: 'Gigi',   foto: null, disponible: true },
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
})();
