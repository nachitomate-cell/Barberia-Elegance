'use strict';

// functions/ops-snapshot.js
// ─────────────────────────────────────────────────────────────────────────────
//  EL PANEL DE OPS, PRECALCULADO — abrirlo tiene que costar una lectura.
//
//  El problema medido (05-08-2026): cada carga de ops.html disparaba 5 callables
//  en paralelo y `opsMetrics` sola recorre 36 tenants haciendo ~600 lecturas de
//  Firestore. Con el arranque en frío eso son 3-8 s mirando "Cargando métricas…"
//  — y como cada acción del panel llamaba a `cargar()` de nuevo, marcar UN lead
//  costaba otra vuelta completa.
//
//  La solución no es optimizar las 600 lecturas: es no hacerlas cuando el
//  operador abre el panel. Un cron las hace cada 5 minutos y deja el resultado
//  masticado en `_metrics/ops_snapshot`; el panel lee ESE doc.
//
//    · opsSnapshotCron  onSchedule cada 5 min — recalcula y guarda.
//    · opsSnapshot      onCall (operadores)   — devuelve el doc guardado.
//                       `{ fresco: true }` fuerza el recálculo (botón
//                       "Refrescar de verdad" del panel).
//
//  Por qué callable y no leer Firestore directo desde el navegador: quién es
//  operador se decide con la lista de lib/operadores.js. Exponer el doc al
//  cliente obligaría a copiar esa lista dentro de firestore.rules, y las listas
//  se DERIVAN, nunca se copian — dos fuentes de verdad se desincronizan y el
//  día que alguien sale del equipo sigue viendo la caja de la empresa.
//
//  El snapshot SIEMPRE viaja con su edad (`edadSegundos`) para que el panel
//  pueda decir "hace 3 min" en vez de fingir que el dato es de este instante.
// ─────────────────────────────────────────────────────────────────────────────

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onSchedule }         = require('firebase-functions/v2/scheduler');
const { defineSecret }       = require('firebase-functions/params');
const { logger }             = require('firebase-functions');
const admin                  = require('firebase-admin');
const { FieldValue }         = require('firebase-admin/firestore');

const { esOperadorReq }         = require('./lib/operadores');
const { _calcularMetricas }     = require('./ops-metrics');
const { refrescarSnapshotMetaAds, leerSnapshotMetaAds } = require('./meta-ads-panel');
const { _resumenInstagram }     = require('./instagram-plataforma');

const db = admin.firestore();

const OPS_TOKEN      = defineSecret('OPS_TOKEN');
const WHATSAPP_TOKEN = defineSecret('WHATSAPP_TOKEN');
const META_ADS_TOKEN = defineSecret('META_ADS_TOKEN');
const SECRETS = [OPS_TOKEN, WHATSAPP_TOKEN, META_ADS_TOKEN];

const SNAP_REF = () => db.doc('_metrics/ops_snapshot');

/**
 * Recalcula todo y lo persiste.
 *
 * Las dos mitades van en paralelo y cada una falla sola: si la Marketing API
 * de Meta se cae, las métricas de la plataforma igual se guardan (y al revés).
 * Un snapshot a medias es infinitamente mejor que ninguno — el panel muestra lo
 * que hay y marca lo que falta.
 */
async function refrescar() {
  const t0 = Date.now();
  const [metrics, metaAds, instagram] = await Promise.all([
    _calcularMetricas().catch((e) => { logger.error('[ops-snapshot] métricas:', e.message); return null; }),
    refrescarSnapshotMetaAds(META_ADS_TOKEN.value())
      .catch((e) => { logger.warn('[ops-snapshot] meta ads:', e.message); return null; }),
    _resumenInstagram().catch((e) => { logger.warn('[ops-snapshot] instagram:', e.message); return null; }),
  ]);
  const ms = Date.now() - t0;

  // Las señales de Instagram se suman a la barra de alertas del panel, que es
  // la que sale en TODAS las pestañas y la que lee el cron de vigilancia por
  // correo. Vivían solo dentro de la pestaña de Instagram: el webhook caído
  // —que deja al bot sordo— no se enteraba nadie que no entrara ahí.
  // El orden lo rehace ops.html (rojo → ámbar → info) al pintar.
  if (metrics && Array.isArray(instagram?.alertas) && instagram.alertas.length) {
    const peso = { rojo: 0, ambar: 1, info: 2 };
    metrics.alertas = [...(metrics.alertas || []), ...instagram.alertas]
      .sort((a, b) => (peso[a.nivel] ?? 9) - (peso[b.nivel] ?? 9));
  }

  const doc = {
    metrics,
    metaAds,
    instagram,
    generadoEn:  Date.now(),
    tardoMs:     ms,
    // Qué mitad quedó vieja, para que el panel avise en vez de mentir.
    parcial:     !metrics || !metaAds,
    guardadoEn:  FieldValue.serverTimestamp(),
  };
  await SNAP_REF().set(doc, { merge: false });
  logger.info(`[ops-snapshot] guardado en ${ms} ms${doc.parcial ? ' (PARCIAL)' : ''}`);
  return doc;
}

/** Empaqueta el snapshot para el cliente con su edad ya calculada. */
function paraCliente(doc, fresco) {
  if (!doc) return { ok: true, vacio: true, fresco: !!fresco };
  const edadSegundos = Math.max(0, Math.round((Date.now() - (doc.generadoEn || 0)) / 1000));
  return {
    ok: true,
    metrics:   doc.metrics   || null,
    metaAds:   doc.metaAds   || null,
    instagram: doc.instagram || null,
    generadoEn: doc.generadoEn || null,
    edadSegundos,
    parcial: !!doc.parcial,
    tardoMs: doc.tardoMs || null,
    fresco: !!fresco,
  };
}

/* ─────────────────────────────── Triggers ─────────────────────────────── */

// Cada 5 minutos: suficiente para que el panel se sienta vivo sin recalcular
// 600 lecturas en vano. 512 MiB por lo mismo que opsMetrics (el grafo de
// funciones ya ocupa ~130 MB y con 256 MiB esto muere por OOM en frío).
exports.opsSnapshotCron = onSchedule({
  schedule: 'every 5 minutes',
  timeZone: 'America/Santiago',
  region:   'us-central1',
  secrets:  SECRETS,
  memory:   '512MiB',
  timeoutSeconds: 180,
}, async () => {
  try { await refrescar(); }
  catch (e) { logger.error('[ops-snapshot] cron:', e.message); }
});

exports.opsSnapshot = onCall({
  region: 'us-central1', cors: true, secrets: SECRETS,
  memory: '512MiB', timeoutSeconds: 180,
}, async (req) => {
  if (!req.auth || !esOperadorReq(req)) {
    throw new HttpsError('permission-denied', 'Solo el operador de la plataforma.');
  }

  // Camino rápido: devolver lo guardado. Una lectura, sin cold start de nada
  // pesado. Es el 99% de las aperturas del panel.
  if (!req.data || req.data.fresco !== true) {
    const s = await SNAP_REF().get();
    if (s.exists) return paraCliente(s.data(), false);
    // Nunca se generó (primer deploy o snapshot borrado): se calcula ahora
    // para no dejar el panel en blanco esperando al cron.
    logger.info('[ops-snapshot] sin snapshot previo — calculando al vuelo');
    return paraCliente(await refrescar(), true);
  }

  return paraCliente(await refrescar(), true);
});

/** Solo Meta Ads, para el botón de refrescar de esa pestaña sin recalcular
 *  los 36 locales (que es lo caro y no tiene nada que ver con los anuncios). */
exports.opsMetaAdsRefrescar = onCall({
  region: 'us-central1', cors: true, secrets: [META_ADS_TOKEN], timeoutSeconds: 120,
}, async (req) => {
  if (!req.auth || !esOperadorReq(req)) {
    throw new HttpsError('permission-denied', 'Solo el operador de la plataforma.');
  }
  const metaAds = await refrescarSnapshotMetaAds(META_ADS_TOKEN.value());
  // El snapshot general se actualiza en su lugar para que la próxima apertura
  // del panel ya traiga esta versión y no la vieja del cron.
  await SNAP_REF().set({ metaAds, generadoEn: Date.now() }, { merge: true }).catch(() => {});
  return { ok: true, metaAds };
});

exports._refrescarOpsSnapshot = refrescar;
exports._leerSnapshotMetaAds  = leerSnapshotMetaAds;
