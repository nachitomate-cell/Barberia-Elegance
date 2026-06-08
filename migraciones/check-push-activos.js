/**
 * check-push-activos.js
 *
 * Diagnostica cuantos clientes/miembros del Club tienen notificaciones
 * push ACTIVAS y cuantos NO, por tenant.
 *
 * Modelo de datos:
 *   - Miembros del Club:  tenants/{tid}/users  (doc id = uid)   | elegance: users
 *   - Tokens push:        tenants/{tid}/fcm_tokens              | elegance: fcm_tokens
 *       cada doc: { userId, token, activo }
 *   Un miembro tiene push activa si existe >=1 token con activo==true
 *   cuyo userId == su uid.
 *
 * Uso:
 *   node migraciones/check-push-activos.js              (todos los tenants)
 *   node migraciones/check-push-activos.js aura         (un tenant)
 *   node migraciones/check-push-activos.js aura --list  (lista los miembros SIN push)
 *
 * Es de SOLO LECTURA: no modifica nada.
 */

const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

const ALL_TENANTS = ['aura', 'chameleon', 'elegance', 'ferraza', 'gitana', 'mapubarbershop', 'marcelo_hairdressing'];

const SERVICE_ACCOUNT_PATH = path.join(__dirname, '..', 'service-account.json');
let credential;
if (fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  credential = admin.credential.cert(JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8')));
} else {
  credential = admin.credential.applicationDefault();
}
admin.initializeApp({ credential, projectId: 'barberia-elegance' });
const db = admin.firestore();

const args     = process.argv.slice(2);
const listFlag = args.includes('--list');
const tenantArg = args.find(a => !a.startsWith('--'));
const TENANTS  = tenantArg ? [tenantArg] : ALL_TENANTS;

function paths(tid) {
  const isElegance = tid === 'elegance';
  return {
    users:  isElegance ? 'users'      : `tenants/${tid}/users`,
    tokens: isElegance ? 'fcm_tokens' : `tenants/${tid}/fcm_tokens`,
  };
}

async function analizarTenant(tid) {
  const p = paths(tid);

  // Miembros del Club
  const usersSnap = await db.collection(p.users).get();

  // Todos los tokens del tenant (1 lectura de coleccion)
  const tokensSnap = await db.collection(p.tokens).get();

  // uids con al menos un token ACTIVO
  const conActivo = new Set();
  let tokensActivos = 0, tokensInactivos = 0;
  tokensSnap.forEach(d => {
    const t = d.data();
    if (t.activo === true && t.userId) {
      conActivo.add(t.userId);
      tokensActivos++;
    } else {
      tokensInactivos++;
    }
  });

  const totalMiembros = usersSnap.size;
  let conPush = 0;
  const sinPush = [];
  usersSnap.forEach(d => {
    if (conActivo.has(d.id)) {
      conPush++;
    } else {
      const u = d.data();
      sinPush.push({ uid: d.id, nombre: u.nombre || '(sin nombre)', email: u.email || '(sin email)' });
    }
  });

  return {
    tid, totalMiembros, conPush, sinPush,
    tokensActivos, tokensInactivos, totalTokens: tokensSnap.size,
  };
}

async function main() {
  console.log('\nDiagnostico de notificaciones push (miembros del Club)\n');
  console.log(
    'TENANT'.padEnd(22),
    'MIEMBROS'.padStart(9),
    'CON PUSH'.padStart(9),
    'SIN PUSH'.padStart(9),
    '% ACTIVA'.padStart(9),
    'TOKENS act/inact'.padStart(18),
  );
  console.log('─'.repeat(80));

  for (const tid of TENANTS) {
    try {
      const r = await analizarTenant(tid);
      const pct = r.totalMiembros ? Math.round((r.conPush / r.totalMiembros) * 100) : 0;
      console.log(
        tid.padEnd(22),
        String(r.totalMiembros).padStart(9),
        String(r.conPush).padStart(9),
        String(r.sinPush.length).padStart(9),
        (pct + '%').padStart(9),
        `${r.tokensActivos}/${r.tokensInactivos}`.padStart(18),
      );

      if (listFlag && r.sinPush.length) {
        console.log(`\n   ── Miembros SIN push en "${tid}" (${r.sinPush.length}) ──`);
        r.sinPush.forEach(m => console.log(`   • ${m.nombre.padEnd(28)} ${m.email}`));
        console.log('');
      }
    } catch (e) {
      console.log(tid.padEnd(22), 'ERROR:', e.message);
    }
  }

  console.log('\nNota: "miembros" = usuarios registrados en el Club (coleccion users).');
  console.log('Los clientes que NO son del Club nunca aparecen aqui y no pueden recibir push.');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
