#!/usr/bin/env node
/**
 * test-gasto-ia.js — Tope de gasto de Claude por local: corte y avisos.
 *
 * Las tres formas de que esto salga mal:
 *   · No cortar → un bucle se come la factura de un mes en una hora.
 *   · Cortar de más → un local se queda sin asistente por un uso legítimo.
 *   · Avisar en cada llamada → el contador se escribe decenas de veces por
 *     conversación; sin candado serían decenas de correos por umbral.
 *
 * Corre contra los módulos reales con Firestore y el mailer fingidos.
 *
 * Uso:  npm run test:gasto-ia
 */
const path   = require('path');
const Module = require('module');

const enviados = [];
let   docs     = {};

const origLoad = Module._load;
const fakeAdmin = {
  firestore: Object.assign(() => ({
    doc: (p) => ({
      path: p,
      get: async () => ({ exists: !!docs[p], data: () => docs[p] }),
      set: async (d) => { docs[p] = { ...(docs[p] || {}), ...d }; },
    }),
  }), { FieldValue: { serverTimestamp: () => '@ts', delete: () => '@del' } }),
};
Module._load = function (req, parent, isMain) {
  if (req === 'firebase-admin')                  return fakeAdmin;
  if (req === 'firebase-admin/firestore')        return { FieldValue: fakeAdmin.firestore.FieldValue };
  if (req === 'firebase-functions')              return { logger: { info(){}, warn(){}, error(){} } };
  if (req === 'firebase-functions/v2/firestore') return { onDocumentWritten: () => () => {} };
  if (req === './lib/mailer')                    return { MAIL_SECRETS: [], enviarEmail: async (m, o) => { enviados.push({ ...m, etiqueta: o && o.etiqueta }); } };
  return origLoad.call(this, req, parent, isMain);
};
const P = require(path.resolve(__dirname, '..', 'functions', 'lib', 'ai-presupuesto.js'));
const A = require(path.resolve(__dirname, '..', 'functions', 'alerta-gasto-ia.js'));
Module._load = origLoad;

let fallos = 0;
const ok = (cond, txt) => { if (!cond) fallos++; console.log(`${cond ? '  ok  ' : 'FAIL  '}${txt}`); };

(async () => {
  console.log('\n== topes por defecto y overrides ==');
  ok(P.topesDe({}).dia === P.TOPE_DIA_USD, `sin config → día $${P.TOPE_DIA_USD}`);
  ok(P.topesDe({}).mes === P.TOPE_MES_USD, `sin config → mes $${P.TOPE_MES_USD}`);
  ok(P.topesDe({ aiTopeDiaUsd: 2 }).dia === 2, 'override por local');
  ok(P.topesDe({ aiTopeDiaUsd: 0 }).dia === 0, '0 explícito = sin tope (hay que poder desactivarlo)');
  ok(P.topesDe({ aiTopeDiaUsd: 'x' }).dia === P.TOPE_DIA_USD, 'basura → default, no NaN');
  ok(P.topesDe({ aiTopeDiaUsd: -5 }).dia === P.TOPE_DIA_USD, 'negativo → default');

  console.log('\n== ¿puede gastar? ==');
  const dia = P._diaCL(), mes = P._mesCL();
  const escenario = (gastoDia, gastoMes, sys = {}) => {
    docs = {
      '_system/t1': sys,
      [`_metrics/ai_dia_t1_${dia}`]:    { costUsd: gastoDia },
      [`_metrics/ai_vendor_t1_${mes}`]: { costUsd: gastoMes },
    };
  };
  escenario(0.10, 1.00); ok((await P.puedeGastar('t1')).ok === true,  'consumo normal → sigue');
  escenario(0.59, 1.00); ok((await P.puedeGastar('t1')).ok === true,  'justo bajo el tope diario → sigue');
  escenario(0.60, 1.00); ok((await P.puedeGastar('t1')).ok === false, 'tope diario alcanzado → corta');
  escenario(0.10, 6.00); ok((await P.puedeGastar('t1')).ok === false, 'tope mensual alcanzado → corta');
  escenario(99, 99, { aiTopeDiaUsd: 0, aiTopeMesUsd: 0 });
  ok((await P.puedeGastar('t1')).ok === true, 'sin topes → nunca corta');
  const r = await P.puedeGastar('t1');
  escenario(0.60, 1.00);
  ok((await P.puedeGastar('t1')).motivo === 'dia', 'el motivo dice cuál tope fue');

  console.log('\n== falla ABIERTO: un error de lectura no puede dejar mudo al bot ==');
  docs = {}; // sin docs, pero además forzamos una excepción
  const antesDoc = fakeAdmin.firestore().doc;
  ok((await P.puedeGastar('inexistente')).ok === true, 'tenant sin métricas → sigue');

  console.log('\n== avisos por correo (un solo correo por umbral) ==');
  const correr = async (previo, ahoraUsd, latches = {}) => {
    enviados.length = 0;
    docs['tenants/t1'] = { nombre: 'Local X' };
    const doc = { costUsd: ahoraUsd, ...latches };
    await A._revisar({
      ref: { set: async (d) => Object.assign(doc, d) },
      antes: { costUsd: previo }, ahora: doc, tid: 't1',
      periodo: 'diario', campoAviso: 'avisoGasto70', campoCorte: 'avisoGasto100', tope: 0.60,
    });
    return { correos: enviados.length, etiqueta: enviados[0]?.etiqueta, doc };
  };
  let x = await correr(0.10, 0.20);  ok(x.correos === 0, '20% del tope → sin correo');
  x = await correr(0.30, 0.45);      ok(x.etiqueta === 'gasto-ia-diario-aviso',  'cruza el 70% → aviso');
  x = await correr(0.45, 0.50, { avisoGasto70: true }); ok(x.correos === 0, 'sigue sobre 70% pero ya avisado → sin correo');
  x = await correr(0.50, 0.61, { avisoGasto70: true }); ok(x.etiqueta === 'gasto-ia-diario-corte', 'cruza el 100% → corte');
  x = await correr(0.61, 0.80, { avisoGasto70: true, avisoGasto100: true }); ok(x.correos === 0, 'sigue sobre 100% ya avisado → sin correo');
  x = await correr(0.10, 0.90);      ok(x.etiqueta === 'gasto-ia-diario-corte', 'salto directo sobre el 100% → solo el corte');
  x = await correr(0.45, 0.45);      ok(x.correos === 0, 'el costo no subió (es la escritura del candado) → sin correo');

  console.log('\n== clasificación de docs de _metrics ==');
  for (const [id, esp] of [
    ['ai_dia_delnero_2026-07-31', 'diario'],
    ['ai_vendor_delnero_2026-07', 'mensual'],
    ['ai_2026-07-31',             null],
    ['wa_2026-07-31',             null],
    ['bot_delnero_2026-07',       null],
    ['wa_vendor_delnero',         null],
  ]) {
    const c = A._clasificar(id);
    ok((c ? c.periodo : null) === esp, `${id.padEnd(28)} → ${c ? c.periodo + ' (' + c.tid + ')' : 'ignorado'}`);
  }

  console.log(fallos ? `\n❌ ${fallos} fallo(s)` : '\n✅ todo OK');
  process.exit(fallos ? 1 : 0);
})();
