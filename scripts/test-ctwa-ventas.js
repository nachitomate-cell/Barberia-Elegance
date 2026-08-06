'use strict';

// scripts/test-ctwa-ventas.js
// ─────────────────────────────────────────────────────────────────────────────
//  Guard de la fuga Click-to-WhatsApp del bot de ventas (auditoría 05-08-2026).
//
//  La campaña B2B gastó $124.548, trajo 59 conversaciones y NO respondió a 14
//  de 23 chats. Dos bugs, los dos cubiertos acá:
//   · el tap del quick-reply del anuncio llega como respuesta de botón/Flow,
//     no como texto → se descartaba antes de procesarse;
//   · aunque llegara, la puerta del bot exige un gatillo que el texto que
//     precarga Meta ("Quiero obtener más información.") no matchea.
//
//  Si alguien vuelve a tocar el lector de mensajes de ventas.js, esto revienta
//  antes de que se queme presupuesto otra vez.
//
//  Uso: npm run test:ctwa
// ─────────────────────────────────────────────────────────────────────────────

const { referidoDeAnuncio, textoInteractivo, esRespuestaDeFormulario } = require('../functions/lib/ctwa');

let fallos = 0;
function ok(nombre, cond, extra) {
  console.log(`${cond ? '  ✓' : '  ✗'} ${nombre}${cond ? '' : `  → ${extra}`}`);
  if (!cond) fallos++;
}

/* ── Payloads tal como los entrega Baileys/Evolution ─────────────────────── */

// 1. Primer mensaje de un lead que tocó "Enviar mensaje" en el anuncio.
const ctwaTexto = {
  message: {
    extendedTextMessage: {
      text: 'Quiero obtener más información.',
      contextInfo: {
        externalAdReply: {
          title: 'El cartoncito murio',
          body: 'Agenda, fidelización, caja y WhatsApp.',
          mediaType: 'IMAGE',
          sourceType: 'ad',
          sourceId: '120212345678901234',
          sourceUrl: 'https://api.whatsapp.com/send',
        },
        entryPointConversionSource: 'ctwa_ad',
        entryPointConversionApp: 'whatsapp',
        ctwaClid: 'AfXyZ_ejemplo_clid_123',
      },
    },
  },
};

// 2. Tap en el quick-reply del mensaje de bienvenida (llega como botón).
const quickReply = {
  message: {
    buttonsResponseMessage: {
      selectedButtonId: '1',
      selectedDisplayText: 'Quiero obtener más información.',
      contextInfo: { entryPointConversionSource: 'ctwa_ad', ctwaClid: 'AfQuickReply999' },
    },
  },
};

// 3. Formulario de WhatsApp Flow completado (los 8 leads que Meta contó y que
//    nunca llegaron a Firestore).
const flowResp = {
  message: {
    interactiveResponseMessage: {
      body: { text: 'Formulario enviado' },
      nativeFlowResponseMessage: {
        name: 'flow',
        version: 3,
        paramsJson: JSON.stringify({
          flow_token: 'tok_abc123',
          screen_0_nombre: 'Alexander Pérez',
          screen_0_negocio: "King's Son Barber",
          screen_0_comuna: 'Viña del Mar',
          screen_0_acepta: true,
        }),
      },
    },
  },
};

// 4. Mensaje normal de un amigo — NO debe abrir la puerta del bot.
const organico = { message: { conversation: 'Compadre, me prestas la moto el sábado?' } };

// 5. Mensaje citando otro mensaje: trae contextInfo pero NO es anuncio.
const citado = {
  message: {
    extendedTextMessage: {
      text: 'jaja sí po',
      contextInfo: { stanzaId: 'ABC', participant: '56911111111@s.whatsapp.net', quotedMessage: { conversation: 'hola' } },
    },
  },
};

/* ── Detección del referido de anuncio ──────────────────────────────────── */
console.log('\n📣 Referido de anuncio (Click-to-WhatsApp)');
const r1 = referidoDeAnuncio({}, ctwaTexto.message);
ok('detecta el CTWA del primer mensaje', !!r1, 'devolvió null');
ok('captura el id del anuncio', r1?.sourceId === '120212345678901234', r1?.sourceId);
ok('captura el ctwaClid', r1?.ctwaClid === 'AfXyZ_ejemplo_clid_123', r1?.ctwaClid);
ok('captura el titular del anuncio', r1?.titulo === 'El cartoncito murio', r1?.titulo);

const r2 = referidoDeAnuncio({}, quickReply.message);
ok('detecta el CTWA en un tap de quick-reply', !!r2, 'devolvió null');
ok('quick-reply sin externalAdReply igual trae clid', r2?.ctwaClid === 'AfQuickReply999', r2?.ctwaClid);

ok('mensaje orgánico NO se marca como anuncio', referidoDeAnuncio({}, organico.message) === null, 'lo marcó');
ok('mensaje citado NO se marca como anuncio', referidoDeAnuncio({}, citado.message) === null, 'lo marcó');
ok('mensaje vacío no revienta', referidoDeAnuncio({}, {}) === null, 'lanzó o devolvió algo');
ok('lee el contextInfo si viene en data', !!referidoDeAnuncio({ contextInfo: { externalAdReply: { sourceId: '9' } } }, {}), 'no lo vio');

/* ── Texto de mensajes interactivos ─────────────────────────────────────── */
console.log('\n💬 Texto de respuestas interactivas');
ok('lee el texto del quick-reply',
  textoInteractivo(quickReply.message) === 'Quiero obtener más información.',
  JSON.stringify(textoInteractivo(quickReply.message)));

const tFlow = textoInteractivo(flowResp.message);
ok('lee el formulario del Flow', tFlow.includes('Alexander Pérez'), JSON.stringify(tFlow));
ok('el Flow incluye el negocio', tFlow.includes("King's Son Barber"), JSON.stringify(tFlow));
ok('el Flow limpia el prefijo screen_N_', tFlow.includes('nombre: Alexander'), JSON.stringify(tFlow));
ok('el Flow oculta el flow_token', !tFlow.includes('tok_abc123'), 'filtró el token');

ok('lista devuelve su título',
  textoInteractivo({ listResponseMessage: { title: 'Agendar demo' } }) === 'Agendar demo', 'no leyó la lista');
ok('botón de plantilla devuelve su texto',
  textoInteractivo({ templateButtonReplyMessage: { selectedDisplayText: 'Sí, me interesa' } }) === 'Sí, me interesa', 'no leyó el botón');
ok('mensaje normal devuelve vacío', textoInteractivo(organico.message) === '', 'devolvió texto');
ok('Flow con JSON roto cae al body sin reventar',
  textoInteractivo({ interactiveResponseMessage: { body: { text: 'ok' }, nativeFlowResponseMessage: { paramsJson: '{roto' } } }) === 'ok',
  'no cayó al body');

/* ── La puerta de activación, tal como la evalúa ventas.js ──────────────── */
console.log('\n🚪 Puerta de activación del bot');
const ACTIVADORES = [
  'mas informacion sobre esto', 'me gustaria conseguir mas informacion',
  'puedo obtener mas informacion', 'informacion de la agenda',
];
function abrePuerta(data, msg) {
  const texto = String(
    msg.conversation ?? msg.extendedTextMessage?.text ??
    msg.imageMessage?.caption ?? msg.videoMessage?.caption ?? '',
  ).trim() || textoInteractivo(msg);
  if (!texto) return false;                       // se descarta antes de la puerta
  const norm = texto.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  return !!referidoDeAnuncio(data, msg)
    || esRespuestaDeFormulario(msg)
    || /expo\s*vino|agenda\s+online/.test(norm)
    || ACTIVADORES.some(k => norm.includes(k));
}

ok('LEAD DE ANUNCIO (texto) → el bot responde', abrePuerta({}, ctwaTexto.message), 'quedó sin respuesta');
ok('LEAD DE ANUNCIO (quick-reply) → el bot responde', abrePuerta({}, quickReply.message), 'quedó sin respuesta');
ok('LEAD DE ANUNCIO (formulario Flow) → el bot responde', abrePuerta({}, flowResp.message), 'quedó sin respuesta');
ok('lead de ExpoVino sigue entrando', abrePuerta({}, { conversation: 'Hola, los vi en ExpoVino' }), 'se cerró');
ok('activador configurado sigue entrando', abrePuerta({}, { conversation: '¡Hola! Me gustaría conseguir más información sobre esto.' }), 'se cerró');
ok('AMIGO no activa el bot', !abrePuerta({}, organico.message), 'el bot le contestó a un amigo');
ok('mensaje citado no activa el bot', !abrePuerta({}, citado.message), 'el bot se metió en un chat personal');

// Regresión exacta del bug: este es el texto que Meta precarga y que los
// activadores NO cubren ("quiero", no "puedo"/"me gustaría").
const soloTexto = { extendedTextMessage: { text: 'Quiero obtener más información.' } };
ok('sin referido, ese texto NO matchea ningún activador (bug original)',
  !abrePuerta({}, soloTexto), 'ya matcheaba — revisa si alguien cambió los activadores');
ok('con referido de anuncio, el MISMO texto sí entra (el arreglo)',
  abrePuerta({}, ctwaTexto.message), 'el arreglo no está funcionando');

/* ── Ráfaga: una respuesta por tanda, no una por mensaje ─────────────────────
   06-08-2026: un lead escribió "Hola Ignacio tengo una barbería" y enseguida
   "¿Cuáles son los valores?". Recibió DOS respuestas que preguntaban lo mismo.
   Más adelante dijo "En Ñuñoa" y el bot le contestó "¿en qué comuna está?", y
   preguntó el rubro tres veces seguidas. Cada mensaje disparaba su propia
   invocación y ninguna veía a la otra.

   El cerebro de los locales ya lo resolvía; ventas.js nació sin ello. Se fija
   en los DOS para que no vuelva a quedar cojo uno solo. */
console.log('\n📨 Una respuesta por tanda (los dos bots)');
const fs = require('fs');
const path = require('path');
for (const rel of ['functions/evolution/ventas.js', 'functions/evolution/cerebro.js']) {
  const src = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
  const nombre = path.basename(rel);
  ok(`${nombre} reclama turno de ráfaga`, /rafagaTurno/.test(src),
    'sin turno, dos mensajes seguidos generan dos respuestas');
  ok(`${nombre} acumula en cola`, /rafagaCola/.test(src) && /arrayUnion/.test(src),
    'sin cola, la respuesta solo ve el último mensaje y se pierde el resto');
  ok(`${nombre} espera antes de contestar`, /ESPERA_RAFAGA_MS/.test(src) && /setTimeout/.test(src),
    'sin espera no hay ventana donde juntar la tanda');
  ok(`${nombre} se retira si otro tomó el turno`,
    /rafagaTurno\s*!==\s*miTurno/.test(src),
    'sin esta salida contestan todas las invocaciones de la ráfaga');
  ok(`${nombre} descarta cola vencida`, /VIGENCIA_RAFAGA_MS/.test(src),
    'una corrida que murió a medias dejaría mensajes viejos pegados a la próxima');
}
// El texto unido tiene que ser el que ve el modelo: juntar la cola y después
// mandarle solo el último mensaje sería peor que no juntar nada.
const ventasSrc = fs.readFileSync(path.join(__dirname, '..', 'functions/evolution/ventas.js'), 'utf8');
ok('ventas.js le manda al modelo el texto UNIDO',
  /content:\s*textoRafaga/.test(ventasSrc),
  'arma la cola pero le pasa otro texto al modelo');
ok('ventas.js guarda en el historial el texto UNIDO',
  (ventasSrc.match(/textoRafaga/g) || []).length >= 3,
  'el historial guardaría solo uno de los mensajes de la tanda');

console.log(fallos === 0
  ? '\n✅ CTWA: el tráfico de anuncios entra al bot, los chats personales siguen protegidos y cada tanda recibe UNA respuesta.\n'
  : `\n❌ ${fallos} fallo(s) — hay tráfico de anuncios que quedaría sin respuesta.\n`);
process.exit(fallos ? 1 : 0);
