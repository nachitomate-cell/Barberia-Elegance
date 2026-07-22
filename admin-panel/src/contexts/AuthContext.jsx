import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { getDoc } from 'firebase/firestore';
import { auth } from '../lib/firebase';
import { tenantDoc, resolveTenantId } from '../lib/tenantUtils';
import { withTimeout } from '../lib/firestore-helpers';

const AuthContext = createContext(null);

const SUPERADMIN_EMAIL = 'ignaciiio.mate@gmail.com';

// ── Admins de marca ──────────────────────────────────────────────
// Un dueño con acceso 'admin' a varias sedes (tenants) del mismo grupo,
// sin necesidad de registrarlo como barbero en cada una. Con esto inicia
// sesión una sola vez (mismo dominio + ?local=) y administra las 3 sedes.
// Kronnos: incluye 'kronnos' (marca unificada, Camino 1 D2) + 3 legacy hasta cutover D4-D5.
const BRAND_ADMINS = {
  'administracionkronnos@gmail.com': ['kronnos', 'kronnos_penablanca', 'kronnos_limache', 'kronnos_woman'],
  'claudio.burgos91@gmail.com':      ['kronnos', 'kronnos_penablanca', 'kronnos_limache', 'kronnos_woman'],
  'grupo.kratos.spa@gmail.com':      ['kronnos', 'kronnos_penablanca', 'kronnos_limache', 'kronnos_woman'],
};

// Sedes Kronnos a las que un email tiene acceso de marca (para el switcher
// de sede del panel). Superadmin ve las 3. Devuelve null si no aplica.
export function getBrandTenants(email) {
  const e = (email || '').toLowerCase();
  if (e === SUPERADMIN_EMAIL) return ['kronnos_penablanca', 'kronnos_limache', 'kronnos_woman'];
  return BRAND_ADMINS[e] || null;
}

// Fallback: custom claims { role, tenantId } que setea superadminCrearStaff.
// Cubre cuentas SIN doc-espejo barberos/{uid} (flujos de alta antiguos solo
// dejaban authUid en el doc principal): sin esto, un admin real degradaba a
// 'barbero' en silencio y perdía el sidebar (caso Infinity, 2026-07-19).
// Los claims viven en el ID token cacheado, así que también sirven si la
// lectura de Firestore falla por red.
async function roleFromClaims(firebaseUser) {
  try {
    const tok = await firebaseUser.getIdTokenResult();
    const { role, tenantId } = tok.claims || {};
    if (tenantId !== resolveTenantId()) return null;   // claims de OTRO tenant no valen aquí
    return (role === 'admin' || role === 'barbero') ? role : null;
  } catch {
    return null;
  }
}

// Scope de sucursal de un doc de barbero/admin. `sucursalScope` es el campo
// explícito de "qué sede puede ver este usuario" ('all' | id de sucursal). Si
// no está, cae al `sucursalId` del barbero (donde trabaja) — así un barbero ve
// su sede. Sin nada → 'all' (tenants de una sola sede quedan sin filtro).
function scopeFromDoc(data) {
  return data?.sucursalScope ?? data?.sucursalId ?? 'all';
}

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(undefined);
  const [role,    setRole]    = useState(null);
  const [sucursalScope, setSucursalScope] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async firebaseUser => {
      if (!firebaseUser) {
        setUser(null);
        setRole(null);
        setSucursalScope('all');
        setLoading(false);
        return;
      }
      setUser(firebaseUser);

      const email = firebaseUser.email?.toLowerCase();

      // Superadmin de SynapTech — acceso total en cualquier tenant
      if (email === SUPERADMIN_EMAIL) {
        setRole('admin');
        setSucursalScope('all');
        setLoading(false);
        return;
      }

      // Admin de marca — dueño con 'admin' en sus sedes (sin re-login al cambiar)
      if (email && BRAND_ADMINS[email]?.includes(resolveTenantId())) {
        setRole('admin');
        setSucursalScope('all');
        setLoading(false);
        return;
      }

      try {
        // El rol del equipo se guarda en barberos/{uid}
        const snap = await withTimeout(getDoc(tenantDoc('barberos', firebaseUser.uid)), 10000, 'auth/role');
        if (snap.exists()) {
          const data = snap.data();
          // Si es doc de enlace (_mainDocId), leer el doc principal
          if (data._mainDocId) {
            const main = await withTimeout(getDoc(tenantDoc('barberos', data._mainDocId)), 10000, 'auth/role-link');
            setRole(main.exists() ? (main.data().rol || 'barbero') : 'barbero');
            setSucursalScope(main.exists() ? scopeFromDoc(main.data()) : 'all');
          } else {
            setRole(data.rol || 'barbero');
            setSucursalScope(scopeFromDoc(data));
          }
        } else {
          setRole(await roleFromClaims(firebaseUser) || 'barbero');
          setSucursalScope('all');
        }
      } catch {
        setRole(await roleFromClaims(firebaseUser) || 'barbero');
        setSucursalScope('all');
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, sucursalScope, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
