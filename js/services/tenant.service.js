(() => {
  'use strict';

  function svgLogoDataUrl(label, bgColor, textColor) {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
        <rect width="240" height="240" rx="120" fill="${bgColor}" />
        <circle cx="120" cy="120" r="100" fill="none" stroke="${textColor}" stroke-width="4" opacity="0.35" />
        <text x="120" y="133" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="56" font-weight="700" fill="${textColor}">${label}</text>
      </svg>
    `.trim();

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function getMockTenantConfig(tenantId) {
    const fallbackMap = {
      elegance: {
        profile: {
          name: '𝐄𝐥𝐞𝐠𝐚𝐧𝐜𝐞 𝐛𝐚𝐫𝐛𝐞𝐫𝐬𝐡𝐨𝐩',
          shortName: 'Elegance',
          slogan: 'No es un corte, es elegancia que te mereces',
          club: 'Club Elegance',
          address: '📍 Ecuador 243 | Viña del Mar',
          scheduleText: '🕒 Lunes-Sáb: 10-20h | Dom: 12-20h. ¡Reserva ya!',
          phone: '56994269228',
          logoUrl: '/logo.jpg',
          pageTitle: 'Agendar Hora | Elegance Barbershop',
          metaDescription: 'Reserva tu hora en Elegance Barbershop. Cortes, barba y mas. Elige tu barbero, servicio y horario en segundos.',
          heroTitle: 'Que servicio buscas?',
          heroSubtitle: 'Reserva tu hora en segundos',
          shopCompat: {
            nombre: '𝐄𝐥𝐞𝐠𝐚𝐧𝐜𝐞 𝐛𝐚𝐫𝐛𝐞𝐫𝐬𝐡𝐨𝐩',
            nombreCorto: 'Elegance',
            slogan: 'No es un corte, es elegancia que te mereces',
            logo: '/logo.jpg',
            direccion: '📍 Ecuador 243 | Viña del Mar',
            horario: '🕒 Lunes-Sáb: 10-20h | Dom: 12-20h. ¡Reserva ya!',
            telefono: '56994269228',
            club: 'Club Elegance',
            barberos: [
              { nombre: 'Nicolas Fabian', foto: '/Fabian.png', disponible: true }
            ],
          },
        },
        theme: {
          colorBg: '#050505',
          colorSurface: '#0a0a0d',
          colorSurfaceAlt: '#121217',
          colorPrimary: '#ffffff',
          colorAccent: '#d4d4d8',
          colorText: '#f8fafc',
          colorMuted: '#a1a1aa',
          colorBorder: 'rgba(255,255,255,0.14)',
          colorGlow: 'rgba(255,255,255,0.22)',
          colorButtonText: '#ffffff',
          colorProgressTrack: '#1a1a24',
        },
      },
    };

    return fallbackMap[tenantId] || fallbackMap.elegance;
  }

  async function fetchTenantConfig(tenantId) {
    const fallback = getMockTenantConfig(tenantId);
    let profileData = null;
    let themeData = null;
    let source = 'mock';

    try {
      if (typeof db !== 'undefined') {
        const profileRef = db.collection('tenants').doc(tenantId).collection('profile').doc('main');
        const themeRef = db.collection('tenants').doc(tenantId).collection('settings').doc('theme');

        const [profileSnap, themeSnap] = await Promise.all([
          profileRef.get(),
          themeRef.get(),
        ]);

        if (profileSnap.exists) profileData = profileSnap.data();
        if (themeSnap.exists) themeData = themeSnap.data();
        if (profileData || themeData) source = 'firestore';
      }
    } catch (error) {
      console.warn(`[TenantService] Firestore no disponible para "${tenantId}", usando fallback:`, error.message);
    }

    const result = {
      tenantId,
      source,
      profile: {
        ...fallback.profile,
        ...(profileData || {}),
      },
      theme: {
        ...fallback.theme,
        ...(themeData || {}),
      },
    };

    if (window.AppStore) {
      window.AppStore.setState({
        tenantId,
        profile: result.profile,
        theme: result.theme,
        tenantConfigSource: result.source,
      });
    }

    return result;
  }

  window.TenantService = {
    fetchTenantConfig,
    getMockTenantConfig,
  };
})();
