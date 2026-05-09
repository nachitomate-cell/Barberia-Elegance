import { useState, useEffect } from 'react';
import { onSnapshot, setDoc } from 'firebase/firestore';
import { tenantDoc } from '../lib/tenantUtils';

const DEFAULT = { categoriasServicio: ['Otro', 'Cortes', 'Combo', 'Barba', 'Extras'] };

export function useConfig() {
  const [config, setConfig]   = useState(DEFAULT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ref = tenantDoc('configuracion', 'main');
    const unsub = onSnapshot(ref, snap => {
      setConfig(snap.exists() ? { ...DEFAULT, ...snap.data() } : DEFAULT);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);

  const updateConfig = data => setDoc(tenantDoc('configuracion', 'main'), data, { merge: true });

  return { config, loading, updateConfig };
}
