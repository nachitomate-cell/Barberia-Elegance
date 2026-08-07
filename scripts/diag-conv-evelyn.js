/** Busca conversaciones de hoy en kronnos_penablanca que mencionen a Evelyn. Solo lectura. */
const path = require('path');
const FUNCS = path.join(__dirname, '..', 'functions');
const admin = require(require.resolve('firebase-admin', { paths: [FUNCS] }));
const key = require('../service-account.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(key) });
const db = admin.firestore();

async function main() {
  const snap = await db.collection('tenants/kronnos_penablanca/wa_conversaciones')
    .orderBy('updatedAt', 'desc').limit(30).get();
  for (const d of snap.docs) {
    const c = d.data() || {};
    const msgs = Array.isArray(c.messages) ? c.messages : [];
    const texto = msgs.map(m => m.content).join('\n');
    if (!/evelyn|colorina/i.test(texto)) continue;
    console.log(`\n════ chat ${d.id}  (${c.clienteNombre || 's/n'})  updatedAt: ${c.updatedAt?.toDate?.()?.toISOString?.() || '—'} ════`);
    msgs.slice(-30).forEach(m => {
      console.log(`\n[${m.role}] ${String(m.content).slice(0, 600)}`);
    });
  }
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
