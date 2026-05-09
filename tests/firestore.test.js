/**
 * Tests de seguridad de Firestore — Barbería SaaS
 *
 * Requisitos:
 *   npm install --save-dev @firebase/rules-unit-testing firebase jest
 *
 * Ejecutar:
 *   1. firebase emulators:start --only firestore   (puerto 8080)
 *   2. npx jest tests/firestore.test.js
 *
 * Variables de entorno opcionales:
 *   FIRESTORE_EMULATOR_HOST=localhost:8080  (default si no está seteado)
 */

const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require('@firebase/rules-unit-testing');
const { readFileSync } = require('fs');
const { resolve }      = require('path');
const {
  doc, collection, getDoc, setDoc, addDoc, updateDoc, deleteDoc,
} = require('firebase/firestore');

// ── Configuración ──────────────────────────────────────────────────
const PROJECT_ID    = 'barberia-test';
const RULES_PATH    = resolve(__dirname, '../firestore.rules');
const EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';

let testEnv;

// Contextos de usuario reutilizables
const CTX = {
  admin:          { role: 'admin',   tenantId: 'elegance' },
  jefe:           { role: 'jefe',    tenantId: 'elegance' },
  barbero:        { role: 'barbero', tenantId: 'elegance' },
  barberoFerraza: { role: 'barbero', tenantId: 'ferraza'  },
  adminFerraza:   { role: 'admin',   tenantId: 'ferraza'  },
  sinClaims:      {},   // autenticado pero sin claims (pre-migración)
};

function ctx(type) {
  return testEnv.authenticatedContext(`uid-${type}`, CTX[type] || {});
}
const anonCtx = () => testEnv.unauthenticatedContext();

// ── Setup / Teardown ───────────────────────────────────────────────
beforeAll(async () => {
  process.env.FIRESTORE_EMULATOR_HOST = EMULATOR_HOST;
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(RULES_PATH, 'utf8'),
      host:  EMULATOR_HOST.split(':')[0],
      port:  Number(EMULATOR_HOST.split(':')[1]),
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

// ─────────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────────
async function seedDoc(colPath, docId, data) {
  await testEnv.withSecurityRulesDisabled(async env => {
    await setDoc(doc(env.firestore(), colPath, docId), data);
  });
}

// ═════════════════════════════════════════════════════════════════
//  1. LECTURA PÚBLICA
// ═════════════════════════════════════════════════════════════════
describe('Lectura pública', () => {
  test('Anónimo puede leer /barberos', async () => {
    await seedDoc('barberos', 'b1', { nombre: 'Pedro', rol: 'barbero' });
    await assertSucceeds(
      getDoc(doc(anonCtx().firestore(), 'barberos', 'b1'))
    );
  });

  test('Anónimo puede leer /servicios', async () => {
    await seedDoc('servicios', 's1', { nombre: 'Corte' });
    await assertSucceeds(
      getDoc(doc(anonCtx().firestore(), 'servicios', 's1'))
    );
  });

  test('Anónimo NO puede leer /gastos', async () => {
    await seedDoc('gastos', 'g1', { monto: 5000 });
    await assertFails(
      getDoc(doc(anonCtx().firestore(), 'gastos', 'g1'))
    );
  });

  test('Anónimo NO puede leer /settings', async () => {
    await seedDoc('settings', 'general', { nombre: 'Barbería' });
    await assertFails(
      getDoc(doc(anonCtx().firestore(), 'settings', 'general'))
    );
  });
});

// ═════════════════════════════════════════════════════════════════
//  2. GASTOS — acceso financiero crítico
// ═════════════════════════════════════════════════════════════════
describe('Gastos — RBAC', () => {
  beforeEach(async () => {
    await seedDoc('gastos', 'g1', { descripcion: 'Insumos', monto: 15000 });
  });

  test('Admin (elegance) puede leer gastos', async () => {
    await assertSucceeds(
      getDoc(doc(ctx('admin').firestore(), 'gastos', 'g1'))
    );
  });

  test('Jefe (elegance) puede leer gastos', async () => {
    await assertSucceeds(
      getDoc(doc(ctx('jefe').firestore(), 'gastos', 'g1'))
    );
  });

  test('🔴 Barbero NO puede leer gastos', async () => {
    await assertFails(
      getDoc(doc(ctx('barbero').firestore(), 'gastos', 'g1'))
    );
  });

  test('🔴 Admin de otro tenant (ferraza) NO puede leer gastos de elegance', async () => {
    await assertFails(
      getDoc(doc(ctx('adminFerraza').firestore(), 'gastos', 'g1'))
    );
  });

  test('Admin puede crear gasto', async () => {
    await assertSucceeds(
      addDoc(collection(ctx('admin').firestore(), 'gastos'), {
        descripcion: 'Navaja', monto: 3000, categoria: 'Insumos',
      })
    );
  });

  test('🔴 Barbero NO puede crear gasto', async () => {
    await assertFails(
      addDoc(collection(ctx('barbero').firestore(), 'gastos'), {
        descripcion: 'Navaja', monto: 3000,
      })
    );
  });
});

// ═════════════════════════════════════════════════════════════════
//  3. CITAS — booking público y staff
// ═════════════════════════════════════════════════════════════════
describe('Citas', () => {
  const citaMinima = {
    fecha: '2026-06-01',
    hora: '10:00',
    clienteNombre: 'Juan Pérez',
    estado: 'Confirmada',
  };

  test('Anónimo puede crear cita con estructura válida', async () => {
    await assertSucceeds(
      addDoc(collection(anonCtx().firestore(), 'citas'), citaMinima)
    );
  });

  test('🔴 Anónimo NO puede crear cita si falta campo requerido', async () => {
    const { hora, ...sinHora } = citaMinima;
    await assertFails(
      addDoc(collection(anonCtx().firestore(), 'citas'), sinHora)
    );
  });

  test('🔴 Anónimo NO puede crear cita con estado inválido', async () => {
    await assertFails(
      addDoc(collection(anonCtx().firestore(), 'citas'), {
        ...citaMinima,
        estado: 'Completada', // no permitido al crear
      })
    );
  });

  test('🔴 Anónimo NO puede inyectar campo rol en cita', async () => {
    await assertFails(
      addDoc(collection(anonCtx().firestore(), 'citas'), {
        ...citaMinima,
        rol: 'admin', // campo malicioso
      })
    );
  });

  test('🔴 Anónimo NO puede leer citas del panel', async () => {
    await seedDoc('citas', 'c1', citaMinima);
    await assertFails(
      getDoc(doc(anonCtx().firestore(), 'citas', 'c1'))
    );
  });

  test('Barbero puede leer citas de su tenant', async () => {
    await seedDoc('citas', 'c1', citaMinima);
    await assertSucceeds(
      getDoc(doc(ctx('barbero').firestore(), 'citas', 'c1'))
    );
  });
});

// ═════════════════════════════════════════════════════════════════
//  4. BARBEROS — escalada de privilegios
// ═════════════════════════════════════════════════════════════════
describe('Barberos — protección de campos', () => {
  beforeEach(async () => {
    await seedDoc('barberos', 'uid-barbero', {
      nombre: 'Pedro', rol: 'barbero', disponible: true, comision: 10,
    });
  });

  test('Barbero puede actualizar su propio nombre', async () => {
    await assertSucceeds(
      updateDoc(
        doc(ctx('barbero').firestore(), 'barberos', 'uid-barbero'),
        { nombre: 'Pedro Actualizado' }
      )
    );
  });

  test('🔴 Barbero NO puede cambiar su propio rol', async () => {
    await assertFails(
      updateDoc(
        doc(ctx('barbero').firestore(), 'barberos', 'uid-barbero'),
        { rol: 'admin' }
      )
    );
  });

  test('🔴 Barbero NO puede cambiar su estado disponible', async () => {
    await assertFails(
      updateDoc(
        doc(ctx('barbero').firestore(), 'barberos', 'uid-barbero'),
        { disponible: false }
      )
    );
  });

  test('🔴 Barbero NO puede modificar comision', async () => {
    await assertFails(
      updateDoc(
        doc(ctx('barbero').firestore(), 'barberos', 'uid-barbero'),
        { comision: 80 }
      )
    );
  });

  test('Admin puede cambiar rol de un barbero', async () => {
    await assertSucceeds(
      updateDoc(
        doc(ctx('admin').firestore(), 'barberos', 'uid-barbero'),
        { rol: 'jefe' }
      )
    );
  });

  test('🔴 Barbero de otro tenant NO puede leer barberos de elegance si es privado', async () => {
    // barberos es público, pero creación debe fallar cross-tenant
    await assertFails(
      addDoc(collection(ctx('barberoFerraza').firestore(), 'barberos'), {
        nombre: 'Infiltrador', rol: 'admin',
      })
    );
  });
});

// ═════════════════════════════════════════════════════════════════
//  5. AISLAMIENTO MULTI-TENANT
// ═════════════════════════════════════════════════════════════════
describe('Aislamiento multi-tenant', () => {
  test('🔴 Admin de ferraza NO puede leer gastos de elegance', async () => {
    await seedDoc('gastos', 'g1', { monto: 100 });
    await assertFails(
      getDoc(doc(ctx('adminFerraza').firestore(), 'gastos', 'g1'))
    );
  });

  test('🔴 Barbero de elegance NO puede leer gastos de ferraza', async () => {
    await seedDoc('tenants/ferraza/gastos', 'g1', { monto: 100 });
    await assertFails(
      getDoc(doc(ctx('barbero').firestore(), 'tenants', 'ferraza', 'gastos', 'g1'))
    );
  });

  test('Admin de ferraza puede leer sus propios gastos', async () => {
    await seedDoc('tenants/ferraza/gastos', 'g1', { monto: 200 });
    await assertSucceeds(
      getDoc(doc(ctx('adminFerraza').firestore(), 'tenants/ferraza/gastos/g1'))
    );
  });

  test('🔴 Admin de elegance NO puede modificar settings de ferraza', async () => {
    await seedDoc('tenants/ferraza/settings', 'general', { nombre: 'Ferraza' });
    await assertFails(
      updateDoc(
        doc(ctx('admin').firestore(), 'tenants/ferraza/settings/general'),
        { nombre: 'Hackeado' }
      )
    );
  });
});

// ═════════════════════════════════════════════════════════════════
//  6. USERS — protección de campos de identidad
// ═════════════════════════════════════════════════════════════════
describe('Users — inyección de rol', () => {
  test('🔴 Cliente no puede crear su doc con campo role', async () => {
    const clientCtx = testEnv.authenticatedContext('client-uid', {});
    await assertFails(
      setDoc(doc(clientCtx.firestore(), 'users', 'client-uid'), {
        nombre: 'Atacante',
        role: 'admin',   // ← campo prohibido
      })
    );
  });

  test('🔴 Cliente no puede crear su doc con campo tenantId', async () => {
    const clientCtx = testEnv.authenticatedContext('client-uid', {});
    await assertFails(
      setDoc(doc(clientCtx.firestore(), 'users', 'client-uid'), {
        nombre: 'Atacante',
        tenantId: 'elegance',
      })
    );
  });

  test('Cliente puede crear su doc sin campos sensibles', async () => {
    const clientCtx = testEnv.authenticatedContext('client-uid', {});
    await assertSucceeds(
      setDoc(doc(clientCtx.firestore(), 'users', 'client-uid'), {
        nombre: 'Juan Cliente',
        stamps: 0,
      })
    );
  });

  test('🔴 Usuario no puede cambiar su propio rol en update', async () => {
    await seedDoc('users', 'client-uid', { nombre: 'Juan', stamps: 2 });
    const clientCtx = testEnv.authenticatedContext('client-uid', {});
    await assertFails(
      updateDoc(doc(clientCtx.firestore(), 'users', 'client-uid'), {
        rol: 'admin',
      })
    );
  });
});
