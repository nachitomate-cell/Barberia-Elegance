import { useState, useEffect, useCallback } from 'react';
import { query, where, limit, onSnapshot } from 'firebase/firestore';
import { tenantCol } from '../lib/tenantUtils';
import { useSucursal } from '../contexts/SucursalContext';

// ─────────────────────────────────────────────────────────────────────────
//  useCajaAbierta — ¿hay un cajón abierto ahora mismo?
//
//  Lo usa el guard opcional `opcionesAvanzadas.exigirCajaAbierta`, que impide
//  marcar citas como Completada con la caja cerrada. El problema que resuelve
//  es de olvido: si el local completa el día entero sin abrir caja, esos
//  cobros nunca entran a una sesión y el arqueo del día no existe.
//
//  Se suscribe a las sesiones ABIERTAS (a lo más una por sede, igual que
//  Caja.jsx) en vez de leer una vez: el barbero puede tener la agenda abierta
//  mientras en otra pestaña recién abren la caja, y el guard tiene que soltar
//  solo, sin obligar a recargar.
//
//  El chequeo es POR SEDE y recibe el `sucursalId` de la cita, no el de la
//  sede activa en pantalla: en modo "Todas" no hay una sede en foco, pero la
//  cita sí sabe a qué local pertenece. Si no hay sesiones abiertas de ninguna
//  sede, no hay caja y punto.
// ─────────────────────────────────────────────────────────────────────────

export function useCajaAbierta() {
  const [sesiones, setSesiones] = useState([]);
  const [loading,  setLoading]  = useState(true);
  // Si la lectura falla no se puede afirmar que la caja esté cerrada. El guard
  // debe abrirse en ese caso: bloquear el cierre de citas por un error de red
  // sería peor que dejar pasar una cita sin caja.
  const [error, setError] = useState(false);
  const { multiSucursal } = useSucursal();

  useEffect(() => {
    const q = query(tenantCol('caja_sesiones'), where('estado', '==', 'abierta'), limit(10));
    const unsub = onSnapshot(
      q,
      snap => {
        setSesiones(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
        setError(false);
      },
      () => { setLoading(false); setError(true); },
    );
    return unsub;
  }, []);

  /**
   * ¿Hay caja abierta para la sede de esta cita?
   * Mientras carga (o si la lectura falló) devuelve true — el guard no debe
   * bloquear por no saber todavía.
   */
  const hayCajaAbierta = useCallback((sucursalId) => {
    if (loading || error) return true;
    if (!sesiones.length) return false;
    // Tenant de una sola sede: cualquier sesión abierta sirve.
    if (!multiSucursal) return true;
    // Multi-sede: tiene que ser el cajón de ESA sede. Las sesiones sin
    // `sucursalId` son de antes de la separación por sede y valen para todas.
    if (!sucursalId) return true;
    return sesiones.some(s => !s.sucursalId || s.sucursalId === sucursalId);
  }, [sesiones, loading, error, multiSucursal]);

  return { sesiones, loading, hayCajaAbierta };
}
