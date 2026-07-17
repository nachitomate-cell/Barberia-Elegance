import { useTheme } from '../contexts/ThemeContext';

/**
 * useChartTheme
 * ─────────────────────────────────────────────────────────────────
 *  Devuelve la paleta correcta para Recharts según el modo actual.
 *  Recharts pinta stroke=/fill= como atributos SVG, así que no lo
 *  alcanza ningún selector CSS: los colores tienen que llegarle como
 *  valores JS. Por eso este hook existe.
 *
 *  Uso:
 *    const t = useChartTheme();
 *    <CartesianGrid stroke={t.grid} />
 *    <Bar fill={t.positive} />
 *    <Tooltip contentStyle={t.tooltipStyle} />
 * ─────────────────────────────────────────────────────────────────
 */

// Filosofía: en un dashboard FINANCIERO, menos colores = más señal.
// Solo 3 categorías semánticas + 1 acento amber para agenda.
//
// Estos valores son un espejo en JS de los tokens de _tokens.css. No se leen
// con getComputedStyle porque Recharts los necesita en el primer render, antes
// de que haya nodo montado del cual leer. Si cambia la paleta, cambian los dos.
const DARK = {
  positive:   '#10b981',  // emerald-500 — ingresos, ocupación alta, utilidad
  negative:   '#f43f5e',  // rose-500 — egresos, cancelados, bajo equilibrio
  neutral:    '#3b82f6',  // blue-500 — utilidad neta (dato intermedio)
  accent:     '#f59e0b',  // amber-500 — solo para agenda / citas (no financiero)
  grid:       '#1e293b',  // slate-800 — líneas de fondo del gráfico
  axis:       '#64748b',  // slate-500 — labels de ejes X/Y
  text:       '#e2e8f0',  // slate-200 — texto general en tooltip
  tooltipBg:  'rgba(15, 23, 42, 0.95)',    // slate-900/95
  tooltipBd:  'rgba(148, 163, 184, 0.20)', // slate-400/20
  sparklineFilled: '#10b981',
};

const LIGHT = {
  positive:   '#059669',  // emerald-600 — un pelo más profundo, se lee sobre blanco
  negative:   '#e11d48',  // rose-600
  neutral:    '#2563eb',  // blue-600
  accent:     '#d97706',  // amber-600
  grid:       '#e2e8f0',  // slate-200 — casi imperceptible
  axis:       '#94a3b8',  // slate-400 — labels claros
  text:       '#0f172a',  // slate-900
  tooltipBg:  'rgba(255, 255, 255, 0.98)',
  tooltipBd:  'rgba(15, 23, 42, 0.12)',
  sparklineFilled: '#059669',
};

export function useChartTheme() {
  // Antes esto era un MutationObserver sobre el <html>: el estado del tema
  // vivía dentro de Sidebar.jsx y no había forma de importarlo. Con
  // ThemeContext se lee directo y los charts se re-pintan solos.
  const { light: isLight } = useTheme();

  const t = isLight ? LIGHT : DARK;
  return {
    ...t,
    isLight,
    // Objeto listo para pasar al <Tooltip contentStyle={...}> de Recharts.
    tooltipStyle: {
      backgroundColor: t.tooltipBg,
      border: `1px solid ${t.tooltipBd}`,
      borderRadius: 8,
      color: t.text,
      fontSize: 12,
      boxShadow: isLight
        ? '0 4px 12px rgba(15,23,42,0.08)'
        : '0 4px 12px rgba(0,0,0,0.4)',
    },
    tooltipLabelStyle: { color: t.text, fontWeight: 600, marginBottom: 4 },
    tooltipItemStyle:  { color: t.text },
    axisTickStyle:     { fill: t.axis, fontSize: 11 },
  };
}
