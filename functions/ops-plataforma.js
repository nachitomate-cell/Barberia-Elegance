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

const { esOperadorReq, esBootstrapReq } = require('./lib/operadores');

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

/* ── Drawer de gestión por tenant (fase 2, bloque A) ──────────────────────── */

/** Detalle de UN local para el drawer: identidad, control y stats livianos. */
exports.opsTenantDetalle = onCall({ region: 'us-central1', cors: true, memory: '512MiB', timeoutSeconds: 60 }, async (req) => {
  if (!req.auth || !esOperadorReq(req)) {
    throw new HttpsError('permission-denied', 'Solo el operador de la plataforma.');
  }
  const tid = String(req.data?.tid || '').trim();
  if (!tid) throw new HttpsError('invalid-argument', 'Falta tid.');

  const [tdSnap, sysSnap, billSnap] = await Promise.all([
    db.doc(`tenants/${tid}`).get().catch(() => null),
    db.doc(`_system/${tid}`).get().catch(() => null),
    db.doc(`_billing/${tid}`).get().catch(() => null),
  ]);
  const td = tdSnap?.data() || {}, sys = sysSnap?.data() || {}, bill = billSnap?.data() || {};

  // Barberos reales (sin espejos): un conteo barato del equipo.
  const base = tid === 'elegance' ? 'barberos' : `tenants/${tid}/barberos`;
  const barbSnap = await db.collection(base).get().catch(() => ({ docs: [] }));
  const barberos = barbSnap.docs.map((d) => d.data() || {}).filter((b) => !b._mainDocId && b.esQA !== true);

  return {
    ok: true,
    tid,
    nombre: td.nombre || td.nombreCorto || tid,
    instagram: td.instagram || null,
    telefono: (td.contacto && td.contacto.whatsapp) || td.telefono || null,
    emailDueno: (td.contacto && td.contacto.email) || td.ownerEmail || bill.emailCobro || null,
    control: {
      operativo: sys.operativo !== false && sys.status !== 'suspended',
      estadoComercial: sys.estadoComercial || null,
      notas: sys.adminNotas || '',
      proximoContacto: sys.proximoContacto || '',
    },
    plan: {
      plan: bill.plan || td.plan || null,
      estadoPago: bill.estadoPago || null,
      status: td.status || sys.status || 'active',
      autopay: (bill.suscripcionMp && bill.suscripcionMp.status) || null,
      walletActivo: bill.walletActivo === true,
    },
    stats: {
      barberos: barberos.length,
      clienteDelClub: sys.clientesClub || null,
    },
  };
});

exports.opsPlataformaAccion = onCall({ region: 'us-central1', cors: true }, async (req) => {
  if (!req.auth || !esOperadorReq(req)) {
    throw new HttpsError('permission-denied', 'Solo el operador de la plataforma.');
  }
  const accion = String(req.data?.accion || '');

  /* Kill switch: enciende/apaga el local (mismo campo que /admin y el edge). */
  if (accion === 'killSwitch') {
    const tid = String(req.data?.tid || '').trim();
    const operativo = req.data?.operativo !== false;
    if (!tid) throw new HttpsError('invalid-argument', 'Falta tid.');
    await db.doc(`_system/${tid}`).set({
      operativo, status: operativo ? 'active' : 'suspended',
      operativoCambiadoEn: FieldValue.serverTimestamp(),
      operativoCambiadoPor: String(req.auth.token?.email || ''),
    }, { merge: true });
    return { ok: true, operativo };
  }

  /* Estado comercial: dónde va la venta (propuesta→activo_100→atrasado). */
  if (accion === 'estadoComercial') {
    const tid = String(req.data?.tid || '').trim();
    const estado = String(req.data?.estado || '');
    const VALIDOS = ['propuesta', 'visita', 'prueba', 'activo_100', 'atrasado'];
    if (!tid || !VALIDOS.includes(estado)) throw new HttpsError('invalid-argument', 'tid o estado inválido.');
    await db.doc(`_system/${tid}`).set({ estadoComercial: estado, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return { ok: true };
  }

  /* CRM: notas de seguimiento + próximo contacto del local. */
  if (accion === 'crmGuardar') {
    const tid = String(req.data?.tid || '').trim();
    if (!tid) throw new HttpsError('invalid-argument', 'Falta tid.');
    await db.doc(`_system/${tid}`).set({
      adminNotas: String(req.data?.notas || '').slice(0, 2000),
      proximoContacto: String(req.data?.proximo || '').slice(0, 20),
      crmActualizadoEn: FieldValue.serverTimestamp(),
    }, { merge: true });
    return { ok: true };
  }

  /* Plan WhatsApp (entitlement premium): null lo apaga. */
  if (accion === 'waPlan') {
    const tid = String(req.data?.tid || '').trim();
    const plan = req.data?.plan || null;
    if (!tid) throw new HttpsError('invalid-argument', 'Falta tid.');
    if (plan !== null && !['recordatorios', 'bot', 'full'].includes(plan)) {
      throw new HttpsError('invalid-argument', 'Plan WA inválido.');
    }
    await db.doc(`_system/${tid}`).set({
      waPlan: plan, waAsistente: plan === 'full' || plan === 'bot',
      waPlanCambiadoEn: FieldValue.serverTimestamp(),
    }, { merge: true });
    return { ok: true };
  }


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

/* ── QA Fantasma (fase 2, bloque F) — lee el estado; la escritura reusa
   el callable sincronizarQaFantasma que ya existe. */

exports.opsQaFantasma = onCall({ region: 'us-central1', cors: true, timeoutSeconds: 60 }, async (req) => {
  if (!req.auth || !esOperadorReq(req)) {
    throw new HttpsError('permission-denied', 'Solo el operador de la plataforma.');
  }
  const maestro = (await db.doc('_superadmin/qaBarbero').get().catch(() => null))?.data() || {};
  let enTenants = null;
  try {
    const g = await db.collectionGroup('barberos').where('esQA', '==', true).get();
    enTenants = g.size;
  } catch (_) { /* collectionGroup puede pedir índice; no es crítico */ }
  return {
    ok: true,
    activo: maestro.activo === true,
    nombre: maestro.nombre || 'QA Barbero Hub',
    horario: maestro.horario || null,
    enTenants,
  };
});

/* ── Eliminar tenant (fase 2, bloque E) — DESTRUCTIVO, CANDADO BOOTSTRAP ───────
   Borra el local entero: sus subcolecciones (recursiveDelete), su doc, y sus
   docs raíz _system/_billing. Exige la frase exacta "ELIMINAR {tid}" para que
   no se dispare por un clic. elegance no se puede borrar (es el legacy raíz). */

exports.opsTenantEliminar = onCall({ region: 'us-central1', cors: true, memory: '512MiB', timeoutSeconds: 300 }, async (req) => {
  if (!req.auth || !esBootstrapReq(req)) {
    throw new HttpsError('permission-denied', 'Solo Ignacio puede eliminar un local.');
  }
  const tid = String(req.data?.tid || '').trim();
  const frase = String(req.data?.frase || '').trim();
  if (!tid) throw new HttpsError('invalid-argument', 'Falta tid.');
  if (tid === 'elegance') throw new HttpsError('failed-precondition', 'elegance no se puede eliminar (es el legacy raíz).');
  if (frase !== `ELIMINAR ${tid}`) {
    throw new HttpsError('failed-precondition', `Para confirmar, escribe exactamente: ELIMINAR ${tid}`);
  }

  // recursiveDelete arrastra todas las subcolecciones del tenant en una pasada.
  await admin.firestore().recursiveDelete(db.doc(`tenants/${tid}`)).catch((e) => {
    logger.error(`[ops-plataforma] recursiveDelete ${tid}:`, e.message);
    throw new HttpsError('internal', 'No se pudo borrar el árbol del tenant: ' + e.message);
  });
  await Promise.all([
    db.doc(`_system/${tid}`).delete().catch(() => {}),
    db.doc(`_billing/${tid}`).delete().catch(() => {}),
    db.doc(`_system/instagram_${tid}`).delete().catch(() => {}),
  ]);
  logger.warn(`[ops-plataforma] TENANT ELIMINADO: ${tid} por ${req.auth.token?.email}`);
  return { ok: true, tid };
});

/* ── Estado WhatsApp del tenant (fase 2, bloque D) ────────────────────────────
   El estado + el plan (entitlement). Los controles finos de chips/bolsas
   (anti-bloqueo, sesiones de clientes reales) siguen en /admin, mejor
   supervisados: acá se ofrece el enlace directo. */

exports.opsTenantWa = onCall({ region: 'us-central1', cors: true, timeoutSeconds: 60 }, async (req) => {
  if (!req.auth || !esOperadorReq(req)) {
    throw new HttpsError('permission-denied', 'Solo el operador de la plataforma.');
  }
  const tid = String(req.data?.tid || '').trim();
  if (!tid) throw new HttpsError('invalid-argument', 'Falta tid.');
  const [sysSnap, cfgSnap] = await Promise.all([
    db.doc(`_system/${tid}`).get().catch(() => null),
    db.doc(tid === 'elegance' ? 'configuracion/whatsapp' : `tenants/${tid}/configuracion/whatsapp`).get().catch(() => null),
  ]);
  const sys = sysSnap?.data() || {}, cfg = cfgSnap?.data() || {};
  const PLANES = ['recordatorios', 'bot', 'full'];
  const waPlan = PLANES.includes(sys.waPlan) ? sys.waPlan : (sys.waAsistente === true ? 'full' : null);
  return {
    ok: true, tid,
    waPlan,
    chipVinculado: sys.waPlataformaChip || null,
    maxConversaciones: sys.botMaxConversaciones || null,
    estadoConexion: cfg.estadoConexion || null,
    numero: cfg.numero || cfg.wa_number || null,
    botEnabled: cfg.botEnabled !== false,
    confirmacionesEnabled: cfg.confirmacionesEnabled === true,
  };
});

/* ── Staff del tenant (fase 2, bloque C) ──────────────────────────────────── */

exports.opsTenantStaff = onCall({ region: 'us-central1', cors: true, memory: '512MiB', timeoutSeconds: 60 }, async (req) => {
  if (!req.auth || !esOperadorReq(req)) {
    throw new HttpsError('permission-denied', 'Solo el operador de la plataforma.');
  }
  const tid = String(req.data?.tid || '').trim();
  if (!tid) throw new HttpsError('invalid-argument', 'Falta tid.');
  const base = tid === 'elegance' ? 'barberos' : `tenants/${tid}/barberos`;
  const snap = await db.collection(base).get().catch(() => ({ docs: [] }));
  // Dedupe: los espejos por sucursal tienen _mainDocId; el QA fantasma se oculta.
  const vistos = new Set();
  const staff = [];
  for (const d of snap.docs) {
    const v = d.data() || {};
    if (v._mainDocId || v.esQA === true) continue;
    const key = v.authUid || v.email || d.id;
    if (vistos.has(key)) continue;
    vistos.add(key);
    staff.push({
      id: d.id, uid: v.authUid || null,
      nombre: v.nombre || '', email: v.email || '',
      rol: v.rol || (v.esAdmin ? 'admin' : 'barbero'),
      atiende: v.atiende !== false,
    });
  }
  staff.sort((a, b) => String(a.nombre).localeCompare(String(b.nombre)));
  return { ok: true, tid, staff };
});

/* ── Facturación del tenant (fase 2, bloque B) — CANDADO BOOTSTRAP ─────────────
   Es la plata de un cliente real: solo Ignacio, igual que _billing en las
   rules y que el panel 💹 Crecimiento. El socio developer no la ve ni la toca. */

exports.opsTenantBilling = onCall({ region: 'us-central1', cors: true }, async (req) => {
  if (!req.auth || !esBootstrapReq(req)) {
    throw new HttpsError('permission-denied', 'Solo Ignacio ve la facturación.');
  }
  const tid = String(req.data?.tid || '').trim();
  if (!tid) throw new HttpsError('invalid-argument', 'Falta tid.');
  const b = (await db.doc(`_billing/${tid}`).get()).data() || {};
  const fpp = b.fechaProximoPago;
  return {
    ok: true, tid,
    plan: b.plan || '',
    estadoPago: b.estadoPago || 'al_dia',
    montoPendiente: Number(b.montoPendiente) || 0,
    mensajeAdmin: b.mensajeAdmin || '',
    fechaProximoPago: fpp ? (fpp.toDate ? fpp.toDate().toISOString().slice(0, 10) : String(fpp).slice(0, 10)) : '',
    cuotas: Array.isArray(b.cuotas) ? b.cuotas.map((c) => ({
      mes: c.mes, pagada: c.pagada === true, monto: Number(c.monto) || 0,
      fechaPago: c.fechaPago || null, medioPago: c.medioPago || null,
    })) : [],
    suscripcionMp: b.suscripcionMp ? {
      status: b.suscripcionMp.status || null,
      monto: b.suscripcionMp.monto || null,
      nextPaymentDate: b.suscripcionMp.nextPaymentDate || null,
      payerEmail: b.suscripcionMp.payerEmail || null,
      initPoint: b.suscripcionMp.status === 'link_creado' ? (b.suscripcionMp.initPoint || null) : null,
      ultimoPago: b.suscripcionMp.ultimoPago || null,
    } : null,
  };
});

exports.opsTenantBillingSet = onCall({ region: 'us-central1', cors: true }, async (req) => {
  if (!req.auth || !esBootstrapReq(req)) {
    throw new HttpsError('permission-denied', 'Solo Ignacio edita la facturación.');
  }
  const tid = String(req.data?.tid || '').trim();
  if (!tid) throw new HttpsError('invalid-argument', 'Falta tid.');
  const d = req.data || {};

  const ESTADOS = ['al_dia', 'pendiente', 'atrasado'];
  const estado = ESTADOS.includes(d.estadoPago) ? d.estadoPago : 'al_dia';
  // Las cuotas llegan editadas del front; se sanean acá (mes válido, monto ≥0).
  const cuotas = (Array.isArray(d.cuotas) ? d.cuotas : [])
    .filter((c) => /^\d{4}-\d{2}$/.test(String(c.mes || '')))
    .slice(0, 60)
    .map((c) => ({
      mes: String(c.mes),
      pagada: c.pagada === true,
      monto: Math.max(0, Math.round(Number(c.monto) || 0)),
      ...(c.pagada && c.fechaPago ? { fechaPago: String(c.fechaPago).slice(0, 10), medioPago: String(c.medioPago || 'Transferencia').slice(0, 40) } : {}),
    }));

  const payload = {
    plan: String(d.plan || '').slice(0, 200),
    cuotas, estadoPago: estado,
    montoPendiente: Math.max(0, Math.round(Number(d.montoPendiente) || 0)),
    mensajeAdmin: String(d.mensajeAdmin || '').slice(0, 500),
    updatedAt: FieldValue.serverTimestamp(),
  };
  const fecha = String(d.fechaProximoPago || '');
  if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) payload.fechaProximoPago = fecha;

  await db.doc(`_billing/${tid}`).set(payload, { merge: true });
  logger.info(`[ops-plataforma] billing ${tid} guardado por ${req.auth.token?.email}`);
  return { ok: true };
});
