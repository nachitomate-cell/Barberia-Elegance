import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { resolveTenantId } from '../lib/tenantUtils';

const TENANT_META = {
  elegance:       { name: '𝐄𝐥𝐞𝐠𝐚𝐧𝐜𝐞 𝐁𝐚𝐫𝐛𝐞𝐫𝐬𝐡𝐨𝐩', accent: 'emerald', emoji: '✂️', logo: '/logo.jpg'   },
  ferraza:        { name: 'Barbería Ferraza',       accent: 'slate',   emoji: '✂️', logo: '/local1.jpg' },
  gitana:         { name: 'Gitana Nails Studio',    accent: 'pink',    emoji: '💅', logo: '/gitana.png' },
  mapubarbershop: { name: 'Mapu Barber Shop',       accent: 'emerald', emoji: '✂️', logo: '/mapu2.png'  },
  chameleon:      { name: 'Chameleon Barber Studio', accent: 'cyan',   emoji: '✂️', logo: '/local3.jpg' },
  deluxeperfumes: { name: 'Deluxe Perfumes',        accent: 'purple',  emoji: '🌸', logo: '/logo5.jpg'  },
  lumen:          { name: "D'Jones Barber",            accent: 'amber',   emoji: '⚓', logo: '/djones.png' },
  delnero:        { name: 'Del Nero Barber',         accent: 'lime',    emoji: '✂️', logo: '/nero.jpg'   },
  marcelo_hairdressing: { name: 'Marcelo Palma Hairdressing', accent: 'lime', emoji: '✂️', logo: '/marcelo1.png' },
  aura:           { name: 'AURA SALÓN & MALE GROOMING', accent: 'amber',   emoji: '✨', logo: '/aura.png'   },
  latincaribe:    { name: 'The Latin Caribe',           accent: 'amber',   emoji: '✨', logo: '/thelatin/latin.png' },
  machos:         { name: 'Macho´s Barbershop',         accent: 'orange',  emoji: '💈', logo: '/machos.png'   },
  infinity:       { name: 'INFINITY STUDIO',            accent: 'zinc',    emoji: '💈', logo: '/infinity.png'     },
  sionbarberia:   { name: 'Studio Dieciséis',           accent: 'zinc',    emoji: '🍃', logo: '/dieciseis/logo.png' },
  memphis:        { name: 'Memphis Salón',              accent: 'pink',    emoji: '✂️', logo: null },
  yugen:          { name: 'Yūgen Studio',               accent: 'orange',  emoji: '☯', logo: '/yugen/yugen.jpg' },
  kronnos_penablanca: { name: 'Kronnos Studio Peñablanca', accent: 'red',    emoji: '✂️', logo: '/kronnos/studio.jpg', brand: { hex: '#e11d2a', sede: 'Peñablanca', tagline: 'Barbería & Estilismo' } },
  kronnos_limache:    { name: 'Kronnos Studio Limache',    accent: 'orange', emoji: '✂️', logo: '/kronnos/studio.jpg', brand: { hex: '#f97316', sede: 'Limache',    tagline: 'Barbería & Estilismo' } },
  kronnos_woman:      { name: 'Kronnos Woman',             accent: 'pink',   emoji: '💅', logo: '/kronnos/woman.jpg',  brand: { hex: '#ec4899', sede: 'Woman',      tagline: 'Beauty & Nails'      } },
  barbersclub:        { name: 'Barbers Club',              accent: 'amber',  emoji: '✂️', logo: '/barbersclub/barber12.jpg' },
  elbarberomoderno:   { name: 'El Barbero Moderno',        accent: 'zinc',   emoji: '✂️', logo: '/elbarberomoderno/barbero2.jpg', brand: { hex: '#E0E0E0', sede: 'Serrano 73', tagline: 'Master Barber' } },
  estudioluxury:      { name: 'Studio Luxury',             accent: 'amber',  emoji: '💈', logo: '/luxury/luxury.jpg', brand: { sede: 'Talagante', tagline: 'Barbería' } },
};

const TenantContext = createContext(null);

export function TenantProvider({ children }) {
  const id       = useMemo(() => resolveTenantId(), []);
  // Fallback neutral: si el subdominio no matchea ningún TENANT_META conocido,
  // mostramos meta genérica (sin branding de Elegance) para que ningún tenant
  // vea logo/nombre incorrecto en el panel admin.
  const meta     = TENANT_META[id] ?? {
    name:  id.charAt(0).toUpperCase() + id.slice(1).replace(/_/g, ' '),
    accent: 'zinc',
    emoji:  '✂️',
    logo:   null,
  };
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

  useEffect(() => {
    if (!meta) return;
    document.title = `Panel Admin · ${meta.name}`;

    if (meta.logo) {
      let favicon = document.querySelector('link[rel="icon"]');
      if (!favicon) {
        favicon = document.createElement('link');
        favicon.rel = 'icon';
        document.head.appendChild(favicon);
      }
      favicon.href = meta.logo;
      if (meta.logo.endsWith('.png')) {
        favicon.type = 'image/png';
      } else if (meta.logo.endsWith('.jpg') || meta.logo.endsWith('.jpeg')) {
        favicon.type = 'image/jpeg';
      }

      let touchIcon = document.querySelector('link[rel="apple-touch-icon"]');
      if (!touchIcon) {
        touchIcon = document.createElement('link');
        touchIcon.rel = 'apple-touch-icon';
        document.head.appendChild(touchIcon);
      }
      touchIcon.href = meta.logo;
    }
  }, [id, meta]);

  return (
    <TenantContext.Provider value={{ id, ...meta, suspended }}>
      {children}
    </TenantContext.Provider>
  );
}

export const useTenant = () => useContext(TenantContext);
