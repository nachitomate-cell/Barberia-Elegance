import { useState, useEffect } from 'react';
import { query, onSnapshot } from 'firebase/firestore';
import { tenantCol } from '../lib/tenantUtils';

export function useCollection(collectionName, constraints = [], deps = []) {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    setLoading(true);
    const ref = tenantCol(collectionName);
    const q   = constraints.length ? query(ref, ...constraints) : ref;

    const unsub = onSnapshot(
      q,
      snap => {
        setData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      err => { setError(err); setLoading(false); },
    );
    return unsub;
  }, [collectionName, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error };
}
