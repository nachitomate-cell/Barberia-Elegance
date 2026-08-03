'use strict';

// functions/lib/push-staff.js
// ─────────────────────────────────────────────────────────────────
//  HELPERS COMPARTIDOS DE LOS PUSH AL STAFF (admins y barberos)
//
//  Resuelven los dos problemas que muerden siempre en estos envíos:
//    · FECHA: los crons de la tarde/noche (21:00, 22:00 Chile) ya son
//      "mañana" en UTC → toda fecha se calcula en America/Santiago.
//    · IDENTIDAD: las citas referencian el doc PRINCIPAL del barbero,
//      pero los tokens FCM se registran con el UID de Auth. El mapa
//      sigue los espejos (_mainDocId) y junta docId + uid + authUid.
//
//  Excluye siempre a los barberos QA fantasma (esQA).
// ─────────────────────────────────────────────────────────────────

const admin = require('firebase-admin');

const db = admin.firestore();

const TIMEZONE = 'America/Santiago';

const DIA_CL = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
});

/** Fecha de HOY en Santiago como 'YYYY-MM-DD' (formato de citas.fecha). */
const hoySantiago = () => DIA_CL.format(new Date());

/**
 * Todos los locales: elegance (raíz, legacy) + tenants/{id}. Enumerados con
 * listDocuments() — los docs padre tenants/{id} pueden no existir y
 * collection().get() los omitiría (regla del repo).
 */
async function listaTenants() {
  const refs = await db.collection('tenants').listDocuments();
  return [
    { id: 'elegance', root: '' },
    // Existe un doc tenants/elegance espurio: sin este filtro, elegance
    // se procesaría dos veces (raíz + tenants/) y duplicaría avisos.
    ...refs.filter(r => r.id !== 'elegance')
           .map(r => ({ id: r.id, root: `tenants/${r.id}/` })),
  ];
}

/** Root de colecciones de un tenant ('' para elegance legacy). */
const rootDe = tid => (tid === 'elegance' ? '' : `tenants/${tid}/`);

/** Minutos transcurridos desde medianoche, hora Santiago. */
function minutosAhoraSantiago() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const h = Number(parts.find(p => p.type === 'hour')?.value || 0);
  const m = Number(parts.find(p => p.type === 'minute')?.value || 0);
  return h * 60 + m;
}

/**
 * Mapa de barberos PRINCIPALES del tenant:
 *   mainDocId → { nombre, rol, uids:Set<string> }
 * `uids` junta docId + uid + authUid + ids de sus doc-espejo, que es
 * contra lo que se cruzan los fcm_tokens. Excluye QA fantasma.
 */
async function mapaBarberos(root) {
  const snap = await db.collection(`${root}barberos`).get();
  const mapa = new Map();
  snap.forEach(d => {
    const x = d.data();
    if (x._mainDocId || x.esQA) return;
    const uids = new Set([d.id]);
    if (x.uid) uids.add(x.uid);
    if (x.authUid) uids.add(x.authUid);
    mapa.set(d.id, { nombre: x.nombre || '', rol: x.rol || 'barbero', uids });
  });
  snap.forEach(d => {
    const x = d.data();
    if (!x._mainDocId) return;
    const m = mapa.get(x._mainDocId);
    if (m) m.uids.add(d.id);
  });
  return mapa;
}

/** Tokens FCM activos del tenant, agrupados por uid: Map<uid, string[]>. */
async function tokensActivos(root) {
  const snap = await db.collection(`${root}fcm_tokens`).where('activo', '==', true).get();
  const porUid = new Map();
  snap.forEach(d => {
    const t = d.data();
    if (!t.token || !t.uid) return;
    if (!porUid.has(t.uid)) porUid.set(t.uid, []);
    porUid.get(t.uid).push(t.token);
  });
  return porUid;
}

/** Tokens de un barbero del mapa (unión de todos sus uids, sin duplicar). */
function tokensDeBarbero(entry, porUid) {
  const out = new Set();
  entry.uids.forEach(uid => (porUid.get(uid) || []).forEach(t => out.add(t)));
  return [...out];
}

/** Tokens de los admins/jefes del tenant (opcionalmente excluyendo un uid). */
async function tokensAdmins(root, { excluirUid = null } = {}) {
  const [mapa, porUid] = await Promise.all([mapaBarberos(root), tokensActivos(root)]);
  const out = new Set();
  for (const entry of mapa.values()) {
    if (!['admin', 'jefe'].includes(entry.rol)) continue;
    if (excluirUid && entry.uids.has(excluirUid)) continue;
    tokensDeBarbero(entry, porUid).forEach(t => out.add(t));
  }
  return [...out];
}

/** Envío multicast con el shape webpush estándar del proyecto. */
async function enviarPushStaff({ tokens, title, body, link, tag }) {
  if (!tokens.length) return { successCount: 0, failureCount: 0 };
  return admin.messaging().sendEachForMulticast({
    tokens,
    notification: { title, body },
    data: { url: link },
    webpush: {
      headers: { Urgency: 'high' },
      notification: {
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag,
        renotify: true,
        vibrate: [200, 100, 200],
      },
      fcmOptions: { link },
    },
  });
}

module.exports = {
  TIMEZONE,
  hoySantiago,
  listaTenants,
  rootDe,
  minutosAhoraSantiago,
  mapaBarberos,
  tokensActivos,
  tokensDeBarbero,
  tokensAdmins,
  enviarPushStaff,
};
