'use strict';

// functions/ops-plataforma.js
// ─────────────────────────────────────────────────────────────────────────────
//  CONSOLIDACIÓN admin → ops (fase 1): las bandejas operativas que vivían en el
//  portal /admin y que la auditoría de ops marcó como huecos —soporte, errores,
//  leads inbound— ahora se sirven a ops con un callable agregado.
//
//  Por qué un callable y no leer Firestore directo (como hace /admin):
//    · /admin lee soporte con un objeto TENANTS hardcodeado de 14 locales — se
//      queda corto con cada tenant nuevo. Acá se usa collectionGroup con Admin
//      SDK, que los ve TODOS sin lista que mantener.
//    · sin exponer índices ni depender de reglas del cliente.
//
//  Onboarding (tenants nuevos), activar plan y extender trial NO se duplican:
//  ops llama directo a los callables que ya existen (adminListarTenants,
//  adminActivarPlanTenant, adminExtenderTrial). Esto solo cubre lo que no tenía
//  callable propio. Gate esOperadorReq: es operación, no la plata (esa vive en
//  💹 Crecimiento con candado bootstrap).
// ─────────────────────────────────────────────────────────────────────────────

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger }             = require('firebase-functions');
const admin                  = require('firebase-admin');
const { FieldValue }         = require('firebase-admin/firestore');

const { esOperadorReq } = require('./lib/operadores');

const db = admin.firestore();
const millis = (v) => (v && typeof v.toMillis === 'function' ? v.toMillis() : (v && v.seconds ? v.seconds * 1000 : null));

/** Mapa tid → nombre legible, para etiquetar soporte/errores sin N lecturas. */
async function nombresDeTenants() {
  const map = { elegance: 'Elegance Barbershop' };
  try {
    const refs = await db.collection('tenants').listDocuments();
    await Promise.all(refs.map(async (r) => {
      const v = (await r.get()).data() || {};
      map[r.id] = v.nombre || v.nombreFantasia || r.id;
    }));
  } catch (e) { logger.warn('[ops-plataforma] nombres:', e.message); }
  return map;
}

/** tid dueño de un doc de soporte, leyendo su path. Raíz = elegance (legacy). */
function tidDeSoporte(ref) {
  // tenants/{tid}/soporte_mensajes/{id}  →  parent.parent.id ; raíz → elegance
  const p = ref.parent.parent;
  return p ? p.id : 'elegance';
}

exports.opsPlataforma = onCall({ region: 'us-central1', cors: true, memory: '512MiB', timeoutSeconds: 120 }, async (req) => {
  if (!req.auth || !esOperadorReq(req)) {
    throw new HttpsError('permission-denied', 'Solo el operador de la plataforma.');
  }

  const [soporteSnap, erroresSnap, leadsSnap, nombres] = await Promise.all([
    // collectionGroup ve la raíz (elegance) y todas las subcolecciones.
    db.collectionGroup('soporte_mensajes').limit(200).get().catch((e) => { logger.warn('[ops-plataforma] soporte:', e.message); return { docs: [] }; }),
    db.collection('system_errors').where('status', '==', 'open').limit(200).get().catch(() => ({ docs: [] })),
    db.collection('_synaptechLeads').orderBy('createdAt', 'desc').limit(40).get().catch(() => ({ docs: [] })),
    nombresDeTenants(),
  ]);

  const soporte = soporteSnap.docs.map((d) => {
    const v = d.data() || {};
    const tid = tidDeSoporte(d.ref);
    return {
      id: d.id, tenantId: tid, tenantNombre: nombres[tid] || tid,
      tipo: v.tipo || 'otro', mensaje: String(v.mensaje || '').slice(0, 600),
      leido: v.leido === true, creadoEn: millis(v.creadoEn),
    };
  }).sort((a, b) => (b.creadoEn || 0) - (a.creadoEn || 0));

  const errores = erroresSnap.docs.map((d) => {
    const v = d.data() || {};
    return {
      id: d.id, tenantId: v.tenantId || null, source: v.source || 'static',
      url: String(v.url || ''), message: String(v.message || '').slice(0, 300),
      timestamp: millis(v.timestamp),
    };
  }).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  const leads = leadsSnap.docs.map((d) => {
    const v = d.data() || {};
    return {
      id: d.id, name: v.name || '', barberia: v.barberia || '', phone: String(v.phone || ''),
      source: v.source || '', status: v.status || 'new', createdAt: millis(v.createdAt),
    };
  });

  return {
    ok: true,
    soporte, errores, leads,
    contadores: {
      soporteSinLeer: soporte.filter((m) => !m.leido).length,
      erroresAbiertos: errores.length,
      leadsNuevos: leads.filter((l) => l.status === 'new').length,
    },
  };
});

exports.opsPlataformaAccion = onCall({ region: 'us-central1', cors: true }, async (req) => {
  if (!req.auth || !esOperadorReq(req)) {
    throw new HttpsError('permission-denied', 'Solo el operador de la plataforma.');
  }
  const accion = String(req.data?.accion || '');

  if (accion === 'soporteLeido') {
    const tid = String(req.data?.tenantId || 'elegance');
    const docId = String(req.data?.docId || '');
    if (!docId) throw new HttpsError('invalid-argument', 'Falta docId.');
    const ref = tid === 'elegance'
      ? db.doc(`soporte_mensajes/${docId}`)
      : db.doc(`tenants/${tid}/soporte_mensajes/${docId}`);
    await ref.set({ leido: true }, { merge: true });
    return { ok: true };
  }

  if (accion === 'errorResuelto') {
    const docId = String(req.data?.docId || '');
    if (!docId) throw new HttpsError('invalid-argument', 'Falta docId.');
    await db.doc(`system_errors/${docId}`).set({ status: 'resolved', resueltoEn: FieldValue.serverTimestamp() }, { merge: true });
    return { ok: true };
  }

  if (accion === 'leadEstado') {
    const docId = String(req.data?.docId || '');
    const estado = String(req.data?.estado || '');
    if (!docId || !['new', 'contactado', 'convertido', 'descartado'].includes(estado)) {
      throw new HttpsError('invalid-argument', 'Falta docId o estado inválido.');
    }
    await db.doc(`_synaptechLeads/${docId}`).set({ status: estado, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return { ok: true };
  }

  throw new HttpsError('invalid-argument', `Acción desconocida: "${accion}".`);
});
