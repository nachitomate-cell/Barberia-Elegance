/**
 * seed-bioo-omega.js — Página bioo de Omega Studio (Link in Bio · bioo.cl)
 *
 *   → bioo.cl/omega
 *
 * Omega Studio, Av. Valparaíso 595 Local 53, 2do piso, Viña del Mar.
 *
 * 🎯 GUARDARRAÍL DE MARCA: B&N editorial sobre HUESO #F8F7F4 (mismo fondo
 *    real del logo Ω), tinta negra #111111. Rounded shape (más suave que
 *    Alfa Men, más editorial). Espeja el tema del tenant, bloque
 *    `.tenant-omega.tenant-aura`.
 *
 * Uso:  node seed-bioo-omega.js
 *       node seed-bioo-omega.js --undo
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

const USERNAME     = 'omega';
const SITE         = 'https://omega.synaptechspa.cl';
const WA           = { prefijo: '56', telefono: '972302811' };
const IG_HANDLE    = 'omegastudio.cl';

// Placeholder hasta que el local cree su cuenta. Convención: handle IG del local
// + gmail — cuando la cuenta real se cree con este email, el puente adopta.
const OWNER_UID   = 'bio-pending-omega';
const OWNER_EMAIL = 'omegastudio.cl@gmail.com';

let _seq = 0;
const bid = (p) => `${p}-${(++_seq).toString(36)}`;
const blk = (tipo, o = {}) => ({ id: bid(tipo), tipo, label: '', url: '', activo: true, ...o });

/* ────────────────────────────────────────────────────────────────
 * Omega Studio — Snow · B&N editorial sobre hueso
 * ──────────────────────────────────────────────────────────────── */
const bio = {
  username: USERNAME,

  perfil: {
    titulo:    'Omega Studio',
    subtitulo: 'Barbería premium · Viña del Mar',
    avatar:    `${SITE}/omega/logo.webp`,
    cover:     `${SITE}/omega/banner.webp`,
    verified:  false,
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
      url: `https://wa.me/${WA.prefijo}${WA.telefono}?text=${encodeURIComponent('Hola Omega Studio 👋 Quiero reservar una hora.')}`,
      prefijo: WA.prefijo,
      telefono: WA.telefono,
      mensaje: 'Hola Omega Studio 👋 Quiero reservar una hora.',
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
      label: 'Cómo llegar · Av. Valparaíso 595',
      url: 'https://www.google.com/maps/search/?api=1&query=Av.+Valpara%C3%ADso+595,+Vi%C3%B1a+del+Mar',
      icon: 'pin',
    }),

    blk('separador', {}),

    blk('texto', {
      texto: 'Av. Valparaíso 595 · Local 53, 2do piso · Viña del Mar',
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

  /* ── Tema: B&N editorial sobre hueso (más suave que Alfa Men) ── */
  theme: {
    preset: 'snow',
    shape:  'rounded',      // esquinas suaves — editorial elegante
    fill:   'solid',
    font:   'oswald',       // condensada, respeta la Ω del logo
    btnBgColor:   '#111111',
    btnTextColor: '#F8F7F4',
    bg: {
      mode: 'gradient',
      fx:   '',
      color: '#F8F7F4',
      c1:   '#F8F7F4',
      c2:   '#FDFCFA',
      angle: 165,
      pattern: 'dots',
      image: '',
    },
    avatarShape: 'circle',
    avatarRing:  '#111111',
    btnAnim:     'none',
    text: {
      titleSize:  'l',
      subSize:    'm',
      weight:     'black',
      caps:       'upper',
      spacing:    'wide',
      align:      'center',
      subWeight:  'normal',
      shadow:     'none',
      titleColor: '#111111',
      subColor:   '#52525B',
    },
  },

  marketing: { ga4: '', metaPixel: '', tiktokPixel: '' },

  seo: {
    title: 'Omega Studio · Barbería premium en Viña del Mar',
    description: 'Reserva tu hora en Omega Studio · Av. Valparaíso 595, Local 53. Corte, barba y tratamientos. Club de fidelidad.',
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

  console.log(`✅ bioo.cl/${USERNAME}  (${bio.blocks.length} bloques · tema B&N editorial sobre hueso)`);
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
