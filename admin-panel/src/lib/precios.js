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
 * ⚠ IVA (criterio ÚNICO desde 2026-08-08, decisión de Ignacio): TODAS
 * las tarifas de acá son NETAS y el IVA se suma encima — por eso cada
 * una declara `iva:'mas'`. El número publicado es el neto; lo que se
 * carga a la tarjeta es conIva(neto) (Básico $29.900 → $35.581).
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
// Lista OFICIAL unificada (Ignacio 2026-08-07, IVA corregido el 08-08):
// Básico / Pro / Full / Anual en precio PÚBLICO NETO — el IVA se suma.
// Es la misma lista que publica crea.html, TrialGate y el cobro MP
// (mensualidad-mp.js guarda estos mismos netos y cobra neto × 1,19). La lista anterior (Individual
// $14.900 / Local $29.900 netos) dejó de ofrecerse: los tenants con
// tarifa pactada la conservan en su _billing, que manda sobre esto.
// Caja/comisiones/métricas y PROFESIONALES ILIMITADOS van en TODOS los
// planes (pedido de Ignacio, 07-08): nunca estuvieron bloqueados por plan
// en el producto y venderlos como exclusivos del Pro era mentirle al
// Básico. El Pro se diferencia SOLO por IA WhatsApp + Wallet.
export const PLANES = [
  {
    id: 'basico',
    nombre: 'Plan Básico',
    sub: 'Profesionales ilimitados · panel completo con caja y métricas',
    mes: 29900,
    iva: 'mas',
  },
  {
    id: 'pro',
    nombre: 'Plan Pro',
    sub: 'Todo lo del Básico · asistente IA por WhatsApp · Wallet',
    mes: 49900,
    iva: 'mas',
    popular: true,
  },
  {
    id: 'full',
    nombre: 'Plan Full',
    sub: 'Todo el Pro · IA también en Instagram · Reactivación incluida',
    mes: 69900,
    iva: 'mas',
  },
  {
    id: 'anual',
    nombre: 'Plan Anual',
    sub: 'Todo el Pro · un solo pago al año (equivale a 9 meses)',
    anio: 399000,
    iva: 'mas',
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
    iva: 'mas',
  },
  {
    id: 'bioo-pro',
    nombre: 'Bioo Pro',
    desc: 'Link in bio con reservas',
    mes: 4990,
    iva: 'mas',
  },
  {
    id: 'bioo-studio',
    nombre: 'Bioo Studio',
    desc: 'Link in bio con diseño a medida',
    mes: 9990,
    iva: 'mas',
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

// ── Asistente IA WhatsApp · tiers por conversaciones (2026-08-07) ────
// Reemplaza al híbrido $4.900 + $500/cita, que quedó demasiado barato.
// Se cobra por CONVERSACIÓN (ventana de 24 h por chat — la unidad ya
// instrumentada en functions/lib/wa-uso.js, costo real ~$10 CLP c/u),
// nunca por reserva: la cita es el resultado que presumimos y cobrarla
// castiga el éxito y ensucia la boleta. Citas agendadas ILIMITADAS en
// ambos tiers. Al tope diario del Start el bot deriva a humano y avisa
// al dueño con CTA de upgrade — sin cobros sorpresa por exceso.
// Decoy a propósito: Básico + Start ($49.800) ≈ Pro ($49.900), que trae
// el asistente incluido más Wallet, equipo, caja y métricas.
// Instagram entrará después como otro canal con el mismo esquema.
export const ASISTENTE_WA = [
  {
    id: 'ia-asistente-start',
    nombre: 'Asistente IA · Start',
    mes: 19900,
    iva: 'mas',
    conversacionesDia: 10,
    desc: 'Hasta 10 conversaciones al día · citas ilimitadas',
  },
  {
    id: 'ia-asistente-max',
    nombre: 'Asistente IA · Max',
    mes: 29900,
    iva: 'mas',
    conversacionesDia: null,   // ilimitadas (rige solo el tope anti-ban)
    desc: 'Conversaciones ilimitadas · citas ilimitadas',
  },
];

// El bundle IA ($19.900 por reactivación + asistente plano) se retiró el
// 2026-08-07: su rol lo cumple el plan Pro, que trae ambos módulos.

// ── Promociones vigentes ─────────────────────────────────────────
export const PROMOS = [
  'Primer mes gratis',
  'Sin costo de instalación',
  'Migración de tu agenda actual gratis',
  '2° local: 50% off los primeros 3 meses',
];
