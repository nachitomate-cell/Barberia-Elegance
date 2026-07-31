'use strict';

// functions/lib/ai-presupuesto.js
// ─────────────────────────────────────────────────────────────────────────────
//  TOPE DE GASTO DE CLAUDE POR LOCAL
//
//  El bot cobra por conversación, no por mes: un local con el asistente
//  encendido gasta lo que gaste, y hasta ahora nada lo frenaba. Con el uso real
//  eso no es un problema —una conversación cuesta ~US$0,012 y un local activo
//  no llega a US$3 al mes— pero el modo de falla no es el uso normal: es el
//  bucle. Dos bots hablándose, un cliente pegándole al teclado, o una tool que
//  se reintenta sola pueden quemar en una hora lo de un mes entero, y nos
//  enteraríamos con la factura.
//
//  Por eso son DOS topes y no uno:
//
//    · DIARIO  → cortacircuitos. Es el que ataja el bucle. Un tope solo
//                mensual reacciona demasiado tarde: para cuando se nota, el
//                mes ya se gastó.
//    · MENSUAL → presupuesto. Es el que dice "este local consume más de lo que
//                paga" y abre una conversación comercial, no técnica.
//
//  Los valores viven en _system/{tid} (solo SynapTech escribe ahí) y si no
//  están se usan los de acá. Los defaults son deliberadamente HOLGADOS: tienen
//  que atajar la anomalía sin tocar jamás a un local que trabaja normal. Un
//  tope que salta con el uso real se termina subiendo hasta que deja de servir.
//
//  ⚠️ El corte NO apaga las confirmaciones. Esas se resuelven con una expresión
//  regular y no cuestan un centavo de IA; dejar a un cliente sin poder
//  confirmar su hora por un tope de tokens sería cambiar plata por citas
//  perdidas. Solo se apaga el bot conversacional.
// ─────────────────────────────────────────────────────────────────────────────

const admin = require('firebase-admin');
const db = admin.firestore();

// US$/día y US$/mes por local. Referencia para calibrarlos:
//   1 conversación ≈ US$0,012   ·   1 llamada al modelo ≈ US$0,004
//   → 0,60/día  ≈ 50 conversaciones en un día
//   → 6,00/mes  ≈ 500 conversaciones en el mes
// Una barbería con mucho movimiento anda en 5–15 conversaciones diarias.
const TOPE_DIA_USD = 0.60;
const TOPE_MES_USD = 6.00;

// Se avisa antes de cortar: el corte no puede ser la primera noticia.
const AVISO_PCT = 0.70;

const DIA_CL = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit',
});
const diaCL = () => DIA_CL.format(new Date());
const mesCL = () => diaCL().slice(0, 7);

/** Topes efectivos del local. Un 0 explícito significa "sin tope": hay que
 *  poder desactivarlo para un caso puntual sin tocar el código. */
function topesDe(sys) {
  const n = (v, def) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : def);
  return {
    dia: n(sys && sys.aiTopeDiaUsd, TOPE_DIA_USD),
    mes: n(sys && sys.aiTopeMesUsd, TOPE_MES_USD),
  };
}

/**
 * ¿Puede este local seguir gastando en IA?
 * Devuelve { ok, motivo, gastoDia, gastoMes, topeDia, topeMes }.
 *
 * Falla ABIERTO: si Firestore no responde, el bot sigue contestando. Un local
 * mudo por un error de lectura es peor que unos centavos de más — y el tope
 * mensual sigue ahí para atajarlo en la siguiente llamada que sí lea.
 */
async function puedeGastar(tid, sys = null) {
  try {
    const s = sys || (await db.doc(`_system/${tid}`).get()).data() || {};
    const topes = topesDe(s);
    if (!topes.dia && !topes.mes) return { ok: true, sinTope: true };

    const [dSnap, mSnap] = await Promise.all([
      db.doc(`_metrics/ai_dia_${tid}_${diaCL()}`).get(),
      db.doc(`_metrics/ai_vendor_${tid}_${mesCL()}`).get(),
    ]);
    const gastoDia = Number(dSnap.data()?.costUsd) || 0;
    const gastoMes = Number(mSnap.data()?.costUsd) || 0;

    const base = { gastoDia, gastoMes, topeDia: topes.dia, topeMes: topes.mes };
    if (topes.dia && gastoDia >= topes.dia) return { ...base, ok: false, motivo: 'dia' };
    if (topes.mes && gastoMes >= topes.mes) return { ...base, ok: false, motivo: 'mes' };
    return { ...base, ok: true };
  } catch (e) {
    return { ok: true, error: e.message };   // falla abierto, a propósito
  }
}

module.exports = {
  puedeGastar,
  topesDe,
  TOPE_DIA_USD,
  TOPE_MES_USD,
  AVISO_PCT,
  _diaCL: diaCL,
  _mesCL: mesCL,
};
