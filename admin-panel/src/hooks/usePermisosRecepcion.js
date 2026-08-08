import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { tenantCol } from '../lib/tenantUtils';

/* Permisos del rol recepción, configurados por el admin en
   Configuración → Recepción y guardados en `configuracion/recepcion`:
     { permisos: { [ruta]: true | false } }
   Semántica (ver RECEPCION_GRANTS/modulosRecepcion en Sidebar.jsx):
     · módulos base (visibles hoy para recepción): ausente = true (opt-out)
     · módulos concedibles (adminOnly aptos):      ausente = false (opt-in)
   Devuelve `null` mientras carga — los guards tratan null como "aún no sé",
   no como denegado, para no expulsar a recepción por una lectura lenta. */
export function usePermisosRecepcion() {
  const [permisos, setPermisos] = useState(null);
  useEffect(() => {
    const ref = doc(db, `${tenantCol('configuracion').path}/recepcion`);
    return onSnapshot(
      ref,
      s => setPermisos((s.exists() && s.data().permisos) || {}),
      () => setPermisos({}),   // error de lectura = comportamiento por defecto
    );
  }, []);
  return permisos;
}
