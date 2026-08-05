#!/usr/bin/env node
/**
 * Prueba `dedupeBarberos` — el filtro que evita que un link-doc de SSO se
 * muestre como una persona más o se pueda elegir como vendedor.
 *
 * Corre DOS baterías:
 *   1. Casos sintéticos (no necesita credenciales).
 *   2. Los datos REALES de los 35 locales, si hay service-account.json. Es la
 *      que importa: la auditoría del 2026-08-05 encontró 60 link-docs en 19
 *      locales, y esta batería falla si alguno vuelve a colarse.
 *
 *   npm run test:dedupe-barberos
 */
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const LIB = pathToFileURL(path.join(ROOT, 'admin-panel', 'src', 'lib', 'dedupeBarberos.js')).href;

let fallos = 0;
const ok   = (m) => console.log(`  ✅ ${m}`);
const fail = (m) => { console.log(`  ❌ ${m}`); fallos++; };
const check = (cond, m) => (cond ? ok(m) : fail(m));

(async () => {
  const { dedupeBarberos } = await import(LIB);

  /* ───────────────── 1. Casos sintéticos ───────────────── */
  console.log('\n── Casos sintéticos ──');

  const conLink = [
    { id: '2pSq', nombre: 'Araceli', activo: true, _mainDocId: 'araceli' },
    { id: 'araceli', nombre: 'Araceli', activo: true, authUid: '2pSq', comision: 42 },
  ];
  const r1 = dedupeBarberos(conLink);
  check(r1.length === 1 && r1[0].id === 'araceli', 'el link-doc se descarta y queda el canónico');

  // El caso delnero: canónico sin `activo`, dos link-docs activos.
  const delnero = [
    { id: 'P7BT', nombre: 'Vicente Maira', activo: true, _mainDocId: 'BmGj' },
    { id: 'sHcT', nombre: 'Vicente Maira', activo: true, _mainDocId: 'BmGj' },
    { id: 'BmGj', nombre: 'Vicente Maira' },   // activo: undefined
  ];
  const r2 = dedupeBarberos(delnero);
  check(r2.length === 1 && r2[0].id === 'BmGj',
    'canónico sin campo `activo` sobrevive y los dos link-docs se van');

  const conBaja = [
    { id: 'a', nombre: 'Ana', activo: false },
    { id: 'b', nombre: 'Beto', activo: true },
  ];
  check(dedupeBarberos(conBaja).length === 1, 'soloActivos descarta a los dados de baja');
  check(dedupeBarberos(conBaja, { soloActivos: false }).length === 2,
    'soloActivos:false los conserva (Comisiones necesita pagarles)');

  const conQA = [{ id: 'q', nombre: 'QA', activo: true, esQA: true }, { id: 'r', nombre: 'Real', activo: true }];
  check(dedupeBarberos(conQA).length === 1, 'el barbero de QA queda fuera por defecto');
  check(dedupeBarberos(conQA, { verQA: true }).length === 2, 'verQA lo devuelve');

  const mismaPersona = [
    { id: 'x1', nombre: 'Carlos', activo: true, authUid: 'UID-1' },
    { id: 'x2', nombre: 'Carlos Segundo Doc', activo: true, authUid: 'UID-1' },
  ];
  check(dedupeBarberos(mismaPersona).length === 1, 'dos docs con el mismo authUid colapsan en uno');

  const orden = [{ id: 'z', nombre: 'Zoe', activo: true }, { id: 'a', nombre: 'Ana', activo: true }];
  check(dedupeBarberos(orden)[0].nombre === 'Ana', 'ordena por nombre, no por docId');

  check(dedupeBarberos(null).length === 0 && dedupeBarberos(undefined).length === 0,
    'tolera una lista vacía o nula');

  /* ───────────────── 2. Datos reales ───────────────── */
  const cred = path.join(ROOT, 'service-account.json');
  if (!fs.existsSync(cred)) {
    console.log('\n⚠  Sin service-account.json: se omite la batería contra producción.');
  } else {
    console.log('\n── Datos reales de producción ──');
    const admin = require(require.resolve('firebase-admin', { paths: [path.join(ROOT, 'functions')] }));
    admin.initializeApp({ credential: admin.credential.cert(require(cred)) });
    const db = admin.firestore();

    const refs = await db.collection('tenants').listDocuments();
    let totalLink = 0, totalAntes = 0, totalDespues = 0, tenantsConLink = 0;
    const problemas = [];

    for (const ref of refs) {
      const snap = await db.collection(`tenants/${ref.id}/barberos`).get();
      if (snap.empty) continue;
      const raw = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const links = raw.filter(b => b._mainDocId);
      if (links.length) { tenantsConLink++; totalLink += links.length; }

      // Comisiones usa soloActivos:false — es el caso más permisivo, el que más
      // fácil deja pasar un fantasma. Si acá está limpio, el resto también.
      const out = dedupeBarberos(raw, { soloActivos: false });
      totalAntes += raw.length;
      totalDespues += out.length;

      if (out.some(b => b._mainDocId)) problemas.push(`${ref.id}: sobrevivió un link-doc`);

      const claves = out.map(b => String(b.authUid || b.uid || (b.nombre || '').trim().toLowerCase() || b.id));
      if (new Set(claves).size !== claves.length) problemas.push(`${ref.id}: quedaron identidades repetidas`);

      // Toda persona con link-doc tiene que seguir presente por su canónico.
      for (const l of links) {
        const canonExiste = raw.some(b => b.id === l._mainDocId);
        if (canonExiste && !out.some(b => b.id === l._mainDocId)) {
          problemas.push(`${ref.id}: se perdió el canónico ${l._mainDocId} de «${l.nombre}»`);
        }
      }
    }

    console.log(`  Locales con link-docs: ${tenantsConLink} · link-docs: ${totalLink}`);
    console.log(`  Docs antes: ${totalAntes} → después: ${totalDespues} (se ocultan ${totalAntes - totalDespues})`);
    check(totalLink > 0, 'la muestra realmente contiene link-docs (si no, el test no prueba nada)');
    problemas.forEach(fail);
    check(problemas.length === 0, 'ningún local queda con fantasmas ni con identidades repetidas');
  }

  console.log(fallos ? `\n❌ ${fallos} fallo(s)\n` : '\n✅ Todo en orden\n');
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
