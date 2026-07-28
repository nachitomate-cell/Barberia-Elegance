/**
 * crear-bioo-sion.js — Diseña / actualiza la link-in-bio de Sion Barbería
 * (bioo.cl/sionbarberia) con el mismo lenguaje visual premium que usa
 * bioo.cl/aurasalon: fondo snow blanco/gris, botones dark charcoal, iconos
 * verdes, font Montserrat, sin animaciones. Look "Apple minimalista".
 *
 * Idempotente: si ya existe la bio, PISA theme+perfil+bloques (mantiene
 * ownership y stats). Si no existe, la crea desde cero.
 *
 * Uso:
 *   node scripts/crear-bioo-sion.js            (dry-run)
 *   node scripts/crear-bioo-sion.js --commit
 */
const path  = require('path');
const admin = require('firebase-admin');

const sa = require(path.resolve(__dirname, '..', 'service-account.json'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const { FieldValue } = admin.firestore;

const HANDLE = 'sionbarberia';
const COMMIT = process.argv.includes('--commit');

const AGENDA_URL       = 'https://sion.synaptechspa.cl/';
const WHATSAPP_RAW     = '56935882777';
const MAPS_URL         = 'https://www.google.com/maps/search/?api=1&query=Sion+Barber%C3%ADa+1+Oriente+985+Vi%C3%B1a+del+Mar';
const REVIEW_URL       = 'https://g.page/r/CZD_fOIEqt5VEBM/review';
const INSTAGRAM_HANDLE = 'sion.barberia'; // TODO: confirmar handle real
const AVATAR_URL       = 'https://sion.synaptechspa.cl/sion.png';
const COVER_URL        = 'https://sion.synaptechspa.cl/sion/banner.webp'; // mismo banner de la agenda pública

// Bloques con la misma gramática que Aura: tipo:'link', icon:'<slug>',
// layoutSize:'half' para poner review + maps en la misma fila, separador
// antes de los socials.
const bloques = [
  {
    id: 'agenda',
    tipo: 'link',
    icon: 'calendar',
    label: 'Agendar mi hora',
    url:   AGENDA_URL,
    activo: true,
    featured: true,
  },
  {
    id: 'wa',
    tipo: 'link',
    icon: 'chat',
    label: 'Escríbenos por WhatsApp',
    url:   `https://wa.me/${WHATSAPP_RAW}`,
    activo: true,
  },
  {
    id: 'club',
    tipo: 'link',
    icon: 'gift',
    label: 'Club Sion · junta sellos',
    url:   `${AGENDA_URL}registro.html`,
    activo: true,
  },
  {
    id: 'review',
    tipo: 'link',
    icon: 'star',
    layoutSize: 'half',
    label: 'Reséñanos en Google',
    url:   REVIEW_URL,
    activo: true,
  },
  {
    id: 'maps',
    tipo: 'link',
    icon: 'pin',
    layoutSize: 'half',
    label: 'Cómo llegar',
    url:   MAPS_URL,
    activo: true,
  },
  {
    id: 'sep-1',
    tipo: 'separador',
    activo: true,
  },
  {
    id: 'social-1',
    tipo: 'social',
    activo: true,
    socials: [
      { red: 'instagram', valor: INSTAGRAM_HANDLE },
    ],
  },
];

// Theme calcado del look Aura: snow gradient + dark charcoal buttons.
const theme = {
  preset: 'snow',
  shape:  'rounded',
  fill:   'solid',
  font:   'montserrat',
  bg: {
    mode:    'gradient',
    color:   '#F1F2F4',
    c1:      '#ECEDEF',
    c2:      '#FBFBFC',
    angle:   165,
    pattern: 'dots',
    image:   '',
    fx:      '',
  },
  avatarShape: 'circle',
  avatarRing:  '',
  btnAnim:     'none',
  btnBgColor:  '#2A2B2F',   // dark charcoal
  btnTextColor:'#F4F4F5',   // off-white
  iconStyle:   'green',     // iconos verdes de los bloques
  text: {
    titleSize:  'm',
    subSize:    'm',
    weight:     'black',
    caps:       'normal',
    spacing:    'normal',
    align:      'center',
    shadow:     'none',
    italic:     false,
    titleColor: '#1A1B1E',
    subColor:   '#71727A',
    subWeight:  'normal',
    font:       'montserrat',
  },
};

const perfil = {
  titulo:    'SION BARBERÍA',
  subtitulo: 'Estilo a otro nivel · Viña del Mar',
  avatar:    AVATAR_URL,
  cover:     COVER_URL,
  verified:  false,
};

async function main() {
  console.log(`\n╔═══ Diseñar bioo Sion (look Aura premium) ${COMMIT ? '· COMMIT' : '· DRY-RUN'} ═══╗\n`);

  const bioRef = db.collection('bios').doc(HANDLE);
  const bhRef  = db.collection('bio_handles').doc(HANDLE);
  const bioSnap = await bioRef.get();
  const existed = bioSnap.exists;

  console.log(`  handle    : ${HANDLE}`);
  console.log(`  título    : ${perfil.titulo}`);
  console.log(`  subtítulo : ${perfil.subtitulo}`);
  console.log(`  estado    : ${existed ? 'YA EXISTE → se actualiza (perfil+theme+bloques)' : 'nuevo → creación'}`);
  console.log(`  theme     : ${theme.preset} · font=${theme.font} · btn=${theme.btnBgColor}`);
  console.log(`  bloques   :`);
  bloques.forEach(b => {
    const size = b.layoutSize === 'half' ? '½ ' : '  ';
    const icon = b.icon ? `[${b.icon}]` : b.tipo === 'separador' ? '[───]' : b.tipo === 'social' ? '[social]' : '';
    console.log(`     ${size}${(icon).padEnd(12)} ${b.label || b.tipo}`);
  });
  console.log(`  URL       : https://bioo.cl/${HANDLE}\n`);

  if (!COMMIT) {
    console.log(`  → Dry-run. Corré con --commit para escribir.\n`);
    return;
  }

  if (existed) {
    // Update in-place: pisamos perfil + theme + bloques, mantenemos ownership y stats.
    await bioRef.update({
      perfil,
      theme,
      bloques,
      updatedAt: FieldValue.serverTimestamp(),
    });
    console.log(`  ✓ bios/${HANDLE} actualizado (perfil+theme+bloques pisados)`);
  } else {
    const batch = db.batch();
    batch.set(bioRef, {
      ownerEmail: 'Sionbarberiavina@gmail.com',
      username:   HANDLE,
      perfil,
      bloques,
      theme,
      plan:   'free',
      views:  0,
      clicks: {},
      source: 'designer',
      designedBy: { uid: 'ignaciiio-script', handle: 'ignaciiio' },
      designStatus: 'borrador',
      handoverPhone: WHATSAPP_RAW,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      provisionedAt: FieldValue.serverTimestamp(),
    });
    batch.set(bhRef, {
      owner:  'Sionbarberiavina@gmail.com',
      source: 'designer',
      createdAt: FieldValue.serverTimestamp(),
    });
    await batch.commit();
    console.log(`  ✓ bios/${HANDLE} creado`);
    console.log(`  ✓ bio_handles/${HANDLE} reservado`);
  }

  console.log(`\n╚═══ Listo ═══╝\n`);
  console.log(`  🔗 https://bioo.cl/${HANDLE}\n`);
}

main().then(() => process.exit(0)).catch(e => { console.error('\n✗ ERROR:', e); process.exit(1); });
