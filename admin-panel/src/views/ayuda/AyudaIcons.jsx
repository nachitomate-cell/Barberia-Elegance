/* Iconos SVG inline para las categorías. Trazo 1.7px, coherente con
 * el mockup. Se referencian por slug (ver CATEGORIA_ICONOS). */
export function CatIcon({ name, size = 24 }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'activity':
      return <svg {...p}><path d="M3 12h4l3-9 4 18 3-9h4"/></svg>;
    case 'calendar':
      return <svg {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>;
    case 'shield':
      return <svg {...p}><path d="M12 2 4 5v6c0 5 3.5 8 8 11 4.5-3 8-6 8-11V5l-8-3z"/></svg>;
    case 'users':
      return <svg {...p}><circle cx="9" cy="7" r="4"/><path d="M2 21v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2"/><circle cx="17" cy="7" r="3"/><path d="M22 21v-1a4 4 0 0 0-3-3.87"/></svg>;
    case 'wallet':
      return <svg {...p}><path d="M20 12V8H4v8h16v-4z"/><path d="M4 8V6a2 2 0 0 1 2-2h10l4 4"/><circle cx="16" cy="14" r="1.6"/></svg>;
    case 'star':
      return <svg {...p}><path d="M12 2 15 8l7 1-5 5 1 7-6-3-6 3 1-7L2 9l7-1 3-6z"/></svg>;
    case 'globe':
      return <svg {...p}><path d="M3 11a9 9 0 0 1 9-9m0 0a9 9 0 0 1 9 9m-9-9v18m9-9a9 9 0 0 1-9 9m-9-9a9 9 0 0 0 9 9"/></svg>;
    case 'building':
      return <svg {...p}><path d="M4 21v-3a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v3"/><path d="M12 3v9M9 6l3-3 3 3"/><rect x="2" y="11" width="4" height="3" rx=".5"/><rect x="18" y="11" width="4" height="3" rx=".5"/></svg>;
    default:
      return <svg {...p}><circle cx="12" cy="12" r="9"/></svg>;
  }
}
