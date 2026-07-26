'use strict';

// functions/lib/wallet-geo.js
// ─────────────────────────────────────────────────────────────────
//  Geofence del "geo-push" del wallet (Google + Apple).
//
//  Apple/Google usan CADA punto de `locations` con un radio nativo
//  fijo (~100m) que NO se puede agrandar. Para cubrir un área mayor
//  colocamos el centro + un ANILLO de puntos al radio pedido, así el
//  pase se vuelve relevante cerca de cualquiera de ellos.
//
//  Apple permite máx 10 ubicaciones por pase. Con UNA zona = centro +
//  8 del anillo. Con VARIAS zonas repartimos ese presupuesto de 10
//  puntos entre ellas (menos anillo por zona mientras más zonas haya).
// ─────────────────────────────────────────────────────────────────

const RING_POINTS = 8;
const MAX_LOCATIONS = 10;

// Centro + `ringCount` puntos en anillo a `radiusM` metros alrededor de
// (la, ln). ringCount <= 0 o radio inválido → solo el centro.
function ringOf(la, ln, radiusM, ringCount) {
  const pts = [{ latitude: la, longitude: ln }];
  const R = Number(radiusM);
  const n = Math.max(0, Math.min(RING_POINTS, ringCount | 0));
  if (Number.isFinite(R) && R > 0 && n > 0) {
    const mPerDegLat = 111320;
    const mPerDegLng = 111320 * Math.cos((la * Math.PI) / 180) || 111320;
    for (let i = 0; i < n; i++) {
      const ang = (i * 2 * Math.PI) / n;
      pts.push({
        latitude:  la + (R * Math.cos(ang)) / mPerDegLat,
        longitude: ln + (R * Math.sin(ang)) / mPerDegLng,
      });
    }
  }
  return pts;
}

// UNA zona: centro + anillo completo (clásico). Coords inválidas → [].
function geofencePoints(lat, lng, radiusM) {
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return [];
  return ringOf(la, ln, radiusM, RING_POINTS);
}

// VARIAS zonas: reparte el presupuesto de MAX_LOCATIONS puntos entre
// todas. Cada zona recibe su centro + una fracción del anillo. Devuelve
// [{ latitude, longitude }, ...] listo para `locations`.
//   2 zonas → 5 puntos c/u (centro + 4)
//   5 zonas → 2 puntos c/u (centro + 1)
//   ≥10 zonas → solo el centro de las primeras 10 (el resto se descarta)
function geofencePointsMulti(locations) {
  const list = (Array.isArray(locations) ? locations : [])
    .map((l) => ({ lat: Number(l && l.lat), lng: Number(l && l.lng), radius: Number(l && l.radius) }))
    .filter((l) => Number.isFinite(l.lat) && Number.isFinite(l.lng));
  if (!list.length) return [];
  if (list.length === 1) return ringOf(list[0].lat, list[0].lng, list[0].radius, RING_POINTS);

  const per = Math.max(1, Math.floor(MAX_LOCATIONS / list.length));
  const ringPer = per - 1;
  const out = [];
  for (const l of list) {
    if (out.length >= MAX_LOCATIONS) break;
    const pts = ringOf(l.lat, l.lng, l.radius, ringPer);
    for (const p of pts) {
      if (out.length >= MAX_LOCATIONS) break;
      out.push(p);
    }
  }
  return out;
}

// Normaliza la config del wallet a un arreglo de zonas [{ lat, lng, radius }].
// Soporta el formato nuevo (cfg.locations[]) y el legacy (cfg.location +
// cfg.geoRadius). Coordenadas inválidas se descartan.
function locationsFromConfig(cfg) {
  if (cfg && Array.isArray(cfg.locations) && cfg.locations.length) {
    return cfg.locations
      .map((l) => ({ lat: Number(l && l.lat), lng: Number(l && l.lng), radius: Number(l && l.radius) }))
      .filter((l) => Number.isFinite(l.lat) && Number.isFinite(l.lng));
  }
  if (cfg && cfg.location &&
      Number.isFinite(Number(cfg.location.lat)) &&
      Number.isFinite(Number(cfg.location.lng))) {
    return [{ lat: Number(cfg.location.lat), lng: Number(cfg.location.lng), radius: Number(cfg.geoRadius) }];
  }
  return [];
}

module.exports = { geofencePoints, geofencePointsMulti, locationsFromConfig, RING_POINTS, MAX_LOCATIONS };
