'use strict';

/* ═══════════════════════════════════════════════════════════════
 *  functions/aviso-vencimiento-pack.js
 *  ─────────────────────────────────────────────────────────────
 *  Cron diario (10:00 CLT) que busca packs próximos a vencer y
 *  envía push al cliente antes de que se le pase la fecha.
 *
 *  Ventana de aviso: fechaVencimiento entre [hoy+2, hoy+3].
 *  Un solo aviso por pack — se marca en `packsActivos[i].avisoVencimientoAt`
 *  para no re-avisar todos los días la misma cuenta regresiva.
 *
 *  Cobertura:
 *    · elegance (raíz)          — users/{uid}.packsActivos[]
 *    · tenants/{tid}/users/{uid}.packsActivos[] para el resto
 *    · Kronnos: pool marca en tenants/kronnos/users, sin duplicar
 *      por sede (por eso el resolver marca-aware).
 *
 *  DEPLOY:
 *    firebase deploy --only functions:avisarVencimientoPack
 * ═══════════════════════════════════════════════════════════════ */

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { logger }     = require('firebase-functions');
const admin          = require('firebase-admin');

const db        = admin.firestore();
const messaging = admin.messaging();
const FieldValue = admin.firestore.FieldValue;

/* Tenants con potencial de packs. Excluye deluxeperfumes (no usa packs
   de sesión, tiene membresía) y sionbarberia/memphis (no habilitados).
   El pool marca kronnos concentra los packs de las 3 sedes. */
const TENANTS_CON_PACKS = [
  'elegance', 'ferraza', 'gitana', 'chameleon', 'mapubarbershop',
  'lumen', 'delnero', 'marcelo_hairdressing', 'aura', 'latincaribe',
  'machos', 'infinity', 'yugen', 'kronnos', 'barbersclub', 'elbarberomoderno',
];

/* Ventana de aviso: 2-3 días antes del vencimiento. Un pack solo
   entra a la ventana una vez — nos evita despertar al cliente todos
   los días de la última semana. Se marca en el propio pack. */
const DIAS_ANTES_MIN = 2;
const DIAS_ANTES_MAX = 3;

/* Helpers ─────────────────────────────────────────────────────── */
function usersColRef(tid) {
  return tid === 'elegance'
    ? db.collection('users')
    : db.collection('tenants').doc(tid).collection('users');
}
function tokensColRef(tid) {
  return tid === 'elegance'
    ? db.collection('fcm_tokens')
    : db.collection('tenants').doc(tid).collection('fcm_tokens');
}

/* Devuelve los tokens activos del cliente (excluye admin panel para
   no spammear al dueño con avisos de packs de sus propios clientes). */
async function tokensDeCliente(tid, uid) {
  const snap = await tokensColRef(tid)
    .where('userId', '==', uid)
    .where('activo', '==', true)
    .get();
  const tokens = [];
  snap.docs.forEach(d => {
    const data = d.data() || {};
    if (data.plataforma === 'web-admin') return;
    if (data.token) tokens.push({ token: data.token, docId: d.id });
  });
  return tokens;
}

async function marcarTokensMuertos(tid, tokenDocIds) {
  const batch = db.batch();
  tokenDocIds.forEach(id => batch.update(tokensColRef(tid).doc(id), {
    activo: false, desactivadoAt: FieldValue.serverTimestamp(),
  }));
  try { await batch.commit(); } catch (_) {}
}

/* Procesa un tenant: busca packs a punto de vencer y envía push.
   Devuelve estadísticas para el log. */
async function procesarTenant(tid) {
  const stats = { tenant: tid, usuariosConPack: 0, packsAvisados: 0, errores: 0 };
  const now = Date.now();
  const minMs = now + DIAS_ANTES_MIN * 86400 * 1000;
  const maxMs = now + (DIAS_ANTES_MAX + 1) * 86400 * 1000; // inclusivo hasta 4to día 00:00

  const usersSnap = await usersColRef(tid)
    .where('packsActivos', '!=', null)
    .get()
    .catch(() => null);

  if (!usersSnap || usersSnap.empty) return stats;

  for (const uDoc of usersSnap.docs) {
    const data = uDoc.data() || {};
    const packs = Array.isArray(data.packsActivos) ? data.packsActivos : [];
    if (!packs.length) continue;
    stats.usuariosConPack += 1;

    const nombreCliente = String(data.nombre || '').split(' ')[0] || 'hola';

    let cambios = false;
    const nuevosPacks = packs.map(p => {
      // Skip si ya se avisó
      if (p.avisoVencimientoAt) return p;
      // Skip si vencido o sin fecha
      const vencMs = p.fechaVencimiento?.toMillis?.() ?? 0;
      if (!vencMs) return p;
      // Skip si fuera de la ventana [+2, +3.99] días
      if (vencMs < minMs || vencMs >= maxMs) return p;
      // Skip si ya no tiene saldo
      const rest = Number(p.sesionesRestantes || 0);
      if (rest <= 0) return p;

      // Está en ventana → enviar push (async lo dispararemos abajo,
      // marcamos flag ahora para atomicidad).
      cambios = true;
      stats.packsAvisados += 1;
      return { ...p, avisoVencimientoAt: FieldValue.serverTimestamp(), _requiereEnvio: {
        nombre: p.nombrePack || 'Pack',
        rest,
        vencMs,
      } };
    });

    if (!cambios) continue;

    // Enviar push por cada pack que entró en ventana
    const pendientes = nuevosPacks.filter(p => p._requiereEnvio);
    const tokens = await tokensDeCliente(tid, uDoc.id);
    if (tokens.length) {
      for (const p of pendientes) {
        const dias = Math.max(0, Math.ceil((p._requiereEnvio.vencMs - now) / 86400000));
        const cuando = dias <= 1 ? 'mañana' : `en ${dias} días`;
        const message = {
          notification: {
            title: `Tu ${p._requiereEnvio.nombre} vence ${cuando}`,
            body: `Te quedan ${p._requiereEnvio.rest} ${p._requiereEnvio.rest === 1 ? 'sesión' : 'sesiones'}. Reserva ahora para no perderlas.`,
          },
          data: {
            tipo: 'pack-vencimiento',
            packId: p.packId || '',
            tenant: tid,
          },
          tokens: tokens.map(t => t.token),
        };
        try {
          const resp = await messaging.sendEachForMulticast(message);
          // Recolectar tokens muertos para autodesactivarlos
          const muertos = [];
          resp.responses.forEach((r, i) => {
            if (!r.success && (r.error?.code === 'messaging/registration-token-not-registered' ||
                               r.error?.code === 'messaging/invalid-registration-token')) {
              muertos.push(tokens[i].docId);
            }
          });
          if (muertos.length) await marcarTokensMuertos(tid, muertos);
        } catch (e) {
          logger.warn(`[pack-aviso] push falló ${tid}/${uDoc.id}:`, e.message);
          stats.errores += 1;
        }
      }
    }

    // Limpiar el flag de envío antes de persistir (no queremos guardarlo)
    const persistir = nuevosPacks.map(p => {
      if (!p._requiereEnvio) return p;
      const { _requiereEnvio, ...rest } = p;
      return rest;
    });

    await uDoc.ref.update({
      packsActivos: persistir,
      updatedAt: FieldValue.serverTimestamp(),
    }).catch(e => {
      logger.warn(`[pack-aviso] update user falló ${tid}/${uDoc.id}:`, e.message);
      stats.errores += 1;
    });
  }

  return stats;
}

/* ═══════════════════════════════════════════════════════════════
 *  CRON — 10:00 CLT diario. Chile es UTC-4 (verano) / UTC-3 (invierno).
 *  Usamos 13:00 UTC como punto medio para no despertar al cliente en
 *  la madrugada ni tan tarde en el día.
 * ═══════════════════════════════════════════════════════════════ */
exports.avisarVencimientoPack = onSchedule({
  schedule: '0 13 * * *',
  timeZone: 'UTC',
  region:   'us-central1',
  timeoutSeconds: 540,
  memory:  '512MiB',
}, async () => {
  const t0 = Date.now();
  const resultados = [];
  for (const tid of TENANTS_CON_PACKS) {
    try {
      const s = await procesarTenant(tid);
      resultados.push(s);
    } catch (e) {
      logger.error(`[pack-aviso] ${tid} error:`, e.message);
      resultados.push({ tenant: tid, errorFatal: e.message });
    }
  }
  const dt = Date.now() - t0;
  const totalAvisados = resultados.reduce((s, r) => s + (r.packsAvisados || 0), 0);
  logger.info(`[pack-aviso] hecho en ${dt}ms · ${totalAvisados} avisos enviados`, { resultados });
});
