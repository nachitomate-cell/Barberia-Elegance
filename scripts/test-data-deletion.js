'use strict';

// scripts/test-data-deletion.js
// ─────────────────────────────────────────────────────────────────────────────
//  Guard del endpoint de borrado de datos que exige Meta.
//
//  Este endpoint BORRA datos de personas y es público. Si la verificación de
//  firma falla, cualquiera que conozca la URL puede pedir el borrado de los
//  datos de otro — y un borrado no se deshace. Por eso la firma se testea
//  con vectores reales en vez de revisarse a ojo.
//
//  Uso: npm run test:borrado
// ─────────────────────────────────────────────────────────────────────────────

const crypto = require('crypto');
const path   = require('path');
const fs     = require('fs');

const { _abrirSignedRequest } = require(path.join(__dirname, '..', 'functions', 'meta-data-deletion.js'));

let fallos = 0;
const ok = (n, cond, extra) => {
  console.log(`${cond ? '  ✓' : '  ✗'} ${n}${cond ? '' : `  → ${extra}`}`);
  if (!cond) fallos++;
};

const SECRET = 'secreto-de-prueba';
const b64url = (buf) => Buffer.from(buf).toString('base64')
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function firmar(payload, secreto = SECRET) {
  const cuerpo = b64url(JSON.stringify(payload));
  const firma  = b64url(crypto.createHmac('sha256', secreto).update(cuerpo).digest());
  return `${firma}.${cuerpo}`;
}

console.log('\n🔏 signed_request de Meta');

const valido = firmar({ algorithm: 'HMAC-SHA256', user_id: '1017743251084043', issued_at: 1 });
let datos = null;
try { datos = _abrirSignedRequest(valido, SECRET); } catch (e) { /* abajo */ }
ok('acepta un signed_request legítimo', !!datos, 'rechazó uno válido');
ok('extrae el user_id', datos?.user_id === '1017743251084043', datos?.user_id);

const cae = (signed, secreto = SECRET) => {
  try { _abrirSignedRequest(signed, secreto); return false; } catch { return true; }
};

ok('rechaza una firma de otro secreto', cae(firmar({ user_id: 'x' }, 'otro')), 'aceptó una falsa');
ok('rechaza si el payload fue alterado', cae((() => {
  const otro = b64url(JSON.stringify({ algorithm: 'HMAC-SHA256', user_id: 'VICTIMA' }));
  return `${valido.split('.')[0]}.${otro}`;
})()), 'ACEPTÓ un borrado dirigido a otra persona');
ok('rechaza sin punto separador', cae('soloalgo'), 'aceptó basura');
ok('rechaza vacío', cae(''), 'aceptó vacío');
ok('rechaza null', cae(null), 'aceptó null');
ok('rechaza un algoritmo distinto',
  cae(firmar({ algorithm: 'PLAINTEXT', user_id: 'x' })),
  'aceptó un algoritmo que no es HMAC-SHA256');
ok('no revienta con firma de largo raro', cae('abc.def'), 'lanzó algo distinto de error controlado');

/* ── Que el módulo conserve lo importante ────────────────────────────────── */
const SRC = fs.readFileSync(path.join(__dirname, '..', 'functions', 'meta-data-deletion.js'), 'utf8');
console.log('\n🛡️  Protecciones del módulo');
ok('compara la firma en tiempo constante', /timingSafeEqual/.test(SRC),
  'una comparación normal filtra la firma byte a byte');
ok('borra el hilo de Instagram', /ig_conversaciones/.test(SRC), 'quedarían sus mensajes');
ok('borra la conversación con el bot', /wa_ventas_conversaciones\/ig_/.test(SRC), 'quedaría el historial del bot');
ok('borra sus comentarios', /ig_comentarios/.test(SRC), 'quedaría su @ y lo que comentó');
ok('deja asiento de auditoría', /eliminaciones_log/.test(SRC),
  'la Ley 21.719 exige poder demostrar el borrado');
ok('el asiento guarda el id HASHEADO, no el id',
  /usuarioHash/.test(SRC) && /createHash\('sha256'\)\.update\(userId\)/.test(SRC),
  'guardar el id crudo es volver a almacenar lo que se acaba de borrar');
ok('devuelve confirmation_code y url', /confirmation_code/.test(SRC) && /url:/.test(SRC),
  'Meta rechaza la respuesta sin esos dos campos');
ok('tiene página de estado por GET', /req\.method === 'GET'/.test(SRC),
  'la url que se devuelve tiene que abrir en algo');

console.log(fallos === 0
  ? '\n✅ Borrado de datos: firma verificada, borra de verdad y deja rastro.\n'
  : `\n❌ ${fallos} problema(s) — un endpoint de borrado con firma débil es un arma.\n`);
process.exit(fallos ? 1 : 0);
