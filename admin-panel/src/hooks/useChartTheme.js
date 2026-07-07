import { useEffect, useState } from 'react';

/**
 * useChartTheme
 * ─────────────────────────────────────────────────────────────────
 *  Devuelve la paleta correcta para Recharts según el modo actual
 *  (dark/light). Los SVG generados por Recharts no leen CSS Tailwind
 *  ni los overrides html.light — necesitan colores en atributos
 *  stroke=/fill= directos, así que este hook los pasa como valores.
 *
 *  Escucha cambios de la clase `.light` en <html> (useTheme del Sidebar
 *  la toggle) y re-renderiza los charts para que se re-pinten.
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

function detectLight() {
  if (typeof document === 'undefined') return false;
  return document.documentElement.classList.contains('light');
}

export function useChartTheme() {
  const [isLight, setIsLight] = useState(detectLight);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    // MutationObserver sobre el <html> — el useTheme del Sidebar toggle
    // la clase 'light' ahí. Con esto, cambiar el tema re-renderiza los
    // gráficos sin necesidad de key= ni forceUpdate.
    const obs = new MutationObserver(() => setIsLight(detectLight()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

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
