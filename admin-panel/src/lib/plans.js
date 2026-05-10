// plans.js — Fuente de verdad para los planes de membresía.
// Importar desde cualquier vista/hook que necesite datos de planes.

export const PLANES = {
  silver: {
    id:         'silver',
    nombre:     'Silver Pass',
    precio:     14990,
    color:      { from: '#6b7280', to: '#374151', text: '#d1d5db', badge: '#9ca3af' },
    servicios:  { cortes: 2, barba: 1, masaje: 0 },
    descripcion: '2 cortes + 1 arreglo de barba al mes',
  },
  gold: {
    id:         'gold',
    nombre:     'Gold Pass',
    precio:     24990,
    color:      { from: '#b8960c', to: '#78610a', text: '#fde68a', badge: '#D4AF37' },
    servicios:  { cortes: 4, barba: 2, masaje: 0 },
    descripcion: '4 cortes + 2 arreglos de barba al mes',
  },
  black: {
    id:         'black',
    nombre:     'Black Pass',
    precio:     39990,
    color:      { from: '#1c1c1e', to: '#000000', text: '#e5e7eb', badge: '#a78bfa' },
    servicios:  { cortes: 8, barba: 4, masaje: 1 },
    descripcion: '8 cortes + 4 barba + 1 masaje capilar al mes',
  },
};

// Mapeo de servicioNombre (en cita) → clave en remainingServices
export const SERVICIO_KEY_MAP = {
  // Cortes — todas las variantes posibles
  'Corte Clásico':      'cortes',
  'Corte Degradado':    'cortes',
  'Corte Tradicional':  'cortes',
  'Corte':              'cortes',
  'Fade':               'cortes',
  // Barba
  'Arreglo de Barba':   'barba',
  'Barba':              'barba',
  'Perfilado de Barba': 'barba',
  // Masaje / extras
  'Masaje Capilar':     'masaje',
  'Masaje':             'masaje',
};

/** Devuelve la clave de remainingServices para un nombre de servicio, o null. */
export function servicioAKey(nombreServicio = '') {
  const nombre = nombreServicio.trim();
  if (SERVICIO_KEY_MAP[nombre]) return SERVICIO_KEY_MAP[nombre];
  // Fallback: coincidencia parcial (case-insensitive)
  const lower = nombre.toLowerCase();
  if (lower.includes('corte') || lower.includes('fade') || lower.includes('degradado')) return 'cortes';
  if (lower.includes('barba') || lower.includes('beard'))  return 'barba';
  if (lower.includes('masaje') || lower.includes('massage')) return 'masaje';
  return null;
}

export function formatPrecio(n) {
  return `$${Number(n).toLocaleString('es-CL')}`;
}
