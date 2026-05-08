(() => {
  'use strict';

  function getProfessionalMocks(tenantId) {
    const mocks = {
      gitana: [
        { id: 'prof-gitana-1', displayName: 'Sabina', photoUrl: null, active: true, role: 'nail-tech', order: 0 },
        { id: 'prof-gitana-2', displayName: 'Clau',   photoUrl: null, active: true, role: 'nail-tech', order: 1 },
        { id: 'prof-gitana-3', displayName: 'Cony',   photoUrl: null, active: true, role: 'nail-tech', order: 2 },
        { id: 'prof-gitana-4', displayName: 'Gigi',   photoUrl: null, active: true, role: 'pestañas',  order: 3 },
      ],
      elegance: [
        {
          id: 'prof-elegance-1',
          displayName: 'Nicolas Fabian',
          photoUrl: 'Fabian.png',
          active: true,
          role: 'barbero',
          order: 0,
        },
      ],
    };

    return mocks[tenantId] || mocks.elegance;
  }

  async function fetchProfessionals(tenantId) {
    let professionals = [];
    let source = 'mock';

    try {
      if (typeof db !== 'undefined') {
        const snap = await db.collection('tenants').doc(tenantId).collection('professionals').orderBy('order').get();
        if (!snap.empty) {
          professionals = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          source = 'firestore';
        }
      }
    } catch (error) {
      console.warn(`[ProfessionalService] Firestore no disponible para "${tenantId}", usando fallback:`, error.message);
    }

    if (!professionals.length) {
      professionals = getProfessionalMocks(tenantId);
    }

    const normalized = professionals
      .filter(item => item.active !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    window.AppStore?.set({
      professionals: normalized,
      professionalsSource: source,
    });

    return normalized;
  }

  window.ProfessionalService = {
    fetchProfessionals,
    getProfessionalMocks,
  };
})();
