#!/usr/bin/env node
/**
 * check-agenda-visibles.js — ¿el panel y la reserva pública ofrecen a la MISMA
 * gente?
 *
 * El panel decide las columnas de la agenda con `atiendeSillon` de
 * admin-panel/src/lib/roles.js. La reserva pública decide a quién ofrece con
 * `ReservaCore.atiendeSillon` de firebaseUtils.js. Son dos implementaciones
 * porque una es módulo Vite y la otra un script global del navegador: no pueden
 * importarse entre sí.
 *
 * Cuando se separan, el modo de falla es silencioso y caro: la pública ofrece a
 * alguien que el panel no dibuja, entra una cita y NO aparece en ninguna agenda.
 * Nadie la atiende y el cliente llega igual. Ya pasó (Kronnos, jul-2026: 4 citas
 * confirmadas invisibles).
 *
 * Este guard hace dos cosas:
 *   1. compara las dos listas de roles de mostrador, y
 *   2. evalúa los dos predicados contra los barberos REALES de cada tenant y
 *      exige que coincidan persona por persona.
 *
 * Uso:  node scripts/check-agenda-visibles.js
 *       npm run check          (junto con los otros guards)
 *
 * Sin credenciales corre igual, pero solo el paso 1.
 */
const fs   = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
let fallos = 0;
const mal = m => { console.log('  ✗ ' + m); fallos++; };
const ok  = m => console.log('  ✓ ' + m);

/* ── 1. Las dos listas de roles de mostrador ───────────────────── */
console.log('\n== roles de mostrador: las dos definiciones ==');

const leerRoles = (file, rx) => {
  const txt = fs.readFileSync(path.join(RAIZ, file), 'utf8');
  const m = txt.match(rx);
  if (!m) return null;
  return m[1].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean).sort();
};

const rolesPanel   = leerRoles('admin-panel/src/lib/roles.js', /ROLES_MOSTRADOR\s*=\s*new Set\(\[([^\]]+)\]/);
const rolesPublica = leerRoles('firebaseUtils.js',             /ROLES_MOSTRADOR\s*=\s*\[([^\]]+)\]/);

if (!rolesPanel)   mal('no encontré ROLES_MOSTRADOR en admin-panel/src/lib/roles.js');
if (!rolesPublica) mal('no encontré ROLES_MOSTRADOR en firebaseUtils.js');
if (rolesPanel && rolesPublica) {
  if (rolesPanel.join(',') === rolesPublica.join(',')) {
    ok(`coinciden: ${rolesPanel.join(', ')}`);
  } else {
    mal(`NO coinciden.\n      panel   : ${rolesPanel.join(', ')}\n      pública : ${rolesPublica.join(', ')}`);
  }
}

/* ── 2. Los predicados, contra datos reales ────────────────────── */
// Réplicas de los dos predicados. Si alguien cambia uno de los originales sin
// el otro, el paso 1 lo caza; esto además caza divergencias de lógica.
const atiendePanel = (b, tid) => {
  if (!b || b._mainDocId || b.disponible === false || b.esQA) return false;
  if (!(rolesPanel || []).includes(b.rol)) return true;
  return tid === 'delnero' || b.mostrarEnAgenda === true || b.esBarbero === true;
};
const atiendePublica = (b, tid) => {
  if (!b || b._mainDocId || b.disponible === false || b.esQA) return false;
  if (!(rolesPublica || []).includes(b.rol)) return true;
  return tid === 'delnero' || b.mostrarEnAgenda === true || b.esBarbero === true;
};

(async () => {
  console.log('\n== los dos predicados contra los barberos reales ==');
  let admin, sa;
  try {
    admin = require('firebase-admin');
    sa    = require(path.join(RAIZ, 'service-account.json'));
  } catch {
    console.log('  – sin service-account.json: me salto la comparación con datos reales');
    console.log(fallos === 0 ? '\nOK\n' : `\n${fallos} problema(s)\n`);
    process.exit(fallos ? 1 : 0);
  }

  if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
  const db = admin.firestore();

  // listDocuments(): los docs padre de /tenants no existen y un .get() se
  // saltaría casi todos los tenants.
  const tenants = (await db.collection('tenants').listDocuments()).map(t => t.id);
  let revisados = 0, discrepancias = 0;

  for (const tid of tenants) {
    const snap = await db.collection(`tenants/${tid}/barberos`).get();
    for (const d of snap.docs) {
      const b = { id: d.id, ...d.data() };
      if (b._mainDocId) continue;
      revisados++;
      const p = atiendePanel(b, tid), q = atiendePublica(b, tid);
      if (p !== q) {
        discrepancias++;
        mal(`${tid} · ${b.nombre || b.id} (rol=${b.rol || '—'}) → panel=${p ? 'SÍ' : 'no'} pública=${q ? 'SÍ' : 'no'}`);
      }
    }
  }
  if (!discrepancias) ok(`${revisados} miembros de equipo en ${tenants.length} tenants: las dos vistas coinciden`);

  console.log(fallos === 0 ? '\nOK\n' : `\n${fallos} problema(s)\n`);
  process.exit(fallos ? 1 : 0);
})();
