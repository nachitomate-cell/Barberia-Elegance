/**
 * seed-bioo-kronnos-limache.js — Página bioo de Kronnos Studio Limache
 *
 *   → bioo.cl/kronnoslimache
 *
 * Barbería + estilismo unisex en Limache (tenant `kronnos_limache` /
 * sede `limache` del tenant unificado `kronnos`).
 *
 * 🎯 GUARDARRAÍL DE MARCA: chrome NEGRO PROFUNDO con acento NARANJA
 *    (#f97316). Espejo del layout de Peñablanca — mismo aire editorial
 *    premium, cambia el acento a la firma cromática de Limache.
 *
 * Uso:  node seed-bioo-kronnos-limache.js
 *       node seed-bioo-kronnos-limache.js --undo     (elimina la página)
 *
 * Preserva `uid` y `ownerEmail` si el doc ya existe — no le robamos la
 * página al dueño real si él ya la reclamó en el editor.
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
const db   = admin.firestore();
const auth = admin.auth();
const TS   = admin.firestore.FieldValue.serverTimestamp;

const USERNAME     = 'kronnoslimache';
const SITE         = 'https://kronnoslimache.synaptechspa.cl';
const OWNER_EMAIL  = 'kronnoslimache@gmail.com';
const WA           = { prefijo: '56', telefono: '920241041' };

/* ── Helpers de bloques ─────────────────────────────────────────── */
let _seq = 0;
const bid = (p) => `${p}-${(++_seq).toString(36)}`;
const blk = (tipo, o = {}) => ({ id: bid(tipo), tipo, label: '', url: '', activo: true, ...o });

/* ────────────────────────────────────────────────────────────────
 * Kronnos Limache — Premium Dark · Negro + Naranja
 * ──────────────────────────────────────────────────────────────── */
const bio = {
  username: USERNAME,

  perfil: {
    titulo:    'Kronnos Studio Limache',
    subtitulo: 'Barbería · Estilismo unisex\nLimache',
    avatar:    `${SITE}/kronnos/studio.jpg`,
    cover:     `${SITE}/kronnos/kronoslima.png`,
    // ⚠️ La insignia "verificado" es /ic-verified.png (PNG verde fijo).
    // Con paleta negro+naranja pierde y se ve tercero → apagada.
    verified:  false,
  },

  // ⚠️ REGLAS APRENDIDAS (auditoría bioo 2026-07-16):
  //  1. `icon` NO acepta emojis: solo claves de BUTTON_ICONS (SVG con
  //     stroke="currentColor" → heredan color del botón). Un emoji cae al
  //     fallback /ic-{tipo}.png, que es VERDE.
  //  2. Bloque sin `url` se descarta EN SILENCIO en la página pública
  //     (links/u.html: `if (!url) return;`). Todo enlace lleva `url`.
  bloques: [
    /* CTA principal — reservar */
    blk('enlace', {
      label: 'Reservar hora',
      url: SITE,
      featured: true,
      icon: 'scissors',
    }),

    /* Hub de la marca — descubrir las otras sedes (Peñablanca + Woman) */
    blk('enlace', {
      label: 'Conoce nuestras 3 sedes',
      url: 'https://kronnos.synaptechspa.cl',
      icon: 'store',
    }),

    /* Club Kronnos (passwordless · sellos → premios) */
    blk('enlace', {
      label: 'Club Kronnos · junta sellos y canjea',
      url: `${SITE}/dashboard`,
      icon: 'star',
    }),

    /* Contacto directo — half + IG al lado */
    blk('whatsapp', {
      label: 'Escríbenos por WhatsApp',
      url: `https://wa.me/${WA.prefijo}${WA.telefono}?text=${encodeURIComponent('Hola Kronnos Limache 👋 Quiero reservar una hora.')}`,
      prefijo: WA.prefijo,
      telefono: WA.telefono,
      mensaje: 'Hola Kronnos Limache 👋 Quiero reservar una hora.',
      icon: 'phone-m',
      layoutSize: 'half',
    }),

    blk('instagram', {
      label: '@kronnos.studio',
      url: 'https://instagram.com/kronnos.studio',
      usuario: 'kronnos.studio',
      icon: 'instagram',
      layoutSize: 'half',
    }),

    /* Cómo llegar */
    blk('enlace', {
      label: 'Cómo llegar · Limache',
      url: 'https://www.google.com/maps/search/?api=1&query=Paseo+Las+Araucarias+405,+Limache',
      icon: 'pin',
    }),

    blk('separador', {}),

    blk('texto', {
      texto: 'Paseo Las Araucarias 405, local 5 · Limache\nLun a Sáb · 10:30 – 19:00',
    }),

    /* Redes al pie */
    blk('social', {
      label: '',
      socials: [
        { red: 'instagram', valor: 'kronnos.studio' },
        { red: 'whatsapp',  valor: `${WA.prefijo}${WA.telefono}` },
      ],
    }),
  ],

  /* ── Tema: Negro profundo + naranja, editorial premium ── */
  theme: {
    preset: 'night',
    shape:  'sharp',        // esquinas rectas → editorial/brutalist premium
    fill:   'solid',
    font:   'oswald',       // condensada tipo portada de revista
    // Overrides que BLINDAN el look B&N con acento naranja:
    btnBgColor:   '#FAFAFA',
    btnTextColor: '#0a0a0a',
    bg: {
      mode: 'animated',
      fx:   'fluid',        // gradiente en movimiento sutil (naranja asomándose)
      color: '#0a0a0a',
      c1:   '#3a1a00',      // naranja quemado profundo (asoma en el gradiente)
      c2:   '#0a0a0a',      // negro puro
      angle: 165,
      pattern: 'dots',
      image: '',
    },
    avatarShape: 'circle',
    avatarRing:  '#f97316', // aro naranja — firma visual Kronnos Limache
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
    title:       'Kronnos Studio Limache · Barbería y estilismo unisex',
    description: 'Reserva tu hora, únete al Club Kronnos y sigue a Kronnos Limache. Paseo Las Araucarias 405, Limache.',
  },
};

/* ── Escritura ──────────────────────────────────────────────────── */
//
// ⚠️ BLINDAJE (lección del 2026-07-16): una bio NO vive sola. Para que el
// puente `biooEditorBridge` (botón "Abrir Editor Premium" del panel) la abra
// hay que escribir SIEMPRE las 3 piezas coherentes entre sí:
//   1. bios/{handle}.uid + .ownerEmail   → el dueño
//   2. bio_email_owners/{email}.handle   → índice que usa el puente
//   3. bio_users/{uid}.username          → índice inverso
// Si falta (2), el puente NO encuentra la página, cree que el handle está
// tomado por otro y genera basura (kronnoslimache2…).
async function seed() {
  // Resolver UID por email (más robusto que hardcodear — sobrevive a
  // recreaciones del user de auth).
  let uid;
  try {
    const u = await auth.getUserByEmail(OWNER_EMAIL);
    uid = u.uid;
    console.log(`🔑 UID resuelto por email: ${uid}`);
  } catch (e) {
    console.error(`❌ No existe el user de auth ${OWNER_EMAIL}. Corre primero seed-kronnos-admin-creds.js`);
    process.exit(1);
  }

  const ref  = db.doc(`bios/${USERNAME}`);
  const snap = await ref.get();

  // Nunca le robamos la página a un dueño existente distinto.
  const finalUid   = (snap.exists && snap.data().uid)         ? snap.data().uid         : uid;
  const finalEmail = (snap.exists && snap.data().ownerEmail)  ? snap.data().ownerEmail  : OWNER_EMAIL;
  if (snap.exists) console.log(`ℹ️  Doc existente — se conserva uid="${finalUid}" ownerEmail="${finalEmail}"`);

  const batch = db.batch();

  batch.set(ref, {
    uid:        finalUid,
    ownerEmail: finalEmail,
    source:    'gestion-interna',
    username:  bio.username,
    perfil:    bio.perfil,
    bloques:   bio.bloques,
    theme:     bio.theme,
    marketing: bio.marketing,
    seo:       bio.seo,
    updatedAt: TS(),
  }, { merge: true });

  batch.set(db.doc(`bio_email_owners/${finalEmail}`), {
    handle: USERNAME, email: finalEmail, source: 'gestion-interna', createdAt: TS(),
  }, { merge: true });

  batch.set(db.doc(`bio_users/${finalUid}`), {
    username: USERNAME, email: finalEmail, createdAt: TS(),
  }, { merge: true });

  await batch.commit();

  console.log(`✅ bioo.cl/${USERNAME}  (${bio.bloques.length} bloques · negro + naranja)`);
  console.log(`   dueño: ${finalEmail}  ·  índices bio_email_owners + bio_users OK`);
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
