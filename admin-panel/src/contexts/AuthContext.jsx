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

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(undefined);
  const [role,    setRole]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async firebaseUser => {
      if (!firebaseUser) {
        setUser(null);
        setRole(null);
        setLoading(false);
        return;
      }
      setUser(firebaseUser);

      const email = firebaseUser.email?.toLowerCase();

      // Superadmin de SynapTech — acceso total en cualquier tenant
      if (email === SUPERADMIN_EMAIL) {
        setRole('admin');
        setLoading(false);
        return;
      }

      // Admin de marca — dueño con 'admin' en sus sedes (sin re-login al cambiar)
      if (email && BRAND_ADMINS[email]?.includes(resolveTenantId())) {
        setRole('admin');
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
          } else {
            setRole(data.rol || 'barbero');
          }
        } else {
          setRole('barbero');
        }
      } catch {
        setRole('barbero');
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
