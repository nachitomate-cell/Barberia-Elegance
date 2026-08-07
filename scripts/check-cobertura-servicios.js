#!/usr/bin/env node
/**
 * check-cobertura-servicios.js — Todo servicio visible debe tener al menos UN
 * profesional que lo atienda.
 *
 * Por qué existe: el paso 2 del wizard filtra el equipo por `serviciosIds`
 * (compatibilidad por barbero, index.html). Cuando el local agrega servicios
 * NUEVOS al catálogo y nadie los asigna al equipo, esos servicios dejan la
 * grilla del paso 2 VACÍA — "No hay barberos disponibles en este momento" —
 * y la reserva muere ahí, sin error en ningún log. Pasó en kronnos_woman el
 * 07-08-2026: 24 de 43 servicios sin nadie asignado; cliente real bloqueado
 * desde el WebView de Instagram.
 *
 * Réplica EXACTA del filtro público de getBarberos() (firebaseUtils.js):
 * disponible !== false, activo !== false, sin _mainDocId, y admins fuera
 * salvo mostrarEnAgenda === true o tenant delnero. Compatibilidad igual al
 * wizard: serviciosIds ausente o vacío = atiende todo el catálogo.
 *
 * Uso:
 *   npm run check:cobertura                              # todos los tenants
 *   node scripts/check-cobertura-servicios.js kronnos_woman gitana
 *
 * Sale con 1 si algún tenant CON equipo público tiene servicios sin cobertura.
 * Un tenant sin equipo público se reporta como aviso (setup incompleto), no
 * como falla: es otro problema y taparía el que este guard busca.
 */
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FUNCTIONS = path.join(ROOT, 'functions');

// firebase-admin desde functions/ para compartir instancia (mismo motivo que
// check-bot-prompt.js: dos copias del módulo = dos registros de apps).
const admin = require(require.resolve('firebase-admin', { paths: [FUNCTIONS] }));
admin.initializeApp({
  credential: admin.credential.cert(require(path.join(ROOT, 'service-account.json'))),
});
const db = admin.firestore();

const SOLO = process.argv.slice(2).filter(a => !a.startsWith('--'));

// Espejo del filtro público del wizard. Si getBarberos() cambia, cambiar acá.
function esPublico(b, tid) {
  return b.disponible !== false && b.activo !== false && !b._mainDocId
    && (b.rol !== 'admin' || b.mostrarEnAgenda === true || tid === 'delnero');
}

(async () => {
  // SIEMPRE listDocuments(): .get() se salta los tenants cuyo doc raíz no
  // tiene campos (doctrina del repo).
  const tids = SOLO.length
    ? SOLO
    : (await db.collection('tenants').listDocuments()).map(r => r.id);

  let fallas = 0, avisos = 0;
  for (const tid of tids.sort()) {
    const t = db.collection('tenants').doc(tid);
    const [bs, ss] = await Promise.all([
      t.collection('barberos').get(),
      t.collection('servicios').get(),
    ]);
    const equipo = bs.docs.map(d => ({ id: d.id, ...d.data() })).filter(b => esPublico(b, tid));
    const servicios = ss.docs.filter(d => d.data().activo !== false);

    if (!servicios.length) continue; // sin catálogo no hay nada que cubrir

    if (!equipo.length) {
      avisos++;
      console.log(`⚠️  ${tid.padEnd(22)} ${servicios.length} servicios y CERO equipo público (setup incompleto)`);
      continue;
    }

    const huerfanos = servicios.filter(d =>
      !equipo.some(b => !Array.isArray(b.serviciosIds) || !b.serviciosIds.length || b.serviciosIds.includes(d.id)));

    if (huerfanos.length) {
      fallas++;
      console.log(`🚩 ${tid.padEnd(22)} ${huerfanos.length}/${servicios.length} servicios SIN nadie que los atienda:`);
      for (const d of huerfanos) console.log(`     · ${d.data().nombre || d.id}  (${d.id})`);
    } else {
      console.log(`✅ ${tid.padEnd(22)} ${servicios.length} servicios cubiertos · equipo público: ${equipo.length}`);
    }
  }

  console.log('');
  if (fallas) {
    console.log(`🚩 ${fallas} tenant(s) con servicios huérfanos: el paso 2 del wizard queda vacío para esos servicios.`);
    process.exit(1);
  }
  console.log(`✅ Cobertura completa en todos los tenants revisados.${avisos ? ` (${avisos} aviso(s) de setup incompleto)` : ''}`);
  process.exit(0);
})().catch(e => { console.error('FALLÓ:', e.message); process.exit(1); });
