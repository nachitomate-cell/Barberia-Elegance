#!/usr/bin/env node
/**
 * test-duracion-tipica.js — con qué duración se calculan las horas cuando el
 * cliente todavía no dijo qué servicio quiere.
 *
 * Pasó de verdad: kronnos_penablanca, sábado 1-ago. El chat público ofreció
 * las 12:00; Araceli y Evelyn solo tenían el hueco 12:00–12:15 entre dos
 * cortes y el Corte Masculino dura 45 min. El cliente clickeó, no pudo
 * reservar y escribió "la página web tiene un error al parecer".
 * Causa: sin servicio elegido la ventana validada caía al paso de la grilla
 * (`intervaloMinutos` = 15 en ese local), no a una duración real.
 *
 * La mediana del catálogo es el reemplazo, NO la moda: hay locales con muchos
 * tratamientos largos donde la moda se dispara (latincaribe 240, omega 300,
 * yugen 180) y el chat dejaría de ofrecer horas que sí existen.
 *
 * Se prueba la decisión pura, sin Firestore ni red.
 *
 * Uso:  npm run test:duracion
 */
const Module = require('module');

/* ── Doble de Firestore: solo lo que toca duracionTipica ── */
const store = { servicios: [], conf: {}, explota: false };

const snapServicios = () => ({
  forEach: (f) => store.servicios.forEach((s, i) => f({ id: `s${i}`, data: () => s })),
});

function colStub(kind) {
  return {
    get: async () => {
      if (kind === 'servicios' && store.explota) throw new Error('permission-denied');
      return kind === 'servicios' ? snapServicios() : { forEach: () => {} };
    },
    doc: (id) => docStub(kind, id),
    collection: (name) => colStub(name),
  };
}
function docStub(kind) {
  return {
    get: async () => (kind === 'configuracion'
      ? { exists: true, data: () => store.conf }
      : { exists: false, data: () => ({}) }),
    collection: (name) => colStub(name),
  };
}
const fakeDb = { collection: (n) => colStub(n), doc: () => docStub('doc') };

const origLoad = Module._load;
Module._load = function (req) {
  if (req === 'firebase-admin')                 return { firestore: () => fakeDb };
  if (req === 'firebase-functions')             return { logger: { info(){}, warn(){}, error(){} } };
  if (req === 'firebase-functions/v2/https')    return { onCall: () => () => {}, HttpsError: class extends Error {} };
  return origLoad.apply(this, arguments);
};

const { _duracionTipica: duracionTipica } = require('../functions/chat-horas-disponibles');

Module._load = origLoad;

/* ── Runner ── */
let fallos = 0;
async function caso(titulo, { servicios, step = 30, explota = false }, esperado) {
  store.servicios = servicios.map(d => (typeof d === 'number' ? { duracion: d } : d));
  store.conf = { intervaloMinutos: step };
  store.explota = explota;
  const r = await duracionTipica('t1');
  const ok = r === esperado;
  if (!ok) fallos++;
  console.log(`  ${ok ? '✓' : '✗'} ${titulo}`);
  if (!ok) console.log(`      esperaba ${esperado} min, salió ${r} min`);
}

(async () => {
  console.log('\n⏱  duracionTipica — la ventana que se asume sin servicio elegido\n');

  // Catálogo real de kronnos_penablanca (el caso que rompió).
  const PENABLANCA = [45, 130, 35, 30, 60, 45, 10, 45, 20, 30, 45, 55, 30, 5, 75, 60, 10, 30];
  await caso('kronnos_penablanca real → 45 min (mata el 12:00 falso)', { servicios: PENABLANCA, step: 15 }, 45);

  await caso('mediana simple (impar)', { servicios: [10, 30, 60] }, 30);
  await caso('mediana par: toma el superior', { servicios: [20, 30, 40, 50] }, 40);

  // Un catálogo dominado por tratamientos largos: la MODA sería 240 y el chat
  // se quedaría mudo. La mediana lo mantiene en tierra.
  await caso('catálogo con cola larga: no se dispara como la moda',
    { servicios: [15, 20, 30, 30, 240, 240, 240] }, 30);

  await caso('piso en el paso de la grilla (renacer: mediana 15, step 30)',
    { servicios: [5, 10, 15, 20, 25], step: 30 }, 30);
  await caso('nunca ofrece MÁS que antes: el resultado siempre ≥ step',
    { servicios: [10, 10, 10], step: 45 }, 45);

  await caso('ignora servicios desactivados',
    { servicios: [{ duracion: 5, activo: false }, { duracion: 60 }, { duracion: 60 }] }, 60);
  await caso('acepta duracionServicio como alias',
    { servicios: [{ duracionServicio: 50 }, { duracionServicio: 50 }, { duracionServicio: 50 }] }, 50);
  await caso('descarta duraciones basura (0, null, texto)',
    { servicios: [{ duracion: 0 }, { duracion: null }, { duracion: 'x' }, { duracion: 40 }] }, 40);

  await caso('catálogo vacío → fallback 30', { servicios: [] }, 30);
  await caso('catálogo vacío con step mayor → step', { servicios: [], step: 60 }, 60);
  await caso('si Firestore falla, no rompe la disponibilidad', { servicios: [45], explota: true }, 30);

  if (fallos) { console.log(`\n❌ ${fallos} caso(s) fallaron.\n`); process.exit(1); }
  console.log('\n✅ Todo en orden — ventana realista por local, nunca menor a la de antes.\n');
})();
