'use strict';

// scripts/test-instagram-webhook.js
// ─────────────────────────────────────────────────────────────────────────────
//  Guard del webhook de Instagram.
//
//  Este endpoint es público y le da de comer al cerebro de ventas, que gasta
//  dinero en tokens y le escribe a gente real. Sin verificar la firma,
//  cualquiera que conozca la URL puede inyectar mensajes falsos y hacer que el
//  bot converse solo, a costa de SynapTech. Por eso la firma se testea acá y
//  no "se revisa a ojo" en el código.
//
//  Uso: npm run test:ig
// ─────────────────────────────────────────────────────────────────────────────

const crypto = require('crypto');
const fs     = require('fs');
const path   = require('path');

let fallos = 0;
const ok = (n, cond, extra) => {
  console.log(`${cond ? '  ✓' : '  ✗'} ${n}${cond ? '' : `  → ${extra}`}`);
  if (!cond) fallos++;
};

const SRC_WEBHOOK = fs.readFileSync(path.join(__dirname, '..', 'functions', 'instagram-plataforma.js'), 'utf8');
const SRC_API     = fs.readFileSync(path.join(__dirname, '..', 'functions', 'lib', 'instagram-api.js'), 'utf8');

/* ── La verificación de firma, replicada tal como la hace el webhook ─────── */
const SECRET = 'secreto-de-prueba';
function firmar(cuerpo, secreto = SECRET) {
  return 'sha256=' + crypto.createHmac('sha256', secreto).update(cuerpo).digest('hex');
}
function firmaValida(cabecera, cuerpo, appSecret) {
  const firma = String(cabecera || '');
  if (!firma.startsWith('sha256=')) return false;
  const esperado = crypto.createHmac('sha256', appSecret).update(cuerpo).digest('hex');
  const a = Buffer.from(firma.slice(7), 'utf-8');
  const b = Buffer.from(esperado, 'utf-8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

console.log('\n🔐 Firma del webhook');
const cuerpo = Buffer.from(JSON.stringify({ object: 'instagram', entry: [{ id: '1', messaging: [] }] }));
ok('acepta una firma correcta', firmaValida(firmar(cuerpo), cuerpo, SECRET), 'rechazó la buena');
ok('rechaza una firma de otro secreto', !firmaValida(firmar(cuerpo, 'otro'), cuerpo, SECRET), 'aceptó una falsa');
ok('rechaza si el cuerpo cambió', !firmaValida(firmar(cuerpo), Buffer.from('{"hackeado":true}'), SECRET), 'aceptó un cuerpo alterado');
ok('rechaza si no viene firma', !firmaValida('', cuerpo, SECRET), 'aceptó sin firma');
ok('rechaza un prefijo distinto (sha1)', !firmaValida('sha1=' + 'a'.repeat(40), cuerpo, SECRET), 'aceptó sha1');
ok('no revienta con firma de largo raro', !firmaValida('sha256=abc', cuerpo, SECRET), 'lanzó excepción o aceptó');

/* ── Que el código real conserve las protecciones ────────────────────────── */
console.log('\n🛡️  Protecciones en el código');
ok('el webhook verifica la firma antes de procesar',
  /firmaValida\(req, INSTAGRAM_APP_SECRET\.value\(\)\)/.test(SRC_WEBHOOK),
  'se puede inyectar cualquier evento');
ok('usa comparación en tiempo constante',
  /timingSafeEqual/.test(SRC_WEBHOOK),
  'una comparación normal filtra la firma byte a byte');
ok('el handshake GET valida el verify_token',
  /hub\.verify_token/.test(SRC_WEBHOOK) && /IG_WEBHOOK_TOKEN\.value\(\)/.test(SRC_WEBHOOK),
  'cualquiera podría suscribir su propio webhook');
// Esta regla nació al revés y costó un mensaje perdido: la versión original
// hacía el ack ANTES de trabajar "para no hacer esperar a Meta". Cloud
// Functions congela la CPU al responder, así que el trabajo posterior puede no
// correr nunca — medido el 06-08-2026, el primer DM real solo se contestó
// cuando Meta reintentó 3 minutos después.
ok('trabaja ANTES de responder 200',
  SRC_WEBHOOK.indexOf('for (const entrada') < SRC_WEBHOOK.lastIndexOf("res.status(200).send('EVENT_RECEIVED')"),
  'el ack temprano congela la instancia y se pierden mensajes');
ok('devuelve 500 si algo falla, para que Meta reintente',
  /res\.status\(500\)/.test(SRC_WEBHOOK),
  'un error tragado con 200 pierde el lead para siempre');
ok('el webhook tiene memoria para arrancar rápido',
  /memory: '512MiB'/.test(SRC_WEBHOOK),
  'con 256 MiB el arranque en frío se arrastra con un lead esperando al otro lado');
ok('ignora los ecos de los mensajes propios',
  /is_echo/.test(SRC_WEBHOOK) && /remitente === con\.igUserId/.test(SRC_WEBHOOK),
  'el bot se respondería a sí mismo en bucle');
ok('respeta el interruptor de apagado',
  /cfg\.activo === false/.test(SRC_WEBHOOK),
  'sin kill switch no hay forma de callarlo rápido');
ok('el bot de DM se puede apagar por separado',
  /cfg\.botDM === false/.test(SRC_WEBHOOK), 'falta el interruptor de DM');

console.log('\n🤝 Reuso del cerebro de ventas');
ok('no duplica el bot: llama a procesarMensajeVentas',
  /procesarMensajeVentas/.test(SRC_WEBHOOK),
  'un segundo cerebro se desincroniza del primero');
ok('las conversaciones de IG no se mezclan con las de WhatsApp',
  /wa_ventas_conversaciones\/ig_/.test(SRC_WEBHOOK),
  'mismo id para dos personas distintas');
ok('el aviso de lead sigue yendo al WhatsApp de Ignacio',
  /WHATSAPP_IGNACIO/.test(SRC_WEBHOOK) && /instance_plat_ventas/.test(SRC_WEBHOOK),
  'el aviso se perdería como DM a un IGSID inexistente');

console.log('\n📤 Publicación');
ok('publica en dos pasos (contenedor y publicación)',
  /media_publish/.test(SRC_API) && /creation_id/.test(SRC_API),
  'la API de Instagram no acepta publicar directo');
ok('espera a que el video termine de procesarse',
  /FINISHED/.test(SRC_API) && /status_code/.test(SRC_API),
  'publicar un contenedor sin procesar falla');
ok('exige URLs https públicas',
  /Las URLs deben ser https/.test(SRC_WEBHOOK),
  'Instagram descarga la media desde sus servidores: un archivo local da 403');
ok('la publicación es solo para operadores',
  /instagramPublicar[\s\S]{0,400}?esOperadorReq/.test(SRC_WEBHOOK),
  'publicar en la cuenta oficial no puede quedar abierto');

console.log('\n⏱️  Reglas de la API');
ok('conoce la ventana de 24 h', /VENTANA_MS/.test(SRC_API), 'se enviarían DMs que Meta rechaza');
ok('distingue el token vencido', /esAuth/.test(SRC_API), 'reintentaría para siempre un token muerto');

/* ── Asistente de reservas de los locales ──────────────────────────────────
   El webhook es UNO para todas las cuentas conectadas. Lo único que separa un
   DM de venta de una consulta de hora es a quién se lo mandaron, así que ese
   ruteo es la pieza que no puede romperse en silencio: si falla, un cliente
   preguntando por un corte recibe el pitch comercial de SynapTech. */
const SRC_RES  = fs.readFileSync(path.join(__dirname, '..', 'functions', 'instagram-reservas.js'), 'utf8');
const SRC_SYNC = fs.readFileSync(path.join(__dirname, '..', 'functions', 'instagram-sync.js'), 'utf8');

console.log('\n🤖 Asistente de reservas (cuenta del local)');
ok('el destinatario decide qué cerebro contesta',
  /recipient\?\.id/.test(SRC_WEBHOOK) && /tenantDeCuenta\(destino\)/.test(SRC_WEBHOOK),
  'todo caería en el bot de ventas, incluido quien pregunta por una hora');
ok('la cuenta de la plataforma nunca se confunde con un local',
  /if \(tid === CUENTA\) return null/.test(SRC_WEBHOOK),
  'los DM de SynapTech se contestarían con el cerebro de reservas de un tenant');
ok('un local sin cuenta habilitada no rutea',
  /!c\.accessToken \|\| c\.enabled === false/.test(SRC_WEBHOOK),
  'una cuenta desconectada seguiría intentando contestar con un token muerto');
ok('los comentarios siguen siendo solo de la plataforma',
  /const esPlataforma = /.test(SRC_WEBHOOK) && /if \(!esPlataforma\)/.test(SRC_WEBHOOK),
  'un comentario en el post de un local se contestaría con el token y el pitch de SynapTech');
ok('reusa el cerebro de agendamiento, no lo duplica',
  /_armarContextoLocal/.test(SRC_RES) && /_ejecutarTool/.test(SRC_RES),
  'un segundo cerebro se desincroniza de las reglas de negocio de WhatsApp');
ok('deduplica por id de mensaje',
  /lastMid/.test(SRC_RES) && /runTransaction/.test(SRC_RES),
  'Meta reintenta el webhook: sin esto se contesta —o se agenda— dos veces');
ok('exige el entitlement de SynapTech',
  /igAsistente !== true/.test(SRC_RES),
  'cualquier local con Instagram conectado tendría bot sin haberlo contratado');
ok('el local puede apagarlo por su cuenta',
  /botEnabled === false/.test(SRC_RES),
  'sin interruptor propio, apagarlo un feriado exige llamar a SynapTech');
ok('tiene tope de respuestas por chat y día',
  /MAX_RESP_DIA/.test(SRC_RES),
  'un troll podría hacerlo conversar solo a costa del local');
ok('max_tokens con margen para las tools',
  /MAX_TOKENS\s*=\s*(2000|[2-9]\d{3,})/.test(SRC_RES),
  'al ras el modelo enmudece sin error justo cuando iba a agendar');
ok('registra el gasto de IA del canal',
  /logAiUsage/.test(SRC_RES),
  'el gasto de Instagram no aparecería en ninguna métrica de ops');
ok('respeta el tenant legacy `elegance`',
  /tid === 'elegance'/.test(SRC_RES),
  'leería tenants/elegance/… que no existe: el bot callaría sin motivo aparente');
ok('le dice al modelo que no tiene el teléfono Y que lo pida',
  /NO tienes su número de teléfono/.test(SRC_RES) && /Pídeselo/.test(SRC_RES) && /cliente_telefono/.test(SRC_RES),
  'sin la primera parte dice "confírmame tu número" como si lo supiera; sin la segunda agenda sin pedirlo');
ok('marca el canal en el contexto de las herramientas',
  /canal: 'instagram'/.test(SRC_RES),
  'la cita quedaría como wa_bot y las tools creerían que hay un número en el chat');

const SRC_CER = fs.readFileSync(path.join(__dirname, '..', 'functions', 'evolution', 'cerebro.js'), 'utf8');
console.log('\n📞 El teléfono, que es lo único que Instagram no trae');
ok('sin teléfono no se agenda',
  /no es un celular chileno v[aá]lido/.test(SRC_CER) && /cliente_telefono/.test(SRC_CER),
  'quedarían citas que el local no puede contactar ni el cliente consultar');
ok('las herramientas que buscan "sus citas" exigen número',
  (SRC_CER.match(/if \(!hayTelefono\) return SIN_TELEFONO/g) || []).length >= 3,
  "buscar con '' devuelve las citas de cualquiera que reservó sin teléfono: es una fuga");
ok('por WhatsApp manda el número del chat, no el del modelo',
  /hayTelefono\s*\n?\s*\? String\(telefono\)/.test(SRC_CER),
  'la cita saldría a nombre de un teléfono que nadie usó');
ok('el número se guarda normalizado, no como lo tipeó el cliente',
  /normalizarTelCl/.test(SRC_CER) && /_normalizeCl/.test(SRC_CER),
  'la misma persona quedaría como dos según por dónde reservó');
ok('la cita y su candado quedan marcados con el canal',
  !/origen:\s*'wa_bot'/.test(SRC_CER) && /origenDe/.test(SRC_CER),
  'todo lo del bot diría wa_bot y no habría cómo saber qué canal trae reservas');
ok('las métricas del bot cuentan los dos canales',
  /CANALES_BOT/.test(fs.readFileSync(path.join(__dirname, '..', 'functions', 'lib', 'bot-negocio.js'), 'utf8')),
  'lo que agenda por Instagram no aparecería en la tarjeta de valor del local');

console.log('\n🔌 Suscripción de la cuenta (el paso invisible)');
ok('la suscripción vive en la librería compartida',
  /async function asegurarSuscripcion/.test(SRC_API) && /subscribed_apps/.test(SRC_API),
  'los locales no tendrían cómo suscribirse y no les llegaría ni un DM');
ok('no pisa los campos que ya estaban suscritos',
  /new Set\(\[\.\.\.yaTiene, \.\.\.campos\]\)/.test(SRC_API),
  'suscribir mensajes le quitaría los comentarios a la cuenta de la plataforma');
ok('el OAuth suscribe al local apenas autoriza',
  /instagram_business_manage_messages/.test(SRC_SYNC) && /asegurarSuscripcion/.test(SRC_SYNC),
  'quedaría todo autorizado, el bot encendido y cero DMs entrando');
ok('guarda qué permisos otorgó de verdad',
  /normalizarPermisos/.test(SRC_SYNC),
  'sin esto "no contesta" no tiene causa: el dueño pudo destildar mensajes');
ok('la cuenta de la plataforma no se re-suscribe desde el sync',
  /tenantId !== CUENTA_PLATAFORMA/.test(SRC_SYNC),
  'le quitaría los comentarios a @synaptechspa');
ok('encender un local es una sola acción del operador',
  /instagramAsistenteActivar/.test(SRC_WEBHOOK) && /igAsistente: true/.test(SRC_WEBHOOK),
  'el entitlement sin suscripción deja un bot que dice estar activo y no recibe nada');


/* ── Creativos programados ───────────────────────────────────────────────── */
const SRC_PROG = fs.readFileSync(path.join(__dirname, '..', 'functions', 'instagram-programador.js'), 'utf8');
console.log('\n🗓️  Publicaciones programadas');
ok('reclama el item en una transacción antes de publicar',
  /runTransaction/.test(SRC_PROG) && /estado: 'publicando'/.test(SRC_PROG),
  'dos corridas del cron solapadas publicarían el MISMO post dos veces, y eso no se deshace');
ok('solo reclama lo que está pendiente',
  /v\.estado !== 'pendiente'\) return false/.test(SRC_PROG),
  'reclamaría algo ya publicado');
ok('tiene tope de reintentos',
  /MAX_INTENTOS/.test(SRC_PROG) && /rendirse/.test(SRC_PROG),
  'una URL rota reintentaría para siempre');
ok('al agotar intentos avisa por WhatsApp',
  /no se pudo publicar/.test(SRC_PROG),
  'una publicación caída en silencio no la echa de menos nadie');
ok('cancelar respeta lo ya reclamado',
  /Ya está en estado/.test(SRC_PROG),
  'cancelaría algo que ya va camino a publicarse');
ok('exige que la hora sea futura',
  /al menos 1 minuto en el futuro/.test(SRC_PROG),
  'un error de zona horaria dispararía el post al instante');
ok('valida las URLs antes de encolar',
  /validarUrls/.test(SRC_PROG),
  'el error saldría recién en el cron, horas después');
ok('el cron da tiempo a que procese el video',
  /timeoutSeconds: 540/.test(SRC_PROG),
  'un reel largo cortaría a mitad de subida');

console.log(fallos === 0
  ? '\n✅ Webhook de Instagram: firma verificada, sin bucles y con apagado.\n'
  : `\n❌ ${fallos} problema(s) en la integración de Instagram.\n`);
process.exit(fallos ? 1 : 0);
