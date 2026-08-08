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
 * wizard (_haceElServicio en index.html, semántica unificada del 07-08):
 * si el servicio restringe (`barberosDisponibles` no vacío) esa lista manda;
 * si no, rige `serviciosIds` del profesional (ausente o vacío = atiende todo).
 *
 * Uso:
 *   npm run check:cobertura                              # todos los tenants
 *   node scripts/check-cobertura-servicios.js kronnos_woman gitana
 *
 * Sale con 1 si algún tenant CON equipo público tiene servicios sin cobertura.
 * Un tenant sin equipo público se reporta como aviso (setup incompleto), no
 * como falla: es otro problema y taparía el que este guard busca.
 *
 * Segundo pase (08-08-2026) — "marca sin efecto": el servicio tiene cobertura
 * pero alguien lo marcó en su ficha de Equipo y la restricción del servicio lo
 * excluye igual. Es el mismo choque de dos editores visto desde la otra punta,
 * y el pase de arriba NO lo ve porque el servicio sí tiene a alguien. Mordió en
 * kronnos_woman: Nicole entró el 07-08 con 37 de 43 marcados, las restricciones
 * eran de cuando el local tenía 2 personas y la pública la ofrecía en 3
 * servicios. Cerró la semana con 0 citas y nada en los logs.
 *
 * Va como AVISO, no como falla: reservar un servicio a un maestro y marcarlo
 * igual en la ficha del resto es una configuración legítima. Se arregla con
 * `node scripts/sync-restricciones-barbero.js <tenant> <barberoId> --apply`.
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

  let fallas = 0, avisos = 0, anuladas = 0;
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

    // Espejo de _haceElServicio (index.html): restricción del servicio manda;
    // sin ella, la lista del profesional. OJO: una restricción que solo apunta
    // a gente no-pública (desactivada, borrada) deja al servicio huérfano igual.
    const huerfanos = servicios.filter(d => {
      const restr = Array.isArray(d.data().barberosDisponibles) ? d.data().barberosDisponibles.map(String) : [];
      if (restr.length) return !equipo.some(b => restr.includes(String(b.id)));
      return !equipo.some(b => !Array.isArray(b.serviciosIds) || !b.serviciosIds.length || b.serviciosIds.includes(d.id));
    });

    if (huerfanos.length) {
      fallas++;
      console.log(`🚩 ${tid.padEnd(22)} ${huerfanos.length}/${servicios.length} servicios SIN nadie que los atienda:`);
      for (const d of huerfanos) console.log(`     · ${d.data().nombre || d.id}  (${d.id})`);
    } else {
      console.log(`✅ ${tid.padEnd(22)} ${servicios.length} servicios cubiertos · equipo público: ${equipo.length}`);
    }

    // Segundo pase: marcas de Equipo que la restricción del servicio anula.
    // Solo mira a quien TIENE lista propia — sin `serviciosIds` no marcó nada
    // y no hay intención que contradecir.
    for (const b of equipo) {
      if (!Array.isArray(b.serviciosIds) || !b.serviciosIds.length) continue;
      const muertas = servicios.filter(d => {
        if (!b.serviciosIds.map(String).includes(d.id)) return false;
        const restr = Array.isArray(d.data().barberosDisponibles) ? d.data().barberosDisponibles.map(String) : [];
        return restr.length > 0 && !restr.includes(String(b.id));
      });
      if (!muertas.length) continue;
      anuladas++;
      console.log(`   ⚠ ${(b.nombre || b.id)}: ${muertas.length} servicio(s) marcados en Equipo que NO se le ofrecen (restricción del servicio manda)`);
      console.log(`      ${muertas.slice(0, 8).map(d => d.data().nombre || d.id).join(' · ')}${muertas.length > 8 ? ` · +${muertas.length - 8} más` : ''}`);
      console.log(`      arreglo: node scripts/sync-restricciones-barbero.js ${tid} ${b.id} --apply`);
    }
  }

  console.log('');
  if (anuladas) {
    console.log(`⚠️  ${anuladas} profesional(es) con marcas de Equipo anuladas por la restricción del servicio (ver arriba).`);
  }
  if (fallas) {
    console.log(`🚩 ${fallas} tenant(s) con servicios huérfanos: el paso 2 del wizard queda vacío para esos servicios.`);
    process.exit(1);
  }
  console.log(`✅ Cobertura completa en todos los tenants revisados.${avisos ? ` (${avisos} aviso(s) de setup incompleto)` : ''}`);
  process.exit(0);
})().catch(e => { console.error('FALLÓ:', e.message); process.exit(1); });
