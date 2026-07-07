import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { resolveTenantAndSede, isMultiSedeTenant, KRONNOS_SEDES } from '../lib/tenantUtils';

// ── Metadatos de sedes Kronnos (fuente para el panel admin) ──────
// Cada sede en el tenant 'kronnos' tiene nombre, ciudad, tema y subdomain.
// Se usa desde el lobby admin, el selector de sede y las vistas filtradas (D4).
export const KRONNOS_SEDE_META = {
  penablanca: {
    id:        'penablanca',
    nombre:    'Kronnos Studio Peñablanca',
    ciudad:    'Villa Alemana',
    tipo:      'Barbería · Estilismo',
    color:     '#e11d2a',
    accent:    'red',
    emoji:     '✂️',
    subdomain: 'kronnospenablanca.synaptechspa.cl',
  },
  limache: {
    id:        'limache',
    nombre:    'Kronnos Studio Limache',
    ciudad:    'Limache',
    tipo:      'Barbería · Estilismo',
    color:     '#f97316',
    accent:    'orange',
    emoji:     '✂️',
    subdomain: 'kronnoslimache.synaptechspa.cl',
  },
  woman: {
    id:        'woman',
    nombre:    'Kronnos Woman',
    ciudad:    'Limache',
    tipo:      'Belleza · Estética',
    color:     '#ec4899',
    accent:    'pink',
    emoji:     '💅',
    subdomain: 'kronnoswoman.synaptechspa.cl',
  },
};

const SedeContext = createContext(null);

export function SedeProvider({ children }) {
  const { tenantId, sedeId: initial } = useMemo(resolveTenantAndSede, []);
  const [sedeId, setSedeId] = useState(initial);

  // Si cambia la URL con ?sede=X en la misma sesión, sincroniza el estado.
  useEffect(() => {
    if (!isMultiSedeTenant(tenantId)) return;
    const onChange = () => {
      const { sedeId: fresh } = resolveTenantAndSede();
      if (fresh && fresh !== sedeId) setSedeId(fresh);
    };
    window.addEventListener('popstate', onChange);
    return () => window.removeEventListener('popstate', onChange);
  }, [tenantId, sedeId]);

  const value = useMemo(() => {
    const multiSede = isMultiSedeTenant(tenantId);
    const sedes = multiSede ? KRONNOS_SEDES.map(id => KRONNOS_SEDE_META[id]) : [];
    const currentSede = sedeId ? KRONNOS_SEDE_META[sedeId] : null;
    return { tenantId, sedeId, sedes, currentSede, multiSede, setSedeId };
  }, [tenantId, sedeId]);

  return <SedeContext.Provider value={value}>{children}</SedeContext.Provider>;
}

// useSede(): hook principal. Devuelve { sedeId, sedes[], currentSede, multiSede }.
// Para tenants NO multi-sede: { sedeId: null, sedes: [], currentSede: null, multiSede: false }.
export const useSede = () => useContext(SedeContext) ?? { tenantId: null, sedeId: null, sedes: [], currentSede: null, multiSede: false, setSedeId: () => {} };
