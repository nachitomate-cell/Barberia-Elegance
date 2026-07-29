#!/usr/bin/env node
/**
 * check-bot-prompt.js — Guard del prompt cacheable del bot de WhatsApp.
 *
 * Problema que previene: Anthropic solo cachea un prefijo si supera un mínimo
 * de tokens, y Haiku 4.5 (el modelo del bot) tiene el mínimo MÁS ALTO de todos:
 * 4.096. Por debajo de eso la API ignora el `cache_control` EN SILENCIO — no
 * hay error, no hay warning, simplemente `cache_creation` y `cache_read`
 * vuelven en 0 y pagas el prefijo completo en cada una de las ~7 llamadas que
 * gasta una conversación. Así estuvo el bot hasta ahora: el prefijo medía
 * ~2.100 tokens y el caché nunca se activó.
 *
 * Y el modo de falla es asimétrico: quedar CORTO no rompe nada visible, solo
 * duplica la cuenta. Por eso hace falta un guard y no basta con mirar.
 *
 * Qué revisa, tenant por tenant (catálogo, horario y equipo son parte del
 * prefijo, así que un local con pocos servicios puede quedar bajo el mínimo
 * aunque otro pase):
 *
 *   tokens(tools + systemFijo) >= 4.096
 *
 * Mide el prompt REAL: importa `_armarContextoLocal` del propio cerebro.js, no
 * una copia. Si mañana alguien recorta el manual de atención, este guard grita.
 *
 * Uso:
 *   npm run check:bot-prompt              # todos los tenants
 *   node scripts/check-bot-prompt.js delnero sion    # solo algunos
 *   node scripts/check-bot-prompt.js --dump delnero  # además imprime el prompt
 *
 * Con ANTHROPIC_API_KEY en el entorno cuenta los tokens contra la API real
 * (exacto). Sin la key estima por caracteres y exige 15% de margen, porque una
 * estimación al filo no sirve para decidir.
 *
 * Sale con código 1 si algún tenant queda bajo el mínimo (sirve para CI).
 */
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FUNCTIONS = path.join(ROOT, 'functions');

// firebase-admin DEBE resolverse desde functions/ para compartir instancia con
// cerebro.js: dos copias del módulo = dos registros de apps = "default app does
// not exist" al primer admin.firestore().
const admin = require(require.resolve('firebase-admin', { paths: [FUNCTIONS] }));

const args    = process.argv.slice(2);
const DUMP    = args.includes('--dump');
const SOLO    = args.filter(a => !a.startsWith('--'));
const API_KEY = process.env.ANTHROPIC_API_KEY || '';

// Caracteres por token medidos sobre el prompt real en español (~3,5).
// Deliberadamente optimista: si la estimación se pasa de generosa, el margen
// del 15% de abajo cubre la diferencia.
const CHARS_POR_TOKEN = 3.5;
const MARGEN_ESTIMADO = 1.15;

admin.initializeApp({
  credential: admin.credential.cert(require(path.join(ROOT, 'service-account.json'))),
});
const db = admin.firestore();

const cerebro = require(path.join(FUNCTIONS, 'evolution', 'cerebro.js'));
const { _armarContextoLocal: armarContextoLocal, _MODEL: MODEL, _CACHE_MIN_TOKENS: MIN } = cerebro;

/** Tokens exactos del prefijo cacheable (tools + system), vía count_tokens. */
async function contarTokens(systemFijo, tools) {
  const r = await fetch('https://api.anthropic.com/v1/messages/count_tokens', {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      system: [{ type: 'text', text: systemFijo }],
      tools,
      messages: [{ role: 'user', content: 'x' }],
    }),
  });
  if (!r.ok) throw new Error(`count_tokens ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return (await r.json()).input_tokens;
}

async function listarTenants() {
  if (SOLO.length) return SOLO;
  // NUNCA collection('tenants').get(): los docs padre no existen y devuelve casi
  // nada. listDocuments() es la única forma de enumerar tenants.
  const docs = await db.collection('tenants').listDocuments();
  // 'elegance' vive en la raíz de Firestore, no bajo tenants/ — pero algunos
  // proyectos igual tienen el doc espejo, así que hay que deduplicar.
  return [...new Set(['elegance', ...docs.map(d => d.id)])].sort();
}

(async () => {
  const tenants = await listarTenants();
  const modo = API_KEY ? 'exacto (count_tokens)' : `estimado (chars/${CHARS_POR_TOKEN}, +${Math.round((MARGEN_ESTIMADO - 1) * 100)}% de margen)`;
  const umbral = API_KEY ? MIN : Math.ceil(MIN * MARGEN_ESTIMADO);

  console.log(`\n🧠 Prompt cacheable del bot — modelo ${MODEL}`);
  console.log(`   Mínimo para que el caché se active: ${MIN} tokens`);
  console.log(`   Modo de medición: ${modo} → umbral aplicado ${umbral}\n`);
  if (!API_KEY) {
    console.log('   ⚠  Sin ANTHROPIC_API_KEY. Para medir exacto:');
    console.log('      firebase functions:secrets:access ANTHROPIC_API_KEY > .k && ANTHROPIC_API_KEY=$(cat .k) npm run check:bot-prompt\n');
  }

  const fallas = [];
  for (const tid of tenants) {
    let linea;
    try {
      const { systemFijo, toolsBase, servicios, equipo } = await armarContextoLocal(tid);
      const tokens = API_KEY
        ? await contarTokens(systemFijo, toolsBase)
        : Math.round((systemFijo.length + JSON.stringify(toolsBase).length) / CHARS_POR_TOKEN);

      const ok = tokens >= umbral;
      if (!ok) fallas.push({ tid, tokens, servicios: servicios.length });
      linea = `${ok ? '✅' : '❌'} ${tid.padEnd(22)} ${String(tokens).padStart(6)} tok   ${String(servicios.length).padStart(2)} servicios · ${String(equipo.length).padStart(2)} en equipo`;
      if (DUMP) linea += `\n\n──── systemFijo de ${tid} ────\n${systemFijo}\n──── fin ────\n`;
    } catch (e) {
      fallas.push({ tid, tokens: 0, error: e.message });
      linea = `💥 ${tid.padEnd(22)} error: ${e.message}`;
    }
    console.log(linea);
  }

  if (!fallas.length) {
    console.log(`\n✅ Los ${tenants.length} locales superan el mínimo: el caché se activa en todos.\n`);
    process.exit(0);
  }

  console.log(`\n❌ ${fallas.length} local(es) bajo el mínimo — ahí el caché NO se activa y cada`);
  console.log('   conversación paga el prefijo completo en cada llamada:\n');
  for (const f of fallas) {
    console.log(f.error
      ? `   · ${f.tid}: ${f.error}`
      : `   · ${f.tid}: ${f.tokens} tok (faltan ${umbral - f.tokens}) — ${f.servicios} servicios cargados`);
  }
  console.log('\n   Suele ser un local con el catálogo vacío o casi vacío. Cárgale los');
  console.log('   servicios con descripción y horario, o sube el manual de atención');
  console.log('   en functions/evolution/cerebro.js (MANUAL_ATENCION).\n');
  process.exit(1);
})().catch(e => { console.error('💥', e); process.exit(1); });
