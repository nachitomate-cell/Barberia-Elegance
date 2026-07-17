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
const SITE         = 'https://studiodieciseis.synaptechspa.cl';
const WA           = { prefijo: '56', telefono: '937179177' };

// Dueño = la cuenta con la que el LOCAL entra a su panel. Es lo que hace que
// "Abrir Editor Premium" (biooEditorBridge) abra ESTA página y no cree una basura.
const OWNER_UID   = 'H1ahfD7yrHejPOMjtI6gpiBsq0l1';
const OWNER_EMAIL = 'studiodieciseis5@gmail.com';

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
    // ⚠️ B&N: la insignia de verificado es un PNG raster VERDE fijo
    // (/ic-verified.png, no se puede teñir) → apagada.
    verified:  false,
  },

  // ⚠️ DOS REGLAS APRENDIDAS (auditoría 2026-07-16), no romper:
  //  1. `icon` NO acepta emojis: solo claves de BUTTON_ICONS (SVG inline con
  //     stroke="currentColor" → heredan el color del botón = B&N). Un emoji cae
  //     al fallback /ic-{tipo}.png, que es VERDE.
  //  2. Un bloque SIN `url` se descarta EN SILENCIO en la página pública
  //     (links/u.html: `if (!url) return;`), aunque el editor sí lo muestre.
  //     → todo bloque de enlace lleva `url` explícita.
  blocks: [
    /* CTA principal — reservar */
    blk('enlace', {
      label: 'Reservar hora',
      url: SITE,
      featured: true,
      icon: 'scissors',
    }),

    /* Club de fidelidad (passwordless · sellos → premios) */
    blk('enlace', {
      label: 'Club · junta sellos y canjea',
      url: `${SITE}/dashboard`,
      icon: 'star',
    }),

    /* Contacto directo */
    blk('whatsapp', {
      label: 'Escríbenos por WhatsApp',
      url: `https://wa.me/${WA.prefijo}${WA.telefono}?text=${encodeURIComponent('Hola Studio Dieciséis 👋 Quiero reservar una hora.')}`,
      prefijo: WA.prefijo,
      telefono: WA.telefono,
      mensaje: 'Hola Studio Dieciséis 👋 Quiero reservar una hora.',
      icon: 'phone-m',
      layoutSize: 'half',
    }),

    /* Instagram */
    blk('instagram', {
      label: '@studio.dieciseis_',
      url: 'https://instagram.com/studio.dieciseis_',
      usuario: 'studio.dieciseis_',
      icon: 'instagram',
      layoutSize: 'half',
    }),

    /* Cómo llegar */
    blk('enlace', {
      label: 'Cómo llegar · Galería Beye',
      url: 'https://www.google.com/maps/search/?api=1&query=Condell+1525,+Valpara%C3%ADso',
      icon: 'pin',
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
//
// ⚠️ BLINDAJE (lección del enredo del 2026-07-16): una bio NO vive sola. Para
// que el puente `biooEditorBridge` la abra (botón "Abrir Editor Premium" del
// panel) hay que escribir SIEMPRE las 3 piezas coherentes entre sí:
//   1. bios/{handle}.uid + .ownerEmail   → el dueño
//   2. bio_email_owners/{email}.handle   → índice que usa el puente
//   3. bio_users/{uid}.username          → índice inverso
// Si falta (2), el puente NO encuentra la página, cree que el handle está
// tomado por otro y genera basura (studiodieciseis2, studiodieciseis5…).
async function seed() {
  const ref  = db.doc(`bios/${USERNAME}`);
  const snap = await ref.get();

  // Nunca le robamos la página a un dueño existente.
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

  // Índices que hacen que el puente abra ESTA página (y no cree una nueva).
  batch.set(db.doc(`bio_email_owners/${email}`), {
    handle: USERNAME, email, source: 'gestion-interna', createdAt: TS(),
  }, { merge: true });

  batch.set(db.doc(`bio_users/${uid}`), {
    username: USERNAME, email, createdAt: TS(),
  }, { merge: true });

  await batch.commit();

  console.log(`✅ bioo.cl/${USERNAME}  (${bio.blocks.length} bloques · tema B&N)`);
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
