/**
 * backfill-yugen-sellos.js
 *
 * Recupera los sellos que la CF sellosTenant no pudo espejar a users/
 * por bug de teléfono desalineado. Idempotente por citaId:
 *   · Si el historialSellos del user ya tiene una entrada con este citaId
 *     tipo='suma', se salta.
 *
 * Cruza tenants/yugen/citas Completadas con tenants/yugen/users por
 * match de últimos 9 dígitos del teléfono. Solo aplica cuando:
 *   · La cita NO es corte al lápiz.
 *   · El user existe (match por suf9) pero sellosDisponibles < esperado
 *     o historialSellos no incluye esta cita.
 *
 * Escribe en users/{uid}:
 *   · sellosDisponibles += 1
 *   · sellosHistoricos  += 1
 *   · stamps            += 1
 *   · historialSellos   += { fecha, tipo:'suma', cantidad:1, nota, citaId, backfill:true }
 *   · ultimoSello       = ISO
 *
 * No modifica clientes/ (ya tiene los sellos correctos, la fuente de verdad
 * son las citas y el user doc que espeja).
 */

const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'))),
  projectId: 'barberia-elegance',
});
const db = admin.firestore();
const TENANT = 'yugen';
const SELLOS_POR_CITA = 1; // default silver — yugen no tiene sellosPorVisita custom

function normTelSuf9(raw) {
  const digs = String(raw || '').replace(/\D+/g, '');
  return digs.length >= 9 ? digs.slice(-9) : digs;
}

(async () => {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('   Backfill de sellos · Yūgen');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const [citasSnap, usersSnap] = await Promise.all([
    db.collection(`tenants/${TENANT}/citas`).get(),
    db.collection(`tenants/${TENANT}/users`).get(),
  ]);

  const citas = citasSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const usersBySuf9 = new Map();
  for (const u of users) {
    const s = normTelSuf9(u.telefono);
    if (s) usersBySuf9.set(s, u);
  }

  const completadas = citas.filter(c =>
    String(c.estado || '').toLowerCase() === 'completada' && c.corteLapiz !== true
  );

  const acciones = { aplicados: [], omitidos_ya_procesado: [], omitidos_sin_user: [] };

  for (const c of completadas) {
    const suf9 = normTelSuf9(c.clienteTelefono);
    if (!suf9) { acciones.omitidos_sin_user.push({ ...c, reason: 'sin telefono' }); continue; }
    const user = usersBySuf9.get(suf9);
    if (!user) { acciones.omitidos_sin_user.push({ ...c, reason: 'user no existe' }); continue; }

    // Idempotencia: ¿el user ya tiene entrada de suma con este citaId?
    const hist = Array.isArray(user.historialSellos) ? user.historialSellos : [];
    const yaProcesado = hist.some(h => h && h.citaId === c.id && h.tipo === 'suma');
    if (yaProcesado) {
      acciones.omitidos_ya_procesado.push({ ...c, uid: user.id });
      continue;
    }

    // Aplicar sello
    const notaSello  = `Backfill · Cita completada: ${c.servicioNombre || ''}`.trim();
    const entrada = {
      fecha:    new Date().toISOString(),
      tipo:     'suma',
      cantidad: SELLOS_POR_CITA,
      nota:     notaSello,
      citaId:   c.id,
      backfill: true,
    };
    await db.doc(`tenants/${TENANT}/users/${user.id}`).update({
      sellosDisponibles: admin.firestore.FieldValue.increment(SELLOS_POR_CITA),
      sellosHistoricos:  admin.firestore.FieldValue.increment(SELLOS_POR_CITA),
      stamps:            admin.firestore.FieldValue.increment(SELLOS_POR_CITA),
      ultimoSello:       new Date().toISOString(),
      historialSellos:   admin.firestore.FieldValue.arrayUnion(entrada),
    });
    acciones.aplicados.push({ ...c, uid: user.id, userName: user.nombre });
  }

  console.log('════════════════════ Resultado ════════════════════\n');
  console.log(`✅ Sellos aplicados:               ${acciones.aplicados.length}`);
  console.log(`⚪ Ya procesado (idempotencia):    ${acciones.omitidos_ya_procesado.length}`);
  console.log(`⚠️  Sin user registrado:           ${acciones.omitidos_sin_user.length}\n`);

  if (acciones.aplicados.length) {
    console.log('──── Aplicados ────');
    for (const a of acciones.aplicados) {
      console.log(`  · ${a.fecha} ${a.hora || ''}  ${(a.userName || a.clienteNombre || '').padEnd(24).slice(0,24)} tel=${a.clienteTelefono}  uid=${a.uid.slice(0,10)}  citaId=${a.id.slice(0,10)}`);
    }
    console.log('');
  }

  if (acciones.omitidos_ya_procesado.length) {
    console.log('──── Omitidos por idempotencia (ya tenían el sello) ────');
    for (const a of acciones.omitidos_ya_procesado.slice(0, 5)) {
      console.log(`  · ${a.fecha} ${a.hora || ''}  ${(a.clienteNombre || '').padEnd(24).slice(0,24)}`);
    }
    if (acciones.omitidos_ya_procesado.length > 5) {
      console.log(`  · ... y ${acciones.omitidos_ya_procesado.length - 5} más`);
    }
    console.log('');
  }

  console.log('═══════════════════════════════════════════════════════════════\n');
  process.exit(0);
})().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
