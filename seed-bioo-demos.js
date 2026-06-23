/**
 * seed-bioo-demos.js — Páginas bioo de DEMOSTRACIÓN (Link in Bio · bioo.cl)
 *
 * Crea 3 perfiles públicos completos y bien diseñados en /bios/{username},
 * pensados para mostrar el producto a clientes potenciales:
 *
 *   bioo.cl/studio-onze    → Barbería   (tema Bosque, fondo aurora)
 *   bioo.cl/aurora-cafe    → Cafetería  (tema Atardecer, fondo animado)
 *   bioo.cl/dj-lunar       → DJ/Creador (tema Noche, fondo fluido)
 *
 * Showcasean variedad de bloques: enlace destacado, whatsapp, instagram,
 * tiktok, mapa, texto, separador, social, newsletter, tip jar y paywall.
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

const IMG = (id, w = 400) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

/* ── Helpers de bloques ─────────────────────────────────────────── */
let _seq = 0;
const bid = (p) => `${p}-${(++_seq).toString(36)}`;
const blk = (tipo, o = {}) => ({ id: bid(tipo), tipo, label: '', url: '', activo: true, ...o });

/* Estructura de tema completa (igual que normalizeTheme/DEFAULT_BG). */
const theme = ({ preset, shape = 'rounded', fill = 'solid', font = 'system', bg, btnAnim = 'none', text = {} }) => ({
  preset, shape, fill, font,
  bg: { mode: 'preset', color: '#92c83a', c1: '#92c83a', c2: '#2c5a17', angle: 165, pattern: 'dots', image: '', fx: 'aurora', ...bg },
  avatarShape: 'circle',
  avatarRing: '',
  btnAnim,
  text: { titleSize: 'm', subSize: 'm', weight: 'bold', caps: 'normal', spacing: 'normal', ...text },
});

const EMPTY_MARKETING = { ga4: '', metaPixel: '', tiktokPixel: '' };

/* ────────────────────────────────────────────────────────────────
 * DEMO 1 — Barbería "Studio Onze"
 * ──────────────────────────────────────────────────────────────── */
const studioOnze = {
  username: 'studio-onze',
  perfil: {
    titulo: 'Studio Onze',
    subtitulo: 'Barbería & grooming · Valparaíso ✂️',
    avatar: IMG('1599351431202-1e0f0137899a'),
    cover: IMG('1521590832167-7bcbfaa6381f', 800),
    verified: true,
  },
  blocks: [
    blk('enlace',    { label: '📅 Reservar mi hora', url: 'https://barberia-elegance.web.app/agenda', featured: true }),
    blk('whatsapp',  { label: 'Escríbenos por WhatsApp', prefijo: '56', telefono: '912345678', mensaje: 'Hola Studio Onze, quiero reservar un corte ✂️' }),
    blk('enlace',    { label: '✂️ Servicios y precios', url: 'https://barberia-elegance.web.app/servicios', layoutSize: 'half' }),
    blk('enlace',    { label: '📍 Cómo llegar', url: 'https://maps.google.com/?q=Barberia+Valparaiso', layoutSize: 'half' }),
    blk('texto',     { texto: 'Lun a Sáb · 10:00 – 20:00\nAv. Pedro Montt 1820, Valparaíso' }),
    blk('separador', {}),
    blk('social',    { label: 'Síguenos', socials: [
      { red: 'instagram', valor: 'studio.onze' },
      { red: 'tiktok',    valor: 'studio.onze' },
      { red: 'whatsapp',  valor: '56912345678' },
    ] }),
  ],
  theme: theme({
    preset: 'forest', shape: 'pill', fill: 'solid', font: 'montserrat', btnAnim: 'float',
    bg: { mode: 'animated', fx: 'aurora', c1: '#1f3d12', c2: '#5a8f2c', angle: 165 },
    text: { titleSize: 'l', weight: 'black', spacing: 'tight' },
  }),
  marketing: EMPTY_MARKETING,
  seo: { title: 'Studio Onze · Barbería en Valparaíso', description: 'Reserva tu corte en Studio Onze. Servicios, precios y ubicación en un solo link.' },
};

/* ────────────────────────────────────────────────────────────────
 * DEMO 2 — Cafetería "Aurora Café"
 * ──────────────────────────────────────────────────────────────── */
const auroraCafe = {
  username: 'aurora-cafe',
  perfil: {
    titulo: 'Aurora Café',
    subtitulo: 'Café de especialidad & brunch ☕ · Providencia',
    avatar: IMG('1495474472287-4d71bcdd2085'),
    cover: IMG('1559925393-8be0ec4767c8', 800),
    verified: false,
  },
  blocks: [
    blk('enlace',     { label: '🍽️ Ver nuestra carta', url: 'https://aurora-cafe.menu', featured: true }),
    blk('enlace',     { label: '🛵 Pedir delivery', url: 'https://www.pedidosya.cl', layoutSize: 'half' }),
    blk('whatsapp',   { label: 'Reservar mesa', prefijo: '56', telefono: '987654321', mensaje: 'Hola Aurora ☕ quiero reservar una mesa', layoutSize: 'half' }),
    blk('enlace',     { label: '📍 Estamos aquí', url: 'https://maps.google.com/?q=Cafe+Providencia+Santiago' }),
    blk('imagen',     { img: IMG('1554118811-1e0d58224f24', 600), url: 'https://aurora-cafe.menu', label: '' }),
    blk('newsletter', { label: 'Únete al club Aurora', subtitulo: 'Recibe un 10% de descuento en tu próxima visita ✨', btnText: 'Quiero mi descuento' }),
    blk('social',     { label: '', socials: [
      { red: 'instagram', valor: 'aurora.cafe' },
      { red: 'facebook',  valor: 'auroracafecl' },
    ] }),
  ],
  theme: theme({
    preset: 'sunset', shape: 'rounded', fill: 'solid', font: 'poppins', btnAnim: 'none',
    bg: { mode: 'animated', fx: 'aurora', c1: '#ff8a3d', c2: '#d6249f', angle: 160 },
    text: { titleSize: 'l', weight: 'black' },
  }),
  marketing: EMPTY_MARKETING,
  seo: { title: 'Aurora Café · Especialidad en Providencia', description: 'Carta, delivery, reservas y ubicación de Aurora Café en un solo enlace.' },
};

/* ────────────────────────────────────────────────────────────────
 * DEMO 3 — DJ / Creador "DJ Lunar"
 * ──────────────────────────────────────────────────────────────── */
const djLunar = {
  username: 'dj-lunar',
  perfil: {
    titulo: 'DJ Lunar',
    subtitulo: 'Producer & DJ · House / Melodic Techno 🌙',
    avatar: IMG('1571330735066-03aaa9429d89'),
    cover: IMG('1470225620780-dba8ba36b745', 800),
    verified: true,
  },
  blocks: [
    blk('embed',      { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', label: 'Último set' }),
    blk('enlace',     { label: '🎧 Escúchame en Spotify', url: 'https://open.spotify.com', featured: true }),
    blk('enlace',     { label: '🎟️ Próximas fechas', url: 'https://www.passline.com', layoutSize: 'half' }),
    blk('enlace',     { label: '🛒 Merch oficial', url: 'https://dj-lunar.store', layoutSize: 'half' }),
    blk('paywall',    { label: '🔥 Pack de samples exclusivos', subtitulo: '40 loops + 12 presets de Serum. Acceso inmediato.', price: 9990, currency: 'CLP', url: '', hiddenUrl: 'https://drive.google.com/demo-pack' }),
    blk('tip',        { label: 'Invítame un trago', subtitulo: 'Tu apoyo financia el próximo EP 🍸', amounts: [3000, 5000, 10000], currency: 'CLP' }),
    blk('newsletter', { label: 'Entérate de cada estreno', subtitulo: 'Sin spam. Solo música nueva y fechas.', btnText: 'Avísenme' }),
    blk('social',     { label: '', socials: [
      { red: 'instagram', valor: 'dj.lunar' },
      { red: 'tiktok',    valor: 'dj.lunar' },
      { red: 'youtube',   valor: 'djlunar' },
    ] }),
  ],
  theme: theme({
    preset: 'night', shape: 'pill', fill: 'solid', font: 'montserrat', btnAnim: 'pulse',
    bg: { mode: 'animated', fx: 'fluid', c1: '#7c3aed', c2: '#1e1b4b', angle: 150 },
    text: { titleSize: 'l', weight: 'black', spacing: 'wide', caps: 'upper' },
  }),
  marketing: EMPTY_MARKETING,
  seo: { title: 'DJ Lunar · House & Melodic Techno', description: 'Sets, fechas, merch y packs de samples de DJ Lunar en un solo link.' },
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
