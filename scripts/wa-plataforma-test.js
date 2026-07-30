'use strict';

// scripts/wa-plataforma-test.js
// ─────────────────────────────────────────────────────────────────
// Piloto del CANAL PLATAFORMA: confirmaciones desde el chip propio de
// SynapTech por Evolution (functions/evolution/plataforma.js).
//
// Parametrizado por tenant a propósito: hoy delnero, mañana sion.
//
// ⚠️ El chip se vincula desde /admin → drawer de cualquier tenant →
//    WhatsApp → "Vincular chip (QR)". Es GLOBAL: un solo número para
//    todos los locales con el módulo. Este script no lo vincula.
//
// Uso:
//   node scripts/wa-plataforma-test.js --estado
//   node scripts/wa-plataforma-test.js --on  delnero
//   node scripts/wa-plataforma-test.js --off delnero
//   node scripts/wa-plataforma-test.js --cita delnero 56992563282
//   node scripts/wa-plataforma-test.js --correr        ← dispara el ciclo YA
//   node scripts/wa-plataforma-test.js --limpiar delnero
// ─────────────────────────────────────────────────────────────────

const path  = require('path');
const { execSync } = require('child_process');
const admin = require('firebase-admin');

const sa = require(path.resolve(__dirname, '..', 'service-account.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const { FieldValue } = admin.firestore;

const MARCA = '_testPlataforma';

const citasCol = (tid) => (tid === 'elegance'
  ? db.collection('citas')
  : db.collection(`tenants/${tid}/citas`));

const fechaChile = (off = 0) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date(Date.now() + off * 86400000));

const horaChile = () => new Intl.DateTimeFormat('es-CL', {
  timeZone: 'America/Santiago', hour: '2-digit', minute: '2-digit', hour12: false,
}).format(new Date());

function secreto(nombre) {
  try {
    return execSync(`firebase functions:secrets:access ${nombre}`, {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], cwd: path.resolve(__dirname, '..'),
    }).trim();
  } catch (_) { return null; }
}

async function estado() {
  const chip = (await db.doc('_system/wa_plataforma').get()).data();
  console.log('\n=== CHIP SYNAPTECH (compartido) ===');
  if (!chip) {
    console.log('  ✗ sin vincular — /admin → WhatsApp → "Vincular chip (QR)"');
  } else {
    const d = chip.vinculadoDesde?.toMillis ? (Date.now() - chip.vinculadoDesde.toMillis()) / 864e5 : 0;
    const cap = d >= 30 ? 300 : d >= 7 ? 120 : 40;
    const hoy = fechaChile();
    const c = (await db.doc(`wa_plataforma_cuota/${hoy}`).get()).data() || {};
    console.log(`  estado  : ${chip.estadoConexion || '—'}${chip.numeroVinculado ? '  +' + chip.numeroVinculado : ''}`);
    console.log(`  edad    : ${d.toFixed(2)} días → tope ${cap}/día`);
    console.log(`  hoy     : ${c.n || 0} enviados · ${c.respuestas || 0} respuestas · ${c.optout || 0} bajas · ${c.fail || 0} fallos`);
  }

  const refs = await db.collection('_system').listDocuments();
  console.log('\n=== locales con el módulo activo ===');
  let alguno = false;
  for (const r of refs) {
    const s = (await r.get()).data() || {};
    if (s.waPlataforma !== true) continue;
    alguno = true;
    const cfg = (await db.doc(`tenants/${r.id}/configuracion/whatsapp`).get()).data() || {};
    const choque = cfg.confirmacionesEnabled === true && cfg.estadoConexion === 'connected';
    console.log(`  ${r.id}${choque ? '   ⚠ TAMBIÉN envía por su número propio → el cron lo salta' : ''}`);
  }
  if (!alguno) console.log('  (ninguno)');

  // Citas de prueba y en qué quedaron
  for (const r of refs) {
    const s = (await r.get()).data() || {};
    if (s.waPlataforma !== true) continue;
    const snap = await citasCol(r.id).where(MARCA, '==', true).get().catch(() => null);
    if (!snap || snap.empty) continue;
    console.log(`\n=== citas de prueba en ${r.id} ===`);
    for (const doc of snap.docs) {
      const c = doc.data();
      const marca = c.waConfirmSolicitada ? '📤 preguntada' : '⏳ pendiente';
      let resp = '';
      if (c.waClienteConfirmoEn) resp = '  ✅ CONFIRMÓ';
      if (c.waClienteCanceloEn)  resp = '  🚫 CANCELÓ';
      console.log(`  ${doc.id}  ${c.fecha} ${c.hora}  ${c.clienteTelefono}  estado=${c.estado}  ${marca}${resp}`);
      const p = await db.doc(`wa_plataforma_chats/${c.clienteTelefono}`).get();
      console.log(`     índice teléfono→tenant: ${p.exists ? 'sí (esperando respuesta)' : 'no'}`);
    }
  }
  console.log(`\nhora Chile: ${horaChile()}  (el cron corre cada 30 min entre 09:00 y 21:00)\n`);
}

(async () => {
  const a = process.argv.slice(2);
  const flag = (f) => a.indexOf(f);

  if (a.includes('--estado') || !a.length) { await estado(); process.exit(0); }

  // ── Encender / apagar el módulo por local ──
  for (const [f, val] of [['--on', true], ['--off', false]]) {
    const i = flag(f);
    if (i === -1) continue;
    const tid = a[i + 1];
    if (!tid) { console.error(`✗ Falta el tenant. Uso: ${f} <tenantId>`); process.exit(1); }
    if (val) {
      const cfg = (await db.doc(`tenants/${tid}/configuracion/whatsapp`).get()).data() || {};
      if (cfg.confirmacionesEnabled === true && cfg.estadoConexion === 'connected') {
        console.error(`✗ ${tid} ya manda confirmaciones por SU PROPIO número.`);
        console.error('  El cron del canal plataforma lo saltaría para no duplicar.');
        console.error('  Apaga primero: node scripts/wa-evolution-piloto.js --off');
        process.exit(1);
      }
    }
    await db.doc(`_system/${tid}`).set({ waPlataforma: val }, { merge: true });
    console.log(`✓ ${tid}: módulo plataforma ${val ? 'ACTIVADO' : 'desactivado'}`);
    await estado(); process.exit(0);
  }

  // ── Cita de prueba ──
  const iC = flag('--cita');
  if (iC !== -1) {
    const tid = a[iC + 1];
    const tel = String(a[iC + 2] || '').replace(/\D/g, '');
    if (!tid || !/^\d{11,}$/.test(tel)) {
      console.error('✗ Uso: --cita <tenantId> <569XXXXXXXX>');
      process.exit(1);
    }
    const chip = (await db.doc('_system/wa_plataforma').get()).data() || {};
    if (tel === String(chip.numeroVinculado)) {
      console.error('✗ Ese es el número del propio chip: se mandaría un mensaje a sí mismo.');
      process.exit(1);
    }

    // Nombre real de un servicio del local, para que el mensaje se vea creíble.
    const sv = await db.collection(`tenants/${tid}/servicios`).limit(1).get().catch(() => null);
    const servicio = (sv && !sv.empty && sv.docs[0].data().nombre) || 'Corte';

    // El cron exige 0 < diffH <= ventana. Se agenda +2h si cabe hoy; si no, mañana.
    const [h] = horaChile().split(':').map(Number);
    const hoyCabe = h + 2 < 22;
    const cita = {
      clienteNombre:   'Prueba Plataforma',
      clienteTelefono: tel,
      servicioNombre:  servicio,
      fecha:           hoyCabe ? fechaChile(0) : fechaChile(1),
      hora:            hoyCabe ? `${String((h + 2) % 24).padStart(2, '0')}:00` : '11:00',
      precio:          15000,
      estado:          'Pendiente',   // el cron SOLO toma 'Pendiente'
      waOptIn:         true,          // doble opt-in explícito
      [MARCA]:         true,
      createdAt:       FieldValue.serverTimestamp(),
    };
    const ref = await citasCol(tid).add(cita);
    console.log(`\n✓ tenants/${tid}/citas/${ref.id}`);
    console.log(`  ${cita.fecha} ${cita.hora} · ${servicio} · destino ${tel}\n`);
    console.log('Dispara el envío ya:  node scripts/wa-plataforma-test.js --correr\n');
    process.exit(0);
  }

  // ── Correr el ciclo AHORA (sin esperar al cron) ──
  if (a.includes('--correr')) {
    const url = secreto('EVOLUTION_API_URL'), key = secreto('EVOLUTION_API_KEY');
    if (!url || !key) { console.error('✗ No pude leer los secrets de Evolution (firebase login?).'); process.exit(1); }
    const { crearCliente } = require(path.resolve(__dirname, '..', 'functions', 'evolution', 'client'));
    const { _procesarCiclo } = require(path.resolve(__dirname, '..', 'functions', 'evolution', 'plataforma'));
    console.log('Ejecutando un ciclo del canal plataforma…');
    const n = await _procesarCiclo({ evoClient: crearCliente({ baseUrl: url, apiKey: key }) });
    console.log(`\n→ ${n} mensaje(s) enviado(s).`);
    if (!n) console.log('  (revisa --estado: chip conectado, módulo activo, cita Pendiente con waOptIn y dentro de la ventana)');
    await estado(); process.exit(0);
  }

  // ── Limpieza ──
  const iL = flag('--limpiar');
  if (iL !== -1) {
    const tid = a[iL + 1];
    if (!tid) { console.error('✗ Uso: --limpiar <tenantId>'); process.exit(1); }
    const snap = await citasCol(tid).where(MARCA, '==', true).get();
    for (const doc of snap.docs) {
      const tel = doc.data().clienteTelefono;
      await doc.ref.delete();
      if (tel) await db.doc(`wa_plataforma_chats/${tel}`).delete().catch(() => {});
      console.log(`✓ borrada ${doc.id}`);
    }
    console.log(`\n${snap.size} cita(s) de prueba eliminadas de ${tid}.\n`);
    process.exit(0);
  }

  await estado();
  process.exit(0);
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
