/* ═══════════════════════════════════════════════════════════════
 * precios.js — Fuente única de las tarifas de SynapTech.
 *
 * Antes cada precio vivía hardcodeado en el JSX de su vista:
 * Mensualidad (planes), Wallets, LinkBio (bioo) y ChatbotConfig
 * (asistente IA). Subir un precio obligaba a tocar 4 archivos y
 * acordarse de todos — y nada avisaba si uno quedaba atrás.
 *
 * Los valores son NÚMEROS, no strings ya formateados: así el formato
 * es responsabilidad de la UI (fmt) y no se puede desincronizar entre
 * vistas ("$9.900 + IVA / mes" vs "$9.990/mes" vs "$14.900/mes").
 *
 * ⚠ IVA: hoy el asistente IA se muestra "+ IVA" y el resto no dice
 * nada. Cada tarifa declara `iva` para que la UI sea explícita en vez
 * de ambigua. Si se unifica el criterio comercial, se cambia acá.
 * ═══════════════════════════════════════════════════════════════ */

/** Formatea un monto CLP: 14900 → "$14.900" */
export function fmtCLP(n) {
  return '$' + Number(n || 0).toLocaleString('es-CL');
}

/** IVA Chile. Los montos de tarifas con `iva:'mas'` son NETOS. */
export const IVA = 0.19;

/** Total con IVA, redondeado al peso: 29900 → 35581 */
export function conIva(neto) {
  return Math.round(Number(neto || 0) * (1 + IVA));
}

/** Sufijo de impuesto, para no volver a mezclar criterios entre vistas. */
export function sufijoIva(iva) {
  return iva === 'mas' ? '+ IVA' : '';
}

// ── Planes base (mensualidad del local) ──────────────────────────
// Lista OFICIAL unificada (decisión Ignacio 2026-08-07): Básico / Pro /
// Anual, en precio PÚBLICO con IVA incluido — la misma que publica
// crea.html, TrialGate y el cobro MP (mensualidad-mp.js guarda el neto
// equivalente: 25.126 / 41.933 / 335.294). La lista anterior (Individual
// $14.900 / Local $29.900 netos) dejó de ofrecerse: los tenants con
// tarifa pactada la conservan en su _billing, que manda sobre esto.
export const PLANES = [
  {
    id: 'basico',
    nombre: 'Plan Básico',
    sub: '1 profesional · agenda + club + panel',
    mes: 29900,
    iva: 'incluido',
  },
  {
    id: 'pro',
    nombre: 'Plan Pro',
    sub: 'Equipo ilimitado · IA + Wallet · caja y métricas',
    mes: 49900,
    iva: 'incluido',
    popular: true,
  },
  {
    id: 'anual',
    nombre: 'Plan Anual',
    sub: 'Todo el Pro · un solo pago al año (equivale a 9 meses)',
    anio: 399000,
    iva: 'incluido',
  },
];

// Aliases legacy: _billing.plan de tenants antiguos puede decir
// 'individual'/'local'; el backend ya los mapea igual (mensualidad-mp.js).
export const PLAN_ALIAS = { individual: 'basico', local: 'pro' };

// Multi-local (2+ locales) ya NO tiene tramos publicados: se cotiza a
// medida caso a caso, como Kronnos (decisión 2026-08-07; antes existía
// CADENA con $25.900/$22.900 por local).

// ── Add-ons (se suman a la mensualidad) ──────────────────────────
// Decisión 2026-08-07: los add-ons son upsell SOLO del plan Básico — el
// Pro ya incluye IA + Wallet en su precio. Los acuerdos pactados por
// tenant (asistente plano $14.900, etc.) se mantienen tal cual.
export const ADDONS = [
  {
    id: 'wallets',
    nombre: 'Wallets',
    desc: 'Tarjeta de fidelidad en Google Wallet y Apple Wallet',
    mes: 9990,
    iva: 'incluido',
  },
  {
    id: 'bioo-pro',
    nombre: 'Bioo Pro',
    desc: 'Link in bio con reservas',
    mes: 4990,
    iva: 'incluido',
  },
  {
    id: 'bioo-studio',
    nombre: 'Bioo Studio',
    desc: 'Link in bio con diseño a medida',
    mes: 9990,
    iva: 'incluido',
  },
  {
    id: 'ia-reactivacion',
    nombre: 'Reactivación IA',
    desc: 'Recupera clientes que dejaron de venir',
    mes: 9900,
    iva: 'mas',
  },
  {
    // LEGACY: superado por ASISTENTE_HIBRIDO en toda cotización nueva.
    // Queda solo como referencia de los acuerdos pactados que lo pagan.
    id: 'ia-asistente',
    nombre: 'Asistente 24/7',
    desc: 'Bot de WhatsApp que responde y agenda',
    mes: 14900,
    iva: 'mas',
    legacy: true,
  },
];

// ── Asistente IA · modelo HÍBRIDO (decisión de Ignacio, 2026-08-02) ──
// Base baja + comisión por cita que el bot agenda SOLO. El local paga poco
// fijo y el resto únicamente cuando el bot le trajo reservas de verdad; para
// un local activo (≈30 citas/mes) termina sobre el add-on plano, y para uno
// chico es más barato que la tarifa fija. Las citas se cuentan de
// `_metrics/bot_{tid}_{YYYY-MM}.agendada` (ya se registraba, no hubo que
// instrumentar nada). Sustituye al `ia-asistente` plano en las cotizaciones
// nuevas; los tenants con tarifa pactada mantienen la suya.
export const ASISTENTE_HIBRIDO = {
  id: 'ia-asistente-hibrido',
  nombre: 'Asistente 24/7 · pago por uso',
  base: 4900,        // neto al mes
  porCita: 500,      // neto por cita agendada por el bot
  iva: 'mas',
};

// El bundle IA ($19.900 por reactivación + asistente plano) se retiró el
// 2026-08-07: su rol lo cumple el plan Pro, que trae ambos módulos.

// ── Promociones vigentes ─────────────────────────────────────────
export const PROMOS = [
  'Primer mes gratis',
  'Sin costo de instalación',
  'Migración de tu agenda actual gratis',
  '2° local: 50% off los primeros 3 meses',
];
