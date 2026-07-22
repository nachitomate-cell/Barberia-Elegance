import { useState, useEffect, useMemo } from 'react';
import { query, onSnapshot } from 'firebase/firestore';
import { tenantCol } from '../lib/tenantUtils';
import { useSucursal } from '../contexts/SucursalContext';

export function useCollection(collectionName, constraints = [], deps = []) {
  const [raw,     setRaw]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const { matchSucursal } = useSucursal();

  useEffect(() => {
    setLoading(true);
    const ref = tenantCol(collectionName);
    const q   = constraints.length ? query(ref, ...constraints) : ref;

    const unsub = onSnapshot(
      q,
      snap => {
        setRaw(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      err => { setError(err); setLoading(false); },
    );
    return unsub;
  }, [collectionName, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Aislamiento por sede (multi-sucursal) ────────────────────────
  // Oculta los documentos que pertenecen a OTRA sucursal (los que traen un
  // `sucursalId` distinto de la sede activa). Los docs SIN `sucursalId` —
  // catálogos compartidos del negocio: servicios, productos, premios, clientes,
  // configuración— pasan siempre. En modo "Todas" o en tenants de una sola sede
  // `matchSucursal` es () => true, así que no filtra nada (backward-compatible).
  const data = useMemo(() => raw.filter(matchSucursal), [raw, matchSucursal]);

  return { data, loading, error };
}
