#!/usr/bin/env node
/**
 * sync-restricciones-barbero.js — repara el caso "lo marqué en Equipo y no
 * aparece en la agenda".
 *
 * Hay DOS lugares donde se decide quién hace un servicio y solo uno gana:
 *
 *   · el servicio, con `barberosDisponibles` (Servicios → "Disponibilidad por
 *     barbero"), y
 *   · el profesional, con `serviciosIds` (Equipo → "Servicios que realiza").
 *
 * La semántica unificada del 07-08 (`_haceElServicio`, index.html) dice que si
 * el servicio restringe, esa lista MANDA y la del profesional se ignora. Es la
 * promesa de exclusividad del editor de servicios y está bien que sea así —
 * pero deja un modo de falla silencioso: cuando entra alguien NUEVO al equipo,
 * las restricciones viejas no lo conocen, sus casillas de Equipo no hacen nada
 * y la reserva pública nunca lo ofrece. Nadie ve un error.
 *
 * Pasó en kronnos_woman el 08-08-2026: Nicole entró el 07-08 con 37 de 43
 * servicios marcados y la pública solo la ofrecía en 3 — los únicos tres sin
 * restricción. 34 casillas eran letra muerta y ella cerró la semana con 0
 * citas.
 *
 * Este script toma la lista del PROFESIONAL como intención y la propaga a las
 * restricciones de los servicios: por cada servicio que él tiene marcado y que
 * restringe sin incluirlo, lo agrega a `barberosDisponibles`. Es aditivo — no
 * saca a nadie, no borra restricciones y no toca servicios sin restricción
 * (ahí `serviciosIds` ya manda y no hay nada que reparar).
 *
 * Uso:
 *   node scripts/sync-restricciones-barbero.js kronnos_woman 6rc2GmIYjD3sNj1joJNZ
 *   node scripts/sync-restricciones-barbero.js kronnos_woman 6rc2GmIYjD3sNj1joJNZ --apply
 *
 * Sin --apply solo muestra el plan. El id del barbero es el del doc CANÓNICO
 * (el que no tiene `_mainDocId`): es el que viaja en las citas y el que miran
 * los filtros. Con el id de un doc espejo aborta.
 */
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const admin = require(require.resolve('firebase-admin', { paths: [path.join(ROOT, 'functions')] }));
admin.initializeApp({
  credential: admin.credential.cert(require(path.join(ROOT, 'service-account.json'))),
});
const db = admin.firestore();

const [TID, BID] = process.argv.slice(2).filter(a => !a.startsWith('--'));
const APLICAR = process.argv.includes('--apply');

if (!TID || !BID) {
  console.error('uso: node scripts/sync-restricciones-barbero.js <tenant> <barberoId> [--apply]');
  process.exit(2);
}

(async () => {
  const t = db.collection('tenants').doc(TID);
  const bref = t.collection('barberos').doc(BID);
  const bsnap = await bref.get();
  if (!bsnap.exists) {
    console.error(`✗ no existe tenants/${TID}/barberos/${BID}`);
    process.exit(1);
  }
  const b = bsnap.data();
  if (b._mainDocId) {
    console.error(`✗ ${BID} es un doc espejo de SSO (_mainDocId=${b._mainDocId}). Corré con el id canónico.`);
    process.exit(1);
  }

  const marcados = Array.isArray(b.serviciosIds) ? b.serviciosIds.map(String) : [];
  console.log(`\n${b.nombre || BID} · ${TID}`);
  if (!marcados.length) {
    // Sin lista propia el profesional "hace todo", pero eso NO le gana a una
    // restricción del servicio. Es un caso distinto y ambiguo: no adivinamos.
    console.log('  sin `serviciosIds`: hace todo lo que no restrinja. Nada que propagar.');
    process.exit(0);
  }
  console.log(`  ${marcados.length} servicios marcados en Equipo\n`);

  const ss = await t.collection('servicios').get();
  const porId = new Map(ss.docs.map(d => [d.id, d]));

  const aParchar = [];
  let yaOk = 0, sinRestriccion = 0, fantasma = 0;

  for (const sid of marcados) {
    const d = porId.get(sid);
    if (!d) { fantasma++; continue; }          // marca a un servicio borrado
    const restr = Array.isArray(d.data().barberosDisponibles) ? d.data().barberosDisponibles.map(String) : [];
    if (!restr.length) { sinRestriccion++; continue; }
    if (restr.includes(String(BID))) { yaOk++; continue; }
    aParchar.push({ id: d.id, nombre: d.data().nombre || d.id, restr });
  }

  console.log(`  ✓ ${sinRestriccion} sin restricción (ya lo ofrecen)`);
  console.log(`  ✓ ${yaOk} restringidos y ya lo incluyen`);
  if (fantasma) console.log(`  ⚠ ${fantasma} marcas a servicios que ya no existen`);
  console.log(`  ${aParchar.length ? '🚩' : '✓'} ${aParchar.length} restringidos que lo EXCLUYEN (marca sin efecto)\n`);

  if (!aParchar.length) {
    console.log('Nada que hacer.\n');
    process.exit(0);
  }

  for (const s of aParchar) {
    console.log(`   · ${s.nombre.padEnd(38)} ${s.id.padEnd(30)} hoy=[${s.restr.join(', ')}]`);
  }

  if (!APLICAR) {
    console.log(`\n(dry-run) Volvé a correr con --apply para agregar a ${b.nombre || BID} en esos ${aParchar.length} servicios.\n`);
    process.exit(0);
  }

  // arrayUnion: aditivo e idempotente. Si dos personas corren esto a la vez no
  // se pisan y correrlo dos veces no duplica.
  const CHUNK = 400;                            // el batch de Firestore topa en 500
  for (let i = 0; i < aParchar.length; i += CHUNK) {
    const batch = db.batch();
    for (const s of aParchar.slice(i, i + CHUNK)) {
      batch.update(t.collection('servicios').doc(s.id), {
        barberosDisponibles: admin.firestore.FieldValue.arrayUnion(String(BID)),
      });
    }
    await batch.commit();
  }

  console.log(`\n✅ ${aParchar.length} servicios actualizados. ${b.nombre || BID} ya aparece en la reserva pública para todos ellos.\n`);
})().catch(e => { console.error('FALLÓ:', e); process.exit(1); });
