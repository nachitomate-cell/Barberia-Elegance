/**
 * seed-bioo-dieciseis.js — Página bioo de Studio Dieciséis (Link in Bio · bioo.cl)
 *
 *   → bioo.cl/studiodieciseis
 *
 * Barbería premium en Valparaíso (tenant interno `sionbarberia`).
 *
 * 🎯 GUARDARRAÍL DE MARCA: el chrome es MONOCROMÁTICO B&N puro
 *    (platino #FAFAFA sobre negro #0a0a0a). NADA de verde ni dorado en la UI.
 *    El neón verde vive SOLO dentro de la foto de fachada (cover) — nunca en
 *    botones, aros, fondos ni acentos.
 *
 * Uso:  node seed-bioo-dieciseis.js
 *       node seed-bioo-dieciseis.js --undo     (elimina la página)
 *
 * OJO: si el doc ya existe (Ignacio lo abrió/reclamó en el editor), se
 * PRESERVA su `uid` para no quitarle la propiedad de la página.
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

const USERNAME     = 'studiodieciseis';
const FALLBACK_UID = 'bioo-studiodieciseis';   // solo si el doc aún no existe
const SITE         = 'https://studiodieciseis.synaptechspa.cl';
const WA           = { prefijo: '56', telefono: '937179177' };

/* ── Helpers de bloques ─────────────────────────────────────────── */
let _seq = 0;
const bid = (p) => `${p}-${(++_seq).toString(36)}`;
const blk = (tipo, o = {}) => ({ id: bid(tipo), tipo, label: '', url: '', activo: true, ...o });

/* ────────────────────────────────────────────────────────────────
 * Studio Dieciséis — Premium Dark · Monocromático B&N
 * ──────────────────────────────────────────────────────────────── */
const bio = {
  username: USERNAME,

  perfil: {
    titulo:    'Studio Dieciséis',
    subtitulo: 'Cuidado personal que combina estilo y calidad.',
    // Logo círculo wordmark B&N.
    avatar:    `${SITE}/dieciseis/logo.png`,
    // Fachada A COLOR: el neón verde SOLO vive acá (foto), nunca en la UI.
    cover:     `${SITE}/dieciseis/banner16.webp`,
    verified:  true,
  },

  blocks: [
    /* CTA principal — reservar */
    blk('enlace', {
      label: 'Reservar hora',
      url: SITE,
      featured: true,
      icon: '✂️',
    }),

    /* Club de fidelidad (passwordless · sellos → premios) */
    blk('enlace', {
      label: 'Club · junta sellos y canjea',
      url: `${SITE}/dashboard`,
      icon: '★',
    }),

    /* Contacto directo */
    blk('whatsapp', {
      label: 'Escríbenos por WhatsApp',
      prefijo: WA.prefijo,
      telefono: WA.telefono,
      mensaje: 'Hola Studio Dieciséis 👋 Quiero reservar una hora.',
      layoutSize: 'half',
    }),

    /* Instagram */
    blk('instagram', {
      label: '@studio.dieciseis_',
      usuario: 'studio.dieciseis_',
      layoutSize: 'half',
    }),

    /* Cómo llegar */
    blk('enlace', {
      label: 'Cómo llegar · Galería Beye',
      url: 'https://www.google.com/maps/search/?api=1&query=Condell+1525,+Valpara%C3%ADso',
      icon: '📍',
    }),

    blk('separador', {}),

    blk('texto', {
      texto: 'Condell 1525 · Piso 5, Local 43 · Galería Beye, Valparaíso',
    }),

    /* Redes al pie */
    blk('social', {
      label: '',
      socials: [
        { red: 'instagram', valor: 'studio.dieciseis_' },
        { red: 'whatsapp',  valor: `${WA.prefijo}${WA.telefono}` },
      ],
    }),
  ],

  /* ── Tema: B&N puro (platino sobre negro), editorial premium ── */
  theme: {
    preset: 'night',
    shape:  'sharp',        // esquinas rectas → editorial/brutalista premium
    fill:   'solid',
    font:   'oswald',       // condensada tipo portada de revista
    // Overrides que BLINDAN el B&N (que ningún preset filtre color):
    btnBgColor:   '#FAFAFA',
    btnTextColor: '#0a0a0a',
    bg: {
      mode: 'animated',
      fx:   'grain',        // grano de película sutil — firma visual de la marca
      color: '#0a0a0a',
      c1:   '#141414',
      c2:   '#0a0a0a',
      angle: 165,
      pattern: 'dots',
      image: '',
    },
    avatarShape: 'circle',
    avatarRing:  '#FAFAFA', // aro hairline blanco (nunca glow verde/dorado)
    btnAnim:     'none',    // restraint premium, sin rebotes
    text: {
      titleSize: 'l',
      subSize:   'm',
      weight:    'black',
      caps:      'upper',
      spacing:   'wide',
      align:     'center',
      subWeight: 'normal',
      shadow:    'none',
    },
  },

  marketing: { ga4: '', metaPixel: '', tiktokPixel: '' },

  seo: {
    title: 'Studio Dieciséis · Barbería premium en Valparaíso',
    description: 'Reserva tu hora, únete al Club y sigue a Studio Dieciséis. Condell 1525, Galería Beye, Valparaíso.',
  },
};

/* ── Escritura ──────────────────────────────────────────────────── */
async function seed() {
  const ref  = db.doc(`bios/${USERNAME}`);
  const snap = await ref.get();

  // Preservar el dueño si la página ya fue reclamada desde el editor.
  const uid = (snap.exists && snap.data().uid) ? snap.data().uid : FALLBACK_UID;
  if (snap.exists) console.log(`ℹ️  Doc existente — se conserva uid="${uid}"`);

  await ref.set({
    uid,
    username:  bio.username,
    perfil:    bio.perfil,
    bloques:   bio.blocks,
    theme:     bio.theme,
    marketing: bio.marketing,
    seo:       bio.seo,
    updatedAt: TS(),
  }, { merge: true });

  console.log(`✅ bioo.cl/${USERNAME}  (${bio.blocks.length} bloques · tema B&N)`);
  console.log(`\n🎉 Listo. Verifica en https://bioo.cl/${USERNAME}`);
}

async function undo() {
  await db.doc(`bios/${USERNAME}`).delete();
  console.log(`🗑️  eliminado bioo.cl/${USERNAME}`);
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
