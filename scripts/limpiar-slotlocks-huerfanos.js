#!/usr/bin/env node
/**
 * limpiar-slotlocks-huerfanos.js
 *
 * La reserva pública NO puede leer /citas (requiere auth): lee `slotLocks`, un
 * espejo público de la ocupación. Si ese espejo tiene candados de más, muestra
 * horas ocupadas que en la agenda están libres — el cliente no puede reservar
 * y el local no entiende por qué.
 *
 * Busca candados de bloqueo cuyo `bloqueoId` YA NO EXISTE: bloqueos que el
 * local desbloqueó y que dejaron basura detrás.
 *
 * Causa original (corregida en jul-2026): el "Bloqueo rango" de agenda.html
 * crea UN candado por franja pero guardaba solo el PRIMERO en
 * `bloqueo.slotLockId`, y el borrado eliminaba únicamente ese. Los demás
 * sobrevivían al bloqueo. Arreglado en agenda.html + Agenda.jsx, que ahora
 * borran todos los candados con ese `bloqueoId`.
 *
 * Queda para el caso de que algún camino futuro vuelva a filtrar candados: es
 * barato de correr y el dry-run no toca nada.
 *
 * Uso:  node scripts/limpiar-slotlocks-huerfanos.js [tenant]     (dry-run)
 *       APLICAR=1 node scripts/limpiar-slotlocks-huerfanos.js    (borra)
 */
const path  = require('path');
const admin = require('firebase-admin');

const sa = require(path.resolve(__dirname, '..', 'service-account.json'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const APLICAR = process.env.APLICAR === '1';
const SOLO    = process.argv[2] || null;   // tenant opcional

(async () => {
  // listDocuments(): los docs padre de /tenants no existen, un .get() se
  // saltaría casi todos los tenants.
  const refs = SOLO
    ? [db.collection('tenants').doc(SOLO)]
    : await db.collection('tenants').listDocuments();

  let totalHuerfanos = 0, tenantsAfectados = 0;

  for (const t of refs) {
    let locks;
    try {
      locks = (await t.collection('slotLocks').get()).docs.map(d => ({ id: d.id, ...d.data() }));
    } catch { continue; }
    // ── Candados de BLOQUEO cuyo bloqueo ya no existe ──
    const deBloqueo = locks.filter(l => l.bloqueoId);
    const idsUnicos = [...new Set(deBloqueo.map(l => l.bloqueoId))];
    const vivos = new Set();
    for (const bid of idsUnicos) {
      const s = await t.collection('bloqueos').doc(bid).get();
      if (s.exists) vivos.add(bid);
    }
    const huerfanosBloqueo = deBloqueo.filter(l => !vivos.has(l.bloqueoId));

    // ── Candados de CITA cuya cita ya no existe (o quedó cancelada) ──
    // El trigger liberarSlot* soltaba el candado al CANCELAR pero se rendía si
    // la cita se BORRABA ("if (!after) return false"), y el candado quedaba
    // para siempre bloqueando una hora que la agenda muestra libre. Corregido
    // en jul-2026; esto limpia lo que quedó de antes.
    const deCita = locks.filter(l => l.citaId && !l.bloqueoId);
    const idsCitas = [...new Set(deCita.map(l => l.citaId))];
    const citasVivas = new Set();
    for (const cid of idsCitas) {
      const s = await t.collection('citas').doc(cid).get();
      if (s.exists && String(s.data()?.estado || '').toLowerCase() !== 'cancelada') citasVivas.add(cid);
    }
    const huerfanosCita = deCita.filter(l => !citasVivas.has(l.citaId));

    const huerfanos = [...huerfanosBloqueo, ...huerfanosCita];
    if (!huerfanos.length) continue;

    tenantsAfectados++;
    totalHuerfanos += huerfanos.length;
    console.log(`\n== ${t.id}: ${huerfanos.length} candado(s) sin respaldo`);
    if (huerfanosBloqueo.length) {
      const porBloqueo = {};
      huerfanosBloqueo.forEach(l => { (porBloqueo[l.bloqueoId] = porBloqueo[l.bloqueoId] || []).push(l); });
      Object.entries(porBloqueo).forEach(([bid, ls]) => {
        const horas = ls.map(l => `${l.fecha} ${l.hora}`).sort();
        console.log(`   bloqueoId ${bid} (ya no existe) -> ${ls.length} horas bloqueadas de mas`);
        horas.slice(0, 8).forEach(h => console.log(`       ${h}`));
        if (horas.length > 8) console.log(`       ... y ${horas.length - 8} mas`);
      });
    }
    huerfanosCita.forEach(l => {
      console.log(`   citaId ${l.citaId} (borrada o cancelada) -> ${l.fecha} ${l.hora} · barbero ${l.barberoId}`);
    });

    if (APLICAR) {
      let batch = db.batch(), ops = 0;
      for (const l of huerfanos) {
        batch.delete(t.collection('slotLocks').doc(l.id));
        if (++ops >= 400) { await batch.commit(); batch = db.batch(); ops = 0; }
      }
      if (ops) await batch.commit();
      console.log(`   OK - ${huerfanos.length} candados eliminados`);
    }
  }

  console.log(`\ntenants afectados: ${tenantsAfectados} | candados huerfanos: ${totalHuerfanos}`);
  if (!APLICAR && totalHuerfanos) console.log('(dry-run - APLICAR=1 para borrarlos)');
  process.exit(0);
})();
