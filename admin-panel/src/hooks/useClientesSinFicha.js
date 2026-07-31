import { useEffect, useState } from 'react';
import { getDocs, query, orderBy, limit } from 'firebase/firestore';
import { tenantCol, resolveTenantId } from '../lib/tenantUtils';
import { withTimeout } from '../lib/firestore-helpers';
import { normalizarTexto } from '../lib/clienteSearch';

// ─────────────────────────────────────────────────────────────────────────
//  useClientesSinFicha — los clientes que solo existen dentro de una cita.
//
//  Cuando el barbero agenda a mano y no escribe teléfono ni correo, no se
//  crea ficha en users/: upsertCliente necesita al menos un identificador
//  para no fabricar duplicados (Agenda.jsx, upsertUserDesdeCita). Y como el
//  buscador de "Nueva cita" lee users/, esos clientes no aparecían NUNCA,
//  por más que estuvieran ahí mismo en la agenda de la semana pasada. En
//  oren eran 7 de 99 (medido el 31-jul-2026).
//
//  Acá se rescatan de las citas. No se crea ficha a propósito: un cliente
//  sin teléfono no se puede deduplicar (dos "Juan" serían el mismo doc, o
//  uno nuevo por visita), y ese es justo el pozo del que costó salir. Solo
//  se recupera el nombre para poder reusarlo al agendar.
//
//  La lectura es cara-ish (una tanda de citas), así que:
//   · es perezosa — se dispara solo cuando el buscador se queda corto;
//   · se cachea a nivel de módulo — una sola vez por sesión y por tenant.
// ─────────────────────────────────────────────────────────────────────────

const MAX_CITAS = 400;   // ventana reciente: los walk-ins que se reagendan son de hace poco

const _cache = { tid: null, data: [], promesa: null };

async function _cargar() {
  const tid = resolveTenantId();
  if (_cache.tid === tid && _cache.promesa) return _cache.promesa;

  _cache.tid = tid;
  _cache.promesa = (async () => {
    const q    = query(tenantCol('citas'), orderBy('fecha', 'desc'), limit(MAX_CITAS));
    const snap = await withTimeout(getDocs(q), 15000, 'agenda/clientes-sin-ficha');

    // Una entrada por nombre, la de la cita más reciente.
    const porNombre = new Map();
    for (const d of snap.docs) {
      const c      = d.data();
      const nombre = (c.clienteNombre || '').trim();
      if (!nombre) continue;
      // Con teléfono o correo la ficha ya existe en users/ y el buscador la
      // encuentra sola. Acá solo interesan los que no tienen ninguno de los dos.
      if ((c.clienteTelefono || '').trim() || (c.clienteEmail || '').trim()) continue;

      const clave = normalizarTexto(nombre);
      const prev  = porNombre.get(clave);
      if (!prev || String(c.fecha || '') > String(prev.ultimaFecha || '')) {
        porNombre.set(clave, {
          id:          `sinficha:${clave}`,
          nombre,
          telefono:    '',
          email:       '',
          ultimaFecha: c.fecha || '',
          _sinFicha:   true,
        });
      }
    }
    _cache.data = [...porNombre.values()];
    return _cache.data;
  })().catch(err => {
    // Un fallo no debe dejar el caché envenenado para toda la sesión: se
    // limpia para que el próximo intento vuelva a preguntar.
    console.warn('[useClientesSinFicha]', err?.message || err);
    _cache.promesa = null;
    return [];
  });

  return _cache.promesa;
}

/**
 * @param {boolean} activo — solo carga cuando vale true (búsqueda sin resultados).
 * @returns {Array} clientes que existen únicamente dentro de citas.
 */
export function useClientesSinFicha(activo) {
  const [data, setData] = useState(() => (_cache.tid === resolveTenantId() ? _cache.data : []));

  useEffect(() => {
    if (!activo) return;
    let vivo = true;
    _cargar().then(d => { if (vivo) setData(d); });
    return () => { vivo = false; };
  }, [activo]);

  return data;
}
