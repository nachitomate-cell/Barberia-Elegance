'use strict';

// functions/admin-listar-tenants.js
// ─────────────────────────────────────────────────────────────────────────────
//  LISTA AUTORITATIVA DE TENANTS para /admin
//
//  El problema que resuelve: **el navegador no puede enumerar los tenants**.
//  `collection('tenants').get()` devuelve solo 4 de 33, porque la mayoría de
//  los docs padre `tenants/{id}` no existen — el tenant vive en sus
//  subcolecciones. Enumerar de verdad exige `listDocuments()`, que es Admin
//  SDK y por lo tanto solo corre acá.
//
//  Sin esto, /admin tenía que sacar la lista de `config.js` (una lista escrita
//  a mano) más un objeto TENANTS hardcodeado en el propio HTML. O sea: crear
//  un tenant y NO tocar esos archivos lo dejaba invisible para el superadmin,
//  aunque estuviera operando con citas reales. Eso ya pasó — al menos 3
//  tenants existen en Firestore y no están en config.js.
//
//  Regla: la fuente de verdad de QUÉ tenants existen es Firestore. config.js
//  sigue mandando en el ESTILO (color, logo, labels de cada marca), que es una
//  allowlist deliberada y no una lista espejo.
// ─────────────────────────────────────────────────────────────────────────────

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger }             = require('firebase-functions');
const admin                  = require('firebase-admin');

const db = admin.firestore();

const BOOTSTRAP_EMAILS = ['ignaciiio.mate@gmail.com'];

// Colecciones que delatan a un tenant con contenido real. Si no tiene ninguna,
// probablemente es un fantasma: un id que quedó de una prueba o de un rename.
const SEÑALES = ['servicios', 'citas', 'barberos', 'clientes'];

exports.adminListarTenants = onCall({ region: 'us-central1', cors: true }, async (req) => {
  const email = String(req.auth?.token?.email || '').toLowerCase();
  if (!req.auth || !BOOTSTRAP_EMAILS.includes(email)) {
    throw new HttpsError('permission-denied', 'Solo el operador de la plataforma.');
  }

  // listDocuments, NO collection().get(): esa es exactamente la trampa que
  // dejaba fuera a casi todos (ya mordió en ops, confirmaciones, salud y claims).
  const refs = await db.collection('tenants').listDocuments();
  const ids  = new Set(refs.map((r) => r.id));
  ids.add('elegance');                       // vive en las colecciones raíz

  const out = await Promise.all([...ids].map(async (id) => {
    const [tdSnap, sysSnap] = await Promise.all([
      db.doc(`tenants/${id}`).get().catch(() => null),
      db.doc(`_system/${id}`).get().catch(() => null),
    ]);
    const td  = tdSnap?.data()  || {};
    const sys = sysSnap?.data() || {};

    // ¿Tiene contenido? Una lectura de 1 doc por colección: barato y suficiente
    // para distinguir un local real de un id que quedó dando vueltas.
    let contenido = false;
    for (const col of SEÑALES) {
      const base = id === 'elegance' ? col : `tenants/${id}/${col}`;
      const s = await db.collection(base).limit(1).get().catch(() => null);
      if (s && !s.empty) { contenido = true; break; }
    }

    return {
      id,
      nombre:      td.nombre || td.nombreCorto || null,
      operativo:   sys.operativo !== false,
      status:      sys.status || 'active',
      waPlan:      sys.waPlan ?? (sys.waAsistente === true ? 'full' : null),
      conContenido: contenido,
    };
  }));

  out.sort((a, b) => a.id.localeCompare(b.id, 'es'));
  logger.info(`[adminListarTenants] ${out.length} tenants (${out.filter(t => t.conContenido).length} con contenido)`);
  return { tenants: out, total: out.length };
});
