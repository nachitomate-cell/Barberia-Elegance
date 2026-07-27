import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onSnapshot } from 'firebase/firestore';
import { tenantDoc, resolveTenantId } from '../lib/tenantUtils';
import { useAuth } from './AuthContext';

/**
 * SucursalContext — filtro por sucursal para tenants "multi-sucursal" (1 tenant
 * con varias sedes en `configuracion/main.sucursales`, ej. Oren, Mapu). NO es
 * el modelo Kronnos (sede = tenant aparte, ver SedeContext); estos conviven.
 *
 * Da a cada vista:
 *   · multiSucursal   → true si el tenant tiene >1 sede (activa el selector)
 *   · sucursales[]    → todas las sedes del tenant
 *   · allowed[]       → las que este usuario puede ver (según su scope)
 *   · canViewAll      → el usuario ve todas (dueño/superadmin) y puede cambiar
 *   · activeId        → 'all' | id de sede seleccionada (o forzada por scope)
 *   · activeSucursal  → objeto de la sede activa (null si 'all')
 *   · setActive(id)   → cambia de sede (no-op si el usuario está scopeado)
 *   · matchSucursal(record) → ¿el registro pertenece a la sede activa?
 *
 * Scope por usuario: viene de AuthContext.sucursalScope ('all' | id). Un admin
 * de sede solo ve la suya; el dueño ('all') las ve todas y puede filtrar.
 */
const SucursalContext = createContext(null);

export function SucursalProvider({ children }) {
  const { sucursalScope } = useAuth() || {};
  const scope = sucursalScope || 'all';
  const [sucursales, setSucursales] = useState([]);

  // Lista de sedes del tenant (misma fuente que la agenda pública y el seed).
  useEffect(() => {
    const ref = tenantDoc('configuracion', 'main');
    const unsub = onSnapshot(
      ref,
      snap => {
        const arr = snap.data()?.sucursales;
        setSucursales(Array.isArray(arr) ? arr : []);
      },
      () => setSucursales([]),
    );
    return unsub;
  }, []);

  const multiSucursal = sucursales.length > 1;
  const canViewAll = scope === 'all';
  const allowed = useMemo(
    () => (canViewAll ? sucursales : sucursales.filter(s => s.id === scope)),
    [sucursales, canViewAll, scope],
  );

  // Selección activa (persistida por tenant). Si el usuario NO puede ver todas,
  // se fuerza a su sede. Si su selección guardada ya no existe, cae a 'all'.
  const storageKey = `suc_activa_${resolveTenantId()}`;
  const [activeIdRaw, setActiveIdRaw] = useState(() => {
    try { return localStorage.getItem(storageKey) || 'all'; } catch { return 'all'; }
  });

  const activeId = useMemo(() => {
    if (!canViewAll) return scope; // scopeado a su sede
    if (activeIdRaw === 'all') return 'all';
    return sucursales.some(s => s.id === activeIdRaw) ? activeIdRaw : 'all';
  }, [canViewAll, scope, activeIdRaw, sucursales]);

  const setActive = (id) => {
    if (!canViewAll) return; // scopeado: no puede cambiar de sede
    setActiveIdRaw(id);
    try { localStorage.setItem(storageKey, id); } catch { /* ignore */ }
  };

  const activeSucursal = useMemo(
    () => (activeId === 'all' ? null : sucursales.find(s => s.id === activeId) || null),
    [activeId, sucursales],
  );

  // Sede default para ESCRITURA: al crear un doc que necesita sucursalId (ej.
  // cita nueva), no queremos null aunque el usuario esté viendo "Todas". Cae
  // a la sede activa si hay, si no a la primera del scope, si no a la
  // primera del tenant. Semántica distinta a activeSucursal (que refleja el
  // filtro visual y puede ser null legítimamente).
  const sucursalDefault = useMemo(
    () => activeSucursal
      || allowed.find(s => s.activo !== false)
      || allowed[0]
      || sucursales.find(s => s.activo !== false)
      || sucursales[0]
      || null,
    [activeSucursal, allowed, sucursales],
  );

  // ¿El registro pertenece a la sede activa?
  //  · 'all'                      → todo pasa
  //  · registro con sucursalId    → match exacto por id
  //  · registro con sucursalNombre→ match por nombre (por si falta el id)
  //  · registro SIN sede          → pasa en todas (ej. barbero que atiende en
  //                                 ambas, o registros aún sin taggear)
  const matchSucursal = useMemo(() => (rec) => {
    if (activeId === 'all') return true;
    if (!rec) return true;
    if (rec.sucursalId != null && rec.sucursalId !== '') return rec.sucursalId === activeId;
    if (rec.sucursalNombre && activeSucursal) return rec.sucursalNombre === activeSucursal.nombre;
    return true;
  }, [activeId, activeSucursal]);

  const value = useMemo(() => ({
    sucursales, allowed, multiSucursal, canViewAll,
    activeId, activeSucursal, sucursalDefault, setActive, matchSucursal, scope,
  }), [sucursales, allowed, multiSucursal, canViewAll, activeId, activeSucursal, sucursalDefault, matchSucursal, scope]);

  return <SucursalContext.Provider value={value}>{children}</SucursalContext.Provider>;
}

// Fallback seguro si algún componente se monta fuera del provider: sin filtro.
export const useSucursal = () => useContext(SucursalContext) ?? {
  sucursales: [], allowed: [], multiSucursal: false, canViewAll: true,
  activeId: 'all', activeSucursal: null, sucursalDefault: null,
  setActive: () => {}, matchSucursal: () => true, scope: 'all',
};
