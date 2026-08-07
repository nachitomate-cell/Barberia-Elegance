'use strict';
/**
 * test-balanceo-barberos.js — verifica que barberoLibreParaSlot asigna al
 * profesional LIBRE con MENOS citas del día (pedido Kronnos 07-08), contra
 * datos vivos y sin escribir nada.
 *
 * Ground truth por slot: quién está libre se responde con el MISMO motor
 * (exigirBarberoId por cada uno); el elegido debe ser el de menor conteo.
 *
 * Uso: node scripts/test-balanceo-barberos.js [tenant] [fecha]
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
const {
  _barberoLibreParaSlot: barberoLibreParaSlot,
  _horasParaFecha: horasParaFecha,
  _duracionTipica: duracionTipica,
  _ahoraChile: ahoraChile,
} = require(path.join(FN, 'chat-horas-disponibles'));

const TID = process.argv[2] || 'kronnos_penablanca';

const sumarDia = (f) => {
  const [y, m, d] = f.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
};

(async () => {
  const now = ahoraChile();
  const fecha = process.argv[3] || sumarDia(now.fecha);   // mañana por defecto

  const equipo = await cerebro._cargarEquipo(TID);
  const dur = await duracionTipica(TID);

  // Conteo de citas vivas del día por profesional.
  const snap = await db.collection(`tenants/${TID}/citas`).where('fecha', '==', fecha).get();
  const conteo = new Map();
  snap.forEach(d => {
    const x = d.data();
    if (['Cancelada', 'NoAsistio'].includes(x.estado)) return;
    if (!x.barberoId) return;
    conteo.set(x.barberoId, (conteo.get(x.barberoId) || 0) + 1);
  });
  console.log(`\n${TID} — ${fecha} (dur ${dur} min)`);
  console.log('Citas del día:', equipo.map(b => `${b.nombre}=${conteo.get(b.id) || 0}`).join(' · '));

  const slots = await horasParaFecha(TID, fecha, 0, dur, {});
  if (!slots.length) { console.log('Sin slots libres ese día — probar otra fecha.'); process.exit(0); }

  let fallas = 0;
  for (const hora of slots.slice(0, 6)) {
    const libres = [];
    for (const b of equipo) {
      const r = await barberoLibreParaSlot(TID, fecha, hora, dur, { exigirBarberoId: b.id });
      if (r) libres.push(b);
    }
    const pick = await barberoLibreParaSlot(TID, fecha, hora, dur, {});
    const minN = Math.min(...libres.map(b => conteo.get(b.id) || 0));
    const okPick = pick && libres.some(b => b.id === pick.id) && (conteo.get(pick.id) || 0) === minN;
    if (!okPick) fallas++;
    console.log(`${hora}  libres: [${libres.map(b => `${b.nombre}:${conteo.get(b.id) || 0}`).join(', ')}]  → elige ${pick?.nombre || 'nadie'}  ${okPick ? '✅' : '❌ esperaba el de menor conteo'}`);
  }
  console.log(fallas ? `\n❌ ${fallas} slots mal asignados` : '\n✅ Todos los slots asignan al libre con menos citas del día');
  process.exit(fallas ? 1 : 0);
})().catch(e => { console.error('FALLÓ:', e); process.exit(1); });
