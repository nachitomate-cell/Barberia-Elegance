/**
 * seed-bioo-synaptech.js — Página bioo de SynapTech (Link in Bio · bioo.cl)
 *
 *   → bioo.cl/synaptech   (Navy #0F1A2B + lima neón #C6F94E · paleta oficial)
 *
 * Escaparate del portafolio REAL de SynapTech SpA:
 *   · SynapTech Studio — agenda + club de fidelidad (empieza.synaptechspa.cl)
 *   · Self-service gratis (crea.synaptechspa.cl)
 *   · bioo — link in bio (bioo.cl)
 *   · Wallo — tarjetas Google/Apple Wallet (wallets.bioo.cl)
 *
 * Conserva uid, isAdmin, clicks, views, createdAt, avatar y cover del
 * dueño real (merge:true — perfil.avatar/cover NO se incluyen, así los
 * base64 subidos en el editor quedan intactos).
 *
 * Uso:  node seed-bioo-synaptech.js
 *       node seed-bioo-synaptech.js --undo   (limpia bloques/theme/seo;
 *                                             NO borra el doc ni el uid)
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
const USERNAME = 'synaptech';

const WA = { prefijo: '56', telefono: '983568212' };

/* ── Helpers de bloques ─────────────────────────────────────────── */
let _seq = 0;
const bid = (p) => `${p}-${(++_seq).toString(36)}`;
const blk = (tipo, o = {}) => ({ id: bid(tipo), tipo, label: '', url: '', activo: true, ...o });

/* ════════════════════════════════════════════════════════════════
 * Perfil — la empresa, no un producto suelto.
 * avatar y cover NO van aquí: se preservan los subidos en el editor.
 * ════════════════════════════════════════════════════════════════ */
const perfil = {
  titulo:    'SynapTech',
  // ⚠️ u.html colapsa los \n (no hay white-space:pre-line) → copy de corrido.
  subtitulo: 'Agenda, fidelización, wallets y link in bio para negocios locales',
  // La insignia /ic-verified.png es VERDE fija → con la paleta lima CALZA.
  verified:  true,
};

/* ════════════════════════════════════════════════════════════════
 * Bloques — embudo: producto estrella → empezar gratis → resto del
 * portafolio → conversar → seguir.
 *
 * ⚠️ REGLAS APRENDIDAS (auditoría bioo 2026-07-16):
 *  1. `icon` NO acepta emojis: solo claves de BUTTON_ICONS (SVG
 *     stroke=currentColor). Un emoji cae al fallback PNG verde.
 *  2. Bloque sin `url` se descarta EN SILENCIO en la página pública.
 * ════════════════════════════════════════════════════════════════ */
const blocks = [
  /* 1. Producto estrella — Studio con activación por IA */
  blk('enlace', {
    label: 'SynapTech Studio · Agenda + club de fidelidad',
    url: 'https://empieza.synaptechspa.cl',
    featured: true,
    layoutSize: 'large',
    icon: 'calendar',
  }),

  /* 2. Doble fila — entrar gratis vs conocer la empresa */
  blk('enlace', {
    label: 'Crea tu agenda gratis',
    url: 'https://crea.synaptechspa.cl',
    layoutSize: 'half',
    icon: 'rocket',
  }),
  blk('enlace', {
    label: 'Conoce SynapTech',
    url: 'https://synaptechspa.cl',
    layoutSize: 'half',
    icon: 'globe',
  }),

  /* 3. Resto del portafolio */
  blk('enlace', {
    label: 'bioo · Tu link in bio, gratis',
    url: 'https://bioo.cl',
    icon: 'link',
  }),
  blk('enlace', {
    label: 'Wallo · Tarjetas en Google y Apple Wallet',
    url: 'https://wallets.bioo.cl',
    icon: 'wallet',
  }),

  /* 4. Qué incluye la plataforma */
  blk('texto', {
    texto: 'Agenda online · Club de sellos y premios · Recordatorios por WhatsApp · Notificaciones push · Pagos online · Hecho en Chile 🇨🇱',
  }),

  blk('separador', {}),

  /* 5. Contacto directo — half + IG al lado */
  blk('whatsapp', {
    label: 'Hablemos por WhatsApp',
    url: `https://wa.me/${WA.prefijo}${WA.telefono}?text=${encodeURIComponent('Hola SynapTech 👋 Quiero digitalizar mi negocio.')}`,
    prefijo: WA.prefijo,
    telefono: WA.telefono,
    mensaje: 'Hola SynapTech 👋 Quiero digitalizar mi negocio.',
    icon: 'phone-m',
    layoutSize: 'half',
  }),
  blk('instagram', {
    label: '@synaptechspa',
    url: 'https://instagram.com/synaptechspa',
    usuario: 'synaptechspa',
    icon: 'instagram',
    layoutSize: 'half',
  }),

  /* 6. Redes al pie */
  blk('social', {
    label: '',
    socials: [
      { red: 'instagram', valor: 'synaptechspa' },
      { red: 'whatsapp',  valor: `${WA.prefijo}${WA.telefono}` },
    ],
  }),
];

/* ════════════════════════════════════════════════════════════════
 * Theme — paleta OFICIAL SynapTech (regla de los dos verdes):
 *   marca #9CCC3C · neón #C6F94E (acento sobre oscuro) · navy #0F1A2B
 * Fondo navy con lima profundo asomándose; botones blancos con texto
 * navy (premium, sin saturar de verde); el neón va en el aro del avatar.
 * ════════════════════════════════════════════════════════════════ */
const theme = {
  preset: 'night',
  shape: 'rounded',          // 14px look app/SaaS
  fill: 'solid',
  iconStyle: 'original',     // íconos sociales a color (no monocromo verde)
  btnBgColor:   '#FAFAFA',
  btnTextColor: '#0F1A2B',
  bg: {
    mode: 'animated',
    fx:   'fluid',
    c1:   '#243A10',         // lima profundo (sombra de #789C30) asomando
    c2:   '#0F1A2B',         // navy profundo de marca
    angle: 160,
    color: '#0F1A2B',
    pattern: 'dots',
    image: '',
  },
  avatarShape: 'rounded',    // squircle → look "app icon"
  avatarRing:  '#C6F94E',    // lima NEÓN — el acento permitido sobre oscuro
  btnAnim: 'none',           // sin rebotes: seriedad B2B
  // ⚠️ u.html lee la fuente en theme.text.font (NO en theme.font) y el
  //    merge:true conserva llaves viejas → pisar italic/subColor explícito.
  text: {
    font:      'montserrat', // geométrica, técnica
    titleSize: 'l',
    subSize:   'm',
    weight:    'black',
    caps:      'normal',
    spacing:   'tight',
    align:     'center',
    subWeight: 'normal',
    shadow:    'none',
    italic:    false,
    titleColor: '',
    subColor:   '',          // '' → blanco .92 sobre fondo animado (limpio)
    btnColor:   '',
  },
};

const seo = {
  title:       'SynapTech · Agenda, fidelización y wallets para tu negocio',
  description: 'Software chileno para negocios locales: agenda online con club de fidelidad (SynapTech Studio), tarjetas en Google y Apple Wallet (Wallo) y link in bio (bioo). Crea tu agenda gratis o pide tu demo.',
};

/* ── Escritura ──────────────────────────────────────────────────── */
async function seed() {
  await db.doc(`bios/${USERNAME}`).set({
    username: USERNAME,
    perfil,           // merge profundo: avatar/cover base64 intactos
    bloques: blocks,
    theme,
    seo,
    updatedAt: TS(),
  }, { merge: true });

  console.log(`✅ bioo.cl/${USERNAME}  (${blocks.length} bloques · navy + lima neón)`);
  console.log('   uid/clicks/views/avatar/cover preservados');
  console.log('   Verifica en https://bioo.cl/synaptech');
}

async function undo() {
  // Solo limpia los campos editoriales — preserva uid, isAdmin, clicks, views.
  await db.doc(`bios/${USERNAME}`).set({
    perfil:  { titulo: `@${USERNAME}`, subtitulo: '', verified: false },
    bloques: [],
    theme:   {},
    seo:     { title: '', description: '' },
    updatedAt: TS(),
  }, { merge: true });
  console.log(`🗑️  perfil/bloques de bioo.cl/${USERNAME} limpiados (uid conservado)`);
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
