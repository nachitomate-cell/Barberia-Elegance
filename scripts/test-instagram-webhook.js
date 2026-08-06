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
ok('responde 200 antes de trabajar',
  SRC_WEBHOOK.indexOf("res.status(200).send('EVENT_RECEIVED')") < SRC_WEBHOOK.indexOf('for (const entrada'),
  'Meta reintenta y termina desactivando el webhook si tarda');
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

console.log(fallos === 0
  ? '\n✅ Webhook de Instagram: firma verificada, sin bucles y con apagado.\n'
  : `\n❌ ${fallos} problema(s) en la integración de Instagram.\n`);
process.exit(fallos ? 1 : 0);
