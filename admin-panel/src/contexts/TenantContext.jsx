import { createContext, useContext, useMemo } from 'react';
import { resolveTenantId } from '../lib/tenantUtils';

const TENANT_META = {
  elegance: { name: '𝐄𝐥𝐞𝐠𝐚𝐧𝐜𝐞 𝐁𝐚𝐫𝐛𝐞𝐫𝐬𝐡𝐨𝐩', accent: 'emerald', emoji: '✂️' },
  ferraza:  { name: 'Barbería Ferraza',       accent: 'slate',   emoji: '✂️' },
  gitana:   { name: 'Gitana Nails Studio',    accent: 'pink',    emoji: '💅' },
};

const TenantContext = createContext(null);

export function TenantProvider({ children }) {
  const id   = useMemo(() => resolveTenantId(), []);
  const meta = TENANT_META[id] ?? TENANT_META.elegance;

  return (
    <TenantContext.Provider value={{ id, ...meta }}>
      {children}
    </TenantContext.Provider>
  );
}

export const useTenant = () => useContext(TenantContext);
