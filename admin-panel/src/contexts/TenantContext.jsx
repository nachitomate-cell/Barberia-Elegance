import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { resolveTenantId } from '../lib/tenantUtils';

const TENANT_META = {
  elegance:       { name: '𝐄𝐥𝐞𝐠𝐚𝐧𝐜𝐞 𝐁𝐚𝐫𝐛𝐞𝐫𝐬𝐡𝐨𝐩', accent: 'emerald', emoji: '✂️' },
  ferraza:        { name: 'Barbería Ferraza',       accent: 'slate',   emoji: '✂️' },
  gitana:         { name: 'Gitana Nails Studio',    accent: 'pink',    emoji: '💅' },
  mapubarbershop: { name: 'Mapu Barber Shop',       accent: 'emerald', emoji: '✂️' },
  chameleon:      { name: 'Chameleon Barber Studio', accent: 'cyan',    emoji: '✂️' },
  deluxeperfumes: { name: 'Deluxe Perfumes',        accent: 'purple',  emoji: '🌸' },
};

const TenantContext = createContext(null);

export function TenantProvider({ children }) {
  const id       = useMemo(() => resolveTenantId(), []);
  const meta     = TENANT_META[id] ?? TENANT_META.elegance;
  // null = cargando, false = activo, true = suspendido
  const [suspended, setSuspended] = useState(null);

  useEffect(() => {
    const ref = doc(db, '_system', id);
    const unsub = onSnapshot(
      ref,
      snap => setSuspended(snap.exists() ? snap.data().status === 'suspended' : false),
      ()   => setSuspended(false),
    );
    return unsub;
  }, [id]);

  return (
    <TenantContext.Provider value={{ id, ...meta, suspended }}>
      {children}
    </TenantContext.Provider>
  );
}

export const useTenant = () => useContext(TenantContext);
