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
//
// Sin `tenantId !== resolveTenantId()` guard: si el claim dice admin de X y
// el user está en el subdomain de Y, el guard viejo lo degradaba a 'barbero'.
// Efecto: cualquier admin que entrara desde el hub app.synaptechspa.cl (donde
// resolveTenantId=sandbox hasta que HubTenantGate resuelva) o desde otro
// subdomain quedaba redirigido a /agenda.html. Confiamos en Firestore rules
// para el enforcement real: un admin de tenant X que quiera escribir en Y
// será rechazado por rules igualmente.
async function roleFromClaims(firebaseUser) {
  try {
    const tok = await firebaseUser.getIdTokenResult();
    const { role } = tok.claims || {};
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

// Semilla anti-flash: si en el reload anterior había un usuario logueado, el
// primer render ya lo sabe y NO parpadea el LoginPage antes de que Firebase
// termine su check. Se actualiza en cada onAuthStateChanged.
const LAST_UID_KEY = '_panel_last_uid';
function _seedUidSync() {
  try { return localStorage.getItem(LAST_UID_KEY) || null; } catch { return null; }
}

export function AuthProvider({ children }) {
  // `user`: undefined = todavía no sabemos; null = confirmado sin sesión;
  // objeto = user de Firebase. Anti-flash: si teníamos un UID persistido en
  // reloads previos, arrancamos con un "placeholder" truthy para no renderizar
  // LoginPage antes de que onAuthStateChanged confirme el user real.
  const [user,    setUser]    = useState(() => {
    const uid = _seedUidSync();
    return uid ? { uid, _seed: true } : undefined;
  });
  const [role,    setRole]    = useState(null);
  const [sucursalScope, setSucursalScope] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async firebaseUser => {
      if (!firebaseUser) {
        try { localStorage.removeItem(LAST_UID_KEY); } catch { /* ignore */ }
        setUser(null);
        setRole(null);
        setSucursalScope('all');
        setLoading(false);
        return;
      }
      try { localStorage.setItem(LAST_UID_KEY, firebaseUser.uid); } catch { /* ignore */ }
      setUser(firebaseUser);

      // Refresh del ID token contra el servidor. Los custom claims
      // (role/tenantId/sucursalScope) se setean via Admin SDK server-side; el
      // token cacheado en el navegador puede tener claims viejos si el user
      // nunca hizo re-login desde que se aplicaron. Sin este refresh, cuentas
      // admin recién creadas quedaban con role=null → App.jsx las mandaba a
      // /agenda.html. Firebase cachea 5 min: no-op si ya está fresco.
      // v2: refresh forzado universal (antes solo BRAND_ADMINS Kronnos).
      try { await firebaseUser.getIdToken(true); } catch { /* noop */ }

      const email = firebaseUser.email?.toLowerCase();

      // Superadmin de SynapTech — acceso total en cualquier tenant
      if (email === SUPERADMIN_EMAIL) {
        setRole('admin');
        setSucursalScope('all');
        setLoading(false);
        return;
      }

      // Admin de marca — dueño con 'admin' en sus sedes (sin re-login al cambiar)
      // El refresh forzado del token ya ocurrió arriba (universalmente).
      if (email && BRAND_ADMINS[email]?.includes(resolveTenantId())) {
        setRole('admin');
        setSucursalScope('all');
        setLoading(false);
        return;
      }

      // Los custom claims son source of truth: los setea el script server-side
      // vía Admin SDK y no son manipulables desde el cliente. Si el claim dice
      // 'admin' → aceptamos INMEDIATAMENTE sin esperar la lectura de Firestore
      // (que puede fallar por red/rules/timeout y dejar al admin colgado en
      // 'barbero' → redirect a /agenda.html, caso reportado por Ignacio 2026-07-27).
      const rolClaims = await roleFromClaims(firebaseUser);
      // Bypass manual del RoleRedirectScreen: si el user tocó "Soy admin,
      // entrar de todos modos", respetamos su elección aunque los claims no
      // digan admin. Firestore rules siguen enforceando; el override solo
      // deja pasar la UI del panel.
      let roleOverride = null;
      try {
        if (sessionStorage.getItem('_role_override_admin') === '1') roleOverride = 'admin';
      } catch { /* ignore */ }
      if (rolClaims === 'admin' || roleOverride === 'admin') {
        setRole('admin');
        // Scope: leemos el doc barbero para heredar sucursalScope (best-effort;
        // si falla o no existe, 'all' es seguro para admin claim).
        try {
          const snap = await withTimeout(getDoc(tenantDoc('barberos', firebaseUser.uid)), 5000, 'auth/scope');
          if (snap.exists()) {
            const data = snap.data();
            if (data._mainDocId) {
              const main = await withTimeout(getDoc(tenantDoc('barberos', data._mainDocId)), 5000, 'auth/scope-link');
              setSucursalScope(main.exists() ? scopeFromDoc(main.data()) : 'all');
            } else {
              setSucursalScope(scopeFromDoc(data));
            }
          } else {
            setSucursalScope('all');
          }
        } catch {
          setSucursalScope('all');
        }
        setLoading(false);
        return;
      }
      // Sin claim admin: cae al flujo tradicional (barbero por doc + fallback claim).
      try {
        const snap = await withTimeout(getDoc(tenantDoc('barberos', firebaseUser.uid)), 10000, 'auth/role');
        if (snap.exists()) {
          const data = snap.data();
          let rolDoc, scope;
          if (data._mainDocId) {
            const main = await withTimeout(getDoc(tenantDoc('barberos', data._mainDocId)), 10000, 'auth/role-link');
            rolDoc = main.exists() ? (main.data().rol || 'barbero') : 'barbero';
            scope  = main.exists() ? scopeFromDoc(main.data()) : 'all';
          } else {
            rolDoc = data.rol || 'barbero';
            scope  = scopeFromDoc(data);
          }
          setRole(rolDoc);
          setSucursalScope(scope);
        } else {
          setRole(rolClaims || 'barbero');
          setSucursalScope('all');
        }
      } catch {
        setRole(rolClaims || 'barbero');
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
