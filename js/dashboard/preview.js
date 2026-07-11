
// ═══════════════════════════════════════════════════════════════
//  MODO PREVIEW (?preview=1&scenario=<key>)
//  Se activa cuando el admin previsualiza el dashboard del cliente
//  desde /gestion-interna/fidelizacion?tab=preview.
//   · Skip auth: no requiere sesión, no redirige a registro.
//   · Skip writes: monkey-patch FDB.usersCol para bloquear escrituras
//     y devolver un snapshot mock según el escenario elegido.
//   · Tenant config (rangos, premios, tema, logo, servicios) se carga
//     normal — esa es la razón de ser: mostrar cómo se ve DE VERDAD.
// ═══════════════════════════════════════════════════════════════
const PREVIEW          = new URLSearchParams(location.search).get('preview') === '1';
const PREVIEW_SCENARIO = new URLSearchParams(location.search).get('scenario') || 'con_sellos';

const PREVIEW_SCENARIOS = {
  nuevo: {
    label: 'Cliente nuevo',
    data: {
      nombre: 'María González',
      telefono: '+56 9 8765 4321',
      email:    'preview@example.com',
      photoURL: null,
      sellosDisponibles: 0, sellosHistoricos: 0,
      fechaNacimiento: '', amigos: [], packsActivos: [], historialSellos: [],
    },
  },
  con_sellos: {
    label: 'Con sellos activos',
    data: {
      nombre: 'María González',
      telefono: '+56 9 8765 4321',
      email:    'preview@example.com',
      photoURL: null,
      sellosDisponibles: 5, sellosHistoricos: 8,
      fechaNacimiento: '1992-05-14', amigos: [], packsActivos: [],
      historialSellos: [
        { fecha: new Date(Date.now() - 7  * 864e5).toISOString(), tipo: 'ganado', cantidad: 1, nota: 'Corte clásico' },
        { fecha: new Date(Date.now() - 21 * 864e5).toISOString(), tipo: 'ganado', cantidad: 1, nota: 'Corte + barba' },
      ],
    },
  },
  cerca_premio: {
    label: 'A un paso del premio',
    data: {
      nombre: 'María González',
      telefono: '+56 9 8765 4321',
      email:    'preview@example.com',
      photoURL: null,
      sellosDisponibles: 8, sellosHistoricos: 12,
      fechaNacimiento: '1992-05-14', amigos: [], packsActivos: [],
      historialSellos: [
        { fecha: new Date(Date.now() - 3  * 864e5).toISOString(), tipo: 'ganado', cantidad: 1, nota: 'Corte + barba' },
        { fecha: new Date(Date.now() - 14 * 864e5).toISOString(), tipo: 'ganado', cantidad: 1, nota: 'Corte clásico' },
      ],
    },
  },
  platinum: {
    label: 'Miembro Platinum',
    data: {
      nombre: 'María González',
      telefono: '+56 9 8765 4321',
      email:    'preview@example.com',
      photoURL: null,
      sellosDisponibles: 4, sellosHistoricos: 28,
      fechaNacimiento: '1992-05-14', amigos: [], packsActivos: [],
      historialSellos: [
        { fecha: new Date(Date.now() - 7  * 864e5).toISOString(), tipo: 'canje',  cantidad: -10, nota: 'Corte de regalo' },
        { fecha: new Date(Date.now() - 14 * 864e5).toISOString(), tipo: 'ganado', cantidad: 1,   nota: 'Corte' },
        { fecha: new Date(Date.now() - 30 * 864e5).toISOString(), tipo: 'ganado', cantidad: 1,   nota: 'Corte + barba' },
      ],
    },
  },
};

const PREVIEW_MOCK_USER = {
  uid: 'preview-uid',
  email: 'preview@example.com',
  displayName: 'María González',
  photoURL: null,
  isAnonymous: false,
};

// Monkey-patch de FDB.usersCol para inyectar mock cuando estamos en preview.
// Se aplica una sola vez, después de que FDB terminó de cargar. Como los
// scripts de firebase-*.js van antes del <script> del dashboard, FDB ya existe.
if (PREVIEW && typeof FDB !== 'undefined') {
  FDB.usersCol = function() {
    const scen     = PREVIEW_SCENARIOS[PREVIEW_SCENARIO] || PREVIEW_SCENARIOS.con_sellos;
    const mockData = scen.data;
    return {
      doc: function(uid) {
        const mockSnap = { exists: true, data: () => mockData, id: uid };
        return {
          get:        async () => mockSnap,
          onSnapshot: (onNext, onError) => {
            setTimeout(() => {
              try { onNext(mockSnap); } catch (e) { console.warn('[preview] onSnapshot handler:', e); }
            }, 50);
            return () => {}; // unsub no-op
          },
          set:    async () => {},
          update: async () => {},
          delete: async () => {},
          collection: (subName) => ({
            get: async () => ({ empty: true, docs: [], size: 0, forEach: () => {} }),
            onSnapshot: (onNext) => {
              setTimeout(() => { try { onNext({ empty: true, docs: [], size: 0, forEach: () => {} }); } catch(_){} }, 50);
              return () => {};
            },
          }),
        };
      },
    };
  };
}

