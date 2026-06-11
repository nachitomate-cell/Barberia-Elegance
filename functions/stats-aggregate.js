'use strict';

// functions/stats-aggregate.js
// ─────────────────────────────────────────────────────────────────
//  AGREGADOS DE CLIENTES (para reducir lecturas en los dashboards)
//
//  Cron cada 6h. Para cada tenant lee la colección users UNA vez,
//  calcula los conteos (incluida fidelización legacy-aware, que NO
//  es consultable con where) y los guarda en {statsPath}/resumen.
//
//  Los dashboards (Inicio, Métricas) leen ESE doc (1 lectura) en vez
//  de traer ~700 clientes en cada carga.
//
//  DEPLOY:
//    firebase deploy --only functions:agregarStatsClientes
// ─────────────────────────────────────────────────────────────────

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { logger }     = require('firebase-functions');
const admin          = require('firebase-admin');
const { Timestamp }  = require('firebase-admin/firestore');

const db = admin.firestore();

const TIMEZONE = 'America/Santiago';

// usersPath: dónde viven los clientes. statsPath: dónde se guarda el resumen.
const TENANTS = [
  { id: 'elegance',             usersPath: 'users',                              statsPath: '_stats'                              },
  { id: 'gitana',               usersPath: 'tenants/gitana/users',               statsPath: 'tenants/gitana/_stats'               },
  { id: 'ferraza',              usersPath: 'tenants/ferraza/users',              statsPath: 'tenants/ferraza/_stats'              },
  { id: 'chameleon',            usersPath: 'tenants/chameleon/users',            statsPath: 'tenants/chameleon/_stats'            },
  { id: 'aura',                 usersPath: 'tenants/aura/users',                 statsPath: 'tenants/aura/_stats'                 },
  { id: 'latincaribe',          usersPath: 'tenants/latincaribe/users',          statsPath: 'tenants/latincaribe/_stats'          },
  { id: 'lumen',                usersPath: 'tenants/lumen/users',                statsPath: 'tenants/lumen/_stats'                },
  { id: 'mapubarbershop',       usersPath: 'tenants/mapubarbershop/users',       statsPath: 'tenants/mapubarbershop/_stats'       },
  { id: 'delnero',              usersPath: 'tenants/delnero/users',              statsPath: 'tenants/delnero/_stats'              },
  { id: 'marcelo_hairdressing', usersPath: 'tenants/marcelo_hairdressing/users', statsPath: 'tenants/marcelo_hairdressing/_stats' },
  { id: 'machos',               usersPath: 'tenants/machos/users',               statsPath: 'tenants/machos/_stats'               },
  { id: 'infinity',             usersPath: 'tenants/infinity/users',             statsPath: 'tenants/infinity/_stats'             },
  { id: 'sionbarberia',         usersPath: 'tenants/sionbarberia/users',         statsPath: 'tenants/sionbarberia/_stats'         },
  { id: 'deluxeperfumes',       usersPath: 'tenants/deluxeperfumes/users',       statsPath: 'tenants/deluxeperfumes/_stats'       },
];

// Migrado/legacy de AgendaPro (nunca se unió al Club): uid === id del doc.
const isLegacy = (data, id) => !!data.uid && data.uid === id;
const sellosDe = c => c.sellosHistoricos ?? c.stamps ?? 0;

const fmtYM = date => new Intl.DateTimeFormat('en-CA', {
  timeZone: TIMEZONE, year: 'numeric', month: '2-digit',
}).format(date); // "2026-06"

async function agregarTenant(tenant, nowYM, nowMM) {
  const snap = await db.collection(tenant.usersPath).get();

  let total = 0, registrados = 0, conSellos = 0, nuevosMes = 0;
  const cumpleanerosMes = [];

  snap.forEach(doc => {
    const c = doc.data();
    total++;

    const legacy = isLegacy(c, doc.id);
    if (!legacy) {
      registrados++;
      if (sellosDe(c) > 0) conSellos++;
    }

    // Nuevos del mes (creadoEn Timestamp dentro del mes actual, zona Santiago)
    const cre = c.creadoEn;
    if (cre && typeof cre.toDate === 'function' && fmtYM(cre.toDate()) === nowYM) {
      nuevosMes++;
    }

    // Cumpleaños del mes (cumpleDia "MM-DD" o fechaNacimiento "YYYY-MM-DD")
    let mmdd = null;
    if (c.cumpleDia && c.cumpleDia.startsWith(nowMM + '-')) mmdd = c.cumpleDia;
    else if (c.fechaNacimiento && c.fechaNacimiento.split('-')[1] === nowMM) {
      const p = c.fechaNacimiento.split('-'); mmdd = `${p[1]}-${p[2]}`;
    }
    if (mmdd) {
      cumpleanerosMes.push({
        nombre:   c.nombre   || 'Cliente',
        telefono: c.telefono || doc.id || '',
        dia:      Number(mmdd.split('-')[1]) || 99,
      });
    }
  });

  cumpleanerosMes.sort((a, b) => a.dia - b.dia);

  const resumen = {
    totalClientes:   total,
    registrados,
    conSellos,
    sinSellos:       Math.max(0, registrados - conSellos),
    nuevosMes,
    mesNuevos:       nowYM,
    cumpleanerosMes,
    mesCumple:       nowMM,
    generadoEn:      Timestamp.now(),
  };

  await db.collection(tenant.statsPath).doc('resumen').set(resumen);
  logger.info(`[Stats] ${tenant.id}: total=${total} registrados=${registrados} conSellos=${conSellos} nuevos=${nuevosMes} cumple=${cumpleanerosMes.length}`);
}

exports.agregarStatsClientes = onSchedule(
  { schedule: '0 */6 * * *', timeZone: TIMEZONE },
  async () => {
    const nowYM = fmtYM(new Date());   // "2026-06"
    const nowMM = nowYM.slice(5);       // "06"
    logger.info(`[Stats] Iniciando agregación para ${nowYM}`);

    for (const tenant of TENANTS) {
      try {
        await agregarTenant(tenant, nowYM, nowMM);
      } catch (err) {
        logger.error(`[Stats] Error en ${tenant.id}: ${err.message}`);
      }
    }
    logger.info('[Stats] Agregación completada');
  },
);
