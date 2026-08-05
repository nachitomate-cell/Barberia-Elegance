#!/usr/bin/env node
/**
 * Reasigna al doc CANÓNICO todo lo que quedó apuntando a un link-doc de SSO.
 *
 * Un link-doc es el documento extra de `barberos/` cuyo id ES el UID de Firebase
 * Auth y que solo lleva `{ _mainDocId }` hacia el canónico: existe para que la
 * persona pueda entrar con un segundo email. No es otra persona. Cuando una cita
 * o una venta se graba contra ÉL, esa plata queda colgando de un fantasma: en
 * Comisiones aparece como alguien más a quien pagar y con la comisión por
 * defecto en vez de la suya.
 *
 * NO toca `slotLocks`: su docId codifica el barberoId (`{barbero}_{fecha}_{hora}`),
 * así que cambiar solo el campo lo dejaría incoherente, y arreglarlos de verdad
 * obliga a borrar y recrear. Son candados de agenda de fechas ya pasadas —
 * inertes, y `asegurarSlot` los auto-sana. Se reportan aparte.
 *
 * NO borra ningún link-doc: su id es el UID con el que `AuthContext` resuelve el
 * rol al iniciar sesión. Borrarlo deja a la persona sin acceso.
 *
 *   node scripts/reparar-barberos-fantasma.js              → simulacro
 *   node scripts/reparar-barberos-fantasma.js --commit     → aplica
 *   node scripts/reparar-barberos-fantasma.js --commit --adoptar-huerfanos
 *        además convierte en canónico al link-doc cuyo destino no existe
 */
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const admin = require(require.resolve('firebase-admin', { paths: [path.join(ROOT, 'functions')] }));
admin.initializeApp({ credential: admin.credential.cert(require(path.join(ROOT, 'service-account.json'))) });
const db = admin.firestore();

const COMMIT    = process.argv.includes('--commit');
const HUERFANOS = process.argv.includes('--adoptar-huerfanos');
const SALTAR    = new Set(['barberos', 'slotLocks']);

(async () => {
  console.log(COMMIT ? '⚠  MODO ESCRITURA\n' : '🔍 Simulacro (sin --commit no se escribe nada)\n');

  const refs = await db.collection('tenants').listDocuments();
  let totalDocs = 0, totalLocks = 0, huerfanosVistos = 0, huerfanosAdoptados = 0;
  const resumen = [];

  for (const tRef of refs) {
    const tid  = tRef.id;
    const snap = await db.collection(`tenants/${tid}/barberos`).get();
    if (snap.empty) continue;
    const barberos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const links    = barberos.filter(b => b._mainDocId);
    if (!links.length) continue;

    const lineas = [];

    // ── Link-docs cuyo canónico no existe ──
    for (const l of links.filter(x => !barberos.some(b => b.id === x._mainDocId))) {
      huerfanosVistos++;
      lineas.push(`  🟠 HUÉRFANO ${l.id} → «${l._mainDocId}» no existe  (${l.nombre})`);
      if (HUERFANOS && COMMIT) {
        await db.doc(`tenants/${tid}/barberos/${l.id}`)
          .update({ _mainDocId: admin.firestore.FieldValue.delete() });
        huerfanosAdoptados++;
        lineas.push('     → se le quitó _mainDocId: ahora es su propio canónico');
      }
    }

    // ── Reasignación de referencias ──
    const conCanonico = links.filter(x => barberos.some(b => b.id === x._mainDocId));
    if (!conCanonico.length) { if (lineas.length) resumen.push([tid, lineas]); continue; }

    // Sin muestreo: se consulta TODA subcolección por cada fantasma. Un doc
    // suelto en una colección inesperada es justo lo que un muestreo pierde.
    const cols = await db.doc(`tenants/${tid}`).listCollections();
    for (const col of cols) {
      if (SALTAR.has(col.id)) continue;
      for (const l of conCanonico) {
        const hits = await col.where('barberoId', '==', l.id).get();
        if (hits.empty) continue;
        const canon = barberos.find(b => b.id === l._mainDocId);
        lineas.push(`  · ${col.id}: ${hits.size} → ${canon.id}  («${l.nombre}»)`);
        totalDocs += hits.size;

        if (COMMIT) {
          for (let i = 0; i < hits.docs.length; i += 400) {
            const batch = db.batch();
            for (const d of hits.docs.slice(i, i + 400)) {
              const patch = { barberoId: canon.id };
              // Solo se reescribe el nombre si el doc ya traía ese campo: no se
              // inventan campos nuevos en colecciones que no los usan.
              if ('barberoNombre' in (d.data() || {})) patch.barberoNombre = canon.nombre || '';
              batch.update(d.ref, patch);
            }
            await batch.commit();
          }
        }
      }
    }

    // ── slotLocks: se cuentan y se informan, no se tocan ──
    for (const l of conCanonico) {
      const locks = await db.collection(`tenants/${tid}/slotLocks`).where('barberoId', '==', l.id).get();
      if (!locks.empty) {
        totalLocks += locks.size;
        lineas.push(`  ⏭  slotLocks: ${locks.size} sin tocar (docId codifica el barbero; fechas pasadas)`);
      }
    }

    if (lineas.length) resumen.push([tid, lineas]);
  }

  resumen.forEach(([tid, lineas]) => {
    console.log(`\n═══ ${tid} ═══`);
    lineas.forEach(l => console.log(l));
  });

  console.log(`\n\n═══ RESUMEN ═══`);
  console.log(`Documentos reasignados ....... ${totalDocs}${COMMIT ? '' : ' (simulacro)'}`);
  console.log(`slotLocks omitidos ........... ${totalLocks}`);
  console.log(`Link-docs huérfanos .......... ${huerfanosVistos}${HUERFANOS && COMMIT ? ` · adoptados: ${huerfanosAdoptados}` : ''}`);
  if (!COMMIT) console.log('\nCorre con --commit para aplicarlo.');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
