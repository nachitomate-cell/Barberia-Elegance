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
//  Apple permite máx 10 ubicaciones por pase → centro + 8 del anillo.
// ─────────────────────────────────────────────────────────────────

const RING_POINTS = 8;
const MAX_LOCATIONS = 10;

// Devuelve [{ latitude, longitude }, ...] = centro + anillo a radiusM
// metros. radiusM <= 0 / inválido → solo el centro (clásico).
// Coordenadas inválidas → [] (el llamador omite `locations`).
function geofencePoints(lat, lng, radiusM) {
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return [];

  const pts = [{ latitude: la, longitude: ln }];
  const R = Number(radiusM);
  if (Number.isFinite(R) && R > 0) {
    const mPerDegLat = 111320;
    const mPerDegLng = 111320 * Math.cos((la * Math.PI) / 180) || 111320;
    for (let i = 0; i < RING_POINTS && pts.length < MAX_LOCATIONS; i++) {
      const ang = (i * 2 * Math.PI) / RING_POINTS;
      pts.push({
        latitude:  la + (R * Math.cos(ang)) / mPerDegLat,
        longitude: ln + (R * Math.sin(ang)) / mPerDegLng,
      });
    }
  }
  return pts;
}

module.exports = { geofencePoints, RING_POINTS, MAX_LOCATIONS };
