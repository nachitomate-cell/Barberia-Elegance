import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { tenantDoc } from '../lib/tenantUtils';

export function useSucursales() {
  const [sucursales, setSucursales] = useState([]);

  useEffect(() => {
    const ref = tenantDoc('settings', 'general');
    const unsub = onSnapshot(
      ref,
      snap => {
        const data = snap.data();
        setSucursales(Array.isArray(data?.sucursales) ? data.sucursales : []);
      },
      () => setSucursales([]),
    );
    return unsub;
  }, []);

  return sucursales;
}
