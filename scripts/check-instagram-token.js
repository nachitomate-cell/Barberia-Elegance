'use strict';

// scripts/check-instagram-token.js
// ─────────────────────────────────────────────────────────────────────────────
//  Guard del refresco de tokens de Instagram.
//
//  Los tokens de Instagram duran 60 días y NO se renuevan solos. Cuando uno
//  vence, la cuenta deja de entregar webhooks y el lookbook deja de
//  sincronizar — sin ningún otro síntoma y sin forma de recuperarlo salvo
//  rehacer el OAuth a mano.
//
//  Dos fallos encontrados el 06-08-2026, los dos silenciosos:
//
//   1. La cuenta de PLATAFORMA (@synaptechspa) no tenía ningún cron que la
//      renovara. instagram-sync.js renueva la de los tenants; la de
//      plataforma vive en otro doc y no la tocaba nadie. Le quedaban 59 días.
//      Y el panel decía "se renueva solo mientras la cuenta siga activa": la
//      única señal que existía tranquilizaba.
//
//   2. instagram-sync.js pedía `grant_type=ig_refreshtoken` (sin guion bajo).
//      La API responde 400 "grant type not supported". Comprobado contra la
//      API real: con guion bajo, 200 y 59 días; sin él, 400. El catch de esa
//      función solo deja un warn, así que llevaba meses fallando sin ruido.
//
//  Uso: npm run check:ig-token
// ─────────────────────────────────────────────────────────────────────────────

const fs   = require('fs');
const path = require('path');

const FN = path.join(__dirname, '..', 'functions');
let fallos = 0;
const ok = (n, cond, extra) => {
  console.log(`${cond ? '  ✓' : '  ✗'} ${n}${cond ? '' : `  → ${extra}`}`);
  if (!cond) fallos++;
};

// Sin comentarios: el porqué del arreglo cita la forma incorrecta, y con los
// comentarios dentro el guard se acusa a sí mismo.
const leer = (p) => fs.readFileSync(path.join(FN, p), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

console.log('\n🔑 grant_type correcto en todo el repo');
// El nombre exacto del parámetro es la diferencia entre renovar y no renovar,
// y el error es invisible: 400 tragado por un catch.
const archivos = ['instagram-sync.js', 'lib/instagram-api.js', 'instagram-plataforma.js'];
for (const f of archivos) {
  let src;
  try { src = leer(f); } catch { continue; }
  if (!/refresh_access_token/.test(src)) continue;
  ok(`${f} usa ig_refresh_token`,
    /ig_refresh_token/.test(src) && !/ig_refreshtoken\b/.test(src),
    'usa "ig_refreshtoken" (sin guion bajo): la API devuelve 400 y el token muere igual');
}

console.log('\n⏰ Cada cuenta tiene quien la renueve');
const plataforma = leer('instagram-plataforma.js');
ok('la cuenta de plataforma tiene cron de renovación',
  /instagramTokenCron/.test(plataforma) && /onSchedule/.test(plataforma),
  'sin cron, el token de @synaptechspa muere a los 60 días y el bot queda sordo');
ok('el cron guarda el token nuevo',
  /refrescarToken/.test(plataforma) && /accessToken:\s*r\.token/.test(plataforma),
  'renovar sin guardar no sirve de nada');
ok('el cron renueva con margen, no al filo',
  /dias\s*>\s*20/.test(plataforma),
  'un token solo se refresca mientras siga VIVO: sin margen, un cron caído obliga a reautorizar a mano');
ok('el fallo de renovación se grita',
  /\[ig-token\][^\n]*NO se pudo renovar/.test(plataforma),
  'si falla en silencio, el token muere igual que antes');

const sync = leer('instagram-sync.js');
ok('los tenants siguen teniendo su renovación',
  /refresh_access_token/.test(sync) && /tokenExpiresAt/.test(sync),
  'se perdió el refresco de los lookbooks');

console.log('\n🚨 El panel no puede tranquilizar de más');
const ops = fs.readFileSync(path.join(__dirname, '..', 'ops.html'), 'utf8');
ok('no promete que el permiso "se renueva solo"',
  !/se renueva solo/i.test(ops),
  'esa frase era falsa para la cuenta de plataforma y desactivaba la única alerta que había');

console.log(fallos === 0
  ? '\n✅ Los tokens de Instagram se renuevan y un fallo se nota.\n'
  : `\n❌ ${fallos} problema(s) — habría cuentas que mueren a los 60 días en silencio.\n`);
process.exit(fallos ? 1 : 0);
