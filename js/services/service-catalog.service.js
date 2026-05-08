(() => {
  'use strict';

  function getServiceMocks(tenantId) {
    const mocks = {
      gitana: [
        // Manicura
        { id: 'srv-gitana-01', nombre: 'Manicura un tono',        precio: 15000, duracion: 60,  activo: true, orden: 0,  categoria: 'Manicura' },
        { id: 'srv-gitana-02', nombre: 'Manicura francesa',        precio: 16000, duracion: 60,  activo: true, orden: 1,  categoria: 'Manicura' },
        { id: 'srv-gitana-03', nombre: 'Manicura difuminado',      precio: 17000, duracion: 60,  activo: true, orden: 2,  categoria: 'Manicura' },
        { id: 'srv-gitana-04', nombre: 'Manicura diseño simple',   precio: 17000, duracion: 75,  activo: true, orden: 3,  categoria: 'Manicura' },
        { id: 'srv-gitana-05', nombre: 'Manicura diseño medio',    precio: 18000, duracion: 75,  activo: true, orden: 4,  categoria: 'Manicura' },
        { id: 'srv-gitana-06', nombre: 'Manicura full diseño',     precio: 21000, duracion: 90,  activo: true, orden: 5,  categoria: 'Manicura' },
        // Extensiones uñas gel
        { id: 'srv-gitana-07', nombre: 'Extensión gel un tono / francés', precio: 33000, duracion: 90,  activo: true, orden: 6,  categoria: 'Extensiones' },
        { id: 'srv-gitana-08', nombre: 'Extensión gel diseño simple',      precio: 35000, duracion: 100, activo: true, orden: 7,  categoria: 'Extensiones' },
        { id: 'srv-gitana-09', nombre: 'Extensión gel diseño medio',       precio: 38500, duracion: 110, activo: true, orden: 8,  categoria: 'Extensiones' },
        { id: 'srv-gitana-10', nombre: 'Extensión gel full diseño',        precio: 41500, duracion: 120, activo: true, orden: 9,  categoria: 'Extensiones' },
        // Pedicura
        { id: 'srv-gitana-11', nombre: 'Pedicura',                precio: 17500, duracion: 60,  activo: true, orden: 10, categoria: 'Pedicura' },
        // Pestañas
        { id: 'srv-gitana-12', nombre: 'Ondulación de pestañas',  precio: 18000, duracion: 45,  activo: true, orden: 11, categoria: 'Pestañas' },
        { id: 'srv-gitana-13', nombre: 'Lifting de pestañas',     precio: 18000, duracion: 45,  activo: true, orden: 12, categoria: 'Pestañas' },
        { id: 'srv-gitana-14', nombre: 'Extensión de pestañas',   precio: 28000, duracion: 90,  activo: true, orden: 13, categoria: 'Pestañas' },
        { id: 'srv-gitana-15', nombre: 'Retoque extensión +15 días', precio: 20000, duracion: 45, activo: true, orden: 14, categoria: 'Pestañas' },
        { id: 'srv-gitana-16', nombre: 'Retoque extensión 15 días',  precio: 18000, duracion: 45, activo: true, orden: 15, categoria: 'Pestañas' },
        // Promociones
        { id: 'srv-gitana-17', nombre: 'Manicura + Pedicura un tono', precio: 30500, duracion: 90,  activo: true, orden: 16, categoria: 'Promociones' },
        // Otros
        { id: 'srv-gitana-18', nombre: 'Hair spa japonés',        precio: 39900, duracion: 90,  activo: true, orden: 17, categoria: 'Otros' },
      ],
      elegance: [
        { id: 'srv-elegance-1', nombre: 'Corte Clasico', precio: 15000, duracion: 60, activo: true, orden: 0 },
        { id: 'srv-elegance-2', nombre: 'Barba Premium', precio: 10000, duracion: 30, activo: true, orden: 1 },
        { id: 'srv-elegance-3', nombre: 'Corte + Barba', precio: 22000, duracion: 90, activo: true, orden: 2 },
      ],
    };

    return mocks[tenantId] || mocks.elegance;
  }

  async function fetchServices(tenantId) {
    let services = [];
    let source = 'mock';

    try {
      if (typeof db !== 'undefined') {
        const snap = await db.collection('tenants').doc(tenantId).collection('services').orderBy('orden').get();
        if (!snap.empty) {
          services = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          source = 'firestore';
        }
      }
    } catch (error) {
      console.warn(`[ServiceCatalog] Firestore no disponible para "${tenantId}", usando fallback:`, error.message);
    }

    if (!services.length) {
      services = getServiceMocks(tenantId);
    }

    const normalized = services
      .filter(item => item.activo !== false)
      .sort((a, b) => (a.orden || 0) - (b.orden || 0));

    window.AppStore?.set({
      services: normalized,
      servicesSource: source,
    });

    return normalized;
  }

  window.ServiceCatalogService = {
    fetchServices,
    getServiceMocks,
  };
})();
