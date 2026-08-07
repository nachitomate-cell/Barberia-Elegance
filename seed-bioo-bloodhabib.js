/**
 * seed-bioo-bloodhabib.js — Página bioo de Blood Habib (Link in Bio · bioo.cl)
 *
 *   → bioo.cl/bloodhabib
 *
 * Barbería en Viña del Mar (Calle Quinta 323). Recreada desde su perfil de
 * Weibook — el logo real es un letrero blackletter blanco sobre negro.
 *
 * 🎯 GUARDARRAÍL DE MARCA: chrome B&N puro — plata #E5E5E5 sobre negro #080808.
 *    Nada de dorado ni acento heredado de Elegance. Espeja el tema del tenant
 *    (dashboard/registro/reserva), ya bloque `.tenant-bloodhabib`.
 *
 * Uso:  node seed-bioo-bloodhabib.js
 *       node seed-bioo-bloodhabib.js --undo     (elimina la página)
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

const USERNAME     = 'bloodhabib';
const SITE         = 'https://bloodhabib.synaptechspa.cl';
const WA           = { prefijo: '56', telefono: '945701749' };
const IG_HANDLE    = 'bloodhabib.barbershop';

// Placeholder hasta que el local cree su cuenta real. El puente
// biooEditorBridge auto-adopta cuando el ownerEmail coincide con el caller.
const OWNER_UID   = 'bio-pending-bloodhabib';
const OWNER_EMAIL = 'bloodhabib.barbershop@gmail.com';

let _seq = 0;
const bid = (p) => `${p}-${(++_seq).toString(36)}`;
const blk = (tipo, o = {}) => ({ id: bid(tipo), tipo, label: '', url: '', activo: true, ...o });

/* ────────────────────────────────────────────────────────────────
 * Blood Habib — Premium Dark · B&N plata (industrial premium)
 * ──────────────────────────────────────────────────────────────── */
const bio = {
  username: USERNAME,

  perfil: {
    titulo:    'Blood Habib',
    subtitulo: 'Barbería clásica · Viña del Mar',
    avatar:    `${SITE}/bloodhabib/logo.png`,
    cover:     `${SITE}/bloodhabib/banner.webp`,
    verified:  false,   // /ic-verified.png es PNG raster verde fijo → B&N off
  },

  blocks: [
    /* CTA principal — reservar */
    blk('enlace', {
      label: 'Reservar hora',
      url: SITE,
      featured: true,
      icon: 'scissors',
    }),

    /* Club de fidelidad */
    blk('enlace', {
      label: 'Club · junta sellos y canjea',
      url: `${SITE}/dashboard`,
      icon: 'star',
    }),

    /* Contacto directo */
    blk('whatsapp', {
      label: 'Escríbenos por WhatsApp',
      url: `https://wa.me/${WA.prefijo}${WA.telefono}?text=${encodeURIComponent('Hola Blood Habib 👋 Quiero reservar una hora.')}`,
      prefijo: WA.prefijo,
      telefono: WA.telefono,
      mensaje: 'Hola Blood Habib 👋 Quiero reservar una hora.',
      icon: 'phone-m',
      layoutSize: 'half',
    }),

    /* Instagram */
    blk('instagram', {
      label: `@${IG_HANDLE}`,
      url: `https://instagram.com/${IG_HANDLE}`,
      usuario: IG_HANDLE,
      icon: 'instagram',
      layoutSize: 'half',
    }),

    /* Cómo llegar */
    blk('enlace', {
      label: 'Cómo llegar · Calle Quinta 323',
      url: 'https://www.google.com/maps/search/?api=1&query=Calle+Quinta+323,+Vi%C3%B1a+del+Mar',
      icon: 'pin',
    }),

    blk('separador', {}),

    blk('texto', {
      texto: 'Calle Quinta 323 · Viña del Mar',
    }),

    /* Redes al pie */
    blk('social', {
      label: '',
      socials: [
        { red: 'instagram', valor: IG_HANDLE },
        { red: 'whatsapp',  valor: `${WA.prefijo}${WA.telefono}` },
      ],
    }),
  ],

  /* ── Tema: B&N plata sobre negro (mismo lenguaje que el tenant) ── */
  theme: {
    preset: 'night',
    shape:  'sharp',        // esquinas rectas — pega con el blackletter del logo
    fill:   'solid',
    font:   'oswald',       // condensada industrial
    btnBgColor:   '#E5E5E5',
    btnTextColor: '#080808',
    bg: {
      mode: 'animated',
      fx:   'grain',        // grano de película — firma visual
      color: '#080808',
      c1:   '#141414',
      c2:   '#080808',
      angle: 165,
      pattern: 'dots',
      image: '',
    },
    avatarShape: 'circle',
    avatarRing:  '#E5E5E5',
    btnAnim:     'none',
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
    title: 'Blood Habib · Barbería clásica en Viña del Mar',
    description: 'Reserva tu hora en Blood Habib · Calle Quinta 323, Viña del Mar. Únete al Club y sigue nuestro Instagram.',
  },
};

async function seed() {
  const ref  = db.doc(`bios/${USERNAME}`);
  const snap = await ref.get();

  const uid   = (snap.exists && snap.data().uid) ? snap.data().uid : OWNER_UID;
  const email = (snap.exists && snap.data().ownerEmail) ? snap.data().ownerEmail : OWNER_EMAIL;
  if (snap.exists) console.log(`ℹ️  Doc existente — se conserva uid="${uid}" ownerEmail="${email}"`);

  const batch = db.batch();

  batch.set(ref, {
    uid,
    ownerEmail: email,
    source:    'gestion-interna',
    username:  bio.username,
    perfil:    bio.perfil,
    bloques:   bio.blocks,
    theme:     bio.theme,
    marketing: bio.marketing,
    seo:       bio.seo,
    updatedAt: TS(),
  }, { merge: true });

  batch.set(db.doc(`bio_email_owners/${email}`), {
    handle: USERNAME, email, source: 'gestion-interna', createdAt: TS(),
  }, { merge: true });

  batch.set(db.doc(`bio_users/${uid}`), {
    username: USERNAME, email, createdAt: TS(),
  }, { merge: true });

  await batch.commit();

  console.log(`✅ bioo.cl/${USERNAME}  (${bio.blocks.length} bloques · tema B&N plata)`);
  console.log(`   dueño: ${email}  ·  índices bio_email_owners + bio_users OK`);
  console.log(`\n🎉 Listo. El local lo abre desde su panel → Link in Bio → "Abrir Editor Premium".`);
}

async function undo() {
  const snap  = await db.doc(`bios/${USERNAME}`).get();
  const email = snap.exists ? snap.data().ownerEmail : null;
  const uid   = snap.exists ? snap.data().uid : null;

  const batch = db.batch();
  batch.delete(db.doc(`bios/${USERNAME}`));
  if (email) batch.delete(db.doc(`bio_email_owners/${email}`));
  if (uid)   batch.delete(db.doc(`bio_users/${uid}`));
  await batch.commit();

  console.log(`🗑️  eliminado bioo.cl/${USERNAME} + sus índices`);
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
