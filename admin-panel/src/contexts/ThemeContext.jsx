import { createContext, useCallback, useContext, useEffect, useState } from 'react';

/**
 * ThemeContext
 * ─────────────────────────────────────────────────────────────────
 *  Fuente de verdad del modo claro/oscuro del panel.
 *
 *  El tema se expresa como la clase `light` en <html>. A partir de ahí
 *  todo el color sale de los tokens de styles/_tokens.css, que se
 *  redefinen bajo `html.light` (ver ese archivo).
 *
 *  Vivía dentro de Sidebar.jsx. Al estar encerrado ahí, el estado solo
 *  existía donde hubiera Sidebar montado y useChartTheme no tenía cómo
 *  leerlo (espiaba el <html> con un MutationObserver).
 * ─────────────────────────────────────────────────────────────────
 */

// Ojo: la misma key está hardcodeada en el script anti-FOUC de index.html,
// que corre antes que cualquier bundle. Si cambia acá, cambia allá.
const STORAGE_KEY = 'gestion-theme';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  // El anti-FOUC ya decidió el tema antes del primer paint. Leemos del DOM
  // en vez de localStorage para arrancar sincronizados con lo que ya se
  // pintó, incluso si el storage falla (Safari privado, etc.).
  const [light, setLight] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('light');
    }
    try { return localStorage.getItem(STORAGE_KEY) === 'light'; } catch { return false; }
  });

  useEffect(() => {
    const html = document.documentElement;

    // Sin este freeze, los cientos de elementos con transition-colors animan
    // su nuevo color a la vez y el browser se traba 1-2s al cambiar de modo.
    // La regla que lo implementa está en index.css (html.theme-switching).
    html.classList.add('theme-switching');
    html.classList.toggle('light', light);
    try { localStorage.setItem(STORAGE_KEY, light ? 'light' : 'dark'); } catch (_) {}

    // Barra de estado de la PWA — si no, en modo claro queda azul oscuro.
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', light ? '#e9eef4' : '#0f172a');

    requestAnimationFrame(() => {
      requestAnimationFrame(() => html.classList.remove('theme-switching'));
    });
  }, [light]);

  const toggle = useCallback(() => setLight(v => !v), []);

  return (
    <ThemeContext.Provider value={{ light, setLight, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme() requiere <ThemeProvider> (ver main.jsx)');
  return ctx;
}
