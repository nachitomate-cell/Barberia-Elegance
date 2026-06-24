/**
 * seed-bioo-synaptech.js — Página bioo de SynapTech Labs (Link in Bio · bioo.cl)
 *
 * Página pública de la academia de Arquitectura de Software con IA:
 *
 *   → bioo.cl/synaptech   (tema Noche · fluid violeta/cobalto · ring neón)
 *
 * Conserva uid, isAdmin, clicks, views y createdAt del dueño real
 * (merge:true). Solo reemplaza perfil/bloques/theme/seo. Los analytics
 * acumulados NO se borran.
 *
 * Uso:  node seed-bioo-synaptech.js
 *       node seed-bioo-synaptech.js --undo   (limpia perfil/bloques/theme;
 *                                              NO borra el doc ni el uid)
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

/* ── Helpers ─────────────────────────────────────────────────────── */
const IMG = (id, w = 800) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=85`;

let _seq = 0;
const bid = (p) => `${p}-${(++_seq).toString(36)}`;
const blk = (tipo, o = {}) => ({ id: bid(tipo), tipo, label: '', url: '', activo: true, ...o });

/* ════════════════════════════════════════════════════════════════
 * Perfil — Academia de Arquitectura de Software con IA
 * Voz: pragmática, futurista, B2B/edu. Tagline original del landing.
 * ════════════════════════════════════════════════════════════════ */
const perfil = {
  titulo: 'SynapTech Labs',
  subtitulo: 'Arquitectura de Software con IA\nDonde tus ideas se hacen código.',
  // Cover: dark-tech / matrix-code (cinematográfico, no distrae del avatar).
  cover:  IMG('1518770660439-4636190af475', 1200),
  verified: true,
  // avatar se preserva (merge:true) — el dueño ya subió el logo en base64.
};

/* ════════════════════════════════════════════════════════════════
 * Bloques — embudo: descubrir → conversar → consumir → fidelizar
 * Bento mixto (large/half/full) para jerarquía visual real.
 * ════════════════════════════════════════════════════════════════ */
const blocks = [
  // 1. CTA hero — la postulación es la conversión #1 de la academia.
  blk('enlace',    { label: '🚀 Postula al próximo cohorte', url: 'https://labs.synaptechspa.cl/postular', featured: true, layoutSize: 'large' }),

  // 2. Doble fila — agendar mentoría (decisión calmada) + WhatsApp (decisión rápida).
  blk('enlace',    { label: '📅 Agendar mentoría 1:1', url: 'https://labs.synaptechspa.cl/dashboard/mentoria', layoutSize: 'half' }),
  blk('whatsapp',  { label: 'Conversar por WhatsApp', prefijo: '56', telefono: '912345678', mensaje: 'Hola SynapTech, me interesa el programa 🚀', layoutSize: 'half' }),

  // 3. Pitch en video — embed YouTube real (placeholder genérico hasta que suban su pitch).
  blk('embed',     { url: 'https://www.youtube.com/watch?v=Vu_yJaUjbZk' }),

  // 4. Imagen-hero — workspace dark, refuerza el aspirational.
  blk('imagen',    { img: IMG('1517077304055-6e89abbf09b0', 1000), url: 'https://labs.synaptechspa.cl', layoutSize: 'large' }),

  // 5. Recursos descargables — prueba social + lead gen sin fricción.
  blk('enlace',    { label: '📚 Recursos gratis', url: 'https://labs.synaptechspa.cl/dashboard/recursos', layoutSize: 'half' }),
  blk('enlace',    { label: '🏆 Casos de éxito', url: 'https://labs.synaptechspa.cl/casos', layoutSize: 'half' }),

  // 6. Texto editorial — refuerza valores (Pragmatismo · Autonomía · Evolución).
  blk('texto',     { texto: 'Pragmatismo · Autonomía · Evolución\nProgramas en cohortes · 100% online' }),

  blk('separador', {}),

  // 7. Captura de leads — la "guía gratis" que el dueño ya tenía, con copy afilado.
  blk('newsletter',{
    label: 'Descarga la Guía del Arquitecto con IA',
    subtitulo: 'PDF gratis · 40 páginas · stack completo + 12 prompts listos para producción',
    btnText: 'Quiero la guía',
  }),

  // 8. Redes — LinkedIn primero (B2B), luego IG/YouTube.
  blk('social',    { socials: [
    { red: 'instagram', valor: 'synaptech.labs' },
    { red: 'youtube',   valor: 'synaptechlabs' },
    { red: 'enlace',    valor: 'https://www.linkedin.com/company/synaptech-labs' },
  ] }),
];

/* ════════════════════════════════════════════════════════════════
 * Theme — Noche cinematográfica · fluid violeta/cobalto · ring neón
 * El mismo language visual del landing (dark + IA + futurista).
 * ════════════════════════════════════════════════════════════════ */
const theme = {
  preset: 'night',
  shape: 'rounded',          // 14px Apple-like; pill se ve clubby, no premium tech
  fill: 'solid',
  font: 'montserrat',        // técnica, geométrica, legible en sans-serif
  bg: {
    mode: 'animated', fx: 'fluid',
    c1: '#7c3aed',           // violeta IA
    c2: '#0b1e3a',           // azul cobalto profundo
    angle: 160,
    color: '#0b0d12',
    pattern: 'dots',
    image: '',
  },
  avatarShape: 'rounded',    // squircle (no círculo) → look "app icon"
  avatarRing: '#7c3aed',     // ring violeta neón sobre fondo dark → pop
  btnAnim: 'none',           // sin glow/pulse: confianza/seriedad
  text: { titleSize: 'l', subSize: 'm', weight: 'black', caps: 'normal', spacing: 'tight' },
};

const seo = {
  title:       'SynapTech Labs · Arquitectura de Software con IA',
  description: 'Academia de Arquitectura de Software con IA. Postula al próximo cohorte, agenda mentorías 1:1 y descarga la Guía del Arquitecto con IA. Donde tus ideas se hacen código.',
};

/* ── Escritura ──────────────────────────────────────────────────── */
async function seed() {
  await db.doc(`bios/${USERNAME}`).set({
    username: USERNAME,
    perfil,           // sobrescribe titulo/subtitulo/cover/verified
                      // (avatar NO se toca — merge:true conserva el base64 subido)
    bloques: blocks,
    theme,
    seo,
    updatedAt: TS(),
  }, { merge: true });

  console.log(`✅ bioo.cl/${USERNAME}  (${blocks.length} bloques · uid/clicks/views preservados)`);
  console.log('   Verifica en https://bioo.cl/synaptech');
}

async function undo() {
  // Solo limpia los campos editoriales — preserva uid, isAdmin, clicks, views.
  await db.doc(`bios/${USERNAME}`).set({
    perfil:  { titulo: `@${USERNAME}`, subtitulo: '', cover: '', verified: false },
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
