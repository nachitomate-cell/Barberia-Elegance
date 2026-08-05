'use strict';

// scripts/probar-bot.js
// ─────────────────────────────────────────────────────────────────────────────
//  PROBADOR DEL BOT DE WHATSAPP — batería de conversaciones + detector de errores
//
//  Corre el cerebro REAL (functions/evolution/cerebro.js): mismo prompt, mismo
//  modelo, mismo catálogo, mismas horas de Firestore. Las herramientas de
//  LECTURA corren de verdad; las de ESCRITURA validan todo pero no escriben
//  (ctx.simulado) — así una hora que el bot no podría reservar sale como error
//  en vez de esconderse tras un ok:true de mentira. No manda ningún WhatsApp.
//
//  Lo importante no son las conversaciones (esas hay que leerlas), sino las
//  BANDERAS: chequeos automáticos de los errores que de verdad hacen daño.
//
//    hora_inventada     ofreció una hora que ninguna herramienta devolvió
//    precio_inventado   dijo un precio que no está en el catálogo
//    cambio_imaginario  dijo "listo/agendado" sin que la herramienta diera ok
//    dia_equivocado     el día de la semana no corresponde a la fecha
//    tiempo_deducido    afirmó que la mañana/tarde "ya pasó"
//    profesional_suelto el cliente pidió a alguien y no filtró por esa persona
//
//  USO:
//    npm run test:bot                       → todos los locales con bot activo
//    npm run test:bot -- kronnos_limache    → uno solo
//    npm run test:bot -- kronnos_limache --v→ además imprime cada conversación
//
//  La key sale del entorno (ANTHROPIC_API_KEY) o de Secret Manager.
// ─────────────────────────────────────────────────────────────────────────────

const path = require('path');
const fs   = require('fs');
const { execSync } = require('child_process');

const RAIZ = path.join(__dirname, '..');
const FN   = path.join(RAIZ, 'functions');
const admin     = require(path.join(FN, 'node_modules/firebase-admin'));
const Anthropic = require(path.join(FN, 'node_modules/@anthropic-ai/sdk'));

const args    = process.argv.slice(2);
const VERBOSE = args.includes('--v') || args.includes('--verbose');
const soloTid = args.find(a => !a.startsWith('--')) || null;
// El bot falla de forma INTERMITENTE (inventa horas ~1 de cada N conversaciones):
// una sola pasada dice poco. --reps N repite la batería para medir la tasa.
const REPS    = Math.max(1, Number((args.find(a => a.startsWith('--reps=')) || '').split('=')[1]) || 1);
// Minuto del día en que arrancó la corrida: las horas entre ese instante y
// "ahora" son el reloj que el bot cita legítimamente, no horas inventadas.
let INICIO_MINS = null;
let KEY = null;   // se resuelve al arrancar; la usa el loop real del cerebro

// ── Credenciales ────────────────────────────────────────────────────────────
const SA = path.join(RAIZ, 'service-account.json');
admin.initializeApp({
  credential: fs.existsSync(SA)
    ? admin.credential.cert(JSON.parse(fs.readFileSync(SA, 'utf8')))
    : admin.credential.applicationDefault(),
  projectId: 'barberia-elegance',
});
const db = admin.firestore();

function anthropicKey() {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY.trim();
  try {
    return execSync('npx firebase-tools functions:secrets:access ANTHROPIC_API_KEY',
      { cwd: RAIZ, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch (_) {
    console.error('No pude leer ANTHROPIC_API_KEY (ni del entorno ni de Secret Manager).');
    process.exit(1);
  }
}

const cerebro = require(path.join(FN, 'evolution/cerebro'));
const { lineasCalendario, conDiaSemana, DIAS_SEMANA } = require(path.join(FN, 'lib/calendario'));
const { _ahoraChile: ahoraChile } = require(path.join(FN, 'chat-horas-disponibles'));

// ── La batería ──────────────────────────────────────────────────────────────
// Cada escenario son los mensajes del CLIENTE, en orden. `pide` marca a quién
// pidió (para la bandera profesional_suelto). Se cubren los flujos que de
// verdad llegan por WhatsApp, incluidos los que ya mordieron alguna vez.
const ESCENARIOS = [
  { nombre: 'Agendar simple',          turnos: ['Hola, tienes hora para hoy?', '{SERVICIO}', '{PRIMERA_HORA}', 'Sí, agéndalo'] },
  { nombre: 'Pregunta de precio',      turnos: ['Hola cuánto sale el corte?'] },
  { nombre: 'Profesional por nombre',  turnos: ['Hola, {PROFESIONAL} tiene hora hoy?', '{SERVICIO}'], pide: '{PROFESIONAL}' },
  { nombre: 'Profesional inexistente', turnos: ['Tiene hora con Cristóbal Pérez?'] },
  { nombre: 'Pide la mañana',          turnos: ['Hola tienen hora para ahora?', '{SERVICIO}', 'Y en la mañana?'] },
  { nombre: 'Pide la tarde',           turnos: ['Buenas, hora para hoy en la tarde', '{SERVICIO}'] },
  { nombre: 'Fecha en el pasado',      turnos: ['Quiero una hora para el 1 de enero de 2020'] },
  { nombre: 'Servicio inexistente',    turnos: ['Hacen manicure y depilación láser?'] },
  { nombre: 'Día ambiguo',             turnos: ['Tienen hora el viernes?', '{SERVICIO}'] },
  { nombre: 'Cliente molesto',         turnos: ['Llevo 3 días esperando respuesta, esto es pésimo, quiero hablar con alguien de verdad'] },
  { nombre: 'Mensajes seguidos',       turnos: ['Hola', 'Quiero corte', 'Para mañana', 'En la tarde si se puede'] },
  { nombre: 'Consulta sus citas',      turnos: ['Hola, tengo una hora agendada? a qué hora era?'] },
];

// ── Detector de banderas ────────────────────────────────────────────────────
// Voseo y modismos regionales. El prompt los prohíbe explícitamente cuando el
// local está en español neutro (que es el default), pero el modelo se escapa:
// el 03-08 le escribió "¿Querés agendar una cita?" a una clienta de Limache.
// Los chilenismos solo son falta si el local NO tiene estiloChileno activado.
const VOSEO = /\b(quer[ée]s|ten[ée]s|pod[ée]s|eleg[íi]s|quer[íi]s|pod[íi]s|sab[ée]s|ven[íi]s|dec[íi]s|hac[ée]s|vos)\b/i;
const MEXICANISMOS = /\b(te late|[óo]rale|ahorita|padr[íi]simo|chido|qu[ée] onda)\b/i;
const ARGENTINISMOS = /\b(che|dale che|acá nomás|laburo)\b/i;
const CHILENISMOS = /\b(bac[áa]n|al tiro|cachai|po|fome|la raja)\b/i;

// Solo afirmaciones sobre LA CITA. Un "Listo," suelto es conversación normal
// ("Listo, el equipo te escribirá") y marcarlo llenaba el reporte de ruido.
const AFIRMA_CAMBIO = /\b(qued[óo]\s+agendad|te\s+(la\s+)?agend[ée]|ya\s+(te\s+)?(la\s+)?(agend|cambi|mov|cancel)[ée]|tu\s+(cita|hora)\s+(qued|est[áa])\s+(agendad|confirmad|reservad|cancelad)|cita\s+confirmada)/i;
const YA_PASO       = /(la\s+)?(mañana|tarde|mediodía|mediodia)\s+(de\s+hoy\s+)?ya\s+(pas[óo]|termin)/i;

function horasDeTexto(t) {
  // Solo HH:MM con separador de hora; evita capturar precios ($12.990) o fechas.
  return [...String(t).matchAll(/\b([01]?\d|2[0-3]):([0-5]\d)\b/g)].map(m => {
    const [h, mi] = m[0].split(':');
    return `${h.padStart(2, '0')}:${mi}`;
  });
}
function preciosDeTexto(t) {
  return [...String(t).matchAll(/\$\s?([\d][\d.\s]{2,})/g)]
    .map(m => Number(m[1].replace(/[.\s]/g, '')))
    .filter(n => n >= 1000);
}

function analizar({ textos, horasOfrecidas, catalogo, escribiOk, pidioProfesional, filtroProfesional, textoCliente, horarioLocal, estiloChileno }) {
  const banderas = [];
  const todo = textos.join('\n');
  const ahora = ahoraChile();

  // No cuentan como "ofrecidas": las que dijo el cliente, la hora ACTUAL (el bot
  // la cita legítimamente: "son las 15:12") ni las del horario de atención del
  // local, que el bot puede nombrar sin consultar disponibilidad ("abrimos 10:30").
  const horasCliente = new Set(textoCliente.flatMap(horasDeTexto));
  const esElReloj = (h) => {
    const [hh, mm] = h.split(':').map(Number);
    const min = hh * 60 + mm;
    return min >= (INICIO_MINS ?? ahora.mins) - 1 && min <= ahora.mins + 1;
  };
  const inventadas = [...new Set(textos.flatMap(horasDeTexto))]
    .filter(h => !horasOfrecidas.has(h) && !horasCliente.has(h)
              && !esElReloj(h) && !horarioLocal.has(h));
  if (inventadas.length) {
    banderas.push({ tipo: 'hora_inventada', detalle: `ofreció ${inventadas.join(', ')} — ninguna herramienta las devolvió` });
  }

  const preciosOk = new Set(catalogo.map(s => s.precio));
  const preciosMal = [...new Set(textos.flatMap(preciosDeTexto))].filter(p => !preciosOk.has(p));
  if (preciosMal.length) {
    banderas.push({ tipo: 'precio_inventado', detalle: `$${preciosMal.join(', $')} no están en el catálogo` });
  }

  if (AFIRMA_CAMBIO.test(todo) && !escribiOk) {
    const frase = textos.find(t => AFIRMA_CAMBIO.test(t)) || '';
    banderas.push({ tipo: 'cambio_imaginario', detalle: `"${frase.replace(/\s+/g, ' ').slice(0, 110)}…" sin ok de la herramienta` });
  }

  // Solo es error si la parte del día que declara pasada NO ha pasado: a las
  // 15:12 "la mañana ya pasó" es cierto; a las 10:07 fue el bug del 03-08.
  const m = todo.match(YA_PASO);
  if (m) {
    const parte = m[2].toLowerCase();
    const finDeParte = parte === 'mañana' ? 12 * 60 : (parte === 'tarde' ? 20 * 60 : 14 * 60);
    if (ahora.mins < finDeParte) {
      banderas.push({ tipo: 'tiempo_deducido', detalle: `dijo que la ${parte} ya pasó siendo las ${ahora.hhmm}` });
    }
  }

  // Día de semana vs fecha, cuando el bot menciona ambos ("el martes 4 de agosto").
  const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const hoy = ahoraChile().fecha;
  const anio = Number(hoy.slice(0, 4));
  for (const m of todo.matchAll(new RegExp(`(${DIAS_SEMANA.join('|')})\\s+(\\d{1,2})\\s+de\\s+(${MESES.join('|')})`, 'gi'))) {
    const dicho = m[1].toLowerCase();
    const fecha = `${anio}-${String(MESES.indexOf(m[3].toLowerCase()) + 1).padStart(2, '0')}-${String(Number(m[2])).padStart(2, '0')}`;
    const real  = conDiaSemana(fecha).dia;
    if (real !== dicho) {
      banderas.push({ tipo: 'dia_equivocado', detalle: `dijo "${m[0]}" pero el ${fecha} cae ${real}` });
    }
  }

  if (pidioProfesional && !filtroProfesional && horasOfrecidas.size) {
    banderas.push({ tipo: 'profesional_suelto', detalle: `el cliente pidió a ${pidioProfesional} y ofreció horas sin filtrar por esa persona` });
  }

  const jergas = [['voseo', VOSEO], ['mexicanismo', MEXICANISMOS], ['argentinismo', ARGENTINISMOS]];
  if (!estiloChileno) jergas.push(['chilenismo', CHILENISMOS]);
  for (const [nombre, re] of jergas) {
    const hit = todo.match(re);
    if (hit) banderas.push({ tipo: 'jerga_prohibida', detalle: `${nombre}: "${hit[0]}" (el local está en español neutro)` });
  }

  return banderas;
}

// ── Una conversación ────────────────────────────────────────────────────────
async function correr(tid, ctxLocal, escenario) {
  const { systemFijo, toolsBase, servicios, equipo } = ctxLocal;
  const now = ahoraChile();
  const systemVariable = [
    ...lineasCalendario(now.fecha, now.hhmm),
    'El cliente escribe desde el número 56900000000 y en WhatsApp aparece como "Diego".',
  ].join('\n');

  const textos = [], textoCliente = [], llamadas = [];
  const horasOfrecidas = new Set();
  const historia = [];
  let escribiOk = false, filtroProfesional = false;

  // Sustituciones para que la batería sirva en cualquier local.
  const primerServicio = servicios[0]?.nombre || 'corte';
  const primerProf     = equipo[0]?.nombre || '';
  const sustituir = (t) => t
    .replace('{SERVICIO}', primerServicio)
    .replace('{PROFESIONAL}', primerProf)
    .replace('{PRIMERA_HORA}', [...horasOfrecidas][0] || 'la primera que tengas');

  for (const crudo of escenario.turnos) {
    const turno = sustituir(crudo);
    textoCliente.push(turno);

    // El MISMO loop que corre en producción: tools, reintentos y los dos
    // cinturones (voseo y horas inventadas). Probar una réplica propia sería
    // probar otro bot: los errores que el cinturón ataja no se verían acá.
    const ctx = {
      tid, telefono: '56900000000', chatId: `PRUEBA-${Date.now()}`,
      simulado: true, traza: [],
    };
    let respuesta;
    try {
      respuesta = await cerebro._pensarYResponder({
        anthropicKey: KEY, systemFijo, systemVariable,
        historia: [...historia], texto: turno, ctx, tools: toolsBase,
      });
    } catch (e) {
      return { escenario, error: `API: ${e.message}`, banderas: [], llamadas, textos, textoCliente };
    }

    for (const t of ctx.traza) {
      llamadas.push(`${t.name}(${JSON.stringify(t.input)})`);
      if (t.name === 'consultar_disponibilidad' && t.input?.profesional) filtroProfesional = true;
      // MISMO criterio que el cinturón de cerebro.js: cuenta como legítima
      // cualquier hora presente en la salida de la herramienta, no solo las del
      // array `horas` (una cita existente trae su hora en otro campo). Si el
      // detector fuera más estricto que el cinturón, marcaría como inventadas
      // horas que el bot sacó de datos reales.
      for (const h of horasDeTexto(JSON.stringify(t.out || {}))) horasOfrecidas.add(h);
      if (t.out?.ok === true && ['agendar_cita', 'reagendar_cita', 'cancelar_cita'].includes(t.name)) escribiOk = true;
      if (t.out?.error) llamadas.push(`  ⚠️ ${t.name}: ${t.out.error}`);
    }
    textos.push(respuesta);
    historia.push({ role: 'user', content: turno }, { role: 'assistant', content: respuesta });
  }

  const banderas = analizar({
    textos, horasOfrecidas, catalogo: servicios, escribiOk, textoCliente,
    horarioLocal: ctxLocal.horarioLocal, estiloChileno: ctxLocal.estiloChileno,
    pidioProfesional: escenario.pide ? sustituir(escenario.pide) : null,
    filtroProfesional,
  });
  return { escenario, banderas, llamadas, textos, textoCliente };
}

// ── Locales a probar ────────────────────────────────────────────────────────
async function tenantsConBot() {
  if (soloTid) return [soloTid];
  const out = [];
  for (const ref of await db.collection('tenants').listDocuments()) {
    // Mismo flag que usa el cerebro en producción (cerebro.js: botEnabled).
    const wa = await ref.collection('configuracion').doc('whatsapp').get().catch(() => null);
    if (wa && wa.exists && wa.data()?.botEnabled === true) out.push(ref.id);
  }
  return out;
}

(async () => {
  KEY = anthropicKey();
  const tids = await tenantsConBot();
  if (!tids.length) { console.log('Ningún local con botActivo=true. Pasa un tenant como argumento.'); process.exit(0); }

  const now = ahoraChile();
  INICIO_MINS = now.mins;
  console.log(`\n🤖 Probador del bot — ${now.fecha} ${now.hhmm} (Chile) · modelo ${cerebro._MODEL}`);
  console.log(`   Locales: ${tids.join(', ')}${REPS > 1 ? ` · ${REPS} repeticiones` : ''}\n`);

  const resumen = [];
  for (const tid of tids) {
    let ctxLocal;
    try {
      // El estilo REAL del local, igual que producción (cerebro.js lo saca de
      // configuracion/whatsapp.estiloChileno). Forzar `false` acá probaba un
      // prompt distinto al que de verdad se le manda al modelo.
      const waCfg = (await db.doc(`tenants/${tid}/configuracion/whatsapp`).get().catch(() => null))?.data() || {};
      const estiloChileno = waCfg.estiloChileno === true;
      const base = await cerebro._armarContextoLocal(tid, {
        estiloChileno,
        nombreAgente: waCfg.nombreAgente,   // mismo motivo: el prompt real, no uno parecido
      });
      // Horas del HORARIO DE ATENCIÓN: el bot puede nombrarlas sin consultar
      // disponibilidad ("abrimos a las 10:30"), así que no son horas inventadas.
      const conf = (await db.doc(`tenants/${tid}/configuracion/main`).get().catch(() => null))?.data() || {};
      const horarioLocal = new Set();
      for (const v of [conf.horarioInicio, conf.horarioFin]) if (v) horarioLocal.add(String(v));
      for (const d of Object.values(conf.diasConfig || {})) {
        if (d?.inicio) horarioLocal.add(String(d.inicio));
        if (d?.fin)    horarioLocal.add(String(d.fin));
      }
      if (conf.colacion?.inicio) horarioLocal.add(String(conf.colacion.inicio));
      if (conf.colacion?.fin)    horarioLocal.add(String(conf.colacion.fin));
      ctxLocal = {
        ...base,
        servicios: base.servicios || await cerebro._cargarServicios(tid),
        equipo:    base.equipo    || await cerebro._cargarEquipo(tid),
        horarioLocal, estiloChileno,
      };
    } catch (e) {
      console.log(`❌ ${tid}: no se pudo armar el contexto — ${e.message}\n`);
      continue;
    }
    if (!ctxLocal.servicios.length) { console.log(`⏭  ${tid}: sin catálogo cargado, se salta.\n`); continue; }

    console.log('─'.repeat(72));
    console.log(`${tid}  ·  ${ctxLocal.servicios.length} servicios · ${ctxLocal.equipo.length} en el equipo`);
    console.log('─'.repeat(72));

    for (const escBase of ESCENARIOS) {
    for (let rep = 1; rep <= REPS; rep++) {
      const esc = escBase;
      const r = await correr(tid, ctxLocal, esc);
      const marca = r.error ? '❌' : (r.banderas.length ? '🚩' : '✅');
      console.log(`${marca} ${esc.nombre}${REPS > 1 ? ` (${rep}/${REPS})` : ''}`);
      if (r.error) console.log(`     ${r.error}`);
      for (const b of r.banderas) console.log(`     [${b.tipo}] ${b.detalle}`);
      if (VERBOSE || r.banderas.length || r.error) {
        for (const l of r.llamadas.filter(x => x.startsWith('  ⚠️'))) console.log(`     ${l}`);
      }
      if (VERBOSE) {
        r.textoCliente.forEach((c, i) => {
          console.log(`     Cliente: ${c}`);
          if (r.textos[i]) console.log(`     Bot:     ${r.textos[i].replace(/\n/g, '\n              ')}`);
        });
      }
      resumen.push({ tid, esc: esc.nombre, banderas: r.banderas, error: r.error });
    }
    }
    console.log('');
  }

  // ── Resumen ──
  const conProblema = resumen.filter(r => r.error || r.banderas.length);
  console.log('═'.repeat(72));
  if (!conProblema.length) {
    console.log(`✅ ${resumen.length} conversaciones, ninguna bandera.`);
  } else {
    console.log(`🚩 ${conProblema.length} de ${resumen.length} conversaciones con problemas:\n`);
    const porTipo = {};
    for (const r of conProblema) {
      for (const b of r.banderas) (porTipo[b.tipo] = porTipo[b.tipo] || []).push(`${r.tid} · ${r.esc}`);
      if (r.error) (porTipo.error_tecnico = porTipo.error_tecnico || []).push(`${r.tid} · ${r.esc}`);
    }
    for (const [tipo, casos] of Object.entries(porTipo).sort((a, b) => b[1].length - a[1].length)) {
      console.log(`  ${tipo} (${casos.length})`);
      casos.forEach(c => console.log(`     · ${c}`));
    }
  }
  console.log('═'.repeat(72) + '\n');
  process.exit(conProblema.length ? 1 : 0);
})().catch(e => { console.error('FALLÓ:', e); process.exit(1); });
