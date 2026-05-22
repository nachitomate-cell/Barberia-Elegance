import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { resolveTenantId } from '../lib/tenantUtils';

const TENANT_META = {
  elegance:       { name: '𝐄𝐥𝐞𝐠𝐚𝐧𝐜𝐞 𝐁𝐚𝐫𝐛𝐞𝐫𝐬𝐡𝐨𝐩', accent: 'emerald', emoji: '✂️', logo: '/logo.jpg'   },
  ferraza:        { name: 'Barbería Ferraza',       accent: 'slate',   emoji: '✂️', logo: '/local1.jpg' },
  gitana:         { name: 'Gitana Nails Studio',    accent: 'pink',    emoji: '💅', logo: '/local2.jpg' },
  mapubarbershop: { name: 'Mapu Barber Shop',       accent: 'emerald', emoji: '✂️', logo: '/mapu.jfif'  },
  chameleon:      { name: 'Chameleon Barber Studio', accent: 'cyan',   emoji: '✂️', logo: '/local3.jpg' },
  deluxeperfumes: { name: 'Deluxe Perfumes',        accent: 'purple',  emoji: '🌸', logo: '/logo5.jpg'  },
  lumen:          { name: "D'Jones Barber",            accent: 'amber',   emoji: '⚓', logo: '/djones.png' },
  delnero:        { name: 'Del Nero Barber',         accent: 'lime',    emoji: '✂️', logo: '/nero.jpg'   },
  marcelo_hairdressing: { name: 'Marcelo Palma Hairdressing', accent: 'lime', emoji: '✂️', logo: '/nero.jpg' },
  aura:           { name: 'AURA SALÓN & MALE GROOMING', accent: 'amber',   emoji: '✨', logo: '/aura.png'   },
  machos:         { name: 'Macho´s Barbershop',         accent: 'orange',  emoji: '💈', logo: '/machos.png'   },
  infinity:       { name: 'INFINITY STUDIO',            accent: 'zinc',    emoji: '💈', logo: '/logo.jpg'     },
  sionbarberia:   { name: 'Sion Barbería',              accent: 'orange',  emoji: '💈', logo: 'https://dcx13p9dsx90t.cloudfront.net/uploads/logos/page_logo_378df61d67dfec81.png' },
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
