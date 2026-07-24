'use strict';

// ─────────────────────────────────────────────────────────────────────────────
//  lib/tenant-mail-config.js
//  Única fuente de verdad para el branding de correos transaccionales
//  (confirmación de cita, recordatorio 1h, cualquier otro flujo futuro).
//
//  Antes: cada Cloud Function tenía su propio objeto TENANT_CONFIG duplicado y
//  con distinta completitud. Un tenant faltante en una sola de las dos copias
//  hacía que sus correos cayeran al fallback "Elegance Barbershop".
//
//  Ahora: los handlers llaman a getTenantConfig(tenantId) y siempre reciben
//  branding coherente (nombre, from, dirección, color, redes) para el tenant
//  correcto. Si el tenant no está mapeado, se hace fallback a elegance con
//  logging claro para poder añadirlo aquí y quedar cubierto de un solo tiro.
// ─────────────────────────────────────────────────────────────────────────────

const admin = require('firebase-admin');

const TENANT_CONFIG = {
  elegance: {
    nombre:    'Elegance Barbershop',
    direccion: 'Ecuador 243, Viña del Mar',
    horario:   'Lun–Sáb: 10–20h · Dom: 12–20h',
    color:     '#D4AF37',
    instagram: 'https://www.instagram.com/elegance.cl_/',
    whatsapp:  '',
    from:      'Elegance Barbershop <citas@synaptechspa.cl>',
    dashboardUrl: 'https://barberiaelegance.synaptechspa.cl/dashboard',
  },
  ferraza: {
    nombre:    'Barbería Ferraza',
    direccion: 'Av. Libertad 63 / Local 28',
    horario:   'Lun–Sáb: 10–20h',
    color:     '#C0392B',
    instagram: '',
    whatsapp:  '56994269228',
    from:      'Barbería Ferraza <citas@synaptechspa.cl>',
    dashboardUrl: 'https://barberiaferraza.synaptechspa.cl/dashboard',
  },
  gitana: {
    nombre:    'Gitana Nails Studio',
    direccion: 'Las Encinas 1390 local 18, Concón',
    horario:   'Atención con hora previa',
    color:     '#8E44AD',
    instagram: 'https://www.instagram.com/gitana.nails.studio',
    whatsapp:  '56997023355',
    from:      'Gitana Nails Studio <citas@synaptechspa.cl>',
    dashboardUrl: 'https://gitananails.synaptechspa.cl/dashboard',
  },
  mapubarbershop: {
    nombre:    'Mapu Barber Shop',
    direccion: '',
    horario:   '',
    color:     '#BFA37E',
    instagram: '',
    whatsapp:  '',
    from:      'Mapu Barber Shop <citas@synaptechspa.cl>',
    dashboardUrl: 'https://mapubarbershop.synaptechspa.cl/dashboard',
  },
  chameleon: {
    nombre:    'Chameleon Barber Studio',
    slogan:    'Clásico y moderno, perfecto para tí!',
    direccion: 'Av. Libertad 868, Viña del Mar',
    horario:   'Lun–Sáb: 10:30–20:00 hrs.',
    color:     '#DAA520',
    instagram: 'https://www.instagram.com/chameleon.barberstudio/',
    whatsapp:  '56928186861',
    from:      'Chameleon Barber Studio <citas@synaptechspa.cl>',
    dashboardUrl: 'https://chameleonbarber.synaptechspa.cl/dashboard',
  },
  lumen: {
    nombre:      "D'Jones Barber",
    slogan:      'Estilo y tradición',
    direccion:   'Villanelo 279, Viña del Mar',
    horario:     'Lun a Sáb: 10:00 – 20:15 hrs | Dom: 09:00 – 20:00 hrs',
    color:       '#C9A050',
    darkHeader:  true,
    instagram:   'https://www.instagram.com/d.jonesbarberia/',
    whatsapp:    '56929808223',
    from:        "D'Jones Barber <citas@synaptechspa.cl>",
    dashboardUrl:'https://djonesbarberia.synaptechspa.cl/dashboard',
  },
  delnero: {
    nombre:    'Del Nero Barber',
    slogan:    'Estilo que define. Arte que trasciende.',
    direccion: 'Curauma / Placilla',
    horario:   'Lun a Sáb: 10:00 – 20:00 hrs.',
    color:     '#DAA520',
    instagram: '',
    whatsapp:  '',
    from:      'Del Nero Barber <citas@synaptechspa.cl>',
    dashboardUrl: 'https://delnerobarber.synaptechspa.cl/dashboard',
  },
  marcelo_hairdressing: {
    nombre:     'Marcelo Palma',
    slogan:     'Hairdressing & Estilo',
    direccion:  'Curauma / Placilla',
    horario:    'Lun a Sáb: 10:00 – 20:00 hrs.',
    color:      '#ffffff',
    darkHeader: true,
    instagram:  '',
    whatsapp:   '',
    from:       'Marcelo Palma <citas@synaptechspa.cl>',
    dashboardUrl: 'https://marcelohairdressing.synaptechspa.cl/dashboard',
  },
  aura: {
    nombre:      'AURA SALÓN & MALE GROOMING',
    slogan:      'Eleva Tu Aura',
    direccion:   'Viña del Mar',
    horario:     'Lun–Sáb: 10:00–20:00 hrs.',
    color:       '#6CABDD',
    instagram:   'https://www.instagram.com/aura.salon.cl/',
    whatsapp:    '56966153086',
    from:        'AURA SALÓN & MALE GROOMING <citas@synaptechspa.cl>',
    dashboardUrl:'https://aurasalonmalegrooming.synaptechspa.cl/dashboard',
  },
  latincaribe: {
    nombre:      'The Latin Caribe',
    slogan:      'Más que un corte, una experiencia.',
    direccion:   'Manuel Rodríguez 299, Copiapó',
    horario:     'Lun–Sáb: 11:00–21:00 · Dom: 12:00–20:00',
    color:       '#35DDE6',
    darkHeader:  true,
    instagram:   '',
    whatsapp:    '',
    from:        'The Latin Caribe <citas@synaptechspa.cl>',
    dashboardUrl:'https://thelatincaribe.synaptechspa.cl/dashboard',
  },
  machos: {
    nombre:      'Macho´s Barbershop',
    slogan:      'Calidad y Asesoría Profesional',
    direccion:   '4 Norte 477 local 5, Viña del Mar',
    horario:     'Lun–Sáb: 10:00–20:00 hrs · Dom: 11:00–17:00 hrs',
    color:       '#f97316',
    instagram:   'https://www.instagram.com/machos_barbershop.cl/',
    whatsapp:    '56978390422',
    from:        'Macho´s Barbershop <citas@synaptechspa.cl>',
    dashboardUrl:'https://machos.synaptechspa.cl/dashboard',
  },
  deluxeperfumes: {
    nombre:    'Deluxe Perfumes',
    slogan:    'Tu fragancia perfecta',
    direccion: '1/2 Oriente 831, Oficina 601, Viña del Mar',
    horario:   'Delivery en Viña, Valparaíso y Con-Con.',
    color:     '#D4AF37',
    instagram: '',
    whatsapp:  '',
    from:      'Deluxe Perfumes <citas@synaptechspa.cl>',
    dashboardUrl: 'https://deluxeperfumes.synaptechspa.cl/dashboard',
  },
  infinity: {
    nombre:    'INFINITY STUDIO',
    slogan:    'Ambiente familiar y confianza',
    direccion: 'Traslaviña 114, Viña del Mar',
    horario:   'Lun a Sáb: 10:00 – 20:00 hrs.',
    color:     '#6366f1',
    instagram: 'https://www.instagram.com/infinitystudio23/',
    whatsapp:  '56985551234',
    from:      'INFINITY STUDIO <citas@synaptechspa.cl>',
    dashboardUrl: 'https://infinity.synaptechspa.cl/dashboard',
  },
  omega: {
    nombre:    'OMEGA STUDIO',
    slogan:    'Estudio atendido por profesionales',
    direccion: 'Av. Valparaíso 595, Local 53, 2do Piso, Viña del Mar',
    horario:   'Lun–Vie 10–20h · Sáb 10–18h',
    color:     '#D4A96A',
    instagram: 'https://www.instagram.com/omegastudio.cl/',
    whatsapp:  '56972302811',
    from:      'OMEGA STUDIO <citas@synaptechspa.cl>',
    dashboardUrl: 'https://omega.synaptechspa.cl/dashboard',
  },
  memphis: {
    nombre:    'Memphis Salón',
    slogan:    'Estilo y profesionalismo en Viña del Mar',
    direccion: 'Viña del Mar',
    horario:   'Lun a Sáb — Agenda tu hora',
    color:     '#EC4899',
    instagram: 'https://www.instagram.com/memphissalon',
    whatsapp:  '',
    from:      'Memphis Salón <citas@synaptechspa.cl>',
    dashboardUrl: 'https://memphis.synaptechspa.cl/dashboard',
  },
  sionbarberia: {
    nombre:    'Studio Dieciséis',
    slogan:    'Cuidado personal que combina estilo y calidad.',
    direccion: 'Condell 1525, Piso 5, Local 43, Galería Beye, Valparaíso',
    horario:   'Lun–Sáb: 09:00–21:00 hrs',
    color:     '#111111',
    instagram: 'https://www.instagram.com/studio.dieciseis_/',
    whatsapp:  '56937179177',
    from:      'Studio Dieciséis <citas@synaptechspa.cl>',
    dashboardUrl: 'https://studiodieciseis.synaptechspa.cl/dashboard',
  },
  kronnos_penablanca: {
    nombre:      'Kronnos Studio Peñablanca',
    slogan:      'Un espacio unisex donde ambos mundos convergen',
    direccion:   'Av. Vicepresidente Bernardo Leighton 20, local 13, Villa Alemana',
    horario:     'Lun a Sáb · 10:30 – 19:00',
    color:       '#e11d2a',
    instagram:   '',
    whatsapp:    '56982504870',
    from:        'Kronnos Studio Peñablanca <citas@synaptechspa.cl>',
    dashboardUrl:'https://kronnospenablanca.synaptechspa.cl/dashboard',
  },
  kronnos_limache: {
    nombre:      'Kronnos Studio Limache',
    slogan:      'Un espacio unisex donde ambos mundos convergen',
    direccion:   'Paseo Las Araucarias 405, local 5, Limache',
    horario:     'Lun a Sáb · 10:30 – 19:00',
    color:       '#f97316',
    instagram:   '',
    whatsapp:    '56920241041',
    from:        'Kronnos Studio Limache <citas@synaptechspa.cl>',
    dashboardUrl:'https://kronnoslimache.synaptechspa.cl/dashboard',
  },
  kronnos_woman: {
    nombre:      'Kronnos Woman',
    slogan:      'Belleza y estilo en un solo lugar',
    direccion:   'Palmira Romano Sur 405, local 3, Limache',
    horario:     'Lun a Dom · 09:30 – 23:00',
    color:       '#ec4899',
    instagram:   '',
    whatsapp:    '',
    from:        'Kronnos Woman <citas@synaptechspa.cl>',
    dashboardUrl:'https://kronnoswoman.synaptechspa.cl/dashboard',
  },
  barbersclub: {
    nombre:      'Barbers Club',
    slogan:      'Exclusivo salón ambientado para potenciar tu imagen.',
    direccion:   'Av. Del Canal 19811, Local 12, Ciudad de los Valles, Pudahuel, Santiago',
    horario:     'Lun–Sáb: 10:00–20:30 hrs.',
    color:       '#DAA520',
    darkHeader:  true,
    headerBg:    '#0b0a09',
    instagram:   'https://www.instagram.com/barbersclub_/',
    whatsapp:    '56981806262',
    from:        'Barbers Club <citas@synaptechspa.cl>',
    dashboardUrl:'https://barbersclub.synaptechspa.cl/dashboard',
  },
  elbarberomoderno: {
    nombre:      'El Barbero Moderno',
    slogan:      'Barbero Profesional con 8 años de experiencia. Tu estilo, a otro nivel.',
    direccion:   'Serrano 73',
    horario:     'Lun–Sáb: 10:00–20:00 hrs',
    color:       '#DAA520',
    darkHeader:  true,
    headerBg:    '#0b0a09',
    instagram:   'https://instagram.com/jhbarber.cl/',
    whatsapp:    '',
    from:        'El Barbero Moderno <citas@synaptechspa.cl>',
    dashboardUrl:'https://elbarberomoderno.synaptechspa.cl/dashboard',
  },
  yugen: {
    nombre:      'Yūgen Studio',
    slogan:      'La profundidad que no se explica, se experimenta',
    direccion:   '',
    horario:     'Lun–Vie: 10:00–19:00 · Sáb: 10:00–18:00 · Dom: 10:00–14:00',
    color:       '#d8d3ca',
    darkHeader:  true,
    headerBg:    '#0b0a09',
    intro:       'Hola {nombre}, tu espacio en Yūgen Studio está reservado. Te invitamos a desconectar del exterior y reconectarte contigo mismo. Te esperamos.',
    instagram:   '',
    whatsapp:    '',
    from:        'Yūgen Studio <citas@synaptechspa.cl>',
    dashboardUrl:'https://yugenstudio.synaptechspa.cl/dashboard',
  },
  estudioluxury: {
    nombre:      'Studio Luxury',
    slogan:      'Estilo y distinción en cada corte.',
    direccion:   'Talagante · Isla de Maipo · El Monte (local y domicilio)',
    horario:     'Lun a Sáb · Agenda tu hora',
    color:       '#DAA520',
    darkHeader:  true,
    headerBg:    '#0b0a09',
    instagram:   'https://www.instagram.com/estudio.luxury_/',
    whatsapp:    '56958994297',
    from:        'Studio Luxury <citas@synaptechspa.cl>',
    dashboardUrl:'https://estudioluxury.synaptechspa.cl/dashboard',
  },
};

/**
 * Devuelve el branding de correos del tenant (async).
 *
 * Si el tenant está mapeado arriba, retorna su branding curado al instante
 * (sin lectura a Firestore). Si NO está mapeado — caso típico de tenants
 * self-service y altas nuevas — YA NO se impersona a Elegance: se deriva el
 * nombre real desde su doc `tenants/{tid}` (mismo patrón que aviso-cita-staff
 * y evolution/*) y se arma una config neutra dark con ese nombre. Así un
 * tenant nuevo queda cubierto sin editar este archivo; conviene agregarlo
 * igual para el branding completo (color/slogan/redes), y el warn lo recuerda.
 *
 * Antes el fallback silencioso mandaba correos "Elegance Barbershop" a los
 * clientes de otros locales — eso es lo que este cambio elimina de raíz.
 *
 * @param {string} tenantId
 * @param {import('firebase-functions').logger} [logger] opcional para warn.
 * @returns {Promise<object>} branding del tenant.
 */
async function getTenantConfig(tenantId, logger) {
  const cfg = TENANT_CONFIG[tenantId];
  if (cfg) return cfg;

  // Derivar branding real del doc del tenant (nunca impersonar Elegance).
  let nombre = null, direccion = '', horario = '', whatsapp = '', instagram = '';
  try {
    const snap = await admin.firestore().collection('tenants').doc(tenantId).get();
    if (snap.exists) {
      const d = snap.data() || {};
      nombre    = d.nombre || d.nombreLocal || d.nombreCorto || (d.branding && d.branding.nombre) || null;
      direccion = d.direccion || (d.branding && d.branding.direccion) || '';
      horario   = d.horario || '';
      whatsapp  = d.whatsapp || d.telefono || '';
      instagram = d.instagram || '';
    }
  } catch (e) {
    if (logger && typeof logger.warn === 'function') {
      logger.warn(`[tenant-mail-config] no se pudo leer tenants/${tenantId}: ${e.message}`);
    }
  }

  const displayName = nombre || tenantId;   // jamás "Elegance"
  if (logger && typeof logger.warn === 'function') {
    logger.warn(`[tenant-mail-config] tenant '${tenantId}' sin entrada estática — branding derivado (nombre='${displayName}'). Añadir a lib/tenant-mail-config.js para branding completo.`);
  }
  return {
    nombre:       displayName,
    direccion,
    horario,
    color:        '#DAA520',
    darkHeader:   true,
    headerBg:     '#0b0a09',
    instagram,
    whatsapp,
    from:         `${displayName} <citas@synaptechspa.cl>`,
    dashboardUrl: `https://${tenantId}.synaptechspa.cl/dashboard`,
  };
}

/**
 * Devuelve un enlace universal de Google Maps que en móviles abre la app
 * de Maps si está instalada (y desde ahí el usuario puede redirigir a Waze
 * o Uber con un tap), y en desktop abre la web. Formato oficial de Google
 * (https://developers.google.com/maps/documentation/urls/get-started).
 *
 * @param {string} address dirección legible ("Ecuador 243, Viña del Mar").
 *                         Se pasa por encodeURIComponent para blindarla.
 * @returns {string|null}  URL o null si la dirección está vacía.
 */
function mapsUrl(address) {
  const clean = String(address || '').trim();
  if (!clean) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clean)}`;
}

module.exports = { TENANT_CONFIG, getTenantConfig, mapsUrl };
