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
const { execSync, execFileSync } = require('child_process');
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

/* Rutas de cada chip. Réplica MÍNIMA de evolution/plataforma.js: este script
   no puede importarlo (resolvería una segunda instancia de firebase-admin, ver
   el comentario de --correr). Si cambia el esquema de rutas allá, hay que
   tocarlo acá — por eso solo se replica esto y nada de la lógica de negocio. */
const CHIP_DEFAULT = 'synaptech';
const chipDocId  = (c) => (!c || c === CHIP_DEFAULT) ? 'wa_plataforma' : `wa_plataforma_${c}`;
const cuotaDocId = (c, f) => (!c || c === CHIP_DEFAULT) ? f : `${c}__${f}`;
const chipDeTenant = (s) => {
  const v = String((s && s.waPlataformaChip) || '').trim().toLowerCase();
  return v && /^[a-z0-9][a-z0-9_-]{1,23}$/.test(v) ? v : CHIP_DEFAULT;
};

async function listarChips() {
  const refs = await db.collection('_system').listDocuments();
  const ids = [];
  for (const r of refs) {
    if (r.id === 'wa_plataforma') ids.push(CHIP_DEFAULT);
    else if (r.id.startsWith('wa_plataforma_')) {
      const id = r.id.slice('wa_plataforma_'.length);
      if (id) ids.push(id);
    }
  }
  return ids;
}

async function estado() {
  const chips = await listarChips();
  const hoy   = fechaChile();
  console.log('\n=== CHIPS DE SYNAPTECH ===');
  if (!chips.length) {
    console.log('  ✗ ninguno vinculado — ops.synaptechspa.cl → Chips → "Vincular chip nuevo"');
  }
  for (const chipId of chips) {
    const chip = (await db.doc(`_system/${chipDocId(chipId)}`).get()).data() || {};
    const d = chip.vinculadoDesde?.toMillis ? (Date.now() - chip.vinculadoDesde.toMillis()) / 864e5 : 0;
    const cap = Math.min(d >= 30 ? 300 : d >= 7 ? 120 : 40,
      Number.isFinite(Number(chip.topeDiario)) ? Number(chip.topeDiario) : Infinity);
    const c = (await db.doc(`wa_plataforma_cuota/${cuotaDocId(chipId, hoy)}`).get()).data() || {};
    console.log(`\n  [${chipId}] ${chip.nombre || ''}`);
    console.log(`    estado : ${chip.estadoConexion || '—'}${chip.numeroVinculado ? '  +' + chip.numeroVinculado : ''}`);
    console.log(`    edad   : ${d.toFixed(2)} días → tope ${cap}/día${chip.topeDiario != null ? ' (manual ' + chip.topeDiario + ')' : ''}`);
    console.log(`    hoy    : ${c.n || 0} enviados · ${c.respuestas || 0} respuestas · ${c.optout || 0} bajas · ${c.fail || 0} fallos`);
  }

  const refs = await db.collection('_system').listDocuments();
  console.log('\n=== locales con el módulo activo ===');
  let alguno = false;
  for (const r of refs) {
    if (r.id === 'wa_plataforma' || r.id.startsWith('wa_plataforma_')) continue;
    const s = (await r.get()).data() || {};
    if (s.waPlataforma !== true) continue;
    alguno = true;
    const cfg = (await db.doc(`tenants/${r.id}/configuracion/whatsapp`).get()).data() || {};
    const choque = cfg.confirmacionesEnabled === true && cfg.estadoConexion === 'connected';
    const suyo = chipDeTenant(s);
    const vivo = chips.includes(suyo);
    console.log(`  ${r.id.padEnd(22)} chip=${suyo}${vivo ? '' : ' ⚠ NO EXISTE → sale por el principal'}` +
      `${choque ? '   ⚠ TAMBIÉN envía por su número propio → el cron lo salta' : ''}`);
  }
  if (!alguno) console.log('  (ninguno)');

  // Citas de prueba y en qué quedaron
  for (const r of refs) {
    if (r.id === 'wa_plataforma' || r.id.startsWith('wa_plataforma_')) continue;
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
    // Contra TODOS los chips, no solo el principal: mandarle al número del
    // chip2 desde el chip2 es un mensaje a sí mismo igual de inútil.
    for (const c of await listarChips()) {
      const chip = (await db.doc(`_system/${chipDocId(c)}`).get()).data() || {};
      if (tel === String(chip.numeroVinculado)) {
        console.error(`✗ Ese es el número del chip "${c}": se mandaría un mensaje a sí mismo.`);
        process.exit(1);
      }
    }

    // Por qué chip va a salir esta cita: es lo que se está probando, así que
    // conviene decirlo ANTES de crearla y no descubrirlo al ver quién escribió.
    const sysT  = (await db.doc(`_system/${tid}`).get()).data() || {};
    const suyo  = chipDeTenant(sysT);
    const cfgCh = (await db.doc(`_system/${chipDocId(suyo)}`).get()).data() || {};
    console.log(`\n→ ${tid} sale por el chip "${suyo}"` +
      `${cfgCh.numeroVinculado ? ' (+' + cfgCh.numeroVinculado + ')' : ''}` +
      ` · ${cfgCh.estadoConexion || 'sin vincular'}`);
    if (cfgCh.estadoConexion !== 'connected') {
      console.error(`✗ Ese chip no está conectado: la cita se crearía y no saldría nada.`);
      process.exit(1);
    }

    // Servicio real del local, para que el mensaje se vea creíble.
    const sv = await db.collection(`tenants/${tid}/servicios`).limit(1).get().catch(() => null);
    const svDoc    = sv && !sv.empty ? sv.docs[0] : null;
    const servicio = (svDoc && svDoc.data().nombre) || 'Corte';
    const duracion = (svDoc && Number(svDoc.data().duracion)) || 30;

    // ── BARBERO: sin esto la cita es INVISIBLE en la agenda ──
    // El panel arma una columna por profesional y ubica cada cita por
    // `barberoId`. Una cita sin barbero existe en Firestore, dispara el
    // WhatsApp… y no se ve en ninguna parte. Ya nos pasó.
    // Mismo filtrado que el panel: fuera los doc-espejo (_mainDocId), el
    // fantasma de QA y los inactivos.
    const bs = await db.collection(`tenants/${tid}/barberos`).get().catch(() => null);
    let barbero = null;
    if (bs) {
      for (const d of bs.docs) {
        const b = d.data() || {};
        if (b._mainDocId || b.esQA === true) continue;
        if (b.disponible === false || b.activo === false) continue;
        if (!String(b.nombre || '').trim()) continue;
        barbero = { id: d.id, nombre: String(b.nombre).trim() };
        break;
      }
    }
    if (!barbero) {
      console.error(`✗ ${tid} no tiene ningún barbero activo — la cita quedaría invisible en la agenda.`);
      process.exit(1);
    }

    // El cron exige 0 < diffH <= ventana. Se agenda +2h si cabe hoy; si no, mañana.
    const [h] = horaChile().split(':').map(Number);
    const hoyCabe = h + 2 < 22;
    const cita = {
      clienteNombre:   'Prueba Plataforma',
      clienteTelefono: tel,
      servicioNombre:  servicio,
      servicioId:      svDoc ? svDoc.id : '',
      duracion,
      duracionServicio: duracion,
      // Los tres: distintos tenants nacieron con convenciones distintas
      // (delnero usa barberoNombre, ferraza usa barbero) y la agenda ubica
      // la columna por barberoId.
      barberoId:       barbero.id,
      barberoNombre:   barbero.nombre,
      barbero:         barbero.nombre,
      fecha:           hoyCabe ? fechaChile(0) : fechaChile(1),
      hora:            hoyCabe ? `${String((h + 2) % 24).padStart(2, '0')}:00` : '11:00',
      precio:          15000,
      estado:          'Pendiente',   // el cron SOLO toma 'Pendiente'
      waOptIn:         true,          // doble opt-in explícito
      origen:          'test_plataforma',
      [MARCA]:         true,
      createdAt:       FieldValue.serverTimestamp(),
      creadoEn:        FieldValue.serverTimestamp(),
    };
    const ref = await citasCol(tid).add(cita);
    console.log(`\n✓ tenants/${tid}/citas/${ref.id}`);
    console.log(`  ${cita.fecha} ${cita.hora} · ${servicio} · ${barbero.nombre} · destino ${tel}\n`);
    console.log('Dispara el envío ya:  node scripts/wa-plataforma-test.js --correr\n');
    process.exit(0);
  }

  // ── Correr el ciclo AHORA (sin esperar al cron) ──
  if (a.includes('--correr')) {
    const url = secreto('EVOLUTION_API_URL'), key = secreto('EVOLUTION_API_KEY');
    if (!url || !key) { console.error('✗ No pude leer los secrets de Evolution (firebase login?).'); process.exit(1); }

    // Se ejecuta en un proceso hijo con cwd=functions A PROPÓSITO. Si se
    // requiriera plataforma.js desde acá, este script resolvería
    // `firebase-admin` desde la raíz y el módulo lo resolvería desde
    // functions/node_modules: DOS instancias distintas, y la segunda revienta
    // con "The default Firebase app does not exist" aunque ya lo inicializamos.
    console.log('Ejecutando un ciclo del canal plataforma…\n');
    const runner = `
      const admin = require('firebase-admin');
      admin.initializeApp({ credential: admin.credential.cert(require('../service-account.json')) });
      const { crearCliente }   = require('./evolution/client');
      const { _procesarCiclo } = require('./evolution/plataforma');
      (async () => {
        const n = await _procesarCiclo({ evoClient: crearCliente({
          baseUrl: process.env.EVO_URL, apiKey: process.env.EVO_KEY,
        }) });
        console.log('ENVIADOS=' + n);
        process.exit(0);
      })().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
    `;
    let out = '';
    try {
      out = execFileSync(process.execPath, ['-e', runner], {
        encoding: 'utf8',
        cwd: path.resolve(__dirname, '..', 'functions'),
        env: { ...process.env, EVO_URL: url, EVO_KEY: key },
      });
    } catch (e) {
      console.error((e.stdout || '') + (e.stderr || e.message));
      process.exit(1);
    }
    const m = out.match(/ENVIADOS=(\d+)/);
    console.log(out.replace(/ENVIADOS=\d+\n?/, '').trim());
    const n = m ? Number(m[1]) : 0;
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
