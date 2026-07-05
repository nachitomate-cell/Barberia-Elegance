/**
 * Diseña las bioo.cl de todos los emprendedores de Patio Curauma.
 *
 * Corre por defecto en DRY-RUN (solo imprime el plan). Para escribir:
 *   node scripts/design-bioos-patio.js --apply
 *
 * Solo toca `bios/<handle>.theme` (merge). No cambia bloques, ni owner, ni plan.
 * Antes de escribir guarda el theme previo en `_theme_backup_20260705` para poder
 * revertir con: node scripts/design-bioos-patio.js --revert
 *
 * Estrategia:
 *   1. Query bios where source == 'club-patio'.
 *   2. Match por palabra clave (café/pelu/boutique/etc.) → look temático.
 *   3. Fallback: hash determinístico del handle → uno de 12 looks curados.
 *   Ninguna combinación se repite consecutivamente y el mix incluye:
 *     - imagenes (bio-fondos/fondoN.jpg)
 *     - gradientes animados (aurora/fluid/grain)
 *     - patrones (dots/grid/diag)
 *     - presets planos (snow/night)
 */
'use strict';
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const APPLY  = process.argv.includes('--apply');
const REVERT = process.argv.includes('--revert');

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(fs.readFileSync(
    path.join(__dirname, '..', 'service-account.json'), 'utf8'))),
  projectId: 'barberia-elegance',
});
const db = admin.firestore();
const BACKUP_KEY = '_theme_backup_20260705';

// ── LOOKS CURADOS ─────────────────────────────────────────────────────────
// Cada look = theme completo. Escogidos para funcionar solos y para variar
// mucho entre sí (imagen / animado / patrón / plano).
const LOOKS = {
  sunset_img5: {
    label: 'Sunset · foto cálida',
    preset:'sunset', shape:'rounded', fill:'solid', btnAnim:'float',
    iconStyle:'green', avatarShape:'circle',
    bg:{ mode:'image', image:'/bio-fondos/fondo5.jpg', angle:'165' },
    text:{ font:'poppins', titleSize:'l', subSize:'m', weight:'black', shadow:'soft', align:'center' },
  },
  aurora_rose: {
    label: 'Aurora rosé',
    preset:'rose', shape:'pill', fill:'solid', btnAnim:'pulse',
    iconStyle:'green', avatarShape:'circle',
    bg:{ mode:'animated', fx:'aurora', c1:'#f43f5e', c2:'#7c3aed', angle:'165' },
    text:{ font:'montserrat', titleSize:'l', subSize:'m', weight:'black', shadow:'glow', align:'center' },
  },
  fluid_ocean: {
    label: 'Fluid océano',
    preset:'ocean', shape:'rounded', fill:'solid', btnAnim:'none',
    iconStyle:'green', avatarShape:'circle',
    bg:{ mode:'animated', fx:'fluid', c1:'#0ea5e9', c2:'#1e3a8a', angle:'150' },
    text:{ font:'inter', titleSize:'l', subSize:'m', weight:'black', shadow:'soft', align:'center' },
  },
  grain_forest: {
    label: 'Grain bosque',
    preset:'forest', shape:'rounded', fill:'solid', btnAnim:'shine',
    iconStyle:'green', avatarShape:'circle',
    bg:{ mode:'animated', fx:'grain', c1:'#166534', c2:'#052e16', angle:'180' },
    text:{ font:'nunito', titleSize:'l', subSize:'m', weight:'black', shadow:'soft', align:'center' },
  },
  grape_img2: {
    label: 'Grape · foto',
    preset:'grape', shape:'pill', fill:'solid', btnAnim:'grow',
    iconStyle:'green', avatarShape:'circle',
    bg:{ mode:'image', image:'/bio-fondos/fondo2.jpg', angle:'165' },
    text:{ font:'playfair', titleSize:'l', subSize:'m', weight:'black', shadow:'soft', align:'center' },
  },
  dots_lime: {
    label: 'Dots lime',
    preset:'lime', shape:'rounded', fill:'solid', btnAnim:'tada',
    iconStyle:'green', avatarShape:'circle',
    bg:{ mode:'pattern', pattern:'dots', color:'#84cc16' },
    text:{ font:'poppins', titleSize:'l', subSize:'m', weight:'black', shadow:'none', align:'center' },
  },
  snow_clean: {
    label: 'Snow minimalista',
    preset:'snow', shape:'sharp', fill:'outline', btnAnim:'none',
    iconStyle:'original', avatarShape:'rounded',
    bg:{ mode:'preset' },
    text:{ font:'inter', titleSize:'l', subSize:'m', weight:'black', shadow:'none', align:'center' },
  },
  night_gold: {
    label: 'Night · botón dorado',
    preset:'night', shape:'pill', fill:'solid', btnAnim:'shine',
    btnBgColor:'#eab308', btnTextColor:'#111827',
    iconStyle:'green', avatarShape:'circle',
    bg:{ mode:'preset' },
    text:{ font:'playfair', titleSize:'l', subSize:'m', weight:'black', shadow:'glow', align:'center' },
  },
  fluid_sunset: {
    label: 'Fluid sunset',
    preset:'sunset', shape:'rounded', fill:'solid', btnAnim:'bounce',
    iconStyle:'green', avatarShape:'circle',
    bg:{ mode:'animated', fx:'fluid', c1:'#f97316', c2:'#dc2626', angle:'155' },
    text:{ font:'oswald', titleSize:'l', subSize:'m', weight:'black', shadow:'hard', align:'center' },
  },
  img3_ocean: {
    label: 'Ocean · foto',
    preset:'ocean', shape:'rounded', fill:'solid', btnAnim:'float',
    iconStyle:'green', avatarShape:'circle',
    bg:{ mode:'image', image:'/bio-fondos/fondo3.jpg', angle:'165' },
    text:{ font:'inter', titleSize:'l', subSize:'m', weight:'black', shadow:'soft', align:'center' },
  },
  aurora_grape: {
    label: 'Aurora grape',
    preset:'grape', shape:'pill', fill:'solid', btnAnim:'swing',
    iconStyle:'green', avatarShape:'circle',
    bg:{ mode:'animated', fx:'aurora', c1:'#a855f7', c2:'#4c1d95', angle:'165' },
    text:{ font:'lora', titleSize:'l', subSize:'m', weight:'black', shadow:'glow', align:'center' },
  },
  img4_forest: {
    label: 'Forest · foto',
    preset:'forest', shape:'rounded', fill:'solid', btnAnim:'none',
    iconStyle:'green', avatarShape:'circle',
    bg:{ mode:'image', image:'/bio-fondos/fondo4.jpg', angle:'165' },
    text:{ font:'nunito', titleSize:'l', subSize:'m', weight:'black', shadow:'soft', align:'center' },
  },
  grid_lime: {
    label: 'Grid lime',
    preset:'lime', shape:'rounded', fill:'solid', btnAnim:'jelly',
    iconStyle:'green', avatarShape:'circle',
    bg:{ mode:'pattern', pattern:'grid', color:'#65a30d' },
    text:{ font:'bebas', titleSize:'l', subSize:'m', weight:'black', shadow:'none', spacing:'wide', align:'center' },
  },
  img7_rose: {
    label: 'Rose · foto',
    preset:'rose', shape:'rounded', fill:'solid', btnAnim:'float',
    iconStyle:'green', avatarShape:'circle',
    bg:{ mode:'image', image:'/bio-fondos/fondo7.jpg', angle:'165' },
    text:{ font:'pacifico', titleSize:'l', subSize:'m', weight:'normal', shadow:'soft', align:'center' },
  },
  fluid_night: {
    label: 'Fluid noche',
    preset:'night', shape:'rounded', fill:'solid', btnAnim:'shine',
    iconStyle:'green', avatarShape:'circle',
    bg:{ mode:'animated', fx:'fluid', c1:'#111827', c2:'#6b21a8', angle:'170' },
    text:{ font:'montserrat', titleSize:'l', subSize:'m', weight:'black', shadow:'glow', align:'center' },
  },
  diag_sunset: {
    label: 'Diag sunset',
    preset:'sunset', shape:'pill', fill:'solid', btnAnim:'pulse',
    iconStyle:'green', avatarShape:'circle',
    bg:{ mode:'pattern', pattern:'diag', color:'#f97316' },
    text:{ font:'poppins', titleSize:'l', subSize:'m', weight:'black', shadow:'soft', align:'center' },
  },
  img8_grape: {
    label: 'Grape · foto (fondo8)',
    preset:'grape', shape:'rounded', fill:'solid', btnAnim:'float',
    iconStyle:'green', avatarShape:'circle',
    bg:{ mode:'image', image:'/bio-fondos/fondo8.jpg', angle:'165' },
    text:{ font:'playfair', titleSize:'l', subSize:'m', weight:'black', shadow:'soft', align:'center' },
  },
  img9_night: {
    label: 'Night · foto (fondo9)',
    preset:'night', shape:'pill', fill:'solid', btnAnim:'shine',
    iconStyle:'green', avatarShape:'circle',
    bg:{ mode:'image', image:'/bio-fondos/fondo9.jpg', angle:'165' },
    text:{ font:'montserrat', titleSize:'l', subSize:'m', weight:'black', shadow:'glow', align:'center' },
  },
};

// Pool para la rotación determinística (18 looks, todos distintos).
const POOL = Object.keys(LOOKS);

// Match semántico por keyword → look forzado. Se prueban en orden; primer hit gana.
// Cada rubro tiene 2-3 opciones que se alternan por hash para variar entre
// negocios del mismo rubro.
const KEYWORD_MAP = [
  { kw: /(cafe|coffee|panader|pasteler|reposter|churro|helad|dulce)/i,
    looks: ['fluid_sunset', 'sunset_img5', 'diag_sunset'] },
  { kw: /(pizza|sushi|comida|resto|restaurant|kebab|empanad|burger|hamburgue|food|cocina|gastro|almuerz|cena)/i,
    looks: ['sunset_img5', 'grain_forest', 'fluid_sunset'] },
  { kw: /(pelu|barber|barbería|est[eé]tica|spa|salon|belleza|u[nñ]as|nails|masaj|depila|terapi|wellness|reiki|holist)/i,
    looks: ['img7_rose', 'aurora_rose', 'night_gold'] },
  { kw: /(boutique|ropa|moda|fashion|vestido|zapat|calzado|accesor|tienda de ropa|indumentar)/i,
    looks: ['aurora_grape', 'grape_img2', 'img8_grape'] },
  { kw: /(joyer|reloj|joyas|lujo|orfeb|premium|gold)/i,
    looks: ['night_gold', 'img9_night', 'fluid_night'] },
  { kw: /(fitness|gym|deporte|sport|yoga|pilates|entrena|crossfit|nutric)/i,
    looks: ['grain_forest', 'img4_forest', 'fluid_ocean'] },
  { kw: /(tech|tecno|electron|celu|reparac|inform[aá]t|comput|servicio t[eé]cnico)/i,
    looks: ['fluid_ocean', 'img3_ocean', 'snow_clean'] },
  { kw: /(kids|ni[nñ]os|juguet|infantil|beb[eé])/i,
    looks: ['dots_lime', 'grid_lime', 'img7_rose'] },
  { kw: /(flor|planta|vivero|organic|natural|verd|eco|bio)/i,
    looks: ['img4_forest', 'grain_forest', 'dots_lime'] },
  { kw: /(cerv|beer|bar|pub|licor|vinos|coctel)/i,
    looks: ['fluid_night', 'diag_sunset', 'night_gold'] },
  { kw: /(mascota|pet|veterinar|perr|gat)/i,
    looks: ['dots_lime', 'img4_forest', 'grid_lime'] },
  { kw: /(arte|art|dise[nñ]o|design|estudio|creative|creativ|handmade|hecho a mano|artesan)/i,
    looks: ['snow_clean', 'aurora_grape', 'img8_grape'] },
  { kw: /(velas|aromatic|jab[oó]n|cosmet|skin|piel|cuidado)/i,
    looks: ['img7_rose', 'grape_img2', 'snow_clean'] },
  { kw: /(libro|librer|book|editorial|lectura|papeler)/i,
    looks: ['snow_clean', 'img4_forest', 'grape_img2'] },
  { kw: /(cafeteria|\bt[eé]\b|\btea\b|matcha|chocolate)/i,
    looks: ['sunset_img5', 'grain_forest', 'diag_sunset'] },
];

// Hash rápido para elegir determinísticamente.
function hash(str){
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function pickLook(handle, name){
  const hay = ((name||'') + ' ' + (handle||'')).toLowerCase();
  for (const rule of KEYWORD_MAP) {
    if (rule.kw.test(hay)) {
      const arr = rule.looks;
      return arr[hash(handle) % arr.length];
    }
  }
  return POOL[hash(handle) % POOL.length];
}

// ── Main ─────────────────────────────────────────────────────────────────
(async () => {
  console.log(`\n${REVERT ? '↩️  REVERT' : APPLY ? '✍️  APPLY' : '🧪 DRY-RUN'}  · diseño bioos Patio Curauma\n${'═'.repeat(70)}`);

  const snap = await db.collection('bios').where('source', '==', 'club-patio').get();
  console.log(`📋 Encontrados ${snap.size} bios con source='club-patio'\n`);
  if (snap.empty) { console.log('  (nada que hacer)'); process.exit(0); }

  const plan = [];
  for (const doc of snap.docs) {
    const handle = doc.id;
    const data   = doc.data() || {};
    const name   = (data.perfil && data.perfil.titulo) || handle;

    if (REVERT) {
      const bkp = data[BACKUP_KEY];
      if (!bkp) { plan.push({ handle, name, action: 'skip', reason: 'sin backup' }); continue; }
      plan.push({ handle, name, action: 'revert', bkp });
      continue;
    }

    const lookKey = pickLook(handle, name);
    const look    = LOOKS[lookKey];
    plan.push({ handle, name, lookKey, look });
  }

  // Imprimir plan siempre.
  for (const row of plan) {
    if (row.action === 'revert') {
      console.log(`  ↩️  ${row.handle.padEnd(28)} ${String(row.name).slice(0, 30).padEnd(30)}  ← restaurar theme previo`);
    } else if (row.action === 'skip') {
      console.log(`  ⏭️  ${row.handle.padEnd(28)} ${String(row.name).slice(0, 30).padEnd(30)}  (${row.reason})`);
    } else {
      console.log(`  🎨 ${row.handle.padEnd(28)} ${String(row.name).slice(0, 30).padEnd(30)}  →  ${row.lookKey.padEnd(15)} (${row.look.label})`);
    }
  }

  if (!APPLY && !REVERT) {
    console.log(`\n(dry-run) 30+ escrituras propuestas. Corré con --apply para aplicar.`);
    process.exit(0);
  }

  console.log(`\n${'═'.repeat(70)}\nEscribiendo…\n`);

  let ok = 0, err = 0;
  for (const row of plan) {
    try {
      if (row.action === 'skip') continue;
      const ref = db.collection('bios').doc(row.handle);
      if (row.action === 'revert') {
        await ref.set({ theme: row.bkp, [BACKUP_KEY]: admin.firestore.FieldValue.delete(), updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      } else {
        // Guardar theme previo solo si no hay backup ya (idempotente).
        const cur = await ref.get();
        const prevTheme = cur.exists ? (cur.data().theme || null) : null;
        const setPayload = {
          theme: row.look,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        if (cur.exists && !(cur.data()[BACKUP_KEY])) {
          setPayload[BACKUP_KEY] = prevTheme;
        }
        await ref.set(setPayload, { merge: true });
      }
      ok++;
      process.stdout.write(`  ✅ ${row.handle}\n`);
    } catch (e) {
      err++;
      console.log(`  ❌ ${row.handle}: ${e.message}`);
    }
  }

  console.log(`\n${'═'.repeat(70)}\n✅ Escritas: ${ok}   ❌ Errores: ${err}\n`);
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
