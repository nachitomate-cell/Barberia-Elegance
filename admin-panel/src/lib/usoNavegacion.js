/* ── Uso de navegación (por dispositivo) ──────────────────────────
   Contador local de visitas a cada vista del panel. Alimenta:
     · la sección "Frecuentes" del Sidebar (los 4 destinos que ESTE
       equipo usa de verdad — el iPad del mesón aprende su rutina), y
     · el orden inicial del buscador global (PanelCmdK).
   Vive en localStorage a propósito: cada dispositivo/rol aprende lo
   suyo sin tocar Firestore ni configurar nada. */

const KEY         = 'sy_nav_uso_v1';
const MIN_VISITAS = 3;   // antes de esto no hay señal, solo ruido del primer día

function leer() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; }
}

export function registrarVisita(slug) {
  if (!slug || typeof slug !== 'string') return;
  try {
    const d = leer();
    const e = d[slug] || { n: 0, t: 0 };
    e.n = Math.min(e.n + 1, 999);   // techo: evita números eternos en equipos viejos
    e.t = Date.now();
    d[slug] = e;
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch { /* modo privado / cuota: sin frecuentes, nada se rompe */ }
}

/* Top N por uso (desempate: más reciente). Devuelve [{ slug, n }]. */
export function topFrecuentes(max = 4) {
  try {
    return Object.entries(leer())
      .filter(([, e]) => e && e.n >= MIN_VISITAS)
      .sort((a, b) => (b[1].n - a[1].n) || (b[1].t - a[1].t))
      .slice(0, max)
      .map(([slug, e]) => ({ slug, n: e.n }));
  } catch { return []; }
}
