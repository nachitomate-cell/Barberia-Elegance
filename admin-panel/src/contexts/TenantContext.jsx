import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { resolveTenantId, tenantDoc } from '../lib/tenantUtils';

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
  estudioluxury:      { name: 'Studio Luxury',             accent: 'amber',  emoji: '💈', logo: '/luxury/luxury.jpg', banner: '/luxury/banner.webp', brand: { sede: 'Talagante', tagline: 'Barbería' } },
  renacer:            { name: 'Peluquería y Barbería Renacer', accent: 'amber', emoji: '✂️', logo: '/renacer/logo.webp', banner: '/renacer/banner.webp' },
  oren:               { name: 'Oren Barber', accent: 'amber', emoji: '✂️', logo: '/oren/oren-logo.webp', banner: '/oren/renaca.webp' },
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
  // null = cargando, false = activo, true = suspendido.
  // Anti-flash: si en el reload anterior sabíamos que el tenant estaba activo,
  // arrancamos con `false` para no mostrar el spinner del TenantGate en el
  // primer render. El onSnapshot corregirá si algo cambió. Un tenant recién
  // suspendido esperará ≤1 render extra pero el flujo activo (99% del uso)
  // ya no parpadea.
  const [suspended, setSuspended] = useState(() => {
    try {
      const cached = sessionStorage.getItem(`_tenant_status_${id}`);
      if (cached === 'active') return false;
      if (cached === 'suspended') return true;
    } catch { /* ignore */ }
    return null;
  });

  // Branding del tenant desde Firestore (settings/general): logo + banner del
  // login del panel. Hace el branding AUTOMÁTICO — un tenant nuevo solo lo
  // siembra ahí (settings/general.logo + .loginBanner) y el panel lo toma sin
  // tocar el mapa TENANT_META, que queda como fallback instantáneo.
  const [brand, setBrand] = useState(null);

  useEffect(() => {
    const ref = doc(db, '_system', id);
    const unsub = onSnapshot(
      ref,
      snap => {
        const isSuspended = snap.exists() ? snap.data().status === 'suspended' : false;
        setSuspended(isSuspended);
        try { sessionStorage.setItem(`_tenant_status_${id}`, isSuspended ? 'suspended' : 'active'); } catch { /* ignore */ }
      },
      () => setSuspended(false),
    );
    return unsub;
  }, [id]);

  useEffect(() => {
    const unsub = onSnapshot(
      tenantDoc('settings', 'general'),
      snap => {
        const d = snap.exists() ? snap.data() : {};
        setBrand({ logo: d.logo || null, banner: d.loginBanner || d.banner || null });
      },
      () => setBrand(null),
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

  // Firestore (branding sembrado) gana sobre el mapa; el mapa es el fallback.
  const logo   = brand?.logo   || meta.logo   || null;
  const banner = brand?.banner || meta.banner || null;

  return (
    <TenantContext.Provider value={{ id, ...meta, logo, banner, suspended }}>
      {children}
    </TenantContext.Provider>
  );
}

export const useTenant = () => useContext(TenantContext);
