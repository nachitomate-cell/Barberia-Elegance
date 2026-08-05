#!/usr/bin/env node
/**
 * auditar-citas-imposibles.js — citas que nadie va a poder atender.
 *
 * Busca en las citas FUTURAS de todos los tenants tres descalces que el
 * cliente descubre recién cuando llega al local:
 *
 *   1. SERVICIO — el profesional no lo realiza (`serviciosIds`).
 *      Pasó en renacer el 04-08: Kimberly reservó "Corte de Cabello Femenino"
 *      eligiendo "Sin preferencia" y le tocó Yender, que tiene 8 servicios
 *      habilitados y los 8 son masculinos.
 *
 *   2. DÍA — ese día el profesional no atiende: día libre, bloqueo de día
 *      completo, o el local cerrado. Pasó en kronnos_penablanca el 03-08 con
 *      Araceli bloqueada el día entero.
 *
 *   3. HORA — cae fuera de su jornada o encima de un descanso. Este es el que
 *      aparece solo: basta que el dueño le acorte el horario a alguien para
 *      que las citas de más tarde queden huérfanas, y nadie se entera.
 *
 * La jornada se DERIVA de chat-horas-disponibles (el mismo módulo que usa el
 * motor), no se recalcula acá: dos versiones de la misma regla terminan
 * diciendo cosas distintas.
 *
 * Solo lectura. No modifica nada.
 *
 * Uso:  npm run check:citas            (todos los tenants, 60 días)
 *       node scripts/auditar-citas-imposibles.js renacer 30
 */
const path = require('path');
// firebase-admin desde functions/, NO desde la raíz: hay dos copias instaladas
// y cada una tiene su propio registro de apps. Inicializar la de la raíz deja
// a chat-horas-disponibles —que resuelve la de functions/— sin app y explota
// al cargar. Resolviendo desde acá, las dos son la misma instancia.
const FUNCS = path.join(__dirname, '..', 'functions');
const admin = require(require.resolve('firebase-admin', { paths: [FUNCS] }));
const key = require('../service-account.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(key) });
const db = admin.firestore();

const {
  _atiendeEseDia: atiendeEseDia,
  _rangosFueraDeJornada: rangosFueraDeJornada,
  _dowDe: dowDe,
} = require('../functions/chat-horas-disponibles');

const ARG_TENANT = process.argv[2] || 'ALL';
const DIAS       = Number(process.argv[3]) || 60;

const hoyChile = () => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date()).map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
};
const sumarDias = (f, n) => {
  const [y, m, d] = f.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
const toMins = (t) => { const [h, m] = String(t || '').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
const solapan = (a1, a2, b1, b2) => a1 < b2 && b1 < a2;

const MOTIVO = {
  dia_libre:     'ese día es su día libre',
  bloqueado:     'tiene el día bloqueado',
  local_cerrado: 'el local no abre ese día',
  no_elegible:   'ya no está activo en el equipo',
  no_existe:     'ese profesional ya no existe',
};

(async () => {
  const desde = hoyChile();
  const hasta = sumarDias(desde, DIAS);
  console.log(`\n🔎 Citas que nadie va a poder atender`);
  console.log(`   Rango: ${desde} → ${hasta} (${DIAS} días)\n`);

  const tenants = ARG_TENANT === 'ALL'
    ? (await db.collection('tenants').listDocuments()).map(t => t.id)
    : [ARG_TENANT];

  let revisadas = 0, malas = 0, afectados = 0;
  const porTipo = { servicio: 0, dia: 0, hora: 0 };

  for (const tid of tenants) {
    const barbSnap = await db.collection(`tenants/${tid}/barberos`).get().catch(() => null);
    if (!barbSnap) continue;

    const canon = new Map();   // docId canónico → datos
    const alias = new Map();   // doc-espejo → canónico
    barbSnap.forEach(d => {
      const b = d.data() || {};
      if (b._mainDocId) { alias.set(d.id, b._mainDocId); return; }
      canon.set(d.id, {
        nombre: b.nombre || d.id,
        servicios: Array.isArray(b.serviciosIds) ? b.serviciosIds.map(String) : null,
        horario: b.horario || null,
      });
    });

    // configuracion/main de cada profesional (jornada personal), una vez.
    const cfgPersonal = new Map();
    await Promise.all([...canon.keys()].map(async id => {
      const c = await db.doc(`tenants/${tid}/barberos/${id}/configuracion/main`).get().catch(() => null);
      cfgPersonal.set(id, c && c.exists ? c.data() : null);
    }));

    const citas = await db.collection(`tenants/${tid}/citas`)
      .where('fecha', '>=', desde).where('fecha', '<=', hasta).get().catch(() => null);
    if (!citas) continue;

    const hallazgos = [];
    for (const d of citas.docs) {
      const c = d.data() || {};
      if (['Cancelada', 'NoAsistio'].includes(c.estado)) continue;
      if (!c.barberoId || typeof c.fecha !== 'string' || typeof c.hora !== 'string') continue;
      revisadas++;

      const id = alias.get(c.barberoId) || c.barberoId;
      const prof = canon.get(id);
      if (!prof) continue;

      const base = {
        citaId: d.id, fecha: c.fecha, hora: c.hora, cliente: c.clienteNombre || '—',
        prof: prof.nombre, servicio: c.servicioNombre || c.servicioId, origen: c.origen || '(sin origen)',
      };

      // 1) ¿realiza el servicio?
      if (c.servicioId && prof.servicios && prof.servicios.length
          && !prof.servicios.includes(String(c.servicioId))) {
        hallazgos.push({ ...base, tipo: 'servicio', detalle: `no realiza "${base.servicio}"` });
        porTipo.servicio++;
        continue;
      }

      // 2) ¿atiende ese día?
      const j = await atiendeEseDia(tid, c.fecha, id).catch(() => null);
      if (j && j.atiende === false) {
        hallazgos.push({ ...base, tipo: 'dia', detalle: MOTIVO[j.motivo] || j.motivo });
        porTipo.dia++;
        continue;
      }

      // 3) ¿cae dentro de su jornada?
      const dur = Number(c.duracionServicio ?? c.duracion) || 30;
      const ini = toMins(c.hora);
      const fin = ini + dur;
      const fuera = rangosFueraDeJornada({
        docHorario:  prof.horario,
        cfgPersonal: cfgPersonal.get(id),
        dow:         dowDe(c.fecha),
      });
      const choca = fuera.find(([a, z]) => solapan(ini, fin, a, z));
      if (choca) {
        const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
        hallazgos.push({
          ...base, tipo: 'hora',
          detalle: `${c.hora}–${hhmm(fin)} cae fuera de su jornada (choca con ${hhmm(choca[0])}–${hhmm(choca[1])})`,
        });
        porTipo.hora++;
      }
    }

    if (!hallazgos.length) continue;
    afectados++;
    malas += hallazgos.length;
    console.log(`==== ${tid} — ${hallazgos.length} cita(s) ====`);
    hallazgos.sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
    hallazgos.forEach(h => {
      console.log(`  [${h.tipo.toUpperCase()}] ${h.fecha} ${h.hora}  ${h.prof} — ${h.detalle}`);
      console.log(`     cliente=${h.cliente}  origen=${h.origen}  citaId=${h.citaId}`);
    });
    console.log('');
  }

  console.log('==== RESUMEN ====');
  console.log(`  citas revisadas   : ${revisadas}`);
  console.log(`  imposibles        : ${malas}  (servicio ${porTipo.servicio} · día ${porTipo.dia} · hora ${porTipo.hora})`);
  console.log(`  tenants afectados : ${afectados} de ${tenants.length}`);
  if (malas) {
    console.log('\n  Hay que reasignarlas o moverlas desde la agenda: si no, el cliente');
    console.log('  llega y no hay quien lo atienda.\n');
    process.exitCode = 1;
  } else {
    console.log('  Nada que reasignar.\n');
  }
  process.exit(process.exitCode || 0);
})().catch(e => { console.error('ERROR:', e); process.exit(2); });
