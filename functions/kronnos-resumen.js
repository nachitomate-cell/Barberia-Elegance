'use strict';

// functions/kronnos-resumen.js
// Callable `kronnosResumenMensual` para el lobby admin.kronnos.synaptechspa.cl:
// resumen del MES EN CURSO (hora de Chile) agregado de las 3 sedes Kronnos.
// Solo cuentas del lobby (mismo ALLOWED que kronnos-admin.html — mantener
// sincronizados). El ingreso replica la fórmula del panel (Agenda/Metricas):
// cortesia ? 0 : (precio || precioMap[servicioId] || precioMap[servicioNombre] || 0),
// y el "ingreso realizado" cuenta SOLO citas Completada.

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger }             = require('firebase-functions');
const admin                  = require('firebase-admin');

const db = admin.firestore();

const SEDES = ['kronnos_penablanca', 'kronnos_limache', 'kronnos_woman'];
const ALLOWED = ['administracionkronnos@gmail.com', 'ignaciiio.mate@gmail.com', 'claudio.burgos91@gmail.com'];

exports.kronnosResumenMensual = onCall({ region: 'us-central1', cors: true }, async (req) => {
  const email = String(req.auth?.token?.email || '').toLowerCase();
  if (!req.auth || !ALLOWED.includes(email)) {
    throw new HttpsError('permission-denied', 'Esta cuenta no tiene acceso a la gestión de Kronnos.');
  }

  // Mes en curso en hora de Chile (no UTC: a las 21:00 del 31 UTC ya es día 1).
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' }); // YYYY-MM-DD
  const mes = hoy.slice(0, 7);
  const desde = `${mes}-01`;
  const hasta = `${mes}-31`;

  const sedes = {};
  const total = { citas: 0, completadas: 0, canceladas: 0, proximas: 0, ingreso: 0 };

  await Promise.all(SEDES.map(async (tid) => {
    try {
      const [citasSnap, svcSnap] = await Promise.all([
        db.collection(`tenants/${tid}/citas`).where('fecha', '>=', desde).where('fecha', '<=', hasta).get(),
        db.collection(`tenants/${tid}/servicios`).get(),
      ]);
      const precioMap = {};
      svcSnap.forEach((s) => {
        const x = s.data() || {};
        if (x.precio != null) {
          precioMap[s.id] = Number(x.precio) || 0;
          if (x.nombre) precioMap[x.nombre] = Number(x.precio) || 0;
        }
      });

      const r = { citas: 0, completadas: 0, canceladas: 0, proximas: 0, ingreso: 0 };
      citasSnap.forEach((d) => {
        const c = d.data() || {};
        if (c.estado === 'Cancelada') { r.canceladas++; return; }
        r.citas++;
        if (c.estado === 'Completada') {
          r.completadas++;
          r.ingreso += c.cortesia ? 0 : (Number(c.precio) || precioMap[c.servicioId] || precioMap[c.servicioNombre] || 0);
        } else if (typeof c.fecha === 'string' && c.fecha >= hoy) {
          r.proximas++;
        }
      });

      sedes[tid] = r;
      total.citas += r.citas;
      total.completadas += r.completadas;
      total.canceladas += r.canceladas;
      total.proximas += r.proximas;
      total.ingreso += r.ingreso;
    } catch (e) {
      logger.error(`[kronnosResumen] ${tid}:`, e.message);
      sedes[tid] = { error: true };
    }
  }));

  return { mes, hoy, sedes, total, generadoEn: Date.now() };
});
