'use strict';
/**
 * diag-sandbox-juan.js — replica en sandbox la conversación de Juan Montero
 * (kronnos_penablanca, 07-08: "con Evelyn, para adulto y niño") con el loop
 * REAL del cerebro. Lecturas de verdad, escrituras neutralizadas (ctx.simulado).
 *
 * Uso: node scripts/diag-sandbox-juan.js
 */
const path = require('path');
const fs   = require('fs');
const { execSync } = require('child_process');

const RAIZ = path.join(__dirname, '..');
const FN   = path.join(RAIZ, 'functions');
const admin = require(path.join(FN, 'node_modules/firebase-admin'));

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
  return execSync('npx firebase-tools functions:secrets:access ANTHROPIC_API_KEY',
    { cwd: RAIZ, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

const cerebro = require(path.join(FN, 'evolution/cerebro'));
const { lineasCalendario } = require(path.join(FN, 'lib/calendario'));
const { _ahoraChile: ahoraChile } = require(path.join(FN, 'chat-horas-disponibles'));

const TID = 'kronnos_penablanca';
const TURNOS = [
  'Hola buen día. Disponibilidad de serva para las 16:00 corte de cabello, servicio para adulto y niño.',
  'Con la colorina. No recuerdo su nombre, creo que es Evelyn.',
  'Hoy viernes 7\nNiño 11 años',
  'Corte masculino para los dos, con Evelyn',
];

(async () => {
  const KEY = anthropicKey();
  const waCfg = (await db.doc(`tenants/${TID}/configuracion/whatsapp`).get().catch(() => null))?.data() || {};
  const base = await cerebro._armarContextoLocal(TID, {
    estiloChileno: waCfg.estiloChileno === true,
    nombreAgente: waCfg.nombreAgente,
  });

  const now = ahoraChile();
  const systemVariable = [
    ...lineasCalendario(now.fecha, now.hhmm),
    'El cliente escribe desde el número 56900000001 y en WhatsApp aparece como "Juan".',
  ].join('\n');

  console.log(`\n🧪 Sandbox ${TID} — ${now.fecha} ${now.hhmm} (Chile)\n`);

  const historia = [];
  for (const turno of TURNOS) {
    console.log(`👤 Cliente: ${turno.replace(/\n/g, ' · ')}`);
    const ctx = { tid: TID, telefono: '56900000001', chatId: `PRUEBA-${Date.now()}`, simulado: true, traza: [] };
    const respuesta = await cerebro._pensarYResponder({
      anthropicKey: KEY, systemFijo: base.systemFijo, systemVariable,
      historia: [...historia], texto: turno, ctx, tools: base.toolsBase,
    });
    for (const t of ctx.traza) {
      const out = JSON.stringify(t.out || {});
      console.log(`   🔧 ${t.name}(${JSON.stringify(t.input)})`);
      console.log(`      → ${out.length > 400 ? out.slice(0, 400) + '…' : out}`);
    }
    console.log(`🤖 Bot: ${respuesta.replace(/\n/g, '\n        ')}\n`);
    historia.push({ role: 'user', content: turno }, { role: 'assistant', content: respuesta });
  }
  process.exit(0);
})().catch(e => { console.error('FALLÓ:', e); process.exit(1); });
