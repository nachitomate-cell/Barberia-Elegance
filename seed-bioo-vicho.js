/**
 * seed-bioo-vicho.js — Página bioo de Vicho Maira (Link in Bio · bioo.cl)
 *
 * Perfil multi-marca de Vicho Maira:
 *   💿 DJ           → @delnero.barber
 *   🎥📸 Productora  → @dibianca.produzioni
 *   🍤 Ceviches     → @cevichesdelnegro_
 *   ✏️  Periodista
 *
 *   → bioo.cl/vicho-maira   (tema Noche, fondo fluido)
 *
 * Uso:  node seed-bioo-vicho.js
 *       node seed-bioo-vicho.js --undo     (elimina la página)
 *
 * Doc público con uid sintético 'bioo-vicho' (no reclamable por un humano
 * salvo que se le asigne ese uid o se reclame por email vía biooClaim).
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
const VICHO_UID = 'bioo-vicho';

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
 * Vicho Maira — DJ · Productora · Ceviches · Periodista
 * ──────────────────────────────────────────────────────────────── */
const vichoMaira = {
  username: 'vicho-maira',
  perfil: {
    titulo: 'Vicho Maira',
    subtitulo: 'DJ 💿 · Productora 🎥📸 · Ceviches 🍤 · Periodista',
    avatar: IMG('1571266028243-d220c9c3b31e'),       // DJ / tornamesas
    cover: IMG('1493676304819-0d7a8d026dcf', 800),    // luces de fiesta
    verified: true,
  },
  blocks: [
    /* 💿 DJ — marca principal */
    blk('instagram', { label: '💿 DJ · @delnero.barber', usuario: 'delnero.barber', featured: true }),
    blk('texto',     { texto: 'Sets, música en vivo & barbería ✂️' }),
    blk('separador', {}),

    /* 🎥 Productora */
    blk('instagram', { label: '🎥 Di Bianca Produzioni', usuario: 'dibianca.produzioni', layoutSize: 'large' }),
    blk('texto',     { texto: 'Producción audiovisual · video, foto & eventos 📸' }),
    blk('separador', {}),

    /* 🍤 Ceviches */
    blk('instagram', { label: '🍤 Ceviches del Negro', usuario: 'cevichesdelnegro_' }),
    blk('texto',     { texto: 'Ceviches frescos a pedido · escríbeme por DM' }),
    blk('separador', {}),

    /* Todas las redes */
    blk('social', { label: '', socials: [
      { red: 'instagram', valor: 'delnero.barber' },
      { red: 'instagram', valor: 'dibianca.produzioni' },
      { red: 'instagram', valor: 'cevichesdelnegro_' },
    ] }),
  ],
  theme: theme({
    preset: 'night', shape: 'pill', fill: 'solid', font: 'montserrat', btnAnim: 'pulse',
    bg: { mode: 'animated', fx: 'fluid', c1: '#7c3aed', c2: '#1e1b4b', angle: 150 },
    text: { titleSize: 'l', weight: 'black', spacing: 'wide', caps: 'upper' },
  }),
  marketing: EMPTY_MARKETING,
  seo: {
    title: 'Vicho Maira · DJ, Productora & Ceviches',
    description: 'DJ, productora audiovisual Di Bianca y Ceviches del Negro. Todas las marcas de Vicho Maira en un solo link.',
  },
};

/* ── Escritura ──────────────────────────────────────────────────── */
async function seed() {
  const d = vichoMaira;
  await db.doc(`bios/${d.username}`).set({
    uid: VICHO_UID,
    username: d.username,
    perfil: d.perfil,
    bloques: d.blocks,
    theme: d.theme,
    marketing: d.marketing,
    seo: d.seo,
    updatedAt: TS(),
  }, { merge: true });
  console.log(`✅ bioo.cl/${d.username}  (${d.blocks.length} bloques)`);
  console.log('\n🎉 Página creada. Verifica en https://bioo.cl/' + d.username);
}

async function undo() {
  const d = vichoMaira;
  await db.doc(`bios/${d.username}`).delete();
  console.log(`🗑️  eliminado bioo.cl/${d.username}`);
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
