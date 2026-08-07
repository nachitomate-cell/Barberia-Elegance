'use strict';
/**
 * diag-sandbox-cambio-prof.js — replica en sandbox el caso Alonso Uribe
 * (kronnos_penablanca, 07-08): cliente con cita hecha pide cambiar de
 * profesional manteniendo la hora. Loop REAL del cerebro; lecturas de
 * verdad, escrituras neutralizadas (ctx.simulado).
 *
 * Uso: node scripts/diag-sandbox-cambio-prof.js [telefono]
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
const TELEFONO = process.argv[2] || '56942074619';

(async () => {
  const now = ahoraChile();

  // Contexto previo: la cita futura del cliente y la política de reagendo.
  const conf = (await db.doc(`tenants/${TID}/configuracion/main`).get()).data() || {};
  console.log(`\nPolítica: chatCancelEnabled=${conf.chatCancelEnabled}  minutosLimiteReagendar=${conf.minutosLimiteReagendar || 0}`);
  const suf9 = TELEFONO.slice(-9);
  const citas = await db.collection(`tenants/${TID}/citas`).where('fecha', '>=', now.fecha).get();
  citas.forEach(d => {
    const c = d.data();
    const esSuya = c.clienteTelefonoSuf9 === suf9 || String(c.clienteTelefono || '').replace(/\D/g, '').endsWith(suf9);
    if (esSuya && !['Cancelada', 'Completada', 'NoAsistio'].includes(c.estado))
      console.log(`Cita del cliente: ${d.id} — ${c.fecha} ${c.hora} · ${c.servicioNombre} · con ${c.barbero} (${c.estado})`);
  });

  const KEY = anthropicKey();
  const waCfg = (await db.doc(`tenants/${TID}/configuracion/whatsapp`).get().catch(() => null))?.data() || {};
  const base = await cerebro._armarContextoLocal(TID, {
    estiloChileno: waCfg.estiloChileno === true,
    nombreAgente: waCfg.nombreAgente,
  });

  const systemVariable = [
    ...lineasCalendario(now.fecha, now.hhmm),
    `El cliente escribe desde el número ${TELEFONO} y en WhatsApp aparece como "Alonso".`,
  ].join('\n');

  console.log(`\n🧪 Sandbox ${TID} — ${now.fecha} ${now.hhmm} (Chile)\n`);

  const TURNOS = [
    'Hola, tengo una cita agendada para hoy. Quiero que me atienda Evelyn en vez de la persona que me tocó, manteniendo la misma hora. Se puede?',
    'Si, cámbiala porfa',
  ];

  const historia = [];
  for (const turno of TURNOS) {
    console.log(`👤 Cliente: ${turno}`);
    const ctx = { tid: TID, telefono: TELEFONO, chatId: `PRUEBA-${Date.now()}`, simulado: true, traza: [] };
    const respuesta = await cerebro._pensarYResponder({
      anthropicKey: KEY, systemFijo: base.systemFijo, systemVariable,
      historia: [...historia], texto: turno, ctx, tools: base.toolsBase,
    });
    for (const t of ctx.traza) {
      const out = JSON.stringify(t.out || {});
      console.log(`   🔧 ${t.name}(${JSON.stringify(t.input)})`);
      console.log(`      → ${out.length > 450 ? out.slice(0, 450) + '…' : out}`);
    }
    console.log(`🤖 Bot: ${respuesta.replace(/\n/g, '\n        ')}\n`);
    historia.push({ role: 'user', content: turno }, { role: 'assistant', content: respuesta });
  }
  process.exit(0);
})().catch(e => { console.error('FALLÓ:', e); process.exit(1); });
