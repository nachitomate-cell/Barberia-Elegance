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
const { esOperador } = require("./lib/operadores");
const { logger }             = require('firebase-functions');
const admin                  = require('firebase-admin');
const { FieldValue }         = require('firebase-admin/firestore');

const db = admin.firestore();

const BOOTSTRAP_EMAILS = ['ignaciiio.mate@gmail.com'];

// Colecciones que delatan a un tenant con contenido real. Si no tiene ninguna,
// probablemente es un fantasma: un id que quedó de una prueba o de un rename.
const SEÑALES = ['servicios', 'citas', 'barberos', 'clientes'];

exports.adminListarTenants = onCall({ region: 'us-central1', cors: true }, async (req) => {
  const email = String(req.auth?.token?.email || '').toLowerCase();
  if (!req.auth || !esOperador(email)) {
    throw new HttpsError('permission-denied', 'Solo el operador de la plataforma.');
  }

  // listDocuments, NO collection().get(): esa es exactamente la trampa que
  // dejaba fuera a casi todos (ya mordió en ops, confirmaciones, salud y claims).
  const refs = await db.collection('tenants').listDocuments();
  const ids  = new Set(refs.map((r) => r.id));
  ids.add('elegance');                       // vive en las colecciones raíz

  const out = await Promise.all([...ids].map(async (id) => {
    const [tdSnap, sysSnap, billSnap] = await Promise.all([
      db.doc(`tenants/${id}`).get().catch(() => null),
      db.doc(`_system/${id}`).get().catch(() => null),
      db.doc(`_billing/${id}`).get().catch(() => null),
    ]);
    const td   = tdSnap?.data()   || {};
    const sys  = sysSnap?.data()  || {};
    const bill = billSnap?.data() || {};

    // ¿Tiene contenido? Una lectura de 1 doc por colección: barato y suficiente
    // para distinguir un local real de un id que quedó dando vueltas.
    let contenido = false;
    for (const col of SEÑALES) {
      const base = id === 'elegance' ? col : `tenants/${id}/${col}`;
      const s = await db.collection(base).limit(1).get().catch(() => null);
      if (s && !s.empty) { contenido = true; break; }
    }

    // Campos self-service para el panel "Tenants nuevos": permiten filtrar
    // por vendedor, ver días restantes de trial y estado de pago.
    const createdAtMs    = td.createdAt?.toMillis?.() ?? null;
    const trialFinalMs   = td.trialFinaliza?.toMillis?.() ?? null;
    const diasParaVencer = trialFinalMs != null ? Math.ceil((trialFinalMs - Date.now()) / 86400000) : null;
    const diasDesdeAlta  = createdAtMs != null   ? Math.floor((Date.now() - createdAtMs) / 86400000) : null;

    return {
      id,
      nombre:       td.nombre || td.nombreCorto || null,
      operativo:    sys.operativo !== false,
      status:       td.status || sys.status || 'active',   // el status comercial lo manda el tenant doc
      waPlan:       sys.waPlan ?? (sys.waAsistente === true ? 'full' : null),
      conContenido: contenido,
      // Self-service metadata
      origen:       td.origen || null,
      refVendedor:  td.refVendedor || null,
      contacto: td.contacto ? {
        nombre:   td.contacto.nombre || null,
        email:    td.contacto.email  || td.ownerEmail || null,
        whatsapp: td.contacto.whatsapp || td.telefono || null,
      } : null,
      tipo:            td.tipo || null,
      plan:            bill.plan || td.plan || null,
      estadoPago:      bill.estadoPago || null,
      montoPendiente:  bill.montoPendiente || null,
      suscripcionMp:   bill.suscripcionMp ? {
        status:          bill.suscripcionMp.status || null,
        nextPaymentDate: bill.suscripcionMp.nextPaymentDate || null,
      } : null,
      createdAtMs,
      trialFinalizaMs: trialFinalMs,
      diasParaVencer,
      diasDesdeAlta,
      atribucion:      td.atribucion || null,
      utmSource:       bill.utmSource || null,
    };
  }));

  out.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));  // más recientes primero
  logger.info(`[adminListarTenants] ${out.length} tenants (${out.filter(t => t.conContenido).length} con contenido)`);
  return { tenants: out, total: out.length };
});

// ─────────────────────────────────────────────────────────────────
//  Acciones sobre tenants self-service desde el panel superadmin.
//  Solo bootstrap admin. Nada bloqueante: si algo falla, se reintenta
//  desde el UI.
// ─────────────────────────────────────────────────────────────────

// Aceptamos los 4 planes públicos + aliases legacy (individual→basico, local→pro).
const PRECIOS_NETOS = {
  basico:     25126,
  pro:        41933,
  full:       58739,   // ≈ $69.900 público — IA en WA+IG + Reactivación
  anual:     335294,
  // aliases legacy
  individual: 25126,
  local:      41933,
};
const NORMALIZAR_PLAN = { individual: 'basico', local: 'pro' };

exports.adminActivarPlanTenant = onCall({ region: 'us-central1', cors: true }, async (req) => {
  const email = String(req.auth?.token?.email || '').toLowerCase();
  if (!req.auth || !esOperador(email)) {
    throw new HttpsError('permission-denied', 'Solo el operador de la plataforma.');
  }
  const tid    = String(req.data?.tenantId || '').trim();
  let plan     = String(req.data?.plan || '').trim().toLowerCase();
  plan         = NORMALIZAR_PLAN[plan] || plan;
  if (!tid)                          throw new HttpsError('invalid-argument', 'Falta tenantId.');
  if (!PRECIOS_NETOS[plan])          throw new HttpsError('invalid-argument', 'Plan inválido (basico|pro|full|anual).');

  const esAnual = plan === 'anual';
  const patchTenant = {
    status: 'active', plan, trialFinaliza: null,
    activadoEn: FieldValue.serverTimestamp(), activadoPor: email,
    updatedAt:  FieldValue.serverTimestamp(),
  };
  const patchBilling = {
    estadoPago:     'al_dia',
    plan,
    montoPendiente: PRECIOS_NETOS[plan],
    activadoManualEn: FieldValue.serverTimestamp(),
    activadoManualPor: email,
  };
  if (esAnual) {
    patchBilling.planTipo = 'anual';
    patchBilling.fechaVencimientoAnual = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);
  }

  const batch = db.batch();
  batch.set(db.doc(`tenants/${tid}`), patchTenant, { merge: true });
  batch.set(db.doc(`_billing/${tid}`), patchBilling, { merge: true });
  batch.set(db.doc(`_system/${tid}`), {
    status: 'active', plan, activadoEn: FieldValue.serverTimestamp(),
  }, { merge: true });
  await batch.commit();

  logger.info(`[admin] tenant ${tid} activado manualmente plan=${plan} por ${email}`);
  return { ok: true };
});

exports.adminExtenderTrial = onCall({ region: 'us-central1', cors: true }, async (req) => {
  const email = String(req.auth?.token?.email || '').toLowerCase();
  if (!req.auth || !esOperador(email)) {
    throw new HttpsError('permission-denied', 'Solo el operador de la plataforma.');
  }
  const tid  = String(req.data?.tenantId || '').trim();
  const dias = Math.max(1, Math.min(90, Number(req.data?.dias) || 7));
  if (!tid) throw new HttpsError('invalid-argument', 'Falta tenantId.');

  const nuevoFin = admin.firestore.Timestamp.fromMillis(Date.now() + dias * 86400000);
  await db.doc(`tenants/${tid}`).set({
    status: 'trial', trialFinaliza: nuevoFin,
    trialExtendidoEn: FieldValue.serverTimestamp(), trialExtendidoPor: email,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  await db.doc(`_billing/${tid}`).set({
    estadoPago: 'trial', trialFinaliza: nuevoFin,
  }, { merge: true });

  logger.info(`[admin] trial extendido ${tid} +${dias}d por ${email}`);
  return { ok: true, trialFinalizaMs: nuevoFin.toMillis() };
});
