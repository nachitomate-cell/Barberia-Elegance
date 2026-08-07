/**
 * Diagnóstico E2E del historial de actividad (actividad-citas.js) en el
 * tenant de práctica: crea una cita → la reagenda → la cancela "como
 * cliente" → la borra, y verifica que cada paso quedó en
 * tenants/practica/actividad con el tipo y actor esperados.
 *
 *   node scripts/diag-actividad-practica.js
 *
 * Sin clienteEmail ni teléfono: ningún trigger de correo/WhatsApp tiene a
 * quién escribirle. Deja todo limpio al final (cita + slotLocks huérfanos).
 * Los eventos de actividad generados se quedan — son la prueba visible en
 * la campanita del sandbox.
 */

const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

admin.initializeApp({
  credential: admin.credential.cert(
    JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'service-account.json'), 'utf8'))
  ),
  projectId: 'barberia-elegance',
});
const db = admin.firestore();
const FV = admin.firestore.FieldValue;

const TID = 'practica';
const col = (name) => db.collection(`tenants/${TID}/${name}`);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function fechaFutura(dias) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(d);
}

(async () => {
  // Barbero real del sandbox (no QA, doc principal)
  const barberos = await col('barberos').get();
  const barbero = barberos.docs.map(d => ({ id: d.id, ...d.data() }))
    .find(b => !b.esQA && !b._mainDocId && b.activo !== false);
  if (!barbero) throw new Error('practica sin barberos — corre scripts/seed-practica.js');
  console.log(`Barbero: ${barbero.nombre} (${barbero.id})`);

  const fecha = fechaFutura(9);
  const citaRef = col('citas').doc();
  console.log(`\n1) Crear cita ${fecha} 15:00 …`);
  await citaRef.set({
    fecha, hora: '15:00',
    clienteNombre:  'Diag Actividad',
    servicioNombre: 'Corte de cabello',
    duracionServicio: 45, duracion: 45, precio: 12000,
    barbero: barbero.nombre, barberoId: barbero.id,
    estado: 'Pendiente',
    origen: 'reserva-web',
    creadoEn: FV.serverTimestamp(),
  });
  await sleep(9000);

  console.log('2) Reagendar a 16:30 …');
  await citaRef.update({ hora: '16:30' });
  await sleep(9000);

  console.log('3) Cancelar como cliente …');
  await citaRef.update({ estado: 'Cancelada', canceladaPor: 'cliente' });
  await sleep(9000);

  console.log('4) Borrar la cita …');
  await citaRef.delete();
  await sleep(9000);

  // Limpieza de slotLocks que asegurarSlotTenant haya creado para esta cita
  const locks = await col('slotLocks').where('citaId', '==', citaRef.id).get();
  for (const l of locks.docs) await l.ref.delete();
  if (locks.size) console.log(`   (limpiados ${locks.size} slotLocks)`);

  console.log('\n── Eventos registrados en tenants/practica/actividad ──');
  const snap = await col('actividad').where('citaId', '==', citaRef.id).get();
  const eventos = snap.docs.map(d => d.data())
    .sort((a, b) => (a.ts?.toMillis?.() || 0) - (b.ts?.toMillis?.() || 0));
  for (const e of eventos) {
    const cambios = (e.cambios || []).map(c => `${c.campo}: ${c.antes} → ${c.despues}`).join(', ');
    console.log(`  · ${e.tipo.padEnd(12)} actor=${e.actor}${e.actorNombre ? ` (${e.actorNombre})` : ''}${e.origenLabel ? ` [${e.origenLabel}]` : ''}${cambios ? ` | ${cambios}` : ''}`);
  }

  const tipos = eventos.map(e => e.tipo);
  const esperado = ['creada', 'reagendada', 'cancelada', 'eliminada'];
  const ok = esperado.every(t => tipos.includes(t));
  console.log(ok
    ? `\n✅ ${eventos.length}/4 eventos — el historial registra el ciclo completo.`
    : `\n❌ Faltan eventos. Esperaba ${esperado.join(', ')} y llegó: ${tipos.join(', ') || '(nada)'}`);
  process.exit(ok ? 0 : 1);
})().catch(err => { console.error('❌', err); process.exit(1); });
