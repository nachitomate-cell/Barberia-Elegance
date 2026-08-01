/**
 * recategorizar-servicios-renacer.js — devuelve a los 63 servicios de Renacer
 * las categorías reales que tenían en AgendaPro.
 *
 * Qué pasó: la migración trajo los 63 servicios completos (no falta ninguno),
 * pero aplastó SIETE categorías en tres genéricas — Barbería / Estética /
 * Peluquería. El daño es doble:
 *   · El cliente ve un cajón "Estética" con 37 servicios donde conviven una
 *     depilación de cejas y una barba masculina.
 *   · Servicios homónimos de hombre y mujer (Axilas, Brazo, Manos y Dedos,
 *     Medio Brazo, Pies) quedaron indistinguibles: mismo nombre, sin nada que
 *     diga a quién corresponde cada precio.
 *
 * Además el tenant no tiene `configuracion/main.categoriasServicio`, así que
 * el panel solo ofrecía "Otro" al editar un servicio: sin eso, cualquier
 * corrección a mano volvía a romper la categoría.
 *
 * Desambiguación: se busca por nombre + PRECIO (y duración si hace falta).
 * "Manos y Dedos" y "Pies" están duplicados EXACTOS (mismo nombre, precio y
 * duración) porque en AgendaPro uno vive en cada depilación: hay exactamente
 * dos de cada uno, así que el primero va a femenina y el segundo a masculina.
 *
 * Uso:  node scripts/recategorizar-servicios-renacer.js            (dry-run)
 *       node scripts/recategorizar-servicios-renacer.js --commit
 */
const path  = require('path');
const admin = require('firebase-admin');

const sa = require(path.resolve(__dirname, '..', 'service-account.json'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const TENANT = 'renacer';
const COMMIT = process.argv.includes('--commit');
const col = db.collection('tenants').doc(TENANT).collection('servicios');

// Orden de aparición en la agenda pública = orden de este array.
const CATS = {
  PROMO:   'Promociones',
  BARBER:  'Barbería y cuidado masculino',
  FEM:     'Corte femenino y tratamientos capilares',
  COLOR:   'Color',
  DEP_F:   'Depilación femenina',
  DEP_M:   'Depilación masculina',
};
const CATEGORIAS = [CATS.PROMO, CATS.BARBER, CATS.FEM, CATS.COLOR, CATS.DEP_F, CATS.DEP_M];

const norm = (s) => String(s || '')
  .toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
  .replace(/[^a-z0-9+]+/g, ' ').trim();

/* Catálogo real de AgendaPro: [nombre, precio, categoría].
   El precio es el desempate cuando el nombre se repite entre depilación
   femenina y masculina. */
const CATALOGO = [
  ['Promo Cobertura de Canas',                            50000, CATS.PROMO],
  ['Promo Corte de Cabello Femenino + Nutrición',         25000, CATS.PROMO],

  ['Corte de Cabello Masculino',                          13000, CATS.BARBER],
  ['Corte Masculino + Barba',                             20000, CATS.BARBER],
  ['Corte Masculino + Perfilado de Cejas',                14000, CATS.BARBER],
  ['Lavado Delux Masculino',                               4000, CATS.BARBER],
  ['Limpieza Facial Maculina',                            10000, CATS.BARBER],
  ['Ondulación Permanente',                               35000, CATS.BARBER],
  ['Perfilado de Barba',                                  10000, CATS.BARBER],
  ['Perfilado De Cejas Masculino',                         3000, CATS.BARBER],
  ['Promoción estudiantes',                               11000, CATS.BARBER],

  ['Alisado Orgánico',                                    45000, CATS.FEM],
  ['Corte de Cabello Femenino',                           16000, CATS.FEM],
  ['Corte de Cabello Femenino + Peinado',                 20000, CATS.FEM],
  ['Lavado + brushing',                                   13000, CATS.FEM],
  ['Masaje Nutritivo Standar',                            20000, CATS.FEM],
  ['Nutrición Premium L’Oreal',                           30000, CATS.FEM],

  ['Baño de Color + Tratamiento Loreal',                  45000, CATS.COLOR],
  ['Barrido de color + corrección de Color',              50000, CATS.COLOR],
  ['Cobertura de Canas Premium Sin amoniaco',             40000, CATS.COLOR],
  ['Cobertura de Canas Premium sin Amoniaco + Baño Color',45000, CATS.COLOR],
  ['Cobertura de Canas Standar',                          35000, CATS.COLOR],
  ['Cobertura de Canas Standar + Baño de Color',          40000, CATS.COLOR],
  ['Lavado Matizante',                                    20000, CATS.COLOR],
  ['Morena Iluminada',                                    70000, CATS.COLOR],
  ['Visos & Dimensión Capilar',                           50000, CATS.COLOR],

  ['Abdomen',                    7000,  CATS.DEP_F],
  ['Axilas',                     4500,  CATS.DEP_F],
  ['Brazo',                      8500,  CATS.DEP_F],
  ['Colales',                    9000,  CATS.DEP_F],
  ['Cuello',                     3000,  CATS.DEP_F],
  ['Depilación bozo',            2000,  CATS.DEP_F],
  ['Depilación Cejas',           4000,  CATS.DEP_F],
  ['Depilación Mentón',          2000,  CATS.DEP_F],
  ['Depilación Nariz',           2000,  CATS.DEP_F],
  ['Espalda Completa',          10000,  CATS.DEP_F],
  ['Glúteos',                    6000,  CATS.DEP_F],
  ['Media Espalda',              5000,  CATS.DEP_F],
  ['Media Pierna',               6500,  CATS.DEP_F],
  ['Medio Brazo',                6500,  CATS.DEP_F],
  ['Muslo',                      6000,  CATS.DEP_F],
  ['Nuca',                       4000,  CATS.DEP_F],
  ['Pierna Completa',            8500,  CATS.DEP_F],
  ['Promocion Rostro Completo', 14000,  CATS.DEP_F],
  ['Rebaje Completo',           13000,  CATS.DEP_F],
  ['Rebaje largo',               7000,  CATS.DEP_F],

  ['Axilas',                     6000,  CATS.DEP_M],
  ['Barba',                     12000,  CATS.DEP_M],
  ['Brazo',                     13000,  CATS.DEP_M],
  ['Cejas',                      4000,  CATS.DEP_M],
  ['Espalda',                   18000,  CATS.DEP_M],
  ['Frente',                     3000,  CATS.DEP_M],
  ['Medio Brazo',                9000,  CATS.DEP_M],
  ['Nariz',                      2000,  CATS.DEP_M],
  ['Orejas',                     5000,  CATS.DEP_M],
  ['Pecho Completo',            18000,  CATS.DEP_M],
  ['Perfilado Barba',            8000,  CATS.DEP_M],
  ['Pómulos',                    3000,  CATS.DEP_M],
  ['Rostro Completo',           18000,  CATS.DEP_M],
];

// Duplicados EXACTOS (nombre + precio + duración iguales): uno a cada
// depilación, en el orden en que vengan.
const REPARTIDOS = {
  'manos y dedos': [CATS.DEP_F, CATS.DEP_M],
  'pies':          [CATS.DEP_F, CATS.DEP_M],
};

async function main() {
  const snap = await col.get();
  console.log(`\n╔═══ Recategorizar servicios RENACER — ${COMMIT ? 'COMMIT' : 'DRY-RUN'} ═══╗`);
  console.log(`Servicios en Firestore: ${snap.size}\n`);

  const usados = new Set();          // índices del catálogo ya asignados
  const turnos = {};                 // reparto de los duplicados exactos
  const cambios = [];
  const sinMatch = [];

  snap.forEach((doc) => {
    const x = doc.data();
    const n = norm(x.nombre);
    const precio = Number(x.precio) || 0;

    if (REPARTIDOS[n]) {
      const i = turnos[n] = (turnos[n] || 0);
      const cat = REPARTIDOS[n][i] || REPARTIDOS[n][REPARTIDOS[n].length - 1];
      turnos[n] = i + 1;
      if (x.categoria !== cat) cambios.push({ id: doc.id, nombre: x.nombre, de: x.categoria, a: cat });
      return;
    }

    // Nombre + precio; si el nombre es único basta el nombre.
    let idx = CATALOGO.findIndex((c, i) => !usados.has(i) && norm(c[0]) === n && c[1] === precio);
    if (idx === -1) idx = CATALOGO.findIndex((c, i) => !usados.has(i) && norm(c[0]) === n);
    if (idx === -1) { sinMatch.push(`${x.nombre} ($${precio})`); return; }

    usados.add(idx);
    const cat = CATALOGO[idx][2];
    if (x.categoria !== cat) cambios.push({ id: doc.id, nombre: x.nombre, de: x.categoria, a: cat });
  });

  const faltantes = CATALOGO.filter((_, i) => !usados.has(i)).map(c => `${c[0]} ($${c[1]}) → ${c[2]}`);

  const porCat = {};
  cambios.forEach(c => { porCat[c.a] = (porCat[c.a] || 0) + 1; });
  console.log('Recategorizaciones por destino:');
  CATEGORIAS.forEach(c => console.log(`   ${String(porCat[c] || 0).padStart(3)} → ${c}`));
  console.log(`\nTotal a cambiar: ${cambios.length}`);
  console.log(`Sin match en el catálogo (se dejan como están): ${sinMatch.length}${sinMatch.length ? '\n   · ' + sinMatch.join('\n   · ') : ''}`);
  console.log(`Del catálogo sin servicio en Firestore: ${faltantes.length}${faltantes.length ? '\n   · ' + faltantes.join('\n   · ') : ''}`);

  if (!COMMIT) { console.log('\nℹ️  Dry-run: nada escrito. Corre con --commit.\n'); process.exit(0); }

  // Las categorías del tenant: sin esto el panel solo ofrece "Otro" al editar
  // un servicio y la próxima corrección a mano vuelve a romperlo.
  await db.collection('tenants').doc(TENANT).collection('configuracion').doc('main')
    .set({ categoriasServicio: CATEGORIAS }, { merge: true });
  console.log(`\n✓ configuracion/main.categoriasServicio = ${CATEGORIAS.length} categorías`);

  let batch = db.batch(), ops = 0;
  for (const c of cambios) {
    batch.set(col.doc(c.id), { categoria: c.a }, { merge: true });
    if (++ops >= 400) { await batch.commit(); batch = db.batch(); ops = 0; }
  }
  if (ops) await batch.commit();
  console.log(`✓ ${cambios.length} servicios recategorizados\n`);
  process.exit(0);
}
main().catch(e => { console.error('❌', e.message); process.exit(1); });
