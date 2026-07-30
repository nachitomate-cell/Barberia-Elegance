'use strict';

// scripts/wa-evolution-piloto.js
// ─────────────────────────────────────────────────────────────────
// Piloto del canal EVOLUTION (número propio del local) en delnero.
// Enciende los flags, crea citas falsas para que el cron mande las
// confirmaciones, y reporta el costo real de la IA.
//
// ⚠️ OJO CON EL BOT: `botEnabled` hace que el asistente responda a
//    CUALQUIERA que escriba al número vinculado. En delnero ese número
//    es el WhatsApp comercial de SynapTech, así que encenderlo hace que
//    el bot de la barbería le conteste a clientes de SynapTech. Por eso
//    el bot va en un flag aparte y NO se enciende con --on.
//
// ⚠️ NO PUEDES PROBAR EL BOT ESCRIBIÉNDOTE A TI MISMO: los mensajes
//    fromMe se leen como "el dueño tomó el control" y silencian el bot
//    2h en ese chat (cerebro.js). Hace falta un segundo teléfono.
//
// Uso:
//   node scripts/wa-evolution-piloto.js --estado          → qué hay
//   node scripts/wa-evolution-piloto.js --on              → confirmaciones ON
//   node scripts/wa-evolution-piloto.js --bot-on          → + bot conversacional
//   node scripts/wa-evolution-piloto.js --bot-off         → apaga solo el bot
//   node scripts/wa-evolution-piloto.js --off             → apaga todo
//   node scripts/wa-evolution-piloto.js --cita 56912345678  → cita falsa
//   node scripts/wa-evolution-piloto.js --limpiar         → borra las de prueba
//   node scripts/wa-evolution-piloto.js --costo           → costo IA de hoy
// ─────────────────────────────────────────────────────────────────

const path  = require('path');
const admin = require('firebase-admin');

const sa = require(path.resolve(__dirname, '..', 'service-account.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const { FieldValue } = admin.firestore;

const TID   = 'delnero';
const MARCA = '_testEvolution';

const cfgRef  = db.doc(`tenants/${TID}/configuracion/whatsapp`);
const citasCol = () => db.collection(`tenants/${TID}/citas`);

const fechaChile = (off = 0) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date(Date.now() + off * 86400000));

const horaChile = () => new Intl.DateTimeFormat('es-CL', {
  timeZone: 'America/Santiago', hour: '2-digit', minute: '2-digit', hour12: false,
}).format(new Date());

// Tope diario escalonado por madurez del número (espejo de evolution/cuota.js).
function capsDe(cfg) {
  const desde = cfg?.vinculadoDesde?.toMillis ? cfg.vinculadoDesde.toMillis() : 0;
  const dias  = desde ? (Date.now() - desde) / 86400000 : 0;
  if (dias >= 30) return { dias, total: 300, conf: 150 };
  if (dias >= 7)  return { dias, total: 120, conf: 60  };
  return { dias, total: 40, conf: 20 };
}

async function estado() {
  const cfg = (await cfgRef.get()).data() || {};
  const caps = capsDe(cfg);
  console.log(`\n=== canal Evolution · ${TID} ===`);
  console.log(`  conexión              = ${cfg.estadoConexion || '—'}`);
  console.log(`  número vinculado      = ${cfg.numeroVinculado || '—'}`);
  console.log(`  confirmaciones        = ${cfg.confirmacionesEnabled === true}`);
  console.log(`  bot conversacional    = ${cfg.botEnabled === true}`);
  console.log(`  antigüedad del número = ${caps.dias.toFixed(1)} días`);
  console.log(`  topes hoy             = ${caps.conf} proactivos / ${caps.total} salientes totales`);
  console.log(`  hora Chile ahora      = ${horaChile()}  (ventana de envío 09:00–21:00)`);

  const cuota = (await db.doc(`tenants/${TID}/wa_cuota/${fechaChile()}`).get()).data() || {};
  console.log(`  enviados hoy          = ${cuota.n || 0}`);

  const snap = await citasCol().where(MARCA, '==', true).get();
  console.log(`\n=== ${snap.size} cita(s) de prueba ===`);
  snap.forEach(d => {
    const c = d.data();
    const marca = c.waConfirmSolicitada ? '📤 preguntada' : '⏳ pendiente de preguntar';
    console.log(`  ${d.id}  ${c.fecha} ${c.hora}  ${c.clienteTelefono}  estado=${c.estado}  ${marca}`);
  });
  await costo();
}

async function costo() {
  const hoy = new Date().toISOString().slice(0, 10);
  const mes = hoy.slice(0, 7);
  const dia = (await db.doc(`_metrics/ai_dia_${TID}_${hoy}`).get()).data();
  const men = (await db.doc(`_metrics/ai_vendor_${TID}_${mes}`).get()).data();
  const bot = (await db.doc(`_metrics/bot_${TID}_${mes}`).get()).data();

  console.log(`\n=== costo IA · ${TID} ===`);
  const fmt = (d, etiqueta) => {
    if (!d) { console.log(`  ${etiqueta}: sin datos aún`); return; }
    const inTok = d.tokensIn || 0, outTok = d.tokensOut || 0;
    const cw = d.tokensCacheWrite || 0, cr = d.tokensCacheRead || 0;
    const total = inTok + cw + cr;
    const hit = total ? (cr / total * 100).toFixed(0) : 0;
    console.log(`  ${etiqueta}: ${d.llamadas || 0} llamadas · $${(d.costUsd || 0).toFixed(4)} USD`);
    console.log(`     in=${inTok}  out=${outTok}  cacheWrite=${cw}  cacheRead=${cr}  (hit ${hit}%)`);
    if (d.llamadas) console.log(`     costo por llamada = $${((d.costUsd || 0) / d.llamadas).toFixed(5)} USD`);
  };
  fmt(dia, `hoy (${hoy})`);
  fmt(men, `mes (${mes})`);
  if (bot) {
    console.log(`  eventos de negocio: agendadas=${bot.agendada || 0} canceladas=${bot.cancelada || 0} conf_si=${bot.conf_si || 0} conf_no=${bot.conf_no || 0}`);
  }
  console.log('');
}

(async () => {
  const args = process.argv.slice(2);
  const has  = (f) => args.includes(f);

  if (has('--costo'))  { await costo();  process.exit(0); }
  if (has('--estado')) { await estado(); process.exit(0); }

  if (has('--limpiar')) {
    const snap = await citasCol().where(MARCA, '==', true).get();
    for (const d of snap.docs) {
      const tel = d.data().clienteTelefono;
      await d.ref.delete();
      if (tel) await db.doc(`tenants/${TID}/wa_conversaciones/${tel}`).delete().catch(() => {});
      console.log(`✓ borrada ${d.id}`);
    }
    console.log(`\n${snap.size} cita(s) de prueba eliminadas.\n`);
    process.exit(0);
  }

  if (has('--off')) {
    await cfgRef.set({ confirmacionesEnabled: false, botEnabled: false }, { merge: true });
    console.log('✓ confirmaciones y bot APAGADOS');
    await estado(); process.exit(0);
  }

  if (has('--bot-off')) {
    await cfgRef.set({ botEnabled: false }, { merge: true });
    console.log('✓ bot conversacional APAGADO (las confirmaciones siguen como estaban)');
    await estado(); process.exit(0);
  }

  if (has('--on') || has('--bot-on')) {
    const patch = { confirmacionesEnabled: true };
    if (has('--bot-on')) {
      patch.botEnabled = true;
      patch.botApagadoEn = FieldValue.delete();
      patch.botApagadoMotivo = FieldValue.delete();
    }
    await cfgRef.set(patch, { merge: true });
    console.log(`✓ confirmaciones ENCENDIDAS${has('--bot-on') ? ' + bot conversacional ENCENDIDO' : ''}`);

    // Evitar el choque de canales: si Meta también manda recordatorio a este
    // tenant, el cliente recibe el mismo aviso dos veces.
    const wa = (await db.doc(`wa_notif/${TID}`).get()).data() || {};
    if (wa.planRecordatorio === true) {
      await db.doc(`wa_notif/${TID}`).set({ planRecordatorio: false }, { merge: true });
      console.log('✓ wa_notif/delnero.planRecordatorio = false  (evita recordatorio duplicado por Meta)');
    }
    if (has('--bot-on')) {
      console.log('\n⚠️  El bot ahora responde a CUALQUIERA que escriba al número vinculado.');
      console.log('    Apágalo al terminar:  node scripts/wa-evolution-piloto.js --bot-off');
    }
    await estado(); process.exit(0);
  }

  const idx = args.indexOf('--cita');
  if (idx !== -1) {
    const tel = (args[idx + 1] || '').replace(/\D/g, '');
    if (!/^\d{11,}$/.test(tel)) {
      console.error('✗ Falta el teléfono destino en formato 569XXXXXXXX.');
      console.error('  Uso: node scripts/wa-evolution-piloto.js --cita 56912345678');
      process.exit(1);
    }
    const cfg = (await cfgRef.get()).data() || {};
    if (tel === String(cfg.numeroVinculado)) {
      console.error('✗ Ese es el MISMO número de la instancia. La confirmación se la mandaría a sí mismo');
      console.error('  y tu respuesta se leería como "el dueño tomó el control". Usa otro teléfono.');
      process.exit(1);
    }

    // El cron exige: estado 'Pendiente', waOptIn true, y 0 < diffH <= ventana(24).
    const [hNow] = horaChile().split(':').map(Number);
    const enDosHoras = `${String((hNow + 2) % 24).padStart(2, '0')}:00`;
    const hoyMismo   = hNow + 2 < 22;

    const cita = {
      clienteNombre:   'Prueba Evolution',
      clienteTelefono: tel,
      servicioNombre:  'Corte + Barba',
      barbero:         'Barbero Demo',
      fecha:           hoyMismo ? fechaChile(0) : fechaChile(1),
      hora:            hoyMismo ? enDosHoras : '11:00',
      precio:          15000,
      estado:          'Pendiente',   // el cron SOLO toma 'Pendiente'
      waOptIn:         true,          // doble opt-in explícito
      [MARCA]:         true,
      createdAt:       FieldValue.serverTimestamp(),
    };
    const ref = await citasCol().add(cita);
    console.log(`\n✓ Cita de prueba → tenants/${TID}/citas/${ref.id}`);
    console.log(`  ${cita.fecha} ${cita.hora} · destino ${tel}\n`);
    console.log('El cron evolutionConfirmaciones corre cada 30 min (09:00–21:00 Chile).');
    console.log('Cuando llegue el WhatsApp, responde CONFIRMAR o CANCELAR desde ESE teléfono.');
    console.log('Después:  node scripts/wa-evolution-piloto.js --estado\n');
    process.exit(0);
  }

  await estado();
  console.log('Sin acción. Flags: --estado --on --bot-on --bot-off --off --cita <fono> --limpiar --costo\n');
  process.exit(0);
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
