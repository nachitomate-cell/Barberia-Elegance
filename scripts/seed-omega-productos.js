/**
 * scripts/seed-omega-productos.js
 *
 * Siembra el catálogo de productos de omega bajo tenants/omega/productos/{id}.
 * Reusa los mismos 9 productos L3VEL3 + Nishman que el user ve en elegance
 * (con sus imágenes reales de Storage `productos/` — top-level, no tenanteadas).
 * Precios curados al mercado chileno 2026, descripciones tomadas de la vista
 * pública que envió el user.
 *
 * También activa la pestaña "Productos" del /dashboard:
 *   tenants/omega/config/ui.productosActivos = true
 *   tenants/omega/configuracion/main.productosActivos = true
 *
 * Uso:
 *   node scripts/seed-omega-productos.js           # dry-run
 *   node scripts/seed-omega-productos.js --commit  # escribe
 */

const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

const SA = path.join(__dirname, '..', 'service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(fs.readFileSync(SA, 'utf8'))),
  projectId: 'barberia-elegance',
});

const db = admin.firestore();
const TS = admin.firestore.FieldValue.serverTimestamp;

const TENANT_ID = 'omega';
const COMMIT    = process.argv.includes('--commit');

// URLs de Storage → mismas imágenes que ya usa el catálogo público de elegance.
// Todos están bajo /productos/ (no /tenants/elegance/productos/) porque son
// activos legacy sin namespacing por tenant. Reusadas también por alfamen.
const IMG = {
  l3vel3_matte_putty:      'https://firebasestorage.googleapis.com/v0/b/barberia-elegance.firebasestorage.app/o/productos%2F1778339352953_688835717_1002362832216852_1054647894637141225_n.jpg?alt=media&token=86200c52-1dd3-49e0-80ac-ff2d3f5b9d84',
  l3vel3_paste:            'https://firebasestorage.googleapis.com/v0/b/barberia-elegance.firebasestorage.app/o/productos%2F1778339278942_692447222_1682489793093882_4264514267853551734_n.jpg?alt=media&token=a560c4da-496b-4138-9866-628afd677c9d',
  l3vel3_pomade:           'https://firebasestorage.googleapis.com/v0/b/barberia-elegance.firebasestorage.app/o/productos%2F1778339309103_688925431_938370372327099_5108581816863624889_n.jpg?alt=media&token=343b22d6-3157-4244-a25a-0ce60ab5c4ea',
  l3vel3_forming_cream:    'https://firebasestorage.googleapis.com/v0/b/barberia-elegance.firebasestorage.app/o/productos%2F1778339242459_684280475_2055051721716151_2908765271490305126_n.jpg?alt=media&token=22aaa06e-bfee-46eb-ace5-8a4db8f8f181',
  l3vel3_aftershave_fresh: 'https://firebasestorage.googleapis.com/v0/b/barberia-elegance.firebasestorage.app/o/productos%2F1778339442972_684163789_1049085067443872_3072686142081223635_n.jpg?alt=media&token=b6f2633e-20d1-4a81-b9ff-a16dccb1edc2',
  l3vel3_aftershave_flame: 'https://firebasestorage.googleapis.com/v0/b/barberia-elegance.firebasestorage.app/o/productos%2F1778339373075_685496544_1488418015975731_9120326152668709284_n.jpg?alt=media&token=3f738005-d1d0-4125-8c41-de78890f3c79',
  nishman_s1_black_widow:  'https://firebasestorage.googleapis.com/v0/b/barberia-elegance.firebasestorage.app/o/productos%2F1778339180788_684478192_955335497521126_7974138679348882942_n.png?alt=media&token=bc9e9bb2-7191-4983-b91e-d3d8baacd56c',
  nishman_s3_blue_web:     'https://firebasestorage.googleapis.com/v0/b/barberia-elegance.firebasestorage.app/o/productos%2F1778337891307_689380752_1032805926077827_5173361570325935804_n.png?alt=media&token=abf3b598-1fdf-46e4-9bbf-2ec85966f384',
  nishman_s4_argan:        'https://firebasestorage.googleapis.com/v0/b/barberia-elegance.firebasestorage.app/o/productos%2F1778339133209_685103004_2012953566236369_8094435847563949826_n.jpg?alt=media&token=65a81faf-0471-4bd7-b11d-e28a975d2aad',
};

const PRODUCTOS = [
  {
    id:          'l3vel3-matte-putty',
    nombre:      'L3VEL3 Matte Putty',
    marca:       'L3VEL3',
    categoria:   'Peinado',
    precio:      19900,
    precioCosto: 9500,
    stock:       6,
    stockMinimo: 2,
    imagen:      IMG.l3vel3_matte_putty,
    descripcion: 'Masilla de fijación fuerte y acabado completamente mate. Ideal para lograr looks naturales y texturizados con la impresión de no llevar producto.',
  },
  {
    id:          'nishman-s4-argan',
    nombre:      'Nishman S4 Argan',
    marca:       'Nishman',
    categoria:   'Peinado',
    precio:      20000,
    precioCosto: 9500,
    stock:       6,
    stockMinimo: 2,
    imagen:      IMG.nishman_s4_argan,
    descripcion: 'Misma tecnología de peinado de fijación fuerte, enriquecida con extracto de aceite de argán para aportar un ligero acondicionamiento mientras moldeas.',
  },
  {
    id:          'l3vel3-aftershave-fresh',
    nombre:      'L3VEL3 Aftershave Cologne · Fresh',
    marca:       'L3VEL3',
    categoria:   'After Shave',
    precio:      21900,
    precioCosto: 10500,
    stock:       4,
    stockMinimo: 2,
    imagen:      IMG.l3vel3_aftershave_fresh,
    descripcion: 'Colonia post-afeitado que calma, hidrata y revitaliza la piel, reduciendo la irritación de la navaja o la máquina. Fresh: perfil aromático fresco, limpio y revitalizante.',
  },
  {
    id:          'l3vel3-aftershave-flame',
    nombre:      'L3VEL3 Aftershave Cologne · Flame',
    marca:       'L3VEL3',
    categoria:   'After Shave',
    precio:      21900,
    precioCosto: 10500,
    stock:       4,
    stockMinimo: 2,
    imagen:      IMG.l3vel3_aftershave_flame,
    descripcion: 'Colonia post-afeitado que calma, hidrata y revitaliza la piel. Flame: notas más intensas, cálidas y amaderadas.',
  },
  {
    id:          'nishman-s3-blue-web',
    nombre:      'Nishman S3 Blue Web',
    marca:       'Nishman',
    categoria:   'Peinado',
    precio:      19900,
    precioCosto: 9500,
    stock:       5,
    stockMinimo: 2,
    imagen:      IMG.nishman_s3_blue_web,
    descripcion: 'Textura fibrosa de fijación fuerte con un perfil aromático fresco y toques afrutados. Aporta cuerpo y separación sin sensación pegajosa.',
  },
  {
    id:          'l3vel3-pomade',
    nombre:      'L3VEL3 Pomade',
    marca:       'L3VEL3',
    categoria:   'Peinado',
    precio:      17900,
    precioCosto: 8500,
    stock:       6,
    stockMinimo: 2,
    imagen:      IMG.l3vel3_pomade,
    descripcion: 'Pomada clásica de acabado brillante y pulido con buena fijación. Ideal para peinados clásicos, slick back y degradados muy definidos.',
  },
  {
    id:          'l3vel3-paste',
    nombre:      'L3VEL3 Paste',
    marca:       'L3VEL3',
    categoria:   'Peinado',
    precio:      18900,
    precioCosto: 9000,
    stock:       6,
    stockMinimo: 2,
    imagen:      IMG.l3vel3_paste,
    descripcion: 'Pasta de peinado de fijación firme y acabado mate. Aporta textura y volumen manteniendo el cabello en su lugar sin dejarlo rígido, pegajoso o con aspecto húmedo.',
  },
  {
    id:          'l3vel3-forming-cream',
    nombre:      'L3VEL3 Forming Cream',
    marca:       'L3VEL3',
    categoria:   'Peinado',
    precio:      18900,
    precioCosto: 9000,
    stock:       5,
    stockMinimo: 2,
    imagen:      IMG.l3vel3_forming_cream,
    descripcion: 'Crema formadora de fijación media y brillo natural. Perfecta para estilos sueltos y flexibles que puedas reacomodar con las manos durante el día.',
  },
  {
    id:          'nishman-s1-black-widow',
    nombre:      'Nishman S1 Black Widow',
    marca:       'Nishman',
    categoria:   'Peinado',
    precio:      20900,
    precioCosto: 9800,
    stock:       4,
    stockMinimo: 2,
    imagen:      IMG.nishman_s1_black_widow,
    descripcion: 'Cera de efecto telaraña con fijación extra fuerte y un aroma intenso a colonia masculina. Deja el cabello estructurado con brillo controlado.',
  },
];

(async () => {
  console.log(`\n${COMMIT ? '🟢 COMMIT' : '🟡 DRY-RUN'} — sembrando ${PRODUCTOS.length} productos en tenants/${TENANT_ID}/productos`);

  const col = db.collection(`tenants/${TENANT_ID}/productos`);

  // Limpiar docs viejos con IDs incorrectos de una ejecución previa
  // (omega-prod-01 … 09). Solo si existen y son de esta corrida — no tocamos
  // ningún doc con otro id.
  const OLD_IDS = Array.from({ length: 9 }, (_, i) => `omega-prod-${String(i + 1).padStart(2, '0')}`);
  for (const oid of OLD_IDS) {
    const s = await col.doc(oid).get();
    if (s.exists) {
      console.log(`  ⌫ borrar legacy ${oid}`);
      if (COMMIT) await col.doc(oid).delete();
    }
  }

  for (const p of PRODUCTOS) {
    const doc = col.doc(p.id);
    const payload = {
      nombre:          p.nombre,
      descripcion:     p.descripcion,
      marca:           p.marca,
      categoria:       p.categoria,
      precio:          p.precio,
      precioOriginal:  null,
      precioCosto:     p.precioCosto,
      stock:           p.stock,
      stockMinimo:     p.stockMinimo,
      imagen:          p.imagen,
      imagenPath:      null,
      sucursalId:      null,
      sucursalNombre:  null,
      activo:          true,
      createdAt:       TS(),
      creadoEn:        TS(),
      updatedAt:       TS(),
    };
    console.log(`  · ${p.id.padEnd(28)} ${p.nombre.padEnd(38)} $${p.precio.toLocaleString('es-CL')}  stock=${p.stock}`);
    if (COMMIT) await doc.set(payload, { merge: true });
  }

  console.log('\nFlags de UI:');
  const uiFlag  = { productosActivos: true, updatedAt: TS() };
  const mainFlag = { productosActivos: true };
  console.log('  · tenants/' + TENANT_ID + '/config/ui           →', uiFlag);
  console.log('  · tenants/' + TENANT_ID + '/configuracion/main  →', mainFlag);
  if (COMMIT) {
    await db.doc(`tenants/${TENANT_ID}/config/ui`).set(uiFlag, { merge: true });
    await db.doc(`tenants/${TENANT_ID}/configuracion/main`).set(mainFlag, { merge: true });
  }

  console.log(COMMIT ? '\n✅ Escrito.' : '\n⏸️  Dry-run. Correr con --commit para persistir.');
  process.exit(0);
})();
