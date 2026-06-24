/**
 * seed-bioo-demos.js — Páginas bioo de DEMOSTRACIÓN (Link in Bio · bioo.cl)
 *
 * Crea 3 perfiles públicos completos, premium y "fotografiados" en
 * /bios/{username}, pensados para mostrar el producto a clientes
 * potenciales (cada uno explota una vertical distinta):
 *
 *   bioo.cl/studio-onze    → Barbería de autor   (Bosque · Playfair · marble cutout)
 *   bioo.cl/aurora-cafe    → Café de especialidad (Atardecer · Poppins · grain animado)
 *   bioo.cl/dj-lunar       → DJ / Productor      (Noche · Montserrat · nebulosa Petrova)
 *
 * Showcasean variedad de bloques (enlace destacado, whatsapp, social,
 * texto, separador, imagen, embed, newsletter, tip jar y paywall) con
 * layouts bento (half/full/large) y un look cohesivo por persona.
 *
 * Uso:  node seed-bioo-demos.js
 *       node seed-bioo-demos.js --undo     (elimina las 3 demos)
 *
 * El doc usa uid sintético 'bioo-demo'. NO crea usuario de Auth ni mapeo
 * bio_users (no es reclamable por un humano salvo que se le asigne ese uid).
 */

const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'service-account.json');
let credential;
if (fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  credential = admin.credential.cert(JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8')));
  console.log('🔑 Usando service-account.json');
} else {
  credential = admin.credential.applicationDefault();
  console.log('🔑 Usando Application Default Credentials');
}

admin.initializeApp({ credential, projectId: 'barberia-elegance' });
const db = admin.firestore();
const TS = admin.firestore.FieldValue.serverTimestamp;
const DEMO_UID = 'bioo-demo';

/* ── Helpers ─────────────────────────────────────────────────────── */
const IMG = (id, w = 600) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=85`;
// Galería curada (servida desde Vercel con cache infinito) → look premium.
const BG = (slug) => `https://bioo.cl/bg/${slug}.webp`;

let _seq = 0;
const bid = (p) => `${p}-${(++_seq).toString(36)}`;
const blk = (tipo, o = {}) => ({ id: bid(tipo), tipo, label: '', url: '', activo: true, ...o });

/* Estructura de tema completa (igual que normalizeTheme/DEFAULT_BG). */
const theme = ({
  preset, shape = 'rounded', fill = 'solid', font = 'system',
  bg, btnAnim = 'none', avatarShape = 'circle', avatarRing = '', text = {},
}) => ({
  preset, shape, fill, font,
  bg: { mode: 'preset', color: '#92c83a', c1: '#92c83a', c2: '#2c5a17', angle: 165, pattern: 'dots', image: '', fx: 'aurora', ...bg },
  avatarShape,
  avatarRing,
  btnAnim,
  text: { titleSize: 'm', subSize: 'm', weight: 'bold', caps: 'normal', spacing: 'normal', ...text },
});

const EMPTY_MARKETING = { ga4: '', metaPixel: '', tiktokPixel: '' };

/* ════════════════════════════════════════════════════════════════
 * DEMO 1 — Barbería de autor "Studio Onze"
 * Vibe: minimalismo verde profundo · serif premium · barber tradicional
 * con disciplina moderna. Bento limpio, una sola CTA dominante.
 * ════════════════════════════════════════════════════════════════ */
const studioOnze = {
  username: 'studio-onze',
  perfil: {
    titulo: 'Studio Onze',
    subtitulo: 'Barbería de autor · Valparaíso\nCortes clásicos · Afeitado a navaja',
    avatar: IMG('1503951914875-452162b0f3f1', 400),
    cover:  IMG('1521590832167-7bcbfaa6381f', 1200),
    verified: true,
  },
  blocks: [
    // 1. CTA hero — la única acción "grande" para no diluir el foco.
    blk('enlace',    { label: '📅 Reservar mi hora', url: 'https://barberia-elegance.web.app/agenda', featured: true, layoutSize: 'large' }),
    // 2. Doble fila: WhatsApp + servicios (acciones inmediatas).
    blk('whatsapp',  { label: 'WhatsApp directo', prefijo: '56', telefono: '912345678', mensaje: 'Hola Studio Onze, quiero reservar un corte ✂️', layoutSize: 'half' }),
    blk('enlace',    { label: '✂️ Servicios & precios', url: 'https://barberia-elegance.web.app/servicios', layoutSize: 'half' }),
    // 3. Lookbook visual — credibilidad antes de pedir contacto.
    blk('imagen',    { img: IMG('1605497788044-5a32c7078486', 800), url: 'https://instagram.com/studio.onze', layoutSize: 'large' }),
    // 4. Mini-grid de descubrimiento.
    blk('enlace',    { label: '💈 Lookbook', url: 'https://instagram.com/studio.onze', layoutSize: 'half' }),
    blk('enlace',    { label: '📍 Cómo llegar', url: 'https://maps.google.com/?q=Pedro+Montt+1820+Valparaiso', layoutSize: 'half' }),
    // 5. Información ambiente (sin link, formato editorial).
    blk('texto',     { texto: 'Lun a Sáb · 10:00 – 20:00\nAv. Pedro Montt 1820, Valparaíso' }),
    blk('separador', {}),
    // 6. Captura de leads.
    blk('newsletter',{ label: 'Entérate de aperturas y promos', subtitulo: 'Te avisamos cuando se liberan horarios premium · sin spam', btnText: 'Quiero saber' }),
    // 7. Redes — al final, icónicas.
    blk('social',    { socials: [
      { red: 'instagram', valor: 'studio.onze' },
      { red: 'tiktok',    valor: 'studio.onze' },
      { red: 'whatsapp',  valor: '56912345678' },
    ] }),
  ],
  theme: theme({
    preset: 'forest', shape: 'rounded', fill: 'solid', font: 'playfair', btnAnim: 'none',
    bg: { mode: 'animated', fx: 'aurora', c1: '#0f1e07', c2: '#3f7a1f', angle: 165 },
    avatarShape: 'rounded', avatarRing: '#0f1e07',
    text: { titleSize: 'l', weight: 'bold', spacing: 'tight' },
  }),
  marketing: EMPTY_MARKETING,
  seo: {
    title: 'Studio Onze · Barbería de autor en Valparaíso',
    description: 'Reserva tu corte en Studio Onze: barbería clásica con afeitado a navaja en Pedro Montt 1820. Servicios, precios y ubicación en un solo link.',
  },
};

/* ════════════════════════════════════════════════════════════════
 * DEMO 2 — Cafetería de especialidad "Aurora Café"
 * Vibe: calidez sunset · brunch dominical · comunidad de clientes.
 * Estructura: descubrir → consumir → fidelizar (tip + newsletter).
 * ════════════════════════════════════════════════════════════════ */
const auroraCafe = {
  username: 'aurora-cafe',
  perfil: {
    titulo: 'Aurora Café',
    subtitulo: 'Café de especialidad & brunch ☕\nProvidencia · Santiago',
    avatar: IMG('1495474472287-4d71bcdd2085', 400),
    cover:  IMG('1559925393-8be0ec4767c8',    1200),
    verified: false,
  },
  blocks: [
    // 1. CTA hero — reservar mesa es el dolor #1.
    blk('whatsapp',  { label: '🍽️ Reservar mesa', prefijo: '56', telefono: '987654321', mensaje: 'Hola Aurora ☕ quiero reservar mesa para…', featured: true, layoutSize: 'large' }),
    // 2. Menú + delivery side-by-side (decisiones rápidas).
    blk('enlace',    { label: '📋 Carta digital', url: 'https://aurora-cafe.menu', layoutSize: 'half' }),
    blk('enlace',    { label: '🛵 Delivery', url: 'https://www.pedidosya.cl', layoutSize: 'half' }),
    // 3. Hero visual — apetito antes de fidelizar.
    blk('imagen',    { img: IMG('1554118811-1e0d58224f24', 800), url: 'https://aurora-cafe.menu', layoutSize: 'large' }),
    // 4. Texto editorial.
    blk('texto',     { texto: 'Granos tostados en casa · Brunch todos los domingos\nLun a Vie 8–20 · Sáb-Dom 9–22' }),
    // 5. Doble mini-acción: ubicación + agenda eventos.
    blk('enlace',    { label: '📍 Cómo llegar', url: 'https://maps.google.com/?q=Cafe+Providencia+Santiago', layoutSize: 'half' }),
    blk('enlace',    { label: '🎵 Catas y eventos', url: 'https://aurora-cafe.menu/eventos', layoutSize: 'half' }),
    blk('separador', {}),
    // 6. Tip jar — propinas digitales para el equipo.
    blk('tip',       { label: '💛 Apoya a nuestro equipo', subtitulo: 'Tu propina va directa al barista que te atendió', amounts: [1000, 2000, 5000], currency: 'CLP' }),
    // 7. Club Aurora — newsletter con incentivo claro.
    blk('newsletter',{ label: 'Únete al Club Aurora', subtitulo: '10 % de descuento en tu próxima visita ✨ + acceso a catas privadas', btnText: 'Quiero mi descuento' }),
    // 8. Redes.
    blk('social',    { socials: [
      { red: 'instagram', valor: 'aurora.cafe' },
      { red: 'facebook',  valor: 'auroracafecl' },
      { red: 'tiktok',    valor: 'aurora.cafe' },
    ] }),
  ],
  theme: theme({
    preset: 'sunset', shape: 'rounded', fill: 'solid', font: 'poppins', btnAnim: 'none',
    bg: { mode: 'animated', fx: 'grain', c1: '#ff8a3d', c2: '#d6249f', angle: 160 },
    avatarShape: 'circle', avatarRing: 'rgba(255,255,255,.7)',
    text: { titleSize: 'l', weight: 'black' },
  }),
  marketing: EMPTY_MARKETING,
  seo: {
    title: 'Aurora Café · Café de especialidad en Providencia',
    description: 'Carta digital, reservas, delivery, eventos y Club Aurora con 10 % de descuento — todo de Aurora Café en un solo enlace.',
  },
};

/* ════════════════════════════════════════════════════════════════
 * DEMO 3 — Productor / DJ "DJ Lunar"
 * Vibe: galáctico, neón violeta, set en vivo y monetización
 * directa (samples, merch, propinas). Bento denso y rítmico.
 * Fondo: nebulosa Petrova (Project Hail Mary) — wallpaper firma.
 * ════════════════════════════════════════════════════════════════ */
const djLunar = {
  username: 'dj-lunar',
  perfil: {
    titulo: 'DJ Lunar',
    subtitulo: 'Producer & DJ 🌙\nHouse · Melodic Techno · Live sets',
    avatar: IMG('1571330735066-03aaa9429d89', 400),
    cover:  IMG('1470225620780-dba8ba36b745', 1200),
    verified: true,
  },
  blocks: [
    // 1. Embed YouTube — autoplay del último set en lugar 1.
    blk('embed',     { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }),
    // 2. Spotify embed — playlist oficial (el embed acepta open.spotify.com).
    blk('embed',     { url: 'https://open.spotify.com/playlist/37i9dQZF1DX4dyzvuaRJ0n' }),
    // 3. CTA hero — próximas fechas (lo que más buscan los fans).
    blk('enlace',    { label: '🎟️ Próximas fechas', url: 'https://www.passline.com', featured: true, layoutSize: 'large' }),
    // 4. Mini-grid: merch + Spotify directo.
    blk('enlace',    { label: '🛒 Merch oficial', url: 'https://dj-lunar.store', layoutSize: 'half' }),
    blk('enlace',    { label: '🎧 Spotify', url: 'https://open.spotify.com', layoutSize: 'half' }),
    // 5. Lookbook en vivo.
    blk('imagen',    { img: IMG('1493676304819-0d7a8d026dcf', 800), url: 'https://instagram.com/dj.lunar', layoutSize: 'large' }),
    blk('separador', {}),
    // 6. Monetización pro: paywall samples + tip jar (lado a lado conceptual).
    blk('paywall',   {
      label: '🔥 Pack de samples exclusivos',
      subtitulo: '40 loops originales + 12 presets de Serum · acceso inmediato',
      price: 9990, currency: 'CLP', url: '',
      hiddenUrl: 'https://drive.google.com/demo-pack',
    }),
    blk('tip',       { label: '🍸 Invítame un trago', subtitulo: 'Tu apoyo financia el próximo EP', amounts: [3000, 5000, 10000], currency: 'CLP' }),
    // 7. Lista de espera del próximo lanzamiento.
    blk('newsletter',{ label: 'Sé el primero en escucharlo', subtitulo: 'Te aviso cuando suba el próximo track. Sin spam, solo música nueva.', btnText: 'Avísame' }),
    // 8. Redes.
    blk('social',    { socials: [
      { red: 'instagram', valor: 'dj.lunar' },
      { red: 'tiktok',    valor: 'dj.lunar' },
      { red: 'youtube',   valor: 'djlunar' },
    ] }),
  ],
  theme: theme({
    preset: 'night', shape: 'pill', fill: 'solid', font: 'montserrat', btnAnim: 'pulse',
    // Wallpaper Petrova (PHM) — el más cinematográfico de la galería.
    bg: { mode: 'image', image: BG('espacio-hail-mary-nebula') },
    avatarShape: 'circle', avatarRing: '#7c3aed',
    text: { titleSize: 'l', weight: 'black', spacing: 'wide', caps: 'upper' },
  }),
  marketing: EMPTY_MARKETING,
  seo: {
    title: 'DJ Lunar · House & Melodic Techno',
    description: 'Sets en vivo, próximas fechas, merch y pack de samples exclusivos de DJ Lunar — en un solo link.',
  },
};

const DEMOS = [studioOnze, auroraCafe, djLunar];

/* ── Escritura ──────────────────────────────────────────────────── */
async function seed() {
  for (const d of DEMOS) {
    // Limpia hiddenUrl del array público (vive solo en /secrets).
    const publicBlocks = d.blocks.map((b) => {
      if (b.tipo !== 'paywall') return b;
      const { hiddenUrl, ...rest } = b;
      return rest;
    });

    await db.doc(`bios/${d.username}`).set({
      uid: DEMO_UID,
      username: d.username,
      perfil: d.perfil,
      bloques: publicBlocks,
      theme: d.theme,
      marketing: d.marketing,
      seo: d.seo,
      isDemo: true,
      updatedAt: TS(),
    }, { merge: true });

    // Secretos de paywalls → /bios/{username}/secrets/{blockId}
    for (const b of d.blocks) {
      if (b.tipo !== 'paywall') continue;
      await db.doc(`bios/${d.username}/secrets/${b.id}`).set({
        uid: DEMO_UID, blockId: b.id, hiddenUrl: b.hiddenUrl || '', updatedAt: TS(),
      });
    }

    console.log(`✅ bioo.cl/${d.username}  (${publicBlocks.length} bloques)`);
  }
  console.log('\n🎉 Demos creadas. Verifica en https://bioo.cl/<username>');
}

async function undo() {
  for (const d of DEMOS) {
    const secrets = await db.collection(`bios/${d.username}/secrets`).get();
    const batch = db.batch();
    secrets.forEach((s) => batch.delete(s.ref));
    batch.delete(db.doc(`bios/${d.username}`));
    await batch.commit();
    console.log(`🗑️  eliminado bioo.cl/${d.username}`);
  }
}

(async () => {
  try {
    if (process.argv.includes('--undo')) await undo();
    else await seed();
    process.exit(0);
  } catch (e) {
    console.error('❌ Error:', e);
    process.exit(1);
  }
})();
