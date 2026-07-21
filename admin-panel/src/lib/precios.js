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
// Criterio comercial 2026-07-20 (pedido de Ignacio): los planes son NETOS y
// el IVA (19%) se agrega al cobrar — ej: Local $29.900 + IVA = $35.581.
// `_billing.montoPendiente` también se guarda NETO; la UI y el cobro
// automático (mpMensualidadCrearLink) aplican conIva().
export const PLANES = [
  {
    id: 'individual',
    nombre: 'Individual',
    sub: '1 barbero · trabajas solo',
    mes: 14900,
    anual: 11900,       // precio por mes, pagando el año
    iva: 'mas',
  },
  {
    id: 'local',
    nombre: 'Local',
    sub: 'Barberos ilimitados · un local',
    mes: 29900,
    anual: 24900,
    iva: 'mas',
    popular: true,
  },
];

// ── Cadena: precio POR LOCAL según cuántos tenga ─────────────────
// El tramo de 1 local es exactamente el plan Local, así que la UI no
// lo repite: la cadena parte en 2.
export const CADENA = [
  { desde: 2, hasta: 2, porLocal: 25900 },
  { desde: 3, hasta: 5, porLocal: 22900 },
];

// ── Add-ons (se suman a la mensualidad) ──────────────────────────
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
    id: 'ia-asistente',
    nombre: 'Asistente 24/7',
    desc: 'Bot de WhatsApp que responde y agenda',
    mes: 14900,
    iva: 'mas',
  },
];

// Bundle de los dos módulos de IA (20% off sobre la suma).
export const BUNDLE_IA = {
  id: 'ia-bundle',
  incluye: ['ia-reactivacion', 'ia-asistente'],
  mes: 19900,
  iva: 'mas',
  get listado() {
    return ADDONS
      .filter(a => this.incluye.includes(a.id))
      .reduce((s, a) => s + a.mes, 0);   // 24.800
  },
};

// ── Promociones vigentes ─────────────────────────────────────────
export const PROMOS = [
  'Primer mes gratis',
  'Sin costo de instalación',
  'Migración de tu agenda actual gratis',
  '2° local: 50% off los primeros 3 meses',
];
