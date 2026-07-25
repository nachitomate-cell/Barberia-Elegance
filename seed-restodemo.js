/**
 * seed-restodemo.js — Firestore para Restaurante Demo (restodemo)
 *
 * Paso 1: solo carta digital pública (menu.html sirve la carta desde
 * `tenants/restodemo/menu`). Sin agenda ni club.
 *
 * Estructura:
 *   /tenants/restodemo/configuracion/main   → categorías, tipo, branding
 *   /tenants/restodemo/menu/{itemId}        → platos (nombre, precio, cat, tags, imagen, activo)
 *   /_system/restodemo                      → plan/status para superadmin
 *
 * Uso:
 *   node seed-restodemo.js            (dry-run: solo imprime)
 *   node seed-restodemo.js --commit   (escribe a Firestore)
 */
const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

const SA = path.join(__dirname, 'service-account.json');
admin.initializeApp({
  credential: fs.existsSync(SA)
    ? admin.credential.cert(JSON.parse(fs.readFileSync(SA, 'utf8')))
    : admin.credential.applicationDefault(),
  projectId: 'barberia-elegance',
});
const db = admin.firestore();
const TS = admin.firestore.FieldValue.serverTimestamp;

const TENANT_ID = 'restodemo';
const COMMIT    = process.argv.includes('--commit');
const col = (name) => db.collection('tenants').doc(TENANT_ID).collection(name);
const sep = (t) => console.log(`\n── ${t} ${'─'.repeat(Math.max(0, 52 - t.length))}`);

// ── Categorías (orden importa: así aparecen en la carta pública) ─────────────
const CATEGORIAS = [
  { id: 'entradas', nombre: 'Entradas',   emoji: '🥗', orden: 0 },
  { id: 'fondos',   nombre: 'Fondos',     emoji: '🍽️', orden: 1 },
  { id: 'postres',  nombre: 'Postres',    emoji: '🍰', orden: 2 },
  { id: 'bebidas',  nombre: 'Bebidas',    emoji: '🥤', orden: 3 },
];

// ── Tags reutilizables (para chips en la card del plato) ─────────────────────
// Se guardan como strings en el array `tags` de cada item. Definirlos acá evita
// typos entre platos y permite renderizar leyenda coherente en la carta.
// vegano, vegetariano, sin_gluten, picante, popular, novedad
const TAG_LABEL = {
  vegano:      { label: 'Vegano',       emoji: '🌱' },
  vegetariano: { label: 'Vegetariano',  emoji: '🥬' },
  sin_gluten:  { label: 'Sin gluten',   emoji: '🌾' },
  picante:     { label: 'Picante',      emoji: '🌶️' },
  popular:     { label: 'Popular',      emoji: '⭐' },
  novedad:     { label: 'Nuevo',        emoji: '✨' },
};

// ── Platos DEMO (fotos: Unsplash food, license libre-reutilización) ──────────
// Precios en CLP. `imagen` acepta URL absoluta o ruta relativa /restodemo/img/*.
// Si el cliente sube fotos propias vía panel, se reemplazan sin tocar código.
const MENU = [
  // ── Entradas ──────────────────────────────────────────────────────────────
  { id: 'ceviche-clasico', categoria: 'entradas', nombre: 'Ceviche Clásico',
    descripcion: 'Reineta fresca, cebolla morada, cilantro y limón de Pica.',
    precio: 7900, tags: ['sin_gluten', 'popular'],
    imagen: 'https://images.unsplash.com/photo-1625944228741-2a3ffa3cd75f?w=800&auto=format&fit=crop&q=70', orden: 0 },
  { id: 'ensalada-cesar', categoria: 'entradas', nombre: 'Ensalada César',
    descripcion: 'Lechuga romana, crotones caseros, parmesano y aderezo César.',
    precio: 6500, tags: ['vegetariano'],
    imagen: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=800&auto=format&fit=crop&q=70', orden: 1 },
  { id: 'empanadas-camaron', categoria: 'entradas', nombre: 'Empanadas de Camarón Queso',
    descripcion: 'Trío de empanadas fritas rellenas de camarón y queso mantecoso.',
    precio: 5900, tags: ['popular'],
    imagen: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&auto=format&fit=crop&q=70', orden: 2 },
  { id: 'bruschetta-tomate', categoria: 'entradas', nombre: 'Bruschetta de Tomate',
    descripcion: 'Pan de masa madre, tomate cherry, albahaca y aceite de oliva.',
    precio: 5500, tags: ['vegetariano', 'vegano'],
    imagen: 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=800&auto=format&fit=crop&q=70', orden: 3 },

  // ── Fondos ────────────────────────────────────────────────────────────────
  { id: 'lomo-a-lo-pobre', categoria: 'fondos', nombre: 'Lomo a lo Pobre',
    descripcion: 'Lomo vetado a la plancha, papas fritas, huevo frito y cebolla caramelizada.',
    precio: 13900, tags: ['popular'],
    imagen: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=70', orden: 0 },
  { id: 'pastel-de-choclo', categoria: 'fondos', nombre: 'Pastel de Choclo',
    descripcion: 'Preparación tradicional con pino de carne, pollo, aceituna y huevo.',
    precio: 11500, tags: ['sin_gluten'],
    imagen: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&auto=format&fit=crop&q=70', orden: 1 },
  { id: 'risotto-hongos', categoria: 'fondos', nombre: 'Risotto de Hongos',
    descripcion: 'Arroz arborio cocido lento con hongos portobello, parmesano y trufa.',
    precio: 12500, tags: ['vegetariano'],
    imagen: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=800&auto=format&fit=crop&q=70', orden: 2 },
  { id: 'wok-verduras', categoria: 'fondos', nombre: 'Wok de Verduras & Tofu',
    descripcion: 'Salteado oriental con tofu marinado, brócoli, zanahoria y salsa de sésamo.',
    precio: 10900, tags: ['vegano', 'picante'],
    imagen: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&auto=format&fit=crop&q=70', orden: 3 },
  { id: 'salmon-plancha', categoria: 'fondos', nombre: 'Salmón a la Plancha',
    descripcion: 'Filete de salmón con reducción de miel y jengibre, quinoa y espárragos.',
    precio: 14500, tags: ['sin_gluten', 'novedad'],
    imagen: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&auto=format&fit=crop&q=70', orden: 4 },
  { id: 'hamburguesa-artesanal', categoria: 'fondos', nombre: 'Hamburguesa Artesanal',
    descripcion: 'Blend 200g, queso cheddar, cebolla crispy, panceta y salsa de la casa.',
    precio: 10500, tags: ['popular'],
    imagen: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop&q=70', orden: 5 },

  // ── Postres ───────────────────────────────────────────────────────────────
  { id: 'tiramisu', categoria: 'postres', nombre: 'Tiramisú Casero',
    descripcion: 'Bizcochos de café, mascarpone al marsala y cacao amargo.',
    precio: 5900, tags: ['vegetariano', 'popular'],
    imagen: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=800&auto=format&fit=crop&q=70', orden: 0 },
  { id: 'brownie-helado', categoria: 'postres', nombre: 'Brownie con Helado',
    descripcion: 'Brownie tibio de chocolate 70%, helado de vainilla y salsa toffee.',
    precio: 5500, tags: ['vegetariano'],
    imagen: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&auto=format&fit=crop&q=70', orden: 1 },
  { id: 'cheesecake-frutos', categoria: 'postres', nombre: 'Cheesecake de Frutos Rojos',
    descripcion: 'Base crocante, mousse de queso crema y coulis de frutilla y frambuesa.',
    precio: 5900, tags: ['vegetariano'],
    imagen: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=800&auto=format&fit=crop&q=70', orden: 2 },

  // ── Bebidas ───────────────────────────────────────────────────────────────
  { id: 'limonada-menta', categoria: 'bebidas', nombre: 'Limonada de Menta',
    descripcion: 'Jugo natural de limón, hierbabuena fresca y jarabe de agave.',
    precio: 3500, tags: ['vegano', 'sin_gluten', 'popular'],
    imagen: 'https://images.unsplash.com/photo-1621263764928-df1444c3e11a?w=800&auto=format&fit=crop&q=70', orden: 0 },
  { id: 'jugo-natural', categoria: 'bebidas', nombre: 'Jugo Natural del Día',
    descripcion: 'Consulta al mesero por la fruta de la temporada. 100% natural.',
    precio: 2900, tags: ['vegano', 'sin_gluten'],
    imagen: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=800&auto=format&fit=crop&q=70', orden: 1 },
  { id: 'copa-vino', categoria: 'bebidas', nombre: 'Copa de Vino Tinto',
    descripcion: 'Cabernet Sauvignon Valle Central. Consulta por nuestra selección.',
    precio: 4500, tags: ['vegano', 'sin_gluten'],
    imagen: 'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=800&auto=format&fit=crop&q=70', orden: 2 },
  { id: 'cafe-espresso', categoria: 'bebidas', nombre: 'Café Espresso',
    descripcion: 'Blend italiano recién molido. Simple o doble.',
    precio: 2200, tags: ['vegano', 'sin_gluten'],
    imagen: 'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=800&auto=format&fit=crop&q=70', orden: 3 },
].map(m => ({ ...m, activo: true, disponible: true }));

// ── Config global del tenant restaurante ─────────────────────────────────────
// Los campos `nombre/slogan/horario/direccion/telefono` viven acá (no en
// config.js) porque son editables por el dueño en el panel. menu.html los
// lee de aquí para hidratar el hero y el JSON-LD.
const CONFIG = {
  tipo:              'restaurante',
  nombre:            'Restaurante Demo',
  slogan:            'Nuestra carta, siempre a mano',
  horario:           'Todos los días · 12:00 – 23:00',
  direccion:         '',
  telefono:          '',
  categoriasMenu:    CATEGORIAS,
  tagsMenu:          TAG_LABEL,
  moneda:            'CLP',
  simboloMoneda:     '$',
  mostrarPrecioIVA:  false,          // Chile: precios ya incluyen IVA en carta
  // Paso 2 (delivery) — banderas pre-cableadas para el día que activemos:
  pedidoOnlineActivo: false,
  deliveryActivo:    false,
  retiroLocalActivo: false,
  minimoDelivery:    0,
  radioDelivery:     0,
};

const SYSTEM_DOC = {
  killSwitch: false,
  plan:       'demo',
  billingStatus: 'active',
  status:     'active',
  tipo:       'restaurante',
};

async function wipe(name) {
  const snap = await col(name).get();
  if (!COMMIT) { console.log(`  🅳 borraría ${snap.size} docs viejos de ${name}`); return; }
  let b = db.batch(), n = 0;
  snap.forEach(d => { b.delete(d.ref); if (++n % 400 === 0) { b.commit(); b = db.batch(); } });
  if (n) await b.commit();
  console.log(`  🧹 ${n} docs viejos borrados de ${name}`);
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║  Restaurante Demo (restodemo) — Seed carta       ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`Tenant: ${TENANT_ID}  |  Modo: ${COMMIT ? 'COMMIT' : 'DRY-RUN'}\n`);

  sep('LIMPIEZA (data previa)');
  await wipe('menu');

  sep('CONFIGURACIÓN');
  if (COMMIT) await col('configuracion').doc('main').set({ ...CONFIG, updatedAt: TS() }, { merge: true });
  console.log(`  ${COMMIT ? '✅' : '🅳'} /configuracion/main · tipo=restaurante · ${CATEGORIAS.length} categorías`);
  CATEGORIAS.forEach(c => console.log(`       · ${c.emoji}  ${c.nombre}`));

  sep('MENÚ');
  {
    let b = db.batch();
    for (const item of MENU) {
      const { id, ...d } = item;
      b.set(col('menu').doc(id), { ...d, creadoEn: TS(), actualizadoEn: TS() }, { merge: true });
      console.log(`  → [${d.categoria.padEnd(9)}] ${d.nombre.padEnd(32)} $${d.precio.toLocaleString('es-CL')}  ${d.tags.join(', ')}`);
    }
    if (COMMIT) await b.commit();
  }
  console.log(`  ${COMMIT ? '✅' : '🅳'} ${MENU.length} platos`);

  sep('_SYSTEM');
  if (COMMIT) await db.collection('_system').doc(TENANT_ID).set({ ...SYSTEM_DOC, updatedAt: TS() }, { merge: true });
  console.log(`  ${COMMIT ? '✅' : '🅳'} _system/${TENANT_ID} · plan=demo · tipo=restaurante`);

  console.log(`\n${COMMIT ? '✅ Seed COMMIT completado.' : 'ℹ️  Dry-run: nada escrito. Corre con --commit.'}\n`);
  process.exit(0);
}
main().catch(e => { console.error('❌', e.message); process.exit(1); });
