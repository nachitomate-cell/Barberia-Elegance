'use strict';
/**
 * test-cambio-profesional.js — ejercita reagendar_cita con el campo
 * `profesional` (candado exigirBarberoId) contra datos VIVOS, en simulado:
 * valida todo el camino y no escribe nada.
 *
 *   1. sin_cambios: mismo profesional + misma fecha/hora
 *   2. profesional inexistente
 *   3. cambio real a cada otro miembro del equipo (ok o motivo honesto)
 *
 * Uso: node scripts/test-cambio-profesional.js [tenant]
 */
const path = require('path');
const fs   = require('fs');

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

const cerebro = require(path.join(FN, 'evolution/cerebro'));
const { _ahoraChile: ahoraChile } = require(path.join(FN, 'chat-horas-disponibles'));

const TID = process.argv[2] || 'kronnos_penablanca';

(async () => {
  const now = ahoraChile();
  // Una cita FUTURA (mañana en adelante, para esquivar minutosLimiteReagendar)
  // con teléfono y barbero asignado.
  const snap = await db.collection(`tenants/${TID}/citas`).where('fecha', '>', now.fecha).get();
  let cita = null;
  const preferSvc = process.argv[3] || null;   // ej: corte-masculino
  snap.forEach(d => {
    const c = d.data();
    if (['Cancelada', 'Completada', 'NoAsistio'].includes(c.estado)) return;
    if (c.sobrecupo === true) return;
    if (!c.barberoId || !c.hora) return;
    const tel = String(c.clienteTelefono || '').replace(/\D/g, '');
    if (tel.length < 8) return;
    if (preferSvc && String(c.servicioId) !== preferSvc) return;
    if (!cita) cita = { id: d.id, ...c, tel };
  });
  if (!cita) { console.log(`Sin citas futuras utilizables en ${TID}.`); process.exit(0); }

  console.log(`\nCita de prueba: ${cita.id} — ${cita.fecha} ${cita.hora} · ${cita.servicioNombre} · con ${cita.barbero} [${cita.barberoId}]`);
  const equipo = await cerebro._cargarEquipo(TID);
  console.log(`Equipo: ${equipo.map(b => `${b.nombre} [${b.id}]`).join(' · ')}\n`);

  const ctx = { tid: TID, telefono: cita.tel, chatId: 'PRUEBA-CAMBIO-PROF', simulado: true, traza: [] };
  const llamar = (input) => cerebro._ejecutarTool('reagendar_cita', { cita_id: cita.id, fecha: cita.fecha, hora: cita.hora, ...input }, ctx);

  // 1) Mismo profesional + misma fecha/hora → sin_cambios
  const r1 = await llamar({ profesional: cita.barbero });
  console.log(`1) mismo profesional     → ${JSON.stringify(r1)}`);
  console.log(`   ${r1.sin_cambios === true ? '✅ sin_cambios' : '❌ esperaba sin_cambios'}\n`);

  // 2) Nombre inexistente
  const r2 = await llamar({ profesional: 'Cristóbal Pérez' });
  console.log(`2) inexistente           → ${JSON.stringify(r2)}`);
  console.log(`   ${r2.ok === false && /no corresponde/.test(r2.motivo || '') ? '✅ rechazado con lista del equipo' : '❌ respuesta inesperada'}\n`);

  // 3) Cambio real a cada otro profesional (simulado valida hasta el slot)
  for (const b of equipo.filter(e => e.id !== cita.barberoId)) {
    const r = await llamar({ profesional: b.nombre });
    const veredicto = r.ok === true
      ? (r.profesional === b.nombre ? `✅ ok con ${r.profesional}` : `❌ ok pero con OTRO: ${r.profesional}`)
      : `✅ rechazo honesto: ${r.motivo}`;
    console.log(`3) cambiar a ${b.nombre}  → ${JSON.stringify(r)}`);
    console.log(`   ${veredicto}\n`);
  }
  process.exit(0);
})().catch(e => { console.error('FALLÓ:', e); process.exit(1); });
