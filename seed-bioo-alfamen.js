/**
 * seed-bioo-alfamen.js — Página bioo de Alfa Men (Link in Bio · bioo.cl)
 *
 *   → bioo.cl/alfamen
 *
 * Barbería Alfa Men – Estética Masculina, Av. Valparaíso 694 Local 14, Viña.
 * Datos extraídos de AgendaPro (2026-08-05).
 *
 * 🎯 GUARDARRAÍL DE MARCA: tema CLARO minimal masculino — tinta negra sobre
 *    blanco puro. Nada del rojo #F20000 que traía AgendaPro. Espeja el tema
 *    del tenant (dashboard/reserva/registro), bloque `.tenant-alfamen.tenant-aura`.
 *
 * Uso:  node seed-bioo-alfamen.js
 *       node seed-bioo-alfamen.js --undo
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

const USERNAME     = 'alfamen';
const SITE         = 'https://alfamen.synaptechspa.cl';
const WA           = { prefijo: '56', telefono: '985773308' };
const IG_HANDLE    = 'barberia.alfamen';

// Email real del negocio (AgendaPro). Cuando la cuenta se cree con este email,
// el puente biooEditorBridge la adoptará automáticamente.
const OWNER_UID   = 'bio-pending-alfamen';
const OWNER_EMAIL = 'barberia.alfa@hotmail.com';

let _seq = 0;
const bid = (p) => `${p}-${(++_seq).toString(36)}`;
const blk = (tipo, o = {}) => ({ id: bid(tipo), tipo, label: '', url: '', activo: true, ...o });

/* ────────────────────────────────────────────────────────────────
 * Alfa Men — Snow · B&N minimal masculino (tinta sobre blanco)
 * ──────────────────────────────────────────────────────────────── */
const bio = {
  username: USERNAME,

  perfil: {
    titulo:    'Alfa Men',
    subtitulo: 'Estética masculina · Viña del Mar',
    avatar:    `${SITE}/alfamen/logo.png`,
    cover:     `${SITE}/alfamen/banner.webp`,
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
      url: `https://wa.me/${WA.prefijo}${WA.telefono}?text=${encodeURIComponent('Hola Alfa Men 👋 Quiero reservar una hora.')}`,
      prefijo: WA.prefijo,
      telefono: WA.telefono,
      mensaje: 'Hola Alfa Men 👋 Quiero reservar una hora.',
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
      label: 'Cómo llegar · Av. Valparaíso 694',
      url: 'https://www.google.com/maps/search/?api=1&query=Av.+Valpara%C3%ADso+694,+Vi%C3%B1a+del+Mar',
      icon: 'pin',
    }),

    blk('separador', {}),

    blk('texto', {
      texto: 'Av. Valparaíso 694, Local 14 · Viña del Mar',
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

  /* ── Tema: B&N puro claro (tinta negra sobre blanco) ── */
  theme: {
    preset: 'snow',
    shape:  'sharp',        // líneas duras — masculino contemporáneo
    fill:   'solid',
    font:   'montserrat',   // sans contemporáneo, cortes precisos
    btnBgColor:   '#0A0A0A',
    btnTextColor: '#FFFFFF',
    bg: {
      mode: 'gradient',
      fx:   '',
      color: '#FFFFFF',
      c1:   '#FFFFFF',
      c2:   '#F4F4F4',
      angle: 165,
      pattern: 'dots',
      image: '',
    },
    avatarShape: 'circle',
    avatarRing:  '#0A0A0A',
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
      titleColor: '#0A0A0A',
      subColor:   '#52525B',
    },
  },

  marketing: { ga4: '', metaPixel: '', tiktokPixel: '' },

  seo: {
    title: 'Alfa Men · Estética masculina en Viña del Mar',
    description: 'Reserva tu hora en Alfa Men · Av. Valparaíso 694, Local 14. Corte, barba y Promo FULL. Club de fidelidad.',
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

  console.log(`✅ bioo.cl/${USERNAME}  (${bio.blocks.length} bloques · tema B&N minimal masculino)`);
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
