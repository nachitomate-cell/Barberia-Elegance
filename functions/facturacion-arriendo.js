'use strict';

// functions/facturacion-arriendo.js
// ─────────────────────────────────────────────────────────────────
//  FACTURACIÓN — MODELO ARRIENDO DE SILLÓN (B2C, por tenant)
//
//  FASE 2 (esta): al COMPLETARSE una cita se emite automáticamente la
//  BOLETA AFECTA del LOCAL vía OpenFactura (Haulmer), cubriendo:
//    · la porción de "arriendo de sillón" del servicio (arriendoPct %)
//    · los productos vendidos en el ticket (ticketProductos)
//  La BHE del BARBERO (SimpleAPI terceros) se agrega en FASE 3 — aquí
//  la porción del barbero simplemente no se documenta todavía.
//
//  Modo 'empleados': se emite UNA afecta por el ticket completo
//  (servicio + productos) con el RUT del local — modelo tradicional.
//
//  Config:    configuracion/facturacion   (no sensible, editable en panel)
//  Secreto:   facturacion_secrets/{tid}    (CERRADO, solo Admin SDK)
//  Auditoría: facturacion_log              (solo lectura admin)
//
//  Idempotencia dura: un LOCK transaccional (facturacion.estado=
//  'procesando') evita la doble emisión — el trigger corre en CADA
//  write de la cita y un folio real no se puede deshacer salvo NC.
//
//  Exports:
//    facturacionArriendoElegance  — trigger /citas/{citaId}
//    facturacionArriendoTenant    — trigger /tenants/{tid}/citas/{citaId}
//    facturacionGuardarApiKey     — callable (admin) guarda apikey OpenFactura
//    facturacionTestAfecta        — callable (admin) emite afecta de prueba $1
//    facturacionReemitir          — callable (admin) reintenta una cita
//    facturacionObtenerPDF        — callable (admin) trae el PDF por token
//
//  DEPLOY:
//    firebase deploy --only functions:facturacionArriendoElegance,functions:facturacionArriendoTenant,functions:facturacionGuardarApiKey,functions:facturacionTestAfecta,functions:facturacionReemitir,functions:facturacionObtenerPDF
// ─────────────────────────────────────────────────────────────────

const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');

const db = () => admin.firestore();
const REGION = 'us-central1';
const BOOTSTRAP = ['ignaciiio.mate@gmail.com'];

// Hosts OpenFactura (Haulmer). Sandbox usa CAF simulado (no válido en SII).
const OF_HOSTS = {
  sandbox:    'https://dev-api.haulmer.com',
  produccion: 'https://api.haulmer.com',
};

// ── Colecciones según tenant (mismo patrón que referidos-recompensa) ──
function colecciones(tenantId) {
  const isE = tenantId === 'elegance';
  return {
    citas:     db().collection(isE ? 'citas'            : `tenants/${tenantId}/citas`),
    barberos:  db().collection(isE ? 'barberos'         : `tenants/${tenantId}/barberos`),
    servicios: db().collection(isE ? 'servicios'        : `tenants/${tenantId}/servicios`),
    log:       db().collection(isE ? 'facturacion_log'  : `tenants/${tenantId}/facturacion_log`),
    configRef: db().doc(isE ? 'configuracion/facturacion' : `tenants/${tenantId}/configuracion/facturacion`),
    // Secretos: SIEMPRE en root, keyed por tenant (igual que tenant_mp).
    secretRef: db().doc(`facturacion_secrets/${tenantId}`),
  };
}

// Fecha de emisión en horario de Chile (el runtime corre en UTC; una cita
// cerrada de noche en Chile no debe saltar al día siguiente en la boleta).
function hoyChileISO() {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

// ── Emisión de una BOLETA AFECTA (DTE 39) por OpenFactura ─────────
// items: [{ nombre, cantidad, montoBruto }]  (montoBruto = total línea, IVA incl.)
// Los precios de boleta van con IVA incluido; Totales.MntNeto se deriva.
async function emitirAfecta({ host, apiKey, emisor, items, receptor }) {
  const total = items.reduce((s, i) => s + (Number(i.montoBruto) || 0), 0);
  if (total <= 0) return { ok: false, error: 'total-cero' };

  const neto = Math.round(total / 1.19);
  const iva  = total - neto;

  const detalle = items.map((it, i) => {
    const qty = Number(it.cantidad) || 1;
    const bruto = Number(it.montoBruto) || 0;
    return {
      NroLinDet: i + 1,
      NmbItem:   String(it.nombre || 'Item').slice(0, 80),
      QtyItem:   qty,
      PrcItem:   Math.round(bruto / qty),
      MontoItem: bruto,
    };
  });

  const body = {
    response: ['FOLIO', 'TOKEN', 'URL'],
    dte: {
      Encabezado: {
        IdDoc: { TipoDTE: 39, Folio: 0, FchEmis: hoyChileISO(), IndServicio: '3' },
        Emisor: {
          RUTEmisor:    emisor.rut,
          RznSocEmisor: emisor.razonSocial,
          GiroEmisor:   emisor.giro || 'Servicios',
          ...(emisor.cdgSiiSucur ? { CdgSIISucur: String(emisor.cdgSiiSucur) } : {}),
          DirOrigen:    emisor.direccion || '',
          CmnaOrigen:   emisor.comuna || '',
        },
        Receptor: {
          RUTRecep: (receptor && receptor.rut) || '66666666-6',
          ...(receptor && receptor.razonSocial ? { RznSocRecep: receptor.razonSocial } : {}),
        },
        Totales: { MntNeto: neto, IVA: iva, MntTotal: total, TotalPeriodo: total, VlrPagar: total },
      },
      Detalle: detalle,
    },
  };

  let res, text;
  try {
    res = await fetch(`${host}/v2/dte/document`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: apiKey },
      body: JSON.stringify(body),
    });
    text = await res.text();
  } catch (e) {
    return { ok: false, error: `red: ${e.message}` };
  }

  let json; try { json = JSON.parse(text); } catch { json = { _raw: text }; }

  if (!res.ok || !json.FOLIO) {
    const err = (json.error && (json.error.message || JSON.stringify(json.error)))
             || json.message || json._raw || `HTTP ${res.status}`;
    return { ok: false, httpStatus: res.status, error: String(err), warning: json.WARNING || null };
  }

  return {
    ok: true,
    folio:   json.FOLIO,
    token:   json.TOKEN || null,
    url:     json.URL || null,
    warning: json.WARNING || null,
    neto, iva, total,
  };
}

// Emite una Nota de Crédito Electrónica (DTE 61) referenciando la boleta
// afecta original (DTE 39). CodRef: 1 = anula el documento referenciado.
// Usa el mismo host + apiKey + emisor que la boleta original.
async function emitirNC({ host, apiKey, emisor, folioOriginal, fechaOriginal, motivo, items }) {
  const total = items.reduce((s, i) => s + (Number(i.montoBruto) || 0), 0);
  if (total <= 0) return { ok: false, error: 'total-cero' };

  const neto = Math.round(total / 1.19);
  const iva  = total - neto;

  const detalle = items.map((it, i) => {
    const qty   = Number(it.cantidad) || 1;
    const bruto = Number(it.montoBruto) || 0;
    return {
      NroLinDet: i + 1,
      NmbItem:   String(it.nombre || 'Item').slice(0, 80),
      QtyItem:   qty,
      PrcItem:   Math.round(bruto / qty),
      MontoItem: bruto,
    };
  });

  const body = {
    response: ['FOLIO', 'TOKEN', 'URL'],
    dte: {
      Encabezado: {
        IdDoc:   { TipoDTE: 61, Folio: 0, FchEmis: hoyChileISO() },
        Emisor:  {
          RUTEmisor:    emisor.rut,
          RznSocEmisor: emisor.razonSocial,
          GiroEmisor:   emisor.giro || 'Servicios',
          ...(emisor.cdgSiiSucur ? { CdgSIISucur: String(emisor.cdgSiiSucur) } : {}),
          DirOrigen:    emisor.direccion || '',
          CmnaOrigen:   emisor.comuna || '',
        },
        Receptor: { RUTRecep: '66666666-6' },
        Totales:  { MntNeto: neto, IVA: iva, MntTotal: total },
      },
      Detalle: detalle,
      Referencia: [{
        NroLinRef:   1,
        TpoDocRef:   '39',                        // boleta afecta
        FolioRef:    String(folioOriginal || ''),
        FchRef:      String(fechaOriginal || hoyChileISO()),
        CodRef:      1,                           // 1 = anula
        RazonRef:    String(motivo || 'Cancelacion de cita').slice(0, 90),
      }],
    },
  };

  let res, text;
  try {
    res  = await fetch(`${host}/v2/dte/document`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', apikey: apiKey },
      body:    JSON.stringify(body),
    });
    text = await res.text();
  } catch (e) { return { ok: false, error: `red: ${e.message}` }; }

  let json; try { json = JSON.parse(text); } catch { json = { _raw: text }; }
  if (!res.ok || !json.FOLIO) {
    const err = (json.error && (json.error.message || JSON.stringify(json.error)))
             || json.message || json._raw || `HTTP ${res.status}`;
    return { ok: false, httpStatus: res.status, error: String(err) };
  }
  return {
    ok:    true,
    folio: json.FOLIO,
    token: json.TOKEN || null,
    url:   json.URL   || null,
    neto, iva, total,
  };
}

// Extrae la lista de productos del ticket (misma fórmula que Comisiones.jsx).
function productosDelTicket(cita) {
  if (!Array.isArray(cita.ticketProductos)) return [];
  return cita.ticketProductos
    .map(p => ({
      nombre:     p.nombre || p.name || 'Producto',
      cantidad:   Number(p.cantidad) || 1,
      montoBruto: Number(p.totalLinea) || 0,
    }))
    .filter(p => p.montoBruto > 0);
}

// Construye los items que van en la AFECTA del local según el modo.
function itemsAfecta({ cita, modo, arriendoPct }) {
  const precio = Number(cita.precio) || 0;
  const servicioNombre = cita.servicio || cita.servicioNombre || 'Servicio';
  const items = [];

  if (modo === 'empleados') {
    // Modelo tradicional: todo el servicio va a la afecta del local.
    if (precio > 0) items.push({ nombre: servicioNombre, cantidad: 1, montoBruto: precio });
  } else {
    // arriendo_sillon: solo el % de arriendo del servicio va a la afecta
    // del local; el resto es la BHE del barbero (Fase 3, no se emite aún).
    const pct = Math.max(0, Math.min(100, Number(arriendoPct) || 0));
    const montoArriendo = Math.round(precio * pct / 100);
    if (montoArriendo > 0) {
      items.push({ nombre: `Arriendo sillón — ${servicioNombre}`, cantidad: 1, montoBruto: montoArriendo });
    }
  }

  items.push(...productosDelTicket(cita));
  return items;
}

// ── Núcleo compartido ─────────────────────────────────────────────
async function procesar({ tenantId, citaId, cita }) {
  const cols = colecciones(tenantId);

  // 1. Config del módulo. Sin habilitar → no hacemos nada.
  const cfgSnap = await cols.configRef.get();
  const cfg = cfgSnap.exists ? (cfgSnap.data() || {}) : null;
  if (!cfg || cfg.habilitado !== true) return { skip: 'modulo-off' };

  const modo = cfg.modo || 'arriendo_sillon';
  const citaRef = cols.citas.doc(citaId);

  // 2. LOCK idempotente. El trigger corre en cada write; sin esto se
  //    emiten boletas duplicadas con folios reales imposibles de deshacer.
  const lock = await db().runTransaction(async (tx) => {
    const snap = await tx.get(citaRef);
    if (!snap.exists) return { ok: false, reason: 'cita-borrada' };
    const f = snap.data().facturacion || {};
    if (f.estado === 'emitida')    return { ok: false, reason: 'ya-emitida' };
    if (f.estado === 'procesando') return { ok: false, reason: 'en-proceso' };
    tx.set(citaRef, {
      facturacion: { estado: 'procesando', lockedAt: FieldValue.serverTimestamp() },
    }, { merge: true });
    return { ok: true };
  });
  if (!lock.ok) return { skip: lock.reason };

  try {
    // 3. Armar los items de la afecta. Si no hay monto afecto (p.ej.
    //    arriendoPct=0 y sin productos), es terminal 'omitida'.
    const items = itemsAfecta({ cita, modo, arriendoPct: cfg.arriendoPct });
    if (!items.length) {
      await citaRef.set({ facturacion: {
        estado: 'omitida', motivo: 'sin-monto-afecto', modo,
        procesadoEn: FieldValue.serverTimestamp(),
      } }, { merge: true });
      return { skip: 'sin-monto-afecto' };
    }

    // 4. Secreto: apikey de OpenFactura del tenant.
    const secSnap = await cols.secretRef.get();
    const apiKey = secSnap.exists ? (secSnap.data() || {}).openfacturaApiKey : null;
    if (!apiKey) {
      await citaRef.set({ facturacion: {
        estado: 'error', motivo: 'sin-apikey', modo,
        intentos: FieldValue.increment(1), procesadoEn: FieldValue.serverTimestamp(),
      } }, { merge: true });
      return { skip: 'sin-apikey' };
    }

    // 5. Emitir la afecta.
    const host = OF_HOSTS[cfg.openfacturaAmbiente || 'produccion'] || OF_HOSTS.produccion;
    const emisor = cfg.emisorLocal || {};
    const res = await emitirAfecta({ host, apiKey, emisor, items, receptor: null });

    // 6. Persistir el resultado en la cita.
    const documento = {
      tipo: 'afecta', tipoDTE: 39, emisor: 'local',
      folio: res.folio || null, token: res.token || null, url: res.url || null,
      neto: res.neto || null, iva: res.iva || null, total: res.total || null,
      estado: res.ok ? 'emitida' : 'error',
      error: res.ok ? null : String(res.error || '').slice(0, 300),
      emitidoEn: new Date().toISOString(),
    };
    await citaRef.set({ facturacion: {
      estado: res.ok ? 'emitida' : 'error',
      modo, documentos: [documento],
      intentos: FieldValue.increment(1),
      procesadoEn: FieldValue.serverTimestamp(),
    } }, { merge: true });

    // 7. Auditoría (best-effort).
    try {
      await cols.log.add({
        citaId, modo, documento,
        ok: res.ok,
        clienteNombre: cita.nombre || cita.cliente || null,
        barberoNombre: cita.barbero || null,
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch (e) { logger.warn(`[facturacion] audit fail: ${e.message}`); }

    return { ok: res.ok, folio: res.folio, error: res.error };
  } catch (err) {
    // Liberar el lock a 'error' para permitir reintento manual/programado.
    await citaRef.set({ facturacion: {
      estado: 'error', motivo: `excepcion: ${String(err.message).slice(0, 120)}`,
      intentos: FieldValue.increment(1), procesadoEn: FieldValue.serverTimestamp(),
    } }, { merge: true }).catch(() => {});
    throw err;
  }
}

// Corre solo en la transición fresca a 'Completada' (idéntico a referidos).
// El lock interno cubre cualquier doble-disparo.
function debeProcesar(event) {
  const after = event.data?.after?.data();
  if (!after) return { run: false };
  if (after.estado !== 'Completada') return { run: false };
  const before = event.data?.before?.data();
  if (before && before.estado === 'Completada') return { run: false };
  return { run: true, cita: after };
}

// ── Triggers ──────────────────────────────────────────────────────
exports.facturacionArriendoElegance = onDocumentWritten('citas/{citaId}', async (event) => {
  const citaId = event.params.citaId;
  const { run, cita } = debeProcesar(event);
  if (!run) return null;
  try {
    const res = await procesar({ tenantId: 'elegance', citaId, cita });
    logger.info(`[facturacion] elegance/${citaId}: ${JSON.stringify(res)}`);
  } catch (err) {
    logger.error(`[facturacion] elegance/${citaId}: error inesperado`, err);
  }
  return null;
});

exports.facturacionArriendoTenant = onDocumentWritten(
  'tenants/{tid}/citas/{citaId}',
  async (event) => {
    const { tid, citaId } = event.params;
    const { run, cita } = debeProcesar(event);
    if (!run) return null;
    try {
      const res = await procesar({ tenantId: tid, citaId, cita });
      logger.info(`[facturacion] ${tid}/${citaId}: ${JSON.stringify(res)}`);
    } catch (err) {
      logger.error(`[facturacion] ${tid}/${citaId}: error inesperado`, err);
    }
    return null;
  },
);

// ── Auth helper para callables ────────────────────────────────────
function assertTenantAdmin(request, tenantId) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
  const email = (request.auth.token?.email || '').toLowerCase();
  if (BOOTSTRAP.includes(email)) return;
  const claims = request.auth.token || {};
  const rol = claims.role || '';
  const tid = claims.tenantId || '';
  if (rol === 'admin' && tid === tenantId) return;
  throw new HttpsError('permission-denied', 'No autorizado para este tenant.');
}

// ── Callable: guardar / borrar apikey de OpenFactura ──────────────
// El secreto va a facturacion_secrets/{tid} (cerrado). Además dejamos un
// flag NO sensible en configuracion/facturacion para que el panel sepa
// si ya está configurada, sin exponer la key.
exports.facturacionGuardarApiKey = onCall({ region: REGION, cors: true }, async (request) => {
  const { tenantId, apiKey } = request.data || {};
  if (!tenantId) throw new HttpsError('invalid-argument', 'Falta tenantId.');
  assertTenantAdmin(request, tenantId);

  const cols = colecciones(tenantId);
  const key = String(apiKey || '').trim();

  if (!key) {
    await cols.secretRef.set({ openfacturaApiKey: FieldValue.delete() }, { merge: true }).catch(() => {});
    await cols.configRef.set({ openfacturaConfigurada: false, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return { ok: true, configurada: false };
  }

  await cols.secretRef.set({
    openfacturaApiKey: key,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  await cols.configRef.set({ openfacturaConfigurada: true, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return { ok: true, configurada: true };
});

// ── Callable: emitir una afecta de prueba ($1) para validar config ──
exports.facturacionTestAfecta = onCall({ region: REGION, cors: true }, async (request) => {
  const { tenantId } = request.data || {};
  if (!tenantId) throw new HttpsError('invalid-argument', 'Falta tenantId.');
  assertTenantAdmin(request, tenantId);

  const cols = colecciones(tenantId);
  const [cfgSnap, secSnap] = await Promise.all([cols.configRef.get(), cols.secretRef.get()]);
  const cfg = cfgSnap.exists ? (cfgSnap.data() || {}) : {};
  const apiKey = secSnap.exists ? (secSnap.data() || {}).openfacturaApiKey : null;
  if (!apiKey) throw new HttpsError('failed-precondition', 'Primero guarda tu API Key de OpenFactura.');
  if (!cfg.emisorLocal || !cfg.emisorLocal.rut) throw new HttpsError('failed-precondition', 'Completa los datos del emisor (RUT del local).');

  const host = OF_HOSTS[cfg.openfacturaAmbiente || 'produccion'] || OF_HOSTS.produccion;
  const res = await emitirAfecta({
    host, apiKey, emisor: cfg.emisorLocal,
    items: [{ nombre: 'Boleta de prueba — no válida', cantidad: 1, montoBruto: 1 }],
    receptor: null,
  });
  if (!res.ok) throw new HttpsError('internal', `OpenFactura rechazó la prueba: ${res.error}`);
  return { ok: true, folio: res.folio, token: res.token, ambiente: cfg.openfacturaAmbiente || 'produccion', warning: res.warning };
});

// ── Callable: reintentar la emisión de una cita ───────────────────
exports.facturacionReemitir = onCall({ region: REGION, cors: true }, async (request) => {
  const { tenantId, citaId } = request.data || {};
  if (!tenantId || !citaId) throw new HttpsError('invalid-argument', 'Falta tenantId o citaId.');
  assertTenantAdmin(request, tenantId);

  const cols = colecciones(tenantId);
  const snap = await cols.citas.doc(citaId).get();
  if (!snap.exists) throw new HttpsError('not-found', 'Cita no encontrada.');
  const cita = snap.data();

  // Resetear el estado para que el lock deje volver a emitir (solo si no
  // está ya emitida — no re-emitimos un folio válido).
  const f = cita.facturacion || {};
  if (f.estado === 'emitida') throw new HttpsError('failed-precondition', 'Esta cita ya tiene boleta emitida.');
  await cols.citas.doc(citaId).set({ facturacion: { estado: 'pendiente' } }, { merge: true });

  const res = await procesar({ tenantId, citaId, cita });
  return res;
});

// ── Callable: obtener el PDF de un DTE por token ──────────────────
// Devuelve base64. En sandbox la recuperación puede fallar (CAF simulado);
// en producción funciona. Evita guardar el PDF pesado en Firestore.
exports.facturacionObtenerPDF = onCall({ region: REGION, cors: true }, async (request) => {
  const { tenantId, token } = request.data || {};
  if (!tenantId || !token) throw new HttpsError('invalid-argument', 'Falta tenantId o token.');
  assertTenantAdmin(request, tenantId);

  const cols = colecciones(tenantId);
  const [cfgSnap, secSnap] = await Promise.all([cols.configRef.get(), cols.secretRef.get()]);
  const cfg = cfgSnap.exists ? (cfgSnap.data() || {}) : {};
  const apiKey = secSnap.exists ? (secSnap.data() || {}).openfacturaApiKey : null;
  if (!apiKey) throw new HttpsError('failed-precondition', 'Sin API Key configurada.');

  const host = OF_HOSTS[cfg.openfacturaAmbiente || 'produccion'] || OF_HOSTS.produccion;
  const res = await fetch(`${host}/v2/dte/document/${encodeURIComponent(token)}/pdf`, {
    method: 'GET', headers: { apikey: apiKey },
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new HttpsError('internal', `No se pudo obtener el PDF (HTTP ${res.status}). ${t.slice(0, 120)}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  return { ok: true, pdfBase64: buf.toString('base64') };
});

// ── Callable: emitir Nota de Crédito para anular una boleta emitida ──
// Uso típico: el admin del local cancela una cita que ya generó una
// afecta (folio real en el SII). El bloqueo comercial de anulación
// respeta el plazo tributario (SII permite NC dentro del mismo mes o
// hasta 60 días, según categoría — validar antes de invocar).
exports.facturacionEmitirNC = onCall({ region: REGION, cors: true }, async (request) => {
  const { tenantId, citaId, motivo } = request.data || {};
  if (!tenantId || !citaId) throw new HttpsError('invalid-argument', 'Falta tenantId o citaId.');
  assertTenantAdmin(request, tenantId);

  const cols = colecciones(tenantId);
  const citaRef = cols.citas.doc(citaId);
  const [citaSnap, cfgSnap, secSnap] = await Promise.all([
    citaRef.get(), cols.configRef.get(), cols.secretRef.get(),
  ]);
  if (!citaSnap.exists) throw new HttpsError('not-found', 'Cita no encontrada.');

  const cita = citaSnap.data();
  const f    = cita.facturacion || {};
  const docs = Array.isArray(f.documentos) ? f.documentos : [];
  const afecta = docs.find(d => d && d.tipo === 'afecta' && d.folio && d.estado === 'emitida');
  if (!afecta) throw new HttpsError('failed-precondition', 'La cita no tiene una boleta afecta emitida que se pueda anular.');
  if (docs.some(d => d && d.tipo === 'nc' && d.refFolio === afecta.folio && d.estado === 'emitida')) {
    throw new HttpsError('already-exists', 'Esta boleta ya tiene una Nota de Crédito emitida.');
  }

  const cfg    = cfgSnap.exists ? (cfgSnap.data() || {}) : {};
  const apiKey = secSnap.exists ? (secSnap.data() || {}).openfacturaApiKey : null;
  if (!apiKey) throw new HttpsError('failed-precondition', 'Sin API Key de OpenFactura configurada.');
  if (!cfg.emisorLocal || !cfg.emisorLocal.rut) throw new HttpsError('failed-precondition', 'Falta el RUT del emisor.');

  const host = OF_HOSTS[cfg.openfacturaAmbiente || 'produccion'] || OF_HOSTS.produccion;
  // Reconstruimos los mismos items para revertir el monto exacto.
  const items = itemsAfecta({ cita, modo: cfg.modo || 'arriendo_sillon', arriendoPct: cfg.arriendoPct });
  if (!items.length) throw new HttpsError('failed-precondition', 'La cita no tiene monto afecto para anular.');

  const fechaOriginal = (afecta.emitidoEn || '').slice(0, 10) || hoyChileISO();
  const res = await emitirNC({
    host, apiKey, emisor: cfg.emisorLocal,
    folioOriginal: afecta.folio, fechaOriginal,
    motivo: motivo || 'Cancelacion de cita', items,
  });

  const documento = {
    tipo: 'nc', tipoDTE: 61, emisor: 'local',
    folio: res.folio || null, token: res.token || null, url: res.url || null,
    refFolio: afecta.folio,
    neto: res.neto || null, iva: res.iva || null, total: res.total || null,
    estado: res.ok ? 'emitida' : 'error',
    error: res.ok ? null : String(res.error || '').slice(0, 300),
    motivo: motivo || 'Cancelacion de cita',
    emitidoEn: new Date().toISOString(),
  };
  await citaRef.set({ facturacion: {
    documentos: [...docs, documento],
    ncEmitidaAt: FieldValue.serverTimestamp(),
  } }, { merge: true });

  try {
    await cols.log.add({
      citaId, tipo: 'nc', documento,
      ok: res.ok, motivo: motivo || null,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (e) { logger.warn(`[facturacion:nc] audit fail: ${e.message}`); }

  if (!res.ok) throw new HttpsError('internal', `OpenFactura rechazó la NC: ${res.error}`);
  return { ok: true, folio: res.folio, token: res.token };
});
