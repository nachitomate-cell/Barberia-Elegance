/**
 * seed-bioo-kronnos-woman.js — Página bioo de Kronnos Woman
 *
 *   → bioo.cl/kronnoswoman
 *
 * Salón de belleza & estética (manicura, cabello, pestañas, masajes,
 * maquillaje) en Limache. Tenant `kronnos_woman` / sede `woman` del
 * tenant unificado `kronnos`.
 *
 * 🎯 GUARDARRAÍL DE MARCA: chrome NEGRO PROFUNDO con acento ROSA MAGENTA
 *    (#ec4899). Aire femenino editorial — botones platino sobre negro,
 *    aro rosa en el avatar, gradiente animado con toque magenta.
 *
 * 🚫 REGLA DURA (memoria: feedback_kronnos_woman_sin_viking): Viking Brand
 *    NUNCA aparece en Woman. Ni banner, ni badge, ni showcase.
 *
 * Uso:  node seed-bioo-kronnos-woman.js
 *       node seed-bioo-kronnos-woman.js --undo     (elimina la página)
 *
 * Sin WhatsApp: el tel de la sede está pendiente del cliente (config.js:236).
 * Al confirmarlo, agregar un bloque `whatsapp` (ver el gemelo de Peñablanca).
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

const USERNAME    = 'kronnoswoman';
const SITE        = 'https://kronnoswoman.synaptechspa.cl';
const OWNER_EMAIL = 'kronnoswoman@gmail.com';

/* ── Helpers de bloques ─────────────────────────────────────────── */
let _seq = 0;
const bid = (p) => `${p}-${(++_seq).toString(36)}`;
const blk = (tipo, o = {}) => ({ id: bid(tipo), tipo, label: '', url: '', activo: true, ...o });

/* ────────────────────────────────────────────────────────────────
 * Kronnos Woman — Premium Dark · Negro + Rosa magenta
 * ──────────────────────────────────────────────────────────────── */
const bio = {
  username: USERNAME,

  perfil: {
    titulo:    'Kronnos Woman',
    subtitulo: 'Belleza & estética\nManicura · Cabello · Pestañas · Masajes\nLimache',
    avatar:    `${SITE}/kronnos/woman.jpg`,
    cover:     `${SITE}/kronnos/kronoswoman.png`,
    // ⚠️ Insignia "verificado" es PNG verde fijo → apagada (chocaría con rosa).
    verified:  false,
  },

  // ⚠️ REGLAS APRENDIDAS (auditoría bioo 2026-07-16):
  //  1. `icon` NO acepta emojis: solo claves de BUTTON_ICONS.
  //  2. Bloque sin `url` se descarta EN SILENCIO en la página pública.
  bloques: [
    /* CTA principal — reservar */
    blk('enlace', {
      label: 'Reservar hora',
      url: SITE,
      featured: true,
      icon: 'scissors',
    }),

    /* Hub de la marca — descubrir las otras sedes (Peñablanca + Limache) */
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

    /* Instagram — sin WhatsApp aún (tel pendiente), IG cubre el contacto */
    // Label corto: el nombre solo, sin CTA — con icono, un texto largo se
    // comprime en móvil y pierde jerarquía (issue 2026-08-01).
    blk('instagram', {
      label: '@kronnoswoman',
      url: 'https://instagram.com/kronnoswoman',
      usuario: 'kronnoswoman',
      icon: 'instagram',
    }),

    /* Cómo llegar */
    blk('enlace', {
      label: 'Cómo llegar · Limache',
      url: 'https://www.google.com/maps/search/?api=1&query=Palmira+Romano+Sur+405,+Limache',
      icon: 'pin',
    }),

    blk('separador', {}),

    blk('texto', {
      texto: 'Palmira Romano Sur 405, local 3 · Limache\nLun a Dom · 09:30 – 23:00',
    }),

    /* Redes al pie (solo IG por ahora) */
    blk('social', {
      label: '',
      socials: [
        { red: 'instagram', valor: 'kronnoswoman' },
      ],
    }),
  ],

  /* ── Tema: Negro profundo + rosa magenta, editorial femenino premium ── */
  theme: {
    preset: 'night',
    shape:  'rounded',      // esquinas suaves → más femenino que el brutalist
    fill:   'solid',
    font:   'oswald',       // condensada tipo revista de moda
    // Overrides que BLINDAN el look negro con acento rosa:
    btnBgColor:   '#FAFAFA',
    btnTextColor: '#0a0a0a',
    bg: {
      mode: 'animated',
      fx:   'fluid',        // gradiente en movimiento sutil (rosa asomándose)
      color: '#0a0a0a',
      c1:   '#3a0022',      // rosa/violeta profundo (asoma en el gradiente)
      c2:   '#0a0a0a',      // negro puro
      angle: 165,
      pattern: 'dots',
      image: '',
    },
    avatarShape: 'circle',
    avatarRing:  '#ec4899', // aro rosa magenta — firma visual Kronnos Woman
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
    title:       'Kronnos Woman · Belleza y estética en Limache',
    description: 'Reserva tu hora en Kronnos Woman. Manicura, cabello, pestañas, masajes y más. Palmira Romano Sur 405, Limache.',
  },
};

/* ── Escritura ──────────────────────────────────────────────────── */
//
// ⚠️ BLINDAJE (lección del 2026-07-16): las 3 piezas juntas para que el
// puente biooEditorBridge abra ESTA página desde el panel:
//   1. bios/{handle}.uid + .ownerEmail
//   2. bio_email_owners/{email}.handle
//   3. bio_users/{uid}.username
async function seed() {
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

  console.log(`✅ bioo.cl/${USERNAME}  (${bio.bloques.length} bloques · negro + rosa magenta)`);
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
